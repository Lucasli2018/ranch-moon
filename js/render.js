/* ==========================================================
 * render.js — 世界绘制、HUD、操作控件、弹窗
 * ========================================================== */
'use strict';

let frameNo = 0;
let bake = document.createElement('canvas');
let bakeSeason = -1;

function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); }
function panel(w, h) { return { w: w, h: h, x: (VW - w) / 2, y: (VH - h) / 2 }; }

/* ======================= 单格绘制（地面层：不含立体物） ======================= */
const FLAT_TILES = new Set([T.GRASS, T.DIRT, T.FARM, T.WATER, T.ROAD, T.PATH, T.FLOOR]);
function drawTile(tx, ty, sx, sy) {
  const t = map[ty][tx];
  const pal = SEASON_TINT[curSeason()];
  const h = hash2(tx, ty);
  if (t === T.GRASS) {
    ctx.fillStyle = (h & 3) ? pal.grass : pal.grass2;
    ctx.fillRect(sx, sy, TILE, TILE);
    if ((h & 7) === 1) { ctx.fillStyle = pal.leaf; ctx.fillRect(sx + 3, sy + 6, 2, 3); ctx.fillRect(sx + 6, sy + 4, 2, 4); }
  } else if (t === T.DIRT) {
    ctx.fillStyle = (h & 3) ? '#8f6236' : '#87592f';
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#7a4f28'; ctx.fillRect(sx, sy + ((h >> 2) & 3) * 4, TILE, 2);
  } else if (t === T.FARM) {
    ctx.fillStyle = ((tx + ty) % 2 === 0) ? '#7d5631' : '#6f4a28'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(sx, sy, TILE, 1);
    ctx.fillStyle = 'rgba(40,24,10,.35)'; ctx.fillRect(sx, sy + TILE - 1, TILE, 1);
    ctx.fillStyle = 'rgba(48,30,12,.22)';
    ctx.fillRect(sx + 3 + (h & 3), sy + 3, 5, 2);
    ctx.fillRect(sx + 9 + ((h >> 2) & 3), sy + 8, 4, 2);
    if ((h % 3) === 0) ctx.fillRect(sx + 5, sy + 11, 6, 2);
  } else if (t === T.WATER) {
    const w = Math.sin((frameNo * 0.06) + tx * 0.7 + ty * 0.5);
    ctx.fillStyle = w > 0 ? '#3f86d0' : '#3779c0'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#9fd4f5'; ctx.fillRect(sx + ((h & 7)), sy + 4 + ((h >> 2) & 3), 3, 1);
  } else if (t === T.ROAD || t === T.PATH) {
    ctx.fillStyle = (h & 3) ? '#c9b78c' : '#c3b184'; ctx.fillRect(sx, sy, TILE, TILE);
    if ((h & 15) === 3) { ctx.fillStyle = '#b3a174'; ctx.fillRect(sx + 4, sy + 7, 3, 2); }
  } else if (t === T.FLOOR) {
    ctx.fillStyle = '#c9b184'; ctx.fillRect(sx, sy, TILE, TILE);
  } else if (t === T.FENCE) {
    ctx.fillStyle = pal.grass; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#b98b52'; ctx.fillRect(sx + 7, sy + 2, 2, 14);
    ctx.fillStyle = '#a87a44'; ctx.fillRect(sx, sy + 4, 16, 2); ctx.fillRect(sx, sy + 9, 16, 2);
  }
}

/* ======================= 立体物绘制（按 y 行序，前景遮背景） ======================= */
/* 建筑图片锚点尺寸：HOUSE 176x102 @11x6 tiles，SHOP/BARN 96x88 @6x5.5 tiles */
const BUILDINGS = {
  13: { img: 'house', w: 128, h: 96 },
  14: { img: 'shop',  w: 96,  h: 88 },
  15: { img: 'barn',  w: 96,  h: 88 }
};
function drawObj(tx, ty, sx, sy) {
  const t = map[ty][tx];
  const pal = SEASON_TINT[curSeason()];
  const h = hash2(tx, ty);
  if (t === T.WALL) {
    ctx.fillStyle = '#d9c79c'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#00000010'; ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
  } else if (t === T.DOOR) {
    ctx.fillStyle = 'rgba(107,68,35,.55)'; ctx.fillRect(sx + 2, sy + 6, TILE - 4, TILE - 6);
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(sx + 3, sy + 7, TILE - 6, TILE - 8);
  } else if (t === T.SHOP) {
    ctx.fillStyle = '#7a5230'; ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#a5713f'; ctx.fillRect(sx + 1, sy + 1, TILE - 2, 5);
  } else if (t === T.TREE) {
    if (!drawAsset('tree', sx, sy - 2, 16, 18)) {
      ctx.fillStyle = pal.grass; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = '#6b4a2a'; ctx.fillRect(sx + 7 - (h & 1), sy + 9, 3, 7);
      ctx.fillStyle = pal.leaf;
      ctx.fillRect(sx + 2, sy + 2, 12, 8); ctx.fillRect(sx, sy + 4, 16, 6);
    }
  } else if (t === T.ROCK) {
    if (!drawAsset('rock', sx + 1, sy + 3, 14, 12)) {
      ctx.fillStyle = pal.grass; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = '#9aa2a8'; ctx.fillRect(sx + 2, sy + 5, 12, 9);
      ctx.fillStyle = '#b8c0c6'; ctx.fillRect(sx + 4, sy + 3, 7, 6);
    }
  } else if (t === T.SIGN) {
    ctx.fillStyle = '#8a6a3a'; ctx.fillRect(sx + 7, sy + 6, 2, 9);
    ctx.fillStyle = '#c9a86a'; ctx.fillRect(sx + 2, sy + 1, 12, 7);
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 1; ctx.strokeRect(sx + 2.5, sy + 1.5, 11, 6);
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(sx + 4, sy + 3, 8, 1); ctx.fillRect(sx + 4, sy + 5, 6, 1);
  } else if (BUILDINGS[t]) {
    const b = BUILDINGS[t];
    if (!drawAsset(b.img, tx * TILE, ty * TILE, b.w, b.h)) {
      // 兜底：整片建筑区画程序化墙
      ctx.fillStyle = '#e6d6ae'; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = '#b8452f'; ctx.fillRect(sx, sy, TILE, 6);
    }
  }
}

