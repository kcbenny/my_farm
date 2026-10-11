import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CatAnimations } from './CatAnimations.js';
import { CatCharacter } from './CatCharacter.js';
import { applyCatSurfaceDetails, disposeCatModel } from './CatSurfaceMaterials.js';
import { CatLifeParticles } from './CatLifeParticles.js';

function createCat() {
  const cat = Object.create(CatCharacter.prototype);
  const mesh = new THREE.Group();
  const clips = CatAnimations.getClips();
  const names = new Set(clips.flatMap(clip => clip.tracks.map(track => track.name.split('.')[0])));
  for (const name of names) {
    const node = new THREE.Group();
    node.name = name;
    mesh.add(node);
  }
  Object.assign(cat, {
    mesh, clips, mixer: new THREE.AnimationMixer(mesh), actions: {},
    currentActionName: 'Idle', scene: new THREE.Scene(), bones: {},
    isSleeping: false, gestureTimer: 0, nextGesture: 'Stretch',
    blinkTimer: 0, nextBlink: 3, mood: 100, moodTimer: 0,
    moodDecayInterval: 3.5, zzzParticles: [],
  });
  cat.setupAnimations();
  return cat;
}

test('all living-cat clips are valid and have unique names', () => {
  const clips = CatAnimations.getClips();
  assert.equal(new Set(clips.map(clip => clip.name)).size, clips.length);
  for (const clip of clips) assert.equal(clip.validate(), true);
  for (const name of ['Stretch', 'Groom', 'Jump', 'Blink', 'EarTwitch']) {
    assert.ok(clips.some(clip => clip.name === name));
  }
  assert.equal(clips.find(clip => clip.name === 'EarTwitch').blendMode, THREE.AdditiveAnimationBlendMode);
});

test('fur details preserve coat maps and use a linear nonmetallic bump', () => {
  const materials = Object.fromEntries(['fur', 'bellyWhite', 'paws', 'fluffTuft', 'darkAccent', 'eyes'].map(name => [name, new THREE.MeshStandardMaterial()]));
  const coat = new THREE.Texture();
  const eyes = new THREE.Texture();
  materials.fur.map = coat;
  materials.eyes.map = eyes;
  applyCatSurfaceDetails(materials, 'cedar');
  assert.equal(materials.fur.map, coat);
  assert.equal(materials.fur.bumpMap.colorSpace, THREE.NoColorSpace);
  assert.equal(materials.fur.bumpMap.image.width, 128);
  assert.equal(materials.fur.bumpMap, materials.paws.bumpMap);
  assert.equal(materials.fur.metalness, 0);
  assert.ok(materials.fur.bumpScale < 0.01);
  assert.ok(materials.eyes.isMeshPhysicalMaterial);
  assert.equal(materials.eyes.map, eyes);
  assert.equal(materials.eyes.metalness, 0);
  assert.equal(materials.eyes.clearcoat, 1);
  assert.equal(materials.eyeGlint.emissiveIntensity, 2);
});

test('Pearl keeps its existing fur treatment', () => {
  const bump = new THREE.Texture();
  const fur = new THREE.MeshStandardMaterial({ bumpMap: bump, bumpScale: 0.006 });
  const materials = { fur, eyes: new THREE.MeshPhysicalMaterial() };
  applyCatSurfaceDetails(materials, 'pearl');
  assert.equal(fur.bumpMap, bump);
  assert.equal(fur.bumpScale, 0.006);
});

test('idle gestures alternate, finish in Idle, and movement interrupts them', () => {
  const cat = createCat();
  const still = { moving: false, grounded: true, sprinting: false, aiming: false };
  cat.update(5, still);
  assert.equal(cat.currentActionName, 'Idle');
  assert.equal(cat.nextGesture, 'Groom');
  cat.gestureTimer = 4.99;
  cat.update(0.02, still);
  assert.equal(cat.currentActionName, 'Groom');
  cat.update(0.1, { ...still, moving: true, sprinting: true });
  assert.equal(cat.currentActionName, 'HappyRun');
  cat.playAnimation('Stretch');
  cat.update(3);
  assert.equal(cat.currentActionName, 'Idle');
});

