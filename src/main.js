import * as THREE from 'three';
import { CatCharacter } from './character/CatCharacter.js';
import { CAT_CHARACTERS } from './character/CatCharactersConfig.js';
import { FarmEnvironment } from './world/FarmEnvironment.js';
import { CropSystem } from './gameplay/CropSystem.js';
import { PeashooterWeapon } from './gameplay/PeashooterWeapon.js';
import { PestSystem } from './gameplay/PestSystem.js';
import { PlayerController } from './gameplay/PlayerController.js';
import { PlayerPhysicsSystem } from './gameplay/PlayerPhysicsSystem.js';
import { SoundSystem } from './gameplay/SoundSystem.js';
import { UIManager } from './ui/UIManager.js';
import { ShopSystem } from './gameplay/ShopSystem.js';
import { KittyHomeSystem } from './gameplay/KittyHomeSystem.js';
import { PlayableItemsSystem } from './gameplay/PlayableItemsSystem.js';
import { MapSystem } from './ui/MapSystem.js';
import { CharacterSelectManager } from './ui/CharacterSelectManager.js';
import { LivestockSystem } from './world/LivestockSystem.js';
import { GLTFExportManager } from './gameplay/GLTFExportManager.js';
import { normalizeAsset } from './gameplay/WorldPhysics.js';
import { SecretFishingSpot } from './world/SecretFishingSpot.js';
import { QuestAchievementUI } from './ui/QuestAchievementUI.js';
import { MissionPanel } from './ui/MissionPanel.js';
import { MapManager } from './world/MapManager.js';
import { FarmPostProcessing } from './rendering/FarmPostProcessing.js';
import { CatLifeParticles } from './character/CatLifeParticles.js';
import { updateWaterSurfaces } from './world/StylizedWater.js';

class FarmGame {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();

    // Game stats
    this.coins = 50; // Starting coins to buy initial seeds!
    this.cropsHarvested = 0;
    this.pestsDefeated = 0;

    this.initEngine();
    this.initComponents();
    this.setupWindowResize();

    window.GLTFExportManager = GLTFExportManager;
    window.farmGame = this;

