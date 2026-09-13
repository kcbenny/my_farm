import * as THREE from 'three';

export class KittyHomeSystem {
  constructor(scene, soundSystem, getTerrainHeight) {
    this.scene = scene;
    this.sound = soundSystem;
    this.getTerrainHeight = getTerrainHeight || ((x, z) => 0);

    // Site position
    this.position = new THREE.Vector3(12.5, 0, 12.5);
    this.position.y = this.getTerrainHeight(this.position.x, this.position.z);

    this.stage = 0; // 0: Blueprint, 1: Foundation, 2: Walls & Door, 3: Roof & Chimney, 4: Deluxe Castle!
    this.maxStage = 4;
    this.currentStyle = 'cabin'; // 'cabin' | 'fairy' | 'castle'

    this.styles = {
      cabin: { name: 'Cozy Log Cabin 🌱', icon: '🪵', primaryColor: 0x8b5e3c },
      fairy: { name: 'Pink Fairy Cottage 🌸', icon: '🌸', primaryColor: 0xff758f },
      castle: { name: 'Royal Gold Castle 🏰', icon: '👑', primaryColor: 0xffb703 }
    };

    this.materials = this.createMaterials();
    this.particles = [];

    this.initHomeSite();
  }

  setStyle(styleKey) {
    if (this.styles[styleKey]) {
      this.currentStyle = styleKey;
      this.rebuildHomeMesh();
      return true;
    }
    return false;
  }

