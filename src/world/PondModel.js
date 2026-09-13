import * as THREE from 'three';

export class PondModel {
  static createPond() {
    const pondGroup = new THREE.Group();
    pondGroup.name = 'Cozy_Pond';

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x48cae4,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
      flatShading: true
    });

    const bankMat = new THREE.MeshStandardMaterial({
      color: 0x588157,
      roughness: 0.9,
      flatShading: true
    });

    const lilyMat = new THREE.MeshStandardMaterial({
      color: 0x2d6a4f,
      roughness: 0.6,
      side: THREE.DoubleSide,
      flatShading: true
    });

    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      roughness: 0.5,
      flatShading: true
    });

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6f4e37,
      roughness: 0.8,
      flatShading: true
    });

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x9b9b7a,
      roughness: 0.9,
      flatShading: true
    });

    // Pond Basin
    const waterGeom = new THREE.CylinderGeometry(5.2, 4.2, 0.4, 16);
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.position.set(0, 0.05, 0);
    water.receiveShadow = true;
    pondGroup.add(water);

    // Lily pads
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 1.8 + Math.random() * 2.2;
      const padGeom = new THREE.CircleGeometry(0.55 + Math.random() * 0.25, 8);
      padGeom.rotateX(-Math.PI / 2);
      const pad = new THREE.Mesh(padGeom, lilyMat);
      pad.position.set(Math.cos(angle) * radius, 0.26, Math.sin(angle) * radius);
      pad.rotation.y = Math.random() * Math.PI;
      pondGroup.add(pad);

      // Blossom on some pads
      if (i % 2 === 0) {
        const flower = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.18, 5), flowerMat);
        flower.position.copy(pad.position);
        flower.position.y += 0.08;
        pondGroup.add(flower);
      }
    }

    // Little wooden fishing dock
    const dock = new THREE.Group();
    dock.position.set(0, 0.35, 4.4);

    const plankGeom = new THREE.BoxGeometry(2.4, 0.15, 0.6);
    for (let p = 0; p < 4; p++) {
      const plank = new THREE.Mesh(plankGeom, woodMat);
      plank.position.set(0, 0, -p * 0.65);
      plank.castShadow = true;
      plank.receiveShadow = true;
      dock.add(plank);
    }

    const postGeom = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6);
    const post1 = new THREE.Mesh(postGeom, woodMat);
    post1.position.set(-1.1, -0.4, -1.8);
    post1.castShadow = true;
    dock.add(post1);

    const post2 = new THREE.Mesh(postGeom, woodMat);
    post2.position.set(1.1, -0.4, -1.8);
    post2.castShadow = true;
    dock.add(post2);

    pondGroup.add(dock);

    // Surrounding River Stones
    for (let s = 0; s < 14; s++) {
      const stoneAngle = (s / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const stoneR = 4.8 + (Math.random() - 0.5) * 0.6;
      const stoneSize = 0.35 + Math.random() * 0.35;
      const stoneGeom = new THREE.DodecahedronGeometry(stoneSize);
      const stone = new THREE.Mesh(stoneGeom, stoneMat);
      stone.position.set(Math.cos(stoneAngle) * stoneR, 0.2, Math.sin(stoneAngle) * stoneR);
      stone.rotation.set(Math.random(), Math.random(), Math.random());
      stone.castShadow = true;
      pondGroup.add(stone);
    }

    return pondGroup;
  }
}
