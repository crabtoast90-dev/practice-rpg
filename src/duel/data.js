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
    // In Dragoon form the menu is only these (source: D'Attack and Magic).
    menu: [{ id: 'strike', label: 'Strike' }, { id: 'magic', label: 'Magic' }],
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
  // The simulated player's choices: transform when SP reaches dragoonAtSp (null = never),
  // Healing Potion below this % HP while any are left, else Attack.
  // In Dragoon form: cast dragoonSpell while MP lasts (null = always Strike).
  bot: { healBelowPercent: 35, dragoonAtSp: 500, dragoonSpell: null },
  simFights: 1000,

  // The timing UI (D2). Feel numbers, all my calls until the user plays them. Sizes in CSS px.
  timingUi: {
    keys: { main: ['Space', 'KeyX'], counter: ['KeyC'], dodge: ['KeyZ'] }, // parry = the main key
    squarePx: 64, squareStartScale: 3, squareTurnDeg: 90, // the outer square closes and turns onto the target
    flashMs: 200, verdictMs: 650, // the target square's flash; the verdict word's life
    defenseLeadMs: 750, // a ring starts closing on Rhen this long before each hit's contact
    ringPx: 90, ringStartScale: 2.6,
    rivalSwingLeadMs: 350, // Vael starts his swing this long before contact
    afterChainMs: 700, beforeRivalMs: 700, afterRivalMs: 600, // pauses between turns
    latencyFrames: 1, // the input-to-screen delay estimate, in frames, until the player calibrates
    calibration: { flashes: 8, gapMs: 700, skip: 2 }, // tap-to-the-flash; the first `skip` taps are warm-up
    debugPresses: 10,
    floatMs: 1100, floatRisePx: 40, floatSpreadPx: 34, // damage numbers and words rise this far over their life
  },

  // Dragoon looks (D4), my calls. Colours are hex; times in ms.
  dragoonUi: {
    transformMs: 1300, revertMs: 900, // the flash and pause when transforming / turning back
    glowColor: 0xff6a1a, glowIntensity: 0.45, lightIntensity: 4,
    wingColor: 0xd8341c, wingScale: 0.75, flapMs: 260,
    ringPx: 150, dotPx: 18, ringAutoStartMs: 4000, // the ring starts by itself if no start press comes
    flightMs: 650, burstMs: 350,
    spells: {
      default: { color: 0xff8a2a, size: 0.25 },
      'Ember Shot': { color: 0xff8a2a, size: 0.22 },
      Blast: { color: 0xffb040, size: 0.35, from: 'sky' },
      'Last Blaze': { color: 0xff5a1a, size: 0.4 },
      'Crimson Wyrm': { color: 0xff2a2a, size: 0.7, from: 'sky' },
    },
  },

  // Vael's signature cinematic (D5), my calls. Beats in order; slow = animation speed.
  cinematic: {
    beats: [
      { shot: 'wide', ms: 1000 },
      { shot: 'rival', ms: 1400, slow: 0.35 },
      { shot: 'title', ms: 1500, slow: 0.15 },
      { shot: 'shoulder', ms: 1000, slow: 0.5 },
    ],
    portrait: { pull: 1.7, lower: 0.45 }, // phone-shaped screens: camera distance x pull, aim lowered (m)
    titleDelay: 0.2, flashPart: 0.25, // in the title beat: a held pause, then the flash, then the card
    pillars: { count: 4, color: 0x5fa8ff, radius: 0.3, height: 5, spread: 1.15, opacity: 0.28, riseMs: 900, staggerMs: 350, burstMs: 400 },
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
