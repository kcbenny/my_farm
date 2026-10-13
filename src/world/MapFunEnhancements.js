import * as THREE from 'three';

/**
 * 冷门又好玩的地图玩法增强系统 — 视觉特效版
 *
 * 每个玩法都配套专属视觉特效，让玩家"看得到"机制在运作
 */

// ============================================================
// 通用特效工具函数
// ============================================================

/** 创建环形光环特效（甜甜圈形状，脉动发光） */
function createGlowRing(radius = 2, color = 0xffffff, thickness = 0.08) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, thickness, 8, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.userData = { baseOpacity: 0.6, baseScale: 1, phase: Math.random() * Math.PI * 2 };
  return ring;
}

/** 创建上升粒子系统（用于温泉、传送门等） */
function createRisingParticles(count = 30, color = 0xffffff, speed = 1, spread = 1) {
  const group = new THREE.Group();
  const particles = [];
  const geo = new THREE.SphereGeometry(0.06, 6, 4);

  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
    });
    const p = new THREE.Mesh(geo, mat);
    p.position.set(
      (Math.random() - 0.5) * spread,
      Math.random() * 3,
      (Math.random() - 0.5) * spread
    );
    p.userData = {
      speed: speed * (0.5 + Math.random() * 0.8),
      phase: Math.random() * Math.PI * 2,
      baseY: p.position.y,
      drift: (Math.random() - 0.5) * 0.3,
    };
    group.add(p);
    particles.push(p);
  }

  group.userData = { particles, spread };
  return group;
}

/** 更新上升粒子 */
function updateRisingParticles(group, delta, time) {
  const { particles, spread } = group.userData;
  for (const p of particles) {
    p.position.y += p.userData.speed * delta;
    p.position.x += Math.sin(time * 0.8 + p.userData.phase) * p.userData.drift * delta;
    p.position.z += Math.cos(time * 0.6 + p.userData.phase) * p.userData.drift * delta;

    if (p.position.y > 3) {
      p.position.y = 0;
      p.position.x = (Math.random() - 0.5) * spread;
      p.position.z = (Math.random() - 0.5) * spread;
    }

    // 顶部淡出
    const t = p.position.y / 3;
    p.material.opacity = 0.7 * (1 - t * 0.7);
    p.scale.setScalar(0.5 + t * 0.8);
  }
}

/** 创建光柱特效（从天而降的光束） */
function createLightBeam(height = 8, radius = 1.5, color = 0xffffff) {
  const group = new THREE.Group();

  // 主光柱（圆锥体，上窄下宽）
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(radius, height, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beam.position.y = height / 2;
  beam.rotation.x = Math.PI; // 尖端朝下

  // 底部光圈
  const bottomRing = createGlowRing(radius * 0.8, color, 0.05);
  bottomRing.position.y = 0.02;

  // 顶部光点
  const topGlow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.3, 12, 10),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
    })
  );
  topGlow.position.y = height;

  group.add(beam, bottomRing, topGlow);
  group.userData = { beam, bottomRing, topGlow, baseOpacity: 0.15 };
  return group;
}

/** 更新光柱脉动 */
function updateLightBeam(group, time) {
  const { beam, bottomRing, topGlow } = group.userData;
  const pulse = 1 + Math.sin(time * 1.5) * 0.15;
  beam.material.opacity = 0.12 + Math.sin(time * 2) * 0.05;
  bottomRing.scale.setScalar(pulse);
  bottomRing.material.opacity = 0.5 + Math.sin(time * 2) * 0.2;
  topGlow.scale.setScalar(0.8 + Math.sin(time * 3) * 0.2);
}

/** 创建涟漪扩散特效（用于潮汐、月光小径出现等） */
function createRippleEffect(color = 0x88ccff, maxRadius = 5) {
  const group = new THREE.Group();
  const rings = [];

  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.15, 32),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.userData = { delay: i * 0.6, maxRadius, speed: 2 };
    group.add(ring);
    rings.push(ring);
  }

  group.userData = { rings, active: false, time: 0 };
  return group;
}

/** 触发涟漪 */
function triggerRipple(group) {
  group.userData.active = true;
  group.userData.time = 0;
}

