'use strict';
(() => {
const $ = id => document.getElementById(id);
const glc = $('gl'), ov = $('ov'), octx = ov.getContext('2d');
const MW = Level.MW, MH = Level.MH, rand = Math.random, clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const DIFF = [{ name: 'RECRUIT', dmg: .55, react: 1.45 }, { name: 'SOLDIER', dmg: 1, react: 1 }, { name: 'VETERAN', dmg: 1.6, react: .62 }];
const ET = {
  guard: { hp: 30, spd: 1.35, run: 2.3, react: .75, wind: .6, acc: .52, dmg: [5, 10], burst: 1, rof: 0, cool: 1.3, range: 11, keep: 3.5, pain: 1, r: .28, hr: .33, drop: 'clip4', scale: 1 },
  officer: { hp: 50, spd: 1.7, run: 3.2, react: .38, wind: .4, acc: .7, dmg: [7, 12], burst: 1, rof: 0, cool: .85, range: 13, keep: 4.5, pain: .7, r: .28, hr: .31, drop: 'clip', scale: 1 },
  elite: { hp: 150, spd: 1.2, run: 1.9, react: .5, wind: .7, acc: .4, dmg: [4, 8], burst: 4, rof: .11, cool: 1.4, range: 12, keep: 3, pain: .22, r: .34, hr: .42, drop: 'ammobox', scale: 1 },
};
const WEAP = [
  { name: 'PISTOL', mag: 8, interval: .17, auto: 0, dmg: [20, 32], spread: .004, add: .016, max: .05, decay: .16, reload: 1.05, snd: 'pistol', kick: 1, shake: .32 },
  { name: 'SUBMACHINE GUN', mag: 32, interval: .085, auto: 1, dmg: [11, 17], spread: .012, add: .0065, max: .085, decay: .11, reload: 1.5, snd: 'smg', kick: .6, shake: .22 },
];
const ITEMS = {
  clip: { s: 'clip', ammo: 8, msg: 'Ammo clip' }, clip4: { s: 'clip', ammo: 4, msg: 'Dropped rounds', scale: .8 }, ammobox: { s: 'ammobox', ammo: 25, msg: 'Box of ammunition' },
  food: { s: 'food', hp: 10, msg: 'Rations' }, medkit: { s: 'medkit', hp: 25, msg: 'First aid kit' },
  key_s: { s: 'key_s', key: 0, msg: 'Silver key — the armory is open to you' }, key_g: { s: 'key_g', key: 1, msg: 'Gold key — get to the gatehouse' },
  smg: { s: 'smg', msg: 'Submachine gun' }, chalice: { s: 'chalice', tre: 1, msg: 'Treasure' }, crown: { s: 'crown', tre: 1, msg: 'Treasure' }, chest: { s: 'chest', tre: 1, msg: 'Treasure' },
};
let L, T, S, FR = {}, state = 'load', diff = 1, time = 0, last = 0, W = 0, H = 0, sens = +(localStorage.getItem('ironkeep.sens') || 1);
let cell, room, doorAt, propBlock, doors, enemies, items, parts, blockers, propAt, torches;
let cols = new Float32Array(4096 * 4), sprV = new Float32Array(700 * 60);
const P = {}, V = { flash: [0, 0, 0] }, R = { dist: 0, side: 0, u: 0, tex: 0, mx: 0, my: 0, kind: 0 };
const keys = new Set(); let mouseDown = false, firePressed = false, mapOn = false, showFps = false, fpsAcc = 0, fpsN = 0;
let seen, seenDirty = true, mapCv = null, field, fieldT = 0, ntmp, movingPush = null, stats, msgT = 0, dmgFlash = 0, shake = 0, indicators = [], hitMark = 0, windGap = 0, lastRoom = -1, deadT = 0, heartT = 0, hudDirty = true;
const lv = [0, 0, 0];

// ------------------------------------------------------------------ level
function newGame() {
  L = Level.build(); T = Art.T; S = Art.S;
  ({ cell, room, doorAt, propBlock, doors } = L);
  Renderer.setLevel(L);
  blockers = L.props.filter(p => p.block); propAt = new Int16Array(MW * MH).fill(-1); blockers.forEach((p, i) => propAt[(p.y | 0) * MW + (p.x | 0)] = i);
  torches = L.props.filter(p => p.torch);
  items = L.items.map(i => ({ ...i })); parts = [];
  enemies = L.enemies.map(d => ({ x: d.x, y: d.y, type: d.type, T: ET[d.type], hp: ET[d.type].hp, a: d.ang, state: 'idle', t: 0, hx: d.x, hy: d.y, ha: d.ang, patrol: d.patrol, pi: 0, wait: 0, drop: d.drop, cool: 0, sees: false, seeT: rand() * .2, lostT: 0, walk: 0, moving: false, fireT: 0, burst: 0, strafe: rand() < .5 ? 1 : -1, strafeT: 0, phase: 0, unseen: 0 }));
  Object.assign(P, { x: L.spawn.x, y: L.spawn.y, a: L.spawn.a, vx: 0, vy: 0, hp: 100, ammo: 16, mag: [8, 0], w: 0, hasSmg: false, keys: [0, 0], cool: 0, bloom: 0, sinceShot: 9, kick: 0, flashT: 0, reload: 0, reloadMax: 1, swap: 0, swapTo: -1, bob: 0, mv: 0, stepD: 0, turnV: 0, dryLock: false });
  seen = new Uint8Array(MW * MH); seenDirty = true; field = new Int16Array(MW * MH); ntmp = new Int16Array(MW * MH); fieldT = 0; movingPush = null;
  stats = { kills: 0, totalKills: enemies.length, secrets: 0, totalSecrets: L.pushes.length, tre: 0, totalTre: items.filter(i => ITEMS[i.type].tre).length, time: 0 };
  dmgFlash = 0; shake = 0; indicators = []; hitMark = 0; lastRoom = -1; deadT = 0; mapOn = false; hudDirty = true; msgT = 0; $('msg').style.opacity = 0;
}

// ------------------------------------------------------------------ raycasting (used for rendering, bullets and line of sight)
function cast(px, py, dx, dy, res, mark) {
  if (dx === 0) dx = 1e-9; if (dy === 0) dy = 1e-9;
  let mx = px | 0, my = py | 0; const ddx = Math.abs(1 / dx), ddy = Math.abs(1 / dy), stepX = dx < 0 ? -1 : 1, stepY = dy < 0 ? -1 : 1;
  let sx = dx < 0 ? (px - mx) * ddx : (mx + 1 - px) * ddx, sy = dy < 0 ? (py - my) * ddy : (my + 1 - py) * ddy;
  let side = 0, pidx = my * MW + mx, dist = 60, tex = 0, u = 0, kind = 1;
  if (mark && !seen[pidx]) { seen[pidx] = 1; seenDirty = true; }
  for (let i = 0; i < 120; i++) {
    const prev = pidx;
    if (sx < sy) { sx += ddx; mx += stepX; side = 0; } else { sy += ddy; my += stepY; side = 1; }
    pidx = my * MW + mx; const t = cell[pidx];
    if (mark && !seen[pidx]) { seen[pidx] = 1; seenDirty = true; }
    if (t === 0) continue;
    if (t === 2) {
      const d = doors[doorAt[pidx]];
      if (d.axis === 0) { const th = (mx + .5 - px) / dx, hy = py + th * dy, f = hy - my; if (f < 0 || f >= 1 || f < d.open) continue; dist = th; u = f - d.open; side = 0; }
      else { const th = (my + .5 - py) / dy, hx = px + th * dx, f = hx - mx; if (f < 0 || f >= 1 || f < d.open) continue; dist = th; u = f - d.open; side = 1; }
      tex = d.tex; kind = 2; break;
    }
    if (t === 4) {
      const b = movingPush; if (!b) continue;
      let t1 = (b.fx - px) / dx, t2 = (b.fx + 1 - px) / dx; if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      let t3 = (b.fy - py) / dy, t4 = (b.fy + 1 - py) / dy; if (t3 > t4) { const s = t3; t3 = t4; t4 = s; }
      const tn = Math.max(t1, t3), tf = Math.min(t2, t4); if (tf < tn || tn <= 0) continue;
      dist = tn; side = t1 > t3 ? 0 : 1; const w = side === 0 ? py + tn * dy - b.fy : px + tn * dx - b.fx; u = clamp(w, 0, .9999); tex = b.tex; kind = 4; break;
    }
    dist = side === 0 ? sx - ddx : sy - ddy;
    const ct = L.cellTex[pidx];
    if (ct >= 0) tex = ct; else {
      const ft = L.faceTex[pidx * 4 + (side === 0 ? (stepX > 0 ? 0 : 1) : (stepY > 0 ? 2 : 3))];
      if (ft >= 0) tex = ft; else if (cell[prev] === 2) tex = T.JAMB; else { const rm = room[prev]; tex = rm >= 0 ? L.rooms[rm].wall : T.STONE; }
    }
    const w = side === 0 ? py + dist * dy : px + dist * dx; u = w - Math.floor(w);
    if ((side === 0 && dx < 0) || (side === 1 && dy > 0)) u = 1 - u;
    kind = t; break;
  }
  res.dist = dist; res.side = side; res.u = u; res.tex = tex; res.mx = mx; res.my = my; res.kind = kind;
}
function canSee(x0, y0, x1, y1) { const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy); if (d < .01) return true; cast(x0, y0, dx / d, dy / d, R); return R.dist >= d - .05; }

// ------------------------------------------------------------------ collision
function blocked(cx, cy) { const t = cell[cy * MW + cx]; if (t === 0) return false; if (t === 2) return doors[doorAt[cy * MW + cx]].open < .8; return true; }
function resolve(e, r, isPlayer) {
  for (let pass = 0; pass < 2; pass++) {
    const x0 = Math.floor(e.x - r), x1 = Math.floor(e.x + r), y0 = Math.floor(e.y - r), y1 = Math.floor(e.y + r);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      if (blocked(cx, cy)) {
        const nx = clamp(e.x, cx, cx + 1), ny = clamp(e.y, cy, cy + 1), dx = e.x - nx, dy = e.y - ny, d2 = dx * dx + dy * dy;
        if (d2 < r * r) {
          if (d2 > 1e-10) { const d = Math.sqrt(d2), p = (r - d) / d; e.x += dx * p; e.y += dy * p; }
          else { const l = e.x - cx, rt = cx + 1 - e.x, tp = e.y - cy, bt = cy + 1 - e.y, m = Math.min(l, rt, tp, bt); if (m === l) e.x = cx - r; else if (m === rt) e.x = cx + 1 + r; else if (m === tp) e.y = cy - r; else e.y = cy + 1 + r; }
        }
      }
      const pi = cx >= 0 && cy >= 0 && cx < MW && cy < MH ? propAt[cy * MW + cx] : -1;
      if (pi >= 0) pushOut(e, blockers[pi].x, blockers[pi].y, r + .3);
    }
    if (isPlayer) for (const o of enemies) if (o.state !== 'dead') pushOut(e, o.x, o.y, r + o.T.r);
  }
}
function pushOut(e, ox, oy, rr) { const dx = e.x - ox, dy = e.y - oy, d2 = dx * dx + dy * dy; if (d2 < rr * rr && d2 > 1e-8) { const d = Math.sqrt(d2), p = (rr - d) / d; e.x += dx * p; e.y += dy * p; } }
function moveBy(e, mx, my, r, isPlayer) { const n = Math.max(1, Math.ceil(Math.hypot(mx, my) / .12)); for (let i = 0; i < n; i++) { e.x += mx / n; e.y += my / n; resolve(e, r, isPlayer); } }

