// ?tune=foe.atk:60,hero.hp:400 : try numbers by name without editing the data file.
// The check uses it too (a losing fight needs a stronger foe); Node applies the same string.
export function applyTune(data, spec) {
  if (!spec) return data;
  const out = structuredClone(data);
  for (const pair of spec.split(',')) {
    const [path, value] = pair.split(':');
    const keys = path.split('.');
    let o = out;
    for (const k of keys.slice(0, -1)) o = o?.[k];
    const last = keys[keys.length - 1];
    if (!o || !(last in o) || Number.isNaN(Number(value))) throw new Error(`?tune: no number at ${path}`);
    o[last] = Number(value);
  }
  return out;
}
