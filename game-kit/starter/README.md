# {{Game name}}

**Play: {{LIVE URL}}** (`?debug` shows FPS, `?seed=N` picks a different fight, `?mode=<mode>` skips the start screen, `?tune=foe.atk:60` tries a number by name)

{{One or two lines: what the game is and what this project tests.}}

How it was built and why: `PLAN.md` (what shipped), `DECISIONS.md` (every call), `BALANCE.md` (the sims' report), `LOG.md` (sessions, time and scores){{, `RESEARCH.md` (every source number)}}.

## For developers

- Run locally: `npm install`, then `npm run dev`.
- Self-check: `npm run check` (builds, walks every screen headless on laptop and phone, screenshots to `check-output/`). `npm run check -- --url={{LIVE URL}}` checks the live site.
- Balance report: `npm run sim` (rewrites `BALANCE.md`). All numbers are in `src/<mode>/data.js`.
- Code: `src/<mode>/sim.js` is each mode's pure, seeded sim; `src/view/` only shows what it decided.
- Session time: `npm run log-time` (see `CLAUDE.md`, End of every session).
