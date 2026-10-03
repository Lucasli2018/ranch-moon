/* ==========================================================
 * world.js — 地图查询、背包、交互目标、使用道具、日子推进
 * ========================================================== */
'use strict';

/* ======================= 地图查询 ======================= */
function inMap(tx, ty) { return tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H; }
function tileAt(tx, ty) { return inMap(tx, ty) ? map[ty][tx] : -1; }
function solid(tx, ty) {
  if (!inMap(tx, ty)) return true;
  const t = map[ty][tx];
  if (t === T.DOOR) return false;
  return SOLID.has(t);
}
function blockedAt(x, y) {
  const L = solid(Math.floor((x - 5) / TILE), Math.floor((y - 13) / TILE));
  const R = solid(Math.floor((x + 5) / TILE), Math.floor((y - 13) / TILE));
  const B = solid(Math.floor((x + 5) / TILE), Math.floor((y - 2) / TILE));
  const B2 = solid(Math.floor((x - 5) / TILE), Math.floor((y - 2) / TILE));
  return L || R || B || B2;
}
function curSeason() { return SEASONS[S.season]; }
function seasonCrops() { const s = curSeason(); return CROPS.filter(c => c.season === s); }

/* ======================= 背包 / 种子 ======================= */
function bagAdd(id, n) {
  for (const it of S.bag) { if (it.id === id) { it.n += n; return; } }
  S.bag.push({ id: id, n: n });
}
function bagCount(id) {
  for (const it of S.bag) if (it.id === id) return it.n;
  return 0;
}
function seedCount(id) {
  for (const it of S.seedBag) if (it.id === id) return it.n;
  return 0;
}
function seedAdd(id, n) {
  for (const it of S.seedBag) { if (it.id === id) { it.n += n; return; } }
  S.seedBag.push({ id: id, n: n });
}
function seedTake(id) {
  for (let i = 0; i < S.seedBag.length; i++) if (S.seedBag[i].id === id) {
    S.seedBag[i].n--;
    if (S.seedBag[i].n <= 0) S.seedBag.splice(i, 1);
    return true;
  }
  return false;
}
function itemPrice(id) {
  if (CROP_MAP[id]) return CROP_MAP[id].sell;
  if (ITEMS[id]) return ITEMS[id].price;
  return 10;
}
function itemName(id) {
  if (CROP_MAP[id]) return CROP_MAP[id].name;
  if (ITEMS[id]) return ITEMS[id].name;
  return id;
}
function itemColor(id) {
  if (CROP_MAP[id]) return CROP_MAP[id].col[4];
  if (FISH_MAP[id]) return FISH_MAP[id].col;
  if (ITEMS[id]) return '#cfd8c8';
  return '#cfd8c8';
}

/* ======================= 季节事件钩子 ======================= */
/* 全部价格 / 体力 / 生长 / 产出的事件修正都只从这里读，
   别在 render 或 game 里硬编码 —— 换一个事件不用动别处 */
function curEvent() { return (S && S.event) ? EVENT_MAP[S.event] : null; }
/* ev('sellMul') → 1.6 或 0（无事件返回 0，用 || 1 兜底） */
function ev(k) { const e = curEvent(); return (e && e.effect[k]) || 0; }
function evMul(k) { return ev(k) || 1; }

/* 受事件影响的实际价格（商店买卖统一走这两个函数） */
function seedPrice(crop) { return Math.max(1, Math.round(crop.seed * evMul('seedMul'))); }
function sellPrice(id) { return Math.max(1, Math.round(itemPrice(id) * evMul('sellMul'))); }
function staminaCost(k) { return Math.max(1, Math.round(useCost(k) * evMul('stamMul'))); }

/* ======================= 金币收支记账 ======================= */
/* 所有加减金币都走这里：顺带记当日收支 + 累计净利，档案面板才有数据 */
function addGold(n) {
  S.gold = Math.max(0, S.gold + n);
  if (!S.stats.flow) S.stats.flow = { earn: 0, spend: 0 };
  if (n >= 0) { S.stats.flow.earn += n; S.stats.earned += n; }
  else S.stats.flow.spend += (-n);
  return S.gold;
}

