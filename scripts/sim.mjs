// npm run sim: run both modes headlessly and rewrite BALANCE.md in plain words
// against the targets in each mode's data file.
import { writeFileSync } from 'node:fs';
import { PARTY } from '../src/party/data.js';
import { createParty, timeline, actionValue, runFight } from '../src/party/sim.js';
import { DUEL } from '../src/duel/data.js';
import { playFight, perfectChainsToFall, heroPhysical, heroMagic, rivalPhysical } from '../src/duel/sim.js';

const out = [];

// Party: many seeded auto fights, summed up.
const FIGHTS = 1000;
const party = { win: 0, lose: 0, draw: 0, turns: [], av: [], heroTurns: [], perHero: {} };
for (const id of PARTY.lineup) party.perHero[id] = { damage: 0, ultimates: 0, turns: 0, wantedSkill: 0, starved: 0 };
for (let seed = 1; seed <= FIGHTS; seed++) {
  const b = runFight(PARTY, seed);
  party[b.result]++;
  party.turns.push(b.turns);
  party.av.push(b.elapsed);
  party.heroTurns.push(Object.values(b.stats).reduce((s, x) => s + x.turns, 0));
  for (const [id, st] of Object.entries(b.stats)) for (const k of Object.keys(party.perHero[id])) party.perHero[id][k] += st[k];
}
const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const pctOf = (n, d) => `${d ? Math.round((100 * n) / d) : 0}%`;
const range = (a, unit) => `${Math.round(avg(a))} ${unit} on average (shortest ${Math.round(Math.min(...a))}, longest ${Math.round(Math.max(...a))})`;
const totalDamage = Object.values(party.perHero).reduce((s, x) => s + x.damage, 0);
const winPct = (100 * party.win) / FIGHTS;
const winT = PARTY.targets.autoWinRate;
const winPass = winPct >= winT.min && winPct <= winT.max;
const winVerdict = `Target auto win rate ${winT.aim}% (accepting ${winT.min}-${winT.max}%): **${winPass ? 'PASSES' : 'FAILS'}** at ${Math.round(winPct)}%${winPass ? '' : winPct > winT.max ? ' (the party wins too often)' : ' (the party loses too often)'}.`;
const sameTwice = JSON.stringify(runFight(PARTY, 1).events) === JSON.stringify(runFight(PARTY, 1).events);
const line = (s = '') => out.push(s);

// ---- Duel: simulated fights at each press accuracy, and the perfect-chain target ----
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const duelRows = Object.entries(DUEL.accuracy).map(([key, p]) => {
  const fights = Array.from({ length: DUEL.simFights }, (_, i) => playFight(DUEL, i + 1, key));
  const wins = fights.filter((f) => f.result === 'win');
  return {
    key, p, fights,
    winPct: (100 * wins.length) / fights.length,
    turns: median(fights.map((f) => f.heroTurns)),
    rounds: median(fights.map((f) => f.actions)),
    hpLeft: mean(wins.map((f) => (100 * f.heroHp) / (DUEL.hero.hp * (DUEL.hero.soloBoost?.mult ?? 1)))),
    hitsPerChain: mean(fights.map((f) => f.hitsLanded / f.chains)),
    strikeHits: mean(fights.filter((f) => f.strikes).map((f) => f.strikeHits / f.strikes)),
    dragoon: median(fights.map((f) => f.dragoonReadyTurn ?? Infinity)),
    parries: mean(fights.map((f) => f.parries)),
    dodges: mean(fights.map((f) => f.dodges)),
  };
});
const chainTarget = DUEL.targets.perfectChainsToWin;
const chains = perfectChainsToFall(DUEL);
const chainPass = chains.result === 'win' && chains.chains === chainTarget;
const n0 = (x) => Math.round(x).toLocaleString('en-US');

line('# Balance report');
line();
line(`Written by \`npm run sim\` on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Do not edit by hand.`);
line();
line('## Headline');
line();
line(`- Duel target **${chainPass ? 'PASSES' : 'FAILS'}**: Vael falls to perfect Frenzy Chain number ${chains.chains} (target ${chainTarget}).`);
line(`- Duel win rate: ${duelRows.map((r) => `${r.p.label} ${n0(r.winPct)}% in ${r.turns} turns`).join(', ')} (Rhen's turns, median of ${DUEL.simFights} fights each; the bot turns Dragoon at ${DUEL.bot.dragoonAtSp} SP and Strikes).`);
line(`- Party: auto-battle wins ${pctOf(party.win, FIGHTS)} of ${FIGHTS} seeded fights, in ${Math.round(avg(party.turns))} turns (${Math.round(avg(party.av))} action value) on average. Damage share: ${PARTY.lineup.map((id) => `${PARTY.heroes[id].name} ${pctOf(party.perHero[id].damage, totalDamage)}`).join(', ')}. ${winVerdict}`);
line();

