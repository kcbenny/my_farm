import * as THREE from 'three';
import { CAT_CHARACTERS, CHARACTER_LIST } from '../character/CatCharactersConfig.js';
import { CatModelBuilder } from '../character/CatModelBuilder.js';
import { CatAnimations } from '../character/CatAnimations.js';

/**
 * Character Selection Page & 3D Interactive Turntable Manager
 * Allows choosing among:
 * 1. Sunny - Singing Ginger Kitten (Image 1)
 * 2. Mochi - Sleepy Siamese Point (Image 2)
 * 3. Snowball - Fluffy White Persian (Image 3)
 * 4. Rusty - Classic Farm Guardian Tabby
 */
export class CharacterSelectManager {
  constructor(game) {
    this.game = game;
    this.selectedId = 'sunny'; // Default to Image 1's joyful kitten!
    this.previewCat = null;
    this.previewMixer = null;
    this.previewActions = {};
    this.currentAnim = 'Idle';

    // Turntable interaction
    this.isDragging = false;
    this.previousMouseX = 0;
    this.turntableRotation = 0.3;
    this.targetRotation = 0.3;

    // DOM Elements
    this.modalEl = document.getElementById('character-select-page');
    this.viewportEl = document.getElementById('char-turntable-viewport');
    this.canvasEl = document.getElementById('char-turntable-canvas');
    this.confirmBtn = document.getElementById('btn-confirm-character');
    this.confirmText = document.getElementById('btn-confirm-text');
    this.cancelBtn = document.getElementById('btn-close-char-select');

    // Details DOM Elements
    this.nameEl = document.getElementById('selected-char-name');
    this.badgeEl = document.getElementById('selected-char-badge');
    this.titleEl = document.getElementById('selected-char-title');
    this.quoteEl = document.getElementById('selected-char-quote');
    this.descEl = document.getElementById('selected-char-desc');
    this.traitEl = document.getElementById('selected-char-trait');
    this.imgBadgeEl = document.getElementById('preview-image-badge');
    this.floatingNameEl = document.getElementById('preview-cat-name');
    this.floatingEmojiEl = document.getElementById('preview-cat-emoji');

    // Stat Fill Bars
    this.speedValEl = document.getElementById('stat-val-speed');
    this.speedFillEl = document.getElementById('meter-fill-speed');
    this.cutenessValEl = document.getElementById('stat-val-cuteness');
    this.cutenessFillEl = document.getElementById('meter-fill-cuteness');
    this.farmingValEl = document.getElementById('stat-val-farming');
    this.farmingFillEl = document.getElementById('meter-fill-farming');
    this.energyValEl = document.getElementById('stat-val-energy');
    this.energyFillEl = document.getElementById('meter-fill-energy');

    this.cardsContainer = document.getElementById('char-cards-container');

    // Initialize 3D Preview Turntable
    this.initTurntable();
    this.renderRosterCards();
    this.setupEventListeners();

    // Check if there's a saved kitty in localStorage
    try {
      const saved = localStorage.getItem('my_farm_kitty');
      if (saved && CAT_CHARACTERS[saved]) {
        this.selectedId = saved;
      }
    } catch (e) {
      // localStorage may be restricted in some iframes
    }

    this.selectCharacterCard(this.selectedId, false);
  }

  initTurntable() {
    if (!this.viewportEl || !this.canvasEl) return;

    const width = this.viewportEl.clientWidth || 340;
    const height = this.viewportEl.clientHeight || 360;

    // Turntable Scene
    this.turntableScene = new THREE.Scene();
    this.turntableScene.background = null; // transparent background

    // Camera
    this.turntableCamera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    this.turntableCamera.position.set(0, 1.05, 3.2);
    this.turntableCamera.lookAt(0, 0.75, 0);

    // Renderer
    this.turntableRenderer = new THREE.WebGLRenderer({
      canvas: this.canvasEl,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.turntableRenderer.setSize(width, height);
    this.turntableRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.turntableRenderer.shadowMap.enabled = true;
    this.turntableRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.turntableRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.turntableRenderer.toneMappingExposure = 1.25;

    // Turntable Lighting
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 1.4);
    this.turntableScene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    this.turntableScene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa0c4ff, 1.0);
    fillLight.position.set(-3, 2, -1);
    this.turntableScene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffe5d9, 1.2);
    rimLight.position.set(0, 3, -3);
    this.turntableScene.add(rimLight);

