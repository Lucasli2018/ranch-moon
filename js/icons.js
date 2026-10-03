/* ==========================================================
 * icons.js — 程序化像素 UI 图标（16×16 离屏 canvas，硬边放大）
 * 零网络请求、零素材体积；图标表在下，改样式只需改这里
 * ========================================================== */
'use strict';

const ICON_PX = 16;
const ICON_CV = document.createElement('canvas');
ICON_CV.width = ICON_PX; ICON_CV.height = ICON_PX;
const ICON_G = ICON_CV.getContext('2d');

/* 逐行画圆（比 arc 更像素风） */
function idisc(g, cx, cy, r, c) {
  cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
  for (let dy = -r; dy <= r; dy++) {
    const h = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
    g.fillStyle = c;
    g.fillRect(cx - h, cy + dy, h * 2 + 1, 1);
  }
}

const ICONS = {
  /* ---------------- 信息栏 ---------------- */
  cal: function (g) {                                   // 日历
    g.fillStyle = '#f2ecd8'; g.fillRect(2, 2, 12, 12);
    g.fillStyle = '#d96b4a'; g.fillRect(2, 2, 12, 4);
    g.fillStyle = '#7c848c'; g.fillRect(4, 0, 2, 3); g.fillRect(10, 0, 2, 3);
    g.fillStyle = '#cfc7ad'; g.fillRect(4, 7, 8, 7);
    g.fillStyle = '#9aa08c'; g.fillRect(4, 8, 8, 1); g.fillRect(4, 10, 8, 1); g.fillRect(4, 12, 5, 1);
  },
  clock: function (g) {                                 // 时钟
    idisc(g, 8, 8, 7, '#41505e'); idisc(g, 8, 8, 6, '#eaf1ff');
    g.fillStyle = '#2c3a46';
    g.fillRect(7, 4, 2, 5); g.fillRect(5, 7, 6, 2); g.fillRect(7, 7, 2, 2);
  },
  coin: function (g) {                                  // 金币
    idisc(g, 8, 8, 7, '#c9962c'); idisc(g, 8, 8, 6, '#ffd24a'); idisc(g, 8, 8, 4, '#ffe9a8');
    g.fillStyle = '#a8761f';
    g.fillRect(6, 5, 4, 2); g.fillRect(6, 9, 4, 2); g.fillRect(7, 5, 2, 7);
  },
  heart: function (g) {                                 // 体力
    idisc(g, 6, 6, 3, '#e8604a'); idisc(g, 10, 6, 3, '#e8604a');
    g.fillStyle = '#e8604a'; g.fillRect(5, 7, 6, 5); g.fillRect(6, 12, 4, 1);
    g.fillStyle = '#ff9a86'; g.fillRect(5, 6, 2, 2);
  },
  moon: function (g) {                                  // 弯月（睡觉/夜晚）
    idisc(g, 7, 8, 6, '#ffe9a8');
    g.save(); g.globalCompositeOperation = 'destination-out';
    idisc(g, 10, 5, 5, '#000');
    g.restore();
    idisc(g, 5, 11, 1, '#e8c96a');
  },
  sun: function (g) {                                   // 太阳（白天）
    idisc(g, 8, 8, 4, '#ffd24a');
    g.fillStyle = '#ffd24a';
    g.fillRect(7, 1, 2, 3); g.fillRect(7, 12, 2, 3); g.fillRect(1, 7, 3, 2); g.fillRect(12, 7, 3, 2);
    g.fillRect(3, 3, 2, 2); g.fillRect(11, 11, 2, 2); g.fillRect(11, 3, 2, 2); g.fillRect(3, 11, 2, 2);
    idisc(g, 8, 8, 2, '#fff3b0');
  },
  star: function (g) {
    g.fillStyle = '#ffd24a'; g.fillRect(7, 2, 2, 12); g.fillRect(2, 7, 12, 2);
    g.fillStyle = '#fff3b0'; g.fillRect(6, 6, 4, 4);
  },
  drop: function (g) {                                  // 水滴（浇水/体力条）
    g.fillStyle = '#5fc4e8';
    for (let i = 0; i < 4; i++) g.fillRect(8 - i - 1, 2 + i, (i + 1) * 2, 1);
    idisc(g, 8, 10, 5, '#5fc4e8');
    g.fillStyle = '#bfeaff'; g.fillRect(6, 8, 2, 3);
  },

  /* ---------------- 功能键 ---------------- */
  shop: function (g) {                                  // 杂货摊
    g.fillStyle = '#d96b4a'; g.fillRect(1, 3, 14, 5);
    g.fillStyle = '#f2ecd8'; g.fillRect(1, 8, 14, 1);
    g.fillStyle = '#ffd24a'; g.fillRect(12, 0, 3, 4);
    g.fillStyle = '#c2b08a'; g.fillRect(3, 9, 2, 5); g.fillRect(11, 9, 2, 5);
    g.fillStyle = '#a8875a'; g.fillRect(1, 11, 14, 3);
    g.fillStyle = '#e6d9b4'; g.fillRect(1, 11, 14, 1);
    g.fillStyle = '#e0873a'; g.fillRect(6, 10, 3, 3);
  },
  sack: function (g) {                                  // 种子袋
    g.fillStyle = '#c9a86a'; g.fillRect(4, 5, 8, 9);
    g.fillStyle = '#a8875a'; g.fillRect(4, 5, 8, 1);
    g.fillStyle = '#8a6a3e'; g.fillRect(3, 3, 10, 2);
    g.fillStyle = '#e6d9b4'; g.fillRect(6, 7, 4, 4);
    g.fillStyle = '#6f9a4a'; g.fillRect(6, 12, 4, 1);
  },
  barn: function (g) {                                  // 谷仓（牧场页签）
    g.fillStyle = '#8c2f22'; g.fillRect(3, 3, 10, 3); g.fillRect(4, 2, 8, 1);
    g.fillStyle = '#b3452f'; g.fillRect(4, 6, 8, 8);
    g.fillStyle = '#6d3a24'; g.fillRect(6, 9, 4, 5);
    g.fillStyle = '#c2b08a'; g.fillRect(7, 9, 1, 5);
    g.fillStyle = '#ffd24a'; g.fillRect(5, 7, 2, 2);
  },
  bag: function (g) {                                   // 背包
    g.fillStyle = '#8a5a30'; g.fillRect(4, 6, 8, 8);
    g.fillStyle = '#6f4a2c'; g.fillRect(3, 4, 10, 3);
    g.fillStyle = '#a87543'; g.fillRect(4, 6, 3, 3);
    g.fillStyle = '#ffd24a'; g.fillRect(7, 4, 2, 3);
    g.fillStyle = '#c2b08a'; g.fillRect(5, 1, 1, 4); g.fillRect(10, 1, 1, 4);
  },
  menu: function (g) {
    g.fillStyle = '#dfe8d0'; g.fillRect(3, 4, 10, 2); g.fillRect(3, 7, 10, 2); g.fillRect(4, 10, 8, 2);
    g.fillStyle = '#fff8e0'; g.fillRect(3, 4, 10, 1); g.fillRect(3, 7, 10, 1); g.fillRect(4, 10, 8, 1);
  },

  /* ---------------- 弹窗按钮 ---------------- */
  play: function (g) {                                  // 播放三角（继续游戏）
    g.fillStyle = '#e8e0c0';
    for (let i = 0; i < 5; i++) g.fillRect(5 + i, 3 + i, 2, 10 - i * 2);
  },
  save: function (g) {                                  // 软盘
    g.fillStyle = '#8a9296'; g.fillRect(2, 3, 12, 11);
    g.fillStyle = '#5e6468'; g.fillRect(6, 3, 4, 5); g.fillRect(4, 9, 8, 5);
    g.fillStyle = '#c8d0d4'; g.fillRect(6, 2, 4, 2); g.fillRect(5, 10, 6, 3);
  },
  info: function (g) {                                  // 说明书
    g.fillStyle = '#e8dfc0'; g.fillRect(3, 2, 10, 12);
    g.fillStyle = '#8a6a3e'; g.fillRect(3, 2, 3, 12);
    g.fillStyle = '#9aa08c'; g.fillRect(8, 5, 4, 1); g.fillRect(8, 8, 4, 1); g.fillRect(8, 11, 4, 1);
  },
  gear: function (g) {
    g.fillStyle = '#9aa4ac';
    g.fillRect(6, 1, 4, 3); g.fillRect(6, 12, 4, 3); g.fillRect(1, 6, 3, 4); g.fillRect(12, 6, 3, 4);
    g.fillStyle = '#c2ccd4'; g.fillRect(4, 4, 8, 8);
    idisc(g, 8, 8, 3, '#5a6470');
  },
  exit: function (g) {                                  // 返回标题（门）
    g.fillStyle = '#8a5a30'; g.fillRect(2, 4, 12, 8);
    g.fillStyle = '#3a2a1a'; g.fillRect(3, 6, 10, 6);
    g.fillStyle = '#ffd24a'; g.fillRect(9, 8, 2, 2);
  },
  reset: function (g) {                                 // 重开（循环箭头）
    g.fillStyle = '#dfe8d0';
    g.fillRect(2, 4, 9, 2); g.fillRect(2, 10, 9, 2); g.fillRect(3, 6, 1, 4); g.fillRect(8, 6, 1, 4);
    g.fillStyle = '#ffd24a'; g.fillRect(10, 2, 3, 6);
  },
  sfx: function (g) {                                   // 喇叭
    g.fillStyle = '#dfe8d0'; g.fillRect(2, 6, 3, 4); g.fillRect(5, 4, 2, 8);
    g.fillStyle = '#e8e0c0'; g.fillRect(7, 3, 3, 3); g.fillRect(7, 10, 3, 3); g.fillRect(10, 6, 2, 4);
  },
  music: function (g) {
    g.fillStyle = '#e8e0c0'; g.fillRect(5, 3, 2, 8); g.fillRect(9, 5, 2, 6);
    g.fillRect(4, 10, 8, 2); g.fillStyle = '#c2b08a'; g.fillRect(7, 3, 1, 9);
  },
  grid: function (g) {
    g.fillStyle = '#dfe8d0'; g.fillRect(2, 2, 12, 12);
    g.fillStyle = '#3f5a3a';
    g.fillRect(6, 2, 1, 12); g.fillRect(10, 2, 1, 12); g.fillRect(2, 6, 12, 1); g.fillRect(2, 10, 12, 1);
  },
  tap: function (g) {                                   // 点地自动走
    g.fillStyle = '#e8e0c0'; g.fillRect(6, 2, 4, 6); g.fillRect(5, 8, 6, 3);
    g.fillStyle = '#c2b08a'; g.fillRect(4, 11, 8, 3);
  },
  house: function (g) {
    g.fillStyle = '#b3452f'; g.fillRect(3, 4, 10, 3); g.fillRect(4, 3, 8, 1);
    g.fillStyle = '#e8d8b0'; g.fillRect(4, 7, 8, 7);
    g.fillStyle = '#8a5a30'; g.fillRect(6, 10, 4, 4);
    g.fillStyle = '#ffd24a'; g.fillRect(5, 8, 2, 2);
  },

  /* ---------------- v1.7.0 新增 ---------------- */
  fish: function (g) {                                  // 鱼（鱼群过境 / 图鉴）
    g.fillStyle = '#5f9fb8';
    g.fillRect(4, 6, 8, 5); g.fillRect(3, 7, 2, 3);
    g.fillStyle = '#e6a8a0'; g.fillRect(5, 9, 6, 1);
    g.fillStyle = '#3f7a92'; g.fillRect(1, 7, 3, 3); g.fillRect(2, 6, 1, 1);
    g.fillStyle = '#eaf4ff'; g.fillRect(10, 7, 2, 2);
  },
  rod: function (g) {                                   // 钓竿
    g.fillStyle = '#e8e0c0';
    for (let i = 0; i < 7; i++) g.fillRect(12 - i, 2 + i, 1, 1);
    g.fillStyle = '#8a5a30'; g.fillRect(3, 12, 8, 2); g.fillRect(3, 9, 2, 4);
    g.fillStyle = '#e8604a'; g.fillRect(3, 8, 2, 2);
  },
  trophy: function (g) {                                // 奖杯（农场档案）
    g.fillStyle = '#e8c96a'; g.fillRect(4, 3, 8, 6); g.fillRect(5, 2, 6, 1);
    g.fillStyle = '#c9962c'; g.fillRect(5, 8, 6, 1); g.fillRect(4, 12, 8, 2);
    g.fillStyle = '#e8c96a'; g.fillRect(7, 9, 2, 3);
    g.fillStyle = '#c9962c'; g.fillRect(2, 4, 2, 2); g.fillRect(12, 4, 2, 2);
  },
  ledger: function (g) {                                // 账本（统计 / 当日收支）
    g.fillStyle = '#8a5a30'; g.fillRect(2, 2, 12, 12);
    g.fillStyle = '#f2ecd8'; g.fillRect(3, 3, 10, 10);
    g.fillStyle = '#9aa08c';
    g.fillRect(5, 5, 6, 1); g.fillRect(5, 7, 6, 1); g.fillRect(5, 9, 3, 1);
    g.fillStyle = '#6fbf5a'; g.fillRect(10, 9, 2, 3);
    g.fillStyle = '#d96a4a'; g.fillRect(5, 10, 2, 2);
  }
};

/* 在 (cx,cy) 画边长 s 的像素图标；返回 false 表示没有这个图标 */
function drawIcon(id, cx, cy, s) {
  const fn = ICONS[id];
  if (!fn) return false;
  ICON_G.setTransform(1, 0, 0, 1, 0, 0);
  ICON_G.globalCompositeOperation = 'source-over';
  ICON_G.clearRect(0, 0, ICON_PX, ICON_PX);
  fn(ICON_G);
  s = Math.round(s || 16);
  const x = Math.round(cx - s / 2), y = Math.round(cy - s / 2);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ICON_CV, x, y, s, s);
  ctx.imageSmoothingEnabled = true;
  return true;
}
