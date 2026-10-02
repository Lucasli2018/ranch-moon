/* ==========================================================
 * state.js — 游戏状态、多场景地图生成、槽位存档读写
 * 场景：farm 农场（屋子/农田/商店）→ pasture 牧场（动物/谷仓）→ forest 森林（采集）
 * ========================================================== */
'use strict';

let S = null;            // 存档状态
let SCENES = {};         // sceneKey -> { map, cropMap, animals }
let sceneKey = 'farm';
let map = [];            // 当前场景地图瓦片（引用 SCENES[sceneKey].map）
let cropMap = [];        // 当前场景作物
let animals = [];        // 当前场景动物
let npcs = [];           // 当前场景 NPC
let cam = { x: 0, y: 0 };
let player = { x: 0, y: 0, vx: 0, vy: 0, dir: 2, anim: 0, moving: false };
let tool = 'hoe';        // hoe 锄头 / can 水壶 / hand 双手 / axe 斧 / pick 镐
let curSlot = 1;         // 当前所在槽位

function blankGrid(fill) {
  const g = [];
  for (let y = 0; y < MAP_H; y++) g.push(new Array(MAP_W).fill(fill));
  return g;
}

/* ======================= 场景生成 ======================= */
/* —— 农场：屋子 + 农田 + 商店 + 溪流，东侧通牧场 —— */
function buildFarm() {
  const rng = mkRng((S ? S.seed : 12345) + 1);
  map = blankGrid(T.GRASS);
  cropMap = blankGrid(null);
  // 屋子（上方中央），图片锚点 HOUSE 在 (11,4)，占 y4..9（8x6 格）
  for (let y = 4; y <= 9; y++) for (let x = 11; x <= 18; x++) map[y][x] = T.WALL;
  map[9][14] = T.DOOR; map[9][15] = T.DOOR; map[9][16] = T.DOOR;
  map[4][11] = T.HOUSE;
  for (let y = 10; y <= 12; y++) { map[y][14] = T.PATH; map[y][15] = T.PATH; map[y][16] = T.PATH; }
  // 屋前主路一直通到商店
  for (let y = 13; y <= 24; y++) { map[y][15] = T.PATH; map[y][16] = T.PATH; }
  // 农田（左中大片耕地）
  for (let y = 13; y <= 24; y++) for (let x = 2; x <= 12; x++) if (map[y][x] === T.GRASS) map[y][x] = T.DIRT;
  for (let x = 2; x <= 14; x++) map[25][x] = T.ROAD;
  for (let x = 14; x <= 25; x++) map[25][x] = T.ROAD;
  // 溪流（右侧，上下两段，中间让出东出口走道）
  for (let y = 2; y <= 12; y++) { map[y][26] = T.WATER; map[y][27] = T.WATER; }
  for (let y = 19; y <= 27; y++) { map[y][26] = T.WATER; map[y][27] = T.WATER; }
  // 商店（右下）：图片锚点 BSHOP 在 (20,18)，占 y19..23
  for (let y = 19; y <= 23; y++) for (let x = 20; x <= 25; x++) map[y][x] = T.WALL;
  map[18][20] = T.BSHOP;
  map[23][22] = T.DOOR; map[23][23] = T.DOOR;
  map[24][22] = T.SHOP; map[24][23] = T.SHOP;   // 柜台（门口前，按「使用」交易）
  for (let x = 14; x <= 25; x++) map[24][x] = map[24][x] === T.SHOP ? T.SHOP : T.ROAD;
  // 东出口 → 牧场
  for (let y = 14; y <= 17; y++) for (let x = 28; x <= MAP_W - 1; x++) map[y][x] = T.ROAD;
  // 树 & 石头
  for (let i = 0; i < 70; i++) {
    const x = rndInt(rng, 1, MAP_W - 2), y = rndInt(rng, 1, MAP_H - 2);
    if (map[y][x] !== T.GRASS) continue;
    if (x >= 1 && x <= 14 && y >= 12 && y <= 26) continue;   // 农田周边留空
    if (x >= 13 && x <= 21 && y <= 13) continue;             // 屋前通道留空
    if (x >= 19 && x <= 26 && y >= 17 && y <= 26) continue;  // 商店前留空
    if (x >= 27 && y >= 13 && y <= 18) continue;             // 东出口走道留空
    map[y][x] = rng() < 0.8 ? T.TREE : T.ROCK;
  }
  // 农田四周插树做边界
  for (let y = 13; y <= 24; y++) { if (map[y][1] === T.GRASS) map[y][1] = T.TREE; }
  for (let x = 2; x <= 14; x++) { if (map[26][x] === T.GRASS) map[26][x] = T.TREE; }
  // 出口路牌
  map[13][29] = T.SIGN;
  SCENES.farm = { map: map, cropMap: cropMap, animals: [], npcs: [makeNpc('keeper', 20.5, 25.5)] };
}

