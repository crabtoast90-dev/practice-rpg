# Balance report

Written by `npm run sim` on 2026-10-18 05:50 UTC. Do not edit by hand.

## Headline

- Duel: not simulated yet. Its rules and numbers wait for your check of RESEARCH.md.
- Party: combat not built yet (PLAN.md P1). Opening turn order below comes from the speeds in `src/party/data.js`.

## Mode 1: Duel

Status: awaiting RESEARCH.md check. Once built, this section reports win rate and fight length at four press accuracies (perfect, good player, sloppy, mashing) and how many turns until Dragoon.

## Mode 2: Party

Speed and first turn (action value = 10000 / speed; lower acts sooner):

unit | side | speed | first turn at
--- | --- | --- | ---
Sola | hero | 120 | 83.3
Nyx | hero | 115 | 87.0
Brann | hero | 102 | 98.0
Aldric | hero | 96 | 104.2
Bone Warrior | enemy | 90 | 111.1
Bone Minion | enemy | 83 | 120.5
Bone Minion | enemy | 83 | 120.5

Opening order, wave 1: Sola → Nyx → Brann → Aldric → Bone Warrior → Bone Minion → Bone Minion → Sola → Nyx → Brann

Once built, this section reports fight length, turns, damage share per character, ultimates per fight and skill-point starvation, against your targets.