/** 更新涟漪 */
function updateRipple(group, delta) {
  if (!group.userData.active) return;
  group.userData.time += delta;
  const t = group.userData.time;

  for (const ring of group.userData.rings) {
    const localT = t - ring.userData.delay;
    if (localT < 0) continue;

    const progress = localT * ring.userData.speed / ring.userData.maxRadius;
    if (progress >= 1) {
      ring.material.opacity = 0;
      continue;
    }

    const radius = 0.1 + progress * ring.userData.maxRadius;
    ring.scale.setScalar(radius / 0.125);
    ring.material.opacity = 0.6 * (1 - progress);
  }

  // 3个环都跑完了就重置
  const allDone = group.userData.rings.every(r => {
    const localT = t - r.userData.delay;
    return localT * r.userData.speed >= r.userData.maxRadius;
  });
  if (allDone) {
    group.userData.active = false;
  }
}

/** 创建能量场特效（地面圆形发光区域） */
function createEnergyField(radius = 3, color = 0x00ff88) {
  const group = new THREE.Group();

  // 地面发光圆盘
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  disc.rotation.x = -Math.PI / 2;

  // 旋转的符文环
  const runeRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.8, 0.04, 6, 24),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
    })
  );
  runeRing.rotation.x = -Math.PI / 2;

  // 内圈反向旋转
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.5, 0.03, 6, 18),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
    })
  );
  innerRing.rotation.x = -Math.PI / 2;

  group.add(disc, runeRing, innerRing);
  group.userData = { disc, runeRing, innerRing, baseColor: color };
  return group;
}

/** 更新能量场旋转 */
function updateEnergyField(group, time, intensity = 1) {
  const { disc, runeRing, innerRing } = group.userData;
  runeRing.rotation.z = time * 0.5;
  innerRing.rotation.z = -time * 0.8;
  disc.material.opacity = 0.15 + Math.sin(time * 2) * 0.08 * intensity;
  runeRing.material.opacity = 0.5 + Math.sin(time * 1.5) * 0.2;
}

// ============================================================
// 通用：神秘商人 / 精灵集市
// ============================================================
export function addMysteryMerchant(map, config = {}) {
  const {
    position = new THREE.Vector3(0, 0, 8),
    items = [],
    currency = 'gems',
  } = config;

  const merchantGroup = new THREE.Group();
  merchantGroup.position.copy(position);

  // 神秘商人主体
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a2c6a, emissive: 0x2a1a4a, emissiveIntensity: 0.3 })
  );
  body.position.y = 0.7;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4c9a, emissive: 0x3a2a5a, emissiveIntensity: 0.4 })
  );
  head.position.y = 1.55;

  // 悬浮的交易光球 + 内部光点
  const orbGroup = new THREE.Group();
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.9 })
  );
  const orbInner = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
  );
  orbGroup.add(orb, orbInner);
  orbGroup.position.set(0, 1.2, 0.6);

  // 商人周围的魔法粒子
  const magicParticles = createRisingParticles(20, 0xaa66ff, 0.6, 1.5);
  magicParticles.position.y = 0;

  // 商人脚下魔法阵
  const magicCircle = createEnergyField(1.2, 0xaa66ff);
  magicCircle.position.y = 0.01;

  // 摊位底座
  const stall = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.7, 0.15, 12),
    new THREE.MeshStandardMaterial({ color: 0x5a3a2a })
  );
  stall.position.y = 0.075;
  stall.position.z = 0.6;

  // 商品展示：3个悬浮的商品图标光球
  const itemOrbs = [];
  items.forEach((item, i) => {
    const angle = (i / items.length) * Math.PI - Math.PI / 2;
    const itemOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      new THREE.MeshBasicMaterial({
        color: item.color || 0x66ffaa,
        transparent: true,
        opacity: 0.8,
      })
    );
    itemOrb.position.set(
      Math.cos(angle) * 0.5,
      0.4,
      0.6 + Math.sin(angle) * 0.3
    );
    itemOrb.userData = { itemId: item.id, baseY: 0.4, phase: i * 1.2 };
    stall.add(itemOrb);
    itemOrbs.push(itemOrb);
  });

  merchantGroup.add(body, head, orbGroup, magicParticles, magicCircle, stall);
  map.group.add(merchantGroup);

  const merchantState = {
    group: merchantGroup,
    orb: orbGroup,
    magicParticles,
    magicCircle,
    itemOrbs,
    items,
    currency,
    purchased: new Set(),
    nearPlayer: false,
  };

  map._merchant = merchantState;
  map.addAchievement('shopper', '精明消费者', '在神秘商人处购买一件物品', false);
  map.addAchievement('whale', '土豪玩家', '购买所有神秘商品', true);

  return merchantState;
}

