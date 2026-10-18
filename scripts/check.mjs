// npm run check: build, open the site headless on laptop and phone, walk through
// every screen on the test clock, save screenshots, and fail on console errors,
// failed requests, a frozen state, figures out of frame, or a browser sim that
// differs from the same sim run in Node.
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PARTY } from '../src/party/data.js';
import { createParty, timeline, runFight } from '../src/party/sim.js';
import { DUEL } from '../src/duel/data.js';
import { createDuel, heroTurn, rivalTurn, rivalIntent, playFight, perfectChainsToFall, heroPhysical, rivalPhysical } from '../src/duel/sim.js';

const RUNS = 'check-output';
const KEEP = 5;
const OUT = join(RUNS, new Date().toISOString().replace(/[:.]/g, '-')); // one folder per run
const URL_ARG = process.argv.find((a) => a.startsWith('--url='))?.slice(6); // check a deployed build instead
const SEED = 1;

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (existsSync('/opt/pw-browsers/chromium')) return '/opt/pw-browsers/chromium';
  return undefined;
}

const failures = [];
const log = [];
const summaries = [];
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(RUNS).filter((f) => /^\d{4}-/.test(f)).sort().slice(0, -KEEP)) rmSync(join(RUNS, old), { recursive: true, force: true });

// Node determinism: the same seed must give the same party fight, event for event.
for (const seed of [SEED, 2, 3]) {
  const [x, y] = [runFight(PARTY, seed), runFight(PARTY, seed)];
  if (JSON.stringify(x.events) !== JSON.stringify(y.events)) failures.push(`[node] party seed ${seed}: two runs differ`);
  else summaries.push(`[node] party seed ${seed} auto fight twice: identical (${x.result}, ${x.turns} turns, ${x.events.length} events)`);
}

