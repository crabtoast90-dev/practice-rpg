// Mode 2 sim: pure and deterministic (no three.js, no DOM, no Math.random, no clock).
// The whole party fight: action value timeline, shared skill points, energy,
// ultimates that cut in, each hero's kit from src/party/data.js, enemy attacks on a
// seeded random hero, two waves, win / lose. Auto-battle reads each hero's named
// rules (data.heroes[id].auto). Every step appends events the view can play back.

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

// A unit's distance to its next turn, in action value: gauge / speed.
export const actionValue = (data, speed) => data.rules.actionGauge / speed;

function spawnEnemies(data, wave) {
  return data.waves[wave].map((kind, i) => {
    const e = data.enemies[kind];
    return { id: `${kind}#${wave === 0 ? i : `w${wave + 1}-${i}`}`, kind, side: 'enemy', ...pick(e), hits: e.hits, aoe: !!e.aoe, hpNow: e.hp, av: actionValue(data, e.speed), debuffs: [] };
  });
}
function pick(u) {
  return { name: u.name, model: u.model, hp: u.hp, atk: u.atk, def: u.def, speed: u.speed };
}

export function createParty(data, seed = 1, wave = 0) {
  const heroes = data.lineup.map((id) => {
    const h = data.heroes[id];
    return { id, side: 'hero', ...pick(h), hpNow: h.hp, av: actionValue(data, h.speed), energy: 0, maxEnergy: h.maxEnergy, buffs: [], shield: null };
  });
  return {
    seed, wave,
    skillPoints: data.rules.skillPoints.start,
    units: [...heroes, ...spawnEnemies(data, wave)],
    rng: makeRng(seed),
    elapsed: 0, // action value passed since the fight began
    turns: 0, // turns taken by anyone (ultimates are extra actions, not turns)
    ultQueue: [], // heroes whose ultimate is ready and waiting to cut in, first-ready first
    auto: true, // auto-battle on: heroes follow their rules and fire ultimates when full
    actions: 0, // steps resolved so far (turns and ultimates)
    log: [], // every player command, stamped with the step it came before (replay() reruns it)
    result: null, // 'win' | 'lose' | 'draw'
    events: [],
    stats: Object.fromEntries(data.lineup.map((id) => [id, { turns: 0, damage: 0, ultimates: 0, wantedSkill: 0, starved: 0 }])),
  };
}

// The next n turns from the battle's current gauges, nobody acting in between
// (what the timeline on screen shows). Ties go to heroes, then lineup order.
export function timeline(data, battle, n = 8) {
  const g = battle.units.filter((u) => u.hpNow > 0).map((u, i) => ({ id: u.id, name: u.name, side: u.side, av: u.av, speed: u.speed, i }));
  const out = [];
  let elapsed = 0;
  while (out.length < n && g.length) {
    g.sort(byTurnOrder);
    const next = g[0];
    const step = next.av;
    elapsed += step;
    for (const u of g) u.av -= step;
    out.push({ id: next.id, name: next.name, side: next.side, at: Math.round(elapsed) });
    next.av = actionValue(data, next.speed);
  }
  return out;
}
const byTurnOrder = (a, b) => a.av - b.av || (a.side === b.side ? a.i - b.i : a.side === 'hero' ? -1 : 1);

const alive = (battle, side) => battle.units.filter((u) => u.side === side && u.hpNow > 0);
const find = (battle, id) => battle.units.find((u) => u.id === id);
const r = (x) => Math.round(x);

// ---------- auto-battle rules ----------
// Each rule reads as plain words; parseRule turns one into { action, target, test }.
// target(battle, hero) picks who it hits (or null if nobody fits); test says whether it applies.
const RULES = [
  [/^ultimate when ready$/, () => ({ action: 'ultimate' })],
  [/^basic$/, () => ({ action: 'basic' })],
  [/^skill$/, () => ({ action: 'skill' })],
  [/^skill if skill points >= (\d+)$/, (m) => ({ action: 'skill', minPoints: +m[1] })],
  [/^skill on an enemy without (.+)$/, (m) => ({ action: 'skill', target: (data, b) => autoTarget(data, alive(b, 'enemy').filter((e) => !e.debuffs.some((d) => d.name === m[1]))) })],
  [/^skill on (.+)$/, (m) => ({ action: 'skill', target: (data, b) => alive(b, 'hero').find((h) => h.name === m[1]) || null })],
  [/^skill if anyone has no shield$/, () => ({ action: 'skill', test: (b) => alive(b, 'hero').some((h) => !h.shield) })],
  [/^skill if anyone below (\d+)% HP$/, (m) => ({ action: 'skill', test: (b) => alive(b, 'hero').some((h) => h.hpNow < (h.hp * m[1]) / 100) })],
];
export function parseRule(text) {
  for (const [re, make] of RULES) {
    const m = text.match(re);
    if (m) return { text, ...make(m) };
  }
  throw new Error(`Party auto rule not understood: "${text}"`);
}

