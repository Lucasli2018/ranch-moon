/* ==========================================================
 * game.js — 主循环、输入、分辨率、启动引导
 * 依赖：config / utils / core / audio / state / world / render / ui
 * ========================================================== */
'use strict';

let modal = null;                 // {type:'sleep'|'dayend'|'shop'|'bag'|'menu'|'help'|'settings', tab}
let joy = { active: false, ox: 0, oy: 0, id: -1 };
let inputs = { left: false, right: false, up: false, down: false };
let tapTarget = null;             // 点地自动寻路目标（世界像素坐标）
/* hoverPt 在 render.js 声明（供即时模式按钮高亮），这里直接用 */
let saveTimer = 0, lastTs = 0, started = false;

/* ---------------- 工具函数 ---------------- */
function inRect(p, r) {
  return !!p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}
function toLogical(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * VH };
}

/* ---------------- 分辨率自适应 ---------------- */
function onResize() {
  const availW = window.innerWidth * 0.995, availH = window.innerHeight * 0.995;
  VW = clamp(Math.round(availW), 300, 480);
  VH = Math.round(clamp(VW * availH / availW, 300, 900));
  const s = Math.min(availW / VW, availH / VH);
  SCALE = clamp(Math.round(s), 1, 3);
  cv.width = VW * SCALE; cv.height = VH * SCALE;
  cv.style.width = (VW * SCALE) + 'px';
  cv.style.height = (VH * SCALE) + 'px';
  ctx = cv.getContext('2d', { alpha: false });
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  computeLayout();
  bakeMap();
}

/* ---------------- 指针输入 ---------------- */
function pointerDown(e) {
  e.preventDefault();
  if (cv.setPointerCapture) { try { cv.setPointerCapture(e.pointerId); } catch (err) { } }
  const p = toLogical(e);
  const L = LH;

  if (modal) {              // 弹窗内只响应弹窗按钮
    const keep = hoverPt; hoverPt = p;
    modalClick(p);
    hoverPt = keep;
    tapTarget = null;
    return;
  }

  // 摇杆
  const j = L.joy, d = Math.hypot(p.x - j.cx, p.y - j.cy);
  if (d <= j.r + 10) {
    joy.active = true; joy.id = e.pointerId;
    joy.ox = clamp((p.x - j.cx) / (j.r * 0.62), -1, 1);
    joy.oy = clamp((p.y - j.cy) / (j.r * 0.62), -1, 1);
    return;
  }
  // 工具格
  for (let i = 0; i < L.tools.length; i++) {
    if (inRect(p, L.tools[i])) { tool = TOOLS[i]; beep(700, .04); return; }
  }
  // 使用键
  if (Math.hypot(p.x - L.act.cx, p.y - L.act.cy) <= L.act.r + 6) { doUse(); return; }
  // HUD 按钮
  for (let i = 0; i < L.hudBtns.length; i++) {
    if (inRect(p, L.hudBtns[i])) { hudBtn(L.hudBtns[i].id); return; }
  }
  // 点世界：靠边走 / 点地自动寻路
  if (p.y > L.worldTop && p.y < L.worldBottom - 6) {
    if (p.x < 126) { joy.active = true; joy.id = e.pointerId; joy.ox = -1; joy.oy = 0; return; }
    if (p.x > L.act.cx - L.act.r - 22) { joy.active = true; joy.id = e.pointerId; joy.ox = 1; joy.oy = 0; return; }
    tapTarget = (Settings.d.tapMove !== false)
      ? { x: p.x + cam.x, y: p.y + cam.y - LH.worldTop }
      : null;
    if (tapTarget) beep(560, .04);
  }
}

function pointerMove(e) {
  const p = toLogical(e);
  hoverPt = p;
  if (joy.active && (e.pointerId === joy.id || joy.id === -1)) {
    const j = LH.joy;
    joy.ox = clamp((p.x - j.cx) / (j.r * 0.62), -1, 1);
    joy.oy = clamp((p.y - j.cy) / (j.r * 0.62), -1, 1);
  }
}

function pointerUp(e) {
  if (e.pointerId === joy.id) { joy.active = false; joy.ox = 0; joy.oy = 0; joy.id = -1; }
  hoverPt = null;
}

cv.addEventListener('pointerdown', pointerDown);
cv.addEventListener('pointermove', pointerMove);
cv.addEventListener('pointerup', pointerUp);
cv.addEventListener('pointercancel', pointerUp);
cv.addEventListener('pointerleave', function () { hoverPt = null; });
cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

/* ---------------- 键盘 ---------------- */
const KEY_DIR = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down'
};
window.addEventListener('keydown', function (e) {
  const d = KEY_DIR[e.code];
  if (d) { inputs[d] = true; e.preventDefault(); return; }
  if (e.code >= 'Digit1' && e.code <= 'Digit5') {
    tool = TOOLS[parseInt(e.code.slice(5), 10) - 1]; beep(700, .04); return;
  }
  if (e.code === 'Space' || e.code === 'KeyE') { doUse(); e.preventDefault(); return; }
  if (e.code === 'Escape') { modal ? (modal = null) : openMenu(); return; }
  if (e.code === 'KeyB') { openBag(); return; }
});
window.addEventListener('keyup', function (e) {
  const d = KEY_DIR[e.code];
  if (d) inputs[d] = false;
});

