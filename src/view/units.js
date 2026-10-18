import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

// KayKit characters (CC0, see CREDITS.md) and the clips they play.
const DIR = `${import.meta.env.BASE_URL}models/units/`;
const FADE = 0.15;

// Every figure: its model file, its clips (which Rig_Medium file, which clip) and
// what it holds in each hand (files in weapons/). Clips not listed use DEFAULT_CLIPS.
const DEFAULT_CLIPS = { idle: ['general', 'Idle_A'], hit: ['general', 'Hit_A'], death: ['general', 'Death_A'] };
const SKELETON_CLIPS = { idle: ['special', 'Skeletons_Idle'], death: ['special', 'Skeletons_Death'], spawn: ['special', 'Skeletons_Spawn_Ground'] };
export const FIGURES = {
  // Duel
  hero: { file: 'Knight.glb', hold: { r: 'sword_1handed' }, clips: { idle: ['melee', 'Melee_2H_Idle'], attack: ['melee', 'Melee_1H_Attack_Slice_Diagonal'], guard: ['melee', 'Melee_Blocking'], parry: ['melee', 'Melee_Block'], item: ['general', 'Use_Item'], summon: ['ranged', 'Ranged_Magic_Summon'], cast: ['ranged', 'Ranged_Magic_Shoot'] } },
  rival: { file: 'Rogue_Hooded.glb', hold: { r: 'sword_1handed' }, clips: { idle: ['melee', 'Melee_2H_Idle'], attack: ['melee', 'Melee_1H_Attack_Stab'], cast: ['ranged', 'Ranged_Magic_Raise'] } },
  // Party
  // Party heroes: basic / skill / ultimate each have a clip.
  barbarian: { file: 'Barbarian.glb', hold: { r: 'axe_2handed' }, clips: { idle: ['melee', 'Melee_2H_Idle'], basic: ['melee', 'Melee_2H_Attack_Chop'], skill: ['melee', 'Melee_2H_Attack_Slice'], ultimate: ['melee', 'Melee_2H_Attack_Spin'] } },
  rogue: { file: 'Rogue.glb', hold: { r: 'dagger', l: 'dagger' }, clips: { basic: ['melee', 'Melee_Dualwield_Attack_Slice'], skill: ['melee', 'Melee_Dualwield_Attack_Stab'], ultimate: ['melee', 'Melee_Dualwield_Attack_Chop'] } },
  mage: { file: 'Mage.glb', hold: { r: 'staff' }, clips: { basic: ['ranged', 'Ranged_Magic_Shoot'], skill: ['ranged', 'Ranged_Magic_Raise'], ultimate: ['ranged', 'Ranged_Magic_Summon'] } },
  knight: { file: 'Knight.glb', hold: { r: 'sword_1handed', l: 'shield_badge_color' }, clips: { idle: ['melee', 'Melee_Blocking'], basic: ['melee', 'Melee_1H_Attack_Chop'], skill: ['melee', 'Melee_Block'], ultimate: ['ranged', 'Ranged_Magic_Raise'] } },
  skeletonMinion: { file: 'Skeleton_Minion.glb', hold: { r: 'Skeleton_Axe' }, clips: { ...SKELETON_CLIPS, attack: ['melee', 'Melee_1H_Attack_Chop'] } },
  skeletonWarrior: { file: 'Skeleton_Warrior.glb', hold: { r: 'Skeleton_Blade', l: 'Skeleton_Shield_Large_A' }, clips: { ...SKELETON_CLIPS, attack: ['melee', 'Melee_1H_Attack_Slice_Horizontal'] } },
  skeletonMage: { file: 'Skeleton_Mage.glb', hold: { r: 'wand' }, clips: { ...SKELETON_CLIPS, attack: ['ranged', 'Ranged_Magic_Shoot'] } },
  skeletonRogue: { file: 'Skeleton_Rogue.glb', hold: { r: 'Skeleton_Blade', l: 'Skeleton_Blade' }, clips: { ...SKELETON_CLIPS, attack: ['melee', 'Melee_Dualwield_Attack_Slice'] } },
};
const RIG_FILES = {
  general: 'Rig_Medium_General.glb',
  melee: 'Rig_Medium_CombatMelee.glb',
  ranged: 'Rig_Medium_CombatRanged.glb',
  special: 'Rig_Medium_Special.glb',
};
const ONCE = new Set(['attack', 'basic', 'skill', 'ultimate', 'hit', 'death', 'spawn', 'parry', 'item', 'summon', 'cast']); // play once; all but death fall back to idle

