import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { StylizedWater, createWaterNormalTexture, updateWaterSurfaces } from './StylizedWater.js';
import { PondModel } from './PondModel.js';
import { MysticLake } from './MysticLake.js';
import { SecretFishingSpot } from './SecretFishingSpot.js';
import { CozySceneModels } from './CozySceneModels.js';

function createScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 8, 10);
  camera.lookAt(0, 0, 0);
  return { scene, camera };
}

function createRenderer() {
  return {
    target: { name: 'original' },
    xr: { enabled: true },
    shadowMap: { autoUpdate: true },
    getRenderTarget() { return this.target; },
    setRenderTarget(target) { this.target = target; },
  };
}

function mockCapture(water) {
  for (const helper of [water.reflector, water.refractor]) {
    helper.onBeforeRender = renderer => {
      renderer.setRenderTarget(helper.getRenderTarget());
      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;
    };
  }
}

test('water normal maps are deterministic linear repeating data textures', () => {
  const first = createWaterNormalTexture();
  const second = createWaterNormalTexture();
  const shifted = createWaterNormalTexture(Math.PI / 3);
  assert.equal(first.image.width, 128);
  assert.equal(first.colorSpace, THREE.NoColorSpace);
  assert.equal(first.wrapS, THREE.RepeatWrapping);
  assert.deepEqual(first.image.data, second.image.data);
  assert.notDeepEqual(first.image.data, shifted.image.data);
  for (let i = 0; i < first.image.data.length; i += 4) {
    assert.ok(first.image.data[i + 2] >= 245);
    assert.equal(first.image.data[i + 3], 255);
  }
  first.dispose();
  second.dispose();
  shifted.dispose();
});

test('Water2 surfaces keep planar low-poly geometry and animate ripples and flow', () => {
  const water = new StylizedWater(new THREE.CircleGeometry(5.2, 16));
  assert.equal(water.isWater, true);
  assert.equal(water.userData.physics, false);
  assert.equal(water.material.depthWrite, false);
  assert.equal(water.geometry.index.count / 3, 16);
  assert.equal(water.reflector.getRenderTarget().width, 256);
  assert.equal(water.reflector.getRenderTarget().samples, 0);
  assert.ok(water.material.fragmentShader.includes('rippleUV'));
  const positions = water.geometry.attributes.position.array.slice();
  water.advance(10);
  const config = water.material.uniforms.config.value;
  assert.equal(water.material.uniforms.uTime.value, 10);
  assert.ok(config.x >= 0 && config.x < 0.15);
  assert.ok(config.y >= 0 && config.y < 0.15);
  assert.ok(Math.abs(((config.y - config.x + 0.15) % 0.15) - 0.075) < 0.00001);
  assert.deepEqual(water.geometry.attributes.position.array, positions);
  water.dispose();
});

test('capture budget refreshes only one visible surface and fairly rotates between surfaces', () => {
  const { scene, camera } = createScene();
  const renderer = createRenderer();
  const waters = [-2, 2].map(x => {
    const water = new StylizedWater(new THREE.CircleGeometry(2, 16));
    water.position.x = x;
    mockCapture(water);
    scene.add(water);
    return water;
  });
  for (let i = 0; i < 4; i++) {
    updateWaterSurfaces(scene, camera, 0.06);
    assert.equal(waters.filter(water => water.captureRequested).length, 1);
    for (const water of waters) water.renderWater(renderer, scene, camera);
  }
  assert.deepEqual(waters.map(water => water.captureCount), [2, 2]);
  updateWaterSurfaces(scene, camera, 0.001);
  assert.ok(waters.filter(water => water.captureRequested).length <= 1);
  for (const water of waters) water.dispose();
});

test('hidden, distant and back-facing water do not initiate captures', () => {
  const { scene, camera } = createScene();
  const group = new THREE.Group();
  const water = new StylizedWater(new THREE.CircleGeometry(2, 16));
  group.add(water);
  scene.add(group);
  group.visible = false;
  updateWaterSurfaces(scene, camera, 0.1);
  assert.equal(water.captureRequested, false);
  group.visible = true;
  water.position.z = -100;
  updateWaterSurfaces(scene, camera, 0.1);
  assert.equal(water.captureRequested, false);
  water.position.z = 0;
  camera.position.y = -8;
  camera.lookAt(0, 0, 0);
  updateWaterSurfaces(scene, camera, 0.1);
  assert.equal(water.captureRequested, false);
  water.dispose();
});

