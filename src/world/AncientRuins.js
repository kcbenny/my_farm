import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';

/* ── Shared geometries (reused per map to save GC churn) ── */
const GEO = {
  cylinder24: new THREE.CylinderGeometry(1, 1, 1, 24),
  sphere12: new THREE.SphereGeometry(1, 12, 8),
  box: new THREE.BoxGeometry(1, 1, 1),
};

/* ── Materials ── */
const MAT = {
  sand: new THREE.MeshStandardMaterial({ color: 0xc4a46c, roughness: 0.85 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x9e8d78, roughness: 0.78 }),
  pillar: new THREE.MeshStandardMaterial({ color: 0xb5a590, roughness: 0.7 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffc940, roughness: 0.15, metalness: 0.95 }),
  runeOn: new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.9 }),
  runeOff: new THREE.MeshBasicMaterial({ color: 0x554433, transparent: true, opacity: 0.4 }),
  darkStone: new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 }),
};

export class AncientRuins extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg);

    this.runePlatforms = [];
    this.runeOrder = [0, 2, 4, 1, 5, 3]; // puzzle sequence
    this.runeStep = 0; // how far the player has progressed
    this.chestOpened = false;

    this.build();
  }

  build() {
    // ── Sand ground ──
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(15, 15.5, 0.5, 32),
      MAT.sand
    );
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    this.group.add(ground);

    // ── 8 Standing pillars (ring) ──
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.3;
      const radius = 12 + (i % 2) * 2;
      const h = 4.5 + (i % 3) * 1.2;

      const pillar = new THREE.Mesh(GEO.cylinder24, MAT.pillar);
      pillar.scale.set(0.42, h, 0.42);
      pillar.position.set(Math.sin(angle) * radius, h / 2, Math.cos(angle) * radius);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.group.add(pillar);

      // Emissive rune band on each pillar (no PointLight!)
      const rune = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.08, 4, 12),
        MAT.runeOff.clone()
      );
      rune.position.copy(pillar.position);
      rune.position.y = h * 0.75;
      rune.rotation.x = Math.PI / 2;
      this.group.add(rune);
    }

    // ── Fallen pillars ──
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.5;
      const r = 9 + i * 0.8;
      const fall = new THREE.Mesh(GEO.cylinder24, MAT.stone);
      fall.scale.set(0.45, 3.2, 0.45);
      fall.position.set(Math.sin(angle) * r, 0.7, Math.cos(angle) * r);
      fall.rotation.z = 0.6 + i * 0.15;
      fall.rotation.x = 0.1;
      fall.castShadow = true;
      this.group.add(fall);
    }

    // ── 6 Rune platforms (puzzle) ──
    this.runePlatforms = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r = 7;
      const plat = new THREE.Group();
      plat.name = `RunePlatform_${i}`;

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.75, 0.2, 16),
        MAT.darkStone
      );
      base.position.y = 0.1;
      plat.add(base);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.4, 0.06, 4, 12),
        MAT.runeOff.clone()
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.22;
      plat.add(ring);

      plat.position.set(Math.sin(angle) * r, 0, Math.cos(angle) * r);
      plat.userData = { index: i, activated: false, ring };
      this.group.add(plat);
      this.runePlatforms.push(plat);
    }

    // ── Central altar (treasure) ──
    const altar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.7, 0.6, 24),
      MAT.gold
    );
    altar.position.y = 0.3;
    altar.castShadow = true;
    this.group.add(altar);

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 })
    );
    orb.position.y = 1.0;
    orb.name = 'TreasureOrb';
    this.group.add(orb);
    this.treasureOrb = orb;

    // ambient glow — the ONLY PointLight in this map (besides return portal)
    const altarGlow = new THREE.PointLight(0xffaa33, 2.2, 10, 2);
    altarGlow.position.y = 0.9;
    this.group.add(altarGlow);
    this.altarGlow = altarGlow;

    // ── Rubble ──
    for (let i = 0; i < 25; i++) {
      const rb = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.3, 0),
        MAT.stone
      );
      rb.position.set(
        (Math.random() - 0.5) * 22,
        0.06,
        (Math.random() - 0.5) * 22
      );
      rb.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rb.scale.set(1, 0.3 + Math.random() * 0.4, 1);
      this.group.add(rb);
    }

    // ── Sand particles ──
    const dustGeo = new THREE.SphereGeometry(0.04, 3, 2);
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xc4a46c, transparent: true, opacity: 0.5 });
    this.dustParticles = [];
    for (let i = 0; i < 35; i++) {
      const d = new THREE.Mesh(dustGeo, dustMat.clone());
      d.position.set((Math.random() - 0.5) * 24, Math.random() * 2, (Math.random() - 0.5) * 24);
      d.userData = { phase: Math.random() * Math.PI * 2, speed: 0.2 + Math.random() * 0.4 };
      this.group.add(d);
      this.dustParticles.push(d);
    }

    // ── Collectible gems (golden scarabs) ──
    const gemPositions = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const r = 3.5 + Math.random() * 8;
      gemPositions.push(new THREE.Vector3(Math.sin(angle) * r, 0.6, Math.cos(angle) * r));
    }
    this.spawnGems(gemPositions, 0.22);

    // ── Return portal ──
    this.addReturnPortal(cfg, new THREE.Vector3(-7, 0, -5));
  }

  /* ──── Puzzle: step on rune platforms in correct order ──── */
  checkRunePuzzle(playerPos) {
    if (this.chestOpened) return false;
    for (const plat of this.runePlatforms) {
      const dist = playerPos.distanceToSquared(plat.position);
      if (dist < 1.44) {
        // 1.2 units
        const idx = plat.userData.index;
        if (this.runeOrder[this.runeStep] === idx && !plat.userData.activated) {
          plat.userData.activated = true;
          plat.userData.ring.material = MAT.runeOn.clone();
          this.runeStep++;
          this.spawnBurst(plat.position.clone().add(new THREE.Vector3(0, 0.5, 0)));

          if (this.runeStep >= 6) {
            this.openChest();
          }
          return true;
        }
      }
    }
    return false;
  }

  openChest() {
    this.chestOpened = true;
    // Visual reward: brighten orb, pulse altar
    if (this.treasureOrb) {
      this.treasureOrb.material.color.set(0xffffff);
      this.treasureOrb.scale.set(1.8, 1.8, 1.8);
    }
    if (this.altarGlow) {
      this.altarGlow.intensity = 5;
      this.altarGlow.color.set(0xffffff);
    }
    // Spawn bonus gems around altar
    const bonusPositions = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      bonusPositions.push(new THREE.Vector3(Math.sin(a) * 2.2, 0.7, Math.cos(a) * 2.2));
    }
    this.spawnGems(bonusPositions, 0.28);
    this.total += 6;
  }

  /* ──── Frame update ──── */
  update(delta) {
    super.update(delta); // gems, burst, portal

    // Pulse treasure orb
    if (this.treasureOrb) {
      const pulse = 1 + Math.sin(this.time * 2.5) * 0.08;
      this.treasureOrb.scale.setScalar(
        this.chestOpened ? 1.8 + Math.sin(this.time * 4) * 0.1 : pulse
      );
      this.treasureOrb.rotation.y += delta * 1.5;
    }

    // Altar glow (subtle, not a performance issue — only 1 PointLight)
    if (this.altarGlow && !this.chestOpened) {
      this.altarGlow.intensity = 2.0 + Math.sin(this.time * 2) * 0.25;
    }

    // Sand dust
    for (const d of this.dustParticles) {
      d.position.y += delta * d.userData.speed * 0.3;
      d.position.x += Math.sin(this.time + d.userData.phase) * delta * 0.15;
      if (d.position.y > 2.5) d.position.y = 0;
      d.material.opacity = 0.25 + 0.25 * Math.sin(this.time * 3 + d.userData.phase);
    }
  }
}