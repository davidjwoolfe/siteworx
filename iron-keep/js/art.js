'use strict';
// Procedural art: every wall texture and sprite is drawn at load time, so the game ships no image files.
const Art = (() => {
const TS = 512, SS = 384;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rgb = (c, m = 1) => `rgb(${clamp(c[0]*m,0,255)|0},${clamp(c[1]*m,0,255)|0},${clamp(c[2]*m,0,255)|0})`;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Tileable fractal value noise with separate x/y periods.
function mkNoise(seed) {
  const perm = new Float32Array(4096), r = rng(seed);
  for (let i = 0; i < 4096; i++) perm[i] = r();
  const h = (x, y, px, py) => perm[((((x % px) + px) % px) * 37 + (((y % py) + py) % py) * 113) & 4095];
  function n(x, y, px, py) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = h(xi, yi, px, py), b = h(xi + 1, yi, px, py), c = h(xi, yi + 1, px, py), d = h(xi + 1, yi + 1, px, py);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  return (x, y, px, py, oct) => { let s = 0, a = .5, t = 0; for (let o = 0; o < oct; o++) { s += a * n(x * px, y * py, px, py); t += a; a *= .5; px *= 2; py *= 2; } return s / t; };
}
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
function copy(c) { const d = cv(c.width, c.height); d.getContext('2d').drawImage(c, 0, 0); return d; }
function shade(x, fn) {
  const im = x.getImageData(0, 0, TS, TS), d = im.data;
  for (let py = 0, i = 0; py < TS; py++) for (let px = 0; px < TS; px++, i += 4) { const m = fn(px / TS, py / TS); d[i] *= m; d[i + 1] *= m; d[i + 2] *= m; }
  x.putImageData(im, 0, 0);
}
function rr(x, X, Y, W, H, r, fill) { x.beginPath(); x.roundRect(X, Y, W, H, r); if (fill) { x.fillStyle = fill; x.fill(); } }
function ell(x, cx, cy, rx, ry, fill, stroke) { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) x.stroke(); }
function P(x, pts, fill, stroke) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke !== 0) x.stroke(); }

