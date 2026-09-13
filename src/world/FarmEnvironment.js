import * as THREE from 'three';
import { BarnModel } from './BarnModel.js';
import { WindmillModel } from './WindmillModel.js';
import { PondModel } from './PondModel.js';
import { ShopStallModel } from './ShopStallModel.js';

export class FarmEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.animatedObjects = [];
    this.colliders = [];
    this.gardenPlots = [];
    this.trees = [];

    this.materials = this.createMaterials();
    this.buildWorld();
    this.setupLighting();
  }

  createMaterials() {
    return {
      grass: new THREE.MeshStandardMaterial({
        color: 0x70b045, // Lush cozy farm green
        roughness: 0.85,
        flatShading: true,
      }),
      hillGrass: new THREE.MeshStandardMaterial({
        color: 0x5a9a35,
        roughness: 0.9,
        flatShading: true,
      }),
      dirtPath: new THREE.MeshStandardMaterial({
        color: 0xd4a373, // Warm winding dirt path
        roughness: 0.95,
        flatShading: true,
      }),
      soilBed: new THREE.MeshStandardMaterial({
        color: 0x58311a, // Rich dark garden soil
        roughness: 0.9,
        flatShading: true,
      }),
      woodFence: new THREE.MeshStandardMaterial({
        color: 0x8b5e3c,
        roughness: 0.85,
        flatShading: true,
      }),
      treeTrunk: new THREE.MeshStandardMaterial({
        color: 0x6f4e37,
        roughness: 0.9,
        flatShading: true,
      }),
      treeFoliage: new THREE.MeshStandardMaterial({
        color: 0x38b000,
        roughness: 0.7,
        flatShading: true,
      }),
      treeFoliageAutumn: new THREE.MeshStandardMaterial({
        color: 0xf4a261,
        roughness: 0.7,
        flatShading: true,
      }),
      flowerYellow: new THREE.MeshStandardMaterial({
        color: 0xffd166,
        roughness: 0.5,
        flatShading: true,
      }),
      flowerRed: new THREE.MeshStandardMaterial({
        color: 0xef476f,
        roughness: 0.5,
        flatShading: true,
      }),
      flowerPurple: new THREE.MeshStandardMaterial({
        color: 0x9d4edd,
        roughness: 0.5,
        flatShading: true,
      }),
      mushroomCap: new THREE.MeshStandardMaterial({
        color: 0xe63946,
        roughness: 0.4,
        flatShading: true,
      }),
      mushroomStem: new THREE.MeshStandardMaterial({
        color: 0xfdf0d5,
        roughness: 0.6,
        flatShading: true,
      }),
    };
  }

  buildWorld() {
    // 1. Base Rolling Hills Terrain
    this.createTerrain();

    // 2. Winding Dirt Path
    this.createWindingPath();

    // 3. Rustic Wooden Barn Silhouette (Background)
    const barn = BarnModel.createBarn();
    barn.position.set(-14, this.getTerrainHeight(-14, -22), -22);
    barn.rotation.y = 0.25;
    this.scene.add(barn);

    // Register Barn Colliders (Barn box, silo circle, hay bales)
    this.addBoxCollider(-14, -22, 10.8, 14.8, 0.25);
    this.addCircleCollider(-6.9, -22.3, 2.6); // Silo
    this.addCircleCollider(-18.2, -14.2, 2.2); // Hay bales

    // 4. Rustic Windmill
    const { group: windmill, sailsHub } = WindmillModel.createWindmill();
    windmill.position.set(22, this.getTerrainHeight(22, -16), -16);
    windmill.rotation.y = -0.6;
    this.scene.add(windmill);
    this.windmillSails = sailsHub;

    // Register Windmill Collider
    this.addCircleCollider(22, -16, 3.4);

    // 5. Cozy Pond
    const pond = PondModel.createPond();
    pond.position.set(-18, this.getTerrainHeight(-18, 10), 10);
    this.scene.add(pond);

    // 6. Realistic 3D Cute Shop Stall
    const shopStall = ShopStallModel.createShopStall();
    const shopY = this.getTerrainHeight(-10, -4);
    shopStall.position.set(-10, shopY, -4);
    shopStall.rotation.y = 0.35; // Angle slightly toward center pathway
    this.scene.add(shopStall);
    this.shopStallPos = new THREE.Vector3(-10, shopY, -4);

    // Register Shop Stall Collider
    this.addBoxCollider(-10, -4, 5.2, 4.2, 0.35);

    // Register Pond Basin Collider
    this.addCircleCollider(-18, 10, 5.0);

    // 6. Raised Garden Beds / Crop Plots
    this.createGardenPlots();

    // 7. Stylized Low-Poly Trees
    this.createForestAndTrees();

    // 8. Fences along borders and farm plots
    this.createFences();

    // 9. Wildflowers, Stones & Cute Mushrooms
    this.createDecorations();

    // 10. Cozy Campfires & Outdoor Lantern Lights
    this.createCampfiresAndLanterns();
  }

  getTerrainHeight(x, z) {
    let y = 0;

    // 1. Base gentle rolling undulation
    y += Math.sin(x * 0.09) * Math.cos(z * 0.09) * 0.45;
    y += Math.sin(x * 0.04 + 0.8) * Math.cos(z * 0.05) * 0.6;

    // 2. Windmill Hilltop Plateau (East / North-East)
    const distToWindmill = Math.sqrt((x - 22)**2 + (z + 16)**2);
    if (distToWindmill < 15) {
      const t = Math.max(0, (15 - distToWindmill) / 15);
      y += (t * t * (3 - 2 * t)) * 3.2; // Smooth cubic terrace rise to +3.2m
    }

    // 3. Barn Hillside Ridge (North-West)
    const distToBarn = Math.sqrt((x + 14)**2 + (z + 22)**2);
    if (distToBarn < 16) {
      const t = Math.max(0, (16 - distToBarn) / 16);
      y += (t * t * (3 - 2 * t)) * 2.4; // Smooth ridge rise to +2.4m
    }

    // 4. Sunken Pond Valley Basin (South-West)
    const distToPond = Math.sqrt((x + 18)**2 + (z - 10)**2);
    if (distToPond < 10) {
      const t = Math.max(0, (10 - distToPond) / 10);
      y -= (t * t * (3 - 2 * t)) * 0.9; // Smooth basin dip to -0.9m
    }

    // 5. Terraced Garden Hill Slope (South-East)
    const distToGarden = Math.sqrt((x - 8)**2 + (z - 8)**2);
    if (distToGarden < 12) {
      const t = Math.max(0, (12 - distToGarden) / 12);
      y += (t * t * (3 - 2 * t)) * 1.3; // Stepped garden slope to +1.3m
    }

    // 6. Outer Border Rolling Hills
    if (z < -18) {
      y += Math.pow(Math.abs(z + 18) * 0.22, 1.3);
    }
    if (z > 22) {
      y += Math.pow((z - 22) * 0.2, 1.3);
    }
    if (Math.abs(x) > 26) {
      y += Math.pow((Math.abs(x) - 26) * 0.24, 1.35);
    }

    return y;
  }

  createTerrain() {
    const size = 96;
    const segments = 80;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getTerrainHeight(x, z);
      pos.setY(i, y);
    }
    geom.computeVertexNormals();

    const terrain = new THREE.Mesh(geom, this.materials.grass);
    terrain.receiveShadow = true;
    terrain.name = 'Terrain_Ground';
    this.scene.add(terrain);
    this.terrainMesh = terrain;
  }

  createWindingPath() {
    // Winding path curve connecting Barn -> Center Farm -> Pond -> Windmill
    const points = [
      new THREE.Vector3(-14, 0.05, -15),
      new THREE.Vector3(-8, 0.05, -8),
      new THREE.Vector3(-2, 0.05, -2),
      new THREE.Vector3(0, 0.05, 4),
      new THREE.Vector3(6, 0.05, 6),
      new THREE.Vector3(14, 0.05, 2),
      new THREE.Vector3(18, 0.05, -8),
      new THREE.Vector3(20, 0.05, -14),
    ];

    const curve = new THREE.CatmullRomCurve3(points);
    const pathSamples = curve.getPoints(80);

    const pathGroup = new THREE.Group();
    pathGroup.name = 'Winding_Dirt_Path';

    for (let i = 0; i < pathSamples.length; i++) {
      const p = pathSamples[i];
      const r = 1.3 + Math.sin(i * 0.4) * 0.2;
      const patchGeom = new THREE.CircleGeometry(r, 8);
      patchGeom.rotateX(-Math.PI / 2);
      const patch = new THREE.Mesh(patchGeom, this.materials.dirtPath);
      const groundY = this.getTerrainHeight(p.x, p.z);
      patch.position.set(p.x, groundY + 0.04 + Math.random() * 0.02, p.z);
      patch.receiveShadow = true;
      pathGroup.add(patch);

      // Cute stepping stones along path
      if (i % 6 === 0) {
        const stoneGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.08, 6);
        const stone = new THREE.Mesh(
          stoneGeom,
          new THREE.MeshStandardMaterial({ color: 0xb5b5a8, roughness: 0.9, flatShading: true })
        );
        stone.position.set(p.x + (Math.random() - 0.5) * 0.6, groundY + 0.08, p.z);
        stone.receiveShadow = true;
        stone.castShadow = true;
        pathGroup.add(stone);
      }
    }

    this.scene.add(pathGroup);
  }

  createGardenPlots() {
    const plotPositions = [
      { x: -5, z: 2, type: 'carrot', name: 'Carrot Patch' },
      { x: 5, z: -2, type: 'pumpkin', name: 'Pumpkin Patch' },
      { x: 7, z: 8, type: 'cabbage', name: 'Cabbage Bed' },
      { x: -6, z: 10, type: 'sunflower', name: 'Sunflower Meadow' },
    ];

    plotPositions.forEach((plotData, idx) => {
      const plotGroup = new THREE.Group();
      plotGroup.name = `Garden_Plot_${idx}`;
      const groundY = this.getTerrainHeight(plotData.x, plotData.z);
      plotGroup.position.set(plotData.x, groundY, plotData.z);

      // Wooden garden border box
      const borderGeom = new THREE.BoxGeometry(4.4, 0.3, 4.4);
      const borderMesh = new THREE.Mesh(borderGeom, this.materials.woodFence);
      borderMesh.position.y = 0.15;
      borderMesh.castShadow = true;
      borderMesh.receiveShadow = true;
      plotGroup.add(borderMesh);

      // Dark rich soil mound
      const soilGeom = new THREE.BoxGeometry(4.0, 0.35, 4.0);
      const soilMesh = new THREE.Mesh(soilGeom, this.materials.soilBed);
      soilMesh.position.y = 0.18;
      soilMesh.receiveShadow = true;
      plotGroup.add(soilMesh);

      // Little garden signpost
      const postGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 5);
      const post = new THREE.Mesh(postGeom, this.materials.woodFence);
      post.position.set(-2.0, 0.6, 2.0);
      post.castShadow = true;
      plotGroup.add(post);

      const signGeom = new THREE.BoxGeometry(0.9, 0.5, 0.08);
      const sign = new THREE.Mesh(signGeom, this.materials.woodFence);
      sign.position.set(-2.0, 1.1, 2.0);
      sign.rotation.y = 0.5;
      sign.castShadow = true;
      plotGroup.add(sign);

      this.scene.add(plotGroup);
      this.gardenPlots.push({
        group: plotGroup,
        x: plotData.x,
        y: groundY,
        z: plotData.z,
        type: plotData.type,
        name: plotData.name
      });
    });
  }

  createForestAndTrees() {
    const treeLocations = [
      // Background / perimeter trees
      { x: -26, z: -10, type: 'apple', scale: 1.2 },
      { x: -22, z: -18, type: 'pine', scale: 1.4 },
      { x: -16, z: -30, type: 'oak', scale: 1.6 },
      { x: -5, z: -28, type: 'autumn', scale: 1.5 },
      { x: 8, z: -25, type: 'oak', scale: 1.3 },
      { x: 18, z: -24, type: 'pine', scale: 1.5 },
      { x: 28, z: -8, type: 'apple', scale: 1.2 },
      { x: 26, z: 12, type: 'oak', scale: 1.4 },
      { x: 18, z: 22, type: 'autumn', scale: 1.3 },
      { x: -2, z: 24, type: 'oak', scale: 1.5 },
      { x: -18, z: 24, type: 'pine', scale: 1.4 },
      { x: -28, z: 8, type: 'oak', scale: 1.3 },
      // Near farm accent trees
      { x: -10, z: -2, type: 'apple', scale: 1.0 },
      { x: 12, z: -12, type: 'apple', scale: 1.1 },
    ];

    treeLocations.forEach(loc => {
      const tree = this.buildTree(loc.type, loc.scale);
      const groundY = this.getTerrainHeight(loc.x, loc.z);
      tree.position.set(loc.x, groundY, loc.z);
      this.scene.add(tree);
      this.trees.push(tree);

      // Register Tree Trunk Collider
      this.addCircleCollider(loc.x, loc.z, 0.65 * loc.scale);
    });
  }

  buildTree(type = 'oak', scale = 1.0) {
    const treeGroup = new THREE.Group();
    treeGroup.name = `Tree_${type}`;

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.3 * scale, 0.45 * scale, 2.5 * scale, 6);
    const trunk = new THREE.Mesh(trunkGeom, this.materials.treeTrunk);
    trunk.position.y = (1.25 * scale);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    if (type === 'pine') {
      // Layered pine cones
      for (let lvl = 0; lvl < 3; lvl++) {
        const coneGeom = new THREE.ConeGeometry((2.0 - lvl * 0.45) * scale, 2.2 * scale, 6);
        const cone = new THREE.Mesh(coneGeom, this.materials.treeFoliage);
        cone.position.y = (2.4 + lvl * 1.3) * scale;
        cone.castShadow = true;
        treeGroup.add(cone);
      }
    } else {
      // Fluffy rounded foliage (dodecahedrons)
      const foliageMat = type === 'autumn' ? this.materials.treeFoliageAutumn : this.materials.treeFoliage;
      const foliageGeom = new THREE.DodecahedronGeometry(1.8 * scale, 1);
      const foliage = new THREE.Mesh(foliageGeom, foliageMat);
      foliage.position.y = (3.2 * scale);
      foliage.castShadow = true;
      treeGroup.add(foliage);

      // Extra fluffy puffs
      const puffGeom = new THREE.DodecahedronGeometry(1.1 * scale, 1);
      const p1 = new THREE.Mesh(puffGeom, foliageMat);
      p1.position.set(0.7 * scale, 3.6 * scale, 0.4 * scale);
      p1.castShadow = true;
      treeGroup.add(p1);

      const p2 = new THREE.Mesh(puffGeom, foliageMat);
      p2.position.set(-0.6 * scale, 3.4 * scale, -0.5 * scale);
      p2.castShadow = true;
      treeGroup.add(p2);

      // Red apples if apple tree
      if (type === 'apple') {
        const appleMat = new THREE.MeshStandardMaterial({ color: 0xef233c, roughness: 0.3 });
        const appleGeom = new THREE.SphereGeometry(0.18 * scale, 6, 6);
        for (let a = 0; a < 6; a++) {
          const apple = new THREE.Mesh(appleGeom, appleMat);
          const angle = (a / 6) * Math.PI * 2;
          apple.position.set(
            Math.cos(angle) * 1.6 * scale,
            (3.0 + Math.sin(a) * 0.6) * scale,
            Math.sin(angle) * 1.6 * scale
          );
          apple.castShadow = true;
          treeGroup.add(apple);
        }
      }
    }

    return treeGroup;
  }

  createFences() {
    const fenceGroup = new THREE.Group();
    fenceGroup.name = 'Wooden_Fences';

    const postGeom = new THREE.BoxGeometry(0.18, 1.2, 0.18);
    const railGeom = new THREE.BoxGeometry(2.4, 0.12, 0.08);

    const createFenceSection = (x1, z1, x2, z2) => {
      // Register physical solid barricade collider
      this.addSegmentCollider(x1, z1, x2, z2, 0.35);

      const start = new THREE.Vector3(x1, this.getTerrainHeight(x1, z1), z1);
      const end = new THREE.Vector3(x2, this.getTerrainHeight(x2, z2), z2);
      const dist = start.distanceTo(end);
      const numPosts = Math.ceil(dist / 2.2);

      for (let i = 0; i <= numPosts; i++) {
        const t = i / numPosts;
        const postX = THREE.MathUtils.lerp(x1, x2, t);
        const postZ = THREE.MathUtils.lerp(z1, z2, t);
        const postY = this.getTerrainHeight(postX, postZ);

        const post = new THREE.Mesh(postGeom, this.materials.woodFence);
        post.position.set(postX, postY + 0.6, postZ);
        post.castShadow = true;
        fenceGroup.add(post);

        if (i < numPosts) {
          const nextT = (i + 1) / numPosts;
          const nextX = THREE.MathUtils.lerp(x1, x2, nextT);
          const nextZ = THREE.MathUtils.lerp(z1, z2, nextT);
          const nextY = this.getTerrainHeight(nextX, nextZ);

          const midX = (postX + nextX) * 0.5;
          const midZ = (postZ + nextZ) * 0.5;
          const midY = (postY + nextY) * 0.5;
          const angle = Math.atan2(nextZ - postZ, nextX - postX);
          const segDist = Math.sqrt((nextX - postX)**2 + (nextZ - postZ)**2);

          // Top rail
          const railTop = new THREE.Mesh(railGeom, this.materials.woodFence);
          railTop.scale.set(segDist / 2.2, 1, 1);
          railTop.position.set(midX, midY + 0.85, midZ);
          railTop.rotation.y = -angle;
          railTop.castShadow = true;
          fenceGroup.add(railTop);

          // Bottom rail
          const railBot = railTop.clone();
          railBot.position.y = midY + 0.45;
          fenceGroup.add(railBot);
        }
      }
    };

    // Fencing around back pastures and paddocks
    createFenceSection(-20, -12, -2, -12); // Pasture West back
    createFenceSection(10, -12, 24, -12);  // Pasture East back
    createFenceSection(-10, 16, 12, 16);   // Front central border fence
    createFenceSection(-20, -12, -20, -26); // Barn side paddock fence
    createFenceSection(24, -12, 24, -24);   // Windmill side paddock fence
    createFenceSection(-10, 16, -10, 24);   // Front left boundary fence
    createFenceSection(12, 16, 12, 24);    // Front right boundary fence

    this.scene.add(fenceGroup);
  }

  addSegmentCollider(x1, z1, x2, z2, radius = 0.35) {
    this.colliders.push({
      type: 'segment',
      x1, z1, x2, z2,
      radius
    });
  }

  addCircleCollider(x, z, radius) {
    this.colliders.push({
      type: 'circle',
      x, z,
      radius
    });
  }

  addBoxCollider(cx, cz, width, depth, angle = 0) {
    this.colliders.push({
      type: 'box',
      cx, cz,
      hw: width * 0.5,
      hd: depth * 0.5,
      angle
    });
  }

  resolveCollision(pos, playerRadius = 0.45) {
    const iterations = 3;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < this.colliders.length; i++) {
        const col = this.colliders[i];

        if (col.type === 'segment') {
          const abx = col.x2 - col.x1;
          const abz = col.z2 - col.z1;
          const apx = pos.x - col.x1;
          const apz = pos.z - col.z1;
          const abLenSq = abx * abx + abz * abz;

          if (abLenSq > 0) {
            let t = (apx * abx + apz * abz) / abLenSq;
            t = Math.max(0, Math.min(1, t));
            const closestX = col.x1 + t * abx;
            const closestZ = col.z1 + t * abz;
            const dx = pos.x - closestX;
            const dz = pos.z - closestZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const targetDist = playerRadius + col.radius;

            if (dist < targetDist) {
              const overlap = targetDist - dist;
              if (dist > 0.0001) {
                pos.x += (dx / dist) * overlap;
                pos.z += (dz / dist) * overlap;
              } else {
                const nx = -abz;
                const nz = abx;
                const nlen = Math.sqrt(nx * nx + nz * nz) || 1;
                pos.x += (nx / nlen) * overlap;
                pos.z += (nz / nlen) * overlap;
              }
            }
          }
        } else if (col.type === 'circle') {
          const dx = pos.x - col.x;
          const dz = pos.z - col.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const targetDist = playerRadius + col.radius;

          if (dist < targetDist) {
            const overlap = targetDist - dist;
            if (dist > 0.0001) {
              pos.x += (dx / dist) * overlap;
              pos.z += (dz / dist) * overlap;
            } else {
              pos.x += overlap;
            }
          }
        } else if (col.type === 'box') {
          const cos = Math.cos(-col.angle);
          const sin = Math.sin(-col.angle);
          const lx = cos * (pos.x - col.cx) - sin * (pos.z - col.cz);
          const lz = sin * (pos.x - col.cx) + cos * (pos.z - col.cz);

          const clampedX = Math.max(-col.hw, Math.min(col.hw, lx));
          const clampedZ = Math.max(-col.hd, Math.min(col.hd, lz));

          const dx = lx - clampedX;
          const dz = lz - clampedZ;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist < playerRadius) {
            let pushX = 0, pushZ = 0;
            if (dist > 0.0001) {
              const overlap = playerRadius - dist;
              pushX = (dx / dist) * overlap;
              pushZ = (dz / dist) * overlap;
            } else {
              const overlapX = col.hw - Math.abs(lx) + playerRadius;
              const overlapZ = col.hd - Math.abs(lz) + playerRadius;
              if (overlapX < overlapZ) {
                pushX = lx >= 0 ? overlapX : -overlapX;
              } else {
                pushZ = lz >= 0 ? overlapZ : -overlapZ;
              }
            }
            const wCos = Math.cos(col.angle);
            const wSin = Math.sin(col.angle);
            pos.x += wCos * pushX - wSin * pushZ;
            pos.z += wSin * pushX + wCos * pushZ;
          }
        }
      }
    }
  }

  checkObstacleCollision(point, radius = 0.2) {
    for (let i = 0; i < this.colliders.length; i++) {
      const col = this.colliders[i];
      if (col.type === 'segment') {
        const abx = col.x2 - col.x1;
        const abz = col.z2 - col.z1;
        const apx = point.x - col.x1;
        const apz = point.z - col.z1;
        const abLenSq = abx * abx + abz * abz;
        if (abLenSq > 0) {
          let t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / abLenSq));
          const closestX = col.x1 + t * abx;
          const closestZ = col.z1 + t * abz;
          const dx = point.x - closestX;
          const dz = point.z - closestZ;
          if (dx * dx + dz * dz < (radius + col.radius) ** 2) {
            return true;
          }
        }
      } else if (col.type === 'circle') {
        const dx = point.x - col.x;
        const dz = point.z - col.z;
        if (dx * dx + dz * dz < (radius + col.radius) ** 2) {
          return true;
        }
      } else if (col.type === 'box') {
        const cos = Math.cos(-col.angle);
        const sin = Math.sin(-col.angle);
        const lx = cos * (point.x - col.cx) - sin * (point.z - col.cz);
        const lz = sin * (point.x - col.cx) + cos * (point.z - col.cz);
        const clampedX = Math.max(-col.hw, Math.min(col.hw, lx));
        const clampedZ = Math.max(-col.hd, Math.min(col.hd, lz));
        const dx = lx - clampedX;
        const dz = lz - clampedZ;
        if (dx * dx + dz * dz < radius * radius) {
          return true;
        }
      }
    }
    return false;
  }

  createDecorations() {
    const decoGroup = new THREE.Group();
    decoGroup.name = 'Flora_Decorations';

    // Wildflowers
    const flowerMats = [this.materials.flowerYellow, this.materials.flowerRed, this.materials.flowerPurple];
    const stemMat = new THREE.MeshBasicMaterial({ color: 0x38b000 });
    const stemGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 3);
    const petalGeom = new THREE.ConeGeometry(0.12, 0.12, 5);
    petalGeom.rotateX(Math.PI);

    for (let f = 0; f < 70; f++) {
      const x = (Math.random() - 0.5) * 44;
      const z = (Math.random() - 0.5) * 44;
      if (Math.sqrt(x * x + z * z) < 3.5) continue; // Keep spawn clear

      const flower = new THREE.Group();
      const groundY = this.getTerrainHeight(x, z);
      flower.position.set(x, groundY + 0.05, z);

      const stem = new THREE.Mesh(stemGeom, stemMat);
      stem.position.y = 0.15;
      flower.add(stem);

      const mat = flowerMats[Math.floor(Math.random() * flowerMats.length)];
      const petals = new THREE.Mesh(petalGeom, mat);
      petals.position.y = 0.32;
      flower.add(petals);

      flower.rotation.y = Math.random() * Math.PI;
      flower.rotation.z = (Math.random() - 0.5) * 0.2;
      decoGroup.add(flower);
    }

    // Mushrooms
    const mushroomCapGeom = new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const mushroomStemGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.25, 6);

    for (let m = 0; m < 25; m++) {
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      const shroom = new THREE.Group();
      const groundY = this.getTerrainHeight(x, z);
      shroom.position.set(x, groundY + 0.05, z);

      const stem = new THREE.Mesh(mushroomStemGeom, this.materials.mushroomStem);
      stem.position.y = 0.12;
      stem.castShadow = true;
      shroom.add(stem);

      const cap = new THREE.Mesh(mushroomCapGeom, this.materials.mushroomCap);
      cap.position.y = 0.24;
      cap.castShadow = true;
      shroom.add(cap);

      decoGroup.add(shroom);
    }

    this.scene.add(decoGroup);
  }

  createCampfiresAndLanterns() {
    this.campfires = [];
    this.emberParticles = [];

    // Materials
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6c757d, roughness: 0.9, flatShading: true });
    const logMat = new THREE.MeshStandardMaterial({ color: 0x4a2c11, roughness: 0.9, flatShading: true });
    const emberBedMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.85 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8, flatShading: true });
    const lanternGlassMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });

    // 1. Campfire Locations (Center pathway, Pond side, Garden plot)
    const campfireLocations = [
      { x: 5.0, z: 5.0 },
      { x: -12.0, z: 6.0 },
      { x: 10.0, z: -8.0 }
    ];

    campfireLocations.forEach(loc => {
      const fireGroup = new THREE.Group();
      fireGroup.name = 'Cozy_Campfire';
      const groundY = this.getTerrainHeight(loc.x, loc.z);
      fireGroup.position.set(loc.x, groundY, loc.z);

      // Stone ring around fire
      const numStones = 8;
      for (let s = 0; s < numStones; s++) {
        const angle = (s / numStones) * Math.PI * 2;
        const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + Math.random() * 0.08), stoneMat);
        stone.position.set(Math.cos(angle) * 0.8, 0.1, Math.sin(angle) * 0.8);
        stone.rotation.set(Math.random(), Math.random(), Math.random());
        stone.castShadow = true;
        fireGroup.add(stone);
      }

      // Wooden logs arrangement
      const logGeom = new THREE.CylinderGeometry(0.1, 0.12, 1.2, 6);
      logGeom.rotateX(Math.PI / 2);
      for (let l = 0; l < 4; l++) {
        const log = new THREE.Mesh(logGeom, logMat);
        log.rotation.y = (l / 4) * Math.PI;
        log.position.y = 0.15;
        log.castShadow = true;
        fireGroup.add(log);
      }

      // Glowing Ember Bed
      const emberBed = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 10), emberBedMat);
      emberBed.position.y = 0.12;
      fireGroup.add(emberBed);

      // Animated 3D Flame Cone
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 8), flameMat);
      flame.position.y = 0.65;
      fireGroup.add(flame);

      // Warm Flickering Point Light
      const fireLight = new THREE.PointLight(0xffaa33, 4.2, 20, 1.1);
      fireLight.position.set(0, 0.8, 0);
      fireGroup.add(fireLight);

      this.scene.add(fireGroup);

      this.campfires.push({
        group: fireGroup,
        flame: flame,
        light: fireLight,
        baseIntensity: 4.2,
        pos: new THREE.Vector3(loc.x, groundY + 0.8, loc.z)
      });
    });

    // 2. Outdoor Lantern Posts along pathways and key areas
    const lanternLocations = [
      { x: 0.0, z: -2.0 },
      { x: -5.0, z: -10.0 },
      { x: 6.0, z: -16.0 },
      { x: 15.0, z: 2.0 },
      { x: -16.0, z: -2.0 },
      { x: 10.0, z: 10.0 }
    ];

    lanternLocations.forEach(loc => {
      const postGroup = new THREE.Group();
      postGroup.name = 'Outdoor_Lantern_Post';
      const groundY = this.getTerrainHeight(loc.x, loc.z);
      postGroup.position.set(loc.x, groundY, loc.z);

      // Wooden Pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 8), postMat);
      pole.position.y = 1.3;
      pole.castShadow = true;
      postGroup.add(pole);

      // Cross arm
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.08), postMat);
      arm.position.set(0.2, 2.4, 0);
      postGroup.add(arm);

      // Hanging Lantern Glass
      const lantern = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22), lanternGlassMat);
      lantern.position.set(0.4, 2.15, 0);
      postGroup.add(lantern);

      // Warm Golden Light
      const lanternLight = new THREE.PointLight(0xffd166, 2.5, 15, 1.1);
      lanternLight.position.set(0.4, 2.15, 0);
      postGroup.add(lanternLight);

      this.scene.add(postGroup);
    });
  }

  setupLighting() {
    // Soft Ambient Hemisphere Light (Sky cozy blue + Ground warm green)
    this.hemiLight = new THREE.HemisphereLight(0xbde0fe, 0x588157, 1.2);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Warm Directional Sun Light with soft shadows
    this.sunLight = new THREE.DirectionalLight(0xfff3b0, 1.8);
    this.sunLight.position.set(25, 40, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 100;

    const d = 35;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;

    this.scene.add(this.sunLight);
  }

  setLightingPreset(preset) {
    if (preset === 'day') {
      this.hemiLight.color.setHex(0xbde0fe);
      this.hemiLight.groundColor.setHex(0x588157);
      this.hemiLight.intensity = 1.2;
      this.sunLight.color.setHex(0xfff3b0);
      this.sunLight.intensity = 1.8;
      this.sunLight.position.set(25, 40, 20);
      this.scene.background = new THREE.Color(0x89c2d9);
      this.scene.fog = new THREE.FogExp2(0x89c2d9, 0.015);
    } else if (preset === 'sunset') {
      this.hemiLight.color.setHex(0xffaa5e);
      this.hemiLight.groundColor.setHex(0x54473f);
      this.hemiLight.intensity = 1.0;
      this.sunLight.color.setHex(0xff6b35);
      this.sunLight.intensity = 2.2;
      this.sunLight.position.set(40, 15, 10);
      this.scene.background = new THREE.Color(0xf77f00);
      this.scene.fog = new THREE.FogExp2(0xf77f00, 0.018);
    } else if (preset === 'night') {
      this.hemiLight.color.setHex(0x52b788);      // Soft moonlight cyan-green sky glow
      this.hemiLight.groundColor.setHex(0x2d6a4f); // Warm night grass ambient glow
      this.hemiLight.intensity = 1.1;             // Bright, clear moonlight ambient!
      this.sunLight.color.setHex(0xade8f4);       // Soft blue moonlight
      this.sunLight.intensity = 1.4;              // Bright, visible directional moon light!
      this.sunLight.position.set(-20, 35, -20);
      this.scene.background = new THREE.Color(0x131b3e); // Deep cozy indigo night sky
      this.scene.fog = new THREE.FogExp2(0x131b3e, 0.008); // Light soft fog so everything is clearly visible!
    } else if (preset === 'studio') {
      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0xcccccc);
      this.hemiLight.intensity = 1.5;
      this.sunLight.color.setHex(0xffffff);
      this.sunLight.intensity = 2.0;
      this.sunLight.position.set(10, 20, 15);
      this.scene.background = new THREE.Color(0x2b2d42);
      this.scene.fog = null;
    }
  }

  update(delta) {
    // Gentle windmill rotation
    if (this.windmillSails) {
      this.windmillSails.rotation.z += delta * 0.8;
    }

    // Subtle wind sway on tree foliage
    const time = Date.now() * 0.002;
    for (let i = 0; i < this.trees.length; i++) {
      this.trees[i].rotation.z = Math.sin(time + i) * 0.02;
    }

    // Animate Campfires Flickering & Embers
    if (this.campfires) {
      const fTime = Date.now() * 0.005;
      this.campfires.forEach((fire, idx) => {
        // Light intensity flickering
        const flicker = Math.sin(fTime * 10.0 + idx) * 0.6 + (Math.random() - 0.5) * 0.4;
        fire.light.intensity = fire.baseIntensity + flicker;

        // Flame mesh scaling animation
        const sX = 1.0 + Math.sin(fTime * 14.0 + idx) * 0.12;
        const sY = 1.0 + Math.cos(fTime * 11.0 + idx) * 0.18;
        fire.flame.scale.set(sX, sY, sX);

        // Spawn rising ember particles
        if (Math.random() < delta * 6.0) {
          const pGeom = new THREE.DodecahedronGeometry(0.04 + Math.random() * 0.04);
          const pMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
          const pMesh = new THREE.Mesh(pGeom, pMat);
          pMesh.position.copy(fire.pos).add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            0.2,
            (Math.random() - 0.5) * 0.5
          ));

          this.scene.add(pMesh);
          this.emberParticles = this.emberParticles || [];
          this.emberParticles.push({
            mesh: pMesh,
            vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4),
            life: 1.2
          });
        }
      });
    }

    // Update Campfire Ember Particles
    if (this.emberParticles) {
      for (let i = this.emberParticles.length - 1; i >= 0; i--) {
        const p = this.emberParticles[i];
        p.life -= delta;
        p.mesh.position.addScaledVector(p.vel, delta);
        p.mesh.scale.multiplyScalar(0.96);

        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          this.emberParticles.splice(i, 1);
        }
      }
    }
  }
}