function autoTarget(data, enemies) {
  if (!enemies.length) return null;
  if (data.rules.autoTarget === 'leftmost') return enemies[0];
  return enemies.reduce((a, b) => (b.hpNow < a.hpNow ? b : a));
}
function defaultTarget(data, battle, hero, move) {
  if (move.target === 'ally') return hero;
  if (move.target === 'party' || move.target === 'all') return null;
  return autoTarget(data, alive(battle, 'enemy'));
}

// What the hero's auto rules pick on its turn: { action, target }, counting skill-point
// starvation (a skill rule that fits except for the skill points it asks for).
export function chooseAuto(data, battle, hero, record = true) {
  const h = data.heroes[hero.id];
  const sp = data.rules.skillPoints;
  let wanted = false; // counted once per turn, however many skill rules fit
  const pick = (choice) => {
    if (record && wanted) {
      battle.stats[hero.id].wantedSkill++;
      if (choice.action !== 'skill') battle.stats[hero.id].starved++;
    }
    return choice;
  };
  for (const text of h.auto) {
    const rule = parseRule(text);
    if (rule.action === 'ultimate') continue; // ultimates cut in on their own (queueUltimates)
    if (rule.test && !rule.test(battle)) continue;
    const move = h[rule.action];
    const target = rule.target ? rule.target(data, battle) : defaultTarget(data, battle, hero, move);
    if (rule.target && !target) continue;
    if (rule.action === 'skill') {
      wanted = true;
      if (battle.skillPoints < Math.max(sp.skillCost, rule.minPoints ?? 0)) continue;
    }
    return pick({ action: rule.action, target: target?.id ?? null, rule: text });
  }
  return pick({ action: 'basic', target: defaultTarget(data, battle, hero, h.basic)?.id ?? null, rule: '(fallback) basic' });
}
const wantsUltimate = (data, id) => data.heroes[id].auto.some((t) => parseRule(t).action === 'ultimate');

// ---------- the fight ----------

// Resolve one action: a queued ultimate if any, else the next turn on the timeline.
// command (optional, for manual play later) = { action, target } for the hero whose turn it is.
// Returns null without acting when auto is off and a hero is waiting for a command.
export function step(data, battle, command) {
  if (battle.result) return [];
  const waiting = waitingFor(battle);
  if (waiting && !command) return null;
  if (command) {
    if (!waiting || !validTurn(data, battle, waiting, command)) throw new Error(`party: turn command not valid now: ${JSON.stringify(command)}`);
    command = { action: command.action, target: command.target ?? null, rule: 'manual' };
    battle.log.push({ at: battle.actions, type: 'turn', action: command.action, target: command.target });
  }
  battle.actions++;
  const from = battle.events.length;
  const emit = (e) => battle.events.push({ at: r(battle.elapsed), ...e });

  while (battle.ultQueue.length) {
    const hero = find(battle, battle.ultQueue.shift());
    if (hero.hpNow <= 0 || hero.energy < hero.maxEnergy) continue;
    act(data, battle, hero, { action: 'ultimate', rule: 'ultimate when ready' }, emit, true);
    afterAction(data, battle, emit);
    return battle.events.slice(from);
  }

  const actor = nextActor(battle);
  const passed = actor.av;
  battle.elapsed += passed;
  for (const u of battle.units) if (u.hpNow > 0) u.av = Math.max(0, u.av - passed);
  actor.av = actionValue(data, actor.speed);
  battle.turns++;
  emit({ type: 'turn', actor: actor.id, side: actor.side, turn: battle.turns });

  if (actor.side === 'hero') {
    battle.stats[actor.id].turns++;
    act(data, battle, actor, command ?? chooseAuto(data, battle, actor), emit, false);
    tickDown(actor, 'buffs', emit);
    if (actor.shield && --actor.shield.turns <= 0) {
      actor.shield = null;
      emit({ type: 'expire', target: actor.id, name: 'shield' });
    }
  } else {
    enemyTurn(data, battle, actor, emit);
    tickDown(actor, 'debuffs', emit);
  }
  afterAction(data, battle, emit);
  if (!battle.result && battle.turns + countUlts(battle) >= data.rules.maxActions) end(battle, 'draw', emit);
  return battle.events.slice(from);
}
const countUlts = (battle) => Object.values(battle.stats).reduce((s, x) => s + x.ultimates, 0);

