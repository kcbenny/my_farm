/**
 * 每日任务系统
 *
 * 每天生成 3-5 个随机任务，完成获得金币和经验奖励
 * 任务类型：收获、浇水、钓鱼、打怪、探索地图、连击等
 * 每日零点重置（基于本地日期）
 */

const QUEST_TEMPLATES = [
  // 收获类
  {
    id: 'harvest_5',
    type: 'harvest',
    title: '勤劳农夫',
    desc: '收获 5 个作物',
    target: 5,
    reward: { coins: 30, exp: 10 },
    icon: '🌾',
    rarity: 'common',
  },
  {
    id: 'harvest_15',
    type: 'harvest',
    title: '丰收季节',
    desc: '收获 15 个作物',
    target: 15,
    reward: { coins: 80, exp: 25 },
    icon: '🌽',
    rarity: 'rare',
  },
  {
    id: 'harvest_30',
    type: 'harvest',
    title: '农场大亨',
    desc: '收获 30 个作物',
    target: 30,
    reward: { coins: 150, exp: 50 },
    icon: '🏆',
    rarity: 'epic',
  },
  // 浇水类
  {
    id: 'water_10',
    type: 'water',
    title: '细心呵护',
    desc: '给作物浇水 10 次',
    target: 10,
    reward: { coins: 20, exp: 8 },
    icon: '💧',
    rarity: 'common',
  },
  {
    id: 'water_25',
    type: 'water',
    title: '雨露均沾',
    desc: '给作物浇水 25 次',
    target: 25,
    reward: { coins: 50, exp: 18 },
    icon: '🌊',
    rarity: 'rare',
  },
  // 种植类
  {
    id: 'plant_5',
    type: 'plant',
    title: '春种一粒',
    desc: '种植 5 颗种子',
    target: 5,
    reward: { coins: 25, exp: 10 },
    icon: '🌱',
    rarity: 'common',
  },
  {
    id: 'plant_10',
    type: 'plant',
    title: '播种达人',
    desc: '种植 10 颗种子',
    target: 10,
    reward: { coins: 55, exp: 20 },
    icon: '🌻',
    rarity: 'rare',
  },
  // 打怪类
  {
    id: 'pest_5',
    type: 'pest',
    title: '害虫克星',
    desc: '消灭 5 只害虫',
    target: 5,
    reward: { coins: 35, exp: 12 },
    icon: '🐛',
    rarity: 'common',
  },
  {
    id: 'pest_15',
    type: 'pest',
    title: '农场卫士',
    desc: '消灭 15 只害虫',
    target: 15,
    reward: { coins: 90, exp: 30 },
    icon: '⚔️',
    rarity: 'rare',
  },
  // 钓鱼类
  {
    id: 'fish_3',
    type: 'fish',
    title: '垂钓之乐',
    desc: '钓到 3 条鱼',
    target: 3,
    reward: { coins: 40, exp: 15 },
    icon: '🎣',
    rarity: 'common',
  },
  {
    id: 'fish_8',
    type: 'fish',
    title: '钓鱼大师',
    desc: '钓到 8 条鱼',
    target: 8,
    reward: { coins: 100, exp: 35 },
    icon: '🐟',
    rarity: 'rare',
  },
  // 探索类
  {
    id: 'explore_1',
    type: 'explore',
    title: '初次冒险',
    desc: '完成 1 个冒险地图',
    target: 1,
    reward: { coins: 50, exp: 20 },
    icon: '🗺️',
    rarity: 'common',
  },
  {
    id: 'explore_3',
    type: 'explore',
    title: '环游世界',
    desc: '完成 3 个不同的冒险地图',
    target: 3,
    reward: { coins: 120, exp: 45 },
    icon: '🌍',
    rarity: 'epic',
  },
  // 连击类
  {
    id: 'combo_5',
    type: 'combo',
    title: '连击新手',
    desc: '达成 5 连击',
    target: 5,
    reward: { coins: 30, exp: 12 },
    icon: '⚡',
    rarity: 'common',
  },
  {
    id: 'combo_10',
    type: 'combo',
    title: '连击大师',
    desc: '达成 10 连击',
    target: 10,
    reward: { coins: 80, exp: 30 },
    icon: '🔥',
    rarity: 'rare',
  },
  // 金币类
  {
    id: 'coins_100',
    type: 'coins',
    title: '小有积蓄',
    desc: '累计获得 100 金币',
    target: 100,
    reward: { coins: 20, exp: 8 },
    icon: '💰',
    rarity: 'common',
  },
  // 商店类
  {
    id: 'shop_1',
    type: 'shop',
    title: '购物愉快',
    desc: '在商店购买 1 件物品',
    target: 1,
    reward: { coins: 15, exp: 5 },
    icon: '🛒',
    rarity: 'common',
  },
];

const RARITY_WEIGHTS = {
  common: 60,
  rare: 30,
  epic: 10,
};

export class DailyQuestSystem {
  constructor(storageKey = 'cedars_farm_daily_quests') {
    this.storageKey = storageKey;
    this.quests = [];
    this.claimedQuests = new Set();
    this.progress = {}; // questId -> current progress
    this.lastDate = null;
    this.exp = 0;
    this.level = 1;

    this.onQuestComplete = null; // callback
    this.onQuestClaim = null; // callback

    this._load();
  }

  /* ──────────────── 日期与重置 ──────────────── */

  _getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  _checkDailyReset() {
    const today = this._getTodayKey();
    if (this.lastDate !== today) {
      this._generateDailyQuests();
      this.lastDate = today;
      this._save();
      return true;
    }
    return false;
  }