export function updateMysteryMerchant(map, playerPos, delta) {
  if (!map._merchant) return null;
  const m = map._merchant;
  const time = map.time;

  // 光球浮动 + 自转
  m.orb.position.y = 1.2 + Math.sin(time * 2) * 0.15;
  m.orb.rotation.y += delta * 1.5;
  m.orb.children[1].rotation.y -= delta * 3;

  // 魔法粒子上升
  updateRisingParticles(m.magicParticles, delta, time);

  // 魔法阵旋转
  updateEnergyField(m.magicCircle, time, m.nearPlayer ? 1.5 : 1);

  // 商品光球浮动
  for (const orb of m.itemOrbs) {
    orb.position.y = orb.userData.baseY + Math.sin(time * 2 + orb.userData.phase) * 0.1;
    orb.rotation.y += delta * 1.2;
  }

  // 检测玩家靠近
  const worldPos = m.group.getWorldPosition(new THREE.Vector3());
  const dist = playerPos.distanceTo(worldPos);
  const wasNear = m.nearPlayer;
  m.nearPlayer = dist < 2.5;

  // 靠近时商人发光增强
  if (m.nearPlayer !== wasNear) {
    const intensity = m.nearPlayer ? 0.8 : 0.3;
    body.material.emissiveIntensity = intensity;
    head.material.emissiveIntensity = intensity + 0.1;
  }

  if (m.nearPlayer) {
    return {
      type: 'merchant',
      items: m.items.filter(i => !m.purchased.has(i.id)),
      currency: m.currency,
    };
  }
  return null;
}

// ============================================================
// EnchantedForest: 月光小径
// ============================================================
export function addMoonlitPath(map) {
  const pathGroup = new THREE.Group();
  pathGroup.visible = false;

  // 发光的小径粒子（更多更密）
  const particleCount = 40;
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xaaaaff, transparent: true, opacity: 0.7 })
    );
    const t = i / particleCount;
    const angle = t * Math.PI * 0.8 - Math.PI * 0.4;
    const radius = 5 + t * 8;
    p.position.set(Math.sin(angle) * radius, 0.1, Math.cos(angle) * radius - 10);
    p.userData = { baseY: 0.1, phase: i * 0.3, size: 0.7 + Math.random() * 0.6 };
    pathGroup.add(p);
    particles.push(p);
  }

  // 路径两侧的发光蘑菇指引灯
  const mushroomLights = [];
  for (let i = 0; i < 10; i++) {
    const t = i / 10;
    const angle = t * Math.PI * 0.8 - Math.PI * 0.4;
    const radius = 6 + t * 7;
    const side = i % 2 === 0 ? 1 : -1;

    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.8 })
    );
    light.position.set(
      Math.sin(angle) * radius + side * 0.5,
      0.3,
      Math.cos(angle) * radius - 10 + side * 0.3
    );
    light.userData = { baseY: 0.3, phase: i * 0.5 };
    pathGroup.add(light);
    mushroomLights.push(light);
  }

  // 小径尽头的宝箱 + 光柱特效
  const chestGroup = new THREE.Group();
  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x8b4513, emissive: 0x4a2500, emissiveIntensity: 0.3 })
  );
  const chestTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.15, 0.55),
    new THREE.MeshStandardMaterial({ color: 0xdaa520, emissive: 0x6a4500, emissiveIntensity: 0.3 })
  );
  chestTop.position.y = 0.3;
  const chestGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.25 })
  );
  chestGlow.position.y = 0.2;
  chestGroup.add(chest, chestTop, chestGlow);
  chestGroup.position.set(0, 0, -15);

  // 宝箱上方的光柱
  const treasureBeam = createLightBeam(6, 1.2, 0xffd700);
  treasureBeam.position.set(0, 0, -15);

  // 出现时的涟漪
  const appearRipple = createRippleEffect(0xaaccff, 8);
  appearRipple.position.set(0, 0.02, -6);

  pathGroup.add(chestGroup, treasureBeam, appearRipple);
  map.group.add(pathGroup);

  const state = {
    group: pathGroup,
    particles,
    mushroomLights,
    chestGroup,
    chestGlow,
    treasureBeam,
    appearRipple,
    active: false,
    cycleTime: 0,
    activeDuration: 15,
    cycleDuration: 45,
    rewardClaimed: false,
    wasActive: false,
  };

  map._moonlitPath = state;
  map.addAchievement('moonlight', '月光寻宝者', '在月光小径出现时找到宝藏', true);

  return state;
}

