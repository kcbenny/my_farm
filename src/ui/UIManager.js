import { GLTFExportManager } from '../gameplay/GLTFExportManager.js';
import { CAT_CHARACTERS } from '../character/CatCharactersConfig.js';

export class UIManager {
  constructor(game) {
    this.game = game;

    this.coinsEl = document.getElementById('coins-count');
    this.diamondsEl = document.getElementById('diamonds-count');
    this.cropsEl = document.getElementById('crops-count');
    this.pestsEl = document.getElementById('pests-count');

    this.moodBarFill = document.getElementById('mood-bar-fill');
    this.moodValEl = document.getElementById('mood-val');
    this.moodEmojiEl = document.getElementById('mood-emoji');

    this.questTextEl = document.getElementById('quest-text');
    this.promptEl = document.getElementById('interaction-prompt');
    this.promptTextEl = document.getElementById('prompt-text');
    this.toastContainer = document.getElementById('toast-container');
    this.inspectorPanel = document.getElementById('inspector-panel');
    this.helpModal = document.getElementById('help-modal');
    this.shopModal = document.getElementById('cute-shop-modal');
    this.houseGuideModal = document.getElementById('house-guide-modal');
    this.collapsibleMenu = document.getElementById('collapsible-top-menu');
    this.progressBar = document.getElementById('progress-bar');
    this.loadingScreen = document.getElementById('loading-screen');

    // Kitty Switcher Controls
    this.switchKittyBtn = document.getElementById('btn-switch-kitty');
    this.menuSwitchKittyBtn = document.getElementById('btn-menu-switch-kitty');
    this.hudKittyAvatar = document.getElementById('hud-kitty-avatar');
    this.hudKittyName = document.getElementById('hud-kitty-name');

    // Main Menu & Exit Modal Elements
    this.mainMenu = document.getElementById('main-menu');
    this.exitModal = document.getElementById('exit-confirm-modal');
    this.menuCoinsEl = document.getElementById('menu-coins');
    this.menuCropsEl = document.getElementById('menu-crops');
    this.menuPestsEl = document.getElementById('menu-pests');

    this.setupEventListeners();
    this.setupMenuEventListeners();
    this.setupShopEventListeners();
    this.setupHouseGuideEventListeners();
  }

