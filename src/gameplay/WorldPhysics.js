import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';

export const REFERENCE_HEIGHTS = Object.freeze({ player: 1.8, door: 2.2, house: 5, farm: 5, tree: 4, crop: 0.65, collectible: 0.3 });
const WALKABLE = new Set(['road', 'terrain', 'grass', 'farmland']);
const TRIGGERS = new Set(['crop', 'collectible']);
const SOLID = new Set(['house', 'farm', 'tree', 'obstacle']);
const aliases = { path: 'road', dirt_path: 'road', ground: 'terrain', soil: 'farmland', structure: 'farm', fence: 'obstacle' };

export function classifyObject(object, inherited = null) {
  const explicit = object.userData.type || object.userData.category || object.userData.collisionMask;
  if (explicit) return aliases[explicit.toLowerCase()] || explicit.toLowerCase();
  if (object.userData.isTerrain) return 'terrain';
  const name = object.name.toLowerCase();
  const patterns = [
    ['road', /road|path/], ['farmland', /farmland|soil|garden.?bed/],
    ['grass', /grass/], ['terrain', /terrain|ground|floor|base.?island/],
    ['crop', /crop|wheat|corn|carrot|tomato/], ['collectible', /collectible|catnip|treat|yarn/],
    ['tree', /tree|trunk/], ['house', /house|cabin|cottage/],
    ['farm', /barn|farm|windmill|stall|greenhouse/], ['obstacle', /wall|fence|rock|post/],
  ];
  return patterns.find(([, pattern]) => pattern.test(name))?.[0] || inherited;
}

export function normalizeAsset(object, type = classifyObject(object), targetHeight = REFERENCE_HEIGHTS[type]) {
  if (targetHeight === null) return object;
  if (!type) {
    for (const child of object.children) normalizeAsset(child);
    return object;
  }
  if (!(targetHeight > 0)) return object;
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  let measuredHeight = box.max.y - box.min.y;
  let intendedHeight = targetHeight;
  if (type === 'house' || type === 'farm') {
    let door = null;
    object.traverse(node => {
      if (!door && /door/i.test(node.name)) door = node;
    });
    if (door) {
      const doorBox = new THREE.Box3().setFromObject(door);
      if (doorBox.max.y > doorBox.min.y) {
        measuredHeight = doorBox.max.y - doorBox.min.y;
        intendedHeight = REFERENCE_HEIGHTS.door;
      }
    }
  }
  if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) return object;
  object.scale.multiplyScalar(intendedHeight / measuredHeight);
  object.updateWorldMatrix(true, true);
  box.setFromObject(object);
  object.userData.modelHeight = box.max.y - box.min.y;
  object.userData.playerPivotOffset = object.getWorldPosition(new THREE.Vector3()).y - box.min.y;
  return object;
}

