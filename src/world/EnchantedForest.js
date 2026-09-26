import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';

const GEO = {
  cone12: new THREE.ConeGeometry(1, 1, 12),
  sphere12: new THREE.SphereGeometry(1, 12, 8),
};

const MAT = {
  moss: new THREE.MeshStandardMaterial({ color: 0x2d5a1e, roughness: 0.85 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x1a4a2a, roughness: 0.8 }),
  mushStem: new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.7 }),
  mushCap: (h) => new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(h, 0.85, 0.5) }),
  wisp: new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 }),
  mist: new THREE.MeshBasicMaterial({ color: 0x6699aa, transparent: true, opacity: 0.06, side: THREE.DoubleSide }),
};

export class EnchantedForest extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg);
    this.wisps = [];
    this.build();
  }

  build() {
    // Ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(16, 16.5, 0.5, 32), MAT.moss);
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Giant trees (ring)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = 13.5 + (i % 3) * 1.2;
      const tree = this.makeTree(1.0 + (i % 3) * 0.25);
      tree.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      this.group.add(tree);
    }

    // Giant mushrooms
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = 5.5 + (i % 4) * 2;
      const mush = new THREE.Group();
      const stem = new THREE.Mesh(GEO.cone12, MAT.mushStem);
      stem.scale.set(0.2, 1.2, 0.2);
      stem.position.y = 0.6;
      mush.add(stem);
      const cap = new THREE.Mesh(GEO.sphere12, MAT.mushCap(i / 10));
      cap.scale.set(0.6, 0.35, 0.6);
      cap.position.y = 1.2;
      mush.add(cap);
      mush.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      this.group.add(mush);
    }

    // Central ancient tree stump
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 2, 24), MAT.trunk);
    stump.position.y = 1;
    stump.castShadow = true;
    this.group.add(stump);

    const stumpGlow = new THREE.Mesh(GEO.sphere12, new THREE.MeshBasicMaterial({ color: 0x9944ff, transparent: true, opacity: 0.55 }));
    stumpGlow.scale.set(0.7, 0.7, 0.7);
    stumpGlow.position.y = 2.2;
    this.group.add(stumpGlow);
    this.stumpGlow = stumpGlow;

    // Ambient light (only 1 PointLight)
    const ambientLight = new THREE.PointLight(0x6699cc, 1.5, 15, 2);
    ambientLight.position.y = 3;
    this.group.add(ambientLight);

    // Mist planes
    for (let i = 0; i < 4; i++) {
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(28, 5), MAT.mist);
      mist.rotation.y = i * 0.7;
      mist.position.set(0, 1.2 + i * 0.5, 0);
      this.group.add(mist);
    }

    // Floating wisps (emissive spheres, NOT PointLights)
    for (let i = 0; i < 16; i++) {
      const wisp = new THREE.Mesh(GEO.sphere12, MAT.wisp.clone());
      wisp.scale.setScalar(0.12);
      const bx = (Math.random() - 0.5) * 20;
      const bz = (Math.random() - 0.5) * 20;
      const by = 0.6 + Math.random() * 2.5;
      wisp.position.set(bx, by, bz);
      this.group.add(wisp);
      this.wisps.push({
        mesh: wisp,
        baseX: bx, baseZ: bz, baseY: by,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
      });
    }

    // Collectibles — fairy dust
    const fairyGems = [];
    for (let i = 0; i < 14; i++) {
      const a = i * 0.8 + Math.random() * 0.5;
      const r = 3 + Math.random() * 9;
      fairyGems.push(new THREE.Vector3(Math.sin(a) * r, 0.5 + Math.random() * 0.6, Math.cos(a) * r));
    }
    this.spawnGems(fairyGems, 0.2);

    this.addReturnPortal(cfg, new THREE.Vector3(0, 0, -8));
  }

  makeTree(scale) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.5 * scale, 3.5 * scale, 12), MAT.trunk);
    trunk.position.y = 1.75 * scale;
    trunk.castShadow = true;
    tree.add(trunk);
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(GEO.cone12, MAT.leaf);
      leaf.scale.set((2.3 - i * 0.25) * scale, 1.5 * scale, (2.3 - i * 0.25) * scale);
      leaf.position.y = (2.6 + i * 1.0) * scale;
      leaf.castShadow = true;
      tree.add(leaf);
    }
    return tree;
  }

  update(delta) {
    super.update(delta);

    if (this.stumpGlow) {
      this.stumpGlow.scale.setScalar(0.7 + Math.sin(this.time * 2) * 0.1);
      this.stumpGlow.material.opacity = 0.4 + Math.sin(this.time * 3) * 0.15;
    }

    for (const w of this.wisps) {
      w.mesh.position.x = w.baseX + Math.sin(this.time * w.speed + w.phase) * 2;
      w.mesh.position.z = w.baseZ + Math.cos(this.time * w.speed * 0.7 + w.phase) * 1.5;
      w.mesh.position.y = w.baseY + Math.sin(this.time * 1.3 + w.phase) * 0.5;
      w.mesh.material.opacity = 0.4 + Math.sin(this.time * 3 + w.phase) * 0.3;
    }
  }
}