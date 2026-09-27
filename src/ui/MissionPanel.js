export class MissionPanel {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'mission-panel';
    this.container.className = 'mission-panel';
    this.container.innerHTML = `
      <div class="mission-panel-inner">
        <div class="mission-panel-header"><span class="icon"></span><span class="title"></span></div>
        <ul class="mission-list"></ul>
        <div class="mission-hints">
          <div class="mission-hints-title">💡 How to Play</div>
          <ul class="hints-list"></ul>
        </div>
        <div class="mission-complete-badge">🏆 All Missions Complete!</div>
      </div>`;
    document.body.appendChild(this.container);
    this.missions = [];
    this._hints = [];        // cached hints for toggle re-render
    this.mapName = '';
    this.allDone = false;
    this.onAllComplete = null;
    this._visible = false;

    // M key toggles mission panel (Tab is eaten by browser pointer-lock)
    this._onKey = (e) => {
      if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); this._toggle(); }
    };
    window.addEventListener('keydown', this._onKey);
  }

  /**
   * @param {string} mapName
   * @param {{id:string, text:string}[]} missions
   * @param {Object<string,boolean>} [initialStatus]
   */
  show(mapName, missions, initialStatus = {}, hints = []) {
    this.mapName = mapName;
    this.missions = missions;
    this._hints = hints;          // cache for toggle
    this.allDone = false;

    this._renderContent(initialStatus);

    this.container.classList.add('visible');
    this._visible = true;
    this.container.classList.remove('completed');
    this.container.querySelector('.mission-complete-badge').style.display = 'none';
  }

  /** Build / rebuild the panel DOM from current state */
  _renderContent(status = {}) {
    const hdr = this.container.querySelector('.mission-panel-header');
    const icon = hdr.querySelector('.icon');
    const title = hdr.querySelector('.title');
    icon.textContent = this.mapName.slice(0, 2);
    title.textContent = this.mapName;

    const list = this.container.querySelector('.mission-list');
    list.innerHTML = '';
    this.missions.forEach(m => {
      const li = document.createElement('li');
      li.className = 'mission-item';
      li.dataset.id = m.id;
      li.innerHTML = `<span class="checkbox">✓</span><span class="text">${m.text}</span><span class="bonus">+5🪙</span>`;
      if (status[m.id]) li.classList.add('done');
      list.appendChild(li);
    });

    // Hints
    const hintSection = this.container.querySelector('.mission-hints');
    const hintList = hintSection.querySelector('.hints-list');
    hintList.innerHTML = '';
    if (this._hints.length > 0) {
      this._hints.forEach(h => {
        const li = document.createElement('li');
        li.textContent = h;
        hintList.appendChild(li);
      });
      hintSection.style.display = 'block';
    } else {
      hintSection.style.display = 'none';
    }
  }

  /** Mark a mission as done */
  completeMission(missionId) {
    const item = this.container.querySelector(`.mission-item[data-id="${missionId}"]`);
    if (!item || item.classList.contains('done')) return false;
    item.classList.add('done', 'flash');
    setTimeout(() => item.classList.remove('flash'), 600);

    this._checkAllDone();
    return true;
  }

  _checkAllDone() {
    const items = this.container.querySelectorAll('.mission-item');
    const allDone = Array.from(items).every(el => el.classList.contains('done'));
    if (allDone && !this.allDone) {
      this.allDone = true;
      this.container.classList.add('completed');
      if (this.onAllComplete) this.onAllComplete(this.mapName);
    }
  }

  hide() {
    this.container.classList.remove('visible', 'completed');
    this.missions = [];
    this._hints = [];
    this.allDone = false;
    this._visible = false;
  }

  /** Toggle mission panel visibility — rebuilds DOM on every show */
  _toggle() {
    if (this.missions.length === 0) return;
    if (this._visible) {
      this.container.classList.remove('visible');
      this._visible = false;
    } else {
      // Rebuild content to guarantee hints are always present
      this._renderContent(this._collectStatus());
      this.container.classList.add('visible');
      this._visible = true;
    }
  }

  /** Collect current checkbox status for re-render */
  _collectStatus() {
    const s = {};
    this.container.querySelectorAll('.mission-item.done').forEach(el => {
      s[el.dataset.id] = true;
    });
    return s;
  }

  /** Update progress text for a mission (e.g. "(3/5)") */
  updateProgress(missionId, text) {
    const item = this.container.querySelector(`.mission-item[data-id="${missionId}"]`);
    if (!item) return;
    const txt = item.querySelector('.text');
    if (txt) txt.textContent = text;
  }
}