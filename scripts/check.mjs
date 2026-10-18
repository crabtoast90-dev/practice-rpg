// npm run check: build, open the site headless on laptop and phone, walk through
// every screen on the test clock, save screenshots, and fail on console errors,
// failed requests, a frozen state, figures out of frame, or a browser sim that
// differs from the same sim run in Node.
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PARTY } from '../src/party/data.js';
import { createParty, timeline } from '../src/party/sim.js';
import { DUEL } from '../src/duel/data.js';
import { createDuel } from '../src/duel/sim.js';

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
