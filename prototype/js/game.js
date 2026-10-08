// ===== game: the player's Chog, tap/WASD movement with path finding, follow camera, see-through occluders =====
// Loaded after world_c.js and traits.js, before main.js. Everything per frame runs from `animated`.
const GAME = { me: null, traits: DEFAULT_TRAITS, path: [], speed: 2.7, keys: {}, moving: false, onChange: null, room: null, editMode: false, camFixed: null };
const WALK_R = 0.25, CELL = 0.25, GRID_HALF = HALF + 1;     // collision radius, path grid cell, grid extent
const CAM_FWD = new THREE.Vector3(-1, 0, -1).normalize(), CAM_RIGHT = new THREE.Vector3(1, 0, -1).normalize();

// ---- blockers: footprints registered by the world (world_city.js); walking collides with these rects (half sizes) and with the slab edge
const BLOCKERS = WORLD_BLOCKERS.slice();
const LIM = HALF - 0.45;
function blocked(x, z, r = WALK_R) {
  if (GAME.room) return GAME.room.blocked(x, z, r);                          // inside a room (room.js): its own floor, walls and furniture
  if (Math.abs(x) > LIM || Math.abs(z) > LIM) return true;
  for (const b of BLOCKERS) if (Math.abs(x - b.x) < b.hw + r && Math.abs(z - b.z) < b.hd + r) return true;
  return false;
}

// ---- A* on a grid, then line-of-sight smoothing
const N = Math.round(GRID_HALF * 2 / CELL);
const toCell = v => Math.max(0, Math.min(N - 1, Math.floor((v + GRID_HALF) / CELL))), toWorld = c => (c + 0.5) * CELL - GRID_HALF;
const GRID = new Uint8Array(N * N);
GAME.regrid = () => { for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) GRID[j * N + i] = blocked(toWorld(i), toWorld(j)) ? 1 : 0; };
GAME.regrid();
function clear(ax, az, bx, bz) { const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.15); for (let k = 1; k <= n; k++) { const t = k / n; if (blocked(ax + (bx - ax) * t, az + (bz - az) * t)) return false; } return true; }
function nearestFree(x, z) {
  const ci = toCell(x), cj = toCell(z); if (!GRID[cj * N + ci]) return [toWorld(ci), toWorld(cj)];
  for (let r = 1; r < 40; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = ci + di, j = cj + dj;
    if (i >= 0 && j >= 0 && i < N && j < N && !GRID[j * N + i]) return [toWorld(i), toWorld(j)];
  }
  return null;
}
function findPath(ax, az, bx, bz) {
  const goal = nearestFree(bx, bz); if (!goal) return [];
  if (clear(ax, az, goal[0], goal[1])) return [goal];
  const si = toCell(ax), sj = toCell(az), gi = toCell(goal[0]), gj = toCell(goal[1]);
  const g = new Float32Array(N * N).fill(1e9), from = new Int32Array(N * N).fill(-1), open = [[0, sj * N + si]]; g[sj * N + si] = 0;
  const h = (i, j) => Math.hypot(i - gi, j - gj);
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
    const [, cur] = open.splice(bi, 1)[0], ci = cur % N, cj = (cur / N) | 0;
    if (ci === gi && cj === gj) break;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= N || j >= N || GRID[j * N + i]) continue;
      if (di && dj && (GRID[cj * N + i] || GRID[j * N + ci])) continue;            // no corner cutting
      const ng = g[cur] + Math.hypot(di, dj); if (ng < g[j * N + i]) { g[j * N + i] = ng; from[j * N + i] = cur; open.push([ng + h(i, j), j * N + i]); }
    }
  }
  if (from[gj * N + gi] < 0 && !(si === gi && sj === gj)) return [];
  const cells = []; for (let c = gj * N + gi; c >= 0 && c !== sj * N + si; c = from[c]) cells.push(c); cells.reverse();
  let pts = cells.map(c => [toWorld(c % N), toWorld((c / N) | 0)]); pts.push(goal);
  const out = []; let ax2 = ax, az2 = az, k = 0;                                 // string pulling
  while (k < pts.length) { let far = k; for (let m = pts.length - 1; m > k; m--) if (clear(ax2, az2, pts[m][0], pts[m][1])) { far = m; break; } out.push(pts[far]); ax2 = pts[far][0]; az2 = pts[far][1]; k = far + 1; }
  return out;
}

