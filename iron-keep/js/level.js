'use strict';
// The castle: a 46x40 grid. Cell types: 0 open, 1 wall, 2 door, 3 push-wall (at rest), 4 push-wall (moving).
const Level = (() => {
const MW = 46, MH = 40, LS = 4, LW = MW * LS, LH = MH * LS;
const DIRS = { N: [0, -1, 3], S: [0, 1, 2], E: [1, 0, 0], W: [-1, 0, 1] };

function build() {
  const T = Art.T;
  const cell = new Uint8Array(MW * MH).fill(1), room = new Int8Array(MW * MH).fill(-1);
  const faceTex = new Int16Array(MW * MH * 4).fill(-1), cellTex = new Int16Array(MW * MH).fill(-1);
  const floorTex = new Uint8Array(MW * MH).fill(T.F_FLAG), ceilTex = new Uint8Array(MW * MH).fill(T.C_STONE);
  const doorAt = new Int16Array(MW * MH).fill(-1), pushAt = new Int16Array(MW * MH).fill(-1), propBlock = new Uint8Array(MW * MH);
  const rooms = [], doors = [], lights = [], props = [], items = [], enemies = [], pushes = [];
  const I = (x, y) => y * MW + x;
  function carve(name, x0, y0, x1, y1, wall, floor, ceil, amb) {
    let id = rooms.findIndex(r => r.name === name);
    if (id < 0) { id = rooms.length; rooms.push({ name, wall, floor, ceil, amb }); }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = I(x, y); cell[i] = 0; room[i] = id; floorTex[i] = floor; ceilTex[i] = ceil; }
  }
  function door(x, y, lock = 0) {
    const i = I(x, y), axis = cell[I(x - 1, y)] === 0 ? 0 : 1, nb = axis === 0 ? I(x - 1, y) : I(x, y - 1);
    cell[i] = 2; doorAt[i] = doors.length; room[i] = room[nb]; floorTex[i] = floorTex[nb]; ceilTex[i] = ceilTex[nb];
    doors.push({ x, y, axis, lock, open: 0, state: 0, timer: 0, tex: lock === 1 ? T.DOOR_S : lock === 2 ? T.DOOR_G : T.DOOR });
  }
  const face = (cx, cy, d, tex) => { const [dx, dy, s] = DIRS[d]; faceTex[I(cx + dx, cy + dy) * 4 + s] = tex; };
  const light = (x, y, c, rad, fl = 0) => { const l = { x, y, c, rad, fl, ph: Math.random() * 100, k: 1 }; lights.push(l); return l; };
  function torch(cx, cy, d) {
    const [dx, dy] = DIRS[d], x = cx + .5 + dx * .44, y = cy + .5 + dy * .44;
    const L = light(cx + .5 + dx * .3, cy + .5 + dy * .3, [1.5, .78, .3], 5.5, 1);
    props.push({ x, y, s: 'torch0', torch: 1, emis: 1, bias: .2, L });
    props.push({ x, y, s: 'glow', add: 1, col: [1, .5, .16], scale: 1.7, z: .1, bias: .55, L });
  }
  function win(cx, cy, d, tex) {
    const [dx, dy] = DIRS[d]; face(cx, cy, d, tex);
    light(cx + .5 + dx * .2, cy + .5 + dy * .2, [.42, .6, 1.15], 4.6);
    props.push({ x: cx + .5 + dx * .3, y: cy + .5 + dy * .3, s: 'shaft', add: 1, col: [.2, .3, .6], scale: 1, z: 0, bias: .4 });
  }
  function hang(x, y, s, c, rad, fl, glow) {
    const L = light(x, y, c, rad, fl);
    props.push({ x, y, s, emis: 1, L }); props.push({ x, y, s: 'glow', add: 1, col: [c[0] * .5, c[1] * .5, c[2] * .5], scale: glow, z: .24, bias: .05, L });
  }
  const chandelier = (x, y) => hang(x, y, 'chandelier', [1.7, 1.0, .45], 7.5, .5, 1.5);
  const lamp = (x, y) => hang(x, y, 'lamp', [1.8, 1.4, .85], 7, .12, .9);
  const prop = (x, y, s, block = 1) => { props.push({ x, y, s, block }); if (block) propBlock[I(x | 0, y | 0)] = 1; };
  const item = (x, y, type) => items.push({ x, y, type, got: 0 });
  const enemy = (x, y, type, ang, patrol, drop) => enemies.push({ x, y, type, ang, patrol, drop });
  function push(x, y, dx, dy, tex) { const i = I(x, y); cell[i] = 3; cellTex[i] = tex; pushAt[i] = pushes.length; pushes.push({ x, y, dx, dy, tex, off: 0, state: 0 }); }
  const many = (fn, list, ...rest) => list.forEach(a => fn(...a, ...rest));

  // ---- rooms
  const dim = [.055, .06, .08];
  carve('Entrance Hall', 19, 32, 25, 37, T.STONE, T.F_FLAG, T.C_STONE, dim);
  carve('Gatehouse', 12, 33, 17, 36, T.STONE, T.F_COBBLE, T.C_STONE, dim); carve('Gatehouse', 10, 34, 11, 35, T.STONE, T.F_COBBLE, T.C_STONE, dim);
  carve('South Corridor', 21, 24, 23, 30, T.STONE, T.F_FLAG, T.C_STONE, [.04, .045, .06]); carve('South Corridor', 24, 26, 25, 28, T.STONE, T.F_FLAG, T.C_STONE);
  carve('Crossing', 19, 18, 25, 22, T.STONE, T.F_TILE, T.C_WOOD, dim);
  carve('Barracks', 8, 17, 17, 24, T.BRICK, T.F_WOOD, T.C_WOOD, [.06, .05, .045]);
  carve('Secret Cache', 3, 20, 6, 24, T.BRICK, T.F_COBBLE, T.C_WOOD, [.05, .04, .035]);
  carve('Mess Hall', 27, 14, 40, 25, T.WAINSCOT, T.F_TILE, T.C_PLASTER, [.06, .06, .07]);
  carve('Storage', 30, 27, 38, 33, T.CELLAR, T.F_COBBLE, T.C_STONE, [.035, .045, .04]);
  carve('Hidden Vault', 40, 28, 43, 32, T.CELLAR, T.F_COBBLE, T.C_STONE, [.035, .045, .04]);
  carve('North Corridor', 5, 11, 37, 12, T.STONE, T.F_FLAG, T.C_STONE, [.04, .045, .06]); carve('North Corridor', 21, 13, 23, 16, T.STONE, T.F_FLAG, T.C_STONE);
  carve('Chapel', 3, 3, 11, 9, T.LIME, T.F_FLAG, T.C_PLASTER, [.06, .06, .085]);
  carve('Armory', 15, 3, 25, 9, T.STEEL, T.F_COBBLE, T.C_STONE, [.075, .08, .09]);
  carve('Guard Passage', 27, 5, 29, 7, T.STONE, T.F_FLAG, T.C_STONE, dim);
  carve('Officer Quarters', 31, 3, 41, 9, T.WOOD, T.F_CARPET, T.C_WOOD, [.065, .05, .04]);
  for (let y = 4; y <= 9; y++) floorTex[I(7, y)] = T.F_CARPET;

  // ---- doors and push-walls
  many(door, [[22, 31], [22, 23], [18, 20], [26, 20], [22, 17], [34, 26], [7, 10], [26, 6]]);
  door(20, 10, 1); door(30, 6, 1); door(18, 35, 2);
  push(7, 22, -1, 0, T.BANNER_B); push(39, 30, 1, 0, T.CELLAR_V);

  // ---- entrance hall
  many(torch, [[20, 32, 'N'], [24, 32, 'N'], [20, 37, 'S'], [24, 37, 'S']]);
  many(face, [[21, 32, 'N'], [23, 32, 'N'], [22, 37, 'S']], T.BANNER);
  many(win, [[25, 33, 'E'], [25, 36, 'E']], T.WINDOW);
  many(prop, [[19.5, 32.5], [25.5, 32.5]], 'armor'); many(prop, [[19.5, 37.5], [25.5, 37.5]], 'barrel'); prop(24.5, 37.5, 'crate');
  item(20.5, 37.4, 'clip');
  // ---- gatehouse (exit)
  many(torch, [[14, 33, 'N'], [16, 36, 'S'], [12, 36, 'S']]);
  face(10, 34, 'W', T.EXIT); face(10, 35, 'W', T.EXIT); light(10.6, 35, [.3, 1.0, .45], 3.2);
  prop(14.5, 35.5, 'sandbags'); prop(14.5, 34.5, 'sandbags'); many(prop, [[12.5, 33.5], [17.5, 33.5]], 'barrel');
  enemy(12.6, 34.6, 'elite', 0); enemy(13.5, 36.5, 'guard', 0);
  // ---- south corridor and guard post
  many(torch, [[21, 25, 'W'], [23, 29, 'E'], [25, 26, 'N']]);
  face(21, 28, 'W', T.BANNER);
  prop(25.5, 28.5, 'table'); prop(25.5, 26.5, 'crate'); item(24.6, 28.5, 'food');
  enemy(24.6, 27.5, 'guard', Math.PI); enemy(22.5, 25.5, 'guard', Math.PI / 2, [[22.5, 29.4], [22.5, 24.7]]);
  // ---- crossing
  chandelier(22.5, 20.5);
  many(prop, [[19.5, 18.5], [25.5, 18.5], [19.5, 22.5], [25.5, 22.5]], 'armor');
  many(face, [[20, 18, 'N'], [24, 18, 'N'], [20, 22, 'S'], [24, 22, 'S']], T.BANNER);
  enemy(20.6, 19.4, 'guard', .6); enemy(24.5, 21.5, 'guard', Math.PI, [[24.5, 21.5], [24.5, 19.5], [20.6, 21.5]]);
  // ---- barracks
  lamp(12.5, 19.2); lamp(12.5, 22.6); many(torch, [[17, 18, 'E'], [17, 23, 'E']]);
  many(prop, [[9.5, 17.5], [11.5, 17.5], [13.5, 17.5], [15.5, 17.5], [9.5, 24.5], [11.5, 24.5], [13.5, 24.5], [15.5, 24.5]], 'bunk');
  many(prop, [[12.5, 20.5], [13.5, 20.5]], 'table'); prop(8.5, 17.5, 'crate');
  enemy(10.5, 19.5, 'guard', 0); enemy(14.5, 18.8, 'guard', 1.2); enemy(9.5, 23.2, 'guard', -.6); enemy(15.5, 22.5, 'guard', Math.PI, [[16.5, 22.5], [9.5, 21.7]]);
  many(item, [[16.5, 24.5], [10.5, 17.5]], 'clip'); item(14.5, 20.5, 'food');
  // ---- secret cache (behind the banner in the barracks)
  torch(3, 22, 'W'); torch(5, 20, 'N');
  many(item, [[3.5, 20.5], [4.5, 20.5]], 'chest'); item(3.5, 24.5, 'crown'); item(5.5, 24.5, 'ammobox'); item(3.5, 23.3, 'medkit');
  prop(6.5, 20.5, 'barrel');
  // ---- mess hall
  many(chandelier, [[31, 20], [37, 20]]); many(torch, [[27, 15, 'W'], [27, 25, 'W']]);
  many(win, [[40, 16, 'E'], [40, 20, 'E'], [40, 24, 'E']], T.WINDOW_W);
  many(face, [[30, 14, 'N'], [34, 14, 'N'], [38, 14, 'N'], [30, 25, 'S'], [38, 25, 'S']], T.BANNER_W);
  for (const y of [17.5, 22.5]) many(prop, [[30.5, y], [32.5, y], [34.5, y], [36.5, y]], 'table');
  many(item, [[31.5, 17.5], [35.5, 22.5], [33.5, 22.5]], 'food'); item(39.5, 14.5, 'chalice'); item(28.5, 25.5, 'clip'); item(39.5, 25.5, 'medkit');
  enemy(33.5, 15.5, 'guard', 0, [[39.3, 15.5], [39.3, 20], [28.5, 20], [28.5, 15.5]]);
  enemy(38.5, 19.3, 'guard', Math.PI); enemy(30.5, 24.4, 'guard', -1.2); enemy(37.5, 23.8, 'officer', Math.PI, null, 'key_s');
  // ---- storage and hidden vault
  torch(30, 30, 'W'); lamp(35.5, 30.5);
  many(prop, [[30.5, 27.5], [31.5, 27.5], [30.5, 28.5], [38.5, 27.5], [38.5, 33.5], [37.5, 33.5], [30.5, 33.5]], 'barrel');
  many(prop, [[32.5, 32.5], [36.5, 28.5], [32.5, 33.5]], 'crate');
  item(31.5, 33.5, 'clip'); item(37.5, 27.5, 'food'); item(38.5, 32.4, 'medkit');
  enemy(34.5, 32.5, 'guard', -1.57); enemy(37.4, 29.6, 'guard', 2.4);
  torch(43, 30, 'E'); torch(41, 32, 'S');
  many(item, [[42.5, 28.5], [43.5, 32.5]], 'chest'); item(43.5, 28.5, 'chalice'); item(40.5, 32.5, 'ammobox'); item(40.5, 28.5, 'medkit');
  // ---- north corridor
  many(torch, [[9, 11, 'N'], [14, 12, 'S'], [18, 11, 'N'], [24, 11, 'N'], [28, 12, 'S'], [33, 11, 'N'], [21, 14, 'W']]);
  many(win, [[37, 11, 'E']], T.WINDOW); face(5, 11, 'W', T.BANNER); face(5, 12, 'W', T.BANNER);
  prop(36.5, 12.5, 'crate'); prop(5.5, 12.5, 'armor'); item(36.5, 11.5, 'clip');
  enemy(8.5, 11.5, 'guard', 0, [[6.5, 11.5], [18.5, 12.4]]); enemy(31.5, 12.4, 'guard', Math.PI, [[35.5, 12.4], [25.5, 11.5]]);
  // ---- chapel
  many(face, [[5, 3, 'N'], [7, 3, 'N'], [9, 3, 'N']], T.GLASS);
  many(light, [[5.5, 3.8], [9.5, 3.8]], [.55, .45, 1.0], 4.6); light(7.5, 4.4, [1.0, .5, .5], 4);
  many(torch, [[3, 6, 'W'], [11, 6, 'E'], [5, 9, 'S'], [9, 9, 'S']]);
  prop(7.5, 3.5, 'altar');
  many(prop, [[4.5, 5.5], [5.5, 5.5], [9.5, 5.5], [10.5, 5.5], [4.5, 7.5], [5.5, 7.5], [9.5, 7.5], [10.5, 7.5]], 'pew');
  item(3.5, 3.5, 'medkit'); item(11.5, 3.5, 'clip'); item(6.4, 3.6, 'chalice');
  enemy(7.5, 6.5, 'guard', 1.57, [[7.5, 8.6], [7.5, 4.8]]); enemy(8.6, 4.4, 'officer', 1.57);
  // ---- armory
  lamp(17.5, 6.8); lamp(23.5, 6.8); lamp(20.5, 4.2);
  many(face, [[16, 3, 'N'], [18, 3, 'N'], [20, 3, 'N'], [22, 3, 'N'], [24, 3, 'N'], [15, 5, 'W'], [15, 7, 'W'], [17, 9, 'S'], [23, 9, 'S']], T.RACK);
  prop(20.5, 5.5, 'table'); many(prop, [[17.5, 5.5], [23.5, 5.5]], 'rack'); many(prop, [[15.5, 9.5], [16.5, 9.5], [25.5, 3.5], [15.5, 3.5]], 'crate');
  item(20.5, 6.5, 'smg'); many(item, [[19.5, 4.5], [21.5, 4.5]], 'ammobox'); many(item, [[24.5, 9.5], [16.5, 3.6]], 'clip');
  enemy(23.6, 8.4, 'guard', Math.PI);
  // ---- guard passage
  torch(28, 5, 'N'); face(28, 7, 'S', T.BANNER);
  enemy(28.5, 6.6, 'elite', Math.PI);
  // ---- officer quarters
  chandelier(35.5, 6.5); win(41, 6, 'E', T.WINDOW_Q); lamp(38.5, 4.6);
  many(face, [[32, 3, 'N'], [33, 3, 'N'], [35, 3, 'N'], [32, 9, 'S'], [33, 9, 'S']], T.BOOKS); many(face, [[38, 3, 'N'], [37, 9, 'S']], T.MAP);
  prop(38.5, 5.5, 'desk'); prop(40.5, 3.5, 'bed'); prop(40.5, 9.5, 'bed'); prop(33.5, 8.5, 'table'); prop(31.5, 3.5, 'armor');
  item(39.6, 5.5, 'key_g'); item(41.5, 8.5, 'crown'); item(31.5, 9.5, 'medkit'); item(35.5, 9.5, 'clip');
  enemy(36.5, 4.5, 'officer', Math.PI); enemy(39.5, 7.8, 'officer', Math.PI);

  const L = { MW, MH, cell, room, rooms, faceTex, cellTex, floorTex, ceilTex, doorAt, pushAt, propBlock, doors, lights, props, items, enemies, pushes,
    spawn: { x: 22.5, y: 36.3, a: -Math.PI / 2 }, isExit: (cx, cy) => cx <= 10 && cy >= 34 && cy <= 35 && cell[I(cx, cy)] === 0 };
  bake(L);
  return L;
}

// ---- lightmap: 4 texels per cell, one precomputed occlusion patch per light, recomposed every frame for flicker
function los(cell, x0, y0, x1, y1) {
  let mx = x0 | 0, my = y0 | 0; const tx = x1 | 0, ty = y1 | 0, dx = x1 - x0, dy = y1 - y0;
  const sxp = dx > 0 ? 1 : -1, syp = dy > 0 ? 1 : -1, ddx = dx === 0 ? 1e30 : Math.abs(1 / dx), ddy = dy === 0 ? 1e30 : Math.abs(1 / dy);
  let sx = dx > 0 ? (mx + 1 - x0) * ddx : (x0 - mx) * ddx, sy = dy > 0 ? (my + 1 - y0) * ddy : (y0 - my) * ddy;
  for (let i = 0; i < 80; i++) {
    if (mx === tx && my === ty) return true;
    if (sx < sy) { sx += ddx; mx += sxp; } else { sy += ddy; my += syp; }
    if (cell[my * MW + mx] !== 0) return false;
  }
  return true;
}
function bake(L) {
  const { cell, room, rooms } = L, n = LW * LH;
  const spx = new Float32Array(n).fill(-1), spy = new Float32Array(n), base = new Float32Array(n * 3);
  const open = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && cell[y * MW + x] === 0;
  for (let j = 0; j < LH; j++) for (let i = 0; i < LW; i++) {
    const px = (i + .5) / LS, py = (j + .5) / LS, cx = px | 0, cy = py | 0, k = j * LW + i;
    let sx = -1, sy = 0;
    if (cell[cy * MW + cx] === 0) { sx = px; sy = py; }
    else { // wall texels take the light arriving at their nearest open face
      const fx = px - cx, fy = py - cy; let best = 9;
      if (open(cx - 1, cy) && fx < best) { best = fx; sx = cx - .04; sy = py; }
      if (open(cx + 1, cy) && 1 - fx < best) { best = 1 - fx; sx = cx + 1.04; sy = py; }
      if (open(cx, cy - 1) && fy < best) { best = fy; sx = px; sy = cy - .04; }
      if (open(cx, cy + 1) && 1 - fy < best) { best = 1 - fy; sx = px; sy = cy + 1.04; }
    }
    if (sx < 0) continue;
    spx[k] = sx; spy[k] = sy;
    const r = rooms[room[(sy | 0) * MW + (sx | 0)]], a = (r && r.amb) || [.05, .055, .07];
    base[k * 3] = a[0]; base[k * 3 + 1] = a[1]; base[k * 3 + 2] = a[2];
  }
  for (const l of L.lights) {
    const idx = [], val = [];
    const i0 = Math.max(0, Math.floor((l.x - l.rad) * LS)), i1 = Math.min(LW - 1, Math.ceil((l.x + l.rad) * LS));
    const j0 = Math.max(0, Math.floor((l.y - l.rad) * LS)), j1 = Math.min(LH - 1, Math.ceil((l.y + l.rad) * LS));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * LW + i; if (spx[k] < 0) continue;
      const d = Math.hypot(spx[k] - l.x, spy[k] - l.y); if (d >= l.rad) continue;
      if (!los(cell, l.x, l.y, spx[k], spy[k])) continue;
      const a = 1 - d / l.rad; idx.push(k); val.push(a * a / (.55 + d * d * .2));
    }
    l.pi = Uint32Array.from(idx); l.pv = Float32Array.from(val);
  }
  L.lbase = base; L.lm = new Float32Array(n * 3); L.LW = LW; L.LH = LH; L.LS = LS;
}
function compose(L, t) {
  const lm = L.lm; lm.set(L.lbase);
  for (const l of L.lights) {
    const k = 1 + l.fl * (.11 * Math.sin(t * 9.1 + l.ph) + .08 * Math.sin(t * 17.3 + l.ph * 1.7) + .06 * Math.sin(t * 31.7 + l.ph * .6));
    l.k = k; const r = l.c[0] * k, g = l.c[1] * k, b = l.c[2] * k, pi = l.pi, pv = l.pv;
    for (let j = 0; j < pi.length; j++) { const i = pi[j] * 3, v = pv[j]; lm[i] += r * v; lm[i + 1] += g * v; lm[i + 2] += b * v; }
  }
}
return { MW, MH, build, compose };
})();