// ---------------------------------------------------------------- wall / floor textures
function blocks(x, o) {
  const r = rng(o.seed), g = o.gap ?? 3;
  x.fillStyle = o.mortar; x.fillRect(0, 0, TS, TS);
  const blk = (X, Y, w, h, col) => {
    rr(x, X + g, Y + g, w - 2 * g, h - 2 * g, o.round || 2, rgb(col));
    x.fillStyle = 'rgba(255,255,255,.10)'; x.fillRect(X + g, Y + g, w - 2 * g, 2); x.fillRect(X + g, Y + g, 2, h - 2 * g);
    x.fillStyle = 'rgba(0,0,0,.30)'; x.fillRect(X + g, Y + h - g - 3, w - 2 * g, 3); x.fillRect(X + w - g - 3, Y + g, 3, h - 2 * g);
  };
  let y = 0, ri = 0;
  for (const h of o.rows) {
    const off = o.brick ? (ri % 2 ? o.maxW / 2 : 0) : Math.floor(r() * o.maxW * .6);
    let bx = -off; const end = TS - off;
    while (bx < end - 1) {
      let w = Math.round(o.minW + r() * (o.maxW - o.minW)); if (end - (bx + w) < o.minW * .7) w = end - bx;
      const v = 1 + (r() - .5) * o.vary, t = o.tint || 0;
      const col = [o.base[0] * v + (r() - .5) * t, o.base[1] * v + (r() - .5) * t * .6, o.base[2] * v];
      for (const ox of [0, TS]) { const X = bx + ox; if (X < TS && X + w > 0) blk(X, y, w, h, col); }
      bx += w;
    }
    y += h; ri++;
  }
}
function weather(x, seed, amp, cracks, specks) {
  const r = rng(seed + 5), nz = mkNoise(seed + 9);
  x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 1.5;
  for (let k = 0; k < cracks; k++) { let px = r() * TS, py = r() * TS; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 6; j++) { px += (r() - .5) * 44; py += r() * 30; x.lineTo(px, py); } x.stroke(); }
  for (let k = 0; k < specks; k++) { x.fillStyle = r() < .55 ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.09)'; x.fillRect(r() * TS, r() * TS, 1 + r() * 2.5, 1 + r() * 2.5); }
  shade(x, (u, v) => 1 + amp * (nz(u, v, 5, 5, 5) - .5) * 2 + .09 * (r() - .5));
}
function stone(o) { const c = cv(TS), x = c.getContext('2d'); blocks(x, o); weather(x, o.seed, o.amp ?? .34, o.cracks ?? 7, o.specks ?? 500); return c; }
function planks(o) { // vertical (wall) or horizontal (floor) boards with grain
  const c = cv(TS), x = c.getContext('2d'), r = rng(o.seed), nz = mkNoise(o.seed + 3);
  x.fillStyle = '#120c08'; x.fillRect(0, 0, TS, TS);
  const n = o.n, w = TS / n;
  for (let i = 0; i < n; i++) {
    const v = 1 + (r() - .5) * .28, col = rgb(o.base, v);
    x.fillStyle = col;
    if (o.horiz) { const off = r() * TS; for (const ox of [-TS, 0]) { x.fillRect(off + ox + 2, i * w + 1.5, TS - 4, w - 3); } }
    else x.fillRect(i * w + 1.5, 0, w - 3, TS);
    x.fillStyle = 'rgba(255,255,255,.07)'; if (o.horiz) x.fillRect(0, i * w + 1.5, TS, 2); else x.fillRect(i * w + 1.5, 0, 2, TS);
    for (let k = 0; k < 2; k++) if (r() < .5) { const kx = o.horiz ? r() * TS : i * w + w * (.3 + r() * .4), ky = o.horiz ? i * w + w * (.3 + r() * .4) : r() * TS; ell(x, kx, ky, o.horiz ? 9 : 5, o.horiz ? 5 : 9, 'rgba(20,10,4,.55)'); }
  }
  shade(x, o.horiz ? (u, v) => .78 + .5 * nz(u, v, 3, 96, 4) + .06 * (r() - .5) : (u, v) => .78 + .5 * nz(u, v, 96, 3, 4) + .06 * (r() - .5));
  return c;
}
function woodPanel() {
  const c = planks({ seed: 31, n: 8, base: [104, 66, 36] }), x = c.getContext('2d');
  for (const [y, h] of [[0, 34], [300, 22], [470, 42]]) { x.fillStyle = '#3b2412'; x.fillRect(0, y, TS, h); x.fillStyle = 'rgba(255,220,160,.13)'; x.fillRect(0, y, TS, 3); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, y + h - 4, TS, 4); }
  for (let i = 0; i < 4; i++) { x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 3; x.strokeRect(i * 128 + 16, 52, 96, 230); x.strokeStyle = 'rgba(255,220,160,.08)'; x.strokeRect(i * 128 + 19, 55, 96, 230); }
  return c;
}
function wainscot() { // plaster above, dark timber below: the mess hall
  const c = cv(TS), x = c.getContext('2d'), nz = mkNoise(90), r = rng(90);
  x.fillStyle = '#9d927c'; x.fillRect(0, 0, TS, TS);
  shade(x, (u, v) => .82 + .36 * nz(u, v, 6, 6, 5) + .05 * (r() - .5));
  x.strokeStyle = 'rgba(40,30,20,.35)'; x.lineWidth = 1.2;
  for (let k = 0; k < 5; k++) { let px = r() * TS, py = r() * 250; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 5; j++) { px += (r() - .5) * 50; py += r() * 26; x.lineTo(px, py); } x.stroke(); }
  x.drawImage(planks({ seed: 33, n: 8, base: [88, 54, 30] }), 0, 300, TS, 212, 0, 300, TS, 212);
  for (const [y, h] of [[0, 30], [288, 26], [478, 34]]) { x.fillStyle = '#34200f'; x.fillRect(0, y, TS, h); x.fillStyle = 'rgba(255,220,160,.14)'; x.fillRect(0, y, TS, 3); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, y + h - 4, TS, 4); }
  for (const bx of [0, 256]) { x.fillStyle = '#3a2412'; x.fillRect(bx - 14, 30, 28, 258); x.fillRect(bx + TS - 14, 30, 28, 258); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(bx + 10, 30, 4, 258); }
  return c;
}
function steel() {
  const c = cv(TS), x = c.getContext('2d'), r = rng(44), nz = mkNoise(44);
  x.fillStyle = '#15171a'; x.fillRect(0, 0, TS, TS);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const X = i * 256, Y = j * 256; x.fillStyle = rgb([82, 90, 98], 1 + (r() - .5) * .16); x.fillRect(X + 3, Y + 3, 250, 250);
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(X + 3, Y + 3, 250, 3); x.fillRect(X + 3, Y + 3, 3, 250);
    x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(X + 3, Y + 249, 250, 4); x.fillRect(X + 249, Y + 3, 4, 250);
    for (const [rx, ry] of [[22, 22], [234, 22], [22, 234], [234, 234], [128, 22], [128, 234]]) { ell(x, X + rx, Y + ry, 7, 7, '#2e3238'); ell(x, X + rx - 1.5, Y + ry - 1.5, 4, 4, '#9aa4ad'); }
  }
  x.strokeStyle = 'rgba(200,210,220,.12)'; x.lineWidth = 1; for (let k = 0; k < 60; k++) { const px = r() * TS, py = r() * TS; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - .5) * 90, py + (r() - .5) * 14); x.stroke(); }
  for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#1a1a1a' : '#a8861c'; P(x, [[i * 32, 512], [i * 32 + 32, 512], [i * 32 + 52, 480], [i * 32 + 20, 480]], x.fillStyle, 0); }
  x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, 476, TS, 4);
  shade(x, (u, v) => .8 + .4 * nz(u, v, 6, 6, 5) + .05 * (r() - .5));
  return c;
}
function banner(x, cx = 256) {
  x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(cx - 90, 54, 200, 396);
  const g = x.createLinearGradient(cx - 96, 0, cx + 96, 0);
  [[0, '#4f0b0e'], [.18, '#a01a1c'], [.34, '#77121a'], [.55, '#ad1e20'], [.76, '#7a1316'], [1, '#4c090c']].forEach(s => g.addColorStop(s[0], s[1]));
  P(x, [[cx - 96, 48], [cx + 96, 48], [cx + 96, 432], [cx, 392], [cx - 96, 432]], g, 0);
  x.strokeStyle = '#b8922e'; x.lineWidth = 5; x.beginPath(); x.moveTo(cx - 86, 52); x.lineTo(cx - 86, 414); x.lineTo(cx, 380); x.lineTo(cx + 86, 414); x.lineTo(cx + 86, 52); x.stroke();
  ell(x, cx, 204, 60, 60, '#d6cfbb');
  x.fillStyle = '#141416'; x.fillRect(cx - 26, 182, 52, 56); for (const o of [-33, -8, 17]) x.fillRect(cx + o, 160, 16, 24); x.fillRect(cx - 36, 236, 72, 10);
  x.fillStyle = '#d6cfbb'; x.fillRect(cx - 7, 212, 14, 24); ell(x, cx, 212, 7, 7, '#d6cfbb');
  const s = x.createLinearGradient(0, 48, 0, 432); s.addColorStop(0, 'rgba(0,0,0,.35)'); s.addColorStop(.15, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,.3)');
  P(x, [[cx - 96, 48], [cx + 96, 48], [cx + 96, 432], [cx, 392], [cx - 96, 432]], s, 0);
  x.fillStyle = '#26262a'; x.fillRect(cx - 114, 38, 228, 12); ell(x, cx - 114, 44, 9, 9, '#9a7a2c'); ell(x, cx + 114, 44, 9, 9, '#9a7a2c');
}
function archPath(x, l, r, top, bot) { const cx = (l + r) / 2, rad = (r - l) / 2; x.beginPath(); x.moveTo(l, bot); x.lineTo(l, top + rad); x.arc(cx, top + rad, rad, Math.PI, 0); x.lineTo(r, bot); x.closePath(); }
function windowDeco(x, e) {
  archPath(x, 158, 354, 66, 416); x.fillStyle = '#17171a'; x.fill();
  archPath(x, 176, 336, 86, 400); const g = x.createLinearGradient(0, 86, 0, 400); g.addColorStop(0, '#16284f'); g.addColorStop(1, '#3d62a0'); x.fillStyle = g; x.fill();
  const m = x.createRadialGradient(296, 160, 4, 296, 160, 70); m.addColorStop(0, '#f2f6ff'); m.addColorStop(.3, '#c8d8ff'); m.addColorStop(.34, 'rgba(150,180,255,.5)'); m.addColorStop(1, 'rgba(120,160,255,0)');
  x.save(); archPath(x, 176, 336, 86, 400); x.clip(); x.fillStyle = m; x.fillRect(176, 86, 160, 314); x.restore();
  archPath(e, 176, 336, 86, 400); e.fillStyle = '#b0b0b0'; e.fill(); ell(e, 296, 160, 24, 24, '#fff');
  for (const c of [x, e]) { c.strokeStyle = c === x ? '#0b0b0d' : '#000'; c.lineWidth = 7; c.beginPath(); for (const vx of [216, 256, 296]) { c.moveTo(vx, 86); c.lineTo(vx, 400); } for (const hy of [190, 260, 330]) { c.moveTo(176, hy); c.lineTo(336, hy); } c.stroke(); }
  x.fillStyle = '#6f7076'; x.fillRect(150, 404, 212, 16); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(150, 420, 212, 6);
}
function glassDeco(x, e) {
  const r = rng(71), pal = ['#1c3fa8', '#a3161c', '#c98a12', '#1d7a44', '#5b2a9a', '#2a78c0'];
  archPath(x, 150, 362, 40, 440); x.fillStyle = '#141416'; x.fill();
  x.save(); archPath(x, 168, 344, 60, 424); x.clip();
  for (let j = 0; j < 14; j++) for (let i = 0; i < 8; i++) { const X = 168 + i * 28 + (j % 2 ? 14 : 0) - 14, Y = 50 + j * 28; P(x, [[X + 14, Y], [X + 28, Y + 14], [X + 14, Y + 28], [X, Y + 14]], pal[(r() * 6) | 0], 0); }
  ell(x, 256, 190, 44, 44, '#e8c040'); x.fillStyle = '#7a1216'; x.fillRect(248, 150, 16, 80); x.fillRect(226, 172, 60, 16);
  x.strokeStyle = '#0c0c0e'; x.lineWidth = 3; for (let j = -2; j < 30; j++) { x.beginPath(); x.moveTo(140, 50 + j * 28); x.lineTo(140 + 400, 50 + j * 28 + 400); x.moveTo(372, 50 + j * 28); x.lineTo(372 - 400, 50 + j * 28 + 400); x.stroke(); }
  x.restore();
  archPath(e, 168, 344, 60, 424); e.fillStyle = '#c8c8c8'; e.fill();
}
function rackDeco(x) {
  for (const y of [150, 392]) { x.fillStyle = '#3a2412'; x.fillRect(40, y, 432, 24); x.fillStyle = 'rgba(255,220,160,.15)'; x.fillRect(40, y, 432, 3); x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(40, y + 24, 432, 6); }
  for (const gx of [100, 204, 308, 412]) {
    x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(gx - 2, 70, 16, 380);
    x.fillStyle = '#23252a'; x.fillRect(gx - 4, 62, 8, 250); x.fillStyle = '#5c6068'; x.fillRect(gx - 4, 62, 2, 250);
    P(x, [[gx - 9, 250], [gx + 9, 250], [gx + 15, 440], [gx - 15, 440]], '#5e3a1c', 0); x.fillStyle = 'rgba(255,200,140,.18)'; x.fillRect(gx - 8, 252, 3, 180);
    x.fillStyle = '#17181b'; x.fillRect(gx - 11, 300, 22, 12); x.fillRect(gx + 6, 286, 12, 5); x.fillRect(gx - 7, 50, 14, 14);
  }
}
function bookshelf() {
  const c = cv(TS), x = c.getContext('2d'), r = rng(52), nz = mkNoise(52);
  x.fillStyle = '#24150a'; x.fillRect(0, 0, TS, TS);
  const pal = ['#5a1a1a', '#1f3a2a', '#28304f', '#5a4420', '#3b2140', '#6a5a3a', '#2a2a2a', '#70301c'];
  for (let s = 0; s < 4; s++) {
    const y0 = 22 + s * 122; x.fillStyle = '#0d0805'; x.fillRect(20, y0, 472, 104);
    let bx = 24; while (bx < 480) { const w = 14 + r() * 22, h = 70 + r() * 30; if (bx + w > 488) break; if (r() < .9) { x.fillStyle = pal[(r() * pal.length) | 0]; x.fillRect(bx, y0 + 104 - h, w - 2, h); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(bx, y0 + 104 - h, 2, h); if (r() < .6) { x.fillStyle = '#b8922e'; x.fillRect(bx + 2, y0 + 104 - h + 10, w - 6, 3); x.fillRect(bx + 2, y0 + 92, w - 6, 3); } } bx += w; }
    x.fillStyle = '#4a2c14'; x.fillRect(0, y0 + 104, TS, 18); x.fillStyle = 'rgba(255,220,160,.15)'; x.fillRect(0, y0 + 104, TS, 3);
  }
  x.fillStyle = '#4a2c14'; x.fillRect(0, 0, 20, TS); x.fillRect(492, 0, 20, TS); x.fillRect(0, 0, TS, 22);
  shade(x, (u, v) => .85 + .3 * nz(u, v, 8, 8, 4)); return c;
}
function mapDeco(x) {
  const r = rng(63);
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(104, 78, 320, 220); x.fillStyle = '#6b4a1e'; x.fillRect(96, 68, 320, 220); x.fillStyle = '#c9b88a'; x.fillRect(110, 82, 292, 192);
  x.strokeStyle = '#5a4526'; x.lineWidth = 2; for (let k = 0; k < 5; k++) { let px = 120 + r() * 250, py = 92 + r() * 60; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 9; j++) { px = clamp(px + (r() - .5) * 60, 114, 398); py = clamp(py + r() * 26, 86, 270); x.lineTo(px, py); } x.stroke(); }
  x.strokeStyle = '#a3161c'; x.lineWidth = 4; x.beginPath(); x.moveTo(150, 240); x.quadraticCurveTo(240, 150, 340, 130); x.stroke(); P(x, [[340, 118], [362, 128], [342, 144]], '#a3161c', 0);
  for (let k = 0; k < 5; k++) ell(x, 130 + r() * 250, 100 + r() * 150, 5, 5, '#a3161c');
}
function door(kind) {
  const steelDoor = kind === 1;
  const c = steelDoor ? cv(TS) : planks({ seed: 21 + kind, n: 6, base: kind === 2 ? [58, 38, 24] : [98, 62, 32] }), x = c.getContext('2d');
  if (steelDoor) { const r = rng(8), nz = mkNoise(8); x.fillStyle = '#5c6670'; x.fillRect(0, 0, TS, TS); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 4; x.strokeRect(40, 40, 432, 200); x.strokeRect(40, 272, 432, 200); shade(x, (u, v) => .8 + .4 * nz(u, v, 6, 6, 5) + .05 * (r() - .5)); }
  const metal = kind === 2 ? ['#d6a72c', '#8a6412', '#ffe9a0'] : kind === 1 ? ['#c4ced6', '#6d7780', '#ffffff'] : ['#2c2e33', '#141518', '#666a72'];
  for (const y of [56, 244, 430]) { x.fillStyle = metal[1]; x.fillRect(0, y + 4, TS, 30); x.fillStyle = metal[0]; x.fillRect(0, y, TS, 28); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, y, TS, 3); for (let i = 0; i < 8; i++) { ell(x, 32 + i * 64, y + 14, 6, 6, metal[1]); ell(x, 31 + i * 64, y + 13, 3, 3, metal[2]); } }
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 0, 14, TS); x.fillRect(498, 0, 14, TS); x.fillRect(0, 0, TS, 12);
  if (kind) { rr(x, 356, 276, 96, 132, 8, metal[1]); rr(x, 360, 280, 88, 124, 6, metal[0]); ell(x, 404, 326, 13, 13, '#0a0a0a'); P(x, [[397, 330], [411, 330], [416, 372], [392, 372]], '#0a0a0a', 0); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(362, 282, 84, 4); }
  else { x.strokeStyle = '#17181b'; x.lineWidth = 9; ell(x, 410, 330, 24, 24, null, 1); ell(x, 410, 302, 9, 9, '#2c2e33'); }
  return c;
}
function jamb() {
  const c = cv(TS), x = c.getContext('2d'), nz = mkNoise(4); x.fillStyle = '#3a2716'; x.fillRect(0, 0, TS, TS);
  x.fillStyle = '#0c0c0e'; x.fillRect(206, 0, 100, TS); x.fillStyle = '#4e5660'; x.fillRect(196, 0, 10, TS); x.fillRect(306, 0, 10, TS);
  shade(x, (u, v) => .75 + .5 * nz(u, v, 48, 3, 4)); return c;
}
function exitGate(base) {
  const c = copy(base), x = c.getContext('2d'), e = cv(TS), ex = e.getContext('2d');
  archPath(x, 56, 456, 96, 512); x.fillStyle = '#0c0c0e'; x.fill();
  x.save(); archPath(x, 70, 442, 112, 512); x.clip(); x.drawImage(planks({ seed: 27, n: 8, base: [74, 48, 26] }), 0, 0);
  for (const y of [190, 330, 462]) { x.fillStyle = '#1c1d21'; x.fillRect(60, y, 400, 26); for (let i = 0; i < 9; i++) ell(x, 84 + i * 43, y + 13, 6, 6, '#6a6e76'); }
  x.fillStyle = '#060606'; x.fillRect(252, 100, 8, 420); x.restore();
  rr(x, 176, 22, 160, 60, 6, '#0d1a10'); rr(x, 182, 28, 148, 48, 4, '#1f7a36');
  x.fillStyle = '#d8ffe0'; x.font = 'bold 40px Arial'; x.textAlign = 'center'; x.fillText('EXIT', 256, 67);
  rr(ex, 182, 28, 148, 48, 4, '#e0e0e0');
  return { c, e };
}
function tiles() {
  const c = cv(TS), x = c.getContext('2d'), r = rng(15), nz = mkNoise(15);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const d = (i + j) % 2; x.fillStyle = rgb(d ? [58, 54, 54] : [150, 142, 126], 1 + (r() - .5) * .14); x.fillRect(i * 128, j * 128, 128, 128); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(i * 128, j * 128, 128, 2); x.fillRect(i * 128, j * 128, 2, 128); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(i * 128, j * 128 + 125, 128, 3); x.fillRect(i * 128 + 125, j * 128, 3, 128); }
  shade(x, (u, v) => .78 + .44 * nz(u, v, 6, 6, 5) + .07 * (r() - .5)); return c;
}
function carpet() {
  const c = cv(TS), x = c.getContext('2d'), r = rng(19), nz = mkNoise(19);
  x.fillStyle = '#6e1418'; x.fillRect(0, 0, TS, TS);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const X = i * 128 + 64, Y = j * 128 + 64; x.strokeStyle = 'rgba(190,150,60,.5)'; x.lineWidth = 3; P(x, [[X, Y - 44], [X + 44, Y], [X, Y + 44], [X - 44, Y]], '#541014'); ell(x, X, Y, 9, 9, 'rgba(190,150,60,.6)'); }
  shade(x, (u, v) => .8 + .3 * nz(u, v, 8, 8, 4) + .16 * (r() - .5)); return c;
}
function plaster() {
  const c = cv(TS), x = c.getContext('2d'), r = rng(23), nz = mkNoise(23);
  x.fillStyle = '#6f675a'; x.fillRect(0, 0, TS, TS);
  x.strokeStyle = 'rgba(20,15,10,.4)'; x.lineWidth = 1.3; for (let k = 0; k < 9; k++) { let px = r() * TS, py = r() * TS; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 7; j++) { px += (r() - .5) * 60; py += (r() - .5) * 60; x.lineTo(px, py); } x.stroke(); }
  shade(x, (u, v) => .7 + .6 * nz(u, v, 5, 5, 5) + .05 * (r() - .5)); return c;
}
function beams() {
  const c = planks({ seed: 29, n: 8, base: [58, 38, 22], horiz: true }), x = c.getContext('2d');
  for (const bx of [-28, 228, 484]) { x.fillStyle = '#1c1008'; x.fillRect(bx, 0, 56, TS); x.fillStyle = 'rgba(255,200,140,.10)'; x.fillRect(bx, 0, 4, TS); x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(bx + 56, 0, 10, TS); }
  return c;
}

