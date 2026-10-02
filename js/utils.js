/* ==========================================================
 * utils.js — 通用小工具、提示条、粒子
 * ========================================================== */
'use strict';

/* 确定性随机数（mulberry32） */
function mkRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function rndInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }

/* 稳定的格子哈希，用于贴图细节 */
function hash2(x, y) {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >> 13)) * 5;
  return ((h ^ (h >> 7)) >>> 0);
}

/* ---- 提示条 ---- */
let toast = { msg: '', t: 0 };
function toastMsg(m) { toast = { msg: m, t: 2.2 }; }

/* ---- 粒子 ---- */
let dust = [];
function puff(x, y, col, n) {
  for (let i = 0; i < (n || 6); i++) {
    dust.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 1.4,
      vy: -Math.random() * 1.4 - 0.3,
      life: 0.6, col: col || '#fff'
    });
  }
}
function updateDust(dt) {
  for (const p of dust) { p.life -= dt; p.x += p.vx; p.y += p.vy; p.vy += 0.02; }
  dust = dust.filter(p => p.life > 0);
}

/* ---- 格式化 ---- */
function fmtGold(n) { return '¥ ' + n; }
function fmtClock(hour) {
  const h = Math.floor(hour), m = Math.floor((hour % 1) * 60);
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}
function fmtWhen(ts) {
  const d = new Date(ts);
  const p = n => (n < 10 ? '0' : '') + n;
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