    // Start loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initEngine() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x78b5e7);
    this.scene.fog = new THREE.FogExp2(0x78b5e7, 0.0032);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 4, 8);
    this.camera.layers.enable(1);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);
    this.postProcessing = new FarmPostProcessing(this.renderer, this.scene, this.camera, {
      depthOfField: !window.matchMedia('(pointer: coarse)').matches,
    });
    this.postProcessing.resize(window.innerWidth, window.innerHeight, this.renderer.getPixelRatio());
  }

  initComponents() {
    this.ui = new UIManager(this);
    this.ui.setLoadingProgress(15);

    // Daily Quest & Achievement System
    this.questUI = new QuestAchievementUI(this);
    this.ui.setLoadingProgress(18);

    // Mission Panel — adventure map quest display
    this.missionPanel = new MissionPanel();
    this.missionPanel.onAllComplete = (mapName) => {
      this.sound.playQuestComplete();
      this.coins += 25;
      if (this.questUI) this.questUI.onMapCompleted();
      this.ui.updateStats(this.coins, this.cropsHarvested, this.pestsDefeated, this.shop ? this.shop.diamonds : 0);
      this.ui.showToast(`🏆 ${mapName} 全部任務完成！+25🪙`);
    };

    // Sound System
    this.sound = new SoundSystem();
    this.ui.setLoadingProgress(30);

    // Shop System
    this.shop = new ShopSystem(this);
    this.ui.setLoadingProgress(45);

    // Farm World
    this.farm = new FarmEnvironment(this.scene);
    this.ui.setLoadingProgress(60);

    const getTerrainHeight = (x, z) => this.farm.physics.surfaceAt(x, z)?.height ?? this.farm.getTerrainHeight(x, z);
    const resolveCollision = (pos, radius) => this.farm.resolveCollision(pos, radius);
    this.secretFishingSpot = new SecretFishingSpot(this.scene, getTerrainHeight);
    this.mapManager = new MapManager(this.scene, getTerrainHeight);
    this.mapManager.onEnterMap = (mapName, missions, status, hints) => {
      this.missionPanel.show(mapName, missions, status, hints);
      // Flash a welcome toast summarising key controls
      const totalGems = missions.find(m => m.id === 'gems')?.text || '';
      this.ui.showToast(`🗺️ ${mapName} — 收集寶藏 · 完成任務 · 按 [M] 查看提示`);
    };
    this.mapManager.onLeaveMap = () => {
      this.missionPanel.hide();
    };
    this.mapManager.onCollect = (pos, collected, total) => {
      this.sound.playHarvest();
      this.ui.showToast(`💎 ${collected}/${total} treasures found!`);
    };
    this.mapManager.onProximityHint = () => this.sound.playSelect();

    // Determine active character (default to Cozy low-poly kitty)
    let initialCharId = 'cozy';
    try {
      const saved = localStorage.getItem('my_farm_kitty');
      if (saved && CAT_CHARACTERS[saved]) {
        initialCharId = saved;
      }
    } catch (e) {}

    this.currentCharacterId = initialCharId;

    // 3D Cartoon Cat Character
    this.cat = new CatCharacter(this.scene, initialCharId);
    normalizeAsset(this.cat.mesh, 'player');
    this.ui.setLoadingProgress(70);

    // Weapon & Projectiles
    this.weapon = new PeashooterWeapon(this.scene);

    // Crops System
    this.cropSystem = new CropSystem(this.scene, this.farm.gardenPlots, this.farm.physics);

    // Livestock System (Cow, Chicken, Sheep, Pig)
    this.livestock = new LivestockSystem(this.scene, getTerrainHeight);

    // Playable Items (Yarn Fur Balls, Catnip, Treats)
    this.playableItems = new PlayableItemsSystem(this.scene, this.sound, getTerrainHeight, this.farm.physics);

    // Kitty Home Construction Site
    this.kittyHome = new KittyHomeSystem(this.scene, this.sound, getTerrainHeight, this.farm.physics);
    this.placementPointer = new THREE.Vector2();
    this.renderer.domElement.addEventListener('pointermove', event => {
      const bounds = this.renderer.domElement.getBoundingClientRect();
      this.placementPointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    });
    window.addEventListener('keydown', event => {
      const target = event.target;
      const isEditing = target instanceof Element
        && target.closest('input, textarea, [contenteditable="true"]');
      if (event.repeat || isEditing) return;
      if (event.code === 'KeyB') this.kittyHome.setPlacementMode(!this.kittyHome.placementActive);
      if (event.code === 'Escape') this.kittyHome.setPlacementMode(false);
      if (event.code === 'KeyM') {
        event.preventDefault();
        if (this.mapManager.isInAdventureMap()) {
          this.missionPanel.toggle();
        } else {
          this.mapSystem?.toggleFullMap();
        }
      }
    }, true);

    // Pests (respects terrain elevation & flying sky birds)
    this.pestSystem = new PestSystem(this.scene, getTerrainHeight);

    // Raycaster for optical target focus and crosshair lock-on
    this.raycaster = new THREE.Raycaster();
    this.crosshairEl = document.getElementById('crosshair-container');

    // Controller
    this.controller = new PlayerController(
      this.cat,
      this.camera,
      this.renderer.domElement,
      this.sound,
      getTerrainHeight,
      resolveCollision,
      this.farm.terrainMesh
    );

    this.playerPhysics = new PlayerPhysicsSystem({
      controller: this.controller,
      terrainMesh: this.farm.terrainMesh,
      collidableObjects: this.farm.collidableObjects,
      getTerrainHeight,
      resolveCollision,
      worldPhysics: this.farm.physics,
    });
    // Wire adventure map obstacle colliders into physics
    this.playerPhysics.getAdventureColliders = () => this.mapManager.getActiveMap()?.getObstacleColliders() || [];
    this.catEffects = new CatLifeParticles(this.scene);

    // Map System (Minimap HUD & Full World Map with Path Navigation)
    this.mapSystem = new MapSystem(this);

    // Character Selection Page & 3D Turntable Manager
    this.charSelect = new CharacterSelectManager(this);

    // Connect action requests
    this.controller.onActionRequest = () => this.triggerAction();
    this.controller.onGatherRequest = () => this.triggerGather();

    // Apply active character stats & update HUD
    this.applyCharacterTraits(initialCharId);
    this.ui.updateCharacterHUD(initialCharId);

    // Quest Progression State
    this.questStage = 0;
    this.stageProgress = 0;
    this.ui.updateQuest('Harvest 3 ripe crops or plant seeds with [E]! (0/3)');
    this.ui.updateStats(this.coins, this.cropsHarvested, this.pestsDefeated, this.shop.diamonds);
    this.ui.updateSeedHotbar();

    this.ui.setLoadingProgress(100);
    this.setupTimezoneBackground();

    // Display the Kitty Selection Page on start of game so player can choose kitty!
    setTimeout(() => {
      this.charSelect.open(false);
    }, 450);
  }

  setupTimezoneBackground() {
    const now = new Date();
    const hour = now.getHours();
    let preset = 'day';
    let timeLabel = 'Daylight';

    if (hour >= 5 && hour < 8) {
      preset = 'dawn';
      timeLabel = 'Dawn Sunrise 🌅';
    } else if (hour >= 8 && hour < 17) {
      preset = 'day';    // Day / Noon
      timeLabel = 'Cozy Noon ☀️';
    } else if (hour >= 17 && hour < 20) {
      preset = 'sunset'; // Sunset / Dusk
      timeLabel = 'Golden Sunset 🌅';
    } else {
      preset = 'night';  // Night
      timeLabel = 'Starry Night 🌙';
    }

    if (this.farm) {
      this.farm.setLightingPreset(preset);
    }

    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.ui.showToast(`🕒 Timezone Synced: ${timeString} (${timeLabel})`);
  }

  advanceQuest() {
    this.sound.playQuestComplete();
    const bonusCoins = 50;
    this.coins += bonusCoins;
    this.questStage++;
    this.stageProgress = 0;
    this.ui.updateStats(this.coins, this.cropsHarvested, this.pestsDefeated, this.shop ? this.shop.diamonds : 0);

    if (this.questStage === 1) {
      this.ui.showToast(`🎉 Quest Complete! +${bonusCoins}🪙 Bonus!`);
      setTimeout(() => {
        this.pestSystem.spawnInvasion(this.farm.gardenPlots);
        this.ui.showToast('🚨 Alert: Pests spotted near the garden beds! Defend them with [Left-Click / F]!');
        this.ui.updateQuest('Defend crops! Shoot 3 pesky crows & moles with [Left-Click / F]! (0/3)');
      }, 800);
    } else if (this.questStage === 2) {
      this.ui.showToast(`🎉 Crops Defended! +${bonusCoins}🪙 Bonus!`);
      this.ui.updateQuest('Bountiful Farm: Harvest 5 more delicious crops! (0/5)');
    } else if (this.questStage === 3) {
      this.ui.showToast(`🎉 Barn Stocked! +${bonusCoins}🪙 Bonus!`);
      setTimeout(() => {
        this.pestSystem.spawnInvasion(this.farm.gardenPlots);
        this.ui.showToast('🚨 Large pest wave approaching! Defend the farm!');
        this.ui.updateQuest('Critter Patrol: Scare away 5 invading pests! (0/5)');
      }, 800);
    } else if (this.questStage === 4) {
      this.ui.showToast(`🎉 Farm Hero! +${bonusCoins}🪙 Bonus!`);
      this.ui.updateQuest(`Farm Tycoon: Amass 300 gold coins! (${this.coins}/300)`);
    } else {
      this.ui.showToast('🏆 Master Farmer Achievement Unlocked! +100🪙!');
      this.coins += 100;
      this.ui.updateStats(this.coins, this.cropsHarvested, this.pestsDefeated, this.shop ? this.shop.diamonds : 0);
      this.ui.updateQuest('🏆 Master Farmer Cat! Enjoy free-roaming and managing your cozy farm!');
    }
  }

  selectCharacter(characterId) {
    if (!CAT_CHARACTERS[characterId]) return;

    const prevPosition = this.controller ? this.controller.position.clone() : new THREE.Vector3(0, 0, 0);
    const prevRotation = this.controller ? this.controller.rotationAngle : 0;
    const prevJumpOffset = this.controller ? this.controller.jumpOffset : 0;
    const prevMood = this.cat ? this.cat.mood : 100;

    if (this.cat) {
      this.cat.dispose();
    }

    this.currentCharacterId = characterId;
    this.cat = new CatCharacter(this.scene, characterId);
    normalizeAsset(this.cat.mesh, 'player');
    this.cat.mood = prevMood;

    if (this.controller) {
      this.controller.setCat(this.cat);
      this.controller.position.copy(prevPosition);
      this.controller.rotationAngle = prevRotation;
      this.controller.jumpOffset = prevJumpOffset;
      this.catEffects.reset(prevPosition);
    }

    this.controller.onActionRequest = () => this.triggerAction();
    this.controller.onGatherRequest = () => this.triggerGather();

    this.applyCharacterTraits(characterId);

    if (this.ui) {
      this.ui.updateCharacterHUD(characterId);
    }
  }

  applyCharacterTraits(characterId) {
    const char = CAT_CHARACTERS[characterId];
    if (!char) return;

    if (this.controller) {
      // Sunny has +15% speed (Image 1); Mochi is more relaxed (Image 2)
      this.controller.speed = 5.6 * (char.bonuses.speedMult || 1.0);
    }
    if (this.cat) {
      this.cat.moodDecayInterval = (char.bonuses.moodDecayMult < 1.0) ? (3.5 / char.bonuses.moodDecayMult) : 3.5;
    }
  }

  resetGame() {
    this.coins = 50;
    this.cropsHarvested = 0;
    this.pestsDefeated = 0;
    this.questStage = 0;
    this.stageProgress = 0;
    if (this.shop) this.shop.diamonds = 5;
    if (this.cat) this.cat.mood = 100;

    // Reset player position
    const initialGroundY = this.farm.getTerrainHeight(0, 0);
    this.controller.position.set(0, initialGroundY, 0);
    this.controller.jumpOffset = 0;
    this.controller.verticalVelocity = 0;
    this.controller.isGrounded = true;

    // Reset crops
    this.cropSystem.crops.forEach(crop => {
      crop.stage = 'ripe';
      crop.scale = 1.0;
      crop.mesh.scale.set(1, 1, 1);
    });

    // Reset UI
    this.ui.updateStats(this.coins, 0, 0, this.shop ? this.shop.diamonds : 5);
    this.ui.updateQuest('Harvest 3 ripe crops or plant seeds with [E]! (0/3)');
    this.ui.showToast('🌱 New Farm Adventure Started!');
  }

  triggerAction() {
    if (this.kittyHome.placementActive) {
      this.confirmHomePlacement();
      return;
    }
    this.cat.triggerAction((muzzlePos, muzzleDir) => {
      // Cast optical ray from center of screen (crosshair focus point)
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      const pestHit = this.pestSystem.raycastPest(this.raycaster);

      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      let aimTarget = null;

      if (pestHit) {
        // Direct lock onto the targeted pest
        aimTarget = pestHit.point;
      } else {
        // Raycast against terrain ground for instant, lag-free targeting
        if (this.farm && this.farm.terrainMesh) {
          const intersects = this.raycaster.intersectObject(this.farm.terrainMesh, false);
          if (intersects.length > 0) {
            aimTarget = intersects[0].point;
          }
        }
        if (!aimTarget) {
          aimTarget = this.camera.position.clone().addScaledVector(camDir, 60.0);
        }
      }

      this.weapon.fire(muzzlePos, camDir, aimTarget, this.sound);

      // Sunny's signature cheerful singing meow on action
      if (this.currentCharacterId === 'sunny' && this.sound) {
        this.sound.playMeow(1.3);
      }
    });
  }

  triggerGather() {
    if (this.kittyHome.placementActive) {
      this.confirmHomePlacement();
      return;
    }
    if (this.cat.currentActionName === 'Action' || this.cat.currentActionName === 'Gather') return;

    if (this.secretFishingSpot.isNearFarmPortal(this.controller.position)) {
      this.travelToFishingSpot();
      return;
    }
    if (this.secretFishingSpot.isNearReturnPortal(this.controller.position)) {
      this.returnToFarm();
      return;
    }

    // Adventure Map Portals
    const nearPortal = this.mapManager.isNearFarmPortal(this.controller.position);
    if (nearPortal) {
      this.beginAdventureTravel(nearPortal);
      return;
    }
    if (this.mapManager.isNearReturnPortal(this.controller.position)) {
      this.returnFromAdventureMap();
      return;
    }

    // 1. Check Harvestable Ripe Crop
    const nearestCrop = this.cropSystem.getNearestHarvestableCrop(this.controller.position);
    if (nearestCrop) {
      this.cat.triggerGather(() => {
        const reward = this.cropSystem.harvestCrop(nearestCrop, this.cat.mesh);
        if (reward) {
          let gainedCoins = reward.coins;
          let gainedDiamonds = reward.diamonds || 0;

          // Snowball's Lucky Whiskers trait (+25% bonus coins & 25% chance of extra diamond)
          if (this.currentCharacterId === 'snowball') {
            gainedCoins = Math.round(gainedCoins * 1.25);
            if (Math.random() < 0.25) {
              gainedDiamonds += 1;
            }
          }

          this.coins += gainedCoins;
          this.cropsHarvested++;
          if (gainedDiamonds) this.shop.diamonds += gainedDiamonds;

          this.sound.playHarvest();
          if (this.questUI) this.questUI.onCropHarvested();
          if (this.questUI) this.questUI.onCoinsChanged(this.coins);
          this.ui.updateStats(this.coins, this.cropsHarvested, this.pestsDefeated, this.shop.diamonds);

          const bonusLabel = (this.currentCharacterId === 'snowball') ? ' (✨ Lucky Whiskers!)' : '';
          this.ui.showToast(`+${gainedCoins}🪙 Harvested ${reward.name}!${bonusLabel}`);

          if (this.questStage === 0) {
            this.stageProgress++;
            if (this.stageProgress >= 3) {
              this.advanceQuest();
            } else {
              this.ui.updateQuest(`Harvest 3 ripe crops with [E]! (${this.stageProgress}/3)`);
            }
          }
        }
      });
      return;
    }

    // 2. Check Empty Plot to Plant Seed
    const nearestEmptyPlot = this.cropSystem.getNearestEmptyPlot(this.controller.position);
    if (nearestEmptyPlot) {
      const activeSeed = this.shop.activeSeed;
      if (this.shop.seeds[activeSeed] > 0) {
        this.cat.triggerGather(() => {
          if (!this.cropSystem.plantSeed(nearestEmptyPlot, activeSeed)) return;
          this.shop.seeds[activeSeed]--;
          this.sound.playPop();
          if (this.questUI) this.questUI.onSeedPlanted(activeSeed);
          this.ui.updateSeedHotbar();
          this.ui.showToast(`🌱 Planted 1x ${activeSeed.toUpperCase()} seed!`);
        });
      } else {
        this.ui.showToast(`❌ Out of ${activeSeed.toUpperCase()} seeds! Buy more from the 🛒 Cute Shop!`);
      }
      return;
    }

    // 3. Check Near Kitty Home Construction Site
    const distToHome = this.kittyHome.getDistanceToPlayer(this.controller.position);
    if (distToHome < 4.5) {
      if (this.ui) {
        this.ui.openHouseGuideModal();
      }
      return;
    }

    // 4. Check Near 3D Shop Stall
    if (this.farm && this.farm.shopStallPos) {
      const distToShop = this.controller.position.distanceTo(this.farm.shopStallPos);
      if (distToShop < 4.5) {
        if (this.ui && this.ui.shopModal) {
          this.ui.shopModal.classList.remove('hidden');
          this.sound.playPop();
          this.ui.showToast('🛒 Welcome to Kitty\'s Cute Farm Shop!');
        }
        return;
      }
    }

    this.ui.showToast('🌱 Stand closer to a crop, shop, kitty home, or magical portal!');
  }

  teleportPlayer(position, groundY = null) {
    const pivotOffset = this.cat.mesh.userData.playerPivotOffset || 0;
    if (groundY !== null) {
      // Adventure map teleport: use explicit flat ground
      this.controller.position.copy(position);
      this.controller.position.y = groundY + pivotOffset;
      this.controller.adventureGroundY = groundY;
    } else {
      const surface = this.farm.physics.surfaceAt(position.x, position.z);
      this.controller.position.copy(position);
      this.controller.position.y = (surface?.height ?? this.farm.getTerrainHeight(position.x, position.z)) + pivotOffset;
      this.controller.adventureGroundY = null;
    }
    this.controller.jumpOffset = 0;
    this.controller.verticalVelocity = 0;
    this.controller.isGrounded = true;
    this.cat.mesh.position.copy(this.controller.position);
  }

  travelToFishingSpot() {
    this.teleportPlayer(this.secretFishingSpot.getFishingArrival());
    this.mapSystem?.setDestination('secretPond');
    this.ui.showToast('✨ The forest portal carries you to the Secret Fishing Spot. Press [E] by a portal to return.');
  }

  returnToFarm() {
    // Return from Secret Fishing Spot
    if (this.isAtSecretFishingSpot()) {
      this.teleportPlayer(this.secretFishingSpot.getFarmArrival());
      this.mapSystem?.setDestination('shop');
      this.ui.showToast('✨ You return to the cozy farm.');
      return;
    }
    // Return from adventure map
    const arrival = this.mapManager.returnToFarm();
    if (arrival) {
      this.teleportPlayer(arrival);
      this.mapSystem?.setDestination('shop');
      this.ui.showToast('✨ The portal brings you back to the farm!');
    }
  }

  travelToAdventureMap(mapId) {
    const cfg = this.mapManager.getPortalConfig(mapId);
    if (!cfg) return;
    const arrival = this.mapManager.travelToMap(mapId);
    if (arrival) {
      const groundY = this.mapManager.getActiveGroundY();
      this.teleportPlayer(arrival, groundY);
      this.mapSystem?.setDestination(mapId);
      this.ui.showToast(`✨ ${cfg.name} — ${cfg.subtitle}! Press [E] by the return portal to come back.`);
    }
  }

  beginAdventureTravel(mapId) {
    const cfg = this.mapManager.getPortalConfig(mapId);
    if (!cfg || !this.mapManager.beginFarmPortalTravel(mapId)) return;
    this.ui.showToast(`✨ ${cfg.name} 的傳送門正在蓄能…`);
  }

  returnFromAdventureMap() {
    this.returnToFarm();
  }

  isAtSecretFishingSpot() {
    return this.controller.position.distanceToSquared(this.secretFishingSpot.spotPosition) < 260;
  }

  confirmHomePlacement() {
    this.controller.isMouseDownLeft = false;
    this.kittyHome.updatePlacement(this.camera, document.pointerLockElement ? new THREE.Vector2() : this.placementPointer);
    if (!this.kittyHome.confirmPlacement()) this.ui.showToast(this.kittyHome.placementReason || 'Invalid building site');
  }

  setupWindowResize() {
    window.addEventListener('resize', () => {
      window.scrollTo(0, 0);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.postProcessing.resize(window.innerWidth, window.innerHeight, this.renderer.getPixelRatio());
    });
    window.scrollTo(0, 0);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Update Cat Animations & Mood
    if (this.ui) this.ui.updateMood(this.cat.mood);

    // Update Playable Items (Yarn Fur Balls, Catnip, Treats)
    if (this.playableItems) {
      this.playableItems.update(delta, this.controller.position, (item) => {
        this.cat.boostMood(item.moodBoost);
        this.ui.showToast(`🐱 Played with ${item.name}! Mood +${item.moodBoost}%!`);
      });
    }

    // Update Kitty Home Site & Construction Animations
    if (this.kittyHome) {
      this.kittyHome.update(delta, this.controller.position);
    }

    // Update Farm Ambient Animations
    this.farm.update(delta, this.controller.position, this.camera);
    this.postProcessing.updateLighting(this.farm.lightingPreset, delta);
    this.secretFishingSpot.update(delta);
    const completedPortalTravel = this.mapManager.update(delta, this.controller.position);
    if (completedPortalTravel) {
      this.travelToAdventureMap(completedPortalTravel);
    }
    const portalVisualState = this.mapManager.getPortalVisualState();
    this.postProcessing.setPortalGodRays(portalVisualState.position, portalVisualState.intensity);

    this.farm.physics.update();
    this.playerPhysics.updatePlayerPhysics(delta);
    const catPosition = this.controller.position;
    const catSurface = !this.mapManager.isInAdventureMap()
      ? this.farm.physics.surfaceAt(catPosition.x, catPosition.z)
      : null;
    const catMoving = this.catEffects.update(delta, {
      position: catPosition,
      grounded: this.controller.isGrounded,
      sprinting: this.controller.keys.sprint,
      surface: catSurface,
      night: this.farm.lightingPreset === 'night',
      visible: this.controller.viewMode === 'tps',
    });
    this.cat.update(delta, {
      moving: catMoving,
      grounded: this.controller.isGrounded,
      sprinting: this.controller.keys.sprint,
      aiming: this.controller.isShootingMode,
    });

    // Adventure map interactions (collectibles, puzzles, all game-specific)
    if (this.mapManager.isInAdventureMap()) {
      const result = this.mapManager.checkMapInteractions(this.controller.position);
      if (result && result.data) {
        const d = result.data;

        // Mission progress update
        if (d.missions && this.missionPanel) {
          for (const [id, done] of Object.entries(d.missions)) {
            if (done) this.missionPanel.completeMission(id);
          }
        }

        // Ancient Ruins: quicksand slowdown
        if (d.slowdown !== undefined && d.slowdown < 1.0) {
          this.controller._qsSlow = d.slowdown;
        } else {
          this.controller._qsSlow = 1.0;
        }

        // Ancient Ruins: golem knockback
        if (d.golem && d.golem.knockback) {
          this.controller.position.add(d.golem.knockback);
          this.controller.jumpOffset = Math.max(this.controller.jumpOffset, 2);
        }

        // Ancient Ruins: scorpion hit
        if (d.scorpionHit) {
          this.cat.boostMood(-10);
          this.ui.showToast('🦂 Ouch! A scorpion stung you!');
        }

        // Harvest Maze: pumpkin king
        if (d.king) {
          if (d.king.defeated) {
            this.ui.showToast('🎃💥 Pumpkin King defeated! +Loot!');
          } else if (d.king.hit) {
            this.ui.showToast(`🎃 Pumpkin King hit! ${d.king.hp} HP remaining!`);
          } else if (d.king.playerHit) {
            this.controller.jumpOffset = Math.max(this.controller.jumpOffset, 1.5);
          }
        }

        // Enchanted Forest: bounce mushroom
        if (d.bounceMushroom) {
          this.controller.verticalVelocity = Math.max(this.controller.verticalVelocity || 0, d.bounceMushroom.power);
          this.controller.isGrounded = false;
        }

        // Enchanted Forest: treehole teleport
        if (d.treehole && d.treehole.teleportTo) {
          const tp = d.treehole.teleportTo;
          const abs = tp.clone().add(this.mapManager.getActiveMap().group.position);
          this.controller.position.x = abs.x;
          this.controller.position.z = abs.z;
          this.controller.position.y = 0.5;
        }

        // Snowy Mountain: avalanche hit
        if (d.avalancheHit) {
          this.controller.jumpOffset = Math.max(this.controller.jumpOffset, 1.5);
          this.ui.showToast('❄️ Avalanche! Take cover behind ice crystals!');
        }

        // Mystic Lake: boat boarding
        if (d.boatBoard) {
          this.ui.showToast('🚣 You board the rowboat! Sail the lake!');
        }

        // Mystic Lake: fishing
        if (d.fishing && d.fishing.started) {
          this.ui.showToast('🎣 Casting line... Wait for a bite!');
        }
        if (d.fishCaught) {
          this.fishCaught = (this.fishCaught || 0) + 1;
          this.coins += 10;
          if (this.questUI) this.questUI.onFishCaught();
          if (this.questUI) this.questUI.onCoinsChanged(this.coins);
          this.ui.showToast(`🐟 Fish caught! +10🪙 (${this.fishCaught || 0} total)`);
        }
      }
    } else {
      this.controller._qsSlow = 1.0;
    }

    this.kittyHome.updatePlacement(this.camera, document.pointerLockElement ? new THREE.Vector2() : this.placementPointer);

    // Render after movement so the map arrow uses the cat's actual world-facing direction.
    if (this.mapSystem) {
      const facingAngle = this.cat ? this.cat.mesh.rotation.y : 0;
      this.mapSystem.update(delta, this.controller.position, facingAngle);
    }

    // Update Livestock Animations & AI
    if (this.livestock) {
      this.livestock.update(delta);
    }

    // Update Crops
    this.cropSystem.update(delta);

    // Update Peashooter Projectiles & Hit Check
    this.weapon.update(delta, (bulletPos, radius) => {
      const hit = this.pestSystem.checkHit(bulletPos, radius);
      if (hit) {
        this.sound.playSplat();
        this.pestsDefeated++;
        this.coins += hit.points;
        if (this.questUI) this.questUI.onPestDefeated();
        if (this.questUI) this.questUI.onCoinsChanged(this.coins);
        this.ui.updateStats(this.coins, this.cropsHarvested, this.pestsDefeated, this.shop.diamonds);
        this.ui.showToast(`🎯 +${hit.points}🪙 Scared away ${hit.type}!`);

        // Check active defense quests
        if (this.questStage === 1) {
          this.stageProgress++;
          if (this.stageProgress >= 3) {
            this.advanceQuest();
          } else {
            this.ui.updateQuest(`Defend crops! Shoot 3 pesky crows & moles with [Left-Click / F]! (${this.stageProgress}/3)`);
          }
        } else if (this.questStage === 3) {
          this.stageProgress++;
          if (this.stageProgress >= 5) {
            this.advanceQuest();
          } else {
            this.ui.updateQuest(`Critter Patrol: Scare away 5 invading pests! (${this.stageProgress}/5)`);
          }
        } else if (this.questStage === 4) {
          if (this.coins >= 300) {
            this.advanceQuest();
          } else {
            this.ui.updateQuest(`Farm Tycoon: Amass 300 gold coins! (${this.coins}/300)`);
          }
        }

        return true;
      }

      // Check obstacle hit (fences, barn, trees)
      if (this.farm.checkObstacleCollision && this.farm.checkObstacleCollision(bulletPos, radius)) {
        this.sound.playSplat();
        return true;
      }

      return false;
    });

    // Update Pests (Flying Birds in Sky & Moles)
    this.pestSystem.update(delta);

    // Continuous Crosshair Optical Target Detection
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const pestUnderCrosshair = this.pestSystem.raycastPest(this.raycaster);
    if (this.crosshairEl) {
      if (pestUnderCrosshair) {
        this.crosshairEl.classList.add('target-locked');
      } else {
        this.crosshairEl.classList.remove('target-locked');
      }
    }

    // Dynamic Interaction Prompts (Harvest / Plant Seed / Construct Kitty Home / Shop / Portal)
    const nearCrop = this.cropSystem.getNearestHarvestableCrop(this.controller.position);
    const nearEmptyPlot = this.cropSystem.getNearestEmptyPlot(this.controller.position);
    const distToHome = this.kittyHome ? this.kittyHome.getDistanceToPlayer(this.controller.position) : 99;
    const distToShop = (this.farm && this.farm.shopStallPos) ? this.controller.position.distanceTo(this.farm.shopStallPos) : 99;
    const nearPortalId = this.mapManager.isNearFarmPortal(this.controller.position);
    const nearReturnPortal = this.mapManager.isNearReturnPortal(this.controller.position);

    if (nearPortalId) {
      const cfg = this.mapManager.getPortalConfig(nearPortalId);
      this.ui.showInteractionPrompt(`Enter ${cfg.name}`);
    } else if (nearReturnPortal) {
      this.ui.showInteractionPrompt('Return to Farm 🏠');
    } else if (this.mapManager.isInAdventureMap()) {
      // Show collectible progress in adventure maps
      const prog = this.mapManager.getActiveMapProgress();
      if (prog) {
        if (prog.collected >= prog.total) {
          this.ui.showInteractionPrompt('🎉 All treasures found! Return to Farm 🏠');
        } else {
          this.ui.showInteractionPrompt(`💎 Treasures: ${prog.collected}/${prog.total}  ·  Return to Farm 🏠`);
        }
      }
    } else if (nearCrop) {
      this.ui.showInteractionPrompt(`Harvest ${nearCrop.type.toUpperCase()}`);
    } else if (nearEmptyPlot) {
      const activeSeed = this.shop.activeSeed;
      const seedCount = this.shop.seeds[activeSeed] || 0;
      this.ui.showInteractionPrompt(`Plant ${activeSeed.toUpperCase()} Seed (${seedCount} left)`);
    } else if (distToShop < 4.5) {
      this.ui.showInteractionPrompt('Open Cute Shop 🛒');
    } else if (distToHome < 4.5) {
      const reqs = this.kittyHome.getStageRequirements();
      if (reqs) {
        this.ui.showInteractionPrompt(`Build Kitty Home: ${reqs.title}`);
      } else {
        this.ui.showInteractionPrompt('🏰 Kitty Castle Complete!');
      }
    } else {
      this.ui.hideInteractionPrompt();
    }

    // Render Scene
    updateWaterSurfaces(this.scene, this.camera, delta);
    this.postProcessing.render(delta, this.controller);
  }
}

// Start game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new FarmGame();
});
