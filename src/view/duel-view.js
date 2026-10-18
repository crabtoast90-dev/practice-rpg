import { heroTurn, rivalTurn, rivalIntent } from '../duel/sim.js';

// The duel on screen: HUD, menu and the turn loop. Every rule is the sim's; this file
// collects presses through the timing UI, hands them to the sim, and shows the result.
// Waits run on the game clock (later), so the test clock replays them exactly.
export function createDuelView({ data, battle, figures, timing, later, $ }) {
  const inputs = []; // every input sent to the sim, so the check can replay it in Node
  let phase = 'menu'; // menu | addition | resolving | defense | over
  const fig = (id) => figures.all().find((f) => f.id === id);
  const pct = (now, max) => `${max ? Math.max(0, (100 * now) / max) : 100}%`;

  function hud() {
    const { hero, rival, menu } = battle;
    $('rival-name').textContent = rival.name;
    $('rival-hp').style.width = pct(rival.hpNow, rival.hp);
    $('hero-name').textContent = hero.name;
    $('hero-dlv').textContent = `Dragoon Lv ${data.hero.dragoonLevel}`;
    $('hero-hp').style.width = pct(hero.hpNow, hero.hp);
    $('hero-hp-text').textContent = `${hero.hpNow}/${hero.hp}`;
    // One SP segment per Dragoon level, each filling as SP comes in.
    const per = data.dragoon.spPerLevel;
    $('hero-sp').innerHTML = Array.from({ length: data.hero.dragoonLevel }, (_, i) => {
      const fill = Math.max(0, Math.min(1, (hero.sp - i * per) / per));
      return `<i class="${fill === 1 ? 'full' : ''}"><b style="width:${fill * 100}%"></b></i>`;
    }).join('');
    const myTurn = phase === 'menu' && battle.next === 'hero';
    $('duel-menu').innerHTML = menu.map((m) => {
      const live = m.id === 'attack' && myTurn;
      const why = !m.enabled ? 'no escape from a boss' : m.id === 'attack' ? '' : 'comes in PLAN.md D3/D4';
      return `<button data-cmd="${m.id}" ${live ? '' : 'disabled'} title="${why}">${m.label}</button>`;
    }).join('');
    $('duel-menu').hidden = phase === 'addition' || phase === 'defense';
    const counter = data.addition.counterable;
    $('pad').innerHTML = phase === 'addition'
      ? `<button data-press="main">Press</button>${counter ? '<button data-press="counter" class="counter">Counter</button>' : ''}`
      : phase === 'defense' ? '<button data-press="dodge" class="dodge">Dodge</button><button data-press="main">Parry</button>' : '';
    $('pad').hidden = !$('pad').innerHTML;
    $('duel-note').textContent = phase === 'over'
      ? (battle.result === 'win' ? 'Victory' : 'Defeat')
      : phase === 'addition' ? `${data.addition.name}: press with each closing square` : phase === 'defense' ? 'Dodge or parry as the ring closes' : '';
    $('duel-note').hidden = !$('duel-note').textContent;
  }

  function attack() {
    if (phase !== 'menu' || battle.next !== 'hero') return;
    phase = 'addition';
    hud();
    timing.startAddition((presses) => {
      phase = 'resolving';
      const command = { cmd: 'attack', presses };
      inputs.push({ who: 'hero', command });
      heroTurn(data, battle, command);
      later(data.timingUi.afterChainMs, afterAction);
      hud();
    }, () => { fig('hero')?.play('attack'); later(data.timingUi.flashMs, () => fig('rival')?.play('hit')); });
  }

  function rival() {
    phase = 'defense';
    hud();
    const intent = rivalIntent(data, battle);
    timing.startDefense(intent, (defense) => {
      phase = 'resolving';
      inputs.push({ who: 'rival', defense });
      rivalTurn(data, battle, defense);
      later(data.timingUi.afterRivalMs, afterAction);
      hud();
    }, (hit, verdict) => {
      if (verdict === 'none' || verdict === 'early' || verdict === 'late') fig('hero')?.play('hit');
    }, () => fig('rival')?.play('attack'));
  }

  function afterAction() {
    if (battle.next === 'over') { phase = 'over'; fig(battle.result === 'win' ? 'rival' : 'hero')?.play('death'); }
    else if (battle.next === 'rival') { phase = 'resolving'; later(data.timingUi.beforeRivalMs, rival); }
    else phase = 'menu';
    hud();
  }

  $('duel-menu').onclick = (e) => { if (e.target.closest('[data-cmd="attack"]')) attack(); };
  hud();
  if (battle.next === 'rival') rival();

  return { hud, attack, phase: () => phase, inputs };
}
