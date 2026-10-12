import * as THREE from 'three';

// ─── Procedural Textures ───────────────────────────────────────────────────────

function createWoodPlankTexture(color = '#8b5e3c', grain = '#6b4226') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base color
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 512);

  // Wood grain lines
  ctx.strokeStyle = grain;
  ctx.lineWidth = 1;
  for (let i = 0; i < 80; i++) {
    const y = Math.random() * 512;
    const amplitude = 2 + Math.random() * 6;
    ctx.beginPath();
    for (let x = 0; x < 512; x += 4) {
      const offset = Math.sin(x * 0.02 + i * 0.5) * amplitude;
      if (x === 0) ctx.moveTo(x, y + offset);
      else ctx.lineTo(x, y + offset);
    }
    ctx.globalAlpha = 0.15 + Math.random() * 0.25;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Plank seams (vertical)
  ctx.strokeStyle = grain;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.4;
  for (let x = 0; x <= 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Knots
  for (let i = 0; i < 6; i++) {
    const kx = Math.random() * 512;
    const ky = Math.random() * 512;
    const kr = 6 + Math.random() * 10;
    const grad = ctx.createRadialGradient(kx, ky, 1, kx, ky, kr);
    grad.addColorStop(0, grain);
    grad.addColorStop(0.6, color);
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(kx, ky, kr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFabricStripeTexture(color1 = '#ff758f', color2 = '#fff0f5', stripes = 10) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const stripeW = 512 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? color1 : color2;
    ctx.fillRect(i * stripeW, 0, stripeW, 512);
  }

  // Fabric weave texture
  ctx.globalAlpha = 0.08;
  for (let y = 0; y < 512; y += 3) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, y, 512, 1);
  }
  for (let x = 0; x < 512; x += 3) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, 0, 1, 512);
  }
  ctx.globalAlpha = 1;

  // Subtle wrinkles
  for (let i = 0; i < 20; i++) {
    const y = Math.random() * 512;
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < 512; x += 20) {
      ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * (2 + Math.random() * 3));
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSignboardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Wood background
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#a0522d');
  grad.addColorStop(0.5, '#8b4513');
  grad.addColorStop(1, '#6b3410');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);

  // Wood grain
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * 256;
    ctx.strokeStyle = '#3d1f0a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < 1024; x += 8) {
      const offset = Math.sin(x * 0.015 + i * 0.7) * 3;
      if (x === 0) ctx.moveTo(x, y + offset);
      else ctx.lineTo(x, y + offset);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Border frame
  ctx.strokeStyle = '#3d1f0a';
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, 1004, 236);

  // Inner lighter panel
  ctx.fillStyle = '#deb887';
  ctx.fillRect(30, 30, 964, 196);

  // Text
  ctx.fillStyle = '#58311a';
  ctx.font = 'bold 90px Fredoka, "Comic Sans MS", cursive, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🛒  FARM SHOP  🐾', 512, 128);

  // Decorative stars
  ctx.fillStyle = '#d4a574';
  for (let i = 0; i < 3; i++) {
    const sx = 120 + i * 392;
    drawStar(ctx, sx, 128, 5, 14, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerR;
    y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
  ctx.fill();
}

function createNormalMap(baseTex, intensity = 0.3) {
  // Create a simple normal map from the base texture's luminance
  const src = baseTex.image;
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const out = ctx.createImageData(canvas.width, canvas.height);
  const od = out.data;
  const w = canvas.width, h = canvas.height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      // Sobel-like simple normal
      const xl = (x > 0) ? data[(y * w + x - 1) * 4] : data[idx];
      const xr = (x < w - 1) ? data[(y * w + x + 1) * 4] : data[idx];
      const yt = (y > 0) ? data[((y - 1) * w + x) * 4] : data[idx];
      const yb = (y < h - 1) ? data[((y + 1) * w + x) * 4] : data[idx];
      const dx = (xr - xl) * intensity;
      const dy = (yb - yt) * intensity;
      od[idx]     = 128 + dx;     // R = X
      od[idx + 1] = 128 + dy;     // G = Y
      od[idx + 2] = 255;          // B = Z (up)
      od[idx + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createRoughnessMap(baseTex) {
  const src = baseTex.image;
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale, use as roughness (darker = smoother for wood grain)
    const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    const rough = Math.min(255, Math.max(100, lum * 0.5 + 100));
    data[i] = data[i+1] = data[i+2] = rough;
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ─── Shop Stall Model ─────────────────────────────────────────────────────────

export class ShopStallModel {
  static createShopStall() {
    const shopGroup = new THREE.Group();
    shopGroup.name = 'Cute_Shop_Stall_3D';

    // ── Textures ──
    const darkWoodTex = createWoodPlankTexture('#6b4226', '#3d2415');
    const darkWoodNormal = createNormalMap(darkWoodTex, 0.4);
    const darkWoodRough = createRoughnessMap(darkWoodTex);

    const lightWoodTex = createWoodPlankTexture('#d4a373', '#a0785a');
    const lightWoodNormal = createNormalMap(lightWoodTex, 0.3);
    const lightWoodRough = createRoughnessMap(lightWoodTex);

    const fabricTex = createFabricStripeTexture('#ff758f', '#fff0f5', 10);
    const fabricNormal = createNormalMap(fabricTex, 0.2);

    const signTex = createSignboardTexture();

    // ── Materials (PBR) ──
    const darkWoodMat = new THREE.MeshStandardMaterial({
      map: darkWoodTex,
      normalMap: darkWoodNormal,
      roughnessMap: darkWoodRough,
      roughness: 0.75,
      metalness: 0.02,
      normalScale: new THREE.Vector2(0.3, 0.3),
    });

    const lightWoodMat = new THREE.MeshStandardMaterial({
      map: lightWoodTex,
      normalMap: lightWoodNormal,
      roughnessMap: lightWoodRough,
      roughness: 0.7,
      metalness: 0.02,
      normalScale: new THREE.Vector2(0.3, 0.3),
    });

    const fabricMat = new THREE.MeshStandardMaterial({
      map: fabricTex,
      normalMap: fabricNormal,
      roughness: 0.85,
      metalness: 0.0,
      normalScale: new THREE.Vector2(0.15, 0.15),
      side: THREE.DoubleSide,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.25,
      metalness: 0.9,
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xcd9b1d,
      roughness: 0.35,
      metalness: 0.85,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xfff8e7,
      emissive: 0xffcc66,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.0,
      transparent: true,
      opacity: 0.6,
      transmission: 0.3,
    });

    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.8,
      metalness: 0.0,
    });

    const signBackMat = new THREE.MeshStandardMaterial({
      map: darkWoodTex,
      roughness: 0.8,
    });

    // Produce materials
    const carrotMat = new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.55 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x38b000, roughness: 0.6 });
    const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xf77f00, roughness: 0.65 });
    const yarnPinkMat = new THREE.MeshStandardMaterial({ color: 0xff4d6d, roughness: 0.85 });
    const yarnBlueMat = new THREE.MeshStandardMaterial({ color: 0x4d96ff, roughness: 0.85 });
    const yarnCreamMat = new THREE.MeshStandardMaterial({ color: 0xf5e6d3, roughness: 0.85 });
    const tomatoMat = new THREE.MeshStandardMaterial({ color: 0xdc2f02, roughness: 0.45 });
    const potatoMat = new THREE.MeshStandardMaterial({ color: 0xc4a66b, roughness: 0.8 });

    // ── 1. Deck Floor Base ──
    const deckGroup = new THREE.Group();

    // Main deck
    const deckGeom = new THREE.BoxGeometry(5.2, 0.3, 4.2);
    const deck = new THREE.Mesh(deckGeom, darkWoodMat);
    deck.position.y = 0.15;
    deck.castShadow = true;
    deck.receiveShadow = true;
    deckGroup.add(deck);

    // Deck planks (top detail)
    const plankCount = 13;
    const plankWidth = 5.2 / plankCount;
    for (let i = 0; i < plankCount; i++) {
      const plankGeom = new THREE.BoxGeometry(plankWidth - 0.02, 0.04, 4.2);
      const plank = new THREE.Mesh(plankGeom, lightWoodMat);
      plank.position.set(-2.6 + plankWidth * (i + 0.5), 0.32, 0);
      plank.castShadow = true;
      plank.receiveShadow = true;
      deckGroup.add(plank);
    }

    // Support beams underneath
    for (let i = 0; i < 3; i++) {
      const beamGeom = new THREE.BoxGeometry(5.2, 0.15, 0.15);
      const beam = new THREE.Mesh(beamGeom, darkWoodMat);
      beam.position.set(0, -0.05, -1.5 + i * 1.5);
      deckGroup.add(beam);
    }

    // Corner post bases (stone footings)
    const footingMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9 });
    const footingPositions = [[-2.3, -0.15, -1.8], [2.3, -0.15, -1.8], [-2.3, -0.15, 1.8], [2.3, -0.15, 1.8]];
    footingPositions.forEach(([px, py, pz]) => {
      const footing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), footingMat);
      footing.position.set(px, py, pz);
      footing.castShadow = true;
      footing.receiveShadow = true;
      deckGroup.add(footing);
    });

    shopGroup.add(deckGroup);

    // ── 2. Corner Pillars ──
    const postGeom = new THREE.CylinderGeometry(0.12, 0.15, 3.4, 10);
    const postPositions = [
      [-2.1, 1.85, -1.6],
      [2.1, 1.85, -1.6],
      [-2.1, 1.85, 1.6],
      [2.1, 1.85, 1.6],
    ];
    postPositions.forEach(([px, py, pz]) => {
      const post = new THREE.Mesh(postGeom, darkWoodMat);
      post.position.set(px, py, pz);
      post.castShadow = true;
      shopGroup.add(post);

      // Decorative capital (top of post)
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.12, 0.28),
        brassMat
      );
      cap.position.set(px, py + 1.7, pz);
      shopGroup.add(cap);
    });

    // Horizontal beams connecting posts (top frame)
    const topBeamGeom = new THREE.BoxGeometry(4.5, 0.18, 0.18);
    const topBeamF = new THREE.Mesh(topBeamGeom, darkWoodMat);
    topBeamF.position.set(0, 3.5, 1.6);
    topBeamF.castShadow = true;
    shopGroup.add(topBeamF);

    const topBeamB = new THREE.Mesh(topBeamGeom, darkWoodMat);
    topBeamB.position.set(0, 3.5, -1.6);
    topBeamB.castShadow = true;
    shopGroup.add(topBeamB);

    const sideBeamGeom = new THREE.BoxGeometry(0.18, 0.18, 3.4);
    const sideBeamL = new THREE.Mesh(sideBeamGeom, darkWoodMat);
    sideBeamL.position.set(-2.1, 3.5, 0);
    sideBeamL.castShadow = true;
    shopGroup.add(sideBeamL);

    const sideBeamR = new THREE.Mesh(sideBeamGeom, darkWoodMat);
    sideBeamR.position.set(2.1, 3.5, 0);
    sideBeamR.castShadow = true;
    shopGroup.add(sideBeamR);

    // ── 3. Main Counter Desk ──
    const counterGroup = new THREE.Group();

    // Counter body
    const counterBodyGeom = new THREE.BoxGeometry(4.4, 1.1, 1.3);
    const counterBody = new THREE.Mesh(counterBodyGeom, lightWoodMat);
    counterBody.position.set(0, 0.85, 0.8);
    counterBody.castShadow = true;
    counterBody.receiveShadow = true;
    counterGroup.add(counterBody);

    // Counter top (thicker, darker)
    const counterTopGeom = new THREE.BoxGeometry(4.6, 0.15, 1.5);
    const counterTop = new THREE.Mesh(counterTopGeom, darkWoodMat);
    counterTop.position.set(0, 1.47, 0.8);
    counterTop.castShadow = true;
    counterTop.receiveShadow = true;
    counterGroup.add(counterTop);

    // Counter top edge trim (rounded feel with torus-like strip)
    const trimGeom = new THREE.BoxGeometry(4.65, 0.06, 1.55);
    const trim = new THREE.Mesh(trimGeom, brassMat);
    trim.position.set(0, 1.55, 0.8);
    counterGroup.add(trim);

    // Drawer fronts on counter
    for (let i = 0; i < 3; i++) {
      const drawerGeom = new THREE.BoxGeometry(1.3, 0.35, 0.04);
      const drawer = new THREE.Mesh(drawerGeom, darkWoodMat);
      drawer.position.set(-1.3 + i * 1.3, 0.85, 1.46);
      counterGroup.add(drawer);

      // Drawer knob
      const knob = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        brassMat
      );
      knob.position.set(-1.3 + i * 1.3, 0.85, 1.5);
      counterGroup.add(knob);
    }

    shopGroup.add(counterGroup);

    // ── 4. Striped Awning Canopy Roof ──
    const roofGroup = new THREE.Group();
    roofGroup.position.set(0, 3.4, 0);

    // Awning frame (curved)
    const frameCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.5, 0, -1.8),
      new THREE.Vector3(-2.5, 0.4, 0),
      new THREE.Vector3(-2.5, 0.2, 1.8),
    ]);
    const frameGeom = new THREE.TubeGeometry(frameCurve, 16, 0.05, 6, false);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d2415, roughness: 0.7 });

    // Multiple frame ribs
    for (let i = 0; i < 6; i++) {
      const rib = new THREE.Mesh(frameGeom, frameMat);
      rib.position.x = -2.5 + i * 1.0;
      rib.castShadow = true;
      roofGroup.add(rib);
    }

    // Awning fabric (curved, sagging in middle)
    const awningShape = new THREE.Shape();
    awningShape.moveTo(-2.6, 0.3);
    awningShape.quadraticCurveTo(0, -0.1, 2.6, 0.3);
    awningShape.lineTo(2.6, 0.35);
    awningShape.quadraticCurveTo(0, -0.05, -2.6, 0.35);
    awningShape.lineTo(-2.6, 0.3);

    const extrudeSettings = { depth: 3.8, bevelEnabled: false };
    const awningGeom = new THREE.ExtrudeGeometry(awningShape, extrudeSettings);
    awningGeom.translate(0, 0, -1.9);
    // Rotate so it faces forward
    awningGeom.rotateX(-0.05);

    // UV mapping for stripes
    const pos = awningGeom.attributes.position;
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uvs[i * 2] = (pos.getX(i) + 2.6) / 5.2;
      uvs[i * 2 + 1] = (pos.getZ(i) + 1.9) / 3.8;
    }
    awningGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const awning = new THREE.Mesh(awningGeom, fabricMat);
    awning.castShadow = true;
    roofGroup.add(awning);

    // Awning valance (scalloped bottom edge front)
    const valanceGroup = new THREE.Group();
    const scallopCount = 12;
    for (let i = 0; i < scallopCount; i++) {
      const angle = (i / scallopCount) * Math.PI * 2;
      const scallopGeom = new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      const scallopMat = i % 2 === 0
        ? new THREE.MeshStandardMaterial({ color: 0xff758f, roughness: 0.85, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 0.85, side: THREE.DoubleSide });
      const scallop = new THREE.Mesh(scallopGeom, scallopMat);
      scallop.position.set(-2.5 + i * (5 / (scallopCount - 1)), -0.05, 1.95);
      scallop.rotation.x = Math.PI;
      valanceGroup.add(scallop);
    }
    roofGroup.add(valanceGroup);

    shopGroup.add(roofGroup);

    // ── 5. Back Wall & Shelves ──
    const backWallGeom = new THREE.BoxGeometry(4.6, 2.6, 0.2);
    const backWall = new THREE.Mesh(backWallGeom, lightWoodMat);
    backWall.position.set(0, 1.6, -1.7);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    shopGroup.add(backWall);

    // Vertical wood paneling lines on back wall
    for (let i = 1; i < 6; i++) {
      const panelLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 2.6, 0.02),
        darkWoodMat
      );
      panelLine.position.set(-2.3 + i * (4.6 / 6), 1.6, -1.59);
      shopGroup.add(panelLine);
    }

    // Shelf boards with brackets
    [-0.3, 0.5, 1.3].forEach((sy, idx) => {
      const shelfGeom = new THREE.BoxGeometry(4.2, 0.1, 0.7);
      const shelf = new THREE.Mesh(shelfGeom, darkWoodMat);
      shelf.position.set(0, 1.3 + sy, -1.35);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      shopGroup.add(shelf);

      // Shelf brackets (2 per shelf)
      [-1.8, 1.8].forEach(bx => {
        const bracketShape = new THREE.Shape();
        bracketShape.moveTo(0, 0);
        bracketShape.lineTo(0.3, 0);
        bracketShape.lineTo(0.3, 0.25);
        bracketShape.lineTo(0, 0.25);
        bracketShape.lineTo(0, 0);
        const bracketGeom = new THREE.ExtrudeGeometry(bracketShape, { depth: 0.04, bevelEnabled: false });
        const bracket = new THREE.Mesh(bracketGeom, brassMat);
        bracket.position.set(bx, 1.2 + sy, -1.68);
        bracket.rotation.y = Math.PI / 2;
        shopGroup.add(bracket);
      });
    });

    // ── 6. Display Goods ──
    // Seed bags on shelves
    const seedBagColors = [0xffd93d, 0x6bcb77, 0x4d96ff, 0xff6b6b];
    for (let i = 0; i < 4; i++) {
      const bagGeom = new THREE.DodecahedronGeometry(0.22, 1);
      bagGeom.scale(0.85, 1.15, 0.75);
      const bagMat = new THREE.MeshStandardMaterial({
        color: seedBagColors[i],
        roughness: 0.75,
        metalness: 0.05,
      });
      const bag = new THREE.Mesh(bagGeom, bagMat);
      bag.position.set(-1.5 + i * 1.0, 2.0, -1.35);
      bag.rotation.y = Math.random() * 0.4 - 0.2;
      bag.castShadow = true;
      shopGroup.add(bag);

      // Bag tie string
      const tie = new THREE.Mesh(
        new THREE.TorusGeometry(0.05, 0.015, 6, 10),
        new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 })
      );
      tie.position.set(-1.5 + i * 1.0, 2.2, -1.35);
      tie.rotation.x = Math.PI / 2;
      shopGroup.add(tie);
    }

    // Wooden crate with produce on counter
    const crateGroup = new THREE.Group();
    const crateBodyGeom = new THREE.BoxGeometry(1.0, 0.45, 0.8);
    const crate = new THREE.Mesh(crateBodyGeom, darkWoodMat);
    crate.position.y = 0.225;
    crateGroup.add(crate);

    // Crate slats (front openings)
    for (let i = 0; i < 3; i++) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.08, 0.02),
        darkWoodMat
      );
      slat.position.set(0, 0.1 + i * 0.15, 0.41);
      crateGroup.add(slat);
    }

    // Carrots in crate
    for (let i = 0; i < 5; i++) {
      const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), carrotMat);
      carrot.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
      carrot.position.set(-0.35 + i * 0.17, 0.5, 0.1 + (Math.random() - 0.5) * 0.3);
      carrot.castShadow = true;
      crateGroup.add(carrot);

      // Carrot top leaves
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 4), leafMat);
      leaf.position.set(-0.35 + i * 0.17 + 0.18, 0.5, 0.1 + (Math.random() - 0.5) * 0.3);
      leaf.rotation.z = -Math.PI / 3;
      crateGroup.add(leaf);
    }

    crateGroup.position.set(-1.5, 1.55, 0.8);
    shopGroup.add(crateGroup);

    // Pumpkin on counter
    const pumpkinGroup = new THREE.Group();
    const pumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), pumpkinMat);
    pumpkin.scale.set(1, 0.85, 1);
    pumpkin.castShadow = true;
    pumpkinGroup.add(pumpkin);

    // Pumpkin ridges
    for (let i = 0; i < 8; i++) {
      const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.45, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xd2691e, roughness: 0.7 })
      );
      const angle = (i / 8) * Math.PI * 2;
      ridge.position.set(Math.cos(angle) * 0.29, 0, Math.sin(angle) * 0.29);
      ridge.rotation.y = angle;
      pumpkinGroup.add(ridge);
    }

    // Pumpkin stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 0.15, 6),
      new THREE.MeshStandardMaterial({ color: 0x556b2f, roughness: 0.9 })
    );
    stem.position.y = 0.3;
    pumpkinGroup.add(stem);

    pumpkinGroup.position.set(1.5, 1.75, 0.8);
    shopGroup.add(pumpkinGroup);

    // Yarn balls display (multiple colors)
    const yarnBalls = [
      { x: 0.7, y: 1.75, z: 0.7, mat: yarnPinkMat, r: 0.2 },
      { x: 0.5, y: 1.65, z: 0.95, mat: yarnBlueMat, r: 0.18 },
      { x: 0.9, y: 1.65, z: 1.0, mat: yarnCreamMat, r: 0.17 },
    ];
    yarnBalls.forEach(({ x, y, z, mat, r }) => {
      const ball = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 2), mat);
      ball.position.set(x, y, z);
      ball.castShadow = true;
      shopGroup.add(ball);

      // Yarn strand coming out
      const strandCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, y + r * 0.5, z),
        new THREE.Vector3(x + 0.1, y + r * 0.8, z + 0.05),
        new THREE.Vector3(x + 0.15, y + r * 0.6, z + 0.15),
      ]);
      const strandGeom = new THREE.TubeGeometry(strandCurve, 8, 0.015, 4, false);
      const strand = new THREE.Mesh(strandGeom, mat);
      shopGroup.add(strand);
    });

    // Tomatoes in a small bowl
    const bowlGeom = new THREE.CylinderGeometry(0.25, 0.2, 0.12, 12);
    const bowl = new THREE.Mesh(bowlGeom, new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 }));
    bowl.position.set(0.1, 1.62, 0.6);
    shopGroup.add(bowl);

    for (let i = 0; i < 4; i++) {
      const tomato = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), tomatoMat);
      const angle = (i / 4) * Math.PI * 2;
      tomato.position.set(0.1 + Math.cos(angle) * 0.1, 1.7, 0.6 + Math.sin(angle) * 0.08);
      tomato.castShadow = true;
      shopGroup.add(tomato);
    }

    // Potatoes in a sack (lower shelf)
    for (let i = 0; i < 5; i++) {
      const potato = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.05, 1),
        potatoMat
      );
      potato.position.set(-1.5 + i * 0.3, 1.05, -1.3);
      potato.rotation.set(Math.random(), Math.random(), Math.random());
      potato.castShadow = true;
      shopGroup.add(potato);
    }

    // Gold Cash Register
    const registerGroup = new THREE.Group();
    const regBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.3, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 })
    );
    registerGroup.add(regBase);

    const regTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.15, 0.35),
      goldMat
    );
    regTop.position.y = 0.22;
    registerGroup.add(regTop);

    // Register display screen
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.25, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x2d6a4f })
    );
    screen.position.set(0, 0.25, 0.18);
    registerGroup.add(screen);

    // Register buttons
    for (let i = 0; i < 6; i++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.02, 8),
        brassMat
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(-0.12 + (i % 3) * 0.12, 0.03, 0.15 + Math.floor(i / 3) * 0.08);
      registerGroup.add(btn);
    }

    registerGroup.position.set(-0.4, 1.55, 0.8);
    shopGroup.add(registerGroup);

    // ── 7. Hanging Signboard ──
    const signGroup = new THREE.Group();
    signGroup.position.set(0, 3.9, 2.0);

    // Hanging chains
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.4, metalness: 0.7 });
    [-1.1, 1.1].forEach(cx => {
      const chainCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(cx, 0.3, -0.1),
        new THREE.Vector3(cx + 0.05, 0.15, -0.05),
        new THREE.Vector3(cx, 0, 0),
      ]);
      const chainGeom = new THREE.TubeGeometry(chainCurve, 6, 0.02, 5, false);
      const chain = new THREE.Mesh(chainGeom, chainMat);
      signGroup.add(chain);
    });

    // Sign board (thick wood)
    const signBoardGeom = new THREE.BoxGeometry(2.8, 0.8, 0.15);
    const signBoard = new THREE.Mesh(signBoardGeom, signBackMat);
    signBoard.castShadow = true;
    signGroup.add(signBoard);

    // Sign front (with text)
    const signFront = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 0.7),
      signMat
    );
    signFront.position.z = 0.08;
    signGroup.add(signFront);

    // Sign back
    const signBack = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 0.7),
      signBackMat
    );
    signBack.position.z = -0.08;
    signBack.rotation.y = Math.PI;
    signGroup.add(signBack);

    shopGroup.add(signGroup);

    // ── 8. Cozy Warm Lanterns (2 hanging lanterns) ──
    [[-1.8, 3.2, 1.4], [1.8, 3.2, 1.4]].forEach(([lx, ly, lz], idx) => {
      const lanternGroup = new THREE.Group();

      // Hanging rod/chain
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6),
        chainMat
      );
      rod.position.y = 0.2;
      lanternGroup.add(rod);

      // Lantern top cap
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.12, 8),
        brassMat
      );
      cap.position.y = -0.05;
      lanternGroup.add(cap);

      // Lantern glass body
      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.18, 0.35, 8),
        glassMat
      );
      glass.position.y = -0.28;
      lanternGroup.add(glass);

      // Lantern metal frame (vertical bars)
      for (let i = 0; i < 6; i++) {
        const barAngle = (i / 6) * Math.PI * 2;
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 0.35, 0.02),
          brassMat
        );
        bar.position.set(Math.cos(barAngle) * 0.17, -0.28, Math.sin(barAngle) * 0.17);
        bar.rotation.y = barAngle;
        lanternGroup.add(bar);
      }

      // Lantern bottom
      const bottom = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.2, 0.06, 8),
        brassMat
      );
      bottom.position.y = -0.48;
      lanternGroup.add(bottom);

      // Point light
      const lanternLight = new THREE.PointLight(0xffb347, idx === 0 ? 1.8 : 1.5, 10, 1.5);
      lanternLight.position.y = -0.28;
      lanternGroup.add(lanternLight);

      lanternGroup.position.set(lx, ly, lz);
      shopGroup.add(lanternGroup);
    });

    // ── 9. Shopkeeper Cat Figurine ──
    const catGroup = new THREE.Group();

    // Cat body
    const catBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 0.7 })
    );
    catBody.position.y = 0.35;
    catBody.scale.set(1, 0.9, 1.3);
    catGroup.add(catBody);

    // Cat head
    const catHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 0.7 })
    );
    catHead.position.set(0, 0.75, 0.25);
    catGroup.add(catHead);

    // Cat ears
    [[-0.15, 0.2], [0.15, 0.2]].forEach(([ex, rot]) => {
      const ear = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.18, 4),
        new THREE.MeshStandardMaterial({ color: 0xff758f, roughness: 0.7 })
      );
      ear.position.set(ex, 1.0, 0.25);
      ear.rotation.z = rot;
      catGroup.add(ear);
    });

    // Cat eyes
    [[-0.09, 0.78], [0.09, 0.78]].forEach(([ex, ey]) => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x2d5016 })
      );
      eye.position.set(ex, ey, 0.52);
      catGroup.add(eye);
    });

    // Cat nose
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xff758f, roughness: 0.5 })
    );
    nose.position.set(0, 0.72, 0.54);
    catGroup.add(nose);

    // Chef hat
    const hatGroup = new THREE.Group();
    const hatBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.25, 0.1, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
    );
    hatBase.position.y = 0.98;
    hatGroup.add(hatBase);

    const hatTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
    );
    hatTop.position.y = 1.15;
    hatTop.scale.set(1, 0.8, 1);
    hatGroup.add(hatTop);

    // Hat band
    const hatBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.02, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0xff758f, roughness: 0.6 })
    );
    hatBand.position.y = 1.0;
    hatBand.rotation.x = Math.PI / 2;
    hatGroup.add(hatBand);

    catGroup.add(hatGroup);

    // Cat apron
    const apron = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xff758f, roughness: 0.7, side: THREE.DoubleSide })
    );
    apron.position.set(0, 0.4, 0.45);
    catGroup.add(apron);

    catGroup.position.set(0, 1.5, 0.1);
    catGroup.scale.set(0.9, 0.9, 0.9);
    shopGroup.add(catGroup);

    // ── 10. Side Railings (decorative fence on deck sides) ──
    [[-2.4, 0.3, 0], [2.4, 0.3, 0]].forEach(([rx, ry, rz], idx) => {
      const railGroup = new THREE.Group();

      // Top rail
      const topRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.08, 3.0),
        darkWoodMat
      );
      topRail.position.y = 0.6;
      railGroup.add(topRail);

      // Bottom rail
      const bottomRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.06, 3.0),
        darkWoodMat
      );
      bottomRail.position.y = 0.15;
      railGroup.add(bottomRail);

      // Spindles
      for (let i = 0; i < 7; i++) {
        const spindle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6),
          lightWoodMat
        );
        spindle.position.set(0, 0.37, -1.3 + i * 0.43);
        railGroup.add(spindle);
      }

      railGroup.position.set(rx, ry, rz);
      shopGroup.add(railGroup);
    });

    // ── 11. Flower Pots & Decorations ──
    const flowerColors = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xff758f];
    [[-2.0, 0.3, -1.5], [2.0, 0.3, -1.5], [-2.0, 0.3, 1.5], [2.0, 0.3, 1.5]].forEach(([fx, fy, fz], idx) => {
      const potGroup = new THREE.Group();

      // Pot
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.12, 0.2, 8),
        new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.8 })
      );
      pot.position.y = 0.1;
      pot.castShadow = true;
      potGroup.add(pot);

      // Flowers
      for (let f = 0; f < 5; f++) {
        const fAngle = (f / 5) * Math.PI * 2;
        const fDist = 0.06 + Math.random() * 0.04;
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4),
          leafMat
        );
        stem.position.set(Math.cos(fAngle) * fDist, 0.28, Math.sin(fAngle) * fDist);
        potGroup.add(stem);

        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 6, 6),
          new THREE.MeshStandardMaterial({ color: flowerColors[(idx + f) % flowerColors.length], roughness: 0.6 })
        );
        flower.position.set(Math.cos(fAngle) * fDist, 0.4, Math.sin(fAngle) * fDist);
        potGroup.add(flower);
      }

      potGroup.position.set(fx, fy, fz);
      shopGroup.add(potGroup);
    });

    // ── 12. Welcome Mat ──
    const matGeom = new THREE.BoxGeometry(1.5, 0.04, 0.8);
    const matMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.95 });
    const welcomeMat = new THREE.Mesh(matGeom, matMat);
    welcomeMat.position.set(0, 0.02, 2.5);
    welcomeMat.receiveShadow = true;
    shopGroup.add(welcomeMat);

    // Mat stripes
    for (let i = 0; i < 5; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.01, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.9 })
      );
      stripe.position.set(0, 0.045, 2.2 + i * 0.15);
      shopGroup.add(stripe);
    }

    return shopGroup;
  }
}
