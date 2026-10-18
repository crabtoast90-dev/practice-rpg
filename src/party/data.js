// Mode 2 (Party) numbers. Every number the party battle uses lives here; ask for
// changes by name ("Brann speed to 110"). Rules mimicked are in RESEARCH.md (Mode 2).
// Stats are a first draft in the style of the source game, not tuned yet.

export const PARTY = {
  rules: {
    actionGauge: 10000, // a unit's next turn is actionGauge / speed action value away
    skillPoints: { start: 3, max: 5, basicGain: 1, skillCost: 1 },
    energy: { basic: 20, skill: 30, ultimate: 5, perHitTaken: 10, perKill: 10 },
    defenseConstant: { level: 80, enemyLevel: 80 }, // DEF multiplier inputs (RESEARCH.md)
    enemyHit: 1.0, // each enemy hit deals this x its ATK (before the DEF multiplier)
    autoTarget: 'lowest HP', // single-target and blast attacks aim at: 'lowest HP' or 'leftmost'
    maxActions: 2000, // safety stop: a fight this long ends as a draw
  },

  // Auto-battle rules: read top to bottom, the first rule that fits is used.
  // 'ultimate when ready' fires the ultimate the moment energy is full (cuts in).
  // Rules the sim understands (names are the heroes' and skills' on-screen names):
  //   'ultimate when ready'   'basic'   'skill'
  //   'skill if skill points >= N'      'skill on <Hero>'
  //   'skill on an enemy without <Skill name>'
  //   'skill if anyone has no shield'   'skill if anyone below N% HP'

  // Targets the user set; npm run sim says pass / fail for each in BALANCE.md.
  targets: {
    autoWinRate: { aim: 70, min: 65, max: 75 }, // % of seeded auto fights won (2026-10-18: "70% is fine")
  },

  // Playback pace on screen (view only; the sim ignores these). Milliseconds at 1x.
  playback: {
    intro: 700, // before the first turn
    turn: 250, // a unit steps up before acting
    windup: 450, // attack animation until the first hit lands
    ultimate: 1400, // cut-in banner and camera push before an ultimate lands
    hitGap: 160, // between hits of one action
    death: 500,
    recover: 450, // after an action, before the next one
    wave: 1600, // the next wave rises
    floater: 1000, // damage and shield numbers stay up this long
    lunge: 0.7, // metres a melee attacker steps toward its target
    cameraPush: 0.35, // how far the camera moves toward the ultimate's caster (0-1)
    fastSpeed: 2, // the 2x button
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
      auto: ['ultimate when ready', 'skill if skill points >= 2', 'basic'],
    },
    nyx: {
      name: 'Nyx', role: 'Sub-damage / debuffer', model: 'rogue',
      hp: 950, atk: 600, def: 450, speed: 115, maxEnergy: 110,
      basic: { name: 'Twin Cut', target: 'single', atk: 1.0 },
      skill: { name: 'Hex Mark', target: 'single', atk: 1.5, debuff: { defDown: 0.2, turns: 2 } },
      ultimate: { name: 'Night Bloom', target: 'all', atk: 1.6, debuff: { defDown: 0.2, turns: 2 } },
      auto: ['ultimate when ready', 'skill on an enemy without Hex Mark', 'basic'],
    },
    sola: {
      name: 'Sola', role: 'Buffer', model: 'mage',
      hp: 1000, atk: 520, def: 480, speed: 120, maxEnergy: 120,
      basic: { name: 'Spark', target: 'single', atk: 1.0 },
      skill: { name: 'Quicken', target: 'ally', atkUp: 0.5, turns: 1, actionAdvance: 0.5 },
      ultimate: { name: 'Sunrise Hymn', target: 'party', atkUp: 0.4, turns: 2 },
      auto: ['ultimate when ready', 'skill on Brann', 'basic'],
    },
    aldric: {
      name: 'Aldric', role: 'Sustain (shield)', model: 'knight',
      hp: 1300, atk: 450, def: 800, speed: 96, maxEnergy: 100,
      basic: { name: 'Bash', target: 'single', atk: 1.0 },
      skill: { name: 'Bulwark', target: 'party', shieldDef: 0.25, shieldFlat: 200, turns: 3 },
      ultimate: { name: 'Last Rampart', target: 'party', shieldDef: 0.4, shieldFlat: 300, turns: 3 },
      auto: ['ultimate when ready', 'skill if anyone has no shield', 'skill if anyone below 50% HP', 'basic'],
    },
  },
  lineup: ['brann', 'nyx', 'sola', 'aldric'], // left to right as the camera sees them

  enemies: {
    // hits: blows per turn, each on a random living hero; aoe: every blow hits the whole party.
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
