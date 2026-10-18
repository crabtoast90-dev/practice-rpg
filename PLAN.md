# Plan

Each item can be pasted alone into a fresh builder session. Every session reads `CLAUDE.md` first, follows the merge rule, adds steps to `npm run check` for what it builds, and reruns `npm run sim` if it touches a sim or a data file.

**Lanes:** items in different lanes touch different files and can run at the same time. Inside a lane, items run in order unless they say otherwise. "After X" means wait until X is merged.
**SHARED files:** `src/main.js`, `index.html`, `src/style.css`, `scripts/check.mjs` and `scripts/sim.mjs` are touched by both lanes. Items name them when they touch them; two items that share a file can still run in parallel, but the second to merge must rebase and rerun the check. In `scripts/sim.mjs` each lane only edits its own mode's section.

**Gate:** every Lane D item waits for the user's check of `RESEARCH.md` (Mode 1). Lane P can start now.

## Setup (done 2026-10-18)
- [x] **0. Setup.** Scaffold copied from practice-skirmish (check, Pages deploy, log-time, LOG.md), KayKit models, start screen with both modes, each stage with its characters standing in place, `RESEARCH.md`, this plan.

## Lane P: Party (can start now)

- [ ] **P1. Party combat in the sim.** The whole fight in `src/party/sim.js`, pure and seeded: action value timeline (10000 / speed, reset after acting, action advance), shared skill points (start 3, basic +1, skill -1, cap 5, carried into wave 2), energy (basic, skill, ultimate refund, hit taken, kill, from `rules.energy`), ultimates that cut in the moment energy is full (after the current action, queued first-ready first), each hero's basic / skill / ultimate as written in `src/party/data.js`, simple enemy attacks (random living hero, seeded), wave 2 when wave 1 dies, win when wave 2 dies, lose when all heroes fall. Auto-battle: each hero's priority rules written as named, readable rules in the data file (e.g. `brann.auto = ['ultimate when ready', 'skill if skill points >= 2', 'basic']`), interpreted by the sim. Every action emits an event the view can play back. Files: `src/party/sim.js`, `src/party/data.js`, `scripts/sim.mjs` (SHARED, Party section), `scripts/check.mjs` (SHARED, Node determinism line).
  *Done when:* `npm run sim` reports over 1000 seeded auto fights: win rate, fight length (turns and action value), damage share per hero, ultimates per hero per fight, and skill-point starvation (% of turns a hero wanted to skill but had no point); the same seed gives the same fight twice.

- [ ] **P2. Party fight on screen, auto.** After P1. Play the sim's events back: attack / cast / hit / death animations, damage and shield numbers, the timeline panel updating live (ultimate cut-ins shown as an inserted entry), skill-point diamonds, energy bars, an ultimate banner with a short camera push-in, wave 2 arriving, a Victory / Defeat banner and Play again. 1x / 2x speed button. Files: new `src/view/party-view.js`, `src/main.js` (SHARED), `index.html` (SHARED), `src/style.css` (SHARED), `src/view/units.js` (clips only), `scripts/check.mjs` (SHARED).
  *Done when:* the check plays a seeded auto fight to the end on laptop and phone, screenshots an ultimate cut-in and wave 2, and the browser's result equals Node's for the same seed.