export function updateMoonlitPath(map, playerPos, delta) {
  if (!map._moonlitPath) return null;
  const p = map._moonlitPath;
  const time = map.time;

  p.cycleTime += delta;
  const cyclePos = p.cycleTime % p.cycleDuration;
  const shouldBeActive = cyclePos < p.activeDuration && !p.rewardClaimed;

  // 状态切换时触发涟漪
  if (shouldBeActive && !p.wasActive) {
    p.group.visible = true;
    triggerRipple(p.appearRipple);
  }
  p.wasActive = shouldBeActive;
  p.active = shouldBeActive;
  if (!shouldBeActive) p.group.visible = false;

  if (p.active) {
    // 粒子浮动 + 闪烁
    for (const particle of p.particles) {
      particle.position.y = particle.userData.baseY +
        Math.sin(time * 2 + particle.userData.phase) * 0.15;
      particle.material.opacity = 0.4 + Math.sin(time * 3 + particle.userData.phase) * 0.4;
      particle.scale.setScalar(particle.userData.size * (0.8 + Math.sin(time * 2.5 + particle.userData.phase) * 0.3));
    }

    // 蘑菇灯呼吸
    for (const light of p.mushroomLights) {
      light.position.y = light.userData.baseY + Math.sin(time * 1.5 + light.userData.phase) * 0.08;
      light.material.opacity = 0.6 + Math.sin(time * 2 + light.userData.phase) * 0.3;
    }

    // 宝箱脉动
    const pulse = 1 + Math.sin(time * 2) * 0.15;
    p.chestGlow.scale.setScalar(pulse);
    p.chestGlow.material.opacity = 0.2 + Math.sin(time * 2) * 0.1;

    // 光柱脉动
    updateLightBeam(p.treasureBeam, time);

    // 涟漪更新
    updateRipple(p.appearRipple, delta);

    // 检测玩家是否到达宝箱
    const chestWorld = p.chestGroup.getWorldPosition(new THREE.Vector3());
    if (playerPos.distanceTo(chestWorld) < 1.5 && !p.rewardClaimed) {
      p.rewardClaimed = true;
      p.group.visible = false;
      map.unlockAchievement('moonlight');
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const gemPos = new THREE.Vector3(
          chestWorld.x + Math.cos(angle) * 0.8 - map.group.position.x,
          0.5,
          chestWorld.z + Math.sin(angle) * 0.8 - map.group.position.z
        );
        map.spawnGems([gemPos], 0.18);
      }
      return { type: 'moonlightReward', count: 5 };
    }
  }

  return p.active ? { type: 'moonlitActive', timeLeft: p.activeDuration - cyclePos } : null;
}

// ============================================================
// AncientRuins: 沙漏倒计时模式
// ============================================================
export function addHourglassMode(map) {
  const hourglassGroup = new THREE.Group();
  hourglassGroup.position.set(0, 0, -8);

  // 沙漏主体
  const top = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd700, transparent: true, opacity: 0.6 })
  );
  top.position.y = 0.7;
  top.rotation.x = Math.PI;

  const bottom = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd700, transparent: true, opacity: 0.3 })
  );
  bottom.position.y = 0.2;

  const frame = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.03, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xb8860b })
  );
  frame.position.y = 0.45;
  frame.rotation.x = Math.PI / 2;

  const topFrame = frame.clone();
  topFrame.position.y = 0.95;
  const bottomFrame = frame.clone();
  bottomFrame.position.y = -0.05;

  // 沙漏周围的沙粒粒子（激活时落下）
  const sandParticles = [];
  for (let i = 0; i < 15; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 4, 3),
      new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0 })
    );
    p.position.set(
      (Math.random() - 0.5) * 0.1,
      0.45 + Math.random() * 0.1,
      (Math.random() - 0.5) * 0.1
    );
    p.userData = { speed: 0.8 + Math.random() * 0.5, delay: Math.random() * 2 };
    hourglassGroup.add(p);
    sandParticles.push(p);
  }

  // 底座光环
  const baseGlow = createGlowRing(0.6, 0xffd700, 0.04);
  baseGlow.position.y = 0.02;

  hourglassGroup.add(top, bottom, frame, topFrame, bottomFrame, baseGlow);
  map.group.add(hourglassGroup);

  const state = {
    group: hourglassGroup,
    topSand: top,
    bottomSand: bottom,
    sandParticles,
    baseGlow,
    active: false,
    timeLeft: 30,
    maxTime: 30,
    completedInTime: false,
    warningPlayed: false,
  };

  map._hourglass = state;
  map.addAchievement('speedrun', '沙漏挑战者', '在倒计时内完成符文谜题', true);

  return state;
}

