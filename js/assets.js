/* ==========================================================
 * assets.js — 图片素材加载器（生成式像素素材）
 * 加载完成回调后重烘焙地图；未加载完成时全部绘制走程序化兜底
 * ========================================================== */
'use strict';

const ASSET_FILES = {
  player_down: 'player_down.png', player_left: 'player_left.png',
  player_right: 'player_right.png', player_up: 'player_up.png',
  an_chicken: 'an_chicken.png', an_cow: 'an_cow.png', an_sheep: 'an_sheep.png',
  house: 'house.png', shop: 'shop.png', barn: 'barn.png',
  tree: 'tree.png', rock: 'rock.png',
  tool_hoe: 'tool_hoe.png', tool_can: 'tool_can.png', tool_hand: 'tool_hand.png',
  tool_axe: 'tool_axe.png', tool_pick: 'tool_pick.png',
  npc_keeper: 'npc_keeper.png', npc_farmer: 'npc_farmer.png', npc_woodcutter: 'npc_woodcutter.png',
  ic_radish: 'ic_radish.png', ic_potato: 'ic_potato.png', ic_straw: 'ic_straw.png',
  ic_tomato: 'ic_tomato.png', ic_corn: 'ic_corn.png', ic_pine: 'ic_pine.png',
  ic_eggp: 'ic_eggp.png', ic_cab: 'ic_cab.png', ic_pump: 'ic_pump.png',
  ic_turnip: 'ic_turnip.png', ic_onion: 'ic_onion.png', ic_egg: 'ic_egg.png'
};
const ASSETS = {};            // name -> HTMLImageElement | null
let assetsReady = false;

function loadAssets(onDone) {
  const keys = Object.keys(ASSET_FILES);
  let left = keys.length;
  keys.forEach(function (k) {
    const im = new Image();
    im.onload = function () {
      ASSETS[k] = im;
      if (--left === 0) { assetsReady = true; if (onDone) onDone(); }
    };
    im.onerror = function () {
      if (--left === 0) { assetsReady = true; if (onDone) onDone(); }
    };
    im.src = 'assets/' + ASSET_FILES[k];
  });
}
/* 画素材（带兜底：素材不存在返回 false，调用方画程序化版本） */
function drawAsset(name, x, y, w, h, flip) {
  const im = ASSETS[name];
  if (!im) return false;
  if (w && h) {
    if (flip) {
      ctx.save();
      ctx.translate(Math.round(x) + w, Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(im, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(im, Math.round(x), Math.round(y), w, h);
    }
  } else {
    ctx.drawImage(im, Math.round(x), Math.round(y));
  }
  return true;
}
