import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';

const GEO = { sphere12: new THREE.SphereGeometry(1, 12, 8), cone8: new THREE.ConeGeometry(1, 1, 8) };

const MAT = {
  dirt: new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.9 }),
  corn: new THREE.MeshStandardMaterial({ color: 0xcca533, roughness: 0.75 }),
  pumpkin: new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.6 }),
  pumpkinFace: new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.7 }),
  stem: new THREE.MeshStandardMaterial({ color: 0x2d5a1e, roughness: 0.8 }),
  hay: new THREE.MeshStandardMaterial({ color: 0xc4a44a, roughness: 0.85 }),
  apple: new THREE.MeshStandardMaterial({ color: 0xcc2233, roughness: 0.45 }),
  lanternOff: new THREE.MeshBasicMaterial({ color: 0x553311, transparent: true, opacity: 0.4 }),
  lanternOn: new THREE.MeshBasicMaterial({ color: 0xff9933, transparent: true, opacity: 0.85 }),
  fogPlane: new THREE.MeshBasicMaterial({ color: 0x332211, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  leaf: new THREE.MeshBasicMaterial({ color: 0xcc7722, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  waterBucket: new THREE.MeshStandardMaterial({ color: 0x775533, roughness: 0.8 }),
};

export class HarvestMaze extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg, 30);

    this.pumpkins = [];
    this.lanterns = [];
    this.lanternLit = 0;
    this.lanternTotal = 10;
    this.pumpkinKingActive = false;
    this.pumpkinKingDefeated = false;
    this.pumpkinKingHP = 3;
    this.pumpkinKingPos = new THREE.Vector3(0, 0, 0);
    this.appleBobCount = 0;
    this.riddleAnswered = 0;
    this.currentRiddle = null;
    this.riddleTimer = 0;
    this.fogMeshes = [];
    this.leaves = [];
    this.revealRadius = 8;
    // Fog of war tracking grid (simple)
    this.fogGrid = new Set();

    this.build();
    this._setupMissions();
  }

  _setupMissions() {
    this._missions = [
      { id: 'gems', text: '收集 18 顆隱藏南瓜寶石 (0/18)' },
      { id: 'lanterns', text: '點亮 10 盞南瓜燈籠 (0/10)' },
      { id: 'king', text: '擊敗巨型南瓜王' },
      { id: 'apples', text: 'Apple Bobbing 獲得 3 顆金蘋果 (0/3)' },
      { id: 'riddles', text: '回答稻草人 3 個謎語 (0/3)' },
    ];
  }
  getMissions() { return this._missions; }
  checkMissionStatus() {
    return {
      gems: this.collected >= 18,
      lanterns: this.lanternLit >= this.lanternTotal,
      king: this.pumpkinKingDefeated,
      apples: this.appleBobCount >= 3,
      riddles: this.riddleAnswered >= 3,
    };
  }

  build() {
    const R = this.mapRadius;

    // Ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.5, 0.5, 48), MAT.dirt);
    ground.position.y = -0.25; ground.receiveShadow = true;
    this.group.add(ground);

    // ── Expanded corn maze (40 wall segments) ──
    const mazeLayout = [
      // Outer ring
      [-14, -14, 0.6, 28], [14, -14, 0.6, 28],
      [-14, -14, 28, 0.6], [-14, 14, 28, 0.6],
      // Inner walls — complex labyrinth
      [-10, -10, 0.5, 20], [10, -10, 0.5, 20],
      [-10, -10, 20, 0.5], [-10, 10, 20, 0.5],
      // Cross corridors
      [-6, -6, 0.5, 12], [6, -6, 0.5, 12],
      [-6, 0, 0.5, 6], [6, 0, 0.5, 6],
      [-6, 6, 12, 0.5], [6, -6, 0.5, 6],
      // Dead ends
      [-3, -10, 0.5, 4], [3, -8, 0.5, 4],
      [-3, 6, 6, 0.5], [3, 4, 6, 0.5],
      [-10, 3, 4, 0.5], [10, -4, 4, 0.5],
      [-10, -4, 0.5, 7], [10, 2, 0.5, 8],
      // Extra winding walls
      [-8, -2, 4, 0.5], [8, -2, 4, 0.5],
      [-4, -4, 0.5, 8], [4, -4, 0.5, 8],
      [-2, 0, 4, 0.5], [2, 0, 4, 0.5],
      [-8, 8, 0.5, 4], [8, -8, 0.5, 4],
      // Center area walls
      [-2, -2, 4, 0.5], [2, 2, 0.5, 4],
      // Additional outer
      [-18, -18, 0.5, 6], [18, -18, 0.5, 6],
      [-18, 12, 0.5, 6], [18, -12, 0.5, 6],
      [-18, -6, 6, 0.5], [18, 6, 6, 0.5],
    ];

    const cornGeo = new THREE.BoxGeometry(1, 2.5, 1);
    const stalkGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.5, 4);
    mazeLayout.forEach(([cx, cz, w, d]) => {
      const wall = new THREE.Mesh(cornGeo, MAT.corn);
      wall.scale.set(w, 1, d);
      wall.position.set(cx, 1.25, cz);
      wall.castShadow = true; wall.receiveShadow = true;
      this.group.add(wall);
      const count = Math.max(2, Math.floor(Math.max(w, d) * 1.2));
      for (let j = 0; j < count; j++) {
        const stalk = new THREE.Mesh(stalkGeo, MAT.stem);
        stalk.position.set(
          cx + (w > 1 ? (j / (w * 1.2) - 0.5) * w + (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * 0.3),
          2.7,
          cz + (d > 1 ? (j / (d * 1.2) - 0.5) * d + (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * 0.3)
        );
        this.group.add(stalk);
      }
    });

    // ── Lanterns (scattered in maze) ──
    const lanternPositions = [
      [-10, -4], [10, 6], [-6, 8], [4, -10], [-12, 10],
      [8, -6], [-4, -12], [12, -2], [0, -8], [6, 2],
    ];
    lanternPositions.forEach(([lx, lz]) => {
      const lantern = new THREE.Group();
      const body = new THREE.Mesh(GEO.sphere12, MAT.lanternOff.clone());
      body.scale.set(0.35, 0.3, 0.35); body.position.y = 0.35;
      lantern.add(body);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.25, 6), MAT.stem);
      stem.position.y = 0.55; lantern.add(stem);
      const glow = new THREE.Mesh(GEO.sphere12, MAT.lanternOff.clone());
      glow.scale.setScalar(0.15); glow.position.y = 0.35;
      lantern.add(glow);
      lantern.position.set(lx, 0, lz);
      lantern.userData = { lit: false, body, glow, index: this.lanterns.length };
      this.group.add(lantern);
      this.lanterns.push(lantern);
    });

    // ── Pumpkins ──
    const punkGeo = new THREE.SphereGeometry(0.4, 12, 8);
    const faceGeo = new THREE.SphereGeometry(0.25, 6, 4);
    for (let i = 0; i < 15; i++) {
      const pumpkin = new THREE.Group();
      const body = new THREE.Mesh(punkGeo, MAT.pumpkin);
      body.scale.y = 0.7; pumpkin.add(body);
      const face = new THREE.Mesh(faceGeo, MAT.pumpkinFace.clone());
      face.scale.set(0.55, 0.35, 0.55); face.position.y = 0.05;
      pumpkin.add(face);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.25, 6), MAT.stem);
      stem.position.y = 0.3; pumpkin.add(stem);
      pumpkin.position.set((Math.random() - 0.5) * 28, 0.25, (Math.random() - 0.5) * 28);
      pumpkin.castShadow = true;
      this.group.add(pumpkin);
      this.pumpkins.push({ group: pumpkin, face, phase: Math.random() * Math.PI * 2 });
    }

    // ── Apple trees (4) with bobbing buckets ──
    this.appleTrees = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      const r = 22;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.5, 12), MAT.stem);
      trunk.position.y = 1.25; tree.add(trunk);
      const crown = new THREE.Mesh(GEO.sphere12, MAT.stem);
      crown.scale.set(1.5, 1.5, 1.5); crown.position.y = 2.8;
      tree.add(crown);
      for (let j = 0; j < 6; j++) {
        const apple = new THREE.Mesh(GEO.sphere12, MAT.apple);
        apple.scale.setScalar(0.15);
        apple.position.set((Math.random() - 0.5) * 2, 2.2 + Math.random() * 1.0, (Math.random() - 0.5) * 2);
        tree.add(apple);
      }
      // Water bucket for apple bobbing
      const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.5, 12), MAT.waterBucket);
      bucket.position.set(0, 0.25, 0.7); tree.add(bucket);
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.1, 12),
        new THREE.MeshBasicMaterial({ color: 0x4488cc, transparent: true, opacity: 0.6 }));
      water.position.set(0, 0.42, 0.7); tree.add(water);
      tree.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      tree.userData = { bobTimer: 0, appleReady: true, bobPhase: Math.random() * Math.PI * 2 };
      this.group.add(tree);
      this.appleTrees.push(tree);
    }

    // ── Scarecrow ──
    const scarecrow = new THREE.Group();
    const sBody = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 3, 12), MAT.hay);
    sBody.position.y = 1.8; scarecrow.add(sBody);
    const head = new THREE.Mesh(GEO.sphere12, MAT.hay);
    head.scale.setScalar(0.35); head.position.y = 3.6; scarecrow.add(head);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.06, 0.6, 8), MAT.stem);
    hat.position.y = 4.1; scarecrow.add(hat);
    scarecrow.position.set(0, 0, 8);
    this.group.add(scarecrow);
    this.scarecrow = scarecrow;
    // Riddle bubble
    this.riddleBubble = null;

    // ── Fog of War planes ──
    // Use a simple approach: large semi-transparent plane that gets cutouts
    // For simplicity, we use distance-based reveal
    const fogGeo = new THREE.PlaneGeometry(R * 2.5, R * 2.5);
    this.fogOverlay = new THREE.Mesh(fogGeo, MAT.fogPlane.clone());
    this.fogOverlay.rotation.x = -Math.PI / 2;
    this.fogOverlay.position.y = 0.15;
    this.fogOverlay.renderOrder = 999;
    this.fogOverlay.material.depthTest = false;
    this.fogOverlay.visible = false; // Hidden until activated
    this.group.add(this.fogOverlay);

    // ── Hay bales ──
    for (let i = 0; i < 12; i++) {
      const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.7, 12), MAT.hay);
      const a = Math.random() * Math.PI * 2;
      const r = 5 + Math.random() * 20;
      hb.position.set(Math.sin(a) * r, 0.35, Math.cos(a) * r);
      hb.castShadow = true;
      this.group.add(hb);
    }

    // ── Falling leaves ──
    for (let i = 0; i < 30; i++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), MAT.leaf);
      leaf.position.set((Math.random() - 0.5) * 55, 3 + Math.random() * 6, (Math.random() - 0.5) * 55);
      leaf.userData = { speed: 0.3 + Math.random() * 0.8, sway: Math.random() * Math.PI * 2, maxY: 7, minY: -0.2 };
      this.group.add(leaf);
      this.leaves.push(leaf);
    }

    // ── Pumpkin King (hidden initially) ──
    this.kingGroup = new THREE.Group();
    const kingBody = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 12), MAT.pumpkin);
    kingBody.scale.y = 0.7; this.kingGroup.add(kingBody);
    const kingFace = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), MAT.pumpkinFace.clone());
    kingFace.scale.set(0.6, 0.4, 0.6); kingFace.position.y = 0.1;
    this.kingGroup.add(kingFace);
    const kingStem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 1, 8), MAT.stem);
    kingStem.position.y = 1.5; this.kingGroup.add(kingStem);
    this.kingGroup.position.set(0, 0, 0);
    this.kingGroup.visible = false;
    this.group.add(this.kingGroup);

    // ── Ambient ──
    const amb = new THREE.PointLight(0xffbb66, 2.2, 18, 2);
    amb.position.y = 5; this.group.add(amb);

    // ── Gems ──
    const punkPositions = [];
    for (let i = 0; i < 18; i++) {
      punkPositions.push(new THREE.Vector3(-14 + Math.random() * 28, 0.55, -14 + Math.random() * 28));
    }
    this.spawnGems(punkPositions, 0.25);

    this.addReturnPortal(this.cfg, new THREE.Vector3(-8, 0, -8));

    // ── Colliders ──
    for (const [cx, cz, w, d] of mazeLayout) {
      const long = Math.max(w, d); const short = Math.min(w, d);
      const segs = Math.max(1, Math.ceil(long / 1.6));
      const segR = short / 2 + 0.45;
      for (let s = 0; s < segs; s++) {
        const t = segs === 1 ? 0.5 : s / (segs - 1);
        const sx = cx + (w > d ? (t - 0.5) * w : 0);
        const sz = cz + (d > w ? (t - 0.5) * d : 0);
        this.addObstacleCollider(new THREE.Vector3(sx, 0, sz), segR);
      }
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      this.addObstacleCollider(new THREE.Vector3(Math.sin(a) * 22, 0, Math.cos(a) * 22), 1.0);
    }
    this.addObstacleCollider(new THREE.Vector3(0, 0, 8), 0.6);
  }

  /* ──── Lantern interaction ──── */
  tryLightLantern(playerPos) {
    for (const lantern of this.lanterns) {
      if (lantern.userData.lit) continue;
      const wp = new THREE.Vector3();
      lantern.getWorldPosition(wp);
      const local = wp.clone().sub(this.group.position);
      if (playerPos.distanceToSquared(wp) < 4) { // 2 units
        lantern.userData.lit = true;
        lantern.userData.body.material = MAT.lanternOn.clone();
        lantern.userData.glow.material = MAT.lanternOn.clone();
        this.lanternLit++;
        // Glow sphere
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), MAT.lanternOn.clone());
        glow.position.copy(local); glow.position.y = 1.2;
        this.group.add(glow);
        lantern.userData.glowSphere = glow;
        this.spawnBurst(local.clone().add(new THREE.Vector3(0, 0.5, 0)));
        // Check if all lit → spawn Pumpkin King
        if (this.lanternLit >= this.lanternTotal) {
          this._spawnPumpkinKing();
        }
        return true;
      }
    }
    return false;
  }

  _spawnPumpkinKing() {
    this.pumpkinKingActive = true;
    this.kingGroup.visible = true;
    this.pumpkinKingPos.set(0, 0, 0);
    this.kingGroup.position.set(0, 1.2, 0);
  }

  /* ──── Apple Bobbing ──── */
  tryAppleBobbing(playerPos) {
    for (const tree of this.appleTrees) {
      const wp = new THREE.Vector3(); tree.getWorldPosition(wp);
      if (playerPos.distanceToSquared(wp) < 6.25 && tree.userData.appleReady) {
        tree.userData.bobTimer = 3.0;
        tree.userData.appleReady = false;
        this.appleBobCount++;
        // Visual feedback
        const eff = new THREE.Mesh(GEO.sphere12, MAT.apple);
        eff.scale.setScalar(0.25); eff.position.copy(wp).add(new THREE.Vector3(0, 1.5, 0));
        this.group.add(eff);
        setTimeout(() => { eff.visible = false; eff.removeFromParent(); }, 1500);
        return true;
      }
    }
    return false;
  }

  /* ──── Pumpkin King chase ──── */
  updateKing(delta, playerPos) {
    if (!this.pumpkinKingActive || this.pumpkinKingDefeated) return null;
    const toPlayer = new THREE.Vector3(playerPos.x, this.pumpkinKingPos.y, playerPos.z).sub(this.pumpkinKingPos);
    if (toPlayer.length() > 0.3) {
      toPlayer.normalize();
      this.pumpkinKingPos.addScaledVector(toPlayer, 3.5 * delta);
    }
    this.kingGroup.position.copy(this.pumpkinKingPos);
    this.kingGroup.position.y = 1.2 + Math.sin(this.time * 2.5) * 0.2;
    this.kingGroup.rotation.y += delta * 1.5;
    // Roll animation
    this.kingGroup.rotation.z += delta * 2.0;

    // Check if near wall → damage
    for (const c of this.obstacleColliders) {
      const wp = c.position.clone();
      const dist = new THREE.Vector2(this.pumpkinKingPos.x - wp.x, this.pumpkinKingPos.z - wp.z).length();
      if (dist < c.radius + 1.8 && toPlayer.length() > 0.1) {
        this.pumpkinKingHP--;
        if (this.pumpkinKingHP <= 0) {
          this.pumpkinKingDefeated = true;
          this.pumpkinKingActive = false;
          this.kingGroup.visible = false;
          // Drop loot
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            this.spawnGems([this.pumpkinKingPos.clone().add(new THREE.Vector3(Math.sin(a) * 2, 0.6, Math.cos(a) * 2))], 0.35);
          }
          this.spawnBurst(this.pumpkinKingPos.clone().add(new THREE.Vector3(0, 2, 0)));
          return { defeated: true };
        }
        // Knockback king
        const away = new THREE.Vector2(this.pumpkinKingPos.x - wp.x, this.pumpkinKingPos.z - wp.z).normalize();
        this.pumpkinKingPos.x += away.x * 4;
        this.pumpkinKingPos.z += away.y * 4;
        this.spawnBurst(this.pumpkinKingPos.clone().add(new THREE.Vector3(0, 1, 0)));
        return { hit: true, hp: this.pumpkinKingHP };
      }
    }
    // Player caught
    if (this.pumpkinKingPos.distanceTo(new THREE.Vector3(playerPos.x, this.pumpkinKingPos.y, playerPos.z)) < 2.5) {
      return { playerHit: true };
    }
    return null;
  }

  /* ──── Riddles ──── */
  getCurrentRiddle() {
    if (this.riddleAnswered >= 3) return null;
    const riddles = [
      { q: 'I have ears but cannot hear. What am I?', a: 'corn' },
      { q: 'I am orange and round, with a glowing grin. What am I?', a: 'pumpkin' },
      { q: 'The more you take, the more you leave behind. What am I?', a: 'footsteps' },
      { q: 'I fall but never get hurt. What am I?', a: 'leaf' },
      { q: 'I stand in fields all day, but never work. What am I?', a: 'scarecrow' },
    ];
    return riddles[Math.floor(this.time / 3) % riddles.length];
  }

  checkRiddleAnswer(answer) {
    const riddle = this.getCurrentRiddle();
    if (!riddle) return false;
    if (answer.toLowerCase().includes(riddle.a)) {
      this.riddleAnswered++;
      this.spawnBurst(new THREE.Vector3(0, 2, 8));
      // Reveal gem hint
      const gem = this.collectibles.find(g => !g.userData.collected);
      if (gem) {
        // Make it pulse brighter
        const hint = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.6 }));
        hint.position.copy(gem.position);
        this.group.add(hint);
        setTimeout(() => { hint.visible = false; hint.removeFromParent(); }, 4000);
      }
      return true;
    }
    return false;
  }

  update(delta) {
    super.update(delta);

    for (const p of this.pumpkins) {
      const pulse = 0.5 + Math.sin(this.time * 2 + p.phase) * 0.4;
      p.face.material.opacity = pulse;
      p.face.scale.set(0.55 * pulse, 0.35 * pulse, 0.55 * pulse);
    }

    // Lantern glows
    for (const lantern of this.lanterns) {
      if (lantern.userData.lit && lantern.userData.glowSphere) {
        lantern.userData.glowSphere.material.opacity = 0.5 + Math.sin(this.time * 3 + lantern.userData.index) * 0.3;
      }
    }

    // Leaves
    for (const leaf of this.leaves) {
      leaf.position.y -= delta * leaf.userData.speed;
      leaf.position.x += Math.sin(this.time * 2 + leaf.userData.sway) * delta * 0.8;
      leaf.rotation.z += delta * 0.5;
      if (leaf.position.y < leaf.userData.minY) {
        leaf.position.y = leaf.userData.maxY;
        leaf.position.x = (Math.random() - 0.5) * 55;
        leaf.position.z = (Math.random() - 0.5) * 55;
      }
    }

    // Apple tree bob timers
    for (const tree of this.appleTrees) {
      if (tree.userData.bobTimer > 0) {
        tree.userData.bobTimer -= delta;
        if (tree.userData.bobTimer <= 0) tree.userData.appleReady = true;
      }
    }
  }
}