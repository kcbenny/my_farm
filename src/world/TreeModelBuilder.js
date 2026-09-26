import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const STYLES = {
  oak: { leaves: [0x789361, 0x9db67e, 0xb6cc96, 0x637f53], bark: 0x786b55, spread: 1.65, height: 4.6 },
  apple: { leaves: [0x376845, 0x578849, 0x7da45a, 0x426e3f], bark: 0x70523e, spread: 1.5, height: 4.5 },
  blossom: { leaves: [0x286857, 0x3c8870, 0x57955d, 0x2f7352], bark: 0x735244, spread: 1.12, height: 5.2 },
  autumn: { leaves: [0xf8bd32, 0xf4d45a, 0xe99a26, 0xd66a24, 0xee862d], bark: 0x78614f, spread: 1.7, height: 4.7 },
  birch: { leaves: [0x839f49, 0xa3b86a, 0x627d38, 0xb8c985], bark: 0xdbd7c8, spread: 1.25, height: 5.2 },
  willow: { leaves: [0x879d45, 0xaabd65, 0x6f8d45, 0xb4c579], bark: 0x74674d, spread: 1.8, height: 4.8 },
  pine: { leaves: [0x355c39, 0x487446, 0x658655, 0x294f38], bark: 0x705744, spread: 1.3, height: 5.5 }
};