- [ ] **P3. Manual mode and visible auto rules.** After P2. Auto toggle: off = on your hero's turn pick Basic or Skill (greyed with no skill points) and a target; an Ultimate button lights on each card when energy is full and can be pressed at any time (cuts in). A small "Auto rules" panel shows each hero's rules in plain words, straight from the data file. Manual choices enter the sim as the same commands auto uses. Files: `src/party/sim.js` (command input only), `src/view/party-view.js`, `index.html` (SHARED), `src/style.css` (SHARED), `scripts/check.mjs` (SHARED).
  *Done when:* the check plays a scripted manual fight (including an ultimate cut into an enemy's turn) that matches Node, and screenshots the rules panel.

- [ ] **P4. Party targets and tuning.** After P1. The user sets targets (e.g. fight length, damage shares, ultimates per fight, starvation); add them to `src/party/data.js` and make `BALANCE.md` say pass / fail in plain words. On request, search the numbers with the sim and offer three candidate tuning sets that each hit every target. Files: `src/party/data.js`, `scripts/sim.mjs` (SHARED, Party section).
  *Done when:* each tuning call is a dated line in `DECISIONS.md` and the new headline is quoted back.

## Lane D: Duel (waits for the RESEARCH.md check)

- [ ] **D1. Duel rules in the sim.** After the user's RESEARCH.md check. Move the checked numbers into `src/duel/data.js` (stats, Madness Hero hits, per-hit windows in ms, damage and SP per hit, counter rules, Dragoon rules, spells, the rival's attacks, items, Guard). Build `src/duel/sim.js`: turn order by speed, Attack = the addition chain fed press offsets in ms (`null` = no press; a miss ends the chain; the rival's counter prompt needs the counter button instead), damage formula, SP gain, Guard, the 2 items, Escape refused, the rival's AI (basic attack + the signature move per RESEARCH.md), win / lose. Events for every hit, press verdict and counter. Files: `src/duel/sim.js`, `src/duel/data.js`, `scripts/sim.mjs` (SHARED, Duel section), `scripts/check.mjs` (SHARED, Node test of scripted perfect / early / late / missed presses).
  *Done when:* `npm run sim` reports win rate and fight length at four press accuracies (perfect, good player, sloppy, mashing; each defined in the data file as an offset spread) and turns until Dragoon is first available, and scripted presses give the exact hit counts RESEARCH.md predicts.

- [ ] **D2. The timing input (feel item).** After D1; can run alongside D3. The shrinking-square addition UI: an outer square closing on the target square in time with each hit, the source's success flash, the counter variant. Press capture on keyboard (X / space, and the counter key) and tap, timestamped from the input event and converted to an offset from the perfect frame. Measure input-to-screen delay (frame presentation timing, plus an optional tap-to-the-flash calibration stored per device) and subtract it; show the measured delay in `?debug`. `?debug` overlay: each press's offset in ms and hit / miss, last 10 presses. Files: new `src/view/timing.js`, new `src/input.js`, `src/main.js` (SHARED), `src/style.css` (SHARED), `scripts/check.mjs` (SHARED).
  *Done when:* the check injects presses at -40, 0, +40 ms and a missed press via the test clock and the overlay shows the matching verdicts; the user tries it on their laptop and phone and gives a feel note.

- [ ] **D3. Duel on screen: menu, playback, result.** After D1. Attack / Dragoon / Guard / Items menu working (Escape greyed with "can't escape"), HP / SP bars and SP segments filling, hero and rival attack / hit / guard animations, damage numbers, Victory / Defeat and Play again. Files: new `src/view/duel-view.js`, `src/main.js` (SHARED), `index.html` (SHARED), `src/style.css` (SHARED), `scripts/check.mjs` (SHARED).
  *Done when:* the check plays a scripted perfect-press fight to Victory and a no-press fight to Defeat, both matching Node.

- [ ] **D4. Dragoon.** After D2 and D3. Transformation (short flash, recolour / glow and wings on the hero model, Dragoon HUD), Dragoon turns equal to the rules in RESEARCH.md, the Dragoon Addition (the rotating ring press) with its own timing in the sim and on screen, the DL5 spell list with MP costs and effects, reverting when turns run out. Files: `src/duel/sim.js`, `src/duel/data.js`, `src/view/duel-view.js`, `src/view/timing.js`, `scripts/check.mjs` (SHARED).
  *Done when:* the check transforms, lands a scripted ring press sequence, casts each spell once, and reverts on schedule; matches Node.

- [ ] **D5. The rival's cinematic.** After D3. The signature move: camera cuts (wide, close on the rival, over-the-shoulder on the hero), slowdown, a dramatic beat (pause, flash, title card with the move's on-screen name), then the hit. Skippable with any key after the first time. Files: new `src/view/cinematic.js`, `src/view/duel-view.js`.
  *Done when:* the check screenshots each camera beat on laptop and phone; the user gives a look score.

## Ship

- [ ] **E1. Playtest fixes.** After the user plays. One session per batch of notes; each note becomes a line here first.
- [ ] **E2. Release.** Last. Live-site check, README and CREDITS complete, LOG.md up to date, final `npm run sim`.
  *Done when:* the live-site check passes and its screenshots are described in one line each.