const texList = [], T = {};
function addTex(name, c, e) { T[name] = texList.length; texList.push({ c, e }); }
function deco(base, fn) { const c = copy(base), e = cv(TS); fn(c.getContext('2d'), e.getContext('2d')); return [c, e]; }
function buildTextures() {
  const R4 = [128, 128, 128, 128];
  const st = stone({ seed: 1, rows: R4, minW: 120, maxW: 230, base: [112, 114, 120], vary: .24, tint: 8, mortar: '#26262a' });
  const stv = stone({ seed: 2, rows: R4, minW: 120, maxW: 230, base: [103, 104, 108], vary: .2, tint: 14, mortar: '#222226', cracks: 16 });
  const br = stone({ seed: 3, rows: [64, 64, 64, 64, 64, 64, 64, 64], minW: 128, maxW: 128, brick: 1, base: [124, 54, 42], vary: .3, tint: 22, mortar: '#3b332d', amp: .26, cracks: 3 });
  const lime = stone({ seed: 4, rows: [170, 171, 171], minW: 200, maxW: 300, base: [164, 156, 136], vary: .14, tint: 10, mortar: '#4a453a', amp: .24 });
  const cel = stone({ seed: 5, rows: [100, 92, 112, 96, 112], minW: 70, maxW: 190, base: [74, 78, 72], vary: .32, tint: 10, mortar: '#141614', round: 9, gap: 4, amp: .42, cracks: 10 });
  const celv = copy(cel); { const x = celv.getContext('2d'); x.strokeStyle = 'rgba(215,210,190,.33)'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(232, 226); x.lineTo(280, 286); x.moveTo(282, 228); x.lineTo(230, 284); x.stroke(); }
  const wd = woodPanel(), wn = wainscot(), stl = steel();
  addTex('STONE', st); addTex('STONE_V', stv); addTex('BRICK', br); addTex('WOOD', wd); addTex('WAINSCOT', wn);
  addTex('STEEL', stl); addTex('LIME', lime); addTex('CELLAR', cel); addTex('CELLAR_V', celv);
  addTex('BANNER', deco(st, x => banner(x))[0]); addTex('BANNER_B', deco(br, x => banner(x))[0]); addTex('BANNER_W', deco(wn, x => banner(x))[0]);
  addTex('WINDOW', ...deco(st, windowDeco)); addTex('WINDOW_W', ...deco(wn, windowDeco)); addTex('WINDOW_Q', ...deco(wd, windowDeco));
  addTex('MAP', deco(wd, mapDeco)[0]); addTex('BOOKS', bookshelf()); addTex('RACK', deco(stl, rackDeco)[0]); addTex('GLASS', ...deco(lime, glassDeco));
  addTex('DOOR', door(0)); addTex('DOOR_S', door(1)); addTex('DOOR_G', door(2)); addTex('JAMB', jamb());
  const eg = exitGate(st); addTex('EXIT', eg.c, eg.e);
  addTex('F_FLAG', stone({ seed: 6, rows: R4, minW: 100, maxW: 180, base: [84, 84, 90], vary: .22, tint: 6, mortar: '#17171a', amp: .4 }));
  addTex('F_WOOD', planks({ seed: 7, n: 8, base: [92, 60, 34], horiz: true }));
  addTex('F_TILE', tiles());
  addTex('F_COBBLE', stone({ seed: 9, rows: [64, 64, 64, 64, 64, 64, 64, 64], minW: 48, maxW: 92, base: [66, 64, 60], vary: .34, tint: 8, mortar: '#0e0e0e', round: 14, gap: 4, amp: .4, cracks: 0 }));
  addTex('F_CARPET', carpet());
  addTex('C_STONE', stone({ seed: 10, rows: [256, 256], minW: 200, maxW: 300, base: [58, 58, 64], vary: .16, tint: 4, mortar: '#101012', amp: .4 }));
  addTex('C_WOOD', beams()); addTex('C_PLASTER', plaster());
}
// RGBA bytes for one wall layer: alpha carries the emissive mask (1 = fully lit by the lightmap).
function texPixels(i) {
  const t = texList[i], d = t.c.getContext('2d').getImageData(0, 0, TS, TS).data, out = new Uint8Array(d.buffer.slice(0));
  if (t.e) { const e = t.e.getContext('2d').getImageData(0, 0, TS, TS).data; for (let k = 0; k < out.length; k += 4) out[k + 3] = 255 - ((e[k] * e[k + 3] / 255) * .7 | 0); }
  else for (let k = 3; k < out.length; k += 4) out[k] = 255;
  return out;
}

