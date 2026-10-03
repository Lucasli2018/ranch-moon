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

/* ======================= 实体网格对齐 ======================= */
/* 所有实体（人 / NPC / 动物）都按「站格」对齐：
   水平取所在格中心，脚底贴格底 —— 和玩家、格子高亮框严格同一套坐标 */
function gridX(v) { return Math.floor(v) * TILE + TILE / 2; }
function gridY(v) { return Math.floor(v) * TILE + TILE - 3; }

/* ======================= 动物绘制 ======================= */
const ANIMAL_IMG = { chicken: 'an_chicken', cow: 'an_cow', sheep: 'an_sheep' };
const ANIMAL_SIZE = { chicken: [20, 20], cow: [28, 22], sheep: [26, 22] };
function drawAnimal(a) {
  const x = gridX(a.x), y = gridY(a.y);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x - 6, y + 1, 12, 3);
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
  const x = gridX(n.x), y = gridY(n.y);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x - 10, y + 1, 20, 3);
  const bob = Math.sin(frameNo * 0.05 + n.x) > 0.9 ? 1 : 0;   // 偶尔轻晃，像在呼吸
  if (!drawAsset(n.img, x - 16, y - 34 - bob, 32, 36)) {       // 与玩家同步放大一倍
    ctx.save();
    ctx.translate(x, y - bob);
    ctx.scale(2, 2);
    ctx.fillStyle = '#c88'; ctx.fillRect(-5, -12, 10, 12);
    ctx.fillStyle = '#f3c9a0'; ctx.fillRect(-4, -16, 8, 5);
    ctx.restore();
  }
  // 头顶感叹号提示可对话
  const bob2 = Math.sin(frameNo * 0.09 + n.x) * 1.2;
  ctx.fillStyle = '#ffd24a'; ctx.fillRect(x - 2, y - 45 + bob2, 5, 8);
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 35 + bob2, 5, 3);
}

