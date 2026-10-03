/* ==========================================================
 * config.js — 全局常量与静态数据
 * 月光牧场 Moon Ranch
 * ========================================================== */
'use strict';

let VW = 480, VH = 320;            // 逻辑分辨率（随屏幕自适应）
const HUD_H = 28;                  // 顶部信息栏高度
const CTRL_H = 64;                 // 底部操作区高度
const TILE = 16;                   // 单格像素
const MAP_W = 32, MAP_H = 30;      // 地图格数
const STEP = 1.35;                 // 玩家每帧像素（约 80px/秒）
const HOUR_SEC = 60;               // 现实 60 秒 = 游戏 1 小时（= REAL_SEC_PER_MIN × 60）
const REAL_SEC_PER_MIN = 1;        // 现实 1 秒 = 游戏 1 分钟（一天 22 小时 ≈ 22 分钟真实时间）
const DAY_HOURS = 22;              // 每天到 22 点强制结束
const SEASON_DAYS = 8;             // 每季 8 天

const cv = document.getElementById('cv');
let ctx = cv.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

/* 整数倍缩放：保证像素锐利 + 中文清晰 */
let SCALE = 3;

/* ======================= 瓦片定义 ======================= */
const T = {
  GRASS: 0, DIRT: 1, FARM: 2, WATER: 3, TREE: 4, ROCK: 5,
  WALL: 6, FLOOR: 7, ROAD: 8, FENCE: 9, PATH: 10, SHOP: 11, DOOR: 12,
  HOUSE: 13, BSHOP: 14, BARN: 15, SIGN: 16   // 建筑锚点 / 路牌（非固体）
};
const SOLID = new Set([T.WALL, T.WATER, T.TREE, T.ROCK, T.SHOP, T.FENCE]);

/* ======================= 场景 ======================= */
/* 多场景地图：每个场景独立 map/cropMap/animals，边缘出口互相切换 */
const SCENE_LIST = ['farm', 'pasture', 'forest'];
const SCENE_NAME = { farm: '月光农场', pasture: '向阳牧场', forest: '月影森林' };
/* 出口：走到场景边缘这些格子触发切换 [scene, x范围或y范围, 目标spawn] */
const EXITS = {
  farm:    [{ edge: 'E', y0: 14, y1: 17, to: 'pasture', sx: 2.5, sy: 15.5 }],
  pasture: [{ edge: 'W', y0: 14, y1: 17, to: 'farm', sx: 29.5, sy: 15.5 },
            { edge: 'E', y0: 14, y1: 17, to: 'forest', sx: 2.5, sy: 15.5 }],
  forest:  [{ edge: 'W', y0: 14, y1: 17, to: 'pasture', sx: 29.5, sy: 15.5 }]
};

/* ======================= 作物数据 ======================= */
/* stage: 0 种子土堆 → 1,2,3 生长 → 4 成熟 */
const CROPS = [
  { id: 'radish', name: '芜菁',   season: '春', seed: 30,  sell: 75,  days: 3, col: ['#8b5a2b', '#9c7b4a', '#8fbf5a', '#6aa63f', '#f4ead0'] },
  { id: 'potato', name: '土豆',   season: '春', seed: 40,  sell: 110, days: 4, col: ['#8b5a2b', '#a08456', '#c9a86a', '#b8954f', '#e8d9a8'] },
  { id: 'straw',  name: '草莓',   season: '春', seed: 60,  sell: 180, days: 5, col: ['#8b5a2b', '#9dbf5a', '#7fbf4a', '#5fa832', '#e8556b'] },
  { id: 'tomato', name: '番茄',   season: '夏', seed: 50,  sell: 130, days: 4, col: ['#8b5a2b', '#5f9e37', '#4f8f2c', '#3f7a22', '#e0452f'] },
  { id: 'corn',   name: '玉米',   season: '夏', seed: 70,  sell: 200, days: 5, col: ['#8b5a2b', '#6fae3a', '#5f9a2a', '#4f821f', '#f2c14b'] },
  { id: 'pine',   name: '菠萝',   season: '夏', seed: 90,  sell: 260, days: 6, col: ['#8b5a2b', '#6fae3a', '#5f9a2a', '#4f821f', '#e8c04a'] },
  { id: 'eggp',   name: '茄子',   season: '秋', seed: 60,  sell: 170, days: 5, col: ['#8b5a2b', '#7fae4a', '#6b9c38', '#5a8a2c', '#9a5fc0'] },
  { id: 'cab',    name: '圆白菜', season: '秋', seed: 80,  sell: 210, days: 6, col: ['#8b5a2b', '#8fbf5a', '#7bb04a', '#66993c', '#d8ecc0'] },
  { id: 'pump',   name: '南瓜',   season: '秋', seed: 100, sell: 290, days: 6, col: ['#8b5a2b', '#9cbf4a', '#8aa832', '#7a8f22', '#e08a2a'] },
  { id: 'turnip', name: '冬芜菁', season: '冬', seed: 50,  sell: 140, days: 4, col: ['#8b5a2b', '#9c7b4a', '#9fc46a', '#85ab52', '#e6dcc0'] },
  { id: 'onion',  name: '洋葱',   season: '冬', seed: 70,  sell: 190, days: 5, col: ['#8b5a2b', '#9cbf5a', '#8fb04a', '#7d9c38', '#e8dcc8'] }
];
const CROP_MAP = {}; CROPS.forEach(c => CROP_MAP[c.id] = c);

