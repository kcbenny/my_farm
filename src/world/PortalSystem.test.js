import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PortalSystem } from './PortalSystem.js';

test('magic portals use a shader ring and one BufferGeometry particle energy ring', () => {
  const portals = new PortalSystem(new THREE.Scene(), () => 0);
  const portal = portals.portals.enchantedForest.mesh;

  assert.equal(portal.userData.ring.geometry.type, 'RingGeometry');
  assert.ok(portal.userData.ring.material.isShaderMaterial);
  assert.ok(portal.userData.particles.isPoints);
  assert.ok(portal.userData.particles.geometry.isBufferGeometry);
  assert.equal(portal.userData.particles.geometry.attributes.position.count, 96);
  assert.equal(portal.userData.particleMaterial.depthWrite, false);
});

test('nearby portals brighten and complete their teleport charge animation', () => {
  const portals = new PortalSystem(new THREE.Scene(), () => 0);
  const entry = portals.portals.enchantedForest;
  const playerPosition = entry.config.farmPortalPos.clone();

  assert.equal(portals.beginTeleport('enchantedForest'), true);
  portals.update(0.2, playerPosition);
  assert.ok(entry.mesh.userData.ringMaterial.uniforms.intensity.value > 2);
  assert.ok(portals.getVisualState().intensity > 2);
  assert.equal(portals.update(0.4, playerPosition), 'enchantedForest');
  assert.equal(portals.update(0.1, playerPosition), null);
});
