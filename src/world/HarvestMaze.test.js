import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HarvestMaze } from './HarvestMaze.js';

const cfg = {
  id: 'harvestMaze',
  name: 'Harvest Corn Maze',
  color: 0xff6b35,
  mapOffset: new THREE.Vector3(-220, 0, -220),
};

test('harvest maze builds a connected navigation mesh with corridor-safe instanced walls', () => {
  const maze = new HarvestMaze(new THREE.Scene(), () => 0, cfg);
  const { navigationMesh } = maze;
  const path = maze.findNavigationPath(0, navigationMesh.cells.length - 1);

  assert.equal(navigationMesh.cells.length, 121);
  assert.ok(navigationMesh.cellSize - 0.6 > 2);
  assert.ok(path.length > 1);
  assert.ok(maze.group.children.some(child => child.isInstancedMesh && child.geometry.type === 'BoxGeometry'));
  assert.ok(maze.getObstacleColliders().length >= navigationMesh.segments.length);
});

test('pumpkin gems use emissive material, particles, raycast collection, and maze fog', () => {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x78b5e7, 0.0032);
  const maze = new HarvestMaze(scene, () => 0, cfg);
  const gem = maze.collectibles[0];
  const gemPosition = gem.getWorldPosition(new THREE.Vector3());

  assert.ok(gem.material.isMeshStandardMaterial);
  assert.ok(gem.material.emissiveIntensity > 0);
  assert.ok(maze.gemParticles.isPoints);
  maze.setAtmosphere(true);
  assert.equal(scene.fog.color.getHex(), 0x4a2a19);
  assert.equal(maze.checkCollect(gemPosition), true);
  assert.equal(gem.userData.collected, true);
  maze.setAtmosphere(false);
  assert.equal(scene.fog.color.getHex(), 0x78b5e7);
});
