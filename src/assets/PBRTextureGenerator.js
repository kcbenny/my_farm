import * as THREE from 'three';

/**
 * PBR Texture Generator:
 * Creates stylized, semi-realistic 1024x1024 PBR texture sets:
 * - BaseColor (RGB): vibrant yet grounded natural tones
 * - Normal Map (RGB): tangent-space surface normals with soft gradients
 * - Packed ORM Map (RGB):
 *     R = Ambient Occlusion (soft contact shading baked in)
 *     G = Roughness (surface micro-sheen)
 *     B = Metallic (non-metal vs metallic sheen)
 */
export class PBRTextureGenerator {
  static cache = new Map();

  /**
   * Helper to ensure geometry has uv2 for Three.js aoMap
   */
  static setupGeometryUV2(geometry) {
    if (!geometry.attributes.uv2 && geometry.attributes.uv) {
      geometry.setAttribute('uv2', geometry.attributes.uv.clone());
    }
    return geometry;
  }

  /**
   * Helper to create an offscreen canvas
   */
  static createCanvas(width = 1024, height = 1024) {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    return null;
  }

  /**
   * Creates a Three.js CanvasTexture with proper color spaces & filtering
   */
  static createTexture(canvas, isSRGB = false) {
    if (!canvas) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = isSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  /**
   * Creates a complete PBR material using BaseColor, Normal, and packed ORM maps
   */
  static createPBRMaterial(key, params = {}) {
    const cached = this.cache.get(key);
    if (cached) return cached.clone();

    const textures = this.getTextureSet(key);
    const material = new THREE.MeshStandardMaterial({
      map: textures.baseColor,
      normalMap: textures.normal,
      normalScale: params.normalScale || new THREE.Vector2(0.8, 0.8),
      aoMap: textures.orm,
      aoMapIntensity: params.aoMapIntensity !== undefined ? params.aoMapIntensity : 1.0,
      roughnessMap: textures.orm,
      metalnessMap: textures.orm,
      roughness: params.roughness !== undefined ? params.roughness : 0.8,
      metalness: params.metalness !== undefined ? params.metalness : 0.0,
      flatShading: false,
      ...params
    });

    this.cache.set(key, material);
    return material;
  }

  /**
   * Get or generate texture sets by identifier
   */
  static getTextureSet(key) {
    switch (key) {
      // Modular Terraforming Blocks
      case 'tile_untilled':
        return this.generateSoilTexture({ moisture: 0.2, tilled: false });
      case 'tile_tilled':
        return this.generateSoilTexture({ moisture: 0.35, tilled: true });
      case 'tile_watered':
        return this.generateSoilTexture({ moisture: 0.95, tilled: true });
      case 'tile_grass':
        return this.generateGrassTexture();
      case 'tile_rocks':
        return this.generateRockTexture();

      // Crops
      case 'crop_wheat':
        return this.generateWheatTexture();
      case 'crop_corn':
        return this.generateCornTexture();
      case 'crop_tomato':
        return this.generateTomatoTexture();
      case 'crop_carrot':
        return this.generateCarrotTexture();

      // Animals
      case 'animal_cow':
        return this.generateCowTexture();
      case 'animal_chicken':
        return this.generateChickenTexture();
      case 'animal_sheep':
        return this.generateSheepTexture();
      case 'animal_pig':
        return this.generatePigTexture();

      default:
        return this.generateGenericNaturalTexture();
    }
  }

  // ==========================================
  // 1. TERRAFORMING TILES PROCEDURAL TEXTURES
  // ==========================================

  /**
   * Soil textures: Untilled, Tilled, and Watered Dirt
   */
  static generateSoilTexture({ moisture = 0.2, tilled = false } = {}) {
    const size = 1024;
    const colorCanvas = this.createCanvas(size, size);
    const normalCanvas = this.createCanvas(size, size);
    const ormCanvas = this.createCanvas(size, size);

    const cCtx = colorCanvas.getContext('2d');
    const nCtx = normalCanvas.getContext('2d');
    const oCtx = ormCanvas.getContext('2d');

    // Base color tones
    // Watered: rich dark chocolate brown
    // Tilled: warm moist agricultural soil
    // Untilled: earthy natural loam
    let baseHex = '#543d2b';
    let furrowHex = '#3b281a';
    let baseRoughness = 220; // 0-255

    if (moisture > 0.8) {
      baseHex = '#2c1e15'; // Very dark, saturated wet soil
      furrowHex = '#1a100b';
      baseRoughness = 85; // Glossy wet sheen
    } else if (tilled) {
      baseHex = '#4a3321';
      furrowHex = '#332012';
      baseRoughness = 195;
    } else {
      baseHex = '#5e4531';
      furrowHex = '#4a3424';
      baseRoughness = 225;
    }

    cCtx.fillStyle = baseHex;
    cCtx.fillRect(0, 0, size, size);

    const colorImg = cCtx.getImageData(0, 0, size, size);
    const normImg = nCtx.createImageData(size, size);
    const ormImg = oCtx.createImageData(size, size);

    const cData = colorImg.data;
    const nData = normImg.data;
    const oData = ormImg.data;

    const numFurrows = tilled ? 8 : 0;
    const furrowPitch = size / (numFurrows || 1);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // Subtle organic noise (not micro-noise)
        const noise = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 12 +
                      Math.sin(x * 0.12 + y * 0.08) * 8;

        // Border edge ambient occlusion for seamless 1m tile boundaries
        const edgeDistX = Math.min(x, size - 1 - x);
        const edgeDistY = Math.min(y, size - 1 - y);
        const edgeDist = Math.min(edgeDistX, edgeDistY);
        const edgeAO = Math.min(1.0, 0.65 + (edgeDist / 40.0) * 0.35);

        let furrowDepth = 1.0;
        let nx = 128;
        let ny = 128;

        if (tilled) {
          const furrowPhase = (x % furrowPitch) / furrowPitch;
          // Smooth sinusoidal ridge
          const ridge = Math.sin(furrowPhase * Math.PI * 2);
          furrowDepth = 0.8 + 0.2 * ((ridge + 1) * 0.5);
          nx = Math.floor(128 + ridge * 35);
        }

        // Color adjustments
        cData[idx] = Math.max(0, Math.min(255, cData[idx] + noise * 0.6));
        cData[idx + 1] = Math.max(0, Math.min(255, cData[idx + 1] + noise * 0.5));
        cData[idx + 2] = Math.max(0, Math.min(255, cData[idx + 2] + noise * 0.4));

        // Apply furrow shading
        cData[idx] = Math.floor(cData[idx] * furrowDepth * edgeAO);
        cData[idx + 1] = Math.floor(cData[idx + 1] * furrowDepth * edgeAO);
        cData[idx + 2] = Math.floor(cData[idx + 2] * furrowDepth * edgeAO);
        cData[idx + 3] = 255;

        // Normal map
        nData[idx] = nx;
        nData[idx + 1] = ny;
        nData[idx + 2] = 245;
        nData[idx + 3] = 255;

        // ORM map (R: AO, G: Roughness, B: Metallic)
        const aoVal = Math.floor(255 * edgeAO * (0.85 + furrowDepth * 0.15));
        const roughnessVal = Math.min(255, Math.max(40, baseRoughness + noise * 0.4));
        const metalVal = moisture > 0.8 ? 12 : 0; // slight sheen when drenched

        oData[idx] = Math.min(255, aoVal);
        oData[idx + 1] = Math.floor(roughnessVal);
        oData[idx + 2] = metalVal;
        oData[idx + 3] = 255;
      }
    }

