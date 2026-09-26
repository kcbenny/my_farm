import * as THREE from 'three';

export class MapSystem {
  constructor(game) {
    this.game = game;

    // Fixed Landmark Positions in World Space (x, z)
    this.landmarks = {
      shop: { id: 'shop', name: 'Cute Shop 🛒', x: -10.0, z: -4.0, icon: '🛒', color: '#ffb703' },
      home: { id: 'home', name: 'Kitty Home 🏰', x: 12.5, z: 12.5, icon: '🏰', color: '#ff758f' },
      crops: { id: 'crops', name: 'Garden Plots 🌾', x: 2.0, z: 0.0, icon: '🌾', color: '#52b788' },
      barn: { id: 'barn', name: 'Rustic Barn 🛖', x: -14.0, z: -22.0, icon: '🛖', color: '#bc4749' },
      windmill: { id: 'windmill', name: 'Windmill ⚙️', x: 22.0, z: -16.0, icon: '⚙️', color: '#48cae4' },
      pond: { id: 'pond', name: 'Cozy Pond 🌊', x: -18.0, z: 10.0, icon: '🌊', color: '#0077b6' },
      secretPond: { id: 'secretPond', name: 'Secret Fishing Spot 🎣', x: 42.0, z: 30.0, icon: '🎣', color: '#69f5c8' }
    };

    // Active destination for path drawing
    this.selectedDestinationKey = 'shop'; // Default points to Shop

    // 3D Path Waypoint Guide Meshes
    this.pathDots = [];
    this.init3DPathDots();

    // Setup Map UI Elements
    this.createMapDOM();
    this.setupEventListeners();
  }

