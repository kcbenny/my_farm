import * as THREE from 'three';
import { ModularCropModels } from '../world/ModularCropModels.js';

export class CropSystem {
  constructor(scene, gardenPlots, worldPhysics = null) {
    this.scene = scene;
    this.gardenPlots = gardenPlots;
    this.worldPhysics = worldPhysics;
    this.crops = [];
    this.particles = [];
    this.harvestAnimations = [];

    this.materials = {
      carrotOrange: new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.5, flatShading: true }),
      leafGreen: new THREE.MeshStandardMaterial({ color: 0x38b000, roughness: 0.6, flatShading: true }),
      pumpkinOrange: new THREE.MeshStandardMaterial({ color: 0xf77f00, roughness: 0.6, flatShading: true }),
      pumpkinStem: new THREE.MeshStandardMaterial({ color: 0x472d1a, roughness: 0.8, flatShading: true }),
      cabbageGreen: new THREE.MeshStandardMaterial({ color: 0x70e000, roughness: 0.5, flatShading: true }),
      cabbageLight: new THREE.MeshStandardMaterial({ color: 0x9ef01a, roughness: 0.5, flatShading: true }),
      sunflowerYellow: new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.4, flatShading: true }),
      sunflowerCenter: new THREE.MeshStandardMaterial({ color: 0x58311a, roughness: 0.8, flatShading: true }),
      peashooterGreen: new THREE.MeshStandardMaterial({ color: 0x52b788, roughness: 0.4, flatShading: true }),
      strawberryRed: new THREE.MeshStandardMaterial({ color: 0xef476f, roughness: 0.4, flatShading: true }),
      soilPatch: new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.95, flatShading: true })
    };

    this.initCrops();
  }

  initCrops() {
    this.gardenPlots.forEach(plot => {
      // 4 crop slots per plot (2x2 grid)
      const offsets = [
        { x: -1.0, z: -1.0 },
        { x: 1.0, z: -1.0 },
        { x: -1.0, z: 1.0 },
        { x: 1.0, z: 1.0 },
      ];

      offsets.forEach(offset => {
        const plotY = plot.y || 0;
        const worldPos = new THREE.Vector3(plot.x + offset.x, plotY + 0.36, plot.z + offset.z);
        const placement = this.worldPhysics?.validatePlacement(worldPos, new THREE.Vector3(0.6, 1, 0.6));
        if (placement && !placement.valid) return;
        if (placement) worldPos.y = placement.height;
        const cropInstance = this.createCropMesh(plot.type, 'mature');
        cropInstance.position.copy(worldPos);
        this.scene.add(cropInstance);
        cropInstance.userData.type = 'crop';
        this.worldPhysics?.register(cropInstance);

        this.crops.push({
          type: plot.type,
          mesh: cropInstance,
          position: worldPos,
          stage: 'mature', // 'sprout', 'early', 'mature', 'wilted', 'empty'
          growthTimer: 0,
          growDuration: 5.0,
          scale: 1.0,
          plotName: plot.name
        });
      });
    });
  }

  createCropMesh(type, stage = 'mature') {
    const t = type.toLowerCase();
    if (t === 'wheat' || t === 'corn' || t === 'tomato' || t === 'tomatoes' || t === 'carrot' || t === 'carrots') {
      return ModularCropModels.createCrop(t, stage);
    }
    if (t === 'wilted') {
      return ModularCropModels.createCrop('wheat', 'wilted');
    }
    if (stage === 'wilted') return this.createCropMesh('empty');

    const group = new THREE.Group();
    group.name = `Crop_${type}`;

    if (type === 'carrot') {
      // Orange root body poking out of ground
      const rootGeom = new THREE.ConeGeometry(0.24, 0.65, 6);
      rootGeom.rotateX(Math.PI);
      const root = new THREE.Mesh(rootGeom, this.materials.carrotOrange);
      root.position.y = 0.22;
      root.castShadow = true;
      group.add(root);

      // Fluffy leafy greens
      for (let i = 0; i < 4; i++) {
        const leafGeom = new THREE.ConeGeometry(0.12, 0.5, 4);
        const leaf = new THREE.Mesh(leafGeom, this.materials.leafGreen);
        const angle = (i / 4) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 0.08, 0.52, Math.sin(angle) * 0.08);
        leaf.rotation.set(Math.sin(angle) * 0.35, angle, Math.cos(angle) * 0.35);
        leaf.castShadow = true;
        group.add(leaf);
      }
    } else if (type === 'pumpkin') {
      // Chubby ribbed pumpkin
      const pumpkinBody = new THREE.Group();
      const numSegments = 6;
      for (let s = 0; s < numSegments; s++) {
        const segmentGeom = new THREE.SphereGeometry(0.38, 8, 8);
        segmentGeom.scale(0.7, 0.9, 1.0);
        const segment = new THREE.Mesh(segmentGeom, this.materials.pumpkinOrange);
        segment.rotation.y = (s / numSegments) * Math.PI;
        segment.castShadow = true;
        pumpkinBody.add(segment);
      }
      pumpkinBody.position.y = 0.32;
      group.add(pumpkinBody);

      // Curly wooden stem
      const stemGeom = new THREE.CylinderGeometry(0.06, 0.08, 0.25, 5);
      const stem = new THREE.Mesh(stemGeom, this.materials.pumpkinStem);
      stem.position.set(0, 0.68, 0);
      stem.rotation.z = 0.2;
      stem.castShadow = true;
      group.add(stem);
    } else if (type === 'cabbage') {
      // Layered leafy cabbage ball
      const headGeom = new THREE.DodecahedronGeometry(0.35, 1);
      const head = new THREE.Mesh(headGeom, this.materials.cabbageLight);
      head.position.y = 0.25;
      head.castShadow = true;
      group.add(head);

      // Outer surrounding ruffled leaves
      for (let l = 0; l < 5; l++) {
        const outerLeafGeom = new THREE.SphereGeometry(0.24, 6, 6);
        outerLeafGeom.scale(1.2, 0.3, 1.2);
        const outerLeaf = new THREE.Mesh(outerLeafGeom, this.materials.cabbageGreen);
        const angle = (l / 5) * Math.PI * 2;
        outerLeaf.position.set(Math.cos(angle) * 0.25, 0.12, Math.sin(angle) * 0.25);
        outerLeaf.rotation.y = angle;
        outerLeaf.castShadow = true;
        group.add(outerLeaf);
      }
    } else if (type === 'sunflower') {
      // Tall stem
      const stemGeom = new THREE.CylinderGeometry(0.05, 0.06, 1.3, 6);
      const stem = new THREE.Mesh(stemGeom, this.materials.leafGreen);
      stem.position.y = 0.65;
      stem.castShadow = true;
      group.add(stem);

      // Big flower head facing sun
      const flowerHead = new THREE.Group();
      flowerHead.position.set(0, 1.3, 0);
      flowerHead.rotation.x = -0.3;

      const centerGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 10);
      centerGeom.rotateX(Math.PI / 2);
      const center = new THREE.Mesh(centerGeom, this.materials.sunflowerCenter);
      center.castShadow = true;
      flowerHead.add(center);

      // Golden Petals
      const numPetals = 12;
      for (let p = 0; p < numPetals; p++) {
        const petalGeom = new THREE.ConeGeometry(0.12, 0.38, 3);
        const petal = new THREE.Mesh(petalGeom, this.materials.sunflowerYellow);
        const angle = (p / numPetals) * Math.PI * 2;
        petal.position.set(Math.cos(angle) * 0.42, Math.sin(angle) * 0.42, 0);
        petal.rotation.z = angle - Math.PI / 2;
        petal.castShadow = true;
        flowerHead.add(petal);
      }
      group.add(flowerHead);

    } else if (type === 'peashooter') {
      // Cute Peashooter Plant Mesh
      const stemGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.8, 6);
      const stem = new THREE.Mesh(stemGeom, this.materials.leafGreen);
      stem.position.y = 0.4;
      group.add(stem);

      const headGeom = new THREE.SphereGeometry(0.35, 8, 8);
      headGeom.scale(1.2, 0.9, 1.3);
      const head = new THREE.Mesh(headGeom, this.materials.peashooterGreen);
      head.position.set(0, 0.85, 0.1);
      group.add(head);

      const snoutGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.35, 8);
      snoutGeom.rotateX(Math.PI / 2);
      const snout = new THREE.Mesh(snoutGeom, this.materials.peashooterGreen);
      snout.position.set(0, 0.85, 0.45);
      group.add(snout);

    } else if (type === 'strawberry') {
      // Plump Red Strawberry with Green Top
      const berryGeom = new THREE.ConeGeometry(0.35, 0.6, 7);
      berryGeom.rotateX(Math.PI);
      const berry = new THREE.Mesh(berryGeom, this.materials.strawberryRed);
      berry.position.y = 0.35;
      berry.castShadow = true;
      group.add(berry);

      // Top Leaf Cap
      for (let l = 0; l < 5; l++) {
        const leafGeom = new THREE.ConeGeometry(0.1, 0.3, 3);
        const leaf = new THREE.Mesh(leafGeom, this.materials.leafGreen);
        const angle = (l / 5) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 0.12, 0.58, Math.sin(angle) * 0.12);
        leaf.rotation.set(Math.sin(angle) * 0.4, angle, Math.cos(angle) * 0.4);
        group.add(leaf);
      }
    } else if (type === 'empty') {
      // Dark tilled soil patch waiting for seed
      const patchGeom = new THREE.CylinderGeometry(0.45, 0.48, 0.05, 8);
      const patch = new THREE.Mesh(patchGeom, this.materials.soilPatch);
      patch.position.y = 0.02;
      group.add(patch);
    }

    return group;
  }

  getNearestHarvestableCrop(playerPos, maxDist = 2.5) {
    let nearest = null;
    let minDist = maxDist;

    for (const crop of this.crops) {
      if (crop.stage === 'mature' || crop.stage === 'ripe') {
        const dist = playerPos.distanceTo(crop.position);
        if (dist < minDist) {
          minDist = dist;
          nearest = crop;
        }
      }
    }
    return nearest;
  }

  getNearestEmptyPlot(playerPos, maxDist = 2.5) {
    let nearest = null;
    let minDist = maxDist;

    for (const crop of this.crops) {
      if (crop.stage === 'empty' || crop.stage === 'wilted') {
        const dist = playerPos.distanceTo(crop.position);
        if (dist < minDist) {
          minDist = dist;
          nearest = crop;
        }
      }
    }
    return nearest;
  }

  plantSeed(crop, seedType) {
    if (crop.stage !== 'empty' && crop.stage !== 'wilted') return false;
    const placement = this.worldPhysics?.validatePlacement(crop.position, new THREE.Vector3(0.6, 1, 0.6));
    if (placement && !placement.valid) return false;
    if (placement) crop.position.y = placement.height;

    this.worldPhysics?.unregister(crop.mesh);
    this.scene.remove(crop.mesh);

    crop.type = seedType;
    crop.stage = 'sprout';
    crop.growthTimer = 0;
    crop.growDuration = 6.0;
    crop.mesh = this.createCropMesh(seedType, 'sprout');
    crop.mesh.position.copy(crop.position);
    crop.scale = 1.0;
    this.scene.add(crop.mesh);
    crop.mesh.userData.type = 'crop';
    this.worldPhysics?.register(crop.mesh);

    this.spawnHarvestParticles(crop.position, seedType);
    return true;
  }

  harvestCrop(crop, collector = null) {
    if (crop.stage !== 'mature' && crop.stage !== 'ripe') return null;

    const harvestedMesh = crop.mesh;
    this.worldPhysics?.unregister(harvestedMesh);
    crop.stage = 'harvesting';
    this.harvestAnimations.push({
      crop,
      mesh: harvestedMesh,
      collector,
      start: harvestedMesh.position.clone(),
      scale: harvestedMesh.scale.clone(),
      rotation: harvestedMesh.quaternion.clone(),
      target: crop.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
      elapsed: 0,
      released: false
    });
    crop.mesh = this.createCropMesh(crop.type, 'wilted');
    crop.mesh.position.copy(crop.position);
    this.scene.add(crop.mesh);
    crop.mesh.userData.type = 'crop';
    this.worldPhysics?.register(crop.mesh);

    const rewards = {
      wheat: { name: 'Golden Wheat Sheaf', emoji: '🌾', coins: 14, kittyCoins: 1, diamonds: 0 },
      corn: { name: 'Sweet Golden Corn', emoji: '🌽', coins: 20, kittyCoins: 1, diamonds: 0 },
      tomato: { name: 'Vine Ripe Tomato', emoji: '🍅', coins: 24, kittyCoins: 0, diamonds: 1 },
      carrot: { name: 'Fresh Carrot', emoji: '🥕', coins: 15, kittyCoins: 1, diamonds: 0 },
      pumpkin: { name: 'Plump Pumpkin', emoji: '🎃', coins: 30, kittyCoins: 2, diamonds: 0 },
      cabbage: { name: 'Crisp Cabbage', emoji: '🥬', coins: 12, kittyCoins: 1, diamonds: 0 },
      sunflower: { name: 'Golden Sunflower', emoji: '🌻', coins: 25, kittyCoins: 0, diamonds: 1 },
      peashooter: { name: 'Peashooter Pod', emoji: '🫛', coins: 45, kittyCoins: 0, diamonds: 2 },
      strawberry: { name: 'Sweet Strawberry', emoji: '🍓', coins: 35, kittyCoins: 0, diamonds: 1 }
    };

    return rewards[crop.type] || { name: 'Farm Crop', emoji: '🌾', coins: 10, kittyCoins: 1, diamonds: 0 };
  }

  updateHarvestAnimations(delta) {
    for (let index = this.harvestAnimations.length - 1; index >= 0; index--) {
      const animation = this.harvestAnimations[index];
      const { crop, mesh, start, scale, rotation, target, collector } = animation;
      animation.elapsed += delta;
      const elapsed = animation.elapsed;
      mesh.quaternion.copy(rotation);
      if (elapsed < 0.2) {
        const tug = Math.sin(elapsed / 0.2 * Math.PI);
        mesh.rotateZ(tug * 0.16);
        mesh.scale.copy(scale).multiply(new THREE.Vector3(1 + tug * 0.06, 1 - tug * 0.12, 1 + tug * 0.06));
      } else {
        if (!animation.released) {
          animation.released = true;
          this.spawnHarvestParticles(start, crop.type);
        }
        const lift = Math.min(1, (elapsed - 0.2) / 0.3);
        if (elapsed < 0.5) {
          mesh.position.copy(start);
          mesh.position.y += (1 - (1 - lift) ** 3) * 0.8;
          mesh.scale.copy(scale).multiplyScalar(1 - lift * 0.2);
          mesh.rotateZ(Math.sin(lift * Math.PI) * -0.12);
        } else {
          const progress = Math.min(1, (elapsed - 0.5) / 0.7);
          const eased = progress * progress * (3 - 2 * progress);
          if (collector) {
            collector.getWorldPosition(target);
            target.y += 0.7;
          }
          mesh.position.copy(start).add(new THREE.Vector3(0, 0.8, 0)).lerp(target, eased);
          mesh.position.y += Math.sin(progress * Math.PI) * 0.65;
          mesh.rotateY(progress * Math.PI * 1.5);
          mesh.rotateZ(Math.sin(progress * Math.PI) * 0.25);
          const collect = Math.max(0, (progress - 0.35) / 0.65);
          mesh.scale.copy(scale).multiplyScalar(0.8 * (1 - collect * collect));
          if (progress >= 1) {
            this.scene.remove(mesh);
            const geometries = new Set();
            mesh.traverse(object => {
              if (object.isMesh) geometries.add(object.geometry);
            });
            geometries.forEach(geometry => geometry.dispose());
            crop.stage = 'wilted';
            this.harvestAnimations.splice(index, 1);
          }
        }
      }
    }
  }

  spawnHarvestParticles(pos, cropType) {
    const colors = {
      wheat: [0xf7d070, 0xe0a93b, 0xa37220],
      corn: [0xf9c724, 0x72b036, 0xffdd53],
      tomato: [0xdc1f2a, 0xf23535, 0x38b000],
      carrot: [0xff6b35, 0x38b000, 0xffd166],
      pumpkin: [0xf77f00, 0xffba08, 0x472d1a],
      cabbage: [0x70e000, 0x9ef01a, 0x38b000],
      sunflower: [0xffb703, 0xfd9e02, 0x58311a],
      peashooter: [0x52b788, 0x38b000, 0x70e000],
      strawberry: [0xef476f, 0xff758f, 0x38b000]
    };

    const palette = colors[cropType] || [0xffffff, 0x52b788];

    for (let i = 0; i < 18; i++) {
      const pGeom = new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.08);
      const col = palette[Math.floor(Math.random() * palette.length)];
      const pMat = new THREE.MeshBasicMaterial({ color: col });
      const pMesh = new THREE.Mesh(pGeom, pMat);

      pMesh.position.copy(pos);
      pMesh.position.y += 0.3;

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        2.5 + Math.random() * 3.5,
        (Math.random() - 0.5) * 4
      );

      this.scene.add(pMesh);
      this.particles.push({
        mesh: pMesh,
        vel,
        life: 1.0,
        maxLife: 1.0
      });
    }
  }

  update(delta) {
    this.updateHarvestAnimations(delta);
    // 1. Grow planted crops through 4 distinct stages
    for (const crop of this.crops) {
      if (crop.stage === 'sprout') {
        crop.growthTimer += delta;
        if (crop.growthTimer >= crop.growDuration * 0.4) {
          // Transition: Sprout -> Early Growth
          this.worldPhysics?.unregister(crop.mesh);
          this.scene.remove(crop.mesh);
          crop.stage = 'early';
          crop.mesh = this.createCropMesh(crop.type, 'early');
          crop.mesh.position.copy(crop.position);
          this.scene.add(crop.mesh);
          crop.mesh.userData.type = 'crop';
          this.worldPhysics?.register(crop.mesh);
        }
      } else if (crop.stage === 'early') {
        crop.growthTimer += delta;
        if (crop.growthTimer >= crop.growDuration) {
          // Transition: Early Growth -> Mature
          this.worldPhysics?.unregister(crop.mesh);
          this.scene.remove(crop.mesh);
          crop.stage = 'mature';
          crop.mesh = this.createCropMesh(crop.type, 'mature');
          crop.mesh.position.copy(crop.position);
          this.scene.add(crop.mesh);
          crop.mesh.userData.type = 'crop';
          this.worldPhysics?.register(crop.mesh);
        }
      } else if (crop.stage === 'growing') {
        // Fallback for custom seeds
        crop.scale += delta * 0.25;
        if (crop.scale >= 1.0) {
          crop.scale = 1.0;
          crop.stage = 'mature';
        }
        crop.mesh.scale.set(crop.scale, crop.scale, crop.scale);
      } else if (crop.stage === 'mature' || crop.stage === 'ripe') {
        // Subtle wind sway
        const sway = Math.sin(Date.now() * 0.002 + crop.position.x * 2) * 0.04;
        crop.mesh.rotation.z = sway;
      }
    }

    // 2. Update harvest burst particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta * 1.8;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.vel.y -= delta * 9.8; // Gravity
      p.mesh.scale.multiplyScalar(0.96);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
}