export function startHourglass(map) {
  if (!map._hourglass || map._hourglass.active) return;
  map._hourglass.active = true;
  map._hourglass.timeLeft = map._hourglass.maxTime;
  map._hourglass.warningPlayed = false;
}

export function updateHourglass(map, delta) {
  if (!map._hourglass || !map._hourglass.active) return null;
  const h = map._hourglass;
  const time = map.time;

  h.timeLeft -= delta;
  const progress = h.timeLeft / h.maxTime;

  // 沙子视觉效果
  h.topSand.scale.y = Math.max(0.05, progress);
  h.topSand.position.y = 0.7 - (1 - progress) * 0.2;
  h.bottomSand.scale.y = Math.max(0.05, 1 - progress);
  h.bottomSand.material.opacity = 0.3 + (1 - progress) * 0.4;

  // 沙粒下落
  for (const p of h.sandParticles) {
    const localT = (time + p.userData.delay) % 1;
    p.position.y = 0.45 - localT * 0.45;
    p.material.opacity = 0.8 * (1 - Math.abs(localT - 0.5) * 1.5);
    if (p.material.opacity < 0) p.material.opacity = 0;
  }

  // 底座光环：时间越少闪烁越快
  const pulseSpeed = h.timeLeft < 10 ? 5 : 2;
  h.baseGlow.scale.setScalar(1 + Math.sin(time * pulseSpeed) * 0.15);
  h.baseGlow.material.opacity = 0.5 + Math.sin(time * pulseSpeed) * 0.3;

  // 时间紧迫警告
  if (h.timeLeft < 10 && !h.warningPlayed) {
    h.warningPlayed = true;
    map.spawnFloatingText(new THREE.Vector3(0, 4, 0), '⏰ 时间紧迫！', 0xff4444, 1.5, true);
  }

  if (h.timeLeft <= 0) {
    h.active = false;
    // 停止沙粒
    for (const p of h.sandParticles) p.material.opacity = 0;
    return { type: 'hourglassExpired' };
  }

  return { type: 'hourglassTick', timeLeft: h.timeLeft };
}

export function completeHourglass(map) {
  if (!map._hourglass || !map._hourglass.active) return false;
  map._hourglass.active = false;
  map._hourglass.completedInTime = true;
  map.unlockAchievement('speedrun');
  // 成功时金色爆发
  map.spawnFloatingText(new THREE.Vector3(0, 4, 0), '✨ 完美通关！', 0xffd700, 2, true);
  return true;
}

