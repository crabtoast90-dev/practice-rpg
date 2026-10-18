import * as THREE from 'three';

// One simple stage per mode: readable, not fancy (the polish goes to the cinematic
// and the timing UI). Each stage owns its lights, ground, figure spots and camera.

function sky(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function lights(group, { key, keyPos, fill, ambient }) {
  const sun = new THREE.DirectionalLight(key, 2.6);
  sun.position.copy(keyPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0005;
  group.add(sun, new THREE.HemisphereLight(fill, 0x2a2018, ambient));
}

// Duel: a round stone platform at dusk, hero on the right facing left (the source
// game's side-on framing), rival on the left.
function duelStage() {
  const group = new THREE.Group();
  lights(group, { key: 0xffd2a0, keyPos: new THREE.Vector3(6, 10, 6), fill: 0x8899cc, ambient: 1.1 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x6d6a66, roughness: 0.9 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.4, 0.6, 64), stone);
  disc.position.y = -0.3;
  disc.receiveShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.05, 8, 96), new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.5, metalness: 0.4 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshStandardMaterial({ color: 0x2b2a33, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.6;
  ground.receiveShadow = true;
  group.add(disc, ring, ground);
  return {
    group,
    background: sky('#2b2f55', '#c9825a'),
    fog: new THREE.Fog(0x8a6a66, 18, 60),
    spots: { hero: { position: new THREE.Vector3(2.4, 0, 0.6), facing: -Math.PI / 2 }, rival: { position: new THREE.Vector3(-2.4, 0, -0.6), facing: Math.PI / 2 } },
    camera: { position: new THREE.Vector3(1.2, 2.3, 7.6), target: new THREE.Vector3(0, 1.05, 0), fov: 38 },
    // Phone: swing round behind the hero's shoulder so the two stand at different depths.
    portrait: { position: new THREE.Vector3(7.6, 3.0, 8.2), target: new THREE.Vector3(-0.5, 0.9, -0.5), fov: 46 },
  };
}

// Party: the party in a row near the camera with their backs to it, enemies in a row
// further back facing them (the source game's over-the-shoulder framing).
function partyStage(heroCount, enemyCount) {
  const group = new THREE.Group();
  lights(group, { key: 0xfff0d8, keyPos: new THREE.Vector3(-5, 12, 8), fill: 0x9fb4e0, ambient: 1.2 });
  const tiles = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshStandardMaterial({ color: 0x4f5a5c, roughness: 0.95 }));
  tiles.rotation.x = -Math.PI / 2;
  tiles.receiveShadow = true;
  const grid = new THREE.GridHelper(26, 26, 0x6e7b7d, 0x5d686a);
  grid.position.y = 0.005;
  group.add(tiles, grid);
  const row = (n, z, gap) => Array.from({ length: n }, (_, i) => new THREE.Vector3((i - (n - 1) / 2) * gap, 0, z));
  return {
    group,
    background: sky('#7aa0c8', '#dfe7ea'),
    fog: new THREE.Fog(0xdfe7ea, 16, 40),
    spots: {
      heroes: row(heroCount, 2.6, 1.6).map((position) => ({ position, facing: Math.PI })),
      enemies: row(enemyCount, -3.2, 2.2).map((position) => ({ position, facing: 0 })),
    },
    camera: { position: new THREE.Vector3(0, 3.6, 8.4), target: new THREE.Vector3(0, 0.55, -1.0), fov: 42 },
  };
}

export function createStage(scene, mode, opts = {}) {
  const st = mode === 'duel' ? duelStage() : partyStage(opts.heroes ?? 4, opts.enemies ?? 3);
  scene.add(st.group);
  scene.background = st.background;
  scene.fog = st.fog;
  return { ...st, dispose() { scene.remove(st.group); } };
}

// Point the camera at the stage, pulling back on narrow (phone) screens so the whole
// line-up stays in frame.
export function frameCamera(camera, st, aspect) {
  const c = aspect < 1 && st.portrait ? st.portrait : st.camera;
  const pull = aspect < 1 && !st.portrait ? Math.min(2.4, 1 / aspect) : 1;
  const dir = c.position.clone().sub(c.target);
  camera.fov = c.fov;
  camera.aspect = aspect;
  camera.position.copy(c.target).add(dir.multiplyScalar(pull));
  camera.lookAt(c.target);
  camera.updateProjectionMatrix();
}
