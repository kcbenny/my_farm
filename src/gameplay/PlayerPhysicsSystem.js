import * as THREE from 'three';

export class PlayerPhysicsSystem {
  constructor({
    controller,
    terrainMesh = null,
    collidableObjects = [],
    getTerrainHeight = null,
    resolveCollision = null,
    worldPhysics = null,
  }) {
    this.controller = controller;
    this.terrainMesh = terrainMesh;
    this.collidableObjects = collidableObjects;
    this.getTerrainHeight = getTerrainHeight || ((x, z) => 0);
    this.resolveCollision = resolveCollision || null;
    this.worldPhysics = worldPhysics;

    this.groundRaycaster = new THREE.Raycaster();
    this.groundRayOrigin = new THREE.Vector3();
    this.groundRayDirection = new THREE.Vector3(0, -1, 0);

    this.playerRadius = 0.4;
    this.maxTerrainStep = 0.42;
  }

  getGroundHeightAt(x, z) {
    if (this.worldPhysics) {
      const surface = this.worldPhysics.surfaceAt(x, z);
      if (surface) return surface.height;
    }
    // Adventure map fallback: outside farm terrain range
    if (Math.abs(x) > 55 || Math.abs(z) > 55) {
      return this.controller.adventureGroundY ?? 0;
    }
    let groundY = this.getTerrainHeight(x, z);
    if (this.terrainMesh) {
      this.groundRayOrigin.set(x, (this.controller.position?.y || 0) + 30, z);
      this.groundRaycaster.set(this.groundRayOrigin, this.groundRayDirection);
      const hits = this.groundRaycaster.intersectObject(this.terrainMesh, false);
      if (hits.length > 0) {
        groundY = hits[0].point.y;
      }
    }
    return groundY;
  }

  getPlayerHeight() {
    const modelHeight = this.controller?.cat?.mesh?.userData?.modelHeight;
    return Number.isFinite(modelHeight) && modelHeight > 0 ? modelHeight : 2.2;
  }

  clampToGround() {
    const controller = this.controller;
    const inAdventure = Math.abs(controller.position.x) > 55 || Math.abs(controller.position.z) > 55;
    // For adventure maps, use adventureGroundY directly to avoid raycast missing farm terrain
    let groundHeight;
    if (inAdventure) {
      groundHeight = controller.adventureGroundY ?? 0;
    } else {
      groundHeight = this.getGroundHeightAt(controller.position.x, controller.position.z);
    }
    const pivotOffset = controller.cat.mesh.userData.playerPivotOffset || 0;
    controller.jumpOffset = Math.max(0, controller.jumpOffset || 0);
    const floor = groundHeight + pivotOffset;
    if (this.worldPhysics?.debug && controller.position.y < floor - 0.05) {
      console.debug('[ground] recovered below surface', { previousY: controller.position.y, groundHeight, pivotOffset });
    }
    const desiredY = floor + controller.jumpOffset;
    let resolvedY = desiredY;
    if (!inAdventure && this.worldPhysics && controller.position.y >= floor && desiredY !== controller.position.y) {
      const startY = controller.position.y;
      const steps = Math.max(1, Math.ceil(Math.abs(desiredY - startY) / (this.playerRadius * 0.5)));
      const candidate = controller.position.clone();
      resolvedY = startY;
      for (let step = 1; step <= steps; step++) {
        candidate.y = THREE.MathUtils.lerp(startY, desiredY, step / steps);
        if (this.hasHorizontalCollision(candidate)) {
          controller.verticalVelocity = 0;
          break;
        }
        resolvedY = candidate.y;
      }
    }
    controller.position.y = Math.max(floor, resolvedY);
    controller.jumpOffset = controller.position.y - floor;
    if (controller.jumpOffset === 0) {
      controller.verticalVelocity = 0;
      controller.isGrounded = true;
    }
    controller.cat.mesh.position.copy(controller.position);
  }

  hasHorizontalCollision(candidatePosition) {
    const feet = candidatePosition.clone();
    feet.y -= this.controller.cat.mesh.userData.playerPivotOffset || 0;
    return this.worldPhysics?.intersectsPlayer(feet, this.playerRadius, this.getPlayerHeight()) || false;
  }

