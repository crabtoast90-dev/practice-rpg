// Mode 1 sim: pure and deterministic (no three.js, no DOM, no Math.random).
// Presses arrive as an offset in milliseconds from the perfect frame (null = no press),
// so tests can script perfect, early, late and missed presses. Tonight it only sets
// the duel up; the rules are PLAN.md items D1-D5, after the RESEARCH.md check.

export function createDuel(data, seed = 1) {
  const side = (u) => ({ name: u.name, model: u.model, hp: u.hp, hpNow: u.hp });
  return {
    seed,
    turn: 0,
    hero: { ...side(data.hero), sp: 0, dragoon: false },
    rival: side(data.rival),
    menu: data.menu.map((m) => ({ id: m.id, label: m.label, enabled: !m.disabledVsBoss })),
  };
}
