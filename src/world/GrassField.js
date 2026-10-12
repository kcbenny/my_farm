import * as THREE from 'three';

/**
 * GrassField - High-quality procedural grass field with wind sway
 *
 * v4 Improvements:
 * - Crossed-plane geometry (2 planes at 90°) for proper volume from all angles
 * - UV-based grass blade shape with alpha clipping (not gl_PointCoord hack)
 * - PBR lighting via MeshStandardMaterial + onBeforeCompile
 * - Natural tapered blade shape with soft edges
 * - Ambient occlusion at base for depth
 * - Subsurface scattering hint on blade tips
 * - 4 grass types: fine, broad, wheat, wild grass
 * - Improved multi-layer wind with noise-based turbulence
 * - Wildflowers with petal detail
 * - Better clumped distribution
 */
export class GrassField {
  static create(scene, getTerrainHeight, options = {}) {
    const grassField = new GrassField(scene, getTerrainHeight, options);
    grassField.build();
    return grassField;
  }

  constructor(scene, getTerrainHeight, options = {}) {
    this.scene = scene;
    this.getTerrainHeight = getTerrainHeight;
    this.options = {
      bladeCount: 12000,
      spreadRadius: 45,
      minHeight: 0.15,
      maxHeight: 0.55,
      windStrength: 0.5,
      windSpeed: 0.8,
      flowerRatio: 0.03,
      ...options,
    };

    this.avoidPoints = options.avoidPoints || [];
    this.grassMesh = null;
    this.flowerMesh = null;
    this.grassMaterial = null;
    this.flowerMaterial = null;
    this.time = 0;
    this.windDirection = new THREE.Vector2(1, 0.4).normalize();
  }

  build() {
    this._buildGrass();
    this._buildFlowers();
  }

  _buildGrass() {
    const { bladeCount, spreadRadius, minHeight, maxHeight } = this.options;

    const bladeGeom = this._createCrossedBladeGeometry();
    this.grassMaterial = this._createGrassMaterial();

    this.grassMesh = new THREE.InstancedMesh(bladeGeom, this.grassMaterial, bladeCount);
    this.grassMesh.name = 'Grass_Field';
    this.grassMesh.castShadow = false;
    this.grassMesh.receiveShadow = true;
    this.grassMesh.userData.physics = false;

    const dummy = new THREE.Object3D();
    const colors = new Float32Array(bladeCount * 3);
    const phases = new Float32Array(bladeCount);
    const heights = new Float32Array(bladeCount);
    const bladeTypes = new Float32Array(bladeCount);
    const randomSeeds = new Float32Array(bladeCount);

    // Natural grass color palette - varied greens with warm and cool tones
    const baseColors = [
      new THREE.Color(0x4a7c3a), // deep forest green
      new THREE.Color(0x558b2f), // dark olive green
      new THREE.Color(0x689f38), // medium green
      new THREE.Color(0x7cb342), // bright meadow green
      new THREE.Color(0x8bc34a), // light green
      new THREE.Color(0x9ccc65), // pale green
      new THREE.Color(0x6b8e23), // olive drab
      new THREE.Color(0x5a8f42), // sage green
    ];

    // Generate clump centers for clustered distribution
    const clumpCount = Math.floor(bladeCount / 40);
    const clumps = [];
    for (let i = 0; i < clumpCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.6) * spreadRadius * 0.95;
      clumps.push({
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        size: 0.8 + Math.random() * 2.5,
        density: 0.5 + Math.random() * 0.8,
      });
    }

    let placed = 0;
    let attempts = 0;
    const maxAttempts = bladeCount * 8;

    while (placed < bladeCount && attempts < maxAttempts) {
      attempts++;

      let x, z;
      // 70% chance to place near a clump, 30% random scatter
      if (Math.random() < 0.7) {
        const clump = clumps[Math.floor(Math.random() * clumps.length)];
        const localAngle = Math.random() * Math.PI * 2;
        const localDist = Math.pow(Math.random(), 0.7) * clump.size;
        x = clump.x + Math.cos(localAngle) * localDist;
        z = clump.z + Math.sin(localAngle) * localDist;
      } else {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.pow(Math.random(), 0.5) * spreadRadius * 0.95;
        x = Math.cos(angle) * dist;
        z = Math.sin(angle) * dist;
      }

      // Bounds check
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter > spreadRadius) continue;

