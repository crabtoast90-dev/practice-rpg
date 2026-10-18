import * as THREE from 'three';
import { createParty, step, timeline, fightDigest } from '../party/sim.js';

// Party fight on screen. The sim decides everything; this file asks it for one
// action at a time and plays that action's events back with timing: animations,
// numbers, bars, the timeline, ultimate cut-ins, waves and the result.
// Only display state lives here (what the screen has shown so far).

const HEIGHT = { hero: 1.55, enemy: 1.6, skeletonWarrior: 1.9 };
const RANGED = new Set(['mage', 'skeletonMage']); // cast from where they stand
const $ = (id) => document.getElementById(id);

export function createPartyView({ data, seed, figures, stage, onRestart }) {
  const pace = data.playback;
  const battle = createParty(data, seed, 0);
  const opening = timeline(data, battle, 8);

  // Display state, changed only by applying events.
  const shown = {
    units: new Map(),
    skillPoints: battle.skillPoints,
    wave: 0,
    now: null, // whose action is playing
    ults: [], // ultimates waiting to cut in (shown as inserted timeline entries)
    upcoming: opening,
    banner: null, // { kind: 'ultimate' | 'wave', text }
    result: null,
    applied: 0, // events played so far
  };
  const remember = (u) => shown.units.set(u.id, { id: u.id, name: u.name, side: u.side, kind: u.kind ?? u.id, hp: u.hp, hpNow: u.hpNow, energy: u.energy ?? 0, maxEnergy: u.maxEnergy ?? 0, shield: 0, alive: true, model: u.model });
  battle.units.forEach(remember);

  // Figures: heroes in front, enemies at the back.
  const spotOf = new Map();
  function spawnUnit(u, i, rising) {
    const spot = u.side === 'hero' ? stage.spots.heroes[i] : stage.spots.enemies[i];
    spotOf.set(u.id, spot);
    const f = figures.spawn(u.id, u.model, { ...spot, height: HEIGHT[u.kind] ?? HEIGHT[u.side] });
    if (rising) f.play('spawn');
  }
  battle.units.filter((u) => u.side === 'hero').forEach((u, i) => spawnUnit(u, i));
  battle.units.filter((u) => u.side === 'enemy').forEach((u, i) => spawnUnit(u, i));

  // Playback queue: each item waits `hold` ms after it is applied.
  const queue = [];
  let clock = 0;
  let nextAt = pace.intro;
  let speed = 1;
  const lunges = []; // { id, dir, start, dur }
  const floaters = []; // { el, id, born }
  let push = { id: null, until: -1, amount: 0 };

  function schedule() {
    const events = step(data, battle);
    const snap = timeline(data, battle, 8);
    events.forEach((ev, i) => queue.push({ ev, snap, hold: holdFor(ev, events[i + 1]) }));
    queue.push({ ev: { type: 'pause' }, hold: battle.result ? 0 : pace.recover });
  }
  function holdFor(ev, next) {
    if (ev.type === 'turn') return pace.turn;
    if (ev.type === 'action') return ev.cutIn ? pace.ultimate : ev.action === 'attack' || ev.action === 'basic' || ev.action === 'skill' ? pace.windup : 0;
    if (ev.type === 'hit') return next?.type === 'hit' ? pace.hitGap : 0;
    if (ev.type === 'death') return pace.death;
    if (ev.type === 'wave') return pace.wave;
    return 0;
  }

  function apply(item) {
    const { ev } = item;
    if (ev.type === 'pause') return;
    shown.applied++;
    const u = ev.target && shown.units.get(ev.target);
    switch (ev.type) {
      case 'turn':
        shown.now = ev.actor;
        shown.upcoming = item.snap;
        break;
      case 'action': {
        shown.now = ev.actor;
        shown.upcoming = item.snap;
        const f = figures.get(ev.actor);
        const actor = shown.units.get(ev.actor);
        f?.play(ev.action);
        if (ev.cutIn) {
          shown.ults = shown.ults.filter((id) => id !== ev.actor);
          shown.banner = { kind: 'ultimate', text: `${actor.name} · ${ev.name}`, start: clock, until: clock + pace.ultimate };
          push = { ...push, id: ev.actor, until: clock + pace.ultimate };
        }
        if (ev.target && shown.units.get(ev.target)?.side !== actor.side && !RANGED.has(f?.kind)) {
          const from = spotOf.get(ev.actor).position;
          const to = spotOf.get(ev.target).position;
          lunges.push({ id: ev.actor, dir: to.clone().sub(from).setY(0).normalize(), start: clock, dur: (ev.cutIn ? pace.ultimate : pace.windup) + pace.recover });
        }
        break;
      }
      case 'hit':
        u.hpNow = ev.hpNow;
        u.shield = Math.max(0, u.shield - ev.absorbed);
        if (ev.hpNow > 0) figures.get(ev.target)?.play('hit');
        if (ev.absorbed) float(ev.target, `-${ev.absorbed}`, 'shield');
        if (ev.damage - ev.absorbed > 0) float(ev.target, `${ev.damage - ev.absorbed}`, u.side === 'hero' ? 'hurt' : 'dmg');
        break;
      case 'death':
        u.alive = false;
        u.hpNow = 0;
        u.shield = 0;
        shown.ults = shown.ults.filter((id) => id !== ev.target);
        figures.get(ev.target)?.play('death');
        break;
      case 'energy':
        u.energy = ev.now;
        break;
      case 'skillPoints':
        shown.skillPoints = ev.now;
        break;
      case 'shield':
        u.shield = ev.amount;
        float(ev.target, `+${ev.amount} shield`, 'shield');
        break;
      case 'buff':
        float(ev.target, `ATK +${Math.round(ev.atkUp * 100)}%`, 'buff');
        break;
      case 'debuff':
        float(ev.target, `${ev.name}: DEF -${Math.round(ev.defDown * 100)}%`, 'debuff');
        break;
      case 'advance':
        float(ev.target, 'Action advance', 'buff');
        break;
      case 'expire':
        if (ev.name === 'shield') u.shield = 0;
        break;
      case 'ultimateReady':
        if (!shown.ults.includes(ev.target)) shown.ults.push(ev.target);
        break;
      case 'wave': {
        shown.wave = ev.wave;
        shown.banner = { kind: 'wave', text: `Wave ${ev.wave + 1}`, start: clock, until: clock + pace.wave };
        for (const [id, x] of shown.units) if (x.side === 'enemy') { figures.remove(id); shown.units.delete(id); }
        const fresh = battle.units.filter((x) => ev.enemies.includes(x.id));
        fresh.forEach((x, i) => {
          remember({ ...x, hpNow: x.hp });
          spawnUnit(x, i, true);
        });
        shown.upcoming = item.snap;
        break;
      }
      case 'end':
        shown.result = ev.result;
        shown.banner = null;
        shown.now = null;
        shown.ults = [];
        shown.upcoming = [];
        break;
    }
  }

  function float(id, text, kind) {
    const el = document.createElement('div');
    el.className = `floater ${kind}`;
    el.textContent = text;
    $('floaters').append(el);
    // Several numbers on one unit at once stack upward instead of overlapping.
    const stack = floaters.filter((x) => x.id === id && clock - x.born < pace.floater / 2).length;
    floaters.push({ el, id, born: clock, stack });
  }

  // ---------- HUD ----------
  $('party-hud').hidden = false;
  const speedBtn = $('speed');
  speedBtn.disabled = false;
  speedBtn.textContent = '1x';
  speedBtn.onclick = () => {
    speed = speed === 1 ? pace.fastSpeed : 1;
    speedBtn.textContent = `${speed}x`;
  };
  $('again').onclick = () => onRestart();
  const pct = (now, max) => `${max ? Math.max(0, Math.min(100, (100 * now) / max)) : 0}%`;
  const heroIds = data.lineup;
  $('cards').innerHTML = heroIds.map((id) => {
    const h = data.heroes[id];
    return `<div class="card panel" data-id="${id}"><div class="name">${h.name}</div><div class="role">${h.role}</div><div class="bar hp"><i></i></div><div class="hp-text"></div><div class="energy"><i></i></div></div>`;
  }).join('');

  const setHtml = (el, html) => { if (el.innerHTML !== html) el.innerHTML = html; };
  function drawHud() {
    const sp = data.rules.skillPoints;
    setHtml($('party-sp'), Array.from({ length: sp.max }, (_, i) => `<i class="${i < shown.skillPoints ? 'full' : ''}"></i>`).join(''));
    const name = (id) => shown.units.get(id)?.name ?? battle.units.find((x) => x.id === id)?.name ?? id;
    const side = (id) => shown.units.get(id)?.side ?? 'enemy';
    const rows = [];
    if (shown.now) rows.push(`<div class="${side(shown.now)} now"><span>${name(shown.now)}</span><span class="av">now</span></div>`);
    for (const id of shown.ults) rows.push(`<div class="hero ult"><span>★ ${name(id)}</span><span class="av">ult</span></div>`);
    for (const t of shown.upcoming.slice(0, 8 - rows.length)) rows.push(`<div class="${t.side}"><span>${t.name}</span><span class="av">${t.at}</span></div>`);
    setHtml($('timeline'), rows.join(''));
    $('timeline').hidden = !rows.length;
    for (const card of document.querySelectorAll('#cards .card')) {
      const u = shown.units.get(card.dataset.id);
      card.classList.toggle('acting', shown.now === u.id);
      card.classList.toggle('down', !u.alive);
      card.querySelector('.hp i').style.width = pct(u.hpNow, u.hp);
      card.querySelector('.hp-text').innerHTML = `${u.hpNow}/${u.hp}${u.shield > 0 ? ` <span class="shield-chip" title="shield">+${u.shield}</span>` : ''}`;
      const full = u.alive && u.energy >= u.maxEnergy;
      card.querySelector('.energy').classList.toggle('ready', full);
      card.querySelector('.energy i').style.width = pct(u.energy, u.maxEnergy);
    }
    const banner = $('party-banner');
    banner.hidden = !shown.banner;
    if (shown.banner) {
      banner.className = `banner ${shown.banner.kind}`;
      banner.textContent = shown.banner.text;
      // Sweeps in on the game clock (so 2x and the test clock see the same thing).
      const k = Math.min(1, (clock - shown.banner.start) / 200);
      banner.style.opacity = String(k);
      banner.style.transform = `scaleX(${0.2 + 0.8 * k})`;
    }
    $('party-end').hidden = !shown.result;
    if (shown.result) $('party-result').textContent = { win: 'Victory', lose: 'Defeat', draw: 'Time up' }[shown.result];
  }
  // Enemy name plates (hp bars over their heads).
  function drawPlates() {
    const enemies = [...shown.units.values()].filter((u) => u.side === 'enemy');
    const box = $('plates');
    if (box.children.length !== enemies.length || [...box.children].some((el, i) => el.dataset.id !== enemies[i].id)) {
      box.innerHTML = enemies.map((u) => `<div class="plate" data-id="${u.id}"><span>${u.name}</span><div class="bar hp"><i></i></div></div>`).join('');
    }
    [...box.children].forEach((el, i) => {
      const u = enemies[i];
      el.querySelector('i').style.width = pct(u.hpNow, u.hp);
      el.classList.toggle('down', !u.alive);
      el.classList.toggle('acting', shown.now === u.id);
    });
  }

  // ---------- per frame ----------
  function update(dt) {
    clock += dt * 1000 * speed;
    for (;;) {
      if (!queue.length) {
        if (battle.result || clock < nextAt) break;
        schedule();
      }
      if (clock < nextAt) break;
      const item = queue.shift();
      apply(item);
      nextAt += item.hold;
    }
    if (shown.banner && clock >= shown.banner.until) shown.banner = null;
    // Lunges: out and back along a smooth hump.
    for (const l of lunges) {
      const f = figures.get(l.id);
      const t = Math.min(1, (clock - l.start) / l.dur);
      if (f) f.group.position.copy(spotOf.get(l.id).position).addScaledVector(l.dir, pace.lunge * Math.sin(Math.PI * t));
    }
    for (let i = lunges.length - 1; i >= 0; i--) if (clock - lunges[i].start >= lunges[i].dur) lunges.splice(i, 1);
    // Camera push toward an ultimate's caster eases in and out.
    const want = clock < push.until ? 1 : 0;
    push.amount += (want - push.amount) * Math.min(1, dt * speed * 6);
    if (push.amount < 0.001) push.amount = 0;
  }

  const head = new THREE.Vector3();
  function project(id, lift, camera) {
    const f = figures.get(id);
    if (!f) return null;
    head.copy(f.group.position).setY(f.height + lift).project(camera);
    return [((head.x + 1) / 2) * innerWidth, ((1 - head.y) / 2) * innerHeight];
  }
  // After the base camera is placed: push in, then lay out the HUD that follows figures.
  function frame(camera) {
    if (push.amount > 0 && push.id) {
      const f = figures.get(push.id);
      if (f) {
        const caster = f.group.position.clone().setY(f.height * 0.7);
        const look = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(8));
        camera.position.lerp(caster, pace.cameraPush * push.amount);
        camera.lookAt(look.lerp(caster, 0.5 * push.amount));
      }
    }
    drawHud();
    drawPlates();
    for (const el of $('plates').children) {
      const p = project(el.dataset.id, 0.35, camera);
      if (p) el.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -100%)`;
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const fl = floaters[i];
      const age = (clock - fl.born) / pace.floater;
      const p = project(fl.id, 0.1, camera);
      if (age >= 1 || !p) {
        fl.el.remove();
        floaters.splice(i, 1);
        continue;
      }
      fl.el.style.opacity = String(Math.min(1, 3 * (1 - age)));
      fl.el.style.transform = `translate(${p[0]}px, ${p[1] - 22 * fl.stack - 40 * age}px) translate(-50%, -100%)`;
    }
  }

  return {
    battle,
    opening,
    update,
    frame,
    get speed() { return speed; },
    dispose() {
      for (const fl of floaters) fl.el.remove();
      $('plates').innerHTML = '';
      $('party-end').hidden = $('party-banner').hidden = true;
      speedBtn.onclick = null;
    },
    // For the check and stateText: what the screen shows now.
    state: () => ({
      wave: shown.wave,
      skillPoints: shown.skillPoints,
      now: shown.now,
      ults: [...shown.ults],
      banner: shown.banner,
      result: shown.result,
      applied: shown.applied,
      speed,
      units: [...shown.units.values()].map((u) => ({ id: u.id, name: u.name, side: u.side, hpNow: u.hpNow, hp: u.hp, shield: u.shield, energy: u.energy, alive: u.alive })),
      digest: shown.result ? fightDigest(battle.events) : null,
    }),
    timeline: () => {
      const rows = [];
      if (shown.now) rows.push({ id: shown.now, now: true });
      for (const id of shown.ults) rows.push({ id, ultimate: true });
      return [...rows, ...shown.upcoming].slice(0, 8);
    },
  };
}
