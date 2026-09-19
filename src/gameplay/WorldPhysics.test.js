import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WorldPhysics, classifyObject, normalizeAsset } from './WorldPhysics.js';
import { PlayerPhysicsSystem } from './PlayerPhysicsSystem.js';
import { KittyHomeSystem } from './KittyHomeSystem.js';
import { CropSystem } from './CropSystem.js';
import { PlayableItemsSystem } from './PlayableItemsSystem.js';
import { GLTFExportManager } from './GLTFExportManager.js';

function setupWorld() {
  const scene = new THREE.Scene();
  const world = new WorldPhysics(scene);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(100, 100));
  grass.rotation.x = -Math.PI / 2;
  grass.userData.type = 'grass';
  scene.add(grass);
  world.register(grass);
  return world;
}

function addBox(world, type, size, position) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size));
  mesh.userData.type = type;
  mesh.position.set(...position);
  world.scene.add(mesh);
  world.register(mesh);
  return mesh;
}

test('classification honors metadata and inherited roles for imported hierarchies', () => {
  const world = setupWorld();
  const root = new THREE.Group();
  root.name = 'Imported_Farm';
  const road = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 6));
  road.name = 'dirt_path_001';
  const crop = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  crop.userData.type = 'crop';
  crop.name = 'house';
  root.add(road, crop);
  world.scene.add(root);
  world.register(root);
  assert.equal(classifyObject(crop), 'crop');
  assert.equal(world.roads.length, 1);
  assert.equal(world.triggers.length, 1);
  assert.equal(world.obstacles.length, 0);
});

test('ground selects the top road even with reversed winding and a buried player', () => {
  const world = setupWorld();
  const road = new THREE.Mesh(new THREE.PlaneGeometry(4, 4));
  road.rotation.x = Math.PI / 2;
  road.position.y = 4;
  road.userData.type = 'road';
  world.scene.add(road);
  world.register(road);
  const mesh = new THREE.Group();
  mesh.userData.playerPivotOffset = 0.2;
  const controller = { cat: { mesh }, position: new THREE.Vector3(0, -50, 0), jumpOffset: -1, verticalVelocity: -100 };
  const physics = new PlayerPhysicsSystem({ controller, worldPhysics: world });
  physics.clampToGround();
  assert.equal(controller.position.y, 4.2);
  assert.equal(controller.verticalVelocity, 0);
  assert.equal(controller.isGrounded, true);
  controller.position.x = 10;
  physics.clampToGround();
  assert.ok(Math.abs(controller.position.y - 0.2) < 1e-6);
});

test('OBBs follow offset geometry, parent rotation, scale, and later movement', () => {
  const world = setupWorld();
  const parent = new THREE.Group();
  parent.rotation.y = Math.PI / 4;
  parent.scale.setScalar(2);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 4).translate(3, 1.5, 0));
  mesh.userData.type = 'house';
  parent.add(mesh);
  world.scene.add(parent);
  world.register(parent);
  const center = new THREE.Vector3(3, 1.5, 0).applyMatrix4(mesh.matrixWorld);
  assert.ok(world.entries.get(mesh).obb.containsPoint(center));
  const emptyCorner = new THREE.Vector3(3.8, 0, 1.8).applyMatrix4(mesh.matrixWorld);
  assert.equal(world.intersectsPlayer(emptyCorner, 0.1, 1.8), false);
  parent.position.x = 20;
  world.update();
  assert.equal(world.entries.get(mesh).obb.containsPoint(center), false);
});

test('substepped movement cannot tunnel through thin walls and crops do not block', () => {
  const world = setupWorld();
  addBox(world, 'crop', [1, 2, 1], [1, 1, 0]);
  addBox(world, 'house', [0.1, 4, 8], [3, 2, 0]);
  const mesh = new THREE.Group();
  mesh.userData.modelHeight = 1.8;
  const controller = { cat: { mesh }, position: new THREE.Vector3(), jumpOffset: 0, isGrounded: true };
  const physics = new PlayerPhysicsSystem({ controller, worldPhysics: world });
  physics.movePlayer(new THREE.Vector3(10, 0, 0));
  assert.ok(controller.position.x > 1.5 && controller.position.x < 2.6);
});

test('placement tests the whole footprint and rejects unsupported terrain', () => {
  const world = setupWorld();
  addBox(world, 'road', [2, 0.1, 20], [0, 0.1, 0]);
  assert.equal(world.validatePlacement(new THREE.Vector3(2, 0, 0), new THREE.Vector3(3, 2, 3)).valid, false);
  assert.equal(world.validatePlacement(new THREE.Vector3(5, 0, 0)).valid, true);
  assert.equal(world.validatePlacement(new THREE.Vector3(100, 0, 0)).valid, false);
  const relocated = world.findPlacement(new THREE.Vector3(), new THREE.Vector3(2, 2, 2));
  assert.ok(relocated && !world.overlapsRoad(relocated.x, relocated.z, 1));
  addBox(world, 'terrain', [4, 1, 4], [10, 1, 0]);
  assert.equal(world.validatePlacement(new THREE.Vector3(10, 0, 0)).valid, false);
});

