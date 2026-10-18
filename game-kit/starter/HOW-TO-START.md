# How to start a new game from the starter

For the **setup session** of a new project (session 0). Claude follows these steps; the user only does the two marked **(you)**.

## Before the session (you)
1. Create an empty public GitHub repo for the game (no README), e.g. `crabtoast90-dev/practice-<name>`.
2. Start the setup session with that repo attached, and give Claude the one-page brief (what the game is, what it tests, scope limits).

## Steps (Claude)

1. **Get the kit.** Clone it to a scratch folder (it is public, no credentials needed):
   `git clone --depth 1 https://github.com/crabtoast90-dev/practice-rpg /tmp/kit-repo` and use `/tmp/kit-repo/game-kit/` as the kit (it lives on practice-rpg's `main`, folder `game-kit/`). Below, `/tmp/kit` means that folder.
2. **Copy the starter into the repo root, hidden files included:**
   `cp -r /tmp/kit/starter/. .` then delete `HOW-TO-START.md` from the copy. Check that `.github/workflows/deploy.yml` and `.gitignore` came across.
3. **Name it.** `package.json` and `package-lock.json` `"name"`, the `<title>` and start screen in `index.html`, and every `{{...}}` in `CLAUDE.md`, `README.md`, `PLAN.md`, `DECISIONS.md` (the live URL is `https://<owner>.github.io/<repo>/`).
4. **Install and prove it boots before changing anything:** `npm ci`, `npm run check`. It must pass as copied; if it doesn't, the environment is the problem, fix that first.
5. **Replace the example with the game's first mode.** Rename `src/example/` to `src/<mode>/` (sim + data), `src/view/example-view.js` to `src/view/<mode>-view.js`, the stage in `src/view/stage.js`, the `FIGURES` in `src/view/units.js`, and the mode's sections in `scripts/check.mjs` and `scripts/sim.mjs`. Keep the shapes: pure seeded sim, one data file per mode, the check comparing browser and Node, the sim writing `BALANCE.md` against targets in the data file. A second mode = a second folder, a second start-screen button, a second section in each script.
6. **Models.** Copy what the game uses from the kit's `assets/` (see `assets/CATALOG.md`) into `public/models/`; remove the starter's Knight / Skeleton files if unused; update `CREDITS.md` the same day. Any KayKit character plays any `Rig_Medium_*` clip (shared 23-bone rig).
7. **Docs.** Fill `PLAN.md` with lanes and items (each pasteable alone into a fresh session, with files and a *Done when*), log the brief's calls in `DECISIONS.md`, start `RESEARCH.md` if the game copies a source game (or delete it), and read the kit's `docs/LESSONS.md`. If the look matters and the camera is fixed, read `docs/PAINTOVER.md`.
8. **Deploy.** Commit, push to `main`. **(you)** If the first deploy fails with a Pages error: repo Settings → Pages → Source: **GitHub Actions**, then re-run the workflow. Then `npm run check -- --url=<live URL>` must pass too.
9. **End the session** as `CLAUDE.md` says: fresh fun and look scores, "Anything annoy you this session?", the `LOG.md` row, `npm run log-time` last.

## What the starter already does
- Vite + three.js (versions pinned in `package.json`), relative base so it works on GitHub Pages.
- `npm run check`: Node determinism, build, headless laptop and phone runs, screenshots + `summary.txt` in `check-output/`, fails on console errors, failed requests, frozen animation, figures out of frame, browser fight different from Node; `--url=` for the live site; a `?tune` Defeat run and a `?debug` run.
- `npm run sim` → `BALANCE.md` with a pass / fail headline against `targets` in the data file.
- `npm run log-time` → time columns in `LOG.md` from the session transcript (one file per session in `timelog/`).
- Hooks: `?test`, `?seed=N`, `?mode=<mode>`, `?tune=path:value`, `?debug`, `window.__game.state() / stateText() / enter() / advance(ms)`.
