import * as THREE from 'three';

// Dragoon looks: the hero glows, grows wings and an aura while transformed; spells fly
// as glowing bolts. Pure show: the sim has already decided what happened.
export function createDragoonLook(scene, data) {
  const look = data.dragoonUi;
  let worn = null; // { fig, wings, light, materials }
  const bolts = [];

  function wingMesh(side) {
    // A swept, three-pointed wing in the hero's local space (x out to the side, y up).
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.55, 0.55);
    s.lineTo(0.9, 0.35);
    s.lineTo(0.62, 0.18);
    s.lineTo(0.8, -0.05);
    s.lineTo(0.45, 0.02);
    s.lineTo(0.5, -0.25);
    s.closePath();
    const mat = new THREE.MeshStandardMaterial({ color: look.wingColor, emissive: look.wingColor, emissiveIntensity: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.88 });
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), mat);
    m.scale.set(side, 1, 1);
    const pivot = new THREE.Group();
    pivot.add(m);
    return pivot;
  }

  function put(fig) {
    if (worn) return;
    const h = fig.height;
    const wings = new THREE.Group();
    const left = wingMesh(-1);
    const right = wingMesh(1);
    wings.add(left, right);
    wings.position.set(0, h * 0.62, -0.18 * h); // between the shoulders, behind
    wings.scale.setScalar(h * look.wingScale);
    fig.group.add(wings);
    const light = new THREE.PointLight(look.glowColor, look.lightIntensity, h * 3);
    light.position.set(0, h * 0.6, 0.3);
    fig.group.add(light);
    // Tint: clone the hero's materials so other figures sharing them stay plain.
    const materials = [];
    fig.group.traverse((o) => {
      if (!o.isMesh || o.parent === left || o.parent === right) return;
      materials.push([o, o.material]);
      o.material = o.material.clone();
      o.material.emissive = new THREE.Color(look.glowColor);
      o.material.emissiveIntensity = look.glowIntensity;
    });
    worn = { fig, wings, left, right, light, materials };
  }
  function remove() {
    if (!worn) return;
    worn.fig.group.remove(worn.wings, worn.light);
    for (const [o, m] of worn.materials) o.material = m;
    worn = null;
  }

  // A bolt from the hero to the rival (or down from above for 'sky' spells).
  function cast(spell, from, to, startMs) {
    const style = look.spells[spell.name] ?? look.spells.default;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(style.size, 16, 12), new THREE.MeshBasicMaterial({ color: style.color, transparent: true }));
    const light = new THREE.PointLight(style.color, 6, 4);
    ball.add(light);
    const a = from.clone();
    const b = to.clone();
    if (style.from === 'sky') a.set(b.x, b.y + 6, b.z);
    ball.position.copy(a);
    scene.add(ball);
    bolts.push({ ball, a, b, start: startMs, flight: look.flightMs, burst: look.burstMs, size: style.size });
  }

  return {
    put,
    remove,
    cast,
    worn: () => !!worn,
    update(nowMs) {
      if (worn) {
        const f = Math.sin(nowMs / look.flapMs) * 0.35;
        worn.left.rotation.y = f;
        worn.right.rotation.y = -f;
      }
      for (const b of bolts.slice()) {
        const t = (nowMs - b.start) / b.flight;
        if (t < 1) b.ball.position.lerpVectors(b.a, b.b, Math.max(0, t));
        else {
          const k = (nowMs - b.start - b.flight) / b.burst; // burst: swell and fade
          b.ball.position.copy(b.b);
          b.ball.scale.setScalar(1 + 3 * k);
          b.ball.material.opacity = Math.max(0, 1 - k);
          if (k >= 1) { scene.remove(b.ball); bolts.splice(bolts.indexOf(b), 1); }
        }
      }
    },
    clear() { remove(); for (const b of bolts.splice(0)) scene.remove(b.ball); },
  };
}
