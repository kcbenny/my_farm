import { DailyQuestSystem } from '../gameplay/DailyQuestSystem.js';
import { AchievementSystem } from '../gameplay/AchievementSystem.js';

/**
 * 每日任务 & 成就图鉴 UI 控制器
 * 负责渲染模态框、按钮交互、回调通知
 */
export class QuestAchievementUI {
  constructor(game) {
    this.game = game;
    this.dailyQuest = new DailyQuestSystem();
    this.achievement = new AchievementSystem();

    this.activeAchievementTab = 'farm';
    this.toastTimeout = null;

    this._cacheElements();
    this._bindEvents();
    this._bindCallbacks();
    this._updateBadge();
  }

  _cacheElements() {
    this.dailyBtn = document.getElementById('btn-daily-quest');
    this.dailyBadge = document.getElementById('daily-quest-badge');
    this.dailyModal = document.getElementById('daily-quest-modal');
    this.dailyList = document.getElementById('daily-quest-list');
    this.closeDailyBtn = document.getElementById('btn-close-daily-quest');
    this.claimAllBtn = document.getElementById('btn-claim-all-quests');
    this.questPlayerLevel = document.getElementById('quest-player-level');
    this.questExpFill = document.getElementById('quest-exp-fill');
    this.questExpText = document.getElementById('quest-exp-text');
    this.questCompletedCount = document.getElementById('quest-completed-count');
    this.questTotalCount = document.getElementById('quest-total-count');

    this.achBtn = document.getElementById('btn-achievements');
    this.achModal = document.getElementById('achievements-modal');
    this.achList = document.getElementById('achievement-list');
    this.achTabs = document.getElementById('achievement-tabs');
    this.achProgressText = document.getElementById('achievement-progress-text');
    this.achProgressPercent = document.getElementById('achievement-progress-percent');
    this.achOverviewFill = document.getElementById('achievement-overview-fill');
    this.closeAchBtn = document.getElementById('btn-close-achievements');

    this.achToast = document.getElementById('achievement-toast');
    this.achToastName = document.getElementById('achievement-toast-name');
  }

