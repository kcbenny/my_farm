import * as THREE from 'three';
import { CatModelBuilder } from './CatModelBuilder.js';
import { CatAnimations } from './CatAnimations.js';

export class CatCharacter {
  constructor(scene, characterType = 'cozy') {
    this.scene = scene;
    this.characterType = characterType;
    const builder = new CatModelBuilder(characterType);
    const { root, bones } = builder.buildCatModel(characterType);

    this.mesh = root;
    this.bones = bones;
    this.clips = CatAnimations.getClips();

    this.mixer = new THREE.AnimationMixer(this.mesh);
    this.actions = {};
    this.currentActionName = 'Idle';

    // Character Mood State (0 to 100%)
    this.mood = 100;
    this.moodTimer = 0;

    // Slower mood decay for Mochi (50% slower)
    this.moodDecayInterval = (characterType === 'mochi') ? 7.0 : 3.5;

    // Idle timer for 20-second Sleep Mode
    this.idleTimer = 0;
    this.isSleeping = false;

    // Head look-at targeting
    this.lookTargetPos = null;

    // Zzz particles
    this.zzzParticles = [];

    this.setupAnimations();

    if (this.scene) {
      this.scene.add(this.mesh);
    }
  }

  setupAnimations() {
    this.clips.forEach(clip => {
      const action = this.mixer.clipAction(clip);
      if (clip.name === 'Action' || clip.name === 'Gather') {
        action.loop = THREE.LoopOnce;
        action.clampWhenFinished = false;
      } else {
        action.loop = THREE.LoopRepeat;
      }
      this.actions[clip.name] = action;
    });

    // Start in Idle
    if (this.actions['Idle']) {
      this.actions['Idle'].play();
    }

    this.mixer.addEventListener('finished', (e) => {
      if (this.onActionFinished) {
        this.onActionFinished(e.action.getClip().name);
      }
      // Revert to Idle or Walk after one-shot actions
      if (this.currentActionName === 'Action' || this.currentActionName === 'Gather') {
        this.playAnimation('Idle', 0.25);
      }
    });
  }

  playAnimation(name, fadeDuration = 0.2) {
    if (!this.actions[name]) return;
    if (this.currentActionName === name && this.actions[name].isRunning()) return;

    const prevAction = this.actions[this.currentActionName];
    const newAction = this.actions[name];

    newAction.reset();
    newAction.fadeIn(fadeDuration);

    if (prevAction && prevAction !== newAction) {
      prevAction.fadeOut(fadeDuration);
    }

    newAction.play();
    this.currentActionName = name;
  }

  triggerAction(onFireCallback) {
    if (this.actions['Action']) {
      const action = this.actions['Action'];
      action.reset();
      action.play();
    }
    this.currentActionName = 'Action';

    if (onFireCallback) {
      const muzzlePos = new THREE.Vector3();
      if (this.bones.muzzleSpawn) {
        this.bones.muzzleSpawn.getWorldPosition(muzzlePos);
      } else {
        this.mesh.getWorldPosition(muzzlePos);
        muzzlePos.y += 0.8;
        muzzlePos.z += 0.5;
      }

      // Cat faces along local +Z forward axis when rotated by mesh.rotation.y
      const muzzleDir = new THREE.Vector3(0, 0, 1);
      muzzleDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);

      onFireCallback(muzzlePos, muzzleDir);
    }
  }

  triggerGather(onGatherCallback) {
    this.playAnimation('Gather', 0.15);
    if (onGatherCallback) {
      setTimeout(() => {
        onGatherCallback();
      }, 500);
    }
  }

  setAccessoryVisibility(accessoryName, visible) {
    if (this.bones[accessoryName]) {
      this.bones[accessoryName].visible = visible;
    }
  }

  boostMood(amount) {
    this.mood = Math.min(100, Math.max(0, this.mood + amount));
  }

  enterSleepMode() {
    if (this.isSleeping) return;
    this.isSleeping = true;
    this.playAnimation('Sleeping', 0.5);
  }

  wakeUp() {
    this.idleTimer = 0;
    if (this.isSleeping) {
      this.isSleeping = false;
      this.playAnimation('Idle', 0.2);
    }
  }

  spawnZzzParticle() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#a2d2ff';
    ctx.font = 'bold 80px Fredoka, sans-serif';
    ctx.fillText('Zzz', 10, 90);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.9 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.6, 0.6, 1);

    const headPos = new THREE.Vector3();
    if (this.bones.headBone) {
      this.bones.headBone.getWorldPosition(headPos);
    } else {
      headPos.copy(this.mesh.position).add(new THREE.Vector3(0, 1.2, 0));
    }
    sprite.position.copy(headPos).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.2, (Math.random() - 0.5) * 0.3));

    this.scene.add(sprite);
    this.zzzParticles.push({
      sprite,
      vel: new THREE.Vector3(0.2, 0.6, 0.1),
      life: 1.8
    });
  }

  update(delta) {
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // Slowly deteriorate mood (e.g. -1% every 3.5 seconds; slower for Mochi)
    const decayInterval = this.moodDecayInterval || 3.5;
    this.moodTimer += delta;
    if (this.moodTimer >= decayInterval) {
      this.moodTimer = 0;
      this.mood = Math.max(0, this.mood - 1);
    }

    // Sleeping Zzz particles
    if (this.isSleeping) {
      if (Math.random() < delta * 1.5) {
        this.spawnZzzParticle();
      }
    }

    // Update Zzz particles
    for (let i = this.zzzParticles.length - 1; i >= 0; i--) {
      const p = this.zzzParticles[i];
      p.life -= delta;
      p.sprite.position.addScaledVector(p.vel, delta);
      p.sprite.scale.addScalar(delta * 0.2);

      if (p.life <= 0) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        this.zzzParticles.splice(i, 1);
      }
    }
  }

  dispose() {
    if (this.scene && this.mesh) {
      this.scene.remove(this.mesh);
    }
    this.zzzParticles.forEach(p => {
      if (this.scene) this.scene.remove(p.sprite);
      p.sprite.material.dispose();
    });
    this.zzzParticles = [];
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  }
}
