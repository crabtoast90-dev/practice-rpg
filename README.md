# Practice RPG

**Play: https://crabtoast90-dev.github.io/practice-rpg/** (`?mode=duel` or `?mode=party` skips the start screen; `?debug` shows FPS, each press's offset and verdict, and the input-delay calibration; `?tune=rival.atk:300` tries a Duel number by name)

Throwaway practice project for testing an agent build workflow on FEEL and FAITHFULNESS: two battle modes on one site.

- **Duel:** a recreation of a Legend of Dragoon boss fight with original names and KayKit models. Rhen against his rival Vael: the Frenzy Chain addition (press **Space** / X as each square closes), dodge (**Z**) and parry (**Space**) on Vael's hits with a Riposte for a full parry, Guard, two potions, Escape refused, Dragoon form at 100 SP (the rotating-ring Strike and four fire spells), and Vael's Four Seals with a cinematic (skippable after the first time). Tap buttons replace the keys on touch screens.
- **Party:** Honkai: Star Rail-style speed-based party combat: four heroes against skeletons in two waves, a live turn timeline, shared skill points, energy and ultimates that cut in, auto-battle by visible per-hero rules, 1x / 2x, and manual mode.

How it was built and why: `PLAN.md` (what shipped), `DECISIONS.md` (every call), `RESEARCH.md` (every source number), `BALANCE.md` (the sims' report), `LOG.md` (sessions, time and scores).

## For developers

- Run locally: `npm install`, then `npm run dev`.
- Self-check: `npm run check` (builds, walks both modes headless on laptop and phone, screenshots to `check-output/`). `npm run check -- --url=https://crabtoast90-dev.github.io/practice-rpg/` checks the live site.
- Balance report: `npm run sim` (rewrites `BALANCE.md`). All numbers are in `src/duel/data.js` and `src/party/data.js`.
- Code: `src/duel/sim.js` and `src/party/sim.js` are the pure, seeded sims; `src/view/` only shows what they decided.
