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
  aurora: new THREE.MeshBasicMaterial({ color: 0x88ff88, transparent: true, opacity: 0.08, side: THREE.DoubleSide }),
  pineNeedle: new THREE.MeshStandardMaterial({ color: 0x1a5533, roughness: 0.7 }),
};

export class SnowyMountain extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg, 30);
    this.snowflakes = [];
    this.iceSheets = [];
    this.snowmanParts = [];
    this.snowmenBuilt = 0;
    this.avalancheActive = false;
    this.avalancheTimer = 0;
    this.avalancheBalls = [];
    this.climbedToTop = false;

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
      '🏃 走過冰晶寶石即可自動收集',
      '🏔️ 沿螺旋步道繞山而上登頂',
      '⛸️ 冰面上移動會滑行，撞破冰牆發現秘密',
      '⛄ 收集散落的雪球＋紅蘿蔔完成雪人',
      '❄️ 雪崩警報響起時躲到冰晶柱後方避難',
      '🔮 找到傳送門按 [E] 即可返回農場',
    ];
  }
  checkMissionStatus() {
    return {
      gems: this.collected >= 14,
      climb: this.climbedToTop,
      snowmen: this.snowmenBuilt >= 3,
      avalanche: !this._avalancheHit,
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

    // ── Ice sheets (slippery) ──
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 16 + (i % 3) * 3;
      const sheet = new THREE.Mesh(new THREE.CircleGeometry(1.8, 16), MAT.iceSheet);
      sheet.rotation.x = -Math.PI / 2;
      sheet.position.set(Math.sin(a) * r, 0.07, Math.cos(a) * r);
      sheet.userData = { center: new THREE.Vector2(Math.sin(a) * r, Math.cos(a) * r), radius: 1.8 };
      this.group.add(sheet);
      this.iceSheets.push(sheet);
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
      this.snowmanParts.push(base);
    });

    // ── Snowman parts scattered ──
    for (let i = 0; i < 9; i++) {
      const part = new THREE.Mesh(GEO.sphere12, MAT.snow);
      part.scale.setScalar(0.25 + Math.random() * 0.15);
      part.position.set((Math.random() - 0.5) * 40, 0.15, (Math.random() - 0.5) * 40);
      part.userData = { partType: i % 3 === 0 ? 'middle' : (i % 3 === 1 ? 'top' : 'nose'), carried: false, carrier: null };
      this.group.add(part);
      this.snowmanParts.push(part);
    }

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
      mound.position.set((Math.random() - 0.5) * 50, 0.1, (Math.random() - 0.5) * 50);
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
      f.position.set((Math.random() - 0.5) * 55, Math.random() * 16, (Math.random() - 0.5) * 55);
      this.group.add(f);
      this.snowflakes.push({ mesh: f, baseX: f.position.x, baseZ: f.position.z, speed: 0.4 + Math.random() * 1.8, maxY: 14, minY: -0.5 });
    }

    // ── Ambient ──
    const amb = new THREE.PointLight(0xaaccff, 2, 20, 2);
    amb.position.y = 6; this.group.add(amb);

    // ── Gems ──
    const gems = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 3 + Math.random() * 26;
      gems.push(new THREE.Vector3(Math.sin(a) * r, 0.5 + Math.random() * 3, Math.cos(a) * r));
    }
    this.spawnGems(gems, 0.2);

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

  isOnIceSheet(playerPos) {
    for (const sheet of this.iceSheets) {
      if (new THREE.Vector2(playerPos.x, playerPos.z).distanceTo(sheet.userData.center) < sheet.userData.radius) {
        this._iceSecretFound = true;
        return true;
      }
    }
    return false;
  }

  checkPeakTop(playerPos) {
    if (!this.climbedToTop && playerPos.y > 10 && new THREE.Vector2(playerPos.x, playerPos.z).length() < 5) {
      this.climbedToTop = true;
      const gems = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        gems.push(new THREE.Vector3(Math.sin(a) * 2, 11.5, Math.cos(a) * 2));
      }
      this.spawnGems(gems, 0.26);
      return true;
    }
    return false;
  }

  tryCompleteSnowman(playerPos) {
    for (const base of this.snowmanParts) {
      if (!base.userData || !base.userData.needsParts) continue;
      if (base.userData.needsParts.length === 0) continue;
      const wp = new THREE.Vector3(); base.getWorldPosition(wp);
      if (playerPos.distanceToSquared(wp) < 6.25 && base.userData.parts.length === 1) {
        // Check nearby part
        for (const part of this.snowmanParts) {
          if (part === base || !part.userData || !part.userData.partType) continue;
          if (part.userData.carried) continue;
          const pp = new THREE.Vector3(); part.getWorldPosition(pp);
          if (playerPos.distanceToSquared(pp) < 4) {
            const needed = base.userData.needsParts.shift();
            const middle = new THREE.Mesh(GEO.sphere12, MAT.snow);
            middle.scale.setScalar(0.38); middle.position.y = 0.9;
            base.add(middle); base.userData.parts.push('middle');
            if (needed === 'middle') {
              part.visible = false; part.userData.carried = true;
            }
            if (base.userData.needsParts.length === 1 && base.userData.needsParts[0] === 'nose') {
              const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), MAT.carrot);
              nose.position.set(0, 1.35, 0.22); nose.rotation.x = -Math.PI / 2;
              base.add(nose); base.userData.needsParts = [];
              this.snowmenBuilt++;
              this.spawnBurst(new THREE.Vector3(wp.x, 1, wp.z));
            }
            return true;
          }
        }
      }
    }
    return false;
  }

  startAvalanche() {
    if (this.avalancheActive) return;
    this.avalancheActive = true;
    this.avalancheTimer = 3;
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
    for (const ball of this.avalancheBalls) {
      ball.position.addScaledVector(ball.userData.vel, delta);
      if (ball.position.y < -2) {
        ball.visible = false;
      }
      if (playerPos.distanceToSquared(ball.position) < 1.44) {
        this._avalancheHit = true;
        return true; // Hit player
      }
    }
    return false;
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
      }
    }
  }
}