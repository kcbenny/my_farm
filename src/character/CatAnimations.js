import * as THREE from 'three';

/**
 * Creates the 4 required animation clips for the Chubby Ginger Tabby Cat:
 * 1. Idle: Subtle breathing & tail sway loop
 * 2. Walk: Bipedal waddling walk cycle along the path
 * 3. Action: Excited combat shooting stance with weapon recoil
 * 4. Gather: Bending down to harvest crops
 */
export class CatAnimations {
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
   * 1. Idle: Subtle breathing, gentle head tilt, and rhythmic tail sway loop
   */
  static createIdleClip() {
    const duration = 2.0;
    const times = [0, 0.5, 1.0, 1.5, 2.0];

    const tracks = [];

    // Pelvis breathing bob
    tracks.push(
      this.createVectorTrack('Pelvis', 'position', times, [
        [0, 0.72, 0],
        [0, 0.73, 0],
        [0, 0.72, 0],
        [0, 0.73, 0],
        [0, 0.72, 0]
      ])
    );

    // Chest breathing expansion & contraction
    tracks.push(
      this.createVectorTrack('Chest', 'scale', times, [
        [1.0, 1.0, 1.0],
        [1.03, 1.04, 1.03],
        [1.0, 1.0, 1.0],
        [1.03, 1.04, 1.03],
        [1.0, 1.0, 1.0]
      ])
    );

    // Head slight inquisitive tilt
    tracks.push(
      this.createQuaternionTrack('Head_Bone', times, [
        [0, 0, 0],
        [-0.04, 0.05, 0.03],
        [0, 0, 0],
        [-0.04, -0.05, -0.03],
        [0, 0, 0]
      ])
    );

    // Ear twitches
    tracks.push(
      this.createQuaternionTrack('Ear_L', times, [
        [-0.1, 0.15, 0.4],
        [-0.1, 0.15, 0.48],
        [-0.1, 0.15, 0.4],
        [-0.1, 0.15, 0.4],
        [-0.1, 0.15, 0.4]
      ])
    );
    tracks.push(
      this.createQuaternionTrack('Ear_R', times, [
        [-0.1, -0.15, -0.4],
        [-0.1, -0.15, -0.4],
        [-0.1, -0.15, -0.4],
        [-0.1, -0.15, -0.48],
        [-0.1, -0.15, -0.4]
      ])
    );

    // Left paw gentle resting sway
    tracks.push(
      this.createQuaternionTrack('Arm_L', times, [
        [0, 0, 0],
        [0.08, 0, 0.04],
        [0, 0, 0],
        [0.08, 0, 0.04],
        [0, 0, 0]
      ])
    );

    // Peashooter held relaxed
    tracks.push(
      this.createQuaternionTrack('Gun_Root', times, [
        [-0.35, 0.2, -0.1],
        [-0.3, 0.18, -0.08],
        [-0.35, 0.2, -0.1],
        [-0.3, 0.18, -0.08],
        [-0.35, 0.2, -0.1]
      ])
    );

    // Tail S-Curve sway
    tracks.push(
      this.createQuaternionTrack('Tail_1', times, [
        [-0.6, -0.2, 0.1],
        [-0.6, 0.0, 0.0],
        [-0.6, 0.2, -0.1],
        [-0.6, 0.0, 0.0],
        [-0.6, -0.2, 0.1]
      ])
    );
    tracks.push(
      this.createQuaternionTrack('Tail_2', times, [
        [0, -0.3, 0.2],
        [0, 0.0, 0.0],
        [0, 0.3, -0.2],
        [0, 0.0, 0.0],
        [0, -0.3, 0.2]
      ])
    );
    tracks.push(
      this.createQuaternionTrack('Tail_3', times, [
        [0, -0.4, 0.3],
        [0, 0.0, 0.0],
        [0, 0.4, -0.3],
        [0, 0.0, 0.0],
        [0, -0.4, 0.3]
      ])
    );

    return new THREE.AnimationClip('Idle', duration, tracks);
  }

