/* ==========================================================
 * start.js — 开始页面逻辑：新游戏选槽 / 读档 / 说明 / 设置
 * 点击菜单按钮 → 弹出选择框（bottom sheet），不切换整页
 * 依赖 core.js（Settings / Save）
 * ========================================================== */
'use strict';

const $ = (s) => document.querySelector(s);

const SEASON_TAG = ['春', '夏', '秋', '冬'];

/* 本地时间戳格式化（开始页不加载 utils.js，这里自带一份） */
function when(ts) {
  const d = new Date(ts), p = function (n) { return (n < 10 ? '0' : '') + n; };
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

/* ---------------- 选择框（bottom sheet）基础 ---------------- */
let curDlg = null;      // 当前弹窗 id
let confirmCb = null;   // 确认框回调
let confirmBack = null; // 确认框是从哪个弹窗弹出的（关掉后要还原）

const DLG_TITLE = { pick: '选择存档槽', load: '读取存档', help: '游戏说明', set: '设置' };

function openDlg(id) {
  curDlg = id;
  const mask = $('#mask');
  $('#dlgTitle').textContent = DLG_TITLE[id] || '';
  const body = $('#dlgBody'), foot = $('#dlgFoot');
  body.innerHTML = ''; foot.innerHTML = ''; confirmCb = null;

  if (id === 'pick') { renderSlotPick(body); footClose('取消'); }
  else if (id === 'load') { renderSlots(body); footClose('关闭'); }
  else if (id === 'help') { body.innerHTML = HELP_HTML; footClose('知道了'); }
  else if (id === 'set') { body.innerHTML = SET_HTML; syncSettings(); footWipe(); footClose('关闭'); }

  mask.hidden = false;
  mask.classList.add('on');
}

function closeDlg() {
  if (!curDlg) return;
  curDlg = null; confirmCb = null;
  const mask = $('#mask');
  mask.classList.remove('on');
  setTimeout(function () { if (!curDlg) mask.hidden = true; }, 180);
}

/* 底部按钮组 */
function footBtn(label, cls, act) {
  const b = document.createElement('button');
  b.className = 'btn ' + (cls || 'ghost');
  b.textContent = label;
  b.dataset.act = act;
  $('#dlgFoot').appendChild(b);
  return b;
}
function footClose(label) { footBtn(label || '关闭', 'ghost', 'close'); }
function footWipe() {
  const b = document.createElement('button');
  b.className = 'btn danger';
  b.textContent = '清空全部存档';
  b.dataset.act = 'wipe';
  $('#dlgFoot').insertBefore(b, $('#dlgFoot').firstChild);
}

/* 确认框（取代原生 confirm，手机上更一致） */
function confirmDlg(opt, cb) {
  confirmCb = cb || null;
  confirmBack = curDlg;   // 取消后回到原来那个选择框
  $('#dlgTitle').textContent = opt.title || '请确认';
  const body = $('#dlgBody');
  body.innerHTML = '<div class="ctext">' + (opt.text || '') + '</div>';
  const foot = $('#dlgFoot');
  foot.innerHTML = '';
  footBtn('取消', 'ghost', 'cancel');
  footBtn(opt.ok || '确定', 'danger', 'ok');
  $('#mask').hidden = false;
  $('#mask').classList.add('on');
}

/* ---------------- 新游戏：选槽位 ---------------- */
function renderSlotPick(box) {
  for (let i = 1; i <= Save.SLOTS; i++) {
    const info = Save.info(i);
    const d = document.createElement('div');
    d.className = 'slot';
    d.innerHTML =
      '<div class="no">' + i + '</div>' +
      '<div class="info"><b>' + (info ? ('第' + info.year + '年 · ' + SEASON_TAG[info.season] + '季 第' + info.day + '天') : '空存档槽') + '</b>' +
      (info ? ('¥ ' + info.gold + ' · 累计收获 ' + info.harvest + ' · 存档于 ' + when(info.at)) : '从零开始，给你 500 启动资金') +
      '</div>';
    const ops = document.createElement('div');
    ops.className = 'ops';
    const b = document.createElement('button');
    b.className = 'mini go';
    b.textContent = info ? '覆盖' : '开始';
    b.dataset.act = info ? 'over' : 'new';
    b.dataset.slot = i;
    ops.appendChild(b);
    d.appendChild(ops);
    box.appendChild(d);
  }
  if (!Save.hasSave()) {
    const p = document.createElement('div');
    p.className = 'empty';
    p.style.marginTop = '8px';
    p.textContent = '（三个槽都是空的，选一个开始就行）';
    box.appendChild(p);
  }
}

function startNew(slot, overwrite) {
  const info = Save.info(slot);
  if (info && !overwrite) {
    confirmDlg({
      title: '覆盖存档',
      text: '第' + slot + '号存档已有进度（第' + info.year + '年第' + info.day + '天），开始新游戏会覆盖它。',
      ok: '覆盖并继续'
    }, function () { startNew(slot, true); });
    return;
  }
  saveLastSlot(slot);
  location.href = 'game.html?slot=' + slot + '&new=1';
}

function slotAction(btn) {
  const slot = parseInt(btn.dataset.slot, 10), act = btn.dataset.act;
  // 新开 / 覆盖都先弹选择框，由 startNew 内部判断要不要二次确认
  if (act === 'new' || act === 'over') { startNew(slot, false); }
  else if (act === 'play') { saveLastSlot(slot); location.href = 'game.html?slot=' + slot; }
  else if (act === 'del') {
    const info = Save.info(slot);
    confirmDlg({
      title: '删除存档',
      text: '删除第' + slot + '号存档（第' + info.year + '年第' + info.day + '天）？此操作不可恢复。',
      ok: '删除'
    }, function () { Save.remove(slot); if (curDlg === 'load') openDlg('load'); });
  }
}

/* ---------------- 读取存档 ---------------- */
function renderSlots(box) {
  let any = false;
  for (let i = 1; i <= Save.SLOTS; i++) {
    const info = Save.info(i);
    const d = document.createElement('div');
    d.className = 'slot';
    if (!info) {
      d.innerHTML =
        '<div class="no">' + i + '</div>' +
        '<div class="info"><b>空存档槽</b>没有进度</div>' +
        '<div class="ops"><button class="mini go" data-act="new" data-slot="' + i + '">开始</button></div>';
    } else {
      any = true;
      d.innerHTML =
        '<div class="no">' + i + '</div>' +
        '<div class="info"><b>第' + info.year + '年 · ' + SEASON_TAG[info.season] + '季 第' + info.day + '天</b>' +
        '¥ ' + info.gold + ' · 累计收获 ' + info.harvest + ' 个 · 已满 ' + info.days + ' 天<br>' +
        '<span style="opacity:.7">存档时间：' + when(info.at) + '</span></div>' +
        '<div class="ops">' +
        '<button class="mini go" data-act="play" data-slot="' + i + '">继续</button>' +
        '<button class="mini del" data-act="del" data-slot="' + i + '">删除</button>' +
        '</div>';
    }
    box.appendChild(d);
  }
  if (!any) {
    const p = document.createElement('div');
    p.className = 'empty';
    p.textContent = '（暂无存档，先点「开始新游戏」选个槽吧）';
    box.appendChild(p);
  }
}

/* ---------------- 说明 / 设置 内容 ---------------- */
const HELP_HTML = [
  '<div class="hsec"><span class="hb">操作</span>',
  '<p>· 左下角摇杆移动；也可以直接点地面，角色会自动走过去。</p>',
  '<p>· 右下角「使用」键：对着目标生效（浇水 / 收获 / 买卖 / 睡觉）。</p>',
  '<p>· 底部五个格子切换工具，键盘 1~5 同样可以。</p></div>',
  '<div class="hsec"><span class="hb">一天的流程</span>',
  '<p>锄头翻土 → 换「双手」点空地播种 → 水壶浇水 → 之后每天记得浇水 → 成熟后双手收获。</p>',
  '<p>作物必须每天浇水才会长；换季时还没成熟就会枯死。</p>',
  '<p>走到屋子门口按「使用」睡觉，时间和体力才会推进到第二天。</p></div>',
  '<div class="hsec"><span class="hb">赚钱</span>',
  '<p>走到商店柜台前按「使用」：买种子、卖作物 / 鸡蛋 / 牛奶 / 羊毛。</p>',
  '<p>斧头砍树得木材，镐子敲石得石头。牧场里的鸡、牛、羊每天产出东西，走过去按「使用」收取。</p></div>',
  '<div class="hsec"><span class="hb">规则</span>',
  '<p>每季 8 天，一年 4 季；体力用光只能睡觉。数据自动存档，共 3 个存档槽。</p></div>'
].join('');

const SET_HTML = [
  '<div class="row"><span>音效</span><button class="sw" data-key="sfx">开</button></div>',
  '<div class="row"><span>点地自动走</span><button class="sw" data-key="tapMove">开</button></div>',
  '<div class="row"><span>显示地块网格</span><button class="sw" data-key="showGrid">关</button></div>',
  '<div class="row"><span>自动存档</span><button class="sw" data-key="autoSave">开</button></div>',
  '<div class="row"><span>摇杆大小</span><span class="seg" id="segJoy">',
  '<button data-v="0.85">小</button><button data-v="1">中</button><button data-v="1.2">大</button>',
  '</span></div>',
  '<p class="note">共 3 个存档槽，进度存在本机浏览器（localStorage）；换浏览器或清缓存会丢。</p>'
].join('');

function syncSettings() {
  const sws = document.querySelectorAll('.sw');
  sws.forEach(function (b) {
    b.textContent = Settings.d[b.dataset.key] ? '开' : '关';
    b.classList.toggle('on', !!Settings.d[b.dataset.key]);
  });
  const lv = Settings.d.joyScale;
  document.querySelectorAll('#segJoy button').forEach(function (b) {
    b.classList.toggle('op', Math.abs(parseFloat(b.dataset.v) - lv) < 0.001);
  });
}

/* ---------------- 事件 ---------------- */
document.addEventListener('click', function (e) {
  const t = e.target;
  if (!t || !t.closest) return;

  // 点遮罩空白处 → 关闭选择框
  if (t === $('#mask')) { closeDlg(); return; }

  // 设置开关
  const sw = t.closest('.sw');
  if (sw) { Settings.set(sw.dataset.key, !Settings.d[sw.dataset.key]); syncSettings(); return; }

  // 摇杆大小
  const jb = t.closest('#segJoy button');
  if (jb) { Settings.set('joyScale', parseFloat(jb.dataset.v)); syncSettings(); return; }

  // 槽位上的按钮
  const sb = t.closest('button[data-slot]');
  if (sb) { slotAction(sb); return; }

  const b = t.closest('button[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'close') { closeDlg(); }
  else if (act === 'ok') { const cb = confirmCb; closeDlg(); if (cb) cb(); }
  else if (act === 'cancel' || act === 'back') {
    const back = confirmBack; closeDlg();
    if (back) openDlg(back);   // 还原原来的选择框（说明/设置内容也不丢）
  }
  else if (act === 'wipe') {
    confirmDlg({
      title: '清空存档',
      text: '清空全部 3 个存档？此操作不可恢复。',
      ok: '清空'
    }, function () {
      for (let i = 1; i <= Save.SLOTS; i++) Save.remove(i);
      toast2('存档已全部清空');
      openDlg('set');
    });
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && curDlg) closeDlg();
});

$('#dlgClose').onclick = closeDlg;

/* 小提示 */
let toastTimer = 0;
function toast2(msg) {
  let el = document.getElementById('t2');
  if (!el) {
    el = document.createElement('div');
    el.id = 't2';
    el.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:99;' +
      'background:rgba(20,30,20,.9);border:1px solid rgba(255,255,255,.25);border-radius:10px;' +
      'padding:10px 16px;color:#fff8e0;font-size:13px;letter-spacing:1px;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.style.display = 'none'; }, 1600);
}

/* ---------------- 进入游戏 ---------------- */
function saveLastSlot(slot) {
  try { localStorage.setItem('moonranch.last', String(slot)); } catch (e) { }
}
$('#btnNew').onclick = function () { openDlg('pick'); };
$('#btnLoad').onclick = function () { openDlg('load'); };
$('#btnHelp').onclick = function () { openDlg('help'); };
$('#btnSet').onclick = function () { openDlg('set'); };

/* ---------------- 启动 ---------------- */
$('#ver').textContent = APP_VERSION;

/* 首次进入给点引导 */
if (!Save.hasSave() && !sessionStorage.getItem('mr.visited')) {
  try { sessionStorage.setItem('mr.visited', '1'); } catch (e) { }
  setTimeout(function () { toast2('点「开始新游戏」，挑一个存档槽就能种田了'); }, 500);
}

/* 切到后台时把当前槽位挂起，游戏页负责落盘 */
document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    const last = parseInt(localStorage.getItem('moonranch.last') || '1', 10);
    try { localStorage.setItem('moonranch.pending', String(last)); } catch (e) { }
  }
});
