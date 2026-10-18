// Mode 1 (Duel) numbers. Every number the duel uses lives here; ask for changes by
// name. Values come from RESEARCH.md (Mode 1) and stay "awaiting check" until the
// user has checked RESEARCH.md. On-screen names are original; the source names are
// only in comments and the docs.

export const DUEL = {
  status: 'awaiting RESEARCH.md check', // Mode 1 tuning waits for the user (PLAN.md)

  hero: {
    name: 'Rhen', model: 'hero', // stand-in for the source game's lead swordsman
    level: 30, dragoonLevel: 5,
    hp: 0, atk: 0, def: 0, mat: 0, mdf: 0, spd: 0, // filled from RESEARCH.md after the check
  },
  rival: {
    name: 'Vael', model: 'rival', // stand-in for the source game's silver-haired rival
    encounter: 'see RESEARCH.md',
    hp: 0, atk: 0, def: 0, mat: 0, mdf: 0, spd: 0,
  },

  // Battle menu, in the source game's order. Escape is greyed out against a boss.
  menu: [
    { id: 'attack', label: 'Attack' },
    { id: 'dragoon', label: 'Dragoon' },
    { id: 'guard', label: 'Guard' },
    { id: 'items', label: 'Items' },
    { id: 'escape', label: 'Escape', disabledVsBoss: true },
  ],
};
