# Asset catalog

Every CC0 model pack used in the practice games so far, one folder per pack, each with a `LICENSE.md` (license, author, source link, where it was copied from). These are the files the earlier games committed, **not always the full pack download**: gaps are listed at the end.

Total: **27 MB, 230 files** (KayKit Adventurers 3.0 MB, KayKit Skeletons 1.5 MB, KayKit animations 12 MB, Quaternius nature 12 MB).

| folder | what | size | used in |
|---|---|---|---|
| `kaykit-adventurers/` | 6 heroes + 31 hand-held items and props | 3.0 MB | skirmish, glade, rpg |
| `kaykit-skeletons/` | 4 skeletons + 9 skeleton weapons and arrows | 1.5 MB | skirmish, rpg |
| `kaykit-animations/` | 14 animation files (Rig_Medium 8, Rig_Large 6), 159 clips | 12 MB | skirmish, glade, rpg |
| `quaternius-nature/` | trees, dead trees, bushes, grass, flowers: source glTF + small web-ready GLBs | 12 MB | glade |

## KayKit: one rig for everything

Every KayKit character here (heroes and skeletons) and every animation file shares **the same 23-bone rig**, checked bone by bone:

`root, hips, spine, chest, upperarm.l, lowerarm.l, wrist.l, hand.l, handslot.l, upperarm.r, lowerarm.r, wrist.r, hand.r, handslot.r, head, upperleg.r, lowerleg.r, foot.r, toes.r, upperleg.l, lowerleg.l, foot.l, toes.l`

What that means in practice:
- **Any clip plays on any character.** The character files hold no animations; load a character, load one or more `Rig_Medium_*.glb` files, and play their clips on it (three.js `AnimationMixer` + `AnimationClip.findByName`). A skeleton can swing a sword with `Melee_1H_Attack_Chop`; a knight can shamble with `Skeletons_Walking`.
- **Weapons attach to `handslot.r` / `handslot.l`.** three.js drops the dot when it loads the file: look the bone up as `handslotr` / `handslotl`.
- **Rig_Medium** is the body size of every character in this library. **Rig_Large** has the same bone names but is built for KayKit's large characters (none are in this library); expect odd poses on medium bodies.
- Each animation file includes a `T-Pose` clip and a stand-in mesh; ignore both.
- Working loader: the starter's `src/view/units.js` (clone with `SkeletonUtils.clone`, scale by the model's height, cross-fade 0.15 s, one-shot clips fall back to idle).

## `kaykit-adventurers/`