      // Avoid zones
      let inAvoid = false;
      for (const pt of this.avoidPoints) {
        const dx = x - pt.x;
        const dz = z - pt.z;
        if (dx * dx + dz * dz < pt.radius * pt.radius) { inAvoid = true; break; }
      }
      if (inAvoid) continue;

      const y = this.getTerrainHeight(x, z);

      // Slope check - less grass on steep slopes
      const h1 = this.getTerrainHeight(x + 0.3, z);
      const h2 = this.getTerrainHeight(x - 0.3, z);
      const slope = Math.abs(h1 - h2);
      if (slope > 0.5) continue;
      if (slope > 0.25 && Math.random() > 0.5) continue;

      // Near path = shorter, sparser grass
      const nearPath = this._isNearPath(x, z);
      if (nearPath && Math.random() > 0.35) continue;
      const heightMultiplier = nearPath ? 0.45 : 1.0;

      // Height distribution: more short blades, fewer tall ones
      const t = Math.pow(Math.random(), 1.4);
      const height = (minHeight + t * (maxHeight - minHeight)) * heightMultiplier;

      // Grass type distribution
      const r = Math.random();
      let bladeType;
      if (r < 0.55) bladeType = 0;      // fine grass (most common)
      else if (r < 0.80) bladeType = 1; // broad blade
      else if (r < 0.93) bladeType = 2; // wheat-like (taller)
      else bladeType = 3;               // wild grass (dark, thin)

      const widthScale = bladeType === 0 ? 0.6 :
                         bladeType === 1 ? 1.2 :
                         bladeType === 2 ? 0.45 : 0.5;
      const heightScale = bladeType === 2 ? 1.25 :
                          bladeType === 3 ? 0.9 : 1.0;

      dummy.position.set(x, y, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      // Slight natural tilt
      dummy.rotation.x = (Math.random() - 0.5) * 0.12;
      dummy.rotation.z = (Math.random() - 0.5) * 0.08;
      dummy.scale.set(widthScale, height * heightScale, 1);
      dummy.updateMatrix();
      this.grassMesh.setMatrixAt(placed, dummy.matrix);

      // Color selection with natural variation
      let baseColor;
      if (bladeType === 2) {
        // Wheat-like: more yellow-green
        const wheatColors = [
          new THREE.Color(0x9ccc65),
          new THREE.Color(0xc5e1a5),
          new THREE.Color(0xdce775),
        ];
        baseColor = wheatColors[Math.floor(Math.random() * wheatColors.length)];
      } else if (bladeType === 3) {
        // Wild grass: darker, bluer green
        const wildColors = [
          new THREE.Color(0x33691e),
          new THREE.Color(0x4a7c3a),
          new THREE.Color(0x558b2f),
        ];
        baseColor = wildColors[Math.floor(Math.random() * wildColors.length)];
      } else {
        baseColor = baseColors[Math.floor(Math.random() * baseColors.length)];
      }

      // Subtle per-blade color variation
      const tempColor = baseColor.clone();
      const hueShift = (Math.random() - 0.5) * 0.04;
      const satShift = (Math.random() - 0.5) * 0.06;
      const lightShift = (Math.random() - 0.5) * 0.06;
      tempColor.offsetHSL(hueShift, satShift, lightShift);

      colors[placed * 3] = tempColor.r;
      colors[placed * 3 + 1] = tempColor.g;
      colors[placed * 3 + 2] = tempColor.b;

      phases[placed] = Math.random() * Math.PI * 2;
      heights[placed] = height;
      bladeTypes[placed] = bladeType;
      randomSeeds[placed] = Math.random() * 1000;

      placed++;
    }

    if (placed < bladeCount) this.grassMesh.count = placed;

