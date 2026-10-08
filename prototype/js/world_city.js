// ===== world: the modern city district (replaces the medieval island). One kit, one block, walkable =====
// Exports for the rest of the game: HALF, world, WORLD_BLOCKERS (walk collision), occluders (see-through), walkers (NPC residents, filled by npc.js), CITY (names for the HUD), hiddenInNormal.
// Windows are InstancedMesh (one draw call per building); daycycle.js recolours them (lit or dark) and drives lamps/neon.
const HALF = 10.4;                                          // half size of the slab; walking limit is HALF - 0.45 (the server keeps the same number: CFG.half)
const world = new THREE.Group(); scene.add(world);
const WORLD_BLOCKERS = [], occluders = [], walkers = [], occ = [];
const CITY = { buildings: [], spawn: [0.5, 2.0], road: 1.5, doors: {} };       // doors: where the town's enterable doors are (room.js)
(function () {
  const P = { road: 0x7c7a8c, walk: 0xd2c8bc, curb: 0xe8dfd2, trim: 0x3f3850, roofc: 0xb8b4c4, tree: 0x5eb868, slab: 0xb8ad9f, face: [0xf0d6c0, 0xa6d8c8, 0xf0aebb, 0xb4c0ee, 0xf1cf78, 0xf4c19a], glassTint: 0x9ccdf2 };
  const F = P.face, sh = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
  const block = (x, z, hw, hd) => WORLD_BLOCKERS.push({ x, z, hw, hd });

  // ---------- textures and helpers
  const TXT = {};
  TXT.asphalt = paint(128, 128, (g, w, h) => { g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = 190 + rnd() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v},.55)`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); } for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(80,80,90,.25)'; g.beginPath(); g.moveTo(rnd() * w, rnd() * h); g.lineTo(rnd() * w, rnd() * h); g.stroke(); } }, 6, 6);
  TXT.tiles = paint(128, 128, (g, w, h) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,80,90,.35)'; g.lineWidth = 2; for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${.1 + rnd() * .2})`; g.fillRect(rnd() * w, rnd() * h, 14, 14); } }, 8, 8);
  TXT.concrete = paint(64, 64, (g, w, h) => { g.fillStyle = '#ececec'; g.fillRect(0, 0, w, h); for (let i = 0; i < 200; i++) { const v = 205 + rnd() * 50 | 0; g.fillStyle = `rgba(${v},${v},${v},.6)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.strokeStyle = 'rgba(90,90,100,.22)'; g.lineWidth = 1; for (let y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(w, y + .5); g.stroke(); } });
  function texBox(w, h, d, color, tex, sc = 1.6, em) {
    const o = { noCache: true, em };
    const mx = tmat(color, { ...o, tex: reTex(tex, d / sc, h / sc) }), mz = tmat(color, { ...o, tex: reTex(tex, w / sc, h / sc) }), my = tmat(color, { ...o, tex: reTex(tex, w / sc, d / sc) });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mx, mx, my, my, mz, mz]); m.castShadow = m.receiveShadow = true; return m;
  }
  const cbox = (w, h, d, color, sc = 1.8) => texBox(w, h, d, color, TXT.concrete, sc);
  const SIGNS = [];
  function sign(text, w, h, o = {}) {                       // text on a canvas; repainted once the web fonts have loaded
    const fg = o.fg || '#fff', bg = o.bg || null, font = o.font || '"Bungee", "Fredoka", sans-serif', px = o.px || 64, glow = o.glow;
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * h / w);
    const draw = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height); }
      g.font = `${px}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if (glow) { g.shadowColor = glow; g.shadowBlur = 18; } g.fillStyle = fg;
      const ls = String(text).split('\n'), lh = px * 1.05; ls.forEach((t, i) => { const y = cv.height / 2 + 2 + (i - (ls.length - 1) / 2) * lh; g.fillText(t, cv.width / 2, y); if (glow) g.fillText(t, cv.width / 2, y); }); };
    draw(); const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4; SIGNS.push(() => { draw(); tex.needsUpdate = true; });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !bg, side: THREE.DoubleSide }));
  }
  if (document.fonts) Promise.all(['64px "Bungee"', '700 48px "Fredoka"'].map(f => document.fonts.load(f))).then(() => SIGNS.forEach(f => f())).catch(() => { });
  const halo = (color, size, op) => { const s = glowSprite(color, size, op); noNormalPass.push(s); DAY.glow(s, op); return s; };      // glows switch on with the lamps
  const plight = (color, I, dist, x, y, z) => { const l = new THREE.PointLight(color, I, dist, 1.8); l.position.set(x, y, z); DAY.light(l, I); return l; };
  function onFace(g, face, w, d, mesh, u, y, o = 0) {      // 'z' = the +z side, 'x' = the +x side; u runs along the face
    if (face === 'z') mesh.position.set(u, y, d / 2 + o); else { mesh.position.set(w / 2 + o, y, -u); mesh.rotation.y = Math.PI / 2; }
    g.add(mesh); return mesh;
  }

  // ---------- the building kit
  function winGrid(face, w, d, floors, y0, fh, specs, balconyG, o = {}) {
    const len = face === 'z' ? w : d, cols = Math.max(1, Math.round((len - 0.6) / (o.pitch || 1.15))), pitch = (len - 0.5) / cols, ww = pitch * 0.62, wh = fh * 0.56;
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
      const u = -len / 2 + 0.25 + pitch * (c + 0.5), y = y0 + f * fh + fh * 0.55;
      specs.push({ face, u, y, ww, wh });
      if (o.balcony && (f + c) % 2 === 0 && f > 0) {
        onFace(balconyG, face, w, d, BOX(ww + 0.5, 0.08, 0.5, tmat(0xdad4d0)), u, y - wh / 2 - 0.08, 0.3);
        onFace(balconyG, face, w, d, BOX(ww + 0.5, 0.28, 0.04, new THREE.MeshBasicMaterial({ color: 0x9ccdf2, transparent: true, opacity: 0.55 })), u, y - wh / 2 + 0.1, 0.54);
        if (rnd() < 0.5) onFace(balconyG, face, w, d, SPH(0.14, tmat(P.tree)), u + (rnd() - 0.5) * ww * 0.6, y - wh / 2 + 0.2, 0.3);
      }
    }
  }
  function buildWindows(g, w, d, specs) {
    const n = specs.length; if (!n) return;
    const glass = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
    const frames = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), tmat(P.trim), n * 2), o = new THREE.Object3D(), flags = [];
    const put = (s, off, sx, sy, sz, yy) => { if (s.face === 'z') o.position.set(s.u, yy, d / 2 + off); else o.position.set(w / 2 + off, yy, -s.u); o.rotation.set(0, s.face === 'z' ? 0 : Math.PI / 2, 0); o.scale.set(sx, sy, sz); o.updateMatrix(); return o.matrix; };
    specs.forEach((s, i) => {
      glass.setMatrixAt(i, put(s, 0.08, s.ww, s.wh, 1, s.y));
      frames.setMatrixAt(i * 2, put(s, 0.03, s.ww + 0.07, s.wh + 0.07, 0.08, s.y));
      frames.setMatrixAt(i * 2 + 1, put(s, 0.12, s.ww, 0.04, 0.05, s.y - s.wh / 2 - 0.04));
      flags.push({ r: rnd(), cool: rnd() < 0.18, g: rnd() < 0.5 ? 0 : 1, v: rnd() });
    });
    for (const m of [glass, frames]) { m.frustumCulled = false; g.add(m); } frames.receiveShadow = true;
    DAY.addWindows(glass, flags);
  }
  function storefront(g, face, w, d, o) {
    const len = face === 'z' ? w : d, h = o.h || 2.1, gw = len - 0.6;
    const tex = paint(128, 64, (c, W, H) => { const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, o.in1 || '#ffe2a6'); gr.addColorStop(1, o.in2 || '#e8a06a'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(80,40,30,.28)'; c.fillRect(8 + i * 24, 14, 18, 4); c.fillRect(8 + i * 24, 30, 18, 4); for (let k = 0; k < 4; k++) { c.fillStyle = ['#ff7aa8', '#7ad8ff', '#fff07a', '#b08aff'][(i + k) % 4]; c.fillRect(10 + i * 24 + k * 4, 8, 3, 6); c.fillRect(10 + i * 24 + k * 4, 24, 3, 6); } }
      c.fillStyle = 'rgba(60,30,20,.4)'; c.fillRect(0, H - 16, W, 16); for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(255,255,230,.9)'; c.beginPath(); c.arc(24 + i * 40, 6, 3, 0, 7); c.fill(); } });
    tex.repeat.set(1, 1);
    onFace(g, face, w, d, new THREE.Mesh(new THREE.PlaneGeometry(gw, h - 0.25), new THREE.MeshBasicMaterial({ map: tex })), 0, 0.12 + (h - 0.25) / 2 + 0.1, 0.06);
    onFace(g, face, w, d, new THREE.Mesh(new THREE.PlaneGeometry(gw, h - 0.25), new THREE.MeshBasicMaterial({ color: 0xcff0ff, transparent: true, opacity: 0.1 })), 0, 0.12 + (h - 0.25) / 2 + 0.1, 0.1);
    const n = Math.max(2, Math.round(gw / 1.5)); for (let i = 0; i <= n; i++) onFace(g, face, w, d, BOX(0.07, h - 0.1, 0.1, tmat(P.trim)), -gw / 2 + i * gw / n, h / 2 + 0.05, 0.1);
    onFace(g, face, w, d, BOX(gw + 0.2, 0.1, 0.12, tmat(P.trim)), 0, h - 0.05, 0.1);
    if (o.door !== undefined) { onFace(g, face, w, d, BOX(0.9, 1.85, 0.1, tmat(o.doorColor ?? P.trim)), o.door, 0.93, 0.13); onFace(g, face, w, d, BOX(0.08, 0.5, 0.06, tmat(0xe8e0d0)), o.door + 0.3, 0.95, 0.2); }
    if (o.awning) {
      const [c1, c2] = o.awning, aw = gw + 0.2, st = 12;
      for (let i = 0; i < st; i++) { const s = BOX(aw / st + 0.01, 0.06, 0.8, tmat(i % 2 ? c1 : c2, { em: 0.2 })); const m = onFace(g, face, w, d, s, -aw / 2 + (i + 0.5) * aw / st, h + 0.18, 0.5); m.rotation.set(0, face === 'x' ? Math.PI / 2 : 0, 0); m.rotateX(0.32); }
      onFace(g, face, w, d, BOX(aw, 0.18, 0.04, tmat(c1)), 0, h, 0.88);
    }
    if (o.sign) { const s = o.sign, sg = sign(s.text, s.w, s.h, s); onFace(g, face, w, d, sg, s.u || 0, s.y || h + 0.62, 0.14); if (s.glow) onFace(g, face, w, d, halo(new THREE.Color(s.glowColor || s.fg), s.w * 1.8, 0.55), s.u || 0, s.y || h + 0.62, 0.3); }
  }
  function roofKit(g, w, d, top, o) {
    g.add(BOX(w + 0.1, 0.12, d + 0.1, tmat(P.roofc), 0, top + 0.06, 0));
    for (const [bx, bz, bw, bd] of [[0, d / 2, w + 0.1, 0.18], [0, -d / 2, w + 0.1, 0.18], [w / 2, 0, 0.18, d], [-w / 2, 0, 0.18, d]]) g.add(BOX(bw, 0.34, bd, tmat(sh(o.body, 0.92)), bx, top + 0.25, bz));
    const hx = (rnd() - 0.5) * (w - 1.4), hz = -d * 0.2; g.add(BOX(0.7, 0.36, 0.5, tmat(0xd4d0d6), hx, top + 0.42, hz)); g.add(CYL(0.16, 0.16, 0.08, tmat(0x6a6672), hx, top + 0.62, hz, 10));
    if (o.tank) { const tx = w * 0.22, tz = -d * 0.18; g.add(CYL(0.42, 0.42, 0.7, tmat(0xb48a62), tx, top + 0.7, tz, 10)); g.add(M(new THREE.ConeGeometry(0.48, 0.3, 10), tmat(0x7a6a5a), tx, top + 1.2, tz)); for (const s of [-1, 1]) g.add(BOX(0.05, 0.4, 0.05, tmat(P.trim), tx + s * 0.3, top + 0.3, tz)); }
    if (o.antenna) { g.add(CYL(0.025, 0.04, 1.6, tmat(P.trim), -w * 0.3, top + 0.9, -d * 0.25, 5)); const lamp = SPH(0.07, glowMat(0xff4a5a), -w * 0.3, top + 1.72, -d * 0.25); g.add(lamp); }
    if (o.garden) { g.add(BOX(w * 0.5, 0.12, d * 0.4, tmat(0x6bb36a), w * 0.1, top + 0.18, d * 0.12)); for (let i = 0; i < 5; i++) g.add(SPH(0.16, tmat(P.tree), -w * 0.1 + i * 0.35, top + 0.34, d * 0.12 + (i % 2) * 0.2)); }
  }
  function building(o) {
    const { name, x, z, w, d, floors, fh = 1.5, body, shop = null, shopSide = null, balcony = false, roof = {} } = o;
    const g = new THREE.Group(), specs = [], bal = new THREE.Group(); g.position.set(x, 0, z);
    const sh0 = shop ? (shop.h || 2.1) + 0.2 : fh, H = sh0 + floors * fh;
    { const bd = cbox(w, H, d, body, 2.2); bd.position.y = H / 2; g.add(bd); }
    g.add(BOX(w + 0.12, 0.14, d + 0.12, tmat(P.trim), 0, 0.07, 0)); if (shop) g.add(BOX(w + 0.08, 0.1, d + 0.08, tmat(P.trim), 0, sh0, 0));
    for (const face of ['z', 'x']) {
      if (shop && face === 'z') storefront(g, 'z', w, d, shop); else if (shopSide && face === 'x') storefront(g, 'x', w, d, shopSide); else winGrid(face, w, d, 1, 0.2, fh, specs, bal);
      if (floors > 0) winGrid(face, w, d, floors, sh0 - 0.15, fh, specs, bal, { balcony, pitch: o.pitch });
    }
    g.add(bal); buildWindows(g, w, d, specs); roofKit(g, w, d, H, Object.assign({ body }, roof));
    if (o.vsign) { const v = o.vsign; onFace(g, 'z', w, d, sign(v.text, v.w, v.h, v), v.u, v.y, 0.3); if (v.glow) onFace(g, 'z', w, d, halo(new THREE.Color(v.glowColor || v.fg), v.h * 2.4, 0.5), v.u, v.y, 0.4); }
    world.add(g); g.updateMatrixWorld(true); occluders.push({ g, min: 0.12 }); block(x, z, w / 2 + 0.02, d / 2 + 0.02);
    CITY.buildings.push({ name, x, z, w, d, color: '#' + new THREE.Color(body).getHexString() }); return g;
  }

  // a plain house: one door, everyone finds their own Home behind it (docs/game/world.md)
  function house(o) {
    const { name, x, z, w, d, h = 2.5, body, roofC = 0xc4604a, doorU = 0.55 } = o;
    const g = new THREE.Group(), specs = []; g.position.set(x, 0, z);
    { const bd = cbox(w, h, d, body, 2.0); bd.position.y = h / 2; g.add(bd); }
    g.add(BOX(w + 0.12, 0.14, d + 0.12, tmat(P.trim), 0, 0.07, 0)); g.add(BOX(w + 0.5, 0.08, d + 0.5, tmat(P.trim), 0, h + 0.04, 0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4), tmat(roofC)); roof.rotation.y = Math.PI / 4; roof.scale.set(w + 0.5, 1.15, d + 0.5); roof.position.y = h + 0.08 + 0.575; roof.castShadow = roof.receiveShadow = true; g.add(roof);
    g.add(BOX(0.36, 0.9, 0.36, tmat(0x9a5a4a), w * 0.24, h + 0.85, -d * 0.18));
    onFace(g, 'z', w, d, BOX(1.1, 1.85, 0.07, tmat(P.trim)), doorU, 0.93, 0.03); onFace(g, 'z', w, d, BOX(0.9, 1.72, 0.1, tmat(o.doorColor ?? 0x2f6a5c)), doorU, 0.87, 0.07); onFace(g, 'z', w, d, SPH(0.05, tmat(0xf0d070)), doorU + 0.3, 0.9, 0.14);
    onFace(g, 'z', w, d, BOX(1.3, 0.1, 0.5, tmat(P.curb)), doorU, 0.05, 0.3);
    onFace(g, 'z', w, d, sign('HOME', 0.9, 0.3, { fg: '#fff3da', bg: '#7a4a3a', px: 58, font: '"Fredoka", sans-serif' }), doorU, 2.2, 0.06);
    const wl = (face, u) => specs.push({ face, u, y: 1.3, ww: 0.8, wh: 0.8 });
    wl('z', -0.62); wl('x', 0);
    buildWindows(g, w, d, specs);
    world.add(g); g.updateMatrixWorld(true); occluders.push({ g, min: 0.12 }); block(x, z, w / 2 + 0.02, d / 2 + 0.02);
    CITY.buildings.push({ name, x, z, w, d, color: '#' + new THREE.Color(body).getHexString() });
    CITY.doors.home = { x: x + doorU, z: z + d / 2 + 0.4, out: z + d / 2 + 0.7, label: 'Enter your Home' };
    return g;
  }

  // ---------- street furniture (each registers its walking blocker)
  function lamp(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(CYL(0.1, 0.13, 0.25, tmat(P.trim), 0, 0.12, 0, 8)); g.add(CYL(0.045, 0.06, 3.6, tmat(P.trim), 0, 1.9, 0, 6));
    g.add(BOX(0.7, 0.05, 0.05, tmat(P.trim), 0.3, 3.7, 0)); g.add(BOX(0.5, 0.08, 0.26, tmat(0xf0f0f0), 0.55, 3.66, 0)); g.add(BOX(0.44, 0.03, 0.2, glowMat(0xfff2c8), 0.55, 3.6, 0));
    const hs = halo(0xffc080, 1.7, 0.5); hs.position.set(0.55, 3.4, 0); g.add(hs); const l = plight(0xffc080, 0.4, 7, 0.55, 3.2, 0); g.add(l);
    world.add(g); block(x, z, 0.14, 0.14);
  }
  function tree(x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    { const pb = cbox(0.9, 0.36, 0.9, sh(P.curb, 0.92), 1); pb.position.y = 0.18; g.add(pb); } g.add(BOX(0.74, 0.06, 0.74, tmat(0x5a4636), 0, 0.37, 0)); g.add(CYL(0.07, 0.1, 1.3, tmat(0x6a4c3a), 0, 1.0, 0, 6));
    for (const [dx, dy, dz, r] of [[0, 2.0, 0, 0.8], [0.45, 1.75, 0.1, 0.55], [-0.4, 1.8, -0.1, 0.58], [0.05, 2.55, 0.05, 0.5]]) g.add(ICO(r, tmat(P.tree, { em: 0.18 }), dx, dy, dz, 1));
    world.add(g); g.updateMatrixWorld(true); occluders.push({ g, min: 0.3 }); block(x, z, 0.4 * s, 0.4 * s);
  }
  function bench(x, z, rot) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    g.add(BOX(1.4, 0.07, 0.42, tmat(0xc89868), 0, 0.46, 0)); g.add(BOX(1.4, 0.34, 0.06, tmat(0xb8885a), 0, 0.72, -0.2)); for (const s of [-1, 1]) g.add(BOX(0.07, 0.46, 0.4, tmat(P.trim), s * 0.6, 0.23, 0));
    world.add(g); const q = Math.abs(Math.sin(rot)) > 0.5; block(x, z, q ? 0.28 : 0.72, q ? 0.72 : 0.28);
  }
  function bin(x, z, c = 0x4a8a78) { world.add(CYL(0.2, 0.17, 0.7, tmat(c), x, 0.35, z, 8)); world.add(CYL(0.21, 0.21, 0.06, tmat(sh(c, 0.7)), x, 0.72, z, 8)); block(x, z, 0.22, 0.22); }
  function bollards(x0, z0, x1, z1, n) { for (let i = 0; i < n; i++) world.add(CYL(0.08, 0.08, 0.55, tmat(0xe8e0d4), x0 + (x1 - x0) * i / (n - 1), 0.28, z0 + (z1 - z0) * i / (n - 1), 8)); }
  function busStop(x, z, rot) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    g.add(BOX(2.2, 0.08, 1.0, tmat(P.trim), 0, 2.15, 0)); for (const s of [-1, 1]) g.add(BOX(0.06, 2.1, 0.06, tmat(P.trim), s * 1.05, 1.05, -0.42));
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.7), new THREE.MeshBasicMaterial({ color: 0x9ccdf2, transparent: true, opacity: 0.38, side: THREE.DoubleSide })).translateY(1.2).translateZ(-0.42));
    g.add(BOX(1.6, 0.06, 0.4, tmat(0xe0b878), 0, 0.5, -0.2)); g.add(BOX(0.7, 1.2, 0.08, glowMat(0xffffff), 1.35, 1.2, 0));
    const sg = sign('BUS 7', 0.6, 0.3, { fg: '#2a2a4a', bg: '#ffd84a', px: 60, font: '"Fredoka", sans-serif' }); sg.position.set(-1.3, 2.6, 0.1); g.add(sg); g.add(CYL(0.03, 0.03, 2.4, tmat(P.trim), -1.3, 1.2, 0.1, 5));
    world.add(g); block(x, z, 1.1, 0.5);
  }
  function car(x, z, rot, color) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    g.add(BOX(2.0, 0.5, 0.95, tmat(color, { em: 0.2 }), 0, 0.46, 0)); g.add(BOX(1.1, 0.42, 0.85, tmat(color, { em: 0.2 }), -0.1, 0.9, 0)); g.add(BOX(1.0, 0.3, 0.86, glowMat(0x9ccdf2), -0.1, 0.92, 0));
    for (const [wx, wz] of [[-0.62, 0.45], [0.62, 0.45], [-0.62, -0.45], [0.62, -0.45]]) { const w = CYL(0.22, 0.22, 0.16, tmat(0x2a2630), wx, 0.22, wz, 10); w.rotation.x = Math.PI / 2; g.add(w); }
    for (const s of [-1, 1]) g.add(BOX(0.05, 0.12, 0.2, glowMat(0xfff2c8), 1.0, 0.5, s * 0.3));
    world.add(g); const q = Math.abs(Math.sin(rot)) > 0.5; block(x, z, q ? 0.5 : 1.0, q ? 1.0 : 0.5);
  }
  function scooters(x, z, rot) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; for (let i = 0; i < 3; i++) { g.add(BOX(0.08, 0.7, 0.4, tmat(i % 2 ? 0x5ad6c0 : 0xff7aa8), i * 0.4, 0.5, 0)); g.add(BOX(0.4, 0.05, 0.14, tmat(P.trim), i * 0.4, 0.2, 0)); } world.add(g); block(x + 0.4, z, 0.6, 0.25); }
  function planter(x, z, w = 1.4) { const pb = cbox(w, 0.5, 0.6, sh(P.curb, 0.95), 1); pb.position.set(x, 0.25, z); world.add(pb); for (let i = 0; i < 5; i++) world.add(SPH(0.17, tmat([0xff8ab0, 0xffd84a, 0xb08aff, 0xffffff, 0x7ad8ff][i], { em: 0.4 }), x - w / 2 + 0.2 + i * (w - 0.4) / 4, 0.62, z + (i % 2 ? 0.08 : -0.08))); block(x, z, w / 2, 0.3); }

  // ---------- ground: slab, road, sidewalks, markings
  const RW = CITY.road;
  {
    const slab = cbox(HALF * 2, 1.3, HALF * 2, P.slab, 3); slab.position.y = -0.65; world.add(slab);
    const under = M(new THREE.CylinderGeometry(HALF * 1.15, HALF * 0.35, 5.4, 4, 1), tmat(sh(P.slab, 0.55), { tex: TEX.rock, noCache: true }), 0, -3.9, 0); under.rotation.y = Math.PI / 4; world.add(under);
    const rd = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), tmat(P.road, { tex: TXT.asphalt, noCache: true })); rd.rotation.x = -Math.PI / 2; rd.receiveShadow = true; rd.position.y = 0.005; world.add(rd);
    const walkM = tmat(P.walk, { tex: TXT.tiles, noCache: true, em: 0.1 }), curbM = tmat(P.curb);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const w = HALF - RW, cx = sx * (RW + HALF) / 2, cz = sz * (RW + HALF) / 2; world.add(BOX(w, 0.06, w, walkM, cx, 0.03, cz));
      world.add(BOX(0.12, 0.07, w, curbM, sx * (RW + 0.04), 0.035, cz)); world.add(BOX(w, 0.07, 0.12, curbM, cx, 0.035, sz * (RW + 0.04)));
    }
    const white = new THREE.MeshBasicMaterial({ color: 0xf4f0e8 }), yel = new THREE.MeshBasicMaterial({ color: 0xf2c84a });
    const bar = (x, z, w, d, m = white) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); b.rotation.x = -Math.PI / 2; b.position.set(x, 0.012, z); world.add(b); };
    for (let i = 0; i < Math.floor((HALF * 2 - 1.8) / 2.2) + 1; i++) { const t = -HALF + 0.9 + i * 2.2; if (Math.abs(t) > 2.3) { bar(t, 0, 1.0, 0.1, yel); bar(0, t, 0.1, 1.0, yel); } }
    for (let i = -3; i <= 3; i++) for (const s of [-1, 1]) { bar(i * 0.3, s * (RW + 0.9), 0.16, 0.8); bar(s * (RW + 0.9), i * 0.3, 0.8, 0.16); }
  }

  // ---------- the district
  building({ name: 'Chog Hotel', x: -4.8, z: -4.8, w: 3.6, d: 3.4, floors: 5, fh: 1.45, body: F[0], balcony: true, pitch: 1.2, roof: { tank: true, antenna: true, garden: true },
    shop: { h: 2.1, door: 0.0, doorColor: 0x4a8a78, in1: '#fff0c8', in2: '#f0b878', sign: { text: 'CHOG HOTEL', w: 2.6, h: 0.42, fg: '#3a2f4a', bg: '#fff6e0', px: 54, font: '"Fredoka", sans-serif', y: 2.5 } } });
  building({ name: 'NOVA Club', x: 4.75, z: -4.7, w: 3.8, d: 3.4, floors: 2, fh: 1.6, body: F[1], roof: { antenna: true },
    shop: { h: 2.2, door: -0.9, doorColor: 0x1a1030, in1: '#ff9ad8', in2: '#6a3aa0', sign: { text: 'NOVA', w: 2.0, h: 0.62, fg: '#ff5ab8', glow: '#ff2a98', px: 78, y: 3.0, glowColor: 0xff3aa8 } },
    vsign: { text: 'CLUB', w: 0.7, h: 2.4, fg: '#7ae8ff', glow: '#2ad8ff', px: 70, u: 1.5, y: 4.4, glowColor: 0x3ad8ff }, shopSide: { h: 2.2, in1: '#8a5ad8', in2: '#3a1a70' } });
  building({ name: 'Moka & Co', x: -4.7, z: 4.7, w: 3.6, d: 3.2, floors: 1, fh: 1.5, body: F[3], roof: { tank: true },
    shop: { h: 2.1, door: 1.1, doorColor: 0x2f6a5c, awning: [0xf4a9b4, 0xffffff], sign: { text: 'Moka & Co', w: 2.2, h: 0.5, fg: '#fff3da', bg: '#3a6a5c', px: 52, font: '"Fredoka", sans-serif', y: 3.05 } },
    shopSide: { h: 2.1, awning: [0xf4a9b4, 0xffffff], in1: '#ffe9c0', in2: '#e8b078' } });
  building({ name: 'Arcade', x: 4.8, z: 4.7, w: 3.6, d: 3.2, floors: 1, fh: 1.5, body: F[2], roof: { antenna: true },
    shop: { h: 2.1, door: -0.8, doorColor: 0x2a2a50, in1: '#b6a0ff', in2: '#5a3ac0', sign: { text: 'ARCADE', w: 2.4, h: 0.62, fg: '#ffe24a', bg: '#2a2050', glow: '#ffb02a', px: 74, y: 2.95, glowColor: 0xffc23a } },
    shopSide: { h: 2.1, in1: '#9ad8ff', in2: '#4a7ad8', awning: [0xffe24a, 0x2a2050] } });
  building({ name: 'Gallery', x: 0, z: -6.5, w: 3.6, d: 2.0, floors: 1, fh: 1.9, body: 0xf8f4ee, roof: { garden: true },
    shop: { h: 2.4, door: 1.2, doorColor: 0xd8d0c4, in1: '#fffaf0', in2: '#efe2d0', sign: { text: 'GALLERY', w: 2.0, h: 0.4, fg: '#2a2630', px: 46, font: '"Fredoka", sans-serif', y: 2.85 } } });

  CITY.doors.hotel = { x: -4.8, z: -2.75, out: -2.4, label: 'Chog Hotel opens soon' };
  house({ name: 'Home', x: 8.5, z: 7.1, w: 2.6, d: 2.4, body: F[5], doorColor: 0x2f6a5c });      // in front of everything (nearest to the camera) so no building hides it
  planter(6.7, 8.4, 1.0);
  for (const [x, z] of [[-1.85, -1.85], [1.85, -1.85], [-1.85, 1.85], [1.85, 1.85]]) lamp(x, z);
  for (const [x, z] of [[-2.5, HALF - 0.8], [2.5, HALF - 0.8], [-HALF + 0.8, 2.5], [HALF - 0.8, 2.5], [HALF - 0.8, -2.5], [-HALF + 0.8, -2.5], [-HALF + 0.8, -7.4], [-6.9, -HALF + 0.8]]) tree(x, z, 0.95);
  tree(-2.1, 4.6, 0.9); tree(2.1, 4.6, 0.9); tree(-2.1, -4.4, 0.9); tree(2.1, -3.4, 0.9);
  bench(-2.1, 3.1, Math.PI / 2); bench(2.15, 5.9, -Math.PI / 2); bench(3.4, 2.15, Math.PI); bench(-3.6, -2.15, 0);   // the seat faces the road (local +z), the back leans on the shops
  bin(5.4, 2.0); bin(-2.3, -2.3, 0x5a6ad0); bin(2.9, -2.2, 0x4a8a78);
  busStop(-4.0, 2.4, Math.PI); scooters(5.8, 1.9, 0); scooters(-6.4, -1.9, Math.PI);
  car(-5.0, 0.95, 0, 0xff7a6a); car(4.2, -0.95, Math.PI, 0x5ad6c0); car(0.95, 5.6, Math.PI / 2, 0xffd84a);
  planter(5.0, 2.45); planter(-6.0, -2.4, 1.6);
  bollards(-1.4, HALF - 0.5, 1.4, HALF - 0.5, 5); bollards(HALF - 0.5, -1.2, HALF - 0.5, 1.2, 4); bollards(-HALF + 0.5, -1.2, -HALF + 0.5, 1.2, 4);
  {                                                                                       // the town's bulletin pylon, glowing at night
    const g = new THREE.Group(); g.position.set(5.3, 0, -2.25); { const pb = cbox(1.3, 0.24, 1.3, P.curb, 1); pb.position.y = 0.12; g.add(pb); }
    g.add(CYL(0.4, 0.44, 0.5, tmat(P.trim), 0, 0.38, 0, 14)); g.add(CYL(0.32, 0.32, 2.4, tmat(0xfdfaf2, { em: 0.2 }), 0, 1.65, 0, 14));
    const scr = sign('CHOG\nTOWN', 0.8, 1.3, { fg: '#ffffff', bg: '#7a3ac8', px: 84, font: '"Bungee", sans-serif', glow: '#ff6ad8' }); scr.position.set(0, 2.0, 0.33); g.add(scr);
    const scr2 = scr.clone(); scr2.position.set(0.33, 2.0, 0); scr2.rotation.y = Math.PI / 2; g.add(scr2);
    const hs = halo(0xc07aff, 4, 0.4); hs.position.set(0, 2.0, 0.6); g.add(hs); g.add(CYL(0.36, 0.36, 0.14, tmat(P.trim), 0, 2.95, 0, 14)); world.add(g); block(5.3, -2.25, 0.55, 0.55);
  }
  world.add(plight(0xff3aa8, 0.9, 7, 4.2, 2.2, -2.4)); world.add(plight(0x3ad8ff, 0.7, 7, -4.4, 2.2, 2.4)); world.add(plight(0xffc23a, 0.8, 7, 4.4, 2.2, 2.6));   // colour pools from the neon

  // residents (NPC) are built by npc.js: schedules by the real clock, not fixed spots
  sun.shadow.camera.left = sun.shadow.camera.bottom = -20; sun.shadow.camera.right = sun.shadow.camera.top = 20; sun.shadow.camera.far = 70; sun.shadow.camera.updateProjectionMatrix();
})();
scene.traverse(o => { if (o.userData && (o.userData.isHull || o.userData.noNormal)) hiddenInNormal.push(o); });
const CITY_NODES = world.children.slice();                     // the whole district (buildings, props, residents, lights): rooms hide these while you are inside (room.js)
