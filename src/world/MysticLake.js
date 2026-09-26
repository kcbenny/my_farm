import * as THREE from 'three';
import { ADVENTURE_MAPS } from './PortalSystem.js';

const m = {
  grass: new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.9, flatShading: true }),
  water: new THREE.MeshStandardMaterial({ color: 0x0b6f78, roughness: 0.12, metalness: 0.28, transparent: true, opacity: 0.85, flatShading: true }),
  wood: new THREE.MeshStandardMaterial({ color: 0x704629, roughness: 0.9, flatShading: true }),
  lily: new THREE.MeshStandardMaterial({ color: 0x2f7d52, roughness: 0.75, flatShading: true, side: THREE.DoubleSide }),
  flower: (hue) => new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 0.8, 0.7) }),
  willow: new THREE.MeshStandardMaterial({ color: 0x5c8a3f, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }),
};

export class MysticLake {
  constructor(scene, getTerrainHeight) {
    this.scene = scene;
    this.time = 0;
    this.fish = [];
    this.fireflies = [];
    this.ripples = [];

    const cfg = ADVENTURE_MAPS.mysticLake;
    const o = cfg.mapOffset.clone();

    this.group = new THREE.Group();
    this.group.name = 'MysticLake';
    this.group.position.copy(o);
    scene.add(this.group);

    // Ground ring
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(16, 16.5, 0.5, 32), m.grass);
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Lake water
    const lake = new THREE.Mesh(new THREE.CylinderGeometry(9, 8.5, 0.3, 32), m.water);
    lake.position.y = 0.05;
    lake.receiveShadow = true;
    this.group.add(lake);

    // Lily pads
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 3.5 + (i % 4) * 1.5;
      const lily = new THREE.Mesh(new THREE.CircleGeometry(0.35 + Math.random() * 0.2, 8), m.lily);
      lily.rotation.x = -Math.PI / 2;
      lily.position.set(Math.sin(angle) * radius, 0.22, Math.cos(angle) * radius);
      this.group.add(lily);

      if (Math.random() > 0.4) {
        const flower = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), m.flower(Math.random()));
        flower.position.set(Math.sin(angle) * radius, 0.32, Math.cos(angle) * radius);
        this.group.add(flower);
      }
    }

    // Fish
    for (let i = 0; i < 6; i++) {
      const fish = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 6, 4),
        new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(i / 6, 0.8, 0.55), roughness: 0.5, flatShading: true })
      );
      body.scale.set(1.5, 0.5, 0.7);
      fish.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 3), body.material);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -0.25;
      fish.add(tail);
      fish.position.y = 0.25;
      this.group.add(fish);
      this.fish.push({ mesh: fish, radius: 2 + i * 1.0, phase: i * 1.0, speed: 0.3 + i * 0.05 });
    }

    // Willow trees around the lake
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 13.5;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 2.5, 6), m.wood);
      trunk.position.set(Math.sin(angle) * radius, 1.25, Math.cos(angle) * radius);
      trunk.castShadow = true;
      this.group.add(trunk);

      const crown = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 5), m.willow);
      crown.position.set(Math.sin(angle) * radius, 2.8, Math.cos(angle) * radius);
      crown.scale.y = 0.6;
      this.group.add(crown);
    }

    // Fireflies
    for (let i = 0; i < 25; i++) {
      const ff = new THREE.PointLight(0xffee88, 0.6, 2.5, 2);
      ff.position.set((Math.random() - 0.5) * 28, 0.3 + Math.random() * 3, (Math.random() - 0.5) * 28);
      this.group.add(ff);
      this.fireflies.push({
        light: ff,
        baseX: ff.position.x,
        baseZ: ff.position.z,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.6,
        baseY: ff.position.y,
      });
    }

    // Small dock
    const dock = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.5), m.wood);
      plank.position.set(0, 0.25, -i * 0.5);
      dock.add(plank);
    }
    dock.position.set(0, 0, 8.5);
    this.group.add(dock);

    this.addReturnPortal(cfg);
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
    this.returnPortal.name = 'ReturnPortal_Lake';
    this.returnPortal.position.set(6, 0, -7);
    this.group.add(this.returnPortal);
    this.returnRing = ring;
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
    // Fish swimming
    this.fish.forEach(f => {
      const angle = this.time * f.speed + f.phase;
      f.mesh.position.x = Math.sin(angle) * f.radius;
      f.mesh.position.z = Math.cos(angle) * f.radius;
      f.mesh.rotation.y = -angle;
    });
    // Fireflies
    this.fireflies.forEach(ff => {
      ff.light.position.x = ff.baseX + Math.sin(this.time * ff.speed + ff.phase) * 2;
      ff.light.position.z = ff.baseZ + Math.cos(this.time * ff.speed * 0.7 + ff.phase) * 1.5;
      ff.light.position.y = ff.baseY + Math.sin(this.time * 2 + ff.phase) * 0.8;
      ff.light.intensity = 0.3 + Math.sin(this.time * 3 + ff.phase) * 0.3;
    });
    if (this.returnRing) {
      this.returnRing.rotation.z = this.time * 0.8;
      this.returnRing.scale.setScalar(1 + Math.sin(this.time * 2) * 0.05);
    }
  }
}