  /**
   * 2. Walk: Bipedal waddling walk cycle along the path
   */
  static createWalkClip() {
    const duration = 0.8;
    const times = [0, 0.2, 0.4, 0.6, 0.8];

    const tracks = [];

    // Pelvis waddling bounce and roll
    tracks.push(
      this.createVectorTrack('Pelvis', 'position', times, [
        [0, 0.72, 0],
        [0, 0.76, 0],
        [0, 0.72, 0],
        [0, 0.76, 0],
        [0, 0.72, 0]
      ])
    );

    tracks.push(
      this.createQuaternionTrack('Pelvis', times, [
        [0, 0, -0.08],
        [0, 0, 0],
        [0, 0, 0.08],
        [0, 0, 0],
        [0, 0, -0.08]
      ])
    );

    // Left Leg swing
    tracks.push(
      this.createQuaternionTrack('Leg_L', times, [
        [-0.55, 0, 0],
        [0, 0, 0],
        [0.55, 0, 0],
        [0, 0, 0],
        [-0.55, 0, 0]
      ])
    );

    // Right Leg swing (opposite phase)
    tracks.push(
      this.createQuaternionTrack('LegR', times, [
        [0.55, 0, 0],
        [0, 0, 0],
        [-0.55, 0, 0],
        [0, 0, 0],
        [0.55, 0, 0]
      ])
    );

    // Foot lift / roll
    tracks.push(
      this.createQuaternionTrack('Foot_L', times, [
        [0.2, 0, 0],
        [-0.25, 0, 0],
        [0, 0, 0],
        [0.3, 0, 0],
        [0.2, 0, 0]
      ])
    );

    tracks.push(
      this.createQuaternionTrack('Foot_R', times, [
        [0, 0, 0],
        [0.3, 0, 0],
        [0.2, 0, 0],
        [-0.25, 0, 0],
        [0, 0, 0]
      ])
    );

    // Left Arm rhythmic waddle pump
    tracks.push(
      this.createQuaternionTrack('Arm_L', times, [
        [0.45, 0, -0.1],
        [0, 0, 0],
        [-0.45, 0, 0.1],
        [0, 0, 0],
        [0.45, 0, -0.1]
      ])
    );

    // Right Arm (carrying peashooter) bouncy sway
    tracks.push(
      this.createQuaternionTrack('Arm_R', times, [
        [-0.25, 0, 0],
        [0, 0, 0],
        [0.25, 0, 0],
        [0, 0, 0],
        [-0.25, 0, 0]
      ])
    );

    // Head bobbing & tilt
    tracks.push(
      this.createQuaternionTrack('Head_Bone', times, [
        [0.05, 0, 0.05],
        [-0.03, 0, 0],
        [0.05, 0, -0.05],
        [-0.03, 0, 0],
        [0.05, 0, 0.05]
      ])
    );

    // Tail swinging counter-rhythm
    tracks.push(
      this.createQuaternionTrack('Tail_1', times, [
        [-0.5, 0.35, 0],
        [-0.55, 0, 0],
        [-0.5, -0.35, 0],
        [-0.55, 0, 0],
        [-0.5, 0.35, 0]
      ])
    );

    tracks.push(
      this.createQuaternionTrack('Tail_2', times, [
        [0, 0.4, -0.2],
        [0, 0, 0],
        [0, -0.4, 0.2],
        [0, 0, 0],
        [0, 0.4, -0.2]
      ])
    );

    return new THREE.AnimationClip('Walk', duration, tracks);
  }

