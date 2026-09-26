import * as THREE from 'three';
import { AdventureBase } from './AdventureBase.js';

const GEO = { sphere12: new THREE.SphereGeometry(1, 12, 8) };

const MAT = {
  dirt: new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.9 }),
  corn: new THREE.MeshStandardMaterial({ color: 0xcca533, roughness: 0.75 }),
  pumpkin: new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.6 }),
  pumpkinFace: new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.7 }),
  stem: new THREE.MeshStandardMaterial({ color: 0x2d5a1e, roughness: 0.8 }),
  hay: new THREE.MeshStandardMaterial({ color: 0xc4a44a, roughness: 0.85 }),
  apple: new THREE.MeshStandardMaterial({ color: 0xcc2233, roughness: 0.45 }),
};

export class HarvestMaze extends AdventureBase {
  constructor(scene, getTerrainHeight, cfg) {
    super(scene, cfg);
    this.pumpkins = [];
    this.build();
  }

  build() {
    // Dirt ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(15, 15.5, 0.5, 32), MAT.dirt);
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Corn maze walls
    const mazeLayout = [
      [-6, -6, 0.5, 12], [6, -6, 0.5, 12],
      [-3, -6, 6, 0.5], [-3, 0, 6, 0.5], [-3, 6, 6, 0.5],
      [-1.5, -3, 3, 0.5], [1.5, 3, 3, 0.5],
      [0, -6, 0.5, 3], [0, 0, 0.5, 3],
      [-6, 0, 3, 0.5], [6, -2, 0.5, 4],
      [-4.5, 3, 3, 0.5], [4.5, -4, 3, 0.5],
      [-6, 3, 0.5, 6], [6, 2, 0.5, 4],
    ];

    const cornGeo = new THREE.BoxGeometry(1, 2.5, 1);
    const stalkGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.5, 4);

    mazeLayout.forEach(([cx, cz, w, d]) => {
      const wall = new THREE.Mesh(cornGeo, MAT.corn);
      wall.scale.set(w, 1, d);
      wall.position.set(cx, 1.25, cz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);

      // Corn stalk tops (reduced density)
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

    // Pumpkins with emissive faces
    const punkGeo = new THREE.SphereGeometry(0.4, 12, 8);
    const faceGeo = new THREE.SphereGeometry(0.25, 6, 4);
    for (let i = 0; i < 10; i++) {
      const pumpkin = new THREE.Group();
      const body = new THREE.Mesh(punkGeo, MAT.pumpkin);
      body.scale.y = 0.7;
      pumpkin.add(body);

      const face = new THREE.Mesh(faceGeo, MAT.pumpkinFace.clone());
      face.scale.set(0.55, 0.35, 0.55);
      face.position.y = 0.05;
      pumpkin.add(face);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.25, 6), MAT.stem);
      stem.position.y = 0.3;
      pumpkin.add(stem);

      pumpkin.position.set((Math.random() - 0.5) * 16, 0.25, (Math.random() - 0.5) * 16);
      pumpkin.castShadow = true;
      this.group.add(pumpkin);
      this.pumpkins.push({ group: pumpkin, face, phase: Math.random() * Math.PI * 2 });
    }

    // Apple trees (reduced to 4)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      const r = 11;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 2, 12), MAT.stem);
      trunk.position.y = 1;
      tree.add(trunk);
      const crown = new THREE.Mesh(GEO.sphere12, MAT.stem);
      crown.scale.set(1.2, 1.2, 1.2);
      crown.position.y = 2.2;
      tree.add(crown);
      for (let j = 0; j < 4; j++) {
        const apple = new THREE.Mesh(GEO.sphere12, MAT.apple);
        apple.scale.setScalar(0.12);
        apple.position.set((Math.random() - 0.5) * 1.4, 2 + Math.random() * 0.6, (Math.random() - 0.5) * 1.4);
        tree.add(apple);
      }
      tree.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      this.group.add(tree);
    }

    // Scarecrow
    const scarecrow = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 2.5, 12), MAT.hay);
    body.position.y = 1.5;
    scarecrow.add(body);
    const head = new THREE.Mesh(GEO.sphere12, MAT.hay);
    head.scale.setScalar(0.3);
    head.position.y = 2.95;
    scarecrow.add(head);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.05, 0.5, 8), MAT.stem);
    hat.position.y = 3.4;
    scarecrow.add(hat);
    scarecrow.position.set(0, 0, 3);
    this.group.add(scarecrow);

    // Ambient light
    const amb = new THREE.PointLight(0xffbb66, 2, 16, 2);
    amb.position.y = 4;
    this.group.add(amb);

    // Collectible pumpkins hidden in the maze
    const punkPositions = [];
    for (let i = 0; i < 14; i++) {
      punkPositions.push(new THREE.Vector3(
        -7 + Math.random() * 14,
        0.55,
        -7 + Math.random() * 14
      ));
    }
    this.spawnGems(punkPositions, 0.25);

    this.addReturnPortal(cfg, new THREE.Vector3(-5, 0, -5));
  }

  update(delta) {
    super.update(delta);

    for (const p of this.pumpkins) {
      const pulse = 0.5 + Math.sin(this.time * 2 + p.phase) * 0.4;
      p.face.material.opacity = pulse;
      p.face.scale.set(0.55 * pulse, 0.35 * pulse, 0.55 * pulse);
    }
  }
}