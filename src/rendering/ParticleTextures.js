import * as THREE from 'three';

export function createParticleTexture(leaf = false) {
  const size = 32;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = ((x + 0.5) / size - 0.5) * 2;
      const v = ((y + 0.5) / size - 0.5) * 2;
      const distance = leaf
        ? Math.abs((u + v) * 0.7) + Math.abs((u - v) * 1.6)
        : Math.hypot(u, v);
      const offset = (y * size + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
      pixels[offset + 3] = Math.round(Math.max(0, 1 - distance) ** (leaf ? 0.5 : 2) * 255);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
