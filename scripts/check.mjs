// npm run check: build, open the site headless on laptop and phone, walk through
// every screen on the test clock, save screenshots, and fail on console errors,
// failed requests, a frozen state, figures out of frame, or a browser sim that
// differs from the same sim run in Node.
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PARTY } from '../src/party/data.js';
import { createParty, timeline, runFight, fightDigest } from '../src/party/sim.js';
import { DUEL } from '../src/duel/data.js';
import { applyTune } from '../src/tune.js';
import { createDuel, heroTurn, rivalTurn, rivalIntent, playFight, perfectChainsToFall, heroPhysical, heroMagic, rivalPhysical } from '../src/duel/sim.js';

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
  // Dragoon: transform keeps whole 100s of SP, Strike counts ring presses, spells cost MP,
  // one Dragoon turn per 100 SP, then Rhen reverts.
  const dr = createDuel(DUEL, SEED);
  expect('Dragoon refused under 100 SP', heroTurn(DUEL, dr, { cmd: 'dragoon' }).at(-1).type, 'refused');
  dr.hero.sp = 280;
  const tf = heroTurn(DUEL, dr, { cmd: 'dragoon' }).at(-1);
  expect('transform at 280 SP', [tf.type, tf.turns, tf.spLost, dr.next], ['transform', 2, 80, 'hero']);
  expect('a Dragoon cannot Guard', heroTurn(DUEL, dr, { cmd: 'guard' }).at(-1).type, 'refused');
  const ring = (presses) => {
    const s4 = createDuel(DUEL, SEED);
    s4.hero.sp = 100;
    heroTurn(DUEL, s4, { cmd: 'dragoon' });
    const e4 = heroTurn(DUEL, s4, { cmd: 'strike', presses });
    return { hits: e4.find((e) => e.type === 'strikeEnd').hits, damage: s4.rival.hp - s4.rival.hpNow, reverted: !s4.hero.dragoon && e4.some((e) => e.type === 'revert') };
  };
  for (const [what, presses, hits] of [['ring all on the frame', [0, 0, 0, 0], 5], ['ring press 2 late (+80 ms)', [0, 80, 0, 0], 2], ['ring edges', [-100, 75, -50, 25], 5], ['ring press 4 just outside (+26 ms)', [0, 0, 0, 26], 4], ['ring no presses', [], 1]]) {
    const got = ring(presses);
    expect(`${what}: strikes`, got.hits, hits);
    expect(`${what}: damage`, got.damage, heroPhysical(DUEL, DUEL.dragoon.ring.totalPercent[hits - 1], true));
    expect(`${what}: reverts after its one Dragoon turn`, got.reverted, true);
    summaries.push(`[node duel] ${what}: ${got.hits} strikes, ${got.damage} damage`);
  }
  heroTurn(DUEL, dr, { cmd: 'magic', spell: 'Ember Shot' });
  expect('Ember Shot: MP and damage', [dr.hero.mp, dr.rival.hp - dr.rival.hpNow], [DUEL.dragoon.mp - 10, heroMagic(DUEL, DUEL.dragoon.spells[0])]);
  expect('one Dragoon turn left', [dr.hero.dragoon, dr.hero.sp], [true, 100]);
  rivalTurn(DUEL, dr, [null, null, null, null]);
  expect('Four Seals on a Dragoon (DF x2.5)', dr.hero.hp - dr.hero.hpNow, rivalPhysical(DUEL, 4, 1, true));
  expect('no SP from parries in Dragoon form', dr.hero.sp, 100);
  heroTurn(DUEL, dr, { cmd: 'magic', spell: 'Crimson Wyrm' });
  expect('Crimson Wyrm needs 80 MP (90 left)', dr.hero.mp, 10);
  expect('reverted after 2 Dragoon turns', [dr.hero.dragoon, dr.hero.sp], [false, 0]);
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

async function run(name, contextOptions, script, extra = '') {
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
  url.search = `?test&seed=${SEED}${extra}`;
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
  if (JSON.stringify(s.party.opening) !== JSON.stringify(nodeLine)) failures.push(`[${name}] party timeline differs from Node sim`);
  else summaries.push(`[${name}] party timeline matches Node sim: ${nodeLine.map((t) => `${t.name}@${t.at}`).join(', ')}`);
  checkFraming(name, 'party', s);
  await checkAlive(page, name, 'party');
  await shot(page, name, '2-party');
  summaries.push(`## ${name} party\n${await page.evaluate(() => window.__game.stateText())}`);
  await playPartyFight(page, name, click);
}

