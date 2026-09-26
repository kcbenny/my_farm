import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';

const GEO = { sphere12: new THREE.SphereGeometry(1, 12, 8), cone12: new THREE.ConeGeometry(1, 1, 12) };

const MAT = {
  snow: new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.65 }),
  ice: new THREE.MeshStandardMaterial({ color: 0xbbe4ff, roughness: 0.1, metalness: 0.25 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.85 }),
  flake: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }),
  carrot: new THREE.MeshStandardMaterial({ color: 0xff8844, roughness: 0.5 }),
};

export class SnowyMountain extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg);
    this.snowflakes = [];
    this.build();
  }

  build() {
    // Snow ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(15, 15.5, 0.5, 32), MAT.snow);
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Central mountain peak
    const peak = new THREE.Mesh(new THREE.ConeGeometry(6, 8, 16), MAT.snow);
    peak.position.y = 4;
    peak.castShadow = true;
    peak.receiveShadow = true;
    this.group.add(peak);

    // Rotating ice ring
    const iceRing = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.35, 8, 32), MAT.ice);
    iceRing.rotation.x = Math.PI / 2;
    iceRing.position.y = 1.8;
    this.group.add(iceRing);
    this.iceRing = iceRing;

    // Ice crystal spires
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = 7.5 + (i % 3) * 1.2;
      for (let j = 0; j < 3; j++) {
        const crystal = new THREE.Mesh(GEO.cone12, MAT.ice);
        crystal.scale.set(0.15 + j * 0.08, 3.5 + j * 1.5, 0.15 + j * 0.08);
        crystal.position.set(Math.sin(a) * r + (j - 1) * 0.6, 1.8 + j * 0.6, Math.cos(a) * r);
        crystal.rotation.z = 0.1 * j;
        crystal.castShadow = true;
        this.group.add(crystal);
      }
    }

    // Snowman
    const sm = new THREE.Group();
    for (const [y, r] of [[0.35, 0.5], [0.9, 0.38], [1.35, 0.25]]) {
      const ball = new THREE.Mesh(GEO.sphere12, MAT.snow);
      ball.scale.setScalar(r);
      ball.position.y = y;
      sm.add(ball);
    }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), MAT.carrot);
    nose.position.set(0, 1.35, 0.22);
    nose.rotation.x = -Math.PI / 2;
    sm.add(nose);
    sm.position.set(4, 0, 5);
    this.group.add(sm);

    // Snow mounds
    for (let i = 0; i < 15; i++) {
      const mound = new THREE.Mesh(GEO.sphere12, MAT.snow);
      mound.scale.set(0.4 + Math.random() * 0.8, 0.3 + Math.random() * 0.3, 0.4 + Math.random() * 0.8);
      mound.position.set((Math.random() - 0.5) * 22, 0.1, (Math.random() - 0.5) * 22);
      this.group.add(mound);
    }

    // Falling snow (reduced: 25 particles, NOT 60)
    const flakeGeo = new THREE.SphereGeometry(0.06, 3, 2);
    for (let i = 0; i < 25; i++) {
      const f = new THREE.Mesh(flakeGeo, MAT.flake.clone());
      f.position.set((Math.random() - 0.5) * 28, Math.random() * 12, (Math.random() - 0.5) * 28);
      this.group.add(f);
      this.snowflakes.push({ mesh: f, baseX: f.position.x, baseZ: f.position.z, speed: 0.4 + Math.random() * 1.5, maxY: 9, minY: -0.5 });
    }

    // ONLY ambient light
    const amb = new THREE.PointLight(0xaaccff, 2, 16, 2);
    amb.position.y = 5;
    this.group.add(amb);

    // Collectibles: ice crystals on the mountain
    const iceGems = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 2 + Math.random() * 11;
      iceGems.push(new THREE.Vector3(Math.sin(a) * r, 0.5 + Math.random() * 2, Math.cos(a) * r));
    }
    this.spawnGems(iceGems, 0.2);

    this.addReturnPortal(cfg, new THREE.Vector3(-5, 0, 7));
  }

  update(delta) {
    super.update(delta);
    if (this.iceRing) this.iceRing.rotation.z += delta * 0.3;

    for (const f of this.snowflakes) {
      f.mesh.position.y -= delta * f.speed;
      if (f.mesh.position.y < f.minY) {
        f.mesh.position.y = f.maxY;
        f.mesh.position.x = f.baseX + (Math.random() - 0.5) * 2;
        f.mesh.position.z = f.baseZ + (Math.random() - 0.5) * 2;
      }
    }
  }
}