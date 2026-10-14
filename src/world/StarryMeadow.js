import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';

const GEO = { sphere12: new THREE.SphereGeometry(1, 12, 8) };

const MAT = {
  grass: new THREE.MeshStandardMaterial({ color: 0x1a2e4a, roughness: 0.85 }),
  moon: new THREE.MeshBasicMaterial({ color: 0xfffde7 }),
  star: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  constellation: new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.65 }),
  constellationDone: new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.8 }),
  constellationHint: new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.7 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.8 }),
  hengeStone: new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.7 }),
  blueFlower: new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.5 }),
  starFragment: new THREE.MeshStandardMaterial({ color: 0xaaccff, roughness: 0.1, metalness: 0.5, emissive: 0x6688cc, emissiveIntensity: 0.8 }),
};

export class StarryMeadow extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg, 30);
    this.stars = [];
    this.fireflies = [];
    this.shootingStars = [];
    this.constellationStones = []; // {mesh: THREE.Mesh, glow: THREE.Mesh, index: number, activated: boolean, hintRing: THREE.Mesh}
    this.constellationStep = 0;
    // 3 constellations of 4 stones each = 12 stones total, completing 3 constellations
    this.constellationOrder = [0, 3, 6, 9, 1, 4, 7, 10, 2, 5, 8, 11];
    this.constellationsCompleted = 0;
    this.wishesMade = 0;
    this.shootingStarReady = true;
    this.shootingStarCooldown = 0;
    this.fireflyDanceActive = false;
    this.fireflyDanceTimer = 60;
    this.colorPhase = 0;
    this._danceParticipated = false;
    this._hengeFound = false;
    this._hengeAltarActivated = false;

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
  getHints() {
    return [
      '🏃 走近星之碎片即可自動收集',
      '🌠 走到發綠光的星座石按 [E] 開始連線，依次走到下一個',
      '🌠 綠光提示環顯示下一塊要踩的石頭',
      '🌠 完成連線後天空會浮現星座 + 流星雨！',
      '⭐ 流星劃過時快速按 [E] 許願拿獎勵',
      '🪨 探索地圖中央的巨石陣，祭壇中心按 [E] 發現秘密',
      '💫 每 90 秒螢火蟲聚集巨石陣，站在陣中參與收集品 ×2',
      '🔮 找到傳送門按 [E] 即可返回農場',
    ];
  }
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
    const safeR = R - 2;

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

    // ── Constellation stones (12 stones for 3 constellations of 4) ──
    const pts = [
      [-6, -8], [0, -10], [6, -8],     // 0, 1, 2 - bottom row
      [-4, -2], [0, -2], [4, -2],       // 3, 4, 5 - lower middle
      [-7, 4], [0, 2], [7, 4],          // 6, 7, 8 - upper middle
      [-3, 10], [0, 12], [3, 10],       // 9, 10, 11 - top (shaped like 3 constellations)
    ];
    pts.forEach(([cx, cz], idx) => {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.5, 12), MAT.stone);
      stone.position.set(cx, 0.2, cz); stone.receiveShadow = true;
      this.group.add(stone);
      const glow = new THREE.Mesh(GEO.sphere12, MAT.constellation.clone());
      glow.scale.setScalar(0.2); glow.position.set(cx, 0.6, cz);
      this.group.add(glow);

      // Number glyph on top of each stone
      const constellationNum = Math.floor(idx / 4) + 1; // which constellation (1-3)
      const stepInConst = (idx % 4) + 1; // step within constellation (1-4)
      const glyph = this._makeGlyph(constellationNum, stepInConst);
      glyph.position.set(cx, 0.55, cz);
      this.group.add(glyph);

      // Hint ring (green, only visible for the next correct stone)
      const hintRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 24),
        MAT.constellationHint.clone());
      hintRing.rotation.x = -Math.PI / 2;
      hintRing.position.set(cx, 0.26, cz);
      hintRing.visible = false;
      this.group.add(hintRing);

      this.constellationStones.push({ stone, glow, index: idx, activated: false, hintRing, glyph });
    });

    // Show hint ring on first stone
    if (this.constellationStones[0]) {
      this.constellationStones[0].hintRing.visible = true;
    }

    // ── Background stars (clamped to map radius) ──
    const starGeo = new THREE.SphereGeometry(0.07, 3, 2);
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * (safeR - 2);
      const s = new THREE.Mesh(starGeo, MAT.star.clone());
      s.position.set(Math.sin(a) * r, 4 + Math.random() * 10, Math.cos(a) * r);
      this.group.add(s);
      this.stars.push({ mesh: s, twinkle: Math.random() * Math.PI * 2 });
    }

    // ── Fireflies (clamped to map) ──
    const ffGeo = new THREE.SphereGeometry(0.06, 3, 2);
    const ffMat = new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 25; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * (safeR - 4);
      const ff = new THREE.Mesh(ffGeo, ffMat.clone());
      ff.position.set(Math.sin(a) * r, 0.3 + Math.random() * 2.5, Math.cos(a) * r);
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

    // ── Blue flowers (clamped to map) ──
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * (safeR - 2);
      const flower = new THREE.Mesh(new THREE.CircleGeometry(0.08, 4), MAT.blueFlower);
      flower.rotation.x = -Math.PI / 2;
      flower.position.set(Math.sin(a) * r, 0.08, Math.cos(a) * r);
      this.group.add(flower);
    }

    // ── Star Fragment collectibles (replace default gems) ──
    const gemPositions = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 3 + Math.random() * 24;
      gemPositions.push(new THREE.Vector3(Math.sin(a) * r, 0.5 + Math.random() * 0.5, Math.cos(a) * r));
    }
    this._spawnStarFragments(gemPositions);

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

  _makeGlyph(constellationNum, stepNum) {
    const group = new THREE.Group();
    // Constellation number marker (small colored dot on side)
    const colors = [0xff6666, 0x66ff66, 0x6666ff];
    const colorDot = new THREE.Mesh(GEO.sphere12,
      new THREE.MeshBasicMaterial({ color: colors[constellationNum - 1] || 0xffffff }));
    colorDot.scale.setScalar(0.06);
    colorDot.position.set(0, 0, 0.35);
    group.add(colorDot);

    // Step number (tiny ring count indicates step)
    for (let s = 0; s < stepNum; s++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08 + s * 0.04, 0.015, 4, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      group.add(ring);
    }
    return group;
  }

  _spawnStarFragments(positions) {
    this.total += positions.length;
    positions.forEach((pos, i) => {
      const frag = new THREE.Group();
      // 4-pointed star shape using 2 crossed diamonds
      for (let d = 0; d < 2; d++) {
        const diamond = new THREE.Mesh(GEO.sphere12, MAT.starFragment.clone());
        diamond.scale.set(0.08, 0.25, 0.08);
        diamond.rotation.y = d * Math.PI / 4;
        frag.add(diamond);
      }
      // Center glow
      const core = new THREE.Mesh(GEO.sphere12,
        new THREE.MeshBasicMaterial({ color: 0xccddff, transparent: true, opacity: 0.8 }));
      core.scale.setScalar(0.12);
      frag.add(core);
      // Outer aura
      const aura = new THREE.Mesh(GEO.sphere12,
        new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.3 }));
      aura.scale.setScalar(0.25);
      frag.add(aura);

      frag.position.copy(pos);
      frag.userData = {
        collected: false,
        index: this.collectibles.length + i,
        baseY: pos.y,
        isStarFragment: true,
        spinSpeed: 0.8 + Math.random() * 0.6,
      };
      this.group.add(frag);
      this.collectibles.push(frag);
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
      // Hide hint ring on completed stone
      target.hintRing.visible = false;

      this.constellationStep++;
      this.spawnBurst(wp.clone().sub(this.group.position).add(new THREE.Vector3(0, 0.3, 0)));

      // Show hint ring on next stone
      if (this.constellationStep < this.constellationOrder.length) {
        const nextIdx = this.constellationOrder[this.constellationStep];
        this.constellationStones[nextIdx].hintRing.visible = true;
      }

      // Complete constellation after every 4 stones (3 constellations total)
      if (this.constellationStep % 4 === 0 && this.constellationStep > 0) {
        this.constellationsCompleted++;
        // Spawn bonus gems
        const gems = [];
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          gems.push(new THREE.Vector3(Math.sin(a) * 15, 0.6, Math.cos(a) * 15));
        }
        this._spawnStarFragments(gems);
        // Trigger a mini meteor shower
        this._triggerMiniShower();
      }
      return true;
    }
    return false;
  }

  _triggerMiniShower() {
    // Briefly activate 2 shooting stars for visual reward
    let count = 0;
    for (const ss of this.shootingStars) {
      if (!ss.active && count < 2) {
        ss.active = true;
        ss.wishable = true;
        ss.progress = 0;
        count++;
      }
    }
  }

  checkShootingStarWish(playerPos) {
    // Player must be looking up / near the shooting star area
    // Simplified: any wishable star counts when E is pressed
    for (const ss of this.shootingStars) {
      if (!ss.wishable) continue;
      ss.wishable = false;
      this.wishesMade++;
      this.spawnBurst(ss.mesh.position.clone().sub(this.group.position));
      return true;
    }
    return false;
  }

  tryHengeAltar(playerPos) {
    const wp = new THREE.Vector3(); this.altarStone.getWorldPosition(wp);
    if (playerPos.distanceToSquared(wp) < 4) {
      if (!this._hengeAltarActivated) {
        this._hengeAltarActivated = true;
        this._hengeFound = true;
        // Reveal: altar glows and spawns star fragments
        const gems = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          const r = 2.5;
          gems.push(new THREE.Vector3(
            wp.x - this.group.position.x + Math.sin(a) * r,
            0.8,
            wp.z - this.group.position.z + Math.cos(a) * r
          ));
        }
        this._spawnStarFragments(gems);
        this.spawnBurst(wp.clone().sub(this.group.position).add(new THREE.Vector3(0, 1, 0)));
        return true;
      }
    }
    return false;
  }

  update(delta) {
    super.update(delta);

    // Day/night color cycle (5 minute period)
    this.colorPhase = (this.colorPhase + delta * 0.02) % (Math.PI * 2);

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
        const a = Math.random() * Math.PI * 2;
        const r = 2 + Math.random() * 24;
        ff.baseX = Math.sin(a) * r;
        ff.baseZ = Math.cos(a) * r;
        ff.baseY = 0.3 + Math.random() * 2.5;
      }
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

    // Animate star fragments (spin and bob)
    for (const gem of this.collectibles) {
      if (!gem.userData.isStarFragment || gem.userData.collected) continue;
      gem.rotation.y += delta * gem.userData.spinSpeed;
      gem.position.y = gem.userData.baseY + Math.sin(this.time * 1.2 + gem.userData.index * 0.5) * 0.15;
      // Pulse aura
      if (gem.children[2]) {
        gem.children[2].material.opacity = 0.2 + Math.sin(this.time * 2 + gem.userData.index) * 0.15;
      }
    }

    // Pulse hint rings on constellation stones
    for (const cs of this.constellationStones) {
      if (cs.hintRing.visible) {
        cs.hintRing.material.opacity = 0.5 + Math.sin(this.time * 3) * 0.3;
        const s = 1 + Math.sin(this.time * 2) * 0.1;
        cs.hintRing.scale.setScalar(s);
      }
    }
  }

  // Called by MapManager each frame to check dance participation
  checkDanceParticipation(playerPos) {
    if (this.fireflyDanceActive) {
      // Player must be near the henge center (within 6 units) during the dance
      const distToCenter = Math.sqrt(playerPos.x * playerPos.x + playerPos.z * playerPos.z);
      if (distToCenter < 6) {
        if (!this._danceParticipated) {
          this._danceParticipated = true;
          this.spawnBurst(new THREE.Vector3(0, 1, 0));
        }
        return true;
      }
    }
    return false;
  }
}