// Party: play the seeded auto fight to the end at 2x, screenshot an ultimate cut-in,
// wave 2 and the result, and compare the browser's fight with Node's.
async function playPartyFight(page, name, click) {
  const node = runFight(PARTY, SEED);
  await click('#speed');
  let s = await state(page);
  if (s.party.speed !== PARTY.playback.fastSpeed) failures.push(`[${name}] party speed button did not switch to ${PARTY.playback.fastSpeed}x`);
  let sawUlt = false;
  let sawWave = false;
  let still = 0;
  let last = -1;
  for (let i = 0; i < 1200 && !s.party.result; i++) {
    await advance(page, 500);
    s = await state(page);
    if (s.party.applied === last && ++still > 12) { failures.push(`[${name}] party playback stuck at event ${last}`); break; }
    if (s.party.applied !== last) still = 0;
    last = s.party.applied;
    if (!sawUlt && s.party.banner?.kind === 'ultimate') {
      sawUlt = true;
      await shot(page, name, '3-ultimate');
      summaries.push(`[${name}] ultimate cut-in on screen: "${s.party.banner.text}"; timeline ${s.timeline.map((t) => t.id ?? t.name).join(', ')}`);
    }
    if (!sawWave && s.party.wave === 1) {
      sawWave = true;
      await advance(page, 400);
      s = await state(page);
      checkFraming(name, 'party wave 2', s);
      await shot(page, name, '4-wave2');
      summaries.push(`[${name}] wave 2 on screen: ${s.party.units.filter((u) => u.side === 'enemy').map((u) => u.name).join(', ')}`);
    }
  }
  if (!sawUlt) failures.push(`[${name}] no ultimate cut-in seen during the party fight`);
  if (!sawWave) failures.push(`[${name}] wave 2 never appeared`);
  if (!s.party.result) return failures.push(`[${name}] party fight did not finish on screen`);
  await advance(page, 300);
  await shot(page, name, '5-result');
  if (!(await page.isVisible('#party-end'))) failures.push(`[${name}] result banner not shown`);
  const nodeDigest = fightDigest(node.events);
  if (s.party.result !== node.result || s.party.digest !== nodeDigest) failures.push(`[${name}] party fight differs from Node (browser ${s.party.result} ${s.party.digest}, Node ${node.result} ${nodeDigest})`);
  else summaries.push(`[${name}] party fight played to the end on screen: ${s.party.result}, matches Node (${nodeDigest})`);
  summaries.push(`## ${name} party result\n${await page.evaluate(() => window.__game.stateText())}`);
  await click('#again');
  await advance(page, 100);
  s = await state(page);
  if (s.party.result || s.party.applied !== 0 || s.party.wave !== 0) failures.push(`[${name}] Play again did not restart the fight`);
}