/* ======================= 牧场动物买卖 ======================= */
function animalDef(kind) { return ANIMAL_SHOP[kind] || null; }
function animalPrice(a) { const d = animalDef(a.kind); return d ? Math.round(d.price * evMul('animalMul')) : 0; }
function animalMax(kind) { const d = animalDef(kind); return d ? d.max : 1; }
function animalOwned(kind) { let n = 0; animals.forEach(a => { if (a.kind === kind && a.owned) n++; }); return n; }
/* 买下牧场里的动物：owned=已购买；have=今日有产出（nextDay 只对 owned 置位） */
function buyAnimal(a) {
  if (!a) return false;
  if (a.owned) { toastMsg('这只已经在牧场里了'); return false; }
  const d = animalDef(a.kind);
  if (!d) { toastMsg('这里买不了'); return false; }
  if (animalOwned(a.kind) >= animalMax(a.kind)) {
    toastMsg('牧场里「' + d.name + '」最多养 ' + d.max + ' 只'); beep(200, .12); return false;
  }
  const price = animalPrice(a);
  if (S.gold < price) { toastMsg('金币不够，还差 ¥' + (price - S.gold)); beep(180, .14); return false; }
  addGold(-price); a.owned = true; a.have = false;
  toastMsg('买下' + a.name + '！明天起每天产' + itemName(d.product));
  beep(760, .1); beep(980, .08);
  saveGame();
  return true;
}

/* 选中的种子（在背包面板里可切换） */
function seedChoice() {
  if (S.seedChoice && seedCount(S.seedChoice) > 0) return S.seedChoice;
  const avail = seasonCrops().filter(c => seedCount(c.id) > 0);
  if (avail.length) { S.seedChoice = avail[0].id; return avail[0].id; }
  return null;
}

/* ======================= 交互目标查找 ======================= */
/* 面前那一格：严格取「脚下一格 + 朝向偏移 1 格」，
   这样锄头/水壶作用的位置和角色朝向、高亮框始终一致，不会挖到脚下或隔格 */
function frontTile() {
  const d = player.dir;
  const tx = Math.floor(player.x / TILE), ty = Math.floor(player.y / TILE);
  return {
    tx: d === 1 ? tx + 1 : d === 3 ? tx - 1 : tx,
    ty: d === 0 ? ty - 1 : d === 2 ? ty + 1 : ty
  };
}
/* 该格是否落在人物「朝向那一侧」：
   (格中心 − 人物) · 朝向向量 的点积 > −0.45 → 算面前（略微 Allow 一点点侧向/身后余量） */
