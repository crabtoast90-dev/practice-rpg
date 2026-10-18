# Decisions

One dated line per decision the user makes. Lines marked *(my call)* are technical or naming calls I made; the user can overturn any of them.

- 2026-10-18: Third practice game tests FEEL and FAITHFULNESS: one site, start screen, two modes. Duel = 1:1 recreation of a Legend of Dragoon boss fight (Dart with Madness Hero at Dragoon level 5 vs one Lloyd encounter); Party = Honkai: Star Rail core loop on auto-battle (no Break).
- 2026-10-18: Original names and KayKit models on screen; no Sony / HoYoverse art, music, logos or names. Docs may cite sources.
- 2026-10-18: Research first: RESEARCH.md with source links and confidence marks; Duel tuning waits for the user's check. Party work can start now.
- 2026-10-18: Conventions copied from practice-skirmish (CLAUDE.md shape, check, Pages deploy, log-time, LOG.md, end-of-session rule).
- 2026-10-18: Timing presses enter the sim as millisecond offsets from the perfect frame; ?debug shows offsets and verdicts; input-to-screen delay is measured and accounted for.
- 2026-10-18 *(my call)*: On-screen names: hero **Rhen** (Dart's stand-in, KayKit Knight with a sword, no shield), rival **Vael** (Lloyd's stand-in, hooded KayKit Rogue with a sword). Party: **Brann** main damage (Barbarian), **Nyx** sub-damage / debuffer (Rogue), **Sola** buffer (Mage), **Aldric** shield sustain (Knight). Skeletons: Bone Minion, Bone Warrior, Bone Caster, Bone Stalker. Ability names are original too (in the data files).
- 2026-10-18 *(my call)*: The Duel menu keeps the word "Dragoon" (a plain English word) as the command label, as the brief lists it. Say if you want it renamed.
- 2026-10-18 *(my call)*: The report file is `BALANCE.md` (same as practice-skirmish), written by `npm run sim`.
- 2026-10-18: RESEARCH.md check: Lloyd at Flanvel Tower (Disc 3) is the encounter; HP 6,000; basic Punch Slash, signature Four Pillar Spell Dome (opener + last gasp), other moves left out; hero Lv35 with Disc 3 gear, Madness Hero addition level 5; solo hero.
- 2026-10-18: Madness Hero hit count questioned ("more than 5 hits"); retail data re-read: 6 damage hits from 5 presses. Kept at 6; speed to be judged by feel.
- 2026-10-18: Counters added as a deliberate change, modelled on Expedition 33's dodge and parry (RESEARCH.md "Dodge and parry"). The details there are my calls until the user plays them.
- 2026-10-18: Lloyd's stats +100% for a solo fight (the original is 3 heroes). Applied to AT, DF, MAT, MDF; HP and speed pending the user's answer to the squared-AT warning in RESEARCH.md.