// ---------------------------------------------------------------- sprites (drawn in a 100x100 space, floor at y=100)
const sprList = [], S = {};
const OUT = 'rgba(8,8,10,.92)';
function spr(name, fn) { const c = cv(SS), x = c.getContext('2d'); x.scale(SS / 100, SS / 100); x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = OUT; x.lineWidth = .9; fn(x); S[name] = sprList.length; sprList.push(c); }
function limb(x, pts, w, col) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.strokeStyle = OUT; x.lineWidth = w + 1.7; x.stroke(); x.strokeStyle = col; x.lineWidth = w; x.stroke(); x.strokeStyle = OUT; x.lineWidth = .9; }
function star(x, cx, cy, ro, ri, n, rot = 0) { x.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i % 2 ? ri : ro; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); }
const TYPES = {
  guard: { w: 1, h: 1, coat: ['#8a9778', '#4d5744'], pants: '#4c5446', boot: '#17171a', skin: '#dba87e', helm: '#5c6652', head: 'helmet', gun: 'pistol', trim: '#2c3028' },
  officer: { w: .95, h: 1.04, coat: ['#56607a', '#232732'], pants: '#272a33', boot: '#0d0d0f', skin: '#e3b48e', helm: '#262a35', head: 'cap', gun: 'pistol', trim: '#b01f1f', long: 1 },
  elite: { w: 1.24, h: 1.1, coat: ['#63666e', '#292a2f'], pants: '#232428', boot: '#0b0b0d', skin: '#2a2b30', helm: '#3a3d44', head: 'mask', gun: 'smg', trim: '#b3261e' },
};
function soldier(x, T, p) {
  const f = p.fall || 0;
  if (f > .9) ell(x, 50, 95.5, 36, 4.2, '#560a0a');
  x.save(); x.translate(50 + 38 * f, 97 - 8 * f); x.rotate(-1.5 * f - (p.tilt || 0)); x.scale(T.w, T.h * (p.sq || 1));
  const bob = p.bob || 0;
  const leg = (s, lift, wide) => {
    const hx = s * 5, fx = s * (6 + wide), fy = -lift;
    P(x, [[hx - 4.7, -41], [hx + 4.7, -41], [fx + 4, fy - 13], [fx - 4, fy - 13]], T.pants);
    P(x, [[fx - 4.2, fy - 15], [fx + 4.2, fy - 15], [fx + 4.6, fy - 3], [fx + s * 6.6, fy], [fx - s * 4.4, fy]], T.boot);
  };
  const lg = p.leg ?? 1;
  leg(-1, lg === 2 ? 4 : 0, lg === 0 ? 1.5 : p.wide || 0); leg(1, lg === 0 ? 4 : 0, lg === 2 ? 1.5 : p.wide || 0);
  x.translate(0, -bob);
  const g = x.createLinearGradient(-13, 0, 13, 0); g.addColorStop(0, T.coat[0]); g.addColorStop(1, T.coat[1]);
  const sk = T.long ? -25 : -33;
  P(x, [[-11, -43], [11, -43], [12.5, sk], [-12.5, sk]], g);
  if (T.long) { x.beginPath(); x.moveTo(0, -42); x.lineTo(0, sk); x.stroke(); }
  P(x, [[-13, -64], [13, -64], [11, -42], [-11, -42]], g);
  if (T.head === 'mask') { P(x, [[-10.5, -63], [10.5, -63], [8.5, -47], [-8.5, -47]], '#72767e'); x.fillStyle = T.trim; x.fillRect(-9.4, -57.5, 18.8, 3); ell(x, -14, -62.5, 5.6, 4.6, '#4a4d55', 1); ell(x, 14, -62.5, 5.6, 4.6, '#33353b', 1); }
  else {
    P(x, [[-5, -64], [5, -64], [0, -57.5]], T.trim);
    if (T.head === 'helmet') { x.strokeStyle = '#3a2a18'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(-11.5, -63); x.lineTo(9, -45); x.stroke(); x.strokeStyle = OUT; x.lineWidth = .9; }
    else { x.fillStyle = '#c9c9c9'; x.fillRect(-13.5, -65, 6, 2.2); x.fillRect(7.5, -65, 6, 2.2); ell(x, -6, -57, 1.4, 1.4, '#d8d8d8'); }
    for (const by of [-55, -50]) ell(x, 0, by, .9, .9, '#c8b46a');
  }
  x.fillStyle = '#101012'; x.fillRect(-11.3, -46, 22.6, 3.6); x.fillStyle = '#c9c9c9'; x.fillRect(-2.2, -46, 4.4, 3.6);
  // head
  x.fillStyle = T.skin; x.fillRect(-2.6, -67.5, 5.2, 4.5);
  const hy = p.arms === 'pain' ? -1 : 0;
  if (T.head === 'mask') {
    ell(x, 0, -72, 6.2, 6.8, '#2a2b30', 1);
    x.beginPath(); x.moveTo(-7.4, -72.5); x.bezierCurveTo(-7.4, -83.5, 7.4, -83.5, 7.4, -72.5); x.lineTo(-7.4, -72.5); x.fillStyle = T.helm; x.fill(); x.stroke();
    ell(x, -2.6, -71.3, 2.1, 1.7, '#ff8a2c', 1); ell(x, 2.6, -71.3, 2.1, 1.7, '#ff8a2c', 1); ell(x, -2.6, -71.5, .9, .7, '#fff0c0'); ell(x, 2.6, -71.5, .9, .7, '#fff0c0');
    rr(x, -2.5, -68.8, 5, 4.4, 1.2, '#121316'); x.stroke();
  } else {
    ell(x, 0, -72 + hy, 5.1, 6.1, T.skin, 1);
    ell(x, -2, -72.6 + hy, .75, .75, '#1a1210'); ell(x, 2, -72.6 + hy, .75, .75, '#1a1210');
    if (p.arms === 'pain') ell(x, 0, -68.6 + hy, 1.5, 1.6, '#3a0c0c'); else { x.fillStyle = '#6a3a30'; x.fillRect(-1.6, -69, 3.2, .8); }
    if (T.head === 'helmet') { x.beginPath(); x.moveTo(-7.4, -73.4 + hy); x.bezierCurveTo(-7.6, -84 + hy, 7.6, -84 + hy, 7.4, -73.4 + hy); x.lineTo(8.8, -72 + hy); x.lineTo(-8.8, -72 + hy); x.closePath(); x.fillStyle = T.helm; x.fill(); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 1.1; x.beginPath(); x.arc(-1.5, -75.5 + hy, 5, 3.6, 4.8); x.stroke(); x.strokeStyle = OUT; x.lineWidth = .9; }
    else { P(x, [[-8, -84 + hy], [8, -84 + hy], [6.3, -77.6 + hy], [-6.3, -77.6 + hy]], T.helm); x.fillStyle = T.trim; x.fillRect(-6.2, -79.2 + hy, 12.4, 2.2); ell(x, 0, -76.6 + hy, 6.8, 1.8, '#0a0a0c', 1); ell(x, 0, -81.4 + hy, 1.2, 1.2, '#d8d8d8'); }
  }
  // arms and weapon
  const sleeve = T.coat[0], sleeve2 = T.coat[1], hand = T.head === 'mask' ? '#151517' : T.skin, sw = lg === 0 ? 1.5 : lg === 2 ? -1.5 : 0;
  if (p.arms === 'aim' || p.arms === 'fire') {
    limb(x, [[-12.5, -62], [-9, -55.5], [-3, -57.5]], 4.6, sleeve); limb(x, [[12.5, -62], [9, -55.5], [3, -57.5]], 4.6, sleeve2);
    if (T.gun === 'smg') { x.fillStyle = '#141518'; x.fillRect(-1.7, -57, 3.4, 11); ell(x, 0, -59.6, 3.7, 3.7, '#1d1e22', 1); ell(x, 0, -59.6, 1.6, 1.6, '#000'); }
    else { rr(x, -3.3, -64, 6.6, 8.4, 1.2, '#1d1e22'); x.stroke(); ell(x, 0, -61, 1.7, 1.7, '#000'); }
    ell(x, -3.4, -56.6, 2.3, 2.3, hand, 1); ell(x, 3.4, -56.6, 2.3, 2.3, hand, 1);
    if (p.arms === 'fire') { const fg = x.createRadialGradient(0, -60, 0, 0, -60, 13); fg.addColorStop(0, '#fff'); fg.addColorStop(.35, '#ffe890'); fg.addColorStop(.7, 'rgba(255,150,30,.85)'); fg.addColorStop(1, 'rgba(255,90,0,0)'); star(x, 0, -60, 13, 4.5, 8, .3); x.fillStyle = fg; x.fill(); ell(x, 0, -60, 3.2, 3.2, '#fff'); }
  } else if (p.arms === 'pain') {
    limb(x, [[-12.5, -62], [-19, -66], [-22, -75]], 4.6, sleeve); limb(x, [[12.5, -62], [19, -57], [23, -50]], 4.6, sleeve2);
    ell(x, -22, -76, 2.3, 2.3, hand, 1); ell(x, 23, -49, 2.3, 2.3, hand, 1);
  } else if (T.gun === 'smg') {
    limb(x, [[-12, -50.5], [13, -43.5]], 3.2, '#1d1e22'); x.fillStyle = '#141518'; x.fillRect(2, -46, 3.2, 9);
    limb(x, [[-12.5, -62], [-14.5, -52], [-5, -48.5]], 4.8, sleeve); limb(x, [[12.5, -62], [15, -51], [8, -45]], 4.8, sleeve2);
    ell(x, -5, -48.5, 2.4, 2.4, hand, 1); ell(x, 8, -45, 2.4, 2.4, hand, 1);
  } else {
    limb(x, [[-12.5, -62], [-15.2, -51], [-12.5, -41 + sw]], 4.6, sleeve); limb(x, [[12.5, -62], [15.2, -51], [12.5, -41 - sw]], 4.6, sleeve2);
    x.fillStyle = '#1d1e22'; x.fillRect(11.2, -40 - sw, 2.8, 6.5);
    ell(x, -12.5, -40 + sw, 2.3, 2.3, hand, 1); ell(x, 12.5, -40 - sw, 2.3, 2.3, hand, 1);
  }
  x.restore();
}
function buildSprites() {
  for (const k in TYPES) {
    const T = TYPES[k];
    [0, 1, 2, 3].forEach(i => spr(`${k}_w${i}`, x => soldier(x, T, { leg: i === 3 ? 1 : i, bob: i % 2 ? 1 : 0, arms: 'carry' })));
    spr(`${k}_aim`, x => soldier(x, T, { arms: 'aim', wide: 1.2 }));
    spr(`${k}_fire`, x => soldier(x, T, { arms: 'fire', wide: 1.2 }));
    spr(`${k}_pain`, x => soldier(x, T, { arms: 'pain', tilt: .16, wide: 1 }));
    spr(`${k}_d0`, x => soldier(x, T, { arms: 'pain', fall: .22, sq: .95 }));
    spr(`${k}_d1`, x => soldier(x, T, { arms: 'pain', fall: .55, sq: .9 }));
    spr(`${k}_d2`, x => soldier(x, T, { arms: 'pain', fall: .82 }));
    spr(`${k}_dead`, x => soldier(x, T, { arms: 'pain', fall: 1 }));
  }
  const flame = (x, cx, by, h, w, k) => { for (const [s, c] of [[1, '#ff7a14'], [.68, '#ffc02e'], [.36, '#fff6c8']]) { x.beginPath(); x.moveTo(cx - w * s, by); x.bezierCurveTo(cx - w * s * 1.5, by - h * s * .5, cx + k * s, by - h * s * .8, cx + k * 1.6 * s, by - h * s); x.bezierCurveTo(cx + k * s * .4, by - h * s * .6, cx + w * s * 1.5, by - h * s * .45, cx + w * s, by); x.closePath(); x.fillStyle = c; x.fill(); } };
  [[-2, 17], [2.5, 19], [.5, 15]].forEach(([k, h], i) => spr('torch' + i, x => {
    P(x, [[47, 66], [53, 66], [52, 48], [48, 48]], '#4a2e14'); P(x, [[44, 49], [56, 49], [54, 44], [46, 44]], '#26272b');
    x.fillStyle = '#26272b'; x.fillRect(48.6, 60, 2.8, 9); flame(x, 50, 45, h, 4.6, k);
  }));
  spr('glow', x => { const g = x.createRadialGradient(50, 50, 0, 50, 50, 50); g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(.18, 'rgba(255,255,255,.34)'); g.addColorStop(.5, 'rgba(255,255,255,.09)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 100, 100); });
  spr('shaft', x => { const g = x.createLinearGradient(0, 18, 0, 100); g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.filter = 'blur(3px)'; P(x, [[36, 18], [64, 18], [88, 100], [12, 100]], g, 0); });
  spr('chandelier', x => {
    x.strokeStyle = '#18181a'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(50, 0); x.lineTo(50, 14); x.moveTo(50, 14); x.lineTo(24, 26); x.moveTo(50, 14); x.lineTo(76, 26); x.stroke();
    x.lineWidth = 3.4; x.strokeStyle = '#111'; ell(x, 50, 27, 27, 5.5, null, 1); x.lineWidth = 2; x.strokeStyle = '#4a4034'; ell(x, 50, 26.4, 27, 5.5, null, 1);
    for (const cx of [24, 37, 50, 63, 76]) { const cy = cx === 50 ? 31 : cx === 37 || cx === 63 ? 29.6 : 26; x.fillStyle = '#e8e0c8'; x.fillRect(cx - 1.3, cy - 8, 2.6, 8); flame(x, cx, cy - 8, 6, 1.6, .5); }
  });
  spr('lamp', x => { x.strokeStyle = '#111'; x.lineWidth = 1; x.beginPath(); x.moveTo(50, 0); x.lineTo(50, 16); x.stroke(); P(x, [[44, 16], [56, 16], [64, 26], [36, 26]], '#2d3a2c'); ell(x, 50, 27, 6, 3.4, '#fff3c0'); ell(x, 50, 27, 3, 2, '#fff'); });
  const woodG = x => { const g = x.createLinearGradient(0, 0, 100, 0); g.addColorStop(0, '#7a4e26'); g.addColorStop(1, '#4a2c14'); return g; };
  spr('table', x => {
    x.fillStyle = 'rgba(0,0,0,.35)'; ell(x, 50, 97, 42, 3, 'rgba(0,0,0,.35)');
    for (const lx of [14, 80]) { x.fillStyle = '#3a2210'; x.fillRect(lx, 74, 6, 23); x.strokeRect(lx, 74, 6, 23); }
    P(x, [[6, 70], [94, 70], [98, 77], [2, 77]], woodG(x)); x.fillStyle = '#2e1a0c'; x.fillRect(2, 77, 96, 3.5); x.strokeRect(2, 77, 96, 3.5);
    ell(x, 28, 72.6, 8, 2.2, '#d8d2c0', 1); ell(x, 28, 72.2, 4, 1.1, '#8a5a2a'); ell(x, 66, 73, 8, 2.2, '#d8d2c0', 1);
    rr(x, 44, 60, 5, 12, 1, '#2c4a2a'); x.stroke(); x.fillStyle = '#2c4a2a'; x.fillRect(45.4, 55, 2.2, 6); rr(x, 80, 65, 6, 7, 1, '#9a9aa2'); x.stroke();
  });
  spr('bunk', x => {
    ell(x, 50, 97, 44, 3, 'rgba(0,0,0,.35)');
    for (const px of [6, 88]) { x.fillStyle = '#3d2412'; x.fillRect(px, 30, 6, 67); x.strokeRect(px, 30, 6, 67); }
    for (const by of [44, 74]) { rr(x, 10, by, 80, 9, 2, '#b9b39f'); x.stroke(); rr(x, 10, by - 3, 54, 7, 2, '#5a6352'); x.stroke(); rr(x, 70, by - 4, 17, 6, 2.5, '#d8d2c0'); x.stroke(); x.fillStyle = '#3d2412'; x.fillRect(8, by + 8, 84, 4); x.strokeRect(8, by + 8, 84, 4); }
    x.fillStyle = '#3d2412'; x.fillRect(46, 52, 3, 26); x.fillRect(53, 52, 3, 26); for (const ry of [56, 62, 68]) x.fillRect(46, ry, 10, 2);
  });
  spr('barrel', x => {
    ell(x, 50, 97, 20, 3, 'rgba(0,0,0,.4)');
    x.beginPath(); x.moveTo(34, 60); x.bezierCurveTo(28, 72, 28, 86, 34, 97); x.lineTo(66, 97); x.bezierCurveTo(72, 86, 72, 72, 66, 60); x.closePath(); x.fillStyle = woodG(x); x.fill(); x.stroke();
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = .6; for (const sx of [40, 45, 50, 55, 60]) { x.beginPath(); x.moveTo(sx, 60); x.lineTo(sx, 97); x.stroke(); }
    x.strokeStyle = '#1c1d20'; x.lineWidth = 2.6; for (const hy of [66, 90]) { x.beginPath(); x.moveTo(31.2, hy); x.quadraticCurveTo(50, hy + 3, 68.8, hy); x.stroke(); }
    ell(x, 50, 60, 16, 3.4, '#5a3818'); x.strokeStyle = OUT; x.lineWidth = .9; ell(x, 50, 60, 16, 3.4, null, 1);
  });
  spr('crate', x => {
    ell(x, 50, 97, 26, 3, 'rgba(0,0,0,.4)');
    x.fillStyle = '#6e5630'; x.fillRect(28, 54, 44, 43); x.strokeRect(28, 54, 44, 43);
    x.strokeStyle = '#4a3618'; x.lineWidth = 4; x.strokeRect(31, 57, 38, 37); x.beginPath(); x.moveTo(31, 57); x.lineTo(69, 94); x.moveTo(69, 57); x.lineTo(31, 94); x.stroke();
    x.fillStyle = 'rgba(255,230,170,.14)'; x.fillRect(28, 54, 44, 2.5); x.fillStyle = '#1a1a1a'; x.font = 'bold 6px Arial'; x.fillText('K-7', 43, 79);
  });
  spr('armor', x => {
    ell(x, 50, 97, 20, 3, 'rgba(0,0,0,.4)');
    const g = x.createLinearGradient(30, 0, 70, 0); g.addColorStop(0, '#c8ced6'); g.addColorStop(.5, '#8a929c'); g.addColorStop(1, '#474c54');
    x.fillStyle = '#2a1a0c'; x.fillRect(38, 93, 24, 4); x.strokeRect(38, 93, 24, 4);
    P(x, [[41, 62], [49, 62], [48.5, 93], [40, 93]], g); P(x, [[51, 62], [59, 62], [60, 93], [51.5, 93]], g);
    P(x, [[37, 36], [63, 36], [60, 58], [40, 58]], g); P(x, [[40, 58], [60, 58], [62, 66], [38, 66]], '#6a727c');
    ell(x, 34.5, 39, 6, 5, g, 1); ell(x, 65.5, 39, 6, 5, g, 1);
    limb(x, [[33, 42], [35, 54], [46, 60]], 5, '#8a929c'); limb(x, [[67, 42], [65, 54], [54, 60]], 5, '#5d646d');
    x.fillStyle = '#9aa2ac'; x.fillRect(49, 58, 2, 36); x.strokeRect(49, 58, 2, 36); x.fillStyle = '#b8922e'; x.fillRect(44.5, 58, 11, 2.2);
    x.beginPath(); x.moveTo(42.5, 34); x.bezierCurveTo(42, 18, 58, 18, 57.5, 34); x.closePath(); x.fillStyle = g; x.fill(); x.stroke();
    x.fillStyle = '#0a0a0c'; x.fillRect(44.5, 26.5, 11, 1.6); x.fillRect(49.3, 26.5, 1.4, 6); P(x, [[50, 19.5], [53, 12], [56, 19.5]], '#a51c1c');
  });
  spr('pew', x => {
    ell(x, 50, 97, 44, 3, 'rgba(0,0,0,.35)');
    x.fillStyle = woodG(x); x.fillRect(6, 62, 88, 16); x.strokeRect(6, 62, 88, 16); x.fillStyle = '#5a3818'; x.fillRect(4, 78, 92, 5); x.strokeRect(4, 78, 92, 5);
    for (const px of [4, 89]) { rr(x, px, 58, 7, 39, 2, '#3d2412'); x.stroke(); }
    x.strokeStyle = 'rgba(0,0,0,.3)'; for (const sx of [28, 50, 72]) { x.beginPath(); x.moveTo(sx, 62); x.lineTo(sx, 78); x.stroke(); }
  });
  spr('altar', x => {
    ell(x, 50, 97, 40, 3, 'rgba(0,0,0,.35)');
    x.fillStyle = '#8a8474'; x.fillRect(16, 66, 68, 31); x.strokeRect(16, 66, 68, 31); P(x, [[12, 60], [88, 60], [88, 72], [70, 68], [50, 72], [30, 68], [12, 72]], '#e4dfd0');
    x.fillStyle = '#c9a030'; x.fillRect(48.2, 34, 3.6, 26); x.strokeRect(48.2, 34, 3.6, 26); x.fillRect(42, 40, 16, 3.6); x.strokeRect(42, 40, 16, 3.6);
    for (const cx of [24, 76]) { x.fillStyle = '#e8e0c8'; x.fillRect(cx - 1.5, 46, 3, 14); x.strokeRect(cx - 1.5, 46, 3, 14); flame(x, cx, 46, 7, 1.8, .6); }
  });
  spr('rack', x => {
    ell(x, 50, 97, 34, 3, 'rgba(0,0,0,.35)');
    for (const px of [16, 80]) { x.fillStyle = '#3d2412'; x.fillRect(px, 44, 4, 53); x.strokeRect(px, 44, 4, 53); }
    for (const gx of [28, 42, 56, 70]) { x.fillStyle = '#23252a'; x.fillRect(gx - 1, 34, 2.2, 38); P(x, [[gx - 2.4, 66], [gx + 2.6, 66], [gx + 4, 95], [gx - 4, 95]], '#5e3a1c'); x.fillStyle = '#17181b'; x.fillRect(gx - 2.6, 70, 5.4, 3); }
    for (const by of [56, 86]) { x.fillStyle = '#4a2c14'; x.fillRect(14, by, 72, 4); x.strokeRect(14, by, 72, 4); }
  });
  spr('desk', x => {
    ell(x, 50, 97, 42, 3, 'rgba(0,0,0,.35)');
    x.fillStyle = '#3a2010'; x.fillRect(10, 72, 26, 25); x.strokeRect(10, 72, 26, 25); x.fillRect(64, 72, 26, 25); x.strokeRect(64, 72, 26, 25);
    for (const dy of [77, 86]) for (const dx of [14, 68]) { x.strokeRect(dx, dy, 18, 6); ell(x, dx + 9, dy + 3, 1, 1, '#c9a030'); }
    P(x, [[6, 66], [94, 66], [97, 72], [3, 72]], '#5a3418'); x.fillStyle = '#e4dfd0'; P(x, [[40, 67], [58, 67], [60, 70.5], [39, 70.5]], '#e4dfd0');
    x.fillStyle = '#26272b'; x.fillRect(77, 54, 2, 13); P(x, [[70, 48], [86, 48], [90, 56], [66, 56]], '#1f6a3a'); ell(x, 78, 56.5, 8, 2, '#fff3c0');
  });
  spr('bed', x => {
    ell(x, 50, 97, 40, 3, 'rgba(0,0,0,.35)');
    rr(x, 14, 50, 72, 30, 5, '#3d2412'); x.stroke(); rr(x, 14, 74, 72, 16, 2, '#7a1418'); x.stroke(); rr(x, 30, 67, 40, 9, 4, '#e4dfd0'); x.stroke();
    x.fillStyle = '#3d2412'; x.fillRect(14, 88, 6, 9); x.fillRect(80, 88, 6, 9); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(14, 84, 72, 6);
  });
  spr('sandbags', x => {
    ell(x, 50, 97, 46, 3, 'rgba(0,0,0,.35)');
    const bag = (bx, by) => { rr(x, bx, by, 30, 11, 5, '#8a7a56'); x.stroke(); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(bx + 4, by + 7, 22, 2); };
    for (const bx of [4, 35, 66]) bag(bx, 86); for (const bx of [19, 50]) bag(bx, 76); bag(35, 66);
  });
  // pickups
  spr('clip', x => { ell(x, 50, 97, 12, 2, 'rgba(0,0,0,.4)'); P(x, [[42, 80], [51, 78], [55, 95], [46, 97]], '#2a2c31'); x.fillStyle = '#c9a030'; x.fillRect(43, 77.6, 7, 2.6); for (const bx of [58, 62.5]) { rr(x, bx, 89, 3, 8, 1.2, '#c9a030'); x.stroke(); } });
  spr('ammobox', x => { ell(x, 50, 97, 20, 2.4, 'rgba(0,0,0,.4)'); x.fillStyle = '#4c5a34'; x.fillRect(32, 80, 36, 17); x.strokeRect(32, 80, 36, 17); P(x, [[32, 80], [68, 80], [64, 75], [36, 75]], '#5e6e40'); x.fillStyle = '#d6c060'; x.fillRect(32, 86, 36, 3); for (const bx of [42, 48, 54]) { rr(x, bx, 90.5, 2.6, 5.5, 1, '#c9a030'); } x.fillStyle = '#1a1a1a'; x.fillRect(46, 76.5, 8, 2); });
  spr('food', x => { ell(x, 50, 97, 16, 2.2, 'rgba(0,0,0,.4)'); ell(x, 50, 94, 15, 3.6, '#d8d2c0', 1); ell(x, 45, 90.5, 7, 4, '#b07a3a', 1); ell(x, 43, 89.5, 3, 1.2, '#d9a860'); limb(x, [[50, 92.5], [60, 91]], 3, '#8a2e22'); });
  spr('medkit', x => { ell(x, 50, 97, 17, 2.2, 'rgba(0,0,0,.4)'); rr(x, 35, 79, 30, 18, 2.5, '#e8e4d8'); x.stroke(); x.fillStyle = '#c21e1e'; x.fillRect(47, 82, 6, 12); x.fillRect(44, 85, 12, 6); x.fillStyle = '#8a8474'; x.fillRect(45, 76.6, 10, 2.6); });
  const key = (name, c1, c2) => spr(name, x => { x.lineWidth = 3.2; x.strokeStyle = OUT; ell(x, 38, 80, 7, 7, null, 1); x.fillStyle = OUT; x.fillRect(44, 78, 26, 4.6); x.fillRect(61, 81, 3.6, 7.6); x.fillRect(66.4, 81, 3.6, 6); x.lineWidth = 2; x.strokeStyle = c1; ell(x, 38, 80, 7, 7, null, 1); x.fillStyle = c1; x.fillRect(44.6, 79, 25, 2.6); x.fillRect(61.6, 81, 2.4, 7); x.fillRect(67, 81, 2.4, 5.4); x.strokeStyle = c2; x.lineWidth = .8; x.beginPath(); x.arc(38, 80, 7, 3.4, 4.8); x.stroke(); star(x, 33, 74, 4, 1, 4); x.fillStyle = '#fff'; x.fill(); });
  key('key_s', '#c9d2da', '#fff'); key('key_g', '#e2b430', '#fff2b0');
  spr('smg', x => { ell(x, 50, 97, 26, 2.2, 'rgba(0,0,0,.4)'); x.fillStyle = '#23252a'; rr(x, 26, 86, 40, 5.4, 1.5, '#2a2c31'); x.stroke(); x.fillStyle = '#17181b'; x.fillRect(66, 87.4, 12, 2.6); P(x, [[46, 91], [51, 91], [53, 99], [48, 99]], '#17181b'); P(x, [[30, 91], [35, 91], [33, 97], [28, 97]], '#3a2412'); x.strokeStyle = '#3a3d44'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(26, 88); x.lineTo(14, 88); x.lineTo(14, 93); x.stroke(); });
  spr('chalice', x => { ell(x, 50, 97, 10, 2, 'rgba(0,0,0,.4)'); const g = x.createLinearGradient(42, 0, 58, 0); g.addColorStop(0, '#ffe680'); g.addColorStop(1, '#a8760c'); P(x, [[42, 80], [58, 80], [54, 89], [46, 89]], g); x.fillStyle = g; x.fillRect(48.6, 89, 2.8, 5); x.strokeRect(48.6, 89, 2.8, 5); ell(x, 50, 95.6, 6, 1.8, g, 1); ell(x, 50, 80, 8, 1.8, '#7a1418', 1); ell(x, 50, 85, 1.4, 1.4, '#d02a2a'); star(x, 43, 79, 3.4, .8, 4); x.fillStyle = '#fff'; x.fill(); });
  spr('crown', x => { ell(x, 50, 97, 13, 2, 'rgba(0,0,0,.4)'); const g = x.createLinearGradient(38, 0, 62, 0); g.addColorStop(0, '#ffe680'); g.addColorStop(1, '#a8760c'); P(x, [[38, 96], [36, 82], [43, 88], [50, 79], [57, 88], [64, 82], [62, 96]], g); ell(x, 50, 92, 1.8, 1.8, '#d02a2a'); ell(x, 43, 92.4, 1.3, 1.3, '#2a6ad0'); ell(x, 57, 92.4, 1.3, 1.3, '#2a6ad0'); star(x, 58, 81, 3.4, .8, 4); x.fillStyle = '#fff'; x.fill(); });
  spr('chest', x => { ell(x, 50, 97, 20, 2.4, 'rgba(0,0,0,.4)'); x.fillStyle = '#5a3418'; x.fillRect(33, 85, 34, 12); x.strokeRect(33, 85, 34, 12); ell(x, 50, 85, 16, 3.4, '#e2b430', 1); for (const [cx, cy] of [[42, 84], [50, 83], [57, 84.4], [46, 82.4], [54, 82.6]]) ell(x, cx, cy, 2.2, 1.2, '#ffe680', 1); P(x, [[33, 85], [36, 72], [64, 72], [67, 85], [64, 80], [36, 80]], '#6e4420'); x.fillStyle = '#b8922e'; x.fillRect(48, 87, 4, 5); star(x, 60, 80, 3.4, .8, 4); x.fillStyle = '#fff'; x.fill(); });
  // effects
  [.45, .75, 1].forEach((s, i) => spr('blood' + i, x => { const r = rng(40 + i); for (let k = 0; k < 16; k++) { const a = r() * 6.3, d = r() * 34 * s; ell(x, 50 + Math.cos(a) * d, 50 + Math.sin(a) * d * .9 + i * 5, 2 + r() * 7 * (1.1 - s * .5), 2 + r() * 6 * (1.1 - s * .5), k % 3 ? '#a00d0d' : '#d21a1a'); } }));
  [1, .7, .4].forEach((s, i) => spr('spark' + i, x => { const g = x.createRadialGradient(50, 50, 0, 50, 50, 44 * s); g.addColorStop(0, '#fff'); g.addColorStop(.3, 'rgba(255,220,120,.9)'); g.addColorStop(1, 'rgba(255,120,20,0)'); star(x, 50, 50, 46 * s, 9 * s, 6, i * .5); x.fillStyle = g; x.fill(); }));
  [.5, .9].forEach((s, i) => spr('dust' + i, x => { const r = rng(60 + i); for (let k = 0; k < 9; k++) { const a = r() * 6.3, d = r() * 26 * s; const g = x.createRadialGradient(50 + Math.cos(a) * d, 50 + Math.sin(a) * d, 0, 50 + Math.cos(a) * d, 50 + Math.sin(a) * d, 16 * s + 6); g.addColorStop(0, `rgba(170,165,155,${.5 - i * .22})`); g.addColorStop(1, 'rgba(170,165,155,0)'); x.fillStyle = g; x.fillRect(0, 0, 100, 100); } }));
  spr('white', x => { x.fillStyle = '#fff'; x.fillRect(0, 0, 100, 100); });
}

// ---------------------------------------------------------------- first-person weapon art
function weaponArt(kind) {
  const c = cv(512), x = c.getContext('2d'); x.lineJoin = 'round'; x.strokeStyle = '#08080a'; x.lineWidth = 3;
  const glove = x.createLinearGradient(180, 0, 340, 0); glove.addColorStop(0, '#7a5230'); glove.addColorStop(1, '#3d2816');
  const sl = x.createLinearGradient(160, 0, 360, 0); sl.addColorStop(0, '#6a7458'); sl.addColorStop(1, '#333a2a');
  const st = x.createLinearGradient(210, 0, 300, 0); st.addColorStop(0, '#565b64'); st.addColorStop(.5, '#34373e'); st.addColorStop(1, '#1b1c20');
  if (kind === 0) {
    P(x, [[168, 512], [352, 512], [316, 404], [204, 404]], sl); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(204, 404, 112, 10);
    P(x, [[240, 172], [272, 172], [286, 240], [226, 240]], '#4a4e57'); x.fillStyle = '#17181b'; x.fillRect(251, 158, 10, 16); x.strokeRect(251, 158, 10, 16);
    rr(x, 222, 238, 68, 112, 7, st); x.stroke();
    x.fillStyle = '#101113'; x.fillRect(232, 226, 14, 16); x.fillRect(266, 226, 14, 16); x.strokeRect(232, 226, 48, 16); x.fillStyle = '#34373e'; x.fillRect(247, 226, 18, 9);
    rr(x, 246, 252, 20, 30, 5, '#141518'); x.stroke(); ell(x, 256, 300, 6, 6, '#0c0c0e');
    x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 2; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(226, 250 + i * 9); x.lineTo(238, 250 + i * 9); x.moveTo(274, 250 + i * 9); x.lineTo(286, 250 + i * 9); x.stroke(); }
    x.strokeStyle = '#08080a'; x.lineWidth = 3;
    rr(x, 200, 332, 112, 92, 26, glove); x.stroke(); ell(x, 212, 334, 20, 36, glove, 1);
    x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2.5; for (const fy of [356, 376, 396]) { x.beginPath(); x.moveTo(238, fy); x.quadraticCurveTo(272, fy + 6, 306, fy - 2); x.stroke(); }
    c.muzzle = [256, 150];
  } else {
    P(x, [[40, 512], [170, 512], [236, 330], [182, 296]], sl);
    P(x, [[330, 512], [470, 512], [352, 380], [288, 396]], sl);
    P(x, [[244, 118], [268, 118], [276, 168], [236, 168]], '#17181b'); x.lineWidth = 5; ell(x, 256, 116, 13, 13, null, 1); x.lineWidth = 3; x.fillStyle = '#17181b'; x.fillRect(253, 100, 6, 14);
    P(x, [[234, 166], [278, 166], [296, 262], [216, 262]], '#42464e');
    x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2; for (let i = 0; i < 5; i++) { ell(x, 256, 182 + i * 15, 4 + i * .8, 3, 'rgba(0,0,0,.5)'); }
    x.strokeStyle = '#08080a'; x.lineWidth = 3;
    P(x, [[206, 300], [238, 290], [226, 512], [176, 512]], '#1b1c20');
    rr(x, 214, 256, 84, 84, 16, st); x.stroke(); x.fillStyle = '#101113'; x.fillRect(240, 242, 32, 18); x.strokeRect(240, 242, 32, 18); x.fillStyle = '#34373e'; x.fillRect(251, 242, 10, 9);
    rr(x, 296, 276, 30, 13, 4, '#26282d'); x.stroke(); ell(x, 256, 300, 15, 15, '#141518', 1);
    ell(x, 206, 318, 38, 30, glove, 1); x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2.5; for (const fy of [306, 320, 334]) { x.beginPath(); x.moveTo(176, fy); x.lineTo(232, fy - 6); x.stroke(); }
    x.strokeStyle = '#08080a'; x.lineWidth = 3; rr(x, 262, 336, 98, 88, 26, glove); x.stroke();
    x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2.5; for (const fy of [360, 380, 400]) { x.beginPath(); x.moveTo(276, fy); x.quadraticCurveTo(310, fy + 6, 352, fy - 4); x.stroke(); }
    c.muzzle = [256, 104];
  }
  const d = copy(c), dx = d.getContext('2d'); dx.globalCompositeOperation = 'source-atop'; dx.fillStyle = 'rgba(2,3,8,.86)'; dx.fillRect(0, 0, 512, 512);
  c.dark = d; return c;
}
let weapons = [];
function build() { buildTextures(); buildSprites(); weapons = [weaponArt(0), weaponArt(1)]; }
return { TS, SS, T, S, build, texList, texPixels, sprList, get weapons() { return weapons; }, rng };
})();
