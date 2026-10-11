import * as THREE from 'three';

function makePortal(glowColor = 0x69f5c8) {
  const portal = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x5f6b70, roughness: 0.85, flatShading: true });
  const portalColor = new THREE.Color(glowColor);
  const ringMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: portalColor },
      intensity: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color;
      uniform float intensity;
      varying vec2 vUv;

      void main() {
        float flow = sin(vUv.x * 36.0 - time * 4.0 + sin(vUv.y * 18.0 + time * 2.0) * 2.0);
        float streaks = smoothstep(0.32, 0.9, flow) * (0.55 + 0.45 * sin(vUv.x * 12.0 + time * 2.5));
        float edge = smoothstep(0.0, 0.18, vUv.y) * smoothstep(0.0, 0.18, 1.0 - vUv.y);
        float energy = (0.42 + streaks * 0.9) * edge * intensity;
        gl_FragColor = vec4(color * energy * 1.8, energy);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 1.16, 64, 3), ringMaterial);
  ring.position.y = 1.4;
  ring.rotation.y = Math.PI / 2;
  portal.add(ring);

  const particleCount = 96;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const angle = i / particleCount * Math.PI * 2;
    const radius = 0.88 + (i % 5) * 0.06;
    particlePositions[i * 3] = Math.cos(angle) * radius;
    particlePositions[i * 3 + 1] = Math.sin(angle) * radius;
    particlePositions[i * 3 + 2] = (i % 3 - 1) * 0.045;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
    color: portalColor,
    size: 0.075,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  }));
  particles.position.y = 1.4;
  particles.rotation.y = Math.PI / 2;
  portal.add(particles);

  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), stone);
    rock.position.set(Math.sin(angle) * 1.18, 1.4 + Math.cos(angle) * 1.18, 0);
    rock.rotation.set(angle, angle * 0.4, 0.2);
    rock.castShadow = true;
    portal.add(rock);
  }
  const light = new THREE.PointLight(glowColor, 2.4, 9, 1.8);
  light.position.y = 1.4;
  portal.add(light);
  portal.userData.ring = ring;
  portal.userData.ringMaterial = ringMaterial;
  portal.userData.particles = particles;
  portal.userData.particleMaterial = particles.material;
  portal.userData.light = light;
  return portal;
}

export const ADVENTURE_MAPS = {
  enchantedForest: {
    id: 'enchantedForest',
    name: 'Enchanted Forest 🌲',
    subtitle: 'Glowing mushrooms & fairy wisps',
    icon: '🌲',
    color: 0x7b2fbe,
    farmPortalPos: new THREE.Vector3(38, 0, -22),
    mapOffset: new THREE.Vector3(220, 0, 0),
    mapArrival: new THREE.Vector3(220, 0, -3),  // safe — clear of mushrooms
    farmArrival: new THREE.Vector3(38, 0, -20),
  },
  ancientRuins: {
    id: 'ancientRuins',
    name: 'Ancient Ruins Temple 🏛️',
    subtitle: 'Solve puzzles & find treasure',
    icon: '🏛️',
    color: 0xc4943a,
    farmPortalPos: new THREE.Vector3(-36, 0, -18),
    mapOffset: new THREE.Vector3(-220, 0, 0),
    mapArrival: new THREE.Vector3(-220, 0, 6),
    farmArrival: new THREE.Vector3(-36, 0, -16),
  },
  snowyMountain: {
    id: 'snowyMountain',
    name: 'Snowy Mountain Peak ❄️',
    subtitle: 'Ice crystals & frozen adventure',
    icon: '❄️',
    color: 0x88ccff,
    farmPortalPos: new THREE.Vector3(30, 0, 28),
    mapOffset: new THREE.Vector3(0, 0, 220),
    mapArrival: new THREE.Vector3(0, 0, 226),
    farmArrival: new THREE.Vector3(30, 0, 30),
  },
  mysticLake: {
    id: 'mysticLake',
    name: 'Mystic Lake Depths 🌊',
    subtitle: 'Sail lotus waters & find pearls',
    icon: '🌊',
    color: 0x00b4d8,
    farmPortalPos: new THREE.Vector3(-24, 0, 24),
    mapOffset: new THREE.Vector3(0, 0, -220),
    mapArrival: new THREE.Vector3(0, 0, -214),
    farmArrival: new THREE.Vector3(-24, 0, 26),
  },
  starryMeadow: {
    id: 'starryMeadow',
    name: 'Starry Meadow ⭐',
    subtitle: 'Constellations & shooting stars',
    icon: '⭐',
    color: 0xffd166,
    farmPortalPos: new THREE.Vector3(40, 0, 18),
    mapOffset: new THREE.Vector3(220, 0, 220),
    mapArrival: new THREE.Vector3(220, 0, 226),
    farmArrival: new THREE.Vector3(40, 0, 20),
  },
  harvestMaze: {
    id: 'harvestMaze',
    name: 'Harvest Corn Maze 🎃',
    subtitle: 'Autumn labyrinth & pumpkin lights',
    icon: '🎃',
    color: 0xff6b35,
    farmPortalPos: new THREE.Vector3(-32, 0, -24),
    mapOffset: new THREE.Vector3(-220, 0, -220),
    mapArrival: new THREE.Vector3(-220, 0, -214),
    farmArrival: new THREE.Vector3(-32, 0, -22),
  },
};

