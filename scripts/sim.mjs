// npm run sim: run both modes headlessly and rewrite BALANCE.md in plain words
// against the targets in each mode's data file.
import { writeFileSync } from 'node:fs';
import { PARTY } from '../src/party/data.js';
import { createParty, timeline, actionValue, runFight } from '../src/party/sim.js';
import { DUEL } from '../src/duel/data.js';

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
const sameTwice = JSON.stringify(runFight(PARTY, 1).events) === JSON.stringify(runFight(PARTY, 1).events);
const line = (s = '') => out.push(s);

line('# Balance report');
line();
line(`Written by \`npm run sim\` on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Do not edit by hand.`);
line();
line('## Headline');
line();
line('- Duel: not simulated yet (PLAN.md D1). Numbers checked against RESEARCH.md on 2026-10-18.');
line(`- Party: auto-battle wins ${pctOf(party.win, FIGHTS)} of ${FIGHTS} seeded fights, in ${Math.round(avg(party.turns))} turns (${Math.round(avg(party.av))} action value) on average. Damage share: ${PARTY.lineup.map((id) => `${PARTY.heroes[id].name} ${pctOf(party.perHero[id].damage, totalDamage)}`).join(', ')}. No targets set yet (PLAN.md P4).`);
line();

line('## Mode 1: Duel');
line();
line(`Status: ${DUEL.status}. Once built, this section reports win rate and fight length at four press accuracies (perfect, good player, sloppy, mashing) and how many turns until Dragoon.`);
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
