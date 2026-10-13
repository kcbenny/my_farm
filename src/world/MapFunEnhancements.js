import * as THREE from 'three';

/**
 * 冷门又好玩的地图玩法增强系统
 *
 * 设计理念：
 * 1. 不是"更多收集品"，而是改变玩家的决策方式
 * 2. 每个地图有一个独特的"策略层"，让重复游玩有不同体验
 * 3. 风险 vs 回报是核心——让玩家自己权衡
 *
 * 每个地图的独特冷门玩法：
 * - EnchantedForest: 精灵集市 + 月光小径（时间窗口出现的捷径）
 * - AncientRuins: 沙漏倒计时模式（踩错符文不重置，而是启动倒计时）
 * - SnowyMountain: 体温系统（太冷会减速，找温泉恢复）
 * - MysticLake: 潮汐系统（水位变化改变可达区域）
 * - StarryMeadow: 星象占卜（星座顺序影响buff）
 * - HarvestMaze: 迷雾记忆（走过的路才可见）
 */

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

  // 神秘商人主体（简单的斗篷造型）
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

  // 悬浮的交易光球
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.9 })
  );
  orb.position.set(0, 1.2, 0.6);

  // 摊位底座
  const stall = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.7, 0.15, 12),
    new THREE.MeshStandardMaterial({ color: 0x5a3a2a })
  );
  stall.position.y = 0.075;
  stall.position.z = 0.6;

  merchantGroup.add(body, head, orb, stall);
  map.group.add(merchantGroup);

  // 商人交互状态
  const merchantState = {
    group: merchantGroup,
    orb,
    items,
    currency,
    purchased: new Set(),
    nearPlayer: false,
  };

  map._merchant = merchantState;

  // 添加成就
  map.addAchievement('shopper', '精明消费者', '在神秘商人处购买一件物品', false);
  map.addAchievement('whale', '土豪玩家', '购买所有神秘商品', true);

  return merchantState;
}

export function updateMysteryMerchant(map, playerPos, delta) {
  if (!map._merchant) return null;
  const m = map._merchant;

  // 光球浮动动画
  m.orb.position.y = 1.2 + Math.sin(map.time * 2) * 0.15;
  m.orb.rotation.y += delta * 1.5;

  // 检测玩家靠近
  const worldPos = m.group.getWorldPosition(new THREE.Vector3());
  const dist = playerPos.distanceTo(worldPos);
  m.nearPlayer = dist < 2.5;

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
// 每隔一段时间出现一条发光的捷径，通向隐藏宝藏
// ============================================================
export function addMoonlitPath(map) {
  const pathGroup = new THREE.Group();
  pathGroup.visible = false;

  // 发光的小径粒子
  const particleCount = 20;
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xaaaaff, transparent: true, opacity: 0.7 })
    );
    const t = i / particleCount;
    const angle = t * Math.PI * 0.8 - Math.PI * 0.4;
    const radius = 5 + t * 8;
    p.position.set(Math.sin(angle) * radius, 0.1, Math.cos(angle) * radius - 10);
    p.userData = { baseY: 0.1, phase: i * 0.5 };
    pathGroup.add(p);
    particles.push(p);
  }

  // 小径尽头的宝箱
  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x8b4513, emissive: 0x4a2500, emissiveIntensity: 0.2 })
  );
  chest.position.set(0, 0.25, -15);
  const chestGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.3 })
  );
  chestGlow.position.copy(chest.position);
  chestGlow.position.y += 0.1;
  pathGroup.add(chest, chestGlow);

  map.group.add(pathGroup);

  const state = {
    group: pathGroup,
    particles,
    chest,
    chestGlow,
    active: false,
    cycleTime: 0,
    activeDuration: 15, // 每次出现15秒
    cycleDuration: 45,  // 每45秒一个周期
    rewardClaimed: false,
  };

  map._moonlitPath = state;
  map.addAchievement('moonlight', '月光寻宝者', '在月光小径出现时找到宝藏', true);

  return state;
}

