// Example mode sim: pure and deterministic (no three.js, no DOM, no Math.random, no
// clock). Same data + same seed = same fight, event for event, in Node and the browser.
// The view (src/view/) only plays back the events this returns.

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

const unit = (id, u, gauge) => ({ id, name: u.name, model: u.model, hp: u.hp, hpNow: u.hp, atk: u.atk, def: u.def, speed: u.speed, av: gauge / u.speed });

export function createBattle(data, seed = 1) {
  return {
    seed,
    rng: makeRng(seed),
    units: [unit('hero', data.hero, data.rules.actionGauge), unit('foe', data.foe, data.rules.actionGauge)],
    actions: 0,
    result: null,
    events: [],
  };
}

// One action: whoever is closest to their turn attacks the other. Ties go to the hero.
export function step(data, b) {
  if (b.result) return [];
  const [hero, foe] = b.units;
  const actor = hero.av <= foe.av ? hero : foe;
  const target = actor === hero ? foe : hero;
  const elapsed = actor.av;
  for (const u of b.units) u.av -= elapsed;
  actor.av = data.rules.actionGauge / actor.speed;

  const { spread, critChance, critMult } = data.rules;
  const crit = b.rng() < critChance;
  const roll = 1 + (b.rng() * 2 - 1) * spread;
  const damage = Math.max(1, Math.round((actor.atk - target.def) * roll * (crit ? critMult : 1)));
  target.hpNow = Math.max(0, target.hpNow - damage);
  b.actions++;
  const out = [{ type: 'attack', who: actor.id, target: target.id, damage, crit, hpLeft: target.hpNow }];
  if (target.hpNow === 0) {
    b.result = actor === hero ? 'win' : 'lose';
    out.push({ type: 'down', who: target.id }, { type: 'end', result: b.result });
  } else if (b.actions >= data.rules.maxActions) {
    b.result = 'draw';
    out.push({ type: 'end', result: 'draw' });
  }
  b.events.push(...out);
  return out;
}

export function runFight(data, seed = 1) {
  const b = createBattle(data, seed);
  while (!b.result) step(data, b);
  return b;
}

// A short fingerprint of a fight, so the check can compare browser and Node in one line.
export function fightDigest(events) {
  let h = 2166136261;
  for (const ch of JSON.stringify(events)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `${events.length} events #${(h >>> 0).toString(16)}`;
}