  movePlayer(displacement) {
    const controller = this.controller;
    const steps = Math.max(1, Math.ceil(displacement.length() / (this.playerRadius * 0.5)));
    const step = displacement.clone().divideScalar(steps);
    const inAdventure = Math.abs(controller.position.x) > 55 || Math.abs(controller.position.z) > 55;
    const pivotOffset = controller.cat.mesh.userData.playerPivotOffset || 0;
    const adventureGround = inAdventure ? (controller.adventureGroundY ?? 0) : null;
    for (let index = 0; index < steps; index++) {
      const previousPosition = controller.position.clone();
      const currentGround = adventureGround !== null ? adventureGround : this.getGroundHeightAt(previousPosition.x, previousPosition.z);
      const candidate = previousPosition.clone().add(step);
      if (!inAdventure && this.worldPhysics && !this.worldPhysics.surfaceAt(candidate.x, candidate.z)) break;
      const nextGround = adventureGround !== null ? adventureGround : this.getGroundHeightAt(candidate.x, candidate.z);
      if (controller.isGrounded && nextGround - currentGround > this.maxTerrainStep) break;
      candidate.y = nextGround + pivotOffset + Math.max(0, controller.jumpOffset || 0);
      if (!inAdventure && this.hasHorizontalCollision(candidate)) break;
      controller.position.copy(candidate);
      if (!inAdventure) this.resolveCollision?.({ position: controller.position, previousPosition }, this.playerRadius);
    }
  }

