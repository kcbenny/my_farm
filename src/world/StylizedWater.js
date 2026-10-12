import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water2.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Refractor } from 'three/addons/objects/Refractor.js';

const surfaces = new Set();
const clocks = new WeakMap();
const frustum = new THREE.Frustum();
const projection = new THREE.Matrix4();
const cameraPosition = new THREE.Vector3();
const waterPosition = new THREE.Vector3();
const normal = new THREE.Vector3();
const toCamera = new THREE.Vector3();
let capturing = false;

export function createWaterNormalTexture(phase = 0) {
  const size = 256;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2;
      const v = y / size * Math.PI * 2;
      // Multi-layer wave normals for more realistic water
      const slopeX =
        Math.cos(u * 3 + v * 2 + phase) * 0.12 +
        Math.sin(u * 5 - v * 3 + phase * 0.7) * 0.05 +
        Math.cos(u * 8 + v * 6 - phase * 1.3) * 0.02 +
        Math.sin(u * 12 - v * 9 + phase * 0.5) * 0.01;
      const slopeZ =
        Math.sin(u * 2 - v * 4 + phase) * 0.1 +
        Math.cos(u * 4 + v * 5 + phase * 0.8) * 0.04 +
        Math.sin(u * 7 - v * 3 - phase * 1.1) * 0.025 +
        Math.cos(u * 10 + v * 7 + phase * 0.6) * 0.01;
      const length = Math.hypot(slopeX, 1, slopeZ);
      const offset = (y * size + x) * 4;
      pixels[offset] = Math.round((slopeX / length * 0.5 + 0.5) * 255);
      pixels[offset + 1] = Math.round((slopeZ / length * 0.5 + 0.5) * 255);
      pixels[offset + 2] = Math.round(255 / length);
      pixels[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createEnhancedWaterShader() {
  const shader = Water.WaterShader;
  return {
    ...shader,
    name: 'EnhancedPondWaterShader',
    uniforms: {
      ...shader.uniforms,
      uTime: { value: 0 },
      uHasCapture: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x1a3d3a) },
      uShallowColor: { value: new THREE.Color(0x5fb5a8) },
      uFoamColor: { value: new THREE.Color(0xe8f4f0) },
      uFoamAmount: { value: 0.3 },
      uWaveHeight: { value: 0.15 },
      uCausticIntensity: { value: 0.4 },
      uTransparency: { value: 0.7 },
    },
    vertexShader: shader.vertexShader
      .replace(
        'uniform float time;',
        `uniform float time;
        uniform float uTime;
        uniform float uWaveHeight;
        varying float vWaveHeight;
        varying vec3 vWorldPos;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        // Gerstner-like wave displacement for vertex animation
        vec3 pos = position;
        vec2 worldXZ = (modelMatrix * vec4(position, 1.0)).xz;

        // Multiple wave layers
        float wave1 = sin(worldXZ.x * 0.8 + worldXZ.y * 0.5 + uTime * 0.8) * 0.5 + 0.5;
        float wave2 = sin(worldXZ.x * 1.5 - worldXZ.y * 1.2 + uTime * 1.3) * 0.3 + 0.3;
        float wave3 = sin(worldXZ.x * 3.0 + worldXZ.y * 2.5 + uTime * 2.0) * 0.15 + 0.15;

        float totalWave = (wave1 * 0.5 + wave2 * 0.35 + wave3 * 0.15) * uWaveHeight;
        pos.y += totalWave;
        vWaveHeight = totalWave;
        vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
        transformed = pos;`
      ),
    fragmentShader: shader.fragmentShader
      .replace(
        'uniform float reflectivity;',
        `uniform float reflectivity;
        uniform float uTime;
        uniform float uHasCapture;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uFoamColor;
        uniform float uFoamAmount;
        uniform float uCausticIntensity;
        uniform float uTransparency;
        varying float vWaveHeight;
        varying vec3 vWorldPos;

        // Simple hash noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        // Value noise
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        // Caustic pattern
        float caustics(vec2 uv, float time) {
          vec2 p = uv * 3.0;
          float caustic = 0.0;
          for (int i = 0; i < 3; i++) {
            float t = time * (0.5 + float(i) * 0.3);
            vec2 offset = vec2(
              sin(p.x * 2.0 + t) * 0.5,
              cos(p.y * 2.0 + t * 0.7) * 0.5
            );
            caustic += noise(p + offset + float(i) * 1.7) * (1.0 - float(i) * 0.25);
          }
          return caustic / 2.0;
        }`
      )
      .replace(
        '// calculate the fresnel term',
        `
        // Additional procedural ripples on top of normal map
        vec2 rippleUV = vUv * scale * 2.0;
        float ripple1 = sin(rippleUV.x * 6.0 + rippleUV.y * 4.0 - uTime * 0.8) * 0.04;
        float ripple2 = cos(rippleUV.y * 7.0 - rippleUV.x * 3.0 - uTime * 0.6) * 0.03;
        float ripple3 = sin(rippleUV.x * 12.0 - rippleUV.y * 9.0 + uTime * 1.5) * 0.015;
        normal.x += ripple1 + ripple3;
        normal.z += ripple2 + ripple3 * 0.5;
        normal = normalize(normal);

        // calculate the fresnel term`
      )
      .replace(
        'gl_FragColor = vec4( color, 1.0 ) * mix( refractColor, reflectColor, reflectance );',
        `
        // Base water color with depth gradient
        float depthFactor = smoothstep(0.0, 1.0, vWaveHeight * 3.0 + 0.3);
        vec3 depthColor = mix(uShallowColor, uDeepColor, depthFactor);

        // Caustics pattern
        float caustic = caustics(vUv * scale + uTime * 0.1, uTime);
        vec3 causticColor = uShallowColor * caustic * uCausticIntensity;

        // Foam on wave crests
        float foamThreshold = 0.7 - uFoamAmount * 0.4;
        float foam = smoothstep(foamThreshold, foamThreshold + 0.15, vWaveHeight * 4.0 + 0.3);
        // Add noise to foam edges for natural look
        float foamNoise = noise(vUv * scale * 8.0 + uTime * 0.3);
        foam *= smoothstep(0.3, 0.7, foamNoise);
        vec3 foamFinal = uFoamColor * foam * 0.8;

        // Combine reflection and refraction
        vec3 reflectFinal = reflectColor.rgb;
        vec3 refractFinal = refractColor.rgb;

        // Mix with water color for depth tint
        vec3 refractedTinted = mix(depthColor, refractFinal, 0.6);

        // Fresnel-based reflection mix
        vec3 waterBase = mix(refractedTinted, reflectFinal, reflectance);

        // Add caustics
        waterBase += causticColor * (1.0 - reflectance) * 0.5;

        // Add foam on top
        waterBase = mix(waterBase, uFoamColor, foam * 0.6);

        // Subtle specular highlight from sun direction
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 halfDir = normalize(vec3(0.5, 1.0, 0.3) + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 64.0);
        waterBase += vec3(1.0, 0.98, 0.9) * spec * 0.4;

        // Final color - blend between captured and non-captured
        vec3 finalColor = mix(depthColor + causticColor * 0.3, waterBase, uHasCapture);

        // Alpha based on transparency and viewing angle
        float alpha = mix(uTransparency, 0.95, reflectance);
        alpha = mix(alpha, 1.0, foam * 0.5);

        gl_FragColor = vec4(finalColor, alpha);`
      ),
  };
}

