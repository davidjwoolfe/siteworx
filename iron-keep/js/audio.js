'use strict';
// All sound is synthesised with WebAudio: no audio files.
const Snd = (() => {
let ac = null, master, nbuf, muted = false;
function init() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : .9;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
  master.connect(comp); comp.connect(ac.destination);
  nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  ambient();
}
function dest(pan) { if (!pan || !ac.createStereoPanner) return master; const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(master); return p; }
function envGain(t, o) { const g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(o.vol, t + (o.att || .003)); g.gain.exponentialRampToValueAtTime(.0001, t + o.dur); return g; }
function noise(o) {
  if (!ac || o.vol <= .002) return; const t = ac.currentTime + (o.delay || 0);
  const s = ac.createBufferSource(); s.buffer = nbuf; s.loop = true; s.playbackRate.value = o.rate || 1;
  const f = ac.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f0, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur); f.Q.value = o.q || .8;
  const g = envGain(t, o); s.connect(f); f.connect(g); g.connect(dest(o.pan)); s.start(t, Math.random() * 1.5); s.stop(t + o.dur + .05);
}
function tone(o) {
  if (!ac || o.vol <= .002) return; const t = ac.currentTime + (o.delay || 0);
  const s = ac.createOscillator(); s.type = o.wave || 'sine'; s.frequency.setValueAtTime(o.f0, t); if (o.f1) s.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  const g = envGain(t, o); let last = s;
  if (o.formants) { const mix = ac.createGain(); for (const [fq, q, gn] of o.formants) { const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fq; b.Q.value = q; const bg = ac.createGain(); bg.gain.value = gn; s.connect(b); b.connect(bg); bg.connect(mix); } last = mix; }
  last.connect(g); g.connect(dest(o.pan)); s.start(t); s.stop(t + o.dur + .05);
}
const AH = [[750, 6, 1], [1200, 7, .6], [2600, 8, .25]], AL = [[420, 5, 1], [1900, 8, .5], [2600, 8, .2]], OH = [[480, 5, 1], [850, 6, .6], [2500, 8, .15]];
const fx = {
  pistol(v, p) { noise({ type: 'bandpass', f0: 2600, f1: 500, q: .6, dur: .16, vol: .9 * v, pan: p }); noise({ type: 'lowpass', f0: 900, f1: 120, dur: .3, vol: .6 * v, pan: p }); tone({ f0: 170, f1: 48, dur: .16, vol: .8 * v, pan: p }); },
  smg(v, p) { noise({ type: 'bandpass', f0: 3400, f1: 900, q: .7, dur: .09, vol: .75 * v, pan: p }); noise({ type: 'lowpass', f0: 1300, f1: 200, dur: .16, vol: .45 * v, pan: p }); tone({ f0: 230, f1: 70, dur: .08, vol: .55 * v, pan: p }); },
  eshot(v, p) { noise({ type: 'bandpass', f0: 1800, f1: 400, q: .7, dur: .18, vol: .7 * v, pan: p }); tone({ f0: 140, f1: 50, dur: .14, vol: .5 * v, pan: p }); },
  dry(v) { noise({ type: 'bandpass', f0: 3200, q: 3, dur: .03, vol: .3 * v }); },
  click(v) { noise({ type: 'bandpass', f0: 2200, q: 2.5, dur: .035, vol: .22 * v }); },
  reload(v) { noise({ type: 'bandpass', f0: 2600, q: 3, dur: .04, vol: .35 * v }); noise({ type: 'bandpass', f0: 900, q: 2, dur: .09, vol: .4 * v, delay: .12 }); noise({ type: 'bandpass', f0: 1300, q: 2, dur: .07, vol: .45 * v, delay: .55 }); tone({ f0: 180, f1: 90, dur: .06, vol: .3 * v, delay: .55 }); noise({ type: 'bandpass', f0: 3000, q: 3, dur: .04, vol: .4 * v, delay: .82 }); noise({ type: 'bandpass', f0: 2000, q: 3, dur: .05, vol: .4 * v, delay: .92 }); },
  door(v, p) { noise({ type: 'bandpass', f0: 240, f1: 480, q: 1.5, dur: .5, att: .08, vol: .55 * v, pan: p }); tone({ wave: 'sawtooth', f0: 52, f1: 70, dur: .45, att: .05, vol: .12 * v, pan: p }); noise({ type: 'lowpass', f0: 300, dur: .12, vol: .5 * v, delay: .44, pan: p }); },
  doorclose(v, p) { noise({ type: 'bandpass', f0: 460, f1: 220, q: 1.5, dur: .45, att: .06, vol: .45 * v, pan: p }); noise({ type: 'lowpass', f0: 260, dur: .16, vol: .7 * v, delay: .42, pan: p }); tone({ f0: 80, f1: 40, dur: .14, vol: .5 * v, delay: .42, pan: p }); },
  locked(v) { noise({ type: 'bandpass', f0: 700, q: 3, dur: .05, vol: .5 * v }); noise({ type: 'bandpass', f0: 560, q: 3, dur: .06, vol: .5 * v, delay: .11 }); tone({ f0: 110, f1: 70, dur: .08, vol: .3 * v }); },
  push(v) { noise({ type: 'lowpass', f0: 130, dur: 2.6, att: .25, vol: .95 * v }); noise({ type: 'bandpass', f0: 420, f1: 300, q: 4, dur: 2.5, att: .3, vol: .3 * v }); tone({ wave: 'sawtooth', f0: 34, f1: 30, dur: 2.5, att: .3, vol: .22 * v }); noise({ type: 'lowpass', f0: 200, dur: .3, vol: .8 * v, delay: 2.45 }); },
  bark_guard(v, p) { noise({ type: 'highpass', f0: 2500, dur: .05, vol: .2 * v, pan: p }); tone({ wave: 'sawtooth', f0: 190, f1: 150, dur: .22, vol: .9 * v, pan: p, formants: AL, delay: .03 }); tone({ wave: 'sawtooth', f0: 210, f1: 120, dur: .3, vol: .9 * v, pan: p, formants: AH, delay: .27 }); },
  bark_officer(v, p) { tone({ wave: 'sawtooth', f0: 290, f1: 250, dur: .14, vol: .9 * v, pan: p, formants: AH }); tone({ wave: 'sawtooth', f0: 320, f1: 200, dur: .24, vol: .9 * v, pan: p, formants: AL, delay: .17 }); noise({ type: 'highpass', f0: 3500, dur: .06, vol: .2 * v, pan: p, delay: .4 }); },
  bark_elite(v, p) { tone({ wave: 'sawtooth', f0: 105, f1: 80, dur: .5, vol: 1.2 * v, pan: p, formants: OH }); tone({ wave: 'square', f0: 52, f1: 44, dur: .5, vol: .25 * v, pan: p }); noise({ type: 'bandpass', f0: 900, q: 2, dur: .45, att: .1, vol: .12 * v, pan: p }); },
  die_guard(v, p) { tone({ wave: 'sawtooth', f0: 250, f1: 95, dur: .55, vol: 1 * v, pan: p, formants: AH }); },
  die_officer(v, p) { tone({ wave: 'sawtooth', f0: 330, f1: 120, dur: .5, vol: 1 * v, pan: p, formants: AL }); tone({ wave: 'sawtooth', f0: 150, f1: 90, dur: .3, vol: .6 * v, pan: p, formants: OH, delay: .4 }); },
  die_elite(v, p) { tone({ wave: 'sawtooth', f0: 130, f1: 48, dur: .9, vol: 1.3 * v, pan: p, formants: OH }); noise({ type: 'lowpass', f0: 300, dur: .3, vol: .6 * v, pan: p, delay: .7 }); },
  pain(v, p) { tone({ wave: 'sawtooth', f0: 210, f1: 160, dur: .12, vol: .7 * v, pan: p, formants: AH }); },
  hit(v, p) { noise({ type: 'lowpass', f0: 1100, f1: 300, dur: .09, vol: .6 * v, pan: p }); tone({ f0: 320, f1: 140, dur: .06, vol: .3 * v, pan: p }); },
  ric(v, p) { noise({ type: 'highpass', f0: 3000, dur: .05, vol: .25 * v, pan: p }); tone({ wave: 'triangle', f0: 1800 + Math.random() * 1600, f1: 700, dur: .14, vol: .09 * v, pan: p }); },
  hurt(v) { noise({ type: 'lowpass', f0: 500, f1: 150, dur: .16, vol: .8 * v }); tone({ wave: 'sawtooth', f0: 150, f1: 100, dur: .2, vol: .7 * v, formants: OH }); },
  death(v) { tone({ wave: 'sawtooth', f0: 170, f1: 55, dur: 1.2, vol: 1 * v, formants: OH }); tone({ f0: 60, f1: 30, dur: 1.4, vol: .5 * v }); },
  step(v) { noise({ type: 'lowpass', f0: 260 + Math.random() * 120, dur: .09, vol: .28 * v }); tone({ f0: 85 + Math.random() * 20, f1: 50, dur: .07, vol: .2 * v }); },
  ammo(v) { noise({ type: 'bandpass', f0: 2400, q: 3, dur: .04, vol: .3 * v }); tone({ wave: 'triangle', f0: 520, dur: .09, vol: .22 * v, delay: .03 }); tone({ wave: 'triangle', f0: 780, dur: .12, vol: .22 * v, delay: .1 }); },
  health(v) { tone({ wave: 'triangle', f0: 440, dur: .12, vol: .25 * v }); tone({ wave: 'triangle', f0: 554, dur: .12, vol: .25 * v, delay: .09 }); tone({ wave: 'triangle', f0: 660, dur: .22, vol: .25 * v, delay: .18 }); },
  key(v) { [660, 880, 1100, 1320].forEach((f, i) => tone({ wave: 'triangle', f0: f, dur: .25, vol: .25 * v, delay: i * .08 })); },
  treasure(v) { [1320, 1760, 2090, 2640].forEach((f, i) => tone({ f0: f, dur: .3, vol: .16 * v, delay: i * .055 })); },
  weapon(v) { noise({ type: 'bandpass', f0: 1500, q: 2, dur: .08, vol: .5 * v }); tone({ wave: 'triangle', f0: 330, dur: .16, vol: .3 * v, delay: .05 }); tone({ wave: 'triangle', f0: 495, dur: .3, vol: .3 * v, delay: .16 }); },
  secret(v) { [392, 494, 587, 784].forEach((f, i) => tone({ wave: 'triangle', f0: f, dur: .5, vol: .2 * v, delay: .3 + i * .13 })); },
  heart(v) { tone({ f0: 62, f1: 40, dur: .13, vol: .7 * v }); tone({ f0: 56, f1: 38, dur: .15, vol: .5 * v, delay: .2 }); },
  win(v) { [392, 523, 659, 784, 1046].forEach((f, i) => tone({ wave: 'triangle', f0: f, dur: .7, vol: .25 * v, delay: i * .16 })); },
  crackle(v, p) { noise({ type: 'highpass', f0: 2200 + Math.random() * 3000, dur: .02 + Math.random() * .04, vol: v * (.3 + Math.random() * .7), pan: p }); },
};
function ambient() {
  const loop = (type, f, q, vol) => { const s = ac.createBufferSource(); s.buffer = nbuf; s.loop = true; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ac.createGain(); g.gain.value = vol; s.connect(fl); fl.connect(g); g.connect(master); s.start(); return { g, fl }; };
  loop('lowpass', 110, .7, .5);
  const wind = loop('bandpass', 420, 1.6, .035);
  const lfo = ac.createOscillator(); lfo.frequency.value = .07; const lg = ac.createGain(); lg.gain.value = 180; lfo.connect(lg); lg.connect(wind.fl.frequency); lfo.start();
  for (const [f, v] of [[49, .05], [73.6, .028], [98.3, .012]]) { const o = ac.createOscillator(); o.frequency.value = f; const g = ac.createGain(); g.gain.value = v; o.connect(g); g.connect(master); o.start(); const l = ac.createOscillator(); l.frequency.value = .05 + Math.random() * .1; const lg2 = ac.createGain(); lg2.gain.value = v * .6; l.connect(lg2); lg2.connect(g.gain); l.start(); }
}
return {
  init, play(name, vol = 1, pan = 0) { if (ac && fx[name]) fx[name](vol, pan); },
  get muted() { return muted; },
  setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : .9, ac.currentTime, .03); },
};
})();