test('jump pose holds without resetting and blends back on landing', () => {
  const cat = createCat();
  const airborne = { moving: true, grounded: false, sprinting: false, aiming: false };
  cat.update(0.3, airborne);
  assert.equal(cat.currentActionName, 'Jump');
  cat.update(0.5, airborne);
  assert.equal(cat.actions.Jump.paused, true);
  cat.update(0.1, airborne);
  assert.equal(cat.actions.Jump.paused, true);
  assert.equal(cat.actions.Jump.time, 0.6);
  cat.update(0.1, { ...airborne, grounded: true });
  assert.equal(cat.currentActionName, 'Walk');
});

test('blink and sound reaction layer over gameplay without changing the main action', () => {
  const cat = createCat();
  cat.playAnimation('Gather');
  cat.reactToSound();
  cat.blinkTimer = 2.99;
  cat.update(0.08);
  assert.equal(cat.currentActionName, 'Gather');
  assert.ok(cat.mesh.getObjectByName('Eye_L').scale.y < 0.2);
  assert.ok(cat.actions.EarTwitch.isRunning());
  cat.update(0.4);
  assert.equal(cat.currentActionName, 'Gather');
  assert.ok(Math.abs(cat.mesh.getObjectByName('Eye_L').scale.y - 1) < 0.001);
});

test('waking from sleep restores Idle and clears gesture timers', () => {
  const cat = createCat();
  cat.gestureTimer = 4;
  cat.reactToSound();
  cat.enterSleepMode();
  assert.equal(cat.currentActionName, 'Sleeping');
  assert.equal(cat.actions.EarTwitch.isRunning(), false);
  assert.equal(cat.gestureTimer, 0);
  cat.wakeUp();
  assert.equal(cat.isSleeping, false);
  assert.equal(cat.currentActionName, 'Idle');
});

test('running particles only emit for grounded motion on grass and use fixed buffers', () => {
  const particles = new CatLifeParticles(new THREE.Scene());
  const position = new THREE.Vector3();
  const state = { position, grounded: true, sprinting: true, surface: { type: 'grass', height: 0 }, night: false };
  const buffers = particles.grass.geometry.attributes.position.array;
  particles.update(0.1, state);
  assert.equal(particles.grass.visible, false);
  position.x += 0.5;
  assert.equal(particles.update(0.1, state), true);
  assert.equal(particles.grass.visible, true);
  assert.equal(particles.grass.geometry.attributes.position.count, 48);
  assert.equal(particles.grass.geometry.attributes.position.array, buffers);
  for (const change of [{ grounded: false }, { sprinting: false }, { surface: { type: 'road', height: 0 } }]) {
    particles.reset(position);
    position.x += 0.5;
    particles.update(0.1, { ...state, ...change });
    assert.equal(particles.grass.visible, false);
  }
  position.x += 100;
  assert.equal(particles.update(0.1, state), false);
  assert.equal(particles.grass.visible, false);
  particles.dispose();
});

test('night motes follow the cat, hide in FPS, and dispose without leftover scene nodes', () => {
  const scene = new THREE.Scene();
  const particles = new CatLifeParticles(scene);
  const state = { position: new THREE.Vector3(4, 2, 6), grounded: true, sprinting: false, night: true };
  particles.update(0.1, state);
  assert.equal(particles.glow.visible, true);
  assert.equal(particles.glow.geometry.attributes.position.count, 20);
  const positions = particles.glow.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    assert.ok(Math.abs(positions.getX(i) - 4) < 1.1);
    assert.ok(positions.getY(i) > 2);
  }
  particles.update(0.1, { ...state, visible: false });
  assert.equal(particles.glow.visible, false);
  particles.update(0.1, { ...state, night: false });
  assert.equal(particles.glow.visible, false);
  particles.dispose();
  assert.equal(scene.children.length, 0);
});

test('model disposal releases each shared texture, material and geometry only once', () => {
  const root = new THREE.Group();
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture });
  const geometry = new THREE.BoxGeometry();
  root.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  const disposed = { texture: 0, material: 0, geometry: 0 };
  texture.addEventListener('dispose', () => disposed.texture++);
  material.addEventListener('dispose', () => disposed.material++);
  geometry.addEventListener('dispose', () => disposed.geometry++);
  disposeCatModel(root);
  assert.deepEqual(disposed, { texture: 1, material: 1, geometry: 1 });
});
