import * as THREE from 'three';

function makePortal(glowColor = 0x69f5c8) {
  const portal = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x5f6b70, roughness: 0.85, flatShading: true });
  const glow = new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.15, 6, 12), glow);
  ring.position.y = 1.4;
  ring.rotation.y = Math.PI / 2;
  portal.add(ring);
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
    mapArrival: new THREE.Vector3(220, 0, 6),
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

  update(delta) {
    this.time += delta;
    for (const entry of Object.values(this.portals)) {
      entry.mesh.userData.ring.rotation.z = this.time * 0.8;
      entry.mesh.userData.ring.scale.setScalar(1 + Math.sin(this.time * 2) * 0.05);
    }
  }
}