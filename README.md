# Practice RPG

**Play: https://crabtoast90-dev.github.io/practice-rpg/** (add `?debug` for an FPS readout, `?mode=duel` or `?mode=party` to skip the start screen)

Throwaway practice project for testing an agent build workflow on FEEL and FAITHFULNESS: two battle modes on one site.

- **Duel:** a faithful recreation of a Legend of Dragoon boss fight with original names and KayKit models: timed-press combos, a transformation, and the rival's cinematic signature move.
- **Party:** Honkai: Star Rail-style speed-based party combat on auto-battle: four heroes against skeletons in two waves.

Tonight only the stages exist (characters standing in place). See `CLAUDE.md`, `PLAN.md` and `RESEARCH.md`.

## For developers

- Run locally: `npm install`, then `npm run dev`.
- Self-check: `npm run check` (builds, walks both modes headless on laptop and phone, screenshots to `check-output/`). `npm run check -- --url=https://crabtoast90-dev.github.io/practice-rpg/` checks the live site.
- Balance report: `npm run sim` (rewrites `BALANCE.md`). All numbers are in `src/duel/data.js` and `src/party/data.js`.
- Code: `src/duel/sim.js` and `src/party/sim.js` are the pure, seeded sims; `src/view/` only shows what they decided.