  createMaterials() {
    return {
      blueprint: new THREE.MeshBasicMaterial({ color: 0x48cae4, wireframe: true, transparent: true, opacity: 0.6 }),
      woodFloor: new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.8, flatShading: true }),
      woodWall: new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.7, flatShading: true }),
      wallFairy: new THREE.MeshStandardMaterial({ color: 0xffcad4, roughness: 0.5, flatShading: true }),
      wallCastle: new THREE.MeshStandardMaterial({ color: 0xe0e1dd, roughness: 0.6, flatShading: true }),
      brickBase: new THREE.MeshStandardMaterial({ color: 0xbc4749, roughness: 0.85, flatShading: true }),
      roofPink: new THREE.MeshStandardMaterial({ color: 0xff758f, roughness: 0.6, flatShading: true }),
      roofGold: new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.3, metalness: 0.7, flatShading: true }),
      roofDarkPink: new THREE.MeshStandardMaterial({ color: 0xc9184a, roughness: 0.6, flatShading: true }),
      goldCrown: new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.3, metalness: 0.8, flatShading: true }),
      glassWindow: new THREE.MeshStandardMaterial({ color: 0xa2d2ff, roughness: 0.2, transparent: true, opacity: 0.8 }),
      cushionSoft: new THREE.MeshStandardMaterial({ color: 0xffc8dd, roughness: 0.9, flatShading: true }),
      chimneyStone: new THREE.MeshStandardMaterial({ color: 0x6c757d, roughness: 0.9, flatShading: true })
    };
  }

  initHomeSite() {
    this.mainGroup = new THREE.Group();
    this.mainGroup.name = 'Kitty_Home_System';
    this.mainGroup.position.copy(this.position);
    this.scene.add(this.mainGroup);

    // 1. Blueprint Ring Ground Marker
    const ringGeom = new THREE.RingGeometry(2.8, 3.2, 24);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x48cae4, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    this.blueprintRing = new THREE.Mesh(ringGeom, ringMat);
    this.blueprintRing.position.y = 0.08;
    this.mainGroup.add(this.blueprintRing);

    // Build mesh for initial stage 0
    this.rebuildHomeMesh();
  }

  rebuildHomeMesh() {
    // Remove previous home meshes
    if (this.homeMeshGroup) {
      this.mainGroup.remove(this.homeMeshGroup);
    }

    this.homeMeshGroup = new THREE.Group();
    this.homeMeshGroup.name = `Kitty_Home_Stage_${this.stage}`;

    if (this.stage === 0) {
      // Stage 0: Wireframe Blueprint Hologram
      const baseBoxGeom = new THREE.BoxGeometry(4.2, 2.8, 4.2);
      const blueprintMesh = new THREE.Mesh(baseBoxGeom, this.materials.blueprint);
      blueprintMesh.position.y = 1.4;
      this.homeMeshGroup.add(blueprintMesh);

      const roofConeGeom = new THREE.ConeGeometry(3.2, 1.8, 4);
      roofConeGeom.rotateY(Math.PI / 4);
      const roofMesh = new THREE.Mesh(roofConeGeom, this.materials.blueprint);
      roofMesh.position.y = 3.7;
      this.homeMeshGroup.add(roofMesh);

    } else {
      // Stage 1+: Solid Wooden Foundation & Stone Brick Base
      const foundationGeom = new THREE.BoxGeometry(4.6, 0.4, 4.6);
      const foundation = new THREE.Mesh(foundationGeom, this.materials.brickBase);
      foundation.position.y = 0.2;
      foundation.castShadow = true;
      foundation.receiveShadow = true;
      this.homeMeshGroup.add(foundation);

      const floorGeom = new THREE.BoxGeometry(4.2, 0.15, 4.2);
      const floor = new THREE.Mesh(floorGeom, this.materials.woodFloor);
      floor.position.y = 0.45;
      floor.castShadow = true;
      floor.receiveShadow = true;
      this.homeMeshGroup.add(floor);

      // Corner Wooden Posts
      const postGeom = new THREE.BoxGeometry(0.35, 2.4, 0.35);
      const corners = [
        [-1.9, 1.6, -1.9],
        [1.9, 1.6, -1.9],
        [-1.9, 1.6, 1.9],
        [1.9, 1.6, 1.9],
      ];
      corners.forEach(([cx, cy, cz]) => {
        const post = new THREE.Mesh(postGeom, this.materials.woodFloor);
        post.position.set(cx, cy, cz);
        post.castShadow = true;
        this.homeMeshGroup.add(post);
      });
    }

    if (this.stage >= 2) {
      // Stage 2+: Cozy Walls & Cat-Ear Arch Door & Glass Windows
      const wallMat = this.materials.woodWall;

      // Back Wall
      const wallBackGeom = new THREE.BoxGeometry(4.2, 2.4, 0.2);
      const wallBack = new THREE.Mesh(wallBackGeom, wallMat);
      wallBack.position.set(0, 1.65, -1.9);
      wallBack.castShadow = true;
      this.homeMeshGroup.add(wallBack);

      // Left Wall with Window
      const wallLeftGeom = new THREE.BoxGeometry(0.2, 2.4, 4.2);
      const wallLeft = new THREE.Mesh(wallLeftGeom, wallMat);
      wallLeft.position.set(-1.9, 1.65, 0);
      wallLeft.castShadow = true;
      this.homeMeshGroup.add(wallLeft);

      // Window Frame L
      const windowL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.0, 1.2), this.materials.glassWindow);
      windowL.position.set(-1.9, 1.8, 0);
      this.homeMeshGroup.add(windowL);

      // Right Wall
      const wallRightGeom = new THREE.BoxGeometry(0.2, 2.4, 4.2);
      const wallRight = new THREE.Mesh(wallRightGeom, wallMat);
      wallRight.position.set(1.9, 1.65, 0);
      wallRight.castShadow = true;
      this.homeMeshGroup.add(wallRight);

      // Front Wall with Cat-Ear Door Arch
      const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.2), wallMat);
      frontLeft.position.set(-1.3, 1.65, 1.9);
      frontLeft.castShadow = true;
      this.homeMeshGroup.add(frontLeft);

      const frontRight = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.2), wallMat);
      frontRight.position.set(1.3, 1.65, 1.9);
      frontRight.castShadow = true;
      this.homeMeshGroup.add(frontRight);

      const frontTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.2), wallMat);
      frontTop.position.set(0, 2.45, 1.9);
      frontTop.castShadow = true;
      this.homeMeshGroup.add(frontTop);

      // Cute Cat-shaped Doorway Frame
      const doorFrame = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 6, 12), this.materials.roofPink);
      doorFrame.position.set(0, 1.2, 1.95);
      doorFrame.rotation.z = Math.PI / 2;
      this.homeMeshGroup.add(doorFrame);
    }

    if (this.stage >= 3) {
      // Stage 3+: Pink A-Frame Roof & Stone Chimney
      const roofGeom = new THREE.ConeGeometry(3.6, 2.0, 4);
      roofGeom.rotateY(Math.PI / 4);
      const roof = new THREE.Mesh(roofGeom, this.materials.roofPink);
      roof.position.y = 3.85;
      roof.castShadow = true;
      this.homeMeshGroup.add(roof);

      // Eaves Accent Rim
      const eaveGeom = new THREE.ConeGeometry(3.8, 0.3, 4);
      eaveGeom.rotateY(Math.PI / 4);
      const eave = new THREE.Mesh(eaveGeom, this.materials.roofDarkPink);
      eave.position.y = 2.95;
      eave.castShadow = true;
      this.homeMeshGroup.add(eave);

      // Chimney
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), this.materials.chimneyStone);
      chimney.position.set(1.2, 4.2, -0.8);
      chimney.castShadow = true;
      this.homeMeshGroup.add(chimney);
    }

    if (this.stage >= 4) {
      // Stage 4: Deluxe Kitty Castle Accessories (Golden Crown Paw, Plush Cat Beds, Scratching Post)
      // Golden Crown Paw Emblem on Roof Peak
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), this.materials.goldCrown);
      crown.position.set(0, 5.1, 0);
      this.homeMeshGroup.add(crown);

      // Exterior Plush Cushion Porch Bed
      const bedBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.3, 12), this.materials.cushionSoft);
      bedBase.position.set(-1.2, 0.65, 2.8);
      bedBase.castShadow = true;
      this.homeMeshGroup.add(bedBase);

      // Scratching Post Tree
      const scratchPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8), this.materials.woodFloor);
      scratchPost.position.set(1.4, 1.4, 2.8);
      scratchPost.castShadow = true;
      this.homeMeshGroup.add(scratchPost);

      const scratchPlatform = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 10), this.materials.roofPink);
      scratchPlatform.position.set(1.4, 2.3, 2.8);
      scratchPlatform.castShadow = true;
      this.homeMeshGroup.add(scratchPlatform);
    }

    // Bounce-in animation scale
    this.homeMeshGroup.scale.set(0.01, 0.01, 0.01);
    this.mainGroup.add(this.homeMeshGroup);
  }

  getStageRequirements() {
    const styleReqs = {
      cabin: [
        {
          stage: 0,
          title: 'Stage 1: Foundation & Wooden Floor',
          desc: 'Build sturdy stone foundation & wooden floor!',
          costCoins: 50, costWood: 5, costBricks: 3, costRoof: 0, costCushions: 0, costGoldenStars: 0, costDiamonds: 0
        },
        {
          stage: 1,
          title: 'Stage 2: Cozy Log Walls & Cat Door',
          desc: 'Erect warm wooden log walls with cat-ear arch doorway!',
          costCoins: 100, costWood: 8, costBricks: 5, costRoof: 0, costCushions: 0, costGoldenStars: 0, costDiamonds: 0
        },
        {
          stage: 2,
          title: 'Stage 3: Pink Roof & Stone Chimney',
          desc: 'Add adorable pink roof tiles and stone chimney!',
          costCoins: 150, costWood: 10, costBricks: 8, costRoof: 10, costCushions: 0, costGoldenStars: 0, costDiamonds: 1
        },
        {
          stage: 3,
          title: 'Stage 4: Deluxe Porch & Scratching Tree',
          desc: 'Add Golden Crown, Scratching Post & Plush Beds!',
          costCoins: 250, costWood: 12, costBricks: 10, costRoof: 15, costCushions: 4, costGoldenStars: 1, costDiamonds: 3
        }
      ],
      fairy: [
        {
          stage: 0,
          title: 'Stage 1: Fairy Pastel Foundation',
          desc: 'Lay magical pink stone foundation & tile base!',
          costCoins: 70, costWood: 4, costBricks: 6, costRoof: 4, costCushions: 0, costGoldenStars: 0, costDiamonds: 0
        },
        {
          stage: 1,
          title: 'Stage 2: Fairy Walls & Flower Windows',
          desc: 'Erect pastel walls with flower window frames & cat doorway!',
          costCoins: 120, costWood: 6, costBricks: 8, costRoof: 8, costCushions: 0, costGoldenStars: 0, costDiamonds: 1
        },
        {
          stage: 2,
          title: 'Stage 3: Crystal Pink Roof & Chimney',
          desc: 'Top with glowing pink roof tiles and garden chimney!',
          costCoins: 180, costWood: 8, costBricks: 10, costRoof: 15, costCushions: 2, costGoldenStars: 1, costDiamonds: 2
        },
        {
          stage: 3,
          title: 'Stage 4: Royal Fairy Garden & Plush Palace',
          desc: 'Add Plush Cat Cushions & Golden Star Crown!',
          costCoins: 300, costWood: 10, costBricks: 12, costRoof: 20, costCushions: 8, costGoldenStars: 3, costDiamonds: 5
        }
      ],
      castle: [
        {
          stage: 0,
          title: 'Stage 1: Castle Moat & Marble Base',
          desc: 'Construct grand stone brick castle foundation!',
          costCoins: 100, costWood: 6, costBricks: 10, costRoof: 0, costCushions: 0, costGoldenStars: 0, costDiamonds: 0
        },
        {
          stage: 1,
          title: 'Stage 2: Royal Turret Walls & Archway',
          desc: 'Erect stone turret walls & royal archway!',
          costCoins: 200, costWood: 8, costBricks: 15, costRoof: 10, costCushions: 0, costGoldenStars: 1, costDiamonds: 1
        },
        {
          stage: 2,
          title: 'Stage 3: Golden Spire Roof & Crown Peak',
          desc: 'Build golden roof spires & stone chimney tower!',
          costCoins: 300, costWood: 10, costBricks: 20, costRoof: 20, costCushions: 4, costGoldenStars: 3, costDiamonds: 3
        },
        {
          stage: 3,
          title: 'Stage 4: Royal Castle & Plush Throne',
          desc: 'Crown with Golden Paw Peak & Deluxe Plush Cushion Throne!',
          costCoins: 500, costWood: 15, costBricks: 25, costRoof: 25, costCushions: 12, costGoldenStars: 5, costDiamonds: 8
        }
      ]
    };

    const reqs = styleReqs[this.currentStyle] || styleReqs.cabin;

    if (this.stage >= this.maxStage) {
      return null; // Fully Built!
    }
    return reqs[this.stage];
  }

  getMissingMaterials(ownedMaterials = {}, ownedCoins = 0, ownedDiamonds = 0) {
    const reqs = this.getStageRequirements();
    if (!reqs) return null;

    ownedMaterials = ownedMaterials || {};
    ownedCoins = ownedCoins || 0;
    ownedDiamonds = ownedDiamonds || 0;

    const missing = [];

    const woodNeeded = reqs.costWood || 0;
    const woodOwned = ownedMaterials.wood || 0;
    if (woodOwned < woodNeeded) {
      missing.push({ name: 'Wood Planks 🪵', owned: woodOwned, needed: woodNeeded, diff: woodNeeded - woodOwned, shopKey: 'wood' });
    }

    const bricksNeeded = reqs.costBricks || 0;
    const bricksOwned = ownedMaterials.bricks || 0;
    if (bricksOwned < bricksNeeded) {
      missing.push({ name: 'Stone Bricks 🧱', owned: bricksOwned, needed: bricksNeeded, diff: bricksNeeded - bricksOwned, shopKey: 'bricks' });
    }

    const roofNeeded = reqs.costRoof || 0;
    const roofOwned = ownedMaterials.roofTiles || 0;
    if (roofOwned < roofNeeded) {
      missing.push({ name: 'Pink Roof Tiles 🏠', owned: roofOwned, needed: roofNeeded, diff: roofNeeded - roofOwned, shopKey: 'roofTiles' });
    }

    const cushionsNeeded = reqs.costCushions || 0;
    const cushionsOwned = ownedMaterials.cushions || 0;
    if (cushionsOwned < cushionsNeeded) {
      missing.push({ name: 'Plush Cushions 🛋️', owned: cushionsOwned, needed: cushionsNeeded, diff: cushionsNeeded - cushionsOwned, shopKey: 'cushions' });
    }

    const starsNeeded = reqs.costGoldenStars || 0;
    const starsOwned = ownedMaterials.goldenStars || 0;
    if (starsOwned < starsNeeded) {
      missing.push({ name: 'Golden Kitty Stars ⭐', owned: starsOwned, needed: starsNeeded, diff: starsNeeded - starsOwned, shopKey: 'goldenStars' });
    }

    if (ownedCoins < reqs.costCoins) {
      missing.push({ name: 'Kitty Coins 🪙', owned: ownedCoins, needed: reqs.costCoins, diff: reqs.costCoins - ownedCoins, shopKey: 'coins' });
    }

    if (ownedDiamonds < (reqs.costDiamonds || 0)) {
      missing.push({ name: 'Diamonds 💎', owned: ownedDiamonds, needed: reqs.costDiamonds, diff: reqs.costDiamonds - ownedDiamonds, shopKey: 'diamonds' });
    }

    return {
      stageTitle: reqs.title,
      stageDesc: reqs.desc,
      styleName: this.styles[this.currentStyle].name,
      missingList: missing,
      isComplete: missing.length === 0
    };
  }

  upgradeStage() {
    if (this.stage >= this.maxStage) return false;

    this.stage++;
    this.rebuildHomeMesh();
    this.spawnBuildParticles();

    if (this.sound) this.sound.playQuestComplete();
    return true;
  }

  spawnBuildParticles() {
    // Sawdust, golden stars, and smoke burst
    const colors = [0xffb703, 0xff758f, 0x48cae4, 0xffffff];

    for (let i = 0; i < 35; i++) {
      const pGeom = new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.12);
      const pMat = new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
      const pMesh = new THREE.Mesh(pGeom, pMat);

      pMesh.position.copy(this.position);
      pMesh.position.x += (Math.random() - 0.5) * 4.0;
      pMesh.position.y += 0.5 + Math.random() * 2.5;
      pMesh.position.z += (Math.random() - 0.5) * 4.0;

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        3.5 + Math.random() * 4.0,
        (Math.random() - 0.5) * 5
      );

      this.scene.add(pMesh);
      this.particles.push({
        mesh: pMesh,
        vel,
        life: 1.2
      });
    }
  }

  update(delta, playerPos) {
    // Smoothly scale up new stage mesh
    if (this.homeMeshGroup && this.homeMeshGroup.scale.x < 1.0) {
      const cur = this.homeMeshGroup.scale.x;
      const next = Math.min(1.0, cur + delta * 3.5);
      this.homeMeshGroup.scale.set(next, next, next);
    }

    // Blueprint ring pulse & rotate
    if (this.blueprintRing) {
      this.blueprintRing.rotation.z += delta * 0.8;
    }

    // Chimney Smoke Particles when Stage >= 3
    if (this.stage >= 3 && Math.random() < 0.15) {
      const smokeGeom = new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.1);
      const smokeMat = new THREE.MeshBasicMaterial({ color: 0xe0e1dd, transparent: true, opacity: 0.6 });
      const smoke = new THREE.Mesh(smokeGeom, smokeMat);

      smoke.position.set(
        this.position.x + 1.2 + (Math.random() - 0.5) * 0.2,
        this.position.y + 4.9,
        this.position.z - 0.8 + (Math.random() - 0.5) * 0.2
      );

      this.scene.add(smoke);
      this.particles.push({
        mesh: smoke,
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.3, 1.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.3),
        life: 1.8
      });
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.scale.multiplyScalar(0.97);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  getDistanceToPlayer(playerPos) {
    return this.position.distanceTo(playerPos);
  }
}