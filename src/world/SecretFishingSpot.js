import * as THREE from 'three';

const materials = {
  bark: new THREE.MeshStandardMaterial({ color: 0x493427, roughness: 0.95, flatShading: true }),
  pine: new THREE.MeshStandardMaterial({ color: 0x174d3a, roughness: 0.85, flatShading: true }),
  moss: new THREE.MeshStandardMaterial({ color: 0x4d8b45, roughness: 0.9, flatShading: true }),
  stone: new THREE.MeshStandardMaterial({ color: 0x6c7471, roughness: 0.9, flatShading: true }),
  water: new THREE.MeshStandardMaterial({ color: 0x0b6f78, roughness: 0.12, metalness: 0.28, transparent: true, opacity: 0.88, flatShading: true }),
  wood: new THREE.MeshStandardMaterial({ color: 0x704629, roughness: 0.9, flatShading: true }),
  lily: new THREE.MeshStandardMaterial({ color: 0x2f7d52, roughness: 0.75, flatShading: true, side: THREE.DoubleSide }),
};

function makePine(scale = 1) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.35 * scale, 1.7 * scale, 6), materials.bark);
  trunk.position.y = 0.85 * scale;
  trunk.castShadow = true;
  tree.add(trunk);
  for (let index = 0; index < 3; index++) {
    const crown = new THREE.Mesh(new THREE.ConeGeometry((1.3 - index * 0.24) * scale, 1.6 * scale, 6), materials.pine);
    crown.position.y = (1.65 + index * 0.78) * scale;
    crown.castShadow = true;
    tree.add(crown);
  }
  return tree;
}

function makePortal() {
  const portal = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x5f6b70, roughness: 0.85, flatShading: true });
  const glow = new THREE.MeshBasicMaterial({ color: 0x69f5c8, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.15, 6, 12), glow);
  ring.position.y = 1.4;
  ring.rotation.y = Math.PI / 2;
  portal.add(ring);
  for (let index = 0; index < 7; index++) {
    const angle = index / 7 * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), stone);
    rock.position.set(Math.sin(angle) * 1.18, 1.4 + Math.cos(angle) * 1.18, 0);
    rock.rotation.set(angle, angle * 0.4, 0.2);
    rock.castShadow = true;
    portal.add(rock);
  }
  const light = new THREE.PointLight(0x69f5c8, 2.4, 9, 1.8);
  light.position.y = 1.4;
  portal.add(light);
  portal.userData.ring = ring;
  return portal;
}

export class SecretFishingSpot {
  constructor(scene, getTerrainHeight) {
    this.scene = scene;
    this.getTerrainHeight = getTerrainHeight;
    this.farmPortalPosition = new THREE.Vector3(-30, 0, 4);
    this.spotPosition = new THREE.Vector3(42, 0, 30);
    this.farmPortalPosition.y = getTerrainHeight(this.farmPortalPosition.x, this.farmPortalPosition.z);
    this.spotPosition.y = getTerrainHeight(this.spotPosition.x, this.spotPosition.z);
    this.time = 0;
    this.smoke = [];
    this.waterRipples = [];
    this.fish = [];
    this.lanterns = [];
    this.create();
  }