export class StylizedWater extends Water {
  constructor(geometry, { color = 0x5a9e8f, scale = 4, resolution = 512, flowSpeed = 0.02 } = {}) {
    const normalMap0 = createWaterNormalTexture();
    const normalMap1 = createWaterNormalTexture(Math.PI / 4);
    const normalMap2 = createWaterNormalTexture(Math.PI / 2);

    super(geometry, {
      color,
      scale,
      flowSpeed,
      flowDirection: new THREE.Vector2(0.7, 0.4).normalize(),
      reflectivity: 0.25,
      textureWidth: resolution,
      textureHeight: resolution,
      normalMap0,
      normalMap1,
      shader: createEnhancedWaterShader(),
    });

    this.name = 'Stylized_Water_Surface';
    this.userData.physics = false;
    this.rotation.x = -Math.PI / 2;
    this.flowSpeed = flowSpeed;
    this.captureRequested = false;
    this.lastCapture = -Infinity;
    this.captureCount = 0;
    this.time = 0;
    this.material.depthWrite = false;
    this.material.transparent = true;

    // Water2 hides its render-target owners. Managed helpers allow deterministic cleanup and capture budgeting.
    this.material.uniforms.tReflectionMap.value.dispose();
    this.material.uniforms.tRefractionMap.value.dispose();
    const options = { textureWidth: resolution, textureHeight: resolution, clipBias: 0.003, multisample: 0 };
    this.reflector = new Reflector(geometry, options);
    this.refractor = new Refractor(geometry, options);
    this.reflector.matrixAutoUpdate = this.refractor.matrixAutoUpdate = false;
    this.material.uniforms.tReflectionMap.value = this.reflector.getRenderTarget().texture;
    this.material.uniforms.tRefractionMap.value = this.refractor.getRenderTarget().texture;
    this.onBeforeRender = (renderer, scene, camera) => this.renderWater(renderer, scene, camera);
    surfaces.add(this);
  }

