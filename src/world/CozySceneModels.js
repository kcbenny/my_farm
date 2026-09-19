import * as THREE from 'three';

function makeGroundChunk(size = 12, color = 0xd9c29a) {
  const group = new THREE.Group();

  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(size, 0.9, size),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.95,
      flatShading: true,
    })
  );
  slab.position.y = 0.45;
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);

  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(size + 0.5, 0.2, size + 0.5),
    new THREE.MeshStandardMaterial({
      color: 0x7c6a53,
      roughness: 0.95,
      flatShading: true,
    })
  );
  rim.position.y = 0.1;
  rim.receiveShadow = true;
  group.add(rim);

  return group;
}

function createTree(type = 'pine', scale = 1) {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.95, flatShading: true });
  const foliageMat = new THREE.MeshStandardMaterial({ color: type === 'pine' ? 0x4a8f5c : 0x7cbf61, roughness: 0.85, flatShading: true });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 1.4 * scale, 6), trunkMat);
  trunk.position.y = 0.7 * scale;
  trunk.castShadow = true;
  tree.add(trunk);

  if (type === 'pine') {
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry((1.1 - i * 0.25) * scale, 1.5 * scale, 5), foliageMat);
      cone.position.y = 1.5 * scale + i * 0.8 * scale;
      cone.castShadow = true;
      tree.add(cone);
    }
  } else {
    const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 * scale, 0), foliageMat);
    foliage.position.y = 1.8 * scale;
    foliage.castShadow = true;
    tree.add(foliage);
  }

  return tree;
}

function createFlowerCluster(color = 0xff8fab) {
  const flower = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x5da95d, roughness: 0.9, flatShading: true })
  );
  stem.position.y = 0.2;
  flower.add(stem);

  const bloom = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.18, 0),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true })
  );
  bloom.position.y = 0.5;
  bloom.castShadow = true;
  flower.add(bloom);

  return flower;
}

function addLantern(group, x, y, z, color = 0xffd166) {
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x5b3b26, roughness: 0.9, flatShading: true })
  );
  post.position.set(x, y + 0.6, z);
  post.castShadow = true;
  group.add(post);

  const light = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.18, 0),
    new THREE.MeshBasicMaterial({ color })
  );
  light.position.set(x, y + 1.2, z);
  group.add(light);

  const glow = new THREE.PointLight(color, 2.0, 10, 1.5);
  glow.position.set(x, y + 1.2, z);
  group.add(glow);
}

