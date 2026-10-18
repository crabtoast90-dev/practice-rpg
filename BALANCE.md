# Balance report

Written by `npm run sim` on 2026-10-18 06:47 UTC. Do not edit by hand.

## Headline

- Duel: not simulated yet (PLAN.md D1). Numbers checked against RESEARCH.md on 2026-10-18.
- Party: auto-battle wins 100% of 1000 seeded fights, in 77 turns (1306 action value) on average. Damage share: Brann 53%, Nyx 39%, Sola 2%, Aldric 5%. No targets set yet (PLAN.md P4).

## Mode 1: Duel

Status: RESEARCH.md checked 2026-10-18. Once built, this section reports win rate and fight length at four press accuracies (perfect, good player, sloppy, mashing) and how many turns until Dragoon.

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

### 1000 auto fights (seeds 1-1000)

- Result: 1000 wins, 0 losses, 0 draws (win rate 100%).
- Fight length: 77 turns on average (shortest 65, longest 95) by anyone, of which 57 hero turns on average (shortest 48, longest 65). Ultimates are extra actions and don't count as turns.
- Fight length in action value: 1306 action value on average (shortest 1083, longest 1833) (a speed-100 unit acts once per 100).
- Same seed, same fight: yes (seed 1 run twice gives identical events).

hero | damage share | ultimates per fight | turns per fight | wanted to skill | starved of skill points
--- | --- | --- | --- | --- | ---
Brann | 53% | 3.0 | 15.3 | 100% of turns | 93% of turns
Nyx | 39% | 3.4 | 14.7 | 71% of turns | 18% of turns
Sola | 2% | 3.6 | 15.3 | 100% of turns | 11% of turns
Aldric | 5% | 3.1 | 11.9 | 90% of turns | 32% of turns

"Wanted to skill" = a skill rule in the hero's auto list fit the moment. "Starved" = it fit except the party lacked the skill points that rule asks for (1, or more if the rule says "skill points >= N"), so the hero fell through to a later rule.

Auto rules in use (top rule first):

- Brann: ultimate when ready → skill if skill points >= 2 → basic
- Nyx: ultimate when ready → skill on an enemy without Hex Mark → basic
- Sola: ultimate when ready → skill on Brann → basic
- Aldric: ultimate when ready → skill if anyone has no shield → skill if anyone below 50% HP → basic
