// Mode 1 (Duel) numbers. Every number the duel uses lives here; ask for changes by
// name. Values come from RESEARCH.md (Mode 1) and stay "awaiting check" until the
// user has checked RESEARCH.md. On-screen names are original; the source names are
// only in comments and the docs. Times are in milliseconds (source: 20 ticks/s, 50 ms each).

export const DUEL = {
  status: 'awaiting RESEARCH.md check', // Mode 1 tuning waits for the user (PLAN.md)
  tickMs: 50,

  // Stand-in for Dart, Lv35 with Mind Crush, Saint Armor, Knight Helm, Combat Shoes.
  hero: {
    name: 'Rhen', model: 'hero',
    level: 35, dragoonLevel: 5,
    hp: 2756, atk: 119, def: 130, mat: 84, mdf: 118, spd: 50,
  },
  // Stand-in for Lloyd at Flanvel Tower (Disc 3).
  rival: {
    name: 'Vael', model: 'rival',
    encounter: 'Flanvel Tower (Disc 3)',
    hp: 6000, atk: 80, def: 100, mat: 65, mdf: 150, spd: 65,
    basic: { name: 'Rising Cut', mult: 1 }, // Punch Slash
    signature: { name: 'Four Seals', mult: 4, opener: true, lastGasp: true }, // Four Pillar Spell Dome
  },

  // Madness Hero at addition level 5: 6 hits, 5 presses; windows in ticks from overlay start.
  addition: {
    name: 'Frenzy Chain',
    hitPercent: [20, 20, 20, 20, 10, 10],
    damageMult: 1.0,
    spPerHit: 10, spMult: 3.4,
    windowsTicks: [[22, 24], [37, 39], [45, 47], [53, 55], [61, 63]],
    ignoreBeforeTick: 9,
    squareLeadTicks: 17,
    counterable: false,
  },

  dragoon: {
    spPerLevel: 100, spPerTurn: 100,
    mult: { atk: 1.7, def: 2.5, mat: 1.7, mdf: 2.5 },
    mp: 100,
    // The ring: laps in ticks, success window per timed press, damage % by strikes landed.
    ring: { lapTicks: [14, 12, 10, 8], windowTicks: [4, 3, 2, 1], totalPercent: [100, 110, 130, 160, 200] },
    spells: [
      { name: 'Ember Shot', mp: 10, target: 'one', mult: 2 }, // Flame Shot
      { name: 'Blast', mp: 20, target: 'all', mult: 1 }, // Explosion
      { name: 'Last Blaze', mp: 30, target: 'one', mult: 3 }, // Final Burst
      { name: 'Crimson Wyrm', mp: 80, target: 'all', mult: 3 }, // Red-Eyed Dragon
    ],
  },

  guard: { damageTaken: 0.5, healPercent: 10 },
  items: [
    { name: 'Healing Potion', count: 3, healPercent: 50 },
    { name: 'Spirit Potion', count: 3, sp: 100 },
  ],

  // Battle menu, in the source game's order. Escape is greyed out against a boss.
  menu: [
    { id: 'attack', label: 'Attack' },
    { id: 'dragoon', label: 'Dragoon' },
    { id: 'guard', label: 'Guard' },
    { id: 'items', label: 'Items' },
    { id: 'escape', label: 'Escape', disabledVsBoss: true },
  ],
};