  /**
   * 3. Action: Excited combat shooting stance with weapon recoil
   */
  static createActionClip() {
    const duration = 0.7;
    const times = [0, 0.12, 0.22, 0.35, 0.52, 0.7];

    const tracks = [];

    // Bracing crouch & recoil kickback
    tracks.push(
      this.createVectorTrack('Pelvis', 'position', times, [
        [0, 0.72, 0],
        [0, 0.65, 0.02],      // crouch & brace
        [0, 0.68, -0.08],     // recoil slide back!
        [0, 0.66, -0.05],     // dampening
        [0, 0.70, -0.02],     // recover
        [0, 0.72, 0]
      ])
    );

    // Spine & Chest recoil kick
    tracks.push(
      this.createQuaternionTrack('Chest', times, [
        [0, 0, 0],
        [0.15, -0.2, 0],       // aim ready
        [-0.32, -0.1, 0],      // BANG! kick back
        [-0.12, -0.15, 0],
        [-0.04, -0.1, 0],
        [0, 0, 0]
      ])
    );

    // Right Arm aiming forward & kicking back
    tracks.push(
      this.createQuaternionTrack('Arm_R', times, [
        [0, 0, 0],
        [-0.8, -0.3, 0.2],     // raised gun
        [-1.1, -0.2, 0.35],    // sharp recoil up-back
        [-0.9, -0.25, 0.25],
        [-0.5, -0.1, 0.1],
        [0, 0, 0]
      ])
    );

    // Gun Root recoil offset
    tracks.push(
      this.createVectorTrack('Gun_Root', 'position', times, [
        [0.05, -0.02, 0.12],
        [0.05, 0.02, 0.18],
        [0.05, 0.06, 0.02],    // recoil punch backward
        [0.05, 0.02, 0.14],
        [0.05, -0.01, 0.13],
        [0.05, -0.02, 0.12]
      ])
    );

    // Peashooter Muzzle inflate and fire burst
    tracks.push(
      this.createVectorTrack('Gun_Head', 'scale', times, [
        [1.0, 1.0, 1.0],
        [1.25, 1.25, 1.35],    // charging pea!
        [0.85, 0.85, 1.4],     // projectile ejection squish!
        [1.1, 1.1, 0.95],      // elastic snapback
        [1.02, 1.02, 1.02],
        [1.0, 1.0, 1.0]
      ])
    );

    // Left Arm dramatic combat brace
    tracks.push(
      this.createQuaternionTrack('Arm_L', times, [
        [0, 0, 0],
        [0.3, 0.4, -0.3],
        [0.5, 0.5, -0.4],
        [0.35, 0.4, -0.3],
        [0.15, 0.2, -0.1],
        [0, 0, 0]
      ])
    );

    // Head intense aiming and recoil jerk
    tracks.push(
      this.createQuaternionTrack('Head_Bone', times, [
        [0, 0, 0],
        [0.05, 0.2, 0],
        [-0.2, 0.15, 0],       // head jerks back from blast
        [-0.05, 0.18, 0],
        [0.02, 0.1, 0],
        [0, 0, 0]
      ])
    );

    // Tail puffs up alert
    tracks.push(
      this.createQuaternionTrack('Tail_1', times, [
        [-0.6, 0, 0],
        [-0.2, 0.1, 0],
        [0.2, 0.2, 0.2],       // tail shoots up with excitement
        [0.0, 0.1, 0.1],
        [-0.4, 0, 0],
        [-0.6, 0, 0]
      ])
    );

    return new THREE.AnimationClip('Action', duration, tracks);
  }

  /**
   * 4. Gather: Bending down to harvest crops
   */
  static createGatherClip() {
    const duration = 1.2;
    const times = [0, 0.25, 0.5, 0.75, 0.95, 1.2];

    const tracks = [];

    // Pelvis bends down low
    tracks.push(
      this.createVectorTrack('Pelvis', 'position', times, [
        [0, 0.72, 0],
        [0, 0.48, -0.05],      // deep crouch
        [0, 0.45, -0.08],      // plucking at ground
        [0, 0.52, -0.04],      // pulling up
        [0, 0.70, 0],
        [0, 0.72, 0]
      ])
    );

    // Spine bows forward
    tracks.push(
      this.createQuaternionTrack('Spine', times, [
        [0, 0, 0],
        [0.55, 0, 0],          // bend forward
        [0.65, 0, 0],          // reach ground
        [0.35, 0, 0],          // pull up
        [0.1, 0, 0],
        [0, 0, 0]
      ])
    );

    // Head looks down at crop then looks up happily
    tracks.push(
      this.createQuaternionTrack('Head_Bone', times, [
        [0, 0, 0],
        [0.35, 0, 0],          // look down
        [0.45, 0.1, 0],        // inspect crop
        [-0.15, 0, 0],         // look up proud
        [-0.05, 0, 0],
        [0, 0, 0]
      ])
    );

    // Both Arms reach down to pluck
    tracks.push(
      this.createQuaternionTrack('Arm_L', times, [
        [0, 0, 0],
        [-0.8, -0.2, 0.3],     // reaching down
        [-1.0, -0.3, 0.4],     // grasping vegetable
        [-0.4, 0, 0.1],        // holding aloft
        [-0.1, 0, 0],
        [0, 0, 0]
      ])
    );

    tracks.push(
      this.createQuaternionTrack('Arm_R', times, [
        [0, 0, 0],
        [-0.7, 0.2, -0.3],     // reaching down
        [-0.9, 0.3, -0.4],     // pulling with both paws
        [-0.3, 0, -0.1],
        [-0.1, 0, 0],
        [0, 0, 0]
      ])
    );

    // Tail perks up with farm joy
    tracks.push(
      this.createQuaternionTrack('Tail_1', times, [
        [-0.6, 0, 0],
        [-0.1, 0, 0],
        [0.3, 0.2, 0],         // upright perky tail
        [0.4, -0.2, 0],        // happy wag
        [-0.3, 0, 0],
        [-0.6, 0, 0]
      ])
    );

    return new THREE.AnimationClip('Gather', duration, tracks);
  }

