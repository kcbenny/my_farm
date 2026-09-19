import * as THREE from 'three';
import { PBRTextureGenerator } from '../assets/PBRTextureGenerator.js';

/**
 * Modular 1m x 1m Terraforming Soil & Environment Blocks
 * Types:
 * 1. Untilled Dirt ('untilled')
 * 2. Tilled Dirt ('tilled')
 * 3. Watered Dirt ('watered')
 * 4. Grass ('grass')
 * 5. Rocks / Cobblestone ('rocks')
 *
 * Technical Specifications:
 * - Seamless 1.0m x 1.0m grid standard (1 unit = 1 meter)
 * - Standard thickness: 0.25m, bottom anchored at y = 0
 * - Clean PBR texturing with BaseColor, Normal, and packed ORM maps
 * - Max < 1,500 tris per tile (optimal ~20 - 150 tris)
 */
export class ModularTileSystem {
  static materials = null;

  static initMaterials() {
    if (this.materials) return;

    this.materials = {
      untilled: PBRTextureGenerator.createPBRMaterial('tile_untilled', {
        roughness: 0.9,
        metalness: 0.0
      }),
      tilled: PBRTextureGenerator.createPBRMaterial('tile_tilled', {
        roughness: 0.85,
        metalness: 0.0
      }),
      watered: PBRTextureGenerator.createPBRMaterial('tile_watered', {
        roughness: 0.35, // Glossy wet sheen
        metalness: 0.05
      }),
      grass: PBRTextureGenerator.createPBRMaterial('tile_grass', {
        roughness: 0.75,
        metalness: 0.0
      }),
      rocks: PBRTextureGenerator.createPBRMaterial('tile_rocks', {
        roughness: 0.7,
        metalness: 0.0
      })
    };
  }

  /**
   * Creates a single 1m x 1m modular tile
   * @param {string} type - 'untilled' | 'tilled' | 'watered' | 'grass' | 'rocks'
   * @returns {THREE.Group}
   */
  static createTile(type = 'grass') {
    this.initMaterials();

    const group = new THREE.Group();
    group.name = `Tile_${type}_1m`;

    const mat = this.materials[type.toLowerCase()] || this.materials.grass;

    if (type.toLowerCase() === 'tilled' || type.toLowerCase() === 'watered') {
      // 1m x 1m tile with subtle physical furrow ridges
      const baseGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.BoxGeometry(1.0, 0.22, 1.0));
      const baseMesh = new THREE.Mesh(baseGeom, mat);
      baseMesh.position.y = 0.11;
      baseMesh.receiveShadow = true;
      group.add(baseMesh);

      // 4 Plowed furrow ridges running along X axis
      const numRidges = 4;
      const ridgeSpacing = 1.0 / numRidges;
      for (let r = 0; r < numRidges; r++) {
        const rz = -0.5 + ridgeSpacing * 0.5 + r * ridgeSpacing;
        const ridgeGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.CylinderGeometry(0.045, 0.065, 1.0, 6));
        ridgeGeom.rotateZ(Math.PI / 2);
        const ridgeMesh = new THREE.Mesh(ridgeGeom, mat);
        ridgeMesh.position.set(0, 0.24, rz);
        ridgeMesh.castShadow = true;
        ridgeMesh.receiveShadow = true;
        group.add(ridgeMesh);
      }
    } else if (type.toLowerCase() === 'rocks') {
      // 1m x 1m stone foundation
      const baseGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.BoxGeometry(1.0, 0.22, 1.0));
      const baseMesh = new THREE.Mesh(baseGeom, mat);
      baseMesh.position.y = 0.11;
      baseMesh.receiveShadow = true;
      group.add(baseMesh);

      // Subtle chiseled stone top pavers
      const paverCount = 2;
      const pStep = 1.0 / paverCount;
      for (let px = 0; px < paverCount; px++) {
        for (let pz = 0; pz < paverCount; pz++) {
          const paverGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.BoxGeometry(0.46, 0.05, 0.46));
          const paverMesh = new THREE.Mesh(paverGeom, mat);
          paverMesh.position.set(
            -0.5 + pStep * 0.5 + px * pStep,
            0.24,
            -0.5 + pStep * 0.5 + pz * pStep
          );
          paverMesh.castShadow = true;
          paverMesh.receiveShadow = true;
          group.add(paverMesh);
        }
      }
    } else if (type.toLowerCase() === 'grass') {
      // 1m x 1m grass block with soil under-base
      const soilUnderGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.BoxGeometry(1.0, 0.2, 1.0));
      const soilUnder = new THREE.Mesh(soilUnderGeom, this.materials.untilled);
      soilUnder.position.y = 0.1;
      soilUnder.receiveShadow = true;
      group.add(soilUnder);

      const grassTopGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.BoxGeometry(1.0, 0.06, 1.0));
      const grassTop = new THREE.Mesh(grassTopGeom, mat);
      grassTop.position.y = 0.22;
      grassTop.receiveShadow = true;
      group.add(grassTop);

      // Small decorative tuft of blades
      const tuftGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.ConeGeometry(0.04, 0.12, 4));
      for (let t = 0; t < 3; t++) {
        const tuft = new THREE.Mesh(tuftGeom, mat);
        tuft.position.set(-0.25 + t * 0.1, 0.3, 0.2);
        tuft.rotation.set(0.15 * (t - 1), 0, 0.2 * (t - 1));
        group.add(tuft);
      }
    } else {
      // Untilled Soil: 1m x 1m seamless block
      const baseGeom = PBRTextureGenerator.setupGeometryUV2(new THREE.BoxGeometry(1.0, 0.25, 1.0));
      const baseMesh = new THREE.Mesh(baseGeom, mat);
      baseMesh.position.y = 0.125;
      baseMesh.receiveShadow = true;
      group.add(baseMesh);
    }

    return group;
  }

  /**
   * Helper to create a seamless NxM grid of modular tiles
   */
  static createTileGrid(width = 4, length = 4, type = 'tilled') {
    const gridGroup = new THREE.Group();
    gridGroup.name = `TileGrid_${width}x${length}_${type}`;

    const halfW = (width - 1) * 0.5;
    const halfL = (length - 1) * 0.5;

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < length; z++) {
        const tile = this.createTile(type);
        tile.position.set((x - halfW) * 1.0, 0, (z - halfL) * 1.0);
        gridGroup.add(tile);
      }
    }

    return gridGroup;
  }
}
