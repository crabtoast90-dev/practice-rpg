// Example mode on screen: plays back the events the sim decided, one action at a time
// on the game clock. No rules here: the sim already knows how the fight ends.
import { createBattle, step, fightDigest } from '../example/sim.js';

export function createExampleView({ data, seed, figures, stage, $, onRestart }) {
  const battle = createBattle(data, seed);
  for (const u of battle.units) figures.spawn(u.id, u.model, { ...stage.spots[u.id], height: 1.7 });
  const shown = { hero: data.hero.hp, foe: data.foe.hp }; // HP as the screen shows it
  let wait = data.playback.firstActionMs;
  let pendingHit = null;
  let applied = 0; // events played so far
  let result = null;

  $('example-hud').hidden = false;
  $('example-end').hidden = true;
  $('again').onclick = onRestart;
  $('hero-name').textContent = data.hero.name;
  $('foe-name').textContent = data.foe.name;

  function draw() {
    $('hero-hp').style.width = `${(100 * shown.hero) / data.hero.hp}%`;
    $('foe-hp').style.width = `${(100 * shown.foe) / data.foe.hp}%`;
    $('hero-hp-text').textContent = `${shown.hero}/${data.hero.hp}`;
    $('foe-hp-text').textContent = `${shown.foe}/${data.foe.hp}`;
  }
  draw();

  function play(ev) {
    applied++;
    if (ev.type === 'attack') {
      figures.get(ev.who).play('attack');
      pendingHit = { at: data.playback.hitAtMs, ev, then: [] };
    } else if (pendingHit) {
      pendingHit.then.push(ev); // a fall or the result waits for the blow to land
      applied--;
    } else if (ev.type === 'down') {
      figures.get(ev.who).play('death');
    } else if (ev.type === 'end') {
      result = ev.result;
      $('example-result').textContent = { win: 'Victory', lose: 'Defeat', draw: 'Draw' }[result];
      $('example-end').hidden = false;
    }
  }

  return {
    battle,
    update(dtMs) {
      if (pendingHit && (pendingHit.at -= dtMs) <= 0) {
        const { ev, then } = pendingHit;
        pendingHit = null;
        shown[ev.target] = ev.hpLeft;
        if (ev.hpLeft > 0) figures.get(ev.target).play('hit');
        draw();
        for (const e of then) play(e);
      }
      if (result || (wait -= dtMs) > 0) return;
      wait = data.playback.actionMs;
      for (const ev of step(data, battle)) play(ev);
    },
    state: () => ({ applied, result, shown: { ...shown }, digest: fightDigest(battle.events) }),
    dispose() { $('example-hud').hidden = true; },
  };
}
