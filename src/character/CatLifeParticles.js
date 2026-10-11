import * as THREE from 'three';
import { createParticleTexture } from '../rendering/ParticleTextures.js';

export class CatLifeParticles {
  constructor(scene) {
    this.time = 0;
    this.emissionTimer = 0;
    this.nextLeaf = 0;
    this.previousPosition = null;
    this.leaves = Array.from({ length: 48 }, () => ({
      life: 0,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
    }));
    this.grass = this.createPoints(48, createParticleTexture(true), 0.16);
    this.glow = this.createPoints(20, createParticleTexture(), 0.09);
    this.grass.name = 'Cat_Grass_Leaves';
    this.glow.name = 'Cat_Night_Motes';
    this.glow.material.color.setRGB(2, 1.8, 1.2);
    this.glow.material.opacity = 0.45;
    scene.add(this.grass, this.glow);
  }

  createPoints(count, texture, size) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.PointsMaterial({
      map: texture,
      size,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const points = new THREE.Points(geometry, material);
    points.userData.physics = false;
    points.layers.set(1);
    points.frustumCulled = false;
    points.visible = false;
    return points;
  }

  reset(position) {
    this.previousPosition = position.clone();
    this.emissionTimer = 0;
    for (const leaf of this.leaves) leaf.life = 0;
    this.grass.visible = false;
  }

  update(delta, { position, grounded, sprinting, surface, night, visible = true }) {
    this.time += delta;
    if (!this.previousPosition) this.reset(position);
    const distance = Math.hypot(position.x - this.previousPosition.x, position.z - this.previousPosition.z);
    const moving = delta > 0 && distance > 0.001 && distance < 2;
    this.previousPosition.copy(position);
    if (distance >= 2) this.reset(position);

    if (moving && grounded && sprinting && surface?.type === 'grass') {
      this.emissionTimer += delta;
      while (this.emissionTimer >= 0.08) {
        this.emissionTimer -= 0.08;
        for (let j = 0; j < 2; j++) {
          const leaf = this.leaves[this.nextLeaf];
          this.nextLeaf = (this.nextLeaf + 1) % this.leaves.length;
          leaf.life = 0.65;
          leaf.position.set(position.x + (Math.random() - 0.5) * 0.3, surface.height + 0.08, position.z + (Math.random() - 0.5) * 0.3);
          leaf.velocity.set((Math.random() - 0.5) * 1.2, 0.8 + Math.random() * 0.4, (Math.random() - 0.5) * 1.2);
        }
      }
    } else {
      this.emissionTimer = 0;
    }

    const positions = this.grass.geometry.attributes.position;
    const colors = this.grass.geometry.attributes.color;
    let activeLeaves = 0;
    this.leaves.forEach((leaf, index) => {
      leaf.life = Math.max(0, leaf.life - delta);
      if (leaf.life > 0) {
        activeLeaves++;
        leaf.velocity.y -= delta * 2.4;
        leaf.position.addScaledVector(leaf.velocity, delta);
      }
      positions.setXYZ(index, leaf.position.x, leaf.position.y, leaf.position.z);
      const fade = leaf.life / 0.65;
      colors.setXYZ(index, fade * 0.3, fade * 0.6, fade * 0.12);
    });
    positions.needsUpdate = colors.needsUpdate = true;
    this.grass.visible = visible && activeLeaves > 0;

    this.glow.visible = visible && night;
    if (this.glow.visible) {
      const glowPositions = this.glow.geometry.attributes.position;
      const glowColors = this.glow.geometry.attributes.color;
      for (let i = 0; i < glowPositions.count; i++) {
        const phase = i * 2.39996 + this.time * 0.22;
        const radius = 0.65 + (i % 4) * 0.12;
        glowPositions.setXYZ(i, position.x + Math.cos(phase) * radius, position.y + 0.3 + (i % 5) * 0.23 + Math.sin(phase + this.time) * 0.08, position.z + Math.sin(phase) * radius);
        const pulse = 0.2 + (Math.sin(this.time * 1.2 + i) + 1) * 0.3;
        glowColors.setXYZ(i, pulse, pulse, pulse);
      }
      glowPositions.needsUpdate = glowColors.needsUpdate = true;
    }
    return moving;
  }

  dispose() {
    for (const points of [this.grass, this.glow]) {
      points.removeFromParent();
      points.geometry.dispose();
      points.material.map.dispose();
      points.material.dispose();
    }
  }
}