// Node test of the duel rules: scripted perfect / early / late / missed presses give the
// hit counts RESEARCH.md predicts, and dodge / parry / Riposte / Guard / items work.
function duelRules() {
  const expect = (what, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`[node duel] ${what}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
  };
  const chain = (presses, data = DUEL) => {
    const st = createDuel(data, SEED);
    const ev = heroTurn(data, st, { cmd: 'attack', presses });
    return { hits: ev.find((e) => e.type === 'chainEnd').hits, damage: st.rival.hp - st.rival.hpNow, sp: st.hero.sp, heroHurt: st.hero.hp - st.hero.hpNow, verdicts: ev.filter((e) => e.type === 'press').map((e) => e.verdict) };
  };
  const dmg = (n) => heroPhysical(DUEL, DUEL.addition.hitPercent.slice(0, n).reduce((a, b) => a + b, 0));
  const sp = (n) => n * Math.round(DUEL.addition.spPerHit * DUEL.addition.spMult);
  const cases = [
    ['all 5 presses perfect', [0, 0, 0, 0, 0], 6],
    ['press 1 late (+100 ms)', [100, 0, 0, 0, 0], 1],
    ['press 3 early (-100 ms)', [0, 0, -100, 0, 0], 3],
    ['press 5 missed (no press)', [0, 0, 0, 0, null], 5],
    ['no presses at all', [], 1],
    ['window edges (±75 ms) land', [-75, 75, -75, 75, 0], 6],
    ['just outside the edge (+76 ms on press 2)', [0, 76, 0, 0, 0], 2],
    ['press 1 before the squares start (-800 ms) is ignored', [-800, 0, 0, 0, 0], 1],
  ];
  for (const [what, presses, hits] of cases) {
    const got = chain(presses);
    expect(`${what}: hits`, got.hits, hits);
    expect(`${what}: damage`, got.damage, dmg(hits));
    expect(`${what}: SP`, got.sp, sp(hits));
    summaries.push(`[node duel] ${what}: ${got.hits} hits, ${got.damage} damage, ${got.sp} SP (${got.verdicts.join(' ') || 'no prompt'})`);
  }
  // The counter prompt (cut from this fight, kept working): press 3 needs the counter button.
  const counterData = { ...DUEL, addition: { ...DUEL.addition, counterable: true, counterAtPress: 3 } };
  const c1 = chain([0, 0, 0, 0, 0], counterData);
  expect('counter answered with the normal button: hits', c1.hits, 3);
  expect('counter answered with the normal button: Rhen hurt', c1.heroHurt, rivalPhysical(DUEL, DUEL.rival.basic.mult));
  const c2 = chain([0, 0, { button: 'counter', ms: 10 }, 0, 0], counterData);
  expect('counter answered with the counter button: hits', c2.hits, 6);
  expect('counter answered with the counter button: Rhen hurt', c2.heroHurt, 0);
  summaries.push(`[node duel] counter prompt: normal button ${c1.hits} hits (${c1.verdicts.join(' ')}), counter button ${c2.hits} hits`);

  // Defence. Order: Rhen, Vael (Four Seals opener), Rhen, Rhen, Vael (Rising Cut).
  const st = createDuel(DUEL, SEED);
  heroTurn(DUEL, st, { cmd: 'escape' });
  expect('escape refused keeps the turn', st.next, 'hero');
  heroTurn(DUEL, st, { cmd: 'guard' });
  expect('guard heals 10%', st.hero.hpNow, st.hero.hp);
  expect('Vael opens with Four Seals', rivalIntent(DUEL, st).name, DUEL.rival.signature.name);
  const parry = { kind: 'parry', ms: 0 };
  let ev = rivalTurn(DUEL, st, [parry, { kind: 'parry', ms: -70 }, { kind: 'parry', ms: 70 }, parry]);
  expect('four parries: Rhen untouched', st.hero.hpNow, st.hero.hp);
  expect('four parries: SP', st.hero.sp, 4 * DUEL.defense.spPerParry);
  expect('four parries: Riposte damage', st.rival.hp - st.rival.hpNow, heroPhysical(DUEL, DUEL.defense.counter.percent));
  summaries.push(`[node duel] Four Seals fully parried: ${ev.filter((e) => e.type === 'defend').map((e) => e.verdict).join(' ')}, Riposte for ${st.rival.hp - st.rival.hpNow}`);
  heroTurn(DUEL, st, { cmd: 'guard' });
  heroTurn(DUEL, st, { cmd: 'guard' });
  expect('then Rising Cut', rivalIntent(DUEL, st).name, DUEL.rival.basic.name);
  rivalTurn(DUEL, st, [null]);
  expect('Rising Cut on a guarding Rhen: half damage', st.hero.hp - st.hero.hpNow, Math.floor(rivalPhysical(DUEL, 1) * DUEL.guard.damageTaken));
  const hurt = (defense, move = 'basic') => {
    const s2 = createDuel(DUEL, SEED);
    s2.rival.openerUsed = move === 'basic';
    s2.next = 'rival';
    const e2 = rivalTurn(DUEL, s2, defense);
    return { hurt: s2.hero.hp - s2.hero.hpNow, verdicts: e2.filter((e) => e.type === 'defend').map((e) => e.verdict), riposte: e2.some((e) => e.type === 'riposte') };
  };
  const one = rivalPhysical(DUEL, 1);
  expect('Rising Cut dodged at +100 ms', hurt([{ kind: 'dodge', ms: 100 }]), { hurt: 0, verdicts: ['dodged'], riposte: false });
  expect('Rising Cut parried at +100 ms is late', hurt([{ kind: 'parry', ms: 100 }]), { hurt: one, verdicts: ['late'], riposte: false });
  expect('Rising Cut, no press', hurt([null]), { hurt: one, verdicts: ['none'], riposte: false });
  expect('Rising Cut, mashing: first press early, the rest locked out', hurt([[-200, -120, -40, 40].map((ms) => ({ kind: 'parry', ms }))]), { hurt: one, verdicts: ['early'], riposte: false });
  expect('Rising Cut parried: Riposte', hurt([parry]).riposte, true);
  const seal = rivalPhysical(DUEL, 4) / 4;
  expect('Four Seals: a late parry locks out the next pillar', hurt([{ kind: 'parry', ms: 60 }, { kind: 'parry', ms: -100 }, parry, parry], 'signature'), { hurt: Math.floor(seal), verdicts: ['parried', 'none', 'parried', 'parried'], riposte: false });

  // Items, and the target: Vael falls to the 7th perfect chain, not the 6th.
  const s3 = createDuel(DUEL, SEED);
  s3.hero.hpNow = 100;
  heroTurn(DUEL, s3, { cmd: 'item', item: 'Healing Potion' });
  expect('Healing Potion heals 50%', s3.hero.hpNow, 100 + Math.floor(s3.hero.hp / 2));
  s3.next = 'hero';
  heroTurn(DUEL, s3, { cmd: 'item', item: 'Spirit Potion' });
  expect('Spirit Potion gives 100 SP', s3.hero.sp, 100);
  const pc = perfectChainsToFall(DUEL);
  expect('perfect chains to fell Vael', [pc.result, pc.chains], ['win', DUEL.targets.perfectChainsToWin]);
  summaries.push(`[node duel] Vael falls to perfect chain ${pc.chains} (target ${DUEL.targets.perfectChainsToWin}); HP after each: ${pc.hpAfter.join(', ')}`);
  for (const k of Object.keys(DUEL.accuracy)) {
    const a = JSON.stringify(playFight(DUEL, 42, k));
    if (a !== JSON.stringify(playFight(DUEL, 42, k))) failures.push(`[node duel] ${k} fight is not deterministic`);
  }
}
duelRules();

let server;
let base = URL_ARG;
if (!base) {
  await build({ logLevel: 'warn' });
  server = await preview({ preview: { port: 4327, strictPort: false }, logLevel: 'warn' });
  base = server.resolvedUrls.local[0];
}
const browser = await chromium.launch({
  executablePath: chromePath(),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const shot = (page, name, step) => page.screenshot({ path: join(OUT, `${name}-${step}.png`) });
const state = (page) => page.evaluate(() => window.__game.state());
const advance = (page, ms) => page.evaluate((t) => window.__game.advance(t), ms);

async function run(name, contextOptions, script) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.on('console', (msg) => {
    const line = `[${name}] console.${msg.type()}: ${msg.text()}`;
    log.push(line);
    if (msg.type() === 'error') failures.push(line);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) failures.push(`[${name}] HTTP ${res.status()} ${res.url()}`);
  });
  page.on('pageerror', (err) => failures.push(`[${name}] page error: ${err.message}`));
  const url = new URL(base);
  url.search = `?test&seed=${SEED}`;
  await page.goto(url.href.replace('test=', 'test'));
  await page.waitForFunction(() => window.__game?.state().loaded, null, { timeout: 60000 });
  await script(page, name);
  await context.close();
}

// Every figure's feet and head must be on screen (x within 80% so the body and weapon fit too), and not under the HUD's top strip.
function checkFraming(name, mode, s) {
  for (const f of s.framing) {
    const [fx, fy] = f.feet;
    const [hx, hy] = f.head;
    if (Math.abs(fx) > 0.8 || Math.abs(hx) > 0.8 || fy < -0.97 || hy > 0.9) failures.push(`[${name} ${mode}] ${f.id} out of frame (feet ${f.feet}, head ${f.head})`);
  }
}

// The test clock must move the figures' idle loops (a frozen state fails).
async function checkAlive(page, name, mode) {
  const a = (await state(page)).figures.map((f) => f.clipTime);
  await advance(page, 500);
  const b = (await state(page)).figures.map((f) => f.clipTime);
  if (!a.length || a.every((t, i) => t === b[i])) failures.push(`[${name} ${mode}] figures frozen: animation clock did not move`);
}

async function walk(page, name, click) {
  await advance(page, 100);
  let s = await state(page);
  if (s.screen !== 'start') failures.push(`[${name}] expected the start screen, got ${s.screen}`);
  if (!(await page.isEnabled('.mode[data-mode="duel"]')) || !(await page.isEnabled('.mode[data-mode="party"]'))) failures.push(`[${name}] mode buttons not enabled after loading`);
  await shot(page, name, '0-start');

  // Duel: hero and rival standing, menu with Escape greyed out.
  await click('.mode[data-mode="duel"]');
  await advance(page, 400);
  s = await state(page);
  const node = createDuel(DUEL, SEED);
  if (s.screen !== 'duel' || s.figures.length !== 2) failures.push(`[${name}] duel: screen ${s.screen}, ${s.figures.length} figures (expected 2)`);
  if (JSON.stringify(s.duel.menu) !== JSON.stringify(node.menu)) failures.push(`[${name}] duel menu differs from Node sim`);
  const labels = await page.$$eval('#duel-menu button', (bs) => bs.map((b) => b.textContent));
  if (labels.join(',') !== 'Attack,Dragoon,Guard,Items,Escape') failures.push(`[${name}] duel menu reads ${labels}`);
  checkFraming(name, 'duel', s);
  await checkAlive(page, name, 'duel');
  await shot(page, name, '1-duel');
  summaries.push(`## ${name} duel\n${await page.evaluate(() => window.__game.stateText())}`);

  // Party: four heroes and wave 1, timeline matching Node.
  await click('#back');
  await advance(page, 100);
  if ((await state(page)).screen !== 'start') failures.push(`[${name}] back did not return to the start screen`);
  await click('.mode[data-mode="party"]');
  await advance(page, 400);
  s = await state(page);
  const party = createParty(PARTY, SEED, 0);
  const expectFigures = party.units.length;
  if (s.screen !== 'party' || s.figures.length !== expectFigures) failures.push(`[${name}] party: screen ${s.screen}, ${s.figures.length} figures (expected ${expectFigures})`);
  const nodeLine = timeline(PARTY, party, 8);
  if (JSON.stringify(s.timeline) !== JSON.stringify(nodeLine)) failures.push(`[${name}] party timeline differs from Node sim`);
  else summaries.push(`[${name}] party timeline matches Node sim: ${nodeLine.map((t) => `${t.name}@${t.at}`).join(', ')}`);
  checkFraming(name, 'party', s);
  await checkAlive(page, name, 'party');
  await shot(page, name, '2-party');
  summaries.push(`## ${name} party\n${await page.evaluate(() => window.__game.stateText())}`);
}

const DEVICES = {
  laptop: [{ viewport: { width: 1280, height: 720 } }, (page) => (sel) => page.click(sel)],
  phone: [{ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, (page) => (sel) => page.tap(sel)],
};
for (const [name, [opts, input]] of Object.entries(DEVICES)) await run(name, opts, (page) => walk(page, name, input(page)));

await browser.close();
await server?.close();

const report = [
  `# Check ${failures.length ? 'FAILED' : 'passed'} — ${new Date().toISOString()}`,
  `target: ${base}`,
  '',
  ...summaries,
  '',
  '## failures',
  ...(failures.length ? failures : ['none']),
  '',
  '## console',
  ...(log.length ? log : ['(empty)']),
].join('\n');
writeFileSync(join(OUT, 'summary.txt'), report + '\n');
console.log(report);
console.log(`\nScreenshots and summary in ${OUT}/`);
process.exit(failures.length ? 1 : 0);