// ------------------------------------------------------------------ sound helpers
function sndAt(name, x, y, vol = 1) { const dx = x - P.x, dy = y - P.y, d = Math.hypot(dx, dy); const v = vol / (1 + d * d * .045); if (v < .02) return; Snd.play(name, v, d < .3 ? 0 : Math.sin(Math.atan2(dy, dx) - P.a) * .75); }
function say(text, dur = 2.2) { const m = $('msg'); m.textContent = text; m.style.opacity = 1; msgT = dur; }

// ------------------------------------------------------------------ doors and push-walls
function openDoor(d, byPlayer) {
  if (d.lock) {
    if (!byPlayer) return false;
    if (!P.keys[d.lock - 1]) { say(d.lock === 1 ? 'Locked — need silver key' : 'Locked — need gold key'); Snd.play('locked'); return false; }
    say(d.lock === 1 ? 'Silver key used' : 'Gold key used'); d.lock = 0; Snd.play('key', .6);
  }
  if (d.state === 0 || d.state === 3) { d.state = 1; sndAt('door', d.x + .5, d.y + .5); }
  d.timer = 3.4; return true;
}
function updateDoors(dt) {
  for (const d of doors) {
    if (d.state === 1) { d.open += dt / .42; if (d.open >= 1) { d.open = 1; d.state = 2; d.timer = 3.4; } }
    else if (d.state === 2) {
      d.timer -= dt;
      if (d.timer <= 0) {
        const near = e => Math.abs(e.x - d.x - .5) < .95 && Math.abs(e.y - d.y - .5) < .95;
        if (near(P) || enemies.some(e => e.state !== 'dead' && near(e))) d.timer = .5; else { d.state = 3; sndAt('doorclose', d.x + .5, d.y + .5); }
      }
    } else if (d.state === 3) { d.open -= dt / .42; if (d.open <= 0) { d.open = 0; d.state = 0; } }
  }
}
function tryPush(p) {
  if (p.state || movingPush) return;
  const ax = Math.abs(Math.cos(P.a)) > Math.abs(Math.sin(P.a)), dx = ax ? Math.sign(Math.cos(P.a)) : 0, dy = ax ? 0 : Math.sign(Math.sin(P.a));
  const i1 = (p.y + dy) * MW + p.x + dx, i2 = (p.y + 2 * dy) * MW + p.x + 2 * dx;
  if (cell[i1] !== 0 || cell[i2] !== 0 || propBlock[i1] || propBlock[i2]) { Snd.play('locked', .5); return; }
  p.dx = dx; p.dy = dy; p.state = 1; p.off = 0; p.fx = p.x; p.fy = p.y; movingPush = p;
  cell[p.y * MW + p.x] = 4; cell[i1] = 4; L.cellTex[p.y * MW + p.x] = -1;
  stats.secrets++; hudDirty = true; say('A secret passage!', 3); Snd.play('push'); Snd.play('secret', .8);
}
function updatePush(dt) {
  const p = movingPush; if (!p) return;
  const prev = p.off; p.off = Math.min(2, p.off + dt * .8); p.fx = p.x + p.dx * p.off; p.fy = p.y + p.dy * p.off; shake = Math.max(shake, .12);
  const i0 = p.y * MW + p.x, i1 = i0 + p.dy * MW + p.dx, i2 = i1 + p.dy * MW + p.dx;
  if (prev < 1 && p.off >= 1) { cell[i0] = 0; room[i0] = room[i2]; L.floorTex[i0] = L.floorTex[i2]; L.ceilTex[i0] = L.ceilTex[i2]; cell[i2] = 4; Renderer.updateCells(); }
  if (p.off >= 2) { cell[i1] = 0; cell[i2] = 1; L.cellTex[i2] = p.tex; p.state = 2; movingPush = null; seenDirty = true; }
}
function interact() {
  const dx = Math.cos(P.a), dy = Math.sin(P.a);
  for (const r of [.55, .95, 1.3]) {
    const cx = (P.x + dx * r) | 0, cy = (P.y + dy * r) | 0, i = cy * MW + cx, t = cell[i];
    if (t === 2) { openDoor(doors[doorAt[i]], true); return; }
    if (t === 3) { tryPush(L.pushes[L.pushAt[i]]); return; }
    if (t !== 0) break;
  }
}

