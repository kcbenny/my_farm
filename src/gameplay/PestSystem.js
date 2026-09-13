import * as THREE from 'three';

export class PestSystem {
  constructor(scene, getTerrainHeight) {
    this.scene = scene;
    this.getTerrainHeight = getTerrainHeight || ((x, z) => 0);
    this.pests = [];
    this.spawnTimer = 1.5;

    this.materials = {
      crowFeather: new THREE.MeshStandardMaterial({ color: 0x212529, roughness: 0.6, flatShading: true }),
      crowBeak: new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.4, flatShading: true }),
      crowEye: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      moleFur: new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8, flatShading: true }),
      moleNose: new THREE.MeshStandardMaterial({ color: 0xffafcc, roughness: 0.4, flatShading: true }),
      dirtMound: new THREE.MeshStandardMaterial({ color: 0x4a2c11, roughness: 0.9, flatShading: true }),
      alertBadge: new THREE.MeshBasicMaterial({ color: 0xff3366 })
    };
  }

  createIndicator() {
    const indicator = new THREE.Group();
    indicator.name = 'Alert_Indicator';

    // Glowing diamond/target icon floating above pest
    const iconGeom = new THREE.OctahedronGeometry(0.18);
    const iconMesh = new THREE.Mesh(iconGeom, this.materials.alertBadge);
    indicator.add(iconMesh);

    indicator.position.y = 1.35;
    return indicator;
  }

  spawnCrow(pos) {
    const crowGroup = new THREE.Group();
    crowGroup.name = 'Pest_Crow';

    // Body
    const bodyGeom = new THREE.ConeGeometry(0.35, 0.75, 5);
    bodyGeom.rotateX(Math.PI / 2.5);
    const body = new THREE.Mesh(bodyGeom, this.materials.crowFeather);
    body.position.y = 0.4;
    body.castShadow = true;
    crowGroup.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.22, 6, 6);
    const head = new THREE.Mesh(headGeom, this.materials.crowFeather);
    head.position.set(0, 0.75, 0.22);
    head.castShadow = true;
    crowGroup.add(head);

    // Beak
    const beakGeom = new THREE.ConeGeometry(0.08, 0.3, 4);
    beakGeom.rotateX(Math.PI / 2);
    const beak = new THREE.Mesh(beakGeom, this.materials.crowBeak);
    beak.position.set(0, 0.72, 0.44);
    beak.castShadow = true;
    crowGroup.add(beak);

    // Flapping Wings
    const wingGeom = new THREE.BoxGeometry(0.65, 0.06, 0.4);
    const wingL = new THREE.Mesh(wingGeom, this.materials.crowFeather);
    wingL.position.set(-0.4, 0.48, 0.05);
    wingL.rotation.z = -0.2;
    wingL.castShadow = true;
    crowGroup.add(wingL);

    const wingR = new THREE.Mesh(wingGeom, this.materials.crowFeather);
    wingR.position.set(0.4, 0.48, 0.05);
    wingR.rotation.z = 0.2;
    wingR.castShadow = true;
    crowGroup.add(wingR);

    // Floating Target Indicator
    const indicator = this.createIndicator();
    crowGroup.add(indicator);

    // Spawn high in the flying sky!
    const flyHeight = 6.0 + Math.random() * 4.0;
    crowGroup.position.set(pos.x, flyHeight, pos.z);
    this.scene.add(crowGroup);

    this.pests.push({
      type: 'crow',
      mesh: crowGroup,
      indicator: indicator,
      wings: [wingL, wingR],
      position: new THREE.Vector3(pos.x, flyHeight, pos.z),
      state: 'flying', // 'flying', 'fleeing'
      centerPos: new THREE.Vector3(pos.x, flyHeight, pos.z),
      flightAngle: Math.random() * Math.PI * 2,
      flightRadiusX: 8.0 + Math.random() * 8.0,
      flightRadiusZ: 8.0 + Math.random() * 8.0,
      flightSpeed: 0.2 + Math.random() * 0.12, // Slow, graceful bird soaring speed
      baseHeight: flyHeight,
      fleeVelocity: new THREE.Vector3(),
      life: 45.0
    });
  }

  spawnMole(pos) {
    const moleGroup = new THREE.Group();
    moleGroup.name = 'Pest_Mole';

    // Dirt mound base
    const moundGeom = new THREE.ConeGeometry(0.7, 0.3, 8);
    const mound = new THREE.Mesh(moundGeom, this.materials.dirtMound);
    mound.position.y = 0.15;
    mound.receiveShadow = true;
    moleGroup.add(mound);

    // Cute Mole Head popping out
    const headGroup = new THREE.Group();
    headGroup.name = 'Mole_Head';
    headGroup.position.y = 0.1;

    const headGeom = new THREE.SphereGeometry(0.32, 8, 8);
    const head = new THREE.Mesh(headGeom, this.materials.moleFur);
    head.castShadow = true;
    headGroup.add(head);

    // Pink Snout
    const noseGeom = new THREE.SphereGeometry(0.09, 6, 6);
    const nose = new THREE.Mesh(noseGeom, this.materials.moleNose);
    nose.position.set(0, 0.02, 0.3);
    headGroup.add(nose);

    moleGroup.add(headGroup);

    // Floating Target Indicator
    const indicator = this.createIndicator();
    moleGroup.add(indicator);

    const groundY = this.getTerrainHeight(pos.x, pos.z);
    moleGroup.position.set(pos.x, groundY, pos.z);
    this.scene.add(moleGroup);

    this.pests.push({
      type: 'mole',
      mesh: moleGroup,
      indicator: indicator,
      headGroup: headGroup,
      position: new THREE.Vector3(pos.x, groundY, pos.z),
      state: 'popping', // 'popping', 'fleeing'
      fleeVelocity: new THREE.Vector3(),
      life: 22.0,
      popPhase: 0
    });
  }

  spawnInvasion(gardenPlots) {
    // Spawn pests directly at garden plots when the defense task triggers!
    if (!gardenPlots || gardenPlots.length === 0) return;

    gardenPlots.forEach((plot, i) => {
      const offsetX = (Math.random() - 0.5) * 3.0;
      const offsetZ = (Math.random() - 0.5) * 3.0;
      const spawnPos = new THREE.Vector3(plot.x + offsetX, 0, plot.z + offsetZ);

      if (i % 2 === 0) {
        this.spawnCrow(spawnPos);
      } else {
        this.spawnMole(spawnPos);
      }
    });
  }

  raycastPest(raycaster) {
    let closestPest = null;
    let closestDist = Infinity;
    let hitPoint = null;

    for (const pest of this.pests) {
      if (pest.state === 'fleeing') continue;

      const pestCenter = new THREE.Vector3(
        pest.mesh.position.x,
        pest.mesh.position.y + (pest.type === 'crow' ? 0.6 : 0.35),
        pest.mesh.position.z
      );

      // Target sphere test against raycaster
      const sphere = new THREE.Sphere(pestCenter, 1.35);
      const intersectPoint = new THREE.Vector3();

      if (raycaster.ray.intersectSphere(sphere, intersectPoint)) {
        const dist = raycaster.ray.origin.distanceTo(intersectPoint);
        if (dist < closestDist) {
          closestDist = dist;
          closestPest = pest;
          hitPoint = pestCenter.clone();
        }
      }
    }

    if (closestPest) {
      return { pest: closestPest, point: hitPoint, distance: closestDist };
    }
    return null;
  }

  findAimTarget(playerPos, playerFacingDir, maxDistance = 22.0, maxAngle = 0.8) {
    let bestTarget = null;
    let minScore = Infinity;

    for (const pest of this.pests) {
      if (pest.state === 'fleeing') continue;

      const pestPos = pest.mesh.position.clone();
      pestPos.y += (pest.type === 'crow' ? 0.6 : 0.3); // Aim at center of body

      const toPest = new THREE.Vector3().subVectors(pestPos, playerPos);
      const dist = toPest.length();

      if (dist > maxDistance) continue;

      toPest.normalize();
      const dot = playerFacingDir.dot(toPest); // 1.0 = right in front

      if (dot > Math.cos(maxAngle)) {
        // Weighted score (favor closer and more centered targets)
        const score = dist * (2.0 - dot);
        if (score < minScore) {
          minScore = score;
          bestTarget = pestPos;
        }
      }
    }
    return bestTarget;
  }

  checkHit(bulletPos, radius) {
    for (let i = 0; i < this.pests.length; i++) {
      const pest = this.pests[i];
      if (pest.state === 'fleeing') continue;

      const pestPos = pest.mesh.position;
      const targetCenter = new THREE.Vector3(
        pestPos.x,
        pestPos.y + (pest.type === 'crow' ? 0.6 : 0.3),
        pestPos.z
      );
      const dist = bulletPos.distanceTo(targetCenter);

      // Generous, arcade-friendly collision radius (1.4m)
      if (dist < radius + 1.2) {
        // Hit! Make pest flee hilariously
        pest.state = 'fleeing';
        pest.indicator.visible = false;
        pest.fleeVelocity.set(
          (Math.random() - 0.5) * 8,
          9.0 + Math.random() * 4.0,
          (Math.random() - 0.5) * 8
        );

        return {
          type: pest.type,
          points: pest.type === 'crow' ? 30 : 50,
          pos: pestPos.clone()
        };
      }
    }
    return null;
  }

  update(delta) {
    // Regular spawn cycle
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0 && this.pests.length < 5) {
      this.spawnTimer = 4.0 + Math.random() * 3.0;
      const angle = Math.random() * Math.PI * 2;
      const dist = 4.0 + Math.random() * 12.0;
      const spawnPos = new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

      if (Math.random() > 0.5) {
        this.spawnCrow(spawnPos);
      } else {
        this.spawnMole(spawnPos);
      }
    }

    // Update active pests
    const time = Date.now() * 0.005;

    for (let i = this.pests.length - 1; i >= 0; i--) {
      const pest = this.pests[i];
      pest.life -= delta;

      if (pest.state === 'fleeing') {
        pest.mesh.position.addScaledVector(pest.fleeVelocity, delta);
        pest.fleeVelocity.y -= delta * 14.0; // Gravity
        pest.mesh.rotation.y += delta * 12.0;
        pest.mesh.scale.multiplyScalar(0.94);

        if (pest.mesh.position.y < -2.0 || pest.mesh.scale.x < 0.05) {
          this.scene.remove(pest.mesh);
          this.pests.splice(i, 1);
          continue;
        }
      } else {
        // Pulse & bob the alert indicator
        if (pest.indicator) {
          pest.indicator.rotation.y += delta * 3.0;
          pest.indicator.position.y = 1.35 + Math.sin(time + i) * 0.12;
        }

        if (pest.type === 'crow') {
          // Graceful curved 3D flying trajectory in sky
          pest.flightAngle += delta * pest.flightSpeed;

          const prevX = pest.mesh.position.x;
          const prevZ = pest.mesh.position.z;

          const targetX = pest.centerPos.x + Math.sin(pest.flightAngle) * pest.flightRadiusX;
          const targetZ = pest.centerPos.z + Math.cos(pest.flightAngle) * pest.flightRadiusZ;
          const targetY = pest.baseHeight + Math.sin(pest.flightAngle * 0.5) * 1.2;

          pest.mesh.position.set(targetX, targetY, targetZ);

          // Smoothly rotate bird toward flight direction
          const vx = targetX - prevX;
          const vz = targetZ - prevZ;
          if (Math.abs(vx) > 0.001 || Math.abs(vz) > 0.001) {
            pest.mesh.rotation.y = Math.atan2(vx, vz);
          }

          // Gentle wing flapping
          const wingFlap = Math.sin(time * 8.0) * 0.4;
          pest.wings[0].rotation.z = -0.15 - wingFlap;
          pest.wings[1].rotation.z = 0.15 + wingFlap;

        } else if (pest.type === 'mole') {
          // Popping head up and down
          pest.popPhase += delta * 2.5;
          pest.headGroup.position.y = Math.max(0.0, Math.sin(pest.popPhase) * 0.45);
        }

        if (pest.life <= 0) {
          this.scene.remove(pest.mesh);
          this.pests.splice(i, 1);
        }
      }
    }
  }
}
