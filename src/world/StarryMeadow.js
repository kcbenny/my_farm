import * as THREE from 'three';
import { ADVENTURE_MAPS } from './PortalSystem.js';

const m = {
  grass: new THREE.MeshStandardMaterial({ color: 0x1a2e4a, roughness: 0.9, flatShading: true }),
  moon: new THREE.MeshBasicMaterial({ color: 0xfffde7 }),
  star: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  constellation: new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.88, flatShading: true }),
};

export class StarryMeadow {
  constructor(scene, getTerrainHeight) {
    this.scene = scene;
    this.time = 0;
    this.groundY = 0;
    this.stars = [];
    this.fireflies = [];
    this.shootingStars = [];

    const cfg = ADVENTURE_MAPS.starryMeadow;
    const o = cfg.mapOffset.clone();

    this.group = new THREE.Group();
    this.group.name = 'StarryMeadow';
    this.group.position.copy(o);
    scene.add(this.group);

    // Dark grass ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(15, 15.5, 0.5, 32), m.grass);
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Giant moon
    const moonGroup = new THREE.Group();
    const moonSphere = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 12), m.moon);
    moonGroup.add(moonSphere);
    const moonGlow = new THREE.PointLight(0xfffde7, 3, 20, 2);
    moonGlow.position.y = 0.5;
    moonGroup.add(moonGlow);
    moonGroup.position.set(6, 8, 0);
    this.group.add(moonGroup);
    this.moonGlow = moonGlow;

    // Constellation stones (forming a pattern)
    const constellationPoints = [
      [-3, 0, -4], [0, 0, -6], [3, 0, -4],
      [-2, 0, 0], [2, 0, 0],
      [-4, 0, 4], [0, 0, 2], [4, 0, 4]
    ];
    const constellationStones = [];
    constellationPoints.forEach(([cx, cy, cz]) => {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.5, 6), m.stone);
      stone.position.set(cx, 0.2, cz);
      stone.receiveShadow = true;
      this.group.add(stone);

      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), m.constellation);
      glow.position.set(cx, 0.55, cz);
      this.group.add(glow);
      constellationStones.push({ stone, glow, baseX: cx, baseZ: cz });
    });
    this.constellationStones = constellationStones;

    // Background stars
    for (let i = 0; i < 80; i++) {
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.08, 3, 2), m.star);
      star.position.set((Math.random() - 0.5) * 30, 3 + Math.random() * 8, (Math.random() - 0.5) * 30);
      this.group.add(star);
      this.stars.push({ mesh: star, twinkle: Math.random() * Math.PI * 2 });
    }

    // Fireflies
    for (let i = 0; i < 20; i++) {
      const ff = new THREE.PointLight(0xffdd88, 0.5, 2, 2);
      ff.position.set((Math.random() - 0.5) * 22, 0.3 + Math.random() * 2, (Math.random() - 0.5) * 22);
      this.group.add(ff);
      this.fireflies.push({
        light: ff,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
        baseX: ff.position.x,
        baseZ: ff.position.z,
        baseY: ff.position.y,
      });
    }

    // Shooting star trails
    for (let i = 0; i < 3; i++) {
      const trail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.04, 1.2, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0 })
      );
      trail.position.set(5 + i * 3, 6 + i * 2, -8);
      trail.rotation.z = Math.PI / 4;
      this.group.add(trail);
      this.shootingStars.push({
        mesh: trail,
        phase: i * 2.5,
        speed: 4 + i * 0.5,
        startX: 8, endX: -8,
        startY: 7, endY: 3,
        startZ: -8,
      });
    }

    this.addReturnPortal(cfg);
    this.getGroundY = () => this.groundY;
  }

  addReturnPortal(cfg) {
    const glow = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.15, 6, 12), glow);
    ring.position.y = 1.4;
    ring.rotation.y = Math.PI / 2;
    const light = new THREE.PointLight(cfg.color, 2.4, 9, 1.8);
    light.position.y = 1.4;

    this.returnPortal = new THREE.Group();
    this.returnPortal.add(ring);
    this.returnPortal.add(light);
    this.returnPortal.name = 'ReturnPortal_Star';
    this.returnPortal.position.set(0, 0, 8);
    this.group.add(this.returnPortal);
    this.returnRing = ring;
  }

  getReturnPosition() {
    const pos = new THREE.Vector3();
    this.returnPortal.getWorldPosition(pos);
    return pos;
  }

  isNearReturnPortal(position) {
    const rp = this.getReturnPosition();
    return position.distanceToSquared(rp) < 7.5;
  }

  update(delta) {
    this.time += delta;
    // Twinkle stars
    this.stars.forEach(s => {
      const t = Math.sin(this.time * 2 + s.twinkle) * 0.4 + 0.6;
      s.mesh.material.opacity = t;
    });
    // Fireflies
    this.fireflies.forEach(ff => {
      ff.light.position.x = ff.baseX + Math.sin(this.time * ff.speed + ff.phase) * 2.5;
      ff.light.position.z = ff.baseZ + Math.cos(this.time * ff.speed * 0.8 + ff.phase) * 2;
      ff.light.position.y = ff.baseY + Math.sin(this.time * 1.5 + ff.phase) * 0.5;
      ff.light.intensity = 0.2 + Math.sin(this.time * 2.5 + ff.phase) * 0.3;
    });
    // Constellation pulse
    this.constellationStones.forEach((cs, i) => {
      cs.glow.scale.setScalar(0.8 + Math.sin(this.time * 1.5 + i * 0.4) * 0.3);
      cs.glow.material.opacity = 0.4 + Math.sin(this.time * 1.5 + i * 0.4) * 0.3;
    });
    // Shooting stars
    this.shootingStars.forEach(ss => {
      const t = (this.time % (ss.speed + 2)) / ss.speed;
      if (t < 1) {
        ss.mesh.position.x = ss.startX + (ss.endX - ss.startX) * t;
        ss.mesh.position.y = ss.startY + (ss.endY - ss.startY) * t;
        ss.mesh.material.opacity = t < 0.15 ? t / 0.15 : 1 - t;
      } else {
        ss.mesh.material.opacity = 0;
      }
    });
    // Moon pulse
    if (this.moonGlow) {
      this.moonGlow.intensity = 2.8 + Math.sin(this.time * 0.5) * 0.3;
    }
    if (this.returnRing) {
      this.returnRing.rotation.z = this.time * 0.8;
      this.returnRing.scale.setScalar(1 + Math.sin(this.time * 2) * 0.05);
    }
  }
}