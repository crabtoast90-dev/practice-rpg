# Research

Every number the two modes copy from their source games, with where it came from and how sure we are. **Mode 1 tuning waits for the user's check of this file.** When the user corrects a line, fix it here and in the data file, and log it in `DECISIONS.md`.

**Confidence marks**
- **confirmed**: read straight from the retail game's decompiled code (Mode 1) or from datamined game files / the official wiki (Mode 2).
- **two sources agree**: two independent sources give the same value.
- **best guess**: one source only, sources disagree, or my own inference. These are the lines to check.

**Main sources**
- **SC**: Severed Chains, the community decompilation of the retail Legend of Dragoon (read directly): https://github.com/Legend-of-Dragoon-Modding/Severed-Chains (files named per line, e.g. `lodmod/LodAdditions.java`).
- **LODW**: The Legend of Dragoon Wiki Project (modding community, built from data dumps): https://legendofdragoon.org/wiki/
- **RPGC**: RPGClassics boss shrine: http://shrines.rpgclassics.com/psx/lod/bosses.shtml
- **KQM**: Keqing Mains Star Rail guides: https://hsr.keqingmains.com/misc/speed-guide/ and https://hsr.keqingmains.com/misc/beginner-guide/
- **HoYoWiki**: official Star Rail wiki, Energy entry: https://wiki.hoyolab.com/m/hsr/entry/1246?lang=en-us
- **Gamevika**: https://www.gamevika.com/en/hsr/wiki/energy-skill-points
- **StarRailRes**: datamined character data: https://github.com/Mar-7th/StarRailRes
- Fandom wikis, GameFAQs, Neoseeker, Prydwen and game8 refused automated fetching; where they appear it's from search snippets only.

---

# Mode 1: Duel (The Legend of Dragoon)

## The encounter: Lloyd at Flanvel Tower (Disc 3)

