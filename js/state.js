/* ==========================================================
 * state.js — 游戏状态、地图生成、槽位存档读写
 * ========================================================== */
'use strict';

let S = null;            // 存档状态
let map = [];            // 地图瓦片
let cropMap = [];        // 作物 {id, stage, wetted}
let animals = [];        // 动物
let cam = { x: 0, y: 0 };
let player = { x: 0, y: 0, vx: 0, vy: 0, dir: 2, anim: 0, moving: false };
let tool = 'hoe';        // hoe 锄头 / can 水壶 / hand 双手 / axe 斧 / pick 镐
let curSlot = 1;         // 当前所在槽位

/* ======================= 新游戏 / 地图生成 ======================= */
function newGame(seed, slot) {
  const rng = mkRng(seed || 12345);
  map = []; cropMap = [];
  for (let y = 0; y < MAP_H; y++) {
    const mrow = [], crow = new Array(MAP_W).fill(null);
    for (let x = 0; x < MAP_W; x++) mrow.push(T.GRASS);
    map.push(mrow); cropMap.push(crow);
  }
  buildMap(rng);
  animals = makeAnimals();

  S = {
    seed: seed || 12345,
    slot: slot || 1,
    year: 1, season: 0, day: 1, hour: 6, minute: 0,
    gold: 500, stamina: 100, staminaMax: 100,
    bag: [], seedBag: [], seedChoice: null,
    stats: { harvest: 0, earned: 0, days: 1, watered: 0 }
  };
  return S;
}

function buildMap(rng) {
  // ── 屋子（上方中央）
  for (let y = 4; y <= 9; y++) for (let x = 11; x <= 19; x++) map[y][x] = T.WALL;
  for (let y = 4; y <= 9; y++) { map[y][10] = T.WALL; map[y][20] = T.WALL; }
  map[7][14] = T.DOOR; map[7][15] = T.DOOR; map[7][16] = T.DOOR;
  for (let y = 10; y <= 12; y++) { map[y][14] = T.PATH; map[y][15] = T.PATH; map[y][16] = T.PATH; }
  // ── 农田（左中大片耕地）
  for (let y = 13; y <= 24; y++) for (let x = 2; x <= 12; x++) if (map[y][x] === T.GRASS) map[y][x] = T.DIRT;
  for (let x = 2; x <= 12; x++) map[25][x] = T.ROAD;
  // ── 小溪（右）与木桥
  for (let y = 2; y <= 27; y++) { map[y][26] = T.WATER; map[y][27] = T.WATER; }
  map[17][26] = T.ROAD; map[17][27] = T.ROAD; map[18][26] = T.ROAD; map[18][27] = T.ROAD;
  // ── 牧场围栏
  for (let y = 3; y <= 27; y++) {
    if (map[y][29] === T.GRASS) map[y][29] = T.FENCE;
    if (map[y][31] === T.GRASS) map[y][31] = T.FENCE;
  }
  map[3][30] = T.FENCE; map[27][30] = T.FENCE;
  // ── 商店（右下）
  for (let y = 20; y <= 23; y++) for (let x = 21; x <= 24; x++) map[y][x] = T.WALL;
  map[21][21] = T.DOOR; map[21][22] = T.DOOR;
  for (let x = 21; x <= 24; x++) map[24][x] = T.ROAD;
  map[23][22] = T.SHOP; map[23][23] = T.SHOP; map[24][22] = T.SHOP;
  // ── 树 & 石头
  for (let i = 0; i < 95; i++) {
    const x = rndInt(rng, 1, MAP_W - 2), y = rndInt(rng, 1, MAP_H - 2);
    if (map[y][x] !== T.GRASS) continue;
    if (x >= 2 && x <= 13 && y >= 12 && y <= 27) continue;      // 农田周边留空
    if (x >= 10 && x <= 20 && y <= 13) continue;                // 屋前通道留空
    if (x >= 21 && x <= 25 && y >= 18 && y <= 27) continue;     // 商店前留空
    if (x >= 28 && y <= 27) continue;                           // 牧场留空
    map[y][x] = rng() < 0.82 ? T.TREE : T.ROCK;
  }
  // 农田四周插树做边界
  for (let y = 13; y <= 24; y++) { if (map[y][1] === T.GRASS) map[y][1] = T.TREE; }
  for (let x = 2; x <= 12; x++) { if (map[26][x] === T.GRASS) map[26][x] = T.TREE; }
}

function makeAnimals() {
  return [
    { kind: 'chicken', x: 30.2, y: 6.5,  name: '小鸡', product: 'egg',   col: '#f8f3e8', have: false },
    { kind: 'chicken', x: 30.8, y: 10.5, name: '小鸡', product: 'egg',   col: '#f2ece0', have: false },
    { kind: 'cow',     x: 30.2, y: 16.5, name: '奶牛', product: 'milk',  col: '#f0e7d8', have: false },
    { kind: 'cow',     x: 30.8, y: 21.5, name: '奶牛', product: 'milk',  col: '#e6dccb', have: false },
    { kind: 'sheep',   x: 30.2, y: 25.5, name: '绵羊', product: 'wool',  col: '#fbf7ef', have: false }
  ];
}

/* 出生点：屋子门前 */
function spawnPlayer() {
  player.x = 15.5 * TILE; player.y = 11.6 * TILE; player.dir = 2;
  player.moving = false; player.anim = 0;
  cam.x = 0; cam.y = 0;
}

/* ======================= 存档读写 ======================= */
function packSave() {
  return {
    v: 2,
    slot: curSlot,
    at: Date.now(),
    s: S,
    p: { x: player.x, y: player.y, dir: player.dir },
    map: map, cropMap: cropMap, animals: animals
  };
}
function saveGame() {
  if (!S) return;
  Save.write(curSlot, packSave());
}
function loadSave(slot) {
  const d = Save.read(slot);
  if (!d || !d.s) return false;
  S = d.s; map = d.map || []; cropMap = d.cropMap || [];
  animals = d.animals || animals;
  curSlot = d.slot || slot;
  if (d.p) { player.x = d.p.x; player.y = d.p.y; player.dir = d.p.dir || 2; }
  return true;
}
function deleteSave(slot) {
  Save.remove(slot);
}
function hasSaveNow() { return Save.hasSave(); }
