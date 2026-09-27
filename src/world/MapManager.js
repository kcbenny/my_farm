import * as THREE from 'three';
import { PortalSystem, ADVENTURE_MAPS } from './PortalSystem.js';
import { EnchantedForest } from './EnchantedForest.js';
import { AncientRuins } from './AncientRuins.js';
import { SnowyMountain } from './SnowyMountain.js';
import { MysticLake } from './MysticLake.js';
import { StarryMeadow } from './StarryMeadow.js';
import { HarvestMaze } from './HarvestMaze.js';

const MapClasses = {
  enchantedForest: EnchantedForest,
  ancientRuins: AncientRuins,
  snowyMountain: SnowyMountain,
  mysticLake: MysticLake,
  starryMeadow: StarryMeadow,
  harvestMaze: HarvestMaze,
};

export class MapManager {
  constructor(scene, getTerrainHeight) {
    this.scene = scene;
    this.getTerrainHeight = getTerrainHeight;

    this.portalSystem = new PortalSystem(scene, getTerrainHeight);
    this.maps = {};
    this.activeMapId = null;

    /** Callback: (pos: Vector3, collected: number, total: number) => void */
    this.onCollect = null;
    /** Callback: (mapName: string, missions: [], status: {}) => void */
    this.onEnterMap = null;
    /** Callback: () => void */
    this.onLeaveMap = null;
  }

  getActiveMap() {
    return this.activeMapId ? this.maps[this.activeMapId] : null;
  }

  getActiveMapId() {
    return this.activeMapId;
  }

  isNearFarmPortal(position) {
    return this.portalSystem.isNearAnyPortal(position);
  }

  getPortalConfig(mapId) {
    return this.portalSystem.getConfig(mapId);
  }

  isNearReturnPortal(position) {
    const active = this.getActiveMap();
    return active ? active.isNearReturnPortal(position) : false;
  }

  travelToMap(mapId) {
    if (!MapClasses[mapId]) return null;

    const cfg = ADVENTURE_MAPS[mapId];
    if (!this.maps[mapId]) {
      this.maps[mapId] = new MapClasses[mapId](this.scene, this.getTerrainHeight, cfg);
      const map = this.maps[mapId];
      if (map.onCollectCallback !== undefined) {
        map.onCollectCallback = this.onCollect;
      }
    }

    this.activeMapId = mapId;
    // Fire mission panel
    const map = this.maps[mapId];
    if (this.onEnterMap && map.getMissions) {
      const missions = map.getMissions();
      const status = map.checkMissionStatus ? map.checkMissionStatus() : {};
      const hints = map.getHints ? map.getHints() : [];
      this.onEnterMap(cfg.name, missions, status, hints);
    }
    return cfg.mapArrival.clone();
  }

  returnToFarm() {
    if (!this.activeMapId) return null;
    const cfg = ADVENTURE_MAPS[this.activeMapId];
    this.activeMapId = null;
    if (this.onLeaveMap) this.onLeaveMap();
    return cfg.farmArrival.clone();
  }

  isInAdventureMap() {
    return this.activeMapId !== null;
  }

  getActiveGroundY() {
    if (!this.activeMapId) return null;
    const map = this.maps[this.activeMapId];
    return map ? map.getGroundY() : 0;
  }

  /** Check ALL interactions for the active map */
  checkMapInteractions(playerPos) {
    if (!this.activeMapId) return { interacted: false };
    const map = this.maps[this.activeMapId];
    if (!map) return { interacted: false };

    const result = { interacted: false, data: {} };

    // Gem collection
    if (map.checkCollect && map.checkCollect(playerPos)) {
      result.interacted = true;
    }

    // Ancient Ruins specific
    if (map.checkRunePuzzle && map.checkRunePuzzle(playerPos)) { result.interacted = true; }
    if (map.tryClearChamber && map.tryClearChamber(playerPos)) { result.interacted = true; }
    if (map.checkQuicksand && map.checkQuicksand(playerPos)) { result.data.quicksand = true; result.interacted = true; }
    if (map.getQuicksandSlowdown) { result.data.slowdown = map.getQuicksandSlowdown(playerPos); }
    if (map.updateGolem) { result.data.golem = map.updateGolem(0.016, playerPos); }
    if (map.checkScorpionHit) {
      result.data.scorpionHit = map.checkScorpionHit(new THREE.Vector2(playerPos.x, playerPos.z));
    }

    // Harvest Maze specific
    if (map.tryLightLantern && map.tryLightLantern(playerPos)) { result.interacted = true; }
    if (map.tryAppleBobbing && map.tryAppleBobbing(playerPos)) { result.interacted = true; }
    if (map.updateKing) { result.data.king = map.updateKing(0.016, playerPos); }

    // Enchanted Forest specific
    if (map.checkBounceMushroom) { result.data.bounceMushroom = map.checkBounceMushroom(playerPos); }
    if (map.checkCanopyPlatform) { map.checkCanopyPlatform(playerPos); }
    if (map.tryCaptureFirefly && map.tryCaptureFirefly(playerPos)) { result.interacted = true; }
    if (map.checkTreehole) { result.data.treehole = map.checkTreehole(playerPos); }

    // Snowy Mountain specific
    if (map.isOnIceSheet) { result.data.onIce = map.isOnIceSheet(playerPos); }
    if (map.checkPeakTop && map.checkPeakTop(playerPos)) { result.interacted = true; }
    if (map.tryCompleteSnowman && map.tryCompleteSnowman(playerPos)) { result.interacted = true; }
    if (map.updateAvalanche) { result.data.avalancheHit = map.updateAvalanche(0.016, playerPos); }

    // Mystic Lake specific
    if (map.checkFrogInteraction && map.checkFrogInteraction(playerPos)) { result.interacted = true; }
    if (map.checkVortexEntry && map.checkVortexEntry(playerPos)) { result.interacted = true; }
    if (map.boardBoat) { result.data.boatBoard = map.boardBoat(playerPos); }
    if (map.startFishing) { result.data.fishing = map.startFishing(); }
    if (map.checkFishCatch) { result.data.fishCaught = map.checkFishCatch(); }

    // Starry Meadow specific
    if (map.checkConstellation && map.checkConstellation(playerPos)) { result.interacted = true; }
    if (map.checkHengeAltar && map.checkHengeAltar(playerPos)) { result.interacted = true; }
    if (map.checkShootingStarWish && map.checkShootingStarWish()) { result.interacted = true; }

    // Mission status update every frame
    if (map.checkMissionStatus) {
      result.data.missions = map.checkMissionStatus();
    }

    return result;
  }

  getActiveMapProgress() {
    if (!this.activeMapId) return null;
    const map = this.maps[this.activeMapId];
    return map ? map.getProgress() : null;
  }

  isActiveMapComplete() {
    if (!this.activeMapId) return false;
    const map = this.maps[this.activeMapId];
    return map ? map.isComplete() : false;
  }

  update(delta) {
    this.portalSystem.update(delta);
    if (this.activeMapId && this.maps[this.activeMapId]) {
      this.maps[this.activeMapId].update(delta);
    }
  }
}