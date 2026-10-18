// Mode 1 sim: pure and deterministic (no three.js, no DOM, no Math.random).
// Presses arrive as an offset in milliseconds from the perfect frame (null = no press),
// so tests can script perfect, early, late and missed presses. Tonight it only sets
// the duel up; the rules are PLAN.md items D1-D5, after the RESEARCH.md check.

// A side's stats with its soloBoost applied.
export function stats(u) {
  const b = u.soloBoost;
  const out = { ...u };
  if (b) for (const k of b.stats) out[k] = u[k] * b.mult;
  return out;
}

export function createDuel(data, seed = 1) {
  const side = (raw) => { const u = stats(raw); return { name: u.name, model: u.model, hp: u.hp, hpNow: u.hp }; };
  return {
    seed,
    turn: 0,
    hero: { ...side(data.hero), sp: 0, dragoon: false },
    rival: side(data.rival),
    menu: data.menu.map((m) => ({ id: m.id, label: m.label, enabled: !m.disabledVsBoss })),
  };
}
