import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';

const GEO = {
  cylinder24: new THREE.CylinderGeometry(1, 1, 1, 24),
  sphere12: new THREE.SphereGeometry(1, 12, 8),
  box: new THREE.BoxGeometry(1, 1, 1),
  dodec: new THREE.DodecahedronGeometry(1, 0),
};

const MAT = {
  sand: new THREE.MeshStandardMaterial({ color: 0xc4a46c, roughness: 0.85 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x9e8d78, roughness: 0.78 }),
  pillar: new THREE.MeshStandardMaterial({ color: 0xb5a590, roughness: 0.7 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffc940, roughness: 0.15, metalness: 0.95 }),
  runeOn: new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.9 }),
  runeOff: new THREE.MeshBasicMaterial({ color: 0x554433, transparent: true, opacity: 0.4 }),
  darkStone: new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 }),
  tile: new THREE.MeshStandardMaterial({ color: 0xb5a580, roughness: 0.7 }),
  golem: new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.6 }),
  golemEye: new THREE.MeshBasicMaterial({ color: 0xff4400 }),
  quicksand: new THREE.MeshBasicMaterial({ color: 0xcc8833, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
};

export class AncientRuins extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg, 30);

    this.runePlatforms = [];
    this.runeOrder = [0, 2, 4, 1, 5, 3];
    this.runeStep = 0;
    this.chestOpened = false;
    this.golemActive = false;
    this.golemSealed = false;
    this.golemPos = new THREE.Vector3(0, 0.5, 0);
    this.golemChaseSpeed = 2.5;
    this.quicksandZones = [];
    this.chambers = [];    // hidden chambers
    this.chamberTriggered = [false, false, false, false];
    this.scorpions = [];   // active scorpions from wrong rune step

    this.build();
    this._setupMissions();
  }

  /* ──── Mission definitions ──── */
  _setupMissions() {
    this._missions = [
      { id: 'gems', text: '收集 18 顆黃金聖甲蟲 (0/18)' },
      { id: 'runes', text: '解開符文平台之謎（依序踩踏 6 個）' },
      { id: 'chambers', text: '探索 4 間隱藏密室 (0/4)' },
      { id: 'golem', text: '擊敗石像守護者' },
      { id: 'quicksand', text: '避開所有流沙陷阱' },
    ];
  }
  getMissions() { return this._missions; }
  checkMissionStatus() {
    return {
      gems: this.collected >= 18,
      runes: this.runeStep >= 6,
      chambers: this.chamberTriggered.filter(Boolean).length >= 4,
      golem: this.golemSealed,
      quicksand: !this._hitQuicksand,
    };
  }

  build() {
    const R = this.mapRadius;

    // ── Sand ground ──
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.5, 0.5, 48), MAT.sand);
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    this.group.add(ground);

    // ── Stone tile paths (radial + ring) ──
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      for (let d = 2; d < R - 5; d += 1.8) {
        const tile = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), MAT.tile);
        tile.position.set(Math.sin(a) * d, 0.06, Math.cos(a) * d);
        tile.receiveShadow = true;
        this.group.add(tile);
      }
    }
    // Ring path
    for (let r of [10, 20]) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const tile = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), MAT.tile);
        tile.position.set(Math.sin(a) * r, 0.06, Math.cos(a) * r);
        tile.rotation.y = a;
        this.group.add(tile);
      }
    }

    // ── 12 Standing pillars (double ring) ──
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + 0.2;
      const radius = 20 + (i % 3) * 4;
      const h = 5.5 + (i % 4) * 1.5;
      const pillar = new THREE.Mesh(GEO.cylinder24, MAT.pillar);
      pillar.scale.set(0.5, h, 0.5);
      pillar.position.set(Math.sin(angle) * radius, h / 2, Math.cos(angle) * radius);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.group.add(pillar);
      const rune = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 4, 12), MAT.runeOff.clone());
      rune.position.copy(pillar.position); rune.position.y = h * 0.75;
      rune.rotation.x = Math.PI / 2;
      this.group.add(rune);
    }

    // ── Collapsed colonnades ──
    for (let c = 0; c < 4; c++) {
      const baseA = (c / 4) * Math.PI * 2 + 0.5;
      const r = 14;
      for (let j = 0; j < 5; j++) {
        const a = baseA + (j - 2) * 0.18;
        const tilt = (Math.random() - 0.5) * 0.4;
        const col = new THREE.Mesh(GEO.cylinder24, MAT.stone);
        col.scale.set(0.4, 2.8 + Math.random(), 0.4);
        col.position.set(Math.sin(a) * (r + j * 1.2), 0.9, Math.cos(a) * (r + j * 1.2));
        col.rotation.z = tilt; col.rotation.x = 0.15;
        col.castShadow = true;
        this.group.add(col);
      }
    }

    // ── 6 Rune platforms ──
    this.runePlatforms = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r = 12;
      const plat = new THREE.Group();
      plat.name = `RunePlatform_${i}`;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.2, 16), MAT.darkStone);
      base.position.y = 0.1; plat.add(base);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 4, 12), MAT.runeOff.clone());
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.22; plat.add(ring);
      plat.position.set(Math.sin(angle) * r, 0, Math.cos(angle) * r);
      plat.userData = { index: i, activated: false, ring };
      this.group.add(plat);
      this.runePlatforms.push(plat);
    }

    // ── Central altar ──
    const altar = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.6, 24), MAT.gold);
    altar.position.y = 0.3; altar.castShadow = true;
    this.group.add(altar);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 }));
    orb.position.y = 1.1; orb.name = 'TreasureOrb';
    this.group.add(orb); this.treasureOrb = orb;
    const altarGlow = new THREE.PointLight(0xffaa33, 2.2, 14, 2);
    altarGlow.position.y = 0.9; this.group.add(altarGlow);
    this.altarGlow = altarGlow;

    // ── Golem (asleep until puzzle solved) ──
    this.golemGroup = new THREE.Group();
    const golemBody = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.3, 2.5, 16), MAT.golem);
    golemBody.position.y = 1.25; this.golemGroup.add(golemBody);
    const golemHead = new THREE.Mesh(GEO.sphere12, MAT.golem);
    golemHead.scale.setScalar(1.1); golemHead.position.y = 2.9;
    this.golemGroup.add(golemHead);
    for (let s = -1; s <= 1; s += 2) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), MAT.golemEye);
      eye.position.set(s * 0.35, 3.05, 0.8); this.golemGroup.add(eye);
    }
    const golemArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.8, 8), MAT.golem);
    golemArmL.position.set(-1.2, 2, 0); golemArmL.rotation.z = 0.4; this.golemGroup.add(golemArmL);
    const golemArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.8, 8), MAT.golem);
    golemArmR.position.set(1.2, 2, 0); golemArmR.rotation.z = -0.4; this.golemGroup.add(golemArmR);
    this.golemGroup.position.set(2, 0, 2);
    this.golemGroup.visible = false;
    this.group.add(this.golemGroup);

    // ── Hidden chambers (rubble piles) ──
    const chamberAngles = [0.6, 2.2, 3.9, 5.3];
    this.chamberRubble = [];
    chamberAngles.forEach((a, idx) => {
      const r = 24;
      const px = Math.sin(a) * r, pz = Math.cos(a) * r;
      const rubble = new THREE.Group();
      for (let k = 0; k < 8; k++) {
        const rb = new THREE.Mesh(GEO.dodec, MAT.stone);
        rb.scale.setScalar(0.4 + Math.random() * 0.5);
        rb.position.set((k - 3.5) * 0.5, 0.2 + Math.random() * 0.3, (Math.random() - 0.5) * 1.2);
        rb.rotation.set(Math.random(), Math.random(), 0);
        rubble.add(rb);
      }
      rubble.position.set(px, 0, pz);
      rubble.userData = { chamberIdx: idx, cleared: false };
      this.group.add(rubble);
      this.chamberRubble.push(rubble);
    });

    // ── Quicksand zones ──
    const qsPositions = [
      [8, -6], [-10, 8], [5, 14], [-14, -5], [18, -12], [-8, -18],
    ];
    qsPositions.forEach(([qx, qz]) => {
      const qs = new THREE.Mesh(new THREE.CircleGeometry(1.8, 16), MAT.quicksand);
      qs.rotation.x = -Math.PI / 2;
      qs.position.set(qx, 0.08, qz);
      this.group.add(qs);
      this.quicksandZones.push({ center: new THREE.Vector2(qx, qz), radius: 1.8 });
    });

    // ── Rubble ──
    for (let i = 0; i < 40; i++) {
      const rb = new THREE.Mesh(GEO.dodec, MAT.stone);
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 26;
      rb.position.set(Math.sin(a) * r, 0.06, Math.cos(a) * r);
      rb.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rb.scale.set(1, 0.3 + Math.random() * 0.4, 1);
      this.group.add(rb);
    }

    // ── Sand dust ──
    const dustGeo = new THREE.SphereGeometry(0.04, 3, 2);
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xc4a46c, transparent: true, opacity: 0.5 });
    this.dustParticles = [];
    for (let i = 0; i < 50; i++) {
      const d = new THREE.Mesh(dustGeo, dustMat.clone());
      d.position.set((Math.random() - 0.5) * R * 1.6, Math.random() * 2, (Math.random() - 0.5) * R * 1.6);
      d.userData = { phase: Math.random() * Math.PI * 2, speed: 0.2 + Math.random() * 0.4 };
      this.group.add(d);
      this.dustParticles.push(d);
    }

    // ── Gems scattered ──
    const gemPositions = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + Math.random() * 0.3;
      const r = 3 + Math.random() * 26;
      gemPositions.push(new THREE.Vector3(Math.sin(a) * r, 0.6, Math.cos(a) * r));
    }
    this.spawnGems(gemPositions, 0.22);

    // ── Return portal ──
    this.addReturnPortal(this.cfg, new THREE.Vector3(-10, 0, -8));

    // ── Register obstacle colliders ──
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + 0.2;
      const radius = 20 + (i % 3) * 4;
      this.addObstacleCollider(new THREE.Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius), 0.6);
    }
    for (let c = 0; c < 4; c++) {
      const baseA = (c / 4) * Math.PI * 2 + 0.5; const r = 14;
      for (let j = 0; j < 5; j++) {
        const a = baseA + (j - 2) * 0.18;
        this.addObstacleCollider(new THREE.Vector3(Math.sin(a) * (r + j * 1.2), 0, Math.cos(a) * (r + j * 1.2)), 0.6);
      }
    }
    this.addObstacleCollider(new THREE.Vector3(0, 0, 0), 2.2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.addObstacleCollider(new THREE.Vector3(Math.sin(a) * 12, 0, Math.cos(a) * 12), 0.85);
    }
    this.addObstacleCollider(new THREE.Vector3(2, 0, 2), 1.5); // golem spot
  }

  /* ──── Interact with rubble to clear chamber ──── */
  tryClearChamber(playerPos) {
    for (const rb of this.chamberRubble) {
      if (rb.userData.cleared) continue;
      const wp = new THREE.Vector3();
      rb.getWorldPosition(wp);
      if (playerPos.distanceToSquared(wp) < 6.25) { // 2.5 units
        rb.userData.cleared = true;
        rb.visible = false;
        const idx = rb.userData.chamberIdx;
        this.chamberTriggered[idx] = true;
        // Spawn chamber gems
        const cPositions = [];
        for (let i = 0; i < 4; i++) {
          cPositions.push(new THREE.Vector3(wp.x + (Math.random() - 0.5) * 2, 0.5, wp.z + (Math.random() - 0.5) * 2));
        }
        this.spawnGems(cPositions, 0.26);
        this.spawnBurst(new THREE.Vector3(wp.x, 0.5, wp.z));
        return true;
      }
    }
    return false;
  }

  /* ──── Rune puzzle ──── */
  checkRunePuzzle(playerPos) {
    if (this.chestOpened) return false;
    for (const plat of this.runePlatforms) {
      const dist = playerPos.distanceToSquared(plat.position);
      if (dist < 1.44) {
        const idx = plat.userData.index;
        if (!plat.userData.activated) {
          if (this.runeOrder[this.runeStep] === idx) {
            plat.userData.activated = true;
            plat.userData.ring.material = MAT.runeOn.clone();
            this.runeStep++;
            this.spawnBurst(plat.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
            if (this.runeStep >= 6) { this.openChest(); }
          } else {
            // Wrong step → spawn scorpion
            this._spawnScorpion(playerPos.clone());
          }
          return true;
        }
      }
    }
    return false;
  }

  _spawnScorpion(fromPos) {
    const scorp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.5 }));
    scorp.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xcc3322, roughness: 0.4 }));
    tail.position.set(0, 0.3, 0); scorp.add(tail);
    scorp.position.copy(fromPos); scorp.position.y = 0.3;
    this.group.add(scorp);
    this.scorpions.push({
      mesh: scorp, life: 5.0, age: 0,
      dir: new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2).normalize(),
    });
  }

  checkScorpionHit(playerPos2D) {
    for (const sc of this.scorpions) {
      if (sc.age >= sc.life) continue;
      const p2 = new THREE.Vector2(sc.mesh.position.x, sc.mesh.position.z);
      if (playerPos2D.distanceTo(p2) < 1.0) {
        sc.age = sc.life; // despawn on hit
        return true; // player got stung
      }
    }
    return false;
  }

  checkQuicksand(playerPos) {
    for (const qs of this.quicksandZones) {
      if (new THREE.Vector2(playerPos.x, playerPos.z).distanceTo(qs.center) < qs.radius) {
        this._hitQuicksand = true;
        return true;
      }
    }
    return false;
  }

  getQuicksandSlowdown(playerPos) {
    for (const qs of this.quicksandZones) {
      if (new THREE.Vector2(playerPos.x, playerPos.z).distanceTo(qs.center) < qs.radius) {
        return 0.5; // 50% slow
      }
    }
    return 1.0;
  }

  openChest() {
    this.chestOpened = true;
    if (this.treasureOrb) {
      this.treasureOrb.material.color.set(0xffffff);
      this.treasureOrb.scale.set(2, 2, 2);
    }
    if (this.altarGlow) { this.altarGlow.intensity = 5; this.altarGlow.color.set(0xffffff); }
    // Activate golem
    this.golemGroup.visible = true;
    this.golemActive = true;
    this.golemPos.set(2, 0.5, 2);
    // Bonus gems
    const bonusPositions = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      bonusPositions.push(new THREE.Vector3(Math.sin(a) * 2.5, 0.7, Math.cos(a) * 2.5));
    }
    this.spawnGems(bonusPositions, 0.28);
  }

  /* ──── Golem chase + seal mechanic ──── */
  updateGolem(delta, playerPos) {
    if (!this.golemActive || this.golemSealed) return;
    // Chase player slowly
    const toPlayer = new THREE.Vector3(playerPos.x, this.golemPos.y, playerPos.z).sub(this.golemPos);
    if (toPlayer.length() > 0.5) {
      toPlayer.normalize();
      this.golemPos.addScaledVector(toPlayer, this.golemChaseSpeed * delta);
    }
    this.golemGroup.position.copy(this.golemPos);
    // Bob
    this.golemGroup.position.y = this.golemPos.y + Math.sin(this.time * 3) * 0.1;
    // Check if near a pillar for sealing
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + 0.2;
      const radius = 20 + (i % 3) * 4;
      const pillarPos = new THREE.Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
      if (this.golemPos.distanceTo(pillarPos) < 2.5) {
        this.golemSealed = true;
        this.golemActive = false;
        this.golemGroup.visible = false;
        // Big reward
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * Math.PI * 2;
          const gp = pillarPos.clone().add(new THREE.Vector3(Math.sin(a) * 2, 0.7, Math.cos(a) * 2));
          this.spawnGems([gp], 0.32);
        }
        this.spawnBurst(pillarPos.clone().add(new THREE.Vector3(0, 1.5, 0)));
        return;
      }
    }
    // Golem catches player → knockback
    if (this.golemPos.distanceTo(new THREE.Vector3(playerPos.x, this.golemPos.y, playerPos.z)) < 1.8) {
      return { knockback: toPlayer.clone().multiplyScalar(-6) };
    }
    return null;
  }

  update(delta) {
    super.update(delta);

    if (this.treasureOrb) {
      const pulse = 1 + Math.sin(this.time * 2.5) * 0.08;
      this.treasureOrb.scale.setScalar(this.chestOpened ? 1.8 + Math.sin(this.time * 4) * 0.1 : pulse);
      this.treasureOrb.rotation.y += delta * 1.5;
    }
    if (this.altarGlow && !this.chestOpened) {
      this.altarGlow.intensity = 2.0 + Math.sin(this.time * 2) * 0.25;
    }

    for (const d of this.dustParticles) {
      d.position.y += delta * d.userData.speed * 0.3;
      d.position.x += Math.sin(this.time + d.userData.phase) * delta * 0.25;
      if (d.position.y > 3) d.position.y = 0;
      d.material.opacity = 0.25 + 0.25 * Math.sin(this.time * 3 + d.userData.phase);
    }

    // Scorpions
    for (let i = this.scorpions.length - 1; i >= 0; i--) {
      const sc = this.scorpions[i];
      sc.age += delta;
      if (sc.age >= sc.life) { sc.mesh.removeFromParent(); this.scorpions.splice(i, 1); continue; }
      sc.mesh.position.addScaledVector(sc.dir, 3 * delta);
      sc.mesh.position.y = 0.3 + Math.sin(this.time * 8 + i) * 0.15;
      if (sc.mesh.material) sc.mesh.material.opacity = sc.age > 4 ? (5 - sc.age) : 1.0;
    }
  }
}