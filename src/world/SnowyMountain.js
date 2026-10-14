import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';

const GEO = { sphere12: new THREE.SphereGeometry(1, 12, 8), cone12: new THREE.ConeGeometry(1, 1, 12) };

const MAT = {
  snow: new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.65 }),
  ice: new THREE.MeshStandardMaterial({ color: 0xbbe4ff, roughness: 0.1, metalness: 0.25 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.85 }),
  flake: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }),
  carrot: new THREE.MeshStandardMaterial({ color: 0xff8844, roughness: 0.5 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.8 }),
  cabinRoof: new THREE.MeshStandardMaterial({ color: 0x884433, roughness: 0.7 }),
  iceSheet: new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
  iceSecretSheet: new THREE.MeshBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
  aurora: new THREE.MeshBasicMaterial({ color: 0x88ff88, transparent: true, opacity: 0.08, side: THREE.DoubleSide }),
  pineNeedle: new THREE.MeshStandardMaterial({ color: 0x1a5533, roughness: 0.7 }),
  iceCrystal: new THREE.MeshStandardMaterial({ color: 0xaaddff, roughness: 0.05, metalness: 0.4, emissive: 0x4488aa, emissiveIntensity: 0.6 }),
};

export class SnowyMountain extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg, 30);
    this.snowflakes = [];
    this.iceSheets = [];
    this.snowmanBases = [];
    this.snowmanParts = [];
    this.snowmenBuilt = 0;
    this.avalancheActive = false;
    this.avalancheTimer = 0;
    this.avalancheBalls = [];
    this.climbedToTop = false;
    this._avalancheHit = false;
    this._avalancheSurvived = false;
    this._avalancheCount = 0;
    this._iceSecretFound = false;
    this.secretIceSheet = null;

    this.build();
    this._setupMissions();
  }

  _setupMissions() {
    this._missions = [
      { id: 'gems', text: '收集 14 顆冰晶寶石 (0/14)' },
      { id: 'climb', text: '沿螺旋步道登頂山峰' },
      { id: 'snowmen', text: '完成 3 個雪人 (0/3)' },
      { id: 'avalanche', text: '在雪崩中存活（不被雪球擊中）' },
      { id: 'icesecret', text: '發現冰面滑行的秘密區域' },
    ];
  }
  getMissions() { return this._missions; }
  getHints() {
    return [
      '🏃 走近冰晶即可自動收集',
      '🏔️ 沿螺旋步道繞山而上登頂',
      '⛸️ 冰面上移動會滑行，找最大的冰面發現秘密',
      '⛄ 收集散落的雪球＋紅蘿蔔，靠近雪人底座按 [E] 組裝',
      '❄️ 雪崩警報響起時躲到冰晶柱後方避難',
      '🔮 找到傳送門按 [E] 即可返回農場',
    ];
  }
  checkMissionStatus() {
    return {
      gems: this.collected >= 14,
      climb: this.climbedToTop,
      snowmen: this.snowmenBuilt >= 3,
      avalanche: this._avalancheSurvived,
      icesecret: this._iceSecretFound,
    };
  }

  build() {
    const R = this.mapRadius;

    // Ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.5, 0.5, 48), MAT.snow);
    ground.position.y = -0.25; ground.receiveShadow = true;
    this.group.add(ground);

    // ── Central mountain (bigger: radius 10, height 12) ──
    const peak = new THREE.Mesh(new THREE.ConeGeometry(10, 12, 24), MAT.snow);
    peak.position.y = 6; peak.castShadow = true; peak.receiveShadow = true;
    this.group.add(peak);

    // ── Spiral path markers ──
    for (let i = 0; i < 24; i++) {
      const t = i / 24;
      const a = t * Math.PI * 4; // 2 full rotations
      const r = 10.5 - t * 10;
      const y = t * 11.5 + 0.3;
      const step = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.1, 8), MAT.ice);
      step.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      this.group.add(step);
    }

    // ── Ice ring ──
    const iceRing = new THREE.Mesh(new THREE.TorusGeometry(11, 0.4, 8, 48), MAT.ice);
    iceRing.rotation.x = Math.PI / 2; iceRing.position.y = 2.2;
    this.group.add(iceRing); this.iceRing = iceRing;

    // ── Ice sheets (slippery) - 7 small + 1 large "secret" sheet ──
    const smallIcePositions = [
      [16, 3], [18, -5], [-15, 6], [-17, -4], [5, 20], [-6, -18], [20, 12]
    ];
    smallIcePositions.forEach(([x, z]) => {
      const sheet = new THREE.Mesh(new THREE.CircleGeometry(1.8, 16), MAT.iceSheet);
      sheet.rotation.x = -Math.PI / 2;
      sheet.position.set(x, 0.07, z);
      sheet.userData = { center: new THREE.Vector2(x, z), radius: 1.8, isSecret: false };
      this.group.add(sheet);
      this.iceSheets.push(sheet);
    });
    // Large "secret" ice sheet - hidden in a corner, bigger and brighter
    const secretSheet = new THREE.Mesh(new THREE.CircleGeometry(3.5, 24), MAT.iceSecretSheet);
    secretSheet.rotation.x = -Math.PI / 2;
    secretSheet.position.set(-22, 0.06, -20);
    secretSheet.userData = { center: new THREE.Vector2(-22, -20), radius: 3.5, isSecret: true };
    this.group.add(secretSheet);
    this.iceSheets.push(secretSheet);
    this.secretIceSheet = secretSheet;
    // Add a small ice crystal spire cluster near the secret sheet as a visual hint
    for (let j = 0; j < 5; j++) {
      const crystal = new THREE.Mesh(GEO.cone12, MAT.ice);
      crystal.scale.set(0.15 + j * 0.05, 2 + j * 0.8, 0.15 + j * 0.05);
      crystal.position.set(-22 + (j - 2) * 0.5, 1 + j * 0.4, -22);
      crystal.rotation.z = 0.1 * j;
      crystal.castShadow = true;
      this.group.add(crystal);
    }

    // ── Ice crystal spires ──
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 12 + (i % 4) * 3;
      for (let j = 0; j < 3; j++) {
        const crystal = new THREE.Mesh(GEO.cone12, MAT.ice);
        crystal.scale.set(0.18 + j * 0.08, 4 + j * 1.5, 0.18 + j * 0.08);
        crystal.position.set(Math.sin(a) * r + (j - 1) * 0.6, 2 + j * 0.7, Math.cos(a) * r);
        crystal.rotation.z = 0.1 * j; crystal.castShadow = true;
        this.group.add(crystal);
      }
    }

    // ── Snowman bases (3) ──
    const snowmanPositions = [[7, 5], [-8, -4], [3, -10]];
    snowmanPositions.forEach(([sx, sz], idx) => {
      const base = new THREE.Group();
      const bottom = new THREE.Mesh(GEO.sphere12, MAT.snow);
      bottom.scale.setScalar(0.5); bottom.position.y = 0.35; base.add(bottom);
      base.position.set(sx, 0, sz);
      base.userData = { idx, parts: ['bottom'], needsParts: ['middle', 'top', 'nose'] };
      this.group.add(base);
      this.snowmanBases.push(base);
    });

    // ── Snowman parts scattered (9 parts: 3 middle + 3 top + 3 nose) ──
    const partTypes = ['middle', 'middle', 'middle', 'top', 'top', 'top', 'nose', 'nose', 'nose'];
    const partPositions = [
      [12, 8], [-12, 6], [10, -8],
      [-10, -10], [15, -3], [-15, 2],
      [5, 12], [-6, 12], [0, -15],
    ];
    partTypes.forEach((type, i) => {
      let part;
      if (type === 'nose') {
        part = new THREE.Mesh(GEO.cone12, MAT.carrot);
        part.scale.set(0.08, 0.35, 0.08);
        part.rotation.x = -Math.PI / 2;
      } else {
        part = new THREE.Mesh(GEO.sphere12, MAT.snow);
        part.scale.setScalar(type === 'middle' ? 0.38 : 0.28);
      }
      part.position.set(partPositions[i][0], type === 'nose' ? 0.2 : 0.15, partPositions[i][1]);
      part.userData = { partType: type, collected: false };
      this.group.add(part);
      this.snowmanParts.push(part);
    });

    // ── Pine trees ──
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 24;
      const pine = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 2, 8), MAT.wood);
      trunk.position.y = 1; pine.add(trunk);
      for (let l = 0; l < 3; l++) {
        const cone = new THREE.Mesh(GEO.cone12, MAT.pineNeedle);
        cone.scale.set(1.5 - l * 0.3, 2, 1.5 - l * 0.3);
        cone.position.y = 1.5 + l * 1.5; pine.add(cone);
      }
      pine.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      this.group.add(pine);
    }

    // ── Cabins ──
    for (let c = 0; c < 2; c++) {
      const cabin = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2, 3), MAT.wood);
      body.position.y = 1; cabin.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2, 1.2, 4), MAT.cabinRoof);
      roof.position.y = 2.4; roof.rotation.y = Math.PI / 4; cabin.add(roof);
      cabin.position.set(c === 0 ? 20 : -18, 0, c === 0 ? 10 : -15);
      this.group.add(cabin);
    }

    // ── Snow mounds ──
    for (let i = 0; i < 20; i++) {
      const mound = new THREE.Mesh(GEO.sphere12, MAT.snow);
      mound.scale.set(0.5 + Math.random() * 1.2, 0.3 + Math.random() * 0.4, 0.5 + Math.random() * 1.2);
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 24;
      mound.position.set(Math.sin(a) * r, 0.1, Math.cos(a) * r);
      this.group.add(mound);
    }

    // ── Aurora band ──
    const aurora = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.5, 4), MAT.aurora);
    aurora.position.y = 14;
    aurora.rotation.x = -0.3;
    this.group.add(aurora);
    this.aurora = aurora;

    // ── Snowflakes ──
    const flakeGeo = new THREE.SphereGeometry(0.06, 3, 2);
    for (let i = 0; i < 45; i++) {
      const f = new THREE.Mesh(flakeGeo, MAT.flake.clone());
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * (R - 2);
      f.position.set(Math.sin(a) * r, Math.random() * 16, Math.cos(a) * r);
      this.group.add(f);
      this.snowflakes.push({ mesh: f, baseX: f.position.x, baseZ: f.position.z, speed: 0.4 + Math.random() * 1.8, maxY: 14, minY: -0.5 });
    }

    // ── Ambient ──
    const amb = new THREE.PointLight(0xaaccff, 2, 20, 2);
    amb.position.y = 6; this.group.add(amb);

    // ── Ice Crystal collectibles (replace default gems) ──
    const crystalPositions = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 3 + Math.random() * 24;
      crystalPositions.push(new THREE.Vector3(Math.sin(a) * r, 0.5 + Math.random() * 2, Math.cos(a) * r));
    }
    this._spawnIceCrystals(crystalPositions);

    this.addReturnPortal(this.cfg, new THREE.Vector3(-8, 0, 8));

    // ── Colliders ──
    this.addObstacleCollider(new THREE.Vector3(0, 0, 0), 9.5);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2; const r = 12 + (i % 4) * 3;
      this.addObstacleCollider(new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r), 0.5);
    }
    this.addObstacleCollider(new THREE.Vector3(7, 0, 5), 0.6);
    this.addObstacleCollider(new THREE.Vector3(-8, 0, -4), 0.6);
    this.addObstacleCollider(new THREE.Vector3(3, 0, -10), 0.6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.addObstacleCollider(new THREE.Vector3(Math.sin(a) * 24, 0, Math.cos(a) * 24), 0.5);
    }
    this.addObstacleCollider(new THREE.Vector3(20, 0, 10), 2);
    this.addObstacleCollider(new THREE.Vector3(-18, 0, -15), 2);
  }

  _spawnIceCrystals(positions) {
    this.total += positions.length;
    positions.forEach((pos, i) => {
      const crystal = new THREE.Group();
      // Main crystal body - tall hexagonal prism shape using cones
      const body = new THREE.Mesh(GEO.cone12, MAT.iceCrystal.clone());
      body.scale.set(0.2, 0.6, 0.2);
      body.position.y = 0.3;
      crystal.add(body);
      // Bottom point (upside down cone)
      const bottom = new THREE.Mesh(GEO.cone12, MAT.iceCrystal.clone());
      bottom.scale.set(0.2, 0.25, 0.2);
      bottom.rotation.x = Math.PI;
      bottom.position.y = 0.05;
      crystal.add(bottom);
      // Inner glow
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xccffff, transparent: true, opacity: 0.7 }));
      glow.position.y = 0.3;
      crystal.add(glow);

      crystal.position.copy(pos);
      crystal.userData = {
        collected: false,
        index: this.collectibles.length + i,
        baseY: pos.y,
        isIceCrystal: true,
        spinSpeed: 0.5 + Math.random() * 0.5,
      };
      this.group.add(crystal);
      this.collectibles.push(crystal);
    });
  }

  isOnIceSheet(playerPos) {
    let onAnyIce = false;
    for (const sheet of this.iceSheets) {
      if (new THREE.Vector2(playerPos.x, playerPos.z).distanceTo(sheet.userData.center) < sheet.userData.radius) {
        onAnyIce = true;
        // Only the large secret ice sheet counts for the mission
        if (sheet.userData.isSecret && !this._iceSecretFound) {
          this._iceSecretFound = true;
          this.spawnBurst(new THREE.Vector3(playerPos.x, 1, playerPos.z));
          // Spawn bonus crystals
          const gems = [];
          for (let j = 0; j < 5; j++) {
            const ja = (j / 5) * Math.PI * 2;
            gems.push(new THREE.Vector3(
              sheet.userData.center.x + Math.sin(ja) * 2,
              0.8,
              sheet.userData.center.y + Math.cos(ja) * 2
            ));
          }
          this._spawnIceCrystals(gems);
        }
        break;
      }
    }
    return onAnyIce;
  }

  checkPeakTop(playerPos) {
    if (!this.climbedToTop && playerPos.y > 10 && new THREE.Vector2(playerPos.x, playerPos.z).length() < 5) {
      this.climbedToTop = true;
      const gems = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        gems.push(new THREE.Vector3(Math.sin(a) * 2, 11.5, Math.cos(a) * 2));
      }
      this._spawnIceCrystals(gems);
      return true;
    }
    return false;
  }

  tryCompleteSnowman(playerPos) {
    // Find nearest snowman base that still needs parts
    for (const base of this.snowmanBases) {
      if (!base.userData || !base.userData.needsParts) continue;
      if (base.userData.needsParts.length === 0) continue;
      const wp = new THREE.Vector3(); base.getWorldPosition(wp);
      if (playerPos.distanceToSquared(wp) >= 6.25) continue; // 2.5 units

      // Find a nearby part matching the next needed type
      const neededType = base.userData.needsParts[0];
      for (const part of this.snowmanParts) {
        if (!part.userData || part.userData.collected) continue;
        if (part.userData.partType !== neededType) continue;
        const pp = new THREE.Vector3(); part.getWorldPosition(pp);
        if (playerPos.distanceToSquared(pp) >= 9) continue; // 3 units - player picks up nearby

        // Add the correct part to the snowman
        part.userData.collected = true;
        part.visible = false;
        base.userData.needsParts.shift();

        const partCount = base.userData.parts.length;
        if (neededType === 'middle') {
          const middle = new THREE.Mesh(GEO.sphere12, MAT.snow);
          middle.scale.setScalar(0.38);
          middle.position.y = 0.9;
          base.add(middle);
          base.userData.parts.push('middle');
        } else if (neededType === 'top') {
          const top = new THREE.Mesh(GEO.sphere12, MAT.snow);
          top.scale.setScalar(0.28);
          top.position.y = 1.4;
          base.add(top);
          base.userData.parts.push('top');
        } else if (neededType === 'nose') {
          const nose = new THREE.Mesh(GEO.cone12, MAT.carrot);
          nose.scale.set(0.06, 0.3, 0.06);
          nose.position.set(0, 1.35, 0.22);
          nose.rotation.x = -Math.PI / 2;
          base.add(nose);
          base.userData.parts.push('nose');
        }

        // Check if snowman is complete
        if (base.userData.needsParts.length === 0) {
          this.snowmenBuilt++;
          this.spawnBurst(new THREE.Vector3(wp.x, 1.5, wp.z));
        }
        return true;
      }
    }
    return false;
  }

  startAvalanche() {
    if (this.avalancheActive) return;
    this.avalancheActive = true;
    this.avalancheTimer = 3;
    this._avalancheHit = false; // reset for each avalanche
    const ballGeo = new THREE.SphereGeometry(0.3, 8, 6);
    for (let i = 0; i < 12; i++) {
      const ball = new THREE.Mesh(ballGeo, MAT.snow);
      ball.position.set((Math.random() - 0.5) * 6, 12, (Math.random() - 0.5) * 6);
      ball.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 8, -3 - Math.random() * 4, (Math.random() - 0.5) * 8) };
      this.group.add(ball);
      this.avalancheBalls.push(ball);
    }
  }

  updateAvalanche(delta, playerPos) {
    if (!this.avalancheActive) return false;
    let hitPlayer = false;
    for (const ball of this.avalancheBalls) {
      ball.position.addScaledVector(ball.userData.vel, delta);
      if (ball.position.y < -2) {
        ball.visible = false;
      }
      if (playerPos.distanceToSquared(ball.position) < 1.44) {
        this._avalancheHit = true;
        hitPlayer = true;
      }
    }
    return hitPlayer;
  }

  update(delta) {
    super.update(delta);
    if (this.iceRing) this.iceRing.rotation.z += delta * 0.3;
    for (const f of this.snowflakes) {
      f.mesh.position.y -= delta * f.speed;
      if (f.mesh.position.y < f.minY) {
        f.mesh.position.y = f.maxY;
        f.mesh.position.x = f.baseX + (Math.random() - 0.5) * 3;
        f.mesh.position.z = f.baseZ + (Math.random() - 0.5) * 3;
      }
    }
    // Aurora color shift
    if (this.aurora) {
      const h = (Math.sin(this.time * 0.2) * 0.3 + 0.5);
      this.aurora.material.color.setHSL(h, 0.6, 0.5);
    }
    // Avalanche timer
    if (!this.avalancheActive && this.time > 5) {
      this.avalancheTimer -= delta;
      if (this.avalancheTimer <= 0) {
        this.startAvalanche();
        this.avalancheTimer = 55 + Math.random() * 20;
      }
    }
    if (this.avalancheActive) {
      for (let i = this.avalancheBalls.length - 1; i >= 0; i--) {
        const ball = this.avalancheBalls[i];
        if (ball.position.y < -2) {
          ball.removeFromParent();
          this.avalancheBalls.splice(i, 1);
        }
      }
      if (this.avalancheBalls.length === 0) {
        this.avalancheActive = false;
        this._avalancheCount++;
        // Avalanche ended - check if player survived
        if (!this._avalancheHit) {
          this._avalancheSurvived = true;
        }
      }
    }

    // Animate ice crystals (spin and bob)
    for (const gem of this.collectibles) {
      if (!gem.userData.isIceCrystal || gem.userData.collected) continue;
      gem.rotation.y += delta * gem.userData.spinSpeed;
      gem.position.y = gem.userData.baseY + Math.sin(this.time * 1.2 + gem.userData.index * 0.7) * 0.12;
    }

    // Secret ice sheet pulse animation
    if (this.secretIceSheet && !this._iceSecretFound) {
      this.secretIceSheet.material.opacity = 0.3 + Math.sin(this.time * 1.5) * 0.15;
    }
  }
}
