import * as THREE from 'three';

function createWindmillTextures() {
  // Brick texture for tower
  const brickCanvas = document.createElement('canvas');
  brickCanvas.width = 128;
  brickCanvas.height = 256;
  const brickCtx = brickCanvas.getContext('2d');

  // Base color - warm stone brick
  brickCtx.fillStyle = '#9b8b7a';
  brickCtx.fillRect(0, 0, 128, 256);

  // Brick pattern
  const brickH = 16;
  const brickW = 32;
  const mortar = 2;
  for (let row = 0; row < 16; row++) {
    const y = row * brickH;
    const offset = (row % 2) * (brickW / 2);
    for (let col = -1; col < 5; col++) {
      const x = col * brickW + offset;
      // Brick body with variation
      const shade = 130 + Math.sin(col * 3.7 + row * 2.3) * 25 + Math.random() * 15;
      brickCtx.fillStyle = `rgb(${Math.floor(shade + 20)}, ${Math.floor(shade)}, ${Math.floor(shade - 30)})`;
      brickCtx.fillRect(x + mortar, y + mortar, brickW - mortar * 2, brickH - mortar * 2);
      // Top highlight
      brickCtx.fillStyle = `rgba(255, 240, 220, 0.15)`;
      brickCtx.fillRect(x + mortar, y + mortar, brickW - mortar * 2, 2);
      // Bottom shadow
      brickCtx.fillStyle = `rgba(0, 0, 0, 0.2)`;
      brickCtx.fillRect(x + mortar, y + brickH - mortar - 2, brickW - mortar * 2, 2);
    }
  }
  // Mortar lines
  brickCtx.fillStyle = '#6b5d4e';
  for (let y = 0; y < 256; y += brickH) {
    brickCtx.fillRect(0, y, 128, mortar);
  }
  for (let row = 0; row < 16; row++) {
    const y = row * brickH;
    const offset = (row % 2) * (brickW / 2);
    for (let col = 0; col <= 4; col++) {
      const x = col * brickW + offset;
      brickCtx.fillRect(x, y, mortar, brickH);
    }
  }

  const brickTex = new THREE.CanvasTexture(brickCanvas);
  brickTex.colorSpace = THREE.SRGBColorSpace;
  brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;

  // Wood plank texture
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 64;
  woodCanvas.height = 128;
  const woodCtx = woodCanvas.getContext('2d');
  woodCtx.fillStyle = '#8b5a2b';
  woodCtx.fillRect(0, 0, 64, 128);
  // Wood grain
  for (let y = 0; y < 128; y++) {
    const grain = Math.sin(y * 0.15) * 3 + Math.sin(y * 0.4 + 1) * 2;
    const shade = 100 + grain * 5;
    woodCtx.fillStyle = `rgb(${Math.floor(shade + 30)}, ${Math.floor(shade)}, ${Math.floor(shade - 40)})`;
    woodCtx.fillRect(0, y, 64, 1);
  }
  // Plank seams
  woodCtx.fillStyle = '#5a3a1a';
  for (let y = 0; y < 128; y += 32) {
    woodCtx.fillRect(0, y, 64, 2);
  }
  const woodTex = new THREE.CanvasTexture(woodCanvas);
  woodTex.colorSpace = THREE.SRGBColorSpace;
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;

  // Roof tile texture
  const roofCanvas = document.createElement('canvas');
  roofCanvas.width = 64;
  roofCanvas.height = 96;
  const roofCtx = roofCanvas.getContext('2d');
  roofCtx.fillStyle = '#a0522d';
  roofCtx.fillRect(0, 0, 64, 96);
  // Tile rows
  for (let row = 0; row < 8; row++) {
    const y = row * 12;
    roofCtx.fillStyle = row % 2 === 0 ? '#b8633d' : '#8b4513';
    roofCtx.fillRect(0, y, 64, 10);
    // Tile edges
    roofCtx.fillStyle = '#5c2e0d';
    roofCtx.fillRect(0, y + 10, 64, 2);
    // Individual tile lines
    for (let x = (row % 2) * 16; x < 64; x += 32) {
      roofCtx.fillStyle = '#5c2e0d';
      roofCtx.fillRect(x, y, 1, 10);
    }
  }
  const roofTex = new THREE.CanvasTexture(roofCanvas);
  roofTex.colorSpace = THREE.SRGBColorSpace;
  roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping;

  // Sail cloth texture
  const sailCanvas = document.createElement('canvas');
  sailCanvas.width = 64;
  sailCanvas.height = 128;
  const sailCtx = sailCanvas.getContext('2d');
  sailCtx.fillStyle = '#f5f0e0';
  sailCtx.fillRect(0, 0, 64, 128);
  // Fabric weave
  for (let y = 0; y < 128; y += 2) {
    for (let x = 0; x < 64; x += 2) {
      const v = 235 + Math.random() * 20;
      sailCtx.fillStyle = `rgb(${v}, ${v - 5}, ${v - 15})`;
      sailCtx.fillRect(x, y, 1, 1);
    }
  }
  // Horizontal reinforcing bands
  sailCtx.fillStyle = '#d4c9a8';
  for (let y = 20; y < 128; y += 30) {
    sailCtx.fillRect(0, y, 64, 3);
  }
  const sailTex = new THREE.CanvasTexture(sailCanvas);
  sailTex.colorSpace = THREE.SRGBColorSpace;
  sailTex.wrapS = sailTex.wrapT = THREE.RepeatWrapping;

  // Stone base texture
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = 128;
  stoneCanvas.height = 64;
  const stoneCtx = stoneCanvas.getContext('2d');
  stoneCtx.fillStyle = '#7a7065';
  stoneCtx.fillRect(0, 0, 128, 64);
  // Irregular stones
  const stones = [
    [0, 0, 30, 25], [30, 0, 35, 28], [65, 0, 30, 22], [95, 0, 33, 30],
    [0, 25, 28, 22], [28, 28, 32, 20], [60, 22, 35, 26], [95, 30, 33, 20],
    [0, 47, 35, 17], [35, 48, 30, 16], [65, 48, 28, 16], [93, 50, 35, 14],
  ];
  stones.forEach(([x, y, w, h]) => {
    const shade = 100 + Math.random() * 30;
    stoneCtx.fillStyle = `rgb(${shade}, ${shade - 8}, ${shade - 18})`;
    stoneCtx.fillRect(x + 1, y + 1, w - 2, h - 2);
  });
  // Mortar
  stoneCtx.strokeStyle = '#5a5045';
  stoneCtx.lineWidth = 2;
  stones.forEach(([x, y, w, h]) => {
    stoneCtx.strokeRect(x, y, w, h);
  });
  const stoneTex = new THREE.CanvasTexture(stoneCanvas);
  stoneTex.colorSpace = THREE.SRGBColorSpace;
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;

  // Normal map (simple bump)
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = 64;
  normalCanvas.height = 64;
  const normalCtx = normalCanvas.getContext('2d');
  normalCtx.fillStyle = '#8080ff';
  normalCtx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) {
    normalCtx.fillStyle = '#a0a0ff';
    normalCtx.fillRect(0, y, 64, 1);
  }
  const normalTex = new THREE.CanvasTexture(normalCanvas);
  normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;

  return { brickTex, woodTex, roofTex, sailTex, stoneTex, normalTex };
}