/* ======================= 玩家绘制 ======================= */
function drawToolInHand(x, top, d) {
  const ox = d === 1 ? 14 : d === 3 ? -14 : 0;
  const oy = d === 0 ? -6 : d === 1 ? 4 : d === 2 ? 8 : 0;
  const px = x + ox, py = top + oy;
  if (tool === 'hoe') { ctx.fillStyle = '#8a5a30'; ctx.fillRect(px - 2, py - 8, 4, 14); ctx.fillStyle = '#b8b0a0'; ctx.fillRect(px - 6, py - 12, 10, 6); }
  else if (tool === 'can') { ctx.fillStyle = '#3f8fc0'; ctx.fillRect(px - 8, py - 6, 14, 12); ctx.fillStyle = '#7fd0ff'; ctx.fillRect(px - 12, py - 2, 6, 4); }
  else if (tool === 'axe') { ctx.fillStyle = '#8a5a30'; ctx.fillRect(px - 2, py - 10, 4, 16); ctx.fillStyle = '#c0c8cc'; ctx.fillRect(px - 8, py - 14, 16, 6); }
  else if (tool === 'pick') { ctx.fillStyle = '#b0b8bd'; ctx.fillRect(px - 8, py - 10, 16, 4); ctx.fillRect(px - 2, py - 6, 4, 16); }
  else if (tool === 'rod') {
    // 竿身斜举向朝向侧；钓鱼时画一条带弧度的线连到浮标（直线横穿湖面太生硬）
    const dirX = (d === 1 ? 1 : d === 3 ? -1 : 0), dirY = (d === 0 ? -1 : d === 2 ? 1 : 0);
    const tipX = px + dirX * 13, tipY = py + dirY * 7;
    ctx.strokeStyle = '#e8e0c0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, py + 4); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(px - 2, py + 2, 4, 5);
    if (fish.st !== 'idle') {
      const fx = fish.tx * TILE + 8, fy = fish.ty * TILE + 6;
      // 三段折线近似抛物线下垂，比直线自然
      ctx.strokeStyle = 'rgba(245,245,235,.75)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tipX, tipY);
      const mx = (tipX + fx) / 2, my = (tipY + fy) / 2 + Math.abs(fx - tipX) * 0.18;
      ctx.quadraticCurveTo(mx, my, fx, fy);
      ctx.stroke();
    }
  }
  else { ctx.fillStyle = '#f3c9a0'; ctx.fillRect(px - 4, py - 4, 10, 10); }
}
const PLAYER_IMG = { 0: 'player_up', 1: 'player_right', 2: 'player_down', 3: 'player_left' };
const PLAYER_W = 32, PLAYER_H = 36;   // 人物放大一倍（源 16x18 → 32x36），手机端不再小如芝麻
function drawPlayer() {
  const x = Math.round(player.x), y = Math.round(player.y);
  const d = player.dir;
  const bob = player.moving && (Math.floor(frameNo / 6) % 2) ? 1 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x - 11, y - 2, 22, 3);
  // 图片素材 32x36，底部对齐脚部
  if (drawAsset(PLAYER_IMG[d], x - 16, y - 34 + bob, PLAYER_W, PLAYER_H)) { drawToolInHand(x, y - 28 + bob, d); return; }
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(2, 2);
  const top = -14;
  ctx.fillStyle = '#3c5f8a';
  if (d !== 0) { ctx.fillRect(-4, top + 10, 3, 4); ctx.fillRect(1, top + 10, 3, 4); }
  else { ctx.fillStyle = '#34507a'; ctx.fillRect(-4, top + 11, 8, 3); }
  ctx.fillStyle = '#4f8fc0'; ctx.fillRect(-5, top + 3, 10, 8);
  ctx.fillStyle = '#e8e0cc'; ctx.fillRect(-4, top + 3, 8, 2);
  ctx.fillStyle = '#f3c9a0'; ctx.fillRect(-4, top - 4, 8, 7);
  if (d === 0) { ctx.fillStyle = '#3b2a20'; ctx.fillRect(-4, top - 5, 8, 6); }
  else { ctx.fillStyle = '#5a3a24'; ctx.fillRect(-4, top - 5, 8, 3); ctx.fillRect(-4, top - 4, 8, 1); }
  if (d === 2) { ctx.fillStyle = '#2b2b2b'; ctx.fillRect(-2, top - 1, 2, 2); ctx.fillRect(1, top - 1, 2, 2); }
  if (d === 1) { ctx.fillStyle = '#2b2b2b'; ctx.fillRect(2, top - 1, 2, 2); }
  if (d === 3) { ctx.fillStyle = '#2b2b2b'; ctx.fillRect(-4, top - 1, 2, 2); }
  ctx.fillStyle = '#d8452f';
  if (d === 2) ctx.fillRect(-5, top - 6, 10, 2);
  else ctx.fillRect(-4 + (d === 1 ? 2 : d === 3 ? -2 : 0), top - 6, 8, 2);
  ctx.restore();
  drawToolInHand(x, y - 28 + bob, d);
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
  // 水面动态波纹（与烘焙地图同一基准：worldTop + 世界 y − 相机）
  ctx.fillStyle = '#bfe6ff55';
  const wx0 = Math.max(0, Math.floor(cam.x / TILE)), wx1 = Math.min(MAP_W - 1, Math.ceil((cam.x + VW) / TILE));
  const wy0 = Math.max(0, Math.floor(cam.y / TILE)), wy1 = Math.min(MAP_H - 1, Math.ceil((cam.y + LH.worldH) / TILE));
  for (let ty = wy0; ty <= wy1; ty++) for (let tx = wx0; tx <= wx1; tx++) {
    if (map[ty][tx] !== T.WATER) continue;
    if ((((tx * 7 + ty * 13 + Math.floor(frameNo / 18)) % 4) === 0))
      ctx.fillRect(tx * TILE - cam.x + 3,
        Math.round(LH.worldTop + ty * TILE - cam.y + 5 + Math.sin(frameNo * 0.05 + tx) * 3), 5, 1);
  }
  /* ↓↓↓ 世界坐标层：一次 translate，实体全部用「世界坐标」画。
     之前 NPC/动物/玩家各自画绝对坐标却没减相机 → 镜头一动就和地面脱开，
     表现为「人物一动 NPC 就漂移」「出生点看着不在门口」 */
  ctx.save();
  ctx.translate(-cam.x, LH.worldTop - cam.y);
  // 作物（世界坐标）
  const cx0 = Math.max(0, Math.floor(cam.x / TILE) - 1), cx1 = Math.min(MAP_W - 1, Math.ceil((cam.x + VW) / TILE) + 1);
  const cy0 = Math.max(0, Math.floor(cam.y / TILE) - 1), cy1 = Math.min(MAP_H - 1, Math.ceil((cam.y + LH.worldH) / TILE) + 1);
  for (let ty = cy0; ty <= cy1; ty++) for (let tx = cx0; tx <= cx1; tx++)
    if (map[ty][tx] === T.FARM) drawCrop(tx, ty, tx * TILE, ty * TILE);
  // 目标高亮：明确告诉玩家「这一下会作用到这格」
  drawTargetMark();
  // 浮标（钓鱼中）：在水面格上，随状态起伏/下沉
  drawFloat();
  // 动物 + NPC + 玩家
  animals.slice().sort((a, b) => a.y - b.y).forEach(drawAnimal);
  npcs.slice().sort((a, b) => a.y - b.y).forEach(drawNpc);
  drawPlayer();
  // 拉杆小游戏浮层（世界坐标层内绘制，位置跟随浮标所在格）
  drawReelBar();
  // 粒子
  for (const p of dust) {
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y - 6, 2, 2);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* 人物「面前那一格」的淡框：任何工具下都可见，玩家一眼知道会作用到哪 */
function drawFrontMark() {
  if (modal) return;
  const f = frontTile();
  if (!inMap(f.tx, f.ty)) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.20)';
  ctx.lineWidth = 1;
  ctx.strokeRect(f.tx * TILE + 1.5, f.ty * TILE + 1.5, TILE - 3, TILE - 3);
  ctx.restore();
}

