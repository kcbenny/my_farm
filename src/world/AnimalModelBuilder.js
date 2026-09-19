import * as THREE from 'three';
import { PBRTextureGenerator } from '../assets/PBRTextureGenerator.js';
import { AnimalAnimations } from './AnimalAnimations.js';

/**
 * Procedural Rigged 3D Livestock Model Builder
 * Species: Cow, Chicken, Sheep, and Pig
 *
 * Technical Specs:
 * - Real-world proportions (1 unit = 1 meter)
 * - Rigged with standard named bone armature nodes
 * - Clean PBR texturing with BaseColor, Normal, and packed ORM maps
 * - Poly budget: 1,500 to 3,500 tris (strictly <= 5,000 max)
 * - Returns { root, bones, clips } with "Idle", "Walk", "Eat", "Sleep" animations
 */
export class AnimalModelBuilder {
  static createAnimal(species = 'cow') {
    switch (species.toLowerCase()) {
      case 'cow':
        return this.buildCow();
      case 'chicken':
        return this.buildChicken();
      case 'sheep':
        return this.buildSheep();
      case 'pig':
        return this.buildPig();
      default:
        return this.buildCow();
    }
  }

  // ==========================================
  // 1. COW (DAIRY HOLSTEIN)
  // ==========================================
  static buildCow() {
    const root = new THREE.Group();
    root.name = 'Animal_Cow';

    const pbrMat = PBRTextureGenerator.createPBRMaterial('animal_cow', {
      roughness: 0.8,
      metalness: 0.0
    });

    const pinkMuzzleMat = new THREE.MeshStandardMaterial({
      color: 0xf7b2bd,
      roughness: 0.5,
      metalness: 0.0
    });

    const hornMat = new THREE.MeshStandardMaterial({
      color: 0xd6ccc2,
      roughness: 0.4,
      metalness: 0.05
    });

    const hoofMat = new THREE.MeshStandardMaterial({
      color: 0x2b2b2b,
      roughness: 0.7,
      metalness: 0.1
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.2
    });

    const baseHeight = 0.85; // Height of pelvis from ground

    // Bone Armature
    const bones = {};

    const pelvis = new THREE.Group();
    pelvis.name = 'Pelvis';
    pelvis.position.set(0, baseHeight, -0.3);
    root.add(pelvis);
    bones.pelvis = pelvis;

    // Rump & Hindquarters Mesh
    const rumpGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.48, 14, 12));
    rumpGeom.scale(0.85, 0.95, 1.05);
    const rumpMesh = new THREE.Mesh(rumpGeom, pbrMat);
    rumpMesh.castShadow = true;
    rumpMesh.receiveShadow = true;
    pelvis.add(rumpMesh);

    // Spine & Main Barrel Body
    const spine = new THREE.Group();
    spine.name = 'Spine';
    spine.position.set(0, 0.04, 0.4);
    pelvis.add(spine);
    bones.spine = spine;

    const barrelGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.46, 0.49, 0.65, 12));
    barrelGeom.rotateX(Math.PI / 2);
    barrelGeom.scale(0.88, 1.05, 1.0);
    const barrelMesh = new THREE.Mesh(barrelGeom, pbrMat);
    barrelMesh.castShadow = true;
    barrelMesh.receiveShadow = true;
    spine.add(barrelMesh);

    // Udder under belly
    const udderGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.18, 10, 8));
    udderGeom.scale(0.9, 0.7, 1.2);
    const udderMesh = new THREE.Mesh(udderGeom, pinkMuzzleMat);
    udderMesh.position.set(0, -0.38, -0.1);
    pelvis.add(udderMesh);

    // Chest & Shoulders
    const chest = new THREE.Group();
    chest.name = 'Chest';
    chest.position.set(0, 0.05, 0.45);
    spine.add(chest);
    bones.chest = chest;

    const shoulderGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.46, 12, 10));
    shoulderGeom.scale(0.85, 1.0, 0.95);
    const shoulderMesh = new THREE.Mesh(shoulderGeom, pbrMat);
    shoulderMesh.castShadow = true;
    chest.add(shoulderMesh);

    // Neck
    const neck = new THREE.Group();
    neck.name = 'Neck';
    neck.position.set(0, 0.22, 0.3);
    neck.rotation.x = 0.25;
    chest.add(neck);
    bones.neck = neck;

    const neckGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.24, 0.32, 0.4, 10));
    neckGeom.rotateX(0.2);
    const neckMesh = new THREE.Mesh(neckGeom, pbrMat);
    neckMesh.position.set(0, 0.1, 0.1);
    neckMesh.castShadow = true;
    neck.add(neckMesh);

    // Head
    const head = new THREE.Group();
    head.name = 'Head';
    head.position.set(0, 0.28, 0.25);
    neck.add(head);
    bones.head = head;

    const headGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.BoxGeometry(0.36, 0.38, 0.48));
    const headMesh = new THREE.Mesh(headGeom, pbrMat);
    headMesh.position.set(0, 0, 0);
    headMesh.castShadow = true;
    head.add(headMesh);

    // Broad pink snout / muzzle
    const muzzleGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.BoxGeometry(0.34, 0.24, 0.26));
    const muzzleMesh = new THREE.Mesh(muzzleGeom, pinkMuzzleMat);
    muzzleMesh.position.set(0, -0.09, 0.34);
    muzzleMesh.castShadow = true;
    head.add(muzzleMesh);

    // Nostrils
    for (let s = -1; s <= 1; s += 2) {
      const nostril = new THREE.Mesh(
        PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 6)),
        hoofMat
      );
      nostril.rotateX(Math.PI / 2);
      nostril.position.set(s * 0.08, -0.06, 0.48);
      head.add(nostril);
    }

    // Horns
    for (let s = -1; s <= 1; s += 2) {
      const hornGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.045, 0.22, 6));
      const horn = new THREE.Mesh(hornGeom, hornMat);
      horn.position.set(s * 0.18, 0.22, -0.06);
      horn.rotation.set(0.2, 0, -s * 0.6);
      horn.castShadow = true;
      head.add(horn);

      // Floppy Ears
      const earGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.07, 0.22, 5));
      earGeom.scale(1.0, 1.0, 0.3);
      const ear = new THREE.Mesh(earGeom, pbrMat);
      ear.position.set(s * 0.22, 0.12, -0.12);
      ear.rotation.set(-0.2, 0, -s * 1.1);
      ear.castShadow = true;
      head.add(ear);

      // Eyes
      const eye = new THREE.Mesh(
        PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.05, 8, 6)),
        eyeMat
      );
      eye.position.set(s * 0.19, 0.04, 0.12);
      head.add(eye);
    }

    // Legs: FL, FR on Chest; BL, BR on Pelvis
    const createLeg = (name, parent, posX, posZ) => {
      const legUpper = new THREE.Group();
      legUpper.name = `${name}_Upper`;
      legUpper.position.set(posX, -0.22, posZ);
      parent.add(legUpper);
      bones[`${name}_Upper`] = legUpper;

      // Upper thigh
      const upperGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.12, 0.09, 0.36, 8));
      const upperMesh = new THREE.Mesh(upperGeom, pbrMat);
      upperMesh.position.y = -0.14;
      upperMesh.castShadow = true;
      legUpper.add(upperMesh);

      const legLower = new THREE.Group();
      legLower.name = `${name}_Lower`;
      legLower.position.set(0, -0.32, 0);
      legUpper.add(legLower);
      bones[`${name}_Lower`] = legLower;

      // Lower shin & cloven hoof
      const lowerGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.08, 0.075, 0.34, 8));
      const lowerMesh = new THREE.Mesh(lowerGeom, pbrMat);
      lowerMesh.position.y = -0.14;
      lowerMesh.castShadow = true;
      legLower.add(lowerMesh);

      const hoofGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.BoxGeometry(0.14, 0.1, 0.16));
      const hoofMesh = new THREE.Mesh(hoofGeom, hoofMat);
      hoofMesh.position.set(0, -0.31, 0.02);
      hoofMesh.castShadow = true;
      legLower.add(hoofMesh);
    };

    createLeg('Leg_FL', chest, -0.3, 0.05);
    createLeg('Leg_FR', chest, 0.3, 0.05);
    createLeg('Leg_BL', pelvis, -0.3, -0.05);
    createLeg('Leg_BR', pelvis, 0.3, -0.05);

    // Tail
    const tail = new THREE.Group();
    tail.name = 'Tail';
    tail.position.set(0, 0.16, -0.45);
    tail.rotation.x = -0.35;
    pelvis.add(tail);
    bones.tail = tail;

    const tailGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.03, 0.02, 0.55, 6));
    const tailMesh = new THREE.Mesh(tailGeom, pbrMat);
    tailMesh.position.y = -0.26;
    tail.add(tailMesh);

    // Fluffy tail tuft at tip
    const tuftGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.07, 8, 6));
    tuftGeom.scale(0.8, 1.4, 0.8);
    const tuftMesh = new THREE.Mesh(tuftGeom, hoofMat);
    tuftMesh.position.y = -0.56;
    tail.add(tuftMesh);

    const clips = AnimalAnimations.getQuadrupedClips('cow', baseHeight);
    return { root, bones, clips, species: 'cow' };
  }

  // ==========================================
  // 2. CHICKEN
  // ==========================================
  static buildChicken() {
    const root = new THREE.Group();
    root.name = 'Animal_Chicken';

    const pbrMat = PBRTextureGenerator.createPBRMaterial('animal_chicken', {
      roughness: 0.75,
      metalness: 0.0
    });

    const rubyCombMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.4,
      metalness: 0.0
    });

    const yellowBeakMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      roughness: 0.35,
      metalness: 0.05
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.1
    });

    const baseHeight = 0.38;
    const bones = {};

    const pelvis = new THREE.Group();
    pelvis.name = 'Pelvis';
    pelvis.position.set(0, baseHeight, 0);
    root.add(pelvis);
    bones.pelvis = pelvis;

    // Plump round chicken body
    const bodyGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.24, 14, 12));
    bodyGeom.scale(0.9, 0.95, 1.2);
    const bodyMesh = new THREE.Mesh(bodyGeom, pbrMat);
    bodyMesh.castShadow = true;
    pelvis.add(bodyMesh);

    // Upright Tail Feathers Fan
    const tail = new THREE.Group();
    tail.name = 'Tail';
    tail.position.set(0, 0.1, -0.22);
    tail.rotation.x = -0.6;
    pelvis.add(tail);
    bones.tail = tail;

    for (let f = -2; f <= 2; f++) {
      const fanGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.06, 0.28, 4));
      fanGeom.scale(1.2, 1.0, 0.15);
      const fanMesh = new THREE.Mesh(fanGeom, pbrMat);
      fanMesh.position.set(f * 0.04, 0.12, 0);
      fanMesh.rotation.z = f * 0.18;
      fanMesh.castShadow = true;
      tail.add(fanMesh);
    }

    // Wings (Left & Right)
    for (let s = -1; s <= 1; s += 2) {
      const wingName = s < 0 ? 'Wing_L' : 'Wing_R';
      const wing = new THREE.Group();
      wing.name = wingName;
      wing.position.set(s * 0.2, 0.04, 0.02);
      wing.rotation.set(0.1, 0, s * -0.15);
      pelvis.add(wing);
      bones[wingName] = wing;

      const wingGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.16, 10, 8));
      wingGeom.scale(0.3, 0.8, 1.1);
      const wingMesh = new THREE.Mesh(wingGeom, pbrMat);
      wingMesh.castShadow = true;
      wing.add(wingMesh);
    }

    // Neck & Head
    const neck = new THREE.Group();
    neck.name = 'Neck';
    neck.position.set(0, 0.15, 0.16);
    pelvis.add(neck);
    bones.neck = neck;

    const neckGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.1, 0.14, 0.22, 10));
    neckGeom.rotateX(0.2);
    const neckMesh = new THREE.Mesh(neckGeom, pbrMat);
    neckMesh.position.y = 0.08;
    neck.add(neckMesh);

    const head = new THREE.Group();
    head.name = 'Head';
    head.position.set(0, 0.2, 0.06);
    neck.add(head);
    bones.head = head;

    const headGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.12, 12, 10));
    headGeom.scale(0.9, 1.05, 1.0);
    const headMesh = new THREE.Mesh(headGeom, pbrMat);
    headMesh.castShadow = true;
    head.add(headMesh);

    // Red Crown Comb
    const combGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.BoxGeometry(0.04, 0.12, 0.18));
    const combMesh = new THREE.Mesh(combGeom, rubyCombMat);
    combMesh.position.set(0, 0.14, -0.01);
    head.add(combMesh);

    // Beak
    const beakGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.045, 0.12, 5));
    beakGeom.rotateX(Math.PI / 2);
    const beakMesh = new THREE.Mesh(beakGeom, yellowBeakMat);
    beakMesh.position.set(0, -0.02, 0.14);
    head.add(beakMesh);

    // Wattle under beak
    const wattleGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.04, 8, 6));
    wattleGeom.scale(0.6, 1.2, 0.8);
    const wattleMesh = new THREE.Mesh(wattleGeom, rubyCombMat);
    wattleMesh.position.set(0, -0.08, 0.1);
    head.add(wattleMesh);

    // Eyes
    for (let s = -1; s <= 1; s += 2) {
      const eye = new THREE.Mesh(
        PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.022, 6, 6)),
        eyeMat
      );
      eye.position.set(s * 0.09, 0.03, 0.07);
      head.add(eye);
    }

    // Two Legs & Feet
    for (let s = -1; s <= 1; s += 2) {
      const legName = s < 0 ? 'Leg_L' : 'Leg_R';
      const legUpper = new THREE.Group();
      legUpper.name = `${legName}_Upper`;
      legUpper.position.set(s * 0.1, -0.14, 0);
      pelvis.add(legUpper);
      bones[`${legName}_Upper`] = legUpper;

      const legGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.02, 0.018, 0.22, 6));
      const legMesh = new THREE.Mesh(legGeom, yellowBeakMat);
      legMesh.position.y = -0.1;
      legMesh.castShadow = true;
      legUpper.add(legMesh);

      // 3 Claws Foot
      const footGroup = new THREE.Group();
      footGroup.position.set(0, -0.22, 0);
      legUpper.add(footGroup);

      for (let c = -1; c <= 1; c++) {
        const toeGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.015, 0.08, 4));
        toeGeom.rotateX(Math.PI / 2);
        const toe = new THREE.Mesh(toeGeom, yellowBeakMat);
        toe.position.set(c * 0.03, 0, 0.04);
        toe.rotation.y = c * 0.3;
        footGroup.add(toe);
      }
    }

    const clips = AnimalAnimations.getChickenClips();
    return { root, bones, clips, species: 'chicken' };
  }

  // ==========================================
  // 3. SHEEP (SUFFOLK FLUFFY FLEECE)
  // ==========================================
  static buildSheep() {
    const root = new THREE.Group();
    root.name = 'Animal_Sheep';

    const fleecePbrMat = PBRTextureGenerator.createPBRMaterial('animal_sheep', {
      roughness: 0.9,
      metalness: 0.0
    });

    const faceDarkMat = new THREE.MeshStandardMaterial({
      color: 0x241e1b,
      roughness: 0.75,
      metalness: 0.0
    });

    const hoofMat = new THREE.MeshStandardMaterial({
      color: 0x161210,
      roughness: 0.7,
      metalness: 0.1
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.2,
      metalness: 0.2
    });

    const baseHeight = 0.62;
    const bones = {};

    const pelvis = new THREE.Group();
    pelvis.name = 'Pelvis';
    pelvis.position.set(0, baseHeight, -0.22);
    root.add(pelvis);
    bones.pelvis = pelvis;

    // Rump Woolly Cloud
    const rumpGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.DodecahedronGeometry(0.42, 1));
    rumpGeom.scale(1.0, 0.95, 1.15);
    const rumpMesh = new THREE.Mesh(rumpGeom, fleecePbrMat);
    rumpMesh.castShadow = true;
    pelvis.add(rumpMesh);

    // Spine & Fluffy Fleece Body
    const spine = new THREE.Group();
    spine.name = 'Spine';
    spine.position.set(0, 0.02, 0.32);
    pelvis.add(spine);
    bones.spine = spine;

    const woolBodyGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.DodecahedronGeometry(0.46, 1));
    woolBodyGeom.scale(1.05, 1.0, 1.2);
    const woolBodyMesh = new THREE.Mesh(woolBodyGeom, fleecePbrMat);
    woolBodyMesh.castShadow = true;
    spine.add(woolBodyMesh);

    // Chest
    const chest = new THREE.Group();
    chest.name = 'Chest';
    chest.position.set(0, 0.04, 0.34);
    spine.add(chest);
    bones.chest = chest;

    const chestWoolGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.DodecahedronGeometry(0.4, 1));
    chestWoolGeom.scale(0.98, 0.95, 0.95);
    const chestWoolMesh = new THREE.Mesh(chestWoolGeom, fleecePbrMat);
    chestWoolMesh.castShadow = true;
    chest.add(chestWoolMesh);

    // Neck
    const neck = new THREE.Group();
    neck.name = 'Neck';
    neck.position.set(0, 0.16, 0.22);
    neck.rotation.x = 0.2;
    chest.add(neck);
    bones.neck = neck;

    const neckGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.18, 0.24, 0.3, 8));
    neckGeom.rotateX(0.2);
    const neckMesh = new THREE.Mesh(neckGeom, fleecePbrMat);
    neckMesh.position.y = 0.08;
    neck.add(neckMesh);

    // Head (Dark soft suffolk face with woolly top knot)
    const head = new THREE.Group();
    head.name = 'Head';
    head.position.set(0, 0.2, 0.18);
    neck.add(head);
    bones.head = head;

    const faceGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.BoxGeometry(0.24, 0.26, 0.34));
    const faceMesh = new THREE.Mesh(faceGeom, faceDarkMat);
    faceMesh.castShadow = true;
    head.add(faceMesh);

    // Woolly Crown Top-knot
    const crownGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.14, 10, 8));
    const crownMesh = new THREE.Mesh(crownGeom, fleecePbrMat);
    crownMesh.position.set(0, 0.14, -0.04);
    head.add(crownMesh);

    // Drooping Ears & Eyes
    for (let s = -1; s <= 1; s += 2) {
      const earGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.06, 0.2, 4));
      earGeom.scale(1.0, 1.0, 0.3);
      const ear = new THREE.Mesh(earGeom, faceDarkMat);
      ear.position.set(s * 0.16, 0.05, -0.06);
      ear.rotation.set(0, 0, -s * 1.2);
      head.add(ear);

      const eye = new THREE.Mesh(
        PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.035, 6, 6)),
        eyeMat
      );
      eye.position.set(s * 0.13, 0.04, 0.08);
      head.add(eye);
    }

    // 4 Slender dark legs
    const createSheepLeg = (name, parent, posX, posZ) => {
      const legUpper = new THREE.Group();
      legUpper.name = `${name}_Upper`;
      legUpper.position.set(posX, -0.22, posZ);
      parent.add(legUpper);
      bones[`${name}_Upper`] = legUpper;

      const upperGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.075, 0.06, 0.24, 7));
      const upperMesh = new THREE.Mesh(upperGeom, faceDarkMat);
      upperMesh.position.y = -0.1;
      upperMesh.castShadow = true;
      legUpper.add(upperMesh);

      const legLower = new THREE.Group();
      legLower.name = `${name}_Lower`;
      legLower.position.set(0, -0.22, 0);
      legUpper.add(legLower);
      bones[`${name}_Lower`] = legLower;

      const lowerGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.055, 0.05, 0.22, 7));
      const lowerMesh = new THREE.Mesh(lowerGeom, faceDarkMat);
      lowerMesh.position.y = -0.1;
      lowerMesh.castShadow = true;
      legLower.add(lowerMesh);

      const hoofGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.BoxGeometry(0.09, 0.07, 0.1));
      const hoof = new THREE.Mesh(hoofGeom, hoofMat);
      hoof.position.set(0, -0.21, 0.01);
      legLower.add(hoof);
    };

    createSheepLeg('Leg_FL', chest, -0.22, 0.04);
    createSheepLeg('Leg_FR', chest, 0.22, 0.04);
    createSheepLeg('Leg_BL', pelvis, -0.22, -0.04);
    createSheepLeg('Leg_BR', pelvis, 0.22, -0.04);

    // Woolly Short Tail
    const tail = new THREE.Group();
    tail.name = 'Tail';
    tail.position.set(0, 0.12, -0.38);
    pelvis.add(tail);
    bones.tail = tail;

    const tailMesh = new THREE.Mesh(
      PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.08, 8, 6)),
      fleecePbrMat
    );
    tailMesh.position.y = -0.06;
    tail.add(tailMesh);

    const clips = AnimalAnimations.getQuadrupedClips('sheep', baseHeight);
    return { root, bones, clips, species: 'sheep' };
  }

  // ==========================================
  // 4. PIG (PLUMP ROSY PIG)
  // ==========================================
  static buildPig() {
    const root = new THREE.Group();
    root.name = 'Animal_Pig';

    const pigPbrMat = PBRTextureGenerator.createPBRMaterial('animal_pig', {
      roughness: 0.7,
      metalness: 0.0
    });

    const deepPinkSnoutMat = new THREE.MeshStandardMaterial({
      color: 0xde6b6b,
      roughness: 0.5,
      metalness: 0.0
    });

    const trotterMat = new THREE.MeshStandardMaterial({
      color: 0x9c4242,
      roughness: 0.7,
      metalness: 0.05
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.15,
      metalness: 0.1
    });

    const baseHeight = 0.52;
    const bones = {};

    const pelvis = new THREE.Group();
    pelvis.name = 'Pelvis';
    pelvis.position.set(0, baseHeight, -0.24);
    root.add(pelvis);
    bones.pelvis = pelvis;

    // Plump round hindquarters
    const rumpGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.38, 14, 12));
    rumpGeom.scale(0.92, 0.95, 1.1);
    const rumpMesh = new THREE.Mesh(rumpGeom, pigPbrMat);
    rumpMesh.castShadow = true;
    pelvis.add(rumpMesh);

    // Spine & Chubby Barrel Body
    const spine = new THREE.Group();
    spine.name = 'Spine';
    spine.position.set(0, 0.02, 0.32);
    pelvis.add(spine);
    bones.spine = spine;

    const barrelGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.38, 0.4, 0.5, 12));
    barrelGeom.rotateX(Math.PI / 2);
    const barrelMesh = new THREE.Mesh(barrelGeom, pigPbrMat);
    barrelMesh.castShadow = true;
    spine.add(barrelMesh);

    // Chest & Shoulders
    const chest = new THREE.Group();
    chest.name = 'Chest';
    chest.position.set(0, 0.03, 0.34);
    spine.add(chest);
    bones.chest = chest;

    const shoulderGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.38, 12, 10));
    shoulderGeom.scale(0.9, 0.95, 0.95);
    const shoulderMesh = new THREE.Mesh(shoulderGeom, pigPbrMat);
    shoulderMesh.castShadow = true;
    chest.add(shoulderMesh);

    // Neck & Head
    const neck = new THREE.Group();
    neck.name = 'Neck';
    neck.position.set(0, 0.12, 0.2);
    neck.rotation.x = 0.2;
    chest.add(neck);
    bones.neck = neck;

    const head = new THREE.Group();
    head.name = 'Head';
    head.position.set(0, 0.14, 0.18);
    neck.add(head);
    bones.head = head;

    const headGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.24, 12, 10));
    headGeom.scale(0.92, 0.9, 1.1);
    const headMesh = new THREE.Mesh(headGeom, pigPbrMat);
    headMesh.castShadow = true;
    head.add(headMesh);

    // Distinctive Pig Snout Disc with 2 Nostrils
    const snoutGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.1, 0.12, 0.18, 12));
    snoutGeom.rotateX(Math.PI / 2);
    snoutGeom.scale(1.15, 0.85, 1.0);
    const snoutMesh = new THREE.Mesh(snoutGeom, deepPinkSnoutMat);
    snoutMesh.position.set(0, -0.06, 0.22);
    snoutMesh.castShadow = true;
    head.add(snoutMesh);

    for (let s = -1; s <= 1; s += 2) {
      const nostril = new THREE.Mesh(
        PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 6)),
        trotterMat
      );
      nostril.rotateX(Math.PI / 2);
      nostril.position.set(s * 0.045, -0.06, 0.32);
      head.add(nostril);

      // Floppy pointed ears
      const earGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.09, 0.2, 4));
      earGeom.scale(1.0, 1.0, 0.25);
      const ear = new THREE.Mesh(earGeom, pigPbrMat);
      ear.position.set(s * 0.16, 0.15, -0.04);
      ear.rotation.set(-0.35, 0, -s * 0.55);
      head.add(ear);

      // Cute twinkling eyes
      const eye = new THREE.Mesh(
        PBRTextureGenerator.setupGeometryUV2(new THREE.SphereGeometry(0.03, 6, 6)),
        eyeMat
      );
      eye.position.set(s * 0.14, 0.06, 0.12);
      head.add(eye);
    }

    // 4 Short stout legs with trotters
    const createPigLeg = (name, parent, posX, posZ) => {
      const legUpper = new THREE.Group();
      legUpper.name = `${name}_Upper`;
      legUpper.position.set(posX, -0.18, posZ);
      parent.add(legUpper);
      bones[`${name}_Upper`] = legUpper;

      const upperGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.09, 0.08, 0.2, 8));
      const upperMesh = new THREE.Mesh(upperGeom, pigPbrMat);
      upperMesh.position.y = -0.08;
      upperMesh.castShadow = true;
      legUpper.add(upperMesh);

      const legLower = new THREE.Group();
      legLower.name = `${name}_Lower`;
      legLower.position.set(0, -0.16, 0);
      legUpper.add(legLower);
      bones[`${name}_Lower`] = legLower;

      const lowerGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.075, 0.07, 0.16, 8));
      const lowerMesh = new THREE.Mesh(lowerGeom, pigPbrMat);
      lowerMesh.position.y = -0.07;
      lowerMesh.castShadow = true;
      legLower.add(lowerMesh);

      const trotterGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.BoxGeometry(0.11, 0.06, 0.12));
      const trotter = new THREE.Mesh(trotterGeom, trotterMat);
      trotter.position.set(0, -0.15, 0.02);
      legLower.add(trotter);
    };

    createPigLeg('Leg_FL', chest, -0.22, 0.04);
    createPigLeg('Leg_FR', chest, 0.22, 0.04);
    createPigLeg('Leg_BL', pelvis, -0.22, -0.04);
    createPigLeg('Leg_BR', pelvis, 0.22, -0.04);

    // Curly Corkscrew Tail
    const tail = new THREE.Group();
    tail.name = 'Tail';
    tail.position.set(0, 0.14, -0.36);
    pelvis.add(tail);
    bones.tail = tail;

    const curlGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.TorusGeometry(0.06, 0.02, 8, 14, Math.PI * 1.5));
    curlGeom.rotateY(Math.PI / 2);
    const curlMesh = new THREE.Mesh(curlGeom, pigPbrMat);
    curlMesh.position.set(0, 0, -0.06);
    tail.add(curlMesh);

    const clips = AnimalAnimations.getQuadrupedClips('pig', baseHeight);
    return { root, bones, clips, species: 'pig' };
  }
}
