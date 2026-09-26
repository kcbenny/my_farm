import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';

const GEO = { sphere12: new THREE.SphereGeometry(1, 12, 8), cone12: new THREE.ConeGeometry(1, 1, 12) };

const MAT = {
  grass: new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.85 }),
  water: new THREE.MeshStandardMaterial({ color: 0x0b6f78, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.82 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x704629, roughness: 0.85 }),
  lily: new THREE.MeshStandardMaterial({ color: 0x3d8a4a, roughness: 0.7, side: THREE.DoubleSide }),
  willow: new THREE.MeshStandardMaterial({ color: 0x5c8a3f, roughness: 0.8, side: THREE.DoubleSide }),
  flower: (h) => new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(h, 0.7, 0.6) }),
};

export class MysticLake extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg);
    this.fish = [];
    this.fireflies = [];
    this.build();
  }

  build() {
    // Ground ring
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(16, 16.5, 0.5, 32), MAT.grass);
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Lake water
    const lake = new THREE.Mesh(new THREE.CylinderGeometry(9, 8.5, 0.25, 32), MAT.water);
    lake.position.y = 0.05;
    lake.receiveShadow = true;
    this.group.add(lake);

    // Lily pads
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
      const r = 3 + (i % 4) * 1.5;
      const lily = new THREE.Mesh(new THREE.CircleGeometry(0.35 + Math.random() * 0.2, 12), MAT.lily);
      lily.rotation.x = -Math.PI / 2;
      lily.position.set(Math.sin(a) * r, 0.18, Math.cos(a) * r);
      this.group.add(lily);
      if (Math.random() > 0.4) {
        const flower = new THREE.Mesh(GEO.cone12, MAT.flower(Math.random()));
        flower.scale.setScalar(0.12);
        flower.position.set(Math.sin(a) * r, 0.32, Math.cos(a) * r);
        this.group.add(flower);
      }
    }

    // Fish (emissive, NOT pointlights)
    for (let i = 0; i < 5; i++) {
      const fish = new THREE.Group();
      const body = new THREE.Mesh(GEO.sphere12, new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(i / 6, 0.8, 0.5), roughness: 0.4,
      }));
      body.scale.set(1.5, 0.4, 0.7);
      fish.add(body);
      const tail = new THREE.Mesh(GEO.cone12, body.material);
      tail.scale.setScalar(0.2);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -0.25;
      fish.add(tail);
      fish.position.y = 0.22;
      this.group.add(fish);
      this.fish.push({ mesh: fish, radius: 2 + i * 1.0, phase: i * 1.0, speed: 0.3 + i * 0.05 });
    }

    // Willow trees
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 13.5;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 3, 12), MAT.wood);
      trunk.position.set(Math.sin(a) * r, 1.5, Math.cos(a) * r);
      trunk.castShadow = true;
      this.group.add(trunk);
      const crown = new THREE.Mesh(GEO.sphere12, MAT.willow);
      crown.scale.set(2, 1.2, 2);
      crown.position.set(Math.sin(a) * r, 3, Math.cos(a) * r);
      this.group.add(crown);
    }

    // Fireflies (emissive spheres)
    const ffGeo = new THREE.SphereGeometry(0.06, 4, 3);
    const ffMat = new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.7 });
    for (let i = 0; i < 18; i++) {
      const ff = new THREE.Mesh(ffGeo, ffMat.clone());
      ff.position.set((Math.random() - 0.5) * 26, 0.3 + Math.random() * 2.5, (Math.random() - 0.5) * 26);
      this.group.add(ff);
      this.fireflies.push({ mesh: ff, baseX: ff.position.x, baseZ: ff.position.z, baseY: ff.position.y, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.5 });
    }

    // Dock
    const dock = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.5), MAT.wood);
      plank.position.set(0, 0.22, -i * 0.5);
      dock.add(plank);
    }
    dock.position.set(0, 0, 8.5);
    this.group.add(dock);

    // Ambient light
    const amb = new THREE.PointLight(0x88ccdd, 1.8, 16, 2);
    amb.position.y = 4;
    this.group.add(amb);

    // Collectible pearls scattered in the lake
    const pearlPositions = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 2 + Math.random() * 10;
      pearlPositions.push(new THREE.Vector3(Math.sin(a) * r, 0.35, Math.cos(a) * r));
    }
    this.spawnGems(pearlPositions, 0.18);

    this.addReturnPortal(cfg, new THREE.Vector3(6, 0, -7));
  }

  update(delta) {
    super.update(delta);

    for (const f of this.fish) {
      const angle = this.time * f.speed + f.phase;
      f.mesh.position.x = Math.sin(angle) * f.radius;
      f.mesh.position.z = Math.cos(angle) * f.radius;
      f.mesh.rotation.y = -angle;
    }

    for (const ff of this.fireflies) {
      ff.mesh.position.x = ff.baseX + Math.sin(this.time * ff.speed + ff.phase) * 1.5;
      ff.mesh.position.z = ff.baseZ + Math.cos(this.time * ff.speed * 0.8 + ff.phase) * 1.2;
      ff.mesh.position.y = ff.baseY + Math.sin(this.time * 2 + ff.phase) * 0.5;
      ff.mesh.material.opacity = 0.3 + Math.sin(this.time * 3 + ff.phase) * 0.35;
    }
  }
}