// ---- the player
GAME.setTraits = function (traits) {
  const old = GAME.me, pos = old ? old.position.clone() : new THREE.Vector3(CITY.spawn[0], 0, CITY.spawn[1]), ry = old ? old.rotation.y : 0.6;
  if (old) { world.remove(old); }
  const c = chogFromTraits(traits, { scale: CHOG_SCALE * 1.08 });
  c.position.copy(pos); c.rotation.y = ry; world.add(c); GAME.me = c; GAME.traits = traits; GAME.t0 = 0;
  if (!GAME.ring) {                                                              // soft ring under the player + tap marker
    GAME.ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.44, 24), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    GAME.ring.rotation.x = -Math.PI / 2; GAME.ring.userData.noNormal = true; world.add(GAME.ring); hiddenInNormal.push(GAME.ring);
    GAME.mark = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    GAME.mark.rotation.x = -Math.PI / 2; GAME.mark.userData.noNormal = true; world.add(GAME.mark); hiddenInNormal.push(GAME.mark);
  }
  if (GAME.onChange) GAME.onChange(traits);
};
GAME.walkTo = function (x, z, wasBlocked) {
  if (!GAME.me) return; let p = findPath(GAME.me.position.x, GAME.me.position.z, x, z); if (!p.length) { const g = nearestFree(x, z); if (g) p = [g]; } GAME.path = p;
  if (wasBlocked) { GAME.mark.position.set(x, 0.04, z); GAME.mark.material.color.set(0xff6a5a); GAME.markT = 1; }          // red ring where you clicked, you walk to the nearest free spot
  else if (p.length) { const e = p[p.length - 1]; GAME.mark.position.set(e[0], 0.04, e[1]); GAME.mark.material.color.set(0xffffff); GAME.markT = 1; }
};

// ---- input: click to move (a short press that did not drag), WASD / arrows, hover feedback
const NPC_NAMES = ['Pip', 'Mochi', 'Biscuit', 'Nori', 'Waffle', 'Pepper', 'Olive', 'Maple', 'Sprout', 'Clover', 'Truffle', 'Pudding'];   // placeholder residents
GAME.nameOf = root => (root === GAME.me ? (GAME.nameFn ? GAME.nameFn() : 'Chog') : root.userData.netName || NPC_NAMES[Math.max(0, walkers.findIndex(w => w.c === root)) % NPC_NAMES.length]);
GAME.extraRoots = () => [];                                                         // other players' Chogs (net.js replaces this)
GAME.zoomMin = 7; GAME.zoomMax = 26; GAME.zoomT = 15; GAME.hoverChog = null;
(function () {
  const dom = renderer.domElement, ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pt = new THREE.Vector3(), ndc = new THREE.Vector2();
  const glow = (geo, col) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.userData.noNormal = true; world.add(m); hiddenInNormal.push(m); return m; };
  const dia = new THREE.RingGeometry(0.31, 0.4, 4); dia.rotateZ(Math.PI / 4);
  const tile = glow(dia, 0xffe27a), ring = glow(new THREE.RingGeometry(0.5, 0.62, 28), 0xfff0b0);
  let down = null, ptr = null;
  const toNdc = e => { const r = dom.getBoundingClientRect(); return ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  const chogAt = () => {
    const roots = [GAME.me, ...walkers.filter(w => w.c.visible).map(w => w.c), ...GAME.extraRoots()]; ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(roots, true).find(h => !(h.object.userData && (h.object.userData.isHull || h.object.userData.noNormal)) && h.object.isMesh);
    if (!hit) return null; let o = hit.object; while (o && !roots.includes(o)) o = o.parent; return o || null;
  };
  GAME.updateHover = () => {                                     // runs every frame so the marker follows the camera too
    if (!ptr || GAME.dragUI || GAME.editMode) { tile.material.opacity = ring.material.opacity = 0; return; }
    toNdc(ptr); const c = chogAt(); GAME.hoverChog = c;
    ray.setFromCamera(ndc, cam);
    if (c) { dom.style.cursor = c === GAME.me ? 'default' : 'pointer'; ring.position.set(c.position.x, 0.05, c.position.z); ring.material.opacity = 0.75; tile.material.opacity = 0; return; }
    ring.material.opacity = 0;
    if (ray.ray.intersectPlane(plane, pt)) {
      const x = Math.round(pt.x * 2) / 2, z = Math.round(pt.z * 2) / 2, bad = blocked(pt.x, pt.z, 0.05);
      tile.position.set(x, 0.045, z); tile.material.color.set(bad ? 0xff6a5a : 0xffe27a); tile.material.opacity = bad ? 0.55 : 0.7;
      dom.style.cursor = bad ? 'not-allowed' : 'default';
    }
  };
  dom.addEventListener('pointermove', e => { ptr = e; });
  dom.addEventListener('pointerleave', () => { ptr = null; GAME.hoverChog = null; });
  dom.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  addEventListener('pointerup', e => {
    if (!down || e.target !== dom) { down = null; return; }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
    if (moved > 10 || dt > 500 || GAME.editMode) return;                   // while decorating a room the editor (room.js) owns the mouse
    toNdc(e); const c = chogAt();
    if (c && c !== GAME.me) { if (c.userData.onClick) { c.userData.onClick(); return; } if (c.userData.netId) { if (typeof NET !== 'undefined') NET.openCard(c.userData.netId); } else if (typeof toast === 'function') toast(GAME.nameOf(c) + ': "Hello there!"'); return; }
    ray.setFromCamera(ndc, cam);
    if (ray.ray.intersectPlane(plane, pt)) GAME.walkTo(pt.x, pt.z, blocked(pt.x, pt.z, 0.05));
  });
  const KEY = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  addEventListener('keydown', e => { if (KEY[e.code] && !e.target.matches('input,textarea')) { GAME.keys[KEY[e.code]] = true; GAME.path = []; e.preventDefault(); } });
  addEventListener('keyup', e => { if (KEY[e.code]) GAME.keys[KEY[e.code]] = false; });
})();

