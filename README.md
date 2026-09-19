# 🐾 Ginger Tabby Cat: Cozy 3D Farm Game & WebGL Asset

A web-ready, lightweight, and low-poly 3D game scene and character asset bundle built with **Three.js** and **Vite**.

## 🎮 Character & Environment Features

### 🐱 Character Model
- **Chubby Ginger Tabby Cat**: Bipedal, low-poly (<15k triangles) stylized geometry with warm ginger fur, tabby stripe patterns, and cream/white belly patch.
- **Expressive Face**: Big anime sparkle eyes, cute pink nose, cheeks, whiskers, and ear tufts.
- **Equipped Gear**:
  - Olive green **military helmet** with chin strap, rivets, and brass badge.
  - Folded **red bandana** tied around neck.
  - Cartoon green **peashooter plant-gun** with flared trumpet muzzle and vine handle.

### 🌾 Farm Environment
- **Rolling Green Grass Hills**: Stylized low-poly terrain with gentle hill slopes and stepped elevations.
- **Winding Dirt Path**: Curving pathway with stepping stones connecting all points of interest.
- **Rustic Wooden Barn Silhouette**: Background barn with weathered red wood, gambrel roof, hay bales, silo tower, and warm glowing interior.
- **Interactive Farm Elements**:
  - Rotating Windmill with wooden sails
  - Cozy Pond with water lily pads, blossoms, and wooden fishing dock
  - Raised Garden Beds with harvestable **Carrots**, **Pumpkins**, **Cabbages**, and **Sunflowers**
  - Wildflowers (yellow, red, purple) and red-capped mushrooms
- **PBR & Ambient Lighting**: Baked-style soft hemisphere lighting + warm directional sunlight with smooth shadow cascades.

---

## 🎬 Embedded Animation Clips (.GLB Ready)

1. **`Idle`**: Subtle breathing (chest/belly pulse) and rhythmic S-curve tail sway loop.
2. **`Walk`**: Bipedal waddling walk cycle with hip roll, alternating leg swings, arm pumping, and head bobbing.
3. **`Action`**: Combat shooting stance with peashooter plant-gun muzzle charge, recoil shockwave, and projectile launch.
4. **`Gather`**: Bending down to ground level with forward paws plucking ripe vegetables, followed by a happy standing flourish.

---

## 🕹️ Controls

| Action | Desktop / Keyboard | Mobile / Touch |
|---|---|---|
| **Move / Waddle** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or Arrow Keys | Virtual Touch Joystick |
| **Sprint** | <kbd>Shift</kbd> | - |
| **Hop / Jump** | <kbd>Space</kbd> | **HOP** Button |
| **Action (Shoot Pea)** | <kbd>Left Click</kbd> or <kbd>F</kbd> | **SHOOT** Button |
| **Gather (Harvest)** | <kbd>E</kbd> or <kbd>Enter</kbd> | **GATHER** Button |
| **Camera Orbit & Zoom** | <kbd>Right Click Drag</kbd> + <kbd>Scroll Wheel</kbd> | Touch Drag & Pinch |

---

