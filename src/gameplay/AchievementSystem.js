/**
 * 成就图鉴系统
 *
 * 分类：
 * - 🌾 农场：种植、收获、浇水相关
 * - 🐛 战斗：消灭害虫、豌豆射手相关
 * - 🎣 休闲：钓鱼、收集相关
 * - 🗺️ 探索：地图、冒险相关
 * - 🏆 里程碑：金币、等级、累计类
 * - 🔒 隐藏：彩蛋成就（不解锁不显示描述）
 */

const ACHIEVEMENTS = [
  // ========== 🌾 农场类 ==========
  {
    id: 'first_plant',
    category: 'farm',
    title: '第一颗种子',
    desc: '种下第一颗种子',
    icon: '🌱',
    rarity: 'common',
    reward: { coins: 10 },
  },
  {
    id: 'harvest_10',
    category: 'farm',
    title: '初尝收获',
    desc: '累计收获 10 个作物',
    icon: '🌾',
    rarity: 'common',
    reward: { coins: 20 },
    stat: 'totalHarvested',
    target: 10,
  },
  {
    id: 'harvest_100',
    category: 'farm',
    title: '丰收农场',
    desc: '累计收获 100 个作物',
    icon: '🌽',
    rarity: 'rare',
    reward: { coins: 100 },
    stat: 'totalHarvested',
    target: 100,
  },
  {
    id: 'harvest_500',
    category: 'farm',
    title: '农业大亨',
    desc: '累计收获 500 个作物',
    icon: '👑',
    rarity: 'epic',
    reward: { coins: 500 },
    stat: 'totalHarvested',
    target: 500,
  },
  {
    id: 'water_50',
    category: 'farm',
    title: '辛勤园丁',
    desc: '累计浇水 50 次',
    icon: '💧',
    rarity: 'common',
    reward: { coins: 25 },
    stat: 'totalWatered',
    target: 50,
  },
  {
    id: 'all_crops',
    category: 'farm',
    title: '作物图鉴',
    desc: '种植过所有种类的作物',
    icon: '📗',
    rarity: 'rare',
    reward: { coins: 80 },
    secret: false,
  },

  // ========== 🐛 战斗类 ==========
  {
    id: 'first_pest',
    category: 'combat',
    title: '首次除虫',
    desc: '消灭第一只害虫',
    icon: '🐛',
    rarity: 'common',
    reward: { coins: 10 },
  },
  {
    id: 'pest_50',
    category: 'combat',
    title: '农场卫士',
    desc: '累计消灭 50 只害虫',
    icon: '⚔️',
    rarity: 'rare',
    reward: { coins: 80 },
    stat: 'totalPestsDefeated',
    target: 50,
  },
  {
    id: 'pest_200',
    category: 'combat',
    title: '灭虫专家',
    desc: '累计消灭 200 只害虫',
    icon: '💥',
    rarity: 'epic',
    reward: { coins: 200 },
    stat: 'totalPestsDefeated',
    target: 200,
  },
  {
    id: 'combo_10',
    category: 'combat',
    title: '连击大师',
    desc: '达成 10 连击',
    icon: '🔥',
    rarity: 'rare',
    reward: { coins: 50 },
  },

  // ========== 🎣 休闲类 ==========
  {
    id: 'first_fish',
    category: 'casual',
    title: '第一条鱼',
    desc: '钓到第一条鱼',
    icon: '🎣',
    rarity: 'common',
    reward: { coins: 15 },
  },
  {
    id: 'fish_20',
    category: 'casual',
    title: '钓鱼爱好者',
    desc: '累计钓到 20 条鱼',
    icon: '🐟',
    rarity: 'rare',
    reward: { coins: 60 },
    stat: 'totalFishCaught',
    target: 20,
  },
  {
    id: 'fish_legendary',
    category: 'casual',
    title: '传说之鱼',
    desc: '钓到一条传说级鱼',
    icon: '🐠',
    rarity: 'legendary',
    reward: { coins: 200 },
    secret: true,
  },

  // ========== 🗺️ 探索类 ==========
  {
    id: 'first_map',
    category: 'explore',
    title: '初次冒险',
    desc: '完成第一个冒险地图',
    icon: '🗺️',
    rarity: 'common',
    reward: { coins: 30 },
  },
  {
    id: 'all_maps',
    category: 'explore',
    title: '环游世界',
    desc: '完成所有冒险地图',
    icon: '🌍',
    rarity: 'epic',
    reward: { coins: 150 },
    stat: 'mapsCompleted',
    target: 6,
  },
  {
    id: 'explorer',
    category: 'explore',
    title: '角落探险家',
    desc: '到达所有地图的角落区域',
    icon: '🧭',
    rarity: 'rare',
    reward: { coins: 80 },
  },

  // ========== 🏆 里程碑 ==========
  {
    id: 'coins_100',
    category: 'milestone',
    title: '小有积蓄',
    desc: '累计拥有 100 金币',
    icon: '💰',
    rarity: 'common',
    reward: { coins: 20 },
    stat: 'maxCoins',
    target: 100,
  },
  {
    id: 'coins_500',
    category: 'milestone',
    title: '农场富翁',
    desc: '累计拥有 500 金币',
    icon: '💎',
    rarity: 'rare',
    reward: { coins: 100 },
    stat: 'maxCoins',
    target: 500,
  },
  {
    id: 'coins_2000',
    category: 'milestone',
    title: '农场大亨',
    desc: '累计拥有 2000 金币',
    icon: '🏆',
    rarity: 'epic',
    reward: { coins: 300 },
    stat: 'maxCoins',
    target: 2000,
  },
  {
    id: 'level_5',
    category: 'milestone',
    title: '初露锋芒',
    desc: '达到 5 级',
    icon: '⭐',
    rarity: 'rare',
    reward: { coins: 100 },
  },
  {
    id: 'level_10',
    category: 'milestone',
    title: '资深农夫',
    desc: '达到 10 级',
    icon: '🌟',
    rarity: 'epic',
    reward: { coins: 250 },
  },

  // ========== 🔒 隐藏成就 ==========
  {
    id: 'secret_moonlight',
    category: 'secret',
    title: '月光寻宝者',
    desc: '???',
    icon: '🌙',
    rarity: 'epic',
    reward: { coins: 100 },
    secret: true,
  },
  {
    id: 'secret_iceman',
    category: 'secret',
    title: '冰雪勇士',
    desc: '???',
    icon: '❄️',
    rarity: 'epic',
    reward: { coins: 100 },
    secret: true,
  },
  {
    id: 'secret_astrologer',
    category: 'secret',
    title: '占星师',
    desc: '???',
    icon: '✨',
    rarity: 'rare',
    reward: { coins: 80 },
    secret: true,
  },
  {
    id: 'secret_speedrun',
    category: 'secret',
    title: '沙漏挑战者',
    desc: '???',
    icon: '⏳',
    rarity: 'rare',
    reward: { coins: 80 },
    secret: true,
  },
  {
    id: 'secret_tide',
    category: 'secret',
    title: '潮间带猎人',
    desc: '???',
    icon: '🌊',
    rarity: 'rare',
    reward: { coins: 60 },
    secret: true,
  },
];

