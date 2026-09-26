import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';

const GEO = { sphere12: new THREE.SphereGeometry(1, 12, 8) };

const MAT = {
  grass: new THREE.MeshStandardMaterial({ color: 0x1a2e4a, roughness: 0.85 }),
  moon: new THREE.MeshBasicMaterial({ color: 0xfffde7 }),
  star: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  constellation: new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.65 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.8 }),
};

export class StarryMeadow extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg);
    this.stars = [];
    this.fireflies = [];
    this.shootingStars = [];
    this.constellationStones = [];
    this.build();
  }

  build() {
    // Dark grass ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(15, 15.5, 0.5, 32), MAT.grass);
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Giant moon
    const moonGroup = new THREE.Group();
    const moon = new THREE.Mesh(new THREE.SphereGeometry(2.5, 20, 16), MAT.moon);
    moonGroup.add(moon);
    const moonGlow = new THREE.PointLight(0xfffde7, 2.5, 18, 2);
    moonGlow.position.y = 0.5;
    moonGroup.add(moonGlow);
    moonGroup.position.set(6, 8, 0);
    this.group.add(moonGroup);
    this.moonGlow = moonGlow;

    // Constellation stones
    const pts = [[-3, -4], [0, -6], [3, -4], [-2, 0], [2, 0], [-4, 4], [0, 2], [4, 4]];
    pts.forEach(([cx, cz]) => {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.5, 12), MAT.stone);
      stone.position.set(cx, 0.2, cz);
      stone.receiveShadow = true;
      this.group.add(stone);
      const glow = new THREE.Mesh(GEO.sphere12, MAT.constellation.clone());
      glow.scale.setScalar(0.18);
      glow.position.set(cx, 0.55, cz);
      this.group.add(glow);
      this.constellationStones.push({ glow, index: this.constellationStones.length });
    });

    // Background stars (80 reduced to 40, emissive spheres)
    const starGeo = new THREE.SphereGeometry(0.06, 3, 2);
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Mesh(starGeo, MAT.star.clone());
      s.position.set((Math.random() - 0.5) * 30, 3 + Math.random() * 8, (Math.random() - 0.5) * 30);
      this.group.add(s);
      this.stars.push({ mesh: s, twinkle: Math.random() * Math.PI * 2 });
    }

    // Fireflies
    const ffGeo = new THREE.SphereGeometry(0.05, 3, 2);
    const ffMat = new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 14; i++) {
      const ff = new THREE.Mesh(ffGeo, ffMat.clone());
      ff.position.set((Math.random() - 0.5) * 22, 0.3 + Math.random() * 2, (Math.random() - 0.5) * 22);
      this.group.add(ff);
      this.fireflies.push({ mesh: ff, baseX: ff.position.x, baseZ: ff.position.z, baseY: ff.position.y, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.4 });
    }

    // Shooting stars (3)
    for (let i = 0; i < 3; i++) {
      const trail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.04, 1.2, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0 })
      );
      trail.position.set(6 + i * 2, 6, -7);
      trail.rotation.z = Math.PI / 4;
      this.group.add(trail);
      this.shootingStars.push({ mesh: trail, phase: i * 2.3, speed: 4 + i * 0.4, startX: 8, endX: -8, startY: 7, endY: 3 });
    }

    // Collectibles: star fragments
    const starGems = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 3 + Math.random() * 9;
      starGems.push(new THREE.Vector3(Math.sin(a) * r, 0.5 + Math.random() * 0.5, Math.cos(a) * r));
    }
    this.spawnGems(starGems, 0.2);

    this.addReturnPortal(cfg, new THREE.Vector3(0, 0, 8));
  }

  update(delta) {
    super.update(delta);

    // Twinkle stars
    for (const s of this.stars) {
      s.mesh.material.opacity = Math.sin(this.time * 2 + s.twinkle) * 0.3 + 0.7;
    }

    // Fireflies
    for (const ff of this.fireflies) {
      ff.mesh.position.x = ff.baseX + Math.sin(this.time * ff.speed + ff.phase) * 2;
      ff.mesh.position.z = ff.baseZ + Math.cos(this.time * ff.speed * 0.7 + ff.phase) * 1.5;
      ff.mesh.position.y = ff.baseY + Math.sin(this.time * 1.5 + ff.phase) * 0.4;
    }

    // Constellation pulse
    for (const cs of this.constellationStones) {
      cs.glow.scale.setScalar(0.15 + Math.sin(this.time * 1.5 + cs.index * 0.4) * 0.05);
    }

    // Shooting stars
    for (const ss of this.shootingStars) {
      const t = (this.time % (ss.speed + 2)) / ss.speed;
      if (t < 1) {
        ss.mesh.position.x = ss.startX + (ss.endX - ss.startX) * t;
        ss.mesh.position.y = ss.startY + (ss.endY - ss.startY) * t;
        ss.mesh.material.opacity = t < 0.15 ? t / 0.15 : 1 - t;
      } else {
        ss.mesh.material.opacity = 0;
      }
    }

    if (this.moonGlow) this.moonGlow.intensity = 2.3 + Math.sin(this.time * 0.4) * 0.3;
  }
}