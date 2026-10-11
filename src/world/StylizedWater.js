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
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2;
      const v = y / size * Math.PI * 2;
      const slopeX = Math.cos(u * 3 + v * 2 + phase) * 0.1 + Math.sin(u * 5 - v * 3) * 0.04;
      const slopeZ = Math.sin(u * 2 - v * 4 + phase) * 0.1 + Math.cos(u * 3 + v * 5) * 0.04;
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

function createRippleShader() {
  const shader = Water.WaterShader;
  return {
    ...shader,
    name: 'LowPolyWaterRippleShader',
    uniforms: {
      ...shader.uniforms,
      uTime: { value: 0 },
      uHasCapture: { value: 0 },
    },
    fragmentShader: shader.fragmentShader
      .replace('uniform float reflectivity;', 'uniform float reflectivity;\nuniform float uTime;\nuniform float uHasCapture;')
      .replace('// calculate the fresnel term', `
        vec2 rippleUV = vUv * scale;
        normal.x += sin(rippleUV.x * 9.0 + rippleUV.y * 5.0 - uTime * 0.9) * 0.035;
        normal.z += cos(rippleUV.y * 8.0 - rippleUV.x * 4.0 - uTime * 0.7) * 0.035;
        normal = normalize(normal);

        // calculate the fresnel term`)
      .replace(
        'gl_FragColor = vec4( color, 1.0 ) * mix( refractColor, reflectColor, reflectance );',
        `vec3 capturedWater = color * mix(refractColor.rgb, reflectColor.rgb, reflectance);
        vec3 distantWater = color * (0.38 + normal.x * 0.08 + normal.z * 0.08);
        gl_FragColor = vec4(mix(distantWater, capturedWater, uHasCapture), 1.0);`
      ),
  };
}

export class StylizedWater extends Water {
  constructor(geometry, { color = 0xa9d9d3, scale = 4, resolution = 256, flowSpeed = 0.025 } = {}) {
    const normalMap0 = createWaterNormalTexture();
    const normalMap1 = createWaterNormalTexture(Math.PI / 3);
    super(geometry, {
      color, scale, flowSpeed,
      flowDirection: new THREE.Vector2(0.8, 0.3).normalize(),
      reflectivity: 0.12,
      textureWidth: resolution,
      textureHeight: resolution,
      normalMap0,
      normalMap1,
      shader: createRippleShader(),
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
    if (aboveWater && distance < 65 ** 2 && frustum.intersectsObject(water)) {
      candidates.push({ water, distance });
    }
  }
  candidates.sort((a, b) => (a.water.lastCapture - b.water.lastCapture) || (a.distance - b.distance));
  // At most one reflection/refraction pair per game frame; hidden and distant surfaces never capture.
  if (candidates.length > 0) candidates[0].water.captureRequested = true;
}