function tickDown(unit, key, emit) {
  for (const s of unit[key]) s.turns--;
  for (const s of unit[key].filter((x) => x.turns <= 0)) emit({ type: 'expire', target: unit.id, name: s.name });
  unit[key] = unit[key].filter((x) => x.turns > 0);
}

function act(data, battle, hero, cmd, emit, cutIn) {
  const kit = data.heroes[hero.id];
  const move = kit[cmd.action];
  const sp = data.rules.skillPoints;
  const en = data.rules.energy;
  let target = cmd.target ? find(battle, cmd.target) : null;
  const aimsAtEnemy = move.target === 'single' || move.target === 'blast';
  if (aimsAtEnemy && !(target?.side === 'enemy' && target.hpNow > 0)) target = autoTarget(data, alive(battle, 'enemy'));
  emit({ type: 'action', actor: hero.id, action: cmd.action, name: move.name, target: target?.id ?? null, cutIn, rule: cmd.rule ?? null });

  if (cmd.action === 'basic') changeSp(data, battle, sp.basicGain, emit);
  if (cmd.action === 'skill') changeSp(data, battle, -sp.skillCost, emit);
  if (cmd.action === 'ultimate') {
    hero.energy = 0;
    battle.stats[hero.id].ultimates++;
  }

  // Damage: single (the target), blast (target + its living neighbours), all.
  if (move.atk) {
    const enemies = alive(battle, 'enemy');
    let hits;
    if (move.target === 'all') hits = enemies.map((e) => [e, move.atk]);
    else {
      const i = enemies.indexOf(target);
      hits = [[target, move.atk]];
      if (move.target === 'blast') for (const n of [enemies[i - 1], enemies[i + 1]]) if (n) hits.push([n, move.adjacent]);
    }
    for (const [e, mult] of hits) {
      const dmg = r(mult * attackOf(hero) * defMultiplier(data, true, shredOf(e)));
      dealDamage(data, battle, hero, e, dmg, emit);
      if (move.debuff && e.hpNow > 0) applyDebuff(e, move, emit); // lands after the hit, softens the next ones
    }
  }
  // Buffs and shields.
  if (move.atkUp) for (const a of move.target === 'party' ? alive(battle, 'hero') : [target ?? hero]) applyBuff(a, move, emit);
  if (move.actionAdvance && target) {
    const before = target.av;
    target.av = Math.max(0, target.av - (data.rules.actionGauge * move.actionAdvance) / target.speed);
    emit({ type: 'advance', target: target.id, by: r(before - target.av), nextAt: r(battle.elapsed + target.av) });
  }
  if (move.shieldDef) {
    const amount = r(move.shieldDef * hero.def + move.shieldFlat);
    for (const a of alive(battle, 'hero')) {
      a.shield = { amount: Math.max(amount, a.shield?.amount ?? 0), turns: move.turns };
      emit({ type: 'shield', target: a.id, amount: a.shield.amount, turns: move.turns });
    }
  }

  const gain = cmd.action === 'basic' ? en.basic : cmd.action === 'skill' ? en.skill : en.ultimate;
  addEnergy(hero, gain, emit);
}