// ------------------------------------------------------------------ player
function updatePlayer(dt) {
  let f = 0, s = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
  if (keys.has('KeyD')) s += 1; if (keys.has('KeyA')) s -= 1;
  let turn = 0; if (keys.has('ArrowLeft')) turn -= 1; if (keys.has('ArrowRight')) turn += 1; P.a += turn * 2.6 * dt;
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight'), sp = run ? 5.4 : 3.5;
  const dx = Math.cos(P.a), dy = Math.sin(P.a); let tx = dx * f - dy * s, ty = dy * f + dx * s; const tl = Math.hypot(tx, ty);
  if (tl > 0) { tx *= sp / tl; ty *= sp / tl; }
  const k = Math.min(1, dt * (tl > 0 ? 16 : 13)); P.vx += (tx - P.vx) * k; P.vy += (ty - P.vy) * k;
  const ox = P.x, oy = P.y; moveBy(P, P.vx * dt, P.vy * dt, .25, true);
  const moved = Math.hypot(P.x - ox, P.y - oy); P.mv += (clamp(moved / dt / 3.5, 0, 1.4) - P.mv) * Math.min(1, dt * 10);
  P.bob += moved * 2.6; P.stepD += moved; if (P.stepD > 1.05) { P.stepD = 0; Snd.play('step', run ? 1 : .7); }
  P.turnV *= Math.max(0, 1 - dt * 12);
  // weapon state
  const w = WEAP[P.w]; P.cool -= dt; P.sinceShot += dt; P.kick *= Math.max(0, 1 - dt * 13); P.flashT -= dt;
  if (P.sinceShot > w.decay) P.bloom = Math.max(0, P.bloom - dt * (.02 + P.bloom * 6));
  if (P.swap > 0) { P.swap -= dt; if (P.swap <= .14 && P.swapTo >= 0) { P.w = P.swapTo; P.swapTo = -1; hudDirty = true; } }
  else if (P.reload > 0) { P.reload -= dt; if (P.reload <= 0) { const n = Math.min(WEAP[P.w].mag - P.mag[P.w], P.ammo); P.mag[P.w] += n; P.ammo -= n; hudDirty = true; } }
  else if ((w.auto ? mouseDown : firePressed) && P.cool <= 0) fire();
  if (!mouseDown) P.dryLock = false; firePressed = false;
  // pickups
  for (const it of items) { if (it.got) continue; const d = Math.hypot(it.x - P.x, it.y - P.y); if (d < .62) pickup(it); }
  const ci = (P.y | 0) * MW + (P.x | 0), rm = room[ci];
  if (rm !== lastRoom && rm >= 0 && cell[ci] === 0) { if (lastRoom >= 0 && !L.rooms[rm].visited && msgT <= 0) say(L.rooms[rm].name, 1.8); L.rooms[rm].visited = 1; lastRoom = rm; }
  if (L.isExit(P.x | 0, P.y | 0)) win();
}
function startReload() { const w = WEAP[P.w]; if (P.reload > 0 || P.swap > 0 || P.mag[P.w] >= w.mag || P.ammo <= 0) return; P.reload = P.reloadMax = w.reload; Snd.play('reload'); }
function switchTo(i) { if (i === P.w || P.swap > 0 || (i === 1 && !P.hasSmg)) return; P.reload = 0; P.swap = .28; P.swapTo = i; Snd.play('click'); }
function fire() {
  const w = WEAP[P.w];
  if (P.mag[P.w] <= 0) { if (P.ammo > 0) startReload(); else if (!P.dryLock) { Snd.play('dry'); P.dryLock = true; say('Out of ammunition'); } return; }
  P.mag[P.w]--; P.cool = w.interval; P.sinceShot = 0; hudDirty = true;
  const sp = w.spread + P.bloom + P.mv * .008; P.bloom = Math.min(w.max, P.bloom + w.add);
  P.kick = Math.min(1.6, P.kick + w.kick); shake += w.shake; P.flashT = .06; Snd.play(w.snd);
  const a = P.a + (rand() - rand()) * sp, dx = Math.cos(a), dy = Math.sin(a);
  cast(P.x, P.y, dx, dy, R); let bd = R.dist, best = null;
  for (const e of enemies) { if (e.state === 'dead') continue; const rx = e.x - P.x, ry = e.y - P.y, al = rx * dx + ry * dy; if (al < .1 || al >= bd) continue; if (Math.abs(rx * dy - ry * dx) < e.T.hr) { best = e; bd = al; } }
  if (best) hitEnemy(best, w.dmg[0] + rand() * (w.dmg[1] - w.dmg[0]), P.x + dx * (bd - .2), P.y + dy * (bd - .2));
  else impact(P.x + dx * (bd - .05), P.y + dy * (bd - .05), (rand() - .5) * .16);
  alertNoise();
  if (P.mag[P.w] === 0 && P.ammo > 0) setTimeout(() => { if (state === 'play' && P.mag[P.w] === 0) startReload(); }, 220);
}
function pickup(it) {
  const d = ITEMS[it.type];
  if (d.ammo) { if (P.ammo >= 120) return; P.ammo = Math.min(120, P.ammo + d.ammo); Snd.play('ammo'); }
  else if (d.hp) { if (P.hp >= 100) return; P.hp = Math.min(100, P.hp + d.hp); Snd.play('health'); }
  else if (d.key !== undefined) { P.keys[d.key] = 1; Snd.play('key'); }
  else if (d.tre) { stats.tre++; Snd.play('treasure'); }
  else if (it.type === 'smg') { P.hasSmg = true; P.mag[1] = 32; Snd.play('weapon'); switchTo(1); }
  it.got = 1; hudDirty = true; say(d.msg);
}
function hurt(dmg, from) {
  if (state !== 'play') return;
  P.hp -= dmg; dmgFlash = Math.min(1, dmgFlash + .35 + dmg / 25); shake += .55; hudDirty = true;
  indicators.push({ a: Math.atan2(from.y - P.y, from.x - P.x), t: 1.3 }); Snd.play('hurt', .8);
  if (P.hp <= 0) { P.hp = 0; state = 'dead'; deadT = 0; Snd.play('death'); document.body.classList.remove('playing'); }
}