  createMapDOM() {
    // 1. HUD Minimap Container (Top-Left)
    const minimapDiv = document.createElement('div');
    minimapDiv.id = 'minimap-container';
    minimapDiv.className = 'minimap-container';
    minimapDiv.title = 'Click to open Full World Map [M]';

    minimapDiv.innerHTML = `
      <div class="minimap-header">
        <span class="minimap-title">🧭 MAP</span>
        <button id="btn-expand-map" class="minimap-expand-btn">🔍</button>
      </div>
      <canvas id="minimap-canvas" width="160" height="160"></canvas>
      <div class="minimap-footer">
        <span id="minimap-target-label">Target: 🛒 Shop</span>
      </div>
    `;

    document.body.appendChild(minimapDiv);

    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    this.targetLabelEl = document.getElementById('minimap-target-label');

    // 2. Full World Map Modal Overlay
    const mapModalDiv = document.createElement('div');
    mapModalDiv.id = 'world-map-modal';
    mapModalDiv.className = 'world-map-modal-overlay hidden';

    mapModalDiv.innerHTML = `
      <div class="world-map-card">
        <div class="world-map-header">
          <div class="world-map-title">
            <span class="map-icon">🗺️</span>
            <div>
              <h2>Cozy Farm World Map</h2>
              <p>Track your position, find the shop & kitty home, and navigate with path guides!</p>
            </div>
          </div>
          <button id="btn-close-map" class="icon-btn close-btn">✕</button>
        </div>

        <div class="world-map-body">
          <div class="canvas-map-wrapper">
            <canvas id="fullmap-canvas" width="400" height="400"></canvas>
          </div>

          <div class="world-map-sidebar">
            <h3>📍 Destinations & Waypoints</h3>
            <div class="destination-buttons">
              <button class="dest-btn active" data-dest="shop">
                <span class="dest-icon">🛒</span>
                <div class="dest-info">
                  <strong>Cute Shop Stall</strong>
                  <span id="dist-shop">0m away</span>
                </div>
              </button>
              <button class="dest-btn" data-dest="home">
                <span class="dest-icon">🏰</span>
                <div class="dest-info">
                  <strong>Kitty Home Construction</strong>
                  <span id="dist-home">0m away</span>
                </div>
              </button>
              <button class="dest-btn" data-dest="crops">
                <span class="dest-icon">🌾</span>
                <div class="dest-info">
                  <strong>Garden Crops Plots</strong>
                  <span id="dist-crops">0m away</span>
                </div>
              </button>
              <button class="dest-btn" data-dest="barn">
                <span class="dest-icon">🛖</span>
                <div class="dest-info">
                  <strong>Rustic Barn</strong>
                  <span id="dist-barn">0m away</span>
                </div>
              </button>
              <button class="dest-btn" data-dest="windmill">
                <span class="dest-icon">⚙️</span>
                <div class="dest-info">
                  <strong>Windmill Tower</strong>
                  <span id="dist-windmill">0m away</span>
                </div>
              </button>
              <button class="dest-btn" data-dest="secretPond">
                <span class="dest-icon">🎣</span>
                <div class="dest-info">
                  <strong>Secret Fishing Spot</strong>
                  <span id="dist-secretPond">0m away</span>
                </div>
              </button>
            </div>

            <button id="btn-travel-secret" class="dest-btn map-travel-btn">✨ Travel to Secret Fishing Spot</button>

            <div class="map-legend">
              <p>🐱 <strong>Yellow Arrow:</strong> You (Kitty)</p>
              <p>✨ <strong>Glowing Line:</strong> Path Guide</p>
              <p>🔴 <strong>Red Dots:</strong> Flying Birds & Pests</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(mapModalDiv);

    this.fullmapModal = document.getElementById('world-map-modal');
    this.fullmapCanvas = document.getElementById('fullmap-canvas');
    this.fullmapCtx = this.fullmapCanvas.getContext('2d');
  }

  setupEventListeners() {
    // Open full map on clicking minimap
    const minimapDiv = document.getElementById('minimap-container');
    if (minimapDiv) {
      minimapDiv.addEventListener('click', () => {
        this.fullmapModal.classList.remove('hidden');
      });
    }

    const closeMapBtn = document.getElementById('btn-close-map');
    if (closeMapBtn) {
      closeMapBtn.addEventListener('click', () => {
        this.fullmapModal.classList.add('hidden');
      });
    }

    const travelBtn = document.getElementById('btn-travel-secret');
    if (travelBtn) {
      travelBtn.addEventListener('click', () => {
        if (this.game.isAtSecretFishingSpot()) {
          this.game.returnToFarm();
        } else {
          this.game.travelToFishingSpot();
        }
        this.fullmapModal.classList.add('hidden');
      });
      this.travelBtn = travelBtn;
    }

    // Destination Select Buttons
    const destBtns = document.querySelectorAll('.dest-btn');
    destBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        destBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const destKey = btn.dataset.dest;
        this.setDestination(destKey);
      });
    });

    // Toggle Map with Key 'M'
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        this.fullmapModal.classList.toggle('hidden');
      }
    });
  }

  setDestination(key) {
    if (this.landmarks[key]) {
      this.selectedDestinationKey = key;
      const lm = this.landmarks[key];
      if (this.targetLabelEl) {
        this.targetLabelEl.textContent = `Target: ${lm.name}`;
      }
      this.game.ui.showToast(`🎯 Path Navigation set to: ${lm.name}`);
    }
  }

  init3DPathDots() {
    // Spawns 12 floating glowing path dot markers in 3D scene
    this.pathGroup = new THREE.Group();
    this.pathGroup.name = 'Navigation_Path_Dots';

    const dotGeom = new THREE.CylinderGeometry(0.22, 0.25, 0.06, 12);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.8 });

    for (let i = 0; i < 15; i++) {
      const dot = new THREE.Mesh(dotGeom, dotMat);
      dot.visible = false;
      this.pathGroup.add(dot);
      this.pathDots.push(dot);
    }

    this.game.scene.add(this.pathGroup);
  }

  update(delta, playerPos, playerRotation) {
    if (!playerPos) return;

    // 1. Render HUD Minimap (160x160 canvas)
    this.renderCanvasMap(this.minimapCtx, 160, 160, playerPos, playerRotation, true);

    // 2. Render Full Map Modal if visible (400x400 canvas)
    if (this.fullmapModal && !this.fullmapModal.classList.contains('hidden')) {
      this.renderCanvasMap(this.fullmapCtx, 400, 400, playerPos, playerRotation, false);
      this.updateSidebarDistances(playerPos);
      this.updateTravelButton();
    }

    // 3. Update 3D World Waypoint Path Guide
    this.update3DPathDots(playerPos);
  }

  updateSidebarDistances(playerPos) {
    for (const [key, lm] of Object.entries(this.landmarks)) {
      const el = document.getElementById(`dist-${key}`);
      if (el) {
        const dx = lm.x - playerPos.x;
        const dz = lm.z - playerPos.z;
        const dist = Math.round(Math.sqrt(dx * dx + dz * dz));
        el.textContent = `${dist}m away`;
      }
    }
  }

  updateTravelButton() {
    if (!this.travelBtn) return;
    this.travelBtn.textContent = this.game.isAtSecretFishingSpot()
      ? '✨ Return to Cozy Farm'
      : '✨ Travel to Secret Fishing Spot';
  }

  update3DPathDots(playerPos) {
    // Only show path dots in 3D world when the Full World Map modal is OPEN!
    const isMapOpen = this.fullmapModal && !this.fullmapModal.classList.contains('hidden');
    if (!isMapOpen) {
      for (let i = 0; i < this.pathDots.length; i++) {
        this.pathDots[i].visible = false;
      }
      return;
    }

    const target = this.landmarks[this.selectedDestinationKey];
    if (!target) return;

    const startX = playerPos.x;
    const startZ = playerPos.z;
    const endX = target.x;
    const endZ = target.z;

    const totalDist = Math.sqrt((endX - startX) ** 2 + (endZ - startZ) ** 2);

    for (let i = 0; i < this.pathDots.length; i++) {
      const dot = this.pathDots[i];

      if (totalDist < 1.5) {
        dot.visible = false;
        continue;
      }

      // Static distribution along path (no sliding or rotation movement!)
      const t = (i + 1) / (this.pathDots.length + 1);
      const px = startX + (endX - startX) * t;
      const pz = startZ + (endZ - startZ) * t;
      const py = this.game.farm ? this.game.farm.getTerrainHeight(px, pz) + 0.12 : 0.12;

      dot.position.set(px, py, pz);
      dot.rotation.y = 0;
      dot.visible = true;
    }
  }

  renderCanvasMap(ctx, width, height, playerPos, playerRotation, isMinimap) {
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // Include the hidden forest clearing beyond the main farm boundary.
    const scale = width / 110.0;

    // World to Canvas coord conversion
    const worldToCanvas = (wx, wz) => {
      return {
        cx: centerX + wx * scale,
        cy: centerY + wz * scale
      };
    };

    // Background Map Fill
    ctx.fillStyle = '#70b045';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let g = -35; g <= 35; g += 10) {
      const p1 = worldToCanvas(g, -38);
      const p2 = worldToCanvas(g, 38);
      ctx.beginPath();
      ctx.moveTo(p1.cx, p1.cy);
      ctx.lineTo(p2.cx, p2.cy);
      ctx.stroke();

      const p3 = worldToCanvas(-38, g);
      const p4 = worldToCanvas(38, g);
      ctx.beginPath();
      ctx.moveTo(p3.cx, p3.cy);
      ctx.lineTo(p4.cx, p4.cy);
      ctx.stroke();
    }

    // Outer Boundary Circle
    const edge = worldToCanvas(38, 0);
    ctx.strokeStyle = '#2d6a4f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, (38 * scale), 0, Math.PI * 2);
    ctx.stroke();

    // Draw Navigation Path Line from Player to Selected Destination
    const selectedTarget = this.landmarks[this.selectedDestinationKey];
    if (selectedTarget) {
      const pPlayer = worldToCanvas(playerPos.x, playerPos.z);
      const pTarget = worldToCanvas(selectedTarget.x, selectedTarget.z);

      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = isMinimap ? 3 : 4;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(pPlayer.cx, pPlayer.cy);
      ctx.lineTo(pTarget.cx, pTarget.cy);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
    }

    // Draw Pests / Flying Birds Radar Blips
    if (this.game.pestSystem && this.game.pestSystem.pests) {
      this.game.pestSystem.pests.forEach(pest => {
        if (pest.state === 'fleeing') return;
        const pPest = worldToCanvas(pest.mesh.position.x, pest.mesh.position.z);
        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.arc(pPest.cx, pPest.cy, isMinimap ? 3 : 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw Landmark Icons & Labels
    for (const [key, lm] of Object.entries(this.landmarks)) {
      const pLm = worldToCanvas(lm.x, lm.z);

      // Highlight selected target
      if (key === this.selectedDestinationKey) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pLm.cx, pLm.cy, isMinimap ? 10 : 16, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = lm.color;
      ctx.beginPath();
      ctx.arc(pLm.cx, pLm.cy, isMinimap ? 5 : 8, 0, Math.PI * 2);
      ctx.fill();

      // Text Icon / Label
      ctx.font = isMinimap ? '11px sans-serif' : '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lm.icon, pLm.cx, pLm.cy - (isMinimap ? 11 : 16));
    }

    // Draw Player Icon & Facing Direction Wedge ("Myself")
    const pPlayer = worldToCanvas(playerPos.x, playerPos.z);

    ctx.save();
    ctx.translate(pPlayer.cx, pPlayer.cy);
    ctx.rotate(playerRotation);

    // Vision cone wedge
    ctx.fillStyle = 'rgba(255, 208, 0, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, isMinimap ? 16 : 24, -0.4, 0.4);
    ctx.closePath();
    ctx.fill();

    // Player Direction Arrow / Dot
    ctx.fillStyle = '#ffb703';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, isMinimap ? 8 : 12);
    ctx.lineTo(isMinimap ? -6 : -9, isMinimap ? -6 : -9);
    ctx.lineTo(0, isMinimap ? -3 : -4);
    ctx.lineTo(isMinimap ? 6 : 9, isMinimap ? -6 : -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}