  advance(delta, time = this.time + delta) {
    this.time = time;
    this.material.uniforms.uTime.value = this.time;
    const config = this.material.uniforms.config.value;
    config.x = (config.x + this.flowSpeed * delta) % 0.15;
    config.y = (config.x + config.z) % 0.15;
  }

  renderWater(renderer, scene, camera) {
    if (capturing || scene.overrideMaterial) return;
    const matrix = this.material.uniforms.textureMatrix.value;
    matrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    matrix.multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(this.matrixWorld);
    if (!this.captureRequested) return;
    this.captureRequested = false;

    const visibility = [...surfaces].map(water => [water, water.visible]);
    const target = renderer.getRenderTarget();
    const xrEnabled = renderer.xr.enabled;
    const shadowAutoUpdate = renderer.shadowMap.autoUpdate;
    capturing = true;
    try {
      for (const [water] of visibility) water.visible = false;
      this.reflector.matrixWorld.copy(this.matrixWorld);
      this.refractor.matrixWorld.copy(this.matrixWorld);
      this.reflector.onBeforeRender(renderer, scene, camera);
      this.refractor.onBeforeRender(renderer, scene, camera);
      this.material.uniforms.uHasCapture.value = 1;
      this.lastCapture = this.time;
      this.captureCount++;
    } finally {
      renderer.setRenderTarget(target);
      renderer.xr.enabled = xrEnabled;
      renderer.shadowMap.autoUpdate = shadowAutoUpdate;
      for (const [water, visible] of visibility) water.visible = visible;
      capturing = false;
    }
  }

  dispose() {
    surfaces.delete(this);
    this.removeFromParent();
    this.reflector.dispose();
    this.refractor.dispose();
    this.material.uniforms.tNormalMap0.value.dispose();
    this.material.uniforms.tNormalMap1.value.dispose();
    this.material.dispose();
    this.geometry.dispose();
  }
}

export function updateWaterSurfaces(scene, camera, delta) {
  const time = (clocks.get(scene) || 0) + delta;
  clocks.set(scene, time);
  camera.updateMatrixWorld();
  camera.getWorldPosition(cameraPosition);
  projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projection);
  const candidates = [];
  for (const water of surfaces) {
    let parent = water;
    let visible = true;
    while (parent.parent) {
      visible = visible && parent.visible;
      parent = parent.parent;
    }
    if (parent !== scene) continue;
    water.advance(delta, time);
    water.captureRequested = false;
    if (!visible || !parent.visible || time - water.lastCapture < 0.05) continue;
    water.updateWorldMatrix(true, false);
    water.getWorldPosition(waterPosition);
    normal.set(0, 0, 1).transformDirection(water.matrixWorld);
    const aboveWater = toCamera.subVectors(cameraPosition, waterPosition).dot(normal) > 0;
    const distance = cameraPosition.distanceToSquared(waterPosition);
    if (aboveWater && distance < 80 ** 2 && frustum.intersectsObject(water)) {
      candidates.push({ water, distance });
    }
  }
  candidates.sort((a, b) => (a.water.lastCapture - b.water.lastCapture) || (a.distance - b.distance));
  // At most one reflection/refraction pair per game frame; hidden and distant surfaces never capture.
  if (candidates.length > 0) candidates[0].water.captureRequested = true;
}