    cCtx.putImageData(colorImg, 0, 0);
    nCtx.putImageData(normImg, 0, 0);
    oCtx.putImageData(ormImg, 0, 0);

    return {
      baseColor: this.createTexture(colorCanvas, true),
      normal: this.createTexture(normalCanvas, false),
      orm: this.createTexture(ormCanvas, false)
    };
  }

  /**
   * Grass Tile: Vibrant rich green with subtle clumps and edge bevel AO
   */
  static generateGrassTexture() {
    const size = 1024;
    const colorCanvas = this.createCanvas(size, size);
    const normalCanvas = this.createCanvas(size, size);
    const ormCanvas = this.createCanvas(size, size);

    const cCtx = colorCanvas.getContext('2d');
    const nCtx = normalCanvas.getContext('2d');
    const oCtx = ormCanvas.getContext('2d');

    // Rich lush green base
    cCtx.fillStyle = '#5ca632';
    cCtx.fillRect(0, 0, size, size);

    const cImg = cCtx.getImageData(0, 0, size, size);
    const nImg = nCtx.createImageData(size, size);
    const oImg = oCtx.createImageData(size, size);

    const c = cImg.data;
    const n = nImg.data;
    const o = oImg.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // Soft stylized clumping
        const clump = Math.sin(x * 0.04) * Math.cos(y * 0.04) * 16 +
                      Math.sin(x * 0.09 + y * 0.07) * 10;

        // Tiling edge ambient occlusion
        const edgeDist = Math.min(x, size - 1 - x, y, size - 1 - y);
        const edgeAO = Math.min(1.0, 0.75 + (edgeDist / 32.0) * 0.25);

        c[idx] = Math.max(0, Math.min(255, (92 + clump * 0.7) * edgeAO));
        c[idx + 1] = Math.max(0, Math.min(255, (166 + clump) * edgeAO));
        c[idx + 2] = Math.max(0, Math.min(255, (50 + clump * 0.5) * edgeAO));
        c[idx + 3] = 255;

        // Normal: gentle tuft perturbations
        n[idx] = Math.floor(128 + Math.sin(x * 0.08) * 18);
        n[idx + 1] = Math.floor(128 + Math.cos(y * 0.08) * 18);
        n[idx + 2] = 240;
        n[idx + 3] = 255;

        // ORM: Soft AO, velvety foliage roughness ~0.82, 0 metallic
        o[idx] = Math.floor(255 * edgeAO);
        o[idx + 1] = 210;
        o[idx + 2] = 0;
        o[idx + 3] = 255;
      }
    }

    cCtx.putImageData(cImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    oCtx.putImageData(oImg, 0, 0);

    return {
      baseColor: this.createTexture(colorCanvas, true),
      normal: this.createTexture(normalCanvas, false),
      orm: this.createTexture(ormCanvas, false)
    };
  }

  /**
   * Rocks / Cobblestone Tile: Stylized rounded stones with deep mortar AO
   */
  static generateRockTexture() {
    const size = 1024;
    const colorCanvas = this.createCanvas(size, size);
    const normalCanvas = this.createCanvas(size, size);
    const ormCanvas = this.createCanvas(size, size);

    const cCtx = colorCanvas.getContext('2d');
    const nCtx = normalCanvas.getContext('2d');
    const oCtx = ormCanvas.getContext('2d');

    // Stone mortar background
    cCtx.fillStyle = '#494440';
    cCtx.fillRect(0, 0, size, size);

    // Draw stylized cobblestone pavers
    const stonesPerRow = 4;
    const step = size / stonesPerRow;

    for (let row = 0; row < stonesPerRow; row++) {
      const offsetX = (row % 2) * (step * 0.5);
      for (let col = -1; col <= stonesPerRow + 1; col++) {
        const cx = col * step + offsetX + step * 0.5;
        const cy = row * step + step * 0.5;
        const radius = step * 0.42;

        const stoneGrad = cCtx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
        stoneGrad.addColorStop(0, '#9e978e');
        stoneGrad.addColorStop(0.7, '#7b746c');
        stoneGrad.addColorStop(1, '#534d47');

        cCtx.fillStyle = stoneGrad;
        cCtx.beginPath();
        cCtx.ellipse(cx, cy, radius, radius * 0.85, 0, 0, Math.PI * 2);
        cCtx.fill();
      }
    }

    const cImg = cCtx.getImageData(0, 0, size, size);
    const nImg = nCtx.createImageData(size, size);
    const oImg = oCtx.createImageData(size, size);

    const c = cImg.data;
    const n = nImg.data;
    const o = oImg.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        const edgeDist = Math.min(x, size - 1 - x, y, size - 1 - y);
        const edgeAO = Math.min(1.0, 0.7 + (edgeDist / 35.0) * 0.3);

        const lum = (c[idx] + c[idx + 1] + c[idx + 2]) / 3;
        const isMortar = lum < 90;

        c[idx] = Math.floor(c[idx] * edgeAO);
        c[idx + 1] = Math.floor(c[idx + 1] * edgeAO);
        c[idx + 2] = Math.floor(c[idx + 2] * edgeAO);

        // Rounded stone normal
        const stoneAngle = Math.atan2((y % step) - step * 0.5, (x % step) - step * 0.5);
        const stoneDist = Math.hypot((x % step) - step * 0.5, (y % step) - step * 0.5) / (step * 0.5);
        const slope = Math.min(1.0, stoneDist);

        n[idx] = Math.floor(128 + Math.cos(stoneAngle) * slope * 40);
        n[idx + 1] = Math.floor(128 + Math.sin(stoneAngle) * slope * 40);
        n[idx + 2] = 230;
        n[idx + 3] = 255;

        // Mortar has strong AO and high roughness
        const aoVal = isMortar ? 110 : Math.floor(255 * (1.0 - slope * 0.25) * edgeAO);
        o[idx] = aoVal;
        o[idx + 1] = isMortar ? 245 : 190;
        o[idx + 2] = 0;
        o[idx + 3] = 255;
      }
    }

    cCtx.putImageData(cImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    oCtx.putImageData(oImg, 0, 0);

    return {
      baseColor: this.createTexture(colorCanvas, true),
      normal: this.createTexture(normalCanvas, false),
      orm: this.createTexture(ormCanvas, false)
    };
  }

  // ==========================================
  // 2. CROPS PROCEDURAL TEXTURES
  // ==========================================

  /**
   * Wheat: Golden warm amber grain heads with soft AO in grain kernels
   */
  static generateWheatTexture() {
    const size = 1024;
    const colorCanvas = this.createCanvas(size, size);
    const normalCanvas = this.createCanvas(size, size);
    const ormCanvas = this.createCanvas(size, size);

    const cCtx = colorCanvas.getContext('2d');
    const nCtx = normalCanvas.getContext('2d');
    const oCtx = ormCanvas.getContext('2d');

    // Warm golden wheat gradient
    const grad = cCtx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#f7d070'); // Ripe golden tips
    grad.addColorStop(0.5, '#e0a93b');
    grad.addColorStop(1, '#a37220'); // Lower stalk
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, size, size);

    // Subtle grain kernel chevron pattern
    cCtx.strokeStyle = '#c88c22';
    cCtx.lineWidth = 6;
    for (let y = 30; y < size; y += 48) {
      cCtx.beginPath();
      cCtx.moveTo(0, y);
      cCtx.lineTo(size * 0.5, y - 20);
      cCtx.lineTo(size, y);
      cCtx.stroke();
    }

    const cImg = cCtx.getImageData(0, 0, size, size);
    const nImg = nCtx.createImageData(size, size);
    const oImg = oCtx.createImageData(size, size);

    const c = cImg.data;
    const n = nImg.data;
    const o = oImg.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        n[idx] = 128;
        n[idx + 1] = Math.floor(128 + Math.sin(y * 0.1) * 20);
        n[idx + 2] = 245;
        n[idx + 3] = 255;

        // ORM: Soft AO (kernel grooves slightly darker), roughness 0.65, metallic 0
        const groove = Math.abs(Math.sin(y * 0.13)) * 40;
        o[idx] = Math.floor(255 - groove); // AO
        o[idx + 1] = 165;                  // Roughness
        o[idx + 2] = 0;                    // Metallic
        o[idx + 3] = 255;
      }
    }

    cCtx.putImageData(cImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    oCtx.putImageData(oImg, 0, 0);

    return {
      baseColor: this.createTexture(colorCanvas, true),
      normal: this.createTexture(normalCanvas, false),
      orm: this.createTexture(ormCanvas, false)
    };
  }

  /**
   * Corn: Yellow kernel rows with green husk gradient and golden silk accents
   */
  static generateCornTexture() {
    const size = 1024;
    const colorCanvas = this.createCanvas(size, size);
    const normalCanvas = this.createCanvas(size, size);
    const ormCanvas = this.createCanvas(size, size);

    const cCtx = colorCanvas.getContext('2d');
    const nCtx = normalCanvas.getContext('2d');
    const oCtx = ormCanvas.getContext('2d');

    // Left half: green husk; Right half: yellow corn kernels
    const huskGrad = cCtx.createLinearGradient(0, 0, size * 0.45, 0);
    huskGrad.addColorStop(0, '#4d8c28');
    huskGrad.addColorStop(1, '#72b036');
    cCtx.fillStyle = huskGrad;
    cCtx.fillRect(0, 0, size * 0.45, size);

    const kernelGrad = cCtx.createLinearGradient(size * 0.45, 0, size, 0);
    kernelGrad.addColorStop(0, '#f9c724');
    kernelGrad.addColorStop(1, '#ffdd53');
    cCtx.fillStyle = kernelGrad;
    cCtx.fillRect(size * 0.45, 0, size * 0.55, size);

    // Draw kernel grid on right half
    cCtx.fillStyle = '#d99f16';
    const kernelSize = 32;
    for (let x = size * 0.45; x < size; x += kernelSize) {
      for (let y = 0; y < size; y += kernelSize) {
        cCtx.strokeRect(x, y, kernelSize, kernelSize);
      }
    }

    const cImg = cCtx.getImageData(0, 0, size, size);
    const nImg = nCtx.createImageData(size, size);
    const oImg = oCtx.createImageData(size, size);

    const c = cImg.data;
    const n = nImg.data;
    const o = oImg.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const isKernel = x >= size * 0.45;

        n[idx] = 128;
        n[idx + 1] = 128;
        n[idx + 2] = 250;
        n[idx + 3] = 255;

        // Corn kernels have slight glossy shine (roughness ~0.45)
        o[idx] = 240;                                 // AO
        o[idx + 1] = isKernel ? 115 : 185;            // Roughness
        o[idx + 2] = 0;                               // Metallic
        o[idx + 3] = 255;
      }
    }

    cCtx.putImageData(cImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    oCtx.putImageData(oImg, 0, 0);

    return {
      baseColor: this.createTexture(colorCanvas, true),
      normal: this.createTexture(normalCanvas, false),
      orm: this.createTexture(ormCanvas, false)
    };
  }

  /**
   * Tomato: Deep glossy ruby red with smooth skin and green calyx top
   */
  static generateTomatoTexture() {
    const size = 1024;
    const colorCanvas = this.createCanvas(size, size);
    const normalCanvas = this.createCanvas(size, size);
    const ormCanvas = this.createCanvas(size, size);

    const cCtx = colorCanvas.getContext('2d');
    const nCtx = normalCanvas.getContext('2d');
    const oCtx = ormCanvas.getContext('2d');

    // Rich tomato red with soft highlight
    const rad = cCtx.createRadialGradient(size * 0.5, size * 0.4, size * 0.05, size * 0.5, size * 0.5, size * 0.55);
    rad.addColorStop(0, '#f23535');
    rad.addColorStop(0.65, '#dc1f2a');
    rad.addColorStop(1, '#9e0f17');
    cCtx.fillStyle = rad;
    cCtx.fillRect(0, 0, size, size);

    const cImg = cCtx.getImageData(0, 0, size, size);
    const nImg = nCtx.createImageData(size, size);
    const oImg = oCtx.createImageData(size, size);

    const c = cImg.data;
    const n = nImg.data;
    const o = oImg.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // Smooth curved normal
        n[idx] = 128;
        n[idx + 1] = 128;
        n[idx + 2] = 255;
        n[idx + 3] = 255;

        // Ripe tomato has glossy skin (low roughness ~0.25 - 0.35)
        o[idx] = 245;  // AO
        o[idx + 1] = 75; // Low roughness -> juicy specular sheen
        o[idx + 2] = 0;
        o[idx + 3] = 255;
      }
    }

    cCtx.putImageData(cImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    oCtx.putImageData(oImg, 0, 0);

    return {
      baseColor: this.createTexture(colorCanvas, true),
      normal: this.createTexture(normalCanvas, false),
      orm: this.createTexture(ormCanvas, false)
    };
  }

  /**
   * Carrot: Grounded vibrant orange with horizontal rings and feathery fern top
   */
  static generateCarrotTexture() {
    const size = 1024;
    const colorCanvas = this.createCanvas(size, size);
    const normalCanvas = this.createCanvas(size, size);
    const ormCanvas = this.createCanvas(size, size);

    const cCtx = colorCanvas.getContext('2d');
    const nCtx = normalCanvas.getContext('2d');
    const oCtx = ormCanvas.getContext('2d');

    const grad = cCtx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#ff7c1f');
    grad.addColorStop(0.5, '#ea580c');
    grad.addColorStop(1, '#c2410c');
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, size, size);

    // Subtle horizontal growth ribs
    cCtx.fillStyle = '#b43807';
    for (let y = 20; y < size; y += 40) {
      cCtx.fillRect(0, y, size, 4);
    }

    const cImg = cCtx.getImageData(0, 0, size, size);
    const nImg = nCtx.createImageData(size, size);
    const oImg = oCtx.createImageData(size, size);

    const c = cImg.data;
    const n = nImg.data;
    const o = oImg.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        n[idx] = 128;
        n[idx + 1] = Math.floor(128 + Math.sin(y * 0.15) * 15);
        n[idx + 2] = 245;
        n[idx + 3] = 255;

        // Earthy carrot root: medium roughness ~0.55
        o[idx] = 230; // AO
        o[idx + 1] = 140; // Roughness
        o[idx + 2] = 0;
        o[idx + 3] = 255;
      }
    }

    cCtx.putImageData(cImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    oCtx.putImageData(oImg, 0, 0);

    return {
      baseColor: this.createTexture(colorCanvas, true),
      normal: this.createTexture(normalCanvas, false),
      orm: this.createTexture(ormCanvas, false)
    };
  }

  // ==========================================
  // 3. LIVESTOCK PROCEDURAL TEXTURES
  // ==========================================

  /**
   * Cow: Holstein dairy cow with clean soft black patches on creamy white coat
   */
  static generateCowTexture() {
    const size = 1024;
    const colorCanvas = this.createCanvas(size, size);
    const normalCanvas = this.createCanvas(size, size);
    const ormCanvas = this.createCanvas(size, size);

    const cCtx = colorCanvas.getContext('2d');
    const nCtx = normalCanvas.getContext('2d');
    const oCtx = ormCanvas.getContext('2d');

    // Warm off-white coat
    cCtx.fillStyle = '#f8f6f0';
    cCtx.fillRect(0, 0, size, size);

    // Large organic black spots
    cCtx.fillStyle = '#222225';
    const spots = [
      { x: 250, y: 300, rx: 160, ry: 130, angle: 0.3 },
      { x: 700, y: 260, rx: 190, ry: 140, angle: -0.2 },
      { x: 450, y: 700, rx: 170, ry: 120, angle: 0.5 },
      { x: 820, y: 740, rx: 140, ry: 110, angle: -0.4 },
      { x: 120, y: 650, rx: 110, ry: 90, angle: 0.1 }
    ];

    spots.forEach(s => {
      cCtx.beginPath();
      cCtx.ellipse(s.x, s.y, s.rx, s.ry, s.angle, 0, Math.PI * 2);
      cCtx.fill();
    });

    // Soft pink muzzle band in bottom corner
    cCtx.fillStyle = '#f7b2bd';
    cCtx.fillRect(0, size - 120, 240, 120);

    const cImg = cCtx.getImageData(0, 0, size, size);
    const nImg = nCtx.createImageData(size, size);
    const oImg = oCtx.createImageData(size, size);

    const c = cImg.data;
    const n = nImg.data;
    const o = oImg.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        n[idx] = 128;
        n[idx + 1] = 128;
        n[idx + 2] = 255;
        n[idx + 3] = 255;

        // Clean velvety fur: roughness ~0.8
        o[idx] = 240; // Soft AO
        o[idx + 1] = 200; // Roughness
        o[idx + 2] = 0;
        o[idx + 3] = 255;
      }
    }

    cCtx.putImageData(cImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    oCtx.putImageData(oImg, 0, 0);

    return {
      baseColor: this.createTexture(colorCanvas, true),
      normal: this.createTexture(normalCanvas, false),
      orm: this.createTexture(ormCanvas, false)
    };
  }

  /**
   * Chicken: Warm russet-red & golden brown feathers with ruby comb and golden beak
   */
  static generateChickenTexture() {
    const size = 1024;
    const colorCanvas = this.createCanvas(size, size);
    const normalCanvas = this.createCanvas(size, size);
    const ormCanvas = this.createCanvas(size, size);

    const cCtx = colorCanvas.getContext('2d');
    const nCtx = normalCanvas.getContext('2d');
    const oCtx = ormCanvas.getContext('2d');

    // Warm caramel brown plumage
    const grad = cCtx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#c85a17');
    grad.addColorStop(0.5, '#e08129');
    grad.addColorStop(1, '#f4a261');
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, size, size);

    // Plumage feather scallop details
    cCtx.fillStyle = '#a04010';
    for (let y = 0; y < size; y += 40) {
      for (let x = (y % 80 === 0 ? 0 : 20); x < size; x += 40) {
        cCtx.beginPath();
        cCtx.arc(x, y, 16, 0, Math.PI);
        cCtx.fill();
      }
    }

    // Ruby comb & wattle palette block
    cCtx.fillStyle = '#d90429';
    cCtx.fillRect(0, 0, 200, 200);

    // Beak & leg yellow
    cCtx.fillStyle = '#ffb703';
    cCtx.fillRect(size - 200, 0, 200, 200);

    const cImg = cCtx.getImageData(0, 0, size, size);
    const nImg = nCtx.createImageData(size, size);
    const oImg = oCtx.createImageData(size, size);

    const c = cImg.data;
    const n = nImg.data;
    const o = oImg.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        n[idx] = 128;
        n[idx + 1] = 128;
        n[idx + 2] = 250;
        n[idx + 3] = 255;

        o[idx] = 240; // AO
        o[idx + 1] = 180; // Feather roughness
        o[idx + 2] = 0;
        o[idx + 3] = 255;
      }
    }

    cCtx.putImageData(cImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    oCtx.putImageData(oImg, 0, 0);

    return {
      baseColor: this.createTexture(colorCanvas, true),
      normal: this.createTexture(normalCanvas, false),
      orm: this.createTexture(ormCanvas, false)
    };
  }

  /**
   * Sheep: Billowy creamy wool fleece with soft ambient shadow in crevices
   */
  static generateSheepTexture() {
    const size = 1024;
    const colorCanvas = this.createCanvas(size, size);
    const normalCanvas = this.createCanvas(size, size);
    const ormCanvas = this.createCanvas(size, size);

    const cCtx = colorCanvas.getContext('2d');
    const nCtx = normalCanvas.getContext('2d');
    const oCtx = ormCanvas.getContext('2d');

    // Soft warm off-white fleece
    cCtx.fillStyle = '#f4f1ea';
    cCtx.fillRect(0, 0, size, size);

    // Cloud-like wool puffs
    cCtx.fillStyle = '#e8e2d5';
    const puffRadius = 36;
    for (let y = 20; y < size; y += 60) {
      for (let x = (y % 120 === 0 ? 20 : 50); x < size; x += 60) {
        cCtx.beginPath();
        cCtx.arc(x, y, puffRadius, 0, Math.PI * 2);
        cCtx.fill();
      }
    }

    // Soft tan face & leg patch
    cCtx.fillStyle = '#2b2622'; // Dark chocolate face for suffolk/dorper contrast
    cCtx.fillRect(0, size - 220, 320, 220);

    const cImg = cCtx.getImageData(0, 0, size, size);
    const nImg = nCtx.createImageData(size, size);
    const oImg = oCtx.createImageData(size, size);

    const c = cImg.data;
    const n = nImg.data;
    const o = oImg.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // Billowy wool normals
        const wx = Math.sin(x * 0.1) * 22;
        const wy = Math.cos(y * 0.1) * 22;

        n[idx] = Math.floor(128 + wx);
        n[idx + 1] = Math.floor(128 + wy);
        n[idx + 2] = 240;
        n[idx + 3] = 255;

        // Wool fleece has high roughness (0.9) and deep crevice AO
        const creviceAO = Math.floor(215 + Math.sin(x * 0.1) * Math.cos(y * 0.1) * 35);
        o[idx] = creviceAO;
        o[idx + 1] = 230; // High diffuse roughness
        o[idx + 2] = 0;
        o[idx + 3] = 255;
      }
    }

    cCtx.putImageData(cImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    oCtx.putImageData(oImg, 0, 0);

    return {
      baseColor: this.createTexture(colorCanvas, true),
      normal: this.createTexture(normalCanvas, false),
      orm: this.createTexture(ormCanvas, false)
    };
  }

  /**
   * Pig: Clean rosy peach skin with soft warm tones, snout gradient, and soft AO
   */
  static generatePigTexture() {
    const size = 1024;
    const colorCanvas = this.createCanvas(size, size);
    const normalCanvas = this.createCanvas(size, size);
    const ormCanvas = this.createCanvas(size, size);

    const cCtx = colorCanvas.getContext('2d');
    const nCtx = normalCanvas.getContext('2d');
    const oCtx = ormCanvas.getContext('2d');

    // Rosy warm peach pig skin
    const grad = cCtx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#fbc3bc');
    grad.addColorStop(0.5, '#f4a69e');
    grad.addColorStop(1, '#e88981');
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, size, size);

    // Deeper pink snout & ear area
    cCtx.fillStyle = '#de6b6b';
    cCtx.fillRect(0, 0, 240, 240);

    // Subtle natural muddy smudge accent (grounded farm feel)
    cCtx.fillStyle = 'rgba(120, 85, 60, 0.25)';
    cCtx.beginPath();
    cCtx.ellipse(size * 0.7, size * 0.6, 120, 70, 0.4, 0, Math.PI * 2);
    cCtx.fill();

    const cImg = cCtx.getImageData(0, 0, size, size);
    const nImg = nCtx.createImageData(size, size);
    const oImg = oCtx.createImageData(size, size);

    const c = cImg.data;
    const n = nImg.data;
    const o = oImg.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        n[idx] = 128;
        n[idx + 1] = 128;
        n[idx + 2] = 255;
        n[idx + 3] = 255;

        // Clean skin roughness ~0.7
        o[idx] = 245; // AO
        o[idx + 1] = 175; // Roughness
        o[idx + 2] = 0;
        o[idx + 3] = 255;
      }
    }

    cCtx.putImageData(cImg, 0, 0);
    nCtx.putImageData(nImg, 0, 0);
    oCtx.putImageData(oImg, 0, 0);

    return {
      baseColor: this.createTexture(colorCanvas, true),
      normal: this.createTexture(normalCanvas, false),
      orm: this.createTexture(ormCanvas, false)
    };
  }

  static generateGenericNaturalTexture() {
    return this.generateSoilTexture({ moisture: 0.2, tilled: false });
  }
}