/* —— 牧场：谷仓 + 围栏动物区，西通农场、东通森林 —— */
function buildPasture() {
  const rng = mkRng((S ? S.seed : 12345) + 2);
  const m = blankGrid(T.GRASS);
  const cm = blankGrid(null);
  // 谷仓（左上），图片锚点 BARN 在 (4,3)，占 y4..8
  for (let y = 4; y <= 8; y++) for (let x = 4; x <= 9; x++) m[y][x] = T.WALL;
  m[3][4] = T.BARN;
  m[8][6] = T.DOOR; m[8][7] = T.DOOR;
  for (let y = 9; y <= 13; y++) { m[y][6] = T.PATH; m[y][7] = T.PATH; }
  // 围栏动物区：x17..30 / y3..28，西边 y14..17 开口，东边 y14..17 开口
  for (let y = 3; y <= 28; y++) {
    if (y < 14 || y > 17) { if (m[y][17] === T.GRASS) m[y][17] = T.FENCE; }
    if (y < 14 || y > 17) { if (m[y][30] === T.GRASS) m[y][30] = T.FENCE; }
  }
  for (let x = 17; x <= 30; x++) {
    if (m[3][x] === T.GRASS) m[3][x] = T.FENCE;
    if (m[28][x] === T.GRASS) m[28][x] = T.FENCE;
  }
  // 出口走道
  for (let y = 14; y <= 17; y++) for (let x = 0; x <= 16; x++) m[y][x] = T.ROAD;
  for (let y = 14; y <= 17; y++) for (let x = 18; x <= MAP_W - 1; x++) m[y][x] = T.ROAD;
  // 围栏里铺点土路
  for (let x = 19; x <= 29; x++) m[16][x] = T.PATH;
  // 散树
  for (let i = 0; i < 24; i++) {
    const x = rndInt(rng, 1, 14), y = rndInt(rng, 1, MAP_H - 2);
    if (m[y][x] === T.GRASS && (y < 13 || y > 18)) m[y][x] = T.TREE;
  }
  m[12][15] = T.SIGN; m[18][15] = T.SIGN;
  SCENES.pasture = { map: m, cropMap: cm, animals: makeAnimals(), npcs: [makeNpc('farmer', 22, 19.5)] };
}

/* —— 森林：密林 + 湖泊，纯采集区 —— */
function buildForest() {
  const rng = mkRng((S ? S.seed : 12345) + 3);
  const m = blankGrid(T.GRASS);
  const cm = blankGrid(null);
  // 月影湖（右上）
  for (let y = 3; y <= 11; y++) for (let x = 18; x <= 28; x++) {
    const dx = (x - 23) / 5.2, dy = (y - 7) / 4.2;
    if (dx * dx + dy * dy <= 1) m[y][x] = T.WATER;
  }
  // 西出口走道
  for (let y = 14; y <= 17; y++) for (let x = 0; x <= 7; x++) m[y][x] = T.ROAD;
  for (let x = 8; x <= 14; x++) m[15][x] = T.PATH; m[15][8] = T.ROAD; m[15][9] = T.ROAD;
  // 密林
  for (let i = 0; i < 150; i++) {
    const x = rndInt(rng, 1, MAP_W - 2), y = rndInt(rng, 1, MAP_H - 2);
    if (m[y][x] !== T.GRASS) continue;
    if (y >= 13 && y <= 18 && x <= 16) continue;      // 出口走道留空
    m[y][x] = rng() < 0.75 ? T.TREE : T.ROCK;
  }
  m[13][2] = T.SIGN;
  SCENES.forest = { map: m, cropMap: cm, animals: [], npcs: [makeNpc('woodcutter', 4, 13.5)] };
}

/* ======================= NPC ======================= */
const NPC_DEFS = {
  keeper: {
    name: '店长阿花', img: 'npc_keeper',
    lines: [
      ['欢迎光临月光杂货铺！', '柜台在门口，按「使用」就能交易。'],
      ['种子要按季节买哦，', '换季了去年的种子就种不成了。'],
      ['木材和石头我也收，', '价钱写在「卖东西」那一页。']
    ]
  },
  farmer: {
    name: '老约伯', img: 'npc_farmer',
    lines: [
      ['想要鸡牛羊？商店「牧场」页签，', '买下后它们每天都会产东西。'],
      ['动物产的东西要亲手去收，', '走近它按「使用」就行。'],
      ['我的羊脾气可大了，', '每天只肯给你一撮羊毛。']
    ]
  },
  woodcutter: {
    name: '小柯', img: 'npc_woodcutter',
    lines: [
      ['森林里的树和石头随便砍，', '明天又会冒出来。'],
      ['这片湖里的鱼还没做钓鱼竿……', '等下个版本吧。'],
      ['砍树累，记得回屋睡觉。']
    ]
  }
};
function makeNpc(id, x, y) {
  const d = NPC_DEFS[id];
  return { id: id, name: d.name, img: d.img, x: x, y: y };
}

