// Mode 1 (Duel) numbers. Every number the duel uses lives here; ask for changes by
// name. Values come from RESEARCH.md (Mode 1), checked by the user on 2026-10-18
// (their answers are in DECISIONS.md). On-screen names are original; the source names are
// only in comments and the docs. Times are in milliseconds (source: 20 ticks/s, 50 ms each).

export const DUEL = {
  status: 'RESEARCH.md checked 2026-10-18', // see DECISIONS.md for the user's answers
  tickMs: 50,

  // Stand-in for Dart, Lv35 with Mind Crush, Saint Armor, Knight Helm, Combat Shoes.
  hero: {
    name: 'Rhen', model: 'hero',
    level: 35, dragoonLevel: 5,
    hp: 2756, atk: 119, def: 130, mat: 84, mdf: 118, spd: 50, // source values
    // User call 2026-10-18: Rhen's stats +100%, since the original fight has 3 heroes.
    soloBoost: { mult: 2, stats: ['hp', 'atk', 'def', 'mat', 'mdf', 'spd'] },
  },
  // Stand-in for Lloyd at Flanvel Tower (Disc 3).
  rival: {
    name: 'Vael', model: 'rival',
    encounter: 'Flanvel Tower (Disc 3)',
    // Source HP is 6,000. User call 2026-10-18: the hero wins after 7 perfect Frenzy Chains.
    // A perfect chain from boosted Rhen does 476 (RESEARCH.md formula), so 6 chains = 2,856
    // and 7 = 3,332: HP 3,300 sits between them.
    hp: 3300, atk: 80, def: 100, mat: 65, mdf: 150, spd: 65,
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
    counterable: false, // as in the source (user cut the mid-chain counter 2026-10-18)
    counterAtPress: 3, // which press (1-5) asks for the counter button, if counterable (best guess; unused now)
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

  // Dodge and parry after Expedition 33 (a deliberate change; see RESEARCH.md). Windows are
  // total widths in ms, centred on each hit's contact moment.
  defense: {
    dodgeWindowMs: 220, parryWindowMs: 150,
    lockoutMs: 300, // after any press, further presses are ignored (no mashing)
    spPerParry: 10,
    counter: { name: 'Riposte', percent: 50 }, // after parrying every hit of an attack; % like an addition hit
    hits: { basic: 1, signature: 4 }, // Rising Cut is 1 hit, Four Seals one hit per pillar
    signatureHitGapMs: 450, // time between the pillars' contacts (my call, to be felt in D2)
  },

  guard: { damageTaken: 0.5, healPercent: 10 },
  items: [
    { name: 'Healing Potion', count: 3, healPercent: 50 },
    { name: 'Spirit Potion', count: 3, sp: 100 },
  ],

  // Targets npm run sim checks against.
  targets: { perfectChainsToWin: 7 },

  // Turn order: each side's next turn comes every turnGauge / speed (my call, same idea as Party).
  turnGauge: 10000,

  // Simulated players for npm run sim (my calls). Each press lands at biasMs + a random spread
  // of sdMs (bell curve) from the perfect frame; missPercent of presses never come. They parry
  // or dodge Vael's hits as `defend` says. A masher presses `mash.presses` times, `mash.gapMs` apart.
  accuracy: {
    perfect: { label: 'perfect', biasMs: 0, sdMs: 0, missPercent: 0, defend: 'parry' },
    good: { label: 'good player', biasMs: 0, sdMs: 40, missPercent: 2, defend: 'parry' },
    sloppy: { label: 'sloppy', biasMs: 30, sdMs: 90, missPercent: 8, defend: 'dodge' },
    mashing: { label: 'mashing', biasMs: -250, sdMs: 60, missPercent: 0, defend: 'dodge', mash: { presses: 5, gapMs: 90 } },
  },
  // The simulated player's choices: Healing Potion below this % HP while any are left, else Attack.
  bot: { healBelowPercent: 35 },
  simFights: 1000,

  // Battle menu, in the source game's order. Escape is greyed out against a boss.
  menu: [
    { id: 'attack', label: 'Attack' },
    { id: 'dragoon', label: 'Dragoon' },
    { id: 'guard', label: 'Guard' },
    { id: 'items', label: 'Items' },
    { id: 'escape', label: 'Escape', disabledVsBoss: true },
  ],
};