**characters/** (GLB, textures embedded): `Knight`, `Barbarian`, `Mage`, `Rogue`, `Rogue_Hooded`, `Ranger`.

**accessories/** (glTF + .bin; each file names one shared texture, which sits in the same folder, so copy the texture with it):
- `knight_texture.png`: sword_1handed, sword_2handed, sword_2handed_color, shield_badge, shield_badge_color, shield_round, shield_round_color, shield_spikes, shield_spikes_color, shield_square, shield_square_color
- `barbarian_texture.png`: axe_1handed, axe_2handed, shield_round_barbarian, mug_empty, mug_full
- `rogue_texture.png`: dagger, crossbow_1handed, crossbow_2handed, arrow_crossbow, arrow_crossbow_bundle, quiver, smokebomb
- `ranger_texture.png`: bow, bow_withString, arrow_bow, arrow_bow_bundle
- `mage_texture.png`: staff, wand, spellbook_open, spellbook_closed

## `kaykit-skeletons/`

**characters/**: `Skeleton_Warrior`, `Skeleton_Rogue`, `Skeleton_Mage`, `Skeleton_Minion`.

**accessories/** (all use `skeleton_texture.png`): Skeleton_Blade, Skeleton_Axe, Skeleton_Shield_Large_A, Skeleton_Crossbow, Skeleton_Quiver, Skeleton_Arrow, Skeleton_Arrow_Half, Skeleton_Arrow_Broken, Skeleton_Arrow_Broken_Half. (`Skeleton_Shield_Large_B.bin` is here without its `.gltf`: unusable, see gaps.)

## `kaykit-animations/`

**rig-medium/**
- `Rig_Medium_General.glb` (14 clips): Idle_A, Idle_B, Hit_A, Hit_B, Death_A, Death_B (+ _Pose holds), Spawn_Air, Spawn_Ground, Interact, PickUp, Throw, Use_Item
- `Rig_Medium_MovementBasic.glb` (10): Walking_A/B/C, Running_A/B, Jump_Start, Jump_Idle, Jump_Land, Jump_Full_Short, Jump_Full_Long
- `Rig_Medium_MovementAdvanced.glb` (12): Dodge_Forward/Backward/Left/Right, Running_Strafe_Left/Right, Running_HoldingBow, Running_HoldingRifle, Walking_Backwards, Crouching, Sneaking, Crawling
- `Rig_Medium_CombatMelee.glb` (21): Melee_1H_Attack_Chop / Jump_Chop / Slice_Diagonal / Slice_Horizontal / Stab, Melee_2H_Attack_Chop / Slice / Spin / Spinning / Stab, Melee_2H_Idle, Melee_Block, Melee_Block_Attack, Melee_Block_Hit, Melee_Blocking, Melee_Dualwield_Attack_Chop / Slice / Stab, Melee_Unarmed_Attack_Kick / Punch_A, Melee_Unarmed_Idle
- `Rig_Medium_CombatRanged.glb` (19): Ranged_1H_ and Ranged_2H_ Aiming / Reload / Shoot / Shooting, Ranged_Bow_Aiming_Idle / Draw / Draw_Up / Idle / Release / Release_Up, Ranged_Magic_Raise / Shoot / Spellcasting / Spellcasting_Long / Summon
- `Rig_Medium_Special.glb` (14): Skeletons_Idle, Skeletons_Walking, Skeletons_Death (+ _Pose), Skeletons_Death_Resurrect, Skeletons_Spawn_Ground, Skeletons_Awaken_Floor (+ _Long), Skeletons_Awaken_Standing, Skeletons_Inactive_Floor_Pose / Standing_Pose, Skeletons_Taunt (+ _Longer), EXPERIMENTAL_Medium_Transform
- `Rig_Medium_Simulation.glb` (13): Cheering, Waving, Sit_Chair_ / Sit_Floor_ Down / Idle / StandUp, Lie_Down / Idle / StandUp, Push_Ups, Sit_Ups
- `Rig_Medium_Tools.glb` (28): Chop(ping), Dig(ging), Hammer(ing), Saw(ing), Pickaxe / Pickaxing, Lockpick(ing), Fishing_Cast / Idle / Bite / Tug / Reeling / Struggling / Catch, Holding_A/B/C, Work_A/B/C, Working_A/B/C

**rig-large/** (for large-body characters, none in this library): `Rig_Large_General` (Idle_A/B, Hit_A, Death_A), `_MovementBasic` (Walking_A, Running_A), `_MovementAdvanced` (Dodge x4), `_CombatMelee` (15: 1H/2H/dual-wield/unarmed attacks, blocks, idles), `_Simulation` (Flexing), `_Special` (EXPERIMENTAL_Large_Transform).

## `quaternius-nature/`

- **source-gltf/**: the glTF files the user downloaded by hand for practice-glade (the cloud can't reach the Quaternius Google Drive). Models: BirchTree_1-5, MapleTree_1-5, DeadTree_1-10, Bush, Bush_Small, Bush_Large (each also _Flowers), Grass_Small, Grass_Large, Grass_Large_Extruded, Flower_1, Flower_2, Flower_1-5_Clump. Textures for bark, leaves, grass, flowers, rocks; pine, palm and "normal tree" textures came along but **their models didn't**.
- **web-ready/**: 23 small GLBs made from those (normal maps dropped, leaves hard-edged, textures 512 px WebP, simplified): birch_1-3, maple_1-4, dead_1-5, bush_1-3, grass_1-3, flower_1-5. Drop-in for any three.js game. `build-web-ready.mjs` remakes them (map of which source model became which file is at its top).
- Looks: Firewatch-ish stylized, soft colours; not the same style as KayKit (chunkier, flat colours). glade mixed them with KayKit's Ranger and it read fine at distance.

## Which game used what

| asset | practice-glade (explore) | practice-skirmish (autobattler) | practice-rpg (duel + party) |
|---|---|---|---|
| Knight | | unit (sword + badge shield) | Rhen (duel hero), Aldric (party sustain) |
| Barbarian | | unit (2H axe) | Brann (main damage) |
| Rogue | | unit (two daggers) | Nyx (sub-damage) |
| Rogue_Hooded | | | Vael (duel rival, sword) |
| Mage | | unit (staff) | Sola (buffer) |
| Ranger | player character | unit (bow) | |
| Skeleton Warrior / Rogue / Mage / Minion | | the four enemies | Bone Warrior / Stalker / Caster / Minion |
| Rig_Medium_General | idle | idle, hit, death | idle, hit, death, item |
| Rig_Medium_MovementBasic | walk, run, jump | walk between cells | |
| Rig_Medium_CombatMelee | | attacks, Shield Wall | attacks, guard, parry |
| Rig_Medium_CombatRanged | | bow and magic attacks | spells, cast, summon |
| Rig_Medium_Special | | skeleton idle, walk, death | skeleton idle, death, spawn |
| mug_full | | prop on the table | |
| Quaternius trees, bushes, grass, flowers | the whole valley | | |
| MovementAdvanced, Simulation, Tools, all Rig_Large, most accessories | | | unused so far |

Not in this library (not CC0 packs): practice-glade's Meshy pines, rocks and lantern, its CC0 sounds (`public/audio/`, credited in its CREDITS.md), and practice-skirmish's Meshy paint-over images.

## Gaps
- **Skeleton_Shield_Large_B**: only the `.bin` was committed, the `.gltf` is missing. Re-download the Skeletons pack to use it.
- **KayKit packs are partial**: only what practice-skirmish committed. Large-body characters, extra skeleton weapons and any pack extras were never committed.
- **Quaternius**: no pines, palms, rocks or "normal" trees (textures only), no License.txt, and the `*_Normal.png` normal maps are 90-byte stand-ins (the real ones were too big to upload; web-ready drops normal maps anyway).
- **Skeletons license text**: no copy was committed; the pack is CC0 like the Adventurers pack.