function inFront(tx, ty) {
  const d = player.dir;
  const vx = d === 1 ? 1 : d === 3 ? -1 : 0;
  const vy = d === 0 ? -1 : d === 2 ? 1 : 0;
  if (!vx && !vy) return true;
  const dx = tx + 0.5 - player.x / TILE, dy = ty + 0.5 - player.y / TILE;
  return (dx * vx + dy * vy) > -0.45;
}
/* 优先作用面前那格；面前格不满足条件才退回收范围内「仍在面前」的候选格（不会跑到背后） */
function pickTile(range, test) {
  const f = frontTile();
  if (inMap(f.tx, f.ty) && test(f.tx, f.ty)) return { tx: f.tx, ty: f.ty };
  const s = scanTiles(range, test, true);
  return s ? { tx: s.tx, ty: s.ty } : null;
}
let lastTarget = null;   // 供渲染高亮「这一下会作用到这格」
/* 每帧刷新目标：让高亮框和实际作用格永远一致 */
function updateTarget() {
  if (modal || !S) { lastTarget = null; return; }
  lastTarget = findTarget();
}
/* 半径（格）内符合条件的格子，取最近一个；frontOnly=true 时只收「面前」那半边 */
function scanTiles(range, test, frontOnly) {
  const pcx = player.x / TILE, pcy = player.y / TILE;
  const r = range;
  let best = null, bd = 1e9;
  const x0 = Math.max(0, Math.floor(pcx - r)), x1 = Math.min(MAP_W - 1, Math.ceil(pcx + r));
  const y0 = Math.max(0, Math.floor(pcy - r)), y1 = Math.min(MAP_H - 1, Math.ceil(pcy + r));
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const d = Math.hypot(tx + 0.5 - pcx, ty + 0.5 - pcy);
    if (d > r) continue;
    if (frontOnly && !inFront(tx, ty)) continue;
    if (test(tx, ty)) { if (d < bd) { bd = d; best = { tx: tx, ty: ty, d: d }; } }
  }
  return best;
}
function findTarget() {
  const kind = tool;
  if (kind === 'axe' || kind === 'pick' || kind === 'hoe') {
    const key = kind === 'axe' ? T.TREE : kind === 'pick' ? T.ROCK : T.DIRT;
    const t = pickTile(1.5, (tx, ty) => tileAt(tx, ty) === key);
    return t ? { tx: t.tx, ty: t.ty, type: 'tile' } : null;
  }
  if (kind === 'can')  return pickTile(1.5, (tx, ty) => {
    const c = cropMap[ty][tx];
    return map[ty][tx] === T.FARM && c && !c.wetted;
  });
  // 钓竿：朝当前朝向「远投」——沿朝向射线投到最远那格水（最远 = 离岸最远 = 最深）。
  // 物理约束：玩家不能进水，只能站在岸边，所以落点必然是岸边那圈水格；
  // 靠射程 6 格（96px）跨到湖心，玩家有可操作空间：
  // 朝湖心投 = 深水（大鱼），朝岸边投 = 浅水（小鱼）。
  if (kind === 'rod') {
    const w = rodCastTile(6);
    return w ? { tx: w.tx, ty: w.ty, type: 'water' } : null;
  }
  // 双手：优先「面前那格」的成熟作物 → 面前半边的成熟作物 → NPC → 动物 → 商店 → 面前空地播种 → 门（睡觉）
  const f0 = frontTile();
  const fMature = inMap(f0.tx, f0.ty) && cropMap[f0.ty][f0.tx] && cropMap[f0.ty][f0.tx].stage >= 4;
  const mature = fMature ? { tx: f0.tx, ty: f0.ty } :
    scanTiles(1.35, (tx, ty) => { const c = cropMap[ty][tx]; return c && c.stage >= 4; }, true);
  if (mature) return { tx: mature.tx, ty: mature.ty, type: 'crop' };
  const np = npcs.reduce((best, n) => {
    const d = Math.hypot(n.x * TILE - player.x, n.y * TILE - player.y);
    return (best === null || d < best.d) ? { d: d, n: n } : best;
  }, null);
  if (np && np.d < 34) return { type: 'npc', npc: np.n };   // NPC 放大后交互距离同步放宽
  const an = animals.reduce((best, a) => {
    const d = Math.hypot(a.x * TILE - player.x, a.y * TILE - player.y);
    return (a.owned && (best === null || d < best.d)) ? { d: d, a: a } : best;
  }, null);
  if (an && an.d < 26) return { type: 'animal', a: an.a };
  const sh = scanTiles(1.7, (tx, ty) => tileAt(tx, ty) === T.SHOP);
  if (sh) return { type: 'shop' };
  const empty = scanTiles(1.2, (tx, ty) => {
    const c = cropMap[ty][tx]; return map[ty][tx] === T.FARM && !c;
  }, true);
  if (empty) return { tx: empty.tx, ty: empty.ty, type: 'plant' };
  const dr = doorNear();
  if (dr) return { tx: dr.tx, ty: dr.ty, type: 'door' };
  return null;
}

/* 屋子/谷仓的门：面前那格是门 → 走两步到门口按「使用」就能睡。
   站上门口那格朝门按也算，不用非得踩准一格 */
function doorNear() {
  const f = frontTile();
  if (inMap(f.tx, f.ty) && map[f.ty][f.tx] === T.DOOR) return { tx: f.tx, ty: f.ty };
  const tx0 = Math.floor(player.x / TILE), ty0 = Math.floor(player.y / TILE);
  for (let dy = 0; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) {
    const tx = tx0 + dx, ty = ty0 - dy;
    if (inMap(tx, ty) && map[ty][tx] === T.DOOR) return { tx: tx, ty: ty };
  }
  return null;
}

/* ======================= 使用道具 ======================= */
function useCost(k) { return USE_COST[k] || 3; }