// D2: scripted presses through the timing UI on the test clock. Frenzy Chain at -40, 0
// and +40 ms then a missed press; Four Seals parried at -40, 0, +40 ms then not at all.
// The ?debug overlay must list the same offsets and verdicts, and the browser's duel must
// equal the same inputs replayed in Node.
const nowMs = async (page) => (await state(page)).time * 1000;
const advanceTo = async (page, ms) => { const t = await nowMs(page); if (ms > t) await advance(page, ms - t); };
async function timingWalk(page, name, click) {
  const fail = (msg) => failures.push(`[${name} timing] ${msg}`);
  await advance(page, 400);
  let s = await state(page);
  if (s.screen !== 'duel' || s.duel.phase !== 'menu') return fail(`expected the duel menu, got ${s.screen} / ${s.duel?.phase}`);
  await click('#duel-menu [data-cmd="attack"]');
  await advance(page, 50);
  s = await state(page);
  if (s.duel.timing.phase !== 'addition') return fail('Attack did not start Frenzy Chain');
  const { windowsTicks } = DUEL.addition;
  const half = ((windowsTicks[0][1] - windowsTicks[0][0] + 1) * DUEL.tickMs) / 2;
  for (const [i, off] of [-40, 0, 40, null].entries()) {
    const at = (await state(page)).duel.timing.perfectAt;
    if (i === 0) { await advanceTo(page, at - 300); await shot(page, name, '3-squares'); }
    if (off === null) { await advanceTo(page, at + half + 20); break; }
    await advanceTo(page, at + off);
    await page.evaluate(([t]) => window.__game.press('main', t), [at + off]);
    if (i === 0) { await advance(page, 20); await shot(page, name, '4-square-hit'); }
  }
  s = await state(page);
  const chainLog = s.duel.timing.log.map((p) => [p.ms, p.verdict]);
  const wantChain = [[-40, 'success'], [0, 'success'], [40, 'success'], [null, 'missed']];
  if (JSON.stringify(chainLog) !== JSON.stringify(wantChain)) fail(`Frenzy Chain presses ${JSON.stringify(chainLog)}, expected ${JSON.stringify(wantChain)}`);
  const overlay = await page.textContent('#presses-log');
  for (const want of ['-40 ms  success', ' 0 ms  success', '+40 ms  success', 'none  missed']) if (!overlay.includes(want)) fail(`?debug overlay lacks "${want}"`);
  await shot(page, name, '5-chain-debug');

  // Vael's Four Seals: wait for the rings.
  for (let i = 0; i < 100 && (await state(page)).duel.timing.phase !== 'defense'; i++) await advance(page, 100);
  s = await state(page);
  if (s.duel.timing.phase !== 'defense') return fail(`Vael's attack never came (phase ${s.duel.phase})`);
  const contacts = s.duel.timing.contacts;
  for (const [i, off] of [-40, 0, 40, null].entries()) {
    const at = contacts[i];
    if (i === 0) { await advanceTo(page, at - 300); await shot(page, name, '6-ring'); }
    if (off === null) { await advanceTo(page, at + DUEL.defense.dodgeWindowMs); break; }
    await advanceTo(page, at + off);
    await page.evaluate(([t]) => window.__game.press('main', t), [at + off]);
    if (i === 0) { await advance(page, 20); await shot(page, name, '7-parry'); }
  }
  await advance(page, 100);
  s = await state(page);
  const defLog = s.duel.timing.log.slice(-4).map((p) => [p.ms, p.verdict]);
  const wantDef = [[-40, 'parried'], [0, 'parried'], [40, 'parried'], [null, 'none']];
  if (JSON.stringify(defLog) !== JSON.stringify(wantDef)) fail(`Four Seals presses ${JSON.stringify(defLog)}, expected ${JSON.stringify(wantDef)}`);
  const overlay2 = await page.textContent('#presses-log');
  for (const want of ['-40 ms  parried', '+40 ms  parried', 'none  none']) if (!overlay2.includes(want)) fail(`?debug overlay lacks "${want}"`);
  await advance(page, 1500);
  s = await state(page);
  // Same inputs through the sim in Node.
  const node = createDuel(DUEL, SEED);
  for (const inp of s.duel.inputs) inp.who === 'hero' ? heroTurn(DUEL, node, inp.command) : rivalTurn(DUEL, node, inp.defense);
  const pick = (d) => JSON.stringify({ hero: d.hero, rival: d.rival, next: d.next, result: d.result });
  if (pick(s.duel) !== pick(node)) fail(`browser duel differs from Node: ${pick(s.duel)} vs ${pick(node)}`);
  const hurt = node.rival.hp - node.rival.hpNow;
  if (hurt !== heroPhysical(DUEL, 80)) fail(`Vael took ${hurt}, expected ${heroPhysical(DUEL, 80)} (4 hits)`);
  if (node.hero.hp - node.hero.hpNow !== rivalPhysical(DUEL, 4) / 4) fail(`Rhen took ${node.hero.hp - node.hero.hpNow}, expected one pillar`);
  if (s.duel.phase !== 'menu') fail(`after Vael's turn expected the menu, got ${s.duel.phase}`);
  await shot(page, name, '8-after');
  summaries.push(`[${name} timing] chain ${chainLog.map(([m, v]) => `${m ?? 'none'}:${v}`).join(' ')} → 4 hits, ${hurt} damage; Four Seals ${defLog.map(([m, v]) => `${m ?? 'none'}:${v}`).join(' ')} → Rhen took ${node.hero.hp - node.hero.hpNow}; SP ${node.hero.sp}; matches Node`);
}

