# Plan

Each item can be pasted alone into a fresh builder session. Every session reads `CLAUDE.md` first, follows the merge rule, adds steps to `npm run check` for what it builds, and reruns `npm run sim` if it touches a sim or a data file.

**Lanes:** items in different lanes touch different files and can run at the same time. Inside a lane, items run in order unless they say otherwise. "After X" means wait until X is merged.
**SHARED files:** `src/main.js`, `index.html`, `src/style.css`, `scripts/check.mjs` and `scripts/sim.mjs` are touched by most items. Items name them when they touch them; two items that share a file can still run in parallel, but the second to merge must rebase and rerun the check. In `scripts/sim.mjs` each lane only edits its own mode's section.

## Setup
- [ ] **0. Setup.** Starter copied from the game kit (see the kit's `starter/HOW-TO-START.md`), example mode replaced by this game's first mode standing on screen, `RESEARCH.md` if the game copies a source, this plan, Pages deploy, check passing on the live site.

## Lane A: {{the sim / rules}}

- [ ] **A1. {{Item}}.** {{What to build, in plain words.}} Files: {{files}}.
  *Done when:* {{what the check or BALANCE.md shows}}.

## Lane B: {{on screen}}

- [ ] **B1. {{Item}}.** After A1. {{...}}
  *Done when:* {{check screenshots on laptop and phone show ...}}.

## Lane C: the look (ONE session owns all of it)

- [ ] **C1. {{Look}}.** Lighting first. {{...}}
  *Done when:* the check saves the look screenshots and you describe each in one line; the user gives a look score.

## Ship

- [ ] **E1. Playtest fixes.** After the user's playtest. One session per batch of notes; each note becomes a line here first.
- [ ] **E2. Release.** Last. Live-site check, README and CREDITS complete, LOG.md up to date, final `npm run sim`.
  *Done when:* the live-site check passes and its screenshots are described in one line each.