There are only **two** Lloyd fights in the game (SC `lodmod/LodEncounters.java`, LODW [Lloyd](https://legendofdragoon.org/wiki/Lloyd)):
1. **Lohan Hero Competition (Disc 1)**: a scripted 1v1 loss (399 HP, fixed 9-move script ending in a Finishing Move). Not a real fight.
2. **Flanvel Tower (Disc 3)**: the real boss fight, full moveset. **Chosen.**

The original is Dart plus two party members against Lloyd. **Our duel is Dart alone**, a departure the user should accept or change.

## Timing unit

| Item | Value | Source | Confidence |
|---|---|---|---|
| Battle logic rate | Battle logic ticks once every 3 screen refreshes = **20 ticks per second (1 tick = 50 ms)** on NTSC | SC `game/combat/Battle.java` (`vsyncMode = 3`) | confirmed (code), but no published page states it: **please check by feel** |

All "ticks" below are these 50 ms steps.

## Madness Hero (the hero's addition)

| Item | Value | Source | Confidence |
|---|---|---|---|
| Learned at | character level 22 | SC `DartTemplate.java`; LODW [Additions](https://legendofdragoon.org/wiki/Additions) | two sources agree |
| Button presses | **5** | SC `AdditionOverlaysEffect44`; LODW | two sources agree |
| Hits, perfect run | **6** (the first hit always lands; each good press adds one) | SC `LodAdditions.java` MADNESS_HERO; LODW | two sources agree |
| Damage per hit | 20%, 20%, 20%, 20%, 10%, 10% = **100% total** | SC; LODW | two sources agree |
| Damage multiplier by addition level (Lv1-Lv5) | **1.00 at every level** (Madness Hero never gains damage) | SC; LODW ("100 flat") | two sources agree |
| SP per hit (Lv1) | 10 on each landed hit | SC | confirmed |
| SP multiplier Lv1-Lv5 | 1.0, 1.5, 2.0, 2.5, 3.4 | SC | confirmed |
| SP per perfect run Lv1-Lv5 | 60, 90, 120, 150, **204** | SC; LODW (204 at max) | two sources agree |
| Uses to level | 20 successful runs per level; Lv5 after 80 | SC; LODW | two sources agree |
| **We use** | **Addition level 5** (204 SP per perfect run) | the brief's "Madness Hero equipped" read as mastered | best guess: **check** |

**Press windows** (SC `AdditionOverlaysEffect44`, computed from the hit records (15,9,3), (15,9,3), (8,2,3), (8,2,3), (8,2,3), (10,2,2) and a start offset of 11). Ticks counted from the moment the addition overlay starts:

| Press | Window (ticks) | Window length | Gap from previous press | Confidence |
|---|---|---|---|---|
| 1 | 22-24 | 3 ticks = **150 ms** | – | confirmed (code) |
| 2 | 37-39 | 150 ms | 15 ticks = 0.75 s | confirmed (code) |
| 3 | 45-47 | 150 ms | 8 ticks = 0.40 s | confirmed (code) |
| 4 | 53-55 | 150 ms | 0.40 s | confirmed (code) |
| 5 | 61-63 | 150 ms | 0.40 s | confirmed (code) |

The two squares start closing 17 ticks (0.85 s) before each window opens; presses before tick 9 are ignored. Whether tick 0 is the start of the attack animation or the moment the overlay appears is **best guess**.

**Press rules** (SC `tick()`): correct button inside the window = success (centre square flashes white). **Press early = immediate fail** (grey square, no mash protection). No press by the end of the window = fail "too late" (blue). Wrong button = fail. **A fail ends the chain.** Confidence: confirmed (code).

**Damage when the chain breaks:** only the hits that landed count (fail press 3 → 3 hits → 60%). SC `PlayerBattleEntity.calculatePhysicalDamage`; LODW ("remaining potential damage is lost"). Two sources agree. **SP is given per landed hit**: best guess (per-hit data is confirmed, the award itself is in a script not traced).

## Counter-attacks

| Item | Value | Source | Confidence |
|---|---|---|---|
| Cue | red flash, whoosh, short pause, red square | LODW Additions#Counterattacks; SC `isCounter` | two sources agree |
| Input | **Circle** (the counter button) instead of X | LODW; SC | two sources agree |
| Rules | at most once per addition, never on the first or last press; failing it ends the addition and the hero takes counter damage | LODW | best guess (one source) |
| Madness Hero can be countered? | **Never** (only Volcano, Crush Dance and Moon Strike can be) | LODW counter chart; SC data has no counter slot | two sources agree |
| Lloyd at Flanvel counters? | **No** (0 counter opportunities) | LODW Lloyd | best guess (one source) |

**So in a faithful build the counter prompt never appears** with Madness Hero vs Lloyd. Your call: keep it faithful (no counters, build the counter UI anyway for later), or let Vael counter as a deliberate change.

## SP and Dragoon form

| Item | Value | Source | Confidence |
|---|---|---|---|
| SP bar | 100 per Dragoon level; DL5 = **500** (five segments) | SC; LODW [Dragoon](https://legendofdragoon.org/wiki/Dragoon) | two sources agree |
| Transform | needs at least 100 SP; leftover under a full 100 is lost on transforming (180 → 100) | LODW | best guess (one source) |
| Dragoon turns | **one turn per 100 SP** (full DL5 bar = 5 turns, matching "turns = Dragoon level" only when full); form ends at 0 SP | LODW | best guess (one source) |
| Commands as a Dragoon | D'Attack and Magic only (no Guard, Items, Escape) | LODW Tutorials; SC config | two sources agree |
| DL5 Dragoon multipliers | AT 170%, DF 250%, MAT 170%, MDF 250% | SC (150 + 5 per DL, etc.); LODW | two sources agree |
| MP at DL5 | **100** (20 per Dragoon level) | SC `RetailCharacterTemplate` | confirmed (one source) |

## Dragoon Addition (the spinning-light ring)

| Item | Value | Source | Confidence |
|---|---|---|---|
| How it works | press X to start a light circling the ring; press X each time it reaches the top; any miss or early / late press ends it | LODW Dragoon#D'Attack; SC `tickDragoonAdditionHud` | two sources agree |
| Presses / strikes | 1 start press + **4 timed presses** = up to **5 strikes** | SC; LODW | two sources agree |
| Lap length | 14, 12, 10, 8 ticks (each lap faster) | SC | confirmed (code) |
| Window per press | 4, 3, 2, 1 ticks = **200, 150, 100, 50 ms** | SC | confirmed (code) |
| Damage by presses landed | 100 / 110 / 130 / 160 / **200%** for 1-5 strikes | SC `DartTemplate.getDragoonAddition`; LODW | two sources agree |
| Multiplier | Dragoon AT 170% replaces the addition multiplier | SC | confirmed |

## Dragoon magic (fire, all learned by DL5)

Magic damage = (level + 5) × (MAT × 170%) × 5 / target MDF × spell multiplier (SC `calculateMagicDamage`).

| Spell (on screen) | Source name | Learned | MP | Target | Multiplier | Source | Confidence |
|---|---|---|---|---|---|---|---|
| Ember Shot | Flame Shot | DL1 | 10 | one | ×2 | SC `LodSpells.java`; LODW | two sources agree |
| Blast | Explosion | DL2 | 20 | all | ×1 | SC; LODW | two sources agree |
| Last Blaze | Final Burst | DL3 | 30 | one | ×3 | SC; LODW | two sources agree |
| Crimson Wyrm | Red-Eyed Dragon | DL5 | 80 | all | ×3 | SC; LODW | two sources agree |

## Lloyd at Flanvel Tower

| Stat | Value | Source | Confidence |
|---|---|---|---|
| HP | **6,000** (RPGC says 6,500; a Fandom thread mentions 6,800) | LODW; RPGC | best guess: **sources disagree, check** |
| AT / DF | 80 / 100 | LODW | best guess (one source) |
| MAT / MDF | 65 / 150 | LODW | best guess (one source) |
| SPD | 65 | LODW | best guess (one source) |
| Evasion | 0% on paper; "Avoid Afterimage" makes physical attacks miss, chance unlisted (RPGC: about 40%) | LODW; RPGC | best guess: **check** |
| Element | none | LODW; RPGC | two sources agree |
| Escape | impossible (escape chance 0) | SC `LodEncounters.java` | confirmed |

**His moves** (LODW Lloyd):

| Move | Effect | When | Confidence |
|---|---|---|---|
| Four Pillar Spell Dome | 4× damage to the whole party | **always his first action**; also his "last gasp": once, at 0 HP, he casts it instead of dying | best guess (one source) |
| Punch Slash | 1× physical, one target | normal turn | best guess (one source) |
| Aerial Swordplay | 2× physical, one target | normal turn | best guess (one source) |
| Can't Combat / Dragon Buster | instant death on a Dragoon (blocked by a Talisman) | only while a Dragoon is out | best guess: **sources disagree on the name** |
| Retaliations | 20% chance when targeted, out of turn, after the Dome; light / wind / water spells 1.5×-3× | — | best guess (one source) |
| Avoid Afterimage | dodges a physical attack | when targeted | best guess, chance unknown |

**Proposed for the build** (the brief asks for a basic attack and ONE signature move):
- **Basic attack: Punch Slash** (1×). Shown as "Rising Cut".
- **Signature with the cinematic: Four Pillar Spell Dome** (4×, always his opening move, and once more as a last gasp at 0 HP). Shown as "Four Seals". It's the move players remember, it opens every attempt, and the last gasp gives a dramatic second beat.
- **Left out unless you say otherwise:** Aerial Swordplay, the instant death on a Dragoon, the retaliations, Avoid Afterimage. Each is a one-line yes / no for you.

## Monster and player damage formulas (SC)

| Formula | Value | Confidence |
|---|---|---|
| Hero physical / addition | (level + 5) × AT × (sum of landed hit %) / 100 × 5 / target DF; as a Dragoon the hit % is multiplied by 170% | confirmed (code) |
| Monster physical | (AT + move bonus)² × 5 / target DF, then × the move's multiplier; a Dragoon's DF is × 250% | confirmed (code); move bonus assumed 0 for Lloyd's attacks (best guess) |

Worked example (Dart Lv35 with the gear below, AT 119, DF 130):
- Perfect Madness Hero on Lloyd: 40 × 119 × 1.00 × 5 / 100 ≈ **238**. Lloyd at 6,000 HP takes ~25 perfect runs in human form.
- Lloyd's Punch Slash: 80² × 5 / 130 ≈ **246**; Four Pillar Dome ≈ **985**. Dart has 2,756 HP.
- This shows the original fight is long and leans on Dragoon magic (Crimson Wyrm ≈ 40 × (84 × 1.7) × 5 / 150 × 3 ≈ **570**).

## Our hero at this fight

| Item | Value | Source | Confidence |
|---|---|---|---|
| Character level | **35** (players report ~33-38 at Flanvel) | search snippets only | best guess: **check** |
| Base stats at Lv35 | HP 2756, AT 85, DF 86, MAT 84, MDF 84, SPD 50 | LODW Dart; SC tables | two sources agree |
| Weapon | Mind Crush +34 AT | LODW Equipment | best guess (availability timing) |
| Armour | Saint Armor +34 DF / +34 MDF, Knight Helm +5 DF, Combat Shoes +5 DF → totals **AT 119, DF 130, MAT 84, MDF 118** | LODW Equipment | best guess |
| Accessory | none (a Talisman would only matter if the instant death is in) | — | best guess |
| Dragoon level 5 | as the brief asks (DL5 by Disc 3 isn't guaranteed in the original) | brief | — |

## Commands

| Item | Value | Source | Confidence |
|---|---|---|---|
| Guard | halves damage taken until your next turn and restores **10% max HP** | LODW Tutorials; SC `GUARD_HEAL_STAT = 10` | two sources agree |
| Guard stops status effects | not found anywhere | — | best guess: irrelevant here (Lloyd's kept moves cause no status) |
| Items (2 picked) | **Healing Potion** (heal 50% max HP) and **Spirit Potion** (+100 SP) | LODW [Items](https://legendofdragoon.org/wiki/Items) | best guess (one source) |
| Item count | not in the source; I'd give 3 of each | — | best guess: **your call** |
| Escape | disabled vs this boss | SC | confirmed |

## Mode 1: the user's check (2026-10-18)

1. Lloyd's HP: **6,000** (checked).
2. Madness Hero: you remembered more than 5 hits. The retail data has **6 damage hits from 5 presses** (re-read in SC `LodAdditions.java`: six hit records), so we keep 6. The animation may show more sword swings than damage hits. The speed (0.4 s between the last three presses) is straight from the same records, so it stays unless the 20 ticks/s reading is wrong; to be judged by feel in D2.
3. Counters: **yes, as a deliberate change**, modelled on Expedition 33's dodge and parry (section below).
4. Moves: Punch Slash basic + Four Pillar Dome signature, the rest left out (checked).
5. Level 35, Disc 3 gear, Madness Hero level 5 (checked). **Rhen's** stats +100% (all six), because the original fight is 3 heroes vs Lloyd.
6. Solo hero (checked).
7. Second round of answers: **cut Vael's mid-chain counter** (Frenzy Chain stays uncounterable, as in the source). The exact numbers matter less than the feel: **the hero should win after 7 perfect Frenzy Chains.** With boosted Rhen (Lv35, AT 238) a perfect chain does 40 × 238 × 5 / 100 = **476**, so Vael's HP is set to **3,300** (6 chains = 2,856, 7 chains = 3,332). Vael's hits on boosted Rhen (DF 260, HP 5,512): Rising Cut ≈ 123, Four Seals ≈ 492.

## Mode 1: what I needed you to check (answered above)

1. **Lloyd's HP**: 6,000, 6,500 or 6,800?
2. **The 20 ticks/second timing and the 150 ms addition window**: does a 150 ms window and 0.4 s between the last three presses match your memory of Madness Hero?
3. **No counters**: the sources say Lloyd can't counter, and Madness Hero can't be countered at all. Keep it faithful, or add a counter?
4. **Moves**: basic = Punch Slash, signature = Four Pillar Dome (opening move + last gasp). Add any of: Aerial Swordplay, instant death on the Dragoon, retaliations, Avoid Afterimage dodge?
5. **Dart's level 35 and gear**, and Madness Hero at **addition level 5** (204 SP per perfect run, so a full DL5 bar takes ~3 perfect turns).
6. **Dragoon turns** = one per 100 SP (5 with a full bar), not a flat 5.
7. **Solo hero**: the original fight is a 3-person party. Solo + 6,000 HP Lloyd will be long (25 perfect human-form attacks); fine as "faithful numbers, then tune", or scale Lloyd's HP?

## Dodge and parry (after Clair Obscur: Expedition 33), a deliberate change

The user asked for counters modelled on Expedition 33's dodge and parry. Sources: Automaton guide https://automaton-media.com/en/tips/clair-obscur-expedition-33-how-to-get-the-hang-of-dodges-parries-jumps-and-gradient-counters/ , Maxroll https://maxroll.gg/clair-obscur-expedition-33/guides/combat-guide , Push Square https://www.pushsquare.com/guides/clair-obscur-expedition-33-how-to-improve-parry-timing-and-make-parrying-easier , Siliconera patch 1.3.0 https://www.siliconera.com/clair-obscur-expedition-33-patch-adjusts-dodge-and-parry-timing/ , and Nexus mod "Easier or Harder Dodge and Parry" https://www.nexusmods.com/clairobscurexpedition33/mods/28 (figures relayed by players; page blocked).

| Rule | Value | Confidence |
|---|---|---|
| Dodge window | **~220 ms** (Expeditioner / Expert); ~350 ms on Story before patch 1.3.0 | best guess (mod author, relayed) |
| Parry window | **~150 ms** (Expeditioner / Expert); ~250 ms on Story before 1.3.0 | best guess (mod author, relayed) |
| Story mode | windows +40% since patch 1.3.0 | confirmed (official patch notes) |
| Dodge | no damage, no reward; wider and more forgiving than parry | two sources agree |
| Parry | no damage, +1 AP per parried hit | two sources agree |
| Counter-attack | parry **every** hit of an attack → automatic counter-attack | two sources agree |
| Counter damage | no base formula found (Pictos add +25% / +50%) | not found |
| Missed hit | that hit's damage lands; each hit is judged on its own; the counter is lost | best guess (one source) |
| Combos | 1-3 hits early, 5-7 late; feints and delayed swings | best guess (one source) / two sources agree |
| Mashing | doesn't work (an early press wastes the parry); lockout length unknown | best guess |

**How we use it** (my design calls, all in `src/duel/data.js`, all changeable by name):
- Rhen can **dodge** (wider window) or **parry** (tighter window) every hit of Vael's attacks, timed in ms from the hit's contact moment.
- **Rising Cut** (his basic) is 1 hit; **Four Seals** (his signature) is 4 hits, one per pillar, each defendable. Parry all of an attack's hits → Rhen's automatic counter-attack.
- ~~Vael counters mid-chain~~: cut by the user.
- A press locks out further presses for 300 ms, so mashing fails. On each hit, the first press that isn't locked out decides it (an early press wastes the hit, as in Expedition 33).
- Four Seals' pillars land **450 ms** apart (my call; to be felt in D2). Riposte = 50% of a Frenzy Chain = 238 damage.
- Parries give Rhen SP (our stand-in for Expedition 33's AP).

---

# Mode 2: Party (Honkai: Star Rail)

We copy the core loop only. No Break / toughness (parked in IDEAS.md).

## Action value and speed

| Rule | Value | Source | Confidence |
|---|---|---|---|
| Action gauge | every unit has a 10,000 gauge | KQM speed guide | confirmed |
| Action value (AV) | AV = 10,000 / speed (100 speed → acts every 100 AV) | KQM; two guide snippets | confirmed |
| Timeline | the lowest AV acts; everyone's AV drops by the same amount until someone reaches 0 | KQM speed + beginner guides | confirmed |
| After acting | gauge resets: next turn 10,000 / speed away | KQM | confirmed |
| Action advance / delay | gauge −/+ 10,000 × percent (min 0); 100% advance = acts next | KQM | confirmed |
| Speed change mid-turn | remaining gauge kept, divided by the new speed | KQM | confirmed |
| Battle start | everyone starts with a full gauge (first turn at 10,000 / speed) | KQM (formula + battle-start note) | two sources agree |
| Cycles (context) | first cycle 150 AV, then 100 AV each | guide snippets | two sources agree |

## Skill points

| Rule | Value | Source | Confidence |
|---|---|---|---|
| Shared by the party | yes | KQM; Gamevika | confirmed |
| Start / max | 3 / 5 | KQM beginner guide; Gamevika | confirmed |
| Basic attack | +1 | KQM; Gamevika | confirmed |
| Skill | −1 | KQM; Gamevika | confirmed |
| Ultimate | costs none | Gamevika | confirmed |
| Carried into the next wave | yes | community knowledge, no source fetched | best guess |

## Energy and ultimates

| Rule | Value | Source | Confidence |
|---|---|---|---|
| Basic / skill / ultimate | +20 / +30 / +5 refund after casting | Gamevika; kit listings | two sources agree |
| Killing an enemy | +10 | Gamevika; Prydwen snippet | two sources agree |
| Being hit | varies by attack (typically 5-25); **we use a flat 10 per hit** for simplicity | fandom / HoYoLAB snippets | two sources agree (on "it varies"); the flat 10 is our simplification |
| Max energy | 90-140 for most characters | Gamevika; StarRailRes | confirmed |
| Ultimate ready | when energy is full; spends the whole bar | HoYoWiki | confirmed |
| Ultimate cut-in | usable any time energy is full, even during an enemy's turn, right after the current attack resolves | KQM; HoYoWiki; Gamevika | confirmed |
| Effect on turn order | none: an extra action that doesn't move anyone's AV | KQM | confirmed |
| Several ready at once | they queue; we resolve first-ready first | KQM | two sources agree (queue); order is best guess |
| Energy carried into the next wave | yes | implied by "start of each wave" effects | best guess |
| Ally gauges at wave 2 | allies keep theirs; new enemies start full | none found | best guess |

## Official auto-battle (for reference; ours uses visible rules instead)

Fires ultimates as soon as they're ready; uses skills while skill points last, often wastefully; heals only when HP is meaningfully down; targets from the left. Digital Trends https://www.digitaltrends.com/gaming/honkai-star-rail-auto-battle/ and player reports. **Best guess** (the AI is undocumented). Ours: each hero has short, named priority rules in `src/party/data.js` that you can change by name.

## Damage (simplified, for tuning feel)

| Rule | Value | Source | Confidence |
|---|---|---|---|
| Shape | multiplier × ATK × (1 + damage bonus) × DEF multiplier × resistance × crit | Prydwen (snippet) | two sources agree |
| DEF multiplier | (L + 20) / ((enemy L + 20) × (1 − DEF shred) + L + 20); equal levels = 0.5 | Prydwen; calculator | two sources agree |
| Crit | base 5% rate, 50% damage | StarRailRes | confirmed |

We drop resistances and crit at first (deterministic, readable numbers); P1 can add crit with the seeded RNG if you want it.

## Rules our sim had to pick (P1, no source: all best guess)

| Rule | Our choice | Confidence |
|---|---|---|
| Which enemy auto attacks | the living enemy with the lowest HP (`rules.autoTarget`; can be set to leftmost, closer to the official auto) | best guess |
| Enemy target | a random living hero, each hero equally likely (the source weights by role; not copied) | best guess |
| Buff, shield and debuff length | counts down at the end of the holder's own turn (a 1-turn buff lasts through its holder's next turn) | best guess (matches how kit text reads) |
| Same skill twice | refreshes; different skills stack (Hex Mark and Night Bloom both lower DEF) | best guess |
| Two shields | not added together: the bigger one stays, length refreshed | best guess |
| Debuff on a damaging move | lands after that move's hit, so it softens the next hits | best guess |
| Enemy hit | 100% of its ATK per blow (`rules.enemyHit`), through the same DEF multiplier; no crits | our simplification |
| DEF stat | only feeds shields; damage uses the level-based DEF multiplier above | our simplification |

## Role references (real characters → our four)

| Role | Real examples (base speed, max energy) | Typical numbers | Ours |
|---|---|---|---|
| Main damage | Seele (115, 120), Blade (97, 130), Himeko (96, 120) | basic 100%, skill ~200-220%, ult ~425% single | **Brann** 102 speed, 120 energy |
| Sub-damage / debuffer | Pela (105, 110), Silver Wolf (107, 110), Kafka (100, 120) | Pela ult: AoE 100% + DEF −40% | **Nyx** 115 speed, 110 energy |
| Buffer | Bronya (99, 120), Tingyun (112, 130), Robin (102, 160) | Bronya skill: 100% advance + damage buff; ult ATK +55% | **Sola** 120 speed, 120 energy |
| Sustain | Natasha (98, 90), Gepard (92, 100), March 7th (101, 120) | Gepard ult shield 45% DEF + 600 | **Aldric** 96 speed, 100 energy |

Sources: StarRailRes datamine (speed, energy: confirmed); multipliers at skill level 10 from the same data (confirmed). Character speeds sit between 90 and 115 (confirmed); enemy speeds ~80-150 (best guess).

## Mode 2: what to check

1. Wave 2 carries skill points, energy and ally turn order over (best guess, no source).
2. Flat 10 energy per hit taken instead of the real per-attack values.
3. Queued ultimates resolve first-ready first.
