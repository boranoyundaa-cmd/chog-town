// ===== hotel: the Chog Hotel (docs/game/world.md): a lobby with a reception and an elevator, and floors with a wall of rooms =====
// Floor 0 is the lobby (a rectangle with the reception desk, the elevator and the street door). Floors 1..N are square halls 16 x 16 m generated from the server's list of venues:
// two rooms on the north back wall (slots 1 and 2) and two on the west back wall (slots 3 and 4), each 6.5 m of wall; the elevator stands in the corner (3 m). The camera only draws the two back walls.
// venue number = floor * 100 + first slot. A venue holds 1 slot (a wall segment), 2 (a whole wall) or 4 (the whole floor); from tier 3 it holds the same slots on the floor above too (its upper level).
// Every hotel scene hides the town like a room does (ROOM.showTown, DAY.pause). A venue is a room document the server serves (ROOM.enterVenue); leaving it returns to its door.
// Loaded after room.js and net.js. Needs the town server: the list of venues and the head count come from it.
const HOTEL = { active: false, away: false, floor: 0, info: null, counts: {}, facadeBy: {}, mineId: null, busy: false, ui: null, panel: null, q: '', cat: 'All', fadeEl: null };
(function () {
  const rad = d => d * Math.PI / 180, H = 3.3, wait = ms => new Promise(r => setTimeout(r, ms));
  const LOB = { w: 11, d: 8 };                                                        // lobby floor: x -5.5..5.5, z -4..4
  const FLH = 8, ELEV = 3, SLOT = 6.5, FAC_D = 1.6;                                      // a floor: half size of the hall, the corner the elevator takes, metres of wall per slot, how far a facade reaches into the hall
  const CAT_COL = { Club: 0xff5ab8, 'Café': 0x3fb8a0, Arcade: 0xffc23a, Gallery: 0xe8e0d0, Lounge: 0x8a5ad8, Spooky: 0xff7a1a, Workshop: 0x4a8ad8 };
  const colOf = cat => CAT_COL[cat] ?? 0x9a8ab8, hexOf = c => '#' + new THREE.Color(c).getHexString();
  const pal = () => SPACE.THEMES.studio.pal;
  const slotOf = no => no % 100;
  const wallOfSlot = s => (s <= 2 ? 'z' : 'x'), slotU = s => -FLH + ELEV + SLOT * ((s - 1) % 2);        // slots 1, 2 on the north wall; 3, 4 on the west wall; where a slot starts along its wall
  // the runs of wall a venue holds on its own floor: one per wall it touches ({wall, a, b} = first and last slot, u0 and u1 along the wall)
  function runsOf(no, span) {
    const s0 = slotOf(no), runs = []; for (let s = s0; s < s0 + span; s++) { const w = wallOfSlot(s), r = runs[runs.length - 1]; if (r && r.wall === w) r.b = s; else runs.push({ wall: w, a: s, b: s }); }
    for (const r of runs) { r.u0 = slotU(r.a); r.u1 = slotU(r.b) + SLOT; } return runs;
  }
  function doorOf(no, span = 1) {                                                      // where a venue's door is (the middle of its first wall run) and where you stand in front of it
    const r = runsOf(no, span)[0], u = (r.u0 + r.u1) / 2;
    return r.wall === 'z' ? { wall: 'z', u, w: r.u1 - r.u0, stand: { x: u, z: -FLH + 2.3, ry: 0 } } : { wall: 'x', u, w: r.u1 - r.u0, stand: { x: -FLH + 2.3, z: u, ry: Math.PI / 2 } };
  }
  HOTEL.doorOf = doorOf;

  // ------------------------------------------------------------------ scene state (rebuilt on every floor change)
  let G = null, walk = [], rects = [], spots = [], plates = [], notes = [], anims = [], lights = [], halos = [], npc = null, npcPlate = null, guards = [], saved = null, mapRects = [], mapDoors = [];
  const venuesOn = f => ((HOTEL.info && HOTEL.info.venues) || []).filter(v => v.floor === f).sort((a, b) => a.no - b.no);
  const listed = () => ((HOTEL.info && HOTEL.info.venues) || []).filter(v => v.state !== 'closed' || v.id === HOTEL.mineId);                   // the directory lists open rooms (and yours), closed doors only show in the corridor

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
      g.add(BOX(w + 0.4, 0.7, d + 0.4, tmat(new THREE.Color(pal().trim).multiplyScalar(1.2).getHex()), cx, -0.55, cz));
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
    onWall(g, o, wall, u, 2.72, sign('ELEVATOR', 1.5, 0.26, '#ffffff', '#2b1d44', '#7ae8ff'), 0.12);
    const hx = wall === 'z' ? u : o.x0 + 0.5, hz = wall === 'z' ? o.z0 + 0.5 : u; halo(g, 0x7ae8ff, 2.2, 0.35, hx, 2.7, hz);
  }
  function door(g, o, wall, u, col) {                                                  // a plain venue door in a category colour with a wall lamp
    const trim = tmat(pal().trim);
    onWall(g, o, wall, u, 1.12, BOX(1.28, 2.32, 0.1, trim), 0.05); onWall(g, o, wall, u, 1.05, BOX(1.0, 2.1, 0.12, tmat(col, { em: 0.2 })), 0.09); onWall(g, o, wall, u + 0.34, 1.0, SPH(0.06, tmat(0xf0d070)), 0.19);
    onWall(g, o, wall, u + 1.0, 1.85, BOX(0.14, 0.3, 0.12, tmat(0xfff2c8, { em: 1 })), 0.08);
    const hx = wall === 'z' ? u + 1.0 : o.x0 + 0.2, hz = wall === 'z' ? o.z0 + 0.2 : u + 1.0; halo(g, 0xffd890, 1.3, 0.5, hx, 1.85, hz);
  }
  // the default front of a room whose owner has not made a facade: the wall tinted in its colour and big lit windows on both sides of the door
  function shopfront(g, o, wall, u, W, col, shut) {
    const trim = tmat(pal().trim), tint = new THREE.Color(0xf0e2d0).lerp(new THREE.Color(col), shut ? 0.05 : 0.2).getHex();
    onWall(g, o, wall, u, (H - 0.1) / 2 + 0.05, BOX(W - 0.1, H - 0.1, 0.04, wallMat(tint, 'wainscot', W / 3, 1)), 0.04);
    const glass = new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.5), n = W > 8 ? 2 : 1;
    for (let k = 0; k < n; k++) for (const sd of [-1, 1]) {
      const wu = u + sd * (2.3 + k * 2.8); onWall(g, o, wall, wu, 1.65, BOX(1.7, 1.5, 0.08, trim), 0.06);
      onWall(g, o, wall, wu, 1.65, new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.3), new THREE.MeshBasicMaterial({ color: shut ? 0x4a3f62 : glass })), 0.11);
      onWall(g, o, wall, wu, 1.65, BOX(0.05, 1.3, 0.05, trim), 0.13); onWall(g, o, wall, wu, 1.65, BOX(1.5, 0.05, 0.05, trim), 0.13);
    }
  }
  // a stretch of wall that belongs to a venue but has no door: its upper level, or the other wall of a whole-floor venue. Glowing windows and a note.
  function reserved(g, o, wall, u0, u1, v, text) {
    const trim = tmat(pal().trim), col = colOf(v.cat), glass = new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.5), W = u1 - u0, u = (u0 + u1) / 2, n = Math.max(1, Math.round(W / 3.5));
    onWall(g, o, wall, u, (H - 0.1) / 2 + 0.05, BOX(W - 0.1, H - 0.1, 0.04, wallMat(new THREE.Color(0xf0e2d0).lerp(new THREE.Color(col), 0.12).getHex(), 'wainscot', W / 3, 1)), 0.04);
    for (let k = 0; k < n; k++) {
      const wu = u0 + (k + 0.5) * W / n; onWall(g, o, wall, wu, 1.7, BOX(2.2, 1.6, 0.08, trim), 0.06);
      onWall(g, o, wall, wu, 1.7, new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.4), new THREE.MeshBasicMaterial({ color: glass })), 0.11); onWall(g, o, wall, wu, 1.7, BOX(0.05, 1.4, 0.05, trim), 0.13);
    }
    notePlate(g, o, wall, u, 2.72, [text, v.name === 'Opening soon' ? '' : v.name], col);
  }
  // a small wall plate with one or two lines of text (reserved walls, free rooms)
  function notePlate(g, o, wall, u, y, lines, col) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const c = cv.getContext('2d');
    const draw = () => { c.clearRect(0, 0, 512, 160); c.fillStyle = '#2b1d44'; c.strokeStyle = hexOf(col); c.lineWidth = 7; c.beginPath(); c.roundRect ? c.roundRect(6, 6, 500, 148, 24) : c.rect(6, 6, 500, 148); c.fill(); c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = hexOf(col); c.font = '700 40px "Fredoka", sans-serif'; c.fillText(lines[0], 256, lines[1] ? 55 : 80); if (lines[1]) { c.fillStyle = '#ffffff'; let px = 44; c.font = `700 ${px}px "Fredoka", sans-serif`; while (c.measureText(lines[1]).width > 440 && px > 22) { px -= 3; c.font = `700 ${px}px "Fredoka", sans-serif`; } c.fillText(lines[1], 256, 108); } };
    draw(); const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4; notes.push(() => { draw(); tex.needsUpdate = true; });
    onWall(g, o, wall, u, y, new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })), 0.12);
  }
  function plateFor(g, o, wall, u, v) {                                                // the door plate: number, name, and how many people are inside right now
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192;
    const p = { v, cv, n: -1, tex: null };
    p.draw = () => {
      const c = cv.getContext('2d'); c.clearRect(0, 0, 512, 192);
      const shut = v.state === 'closed'; c.fillStyle = '#2b1d44'; c.strokeStyle = shut ? '#7a6a98' : hexOf(colOf(v.cat)); c.lineWidth = 8; c.beginPath(); c.roundRect ? c.roundRect(6, 6, 500, 180, 26) : c.rect(6, 6, 500, 180); c.fill(); c.stroke();
      c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = hexOf(colOf(v.cat)); c.font = '700 64px "Fredoka", sans-serif'; c.fillText('#' + v.no, 30, 62);
      c.fillStyle = '#ffffff'; let px = 44; c.font = `700 ${px}px "Fredoka", sans-serif`; while (c.measureText(v.name).width > 300 && px > 22) { px -= 3; c.font = `700 ${px}px "Fredoka", sans-serif`; }
      c.textAlign = 'right'; c.fillText(v.name, 482, 62);
      const n = HOTEL.counts[v.id] || 0; c.textAlign = 'left'; c.font = '700 36px "Fredoka", sans-serif'; c.fillStyle = shut ? '#ff7a8a' : n ? '#7ad89a' : '#a898c8'; c.fillText(shut ? '✕ CLOSED' : n ? '● ' + n + ' inside' : '○ empty', 30, 140);
      c.textAlign = 'right'; c.fillStyle = '#c8b8e8'; c.font = '600 30px "Fredoka", sans-serif'; c.fillText(v.cat + (v.levels > 1 ? ' · 2 levels' : ''), 482, 140);
      p.n = n; if (p.tex) p.tex.needsUpdate = true;
    };
    p.draw(); p.tex = new THREE.CanvasTexture(cv); p.tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.71), new THREE.MeshBasicMaterial({ map: p.tex, transparent: true, side: THREE.DoubleSide })); onWall(g, o, wall, u, 2.72, m, 0.12);
    plates.push(p); return p;
  }
  if (document.fonts) document.fonts.load('700 40px "Fredoka"').then(() => { plates.forEach(p => p.draw()); notes.forEach(f => f()); }).catch(() => { });

  // ------------------------------------------------------------------ facades: a venue's own strip of hall wall (a document the owner placed, docs/game/world.md)
  // doc coordinates are those of a room 7 or 14 m wide and FAC_D deep whose back wall is the hall wall: x runs along the wall, z out of it (-FAC_D/2 = against the wall).
  function buildFacade(g, o, it) {
    const doc = it.doc || {}, th = SPACE.THEMES[doc.theme] || SPACE.THEMES.studio, fpal = th.pal, d = doorOf(it.no, it.span), W = d.w, hexN = s => parseInt(String(s).slice(1), 16);
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
    const d = doorOf(v.no, v.span), side = 1.2, c = chog({ hair: 0x3a3550, outfit: 'jacket', trim: 0xff3aa8, head: 'cap', capC: 0x1a1030, scale: CHOG_SCALE * 1.02 });
    if (d.wall === 'z') { c.position.set(d.stand.x + side, 0, d.stand.z); c.rotation.y = 0; } else { c.position.set(d.stand.x, 0, d.stand.z + side); c.rotation.y = Math.PI / 2; }
    c.userData.netName = v.rule === 'holders' ? 'Holders only' : 'Guest list'; c.userData.onClick = () => toast(GUARD_LINES[v.rule] || 'Welcome.'); c.userData.t0 = Math.random() * 6;
    g.add(c); guards.push({ c, v, plate: PLATES.add(c, 'Guard') });
  }
  HOTEL.guardSays = reason => {                                                          // a refusal at a door: show it as the guard's own line
    const gd = guards.find(x => x.v.id === HOTEL.lastDoor); if (!gd || !HOTEL.active) return false; PLATES.say(gd.plate, reason); return true;
  };
  HOTEL.onFacades = m => {                                                              // the server sent the facades of a floor (stepping onto it, or an owner saved one)
    const same = JSON.stringify(HOTEL.facadeBy[m.floor] || null) === JSON.stringify(m.items || []); HOTEL.facadeBy[m.floor] = m.items || [];
    if (!same && HOTEL.active && HOTEL.floor === m.floor && !HOTEL.busy && G) HOTEL.rebuildHere();
  };

  // ------------------------------------------------------------------ the two scenes
  function buildLobby() {
    const g = new THREE.Group(), o = { z0: -LOB.d / 2, x0: -LOB.w / 2, lenX: LOB.w, lenZ: LOB.d, cx: 0, cz: 0, wallC: 0xf0e2d0, wallPat: 'wainscot', floorC: 0xe6d6c0, floorPat: 'tiles', floors: [[0, 0, LOB.w, LOB.d]] };
    shell(g, o); walk = [[-LOB.w / 2 + 0.3, LOB.w / 2 - 0.3, -LOB.d / 2 + 0.3, LOB.d / 2 - 0.3]]; mapRects = [[-LOB.w / 2, LOB.w / 2, -LOB.d / 2, LOB.d / 2]];
    // the street door (like a room's exit), the elevator, the big sign
    const trim = tmat(pal().trim); onWall(g, o, 'z', 3.9, 1.0, BOX(1.1, 2.0, 0.12, tmat(0x2f6a5c)), 0.06); onWall(g, o, 'z', 3.9, 1.0, BOX(1.3, 2.15, 0.08, trim), 0.03); onWall(g, o, 'z', 4.24, 1.0, SPH(0.06, tmat(0xf0d070)), 0.16);
    onWall(g, o, 'z', 3.9, 2.35, sign('STREET', 0.9, 0.22, '#ffffff'), 0.1);
    elevator(g, o, 'x', 0.6);
    onWall(g, o, 'z', 0.2, 2.55, sign('CHOG HOTEL', 3.6, 0.62, '#fff6e0', '#2b1d44', '#ff9ad8'), 0.06); halo(g, 0xff9ad8, 4.5, 0.3, 0.2, 2.5, -3.6);
    // furniture
    piece(g, 'receptionDesk', 0.2, -2.95); piece(g, 'rug', 0.2, 0.9); piece(g, 'sofa', -2.4, 2.9, 180); piece(g, 'coffeeTable', -2.4, 1.7); piece(g, 'armchair', -4.0, 1.9, 90);
    piece(g, 'tallPlant', 4.8, -0.6); piece(g, 'plant', 4.9, 3.0); piece(g, 'tallPlant', -4.8, -3.3); piece(g, 'floorLamp', 4.3, 1.6); piece(g, 'sofa', 2.6, 3.0, 180); piece(g, 'sideTable', 0.6, 3.1); piece(g, 'wallArt', -3.2, -4.0);
    piece(g, 'wallArt', -5.5, 2.6, 90); piece(g, 'wallArt', -5.5, -1.6, 90);
    piece(g, 'pendantLamp', 0.2, -1.4); piece(g, 'pendantLamp', -2.4, 2.0); piece(g, 'pendantLamp', 3.0, 1.8);
    block(0.2, -2.95, 1.7, 0.45);
    // the receptionist
    npc = chog({ hair: 0x5b35b0, outfit: 'vest', vest: 0x7a3ac8, head: 'headset', scale: CHOG_SCALE * 1.0 }); npc.position.set(0.2, 0, -3.62); npc.rotation.y = 0; g.add(npc); npc.userData.netName = 'Reception'; npc.userData.onClick = () => HOTEL.openPanel('dir');
    npcPlate = PLATES.add(npc, 'Staff');
    spots = [
      { x: 0.2, z: -1.9, r: 1.6, y: 2.2, label: 'Ask reception', run: () => HOTEL.openPanel('dir') },
      { x: -4.4, z: 0.6, r: 1.4, y: 2.6, label: 'Take the elevator', run: () => HOTEL.openPanel('lift'), at: [-5.2, 2.7, 0.6] },
      { x: 3.9, z: -3.1, r: 1.3, y: 2.6, label: 'Go out to the street', run: () => HOTEL.leave(), at: [3.9, 2.6, -3.9] },
    ];
    G = g; return { spawn: { x: 3.6, z: -2.0, ry: 0 } };
  }
  function buildFloor(f) {
    const g = new THREE.Group(), o = { z0: -FLH, x0: -FLH, lenX: 2 * FLH, lenZ: 2 * FLH, cx: 0, cz: 0, wallC: 0xf0e2d0, wallPat: 'wainscot', floorC: 0x4e2a5c, floorPat: 'carpet', floors: [[0, 0, 2 * FLH, 2 * FLH]] };
    shell(g, o);
    const m = 0.3; walk = [[-FLH + m, FLH - m, -FLH + m, FLH - m]]; mapRects = [[-FLH, FLH, -FLH, FLH]]; mapDoors = [];
    const trim = tmat(pal().trim);
    elevator(g, o, 'z', -FLH + ELEV / 2); onWall(g, o, 'z', -FLH + ELEV / 2, 3.07, sign('FLOOR ' + f, 1.2, 0.24, '#ffe9a8', null, '#ffb03a'), 0.12);
    onWall(g, o, 'x', -FLH + ELEV / 2, 1.7, BOX(1.5, 1.3, 0.1, trim), 0.05); onWall(g, o, 'x', -FLH + ELEV / 2, 1.7, new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), new THREE.MeshBasicMaterial({ color: SPACE.VIEWS[SPACE.viewKey(null)].window })), 0.11);
    spots = [{ x: -FLH + ELEV / 2, z: -FLH + 1.7, r: 1.5, y: 2.6, label: 'Take the elevator', run: () => HOTEL.openPanel('lift'), at: [-FLH + ELEV / 2, 2.9, -FLH + 0.5] }];
    // the hall: a rug and a sitting corner in the middle, plants at the open corners, a pendant lamp over each part of the floor
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.4), new THREE.MeshBasicMaterial({ color: 0x8a4a78 })); rug.rotation.x = -Math.PI / 2; rug.position.set(1.9, 0.012, 2.6); g.add(rug);
    piece(g, 'coffeeTable', 1.9, 2.3); piece(g, 'sofa', 1.9, 3.9, 180); piece(g, 'armchair', -0.4, 2.3, 90); piece(g, 'armchair', 4.2, 2.3, 270); piece(g, 'lampTable', -0.4, 3.7); piece(g, 'lampTable', 4.2, 3.7);
    piece(g, 'bench', -1.0, -3.3, 180); piece(g, 'bench', 5.0, -3.3, 180); piece(g, 'bench', -3.6, 0.0, 270); piece(g, 'bench', -3.6, 5.6, 270);
    piece(g, 'tallPlant', FLH - 0.6, FLH - 0.6); piece(g, 'tallPlant', -5.0, FLH - 0.6); piece(g, 'plant', FLH - 0.55, -1.0, 0, 0, { free: true }); piece(g, 'plant', FLH - 0.55, 2.4, 0, 0, { free: true });
    for (const [x, z] of [[-3.5, -3.4], [3.0, -3.4], [-3.6, 2.6], [1.9, 2.5], [6.0, 4.0], [-2.0, 6.2], [4.5, 6.4]]) piece(g, 'pendantLamp', x, z);
    // the rooms: per venue its door run, the other wall of a whole-floor venue, and (one floor up) the upper level of the venues below
    const taken = new Set(), list = venuesOn(f), below = venuesOn(f - 1).filter(v => (v.levels || 1) > 1);
    for (const v of list) {
      const runs = runsOf(v.no, v.span || 1), d = doorOf(v.no, v.span || 1), own = HOTEL.mineId === v.id, shut = v.state === 'closed', col = shut ? 0x5a4a78 : colOf(v.cat);
      const fac = (HOTEL.facadeBy[f] || []).find(x => x.id === v.id);
      for (let s = v.no % 100; s < (v.no % 100) + (v.span || 1); s++) taken.add(s);
      if (!fac) shopfront(g, o, d.wall, d.u, d.w, col, shut);
      door(g, o, d.wall, d.u, col); plateFor(g, o, d.wall, d.u, v);
      for (const r of runs.slice(1)) reserved(g, o, r.wall, r.u0, r.u1, v, 'PENTHOUSE');
      spots.push({ x: d.stand.x, z: d.stand.z, r: 1.3, label: shut ? (own ? 'Enter your venue (closed)' : 'Closed') : 'Enter ' + v.name, run: () => (shut && !own ? toast(v.name === 'Opening soon' ? 'This room is not open yet.' : v.name + ' is closed right now.') : HOTEL.enterVenue(v)), at: d.wall === 'z' ? [d.u, 2.45, -FLH + 0.4] : [-FLH + 0.4, 2.45, d.u], v });
      mapDoors.push({ x: d.wall === 'z' ? d.u : -FLH, z: d.wall === 'z' ? -FLH : d.u, col: shut ? '#7a6a98' : hexOf(colOf(v.cat)) });
    }
    for (const v of below) for (const r of runsOf(v.no, v.span || 1)) { reserved(g, o, r.wall, r.u0, r.u1, v, 'UPPER LEVEL'); for (let s = r.a; s <= r.b; s++) taken.add(s); }
    for (let s = 1; s <= 4; s++) if (!taken.has(s)) {                                          // a free room: nobody holds it yet
      const w = wallOfSlot(s), u0 = slotU(s), u = u0 + SLOT / 2;
      notePlate(g, o, w, u, 2.1, ['ROOM #' + (f * 100 + s), 'free for a Chog holder'], 0x6a5a88);
    }
    for (const it of HOTEL.facadeBy[f] || []) buildFacade(g, o, it);
    for (const v of list) if (v.state === 'open' && v.rule && v.rule !== 'public') buildGuard(g, o, v);
    G = g; return { spawn: { x: -FLH + ELEV / 2, z: -FLH + 2.6, ry: 0 } };
  }

  function clearScene() {
    if (G) { world.remove(G); G.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); }
    for (const h of halos) { const i = noNormalPass.indexOf(h); if (i >= 0) noNormalPass.splice(i, 1); }
    if (npcPlate) { PLATES.remove(npcPlate); npcPlate = null; }
    for (const gd of guards) PLATES.remove(gd.plate); guards = [];
    G = null; walk = []; rects = []; spots = []; plates.length = 0; anims.length = 0; lights.length = 0; halos.length = 0; npc = null; mapRects = []; mapDoors = [];
    SPACE.clearSky(); SPACE.refreshHidden();
  }

  // ------------------------------------------------------------------ going places (fade out, switch, fade in)
  HOTEL.fade = fn => fade(fn);
  async function fade(fn) { const f = HOTEL.fadeEl; f.classList.add('on'); await wait(360); try { return await fn(); } finally { await wait(80); f.classList.remove('on'); } }
  async function loadInfo() { if (HOTEL.info && Date.now() - (HOTEL.infoAt || 0) < 20000) return true; NET.send({ t: 'hotelinfo' }); const r = await NET.waitFor(['hotel'], 6000); if (r) HOTEL.onInfo(r); return !!HOTEL.info; }
  HOTEL.onInfo = m => { HOTEL.info = { floors: m.floors, venues: m.venues || [] }; HOTEL.infoAt = Date.now(); HOTEL.counts = m.counts || {}; if (HOTEL.panel) HOTEL.refreshUI(); };
  HOTEL.setCounts = c => { HOTEL.counts = c || {}; for (const p of plates) if (p.n !== (HOTEL.counts[p.v.id] || 0)) p.draw(); if (HOTEL.panel === 'dir' || HOTEL.panel === 'lift') HOTEL.refreshList(); };

  // show a floor (0 = lobby). The server move comes first: if it says no, nothing on screen changes.
  async function show(floor, spawn) {
    const me = GAME.me, a = spawn || (floor === 0 ? { x: 3.6, z: -2.0, ry: 0 } : { x: -FLH + ELEV / 2, z: -FLH + 2.6, ry: 0 });
    const r = await NET.enter({ space: 'hotel', floor, x: a.x, z: a.z, ry: a.ry || 0 }); if (!r || r.t !== 'entered') return false;
    if (r.counts) HOTEL.counts = r.counts;
    if (floor > 0) { NET.send({ t: 'hotelfloor', floor }); for (let i = 0; i < 3; i++) { const fr = await NET.waitFor(['facades'], 3000); if (!fr || fr.floor === floor) break; } }
    if (!saved) { const sc = sun.shadow.camera; saved = { zoom: GAME.zoomT, shadow: { l: sc.left, r: sc.right, t: sc.top, b: sc.bottom, f: sc.far } }; ROOM.showTown(false); DAY.pause(); }
    clearScene(); const out = floor === 0 ? buildLobby() : buildFloor(floor); world.add(G);
    SPACE.applyView(SPACE.VIEWS[SPACE.viewKey(null)]); SPACE.refreshHidden();
    GAME.room = { blocked: (x, z, rr) => blocked(x, z, rr) }; GAME.path = []; GAME.keys = {}; GAME.regrid();
    me.position.set(a.x, 0, a.z); me.rotation.y = a.ry || 0; camTarget.set(a.x, 1.1, a.z);
    if (floor === 0) { GAME.camFixed = new THREE.Vector3(0, 1.0, 0); GAME.sceneZoom(16); } else { GAME.camFixed = null; GAME.sceneZoom(16); }
    HOTEL.active = true; HOTEL.floor = floor; HOTEL.panel = null; document.body.classList.add('inhotel'); HOTEL.refreshUI(); if (typeof render === 'function') render();
    return true;
  }
  // rebuild the floor you stand on without moving anywhere (a facade changed)
  HOTEL.rebuildHere = function () {
    if (!HOTEL.active || HOTEL.floor === 0) return; const me = GAME.me, p = { x: me.position.x, z: me.position.z, ry: me.rotation.y };
    clearScene(); buildFloor(HOTEL.floor); world.add(G); SPACE.applyView(SPACE.VIEWS[SPACE.viewKey(null)]); SPACE.refreshHidden();
    GAME.room = { blocked: (x, z, rr) => blocked(x, z, rr) }; GAME.regrid(); me.position.set(p.x, 0, p.z); me.rotation.y = p.ry; HOTEL.refreshUI();
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
    HOTEL.busy = true; try { await fade(async () => { if (!await loadInfo()) { toast('The Hotel did not answer. Try again.'); return; } await show(v.floor, doorOf(v.no, v.span).stand); }); } finally { HOTEL.busy = false; }
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
    try { await fade(async () => { await loadInfo(); const d = door ? doorOf(door.no, door.span) : null; if (!await show(f, d ? d.stand : f === 0 ? { x: -3.4, z: 0.6, ry: Math.PI / 2 } : null)) toast('The elevator did not move. Try again.'); }); } finally { HOTEL.busy = false; }
  };
  HOTEL.goTo = v => HOTEL.goFloor(v.floor, v);
  HOTEL.enterVenue = async function (v) {
    if (HOTEL.busy || ROOM.busy || !HOTEL.active) return; HOTEL.busy = true;
    HOTEL.lastDoor = v.id; try { await fade(async () => { await ROOM.enterVenue(v); }); } finally { HOTEL.busy = false; }
  };
  HOTEL.returnFromVenue = async function (v) {
    if (HOTEL.busy) return; HOTEL.busy = true;
    try { await fade(async () => { ROOM.exitVenueScene(); await loadInfo(); if (await show(v.floor, doorOf(v.no, v.span).stand)) HOTEL.away = false; else { ROOM.showTown(true); DAY.resume(); saved = null; HOTEL.away = false; } }); } finally { HOTEL.busy = false; }
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
  HOTEL.where = () => (HOTEL.floor === 0 ? 'Lobby' : 'Floor ' + HOTEL.floor);
  HOTEL.hint = () => (HOTEL.floor === 0 ? 'Click to walk · E at the reception for the directory, at the elevator for the floors' : 'Click to walk · E at a door to go in · E at the elevator to change floor');

  // ------------------------------------------------------------------ the HUD: top bar and the two panels (directory, elevator)
  const btn = (cls, txt, fn, title) => { const b = el('button', 'btn hit ' + cls, ''); b.textContent = txt; b.onclick = fn; if (title) b.title = title; return b; };
  HOTEL.openPanel = p => { if (!HOTEL.active || HOTEL.busy) return; HOTEL.panel = p; if (p === 'dir') HOTEL.q = ''; HOTEL.refreshUI(); if (!HOTEL.info) loadInfo().then(() => HOTEL.refreshUI()); };
  HOTEL.closePanel = () => { HOTEL.panel = null; HOTEL.refreshUI(); };
  HOTEL.hud = function () { if (!HOTEL.ui) { HOTEL.ui = el('div', 'hotelhud'); HOTEL.refreshUI(); } return HOTEL.ui; };
  HOTEL.refreshUI = function () {
    const u = HOTEL.ui; if (!u) return; u.innerHTML = ''; if (!HOTEL.active) return;
    const bar = el('div', 'roombar hit'), nm = el('div', 'rn'); const t = el('b'); t.textContent = HOTEL.title(); nm.appendChild(t); const s = el('small'); s.textContent = HOTEL.where(); nm.appendChild(s); bar.appendChild(nm);
    bar.appendChild(btn(HOTEL.panel === 'dir' ? '' : 'ghost', 'Directory', () => (HOTEL.panel === 'dir' ? HOTEL.closePanel() : HOTEL.openPanel('dir')), 'Find a room: search, categories, go to its door'));
    bar.appendChild(btn(HOTEL.panel === 'lift' ? '' : 'ghost', 'Elevator', () => (HOTEL.panel === 'lift' ? HOTEL.closePanel() : HOTEL.openPanel('lift'))));
    bar.appendChild(btn('ghost', 'Street', () => HOTEL.leave(), 'Leave the hotel')); u.appendChild(bar);
    if (HOTEL.panel) u.appendChild(HOTEL.panel === 'dir' ? dirPanel() : liftPanel());
  };
  function venueRow(v) {
    const row = el('div', 'hv'), no = el('div', 'no'), tx = el('div', 'tx'), n = HOTEL.counts[v.id] || 0, here = HOTEL.active && v.floor === HOTEL.floor;
    no.innerHTML = '#' + v.no + '<small>Floor ' + v.floor + '</small>'; row.appendChild(no);
    tx.innerHTML = '<b></b><span></span><i></i>'; tx.querySelector('b').textContent = v.name; tx.querySelector('span').textContent = v.desc;
    const tag = tx.querySelector('i'); tag.textContent = v.cat + (v.rule === 'holders' ? ' · Holders only' : v.rule === 'list' ? ' · Guest list' : '') + (n ? ' · ' + n + ' inside' : ''); tag.style.setProperty('--cc', hexOf(colOf(v.cat))); row.appendChild(tx);
    row.appendChild(btn('', here ? 'Walk to it' : 'Go to room', () => HOTEL.goTo(v), 'Takes you to the door, not inside')); return row;
  }
  function dirPanel() {
    const p = el('div', 'rp hp card hit'), h = el('div', 'rp-head'), t = el('b'); t.textContent = 'Directory'; h.appendChild(t); const sm = el('small'); sm.textContent = listed().length + ' rooms'; h.appendChild(sm); p.appendChild(h);
    const inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = 'Search by name, number or kind'; inp.value = HOTEL.q; inp.maxLength = 40;
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Escape') { inp.blur(); HOTEL.closePanel(); } }; inp.oninput = () => { HOTEL.q = inp.value; HOTEL.refreshList(); }; p.appendChild(inp);
    const cats = ['All', ...new Set(listed().map(v => v.cat))], chips = el('div', 'rp-cats');
    for (const c of cats) { const b = el('button', HOTEL.cat === c ? 'on' : ''); b.textContent = c; b.onclick = () => { HOTEL.cat = c; HOTEL.refreshUI(); }; chips.appendChild(b); } p.appendChild(chips);
    p.appendChild(el('div', 'hp-list')); p.appendChild(el('div', 'rp-note', 'Rooms made by Chog Town and by Chog holders. A closed door is only shown in the hall.')); setTimeout(() => HOTEL.refreshList(), 0); return p;
  }
  HOTEL.refreshList = function () {
    const list = HOTEL.ui && HOTEL.ui.querySelector('.hp-list'); if (!list) return; list.innerHTML = '';
    const q = HOTEL.q.trim().toLowerCase().replace(/^#/, ''), vs = listed().filter(v => (HOTEL.cat === 'All' || v.cat === HOTEL.cat) && (!q || (v.name + ' ' + v.desc + ' ' + v.no + ' ' + v.cat).toLowerCase().includes(q))).sort((a, b) => a.no - b.no);
    for (const v of vs) list.appendChild(venueRow(v)); if (!vs.length) list.appendChild(el('div', 'rp-note', HOTEL.info ? 'Nothing matches.' : 'Loading the directory…'));
  };
  function liftPanel() {
    const p = el('div', 'rp hp lift card hit'), h = el('div', 'rp-head'), t = el('b'); t.textContent = 'Elevator'; h.appendChild(t); p.appendChild(h);
    const body = el('div', 'hp-list'), n = (HOTEL.info && HOTEL.info.floors) || 0;
    for (let f = n; f >= 0; f--) {
      const vs = venuesOn(f).filter(v => v.state !== 'closed'), inside = vs.reduce((s, v) => s + (HOTEL.counts[v.id] || 0), 0), b = el('button', 'hf' + (f === HOTEL.floor ? ' here' : '')); b.disabled = f === HOTEL.floor;
      b.innerHTML = '<b>' + (f === 0 ? 'G' : f) + '</b><span></span>'; const up = f > 0 && !vs.length && venuesOn(f - 1).find(v => (v.levels || 1) > 1 && v.state !== 'closed'); b.querySelector('span').textContent = f === 0 ? 'Lobby · reception · street' : up ? 'Floor ' + f + ' · upper level of #' + up.no : 'Floor ' + f + ' · ' + vs.length + ' room' + (vs.length === 1 ? '' : 's') + (inside ? ' · ' + inside + ' inside' : '');
      b.onclick = () => HOTEL.goFloor(f); body.appendChild(b);
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
  const prevRoots = GAME.extraRoots; GAME.extraRoots = () => prevRoots().concat(HOTEL.active && npc ? [npc] : [], HOTEL.active ? guards.map(x => x.c) : []);
})();