export class PortalSystem {
  constructor(scene, getTerrainHeight) {
    this.scene = scene;
    this.getTerrainHeight = getTerrainHeight;
    this.portals = {};
    this.time = 0;
    this.transition = null;
    this.visualState = { position: null, intensity: 0 };

    for (const [key, cfg] of Object.entries(ADVENTURE_MAPS)) {
      cfg.farmPortalPos.y = getTerrainHeight(cfg.farmPortalPos.x, cfg.farmPortalPos.z);
      cfg.mapArrival.y = cfg.mapOffset.y;
      cfg.farmArrival.y = getTerrainHeight(cfg.farmArrival.x, cfg.farmArrival.z);

      const portal = makePortal(cfg.color);
      portal.name = `Portal_${cfg.id}`;
      portal.position.copy(cfg.farmPortalPos);
      portal.userData.mapId = cfg.id;
      scene.add(portal);

      this.portals[key] = { mesh: portal, config: cfg };
    }
  }

  isNearAnyPortal(position) {
    for (const [key, entry] of Object.entries(this.portals)) {
      if (position.distanceToSquared(entry.config.farmPortalPos) < 7.5) {
        return key;
      }
    }
    return null;
  }

  getConfig(mapId) {
    return ADVENTURE_MAPS[mapId] || null;
  }

  beginTeleport(mapId) {
    if (!this.portals[mapId] || this.transition) return false;
    this.transition = { mapId, elapsed: 0, duration: 0.55 };
    return true;
  }

  getVisualState() {
    return this.visualState;
  }

  update(delta, playerPosition = null) {
    this.time += delta;
    let strongestEntry = null;
    let strongestIntensity = 0;

    for (const entry of Object.values(this.portals)) {
      const distance = playerPosition
        ? playerPosition.distanceTo(entry.config.farmPortalPos)
        : Infinity;
      const proximity = 1 - THREE.MathUtils.smoothstep(distance, 2.4, 6);
      const isTeleporting = this.transition?.mapId === entry.config.id;
      const teleportEnergy = isTeleporting
        ? Math.sin(Math.min(this.transition.elapsed / this.transition.duration, 1) * Math.PI)
        : 0;
      const intensity = 1 + proximity * 1.35 + teleportEnergy * 2.8;
      const { ring, ringMaterial, particles, particleMaterial, light } = entry.mesh.userData;

      ringMaterial.uniforms.time.value = this.time;
      ringMaterial.uniforms.intensity.value = intensity;
      ring.rotation.z = this.time * (0.8 + proximity * 1.2);
      ring.scale.setScalar(1 + Math.sin(this.time * 2) * 0.05 + proximity * 0.08 + teleportEnergy * 0.16);
      particles.rotation.z = -this.time * (1.25 + proximity * 1.5);
      particles.scale.setScalar(1 + proximity * 0.08 + teleportEnergy * 0.18);
      particleMaterial.opacity = Math.min(1, 0.72 + proximity * 0.2 + teleportEnergy * 0.25);
      light.intensity = 2.4 + proximity * 2.4 + teleportEnergy * 4;

      if (intensity > strongestIntensity && (proximity > 0 || isTeleporting)) {
        strongestEntry = entry;
        strongestIntensity = intensity;
      }
    }

    this.visualState.position = strongestEntry?.mesh.position ?? null;
    this.visualState.intensity = strongestEntry ? strongestIntensity : 0;

    if (!this.transition) return null;
    this.transition.elapsed += delta;
    if (this.transition.elapsed < this.transition.duration) return null;
    const { mapId } = this.transition;
    this.transition = null;
    return mapId;
  }
}