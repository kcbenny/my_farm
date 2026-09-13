import * as THREE from 'three';

export class BarnModel {
  static createBarn() {
    const barnGroup = new THREE.Group();
    barnGroup.name = 'Rustic_Barn';

    // Materials
    const barnWoodMat = new THREE.MeshStandardMaterial({
      color: 0xa83232, // Rustic Barn Red
      roughness: 0.8,
      flatShading: true,
    });
    const barnTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1de, // Off-white wooden trim
      roughness: 0.7,
      flatShading: true,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x4a4e69, // Dark slate roof
      roughness: 0.85,
      flatShading: true,
    });
    const interiorWarmMat = new THREE.MeshBasicMaterial({
      color: 0xffb703 // Cozy golden interior glow
    });
    const hayMat = new THREE.MeshStandardMaterial({
      color: 0xe9c46a,
      roughness: 0.9,
      flatShading: true,
    });
    const siloMat = new THREE.MeshStandardMaterial({
      color: 0x8d99ae, // Galvanized metal / stone
      roughness: 0.6,
      metalness: 0.2,
      flatShading: true,
    });

    // 1. Main Barn Body
    const barnBodyGeom = new THREE.BoxGeometry(10, 6, 14);
    const barnBody = new THREE.Mesh(barnBodyGeom, barnWoodMat);
    barnBody.position.set(0, 3, 0);
    barnBody.castShadow = true;
    barnBody.receiveShadow = true;
    barnGroup.add(barnBody);

    // 2. Gambrel Barn Roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(7.5, 4.5, 4),
      roofMat
    );
    roof.position.set(0, 7.8, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.0, 1.0, 1.5);
    roof.castShadow = true;
    roof.receiveShadow = true;
    barnGroup.add(roof);

    // 3. Barn Front Silhouette Trim & White 'X' Cross Beams
    const beamMat = barnTrimMat;
    const frontBeams = new THREE.Group();
    frontBeams.position.set(0, 3, 7.05);

    // Double Barn Doors
    const doorFrameGeom = new THREE.BoxGeometry(4.2, 4.8, 0.1);
    const doorFrame = new THREE.Mesh(doorFrameGeom, barnTrimMat);
    doorFrame.position.set(0, -0.6, 0);
    frontBeams.add(doorFrame);

    const doorInnerGeom = new THREE.PlaneGeometry(3.8, 4.4);
    const doorInner = new THREE.Mesh(doorInnerGeom, interiorWarmMat);
    doorInner.position.set(0, -0.6, 0.06);
    frontBeams.add(doorInner);

    // Upper Loft Window with 'X'
    const loftWinGeom = new THREE.BoxGeometry(2.2, 2.2, 0.1);
    const loftWin = new THREE.Mesh(loftWinGeom, barnTrimMat);
    loftWin.position.set(0, 3.2, 0);
    frontBeams.add(loftWin);

    const loftGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), interiorWarmMat);
    loftGlow.position.set(0, 3.2, 0.06);
    frontBeams.add(loftGlow);

    // Cozy Lantern above Barn Door
    const lantern = new THREE.PointLight(0xffaa44, 2.5, 12, 1.2);
    lantern.position.set(0, 2.2, 7.4);
    barnGroup.add(lantern);

    const lanternMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.35),
      new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );
    lanternMesh.position.copy(lantern.position);
    barnGroup.add(lanternMesh);

    barnGroup.add(frontBeams);

    // 4. Silo Tower attached to side
    const siloBodyGeom = new THREE.CylinderGeometry(2.2, 2.4, 11, 10);
    const siloBody = new THREE.Mesh(siloBodyGeom, siloMat);
    siloBody.position.set(6.8, 5.5, -2);
    siloBody.castShadow = true;
    siloBody.receiveShadow = true;
    barnGroup.add(siloBody);

    const siloDomeGeom = new THREE.SphereGeometry(2.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const siloDome = new THREE.Mesh(siloDomeGeom, roofMat);
    siloDome.position.set(6.8, 11, -2);
    siloDome.castShadow = true;
    barnGroup.add(siloDome);

    // 5. Stacked Hay Bales & Wooden Barrels outside
    const hayGeom = new THREE.BoxGeometry(1.6, 1.1, 2.2);
    const hay1 = new THREE.Mesh(hayGeom, hayMat);
    hay1.position.set(-4.5, 0.55, 7.8);
    hay1.rotation.y = 0.2;
    hay1.castShadow = true;
    barnGroup.add(hay1);

    const hay2 = new THREE.Mesh(hayGeom, hayMat);
    hay2.position.set(-4.2, 1.6, 7.6);
    hay2.rotation.y = -0.15;
    hay2.castShadow = true;
    barnGroup.add(hay2);

    const hay3 = new THREE.Mesh(hayGeom, hayMat);
    hay3.position.set(-3.0, 0.55, 8.2);
    hay3.rotation.y = 0.5;
    hay3.castShadow = true;
    barnGroup.add(hay3);

    // 6. Weathervane with Cat Silhouette on Barn Roof
    const rodGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 4);
    const rod = new THREE.Mesh(rodGeom, siloMat);
    rod.position.set(0, 10.5, 0);
    barnGroup.add(rod);

    const catVaneGeom = new THREE.BoxGeometry(0.9, 0.5, 0.05);
    const catVane = new THREE.Mesh(catVaneGeom, siloMat);
    catVane.position.set(0, 11.2, 0);
    catVane.rotation.y = 0.4;
    barnGroup.add(catVane);

    return barnGroup;
  }
}
