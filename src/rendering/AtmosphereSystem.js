import * as THREE from 'three';

/**
 * AtmosphereSystem - 高级天空与大气雾效系统
 *
 * 功能：
 * 1. 程序化天空穹顶（多层渐变 + 大气散射 + 地平线辉光）
 * 2. 程序化体积云层（2D 多层云带 + 风驱动流动）
 * 3. 高度雾（基于海拔的指数雾，低处更浓）
 * 4. 太阳光晕（圆盘 + 射线 + 散射）
 * 5. 月亮与星空（夜晚模式）
 * 6. 昼夜过渡平滑混合
 */
export class AtmosphereSystem {
  constructor(scene, { radius = 500, segments = 64 } = {}) {
    this.scene = scene;
    this.radius = radius;
    this.time = 0;
    this.windSpeed = 0.02;

    // 当前预设状态
    this.currentPreset = 'day';
    this.targetPreset = null;
    this.blendFactor = 1;
    this.blendSpeed = 0.3;

    // 天空穹顶
    this.skyDome = this._createSkyDome(segments);
    this.scene.add(this.skyDome);

    // 云层（两层）
    this.cloudLayer1 = this._createCloudLayer(0);
    this.cloudLayer2 = this._createCloudLayer(1);
    this.scene.add(this.cloudLayer1);
    this.scene.add(this.cloudLayer2);

    // 太阳光晕
    this.sunGlow = this._createSunGlow();
    this.scene.add(this.sunGlow);

    // 月亮
    this.moonMesh = this._createMoon();
    this.scene.add(this.moonMesh);

    // 星星
    this.stars = this._createStars();
    this.scene.add(this.stars);

    // 地平线雾光带
    this.fogRim = this._createFogRim();
    this.scene.add(this.fogRim);

    // 预设配置
    this.presets = this._buildPresets();

    // 应用初始预设
    this.applyPreset('day', true);
  }

