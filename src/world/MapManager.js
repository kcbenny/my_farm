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

    // Lazy-load map if not yet created
    if (!this.maps[mapId]) {
      this.maps[mapId] = new MapClasses[mapId](this.scene, this.getTerrainHeight);
    }

    this.activeMapId = mapId;
    const cfg = ADVENTURE_MAPS[mapId];
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

  update(delta) {
    this.portalSystem.update(delta);
    if (this.activeMapId && this.maps[this.activeMapId]) {
      this.maps[this.activeMapId].update(delta);
    }
  }
}