/* ======================= 作物绘制 ======================= */
function drawCrop(tx, ty, sx, sy) {
  const c = cropMap[ty][tx];
  if (!c) return;                 // 刚翻好的地，等播种
  const x = sx + 8, y = sy + 12;
  const crop = CROP_MAP[c.id];
  const st = c.stage;
  const sway = c.wetted ? Math.sin(frameNo * 0.12 + tx) * 1.5 : 0;
  if (st === 0) {
    ctx.fillStyle = '#5e3d1e'; ctx.fillRect(x - 5, y - 1, 10, 3);
    ctx.fillStyle = '#9c7043'; ctx.fillRect(x - 4, y - 4, 8, 3);
    ctx.fillStyle = '#c9a86a'; ctx.fillRect(x - 2, y - 7, 4, 3);
    return;
  }
  const col = crop.col[Math.min(4, st)];
  const size = 4 + st * 2;                       // 6 / 8 / 10 / 12
  ctx.fillStyle = '#4b8c2a'; ctx.fillRect(x - 1 + sway * 0.5, y - size - 2, 2, size + 2);
  ctx.fillStyle = col; ctx.fillRect(x - size / 2 + sway, y - size + 2, size, size);
  if (st >= 2) {
    ctx.fillStyle = '#5fae34';
    ctx.fillRect(x - size / 2 - 2 + sway, y - size + 3, 3, 3); ctx.fillRect(x + size / 2 - 1 + sway, y - size + 3, 3, 3);
  }
  if (st >= 3) {
    ctx.fillStyle = col;
    ctx.fillRect(x - 7 + sway, y - size + 4, 3, 3); ctx.fillRect(x + 4 + sway, y - size + 4, 3, 3);
  }
  if (st >= 4) {
    ctx.fillStyle = '#2f5c1c'; ctx.fillRect(x - 1 + sway * 0.5, y - size - 4, 2, 3);
    ctx.fillStyle = '#ffffff66'; ctx.fillRect(x - size / 2 + 1 + sway, y - size + 3, 2, 2);
    if (c.wetted) {
      ctx.fillStyle = '#7fd0ff'; ctx.fillRect(x + 6, y - size - 8, 3, 4);
      ctx.fillStyle = '#bfeaff'; ctx.fillRect(x + 6, y - size - 7, 3, 1);
    } else {
      const bob = Math.sin(frameNo * 0.09 + tx) * 1.2;
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(x - 1, y - size - 9 + bob, 3, 3);
      ctx.fillStyle = '#fff3c0'; ctx.fillRect(x, y - size - 8 + bob, 1, 1);
    }
  } else if (c.wetted) {
    ctx.fillStyle = '#5fb0e8'; ctx.fillRect(x + 6, y - size - 3, 2, 3);
  }
}

/* ======================= 动物绘制 ======================= */
const ANIMAL_IMG = { chicken: 'an_chicken', cow: 'an_cow', sheep: 'an_sheep' };
const ANIMAL_SIZE = { chicken: [20, 20], cow: [28, 22], sheep: [26, 22] };
function drawAnimal(a) {
  const x = a.x * TILE, y = a.y * TILE;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x - 6, y + 4, 12, 3);
  const sz = ANIMAL_SIZE[a.kind] || [20, 18];
  // 未购买的动物显示为半透明"影子"，提示这里可以买
  ctx.globalAlpha = a.owned ? 1 : 0.28;
  if (!drawAsset(ANIMAL_IMG[a.kind], x - sz[0] / 2, y - sz[1] + 6, sz[0], sz[1])) {
    ctx.fillStyle = a.col; ctx.fillRect(x - 7, y - 7, 14, 11);
  }
  ctx.globalAlpha = 1;
  if (a.have) {
    const bob = Math.sin(frameNo * 0.08 + a.x) * 2;
    ctx.fillStyle = '#fdfdf8'; ctx.fillRect(x - 2, y - 16 + bob, 5, 5);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 2, y - 14 + bob, 5, 1);
  }
}

/* ======================= NPC 绘制 ======================= */
function drawNpc(n) {
  const x = n.x * TILE, y = n.y * TILE;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x - 6, y + 4, 12, 3);
  const bob = Math.sin(frameNo * 0.05 + n.x) > 0.9 ? 1 : 0;   // 偶尔轻晃，像在呼吸
  if (!drawAsset(n.img, x - 8, y - 17 - bob, 16, 18)) {
    ctx.fillStyle = '#c88'; ctx.fillRect(x - 5, y - 12, 10, 12);
    ctx.fillStyle = '#f3c9a0'; ctx.fillRect(x - 4, y - 16, 8, 5);
  }
  // 头顶感叹号提示可对话
  const bob2 = Math.sin(frameNo * 0.09 + n.x) * 1.2;
  ctx.fillStyle = '#ffd24a'; ctx.fillRect(x - 1, y - 24 + bob2, 3, 5);
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 18 + bob2, 3, 2);
}