// D3: whole fights through the menu. Perfect: every press and parry on the frame, with
// Escape (refused), a Spirit Potion and a Guard on the way, to Victory. No presses, against
// a Vael tuned stronger (?tune), to Defeat. Both must equal Node replaying the same inputs.
const DEFEAT_TUNE = 'rival.atk:300';
async function duelFight(page, name, click, perfect) {
  const data = perfect ? DUEL : applyTune(DUEL, DEFEAT_TUNE);
  const fail = (msg) => failures.push(`[${name}] ${msg}`);
  let heroTurns = 0;
  let shots = 0;
  for (let guard = 0; guard < 4000; guard++) {
    const s = await state(page);
    const d = s.duel;
    if (d.phase === 'over') break;
    if (d.phase === 'menu' && d.next === 'hero') {
      heroTurns++;
      if (perfect && heroTurns === 1) {
        await click('#duel-menu [data-cmd="escape"]');
        await advance(page, 20);
        const after = await state(page);
        if (after.duel.next !== 'hero' || !after.duel.floats.some((f) => f.includes("Can't escape"))) fail('Escape was not refused on screen');
        await click('#duel-menu [data-cmd="items"]');
        await advance(page, 20);
        await shot(page, name, '1-items');
        await click('#duel-menu [data-item="Spirit Potion"]');
      } else if (perfect && heroTurns === 2) await click('#duel-menu [data-cmd="guard"]');
      else await click('#duel-menu [data-cmd="attack"]');
      await advance(page, 20);
      continue;
    }
    const t = d.timing;
    if (perfect && t.phase === 'addition') {
      await advanceTo(page, t.perfectAt);
      await page.evaluate(([at]) => window.__game.press('main', at), [t.perfectAt]);
      await advance(page, 120);
      if (shots++ === 3) await shot(page, name, '2-numbers');
      continue;
    }
    if (perfect && t.phase === 'defense') {
      for (const at of t.contacts) {
        await advanceTo(page, at);
        await page.evaluate(([x]) => window.__game.press('main', x), [at]);
      }
      await advance(page, 300);
      continue;
    }
    await advance(page, 200);
  }
  const s = await state(page);
  const want = perfect ? 'win' : 'lose';
  if (s.duel.phase !== 'over' || s.duel.result !== want) return fail(`expected ${want}, got phase ${s.duel.phase} result ${s.duel.result}`);
  if (!(await page.isVisible('#result'))) fail('no Victory / Defeat banner');
  const title = await page.textContent('#result-title');
  if (title !== (perfect ? 'Victory' : 'Defeat')) fail(`banner reads ${title}`);
  await advance(page, 1500);
  await shot(page, name, perfect ? '3-victory' : '3-defeat');
  const node = createDuel(data, SEED);
  for (const inp of s.duel.inputs) inp.who === 'hero' ? heroTurn(data, node, inp.command) : rivalTurn(data, node, inp.defense);
  const pick = (x) => JSON.stringify({ hero: x.hero, rival: x.rival, next: x.next, result: x.result });
  if (pick(s.duel) !== pick(node)) fail(`browser duel differs from Node: ${pick(s.duel)} vs ${pick(node)}`);
  summaries.push(`[${name}] ${title} after ${node.hero.turns} Rhen turns (${node.tally.perfectChains} perfect chains, ${node.tally.parries} parries), Rhen HP ${node.hero.hpNow}/${node.hero.hp}, Vael HP ${node.rival.hpNow}; matches Node`);
  // Play again starts a fresh duel.
  await click('#play-again');
  await advance(page, 300);
  const again = await state(page);
  if (again.duel?.phase !== 'menu' || again.duel.rival.hpNow !== again.duel.rival.hp) fail('Play again did not start a fresh duel');
}