/* ==========================================================
 * 钓鱼系统 —— 抛竿 → 等待 → 咬钩 → 拉杆（时机小游戏）
 *
 * 状态机（fish.st）：
 *   idle    空闲（没在钓）
 *   wait    已抛竿，水面浮标晃动，等鱼上钩
 *   bite    咬钩！浮标猛沉 + 提示，此窗口内按「使用」起竿
 *   reel    拉杆小游戏：游标在 0~1 扫描，玩家要在绿区按下
 *
 * 三个设计点：
 *   1) 撒出去的「点」必须与目标格同源 —— 用 fish.tx/ty 回溯，不另存坐标，
 *      否则切场景/分辨率变化后浮标会和实际水格错位。
 *   2) bite 窗口按 rarity 递减（稀有的鱼更难反应），但保底 0.45s，手机也来得及。
 *   3) 拉杆小游戏用纯计时器 + 游标位置，不依赖帧率（用 dt 累加）。
 * ========================================================== */
let fish = { st: 'idle', tx: 0, ty: 0, t: 0, wait: 0, biteWin: 0, fishId: null, cursor: 0, dir: 1, zone: 0, zoneW: 0.2 };

/* 抛竿落点：沿当前朝向前进，每步检查是否还是水；
   撞到非水（岸/石头）时退回到最后一格水。
   朝湖心方向投 → 落点离岸远（深水）；朝岸边方向投 → 落点贴着岸（浅水）。 */
function rodCastTile(maxRange) {
  const pcx = player.x / TILE, pcy = player.y / TILE;
  const d = player.dir;
  const vx = d === 1 ? 1 : d === 3 ? -1 : 0;
  const vy = d === 0 ? -1 : d === 2 ? 1 : 0;
  if (!vx && !vy) return null;
  let best = null;
  for (let s = 0.5; s <= maxRange; s += 0.25) {
    const tx = Math.floor(pcx + vx * s), ty = Math.floor(pcy + vy * s);
    if (!inMap(tx, ty) || map[ty][tx] !== T.WATER) break;
    best = { tx: tx, ty: ty };
  }
  // 脚下就是水（站在浅滩/木栈道上）也算
  if (!best) {
    const f = frontTile();
    if (inMap(f.tx, f.ty) && map[f.ty][f.tx] === T.WATER) return f;
  }
  return best;
}

/* ---- 水域深浅：多源 BFS 距离变换（到最近陆地的 8 邻域距离）----
   为什么用「到最近陆地的距离」而不是别的：
   玩家不能进水（水在 SOLID 里），只能站在岸边抛竿，落点必然贴着岸。
   8 邻域距离下贴岸那圈恒为 1，而**朝不同方向投**能落到不同的水格：
     · 农场的溪流是 1~2 格宽的窄水道 → 整条都是 1（永远浅）
     · 月影湖是直径十几格的圆形 → 贴岸 1、往湖心投能到 2~4（最深 4）
   于是「朝湖心投 = 深处 = 大鱼，朝岸边投 = 浅处 = 小鱼」这个策略真实成立。 */
let SHORE_D = null, SHORE_D_FOR = null;
function shoreDistMap() {
  if (SHORE_D_FOR === map && SHORE_D) return SHORE_D;
  const D = [];
  for (let y = 0; y < MAP_H; y++) D.push(new Array(MAP_W).fill(9999));
  const q = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (map[y][x] !== T.WATER) { D[y][x] = 0; q.push([x, y]); }   // 所有非水格都是源
  }
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let head = 0;
  while (head < q.length) {
    const c = q[head++], d0 = D[c[1]][c[0]];
    for (const n of N8) {
      const nx = c[0] + n[0], ny = c[1] + n[1];
      if (!inMap(nx, ny) || D[ny][nx] <= d0 + 1) continue;
      D[ny][nx] = d0 + 1; q.push([nx, ny]);
    }
  }
  SHORE_D = D; SHORE_D_FOR = map;
  return D;
}
/* 单格水深 = 到最近陆地的 8 邻域距离；非水格 = -1 */
function waterDepth(tx, ty) {
  if (!inMap(tx, ty) || map[ty][tx] !== T.WATER) return -1;
  const D = shoreDistMap();
  const v = D[ty][tx];
  return v >= 9999 ? 1 : v;
}
/* 当前季节能钓到的鱼（depth 门槛：站得越靠深水，能碰上的大鱼越多） */
function fishPool(depth) {
  const s = curSeason();
  return FISH.filter(f => {
    if (f.depth > depth) return false;
    if (f.season === '全') return true;
    return f.season.indexOf(s) >= 0;
  });
}
/* 按稀有度加权抽一条鱼：稀有权重低，但不是抽不到。
   depth 尺度是 0~4（到最近岸的距离），所以深度加权用「超出门槛的格数 ×0.8」，
   刚好在「刚好够到门槛」时权重 ×1，越深越容易碰到大鱼，倍率不会爆 */