/* ======================= 玩家绘制 ======================= */
function drawToolInHand(x, top, d) {
  const ox = d === 1 ? 7 : d === 3 ? -7 : 0;
  const oy = d === 0 ? -3 : d === 1 ? 2 : d === 2 ? 4 : 0;
  const px = x + ox, py = top + oy;
  if (tool === 'hoe') { ctx.fillStyle = '#8a5a30'; ctx.fillRect(px - 1, py - 4, 2, 7); ctx.fillStyle = '#b8b0a0'; ctx.fillRect(px - 3, py - 6, 5, 3); }
  else if (tool === 'can') { ctx.fillStyle = '#3f8fc0'; ctx.fillRect(px - 4, py - 3, 7, 6); ctx.fillStyle = '#7fd0ff'; ctx.fillRect(px - 6, py - 1, 3, 2); }
  else if (tool === 'axe') { ctx.fillStyle = '#8a5a30'; ctx.fillRect(px - 1, py - 5, 2, 8); ctx.fillStyle = '#c0c8cc'; ctx.fillRect(px - 4, py - 7, 8, 3); }
  else if (tool === 'pick') { ctx.fillStyle = '#b0b8bd'; ctx.fillRect(px - 4, py - 5, 8, 2); ctx.fillRect(px - 1, py - 3, 2, 8); }
  else { ctx.fillStyle = '#f3c9a0'; ctx.fillRect(px - 2, py - 2, 5, 5); }
}
const PLAYER_IMG = { 0: 'player_up', 1: 'player_right', 2: 'player_down', 3: 'player_left' };
function drawPlayer() {
  const x = Math.round(player.x), y = Math.round(player.y);
  const d = player.dir;
  const bob = player.moving && (Math.floor(frameNo / 6) % 2) ? 1 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x - 6, y - 2, 12, 3);
  // 图片素材 16x18（源 48px，向下取整保持锐利），底部对齐脚部
  if (drawAsset(PLAYER_IMG[d], x - 8, y - 16 + bob, 16, 18)) return;
  const top = y - 14 + bob;
  ctx.fillStyle = '#3c5f8a';
  if (d !== 0) { ctx.fillRect(x - 4, top + 10, 3, 4 - bob); ctx.fillRect(x + 1, top + 10, 3, 4 - bob); }
  else { ctx.fillStyle = '#34507a'; ctx.fillRect(x - 4, top + 11, 8, 3); }
  ctx.fillStyle = '#4f8fc0'; ctx.fillRect(x - 5, top + 3, 10, 8);
  ctx.fillStyle = '#e8e0cc'; ctx.fillRect(x - 4, top + 3, 8, 2);
  ctx.fillStyle = '#f3c9a0'; ctx.fillRect(x - 4, top - 4, 8, 7);
  if (d === 0) { ctx.fillStyle = '#3b2a20'; ctx.fillRect(x - 4, top - 5, 8, 6); }
  else { ctx.fillStyle = '#5a3a24'; ctx.fillRect(x - 4, top - 5, 8, 3); ctx.fillRect(x - 4, top - 4, 8, 1); }
  if (d === 2) { ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x - 2, top - 1, 2, 2); ctx.fillRect(x + 1, top - 1, 2, 2); }
  if (d === 1) { ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x + 2, top - 1, 2, 2); }
  if (d === 3) { ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x - 4, top - 1, 2, 2); }
  if (d === 2) ctx.fillStyle = '#d8452f'; else ctx.fillStyle = '#d8452f';
  if (d === 2) ctx.fillRect(x - 5, top - 6, 10, 2);
  else ctx.fillRect(x - 4 + (d === 1 ? 2 : d === 3 ? -2 : 0), top - 6, 8, 2);
  drawToolInHand(x, top, d);
}

/* ======================= 静态地图烘焙（地面层 + 按行立体物层） ======================= */
function bakeMap() {
  bake.width = MAP_W * TILE; bake.height = MAP_H * TILE;
  if (!S) return;
  const save = ctx; ctx = bake.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const pal = SEASON_TINT[curSeason()];
  ctx.fillStyle = pal.grass; ctx.fillRect(0, 0, bake.width, bake.height);
  // 1) 地面层
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++)
    drawTile(tx, ty, tx * TILE, ty * TILE);
  // 2) 立体物层（按 y 从小到大 → 前排自然遮住后排；建筑最后画，防止被墙行覆盖）
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    const t = map[ty][tx];
    if (t === T.GRASS || t === T.DIRT || t === T.FARM || t === T.WATER || t === T.ROAD || t === T.PATH || t === T.FLOOR) continue;
    if (BUILDINGS[t]) continue;
    drawObj(tx, ty, tx * TILE, ty * TILE);
  }
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++)
    if (BUILDINGS[map[ty][tx]]) drawObj(tx, ty, tx * TILE, ty * TILE);
  // 网格（设置里可关）
  if (Settings.d.showGrid) {
    ctx.fillStyle = 'rgba(0,0,0,.10)';
    for (let tx = 0; tx <= MAP_W; tx++) ctx.fillRect(tx * TILE, 0, 1, bake.height);
    for (let ty = 0; ty <= MAP_H; ty++) ctx.fillRect(0, ty * TILE, bake.width, 1);
  }
  ctx = save;
  bakeSeason = S ? S.season : 0;
}

