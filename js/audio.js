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
