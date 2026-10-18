import * as THREE from 'three';
import { createStage, frameCamera } from './view/stage.js';
import { createFigures } from './view/units.js';
import { createClock, STEP } from './clock.js';
import { createDebugOverlay } from './debug.js';
import { DUEL } from './duel/data.js';
import { createDuel } from './duel/sim.js';
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
    showDuelHud();
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
  screen = 'start';
  $('start').hidden = false;
  $('back').hidden = true;
  $('duel-hud').hidden = $('party-hud').hidden = true;
  scene.background = new THREE.Color(0x111522);
}

const pct = (now, max) => `${max ? Math.max(0, (100 * now) / max) : 100}%`;
function showDuelHud() {
  const { hero, rival, menu } = battle;
  $('duel-hud').hidden = false;
  $('rival-name').textContent = rival.name;
  $('rival-hp').style.width = pct(rival.hpNow, rival.hp);
  $('hero-name').textContent = hero.name;
  $('hero-dlv').textContent = `Dragoon Lv ${DUEL.hero.dragoonLevel}`;
  $('hero-hp').style.width = pct(hero.hpNow, hero.hp);
  $('hero-hp-text').textContent = hero.hp ? `${hero.hpNow}/${hero.hp}` : '–';
  // One SP segment per Dragoon level (RESEARCH.md); filled ones glow.
  $('hero-sp').innerHTML = Array.from({ length: DUEL.hero.dragoonLevel }, () => '<i></i>').join('');
  $('duel-menu').innerHTML = menu.map((m) => `<button data-cmd="${m.id}" disabled title="${m.enabled ? 'not built yet' : 'no escape from a boss'}">${m.label}</button>`).join('');
}

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
function render() {
  if (stage) renderer.render(scene, camera);
  else renderer.clear();
  debug?.frame();
}
function step(dt) {
  clock.tick(dt);
  figures.update(dt);
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
    duel: screen === 'duel' ? { hero: battle.hero, rival: battle.rival, menu: battle.menu } : null,
  }),
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
  renderer.setAnimationLoop((now) => {
    step(Math.min(0.1, (now - last) / 1000));
    last = now;
    render();
  });
}