const attackOf = (hero) => hero.atk * (1 + hero.buffs.reduce((s, b) => s + (b.atkUp || 0), 0));
const shredOf = (enemy) => Math.min(1, enemy.debuffs.reduce((s, d) => s + (d.defDown || 0), 0));
// RESEARCH.md: (L + 20) / ((enemy L + 20) x (1 - DEF shred) + L + 20).
function defMultiplier(data, heroAttacking, shred = 0) {
  const { level, enemyLevel } = data.rules.defenseConstant;
  const [att, def] = heroAttacking ? [level, enemyLevel] : [enemyLevel, level];
  return (att + 20) / ((def + 20) * (1 - shred) + att + 20);
}

function applyBuff(unit, move, emit) {
  unit.buffs = unit.buffs.filter((b) => b.name !== move.name); // same skill refreshes, different skills stack
  unit.buffs.push({ name: move.name, atkUp: move.atkUp, turns: move.turns });
  emit({ type: 'buff', target: unit.id, name: move.name, atkUp: move.atkUp, turns: move.turns });
}
function applyDebuff(enemy, move, emit) {
  enemy.debuffs = enemy.debuffs.filter((d) => d.name !== move.name);
  enemy.debuffs.push({ name: move.name, ...move.debuff });
  emit({ type: 'debuff', target: enemy.id, name: move.name, defDown: move.debuff.defDown, turns: move.debuff.turns });
}

function changeSp(data, battle, delta, emit) {
  battle.skillPoints = Math.max(0, Math.min(data.rules.skillPoints.max, battle.skillPoints + delta));
  emit({ type: 'skillPoints', change: delta, now: battle.skillPoints });
}

function addEnergy(hero, amount, emit) {
  if (hero.hpNow <= 0) return;
  const before = hero.energy;
  hero.energy = Math.min(hero.maxEnergy, hero.energy + amount);
  if (hero.energy !== before) emit({ type: 'energy', target: hero.id, now: hero.energy, max: hero.maxEnergy });
}

function dealDamage(data, battle, source, target, dmg, emit) {
  let absorbed = 0;
  if (target.shield) {
    absorbed = Math.min(target.shield.amount, dmg);
    target.shield.amount -= absorbed;
    if (target.shield.amount <= 0) target.shield = null;
  }
  const taken = Math.min(target.hpNow, dmg - absorbed);
  target.hpNow -= taken;
  if (source.side === 'hero') battle.stats[source.id].damage += taken;
  emit({ type: 'hit', source: source.id, target: target.id, damage: dmg, absorbed, hpNow: target.hpNow });
  if (target.side === 'hero') addEnergy(target, data.rules.energy.perHitTaken, emit);
  if (target.hpNow <= 0) {
    emit({ type: 'death', target: target.id, side: target.side });
    if (target.side === 'hero') {
      target.buffs = [];
      target.shield = null;
      battle.ultQueue = battle.ultQueue.filter((id) => id !== target.id);
    } else if (source.side === 'hero') addEnergy(source, data.rules.energy.perKill, emit);
  }
}

function enemyTurn(data, battle, enemy, emit) {
  emit({ type: 'action', actor: enemy.id, action: 'attack', name: data.enemies[enemy.kind].name, target: null, cutIn: false, rule: null });
  for (let i = 0; i < enemy.hits; i++) {
    const heroes = alive(battle, 'hero');
    if (!heroes.length) return;
    const targets = enemy.aoe ? heroes : [heroes[Math.floor(battle.rng() * heroes.length)]];
    const dmg = r(data.rules.enemyHit * enemy.atk * defMultiplier(data, false));
    for (const h of targets) dealDamage(data, battle, enemy, h, dmg, emit);
  }
}

// After any action: next wave / win / lose, then queue ultimates that just filled.
function afterAction(data, battle, emit) {
  if (!alive(battle, 'hero').length) return end(battle, 'lose', emit);
  if (!alive(battle, 'enemy').length) {
    if (battle.wave + 1 >= data.waves.length) return end(battle, 'win', emit);
    battle.wave++;
    battle.units = [...battle.units.filter((u) => u.side === 'hero'), ...spawnEnemies(data, battle.wave)];
    emit({ type: 'wave', wave: battle.wave, enemies: alive(battle, 'enemy').map((e) => e.id) });
  }
  if (battle.auto) queueAutoUltimates(data, battle, emit);
}
function queueAutoUltimates(data, battle, emit) {
  for (const h of alive(battle, 'hero')) {
    if (h.energy >= h.maxEnergy && !battle.ultQueue.includes(h.id) && wantsUltimate(data, h.id)) {
      battle.ultQueue.push(h.id);
      emit({ type: 'ultimateReady', target: h.id });
    }
  }
}

