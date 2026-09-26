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
    return cfg.mapArrival.clone();
  }

  returnToFarm() {
    if (!this.activeMapId) return null;
    const cfg = ADVENTURE_MAPS[this.activeMapId];
    this.activeMapId = null;
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

  /** Check collectibles + puzzle for the active map */
  checkMapInteractions(playerPos) {
    if (!this.activeMapId) return false;
    const map = this.maps[this.activeMapId];
    if (!map) return false;

    let interacted = false;

    // Collectible gems
    if (map.checkCollect) {
      if (map.checkCollect(playerPos)) interacted = true;
    }

    // Ancient Ruins rune puzzle
    if (map.checkRunePuzzle) {
      if (map.checkRunePuzzle(playerPos)) interacted = true;
    }

    return interacted;
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