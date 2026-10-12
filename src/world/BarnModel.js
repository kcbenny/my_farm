import * as THREE from 'three';

function createBarnTextures() {
  // Red barn wood siding texture
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 128;
  woodCanvas.height = 256;
  const woodCtx = woodCanvas.getContext('2d');
  woodCtx.fillStyle = '#9b2c2c';
  woodCtx.fillRect(0, 0, 128, 256);

  // Vertical wood planks
  const plankW = 16;
  for (let x = 0; x < 128; x += plankW) {
    // Plank variation
    const variation = Math.sin(x * 0.5) * 15;
    const r = Math.min(255, Math.max(80, 155 + variation));
    const g = Math.min(200, Math.max(30, 44 + variation * 0.5));
    const b = Math.min(150, Math.max(20, 44 + variation * 0.3));
    woodCtx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    woodCtx.fillRect(x + 1, 0, plankW - 2, 256);

    // Wood grain lines
    for (let y = 0; y < 256; y += 3) {
      const grain = Math.sin(y * 0.08 + x * 0.1) * 0.5;
      woodCtx.fillStyle = `rgba(60, 15, 15, ${0.15 + grain * 0.1})`;
      woodCtx.fillRect(x + 2, y, plankW - 4, 1);
    }

    // Plank edge shadow
    woodCtx.fillStyle = 'rgba(40, 10, 10, 0.4)';
    woodCtx.fillRect(x, 0, 1, 256);
    woodCtx.fillRect(x + plankW - 1, 0, 1, 256);
  }

  // Horizontal trim lines
  woodCtx.fillStyle = '#7a1f1f';
  for (let y = 0; y < 256; y += 64) {
    woodCtx.fillRect(0, y, 128, 2);
  }

  const woodTex = new THREE.CanvasTexture(woodCanvas);
  woodTex.colorSpace = THREE.SRGBColorSpace;
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;

  // Roof shingle texture
  const roofCanvas = document.createElement('canvas');
  roofCanvas.width = 64;
  roofCanvas.height = 128;
  const roofCtx = roofCanvas.getContext('2d');
  roofCtx.fillStyle = '#3d3a4a';
  roofCtx.fillRect(0, 0, 64, 128);

  for (let row = 0; row < 16; row++) {
    const y = row * 8;
    const shade = row % 2 === 0 ? '#4a4758' : '#353240';
    roofCtx.fillStyle = shade;
    roofCtx.fillRect(0, y, 64, 6);
    // Shingle notches
    roofCtx.fillStyle = '#2a2833';
    for (let x = (row % 2) * 8; x < 64; x += 16) {
      roofCtx.fillRect(x, y + 6, 1, 2);
    }
    // Bottom edge shadow
    roofCtx.fillStyle = 'rgba(0,0,0,0.3)';
    roofCtx.fillRect(0, y + 6, 64, 2);
  }
  const roofTex = new THREE.CanvasTexture(roofCanvas);
  roofTex.colorSpace = THREE.SRGBColorSpace;
  roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping;

  // Stone / concrete foundation texture
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = 128;
  stoneCanvas.height = 32;
  const stoneCtx = stoneCanvas.getContext('2d');
  stoneCtx.fillStyle = '#6b6558';
  stoneCtx.fillRect(0, 0, 128, 32);
  const stones = [
    [0, 0, 25, 16], [25, 0, 28, 18], [53, 0, 22, 14], [75, 0, 26, 17], [101, 0, 27, 15],
    [0, 16, 22, 16], [22, 18, 26, 14], [48, 14, 24, 18], [72, 17, 28, 15], [100, 15, 28, 17],
  ];
  stones.forEach(([x, y, w, h]) => {
    const shade = 90 + Math.random() * 25;
    stoneCtx.fillStyle = `rgb(${shade}, ${shade - 5}, ${shade - 12})`;
    stoneCtx.fillRect(x + 1, y + 1, w - 2, h - 2);
  });
  stoneCtx.strokeStyle = '#4a453d';
  stoneCtx.lineWidth = 2;
  stones.forEach(([x, y, w, h]) => stoneCtx.strokeRect(x, y, w, h));
  const stoneTex = new THREE.CanvasTexture(stoneCanvas);
  stoneTex.colorSpace = THREE.SRGBColorSpace;
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;

  // White trim texture
  const trimCanvas = document.createElement('canvas');
  trimCanvas.width = 32;
  trimCanvas.height = 64;
  const trimCtx = trimCanvas.getContext('2d');
  trimCtx.fillStyle = '#f0ead6';
  trimCtx.fillRect(0, 0, 32, 64);
  for (let y = 0; y < 64; y += 16) {
    trimCtx.fillStyle = '#e0d9c0';
    trimCtx.fillRect(0, y, 32, 1);
  }
  const trimTex = new THREE.CanvasTexture(trimCanvas);
  trimTex.colorSpace = THREE.SRGBColorSpace;
  trimTex.wrapS = trimTex.wrapT = THREE.RepeatWrapping;

  // Silo metal texture
  const siloCanvas = document.createElement('canvas');
  siloCanvas.width = 64;
  siloCanvas.height = 128;
  const siloCtx = siloCanvas.getContext('2d');
  siloCtx.fillStyle = '#8a95a5';
  siloCtx.fillRect(0, 0, 64, 128);
  // Vertical metal panels
  for (let x = 0; x < 64; x += 8) {
    siloCtx.fillStyle = '#7a8595';
    siloCtx.fillRect(x, 0, 1, 128);
    siloCtx.fillStyle = '#9aa5b5';
    siloCtx.fillRect(x + 1, 0, 2, 128);
  }
  // Horizontal bands / rivets
  for (let y = 20; y < 128; y += 30) {
    siloCtx.fillStyle = '#6a7585';
    siloCtx.fillRect(0, y, 64, 3);
    // Rivets
    for (let x = 4; x < 64; x += 12) {
      siloCtx.fillStyle = '#5a6575';
      siloCtx.beginPath();
      siloCtx.arc(x, y + 1.5, 1.5, 0, Math.PI * 2);
      siloCtx.fill();
    }
  }
  const siloTex = new THREE.CanvasTexture(siloCanvas);
  siloTex.colorSpace = THREE.SRGBColorSpace;
  siloTex.wrapS = siloTex.wrapT = THREE.RepeatWrapping;

  // Hay texture
  const hayCanvas = document.createElement('canvas');
  hayCanvas.width = 64;
  hayCanvas.height = 64;
  const hayCtx = hayCanvas.getContext('2d');
  hayCtx.fillStyle = '#d4a84a';
  hayCtx.fillRect(0, 0, 64, 64);
  // Straw lines
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 64;
    const y = Math.random() * 64;
    const len = 5 + Math.random() * 15;
    const angle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25;
    hayCtx.strokeStyle = `rgba(${180 + Math.random() * 40}, ${130 + Math.random() * 40}, ${40 + Math.random() * 30}, 0.6)`;
    hayCtx.lineWidth = 0.5 + Math.random();
    hayCtx.beginPath();
    hayCtx.moveTo(x, y);
    hayCtx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    hayCtx.stroke();
  }
  const hayTex = new THREE.CanvasTexture(hayCanvas);
  hayTex.colorSpace = THREE.SRGBColorSpace;
  hayTex.wrapS = hayTex.wrapT = THREE.RepeatWrapping;

  return { woodTex, roofTex, stoneTex, trimTex, siloTex, hayTex };
}