    this.grassMesh.geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors.slice(0, placed * 3), 3));
    this.grassMesh.geometry.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(phases.slice(0, placed), 1));
    this.grassMesh.geometry.setAttribute('instanceHeight', new THREE.InstancedBufferAttribute(heights.slice(0, placed), 1));
    this.grassMesh.geometry.setAttribute('instanceBladeType', new THREE.InstancedBufferAttribute(bladeTypes.slice(0, placed), 1));
    this.grassMesh.geometry.setAttribute('instanceSeed', new THREE.InstancedBufferAttribute(randomSeeds.slice(0, placed), 1));

    this.scene.add(this.grassMesh);
    this._grassCount = placed;
  }

  _buildFlowers() {
    const { bladeCount, flowerRatio, spreadRadius } = this.options;
    const flowerCount = Math.floor(bladeCount * flowerRatio);
    if (flowerCount === 0) return;

    const flowerGeom = this._createFlowerGeometry();
    this.flowerMaterial = this._createFlowerMaterial();

    this.flowerMesh = new THREE.InstancedMesh(flowerGeom, this.flowerMaterial, flowerCount);
    this.flowerMesh.name = 'Grass_Flowers';
    this.flowerMesh.castShadow = false;
    this.flowerMesh.receiveShadow = true;
    this.flowerMesh.userData.physics = false;

    const dummy = new THREE.Object3D();
    const petalColors = new Float32Array(flowerCount * 3);
    const phases = new Float32Array(flowerCount);
    const flowerTypes = new Float32Array(flowerCount);

    const flowerPalette = [
      new THREE.Color(0xffffff),       // white daisy
      new THREE.Color(0xffd93d),       // yellow buttercup
      new THREE.Color(0xff8fab),       // pink clover
      new THREE.Color(0xba68c8),       // purple clover
      new THREE.Color(0xffa726),       // orange hawkweed
      new THREE.Color(0x81d4fa),       // light blue
      new THREE.Color(0xf8bbd9),       // soft pink
      new THREE.Color(0xffe082),       // pale yellow
    ];

    let placed = 0;
    let attempts = 0;

    while (placed < flowerCount && attempts < flowerCount * 15) {
      attempts++;

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.5) * spreadRadius * 0.9;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Avoid zones
      let inAvoid = false;
      for (const pt of this.avoidPoints) {
        const dx = x - pt.x;
        const dz = z - pt.z;
        if (dx * dx + dz * dz < pt.radius * pt.radius) { inAvoid = true; break; }
      }
      if (inAvoid) continue;

      const y = this.getTerrainHeight(x, z);
      if (this._isNearPath(x, z)) continue;

      const flowerHeight = 0.18 + Math.random() * 0.25;
      const scale = 0.5 + Math.random() * 0.7;
      const flowerType = Math.random() < 0.6 ? 0 : 1; // 0=daisy-like, 0=clover-like

      dummy.position.set(x, y, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.scale.set(scale, flowerHeight, scale);
      dummy.updateMatrix();
      this.flowerMesh.setMatrixAt(placed, dummy.matrix);

      const color = flowerPalette[Math.floor(Math.random() * flowerPalette.length)];
      petalColors[placed * 3] = color.r;
      petalColors[placed * 3 + 1] = color.g;
      petalColors[placed * 3 + 2] = color.b;
      phases[placed] = Math.random() * Math.PI * 2;
      flowerTypes[placed] = flowerType;

      placed++;
    }

    if (placed < flowerCount) this.flowerMesh.count = placed;

    this.flowerMesh.geometry.setAttribute('instancePetalColor', new THREE.InstancedBufferAttribute(petalColors.slice(0, placed * 3), 3));
    this.flowerMesh.geometry.setAttribute('instancePhase', new THREE.InstancedBufferAttribute(phases.slice(0, placed), 1));
    this.flowerMesh.geometry.setAttribute('instanceFlowerType', new THREE.InstancedBufferAttribute(flowerTypes.slice(0, placed), 1));

    this.scene.add(this.flowerMesh);
  }

  /**
   * Create crossed-plane grass blade geometry (2 planes at 90°)
   * This gives volume from all viewing angles
   */
  _createCrossedBladeGeometry() {
    const segments = 5;
    const baseWidth = 0.12;
    const height = 1.0;

    const positions = [];
    const uvs = [];
    const indices = [];
    const bendFactors = [];
    let vertexOffset = 0;

    // Create two crossed planes
    for (let plane = 0; plane < 2; plane++) {
      const rotY = plane * Math.PI / 2;
      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);

      for (let y = 0; y <= segments; y++) {
        const t = y / segments;
        const yPos = t * height;

        // Natural taper: wide base, narrow tip with slight bulge
        const widthTaper = 1.0 - Math.pow(t, 1.4) * 0.88;
        const w = baseWidth * widthTaper;

        // Natural forward curve (bezier-like)
        const curveAmount = Math.pow(t, 2.0) * 0.12;

        // Left and right vertices of this plane
        for (let side = 0; side < 2; side++) {
          const xLocal = (side === 0 ? -1 : 1) * w / 2;
          const zLocal = curveAmount;

          // Rotate around Y axis for cross plane
          const x = xLocal * cosR + zLocal * sinR;
          const z = -xLocal * sinR + zLocal * cosR;

          positions.push(x, yPos, z);
          uvs.push(side, t);

          // Bend factor - non-linear, more movement at tip
          const bend = Math.pow(t, 1.6) * 0.75 + t * 0.25;
          bendFactors.push(bend);
        }
      }

      // Indices for this plane
      for (let y = 0; y < segments; y++) {
        const i = vertexOffset + y * 2;
        indices.push(i, i + 1, i + 2);
        indices.push(i + 1, i + 3, i + 2);
      }

      vertexOffset += (segments + 1) * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('aBendFactor', new THREE.Float32BufferAttribute(bendFactors, 1));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  _createFlowerGeometry() {
    const positions = [];
    const uvs = [];
    const indices = [];
    const bendFactors = [];
    const flowerMasks = []; // 1 = flower part, 0 = stem
    let vertexIndex = 0;

    // === Stem (crossed planes for volume) ===
    const stemSegments = 2;
    const stemWidth = 0.025;
    const stemHeight = 0.65;

    for (let plane = 0; plane < 2; plane++) {
      const rotY = plane * Math.PI / 2;
      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);
      const planeStart = vertexIndex;

      for (let y = 0; y <= stemSegments; y++) {
        const t = y / stemSegments;
        const yPos = t * stemHeight;
        const w = stemWidth * (1 - t * 0.25);
        const curve = Math.pow(t, 2) * 0.06;

        for (let side = 0; side < 2; side++) {
          const xLocal = (side === 0 ? -1 : 1) * w / 2;
          const zLocal = curve;
          const x = xLocal * cosR + zLocal * sinR;
          const z = -xLocal * sinR + zLocal * cosR;

          positions.push(x, yPos, z);
          uvs.push(0.5 + (side === 0 ? -0.5 : 0.5) * 0.1, t * 0.7); // stem uses lower UV range
          bendFactors.push(t * t * 0.6);
          flowerMasks.push(0.0); // stem
          vertexIndex++;
        }
      }

      for (let y = 0; y < stemSegments; y++) {
        const i = planeStart + y * 2;
        indices.push(i, i + 1, i + 2);
        indices.push(i + 1, i + 3, i + 2);
      }
    }

    // === Flower head (crossed planes with petal shape) ===
    const petalWidth = 0.15;
    const petalHeight = 0.15;
    const petalY = stemHeight + petalHeight * 0.2;

    for (let plane = 0; plane < 2; plane++) {
      const rotY = plane * Math.PI / 2;
      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);
      const planeStart = vertexIndex;

      // 5 vertices for petal shape (diamond/teardrop)
      const petalVerts = [
        { x: -petalWidth * 0.55, y: -petalHeight * 0.1, u: 0.0 },
        { x: petalWidth * 0.55, y: -petalHeight * 0.1, u: 1.0 },
        { x: -petalWidth * 0.4, y: petalHeight * 0.4, u: 0.15 },
        { x: petalWidth * 0.4, y: petalHeight * 0.4, u: 0.85 },
        { x: 0, y: petalHeight * 0.9, u: 0.5 },
      ];

      petalVerts.forEach((v) => {
        const x = v.x * cosR;
        const z = v.x * sinR;
        positions.push(x, petalY + v.y, z);
        uvs.push(v.u, 0.85);
        bendFactors.push(1.0);
        flowerMasks.push(1.0); // flower
        vertexIndex++;
      });

      // Triangulate petal
      indices.push(planeStart, planeStart + 1, planeStart + 2);
      indices.push(planeStart + 1, planeStart + 3, planeStart + 2);
      indices.push(planeStart + 2, planeStart + 3, planeStart + 4);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('aBendFactor', new THREE.Float32BufferAttribute(bendFactors, 1));
    geometry.setAttribute('aFlowerMask', new THREE.Float32BufferAttribute(flowerMasks, 1));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  _createGrassMaterial() {
    // Use high-quality custom shader for grass
    // Custom shader gives better control over blade shape, wind, and subsurface lighting
    return this._createGrassCustomShader();
  }

  _createGrassCustomShader() {
    const { windStrength, windSpeed } = this.options;

    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWindStrength: { value: windStrength },
        uWindSpeed: { value: windSpeed },
        uWindDir: { value: this.windDirection.clone() },
        uTipBrightness: { value: new THREE.Color(0xe8f5d0) },
        uAmbientColor: { value: new THREE.Color(0x8bb5d8) },
        uSunColor: { value: new THREE.Color(0xfff5e6) },
        uSunDirection: { value: new THREE.Vector3(0.6, 0.8, 0.4).normalize() },
        uFogColor: { value: new THREE.Color(0x98c4e8) },
        uFogNear: { value: 30 },
        uFogFar: { value: 80 },
      },
      vertexShader: /* glsl */`
        uniform float uTime;
        uniform float uWindStrength;
        uniform float uWindSpeed;
        uniform vec2 uWindDir;
        uniform vec3 uSunDirection;

        attribute mat4 instanceMatrix;
        attribute vec3 normal;
        attribute float aBendFactor;
        attribute float instancePhase;
        attribute float instanceHeight;
        attribute float instanceBladeType;
        attribute vec3 instanceColor;
        attribute float instanceSeed;

        varying vec3 vColor;
        varying float vHeightRatio;
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vWorldPos;
        varying float vFogFactor;

        float hash(float n) {
          return fract(sin(n) * 43758.5453123);
        }

        void main() {
          vec3 pos = position;
          vUv = uv;
          vHeightRatio = aBendFactor;

          // World position of blade base
          vec4 worldBase = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

          // === Wind animation ===
          float windBase = uWindStrength * aBendFactor;

          // Primary wave (large scale rolling)
          float wave1 = sin(worldBase.x * 0.08 + worldBase.z * 0.06 + uTime * uWindSpeed + instancePhase);

          // Secondary wave (medium ripples)
          float wave2 = sin(worldBase.x * 0.28 - worldBase.z * 0.2 + uTime * uWindSpeed * 1.8 + instancePhase * 1.5) * 0.5;

          // Fine turbulence (noise-like)
          float noiseVal = hash(worldBase.x * 15.23 + worldBase.z * 9.17 + instanceSeed + floor(uTime * uWindSpeed * 2.0));
          float wave3 = (noiseVal - 0.5) * 0.35;

          // Gust envelope
          float gust = 0.7 + sin(uTime * 0.4 + instancePhase * 0.3) * 0.3
                        + sin(uTime * 1.2 + instancePhase * 0.6) * 0.12;

          float totalWind = (wave1 * 0.5 + wave2 * 0.35 + wave3 * 0.15) * windBase * gust;

          // Main bend along wind direction
          pos.x += uWindDir.x * totalWind * 0.5;
          pos.z += uWindDir.y * totalWind * 0.5;

          // Perpendicular flutter
          float flutter = sin(uTime * uWindSpeed * 3.0 + instancePhase * 2.5 + worldBase.x * 0.25)
                        * 0.07 * aBendFactor * uWindStrength * gust;
          pos.x += -uWindDir.y * flutter;
          pos.z += uWindDir.x * flutter;

          // Slight upward lift
          pos.y += abs(totalWind) * 0.04;

          // Base color from instance attribute
          vColor = instanceColor;

          // World position for lighting and fog
          vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;

          // Transform normal to world space (approximate)
          vec3 normalW = normalize(mat3(instanceMatrix) * normal);
          vNormalW = normalW;

          // Fog factor
          float dist = length(worldPos.xyz - cameraPosition);
          vFogFactor = smoothstep(uFogNear, uFogFar, dist);

          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uTipBrightness;
        uniform vec3 uAmbientColor;
        uniform vec3 uSunColor;
        uniform vec3 uSunDirection;
        uniform vec3 uFogColor;

        varying vec3 vColor;
        varying float vHeightRatio;
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vWorldPos;
        varying float vFogFactor;

        // Create natural grass blade alpha mask from UVs
        float grassBladeMask(vec2 uv) {
          float x = uv.x;
          float y = uv.y;

          // Tapered width: wide at base, narrow at tip
          float widthAtY = 0.5 * (1.0 - pow(y, 1.4) * 0.9);

          // Subtle wavy edge
          float wave = sin(y * 15.0 + vWorldPos.x * 2.0 + vWorldPos.z * 1.5) * 0.025 * y;
          widthAtY += wave;

          // Distance from center
          float edgeDist = abs(x - 0.5) * 2.0;

          // Smooth edge
          float alpha = smoothstep(widthAtY + 0.06, widthAtY - 0.02, edgeDist);

          // Tip shape - pointy
          float tipZone = smoothstep(0.85, 1.0, y);
          float tipWidth = mix(widthAtY, 0.0, tipZone);
          float tipAlpha = smoothstep(tipWidth + 0.04, tipWidth - 0.01, edgeDist);
          alpha = min(alpha, mix(1.0, tipAlpha, tipZone));

          return alpha;
        }

        void main() {
          // Alpha mask for natural blade shape
          float alpha = grassBladeMask(vUv);
          if (alpha < 0.25) discard;

          // === Color ===
          // Base to tip gradient: darker at base, lighter at tip
          vec3 baseDark = vColor * 0.55;
          vec3 midColor = vColor;
          vec3 tipColor = mix(vColor, uTipBrightness, 0.55);

          vec3 color;
          if (vHeightRatio < 0.3) {
            color = mix(baseDark, midColor, vHeightRatio / 0.3);
          } else if (vHeightRatio < 0.75) {
            color = mix(midColor, vColor, (vHeightRatio - 0.3) / 0.45);
          } else {
            color = mix(vColor, tipColor, (vHeightRatio - 0.75) / 0.25);
          }

          // === Lighting ===
          vec3 normal = normalize(vNormalW);
          vec3 sunDir = normalize(uSunDirection);
          vec3 viewDir = normalize(cameraPosition - vWorldPos);

          // Diffuse lighting
          float NdotL = max(dot(normal, sunDir), 0.0);
          // Also light from back (subsurface / transmission)
          float backLight = max(dot(-normal, sunDir), 0.0) * 0.35 * vHeightRatio;

          vec3 diffuse = uSunColor * (NdotL * 0.7 + backLight);

          // Ambient lighting
          vec3 ambient = uAmbientColor * 0.45;

          // Rim / edge light for depth
          float rim = 1.0 - max(dot(normal, viewDir), 0.0);
          rim = pow(rim, 3.0) * 0.25 * vHeightRatio;
          vec3 rimLight = uSunColor * rim;

          // Combine lighting
          vec3 litColor = color * (ambient + diffuse) + rimLight * color * 2.0;

          // Subsurface scattering hint at tip (light shines through)
          float sss = pow(vHeightRatio, 2.5) * NdotL * 0.3;
          litColor += uTipBrightness * sss * 0.4;

          // Apply fog
          litColor = mix(litColor, uFogColor, vFogFactor * 0.7);

          // Alpha for smooth edges
          float finalAlpha = smoothstep(0.25, 0.5, alpha);

          gl_FragColor = vec4(litColor, finalAlpha);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.25,
      depthWrite: false,
    });
  }

  _createFlowerMaterial() {
    const { windStrength, windSpeed } = this.options;

    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWindStrength: { value: windStrength * 1.3 },
        uWindSpeed: { value: windSpeed },
        uWindDir: { value: this.windDirection.clone() },
        uStemColor: { value: new THREE.Color(0x558b2f) },
        uCenterColor: { value: new THREE.Color(0xffd54f) },
        uAmbientColor: { value: new THREE.Color(0x8bb5d8) },
        uSunColor: { value: new THREE.Color(0xfff5e6) },
        uSunDirection: { value: new THREE.Vector3(0.6, 0.8, 0.4).normalize() },
        uFogColor: { value: new THREE.Color(0x98c4e8) },
        uFogNear: { value: 30 },
        uFogFar: { value: 80 },
      },
      vertexShader: /* glsl */`
        uniform float uTime;
        uniform float uWindStrength;
        uniform float uWindSpeed;
        uniform vec2 uWindDir;

        attribute mat4 instanceMatrix;
        attribute vec3 normal;
        attribute float aBendFactor;
        attribute float instancePhase;
        attribute vec3 instancePetalColor;
        attribute float instanceFlowerType;
        attribute float aFlowerMask;

        varying vec3 vPetalColor;
        varying float vHeightRatio;
        varying vec2 vUv;
        varying float vIsFlower;
        varying vec3 vWorldPos;
        varying float vFogFactor;
        varying vec3 vNormalW;

        float hash(float n) {
          return fract(sin(n) * 43758.5453123);
        }

        void main() {
          vec3 pos = position;
          vUv = uv;
          vHeightRatio = aBendFactor;
          vIsFlower = aFlowerMask;
          vPetalColor = instancePetalColor;

          vec4 worldBase = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

          // Wind animation - flowers sway more than grass
          float windBase = uWindStrength * aBendFactor;

          float wave1 = sin(worldBase.x * 0.1 + worldBase.z * 0.08 + uTime * uWindSpeed + instancePhase);
          float wave2 = sin(worldBase.x * 0.3 - worldBase.z * 0.22 + uTime * uWindSpeed * 1.6 + instancePhase * 1.3) * 0.5;

          float gust = 0.65 + sin(uTime * 0.5 + instancePhase) * 0.35;
          float totalWind = (wave1 * 0.6 + wave2 * 0.4) * windBase * gust;

          pos.x += uWindDir.x * totalWind * 0.6;
          pos.z += uWindDir.y * totalWind * 0.6;

          // Flower head wobble
          if (aFlowerMask > 0.5) {
            float wobble = sin(uTime * uWindSpeed * 1.2 + instancePhase * 1.8) * 0.05 * uWindStrength;
            pos.x += wobble;
            pos.z += wobble * 0.7;
          }

          vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;

          vec3 normalW = normalize(mat3(instanceMatrix) * normal);
          vNormalW = normalW;

          float dist = length(worldPos.xyz - cameraPosition);
          vFogFactor = smoothstep(uFogNear, uFogFar, dist);

          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uStemColor;
        uniform vec3 uCenterColor;
        uniform vec3 uAmbientColor;
        uniform vec3 uSunColor;
        uniform vec3 uSunDirection;
        uniform vec3 uFogColor;

        varying vec3 vPetalColor;
        varying float vHeightRatio;
        varying vec2 vUv;
        varying float vIsFlower;
        varying vec3 vWorldPos;
        varying float vFogFactor;
        varying vec3 vNormalW;

        float stemMask(vec2 uv) {
          float x = uv.x;
          float y = uv.y;
          float width = 0.08 + (1.0 - y) * 0.04;
          float edgeDist = abs(x - 0.5) * 2.0;
          return smoothstep(width + 0.05, width - 0.02, edgeDist);
        }

        float petalMask(vec2 uv) {
          float x = uv.x;
          float y = uv.y;

          // Diamond/petal shape
          float centerDist = abs(x - 0.5) * 2.0;
          float heightFactor = (y - 0.7) / 0.3; // 0 at bottom of petal, 1 at top
          heightFactor = clamp(heightFactor, 0.0, 1.0);

          float widthAtY = 0.5 * (1.0 - pow(heightFactor, 1.2));
          float alpha = smoothstep(widthAtY + 0.08, widthAtY - 0.02, centerDist);

          // Rounded bottom
          float bottom = smoothstep(0.7, 0.65, y);
          float bottomWidth = 0.35;
          float bottomAlpha = smoothstep(bottomWidth + 0.08, bottomWidth - 0.02, centerDist);
          alpha = min(alpha, mix(1.0, bottomAlpha, bottom));

          return alpha;
        }

        void main() {
          float alpha;
          vec3 color;

          if (vIsFlower < 0.5) {
            // Stem
            alpha = stemMask(vUv);
            if (alpha < 0.3) discard;

            // Stem color with gradient
            color = uStemColor * (0.6 + vHeightRatio * 0.5);
          } else {
            // Flower petals
            alpha = petalMask(vUv);
            if (alpha < 0.3) discard;

            // Petal color with center highlight
            float centerDist = abs(vUv.x - 0.5) * 2.0;
            float centerAmount = (1.0 - centerDist) * smoothstep(0.7, 0.85, vUv.y);
            color = mix(vPetalColor, uCenterColor, centerAmount * 0.6);

            // Slight darkening at petal edges
            float edgeDarken = smoothstep(0.3, 0.5, centerDist) * 0.15;
            color *= (1.0 - edgeDarken);
          }

          // Lighting
          vec3 normal = normalize(vNormalW);
          vec3 sunDir = normalize(uSunDirection);

          float NdotL = max(dot(normal, sunDir), 0.0);
          float backLight = max(dot(-normal, sunDir), 0.0) * 0.3;
          vec3 diffuse = uSunColor * (NdotL * 0.6 + backLight);
          vec3 ambient = uAmbientColor * 0.4;

          vec3 litColor = color * (ambient + diffuse);

          // Fog
          litColor = mix(litColor, uFogColor, vFogFactor * 0.7);

          float finalAlpha = smoothstep(0.3, 0.6, alpha);

          gl_FragColor = vec4(litColor, finalAlpha);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.3,
      depthWrite: false,
    });
  }

  _isNearPath(x, z) {
    const pathPoints = [
      { x: -14, z: -15 },
      { x: -8, z: -8 },
      { x: 0, z: -2 },
      { x: 5, z: 5 },
      { x: -5, z: 12 },
      { x: -18, z: 10 },
    ];

    for (const pt of pathPoints) {
      const dx = x - pt.x;
      const dz = z - pt.z;
      if (dx * dx + dz * dz < 12) return true;
    }
    return false;
  }

  update(delta) {
    this.time += delta;

    if (this.grassMaterial) {
      this.grassMaterial.uniforms.uTime.value = this.time;

      // Slowly shifting wind direction
      const windShift = Math.sin(this.time * 0.025) * 0.35;
      this.windDirection.x = Math.cos(windShift) + Math.sin(this.time * 0.018) * 0.15;
      this.windDirection.y = Math.sin(windShift) * 0.6 + Math.cos(this.time * 0.022) * 0.1;
      this.windDirection.normalize();
      this.grassMaterial.uniforms.uWindDir.value.copy(this.windDirection);

      // Gusts
      const gust = 0.7 + Math.sin(this.time * 0.4) * 0.3 + Math.sin(this.time * 1.1) * 0.15;
      this.grassMaterial.uniforms.uWindStrength.value = this.options.windStrength * gust;
    }

    if (this.flowerMaterial) {
      this.flowerMaterial.uniforms.uTime.value = this.time;
      this.flowerMaterial.uniforms.uWindDir.value.copy(this.windDirection);
      const gust = 0.65 + Math.sin(this.time * 0.45) * 0.35 + Math.sin(this.time * 1.3) * 0.12;
      this.flowerMaterial.uniforms.uWindStrength.value = this.options.windStrength * 1.3 * gust;
    }
  }

  dispose() {
    if (this.grassMesh) {
      this.grassMesh.geometry.dispose();
      this.grassMaterial.dispose();
      this.scene.remove(this.grassMesh);
    }
    if (this.flowerMesh) {
      this.flowerMesh.geometry.dispose();
      this.flowerMaterial.dispose();
      this.scene.remove(this.flowerMesh);
    }
  }
}
