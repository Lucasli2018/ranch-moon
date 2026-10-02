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
  if (ITEMS[id]) return '#cfd8c8';
  return '#cfd8c8';
}
/* ======================= 牧场动物买卖 ======================= */
function animalDef(kind) { return ANIMAL_SHOP[kind] || null; }
function animalPrice(a) { const d = animalDef(a.kind); return d ? d.price : 0; }
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
  if (S.gold < d.price) { toastMsg('金币不够，还差 ¥' + (d.price - S.gold)); beep(180, .14); return false; }
  S.gold -= d.price; a.owned = true; a.have = false;
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
/* 优先作用面前那格；面前格不满足条件才退回最近的候选格 */
function pickTile(range, test) {
  const f = frontTile();
  if (inMap(f.tx, f.ty) && test(f.tx, f.ty)) return { tx: f.tx, ty: f.ty };
  const s = scanTiles(range, test);
  return s ? { tx: s.tx, ty: s.ty } : null;
}
let lastTarget = null;   // 供渲染高亮「这一下会作用到这格」
/* 每帧刷新目标：让高亮框和实际作用格永远一致 */
function updateTarget() {
  if (modal || !S) { lastTarget = null; return; }
  lastTarget = findTarget();
}
/* 半径（格）内符合条件的格子，取最近一个 */
function scanTiles(range, test) {
  const pcx = player.x / TILE, pcy = player.y / TILE;
  const r = range;
  let best = null, bd = 1e9;
  const x0 = Math.max(0, Math.floor(pcx - r)), x1 = Math.min(MAP_W - 1, Math.ceil(pcx + r));
  const y0 = Math.max(0, Math.floor(pcy - r)), y1 = Math.min(MAP_H - 1, Math.ceil(pcy + r));
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const d = Math.hypot(tx + 0.5 - pcx, ty + 0.5 - pcy);
    if (d > r) continue;
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
  // 双手：优先成熟作物 → 动物 → 商店 → 空地播种
  const mature = scanTiles(1.35, (tx, ty) => {
    const c = cropMap[ty][tx]; return c && c.stage >= 4;
  });
  if (mature) return { tx: mature.tx, ty: mature.ty, type: 'crop' };
  const an = animals.reduce((best, a) => {
    const d = Math.hypot(a.x * TILE - player.x, a.y * TILE - player.y);
    return (a.owned && (best === null || d < best.d)) ? { d: d, a: a } : best;
  }, null);
  if (an && an.d < 26) return { type: 'animal', a: an.a };
  const sh = scanTiles(1.7, (tx, ty) => tileAt(tx, ty) === T.SHOP);
  if (sh) return { type: 'shop' };
  const empty = scanTiles(1.2, (tx, ty) => {
    const c = cropMap[ty][tx]; return map[ty][tx] === T.FARM && !c;
  });
  if (empty) return { tx: empty.tx, ty: empty.ty, type: 'plant' };
  return null;
}

/* ======================= 使用道具 ======================= */
function useCost(k) { return USE_COST[k] || 3; }

function doUse() {
  if (modal) return;
  if (S.stamina <= 0) { toastMsg('体力耗尽了，回屋睡一觉吧'); beep(180, .14); return; }
  const t = findTarget();
  lastTarget = t;
  if (!t) { toastMsg('这里没什么可做的'); return; }
  if (t.type === 'shop') { openShop(); return; }
  if (t.type === 'animal') {
    if (!t.a.owned) return;
    if (!t.a.have) { toastMsg(t.a.name + '现在没有产出，明天再来看看'); return; }
    if (S.stamina < useCost('gather')) { toastMsg('体力不够'); return; }
    S.stamina -= useCost('gather');
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
    if (S.stamina < useCost('hoe')) { toastMsg('体力不够'); return; }
    S.stamina -= useCost('hoe'); map[t.ty][t.tx] = T.FARM;
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
    if (S.stamina < useCost('can')) { toastMsg('体力不够'); return; }
    S.stamina -= useCost('can'); c.wetted = true; S.stats.watered++;
    puff(t.tx * TILE + 8, t.ty * TILE + 8, '#7fd0ff', 7); beep(660, .07);
    return;
  }
  if (tool === 'axe' && tt === T.TREE) {
    if (S.stamina < useCost('axe')) { toastMsg('体力不够'); return; }
    S.stamina -= useCost('axe'); map[t.ty][t.tx] = T.GRASS;
    bagAdd('wood', 2); puff(t.tx * TILE + 8, t.ty * TILE + 8, '#6b4a2a', 10);
    toastMsg('获得木材 x2'); bakeMap(); beep(200, .12);
    return;
  }
  if (tool === 'pick' && tt === T.ROCK) {
    if (S.stamina < useCost('pick')) { toastMsg('体力不够'); return; }
    S.stamina -= useCost('pick'); map[t.ty][t.tx] = T.GRASS;
    bagAdd('stone', 2); puff(t.tx * TILE + 8, t.ty * TILE + 8, '#b0b6bb', 10);
    toastMsg('获得石头 x2'); bakeMap(); beep(160, .14);
    return;
  }
  if (tool === 'hand') {
    if (t.type === 'crop' && c) {
      const n = 1 + (Math.random() < 0.35 ? 1 : 0);
      bagAdd(c.id, n);
      S.stats.harvest += n;
      const back = (Math.random() < 0.3 ? 1 : 0);
      if (back) seedAdd(c.id, back);
      cropMap[t.ty][t.tx] = null;
      S.stamina -= useCost('harvest');
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
      S.stamina -= useCost('harvest');
      puff(t.tx * TILE + 8, t.ty * TILE + 8, '#c9a86a', 6); beep(520, .08);
      return;
    }
    if (tt === T.DOOR) { sleepTick(); return; }
  }
  toastMsg('这里没什么可做的');
}

/* ======================= 睡觉 / 新的一天 ======================= */
let lastWither = [];
function sleepTick() {
  if (modal) return;
  modal = { type: 'sleep' };
  beep(300, .1);
}
function nextDay() {
  const grown = [];
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    const c = cropMap[ty][tx];
    if (!c) continue;
    const crop = CROP_MAP[c.id];
    if (c.stage >= 4) continue;                        // 已成熟，等收获
    if (crop.season !== curSeason()) { cropMap[ty][tx] = null; grown.push('枯萎' + crop.name); continue; }
    if (c.wetted) { c.stage = Math.min(4, c.stage + 1); c.wetted = false; }
  }
  lastWither = grown;
  animals.forEach(function (a) { if (a.owned) a.have = true; });
  S.day++;
  if (S.day > SEASON_DAYS) { S.day = 1; S.season++; if (S.season > 3) { S.season = 0; S.year++; } }
  S.staminaMax = Math.min(140, 100 + Math.floor((S.year - 1) * 32 + (S.season * 8 + S.day)) * 0.6);
  S.stamina = S.staminaMax;
  S.hour = 6; S.minute = 0;
  S.stats.days++;
  bakeMap();
  modal = { type: 'dayend', info: grown };
  saveGame();
}
function closeDayEnd() {
  modal = null;
  toastMsg(curSeason() + '季 第' + S.day + '天');
  saveGame();
}
