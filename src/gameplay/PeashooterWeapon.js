import * as THREE from 'three';

export class PeashooterWeapon {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.particles = [];
    this.activeStyle = 'peashooter';

    this.MAX_PROJECTILES = 15;
    this.MAX_PARTICLES = 50;

    // Shared Geometries (Reused across all particle instances)
    this.particleGeom = new THREE.DodecahedronGeometry(0.06, 0);
    this.trailGeom = new THREE.SphereGeometry(0.08, 4, 4);

    // Shared Materials (Reused across all projectiles and effects)
    this.materials = {
      peaMat: new THREE.MeshStandardMaterial({ color: 0x70e000, roughness: 0.3, metalness: 0.1, emissive: 0x38b000, emissiveIntensity: 0.4, flatShading: true }),
      carrotMat: new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.4, flatShading: true }),
      leafGreen: new THREE.MeshStandardMaterial({ color: 0x38b000, roughness: 0.6, flatShading: true }),
      fishPink: new THREE.MeshStandardMaterial({ color: 0xff85a1, roughness: 0.4, flatShading: true }),
      rainbowMat: new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.2, metalness: 0.5, emissive: 0xff758f, emissiveIntensity: 0.6 }),
      laserGold: new THREE.MeshBasicMaterial({ color: 0xffd000 }),

      pGreen: new THREE.MeshBasicMaterial({ color: 0x9ef01a }),
      pOrange: new THREE.MeshBasicMaterial({ color: 0xff6b35 }),
      pBlue: new THREE.MeshBasicMaterial({ color: 0x48cae4 }),
      pPink: new THREE.MeshBasicMaterial({ color: 0xff758f }),
      pYellow: new THREE.MeshBasicMaterial({ color: 0xffd000 }),
      pWhite: new THREE.MeshBasicMaterial({ color: 0xffffff })
    };

    // Shared Projectile Geometries
    this.projGeoms = {
      pea: new THREE.SphereGeometry(0.22, 8, 8),
      fin: new THREE.ConeGeometry(0.1, 0.24, 4),
      carrot: new THREE.ConeGeometry(0.16, 0.55, 6),
      fishBody: new THREE.SphereGeometry(0.18, 6, 6),
      star: new THREE.OctahedronGeometry(0.22),
      laser: new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6)
    };
    this.projGeoms.fin.rotateX(-Math.PI / 2);
    this.projGeoms.carrot.rotateX(Math.PI / 2);
    this.projGeoms.laser.rotateX(Math.PI / 2);
  }

  setWeaponStyle(styleKey) {
    this.activeStyle = styleKey;
  }

  createProjectileMesh(style) {
    const group = new THREE.Group();

    if (style === 'carrot') {
      const cone = new THREE.Mesh(this.projGeoms.carrot, this.materials.carrotMat);
      group.add(cone);
    } else if (style === 'fish') {
      const body = new THREE.Mesh(this.projGeoms.fishBody, this.materials.fishPink);
      body.scale.set(1.4, 0.7, 0.6);
      group.add(body);
    } else if (style === 'rainbow') {
      const star = new THREE.Mesh(this.projGeoms.star, this.materials.rainbowMat);
      group.add(star);
    } else if (style === 'laser') {
      const beam = new THREE.Mesh(this.projGeoms.laser, this.materials.laserGold);
      group.add(beam);
    } else {
      const pea = new THREE.Mesh(this.projGeoms.pea, this.materials.peaMat);
      group.add(pea);

      const fin = new THREE.Mesh(this.projGeoms.fin, this.materials.peaMat);
      fin.position.set(0, 0, -0.16);
      group.add(fin);
    }

    return group;
  }

  fire(origin, direction, targetPos = null, soundSystem = null) {
    // Limit active projectiles to prevent lag
    if (this.projectiles.length >= this.MAX_PROJECTILES) {
      const oldest = this.projectiles.shift();
      this.scene.remove(oldest.mesh);
    }

    const style = this.activeStyle;
    const peaMesh = this.createProjectileMesh(style);
    peaMesh.position.copy(origin);

    const speedMap = {
      peashooter: 52.0,
      carrot: 85.0,
      fish: 38.0,
      rainbow: 65.0,
      laser: 120.0
    };

    const speed = speedMap[style] || 52.0;
    let velocity;

    if (targetPos) {
      const toTarget = new THREE.Vector3().subVectors(targetPos, origin);
      const horizDist = Math.sqrt(toTarget.x * toTarget.x + toTarget.z * toTarget.z);
      const timeToTarget = Math.max(0.08, horizDist / speed);
      
      velocity = new THREE.Vector3(
        toTarget.x / timeToTarget,
        (toTarget.y + 0.5 * (style === 'laser' ? 2.0 : 9.8) * timeToTarget * timeToTarget) / timeToTarget,
        toTarget.z / timeToTarget
      );
    } else {
      velocity = direction.clone().normalize().multiplyScalar(speed);
      velocity.y += (style === 'laser' ? 0.2 : 0.8);
    }

    const velNorm = velocity.clone().normalize();
    if (velNorm.lengthSq() > 0.001 && !isNaN(velNorm.x) && !isNaN(velNorm.y) && !isNaN(velNorm.z)) {
      try {
        peaMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), velNorm);
      } catch (err) {}
    }

    this.scene.add(peaMesh);

    const projectile = {
      mesh: peaMesh,
      velocity: velocity,
      life: 2.5,
      radius: 0.5,
      style: style,
      trailTimer: 0
    };

    this.projectiles.push(projectile);
    this.spawnMuzzleFlash(origin, direction, style);

    if (soundSystem) {
      if (style === 'laser') soundSystem.playLaser();
      else if (style === 'fish') soundSystem.playBubble();
      else if (style === 'carrot') soundSystem.playRocket();
      else soundSystem.playPop();
    }
  }

  spawnMuzzleFlash(pos, dir, style) {
    if (this.particles.length >= this.MAX_PARTICLES) return;

    const matMap = {
      peashooter: this.materials.pGreen,
      carrot: this.materials.pOrange,
      fish: this.materials.pBlue,
      rainbow: this.materials.pPink,
      laser: this.materials.pYellow
    };
    const pMat = matMap[style] || this.materials.pGreen;

    for (let i = 0; i < 5; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) break;
      const pMesh = new THREE.Mesh(this.particleGeom, pMat);
      pMesh.position.copy(pos);

      const spread = 0.4;
      const vel = dir.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread
      )).normalize().multiplyScalar(3.0 + Math.random() * 3.0);

      this.scene.add(pMesh);
      this.particles.push({
        mesh: pMesh,
        vel,
        life: 0.2,
        maxLife: 0.2
      });
    }
  }

  spawnImpactSplat(pos, style = 'peashooter') {
    if (this.particles.length >= this.MAX_PARTICLES) return;

    const paletteMap = {
      peashooter: [this.materials.pGreen, this.materials.pWhite],
      carrot: [this.materials.pOrange, this.materials.pYellow],
      fish: [this.materials.pBlue, this.materials.pWhite],
      rainbow: [this.materials.pPink, this.materials.pYellow, this.materials.pBlue],
      laser: [this.materials.pYellow, this.materials.pWhite]
    };
    const palette = paletteMap[style] || [this.materials.pGreen];

    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) break;
      const pMat = palette[Math.floor(Math.random() * palette.length)];
      const pMesh = new THREE.Mesh(this.particleGeom, pMat);
      pMesh.position.copy(pos);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        2.0 + Math.random() * 3.5,
        (Math.random() - 0.5) * 5
      );

      this.scene.add(pMesh);
      this.particles.push({
        mesh: pMesh,
        vel,
        life: 0.35,
        maxLife: 0.35
      });
    }
  }

  update(delta, onHitTargetCallback) {
    // 1. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.life -= delta;

      // Move with physics
      proj.mesh.position.addScaledVector(proj.velocity, delta);
      if (proj.style !== 'laser') {
        proj.velocity.y -= delta * 9.8;
      }
      proj.mesh.rotation.z += delta * 15.0;

      // Spawn style-specific trail puff
      proj.trailTimer += delta;
      if (proj.trailTimer > 0.05 && this.particles.length < this.MAX_PARTICLES) {
        proj.trailTimer = 0;

        const trailMatMap = {
          peashooter: this.materials.pGreen,
          carrot: this.materials.pOrange,
          fish: this.materials.pBlue,
          rainbow: this.materials.pPink,
          laser: this.materials.pYellow
        };

        const trailMat = trailMatMap[proj.style] || this.materials.pGreen;
        const trailMesh = new THREE.Mesh(this.trailGeom, trailMat);
        trailMesh.position.copy(proj.mesh.position);

        this.scene.add(trailMesh);
        this.particles.push({
          mesh: trailMesh,
          vel: new THREE.Vector3(0, 0.15, 0),
          life: 0.2,
          maxLife: 0.2
        });
      }

      let hit = false;

      // Check external target collision
      if (onHitTargetCallback) {
        const hitResult = onHitTargetCallback(proj.mesh.position, proj.radius);
        if (hitResult) {
          this.spawnImpactSplat(proj.mesh.position, proj.style);
          hit = true;
        }
      }

      // Check ground collision
      if (proj.mesh.position.y <= 0.1) {
        this.spawnImpactSplat(proj.mesh.position, proj.style);
        hit = true;
      }

      if (hit || proj.life <= 0) {
        this.scene.remove(proj.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.scale.multiplyScalar(0.9);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }
}