test('scale normalization uses player height and named door height uniformly', () => {
  const player = new THREE.Mesh(new THREE.BoxGeometry(4, 10, 2));
  normalizeAsset(player, 'player');
  assert.ok(Math.abs(player.userData.modelHeight - 1.8) < 1e-6);
  assert.equal(player.scale.x, player.scale.y);
  const house = new THREE.Group();
  const door = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 0.2));
  door.name = 'Front_Door';
  house.add(door);
  normalizeAsset(house, 'house');
  assert.ok(Math.abs(new THREE.Box3().setFromObject(door).getSize(new THREE.Vector3()).y - 2.2) < 1e-6);
});

test('camera retracts in front of a wall and smoothly recovers after rotation clears it', () => {
  const world = setupWorld();
  addBox(world, 'house', [8, 8, 0.2], [0, 3, 3]);
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 100);
  const anchor = new THREE.Vector3(0, 1.5, 0);
  const blocked = world.constrainCamera(anchor, new THREE.Vector3(0, 3, 8), 1 / 60, camera);
  assert.ok(blocked.z < 2.9);
  const arm = world.cameraArm;
  const clear = world.constrainCamera(anchor, new THREE.Vector3(8, 3, 0), 1 / 60, camera);
  assert.ok(world.cameraArm > arm && world.cameraArm < 8);
  assert.equal(clear.z, 0);
});

test('home placement and construction cannot commit over a road', () => {
  const world = setupWorld();
  addBox(world, 'road', [2, 0.1, 30], [0, 0.1, 0]);
  const home = new KittyHomeSystem(world.scene, null, () => 0, world);
  const original = home.position.clone();
  home.setPlacementMode(true);
  home.placementPoint = new THREE.Vector3(0, 0, 0);
  assert.equal(home.confirmPlacement(), false);
  assert.ok(home.position.equals(original));
  assert.equal(home.upgradeStage(), false);
  home.placementPoint = new THREE.Vector3(15, 0, 15);
  assert.equal(home.confirmPlacement(), true);
  assert.equal(home.upgradeStage(), true);
  assert.equal(home.validateSite().valid, true);
  assert.ok(world.obstacles.length > 0);
});

test('invalid crop planting preserves the existing crop and collectibles remain triggers', () => {
  const world = setupWorld();
  addBox(world, 'road', [2, 0.1, 30], [0, 0.1, 0]);
  const crops = new CropSystem(world.scene, [], world);
  const crop = { position: new THREE.Vector3(), stage: 'empty', mesh: new THREE.Group() };
  assert.equal(crops.plantSeed(crop, 'carrot'), false);
  assert.equal(crop.stage, 'empty');
  const items = new PlayableItemsSystem(world.scene, null, () => 0, world);
  const item = items.spawnFurBall(new THREE.Vector3(10, 0, 0));
  assert.equal(item.group.userData.type, 'collectible');
  assert.ok(world.triggers.length > 0);
  assert.equal(world.obstacles.length, 0);
});

test('import preparation normalizes named children and validates offset geometry', () => {
  const container = new THREE.Group();
  const tree = new THREE.Mesh(new THREE.BoxGeometry(1, 20, 1));
  tree.name = 'Oak_Tree';
  container.add(tree);
  GLTFExportManager.prepareLoadedAsset(container, { targetHeight: null });
  assert.equal(tree.scale.y, 1);
  GLTFExportManager.prepareLoadedAsset(container);
  assert.ok(Math.abs(new THREE.Box3().setFromObject(tree).getSize(new THREE.Vector3()).y - 4) < 1e-6);
  const world = setupWorld();
  addBox(world, 'road', [2, 0.1, 30], [0, 0.1, 0]);
  const offsetMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1).translate(-5, 1, 0));
  assert.throws(() => world.prepareAsset(offsetMesh, { type: 'house', targetHeight: 2, position: new THREE.Vector3(5, 0, 0) }), /Invalid placement/);
  assert.equal(offsetMesh.parent, null);
});

test('camera fades enclosing meshes without changing shared materials and restores them', () => {
  const world = setupWorld();
  const mesh = addBox(world, 'house', [3, 4, 3], [0, 2, 0]);
  const original = mesh.material;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  world.constrainCamera(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 2, 8), 0.016, camera);
  assert.notEqual(mesh.material, original);
  assert.equal(mesh.material.opacity, 0.15);
  assert.equal(original.opacity, 1);
  world.constrainCamera(new THREE.Vector3(10, 2, 0), new THREE.Vector3(10, 2, 8), 0.016, camera);
  assert.equal(mesh.material, original);
});

test('upward movement is stopped beneath an obstacle ceiling', () => {
  const world = setupWorld();
  addBox(world, 'house', [5, 0.2, 5], [0, 2.5, 0]);
  const mesh = new THREE.Group();
  mesh.userData.modelHeight = 1.8;
  const controller = { cat: { mesh }, position: new THREE.Vector3(), jumpOffset: 4, verticalVelocity: 10 };
  const physics = new PlayerPhysicsSystem({ controller, worldPhysics: world });
  physics.clampToGround();
  assert.ok(controller.position.y < 0.7);
  assert.equal(controller.verticalVelocity, 0);
});