// D4: three perfect chains fill the SP bar, transform (flash, wings), a perfect ring
// (5 strikes), each spell once, then Rhen reverts after his 5th Dragoon turn. Tuned so
// Vael lasts and 140 MP pays for all four spells (100 MP can't). Must equal Node.
const DRAGOON_TUNE = 'rival.hp:20000,dragoon.mp:140';
async function dragoonWalk(page, name, click) {
  const data = applyTune(DUEL, DRAGOON_TUNE);
  const fail = (msg) => failures.push(`[${name}] ${msg}`);
  const plan = ['attack', 'attack', 'attack', 'dragoon', 'strike', ...data.dragoon.spells.map((x) => `magic:${x.name}`)];
  const seen = { transformed: false, wings: false, strikes: 0, reverted: false };
  for (let guard = 0; guard < 4000 && !seen.reverted; guard++) {
    const s = await state(page);
    const d = s.duel;
    if (d.phase === 'over') return fail(`fight ended early (${d.result})`);
    if (d.phase === 'menu' && d.next === 'hero') {
      const step = plan.shift();
      if (!step) { seen.reverted = !d.hero.dragoon && !d.wings; break; }
      if (step === 'dragoon') {
        if (d.hero.sp !== d.hero.spMax) fail(`SP ${d.hero.sp} before transforming, expected full ${d.hero.spMax}`);
        await click('#duel-menu [data-cmd="dragoon"]');
        await advance(page, data.dragoonUi.transformMs * 0.2);
        await shot(page, name, '1-flash');
        await advance(page, data.dragoonUi.transformMs);
        const t = await state(page);
        seen.transformed = t.duel.hero.dragoon;
        seen.wings = t.duel.wings;
        if (!seen.transformed || !seen.wings) fail(`transform: dragoon ${t.duel.hero.dragoon}, wings ${t.duel.wings}`);
        const labels = await page.$$eval('#duel-menu button', (bs) => bs.map((b) => b.textContent));
        if (labels.join(',') !== data.dragoon.menu.map((m) => m.label).join(',')) fail(`Dragoon menu reads ${labels}`);
        await shot(page, name, '2-dragoon');
      } else if (step.startsWith('magic:')) {
        await click('#duel-menu [data-cmd="magic"]');
        await advance(page, 20);
        if (step.endsWith('Crimson Wyrm')) await shot(page, name, '5-spells');
        await click(`#duel-menu [data-spell="${step.slice(6)}"]`);
        await advance(page, data.dragoonUi.flightMs * 0.6);
        if (step.endsWith('Crimson Wyrm')) await shot(page, name, '6-wyrm');
      } else await click(`#duel-menu [data-cmd="${step}"]`);
      await advance(page, 20);
      continue;
    }
    const t = d.timing;
    if (t.phase === 'addition') {
      await advanceTo(page, t.perfectAt);
      await page.evaluate(([at]) => window.__game.press('main', at), [t.perfectAt]);
      await advance(page, 20);
      continue;
    }
    if (t.phase === 'ring') {
      if (!t.started) { await advance(page, 300); await page.evaluate(() => window.__game.press('main')); await advance(page, 20); continue; }
      if (t.press === 2) { await advanceTo(page, t.perfectAt - 150); await shot(page, name, '3-ring'); }
      await advanceTo(page, t.perfectAt);
      await page.evaluate(([at]) => window.__game.press('main', at), [t.perfectAt]);
      seen.strikes = t.press + 1;
      await advance(page, 20);
      continue;
    }
    if (t.phase === 'defense') {
      for (const at of t.contacts) { await advanceTo(page, at); await page.evaluate(([x]) => window.__game.press('main', x), [at]); }
      await advance(page, 300);
      continue;
    }
    await advance(page, 200);
  }
  const s = await state(page);
  if (!seen.reverted) fail(`did not revert after the planned Dragoon turns (dragoon ${s.duel.hero.dragoon}, plan left ${plan.join(',')})`);
  await shot(page, name, '7-reverted');
  const node = createDuel(data, SEED);
  for (const inp of s.duel.inputs) inp.who === 'hero' ? heroTurn(data, node, inp.command) : rivalTurn(data, node, inp.defense);
  const pick = (x) => JSON.stringify({ hero: x.hero, rival: x.rival, next: x.next, result: x.result });
  if (pick(s.duel) !== pick(node)) fail(`browser duel differs from Node: ${pick(s.duel)} vs ${pick(node)}`);
  if (node.tally.strikeHits !== 5 || node.tally.spells !== 4 || node.tally.transforms !== 1) fail(`tally ${JSON.stringify(node.tally)}`);
  summaries.push(`[${name}] transformed at ${node.hero.spMax} SP, ring ${node.tally.strikeHits}/5 strikes, ${node.tally.spells} spells (MP ${node.hero.mp} left), reverted after 5 Dragoon turns; Vael HP ${node.rival.hpNow}/${node.rival.hp}; matches Node`);
}

const DEVICES = {
  laptop: [{ viewport: { width: 1280, height: 720 } }, (page) => (sel) => page.click(sel)],
  phone: [{ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, (page) => (sel) => page.tap(sel)],
};
for (const [name, [opts, input]] of Object.entries(DEVICES)) {
  await run(name, opts, (page) => walk(page, name, input(page)));
  await run(`${name}-timing`, opts, (page) => timingWalk(page, `${name}-timing`, input(page)), '&debug&mode=duel');
  await run(`${name}-victory`, opts, (page) => duelFight(page, `${name}-victory`, input(page), true), '&mode=duel');
  await run(`${name}-dragoon`, opts, (page) => dragoonWalk(page, `${name}-dragoon`, input(page)), `&mode=duel&tune=${DRAGOON_TUNE}`);
  await run(`${name}-defeat`, opts, (page) => duelFight(page, `${name}-defeat`, input(page), false), `&mode=duel&tune=${DEFEAT_TUNE}`);
}

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
