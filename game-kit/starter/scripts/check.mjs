// npm run check: build, open the site headless on laptop and phone, walk through every
// screen on the test clock, save screenshots, and fail on console errors, failed
// requests, a frozen state, figures out of frame, or a browser sim that differs from
// the same sim run in Node. Add steps here for every feature you build.
//   npm run check                    build and check this checkout
//   npm run check -- --url=<live>    check a deployed site instead
//   npm run check -- --only=defeat   only the runs whose name contains "defeat" (quick iteration;
//                                    the full check must still pass before a merge)
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXAMPLE } from '../src/example/data.js';
import { runFight, fightDigest } from '../src/example/sim.js';
import { applyTune } from '../src/tune.js';

const RUNS = 'check-output';
const KEEP = 5;
const OUT = join(RUNS, new Date().toISOString().replace(/[:.]/g, '-')); // one folder per run
const URL_ARG = process.argv.find((a) => a.startsWith('--url='))?.slice(6);
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const SEED = 1;
const LOSE_TUNE = 'foe.atk:90'; // a foe strong enough to win, to check the Defeat path

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (existsSync('/opt/pw-browsers/chromium')) return '/opt/pw-browsers/chromium';
  return undefined; // playwright's own download, if installed
}

const failures = [];
const log = [];
const summaries = [];
mkdirSync(OUT, { recursive: true });
for (const old of readdirSync(RUNS).filter((f) => /^\d{4}-/.test(f)).sort().slice(0, -KEEP)) rmSync(join(RUNS, old), { recursive: true, force: true });

// Node determinism: the same seed must give the same fight, event for event.
for (const seed of [SEED, 2, 3]) {
  const [x, y] = [runFight(EXAMPLE, seed), runFight(EXAMPLE, seed)];
  if (JSON.stringify(x.events) !== JSON.stringify(y.events)) failures.push(`[node] seed ${seed}: two runs differ`);
  else summaries.push(`[node] seed ${seed} fight twice: identical (${x.result}, ${x.actions} actions)`);
}

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
  if (ONLY && !name.includes(ONLY)) return;
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

// Every figure's feet and head must be on screen (x within 80% so the body and weapon fit too).
function checkFraming(name, s) {
  for (const f of s.framing) {
    const [fx, fy] = f.feet;
    const [hx, hy] = f.head;
    if (Math.abs(fx) > 0.8 || Math.abs(hx) > 0.8 || fy < -0.97 || hy > 0.9) failures.push(`[${name}] ${f.id} out of frame (feet ${f.feet}, head ${f.head})`);
  }
}

// The test clock must move the figures' idle loops (a frozen state fails).
async function checkAlive(page, name) {
  const a = (await state(page)).figures.map((f) => f.clipTime);
  await advance(page, 300);
  const b = (await state(page)).figures.map((f) => f.clipTime);
  if (!a.length || a.every((t, i) => t === b[i])) failures.push(`[${name}] figures frozen: animation clock did not move`);
}

// Play the seeded fight to the end on screen and compare it with the same fight in Node.
async function playFight(page, name, click, data, want) {
  const node = runFight(data, SEED);
  let s = await state(page);
  let still = 0;
  let last = -1;
  let shotMid = false;
  for (let i = 0; i < 2000 && !s.example.result; i++) {
    await advance(page, 250);
    s = await state(page);
    if (s.example.applied === last && ++still > 20) { failures.push(`[${name}] playback stuck at event ${last}`); break; }
    if (s.example.applied !== last) still = 0;
    last = s.example.applied;
    if (!shotMid && s.example.applied >= 4) { shotMid = true; await shot(page, name, '2-mid-fight'); }
  }
  if (!s.example.result) return failures.push(`[${name}] fight did not finish on screen`);
  await advance(page, 600);
  await shot(page, name, '3-result');
  if (!(await page.isVisible('#example-end'))) failures.push(`[${name}] result banner not shown`);
  const nodeDigest = fightDigest(node.events);
  if (s.example.result !== node.result || s.example.digest !== nodeDigest) failures.push(`[${name}] fight differs from Node (browser ${s.example.result} ${s.example.digest}, Node ${node.result} ${nodeDigest})`);
  else summaries.push(`[${name}] fight played to the end on screen: ${s.example.result}, matches Node (${nodeDigest})`);
  if (want && s.example.result !== want) failures.push(`[${name}] expected ${want}, got ${s.example.result}`);
  summaries.push(`## ${name} result\n${await page.evaluate(() => window.__game.stateText())}`);
  await click('#again');
  await advance(page, 100);
  s = await state(page);
  if (s.example.applied !== 0 || s.example.result) failures.push(`[${name}] Play again did not restart the fight`);
}

async function walk(page, name, click) {
  await advance(page, 100);
  let s = await state(page);
  if (s.screen !== 'start') failures.push(`[${name}] expected the start screen, got ${s.screen}`);
  if (!(await page.isEnabled('.mode[data-mode="example"]'))) failures.push(`[${name}] mode button not enabled after loading`);
  await shot(page, name, '0-start');
  await click('.mode[data-mode="example"]');
  await advance(page, 200);
  s = await state(page);
  if (s.screen !== 'example' || s.figures.length !== 2) failures.push(`[${name}] example: screen ${s.screen}, ${s.figures.length} figures (expected 2)`);
  checkFraming(name, s);
  await checkAlive(page, name);
  await shot(page, name, '1-example');
  summaries.push(`## ${name} example\n${await page.evaluate(() => window.__game.stateText())}`);
  await playFight(page, name, click, EXAMPLE);
  await click('#back');
  await advance(page, 100);
  if ((await state(page)).screen !== 'start') failures.push(`[${name}] back did not return to the start screen`);
}

// ?mode skips the start screen; ?tune changes numbers by name (Node applies the same string).
async function tunedLoss(page, name, click) {
  await advance(page, 100);
  if ((await state(page)).screen !== 'example') failures.push(`[${name}] ?mode=example did not skip the start screen`);
  await playFight(page, name, click, applyTune(EXAMPLE, LOSE_TUNE), 'lose');
}

// ?debug shows the FPS overlay.
async function debugOverlay(page, name) {
  await advance(page, 100);
  if (!(await page.isVisible('#fps'))) failures.push(`[${name}] ?debug did not show the FPS overlay`);
  summaries.push(`[${name}] ?debug overlay visible`);
}

const DEVICES = {
  laptop: [{ viewport: { width: 1280, height: 720 } }, (page) => (sel) => page.click(sel)],
  phone: [{ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, (page) => (sel) => page.tap(sel)],
};
for (const [name, [opts, input]] of Object.entries(DEVICES)) {
  await run(name, opts, (page) => walk(page, name, input(page)));
  await run(`${name}-defeat`, opts, (page) => tunedLoss(page, `${name}-defeat`, input(page)), `&mode=example&tune=${LOSE_TUNE}`);
}
await run('laptop-debug', DEVICES.laptop[0], (page) => debugOverlay(page, 'laptop-debug'), '&debug');

await browser.close();
await server?.close();

const report = [
  `# Check ${failures.length ? 'FAILED' : 'passed'}${ONLY ? ` (ONLY runs matching "${ONLY}")` : ''} — ${new Date().toISOString()}`,
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
