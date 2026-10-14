import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';
import { StylizedWater } from './StylizedWater.js';

const GEO = { sphere12: new THREE.SphereGeometry(1, 12, 8), cone12: new THREE.ConeGeometry(1, 1, 12) };

const MAT = {
  grass: new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.85 }),
  water: new THREE.MeshStandardMaterial({ color: 0x356e68, roughness: 0.9, flatShading: true }),
  wood: new THREE.MeshStandardMaterial({ color: 0x704629, roughness: 0.85 }),
  lily: new THREE.MeshStandardMaterial({ color: 0x3d8a4a, roughness: 0.7, side: THREE.DoubleSide }),
  lilyFlower: (h) => new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(h, 0.7, 0.6) }),
  willow: new THREE.MeshStandardMaterial({ color: 0x5c8a3f, roughness: 0.8, side: THREE.DoubleSide }),
  pearl: new THREE.MeshStandardMaterial({ color: 0xfff8f0, roughness: 0.1, metalness: 0.3 }),
  pearlGlow: new THREE.MeshBasicMaterial({ color: 0xfff0dd, transparent: true, opacity: 0.5 }),
  frog: new THREE.MeshStandardMaterial({ color: 0x33cc55, roughness: 0.4 }),
  vortex: new THREE.MeshBasicMaterial({ color: 0x3388cc, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  heron: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
  fish: (h) => new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(h, 0.8, 0.5), roughness: 0.4 }),
};

