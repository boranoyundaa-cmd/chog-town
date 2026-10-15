// ===== hotel: the Chog Hotel (docs/game/world.md): a lobby with a reception and an elevator, and floors with a wall of rooms =====
// Floor 0 is the lobby (a rectangle with the reception desk, the elevator and the street door). Floors 1..N are square halls 24 x 24 m (6 m tall) generated from the server's list of venues:
// eight wall units of 5 m: units 1 to 4 on the north back wall and 5 to 8 on the west back wall; the elevator stands in the corner (3.5 m). The camera only draws the two back walls.
// door number = floor * 100 + first unit (the basement counts down: B1 unit 3 is -103). A room holds 1 unit (a free room), 2 (Ser), 4 (a whole wall) or 8 (the whole floor); from tier 3 it holds the same units on the floor above too (its upper level).
// The basement floors (-1 = B1...) are halls like the others; their rooms come with the floor (message `facades`, field `rooms`).
// Every hotel scene hides the town like a room does (ROOM.showTown, DAY.pause). A venue is a room document the server serves (ROOM.enterVenue); leaving it returns to its door.
// Loaded after room.js and net.js. Needs the town server: the list of venues and the head count come from it.
const HOTEL = { active: false, away: false, floor: 0, info: null, counts: {}, facadeBy: {}, basementBy: {}, mineId: null, busy: false, ui: null, panel: null, q: '', cat: 'All', fadeEl: null };
(function () {
  const rad = d => d * Math.PI / 180, H = 6.0, wait = ms => new Promise(r => setTimeout(r, ms));
  const LOB = { w: 16.5, d: 12 };                                                    // lobby floor: x -8.25..8.25, z -6..6, walls 6 m tall
  const FLH = 12, ELEV = 3.5, UNIT = 5, FAC_D = 1.6;                                       // a floor: half size of the hall, the corner the elevator takes, metres of wall per unit, how far a facade reaches into the hall
  const CAT_COL = { Winner: 0xffc23a, Club: 0xff5ab8, 'Café': 0x3fb8a0, Arcade: 0xffc23a, Gallery: 0xe8e0d0, Lounge: 0x8a5ad8, Spooky: 0xff7a1a, Workshop: 0x4a8ad8 };
  const colOf = cat => CAT_COL[cat] ?? 0x9a8ab8, hexOf = c => '#' + new THREE.Color(c).getHexString();
  const pal = () => SPACE.THEMES.studio.pal;
  const unitOf = v => (v.unit !== undefined ? v.unit : Math.abs(v.no) % 100);        // the first unit of a room (the server sends `unit`; the exhibition doors only have a number)
  const isShut = v => v.state === 'closed' || v.state === 'frozen' || !!v.locked;        // a frozen venue (its owner holds too little) is a shut door too, and so is a locked one (the owner still goes in)
  const wallOfUnit = s => (s <= 4 ? 'z' : 'x'), unitU = s => -FLH + ELEV + UNIT * ((s - 1) % 4);        // units 1 to 4 on the north wall; 5 to 8 on the west wall; where a unit starts along its wall
  const floorName = f => (f === 0 ? 'Lobby' : f === 'E' ? 'Exhibition' : f < 0 ? 'Basement B' + (-f) : 'Floor ' + f);
  const doorTag = v => v.tag || '#' + v.no;
  // the runs of wall a room holds on its own floor: one per wall it touches ({wall, a, b} = first and last unit, u0 and u1 along the wall)
  function runsOf(v) {
    const s0 = unitOf(v), n = v.units || 1, runs = []; for (let s = s0; s < s0 + n; s++) { const w = wallOfUnit(s), r = runs[runs.length - 1]; if (r && r.wall === w) r.b = s; else runs.push({ wall: w, a: s, b: s }); }
    for (const r of runs) { r.u0 = unitU(r.a); r.u1 = unitU(r.b) + UNIT; } return runs;
  }
  function doorOf(v) {                                                                 // where a room's door is (the middle of its first wall run) and where you stand in front of it
    const r = runsOf(v)[0], u = (r.u0 + r.u1) / 2;
    return r.wall === 'z' ? { wall: 'z', u, w: r.u1 - r.u0, stand: { x: u, z: -FLH + 2.3, ry: 0 } } : { wall: 'x', u, w: r.u1 - r.u0, stand: { x: -FLH + 2.3, z: u, ry: Math.PI / 2 } };
  }
  HOTEL.doorOf = doorOf;

  // ------------------------------------------------------------------ scene state (rebuilt on every floor change)
  let G = null, walk = [], rects = [], spots = [], plates = [], notes = [], locks = [], anims = [], lights = [], halos = [], npc = null, npcPlate = null, guards = [], saved = null, mapRects = [], mapDoors = [];
  const venuesOn = f => f === 'E' ? (typeof EXH !== 'undefined' && EXH.data ? EXH.pageItems() : []) : f < 0 ? (HOTEL.basementBy[f] || []).slice().sort((a, b) => unitOf(a) - unitOf(b)) : ((HOTEL.info && HOTEL.info.venues) || []).filter(v => v.floor === f).sort((a, b) => unitOf(a) - unitOf(b));
  // the directory lists the open rooms (and yours): the game's venues and the holders' first, free rooms below them; closed doors only show in the corridor. The basement is not in it (the elevator goes there).
  const listed = () => ((HOTEL.info && HOTEL.info.venues) || []).filter(v => v.state === 'open' || v.id === HOTEL.mineId).sort((a, b) => (a.free ? 1 : 0) - (b.free ? 1 : 0) || a.no - b.no);

  function blocked(x, z, r) {
    let ok = false; for (const w of walk) if (x > w[0] && x < w[1] && z > w[2] && z < w[3]) { ok = true; break; }
    if (!ok) return true;
    for (const b of rects) if (Math.abs(x - b.x) < b.hw + r && Math.abs(z - b.z) < b.hd + r) return true;
    return false;
  }
  const block = (x, z, hw, hd) => rects.push({ x, z, hw, hd });

  // ------------------------------------------------------------------ building blocks
  const wallMat = (c, pat, rx, ry) => tmat(c, { tex: reTex(SPACE.WALL[pat](), rx, ry), noCache: true, em: 0.14 });
  const floorMat = (c, pat, rx, ry) => tmat(c, { tex: reTex(SPACE.FLOOR[pat](), rx, ry), noCache: true, em: 0.14 });
  function shell(g, o) {
    const trim = tmat(pal().trim);
    for (const m of [BOX(o.lenX + 0.25, H, 0.25, wallMat(o.wallC, o.wallPat, o.lenX / 3, 1), o.cx - 0.125, H / 2, o.z0 - 0.125), BOX(0.25, H, o.lenZ, wallMat(o.wallC, o.wallPat, o.lenZ / 3, 1), o.x0 - 0.125, H / 2, o.cz)]) { m.castShadow = m.receiveShadow = true; g.add(m); }
    g.add(BOX(o.lenX, 0.16, 0.06, trim, o.cx, 0.08, o.z0 + 0.03)); g.add(BOX(0.06, 0.16, o.lenZ, trim, o.x0 + 0.03, 0.08, o.cz));
    g.add(BOX(o.lenX + 0.25, 0.14, 0.32, trim, o.cx - 0.125, H + 0.07, o.z0 - 0.125)); g.add(BOX(0.32, 0.14, o.lenZ, trim, o.x0 - 0.125, H + 0.07, o.cz));
    for (const [cx, cz, w, d] of o.floors) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), floorMat(o.floorC, o.floorPat, w / 2.4, d / 2.4)); f.position.set(cx, -0.06, cz); f.receiveShadow = true; g.add(f);
      { const sl = BOX(w + 0.4, 0.7, d + 0.4, tmat(new THREE.Color(pal().trim).multiplyScalar(1.2).getHex()), cx, -0.55, cz); sl.castShadow = false; g.add(sl); }
    }
  }
  const onWall = (g, o, wall, u, y, mesh, off = 0.02) => { if (wall === 'z') mesh.position.set(u, y, o.z0 + off); else { mesh.position.set(o.x0 + off, y, u); mesh.rotation.y = Math.PI / 2; } g.add(mesh); return mesh; };
  const halo = (g, color, size, op, x, y, z) => { const n0 = noNormalPass.length, h = glowSprite(color, size, op); h.position.set(x, y, z); g.add(h); halos.push(...noNormalPass.slice(n0)); return h; };
  function piece(g, id, x, z, ry = 0, y = 0, o = {}) {                                 // a catalog piece, placed by hand (no document): same parts, same lights
    const def = SPACE.PIECES[id]; if (!def) return null;
    const n0 = noNormalPass.length, grp = SPACE.buildParts(def.parts, pal(), lights, { anims, lightCount: () => lights.length, tint: null });
    halos.push(...noNormalPass.slice(n0)); grp.position.set(x, y, z); grp.rotation.y = rad(ry); g.add(grp);
    const wallP = def.cat === 'wall' || def.fp[1] <= 0.12, flat = def.cat === 'floor' || def.cat === 'ceiling';
    if (!wallP && !flat && !o.free) { const q = Math.round(ry / 90) % 2 !== 0; block(x, z, (q ? def.fp[1] : def.fp[0]) / 2, (q ? def.fp[0] : def.fp[1]) / 2); }
    return grp;
  }
  const sign = (txt, w, h, col = '#ffffff', bg = null, glow = null) => SPACE.textMesh(txt, w, h, col, bg, glow);

  function elevator(g, o, wall, u) {                                                   // doors, a call panel and an indicator
    const trim = tmat(pal().trim), steel = tmat(0xc8c4d4, { em: 0.2 });
    onWall(g, o, wall, u, 1.25, BOX(2.3, 2.6, 0.12, trim), 0.06); onWall(g, o, wall, u, 1.1, BOX(1.9, 2.25, 0.1, tmat(0x1a1430)), 0.1);
    onWall(g, o, wall, u - 0.47, 1.1, BOX(0.92, 2.2, 0.06, steel), 0.16); onWall(g, o, wall, u + 0.47, 1.1, BOX(0.92, 2.2, 0.06, steel), 0.16); onWall(g, o, wall, u, 1.1, BOX(0.03, 2.2, 0.04, trim), 0.2);
    onWall(g, o, wall, u + 1.45, 1.15, BOX(0.2, 0.36, 0.06, trim), 0.08); onWall(g, o, wall, u + 1.45, 1.22, BOX(0.08, 0.08, 0.04, tmat(0xffd84a, { em: 1 })), 0.12); onWall(g, o, wall, u + 1.45, 1.06, BOX(0.08, 0.08, 0.04, tmat(0xff5ab8, { em: 1 })), 0.12);
    onWall(g, o, wall, u, 3.3, sign('ELEVATOR', 2.0, 0.34, '#ffffff', '#2b1d44', '#7ae8ff'), 0.12);
    const hx = wall === 'z' ? u : o.x0 + 0.5, hz = wall === 'z' ? o.z0 + 0.5 : u; halo(g, 0x7ae8ff, 2.2, 0.35, hx, 3.3, hz);
  }
  function door(g, o, wall, u, col) {                                                  // a plain venue door in a category colour with a wall lamp
    const trim = tmat(pal().trim);
    onWall(g, o, wall, u, 1.12, BOX(1.28, 2.32, 0.1, trim), 0.05); onWall(g, o, wall, u, 1.05, BOX(1.0, 2.1, 0.12, tmat(col, { em: 0.2 })), 0.09); onWall(g, o, wall, u + 0.34, 1.0, SPH(0.06, tmat(0xf0d070)), 0.19);
    onWall(g, o, wall, u + 1.0, 2.5, BOX(0.14, 0.3, 0.12, tmat(0xfff2c8, { em: 1 })), 0.08);
    const hx = wall === 'z' ? u + 1.0 : o.x0 + 0.2, hz = wall === 'z' ? o.z0 + 0.2 : u + 1.0; halo(g, 0xffd890, 1.3, 0.5, hx, 2.5, hz);
  }
  // the default front of a room whose owner has not made a facade: the wall tinted in its colour and big lit windows on both sides of the door
  function shopfront(g, o, wall, u, W, col, shut) {
    const trim = tmat(pal().trim), tint = new THREE.Color(0xf0e2d0).lerp(new THREE.Color(col), shut ? 0.05 : 0.2).getHex();
    onWall(g, o, wall, u, (H - 0.1) / 2 + 0.05, BOX(W - 0.1, H - 0.1, 0.04, wallMat(tint, 'wainscot', W / 3, 1)), 0.04);
    const glass = new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.5), n = W < 8 ? 0 : W > 12 ? 2 : 1;           // a single unit (5 m) is just the door; 10 m has a window each side
    for (let k = 0; k < n; k++) for (const sd of [-1, 1]) {
      const wu = u + sd * (3.1 + k * 3.6); onWall(g, o, wall, wu, 2.3, BOX(2.3, 3.0, 0.08, trim), 0.06);
      onWall(g, o, wall, wu, 2.3, new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.8), new THREE.MeshBasicMaterial({ color: shut ? 0x4a3f62 : glass })), 0.11);
      onWall(g, o, wall, wu, 2.3, BOX(0.05, 2.8, 0.05, trim), 0.13); onWall(g, o, wall, wu, 2.3, BOX(2.1, 0.05, 0.05, trim), 0.13);
    }
  }
  // a stretch of wall that belongs to a venue but has no door: its upper level, or the other wall of a whole-floor venue. Glowing windows and a note.
  function reserved(g, o, wall, u0, u1, v, text) {
    const trim = tmat(pal().trim), col = colOf(v.cat), glass = new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.5), W = u1 - u0, u = (u0 + u1) / 2, n = Math.max(1, Math.round(W / 3.6));
    onWall(g, o, wall, u, (H - 0.1) / 2 + 0.05, BOX(W - 0.1, H - 0.1, 0.04, wallMat(new THREE.Color(0xf0e2d0).lerp(new THREE.Color(col), 0.12).getHex(), 'wainscot', W / 3, 1)), 0.04);
    for (let k = 0; k < n; k++) {
      const wu = u0 + (k + 0.5) * W / n; onWall(g, o, wall, wu, 2.4, BOX(2.4, 3.2, 0.08, trim), 0.06);
      onWall(g, o, wall, wu, 2.4, new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.0), new THREE.MeshBasicMaterial({ color: glass })), 0.11); onWall(g, o, wall, wu, 2.4, BOX(0.05, 3.0, 0.05, trim), 0.13);
    }
    notePlate(g, o, wall, u, 4.4, [text, v.name === 'Opening soon' ? '' : v.name], col);
  }
  // a small wall plate with one or two lines of text (reserved walls, free rooms)
  function notePlate(g, o, wall, u, y, lines, col) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const c = cv.getContext('2d');
    const draw = () => { c.clearRect(0, 0, 512, 160); c.fillStyle = '#2b1d44'; c.strokeStyle = hexOf(col); c.lineWidth = 7; c.beginPath(); c.roundRect ? c.roundRect(6, 6, 500, 148, 24) : c.rect(6, 6, 500, 148); c.fill(); c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = hexOf(col); c.font = '700 40px "Fredoka", sans-serif'; c.fillText(lines[0], 256, lines[1] ? 55 : 80); if (lines[1]) { c.fillStyle = '#ffffff'; let px = 44; c.font = `700 ${px}px "Fredoka", sans-serif`; while (c.measureText(lines[1]).width > 440 && px > 22) { px -= 3; c.font = `700 ${px}px "Fredoka", sans-serif`; } c.fillText(lines[1], 256, 108); } };
    draw(); const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4; notes.push(() => { draw(); tex.needsUpdate = true; });
    onWall(g, o, wall, u, y, new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.76), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })), 0.12);
  }
  function plateFor(g, o, wall, u, v) {                                                // the door plate: number, name, and how many people are inside right now
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192;
    const p = { v, cv, n: -1, tex: null };
    p.draw = () => {
      const c = cv.getContext('2d'); c.clearRect(0, 0, 512, 192);
      const locked = !!v.locked, shut = isShut(v), frozen = v.state === 'frozen'; c.fillStyle = '#2b1d44'; c.strokeStyle = frozen ? '#7ab8e8' : locked ? '#ff9a5a' : shut ? '#7a6a98' : hexOf(colOf(v.cat)); c.lineWidth = 8; c.beginPath(); c.roundRect ? c.roundRect(6, 6, 500, 180, 26) : c.rect(6, 6, 500, 180); c.fill(); c.stroke();
      c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = hexOf(colOf(v.cat)); c.font = '700 64px "Fredoka", sans-serif'; c.fillText(doorTag(v), 30, 62);
      c.fillStyle = '#ffffff'; let px = 44; c.font = `700 ${px}px "Fredoka", sans-serif`; while (c.measureText(v.name).width > 300 && px > 22) { px -= 3; c.font = `700 ${px}px "Fredoka", sans-serif`; }
      c.textAlign = 'right'; c.fillText(v.name, 482, 62);
      const n = HOTEL.counts[v.id] || 0; c.textAlign = 'left'; c.font = '700 36px "Fredoka", sans-serif'; c.fillStyle = v.ex ? '#ffd84a' : frozen ? '#7ab8e8' : locked ? '#ff9a5a' : shut ? '#ff7a8a' : n ? '#7ad89a' : '#a898c8';
      if (locked && !v.ex) { c.fillRect(30, 130, 24, 16); c.beginPath(); c.arc(42, 130, 8, Math.PI, 0); c.lineWidth = 4; c.strokeStyle = c.fillStyle; c.stroke(); c.fillText('LOCKED', 64, 140); }          // a padlock and the word
      else c.fillText(v.ex ? v.line : frozen ? '❄ FROZEN' : shut ? '✕ CLOSED' : (n ? '● ' : '○ ') + (n ? n + ' inside' : 'empty'), 30, 140);
      c.textAlign = 'right'; c.fillStyle = '#c8b8e8'; c.font = '600 30px "Fredoka", sans-serif'; c.fillText((v.sub || (v.free ? 'Free room' : v.cat)) + (v.vip ? ' · VIP' : v.levels > 1 ? ' · 2 levels' : ''), 482, 140);
      p.n = n; if (p.tex) p.tex.needsUpdate = true;
    };
    p.draw(); p.tex = new THREE.CanvasTexture(cv); p.tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), new THREE.MeshBasicMaterial({ map: p.tex, transparent: true, side: THREE.DoubleSide })); onWall(g, o, wall, u, 3.0, m, 0.12);
    plates.push(p); return p;
  }
  if (document.fonts) document.fonts.load('700 40px "Fredoka"').then(() => { plates.forEach(p => p.draw()); notes.forEach(f => f()); }).catch(() => { });

  // ------------------------------------------------------------------ facades: a venue's own strip of hall wall (a document the owner placed, docs/game/world.md)
  // doc coordinates are those of a room 7 or 14 m wide and FAC_D deep whose back wall is the hall wall: x runs along the wall, z out of it (-FAC_D/2 = against the wall).
  function buildFacade(g, o, it) {
    const doc = it.doc || {}, th = SPACE.THEMES[doc.theme] || SPACE.THEMES.studio, fpal = th.pal, d = doorOf(it), W = d.w, hexN = s => parseInt(String(s).slice(1), 16);
    const toWorld = (xl, zl, ry) => (d.wall === 'z' ? { x: d.u + xl, z: o.z0 + zl + FAC_D / 2, ry } : { x: o.x0 + zl + FAC_D / 2, z: d.u - xl, ry: ry + 90 });
    if (doc.wall && (doc.wall.c || doc.wall.pat)) {                                       // a wall colour or pattern: a panel over the hall wall
      const c = doc.wall.c ? hexN(doc.wall.c) : fpal.wall, pat = SPACE.WALL[doc.wall.pat] ? doc.wall.pat : th.wallTex || 'plaster';
      onWall(g, o, d.wall, d.u, (H - 0.1) / 2 + 0.05, BOX(W - 0.08, H - 0.1, 0.05, wallMat(c, pat, W / 3, 1)), 0.045);
    }
    if (doc.floor && (doc.floor.c || doc.floor.pat)) {                                    // a floor colour or pattern: a mat in front of the door
      const c = doc.floor.c ? hexN(doc.floor.c) : fpal.floor, pat = SPACE.FLOOR[doc.floor.pat] ? doc.floor.pat : th.floorTex || 'wood', along = W - 0.08;
      const m = new THREE.Mesh(new THREE.BoxGeometry(d.wall === 'z' ? along : FAC_D, 0.02, d.wall === 'z' ? FAC_D : along), floorMat(c, pat, W / 2.4, FAC_D / 2.4)); m.receiveShadow = true;
      m.position.set(d.wall === 'z' ? d.u : o.x0 + FAC_D / 2, 0.012, d.wall === 'z' ? o.z0 + FAC_D / 2 : d.u); g.add(m);
    }
    for (const p of doc.pieces || []) {
      const def = SPACE.PIECES[p.p]; if (!def) continue;
      const pc = Object.assign({}, fpal), tint = p.c ? hexN(p.c) : null; if (tint !== null) { pc.accent = tint; pc.fabric1 = tint; }
      const n0 = noNormalPass.length, grp = SPACE.buildParts(def.parts, pc, lights, { anims, lightCount: () => lights.length, tint, txt: p.txt && String(p.txt) });
      halos.push(...noNormalPass.slice(n0)); const w = toWorld(+p.x || 0, +p.z || 0, +p.ry || 0); grp.position.set(w.x, 0, w.z); grp.rotation.y = rad(w.ry); g.add(grp);
      const wallP = def.cat === 'wall' || def.fp[1] <= 0.12, flat = def.cat === 'floor' || def.cat === 'ceiling';
      if (!wallP && !flat) { const q = Math.round(w.ry / 90) % 2 !== 0; block(w.x, w.z, (q ? def.fp[1] : def.fp[0]) / 2, (q ? def.fp[0] : def.fp[1]) / 2); }
    }
  }
  // the guard stands beside a door whose owner set an entry rule; the server enforces it, the guard says why you were turned away
  const GUARD_LINES = { holders: 'Chog holders only. Play as your own Chog to come in.', list: 'Guest list only. Is your name on it?' };
  function buildGuard(g, o, v) {
    const d = doorOf(v), side = 1.2, c = chog({ hair: 0x3a3550, outfit: 'jacket', trim: 0xff3aa8, head: 'cap', capC: 0x1a1030, scale: CHOG_SCALE * 1.02 });
    if ((v.units || 1) >= 8) { c.position.set(-FLH + ELEV + 0.2, 0, -FLH + 1.5); c.rotation.y = 0.5; block(c.position.x, c.position.z, 0.3, 0.3); }              // a whole-floor venue is the floor: its guard stands at the elevator
    else if (d.wall === 'z') { c.position.set(d.stand.x + side, 0, d.stand.z); c.rotation.y = 0; } else { c.position.set(d.stand.x, 0, d.stand.z + side); c.rotation.y = Math.PI / 2; }
    c.userData.netName = v.rule === 'holders' ? 'Holders only' : 'Guest list'; if ((v.units || 1) >= 8) c.userData.netName += ' · Floor ' + v.floor; c.userData.onClick = () => toast(GUARD_LINES[v.rule] || 'Welcome.'); c.userData.t0 = Math.random() * 6;
    g.add(c); guards.push({ c, v, plate: PLATES.add(c, 'Guard') });
  }
  // the owner's padlock beside the door: click it (or press E next to it) to lock or unlock the room from the hall
  function lockPad(g, o, wall, u, v) {
    const lk = v.locked, col = lk ? 0xff9a5a : 0x7ad89a, grp = new THREE.Group();
    grp.add(BOX(0.44, 0.34, 0.12, tmat(col, { em: 0.35 }), 0, 0, 0)); const sh = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16, Math.PI), tmat(0xd8d4e0, { em: 0.2 })); sh.position.set(lk ? 0 : 0.1, 0.17, 0); if (!lk) sh.rotation.z = -0.5; grp.add(sh);
    grp.userData.netName = lk ? 'Unlock the door' : 'Lock the door'; grp.userData.onClick = () => HOTEL.toggleLock(v);
    onWall(g, o, wall, u, 1.35, grp, 0.12); halo(g, col, 0.9, 0.35, wall === 'z' ? u : o.x0 + 0.3, 1.35, wall === 'z' ? o.z0 + 0.3 : u); locks.push(grp); return grp;
  }
  HOTEL.toggleLock = async function (v) { if (typeof VENUE === 'undefined' || !VENUE.setLock) return; const want = !(v && v.locked); const r = await VENUE.setLock(want); if (r && r.ok) toast(r.locked ? 'Your door is locked. Only you can come in; people inside can stay.' : 'Your door is open again.'); };
  HOTEL.guardSays = reason => {                                                          // a refusal at a door: show it as the guard's own line
    const gd = guards.find(x => x.v.id === HOTEL.lastDoor); if (!gd || !HOTEL.active) return false; PLATES.say(gd.plate, reason); return true;
  };
  HOTEL.onFacades = m => {                                                              // the server sent the facades of a floor (stepping onto it, or an owner saved one); a basement floor also sends its rooms
    const same = JSON.stringify([HOTEL.facadeBy[m.floor] || null, HOTEL.basementBy[m.floor] || null]) === JSON.stringify([m.items || [], m.rooms || HOTEL.basementBy[m.floor] || null]); HOTEL.facadeBy[m.floor] = m.items || []; if (m.rooms) HOTEL.basementBy[m.floor] = m.rooms;
    if (!same && HOTEL.active && HOTEL.floor === m.floor && !HOTEL.busy && G) HOTEL.rebuildHere();
  };

  // ------------------------------------------------------------------ the two scenes
  // ---- lobby: ordinary signs, and three small hidden things (the rug tag, the print in the corner; the elevator one is in the panel). Restraint: most of it is plain hotel.
  const RUG = { x: 0.3, z: 1.7, hw: 1.5, hd: 1.0, pulledAt: -1e9, until: 0, grp: null, victims: [], baseX: 0.3 };
  const RECEP = ['Welcome to the Chog Hotel.', 'Rooms are on the floors. The elevator is on your left.', 'The directory lists every open room.', 'Check-out is at 11:00.', 'Breakfast is a coffee. Mika will help you.', 'Need a room? Ask me. Need a view? Take the elevator.'];
  let recepJoke = null, recepAt = 0;
  const recepLine = () => {                                                         // normal hotel lines, and one in-joke from the culture file now and then
    if (!recepJoke) { const c = typeof CULTURE !== 'undefined' && CULTURE.residents && CULTURE.residents.receptionist; recepJoke = c && c.length ? c[Math.floor(Math.random() * c.length)] : ''; }
    recepAt++; return recepJoke && recepAt % 5 === 0 ? recepJoke : RECEP[recepAt % RECEP.length];
  };
  function paperOnWall(g, o, wall, u, y, w, h, paint, frameCol) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = Math.round(256 * h / w); const c = cv.getContext('2d');
    const draw = () => { c.clearRect(0, 0, cv.width, cv.height); paint(c, cv.width, cv.height); };
    draw(); const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4; notes.push(() => { draw(); tex.needsUpdate = true; });
    onWall(g, o, wall, u, y, BOX(w + 0.08, h + 0.08, 0.05, tmat(frameCol || 0x3f3850)), 0.04);
    onWall(g, o, wall, u, y, new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex })), 0.075);
  }
  const onRug = p => Math.abs(p.x - RUG.x) < RUG.hw && Math.abs(p.z - RUG.z) < RUG.hd;
  function pullRug() {
    const now = performance.now(); if (now < RUG.until) return;
    RUG.pulledAt = now; RUG.until = now + 60000; sfxPlay('rug'); RUG.victims = [];
    for (const c of [GAME.me, ...[...NET.remotes.values()].map(r => r.root)]) if (c && c.position && onRug(c.position)) RUG.victims.push(c);
    const pr = typeof CULTURE !== 'undefined' && CULTURE.props.find(x => x.id === 'rug'); if (pr && pr.lines) toast(pr.lines[Math.floor(Math.random() * pr.lines.length)]);
  }
  function rugReset() { for (const c of RUG.victims) { c.rotation.x = 0; c.rotation.z = 0; } RUG.victims = []; }
  function rugAnim() {
    const now = performance.now(), dt = (now - RUG.pulledAt) / 1000, left = (RUG.until - now) / 1000;
    if (RUG.grp) {                                                                    // the rug bunches up towards the wall and comes back after a minute
      const e = dt < 0.35 ? dt / 0.35 : left > 1 ? 1 : Math.max(0, left); RUG.grp.position.x = RUG.baseX - 0.8 * e; RUG.grp.scale.x = 1 - 0.45 * e;
    }
    if (RUG.victims.length) {
      let rz = 0; if (dt < 0.5) rz = Math.sin(dt * 24) * 0.32; else if (dt < 0.85) rz = 1.45 * ((dt - 0.5) / 0.35); else if (dt < 2.2) rz = 1.45 + Math.sin(dt * 6) * 0.04; else if (dt < 2.8) rz = 1.45 * (1 - (dt - 2.2) / 0.6);
      if (dt >= 2.8) rugReset(); else for (const c of RUG.victims) { c.rotation.z = rz; c.rotation.x = dt < 0.5 ? Math.sin(dt * 19) * 0.18 : 0; }
    }
  }
  function lobbyExtras(g, o) {
    const serif = '"Bree Serif", Georgia, serif';
    paperOnWall(g, o, 'z', 4.2, 1.7, 0.8, 0.54, (c, W, H) => {                      // the founding plaque: brass, plain text
      c.fillStyle = '#c8a24c'; c.fillRect(0, 0, W, H); c.strokeStyle = '#8a6a22'; c.lineWidth = 5; c.strokeRect(9, 9, W - 18, H - 18); c.fillStyle = '#4a3410'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `700 30px ${serif}`; c.fillText('CHOG HOTEL', W / 2, H * 0.3); c.font = `20px ${serif}`; c.fillText('Founded 2026', W / 2, H * 0.52); c.fillText('All guests welcome', W / 2, H * 0.72);
    }, 0x5a3a1e);
    paperOnWall(g, o, 'z', -3.6, 1.7, 0.8, 0.3, (c, W, H) => {                        // the check-out sign
      c.fillStyle = '#f4ead6'; c.fillRect(0, 0, W, H); c.fillStyle = '#2b1d44'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 30px ${serif}`; c.fillText('CHECK-OUT 11:00', W / 2, H * 0.5);
    });
    paperOnWall(g, o, 'x', -4.6, 1.35, 0.4, 0.52, (c, W, H) => {                      // a small framed print in the quiet corner: a plain page and a date, no label
      c.fillStyle = '#fbfaf5'; c.fillRect(0, 0, W, H); c.fillStyle = '#222'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.font = 'bold 36px Arial, Helvetica, sans-serif'; c.fillText('I AM HODLING', 14, 52); c.fillStyle = '#777'; c.font = '17px Arial, sans-serif'; c.fillText('Dec 18, 2013', 14, 82);
      c.fillStyle = '#bbb'; for (let i = 0; i < 8; i++) c.fillRect(14, 112 + i * 20, i % 3 === 2 ? 120 : 214, 6);
    }, 0x2b2140);
    // the rug tag
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const c2 = cv.getContext('2d');
    const draw = () => { c2.fillStyle = '#f4ead6'; c2.fillRect(0, 0, 128, 64); c2.strokeStyle = '#a89878'; c2.lineWidth = 3; c2.strokeRect(2, 2, 124, 60); c2.fillStyle = '#4a3a2a'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.font = '600 17px "Fredoka", Arial, sans-serif'; c2.fillText('do not pull', 64, 33); };
    draw(); const tex = new THREE.CanvasTexture(cv); notes.push(() => { draw(); tex.needsUpdate = true; });
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })); tag.rotation.set(-Math.PI / 2, 0, Math.PI / 4); tag.position.set(1.4, 0.06, 2.42);
    tag.userData.onClick = pullRug; tag.userData.netName = 'tag'; g.add(tag); RUG.tag = tag; anims.push(rugAnim);
  }
  function buildLobby() {
    const g = new THREE.Group(), o = { z0: -LOB.d / 2, x0: -LOB.w / 2, lenX: LOB.w, lenZ: LOB.d, cx: 0, cz: 0, wallC: 0xf0e2d0, wallPat: 'wainscot', floorC: 0xe6d6c0, floorPat: 'tiles', floors: [[0, 0, LOB.w, LOB.d]] };
    shell(g, o); walk = [[-LOB.w / 2 + 0.3, LOB.w / 2 - 0.3, -LOB.d / 2 + 0.3, LOB.d / 2 - 0.3]]; mapRects = [[-LOB.w / 2, LOB.w / 2, -LOB.d / 2, LOB.d / 2]];
    // the street door (like a room's exit), the elevator, the big sign
    const trim = tmat(pal().trim); onWall(g, o, 'z', 5.9, 1.0, BOX(1.1, 2.0, 0.12, tmat(0x2f6a5c)), 0.06); onWall(g, o, 'z', 5.9, 1.0, BOX(1.3, 2.15, 0.08, trim), 0.03); onWall(g, o, 'z', 6.24, 1.0, SPH(0.06, tmat(0xf0d070)), 0.16);
    onWall(g, o, 'z', 5.9, 2.5, sign('STREET', 1.1, 0.27, '#ffffff'), 0.1);
    elevator(g, o, 'x', 0.9);
    onWall(g, o, 'z', 0.3, 3.6, sign('CHOG HOTEL', 5.4, 0.93, '#fff6e0', '#2b1d44', '#ff9ad8'), 0.06); halo(g, 0xff9ad8, 6.5, 0.3, 0.3, 3.5, -5.4);
    // furniture: the reception on the north wall, a sitting corner west, another east, the rug (with its hidden tag) in the middle, plants and lamps at the edges
    piece(g, 'receptionDesk', 0.3, -4.95); RUG.grp = piece(g, 'rug', 0.3, 1.7); RUG.baseX = 0.3;
    piece(g, 'sofa', -4.0, 4.9, 180); piece(g, 'coffeeTable', -4.0, 3.5); piece(g, 'armchair', -6.2, 3.6, 90); piece(g, 'armchair', -1.8, 3.6, 270);
    piece(g, 'sofa', 4.6, 4.9, 180); piece(g, 'coffeeTable', 4.6, 3.5); piece(g, 'armchair', 2.6, 3.6, 90); piece(g, 'sideTable', 7.2, 3.6);
    piece(g, 'plant', 7.4, 5.0); piece(g, 'tallPlant', -7.4, -5.0); piece(g, 'tallPlant', 7.6, -1.8); piece(g, 'tallPlant', -7.4, 5.2); piece(g, 'floorLamp', 7.0, 1.6); piece(g, 'floorLamp', -7.0, 1.4);
    piece(g, 'wallArt', -5.2, -6.0); piece(g, 'wallArt', -8.25, 4.2, 90); piece(g, 'wallArt', -8.25, -2.8, 90); lobbyExtras(g, o);
    piece(g, 'floorLamp', 5.0, -4.7); piece(g, 'floorLamp', -3.6, -4.7); piece(g, 'floorLamp', 0.3, 5.6);
    block(0.3, -4.95, 1.7, 0.45);
    // the receptionist
    piece(g, 'stool', 0.3, -5.62);                                                    // a tall stool behind the counter, so the receptionist shows above it
    npc = chog({ hair: 0x5b35b0, outfit: 'vest', vest: 0x7a3ac8, head: 'headset', scale: CHOG_SCALE * 1.0 }); npc.position.set(0.3, 0.76, -5.62); npc.rotation.y = 0; g.add(npc); npc.userData.netName = 'Reception'; npc.userData.onClick = () => { toast(recepLine()); HOTEL.openPanel('dir'); };
    npcPlate = PLATES.add(npc, 'Staff');
    spots = [
      { x: 0.3, z: -3.9, r: 1.6, y: 2.2, label: 'Ask reception', run: () => HOTEL.openPanel('dir') },
      { x: -6.6, z: 0.9, r: 1.4, y: 2.6, label: 'Take the elevator', run: () => HOTEL.openPanel('lift'), at: [-7.8, 2.7, 0.9] },
      { x: 5.9, z: -5.1, r: 1.3, y: 2.6, label: 'Go out to the street', run: () => HOTEL.leave(), at: [5.9, 2.6, -5.9] },
    ];
    G = g; return { spawn: { x: 5.5, z: -3.6, ry: 0 } };
  }
  function buildFloor(f) {
    const cold = typeof f === 'number' && f < 0;                                       // the basement: the same hall, plainer and colder
    const g = new THREE.Group(), o = { z0: -FLH, x0: -FLH, lenX: 2 * FLH, lenZ: 2 * FLH, cx: 0, cz: 0, wallC: cold ? 0xc9c2d6 : 0xf0e2d0, wallPat: cold ? 'plaster' : 'wainscot', floorC: cold ? 0x3e3a4e : 0x4e2a5c, floorPat: cold ? 'tiles' : 'carpet', floors: [[0, 0, 2 * FLH, 2 * FLH]] };
    shell(g, o);
    const m = 0.3; walk = [[-FLH + m, FLH - m, -FLH + m, FLH - m]]; mapRects = [[-FLH, FLH, -FLH, FLH]]; mapDoors = [];
    const trim = tmat(pal().trim);
    elevator(g, o, 'z', -FLH + ELEV / 2); onWall(g, o, 'z', -FLH + ELEV / 2, 3.9, f === 'E' ? sign('EXHIBITION', 2.8, 0.34, '#ffe9a8', null, '#ffb03a') : cold ? sign('BASEMENT B' + (-f), 2.6, 0.34, '#cfe6ff', null, '#7ab8e8') : sign('FLOOR ' + f, 1.7, 0.34, '#ffe9a8', null, '#ffb03a'), 0.12);
    if (f === 'E') notePlate(g, o, 'x', -FLH + ELEV / 2, 2.4, ['THIS WEEK', (typeof EXH !== 'undefined' && EXH.theme()) || '…'], 0xffc23a);         // the weekly theme, on the wall beside the elevator
    else if (cold) notePlate(g, o, 'x', -FLH + ELEV / 2, 2.4, ['COLD STORAGE', 'rooms nobody visits'], 0x7ab8e8);
    else { onWall(g, o, 'x', -FLH + ELEV / 2, 2.4, BOX(1.8, 3.0, 0.1, trim), 0.05); onWall(g, o, 'x', -FLH + ELEV / 2, 2.4, new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.8), new THREE.MeshBasicMaterial({ color: SPACE.VIEWS[SPACE.viewKey(null)].window })), 0.11); }
    spots = [{ x: -FLH + ELEV / 2, z: -FLH + 1.7, r: 1.5, y: 2.6, label: 'Take the elevator', run: () => HOTEL.openPanel('lift'), at: [-FLH + ELEV / 2, 3.4, -FLH + 0.5] }];
    // the hall: a big rug and a sitting corner in the open middle, benches in front of the doors, plants along the open walls, floor lamps around it
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(11, 7), new THREE.MeshBasicMaterial({ color: 0x8a4a78 })); rug.rotation.x = -Math.PI / 2; rug.position.set(2.0, 0.012, 3.4); g.add(rug);
    const rug2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), new THREE.MeshBasicMaterial({ color: 0x6a4a98 })); rug2.rotation.x = -Math.PI / 2; rug2.position.set(2.0, 0.014, 3.4); g.add(rug2);
    piece(g, 'coffeeTable', 2.0, 3.0); piece(g, 'sofa', 2.0, 5.2, 180); piece(g, 'sofa', 2.0, 0.9, 0); piece(g, 'armchair', -1.6, 3.0, 90); piece(g, 'armchair', 5.6, 3.0, 270); piece(g, 'lampTable', -1.6, 4.9); piece(g, 'lampTable', 5.6, 4.9);
    piece(g, 'bench', -4.0, -6.2, 180); piece(g, 'bench', 6.0, -6.2, 180); piece(g, 'bench', -6.2, -3.4, 270); piece(g, 'bench', -6.2, 6.4, 270); piece(g, 'bench', 9.0, 9.2, 180); piece(g, 'bench', -3.0, 9.2, 180);
    piece(g, 'tallPlant', FLH - 0.6, FLH - 0.6); piece(g, 'tallPlant', -7.5, FLH - 0.6); piece(g, 'tallPlant', FLH - 0.6, -7.0); piece(g, 'tallPlant', -FLH + 1.0, FLH - 0.6);
    for (const z of [-2.0, 1.5, 5.0, 8.0]) piece(g, 'plant', FLH - 0.55, z, 0, 0, { free: true });
    for (const [x, z] of [[-1.0, -4.6], [4.0, -4.6], [9.0, -4.6], [-5.0, 1.5], [9.0, 1.2], [-2.5, 9.5], [5.5, 9.5], [9.5, 7.5]]) piece(g, 'floorLamp', x, z);
    // the rooms: per venue its door run, the other wall of a whole-floor venue, and (one floor up) the upper level of the venues below
    const taken = new Set(), list = venuesOn(f), below = typeof f === 'number' && f > 1 ? venuesOn(f - 1).filter(v => (v.levels || 1) > 1) : [];
    for (const v of list) {
      const runs = runsOf(v), d = doorOf(v), own = HOTEL.mineId === v.id, shut = isShut(v), col = v.state === 'frozen' ? 0x6a8ab0 : shut ? 0x5a4a78 : colOf(v.cat);
      const fac = (HOTEL.facadeBy[f] || []).find(x => x.id === v.id);
      for (let s = unitOf(v); s < unitOf(v) + (v.units || 1); s++) taken.add(s);
      if (!fac) shopfront(g, o, d.wall, d.u, d.w, col, shut);
      door(g, o, d.wall, d.u, col); plateFor(g, o, d.wall, d.u, v);
      for (const r of runs.slice(1)) reserved(g, o, r.wall, r.u0, r.u1, v, 'PENTHOUSE');
      const why = v.locked ? 'locked' : v.state === 'frozen' ? 'frozen' : 'closed';
      spots.push({ x: d.stand.x, z: d.stand.z, r: 1.3, label: v.ex ? 'View ' + v.name : shut ? (own ? 'Enter your room (' + why + ')' : why[0].toUpperCase() + why.slice(1)) : 'Enter ' + v.name, run: () => (shut && !own ? toast(v.locked ? v.name + ' is locked by its owner.' : v.state === 'frozen' ? v.name + ' is frozen: its owner no longer holds enough Chogs.' : v.name === 'Opening soon' ? 'This room is not open yet.' : v.name + ' is closed right now.') : HOTEL.enterVenue(v)), at: d.wall === 'z' ? [d.u, 3.4, -FLH + 0.4] : [-FLH + 0.4, 3.4, d.u], v });
      if (own && !v.ex) {                                                                  // the owner's padlock, one step beside the door
        const lu = d.u - 1.15; lockPad(g, o, d.wall, lu, v);
        spots.push({ x: d.wall === 'z' ? lu : d.stand.x, z: d.wall === 'z' ? d.stand.z : lu, r: 0.8, label: v.locked ? 'Unlock your door' : 'Lock your door', run: () => HOTEL.toggleLock(v), at: d.wall === 'z' ? [lu, 2.0, -FLH + 0.4] : [-FLH + 0.4, 2.0, lu], v });
      }
      mapDoors.push({ x: d.wall === 'z' ? d.u : -FLH, z: d.wall === 'z' ? -FLH : d.u, col: v.state === 'frozen' ? '#7ab8e8' : shut ? '#7a6a98' : hexOf(colOf(v.cat)) });
    }
    for (const v of below) for (const r of runsOf(v)) { reserved(g, o, r.wall, r.u0, r.u1, v, 'UPPER LEVEL'); for (let s = r.a; s <= r.b; s++) taken.add(s); }
    const step = f === 'E' ? 2 : 1;
    for (let s = 1; s <= 8; s += step) if (!taken.has(s)) {                                    // nobody holds this unit: a small plate with the door number
      const w = wallOfUnit(s), u = unitU(s) + UNIT * step / 2;
      notePlate(g, o, w, u, 3.0, f === 'E' ? ['EMPTY', 'enter your room'] : [cold ? 'B' + (-f) + String(s).padStart(2, '0') : 'ROOM #' + (f * 100 + s), 'vacant'], 0x6a5a88);
    }
    for (const it of HOTEL.facadeBy[f] || []) buildFacade(g, o, it);
    for (const v of list) if (v.state === 'open' && v.rule && v.rule !== 'public' && !v.ex) buildGuard(g, o, v);                // a whole-floor venue's guard is at the elevator (buildGuard)
    G = g; return { spawn: { x: -FLH + ELEV / 2, z: -FLH + 2.6, ry: 0 } };
  }

  function clearScene() {
    if (G) { world.remove(G); G.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); }
    for (const h of halos) { const i = noNormalPass.indexOf(h); if (i >= 0) noNormalPass.splice(i, 1); }
    if (npcPlate) { PLATES.remove(npcPlate); npcPlate = null; }
    for (const gd of guards) PLATES.remove(gd.plate); guards = []; locks.length = 0;
    rugReset(); RUG.grp = null; RUG.tag = null; G = null; walk = []; rects = []; spots = []; plates.length = 0; anims.length = 0; lights.length = 0; halos.length = 0; npc = null; mapRects = []; mapDoors = [];
    SPACE.clearSky(); SPACE.refreshHidden();
  }

  // ------------------------------------------------------------------ going places (fade out, switch, fade in)
  HOTEL.fade = fn => fade(fn);
  async function fade(fn) { const f = HOTEL.fadeEl; f.classList.add('on'); await wait(360); try { return await fn(); } finally { await wait(80); f.classList.remove('on'); } }
  async function loadInfo() { if (HOTEL.info && Date.now() - (HOTEL.infoAt || 0) < 20000) return true; NET.send({ t: 'hotelinfo' }); const r = await NET.waitFor(['hotel'], 6000); if (r) HOTEL.onInfo(r); return !!HOTEL.info; }
  HOTEL.onInfo = m => {
    const key = () => (HOTEL.active && typeof HOTEL.floor === 'number' && HOTEL.floor > 0 ? JSON.stringify([venuesOn(HOTEL.floor), venuesOn(HOTEL.floor - 1)]) : ''), before = key();
    HOTEL.info = { floors: m.floors, basement: m.basement || 0, venues: m.venues || [] }; try { localStorage.setItem('chog_hotel_floors', String(m.floors || 0)); } catch (e) { /* the town tower keeps its old height */ } HOTEL.infoAt = Date.now(); HOTEL.counts = m.counts || {}; if (before && key() !== before && !HOTEL.busy && G) HOTEL.rebuildHere(); else if (HOTEL.panel) HOTEL.refreshUI(); };
  HOTEL.setCounts = c => { HOTEL.counts = c || {}; for (const p of plates) if (p.n !== (HOTEL.counts[p.v.id] || 0)) p.draw(); if (HOTEL.panel === 'dir' || HOTEL.panel === 'lift') HOTEL.refreshList(); };

  // what the camera may use (game.js): floor size, wall height, walking bounds, the zoom that shows the whole place and a closer one to follow the player with
  const HALL_ZOOM = 24;
  function sceneInfo() {
    const b = walk[0] || [0, 0, 0, 0], m = mapRects[0] || [0, 0, 0, 0];
    if (GAME.room) Object.assign(GAME.room, { size: [m[1] - m[0], m[3] - m[2]], h: H, center: [0, 1.0, 0], bounds: { x0: b[0], x1: b[1], z0: b[2], z1: b[3] }, zoom: HALL_ZOOM, follow: 18 });
  }
  // show a floor (0 = lobby). The server move comes first: if it says no, nothing on screen changes.
  async function show(floor, spawn) {
    const me = GAME.me, a = spawn || (floor === 0 ? { x: 5.5, z: -3.6, ry: 0 } : { x: -FLH + ELEV / 2, z: -FLH + 2.6, ry: 0 });
    const r = await NET.enter({ space: 'hotel', floor, x: a.x, z: a.z, ry: a.ry || 0 }); if (!r || r.t !== 'entered') return false;
    if (r.counts) HOTEL.counts = r.counts;
    if (floor === 'E' && typeof EXH !== 'undefined') await EXH.load();
    if (typeof floor === 'number' && floor !== 0) { NET.send({ t: 'hotelfloor', floor }); for (let i = 0; i < 3; i++) { const fr = await NET.waitFor(['facades'], 3000); if (!fr || fr.floor === floor) break; } }
    if (!saved) { const sc = sun.shadow.camera; saved = { zoom: GAME.zoomT, shadow: { l: sc.left, r: sc.right, t: sc.top, b: sc.bottom, f: sc.far } }; ROOM.showTown(false); DAY.pause(); }
    clearScene(); const out = floor === 0 ? buildLobby() : buildFloor(floor); world.add(G);
    SPACE.applyView(SPACE.VIEWS[SPACE.viewKey(null)]); SPACE.refreshHidden();
    GAME.room = { blocked: (x, z, rr) => blocked(x, z, rr) }; GAME.path = []; GAME.keys = {}; GAME.regrid();
    me.position.set(a.x, 0, a.z); me.rotation.y = a.ry || 0; camTarget.set(a.x, 1.1, a.z);
    GAME.camFixed = floor === 0 ? new THREE.Vector3(0, 1.0, 0) : null; GAME.sceneZoom(HALL_ZOOM); sceneInfo();      // both places are 1.5 times bigger than before: the whole place fits at HALL_ZOOM, GAME.room tells the camera what to follow with
    HOTEL.active = true; HOTEL.floor = floor; HOTEL.panel = null; document.body.classList.add('inhotel'); HOTEL.refreshUI(); if (typeof render === 'function') render();
    return true;
  }
  // rebuild the floor you stand on without moving anywhere (a facade changed)
  HOTEL.rebuildHere = function () {
    if (!HOTEL.active || HOTEL.floor === 0) return; const me = GAME.me, p = { x: me.position.x, z: me.position.z, ry: me.rotation.y };
    clearScene(); buildFloor(HOTEL.floor); world.add(G); SPACE.applyView(SPACE.VIEWS[SPACE.viewKey(null)]); SPACE.refreshHidden();
    GAME.room = { blocked: (x, z, rr) => blocked(x, z, rr) }; GAME.regrid(); me.position.set(p.x, 0, p.z); me.rotation.y = p.ry; sceneInfo(); HOTEL.refreshUI();
  };
  // town -> lobby
  HOTEL.enterFromTown = async function () {
    if (HOTEL.busy || ROOM.busy || ROOM.active || HOTEL.active) return;
    if (NET.status !== 'online' || !NET.hotel) { toast('The Hotel needs the town server, which is not reachable right now.'); return; }
    if (typeof VENUE !== 'undefined' && !VENUE.info) VENUE.refresh();                         // so the owner's own door says "your venue"
    HOTEL.busy = true; try { await fade(async () => { if (!await loadInfo()) { toast('The Hotel did not answer. Try again.'); return; } await show(0); }); } finally { HOTEL.busy = false; }
  };
  // town -> the floor of one venue, in front of its door (the owner's "Go to my venue")
  HOTEL.gotoVenue = async function (v) {
    if (HOTEL.busy || ROOM.busy || ROOM.active || HOTEL.active) return;
    if (NET.status !== 'online' || !NET.hotel) { toast('The Hotel needs the town server, which is not reachable right now.'); return; }
    HOTEL.busy = true; try { await fade(async () => { if (!await loadInfo()) { toast('The Hotel did not answer. Try again.'); return; } await show(v.floor, doorOf(v).stand); }); } finally { HOTEL.busy = false; }
  };
  // anywhere in the hotel -> the street
  HOTEL.leave = async function () {
    if (HOTEL.busy || !HOTEL.active) return; HOTEL.busy = true;
    try { await fade(async () => { HOTEL.hideScene(); ROOM.showTown(true); DAY.resume(); saved = null; HOTEL.away = false; const d = CITY.doors.hotel, me = GAME.me; me.position.set(d.x, 0, d.out); me.rotation.y = 0; GAME.path = []; camTarget.set(d.x, 1.1, d.out); NET.enter({ space: 'city', x: d.x, z: d.out, ry: 0 }); }); } finally { HOTEL.busy = false; }
  };
  // drop the hotel scene (to show a venue, a Home or the street); the town stays hidden unless the caller shows it. The town's own camera values come back first.
  HOTEL.hideScene = function (keep) {
    clearScene(); HOTEL.active = false; HOTEL.panel = null; document.body.classList.remove('inhotel');
    const sc = sun.shadow.camera; if (saved) { Object.assign(sc, { left: saved.shadow.l, right: saved.shadow.r, top: saved.shadow.t, bottom: saved.shadow.b, far: saved.shadow.f }); sc.updateProjectionMatrix(); GAME.sceneZoom(GAME.townBase); if (!keep) saved = null; }
    GAME.room = null; GAME.camFixed = null; GAME.regrid(); HOTEL.refreshUI();
  };
  // by elevator you arrive at the elevator (in the lobby it is on the west wall, not by the street door)
  HOTEL.goFloor = async function (f, door) {                                           // the elevator, or "Go to room": the venue puts you right in front of its door
    if (HOTEL.busy || !HOTEL.active || f === HOTEL.floor && !door) return; HOTEL.busy = true; HOTEL.panel = null; HOTEL.refreshUI();
    try { await fade(async () => { await loadInfo(); const d = door ? doorOf(door) : null; if (!await show(f, d ? d.stand : f === 0 ? { x: -3.4, z: 0.6, ry: Math.PI / 2 } : null)) toast('The elevator did not move. Try again.'); }); } finally { HOTEL.busy = false; }
  };
  HOTEL.goTo = v => HOTEL.goFloor(v.floor, v);
  HOTEL.enterVenue = async function (v) {
    if (HOTEL.busy || ROOM.busy || !HOTEL.active) return; HOTEL.busy = true;
    HOTEL.lastDoor = v.id; try { await fade(async () => { if (v.ex) await EXH.enter(v); else await ROOM.enterVenue(v); }); } finally { HOTEL.busy = false; }
  };
  HOTEL.returnFromVenue = async function (v) {
    if (HOTEL.busy) return; HOTEL.busy = true;
    try { await fade(async () => { ROOM.exitVenueScene(); await loadInfo(); if (await show(v.floor, doorOf(v).stand)) HOTEL.away = false; else { ROOM.showTown(true); DAY.resume(); saved = null; HOTEL.away = false; } }); } finally { HOTEL.busy = false; }
  };
  HOTEL.resync = function () { if (!HOTEL.active) return; const me = GAME.me; NET.enter({ space: 'hotel', floor: HOTEL.floor, x: me.position.x, z: me.position.z, ry: me.rotation.y }); };

  // ------------------------------------------------------------------ near things: the E prompt
  const prompt = document.createElement('button'); prompt.id = 'hotelp'; prompt.style.display = 'none'; document.body.insertBefore(prompt, document.getElementById('ui'));
  let near = null; prompt.onclick = () => act();
  const act = () => { if (!near || HOTEL.busy || HOTEL.panel) return; near.run(); };
  addEventListener('keydown', e => {
    if (!HOTEL.active) return; const typing = e.target.matches && e.target.matches('input,textarea,select');
    if (e.code === 'Escape' && HOTEL.panel && !typing) { HOTEL.closePanel(); return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyE') act();
  });
  const v3 = new THREE.Vector3();
  animated.push((t) => {
    if (!HOTEL.active || !GAME.me) { if (prompt.style.display !== 'none') prompt.style.display = 'none'; return; }
    for (const f of anims) f(t);
    for (const gd of guards) { const u = gd.c.userData, b = Math.sin(t * 2 + u.t0) * 0.015; if (u.legs) { u.body.position.y = b; u.head.position.y = 1.0 + b * 1.4; u.legs.forEach(l => l.rotation.x = 0); u.arms[0].rotation.x = Math.sin(t * 2 + u.t0) * 0.05; u.arms[1].rotation.x = 0; u.eyes.forEach(e => e.scale.y = (e.userData.by || 0.095) * (Math.sin(t * 0.9 + u.t0 * 5) > 0.985 ? 0.12 : 1)); } }
    if (npc && npc.userData.legs) { const u = npc.userData, b = Math.sin(t * 2) * 0.015; u.body.position.y = b; u.head.position.y = 1.0 + b * 1.4; u.legs.forEach(l => l.rotation.x = 0); u.arms[1].rotation.z = Math.sin(t * 0.5) > 0.93 ? 2.7 + Math.sin(t * 9) * 0.35 : 0.1; u.arms[0].rotation.x = Math.sin(t * 2) * 0.05; const blink = Math.sin(t * 0.9) > 0.985 ? 0.12 : 1; u.eyes.forEach(e => e.scale.y = (e.userData.by || 0.095) * blink); }
    const me = GAME.me.position; near = null; let best = 1e9;
    for (const s of spots) { const d = Math.hypot(me.x - s.x, me.z - s.z); if (d < s.r && d < best) { best = d; near = s; } }
    if (near && !HOTEL.busy && !HOTEL.panel) {
      const at = near.at || [near.x, near.y || 2.3, near.z - 0.2]; v3.set(at[0], at[1], at[2]).project(cam); const sc = Math.max(0.8, Math.min(1.6, innerHeight / 810));
      prompt.style.display = 'flex'; prompt.innerHTML = '<kbd>E</kbd> ' + near.label; prompt.style.transform = `translate(${((v3.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-v3.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%, -100%) scale(${sc})`;
    } else prompt.style.display = 'none';
  });
  HOTEL.title = () => 'Chog Hotel';
  HOTEL.where = () => floorName(HOTEL.floor);
  HOTEL.hint = () => (HOTEL.floor === 0 ? 'Click to walk · E at the reception for the directory, at the elevator for the floors (type a room number there)' : HOTEL.floor === 'E' ? 'Click to walk · E at a door to view a room, vote inside · E at the elevator to change floor' : 'Click to walk · E at a door to go in · E at the elevator to change floor');

  // ------------------------------------------------------------------ the HUD: top bar and the two panels (directory, elevator)
  const btn = (cls, txt, fn, title) => { const b = el('button', 'btn hit ' + cls, ''); b.textContent = txt; b.onclick = fn; if (title) b.title = title; return b; };
  HOTEL.openPanel = p => { if (!HOTEL.active || HOTEL.busy) return; if (p === 'lift') { liftLit = new Set(); liftSer = false; clearTimeout(liftTimer); } HOTEL.panel = p; if (p === 'dir') HOTEL.q = ''; HOTEL.refreshUI(); if (!HOTEL.info) loadInfo().then(() => HOTEL.refreshUI()); };
  HOTEL.closePanel = () => { HOTEL.panel = null; HOTEL.refreshUI(); };
  HOTEL.hud = function () { if (!HOTEL.ui) { HOTEL.ui = el('div', 'hotelhud'); HOTEL.refreshUI(); } return HOTEL.ui; };
  HOTEL.refreshUI = function () {
    const u = HOTEL.ui; if (!u) return; u.innerHTML = ''; if (!HOTEL.active) return;
    const bar = el('div', 'roombar hit'), nm = el('div', 'rn'); const t = el('b'); t.textContent = HOTEL.title(); nm.appendChild(t); const s = el('small'); s.textContent = HOTEL.where(); nm.appendChild(s); bar.appendChild(nm);
    bar.appendChild(btn(HOTEL.panel === 'dir' ? '' : 'ghost', 'Directory', () => (HOTEL.panel === 'dir' ? HOTEL.closePanel() : HOTEL.openPanel('dir')), 'Find a room: search, categories, go to its door'));
    bar.appendChild(btn(HOTEL.panel === 'lift' ? '' : 'ghost', 'Elevator', () => (HOTEL.panel === 'lift' ? HOTEL.closePanel() : HOTEL.openPanel('lift'))));
    if (HOTEL.floor === 'E' && typeof EXH !== 'undefined') { s.textContent = EXH.summary(); EXH.bar(bar, btn, 'hall'); }
    bar.appendChild(btn('ghost', 'Street', () => HOTEL.leave(), 'Leave the hotel')); u.appendChild(bar);
    if (HOTEL.panel) u.appendChild(HOTEL.panel === 'dir' ? dirPanel() : liftPanel());
  };
  function venueRow(v) {
    const row = el('div', 'hv'), no = el('div', 'no'), tx = el('div', 'tx'), n = HOTEL.counts[v.id] || 0, here = HOTEL.active && v.floor === HOTEL.floor;
    no.innerHTML = '#' + v.no + '<small>Floor ' + v.floor + '</small>'; row.appendChild(no);
    tx.innerHTML = '<b></b><span></span><i></i>'; tx.querySelector('b').textContent = v.name; tx.querySelector('span').textContent = v.desc;
    const tag = tx.querySelector('i'); tag.textContent = (v.free ? 'Free room' : v.cat) + (v.locked ? ' · Locked' : '') + (v.rule === 'holders' ? ' · Holders only' : v.rule === 'list' ? ' · Guest list' : '') + (v.vip ? ' · VIP lounge' : '') + (n ? ' · ' + n + ' inside' : '') + (v.event ? ' · TONIGHT: ' + v.event : ''); tag.style.setProperty('--cc', hexOf(colOf(v.cat))); row.appendChild(tx);
    row.appendChild(btn('', here ? 'Walk to it' : 'Go to room', () => HOTEL.goTo(v), 'Takes you to the door, not inside')); return row;
  }
  function dirPanel() {
    const p = el('div', 'rp hp card hit'), h = el('div', 'rp-head'), t = el('b'); t.textContent = 'Directory'; h.appendChild(t); const sm = el('small'); sm.textContent = listed().length + ' rooms'; h.appendChild(sm); p.appendChild(h);
    const inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = 'Search by name, number or kind'; inp.value = HOTEL.q; inp.maxLength = 40;
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Escape') { inp.blur(); HOTEL.closePanel(); } }; inp.oninput = () => { HOTEL.q = inp.value; HOTEL.refreshList(); }; p.appendChild(inp);
    const cats = ['All', ...new Set(listed().map(v => v.cat))], chips = el('div', 'rp-cats');
    for (const c of cats) { const b = el('button', HOTEL.cat === c ? 'on' : ''); b.textContent = c; b.onclick = () => { HOTEL.cat = c; HOTEL.refreshUI(); }; chips.appendChild(b); } p.appendChild(chips);
    p.appendChild(el('div', 'hp-list')); p.appendChild(el('div', 'rp-note', 'Chog Hotel\'s own rooms and the holders\' venues come first, then the free rooms of every guest. A closed door is only shown in the hall; the basement is for the elevator.')); setTimeout(() => HOTEL.refreshList(), 0); return p;
  }
  HOTEL.refreshList = function () {
    const list = HOTEL.ui && HOTEL.ui.querySelector('.hp-list'); if (!list) return; list.innerHTML = '';
    const q = HOTEL.q.trim().toLowerCase().replace(/^#/, ''), all = listed().filter(v => (HOTEL.cat === 'All' || v.cat === HOTEL.cat) && (!q || (v.name + ' ' + v.desc + ' ' + v.no + ' ' + v.cat + (v.free ? ' free room' : '')).toLowerCase().includes(q))), vs = all.slice(0, 120);
    for (const v of vs) list.appendChild(venueRow(v)); if (all.length > vs.length) list.appendChild(el('div', 'rp-note', (all.length - vs.length) + ' more: search by name or door number to narrow it down.')); if (!vs.length) list.appendChild(el('div', 'rp-note', HOTEL.info ? 'Nothing matches.' : 'Loading the directory…'));
  };
  // the call buttons light up and the car leaves a moment after the last press; every button pressed within a few seconds gets one polite line from the panel (once per visit)
  let liftLit = new Set(), liftT0 = 0, liftTimer = 0, liftSer = false, liftSerSaid = false;
  function pressFloor(f) {
    const now = performance.now(); if (now - liftT0 > 6000 || liftSer) { liftLit = new Set(); liftSer = false; } if (!liftLit.size) liftT0 = now; liftLit.add(f); clearTimeout(liftTimer);
    const all = 2 + ((HOTEL.info && (HOTEL.info.floors + (HOTEL.info.basement || 0))) || 0);        // E, the lobby, every floor and the basement
    if (!liftSerSaid && liftLit.size >= all) { liftSerSaid = liftSer = true; HOTEL.refreshUI(); liftTimer = setTimeout(() => { liftSer = false; liftLit = new Set(); HOTEL.refreshUI(); }, 3200); return; }
    HOTEL.refreshUI();
    liftTimer = setTimeout(() => { const to = f; liftLit = new Set(); if (to !== HOTEL.floor) HOTEL.goFloor(to); else HOTEL.refreshUI(); }, 650);
  }
  // "1204" = floor 12, door 4 (unit 4); "B103" or "-103" = basement B1, unit 3; a number below 100 is a floor. The room you name is where the elevator puts you: in front of its door.
  function parseDoor(t) {
    t = String(t || '').trim().toUpperCase().replace(/^#/, ''); let m;
    if ((m = /^B(\d+?)(\d{2})$/.exec(t))) return { floor: -(+m[1]), unit: +m[2] };
    if ((m = /^B(\d+)$/.exec(t))) return { floor: -(+m[1]), unit: 0 };
    if ((m = /^-(\d+)$/.exec(t))) { const n = +m[1]; return n >= 100 ? { floor: -Math.floor(n / 100), unit: n % 100 } : { floor: -n, unit: 0 }; }
    if ((m = /^(\d+)$/.exec(t))) { const n = +m[1]; return n >= 100 ? { floor: Math.floor(n / 100), unit: n % 100 } : { floor: n, unit: 0 }; }
    return null;
  }
  HOTEL.goNumber = function (text) {
    const d = parseDoor(text), inf = HOTEL.info || { floors: 0, basement: 0, venues: [] };
    if (!d || d.floor === 0 && !/^0*$/.test(String(text).trim())) { toast('Type a room number such as 1204, or B103 for the basement.'); return; }
    if (d.floor > inf.floors || -d.floor > (inf.basement || 0)) { toast('There is no such floor in the Hotel.'); return; }
    if (d.unit < 0 || d.unit > 8) { toast('A floor has doors 1 to 8.'); return; }
    if (!d.unit) { if (d.floor === HOTEL.floor) { HOTEL.closePanel(); return; } HOTEL.goFloor(d.floor); return; }
    const no = d.floor * 100 + (d.floor < 0 ? -d.unit : d.unit), room = [...inf.venues, ...(HOTEL.basementBy[d.floor] || [])].find(v => v.no === no);
    HOTEL.goFloor(d.floor, room || { unit: d.unit, units: 1, no });
  };
  function liftPanel() {
    const p = el('div', 'rp hp lift card hit'), h = el('div', 'rp-head'), t = el('b'); t.textContent = 'Elevator'; h.appendChild(t); const sm = el('small'); sm.textContent = ((HOTEL.info && HOTEL.info.floors) || 0) + ' floors' + (HOTEL.info && HOTEL.info.basement ? ' · ' + HOTEL.info.basement + ' below' : ''); h.appendChild(sm); p.appendChild(h);
    const go = el('div', 'hgo'), inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 8; inp.placeholder = 'Room number, e.g. 1204'; inp.inputMode = 'numeric';
    const send = () => HOTEL.goNumber(inp.value); inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') send(); else if (e.key === 'Escape') { inp.blur(); HOTEL.closePanel(); } };
    go.appendChild(inp); go.appendChild(btn('', 'Go', send, 'Take me to that door')); p.appendChild(go);
    const body = el('div', 'hp-list'), n = (HOTEL.info && HOTEL.info.floors) || 0, below = (HOTEL.info && HOTEL.info.basement) || 0;
    if (liftSer) { const sr = el('div', 'rp-note'); sr.textContent = '“ser, please.”'; sr.style.cssText = 'text-align:center;font-weight:700'; p.appendChild(sr); }
    const ex = el('button', 'hf' + (HOTEL.floor === 'E' ? ' here' : '') + (liftLit.has('E') ? ' lit' : '')); ex.innerHTML = '<b>E</b><span></span>'; ex.querySelector('span').textContent = 'Exhibition · the weekly room contest'; ex.onclick = () => pressFloor('E'); body.appendChild(ex);
    for (let f = n; f >= -below; f--) {
      const vs = f < 0 ? [] : venuesOn(f).filter(v => v.state === 'open'), inside = vs.reduce((s, v) => s + (HOTEL.counts[v.id] || 0), 0), b = el('button', 'hf' + (f === HOTEL.floor ? ' here' : '') + (liftLit.has(f) ? ' lit' : ''));
      b.innerHTML = '<b>' + (f === 0 ? 'G' : f < 0 ? 'B' + (-f) : f) + '</b><span></span>'; const up = f > 0 && !vs.length && venuesOn(f - 1).find(v => (v.levels || 1) > 1 && v.state === 'open');
      b.querySelector('span').textContent = f === 0 ? 'Lobby · reception · street' : f < 0 ? 'Basement B' + (-f) + ' · cold storage' : up ? 'Floor ' + f + ' · upper level of #' + up.no : 'Floor ' + f + ' · ' + vs.length + ' room' + (vs.length === 1 ? '' : 's') + (inside ? ' · ' + inside + ' inside' : '');
      b.onclick = () => pressFloor(f); body.appendChild(b);
    }
    p.appendChild(body); return p;
  }
  HOTEL.refreshList = (old => function () { if (HOTEL.panel === 'dir') return old(); if (HOTEL.panel === 'lift') HOTEL.refreshUI(); })(HOTEL.refreshList);

  // ------------------------------------------------------------------ minimap of the hotel scene (same tilt as the town's)
  HOTEL.drawMap = function (cv) {
    const S = cv.width, g = cv.getContext('2d'), R = Math.SQRT1_2, neon = UI.skin === 'neon', bx = [1e9, -1e9, 1e9, -1e9];
    for (const [x0, x1, z0, z1] of mapRects) { bx[0] = Math.min(bx[0], x0); bx[1] = Math.max(bx[1], x1); bx[2] = Math.min(bx[2], z0); bx[3] = Math.max(bx[3], z1); }
    const cx = (bx[0] + bx[1]) / 2, cz = (bx[2] + bx[3]) / 2, k = S / (((bx[1] - bx[0]) + (bx[3] - bx[2])) * R + 2);
    const Pm = (x, z) => [S / 2 + ((x - cx) - (z - cz)) * R * k, S / 2 + ((x - cx) + (z - cz)) * R * k]; g.clearRect(0, 0, S, S);
    const rect = (x0, x1, z0, z1, col) => { g.beginPath(); [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].forEach(([a, b], i) => { const [px, py] = Pm(a, b); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fillStyle = col; g.fill(); };
    for (const r of mapRects) rect(r[0], r[1], r[2], r[3], neon ? '#5a4a86' : '#e6d8c6');
    for (const d of mapDoors) { const [a, b] = Pm(d.x, d.z); g.fillStyle = d.col; g.fillRect(a - 3, b - 3, 6, 6); }
    for (const r of NET.remotes.values()) if (r.root) { const [a, b] = Pm(r.root.position.x, r.root.position.z); g.beginPath(); g.arc(a, b, 3, 0, 7); g.fillStyle = '#7ad89a'; g.strokeStyle = '#1a0a2e'; g.lineWidth = 1.2; g.fill(); g.stroke(); }
    if (GAME.me) { const [a, b] = Pm(GAME.me.position.x, GAME.me.position.z), ry = GAME.me.rotation.y, ddx = Math.sin(ry), ddz = Math.cos(ry), [ex2, ey] = [(ddx - ddz) * R, (ddx + ddz) * R];
      g.save(); g.translate(a, b); g.rotate(Math.atan2(ey, ex2) + Math.PI / 2); g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(0, 2); g.lineTo(-5, 5); g.closePath(); g.fillStyle = '#ffd84a'; g.strokeStyle = '#1a0a2e'; g.lineWidth = 2; g.stroke(); g.fill(); g.restore(); }
  };

  // the screen fade used by every change of place
  HOTEL.fadeEl = document.createElement('div'); HOTEL.fadeEl.id = 'hfade'; document.body.appendChild(HOTEL.fadeEl);
  // a click on a hotel NPC (the receptionist) is handled by the game's click code through userData.onClick; players keep working as before
  const prevRoots = GAME.extraRoots; GAME.extraRoots = () => prevRoots().concat(HOTEL.active && npc ? [npc] : [], HOTEL.active && HOTEL.floor === 0 && RUG.tag ? [RUG.tag] : [], HOTEL.active ? guards.map(x => x.c) : []);
})();
