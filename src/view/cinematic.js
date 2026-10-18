import * as THREE from 'three';

// Vael's signature move as a short film: wide shot, a slow push in on Vael while four
// pillars of light rise around Rhen, a flash and the move's title card, an over-the-
// shoulder shot from behind Rhen, then the hits (each pillar bursts as its hit lands).
// Skippable with any key or tap after the first viewing. Show only: the sim decides.
const SEEN_KEY = 'practice-rpg.cinematicSeen';

export function createCinematic({ scene, camera, data, figures, now, restoreCamera, title, flashEl }) {
  const cfg = data.cinematic;
  let run = null;
  let pillars = [];
  let seen = false;
  try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch { /* storage blocked */ }

  const fig = (id) => figures.all().find((f) => f.id === id);
  const up = (v, y) => v.clone().add(new THREE.Vector3(0, y, 0));

  // Camera poses from where the two stand: dir points from Rhen to Vael, side toward
  // the default camera, so every shot keeps the same screen direction.
  function poses() {
    const H = fig('hero').group.position.clone();
    const R = fig('rival').group.position.clone();
    const dir = R.clone().sub(H).setY(0).normalize();
    let side = new THREE.Vector3(-dir.z, 0, dir.x);
    if (side.z < 0) side.negate();
    const mid = H.clone().add(R).multiplyScalar(0.5);
    const at = (base, d, s, y) => base.clone().addScaledVector(dir, d).addScaledVector(side, s).add(new THREE.Vector3(0, y, 0));
    return {
      wide: { from: at(mid, 0, 11, 6), to: at(mid, 0, 9, 5), look: up(mid, 0.8), fov: 42 },
      rival: { from: at(R, -4.6, 1.8, 1.6), to: at(R, -3.6, 1.4, 1.45), look: up(R, 1.05), fov: 36 },
      title: { from: at(R, -3.6, 1.4, 1.45), to: at(R, -3.2, 1.25, 1.4), look: up(R, 1.05), fov: 36 },
      shoulder: { from: at(H, -3.4, 1.0, 2.2), to: at(H, -2.9, 0.9, 2.0), look: up(R, 0.9), fov: 42 },
    };
  }

  function raisePillars() {
    const H = fig('hero').group.position;
    const p = cfg.pillars;
    pillars = Array.from({ length: p.count }, (_, i) => {
      const a = (i / p.count) * Math.PI * 2 + Math.PI / 4;
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(p.radius, p.radius, p.height, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      m.position.set(H.x + Math.cos(a) * p.spread, p.height / 2, H.z + Math.sin(a) * p.spread);
      m.scale.y = 0.01;
      scene.add(m);
      return { m, burstAt: null };
    });
  }
  function clearPillars() { for (const p of pillars) scene.remove(p.m); pillars = []; }

  function finish() {
    const r = run;
    run = null;
    title.hidden = true;
    flashEl.style.opacity = '0';
    restoreCamera();
    for (const p of pillars) { p.m.scale.y = 1; p.m.material.opacity = cfg.pillars.opacity; }
    seen = true;
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ }
    r.onDone();
  }

  return {
    // Start the film for this move; onDone starts the hits.
    play(name, onDone) {
      clearPillars();
      raisePillars();
      let at = now();
      const beats = cfg.beats.map((b) => { const x = { ...b, at }; at += b.ms; return x; });
      run = { name, onDone, beats, poses: poses(), start: now(), skippable: seen, rivalCast: false };
      title.textContent = name;
    },
    skip() { if (run?.skippable) finish(); },
    active: () => !!run,
    // Slowdown for the figures' animations during slow beats.
    timeScale() {
      if (!run) return 1;
      const b = run.beats.find((x) => now() >= x.at && now() < x.at + x.ms);
      return b?.slow ?? 1;
    },
    // A hit of the move lands: its pillar bursts.
    pillarHit(k) { const p = pillars[k - 1]; if (p) p.burstAt = now(); },
    clearPillars,
    update() {
      const t = now();
      // Pillars: rise during the film, then burst one by one with the hits.
      const p = cfg.pillars;
      for (const [i, pl] of pillars.entries()) {
        if (pl.burstAt !== null) {
          const k = (t - pl.burstAt) / p.burstMs;
          pl.m.scale.set(1 + 2 * k, 1, 1 + 2 * k);
          pl.m.material.opacity = Math.max(0, p.opacity * (1 - k)) + (k < 0.15 ? 0.5 : 0);
        } else if (run) {
          const rise = Math.min(1, Math.max(0, (t - run.start - i * p.staggerMs) / p.riseMs));
          pl.m.scale.y = Math.max(0.01, rise);
          pl.m.position.y = (p.height * pl.m.scale.y) / 2;
          pl.m.material.opacity = p.opacity * rise;
        }
      }
      if (!run) return;
      const b = run.beats.find((x) => t >= x.at && t < x.at + x.ms);
      if (!b) return finish();
      if (!run.rivalCast && b.shot === 'rival') { run.rivalCast = true; fig('rival')?.play('cast'); }
      const pose = run.poses[b.shot];
      const f = (t - b.at) / b.ms;
      const e = f * f * (3 - 2 * f); // smoothstep
      // Portrait screens: stand further back and aim lower so the figures clear the HUD.
      const tall = camera.aspect < 1;
      const look = tall ? pose.look.clone().add(new THREE.Vector3(0, -cfg.portrait.lower, 0)) : pose.look;
      camera.position.lerpVectors(pose.from, pose.to, e);
      if (tall) camera.position.sub(pose.look).multiplyScalar(cfg.portrait.pull).add(pose.look);
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
      camera.lookAt(look);
      // Title beat: hold, flash, then the card.
      title.hidden = b.shot !== 'title' || f < cfg.titleDelay;
      const fl = b.shot === 'title' ? (f - cfg.titleDelay) / cfg.flashPart : -1;
      flashEl.style.opacity = fl >= 0 && fl < 1 ? String(1 - fl) : '0';
    },
    info() {
      if (!run) return { active: false };
      const t = now();
      const i = run.beats.findIndex((x) => t >= x.at && t < x.at + x.ms);
      return { active: true, name: run.name, skippable: run.skippable, beat: i, shot: run.beats[i]?.shot ?? null, beats: run.beats.map((x) => ({ shot: x.shot, at: x.at, ms: x.ms })) };
    },
    clear() { run = null; title.hidden = true; clearPillars(); },
  };
}
