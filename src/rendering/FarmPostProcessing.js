import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const PortalGodRaysShader = {
  uniforms: {
    tDiffuse: { value: null },
    lightPosition: { value: new THREE.Vector2(0.5, 0.5) },
    intensity: { value: 0 },
    aspect: { value: 1 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 lightPosition;
    uniform float intensity;
    uniform float aspect;
    varying vec2 vUv;

    void main() {
      vec4 sceneColor = texture2D(tDiffuse, vUv);
      vec2 direction = (lightPosition - vUv) * vec2(aspect, 1.0);
      vec3 rays = vec3(0.0);
      for (int i = 1; i <= 6; i++) {
        float stepAmount = float(i) * 0.035;
        vec2 sampleUv = vUv + direction * stepAmount;
        rays += texture2D(tDiffuse, sampleUv).rgb;
      }
      rays = max(rays / 6.0 - sceneColor.rgb * 0.42, 0.0);
      float fade = smoothstep(1.3, 0.08, length(direction));
      gl_FragColor = vec4(sceneColor.rgb + rays * intensity * fade, sceneColor.a);
    }
  `,
};

class FarmBokehPass extends BokehPass {
  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    const mask = this.camera.layers.mask;
    this.camera.layers.disable(1);
    try {
      super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    } finally {
      this.camera.layers.mask = mask;
    }
  }
}

export class FarmPostProcessing {
  constructor(renderer, scene, camera, { depthOfField = true } = {}) {
    this.camera = camera;
    this.depthOfField = depthOfField;
    this.focusTarget = new THREE.Vector3();
    this.godRaySource = new THREE.Vector3();
    this.godRayScreenPosition = new THREE.Vector3();
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: renderer.capabilities.isWebGL2 ? 4 : 0,
    });
    this.composer = new EffectComposer(renderer, target);
    this.renderPass = new RenderPass(scene, camera);
    this.bokehPass = new FarmBokehPass(scene, camera, {
      focus: 6,
      aperture: 0.00012,
      maxblur: 0.003,
    });
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.24, 0.35, 1.1);
    this.godRaysPass = new ShaderPass(PortalGodRaysShader);
    this.outputPass = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bokehPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.godRaysPass);
    this.composer.addPass(this.outputPass);
    this.bokehPass.enabled = depthOfField;
    this.godRaysPass.enabled = false;
  }

  setBloomEnabled(enabled) {
    this.bloomPass.enabled = enabled;
  }

  setDepthOfFieldEnabled(enabled) {
    this.depthOfField = enabled;
    this.bokehPass.enabled = enabled;
  }

  setPortalGodRays(position, intensity = 0) {
    if (!position || intensity <= 0) {
      this.godRaysPass.enabled = false;
      return;
    }
    this.godRaySource.copy(position);
    this.godRaysPass.enabled = true;
    this.godRaysPass.uniforms.intensity.value = intensity * 0.09;
  }

  resize(width, height, pixelRatio) {
    this.composer.setPixelRatio(Math.min(pixelRatio, 1.5));
    this.composer.setSize(width, height);
  }

  render(delta, controller) {
    // Focus uses view-space depth, not camera distance, so orbiting and collision retraction stay sharp.
    this.focusTarget.copy(controller.position).add(controller.cameraLookOffset);
    this.camera.updateMatrixWorld();
    this.focusTarget.applyMatrix4(this.camera.matrixWorldInverse);
    const focus = THREE.MathUtils.clamp(-this.focusTarget.z, this.camera.near, this.camera.far);
    this.bokehPass.uniforms.focus.value = THREE.MathUtils.damp(
      this.bokehPass.uniforms.focus.value, focus, 10, delta
    );
    this.bokehPass.enabled = this.depthOfField && controller.viewMode === 'tps' && !controller.isAiming;
    if (this.godRaysPass.enabled) {
      this.godRayScreenPosition.copy(this.godRaySource).project(this.camera);
      const visible = this.godRayScreenPosition.z >= -1 && this.godRayScreenPosition.z <= 1
        && Math.abs(this.godRayScreenPosition.x) <= 1.2
        && Math.abs(this.godRayScreenPosition.y) <= 1.2;
      this.godRaysPass.enabled = visible;
      if (visible) {
        this.godRaysPass.uniforms.lightPosition.value.set(
          this.godRayScreenPosition.x * 0.5 + 0.5,
          this.godRayScreenPosition.y * 0.5 + 0.5
        );
        this.godRaysPass.uniforms.aspect.value = this.camera.aspect;
      }
    }
    this.composer.render(delta);
  }

  dispose() {
    for (const pass of this.composer.passes) pass.dispose();
    this.composer.dispose();
  }
}