export function updateMoonlitPath(map, playerPos, delta) {
  if (!map._moonlitPath) return null;
  const p = map._moonlitPath;

  p.cycleTime += delta;
  const cyclePos = p.cycleTime % p.cycleDuration;
  const shouldBeActive = cyclePos < p.activeDuration && !p.rewardClaimed;

  if (shouldBeActive !== p.active) {
    p.active = shouldBeActive;
    p.group.visible = shouldBeActive;
  }

  if (p.active) {
    // 粒子浮动
    for (const particle of p.particles) {
      particle.position.y = particle.userData.baseY +
        Math.sin(map.time * 2 + particle.userData.phase) * 0.1;
      particle.material.opacity = 0.5 + Math.sin(map.time * 3 + particle.userData.phase) * 0.3;
    }
    // 宝箱脉动
    const pulse = 1 + Math.sin(map.time * 2) * 0.1;
    p.chestGlow.scale.setScalar(pulse);

    // 检测玩家是否到达宝箱
    const chestWorld = p.chest.getWorldPosition(new THREE.Vector3());
    if (playerPos.distanceTo(chestWorld) < 1.5 && !p.rewardClaimed) {
      p.rewardClaimed = true;
      p.group.visible = false;
      map.unlockAchievement('moonlight');
      // 奖励：生成一堆宝石
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
// 踩错符文不再直接重置，而是启动一个倒计时，
// 倒计时内完成所有符文可以获得"完美通关"奖励
// ============================================================
export function addHourglassMode(map) {
  const hourglassGroup = new THREE.Group();
  hourglassGroup.position.set(0, 0, -8);

  // 沙漏模型
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

  hourglassGroup.add(top, bottom, frame, topFrame, bottomFrame);
  map.group.add(hourglassGroup);

  const state = {
    group: hourglassGroup,
    topSand: top,
    bottomSand: bottom,
    active: false,
    timeLeft: 30,
    maxTime: 30,
    completedInTime: false,
  };

  map._hourglass = state;
  map.addAchievement('speedrun', '沙漏挑战者', '在倒计时内完成符文谜题', true);

  return state;
}

export function startHourglass(map) {
  if (!map._hourglass || map._hourglass.active) return;
  map._hourglass.active = true;
  map._hourglass.timeLeft = map._hourglass.maxTime;
}

export function updateHourglass(map, delta) {
  if (!map._hourglass || !map._hourglass.active) return null;
  const h = map._hourglass;

  h.timeLeft -= delta;
  const progress = h.timeLeft / h.maxTime;

  // 沙子视觉效果
  h.topSand.scale.y = progress;
  h.topSand.position.y = 0.7 - (1 - progress) * 0.2;
  h.bottomSand.scale.y = 1 - progress;
  h.bottomSand.material.opacity = 0.3 + (1 - progress) * 0.4;

  if (h.timeLeft <= 0) {
    h.active = false;
    return { type: 'hourglassExpired' };
  }

  return { type: 'hourglassTick', timeLeft: h.timeLeft };
}

export function completeHourglass(map) {
  if (!map._hourglass || !map._hourglass.active) return false;
  map._hourglass.active = false;
  map._hourglass.completedInTime = true;
  map.unlockAchievement('speedrun');
  return true;
}

// ============================================================
// SnowyMountain: 体温系统
// 在户外待太久体温下降导致移动减速，找温泉恢复
// ============================================================
export function addTemperatureSystem(map, config = {}) {
  const {
    startTemp = 100,
    minTemp = 20,
    decayRate = 1.5, // 每秒下降
    recoverRate = 8,  // 温泉中每秒恢复
    slowThreshold = 50, // 低于此温度开始减速
  } = config;

  const state = {
    temperature: startTemp,
    minTemp,
    decayRate,
    recoverRate,
    slowThreshold,
    inHotSpring: false,
    hotSpringPositions: config.hotSprings || [],
  };

  map._temperature = state;
  map.addAchievement('iceman', '冰雪勇士', '体温低于30%时登顶', true);
  map.addAchievement('sauna', '温泉爱好者', '在所有温泉中休息过', false);

  return state;
}

export function updateTemperature(map, playerPos, delta) {
  if (!map._temperature) return null;
  const t = map._temperature;

  // 检测是否在温泉里
  t.inHotSpring = false;
  for (const spring of t.hotSpringPositions) {
    const worldSpring = spring.clone().add(map.group.position);
    if (playerPos.distanceTo(worldSpring) < 2) {
      t.inHotSpring = true;
      spring.visited = true;
      break;
    }
  }

  if (t.inHotSpring) {
    t.temperature = Math.min(100, t.temperature + t.recoverRate * delta);
  } else {
    t.temperature = Math.max(t.minTemp, t.temperature - t.decayRate * delta);
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
// 水位随时间变化，潮退时露出隐藏路径和宝藏
// ============================================================
export function addTideSystem(map, config = {}) {
  const {
    cycleDuration = 60, // 60秒一个潮汐周期
    highWaterY = 0.2,
    lowWaterY = -0.8,
  } = config;

  const state = {
    cycleDuration,
    highWaterY,
    lowWaterY,
    currentY: highWaterY,
    phase: 'high', // high, falling, low, rising
    hiddenRevealed: false,
  };

  map._tide = state;
  map.addAchievement('tide', '潮间带猎人', '在退潮时找到隐藏宝藏', true);

  return state;
}

export function updateTide(map, delta) {
  if (!map._tide) return null;
  const t = map._tide;

  const cyclePos = (map.time % t.cycleDuration) / t.cycleDuration;
  // 正弦波：0 = 高潮，0.5 = 低潮
  const tideFactor = (Math.cos(cyclePos * Math.PI * 2) + 1) / 2;
  t.currentY = t.lowWaterY + (t.highWaterY - t.lowWaterY) * tideFactor;

  // 更新水面高度
  if (map.waterSurface) {
    map.waterSurface.position.y = t.currentY + 0.175;
  }

  // 判断相位
  if (tideFactor > 0.8) t.phase = 'high';
  else if (tideFactor < 0.2) t.phase = 'low';
  else if (cyclePos < 0.5) t.phase = 'falling';
  else t.phase = 'rising';

  return {
    type: 'tide',
    phase: t.phase,
    waterY: t.currentY,
    isLowTide: t.phase === 'low',
  };
}

// ============================================================
// StarryMeadow: 星象占卜
// 完成星座的顺序不同，获得不同的buff
// ============================================================
export function addAstrologySystem(map) {
  const buffs = {
    speed: { name: '疾风之星', desc: '移动速度 +20%', multiplier: 1.2 },
    luck: { name: '幸运之星', desc: '收集范围 +50%', multiplier: 1.5 },
    glow: { name: '光辉之星', desc: '发光强度 +30%', multiplier: 1.3 },
  };

  const state = {
    buffs,
    activeBuff: null,
    constellationOrder: [],
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
  a.activeBuff = { key: buffKey, ...a.buffs[buffKey] };
  a.constellationOrder.push(buffKey);

  // 检查是否体验过所有buff
  const uniqueBuffs = new Set(a.constellationOrder);
  if (uniqueBuffs.size >= buffKeys.length) {
    map.unlockAchievement('astrologer');
  }

  map.spawnFloatingText(
    new THREE.Vector3(0, 4, 0),
    `⭐ ${a.buffs[buffKey].name}`,
    0xffd700,
    2.0,
    true
  );

  return a.activeBuff;
}

// ============================================================
// HarvestMaze: 迷雾记忆
// 迷雾笼罩迷宫，只有走过的地方才会被"记住"（变亮）
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

  // 计算玩家所在格子
  const localX = playerPos.x - map.group.position.x;
  const localZ = playerPos.z - map.group.position.z;
  const cellX = Math.floor(localX / fow.cellSize);
  const cellZ = Math.floor(localZ / fow.cellSize);

  // 标记周围格子为已访问
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
// 辅助：给地图添加一个"秘密角落"成就检测点
// ============================================================
export function addExplorerAchievement(map, cornerPositions) {
  const state = {
    corners: cornerPositions.map(p => ({ pos: p, found: false })),
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
    }
  }

  const allFound = e.corners.every(c => c.found);
  if (allFound) {
    map.unlockAchievement('explorer');
  }

  return anyNew;
}
