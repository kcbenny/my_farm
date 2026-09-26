import * as THREE from 'three';
import { ADVENTURE_MAPS } from './PortalSystem.js';

const m = {
  sand: new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.9, flatShading: true }),
  stone: new THREE.MeshStandardMaterial({ color: 0x8a7e72, roughness: 0.88, flatShading: true }),
  pillar: new THREE.MeshStandardMaterial({ color: 0xa89880, roughness: 0.85, flatShading: true }),
  rune: new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.7 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 0.9 }),
};

export class AncientRuins {
  constructor(scene, getTerrainHeight) {
    this.scene = scene;
    this.time = 0;
    this.runePlatforms = [];

    const cfg = ADVENTURE_MAPS.ancientRuins;
    const o = cfg.mapOffset.clone();

    this.group = new THREE.Group();
    this.group.name = 'AncientRuins';
    this.group.position.copy(o);
    scene.add(this.group);

    // Sand ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(15, 15.5, 0.5, 32), m.sand);
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Fallen pillars (collapsed columns)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const radius = 9 + (i % 3) * 1.5;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 3.5, 8), m.pillar);
      pillar.position.set(Math.sin(angle) * radius, 0.8, Math.cos(angle) * radius);
      pillar.rotation.z = (Math.random() - 0.5) * 0.3;
      pillar.rotation.x = (Math.random() - 0.5) * 0.15;
      pillar.castShadow = true;
      this.group.add(pillar);
    }

    // Standing pillars
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.3;
      const radius = 12 + (i % 2) * 1.8;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 5 + (i % 3) * 1.5, 6), m.stone);
      pillar.position.set(Math.sin(angle) * radius, 2.5, Math.cos(angle) * radius);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.group.add(pillar);

      // Broken top piece
      if (i % 2 === 1) {
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.7), m.pillar);
        top.position.copy(pillar.position).add(new THREE.Vector3(0.4, 2.8 + (i % 3) * 0.75, -0.2));
        top.rotation.set(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.3);
        this.group.add(top);
      }
    }

    // Rune platforms (puzzle elements)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const radius = 6.5;
      const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.25, 8), m.stone);
      platform.position.set(Math.sin(angle) * radius, 0.25, Math.cos(angle) * radius);
      platform.receiveShadow = true;
      this.group.add(platform);

      const rune = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.45, 6), m.rune);
      rune.rotation.x = -Math.PI / 2;
      rune.position.set(Math.sin(angle) * radius, 0.38, Math.cos(angle) * radius);
      this.group.add(rune);

      this.runePlatforms.push({ platform, rune, phase: i * 0.6 });
    }

    // Central treasure chest
    const chestBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.0), m.gold);
    chestBase.position.y = 0.55;
    chestBase.castShadow = true;
    this.group.add(chestBase);
    const chestLid = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.0), m.gold);
    chestLid.position.set(0, 1.0, 0.15);
    chestLid.rotation.x = -0.3;
    chestLid.castShadow = true;
    this.group.add(chestLid);
    const chestGlow = new THREE.PointLight(0xffd700, 1.5, 5, 2);
    chestGlow.position.y = 0.8;
    this.group.add(chestGlow);
    this.chestGlow = chestGlow;

    // Small rubble stones
    for (let i = 0; i < 20; i++) {
      const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.35, 0), m.stone);
      rubble.position.set((Math.random() - 0.5) * 24, 0.1, (Math.random() - 0.5) * 24);
      rubble.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rubble.scale.set(1, 0.4 + Math.random() * 0.3, 1);
      this.group.add(rubble);
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
    this.returnPortal.name = 'ReturnPortal_Ruins';
    this.returnPortal.position.set(-7, 0, -5);
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
    // Pulse runes
    this.runePlatforms.forEach((rp, i) => {
      const glow = 0.5 + Math.sin(this.time * 1.5 + rp.phase) * 0.5;
      rp.rune.material.opacity = 0.3 + glow * 0.5;
      rp.rune.scale.setScalar(1 + glow * 0.15);
    });
    // Pulse chest
    if (this.chestGlow) {
      this.chestGlow.intensity = 1.2 + Math.sin(this.time * 2) * 0.35;
    }
    if (this.returnRing) {
      this.returnRing.rotation.z = this.time * 0.8;
      this.returnRing.scale.setScalar(1 + Math.sin(this.time * 2) * 0.05);
    }
  }
}