// ------------------------------------------------------------------ effects
function part(x, y, z, vx, vy, vz, life, frames, scale, mode, col, grav) { if (parts.length < 160) parts.push({ x, y, z, vx, vy, vz, life, max: life, frames, scale, mode, col, grav: grav || 0 }); }
function impact(x, y, z) {
  part(x, y, z, 0, 0, 0, .11, [S.spark0, S.spark1, S.spark2], .3, 2, [1, .85, .5]);
  part(x, y, z, 0, 0, .15, .45, [S.dust0, S.dust1], .4, 0, [1, 1, 1]);
  for (let i = 0; i < 3; i++) part(x, y, z, (rand() - .5) * 2.4, (rand() - .5) * 2.4, rand() * 1.6, .25 + rand() * .2, [S.spark2], .09, 2, [1, .7, .3], 5);
  sndAt('ric', x, y, .9);
}
function blood(x, y) {
  const z = .05 + rand() * .2; part(x, y, z, 0, 0, 0, .26, [S.blood0, S.blood1, S.blood2], .5, 0, [1, 1, 1]);
  for (let i = 0; i < 5; i++) part(x, y, z, (rand() - .5) * 2.2, (rand() - .5) * 2.2, rand() * 1.8, .4 + rand() * .2, [S.blood0], .1, 0, [1, 1, 1], 6);
}

