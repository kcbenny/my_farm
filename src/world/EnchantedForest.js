import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';

const GEO = { cone12: new THREE.ConeGeometry(1, 1, 12), sphere12: new THREE.SphereGeometry(1, 12, 8) };

const MAT = {
  moss: new THREE.MeshStandardMaterial({ color: 0x2d5a1e, roughness: 0.85 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x1a4a2a, roughness: 0.8 }),
  mushStem: new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.7 }),
  mushCap: (h) => new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(h, 0.85, 0.5) }),
  wisp: new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 }),
  goldWisp: new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.9 }),
  mist: new THREE.MeshBasicMaterial({ color: 0x6699aa, transparent: true, opacity: 0.06, side: THREE.DoubleSide }),
  path: new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9 }),
  stream: new THREE.MeshBasicMaterial({ color: 0x4488bb, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  bounceMush: new THREE.MeshStandardMaterial({ color: 0xff6644, roughness: 0.5 }),
  fairyDust: new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.9 }),
  fairyDustCore: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 }),
};

export class EnchantedForest extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg, 30);
    this.wisps = [];
    this.goldWisps = [];
    this.bounceMushrooms = [];
    this.mushroomCircles = [];
    this.treeholes = [];
    this.goldFireflies = [];
    this.firefliesCaptured = 0;
    this.canopyReached = false;
    this.fairyCirclesFound = 0;
    this._fairyFollowTimers = [0, 0, 0]; // track how long player follows each fairy

    this.build();
    this._setupMissions();
  }

  _setupMissions() {
    this._missions = [
      { id: 'gems', text: '收集 16 顆仙子粉塵 (0/16)' },
      { id: 'fairies', text: '跟隨 3 隻仙子找到蘑菇圈 (0/3)' },
      { id: 'canopy', text: '利用彈跳蘑菇到達樹冠平台' },
      { id: 'fireflies', text: '捕捉 10 隻金色螢火蟲 (0/10)' },
      { id: 'treeholes', text: '發現 4 個樹洞秘密區域 (0/4)' },
    ];
  }
  getMissions() { return this._missions; }
  getHints() {
    return [
      '🏃 走近閃亮的仙子粉塵簇即可自動收集',
      '🧚 跟隨金色仙子飛行，持續靠近一段時間會引你到蘑菇圈',
      '🍄 踩上紅色大蘑菇可彈跳到樹冠平台',
      '🕳️ 走近發光的樹洞會被傳送到秘密區域',
      '✨ 追逐金色螢火蟲碰觸即可捕捉',
      '🔮 找到傳送門按 [E] 即可返回農場',
    ];
  }
  checkMissionStatus() {
    return {
      gems: this.collected >= 16,
      fairies: this.fairyCirclesFound >= 3,
      canopy: this.canopyReached,
      fireflies: this.firefliesCaptured >= 10,
      treeholes: this.treeholes.filter(t => t.userData.found).length >= 4,
    };
  }

  build() {
    const R = this.mapRadius;
    const safeR = R - 3; // keep things inside the map

    // Ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.5, 0.5, 48), MAT.moss);
    ground.position.y = -0.25; ground.receiveShadow = true;
    this.group.add(ground);

    // ── Stone paths ──
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      for (let d = 3; d < R - 4; d += 2.5) {
        const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.08, 6), MAT.path);
        stone.position.set(Math.sin(a + d * 0.02) * d, 0.05, Math.cos(a + d * 0.02) * d);
        this.group.add(stone);
      }
    }

    // ── Trees (28, double ring) ──
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r = i < 14 ? 22 : 14;
      const tree = this.makeTree(1.0 + (i % 4) * 0.2);
      tree.position.set(Math.sin(a + (i % 3) * 0.15) * r, 0, Math.cos(a + (i % 3) * 0.15) * r);
      this.group.add(tree);
    }

    // ── Mushrooms ──
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 8 + (i % 4) * 3;
      const mush = new THREE.Group();
      const stem = new THREE.Mesh(GEO.cone12, MAT.mushStem);
      stem.scale.set(0.25, 1.5, 0.25); stem.position.y = 0.75; mush.add(stem);
      const cap = new THREE.Mesh(GEO.sphere12, MAT.mushCap(i / 14));
      cap.scale.set(0.7, 0.4, 0.7); cap.position.y = 1.5; mush.add(cap);
      mush.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      this.group.add(mush);
    }

    // ── Bounce mushrooms (6) ──
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 12;
      const bm = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.8, 12), MAT.mushStem);
      stem.position.y = 0.4; bm.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.bounceMush);
      cap.position.y = 0.9; bm.add(cap);
      bm.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      bm.userData = { bouncePower: 12, index: i };
      this.group.add(bm);
      this.bounceMushrooms.push(bm);
    }

    // ── Tree canopy platform ──
    const canopyPlatform = new THREE.Group();
    const cpBase = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 0.3, 16), MAT.leaf);
    cpBase.position.y = 7; canopyPlatform.add(cpBase);
    canopyPlatform.position.set(0, 0, 10);
    canopyPlatform.visible = true;
    this.group.add(canopyPlatform);
    this.canopyPlatform = canopyPlatform;

    // ── Central stump + treeholes ──
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 2.5, 24), MAT.trunk);
    stump.position.y = 1.25; stump.castShadow = true;
    this.group.add(stump);
    const stumpGlow = new THREE.Mesh(GEO.sphere12, new THREE.MeshBasicMaterial({ color: 0x9944ff, transparent: true, opacity: 0.55 }));
    stumpGlow.scale.set(0.8, 0.8, 0.8); stumpGlow.position.y = 2.8;
    this.group.add(stumpGlow); this.stumpGlow = stumpGlow;
    // 4 treehole rings
    for (let h = 0; h < 4; h++) {
      const ha = (h / 4) * Math.PI * 2;
      const hole = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0x4422aa, transparent: true, opacity: 0.55 }));
      hole.position.set(Math.sin(ha) * 2.4, 1.5 + Math.cos(ha) * 1.2, 0);
      hole.rotation.x = Math.PI / 2;
      hole.userData = { holeIdx: h, found: false, destAngle: ha + Math.PI };
      this.group.add(hole);
      this.treeholes.push(hole);
    }

    // ── Fairy guides (gold wisps) ──
    for (let f = 0; f < 3; f++) {
      const fairy = new THREE.Mesh(GEO.sphere12, MAT.goldWisp.clone());
      fairy.scale.setScalar(0.25);
      const ba = (f / 3) * Math.PI * 2;
      fairy.position.set(Math.sin(ba) * 16, 1.5, Math.cos(ba) * 16);
      this.group.add(fairy);
      this.goldWisps.push({
        mesh: fairy,
        baseX: fairy.position.x, baseZ: fairy.position.z,
        baseY: fairy.position.y, phase: f * 2.1,
        revealedCircle: false,
        circlePos: new THREE.Vector3(Math.sin(ba + 0.5) * 10, 0, Math.cos(ba + 0.5) * 10),
        followTimer: 0,
      });
    }
    // Mushroom circles (hidden, revealed by fairies) - positions clamped inside map
    for (let c = 0; c < 3; c++) {
      const circle = new THREE.Group();
      for (let m = 0; m < 6; m++) {
        const ma = (m / 6) * Math.PI * 2;
        const miniMush = new THREE.Mesh(GEO.sphere12, MAT.mushCap(0.3));
        miniMush.scale.set(0.25, 0.15, 0.25);
        miniMush.position.set(Math.sin(ma) * 1.2, 0.2, Math.cos(ma) * 1.2);
        circle.add(miniMush);
      }
      // Place circles at known positions inside the map (not random)
      const ca = (c / 3) * Math.PI * 2 + 0.6;
      circle.position.set(Math.sin(ca) * 10, 0, Math.cos(ca) * 10);
      circle.visible = false;
      circle.userData = { revealed: false, gemsSpawned: false, index: c };
      this.group.add(circle);
      this.mushroomCircles.push(circle);
    }

    // ── Gold fireflies (clamped inside map radius) ──
    for (let i = 0; i < 10; i++) {
      const ff = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4),
        new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.9 }));
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * (safeR - 3);
      ff.position.set(Math.sin(a) * r, 0.5 + Math.random() * 3, Math.cos(a) * r);
      this.group.add(ff);
      this.goldFireflies.push({
        mesh: ff, captured: false,
        baseX: ff.position.x, baseZ: ff.position.z, baseY: ff.position.y,
        phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 0.8,
        wanderR: r * 0.3,
      });
    }

    // ── Stream ──
    const streamPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 50), MAT.stream);
    streamPlane.rotation.x = -Math.PI / 2;
    streamPlane.position.set(-18, 0.06, 0);
    streamPlane.rotation.z = 0.1;
    this.group.add(streamPlane);

    // ── Wisps (clamped inside map) ──
    for (let i = 0; i < 20; i++) {
      const wisp = new THREE.Mesh(GEO.sphere12, MAT.wisp.clone());
      wisp.scale.setScalar(0.12);
      const a = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * (safeR - 2);
      wisp.position.set(Math.sin(a) * r, 0.6 + Math.random() * 3, Math.cos(a) * r);
      this.group.add(wisp);
      this.wisps.push({
        mesh: wisp,
        baseX: wisp.position.x, baseZ: wisp.position.z, baseY: wisp.position.y,
        phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.5,
        wanderR: 2 + Math.random() * 2,
      });
    }

    // ── Mist planes ──
    for (let i = 0; i < 8; i++) {
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(R * 1.8, 6), MAT.mist);
      mist.rotation.y = i * 0.7; mist.position.set(0, 1.2 + i * 0.6, 0);
      this.group.add(mist);
    }

    // ── Ambient ──
    const amb = new THREE.PointLight(0x6699cc, 1.5, 20, 2);
    amb.position.y = 4; this.group.add(amb);

    // ── Fairy Dust collectibles (replace default gems) ──
    const dustPositions = [];
    for (let i = 0; i < 16; i++) {
      const a = i * 0.8 + Math.random() * 0.5;
      const r = 4 + Math.random() * 22;
      dustPositions.push(new THREE.Vector3(Math.sin(a) * r, 0.5 + Math.random() * 0.6, Math.cos(a) * r));
    }
    this._spawnFairyDust(dustPositions);

    this.addReturnPortal(this.cfg, new THREE.Vector3(0, 0, -10));

    // ── Colliders ──
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r = i < 14 ? 22 : 14;
      this.addObstacleCollider(new THREE.Vector3(Math.sin(a + (i % 3) * 0.15) * r, 0, Math.cos(a + (i % 3) * 0.15) * r), 1.3);
    }
    this.addObstacleCollider(new THREE.Vector3(0, 0, 0), 2.5);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2; const r = 8 + (i % 4) * 3;
      this.addObstacleCollider(new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r), 0.7);
    }
  }

  _spawnFairyDust(positions) {
    this.total += positions.length;
    positions.forEach((pos, i) => {
      const dust = new THREE.Group();
      // Core bright center
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), MAT.fairyDustCore.clone());
      dust.add(core);
      // Outer glow
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), MAT.fairyDust.clone());
      dust.add(glow);
      // 4 sparkles around
      for (let s = 0; s < 4; s++) {
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 3),
          new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.8 }));
        const sa = (s / 4) * Math.PI * 2;
        spark.position.set(Math.cos(sa) * 0.2, Math.sin(s * 1.5) * 0.1, Math.sin(sa) * 0.2);
        spark.userData = { baseAngle: sa, orbitSpeed: 0.8 + s * 0.3, bobPhase: s * 0.7 };
        dust.add(spark);
      }
      dust.position.copy(pos);
      dust.userData = {
        collected: false,
        index: this.collectibles.length + i,
        baseY: pos.y,
        isFairyDust: true,
      };
      this.group.add(dust);
      this.collectibles.push(dust);
    });
  }

  makeTree(scale) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.5 * scale, 4 * scale, 12), MAT.trunk);
    trunk.position.y = 2 * scale; trunk.castShadow = true; tree.add(trunk);
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(GEO.cone12, MAT.leaf);
      leaf.scale.set((2.5 - i * 0.25) * scale, 1.6 * scale, (2.5 - i * 0.25) * scale);
      leaf.position.y = (3 + i * 1.1) * scale; leaf.castShadow = true; tree.add(leaf);
    }
    return tree;
  }

  checkBounceMushroom(playerPos) {
    for (const bm of this.bounceMushrooms) {
      const wp = new THREE.Vector3(); bm.getWorldPosition(wp);
      const local = wp.clone().sub(this.group.position);
      if (playerPos.distanceToSquared(wp) < 4) { // 2 units
        return { position: local, power: bm.userData.bouncePower };
      }
    }
    return null;
  }

  checkCanopyPlatform(playerPos) {
    const wp = new THREE.Vector3(); this.canopyPlatform.getWorldPosition(wp);
    if (playerPos.distanceToSquared(wp) < 9 && playerPos.y > 6.5) {
      if (!this.canopyReached) {
        this.canopyReached = true;
        // Spawn bonus gems on canopy
        if (!this._canopyGemsSpawned) {
          this._canopyGemsSpawned = true;
          const gems = [];
          for (let i = 0; i < 5; i++) {
            gems.push(new THREE.Vector3(wp.x + (Math.random() - 0.5) * 4, wp.y + 0.5, wp.z + (Math.random() - 0.5) * 4));
          }
          this._spawnFairyDust(gems);
        }
      }
    }
  }

  tryCaptureFirefly(playerPos) {
    for (const ff of this.goldFireflies) {
      if (ff.captured) continue;
      const wp = new THREE.Vector3(); ff.mesh.getWorldPosition(wp);
      if (playerPos.distanceToSquared(wp) < 3.24) { // 1.8 units
        ff.captured = true;
        ff.mesh.visible = false;
        this.firefliesCaptured++;
        this.spawnBurst(wp.clone().sub(this.group.position));
        return true;
      }
    }
    return false;
  }

  checkTreehole(playerPos) {
    for (const hole of this.treeholes) {
      if (hole.userData.found) continue;
      const wp = new THREE.Vector3(); hole.getWorldPosition(wp);
      if (playerPos.distanceToSquared(wp) < 2.25) {
        hole.userData.found = true;
        hole.material = new THREE.MeshBasicMaterial({ color: 0x88ff44, transparent: true, opacity: 0.7 });
        // Teleport to opposite side + spawn gems
        const destA = hole.userData.destAngle;
        const gems = [];
        for (let i = 0; i < 3; i++) {
          gems.push(new THREE.Vector3(Math.sin(destA) * (20 + i), 0.5, Math.cos(destA) * (20 + i)));
        }
        this._spawnFairyDust(gems);
        return { teleportTo: new THREE.Vector3(Math.sin(destA) * 22, 0, Math.cos(destA) * 22) };
      }
    }
    return null;
  }

  update(delta) {
    super.update(delta);
    if (this.stumpGlow) {
      this.stumpGlow.scale.setScalar(0.8 + Math.sin(this.time * 2) * 0.12);
      this.stumpGlow.material.opacity = 0.4 + Math.sin(this.time * 3) * 0.15;
    }
    // Wisps
    for (const w of this.wisps) {
      w.mesh.position.x = w.baseX + Math.sin(this.time * w.speed + w.phase) * w.wanderR;
      w.mesh.position.z = w.baseZ + Math.cos(this.time * w.speed * 0.7 + w.phase) * w.wanderR * 0.7;
      w.mesh.position.y = w.baseY + Math.sin(this.time * 1.3 + w.phase) * 0.5;
      w.mesh.material.opacity = 0.4 + Math.sin(this.time * 3 + w.phase) * 0.3;
    }
    // Gold fairies - player must follow near them to reveal mushroom circles
    for (let fi = 0; fi < this.goldWisps.length; fi++) {
      const fw = this.goldWisps[fi];
      fw.mesh.position.x = fw.baseX + Math.sin(this.time * 0.6 + fw.phase) * 10;
      fw.mesh.position.z = fw.baseZ + Math.cos(this.time * 0.6 + fw.phase) * 8;
      fw.mesh.position.y = fw.baseY + Math.sin(this.time * 1.5 + fw.phase) * 1.0;
      fw.mesh.material.opacity = 0.6 + Math.sin(this.time * 2.5 + fw.phase) * 0.35;

      // Check if player is following this fairy
      if (!fw.revealedCircle && fi < this.mushroomCircles.length) {
        const mc = this.mushroomCircles[fi];
        if (!mc.userData.revealed) {
          const wp = new THREE.Vector3();
          fw.mesh.getWorldPosition(wp);
          // Use playerPos from the update context - we'll track via a stored position
          // Actually, we check in the game loop via checkFairyProximity
        }
      }
    }
    // Gold fireflies (run away from player)
    for (const ff of this.goldFireflies) {
      if (ff.captured) continue;
      ff.mesh.position.x = ff.baseX + Math.sin(this.time * ff.speed + ff.phase) * ff.wanderR;
      ff.mesh.position.z = ff.baseZ + Math.cos(this.time * ff.speed * 0.8 + ff.phase) * ff.wanderR * 0.75;
      ff.mesh.position.y = ff.baseY + Math.sin(this.time * 2 + ff.phase) * 0.8;
    }
    // Bounce mushrooms pulse
    for (const bm of this.bounceMushrooms) {
      const s = 1 + Math.sin(this.time * 2.5 + bm.userData.index) * 0.08;
      bm.children[1]?.scale?.setScalar?.(s); // cap pulse
    }

    // Animate fairy dust collectibles (sparkles orbiting)
    for (const gem of this.collectibles) {
      if (!gem.userData.isFairyDust || gem.userData.collected) continue;
      gem.children.forEach((child, idx) => {
        if (idx < 2) return; // skip core and glow
        const spark = child;
        const angle = this.time * spark.userData.orbitSpeed + spark.userData.baseAngle;
        spark.position.x = Math.cos(angle) * 0.2;
        spark.position.z = Math.sin(angle) * 0.2;
        spark.position.y = Math.sin(this.time * 2 + spark.userData.bobPhase) * 0.1;
      });
      // Gentle bobbing
      gem.position.y = gem.userData.baseY + Math.sin(this.time * 1.5 + gem.userData.index * 0.5) * 0.15;
    }
  }

  // Called by MapManager each frame with player position
  checkFairyProximity(playerPos, delta) {
    for (let fi = 0; fi < this.goldWisps.length; fi++) {
      const fw = this.goldWisps[fi];
      if (fw.revealedCircle) continue;
      if (fi >= this.mushroomCircles.length) continue;
      const mc = this.mushroomCircles[fi];
      if (mc.userData.revealed) continue;

      const wp = new THREE.Vector3();
      fw.mesh.getWorldPosition(wp);
      const dist = playerPos.distanceTo(wp);

      if (dist < 4) {
        // Player is near the fairy - accumulate follow time
        fw.followTimer = (fw.followTimer || 0) + delta;
        // Visual feedback: fairy gets brighter when followed
        fw.mesh.material.opacity = Math.min(1, 0.7 + fw.followTimer * 0.1);
        // After 8 seconds of following, reveal the mushroom circle
        if (fw.followTimer >= 8) {
          mc.visible = true;
          mc.userData.revealed = true;
          fw.revealedCircle = true;
          this.fairyCirclesFound++;
          // Spawn gems in circle
          if (!mc.userData.gemsSpawned) {
            mc.userData.gemsSpawned = true;
            const gps = [];
            for (let j = 0; j < 5; j++) {
              const ja = (j / 5) * Math.PI * 2;
              gps.push(new THREE.Vector3(mc.position.x + Math.sin(ja) * 1.2, 0.5, mc.position.z + Math.cos(ja) * 1.2));
            }
            this._spawnFairyDust(gps);
          }
          this.spawnBurst(mc.position.clone().add(new THREE.Vector3(0, 1, 0)));
        }
      } else {
        // Player wandered away - slowly decay timer
        fw.followTimer = Math.max(0, (fw.followTimer || 0) - delta * 0.5);
      }
    }
  }
}