export class MysticLake extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg, 32);
    this.fish = [];
    this.fireflies = [];
    this.lilyPads = [];
    this.frogs = [];
    this.vortices = [];
    this.boatActive = false;
    this.boatPosition = new THREE.Vector3(0, 0.25, 9);
    this.boatAngle = 0;
    this.boatSpeed = 0;
    this._boatSailedDistance = 0;
    this._boatSailed = false;
    this.fishCaught = 0;
    this.isFishing = false;
    this.fishTimer = 0;
    this.fishBiting = false;
    this.fishBiteWindow = 0;
    this.fishBiteTaps = 0;
    this.underwaterActive = false;
    this._underwaterDone = false;
    this._vorticesEntered = 0;

    this.build();
    this._setupMissions();
  }

  _setupMissions() {
    this._missions = [
      { id: 'gems', text: '收集 14 顆湖中珍珠 (0/14)' },
      { id: 'lilies', text: '在蓮葉間跳躍並與 5 隻發光青蛙互動 (0/5)' },
      { id: 'sail', text: '乘坐小船航行湖面一圈' },
      { id: 'underwater', text: '潛入水下洞穴獲取夜明珠' },
      { id: 'fishing', text: '釣起 3 條魚 (0/3)' },
    ];
  }
  getMissions() { return this._missions; }
  getHints() {
    return [
      '🏃 走近珍珠即可自動收集',
      '🐸 在蓮葉間跳躍，靠近發光青蛙按 [E] 互動',
      '🚶 走到碼頭旁的小船按 [E] 上船，WASD 航行',
      '🌊 找到 3 個漩渦並踩入，解鎖水下洞穴',
      '🎣 在碼頭按 [E] 拋竿，魚上鉤時快速連按 [E] 拉起',
      '🔮 找到傳送門按 [E] 即可返回農場',
    ];
  }
  checkMissionStatus() {
    return {
      gems: this.collected >= 14,
      lilies: this.frogs.filter(f => f.userData.activated).length >= 5,
      sail: this._boatSailed,
      underwater: this._underwaterDone,
      fishing: this.fishCaught >= 3,
    };
  }

  build() {
    const R = this.mapRadius;

    // Ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.5, 0.5, 48), MAT.grass);
    ground.position.y = -0.25; ground.receiveShadow = true;
    this.group.add(ground);

    // ── Lake (radius 16) ──
    const lake = new THREE.Mesh(new THREE.CylinderGeometry(16, 15.5, 0.25, 48, 1, true), MAT.water);
    lake.position.y = 0.05; lake.receiveShadow = true;
    this.group.add(lake);
    this.waterSurface = new StylizedWater(new THREE.CircleGeometry(16, 48), { scale: 7, resolution: 512 });
    this.waterSurface.position.y = 0.175;
    this.group.add(this.waterSurface);

    // ── Lily pads ──
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + Math.random() * 0.3;
      const r = 3 + (i % 5) * 2.6;
      const lily = new THREE.Mesh(new THREE.CircleGeometry(0.45 + Math.random() * 0.2, 12), MAT.lily);
      lily.rotation.x = -Math.PI / 2;
      lily.position.set(Math.sin(a) * r, 0.18, Math.cos(a) * r);
      this.group.add(lily);
      this.lilyPads.push({ mesh: lily, pos: new THREE.Vector3(Math.sin(a) * r, 0.18, Math.cos(a) * r) });
      if (Math.random() > 0.25) {
        const flower = new THREE.Mesh(GEO.cone12, MAT.lilyFlower(Math.random()));
        flower.scale.setScalar(0.14);
        flower.position.set(Math.sin(a) * r, 0.34, Math.cos(a) * r);
        this.group.add(flower);
      }
    }

    // ── Glowing frogs on lily pads ──
    const frogPadIndices = [2, 5, 8, 11, 14, 16, 17];
    for (let i = 0; i < 7; i++) {
      const pad = this.lilyPads[frogPadIndices[i] % this.lilyPads.length];
      const frog = new THREE.Group();
      const body = new THREE.Mesh(GEO.sphere12, MAT.frog);
      body.scale.set(0.2, 0.15, 0.2); frog.add(body);
      const glow = new THREE.Mesh(GEO.sphere12,
        new THREE.MeshBasicMaterial({ color: 0x88ff44, transparent: true, opacity: 0.5 }));
      glow.scale.setScalar(0.15); glow.position.y = 0.1; frog.add(glow);
      frog.position.copy(pad.pos.clone().add(new THREE.Vector3(0, 0.25, 0)));
      frog.userData = { activated: false, glow };
      this.group.add(frog);
      this.frogs.push(frog);
    }

    // ── Fish ──
    for (let i = 0; i < 8; i++) {
      const fish = new THREE.Group();
      const body = new THREE.Mesh(GEO.sphere12, MAT.fish(i / 8));
      body.scale.set(1.5, 0.4, 0.7); fish.add(body);
      const tail = new THREE.Mesh(GEO.cone12, body.material);
      tail.scale.setScalar(0.2); tail.rotation.z = Math.PI / 2; tail.position.x = -0.25;
      fish.add(tail);
      fish.position.y = 0.22;
      this.group.add(fish);
      this.fish.push({ mesh: fish, radius: 2.5 + i * 1.4, phase: i * 1.0, speed: 0.3 + i * 0.04 });
    }

    // ── Willow trees (12) ──
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 28;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 4, 12), MAT.wood);
      trunk.position.set(Math.sin(a) * r, 2, Math.cos(a) * r); trunk.castShadow = true;
      this.group.add(trunk);
      const crown = new THREE.Mesh(GEO.sphere12, MAT.willow);
      crown.scale.set(2.5, 1.5, 2.5);
      crown.position.set(Math.sin(a) * r, 4, Math.cos(a) * r);
      this.group.add(crown);
    }

    // ── Floating islands ──
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const r = 10;
      const island = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.4, 12), MAT.grass);
      island.position.set(Math.sin(a) * r, 0.2, Math.cos(a) * r);
      island.castShadow = true;
      this.group.add(island);
      // Bridge planks
      for (let b = 0; b < 3; b++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.4), MAT.wood);
        const t = (b + 1) / 4;
        plank.position.set(
          Math.sin(a) * r * (1 - t), 0.25,
          Math.cos(a) * r * (1 - t)
        );
        plank.rotation.y = -a;
        this.group.add(plank);
      }
    }

    // ── Vortices (underwater cave entrances) - 3 total, need all 3 to unlock underwater ──
    const vortexPositions = [
      { x: 8, z: 2 },
      { x: -5, z: 7 },
      { x: 2, z: -9 },
    ];
    vortexPositions.forEach((vp, v) => {
      const vortex = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.2, 16), MAT.vortex);
      ring.rotation.x = -Math.PI / 2;
      vortex.add(ring);
      // Glow center
      const center = new THREE.Mesh(GEO.sphere12,
        new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.4 }));
      center.scale.setScalar(0.3);
      center.position.y = 0.1;
      vortex.add(center);
      vortex.position.set(vp.x, 0.16, vp.z);
      vortex.userData = { entered: false, pos: new THREE.Vector3(vp.x, 0, vp.z), index: v };
      this.group.add(vortex);
      this.vortices.push(vortex);
    });

    // ── Dock + Boat (boat properly placed in water) ──
    const dock = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.5), MAT.wood);
      plank.position.set(0, 0.22, -i * 0.5); dock.add(plank);
    }
    dock.position.set(0, 0, 15.5); this.group.add(dock);

    // Boat - placed in water (z=13, inside lake radius 16)
    this.boatGroup = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 2.2), MAT.wood);
    hull.position.y = 0.12; this.boatGroup.add(hull);
    const bow = new THREE.Mesh(GEO.cone12, MAT.wood);
    bow.scale.set(0.6, 0.5, 0.8); bow.rotation.x = Math.PI / 2; bow.position.z = 1.3; bow.position.y = 0.1;
    this.boatGroup.add(bow);
    // Sail
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2),
      new THREE.MeshBasicMaterial({ color: 0xf0e6d2, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    sail.position.set(0, 0.9, 0);
    this.boatGroup.add(sail);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), MAT.wood);
    mast.position.set(0, 0.85, 0);
    this.boatGroup.add(mast);
    this.boatGroup.position.set(0, 0.2, 13); // properly in the water
    this.boatGroup.visible = true;
    this.group.add(this.boatGroup);

    // ── Herons ──
    for (let h = 0; h < 2; h++) {
      const heron = new THREE.Group();
      const hBody = new THREE.Mesh(GEO.sphere12, MAT.heron);
      hBody.scale.set(0.3, 0.4, 0.2); heron.add(hBody);
      const hNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1, 6), MAT.heron);
      hNeck.position.y = 0.5; heron.add(hNeck);
      const hHead = new THREE.Mesh(GEO.sphere12, MAT.heron);
      hHead.scale.setScalar(0.12); hHead.position.y = 1.05; heron.add(hHead);
      heron.position.set(h === 0 ? -15 : 14, 0.3, h === 0 ? 8 : -6);
      this.group.add(heron);
    }

    // ── Fireflies (clamped to map edge) ──
    const ffGeo = new THREE.SphereGeometry(0.07, 4, 3);
    const ffMat = new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.7 });
    for (let i = 0; i < 25; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 18 + Math.random() * 10;
      const ff = new THREE.Mesh(ffGeo, ffMat.clone());
      ff.position.set(Math.sin(a) * r, 0.3 + Math.random() * 3, Math.cos(a) * r);
      this.group.add(ff);
      this.fireflies.push({ mesh: ff, baseX: ff.position.x, baseZ: ff.position.z, baseY: ff.position.y, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.5 });
    }

    // ── Ambient ──
    const amb = new THREE.PointLight(0x88ccdd, 2, 22, 2);
    amb.position.y = 5; this.group.add(amb);

    // ── Pearl collectibles (replace default gems) ──
    const pearlPositions = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 2 + Math.random() * 26;
      pearlPositions.push(new THREE.Vector3(Math.sin(a) * r, 0.35, Math.cos(a) * r));
    }
    this._spawnPearls(pearlPositions);

    this.addReturnPortal(this.cfg, new THREE.Vector3(8, 0, -8));

    // ── Colliders ──
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.addObstacleCollider(new THREE.Vector3(Math.sin(a) * 28, 0, Math.cos(a) * 28), 0.9);
    }
    this.addObstacleCollider(new THREE.Vector3(0, 0, 14.5), 1.0);
    this.addObstacleCollider(new THREE.Vector3(0, 0, 16.5), 1.0);
  }

  _spawnPearls(positions) {
    this.total += positions.length;
    positions.forEach((pos, i) => {
      const pearl = new THREE.Group();
      // Main pearl sphere
      const body = new THREE.Mesh(GEO.sphere12, MAT.pearl.clone());
      body.scale.setScalar(0.2);
      pearl.add(body);
      // Outer glow halo
      const glow = new THREE.Mesh(GEO.sphere12, MAT.pearlGlow.clone());
      glow.scale.setScalar(0.35);
      pearl.add(glow);
      // Iridescent sheen (smaller bright spot)
      const sheen = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
      sheen.position.set(0.06, 0.06, 0.12);
      pearl.add(sheen);

      pearl.position.copy(pos);
      pearl.userData = {
        collected: false,
        index: this.collectibles.length + i,
        baseY: pos.y,
        isPearl: true,
        floatPhase: Math.random() * Math.PI * 2,
      };
      this.group.add(pearl);
      this.collectibles.push(pearl);
    });
  }

  checkFrogInteraction(playerPos) {
    for (const frog of this.frogs) {
      if (frog.userData.activated) continue;
      const wp = new THREE.Vector3(); frog.getWorldPosition(wp);
      if (playerPos.distanceToSquared(wp) < 2.25) {
        frog.userData.activated = true;
        frog.userData.glow.material = new THREE.MeshBasicMaterial({ color: 0xffdd00, transparent: true, opacity: 0.8 });
        this.spawnBurst(wp.clone().sub(this.group.position));
        return true;
      }
    }
    return false;
  }

  checkVortexEntry(playerPos) {
    for (const v of this.vortices) {
      if (v.userData.entered) continue;
      const wp = v.userData.pos.clone();
      if (new THREE.Vector2(playerPos.x, playerPos.z).distanceTo(new THREE.Vector2(wp.x, wp.z)) < 2) {
        v.userData.entered = true;
        this._vorticesEntered++;
        // Visual feedback: vortex stops spinning and brightens
        v.children[0].material.opacity = 0.8;
        v.children[1].material.opacity = 0.7;
        this.spawnBurst(wp.clone().add(new THREE.Vector3(0, 0.5, 0)));

        // Only complete underwater mission when ALL 3 vortices are found
        if (this._vorticesEntered >= 3) {
          this._underwaterDone = true;
          // Spawn night pearl reward at center of lake
          const gems = [];
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            gems.push(new THREE.Vector3(Math.sin(a) * 2, 0.5, Math.cos(a) * 2));
          }
          this._spawnPearls(gems);
          this.spawnBurst(new THREE.Vector3(0, 1.5, 0));
        }
        return true;
      }
    }
    return false;
  }

  startFishing() {
    if (this.isFishing) return null;
    this.isFishing = true;
    this.fishTimer = 3 + Math.random() * 5; // wait time before bite
    this.fishBiting = false;
    this.fishBiteWindow = 0;
    this.fishBiteTaps = 0;
    return { started: true };
  }

  // Called when player presses E during fishing
  tryReelIn() {
    if (!this.isFishing) return false;
    if (this.fishBiting && this.fishBiteWindow > 0) {
      // Good - player is reeling in during bite window
      this.fishBiteTaps++;
      if (this.fishBiteTaps >= 5) {
        // Caught the fish!
        this.isFishing = false;
        this.fishCaught++;
        this.fishBiting = false;
        return { caught: true };
      }
      return { tapping: true, taps: this.fishBiteTaps };
    }
    return false;
  }

  updateFishing(delta) {
    if (!this.isFishing) return null;
    if (!this.fishBiting) {
      // Waiting for bite
      this.fishTimer -= delta;
      if (this.fishTimer <= 0) {
        // Fish is biting! Player has a window to reel in
        this.fishBiting = true;
        this.fishBiteWindow = 2.5; // 2.5 second window to tap E
        return { bite: true };
      }
    } else {
      // Bite window active
      this.fishBiteWindow -= delta;
      if (this.fishBiteWindow <= 0) {
        // Fish got away - player didn't tap enough
        this.isFishing = false;
        this.fishBiting = false;
        return { gotAway: true };
      }
    }
    return null;
  }

  boardBoat(playerPos) {
    const wp = new THREE.Vector3(); this.boatGroup.getWorldPosition(wp);
    if (playerPos.distanceToSquared(wp) < 9 && !this.boatActive) {
      this.boatActive = true;
      this._boatSailedDistance = 0;
      return true;
    }
    return false;
  }

  exitBoat() {
    this.boatActive = false;
    // Only count as "sailed around lake" if player sailed enough distance
    if (this._boatSailedDistance > 60) {
      this._boatSailed = true;
    }
  }

  updateBoat(delta, input) {
    if (!this.boatActive) return;
    // Simple boat movement
    const speed = 5;
    const turnSpeed = 1.5;
    if (input.forward) this.boatSpeed = Math.min(this.boatSpeed + delta * 3, speed);
    else if (input.backward) this.boatSpeed = Math.max(this.boatSpeed - delta * 3, -speed * 0.5);
    else this.boatSpeed *= 0.95; // friction

    if (input.left) this.boatAngle += turnSpeed * delta * (this.boatSpeed >= 0 ? 1 : -1);
    if (input.right) this.boatAngle -= turnSpeed * delta * (this.boatSpeed >= 0 ? 1 : -1);

    const moveX = Math.sin(this.boatAngle) * this.boatSpeed * delta;
    const moveZ = Math.cos(this.boatAngle) * this.boatSpeed * delta;

    // Keep boat within lake bounds (radius 15)
    const newX = this.boatPosition.x + moveX;
    const newZ = this.boatPosition.z + moveZ;
    const dist = Math.sqrt(newX * newX + newZ * newZ);
    if (dist < 15) {
      const moved = Math.sqrt(moveX * moveX + moveZ * moveZ);
      this._boatSailedDistance += moved;
      this.boatPosition.x = newX;
      this.boatPosition.z = newZ;
    } else {
      this.boatSpeed *= 0.5;
    }

    this.boatGroup.position.copy(this.boatPosition);
    this.boatGroup.rotation.y = this.boatAngle;
  }

  update(delta) {
    super.update(delta);
    for (const f of this.fish) {
      const angle = this.time * f.speed + f.phase;
      f.mesh.position.x = Math.sin(angle) * f.radius;
      f.mesh.position.z = Math.cos(angle) * f.radius;
      f.mesh.rotation.y = -angle;
    }
    for (const ff of this.fireflies) {
      ff.mesh.position.x = ff.baseX + Math.sin(this.time * ff.speed + ff.phase) * 2;
      ff.mesh.position.z = ff.baseZ + Math.cos(this.time * ff.speed * 0.8 + ff.phase) * 1.5;
      ff.mesh.position.y = ff.baseY + Math.sin(this.time * 2 + ff.phase) * 0.6;
      ff.mesh.material.opacity = 0.3 + Math.sin(this.time * 3 + ff.phase) * 0.35;
    }
    // Vortex rotation
    for (const v of this.vortices) {
      if (!v.userData.entered) {
        v.rotation.z += delta * 1.2;
        // Pulse glow
        const pulse = 0.5 + Math.sin(this.time * 2 + v.userData.index) * 0.2;
        v.children[1].scale.setScalar(0.3 + pulse * 0.15);
      }
    }

    // Animate pearls (gentle float and rotation)
    for (const gem of this.collectibles) {
      if (!gem.userData.isPearl || gem.userData.collected) continue;
      gem.position.y = gem.userData.baseY + Math.sin(this.time * 1.0 + gem.userData.floatPhase) * 0.1;
      gem.rotation.y += delta * 0.3;
      // Pulse glow
      if (gem.children[1]) {
        gem.children[1].material.opacity = 0.35 + Math.sin(this.time * 2 + gem.userData.floatPhase) * 0.15;
      }
    }
  }
}
