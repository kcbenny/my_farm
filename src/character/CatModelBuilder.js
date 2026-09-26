import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

/**
 * Procedural 3D Cartoon Cat Model Generator
 * Supports 5 distinct character styles:
 * 1. Sunny - Energetic Singing Golden Tabby Kitten with Open Meowing Mouth (Image 1)
 * 2. Mochi - Sleepy Siamese Point Kitten with Cozy Closed Eyes & Chocolate Points (Image 2)
 * 3. Snowball - Extra-Fluffy Pure White Persian with Sparkling Emerald Eyes & Fluffy Cheeks (Image 3)
 * 4. Rusty - Classic Farm Guardian Tabby with Military Helmet, Bandana & Peashooter
 * 5. Cozy - Low-Poly Hearthside Tabby with Closed Smiling Eyes
 */
export class CatModelBuilder {
  constructor(characterType = 'cozy') {
    this.characterType = characterType;
    this.materials = this.createMaterials(characterType);
    if (characterType === 'pearl') this.preparePearlFur();
  }

  preparePearlFur() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = '#808080';
    context.fillRect(0, 0, 256, 256);
    const random = () => THREE.MathUtils.seededRandom();
    THREE.MathUtils.seededRandom(731);
    for (let strand = 0; strand < 5000; strand++) {
      const horizontal = random() * 256;
      const vertical = random() * 256;
      const shade = Math.floor(95 + random() * 65);
      context.strokeStyle = `rgb(${shade}, ${shade}, ${shade})`;
      context.lineWidth = 0.5 + random() * 0.6;
      context.beginPath();
      context.moveTo(horizontal, vertical);
      context.quadraticCurveTo(horizontal + 1, vertical + 4, horizontal + 2, vertical + 8);
      context.stroke();
    }
    const bump = new THREE.CanvasTexture(canvas);
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.set(3, 3);
    for (const name of ['fur', 'bellyWhite', 'paws', 'fluffTuft']) {
      this.materials[name].bumpMap = bump;
      this.materials[name].bumpScale = 0.006;
      this.materials[name].roughness = 0.96;
      this.materials[name].metalness = 0;
    }
    this.materials.fur.map = null;
    this.materials.eyes = new THREE.MeshPhysicalMaterial({
      map: this.materials.eyes.map,
      roughness: 0.19,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.06
    });
    this.materials.furStrands = new THREE.MeshPhysicalMaterial({
      color: 0xfffdf9,
      vertexColors: true,
      roughness: 0.95,
      sheen: 1,
      sheenColor: new THREE.Color(0xffffff),
      sheenRoughness: 0.8,
      side: THREE.DoubleSide
    });
  }

  addPearlFur(root) {
    const surfaces = [];
    const furMaterials = ['fur', 'bellyWhite', 'paws', 'fluffTuft'].map(name => this.materials[name]);
    root.traverse(object => {
      if (object.isMesh && furMaterials.includes(object.material)) surfaces.push(object);
    });
    THREE.MathUtils.seededRandom(917);
    const random = () => THREE.MathUtils.seededRandom();
    for (const surface of surfaces) {
      surface.geometry.computeBoundingSphere();
      const radius = surface.geometry.boundingSphere.radius;
      const count = Math.min(6500, Math.max(180, Math.round(radius * radius * 21000)));
      const sampler = new MeshSurfaceSampler(surface).setRandomGenerator(random).build();
      const positions = [];
      const normals = [];
      const colors = [];
      const indices = [];
      const point = new THREE.Vector3();
      const normal = new THREE.Vector3();
      const comb = new THREE.Vector3();
      const sideways = new THREE.Vector3();
      const center = new THREE.Vector3();
      const isHead = surface.name === 'Head_Mesh';
      for (let strand = 0; strand < count; strand++) {
        sampler.sample(point, normal);
        const isFace = isHead && point.z > 0.28 && Math.abs(point.x) < 0.43;
        const length = (isFace ? 0.014 : Math.min(0.085, radius * 0.25)) * (0.5 + random());
        const width = 0.0015 + random() * 0.0015;
        comb.set(normal.x * 0.35, -1, normal.z * 0.12);
        comb.addScaledVector(normal, -comb.dot(normal)).normalize();
        if (comb.lengthSq() < 0.01) comb.set(1, 0, 0);
        sideways.crossVectors(normal, comb).normalize();
        const bend = (random() - 0.5) * length * 0.35;
        const shade = 0.78 + random() * 0.15;
        const base = positions.length / 3;
        for (let segment = 0; segment <= 3; segment++) {
          const progress = segment / 3;
          center.copy(point).addScaledVector(normal, 0.001 + length * progress * (1 - progress * 0.38));
          center.addScaledVector(comb, length * progress * progress * 0.65);
          center.addScaledVector(sideways, bend * progress * progress);
          for (const side of [-1, 1]) {
            const spread = side * width * (1 - progress * 0.97);
            positions.push(center.x + sideways.x * spread, center.y + sideways.y * spread, center.z + sideways.z * spread);
            normals.push(normal.x, normal.y, normal.z);
            const brightness = shade + (1 - shade) * progress;
            colors.push(brightness, brightness, brightness);
          }
          if (segment < 3) {
            const vertex = base + segment * 2;
            indices.push(vertex, vertex + 1, vertex + 2, vertex + 1, vertex + 3, vertex + 2);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      const fur = new THREE.Mesh(geometry, this.materials.furStrands);
      fur.name = 'Pearl_Fur_Strands';
      fur.userData.isFur = true;
      surface.add(fur);
    }
  }

  createFurTexture(characterType = 'cozy') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (characterType === 'mochi') {
      // 2. Mochi: Siamese Seal-Point (Ivory cream body with chocolate gradients)
      ctx.fillStyle = '#f8f1e5';
      ctx.fillRect(0, 0, 512, 512);

      const bodyGrad = ctx.createRadialGradient(256, 256, 60, 256, 256, 250);
      bodyGrad.addColorStop(0, '#faf4eb');
      bodyGrad.addColorStop(0.7, '#f0e2cf');
      bodyGrad.addColorStop(1, '#e3cfb7');
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#fffdfa';
      ctx.beginPath();
      ctx.ellipse(256, 380, 140, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      const maskGrad = ctx.createRadialGradient(256, 170, 20, 256, 170, 130);
      maskGrad.addColorStop(0, 'rgba(66, 41, 29, 0.95)');
      maskGrad.addColorStop(0.5, 'rgba(110, 77, 58, 0.75)');
      maskGrad.addColorStop(0.85, 'rgba(168, 130, 107, 0.3)');
      maskGrad.addColorStop(1, 'rgba(240, 226, 207, 0)');
      ctx.fillStyle = maskGrad;
      ctx.beginPath();
      ctx.ellipse(256, 170, 135, 110, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (characterType === 'snowball' || characterType === 'pearl') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);

      const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 250);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.65, '#fafcff');
      grad.addColorStop(1, '#edf2f7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      const blushL = ctx.createRadialGradient(160, 240, 5, 160, 240, 45);
      blushL.addColorStop(0, 'rgba(255, 182, 193, 0.55)');
      blushL.addColorStop(1, 'rgba(255, 182, 193, 0)');
      ctx.fillStyle = blushL;
      ctx.beginPath();
      ctx.arc(160, 240, 45, 0, Math.PI * 2);
      ctx.fill();

      const blushR = ctx.createRadialGradient(352, 240, 5, 352, 240, 45);
      blushR.addColorStop(0, 'rgba(255, 182, 193, 0.55)');
      blushR.addColorStop(1, 'rgba(255, 182, 193, 0)');
      ctx.fillStyle = blushR;
      ctx.beginPath();
      ctx.arc(352, 240, 45, 0, Math.PI * 2);
      ctx.fill();

    } else if (characterType === 'sunny') {
      ctx.fillStyle = '#f7972d';
      ctx.fillRect(0, 0, 512, 512);

      const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 250);
      grad.addColorStop(0, '#fca744');
      grad.addColorStop(0.8, '#f18c21');
      grad.addColorStop(1, '#db7210');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#fff9f0';
      ctx.beginPath();
      ctx.ellipse(256, 380, 140, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#9e3d04';
      ctx.beginPath();
      ctx.moveTo(256, 70);
      ctx.lineTo(238, 105);
      ctx.lineTo(256, 122);
      ctx.lineTo(274, 105);
      ctx.closePath();
      ctx.fill();

      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#9e3d04';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(256 + i * 28, 48);
        ctx.lineTo(256 + i * 24, 75);
        ctx.stroke();
      }

      const stripes = [
        { y: 155, len: 90, side: -1 }, { y: 155, len: 90, side: 1 },
        { y: 195, len: 115, side: -1 }, { y: 195, len: 115, side: 1 },
        { y: 240, len: 85, side: -1 }, { y: 240, len: 85, side: 1 },
        { y: 295, len: 80, side: -1 }, { y: 295, len: 80, side: 1 },
      ];

      ctx.lineWidth = 13;
      ctx.strokeStyle = '#9e3d04';
      stripes.forEach(s => {
        ctx.beginPath();
        const startX = 256 + s.side * 170;
        const endX = 256 + s.side * (170 - s.len);
        ctx.moveTo(startX, s.y);
        ctx.quadraticCurveTo(startX - s.side * 22, s.y + 10, endX, s.y + 4);
        ctx.stroke();
      });

    } else if (characterType === 'cozy') {
      const base = ctx.createRadialGradient(256, 248, 40, 256, 248, 250);
      base.addColorStop(0, '#f8d7a7');
      base.addColorStop(0.55, '#e6a24f');
      base.addColorStop(1, '#bb6b1e');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);

      const belly = ctx.createRadialGradient(256, 372, 25, 256, 372, 170);
      belly.addColorStop(0, '#fff8ee');
      belly.addColorStop(1, '#f6ebde');
      ctx.fillStyle = belly;
      ctx.beginPath();
      ctx.ellipse(256, 382, 132, 108, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 245, 230, 0.5)';
      ctx.beginPath();
      ctx.moveTo(120, 150);
      ctx.lineTo(210, 110);
      ctx.lineTo(236, 190);
      ctx.lineTo(150, 220);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(171, 97, 26, 0.42)';
      ctx.beginPath();
      ctx.moveTo(314, 120);
      ctx.lineTo(402, 174);
      ctx.lineTo(356, 248);
      ctx.lineTo(274, 194);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(120, 63, 14, 0.2)';
      ctx.beginPath();
      ctx.moveTo(166, 266);
      ctx.lineTo(250, 232);
      ctx.lineTo(292, 320);
      ctx.lineTo(202, 346);
      ctx.closePath();
      ctx.fill();

    } else if (characterType === 'ember') {
      const base = ctx.createLinearGradient(0, 0, 512, 512);
      base.addColorStop(0, '#dfe7ef');
      base.addColorStop(0.55, '#b7c4d3');
      base.addColorStop(1, '#8ea0b6');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#f9d990';
      ctx.beginPath();
      ctx.ellipse(256, 390, 150, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 12;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(256 + i * 30, 145);
        ctx.quadraticCurveTo(256 + i * 25, 185, 256 + i * 38, 230);
        ctx.stroke();
      }

    } else if (characterType === 'moss') {
      const base = ctx.createRadialGradient(256, 256, 30, 256, 256, 260);
      base.addColorStop(0, '#d9b78f');
      base.addColorStop(0.7, '#b8834c');
      base.addColorStop(1, '#7c4f2d');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#7ca66a';
      ctx.beginPath();
      ctx.ellipse(256, 390, 145, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#425b2a';
      ctx.lineWidth = 12;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(256 + i * 34, 160);
        ctx.quadraticCurveTo(256 + i * 20, 205, 256 + i * 42, 255);
        ctx.stroke();
      }

    } else if (characterType === 'puff') {
      const base = ctx.createRadialGradient(256, 256, 50, 256, 256, 260);
      base.addColorStop(0, '#ffffff');
      base.addColorStop(0.7, '#edf6ff');
      base.addColorStop(1, '#dbeafe');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#f5f9ff';
      ctx.beginPath();
      ctx.ellipse(256, 390, 145, 115, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 10;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(256 + i * 28, 150);
        ctx.quadraticCurveTo(256 + i * 22, 185, 256 + i * 32, 230);
        ctx.stroke();
      }

    } else if (characterType === 'maple') {
      const base = ctx.createRadialGradient(256, 256, 30, 256, 256, 260);
      base.addColorStop(0, '#f7d7a3');
      base.addColorStop(0.75, '#e7a63d');
      base.addColorStop(1, '#b86f1c');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#fef6df';
      ctx.beginPath();
      ctx.ellipse(256, 390, 145, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#8a4b18';
      ctx.lineWidth = 12;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(256 + i * 32, 145);
        ctx.quadraticCurveTo(256 + i * 20, 190, 256 + i * 38, 240);
        ctx.stroke();
      }

    } else if (characterType === 'cedar') {
      const base = ctx.createLinearGradient(0, 0, 512, 512);
      base.addColorStop(0, '#e7f3fb');
      base.addColorStop(0.45, '#bfdfe9');
      base.addColorStop(1, '#9cc9d9');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#f2f0ea';
      ctx.beginPath();
      ctx.ellipse(256, 390, 145, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 11;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(256 + i * 30, 150);
        ctx.quadraticCurveTo(256 + i * 18, 188, 256 + i * 34, 236);
        ctx.stroke();
      }

    } else {
      ctx.fillStyle = '#f28e2b';
      ctx.fillRect(0, 0, 512, 512);

      const grad = ctx.createRadialGradient(256, 256, 50, 256, 256, 250);
      grad.addColorStop(0, '#f89e3a');
      grad.addColorStop(1, '#d97216');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#fff7eb';
      ctx.beginPath();
      ctx.ellipse(256, 380, 140, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b24c08';
      ctx.beginPath();
      ctx.moveTo(256, 80);
      ctx.lineTo(240, 110);
      ctx.lineTo(256, 125);
      ctx.lineTo(272, 110);
      ctx.closePath();
      ctx.fill();

      const stripes = [
        { y: 160, len: 90, side: -1 }, { y: 160, len: 90, side: 1 },
        { y: 200, len: 110, side: -1 }, { y: 200, len: 110, side: 1 },
        { y: 240, len: 80, side: -1 }, { y: 240, len: 80, side: 1 },
        { y: 300, len: 70, side: -1 }, { y: 300, len: 70, side: 1 },
      ];

      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#a64405';
      stripes.forEach(s => {
        ctx.beginPath();
        const startX = 256 + s.side * 170;
        const endX = 256 + s.side * (170 - s.len);
        ctx.moveTo(startX, s.y);
        ctx.quadraticCurveTo(startX - s.side * 20, s.y + 10, endX, s.y + 5);
        ctx.stroke();
      });
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  createEyeTexture(characterType = 'cozy') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (characterType === 'pearl') {
      ctx.fillStyle = '#102936';
      ctx.fillRect(0, 0, 256, 256);
      const iris = ctx.createRadialGradient(128, 110, 36, 128, 128, 124);
      iris.addColorStop(0, '#123c55');
      iris.addColorStop(0.6, '#318bb5');
      iris.addColorStop(0.85, '#89d8ed');
      iris.addColorStop(1, '#173c52');
      ctx.fillStyle = iris;
      ctx.beginPath();
      ctx.arc(128, 128, 120, 0, Math.PI * 2);
      ctx.fill();
      for (let fiber = 0; fiber < 240; fiber++) {
        const angle = fiber * Math.PI * 2 / 240;
        const innerRadius = 74 + Math.sin(fiber * 7.3) * 8;
        const outerRadius = 113 + Math.sin(fiber * 3.7) * 4;
        ctx.strokeStyle = fiber % 3 === 0 ? 'rgba(163, 221, 235, 0.55)' : 'rgba(18, 62, 87, 0.45)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(128 + Math.cos(angle) * innerRadius, 128 + Math.sin(angle) * innerRadius);
        ctx.lineTo(128 + Math.cos(angle + 0.025) * outerRadius, 128 + Math.sin(angle + 0.025) * outerRadius);
        ctx.stroke();
      }
      ctx.fillStyle = '#04111b';
      ctx.beginPath();
      ctx.ellipse(128, 111, 78, 86, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(83, 65, 13, 20, -0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(172, 158, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (characterType === 'mochi') {
      ctx.fillStyle = '#f8f1e5';
      ctx.fillRect(0, 0, 256, 256);

      const blush = ctx.createRadialGradient(128, 175, 10, 128, 175, 55);
      blush.addColorStop(0, 'rgba(255, 170, 180, 0.45)');
      blush.addColorStop(1, 'rgba(255, 170, 180, 0)');
      ctx.fillStyle = blush;
      ctx.beginPath();
      ctx.arc(128, 175, 55, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#382015';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(55, 125);
      ctx.quadraticCurveTo(128, 168, 201, 125);
      ctx.stroke();

      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(195, 128);
      ctx.quadraticCurveTo(215, 120, 222, 110);
      ctx.moveTo(186, 134);
      ctx.quadraticCurveTo(205, 133, 215, 126);
      ctx.moveTo(175, 140);
      ctx.quadraticCurveTo(192, 145, 202, 142);
      ctx.stroke();

    } else if (characterType === 'snowball') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);

      const irisGrad = ctx.createRadialGradient(128, 128, 15, 128, 128, 92);
      irisGrad.addColorStop(0, '#38ef7d');
      irisGrad.addColorStop(0.35, '#11998e');
      irisGrad.addColorStop(0.75, '#07614a');
      irisGrad.addColorStop(1, '#022e23');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.arc(128, 128, 95, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#011c15';
      ctx.beginPath();
      ctx.ellipse(128, 128, 44, 62, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(110, 255, 180, 0.45)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(128, 128, 78, Math.PI * 0.2, Math.PI * 0.85);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(102, 98, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(152, 148, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(114, 148, 7, 0, Math.PI * 2);
      ctx.fill();

    } else if (characterType === 'sunny') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);

      const irisGrad = ctx.createRadialGradient(128, 128, 15, 128, 128, 92);
      irisGrad.addColorStop(0, '#ffc048');
      irisGrad.addColorStop(0.5, '#78c044');
      irisGrad.addColorStop(0.85, '#2f6d2b');
      irisGrad.addColorStop(1, '#1b3b18');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.arc(128, 128, 95, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0d1e0c';
      ctx.beginPath();
      ctx.ellipse(128, 128, 46, 64, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(104, 98, 27, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(150, 150, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(116, 146, 8, 0, Math.PI * 2);
      ctx.fill();

    } else if (characterType === 'cozy') {
      ctx.fillStyle = '#fdf6ed';
      ctx.fillRect(0, 0, 256, 256);

      ctx.strokeStyle = '#6b3f1d';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(60, 128);
      ctx.quadraticCurveTo(90, 108, 120, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(136, 128);
      ctx.quadraticCurveTo(166, 108, 196, 128);
      ctx.stroke();

      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(94, 165);
      ctx.quadraticCurveTo(128, 182, 162, 165);
      ctx.stroke();

      ctx.fillStyle = 'rgba(248, 180, 134, 0.35)';
      ctx.beginPath();
      ctx.arc(77, 159, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(179, 159, 20, 0, Math.PI * 2);
      ctx.fill();

    } else if (characterType === 'ember' || characterType === 'moss' || characterType === 'puff' || characterType === 'maple' || characterType === 'cedar') {
      ctx.fillStyle = '#f4f7fb';
      ctx.fillRect(0, 0, 256, 256);

      const irisGrad = ctx.createRadialGradient(128, 128, 14, 128, 128, 90);
      const palette = {
        ember: ['#f8b84e', '#d97706', '#7c2d12'],
        moss: ['#94d980', '#3f6212', '#1a2e0f'],
        puff: ['#cfe8ff', '#60a5fa', '#1d4ed8'],
        maple: ['#ffc876', '#f59e0b', '#7c2d12'],
        cedar: ['#9de5ff', '#38bdf8', '#0f766e']
      }[characterType];

      irisGrad.addColorStop(0, palette[0]);
      irisGrad.addColorStop(0.45, palette[1]);
      irisGrad.addColorStop(1, palette[2]);
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.arc(128, 128, 88, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0b1320';
      ctx.beginPath();
      ctx.ellipse(128, 128, 38, 54, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(104, 96, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(146, 148, 10, 0, Math.PI * 2);
      ctx.fill();

    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);

      const irisGrad = ctx.createRadialGradient(128, 128, 20, 128, 128, 90);
      irisGrad.addColorStop(0, '#52b788');
      irisGrad.addColorStop(0.6, '#2d6a4f');
      irisGrad.addColorStop(0.9, '#1b4332');
      irisGrad.addColorStop(1, '#081c15');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.arc(128, 128, 95, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#081c15';
      ctx.beginPath();
      ctx.ellipse(128, 128, 48, 65, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(105, 100, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(150, 150, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(115, 145, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  createMaterials(characterType = 'cozy') {
    const furTexture = this.createFurTexture(characterType);
    const eyeTexture = this.createEyeTexture(characterType);
    const isCozy = characterType === 'cozy';

    // Color definitions based on character
    let bellyColor = 0xfff6ec;
    let darkAccentColor = 0xc45e12;
    let noseColor = 0xff99aa;
    let innerEarColor = 0xffb7c5;
    let pawColor = 0xfff6ec;

    if (characterType === 'mochi') {
      bellyColor = 0xf8f1e5;
      darkAccentColor = 0x42291d;
      noseColor = 0x382015;
      innerEarColor = 0x6d4c41;
      pawColor = 0x4a2e20;
    } else if (characterType === 'snowball' || characterType === 'pearl') {
      bellyColor = 0xffffff;
      darkAccentColor = 0xe2e8f0;
      noseColor = 0xffa6c1;
      innerEarColor = 0xffccd5;
      pawColor = 0xffffff;
    } else if (characterType === 'sunny') {
      bellyColor = 0xfff9f0;
      darkAccentColor = 0xb24c08;
      noseColor = 0xff85a1;
      innerEarColor = 0xffb3c1;
      pawColor = 0xfff9f0;
    } else if (characterType === 'ember') {
      bellyColor = 0xf6f1ea;
      darkAccentColor = 0x6b7280;
      noseColor = 0xff8b6b;
      innerEarColor = 0xffd29a;
      pawColor = 0xf0e2d0;
    } else if (characterType === 'moss') {
      bellyColor = 0xf5ead9;
      darkAccentColor = 0x486a31;
      noseColor = 0xffa77d;
      innerEarColor = 0xf9d8ac;
      pawColor = 0xd7b58d;
    } else if (characterType === 'puff') {
      bellyColor = 0xf7fbff;
      darkAccentColor = 0xb6d8ff;
      noseColor = 0xff9ec4;
      innerEarColor = 0xffd6e7;
      pawColor = 0xe0f2fe;
    } else if (characterType === 'maple') {
      bellyColor = 0xfff5e5;
      darkAccentColor = 0x7a430f;
      noseColor = 0xff8c69;
      innerEarColor = 0xfde68a;
      pawColor = 0xf6d7a1;
    } else if (characterType === 'cedar') {
      bellyColor = 0xf3f7f2;
      darkAccentColor = 0x37586b;
      noseColor = 0xff9ab8;
      innerEarColor = 0xbde7ff;
      pawColor = 0xdfe9e1;
    } else if (characterType === 'cozy') {
      bellyColor = 0xfff7ef;
      darkAccentColor = 0xb35a1e;
      noseColor = 0xff9eb0;
      innerEarColor = 0xf7cfb6;
      pawColor = 0xfff1e7;
    }

    const ribbonColor = characterType === 'sunny' ? 0xe63946 :
      (characterType === 'mochi' ? 0x457b9d :
        (characterType === 'snowball' ? 0x059669 :
          (characterType === 'ember' ? 0xf97316 :
            (characterType === 'moss' ? 0x84cc16 :
              (characterType === 'puff' ? 0x60a5fa :
                (characterType === 'maple' ? 0xf59e0b :
                  (characterType === 'cedar' ? 0x14b8a6 : (characterType === 'cozy' ? 0x9a3412 : 0xd90429))))))));

    return {
      fur: new THREE.MeshStandardMaterial({
        map: furTexture,
        roughness: isCozy ? 0.9 : 0.85,
        metalness: 0.02,
        color: 0xffffff,
        flatShading: false,
      }),
      bellyWhite: new THREE.MeshStandardMaterial({
        color: bellyColor,
        roughness: isCozy ? 0.9 : 0.88,
        metalness: 0.0,
        flatShading: false,
      }),
      paws: new THREE.MeshStandardMaterial({
        color: pawColor,
        roughness: isCozy ? 0.9 : 0.85,
        metalness: 0.0,
        flatShading: false,
      }),
      darkAccent: new THREE.MeshStandardMaterial({
        color: darkAccentColor,
        roughness: isCozy ? 0.88 : 0.82,
        metalness: 0.02,
        flatShading: false,
      }),
      pinkNose: new THREE.MeshStandardMaterial({
        color: noseColor,
        roughness: isCozy ? 0.32 : 0.25,
        metalness: 0.06,
        flatShading: false,
      }),
      innerEar: new THREE.MeshStandardMaterial({
        color: innerEarColor,
        roughness: isCozy ? 0.88 : 0.85,
        flatShading: false,
      }),
      eyes: new THREE.MeshStandardMaterial({
        map: eyeTexture,
        roughness: isCozy ? 0.22 : 0.08,
        metalness: 0.18,
        flatShading: false,
      }),

      // Character-specific mouth materials (Sunny's open singing mouth)
      mouthInterior: new THREE.MeshStandardMaterial({
        color: 0x590d18, // Deep wine mouth cavity
        roughness: 0.45,
        flatShading: false,
      }),
      tongue: new THREE.MeshStandardMaterial({
        color: 0xff6b8b, // Cute pink tongue
        roughness: 0.3,
        flatShading: false,
      }),
      teeth: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.15,
        flatShading: false,
      }),

      // Fluffy tufts material for Snowball
      fluffTuft: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.88,
        flatShading: false,
      }),

      // Character specific accessories
      goldBell: new THREE.MeshStandardMaterial({
        color: 0xffd166, // Shiny brass gold bell
        roughness: 0.2,
        metalness: 0.85,
        flatShading: false,
      }),
      emeraldJewel: new THREE.MeshStandardMaterial({
        color: 0x10b981, // Glowing emerald gemstone
        roughness: 0.1,
        metalness: 0.3,
        emissive: 0x054f38,
        emissiveIntensity: 0.45,
        flatShading: false,
      }),
      nightcapBlue: new THREE.MeshStandardMaterial({
        color: 0x8ecae6, // Pastel cozy blue nightcap
        roughness: 0.8,
        flatShading: false,
      }),
      ribbonCollar: new THREE.MeshStandardMaterial({
        color: characterType === 'pearl' ? 0xeaa4b6 : ribbonColor,
        roughness: characterType === 'pearl' ? 0.95 : 0.55,
        flatShading: false,
      }),

      // Rusty accessories
      helmet: new THREE.MeshStandardMaterial({
        color: 0x4a5d3f,
        roughness: 0.4,
        metalness: 0.18,
        flatShading: false,
      }),
      helmetRim: new THREE.MeshStandardMaterial({
        color: 0x33402b,
        roughness: 0.5,
        metalness: 0.25,
        flatShading: false,
      }),
      helmetBadge: new THREE.MeshStandardMaterial({
        color: 0xf4a261,
        roughness: 0.22,
        metalness: 0.75,
        flatShading: false,
      }),
      bandana: new THREE.MeshStandardMaterial({
        color: 0xd90429,
        roughness: 0.6,
        metalness: 0.02,
        flatShading: false,
      }),

      // Peashooter Gun
      plantGunGreen: new THREE.MeshStandardMaterial({
        color: 0x38b000,
        roughness: 0.35,
        metalness: 0.08,
        flatShading: false,
      }),
      plantGunDark: new THREE.MeshStandardMaterial({
        color: 0x007200,
        roughness: 0.45,
        flatShading: false,
      }),
      plantGunYellow: new THREE.MeshStandardMaterial({
        color: 0xffd000,
        roughness: 0.35,
        flatShading: false,
      }),
      peaProjectile: new THREE.MeshStandardMaterial({
        color: 0x70e000,
        roughness: 0.25,
        metalness: 0.1,
        emissive: 0x205000,
        emissiveIntensity: 0.35,
        flatShading: false,
      })
    };
  }

  addPearlDetails(headBone) {
    const yarn = new THREE.Group();
    yarn.name = 'Pearl_Yarn_Bow';
    const addCord = (points, radius = 0.016) => {
      const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
      for (let strand = 0; strand < 3; strand++) {
        const strandPoints = [];
        for (let step = 0; step <= 96; step++) {
          const progress = step / 96;
          const point = curve.getPoint(progress);
          const tangent = curve.getTangent(progress);
          const normal = new THREE.Vector3(0, 0, 1).cross(tangent).normalize();
          const binormal = tangent.clone().cross(normal).normalize();
          const angle = progress * Math.PI * 32 + strand * Math.PI * 2 / 3;
          point.addScaledVector(normal, Math.cos(angle) * radius * 0.5);
          point.addScaledVector(binormal, Math.sin(angle) * radius * 0.5);
          strandPoints.push(point);
        }
        const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strandPoints), 96, radius * 0.55, 5, false);
        yarn.add(new THREE.Mesh(geometry, this.materials.ribbonCollar));
      }
    };
    addCord([[-0.57, -0.23, 0.15], [-0.52, 0.13, 0.25], [-0.34, 0.4, 0.28], [0, 0.49, 0.23], [0.34, 0.4, 0.28], [0.52, 0.13, 0.25], [0.57, -0.23, 0.15]]);
    for (const side of [-1, 1]) {
      addCord([[0, 0.5, 0.25], [side * 0.16, 0.67, 0.23], [side * 0.3, 0.66, 0.2], [side * 0.25, 0.53, 0.27], [0, 0.5, 0.25]], 0.023);
      addCord([[side * 0.025, 0.52, 0.27], [side * 0.13, 0.45, 0.36], [side * 0.22, 0.32, 0.4]], 0.018);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), this.materials.ribbonCollar);
    knot.position.set(0, 0.52, 0.26);
    knot.scale.set(0.8, 1.2, 0.85);
    yarn.add(knot);
    headBone.add(yarn);

  }

  buildCatModel(characterType = this.characterType || 'cozy') {
    const root = new THREE.Group();
    root.name = 'Cat_Root';
    const isCozy = characterType === 'cozy';
    const isPearl = characterType === 'pearl';
    const isFluffy = characterType === 'snowball' || isPearl;

    // Base Pelvis Node
    const pelvis = new THREE.Group();
    pelvis.name = 'Pelvis';
    pelvis.position.set(0, 0.72, 0);
    root.add(pelvis);

    // Spine & Chest
    const spine = new THREE.Group();
    spine.name = 'Spine';
    pelvis.add(spine);

    const chest = new THREE.Group();
    chest.name = 'Chest';
    chest.position.set(0, 0.3, 0);
    spine.add(chest);

    // 1. Chubby Body Mesh (Belly + Torso) - Silky smooth subdivision
    const bodyGeom = new THREE.SphereGeometry(0.52, isCozy ? 8 : 32, isCozy ? 6 : 24);
    bodyGeom.scale(isCozy ? 1.02 : 1.0, isCozy ? 0.96 : 1.15, isCozy ? 0.84 : 0.95);
    bodyGeom.computeVertexNormals();
    const bodyMesh = new THREE.Mesh(bodyGeom, this.materials.fur);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.name = 'Body_Mesh';
    bodyMesh.position.set(0, isCozy ? -0.08 : 0.05, 0.02);
    spine.add(bodyMesh);

    // White belly patch mesh
    const bellyPatchGeom = new THREE.SphereGeometry(0.44, isCozy ? 8 : 28, isCozy ? 6 : 20);
    bellyPatchGeom.scale(isCozy ? 0.8 : 0.85, isCozy ? 0.82 : 1.0, isCozy ? 0.48 : 0.6);
    bellyPatchGeom.computeVertexNormals();
    const bellyPatchMesh = new THREE.Mesh(bellyPatchGeom, this.materials.bellyWhite);
    bellyPatchMesh.position.set(0, isCozy ? -0.04 : 0.02, isCozy ? 0.26 : 0.32);
    bellyPatchMesh.castShadow = true;
    bellyPatchMesh.name = 'Belly_Patch';
    spine.add(bellyPatchMesh);

    // Extra Fluffy Chest Ruff for Snowball (Persian Fur Cravat)
    if (isFluffy) {
      const ruffGroup = new THREE.Group();
      ruffGroup.name = 'Chest_Ruff';
      ruffGroup.position.set(0, 0.12, 0.36);

      const ruffGeom1 = new THREE.SphereGeometry(0.18, 24, 18);
      ruffGeom1.scale(1.6, 0.8, 0.8);
      ruffGeom1.computeVertexNormals();
      const ruffMesh1 = new THREE.Mesh(ruffGeom1, this.materials.fluffTuft);
      ruffMesh1.position.set(0, 0.08, 0.02);
      ruffGroup.add(ruffMesh1);

      const ruffGeom2 = new THREE.SphereGeometry(0.15, 24, 18);
      ruffGeom2.scale(1.4, 0.7, 0.7);
      ruffGeom2.computeVertexNormals();
      const ruffMesh2 = new THREE.Mesh(ruffGeom2, this.materials.fluffTuft);
      ruffMesh2.position.set(0, -0.06, 0.04);
      ruffGroup.add(ruffMesh2);

      chest.add(ruffGroup);
    }

    // 2. Neck Accessories: Bandana / Collar / Bell / Jewel
    const bandanaGroup = new THREE.Group();
    bandanaGroup.name = 'Bandana';
    bandanaGroup.position.set(0, 0.28, 0.02);

    if (isCozy) {
      bandanaGroup.visible = false;
    } else if (characterType === 'rusty') {
      // Classic Red Bandana for Rusty
      const collarGeom = new THREE.TorusGeometry(0.38, 0.07, 16, 32);
      collarGeom.rotateX(Math.PI / 2);
      collarGeom.scale(1.0, 0.9, 0.8);
      collarGeom.computeVertexNormals();
      const collarMesh = new THREE.Mesh(collarGeom, this.materials.bandana);
      collarMesh.castShadow = true;
      bandanaGroup.add(collarMesh);

      const bandanaFoldGeom = new THREE.ConeGeometry(0.18, 0.24, 16);
      bandanaFoldGeom.rotateX(Math.PI);
      bandanaFoldGeom.scale(1.2, 1.0, 0.4);
      bandanaFoldGeom.computeVertexNormals();
      const bandanaFoldMesh = new THREE.Mesh(bandanaFoldGeom, this.materials.bandana);
      bandanaFoldMesh.position.set(0, -0.15, 0.32);
      bandanaFoldMesh.rotation.x = -0.25;
      bandanaFoldMesh.castShadow = true;
      bandanaGroup.add(bandanaFoldMesh);

      const knotGeom = new THREE.SphereGeometry(0.06, 16, 12);
      knotGeom.computeVertexNormals();
      const knotMesh = new THREE.Mesh(knotGeom, this.materials.bandana);
      knotMesh.position.set(0, 0.02, -0.36);
      bandanaGroup.add(knotMesh);

    } else {
      // Elegant Ribbon Collar for Sunny, Mochi, and Snowball
      const collarGeom = new THREE.TorusGeometry(0.36, 0.05, 16, 32);
      collarGeom.rotateX(Math.PI / 2);
      collarGeom.scale(1.0, 0.92, 0.85);
      collarGeom.computeVertexNormals();
      const collarMesh = new THREE.Mesh(collarGeom, this.materials.ribbonCollar);
      collarMesh.castShadow = true;
      bandanaGroup.add(collarMesh);

      if (characterType === 'sunny') {
        // Joyful Golden Jingle Bell on front
        const bellGeom = new THREE.SphereGeometry(0.08, 24, 18);
        bellGeom.computeVertexNormals();
        const bellMesh = new THREE.Mesh(bellGeom, this.materials.goldBell);
        bellMesh.position.set(0, -0.12, 0.34);
        bellMesh.castShadow = true;
        bandanaGroup.add(bellMesh);

        // Bell ring groove & bottom hole
        const bellRimGeom = new THREE.TorusGeometry(0.075, 0.015, 12, 24);
        bellRimGeom.computeVertexNormals();
        const bellRimMesh = new THREE.Mesh(bellRimGeom, this.materials.goldBell);
        bellRimMesh.position.set(0, -0.12, 0.34);
        bellRimMesh.rotation.x = Math.PI / 2;
        bandanaGroup.add(bellRimMesh);

      } else if (characterType === 'mochi') {
        // Sleeping Star Charm on front
        const starGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.03, 24);
        starGeom.rotateX(Math.PI / 2);
        starGeom.computeVertexNormals();
        const starMesh = new THREE.Mesh(starGeom, this.materials.goldBell);
        starMesh.position.set(0, -0.12, 0.34);
        starMesh.castShadow = true;
        bandanaGroup.add(starMesh);

      } else if (characterType === 'snowball') {
        // Royal Emerald Gem Brooch
        const gemGeom = new THREE.OctahedronGeometry(0.09, 2);
        gemGeom.scale(1.0, 1.2, 0.6);
        gemGeom.computeVertexNormals();
        const gemMesh = new THREE.Mesh(gemGeom, this.materials.emeraldJewel);
        gemMesh.position.set(0, -0.12, 0.34);
        gemMesh.castShadow = true;
        bandanaGroup.add(gemMesh);

        // Gold bezel
        const rimGeom = new THREE.TorusGeometry(0.08, 0.02, 12, 24);
        rimGeom.computeVertexNormals();
        const rimMesh = new THREE.Mesh(rimGeom, this.materials.goldBell);
        rimMesh.position.set(0, -0.12, 0.34);
        bandanaGroup.add(rimMesh);
      }
    }

    chest.add(bandanaGroup);

    // 3. Head Bone & Head Mesh
    const headBone = new THREE.Group();
    headBone.name = 'Head_Bone';
    headBone.position.set(0, isCozy ? 0.27 : 0.38, 0.06);
    chest.add(headBone);

    // Cute Chubby Head - Silky smooth Sphere
    const headGeom = new THREE.SphereGeometry(0.52, isCozy ? 8 : 32, isCozy ? 8 : 26);
    headGeom.scale(isCozy ? 1.34 : 1.15, isCozy ? 1.06 : 0.95, isCozy ? 1.08 : 1.0);
    headGeom.computeVertexNormals();
    const headMesh = new THREE.Mesh(headGeom, this.materials.fur);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    headMesh.name = 'Head_Mesh';
    headBone.add(headMesh);
    if (isPearl) this.addPearlDetails(headBone);

    // Chubby Cheeks
    const cheekGeom = new THREE.SphereGeometry(0.22, isCozy ? 8 : 24, isCozy ? 6 : 20);
    cheekGeom.computeVertexNormals();
    const cheekMat = (characterType === 'mochi') ? this.materials.darkAccent : this.materials.bellyWhite;
    const cheekL = new THREE.Mesh(cheekGeom, cheekMat);
    cheekL.scale.set(1.18, isCozy ? 0.78 : 0.8, isCozy ? 0.92 : 0.9);
    cheekL.position.set(isCozy ? -0.25 : -0.24, isCozy ? -0.02 : -0.1, isCozy ? 0.33 : 0.32);
    cheekL.castShadow = true;
    headBone.add(cheekL);

    const cheekR = cheekL.clone();
    cheekR.position.set(isCozy ? 0.25 : 0.24, isCozy ? -0.02 : -0.1, isCozy ? 0.33 : 0.32);
    headBone.add(cheekR);

    // Snowball's Signature Fluffy Persian Cheeks (Image 3)
    if (characterType === 'snowball') {
      const cheekTuftGeom = new THREE.ConeGeometry(0.14, 0.32, 16);
      cheekTuftGeom.rotateX(Math.PI / 2);
      cheekTuftGeom.computeVertexNormals();

      // Left cheek fluffy tufts
      for (let t = -1; t <= 1; t++) {
        const tuftL = new THREE.Mesh(cheekTuftGeom, this.materials.fluffTuft);
        tuftL.position.set(-0.38, -0.08 + t * 0.08, 0.22);
        tuftL.rotation.set(-0.1, -0.7 + t * 0.25, -0.3 + t * 0.2);
        tuftL.scale.set(1.1, 1.0, 0.9);
        tuftL.castShadow = true;
        headBone.add(tuftL);

        // Right cheek fluffy tufts
        const tuftR = new THREE.Mesh(cheekTuftGeom, this.materials.fluffTuft);
        tuftR.position.set(0.38, -0.08 + t * 0.08, 0.22);
        tuftR.rotation.set(-0.1, 0.7 - t * 0.25, 0.3 - t * 0.2);
        tuftR.scale.set(1.1, 1.0, 0.9);
        tuftR.castShadow = true;
        headBone.add(tuftR);
      }
    }

    // Snout / Muzzle & Mouth
    const muzzleMat = (characterType === 'mochi') ? this.materials.darkAccent : this.materials.bellyWhite;

    if (characterType === 'sunny' || isPearl) {
      // 1. Sunny: Distinctive Open Meowing / Singing Mouth (Image 1)
      const muzzleGroup = new THREE.Group();
      muzzleGroup.position.set(0, -0.08, isPearl ? 0.52 : 0.4);
      if (isPearl) muzzleGroup.scale.set(1.05, 0.8, 0.85);

      // Upper muzzle lobes (left & right cheek pads)
      const lobeGeom = new THREE.SphereGeometry(0.11, 20, 16);
      lobeGeom.scale(1.1, 0.8, 0.9);
      lobeGeom.computeVertexNormals();

      const lobeL = new THREE.Mesh(lobeGeom, muzzleMat);
      lobeL.position.set(-0.08, 0.03, 0.02);
      lobeL.castShadow = true;
      muzzleGroup.add(lobeL);

      const lobeR = new THREE.Mesh(lobeGeom, muzzleMat);
      lobeR.position.set(0.08, 0.03, 0.02);
      lobeR.castShadow = true;
      muzzleGroup.add(lobeR);

      // Expressive Open Mouth Cavity (Dark pink/wine interior)
      const mouthCavityGeom = new THREE.SphereGeometry(0.12, 24, 18);
      mouthCavityGeom.scale(0.85, 1.25, 0.7);
      mouthCavityGeom.computeVertexNormals();
      const mouthCavity = new THREE.Mesh(mouthCavityGeom, this.materials.mouthInterior);
      mouthCavity.position.set(0, -0.06, -0.02);
      muzzleGroup.add(mouthCavity);

      // Cute Pink Tongue curved upward inside
      const tongueGeom = new THREE.SphereGeometry(0.075, 20, 16);
      tongueGeom.scale(0.9, 0.45, 1.3);
      tongueGeom.computeVertexNormals();
      const tongueMesh = new THREE.Mesh(tongueGeom, this.materials.tongue);
      tongueMesh.position.set(0, -0.09, 0.04);
      tongueMesh.rotation.x = 0.3;
      if (isPearl) tongueMesh.scale.set(0.72, 0.65, 0.6);
      muzzleGroup.add(tongueMesh);

      // Tiny cute kitten fangs
      const fangGeom = new THREE.ConeGeometry(0.02, 0.045, 12);
      fangGeom.rotateX(Math.PI);
      fangGeom.computeVertexNormals();
      const fangL = new THREE.Mesh(fangGeom, this.materials.teeth);
      fangL.position.set(-0.06, 0.01, 0.05);
      muzzleGroup.add(fangL);

      const fangR = new THREE.Mesh(fangGeom, this.materials.teeth);
      fangR.position.set(0.06, 0.01, 0.05);
      muzzleGroup.add(fangR);

      // Lower jaw chin
      const chinGeom = new THREE.SphereGeometry(0.08, 20, 16);
      chinGeom.scale(1.0, 0.6, 0.9);
      chinGeom.computeVertexNormals();
      const chinMesh = new THREE.Mesh(chinGeom, muzzleMat);
      chinMesh.position.set(0, -0.14, 0.01);
      chinMesh.castShadow = true;
      muzzleGroup.add(chinMesh);

      headBone.add(muzzleGroup);

    } else if (isCozy) {
      const muzzleGroup = new THREE.Group();
      muzzleGroup.position.set(0, -0.01, 0.38);

      const lobeGeom = new THREE.SphereGeometry(0.11, 8, 6);
      lobeGeom.scale(1.05, 0.8, 0.92);
      lobeGeom.computeVertexNormals();

      const lobeL = new THREE.Mesh(lobeGeom, muzzleMat);
      lobeL.position.set(-0.075, 0.015, 0.02);
      lobeL.castShadow = true;
      muzzleGroup.add(lobeL);

      const lobeR = new THREE.Mesh(lobeGeom, muzzleMat);
      lobeR.position.set(0.075, 0.015, 0.02);
      lobeR.castShadow = true;
      muzzleGroup.add(lobeR);

      const chinGeom = new THREE.SphereGeometry(0.085, 8, 6);
      chinGeom.scale(1.0, 0.7, 0.9);
      chinGeom.computeVertexNormals();
      const chinMesh = new THREE.Mesh(chinGeom, muzzleMat);
      chinMesh.position.set(0, -0.075, 0.02);
      chinMesh.castShadow = true;
      muzzleGroup.add(chinMesh);

      const smileGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8);
      smileGeom.rotateZ(Math.PI / 2);
      smileGeom.computeVertexNormals();
      const smileMesh = new THREE.Mesh(smileGeom, this.materials.darkAccent);
      smileMesh.position.set(0, -0.02, 0.05);
      smileMesh.rotation.z = 0.08;
      muzzleGroup.add(smileMesh);

      headBone.add(muzzleGroup);

    } else {
      // Standard Cute Muzzle for Mochi, Snowball, and Rusty
      const muzzleGeom = new THREE.SphereGeometry(0.16, isCozy ? 10 : 26, isCozy ? 8 : 20);
      muzzleGeom.scale(1.2, 0.8, 0.9);
      muzzleGeom.computeVertexNormals();
      const muzzleMesh = new THREE.Mesh(muzzleGeom, muzzleMat);
      muzzleMesh.position.set(0, -0.09, 0.4);
      muzzleMesh.castShadow = true;
      headBone.add(muzzleMesh);
    }

    // Smooth rounded button Nose
    let noseGeom;
    if (isPearl) {
      const shape = new THREE.Shape();
      shape.moveTo(-0.048, 0.018);
      shape.quadraticCurveTo(0, 0.031, 0.048, 0.018);
      shape.quadraticCurveTo(0.038, -0.004, 0, -0.035);
      shape.quadraticCurveTo(-0.038, -0.004, -0.048, 0.018);
      noseGeom = new THREE.ExtrudeGeometry(shape, { depth: 0.016, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.006, bevelThickness: 0.006, curveSegments: 12 });
    } else {
      noseGeom = new THREE.SphereGeometry(isCozy ? 0.045 : 0.065, isCozy ? 8 : 20, isCozy ? 6 : 16);
    }
    noseGeom.scale(1.15, 0.8, 0.7);
    noseGeom.computeVertexNormals();
    const noseMesh = new THREE.Mesh(noseGeom, this.materials.pinkNose);
    noseMesh.position.set(0, isCozy ? -0.02 : -0.035, isPearl ? 0.64 : 0.51);
    headBone.add(noseMesh);

    // Whiskers
    const whiskerColor = (characterType === 'mochi') ? 0x4a2e20 : 0xffffff;
    const whiskerMat = new THREE.MeshBasicMaterial({ color: whiskerColor });
    const whiskerGeom = new THREE.CylinderGeometry(isPearl ? 0.0008 : 0.008, isPearl ? 0.002 : 0.008, isPearl ? 0.43 : 0.32, 8);
    whiskerGeom.rotateZ(Math.PI / 2);
    whiskerGeom.computeVertexNormals();

    for (let side = -1; side <= 1; side += 2) {
      for (let w = -1; w <= 1; w++) {
        const whisker = new THREE.Mesh(whiskerGeom, whiskerMat);
        whisker.position.set(side * 0.36, -0.1 + w * 0.04, 0.38);
        whisker.rotation.y = side * 0.35;
        whisker.rotation.z = side * (w * 0.15);
        headBone.add(whisker);
      }
    }

    // Eyes - Smooth high-res spheres
    const eyeGeom = isPearl
      ? new THREE.SphereGeometry(0.17, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2)
      : new THREE.SphereGeometry(0.15, isCozy ? 10 : 28, isCozy ? 8 : 24);
    if (isPearl) {
      eyeGeom.rotateX(Math.PI / 2);
      const vertices = eyeGeom.attributes.position;
      const uv = eyeGeom.attributes.uv;
      for (let vertex = 0; vertex < vertices.count; vertex++) {
        uv.setXY(vertex, vertices.getX(vertex) / 0.34 + 0.5, vertices.getY(vertex) / 0.34 + 0.5);
      }
    }
    eyeGeom.scale(1.0, isPearl ? 1.1 : (isCozy ? 1.24 : 1.25), isCozy ? 0.62 : 0.6);
    eyeGeom.computeVertexNormals();

    const eyeL = new THREE.Mesh(eyeGeom, this.materials.eyes);
    eyeL.position.set(-0.23, isPearl ? 0.09 : (isCozy ? 0.08 : 0.06), isPearl ? 0.515 : 0.45);
    eyeL.rotation.y = -0.18;
    eyeL.rotation.x = 0.05;
    headBone.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeom, this.materials.eyes);
    eyeR.position.set(0.23, isPearl ? 0.09 : (isCozy ? 0.08 : 0.06), isPearl ? 0.515 : 0.45);
    eyeR.rotation.y = 0.18;
    eyeR.rotation.x = 0.05;
    headBone.add(eyeR);

    if (isPearl) {
      const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x403539, roughness: 0.65 });
      const rimGeometry = new THREE.TorusGeometry(0.171, 0.008, 8, 48);
      for (const eye of [eyeL, eyeR]) {
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.scale.y = 1.1;
        eye.add(rim);
      }
    }

    // Ears - Smooth cone with 24 radial segments
    const earGeom = new THREE.ConeGeometry(0.16, 0.22, isCozy ? 10 : 24);
    earGeom.scale(isCozy ? 0.86 : 1.0, isCozy ? 0.82 : 1.0, isCozy ? 0.3 : 0.45);
    earGeom.computeVertexNormals();

    const earFurMat = (characterType === 'mochi') ? this.materials.darkAccent : this.materials.fur;

    const earL = new THREE.Group();
    earL.name = 'Ear_L';
    const earRotZ = (characterType === 'mochi') ? 0.55 : (isCozy ? 0.12 : 0.4);
    const earRotX = (characterType === 'mochi') ? -0.2 : (isCozy ? -0.18 : -0.1);
    earL.position.set(isPearl ? -0.37 : -0.27, isCozy ? 0.3 : 0.38, 0.02);
    if (isPearl) earL.scale.set(1.25, 1.55, 1.15);
    earL.rotation.set(earRotX, 0.15, earRotZ);
    const earLMesh = new THREE.Mesh(earGeom, earFurMat);
    earLMesh.castShadow = true;
    earL.add(earLMesh);

    const innerEarGeom = new THREE.ConeGeometry(0.11, 0.18, isCozy ? 10 : 20);
    innerEarGeom.scale(1.0, 1.0, 0.2);
    innerEarGeom.computeVertexNormals();
    const innerEarLMesh = new THREE.Mesh(innerEarGeom, this.materials.innerEar);
    innerEarLMesh.position.set(0, -0.02, 0.06);
    earL.add(innerEarLMesh);

    // Fluffy ear hair tufts for Snowball
    if (isFluffy) {
      const earTuftGeom = new THREE.ConeGeometry(0.06, 0.16, 16);
      earTuftGeom.scale(1.0, 1.0, 0.3);
      earTuftGeom.computeVertexNormals();
      const tuftMesh = new THREE.Mesh(earTuftGeom, this.materials.fluffTuft);
      tuftMesh.position.set(0, 0.02, 0.08);
      earL.add(tuftMesh);
    }
    headBone.add(earL);

    const earR = new THREE.Group();
    earR.name = 'Ear_R';
    earR.position.set(isPearl ? 0.37 : 0.27, isCozy ? 0.3 : 0.38, 0.02);
    if (isPearl) earR.scale.set(1.25, 1.55, 1.15);
    earR.rotation.set(earRotX, -0.15, -earRotZ);
    const earRMesh = new THREE.Mesh(earGeom, earFurMat);
    earRMesh.castShadow = true;
    earR.add(earRMesh);

    const innerEarRMesh = new THREE.Mesh(innerEarGeom, this.materials.innerEar);
    innerEarRMesh.position.set(0, -0.02, 0.06);
    earR.add(innerEarRMesh);

    if (isFluffy) {
      const earTuftGeom = new THREE.ConeGeometry(0.06, 0.16, 16);
      earTuftGeom.scale(1.0, 1.0, 0.3);
      earTuftGeom.computeVertexNormals();
      const tuftMeshR = new THREE.Mesh(earTuftGeom, this.materials.fluffTuft);
      tuftMeshR.position.set(0, 0.02, 0.08);
      earR.add(tuftMeshR);
    }
    headBone.add(earR);

    // 4. Military Helmet (Active for Rusty, hidden for others)
    const helmetGroup = new THREE.Group();
    helmetGroup.name = 'Helmet';
    helmetGroup.position.set(0, 0.26, 0.02);
    helmetGroup.rotation.x = -0.12;

    if (characterType === 'rusty') {
      const helmetDomeGeom = new THREE.SphereGeometry(0.49, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2);
      helmetDomeGeom.scale(1.06, 0.85, 1.1);
      helmetDomeGeom.computeVertexNormals();
      const helmetDomeMesh = new THREE.Mesh(helmetDomeGeom, this.materials.helmet);
      helmetDomeMesh.castShadow = true;
      helmetGroup.add(helmetDomeMesh);

      const helmetRimGeom = new THREE.TorusGeometry(0.5, 0.04, 14, 32);
      helmetRimGeom.rotateX(Math.PI / 2);
      helmetRimGeom.scale(1.06, 1.1, 0.5);
      helmetRimGeom.computeVertexNormals();
      const helmetRimMesh = new THREE.Mesh(helmetRimGeom, this.materials.helmetRim);
      helmetRimMesh.position.set(0, 0.01, 0);
      helmetRimMesh.castShadow = true;
      helmetGroup.add(helmetRimMesh);

      const badgeGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 24);
      badgeGeom.rotateX(Math.PI / 2);
      badgeGeom.computeVertexNormals();
      const badgeMesh = new THREE.Mesh(badgeGeom, this.materials.helmetBadge);
      badgeMesh.position.set(0, 0.18, 0.48);
      badgeMesh.rotation.x = -0.3;
      helmetGroup.add(badgeMesh);

      const strapGeom = new THREE.TorusGeometry(0.48, 0.02, 10, 32, Math.PI);
      strapGeom.rotateZ(Math.PI);
      strapGeom.computeVertexNormals();
      const strapMesh = new THREE.Mesh(strapGeom, this.materials.helmetRim);
      strapMesh.position.set(0, -0.05, 0.05);
      helmetGroup.add(strapMesh);
    } else {
      helmetGroup.visible = false;
    }
    headBone.add(helmetGroup);

    // 5. Arms & Hands - Smooth high-subdivision capsules & paws
    const armGeom = new THREE.CapsuleGeometry(0.1, 0.22, isCozy ? 8 : 16, isCozy ? 8 : 16);
    armGeom.computeVertexNormals();
    const pawGeom = new THREE.SphereGeometry(0.12, isCozy ? 10 : 24, isCozy ? 8 : 20);
    pawGeom.computeVertexNormals();

    // Left Arm
    const armL = new THREE.Group();
    armL.name = 'Arm_L';
    armL.position.set(isCozy ? -0.3 : -0.46, isCozy ? 0.04 : 0.15, 0.05);
    chest.add(armL);

    const armLMesh = new THREE.Mesh(armGeom, this.materials.fur);
    armLMesh.position.set(isCozy ? -0.01 : -0.06, isCozy ? -0.08 : -0.16, 0);
    armLMesh.rotation.z = -0.2;
    armLMesh.castShadow = true;
    armL.add(armLMesh);

    const handL = new THREE.Group();
    handL.name = 'Hand_L';
    handL.position.set(isCozy ? -0.01 : -0.12, isCozy ? -0.18 : -0.32, isCozy ? 0.05 : 0);
    const pawLMesh = new THREE.Mesh(pawGeom, this.materials.paws);
    pawLMesh.castShadow = true;
    handL.add(pawLMesh);
    armL.add(handL);

    // Right Arm (Holding Gun)
    const armR = new THREE.Group();
    armR.name = 'Arm_R';
    armR.position.set(isCozy ? 0.3 : 0.46, isCozy ? 0.04 : 0.15, 0.05);
    chest.add(armR);

    const armRMesh = new THREE.Mesh(armGeom, this.materials.fur);
    armRMesh.position.set(isCozy ? 0.01 : 0.06, isCozy ? -0.08 : -0.16, 0);
    armRMesh.rotation.z = 0.2;
    armRMesh.castShadow = true;
    armR.add(armRMesh);

    const handR = new THREE.Group();
    handR.name = 'Hand_R';
    handR.position.set(isCozy ? 0.01 : 0.12, isCozy ? -0.18 : -0.32, isCozy ? 0.05 : 0);
    const pawRMesh = new THREE.Mesh(pawGeom, this.materials.paws);
    pawRMesh.castShadow = true;
    handR.add(pawRMesh);
    armR.add(handR);

    // 6. Peashooter Plant-Gun - Smooth rounded shapes
    const gunRoot = new THREE.Group();
    gunRoot.name = 'Gun_Root';
    gunRoot.position.set(0.05, -0.02, 0.12);
    gunRoot.rotation.set(-0.35, 0.2, -0.1);
    handR.add(gunRoot);

    const gunHeadGroup = new THREE.Group();
    gunHeadGroup.name = 'Gun_Head';

    const bulbGeom = new THREE.SphereGeometry(0.18, 24, 20);
    bulbGeom.scale(1.0, 1.0, 1.2);
    bulbGeom.computeVertexNormals();
    const bulbMesh = new THREE.Mesh(bulbGeom, this.materials.plantGunGreen);
    bulbMesh.castShadow = true;
    gunHeadGroup.add(bulbMesh);

    const snoutGeom = new THREE.CylinderGeometry(0.11, 0.14, 0.32, 24);
    snoutGeom.rotateX(Math.PI / 2);
    snoutGeom.computeVertexNormals();
    const snoutMesh = new THREE.Mesh(snoutGeom, this.materials.plantGunGreen);
    snoutMesh.position.set(0, 0.02, 0.2);
    snoutMesh.castShadow = true;
    gunHeadGroup.add(snoutMesh);

    const muzzleLipGeom = new THREE.TorusGeometry(0.16, 0.05, 16, 28);
    muzzleLipGeom.computeVertexNormals();
    const muzzleLipMesh = new THREE.Mesh(muzzleLipGeom, this.materials.plantGunGreen);
    muzzleLipMesh.position.set(0, 0.02, 0.36);
    muzzleLipMesh.castShadow = true;
    gunHeadGroup.add(muzzleLipMesh);

    const muzzleHoleGeom = new THREE.CircleGeometry(0.14, 24);
    const muzzleHoleMesh = new THREE.Mesh(muzzleHoleGeom, this.materials.plantGunDark);
    muzzleHoleMesh.position.set(0, 0.02, 0.38);
    gunHeadGroup.add(muzzleHoleMesh);

    const leafGeom = new THREE.ConeGeometry(0.08, 0.22, 12);
    leafGeom.scale(1.0, 1.0, 0.2);
    leafGeom.computeVertexNormals();
    const topLeaf = new THREE.Mesh(leafGeom, this.materials.plantGunDark);
    topLeaf.position.set(0, 0.18, -0.06);
    topLeaf.rotation.x = -0.5;
    topLeaf.castShadow = true;
    gunHeadGroup.add(topLeaf);

    const vineGripGeom = new THREE.CylinderGeometry(0.045, 0.04, 0.24, 16);
    vineGripGeom.computeVertexNormals();
    const vineGripMesh = new THREE.Mesh(vineGripGeom, this.materials.plantGunDark);
    vineGripMesh.position.set(0, -0.14, 0.02);
    vineGripMesh.rotation.x = 0.2;
    gunHeadGroup.add(vineGripMesh);

    const guardGeom = new THREE.TorusGeometry(0.08, 0.02, 10, 20, Math.PI);
    guardGeom.rotateZ(Math.PI / 2);
    guardGeom.computeVertexNormals();
    const guardMesh = new THREE.Mesh(guardGeom, this.materials.plantGunGreen);
    guardMesh.position.set(0, -0.1, 0.1);
    gunHeadGroup.add(guardMesh);

    const muzzleSpawn = new THREE.Object3D();
    muzzleSpawn.name = 'Gun_Muzzle';
    muzzleSpawn.position.set(0, 0.02, 0.42);
    gunHeadGroup.add(muzzleSpawn);

    gunRoot.add(gunHeadGroup);

    // 7. Bipedal Legs and Paws - Smooth rounded forms
    const legGeom = new THREE.CapsuleGeometry(0.12, 0.18, isCozy ? 8 : 16, isCozy ? 8 : 16);
    legGeom.computeVertexNormals();
    const footGeom = new THREE.SphereGeometry(0.15, isCozy ? 8 : 24, isCozy ? 6 : 20);
    footGeom.scale(isCozy ? 0.78 : 0.9, isCozy ? 0.52 : 0.6, isCozy ? 1.08 : 1.3);
    footGeom.computeVertexNormals();

    // Left Leg
    const legL = new THREE.Group();
    legL.name = 'Leg_L';
    legL.position.set(isCozy ? -0.08 : -0.24, isCozy ? -0.02 : -0.15, isCozy ? 0.06 : 0);
    pelvis.add(legL);

    const legLMesh = new THREE.Mesh(legGeom, this.materials.fur);
    legLMesh.position.set(0, isCozy ? -0.07 : -0.18, 0);
    legLMesh.castShadow = true;
    legL.add(legLMesh);

    const footL = new THREE.Group();
    footL.name = 'Foot_L';
    footL.position.set(0, isCozy ? -0.18 : -0.34, isCozy ? 0.14 : 0.06);
    const footLMesh = new THREE.Mesh(footGeom, this.materials.paws);
    footLMesh.castShadow = true;
    footLMesh.receiveShadow = true;
    footL.add(footLMesh);
    legL.add(footL);

    // Right Leg
    const legR = new THREE.Group();
    legR.name = 'LegR';
    legR.position.set(isCozy ? 0.08 : 0.24, isCozy ? -0.02 : -0.15, isCozy ? 0.06 : 0);
    pelvis.add(legR);

    const legRMesh = new THREE.Mesh(legGeom, this.materials.fur);
    legRMesh.position.set(0, isCozy ? -0.07 : -0.18, 0);
    legRMesh.castShadow = true;
    legR.add(legRMesh);

    const footR = new THREE.Group();
    footR.name = 'Foot_R';
    footR.position.set(0, isCozy ? -0.18 : -0.34, isCozy ? 0.14 : 0.06);
    const footRMesh = new THREE.Mesh(footGeom, this.materials.paws);
    footRMesh.castShadow = true;
    footRMesh.receiveShadow = true;
    footR.add(footRMesh);
    legR.add(footR);

    // 8. Expressive Segmented Cat Tail - Smooth capsules
    const tailSegGeom = new THREE.CapsuleGeometry(0.07, 0.16, isCozy ? 8 : 16, isCozy ? 8 : 16);
    tailSegGeom.computeVertexNormals();

    const tail1 = new THREE.Group();
    tail1.name = 'Tail_1';
    tail1.position.set(isCozy ? 0.18 : 0, isCozy ? 0.02 : -0.05, -0.34);
    tail1.rotation.set(isCozy ? -1.12 : -0.6, isCozy ? 0.46 : 0, isCozy ? 0.34 : 0);
    pelvis.add(tail1);

    const tail1Mesh = new THREE.Mesh(tailSegGeom, this.materials.fur);
    tail1Mesh.position.set(0, 0.1, -0.04);
    tail1Mesh.rotation.x = -0.3;
    tail1Mesh.castShadow = true;
    tail1.add(tail1Mesh);

    const tail2 = new THREE.Group();
    tail2.name = 'Tail_2';
    tail2.position.set(0, 0.2, -0.08);
    tail1.add(tail2);

    const tail2Mat = isCozy ? this.materials.darkAccent : (characterType === 'mochi' ? this.materials.darkAccent : (isFluffy ? this.materials.fur : this.materials.darkAccent));
    const tail2Mesh = new THREE.Mesh(tailSegGeom, tail2Mat);
    tail2Mesh.position.set(isCozy ? 0.04 : 0, 0.09, 0);
    tail2Mesh.rotation.x = 0.2;
    tail2Mesh.castShadow = true;
    tail2.add(tail2Mesh);

    const tail3 = new THREE.Group();
    tail3.name = 'Tail_3';
    tail3.position.set(isCozy ? 0.05 : 0, 0.16, 0.02);
    tail2.add(tail3);

    // Tail tip: Snowball gets extra fluffy plume puff, Mochi gets chocolate tip
    const tipRadius = isFluffy ? 0.13 : (isCozy ? 0.09 : 0.085);
    const tailTipGeom = new THREE.SphereGeometry(tipRadius, isCozy ? 8 : 24, isCozy ? 6 : 20);
    tailTipGeom.computeVertexNormals();
    const tail3Mat = isCozy ? this.materials.bellyWhite : (characterType === 'mochi') ? this.materials.darkAccent : this.materials.bellyWhite;
    const tail3Mesh = new THREE.Mesh(tailTipGeom, tail3Mat);
    tail3Mesh.position.set(isCozy ? 0.04 : 0, 0.05, 0.04);
    tail3Mesh.castShadow = true;
    tail3.add(tail3Mesh);

    if (isPearl) this.addPearlFur(root);

    // Pre-calculate shadow casting and bounds
    root.traverse(child => {
      if (child.isMesh) {
        child.castShadow = !child.userData.isFur;
        child.receiveShadow = true;
      }
    });

    const bounds = new THREE.Box3().setFromObject(root);
    const groundOffset = -bounds.min.y;
    root.position.y += groundOffset;

    root.userData.modelHeight = bounds.max.y - bounds.min.y;
    root.userData.groundOffset = groundOffset;

    return {
      root,
      bones: {
        pelvis,
        spine,
        chest,
        headBone,
        earL,
        earR,
        helmet: helmetGroup,
        bandana: bandanaGroup,
        armL,
        armR,
        handL,
        handR,
        gunRoot,
        gunHead: gunHeadGroup,
        muzzleSpawn,
        legL,
        legR,
        footL,
        footR,
        tail1,
        tail2,
        tail3
      }
    };
  }
}