/* 非作物物品 */
const ITEMS = {
  wood: { name: '木材', price: 15 },
  stone: { name: '石头', price: 15 },
  egg: { name: '鸡蛋', price: 40 },
  milk: { name: '牛奶', price: 80 },
  wool: { name: '羊毛', price: 60 }
};

/* ======================= 牧场动物（可花钱购入，每天产出） ======================= */
/* max = 该种类最多能养几只；买下后每天产出 product，走近按「使用」收取 */
const ANIMAL_SHOP = {
  chicken: { name: '鸡',   price: 500,  product: 'egg',  max: 2, desc: '每天 1 个鸡蛋' },
  cow:     { name: '奶牛', price: 1800, product: 'milk', max: 2, desc: '每天 1 瓶牛奶' },
  sheep:   { name: '绵羊', price: 1200, product: 'wool', max: 1, desc: '每天 1 撮羊毛' }
};

/* ======================= 季节 ======================= */
const SEASONS = ['春', '夏', '秋', '冬'];
const SEASON_TINT = {
  '春': { grass: '#6ab04c', grass2: '#5f9f42', leaf: '#4f8f36' },
  '夏': { grass: '#4fae3a', grass2: '#449c30', leaf: '#3f8a2a' },
  '秋': { grass: '#9fae4c', grass2: '#8f9c3f', leaf: '#c07a2a' },
  '冬': { grass: '#9fb08c', grass2: '#8d9e7a', leaf: '#7f9070' }
};

/* ======================= 工具 ======================= */
const TOOLS = ['hoe', 'can', 'hand', 'axe', 'pick', 'rod'];
const TOOL_NAME = { hoe: '锄头', can: '水壶', hand: '双手', axe: '斧头', pick: '镐子', rod: '钓竿' };
const USE_COST = { hoe: 5, can: 3, axe: 6, pick: 6, harvest: 4, gather: 2, rod: 5 };

/* ======================= 鱼类图鉴 ======================= */
/* rarity: 1 常见 / 2 少见 / 3 稀有（价格与出现率随之为之）
   season: 可钓到的季节，字符串 '全' = 四季
   depth : 要求的离岸纵深（waterDepth = 到最近陆地的 8 邻域距离）。
           实测（配合 rodCastTile 射程 6 格远投）：
             农场溪流 1~2 格宽 → 全程 depth 1，只钓得到 1★ 鲫/鲈
             月影湖   → 岸边 1、朝湖心远投能到 2~3
           所以想要 2★/3★ 必须去月影森林，站在湖边朝湖心方向投。 */
