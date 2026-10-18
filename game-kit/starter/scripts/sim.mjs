// npm run sim: play many seeded fights headlessly and rewrite BALANCE.md in plain words
// against the targets in each mode's data file. Rerun after any tuning change and quote
// the headline back. Add a section per mode, and a line per thing worth measuring.
import { writeFileSync } from 'node:fs';
import { EXAMPLE } from '../src/example/data.js';
import { runFight } from '../src/example/sim.js';

const out = [];
const line = (s = '') => out.push(s);
const avg = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);

// ---- Example mode ----
const N = EXAMPLE.simFights;
const fights = Array.from({ length: N }, (_, i) => runFight(EXAMPLE, i + 1));
const count = (r) => fights.filter((f) => f.result === r).length;
const winPct = (100 * count('win')) / N;
const T = EXAMPLE.targets.heroWinRate;
const pass = winPct >= T.min && winPct <= T.max;
const verdict = `Target hero win rate ${T.aim}% (accepting ${T.min}-${T.max}%): **${pass ? 'PASSES' : 'FAILS'}** at ${Math.round(winPct)}%${pass ? '' : winPct > T.max ? ' (the hero wins too often)' : ' (the hero loses too often)'}.`;
const sameTwice = JSON.stringify(runFight(EXAMPLE, 1).events) === JSON.stringify(runFight(EXAMPLE, 1).events);
const actions = fights.map((f) => f.actions);

line('# Balance report');
line();
line(`Written by \`npm run sim\` on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Do not edit by hand.`);
line();
line('## Headline');
line();
line(`- Example: ${verdict} Fights last ${avg(actions).toFixed(1)} actions on average.`);
line();
line('## Mode: Example');
line();
line(`${N} seeded fights (seeds 1-${N}):`);
line();
line(`- ${verdict}`);
line(`- Result: ${count('win')} wins, ${count('lose')} losses, ${count('draw')} draws.`);
line(`- Fight length: ${avg(actions).toFixed(1)} actions on average (shortest ${Math.min(...actions)}, longest ${Math.max(...actions)}).`);
line(`- Same seed, same fight: ${sameTwice ? 'yes (seed 1 run twice gives identical events)' : 'NO, the sim is not deterministic'}.`);

writeFileSync('BALANCE.md', out.join('\n') + '\n');
console.log(out.join('\n'));
