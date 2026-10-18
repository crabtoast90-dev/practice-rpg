// Mode 2 sim: pure and deterministic (no three.js, no DOM, no Math.random).
// Tonight it only sets the battle up and works out the opening turn order; the
// combat loop is PLAN.md item P1.

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

export function createParty(data, seed = 1, wave = 0) {
  const heroes = data.lineup.map((id) => ({ id, side: 'hero', ...pick(data.heroes[id]), energy: 0 }));
  const enemies = data.waves[wave].map((id, i) => ({ id: `${id}#${i}`, kind: id, side: 'enemy', ...pick(data.enemies[id]) }));
  const units = [...heroes, ...enemies].map((u) => ({ ...u, hpNow: u.hp, av: actionValue(data, u.speed) }));
  return { seed, wave, skillPoints: data.rules.skillPoints.start, units, rng: makeRng(seed) };
}
function pick(u) {
  return { name: u.name, model: u.model, hp: u.hp, atk: u.atk, def: u.def, speed: u.speed };
}

// The next n turns from the battle's current gauges, nobody acting in between
// (what the timeline on screen shows). Ties go to heroes, then lineup order.
export function timeline(data, battle, n = 8) {
  const g = battle.units.filter((u) => u.hpNow > 0).map((u, i) => ({ id: u.id, name: u.name, side: u.side, av: u.av, speed: u.speed, i }));
  const out = [];
  let elapsed = 0;
  while (out.length < n) {
    g.sort((a, b) => a.av - b.av || (a.side === b.side ? a.i - b.i : a.side === 'hero' ? -1 : 1));
    const next = g[0];
    const step = next.av;
    elapsed += step;
    for (const u of g) u.av -= step;
    out.push({ id: next.id, name: next.name, side: next.side, at: Math.round(elapsed) });
    next.av = actionValue(data, next.speed);
  }
  return out;
}
