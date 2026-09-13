import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

/**
 * Exports Three.js 3D Models & Scenes to web-optimized .GLB format with embedded animations
 */
export class GLTFExportManager {
  static exportCharacter(catCharacter, filename = 'chubby_tabby_cat.glb') {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      const options = {
        binary: true,
        animations: catCharacter.clips,
        embedImages: true,
        onlyVisible: true,
        truncateDrawRange: true
      };

      exporter.parse(
        catCharacter.mesh,
        (gltf) => {
          this.downloadBlob(gltf, filename);
          resolve(true);
        },
        (error) => {
          console.error('Error exporting Character GLB:', error);
          reject(error);
        },
        options
      );
    });
  }

  static exportScene(scene, filename = 'cozy_farm_scene.glb') {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      const options = {
        binary: true,
        embedImages: true,
        onlyVisible: true,
        truncateDrawRange: true
      };

      exporter.parse(
        scene,
        (gltf) => {
          this.downloadBlob(gltf, filename);
          resolve(true);
        },
        (error) => {
          console.error('Error exporting Scene GLB:', error);
          reject(error);
        },
        options
      );
    });
  }

  static downloadBlob(data, filename) {
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