// ============================================================
// SnowyMountain: 体温系统 + 温泉特效
// ============================================================
export function addTemperatureSystem(map, config = {}) {
  const {
    startTemp = 100,
    minTemp = 20,
    decayRate = 1.5,
    recoverRate = 8,
    slowThreshold = 50,
    hotSprings = [],
  } = config;

  // 为每个温泉创建视觉特效
  const springVisuals = [];
  for (const spring of hotSprings) {
    const springGroup = new THREE.Group();
    springGroup.position.copy(spring);

    // 温泉水池
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 24),
      new THREE.MeshBasicMaterial({ color: 0x66ddff, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.01;

    // 水池边缘石头圈
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rock = new THREE.Mesh(
        new THREE.SphereGeometry(0.25 + Math.random() * 0.1, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0x888888 })
      );
      rock.position.set(
        Math.cos(angle) * 2,
        0.1,
        Math.sin(angle) * 2
      );
      rock.scale.y = 0.6;
      springGroup.add(rock);
    }

    // 上升的蒸汽粒子
    const steam = createRisingParticles(25, 0xffffff, 0.8, 2);
    steam.position.y = 0.2;

    // 水面涟漪
    const ripple = createRippleEffect(0xaaddff, 1.5);
    ripple.position.y = 0.02;

    // 温泉发光（温暖的光）
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xffaa66, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.015;

    springGroup.add(pool, steam, ripple, glow);
    map.group.add(springGroup);

    springVisuals.push({ group: springGroup, steam, ripple, glow, pool });
    spring.visited = false;
    spring.visuals = springVisuals[springVisuals.length - 1];
  }

  // 寒冷粒子（屏幕周围飘落的雪花感，体温低时更密）
  const coldParticles = [];
  const coldGroup = new THREE.Group();
  for (let i = 0; i < 30; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 4, 3),
      new THREE.MeshBasicMaterial({ color: 0xccddff, transparent: true, opacity: 0 })
    );
    p.position.set(
      (Math.random() - 0.5) * 40,
      Math.random() * 10,
      (Math.random() - 0.5) * 40
    );
    p.userData = { fallSpeed: 0.5 + Math.random() * 0.8, drift: (Math.random() - 0.5) * 0.3 };
    coldGroup.add(p);
    coldParticles.push(p);
  }
  map.group.add(coldGroup);

  const state = {
    temperature: startTemp,
    minTemp,
    decayRate,
    recoverRate,
    slowThreshold,
    inHotSpring: false,
    hotSpringPositions: hotSprings,
    springVisuals,
    coldParticles,
    coldGroup,
  };

  map._temperature = state;
  map.addAchievement('iceman', '冰雪勇士', '体温低于30%时登顶', true);
  map.addAchievement('sauna', '温泉爱好者', '在所有温泉中休息过', false);

  return state;
}

export function updateTemperature(map, playerPos, delta) {
  if (!map._temperature) return null;
  const t = map._temperature;
  const time = map.time;

  // 检测是否在温泉里
  t.inHotSpring = false;
  for (const spring of t.hotSpringPositions) {
    const worldSpring = spring.clone().add(map.group.position);
    if (playerPos.distanceTo(worldSpring) < 2) {
      t.inHotSpring = true;
      spring.visited = true;
      // 温泉涟漪
      if (spring.visuals && Math.random() < 0.02) {
        triggerRipple(spring.visuals.ripple);
      }
      break;
    }
  }

  if (t.inHotSpring) {
    t.temperature = Math.min(100, t.temperature + t.recoverRate * delta);
  } else {
    t.temperature = Math.max(t.minTemp, t.temperature - t.decayRate * delta);
  }

  // 更新温泉蒸汽
  for (const sv of t.springVisuals) {
    updateRisingParticles(sv.steam, delta, time);
    updateRipple(sv.ripple, delta);
    // 水面脉动
    sv.pool.material.opacity = 0.5 + Math.sin(time * 2) * 0.1;
  }

  // 寒冷粒子：体温越低越明显
  const coldIntensity = Math.max(0, (t.slowThreshold - t.temperature) / t.slowThreshold);
  for (const p of t.coldParticles) {
    p.position.y -= p.userData.fallSpeed * delta;
    p.position.x += Math.sin(time + p.position.y) * p.userData.drift * delta;

    if (p.position.y < 0) {
      p.position.y = 10;
      p.position.x = playerPos.x - map.group.position.x + (Math.random() - 0.5) * 30;
      p.position.z = playerPos.z - map.group.position.z + (Math.random() - 0.5) * 30;
    }

    p.material.opacity = coldIntensity * 0.6;
  }

  // 检查成就
  if (t.temperature <= 30 && map.climbedToTop) {
    map.unlockAchievement('iceman');
  }

  const allSpringsVisited = t.hotSpringPositions.every(s => s.visited);
  if (allSpringsVisited) {
    map.unlockAchievement('sauna');
  }

  return {
    type: 'temperature',
    value: t.temperature,
    isCold: t.temperature < t.slowThreshold,
    inHotSpring: t.inHotSpring,
    slowFactor: t.temperature < t.slowThreshold ? (t.temperature / 100) * 0.5 + 0.5 : 1,
  };
}