// ------------------------------------------------------------------ enemies
function buildField() { // walking distance to the player, through doors enemies are able to open
  field.fill(-1); const q = [(P.y | 0) * MW + (P.x | 0)]; field[q[0]] = 0;
  for (let h = 0; h < q.length; h++) { const i = q[h], d = field[i] + 1; for (const n of [i - 1, i + 1, i - MW, i + MW]) { if (field[n] >= 0) continue; const t = cell[n]; if ((t === 0 && !propBlock[n]) || (t === 2 && !doors[doorAt[n]].lock)) { field[n] = d; q.push(n); } } }
}
function pathStep(e, fld, speed, dt) {
  const cx = e.x | 0, cy = e.y | 0, i = cy * MW + cx; let best = fld[i] < 0 ? 9999 : fld[i], bi = -1;
  for (const n of [i - 1, i + 1, i - MW, i + MW]) { const v = fld[n]; if (v >= 0 && v < best) { best = v; bi = n; } }
  if (bi < 0) return false;
  if (cell[bi] === 2) { const d = doors[doorAt[bi]]; if (d.open < .8) { openDoor(d, false); return true; } d.timer = Math.max(d.timer, 1); }
  walkTo(e, (bi % MW) + .5, ((bi / MW) | 0) + .5, speed, dt); return true;
}
function walkTo(e, tx, ty, speed, dt) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy); if (d < .02) return true;
  const st = Math.min(d, speed * dt), ox = e.x, oy = e.y; moveBy(e, dx / d * st, dy / d * st, e.T.r, false);
  if (Math.hypot(e.x - P.x, e.y - P.y) < e.T.r + .3) { e.x = ox; e.y = oy; }
  e.a = Math.atan2(dy, dx); e.moving = true; e.walk += st * 2.4; return d < .12;
}
function bfsTo(e, tx, ty) { // one-off path field for returning to post
  if (!e.fld) e.fld = new Int16Array(MW * MH); const f = e.fld; f.fill(-1); const q = [(ty | 0) * MW + (tx | 0)]; f[q[0]] = 0;
  for (let h = 0; h < q.length; h++) { const i = q[h], d = f[i] + 1; for (const n of [i - 1, i + 1, i - MW, i + MW]) { if (f[n] >= 0) continue; const t = cell[n]; if ((t === 0 && !propBlock[n]) || (t === 2 && !doors[doorAt[n]].lock)) { f[n] = d; q.push(n); } } }
}
function alertEnemy(e, delay, quiet) {
  if (e.state !== 'idle' && e.state !== 'search' && e.state !== 'return') return;
  e.state = 'alert'; e.t = delay; e.lostT = 0; e.cool = Math.max(e.cool, .2);
  if (!quiet) { sndAt('bark_' + e.type, e.x, e.y, 1.1); for (const o of enemies) if (o !== e && o.state === 'idle' && Math.hypot(o.x - e.x, o.y - e.y) < 7 && canSee(e.x, e.y, o.x, o.y)) alertEnemy(o, o.T.react * DIFF[diff].react + .35 + rand() * .3, true); }
}
function alertNoise() { // gunfire carries through open space and open doors, not through closed ones
  ntmp.fill(-1); const q = [(P.y | 0) * MW + (P.x | 0)]; ntmp[q[0]] = 0;
  for (let h = 0; h < q.length; h++) { const i = q[h], d = ntmp[i] + 1; if (d > 13) continue; for (const n of [i - 1, i + 1, i - MW, i + MW]) { if (ntmp[n] >= 0) continue; const t = cell[n]; if (t === 0 || (t === 2 && doors[doorAt[n]].open > .5)) { ntmp[n] = d; q.push(n); } } }
  for (const e of enemies) if (ntmp[(e.y | 0) * MW + (e.x | 0)] >= 0) alertEnemy(e, e.T.react * DIFF[diff].react * 1.3 + rand() * .5);
}
function hitEnemy(e, dmg, x, y) {
  blood(x, y); hitMark = .16; sndAt('hit', e.x, e.y, 1);
  e.hp -= dmg;
  if (e.hp <= 0) {
    e.state = 'dead'; e.t = 0; stats.kills++; hudDirty = true; sndAt('die_' + e.type, e.x, e.y, 1.1);
    const drop = e.drop || (e.type === 'guard' && rand() < .25 ? null : e.T.drop);
    if (drop) items.push({ x: e.x + (rand() - .5) * .3, y: e.y + (rand() - .5) * .3, type: drop, got: 0 });
    return;
  }
  if (e.state === 'idle' || e.state === 'search' || e.state === 'return') { alertEnemy(e, .25); }
  if (rand() < e.T.pain && e.state !== 'alert') { e.state = 'pain'; e.t = .2; sndAt('pain', e.x, e.y, .7); }
}
function enemyShoot(e) {
  e.fireT = .1; sndAt(e.type === 'elite' ? 'smg' : 'eshot', e.x, e.y, 1.4);
  const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy);
  const p = e.T.acc * clamp(1.2 - d / 13, .22, 1) * (P.mv > 1.1 ? .78 : 1);
  if (e.sees && rand() < p) hurt((e.T.dmg[0] + rand() * (e.T.dmg[1] - e.T.dmg[0])) * DIFF[diff].dmg, e);
  else { const a = Math.atan2(dy, dx) + (rand() < .5 ? -1 : 1) * (.06 + rand() * .16); cast(e.x, e.y, Math.cos(a), Math.sin(a), R); if (R.dist < 30) impact(e.x + Math.cos(a) * (R.dist - .05), e.y + Math.sin(a) * (R.dist - .05), (rand() - .5) * .3); }
}
function updateEnemy(e, dt, attackers) {
  if (e.state === 'dead') { e.t += dt; return; }
  const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy), T2 = e.T, D = DIFF[diff];
  e.moving = false; e.fireT -= dt; e.cool -= dt;
  e.seeT -= dt; if (e.seeT <= 0) { e.seeT = .09 + rand() * .05; e.sees = dist < 20 && canSee(e.x, e.y, P.x, P.y); }
  switch (e.state) {
    case 'idle': {
      if (e.sees) { let da = Math.atan2(dy, dx) - e.a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < 1.25 || dist < 1.6) { alertEnemy(e, T2.react * D.react); break; } }
      if (e.patrol) { if (e.wait > 0) e.wait -= dt; else { const wp = e.patrol[e.pi]; if (walkTo(e, wp[0], wp[1], T2.spd, dt)) { e.pi = (e.pi + 1) % e.patrol.length; e.wait = .8 + rand(); } } }
      break;
    }
    case 'alert': e.a = Math.atan2(dy, dx); e.t -= dt; if (e.t <= 0) { e.state = 'chase'; e.lostT = e.sees ? 0 : .01; } break;
    case 'pain': e.t -= dt; if (e.t <= 0) { e.state = 'chase'; e.cool = Math.max(e.cool, .35); } break;
    case 'chase': {
      if (e.sees) e.lostT = 0; else e.lostT += dt;
      if (e.sees && e.cool <= 0 && dist < T2.range && attackers < 4 && windGap <= 0) { e.state = 'attack'; e.t = T2.wind * D.react; e.burst = T2.burst; e.unseen = 0; windGap = .28; sndAt('click', e.x, e.y, 1.4); return 1; }
      if (e.sees) {
        e.a = Math.atan2(dy, dx);
        if (dist > T2.keep) walkTo(e, P.x, P.y, T2.run, dt);
        else { e.strafeT -= dt; if (e.strafeT <= 0) { e.strafeT = .7 + rand() * 1.2; e.strafe = rand() < .5 ? 1 : -1; } const a = e.a; walkTo(e, e.x - dy / dist * e.strafe, e.y + dx / dist * e.strafe, T2.spd * .8, dt); e.a = a; }
      } else if (e.lostT < 5) { if (!pathStep(e, field, T2.run, dt) && e.lostT > 1.5) { e.state = 'search'; e.t = 3; } }
      else { e.state = 'search'; e.t = 3.5; }
      break;
    }
    case 'attack': {
      e.a = Math.atan2(dy, dx);
      if (!e.sees) { e.unseen += dt; if (e.unseen > .3) { e.state = 'chase'; e.cool = .3; break; } } else e.unseen = 0;
      e.t -= dt;
      if (e.t <= 0) { enemyShoot(e); e.burst--; if (e.burst > 0) e.t = T2.rof; else { e.state = 'chase'; e.cool = T2.cool * (.8 + rand() * .5) * (.7 + .3 * D.react); } }
      return 1;
    }
    case 'search': {
      if (e.sees) { e.state = 'chase'; e.lostT = 0; break; }
      e.t -= dt; e.a += dt * 1.6 * e.strafe; if (e.t <= 0) { e.state = 'return'; bfsTo(e, e.hx, e.hy); }
      break;
    }
    case 'return': {
      if (e.sees) { alertEnemy(e, T2.react * D.react * .6); break; }
      if (Math.hypot(e.x - e.hx, e.y - e.hy) < .7 || !pathStep(e, e.fld, T2.spd, dt)) { e.state = 'idle'; e.a = e.ha; }
      break;
    }
  }
  return 0;
}
function updateEnemies(dt) {
  fieldT -= dt; if (fieldT <= 0) { fieldT = .2; buildField(); } windGap -= dt;
  let attackers = 0; for (const e of enemies) if (e.state === 'attack') attackers++;
  for (const e of enemies) { const was = e.state; updateEnemy(e, dt, attackers); if (was !== 'attack' && e.state === 'attack') attackers++; }
  for (let i = 0; i < enemies.length; i++) { const a = enemies[i]; if (a.state === 'dead') continue; for (let j = i + 1; j < enemies.length; j++) { const b = enemies[j]; if (b.state === 'dead') continue; const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy; if (d2 < .36 && d2 > 1e-6) { const d = Math.sqrt(d2), p = (.6 - d) * .5 / d; a.x -= dx * p; a.y -= dy * p; b.x += dx * p; b.y += dy * p; resolve(a, a.T.r); resolve(b, b.T.r); } } }
}

