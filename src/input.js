// Press capture for the timing UI: keys and on-screen tap buttons, each stamped with the
// time of the input event itself (not of the frame that handles it). Buttons: 'main'
// (addition press and parry), 'counter', 'dodge'.
export function createInput({ keys, onPress, stamp }) {
  const byCode = {};
  for (const [button, codes] of Object.entries(keys)) for (const c of codes) byCode[c] = button;
  // Space / X never activate a focused button: they're the press keys.
  addEventListener('keyup', (e) => { if (byCode[e.code]) e.preventDefault(); });
  addEventListener('keydown', (e) => {
    const button = byCode[e.code];
    if (!button || e.repeat) return;
    e.preventDefault();
    onPress(button, stamp(e));
  });
  // Tap buttons: data-press="main|counter|dodge"; pointerdown, so there's no click delay.
  return {
    bind(el) {
      el.addEventListener('pointerdown', (e) => {
        const b = e.target.closest('[data-press]');
        if (!b) return;
        e.preventDefault();
        onPress(b.dataset.press, stamp(e));
      });
    },
  };
}