    // Cute Pedestal Stage
    const pedestalGeom = new THREE.CylinderGeometry(0.85, 0.95, 0.14, 32);
    pedestalGeom.computeVertexNormals();
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.05,
      flatShading: false,
    });
    this.pedestalMesh = new THREE.Mesh(pedestalGeom, pedestalMat);
    this.pedestalMesh.position.set(0, -0.07, 0);
    this.pedestalMesh.receiveShadow = true;
    this.turntableScene.add(this.pedestalMesh);

    // Pedestal Rim Ring
    const ringGeom = new THREE.TorusGeometry(0.88, 0.03, 16, 32);
    ringGeom.rotateX(Math.PI / 2);
    ringGeom.computeVertexNormals();
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      roughness: 0.2,
      metalness: 0.85,
      flatShading: false,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.position.set(0, 0, 0);
    this.turntableScene.add(ringMesh);

    this.turntableClock = new THREE.Clock();
    this.animateTurntable = this.animateTurntable.bind(this);
    requestAnimationFrame(this.animateTurntable);
  }

  loadPreviewModel(characterId) {
    if (!this.turntableScene) return;

    // Remove existing preview cat
    if (this.previewCat) {
      this.turntableScene.remove(this.previewCat);
      if (this.previewMixer) {
        this.previewMixer.stopAllAction();
      }
      this.previewCat = null;
    }

    const builder = new CatModelBuilder(characterId);
    const { root } = builder.buildCatModel(characterId);
    this.previewCat = root;
    this.previewCat.position.set(0, 0, 0);
    this.previewCat.rotation.y = this.turntableRotation;
    this.turntableScene.add(this.previewCat);

    // Setup animations on the preview model
    const clips = CatAnimations.getClips();
    this.previewMixer = new THREE.AnimationMixer(this.previewCat);
    this.previewActions = {};

    clips.forEach(clip => {
      const action = this.previewMixer.clipAction(clip);
      this.previewActions[clip.name] = action;
    });

    if (this.previewActions[this.currentAnim]) {
      this.previewActions[this.currentAnim].play();
    } else if (this.previewActions['Idle']) {
      this.previewActions['Idle'].play();
    }
  }

  playPreviewAnimation(animName) {
    if (!this.previewActions || !this.previewActions[animName]) return;

    Object.values(this.previewActions).forEach(action => action.fadeOut(0.2));
    const nextAction = this.previewActions[animName];
    nextAction.reset().fadeIn(0.2).play();
    this.currentAnim = animName;
  }

  renderRosterCards() {
    if (!this.cardsContainer) return;
    this.cardsContainer.innerHTML = '';

    CHARACTER_LIST.forEach(char => {
      const card = document.createElement('div');
      card.className = `char-roster-card ${char.id === this.selectedId ? 'active' : ''}`;
      card.dataset.id = char.id;

      card.innerHTML = `
        <div class="card-glow"></div>
        <div class="card-avatar-wrap" style="border-color: ${char.themeColor}">
          <span class="card-avatar-emoji">${char.emoji}</span>
          <span class="card-badge-pill ${char.badgeClass}">${char.badge}</span>
        </div>
        <div class="card-meta">
          <div class="card-header-line">
            <h4 class="card-name">${char.name}</h4>
            <span class="card-tagline">${char.tagline}</span>
          </div>
          <span class="card-photo-ref">${char.imageBadge}</span>
          <p class="card-trait-mini">${char.trait}</p>
        </div>
        <div class="card-check-icon">✓</div>
      `;

      card.addEventListener('click', () => {
        this.selectCharacterCard(char.id, true);
      });

      this.cardsContainer.appendChild(card);
    });
  }

  selectCharacterCard(characterId, playAudio = true) {
    const char = CAT_CHARACTERS[characterId];
    if (!char) return;

    this.selectedId = characterId;

    // Update Card Active states
    const allCards = this.cardsContainer ? this.cardsContainer.querySelectorAll('.char-roster-card') : [];
    allCards.forEach(card => {
      card.classList.toggle('active', card.dataset.id === characterId);
    });

    // Update Info Panel
    if (this.nameEl) this.nameEl.textContent = char.name;
    if (this.badgeEl) {
      this.badgeEl.textContent = char.badge;
      this.badgeEl.className = `char-role-badge ${char.badgeClass}`;
    }
    if (this.titleEl) this.titleEl.textContent = `${char.breed} • ${char.tagline}`;
    if (this.quoteEl) this.quoteEl.textContent = char.quote;
    if (this.descEl) this.descEl.textContent = char.description;
    if (this.traitEl) this.traitEl.textContent = char.trait;
    if (this.imgBadgeEl) this.imgBadgeEl.textContent = `📸 ${char.imageBadge}`;
    if (this.floatingNameEl) this.floatingNameEl.textContent = char.name;
    if (this.floatingEmojiEl) this.floatingEmojiEl.textContent = char.emoji;

    // Update Stat Meters
    if (this.speedValEl) this.speedValEl.textContent = char.stats.speed;
    if (this.speedFillEl) this.speedFillEl.style.width = `${char.stats.speed}%`;

    if (this.cutenessValEl) this.cutenessValEl.textContent = char.stats.cuteness;
    if (this.cutenessFillEl) this.cutenessFillEl.style.width = `${char.stats.cuteness}%`;

    if (this.farmingValEl) this.farmingValEl.textContent = char.stats.farming;
    if (this.farmingFillEl) this.farmingFillEl.style.width = `${char.stats.farming}%`;

    if (this.energyValEl) this.energyValEl.textContent = char.stats.energy;
    if (this.energyFillEl) this.energyFillEl.style.width = `${char.stats.energy}%`;

    // Update Confirm Button Label
    if (this.confirmText) {
      this.confirmText.textContent = `Play as ${char.name}! 🐾`;
    }

    // Load 3D model in turntable
    this.loadPreviewModel(characterId);

    // Audio feedback
    if (playAudio && this.game && this.game.sound) {
      this.game.sound.playSelect();
      const pitch = characterId === 'sunny' ? 1.2 : (characterId === 'mochi' ? 0.85 : (characterId === 'snowball' ? 1.35 : 1.0));
      setTimeout(() => {
        this.game.sound.playMeow(pitch);
      }, 70);
    }
  }

  setupEventListeners() {
    // 1. Confirm Character & Start Play
    if (this.confirmBtn) {
      this.confirmBtn.addEventListener('click', () => {
        this.confirmSelection();
      });
    }

    // 2. Cancel / Close (when opened during gameplay)
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => {
        this.close();
      });
    }

    // 3. Animation Preview Buttons
    const animBtns = document.querySelectorAll('.preview-anim-btn');
    animBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        animBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const anim = btn.dataset.anim;
        this.playPreviewAnimation(anim);
      });
    });

    // 4. Mouse & Touch Turntable Orbit Drag
    if (this.viewportEl) {
      const onStart = (clientX) => {
        this.isDragging = true;
        this.previousMouseX = clientX;
      };

      const onMove = (clientX) => {
        if (!this.isDragging) return;
        const deltaX = clientX - this.previousMouseX;
        this.previousMouseX = clientX;
        this.targetRotation += deltaX * 0.012;
      };

      const onEnd = () => {
        this.isDragging = false;
      };

      this.viewportEl.addEventListener('mousedown', (e) => onStart(e.clientX));
      window.addEventListener('mousemove', (e) => onMove(e.clientX));
      window.addEventListener('mouseup', onEnd);

      this.viewportEl.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) onStart(e.touches[0].clientX);
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) onMove(e.touches[0].clientX);
      }, { passive: true });

      window.addEventListener('touchend', onEnd);
    }

    // Window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  handleResize() {
    if (!this.viewportEl || !this.turntableRenderer || !this.turntableCamera) return;
    const width = this.viewportEl.clientWidth || 340;
    const height = this.viewportEl.clientHeight || 360;
    this.turntableCamera.aspect = width / height;
    this.turntableCamera.updateProjectionMatrix();
    this.turntableRenderer.setSize(width, height);
  }

  confirmSelection() {
    const char = CAT_CHARACTERS[this.selectedId];
    if (!char) return;

    try {
      localStorage.setItem('my_farm_kitty', this.selectedId);
    } catch (e) {}

    // Tell game to switch character
    if (this.game) {
      this.game.selectCharacter(this.selectedId);
      if (this.game.sound) {
        this.game.sound.playQuestComplete();
        const pitch = this.selectedId === 'sunny' ? 1.25 : (this.selectedId === 'mochi' ? 0.9 : (this.selectedId === 'snowball' ? 1.4 : 1.0));
        setTimeout(() => this.game.sound.playMeow(pitch), 250);
        this.game.sound.startMusic();
      }
      if (this.game.ui) {
        this.game.ui.showToast(`🐾 Playing as ${char.name}! ${char.trait}`);
      }
    }

    this.close();
  }

  open(canClose = true) {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('hidden');

    if (this.cancelBtn) {
      if (canClose) {
        this.cancelBtn.classList.remove('hidden');
      } else {
        this.cancelBtn.classList.add('hidden');
      }
    }

    this.handleResize();
    this.loadPreviewModel(this.selectedId);
  }

  close() {
    if (!this.modalEl) return;
    this.modalEl.classList.add('hidden');
  }

  animateTurntable() {
    requestAnimationFrame(this.animateTurntable);

    const delta = this.turntableClock ? this.turntableClock.getDelta() : 0.016;

    // Smooth turntable rotation interpolation
    if (!this.isDragging) {
      // Gentle continuous ambient rotation
      this.targetRotation += delta * 0.45;
    }

    const damp = 1 - Math.exp(-10.0 * delta);
    this.turntableRotation += (this.targetRotation - this.turntableRotation) * damp;

    if (this.previewCat) {
      this.previewCat.rotation.y = this.turntableRotation;
    }

    if (this.previewMixer) {
      this.previewMixer.update(delta);
    }

    if (this.turntableRenderer && this.turntableScene && this.turntableCamera) {
      this.turntableRenderer.render(this.turntableScene, this.turntableCamera);
    }
  }
}