const CATEGORIES = [
  { id: 'farm', name: '农场', icon: '🌾' },
  { id: 'combat', name: '战斗', icon: '🐛' },
  { id: 'casual', name: '休闲', icon: '🎣' },
  { id: 'explore', name: '探索', icon: '🗺️' },
  { id: 'milestone', name: '里程碑', icon: '🏆' },
  { id: 'secret', name: '隐藏', icon: '🔒' },
];

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

export class AchievementSystem {
  constructor(storageKey = 'cedars_farm_achievements') {
    this.storageKey = storageKey;
    this.unlocked = new Set();
    this.stats = {
      totalHarvested: 0,
      totalWatered: 0,
      totalPlanted: 0,
      totalPestsDefeated: 0,
      totalFishCaught: 0,
      totalCoinsEarned: 0,
      maxCoins: 0,
      mapsCompleted: 0,
      maxCombo: 0,
      cropsTypesPlanted: [],
    };
    this.achievements = ACHIEVEMENTS;
    this.categories = CATEGORIES;

    this.onUnlock = null; // callback(achievement)

    this._load();
  }

  /* ──────────────── 统计追踪 ──────────────── */

  track(statName, amount = 1) {
    if (this.stats[statName] === undefined) {
      this.stats[statName] = 0;
    }
    this.stats[statName] += amount;

    // 特殊：maxCoins 取最大值
    if (statName === 'coins') {
      this.stats.maxCoins = Math.max(this.stats.maxCoins, this.stats.coins || 0);
    }

    // 检查基于统计的成就
    this._checkStatAchievements();
    this._save();
  }

