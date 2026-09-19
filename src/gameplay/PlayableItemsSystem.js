import * as THREE from 'three';

export class PlayableItemsSystem {
  constructor(scene, soundSystem, getTerrainHeight, worldPhysics = null) {
    this.scene = scene;
    this.sound = soundSystem;
    this.worldPhysics = worldPhysics;
    this.getTerrainHeight = getTerrainHeight || ((x, z) => 0);
    this.items = [];
    this.materials = this.createMaterials();
  }

  createMaterials() {
    return {
      yarnPink: new THREE.MeshStandardMaterial({ color: 0xff4d6d, roughness: 0.8, flatShading: true }),
      yarnBlue: new THREE.MeshStandardMaterial({ color: 0x48cae4, roughness: 0.8, flatShading: true }),
      yarnGold: new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.8, flatShading: true }),
      catnipGreen: new THREE.MeshStandardMaterial({ color: 0x52b788, roughness: 0.6, flatShading: true }),
      fishOrange: new THREE.MeshStandardMaterial({ color: 0xff85a1, roughness: 0.5, flatShading: true }),
      bowlWhite: new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 0.3, flatShading: true }),
      milkWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, flatShading: true }),
      boxBrown: new THREE.MeshStandardMaterial({ color: 0xc48b59, roughness: 0.9, flatShading: true }),
      postWood: new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.8, flatShading: true }),
      sparkleMat: new THREE.MeshBasicMaterial({ color: 0xfff3b0 })
    };
  }

  registerItem(itemData) {
    itemData.group.userData.type = 'collectible';
    this.worldPhysics?.register(itemData.group);
    this.items.push(itemData);
  }

  spawnFurBall(pos, colorType = 'pink') {
    const group = new THREE.Group();
    group.name = 'Playable_FurBall';

    // Yarn ball body
    const ballGeom = new THREE.DodecahedronGeometry(0.32, 2);
    const mat = colorType === 'blue' ? this.materials.yarnBlue : (colorType === 'gold' ? this.materials.yarnGold : this.materials.yarnPink);
    const ballMesh = new THREE.Mesh(ballGeom, mat);
    ballMesh.castShadow = true;
    group.add(ballMesh);

    // Decorative loose yarn strand wrapped around
    const strandGeom = new THREE.TorusGeometry(0.33, 0.04, 6, 12);
    const strand = new THREE.Mesh(strandGeom, mat);
    strand.rotation.x = Math.PI / 3;
    group.add(strand);

    const groundY = this.getTerrainHeight(pos.x, pos.z);
    group.position.set(pos.x, groundY + 0.32, pos.z);
    this.scene.add(group);

    const itemData = {
      id: Symbol(),
      type: 'furball',
      name: 'Yarn Fur Ball',
      group,
      ballMesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        2.5,
        (Math.random() - 0.5) * 2
      ),
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      ),
      radius: 0.35,
      moodBoost: 25,
      cooldown: 0
    };

    this.registerItem(itemData);
    if (this.sound) this.sound.playPop();
    return itemData;
  }

  spawnCatnipMouse(pos) {
    const group = new THREE.Group();
    group.name = 'Playable_Catnip';

    // Cute felt mouse toy
    const bodyGeom = new THREE.ConeGeometry(0.2, 0.45, 6);
    bodyGeom.rotateX(-Math.PI / 2);
    const body = new THREE.Mesh(bodyGeom, this.materials.catnipGreen);
    body.castShadow = true;
    group.add(body);

    const earGeom = new THREE.SphereGeometry(0.06, 6, 6);
    const earL = new THREE.Mesh(earGeom, this.materials.fishOrange);
    earL.position.set(-0.1, 0.12, -0.05);
    const earR = earL.clone();
    earR.position.x = 0.1;
    group.add(earL);
    group.add(earR);

    const groundY = this.getTerrainHeight(pos.x, pos.z);
    group.position.set(pos.x, groundY + 0.2, pos.z);
    this.scene.add(group);

    const itemData = {
      id: Symbol(),
      type: 'catnip',
      name: 'Squeaky Catnip Toy',
      group,
      velocity: new THREE.Vector3(0, 1.8, 0),
      angularVelocity: new THREE.Vector3(0, 3, 0),
      radius: 0.3,
      moodBoost: 35,
      cooldown: 0
    };

    this.registerItem(itemData);
    if (this.sound) this.sound.playPop();
    return itemData;
  }

  spawnFishSnack(pos) {
    const group = new THREE.Group();
    group.name = 'Playable_FishSnack';

    // Cute fish snack model
    const bodyGeom = new THREE.SphereGeometry(0.22, 8, 8);
    bodyGeom.scale(1.4, 0.6, 0.5);
    const body = new THREE.Mesh(bodyGeom, this.materials.fishOrange);
    body.castShadow = true;
    group.add(body);

    // Tail fin
    const tailGeom = new THREE.ConeGeometry(0.15, 0.25, 4);
    tailGeom.rotateZ(Math.PI / 2);
    const tail = new THREE.Mesh(tailGeom, this.materials.fishOrange);
    tail.position.set(-0.3, 0, 0);
    group.add(tail);

    const groundY = this.getTerrainHeight(pos.x, pos.z);
    group.position.set(pos.x, groundY + 0.2, pos.z);
    this.scene.add(group);

    const itemData = {
      id: Symbol(),
      type: 'fish',
      name: 'Tasty Fish Treat',
      group,
      velocity: new THREE.Vector3(0, 2.0, 0),
      angularVelocity: new THREE.Vector3(0, 4, 0),
      radius: 0.3,
      moodBoost: 50,
      cooldown: 0
    };

    this.registerItem(itemData);
    if (this.sound) this.sound.playPop();
    return itemData;
  }

  spawnMilkBowl(pos) {
    const group = new THREE.Group();
    group.name = 'Playable_MilkBowl';

    // Ceramic Bowl
    const bowlGeom = new THREE.CylinderGeometry(0.35, 0.25, 0.2, 12);
    const bowl = new THREE.Mesh(bowlGeom, this.materials.bowlWhite);
    bowl.castShadow = true;
    group.add(bowl);

    // Warm Milk Liquid
    const milkGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.05, 12);
    const milk = new THREE.Mesh(milkGeom, this.materials.milkWhite);
    milk.position.y = 0.08;
    group.add(milk);

    const groundY = this.getTerrainHeight(pos.x, pos.z);
    group.position.set(pos.x, groundY + 0.1, pos.z);
    this.scene.add(group);

    const itemData = {
      id: Symbol(),
      type: 'milk',
      name: 'Warm Milk Bowl 🥛',
      group,
      velocity: new THREE.Vector3(0, 1.2, 0),
      angularVelocity: new THREE.Vector3(0, 0, 0),
      radius: 0.35,
      moodBoost: 40,
      cooldown: 0
    };

    this.registerItem(itemData);
    if (this.sound) this.sound.playPop();
    return itemData;
  }

  spawnCardboardBox(pos) {
    const group = new THREE.Group();
    group.name = 'Playable_CardboardBox';

    // Brown cardboard box
    const boxGeom = new THREE.BoxGeometry(0.8, 0.5, 0.8);
    const box = new THREE.Mesh(boxGeom, this.materials.boxBrown);
    box.castShadow = true;
    group.add(box);

    const groundY = this.getTerrainHeight(pos.x, pos.z);
    group.position.set(pos.x, groundY + 0.25, pos.z);
    this.scene.add(group);

    const itemData = {
      id: Symbol(),
      type: 'box',
      name: 'Cozy Cardboard Box 📦',
      group,
      velocity: new THREE.Vector3(0, 1.5, 0),
      angularVelocity: new THREE.Vector3(0, 2, 0),
      radius: 0.4,
      moodBoost: 60,
      cooldown: 0
    };

    this.registerItem(itemData);
    if (this.sound) this.sound.playPop();
    return itemData;
  }

  spawnScratchingPost(pos) {
    const group = new THREE.Group();
    group.name = 'Playable_ScratchingPost';

    // Post Base
    const baseGeom = new THREE.BoxGeometry(0.7, 0.12, 0.7);
    const base = new THREE.Mesh(baseGeom, this.materials.postWood);
    base.castShadow = true;
    group.add(base);

    // Carpet Post
    const postGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.9, 8);
    const post = new THREE.Mesh(postGeom, this.materials.catnipGreen);
    post.position.y = 0.45;
    post.castShadow = true;
    group.add(post);

    const groundY = this.getTerrainHeight(pos.x, pos.z);
    group.position.set(pos.x, groundY + 0.06, pos.z);
    this.scene.add(group);

    const itemData = {
      id: Symbol(),
      type: 'post',
      name: 'Plush Scratching Post 🛋️',
      group,
      velocity: new THREE.Vector3(0, 1.5, 0),
      angularVelocity: new THREE.Vector3(0, 0, 0),
      radius: 0.4,
      moodBoost: 45,
      cooldown: 0
    };

    this.registerItem(itemData);
    if (this.sound) this.sound.playPop();
    return itemData;
  }

  spawnHeartBubbles(pos) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff4d6d';
    ctx.font = 'bold 80px Fredoka, sans-serif';
    ctx.fillText('💖', 10, 90);

    const texture = new THREE.CanvasTexture(canvas);
    for (let i = 0; i < 4; i++) {
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.9 });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.5, 0.5, 1);

      sprite.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        0.4 + i * 0.2,
        (Math.random() - 0.5) * 0.4
      ));

      this.scene.add(sprite);

      const startTime = Date.now();
      const anim = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        sprite.position.y += 0.015;
        sprite.material.opacity = Math.max(0, 0.9 - elapsed * 0.8);
        if (elapsed < 1.1) {
          requestAnimationFrame(anim);
        } else {
          this.scene.remove(sprite);
          sprite.material.dispose();
        }
      };
      requestAnimationFrame(anim);
    }
  }

  update(delta, catPosition, onInteractCallback) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.cooldown > 0) item.cooldown -= delta;

      // Physics update
      item.group.position.x += item.velocity.x * delta;
      item.group.position.y += item.velocity.y * delta;
      item.group.position.z += item.velocity.z * delta;

      // Friction & Gravity
      item.velocity.x *= 0.92;
      item.velocity.z *= 0.92;
      item.velocity.y -= 12.0 * delta;

      // Ground bounce
      const groundY = this.getTerrainHeight(item.group.position.x, item.group.position.z);
      if (item.group.position.y <= groundY + item.radius) {
        item.group.position.y = groundY + item.radius;
        if (Math.abs(item.velocity.y) > 0.5) {
          item.velocity.y = -item.velocity.y * 0.5; // bounce dampening
        } else {
          item.velocity.y = 0;
        }
      }

      // Rotation animation
      item.group.rotation.x += item.angularVelocity.x * delta;
      item.group.rotation.y += item.angularVelocity.y * delta;
      item.group.rotation.z += item.angularVelocity.z * delta;
      item.angularVelocity.multiplyScalar(0.95);

      // Check interaction with Cat
      if (catPosition) {
        const dist = item.group.position.distanceTo(catPosition);

        // Batting / Kick range (1.2m)
        if (dist < item.radius + 0.85 && item.cooldown <= 0) {
          // Push item away from cat (cat kicks the toy!)
          const pushDir = new THREE.Vector3().subVectors(item.group.position, catPosition).normalize();
          if (pushDir.lengthSq() < 0.001) pushDir.set(0, 0, 1);

          item.velocity.x += pushDir.x * 6.5;
          item.velocity.y = 3.5 + Math.random() * 2.0; // Fun pop jump!
          item.velocity.z += pushDir.z * 6.5;

          item.angularVelocity.set(
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12
          );

          item.cooldown = 0.6; // prevent rapid overlap triggers

          if (this.sound) {
            this.sound.playPop();
            this.sound.playPurr();
          }

          this.spawnHeartBubbles(item.group.position);

          // Callback to boost cat mood & show toast
          if (onInteractCallback) {
            onInteractCallback(item);
          }

          // Consumable treats get removed on interact
          if (item.type === 'fish' || item.type === 'milk') {
            this.worldPhysics?.unregister(item.group);
            this.scene.remove(item.group);
            this.items.splice(i, 1);
          }
        }
      }
    }
  }
}