// ---------- player commands (manual play) ----------
// The same commands auto uses: a turn is { action: 'basic' | 'skill', target }, an
// ultimate cuts in after the current action. Every accepted command goes in battle.log.

const nextActor = (battle) => battle.units.map((u, i) => ({ u, i, av: u.av, side: u.side })).filter((x) => x.u.hpNow > 0).sort(byTurnOrder)[0]?.u;

// The hero whose turn needs a command (auto off, nothing cutting in), else null.
export function waitingFor(battle) {
  if (battle.result || battle.auto || battle.ultQueue.length) return null;
  const u = nextActor(battle);
  return u?.side === 'hero' ? u.id : null;
}

// What the waiting hero may do: each move, whether it is allowed, and who it can aim at.
export function turnOptions(data, battle, heroId) {
  const kit = data.heroes[heroId];
  return ['basic', 'skill'].map((action) => {
    const move = kit[action];
    const pool = move.target === 'ally' ? alive(battle, 'hero') : move.target === 'single' || move.target === 'blast' ? alive(battle, 'enemy') : [];
    const enabled = action === 'basic' || battle.skillPoints >= data.rules.skillPoints.skillCost;
    return { action, name: move.name, target: move.target, enabled, targets: pool.map((u) => u.id) };
  });
}
function validTurn(data, battle, heroId, cmd) {
  const opt = turnOptions(data, battle, heroId).find((o) => o.action === cmd.action);
  return !!opt && opt.enabled && (!opt.targets.length || cmd.target == null || opt.targets.includes(cmd.target));
}

// Commands between steps: { type: 'auto', on } or { type: 'ultimate', hero }.
// Returns the events they cause, or null if refused (e.g. energy not full).
export function command(data, battle, cmd) {
  if (battle.result) return null;
  const from = battle.events.length;
  const emit = (e) => battle.events.push({ at: r(battle.elapsed), ...e });
  if (cmd.type === 'auto') {
    battle.auto = !!cmd.on;
    battle.log.push({ at: battle.actions, type: 'auto', on: battle.auto });
    emit({ type: 'auto', on: battle.auto });
    if (battle.auto) queueAutoUltimates(data, battle, emit);
  } else if (cmd.type === 'ultimate') {
    const h = find(battle, cmd.hero);
    if (!h || h.side !== 'hero' || h.hpNow <= 0 || h.energy < h.maxEnergy || battle.ultQueue.includes(h.id)) return null;
    battle.ultQueue.push(h.id);
    battle.log.push({ at: battle.actions, type: 'ultimate', hero: h.id });
    emit({ type: 'ultimateReady', target: h.id, manual: true });
  } else return null;
  return battle.events.slice(from);
}

// Rerun a fight from its seed and command log (how Node checks a browser fight).
export function replay(data, seed, log) {
  const battle = createParty(data, seed, 0);
  let i = 0;
  while (!battle.result) {
    while (i < log.length && log[i].at === battle.actions && log[i].type !== 'turn') {
      const c = log[i++];
      command(data, battle, c.type === 'auto' ? { type: 'auto', on: c.on } : { type: 'ultimate', hero: c.hero });
    }
    const turn = i < log.length && log[i].at === battle.actions && log[i].type === 'turn' ? log[i++] : null;
    if (step(data, battle, turn && { action: turn.action, target: turn.target }) === null) break; // waiting, log ran out
  }
  return battle;
}
function end(battle, result, emit) {
  battle.result = result;
  battle.ultQueue = [];
  emit({ type: 'end', result, turns: battle.turns, elapsed: r(battle.elapsed) });
}

// A whole auto fight from a seed.
export function runFight(data, seed = 1) {
  const battle = createParty(data, seed, 0);
  while (!battle.result) step(data, battle);
  return battle;
}

// A short fingerprint of a fight's events, so the browser and Node can be compared.
export function fightDigest(events) {
  const text = JSON.stringify(events);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return `${events.length}:${h.toString(16)}`;
}
