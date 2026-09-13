import * as THREE from 'three';

export class ShopStallModel {
  static createShopStall() {
    const shopGroup = new THREE.Group();
    shopGroup.name = 'Cute_Shop_Stall_3D';

    // Materials
    const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8, flatShading: true });
    const woodLightMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.7, flatShading: true });
    const fabricPinkMat = new THREE.MeshStandardMaterial({ color: 0xff758f, roughness: 0.6, flatShading: true });
    const fabricWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 0.6, flatShading: true });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.3, metalness: 0.7, flatShading: true });
    const signWoodMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.7, flatShading: true });

    const carrotMat = new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.5, flatShading: true });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x38b000, roughness: 0.6, flatShading: true });
    const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xf77f00, roughness: 0.6, flatShading: true });
    const yarnPinkMat = new THREE.MeshStandardMaterial({ color: 0xff4d6d, roughness: 0.8, flatShading: true });
    const fishOrangeMat = new THREE.MeshStandardMaterial({ color: 0xff85a1, roughness: 0.5, flatShading: true });

    // 1. Deck Floor Base
    const deckGeom = new THREE.BoxGeometry(4.8, 0.3, 3.8);
    const deck = new THREE.Mesh(deckGeom, woodDarkMat);
    deck.position.y = 0.15;
    deck.castShadow = true;
    deck.receiveShadow = true;
    shopGroup.add(deck);

    // 2. Corner Pillars (4 Wooden Support Posts)
    const postGeom = new THREE.CylinderGeometry(0.12, 0.14, 3.2, 8);
    const postPositions = [
      [-2.1, 1.75, -1.6],
      [2.1, 1.75, -1.6],
      [-2.1, 1.75, 1.6],
      [2.1, 1.75, 1.6]
    ];
    postPositions.forEach(([px, py, pz]) => {
      const post = new THREE.Mesh(postGeom, woodDarkMat);
      post.position.set(px, py, pz);
      post.castShadow = true;
      shopGroup.add(post);
    });

    // 3. Main Counter Desk Front
    const counterGeom = new THREE.BoxGeometry(4.2, 1.2, 1.1);
    const counter = new THREE.Mesh(counterGeom, woodLightMat);
    counter.position.set(0, 0.9, 0.8);
    counter.castShadow = true;
    counter.receiveShadow = true;
    shopGroup.add(counter);

    // Counter Top Trim Plank
    const counterTopGeom = new THREE.BoxGeometry(4.5, 0.12, 1.3);
    const counterTop = new THREE.Mesh(counterTopGeom, woodDarkMat);
    counterTop.position.set(0, 1.55, 0.8);
    counterTop.castShadow = true;
    shopGroup.add(counterTop);

    // 4. Striped Awning Canopy Roof
    const roofGroup = new THREE.Group();
    roofGroup.position.set(0, 3.25, 0);

    const numStripes = 10;
    const stripeWidth = 4.8 / numStripes;
    for (let s = 0; s < numStripes; s++) {
      const stripeMat = s % 2 === 0 ? fabricPinkMat : fabricWhiteMat;
      const stripeGeom = new THREE.BoxGeometry(stripeWidth, 0.15, 4.2);
      const stripe = new THREE.Mesh(stripeGeom, stripeMat);
      stripe.position.set(-2.4 + stripeWidth * (s + 0.5), 0, 0);
      stripe.rotation.x = 0.12; // Slanted canopy forward
      stripe.castShadow = true;
      roofGroup.add(stripe);
    }
    shopGroup.add(roofGroup);

    // 5. Back Shelves & Display Rack
    const backWallGeom = new THREE.BoxGeometry(4.4, 2.4, 0.2);
    const backWall = new THREE.Mesh(backWallGeom, woodLightMat);
    backWall.position.set(0, 1.5, -1.6);
    backWall.castShadow = true;
    shopGroup.add(backWall);

    // Shelf Boards
    [-0.4, 0.4, 1.2].forEach(sy => {
      const shelfGeom = new THREE.BoxGeometry(4.0, 0.1, 0.6);
      const shelf = new THREE.Mesh(shelfGeom, woodDarkMat);
      shelf.position.set(0, 1.2 + sy, -1.3);
      shelf.castShadow = true;
      shopGroup.add(shelf);
    });

    // 6. Display Goods & Produce on Counter & Shelves
    // Seed Bags on shelf
    for (let i = 0; i < 4; i++) {
      const bagGeom = new THREE.DodecahedronGeometry(0.2, 1);
      bagGeom.scale(0.9, 1.2, 0.8);
      const bag = new THREE.Mesh(bagGeom, goldMat);
      bag.position.set(-1.4 + i * 0.9, 1.75, -1.3);
      bag.castShadow = true;
      shopGroup.add(bag);
    }

    // Carrots & Pumpkin Crate on Counter
    const crateGeom = new THREE.BoxGeometry(0.9, 0.4, 0.7);
    const crate = new THREE.Mesh(crateGeom, woodDarkMat);
    crate.position.set(-1.4, 1.8, 0.8);
    shopGroup.add(crate);

    const carrot1 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 5), carrotMat);
    carrot1.rotation.z = Math.PI / 2;
    carrot1.position.set(-1.4, 2.05, 0.8);
    shopGroup.add(carrot1);

    const pumpkin1 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), pumpkinMat);
    pumpkin1.position.set(1.4, 1.82, 0.8);
    shopGroup.add(pumpkin1);

    // Yarn Ball Display
    const yarn1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 2), yarnPinkMat);
    yarn1.position.set(0.6, 1.75, 0.8);
    shopGroup.add(yarn1);

    // Gold Cash Register
    const registerGeom = new THREE.BoxGeometry(0.5, 0.4, 0.5);
    const reg = new THREE.Mesh(registerGeom, goldMat);
    reg.position.set(-0.3, 1.8, 0.8);
    shopGroup.add(reg);

    // 7. Overhead Wooden Signboard "🛒 CUTE SHOP"
    const signGroup = new THREE.Group();
    signGroup.position.set(0, 3.65, 1.8);

    const signBoardGeom = new THREE.BoxGeometry(2.6, 0.7, 0.12);
    const signBoard = new THREE.Mesh(signBoardGeom, signWoodMat);
    signBoard.castShadow = true;
    signGroup.add(signBoard);

    // Canvas texture for Sign text
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f4a261';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#58311a';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 118);
    ctx.fillStyle = '#58311a';
    ctx.font = 'bold 54px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛒 CUTE SHOP 🐾', 256, 64);

    const signTex = new THREE.CanvasTexture(canvas);
    const signTextMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true });
    const signFront = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.65), signTextMat);
    signFront.position.z = 0.07;
    signGroup.add(signFront);
    shopGroup.add(signGroup);

    // 8. Cozy Warm Lantern Light
    const lantern = new THREE.PointLight(0xffb703, 2.8, 14, 1.2);
    lantern.position.set(2.1, 2.9, 1.6);
    shopGroup.add(lantern);

    const lanternMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.25),
      new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );
    lanternMesh.position.copy(lantern.position);
    shopGroup.add(lanternMesh);

    // 9. Cute Shopkeeper Cat Figurine standing behind counter!
    const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), fabricWhiteMat);
    catHead.position.set(0, 2.1, 0.1);
    shopGroup.add(catHead);

    const catEarL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 4), fabricPinkMat);
    catEarL.position.set(-0.22, 2.45, 0.1);
    catEarL.rotation.z = 0.3;
    shopGroup.add(catEarL);

    const catEarR = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 4), fabricPinkMat);
    catEarR.position.set(0.22, 2.45, 0.1);
    catEarR.rotation.z = -0.3;
    shopGroup.add(catEarR);

    // Chef Hat for Shopkeeper Cat
    const chefHat = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.4, 8), fabricWhiteMat);
    chefHat.position.set(0, 2.58, 0.1);
    shopGroup.add(chefHat);

    return shopGroup;
  }
}