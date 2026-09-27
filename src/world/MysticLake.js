import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';

const GEO = { sphere12: new THREE.SphereGeometry(1, 12, 8), cone12: new THREE.ConeGeometry(1, 1, 12) };

const MAT = {
  grass: new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.85 }),
  water: new THREE.MeshStandardMaterial({ color: 0x0b6f78, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.82 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x704629, roughness: 0.85 }),
  lily: new THREE.MeshStandardMaterial({ color: 0x3d8a4a, roughness: 0.7, side: THREE.DoubleSide }),
  lilyFlower: (h) => new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(h, 0.7, 0.6) }),
  willow: new THREE.MeshStandardMaterial({ color: 0x5c8a3f, roughness: 0.8, side: THREE.DoubleSide }),
  pearl: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }),
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
    this.fishCaught = 0;
    this.isFishing = false;
    this.fishTimer = 0;
    this.underwaterActive = false;

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
      '🏃 走過湖中珍珠即可自動收集',
      '🐸 在蓮葉間跳躍，靠近發光青蛙互動',
      '🚣 走到碼頭旁的小船自動上船，WASD 航行',
      '🌊 踩入漩渦會被傳送到水下洞穴',
      '🎣 在碼頭按 [E] 拋竿，魚上鉤時快速連按 [E] 拉起',
      '🔮 找到傳送門按 [E] 即可返回農場',
    ];
  }
  checkMissionStatus() {
    return {
      gems: this.collected >= 14,
      lilies: this.frogs.filter(f => f.activated).length >= 5,
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
    const lake = new THREE.Mesh(new THREE.CylinderGeometry(16, 15.5, 0.25, 48), MAT.water);
    lake.position.y = 0.05; lake.receiveShadow = true;
    this.group.add(lake);

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
    for (let i = 0; i < 7; i++) {
      const pad = this.lilyPads[Math.floor(Math.random() * this.lilyPads.length)];
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
      const r = 26;
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

    // ── Vortices (underwater cave entrances) ──
    for (let v = 0; v < 3; v++) {
      const va = (v / 3) * Math.PI * 2;
      const vr = 8;
      const vortex = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.2, 16), MAT.vortex);
      vortex.rotation.x = -Math.PI / 2;
      vortex.position.set(Math.sin(va) * vr, 0.16, Math.cos(va) * vr);
      vortex.userData = { entered: false, pos: new THREE.Vector3(Math.sin(va) * vr, 0, Math.cos(va) * vr) };
      this.group.add(vortex);
      this.vortices.push(vortex);
    }

    // ── Dock + Boat ──
    const dock = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.5), MAT.wood);
      plank.position.set(0, 0.22, -i * 0.5); dock.add(plank);
    }
    dock.position.set(0, 0, 15.5); this.group.add(dock);

    // Boat
    this.boatGroup = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 2.2), MAT.wood);
    hull.position.y = 0.12; this.boatGroup.add(hull);
    const bow = new THREE.Mesh(GEO.cone12, MAT.wood);
    bow.scale.set(0.6, 0.5, 0.8); bow.rotation.x = Math.PI / 2; bow.position.z = 1.3; bow.position.y = 0.1;
    this.boatGroup.add(bow);
    this.boatGroup.position.set(0, 0.2, 15);
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

    // ── Fireflies ──
    const ffGeo = new THREE.SphereGeometry(0.07, 4, 3);
    const ffMat = new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.7 });
    for (let i = 0; i < 25; i++) {
      const ff = new THREE.Mesh(ffGeo, ffMat.clone());
      ff.position.set((Math.random() - 0.5) * 50, 0.3 + Math.random() * 3, (Math.random() - 0.5) * 50);
      this.group.add(ff);
      this.fireflies.push({ mesh: ff, baseX: ff.position.x, baseZ: ff.position.z, baseY: ff.position.y, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.5 });
    }

    // ── Ambient ──
    const amb = new THREE.PointLight(0x88ccdd, 2, 22, 2);
    amb.position.y = 5; this.group.add(amb);

    // ── Gems (pearls) ──
    const pearls = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 2 + Math.random() * 26;
      pearls.push(new THREE.Vector3(Math.sin(a) * r, 0.35, Math.cos(a) * r));
    }
    this.spawnGems(pearls, 0.18);

    this.addReturnPortal(this.cfg, new THREE.Vector3(8, 0, -8));

    // ── Colliders ──
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.addObstacleCollider(new THREE.Vector3(Math.sin(a) * 26, 0, Math.cos(a) * 26), 0.9);
    }
    this.addObstacleCollider(new THREE.Vector3(0, 0, 14.5), 1.0);
    this.addObstacleCollider(new THREE.Vector3(0, 0, 16.5), 1.0);
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
        this._underwaterDone = true;
        // Spawn night pearls
        const gems = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          gems.push(new THREE.Vector3(wp.x + Math.sin(a) * 3, 0.4, wp.z + Math.cos(a) * 3));
        }
        this.spawnGems(gems, 0.24);
        return true;
      }
    }
    return false;
  }

  startFishing() {
    if (this.isFishing) return null;
    this.isFishing = true;
    this.fishTimer = 3 + Math.random() * 5;
    return { started: true };
  }

  checkFishCatch() {
    if (!this.isFishing) return false;
    this.fishTimer -= 0.016;
    if (this.fishTimer <= 0) {
      this.isFishing = false;
      this.fishCaught++;
      return true;
    }
    return false;
  }

  boardBoat(playerPos) {
    const wp = new THREE.Vector3(); this.boatGroup.getWorldPosition(wp);
    if (playerPos.distanceToSquared(wp) < 6.25 && !this.boatActive) {
      this.boatActive = true;
      return true;
    }
    return false;
  }

  exitBoat() {
    this.boatActive = false;
    this._boatSailed = true;
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
      if (!v.userData.entered) v.rotation.z += delta * 1.2;
    }
  }
}