// ============================================================
// MysticLake: 潮汐系统
// ============================================================
export function addTideSystem(map, config = {}) {
  const {
    cycleDuration = 60,
    highWaterY = 0.2,
    lowWaterY = -0.8,
  } = config;

  // 潮汐边界指示：退潮时露出的礁石
  const tideRocks = [];
  const rockPositions = [
    { x: 6, z: 6 }, { x: -5, z: 7 }, { x: 8, z: -4 },
    { x: -7, z: -5 }, { x: 3, z: 9 }, { x: -3, z: -8 },
  ];

  for (const pos of rockPositions) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.3, 0),
      new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.8 })
    );
    rock.position.set(pos.x, -0.3, pos.z);
    rock.scale.y = 0.6;
    rock.userData = { baseY: -0.3, exposed: false };
    map.group.add(rock);
    tideRocks.push(rock);

    // 礁石上的贝壳/海藻装饰（退潮时可见）
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 4),
      new THREE.MeshStandardMaterial({ color: 0xffccaa })
    );
    shell.position.set(pos.x + 0.1, -0.1, pos.z + 0.1);
    shell.scale.y = 0.4;
    shell.visible = false;
    map.group.add(shell);
    rock.userData.shell = shell;
  }

  // 潮汐边缘泡沫线
  const foamRing = new THREE.Mesh(
    new THREE.RingGeometry(14, 14.3, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  foamRing.rotation.x = -Math.PI / 2;
  foamRing.position.y = 0.18;
  map.group.add(foamRing);

  const state = {
    cycleDuration,
    highWaterY,
    lowWaterY,
    currentY: highWaterY,
    phase: 'high',
    hiddenRevealed: false,
    tideRocks,
    foamRing,
    lastPhase: 'high',
  };

  map._tide = state;
  map.addAchievement('tide', '潮间带猎人', '在退潮时找到隐藏宝藏', true);

  return state;
}

export function updateTide(map, delta) {
  if (!map._tide) return null;
  const t = map._tide;
  const time = map.time;

  const cyclePos = (time % t.cycleDuration) / t.cycleDuration;
  const tideFactor = (Math.cos(cyclePos * Math.PI * 2) + 1) / 2;
  t.currentY = t.lowWaterY + (t.highWaterY - t.lowWaterY) * tideFactor;

  // 更新水面高度
  if (map.waterSurface) {
    map.waterSurface.position.y = t.currentY + 0.175;
  }

  // 泡沫线跟随水位
  t.foamRing.position.y = t.currentY + 0.18;
  t.foamRing.material.opacity = 0.2 + Math.sin(time * 3) * 0.1;

  // 判断相位
  let newPhase;
  if (tideFactor > 0.8) newPhase = 'high';
  else if (tideFactor < 0.2) newPhase = 'low';
  else if (cyclePos < 0.5) newPhase = 'falling';
  else newPhase = 'rising';

  // 退潮时露出礁石和贝壳
  const isLow = tideFactor < 0.4;
  for (const rock of t.tideRocks) {
    rock.userData.exposed = isLow;
    rock.visible = isLow || tideFactor < 0.7;
    if (rock.userData.shell) {
      rock.userData.shell.visible = isLow;
    }
    // 礁石逐渐从水中"浮现"的视觉
    if (rock.visible) {
      rock.material.opacity = Math.min(1, (0.7 - tideFactor) / 0.3);
      rock.material.transparent = tideFactor >= 0.4;
    }
  }

  // 相位变化时触发提示
  if (newPhase !== t.lastPhase && newPhase === 'low') {
    map.spawnFloatingText(new THREE.Vector3(0, 3, 0), '🌊 退潮了！', 0x66ccff, 2, true);
  }
  t.lastPhase = newPhase;
  t.phase = newPhase;

  return {
    type: 'tide',
    phase: t.phase,
    waterY: t.currentY,
    isLowTide: t.phase === 'low',
  };
}

// ============================================================
// StarryMeadow: 星象占卜
// ============================================================
export function addAstrologySystem(map) {
  const buffs = {
    speed: { name: '疾风之星', desc: '移动速度 +20%', multiplier: 1.2, color: 0x66ffaa },
    luck: { name: '幸运之星', desc: '收集范围 +50%', multiplier: 1.5, color: 0xffd700 },
    glow: { name: '光辉之星', desc: '发光强度 +30%', multiplier: 1.3, color: 0xff88cc },
  };

  // Buff 激活时的环绕粒子效果
  const buffParticles = createRisingParticles(20, 0xffd700, 0.5, 1);
  buffParticles.visible = false;
  buffParticles.position.y = 0;
  map.group.add(buffParticles);

  // Buff 激活时的地面光环
  const buffRing = createGlowRing(2, 0xffd700, 0.1);
  buffRing.visible = false;
  buffRing.position.y = 0.05;
  map.group.add(buffRing);

  const state = {
    buffs,
    activeBuff: null,
    constellationOrder: [],
    buffParticles,
    buffRing,
  };

  map._astrology = state;
  map.addAchievement('astrologer', '占星师', '体验所有三种星象buff', true);

  return state;
}

export function applyConstellationBuff(map, constellationIndex) {
  if (!map._astrology) return null;
  const a = map._astrology;

  const buffKeys = Object.keys(a.buffs);
  const buffKey = buffKeys[constellationIndex % buffKeys.length];
  const buff = a.buffs[buffKey];
  a.activeBuff = { key: buffKey, ...buff };
  a.constellationOrder.push(buffKey);

  // 激活视觉特效
  a.buffParticles.visible = true;
  a.buffRing.visible = true;

  // 设置buff颜色
  const color = buff.color || 0xffd700;
  for (const p of a.buffParticles.children) {
    p.material.color.setHex(color);
  }
  a.buffRing.material.color.setHex(color);

  map.spawnFloatingText(
    new THREE.Vector3(0, 4, 0),
    `⭐ ${buff.name}`,
    color,
    2.0,
    true
  );

  // 检查是否体验过所有buff
  const uniqueBuffs = new Set(a.constellationOrder);
  if (uniqueBuffs.size >= buffKeys.length) {
    map.unlockAchievement('astrologer');
  }

  return a.activeBuff;
}

// ============================================================
// HarvestMaze: 迷雾记忆
// ============================================================
export function addFogOfWar(map) {
  const state = {
    enabled: true,
    revealRadius: 4,
    visitedCells: new Set(),
    cellSize: 2,
  };

  map._fogOfWar = state;
  map.addAchievement('cartographer', '迷宫制图师', '探索迷宫 80% 以上的区域', true);

  return state;
}

export function updateFogOfWar(map, playerPos) {
  if (!map._fogOfWar || !map._fogOfWar.enabled) return null;
  const fow = map._fogOfWar;

  const localX = playerPos.x - map.group.position.x;
  const localZ = playerPos.z - map.group.position.z;
  const cellX = Math.floor(localX / fow.cellSize);
  const cellZ = Math.floor(localZ / fow.cellSize);

  const revealCells = Math.ceil(fow.revealRadius / fow.cellSize);
  for (let dx = -revealCells; dx <= revealCells; dx++) {
    for (let dz = -revealCells; dz <= revealCells; dz++) {
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= revealCells) {
        fow.visitedCells.add(`${cellX + dx},${cellZ + dz}`);
      }
    }
  }

  return {
    type: 'fogOfWar',
    explored: fow.visitedCells.size,
    totalCells: Math.floor((map.mapRadius * 2) / fow.cellSize) ** 2,
  };
}

