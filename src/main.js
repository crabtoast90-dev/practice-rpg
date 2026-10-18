import * as THREE from 'three';
import { createStage, frameCamera } from './view/stage.js';
import { createFigures } from './view/units.js';
import { createClock, STEP } from './clock.js';
import { createDebugOverlay } from './debug.js';
import { DUEL } from './duel/data.js';
import { createDuel } from './duel/sim.js';
import { createTiming, calibrate } from './view/timing.js';
import { createDuelView } from './view/duel-view.js';
import { createInput } from './input.js';
import { PARTY } from './party/data.js';
import { createParty, timeline } from './party/sim.js';

// Start screen picks a mode; each mode is one stage. Rules live in the sims
// (src/duel/sim.js, src/party/sim.js); this file only shows what they hold.
const params = new URLSearchParams(location.search);
const TEST = params.has('test');
const seed = Number(params.get('seed') ?? 1);
const $ = (id) => document.getElementById(id);

const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
const figures = createFigures(scene);
let loaded = false;
figures.ready.then(() => {
  loaded = true;
  $('loading').hidden = true;
  for (const b of document.querySelectorAll('.mode')) b.disabled = false;
  const start = params.get('mode');
  if (start === 'duel' || start === 'party') enter(start);
}).catch((e) => console.error(`models failed to load: ${e.message}`));

let screen = 'start';
let stage = null;
let battle = null; // the sim state of the mode on screen
let duelView = null;

// Game-clock time in ms: the test clock under ?test, else the browser's event clock
// (the same one input events are stamped with).
const now = () => (TEST ? clock.time * 1000 : performance.now());
// Waits on the game clock, so the test clock replays every pause exactly.
let timers = [];
const later = (ms, fn) => timers.push({ at: now() + ms, fn });
function runTimers() {
  const due = timers.filter((t) => now() >= t.at);
  timers = timers.filter((t) => now() < t.at);
  for (const t of due) t.fn();
}

// Input-to-screen delay: one measured frame (estimate) unless this device has been
// calibrated by tapping to the flash (?debug). Zero on the test clock.
const LATENCY_KEY = 'practice-rpg.latencyMs';
const frames = [];
let calibrated = null;
try { const v = localStorage.getItem(LATENCY_KEY); calibrated = v === null ? null : Number(v); } catch { /* storage blocked */ }
function frameMs() {
  if (!frames.length) return 1000 / 60;
  const s = [...frames].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
const latency = () => (TEST ? 0 : calibrated ?? frameMs() * DUEL.timingUi.latencyFrames);

// Where a figure's chest is on screen, in CSS pixels, for the timing UI.
function anchor(id) {
  const f = figures.all().find((x) => x.id === id);
  if (!f) return { x: innerWidth / 2, y: innerHeight / 2 };
  const p = f.group.position.clone();
  p.y += f.height * 0.6;
  p.project(camera);
  return { x: ((p.x + 1) / 2) * innerWidth, y: ((1 - p.y) / 2) * innerHeight };
}
const timing = createTiming({ data: DUEL, root: $('timing'), now, latency, anchor });
const input = createInput({
  keys: DUEL.timingUi.keys,
  stamp: (e) => (TEST ? now() : e.timeStamp),
  onPress: (button, t) => { if (calib) calib.tap(t); else if (screen === 'duel') timing.press(button, t); },
});
input.bind($('pad'));

function enter(mode) {
  leave();
  screen = mode;
  $('start').hidden = true;
  $('back').hidden = false;
  if (mode === 'duel') {
    battle = createDuel(DUEL, seed);
    stage = createStage(scene, 'duel');
    figures.spawn('hero', DUEL.hero.model, { ...stage.spots.hero, height: 1.75 });
    figures.spawn('rival', DUEL.rival.model, { ...stage.spots.rival, height: 1.8 });
    $('duel-hud').hidden = false;
    duelView = createDuelView({ data: DUEL, battle, figures, timing, later, $ });
  } else {
    battle = createParty(PARTY, seed, 0);
    const heroes = battle.units.filter((u) => u.side === 'hero');
    const enemies = battle.units.filter((u) => u.side === 'enemy');
    stage = createStage(scene, 'party', { heroes: heroes.length, enemies: enemies.length });
    heroes.forEach((u, i) => figures.spawn(u.id, u.model, { ...stage.spots.heroes[i], height: 1.55 }));
    enemies.forEach((u, i) => figures.spawn(u.id, u.model, { ...stage.spots.enemies[i], height: u.kind === 'skeletonWarrior' ? 1.9 : 1.6 }));
    showPartyHud();
  }
  resize();
}

function leave() {
  figures.clear();
  stage?.dispose();
  stage = null;
  battle = null;
  duelView = null;
  timers = [];
  timing.clear();
  screen = 'start';
  $('start').hidden = false;
  $('back').hidden = true;
  $('duel-hud').hidden = $('party-hud').hidden = true;
  scene.background = new THREE.Color(0x111522);
}

const pct = (n, max) => `${max ? Math.max(0, (100 * n) / max) : 100}%`;
function showPartyHud() {
  $('party-hud').hidden = false;
  const sp = PARTY.rules.skillPoints;
  $('party-sp').innerHTML = Array.from({ length: sp.max }, (_, i) => `<i class="${i < battle.skillPoints ? 'full' : ''}"></i>`).join('');
  $('timeline').innerHTML = timeline(PARTY, battle, 8).map((t) => `<div class="${t.side}"><span>${t.name}</span><span class="av">${t.at}</span></div>`).join('');
  $('cards').innerHTML = battle.units.filter((u) => u.side === 'hero').map((u) => {
    const h = PARTY.heroes[u.id];
    return `<div class="card panel"><div class="name">${h.name}</div><div class="role">${h.role}</div><div class="bar hp"><i style="width:${pct(u.hpNow, u.hp)}"></i></div><div class="energy"><i style="width:${pct(u.energy, h.maxEnergy)}"></i></div></div>`;
  }).join('');
}

for (const b of document.querySelectorAll('.mode')) b.addEventListener('click', () => enter(b.dataset.mode));
$('back').addEventListener('click', leave);

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  if (stage) frameCamera(camera, stage, w / h);
}
addEventListener('resize', resize);
resize();

