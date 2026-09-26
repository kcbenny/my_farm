import * as THREE from 'three';
import { ADVENTURE_MAPS } from './PortalSystem.js';

const m = {
  snow: new THREE.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 0.7, flatShading: true }),
  ice: new THREE.MeshStandardMaterial({ color: 0xccddff, roughness: 0.15, metalness: 0.3, flatShading: true }),
  rock: new THREE.MeshStandardMaterial({ color: 0x889099, roughness: 0.9, flatShading: true }),
  snowflake: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }),
};

export class SnowyMountain {
  constructor(scene, getTerrainHeight) {
    this.scene = scene;
    this.time = 0;
    this.particles = [];

    const cfg = ADVENTURE_MAPS.snowyMountain;
    const o = cfg.mapOffset.clone();

    this.group = new THREE.Group();
    this.group.name = 'SnowyMountain';
    this.group.position.copy(o);
    scene.add(this.group);

    // Base snow ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(15, 15.5, 0.5, 32), m.snow);
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Mountain peak (central)
    const peak = new THREE.Mesh(new THREE.ConeGeometry(6, 8, 12), m.snow);
    peak.position.y = 4;
    peak.castShadow = true;
    peak.receiveShadow = true;
    this.group.add(peak);

    // Ice ring around the peak
    const iceRing = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.4, 8, 24), m.ice);
    iceRing.rotation.x = Math.PI / 2;
    iceRing.position.y = 1.8;
    this.group.add(iceRing);
    this.iceRing = iceRing;

    // Ice crystal spires
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const radius = 7.5 + (i % 3) * 1.2;
      for (let j = 0; j < 3; j++) {
        const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.15 + j * 0.08, 4 + j * 1.5, 4), m.ice);
        crystal.position.set(
          Math.sin(angle) * radius + (j - 1) * 0.6,
          2 + j * 0.6,
          Math.cos(angle) * radius
        );
        crystal.rotation.z = 0.1 * j;
        crystal.castShadow = true;
        this.group.add(crystal);
      }
    }

    // Snowman
    const snowman = new THREE.Group();
    for (const [y, r] of [[0.35, 0.5], [0.9, 0.38], [1.35, 0.25]]) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m.snow);
      ball.position.y = y;
      snowman.add(ball);
    }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), new THREE.MeshStandardMaterial({ color: 0xff8844, roughness: 0.5 }));
    nose.position.set(0, 1.35, 0.22);
    nose.rotation.x = -Math.PI / 2;
    snowman.add(nose);
    snowman.position.set(4, 0, 5);
    this.group.add(snowman);

    // Smaller snow mounds
    for (let i = 0; i < 12; i++) {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.4 + Math.random() * 0.6, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), m.snow);
      mound.position.set((Math.random() - 0.5) * 22, 0.15, (Math.random() - 0.5) * 22);
      mound.scale.set(1 + Math.random() * 0.4, 0.6 + Math.random() * 0.3, 1 + Math.random() * 0.4);
      this.group.add(mound);
    }

    // Falling snow particles
    for (let i = 0; i < 60; i++) {
      const flake = new THREE.Mesh(new THREE.SphereGeometry(0.06, 3, 2), m.snowflake);
      flake.position.set((Math.random() - 0.5) * 28, Math.random() * 12, (Math.random() - 0.5) * 28);
      this.group.add(flake);
      this.particles.push({
        mesh: flake,
        baseX: flake.position.x,
        baseZ: flake.position.z,
        speed: 0.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        maxY: 8 + Math.random() * 4,
        minY: -0.5,
      });
    }

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
    this.returnPortal.name = 'ReturnPortal_Snow';
    this.returnPortal.position.set(-5, 0, 7);
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
    // Rotate ice ring
    if (this.iceRing) this.iceRing.rotation.z += delta * 0.3;
    // Falling snow
    this.particles.forEach(p => {
      p.mesh.position.y -= delta * p.speed;
      if (p.mesh.position.y < p.minY) {
        p.mesh.position.y = p.maxY;
        p.mesh.position.x = p.baseX + (Math.random() - 0.5) * 3;
        p.mesh.position.z = p.baseZ + (Math.random() - 0.5) * 3;
      }
      p.mesh.rotation.x += delta * 0.5;
      p.mesh.rotation.y += delta * 0.3;
    });
    if (this.returnRing) {
      this.returnRing.rotation.z = this.time * 0.8;
      this.returnRing.scale.setScalar(1 + Math.sin(this.time * 2) * 0.05);
    }
  }
}