function rollFish(depth) {
  const pool = fishPool(depth);
  if (!pool.length) return null;
  let total = 0;
  const w = pool.map(f => {
    const base = f.rarity === 1 ? 100 : f.rarity === 2 ? 34 : 9;
    const dw = 1 + Math.max(0, depth - f.depth) * 0.8;
    const v = base * dw * (ev('bite') ? (f.rarity === 3 ? 6 : 2) : 1);
    total += v; return v;
  });
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}
/* 钓上来一条 */
function catchFish(f) {
  bagAdd(f.id, 1);
  if (!S.stats.fish) S.stats.fish = {};
  S.stats.fish[f.id] = (S.stats.fish[f.id] || 0) + 1;
  S.stats.fishCount = (S.stats.fishCount || 0) + 1;
  S.stats.fishKinds = S.stats.fishKinds || {};
  S.stats.fishKinds[f.id] = true;
  puff(fish.tx * TILE + 8, fish.ty * TILE + 4, '#bfe6ff', 12);
  toastMsg('钓到了 ' + f.name + '（' + '★'.repeat(f.rarity) + '）');
  beep(980, .08); beep(1240, .1); beep(1560, .08);
  saveGame();
}
/* 开始抛竿 */
function castLine() {
  const t = findTarget();
  if (!t || t.type !== 'water') { toastMsg('钓竿要对着水面才能下竿'); return; }
  const dep = waterDepth(t.tx, t.ty);
  if (dep < 0) return;
  const cost = staminaCost('rod');
  if (S.stamina < cost) { toastMsg('体力不够'); beep(180, .12); return; }
  S.stamina -= cost;
  fish.st = 'wait'; fish.tx = t.tx; fish.ty = t.ty; fish.t = 0; fish.fishId = null;
  // 等钩时间 0.9~3.2s；「鱼群过境」时几乎立刻咬钩
  fish.wait = ev('bite') ? 0.4 + Math.random() * 0.4 : 0.9 + Math.random() * 2.3;
  puff(t.tx * TILE + 8, t.ty * TILE + 6, '#bfe6ff', 6);
  beep(320, .06); beep(460, .05);
}
/* 咬钩瞬间确定是哪条鱼：bite 窗口宽度按稀有度收窄（保底 0.5s，手机也来得及按） */
function onBite() {
  const dep = waterDepth(fish.tx, fish.ty);
  const f = rollFish(dep);
  fish.fishId = f ? f.id : null;
  const rar = f ? f.rarity : 1;
  fish.biteWin = 1.05 - (rar - 1) * 0.2;      // 1★ 1.05s → 3★ 0.65s
  fish.st = 'bite'; fish.t = 0;
  beep(1180, .1);
}
/* 收竿（bite 窗口内按下）→ 进入拉杆时机小游戏 */
function hookSet() {
  const rar = fish.fishId ? (FISH_MAP[fish.fishId] || { rarity: 1 }).rarity : 1;
  fish.zoneW = 0.34 - (rar - 1) * 0.09;        // 1★ 绿区 34% → 3★ 16%
  fish.zone = Math.random() * (1 - fish.zoneW);
  fish.cursor = 0; fish.dir = 1;
  fish.st = 'reel'; fish.t = 0;
  beep(880, .07); beep(1180, .09);
}
/* 拉杆判定：游标停在绿区内 = 上鱼 */
function reelJudge() {
  const f = fish.fishId ? FISH_MAP[fish.fishId] : null;
  if (fish.cursor >= fish.zone && fish.cursor <= fish.zone + fish.zoneW) {
    if (f) catchFish(f);
    else { toastMsg('钩上什么也没有…'); beep(300, .1); }
  } else {
    toastMsg('脱钩了！绿区没掐准');
    beep(200, .14);
  }
  fish.st = 'idle'; fish.fishId = null; fish.t = 0;
}
function cancelFishing(silent) {
  if (fish.st === 'idle') return;
  fish.st = 'idle'; fish.fishId = null; fish.t = 0;
  if (!silent) toastMsg('收竿了');
}
/* 每帧推进钓鱼状态机（game.update 里调用） */
function updateFishing(dt) {
  if (fish.st === 'idle') return;
  fish.t += dt;
  if (fish.st === 'wait') {
    if (fish.t >= fish.wait) onBite();
  } else if (fish.st === 'bite') {
    if (fish.t >= fish.biteWin) {              // 窗口内没起竿 → 跑鱼
      fish.st = 'idle'; fish.t = 0; fish.fishId = null;
      toastMsg('鱼跑了…下次眼疾手快'); beep(240, .12);
    }
  } else if (fish.st === 'reel') {
    const rar = fish.fishId ? (FISH_MAP[fish.fishId] || { rarity: 1 }).rarity : 1;
    const sp = 0.5 + rar * 0.13;               // 游标往返速度：稀有的更快
    fish.cursor += fish.dir * sp * dt;
    if (fish.cursor >= 1) { fish.cursor = 1; fish.dir = -1; }
    if (fish.cursor <= 0) { fish.cursor = 0; fish.dir = 1; }
  }
}
/* 钓鱼中按「使用」：不同状态不同处理；返回 true 表示这次按已被钓鱼消费掉 */
function fishingUse() {
  if (fish.st === 'idle') return false;
  if (fish.st === 'bite') { hookSet(); return true; }
  if (fish.st === 'reel') { reelJudge(); return true; }
  if (fish.st === 'wait') { toastMsg('还没上钩，等浮标沉下去'); return true; }
  return true;
}
/* 钓到过的鱼（档案面板用）：已钓 / 共 */
function fishDex() {
  const got = (S.stats && S.stats.fishKinds) || {};
  return FISH.map(f => ({ f: f, n: ((S.stats && S.stats.fish) || {})[f.id] || 0, has: !!got[f.id] }));
}