const clock = createClock({ manual: TEST });
const debug = params.has('debug') ? createDebugOverlay($('fps'), renderer) : null;

// ?debug: the last presses (offset from the perfect frame, verdict), the delay in use,
// and the tap-to-the-flash calibration.
let calib = null;
if (params.has('debug')) {
  $('presses').hidden = false;
  $('calibrate').onclick = () => {
    $('calib').hidden = false;
    calib = calibrate({ data: DUEL, box: $('calib-box'), now, done: (ms) => {
      calib = null;
      $('calib').hidden = true;
      if (ms === null) return;
      calibrated = ms;
      try { localStorage.setItem(LATENCY_KEY, String(ms)); } catch { /* storage blocked */ }
    } });
  };
  $('calib').addEventListener('pointerdown', (e) => { e.preventDefault(); calib?.tap(e.timeStamp); });
}
function showPresses() {
  if ($('presses').hidden) return;
  const src = TEST ? 'test clock' : calibrated !== null ? 'calibrated' : `${DUEL.timingUi.latencyFrames} frame estimate`;
  const rows = timing.info().log.map((p) => `${p.what.padEnd(16)} ${p.button ?? '-'} ${p.ms === null ? '   none' : `${p.ms > 0 ? '+' : ''}${p.ms} ms`.padStart(7)}  ${p.verdict}`);
  $('presses-log').textContent = `delay ${latency().toFixed(0)} ms (${src})\n${rows.join('\n') || 'no presses yet'}`;
}
function render() {
  if (stage) renderer.render(scene, camera);
  else renderer.clear();
  debug?.frame();
}
function step(dt) {
  clock.tick(dt);
  runTimers();
  timing.update();
  figures.update(dt);
  showPresses();
}

// Where each figure's feet and head land on screen (NDC, -1..1), for framing checks.
function framing() {
  return figures.all().map((f) => {
    const [feet, head] = f.extent().map((p) => p.project(camera));
    return { id: f.id, feet: [+feet.x.toFixed(2), +feet.y.toFixed(2)], head: [+head.x.toFixed(2), +head.y.toFixed(2)] };
  });
}

function stateText() {
  const lines = [`screen: ${screen}; models ${loaded ? 'loaded' : 'loading'}; seed ${seed}; test clock ${TEST ? `on (${clock.time.toFixed(2)} s)` : 'off'}`];
  if (screen === 'duel') {
    const { hero, rival, menu } = battle;
    lines.push(`duel (${DUEL.status}): ${hero.name} HP ${hero.hpNow}/${hero.hp}, SP ${hero.sp}, Dragoon Lv ${DUEL.hero.dragoonLevel} vs ${rival.name} HP ${rival.hpNow}/${rival.hp}`);
    const t = timing.info();
    lines.push(`phase: ${duelView.phase()}, next: ${battle.next}${battle.result ? `, result ${battle.result}` : ''}${t.phase ? `; timing ${t.phase} ${t.phase === 'addition' ? `press ${t.press}` : `${t.move} hit ${t.hit}`}` : ''}`);
    for (const p of t.log) lines.push(`  press ${p.what}: ${p.button ?? 'none'} ${p.ms ?? ''} ${p.verdict}`);
    lines.push(`menu: ${menu.map((m) => `${m.label}${m.enabled ? '' : ' (disabled)'}`).join(', ')}`);
  }
  if (screen === 'party') {
    lines.push(`party wave ${battle.wave + 1}: skill points ${battle.skillPoints}/${PARTY.rules.skillPoints.max}`);
    for (const u of battle.units) lines.push(`  ${u.side} ${u.name}: HP ${u.hpNow}/${u.hp}, SPD ${u.speed}`);
    lines.push(`timeline: ${timeline(PARTY, battle, 8).map((t) => `${t.name}@${t.at}`).join(', ')}`);
  }
  for (const f of figures.list()) lines.push(`  figure ${f.id}: ${f.model}, ${f.animation}`);
  return lines.join('\n');
}

window.__game = {
  state: () => ({
    screen, loaded, seed, time: clock.time,
    figures: figures.list(),
    framing: stage ? framing() : [],
    timeline: screen === 'party' ? timeline(PARTY, battle, 8) : null,
    duel: screen === 'duel' ? { hero: battle.hero, rival: battle.rival, menu: battle.menu, next: battle.next, result: battle.result, phase: duelView.phase(), timing: timing.info(), verdict: timing.verdictText(), inputs: duelView.inputs } : null,
  }),
  stateText,
  enter,
  leave,
  // A press of 'main' | 'counter' | 'dodge', stamped at game-clock time atMs (default: now).
  press: (button, atMs) => timing.press(button, atMs ?? now()),
  // Test clock: advance simulated time in fixed steps, then draw one frame.
  advance(ms) {
    for (let t = 0; t < ms / 1000 - 1e-9; t += STEP) step(STEP);
    render();
  },
};

if (TEST) render();
else {
  let last = performance.now();
  renderer.setAnimationLoop((t) => {
    frames.push(t - last);
    if (frames.length > 60) frames.shift();
    step(Math.min(0.1, (t - last) / 1000));
    last = t;
    render();
  });
}
