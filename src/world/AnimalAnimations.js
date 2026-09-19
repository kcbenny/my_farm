import * as THREE from 'three';

/**
 * Creates standard animation clips for farm livestock:
 * Cleanly named clips: "Idle", "Walk", "Eat", "Sleep"
 */
export class AnimalAnimations {
  static createQuaternionTrack(nodeName, times, eulerArray) {
    const values = [];
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();

    for (let i = 0; i < eulerArray.length; i++) {
      const [x, y, z] = eulerArray[i];
      e.set(x, y, z);
      q.setFromEuler(e);
      values.push(q.x, q.y, q.z, q.w);
    }
    return new THREE.QuaternionKeyframeTrack(`${nodeName}.quaternion`, times, values);
  }

  static createVectorTrack(nodeName, prop, times, vec3Array, smooth = true) {
    const values = [];
    for (let i = 0; i < vec3Array.length; i++) {
      values.push(vec3Array[i][0], vec3Array[i][1], vec3Array[i][2]);
    }
    const track = new THREE.VectorKeyframeTrack(`${nodeName}.${prop}`, times, values);
    if (smooth) {
      track.setInterpolation(THREE.InterpolateSmooth);
    }
    return track;
  }

  /**
   * Quadruped Animations (Cow, Sheep, Pig)
   */
  static getQuadrupedClips(species = 'cow', baseHeight = 1.0) {
    return [
      this.createQuadrupedIdle(species, baseHeight),
      this.createQuadrupedWalk(species, baseHeight),
      this.createQuadrupedEat(species, baseHeight),
      this.createQuadrupedSleep(species, baseHeight)
    ];
  }

  static createQuadrupedIdle(species, baseHeight) {
    const duration = 2.4;
    const times = [0, 0.6, 1.2, 1.8, 2.4];
    const tracks = [];

    // Pelvis subtle breathing bob
    tracks.push(
      this.createVectorTrack('Pelvis', 'position', times, [
        [0, baseHeight, 0],
        [0, baseHeight + 0.02, 0],
        [0, baseHeight, 0],
        [0, baseHeight + 0.02, 0],
        [0, baseHeight, 0]
      ])
    );

    // Head gentle looking around
    tracks.push(
      this.createQuaternionTrack('Head', times, [
        [0, 0, 0],
        [-0.05, 0.08, 0.02],
        [0, 0, 0],
        [-0.04, -0.08, -0.02],
        [0, 0, 0]
      ])
    );

    // Tail gentle swish
    tracks.push(
      this.createQuaternionTrack('Tail', times, [
        [0, 0, 0],
        [0.05, 0.25, 0.1],
        [0, 0, 0],
        [0.05, -0.25, -0.1],
        [0, 0, 0]
      ])
    );

    return new THREE.AnimationClip('Idle', duration, tracks);
  }

  static createQuadrupedWalk(species, baseHeight) {
    const duration = 1.2;
    const times = [0, 0.3, 0.6, 0.9, 1.2];
    const tracks = [];

    // Pelvis walking bob & slight roll
    tracks.push(
      this.createVectorTrack('Pelvis', 'position', times, [
        [0, baseHeight, 0],
        [0, baseHeight + 0.04, 0],
        [0, baseHeight, 0],
        [0, baseHeight + 0.04, 0],
        [0, baseHeight, 0]
      ])
    );

    // Quadruped diagonal gait:
    // Pair 1: Front-Left (FL) and Back-Right (BR)
    // Pair 2: Front-Right (FR) and Back-Left (BL)
    tracks.push(
      this.createQuaternionTrack('Leg_FL_Upper', times, [
        [0, 0, 0],
        [-0.35, 0, 0],
        [0, 0, 0],
        [0.35, 0, 0],
        [0, 0, 0]
      ]),
      this.createQuaternionTrack('Leg_BR_Upper', times, [
        [0, 0, 0],
        [-0.3, 0, 0],
        [0, 0, 0],
        [0.3, 0, 0],
        [0, 0, 0]
      ]),
      this.createQuaternionTrack('Leg_FR_Upper', times, [
        [0, 0, 0],
        [0.35, 0, 0],
        [0, 0, 0],
        [-0.35, 0, 0],
        [0, 0, 0]
      ]),
      this.createQuaternionTrack('Leg_BL_Upper', times, [
        [0, 0, 0],
        [0.3, 0, 0],
        [0, 0, 0],
        [-0.3, 0, 0],
        [0, 0, 0]
      ])
    );

    // Head counter bob
    tracks.push(
      this.createQuaternionTrack('Head', times, [
        [0, 0, 0],
        [0.08, 0, 0],
        [0, 0, 0],
        [-0.06, 0, 0],
        [0, 0, 0]
      ])
    );

    // Tail swagger
    tracks.push(
      this.createQuaternionTrack('Tail', times, [
        [0, 0, 0],
        [0, 0.35, 0.1],
        [0, 0, 0],
        [0, -0.35, -0.1],
        [0, 0, 0]
      ])
    );

    return new THREE.AnimationClip('Walk', duration, tracks);
  }

