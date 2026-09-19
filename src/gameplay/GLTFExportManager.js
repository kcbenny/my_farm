import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { classifyObject, normalizeAsset } from './WorldPhysics.js';
import { AnimalModelBuilder } from '../world/AnimalModelBuilder.js';
import { ModularCropModels } from '../world/ModularCropModels.js';
import { ModularTileSystem } from '../world/ModularTileSystem.js';

/**
 * GLTF 2.0 / GLB Export & Load Manager
 * Features:
 * - Exports glTF 2.0 / GLB with embedded PBR textures & animations
 * - Draco Loader integration for compressed assets
 * - Dedicated export methods for Crops, Rigged Animals, Modular Tiles, and Characters
 */
export class GLTFExportManager {
  static dracoLoader = null;
  static gltfLoader = null;

  /**
   * Initializes DRACOLoader and GLTFLoader for loading Draco-compressed models
   */
  static getLoader(decoderPath = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/') {
    if (!this.gltfLoader) {
      this.dracoLoader = new DRACOLoader();
      this.dracoLoader.setDecoderPath(decoderPath);
      this.dracoLoader.preload();

      this.gltfLoader = new GLTFLoader();
      this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }
    return this.gltfLoader;
  }

  /**
   * Loads a glTF / GLB model with Draco decompression enabled
   */
  static async loadDracoGLTF(url, options = {}) {
    const loader = this.getLoader();
    const gltf = await loader.loadAsync(url);
    this.prepareLoadedAsset(gltf.scene, options);
    return gltf;
  }

  static async loadOBJ(url, options = {}) {
    const root = await new OBJLoader().loadAsync(url);
    return this.prepareLoadedAsset(root, options);
  }

  static prepareLoadedAsset(root, { worldPhysics, ...options } = {}) {
    if (worldPhysics) return worldPhysics.prepareAsset(root, options);
    const type = options.type || classifyObject(root);
    if (type) root.userData.type = type;
    normalizeAsset(root, type, options.targetHeight);
    return root;
  }

  /**
   * Generic GLB exporter with embedded animations & PBR textures
   */
  static exportToGLB(object3D, clips = [], filename = 'model.glb') {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      const options = {
        binary: true,
        animations: clips,
        embedImages: true,
        onlyVisible: true,
        truncateDrawRange: true
      };

      exporter.parse(
        object3D,
        (gltf) => {
          this.downloadBlob(gltf, filename);
          resolve(true);
        },
        (error) => {
          console.error(`Error exporting ${filename}:`, error);
          reject(error);
        },
        options
      );
    });
  }

  /**
   * Exports rigged livestock with embedded "Idle", "Walk", "Eat", "Sleep" animations
   */
  static exportAnimal(species = 'cow', filename = null) {
    const animalData = AnimalModelBuilder.createAnimal(species);
    const fname = filename || `livestock_${species}_rigged.glb`;
    return this.exportToGLB(animalData.root, animalData.clips, fname);
  }

  /**
   * Exports modular crop at a specific growth stage ('sprout', 'early', 'mature', 'wilted')
   */
  static exportCrop(type = 'wheat', stage = 'mature', filename = null) {
    const cropMesh = ModularCropModels.createCrop(type, stage);
    const fname = filename || `crop_${type}_${stage}.glb`;
    return this.exportToGLB(cropMesh, [], fname);
  }

  /**
   * Exports modular 1m x 1m terraforming tile
   */
  static exportTile(type = 'tilled', filename = null) {
    const tileMesh = ModularTileSystem.createTile(type);
    const fname = filename || `tile_1m_${type}.glb`;
    return this.exportToGLB(tileMesh, [], fname);
  }

  /**
   * Exports player cat character
   */
  static exportCharacter(catCharacter, filename = 'chubby_tabby_cat.glb') {
    return this.exportToGLB(catCharacter.mesh, catCharacter.clips, filename);
  }

  /**
   * Exports complete farm scene
   */
  static exportScene(scene, filename = 'cozy_farm_scene.glb') {
    return this.exportToGLB(scene, [], filename);
  }

  static downloadBlob(data, filename) {
    if (typeof document === 'undefined') return;
    const blob = new Blob([data], { type: 'model/gltf-binary' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
}