function doUse() {
  if (modal) return;
  if (fish.st !== 'idle') { fishingUse(); return; }   // 钓鱼中「使用」由钓鱼状态机接管
  if (S.stamina <= 0) { toastMsg('体力耗尽了，回屋睡一觉吧'); beep(180, .14); return; }
  const t = findTarget();
  lastTarget = t;
  if (!t) { toastMsg('这里没什么可做的'); return; }
  if (t.type === 'water') { castLine(); return; }       // 钓竿 + 水面
  if (t.type === 'shop') { openShop(); return; }
  if (t.type === 'npc') {
    const lines = t.npc.lines || NPC_DEFS[t.npc.id].lines;
    modal = { type: 'npc', npc: t.npc, line: lines[Math.floor(Math.random() * lines.length)] };
    beep(620, .06); beep(780, .06);
    return;
  }
  if (t.type === 'animal') {
    if (!t.a.owned) return;
    if (!t.a.have) { toastMsg(t.a.name + '现在没有产出，明天再来看看'); return; }
    if (S.stamina < staminaCost('gather')) { toastMsg('体力不够'); return; }
    S.stamina -= staminaCost('gather');
    t.a.have = false;
    bagAdd(t.a.product, 1);
    puff(t.a.x * TILE, t.a.y * TILE, '#fff8e0', 8);
    toastMsg('获得 ' + itemName(t.a.product));
    beep(720, .08); beep(900, .07);
    return;
  }
  const tt = tileAt(t.tx, t.ty);
  const c = cropMap[t.ty] ? cropMap[t.ty][t.tx] : null;

  if (tool === 'hoe' && tt === T.DIRT) {
    if (S.stamina < staminaCost('hoe')) { toastMsg('体力不够'); return; }
    S.stamina -= staminaCost('hoe'); map[t.ty][t.tx] = T.FARM;
    puff(t.tx * TILE + 8, t.ty * TILE + 8, '#8b5a2b', 7); beep(240, .08);
    // 手里有选中的种子就顺手种下，少按一次
    const sid = seedChoice();
    if (sid && seedCount(sid) > 0) {
      seedTake(sid);
      cropMap[t.ty][t.tx] = { id: sid, stage: 0, wetted: false };
    }
    bakeMap();
    return;
  }
  if (tool === 'can' && tt === T.FARM && c && !c.wetted) {
    if (S.stamina < staminaCost('can')) { toastMsg('体力不够'); return; }
    S.stamina -= staminaCost('can'); c.wetted = true; S.stats.watered++;
    puff(t.tx * TILE + 8, t.ty * TILE + 8, '#7fd0ff', 7); beep(660, .07);
    return;
  }
  if (tool === 'axe' && tt === T.TREE) {
    if (S.stamina < staminaCost('axe')) { toastMsg('体力不够'); return; }
    S.stamina -= staminaCost('axe'); map[t.ty][t.tx] = T.GRASS;
    bagAdd('wood', 2); S.stats.wood = (S.stats.wood || 0) + 2;
    puff(t.tx * TILE + 8, t.ty * TILE + 8, '#6b4a2a', 10);
    toastMsg('获得木材 x2'); bakeMap(); beep(200, .12);
    return;
  }
  if (tool === 'pick' && tt === T.ROCK) {
    if (S.stamina < staminaCost('pick')) { toastMsg('体力不够'); return; }
    S.stamina -= staminaCost('pick'); map[t.ty][t.tx] = T.GRASS;
    bagAdd('stone', 2); S.stats.stone = (S.stats.stone || 0) + 2;
    puff(t.tx * TILE + 8, t.ty * TILE + 8, '#b0b6bb', 10);
    toastMsg('获得石头 x2'); bakeMap(); beep(160, .14);
    return;
  }
  if (tool === 'hand') {
    if (t.type === 'door' || tt === T.DOOR) { sleepTick(); return; }
    if (t.type === 'crop' && c) {
      const n = 1 + (Math.random() < 0.35 ? 1 : 0) + ev('extra');   // 丰收祭额外 +1
      bagAdd(c.id, n);
      S.stats.harvest += n;
      S.stats.byCrop = S.stats.byCrop || {};
      S.stats.byCrop[c.id] = (S.stats.byCrop[c.id] || 0) + n;
      const back = (Math.random() < 0.3 ? 1 : 0);
      if (back) seedAdd(c.id, back);
      cropMap[t.ty][t.tx] = null;
      S.stamina -= staminaCost('harvest');
      puff(t.tx * TILE + 8, t.ty * TILE + 8, CROP_MAP[c.id].col[4], 9);
      toastMsg('收获 ' + itemName(c.id) + ' x' + n + (back ? '（+种子）' : ''));
      beep(880, .09); beep(1180, .08);
      return;
    }
    if (t.type === 'plant') {
      const crop = seedChoice();
      if (!crop) { toastMsg('没有种子，去商店买'); return; }
      if (seedCount(crop) <= 0) { toastMsg('没有「' + crop + '」的种子，去商店买'); beep(200, .12); return; }
      seedTake(crop);
      cropMap[t.ty][t.tx] = { id: crop, stage: 0, wetted: false };
      S.stamina -= staminaCost('harvest');
      puff(t.tx * TILE + 8, t.ty * TILE + 8, '#c9a86a', 6); beep(520, .08);
      return;
    }
  }
  toastMsg('这里没什么可做的');
}