  _bindEvents() {
    this.dailyBtn.addEventListener('click', () => this.openDailyQuest());
    this.closeDailyBtn.addEventListener('click', () => this.closeDailyQuest());
    this.claimAllBtn.addEventListener('click', () => this.claimAllQuests());

    this.achBtn.addEventListener('click', () => this.openAchievements());
    this.closeAchBtn.addEventListener('click', () => this.closeAchievements());

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!this.dailyModal.classList.contains('hidden')) {
          this.closeDailyQuest();
        } else if (!this.achModal.classList.contains('hidden')) {
          this.closeAchievements();
        }
      }
    });
  }

  _bindCallbacks() {
    // 任务完成时显示飘字
    this.dailyQuest.onQuestComplete = (quest) => {
      this._updateBadge();
      if (this.game && this.game.ui && this.game.ui.showToast) {
        this.game.ui.showToast(`✅ Quest Complete: ${quest.title}`);
      }
    };

    this.dailyQuest.onQuestClaim = (quest) => {
      if (this.game && this.game.ui && this.game.ui.showToast) {
        const rewardText = [];
        if (quest.reward.coins) rewardText.push(`+${quest.reward.coins}🪙`);
        if (quest.reward.exp) rewardText.push(`+${quest.reward.exp}⭐`);
        this.game.ui.showToast(`🎁 Claimed: ${rewardText.join(' ')}`);
      }
      this._updateBadge();
    };

    // 成就解锁时显示 toast
    this.achievement.onUnlock = (ach) => {
      this._showAchievementToast(ach);
    };
  }

  /* ──────────────── Daily Quest Panel ──────────────── */

  openDailyQuest() {
    this.dailyModal.classList.remove('hidden');
    this.renderDailyQuest();
  }

  closeDailyQuest() {
    this.dailyModal.classList.add('hidden');
  }

  renderDailyQuest() {
    const quests = this.dailyQuest.getQuests();
    const completed = this.dailyQuest.getCompletedCount();
    const total = quests.length;

    this.questTotalCount.textContent = total;
    this.questCompletedCount.textContent = completed;

    // 等级信息
    this.questPlayerLevel.textContent = this.dailyQuest.level;
    const expProgress = this.dailyQuest.getLevelProgress() * 100;
    this.questExpFill.style.width = expProgress + '%';
    this.questExpText.textContent = `${this.dailyQuest.exp} / ${this.dailyQuest._expForNextLevel()}`;

    // Claim All 按钮
    this.claimAllBtn.disabled = !this.dailyQuest.hasUnclaimed();
    this.claimAllBtn.style.opacity = this.dailyQuest.hasUnclaimed() ? 1 : 0.5;
    this.claimAllBtn.style.cursor = this.dailyQuest.hasUnclaimed() ? 'pointer' : 'not-allowed';

    // 列表
    this.dailyList.innerHTML = '';
    for (const quest of quests) {
      const item = this._createQuestItem(quest);
      this.dailyList.appendChild(item);
    }
  }

  _createQuestItem(quest) {
    const div = document.createElement('div');
    div.className = `quest-item rarity-${quest.rarity}`;

    const statusClass = quest.claimed ? 'claimed' : (quest.completed ? 'completed' : '');

    const progress = quest.progress || 0;
    const percent = Math.min(100, (progress / quest.target) * 100);

    const rewardCoins = quest.reward.coins || 0;
    const rewardExp = quest.reward.exp || 0;

    let actionBtn = '';
    if (quest.claimed) {
      actionBtn = '<span class="quest-claimed-badge">✓ Claimed</span>';
    } else if (quest.completed) {
      actionBtn = '<button class="quest-claim-btn" data-quest-id="' + quest.id + '">Claim</button>';
    }

    div.innerHTML = `
      <div class="quest-item-icon">${quest.icon}</div>
      <div class="quest-item-content">
        <div class="quest-item-title">${quest.title}</div>
        <div class="quest-item-desc">${quest.desc}</div>
        <div class="quest-progress-track">
          <div class="quest-progress-fill" style="width: ${percent}%"></div>
          <span class="quest-progress-text">${progress} / ${quest.target}</span>
        </div>
      </div>
      <div class="quest-item-reward">
        <div class="quest-reward-text quest-reward-coins">+${rewardCoins}🪙</div>
        <div class="quest-reward-text quest-reward-exp">+${rewardExp}⭐</div>
        ${actionBtn}
      </div>
    `;

    if (statusClass) div.classList.add(statusClass);

    // 绑定领取按钮
    const claimBtn = div.querySelector('.quest-claim-btn');
    if (claimBtn) {
      claimBtn.addEventListener('click', () => this.claimQuest(quest.id));
    }

    return div;
  }

  claimQuest(questId) {
    const reward = this.dailyQuest.claimQuest(questId);
    if (reward && reward.coins && this.game) {
      this.game.coins = (this.game.coins || 0) + reward.coins;
      if (this.game.ui && this.game.ui.updateStats) {
        this.game.ui.updateStats(
          this.game.coins,
          this.game.cropsHarvested,
          this.game.pestsDefeated,
          this.game.shop ? this.game.shop.diamonds : 0
        );
      }
    }
    this.renderDailyQuest();
    this._updateBadge();
  }

  claimAllQuests() {
    const rewards = this.dailyQuest.claimAll();
    if (rewards.coins && this.game) {
      this.game.coins = (this.game.coins || 0) + rewards.coins;
      if (this.game.ui && this.game.ui.updateStats) {
        this.game.ui.updateStats(
          this.game.coins,
          this.game.cropsHarvested,
          this.game.pestsDefeated,
          this.game.shop ? this.game.shop.diamonds : 0
        );
      }
    }
    this.renderDailyQuest();
    this._updateBadge();
  }

  _updateBadge() {
    if (this.dailyQuest.hasUnclaimed()) {
      this.dailyBadge.classList.remove('hidden');
    } else {
      this.dailyBadge.classList.add('hidden');
    }
  }

  /* ──────────────── Achievements Panel ──────────────── */

  openAchievements() {
    this.achModal.classList.remove('hidden');
    this.renderAchievements();
  }

  closeAchievements() {
    this.achModal.classList.add('hidden');
  }

  renderAchievements() {
    // 总进度
    const total = this.achievement.getTotalCount();
    const unlocked = this.achievement.getUnlockedCount();
    const percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    this.achProgressText.textContent = `${unlocked} / ${total}`;
    this.achProgressPercent.textContent = percent + '%';
    this.achOverviewFill.style.width = percent + '%';

    // 分类标签
    this.achTabs.innerHTML = '';
    const catStats = this.achievement.getCategoryStats();
    for (const cat of catStats) {
      const tab = document.createElement('button');
      tab.className = 'achievement-tab' + (cat.id === this.activeAchievementTab ? ' active' : '');
      tab.innerHTML = `<span>${cat.icon}</span><span>${cat.name}</span><span class="tab-count">${cat.unlocked}/${cat.total}</span>`;
      tab.addEventListener('click', () => {
        this.activeAchievementTab = cat.id;
        this.renderAchievements();
      });
      this.achTabs.appendChild(tab);
    }

    // 成就列表
    this.achList.innerHTML = '';
    const list = this.achievement.getAchievements(this.activeAchievementTab);
    for (const ach of list) {
      const item = this._createAchievementItem(ach);
      this.achList.appendChild(item);
    }
  }

  _createAchievementItem(ach) {
    const div = document.createElement('div');
    const isSecretLocked = ach.secret && !ach.unlocked;
    div.className = `achievement-item ${ach.rarity} ${ach.unlocked ? 'unlocked' : 'locked'} ${ach.secret ? 'secret' : ''}`;

    const rewardText = ach.reward?.coins ? `+${ach.reward.coins}🪙` : '';
    let progressHtml = '';
    if (ach.progress !== null && ach.progressTarget && !isSecretLocked) {
      const percent = Math.min(100, (ach.progress / ach.progressTarget) * 100);
      progressHtml = `
        <div class="achievement-footer-row" style="display:flex;align-items:center;gap:6px;margin-top:4px;">
          <div class="achievement-progress-mini">
            <div class="achievement-progress-mini-fill" style="width:${percent}%"></div>
          </div>
          <span style="font-size:10px;color:#6b7280;font-weight:600;">${ach.progress}/${ach.progressTarget}</span>
        </div>
      `;
    }

    const checkHtml = ach.unlocked ? '<div class="achievement-check">✓</div>' : '';

    div.innerHTML = `
      <div class="rarity-glow"></div>
      <div class="achievement-item-content-wrap">
        <div class="achievement-icon-wrap">${ach.icon}</div>
        <div class="achievement-info">
          <div class="achievement-title-text">
            <span>${ach.title}</span>
            <span class="achievement-rarity-tag rarity-tag-${ach.rarity}">${ach.rarity}</span>
          </div>
          <div class="achievement-desc">${ach.desc}</div>
          <div class="achievement-item-footer">
            ${rewardText ? `<span class="achievement-reward-text">${rewardText}</span>` : ''}
            ${progressHtml}
          </div>
        </div>
        ${checkHtml}
      </div>
    `;
    return div;
  }

  /* ──────────────── Toast ──────────────── */

  _showAchievementToast(ach) {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    this.achToast.classList.remove('hidden', 'fade-out');
    this.achToastName.textContent = ach.title;
    this.toastTimeout = setTimeout(() => {
      this.achToast.classList.add('fade-out');
      this.toastTimeout = setTimeout(() => {
        this.achToast.classList.add('hidden');
        this.achToast.classList.remove('fade-out');
      }, 400);
    }, 3000);
  }

  /* ──────────────── 公共 API（给游戏调用） ──────────────── */

  /**
   * 游戏事件追踪 - 转发到任务/成就系统
   */
  onCropHarvested() {
    this.dailyQuest.track('harvest', 1);
    this.achievement.track('totalHarvested', 1);
  }

  onCropWatered() {
    this.dailyQuest.track('water', 1);
    this.achievement.track('totalWatered', 1);
  }

  onSeedPlanted(cropType) {
    this.dailyQuest.track('plant', 1);
    this.achievement.track('totalPlanted', 1);
    this.achievement.trackCropType(cropType);
  }

  onPestDefeated() {
    this.dailyQuest.track('pest', 1);
    this.achievement.track('totalPestsDefeated', 1);
  }

  onFishCaught() {
    this.dailyQuest.track('fish', 1);
    this.achievement.track('totalFishCaught', 1);
  }

  onMapCompleted() {
    this.dailyQuest.track('explore', 1);
    this.achievement.track('mapsCompleted', 1);
  }

  onComboAchieved(combo) {
    this.dailyQuest.trackMax('combo', combo);
    this.achievement.trackMax('maxCombo', combo);
  }

  onCoinsChanged(coins) {
    this.dailyQuest.trackMax('coins', coins);
    this.achievement.track('coins', coins);
  }

  onShopPurchase() {
    this.dailyQuest.track('shop', 1);
  }
}