// ------------------------------------------------------------------ flow
function update(dt) {
  stats.time += dt;
  updatePlayer(dt); if (state !== 'play') return;
  updateDoors(dt); updatePush(dt); updateEnemies(dt);
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.grav * dt; if (p.z < -.48) { p.z = -.48; p.vx = p.vy = p.vz = 0; } }
  for (const i of indicators) i.t -= dt; if (indicators.length && indicators[0].t <= 0) indicators.shift();
  if (rand() < dt * 7) { let bd = 99, bt = null; for (const t of torches) { const d = Math.hypot(t.x - P.x, t.y - P.y); if (d < bd) { bd = d; bt = t; } } if (bt && bd < 7) sndAt('crackle', bt.x, bt.y, .22); }
  if (P.hp < 30) { heartT -= dt; if (heartT <= 0) { heartT = .95; Snd.play('heart', .8); } }
}
function win() {
  state = 'win'; document.exitPointerLock && document.exitPointerLock(); Snd.play('win');
  const key = 'ironkeep.best.' + diff, prev = +(localStorage.getItem(key) || 0), t = stats.time, best = prev && prev < t ? prev : t; localStorage.setItem(key, best);
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 100) + '%';
  $('r-time').textContent = fmt(t); $('r-kills').textContent = pct(stats.kills, stats.totalKills); $('r-secrets').textContent = pct(stats.secrets, stats.totalSecrets); $('r-treasure').textContent = pct(stats.tre, stats.totalTre);
  $('r-best').textContent = fmt(best) + (best === t && prev ? '  NEW' : ''); show('s-win');
}
const fmt = t => `${(t / 60) | 0}:${String((t % 60) | 0).padStart(2, '0')}`;
function show(id) { for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id); document.body.classList.toggle('playing', !id && state === 'play'); document.body.classList.toggle('menu', !!id); }
function start() { Snd.init(); newGame(); resume(); }
function resume() { state = 'play'; show(null); keys.clear(); mouseDown = false; last = performance.now(); try { const p = glc.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
function pause() { if (state !== 'play') return; state = 'pause'; show('s-pause'); }
function title() { state = 'title'; newGame(); const b = +(localStorage.getItem('ironkeep.best.' + diff) || 0); $('best').textContent = b ? `BEST TIME (${DIFF[diff].name}): ${fmt(b)}` : ''; show('s-title'); }

// ------------------------------------------------------------------ rendering
const pool = [], sorted = [], byDepth = (a, b) => b.d - a.d; let nq = 0;
function q(x, y, s, scale, z, mode, r, g, b, a, bias) {
  const rx = x - V.x, ry = y - V.y, d = rx * V.dx + ry * V.dy; if (d < .12) return;
  const inv = 1 / (d * V.planeLen), cx = (rx * V.ux + ry * V.uy) * inv, hw = scale * .5 * inv; if (cx - hw > 1 || cx + hw < -1) return;
  const o = pool[nq] || (pool[nq] = {}); nq++;
  o.d = d; o.cx = cx; o.hw = hw; o.cy = z * inv * V.aspect; o.hh = scale * .5 * inv * V.aspect; o.s = s; o.bias = bias || 0;
  if (mode === 0) { const i = (((y * 4) | 0) * L.LW + ((x * 4) | 0)) * 3, fog = Math.exp(-d * .05), fl = 1 / (1 + d * d * .45); o.r = (L.lm[i] * fog + V.flash[0] * fl) * r; o.g = (L.lm[i + 1] * fog + V.flash[1] * fl) * g; o.b = (L.lm[i + 2] * fog + V.flash[2] * fl) * b; o.a = a; }
  else if (mode === 1) { const fog = Math.exp(-d * .02); o.r = r * fog; o.g = g * fog; o.b = b * fog; o.a = a; }
  else { o.r = r * a; o.g = g * a; o.b = b * a; o.a = 0; }
}
function buildSprites() {
  nq = 0; const tf = S.torch0 + ((time * 9) | 0) % 3;
  for (const p of L.props) {
    if (p.add) { const k = p.L ? p.L.k : 1; q(p.x, p.y, S[p.s], p.scale * (.9 + .1 * k), p.z, 2, p.col[0], p.col[1], p.col[2], k, p.bias); }
    else if (p.emis) q(p.x, p.y, p.torch ? tf : S[p.s], 1, 0, 1, 1.1, 1.1, 1.1, 1, p.bias);
    else q(p.x, p.y, S[p.s], 1, 0, 0, 1, 1, 1, 1, 0);
  }
  for (const it of items) { if (it.got) continue; const d = ITEMS[it.type], key = d.key !== undefined; const sc = (d.scale || 1) * 1.35; q(it.x, it.y, S[d.s], sc, (sc - 1) * .5 + (key ? .08 + Math.sin(time * 3) * .04 : 0), 0, key ? 1.6 : 1.15, key ? 1.6 : 1.15, key ? 1.6 : 1.15, 1, 0); }
  for (const e of enemies) {
    const f = FR[e.type]; let s, boost = 1;
    if (e.state === 'dead') s = e.t < .12 ? f.d[0] : e.t < .26 ? f.d[1] : e.t < .4 ? f.d[2] : f.dead;
    else if (e.state === 'pain') s = f.pain;
    else if (e.fireT > 0) { s = f.fire; boost = 4; }
    else if (e.state === 'attack' || e.state === 'alert') s = f.aim;
    else s = e.moving ? f.w[(e.walk | 0) % 4] : f.w[1];
    q(e.x, e.y, s, 1, 0, 0, boost, boost * (boost > 1 ? .85 : 1), boost > 1 ? 2 : 1, 1, e.state === 'dead' ? -.02 : 0);
    if (boost > 1) { const o = pool[nq - 1]; if (o && o.s === s) { o.r = Math.max(o.r, 1.3); o.g = Math.max(o.g, 1.1); o.b = Math.max(o.b, .8); } }
  }
  for (const p of parts) { const k = p.life / p.max, fr = p.frames[Math.min(p.frames.length - 1, ((1 - k) * p.frames.length) | 0)]; q(p.x, p.y, fr, p.scale, p.z, p.mode, p.col[0], p.col[1], p.col[2], p.mode === 2 ? k : Math.min(1, k * 2.5), .05); }
  sorted.length = 0; for (let i = 0; i < nq; i++) sorted.push(pool[i]); sorted.sort(byDepth); const list = sorted; if (list.length * 60 > sprV.length) list.length = (sprV.length / 60) | 0;
  let n = 0;
  for (const o of list) {
    const x0 = o.cx - o.hw, x1 = o.cx + o.hw, y0 = o.cy - o.hh, y1 = o.cy + o.hh, dp = o.d - o.bias;
    for (let k = 0; k < 6; k++) { const right = k === 1 || k > 3, bottom = k === 2 || k === 3 || k === 5; sprV[n++] = right ? x1 : x0; sprV[n++] = bottom ? y0 : y1; sprV[n++] = right ? 1 : 0; sprV[n++] = bottom ? 1 : 0; sprV[n++] = o.s; sprV[n++] = dp; sprV[n++] = o.r; sprV[n++] = o.g; sprV[n++] = o.b; sprV[n++] = o.a; }
  }
  return list.length;
}
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); let w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
  if (w > 2560) { h = Math.round(h * 2560 / w); w = 2560; }
  if (w !== W || h !== H) { W = glc.width = ov.width = w; H = glc.height = ov.height = h; }
}
function render() {
  resize(); Level.compose(L, time);
  let a = P.a, x = P.x, y = P.y;
  if (state === 'title') a = L.spawn.a + Math.sin(time * .16) * .75;
  const aspect = W / H, planeLen = Math.min(.5 * aspect * 1.1, 1.25);
  V.x = x; V.y = y; V.dx = Math.cos(a); V.dy = Math.sin(a); V.ux = -V.dy; V.uy = V.dx; V.px = V.ux * planeLen; V.py = V.uy * planeLen; V.planeLen = planeLen; V.projH = W / (2 * planeLen); V.aspect = aspect;
  const fl = state === 'play' && P.flashT > 0 ? P.flashT / .06 : 0; V.flash[0] = 2.6 * fl; V.flash[1] = 1.9 * fl; V.flash[2] = 1.0 * fl;
  const mark = state === 'play';
  for (let i = 0; i < W; i++) { const cx = 2 * (i + .5) / W - 1; cast(x, y, V.dx + V.px * cx, V.dy + V.py * cx, R, mark && (i & 7) === 0); const k = i * 4; cols[k] = R.dist; cols[k + 1] = R.tex; cols[k + 2] = R.u; cols[k + 3] = R.side; }
  Renderer.draw(W, H, V, cols, sprV, buildSprites());
  const sh = Math.min(shake, 1.5) * H * .006; glc.style.transform = shake > .01 ? `translate(${((rand() - .5) * sh).toFixed(1)}px,${((rand() - .5) * sh).toFixed(1)}px) scale(1.012)` : 'scale(1.012)';
  overlay();
}
function overlay() {
  octx.clearRect(0, 0, W, H);
  if (state === 'title' || state === 'load' || state === 'win') return;
  const c = octx, size = H * .82, img = Art.weapons[P.w];
  // weapon
  let low = 0, rot = 0;
  if (P.swap > 0) low = 1 - Math.abs(P.swap - .14) / .14;
  else if (P.reload > 0) { const k = 1 - P.reload / P.reloadMax; low = k < .18 ? k / .18 : k > .8 ? (1 - k) / .2 : 1; rot = low * .3; low *= .55; }
  if (state === 'dead') low = Math.min(1, deadT * 2);
  const ox = Math.sin(P.bob) * size * .016 * P.mv - P.turnV * size * .5 + (rand() - .5) * P.kick * size * .006;
  const oy = Math.abs(Math.cos(P.bob)) * size * .018 * P.mv + P.kick * size * .05 + low * size * .7;
  c.save(); c.translate(W / 2 + ox + size * .1, H + size * .08 + oy); c.rotate(rot - P.kick * .012); c.translate(-size / 2, -size);
  const li = (((P.y * 4) | 0) * L.LW + ((P.x * 4) | 0)) * 3, lum = clamp((L.lm[li] * .5 + L.lm[li + 1] * .4 + L.lm[li + 2] * .2) * 1.5 + (P.flashT > 0 ? 1 : 0), .12, 1);
  c.drawImage(img, 0, 0, size, size); c.globalAlpha = 1 - lum; c.drawImage(img.dark, 0, 0, size, size); c.globalAlpha = 1;
  if (P.flashT > 0 && state === 'play') {
    const mx = img.muzzle[0] / 512 * size, my = img.muzzle[1] / 512 * size, r = size * (P.w ? .17 : .2) * (.8 + rand() * .4);
    c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(mx, my, 0, mx, my, r); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(.25, 'rgba(255,220,110,.9)'); g.addColorStop(.6, 'rgba(255,130,20,.35)'); g.addColorStop(1, 'rgba(255,80,0,0)');
    c.fillStyle = g; c.beginPath(); const rot2 = rand() * 6; for (let i = 0; i < 14; i++) { const an = rot2 + i * Math.PI / 7, rr = i % 2 ? r * .45 : r; c.lineTo(mx + Math.cos(an) * rr, my + Math.sin(an) * rr); } c.fill(); c.globalCompositeOperation = 'source-over';
  }
  c.restore();
  if (state !== 'play') return;
  // crosshair
  const u = H / 1080, gap = (5 + (WEAP[P.w].spread + P.bloom + P.mv * .008) * V.projH / u * .9) * u, len = 8 * u, cx = W / 2, cy = H / 2;
  for (const [col, lw] of [['rgba(0,0,0,.55)', 4 * u], ['rgba(240,235,215,.9)', 2 * u]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(cx - gap - len, cy); c.lineTo(cx - gap, cy); c.moveTo(cx + gap, cy); c.lineTo(cx + gap + len, cy); c.moveTo(cx, cy - gap - len); c.lineTo(cx, cy - gap); c.moveTo(cx, cy + gap); c.lineTo(cx, cy + gap + len); c.stroke(); }
  if (hitMark > 0) { c.strokeStyle = `rgba(255,70,50,${hitMark / .16})`; c.lineWidth = 3 * u; const a = 7 * u, b = 15 * u; c.beginPath(); for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { c.moveTo(cx + sx * a, cy + sy * a); c.lineTo(cx + sx * b, cy + sy * b); } c.stroke(); }
  // damage direction
  for (const i of indicators) { const rel = i.a - P.a - Math.PI / 2, r0 = H * .24; c.strokeStyle = `rgba(230,30,20,${clamp(i.t, 0, 1) * .85})`; c.lineWidth = 14 * u; c.lineCap = 'round'; c.beginPath(); c.arc(cx, cy, r0, rel - .3, rel + .3); c.stroke(); }
  if (mapOn) drawMap();
}
function drawMap() {
  const c = octx, cs = Math.floor(Math.min(W / (MW + 2), H / (MH + 4))), ox = ((W - cs * MW) / 2) | 0, oy = ((H - cs * MH) / 2) | 0;
  if (seenDirty || !mapCv || mapCv.cs !== cs) {
    mapCv = mapCv && mapCv.cs === cs ? mapCv : Object.assign(document.createElement('canvas'), { width: cs * MW, height: cs * MH, cs }); const m = mapCv.getContext('2d'); m.clearRect(0, 0, mapCv.width, mapCv.height);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const i = y * MW + x; if (!seen[i]) continue; const t = cell[i];
      if (t === 0) m.fillStyle = L.isExit(x, y) ? '#1f7a36' : (x + y) % 2 ? '#2b2c33' : '#30313a';
      else if (t === 2) { const d = doors[doorAt[i]]; m.fillStyle = d.tex === T.DOOR_S ? '#c9d2da' : d.tex === T.DOOR_G ? '#e2b430' : '#96602a'; }
      else m.fillStyle = '#7c7f8a';
      m.fillRect(x * cs, y * cs, cs, cs); if (t === 2) { m.fillStyle = 'rgba(0,0,0,.45)'; const d = doors[doorAt[i]]; if (d.axis) m.fillRect(x * cs, y * cs, cs, cs * .3), m.fillRect(x * cs, y * cs + cs * .7, cs, cs * .3); else m.fillRect(x * cs, y * cs, cs * .3, cs), m.fillRect(x * cs + cs * .7, y * cs, cs * .3, cs); } }
    seenDirty = false;
  }
  c.fillStyle = 'rgba(4,4,7,.8)'; c.fillRect(0, 0, W, H); c.drawImage(mapCv, ox, oy);
  c.save(); c.translate(ox + P.x * cs, oy + P.y * cs); c.rotate(P.a); c.fillStyle = '#ff4030'; c.strokeStyle = '#fff'; c.lineWidth = Math.max(1, cs * .1); c.beginPath(); c.moveTo(cs * .9, 0); c.lineTo(-cs * .6, cs * .55); c.lineTo(-cs * .3, 0); c.lineTo(-cs * .6, -cs * .55); c.closePath(); c.fill(); c.stroke(); c.restore();
  c.fillStyle = '#d8d2c0'; c.font = `${(H * .028) | 0}px Georgia,serif`; c.textAlign = 'center'; const rm = room[(P.y | 0) * MW + (P.x | 0)];
  c.fillText('CASTLE MAP' + (rm >= 0 ? '  ·  ' + L.rooms[rm].name.toUpperCase() : ''), W / 2, Math.max(H * .04, oy - H * .012));
}
let hpShown = -1;
function hud() {
  if (!hudDirty) return; hudDirty = false;
  $('hp').textContent = Math.ceil(P.hp); $('hpfill').style.width = P.hp + '%'; $('hl').classList.toggle('lowhp', P.hp < 30); $('low').classList.toggle('on', P.hp < 30 && state === 'play');
  $('mag').textContent = P.mag[P.w]; $('res').textContent = P.ammo; $('wname').textContent = WEAP[P.w].name;
  $('k0').classList.toggle('have', !!P.keys[0]); $('k1').classList.toggle('have', !!P.keys[1]);
  $('stats').innerHTML = `KILLS <b>${stats.kills}/${stats.totalKills}</b><br>SECRETS <b>${stats.secrets}/${stats.totalSecrets}</b><br>TREASURE <b>${stats.tre}/${stats.totalTre}</b>`;
}
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if (!(dt > 0)) return; fpsAcc += dt; fpsN++; if (fpsAcc >= .5) { if (showFps) $('fps').textContent = Math.round(fpsN / fpsAcc) + ' FPS'; fpsAcc = 0; fpsN = 0; }
  if (dt > .05) dt = .05;
  if (state === 'load') return;
  if (state !== 'pause') time += dt;
  if (state === 'play') update(dt);
  if (state === 'dead') { deadT += dt; dmgFlash = Math.max(dmgFlash, .75); if (deadT > .8 && !$('s-dead').classList.contains('on')) { document.exitPointerLock && document.exitPointerLock(); show('s-dead'); } }
  shake = Math.max(0, shake - dt * 5 - shake * dt * 6); hitMark -= dt; if (state !== 'dead') dmgFlash = Math.max(0, dmgFlash - dt * 1.6);
  $('dmg').style.opacity = (state === 'dead' ? Math.min(1, .5 + deadT) : dmgFlash * .7).toFixed(2);
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) $('msg').style.opacity = 0; }
  hud(); render();
}