/* ======================= 世界渲染 ======================= */
function drawWorld() {
  if (!S) return;
  const pal = SEASON_TINT[curSeason()];
  ctx.fillStyle = pal.grass; ctx.fillRect(0, LH.worldTop, VW, LH.worldH);
  ctx.drawImage(bake, -cam.x, LH.worldTop - cam.y);
  // 水面动态波纹
  ctx.fillStyle = '#bfe6ff55';
  const wx0 = Math.max(0, Math.floor(cam.x / TILE)), wx1 = Math.min(MAP_W - 1, Math.ceil((cam.x + VW) / TILE));
  const wy0 = Math.max(0, Math.floor(cam.y / TILE)), wy1 = Math.min(MAP_H - 1, Math.ceil((cam.y + LH.worldH) / TILE));
  for (let ty = wy0; ty <= wy1; ty++) for (let tx = wx0; tx <= wx1; tx++) {
    if (map[ty][tx] !== T.WATER) continue;
    if ((((tx * 7 + ty * 13 + Math.floor(frameNo / 18)) % 4) === 0))
      ctx.fillRect(tx * TILE - cam.x + 3, Math.round(ty * TILE - cam.y + 5 + Math.sin(frameNo * 0.05 + tx) * 3), 5, 1);
  }
  // 作物
  const cx0 = Math.max(0, Math.floor(cam.x / TILE) - 1), cx1 = Math.min(MAP_W - 1, Math.ceil((cam.x + VW) / TILE) + 1);
  const cy0 = Math.max(0, Math.floor(cam.y / TILE) - 1), cy1 = Math.min(MAP_H - 1, Math.ceil((cam.y + LH.worldH) / TILE) + 1);
  for (let ty = cy0; ty <= cy1; ty++) for (let tx = cx0; tx <= cx1; tx++)
    if (map[ty][tx] === T.FARM) drawCrop(tx, ty, Math.round(tx * TILE - cam.x), Math.round(ty * TILE - cam.y));
  // 目标高亮：明确告诉玩家「这一下会作用到这格」
  drawTargetMark();
  // 动物 + NPC + 玩家
  animals.slice().sort((a, b) => a.y - b.y).forEach(drawAnimal);
  npcs.slice().sort((a, b) => a.y - b.y).forEach(drawNpc);
  drawPlayer();
  // 粒子
  for (const p of dust) {
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.fillStyle = p.col; ctx.fillRect(p.x - cam.x, p.y - cam.y - 6, 2, 2);
  }
  ctx.globalAlpha = 1;
}

