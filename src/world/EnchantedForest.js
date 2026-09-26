import * as THREE from 'three';
import { ADVENTURE_MAPS } from './PortalSystem.js';

const m = {
  ground: new THREE.MeshStandardMaterial({ color: 0x1a3a2a, roughness: 0.95, flatShading: true }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95, flatShading: true }),
  leaves: new THREE.MeshStandardMaterial({ color: 0x0f3d1f, roughness: 0.85, flatShading: true }),
  mushStem: new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.8, flatShading: true }),
  mushCap: (hue) => new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 0.9, 0.55) }),
  wisp: new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.7 }),
  mist: new THREE.MeshBasicMaterial({ color: 0x88aacc, transparent: true, opacity: 0.08, side: THREE.DoubleSide }),
};

export class EnchantedForest {
  constructor(scene, getTerrainHeight) {
    this.scene = scene;
    this.time = 0;
    this.wisps = [];
    this.mushrooms = [];

    const cfg = ADVENTURE_MAPS.enchantedForest;
    const o = cfg.mapOffset.clone();

    this.group = new THREE.Group();
    this.group.name = 'EnchantedForest';
    this.group.position.copy(o);
    scene.add(this.group);

    // Ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(16, 16.5, 0.5, 32), m.ground);
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Giant trees
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + 0.15;
      const radius = 15 + (i % 3) * 0.6;
      const tree = this.makeGiantTree(1.0 + (i % 3) * 0.3);
      tree.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
      this.group.add(tree);
    }

    // Giant glowing mushrooms
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 6 + (i % 4) * 2.5;
      const mush = this.makeMushroom(0.7 + Math.random() * 0.8, i / 12);
      mush.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
      this.group.add(mush);
      this.mushrooms.push({ mesh: mush, phase: Math.random() * Math.PI * 2 });
    }

    // Mist planes
    for (let i = 0; i < 5; i++) {
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(30, 6, 1, 1), m.mist);
      mist.rotation.y = i * 0.6;
      mist.position.set(0, 1.5 + i * 0.4, 0);
      this.group.add(mist);
    }

    // Floating wisps
    for (let i = 0; i < 20; i++) {
      const wisp = new THREE.PointLight(0xaaddff, 0.8, 3, 2);
      wisp.position.set(
        (Math.random() - 0.5) * 24,
        0.5 + Math.random() * 3,
        (Math.random() - 0.5) * 24
      );
      this.group.add(wisp);
      this.wisps.push({
        light: wisp,
        baseX: wisp.position.x,
        baseZ: wisp.position.z,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
        amp: 1 + Math.random() * 2,
        baseY: wisp.position.y,
      });
    }

    // Central glowing tree stump (focal point)
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 1.2, 8), m.trunk);
    stump.position.y = 0.6;
    stump.castShadow = true;
    this.group.add(stump);
    const stumpGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x7b2fbe, transparent: true, opacity: 0.6 })
    );
    stumpGlow.position.y = 1.4;
    this.group.add(stumpGlow);
    this.stumpGlow = stumpGlow;

    // Return portal at the forest
    this.addReturnPortal(cfg);
  }

  makeGiantTree(scale) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 3.5 * scale, 6), m.trunk);
    trunk.position.y = 1.75 * scale;
    trunk.castShadow = true;
    tree.add(trunk);
    for (let i = 0; i < 4; i++) {
      const leaves = new THREE.Mesh(new THREE.ConeGeometry((2.2 - i * 0.3) * scale, 1.6 * scale, 6), m.leaves);
      leaves.position.y = (2.8 + i * 1.0) * scale;
      leaves.castShadow = true;
      tree.add(leaves);
    }
    return tree;
  }

  makeMushroom(scale, hue) {
    const mush = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 1.2 * scale, 6), m.mushStem);
    stem.position.y = 0.6 * scale;
    mush.add(stem);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.55 * scale, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), m.mushCap(hue));
    cap.position.y = 1.1 * scale;
    mush.add(cap);
    return mush;
  }

  addReturnPortal(cfg) {
    const glow = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.15, 6, 12), glow);
    ring.position.y = 1.4;
    ring.rotation.y = Math.PI / 2;
    const light = new THREE.PointLight(cfg.color, 2.4, 9, 1.8);
    light.position.y = 1.4;

    this.returnPortal = new THREE.Group();
    this.returnPortal.add(ring);
    this.returnPortal.add(light);
    this.returnPortal.name = 'ReturnPortal_Forest';
    this.returnPortal.position.set(0, 0, -8);
    this.group.add(this.returnPortal);
    this.returnRing = ring;
    this.returnLight = light;
  }

  getReturnPosition() {
    const pos = new THREE.Vector3();
    this.returnPortal.getWorldPosition(pos);
    return pos;
  }

  isNearReturnPortal(position) {
    const rp = this.getReturnPosition();
    return position.distanceToSquared(rp) < 7.5;
  }

  update(delta) {
    this.time += delta;
    // Animate wisps
    this.wisps.forEach(w => {
      w.light.position.x = w.baseX + Math.sin(this.time * w.speed + w.phase) * w.amp;
      w.light.position.z = w.baseZ + Math.cos(this.time * w.speed * 0.7 + w.phase) * w.amp * 0.7;
      w.light.position.y = w.baseY + Math.sin(this.time * 1.3 + w.phase) * 0.5;
      w.light.intensity = 0.5 + Math.sin(this.time * 2 + w.phase) * 0.3;
    });
    // Pulse mushrooms
    this.mushrooms.forEach(m => {
      m.mesh.scale.setScalar(1 + Math.sin(this.time * 1.5 + m.phase) * 0.06);
    });
    // Pulse stump glow
    if (this.stumpGlow) {
      this.stumpGlow.scale.setScalar(1 + Math.sin(this.time * 2) * 0.15);
    }
    // Spinning return portal
    if (this.returnRing) {
      this.returnRing.rotation.z = this.time * 0.8;
      this.returnRing.scale.setScalar(1 + Math.sin(this.time * 2) * 0.05);
    }
  }
}