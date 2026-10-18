// Mode 1 sim: pure and deterministic (no three.js, no DOM, no Math.random, no clock).
// Presses arrive as an offset in milliseconds from the perfect frame (null = no press),
// so tests can script perfect, early, late and missed presses. Every rule reads its
// numbers from src/duel/data.js. Dragoon form is PLAN.md D4 (refused here for now).
//
// Flow: createDuel(), then whoever state.next names acts:
//   heroTurn(data, state, command)   command = { cmd: 'attack', presses: [5 offsets] }
//                                    | { cmd: 'guard' } | { cmd: 'item', item: name }
//                                    | { cmd: 'escape' } | { cmd: 'dragoon' }
//   rivalTurn(data, state, defense)  defense = one entry per hit of rivalIntent():
//                                    null | { kind: 'parry'|'dodge', ms } | [several presses]
// Both return the events of that action, for the view to play back.

export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A side's stats with its soloBoost applied.
export function stats(u) {
  const b = u.soloBoost;
  const out = { ...u };
  if (b) for (const k of b.stats) out[k] = u[k] * b.mult;
  return out;
}

export function createDuel(data, seed = 1) {
  const h = stats(data.hero);
  const r = stats(data.rival);
  const gauge = data.turnGauge;
  return {
    seed,
    actions: 0,
    next: 'hero',
    result: null, // 'win' | 'lose'
    hero: {
      name: h.name, model: h.model, hp: h.hp, hpNow: h.hp,
      sp: 0, spMax: data.dragoon.spPerLevel * h.dragoonLevel, dragoon: false, guarding: false,
      turns: 0, nextAt: gauge / h.spd,
      items: Object.fromEntries(data.items.map((it) => [it.name, it.count])),
    },
    rival: { name: r.name, model: r.model, hp: r.hp, hpNow: r.hp, turns: 0, nextAt: gauge / r.spd, openerUsed: false, lastGasp: 'unused' }, // unused | due | done
    menu: data.menu.map((m) => ({ id: m.id, label: m.label, enabled: !m.disabledVsBoss })),
    tally: { chains: 0, perfectChains: 0, hitsLanded: 0, dragoonReadyTurn: null, parries: 0, dodges: 0, hitsTaken: 0 },
  };
}

// ---- damage (RESEARCH.md "Monster and player damage formulas") ----

// Rhen's physical damage for the landed hits' summed percent; per-hit damage is the
// step between running totals, so the hits always add up to the whole.
export function heroPhysical(data, percent) {
  const h = stats(data.hero);
  const r = stats(data.rival);
  return Math.floor(((h.level + 5) * h.atk * (percent / 100) * data.addition.damageMult * 5) / r.def);
}
// Vael's physical damage for a fraction of a move with this multiplier.
export function rivalPhysical(data, mult, fraction = 1) {
  const h = stats(data.hero);
  const r = stats(data.rival);
  return Math.floor(((r.atk * r.atk * 5) / h.def) * mult * fraction);
}

// ---- turn order ----

function advance(data, state, who) {
  const side = state[who];
  const spd = stats(who === 'hero' ? data.hero : data.rival).spd;
  side.nextAt += data.turnGauge / spd;
  state.actions += 1;
  pickNext(state);
}
function pickNext(state) {
  if (state.result) state.next = 'over';
  else if (state.rival.lastGasp === 'due') state.next = 'rival'; // out of turn
  else state.next = state.hero.nextAt <= state.rival.nextAt ? 'hero' : 'rival';
}

function gainSp(data, state, amount, events, why) {
  const h = state.hero;
  const before = h.sp;
  h.sp = Math.min(h.spMax, h.sp + amount);
  if (h.sp !== before) events.push({ type: 'sp', gain: h.sp - before, sp: h.sp, why });
  if (state.tally.dragoonReadyTurn === null && h.sp >= data.dragoon.spPerLevel) {
    // The Rhen turn on which Dragoon first lights up (his turn count moves on after he acts).
    state.tally.dragoonReadyTurn = h.turns + (state.next === 'hero' ? 2 : 1);
    events.push({ type: 'dragoonReady', onHeroTurn: state.tally.dragoonReadyTurn });
  }
}

