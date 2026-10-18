import * as THREE from 'three';

// One simple stage per mode: readable, not fancy. Each stage owns its lights, ground,
// figure spots and camera (plus an optional portrait camera for phones).

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

function exampleStage() {
  const group = new THREE.Group();
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
  sun.position.set(-5, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0005;
  group.add(sun, new THREE.HemisphereLight(0x9fb4e0, 0x2a2018, 1.2));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshStandardMaterial({ color: 0x4f5a5c, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  const grid = new THREE.GridHelper(26, 26, 0x6e7b7d, 0x5d686a);
  grid.position.y = 0.005;
  group.add(ground, grid);
  return {
    group,
    background: sky('#7aa0c8', '#dfe7ea'),
    fog: new THREE.Fog(0xdfe7ea, 16, 40),
    spots: { hero: { position: new THREE.Vector3(1.6, 0, 0), facing: -Math.PI / 2 }, foe: { position: new THREE.Vector3(-1.6, 0, 0), facing: Math.PI / 2 } },
    camera: { position: new THREE.Vector3(0, 2.8, 7.2), target: new THREE.Vector3(0, 1.3, 0), fov: 40 },
    // Phone: further back and higher, so a fallen figure stays in frame too.
    portrait: { position: new THREE.Vector3(0, 6.5, 20), target: new THREE.Vector3(0, 1.4, 0), fov: 44 },
  };
}

const STAGES = { example: exampleStage };

export function createStage(scene, mode) {
  const st = STAGES[mode]();
  scene.add(st.group);
  scene.background = st.background;
  scene.fog = st.fog;
  return { ...st, dispose() { scene.remove(st.group); } };
}

// Point the camera at the stage, pulling back on narrow (phone) screens so everyone
// stays in frame.
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