/* ======================= 动物 ======================= */
const ANIMAL_COL = { chicken: '#f8f3e8', cow: '#f0e7d8', sheep: '#fbf7ef' };
/* 牧场围栏里的固定位置（pasture 场景坐标）：买下后才会出现 */
function makeAnimals() {
  return [
    { kind: 'chicken', x: 21.2, y: 6.5,  name: '小鸡', product: 'egg',  owned: false, have: false },
    { kind: 'chicken', x: 24.8, y: 9.5,  name: '小鸡', product: 'egg',  owned: false, have: false },
    { kind: 'cow',     x: 21.2, y: 20.5, name: '奶牛', product: 'milk', owned: false, have: false },
    { kind: 'cow',     x: 25.8, y: 23.5, name: '奶牛', product: 'milk', owned: false, have: false },
    { kind: 'sheep',   x: 27.2, y: 12.5, name: '绵羊', product: 'wool', owned: false, have: false }
  ].map(function (a) { a.col = ANIMAL_COL[a.kind]; return a; });
}

/* ======================= 场景切换 ======================= */
function switchScene(key, sx, sy) {
  if (!SCENES[key] || key === sceneKey) return;
  sceneKey = key;
  const sc = SCENES[key];
  map = sc.map; cropMap = sc.cropMap; animals = sc.animals; npcs = sc.npcs || [];
  player.x = sx * TILE; player.y = sy * TILE;
  player.moving = false; player.dir = (sx < 3) ? 1 : 3;
  cam.x = 0; cam.y = 0;
  bakeMap();
  saveGame();
  toastMsg('— ' + SCENE_NAME[key] + ' —');
  beep(520, .1); beep(700, .09);
}

/* 出生点：屋子门前 */
function spawnPlayer() {
  player.x = 15.5 * TILE; player.y = 11.6 * TILE; player.dir = 2;
  player.moving = false; player.anim = 0;
  cam.x = 0; cam.y = 0;
}

/* ======================= 新游戏 ======================= */
function newGame(seed, slot) {
  S = {
    seed: seed || 12345,
    slot: slot || 1,
    year: 1, season: 0, day: 1, hour: 6, minute: 0,
    gold: 500, stamina: 100, staminaMax: 100,
    bag: [], seedBag: [], seedChoice: null,
    stats: { harvest: 0, earned: 0, days: 1, watered: 0 }
  };
  sceneKey = 'farm';
  buildFarm(); buildPasture(); buildForest();
  const sc = SCENES.farm;
  map = sc.map; cropMap = sc.cropMap; animals = sc.animals; npcs = sc.npcs || [];
  return S;
}

/* ======================= 存档读写 ======================= */
function packSave() {
  const scenes = {};
  for (const k in SCENES) scenes[k] = { map: SCENES[k].map, cropMap: SCENES[k].cropMap, animals: SCENES[k].animals };
  return {
    v: 3,
    slot: curSlot,
    at: Date.now(),
    s: S,
    p: { x: player.x, y: player.y, dir: player.dir, scene: sceneKey },
    scenes: scenes
  };
}
function saveGame() {
  if (!S) return;
  Save.write(curSlot, packSave());
}
function loadSave(slot) {
  const d = Save.read(slot);
  if (!d || !d.s) return false;
  S = d.s;
  curSlot = d.slot || slot;
  sceneKey = (d.p && d.p.scene) || 'farm';
  if (d.scenes && d.scenes.farm) {
    // v3 多场景存档
    for (const k in d.scenes) {
      const sc = d.scenes[k];
      if (!sc || !sc.map) continue;
      sc.animals = sc.animals || [];
      sc.animals.forEach(function (a) {
        if (typeof a.owned !== 'boolean') a.owned = false;
        if (typeof a.have !== 'boolean') a.have = false;
        if (!a.col) a.col = ANIMAL_COL[a.kind] || '#f8f3e8';
        if (!a.product) a.product = (ANIMAL_SHOP[a.kind] || ANIMAL_SHOP.chicken).product;
      });
      SCENES[k] = sc;
    }
    for (const k of SCENE_LIST) if (!SCENES[k]) { buildSceneFallback(k); }
  } else if (d.map) {
    // v2 单场景老存档：农场用旧数据，牧场/森林现生成（老档动物未开放购买，全部视为未拥有）
    SCENES.farm = { map: d.map, cropMap: d.cropMap || blankGrid(null), animals: [], npcs: [makeNpc('keeper', 20.5, 25.5)] };
    buildPasture(); buildForest();
  } else return false;
  const sc = SCENES[sceneKey] || SCENES.farm;
  map = sc.map; cropMap = sc.cropMap; animals = sc.animals; npcs = sc.npcs || [];
  sceneKey = SCENES[sceneKey] ? sceneKey : 'farm';
  if (d.p) { player.x = d.p.x; player.y = d.p.y; player.dir = d.p.dir || 2; }
  // 地图布局可能随版本变化：落点卡在实心里就送回出生点
  if (blockedAt(player.x, player.y)) spawnPlayer();
  return true;
}
function buildSceneFallback(k) {
  if (k === 'pasture') buildPasture();
  else if (k === 'forest') buildForest();
  else buildFarm();
}
function deleteSave(slot) {
  Save.remove(slot);
}
function hasSaveNow() { return Save.hasSave(); }