  // ========== 天空穹顶 ==========
  _createSkyDome(segments) {
    const geom = new THREE.SphereGeometry(this.radius, segments, segments / 2, 0, Math.PI * 2, 0, Math.PI / 2);
    geom.scale(-1, 1, 1); // 翻转法线使内部可见

    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x4a90d9) },
        uMidColor: { value: new THREE.Color(0x87ceeb) },
        uHorizonColor: { value: new THREE.Color(0xc5e1f5) },
        uBottomColor: { value: new THREE.Color(0xe8f4f8) },
        uSunDirection: { value: new THREE.Vector3(0.5, 0.7, 0.3).normalize() },
        uSunColor: { value: new THREE.Color(0xfff5e6) },
        uSunIntensity: { value: 1.0 },
        uScatteringStrength: { value: 0.6 },
        uHorizonGlow: { value: 0.4 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */`
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vHeight;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize(normalMatrix * normal);
          vHeight = position.y; // -1 ~ 1 范围
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uBottomColor;
        uniform vec3 uSunDirection;
        uniform vec3 uSunColor;
        uniform float uSunIntensity;
        uniform float uScatteringStrength;
        uniform float uHorizonGlow;
        uniform float uTime;

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vHeight;

        // 简单噪声
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

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

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 viewDir = normalize(vWorldPos - cameraPosition);
          float heightNorm = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0); // 0 (底部) ~ 1 (顶部)

          // === 多层渐变 ===
          vec3 skyColor;
          if (heightNorm > 0.6) {
            float t = (heightNorm - 0.6) / 0.4;
            skyColor = mix(uMidColor, uTopColor, smoothstep(0.0, 1.0, t));
          } else if (heightNorm > 0.35) {
            float t = (heightNorm - 0.35) / 0.25;
            skyColor = mix(uHorizonColor, uMidColor, smoothstep(0.0, 1.0, t));
          } else if (heightNorm > 0.15) {
            float t = (heightNorm - 0.15) / 0.2;
            skyColor = mix(uBottomColor, uHorizonColor, smoothstep(0.0, 1.0, t));
          } else {
            float t = heightNorm / 0.15;
            skyColor = mix(uBottomColor * 0.8, uBottomColor, t);
          }

          // === 太阳方向的米氏散射（日落效果）===
          vec3 sunDir = normalize(uSunDirection);
          float sunDot = max(dot(viewDir, sunDir), 0.0);

          // 太阳圆盘
          float sunDisc = smoothstep(0.995, 0.999, sunDot);
          float sunGlow = pow(sunDot, 8.0) * 0.5 + pow(sunDot, 32.0) * 0.8;

          // 大气散射（地平线附近更明显）
          float horizonFactor = 1.0 - abs(heightNorm - 0.2) * 3.0;
          horizonFactor = max(horizonFactor, 0.0);
          float scatter = pow(sunDot, 2.0) * horizonFactor * uScatteringStrength;
          vec3 scatterColor = mix(uSunColor * 0.5, uSunColor, horizonFactor);

          // 地平线辉光带
          float horizonBand = exp(-pow((heightNorm - 0.2) * 8.0, 2.0)) * uHorizonGlow;
          vec3 horizonGlowColor = uSunColor * horizonBand * sunDot * 0.5;

          // 组合
          skyColor += scatterColor * scatter * uSunIntensity;
          skyColor += uSunColor * sunGlow * uSunIntensity * 0.3;
          skyColor += horizonGlowColor;
          skyColor += uSunColor * sunDisc * uSunIntensity * 2.0;

          // 微妙的天空噪点（增加质感）
          float skyNoise = fbm(viewDir.xz * 3.0 + viewDir.y * 2.0 + uTime * 0.01);
          skyColor += skyNoise * 0.015 * (1.0 - heightNorm);

          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
    });

    const dome = new THREE.Mesh(geom, mat);
    dome.name = 'Atmosphere_SkyDome';
    dome.renderOrder = -100;
    return dome;
  }

  // ========== 云层 ==========
  _createCloudLayer(layerIndex) {
    const radius = this.radius * 0.85 - layerIndex * 20;
    const height = layerIndex === 0 ? 60 : 90;
    const geom = new THREE.CylinderGeometry(radius, radius, 2, 48, 1, true);
    geom.translate(0, height, 0);
    geom.scale(-1, 1, 1);

    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uCloudColor: { value: new THREE.Color(0xffffff) },
        uCloudDensity: { value: 0.5 },
        uCloudScale: { value: layerIndex === 0 ? 0.015 : 0.01 },
        uTime: { value: 0 },
        uWindOffset: { value: layerIndex * 100 },
        uWindSpeed: { value: layerIndex === 0 ? 0.02 : 0.012 },
        uOpacity: { value: 0.7 },
        uLightDirection: { value: new THREE.Vector3(0.5, 0.7, 0.3).normalize() },
        uLightColor: { value: new THREE.Color(0xfff5e6) },
        uBottomShadow: { value: 0.3 },
      },
      vertexShader: /* glsl */`
        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying float vHeight;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vUv = uv;
          vHeight = position.y;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uCloudColor;
        uniform float uCloudDensity;
        uniform float uCloudScale;
        uniform float uTime;
        uniform float uWindOffset;
        uniform float uWindSpeed;
        uniform float uOpacity;
        uniform vec3 uLightDirection;
        uniform vec3 uLightColor;
        uniform float uBottomShadow;

        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying float vHeight;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

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

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.02;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          // 用世界坐标 XZ 平面采样云纹理
          vec2 cloudUV = vWorldPos.xz * uCloudScale;
          cloudUV.x += uTime * uWindSpeed + uWindOffset;
          cloudUV.y += uTime * uWindSpeed * 0.3;

          // 多层 FBM 云
          float cloudShape = fbm(cloudUV * 2.0);
          cloudShape += fbm(cloudUV * 4.0 + 10.0) * 0.5;
          cloudShape = cloudShape / 1.5;

          // 密度阈值
          float threshold = 1.0 - uCloudDensity * 0.8;
          float cloudAlpha = smoothstep(threshold, threshold + 0.25, cloudShape);

          // 边缘柔和
          cloudAlpha *= smoothstep(0.0, 0.15, vUv.y);
          cloudAlpha *= smoothstep(1.0, 0.85, vUv.y);

          if (cloudAlpha < 0.01) discard;

          // 云的光照：顶部更亮，底部有阴影
          float lightFactor = mix(uBottomShadow, 1.0, vUv.y);

          // 方向光散射（云的边缘更亮）
          vec3 cloudNormal = vec3(0.0, 1.0, 0.0);
          float NdotL = max(dot(cloudNormal, uLightDirection), 0.0);
          vec3 litColor = uCloudColor * (0.5 + NdotL * 0.5) * lightFactor;
          litColor += uLightColor * NdotL * 0.2;

          gl_FragColor = vec4(litColor, cloudAlpha * uOpacity);
        }
      `,
    });

    const clouds = new THREE.Mesh(geom, mat);
    clouds.name = `Atmosphere_CloudLayer_${layerIndex}`;
    clouds.renderOrder = -50 + layerIndex;
    return clouds;
  }

  // ========== 太阳光晕 ==========
  _createSunGlow() {
    const group = new THREE.Group();
    group.name = 'Atmosphere_SunGlow';

    // 太阳核心
    const coreGeom = new THREE.CircleGeometry(8, 32);
    const coreMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0xfff5e6) },
        uIntensity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          float dist = length(vUv - 0.5) * 2.0;
          float core = smoothstep(1.0, 0.3, dist);
          float glow = exp(-dist * 3.0) * 0.5;
          float alpha = (core + glow) * uIntensity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
    const sunCore = new THREE.Mesh(coreGeom, coreMat);
    sunCore.name = 'Sun_Core';
    group.add(sunCore);

    // 太阳射线（光芒）
    const rayGeom = new THREE.PlaneGeometry(60, 60, 1, 1);
    const rayMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0xffe4b5) },
        uIntensity: { value: 0.3 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uTime;
        varying vec2 vUv;

        float hash(float n) { return fract(sin(n) * 43758.5453); }

        void main() {
          vec2 center = vec2(0.5);
          vec2 dir = vUv - center;
          float dist = length(dir);
          float angle = atan(dir.y, dir.x);

          // 射线状图案
          float rays = sin(angle * 12.0 + uTime * 0.1) * 0.5 + 0.5;
          rays += sin(angle * 7.0 + uTime * 0.15 + 1.0) * 0.3;
          rays = rays * 0.5 + 0.5;

          // 径向衰减
          float radial = exp(-dist * 2.5);
          float rayGlow = rays * radial * uIntensity;

          // 中心光晕
          float centerGlow = exp(-dist * 4.0) * 0.4;

          float alpha = rayGlow + centerGlow;
          gl_FragColor = vec4(uColor, alpha * uIntensity);
        }
      `,
    });
    const sunRays = new THREE.Mesh(rayGeom, rayMat);
    sunRays.name = 'Sun_Rays';
    group.add(sunRays);

    group.userData.coreMat = coreMat;
    group.userData.rayMat = rayMat;
    group.renderOrder = -80;

    return group;
  }

  // ========== 月亮 ==========
  _createMoon() {
    const group = new THREE.Group();
    group.name = 'Atmosphere_Moon';

    // 月亮球体
    const moonGeom = new THREE.SphereGeometry(5, 32, 32);
    const moonMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xf5f5dc) },
        uIntensity: { value: 0.0 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormal;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

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

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          // 月球表面陨石坑纹理
          vec2 craterUV = vUv * 8.0;
          float craters = fbm(craterUV);
          craters = pow(craters, 1.5);

          // 明暗区域（月海和高地）
          float maria = fbm(vUv * 3.0);
          maria = smoothstep(0.4, 0.6, maria);

          vec3 baseColor = mix(uColor * 0.85, uColor, maria);
          baseColor *= 0.7 + craters * 0.6;

          // 边缘暗化
          float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
          baseColor *= 1.0 - rim * 0.5;

          gl_FragColor = vec4(baseColor, uIntensity);
        }
      `,
    });
    const moon = new THREE.Mesh(moonGeom, moonMat);
    group.add(moon);

    // 月亮光晕
    const haloGeom = new THREE.CircleGeometry(12, 32);
    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0xc8d8f0) },
        uIntensity: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          float dist = length(vUv - 0.5) * 2.0;
          float glow = exp(-dist * 2.0) * 0.6;
          float outerGlow = exp(-dist * 0.8) * 0.2;
          gl_FragColor = vec4(uColor, (glow + outerGlow) * uIntensity);
        }
      `,
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    group.add(halo);

    group.userData.moonMat = moonMat;
    group.userData.haloMat = haloMat;
    group.renderOrder = -75;

    return group;
  }

  // ========== 星星 ==========
  _createStars() {
    const starCount = 1500;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);
    const twinkleSpeeds = new Float32Array(starCount);
    const twinkleOffsets = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // 上半球随机分布
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - Math.random() * 0.7); // 只在上半球 0 ~ 0.7π
      const r = this.radius * 0.95;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      sizes[i] = 0.5 + Math.random() * 2.0;

      // 星星颜色：白色、淡蓝、淡黄
      const colorChoice = Math.random();
      if (colorChoice < 0.6) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 1.0;
      } else if (colorChoice < 0.85) {
        colors[i * 3] = 0.8;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 0.8;
      }

      twinkleSpeeds[i] = 0.5 + Math.random() * 2.0;
      twinkleOffsets[i] = Math.random() * Math.PI * 2;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('twinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1));
    geom.setAttribute('twinkleOffset', new THREE.BufferAttribute(twinkleOffsets, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.0 },
        uPixelRatio: { value: 1.0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute float twinkleSpeed;
        attribute float twinkleOffset;

        uniform float uTime;
        uniform float uOpacity;
        uniform float uPixelRatio;

        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          vColor = color;
          vTwinkle = sin(uTime * twinkleSpeed + twinkleOffset) * 0.5 + 0.5;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);

          // 柔和的星形
          float star = smoothstep(0.5, 0.1, dist);
          float core = smoothstep(0.3, 0.0, dist);

          float alpha = (star * 0.7 + core * 0.3) * uOpacity * (0.5 + vTwinkle * 0.5);

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    });

    const stars = new THREE.Points(geom, mat);
    stars.name = 'Atmosphere_Stars';
    stars.renderOrder = -90;
    return stars;
  }

  // ========== 地平线雾光带 ==========
  _createFogRim() {
    const geom = new THREE.RingGeometry(this.radius * 0.3, this.radius * 0.95, 64, 1);
    geom.rotateX(-Math.PI / 2);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      uniforms: {
        uFogColor: { value: new THREE.Color(0xc5e1f5) },
        uIntensity: { value: 0.3 },
        uHeight: { value: 5.0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying float vDist;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vDist = length(position.xz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uFogColor;
        uniform float uIntensity;
        uniform float uHeight;
        varying vec3 vWorldPos;
        varying float vDist;

        void main() {
          // 从内到外逐渐变浓
          float fogFactor = smoothstep(0.3, 1.0, vDist);
          float alpha = fogFactor * uIntensity;
          gl_FragColor = vec4(uFogColor, alpha);
        }
      `,
    });

    const rim = new THREE.Mesh(geom, mat);
    rim.name = 'Atmosphere_FogRim';
    rim.position.y = 0.5;
    rim.renderOrder = -60;
    return rim;
  }

  // ========== 预设配置 ==========
  _buildPresets() {
    return {
      day: {
        sky: {
          topColor: new THREE.Color(0x3d7fc9),
          midColor: new THREE.Color(0x7ab8e0),
          horizonColor: new THREE.Color(0xb8dcf0),
          bottomColor: new THREE.Color(0xd8ecf8),
          scatteringStrength: 0.4,
          horizonGlow: 0.3,
        },
        sun: {
          position: new THREE.Vector3(25, 40, 20),
          color: new THREE.Color(0xfff5e6),
          intensity: 1.0,
        },
        clouds: [
          { color: new THREE.Color(0xffffff), density: 0.45, opacity: 0.65 },
          { color: new THREE.Color(0xf0f0f0), density: 0.35, opacity: 0.45 },
        ],
        fog: {
          color: new THREE.Color(0x98c4e8),
          density: 0.005,
          heightFalloff: 0.02,
        },
        fogRim: { color: new THREE.Color(0xc5e1f5), intensity: 0.25 },
        moon: { intensity: 0.0 },
        stars: { opacity: 0.0 },
      },
      dawn: {
        sky: {
          topColor: new THREE.Color(0x5a6fa5),
          midColor: new THREE.Color(0xe8956a),
          horizonColor: new THREE.Color(0xffc48a),
          bottomColor: new THREE.Color(0xffe0b8),
          scatteringStrength: 1.2,
          horizonGlow: 0.8,
        },
        sun: {
          position: new THREE.Vector3(24, 22, 20),
          color: new THREE.Color(0xffb070),
          intensity: 0.9,
        },
        clouds: [
          { color: new THREE.Color(0xffd4a3), density: 0.5, opacity: 0.7 },
          { color: new THREE.Color(0xf0b080), density: 0.4, opacity: 0.5 },
        ],
        fog: {
          color: new THREE.Color(0xf2a36b),
          density: 0.012,
          heightFalloff: 0.03,
        },
        fogRim: { color: new THREE.Color(0xffc48a), intensity: 0.5 },
        moon: { intensity: 0.1 },
        stars: { opacity: 0.1 },
      },
      sunset: {
        sky: {
          topColor: new THREE.Color(0x4a3f6b),
          midColor: new THREE.Color(0xe07040),
          horizonColor: new THREE.Color(0xff8c42),
          bottomColor: new THREE.Color(0xffb870),
          scatteringStrength: 1.5,
          horizonGlow: 1.0,
        },
        sun: {
          position: new THREE.Vector3(40, 15, 10),
          color: new THREE.Color(0xff7030),
          intensity: 0.8,
        },
        clouds: [
          { color: new THREE.Color(0xff9060), density: 0.55, opacity: 0.75 },
          { color: new THREE.Color(0xd05030), density: 0.45, opacity: 0.55 },
        ],
        fog: {
          color: new THREE.Color(0xf77f00),
          density: 0.015,
          heightFalloff: 0.035,
        },
        fogRim: { color: new THREE.Color(0xffa060), intensity: 0.6 },
        moon: { intensity: 0.2 },
        stars: { opacity: 0.2 },
      },
      night: {
        sky: {
          topColor: new THREE.Color(0x0a0f2e),
          midColor: new THREE.Color(0x1a235e),
          horizonColor: new THREE.Color(0x2a3575),
          bottomColor: new THREE.Color(0x1f2850),
          scatteringStrength: 0.1,
          horizonGlow: 0.1,
        },
        sun: {
          position: new THREE.Vector3(-20, 35, -20),
          color: new THREE.Color(0x4a6fa5),
          intensity: 0.05,
        },
        clouds: [
          { color: new THREE.Color(0x3a4570), density: 0.3, opacity: 0.35 },
          { color: new THREE.Color(0x2a3560), density: 0.25, opacity: 0.25 },
        ],
        fog: {
          color: new THREE.Color(0x131b3e),
          density: 0.008,
          heightFalloff: 0.025,
        },
        fogRim: { color: new THREE.Color(0x2a3575), intensity: 0.15 },
        moon: {
          intensity: 0.8,
          position: new THREE.Vector3(-30, 50, -25),
          color: new THREE.Color(0xf5f5dc),
        },
        stars: { opacity: 1.0 },
      },
    };
  }

  // ========== 公共 API ==========

  setPreset(name) {
    if (!this.presets[name]) return;
    this.targetPreset = name;
    this.blendFactor = 0;
  }

  applyPreset(name, immediate = false) {
    const preset = this.presets[name];
    if (!preset) return;

    this.currentPreset = name;
    this.targetPreset = null;

    // 天空
    const skyMat = this.skyDome.material;
    skyMat.uniforms.uTopColor.value.copy(preset.sky.topColor);
    skyMat.uniforms.uMidColor.value.copy(preset.sky.midColor);
    skyMat.uniforms.uHorizonColor.value.copy(preset.sky.horizonColor);
    skyMat.uniforms.uBottomColor.value.copy(preset.sky.bottomColor);
    skyMat.uniforms.uScatteringStrength.value = preset.sky.scatteringStrength;
    skyMat.uniforms.uHorizonGlow.value = preset.sky.horizonGlow;
    skyMat.uniforms.uSunDirection.value.copy(preset.sun.position).normalize();
    skyMat.uniforms.uSunColor.value.copy(preset.sun.color);
    skyMat.uniforms.uSunIntensity.value = preset.sun.intensity;

    // 云层
    const cloudLayers = [this.cloudLayer1, this.cloudLayer2];
    for (let i = 0; i < 2; i++) {
      const mat = cloudLayers[i].material;
      mat.uniforms.uCloudColor.value.copy(preset.clouds[i].color);
      mat.uniforms.uCloudDensity.value = preset.clouds[i].density;
      mat.uniforms.uOpacity.value = preset.clouds[i].opacity;
      mat.uniforms.uLightColor.value.copy(preset.sun.color);
      mat.uniforms.uLightDirection.value.copy(preset.sun.position).normalize();
    }

    // 太阳光晕位置
    const sunDir = preset.sun.position.clone().normalize();
    const sunDist = this.radius * 0.7;
    this.sunGlow.position.copy(sunDir.multiplyScalar(sunDist));
    this.sunGlow.lookAt(0, 0, 0);
    this.sunGlow.userData.coreMat.uniforms.uColor.value.copy(preset.sun.color);
    this.sunGlow.userData.coreMat.uniforms.uIntensity.value = preset.sun.intensity;
    this.sunGlow.userData.rayMat.uniforms.uColor.value.copy(preset.sun.color);
    this.sunGlow.userData.rayMat.uniforms.uIntensity.value = preset.sun.intensity * 0.3;
    this.sunGlow.visible = preset.sun.intensity > 0.1;

    // 月亮
    if (preset.moon.position) {
      const moonDir = preset.moon.position.clone().normalize();
      const moonDist = this.radius * 0.75;
      this.moonMesh.position.copy(moonDir.multiplyScalar(moonDist));
      this.moonMesh.lookAt(0, 0, 0);
    }
    this.moonMesh.userData.moonMat.uniforms.uIntensity.value = preset.moon.intensity;
    this.moonMesh.userData.haloMat.uniforms.uIntensity.value = preset.moon.intensity * 0.5;
    if (preset.moon.color) {
      this.moonMesh.userData.moonMat.uniforms.uColor.value.copy(preset.moon.color);
    }

    // 星星
    this.stars.material.uniforms.uOpacity.value = preset.stars.opacity;

    // 雾光带
    const fogRimMat = this.fogRim.material;
    fogRimMat.uniforms.uFogColor.value.copy(preset.fogRim.color);
    fogRimMat.uniforms.uIntensity.value = preset.fogRim.intensity;

    // 场景雾（保持与现有系统兼容）
    if (this.scene.fog?.isFogExp2) {
      this.scene.fog.color.copy(preset.fog.color);
      this.scene.fog.density = preset.fog.density;
    }

    // 背景色（作为后备）
    if (this.scene.background?.isColor) {
      this.scene.background.copy(preset.sky.horizonColor);
    }
  }

  update(delta, camera) {
    this.time += delta;

    // 预设过渡
    if (this.targetPreset && this.blendFactor < 1) {
      this.blendFactor = Math.min(1, this.blendFactor + delta * this.blendSpeed);
      if (this.blendFactor >= 1) {
        this.applyPreset(this.targetPreset, true);
      }
    }

    // 天空 shader 时间
    this.skyDome.material.uniforms.uTime.value = this.time;

    // 云层动画
    this.cloudLayer1.material.uniforms.uTime.value = this.time;
    this.cloudLayer2.material.uniforms.uTime.value = this.time;

    // 太阳射线动画
    this.sunGlow.userData.rayMat.uniforms.uTime.value = this.time;

    // 星星闪烁
    this.stars.material.uniforms.uTime.value = this.time;

    // 月亮自转
    this.moonMesh.rotation.y += delta * 0.02;
    this.moonMesh.userData.moonMat.uniforms.uTime.value = this.time;

    // 让天空穹顶跟随相机（保持在远处）
    if (camera) {
      this.skyDome.position.copy(camera.position);
      this.cloudLayer1.position.x = camera.position.x;
      this.cloudLayer1.position.z = camera.position.z;
      this.cloudLayer2.position.x = camera.position.x;
      this.cloudLayer2.position.z = camera.position.z;
      this.fogRim.position.x = camera.position.x;
      this.fogRim.position.z = camera.position.z;
      this.fogRim.position.y = camera.position.y * 0.1;
    }
  }

  // 获取当前雾参数（供草地、水面等 shader 使用）
  getFogParams() {
    const preset = this.presets[this.currentPreset];
    return {
      color: preset.fog.color.clone(),
      density: preset.fog.density,
      heightFalloff: preset.fog.heightFalloff,
    };
  }

  // 获取太阳方向
  getSunDirection() {
    const preset = this.presets[this.currentPreset];
    return preset.sun.position.clone().normalize();
  }
}
