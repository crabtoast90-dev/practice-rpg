// npm run sim: run both modes headlessly and rewrite BALANCE.md in plain words
// against the targets in each mode's data file. Tonight only the set-up exists, so
// it reports what the sims can already answer and lists what's still to come.
import { writeFileSync } from 'node:fs';
import { PARTY } from '../src/party/data.js';
import { createParty, timeline, actionValue } from '../src/party/sim.js';
import { DUEL } from '../src/duel/data.js';

const out = [];
const line = (s = '') => out.push(s);

line('# Balance report');
line();
line(`Written by \`npm run sim\` on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Do not edit by hand.`);
line();
line('## Headline');
line();
line('- Duel: not simulated yet. Its rules and numbers wait for your check of RESEARCH.md.');
line('- Party: combat not built yet (PLAN.md P1). Opening turn order below comes from the speeds in `src/party/data.js`.');
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
line('Once built, this section reports fight length, turns, damage share per character, ultimates per fight and skill-point starvation, against your targets.');

writeFileSync('BALANCE.md', out.join('\n') + '\n');
console.log(out.join('\n'));