  create() {
    this.farmPortal = makePortal();
    this.farmPortal.name = 'Secret_Fishing_Portal';
    this.farmPortal.position.copy(this.farmPortalPosition);
    this.scene.add(this.farmPortal);

    this.group = new THREE.Group();
    this.group.name = 'Secret_Forest_Fishing_Spot';
    this.group.position.copy(this.spotPosition);
    this.scene.add(this.group);

    const mossyGround = new THREE.Mesh(
      new THREE.CylinderGeometry(12.4, 12.8, 0.58, 32),
      new THREE.MeshStandardMaterial({ color: 0x42683e, roughness: 0.95, flatShading: true })
    );
    mossyGround.position.y = -0.2;
    mossyGround.receiveShadow = true;
    this.group.add(mossyGround);

    const pondBank = new THREE.Mesh(
      new THREE.CylinderGeometry(7.05, 6.6, 0.42, 32),
      new THREE.MeshStandardMaterial({ color: 0x315c45, roughness: 0.98, flatShading: true })
    );
    pondBank.position.y = 0.02;
    pondBank.receiveShadow = true;
    this.group.add(pondBank);

    const pond = new THREE.Mesh(new THREE.CylinderGeometry(6.62, 6.25, 0.18, 32), materials.water);
    pond.position.y = 0.03;
    pond.receiveShadow = true;
    this.group.add(pond);

    for (let index = 0; index < 15; index++) {
      const angle = index / 15 * Math.PI * 2;
      const radius = 7.3 + (index % 3) * 0.55;
      const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75 + (index % 4) * 0.16, 0), materials.stone);
      boulder.position.set(Math.sin(angle) * radius, 0.38, Math.cos(angle) * radius);
      boulder.scale.y = 0.72;
      boulder.rotation.set(0.25, angle, 0.1);
      boulder.castShadow = true;
      this.group.add(boulder);
      if (index % 2 === 0) {
        const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), materials.moss);
        moss.position.copy(boulder.position).add(new THREE.Vector3(0, 0.48, 0));
        moss.scale.y = 0.35;
        this.group.add(moss);
      }
    }

    for (let index = 0; index < 14; index++) {
      const angle = index / 14 * Math.PI * 2 + 0.15;
      const tree = makePine(1 + (index % 3) * 0.18);
      tree.position.set(Math.sin(angle) * (12.3 + index % 2), 0, Math.cos(angle) * (12.3 + index % 2));
      this.group.add(tree);
    }

    this.addWaterfall();
    this.addPondLife();
    this.addForestDetails();

    const dock = new THREE.Group();
    for (let index = 0; index < 5; index++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 0.62), materials.wood);
      plank.position.set(0, 0.32, -index * 0.62);
      plank.castShadow = true;
      dock.add(plank);
    }
    for (const x of [-1.05, 1.05]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.2, 6), materials.wood);
      post.position.set(x, -0.17, -2.25);
      post.castShadow = true;
      dock.add(post);
    }
    dock.position.set(0, 0, 6.1);
    this.group.add(dock);
    this.addFishingCat(dock);

    const tent = new THREE.Group();
    const tentMat = new THREE.MeshStandardMaterial({ color: 0x6f9451, roughness: 0.9, flatShading: true });
    const tentBody = new THREE.Mesh(new THREE.ConeGeometry(1.65, 2.4, 4), tentMat);
    tentBody.position.y = 1.2;
    tentBody.rotation.y = Math.PI / 4;
    tentBody.castShadow = true;
    tent.add(tentBody);
    const entrance = new THREE.Mesh(new THREE.CircleGeometry(0.55, 8), new THREE.MeshBasicMaterial({ color: 0x263c2a, side: THREE.DoubleSide }));
    entrance.position.set(0, 0.72, 1.18);
    tent.add(entrance);
    tent.position.set(-6.9, 0, 4.5);
    this.group.add(tent);

    this.addCampfire(6.8, 0, 4.9);
    this.addLilyPads();
    this.addFrog();

    this.returnPortal = makePortal();
    this.returnPortal.name = 'Return_To_Farm_Portal';
    this.returnPortal.position.set(-7.8, 0, -5.8);
    this.group.add(this.returnPortal);
  }

  addWaterfall() {
    const waterfall = new THREE.Group();
    waterfall.position.set(-5.7, 0, -4.35);
    const cliffMat = new THREE.MeshStandardMaterial({ color: 0x667574, roughness: 0.96, flatShading: true });
    for (const [x, y, z, scale] of [[-0.8, 1.25, 0, 1.1], [0, 1.55, -0.15, 1.35], [0.9, 1.1, 0.1, 0.9], [-0.45, 0.55, 0.4, 0.75], [0.65, 0.5, 0.35, 0.72]]) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 1), cliffMat);
      rock.position.set(x, y, z);
      rock.scale.set(1.1, 0.78, 0.7);
      rock.castShadow = true;
      waterfall.add(rock);
    }
    const fallingWater = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 2.3, 5, 8),
      new THREE.MeshBasicMaterial({ color: 0x9cecf2, transparent: true, opacity: 0.68, side: THREE.DoubleSide })
    );
    fallingWater.position.set(0, 1.25, 0.72);
    fallingWater.userData.waterfall = true;
    waterfall.add(fallingWater);
    const stream = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 4.1, 7, 8),
      new THREE.MeshBasicMaterial({ color: 0x50bfc8, transparent: true, opacity: 0.66, side: THREE.DoubleSide })
    );
    stream.rotation.x = -Math.PI / 2;
    stream.rotation.z = -0.28;
    stream.position.set(1.1, 0.18, 1.8);
    stream.userData.waterfall = true;
    waterfall.add(stream);
    this.group.add(waterfall);
    this.waterRipples.push({ mesh: fallingWater, baseY: fallingWater.position.y, phase: 0.3 });
    this.waterRipples.push({ mesh: stream, baseY: stream.position.y, phase: 1.2 });
  }

  addPondLife() {
    const rippleMat = new THREE.MeshBasicMaterial({ color: 0xb5f4ee, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
    for (let index = 0; index < 5; index++) {
      const angle = index / 5 * Math.PI * 2 + 0.5;
      const ripple = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.29, 16), rippleMat.clone());
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.set(Math.sin(angle) * (1.5 + index % 2 * 1.5), 0.16, Math.cos(angle) * (1.5 + index % 2 * 1.5));
      this.group.add(ripple);
      this.waterRipples.push({ mesh: ripple, baseScale: 0.75 + index * 0.12, phase: index * 0.9 });
    }
    const fishMat = new THREE.MeshStandardMaterial({ color: 0xf3b85c, roughness: 0.55, flatShading: true });
    for (let index = 0; index < 4; index++) {
      const fish = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), index === 2 ? new THREE.MeshStandardMaterial({ color: 0x86d9ff, roughness: 0.5, flatShading: true }) : fishMat);
      body.scale.set(1.5, 0.55, 0.75);
      fish.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.34, 3), fishMat);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -0.28;
      fish.add(tail);
      fish.position.set(0, 0.2, 0);
      this.group.add(fish);
      this.fish.push({ mesh: fish, radius: 1.8 + index * 0.72, phase: index * 1.5, speed: 0.35 + index * 0.05 });
    }
  }

  addForestDetails() {
    const fernMat = new THREE.MeshStandardMaterial({ color: 0x4e9b55, roughness: 0.85, flatShading: true, side: THREE.DoubleSide });
    const mushroomMat = new THREE.MeshBasicMaterial({ color: 0x6ef0e0 });
    for (let index = 0; index < 28; index++) {
      const angle = index / 28 * Math.PI * 2 + 0.2;
      const radius = 7.7 + (index % 5) * 0.38;
      const fern = new THREE.Mesh(new THREE.ConeGeometry(0.18 + index % 3 * 0.05, 0.65 + index % 2 * 0.2, 5), fernMat);
      fern.position.set(Math.sin(angle) * radius, 0.35, Math.cos(angle) * radius);
      fern.rotation.x = Math.PI;
      this.group.add(fern);
      if (index % 5 === 0) {
        const mushroom = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 5), mushroomMat);
        mushroom.position.copy(fern.position).add(new THREE.Vector3(0.24, -0.07, 0.12));
        mushroom.scale.y = 1.5;
        this.group.add(mushroom);
      }
    }
    for (const [x, z] of [[-8.5, -2.6], [-4.6, 7.2], [6.8, -5.9], [8.2, 1.8]]) this.addLantern(x, z);
  }

  addLantern(x, z) {
    const post = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 6), materials.wood);
    pole.position.y = 1.2;
    pole.castShadow = true;
    post.add(pole);
    const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), new THREE.MeshBasicMaterial({ color: 0xffcb70 }));
    lantern.position.set(0.2, 2.05, 0);
    post.add(lantern);
    const light = new THREE.PointLight(0xffbe68, 1.25, 7, 2);
    light.position.copy(lantern.position);
    post.add(light);
    post.position.set(x, 0, z);
    this.group.add(post);
    this.lanterns.push({ light, phase: x + z });
  }

  addFishingCat(dock) {
    const cat = new THREE.Group();
    const black = new THREE.MeshStandardMaterial({ color: 0x171c21, roughness: 0.85, flatShading: true });
    const white = new THREE.MeshStandardMaterial({ color: 0xf2eee3, roughness: 0.85, flatShading: true });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.43, 8, 6), black);
    body.scale.set(0.8, 1, 0.75);
    body.position.y = 0.83;
    cat.add(body);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), white);
    chest.position.set(0, 0.78, 0.31);
    chest.scale.set(0.7, 1, 0.3);
    cat.add(chest);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), black);
    head.position.set(0, 1.3, 0.08);
    cat.add(head);
    for (const x of [-0.2, 0.2]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.32, 4), black);
      ear.position.set(x, 1.63, 0.07);
      cat.add(ear);
    }
    cat.position.set(0, 0.32, -1.6);
    dock.add(cat);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 2.3, 5), materials.wood);
    rod.position.set(0.48, 1.25, -2.15);
    rod.rotation.z = -0.78;
    rod.rotation.x = -0.22;
    dock.add(rod);
  }

  addCampfire(x, y, z) {
    for (let index = 0; index < 7; index++) {
      const angle = index / 7 * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), materials.stone);
      stone.position.set(x + Math.cos(angle) * 0.58, y + 0.15, z + Math.sin(angle) * 0.58);
      this.group.add(stone);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.15, 6), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9 }));
    flame.position.set(x, y + 0.65, z);
    this.group.add(flame);
    for (const rotation of [-0.8, 0.8]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.15, 6), materials.wood);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = rotation;
      log.position.set(x, y + 0.18, z);
      this.group.add(log);
    }
    const light = new THREE.PointLight(0xffa44a, 2.5, 9, 1.7);
    light.position.copy(flame.position);
    this.group.add(light);
    for (let index = 0; index < 5; index++) {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + index * 0.025, 0), new THREE.MeshBasicMaterial({ color: 0xd9e4df, transparent: true, opacity: 0.38 }));
      puff.position.set(x, y + 1.3 + index * 0.35, z);
      this.group.add(puff);
      this.smoke.push({ mesh: puff, offset: index * 0.8 });
    }
  }

  addLilyPads() {
    for (let index = 0; index < 8; index++) {
      const angle = index / 8 * Math.PI * 2 + 0.3;
      const pad = new THREE.Mesh(new THREE.CircleGeometry(index % 3 === 0 ? 0.62 : 0.44, 8), materials.lily);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(Math.sin(angle) * (2.1 + index % 3), 0.22, Math.cos(angle) * (2.1 + index % 3));
      this.group.add(pad);
      if (index % 2 === 0) {
        const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.31, 0), new THREE.MeshStandardMaterial({ color: 0xf38fb0, roughness: 0.65, flatShading: true }));
        flower.position.copy(pad.position).add(new THREE.Vector3(0, 0.14, 0));
        flower.scale.y = 0.45;
        this.group.add(flower);
      }
    }
  }

  addFrog() {
    const frog = new THREE.Group();
    const frogMat = new THREE.MeshStandardMaterial({ color: 0x67a84b, roughness: 0.8, flatShading: true });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 7, 5), frogMat);
    body.scale.set(1.2, 0.7, 1);
    frog.add(body);
    for (const x of [-0.13, 0.13]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshBasicMaterial({ color: 0xf7f4d5 }));
      eye.position.set(x, 0.17, -0.13);
      frog.add(eye);
    }
    frog.position.set(3.6, 0.42, -1.6);
    this.group.add(frog);
  }

  isNearFarmPortal(position) {
    return position.distanceToSquared(this.farmPortalPosition) < 7.5;
  }

  isNearReturnPortal(position) {
    const returnPosition = this.returnPortal.getWorldPosition(new THREE.Vector3());
    return position.distanceToSquared(returnPosition) < 7.5;
  }

  getFishingArrival() {
    return this.spotPosition.clone().add(new THREE.Vector3(0, 0, 5.8));
  }

  getFarmArrival() {
    return this.farmPortalPosition.clone().add(new THREE.Vector3(0, 0, 2.4));
  }

  update(delta) {
    this.time += delta;
    for (const portal of [this.farmPortal, this.returnPortal]) {
      portal.userData.ring.rotation.z = this.time * 0.8;
      portal.userData.ring.scale.setScalar(1 + Math.sin(this.time * 2) * 0.05);
    }
    this.waterRipples.forEach(({ mesh, baseScale = 1, baseY, phase }) => {
      const pulse = 1 + Math.sin(this.time * 1.35 + phase) * 0.2;
      if (baseY !== undefined) mesh.position.y = baseY + Math.sin(this.time * 2 + phase) * 0.035;
      mesh.scale.setScalar(baseScale * pulse);
      if (mesh.material.opacity !== undefined) mesh.material.opacity = 0.16 + (pulse - 0.8) * 0.35;
    });
    this.fish.forEach(({ mesh, radius, phase, speed }) => {
      const angle = this.time * speed + phase;
      mesh.position.set(Math.sin(angle) * radius, 0.2 + Math.sin(this.time * 2 + phase) * 0.035, Math.cos(angle) * radius);
      mesh.rotation.y = -angle;
    });
    this.lanterns.forEach(({ light, phase }) => {
      light.intensity = 1.12 + Math.sin(this.time * 3 + phase) * 0.16;
    });
    this.smoke.forEach(({ mesh, offset }) => {
      mesh.position.x += Math.sin(this.time * 0.9 + offset) * delta * 0.18;
      mesh.position.z += Math.cos(this.time * 0.7 + offset) * delta * 0.12;
      mesh.position.y += delta * 0.12;
      if (mesh.position.y > 3.3) mesh.position.y = 1.35;
    });
  }
}