export class BarnModel {
  static createBarn() {
    const barnGroup = new THREE.Group();
    barnGroup.name = 'Rustic_Barn';

    const textures = createBarnTextures();

    // Materials
    const barnWoodMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.woodTex,
      roughness: 0.75,
      roughnessMap: textures.woodTex,
    });
    textures.woodTex.repeat.set(4, 3);

    const barnTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.trimTex,
      roughness: 0.65,
    });
    textures.trimTex.repeat.set(2, 1);

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.roofTex,
      roughness: 0.8,
    });
    textures.roofTex.repeat.set(6, 4);

    const interiorWarmMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xff8c00,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.9,
    });

    const hayMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.hayTex,
      roughness: 0.95,
    });
    textures.hayTex.repeat.set(2, 1);

    const siloMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.siloTex,
      roughness: 0.5,
      metalness: 0.15,
    });
    textures.siloTex.repeat.set(3, 2);

    const stoneBaseMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.stoneTex,
      roughness: 0.9,
    });
    textures.stoneTex.repeat.set(3, 1);

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x7a8595,
      metalness: 0.6,
      roughness: 0.35,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x9bd4f2,
      emissive: 0xffd4a3,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
    });

    // ============================================
    // STONE FOUNDATION
    // ============================================
    const foundationGeom = new THREE.BoxGeometry(10.4, 0.6, 14.4);
    const foundation = new THREE.Mesh(foundationGeom, stoneBaseMat);
    foundation.position.set(0, 0.3, 0);
    foundation.receiveShadow = true;
    barnGroup.add(foundation);

    // ============================================
    // MAIN BARN BODY
    // ============================================
    const barnBodyGeom = new THREE.BoxGeometry(10, 5.8, 14);
    const barnBody = new THREE.Mesh(barnBodyGeom, barnWoodMat);
    barnBody.position.set(0, 3.5, 0);
    barnBody.castShadow = true;
    barnBody.receiveShadow = true;
    barnGroup.add(barnBody);

    // Corner trim boards
    const cornerTrimGeom = new THREE.BoxGeometry(0.25, 5.8, 0.25);
    const cornerPositions = [
      [5.05, 3.5, 7.05], [-5.05, 3.5, 7.05],
      [5.05, 3.5, -7.05], [-5.05, 3.5, -7.05],
    ];
    cornerPositions.forEach(([x, y, z]) => {
      const trim = new THREE.Mesh(cornerTrimGeom, barnTrimMat);
      trim.position.set(x, y, z);
      trim.castShadow = true;
      barnGroup.add(trim);
    });

    // Horizontal trim bands
    const bandGeom = new THREE.BoxGeometry(10.2, 0.15, 14.2);
    const bandPositions = [1.5, 3.5, 5.5];
    bandPositions.forEach(y => {
      const band = new THREE.Mesh(bandGeom, barnTrimMat);
      band.position.set(0, y, 0);
      barnGroup.add(band);
    });

    // ============================================
    // GAMBREL ROOF (more detailed shape)
    // ============================================
    // Lower roof slope (steeper)
    const lowerRoofGeom = new THREE.BoxGeometry(10.8, 2.5, 14.5);
    const lowerRoof = new THREE.Mesh(lowerRoofGeom, roofMat);
    lowerRoof.position.set(0, 6.8, 0);
    lowerRoof.scale.set(1.0, 1.0, 1.0);
    lowerRoof.castShadow = true;
    lowerRoof.receiveShadow = true;
    barnGroup.add(lowerRoof);

    // Upper roof slope (shallower)
    const upperRoofGeom = new THREE.BoxGeometry(7.5, 1.8, 14.5);
    const upperRoof = new THREE.Mesh(upperRoofGeom, roofMat);
    upperRoof.position.set(0, 8.6, 0);
    upperRoof.castShadow = true;
    upperRoof.receiveShadow = true;
    barnGroup.add(upperRoof);

    // Roof peak cap / ridge
    const ridgeGeom = new THREE.BoxGeometry(0.3, 0.2, 14.6);
    const ridge = new THREE.Mesh(ridgeGeom, barnTrimMat);
    ridge.position.set(0, 9.5, 0);
    barnGroup.add(ridge);

    // Roof eaves (overhang)
    const eaveFront = new THREE.Mesh(
      new THREE.BoxGeometry(10.8, 0.2, 0.4),
      barnTrimMat
    );
    eaveFront.position.set(0, 5.75, 7.3);
    barnGroup.add(eaveFront);
    const eaveBack = eaveFront.clone();
    eaveBack.position.z = -7.3;
    barnGroup.add(eaveBack);

    // ============================================
    // FRONT FACE - Double Barn Doors
    // ============================================
    const frontBeams = new THREE.Group();
    frontBeams.position.set(0, 0.6, 7.05);

    // Door frame
    const doorFrameTop = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.3, 0.2),
      barnTrimMat
    );
    doorFrameTop.position.set(0, 4.6, 0);
    frontBeams.add(doorFrameTop);

    const doorFrameL = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 4.8, 0.2),
      barnTrimMat
    );
    doorFrameL.position.set(-2.15, 2.4, 0);
    frontBeams.add(doorFrameL);

    const doorFrameR = doorFrameL.clone();
    doorFrameR.position.x = 2.15;
    frontBeams.add(doorFrameR);

    // Left door panel
    const doorL = new THREE.Group();
    doorL.position.set(-1.05, 2.4, 0.1);
    const doorPanelL = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 4.5, 0.12),
      barnWoodMat
    );
    doorL.add(doorPanelL);
    // Door diagonal brace
    const braceL = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 3.5, 0.08),
      barnTrimMat
    );
    braceL.rotation.z = 0.4;
    braceL.position.set(0, 0, 0.05);
    doorL.add(braceL);
    // Door handle
    const handleL = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      metalMat
    );
    handleL.position.set(0.8, 0, 0.1);
    doorL.add(handleL);
    frontBeams.add(doorL);

    // Right door panel (mirror)
    const doorR = new THREE.Group();
    doorR.position.set(1.05, 2.4, 0.1);
    const doorPanelR = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 4.5, 0.12),
      barnWoodMat
    );
    doorR.add(doorPanelR);
    const braceR = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 3.5, 0.08),
      barnTrimMat
    );
    braceR.rotation.z = -0.4;
    braceR.position.set(0, 0, 0.05);
    doorR.add(braceR);
    const handleR = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      metalMat
    );
    handleR.position.set(-0.8, 0, 0.1);
    doorR.add(handleR);
    frontBeams.add(doorR);

    // Glowing interior through door gap
    const doorGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 4.2),
      interiorWarmMat
    );
    doorGlow.position.set(0, 2.4, -0.05);
    frontBeams.add(doorGlow);

    // ============================================
    // FRONT FACE - Loft Window with X
    // ============================================
    const loftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.6, 0.2),
      barnTrimMat
    );
    loftFrame.position.set(0, 6.4, 0);
    frontBeams.add(loftFrame);

    const loftGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 2.2),
      interiorWarmMat
    );
    loftGlow.position.set(0, 6.4, 0.06);
    frontBeams.add(loftGlow);

    // X cross beams
    const xBeam1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 2.8, 0.1),
      barnTrimMat
    );
    xBeam1.rotation.z = Math.PI / 4;
    xBeam1.position.set(0, 6.4, 0.08);
    frontBeams.add(xBeam1);

    const xBeam2 = xBeam1.clone();
    xBeam2.rotation.z = -Math.PI / 4;
    frontBeams.add(xBeam2);

    barnGroup.add(frontBeams);

    // ============================================
    // SIDE WINDOWS
    // ============================================
    const sideWindowPositions = [
      { x: 5.05, z: -3, rotY: Math.PI / 2 },
      { x: 5.05, z: 3, rotY: Math.PI / 2 },
      { x: -5.05, z: -3, rotY: -Math.PI / 2 },
      { x: -5.05, z: 3, rotY: -Math.PI / 2 },
    ];
    sideWindowPositions.forEach(({ x, z, rotY }) => {
      const winGroup = new THREE.Group();

      const winFrame = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.6, 0.15),
        barnTrimMat
      );
      winGroup.add(winFrame);

      const winGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 1.3),
        glassMat
      );
      winGlass.position.z = 0.08;
      winGroup.add(winGlass);

      // Window mullions
      const mullionV = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 1.3, 0.08),
        barnTrimMat
      );
      mullionV.position.z = 0.06;
      winGroup.add(mullionV);
      const mullionH = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.06, 0.08),
        barnTrimMat
      );
      mullionH.position.z = 0.06;
      winGroup.add(mullionH);

      winGroup.position.set(x, 3.5, z);
      winGroup.rotation.y = rotY;
      barnGroup.add(winGroup);
    });

    // ============================================
    // HANGING LANTERN above door
    // ============================================
    const lanternBracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.6),
      metalMat
    );
    lanternBracket.position.set(0, 5.2, 7.6);
    barnGroup.add(lanternBracket);

    const lantern = new THREE.PointLight(0xffaa44, 2.0, 10, 1.3);
    lantern.position.set(0, 4.9, 7.9);
    barnGroup.add(lantern);

    const lanternMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0xffa500,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9,
      })
    );
    lanternMesh.position.copy(lantern.position);
    barnGroup.add(lanternMesh);

    // Lantern top cap
    const lanternCap = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.15, 6),
      metalMat
    );
    lanternCap.position.set(0, 5.15, 7.9);
    barnGroup.add(lanternCap);

    // ============================================
    // SILO TOWER
    // ============================================
    const siloBodyGeom = new THREE.CylinderGeometry(2.3, 2.5, 11, 16);
    const siloBody = new THREE.Mesh(siloBodyGeom, siloMat);
    siloBody.position.set(7.0, 5.5, -2.5);
    siloBody.castShadow = true;
    siloBody.receiveShadow = true;
    barnGroup.add(siloBody);

    // Silo stone base
    const siloBaseGeom = new THREE.CylinderGeometry(2.7, 2.9, 1.0, 16);
    const siloBase = new THREE.Mesh(siloBaseGeom, stoneBaseMat);
    siloBase.position.set(7.0, 0.5, -2.5);
    siloBase.castShadow = true;
    siloBase.receiveShadow = true;
    barnGroup.add(siloBase);

    // Silo dome roof
    const siloDomeGeom = new THREE.SphereGeometry(2.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const siloDome = new THREE.Mesh(siloDomeGeom, roofMat);
    siloDome.position.set(7.0, 11, -2.5);
    siloDome.castShadow = true;
    barnGroup.add(siloDome);

    // Silo cap / finial
    const siloFinial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.15, 0.6, 8),
      metalMat
    );
    siloFinial.position.set(7.0, 12.0, -2.5);
    barnGroup.add(siloFinial);

    // Silo small window
    const siloWin = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.7, 0.1),
      glassMat
    );
    siloWin.position.set(8.8, 6.5, -2.5);
    barnGroup.add(siloWin);

    // Silo window frame
    const siloWinFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.85, 0.08),
      barnTrimMat
    );
    siloWinFrame.position.set(8.85, 6.5, -2.5);
    barnGroup.add(siloWinFrame);

    // ============================================
    // HAY BALES
    // ============================================
    const hayPositions = [
      { x: -4.5, y: 0.6, z: 8.0, rot: 0.2, scale: 1.0 },
      { x: -4.0, y: 1.7, z: 7.7, rot: -0.15, scale: 0.95 },
      { x: -2.8, y: 0.6, z: 8.5, rot: 0.5, scale: 1.0 },
      { x: -3.5, y: 2.6, z: 8.2, rot: 0.3, scale: 0.85 },
    ];
    hayPositions.forEach(({ x, y, z, rot, scale }) => {
      const hayBale = new THREE.Mesh(
        new THREE.BoxGeometry(1.6 * scale, 1.1 * scale, 2.0 * scale),
        hayMat
      );
      hayBale.position.set(x, y, z);
      hayBale.rotation.y = rot;
      hayBale.castShadow = true;
      hayBale.receiveShadow = true;
      barnGroup.add(hayBale);

      // Hay bale binding twine
      const twineMat = new THREE.MeshStandardMaterial({
        color: 0x8b6914,
        roughness: 0.8,
      });
      for (let t = -1; t <= 1; t += 2) {
        const twine = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 1.15 * scale, 2.05 * scale),
          twineMat
        );
        twine.position.set(x + t * 0.5 * scale, y, z);
        barnGroup.add(twine);
      }
    });

    // ============================================
    // WOODEN BARRELS
    // ============================================
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x7a4a2a,
      roughness: 0.75,
    });
    const barrelHoopMat = new THREE.MeshStandardMaterial({
      color: 0x5a5a5a,
      metalness: 0.5,
      roughness: 0.4,
    });
    const barrelPositions = [
      { x: -1.5, z: 8.2 },
      { x: -1.0, z: 8.8 },
    ];
    barrelPositions.forEach(({ x, z }) => {
      const barrel = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.45, 0.9, 12),
        barrelMat
      );
      body.position.y = 0.45;
      body.castShadow = true;
      barrel.add(body);
      // Metal hoops
      for (let i = 0; i < 3; i++) {
        const hoop = new THREE.Mesh(
          new THREE.TorusGeometry(0.43, 0.04, 6, 12),
          barrelHoopMat
        );
        hoop.rotation.x = Math.PI / 2;
        hoop.position.y = 0.2 + i * 0.3;
        barrel.add(hoop);
      }
      barrel.position.set(x, 0.6, z);
      barnGroup.add(barrel);
    });

    // ============================================
    // WEATHER VANE with Cat Silhouette
    // ============================================
    const vaneGroup = new THREE.Group();
    vaneGroup.position.set(0, 9.6, 0);

    const vaneRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 1.4, 6),
      metalMat
    );
    vaneRod.position.y = 0.7;
    vaneGroup.add(vaneRod);

    // Cat vane body
    const catVane = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.5, 0.06),
      metalMat
    );
    catVane.position.y = 1.3;
    vaneGroup.add(catVane);

    // Cat ears
    const earL = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.15, 4),
      metalMat
    );
    earL.position.set(-0.35, 1.55, 0);
    vaneGroup.add(earL);
    const earR = earL.clone();
    earR.position.x = -0.15;
    vaneGroup.add(earR);

    // Directional arrow tail
    const vaneTail = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.25, 0.05),
      metalMat
    );
    vaneTail.position.set(0.5, 1.3, 0);
    vaneGroup.add(vaneTail);

    barnGroup.add(vaneGroup);
    barnGroup.userData.weatherVane = vaneGroup;

    // ============================================
    // DECORATIVE: Small plants & rocks around base
    // ============================================
    const bushMat = new THREE.MeshStandardMaterial({
      color: 0x4a7c3f,
      roughness: 0.9,
      flatShading: true,
    });
    const bushLocs = [
      [-5.5, 0.6, 7.5], [5.5, 0.6, 7.5],
      [-6, 0.5, -7], [6, 0.5, -7],
      [9.5, 0.6, 0], [9.5, 0.5, -5],
    ];
    bushLocs.forEach(([x, y, z]) => {
      const bush = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.45, 0),
        bushMat
      );
      bush.position.set(x, y, z);
      bush.scale.set(1 + Math.random() * 0.2, 0.8, 1 + Math.random() * 0.2);
      bush.castShadow = true;
      barnGroup.add(bush);
    });

    // Tall grass tufts
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x6ba84f,
      roughness: 0.9,
      flatShading: true,
    });
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5.5 + Math.random() * 3;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const grass = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.5, 4),
        grassMat
      );
      grass.position.set(x, 0.85, z);
      grass.rotation.z = (Math.random() - 0.5) * 0.3;
      barnGroup.add(grass);
    }

    return barnGroup;
  }
}