export class CozySceneModels {
  static buildMainFarmsteadScene(options = {}) {
    const group = makeGroundChunk(11.5, 0xd8bf8a);
    group.position.set(0, 0, 0);

    const house = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1ead8, roughness: 0.9, flatShading: true });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xc75f42, roughness: 0.85, flatShading: true });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x9d6b46, roughness: 0.9, flatShading: true });
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x8d6d4f, roughness: 0.8, flatShading: true });

    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 2.5), wallMat);
    body.position.set(0, 1.7, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    house.add(body);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.7, 4), roofMat);
    roof.position.set(0, 3.2, 0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.5, 0.55), chimneyMat);
    chimney.position.set(1.15, 4.2, -0.25);
    house.add(chimney);

    const smoke = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 5), new THREE.MeshStandardMaterial({ color: 0xefe7d8, roughness: 0.9, flatShading: true }));
    smoke.position.set(1.15, 5.0, -0.25);
    smoke.rotation.x = Math.PI;
    house.add(smoke);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.12), trimMat);
    door.position.set(0.2, 1.1, 1.28);
    house.add(door);

    for (let x = -1; x <= 1; x += 2) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.08), trimMat);
      win.position.set(x * 1.1, 2.0, 1.28);
      house.add(win);
    }

    house.position.set(-0.8, 0.9, -1.1);
    group.add(house);

    const soil = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.38, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x765136, roughness: 0.9, flatShading: true })
    );
    soil.position.set(3.1, 0.86, 2.2);
    soil.receiveShadow = true;
    group.add(soil);

    for (let i = 0; i < 4; i++) {
      const crop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 0.7, 6),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xc9d66a : 0x7cc55a, roughness: 0.9, flatShading: true })
      );
      crop.position.set(2.1 + i * 0.7, 1.18, 2.15);
      crop.castShadow = true;
      group.add(crop);
    }

    const well = new THREE.Group();
    const wellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.85, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0xb0b3b3, roughness: 0.9, flatShading: true }));
    wellBody.position.y = 0.55;
    well.add(wellBody);
    const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0xcc7a5f, roughness: 0.85, flatShading: true }));
    wellRoof.position.y = 1.35;
    well.add(wellRoof);
    well.position.set(4.3, 0.9, -2.9);
    group.add(well);

    for (let i = 0; i < 6; i++) {
      const flower = createFlowerCluster(i % 2 === 0 ? 0xff7c7c : 0xf7d774);
      flower.position.set(-3.7 + i * 1.2, 0.9, 3.1 + (i % 2) * 0.5);
      group.add(flower);
    }

    addLantern(group, -3.8, 0.8, 1.1, 0xffd166);

    return group;
  }

  static buildGreenhouseScene(options = {}) {
    const group = makeGroundChunk(11.5, 0xc9d8b3);

    const greenhouse = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xe7c891, roughness: 0.9, flatShading: true });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xf18e7a, roughness: 0.85, flatShading: true });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd7cf,
      roughness: 0.18,
      transmission: 0.46,
      transparent: true,
      opacity: 0.9,
      flatShading: true,
    });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xd7b48f, roughness: 0.95, flatShading: true });
    const potMat = new THREE.MeshStandardMaterial({ color: 0xc58066, roughness: 0.9, flatShading: true });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x4f9a52, roughness: 0.9, flatShading: true });

    const addPlantPot = (x, z, size = 0.8, color = 0xffd66b) => {
      const pot = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.6, size * 0.75, size * 0.55, 8), potMat);
      body.position.y = size * 0.25;
      pot.add(body);

      const soil = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.52, size * 0.63, 0.18, 8), new THREE.MeshStandardMaterial({ color: 0x744b2e, roughness: 0.95, flatShading: true }));
      soil.position.y = size * 0.62;
      pot.add(soil);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, size * 1.05, 6), new THREE.MeshStandardMaterial({ color: 0x4d9a4d, roughness: 0.9, flatShading: true }));
      stem.position.y = size * 0.96;
      pot.add(stem);

      const leafGeo = new THREE.SphereGeometry(size * 0.42, 8, 8);
      const leafMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true });
      const leaf1 = new THREE.Mesh(leafGeo, leafMaterial);
      leaf1.scale.set(1.4, 0.8, 0.8);
      leaf1.position.set(-size * 0.18, size * 1.1, 0);
      leaf1.rotation.z = 0.7;
      pot.add(leaf1);

      const leaf2 = leaf1.clone();
      leaf2.position.x = size * 0.18;
      leaf2.rotation.z = -0.7;
      pot.add(leaf2);

      pot.position.set(x, 0.42, z);
      greenhouse.add(pot);
    };

    const path = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.18, 5.1), floorMat);
    path.position.set(0, 0.18, 0);
    greenhouse.add(path);

    const base = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.7, 5.1), woodMat);
    base.position.y = 0.45;
    base.castShadow = true;
    greenhouse.add(base);

    const shellShape = new THREE.Shape();
    shellShape.moveTo(-3.1, 0);
    shellShape.lineTo(-3.1, 1.95);
    shellShape.quadraticCurveTo(-2.4, 3.45, 0, 3.9);
    shellShape.quadraticCurveTo(2.4, 3.45, 3.1, 1.95);
    shellShape.lineTo(3.1, 0);
    shellShape.lineTo(-2.8, 0);

    const shell = new THREE.Mesh(new THREE.ExtrudeGeometry(shellShape, { depth: 5.0, bevelEnabled: false }), glassMat);
    shell.position.set(0, 1.1, -2.5);
    shell.castShadow = true;
    shell.receiveShadow = true;
    greenhouse.add(shell);

    const roofBeam = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.2, 0.2), woodMat);
    roofBeam.position.set(0, 3.55, -2.5);
    greenhouse.add(roofBeam);

    const roofBeam2 = roofBeam.clone();
    roofBeam2.position.z = 2.5;
    greenhouse.add(roofBeam2);

    const framePositions = [-2.55, -1.3, 0, 1.3, 2.55];
    framePositions.forEach((x) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.7, 0.12), woodMat);
      post.position.set(x, 1.6, -2.5);
      greenhouse.add(post);

      const postBack = post.clone();
      postBack.position.z = 2.5;
      greenhouse.add(postBack);
    });

    for (let i = 0; i < 5; i++) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.09, 8, 28, Math.PI), woodMat);
      arch.rotation.z = Math.PI / 2;
      arch.position.set(0, 1.25 + i * 0.42, -2.5 + i * 1.25);
      greenhouse.add(arch);
    }

    const doorArch = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 8, 24, Math.PI), trimMat);
    doorArch.rotation.z = Math.PI;
    doorArch.position.set(0, 0.9, 2.56);
    greenhouse.add(doorArch);

    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.1), new THREE.MeshStandardMaterial({ color: 0xe8c195, roughness: 0.9, flatShading: true }));
    doorPanel.position.set(0, 0.95, 2.56);
    greenhouse.add(doorPanel);

    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.9), new THREE.MeshStandardMaterial({ color: 0xa76b46, roughness: 0.9, flatShading: true }));
    bench.position.set(0, 0.9, 0.6);
    greenhouse.add(bench);

    const benchLegs = [-1.0, 1.0];
    benchLegs.forEach((x) => {
      for (let z = -0.3; z <= 0.3; z += 0.6) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), woodMat);
        leg.position.set(x, 0.45, z + 0.6);
        greenhouse.add(leg);
      }
    });

    const plantPositions = [
      [-2.2, -1.7, 0x6ecf78],
      [-2.8, 1.2, 0x91d66d],
      [2.8, 1.0, 0x7acb5e],
      [2.3, -1.5, 0x8ccf72],
      [0.3, -2.4, 0xf8d36b],
    ];

    plantPositions.forEach(([x, z, color]) => {
      addPlantPot(x, z, 0.72, color);
    });

    const flowerCluster = (x, z, colorA = 0xff7aa8, colorB = 0xf7d36a) => {
      const groupFlower = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 6), new THREE.MeshStandardMaterial({ color: 0x42a563, roughness: 0.9, flatShading: true }));
        stem.position.set((i - 1.5) * 0.18, 0.22, (i % 2) * 0.18);
        groupFlower.add(stem);

        const bloom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? colorA : colorB, roughness: 0.75, flatShading: true }));
        bloom.position.set(stem.position.x, 0.52, stem.position.z);
        groupFlower.add(bloom);
      }
      groupFlower.position.set(x, 0.42, z);
      greenhouse.add(groupFlower);
    };

    for (let i = 0; i < 7; i++) {
      flowerCluster(-2.6 + i * 0.8, 2.55 + (i % 2) * 0.2, i % 2 === 0 ? 0xff7aa8 : 0xf4d067);
    }

    for (let i = 0; i < 5; i++) {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + (i % 3) * 0.08, 0), new THREE.MeshStandardMaterial({ color: 0x7a6c5c, roughness: 0.95, flatShading: true }));
      stone.position.set(-3.1 + i * 1.4, 0.22, 2.75 + (i % 2) * 0.2);
      greenhouse.add(stone);
    }

    const addVine = (x, z, side = 1) => {
      const vine = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.9, 6), mossMat);
      stem.position.y = 0.95;
      stem.rotation.z = side * 0.22;
      vine.add(stem);

      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.19, 7, 6), mossMat);
        leaf.scale.set(1.35, 0.55, 0.8);
        leaf.position.set(side * (0.18 + (i % 2) * 0.12), 0.35 + i * 0.34, (i % 2) * 0.12);
        leaf.rotation.z = side * 0.55;
        vine.add(leaf);
      }

      vine.position.set(x, 0.45, z);
      greenhouse.add(vine);
    };

    addVine(-3.2, 2.45, 1);
    addVine(3.2, 2.45, -1);
    addVine(-3.15, -2.35, -1);

    addPlantPot(-3.45, 2.55, 0.86, 0x6dcc65);
    addPlantPot(3.45, 2.55, 0.86, 0x7ed36c);
    flowerCluster(-3.55, 2.7, 0xff6f9c, 0xffd166);
    flowerCluster(3.55, 2.7, 0xff7fae, 0xf6d36b);

    const warmLantern = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    warmLantern.position.set(2.6, 1.7, 1.8);
    greenhouse.add(warmLantern);
    const warmGlow = new THREE.PointLight(0xffd166, 1.8, 8, 1.6);
    warmGlow.position.copy(warmLantern.position);
    greenhouse.add(warmGlow);

    greenhouse.position.set(0, 0.8, 0);
    group.add(greenhouse);

    return group;
  }

  static buildBarnPastureScene(options = {}) {
    const group = makeGroundChunk(12, 0xc5d9af);

    const barn = new THREE.Group();
    const barnMat = new THREE.MeshStandardMaterial({ color: 0xc24646, roughness: 0.8, flatShading: true });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xb85b2d, roughness: 0.86, flatShading: true });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xe9e6db, roughness: 0.85, flatShading: true });
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.2, 2.8), barnMat);
    base.position.set(0, 1.4, 0);
    barn.add(base);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.7, 4), roofMat);
    roof.position.set(0, 3.1, 0);
    roof.rotation.y = Math.PI / 4;
    barn.add(roof);

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.12), trimMat);
    door.position.set(0.2, 0.95, 1.48);
    barn.add(door);

    for (let x = -1; x <= 1; x += 2) {
      const windowPane = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.08), trimMat);
      windowPane.position.set(x * 1.1, 1.9, 1.48);
      barn.add(windowPane);
    }

    barn.position.set(-0.8, 0.9, -0.8);
    group.add(barn);

    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8d5d3d, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 6; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), fenceMat);
      post.position.set(-4 + i * 1.5, 0.4, 3.4);
      group.add(post);
    }

    const animalMat = new THREE.MeshStandardMaterial({ color: 0xd5b985, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 3; i++) {
      const animal = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.9), animalMat);
      body.position.y = 0.35;
      animal.add(body);
      animal.position.set(2.5 + i * 1.2, 0.7, 1.2 + (i % 2) * 0.6);
      group.add(animal);
    }

    const hay = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0xe2bf66, roughness: 0.9, flatShading: true }));
    hay.position.set(3.8, 0.6, 2.5);
    group.add(hay);

    const treeA = createTree('pine', 1.1);
    treeA.position.set(-3.9, 0.8, -2.5);
    group.add(treeA);
    const treeB = createTree('pine', 1.1);
    treeB.position.set(3.8, 0.8, -2.8);
    group.add(treeB);

    return group;
  }

  static buildMarketSquareScene(options = {}) {
    const group = makeGroundChunk(12, 0xd7c8b5);

    const stall = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xa7713b, roughness: 0.9, flatShading: true });
    const fabricMat = new THREE.MeshStandardMaterial({ color: 0xe38faa, roughness: 0.8, flatShading: true });
    const produceMat = new THREE.MeshStandardMaterial({ color: 0xf2a65a, roughness: 0.8, flatShading: true });

    const base = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.4, 2.8), woodMat);
    base.position.y = 0.3;
    stall.add(base);

    const awning = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 2.4), fabricMat);
    awning.position.set(0, 1.8, 0);
    awning.rotation.x = -0.18;
    stall.add(awning);

    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.8), woodMat);
    crate.position.set(-1.1, 0.7, 0.2);
    stall.add(crate);

    const pumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), produceMat);
    pumpkin.position.set(-1.1, 1.2, 0.2);
    stall.add(pumpkin);

    const appleA = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshStandardMaterial({ color: 0xe85d75, roughness: 0.7, flatShading: true }));
    appleA.position.set(1.0, 1.0, 0.0);
    stall.add(appleA);
    const appleB = appleA.clone();
    appleB.position.set(1.5, 1.0, 0.3);
    stall.add(appleB);

    const lanternA = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    lanternA.position.set(-1.6, 1.9, 0.8);
    stall.add(lanternA);
    const lanternB = lanternA.clone();
    lanternB.position.set(1.6, 1.9, 0.8);
    stall.add(lanternB);

    stall.position.set(0, 0.8, 0);
    group.add(stall);

    for (let i = 0; i < 10; i++) {
      const flower = createFlowerCluster(i % 2 === 0 ? 0xf39ac7 : 0x9bd3a5);
      flower.position.set(-4 + i * 0.9, 0.8, 3.1 + (i % 2) * 0.6);
      group.add(flower);
    }

    return group;
  }

  static buildRiverDockScene(options = {}) {
    const group = makeGroundChunk(12, 0xbdd6a2);

    const water = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.6, 3.5),
      new THREE.MeshStandardMaterial({ color: 0x67d4e8, roughness: 0.2, flatShading: true, transparent: true, opacity: 0.9 })
    );
    water.position.set(2.4, 0.8, -2.8);
    group.add(water);

    const dock = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a4d2a, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 5; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 0.5), woodMat);
      plank.position.set(0, 0.1, -1.0 + i * 0.55);
      dock.add(plank);
    }
    dock.position.set(1.8, 0.9, -2.2);
    group.add(dock);

    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.5), woodMat);
    seat.position.y = 0.55;
    bench.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.08), woodMat);
    back.position.set(0, 0.8, -0.18);
    bench.add(back);
    bench.position.set(3.9, 0.9, -0.8);
    group.add(bench);

    const pineA = createTree('pine', 1.1);
    pineA.position.set(-3.4, 0.8, -1.1);
    group.add(pineA);
    const pineB = createTree('pine', 1.1);
    pineB.position.set(-4.1, 0.8, 3.4);
    group.add(pineB);

    for (let i = 0; i < 5; i++) {
      const lily = new THREE.Mesh(new THREE.CircleGeometry(0.35, 8), new THREE.MeshStandardMaterial({ color: 0x4fb56a, roughness: 0.8, flatShading: true }));
      lily.rotation.x = -Math.PI / 2;
      lily.position.set(1.8 + i * 0.7, 1.0, -2.75 + (i % 2) * 0.5);
      group.add(lily);
    }

    return group;
  }
}
