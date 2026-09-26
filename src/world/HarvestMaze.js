import * as THREE from 'three';
import { ADVENTURE_MAPS } from './PortalSystem.js';

const m = {
  dirt: new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.95, flatShading: true }),
  corn: new THREE.MeshStandardMaterial({ color: 0xcca533, roughness: 0.8, flatShading: true }),
  pumpkin: new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.7, flatShading: true }),
  pumpkinGlow: new THREE.MeshBasicMaterial({ color: 0xffaa44 }),
  stem: new THREE.MeshStandardMaterial({ color: 0x2d5a1e, roughness: 0.85, flatShading: true }),
  hay: new THREE.MeshStandardMaterial({ color: 0xc4a44a, roughness: 0.9, flatShading: true }),
  apple: new THREE.MeshStandardMaterial({ color: 0xcc2233, roughness: 0.5, flatShading: true }),
};

export class HarvestMaze {
  constructor(scene, getTerrainHeight) {
    this.scene = scene;
    this.time = 0;
    this.pumpkinLights = [];

    const cfg = ADVENTURE_MAPS.harvestMaze;
    const o = cfg.mapOffset.clone();

    this.group = new THREE.Group();
    this.group.name = 'HarvestMaze';
    this.group.position.copy(o);
    scene.add(this.group);

    // Ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(15, 15.5, 0.5, 32), m.dirt);
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Corn maze walls
    const mazeLayout = [
      // [x, z, w, d] - wall positions and dimensions
      [-6, -6, 0.5, 12], [6, -6, 0.5, 12],
      [-3, -6, 6, 0.5], [-3, 0, 6, 0.5], [-3, 6, 6, 0.5],
      [-1.5, -3, 3, 0.5], [1.5, 3, 3, 0.5],
      [0, -6, 0.5, 3], [0, 0, 0.5, 3],
      [-6, 0, 3, 0.5], [6, -2, 0.5, 4],
      [-4.5, 3, 3, 0.5], [4.5, -4, 3, 0.5],
      [-6, 3, 0.5, 6], [6, 2, 0.5, 4],
    ];

    mazeLayout.forEach(([cx, cz, w, d]) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.5, d), m.corn);
      wall.position.set(cx, 1.25, cz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);

      // Corn stalk tops
      for (let j = 0; j < Math.max(w, d) * 1.5; j++) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 4), m.stem);
        stalk.position.set(
          cx + (w > 1 ? (j / (w * 1.5) - 0.5) * w + (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * 0.3),
          2.8,
          cz + (d > 1 ? (j / (d * 1.5) - 0.5) * d + (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * 0.3)
        );
        this.group.add(stalk);
      }
    });

    // Pumpkins with glowing faces
    for (let i = 0; i < 12; i++) {
      const pumpkin = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 5), m.pumpkin);
      body.scale.y = 0.7;
      pumpkin.add(body);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), m.pumpkinGlow.clone());
      glow.scale.set(0.6, 0.4, 0.6);
      glow.position.y = 0.05;
      pumpkin.add(glow);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.25, 4), m.stem);
      stem.position.y = 0.3;
      pumpkin.add(stem);

      pumpkin.position.set(
        (Math.random() - 0.5) * 18,
        0.25,
        (Math.random() - 0.5) * 18
      );
      pumpkin.castShadow = true;
      this.group.add(pumpkin);

      const plight = new THREE.PointLight(0xffaa44, 0.8, 3, 2);
      plight.position.copy(pumpkin.position).add(new THREE.Vector3(0, 0.4, 0));
      this.group.add(plight);
      this.pumpkinLights.push({ pumpkin, light: plight, phase: Math.random() * Math.PI * 2 });
    }

    // Apple trees
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.3;
      const radius = 11;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 2, 6), m.stem);
      trunk.position.y = 1;
      tree.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(1.2, 7, 5), m.stem);
      crown.position.y = 2.3;
      tree.add(crown);
      for (let j = 0; j < 4; j++) {
        const apple = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), m.apple);
        apple.position.set(
          (Math.random() - 0.5) * 1.5,
          2.1 + Math.random() * 0.7,
          (Math.random() - 0.5) * 1.5
        );
        tree.add(apple);
      }
      tree.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
      this.group.add(tree);
    }

    // Scarecrow
    const scarecrow = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 2.5, 6), m.hay);
    body.position.y = 1.5;
    scarecrow.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 4), m.hay);
    head.position.y = 2.95;
    scarecrow.add(head);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.05, 0.5, 6), m.stem);
    hat.position.y = 3.4;
    scarecrow.add(hat);
    scarecrow.position.set(0, 0, 3);
    this.group.add(scarecrow);

    this.addReturnPortal(cfg);
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
    this.returnPortal.name = 'ReturnPortal_Harvest';
    this.returnPortal.position.set(-5, 0, -5);
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
    // Pulse pumpkin lights
    this.pumpkinLights.forEach(pl => {
      const glow = 0.5 + Math.sin(this.time * 2 + pl.phase) * 0.4;
      pl.light.intensity = glow;
      pl.pumpkin.children[1].material.opacity = 0.5 + glow * 0.5;
    });
    if (this.returnRing) {
      this.returnRing.rotation.z = this.time * 0.8;
      this.returnRing.scale.setScalar(1 + Math.sin(this.time * 2) * 0.05);
    }
  }
}