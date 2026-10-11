import * as THREE from 'three';

export function createFurBumpTexture() {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fiber = Math.sin(x * Math.PI / 2 + Math.sin(y * Math.PI / 32) * 0.5);
      const grain = Math.sin(x * Math.PI / 4 + y * Math.PI / 8);
      const shade = Math.round(128 + fiber * 28 + grain * 8);
      const offset = (y * size + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = shade;
      pixels[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function applyCatSurfaceDetails(materials, characterType) {
  // Pearl already has an authored strand layer and bump map; leave that silhouette intact.
  if (characterType !== 'pearl') {
    const bump = createFurBumpTexture();
    for (const name of ['fur', 'bellyWhite', 'paws', 'fluffTuft', 'darkAccent']) {
      materials[name].bumpMap = bump;
      materials[name].bumpScale = 0.003;
      materials[name].metalness = 0;
      materials[name].roughness = 0.9;
    }
  }
  const previousEyes = materials.eyes;
  materials.eyes = new THREE.MeshPhysicalMaterial({
    map: previousEyes.map,
    roughness: 0.16,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    emissive: 0xffffff,
    emissiveMap: previousEyes.map,
    emissiveIntensity: 0.025,
  });
  previousEyes.dispose();
  materials.eyeGlint = new THREE.MeshStandardMaterial({
    color: 0xfff7e9,
    roughness: 0.12,
    emissive: 0xfff1d4,
    emissiveIntensity: 2,
    toneMapped: false,
  });
}

export function disposeCatModel(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse(object => {
    if (!object.isMesh) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
}