// ------------------------------------------------------------------ input
addEventListener('keydown', e => {
  if (e.code === 'F3') { showFps = !showFps; $('fps').style.display = showFps ? 'block' : 'none'; e.preventDefault(); return; }
  if (e.code === 'KeyN') { toggleMute(); return; }
  if (state === 'dead' && deadT > .5 && (e.code === 'KeyR' || e.code === 'Enter' || e.code === 'Space')) { start(); return; }
  if (state === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) { resume(); return; }
  if (state !== 'play') return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.repeat) return; keys.add(e.code);
  if (e.code === 'KeyE' || e.code === 'Space') interact();
  else if (e.code === 'KeyR') startReload();
  else if (e.code === 'Digit1') switchTo(0); else if (e.code === 'Digit2') switchTo(1);
  else if (e.code === 'KeyM' || e.code === 'Tab') mapOn = !mapOn;
  else if (e.code === 'Escape' || e.code === 'KeyP') { pause(); document.exitPointerLock && document.exitPointerLock(); }
  else if (e.code === 'BracketLeft' || e.code === 'BracketRight') { sens = clamp(sens * (e.code === 'BracketLeft' ? .87 : 1.15), .2, 5); localStorage.setItem('ironkeep.sens', sens); say('Mouse sensitivity ' + sens.toFixed(2), 1); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); mouseDown = false; pause(); });
