import * as THREE from 'three';

export class WindmillModel {
  static createWindmill() {
    const group = new THREE.Group();
    group.name = 'Rustic_Windmill';

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x9b9b7a,
      roughness: 0.9,
      flatShading: true
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.8,
      flatShading: true
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xb05d3b,
      roughness: 0.8,
      flatShading: true
    });
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1de,
      roughness: 0.6,
      side: THREE.DoubleSide,
      flatShading: true
    });

    // Tower base (Tapered Cylinder)
    const baseGeom = new THREE.CylinderGeometry(2.2, 3.2, 8.5, 8);
    const base = new THREE.Mesh(baseGeom, stoneMat);
    base.position.set(0, 4.25, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Conical Roof Cap
    const capGeom = new THREE.ConeGeometry(2.6, 3.0, 8);
    const cap = new THREE.Mesh(capGeom, roofMat);
    cap.position.set(0, 9.8, 0);
    cap.castShadow = true;
    group.add(cap);

    // Rotor Axle
    const axleGeom = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 8);
    axleGeom.rotateX(Math.PI / 2);
    const axle = new THREE.Mesh(axleGeom, woodMat);
    axle.position.set(0, 7.8, 2.3);
    group.add(axle);

    // Sails Hub (Rotating group)
    const sailsHub = new THREE.Group();
    sailsHub.name = 'Windmill_Sails';
    sailsHub.position.set(0, 7.8, 2.8);

    // 4 Sails Blades
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const bladeGroup = new THREE.Group();
      bladeGroup.rotation.z = angle;

      // Spar
      const sparGeom = new THREE.BoxGeometry(0.12, 6.2, 0.12);
      const spar = new THREE.Mesh(sparGeom, woodMat);
      spar.position.set(0, 3.1, 0);
      spar.castShadow = true;
      bladeGroup.add(spar);

      // Cloth Sail
      const sailGeom = new THREE.PlaneGeometry(1.2, 4.8);
      const sail = new THREE.Mesh(sailGeom, sailMat);
      sail.position.set(0.65, 3.4, 0.05);
      sail.rotation.y = 0.15;
      sail.castShadow = true;
      bladeGroup.add(sail);

      sailsHub.add(bladeGroup);
    }

    group.add(sailsHub);

    // Wooden Door
    const doorGeom = new THREE.BoxGeometry(1.2, 2.2, 0.2);
    const door = new THREE.Mesh(doorGeom, woodMat);
    door.position.set(0, 1.1, 3.05);
    door.rotation.y = 0;
    group.add(door);

    return { group, sailsHub };
  }
}
