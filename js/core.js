/* ==========================================================
 * core.js — 存档（多槽位）与设置（开始页面与游戏页共用）
 * ========================================================== */
'use strict';

/* ============================ 应用常量 ============================ */
const APP_NAME = '月光牧场';
const APP_VERSION = '1.6.2';

/* ============================ 设置 ============================ */
const Settings = {
  KEY: 'moonranch.settings.v1',
  def: {
    sfx: true,        // 音效
    music: true,      // 背景音乐
    tapMove: true,    // 点地自动寻路
    joyScale: 1,      // 摇杆大小 0.85 / 1 / 1.15
    showGrid: false,  // 显示地块网格
    autoSave: true    // 自动存档
  },
  d: {},
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.KEY) || 'null'); } catch (e) { }
    this.d = Object.assign({}, this.def, d || {});
    return this.d;
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.d)); } catch (e) { }
  },
  set(k, v) { this.d[k] = v; this.save(); }
};
Settings.load();

/* ============================ 存档 ============================ */
/* 数据结构: { v:2, slot:1, at:时间戳, s:游戏状态, p:{x,y,dir}, map, cropMap, animals } */
const Save = {
  KEY: 'moonranch.save.v2',
  SLOTS: 3,
  all() {
    try {
      const d = JSON.parse(localStorage.getItem(this.KEY) || '{}');
      return d && typeof d === 'object' ? d : {};
    } catch (e) { return {}; }
  },
  write(slot, payload) {
    const db = this.all();
    db['s' + slot] = payload;
    try { localStorage.setItem(this.KEY, JSON.stringify(db)); } catch (e) { }
    return payload;
  },
  read(slot) {
    const db = this.all();
    return db['s' + slot] || null;
  },
  remove(slot) {
    const db = this.all();
    delete db['s' + slot];
    try { localStorage.setItem(this.KEY, JSON.stringify(db)); } catch (e) { }
  },
  hasSave() {
    const db = this.all();
    for (let i = 1; i <= this.SLOTS; i++) if (db['s' + i]) return true;
    return false;
  },
  /* 存档摘要，给开始页面用 */
  info(slot) {
    const d = this.read(slot);
    if (!d || !d.s) return null;
    return {
      slot: slot,
      at: d.at || 0,
      year: d.s.year,
      season: d.s.season,
      day: d.s.day,
      gold: d.s.gold,
      harvest: (d.s.stats && d.s.stats.harvest) || 0,
      days: (d.s.stats && d.s.stats.days) || 0
    };
  },
  list() {
    const out = [];
    for (let i = 1; i <= this.SLOTS; i++) out.push(this.info(i));
    return out;
  }
};