test('late-created lakes share scene time and honor the 20Hz refresh cap', () => {
  const { scene, camera } = createScene();
  updateWaterSurfaces(scene, camera, 100);
  const water = new StylizedWater(new THREE.CircleGeometry(2, 16));
  scene.add(water);
  mockCapture(water);
  updateWaterSurfaces(scene, camera, 0.01);
  water.renderWater(createRenderer(), scene, camera);
  assert.ok(water.lastCapture >= 100);
  updateWaterSurfaces(scene, camera, 0.01);
  assert.equal(water.captureRequested, false);
  updateWaterSurfaces(scene, camera, 0.05);
  assert.equal(water.captureRequested, true);
  water.dispose();
});

test('depth override does not capture and nested captures restore visibility and renderer state', () => {
  const { scene, camera } = createScene();
  const water = new StylizedWater(new THREE.CircleGeometry(2, 16));
  const other = new StylizedWater(new THREE.CircleGeometry(2, 16));
  scene.add(water, other);
  const renderer = createRenderer();
  const target = renderer.target;
  water.captureRequested = other.captureRequested = true;
  scene.overrideMaterial = new THREE.MeshDepthMaterial();
  water.renderWater(renderer, scene, camera);
  assert.equal(water.captureCount, 0);
  scene.overrideMaterial.dispose();
  scene.overrideMaterial = null;
  mockCapture(water);
  water.reflector.onBeforeRender = () => {
    assert.equal(water.visible, false);
    assert.equal(other.visible, false);
    other.renderWater(renderer, scene, camera);
  };
  water.renderWater(renderer, scene, camera);
  assert.equal(water.captureCount, 1);
  assert.equal(other.captureCount, 0);
  assert.equal(water.visible, true);
  assert.equal(other.visible, true);
  assert.equal(renderer.target, target);
  assert.equal(renderer.xr.enabled, true);
  assert.equal(renderer.shadowMap.autoUpdate, true);
  assert.equal(water.material.uniforms.uHasCapture.value, 1);
  water.dispose();
  other.dispose();
});

test('capture failures propagate while restoring visibility and renderer state', () => {
  const { scene, camera } = createScene();
  const water = new StylizedWater(new THREE.CircleGeometry(2, 16));
  scene.add(water);
  const renderer = createRenderer();
  const target = renderer.target;
  water.captureRequested = true;
  mockCapture(water);
  water.refractor.onBeforeRender = () => { throw new Error('capture failed'); };
  assert.throws(() => water.renderWater(renderer, scene, camera), /capture failed/);
  assert.equal(water.visible, true);
  assert.equal(renderer.target, target);
  assert.equal(renderer.xr.enabled, true);
  assert.equal(renderer.shadowMap.autoUpdate, true);
  assert.equal(water.captureCount, 0);
  water.dispose();
});

test('water disposal releases both targets and owned textures and removes the surface', () => {
  const { scene } = createScene();
  const water = new StylizedWater(new THREE.CircleGeometry(2, 16));
  scene.add(water);
  let disposed = 0;
  for (const resource of [
    water.reflector.getRenderTarget(), water.refractor.getRenderTarget(),
    water.material.uniforms.tNormalMap0.value, water.material.uniforms.tNormalMap1.value,
    water.material, water.geometry,
  ]) resource.addEventListener('dispose', () => disposed++);
  water.dispose();
  assert.equal(disposed, 6);
  assert.equal(scene.children.length, 0);
});

test('all four water locations use low-poly surfaces with clear lily-pad heights', () => {
  const pond = PondModel.createPond();
  const scene = new THREE.Scene();
  const secret = new SecretFishingSpot(scene, () => 0);
  const lake = new MysticLake(scene, () => 0, {
    id: 'mysticLake', name: 'Mystic Lake', color: 0x33ccff, mapOffset: new THREE.Vector3(100, 0, 0),
  });
  const river = CozySceneModels.buildRiverDockScene();
  const found = [];
  for (const group of [pond, secret.group, lake.group, river]) {
    let count = 0;
    group.traverse(object => {
      if (object.isWater) { count++; found.push(object); }
    });
    assert.equal(count, 1);
  }
  assert.equal(lake.waterSurface.reflector.getRenderTarget().width, 512);
  assert.ok(lake.lilyPads.every(pad => pad.mesh.position.y > lake.waterSurface.position.y));
  assert.equal(lake.boatGroup.position.y, 0.2);
  for (const water of found) water.dispose();
});
