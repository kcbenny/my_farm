export class ShopSystem {
  constructor(game) {
    this.game = game;

    // Currencies
    this.diamonds = 5; // Starting bonus diamonds!

    // Seed Inventory
    this.seeds = {
      wheat: 5,        // Start with 5 wheat seeds
      corn: 4,         // Start with 4 corn seeds
      tomato: 4,       // Start with 4 tomato seeds
      carrot: 5,       // Start with 5 carrot seeds
      pumpkin: 2,      // Start with 2 pumpkin seeds
      cabbage: 3,
      sunflower: 1,
      peashooter: 1,
      strawberry: 2
    };

    this.activeSeed = 'wheat'; // Currently selected seed to plant

    // Building Materials Inventory
    this.materials = {
      wood: 8,         // Planks
      bricks: 5,       // Stone bricks
      roofTiles: 0,    // Roof tiles
      cushions: 0,     // Plush cushions
      goldenStars: 0   // Golden Kitty Star
    };

    // Weapons State & Inventory
    this.unlockedWeapons = {
      peashooter: true,
      carrot: false,
      fish: false,
      rainbow: false,
      laser: false
    };
    this.activeWeapon = 'peashooter';

    // Catalog Definitions & Prices
    this.catalog = {
      seeds: {
        wheat: { name: 'Golden Wheat Seed 🌾', costCoins: 4, yieldCoins: 14, yieldKittyCoins: 1, growTime: 4, emoji: '🌾' },
        corn: { name: 'Sweet Corn Seed 🌽', costCoins: 6, yieldCoins: 20, yieldKittyCoins: 1, growTime: 6, emoji: '🌽' },
        tomato: { name: 'Vine Tomato Seed 🍅', costCoins: 8, yieldCoins: 24, yieldDiamonds: 1, growTime: 7, emoji: '🍅' },
        carrot: { name: 'Carrot Seed 🥕', costCoins: 5, yieldCoins: 15, yieldKittyCoins: 1, growTime: 5, emoji: '🥕' },
        pumpkin: { name: 'Pumpkin Seed 🎃', costCoins: 10, yieldCoins: 30, yieldKittyCoins: 2, growTime: 9, emoji: '🎃' },
        cabbage: { name: 'Cabbage Seed 🥬', costCoins: 4, yieldCoins: 12, yieldKittyCoins: 1, growTime: 4, emoji: '🥬' },
        sunflower: { name: 'Sunflower Seed 🌻', costCoins: 8, yieldCoins: 25, yieldDiamonds: 1, growTime: 7, emoji: '🌻' },
        peashooter: { name: 'Peashooter Crop Seed 🫛', costCoins: 15, yieldCoins: 45, yieldDiamonds: 2, growTime: 10, emoji: '🫛' },
        strawberry: { name: 'Strawberry Seed 🍓', costCoins: 12, yieldCoins: 35, yieldDiamonds: 1, growTime: 6, emoji: '🍓' }
      },
      toys: {
        furball: { name: 'Yarn Fur Ball 🧶', costCoins: 15, moodBoost: 25, emoji: '🧶', desc: 'Kickable physics ball (+25 Mood)' },
        catnip: { name: 'Squeaky Catnip Mouse 🐭', costCoins: 25, moodBoost: 35, emoji: '🐭', desc: 'Cute squeaky toy (+35 Mood)' },
        fish: { name: 'Tasty Fish Snack 🐟', costCoins: 35, moodBoost: 50, emoji: '🐟', desc: 'Yummy fish treat (+50 Mood)' },
        milk: { name: 'Warm Milk Bowl 🥛', costCoins: 20, moodBoost: 40, emoji: '🥛', desc: 'Drink milk & purr (+40 Mood)' },
        box: { name: 'Cozy Cardboard Box 📦', costCoins: 30, moodBoost: 60, emoji: '📦', desc: 'Hop inside box & sit (+60 Mood)' },
        post: { name: 'Plush Scratching Post 🛋️', costCoins: 40, moodBoost: 45, emoji: '🛋️', desc: 'Scratch post & play (+45 Mood)' }
      },
      weapons: {
        peashooter: { name: 'Peashooter Blaster 🌱', costCoins: 0, velocity: 52, emoji: '🌱', desc: 'Standard pea shooter (Vel: 52.0)' },
        carrot: { name: 'Carrot Rocket Sniper 🥕', costCoins: 60, velocity: 85, emoji: '🥕', desc: 'High-velocity carrot rockets with flame trail! (Vel: 85.0)' },
        fish: { name: 'Fishy Bubble Cannon 🐟', costCoins: 100, costDiamonds: 2, velocity: 38, emoji: '🐟', desc: 'Arcing fish projectiles with water bubbles! (Vel: 38.0)' },
        rainbow: { name: 'Rainbow Star Wand 🌈', costCoins: 150, costDiamonds: 3, velocity: 65, emoji: '🌈', desc: 'Floating rainbow stars & stardust! (Vel: 65.0)' },
        laser: { name: 'Golden Royal Laser ⚡', costCoins: 250, costDiamonds: 5, velocity: 120, emoji: '⚡', desc: 'Ultra-fast golden laser beam! (Vel: 120.0)' }
      },
      materials: {
        wood: { name: 'Wood Plank 🪵', costCoins: 10, emoji: '🪵', desc: 'Used for Stage 1 Floor & Stage 2 Cozy Walls' },
        bricks: { name: 'Stone Brick 🧱', costCoins: 15, emoji: '🧱', desc: 'Used for Stage 1 Foundation & Stage 3 Chimney' },
        roofTiles: { name: 'Pink Roof Tile 🏠', costCoins: 20, emoji: '🏠', desc: 'Used for Stage 3 Pink Roof & Eaves' },
        cushions: { name: 'Plush Cushion 🛋️', costCoins: 30, emoji: '🛋️', desc: 'Used for Stage 4 Porch Beds & Cat Lounge' },
        goldenStars: { name: 'Golden Kitty Star ⭐', costDiamonds: 3, emoji: '⭐', desc: 'Used for Stage 4 Royal Peak Crown' }
      }
    };
  }

  selectActiveSeed(type) {
    if (this.seeds[type] !== undefined) {
      this.activeSeed = type;
      return true;
    }
    return false;
  }

  buySeed(seedType) {
    const item = this.catalog.seeds[seedType];
    if (!item) return false;

    if (this.game.coins >= item.costCoins) {
      this.game.coins -= item.costCoins;
      this.seeds[seedType] = (this.seeds[seedType] || 0) + 1;
      this.game.sound.playHarvest();
      this.game.ui.updateStats(this.game.coins, this.game.cropsHarvested, this.game.pestsDefeated, this.diamonds);
      this.game.ui.showToast(`Purchased 1x ${item.name}!`);
      return true;
    } else {
      this.game.ui.showToast(`❌ Need ${item.costCoins}🪙 to buy ${item.name}!`);
      return false;
    }
  }

  buyMaterial(matType) {
    const item = this.catalog.materials[matType];
    if (!item) return false;

    if (item.costCoins && this.game.coins >= item.costCoins) {
      this.game.coins -= item.costCoins;
      this.materials[matType] = (this.materials[matType] || 0) + 1;
      this.game.sound.playHarvest();
      this.game.ui.updateStats(this.game.coins, this.game.cropsHarvested, this.game.pestsDefeated, this.diamonds);
      this.game.ui.showToast(`Purchased 1x ${item.name}!`);
      return true;
    } else if (item.costDiamonds && this.diamonds >= item.costDiamonds) {
      this.diamonds -= item.costDiamonds;
      this.materials[matType] = (this.materials[matType] || 0) + 1;
      this.game.sound.playHarvest();
      this.game.ui.updateStats(this.game.coins, this.game.cropsHarvested, this.game.pestsDefeated, this.diamonds);
      this.game.ui.showToast(`Purchased 1x ${item.name}!`);
      return true;
    } else {
      this.game.ui.showToast(`❌ Insufficient funds to buy ${item.name}!`);
      return false;
    }
  }

  buyToy(toyType) {
    const item = this.catalog.toys[toyType];
    if (!item) return false;

    if (this.game.coins >= item.costCoins) {
      this.game.coins -= item.costCoins;
      this.game.sound.playHarvest();
      this.game.ui.updateStats(this.game.coins, this.game.cropsHarvested, this.game.pestsDefeated, this.diamonds);

      // Spawn toy in front of kitty!
      const spawnPos = this.game.cat.mesh.position.clone();
      spawnPos.z += 1.2;

      if (toyType === 'furball') {
        this.game.playableItems.spawnFurBall(spawnPos);
      } else if (toyType === 'catnip') {
        this.game.playableItems.spawnCatnipMouse(spawnPos);
      } else if (toyType === 'fish') {
        this.game.playableItems.spawnFishSnack(spawnPos);
      } else if (toyType === 'milk') {
        this.game.playableItems.spawnMilkBowl(spawnPos);
      } else if (toyType === 'box') {
        this.game.playableItems.spawnCardboardBox(spawnPos);
      } else if (toyType === 'post') {
        this.game.playableItems.spawnScratchingPost(spawnPos);
      }

      this.game.ui.showToast(`Spawned 1x ${item.name}! Play with it!`);
      return true;
    } else {
      this.game.ui.showToast(`❌ Need ${item.costCoins}🪙 to buy ${item.name}!`);
      return false;
    }
  }

  buyWeapon(weaponKey) {
    const item = this.catalog.weapons[weaponKey];
    if (!item) return false;

    if (this.unlockedWeapons[weaponKey]) {
      this.equipWeapon(weaponKey);
      return true;
    }

    if (item.costCoins && this.game.coins < item.costCoins) {
      this.game.ui.showToast(`❌ Need ${item.costCoins}🪙 to buy ${item.name}!`);
      return false;
    }

    if (item.costDiamonds && this.diamonds < item.costDiamonds) {
      this.game.ui.showToast(`❌ Need ${item.costDiamonds}💎 to buy ${item.name}!`);
      return false;
    }

    if (item.costCoins) this.game.coins -= item.costCoins;
    if (item.costDiamonds) this.diamonds -= item.costDiamonds;

    this.unlockedWeapons[weaponKey] = true;
    this.equipWeapon(weaponKey);

    this.game.sound.playQuestComplete();
    this.game.ui.updateStats(this.game.coins, this.game.cropsHarvested, this.game.pestsDefeated, this.diamonds);
    this.game.ui.showToast(`🎉 Unlocked & Equipped ${item.name}!`);
    return true;
  }

  equipWeapon(weaponKey) {
    if (!this.unlockedWeapons[weaponKey]) return false;
    this.activeWeapon = weaponKey;
    if (this.game.weapon) {
      this.game.weapon.setWeaponStyle(weaponKey);
    }
    this.game.ui.showToast(`Equipped Weapon: ${this.catalog.weapons[weaponKey].name}`);
    return true;
  }

  exchangeDiamonds() {
    // Exchange 100 Kitty Coins for 1 Diamond
    if (this.game.coins >= 100) {
      this.game.coins -= 100;
      this.diamonds += 1;
      this.game.sound.playQuestComplete();
      this.game.ui.updateStats(this.game.coins, this.game.cropsHarvested, this.game.pestsDefeated, this.diamonds);
      this.game.ui.showToast(`💎 Exchanged 100🪙 for +1 Diamond!`);
      return true;
    } else {
      this.game.ui.showToast(`❌ Need 100🪙 to exchange for 1 Diamond!`);
      return false;
    }
  }

  canAffordHomeStage(reqs) {
    if (!reqs) return false;
    if (this.game.coins < reqs.costCoins) return false;
    if (this.diamonds < reqs.costDiamonds) return false;
    if (this.materials.wood < reqs.costWood) return false;
    if (this.materials.bricks < reqs.costBricks) return false;
    if (this.materials.roofTiles < reqs.costRoof) return false;
    return true;
  }

  consumeMaterialsForHome(reqs) {
    if (!this.canAffordHomeStage(reqs)) return false;

    this.game.coins -= reqs.costCoins;
    this.diamonds -= reqs.costDiamonds;
    this.materials.wood -= reqs.costWood;
    this.materials.bricks -= reqs.costBricks;
    this.materials.roofTiles -= reqs.costRoof;

    this.game.ui.updateStats(this.game.coins, this.game.cropsHarvested, this.game.pestsDefeated, this.diamonds);
    return true;
  }
}