  trackMax(statName, value) {
    if (this.stats[statName] === undefined || value > this.stats[statName]) {
      this.stats[statName] = value;
      this._checkStatAchievements();
      this._save();
    }
  }

  trackCropType(cropType) {
    if (!this.stats.cropsTypesPlanted.includes(cropType)) {
      this.stats.cropsTypesPlanted.push(cropType);
      // 检查"种植过所有种类"成就
      if (this.stats.cropsTypesPlanted.length >= 5) {
        this.unlock('all_crops');
      }
      this._save();
    }
  }

  /* ──────────────── 成就解锁 ──────────────── */

  unlock(achievementId) {
    if (this.unlocked.has(achievementId)) return false;

    const ach = this.achievements.find(a => a.id === achievementId);
    if (!ach) return false;

    this.unlocked.add(achievementId);
    this._save();

    if (this.onUnlock) {
      this.onUnlock(ach);
    }

    return ach;
  }

  _checkStatAchievements() {
    for (const ach of this.achievements) {
      if (!ach.stat || !ach.target) continue;
      if (this.unlocked.has(ach.id)) continue;

      const current = this.stats[ach.stat] || 0;
      if (current >= ach.target) {
        this.unlock(ach.id);
      }
    }
  }

  /* ──────────────── 查询 ──────────────── */

  getAchievements(category = null) {
    let list = this.achievements;
    if (category) {
      list = list.filter(a => a.category === category);
    }
    return list.map(a => ({
      ...a,
      unlocked: this.unlocked.has(a.id),
      // 隐藏成就未解锁时不显示描述
      desc: (a.secret && !this.unlocked.has(a.id)) ? '???' : a.desc,
      progress: a.stat ? Math.min(this.stats[a.stat] || 0, a.target || 0) : null,
      progressTarget: a.target || null,
    }));
  }

  getUnlockedCount() {
    return this.unlocked.size;
  }

  getTotalCount() {
    return this.achievements.length;
  }

  getProgress() {
    return this.unlocked.size / this.achievements.length;
  }

  getCategoryStats() {
    return this.categories.map(cat => {
      const catAchievements = this.achievements.filter(a => a.category === cat.id);
      const unlocked = catAchievements.filter(a => this.unlocked.has(a.id)).length;
      return {
        ...cat,
        total: catAchievements.length,
        unlocked,
      };
    });
  }

  getRarityColor(rarity) {
    return RARITY_COLORS[rarity] || '#9ca3af';
  }

  /* ──────────────── 存档 ──────────────── */

  _save() {
    try {
      const data = {
        unlocked: Array.from(this.unlocked),
        stats: this.stats,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Achievement save failed:', e);
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.unlocked = new Set(data.unlocked || []);
      if (data.stats) {
        this.stats = { ...this.stats, ...data.stats };
      }
    } catch (e) {
      console.warn('Achievement load failed:', e);
    }
  }

  reset() {
    this.unlocked = new Set();
    this.stats = {
      totalHarvested: 0,
      totalWatered: 0,
      totalPlanted: 0,
      totalPestsDefeated: 0,
      totalFishCaught: 0,
      totalCoinsEarned: 0,
      maxCoins: 0,
      mapsCompleted: 0,
      maxCombo: 0,
      cropsTypesPlanted: [],
    };
    this._save();
  }
}
