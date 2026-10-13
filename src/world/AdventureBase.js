import * as THREE from 'three';

/**
 * Base class for all adventure maps.
 * Provides: collectible gems, score tracking, return portal, particle bursts,
 * mission system hooks.
 *
 * Performance rules (MUST follow):
 * - Max 1 atmospheric PointLight per map (plus return portal light = 2 total)
 * - Use emissive MeshBasicMaterial on small spheres for glows (NOT PointLights)
 * - All animations driven by shared `this.time`, updated once per frame
 * - Geometries: CylinderGeometry(…, 24), SphereGeometry(…, 12, 8) minimum
 */

const BURST_GEO = new THREE.SphereGeometry(0.06, 4, 3);
const BURST_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });

export class AdventureBase {
  /**
   * @param {THREE.Scene} scene
   * @param {object} cfg - ADVENTURE_MAPS entry
   * @param {string} cfg.id
   * @param {string} cfg.name
   * @param {number} cfg.color - hex colour for gems / portal
   * @param {THREE.Vector3} cfg.mapOffset
   * @param {number} [mapRadius=30] - ground radius (default 30, was 15)
   */
  constructor(scene, cfg, mapRadius = 30) {
    this.scene = scene;
    this.time = 0;
    this.groundY = 0;
    this.cfg = cfg;
    this.mapRadius = mapRadius;

    // ── Collectible system ──
    this.collectibles = [];
    this.collected = 0;
    this.total = 0;
    this.onCollectCallback = null; // called when a gem is picked up

    // ── Combo system (冷门玩法：连续收集倍率加成) ──
    this.combo = 0;
    this.comboTimer = 0;
    this.comboWindow = 2.5; // 2.5秒内继续收集保持连击
    this.maxComboMultiplier = 5;
    this.bestCombo = 0;
    this.comboScore = 0; // 连击累计的额外"分数"

    // ── Hidden achievements (彩蛋成就) ──
    this.achievements = new Map(); // id -> {id, name, desc, unlocked, secret}
    this._initDefaultAchievements();

    // ── Risk rooms (高风险高回报房间) ──
    this.riskRooms = []; // {id, position, radius, entered, rewardClaimed, penalty}

    // ── Particle burst pool ──
    this.bursts = [];

    // ── Floating text pool (连击/成就提示) ──
    this.floatingTexts = [];

    // ── Root group ──
    const o = cfg.mapOffset.clone();
    this.group = new THREE.Group();
    this.group.name = cfg.name;
    this.group.position.copy(o);
    scene.add(this.group);

    // ── Obstacle colliders (cylinder collision for adventure maps) ──
    this.obstacleColliders = []; // {position: Vector3 (local), radius: float}

    // ── Shared materials (subclasses can override) ──
    this.sharedMats = {
      gemGlow: new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.85 }),
      portalGlow: new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
      burst: BURST_MAT,
    };

    this.getGroundY = () => this.groundY;
  }

  /* ──────────────── Mission System Hooks ──────────────── */

  /**
   * Override in subclass to define missions.
   * @returns {{id:string, text:string}[]}
   */
  getMissions() { return []; }

  /**
   * Override in subclass to check mission progress.
   * @returns {Object<string, boolean>} map of missionId -> isComplete
   */
  checkMissionStatus() { return {}; }

  /**
   * Override in subclass to provide gameplay hints for this map.
   * @returns {string[]} array of hint strings shown below the mission list
   */
  getHints() { return []; }

  /* ──────────────── Obstacle Colliders ──────────────── */

  /** Register a cylinder obstacle in local space */
  addObstacleCollider(localPos, radius) {
    this.obstacleColliders.push({ position: localPos.clone(), radius });
  }

  /** Return world-space obstacle colliders for physics system */
  getObstacleColliders() {
    return this.obstacleColliders.map(c => ({
      position: c.position.clone().add(this.group.position),
      radius: c.radius,
    }));
  }

  /* ──────────────── Collectibles ──────────────── */

  /**
   * Spawn collectible gems at given positions.
   * @param {THREE.Vector3[]} positions
   * @param {number} [radius=0.22]
   */
  spawnGems(positions, radius = 0.22) {
    this.total += positions.length;
    const geo = new THREE.DodecahedronGeometry(radius, 0);
    positions.forEach((pos, i) => {
      const gem = new THREE.Mesh(geo, this.sharedMats.gemGlow.clone());
      gem.position.copy(pos);
      gem.userData = { collected: false, index: this.collectibles.length + i, baseY: pos.y };
      this.group.add(gem);
      this.collectibles.push(gem);
    });
  }

  /**
   * Call every frame from main.js. Checks proximity & auto-collects.
   * @param {THREE.Vector3} playerPos - world-space player position
   * @returns {boolean} true if at least one gem was collected this frame
   */
  checkCollect(playerPos) {
    let collectedAny = false;
    for (const gem of this.collectibles) {
      if (gem.userData.collected) continue;
      const worldPosition = gem.getWorldPosition(new THREE.Vector3());
      if (playerPos.distanceToSquared(worldPosition) < 2.25) {
        this.collectGem(gem, worldPosition);
        collectedAny = true;
      }
    }
    return collectedAny;
  }

  collectGem(gem, worldPosition = gem.getWorldPosition(new THREE.Vector3())) {
    if (gem.userData.collected) return false;
    gem.userData.collected = true;
    gem.visible = false;
    this.collected++;

    // Combo system
    this.combo++;
    this.comboTimer = this.comboWindow;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    const multiplier = Math.min(this.combo, this.maxComboMultiplier);
    this.comboScore += multiplier;

    // Floating combo text
    if (this.combo >= 2) {
      this.spawnFloatingText(
        gem.position.clone(),
        `${this.combo}x COMBO!`,
        this._comboColor(this.combo),
        0.9
      );
    }

    // Check combo achievements
    if (this.combo >= 5) this.unlockAchievement('combo5');
    if (this.combo >= 10) this.unlockAchievement('combo10');
    if (this.combo >= this.total * 0.8 && this.total > 10) this.unlockAchievement('flawless');

    this.spawnBurst(gem.position.clone());
    if (this.onCollectCallback) {
      this.onCollectCallback(worldPosition, this.collected, this.total);
    }
    return true;
  }

  _comboColor(combo) {
    if (combo >= 10) return 0xff3366;
    if (combo >= 7) return 0xff6600;
    if (combo >= 5) return 0xffcc00;
    if (combo >= 3) return 0x66ff66;
    return 0xffffff;
  }

  _initDefaultAchievements() {
    this.addAchievement('combo5', '连击新手', '达成 5 连击', false);
    this.addAchievement('combo10', '连击大师', '达成 10 连击', true);
    this.addAchievement('flawless', '完美收集', '一次连击收集 80% 以上宝石', true);
    this.addAchievement('speedrun', '疾风探索', '60秒内完成地图', true);
    this.addAchievement('explorer', '角落探险家', '到达地图边缘区域', false);
  }

  addAchievement(id, name, desc, secret = false) {
    if (!this.achievements.has(id)) {
      this.achievements.set(id, { id, name, desc, unlocked: false, secret });
    }
  }

  unlockAchievement(id) {
    const ach = this.achievements.get(id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      this.spawnFloatingText(
        new THREE.Vector3(0, 3, 0),
        `🏆 ${ach.name}`,
        0xffd700,
        2.0,
        true
      );
      return true;
    }
    return false;
  }

  getUnlockedAchievements() {
    return Array.from(this.achievements.values()).filter(a => a.unlocked);
  }

  getTotalAchievements() {
    return this.achievements.size;
  }

  /* ──────────────── Floating Text ──────────────── */

  spawnFloatingText(position, text, color = 0xffffff, life = 1.0, big = false) {
    // Create a canvas texture with text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = big ? 48 : 28;
    canvas.width = 256;
    canvas.height = 64;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 4;
    ctx.strokeText(text, 128, 32);
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(position);
    sprite.position.y += 0.5;
    sprite.scale.set(big ? 3 : 1.5, big ? 0.75 : 0.375, 1);
    sprite.userData = { life, age: 0, big };
    this.group.add(sprite);
    this.floatingTexts.push(sprite);
  }

  updateFloatingTexts(delta) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.userData.age += delta;
      if (t.userData.age >= t.userData.life) {
        t.material.map.dispose();
        t.material.dispose();
        t.removeFromParent();
        this.floatingTexts.splice(i, 1);
        continue;
      }
      const p = t.userData.age / t.userData.life;
      t.position.y += delta * 0.8;
      t.material.opacity = 1 - p;
    }
  }

  /* ──────────────── Risk Rooms ──────────────── */

  addRiskRoom(id, position, radius, penalty = 'slow') {
    const room = {
      id, position: position.clone(), radius,
      entered: false, rewardClaimed: false, penalty,
    };
    this.riskRooms.push(room);
    return room;
  }

  checkRiskRooms(playerPos) {
    const results = [];
    for (const room of this.riskRooms) {
      const dist = playerPos.distanceTo(room.position.clone().add(this.group.position));
      if (dist < room.radius && !room.entered) {
        room.entered = true;
        results.push({ id: room.id, action: 'enter', penalty: room.penalty });
      }
    }
    return results;
  }

  getProgress() {
    return { collected: this.collected, total: this.total };
  }

  isComplete() {
    return this.total > 0 && this.collected >= this.total;
  }

  /* ──────────────── Particle Burst ──────────────── */

  spawnBurst(origin) {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(BURST_GEO, BURST_MAT.clone());
      p.position.copy(origin);
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5,
        (Math.random() - 0.5) * 2
      ).normalize();
      const speed = 0.8 + Math.random() * 1.2;
      p.userData = { dir, speed, life: 0.55 + Math.random() * 0.3, age: 0 };
      this.group.add(p);
      this.bursts.push(p);
    }
  }

  updateBursts(delta) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const p = this.bursts[i];
      p.userData.age += delta;
      if (p.userData.age >= p.userData.life) {
        p.removeFromParent();
        this.bursts.splice(i, 1);
        continue;
      }
      const t = p.userData.age / p.userData.life;
      p.position.addScaledVector(p.userData.dir, p.userData.speed * delta);
      p.userData.dir.y += delta * 0.6;
      p.material.opacity = 0.9 * (1 - t);
      p.scale.setScalar(1 - t * 0.6);
    }
  }

  /* ──────────────── Return Portal ──────────────── */

  addReturnPortal(cfg, position = new THREE.Vector3(0, 0, 0)) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.15, 8, 16),
      this.sharedMats.portalGlow
    );
    ring.position.y = 1.4;
    ring.rotation.y = Math.PI / 2;

    const light = new THREE.PointLight(cfg.color, 2.4, 9, 1.8);
    light.position.y = 1.4;

    this.returnPortal = new THREE.Group();
    this.returnPortal.add(ring);
    this.returnPortal.add(light);
    this.returnPortal.name = `ReturnPortal_${cfg.id}`;
    this.returnPortal.position.copy(position);
    this.group.add(this.returnPortal);
    this.returnRing = ring;
  }

  getReturnPosition() {
    const pos = new THREE.Vector3();
    this.returnPortal.getWorldPosition(pos);
    return pos;
  }

  isNearReturnPortal(position) {
    return position.distanceToSquared(this.getReturnPosition()) < 7.5;
  }

  /* ──────────────── Frame Update ──────────────── */

  /** Subclasses MUST call super.update(delta) */
  update(delta) {
    this.time += delta;

    // Combo timer decay
    if (this.combo > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    for (const gem of this.collectibles) {
      if (gem.userData.collected) continue;
      gem.rotation.y += delta * 2.2;
      gem.position.y = gem.userData.baseY + Math.sin(this.time * 3 + gem.userData.index) * 0.12;
    }

    this.updateBursts(delta);
    this.updateFloatingTexts(delta);

    if (this.returnRing) {
      this.returnRing.rotation.z = this.time * 0.8;
      this.returnRing.scale.setScalar(1 + Math.sin(this.time * 2) * 0.04);
    }
  }
}