const FISH = [
  { id: 'f_crucian', name: '月光鲫', rarity: 1, season: '全', depth: 0, price: 45, col: '#c8d6d0', belly: '#eef4f0', tail: '#8fa39a', w: 13, h: 7 },
  { id: 'f_perch', name: '林溪鲈', rarity: 1, season: ['春', '夏', '秋'], depth: 1, price: 70, col: '#8fae62', belly: '#dfe8c4', tail: '#6b8a44', w: 14, h: 7 },
  { id: 'f_carp', name: '月影鲤', rarity: 2, season: ['春', '夏'], depth: 2, price: 150, col: '#e0a83a', belly: '#fbe6c0', tail: '#c07a2a', w: 16, h: 8 },
  { id: 'f_trout', name: '虹斑鳟', rarity: 2, season: ['春', '秋', '冬'], depth: 2, price: 185, col: '#5f9fb8', belly: '#e6a8a0', tail: '#3f7a92', w: 15, h: 8 },
  { id: 'f_catfish', name: '夜行鲶', rarity: 2, season: ['夏', '秋'], depth: 2, price: 210, col: '#5a4a3a', belly: '#c8b89a', tail: '#3a2e24', w: 18, h: 8 },
  { id: 'f_pike', name: '湖心梭鱼', rarity: 3, season: ['夏'], depth: 3, price: 380, col: '#4a7a5a', belly: '#d0e0b0', tail: '#2f5a3a', w: 19, h: 8 },
  { id: 'f_glass', name: '琉璃鱼', rarity: 3, season: ['冬'], depth: 3, price: 460, col: '#9fd4e8', belly: '#e8faff', tail: '#6fa8c8', w: 16, h: 7 },
  { id: 'f_moon', name: '月光鱼', rarity: 3, season: '全', depth: 4, price: 900, col: '#f0e0a0', belly: '#fff8d8', tail: '#c9a83a', w: 17, h: 9 }
];
const FISH_MAP = {}; FISH.forEach(f => { FISH_MAP[f.id] = f; });
/* 鱼挂进 ITEMS → itemPrice / itemName / 卖东西面板 / 商店全自动认得，不用改任何调用点 */
FISH.forEach(f => { ITEMS[f.id] = { name: f.name, price: f.price, fish: true }; });

/* ======================= 季节事件 / 节日 ======================= */
/* effect 字段（由 world.js 的 ev() 钩子统一消费，别在别处硬编码）
   seedMul  买种子价格倍率     sellMul  卖价倍率        stamMul  体力消耗倍率
   animalMul 动物价格倍率       bite    必定咬钩         extra    收获额外产出
   noGrow   作物当天不成长 */
const EVENTS = [
  { id: 'e_sow', name: '播种节', season: 0, ico: 'sack', desc: '集市促销，全部种子 8 折', effect: { seedMul: 0.8 } },
  { id: 'e_night', name: '夜市', season: 1, ico: 'shop', desc: '夜市开张，卖出价 +40%', effect: { sellMul: 1.4 } },
  { id: 'e_harvest', name: '丰收祭', season: 2, ico: 'star', desc: '祭典大赏，卖出价 +60%、收获额外 +1', effect: { sellMul: 1.6, extra: 1 } },
  { id: 'e_stove', name: '暖炉市', season: 3, ico: 'house', desc: '炉火全天不熄，体力消耗减半', effect: { stamMul: 0.5 } },
  { id: 'e_carnival', name: '动物嘉年华', season: -1, ico: 'barn', desc: '幼崽展销，动物一律 5 折', effect: { animalMul: 0.5 } },
  { id: 'e_bite', name: '鱼群过境', season: -1, ico: 'fish', desc: '湖面炸开，抛竿必定咬钩', effect: { bite: 1 } },
  { id: 'e_blight', name: '阴雨连绵', season: -1, ico: 'drop', desc: '雨水泡了根，今天作物停止生长', effect: { noGrow: 1 } }
];
const EVENT_MAP = {}; EVENTS.forEach(e => { EVENT_MAP[e.id] = e; });
/* 季节主事件：每季第一天必出，给玩家一个节奏点 */
const SEASON_EVENT = { 0: 'e_sow', 1: 'e_night', 2: 'e_harvest', 3: 'e_stove' };
/* 随机事件池：其余日子 30% 概率撞上（不出季节专属，避免和主事件撞车） */
const RANDOM_EVENTS = ['e_carnival', 'e_bite', 'e_blight'];