// ============================================================
// 辅助：角落探险家
// ============================================================
export function addExplorerAchievement(map, cornerPositions) {
  // 每个角落放一个发光的探索标记
  const markers = [];
  for (const pos of cornerPositions) {
    const marker = new THREE.Group();

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    pillar.position.y = 0.4;

    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    flag.position.set(0.2, 0.9, 0);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.6 })
    );
    glow.position.y = 1.1;

    marker.add(pillar, flag, glow);
    marker.position.copy(pos);
    marker.userData = { found: false, glow, flag };
    map.group.add(marker);
    markers.push(marker);
  }

  const state = {
    corners: cornerPositions.map((p, i) => ({ pos: p, found: false, marker: markers[i] })),
  };

  map._explorerCorners = state;
  return state;
}

export function checkExplorerCorners(map, playerPos) {
  if (!map._explorerCorners) return false;
  const e = map._explorerCorners;
  let anyNew = false;

  for (const corner of e.corners) {
    if (corner.found) continue;
    const worldCorner = corner.pos.clone().add(map.group.position);
    if (playerPos.distanceTo(worldCorner) < 3) {
      corner.found = true;
      anyNew = true;

      // 发现时的视觉反馈
      if (corner.marker) {
        corner.marker.userData.glow.material.color.setHex(0x00ff00);
        corner.marker.userData.glow.material.opacity = 1;
        corner.marker.userData.flag.material.color.setHex(0x00ff00);
      }

      map.spawnFloatingText(
        corner.pos.clone(),
        '📍 发现新区域！',
        0x00ff66,
        1.5
      );
    }
  }

  const allFound = e.corners.every(c => c.found);
  if (allFound) {
    map.unlockAchievement('explorer');
  }

  return anyNew;
}