  _generateDailyQuests() {
    // 清空旧任务
    this.quests = [];
    this.progress = {};
    this.claimedQuests = new Set();

    // 按稀有度权重随机选 4 个任务
    const pool = [...QUEST_TEMPLATES];
    const selected = [];
    const typesUsed = new Set();

    // 确保至少有 4 个不同类型的任务
    while (selected.length < 4 && pool.length > 0) {
      // 按稀有度加权随机
      const weightedPool = [];
      for (const q of pool) {
        const weight = RARITY_WEIGHTS[q.rarity] || 10;
        // 避免重复类型
        if (typesUsed.has(q.type) && selected.length < 3) continue;
        for (let i = 0; i < weight; i++) {
          weightedPool.push(q);
        }
      }

      if (weightedPool.length === 0) break;

      const pick = weightedPool[Math.floor(Math.random() * weightedPool.length)];
      selected.push({ ...pick, progress: 0, completed: false });
      typesUsed.add(pick.type);

      // 从池中移除已选的同 id
      const idx = pool.findIndex(p => p.id === pick.id);
      if (idx >= 0) pool.splice(idx, 1);
    }

    this.quests = selected;
    for (const q of this.quests) {
      this.progress[q.id] = 0;
    }
  }

  /* ──────────────── 进度更新 ──────────────── */

  track(type, amount = 1) {
    this._checkDailyReset();

    let anyCompleted = false;

    for (const quest of this.quests) {
      if (quest.type !== type) continue;
      if (quest.completed) continue;

      this.progress[quest.id] = Math.min(
        (this.progress[quest.id] || 0) + amount,
        quest.target
      );

      if (this.progress[quest.id] >= quest.target) {
        quest.completed = true;
        anyCompleted = true;
        if (this.onQuestComplete) {
          this.onQuestComplete(quest);
        }
      }
    }

    if (anyCompleted) this._save();
    return anyCompleted;
  }

  // 直接设置某类任务的进度值（用于"达成X连击"这种峰值型任务）
  trackMax(type, value) {
    this._checkDailyReset();

    let anyCompleted = false;
    for (const quest of this.quests) {
      if (quest.type !== type) continue;
      if (quest.completed) continue;

      if (value > (this.progress[quest.id] || 0)) {
        this.progress[quest.id] = Math.min(value, quest.target);
        if (this.progress[quest.id] >= quest.target) {
          quest.completed = true;
          anyCompleted = true;
          if (this.onQuestComplete) {
            this.onQuestComplete(quest);
          }
        }
      }
    }

    if (anyCompleted) this._save();
    return anyCompleted;
  }

  /* ──────────────── 领取奖励 ──────────────── */

  claimQuest(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest || !quest.completed) return null;
    if (this.claimedQuests.has(questId)) return null;

    this.claimedQuests.add(questId);

    // 经验值
    if (quest.reward.exp) {
      this.addExp(quest.reward.exp);
    }

    this._save();

    if (this.onQuestClaim) {
      this.onQuestClaim(quest);
    }

    return quest.reward;
  }

  claimAll() {
    const rewards = { coins: 0, exp: 0 };
    for (const quest of this.quests) {
      if (quest.completed && !this.claimedQuests.has(quest.id)) {
        const r = this.claimQuest(quest.id);
        if (r) {
          rewards.coins += r.coins || 0;
          rewards.exp += r.exp || 0;
        }
      }
    }
    return rewards;
  }

  /* ──────────────── 经验与等级 ──────────────── */

  addExp(amount) {
    this.exp += amount;
    // 简单的等级公式：每级需要 level * 100 经验
    while (this.exp >= this._expForNextLevel()) {
      this.exp -= this._expForNextLevel();
      this.level++;
    }
  }

  _expForNextLevel() {
    return this.level * 100;
  }

  getLevelProgress() {
    return this.exp / this._expForNextLevel();
  }

  /* ──────────────── 数据访问 ──────────────── */

  getQuests() {
    this._checkDailyReset();
    return this.quests.map(q => ({
      ...q,
      progress: this.progress[q.id] || 0,
      claimed: this.claimedQuests.has(q.id),
    }));
  }

  getCompletedCount() {
    return this.quests.filter(q => q.completed).length;
  }

  getClaimedCount() {
    return this.claimedQuests.size;
  }

  hasUnclaimed() {
    return this.quests.some(q => q.completed && !this.claimedQuests.has(q.id));
  }

  /* ──────────────── 存档 ──────────────── */

  _save() {
    try {
      const data = {
        lastDate: this.lastDate,
        quests: this.quests.map(q => ({
          id: q.id,
          type: q.type,
          title: q.title,
          desc: q.desc,
          target: q.target,
          reward: q.reward,
          icon: q.icon,
          rarity: q.rarity,
          completed: q.completed,
        })),
        progress: this.progress,
        claimed: Array.from(this.claimedQuests),
        exp: this.exp,
        level: this.level,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Daily quest save failed:', e);
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        this._checkDailyReset();
        return;
      }
      const data = JSON.parse(raw);
      this.lastDate = data.lastDate || null;
      this.exp = data.exp || 0;
      this.level = data.level || 1;
      this.claimedQuests = new Set(data.claimed || []);

      if (data.quests && data.progress) {
        this.quests = data.quests;
        this.progress = data.progress;
      }

      this._checkDailyReset();
    } catch (e) {
      console.warn('Daily quest load failed, resetting:', e);
      this._generateDailyQuests();
      this.lastDate = this._getTodayKey();
    }
  }
}
