# Practice RPG

When the user asks for ideas, options, or a plan, give them that and stop.

## The game
One site, two battle modes picked on a start screen. This practice run tests FEEL and FAITHFULNESS.
- **Duel:** a 1:1 recreation of a Legend of Dragoon (PS1) boss fight: the hero (stand-in for Dart, addition Madness Hero, Dragoon level 5) against the rival (stand-in for Lloyd, one specific encounter, see `RESEARCH.md`). Timed-press additions (shrinking square), counter prompts, SP and Dragoon transformation, the Dragoon Addition (rotating ring), the DL5 spell list, the rival's basic attack and ONE signature move with a cinematic cast. Deliberate change: dodge and parry on the rival's attacks and a mid-chain counter, after Clair Obscur: Expedition 33 (`RESEARCH.md`). Menu: Attack, Dragoon, Guard, Items (2 simple items), Escape (disabled vs a boss).
- **Party:** Honkai: Star Rail-style turn-based combat with auto-battle on: four original heroes (main damage, sub-damage/debuffer, buffer, sustain), each with basic / skill / ultimate, vs 2-3 skeletons then a stronger second wave. Speed-based action order on a timeline, shared skill points (basic +1, skill -1, cap 5), energy, ultimates that cut in. Auto-battle by visible per-character priority rules the user can change by name; 1x/2x; auto off = manual. NO toughness/Break.
- On screen: ORIGINAL names and KayKit models only. No Sony or HoYoverse art, music, logos or character/move names on screen. The docs may cite the sources by name.
- Anything beyond this goes in `IDEAS.md`, not the build.

The user is a game designer (League of Legends), not a programmer: report in plain language, no code. They make design and feel calls; you make every technical call.

## How it's built
- **Sims first.** `src/duel/sim.js` and `src/party/sim.js` are pure and deterministic (seeded RNG, no three.js, no DOM, no `Math.random`, no clock). The 3D view (`src/view/`) and `src/main.js` only show what the sims decided. Never put game rules in the view.
- **Timing presses** enter the duel sim as an offset in milliseconds from the perfect frame (negative = early, `null` = no press), so tests script perfect, early, late and missed presses. The view converts a real key/tap time to that offset, minus the measured input-to-screen delay (see PLAN.md D2).
- **All numbers** live in one data file per mode: `src/duel/data.js`, `src/party/data.js`. The user asks for changes by name; never hard-code a number elsewhere. Duel numbers come from `RESEARCH.md` and carry its confidence marks.
- **`npm run sim`** rewrites `BALANCE.md`: Duel win rate and fight length at four press accuracies (perfect, good, sloppy, mashing) and turns until Dragoon; Party fight length, turns, damage share per character, ultimates per fight, skill-point starvation. Plain words against the targets the user sets. Rerun after any tuning change and quote the headline back. When the user asks for tuning you may offer three candidate tuning sets that each hit all targets (search the numbers with the sim).
- Stack: three.js (pinned; API docs https://threejs.org/llms.txt), Vite, plain JS modules. Models in `public/models/units/` (KayKit CC0, from the committed `gltf/` source folder; move what you use, credit it in `CREDITS.md`, never fetch art from other sites).
- Test hooks: `?test` freezes the clock (the check advances it with `window.__game.advance(ms)`); `window.__game.state()` / `stateText()` summarise the screen; `window.__game.enter('duel'|'party')`. `?seed=N` picks the seed, `?mode=duel|party` skips the start screen. `?debug` shows FPS and (once built) each press's offset and hit/miss. Keep them working and extend them.
- Look: simple and readable, one stage per mode (`src/view/stage.js`). The polish goes to the cinematic and the timing UI, not the arena.

## Self-check
`npm run check` builds, walks the start screen and both modes headless on laptop and phone, writes screenshots and `summary.txt` to `check-output/<timestamp>/` (last 5 kept, git-ignored). It fails on console errors, failed requests, a frozen state, figures out of frame, or a browser sim that differs from the same sim run in Node. Add steps for every feature (scripted presses for the duel, a whole auto fight for the party). `npm run check -- --url=https://crabtoast90-dev.github.io/practice-rpg/` checks the live site. Before calling anything done, open the screenshots and say in one line what you see.

## Deploy and merge rule
Every push to `main` deploys to GitHub Pages: https://crabtoast90-dev.github.io/practice-rpg/
Work on your own branch. When the check passes and you've opened the screenshots: rebase on main, rerun the check if main moved, merge to main, push. One merge at a time.

## Files to keep up to date
- `PLAN.md`: tick items when merged. `DECISIONS.md`: one dated line per user decision. `IDEAS.md`: parking lot for anything out of scope.
- `RESEARCH.md`: every source number with a link and a confidence mark; when the user corrects one, update it there AND in the data file, and log the correction in `DECISIONS.md`.
- `FRICTION.md`: when the user says "friction: ...", add a timestamped line.

## End of every session
Ask the user for fresh fun and look scores 1-5. Never carry scores over from an earlier row. Then write the `LOG.md` row yourself (the user never edits it): leave the three time columns as `-`, commit, and as your very last step run `npm run log-time -- --row="<the row's session name>" --session=<this session's id>`, then commit and merge `timelog/` and `LOG.md`. It fills the time columns from this session's transcript: Claude min (Claude working on any prompt), you min (the user replying within 20 minutes of Claude finishing; longer gaps don't count), total min (both, real time). Time when several sessions overlap is counted once. Never ask the user for minutes.