// ---- see-through occluders: clone materials once per building/tree, fade them when they cover the player on screen
for (const o of occluders) {
  o.mats = []; o.a = 1; o.g.updateMatrixWorld(true);
  o.g.traverse(m => { if (m.isMesh && !m.userData.isHull) { const arr = Array.isArray(m.material), list = (arr ? m.material : [m.material]).map(x => { const c = x.clone(); c.userData = { base: x.opacity, wasTransparent: x.transparent }; o.mats.push(c); return c; }); m.material = arr ? list : list[0]; } });
  o.box = new THREE.Box3().setFromObject(o.g); o.pts = [];
  for (let k = 0; k < 8; k++) o.pts.push(new THREE.Vector3(k & 1 ? o.box.max.x : o.box.min.x, k & 2 ? o.box.max.y : o.box.min.y, k & 4 ? o.box.max.z : o.box.min.z));
}
const _p = new THREE.Vector3(), _q = new THREE.Vector3(), VIEW_DIR = CAM_DIR.clone().negate();   // camera looks along -CAM_DIR
function playerScreen(y) { _p.set(GAME.me.position.x, y, GAME.me.position.z).project(cam); return [_p.x, _p.y]; }
function fadeOccluders(dt) {
  if (!GAME.me || GAME.room) return;
  cam.updateMatrixWorld(); const feet = playerScreen(0.15), head = playerScreen(1.0);
  const pd = _q.set(GAME.me.position.x, 0.6, GAME.me.position.z).sub(cam.position).dot(VIEW_DIR);
  for (const o of occluders) {
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9, dmin = 1e9;
    for (const p of o.pts) { _p.copy(p).project(cam); x0 = Math.min(x0, _p.x); x1 = Math.max(x1, _p.x); y0 = Math.min(y0, _p.y); y1 = Math.max(y1, _p.y); dmin = Math.min(dmin, _q.copy(p).sub(cam.position).dot(VIEW_DIR)); }
    o.rect = [x0, x1, y0, y1]; o.dmin = dmin;
    const m = 0.03, over = [feet, head].some(([x, y]) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m);
    const target = over && dmin < pd - 0.4 && playerBehind(o) ? o.min : 1;
    o.a += (target - o.a) * (1 - Math.exp(-dt * 9));
    const fading = o.a < 0.985;
    if (fading !== !!o.fading) {
      o.fading = fading;
      for (const c of o.mats) { c.transparent = fading || c.userData.wasTransparent; c.depthWrite = !fading; c.needsUpdate = true; }
      const i = noNormalPass.indexOf(o.g); if (fading && i < 0) noNormalPass.push(o.g); else if (!fading && i >= 0) noNormalPass.splice(i, 1);
    }
    if (fading || o.a < 1) for (const c of o.mats) c.opacity = o.a * c.userData.base;
  }
}
// is a world point hidden behind a building or tree that is not see-through right now?
const _h = new THREE.Vector3();
GAME.hiddenAt = pos => {
  if (GAME.room) return false;
  _h.copy(pos).project(cam); const d = _q.copy(pos).sub(cam.position).dot(VIEW_DIR);
  for (const o of occluders) {
    if (!o.rect || o.a < 0.9) continue; const [x0, x1, y0, y1] = o.rect, c = o.box.getCenter(_q);
    if (_h.x > x0 && _h.x < x1 && _h.y > y0 && _h.y < y1 && o.dmin < d - 0.4 && pos.x + pos.z < c.x + c.z + 1.2) return true;
  }
  return false;
};
// the player is behind the object when its centre is farther from the camera along the ground diagonal
function playerBehind(o) { const c = o.box.getCenter(new THREE.Vector3()); return (GAME.me.position.x + GAME.me.position.z) < (c.x + c.z) + 1.2; }

