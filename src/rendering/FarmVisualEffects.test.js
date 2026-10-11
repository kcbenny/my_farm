import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CampfireParticles } from '../world/CampfireParticles.js';
import { FarmEnvironment } from '../world/FarmEnvironment.js';
import { FarmPostProcessing } from './FarmPostProcessing.js';

function createPostProcessing(options) {
  const renderer = {
    capabilities: { isWebGL2: true },
    getPixelRatio: () => 2,
  };
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.set(0, 1.2, 6);
  camera.layers.enable(1);
  camera.lookAt(0, 1.2, 0);
  const scene = new THREE.Scene();
  const effects = new FarmPostProcessing(renderer, scene, camera, options);
  effects.composer.render = () => {};
  return { effects, camera, scene };
}

test('campfire sparks reuse one PointsMaterial batch and stay within their fire bounds', () => {
  const scene = new THREE.Scene();
  const fires = [{ pos: new THREE.Vector3(5, 2, 5) }, { pos: new THREE.Vector3(-12, 3, 6) }];
  const particles = new CampfireParticles(scene, fires);
  const geometry = particles.points.geometry;
  const positions = geometry.attributes.position.array;
  const colors = geometry.attributes.color.array;
  assert.ok(particles.points.isPoints);
  assert.ok(particles.points.material.isPointsMaterial);
  assert.equal(geometry.attributes.position.count, 64);
  assert.equal(particles.points.material.depthWrite, false);
  assert.equal(particles.points.material.map.image.width, 32);
  assert.equal(particles.points.userData.physics, false);
  assert.equal(particles.points.layers.mask, 2);

  particles.update(100);
  for (let i = 0; i < 64; i++) {
    const origin = fires[Math.floor(i / 32)].pos;
    assert.ok(Math.abs(positions[i * 3] - origin.x) < 1);
    assert.ok(positions[i * 3 + 1] >= origin.y);
    assert.ok(positions[i * 3 + 1] < origin.y + 4);
    assert.ok(Math.abs(positions[i * 3 + 2] - origin.z) < 1);
    assert.ok(colors[i * 3] >= 0 && colors[i * 3] <= 4);
  }
  particles.update(0.1);
  assert.equal(particles.points.geometry, geometry);
  assert.equal(geometry.attributes.position.array, positions);
  assert.equal(geometry.attributes.color.array, colors);
  assert.equal(scene.children.length, 1);
  particles.dispose();
  assert.equal(scene.children.length, 0);
});

test('empty campfire batch is safe to update and dispose', () => {
  const particles = new CampfireParticles(new THREE.Scene(), []);
  particles.update(1);
  assert.equal(particles.points.geometry.attributes.position.count, 0);
  particles.dispose();
});

test('composer orders depth, bloom and output correctly and resizes all targets', () => {
  const { effects } = createPostProcessing();
  assert.deepEqual(effects.composer.passes, [
    effects.renderPass, effects.bokehPass, effects.bloomPass, effects.godRaysPass, effects.outputPass,
  ]);
  assert.equal(effects.bloomPass.strength, 0.24);
  assert.equal(effects.bloomPass.threshold, 1.1);
  assert.equal(effects.bokehPass.uniforms.maxblur.value, 0.003);
  effects.resize(800, 450, 2);
  assert.equal(effects.composer.renderTarget1.width, 1200);
  assert.equal(effects.composer.renderTarget1.height, 675);
  assert.equal(effects.bokehPass.renderTargetDepth.width, 1200);
  assert.equal(effects.bokehPass.uniforms.aspect.value, 800 / 450);
  assert.equal(effects.composer.renderTarget1.samples, 4);
  effects.resize(450, 800, 1);
  assert.equal(effects.bokehPass.renderTargetDepth.height, 800);
  assert.equal(effects.bokehPass.uniforms.aspect.value, 450 / 800);
  effects.dispose();
});

