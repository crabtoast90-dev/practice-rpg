import { judgePress, judgeDefense } from '../duel/sim.js';

// The timing UI: Frenzy Chain's shrinking squares and the dodge / parry rings on
// Vael's hits. It only measures presses; the sim's own judges give every verdict, and
// the finished presses go to the sim as millisecond offsets from the perfect frame.
//
// Time: now() is the game clock in ms. A press at time t is seen against the screen,
// which lags by latency ms, so its offset is (t - latency) - perfect frame.
export function createTiming({ data, root, now, latency, anchor }) {
  const ui = data.timingUi;
  const a = data.addition;
  const d = data.defense;
  const el = (cls, parent = root) => { const e = document.createElement('div'); e.className = cls; parent.appendChild(e); return e; };
  const target = el('sq target');
  const outer = el('sq outer');
  const ringT = el('ring target');
  const ringO = el('ring outer');
  const word = el('verdict');
  for (const e of [target, outer, ringT, ringO, word]) e.hidden = true;

  const log = []; // the last presses, for ?debug and the check
  let seq = null; // the running addition or defence
  let flash = null;
  let shown = null;

  const record = (entry) => { log.push(entry); while (log.length > ui.debugPresses) log.shift(); };
  const say = (text, kind, at) => { shown = { text, kind, until: now() + ui.verdictMs, at }; };

  // ---- Frenzy Chain ----
  // Each press's perfect frame, in ms from the overlay starting (centre of its window).
  const perfectAt = a.windowsTicks.map(([lo, hi]) => ((lo + hi + 1) / 2) * data.tickMs);
  const halfAt = a.windowsTicks.map(([lo, hi]) => ((hi - lo + 1) * data.tickMs) / 2);

  function startAddition(onDone, onHit) {
    seq = { kind: 'addition', t0: now(), k: 0, presses: [], onDone, onHit };
    onHit?.(1, []); // the first hit always lands
  }
  function endAddition() {
    const s = seq;
    seq = null;
    s.onDone(s.presses);
  }
  function additionPress(button, t) {
    const s = seq;
    const k = s.k;
    const ms = Math.round(t - latency() - (s.t0 + perfectAt[k]));
    const press = button === 'counter' ? { button: 'counter', ms } : ms;
    const j = judgePress(data, k, press);
    if (j.ignored) return; // before the squares start: the source ignores it
    record({ what: `${a.name} ${k + 1}`, button, ms, verdict: j.verdict });
    s.presses[k] = press;
    flash = { kind: j.verdict === 'success' ? 'success' : j.verdict === 'early' ? 'early' : 'late', until: now() + ui.flashMs };
    if (j.verdict !== 'success') { say(j.verdict === 'wrongButton' ? 'Wrong button' : j.verdict === 'early' ? 'Early' : 'Late', 'miss', 'rival'); return endAddition(); }
    s.onHit?.(k + 2, s.presses.slice(0, k + 1));
    if (seq !== s) return; // the chain was finished early
    s.k += 1;
    if (s.k === perfectAt.length) { say('Perfect!', 'good', 'rival'); endAddition(); }
  }
  function updateAddition() {
    const s = seq;
    const shownNow = now() - latency(); // what the player is looking at
    const k = s.k;
    if (shownNow - s.t0 > perfectAt[k] + halfAt[k]) {
      record({ what: `${a.name} ${k + 1}`, button: null, ms: null, verdict: 'missed' });
      flash = { kind: 'late', until: now() + ui.flashMs };
      say('Late', 'miss', 'rival');
      return endAddition();
    }
  }

  // ---- dodge / parry ----
  function startDefense(intent, onDone, onContact, onSwing) {
    const hits = Array.from({ length: intent.hits }, (_, i) => ({ contact: now() + ui.defenseLeadMs + i * intent.gapMs, presses: [], done: false, said: false }));
    seq = { kind: 'defense', intent, hits, h: 0, lock: { until: -Infinity }, onDone, onContact, onSwing, swung: 0 };
  }
  const deadline = (hit) => hit.contact + Math.max(d.dodgeWindowMs, d.parryWindowMs) / 2;
  // Settle hit h for good, on the shared lockout, exactly as the sim will.
  function resolveHit(s, h) {
    const hit = s.hits[h];
    const j = judgeDefense(data, hit.presses, h * s.intent.gapMs, s.lock);
    hit.done = true;
    if (!hit.said) sayDefense(j.verdict);
    if (j.verdict === 'none') record({ what: `${s.intent.name} ${h + 1}`, button: null, ms: null, verdict: 'none' });
    s.onContact?.(h + 1, j.verdict, s.hits.slice(0, h + 1).map((x) => (x.presses.length ? x.presses : null)));
  }
  function sayDefense(verdict) {
    const words = { parried: ['Parry!', 'good'], dodged: ['Dodge', 'ok'], early: ['Early', 'miss'], late: ['Late', 'miss'], none: ['Hit', 'miss'] };
    say(...words[verdict], 'hero');
  }
  function defensePress(button, t) {
    const s = seq;
    const shownT = t - latency();
    while (s.h < s.hits.length && shownT > deadline(s.hits[s.h])) resolveHit(s, s.h++);
    if (s.h >= s.hits.length) return;
    const hit = s.hits[s.h];
    const p = { kind: button === 'dodge' ? 'dodge' : 'parry', ms: Math.round(shownT - hit.contact) };
    hit.presses.push(p);
    // Live verdict on a copy of the lockout; the real one settles when the hit resolves.
    const j = judgeDefense(data, hit.presses, s.h * s.intent.gapMs, { ...s.lock });
    const mine = j.presses[j.presses.length - 1];
    record({ what: `${s.intent.name} ${s.h + 1}`, button: p.kind, ms: p.ms, verdict: mine.result });
    if (!hit.said && j.verdict !== 'none') { hit.said = true; sayDefense(j.verdict); }
  }
  function updateDefense() {
    const s = seq;
    const shownNow = now() - latency();
    while (s.h < s.hits.length && shownNow > deadline(s.hits[s.h])) resolveHit(s, s.h++);
    if (s.h >= s.hits.length) {
      seq = null;
      s.onDone(s.hits.map((h) => (h.presses.length ? h.presses : null)));
    }
  }

  // ---- drawing ----
  function place(e, at, size, extra = '') {
    const p = anchor(at);
    e.style.width = e.style.height = `${size}px`;
    e.style.transform = `translate(${p.x - size / 2}px, ${p.y - size / 2}px)${extra}`;
  }
  function draw() {
    const t = now();
    const shownNow = t - latency();
    target.hidden = outer.hidden = ringT.hidden = ringO.hidden = true;
    if (seq?.kind === 'addition') {
      const k = seq.k;
      const left = seq.t0 + perfectAt[k] - shownNow; // ms until the perfect frame
      const lead = a.squareLeadTicks * data.tickMs;
      const wantCounter = a.counterable && k === a.counterAtPress - 1;
      target.hidden = false;
      place(target, 'rival', ui.squarePx);
      target.dataset.kind = flash && t < flash.until ? flash.kind : wantCounter ? 'counter' : '';
      if (left < lead) {
        const f = Math.max(0, left / lead);
        outer.hidden = false;
        outer.dataset.kind = wantCounter ? 'counter' : '';
        place(outer, 'rival', ui.squarePx * (1 + (ui.squareStartScale - 1) * f), ` rotate(${ui.squareTurnDeg * f}deg)`);
      }
    } else if (flash && t < flash.until) {
      target.hidden = false;
      target.dataset.kind = flash.kind;
      place(target, 'rival', ui.squarePx);
    }
    if (seq?.kind === 'defense') {
      const hit = seq.hits[seq.h];
      if (hit) {
        const left = hit.contact - shownNow;
        ringT.hidden = false;
        place(ringT, 'hero', ui.ringPx);
        if (left < ui.defenseLeadMs && left > -1) {
          ringO.hidden = false;
          place(ringO, 'hero', ui.ringPx * (1 + (ui.ringStartScale - 1) * Math.max(0, left / ui.defenseLeadMs)));
        }
      }
    }
    word.hidden = !(shown && t < shown.until);
    if (!word.hidden) {
      word.textContent = shown.text;
      word.dataset.kind = shown.kind;
      const p = anchor(shown.at);
      word.style.transform = `translate(${p.x}px, ${p.y - ui.squarePx}px) translate(-50%, -100%)`;
    }
  }

  return {
    startAddition,
    startDefense,
    press(button, t = now()) {
      if (seq?.kind === 'addition' && (button === 'main' || button === 'counter')) additionPress(button, t);
      else if (seq?.kind === 'defense' && (button === 'main' || button === 'dodge')) defensePress(button, t);
    },
    update() {
      // Vael's swings, timed so each lands on its hit's contact.
      if (seq?.kind === 'defense') {
        const s = seq;
        while (s.swung < s.hits.length && now() >= s.hits[s.swung].contact - ui.rivalSwingLeadMs) s.onSwing?.(s.swung++);
      }
      if (seq?.kind === 'addition') updateAddition();
      else if (seq?.kind === 'defense') updateDefense();
      draw();
    },
    active: () => seq?.kind ?? null,
    // What's on screen, for the check and ?debug.
    info() {
      if (!seq) return { phase: null, log: [...log] };
      if (seq.kind === 'addition') return { phase: 'addition', press: seq.k + 1, perfectAt: seq.t0 + perfectAt[seq.k], log: [...log] };
      const hit = seq.hits[seq.h];
      return { phase: 'defense', move: seq.intent.name, hit: seq.h + 1, contactAt: hit?.contact ?? null, contacts: seq.hits.map((h) => h.contact), log: [...log] };
    },
    // End the chain now (Vael fell mid-chain): the presses so far go to the sim.
    finish() { if (seq?.kind === 'addition') endAddition(); },
    verdictText: () => (shown && now() < shown.until ? shown.text : null),
    clear() { seq = null; flash = null; shown = null; draw(); },
  };
}

// Tap-to-the-flash calibration: a box flashes on a steady beat, the player taps with
// it, and the median lag between flash and tap is this device's input-to-screen delay.
export function calibrate({ data, box, now, done }) {
  const c = data.timingUi.calibration;
  const flashes = [];
  const taps = [];
  let i = 0;
  const timer = setInterval(() => {
    if (i >= c.flashes) { clearInterval(timer); setTimeout(finish, c.gapMs / 2); return; }
    requestAnimationFrame((ts) => { flashes.push(ts); box.dataset.on = '1'; setTimeout(() => (box.dataset.on = ''), 90); });
    i += 1;
  }, c.gapMs);
  function tap(t) { taps.push(t); }
  function finish() {
    const lags = taps.map((t) => {
      const f = flashes.reduce((best, x) => (Math.abs(t - x) < Math.abs(t - best) ? x : best), Infinity);
      return t - f;
    }).filter((x) => Math.abs(x) < c.gapMs / 2).slice(c.skip).sort((x, y) => x - y);
    done(lags.length ? Math.round(lags[Math.floor(lags.length / 2)]) : null);
  }
  return { tap };
}
