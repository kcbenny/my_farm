import * as THREE from 'three';
import { BarnModel } from './BarnModel.js';
import { WindmillModel } from './WindmillModel.js';
import { PondModel } from './PondModel.js';
import { ShopStallModel } from './ShopStallModel.js';
import { CozySceneModels } from './CozySceneModels.js';
import { ModularTileSystem } from './ModularTileSystem.js';
import { WorldPhysics, normalizeAsset } from '../gameplay/WorldPhysics.js';

export class FarmEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.physics = new WorldPhysics(scene, { debug: typeof location !== 'undefined' && new URLSearchParams(location.search).has('physicsDebug') });
    this.animatedObjects = [];
    this.collidableObjects = [];
    this.boundaryObjects = [];
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
    barn.rotation.y = 0.25;
    this.placeStructure(barn, new THREE.Vector3(-14, 0, -22), 'farm');

    // 4. Rustic Windmill
    const { group: windmill, sailsHub } = WindmillModel.createWindmill();
    windmill.rotation.y = -0.6;
    this.windmillSails = sailsHub;
    this.placeStructure(windmill, new THREE.Vector3(22, 0, -16), 'farm', 7);

    // 5. Cozy Pond
    const pond = PondModel.createPond();
    this.placeStructure(pond, new THREE.Vector3(-18, 0, 10), 'obstacle', null);

    // 6. Realistic 3D Cute Shop Stall
    const shopStall = ShopStallModel.createShopStall();
    shopStall.rotation.y = 0.35; // Angle slightly toward center pathway
    this.placeStructure(shopStall, new THREE.Vector3(-10, 0, -4), 'farm');
    this.shopStallPos = shopStall.position.clone();

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

    // 11. Extra diorama-inspired cozy scenes matching the Dribbble low-poly look
    this.addCozySceneProps();

    // 12. Modular 1m x 1m Terraforming Soil & Environment Blocks Display
    this.createModularTerraformingDisplay();

    // 13. Livestock Pasture Fences (Cow, Chicken, Sheep, Pig enclosure)
    this.createLivestockPastureFences();
  }

  placeStructure(object, desiredPosition, type, targetHeight) {
    normalizeAsset(object, type, targetHeight);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const centerOffset = box.getCenter(new THREE.Vector3()).sub(object.position);
    const placement = this.physics.findPlacement(desiredPosition.clone().add(centerOffset), size);
    if (!placement) {
      if (this.physics.debug) console.warn('[placement] no site', object.name);
      return false;
    }
    object.position.set(placement.x - centerOffset.x, placement.y + object.position.y - box.min.y, placement.z - centerOffset.z);
    object.userData.type = type;
    this.scene.add(object);
    this.registerCollidableObject(object, type === 'tree' ? 'tree' : 'structure');
    return true;
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
    terrain.userData.isTerrain = true;
    terrain.userData.type = 'grass';
    this.scene.add(terrain);
    this.terrainMesh = terrain;
    this.registerCollidableObject(terrain, 'terrain');
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
    pathGroup.userData.type = 'road';

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
    this.physics.register(pathGroup);
  }

  createGardenPlots() {
    const plotPositions = [
      { x: -5, z: 2, type: 'carrot', name: 'Carrot Patch' },
      { x: 5, z: -2, type: 'wheat', name: 'Golden Wheat Field' },
      { x: 7, z: 8, type: 'corn', name: 'Tall Corn Field' },
      { x: -6, z: 10, type: 'tomato', name: 'Vine Tomato Trellis' },
    ];

    plotPositions.forEach((plotData, idx) => {
      const placement = this.physics.findPlacement(new THREE.Vector3(plotData.x, 0, plotData.z), new THREE.Vector3(4.5, 1.5, 4.5));
      if (!placement) return;
      plotData.x = placement.x;
      plotData.z = placement.z;
      const plotGroup = new THREE.Group();
      plotGroup.name = `Garden_Plot_${idx}`;
      const groundY = placement.y;
      plotGroup.position.set(plotData.x, groundY, plotData.z);

      // Wooden garden border box
      const borderGeom = new THREE.BoxGeometry(4.4, 0.3, 4.4);
      const borderMesh = new THREE.Mesh(borderGeom, this.materials.woodFence);
      borderMesh.position.y = 0.15;
      borderMesh.userData.type = 'farmland';
      borderMesh.castShadow = true;
      borderMesh.receiveShadow = true;
      plotGroup.add(borderMesh);

      // Dark rich soil mound
      const soilGeom = new THREE.BoxGeometry(4.0, 0.35, 4.0);
      const soilMesh = new THREE.Mesh(soilGeom, this.materials.soilBed);
      soilMesh.position.y = 0.18;
      soilMesh.userData.type = 'farmland';
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
      this.registerCollidableObject(plotGroup, 'structure');
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
      normalizeAsset(tree, 'tree', 3 + loc.scale);
      const size = new THREE.Box3().setFromObject(tree).getSize(new THREE.Vector3());
      const placement = this.physics.findPlacement(new THREE.Vector3(loc.x, 0, loc.z), size);
      if (!placement) return;
      tree.position.copy(placement);
      this.scene.add(tree);
      this.trees.push(tree);
      this.registerCollidableObject(tree, 'tree');

    });
  }

  buildTree(type = 'oak', scale = 1.0) {
    const treeGroup = new THREE.Group();
    treeGroup.name = `${type}_Tree`;
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
      const start = new THREE.Vector3(x1, this.getTerrainHeight(x1, z1), z1);
      const end = new THREE.Vector3(x2, this.getTerrainHeight(x2, z2), z2);
      const dist = start.distanceTo(end);
      const numPosts = Math.ceil(dist / 2.2);

      for (let i = 0; i <= numPosts; i++) {
        const t = i / numPosts;
        const postX = THREE.MathUtils.lerp(x1, x2, t);
        const postZ = THREE.MathUtils.lerp(z1, z2, t);
        const postY = this.getTerrainHeight(postX, postZ);

        if (!this.physics.validatePlacement(new THREE.Vector3(postX, postY, postZ), new THREE.Vector3(0.2, 1.2, 0.2)).valid) continue;

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
          if (this.physics.overlapsRoad(midX, midZ, Math.abs(nextX - postX) / 2 + 0.1, Math.abs(nextZ - postZ) / 2 + 0.1)) continue;

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
    this.physics.register(fenceGroup, 'obstacle');
  }

  createModularTerraformingDisplay() {
    const displayGroup = new THREE.Group();
    displayGroup.name = 'Modular_Terraforming_Blocks_Showcase';

    // 5 Types of 1m x 1m Modular Tiles arranged seamlessly
    const tileTypes = ['untilled', 'tilled', 'watered', 'grass', 'rocks'];
    const originX = 1.0;
    const originZ = 4.5;

    tileTypes.forEach((type, col) => {
      for (let row = 0; row < 2; row++) {
        const posX = originX + col * 1.0;
        const posZ = originZ + row * 1.0;
        if (!this.physics.validatePlacement(new THREE.Vector3(posX, 0, posZ)).valid) continue;
        const tile = ModularTileSystem.createTile(type);
        tile.userData.type = type === 'rocks' ? 'obstacle' : 'farmland';
        const groundY = this.getTerrainHeight(posX, posZ);
        tile.position.set(posX, groundY, posZ);
        displayGroup.add(tile);
      }
    });

    this.scene.add(displayGroup);
    this.physics.register(displayGroup);
  }

  createLivestockPastureFences() {
    const pastureGroup = new THREE.Group();
    pastureGroup.name = 'Livestock_Pasture_Enclosure';

    // Pasture perimeter fences enclosing the animal grazing pasture
    const fencePosts = [
      [-20, -10], [-17, -10], [-14, -10], [-11, -10], [-8, -10],
      [-8, -7], [-8, -4], [-8, -1],
      [-11, -1], [-14, -1], [-17, -1], [-20, -1],
      [-20, -4], [-20, -7]
    ];

    fencePosts.forEach(([fx, fz]) => {
      if (!this.physics.validatePlacement(new THREE.Vector3(fx, 0, fz), new THREE.Vector3(0.2, 1.2, 0.2)).valid) return;
      const fy = this.getTerrainHeight(fx, fz);
      const postGeom = new THREE.CylinderGeometry(0.08, 0.09, 1.2, 5);
      const post = new THREE.Mesh(postGeom, this.materials.woodFence);
      post.position.set(fx, fy + 0.6, fz);
      post.castShadow = true;
      pastureGroup.add(post);
    });

    this.scene.add(pastureGroup);
    this.physics.register(pastureGroup, 'obstacle');
  }

  registerCollidableObject(object, collisionMask = 'structure') {
    if (!object) return;
    object.userData = object.userData || {};
    object.userData.collisionMask = collisionMask;
    if (collisionMask === 'fence') {
      object.userData.collisionRadius = 0.2;
      object.userData.collisionHeight = 1.4;
    } else if (collisionMask === 'tree') {
      object.userData.collisionRadius = 0.6;
      object.userData.collisionHeight = 3.0;
    } else if (collisionMask === 'terrain') {
      object.userData.isTerrain = true;
    }
    this.collidableObjects.push(object);
    this.physics.register(object);
    if (collisionMask === 'terrain' && !this.boundaryObjects.includes(object)) {
      this.boundaryObjects.push(object);
    }
  }

  getBoundaryBox(targetObject) {
    if (!targetObject) return null;
    const box = new THREE.Box3().setFromObject(targetObject);
    return box.isEmpty() ? null : box;
  }

  clampToBoundary(character, targetObject, padding = 0.5) {
    const position = character?.position || character;
    if (!position || !targetObject?.userData.isTerrain) return false;

    const boundaryBox = this.getBoundaryBox(targetObject);
    if (!boundaryBox) return false;

    const isTerrain = targetObject.userData?.isTerrain === true;
    const minX = boundaryBox.min.x;
    const maxX = boundaryBox.max.x;
    const minZ = boundaryBox.min.z;
    const maxZ = boundaryBox.max.z;

    if (isTerrain) {
      let clamped = false;

      if (position.x < minX + padding) {
        position.x = minX + padding;
        clamped = true;
      } else if (position.x > maxX - padding) {
        position.x = maxX - padding;
        clamped = true;
      }

      if (position.z < minZ + padding) {
        position.z = minZ + padding;
        clamped = true;
      } else if (position.z > maxZ - padding) {
        position.z = maxZ - padding;
        clamped = true;
      }

      return clamped;
    }

    return false;
  }

  resolveCollision(character, playerRadius = 0.45) {
    this.clampToBoundary(character, this.terrainMesh, playerRadius);
  }

  checkObstacleCollision(point, radius = 0.2) {
    const feet = new THREE.Vector3(point.x, (point.y ?? 0.5) - radius, point.z);
    return this.physics.intersectsPlayer(feet, radius, radius * 2);
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
      if (!this.physics.validatePlacement(new THREE.Vector3(x, 0, z), new THREE.Vector3(0.4, 0.4, 0.4)).valid) continue;

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
      if (!this.physics.validatePlacement(new THREE.Vector3(x, 0, z), new THREE.Vector3(0.4, 0.4, 0.4)).valid) continue;
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

  addCozySceneProps() {
    const props = [
      {
        scene: CozySceneModels.buildMainFarmsteadScene(),
        position: new THREE.Vector3(-26, this.getTerrainHeight(-26, 26), 26),
        rotationY: 0.5,
      },
      {
        scene: CozySceneModels.buildGreenhouseScene(),
        position: new THREE.Vector3(26, this.getTerrainHeight(26, 18), 18),
        rotationY: -0.8,
        scale: 3,
      },
      {
        scene: CozySceneModels.buildBarnPastureScene(),
        position: new THREE.Vector3(24, this.getTerrainHeight(24, -24), -24),
        rotationY: -0.7,
      },
      {
        scene: CozySceneModels.buildMarketSquareScene(),
        position: new THREE.Vector3(-24, this.getTerrainHeight(-24, -20), -20),
        rotationY: 0.9,
      },
      {
        scene: CozySceneModels.buildRiverDockScene(),
        position: new THREE.Vector3(0, this.getTerrainHeight(0, 30), 30),
        rotationY: 0.2,
      }
    ];

    props.forEach(({ scene, position, rotationY }) => {
      scene.rotation.y = rotationY;
      this.placeStructure(scene, position, 'farm', 5);
    });
  }

  createCampfiresAndLanterns() {
    this.campfires = [];
    this.emberParticles = [];
    this.campfireTime = 0;

    // Materials
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6c757d, roughness: 0.9, flatShading: true });
    const logMat = new THREE.MeshStandardMaterial({ color: 0x4a2c11, roughness: 0.9, flatShading: true });
    const emberBedMat = new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0.95 });
    const flameOuterMat = new THREE.MeshBasicMaterial({ color: 0xffc14d, transparent: true, opacity: 0.82 });
    const flameMidMat = new THREE.MeshBasicMaterial({ color: 0xff8f2d, transparent: true, opacity: 0.9 });
    const flameCoreMat = new THREE.MeshBasicMaterial({ color: 0xfff0c2, transparent: true, opacity: 0.95 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8, flatShading: true });
    const lanternGlassMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });

    // 1. Campfire Locations (Center pathway, Pond side, Garden plot)
    const campfireLocations = [
      { x: 5.0, z: 5.0 },
      { x: -12.0, z: 6.0 },
      { x: 10.0, z: -8.0 }
    ];

    campfireLocations.forEach(loc => {
      const placement = this.physics.findPlacement(new THREE.Vector3(loc.x, 0, loc.z), new THREE.Vector3(2, 2, 2));
      if (!placement) return;
      loc.x = placement.x;
      loc.z = placement.z;
      const fireGroup = new THREE.Group();
      fireGroup.name = 'Cozy_Campfire';
      const groundY = this.getTerrainHeight(loc.x, loc.z);
      fireGroup.position.set(loc.x, groundY, loc.z);
      fireGroup.userData.fireCycle = 0.0;

      // Stone ring around fire
      const numStones = 8;
      for (let s = 0; s < numStones; s++) {
        const angle = (s / numStones) * Math.PI * 2;
        const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + Math.random() * 0.08), stoneMat);
        stone.position.set(Math.cos(angle) * 0.8, 0.1, Math.sin(angle) * 0.8);
        stone.rotation.set(angle * 0.25, angle * 0.15, angle * 0.35);
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
      const emberBed = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.1, 10), emberBedMat);
      emberBed.position.y = 0.12;
      emberBed.scale.set(1.0, 0.75, 1.0);
      fireGroup.add(emberBed);

      // Layered flame tongues for a fuller low-poly fire silhouette
      const flameGroup = new THREE.Group();
      flameGroup.position.y = 0.65;

      const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 6), flameCoreMat);
      flameCore.position.y = 0.2;
      flameCore.rotation.z = 0.02;
      flameGroup.add(flameCore);

      const flameMid = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.85, 7), flameMidMat);
      flameMid.position.y = 0.08;
      flameMid.rotation.z = -0.08;
      flameGroup.add(flameMid);

      const flameOuter = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 8), flameOuterMat);
      flameOuter.position.y = -0.08;
      flameGroup.add(flameOuter);

      const flameTongueL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 6), flameCoreMat);
      flameTongueL.position.set(-0.16, 0.22, 0.02);
      flameTongueL.rotation.z = 0.28;
      flameGroup.add(flameTongueL);

      const flameTongueR = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 6), flameCoreMat);
      flameTongueR.position.set(0.15, 0.18, -0.02);
      flameTongueR.rotation.z = -0.22;
      flameGroup.add(flameTongueR);

      fireGroup.add(flameGroup);
      flameGroup.userData.physics = false;

      // Warm Flickering Point Light
      const fireLight = new THREE.PointLight(0xffa54b, 4.0, 18, 1.05);
      fireLight.position.set(0, 0.82, 0);
      fireGroup.add(fireLight);

      this.scene.add(fireGroup);
      this.physics.register(fireGroup, 'obstacle');

      this.campfires.push({
        group: fireGroup,
        flameGroup: flameGroup,
        flameCore: flameCore,
        flameMid: flameMid,
        flameOuter: flameOuter,
        flameTongueL: flameTongueL,
        flameTongueR: flameTongueR,
        emberBed: emberBed,
        light: fireLight,
        baseIntensity: 4.0,
        pos: new THREE.Vector3(loc.x, groundY + 0.8, loc.z),
        seed: Math.random() * Math.PI * 2,
        emberPhase: Math.random() * 6.0,
        loopDuration: 6.0
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
      const placement = this.physics.findPlacement(new THREE.Vector3(loc.x, 0, loc.z), new THREE.Vector3(1.2, 3, 1.2));
      if (!placement) return;
      loc.x = placement.x;
      loc.z = placement.z;
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
      this.physics.register(postGroup, 'obstacle');
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
      this.campfireTime = (this.campfireTime || 0) + delta;

      this.campfires.forEach((fire, idx) => {
        const localTime = (this.campfireTime + fire.seed) % fire.loopDuration;
        const t = localTime / fire.loopDuration;
        const phase = t * Math.PI * 2;

        const flickerA = Math.sin(phase * 3.0 + idx * 0.7);
        const flickerB = Math.sin(phase * 5.0 + fire.seed * 0.5);
        const flickerC = Math.cos(phase * 7.0 + idx * 1.3);
        const flamePulse = 0.55 + 0.45 * Math.sin(phase);

        const intensity = fire.baseIntensity + flickerA * 0.38 + flickerB * 0.22 + flickerC * 0.12;
        fire.light.intensity = Math.max(0.1, intensity + flamePulse * 0.35);

        fire.light.distance = 16.5 + flamePulse * 2.2;
        fire.light.decay = 1.0 + flamePulse * 0.15;

        if (fire.emberBed) {
          fire.emberBed.scale.set(1.0 + Math.sin(phase * 2.0) * 0.03, 0.75 + Math.sin(phase * 3.0) * 0.03, 1.0 + Math.cos(phase * 2.0) * 0.03);
        }

        if (fire.flameGroup) {
          fire.flameGroup.scale.set(
            1.0 + Math.sin(phase * 2.0) * 0.1,
            1.0 + Math.sin(phase * 3.0 + 0.8) * 0.18,
            1.0 + Math.cos(phase * 2.0 + 0.4) * 0.08
          );
          fire.flameGroup.rotation.y = Math.sin(phase * 0.5) * 0.08;
          fire.flameGroup.rotation.z = Math.sin(phase * 1.5 + 0.3) * 0.03;
        }

        if (fire.flameCore) {
          fire.flameCore.scale.set(1.0 + Math.sin(phase * 4.0) * 0.08, 1.0 + Math.sin(phase * 3.0 + 1.2) * 0.2, 1.0 + Math.cos(phase * 4.0) * 0.08);
          fire.flameCore.position.y = 0.18 + Math.sin(phase * 2.0) * 0.04;
        }

        if (fire.flameMid) {
          fire.flameMid.scale.set(1.0 + Math.sin(phase * 3.0 + 0.5) * 0.1, 1.0 + Math.sin(phase * 2.0 + 0.9) * 0.15, 1.0 + Math.cos(phase * 3.0) * 0.08);
          fire.flameMid.rotation.z = -0.08 + Math.sin(phase * 1.6) * 0.05;
        }

        if (fire.flameOuter) {
          fire.flameOuter.scale.set(1.0 + Math.sin(phase * 2.0 + 0.2) * 0.12, 1.0 + Math.sin(phase * 1.0 + 1.4) * 0.16, 1.0 + Math.sin(phase * 2.2 + 0.7) * 0.1);
          fire.flameOuter.position.y = -0.08 + Math.sin(phase * 1.5 + 0.2) * 0.05;
        }

        if (fire.flameTongueL) {
          fire.flameTongueL.scale.set(1.0 + Math.sin(phase * 3.0 + 1.1) * 0.12, 1.0 + Math.sin(phase * 4.0 + 0.3) * 0.18, 1.0);
          fire.flameTongueL.position.y = 0.18 + Math.sin(phase * 2.4 + 0.4) * 0.05;
        }

        if (fire.flameTongueR) {
          fire.flameTongueR.scale.set(1.0 + Math.cos(phase * 3.0 + 0.2) * 0.1, 1.0 + Math.cos(phase * 4.0 + 1.0) * 0.16, 1.0);
          fire.flameTongueR.position.y = 0.16 + Math.cos(phase * 2.2 + 0.7) * 0.05;
        }

        const spawnGate = Math.abs(Math.sin(phase * 6.0 + fire.seed)) > 0.92;
        if (spawnGate && this.emberParticles.length < 90) {
          const emberCount = 2;
          for (let i = 0; i < emberCount; i++) {
            const emberGeom = new THREE.DodecahedronGeometry(0.02 + ((idx + i) % 3) * 0.01);
            const emberMat = new THREE.MeshBasicMaterial({ color: i === 0 ? 0xffc14d : 0xff7a18, transparent: true, opacity: 0.92 });
            const emberMesh = new THREE.Mesh(emberGeom, emberMat);
            const offsetAngle = phase + i * 2.1 + fire.seed;
            emberMesh.position.set(
              fire.pos.x + Math.cos(offsetAngle) * 0.18,
              fire.pos.y + 0.35 + Math.sin(phase * 2.0 + i) * 0.03,
              fire.pos.z + Math.sin(offsetAngle) * 0.18
            );
            this.scene.add(emberMesh);

            this.emberParticles.push({
              mesh: emberMesh,
              age: 0,
              life: 1.6 + i * 0.15,
              startPos: emberMesh.position.clone(),
              seed: fire.seed + idx * 0.6 + i * 1.7,
              swirl: 0.7 + i * 0.15
            });
          }
        }
      });
    }

    // Update Campfire Ember Particles
    if (this.emberParticles) {
      for (let i = this.emberParticles.length - 1; i >= 0; i--) {
        const p = this.emberParticles[i];
        p.age += delta;
        p.life -= delta;

        const rise = p.age * (0.9 + p.swirl * 0.35);
        const driftX = Math.sin(p.age * 2.4 + p.seed) * 0.18 + Math.cos(p.age * 0.7 + p.seed) * 0.06;
        const driftZ = Math.cos(p.age * 2.1 + p.seed) * 0.18 + Math.sin(p.age * 0.8 + p.seed) * 0.06;
        const lift = p.age * (0.75 + p.swirl * 0.2);

        p.mesh.position.set(
          p.startPos.x + driftX,
          p.startPos.y + lift + rise * 0.15,
          p.startPos.z + driftZ
        );

        const fade = Math.max(0, p.life / 1.6);
        p.mesh.material.opacity = Math.min(0.95, fade);
        p.mesh.scale.setScalar(0.8 + (1.0 - fade) * 0.35);

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
