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
const HOUR_SEC = 60;               // 现实 60 秒 = 游戏 1 小时
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
  WALL: 6, FLOOR: 7, ROAD: 8, FENCE: 9, PATH: 10, SHOP: 11, DOOR: 12
};
const SOLID = new Set([T.WALL, T.WATER, T.TREE, T.ROCK, T.SHOP, T.FENCE]);

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

/* ======================= 季节 ======================= */
const SEASONS = ['春', '夏', '秋', '冬'];
const SEASON_TINT = {
  '春': { grass: '#6ab04c', grass2: '#5f9f42', leaf: '#4f8f36' },
  '夏': { grass: '#4fae3a', grass2: '#449c30', leaf: '#3f8a2a' },
  '秋': { grass: '#9fae4c', grass2: '#8f9c3f', leaf: '#c07a2a' },
  '冬': { grass: '#9fb08c', grass2: '#8d9e7a', leaf: '#7f9070' }
};

/* ======================= 工具 ======================= */
const TOOLS = ['hoe', 'can', 'hand', 'axe', 'pick'];
const TOOL_NAME = { hoe: '锄头', can: '水壶', hand: '双手', axe: '斧头', pick: '镐子' };
const USE_COST = { hoe: 5, can: 3, axe: 6, pick: 6, harvest: 4, gather: 2 };