export function createFigures(scene) {
  const loader = new GLTFLoader();
  const load = (f) => loader.loadAsync(DIR + f);
  const models = {};
  const rigs = {};
  const weapons = {};
  const live = [];
  const files = [...new Set(Object.values(FIGURES).map((m) => m.file))];
  const ready = Promise.all([
    ...Object.entries(RIG_FILES).map(([k, f]) => load(f).then((g) => (rigs[k] = g.animations))),
    ...files.map((f) => load(f).then((g) => (models[f] = g.scene))),
    ...[...new Set(Object.values(FIGURES).flatMap((m) => Object.values(m.hold)))].map((w) => load(`weapons/${w}.gltf`).then((g) => (weapons[w] = g.scene))),
  ]);

  // id: the sim's unit id; kind: a FIGURES key. height in metres; facing in radians.
  function spawn(id, kind, { position, facing = 0, height = 1.7, tint } = {}) {
    const fig = FIGURES[kind];
    if (!fig) throw new Error(`no figure "${kind}" (add it to FIGURES in units.js)`);
    const model = cloneSkinned(models[fig.file]);
    const box = new THREE.Box3().setFromObject(model);
    // three.js drops the dot from bone names: "handslot.r" loads as "handslotr".
    for (const [hand, w] of Object.entries(fig.hold)) model.getObjectByName(`handslot${hand}`).add(weapons[w].clone());
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      if (tint) { o.material = o.material.clone(); o.material.color.multiply(new THREE.Color(tint)); }
    });
    model.scale.setScalar(height / (box.max.y - box.min.y));
    const group = new THREE.Group();
    group.add(model);
    group.position.copy(position);
    group.rotation.y = facing;
    scene.add(group);

    const mixer = new THREE.AnimationMixer(model);
    const actions = {};
    mixer.addEventListener('finished', () => { if (f.animation !== 'death' && f.animation !== 'idle') f.play('idle'); });
    for (const [name, [rig, clipName]] of Object.entries({ ...DEFAULT_CLIPS, ...fig.clips })) {
      const clip = THREE.AnimationClip.findByName(rigs[rig], clipName);
      if (!clip) throw new Error(`${kind}: no clip ${clipName} in ${RIG_FILES[rig]}`);
      const a = mixer.clipAction(clip);
      if (ONCE.has(name)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      actions[name] = a;
    }
    const f = {
      id, kind, group, height, mixer, animation: 'idle',
      play(name) {
        const next = actions[name];
        if (!next) return;
        const cur = actions[f.animation];
        next.reset().play();
        if (cur !== next) cur.crossFadeTo(next, FADE, false);
        f.animation = name;
      },
      // Head and feet in world space, for framing checks.
      extent() { return [group.position.clone(), group.position.clone().add(new THREE.Vector3(0, height, 0))]; },
    };
    // Stagger idle loops so a line-up doesn't breathe in sync.
    actions.idle.play();
    actions.idle.time = (live.length * 0.37) % actions.idle.getClip().duration;
    mixer.update(0);
    live.push(f);
    return f;
  }

  return {
    ready,
    spawn,
    update(dt) { for (const f of live) f.mixer.update(dt); },
    get: (id) => live.find((f) => f.id === id),
    remove(id) {
      const i = live.findIndex((f) => f.id === id);
      if (i < 0) return;
      const [f] = live.splice(i, 1);
      scene.remove(f.group);
      f.mixer.stopAllAction();
    },
    clear() { for (const f of live.splice(0)) { scene.remove(f.group); f.mixer.stopAllAction(); } },
    list() { return live.map((f) => ({ id: f.id, kind: f.kind, model: FIGURES[f.kind].file, animation: f.animation, clipTime: +f.mixer.time.toFixed(3) })); },
    all: () => live,
  };
}
