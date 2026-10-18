import * as THREE from 'three';
import { createStage, frameCamera } from './view/stage.js';
import { createFigures } from './view/units.js';
import { createClock, STEP } from './clock.js';
import { createDebugOverlay } from './debug.js';
import { applyTune } from './tune.js';
import { EXAMPLE as EXAMPLE_DATA } from './example/data.js';
import { createExampleView } from './view/example-view.js';

// Start screen picks a mode; each mode is one stage. Rules live in the sims
// (src/<mode>/sim.js); this file only shows what they hold.
const params = new URLSearchParams(location.search);
const TEST = params.has('test'); // ?test: the clock only moves when the check calls advance()
const seed = Number(params.get('seed') ?? 1); // ?seed=N picks the fight
const EXAMPLE = applyTune(EXAMPLE_DATA, params.get('tune')); // ?tune=foe.atk:60 tries numbers by name
const MODES = ['example'];
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
  const start = params.get('mode'); // ?mode=example skips the start screen
  if (MODES.includes(start)) enter(start);
}).catch((e) => console.error(`models failed to load: ${e.message}`));

let screen = 'start';
let stage = null;
let view = null; // the mode on screen

function enter(mode) {
  leave();
  screen = mode;
  $('start').hidden = true;
  $('back').hidden = false;
  stage = createStage(scene, mode);
  view = createExampleView({ data: EXAMPLE, seed, figures, stage, $, onRestart: () => enter(mode) });
  resize();
}

function leave() {
  view?.dispose();
  view = null;
  figures.clear();
  stage?.dispose();
  stage = null;
  screen = 'start';
  $('start').hidden = false;
  $('back').hidden = true;
  scene.background = new THREE.Color(0x111522);
}

for (const b of document.querySelectorAll('.mode')) b.addEventListener('click', () => enter(b.dataset.mode));
$('back').addEventListener('click', leave);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  if (stage) frameCamera(camera, stage, innerWidth / innerHeight);
}
addEventListener('resize', resize);
resize();

const clock = createClock({ manual: TEST });
const debug = params.has('debug') ? createDebugOverlay($('fps'), renderer) : null; // ?debug: FPS

function render() {
  if (stage) renderer.render(scene, camera);
  else renderer.clear();
  debug?.frame();
}
function step(dt) {
  clock.tick(dt);
  view?.update(dt * 1000);
  figures.update(dt);
}

// Where each figure's feet and head land on screen (-1..1), for the check's framing test.
function framing() {
  return figures.all().map((f) => {
    const [feet, head] = f.extent().map((p) => p.project(camera));
    return { id: f.id, feet: [+feet.x.toFixed(2), +feet.y.toFixed(2)], head: [+head.x.toFixed(2), +head.y.toFixed(2)] };
  });
}

function stateText() {
  const lines = [`screen: ${screen}; models ${loaded ? 'loaded' : 'loading'}; seed ${seed}; test clock ${TEST ? `on (${clock.time.toFixed(2)} s)` : 'off'}${params.get('tune') ? `; tune ${params.get('tune')}` : ''}`];
  if (view) {
    const v = view.state();
    lines.push(`example: ${v.applied} events played; hero HP ${v.shown.hero}/${EXAMPLE.hero.hp}, foe HP ${v.shown.foe}/${EXAMPLE.foe.hp}${v.result ? `; result ${v.result}` : ''}`);
  }
  for (const f of figures.list()) lines.push(`  figure ${f.id}: ${f.model}, ${f.animation}`);
  return lines.join('\n');
}

window.__game = {
  state: () => ({ screen, loaded, seed, time: clock.time, figures: figures.list(), framing: stage ? framing() : [], example: view?.state() ?? null }),
  stateText,
  enter,
  leave,
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
    step(Math.min(0.1, (t - last) / 1000));
    last = t;
    render();
  });
}