/* ======================= 睡觉 / 新的一天 ======================= */
let lastWither = [];
function sleepTick() {
  if (modal) return;
  cancelFishing(true);
  modal = { type: 'sleep' };
  beep(300, .1);
}

/* ---- 资源再生：砍掉的树 / 敲掉的石头，第二天长回来 ----
   兑现 README 的「明天又会冒出来」。做法：不记录被砍了哪棵，而是每天
   扫描「当前是草地、且离已有实体（作物/建筑/动物位）足够远」的格子按概率补种，
   这样存档里不用额外存 diff，也不会在玩家盖了东西的地方长树。 */
const REGROW_SPOTS = { forest: 26, farm: 8, pasture: 5 };
function regrowResources() {
  const quota = REGROW_SPOTS[sceneKey];
  if (!quota) return 0;
  const rng = mkRng((S.seed || 1) + S.year * 977 + S.season * 131 + S.day * 7);
  const occupied = (tx, ty) => {
    if (cropMap[ty] && cropMap[ty][tx]) return true;               // 耕地/作物
    const t = map[ty][tx];
    if (t !== T.GRASS) return true;
    // 玩家/NPC/动物脚下及面前一格不长，免得糊脸
    for (const e of [{ x: player.x / TILE, y: player.y / TILE }].concat(npcs).concat(animals)) {
      if (Math.abs(e.x - tx) < 1.6 && Math.abs(e.y - ty) < 1.6) return true;
    }
    return false;
  };
  const cand = [];
  for (let ty = 1; ty < MAP_H - 1; ty++) for (let tx = 1; tx < MAP_W - 1; tx++) {
    if (occupied(tx, ty)) continue;
    // 偏好远离已有树的地方，长得自然些
    let near = 0;
    for (let k = 0; k < 8; k++) {
      const a = (k * 5) % 8, ang = a / 8 * 6.2832;
      const nx = Math.round(tx + Math.cos(ang) * 2), ny = Math.round(ty + Math.sin(ang) * 2);
      if (inMap(nx, ny) && (map[ny][nx] === T.TREE || map[ny][nx] === T.ROCK)) near++;
    }
    cand.push({ tx: tx, ty: ty, w: 1 + near * 0.8 });
  }
  if (!cand.length) return 0;
  let total = 0; cand.forEach(c => { total += c.w; });
  let n = 0;
  for (let i = 0; i < quota && cand.length; i++) {
    let r = rng() * total, k = 0;
    for (; k < cand.length - 1; k++) { r -= cand[k].w; if (r <= 0) break; }
    const c = cand.splice(k, 1)[0];
    total -= c.w;
    map[c.ty][c.tx] = rng() < 0.78 ? T.TREE : T.ROCK;
    n++;
  }
  return n;
}

