import * as THREE from 'three';
import { PBRTextureGenerator } from '../assets/PBRTextureGenerator.js';

/**
 * Modular 3D Crop Models with 4 Distinct Growth Stages:
 * 1. Seed/Sprout ('sprout')
 * 2. Early Growth ('early')
 * 3. Mature ('mature')
 * 4. Harvested/Wilted ('wilted')
 *
 * Technical Specs:
 * - Clean origin point anchored at the bottom center (0, 0, 0) for grid snapping & scaling.
 * - Max < 1,500 triangles per crop mesh state.
 * - Clean PBR texturing with BaseColor, Normal, and packed ORM maps.
 * - 1 unit = 1 meter real-world agricultural scale.
 */
export class ModularCropModels {
  static materials = null;

  static initMaterials() {
    if (this.materials) return;

    // Soil & Earth
    const soilMat = PBRTextureGenerator.createPBRMaterial('tile_tilled', {
      roughness: 0.9,
      metalness: 0.0
    });

    // Crops PBR materials
    const wheatMat = PBRTextureGenerator.createPBRMaterial('crop_wheat', {
      roughness: 0.7,
      metalness: 0.0
    });

    const cornMat = PBRTextureGenerator.createPBRMaterial('crop_corn', {
      roughness: 0.55,
      metalness: 0.0
    });

    const tomatoMat = PBRTextureGenerator.createPBRMaterial('crop_tomato', {
      roughness: 0.3, // Glossy ripe tomato skin
      metalness: 0.0
    });

    const carrotMat = PBRTextureGenerator.createPBRMaterial('crop_carrot', {
      roughness: 0.6,
      metalness: 0.0
    });

    // Foliage & Plant Greens
    const leafMat = PBRTextureGenerator.createPBRMaterial('tile_grass', {
      color: 0x489620,
      roughness: 0.65,
      metalness: 0.0
    });

    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x3d7e1c,
      roughness: 0.7,
      metalness: 0.0
    });

    // Wilted / Dry remnants
    const wiltedMat = new THREE.MeshStandardMaterial({
      color: 0x8c734b,
      roughness: 0.95,
      metalness: 0.0
    });

    const woodStakeMat = new THREE.MeshStandardMaterial({
      color: 0x7c5a3d,
      roughness: 0.85,
      metalness: 0.0
    });

    const flowerYellowMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      roughness: 0.5,
      metalness: 0.0
    });

    this.materials = {
      soilMat,
      wheatMat,
      cornMat,
      tomatoMat,
      carrotMat,
      leafMat,
      stemMat,
      wiltedMat,
      woodStakeMat,
      flowerYellowMat
    };
  }

  /**
   * Builds crop mesh group anchored at (0, 0, 0)
   * @param {string} type - 'wheat' | 'corn' | 'tomato' | 'carrot'
   * @param {string} stage - 'sprout' | 'early' | 'mature' | 'wilted'
   * @returns {THREE.Group}
   */
  static createCrop(type, stage = 'mature') {
    this.initMaterials();

    const root = new THREE.Group();
    root.name = `Crop_${type}_${stage}`;

    switch (type.toLowerCase()) {
      case 'wheat':
        this.buildWheat(root, stage);
        break;
      case 'corn':
        this.buildCorn(root, stage);
        break;
      case 'tomato':
      case 'tomatoes':
        this.buildTomato(root, stage);
        break;
      case 'carrot':
      case 'carrots':
        this.buildCarrot(root, stage);
        break;
      default:
        this.buildWheat(root, stage);
        break;
    }

    return root;
  }

  // ==========================================
  // 1. WHEAT (4 STAGES)
  // ==========================================
  static buildWheat(root, stage) {
    const { soilMat, wheatMat, leafMat, wiltedMat } = this.materials;

    // Base soil mound
    const moundGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.28, 0.35, 0.06, 8));
    const mound = new THREE.Mesh(moundGeom, soilMat);
    mound.position.y = 0.03;
    mound.receiveShadow = true;
    root.add(mound);

    if (stage === 'sprout') {
      // Stage 1: Seed / Sprout - Delicate green seedlings emerging
      const sproutCount = 6;
      for (let i = 0; i < sproutCount; i++) {
        const angle = (i / sproutCount) * Math.PI * 2;
        const dist = 0.08 + (i % 2) * 0.06;
        const geom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.02, 0.14, 5));
        const sprout = new THREE.Mesh(geom, leafMat);
        sprout.position.set(Math.cos(angle) * dist, 0.08, Math.sin(angle) * dist);
        sprout.rotation.set(0.15 * Math.sin(angle), angle, 0.15 * Math.cos(angle));
        sprout.castShadow = true;
        root.add(sprout);
      }
    } else if (stage === 'early') {
      // Stage 2: Early Growth - Lush green wheat grass cluster (~0.45m tall)
      const bladeCount = 14;
      for (let i = 0; i < bladeCount; i++) {
        const angle = (i / bladeCount) * Math.PI * 2 + (i * 0.3);
        const dist = 0.06 + (i % 3) * 0.05;
        const height = 0.38 + (i % 4) * 0.05;
        const geom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.015, 0.025, height, 5));
        const stalk = new THREE.Mesh(geom, leafMat);
        stalk.position.set(Math.cos(angle) * dist, height * 0.5, Math.sin(angle) * dist);
        stalk.rotation.set(0.18 * Math.cos(angle), angle, 0.18 * Math.sin(angle));
        stalk.castShadow = true;
        root.add(stalk);
      }
    } else if (stage === 'mature') {
      // Stage 3: Mature - Golden amber waving wheat stalks with grain heads (~0.95m tall)
      const stalkCount = 18;
      for (let i = 0; i < stalkCount; i++) {
        const angle = (i / stalkCount) * Math.PI * 2 + (i * 0.4);
        const dist = 0.08 + (i % 4) * 0.05;
        const totalHeight = 0.85 + (i % 3) * 0.08;

        // Slender golden stalk
        const stalkGeom = PBRTextureGenerator.setupGeometryUV2(
          new THREE.CylinderGeometry(0.012, 0.02, totalHeight, 5)
        );
        const stalk = new THREE.Mesh(stalkGeom, wheatMat);
        stalk.position.set(Math.cos(angle) * dist, totalHeight * 0.5, Math.sin(angle) * dist);
        const lean = 0.12 + (i % 3) * 0.05;
        stalk.rotation.set(lean * Math.cos(angle), angle, lean * Math.sin(angle));
        stalk.castShadow = true;
        root.add(stalk);

        // Ripe grain head at top
        const grainGeom = PBRTextureGenerator.setupGeometryUV2(
          new THREE.CylinderGeometry(0.032, 0.038, 0.22, 6)
        );
        const grain = new THREE.Mesh(grainGeom, wheatMat);
        grain.position.set(
          Math.cos(angle) * (dist + totalHeight * lean * 0.5),
          totalHeight + 0.08,
          Math.sin(angle) * (dist + totalHeight * lean * 0.5)
        );
        grain.rotation.set(lean * 1.5 * Math.cos(angle), angle, lean * 1.5 * Math.sin(angle));
        grain.castShadow = true;
        root.add(grain);

        // Whiskers / Awns at head tip
        const awnGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.015, 0.1, 4));
        const awn = new THREE.Mesh(awnGeom, wheatMat);
        awn.position.set(grain.position.x, grain.position.y + 0.12, grain.position.z);
        awn.rotation.copy(grain.rotation);
        root.add(awn);
      }
    } else {
      // Stage 4: Harvested / Wilted - Cut stubble stalks on dry earth (~0.15m tall)
      const stubbleCount = 14;
      for (let i = 0; i < stubbleCount; i++) {
        const angle = (i / stubbleCount) * Math.PI * 2;
        const dist = 0.06 + (i % 3) * 0.06;
        const h = 0.1 + (i % 3) * 0.06;
        const geom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.02, 0.025, h, 4));
        const stubble = new THREE.Mesh(geom, wiltedMat);
        stubble.position.set(Math.cos(angle) * dist, h * 0.5, Math.sin(angle) * dist);
        stubble.rotation.set(0.1 * (i % 2 === 0 ? 1 : -1), angle, 0.1);
        stubble.castShadow = true;
        root.add(stubble);
      }
    }
  }

  // ==========================================
  // 2. CORN (4 STAGES)
  // ==========================================
  static buildCorn(root, stage) {
    const { soilMat, cornMat, leafMat, wiltedMat } = this.materials;

    const moundGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.32, 0.4, 0.07, 8));
    const mound = new THREE.Mesh(moundGeom, soilMat);
    mound.position.y = 0.035;
    mound.receiveShadow = true;
    root.add(mound);

    if (stage === 'sprout') {
      // Stage 1: Seed / Sprout - Dual arching seedling leaves (~0.15m tall)
      const stemGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.025, 0.03, 0.12, 5));
      const stem = new THREE.Mesh(stemGeom, leafMat);
      stem.position.y = 0.06;
      root.add(stem);

      for (let i = 0; i < 2; i++) {
        const leafGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.05, 0.16, 4));
        leafGeom.scale(1.4, 1.0, 0.3);
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        const sign = i === 0 ? 1 : -1;
        leaf.position.set(sign * 0.06, 0.12, 0);
        leaf.rotation.set(0, 0, sign * 0.7);
        leaf.castShadow = true;
        root.add(leaf);
      }
    } else if (stage === 'early') {
      // Stage 2: Early Growth - Thick green stalk with 4 alternate broad leaves (~0.7m tall)
      const stalkGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.04, 0.055, 0.7, 6));
      const stalk = new THREE.Mesh(stalkGeom, leafMat);
      stalk.position.y = 0.35;
      stalk.castShadow = true;
      root.add(stalk);

      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI * 0.55;
        const ly = 0.25 + i * 0.12;
        const leafGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.08, 0.45, 4));
        leafGeom.scale(1.5, 1.0, 0.25);
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        leaf.position.set(Math.cos(angle) * 0.12, ly, Math.sin(angle) * 0.12);
        leaf.rotation.set(0.4 * Math.sin(angle), angle, 0.4 * Math.cos(angle));
        leaf.castShadow = true;
        root.add(leaf);
      }
    } else if (stage === 'mature') {
      // Stage 3: Mature - Full corn stalk (~1.6m tall) with 2 ripe cobs and silk tassels
      const stalkHeight = 1.6;
      const stalkGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.045, 0.065, stalkHeight, 7));
      const stalk = new THREE.Mesh(stalkGeom, leafMat);
      stalk.position.y = stalkHeight * 0.5;
      stalk.castShadow = true;
      root.add(stalk);

      // Top flower tassel
      const tasselGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.12, 0.3, 5));
      const tassel = new THREE.Mesh(tasselGeom, cornMat);
      tassel.position.y = stalkHeight + 0.12;
      root.add(tassel);

      // 6 Broad drooping corn leaves
      for (let l = 0; l < 6; l++) {
        const angle = l * (Math.PI * 0.65);
        const ly = 0.45 + l * 0.18;
        const leafGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.1, 0.55, 4));
        leafGeom.scale(1.5, 1.0, 0.2);
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        leaf.position.set(Math.cos(angle) * 0.15, ly, Math.sin(angle) * 0.15);
        leaf.rotation.set(0.4 * Math.sin(angle), angle, 0.4 * Math.cos(angle));
        leaf.castShadow = true;
        root.add(leaf);
      }

      // 2 Ripe Corn Cobs with green husk and golden silk
      const cobPositions = [
        { y: 0.75, angle: 0.4 },
        { y: 1.05, angle: Math.PI + 0.3 }
      ];

      cobPositions.forEach(cp => {
        const cobGroup = new THREE.Group();
        cobGroup.position.set(Math.cos(cp.angle) * 0.12, cp.y, Math.sin(cp.angle) * 0.12);
        cobGroup.rotation.set(0.4 * Math.sin(cp.angle), cp.angle, 0.4 * Math.cos(cp.angle));

        // Corn cob core (yellow kernels)
        const cobGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.06, 0.065, 0.34, 7));
        const cob = new THREE.Mesh(cobGeom, cornMat);
        cob.castShadow = true;
        cobGroup.add(cob);

        // Green husk wrapping
        const huskGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.075, 0.075, 0.22, 6, 1, true));
        const husk = new THREE.Mesh(huskGeom, leafMat);
        husk.position.y = -0.06;
        cobGroup.add(husk);

        // Silk tassel at cob tip
        const silkGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.03, 0.12, 4));
        const silk = new THREE.Mesh(silkGeom, cornMat);
        silk.position.y = 0.2;
        cobGroup.add(silk);

        root.add(cobGroup);
      });
    } else {
      // Stage 4: Harvested / Wilted - Chopped dried stalk with brown bent leaves (~0.38m tall)
      const stalkGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.045, 0.06, 0.38, 5));
      const stalk = new THREE.Mesh(stalkGeom, wiltedMat);
      stalk.position.y = 0.22;
      stalk.rotation.z = 0.08;
      stalk.castShadow = true;
      root.add(stalk);

      for (let i = 0; i < 3; i++) {
        const angle = i * (Math.PI * 0.65);
        const dryLeafGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.07, 0.32, 4));
        dryLeafGeom.scale(1.3, 1.0, 0.2);
        const dryLeaf = new THREE.Mesh(dryLeafGeom, wiltedMat);
        dryLeaf.position.set(Math.cos(angle) * 0.08, 0.2, Math.sin(angle) * 0.08);
        dryLeaf.rotation.set(0.6 * Math.sin(angle), angle, 0.6 * Math.cos(angle));
        root.add(dryLeaf);
      }
    }
  }

  // ==========================================
  // 3. TOMATOES (4 STAGES)
  // ==========================================
  static buildTomato(root, stage) {
    const { soilMat, tomatoMat, leafMat, woodStakeMat, wiltedMat, flowerYellowMat } = this.materials;

    const moundGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.3, 0.38, 0.06, 8));
    const mound = new THREE.Mesh(moundGeom, soilMat);
    mound.position.y = 0.03;
    mound.receiveShadow = true;
    root.add(mound);

    if (stage === 'sprout') {
      // Stage 1: Seed / Sprout - Young seedling with cotyledons (~0.1m tall)
      const stemGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.02, 0.025, 0.1, 5));
      const stem = new THREE.Mesh(stemGeom, leafMat);
      stem.position.y = 0.05;
      root.add(stem);

      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const leafGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.045, 6, 5));
        leafGeom.scale(1.2, 0.2, 1.5);
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        leaf.position.set(Math.cos(angle) * 0.05, 0.1, Math.sin(angle) * 0.05);
        leaf.rotation.y = angle;
        root.add(leaf);
      }
    } else if (stage === 'early') {
      // Stage 2: Early Growth - Bushy tomato plant with stake and yellow blossoms (~0.55m tall)
      const stakeGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 5));
      const stake = new THREE.Mesh(stakeGeom, woodStakeMat);
      stake.position.set(0.04, 0.3, 0);
      stake.castShadow = true;
      root.add(stake);

      const vineGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.025, 0.035, 0.5, 6));
      const vine = new THREE.Mesh(vineGeom, leafMat);
      vine.position.set(-0.02, 0.25, 0);
      root.add(vine);

      // Leaves
      for (let i = 0; i < 5; i++) {
        const angle = i * 1.3;
        const ly = 0.15 + i * 0.08;
        const leafCluster = new THREE.Mesh(
          PBRTextureGenerator.setupGeometryUV2(new THREE.DodecahedronGeometry(0.09, 0)),
          leafMat
        );
        leafCluster.position.set(Math.cos(angle) * 0.16, ly, Math.sin(angle) * 0.16);
        leafCluster.castShadow = true;
        root.add(leafCluster);
      }

      // Yellow flower blossoms
      for (let f = 0; f < 3; f++) {
        const flower = new THREE.Mesh(
          PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.04, 0.05, 5)),
          flowerYellowMat
        );
        flower.position.set((f - 1) * 0.12, 0.42, 0.08);
        flower.rotation.x = Math.PI * 0.5;
        root.add(flower);
      }
    } else if (stage === 'mature') {
      // Stage 3: Mature - Tall stake with lush vine, cluster of ripe red tomatoes (~1.15m tall)
      const stakeHeight = 1.2;
      const stakeGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.03, 0.035, stakeHeight, 6));
      const stake = new THREE.Mesh(stakeGeom, woodStakeMat);
      stake.position.set(0.05, stakeHeight * 0.5, 0);
      stake.castShadow = true;
      root.add(stake);

      // Central twisty vine
      const vineGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.03, 0.045, 1.05, 6));
      const vine = new THREE.Mesh(vineGeom, leafMat);
      vine.position.set(-0.02, 0.53, 0);
      root.add(vine);

      // Rich leafy foliage bunches (optimized low-poly dodecahedron)
      const leafBunches = [
        { x: -0.16, y: 0.38, z: 0.12, scale: 0.18 },
        { x: 0.18, y: 0.58, z: -0.14, scale: 0.2 },
        { x: -0.15, y: 0.78, z: 0.15, scale: 0.22 },
        { x: 0.14, y: 0.95, z: 0.08, scale: 0.18 },
        { x: -0.05, y: 1.1, z: -0.1, scale: 0.16 }
      ];

      leafBunches.forEach(lb => {
        const geom = PBRTextureGenerator.setupGeometryUV2(new THREE.DodecahedronGeometry(lb.scale, 0));
        const bunch = new THREE.Mesh(geom, leafMat);
        bunch.position.set(lb.x, lb.y, lb.z);
        bunch.castShadow = true;
        root.add(bunch);
      });

      // Cluster of 5 Glossy Ripe Red Tomatoes
      const tomatoPositions = [
        { x: -0.18, y: 0.45, z: 0.16, r: 0.12 },
        { x: -0.22, y: 0.38, z: 0.05, r: 0.10 },
        { x: 0.16, y: 0.65, z: 0.18, r: 0.11 },
        { x: 0.22, y: 0.58, z: 0.08, r: 0.09 },
        { x: -0.12, y: 0.85, z: -0.12, r: 0.10 }
      ];

      tomatoPositions.forEach(tp => {
        const tomGroup = new THREE.Group();
        tomGroup.position.set(tp.x, tp.y, tp.z);

        // Tomato fruit sphere (optimized segments)
        const tomGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(tp.r, 8, 7));
        tomGeom.scale(1.05, 0.95, 1.05); // Plump & flattened
        const tomMesh = new THREE.Mesh(tomGeom, tomatoMat);
        tomMesh.castShadow = true;
        tomGroup.add(tomMesh);

        // Green calyx top star
        const calyxGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.05, 0.025, 4));
        const calyx = new THREE.Mesh(calyxGeom, leafMat);
        calyx.position.y = tp.r * 0.9;
        tomGroup.add(calyx);

        root.add(tomGroup);
      });
    } else {
      // Stage 4: Harvested / Wilted - Stake with dry withered vine and empty calyxes (~1.1m tall)
      const stakeGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.03, 0.035, 1.1, 5));
      const stake = new THREE.Mesh(stakeGeom, woodStakeMat);
      stake.position.set(0.05, 0.55, 0);
      root.add(stake);

      const dryVineGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.02, 0.025, 0.9, 5));
      const dryVine = new THREE.Mesh(dryVineGeom, wiltedMat);
      dryVine.position.set(-0.02, 0.48, 0);
      root.add(dryVine);

      // Limp withered brown foliage
      for (let i = 0; i < 3; i++) {
        const dryGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.DodecahedronGeometry(0.12, 0));
        const dryMesh = new THREE.Mesh(dryGeom, wiltedMat);
        dryMesh.position.set((i % 2 === 0 ? 0.14 : -0.14), 0.3 + i * 0.25, 0.05);
        dryMesh.scale.set(1.0, 0.4, 0.8);
        root.add(dryMesh);
      }
    }
  }

  // ==========================================
  // 4. CARROTS (4 STAGES)
  // ==========================================
  static buildCarrot(root, stage) {
    const { soilMat, carrotMat, leafMat, wiltedMat } = this.materials;

    const moundGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.26, 0.34, 0.06, 8));
    const mound = new THREE.Mesh(moundGeom, soilMat);
    mound.position.y = 0.03;
    mound.receiveShadow = true;
    root.add(mound);

    if (stage === 'sprout') {
      // Stage 1: Seed / Sprout - Feathery baby carrot rosette (~0.08m tall)
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const leafGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.025, 0.12, 4));
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        leaf.position.set(Math.cos(angle) * 0.05, 0.07, Math.sin(angle) * 0.05);
        leaf.rotation.set(0.3 * Math.sin(angle), angle, 0.3 * Math.cos(angle));
        leaf.castShadow = true;
        root.add(leaf);
      }
    } else if (stage === 'early') {
      // Stage 2: Early Growth - Feathery fern leaves (~0.3m tall) with orange shoulder poking up
      const shoulderGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.05, 0.07, 0.08, 7));
      const shoulder = new THREE.Mesh(shoulderGeom, carrotMat);
      shoulder.position.y = 0.06;
      shoulder.castShadow = true;
      root.add(shoulder);

      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const leafGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.05, 0.32, 4));
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        leaf.position.set(Math.cos(angle) * 0.06, 0.2, Math.sin(angle) * 0.06);
        leaf.rotation.set(0.28 * Math.sin(angle), angle, 0.28 * Math.cos(angle));
        leaf.castShadow = true;
        root.add(leaf);
      }
    } else if (stage === 'mature') {
      // Stage 3: Mature - Plump thick orange carrot root lifting out of ground (~0.55m tall)
      // Orange root body
      const rootGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.16, 0.45, 8));
      rootGeom.rotateX(Math.PI); // Point down
      const rootMesh = new THREE.Mesh(rootGeom, carrotMat);
      rootMesh.position.y = 0.22;
      rootMesh.castShadow = true;
      root.add(rootMesh);

      // Fluffy dense feathery carrot tops (8 plumes)
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const plumeHeight = 0.42 + (i % 2) * 0.08;
        const plumeGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.08, plumeHeight, 5));
        const plume = new THREE.Mesh(plumeGeom, leafMat);
        plume.position.set(Math.cos(angle) * 0.08, 0.42 + plumeHeight * 0.4, Math.sin(angle) * 0.08);
        plume.rotation.set(0.35 * Math.sin(angle), angle, 0.35 * Math.cos(angle));
        plume.castShadow = true;
        root.add(plume);
      }
    } else {
      // Stage 4: Harvested / Wilted - Pulled carrot depression / hole with limp wilted clippings
      const holeGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.12, 0.05, 0.04, 7));
      const holeMat = new THREE.MeshStandardMaterial({ color: 0x24140c, roughness: 1.0 });
      const hole = new THREE.Mesh(holeGeom, holeMat);
      hole.position.y = 0.06;
      root.add(hole);

      // Clipped wilted tops lying on the dirt mound
      for (let i = 0; i < 4; i++) {
        const angle = i * 1.5;
        const dryGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.04, 0.22, 4));
        const dryLeaf = new THREE.Mesh(dryGeom, wiltedMat);
        dryLeaf.position.set(Math.cos(angle) * 0.14, 0.07, Math.sin(angle) * 0.14);
        dryLeaf.rotation.set(Math.PI * 0.45, angle, 0);
        root.add(dryLeaf);
      }
    }
  }
}
