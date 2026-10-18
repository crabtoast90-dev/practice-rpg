# Lessons from the three practice games

Drawn from the LOG, DECISIONS, BALANCE, RESEARCH, PLAN and FRICTION files of:
- **practice-glade** (2026-10-13 to 10-16): golden-hour exploration, find five lanterns. 12 sessions. Fun 1 → 2.3, look 1 → 2.7.
- **practice-skirmish** (2026-10-17 to 10-18): tabletop autobattler, "Diorama Skirmish". 11 sessions, 226 min logged (Claude 185, you 61). Fun 1 → 2.7, look 2 → 2.8 (3.2 with the painted look).
- **practice-rpg** (2026-10-18): Legend of Dragoon-style duel + Star Rail-style party battle. 7 sessions, 125 min logged (Claude 98, you 41). Duel fun 1 → 4.1, look 1.8 → 3; Party fun 2.8, look 2.4.

No session in any game hit the usage cap.

## What moved the scores

1. **Feel features moved fun the most; arena work didn't.** In practice-rpg the timed-press UI took fun from 1 to 2.9 in one session, the transformation to 3.7, the rival's cinematic to 4.1 (and look from 2.2 to 3). Nothing in the arena changed. The brief's rule "polish goes to the cinematic and the timing UI, not the arena" was right; reuse it.
2. **Content moved look more than lighting.** practice-glade's lighting and grade pass was "only mildly noticeable" (look 2.2); real trees and props took it to 2.7. practice-skirmish's first diorama pass was "too dark" and stayed at 2.2 after brightening. Get the things on screen right, then light them.
3. **CC0 packs beat generated props.** glade's Meshy-only props were "fine but not very high quality and sparsely populated" (2.5); swapping in the Quaternius pack gave "looks solid" (2.7). Meshy is good for the odd missing piece (pines, rocks, a lantern), not a whole set.
4. **The paint-over trick works for fixed cameras.** practice-skirmish's projection paint-over added +0.4 look ("definitely looks better, not drastically") for 63 Meshy credits, 21 of them wasted on extra paintings. See `PAINTOVER.md`.
5. **Systems without feel plateau.** practice-skirmish was mostly sim and balance work and ended at fun 2.7; practice-rpg's Party (all systems, auto-battle) sat at 2.8 while its Duel reached 4.1.

## Sims and balance

1. **Sim first paid off every time.** A pure, seeded sim plus `npm run sim` let every tuning call be checked in seconds, and the check could prove the screen showed the same fight as Node. Keep it non-negotiable.
2. **Set targets early, as numbers with a range.** Targets in the data file ("auto win rate 70%, accept 65-75%") give BALANCE.md a pass / fail headline. Without one, the report can only describe (practice-rpg's Duel: "even a masher wins 100%", no target ever set).
3. **Offer three tuning sets instead of nudging one number at a time.** practice-skirmish tuned its skeletons in four swings (+50%, +75%, -35%, +18%) and still closed with the boss at 7% against a 33% target. practice-rpg offered three candidate sets that each hit the target; the user picked one and it landed (100% → 72%, target 70%) in one round.
4. **Check cooldowns against fight length.** In practice-skirmish every special fired less than once a fight because fights (~9-12 s) ended near the first cooldown (8 s). Put "does each ability get used?" in the balance report from day one.
5. **The report surfaces role problems you didn't ask about.** practice-rpg's Party: the main damage dealer was starved of skill points on 90% of turns, the buffer and the sustain did under 10% of the damage. Report damage share and resource starvation per character.
6. **Translate faithful numbers into a feel target.** practice-rpg copied the source numbers first (with sources and confidence marks), then the user said "exact numbers matter less than feel: win after 7 perfect chains", and the boss's HP was set to hit that. Research first, then turn it into one feel target the sim checks.
7. **Research gets corrected; keep it checkable.** The user caught a stat boost applied to the wrong side and an encounter detail. RESEARCH.md with links and confidence marks ("best guess" = check this) made those corrections quick, and logging them in DECISIONS.md kept the data file honest.

## Working with Claude

1. **Mark Claude's own calls.** practice-skirmish shipped two rules that were "my reading" ("lose = replay the round", "retries pay income") and the user reversed both. practice-rpg marked every such line *(my call)* in DECISIONS.md, so they were easy to spot and overturn. Kept in the starter.
2. **Look at the screenshots before merging.** practice-rpg's cinematic had a close-up that was too tight, a camera inside the light pillars and buttons showing during the film on phone; all caught from the check's screenshots and fixed before merge.
3. **Test hooks earn their keep.** `?tune` let the check play a Defeat the real numbers can't produce; `?mode` skipped menus; scripted presses (millisecond offsets) tested perfect, early, late and missed timing without a human. Add a hook whenever a path can't be reached by playing.
4. **Name shared files in the plan.** Items running in parallel all touched `main.js` and `check.mjs`; listing SHARED files per item made the rebases expected, not surprises. In glade, an item whose file list left out `check.mjs` shipped without its phone screenshot.
5. **Parallel lanes work.** practice-skirmish ran four sessions at once (sim, shop, look, models) and merged them in an hour; one session owning the whole look avoided clashes.
6. **Phone gets skipped by humans, not by the check.** The user skipped phone playtests in practice-rpg; the check's phone run still caught framing and button problems. Keep phone in every check.
7. **Keyboard beats on-screen buttons for timing on laptop.** practice-rpg moved the timed press to the Space bar; tap buttons only on touch screens.

## Process

1. **Measure time automatically.** practice-glade asked for minutes by hand (directing / reviewing / playing) and got rough guesses; `npm run log-time` (from practice-skirmish on) reads them from the transcript and counts overlapping sessions once.
2. **Fresh scores every session.** glade carried scores over on its last rows, which hid whether anything changed. Ask every time.
3. **FRICTION.md was barely used.** One entry in three games (glade: CC0 sites blocked from the cloud). The starter replaces it with one question at the end of each session ("Anything annoy you this session?"), logged in the LOG notes.
4. **The cloud can't download most art.** Kenney, poly.pizza, GitHub archives and Google Drive all failed from the cloud in glade. Commit packs to the repo (now: the kit's `assets/`) and copy from there.
5. **Every game skipped the polish pass.** All three closed E1 (playtest fixes) unused: once the question was answered, the user moved on. Plan short; put the release check straight after the last feature.
6. **Setup takes about half an hour** (skirmish 31 min, rpg 28 min) when the conventions are copied; this starter should cut that.
7. **Clean `public/` at release.** practice-rpg removed unused model files before release; source packs stay elsewhere (now the kit).