test('depth focus follows view-space player depth and pauses for FPS and aiming', () => {
  const { effects, camera } = createPostProcessing();
  const controller = {
    position: new THREE.Vector3(),
    cameraLookOffset: new THREE.Vector3(0, 1.2, 0),
    viewMode: 'tps',
    isAiming: false,
  };
  camera.position.x = 3;
  camera.lookAt(0, 1.2, 0);
  effects.render(1, controller);
  assert.ok(Math.abs(effects.bokehPass.uniforms.focus.value - Math.hypot(3, 6)) < 0.001);
  assert.equal(effects.bokehPass.enabled, true);
  controller.viewMode = 'fps';
  effects.render(0.1, controller);
  assert.equal(effects.bokehPass.enabled, false);
  controller.viewMode = 'tps';
  controller.isAiming = true;
  effects.render(0.1, controller);
  assert.equal(effects.bokehPass.enabled, false);
  controller.isAiming = false;
  effects.setDepthOfFieldEnabled(false);
  effects.render(0.1, controller);
  assert.equal(effects.bokehPass.enabled, false);
  effects.setDepthOfFieldEnabled(true);
  effects.render(0.1, controller);
  assert.equal(effects.bokehPass.enabled, true);
  effects.setBloomEnabled(false);
  assert.equal(effects.bloomPass.enabled, false);
  assert.equal(effects.outputPass.enabled, true);
  effects.dispose();
});

test('touch-device configuration starts without depth of field', () => {
  const { effects } = createPostProcessing({ depthOfField: false });
  assert.equal(effects.depthOfField, false);
  assert.equal(effects.bokehPass.enabled, false);
  assert.equal(effects.bloomPass.enabled, true);
  assert.equal(effects.godRaysPass.enabled, false);
  effects.dispose();
});

test('portal god rays project an active portal source into the composer shader', () => {
  const { effects, camera } = createPostProcessing();
  camera.position.set(0, 1.4, 6);
  camera.lookAt(0, 1.4, 0);
  effects.setPortalGodRays(new THREE.Vector3(0, 1.4, 0), 2);
  effects.render(0.1, {
    position: new THREE.Vector3(),
    cameraLookOffset: new THREE.Vector3(0, 1.2, 0),
    viewMode: 'tps',
    isAiming: false,
  });
  assert.equal(effects.godRaysPass.enabled, true);
  assert.equal(effects.godRaysPass.uniforms.intensity.value, 0.18);
  assert.deepEqual(effects.godRaysPass.uniforms.lightPosition.value.toArray(), [0.5, 0.5]);
  effects.setPortalGodRays(null);
  assert.equal(effects.godRaysPass.enabled, false);
  effects.dispose();
});

test('bokeh depth pass excludes particle layer and restores the camera mask', () => {
  const { effects, camera, scene } = createPostProcessing();
  const masks = [];
  const renderer = {
    autoClear: true,
    getClearColor: color => color.set(0),
    getClearAlpha: () => 1,
    setClearColor() {},
    setClearAlpha() {},
    setRenderTarget() {},
    clear() {},
    render(object, renderCamera) {
      if (object === scene) masks.push(renderCamera.layers.mask);
    },
  };
  effects.bokehPass.render(renderer, {}, { texture: {} });
  assert.deepEqual(masks, [1]);
  assert.equal(camera.layers.mask, 3);
  assert.equal(scene.overrideMaterial, null);
  effects.dispose();
});

test('lighting includes directional shadows and ambient fill in every preset', () => {
  const farm = Object.create(FarmEnvironment.prototype);
  farm.scene = new THREE.Scene();
  farm.createAmbientMotes = () => {};
  farm.setupLighting();
  assert.ok(farm.sunLight.isDirectionalLight);
  assert.equal(farm.sunLight.castShadow, true);
  assert.equal(farm.sunLight.shadow.mapSize.width, 2048);
  assert.ok(farm.ambientLight.isAmbientLight);
  for (const preset of ['day', 'sunset', 'night', 'studio']) {
    farm.setLightingPreset(preset);
    assert.ok(farm.ambientLight.intensity > 0 && farm.ambientLight.intensity <= 0.25);
    assert.ok(farm.sunLight.intensity > 0);
  }
});
