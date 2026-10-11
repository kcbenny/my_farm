import * as THREE from 'three';
import { createParticleTexture } from '../rendering/ParticleTextures.js';

export class CampfireParticles {
  constructor(scene, fires) {
    this.fires = fires;
    this.time = 0;
    this.particlesPerFire = 32;
    const count = fires.length * this.particlesPerFire;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.seeds = Array.from({ length: count }, () => ({
      phase: Math.random(),
      life: 1.6 + Math.random() * 1.2,
      angle: Math.random() * Math.PI * 2,
      speed: 0.65 + Math.random() * 0.65,
    }));

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));

    const sprite = createParticleTexture();

    const material = new THREE.PointsMaterial({
      map: sprite,
      size: 0.16,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.name = 'Campfire_Sparks';
    this.points.userData.physics = false;
    // Layer 1 is visible in the color pass but excluded from the depth-of-field depth pass.
    this.points.layers.set(1);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.update(0);
  }

  update(delta) {
    this.time += delta;
    for (let i = 0; i < this.seeds.length; i++) {
      const seed = this.seeds[i];
      const origin = this.fires[Math.floor(i / this.particlesPerFire)].pos;
      const progress = (this.time / seed.life + seed.phase) % 1;
      const age = progress * seed.life;
      const angle = seed.angle + age * 1.4;
      const spread = 0.08 + progress * 0.45;
      const offset = i * 3;
      this.positions[offset] = origin.x + Math.cos(angle) * spread + age * 0.12;
      this.positions[offset + 1] = origin.y + 0.2 + age * seed.speed;
      this.positions[offset + 2] = origin.z + Math.sin(angle) * spread;
      const brightness = Math.sin(Math.PI * progress) * (1 - progress) * 4;
      this.colors[offset] = brightness;
      this.colors[offset + 1] = brightness * (0.45 + progress * 0.2);
      this.colors[offset + 2] = brightness * 0.12;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  dispose() {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.points.material.map.dispose();
    this.points.material.dispose();
  }
}
