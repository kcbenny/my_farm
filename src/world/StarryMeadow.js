import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';

const GEO = { sphere12: new THREE.SphereGeometry(1, 12, 8) };

const MAT = {
  grass: new THREE.MeshStandardMaterial({ color: 0x1a2e4a, roughness: 0.85 }),
  moon: new THREE.MeshBasicMaterial({ color: 0xfffde7 }),
  star: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  constellation: new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.65 }),
  constellationDone: new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.8 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.8 }),
  hengeStone: new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.7 }),
  blueFlower: new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.5 }),
};

export class StarryMeadow extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg, 30);
    this.stars = [];
    this.fireflies = [];
    this.shootingStars = [];
    this.constellationStones = []; // {mesh: THREE.Mesh, glow: THREE.Mesh, index: number, activated: boolean}
    this.constellationStep = 0;
    this.constellationOrder = [0, 3, 6, 1, 4, 7, 2, 5]; // Order to activate
    this.constellationsCompleted = 0;
    this.wishesMade = 0;
    this.shootingStarReady = true;
    this.shootingStarCooldown = 0;
    this.fireflyDanceActive = false;
    this.fireflyDanceTimer = 0;
    this.colorPhase = 0;

    this.build();
    this._setupMissions();
  }

  _setupMissions() {
    this._missions = [
      { id: 'gems', text: '收集 14 顆星之碎片 (0/14)' },
      { id: 'constellations', text: '完成 3 個星座連線繪製 (0/3)' },
      { id: 'wishes', text: '在流星劃過時許願 5 次 (0/5)' },
      { id: 'dance', text: '參與螢火蟲之舞（收集品 ×2 時段）' },
      { id: 'henge', text: '找到中央巨石陣的隱藏祭壇' },
    ];
  }
  getMissions() { return this._missions; }
  checkMissionStatus() {
    return {
      gems: this.collected >= 14,
      constellations: this.constellationsCompleted >= 3,
      wishes: this.wishesMade >= 5,
      dance: this._danceParticipated,
      henge: this._hengeFound,
    };
  }

  build() {
    const R = this.mapRadius;

    // Ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.5, 0.5, 48), MAT.grass);
    ground.position.y = -0.25; ground.receiveShadow = true;
    this.group.add(ground);

    // ── Giant moon ──
    const moonGroup = new THREE.Group();
    const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 18), MAT.moon);
    moonGroup.add(moon);
    const moonGlow = new THREE.PointLight(0xfffde7, 2.8, 22, 2);
    moonGlow.position.y = 1; moonGroup.add(moonGlow);
    moonGroup.position.set(8, 10, 0);
    this.group.add(moonGroup);
    this.moonGlow = moonGlow;

    // ── Stone circle (henge) ──
    this.hengeStones = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 4;
      const stone = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.5, 0.3), MAT.hengeStone);
      stone.position.set(Math.sin(a) * r, 1.25, Math.cos(a) * r);
      stone.rotation.y = -a + Math.PI / 2;
      stone.castShadow = true;
      this.group.add(stone);
      this.hengeStones.push(stone);
    }
    // Altar stone (flat)
    const altarStone = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 2), MAT.hengeStone);
    altarStone.position.set(0, 0.15, 0);
    altarStone.receiveShadow = true;
    altarStone.userData = { isAltar: true };
    this.group.add(altarStone);
    this.altarStone = altarStone;

    // ── Constellation stones ──
    const pts = [
      [-6, -8], [0, -10], [6, -8],
      [-4, -2], [4, -2],
      [-7, 4], [0, 2], [7, 4],
      [-3, 8], [3, 8],
      [-5, 12], [5, 12],
    ];
    pts.forEach(([cx, cz], idx) => {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.5, 12), MAT.stone);
      stone.position.set(cx, 0.2, cz); stone.receiveShadow = true;
      this.group.add(stone);
      const glow = new THREE.Mesh(GEO.sphere12, MAT.constellation.clone());
      glow.scale.setScalar(0.2); glow.position.set(cx, 0.6, cz);
      this.group.add(glow);
      this.constellationStones.push({ stone, glow, index: idx, activated: false });
    });

    // ── Background stars ──
    const starGeo = new THREE.SphereGeometry(0.07, 3, 2);
    for (let i = 0; i < 60; i++) {
      const s = new THREE.Mesh(starGeo, MAT.star.clone());
      s.position.set((Math.random() - 0.5) * 55, 4 + Math.random() * 10, (Math.random() - 0.5) * 55);
      this.group.add(s);
      this.stars.push({ mesh: s, twinkle: Math.random() * Math.PI * 2 });
    }

    // ── Fireflies ──
    const ffGeo = new THREE.SphereGeometry(0.06, 3, 2);
    const ffMat = new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 25; i++) {
      const ff = new THREE.Mesh(ffGeo, ffMat.clone());
      ff.position.set((Math.random() - 0.5) * 44, 0.3 + Math.random() * 2.5, (Math.random() - 0.5) * 44);
      this.group.add(ff);
      this.fireflies.push({ mesh: ff, baseX: ff.position.x, baseZ: ff.position.z, baseY: ff.position.y, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.4 });
    }

    // ── Shooting stars ──
    for (let i = 0; i < 4; i++) {
      const trail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.05, 1.5, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0 })
      );
      trail.position.set(8 + i * 3, 7, -8);
      trail.rotation.z = Math.PI / 4;
      this.group.add(trail);
      this.shootingStars.push({
        mesh: trail, phase: i * 2.5, speed: 4 + i * 0.3,
        startX: 10 + i * 2, endX: -10, startY: 8, endY: 3,
        active: false, wishable: false,
      });
    }

    // ── Blue flowers ──
    for (let i = 0; i < 30; i++) {
      const flower = new THREE.Mesh(new THREE.CircleGeometry(0.08, 4), MAT.blueFlower);
      flower.rotation.x = -Math.PI / 2;
      flower.position.set((Math.random() - 0.5) * 45, 0.08, (Math.random() - 0.5) * 45);
      this.group.add(flower);
    }

    // ── Gems ──
    const gems = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 3 + Math.random() * 26;
      gems.push(new THREE.Vector3(Math.sin(a) * r, 0.5 + Math.random() * 0.5, Math.cos(a) * r));
    }
    this.spawnGems(gems, 0.2);

    this.addReturnPortal(this.cfg, new THREE.Vector3(0, 0, 10));

    // ── Colliders ──
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.addObstacleCollider(new THREE.Vector3(Math.sin(a) * 4, 0, Math.cos(a) * 4), 0.5);
    }
    this.addObstacleCollider(new THREE.Vector3(0, 0, 0), 1.2);
    pts.forEach(([cx, cz]) => {
      this.addObstacleCollider(new THREE.Vector3(cx, 0, cz), 0.5);
    });
  }

  checkConstellation(playerPos) {
    if (this.constellationStep >= this.constellationOrder.length) return false;
    const targetIdx = this.constellationOrder[this.constellationStep];
    const target = this.constellationStones[targetIdx];
    if (target.activated) return false;
    const wp = new THREE.Vector3(); target.glow.getWorldPosition(wp);
    if (playerPos.distanceToSquared(wp) < 2.25) {
      target.activated = true;
      target.glow.material = MAT.constellationDone.clone();
      this.constellationStep++;
      this.spawnBurst(wp.clone().sub(this.group.position).add(new THREE.Vector3(0, 0.3, 0)));
      // Complete constellation after every 3 stones
      if (this.constellationStep % 3 === 0 && this.constellationStep > 0) {
        this.constellationsCompleted++;
        // Spawn bonus gems
        const gems = [];
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          gems.push(new THREE.Vector3(Math.sin(a) * 15, 0.6, Math.cos(a) * 15));
        }
        this.spawnGems(gems, 0.24);
      }
      return true;
    }
    return false;
  }

  checkShootingStarWish() {
    for (const ss of this.shootingStars) {
      if (!ss.wishable) continue;
      ss.wishable = false;
      this.wishesMade++;
      this.spawnBurst(ss.mesh.position.clone().sub(this.group.position));
      return true;
    }
    return false;
  }

  checkHengeAltar(playerPos) {
    const wp = new THREE.Vector3(); this.altarStone.getWorldPosition(wp);
    if (playerPos.distanceToSquared(wp) < 4) {
      this._hengeFound = true;
      return true;
    }
    return false;
  }

  update(delta) {
    super.update(delta);

    // Day/night color cycle (5 minute period)
    this.colorPhase = (this.colorPhase + delta * 0.02) % (Math.PI * 2);
    const hue = 0.6 + Math.sin(this.colorPhase) * 0.3; // blue to purple
    const brig = 0.5 + Math.sin(this.colorPhase) * 0.3;
    this.group.children.forEach(c => {
      if (c.material && c.material.color && c.material.color.getHSL) {
        // Only adjust specific materials
      }
    });

    // Stars
    for (const s of this.stars) {
      s.mesh.material.opacity = Math.sin(this.time * 2 + s.twinkle) * 0.3 + 0.7;
    }

    // Fireflies
    for (const ff of this.fireflies) {
      ff.mesh.position.x = ff.baseX + Math.sin(this.time * ff.speed + ff.phase) * 2.5;
      ff.mesh.position.z = ff.baseZ + Math.cos(this.time * ff.speed * 0.7 + ff.phase) * 2;
      ff.mesh.position.y = ff.baseY + Math.sin(this.time * 1.5 + ff.phase) * 0.5;
    }

    // Firefly dance (every 90s, for 30s)
    this.fireflyDanceTimer -= delta;
    if (this.fireflyDanceTimer <= 0 && !this.fireflyDanceActive) {
      this.fireflyDanceActive = true;
      this.fireflyDanceTimer = 30;
      // Move fireflies toward henge
      for (const ff of this.fireflies) {
        ff.baseX = (Math.random() - 0.5) * 6;
        ff.baseZ = (Math.random() - 0.5) * 6;
        ff.baseY = 0.5 + Math.random() * 2;
      }
    }
    if (this.fireflyDanceActive && this.fireflyDanceTimer <= 0) {
      this.fireflyDanceActive = false;
      this.fireflyDanceTimer = 90;
      // Spread fireflies back out
      for (const ff of this.fireflies) {
        ff.baseX = (Math.random() - 0.5) * 44;
        ff.baseZ = (Math.random() - 0.5) * 44;
        ff.baseY = 0.3 + Math.random() * 2.5;
      }
    }
    // Check if player is in dance zone
    if (this.fireflyDanceActive) {
      this._danceParticipated = true;
    }

    // Shooting stars
    this.shootingStarCooldown -= delta;
    if (this.shootingStarCooldown <= 0) {
      this.shootingStarCooldown = 30 + Math.random() * 15;
      // Activate a random shooting star
      const ss = this.shootingStars[Math.floor(Math.random() * this.shootingStars.length)];
      ss.active = true;
      ss.wishable = true;
      ss.progress = 0;
    }
    for (const ss of this.shootingStars) {
      if (!ss.active) continue;
      ss.progress = (ss.progress || 0) + delta / ss.speed;
      if (ss.progress >= 1) {
        ss.active = false;
        ss.wishable = false;
        ss.mesh.material.opacity = 0;
        continue;
      }
      ss.mesh.position.x = ss.startX + (ss.endX - ss.startX) * ss.progress;
      ss.mesh.position.y = ss.startY + (ss.endY - ss.startY) * ss.progress;
      ss.mesh.material.opacity = ss.progress < 0.15 ? ss.progress / 0.15 : 1 - ss.progress;
    }

    if (this.moonGlow) this.moonGlow.intensity = 2.6 + Math.sin(this.time * 0.4) * 0.3;
  }
}