  updatePlayerPhysics(deltaTime) {
    const controller = this.controller;
    if (!controller || !controller.cat || !controller.cat.mesh) return;

    const isGathering = controller.cat.currentActionName === 'Gather';

    if (controller.isShootingMode && controller.isMouseDownLeft && !isGathering) {
      controller.autoFireTimer += deltaTime;
      if (controller.autoFireTimer >= 0.15) {
        controller.autoFireTimer = 0;
        if (controller.onActionRequest) controller.onActionRequest();
      }
    } else {
      controller.autoFireTimer = 0.15;
    }

    const dirX = -Math.sin(controller.cameraAngle) * Math.cos(controller.cameraPitch);
    const dirY = -Math.sin(controller.cameraPitch);
    const dirZ = -Math.cos(controller.cameraAngle) * Math.cos(controller.cameraPitch);
    const camForward = new THREE.Vector3(dirX, dirY, dirZ).normalize();
    const camForwardHoriz = new THREE.Vector3(-Math.sin(controller.cameraAngle), 0, -Math.cos(controller.cameraAngle)).normalize();
    const camRight = new THREE.Vector3(Math.cos(controller.cameraAngle), 0, -Math.sin(controller.cameraAngle)).normalize();

    let moveX = 0;
    let moveZ = 0;

    if (!isGathering) {
      if (controller.keys.forward) moveZ += 1;
      if (controller.keys.backward) moveZ -= 1;
      if (controller.keys.left) moveX -= 1;
      if (controller.keys.right) moveX += 1;

      if (controller.joystickVector.lengthSq() > 0.05) {
        moveX += controller.joystickVector.x;
        moveZ -= controller.joystickVector.y;
      }
    }

    const moveDir = new THREE.Vector2(moveX, moveZ);
    const moving = moveDir.lengthSq() > 0.01;

    if (moving && !isGathering) {
      controller.idleTimer = 0;
      controller.cat.wakeUp();
      moveDir.normalize();

      const worldMoveDir = new THREE.Vector3()
        .addScaledVector(camRight, moveDir.x)
        .addScaledVector(camForwardHoriz, moveDir.y)
        .normalize();

      const currentSpeed = (controller.keys.sprint ? controller.speed * controller.sprintMultiplier : controller.speed);
      this.movePlayer(worldMoveDir.multiplyScalar(currentSpeed * deltaTime));

      let targetRotation = 0;
      if (controller.isShootingMode) {
        targetRotation = controller.cameraAngle + Math.PI;
      } else {
        targetRotation = Math.atan2(worldMoveDir.x, worldMoveDir.z);
      }

      let diff = targetRotation - controller.cat.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const rotDamp = 1 - Math.exp(-18.0 * deltaTime);
      controller.cat.mesh.rotation.y += diff * rotDamp;

      const targetAnim = controller.keys.sprint ? 'HappyRun' : 'Walk';
      if (controller.cat.currentActionName !== targetAnim) {
        controller.cat.playAnimation(targetAnim, 0.2);
      }

      controller.footstepTimer += deltaTime * (controller.keys.sprint ? 5.5 : 3.8);
      if (controller.footstepTimer >= 1.0) {
        controller.footstepTimer = 0;
        if (controller.sound) controller.sound.playFootstep();
      }
    } else {
      if (!isGathering && (controller.cat.currentActionName === 'Walk' || controller.cat.currentActionName === 'HappyRun')) {
        controller.cat.playAnimation('Idle', 0.25);
      }

      if (controller.isShootingMode) {
        controller.idleTimer = 0;
        controller.cat.wakeUp();
        const targetRotation = controller.cameraAngle + Math.PI;
        let diff = targetRotation - controller.cat.mesh.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const rotDamp = 1 - Math.exp(-16.0 * deltaTime);
        controller.cat.mesh.rotation.y += diff * rotDamp;
      } else if (!isGathering) {
        controller.idleTimer += deltaTime;
        if (controller.idleTimer >= 20.0) {
          controller.cat.enterSleepMode();
        }
      }
    }

    if (!controller.isGrounded) {
      controller.verticalVelocity -= controller.gravity * deltaTime;
      controller.jumpOffset += controller.verticalVelocity * deltaTime;

      if (controller.jumpOffset <= 0) {
        controller.jumpOffset = 0;
        controller.verticalVelocity = 0;
        controller.isGrounded = true;
      }
    }

    this.clampToGround();

    const targetFov = controller.isAiming ? (controller.viewMode === 'fps' ? controller.fovZoomedFPS : controller.fovZoomedTPS) : controller.fovDefault;
    if (Math.abs(controller.camera.fov - targetFov) > 0.1) {
      controller.camera.fov = THREE.MathUtils.lerp(controller.camera.fov, targetFov, deltaTime * 12.0);
      controller.camera.updateProjectionMatrix();
    }

    if (controller.viewMode === 'fps') {
      this.worldPhysics?.fadeOccluders();
      const eyeHeight = 1.25 + (controller.isGrounded ? Math.sin(Date.now() * 0.008) * 0.02 : 0);
      const fpsCamPos = new THREE.Vector3(
        controller.position.x,
        controller.position.y + eyeHeight,
        controller.position.z
      );

      controller.camera.position.copy(fpsCamPos);
      const lookTarget = fpsCamPos.clone().add(camForward);
      controller.camera.lookAt(lookTarget);
    } else {
      const targetDist = controller.isAiming ? 4.2 : controller.targetCameraDistance;
      controller.cameraDistance = THREE.MathUtils.lerp(controller.cameraDistance, targetDist, 1 - Math.exp(-12 * deltaTime));

      const shoulderOffset = controller.isAiming ? 1.45 : 0.45;
      const headHeight = controller.isAiming ? 1.4 : 1.35;

      const anchorPos = new THREE.Vector3(
        controller.position.x,
        controller.position.y + headHeight,
        controller.position.z
      );

      const targetCamPos = anchorPos.clone()
        .addScaledVector(camForward, -controller.cameraDistance)
        .addScaledVector(camRight, shoulderOffset);

      const groundAtCam = this.getGroundHeightAt(targetCamPos.x, targetCamPos.z);
      if (targetCamPos.y < groundAtCam + 0.65) {
        targetCamPos.y = groundAtCam + 0.65;
      }

      const safeCameraPosition = this.worldPhysics
        ? this.worldPhysics.constrainCamera(anchorPos, targetCamPos, deltaTime, controller.camera)
        : targetCamPos;
      controller.camera.position.copy(safeCameraPosition);
      const lookTarget = controller.camera.position.clone().addScaledVector(camForward, 50.0);
      controller.camera.lookAt(lookTarget);
    }
  }
}