  /**
   * 5. HappyRun: Joyful high-energy sprinting trot with upright tail wag
   */
  static createHappyRunClip() {
    const duration = 0.5;
    const times = [0, 0.125, 0.25, 0.375, 0.5];

    const tracks = [];

    // Energetic bouncing bounce
    tracks.push(
      this.createVectorTrack('Pelvis', 'position', times, [
        [0, 0.72, 0],
        [0, 0.82, 0],
        [0, 0.72, 0],
        [0, 0.82, 0],
        [0, 0.72, 0]
      ])
    );

    // Fast leg gallop
    tracks.push(
      this.createQuaternionTrack('Leg_L', times, [
        [-0.8, 0, 0],
        [0, 0, 0],
        [0.8, 0, 0],
        [0, 0, 0],
        [-0.8, 0, 0]
      ])
    );
    tracks.push(
      this.createQuaternionTrack('LegR', times, [
        [0.8, 0, 0],
        [0, 0, 0],
        [-0.8, 0, 0],
        [0, 0, 0],
        [0.8, 0, 0]
      ])
    );

    // Happy upright tail wag
    tracks.push(
      this.createQuaternionTrack('Tail_1', times, [
        [0.6, 0.3, 0],
        [0.6, -0.3, 0],
        [0.6, 0.3, 0],
        [0.6, -0.3, 0],
        [0.6, 0.3, 0]
      ])
    );

    // Bouncing ears
    tracks.push(
      this.createQuaternionTrack('Ear_L', times, [
        [-0.2, 0.2, 0.5],
        [0.1, 0.2, 0.3],
        [-0.2, 0.2, 0.5],
        [0.1, 0.2, 0.3],
        [-0.2, 0.2, 0.5]
      ])
    );

    return new THREE.AnimationClip('HappyRun', duration, tracks);
  }

  /**
   * 6. Sleeping: Curled up relaxed sleep pose with soft breathing
   */
  static createSleepingClip() {
    const duration = 2.5;
    const times = [0, 1.25, 2.5];

    const tracks = [];

    // Pelvis low on ground
    tracks.push(
      this.createVectorTrack('Pelvis', 'position', times, [
        [0, 0.35, 0],
        [0, 0.37, 0],
        [0, 0.35, 0]
      ])
    );

    // Spine curled
    tracks.push(
      this.createQuaternionTrack('Spine', times, [
        [0.3, 0.4, 0],
        [0.32, 0.4, 0],
        [0.3, 0.4, 0]
      ])
    );

    // Head resting on paws looking down-side
    tracks.push(
      this.createQuaternionTrack('Head_Bone', times, [
        [0.4, 0.5, 0.2],
        [0.42, 0.5, 0.2],
        [0.4, 0.5, 0.2]
      ])
    );

    // Tail curled around body
    tracks.push(
      this.createQuaternionTrack('Tail_1', times, [
        [0.8, 1.0, 0],
        [0.82, 1.05, 0],
        [0.8, 1.0, 0]
      ])
    );

    return new THREE.AnimationClip('Sleeping', duration, tracks);
  }

  static getClips() {
    return [
      this.createIdleClip(),
      this.createWalkClip(),
      this.createActionClip(),
      this.createGatherClip(),
      this.createHappyRunClip(),
      this.createSleepingClip()
    ];
  }
}
