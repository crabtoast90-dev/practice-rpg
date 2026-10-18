# {{GAME NAME}}

When the user asks for ideas, options, or a plan, give them that and stop.

## The game
{{One paragraph: what the player does, the modes, what this project tests (feel, systems, look...). Name the scope limits: no X, no Y.}}
- On screen: original names; models from the kit's asset library (CC0) or Meshy. {{Any references the docs may cite by name but the screen may not show.}}
- Anything beyond this goes in `IDEAS.md`, not the build.

The user is a game designer (League of Legends), not a programmer: report in plain language, no code. They make design, feel and look calls; you make every technical call. Log their calls in `DECISIONS.md`; log yours there too, marked *(my call)*, so they can overturn them.

## How it's built
- **Sims first.** Each mode's rules live in `src/<mode>/sim.js`: pure and deterministic (seeded RNG, no three.js, no DOM, no `Math.random`, no clock). The 3D view (`src/view/`) and `src/main.js` only show what the sims decided. Never put game rules in the view. Player input (presses, choices) enters the sim as data, so tests can script it.
- **All numbers** live in one data file per mode: `src/<mode>/data.js`. The user asks for changes by name; never hard-code a number elsewhere. Numbers copied from a source game come from `RESEARCH.md` and carry its confidence marks.
- **`npm run sim`** rewrites `BALANCE.md`: a plain-words headline, then each mode against the targets the user set (pass / fail). Rerun after any tuning change and quote the headline back. When the user asks for tuning you may offer three candidate tuning sets that each hit all targets (search the numbers with the sim).
- Stack: three.js (pinned; API docs https://threejs.org/llms.txt), Vite, plain JS modules. Models in `public/models/`, copied from the kit's `assets/` (see its `CATALOG.md`); move only what you use, credit it in `CREDITS.md`, never fetch art from other sites (they mostly block the cloud anyway).
- Test hooks: `?test` freezes the clock (the check advances it with `window.__game.advance(ms)`); `window.__game.state()` / `stateText()` summarise the screen; `window.__game.enter('<mode>')`. `?seed=N` picks the seed, `?mode=<mode>` skips the start screen, `?tune=foe.atk:60` overrides numbers by name, `?debug` shows FPS (the cloud has no GPU: screenshots prove the look, not speed). Keep them working and extend them.

## Self-check
`npm run check` builds, walks every screen headless on laptop and phone, writes screenshots and `summary.txt` to `check-output/<timestamp>/` (last 5 kept, git-ignored). It fails on console errors, failed requests, a frozen state, figures out of frame, or a browser sim that differs from the same sim run in Node. Add steps for every feature. `npm run check -- --url={{LIVE URL}}` checks the live site. Before calling anything done, open the screenshots and say in one line what you see; fix what looks wrong before merging.

## Deploy and merge rule
Every push to `main` deploys to GitHub Pages: {{LIVE URL}}
Work on your own branch. When the check passes and you've opened the screenshots: rebase on main, rerun the check if main moved, merge to main, push. One merge at a time.

## Files to keep up to date
- `PLAN.md`: tick items when merged. `DECISIONS.md`: one dated line per decision. `IDEAS.md`: parking lot for anything out of scope.
- `RESEARCH.md`: every source number with a link and a confidence mark; when the user corrects one, update it there AND in the data file, and log the correction in `DECISIONS.md`.
- `CREDITS.md`: every third-party asset with source and license, as soon as it lands.

## End of every session
Ask the user for fresh fun and look scores 1-5 (never carry scores over from an earlier row), and ask: "Anything annoy you this session?" Put their answer, in their words, in the row's notes. Then write the `LOG.md` row yourself (the user never edits it): leave the three time columns as `-`, commit, and as your very last step run `npm run log-time -- --row="<the row's session name>" --session=<this session's id>`, then commit and merge `timelog/` and `LOG.md`. It fills the time columns from this session's transcript: Claude min (Claude working on any prompt), you min (the user replying within 20 minutes of Claude finishing; longer gaps don't count), total min (both, real time). Time when several sessions overlap is counted once. Never ask the user for minutes.