// Damage to Vael. At 0 HP for the first time he doesn't fall: his last gasp is due.
function hurtRival(data, state, damage, events, source) {
  const r = state.rival;
  r.hpNow = Math.max(0, r.hpNow - damage);
  events.push({ type: 'hit', from: 'hero', to: 'rival', source, damage, hpAfter: r.hpNow });
  if (r.hpNow === 0 && r.lastGasp === 'unused') {
    r.lastGasp = data.rival.signature.lastGasp ? 'due' : 'done';
    if (r.lastGasp === 'due') events.push({ type: 'lastGaspDue' });
    else end(state, 'win', events);
  }
}
function hurtHero(state, damage, events, source) {
  const h = state.hero;
  h.hpNow = Math.max(0, h.hpNow - damage);
  state.tally.hitsTaken += 1;
  events.push({ type: 'hit', from: 'rival', to: 'hero', source, damage, hpAfter: h.hpNow, guarded: h.guarding });
  if (h.hpNow === 0) end(state, 'lose', events);
}
function end(state, result, events) {
  if (state.result) return;
  state.result = result;
  events.push({ type: 'fall', who: result === 'win' ? 'rival' : 'hero' });
  events.push({ type: 'end', result });
}

// ---- Rhen ----

// One addition press against its window: success, early, late, missed or wrongButton.
export function judgePress(data, index, press) {
  const a = data.addition;
  const [lo, hi] = a.windowsTicks[index];
  const half = ((hi - lo + 1) * data.tickMs) / 2;
  const perfectAt = ((lo + hi + 1) / 2) * data.tickMs; // ms from the overlay starting
  const wantCounter = a.counterable && index === a.counterAtPress - 1;
  if (press === null || press === undefined) return { verdict: 'missed', ms: null, wantCounter };
  const counter = typeof press === 'object';
  const ms = counter ? press.ms : press;
  if (perfectAt + ms < a.ignoreBeforeTick * data.tickMs) return { verdict: 'missed', ms, ignored: true, wantCounter };
  if (ms < -half) return { verdict: 'early', ms, wantCounter };
  if (counter !== wantCounter) return { verdict: 'wrongButton', ms, wantCounter };
  if (ms > half) return { verdict: 'late', ms, wantCounter };
  return { verdict: 'success', ms, wantCounter };
}

export function heroTurn(data, state, command) {
  if (state.next !== 'hero') throw new Error(`not Rhen's turn (next: ${state.next})`);
  const h = state.hero;
  const events = [{ type: 'turn', who: 'hero', turn: h.turns + 1 }];
  h.guarding = false;
  const cmd = command?.cmd;

  if (cmd === 'escape') return [...events, { type: 'refused', cmd, why: "can't escape from a boss" }];
  if (cmd === 'dragoon') return [...events, { type: 'refused', cmd, why: 'Dragoon form comes in PLAN.md D4' }];
  if (cmd === 'item') {
    const item = data.items.find((it) => it.name === command.item);
    if (!item || !h.items[item.name]) return [...events, { type: 'refused', cmd, why: `no ${command.item} left` }];
    h.items[item.name] -= 1;
    const ev = { type: 'item', item: item.name, left: h.items[item.name] };
    if (item.healPercent) {
      const before = h.hpNow;
      h.hpNow = Math.min(h.hp, h.hpNow + Math.floor((h.hp * item.healPercent) / 100));
      ev.heal = h.hpNow - before;
    }
    events.push(ev);
    if (item.sp) gainSp(data, state, item.sp, events, 'item');
  } else if (cmd === 'guard') {
    h.guarding = true;
    const before = h.hpNow;
    h.hpNow = Math.min(h.hp, h.hpNow + Math.floor((h.hp * data.guard.healPercent) / 100));
    events.push({ type: 'guard', heal: h.hpNow - before });
  } else if (cmd === 'attack') {
    attack(data, state, command.presses ?? [], events);
  } else {
    throw new Error(`unknown command ${cmd}`);
  }
  h.turns += 1;
  advance(data, state, 'hero');
  return events;
}

