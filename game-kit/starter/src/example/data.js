// Example mode numbers. Every number the example uses lives here; ask for changes by
// name ("foe atk to 30"). Replace this whole mode with your game's first mode; keep the
// shape: one data file per mode, numbers only, comments say where each came from.

export const EXAMPLE = {
  // The two fighters. model = a FIGURES key in src/view/units.js.
  hero: { name: 'Hero', model: 'hero', hp: 300, atk: 40, def: 10, speed: 110 },
  foe: { name: 'Skeleton', model: 'foe', hp: 300, atk: 51, def: 6, speed: 95 },

  rules: {
    actionGauge: 10000, // a unit acts every actionGauge / speed (lower acts sooner)
    spread: 0.15, // each hit rolls damage x (1 ± spread)
    critChance: 0.1,
    critMult: 1.5,
    maxActions: 500, // safety stop: a fight this long is a draw
  },

  // Targets the user set; npm run sim says pass / fail for each in BALANCE.md.
  targets: {
    heroWinRate: { aim: 60, min: 50, max: 70 }, // % of seeded fights the hero wins (placeholder)
  },

  // Playback pace on screen (view only; the sim ignores these). Milliseconds.
  playback: { firstActionMs: 600, actionMs: 900, hitAtMs: 350 },

  simFights: 1000, // how many seeded fights npm run sim plays
};