/* 目标格四角括号 + 呼吸描边，和 frontTile() 严格同一格（世界坐标层内调用） */
function drawTargetMark() {
  const t = lastTarget;
  drawFrontMark();
  if (!t || modal) return;
  const pulse = 0.55 + 0.45 * Math.sin(frameNo * 0.12);
  ctx.save();
  if (t.type === 'water' && t.tx !== undefined) {
    /* 钓竿预览：人物 → 落点画虚线 + 落点脉冲圈。
       远投能到 4~6 格外，不给引导线玩家不知道该朝哪投、也不知道投多远。
       圈的粗细随水深递增（深水 = 大鱼），把「站位/朝向」这个策略显式画出来。
       注意：这个分支必须在下面的 t.tx !== undefined 之前，
       否则水面目标会被当成普通单格高亮，落到 else-if 链的更后面去。 */
    const fx = t.tx * TILE + 8, fy = t.ty * TILE + 8;
    const sx = player.x, sy = player.y - 22;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.setLineDash([]);
    const dep = waterDepth(t.tx, t.ty);
    const rr = 6 + Math.min(3, dep) * 2 + pulse * 1.5;
    ctx.strokeStyle = 'rgba(190,230,255,' + (0.5 + 0.35 * pulse).toFixed(2) + ')';
    ctx.lineWidth = 2;
    circle(Math.round(fx), Math.round(fy), rr);
    // 深水额外加一圈，表示「这里能钓到大的」
    if (dep >= 2) {
      ctx.strokeStyle = 'rgba(255,210,74,' + (0.4 + 0.3 * pulse).toFixed(2) + ')';
      ctx.lineWidth = 1;
      circle(Math.round(fx), Math.round(fy), rr + 4);
    }
  } else if (t.tx !== undefined) {
    const x = Math.round(t.tx * TILE), y = Math.round(t.ty * TILE);
    ctx.strokeStyle = 'rgba(255,236,150,' + (0.45 + 0.35 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
    ctx.strokeStyle = 'rgba(120,30,20,' + (0.5 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
  } else if (t.type === 'animal' && t.a) {
    const x = gridX(t.a.x), y = gridY(t.a.y);
    ctx.strokeStyle = 'rgba(255,236,150,' + (0.5 + 0.4 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 2;
    circle(Math.round(x), Math.round(y), 13 + pulse * 2);
  } else if (t.type === 'npc' && t.npc) {
    const x = gridX(t.npc.x), y = gridY(t.npc.y);
    ctx.strokeStyle = 'rgba(255,236,150,' + (0.5 + 0.4 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 2;
    circle(Math.round(x), Math.round(y - 14), 22 + pulse * 2);   // NPC 放大后圈也放大
  } else if (t.type === 'shop') {
    // 柜台在世界坐标 (23,25) 附近
    ctx.strokeStyle = 'rgba(255,236,150,' + (0.45 + 0.3 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.strokeRect(23 * TILE - 20, 25 * TILE - 14, 40, 28);
  }
  ctx.restore();
}

/* ======================= 钓鱼绘制 ======================= */
/* 浮标：抛竿后浮在目标水格中央。
   wait  随波轻晃（sin 上下 1px）
   bite  猛沉 3px + 红色扩散环 + 头顶「！」，提示"现在按使用"
   reel  随游标上下点头 */
function drawFloat() {
  if (fish.st === 'idle' || modal) return;
  const x = fish.tx * TILE + 8, y = fish.ty * TILE + 9;
  ctx.save();
  if (fish.st === 'bite') {
    const k = 1 - fish.t / Math.max(0.01, fish.biteWin);
    ctx.fillStyle = 'rgba(255,120,90,' + (0.55 * (1 - k)).toFixed(2) + ')';
    circle(x, y + 2, 4 + k * 9);
    ctx.fillStyle = '#ff6a4a'; ctx.fillRect(x - 1.5, y - 14 + (k % 1) * 3, 3, 6);
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 1.5, y - 8 + (k % 1) * 3, 3, 2);
  }
  const bob = fish.st === 'wait' ? Math.sin(frameNo * 0.14) * 1.2
    : fish.st === 'bite' ? 3 : Math.sin(frameNo * 0.5) * 0.8;
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.fillRect(x - 3, y + 2 + bob, 6, 1);
  ctx.fillStyle = fish.st === 'bite' ? '#e8604a' : '#e83c2c';   // 红白浮标
  ctx.fillRect(x - 1, y - 4 + bob, 2, 6);
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 4 + bob, 2, 2);
  ctx.restore();
}

/* 拉杆时机小游戏：浮标上方的竖条，绿区 + 来回扫的游标。
   底板加不透明深色 + 描边 —— 直接画在湖面上对比度不够，文字读不清 */
function drawReelBar() {
  if (fish.st !== 'reel') return;
  const bx = fish.tx * TILE + 8, by = fish.ty * TILE - 40;
  const W = 54, H = 9;
  ctx.save();
  // 提示文字带底
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.font = 'bold 10px sans-serif';
  const tip = '游标进绿区时按「使用」';
  const tw = ctx.measureText(tip).width;
  ctx.fillStyle = 'rgba(10,16,10,.88)';
  ctx.fillRect(bx - tw / 2 - 5, by - 20, tw + 10, 14);
  ctx.strokeStyle = 'rgba(255,210,74,.55)'; ctx.lineWidth = 1;
  ctx.strokeRect(bx - tw / 2 - 4.5, by - 19.5, tw + 9, 13);
  ctx.fillStyle = '#fff8e0';
  ctx.fillText(tip, bx, by - 7);
  // 条本体
  ctx.fillStyle = 'rgba(8,12,8,.9)'; ctx.fillRect(bx - W / 2 - 2, by - 2, W + 4, H + 4);
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.strokeRect(bx - W / 2 - 1.5, by - 1.5, W + 3, H + 3);
  ctx.fillStyle = '#1c2a1a'; ctx.fillRect(bx - W / 2, by, W, H);
  ctx.fillStyle = '#5fc46a';
  ctx.fillRect(bx - W / 2 + fish.zone * W, by + 1, fish.zoneW * W, H - 2);
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.fillRect(bx - W / 2 + fish.zone * W, by + 1, fish.zoneW * W, 1);
  // 游标
  const cx = bx - W / 2 + fish.cursor * W;
  ctx.fillStyle = '#fff8e0'; ctx.fillRect(cx - 1, by - 3, 2, H + 6);
  ctx.fillStyle = '#ffd24a'; ctx.fillRect(cx - 2, by - 4, 4, 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
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
  const IC = 14;                                  // 图标边长
  const night = S.hour < 6 || S.hour >= 19;
  let x = 6;
  // 左：日期（cal + 文字）
  // 三档文案：宽屏全称 / 中屏省略年 / 窄屏只留「季节 天」——窄屏要腾宽度给事件徽标
  drawIcon('cal', x + IC / 2, mid, IC); x += IC + 3;
  const wide = VW >= 350;
  const tiny = VW < 420;
  ctx.font = 'bold ' + (tiny ? 10 : 11) + 'px sans-serif'; ctx.fillStyle = '#ffe9a8';
  const dTxt = tiny ? (curSeason() + S.day + '天')
    : wide ? ('第' + S.year + '年 ' + curSeason() + '季 ' + S.day + '天')
    : (curSeason() + '季 ' + S.day + '天');
  ctx.fillText(dTxt, x, mid); x += ctx.measureText(dTxt).width + 8;
  // 中：时钟（clock + 时间）
  drawIcon('clock', x + IC / 2, mid, IC); x += IC + 3;
  ctx.fillStyle = '#bfe6ff';
  const ck = fmtClock(S.hour, S.minute);
  ctx.fillText(ck, x, mid); x += ctx.measureText(ck).width + 8;
  // 昼夜小标（宽屏才放，避免窄屏挤压）
  if (wide) { drawIcon(night ? 'moon' : 'sun', x + IC / 2, mid, IC); x += IC + 8; }

  /* 右侧金币区：先排「当日净收」再排金币，两者都按实际文字宽度定位。
     先算出整块的左边界 gx，后面事件徽标要用它当右锚 —— 顺序反了就会重叠
     （曾出现「+9999」压住「¥99999」：净收是四位/五位数时宽度会往左吃掉徽标空间）。 */
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const rightEdge = VW - 110;
  const fl = (S.stats && S.stats.flow) || { earn: 0, spend: 0 };
  const net = fl.earn - fl.spend;
  let gx = rightEdge;                                   // 金币文字右端
  let gxLeft = rightEdge;
  if (net !== 0) {
    ctx.font = 'bold 10px sans-serif';
    const ntxt = (net > 0 ? '+' : '') + net;
    ctx.fillStyle = net > 0 ? '#8fe08a' : '#e8a08a';
    ctx.fillText(ntxt, gx - 4, mid);
    gx -= 4 + ctx.measureText(ntxt).width + 6;          // 再往左排金币
  }
  ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffd24a';
  const gtxt = '¥' + S.gold;
  ctx.fillText(gtxt, gx, mid);
  const gw = ctx.measureText(gtxt).width;
  drawIcon('coin', gx - gw - 2 - IC / 2, mid, IC);
  gxLeft = gx - gw - 2 - IC;                              // 含金币图标的左边界

  /* 当日事件徽标：右缘钉在 gxLeft 左边 6px，向左排布。
     宽度不够时先截断名字（加省略号），实在只够 17px 才退化成纯图标 ——
     顺序不能反：宁可少两个字，也不能压到金币上。 */
  const e = curEvent();
  if (e) {
    ctx.textAlign = 'left';                 // 币区那段设成了 right，不重置的话名字会往左溢出框外
    ctx.font = 'bold 10px sans-serif';
    const room = (gxLeft - 6) - (x + 3);
    if (room >= 17) {
      const iconW = 17;
      let label = e.name, showText = true;
      const maxText = room - iconW - 5;
      if (maxText < 18) showText = false;
      else if (ctx.measureText(label).width > maxText) {
        while (label.length > 1 && ctx.measureText(label + '…').width > maxText) label = label.slice(0, -1);
        label += '…';
      }
      const bw = showText ? iconW + 5 + ctx.measureText(label).width : iconW;
      const bx = gxLeft - 6 - bw;
      ctx.fillStyle = 'rgba(255,210,74,.16)';
      ctx.fillRect(bx, 4, bw, H - 9);
      ctx.strokeStyle = 'rgba(255,210,74,.5)'; ctx.lineWidth = 1;
      ctx.strokeRect(bx - .5, 4.5, bw + 1, H - 10);
      drawIcon(e.ico, bx + 9, mid, 13);
      if (showText) {
        ctx.fillStyle = '#ffd24a';
        ctx.fillText(label, bx + 18, mid);
      }
    }
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';

  // 右上三个功能键（图标化）
  const hico = { shop: 'shop', bag: 'bag', menu: 'menu' };
  for (const b of LH.hudBtns) {
    const hot = hoverPt && inRect(hoverPt, b);
    ctx.fillStyle = hot ? 'rgba(120,190,120,.55)' : 'rgba(18,32,18,.72)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
    ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    drawIcon(hico[b.id], b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) - 6);
  }
  ctx.textAlign = 'left';
}

/* ======================= 操作控件 ======================= */
function drawToolIcon(id, cx, cy, sz) {
  sz = sz || 16;
  // 图片图标（tool_*.png），缺图退回程序化像素画
  if (drawAsset('tool_' + id, cx - sz / 2, cy - sz / 2, sz, sz)) return;
  ctx.save(); ctx.translate(Math.round(cx), Math.round(cy));
  if (id === 'hoe') { ctx.fillStyle = '#8a5a30'; ctx.fillRect(-1, -4, 2, 8); ctx.fillStyle = '#c2b8a4'; ctx.fillRect(-4, -6, 6, 3); }
  else if (id === 'can') { ctx.fillStyle = '#3f8fc0'; ctx.fillRect(-5, -3, 8, 7); ctx.fillStyle = '#7fd0ff'; ctx.fillRect(-7, -1, 3, 3); ctx.fillStyle = '#2a6a95'; ctx.fillRect(-5, -6, 8, 2); }
  else if (id === 'hand') { ctx.fillStyle = '#f3c9a0'; ctx.fillRect(-3, -3, 7, 7); ctx.fillStyle = '#dba97c'; ctx.fillRect(-3, 1, 7, 3); }
  else if (id === 'axe') { ctx.fillStyle = '#8a5a30'; ctx.fillRect(-1, -5, 2, 9); ctx.fillStyle = '#c8d0d4'; ctx.fillRect(-5, -7, 9, 3); ctx.fillStyle = '#98a0a4'; ctx.fillRect(-5, -7, 9, 1); }
  else if (id === 'pick') { ctx.fillStyle = '#b6bec4'; ctx.fillRect(-6, -5, 12, 2); ctx.fillRect(-2, -8, 4, 12); ctx.fillStyle = '#8a5a30'; ctx.fillRect(-1, 2, 2, 4); }
  else if (id === 'rod') {
    ctx.fillStyle = '#e8e0c0'; ctx.fillRect(-1, -8, 1, 6); ctx.fillRect(0, -9, 1, 1); ctx.fillRect(1, -8, 1, 1);
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(-5, -2, 6, 2); ctx.fillRect(-2, -4, 2, 3);
    ctx.fillStyle = '#e8604a'; ctx.fillRect(-6, -2, 2, 2);
  }
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
function lineBtn(r, label, fn, col, ico) {
  ctx.fillStyle = col || '#5f8f56'; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
  ctx.textBaseline = 'middle';
  if (ico) {
    drawIcon(ico, r.x + 18, r.y + r.h / 2, r.h >= 32 ? 18 : 15);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
    ctx.fillText(label, r.x + 34, r.y + r.h / 2);
  } else {
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
  }
  hit(r, fn);
}
/* 物品图标：ic_*.png 素材，缺图退回色块 */
function drawItemIcon(id, x, y, s) {
  if (drawAsset('ic_' + id, x, y, s, s)) return;
  if (FISH_MAP[id]) { drawFish(FISH_MAP[id], x, y, true, s); return; }
  ctx.fillStyle = itemColor(id); ctx.fillRect(x, y, s, s);
}
/* 程序化鱼（无素材，全靠 FISH 表里的 col/belly/tail 画）：
   侧影 + 腹线 + 尾鳍 + 眼点。图鉴里未收集的用 silhouette 压成灰调。
   silhouette 的灰要够亮 —— 之前压得太暗，在深绿面板上只剩一个方块，看不出是鱼 */
function drawFish(f, x, y, has, box) {
  const s = box || 20;
  const w = Math.round(f.w * s / 20), h = Math.round(f.h * s / 20);
  const bx = x + Math.round((s - w) / 2), by = y + Math.round((s - h) / 2);
  const body = has ? f.col : '#8b9a86';
  const belly = has ? f.belly : '#a8b7a2';
  const tail = has ? f.tail : '#6d7c68';
  ctx.fillStyle = body; ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = belly; ctx.fillRect(bx, by + h - 2, w, 2);
  ctx.fillStyle = tail; ctx.fillRect(bx - 3, by + 1, 3, h - 2);
  ctx.fillRect(bx - 2, by, 2, 2); ctx.fillRect(bx - 2, by + h - 2, 2, 2);
  // 未收集的画一条虚线眼（表示"没见过"），收集了画实心眼
  ctx.fillStyle = has ? '#22303a' : '#3a4a3a';
  ctx.fillRect(bx + w - 4, by + 1, 2, 2);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx + 1, by + 1, w - 6, 1);
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
    const p = panel(320, 196);
    drawPanel(p, '新的一天');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '12px sans-serif'; ctx.fillStyle = '#eef3e4';
    ctx.fillText('第' + S.year + '年 ' + curSeason() + '季 第' + S.day + '天', VW / 2, p.y + 48);
    ctx.fillText('体力已恢复满', VW / 2, p.y + 68);
    const wither = (modal.info || []).length;
    let ly = p.y + 90;
    if (wither) { ctx.fillStyle = '#e8b0a0'; ctx.fillText('有 ' + wither + ' 株作物枯萎了…', VW / 2, ly); ly += 18; }
    if (modal.regrown) { ctx.fillStyle = '#cfe8b0'; ctx.fillText('野外长出了 ' + modal.regrown + ' 处新资源', VW / 2, ly); ly += 18; }
    const e = curEvent();
    if (e) {
      ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText('「' + e.name + '」', VW / 2, ly + 2);
      ctx.font = '11px sans-serif'; ctx.fillStyle = '#f0e6c0';
      ctx.fillText(e.desc, VW / 2, ly + 20);
    }
    lineBtn({ x: p.x + 60, y: p.y + p.h - 44, w: 200, h: 36 }, '起床！', closeDayEnd, '#5f8f56');

  } else if (type === 'shop') {
    const p = panel(Math.min(VW - 40, 420), Math.min(VH - 56, 350));
    const e = curEvent();
    drawPanel(p, '农产品商店', '月光牧场 · 杂货铺 · ' + fmtGold(S.gold) + (e ? '  ·  ' + e.name : ''));
    const tx = p.x + 12, tw = (p.w - 24 - 9) / 4, ty = p.y + 32;
    const tabs = [['seed', '买种子', 'sack'], ['sell', '卖东西', 'shop'], ['ranch', '牧场', 'barn'], ['dex', '图鉴', 'fish']];
    for (let i = 0; i < tabs.length; i++) {
      lineBtn({ x: tx + i * (tw + 3), y: ty, w: tw, h: 26 }, tabs[i][1],
        () => { modal.tab = tabs[i][0]; modal.page = 0; },
        modal.tab === tabs[i][0] ? '#4f7f47' : '#3a5c37', tabs[i][2]);
    }
    const listY = ty + 34, rowH = 30;
    if (modal.tab === 'seed') {
      const list = seasonCrops();
      for (let i = 0; i < list.length; i++) {
        const c = list[i], y = listY + i * rowH;
        const price = seedPrice(c);
        const off = price < c.seed;
        shopRow(p, y, rowH, c.id, c.col[3],
          c.name + '（' + c.days + '天成熟）',
          '持有种子 ' + seedCount(c.id) + ' · 售价 ¥' + sellPrice(c.id),
          (off ? '¥' + price + ' ↓' : '¥' + price), '买', () => {
            if (S.gold < price) { toastMsg('金币不够'); beep(180, .12); return; }
            addGold(-price); seedAdd(c.id, 1); beep(880, .09); saveGame();
          }, off ? '#4f9f47' : '#5f8f56');
      }
      if (ev('seedMul')) {
        ctx.textAlign = 'left'; ctx.fillStyle = '#ffd24a'; ctx.font = '10px sans-serif';
        ctx.fillText('「' + e.name + '」种子 ' + Math.round(ev('seedMul') * 100) + '% 折', p.x + 14, listY + list.length * rowH + 12);
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
        const ap = animalPrice({ kind: keys[i] });
        ctx.fillText((ap < d.price ? '¥' + ap + ' ↓' : '¥' + ap), p.x + p.w - 56, y + 11);
        const full = owned >= d.max || !target;
        lineBtn({ x: p.x + p.w - 50, y: y + 1, w: 38, h: 28 },
          full ? '—' : '买',
          () => { if (!full) buyAnimal(target); },
          full ? '#5a5a4a' : '#4f7f47');
        ctx.textAlign = 'left'; ctx.fillStyle = full ? '#9fb08c' : '#dfe8d0'; ctx.font = '10px sans-serif';
        ctx.fillText('已养 ' + owned + '/' + d.max, p.x + 96, y + 11);
      }
    } else if (modal.tab === 'dex') {
      /* 鱼类图鉴：已钓到的高亮，没钓到的压暗 —— 给「还差一条」一个目标 */
      const dex = fishDex();
      const per = 4, pages = Math.max(1, Math.ceil(dex.length / per));
      const page = Math.min(modal.page || 0, pages - 1);
      modal.page = page;
      const gotN = dex.filter(d => d.has).length;
      ctx.textAlign = 'left'; ctx.fillStyle = '#cfe8c0'; ctx.font = '11px sans-serif';
      ctx.fillText('已收集 ' + gotN + ' / ' + dex.length + ' 种', p.x + 14, listY - 4);
      const dxH = 32;                                   // 图鉴行高（比商店行宽，副标题才不挤）
      for (let i = 0; i < per; i++) {
        const d = dex[page * per + i];
        if (!d) break;
        const y = listY + 4 + i * dxH;
        ctx.fillStyle = d.has ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.06)';
        ctx.fillRect(p.x + 12, y, p.w - 24, dxH - 4);
        drawFish(d.f, p.x + 17, y + 4, d.has, 24);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = d.has ? '#fff' : '#7d8c74'; ctx.font = '12px sans-serif';
        ctx.fillText(d.has ? d.f.name : '？？？', p.x + 48, y + 9);
        ctx.fillStyle = d.has ? '#cfe8c0' : '#6d7c64'; ctx.font = '10px sans-serif';
        const ss = d.f.season === '全' ? '四季' : d.f.season.join('/');
        const dn = d.f.depth === 0 ? '岸边即可' : '离岸 ' + d.f.depth + ' 格外';
        ctx.fillText(d.has ? (ss + ' · ' + dn + ' · 钓到 ' + d.n + ' 条') : ('季节 ' + ss), p.x + 48, y + 22);
        ctx.textAlign = 'right'; ctx.fillStyle = d.has ? '#ffd24a' : '#5f6e58';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(d.has ? ('¥' + d.f.price) : '', p.x + p.w - 16, y + 9);
        ctx.textAlign = 'left';
      }
      if (pages > 1) {
        const cy = listY + 4 + per * dxH + 2;
        ctx.textAlign = 'center'; ctx.fillStyle = '#cfe8c0'; ctx.font = '11px sans-serif';
        ctx.fillText((page + 1) + ' / ' + pages + ' 页', p.x + p.w / 2, cy + 11);
        lineBtn({ x: p.x + 12, y: cy, w: 54, h: 22 }, '‹ 上页', () => { modal.page = Math.max(0, page - 1); });
        lineBtn({ x: p.x + p.w - 66, y: cy, w: 54, h: 22 }, '下页 ›', () => { modal.page = Math.min(pages - 1, page + 1); });
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
          const up = sellPrice(it.id) > itemPrice(it.id);
          shopRow(p, y, rowH, it.id, itemColor(it.id),
            itemName(it.id) + ' ×' + it.n,
            '单价 ¥' + sellPrice(it.id) + (up ? ' ↑' : ''),
            '+' + (sellPrice(it.id) * it.n), '卖', () => {
              const price = sellPrice(it.id) * it.n;
              addGold(price);
              const idx = S.bag.indexOf(it);
              if (idx >= 0) S.bag.splice(idx, 1);
              modal.page = 0; beep(1040, .1); saveGame();
            }, up ? '#4f9f47' : '#5f8f56');
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
      const sum = S.bag.reduce((a, it) => a + sellPrice(it.id) * it.n, 0);
      lineBtn({ x: p.x + 12, y: by, w: (p.w - 36) / 2, h: 32 }, '全部卖出 ¥' + sum, () => {
        let total = 0;
        S.bag.forEach(it => { total += sellPrice(it.id) * it.n; });
        addGold(total); S.bag = [];
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
    lineBtn({ x: p.x + 14, y: by, w: (p.w - 28) / 2, h: 32 }, '全部卖出 ¥' + S.bag.reduce((a, it) => a + sellPrice(it.id) * it.n, 0), () => {
      let total = 0; S.bag.forEach(it => { total += sellPrice(it.id) * it.n; });
      addGold(total); S.bag = []; beep(1180, .12); saveGame();
    }, '#4f7f47');
    lineBtn({ x: p.x + p.w / 2 + 8, y: by, w: (p.w - 28) / 2, h: 32 }, '关闭', () => { modal = null; });

  } else if (type === 'menu') {
    const p = panel(340, 320);
    drawPanel(p, '暂停菜单');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#e6eedd'; ctx.font = '11px sans-serif';
    ctx.fillText('第' + S.year + '年 · ' + curSeason() + '季 第' + S.day + '天   ' + fmtGold(S.gold), VW / 2, p.y + 46);
    const e = curEvent();
    if (e) {
      ctx.fillStyle = '#ffd24a'; ctx.font = '10px sans-serif';
      ctx.fillText('今日事件：' + e.name + ' · ' + e.desc, VW / 2, p.y + 60);
    }
    lineBtn({ x: p.x + 20, y: p.y + 70, w: 140, h: 38 }, '继续游戏', () => { modal = null; }, '#4f7f47', 'play');
    lineBtn({ x: p.x + 170, y: p.y + 70, w: 140, h: 38 }, '保存进度', () => { saveGame(); toastMsg('已保存到第' + curSlot + '号存档'); }, '#4f7f47', 'save');
    lineBtn({ x: p.x + 20, y: p.y + 118, w: 140, h: 38 }, '农场档案', () => { modal = { type: 'profile' }; }, '#3a5c37', 'trophy');
    lineBtn({ x: p.x + 170, y: p.y + 118, w: 140, h: 38 }, '游戏说明', () => { modal = { type: 'help' }; }, '#3a5c37', 'info');
    lineBtn({ x: p.x + 20, y: p.y + 166, w: 140, h: 38 }, '设置', () => { modal = { type: 'settings' }; }, '#3a5c37', 'gear');
    lineBtn({ x: p.x + 170, y: p.y + 166, w: 140, h: 38 }, '返回标题', () => { saveGame(); location.href = 'index.html'; }, '#3a5c37', 'exit');
    lineBtn({ x: p.x + 20, y: p.y + 214, w: 140, h: 38 }, '重新开始', () => resetGame(), '#8a5a30', 'reset');
    lineBtn({ x: p.x + 170, y: p.y + 214, w: 140, h: 38 }, '关闭', () => { modal = null; }, '#3a5c37', 'menu');

  } else if (type === 'help') {
    const p = panel(Math.min(VW - 20, 400), Math.min(VH - 20, 400));
    drawPanel(p, '游戏说明');
    const lines = [
      '■ 操作',
      '  · 左下摇杆移动，也可点地面自动走',
      '  · 右下「使用」键对目标生效',
      '  · 底部六格切换工具（键盘 1~6 同效）',
      '■ 种田流程',
      '  锄头翻土 → 双手播种 → 水壶浇水',
      '  每天浇水才会长，成熟后双手收获',
      '  走到屋门口按「使用」睡觉推进一天',
      '■ 赚钱',
      '  商店柜台前按「使用」买卖作物',
      '  斧头砍树得木材，镐子敲石得石头',
      '■ 钓鱼（月影森林的湖）',
      '  换钓竿（6）对着水面按「使用」抛竿',
      '  浮标猛沉就是咬钩，立刻再按「使用」',
      '  接着把游标拉进绿区再按一次「使用」',
      '  站得越靠深水，越能碰到稀有鱼',
      '■ 每天的节日',
      '  换季首日必出节日，另有小概率撞上',
      '  会改种子价 / 卖价 / 体力 / 生长 / 钓鱼',
      '  HUD 上有当日事件徽标，档案里能看收支',
      '■ 规则',
      '  每季 8 天、一年 4 季；体力用光只能睡觉',
      '  砍掉的树第二天会重新长出来',
      '  进度自动保存到本地存档'
    ];
    const lh = clamp(Math.floor((p.h - 96) / lines.length), 11, 18);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '11px sans-serif'; ctx.fillStyle = '#e6eedd';
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], p.x + 16, p.y + 40 + i * lh);
    ctx.textBaseline = 'middle';
    lineBtn({ x: p.x + p.w / 2 - 60, y: p.y + p.h - 40, w: 120, h: 30 }, '知道了', () => { modal = { type: 'menu' }; });

  } else if (type === 'profile') {
    /* 农场档案：把一直统计着但从没出口的 stats 摊开给玩家看 */
    const p = panel(Math.min(VW - 30, 400), Math.min(VH - 30, 372));
    drawPanel(p, '农场档案', '第' + S.year + '年 · ' + curSeason() + '季 第' + S.day + '天');
    const st = S.stats, fl = st.flow || { earn: 0, spend: 0 };
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    let y = p.y + 56;
    /* 当日收支卡 */
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(p.x + 14, y - 14, p.w - 28, 46);
    drawIcon('ledger', p.x + 30, y + 8, 20);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#8fe08a'; ctx.fillText('今日收入 ¥' + fl.earn, p.x + 48, y - 2);
    ctx.fillStyle = '#e8a08a'; ctx.fillText('今日支出 ¥' + fl.spend, p.x + 48, y + 16);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 13px sans-serif';
    ctx.fillText('净 ' + (fl.earn - fl.spend >= 0 ? '+' : '') + (fl.earn - fl.spend), p.x + p.w - 24, y + 7);
    y += 48;
    /* 累计统计：两列 */
    const stat = [
      ['经营天数', st.days + ' 天'],
      ['累计收获', st.harvest + ' 个'],
      ['累计售出', '¥' + st.earned],
      ['浇水次数', st.watered + ' 次'],
      ['木材 / 石头', (st.wood || 0) + ' / ' + (st.stone || 0)],
      ['钓到的鱼', (st.fishCount || 0) + ' 条（' + fishDex().filter(d => d.has).length + '/' + FISH.length + ' 种）']
    ];
    ctx.font = '12px sans-serif';
    for (let i = 0; i < stat.length; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const sx = p.x + 16 + col * ((p.w - 32) / 2), sy = y + row * 22;
      ctx.textAlign = 'left'; ctx.fillStyle = '#a9c49c'; ctx.font = '11px sans-serif';
      ctx.fillText(stat[i][0], sx, sy);
      ctx.fillStyle = '#fff8e0'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText(stat[i][1], sx, sy + 14);
    }
    y += Math.ceil(stat.length / 2) * 22 + 12;
    /* 作物产量 Top3 */
    ctx.fillStyle = '#cfe8c0'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('■ 作物产量', p.x + 16, y);
    y += 18;
    const bc = Object.keys(st.byCrop || {}).map(k => ({ k: k, n: st.byCrop[k] })).sort((a, b) => b.n - a.n);
    ctx.font = '11px sans-serif';
    if (!bc.length) { ctx.fillStyle = '#8b9a84'; ctx.fillText('还没有收成记录', p.x + 16, y + 8); y += 20; }
    else {
      for (let i = 0; i < Math.min(3, bc.length); i++) {
        ctx.fillStyle = '#e6eedd'; ctx.textAlign = 'left';
        ctx.fillText((i + 1) + '. ' + itemName(bc[i].k), p.x + 16, y + 8);
        ctx.textAlign = 'right'; ctx.fillStyle = '#ffd24a';
        ctx.fillText(bc[i].n + ' 个', p.x + p.w - 20, y + 8);
        y += 19;
      }
    }
    y += 6;
    /* 鱼获分布（只列已钓到的） */
    ctx.fillStyle = '#cfe8c0'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('■ 鱼获', p.x + 16, y);
    y += 18;
    const got = fishDex().filter(d => d.n > 0);
    if (!got.length) { ctx.fillStyle = '#8b9a84'; ctx.font = '11px sans-serif'; ctx.fillText('还没钓过鱼 —— 去月影森林试试钓竿', p.x + 16, y + 8); }
    else {
      ctx.font = '11px sans-serif';
      const line = got.map(d => d.f.name + '×' + d.n).join('  ');
      // 简单折行
      let row = '', rows = [];
      for (const w of line.split('  ')) {
        if ((row + w).length > 34) { rows.push(row.trim()); row = ''; }
        row += w + '  ';
      }
      if (row.trim()) rows.push(row.trim());
      for (let i = 0; i < Math.min(2, rows.length); i++) {
        ctx.fillStyle = '#e6eedd'; ctx.textAlign = 'left';
        ctx.fillText(rows[i], p.x + 16, y + 8 + i * 16);
      }
    }
    lineBtn({ x: p.x + p.w / 2 - 60, y: p.y + p.h - 40, w: 120, h: 30 }, '返回', () => { modal = { type: 'menu' }; });

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