## 📦 1-Click .GLB Export
Open the in-game **Model Viewer (🔍)** to:
- Test and switch between `Idle`, `Walk`, `Action`, and `Gather` animation clips.
- Toggle helmet, bandana, and peashooter visibility.
- Test different lighting presets (Day, Sunset, Night, Studio).
- Click **"Download Character .GLB"** to export the model with all 4 embedded animation clips.
- Click **"Download Full Farm Scene .GLB"** to export the entire 3D world.

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production deployment
npm run build
```

## Scene Physics And Placement

`src/gameplay/WorldPhysics.js` owns the classified scene registry. The render loop updates world matrices/colliders before player movement, clamps the final player position after gravity, resolves the camera arm, and updates the placement preview every frame. This is kinematic Three.js physics; it does not require Cannon or Rapier.

- Mesh `userData.type` or `userData.category` takes precedence over names. Supported roles: `road`, `terrain`, `grass`, `farmland`, `house`, `farm`, `tree`, `crop`, `collectible`, `obstacle`. `path`, `dirt_path`, `ground`, `soil`, `structure`, and `fence` are aliases. Children inherit their parent's role unless they specify another role or match a naming convention. Set `userData.physics = false` to exclude a subtree.
- Roads/terrain/grass/soil are double-sided downward-ray targets, never blocking hitboxes. The highest surface at the current X/Z determines ground height, even when the player starts below it. The grounded pivot is `surfaceHeight + playerPivotOffset`; jumping adds a nonnegative offset. Movement is substepped, including vertical collision checks.
- Obstacles use individual mesh OBBs, not a box around an entire building/diorama. Colliders follow transform and position-buffer updates. Crops and collectibles register as nonblocking triggers; existing proximity/E interactions remain intact.
- Reference heights: player 1.8, named house door 2.2, tree 4, house/farm fallback 5 units. Scaling is uniform and measured with `Box3.setFromObject`. Pass `targetHeight` to override the fallback or `null` to preserve authored scale. Unnamed imported containers normalize their named children. Load a complete pre-scaled world with explicit surface metadata and preserved scale rather than scaling it as one house.
- Camera rays cover the target-to-camera segment and near-plane corners, retract immediately at geometry, and smoothly recover distance. Double-sided proxy materials detect reversed faces without modifying rendered materials. If the target is enclosed by a solid mesh, only that mesh temporarily fades; original shared materials are restored when clear. Camera near plane remains 0.1.
- Road no-build zones use per-mesh world AABBs, conservatively rejecting footprint overlap. Placement also raycasts the center/corners/edge midpoints and accepts only grass or farmland. There is no off-mesh or generic-terrain build fallback. Procedural structures, plots, trees, campfires, fences, tiles, and decorations use these checks.

### Home Placement

Press **B** before constructing the home to enter/exit placement mode. Point at ground (screen center when pointer-locked): green is valid, red is restricted. **E** or **left click** confirms a valid site; **Escape** cancels. The preview covers the full future roof footprint. Construction still uses the existing home guide/material costs. Placement is revalidated before upgrades or seed planting; rejected actions consume no resources. Built homes cannot be relocated.

### Imported Assets

Both loaders normalize and classify assets; supplying the world registry also validates placement and registers physics:

```js
import * as THREE from 'three';
import { GLTFExportManager } from './src/gameplay/GLTFExportManager.js';

const worldPhysics = window.farmGame.farm.physics;
const gltf = await GLTFExportManager.loadDracoGLTF('/models/house.glb', {
  worldPhysics,
  type: 'house',
  position: new THREE.Vector3(20, 0, 10),
});

const tree = await GLTFExportManager.loadOBJ('/models/tree.obj', {
  worldPhysics,
  type: 'tree',
  targetHeight: 4,
  position: new THREE.Vector3(25, 0, 10),
});
```

Invalid sites reject the loader promise with an `Invalid placement` error. Use `worldPhysics.findPlacement(position, footprintSize)` to find an alternative. For authored roads/terrain, pass `targetHeight: null, validate: false` explicitly, then register them before placing other assets. Call `worldPhysics.unregister(root)` before removing registered objects. OBJLoader handles geometry/material slots; external MTL textures require a separate MTLLoader pipeline.

OBBs are tight boxes, not exact concave triangle colliders. Split concave structures into authored mesh parts to preserve doorways. Static environmental geometry and rigid transforms are supported; skinned/morph-deformed collision meshes and sheared hierarchies need separately authored rigid collision meshes. Road AABBs can conservatively exclude some soil alongside diagonal roads. The highest-surface rule is intentional; stacked tunnels/bridges need layer-aware navigation.

### Debugging And Tests

Open `http://localhost:3000/?physicsDebug=1` for collider bounds, a downward ground arrow, classification counts, placement reasons, and below-ground recovery logs. In the browser console, inspect `farmGame.farm.physics.stats()`.

```bash
node --test src/gameplay/WorldPhysics.test.js
npm run build
```