/* 目标格四角括号 + 呼吸描边，和 frontTile() 严格同一格 */
function drawTargetMark() {
  const t = lastTarget;
  if (!t || modal) return;
  const pulse = 0.55 + 0.45 * Math.sin(frameNo * 0.12);
  ctx.save();
  if (t.tx !== undefined) {
    const x = Math.round(t.tx * TILE - cam.x), y = Math.round(t.ty * TILE - cam.y);
    ctx.strokeStyle = 'rgba(255,236,150,' + (0.45 + 0.35 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
    ctx.strokeStyle = 'rgba(120,30,20,' + (0.5 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
  } else if (t.type === 'animal' && t.a) {
    const x = t.a.x * TILE - cam.x, y = t.a.y * TILE - cam.y;
    ctx.strokeStyle = 'rgba(255,236,150,' + (0.5 + 0.4 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 2;
    circle(Math.round(x), Math.round(y), 13 + pulse * 2);
  } else if (t.type === 'npc' && t.npc) {
    const x = t.npc.x * TILE - cam.x, y = t.npc.y * TILE - cam.y;
    ctx.strokeStyle = 'rgba(255,236,150,' + (0.5 + 0.4 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 2;
    circle(Math.round(x), Math.round(y - 6), 14 + pulse * 2);
  } else if (t.type === 'shop') {
    ctx.strokeStyle = 'rgba(255,236,150,' + (0.45 + 0.3 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.strokeRect(VW / 2 - 20, LH.worldTop + LH.worldH / 2 - 14, 40, 28);
  }
  ctx.restore();
}

/* ======================= HUD ======================= */
function drawHUD() {
  const H = HUD_H, mid = Math.round(H / 2) - 1;
  ctx.fillStyle = '#243d2a'; ctx.fillRect(0, 0, VW, H);

  // 体力条：贴在信息栏底边，省出中间空间
  const r = clamp(S.stamina / S.staminaMax, 0, 1);
  ctx.fillStyle = '#16241a'; ctx.fillRect(0, H - 4, VW, 4);
  const low = r <= 0.3;
  ctx.fillStyle = (low && (frameNo % 40 < 24)) ? '#e8604a' : (r > 0.3 ? '#6ad07a' : '#e8904a');
  ctx.fillRect(0, H - 4, VW * r, 4);
  ctx.fillStyle = '#4a7a55'; ctx.fillRect(0, H - 1, VW, 1);

  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  // 左：日期
  ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffe9a8';
  const wide = VW >= 350;
  const dTxt = wide ? ('第' + S.year + '年 · ' + curSeason() + '季 第' + S.day + '天')
    : (curSeason() + '季 ' + S.day + '天');
  ctx.fillText(dTxt, 8, mid);
  let x = 8 + ctx.measureText(dTxt).width + 8;
  // 中：时钟
  ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#bfe6ff';
  const ck = fmtClock(S.hour, S.minute);
  ctx.fillText(ck, x, mid); x += ctx.measureText(ck).width + 8;
  // 右：金币（紧贴右上按钮区左边）
  ctx.textAlign = 'right'; ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffd24a';
  ctx.fillText('¥' + S.gold, VW - 110, mid);

  // 右上三个功能键
  const labels = { shop: '商店', bag: '背包', menu: '菜单' };
  for (const b of LH.hudBtns) {
    const hot = hoverPt && inRect(hoverPt, b);
    ctx.fillStyle = hot ? 'rgba(120,190,120,.55)' : 'rgba(18,32,18,.72)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
    ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    ctx.textAlign = 'center'; ctx.fillStyle = hot ? '#ffffff' : '#dfe8d0'; ctx.font = '11px sans-serif';
    ctx.fillText(labels[b.id], b.x + b.w / 2, b.y + b.h / 2 + 1);
  }
  ctx.textAlign = 'left';
}

/* ======================= 操作控件 ======================= */
function drawToolIcon(id, cx, cy) {
  // 图片图标（tool_*.png），缺图退回程序化像素画
  if (drawAsset('tool_' + id, cx - 8, cy - 8, 16, 16)) return;
  ctx.save(); ctx.translate(Math.round(cx), Math.round(cy));
  if (id === 'hoe') { ctx.fillStyle = '#8a5a30'; ctx.fillRect(-1, -4, 2, 8); ctx.fillStyle = '#c2b8a4'; ctx.fillRect(-4, -6, 6, 3); }
  else if (id === 'can') { ctx.fillStyle = '#3f8fc0'; ctx.fillRect(-5, -3, 8, 7); ctx.fillStyle = '#7fd0ff'; ctx.fillRect(-7, -1, 3, 3); ctx.fillStyle = '#2a6a95'; ctx.fillRect(-5, -6, 8, 2); }
  else if (id === 'hand') { ctx.fillStyle = '#f3c9a0'; ctx.fillRect(-3, -3, 7, 7); ctx.fillStyle = '#dba97c'; ctx.fillRect(-3, 1, 7, 3); }
  else if (id === 'axe') { ctx.fillStyle = '#8a5a30'; ctx.fillRect(-1, -5, 2, 9); ctx.fillStyle = '#c8d0d4'; ctx.fillRect(-5, -7, 9, 3); ctx.fillStyle = '#98a0a4'; ctx.fillRect(-5, -7, 9, 1); }
  else if (id === 'pick') { ctx.fillStyle = '#b6bec4'; ctx.fillRect(-6, -5, 12, 2); ctx.fillRect(-2, -8, 4, 12); ctx.fillStyle = '#8a5a30'; ctx.fillRect(-1, 2, 2, 4); }
  ctx.restore();
}
function drawControls() {
  const j = LH.joy;
  ctx.fillStyle = 'rgba(18,28,18,.34)'; circle(j.cx, j.cy, j.r);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; circle(j.cx, j.cy, j.r - 4);
  const kx = j.cx + joy.ox * j.r * 0.5, ky = j.cy + joy.oy * j.r * 0.5;
  ctx.fillStyle = joy.active ? '#f7efd2' : '#dcd3b2'; circle(kx, ky, 14);
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; circle(kx, ky, 14);
  const a = LH.act;
  ctx.fillStyle = 'rgba(198,74,58,.62)'; circle(a.cx, a.cy, a.r);
  ctx.fillStyle = 'rgba(255,255,255,.2)'; circle(a.cx, a.cy, a.r - 4);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('使用', a.cx, a.cy - 2);
  ctx.font = '10px sans-serif'; ctx.fillStyle = '#ffe'; ctx.fillText(TOOL_NAME[tool], a.cx, a.cy + 12);
  for (let i = 0; i < TOOLS.length; i++) {
    const id = TOOLS[i], b = LH.tools[i], on = tool === id;
    ctx.fillStyle = on ? '#c04a3a' : 'rgba(28,42,28,.62)';
    ctx.fillRect(b.x, b.y, b.w, b.w);
    ctx.strokeStyle = on ? '#ffd24a' : 'rgba(0,0,0,.4)'; ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.w - 2);
    drawToolIcon(id, b.x + b.w / 2, b.y + b.w / 2 - 1);
    // 右下角序号角标（对应键盘 1~5）
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = on ? 'rgba(255,240,180,.95)' : 'rgba(230,238,215,.55)';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(String(i + 1), b.x + b.w - 8, b.y + b.w - 8);
  }
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, LH.worldBottom, VW, 2);
}

/* ======================= 弹窗（即时模式） ======================= */
let HIT = [], hoverPt = null;
function hit(r, fn) {
  HIT.push({ x: r.x, y: r.y, w: r.w, h: r.h, fn: fn });
  if (hoverPt && inRect(hoverPt, r)) { ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(r.x, r.y, r.w, r.h); }
}
function modalClick(p) {
  for (let i = HIT.length - 1; i >= 0; i--) { if (inRect(p, HIT[i])) { HIT[i].fn(); beep(620, .05); return; } }
}
function drawPanel(p, title, sub) {
  ctx.fillStyle = 'rgba(8,14,8,.74)'; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#31502f'; ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = '#7ba86f'; ctx.lineWidth = 2; ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
  ctx.fillStyle = '#3f6b3c'; ctx.fillRect(p.x, p.y, p.w, 26);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.fillText(title, VW / 2, p.y + 13);
  if (sub) { ctx.font = '10px sans-serif'; ctx.fillStyle = '#dfe8d0'; ctx.fillText(sub, VW / 2, p.y + 38); }
  hit({ x: p.x + p.w - 30, y: p.y + 3, w: 26, h: 20 }, () => { modal = null; });
  ctx.fillStyle = '#e8e0c0'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('×', p.x + p.w - 17, p.y + 13);
  return { bodyY: p.y + (sub ? 50 : 36) };
}
function lineBtn(r, label, fn, col) {
  ctx.fillStyle = col || '#5f8f56'; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
  hit(r, fn);
}
/* 物品图标：ic_*.png 素材，缺图退回色块 */
function drawItemIcon(id, x, y, s) {
  if (drawAsset('ic_' + id, x, y, s, s)) return;
  ctx.fillStyle = itemColor(id); ctx.fillRect(x, y, s, s);
}
/* 商店列表行：图标 + 名称 + 副标题 + 右侧价格 + 操作按钮 */
function shopRow(p, y, h, id, col, name, sub, price, label, cb, btnCol, alt) {
  ctx.fillStyle = alt ? 'rgba(0,0,0,.16)' : 'rgba(0,0,0,.08)';
  ctx.fillRect(p.x + 12, y, p.w - 24, h);
  drawItemIcon(id, p.x + 18, y + (h - 13) / 2, 13, 13);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
  ctx.fillText(name, p.x + 36, y + 12);
  ctx.fillStyle = '#cfe8c0'; ctx.font = '10px sans-serif';
  ctx.fillText(sub, p.x + 36, y + 24);
  ctx.textAlign = 'right'; ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 12px sans-serif';
  ctx.fillText(price, p.x + p.w - 52, y + 13);
  lineBtn({ x: p.x + p.w - 50, y: y + 1, w: 38, h: h - 2 }, label, cb, btnCol);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
}
function toggleRow(p, y, w, name, key) {
  ctx.textAlign = 'left'; ctx.fillStyle = '#e6eedd'; ctx.font = '12px sans-serif';
  ctx.fillText(name, p.x + 18, y + 12);
  const on = !!Settings.d[key];
  lineBtn({ x: p.x + w - 76, y: y + 2, w: 62, h: 22 }, on ? '开' : '关', () => {
    Settings.set(key, !on); bakeMap();
    if (key === 'music') { if (on) stopBgm(); else startBgm(); }
  }, on ? '#3f7f47' : '#5a5a4a');
}

function drawModal() {
  HIT = [];
  if (!modal || !S) return;
  const type = modal.type;

  if (type === 'sleep') {
    const p = panel(300, 150);
    drawPanel(p, '回屋休息？');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '12px sans-serif'; ctx.fillStyle = '#eef3e4';
    ctx.fillText('今天还有 ' + Math.round(DAY_HOURS - S.hour) + ' 小时', VW / 2, p.y + 52);
    ctx.fillText('睡觉后作物成长、动物产出、体力全满', VW / 2, p.y + 72);
    lineBtn({ x: p.x + 30, y: p.y + 92, w: 110, h: 34 }, '睡觉', () => { modal = null; nextDay(); }, '#7a5030');
    lineBtn({ x: p.x + 160, y: p.y + 92, w: 110, h: 34 }, '再逛逛', () => { modal = null; });

  } else if (type === 'npc') {
    const n = modal.npc;
    const p = panel(340, 170);
    drawPanel(p, n.name, '月光牧场 · 村民');
    // 头像
    if (!drawAsset(n.img, p.x + 16, p.y + 58, 44, 48)) {
      ctx.fillStyle = '#c88'; ctx.fillRect(p.x + 24, p.y + 66, 28, 32);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '12px sans-serif'; ctx.fillStyle = '#eef3e4';
    const lines = modal.line || ['……'];
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], p.x + 74, p.y + 66 + i * 20);
    lineBtn({ x: p.x + 74, y: p.y + p.h - 46, w: 110, h: 32 }, '再聊一句', () => {
      const ls = NPC_DEFS[n.id].lines;
      modal.line = ls[Math.floor(Math.random() * ls.length)];
    });
    lineBtn({ x: p.x + 196, y: p.y + p.h - 46, w: 110, h: 32 }, '先这样', () => { modal = null; });

  } else if (type === 'dayend') {
    const p = panel(320, 168);
    drawPanel(p, '新的一天');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '12px sans-serif'; ctx.fillStyle = '#eef3e4';
    ctx.fillText('第' + S.year + '年 ' + curSeason() + '季 第' + S.day + '天', VW / 2, p.y + 50);
    ctx.fillText('体力已恢复满', VW / 2, p.y + 72);
    const wither = (modal.info || []).length;
    if (wither) ctx.fillText('有 ' + wither + ' 株作物枯萎了…', VW / 2, p.y + 90);
    lineBtn({ x: p.x + 60, y: p.y + 108, w: 200, h: 40 }, '起床！', closeDayEnd, '#5f8f56');

  } else if (type === 'shop') {
    const p = panel(Math.min(VW - 40, 420), Math.min(VH - 56, 350));
    drawPanel(p, '农产品商店', '月光牧场 · 杂货铺 · ' + fmtGold(S.gold));
    const tx = p.x + 12, tw = (p.w - 24 - 12) / 3, ty = p.y + 32;
    const tabs = [['seed', '买种子'], ['sell', '卖东西'], ['ranch', '牧场']];
    for (let i = 0; i < tabs.length; i++) {
      lineBtn({ x: tx + i * (tw + 6), y: ty, w: tw, h: 26 }, tabs[i][1],
        () => { modal.tab = tabs[i][0]; modal.page = 0; },
        modal.tab === tabs[i][0] ? '#4f7f47' : '#3a5c37');
    }
    const listY = ty + 34, rowH = 30;
    if (modal.tab === 'seed') {
      const list = seasonCrops();
      for (let i = 0; i < list.length; i++) {
        const c = list[i], y = listY + i * rowH;
        shopRow(p, y, rowH, c.id, c.col[3],
          c.name + '（' + c.days + '天成熟）',
          '持有种子 ' + seedCount(c.id) + ' · 售价 ¥' + c.sell,
          '¥' + c.seed, '买', () => {
            if (S.gold < c.seed) { toastMsg('金币不够'); beep(180, .12); return; }
            S.gold -= c.seed; seedAdd(c.id, 1); beep(880, .09); saveGame();
          });
      }
    } else if (modal.tab === 'ranch') {
      const keys = ['chicken', 'cow', 'sheep'];
      for (let i = 0; i < keys.length; i++) {
        const d = ANIMAL_SHOP[keys[i]], y = listY + i * rowH;
        const owned = animalOwned(keys[i]);
        const target = animals.find(a => a.kind === keys[i] && !a.have);
        // 行底色：已养满 / 买不起的用灰调
        ctx.fillStyle = i % 2 ? 'rgba(0,0,0,.16)' : 'rgba(0,0,0,.08)';
        ctx.fillRect(p.x + 12, y, p.w - 24, rowH);
        if (!drawAsset(ANIMAL_IMG[keys[i]], p.x + 15, y + 6, 21, 18)) {
          ctx.fillStyle = '#e8e0c0'; ctx.fillRect(p.x + 18, y + 9, 12, 12);
        }
        ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
        ctx.fillText(d.name, p.x + 36, y + 11);
        ctx.fillStyle = '#cfe8c0'; ctx.font = '10px sans-serif';
        ctx.fillText(d.desc + '（上限 ' + d.max + ' 只）', p.x + 36, y + 23);
        ctx.textAlign = 'right'; ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 12px sans-serif';
        ctx.fillText('¥' + d.price, p.x + p.w - 56, y + 11);
        const full = owned >= d.max || !target;
        lineBtn({ x: p.x + p.w - 50, y: y + 1, w: 38, h: 28 },
          full ? '—' : '买',
          () => { if (!full) buyAnimal(target); },
          full ? '#5a5a4a' : '#4f7f47');
        ctx.textAlign = 'left'; ctx.fillStyle = full ? '#9fb08c' : '#dfe8d0'; ctx.font = '10px sans-serif';
        ctx.fillText('已养 ' + owned + '/' + d.max, p.x + 96, y + 11);
      }
    } else {
      const items = S.bag.slice();
      const per = 5, pages = Math.max(1, Math.ceil(items.length / per));
      const page = Math.min(modal.page || 0, pages - 1);
      modal.page = page;
      if (!items.length) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#cfd8c8'; ctx.font = '12px sans-serif';
        ctx.fillText('背包里没有可卖的东西', VW / 2, listY + 40);
        ctx.textBaseline = 'middle';
      } else {
        for (let i = 0; i < per; i++) {
          const it = items[page * per + i];
          if (!it) break;
          const y = listY + i * rowH;
          shopRow(p, y, rowH, it.id, itemColor(it.id),
            itemName(it.id) + ' ×' + it.n,
            '单价 ¥' + itemPrice(it.id),
            '+' + (itemPrice(it.id) * it.n), '卖', () => {
              const price = itemPrice(it.id) * it.n;
              S.gold += price; S.stats.earned += price;
              const idx = S.bag.indexOf(it);
              if (idx >= 0) S.bag.splice(idx, 1);
              modal.page = 0; beep(1040, .1); saveGame();
            }, '#5f8f56');
        }
        if (pages > 1) {
          const cy = listY + per * rowH + 2;
          ctx.textAlign = 'center'; ctx.fillStyle = '#cfe8c0'; ctx.font = '11px sans-serif';
          ctx.fillText((page + 1) + ' / ' + pages + ' 页', p.x + p.w / 2, cy + 11);
          lineBtn({ x: p.x + 12, y: cy, w: 54, h: 22 }, '‹ 上页', () => { modal.page = Math.max(0, page - 1); });
          lineBtn({ x: p.x + p.w - 66, y: cy, w: 54, h: 22 }, '下页 ›', () => { modal.page = Math.min(pages - 1, page + 1); });
        }
      }
    }
    const by = p.y + p.h - 42;
    if (modal.tab === 'sell') {
      const n = S.bag.reduce((a, it) => a + it.n, 0);
      lineBtn({ x: p.x + 12, y: by, w: (p.w - 36) / 2, h: 32 }, '全部卖出（' + n + '）', () => {
        let total = 0;
        S.bag.forEach(it => { total += itemPrice(it.id) * it.n; });
        S.gold += total; S.stats.earned += total; S.bag = [];
        toastMsg('卖出 ¥' + total); beep(1180, .12); saveGame();
      }, '#4f7f47');
      lineBtn({ x: p.x + p.w / 2 + 12, y: by, w: (p.w - 36) / 2, h: 32 }, '关闭', () => { modal = null; });
    } else {
      lineBtn({ x: p.x + (p.w - 24) / 2, y: by, w: (p.w - 24) / 2, h: 32 }, '关闭', () => { modal = null; });
    }

  } else if (type === 'bag') {
    const p = panel(Math.min(VW - 40, 420), Math.min(VH - 110, 400));
    drawPanel(p, '背包');
    const seedList = seasonCrops();
    ctx.textAlign = 'left'; ctx.fillStyle = '#cfe8c0'; ctx.font = '11px sans-serif';
    ctx.fillText('当前播种种子：' + (S.seedChoice ? itemName(S.seedChoice) : '无（去商店买）'), p.x + 14, p.y + 42);
    for (let i = 0; i < seedList.length; i++) {
      const c = seedList[i], y = p.y + 52 + i * 30;
      ctx.fillStyle = seedCount(c.id) ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.08)';
      ctx.fillRect(p.x + 14, y, p.w - 28, 26);
      drawItemIcon(c.id, p.x + 20, y + 7, 13);
      ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(c.name, p.x + 38, y + 13);
      ctx.fillStyle = '#cfe8c0'; ctx.font = '11px sans-serif'; ctx.fillText('种子 ' + seedCount(c.id) + ' 个', p.x + 110, y + 13);
      if (seedCount(c.id) > 0) lineBtn({ x: p.x + 170, y: y + 2, w: 70, h: 22 }, '选它播种', (() => {
        const id = c.id; return () => { S.seedChoice = id; saveGame(); };
      })());
    }
    const by = p.y + p.h - 42;
    const sellable = S.bag.reduce((n, it) => n + it.n, 0);
    lineBtn({ x: p.x + 14, y: by, w: (p.w - 28) / 2, h: 32 }, '全部卖出（' + sellable + '）', () => {
      let total = 0; S.bag.forEach(it => { total += itemPrice(it.id) * it.n; });
      S.gold += total; S.stats.earned += total; S.bag = []; beep(1180, .12); saveGame();
    }, '#4f7f47');
    lineBtn({ x: p.x + p.w / 2 + 8, y: by, w: (p.w - 28) / 2, h: 32 }, '关闭', () => { modal = null; });

  } else if (type === 'menu') {
    const p = panel(340, 320);
    drawPanel(p, '暂停菜单');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#e6eedd'; ctx.font = '11px sans-serif';
    ctx.fillText('第' + S.year + '年 · ' + curSeason() + '季 第' + S.day + '天   ' + fmtGold(S.gold), VW / 2, p.y + 46);
    lineBtn({ x: p.x + 20, y: p.y + 62, w: 140, h: 38 }, '继续游戏', () => { modal = null; });
    lineBtn({ x: p.x + 170, y: p.y + 62, w: 140, h: 38 }, '保存进度', () => { saveGame(); toastMsg('已保存到第' + curSlot + '号存档'); });
    lineBtn({ x: p.x + 20, y: p.y + 112, w: 140, h: 38 }, '游戏说明', () => { modal = { type: 'help' }; });
    lineBtn({ x: p.x + 170, y: p.y + 112, w: 140, h: 38 }, '设置', () => { modal = { type: 'settings' }; });
    lineBtn({ x: p.x + 20, y: p.y + 162, w: 140, h: 38 }, '返回标题', () => { saveGame(); location.href = 'index.html'; });
    lineBtn({ x: p.x + 170, y: p.y + 162, w: 140, h: 38 }, '重新开始', () => resetGame(), '#8a5a30');

  } else if (type === 'help') {
    const p = panel(360, 300);
    drawPanel(p, '游戏说明');
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '11px sans-serif'; ctx.fillStyle = '#e6eedd';
    const lines = [
      '■ 操作',
      '  · 左下摇杆移动；也可以点地面自动走过去。',
      '  · 右下「使用」键：对目标生效（收获/浇水/买东西…）。',
      '  · 底部五个格子切换工具；键盘 1~5 也行。',
      '■ 一天的流程',
      '  锄头翻土 → 换「双手」点空地播种 → 水壶浇水 → 每天浇水 → 成熟后双手收获。',
      '  作物必须每天浇水才会长；换季还没成熟会枯死。',
      '  走到屋子门口按「使用」睡觉，体力/时间才会推进。',
      '■ 赚钱',
      '  走到商店柜台前按「使用」，买种子、卖作物/鸡蛋/牛奶/羊毛。',
      '  斧头砍树得木材，镐子敲石得石头。',
      '■ 牧场',
      '  商店第三个页签「牧场」可以买鸡（¥500）、绵羊（¥1200）、奶牛（¥1800），',
      '  每种有上限，买下后每天产出，走近它按「使用」收取，卖给商店。',
      '  作物和动物都要靠「睡觉」推进——体力耗尽也记得回屋。',
      '■ 规则',
      '  每季 8 天、一年 4 季；体力用光只能睡觉。数据自动存档。'
    ];
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], p.x + 18, p.y + 44 + i * 15);
    ctx.textBaseline = 'middle';
    lineBtn({ x: p.x + p.w / 2 - 60, y: p.y + p.h - 44, w: 120, h: 32 }, '知道了', () => { modal = { type: 'menu' }; });

  } else if (type === 'settings') {
    const p = panel(340, 330);
    drawPanel(p, '设置');
    const rows = [
      { name: '音效', key: 'sfx' },
      { name: '音乐', key: 'music' },
      { name: '点地自动走', key: 'tapMove' },
      { name: '显示地块网格', key: 'showGrid' },
      { name: '自动存档', key: 'autoSave' }
    ];
    for (let i = 0; i < rows.length; i++) toggleRow(p, p.y + 50 + i * 34, p.w, rows[i].name, rows[i].key);
    // 摇杆大小
    ctx.textAlign = 'left'; ctx.fillStyle = '#e6eedd'; ctx.font = '12px sans-serif';
    ctx.fillText('摇杆大小', p.x + 18, p.y + 224);
    const lv = Settings.d.joyScale;
    lineBtn({ x: p.x + 140, y: p.y + 212, w: 56, h: 24 }, '小', () => { Settings.set('joyScale', 0.85); computeLayout(); bakeMap(); }, lv === 0.85 ? '#4f7f47' : '#3a5c37');
    lineBtn({ x: p.x + 140 + 62, y: p.y + 212, w: 56, h: 24 }, '中', () => { Settings.set('joyScale', 1); computeLayout(); bakeMap(); }, lv === 1 ? '#4f7f47' : '#3a5c37');
    lineBtn({ x: p.x + 140 + 124, y: p.y + 212, w: 56, h: 24 }, '大', () => { Settings.set('joyScale', 1.2); computeLayout(); bakeMap(); }, lv === 1.2 ? '#4f7f47' : '#3a5c37');
    lineBtn({ x: p.x + 20, y: p.y + p.h - 48, w: 150, h: 34 }, '清空全部存档', () => resetAllSaves(), '#8a3a30');
    lineBtn({ x: p.x + 170, y: p.y + p.h - 48, w: 150, h: 34 }, '返回', () => { modal = { type: 'menu' }; }, '#4f7f47');
  }
}