// ---- per-frame: move, animate, follow
const _d = new THREE.Vector3(), _want = new THREE.Vector3();
animated.push((t, dt) => {
  const me = GAME.me; if (!me) return;
  let mx = 0, mz = 0;
  const k = GAME.keys; if (k.u || k.d || k.l || k.r) { _d.set(0, 0, 0).addScaledVector(CAM_FWD, (k.u ? 1 : 0) - (k.d ? 1 : 0)).addScaledVector(CAM_RIGHT, (k.r ? 1 : 0) - (k.l ? 1 : 0)); if (_d.lengthSq() > 0) { _d.normalize(); mx = _d.x; mz = _d.z; } }
  else if (GAME.path.length) {
    const [tx, tz] = GAME.path[0], dx = tx - me.position.x, dz = tz - me.position.z, L = Math.hypot(dx, dz);
    if (L < 0.12) GAME.path.shift(); else { mx = dx / L; mz = dz / L; }
  }
  const moving = mx !== 0 || mz !== 0; GAME.moving = moving;
  if (moving) {
    const sp = GAME.speed * dt, nx = me.position.x + mx * sp, nz = me.position.z + mz * sp;
    if (!blocked(nx, me.position.z)) me.position.x = nx; if (!blocked(me.position.x, nz)) me.position.z = nz;
    let dr = Math.atan2(mx, mz) - me.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); me.rotation.y += dr * Math.min(1, dt * 12);
  }
  // same walk / idle animation as the crowd
  const u = me.userData, ph = t * 9, sw = Math.sin(ph);
  if (moving) { u.legs[0].rotation.x = sw * 0.65; u.legs[1].rotation.x = -sw * 0.65; u.arms[0].rotation.x = -sw * 0.7; u.arms[1].rotation.x = sw * 0.7; u.body.position.y = Math.abs(sw) * 0.05; u.head.position.y = 1.0 + Math.abs(sw) * 0.05; }
  else { const b = Math.sin(t * 2) * 0.015; u.body.position.y = b; u.head.position.y = 1.0 + b * 1.4; u.legs.forEach(l => l.rotation.x = 0); u.arms.forEach(a => a.rotation.x = Math.sin(t * 2) * 0.05); }
  const blink = Math.sin(t * 0.9) > 0.985 ? 0.12 : 1; u.eyes.forEach(e => e.scale.y = (e.userData.by || 0.095) * blink);
  GAME.ring.position.set(me.position.x, 0.04, me.position.z); GAME.ring.material.opacity = 0.55 + 0.2 * Math.sin(t * 3);
  if (GAME.markT > 0) { GAME.markT = Math.max(0, GAME.markT - dt * 1.4); GAME.mark.material.opacity = GAME.markT; GAME.mark.scale.setScalar(1 + (1 - GAME.markT) * 0.8); }
  // follow camera
  if (GAME.camFixed) _want.copy(GAME.camFixed);
  else { _want.set(me.position.x, 1.1, me.position.z); _want.x = Math.max(-HALF - 1, Math.min(HALF + 1, _want.x)); _want.z = Math.max(-HALF - 1, Math.min(HALF + 1, _want.z)); }
  camTarget.lerp(_want, 1 - Math.exp(-dt * 5));
  FW += (GAME.zoomT - FW) * (1 - Math.exp(-dt * 10)); updateCam();
  GAME.updateHover();
  fadeOccluders(dt);
});

// start: a default Chog, camera on it, a gameplay zoom that fits the screen shape
GAME.setTraits(GAME.traits);
GAME.zoomT = FW = ASPECT >= 1 ? 15 : 9.5; camTarget.set(GAME.me.position.x, 1.1, GAME.me.position.z); updateCam();
