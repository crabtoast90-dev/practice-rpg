// Mode 2 (Party) numbers. Every number the party battle uses lives here; ask for
// changes by name ("Brann speed to 110"). Rules mimicked are in RESEARCH.md (Mode 2).
// Stats are a first draft in the style of the source game, not tuned yet.

export const PARTY = {
  rules: {
    actionGauge: 10000, // a unit's next turn is actionGauge / speed action value away
    skillPoints: { start: 3, max: 5, basicGain: 1, skillCost: 1 },
    energy: { basic: 20, skill: 30, ultimate: 5, perHitTaken: 10, perKill: 10 },
    defenseConstant: { level: 80, enemyLevel: 80 }, // DEF multiplier inputs (RESEARCH.md)
  },

  // Four original characters in the classic roles. Multipliers are of the user's ATK
  // (or DEF / max HP for the sustain), as in the source game.
  heroes: {
    brann: {
      name: 'Brann', role: 'Main damage', model: 'barbarian',
      hp: 1100, atk: 720, def: 500, speed: 102, maxEnergy: 120,
      basic: { name: 'Cleaver', target: 'single', atk: 1.0 },
      skill: { name: 'Rending Arc', target: 'blast', atk: 2.0, adjacent: 0.8 },
      ultimate: { name: 'Worldsplitter', target: 'single', atk: 4.2 },
      auto: 'skill when 2+ skill points, else basic; ultimate at once',
    },
    nyx: {
      name: 'Nyx', role: 'Sub-damage / debuffer', model: 'rogue',
      hp: 950, atk: 600, def: 450, speed: 115, maxEnergy: 110,
      basic: { name: 'Twin Cut', target: 'single', atk: 1.0 },
      skill: { name: 'Hex Mark', target: 'single', atk: 1.5, debuff: { defDown: 0.2, turns: 2 } },
      ultimate: { name: 'Night Bloom', target: 'all', atk: 1.6, debuff: { defDown: 0.2, turns: 2 } },
      auto: 'skill if the target has no Hex Mark, else basic; ultimate at once',
    },
    sola: {
      name: 'Sola', role: 'Buffer', model: 'mage',
      hp: 1000, atk: 520, def: 480, speed: 120, maxEnergy: 120,
      basic: { name: 'Spark', target: 'single', atk: 1.0 },
      skill: { name: 'Quicken', target: 'ally', atkUp: 0.5, turns: 1, actionAdvance: 0.5 },
      ultimate: { name: 'Sunrise Hymn', target: 'party', atkUp: 0.4, turns: 2 },
      auto: 'Quicken on Brann every turn; ultimate at once',
    },
    aldric: {
      name: 'Aldric', role: 'Sustain (shield)', model: 'knight',
      hp: 1300, atk: 450, def: 800, speed: 96, maxEnergy: 100,
      basic: { name: 'Bash', target: 'single', atk: 1.0 },
      skill: { name: 'Bulwark', target: 'party', shieldDef: 0.25, shieldFlat: 200, turns: 3 },
      ultimate: { name: 'Last Rampart', target: 'party', shieldDef: 0.4, shieldFlat: 300, turns: 3 },
      auto: 'skill if no shield on the party or anyone below 50% HP, else basic; ultimate at once',
    },
  },
  lineup: ['brann', 'nyx', 'sola', 'aldric'], // left to right as the camera sees them

  enemies: {
    skeletonMinion: { name: 'Bone Minion', model: 'skeletonMinion', hp: 3000, atk: 300, def: 400, speed: 83, hits: 1 },
    skeletonWarrior: { name: 'Bone Warrior', model: 'skeletonWarrior', hp: 6000, atk: 420, def: 500, speed: 90, hits: 1 },
    skeletonMage: { name: 'Bone Caster', model: 'skeletonMage', hp: 4500, atk: 380, def: 400, speed: 100, hits: 1, aoe: true },
    skeletonRogue: { name: 'Bone Stalker', model: 'skeletonRogue', hp: 5000, atk: 460, def: 450, speed: 110, hits: 2 },
  },
  waves: [
    ['skeletonMinion', 'skeletonWarrior', 'skeletonMinion'],
    ['skeletonRogue', 'skeletonWarrior', 'skeletonMage'], // the stronger second wave
  ],
};
