// ===== space: data-driven rooms and venues =====
// ONE art style for the whole game: the render pipeline is fixed and nothing in a space can change it. Creators get freedom in CONTENT:
// themed asset kits (modern, cyberpunk, retro, space, halloween ...), wallpapers, floors, backgrounds, text, their own shapes, NFT frames.
// A space is a JSON document: { name, theme, ambience, wall?, floor?, pieces:[{p, x, z, y?, ry?, c?, k?, txt?, img?}], custom? }.
// A piece is a list of primitive parts, and stock furniture, theme kits and creator-made pieces all use the SAME format, so there is no code to trust:
//   part = { t:'box'|'cyl'|'sph'|'cone'|'tor'|'plane'|'text'|'img'|'light', s:[size...], p:[x,y,z], r:[rx,ry,rz] (degrees), c:'$token'|'#rrggbb', e:1 (glows), o:opacity,
//            k:[sx,sy,sz] (scale), g:size (soft halo), a:'spin'|'bob'|'blink'|'pulse', txt:'..', edit:true (text/image taken from the placed item), i/d (light) }
// Colour tokens ($wall, $accent ...) resolve against the theme palette, so one piece looks right in every theme. See docs/game/spaces.md.
// Loaded after core.js (needs scene, lights, cam). Themes, ambiences and the catalog live in space_data.js.
const SPACE = { THEMES: {}, AMBIENCE: {}, PIECES: {}, LAYOUTS: {}, group: null, doc: null, theme: null, placed: [], lights: [], limits: { parts: 48, pieces: 400, lights: 10, scale: [0.4, 3] } };
(function () {
  const rad = d => d * Math.PI / 180, clampN = (v, a, b) => Math.max(a, Math.min(b, +v || 0));
  const colorOf = (c, pal) => typeof c === 'number' ? c : typeof c === 'string' ? (c[0] === '$' ? (pal[c.slice(1)] ?? 0xff00ff) : parseInt(c.slice(1), 16) || 0) : 0xcccccc;
  const hexOf = (c, pal) => '#' + new THREE.Color(colorOf(c, pal)).getHexString();

  // ---- text (canvas), redrawn once web fonts are in
  const SIGNS = [];
  function textMesh(txt, w, h, col, bg, glow, font) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.max(32, Math.round(512 * h / w));
    const draw = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height); }
      let px = Math.min(cv.height * 0.72, 120); const f = () => `${px}px ${font || '"Bungee", "Fredoka", sans-serif'}`; g.font = f(); const T = String(txt).slice(0, 24);
      while (g.measureText(T).width > cv.width * 0.94 && px > 16) { px -= 4; g.font = f(); }                       // long text shrinks to fit
      g.textAlign = 'center'; g.textBaseline = 'middle'; if (glow) { g.shadowColor = glow; g.shadowBlur = 18; }
      g.fillStyle = col; g.fillText(T, cv.width / 2, cv.height / 2 + 2); if (glow) g.fillText(T, cv.width / 2, cv.height / 2 + 2); };
    draw(); const tex = new THREE.CanvasTexture(cv); SIGNS.push(() => { draw(); tex.needsUpdate = true; });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !bg, side: THREE.DoubleSide }));
  }
  if (document.fonts) Promise.all(['64px "Bungee"', '700 48px "Fredoka"'].map(f => document.fonts.load(f))).then(() => SIGNS.forEach(f => f())).catch(() => { });

  // ---- images (NFT frames). Only URLs the page itself provides are loaded; in the game they come through the server's image proxy (see docs/game/spaces.md)
  const loader = new THREE.TextureLoader();
  function imgMesh(w, h, url) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x8a86a0, transparent: true, side: THREE.DoubleSide }), m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    if (url) loader.load(url, t => { t.minFilter = THREE.LinearFilter; mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; });
    return m;
  }

  // ---- the part interpreter: numbers are clamped, counts capped, nothing else is read from the document
  const anims = [];                                                  // animations of the room shell (scenery); every placed piece carries its own list
  function buildParts(parts, pal, lightsOut, opts = {}) {
    const g = new THREE.Group(), animOut = opts.anims || anims;
    for (const p of (parts || []).slice(0, SPACE.limits.parts)) {
      const col = colorOf(p.c, pal), s = (p.s || []).map(v => clampN(v, 0.001, 40)), glow = p.e > 0, op = p.o === undefined ? 1 : clampN(p.o, 0, 1);
      const mat = glow || p.t === 'plane' && p.e ? new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op, side: THREE.DoubleSide, wireframe: !!p.w }) : tmat(col, { em: p.m ?? 0.13, ds: p.t === 'plane' });
      let m;
      switch (p.t) {
        case 'box': m = BOX(s[0] || 1, s[1] || 1, s[2] || 1, mat); break;
        case 'cyl': m = CYL(s[0] ?? 0.5, s[1] ?? s[0] ?? 0.5, s[2] || 1, mat, 0, 0, 0, Math.round(clampN(s[3] || 12, 3, 24))); break;
        case 'sph': m = SPH(s[0] || 0.5, mat); break;
        case 'cone': m = M(new THREE.ConeGeometry(s[0] || 0.5, s[1] || 1, Math.round(clampN(s[2] || 10, 3, 24))), mat); break;
        case 'tor': m = M(new THREE.TorusGeometry(s[0] || 0.5, s[1] || 0.1, 8, 20), mat); break;
        case 'plane': m = M(new THREE.PlaneGeometry(s[0] || 1, s[1] || 1), mat, 0, 0, 0, false, false); break;
        case 'text': m = textMesh((p.edit && opts.txt) || p.txt || 'HI', s[0] || 1, s[1] || 0.3, hexOf(opts.tint && p.edit ? opts.tint : p.c, pal), p.bg ? hexOf(p.bg, pal) : null, p.glow ? hexOf(opts.tint && p.edit ? opts.tint : p.glow, pal) : null, p.font); break;
        case 'img': m = imgMesh(s[0] || 1, s[1] || 1, p.edit ? opts.img : null); break;
        case 'light': if (lightsOut && (opts.lightCount ? opts.lightCount() : lightsOut.length) < SPACE.limits.lights) { const l = new THREE.PointLight(col, clampN(p.i ?? 0.6, 0, 2), clampN(p.d ?? 5, 1, 12), 1.8); l.position.set(...(p.p || [0, 0, 0]).map(Number)); g.add(l); lightsOut.push(l); } continue;
        default: continue;
      }
      if (p.k) m.scale.set(...p.k.map(v => clampN(v, 0.05, 20)));
      m.position.set(...(p.p || [0, 0, 0]).map(v => clampN(v, -40, 40))); if (p.r) m.rotation.set(rad(p.r[0] || 0), rad(p.r[1] || 0), rad(p.r[2] || 0));
      if (glow) m.castShadow = false;
      g.add(m);
      if (p.g) { const h = glowSprite(col, clampN(p.g, 0.2, 8), 0.55); h.position.copy(m.position); g.add(h); noNormalPass.push(h); }
      if (p.a) { const base = { y: m.position.y, sx: m.scale.x, sy: m.scale.y, sz: m.scale.z, o: mat.opacity }, ph = Math.random() * 6; animOut.push((t) => {
        if (p.a === 'spin') m.rotation.y = t * 0.8 + ph; else if (p.a === 'bob') m.position.y = base.y + Math.sin(t * 1.6 + ph) * 0.12;
        else if (p.a === 'blink') mat.opacity = base.o * (Math.sin(t * 5 + ph * 9) > 0.2 ? 1 : 0.25), mat.transparent = true; else if (p.a === 'pulse') m.scale.set(base.sx * (1 + Math.sin(t * 3 + ph) * 0.08), base.sy * (1 + Math.sin(t * 3 + ph) * 0.08), base.sz * (1 + Math.sin(t * 3 + ph) * 0.08)); }); }
    }
    return g;
  }
  SPACE.buildParts = buildParts;

  // ---- wall and floor patterns: neutral maps tinted by the chosen colour (the colour is free, the pattern comes from the list)
  const TEXS = {}, tex = (key, w, h, fn, rx = 1, ry = 1) => (TEXS[key] = TEXS[key] || paint(w, h, fn, rx, ry));
  const R = Math.random, fill = (g, w, h, c = '#f0f0f0') => { g.fillStyle = c; g.fillRect(0, 0, w, h); };
  const FLOOR = {
    plain: () => tex('f_plain', 16, 16, g => fill(g, 16, 16, '#f4f4f4')),
    wood: () => tex('f_wood', 128, 128, (g, w, h) => { fill(g, w, h, '#e8e8e8'); for (let y = 0; y < h; y += 16) { g.fillStyle = `rgba(0,0,0,${0.05 + (y / 16 % 2) * 0.05})`; g.fillRect(0, y, w, 15); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y + 15, w, 1); for (let i = 0; i < 3; i++) g.fillRect((y * 7 + i * 41) % w, y, 1, 15); } }, 4, 3),
    boards: () => tex('f_boards', 128, 128, (g, w, h) => { fill(g, w, h, '#d8d8d8'); for (let x = 0; x < w; x += 21) { g.fillStyle = `rgba(0,0,0,${0.08 + ((x / 21) % 3) * 0.05})`; g.fillRect(x, 0, 20, h); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 20, 0, 1, h); } for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(R() * w, R() * h, 1, 5); } }, 3, 3),
    tiles: () => tex('f_tiles', 128, 128, (g, w, h) => { fill(g, w, h); g.strokeStyle = 'rgba(60,60,80,.35)'; g.lineWidth = 2; for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, 5, 4),
    checker: () => tex('f_check', 64, 64, (g, w, h) => { fill(g, w, h, '#ffffff'); g.fillStyle = '#4a4a5a'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); }, 5, 4),
    grid: () => tex('f_grid', 128, 128, (g, w, h) => { fill(g, w, h, '#4a3a8a'); g.strokeStyle = '#8affff'; g.lineWidth = 3; g.shadowColor = '#5ae8ff'; g.shadowBlur = 6; g.strokeRect(1, 1, w - 2, h - 2); }, 9, 7),
    metal: () => tex('f_metal', 128, 128, (g, w, h) => { fill(g, w, h, '#dcdce4'); g.strokeStyle = 'rgba(20,20,40,.55)'; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4); for (const [x, y] of [[10, 10], [118, 10], [10, 118], [118, 118]]) { g.fillStyle = 'rgba(20,20,40,.5)'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(6, 6, 116, 8); }, 4, 3),
    herringbone: () => tex('f_herring', 64, 64, (g, w, h) => { fill(g, w, h, '#e6e6e6'); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; for (let i = -64; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke(); } }, 4, 3),
    terrazzo: () => tex('f_terr', 128, 128, (g, w, h) => { fill(g, w, h, '#eeeeee'); for (let i = 0; i < 90; i++) { const v = 80 + R() * 160 | 0; g.fillStyle = `rgba(${v},${v},${v},.7)`; g.beginPath(); g.ellipse(R() * w, R() * h, 2 + R() * 5, 1.5 + R() * 3, R() * 3, 0, 7); g.fill(); } }, 4, 3),
    carpet: () => tex('f_carpet', 64, 64, (g, w, h) => { fill(g, w, h, '#e4e4e4'); for (let i = 0; i < 700; i++) { const v = 190 + R() * 60 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(R() * w, R() * h, 2, 2); } }, 6, 5),
    dots: () => tex('f_dots', 64, 64, (g, w, h) => { fill(g, w, h, '#f2f2f2'); g.fillStyle = 'rgba(0,0,0,.22)'; for (const [x, y] of [[16, 16], [48, 48], [48, 16], [16, 48]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); } }, 6, 5),
  };
  const WALL = {
    plain: () => tex('w_plain', 16, 16, g => fill(g, 16, 16, '#f6f6f6')),
    plaster: () => tex('w_plaster', 64, 64, (g, w, h) => { fill(g, w, h, '#f2f2f2'); for (let i = 0; i < 160; i++) { const v = 215 + R() * 35 | 0; g.fillStyle = `rgba(${v},${v},${v},.6)`; g.fillRect(R() * w, R() * h, 3, 3); } }, 4, 2),
    panels: () => tex('w_panels', 64, 64, (g, w, h) => { fill(g, w, h, '#e4e4ec'); g.strokeStyle = 'rgba(10,10,30,.55)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(4, 4, w - 8, 6); g.fillStyle = 'rgba(10,10,30,.4)'; g.fillRect(4, h - 10, w - 8, 3); }, 5, 3),
    brick: () => tex('w_brick', 64, 64, (g, w, h) => { fill(g, w, h, '#d6d6d6'); for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 16) { const ox = (y / 8) % 2 ? 8 : 0, v = 190 + R() * 60 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x + ox, y, 15, 7); } }, 5, 3),
    stripes: () => tex('w_stripes', 64, 64, (g, w, h) => { fill(g, w, h, '#ffffff'); g.fillStyle = 'rgba(0,0,0,.14)'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 8, h); }, 6, 1),
    planks: () => tex('w_planks', 64, 64, (g, w, h) => { fill(g, w, h, '#d0d0d0'); for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, 0, 1, h); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(x + 2 + R() * 12, R() * h, 1, 8); } } }, 5, 2),
    dots: () => tex('w_dots', 64, 64, (g, w, h) => { fill(g, w, h, '#f4f4f4'); g.fillStyle = 'rgba(0,0,0,.14)'; for (const [x, y] of [[16, 16], [48, 48], [48, 16], [16, 48]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); } }, 7, 4),
    zigzag: () => tex('w_zig', 64, 64, (g, w, h) => { fill(g, w, h, '#f6f6f6'); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 4; for (let y = 8; y < h; y += 20) { g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + (x / 16 % 2 ? 8 : 0)); g.stroke(); } }, 6, 4),
    diamonds: () => tex('w_dia', 64, 64, (g, w, h) => { fill(g, w, h, '#f2f2f2'); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 2); g.lineTo(62, 32); g.lineTo(32, 62); g.lineTo(2, 32); g.closePath(); g.stroke(); g.fillStyle = 'rgba(0,0,0,.08)'; g.fill(); }, 6, 4),
    subway: () => tex('w_subway', 64, 64, (g, w, h) => { fill(g, w, h, '#f8f8f8'); g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 2; for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 32) { const ox = (y / 16) % 2 ? 16 : 0; g.strokeRect(x + ox, y, 32, 16); } }, 8, 5),
    wainscot: () => tex('w_wain', 64, 64, (g, w, h) => { fill(g, w, h, '#f4f4f4'); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 38, w, 26); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 37, w, 2); g.strokeStyle = 'rgba(0,0,0,.2)'; for (let x = 0; x < w; x += 21) g.strokeRect(x + 2, 42, 17, 18); }, 4, 1),
  };
  SPACE.PATTERNS = { wall: Object.keys(WALL), floor: Object.keys(FLOOR) };

  // ---- ambience: the room's light, sky and window colour. Same idea as the town's clock (day / evening / night), NOT an art style: rendering never changes.
  SPACE.size = [9, 7]; SPACE.H = 3.3; SPACE.door = null;
  let stars = null;
  let shellHalos = [];
  const dropHalos = list => { for (const h of list) { const i = noNormalPass.indexOf(h); if (i >= 0) noNormalPass.splice(i, 1); } };
  function clear() {
    if (SPACE.group) { world.remove(SPACE.group); SPACE.group.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); }
    for (const e of SPACE.placed) dropHalos(e.halos); dropHalos(shellHalos); shellHalos = []; SPACE.placed = [];
    anims.length = 0; SPACE.lights = [];
  }
  SPACE.unload = function () {                                       // leave the room: remove everything it added to the scene
    clear(); SPACE.group = null; SPACE.doc = null; if (stars) { cam.remove(stars); stars = null; } SPACE.refreshHidden();
  };
  function applyAmbience(a) {
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    [0, 0.42, 0.78, 1].forEach((s, i) => gr.addColorStop(s, a.sky[i])); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); scene.background = new THREE.CanvasTexture(cv);
    scene.fog.color.set(a.fog); hemi.color.set(a.hemi[0]); hemi.groundColor.set(a.hemi[1]); hemi.intensity = a.hemi[2]; sun.color.set(a.sun[0]); sun.intensity = a.sun[1]; rim.color.set(a.rim[0]); rim.intensity = a.rim[1];
    SUN_OFF.set(...(a.sunOff || [-11, 10, 6])); sunSprites.forEach(([s]) => { s.visible = !!a.sunDisc; if (a.sunDisc) s.material.color.set(a.sunDisc); });
    if (stars) { cam.remove(stars); stars = null; }
    if (a.stars) {
      const sp = []; for (let i = 0; i < a.stars; i++) sp.push((R() - 0.5) * 26 * 1.9, (R() - 0.5) * 14.6, -118);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false, transparent: true, opacity: 0.9, fog: false, depthWrite: false })); stars.userData.noNormal = true; stars.frustumCulled = false; cam.add(stars);
    }
    sun.shadow.camera.left = sun.shadow.camera.bottom = -14; sun.shadow.camera.right = sun.shadow.camera.top = 14; sun.shadow.camera.updateProjectionMatrix();
  }

  // ---- build a space: shell (floor, two back walls, windows, door), pieces, lights, scenery
  SPACE.build = function (doc) {
    clear(); const th = SPACE.THEMES[doc.theme] || SPACE.THEMES.studio, amb = SPACE.AMBIENCE[doc.ambience || 'day'] || SPACE.AMBIENCE.day, pal = th.pal; SPACE.doc = doc; SPACE.theme = th;
    const [W, D] = SPACE.size, H = SPACE.H, grp = new THREE.Group(); SPACE.group = grp; world.add(grp); const sh = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
    applyAmbience(amb);
    // the creator's wall and floor: any colour, a pattern from the list
    const wallC = doc.wall && doc.wall.c !== undefined ? colorOf(doc.wall.c, pal) : pal.wall, wallPat = (doc.wall && WALL[doc.wall.pat]) ? doc.wall.pat : th.wallTex || 'plaster';
    const floorC = doc.floor && doc.floor.c !== undefined ? colorOf(doc.floor.c, pal) : pal.floor, floorPat = (doc.floor && FLOOR[doc.floor.pat]) ? doc.floor.pat : th.floorTex || 'wood';
    const slab = BOX(W + 0.4, 0.7, D + 0.4, tmat(th.slab ?? sh(pal.trim, 1.2)), 0, -0.55, 0); grp.add(slab);
    const under = M(new THREE.CylinderGeometry((W / 2 - 0.1) * Math.SQRT2, 1.0, 3.2, 4, 1), tmat(sh(th.slab ?? pal.trim, 0.6), { tex: TEX.rock, noCache: true }), 0, -2.3, 0); under.rotation.y = Math.PI / 4; under.scale.z = (D + 0.2) / (W + 0.2); grp.add(under);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D), tmat(floorC, { tex: FLOOR[floorPat](), noCache: true, em: th.floorEm ?? 0.14 })); floor.position.y = -0.06; floor.receiveShadow = true; grp.add(floor);
    const wallM = () => tmat(wallC, { tex: WALL[wallPat](), noCache: true, em: th.wallEm ?? 0.14 });
    const wz = new THREE.Mesh(new THREE.BoxGeometry(W + 0.25, H, 0.25), wallM()); wz.position.set(-0.125, H / 2, -D / 2 - 0.125); wz.castShadow = wz.receiveShadow = true; grp.add(wz);
    const wx = new THREE.Mesh(new THREE.BoxGeometry(0.25, H, D), wallM()); wx.position.set(-W / 2 - 0.125, H / 2, 0); wx.castShadow = wx.receiveShadow = true; grp.add(wx);
    grp.add(BOX(W, 0.16, 0.06, tmat(pal.trim), 0, 0.08, -D / 2 + 0.03)); grp.add(BOX(0.06, 0.16, D, tmat(pal.trim), -W / 2 + 0.03, 0.08, 0));
    grp.add(BOX(W + 0.25, 0.14, 0.32, tmat(pal.trim), -0.125, H + 0.07, -D / 2 - 0.125)); grp.add(BOX(0.32, 0.14, D, tmat(pal.trim), -W / 2 - 0.125, H + 0.07, 0));
    const onWall = (wall, u, y, mesh, off = 0.02) => { if (wall === 'z') mesh.position.set(u, y, -D / 2 + off); else { mesh.position.set(-W / 2 + off, y, u); mesh.rotation.y = Math.PI / 2; } grp.add(mesh); return mesh; };
    for (const w of doc.windows === false ? [] : th.windows || []) {            // a creator can clear the windows to get free wall space
      const round = w.shape === 'round', gl = new THREE.Mesh(round ? new THREE.CircleGeometry(w.w / 2, 24) : new THREE.PlaneGeometry(w.w, w.h), new THREE.MeshBasicMaterial({ color: amb.window ?? 0xcfe8ff })); onWall(w.wall, w.u, w.y, gl, 0.03);
      if (round) onWall(w.wall, w.u, w.y, M(new THREE.TorusGeometry(w.w / 2, 0.08, 8, 28), tmat(pal.trim)), 0.05);
      else { onWall(w.wall, w.u, w.y + w.h / 2 + 0.05, BOX(w.w + 0.2, 0.1, 0.1, tmat(pal.trim)), 0.05); onWall(w.wall, w.u, w.y - w.h / 2 - 0.05, BOX(w.w + 0.3, 0.12, 0.2, tmat(pal.trim)), 0.08); for (const s of [-1, 1]) onWall(w.wall, w.u + s * (w.w / 2 + 0.05), w.y, BOX(0.1, w.h + 0.2, 0.1, tmat(pal.trim)), 0.05); onWall(w.wall, w.u, w.y, BOX(0.05, w.h, 0.05, tmat(pal.trim)), 0.05); onWall(w.wall, w.u, w.y, BOX(w.w, 0.05, 0.05, tmat(pal.trim)), 0.05); }
    }
    const dr = th.door || { wall: 'z', u: W / 2 - 1.6 }; SPACE.door = dr;
    onWall(dr.wall, dr.u, 1.0, BOX(1.1, 2.0, 0.12, tmat(pal.accent2 ?? pal.accent)), 0.06); onWall(dr.wall, dr.u, 1.0, BOX(1.3, 2.15, 0.08, tmat(pal.trim)), 0.03);
    onWall(dr.wall, dr.u + 0.34, 1.0, SPH(0.06, tmat(0xf0d070)), 0.16); onWall(dr.wall, dr.u, 2.35, textMesh('EXIT', 0.8, 0.22, '#ffffff', null, amb.neon ? '#5ad8ff' : null), 0.1);
    if (th.outside && amb.outside) { const n0 = noNormalPass.length; grp.add(buildParts(th.outside, pal)); shellHalos = noNormalPass.slice(n0); }                       // scenery beyond the window, only when the sky is dark enough to show it
    SPACE.lights = []; for (const l of amb.lights || []) { const L = new THREE.PointLight(l.c, l.i, l.d ?? 8, 1.8); L.position.set(...l.p); grp.add(L); SPACE.lights.push(L); }
    if (amb.neon) for (const l of th.neonLights || []) { const L = new THREE.PointLight(colorOf(l.c, pal), l.i, l.d ?? 8, 1.8); L.position.set(...l.p); grp.add(L); SPACE.lights.push(L); }
    // pieces: any piece in the catalog or in the document's own `custom` table; per item: tint, scale, text, image
    SPACE.placed = [];
    for (const it of (doc.pieces || []).slice(0, SPACE.limits.pieces)) { const e = SPACE.makePiece(it); if (e) SPACE.addEntry(e); }
    SPACE.refreshHidden(); return grp;
  };
  // one placed piece: {it, def, g, anims, halos, lights}. ghost = a preview for an editor (no lights, nothing registered until addEntry)
  SPACE.makePiece = function (it, o = {}) {
    const defs = Object.assign({}, SPACE.PIECES, (SPACE.doc && SPACE.doc.custom) || {}), def = defs[it.p]; if (!def) return null;
    const [W, D] = SPACE.size, pal = SPACE.theme.pal, pc = Object.assign({}, pal), e = { it, def, g: new THREE.Group(), anims: [], halos: [], lights: [] };
    if (it.c) { pc.accent = colorOf(it.c, pal); pc.fabric1 = pc.accent; }
    const n0 = noNormalPass.length;
    e.g.add(buildParts(def.parts, pc, o.ghost ? null : e.lights, { txt: it.txt && String(it.txt), img: it.img, tint: it.c ? colorOf(it.c, pal) : null, anims: e.anims, lightCount: () => SPACE.lights.length + e.lights.length }));
    e.halos = noNormalPass.slice(n0);
    e.g.position.set(clampN(it.x, -W / 2, W / 2), clampN(it.y || 0, 0, 3), clampN(it.z, -D / 2, D / 2)); e.g.rotation.y = rad(it.ry || 0);
    if (it.k) e.g.scale.setScalar(clampN(it.k, SPACE.limits.scale[0], SPACE.limits.scale[1]));
    return e;
  };
  SPACE.addEntry = function (e) { SPACE.group.add(e.g); SPACE.placed.push(e); for (const l of e.lights) SPACE.lights.push(l); return e; };
  SPACE.removeEntry = function (e) {
    const i = SPACE.placed.indexOf(e); if (i >= 0) SPACE.placed.splice(i, 1);
    if (e.g.parent) e.g.parent.remove(e.g); e.g.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); });
    dropHalos(e.halos); for (const l of e.lights) { const k = SPACE.lights.indexOf(l); if (k >= 0) SPACE.lights.splice(k, 1); }
  };
  SPACE.disposeGhost = e => { SPACE.removeEntry(e); };
  SPACE.refreshHidden = () => { hiddenInNormal.length = 0; scene.traverse(o => { if (o.userData && (o.userData.isHull || o.userData.noNormal)) hiddenInNormal.push(o); }); };
  animated.push((t) => { for (const f of anims) f(t); for (const e of SPACE.placed) for (const f of e.anims) f(t); });
})();