  setLoadingProgress(percent) {
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }
    if (percent >= 100) {
      setTimeout(() => {
        if (this.loadingScreen) {
          this.loadingScreen.classList.add('fade-out');
        }
      }, 300);
    }
  }

  setupEventListeners() {
    // 1. Audio Toggle
    const audioBtn = document.getElementById('btn-audio-toggle');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const isPlaying = this.game.sound.toggleMute();
        audioBtn.querySelector('.btn-icon').textContent = isPlaying ? '🔊' : '🔇';
        this.showToast(isPlaying ? 'Audio & Music enabled' : 'Muted');
      });
    }

    // 2. Inspector Panel Toggle
    const inspectBtn = document.getElementById('btn-inspect-mode');
    const closeInspectBtn = document.getElementById('btn-close-inspector');
    if (inspectBtn) {
      inspectBtn.addEventListener('click', () => {
        this.inspectorPanel.classList.toggle('hidden');
      });
    }
    if (closeInspectBtn) {
      closeInspectBtn.addEventListener('click', () => {
        this.inspectorPanel.classList.add('hidden');
      });
    }

    // 3. Help Modal Toggle
    const helpBtn = document.getElementById('btn-help-toggle');
    const closeHelpBtn = document.getElementById('btn-close-help');
    const startPlayBtn = document.getElementById('btn-start-playing');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        this.helpModal.classList.remove('hidden');
      });
    }
    if (closeHelpBtn) {
      closeHelpBtn.addEventListener('click', () => {
        this.helpModal.classList.add('hidden');
      });
    }
    if (startPlayBtn) {
      startPlayBtn.addEventListener('click', () => {
        this.helpModal.classList.add('hidden');
        this.game.sound.startMusic();
      });
    }

    // 4. Animation Clip Buttons
    const animButtons = document.querySelectorAll('.anim-btn');
    animButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        animButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const animName = btn.dataset.anim;

        if (animName === 'Action') {
          this.game.triggerAction();
        } else if (animName === 'Gather') {
          this.game.triggerGather();
        } else {
          this.game.cat.playAnimation(animName, 0.2);
        }
        this.showToast(`Playing Animation: ${animName}`);
      });
    });

    // 5. Accessories Toggles
    const toggleHelmet = document.getElementById('toggle-helmet');
    if (toggleHelmet) {
      toggleHelmet.addEventListener('change', (e) => {
        this.game.cat.setAccessoryVisibility('helmet', e.target.checked);
      });
    }

    const toggleBandana = document.getElementById('toggle-bandana');
    if (toggleBandana) {
      toggleBandana.addEventListener('change', (e) => {
        this.game.cat.setAccessoryVisibility('bandana', e.target.checked);
      });
    }

    const togglePeashooter = document.getElementById('toggle-peashooter');
    if (togglePeashooter) {
      togglePeashooter.addEventListener('change', (e) => {
        this.game.cat.setAccessoryVisibility('gunRoot', e.target.checked);
      });
    }

    // 6. Lighting TOD Presets
    const todButtons = document.querySelectorAll('.chip[data-tod]');
    todButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        todButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = btn.dataset.tod;
        this.game.farm.setLightingPreset(preset);
        this.showToast(`Environment Preset: ${btn.textContent}`);
      });
    });

    // 7. GLB Export Buttons
    const topExportBtn = document.getElementById('btn-export-glb');
    const charExportBtn = document.getElementById('btn-export-character-glb');
    const sceneExportBtn = document.getElementById('btn-export-scene-glb');

    const handleCharExport = async () => {
      this.showToast('Generating Character .GLB with 4 Animation Clips...');
      try {
        await GLTFExportManager.exportCharacter(this.game.cat, 'chubby_ginger_tabby_cat.glb');
        this.showToast('✓ Character .GLB successfully exported!');
      } catch (err) {
        this.showToast('Export failed. Check console.');
      }
    };

    const handleSceneExport = async () => {
      this.showToast('Generating Full Farm Scene .GLB...');
      try {
        await GLTFExportManager.exportScene(this.game.scene, 'cozy_farm_scene.glb');
        this.showToast('✓ Scene .GLB successfully exported!');
      } catch (err) {
        this.showToast('Scene export failed.');
      }
    };

    if (topExportBtn) topExportBtn.addEventListener('click', () => this.inspectorPanel.classList.remove('hidden'));
    if (charExportBtn) charExportBtn.addEventListener('click', handleCharExport);
    if (sceneExportBtn) sceneExportBtn.addEventListener('click', handleSceneExport);

    // 8. Mobile Action Buttons
    const mobileShoot = document.getElementById('mobile-btn-shoot');
    const mobileGather = document.getElementById('mobile-btn-gather');
    const mobileJump = document.getElementById('mobile-btn-jump');

    if (mobileShoot) {
      mobileShoot.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.game.triggerAction();
      });
    }
    if (mobileGather) {
      mobileGather.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.game.triggerGather();
      });
    }
    if (mobileJump) {
      mobileJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.game.controller.triggerJump();
      });
    }

    // 9. Toggle Menu Dropdown
    const toggleMenuBtn = document.getElementById('btn-toggle-menu');
    if (toggleMenuBtn && this.collapsibleMenu) {
      toggleMenuBtn.addEventListener('click', () => {
        this.collapsibleMenu.classList.toggle('hidden');
      });
    }

    // 10. Switch Kitty Buttons
    if (this.switchKittyBtn) {
      this.switchKittyBtn.addEventListener('click', () => {
        if (this.game.charSelect) {
          this.game.charSelect.open(true);
        }
      });
    }

    if (this.menuSwitchKittyBtn) {
      this.menuSwitchKittyBtn.addEventListener('click', () => {
        if (this.collapsibleMenu) this.collapsibleMenu.classList.add('hidden');
        if (this.game.charSelect) {
          this.game.charSelect.open(true);
        }
      });
    }
  }

  setupShopEventListeners() {
    const openShopBtn = document.getElementById('btn-open-shop');
    const closeShopBtn = document.getElementById('btn-close-shop');

    if (openShopBtn && this.shopModal) {
      openShopBtn.addEventListener('click', () => {
        this.shopModal.classList.remove('hidden');
      });
    }

    if (closeShopBtn && this.shopModal) {
      closeShopBtn.addEventListener('click', () => {
        this.shopModal.classList.add('hidden');
      });
    }

    // Shop Tabs
    const tabs = document.querySelectorAll('.shop-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const targetTab = tab.dataset.tab;
        document.querySelectorAll('.shop-tab-content').forEach(c => c.classList.add('hidden'));
        const activeContent = document.getElementById(`shop-tab-${targetTab}`);
        if (activeContent) activeContent.classList.remove('hidden');
      });
    });

    // Buy Buttons
    document.querySelectorAll('.buy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.dataset.buy;
        const itemKey = btn.dataset.item;

        if (category === 'seed') {
          this.game.shop.buySeed(itemKey);
        } else if (category === 'toy') {
          this.game.shop.buyToy(itemKey);
        } else if (category === 'material') {
          this.game.shop.buyMaterial(itemKey);
          this.updateMaterialStock();
        } else if (category === 'weapon') {
          this.game.shop.buyWeapon(itemKey);
          this.updateWeaponsUI();
        }
        this.updateSeedHotbar();
      });
    });

    // Exchange Button
    const exchangeBtn = document.getElementById('btn-exchange-diamond');
    if (exchangeBtn) {
      exchangeBtn.addEventListener('click', () => {
        this.game.shop.exchangeDiamonds();
      });
    }

    // Seed Hotbar Chips
    const seedChips = document.querySelectorAll('.seed-chip');
    seedChips.forEach(chip => {
      chip.addEventListener('click', () => {
        seedChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const seedType = chip.dataset.seed;
        this.game.shop.selectActiveSeed(seedType);
        this.showToast(`Active Planting Seed: ${seedType.toUpperCase()}`);
      });
    });

    this.updateMaterialStock();
    this.updateWeaponsUI();
  }

  setupHouseGuideEventListeners() {
    const closeBtn = document.getElementById('btn-close-house-guide');
    if (closeBtn && this.houseGuideModal) {
      closeBtn.addEventListener('click', () => {
        this.houseGuideModal.classList.add('hidden');
      });
    }

    // Style Selector Buttons
    const styleBtns = document.querySelectorAll('.style-btn');
    styleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        styleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const styleKey = btn.dataset.style;
        this.game.kittyHome.setStyle(styleKey);
        this.openHouseGuideModal(); // Refresh modal details
      });
    });

    // Build Now Button
    const buildBtn = document.getElementById('btn-build-now');
    if (buildBtn) {
      buildBtn.addEventListener('click', () => {
        const reqs = this.game.kittyHome.getStageRequirements();
        if (reqs && this.game.shop.canAffordHomeStage(reqs)) {
          this.game.shop.consumeMaterialsForHome(reqs);
          this.game.kittyHome.upgradeStage();
          this.showToast(`🔨 ${reqs.title} Completed!`);
          this.openHouseGuideModal(); // Refresh modal
          this.updateMaterialStock();
        } else {
          this.showToast('❌ Insufficient materials! Buy missing materials in Shop.');
        }
      });
    }

    // Go to Shop Button
    const shopBtn = document.getElementById('btn-go-to-shop');
    if (shopBtn) {
      shopBtn.addEventListener('click', () => {
        if (this.houseGuideModal) this.houseGuideModal.classList.add('hidden');
        if (this.shopModal) {
          this.shopModal.classList.remove('hidden');
          // Switch to materials tab
          document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
          const matTab = document.querySelector('.shop-tab[data-tab="materials"]');
          if (matTab) matTab.classList.add('active');
          document.querySelectorAll('.shop-tab-content').forEach(c => c.classList.add('hidden'));
          const activeContent = document.getElementById('shop-tab-materials');
          if (activeContent) activeContent.classList.remove('hidden');
        }
      });
    }
  }

  openHouseGuideModal() {
    if (!this.game || !this.game.kittyHome || !this.game.shop || !this.houseGuideModal) return;

    const info = this.game.kittyHome.getMissingMaterials(
      this.game.shop.materials || {},
      this.game.coins || 0,
      this.game.shop.diamonds || 0
    );

    if (!info) {
      this.showToast('🏰 Kitty Castle is fully built & glorious!');
      return;
    }

    const titleEl = document.getElementById('house-guide-title');
    const styleNameEl = document.getElementById('house-guide-style-name');
    const phaseTitleEl = document.getElementById('house-phase-title');
    const phaseDescEl = document.getElementById('house-phase-desc');
    const checklistEl = document.getElementById('materials-checklist');
    const bubbleEl = document.getElementById('missing-materials-bubble');
    const bubbleTextEl = document.getElementById('missing-materials-text');

    if (titleEl) titleEl.textContent = 'Kitty Home Construction';
    if (styleNameEl) styleNameEl.textContent = `Architectural Style: ${info.styleName}`;
    if (phaseTitleEl) phaseTitleEl.textContent = info.stageTitle;
    if (phaseDescEl) phaseDescEl.textContent = info.stageDesc;

    // Render Checklist
    if (checklistEl) {
      checklistEl.innerHTML = '';
      const reqs = this.game.kittyHome.getStageRequirements() || {};
      const mats = this.game.shop.materials || {};

      const itemsToDisplay = [
        { name: 'Wood Planks 🪵', owned: mats.wood || 0, needed: reqs.costWood || 0 },
        { name: 'Stone Bricks 🧱', owned: mats.bricks || 0, needed: reqs.costBricks || 0 },
        { name: 'Pink Roof Tiles 🏠', owned: mats.roofTiles || 0, needed: reqs.costRoof || 0 },
        { name: 'Plush Cushions 🛋️', owned: mats.cushions || 0, needed: reqs.costCushions || 0 },
        { name: 'Golden Kitty Stars ⭐', owned: mats.goldenStars || 0, needed: reqs.costGoldenStars || 0 },
        { name: 'Kitty Coins 🪙', owned: this.game.coins || 0, needed: reqs.costCoins || 0 },
        { name: 'Diamonds 💎', owned: this.game.shop.diamonds || 0, needed: reqs.costDiamonds || 0 }
      ];

      itemsToDisplay.forEach(item => {
        if (item.needed > 0) {
          const isOk = item.owned >= item.needed;
          const row = document.createElement('div');
          row.className = `material-item-row ${isOk ? 'complete' : 'missing'}`;
          row.innerHTML = `
            <span>${item.name}</span>
            <span class="material-badge ${isOk ? 'ok' : 'need'}">
              ${item.owned} / ${item.needed} ${isOk ? '✅ Ready!' : `(Need ${item.needed - item.owned} more)`}
            </span>
          `;
          checklistEl.appendChild(row);
        }
      });
    }

    // Bubble Alert for missing items
    if (bubbleEl && bubbleTextEl) {
      if (info.isComplete) {
        bubbleEl.classList.add('hidden');
      } else {
        bubbleEl.classList.remove('hidden');
        const missingNames = info.missingList.map(m => `${m.name} (Need ${m.diff} more)`).join(', ');
        bubbleTextEl.textContent = `Missing building supplies: ${missingNames}. Visit the shop to purchase!`;
      }
    }

    // Active button highlights
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === this.game.kittyHome.currentStyle);
    });

    this.houseGuideModal.classList.remove('hidden');
  }

  setupMenuEventListeners() {
    // 1. Exit Button in Top Bar
    const exitBtn = document.getElementById('btn-exit-menu');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        this.showExitConfirmModal();
      });
    }

    // 2. Confirm Exit Dialog Actions
    const confirmExitBtn = document.getElementById('btn-confirm-exit');
    const cancelExitBtn = document.getElementById('btn-cancel-exit');

    if (confirmExitBtn) {
      confirmExitBtn.addEventListener('click', () => {
        this.hideExitConfirmModal();
        this.showMainMenu();
      });
    }

    if (cancelExitBtn) {
      cancelExitBtn.addEventListener('click', () => {
        this.hideExitConfirmModal();
      });
    }

    // 3. Main Menu Action Buttons
    const menuResumeBtn = document.getElementById('btn-menu-resume');
    const menuRestartBtn = document.getElementById('btn-menu-restart');
    const menuHelpBtn = document.getElementById('btn-menu-help');
    const menuInspectBtn = document.getElementById('btn-menu-inspect');

    if (menuResumeBtn) {
      menuResumeBtn.addEventListener('click', () => {
        this.hideMainMenu();
      });
    }

    const menuChooseCatBtn = document.getElementById('btn-menu-choose-cat');
    if (menuChooseCatBtn) {
      menuChooseCatBtn.addEventListener('click', () => {
        this.hideMainMenu();
        if (this.game.charSelect) {
          this.game.charSelect.open(true);
        }
      });
    }

    if (menuRestartBtn) {
      menuRestartBtn.addEventListener('click', () => {
        this.hideMainMenu();
        this.game.resetGame();
      });
    }

    if (menuHelpBtn) {
      menuHelpBtn.addEventListener('click', () => {
        this.helpModal.classList.remove('hidden');
      });
    }

    if (menuInspectBtn) {
      menuInspectBtn.addEventListener('click', () => {
        this.hideMainMenu();
        this.inspectorPanel.classList.remove('hidden');
      });
    }

    // Press Escape to Open / Close Menu or Exit Modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (!this.exitModal.classList.contains('hidden')) {
          this.hideExitConfirmModal();
        } else if (this.shopModal && !this.shopModal.classList.contains('hidden')) {
          this.shopModal.classList.add('hidden');
        } else if (!this.mainMenu.classList.contains('hidden')) {
          this.hideMainMenu();
        } else if (!this.helpModal.classList.contains('hidden')) {
          this.helpModal.classList.add('hidden');
        } else if (!this.inspectorPanel.classList.contains('hidden')) {
          this.inspectorPanel.classList.add('hidden');
        } else {
          this.showMainMenu();
        }
      }
    });
  }

  showExitConfirmModal() {
    if (this.exitModal) {
      this.exitModal.classList.remove('hidden');
    }
  }

  hideExitConfirmModal() {
    if (this.exitModal) {
      this.exitModal.classList.add('hidden');
    }
  }

  showMainMenu() {
    if (this.mainMenu) {
      if (this.menuCoinsEl) this.menuCoinsEl.textContent = this.game.coins;
      if (this.menuCropsEl) this.menuCropsEl.textContent = this.game.cropsHarvested;
      if (this.menuPestsEl) this.menuPestsEl.textContent = this.game.pestsDefeated;
      this.mainMenu.classList.remove('hidden');
      this.showToast('🏠 Main Menu Opened');
    }
  }

  hideMainMenu() {
    if (this.mainMenu) {
      this.mainMenu.classList.add('hidden');
    }
  }

  updateStats(coins, crops, pests, diamonds) {
    if (this.coinsEl) this.coinsEl.textContent = coins;
    if (this.cropsEl) this.cropsEl.textContent = crops;
    if (this.pestsEl) this.pestsEl.textContent = pests;
    if (this.diamondsEl && diamonds !== undefined) this.diamondsEl.textContent = diamonds;
  }

  updateCharacterHUD(characterId) {
    const char = CAT_CHARACTERS[characterId];
    if (!char) return;

    if (this.hudKittyAvatar) this.hudKittyAvatar.textContent = char.emoji;
    if (this.hudKittyName) this.hudKittyName.textContent = char.name;

    const gameTitleEl = document.querySelector('.game-title');
    if (gameTitleEl) {
      gameTitleEl.textContent = `${char.name}'s Farm`;
    }
  }

  updateMood(mood) {
    const val = Math.round(mood);
    if (this.moodValEl) this.moodValEl.textContent = `${val}%`;
    if (this.moodBarFill) this.moodBarFill.style.width = `${val}%`;

    if (this.moodEmojiEl) {
      if (val >= 80) this.moodEmojiEl.textContent = '😄';
      else if (val >= 45) this.moodEmojiEl.textContent = '🙂';
      else if (val >= 20) this.moodEmojiEl.textContent = '😿';
      else this.moodEmojiEl.textContent = '😾';
    }
  }

  updateSeedHotbar() {
    if (!this.game || !this.game.shop) return;
    const seeds = this.game.shop.seeds;

    for (const [type, count] of Object.entries(seeds)) {
      const el = document.getElementById(`seed-count-${type}`);
      if (el) el.textContent = count;
    }
  }

  updateMaterialStock() {
    if (!this.game || !this.game.shop) return;
    const mats = this.game.shop.materials;
    for (const [key, count] of Object.entries(mats)) {
      const el = document.getElementById(`stock-mat-${key}`);
      if (el) el.textContent = count;
    }
  }

  updateWeaponsUI() {
    if (!this.game || !this.game.shop) return;
    const shop = this.game.shop;

    document.querySelectorAll('.equip-weapon-btn').forEach(btn => {
      const weaponKey = btn.dataset.item;
      const isUnlocked = shop.unlockedWeapons[weaponKey];
      const isEquipped = shop.activeWeapon === weaponKey;

      if (isEquipped) {
        btn.textContent = 'Equipped ✅';
        btn.classList.add('equipped');
        btn.style.background = '#2d6a4f';
      } else if (isUnlocked) {
        btn.textContent = 'Equip';
        btn.classList.remove('equipped');
        btn.style.background = '#52b788';
      } else {
        const item = shop.catalog.weapons[weaponKey];
        if (item.costDiamonds) {
          btn.textContent = `Buy ${item.costCoins}🪙 / ${item.costDiamonds}💎`;
        } else {
          btn.textContent = `Buy ${item.costCoins}🪙`;
        }
        btn.style.background = '#ff8c42';
      }
    });
  }

  updateQuest(text) {
    if (this.questTextEl) {
      this.questTextEl.textContent = text;
    }
  }

  showInteractionPrompt(text) {
    if (this.promptEl) {
      this.promptTextEl.textContent = text;
      this.promptEl.classList.remove('hidden');
    }
  }

  hideInteractionPrompt() {
    if (this.promptEl) {
      this.promptEl.classList.add('hidden');
    }
  }

  showToast(message) {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3200);
  }
}