// Frenzy Chain: the first hit always lands; each successful press adds the next hit;
// a failed press (or a failed counter) ends the chain.
function attack(data, state, presses, events) {
  const a = data.addition;
  const sp = Math.round(a.spPerHit * a.spMult);
  events.push({ type: 'addition', name: a.name });
  state.tally.chains += 1;
  let percent = 0;
  let landed = 0;
  const land = () => {
    const before = heroPhysical(data, percent);
    percent += a.hitPercent[landed];
    landed += 1;
    state.tally.hitsLanded += 1;
    events.push({ type: 'additionHit', hit: landed, percent: a.hitPercent[landed - 1] });
    hurtRival(data, state, heroPhysical(data, percent) - before, events, a.name);
    gainSp(data, state, sp, events, 'hit');
  };
  land();
  for (let i = 0; i < a.windowsTicks.length && state.rival.hpNow > 0 && !state.result; i++) {
    const j = judgePress(data, i, presses[i]);
    events.push({ type: 'press', press: i + 1, ...j });
    if (j.wantCounter) {
      events.push({ type: 'counter', press: i + 1, blocked: j.verdict === 'success' });
      if (j.verdict !== 'success') hurtHero(state, rivalPhysical(data, data.rival.basic.mult), events, 'counter');
    }
    if (j.verdict !== 'success') break;
    land();
  }
  if (landed === a.hitPercent.length) state.tally.perfectChains += 1;
  events.push({ type: 'chainEnd', hits: landed, perfect: landed === a.hitPercent.length });
}

// ---- Vael ----

// What Vael does next: Four Seals as his opener and his last gasp, else Rising Cut.
export function rivalIntent(data, state) {
  const r = state.rival;
  const signature = r.lastGasp === 'due' || (data.rival.signature.opener && !r.openerUsed);
  const move = signature ? data.rival.signature : data.rival.basic;
  const hits = data.defense.hits[signature ? 'signature' : 'basic'];
  return { kind: signature ? 'signature' : 'basic', name: move.name, mult: move.mult, hits, gapMs: signature ? data.defense.signatureHitGapMs : 0, lastGasp: r.lastGasp === 'due' };
}

// One hit's defence. Presses are ms from that hit's contact; any accepted press starts a
// lockout that ignores presses for lockoutMs; the first accepted press decides the hit.
function judgeDefense(data, entry, contactMs, lock) {
  const d = data.defense;
  const presses = (entry === null || entry === undefined ? [] : [entry].flat()).filter(Boolean);
  const out = { verdict: 'none', presses: [] };
  let decided = false;
  for (const p of presses) {
    const at = contactMs + p.ms;
    if (at < lock.until) { out.presses.push({ ...p, result: 'locked' }); continue; }
    lock.until = at + d.lockoutMs;
    if (decided) { out.presses.push({ ...p, result: 'wasted' }); continue; }
    decided = true;
    const half = (p.kind === 'parry' ? d.parryWindowMs : d.dodgeWindowMs) / 2;
    const result = p.ms < -half ? 'early' : p.ms > half ? 'late' : p.kind === 'parry' ? 'parried' : 'dodged';
    out.presses.push({ ...p, result });
    out.verdict = result;
    out.kind = p.kind;
    out.ms = p.ms;
  }
  return out;
}

