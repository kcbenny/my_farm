import * as THREE from 'three';
import { AnimalModelBuilder } from './AnimalModelBuilder.js';

/**
 * Livestock System:
 * Spawns and manages 4 farm livestock: Cow, Chicken, Sheep, and Pig.
 * Runs standard AnimationMixer cycles: "Idle", "Walk", "Eat", "Sleep".
 * Includes natural grazing, roaming, and resting behaviors.
 */
export class LivestockSystem {
  constructor(scene, getTerrainHeight) {
    this.scene = scene;
    this.getTerrainHeight = getTerrainHeight || ((x, z) => 0);
    this.animals = [];

    this.initAnimals();
  }

  initAnimals() {
    // Livestock pasture coordinates in farm landscape
    const animalConfigs = [
      { species: 'cow', name: 'Bessie the Dairy Cow', x: -16, z: -8, rotY: 0.4 },
      { species: 'sheep', name: 'Cloud the Fluffy Sheep', x: -12, z: -4, rotY: -0.8 },
      { species: 'pig', name: 'Barnaby the Pig', x: -18, z: -2, rotY: 1.2 },
      { species: 'chicken', name: 'Pippin the Hen', x: -10, z: -1, rotY: -0.3 },
      { species: 'chicken', name: 'Henrietta the Hen', x: -9, z: -3, rotY: 0.9 },
    ];

    animalConfigs.forEach(cfg => {
      const animalData = AnimalModelBuilder.createAnimal(cfg.species);
      const { root, bones, clips } = animalData;

      const groundY = this.getTerrainHeight(cfg.x, cfg.z);
      root.position.set(cfg.x, groundY, cfg.z);
      root.rotation.y = cfg.rotY;
      this.scene.add(root);

      const mixer = new THREE.AnimationMixer(root);
      const actions = {};

      clips.forEach(clip => {
        const action = mixer.clipAction(clip);
        action.loop = THREE.LoopRepeat;
        actions[clip.name] = action;
      });

      // Play Idle at start
      if (actions['Idle']) {
        actions['Idle'].play();
      }

      const animalObj = {
        species: cfg.species,
        name: cfg.name,
        root,
        bones,
        clips,
        mixer,
        actions,
        currentAction: 'Idle',
        stateTimer: 2.0 + Math.random() * 4.0,
        targetPos: new THREE.Vector3(cfg.x, groundY, cfg.z),
        walkSpeed: cfg.species === 'chicken' ? 0.9 : 0.65,
        homeX: cfg.x,
        homeZ: cfg.z,
        roamRadius: cfg.species === 'chicken' ? 5.0 : 7.5
      };

      this.animals.push(animalObj);
    });
  }

  playAction(animal, name, fadeDuration = 0.3) {
    if (animal.currentAction === name || !animal.actions[name]) return;

    const prevAction = animal.actions[animal.currentAction];
    const newAction = animal.actions[name];

    newAction.reset();
    newAction.fadeIn(fadeDuration);
    newAction.play();

    if (prevAction) {
      prevAction.fadeOut(fadeDuration);
    }

    animal.currentAction = name;
  }

  update(delta) {
    for (let i = 0; i < this.animals.length; i++) {
      const a = this.animals[i];
      a.mixer.update(delta);

      a.stateTimer -= delta;
      if (a.stateTimer <= 0) {
        this.transitionState(a);
      }

      // If walking, move towards targetPos
      if (a.currentAction === 'Walk') {
        const currentPos = a.root.position;
        const toTarget = new THREE.Vector3().subVectors(a.targetPos, currentPos);
        toTarget.y = 0;
        const dist = toTarget.length();

        if (dist > 0.15) {
          toTarget.normalize();
          // Face target smoothly
          const targetRot = Math.atan2(toTarget.x, toTarget.z);
          a.root.rotation.y = THREE.MathUtils.lerp(a.root.rotation.y, targetRot, delta * 3.5);

          // Step forward
          const moveStep = a.walkSpeed * delta;
          currentPos.x += toTarget.x * moveStep;
          currentPos.z += toTarget.z * moveStep;
          currentPos.y = this.getTerrainHeight(currentPos.x, currentPos.z);
        } else {
          // Reached destination, switch to Eat or Idle
          const nextState = Math.random() < 0.6 ? 'Eat' : 'Idle';
          this.playAction(a, nextState);
          a.stateTimer = 3.0 + Math.random() * 4.0;
        }
      }
    }
  }

  transitionState(animal) {
    const r = Math.random();

    if (animal.currentAction === 'Walk') {
      // Finished walking, graze/eat or idle
      const nextState = r < 0.65 ? 'Eat' : 'Idle';
      this.playAction(animal, nextState);
      animal.stateTimer = 3.0 + Math.random() * 5.0;
    } else if (animal.currentAction === 'Eat') {
      // Done eating, maybe idle, walk somewhere, or sleep
      if (r < 0.45) {
        this.startWalking(animal);
      } else if (r < 0.8) {
        this.playAction(animal, 'Idle');
        animal.stateTimer = 2.5 + Math.random() * 3.5;
      } else {
        this.playAction(animal, 'Sleep');
        animal.stateTimer = 5.0 + Math.random() * 6.0;
      }
    } else if (animal.currentAction === 'Sleep') {
      // Waking up from nap
      this.playAction(animal, 'Idle');
      animal.stateTimer = 2.0 + Math.random() * 3.0;
    } else {
      // From Idle: walk, eat, or sleep
      if (r < 0.5) {
        this.startWalking(animal);
      } else if (r < 0.85) {
        this.playAction(animal, 'Eat');
        animal.stateTimer = 3.0 + Math.random() * 4.0;
      } else {
        this.playAction(animal, 'Sleep');
        animal.stateTimer = 4.0 + Math.random() * 5.0;
      }
    }
  }

  startWalking(animal) {
    // Pick random target in pasture radius
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * animal.roamRadius;
    const tx = animal.homeX + Math.cos(angle) * dist;
    const tz = animal.homeZ + Math.sin(angle) * dist;
    const ty = this.getTerrainHeight(tx, tz);

    animal.targetPos.set(tx, ty, tz);
    this.playAction(animal, 'Walk');
    animal.stateTimer = 6.0 + Math.random() * 3.0; // Max walk time
  }
}