export class WorldPhysics {
  constructor(scene, { debug = false } = {}) {
    this.scene = scene;
    this.debug = debug;
    this.entries = new Map();
    this.surfaces = [];
    this.obstacles = [];
    this.triggers = [];
    this.roads = [];
    this.raycaster = new THREE.Raycaster();
    this.rayMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    this.surfaceTop = 0;
    this.cameraArm = null;
    this.faded = new Map();
    this.helpers = new THREE.Group();
    this.helpers.name = 'Physics_Debug';
    this.helpers.visible = debug;
    scene.add(this.helpers);
    this.groundArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 2, 0xffff00);
    this.helpers.add(this.groundArrow);
  }

  register(root, fallback = null) {
    root.updateWorldMatrix(true, true);
    const visit = (node, inherited) => {
      if (node.userData.physics === false) return;
      const type = classifyObject(node, inherited);
      if (node.isMesh && node.geometry?.attributes.position && (WALKABLE.has(type) || TRIGGERS.has(type) || SOLID.has(type))) {
        const previous = this.entries.get(node);
        if (previous?.helper) {
          this.helpers.remove(previous.helper);
          previous.helper.dispose();
        }
        const proxy = new THREE.Mesh(node.geometry, this.rayMaterial);
        proxy.matrixAutoUpdate = false;
        const entry = { mesh: node, type, proxy, box: new THREE.Box3(), obb: new OBB(), matrix: new THREE.Matrix4(), version: -1 };
        this.entries.set(node, entry);
        this.refreshEntry(entry, true);
      }
      for (const child of node.children) visit(child, type);
    };
    visit(root, fallback);
    this.reindex();
    if (this.debug) console.debug('[physics] registered', root.name, this.stats());
    return root;
  }

  unregister(root) {
    root.traverse(node => {
      this.restoreMaterial(node);
      const entry = this.entries.get(node);
      if (entry?.helper) {
        this.helpers.remove(entry.helper);
        entry.helper.dispose();
      }
      this.entries.delete(node);
    });
    this.reindex();
  }

  reindex() {
    const entries = [...this.entries.values()];
    this.surfaces = entries.filter(entry => WALKABLE.has(entry.type));
    this.obstacles = entries.filter(entry => SOLID.has(entry.type));
    this.triggers = entries.filter(entry => TRIGGERS.has(entry.type));
    this.roads = entries.filter(entry => entry.type === 'road');
    this.surfaceTop = Math.max(0, ...this.surfaces.map(entry => entry.box.max.y)) + 10;
  }

  refreshEntry(entry, force = false) {
    const { mesh, proxy, box, obb } = entry;
    mesh.updateWorldMatrix(true, false);
    const version = mesh.geometry.attributes.position.version;
    if (!force && entry.matrix.equals(mesh.matrixWorld) && entry.version === version) return;
    mesh.geometry.computeBoundingBox();
    entry.matrix.copy(mesh.matrixWorld);
    entry.version = version;
    proxy.matrixWorld.copy(mesh.matrixWorld);
    box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    obb.fromBox3(mesh.geometry.boundingBox);
    const center = obb.center.clone().applyMatrix4(mesh.matrixWorld);
    obb.center.set(0, 0, 0);
    obb.applyMatrix4(mesh.matrixWorld);
    obb.center.copy(center);
    obb.halfSize.set(Math.abs(obb.halfSize.x), Math.abs(obb.halfSize.y), Math.abs(obb.halfSize.z));
    if (this.debug && !entry.helper) {
      entry.helper = new THREE.Box3Helper(box, WALKABLE.has(entry.type) ? 0x36dd66 : 0xff6644);
      this.helpers.add(entry.helper);
    }
  }

  update() {
    for (const entry of this.entries.values()) this.refreshEntry(entry);
    this.surfaceTop = Math.max(0, ...this.surfaces.map(entry => entry.box.max.y)) + 10;
  }

  stats() {
    return { surfaces: this.surfaces.length, obstacles: this.obstacles.length, triggers: this.triggers.length, roads: this.roads.length };
  }

  surfaceAt(x, z) {
    this.raycaster.set(new THREE.Vector3(x, this.surfaceTop, z), new THREE.Vector3(0, -1, 0));
    this.raycaster.near = 0;
    this.raycaster.far = Infinity;
    const candidates = this.surfaces.filter(({ box }) => x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z);
    const hits = this.raycaster.intersectObjects(candidates.map(entry => entry.proxy), false);
    if (!hits.length) return null;
    const hit = hits[0];
    const entry = candidates.find(candidate => candidate.proxy === hit.object);
    if (this.debug) {
      this.groundArrow.position.set(x, hit.point.y + 2, z);
    }
    return { point: hit.point, height: hit.point.y, type: entry.type, mesh: entry.mesh };
  }

  intersectsPlayer(position, radius, height) {
    const bottom = position.y + radius;
    const top = position.y + Math.max(radius, height - radius);
    const sphere = new THREE.Sphere(new THREE.Vector3(), radius);
    const samples = Math.max(1, Math.ceil((top - bottom) / radius));
    for (const entry of this.obstacles) {
      if (position.x + radius < entry.box.min.x || position.x - radius > entry.box.max.x ||
          position.z + radius < entry.box.min.z || position.z - radius > entry.box.max.z ||
          position.y + height < entry.box.min.y || position.y > entry.box.max.y) continue;
      for (let sample = 0; sample <= samples; sample++) {
        sphere.center.set(position.x, THREE.MathUtils.lerp(bottom, top, sample / samples), position.z);
        if (entry.obb.intersectsSphere(sphere)) return true;
      }
    }
    return false;
  }

  overlapsRoad(x, z, halfX = 0, halfZ = halfX) {
    return this.roads.some(({ box }) => x + halfX >= box.min.x && x - halfX <= box.max.x && z + halfZ >= box.min.z && z - halfZ <= box.max.z);
  }

  validatePlacement(position, size = new THREE.Vector3(1, 1, 1), ignoreRoot = null) {
    const halfX = size.x / 2;
    const halfZ = size.z / 2;
    if (this.overlapsRoad(position.x, position.z, halfX, halfZ)) return { valid: false, reason: 'Road clearance' };
    let center = null;
    for (const offsetX of [-halfX, 0, halfX]) {
      for (const offsetZ of [-halfZ, 0, halfZ]) {
        const surface = this.surfaceAt(position.x + offsetX, position.z + offsetZ);
        if (!surface || !['grass', 'farmland'].includes(surface.type)) return { valid: false, reason: 'Grass or farmland required' };
        if (offsetX === 0 && offsetZ === 0) center = surface;
      }
    }
    for (const { mesh, box } of this.obstacles) {
      let ancestor = mesh;
      while (ancestor && ancestor !== ignoreRoot) ancestor = ancestor.parent;
      if (ignoreRoot && ancestor === ignoreRoot) continue;
      if (position.x + halfX > box.min.x && position.x - halfX < box.max.x &&
          position.z + halfZ > box.min.z && position.z - halfZ < box.max.z) return { valid: false, reason: 'Occupied' };
    }
    return { valid: true, height: center.height, reason: '' };
  }

  findPlacement(position, size, maxDistance = 20) {
    for (let distance = 0; distance <= maxDistance; distance += 1) {
      const samples = distance === 0 ? 1 : 24;
      for (let sample = 0; sample < samples; sample++) {
        const angle = sample / samples * Math.PI * 2;
        const candidate = new THREE.Vector3(position.x + Math.cos(angle) * distance, 0, position.z + Math.sin(angle) * distance);
        const result = this.validatePlacement(candidate, size);
        if (result.valid) return candidate.setY(result.height);
      }
    }
    return null;
  }

  prepareAsset(root, { type = classifyObject(root), targetHeight, position = null, validate = true } = {}) {
    if (type) root.userData.type = type;
    normalizeAsset(root, type, targetHeight);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    const centerOffset = bounds.getCenter(new THREE.Vector3()).sub(root.position);
    if (position) {
      this.update();
      const result = this.validatePlacement(position.clone().add(centerOffset), size);
      if (validate && !result.valid) throw new Error(`Invalid placement: ${result.reason}`);
      const ground = this.surfaceAt(position.x, position.z);
      root.position.copy(position);
      root.position.y = (ground?.height ?? position.y) + (root.userData.playerPivotOffset || 0);
    }
    this.scene.add(root);
    return this.register(root, type);
  }

  constrainCamera(anchor, ideal, deltaTime, camera) {
    const direction = ideal.clone().sub(anchor);
    const distance = direction.length();
    if (distance < 0.0001) return anchor.clone();
    direction.divideScalar(distance);
    const right = new THREE.Vector3().crossVectors(direction, camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, direction).normalize();
    const clearance = Math.max(0.18, camera.near * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(1, camera.aspect) + 0.08);
    let allowed = distance;
    const enclosing = new Set(this.obstacles.filter(entry => entry.obb.containsPoint(anchor)).map(entry => entry.mesh));
    this.fadeOccluders(enclosing);
    const targets = [...this.surfaces, ...this.obstacles].filter(entry => !enclosing.has(entry.mesh)).map(entry => entry.proxy);
    for (const [offsetX, offsetY] of [[0, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const origin = anchor.clone().addScaledVector(right, offsetX * clearance).addScaledVector(up, offsetY * clearance);
      this.raycaster.set(origin, direction);
      this.raycaster.near = 0;
      this.raycaster.far = distance + clearance;
      const hit = this.raycaster.intersectObjects(targets, false)[0];
      if (hit) allowed = Math.min(allowed, Math.max(0, hit.distance - clearance));
    }
    this.cameraArm = this.cameraArm === null || allowed < this.cameraArm
      ? allowed
      : THREE.MathUtils.lerp(this.cameraArm, allowed, 1 - Math.exp(-6 * deltaTime));
    return anchor.clone().addScaledVector(direction, this.cameraArm);
  }

  fadeOccluders(meshes = new Set()) {
    for (const mesh of this.faded.keys()) {
      if (!meshes.has(mesh)) this.restoreMaterial(mesh);
    }
    for (const mesh of meshes) {
      if (this.faded.has(mesh)) continue;
      const original = mesh.material;
      const materials = (Array.isArray(original) ? original : [original]).map(material => {
        const faded = material.clone();
        faded.transparent = true;
        faded.opacity = 0.15;
        faded.depthWrite = false;
        return faded;
      });
      this.faded.set(mesh, { original, materials });
      mesh.material = Array.isArray(original) ? materials : materials[0];
    }
  }

  restoreMaterial(mesh) {
    const state = this.faded.get(mesh);
    if (!state) return;
    mesh.material = state.original;
    for (const material of state.materials) material.dispose();
    this.faded.delete(mesh);
  }
}