export class TreeModelBuilder {
  static create(type = 'oak', scale = 1, seed = 1) {
    const style = STYLES[type] || STYLES.oak;
    let state = (seed * 104729 + 17) >>> 0;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const root = new THREE.Group();
    root.name = `${type}_Tree`;
    root.userData.type = 'tree';
    root.userData.species = type;
    root.scale.setScalar(scale);
    const crown = new THREE.Group();
    crown.name = 'Tree_Crown';
    crown.userData.physics = false;
    root.add(crown);
    const trunkParts = [];
    const branchParts = [];
    const up = new THREE.Vector3(0, 1, 0);
    const limb = (start, end, bottomRadius, topRadius, trunk = false) => {
      const direction = end.clone().sub(start);
      const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, direction.length(), 7, 1);
      geometry.applyMatrix4(new THREE.Matrix4().compose(
        start.clone().add(end).multiplyScalar(0.5),
        new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()),
        new THREE.Vector3(1, 1, 1)
      ));
      (trunk ? trunkParts : branchParts).push(geometry);
    };
    const trunkHeight = type === 'pine' ? style.height * 0.94 : style.height * 0.68;
    let previous = new THREE.Vector3();
    for (let segment = 1; segment <= 5; segment++) {
      const progress = segment / 5;
      const next = new THREE.Vector3(Math.sin(progress * 3) * 0.16, trunkHeight * progress, Math.sin(progress * 4) * 0.1);
      limb(previous, next, 0.27 * (1 - (progress - 0.2) * 0.85), 0.27 * (1 - progress * 0.85), true);
      previous = next;
    }
    for (let index = 0; index < 7; index++) {
      const angle = index * Math.PI * 2 / 7;
      limb(new THREE.Vector3(0, 0.23, 0), new THREE.Vector3(Math.cos(angle) * 0.65, 0.035, Math.sin(angle) * 0.65), 0.14, 0.025);
    }

    const clusters = [];
    if (type === 'pine') {
      for (let tier = 0; tier < 8; tier++) {
        const height = 1.35 + tier * 0.49;
        const radius = style.spread * (1 - tier / 9);
        for (let branch = 0; branch < 7; branch++) {
          const angle = branch * Math.PI * 2 / 7 + tier * 0.7;
          const tip = new THREE.Vector3(Math.cos(angle) * radius, height + 0.25, Math.sin(angle) * radius);
          limb(new THREE.Vector3(0, height, 0), tip, 0.07 * (1 - tier / 10), 0.012);
          clusters.push({ center: tip.clone().multiply(new THREE.Vector3(0.72, 1, 0.72)), radius: radius * 0.43 + 0.12, flatten: 0.4 });
        }
      }
      clusters.push({ center: new THREE.Vector3(0, 5.35, 0), radius: 0.22, flatten: 1.3 });
    } else {
      const branchCount = type === 'blossom' ? 11 : 14;
      for (let branch = 0; branch < branchCount; branch++) {
        const angle = branch * 2.39996 + random() * 0.4;
        const tier = branch / (branchCount - 1);
        const radius = style.spread * (0.55 + Math.sin(tier * Math.PI) * 0.35);
        const height = 2.15 + tier * (style.height - 2.8);
        const start = new THREE.Vector3(0.1, 1.1 + tier * 1.6, 0);
        const fork = new THREE.Vector3(Math.cos(angle) * radius * 0.5, height - 0.45, Math.sin(angle) * radius * 0.5);
        const tip = new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        limb(start, fork, 0.11 * (1 - tier * 0.45), 0.065);
        limb(fork, tip, 0.065, 0.018);
        for (let twig = 0; twig < 3; twig++) {
          const twigAngle = angle + (twig - 1) * 0.65;
          const end = tip.clone().add(new THREE.Vector3(Math.cos(twigAngle) * 0.3, 0.3 + random() * 0.2, Math.sin(twigAngle) * 0.3));
          limb(fork.clone().lerp(tip, 0.75), end, 0.026, 0.006);
        }
        clusters.push({ center: tip, radius: type === 'blossom' ? 0.56 : (type === 'birch' ? 0.61 : 0.82), flatten: 0.85 });
      }
      clusters.push({ center: new THREE.Vector3(0, style.height - 0.65, 0), radius: 0.78, flatten: 0.85 });
    }
    const bark = new THREE.MeshStandardMaterial({ color: style.bark, roughness: 0.95, flatShading: true });
    for (const [name, parts, solid] of [['Trunk', trunkParts, true], ['Branches', branchParts, false]]) {
      const geometry = mergeGeometries(parts);
      parts.forEach(part => part.dispose());
      const mesh = new THREE.Mesh(geometry, bark);
      mesh.name = name;
      mesh.userData.physics = solid;
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    }

    const leafGeometry = new THREE.BufferGeometry();
    leafGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, -0.42, 0.28, 0.025, -0.38, 0.68, 0,
      0, 1, 0.015, 0.38, 0.68, 0, 0.42, 0.28, 0.025, 0, 0.5, 0.13
    ], 3));
    leafGeometry.setIndex([0, 1, 6, 1, 2, 6, 2, 3, 6, 3, 4, 6, 4, 5, 6, 5, 0, 6]);
    leafGeometry.computeVertexNormals();
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.85, flatShading: true });
    const perCluster = type === 'pine' ? 85 : (type === 'birch' ? 100 : 170);
    const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, clusters.length * perCluster);
    leaves.name = 'Individual_Leaves';
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    const transform = new THREE.Object3D();
    const palette = style.leaves.map(color => new THREE.Color(color));
    const foliagePoints = [];
    let leafIndex = 0;
    clusters.forEach(cluster => {
      for (let leaf = 0; leaf < perCluster; leaf++) {
        const azimuth = random() * Math.PI * 2;
        const vertical = random() * 2 - 1;
        const distance = Math.cbrt(random()) * cluster.radius;
        const horizontal = Math.sqrt(1 - vertical * vertical) * distance;
        transform.position.copy(cluster.center).add(new THREE.Vector3(Math.cos(azimuth) * horizontal, vertical * distance * cluster.flatten, Math.sin(azimuth) * horizontal));
        if (type === 'willow') transform.position.y -= Math.pow(leaf / perCluster, 2) * 1.35;
        transform.rotation.set(random() * Math.PI, azimuth, random() * Math.PI);
        const length = type === 'pine' ? 0.23 + random() * 0.18 : (type === 'autumn' ? 0.25 + random() * 0.23 : 0.18 + random() * 0.17);
        transform.scale.set(type === 'willow' || type === 'pine' ? length * 0.4 : length, length, length);
        transform.updateMatrix();
        leaves.setMatrixAt(leafIndex, transform.matrix);
        leaves.setColorAt(leafIndex++, palette[Math.floor(random() * palette.length)]);
        if (leaf % 15 === 0) foliagePoints.push(transform.position.clone());
      }
    });
    crown.add(leaves);

    if (type === 'oak') {
      const puffs = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), leafMaterial, clusters.length * 5);
      puffs.name = 'Soft_Foliage_Clusters';
      clusters.forEach((cluster, clusterIndex) => {
        for (let puff = 0; puff < 5; puff++) {
          transform.position.copy(cluster.center).add(new THREE.Vector3((random() - 0.5) * 0.8, (random() - 0.5) * 0.65, (random() - 0.5) * 0.8));
          transform.rotation.set(random(), random(), random());
          transform.scale.set(0.42 + random() * 0.18, 0.42 + random() * 0.16, 0.42 + random() * 0.18);
          transform.updateMatrix();
          puffs.setMatrixAt(clusterIndex * 5 + puff, transform.matrix);
          puffs.setColorAt(clusterIndex * 5 + puff, palette[Math.floor(random() * palette.length)]);
        }
      });
      puffs.castShadow = puffs.receiveShadow = true;
      crown.add(puffs);
    }

    if (type === 'blossom' || type === 'apple') {
      const flowering = type === 'blossom';
      const accents = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: flowering ? 0.8 : 0.4, flatShading: true }),
        flowering ? foliagePoints.length * 5 : 24
      );
      accents.name = flowering ? 'Pink_Blossoms' : 'Red_Apples';
      for (let index = 0; index < accents.count; index++) {
        const center = foliagePoints[flowering ? Math.floor(index / 5) : index * 3 % foliagePoints.length];
        const angle = index % 5 * Math.PI * 2 / 5;
        transform.position.copy(center);
        if (flowering) transform.position.add(new THREE.Vector3(Math.cos(angle) * 0.075, Math.sin(angle) * 0.075, 0.04));
        else transform.position.y -= 0.12;
        transform.rotation.set(0, 0, angle);
        transform.scale.setScalar(flowering ? 0.066 : 0.12);
        if (flowering) transform.scale.z *= 0.45;
        transform.updateMatrix();
        accents.setMatrixAt(index, transform.matrix);
        accents.setColorAt(index, new THREE.Color(flowering ? (index % 3 ? 0xd76a9b : 0xf2a8c5) : (index % 3 ? 0xb83232 : 0xdc5741)));
      }
      accents.castShadow = true;
      crown.add(accents);
    }
    if (type === 'birch') {
      const markings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x524e45, roughness: 1 }), 24);
      for (let index = 0; index < 24; index++) {
        const height = 0.2 + index / 24 * trunkHeight;
        const progress = height / trunkHeight;
        const angle = random() * Math.PI * 2;
        const radius = 0.27 * (1 - progress * 0.85);
        transform.position.set(Math.sin(progress * 3) * 0.16 + Math.sin(angle) * radius, height, Math.sin(progress * 4) * 0.1 + Math.cos(angle) * radius);
        transform.rotation.set(0, angle, 0.08);
        transform.scale.set(0.09 + random() * 0.1, 0.025, 0.015);
        transform.updateMatrix();
        markings.setMatrixAt(index, transform.matrix);
      }
      markings.userData.physics = false;
      root.add(markings);
    }
    root.userData.windPhase = random() * Math.PI * 2;
    return root;
  }
}