# Balance report

Written by `npm run sim` on 2026-10-18 06:48 UTC. Do not edit by hand.

## Headline

- Duel target **PASSES**: Vael falls to perfect Frenzy Chain number 7 (target 7).
- Duel win rate: perfect 100% in 6 turns, good player 100% in 7 turns, sloppy 100% in 18 turns, mashing 100% in 35 turns (Rhen's turns, median of 1000 fights each; no Dragoon yet).
- Party: auto-battle wins 100% of 1000 seeded fights, in 77 turns (1306 action value) on average. Damage share: Brann 53%, Nyx 39%, Sola 2%, Aldric 5%. No targets set yet (PLAN.md P4).

## Mode 1: Duel

Numbers: RESEARCH.md checked 2026-10-18. Dragoon form is not in the sim yet (PLAN.md D4), so these fights are Frenzy Chains, parries / dodges and Healing Potions only; Dragoon will make every row shorter.

### Target: perfect chains to win

A perfect Frenzy Chain does 476 damage. Vael has 3,300 HP. Attacking only, with no Ripostes: after chain 6 he has 444 HP left; he falls to chain 7 (after his last-gasp Four Seals). Target 7: **pass**.

### Win rate and fight length by press accuracy

player | how they press | defends with | wins | fight length (Rhen turns) | all turns | HP left when winning | hits per chain (of 6) | Dragoon first ready on Rhen turn | parries / dodges per fight
--- | --- | --- | --- | --- | --- | --- | --- | --- | ---
perfect | every press on the perfect frame | parry | 100% | 6 | 10 | 100% | 5.5 | 2 | 10.0 / 0.0
good player | spread ±40 ms, 2% no press | parry | 100% | 7 | 12 | 98% | 4.7 | 2 | 10.1 / 0.0
sloppy | +30 ms off, spread ±90 ms, 8% no press | dodge | 100% | 18 | 30 | 86% | 2.1 | 3 | 0.0 / 12.2
mashing | -250 ms off, spread ±60 ms, 5 presses 90 ms apart | dodge | 100% | 35 | 58 | 43% | 1.0 | 4 | 0.0 / 3.4

In plain words: Vael's hits are small against boosted Rhen (Rising Cut 123, Four Seals 492, Rhen has 5,512 HP), so even a masher wins; the press skill decides how long the fight takes, not whether you win. There is no win-rate target yet: tell me one if you want the fight to be losable.

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