line('## Mode 1: Duel');
line();
line(`Numbers: ${DUEL.status}. The simulated player Attacks, parries or dodges, drinks a Healing Potion below ${DUEL.bot.healBelowPercent}% HP, turns Dragoon once SP reaches ${DUEL.bot.dragoonAtSp} and then ${DUEL.bot.dragoonSpell ? `casts ${DUEL.bot.dragoonSpell} while MP lasts, else ` : ''}uses Strike with the same press accuracy.`);
line();
line(`Dragoon damage on Vael: Strike ${DUEL.dragoon.ring.totalPercent.map((p) => heroPhysical(DUEL, p, true)).join(' / ')} for 1-5 strikes; ${DUEL.dragoon.spells.map((x) => `${x.name} ${heroMagic(DUEL, x)} (${x.mp} MP)`).join(', ')}. A perfect Frenzy Chain is ${heroPhysical(DUEL, 100)}.`);
line();
line('### Target: perfect chains to win');
line();
line(`A perfect Frenzy Chain does ${heroPhysical(DUEL, 100)} damage. Vael has ${n0(DUEL.rival.hp)} HP. Attacking only, with no Ripostes: after chain ${chainTarget - 1} he has ${n0(chains.hpAfter[chainTarget - 2] ?? 0)} HP left; he falls to chain ${chains.chains} (after his last-gasp Four Seals). Target ${chainTarget}: **${chainPass ? 'pass' : 'fail'}**.`);
line();
line('### Win rate and fight length by press accuracy');
line();
line('player | how they press | defends with | wins | fight length (Rhen turns) | all turns | HP left when winning | hits per chain (of 6) | strikes per Strike (of 5) | Dragoon first ready on Rhen turn | parries / dodges per fight');
line('--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---');
for (const r of duelRows) {
  const how = r.p.sdMs === 0 && r.p.biasMs === 0 ? 'every press on the perfect frame' : `${r.p.biasMs ? `${r.p.biasMs > 0 ? '+' : ''}${r.p.biasMs} ms off, ` : ''}spread ±${r.p.sdMs} ms${r.p.missPercent ? `, ${r.p.missPercent}% no press` : ''}${r.p.mash ? `, ${r.p.mash.presses} presses ${r.p.mash.gapMs} ms apart` : ''}`;
  line(`${r.p.label} | ${how} | ${r.p.defend} | ${n0(r.winPct)}% | ${r.turns} | ${r.rounds} | ${n0(r.hpLeft)}% | ${r.hitsPerChain.toFixed(1)} | ${r.strikeHits.toFixed(1)} | ${r.dragoon} | ${r.parries.toFixed(1)} / ${r.dodges.toFixed(1)}`);
}
line();
const mash = duelRows.find((r) => r.key === 'mashing');
line(`In plain words: Vael's hits are small against boosted Rhen (Rising Cut ${rivalPhysical(DUEL, DUEL.rival.basic.mult)}, Four Seals ${rivalPhysical(DUEL, DUEL.rival.signature.mult)}, Rhen has ${n0(DUEL.hero.hp * (DUEL.hero.soloBoost?.mult ?? 1))} HP), so ${mash.winPct >= 99 ? 'even a masher wins' : `a masher wins ${n0(mash.winPct)}%`}; the press skill decides how long the fight takes, not whether you win. There is no win-rate target yet: tell me one if you want the fight to be losable.`);
line();

line('## Mode 2: Party');
line();
const battle = createParty(PARTY, 1, 0);
line('Speed and first turn (action value = 10000 / speed; lower acts sooner):');
line();
line('unit | side | speed | first turn at');
line('--- | --- | --- | ---');
for (const u of [...battle.units].sort((a, b) => a.av - b.av)) line(`${u.name} | ${u.side} | ${u.speed} | ${actionValue(PARTY, u.speed).toFixed(1)}`);
line();
line(`Opening order, wave 1: ${timeline(PARTY, battle, 10).map((t) => t.name).join(' → ')}`);
line();
line(`### ${FIGHTS} auto fights (seeds 1-${FIGHTS})`);
line();
line(`- ${winVerdict}`);
line(`- Result: ${party.win} wins, ${party.lose} losses, ${party.draw} draws (win rate ${pctOf(party.win, FIGHTS)}).`);
line(`- Fight length: ${range(party.turns, 'turns')} by anyone, of which ${range(party.heroTurns, 'hero turns')}. Ultimates are extra actions and don't count as turns.`);
line(`- Fight length in action value: ${range(party.av, 'action value')} (a speed-100 unit acts once per 100).`);
line(`- Same seed, same fight: ${sameTwice ? 'yes (seed 1 run twice gives identical events)' : 'NO, the sim is not deterministic'}.`);
line();
line('hero | damage share | ultimates per fight | turns per fight | wanted to skill | starved of skill points');
line('--- | --- | --- | --- | --- | ---');
for (const id of PARTY.lineup) {
  const h = party.perHero[id];
  line(`${PARTY.heroes[id].name} | ${pctOf(h.damage, totalDamage)} | ${(h.ultimates / FIGHTS).toFixed(1)} | ${(h.turns / FIGHTS).toFixed(1)} | ${pctOf(h.wantedSkill, h.turns)} of turns | ${pctOf(h.starved, h.turns)} of turns`);
}
line();
line('"Wanted to skill" = a skill rule in the hero\'s auto list fit the moment. "Starved" = it fit except the party lacked the skill points that rule asks for (1, or more if the rule says "skill points >= N"), so the hero fell through to a later rule.');
line();
line('Auto rules in use (top rule first):');
line();
for (const id of PARTY.lineup) line(`- ${PARTY.heroes[id].name}: ${PARTY.heroes[id].auto.join(' → ')}`);

writeFileSync('BALANCE.md', out.join('\n') + '\n');
console.log(out.join('\n'));
