/* ==========================================================
 * ui.js — 布局计算、弹窗入口、存档/重置操作
 * ========================================================== */
'use strict';

let LH = {};   // 当前布局

function computeLayout() {
  const worldTop = HUD_H;
  const worldH = VH - HUD_H - CTRL_H;
  const tw = 32, gap = 5, total = TOOLS.length * tw + (TOOLS.length - 1) * gap;
  const x0 = (VW - total) / 2;
  const tools = [];
  for (let i = 0; i < TOOLS.length; i++) tools.push({ x: x0 + i * (tw + gap), y: VH - CTRL_H + 12, w: tw, h: tw });
  const js = Settings.d.joyScale || 1;
  LH = {
    worldTop: worldTop,
    worldH: worldH,
    worldBottom: HUD_H + worldH,
    joy: { cx: 58, cy: VH - CTRL_H / 2 - 2, r: Math.round(32 * js) },
    act: { cx: VW - 52, cy: VH - CTRL_H / 2, r: 30 },
    tools: tools,
    hudBtns: [
      { x: VW - 104, y: 3, w: 32, h: 22, id: 'shop' },
      { x: VW - 68, y: 3, w: 32, h: 22, id: 'bag' },
      { x: VW - 32, y: 3, w: 29, h: 22, id: 'menu' }
    ]
  };
}

function openShop() { modal = { type: 'shop', tab: 'seed' }; beep(520, .08); }
function openBag() { modal = { type: 'bag' }; beep(480, .08); }
function openMenu() { modal = { type: 'menu' }; beep(480, .08); }
function hudBtn(id) {
  if (id === 'shop') openShop();
  else if (id === 'bag') openBag();
  else openMenu();
}

function saveAndExit() {
  saveGame();
  location.href = 'index.html';
}

function resetGame() {
  if (!confirm('确定要重新开始吗？第' + curSlot + '号存档会被清空。')) return;
  deleteSave(curSlot);
  const seed = Math.floor(Math.random() * 99999);
  newGame(seed, curSlot);
  spawnPlayer();
  modal = null;
  bakeMap();
  toastMsg('新的一周目，加油！');
  saveGame();
}

function resetAllSaves() {
  if (!confirm('清空全部 3 个存档？此操作不可恢复。')) return;
  for (let i = 1; i <= Save.SLOTS; i++) Save.remove(i);
  modal = null;
  toastMsg('存档已全部清空');
  setTimeout(() => { location.href = 'index.html'; }, 900);
}