addEventListener('mousemove', e => { if (state === 'play' && document.pointerLockElement === glc) { const d = clamp(e.movementX, -400, 400) * .0022 * sens; P.a += d; P.turnV = clamp(P.turnV + d * .08, -.06, .06); } });
addEventListener('mousedown', e => { if (e.button !== 0 || state !== 'play') return; if (document.pointerLockElement !== glc && !navigator.webdriver) { try { const p = glc.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (er) {} return; } mouseDown = true; firePressed = true; });
addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; });
addEventListener('wheel', e => { if (state === 'play') switchTo(P.w ? 0 : 1); }, { passive: true });
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== glc && state === 'play') pause(); });
function toggleMute() { Snd.setMuted(!Snd.muted); $('mutebtn').textContent = 'SOUND: ' + (Snd.muted ? 'OFF' : 'ON'); if (state === 'play') say(Snd.muted ? 'Sound off' : 'Sound on', 1); }
$('mutebtn').onclick = e => { e.stopPropagation(); Snd.init(); toggleMute(); };
for (const b of $('diffs').children) b.onclick = () => { diff = +b.dataset.d; for (const o of $('diffs').children) o.classList.toggle('sel', o === b); const bt = +(localStorage.getItem('ironkeep.best.' + diff) || 0); $('best').textContent = bt ? `BEST TIME (${DIFF[diff].name}): ${fmt(bt)}` : ''; };
$('b-start').onclick = start; $('b-resume').onclick = resume; $('b-restart').onclick = start; $('b-retry').onclick = start; $('b-again').onclick = start;
$('s-dead').onclick = () => { if (deadT > .5) start(); };
$('b-quit').onclick = title;

// ------------------------------------------------------------------ boot
setTimeout(() => {
  try {
    Art.build(); Renderer.init(glc);
    for (const k in ET) FR[k] = { w: [0, 1, 2, 3].map(i => Art.S[`${k}_w${i}`]), aim: Art.S[k + '_aim'], fire: Art.S[k + '_fire'], pain: Art.S[k + '_pain'], d: [0, 1, 2].map(i => Art.S[`${k}_d${i}`]), dead: Art.S[k + '_dead'] };
    for (const [id, s] of [['k0', 'key_s'], ['k1', 'key_g']]) { const x = $(id).getContext('2d'), SS = Art.SS; x.drawImage(Art.sprList[Art.S[s]], SS * .2, SS * .58, SS * .6, SS * .42, 4, 14, 88, 62); }
    title(); last = performance.now(); requestAnimationFrame(frame);
  } catch (err) { $('s-load').firstElementChild.textContent = 'This game needs WebGL2: ' + err.message; console.error(err); }
}, 40);
window.__ik = { P, get L() { return L; }, get state() { return state; }, get stats() { return stats; }, get enemies() { return enemies; }, get items() { return items; }, start, cast, R, keys, interact, fire, setDiff: d => diff = d, step: sec => { for (let i = 0; i < sec * 60 && state === 'play'; i++) { time += 1 / 60; update(1 / 60); } } };
})();