  static createQuadrupedEat(species, baseHeight) {
    const duration = 2.0;
    const times = [0, 0.4, 0.8, 1.2, 1.6, 2.0];
    const tracks = [];

    // Pelvis slightly tilted down forward
    tracks.push(
      this.createVectorTrack('Pelvis', 'position', times, [
        [0, baseHeight - 0.05, 0],
        [0, baseHeight - 0.05, 0],
        [0, baseHeight - 0.04, 0],
        [0, baseHeight - 0.05, 0],
        [0, baseHeight - 0.04, 0],
        [0, baseHeight - 0.05, 0]
      ])
    );

    // Neck & Head lowered to graze grass
    tracks.push(
      this.createQuaternionTrack('Neck', times, [
        [0.55, 0, 0],
        [0.6, 0, 0],
        [0.52, 0, 0],
        [0.6, 0, 0],
        [0.52, 0, 0],
        [0.55, 0, 0]
      ]),
      this.createQuaternionTrack('Head', times, [
        [0.2, 0, 0],
        [0.28, 0.04, 0],
        [0.18, -0.04, 0],
        [0.28, 0.04, 0],
        [0.18, -0.04, 0],
        [0.2, 0, 0]
      ])
    );

    // Happy tail wag while grazing
    tracks.push(
      this.createQuaternionTrack('Tail', times, [
        [0, 0, 0],
        [0.1, 0.3, 0],
        [0.1, -0.3, 0],
        [0.1, 0.3, 0],
        [0.1, -0.3, 0],
        [0, 0, 0]
      ])
    );

    return new THREE.AnimationClip('Eat', duration, tracks);
  }

  static createQuadrupedSleep(species, baseHeight) {
    const duration = 3.0;
    const times = [0, 0.8, 1.5, 2.2, 3.0];
    const tracks = [];

    const groundSleepY = baseHeight * 0.42;

    // Pelvis lowered to ground (lying down)
    tracks.push(
      this.createVectorTrack('Pelvis', 'position', times, [
        [0, groundSleepY, 0],
        [0, groundSleepY + 0.015, 0],
        [0, groundSleepY, 0],
        [0, groundSleepY + 0.015, 0],
        [0, groundSleepY, 0]
      ])
    );

    // Legs folded under
    tracks.push(
      this.createQuaternionTrack('Leg_FL_Upper', times, [
        [1.2, 0, -0.3],
        [1.2, 0, -0.3],
        [1.2, 0, -0.3],
        [1.2, 0, -0.3],
        [1.2, 0, -0.3]
      ]),
      this.createQuaternionTrack('Leg_FR_Upper', times, [
        [1.2, 0, 0.3],
        [1.2, 0, 0.3],
        [1.2, 0, 0.3],
        [1.2, 0, 0.3],
        [1.2, 0, 0.3]
      ]),
      this.createQuaternionTrack('Leg_BL_Upper', times, [
        [-1.1, 0, -0.2],
        [-1.1, 0, -0.2],
        [-1.1, 0, -0.2],
        [-1.1, 0, -0.2],
        [-1.1, 0, -0.2]
      ]),
      this.createQuaternionTrack('Leg_BR_Upper', times, [
        [-1.1, 0, 0.2],
        [-1.1, 0, 0.2],
        [-1.1, 0, 0.2],
        [-1.1, 0, 0.2],
        [-1.1, 0, 0.2]
      ])
    );

    // Head resting down comfortably
    tracks.push(
      this.createQuaternionTrack('Neck', times, [
        [0.45, 0.1, 0],
        [0.46, 0.1, 0],
        [0.45, 0.1, 0],
        [0.46, 0.1, 0],
        [0.45, 0.1, 0]
      ]),
      this.createQuaternionTrack('Head', times, [
        [0.35, 0.15, -0.1],
        [0.36, 0.15, -0.1],
        [0.35, 0.15, -0.1],
        [0.36, 0.15, -0.1],
        [0.35, 0.15, -0.1]
      ])
    );

    return new THREE.AnimationClip('Sleep', duration, tracks);
  }

  /**
   * Chicken Biped Animations
   */
  static getChickenClips() {
    return [
      this.createChickenIdle(),
      this.createChickenWalk(),
      this.createChickenEat(),
      this.createChickenSleep()
    ];
  }

