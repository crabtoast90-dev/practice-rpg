import { heroTurn, rivalTurn, rivalIntent } from '../duel/sim.js';

// The duel on screen: HUD, menu, the turn loop, damage numbers and the result.
// Every rule is the sim's: presses go to it as millisecond offsets, and numbers shown
// mid-move come from running the sim ahead on a copy of the battle (preview).
// Waits run on the game clock (later), so the test clock replays them exactly.
export function createDuelView({ data, battle, figures, timing, later, now, anchor, restart, $ }) {
  const ui = data.timingUi;
  // Touch screens get tap buttons for the presses; with a keyboard you press keys (user call).
  const touch = matchMedia('(pointer: coarse)').matches;
  const keyName = (code) => code.replace(/^Key/, '');
  const keysFor = (button) => ui.keys[button].map(keyName).join(' / ');
  const inputs = []; // every input sent to the sim, so the check can replay it in Node
  let phase = 'menu'; // menu | items | addition | resolving | defense | over
  let note = '';
  const floats = []; // rising numbers and words: { text, kind, at, born }
  const fig = (id) => figures.all().find((f) => f.id === id);
  const play = (id, clip) => fig(id)?.play(clip);
  const pct = (n, max) => `${max ? Math.max(0, (100 * n) / max) : 100}%`;
  const pop = (at, text, kind) => floats.push({ at, text: String(text), kind, born: now() });
  const preview = (fn) => { const copy = structuredClone(battle); return fn(copy); };

  function hud() {
    const { hero, rival } = battle;
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
    const myTurn = (phase === 'menu' || phase === 'items') && battle.next === 'hero';
    const menu = $('duel-menu');
    if (phase === 'items') {
      menu.innerHTML = data.items.map((it) => `<button data-item="${it.name}" ${hero.items[it.name] ? '' : 'disabled'}>${it.name} ×${hero.items[it.name]}</button>`).join('') + '<button data-cmd="back">Back</button>';
    } else {
      menu.innerHTML = battle.menu.map((m) => {
        if (!m.enabled) return `<button data-cmd="${m.id}" class="off" title="no escape from a boss" ${myTurn ? '' : 'disabled'}>${m.label}</button>`;
        if (m.id === 'dragoon') return `<button data-cmd="dragoon" class="${hero.sp >= per ? 'ready' : ''}" disabled title="Dragoon form arrives in PLAN.md D4">${m.label}</button>`;
        return `<button data-cmd="${m.id}" ${myTurn ? '' : 'disabled'}>${m.label}</button>`;
      }).join('');
    }
    menu.hidden = phase === 'addition' || phase === 'defense' || phase === 'over';
    const counter = data.addition.counterable;
    $('pad').innerHTML = !touch ? '' : phase === 'addition'
      ? `<button data-press="main">Press</button>${counter ? '<button data-press="counter" class="counter">Counter</button>' : ''}`
      : phase === 'defense' ? '<button data-press="dodge" class="dodge">Dodge</button><button data-press="main">Parry</button>' : '';
    $('pad').hidden = !$('pad').innerHTML;
    $('duel-note').textContent = note;
    $('duel-note').hidden = !note;
    $('result').hidden = phase !== 'over';
    if (phase === 'over') {
      $('result-title').textContent = battle.result === 'win' ? 'Victory' : 'Defeat';
      $('result').dataset.result = battle.result;
    }
  }

  // ---- Rhen ----
  function attack() {
    phase = 'addition';
    note = touch ? `${data.addition.name}: tap Press as each square closes` : `${data.addition.name}: press ${keysFor('main')} as each square closes`;
    document.activeElement?.blur?.(); // so Space can't click a focused menu button
    hud();
    timing.startAddition((presses) => {
      const command = { cmd: 'attack', presses };
      resolveHero(command);
    }, (n, soFar) => {
      // Hit n lands: show its damage from the sim run ahead with the presses so far.
      const ev = preview((b) => heroTurn(data, b, { cmd: 'attack', presses: soFar }));
      const hit = ev.filter((e) => e.type === 'hit' && e.to === 'rival')[n - 1];
      play('hero', 'attack');
      later(ui.flashMs, () => { play('rival', 'hit'); if (hit) pop('rival', hit.damage, 'dmg'); });
      if (!hit || hit.hpAfter === 0) timing.finish(); // Vael is down: the chain stops
    });
  }
  function command(cmd) {
    if (battle.next !== 'hero' || (phase !== 'menu' && phase !== 'items')) return;
    if (cmd.cmd === 'attack') return attack();
    if (cmd.cmd === 'escape') {
      const ev = heroTurn(data, battle, cmd);
      inputs.push({ who: 'hero', command: cmd });
      pop('hero', ev.find((e) => e.type === 'refused')?.why === "can't escape from a boss" ? "Can't escape!" : 'No', 'word');
      return hud();
    }
    resolveHero(cmd);
  }
  function resolveHero(cmd) {
    phase = 'resolving';
    note = '';
    inputs.push({ who: 'hero', command: cmd });
    const ev = heroTurn(data, battle, cmd);
    for (const e of ev) {
      if (e.type === 'guard') { play('hero', 'guard'); pop('hero', `+${e.heal}`, 'heal'); pop('hero', 'Guard', 'word'); }
      if (e.type === 'item') { play('hero', 'item'); pop('hero', e.heal !== undefined ? `+${e.heal}` : e.item, e.heal !== undefined ? 'heal' : 'word'); }
      if (e.type === 'sp' && e.why === 'item') pop('hero', `+${e.gain} SP`, 'sp');
      if (e.type === 'counter' && !e.blocked) pop('hero', 'Countered!', 'word');
    }
    later(cmd.cmd === 'attack' ? ui.afterChainMs : ui.afterRivalMs, afterAction);
    hud();
  }

  // ---- Vael ----
  function rival() {
    const intent = rivalIntent(data, battle);
    phase = 'defense';
    note = `${battle.rival.name}: ${intent.name}${intent.lastGasp ? ' (last gasp)' : ''}${touch ? '' : ` · ${keysFor('main')} parry, ${keysFor('dodge')} dodge`}`;
    document.activeElement?.blur?.();
    if (intent.lastGasp) pop('rival', 'Last gasp!', 'word');
    if (fig('hero')?.animation === 'guard' && !battle.hero.guarding) play('hero', 'idle');
    hud();
    timing.startDefense(intent, (defense) => {
      phase = 'resolving';
      inputs.push({ who: 'rival', defense });
      const ev = rivalTurn(data, battle, defense);
      const rip = ev.findIndex((e) => e.type === 'riposte');
      if (rip >= 0) {
        play('hero', 'attack');
        pop('hero', ev[rip].name, 'word');
        const hit = ev.slice(rip).find((e) => e.type === 'hit' && e.to === 'rival');
        later(ui.flashMs, () => { play('rival', 'hit'); if (hit) pop('rival', hit.damage, 'dmg'); });
      }
      later(ui.afterRivalMs, afterAction);
      hud();
    }, (k, verdict, soFar) => {
      if (verdict === 'parried') { play('hero', 'parry'); return; }
      if (verdict === 'dodged') return;
      const ev = preview((b) => rivalTurn(data, b, soFar));
      const i = ev.findIndex((e) => e.type === 'defend' && e.hit === k);
      const hit = ev[i + 1]?.type === 'hit' && ev[i + 1].to === 'hero' ? ev[i + 1] : null;
      if (battle.hero.guarding) play('hero', 'guard'); else play('hero', 'hit');
      if (hit) pop('hero', hit.damage, 'dmg');
    }, () => play('rival', 'attack'));
  }

  function afterAction() {
    if (battle.next === 'over') {
      phase = 'over';
      note = '';
      play(battle.result === 'win' ? 'rival' : 'hero', 'death');
    } else if (battle.next === 'rival') {
      phase = 'resolving';
      later(ui.beforeRivalMs, rival);
    } else {
      phase = 'menu';
      if (fig('hero')?.animation === 'guard') play('hero', 'idle');
    }
    hud();
  }

  // ---- floating numbers ----
  const floatsEl = $('floats');
  function update() {
    const t = now();
    while (floats.length && t - floats[0].born > ui.floatMs) floats.shift();
    floatsEl.innerHTML = floats.map((f, i) => {
      const age = (t - f.born) / ui.floatMs;
      const p = anchor(f.at);
      // Numbers on the same figure fan out sideways; everything stays on screen.
      const n = floats.slice(0, i).filter((g) => g.at === f.at && g.kind !== 'word').length;
      const x = Math.min(innerWidth - 90, Math.max(90, p.x + (f.kind === 'word' ? 0 : ((n % 3) - 1) * ui.floatSpreadPx)));
      return `<span class="float ${f.kind}" style="transform: translate(${x}px, ${p.y - 30 - ui.floatRisePx * age - (f.kind === 'word' ? 30 : 0)}px) translate(-50%, -100%); opacity: ${Math.min(1, 3 * (1 - age))}">${f.text}</span>`;
    }).join('');
  }

  $('duel-menu').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.item) return command({ cmd: 'item', item: b.dataset.item });
    const id = b.dataset.cmd;
    if (id === 'items') { phase = 'items'; return hud(); }
    if (id === 'back') { phase = 'menu'; return hud(); }
    if (id === 'attack' || id === 'guard' || id === 'escape') command({ cmd: id });
  };
  $('play-again').onclick = restart;
  hud();
  if (battle.next === 'rival') rival();

  return { hud, update, phase: () => phase, inputs, floats: () => floats.map((f) => `${f.at}:${f.text}`) };
}
