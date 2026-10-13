import * as THREE from 'three';
import { PortalSystem, ADVENTURE_MAPS } from './PortalSystem.js';
import { EnchantedForest } from './EnchantedForest.js';
import { AncientRuins } from './AncientRuins.js';
import { SnowyMountain } from './SnowyMountain.js';
import { MysticLake } from './MysticLake.js';
import { StarryMeadow } from './StarryMeadow.js';
import { HarvestMaze } from './HarvestMaze.js';
import {
  addMoonlitPath, updateMoonlitPath,
  addHourglassMode, startHourglass, updateHourglass, completeHourglass,
  addTemperatureSystem, updateTemperature,
  addTideSystem, updateTide,
  addAstrologySystem, applyConstellationBuff,
  addFogOfWar, updateFogOfWar,
  addExplorerAchievement, checkExplorerCorners,
  addMysteryMerchant, updateMysteryMerchant,
} from './MapFunEnhancements.js';

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
    /** Callback: (mapId: string) => void */
    this.onProximityHint = null;
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

  beginFarmPortalTravel(mapId) {
    return this.portalSystem.beginTeleport(mapId);
  }

  getPortalVisualState() {
    return this.portalSystem.getVisualState();
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
      const createdMap = this.maps[mapId];
      if (createdMap.onCollectCallback !== undefined) {
        createdMap.onCollectCallback = this.onCollect;
      }
      if (createdMap.onProximityHint !== undefined) {
        createdMap.onProximityHint = this.onProximityHint;
      }
    }

    const map = this.maps[mapId];
    this.activeMapId = mapId;
    if (map.setAtmosphere) map.setAtmosphere(true);

    // 注入冷门玩法增强（每个地图第一次加载时）
    if (!map._enhanced) {
      this._injectFunEnhancements(mapId, map);
      map._enhanced = true;
    }

    // Fire mission panel
    if (this.onEnterMap && map.getMissions) {
      const missions = map.getMissions();
      const status = map.checkMissionStatus ? map.checkMissionStatus() : {};
      const hints = map.getHints ? map.getHints() : [];
      this.onEnterMap(cfg.name, missions, status, hints);
    }
    return cfg.mapArrival.clone();
  }

  /**
   * 给每个地图注入独特的冷门玩法增强
   * 设计原则：不是增加更多收集品，而是改变决策方式
   */
  _injectFunEnhancements(mapId, map) {
    // 所有地图通用：角落探险家成就
    const r = map.mapRadius || 30;
    const corners = [
      new THREE.Vector3(r * 0.85, 0, r * 0.85),
      new THREE.Vector3(-r * 0.85, 0, r * 0.85),
      new THREE.Vector3(r * 0.85, 0, -r * 0.85),
      new THREE.Vector3(-r * 0.85, 0, -r * 0.85),
    ];
    addExplorerAchievement(map, corners);

    switch (mapId) {
      case 'enchantedForest':
        // 月光小径：每隔一段时间出现的发光捷径，通向隐藏宝藏
        addMoonlitPath(map);
        // 精灵集市：用收集的粉尘交易特殊buff
        addMysteryMerchant(map, {
          position: new THREE.Vector3(-6, 0, 6),
          currency: 'fairyDust',
          items: [
            { id: 'glow', name: '萤光护符', desc: '收集范围 +30%', price: 5 },
            { id: 'speed', name: '疾风之靴', desc: '移动速度 +20%', price: 8 },
            { id: 'magnet', name: '粉尘磁铁', desc: '自动吸引附近粉尘', price: 12 },
          ],
        });
        break;

      case 'ancientRuins':
        // 沙漏倒计时：踩错符文启动倒计时，时间内完成有额外奖励
        addHourglassMode(map);
        // 神秘商人（用黄金圣甲虫交易）
        addMysteryMerchant(map, {
          position: new THREE.Vector3(8, 0, -6),
          currency: 'scarabs',
          items: [
            { id: 'shield', name: '流沙护符', desc: '流沙减速减半', price: 6 },
            { id: 'map', name: '遗迹地图', desc: '显示密室位置', price: 10 },
            { id: 'time', name: '时之沙', desc: '沙漏时间 +15秒', price: 8 },
          ],
        });
        break;

      case 'snowyMountain':
        // 体温系统：太冷减速，找温泉恢复
        const hotSprings = [
          new THREE.Vector3(-8, 0, -4),
          new THREE.Vector3(6, 0, 8),
          new THREE.Vector3(0, 0, -10),
        ];
        addTemperatureSystem(map, { hotSprings });
        break;

      case 'mysticLake':
        // 潮汐系统：水位变化改变可达区域
        addTideSystem(map);
        break;

      case 'starryMeadow':
        // 星象占卜：完成星座的顺序影响获得的buff
        addAstrologySystem(map);
        break;

      case 'harvestMaze':
        // 迷雾记忆：只有走过的地方才可见（增强探索感）
        addFogOfWar(map);
        break;
    }
  }

  returnToFarm() {
    if (!this.activeMapId) return null;
    const cfg = ADVENTURE_MAPS[this.activeMapId];
    this.maps[this.activeMapId]?.setAtmosphere?.(false);
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

    // ── 增强玩法系统检测 ──
    // 角落探险家成就
    if (map._explorerCorners) {
      checkExplorerCorners(map, playerPos);
    }

    // 月光小径 (EnchantedForest)
    if (map._moonlitPath) {
      const moonlitResult = updateMoonlitPath(map, playerPos, 0);
      if (moonlitResult) result.data.moonlitPath = moonlitResult;
    }

    // 神秘商人
    if (map._merchant) {
      const merchantResult = updateMysteryMerchant(map, playerPos, 0);
      if (merchantResult) result.data.merchant = merchantResult;
    }

    // 体温系统 (SnowyMountain)
    if (map._temperature) {
      const tempResult = updateTemperature(map, playerPos, 0);
      if (tempResult) result.data.temperature = tempResult;
    }

    // 迷雾记忆 (HarvestMaze)
    if (map._fogOfWar) {
      const fowResult = updateFogOfWar(map, playerPos);
      if (fowResult) result.data.fogOfWar = fowResult;
    }

    // 连击 & 成就信息
    result.data.combo = {
      current: map.combo || 0,
      best: map.bestCombo || 0,
      timer: map.comboTimer || 0,
      score: map.comboScore || 0,
    };
    result.data.achievements = {
      unlocked: map.getUnlockedAchievements ? map.getUnlockedAchievements().length : 0,
      total: map.getTotalAchievements ? map.getTotalAchievements() : 0,
    };

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

  update(delta, playerPosition) {
    const completedPortalTravel = this.portalSystem.update(delta, playerPosition);
    if (this.activeMapId && this.maps[this.activeMapId]) {
      const map = this.maps[this.activeMapId];
      map.update(delta);

      // 增强玩法系统每帧更新
      if (map._moonlitPath) updateMoonlitPath(map, playerPosition, delta);
      if (map._hourglass) updateHourglass(map, delta);
      if (map._temperature) updateTemperature(map, playerPosition, delta);
      if (map._tide) updateTide(map, delta);
      if (map._merchant) updateMysteryMerchant(map, playerPosition, delta);
    }
    return completedPortalTravel;
  }
}