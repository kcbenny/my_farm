export class MissionPanel {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'mission-panel';
    this.container.className = 'mission-panel';
    this.container.innerHTML = `
      <div class="mission-panel-inner">
        <div class="mission-panel-header"><span class="icon"></span><span class="title"></span></div>
        <ul class="mission-list"></ul>
        <div class="mission-complete-badge">🏆 All Missions Complete!</div>
      </div>`;
    document.body.appendChild(this.container);
    this.missions = [];
    this.mapName = '';
    this.allDone = false;
    this.onAllComplete = null;
  }

  /**
   * @param {string} mapName
   * @param {{id:string, text:string}[]} missions
   * @param {Object<string,boolean>} [initialStatus]
   */
  show(mapName, missions, initialStatus = {}) {
    this.mapName = mapName;
    this.missions = missions;
    this.allDone = false;

    const hdr = this.container.querySelector('.mission-panel-header');
    const icon = hdr.querySelector('.icon');
    const title = hdr.querySelector('.title');
    icon.textContent = mapName.slice(0, 2);
    title.textContent = mapName;

    const list = this.container.querySelector('.mission-list');
    list.innerHTML = '';
    missions.forEach(m => {
      const li = document.createElement('li');
      li.className = 'mission-item';
      li.dataset.id = m.id;
      li.innerHTML = `<span class="checkbox">✓</span><span class="text">${m.text}</span><span class="bonus">+5🪙</span>`;
      if (initialStatus[m.id]) {
        li.classList.add('done');
      }
      list.appendChild(li);
    });

    this.container.classList.add('visible');
    this.container.classList.remove('completed');
    this.container.querySelector('.mission-complete-badge').style.display = 'none';
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
    this.allDone = false;
  }

  /** Update progress text for a mission (e.g. "(3/5)") */
  updateProgress(missionId, text) {
    const item = this.container.querySelector(`.mission-item[data-id="${missionId}"]`);
    if (!item) return;
    const txt = item.querySelector('.text');
    if (txt) txt.textContent = text;
  }
}