/* ---- 当天事件：换季首日必出季节主事件，其余日子 30% 概率出随机事件 ---- */
function rollEventForDay() {
  if (S.day === 1) {                       // 每季第一天
    return SEASON_EVENT[S.season] || null;
  }
  if (Math.random() < 0.3) {
    const id = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
    // 别和当季主事件撞车
    if (id === SEASON_EVENT[S.season]) return null;
    return id;
  }
  return null;
}

function nextDay() {
  const prevEvent = curEvent();
  const grown = [];
  const noGrow = !!ev('noGrow');
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    const c = cropMap[ty][tx];
    if (!c) continue;
    const crop = CROP_MAP[c.id];
    if (c.stage >= 4) continue;                        // 已成熟，等收获
    if (crop.season !== curSeason()) { cropMap[ty][tx] = null; grown.push('枯萎' + crop.name); continue; }
    if (c.wetted) { c.wetted = false; if (!noGrow) c.stage = Math.min(4, c.stage + 1); }
  }
  lastWither = grown;
  // 其余场景的作物/动物也结算（当前场景之外的作物在各自 SCENES 里，nextDay 只跑当前场景 ——
  // 玩家只能在一个场景活动，切场景时不会漏算：cropMap 指向的是当前场景
  SCENES[sceneKey].animals.forEach(function (a) { if (a.owned) a.have = true; });
  const regrown = regrowResources();
  S.day++;
  if (S.day > SEASON_DAYS) { S.day = 1; S.season++; if (S.season > 3) { S.season = 0; S.year++; } }
  S.staminaMax = Math.min(140, 100 + Math.floor((S.year - 1) * 32 + (S.season * 8 + S.day)) * 0.6);
  S.stamina = S.staminaMax;
  S.hour = 6; S.minute = 0;
  S.stats.days++;
  S.event = rollEventForDay();
  // 当日收支归零（档案面板看「今天赚了多少」）
  S.stats.flow = { earn: 0, spend: 0 };
  bakeMap();
  modal = { type: 'dayend', info: grown, regrown: regrown, prev: prevEvent };
  saveGame();
}
function closeDayEnd() {
  modal = null;
  const e = curEvent();
  if (e) {
    toastMsg('「' + e.name + '」' + e.desc);
    beep(760, .08); beep(980, .1);
  } else {
    toastMsg(curSeason() + '季 第' + S.day + '天');
  }
  saveGame();
}
