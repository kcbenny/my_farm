import * as THREE from 'three';
import { StylizedWater } from './StylizedWater.js';

export class PondModel {
  static createPond() {
    const pondGroup = new THREE.Group();
    pondGroup.name = 'Cozy_Pond';

    // === Materials ===
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x3d6b63,
      roughness: 0.9,
      flatShading: false,
      side: THREE.DoubleSide,
    });

    const bankMat = new THREE.MeshStandardMaterial({
      color: 0x5a7a4a,
      roughness: 0.95,
      flatShading: true,
    });

    const mudMat = new THREE.MeshStandardMaterial({
      color: 0x5c4a32,
      roughness: 1.0,
      flatShading: true,
    });

    const lilyMat = new THREE.MeshStandardMaterial({
      color: 0x2d6a4f,
      roughness: 0.55,
      side: THREE.DoubleSide,
      flatShading: false,
      metalness: 0.05,
    });

    const lilyUndersideMat = new THREE.MeshStandardMaterial({
      color: 0x6b8e5a,
      roughness: 0.7,
      side: THREE.DoubleSide,
      flatShading: false,
    });

    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      roughness: 0.4,
      flatShading: false,
      metalness: 0.1,
      emissive: 0xff6b00,
      emissiveIntensity: 0.05,
    });

    const pinkFlowerMat = new THREE.MeshStandardMaterial({
      color: 0xff8fab,
      roughness: 0.45,
      flatShading: false,
      metalness: 0.05,
      emissive: 0xff6b9d,
      emissiveIntensity: 0.03,
    });

    const whiteFlowerMat = new THREE.MeshStandardMaterial({
      color: 0xf8f0e8,
      roughness: 0.5,
      flatShading: false,
      metalness: 0.02,
    });

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6f4e37,
      roughness: 0.8,
      flatShading: true,
    });

    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x4a3525,
      roughness: 0.85,
      flatShading: true,
    });

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x8b8b7a,
      roughness: 0.92,
      flatShading: true,
    });

    const wetStoneMat = new THREE.MeshStandardMaterial({
      color: 0x6b6b5a,
      roughness: 0.7,
      flatShading: true,
      metalness: 0.05,
    });

    const reedMat = new THREE.MeshStandardMaterial({
      color: 0x7a8b4a,
      roughness: 0.8,
      side: THREE.DoubleSide,
      flatShading: false,
    });

    const reedTopMat = new THREE.MeshStandardMaterial({
      color: 0x9ba85a,
      roughness: 0.75,
      side: THREE.DoubleSide,
      flatShading: false,
    });

    const fishMat = new THREE.MeshStandardMaterial({
      color: 0xff8c42,
      roughness: 0.4,
      flatShading: false,
      metalness: 0.1,
    });

    const fish2Mat = new THREE.MeshStandardMaterial({
      color: 0x4fc3f7,
      roughness: 0.35,
      flatShading: false,
      metalness: 0.15,
    });

    // === Pond Basin (underwater) ===
    // Main water body (sides)
    const basinGeom = new THREE.CylinderGeometry(5.4, 4.0, 1.2, 24, 2, false);
    const basin = new THREE.Mesh(basinGeom, waterMat);
    basin.position.set(0, -0.3, 0);
    basin.receiveShadow = true;
    pondGroup.add(basin);

    // Pond bottom (muddy)
    const bottomGeom = new THREE.CircleGeometry(4.0, 24);
    const bottom = new THREE.Mesh(bottomGeom, mudMat);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -0.9;
    bottom.receiveShadow = true;
    pondGroup.add(bottom);

    // Underwater rocks on the bottom
    const underwaterRocks = [];
    for (let r = 0; r < 8; r++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.8 + Math.random() * 2.5;
      const size = 0.15 + Math.random() * 0.3;
      const rockGeom = new THREE.DodecahedronGeometry(size, 0);
      const rock = new THREE.Mesh(rockGeom, wetStoneMat);
      rock.position.set(
        Math.cos(angle) * radius,
        -0.85 + Math.random() * 0.1,
        Math.sin(angle) * radius
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.receiveShadow = true;
      pondGroup.add(rock);
      underwaterRocks.push(rock);
    }

    // === Water Surface ===
    const waterSurfaceGeom = new THREE.CircleGeometry(5.4, 48);
    const waterSurface = new StylizedWater(waterSurfaceGeom, {
      color: 0x5a9e8f,
      scale: 3,
      resolution: 512,
      flowSpeed: 0.02,
    });
    waterSurface.position.y = 0.28;
    waterSurface.name = 'Pond_Water_Surface';
    pondGroup.add(waterSurface);
    pondGroup.userData.waterSurface = waterSurface;

    // === Shoreline / Bank details ===
    // Grass bank ring
    const bankGeom = new THREE.RingGeometry(5.0, 6.2, 24, 2);
    const bank = new THREE.Mesh(bankGeom, bankMat);
    bank.rotation.x = -Math.PI / 2;
    bank.position.y = 0.05;
    bank.receiveShadow = true;
    pondGroup.add(bank);

    // === Lily Pads (enhanced) ===
    const lilyPads = [];
    const lilyCount = 8;

    for (let i = 0; i < lilyCount; i++) {
      const angle = (i / lilyCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const radius = 1.2 + Math.random() * 3.0;
      const padSize = 0.4 + Math.random() * 0.4;

      const padGroup = new THREE.Group();

      // Top of lily pad
      const padGeom = new THREE.CircleGeometry(padSize, 12);
      // Create a notch in the lily pad
      const padPositions = padGeom.attributes.position;
      for (let v = 0; v < padPositions.count; v++) {
        const x = padPositions.getX(v);
        const y = padPositions.getY(v);
        const ang = Math.atan2(y, x);
        // Create a V-shaped notch
        if (Math.abs(ang) < 0.3) {
          const notchFactor = 1.0 - (0.3 - Math.abs(ang)) / 0.3 * 0.4;
          padPositions.setX(v, x * notchFactor);
          padPositions.setY(v, y * notchFactor);
        }
      }
      padGeom.computeVertexNormals();
      padGeom.rotateX(-Math.PI / 2);

      const padTop = new THREE.Mesh(padGeom, lilyMat);
      padTop.position.y = 0.01;
      padTop.receiveShadow = true;
      padGroup.add(padTop);

      // Underside (slightly curved down)
      const padBottomGeom = new THREE.CircleGeometry(padSize * 0.95, 12);
      padBottomGeom.rotateX(Math.PI / 2);
      const padBottom = new THREE.Mesh(padBottomGeom, lilyUndersideMat);
      padBottom.position.y = -0.02;
      padGroup.add(padBottom);

      // Veins detail (subtle raised lines)
      for (let v = 0; v < 5; v++) {
        const veinAngle = (v / 5) * Math.PI * 2 + 0.3;
        const veinGeom = new THREE.BoxGeometry(padSize * 0.7, 0.01, 0.03);
        const vein = new THREE.Mesh(veinGeom, lilyMat);
        vein.rotation.y = veinAngle;
        vein.position.y = 0.015;
        padGroup.add(vein);
      }

      padGroup.position.set(
        Math.cos(angle) * radius,
        0.29,
        Math.sin(angle) * radius
      );
      padGroup.rotation.y = Math.random() * Math.PI * 2;
      // Slight tilt for natural look
      padGroup.rotation.x = (Math.random() - 0.5) * 0.08;
      padGroup.rotation.z = (Math.random() - 0.5) * 0.08;

      // Store for bobbing animation
      padGroup.userData = {
        baseY: 0.29,
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 0.8 + Math.random() * 0.5,
        bobAmount: 0.02 + Math.random() * 0.02,
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.15 + Math.random() * 0.1,
        driftAmount: 0.08 + Math.random() * 0.05,
        baseAngle: angle,
        baseRadius: radius,
      };

      // Flower on some pads
      if (i % 2 === 0 || Math.random() < 0.3) {
        const flowerColor = Math.random();
        let flowerMaterial;
        if (flowerColor < 0.4) flowerMaterial = flowerMat;
        else if (flowerColor < 0.7) flowerMaterial = pinkFlowerMat;
        else flowerMaterial = whiteFlowerMat;

        const flower = this.createLilyFlower(flowerMaterial, padSize * 0.35);
        flower.position.set(
          (Math.random() - 0.5) * padSize * 0.3,
          0.08,
          (Math.random() - 0.5) * padSize * 0.3
        );
        flower.rotation.y = Math.random() * Math.PI;
        padGroup.add(flower);
      }

      pondGroup.add(padGroup);
      lilyPads.push(padGroup);
    }

    pondGroup.userData.lilyPads = lilyPads;

    // === Reeds / Cattails along the shore ===
    const reeds = [];
    const reedCount = 18;

    for (let i = 0; i < reedCount; i++) {
      const angle = (i / reedCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const radius = 4.8 + (Math.random() - 0.5) * 0.8;
      const reedGroup = this.createReed(reedMat, reedTopMat);
      const scale = 0.7 + Math.random() * 0.6;

      reedGroup.position.set(
        Math.cos(angle) * radius,
        0.1,
        Math.sin(angle) * radius
      );
      reedGroup.rotation.y = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      reedGroup.scale.set(scale, scale, scale);

      reedGroup.userData = {
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.6 + Math.random() * 0.4,
        swayAmount: 0.03 + Math.random() * 0.02,
      };

      pondGroup.add(reedGroup);
      reeds.push(reedGroup);
    }

    pondGroup.userData.reeds = reeds;

    // === Fish (swimming underwater) ===
    const fishList = [];
    const fishCount = 6;

    for (let f = 0; f < fishCount; f++) {
      const isOrange = Math.random() < 0.6;
      const fish = this.createFish(isOrange ? fishMat : fish2Mat);
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * 3;
      const scale = 0.25 + Math.random() * 0.2;

      fish.position.set(
        Math.cos(angle) * radius,
        -0.3 - Math.random() * 0.4,
        Math.sin(angle) * radius
      );
      fish.scale.set(scale, scale, scale);
      fish.rotation.y = angle + Math.PI / 2;

      fish.userData = {
        swimAngle: angle,
        swimRadius: radius,
        swimSpeed: 0.3 + Math.random() * 0.4,
        baseY: -0.3 - Math.random() * 0.4,
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 1.5 + Math.random(),
        bobAmount: 0.05 + Math.random() * 0.05,
        radiusVariation: 0.2 + Math.random() * 0.3,
        radiusPhase: Math.random() * Math.PI * 2,
        radiusSpeed: 0.1 + Math.random() * 0.1,
      };

      pondGroup.add(fish);
      fishList.push(fish);
    }

    pondGroup.userData.fish = fishList;

    // === Little wooden fishing dock ===
    const dock = new THREE.Group();
    dock.position.set(0, 0.35, 4.6);

    const plankGeom = new THREE.BoxGeometry(2.6, 0.12, 0.55);
    for (let p = 0; p < 4; p++) {
      const plank = new THREE.Mesh(plankGeom, woodMat);
      plank.position.set(0, 0, -p * 0.6);
      plank.castShadow = true;
      plank.receiveShadow = true;
      dock.add(plank);
    }

    // Side beams
    const beamGeom = new THREE.BoxGeometry(0.1, 0.15, 2.5);
    const beam1 = new THREE.Mesh(beamGeom, darkWoodMat);
    beam1.position.set(-1.2, -0.05, -0.9);
    dock.add(beam1);
    const beam2 = new THREE.Mesh(beamGeom, darkWoodMat);
    beam2.position.set(1.2, -0.05, -0.9);
    dock.add(beam2);

    // Support posts
    const postGeom = new THREE.CylinderGeometry(0.1, 0.12, 1.4, 6);
    const post1 = new THREE.Mesh(postGeom, darkWoodMat);
    post1.position.set(-1.2, -0.6, -1.8);
    post1.castShadow = true;
    dock.add(post1);

    const post2 = new THREE.Mesh(postGeom, darkWoodMat);
    post2.position.set(1.2, -0.6, -1.8);
    post2.castShadow = true;
    dock.add(post2);

    // Small bench on dock
    const benchSeat = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.08, 0.35),
      woodMat
    );
    benchSeat.position.set(0, 0.18, 0.2);
    benchSeat.castShadow = true;
    dock.add(benchSeat);

    const benchLeg1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.2, 0.3),
      darkWoodMat
    );
    benchLeg1.position.set(-0.5, 0.04, 0.2);
    dock.add(benchLeg1);

    const benchLeg2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.2, 0.3),
      darkWoodMat
    );
    benchLeg2.position.set(0.5, 0.04, 0.2);
    dock.add(benchLeg2);

    // Fishing rod leaning against bench
    const rodGeom = new THREE.CylinderGeometry(0.015, 0.008, 1.0, 6);
    const rod = new THREE.Mesh(rodGeom, darkWoodMat);
    rod.position.set(0.6, 0.55, 0.15);
    rod.rotation.z = -0.4;
    rod.castShadow = true;
    dock.add(rod);

    // Rod tip (line guide)
    const rodTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 6, 6),
      stoneMat
    );
    rodTip.position.set(0.6 + Math.sin(0.4) * 0.5, 0.55 + Math.cos(0.4) * 0.5, 0.15);
    dock.add(rodTip);

    pondGroup.add(dock);

    // === Surrounding River Stones ===
    for (let s = 0; s < 18; s++) {
      const stoneAngle = (s / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const stoneR = 5.3 + (Math.random() - 0.5) * 0.8;
      const stoneSize = 0.3 + Math.random() * 0.4;
      const stoneGeom = new THREE.DodecahedronGeometry(stoneSize, 0);
      const stone = new THREE.Mesh(stoneGeom, stoneMat);
      stone.position.set(
        Math.cos(stoneAngle) * stoneR,
        0.15 + Math.random() * 0.1,
        Math.sin(stoneAngle) * stoneR
      );
      stone.rotation.set(Math.random(), Math.random(), Math.random());
      stone.castShadow = true;
      stone.receiveShadow = true;
      pondGroup.add(stone);
    }

    // === Small waterfall / stream inlet (decorative) ===
    // A tiny stream feeding the pond from the northwest
    const streamGroup = new THREE.Group();
    streamGroup.position.set(-3.5, 0.15, -3.5);
    streamGroup.rotation.y = Math.PI / 4;

    // Stream bed
    const streamBed = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.1, 0.8),
      stoneMat
    );
    streamBed.position.y = -0.05;
    streamBed.receiveShadow = true;
    streamGroup.add(streamBed);

    // Stream water
    const streamWater = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.06, 0.6),
      new THREE.MeshStandardMaterial({
        color: 0x7ac5b8,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.8,
      })
    );
    streamWater.position.y = 0.02;
    streamGroup.add(streamWater);
    streamGroup.userData.streamWater = streamWater;

    // Small rocks in stream
    for (let r = 0; r < 4; r++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.06, 0),
        wetStoneMat
      );
      rock.position.set(
        (Math.random() - 0.5) * 1.0,
        0.02,
        (Math.random() - 0.5) * 0.4
      );
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      streamGroup.add(rock);
    }

    pondGroup.add(streamGroup);

    // === Floating particles / pollen on water ===
    // Small glowing dots that float on the surface
    const pollenCount = 30;
    const pollenGeom = new THREE.SphereGeometry(0.02, 6, 6);
    const pollenMat = new THREE.MeshBasicMaterial({
      color: 0xfff8dc,
      transparent: true,
      opacity: 0.6,
    });

    const pollenParticles = [];
    for (let p = 0; p < pollenCount; p++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 4.5;
      const pollen = new THREE.Mesh(pollenGeom, pollenMat);
      pollen.position.set(
        Math.cos(angle) * radius,
        0.3,
        Math.sin(angle) * radius
      );
      pollen.userData = {
        baseAngle: angle,
        baseRadius: radius,
        driftSpeed: 0.05 + Math.random() * 0.1,
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 1 + Math.random() * 0.5,
      };
      pondGroup.add(pollen);
      pollenParticles.push(pollen);
    }

    pondGroup.userData.pollen = pollenParticles;

    // === Update method for animations ===
    pondGroup.userData.update = (delta) => {
      const time = performance.now() * 0.001;

      // Bobbing lily pads
      if (pondGroup.userData.lilyPads) {
        for (const pad of pondGroup.userData.lilyPads) {
          const ud = pad.userData;
          // Vertical bobbing
          pad.position.y = ud.baseY + Math.sin(time * ud.bobSpeed + ud.bobPhase) * ud.bobAmount;
          // Slight horizontal drift
          const drift = Math.sin(time * ud.driftSpeed + ud.driftPhase) * ud.driftAmount;
          const driftAngle = ud.baseAngle + drift * 0.1;
          pad.position.x = Math.cos(driftAngle) * ud.baseRadius;
          pad.position.z = Math.sin(driftAngle) * ud.baseRadius;
          // Slight tilt with bob
          pad.rotation.x = Math.sin(time * ud.bobSpeed * 0.7 + ud.bobPhase) * 0.03;
          pad.rotation.z = Math.cos(time * ud.bobSpeed * 0.5 + ud.bobPhase) * 0.02;
        }
      }

      // Reed swaying
      if (pondGroup.userData.reeds) {
        for (const reed of pondGroup.userData.reeds) {
          const ud = reed.userData;
          reed.rotation.z = Math.sin(time * ud.swaySpeed + ud.swayPhase) * ud.swayAmount;
          reed.rotation.x = Math.cos(time * ud.swaySpeed * 0.8 + ud.swayPhase) * ud.swayAmount * 0.5;
        }
      }

      // Fish swimming
      if (pondGroup.userData.fish) {
        for (const fish of pondGroup.userData.fish) {
          const ud = fish.userData;
          // Circular swimming with radius variation
          ud.swimAngle += ud.swimSpeed * delta * 0.5;
          const radiusVar = Math.sin(time * ud.radiusSpeed + ud.radiusPhase) * ud.radiusVariation;
          const currentRadius = ud.swimRadius + radiusVar;

          fish.position.x = Math.cos(ud.swimAngle) * currentRadius;
          fish.position.z = Math.sin(ud.swimAngle) * currentRadius;

          // Vertical bobbing
          fish.position.y = ud.baseY + Math.sin(time * ud.bobSpeed + ud.bobPhase) * ud.bobAmount;

          // Face direction of movement
          fish.rotation.y = ud.swimAngle + Math.PI / 2;
          // Slight bank/tilt when turning
          fish.rotation.z = Math.sin(time * ud.bobSpeed + ud.bobPhase) * 0.1;

          // Tail wag animation
          if (fish.children.length > 1) {
            const tail = fish.children[1];
            if (tail) {
              tail.rotation.y = Math.sin(time * 8 + ud.bobPhase) * 0.4;
            }
          }
        }
      }

      // Pollen particles drifting
      if (pondGroup.userData.pollen) {
        for (const pollen of pondGroup.userData.pollen) {
          const ud = pollen.userData;
          // Slow circular drift
          ud.baseAngle += ud.driftSpeed * delta;
          // Slight radius pulsing
          const radiusPulse = Math.sin(time * 0.3 + ud.bobPhase) * 0.1;
          pollen.position.x = Math.cos(ud.baseAngle) * (ud.baseRadius + radiusPulse);
          pollen.position.z = Math.sin(ud.baseAngle) * (ud.baseRadius + radiusPulse);
          // Subtle vertical bobbing
          pollen.position.y = 0.3 + Math.sin(time * ud.bobSpeed + ud.bobPhase) * 0.01;
        }
      }
    };

    return pondGroup;
  }

  static createLilyFlower(material, size) {
    const flowerGroup = new THREE.Group();

    // Petals
    const petalCount = 6;
    const petalGeom = new THREE.SphereGeometry(size * 0.5, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);

    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeom, material);
      petal.position.set(
        Math.cos(angle) * size * 0.4,
        size * 0.1,
        Math.sin(angle) * size * 0.4
      );
      petal.rotation.x = -Math.PI / 3;
      petal.rotation.z = angle;
      petal.scale.set(0.8, 0.5, 0.8);
      flowerGroup.add(petal);
    }

    // Center
    const centerGeom = new THREE.SphereGeometry(size * 0.3, 8, 6);
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0xffd54f,
      roughness: 0.5,
      metalness: 0.1,
      emissive: 0xffa000,
      emissiveIntensity: 0.1,
    });
    const center = new THREE.Mesh(centerGeom, centerMat);
    center.position.y = size * 0.2;
    flowerGroup.add(center);

    // Pistil dots
    const dotGeom = new THREE.SphereGeometry(size * 0.06, 4, 4);
    const dotMat = new THREE.MeshStandardMaterial({
      color: 0xff8c00,
      roughness: 0.4,
      emissive: 0xff6000,
      emissiveIntensity: 0.15,
    });
    for (let d = 0; d < 5; d++) {
      const dotAngle = (d / 5) * Math.PI * 2;
      const dot = new THREE.Mesh(dotGeom, dotMat);
      dot.position.set(
        Math.cos(dotAngle) * size * 0.15,
        size * 0.35,
        Math.sin(dotAngle) * size * 0.15
      );
      flowerGroup.add(dot);
    }

    return flowerGroup;
  }

  static createReed(reedMat, reedTopMat) {
    const reedGroup = new THREE.Group();

    // Multiple stalks per reed clump
    const stalkCount = 3 + Math.floor(Math.random() * 3);

    for (let s = 0; s < stalkCount; s++) {
      const height = 1.2 + Math.random() * 0.8;
      const angle = (s / stalkCount) * Math.PI * 2;
      const offset = 0.05 + Math.random() * 0.1;

      const stalkGeom = new THREE.CylinderGeometry(0.02, 0.035, height, 5);
      const stalk = new THREE.Mesh(stalkGeom, reedMat);
      stalk.position.set(
        Math.cos(angle) * offset,
        height / 2,
        Math.sin(angle) * offset
      );
      stalk.castShadow = true;
      reedGroup.add(stalk);

      // Reed top (cattail / seed head)
      const topHeight = 0.15 + Math.random() * 0.1;
      const topGeom = new THREE.CylinderGeometry(0.04, 0.06, topHeight, 6);
      const top = new THREE.Mesh(topGeom, reedTopMat);
      top.position.set(
        Math.cos(angle) * offset,
        height - topHeight * 0.3,
        Math.sin(angle) * offset
      );
      top.castShadow = true;
      reedGroup.add(top);

      // Leaf blades
      const leafCount = 2 + Math.floor(Math.random() * 2);
      for (let l = 0; l < leafCount; l++) {
        const leafHeight = 0.4 + Math.random() * 0.4;
        const leafY = 0.2 + Math.random() * 0.5;
        const leafGeom = new THREE.PlaneGeometry(0.04, leafHeight);
        const leaf = new THREE.Mesh(leafGeom, reedMat);
        leaf.position.set(
          Math.cos(angle) * offset * 1.5,
          leafY + leafHeight / 2,
          Math.sin(angle) * offset * 1.5
        );
        leaf.rotation.y = angle + Math.PI / 2;
        leaf.rotation.z = (Math.random() - 0.5) * 0.3;
        reedGroup.add(leaf);
      }
    }

    return reedGroup;
  }

  static createFish(material) {
    const fishGroup = new THREE.Group();

    // Body
    const bodyGeom = new THREE.SphereGeometry(0.5, 10, 8);
    bodyGeom.scale(1.5, 0.7, 0.8);
    const body = new THREE.Mesh(bodyGeom, material);
    body.castShadow = true;
    fishGroup.add(body);

    // Tail
    const tailGeom = new THREE.ConeGeometry(0.35, 0.5, 6);
    const tail = new THREE.Mesh(tailGeom, material);
    tail.position.set(-0.6, 0, 0);
    tail.rotation.z = Math.PI / 2;
    tail.castShadow = true;
    fishGroup.add(tail);

    // Dorsal fin
    const dorsalGeom = new THREE.ConeGeometry(0.15, 0.25, 4);
    const dorsal = new THREE.Mesh(dorsalGeom, material);
    dorsal.position.set(0.1, 0.3, 0);
    dorsal.rotation.x = Math.PI;
    fishGroup.add(dorsal);

    // Pectoral fins
    const finGeom = new THREE.ConeGeometry(0.1, 0.2, 4);
    const fin1 = new THREE.Mesh(finGeom, material);
    fin1.position.set(0.2, -0.05, 0.35);
    fin1.rotation.x = Math.PI / 2;
    fin1.rotation.z = -0.3;
    fishGroup.add(fin1);

    const fin2 = new THREE.Mesh(finGeom, material);
    fin2.position.set(0.2, -0.05, -0.35);
    fin2.rotation.x = -Math.PI / 2;
    fin2.rotation.z = 0.3;
    fishGroup.add(fin2);

    // Eye
    const eyeGeom = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.3,
      metalness: 0.2,
    });
    const eye1 = new THREE.Mesh(eyeGeom, eyeMat);
    eye1.position.set(0.5, 0.1, 0.2);
    fishGroup.add(eye1);

    const eye2 = new THREE.Mesh(eyeGeom, eyeMat);
    eye2.position.set(0.5, 0.1, -0.2);
    fishGroup.add(eye2);

    // Eye highlight
    const highlightGeom = new THREE.SphereGeometry(0.02, 6, 6);
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hl1 = new THREE.Mesh(highlightGeom, highlightMat);
    hl1.position.set(0.54, 0.13, 0.22);
    fishGroup.add(hl1);

    const hl2 = new THREE.Mesh(highlightGeom, highlightMat);
    hl2.position.set(0.54, 0.13, -0.18);
    fishGroup.add(hl2);

    return fishGroup;
  }
}