  static createChickenIdle() {
    const duration = 2.0;
    const times = [0, 0.5, 1.0, 1.5, 2.0];
    const tracks = [];

    // Pelvis breathing
    tracks.push(
      this.createVectorTrack('Pelvis', 'position', times, [
        [0, 0.38, 0],
        [0, 0.39, 0],
        [0, 0.38, 0],
        [0, 0.39, 0],
        [0, 0.38, 0]
      ])
    );

    // Head sharp twitches
    tracks.push(
      this.createQuaternionTrack('Head', times, [
        [0, 0, 0],
        [0.1, 0.2, 0.05],
        [0, 0, 0],
        [0.1, -0.2, -0.05],
        [0, 0, 0]
      ])
    );

    return new THREE.AnimationClip('Idle', duration, tracks);
  }

  static createChickenWalk() {
    const duration = 0.8;
    const times = [0, 0.2, 0.4, 0.6, 0.8];
    const tracks = [];

    tracks.push(
      this.createVectorTrack('Pelvis', 'position', times, [
        [0, 0.38, 0],
        [0, 0.41, 0],
        [0, 0.38, 0],
        [0, 0.41, 0],
        [0, 0.38, 0]
      ])
    );

    // Alternating leg stride
    tracks.push(
      this.createQuaternionTrack('Leg_L_Upper', times, [
        [0, 0, 0],
        [-0.45, 0, 0],
        [0, 0, 0],
        [0.45, 0, 0],
        [0, 0, 0]
      ]),
      this.createQuaternionTrack('Leg_R_Upper', times, [
        [0, 0, 0],
        [0.45, 0, 0],
        [0, 0, 0],
        [-0.45, 0, 0],
        [0, 0, 0]
      ])
    );

    // Head classic bobbing forward and back
    tracks.push(
      this.createVectorTrack('Head', 'position', times, [
        [0, 0.22, 0.16],
        [0, 0.23, 0.24],
        [0, 0.22, 0.16],
        [0, 0.23, 0.24],
        [0, 0.22, 0.16]
      ])
    );

    // Wings balancing flutter
    tracks.push(
      this.createQuaternionTrack('Wing_L', times, [
        [0, 0, 0],
        [0, 0, 0.2],
        [0, 0, 0],
        [0, 0, 0.2],
        [0, 0, 0]
      ]),
      this.createQuaternionTrack('Wing_R', times, [
        [0, 0, 0],
        [0, 0, -0.2],
        [0, 0, 0],
        [0, 0, -0.2],
        [0, 0, 0]
      ])
    );

    return new THREE.AnimationClip('Walk', duration, tracks);
  }

  static createChickenEat() {
    const duration = 1.2;
    const times = [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2];
    const tracks = [];

    // Rapid pecking motion on ground
    tracks.push(
      this.createQuaternionTrack('Neck', times, [
        [0.7, 0, 0],
        [1.1, 0, 0],
        [0.7, 0, 0],
        [1.1, 0, 0],
        [0.7, 0, 0],
        [1.1, 0, 0],
        [0.7, 0, 0]
      ]),
      this.createQuaternionTrack('Head', times, [
        [0.2, 0, 0],
        [0.5, 0, 0],
        [0.2, 0, 0],
        [0.5, 0, 0],
        [0.2, 0, 0],
        [0.5, 0, 0],
        [0.2, 0, 0]
      ])
    );

    return new THREE.AnimationClip('Eat', duration, tracks);
  }

  static createChickenSleep() {
    const duration = 3.0;
    const times = [0, 0.75, 1.5, 2.25, 3.0];
    const tracks = [];

    // Chicken roosts down on ground with tucked head
    tracks.push(
      this.createVectorTrack('Pelvis', 'position', times, [
        [0, 0.18, 0],
        [0, 0.19, 0],
        [0, 0.18, 0],
        [0, 0.19, 0],
        [0, 0.18, 0]
      ])
    );

    tracks.push(
      this.createQuaternionTrack('Neck', times, [
        [-0.3, 0.4, 0],
        [-0.3, 0.4, 0],
        [-0.3, 0.4, 0],
        [-0.3, 0.4, 0],
        [-0.3, 0.4, 0]
      ]),
      this.createQuaternionTrack('Head', times, [
        [-0.2, 0.8, 0],
        [-0.2, 0.8, 0],
        [-0.2, 0.8, 0],
        [-0.2, 0.8, 0],
        [-0.2, 0.8, 0]
      ])
    );

    return new THREE.AnimationClip('Sleep', duration, tracks);
  }
}
