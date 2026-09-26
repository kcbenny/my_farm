import * as THREE from 'three';

/**
 * Base class for all adventure maps.
 * Provides: collectible gems, score tracking, return portal, particle bursts.
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
   */
  constructor(scene, cfg) {
    this.scene = scene;
    this.time = 0;
    this.groundY = 0;
    this.cfg = cfg;

    // ── Collectible system ──
    this.collectibles = [];
    this.collected = 0;
    this.total = 0;
    this.onCollectCallback = null; // called when a gem is picked up

    // ── Particle burst pool ──
    this.bursts = [];

    // ── Root group ──
    const o = cfg.mapOffset.clone();
    this.group = new THREE.Group();
    this.group.name = cfg.name;
    this.group.position.copy(o);
    scene.add(this.group);

    // ── Shared materials (subclasses can override) ──
    this.sharedMats = {
      gemGlow: new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.85 }),
      portalGlow: new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
      burst: BURST_MAT,
    };

    this.getGroundY = () => this.groundY;
  }

  /* ──────────────── Collectibles ──────────────── */

  /**
   * Spawn collectible gems at given positions.
   * @param {THREE.Vector3[]} positions
   * @param {number} [radius=0.22]
   */
  spawnGems(positions, radius = 0.22) {
    this.total = positions.length;
    const geo = new THREE.DodecahedronGeometry(radius, 0);
    positions.forEach((pos, i) => {
      const gem = new THREE.Mesh(geo, this.sharedMats.gemGlow.clone());
      gem.position.copy(pos);
      gem.userData = { collected: false, index: i, baseY: pos.y };
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
      if (playerPos.distanceToSquared(gem.position) < 2.25) {
        // radius = 1.5
        gem.userData.collected = true;
        gem.visible = false;
        this.collected++;
        this.spawnBurst(gem.position.clone());
        if (this.onCollectCallback) {
          this.onCollectCallback(gem.position.clone(), this.collected, this.total);
        }
        collectedAny = true;
      }
    }
    return collectedAny;
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
      p.userData.dir.y += delta * 0.6; // gravity
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

    // Spin & bob collectible gems
    for (const gem of this.collectibles) {
      if (gem.userData.collected) continue;
      gem.rotation.y += delta * 2.2;
      gem.position.y = gem.userData.baseY + Math.sin(this.time * 3 + gem.userData.index) * 0.12;
    }

    // Particle bursts
    this.updateBursts(delta);

    // Return portal spin
    if (this.returnRing) {
      this.returnRing.rotation.z = this.time * 0.8;
      this.returnRing.scale.setScalar(1 + Math.sin(this.time * 2) * 0.04);
    }
  }
}