export function rivalTurn(data, state, defense = []) {
  if (state.next !== 'rival') throw new Error(`not Vael's turn (next: ${state.next})`);
  const r = state.rival;
  const h = state.hero;
  const intent = rivalIntent(data, state);
  const events = [{ type: 'turn', who: 'rival', turn: r.turns + 1 }, { type: 'rivalMove', ...intent }];
  if (intent.kind === 'signature' && !intent.lastGasp) r.openerUsed = true;

  const lock = { until: -Infinity };
  let parried = 0;
  for (let k = 0; k < intent.hits && !state.result; k++) {
    const j = judgeDefense(data, defense[k], k * intent.gapMs, lock);
    events.push({ type: 'defend', hit: k + 1, ...j });
    if (j.verdict === 'parried') {
      parried += 1;
      state.tally.parries += 1;
      gainSp(data, state, data.defense.spPerParry, events, 'parry');
      continue;
    }
    if (j.verdict === 'dodged') { state.tally.dodges += 1; continue; }
    const share = rivalPhysical(data, intent.mult, (k + 1) / intent.hits) - rivalPhysical(data, intent.mult, k / intent.hits);
    hurtHero(state, h.guarding ? Math.floor(share * data.guard.damageTaken) : share, events, intent.name);
  }
  // Riposte: parrying every hit of the attack strikes back (not after the last gasp).
  if (parried === intent.hits && !state.result && !intent.lastGasp) {
    const c = data.defense.counter;
    events.push({ type: 'riposte', name: c.name });
    hurtRival(data, state, heroPhysical(data, c.percent), events, c.name);
  }
  if (intent.lastGasp) {
    r.lastGasp = 'done';
    end(state, h.hpNow > 0 ? 'win' : 'lose', events);
  }
  r.turns += 1;
  if (intent.lastGasp) { state.actions += 1; pickNext(state); } else advance(data, state, 'rival');
  return events;
}

// ---- simulated players (for npm run sim and the check) ----

function bell(rng) {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}
function pressMs(rng, p) {
  if (rng() * 100 < p.missPercent) return null;
  return Math.round(p.biasMs + p.sdMs * bell(rng));
}
export function botPresses(data, rng, p) {
  return data.addition.windowsTicks.map(() => pressMs(rng, p));
}
export function botDefense(data, rng, p, hits) {
  return Array.from({ length: hits }, () => {
    const ms = pressMs(rng, p);
    if (ms === null) return null;
    if (!p.mash) return { kind: p.defend, ms };
    return Array.from({ length: p.mash.presses }, (_, i) => ({ kind: p.defend, ms: ms + i * p.mash.gapMs }));
  });
}

// A whole fight with a simulated player. `profile` is a key of data.accuracy or an object.
export function playFight(data, seed, profile, { maxActions = 2000, keepEvents = false } = {}) {
  const p = typeof profile === 'string' ? data.accuracy[profile] : profile;
  const rng = makeRng(seed * 7919 + 17);
  const state = createDuel(data, seed);
  const events = [];
  while (state.next !== 'over' && state.actions < maxActions) {
    let ev;
    if (state.next === 'hero') {
      const h = state.hero;
      const heal = data.items.find((it) => it.healPercent);
      if (heal && h.items[heal.name] > 0 && h.hpNow * 100 < h.hp * data.bot.healBelowPercent) ev = heroTurn(data, state, { cmd: 'item', item: heal.name });
      else ev = heroTurn(data, state, { cmd: 'attack', presses: botPresses(data, rng, p) });
    } else {
      ev = rivalTurn(data, state, botDefense(data, rng, p, rivalIntent(data, state).hits));
    }
    if (keepEvents) events.push(...ev);
  }
  return { result: state.result ?? 'timeout', heroTurns: state.hero.turns, rivalTurns: state.rival.turns, actions: state.actions, heroHp: state.hero.hpNow, ...state.tally, events: keepEvents ? events : undefined };
}

// How many perfect Frenzy Chains fell Vael when Rhen only attacks and never defends
// (no Ripostes), for the target perfectChainsToWin. Also returns Vael's HP after one fewer.
export function perfectChainsToFall(data) {
  const state = createDuel(data, 1);
  const perfect = data.addition.windowsTicks.map(() => 0);
  const hpAfter = [];
  while (state.next !== 'over' && state.actions < 2000) {
    if (state.next === 'hero') {
      heroTurn(data, state, { cmd: 'attack', presses: perfect });
      hpAfter.push(state.rival.hpNow);
    } else rivalTurn(data, state, []);
  }
  return { chains: state.tally.chains, result: state.result, hpAfter };
}
