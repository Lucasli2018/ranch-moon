/* ==========================================================
 * audio.js — 极简 WebAudio 音效（可在设置里关闭）
 * ========================================================== */
'use strict';

let actx = null;
function beep(freq, dur, type) {
  if (!Settings.d.sfx) return;
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square'; o.frequency.value = freq || 440;
    g.gain.value = 0.05; o.connect(g); g.connect(actx.destination);
    const t = actx.currentTime;
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.09));
    o.start(t); o.stop(t + (dur || 0.09) + 0.02);
  } catch (e) { }
}

/* ======================= BGM（程序化小曲，设置里可关） ======================= */
/* 五声音阶轻快小循环：三角波旋律 + 正弦低音，每步 0.24s */
const BGM_MELODY = [
  523, 0, 659, 0, 784, 0, 659, 0, 523, 0, 440, 0, 392, 0, 440, 0,
  523, 0, 659, 0, 784, 0, 880, 0, 784, 0, 659, 0, 523, 0, 0, 0,
  440, 0, 523, 0, 659, 0, 523, 0, 440, 0, 392, 0, 330, 0, 392, 0,
  523, 0, 440, 0, 392, 0, 440, 0, 523, 0, 0, 0, 0, 0, 0, 0
];
const BGM_BASS = [131, 0, 0, 0, 165, 0, 0, 0, 147, 0, 0, 0, 196, 0, 0, 0];
let bgmTimer = null, bgmStep = 0;
function bgmTone(freq, dur, vol, type) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = freq;
  o.connect(g); g.connect(actx.destination);
  const t = actx.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.02);
}
function bgmTick() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') { actx.resume(); bgmStep = 0; return; }
    const m = BGM_MELODY[bgmStep % BGM_MELODY.length];
    if (m) bgmTone(m, 0.22, 0.028, 'triangle');
    const b = BGM_BASS[bgmStep % BGM_BASS.length];
    if (b) bgmTone(b, 0.42, 0.022, 'sine');
    bgmStep++;
  } catch (e) { }
}
function startBgm() {
  if (bgmTimer || !Settings.d.music) return;
  bgmTick();
  bgmTimer = setInterval(bgmTick, 240);
}
function stopBgm() {
  if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
}
