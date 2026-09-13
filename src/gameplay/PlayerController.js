import * as THREE from 'three';

export class PlayerController {
  constructor(catCharacter, camera, domElement, soundSystem, getTerrainHeight, resolveCollision) {
    this.cat = catCharacter;
    this.camera = camera;
    this.domElement = domElement;
    this.sound = soundSystem;
    this.getTerrainHeight = getTerrainHeight || ((x, z) => 0);
    this.resolveCollision = resolveCollision || null;

    // Movement state
    const initialGroundY = this.getTerrainHeight(0, 0);
    this.position = new THREE.Vector3(0, initialGroundY, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.speed = 5.6;
    this.sprintMultiplier = 1.6;
    this.rotationAngle = 0;
    this.isMoving = false;
    this.isGrounded = true;
    this.jumpOffset = 0;
    this.verticalVelocity = 0;
    this.gravity = 24.0;
    this.jumpForce = 7.5;

    // FPS & View Mode state
    this.viewMode = 'tps'; // 'tps' (Third Person) or 'fps' (First Person Shooter)
    this.isAiming = false;  // ADS / Zoom In mode
    this.isPointerLocked = false;
    this.fovDefault = 50;
    this.fovZoomedTPS = 38; // Clean, comfortable zoom for Third Person without obscuring screen
    this.fovZoomedFPS = 22; // Precision sniper zoom for First Person
    this.currentFov = 50;

    // Camera follow parameters
    this.cameraAngle = 0; // Yaw
    this.cameraPitch = 0.2; // Pitch
    this.cameraDistance = 6.0;
    this.targetCameraDistance = 6.0;
    this.cameraLookOffset = new THREE.Vector3(0, 1.2, 0);

    // Mouse sensitivity
    this.mouseSensitivity = 0.0032;

    // Input state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      action: false,
      gather: false,
    };

    this.isShootingMode = false;
    this.isMouseDownLeft = false;
    this.autoFireTimer = 0;
    this.idleTimer = 0;
    this.isDraggingMouse = false;

    this.joystickVector = new THREE.Vector2(0, 0);
    this.footstepTimer = 0;
    this.previousMousePos = { x: 0, y: 0 };
    this.crosshairEl = document.getElementById('crosshair-container');
    this.scopeEl = document.getElementById('sniper-scope');
    this.fpsToggleBtn = document.getElementById('btn-fps-mode');

    // Ensure crosshair is hidden initially until Shooting Mode (Right Click) is active
    if (this.crosshairEl) {
      this.crosshairEl.style.display = 'none';
    }

    this.setupKeyboardListeners();
    this.setupMouseControls();
    this.setupTouchControls();
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'tps' ? 'fps' : 'tps';
    if (this.fpsToggleBtn) {
      this.fpsToggleBtn.classList.toggle('active', this.viewMode === 'fps');
      this.fpsToggleBtn.querySelector('span').textContent = this.viewMode === 'fps' ? '🐾 TPS View' : '🎯 FPS View';
    }
    // Update character model visibility in FPS
    if (this.cat && this.cat.mesh) {
      // In FPS, hide main body/head so camera doesn't clip inside head, keep peashooter/paws visible
      this.updateFPSVisibility();
    }
    return this.viewMode;
  }

  updateFPSVisibility() {
    if (this.viewMode === 'fps') {
      if (this.cat.bones.headBone) this.cat.bones.headBone.visible = false;
      if (this.cat.bones.spine) this.cat.bones.spine.visible = false;
      if (this.cat.bones.gunRoot) this.cat.bones.gunRoot.visible = true;
    } else {
      if (this.cat.bones.headBone) this.cat.bones.headBone.visible = true;
      if (this.cat.bones.spine) this.cat.bones.spine.visible = true;
    }
  }

