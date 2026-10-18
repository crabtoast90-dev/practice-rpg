# Game kit

Everything a new practice game needs on day one, distilled from three earlier games: **practice-glade** (exploration), **practice-skirmish** (autobattler) and **practice-rpg** (duel + party battle), all at https://github.com/crabtoast90-dev.

**Where it lives:** https://github.com/crabtoast90-dev/practice-rpg/tree/main/game-kit (folder `game-kit/` on practice-rpg's `main`).

- **Starting a new game?** Read `starter/HOW-TO-START.md`.
- **Looking for a model or animation?** Read `assets/CATALOG.md`.
- **Planning a game?** Read `docs/LESSONS.md` first.

## Folder map

```
game-kit/
├── README.md                  this file
├── starter/                   copy this into a new game's repo (HOW-TO-START.md says how)
│   ├── HOW-TO-START.md        the setup session's steps
│   ├── CLAUDE.md              one-page project rules (fill the {{...}} blanks)
│   ├── PLAN.md                lanes and items template
│   ├── DECISIONS.md           one dated line per decision; Claude's own calls marked *(my call)*
│   ├── IDEAS.md               parking lot for anything out of scope
│   ├── CREDITS.md             every third-party asset (starts with the example's KayKit models)
│   ├── LOG.md                 session log: scores, "anything annoy you?", time columns
│   ├── RESEARCH.md            source numbers with links and confidence marks
│   ├── README.md              the game's own readme template
│   ├── BALANCE.md             written by npm run sim (example report)
│   ├── index.html             start screen + one example mode
│   ├── package.json           three.js, Vite, Playwright pinned; dev / build / check / sim / log-time
│   ├── vite.config.js         relative base for GitHub Pages
│   ├── .github/workflows/     deploy.yml: every push to main deploys to GitHub Pages
│   ├── scripts/
│   │   ├── check.mjs          npm run check: headless laptop + phone, screenshots, browser-vs-Node match, --url=
│   │   ├── sim.mjs            npm run sim: seeded fights → BALANCE.md against the targets
│   │   └── log-time.mjs       npm run log-time: LOG.md time columns from the session transcript
│   ├── timelog/               one file per session, written by log-time
│   ├── src/
│   │   ├── main.js            start screen, modes, test hooks (?test ?seed ?mode ?tune ?debug, window.__game)
│   │   ├── example/           the example mode: sim.js (pure, seeded) + data.js (every number)
│   │   ├── view/              stage, KayKit figure loader, the example's playback
│   │   ├── clock.js           test clock      tune.js  ?tune by name      debug.js  FPS overlay
│   │   └── style.css
│   └── public/models/units/   Knight, Skeleton Warrior, two animation files, two weapons (2.6 MB)
├── assets/                    CC0 model library, one folder per pack, each with LICENSE.md
│   ├── CATALOG.md             what's in each pack, the shared 23-bone rig, which game used what, gaps
│   ├── kaykit-adventurers/    6 heroes, 31 weapons and props (3.0 MB)
│   ├── kaykit-skeletons/      4 skeletons, 9 skeleton weapons (1.5 MB)
│   ├── kaykit-animations/     14 animation files, 159 clips: rig-medium/, rig-large/ (12 MB)
│   └── quaternius-nature/     trees, bushes, grass, flowers: source-gltf/, web-ready/, build-web-ready.mjs (12 MB)
└── docs/
    ├── LESSONS.md             what the three games taught (scores, balance, working with Claude, process)
    └── PAINTOVER.md           the projection paint-over look workflow (from practice-skirmish)
```

## Proof it boots

The starter's own `npm run check` was run from a scratch copy (fresh `npm ci`) on 2026-10-18 and passed: Node determinism, start screen, the example fight played to the end on laptop and phone matching Node, a `?tune` Defeat run, and the `?debug` overlay, with no console errors.