export class WindmillModel {
  static createWindmill() {
    const group = new THREE.Group();
    group.name = 'Rustic_Windmill';

    const textures = createWindmillTextures();

    // Materials
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.brickTex,
      normalMap: textures.normalTex,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughness: 0.85,
      roughnessMap: textures.brickTex,
    });
    // Set brick texture repeat for the tower cylinder
    textures.brickTex.repeat.set(3, 2);

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.woodTex,
      normalMap: textures.normalTex,
      normalScale: new THREE.Vector2(0.2, 0.2),
      roughness: 0.75,
    });
    textures.woodTex.repeat.set(2, 1);

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.roofTex,
      roughness: 0.8,
    });
    textures.roofTex.repeat.set(4, 2);

    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.sailTex,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    textures.sailTex.repeat.set(1, 2);

    const stoneBaseMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.stoneTex,
      roughness: 0.9,
    });
    textures.stoneTex.repeat.set(3, 1);

    const windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0x9bd4f2,
      emissive: 0xffd4a3,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.7,
      roughness: 0.15,
    });

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.woodTex,
      roughness: 0.7,
    });

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      metalness: 0.7,
      roughness: 0.3,
    });

    // ============================================
    // STONE FOUNDATION (base platform)
    // ============================================
    const foundationGeom = new THREE.CylinderGeometry(3.8, 4.2, 1.0, 12);
    const foundation = new THREE.Mesh(foundationGeom, stoneBaseMat);
    foundation.position.set(0, 0.5, 0);
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    group.add(foundation);

    // Foundation step / platform
    const stepGeom = new THREE.CylinderGeometry(3.5, 3.8, 0.4, 12);
    const step = new THREE.Mesh(stepGeom, stoneBaseMat);
    step.position.set(0, 1.2, 0);
    step.castShadow = true;
    step.receiveShadow = true;
    group.add(step);

    // ============================================
    // MAIN TOWER (tapered brick cylinder)
    // ============================================
    const baseGeom = new THREE.CylinderGeometry(2.2, 3.0, 7.5, 12);
    const base = new THREE.Mesh(baseGeom, stoneMat);
    base.position.set(0, 5.15, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Decorative brick band (ledge)
    const ledgeGeom = new THREE.CylinderGeometry(2.5, 2.3, 0.25, 12);
    const ledge = new THREE.Mesh(ledgeGeom, stoneBaseMat);
    ledge.position.set(0, 8.9, 0);
    ledge.castShadow = true;
    group.add(ledge);

    // ============================================
    // WINDOWS (arched, multiple levels)
    // ============================================
    const windowPositions = [
      { angle: 0, y: 3.2, size: 0.5 },
      { angle: Math.PI * 0.5, y: 5.5, size: 0.45 },
      { angle: Math.PI, y: 3.2, size: 0.5 },
      { angle: Math.PI * 1.5, y: 5.5, size: 0.45 },
      { angle: Math.PI * 0.25, y: 7.2, size: 0.4 },
      { angle: Math.PI * 1.25, y: 7.2, size: 0.4 },
    ];

    windowPositions.forEach(({ angle, y, size }) => {
      const windowGroup = new THREE.Group();
      const radius = 2.6 + (y - 5) * 0.08; // approximate tower radius at this height
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;

      // Window frame (wooden)
      const frameGeom = new THREE.BoxGeometry(size * 1.3, size * 1.8, 0.15);
      const frame = new THREE.Mesh(frameGeom, woodMat);
      windowGroup.add(frame);

      // Glass pane
      const glassGeom = new THREE.PlaneGeometry(size, size * 1.4);
      const glass = new THREE.Mesh(glassGeom, windowGlassMat);
      glass.position.z = 0.08;
      windowGroup.add(glass);

      // Window crossbar
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(size * 1.1, 0.06, 0.1), woodMat);
      crossH.position.z = 0.06;
      windowGroup.add(crossH);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, size * 1.3, 0.1), woodMat);
      crossV.position.z = 0.06;
      windowGroup.add(crossV);

      // Arched top
      const archGeom = new THREE.TorusGeometry(size * 0.5, 0.06, 6, 12, Math.PI);
      const arch = new THREE.Mesh(archGeom, woodMat);
      arch.position.set(0, size * 0.65, 0.05);
      arch.rotation.z = Math.PI;
      windowGroup.add(arch);

      windowGroup.position.set(x, y, z);
      windowGroup.rotation.y = angle;
      group.add(windowGroup);
    });

    // ============================================
    // ROOF CAP (conical, tiled)
    // ============================================
    const capGeom = new THREE.ConeGeometry(2.6, 3.2, 12);
    const cap = new THREE.Mesh(capGeom, roofMat);
    cap.position.set(0, 10.5, 0);
    cap.castShadow = true;
    group.add(cap);

    // Roof crown / decorative ring
    const crownGeom = new THREE.TorusGeometry(1.8, 0.12, 8, 16);
    const crown = new THREE.Mesh(crownGeom, woodMat);
    crown.position.set(0, 9.1, 0);
    crown.rotation.x = Math.PI / 2;
    group.add(crown);

    // ============================================
    // WINDMILL SAILS MECHANISM
    // ============================================
    // Main axle housing (the decorative front piece)
    const housingGeom = new THREE.CylinderGeometry(0.5, 0.6, 0.8, 12);
    housingGeom.rotateX(Math.PI / 2);
    const housing = new THREE.Mesh(housingGeom, woodMat);
    housing.position.set(0, 8.2, 2.6);
    group.add(housing);

    // Metal hub cap
    const hubCapGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.15, 12);
    hubCapGeom.rotateX(Math.PI / 2);
    const hubCap = new THREE.Mesh(hubCapGeom, metalMat);
    hubCap.position.set(0, 8.2, 3.05);
    group.add(hubCap);

    // Rotating sails hub
    const sailsHub = new THREE.Group();
    sailsHub.name = 'Windmill_Sails';
    sailsHub.position.set(0, 8.2, 3.1);

    // Central hub
    const hubGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.3, 12);
    hubGeom.rotateX(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeom, woodMat);
    sailsHub.add(hub);

    // 4 Sails with detailed structure
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const bladeGroup = new THREE.Group();
      bladeGroup.rotation.z = angle;

      // Main spar (thick wooden beam)
      const sparGeom = new THREE.BoxGeometry(0.2, 7.0, 0.2);
      const spar = new THREE.Mesh(sparGeom, woodMat);
      spar.position.set(0, 3.5, 0);
      spar.castShadow = true;
      bladeGroup.add(spar);

      // Cross beams (ladder-like structure)
      for (let j = 0; j < 5; j++) {
        const crossBeam = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 0.1, 0.1),
          woodMat
        );
        crossBeam.position.set(0, 1.2 + j * 1.2, 0);
        bladeGroup.add(crossBeam);
      }

      // Cloth sail section 1 (upper)
      const sail1Geom = new THREE.PlaneGeometry(1.4, 2.8);
      const sail1 = new THREE.Mesh(sail1Geom, sailMat);
      sail1.position.set(0.75, 4.8, 0.02);
      sail1.rotation.y = -0.1;
      sail1.castShadow = true;
      bladeGroup.add(sail1);

      // Cloth sail section 2 (middle)
      const sail2Geom = new THREE.PlaneGeometry(1.4, 2.2);
      const sail2 = new THREE.Mesh(sail2Geom, sailMat);
      sail2.position.set(0.75, 2.4, 0.02);
      sail2.rotation.y = -0.08;
      sail2.castShadow = true;
      bladeGroup.add(sail2);

      // Cloth sail section 3 (lower - smaller)
      const sail3Geom = new THREE.PlaneGeometry(1.2, 1.4);
      const sail3 = new THREE.Mesh(sail3Geom, sailMat);
      sail3.position.set(0.7, 0.7, 0.02);
      sail3.rotation.y = -0.05;
      sail3.castShadow = true;
      bladeGroup.add(sail3);

      // Outer tip reinforcement
      const tipGeom = new THREE.BoxGeometry(0.25, 0.4, 0.15);
      const tip = new THREE.Mesh(tipGeom, woodMat);
      tip.position.set(0, 6.9, 0);
      bladeGroup.add(tip);

      sailsHub.add(bladeGroup);
    }

    group.add(sailsHub);

    // ============================================
    // WOODEN DOOR (arched)
    // ============================================
    const doorGroup = new THREE.Group();
    doorGroup.name = 'Windmill_Door';
    const doorRadius = 3.0;
    doorGroup.position.set(0, 0, doorRadius - 0.05);

    // Door frame
    const doorFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 0.2), woodMat);
    doorFrameL.position.set(-0.7, 1.2, 0);
    doorGroup.add(doorFrameL);
    const doorFrameR = doorFrameL.clone();
    doorFrameR.position.x = 0.7;
    doorGroup.add(doorFrameR);

    // Arched door top frame
    const doorArchGeom = new THREE.TorusGeometry(0.65, 0.1, 8, 16, Math.PI);
    const doorArch = new THREE.Mesh(doorArchGeom, woodMat);
    doorArch.position.set(0, 2.4, 0);
    doorArch.rotation.z = Math.PI;
    doorGroup.add(doorArch);

    // Door panels (double door)
    const doorPanelL = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 2.2, 0.1),
      doorMat
    );
    doorPanelL.position.set(-0.32, 1.1, 0.06);
    doorPanelL.castShadow = true;
    doorGroup.add(doorPanelL);

    const doorPanelR = doorPanelL.clone();
    doorPanelR.position.x = 0.32;
    doorGroup.add(doorPanelR);

    // Door handles
    const handleL = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      metalMat
    );
    handleL.position.set(-0.15, 1.0, 0.12);
    doorGroup.add(handleL);
    const handleR = handleL.clone();
    handleR.position.x = 0.15;
    doorGroup.add(handleR);

    // Door step
    const doorStep = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.2, 0.6),
      stoneBaseMat
    );
    doorStep.position.set(0, 0.1, 0.2);
    doorStep.castShadow = true;
    doorStep.receiveShadow = true;
    doorGroup.add(doorStep);

    group.add(doorGroup);

    // ============================================
    // WEATHER VANE on top
    // ============================================
    const vaneGroup = new THREE.Group();
    vaneGroup.position.set(0, 12.2, 0);

    const vaneRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 1.2, 6),
      metalMat
    );
    vaneRod.position.y = 0.6;
    vaneGroup.add(vaneRod);

    // Vane arrow / cat silhouette
    const vaneArrow = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.35, 0.06),
      metalMat
    );
    vaneArrow.position.y = 1.1;
    vaneGroup.add(vaneArrow);

    // Pointy end
    const vanePoint = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.3, 6),
      metalMat
    );
    vanePoint.position.set(0.45, 1.1, 0);
    vanePoint.rotation.z = -Math.PI / 2;
    vaneGroup.add(vanePoint);

    group.add(vaneGroup);
    group.userData.weatherVane = vaneGroup;

    // ============================================
    // DECORATIVE DETAILS
    // ============================================
    // Small bushes around base
    const bushMat = new THREE.MeshStandardMaterial({
      color: 0x4a8c3f,
      roughness: 0.9,
      flatShading: true,
    });
    const bushPositions = [
      [2.8, 0.4, 1.5], [-2.5, 0.35, 2.0], [3.2, 0.3, -1.0],
      [-3.0, 0.4, -1.5], [1.5, 0.35, -2.8], [-1.8, 0.3, -2.5],
    ];
    bushPositions.forEach(([x, y, z]) => {
      const bush = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.2, 0),
        bushMat
      );
      bush.position.set(x, y, z);
      bush.scale.set(1 + Math.random() * 0.3, 0.8 + Math.random() * 0.2, 1 + Math.random() * 0.3);
      bush.castShadow = true;
      group.add(bush);
    });

    // Small flowers around base
    const flowerColors = [0xff8fab, 0xffd166, 0x9d4edd, 0xff6b6b];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 3.5 + Math.random() * 0.8;
      const x = Math.sin(angle) * dist;
      const z = Math.cos(angle) * dist;

      const flower = new THREE.Group();
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4),
        new THREE.MeshStandardMaterial({ color: 0x5da95d, roughness: 0.9 })
      );
      stem.position.y = 0.15;
      flower.add(stem);

      const bloom = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.1, 0),
        new THREE.MeshStandardMaterial({
          color: flowerColors[i % flowerColors.length],
          roughness: 0.7,
        })
      );
      bloom.position.y = 0.32;
      flower.add(bloom);

      flower.position.set(x, 0.9, z);
      group.add(flower);
    }

    // Animation state
    group.userData.sailsRotationSpeed = 0.35;
    group.userData.swayOffset = Math.random() * Math.PI * 2;

    return { group, sailsHub };
  }
}