  setCat(catCharacter) {
    this.cat = catCharacter;
    if (this.cat && this.cat.mesh) {
      this.cat.mesh.position.set(this.position.x, this.position.y + this.jumpOffset, this.position.z);
      this.cat.mesh.rotation.y = this.rotationAngle;
      this.updateFPSVisibility();
    }
  }

  setupKeyboardListeners() {
    const handleInputActivity = () => {
      this.idleTimer = 0;
      if (this.cat) this.cat.wakeUp();
    };

    const resetKeys = () => {
      this.keys.forward = false;
      this.keys.backward = false;
      this.keys.left = false;
      this.keys.right = false;
      this.keys.sprint = false;
      this.joystickVector.set(0, 0);
    };

    window.addEventListener('blur', () => {
      resetKeys();
    });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      handleInputActivity();

      // Space bar jump check
      if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
        e.preventDefault();
        this.triggerJump();
        return;
      }

      const k = e.key ? e.key.toLowerCase() : '';
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || k === 'w' || k === 'arrowup') {
        this.keys.forward = true;
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown' || k === 's' || k === 'arrowdown') {
        this.keys.backward = true;
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft' || k === 'a' || k === 'arrowleft') {
        this.keys.left = true;
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight' || k === 'd' || k === 'arrowright') {
        this.keys.right = true;
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || k === 'shift') {
        this.keys.sprint = true;
      } else if (e.code === 'KeyV' || k === 'v') {
        this.toggleViewMode();
      } else if (e.code === 'KeyF' || k === 'f') {
        if (this.onActionRequest) this.onActionRequest();
      } else if (e.code === 'KeyE' || e.code === 'Enter' || k === 'e') {
        if (this.onGatherRequest) this.onGatherRequest();
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key ? e.key.toLowerCase() : '';
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || k === 'w' || k === 'arrowup') {
        this.keys.forward = false;
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown' || k === 's' || k === 'arrowdown') {
        this.keys.backward = false;
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft' || k === 'a' || k === 'arrowleft') {
        this.keys.left = false;
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight' || k === 'd' || k === 'arrowright') {
        this.keys.right = false;
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || k === 'shift') {
        this.keys.sprint = false;
      }
    });
  }

  setupMouseControls() {
    const canvasContainer = document.getElementById('canvas-container');

    const handleActivity = () => {
      this.idleTimer = 0;
      if (this.cat) this.cat.wakeUp();
    };

    if (canvasContainer) {
      canvasContainer.addEventListener('click', (e) => {
        if (e.target.closest('#inspector-panel, #help-modal, #top-bar, #main-menu, #exit-confirm-modal, .mobile-action-buttons, .anim-grid, #cute-shop-modal, #collapsible-top-menu')) {
          return;
        }
        if (document.pointerLockElement !== canvasContainer && !this.isPointerLocked) {
          canvasContainer.requestPointerLock?.();
        }
      });
    }

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === canvasContainer);
    });

    window.addEventListener('mousedown', (e) => {
      handleActivity();
      if (e.target.closest('#inspector-panel, #help-modal, #top-bar, #main-menu, #exit-confirm-modal, .mobile-action-buttons, .anim-grid, #cute-shop-modal, #collapsible-top-menu')) {
        return;
      }

      this.isDraggingMouse = true;
      try {
        if (e.target && e.target.setPointerCapture && e.pointerId !== undefined) {
          e.target.setPointerCapture(e.pointerId);
        }
      } catch (err) {}

      if (e.button === 0) {
        // Left Click: Shoot
        this.isMouseDownLeft = true;
        if (this.onActionRequest) this.onActionRequest();
      } else if (e.button === 2) {
        // Right Click: Enter Shooting Mode (ADS / Scope)
        e.preventDefault();
        this.setShootingMode(true);
      }
    });

    window.addEventListener('mouseup', (e) => {
      this.isDraggingMouse = false;
      if (e.button === 0) {
        this.isMouseDownLeft = false;
      } else if (e.button === 2) {
        e.preventDefault();
        this.setShootingMode(false);
      }
    });

    window.addEventListener('mousemove', (e) => {
      handleActivity();

      if (this.isPointerLocked) {
        const movementX = e.movementX || 0;
        const movementY = e.movementY || 0;
        const sensitivity = this.isAiming ? this.mouseSensitivity * 0.45 : this.mouseSensitivity;

        this.cameraAngle -= movementX * sensitivity;
        this.cameraPitch = Math.max(-0.6, Math.min(1.2, this.cameraPitch + movementY * sensitivity));
      } else {
        // Pointer / Drag Rotation - boundary safe
        if (this.previousMousePos.x !== 0 || this.previousMousePos.y !== 0) {
          const deltaX = e.clientX - this.previousMousePos.x;
          const deltaY = e.clientY - this.previousMousePos.y;
          this.cameraAngle -= deltaX * 0.004;
          this.cameraPitch = Math.max(-0.6, Math.min(1.2, this.cameraPitch + deltaY * 0.0035));
        }
      }
      this.previousMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Smooth scroll wheel zoom in / out
    window.addEventListener('wheel', (e) => {
      handleActivity();
      if (this.isShootingMode || this.isAiming) {
        // Zoom camera FOV in/out with scroll wheel while aiming!
        if (this.viewMode === 'fps') {
          this.fovZoomedFPS = Math.max(10, Math.min(38, this.fovZoomedFPS + e.deltaY * 0.02));
        } else {
          this.fovZoomedTPS = Math.max(18, Math.min(50, this.fovZoomedTPS + e.deltaY * 0.02));
        }
      } else if (this.viewMode === 'tps') {
        this.targetCameraDistance = Math.max(2.5, Math.min(15.0, this.targetCameraDistance + e.deltaY * 0.006));
      }
    });

    if (this.fpsToggleBtn) {
      this.fpsToggleBtn.addEventListener('click', () => {
        this.toggleViewMode();
      });
    }
  }

  setAiming(aiming) {
    this.isAiming = aiming;
    if (this.crosshairEl) {
      this.crosshairEl.style.display = aiming ? 'block' : 'none';
      this.crosshairEl.classList.toggle('zoomed', aiming);
      this.crosshairEl.classList.toggle('aiming', aiming);
    }
    if (this.scopeEl) {
      if (this.viewMode === 'fps' && aiming) {
        this.scopeEl.classList.remove('hidden');
      } else {
        this.scopeEl.classList.add('hidden');
      }
    }
  }

  setShootingMode(active) {
    this.isShootingMode = active;
    this.setAiming(active);
  }

  setupTouchControls() {
    const joystickZone = document.getElementById('joystick-zone');
    const joystickStick = document.getElementById('joystick-stick');
    if (!joystickZone || !joystickStick) return;

    let touchId = null;
    let baseCenter = { x: 0, y: 0 };
    const maxRadius = 45;

    joystickZone.addEventListener('touchstart', (e) => {
      if (touchId !== null) return;
      const touch = e.changedTouches[0];
      touchId = touch.identifier;
      const rect = joystickZone.getBoundingClientRect();
      baseCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }, { passive: false });

    const handleTouchMove = (e) => {
      if (touchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchId) {
          const dx = touch.clientX - baseCenter.x;
          const dy = touch.clientY - baseCenter.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const clampedDist = Math.min(dist, maxRadius);

          const stickX = Math.cos(angle) * clampedDist;
          const stickY = Math.sin(angle) * clampedDist;

          joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;
          this.joystickVector.set(stickX / maxRadius, stickY / maxRadius);
          break;
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (touchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          touchId = null;
          joystickStick.style.transform = 'translate(0px, 0px)';
          this.joystickVector.set(0, 0);
          break;
        }
      }
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
  }

  triggerJump() {
    if (this.isGrounded) {
      this.isGrounded = false;
      this.verticalVelocity = 9.2; // Energetic, high-bouncing cute cat hop!
      this.jumpOffset = 0.08;
      if (this.sound) this.sound.playFootstep();
    }
  }

  update(delta) {
    const isGathering = this.cat.currentActionName === 'Gather';

    // Rapid auto-fire in Shooting Mode when Left-Click is held down
    if (this.isShootingMode && this.isMouseDownLeft && !isGathering) {
      this.autoFireTimer += delta;
      if (this.autoFireTimer >= 0.15) { // Responsive 6.6 shots/sec
        this.autoFireTimer = 0;
        if (this.onActionRequest) this.onActionRequest();
      }
    } else {
      this.autoFireTimer = 0.15;
    }

    // Calculate 3D camera forward, right and horizontal direction vectors
    const dirX = -Math.sin(this.cameraAngle) * Math.cos(this.cameraPitch);
    const dirY = -Math.sin(this.cameraPitch);
    const dirZ = -Math.cos(this.cameraAngle) * Math.cos(this.cameraPitch);
    const camForward = new THREE.Vector3(dirX, dirY, dirZ).normalize();
    const camForwardHoriz = new THREE.Vector3(-Math.sin(this.cameraAngle), 0, -Math.cos(this.cameraAngle)).normalize();
    const camRight = new THREE.Vector3(Math.cos(this.cameraAngle), 0, -Math.sin(this.cameraAngle)).normalize();

    // Calculate Movement Vector
    let moveX = 0;
    let moveZ = 0;

    if (!isGathering) {
      if (this.keys.forward) moveZ += 1;
      if (this.keys.backward) moveZ -= 1;
      if (this.keys.left) moveX -= 1;
      if (this.keys.right) moveX += 1;

      if (this.joystickVector.lengthSq() > 0.05) {
        moveX += this.joystickVector.x;
        moveZ -= this.joystickVector.y; // Invert joystick Y so pushing up moves forward
      }
    }

    const moveDir = new THREE.Vector2(moveX, moveZ);
    const moving = moveDir.lengthSq() > 0.01;

    if (moving && !isGathering) {
      this.idleTimer = 0;
      this.cat.wakeUp();

      moveDir.normalize();

      const worldMoveDir = new THREE.Vector3()
        .addScaledVector(camRight, moveDir.x)
        .addScaledVector(camForwardHoriz, moveDir.y)
        .normalize();

      const currentSpeed = (this.keys.sprint ? this.speed * this.sprintMultiplier : this.speed);
      this.position.x += worldMoveDir.x * currentSpeed * delta;
      this.position.z += worldMoveDir.z * currentSpeed * delta;

      // Solid obstacle & barricade collision resolution
      if (this.resolveCollision) {
        this.resolveCollision(this.position, 0.45);
      }

      // Clamp within farm boundaries
      const horizDist = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
      const maxRadius = 38.0;
      if (horizDist > maxRadius) {
        const factor = maxRadius / horizDist;
        this.position.x *= factor;
        this.position.z *= factor;
      }

      // Character facing rotation:
      // In Shooting Mode: locks facing toward camera crosshair
      // Not in Shooting Mode: turns freely toward actual movement direction (faces towards camera when moving backward!)
      let targetRotation = 0;
      if (this.isShootingMode) {
        targetRotation = this.cameraAngle + Math.PI;
      } else {
        targetRotation = Math.atan2(worldMoveDir.x, worldMoveDir.z);
      }

      let diff = targetRotation - this.cat.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const rotDamp = 1 - Math.exp(-18.0 * delta);
      this.cat.mesh.rotation.y += diff * rotDamp;

      // Play Walk or HappyRun animation
      const targetAnim = this.keys.sprint ? 'HappyRun' : 'Walk';
      if (this.cat.currentActionName !== targetAnim) {
        this.cat.playAnimation(targetAnim, 0.2);
      }

      // Footstep audio
      this.footstepTimer += delta * (this.keys.sprint ? 5.5 : 3.8);
      if (this.footstepTimer >= 1.0) {
        this.footstepTimer = 0;
        if (this.sound) this.sound.playFootstep();
      }
    } else {
      if (!isGathering && (this.cat.currentActionName === 'Walk' || this.cat.currentActionName === 'HappyRun')) {
        this.cat.playAnimation('Idle', 0.25);
      }

      // In Shooting Mode while stationary, follow camera angle smoothly
      if (this.isShootingMode) {
        this.idleTimer = 0;
        this.cat.wakeUp();
        const targetRotation = this.cameraAngle + Math.PI;
        let diff = targetRotation - this.cat.mesh.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const rotDamp = 1 - Math.exp(-16.0 * delta);
        this.cat.mesh.rotation.y += diff * rotDamp;
      } else if (!isGathering) {
        // Idle 20 seconds -> Sleep Mode!
        this.idleTimer += delta;
        if (this.idleTimer >= 20.0) {
          this.cat.enterSleepMode();
        }
      }
    }

    // Ground Contour & Jump Physics across tiered slopes
    const groundY = this.getTerrainHeight(this.position.x, this.position.z);

    if (!this.isGrounded) {
      this.verticalVelocity -= this.gravity * delta;
      this.jumpOffset += this.verticalVelocity * delta;

      if (this.jumpOffset <= 0) {
        this.jumpOffset = 0;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }
    }

    this.position.y = groundY + this.jumpOffset;

    // Sync mesh position
    this.cat.mesh.position.set(this.position.x, this.position.y, this.position.z);

    // Dynamic Smooth FOV (Zoom In / ADS)
    const targetFov = this.isAiming ? (this.viewMode === 'fps' ? this.fovZoomedFPS : this.fovZoomedTPS) : this.fovDefault;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 12.0);
      this.camera.updateProjectionMatrix();
    }

    // Camera Positioning (FPS vs TPS mode with true forward targeting)
    if (this.viewMode === 'fps') {
      // First Person: Camera placed at cat head/eyes looking outward
      const eyeHeight = 1.25 + (this.isGrounded ? Math.sin(Date.now() * 0.008) * 0.02 : 0);
      const fpsCamPos = new THREE.Vector3(
        this.position.x,
        this.position.y + eyeHeight,
        this.position.z
      );

      this.camera.position.copy(fpsCamPos);
      const lookTarget = fpsCamPos.clone().add(camForward);
      this.camera.lookAt(lookTarget);

    } else {
      // Third Person (TPS): Over-the-shoulder shooter camera looking FORWARD into world
      // When aiming, maintain clear distance and shift far right so character never blocks crosshair or scene
      const targetDist = this.isAiming ? 4.2 : this.targetCameraDistance;
      this.cameraDistance = THREE.MathUtils.lerp(this.cameraDistance, targetDist, delta * 12.0);

      const shoulderOffset = this.isAiming ? 1.45 : 0.45;
      const headHeight = this.isAiming ? 1.4 : 1.35;

      const anchorPos = new THREE.Vector3(
        this.position.x,
        this.position.y + headHeight,
        this.position.z
      );

      // Place camera behind the player along -camForward and offset to right shoulder
      const targetCamPos = anchorPos.clone()
        .addScaledVector(camForward, -this.cameraDistance)
        .addScaledVector(camRight, shoulderOffset);

      // Check terrain elevation so camera never clips below hills
      const groundAtCam = this.getTerrainHeight(targetCamPos.x, targetCamPos.z);
      if (targetCamPos.y < groundAtCam + 0.65) {
        targetCamPos.y = groundAtCam + 0.65;
      }

      this.camera.position.lerp(targetCamPos, delta * 16.0);

      // The camera looks FORWARD in the exact direction of camForward!
      const lookTarget = this.camera.position.clone().addScaledVector(camForward, 50.0);
      this.camera.lookAt(lookTarget);
    }
  }
}