/* ---------------- 更新 ---------------- */
function update(dt) {
  frameNo++;
  if (toast.t > 0) toast.t -= dt;
  updateDust(dt);

  if (!modal) {
    // 时间流逝：HOUR_SEC 现实秒 = 1 游戏小时
    S.hour += dt / (HOUR_SEC / 60);
    if (S.hour >= DAY_HOURS && S.hour < DAY_HOURS + 0.8) {
      S.hour = DAY_HOURS;
      toastMsg('天黑了，回屋睡觉吧');
      sleepTick();
    }
  }

  // 移动方向
  let dx = 0, dy = 0;
  if (!joy.active && (inputs.left || inputs.right || inputs.up || inputs.down)) {
    if (inputs.left) dx--; if (inputs.right) dx++;
    if (inputs.up) dy--; if (inputs.down) dy++;
  } else if (!joy.active && tapTarget) {
    const ddx = tapTarget.x - player.x, ddy = tapTarget.y - player.y;
    const d = Math.hypot(ddx, ddy);
    if (d < 6) { tapTarget = null; }
    else {
      dx = ddx / d; dy = ddy / d;
      if (Math.abs(dx) > Math.abs(dy) + 0.2) dy = 0;
      else if (Math.abs(dy) > Math.abs(dx) + 0.2) dx = 0;
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    }
  }
  if (dx && dy) { const k = Math.SQRT1_2; dx *= k; dy *= k; }
  player.moving = !!(dx || dy);

  if (dx || dy) {
    if (dy < -0.3) player.dir = 0; else if (dy > 0.3) player.dir = 2;
    else if (dx < -0.3) player.dir = 3; else if (dx > 0.3) player.dir = 1;
    const nx = player.x + dx * STEP;
    if (!blockedAt(nx, player.y)) player.x = nx;
    const ny = player.y + dy * STEP;
    if (!blockedAt(player.x, ny)) player.y = ny;
    player.x = clamp(player.x, TILE, MAP_W * TILE - TILE);
    player.y = clamp(player.y, HUD_H + TILE, MAP_H * TILE - TILE);
    player.anim += dt;
    tapTarget = null;
  }

  // 相机
  const maxX = Math.max(0, MAP_W * TILE - VW);
  const maxY = Math.max(0, MAP_H * TILE - LH.worldH);
  const tx = clamp(player.x - VW / 2, 0, maxX);
  const ty = maxY > 0 ? clamp(player.y - LH.worldH / 2, 0, maxY) : -(LH.worldH - MAP_H * TILE) / 2;
  cam.x = lerp(cam.x, tx, 0.18);
  cam.y = lerp(cam.y, ty, 0.18);

  if (bakeSeason !== S.season) bakeMap();

  // 自动存档
  saveTimer += dt;
  if (Settings.d.autoSave !== false && saveTimer > 40) { saveTimer = 0; saveGame(); }
}

/* ---------------- 渲染主入口 ---------------- */
function render() {
  ctx.fillStyle = '#1b2416'; ctx.fillRect(0, 0, VW, VH);
  drawWorld();
  drawHUD();
  drawControls();
  // 提示条
  if (toast.t > 0) {
    ctx.globalAlpha = clamp(toast.t, 0, 1);
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(toast.msg).width + 24;
    const x = (VW - w) / 2, y = LH.worldBottom - 42;
    ctx.fillStyle = 'rgba(20,30,20,.82)'; ctx.fillRect(x, y, w, 26);
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, 25);
    ctx.fillStyle = '#fff8e0'; ctx.fillText(toast.msg, VW / 2, y + 13);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
  drawModal();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
}

function frame(ts) {
  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
  lastTs = ts;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

/* ---------------- 启动 ---------------- */
function init() {
  const q = new URLSearchParams(location.search);
  let slot = parseInt(q.get('slot') || '0', 10);
  if (!slot || slot < 1 || slot > Save.SLOTS) slot = 1;
  curSlot = slot;

  const fresh = q.get('new') === '1';
  let ok = false;
  if (!fresh) { try { ok = loadSave(slot); } catch (e) { ok = false; } }

  if (!ok || !S || !map || !map.length) {
    S = newGame(Math.floor(Math.random() * 99999), slot);
    spawnPlayer();
    toastMsg('欢迎来到月光牧场！先去田里翻地');
  }
  seedChoice();

  const ld = document.getElementById('loading');
  if (ld) ld.style.display = 'none';

  onResize();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', function () { setTimeout(onResize, 250); });

  bakeMap();
  saveGame();

  /* 调试 / 自动化接口 */
  window.MR = {
    state: () => S, player: player, tool: () => tool,
    setTool: function (t) { tool = t; },
    use: doUse, teleport: function (tx, ty) { player.x = tx * TILE + 8; player.y = ty * TILE + 8; },
    camTo: function (x, y) { cam.x = x; cam.y = y; },
    shop: openShop, bag: openBag, sleep: sleepTick, nextDay: nextDay,
    modal: () => modal, give: function (id, n) { bagAdd(id, n); },
    giveSeed: function (id, n) { seedAdd(id, n); },
    gold: function (n) { S.gold = n; }, crop: () => cropMap, tile: () => map,
    mapSize: function () { return [MAP_W, MAP_H]; },
    close: closeDayEnd, seed: function (id) { S.seedChoice = id; },
    plant: function (tx, ty, id, stage, wet) { map[ty][tx] = T.FARM; cropMap[ty][tx] = { id: id, stage: stage || 0, wetted: !!wet }; }
  };

  if (!started) { started = true; requestAnimationFrame(frame); }
}

/* 离开页面前存一次 */
window.addEventListener('beforeunload', function () { try { saveGame(); } catch (e) { } });
document.addEventListener('visibilitychange', function () {
  if (document.hidden) { try { saveGame(); } catch (e) { } }
});

init();
