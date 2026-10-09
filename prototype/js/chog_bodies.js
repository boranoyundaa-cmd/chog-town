// ===== the clothing of every Body trait value, one by one (96 values) =====
// The torso gets a painted skin (a canvas wrapped around it: print, stripes, pockets, lapels, zips) plus 3D parts where the art has volume (hoods, collars, armour, capes,
// animal suits). Each value is a row of BODY_LOOK; chog.js reads c (torso colour), long (long sleeves), arm, pants and calls build(). Compared with the art with
// tools/value_sheet.py list|sheet Body. Skin coordinates are metres on the torso: u across (right +), v down from the torso's centre (its top is v = -0.23).
const BODY_PX = 711, BODY_PY = 1113;
const bx = m => 512 + BODY_PX * m, by = m => 256 + BODY_PY * m;
const BODY_FONT = '700 100px "Bungee", "Fredoka", Impact, sans-serif', HAND_FONT = 'italic 700 100px "Fredoka", "Trebuchet MS", sans-serif';
const shade = (c, k) => { const q = new THREE.Color(c).multiplyScalar(k); q.r = Math.min(1, q.r); q.g = Math.min(1, q.g); q.b = Math.min(1, q.b); return hx(q); };
const mixc = (c, d, k) => hx(new THREE.Color(c).lerp(new THREE.Color(d), k));
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const BD = {
  rect(g, c, u0, v0, u1, v1) { g.fillStyle = c; g.fillRect(bx(u0), by(v0), (u1 - u0) * BODY_PX, (v1 - v0) * BODY_PY); },
  poly(g, c, pts, line, lw = 4) { g.beginPath(); pts.forEach(([u, v], i) => i ? g.lineTo(bx(u), by(v)) : g.moveTo(bx(u), by(v))); g.closePath(); if (c) { g.fillStyle = c; g.fill(); } if (line) { g.strokeStyle = line; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); } },
  path(g, c, w, pts, close) { g.beginPath(); pts.forEach(([u, v], i) => i ? g.lineTo(bx(u), by(v)) : g.moveTo(bx(u), by(v))); if (close) g.closePath(); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); },
  disc(g, c, u, v, ru, rv = ru, line, lw = 3) { g.beginPath(); g.ellipse(bx(u), by(v), ru * BODY_PX, rv * BODY_PY, 0, 0, Math.PI * 2); if (c) { g.fillStyle = c; g.fill(); } if (line) { g.strokeStyle = line; g.lineWidth = lw; g.stroke(); } },
  arc(g, c, w, u, v, ru, rv, a0, a1) { g.beginPath(); g.ellipse(bx(u), by(v), ru * BODY_PX, rv * BODY_PY, 0, a0, a1); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.stroke(); },
  text(g, s, u, v, h, c, o = {}) {
    const lines = String(s).split('\n'); g.save(); g.translate(bx(u), by(v)); g.scale(BODY_PX / BODY_PY * (o.sx || 1), 1); if (o.rot) g.rotate(o.rot);
    const px = h * BODY_PY; g.font = (o.font || BODY_FONT).replace(/\d+px/, px + 'px'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    lines.forEach((l, i) => { const y = (i - (lines.length - 1) / 2) * px * (o.lh || 1.05); if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.sw || px * 0.14; g.strokeText(l, 0, y); } g.fillStyle = c; g.fillText(l, 0, y); });
    g.restore();
  },
};
const TXT = (s, u, v, h, c, o) => g => BD.text(g, s, u, v, h, c, o);
const NECK = (g, c, r = 0.085, d = 0.05) => BD.arc(g, c, 9, 0, -0.23, r, d, 0, Math.PI);

// ---- the painted skin: one cached canvas texture per value, wrapped around the torso (8 facets, like the torso itself)
const BODY_SKINS = {};
function bodySkin(key, draw) {
  let s = BODY_SKINS[key]; if (s) return s.mat;
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
  const paintIt = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, 1024, 512); draw(g, BD); tex.needsUpdate = true; };
  paintIt(); if (document.fonts) document.fonts.load('64px "Bungee"').then(paintIt).catch(() => { });
  const mat = new THREE.MeshToonMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, gradientMap: toonGrad4, color: 0x9a9a9a, emissive: 0x161616 });
  s = BODY_SKINS[key] = { mat }; return s.mat;
}
function bodyOverlay(key, draw) {
  const mat = bodySkin(key, draw), m = new THREE.Mesh(new THREE.CylinderGeometry(0.2395, 0.2795, 0.46, 8, 1, true, -Math.PI, Math.PI * 2), mat);
  m.position.y = 0.5; m.userData.noOutline = true; return m;
}
// a repeating pattern wrapped on a 3D part (a cloak's stars, a fur collar's spots)
const BODY_PATTERNS = {};
function bodyPattern(key, w, h, draw, rx = 1, ry = 1) {
  if (BODY_PATTERNS[key]) return BODY_PATTERNS[key];
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return BODY_PATTERNS[key] = new THREE.MeshToonMaterial({ map: t, gradientMap: toonGrad4, color: 0x9a9a9a, emissive: 0x161616, side: THREE.DoubleSide });
}
const add = (parent, geo, c, x = 0, y = 0, z = 0, ds = false) => { const m = cm(geo, c, x, y, z, ds); if (ds) m.userData.noOutline = true; parent.add(m); return m; };      // a double-sided shell takes no ink hull (it would black it out)
const GEO = { sph: (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h), cyl: (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s), box: (w, h, d) => new THREE.BoxGeometry(w, h, d), cone: (r, h, s = 6) => new THREE.ConeGeometry(r, h, s), tor: (r, t, s = 6, n = 14) => new THREE.TorusGeometry(r, t, s, n) };

// ---- 3D parts
function ringAt(body, c, r, tube, y, z = 0, sz = 1) { const m = add(body, GEO.tor(r, tube, 6, 14), c, 0, y, z); m.rotation.x = Math.PI / 2; m.scale.set(1, 1, sz); return m; }
function hoodDown(ctx, c) { ringAt(ctx.body, c, 0.2, 0.07, 0.775, -0.04); const b = add(ctx.body, GEO.sph(0.14, 8, 6), c, 0, 0.74, -0.17); b.scale.set(1.25, 0.8, 0.8); }
function collar(ctx, c, r = 0.2, tube = 0.05, y = 0.75) { ringAt(ctx.body, c, r, tube, y); }
function hairUnder(ctx) { ctx.hairG.children.forEach((m, i) => { if (i) m.visible = false; }); }          // under a hood only the hair mass shows; the blades hide
// a hood that is up: a dome over the head and a back/side shell, a funnel from the shell to the rim (so no gap shows between hood and rim), the rim in front of the face plate,
// and optionally the hair showing at the forehead: a flat piece with a spiky lower edge, built wider than the opening and tucked behind the rim, so it can leave no gap
function hoodUp(ctx, c, s = {}) {
  const head = ctx.head, R = ctx.hasHat ? 0.56 : 0.5, y = 0.06, z = -0.1; hairUnder(ctx); ctx.hairG.scale.setScalar(0.84);         // under a hood the hair mass shrinks so neither it nor its ink hull reaches through the shell
  const top = cm(new THREE.SphereGeometry(R, 16, 8, 0, Math.PI * 2, 0, 1.1), c, 0, y, z, true); top.scale.set(1.04, 1, 1); top.userData.noOutline = true; head.add(top);
  const side = cm(new THREE.SphereGeometry(R, 16, 10, 2.18, 5.06, 1.1, Math.PI - 1.1), c, 0, y, z, true); side.scale.set(1.04, 1, 1); side.userData.noOutline = true; head.add(side);
  const fn = cm(new THREE.CylinderGeometry(0.35, 0.49, 0.42, 28, 1, true), c, 0, -0.03, 0.19, true); fn.rotation.x = Math.PI / 2; fn.scale.set(1, 1, 0.92); fn.userData.noOutline = true; head.add(fn);
  const rim = add(head, GEO.tor(0.35, s.tube ?? 0.02, 6, 26), s.rim ?? shade(c, 1.12), 0, -0.03, 0.4); rim.scale.set(1, 0.92, 1); rim.userData.hullT = 0.02;      // wide enough that the face plate's edge (half-width 0.33 + its hull) hides under the rim: no skin shows between rim and hood
        // in front of the face plate (its front is at z = 0.39), so the plate's edge sits behind the rim, not over it
  if (s.fringe) {
    const hc = new THREE.Color(ctx.o.hair || 0x5b35b0).multiplyScalar(0.95), R2 = 0.345, RY = 0.31, cy = -0.01, y0 = 0.1, a1 = Math.asin((y0 - cy) / RY), sh = new THREE.Shape();
    for (let i = 0; i <= 20; i++) { const a = (Math.PI - a1) - (Math.PI - 2 * a1) * (i / 20), px = R2 * Math.cos(a), py = cy + RY * Math.sin(a); i ? sh.lineTo(px, py) : sh.moveTo(px, py); }
    for (const [px, py] of [[0.2, 0.1], [0.16, 0.035], [0.11, 0.095], [0.05, 0.01], [-0.005, 0.1], [-0.06, 0.03], [-0.115, 0.1], [-0.17, 0.045], [-0.22, 0.1]]) sh.lineTo(px, py);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: hc })); m.position.z = 0.043; m.userData.noOutline = true; ctx.face.add(m);
  }
  return { top, side, rim };
}

// ---- families (each returns a row of BODY_LOOK)
const tee = (c, print, o = {}) => Object.assign({ c, draw: g => { NECK(g, shade(c, 0.78)); BD.rect(g, shade(c, 0.9), -0.3, 0.205, 0.3, 0.23); print && print(g); } }, o);
const tank = (c, print, o = {}) => Object.assign({ c, draw: g => { BD.rect(g, shade(c, 0.86), -0.3, -0.23, -0.2, 0.23); BD.rect(g, shade(c, 0.86), 0.2, -0.23, 0.3, 0.23); NECK(g, shade(c, 0.7), 0.11, 0.09); BD.rect(g, shade(c, 0.9), -0.3, 0.205, 0.3, 0.23); print && print(g); } }, o);
const jersey = (c, trim = '#ffffff', num = '#ffffff') => ({ c, draw: g => {
  BD.rect(g, trim, -0.27, -0.23, -0.21, 0.23); BD.rect(g, trim, 0.21, -0.23, 0.27, 0.23); BD.rect(g, trim, -0.3, 0.2, 0.3, 0.23);
  BD.path(g, trim, 11, [[-0.1, -0.23], [0, -0.12], [0.1, -0.23]]); BD.text(g, '143', 0, 0.06, 0.2, num, { stroke: shade(c, 0.5), sw: 9, sx: 0.9 });
} });
const vest = (c, o = {}) => Object.assign({ c, draw: g => {
  for (const v of [-0.13, -0.03, 0.07, 0.17]) BD.path(g, shade(c, 0.62), 5, [[-0.3, v], [-0.15, v + 0.012], [0, v + 0.018], [0.15, v + 0.012], [0.3, v]]);
  BD.path(g, shade(c, 0.5), 4, [[0, -0.23], [0, 0.23]]); BD.disc(g, shade(c, 1.5), 0.012, -0.17, 0.014, 0.022); BD.rect(g, shade(c, 0.78), -0.3, 0.205, 0.3, 0.23);
}, build: ctx => collar(ctx, c, 0.2, 0.055, 0.76) }, o);
const hoodie = (c, o = {}) => Object.assign({ c, long: true, draw: g => {
  BD.poly(g, shade(c, 0.88), [[-0.15, 0.03], [0.15, 0.03], [0.21, 0.2], [-0.21, 0.2]], shade(c, 0.66), 5);
  for (const sx of [-1, 1]) { BD.path(g, '#f4f0e8', 5, [[sx * 0.045, -0.21], [sx * 0.05, 0.0]]); BD.disc(g, '#f4f0e8', sx * 0.05, 0.015, 0.012, 0.018); }
  BD.rect(g, shade(c, 0.8), -0.3, 0.205, 0.3, 0.23); o.print && o.print(g);
}, build: ctx => { if (!o.up) hoodDown(ctx, c); else hoodUp(ctx, c, { fringe: true }); } }, o);
const track = (c, stripe = '#ffffff', o = {}) => Object.assign({ c, long: true, draw: g => {
  BD.rect(g, shade(c, 0.84), -0.3, -0.23, 0.3, -0.185); BD.rect(g, stripe, -0.3, -0.21, 0.3, -0.195);
  for (const sx of [-1, 1]) { BD.rect(g, stripe, sx * 0.205, -0.23, sx * 0.225, 0.2); BD.rect(g, stripe, sx * 0.235, -0.23, sx * 0.25, 0.2); }
  BD.path(g, shade(c, 0.55), 4, [[0, -0.23], [0, 0.23]]); BD.disc(g, stripe, 0.014, -0.15, 0.012, 0.018);
  if (o.logo !== false) BD.disc(g, stripe, 0.115, -0.1, 0.03, 0.045); BD.rect(g, shade(c, 0.78), -0.3, 0.205, 0.3, 0.23); o.print && o.print(g);
}, build: ctx => { collar(ctx, shade(c, 0.9), 0.19, 0.045, 0.755); o.extra && o.extra(ctx); } }, o);
// a suit: jacket, white shirt in the V, lapels, tie, pocket square, buttons
const suit = (c, tie, o = {}) => Object.assign({ c, long: true, draw: g => {
  const lap = shade(c, 0.8), sh = o.shirt || '#f8f6f0', line = shade(c, 0.45);
  BD.poly(g, sh, [[-0.095, -0.23], [0.095, -0.23], [0.0, 0.07]]);
  BD.poly(g, lap, [[-0.185, -0.23], [-0.095, -0.23], [0.0, 0.07], [-0.07, 0.07], [-0.15, -0.09]], line, 3); BD.poly(g, lap, [[0.185, -0.23], [0.095, -0.23], [0.0, 0.07], [0.07, 0.07], [0.15, -0.09]], line, 3);
  if (o.pin) for (let u = -0.28; u <= 0.28; u += 0.04) BD.path(g, shade(c, 1.22), 2, [[u, -0.2], [u, 0.2]]);
  BD.poly(g, tie, [[-0.028, -0.2], [0.028, -0.2], [0.02, -0.17], [-0.02, -0.17]]); BD.poly(g, tie, [[-0.02, -0.17], [0.02, -0.17], [0.04, 0.0], [0.0, 0.05], [-0.04, 0.0]]);
  BD.disc(g, shade(c, 0.5), 0.0, 0.1, 0.012, 0.018); BD.disc(g, shade(c, 0.5), 0.0, 0.17, 0.012, 0.018);
  BD.poly(g, '#ffffff', [[0.1, -0.02], [0.17, -0.02], [0.135, -0.05]], line, 2); BD.path(g, line, 3, [[0.0, 0.07], [0.0, 0.23]]); BD.rect(g, shade(c, 0.85), -0.3, 0.205, 0.3, 0.23);
}, build: ctx => { collar(ctx, o.shirt || '#f8f6f0', 0.145, 0.035, 0.745); } }, o);

const BODY_LOOK = {};
Object.assign(BODY_LOOK, {
  // ---- tees, tanks, jerseys
  BBC: tee(0x5ab4ea, TXT('BBC', 0, -0.0, 0.17, '#ffffff')), 'Black Shirt': tee(0x2c2a34), 'Cyan Shirt': tee(0x58d8c8), 'Grey Shirt': tee(0xa8aab4), 'Pink Shirt': tee(0xf0807c), 'Purple Shirt': tee(0xc89ae0),
  'Red shirt': tee(0xb23c36), 'Yellow Shirt': tee(0xe6c078), 'White Pure Shirt': tee(0xf8f8f8), 'Fire Shirt': tee(0xe8301c, g => { for (let i = -3; i <= 3; i++) BD.poly(g, i % 2 ? '#ffd040' : '#ff9a20', [[i * 0.075 - 0.04, 0.215], [i * 0.075 + 0.04, 0.215], [i * 0.075 + (i % 2 ? 0.0 : 0.01), 0.215 - (i % 2 ? 0.1 : 0.15)]]); }),
  'White Shirt': tee(0xf0eee8, g => { BD.poly(g, '#ffffff', [[-0.11, -0.23], [0.0, -0.17], [0.11, -0.23], [0.07, -0.13], [0.0, -0.1], [-0.07, -0.13]], '#c8c4bc', 3); BD.path(g, '#c8c4bc', 3, [[0, -0.1], [0, 0.23]]); for (const v of [-0.04, 0.06, 0.16]) BD.disc(g, '#c8c4bc', 0, v, 0.011, 0.016); }),
  'blue tee': tee(0x58a8ea, TXT('AUTISM\nSWAG', 0, 0.12, 0.07, '#f8a824', { font: HAND_FONT, lh: 0.95 })), 'red tee': tee(0xe84a2c, TXT('AUTISM\nSWAG', 0, 0.12, 0.07, '#f8d03a', { font: HAND_FONT, lh: 0.95 })),
  'white tee': tee(0xf6f6f6, TXT('AUTISM\nSWAG', 0, 0.12, 0.07, '#f09a20', { font: HAND_FONT, lh: 0.95 })), 'dark tee': tee(0x30303a, TXT("i'm a Zynner", 0.0, 0.1, 0.055, '#4a8ae8', { font: HAND_FONT })),
  'Chug Life': tee(0xf890b8, TXT('CHUG\nLIFE', 0, 0.05, 0.1, '#3a1a4a', { lh: 0.95 })), CWO: tee(0x8a4ad0, TXT('CWO', 0, 0.05, 0.17, '#f4a020', { stroke: '#4a1a80' })),
  Inmate: tee(0xf08a2c, TXT('INMATE', 0, 0.1, 0.07, '#2a2230')), 'MILF Lover': tee(0x80c8f0, g => { BD.text(g, 'MILF\nLOVER', 0, 0.04, 0.085, '#2a4a9a', { lh: 0.95 }); BD.poly(g, '#e83050', [[0.115, 0.14], [0.17, 0.14], [0.142, 0.19]]); BD.disc(g, '#e83050', 0.126, 0.135, 0.017, 0.021); BD.disc(g, '#e83050', 0.158, 0.135, 0.017, 0.021); }),
  'Six Seven': tee(0x6ad8b0, TXT('67', 0.02, 0.05, 0.2, '#1c3a30', { stroke: '#d8fff0', sw: 6 })), Virgin: tee(0xf08a40, TXT('VIRGIN', 0, 0.1, 0.075, '#ffffff')), 'Zero THOTS': tee(0xa070e0, TXT('ZERO\nTHOTS', 0, 0.05, 0.1, '#f8f0b0', { lh: 0.95, rot: -0.1 })),
  'Farmer Shirt': { c: 0xe8a030, draw: g => { for (let u = -0.3; u < 0.3; u += 0.06) BD.rect(g, '#c06a18', u, -0.23, u + 0.025, 0.23); for (let v = -0.23; v < 0.23; v += 0.06) BD.rect(g, '#b85a14', -0.3, v, 0.3, v + 0.025); BD.poly(g, '#d88a28', [[-0.1, -0.23], [0, -0.13], [0.1, -0.23], [0.06, -0.15], [0, -0.1], [-0.06, -0.15]], '#7a3a10', 3); BD.path(g, '#7a3a10', 3, [[0, -0.1], [0, 0.23]]); for (const v of [-0.04, 0.06, 0.16]) BD.disc(g, '#f4ecd0', 0, v, 0.011, 0.016); } },
  'Hawaiian Polo': { c: 0xd82a2a, draw: g => { const r = rng(7); for (let i = 0; i < 40; i++) { const u = (r() - 0.5) * 0.6, v = (r() - 0.5) * 0.44, s = 0.018 + r() * 0.014; for (let k = 0; k < 5; k++) { const a = k * 1.2566 + r() * 0.3; BD.disc(g, '#fff4e8', u + Math.cos(a) * s, v + Math.sin(a) * s * 1.3, s * 0.65, s * 0.85); } BD.disc(g, '#f8c030', u, v, s * 0.5, s * 0.65); }
    BD.poly(g, '#a81818', [[-0.11, -0.23], [0, -0.12], [0.11, -0.23], [0.07, -0.14], [0, -0.1], [-0.07, -0.14]], '#701010', 3); BD.path(g, '#701010', 3, [[0, -0.1], [0, 0.23]]); } },
  'Blue Homeless Shirt': tee(0x7a8aa8, g => rags(g, 0x7a8aa8, 0xc8a878), {}), 'Brown Homeless Shirt': tee(0xb89a6a, g => rags(g, 0xb89a6a, 0x5a8ac8), {}), 'Grey Homeless Shirt': tee(0x9a9aa2, g => rags(g, 0x9a9aa2, 0xc8a878), {}),
  Boner: tank(0xa8e8f0, g => { BD.text(g, 'Boner', 0, 0.14, 0.075, '#2a6a7a', { font: HAND_FONT }); for (const v of [-0.12, -0.05, 0.02]) { BD.arc(g, 'rgba(255,255,255,0.8)', 4, -0.085, v, 0.09, 0.03, Math.PI * 1.1, Math.PI * 1.9); BD.arc(g, 'rgba(255,255,255,0.8)', 4, 0.085, v, 0.09, 0.03, Math.PI * 1.1, Math.PI * 1.9); } }),
  'White Tank': tank(0xf0f0f4, g => { for (const v of [-0.12, -0.05, 0.02, 0.09]) { BD.arc(g, 'rgba(160,160,180,0.75)', 4, -0.085, v, 0.095, 0.03, 0.1, Math.PI * 0.9); BD.arc(g, 'rgba(160,160,180,0.75)', 4, 0.085, v, 0.095, 0.03, 0.1, Math.PI * 0.9); } BD.path(g, 'rgba(160,160,180,0.75)', 4, [[0, -0.14], [0, 0.1]]); }),
  'Blue Sleeveless': tank(0x6a9ae8), 'Orange Sleeveless': tank(0xf08a30), 'Red Sleeveless': tank(0xe05a3a), 'White Sleeveless': tank(0xf8f8f8), 'Tank Top': tank(0x6a6a34), 'Purple Tank': tank(0x8a50c8),
  'Blue 143 Jersey': jersey(0x6aa0f0), 'Red 143 Jersey': jersey(0xd8302c), 'Yellow 143 Jersey': jersey(0xe8c070, '#ffffff', '#fff6dc'),
  // stripes
  Prisoner: { c: 0xf4f4f4, draw: g => { for (let v = -0.22; v < 0.23; v += 0.075) BD.rect(g, '#24222e', -0.6, v, 0.6, v + 0.037); } },
  Stripes: stripes(0xd8303a), 'Stripe Shirt': stripes(0xd8303a), 'Stripe shirts': stripes(0xd8303a),
  // vests
  'Black Vest': vest(0x24242c), 'CEO Vest': vest(0x34363e), 'dark vest': vest(0x2a2c34), 'pink vest': vest(0xc080e0), 'purple vest': vest(0xa88ae0),
  'Army Vest': { c: 0x6a7a45, draw: g => { const r = rng(11); for (let i = 0; i < 46; i++) BD.disc(g, r() < 0.5 ? '#4a5a30' : r() < 0.5 ? '#8a7a50' : '#2e3a22', (r() - 0.5) * 0.8, (r() - 0.5) * 0.46, 0.03 + r() * 0.04, 0.02 + r() * 0.03);
    for (const u of [-0.15, 0, 0.15]) { BD.poly(g, '#4a5636', [[u - 0.055, 0.05], [u + 0.055, 0.05], [u + 0.055, 0.17], [u - 0.055, 0.17]], '#2a3220', 3); BD.rect(g, '#2a3220', u - 0.055, 0.075, u + 0.055, 0.085); }
    BD.rect(g, '#f4f4f4', 0.1, -0.12, 0.19, -0.08); for (const v of [-0.12, -0.1, -0.08]) BD.rect(g, '#d83030', 0.1, v + 0.005, 0.19, v + 0.015); BD.rect(g, '#2a4aa8', 0.1, -0.12, 0.135, -0.1); BD.rect(g, '#2a3220', -0.3, -0.23, 0.3, -0.19); BD.path(g, '#2a3220', 4, [[0, -0.23], [0, 0.23]]); }, build: ctx => collar(ctx, 0x4a5636, 0.2, 0.055, 0.76) },
  // hoodies and jackets
  'Electro Hoodie': hoodie(0x34343c, { print: g => { for (const k of [0, 1]) for (const sx of [-1, 1]) BD.path(g, '#f0c030', 5, [[sx * 0.1, -0.2 + k * 0.03], [sx * 0.22, -0.16 + k * 0.03]]); } }),
  'Glitch Hoodie': hoodie(0x2a8af0, { print: g => { const r = rng(5); for (let i = 0; i < 40; i++) BD.rect(g, r() < 0.5 ? '#30e0f0' : r() < 0.5 ? '#1a50b8' : '#e840d0', (r() - 0.5) * 0.6, (r() - 0.5) * 0.44, (r() - 0.5) * 0.6 + 0.05, (r() - 0.5) * 0.44 + 0.02); } }),
  'Mon Hoodie': hoodie(0x7a4ad8, { print: g => { BD.disc(g, null, 0.09, -0.07, 0.036, 0.05, '#f4f0ff', 6); } }), 'Orange Hoodie': hoodie(0xf06a20), 'Sky Hoodie': hoodie(0x40a8f0),
  'Peach Hoodie': hoodie(0xf0b0a0, { print: g => { const r = rng(9); for (let i = 0; i < 30; i++) BD.rect(g, r() < 0.5 ? '#f8c8b8' : '#e09a8a', (r() - 0.5) * 0.6, (r() - 0.5) * 0.44, (r() - 0.5) * 0.6 + 0.04, (r() - 0.5) * 0.44 + 0.02); } }),
  'Yellow Hoodie': hoodie(0xf0b820, { up: true }),
  'Blue Holed Jacket': hoodie(0x4a8af0, { print: g => holes(g, 3) }), 'Orange Holed Jacket': hoodie(0xf06a28, { print: g => holes(g, 8) }),
  'Black Trackset': track(0x2a2a30), 'Red Trackset': track(0xd83030), 'Blue jacket': track(0x2a4ab8), 'dark jacket': track(0x20244a), 'Red jacket': track(0xd83a2c, '#f4c830'),
  'Squid Game': track(0x1a9a70, '#ffffff', { logo: false, print: TXT('069', 0.08, 0.1, 0.1, '#ffffff', { stroke: '#0a5a40', sw: 5 }) }),
  'Squid Game Guard': track(0xf0508c, '#ffffff', { logo: false, print: g => BD.poly(g, null, [[0.0, -0.06], [0.07, 0.06], [-0.07, 0.06]], '#ffffff', 8) }),
  // suits
  'Aqua Tuxedo': suit(0x80c8f0, '#30a8d0'), 'Blue tuxedo': suit(0x2a3a98, '#2a58d0'), 'Cyan tuxedo': suit(0x30c0c8, '#1a8a98'), 'Cream Tuxedo': suit(0xc8a878, '#7a5a3a'), 'Pink Tuxedo': suit(0xf0b0d8, '#d870b0'),
  'Red Tuxedo': suit(0xa02828, '#f4f0e8'), Tuxedo: suit(0x24242c, '#14141a'), 'White tuxedo': suit(0xf6f4ee, '#2a2a30', { line: true }),
  'Blue Mafia': suit(0x20306a, '#f4c830', { pin: true }),
});

// patches and tears for the rag shirts
function rags(g, c, patch) {
  BD.rect(g, patch, -0.2, -0.02, -0.08, 0.1); BD.path(g, shade(patch, 0.6), 3, [[-0.2, -0.02], [-0.08, -0.02], [-0.08, 0.1], [-0.2, 0.1], [-0.2, -0.02]]); for (let k = 0; k < 4; k++) BD.path(g, shade(patch, 0.55), 2, [[-0.19 + k * 0.03, -0.01], [-0.17 + k * 0.03, 0.09]]);
  BD.rect(g, shade(c, 0.78), 0.1, 0.1, 0.19, 0.16); BD.path(g, shade(c, 0.5), 2, [[0.1, 0.1], [0.19, 0.1], [0.19, 0.16], [0.1, 0.16], [0.1, 0.1]]);
  BD.path(g, shade(c, 0.55), 3, [[0.0, -0.1], [0.03, -0.06], [0.0, -0.02]]); for (let i = -4; i <= 4; i++) BD.poly(g, shade(c, 0.72), [[i * 0.07 - 0.03, 0.23], [i * 0.07 + 0.03, 0.23], [i * 0.07, 0.19 + (i % 2) * 0.015]]);
  BD.path(g, shade(c, 0.6), 4, [[-0.1, -0.23], [0, -0.16], [0.1, -0.23]]);
}
function holes(g, seed) { const r = rng(seed); for (let i = 0; i < 9; i++) BD.disc(g, '#241830', (r() - 0.5) * 0.4, (r() - 0.4) * 0.34, 0.02 + r() * 0.025, 0.02 + r() * 0.025, '#0e0818', 3); }
function stripes(c) { return { c: 0xf4f0ec, draw: g => { for (let v = -0.22; v < 0.23; v += 0.08) BD.rect(g, shade(c, 1), -0.6, v, 0.6, v + 0.04); NECK(g, shade(c, 0.8), 0.09, 0.05); } }; }

// ---- costumes, robes, armour, capes
const skirt = (ctx, c, r0 = 0.27, r1 = 0.38, h = 0.34, y = 0.36) => add(ctx.body, GEO.cyl(r0, r1, h, 8), c, 0, y, 0);
const chinese = c => ({ c, long: true, draw: g => {
  BD.path(g, '#f0c040', 5, [[-0.09, -0.22], [0, -0.12], [0.09, -0.22]]); BD.path(g, shade(c, 0.6), 4, [[0, -0.12], [0, 0.23]]);
  for (const v of [-0.06, 0.02, 0.1]) { BD.path(g, '#f0c040', 5, [[-0.07, v], [-0.016, v]]); BD.path(g, '#f0c040', 5, [[0.016, v], [0.07, v]]); BD.disc(g, '#f0c040', 0, v, 0.014, 0.02); }
  BD.rect(g, '#f0c040', -0.3, 0.2, 0.3, 0.23);
}, build: ctx => { add(ctx.body, new THREE.CylinderGeometry(0.17, 0.19, 0.1, 10, 1, true), c, 0, 0.78, 0, true); ringAt(ctx.body, 0xf0c040, 0.18, 0.016, 0.83); } });
const animalHood = (ctx, c, rim, extra, fringe) => { const h = hoodUp(ctx, c, { rim, fringe }); extra && extra(ctx, h); };
const toad = (c, rim, patch, belly) => ({ c, long: true, pants: c, draw: g => { BD.disc(g, belly, 0, 0.07, 0.16, 0.17); BD.arc(g, shade(belly, 0.8), 4, 0, 0.0, 0.1, 0.03, 0.2, Math.PI - 0.2); },
  build: ctx => animalHood(ctx, c, rim, ctx2 => { for (const sx of [-1, 1]) { const b = add(ctx.head, GEO.sph(0.16, 10, 8), c, sx * 0.3, 0.46, 0.0); b.scale.set(1, 0.9, 0.9); add(ctx.head, GEO.sph(0.16, 10, 8), rim, sx * 0.3, 0.46, 0.0).scale.set(0.8, 0.72, 1.0); const p = add(ctx.head, GEO.box(0.15, 0.08, 0.03), patch, sx * 0.3, 0.5, 0.16); p.rotation.z = -sx * 0.25; } }, true) });
Object.assign(BODY_LOOK, {
  'Blue Chinese': chinese(0x2a52d0), 'Red Chinese': chinese(0xd02838),
  Gojo: { c: 0x1e1e34, long: true, pants: 0x1e1e34, draw: g => { BD.rect(g, '#2c2c4c', -0.3, -0.23, 0.3, -0.17); BD.path(g, '#3a3a5a', 3, [[0, -0.17], [0, 0.23]]); for (const v of [-0.1, 0.0, 0.1, 0.19]) BD.disc(g, '#d8b040', 0, v, 0.013, 0.019); BD.rect(g, '#2c2c4c', -0.3, 0.205, 0.3, 0.23); }, build: ctx => add(ctx.body, new THREE.CylinderGeometry(0.18, 0.2, 0.12, 10, 1, true), 0x2c2c4c, 0, 0.79, 0, true) },
  Guko: { c: 0xf08020, long: true, arm: 0x2a50c0, pants: 0xf08020, draw: g => { BD.poly(g, '#2a50c0', [[-0.12, -0.23], [0.12, -0.23], [0.0, -0.02]]); BD.poly(g, '#f08020', [[-0.07, -0.23], [0.07, -0.23], [0.0, -0.1]]); BD.rect(g, '#2a50c0', -0.3, 0.13, 0.3, 0.2); BD.rect(g, '#1a3080', -0.3, 0.19, 0.3, 0.205); BD.disc(g, '#f8f4e8', 0.13, 0.02, 0.05, 0.07, '#222', 3); BD.disc(g, '#222', 0.13, 0.02, 0.022, 0.03); } },
  'Sci Fi': { c: 0xd88a1c, draw: g => { for (const sx of [-1, 1]) BD.path(g, '#2c2c34', 12, [[sx * 0.2, -0.23], [-sx * 0.05, 0.14]]); BD.rect(g, '#2c2c34', -0.3, 0.12, 0.3, 0.2); BD.disc(g, '#30e8f8', 0, 0.16, 0.04, 0.03, '#0a3a40', 3); BD.disc(g, '#30e8f8', 0, -0.0, 0.03, 0.04, '#0a3a40', 3); BD.poly(g, '#a86a10', [[0.12, 0.0], [0.2, 0.0], [0.2, 0.08], [0.12, 0.08]], '#5a3808', 3); BD.poly(g, '#a86a10', [[-0.2, 0.0], [-0.12, 0.0], [-0.12, 0.08], [-0.2, 0.08]], '#5a3808', 3); }, build: ctx => { for (const sx of [-1, 1]) { const p = add(ctx.arms[sx > 0 ? 1 : 0], GEO.sph(0.14, 8, 6), 0x2c2c34, 0, 0.02, 0); p.scale.set(1.1, 0.6, 1.1); } } },
  'Astro Suit': { c: 0xeceff4, long: true, pants: 0xeceff4, draw: g => { BD.rect(g, '#a8aebc', -0.12, -0.12, 0.12, 0.04); for (const [u, c] of [[-0.07, '#d83030'], [-0.02, '#30a8f0'], [0.03, '#f4d03a'], [0.08, '#30d060']]) BD.disc(g, c, u, -0.07, 0.014, 0.02); BD.rect(g, '#2c2c34', -0.1, -0.02, 0.1, 0.01); BD.rect(g, '#f4f4f4', -0.2, 0.0, -0.1, 0.05); for (const v of [0.01, 0.025, 0.04]) BD.rect(g, '#d83030', -0.2, v, -0.1, v + 0.005); BD.rect(g, '#2a4aa8', -0.2, 0.0, -0.16, 0.025); BD.path(g, '#b8bcc8', 4, [[0, 0.04], [0, 0.23]]); BD.rect(g, '#a8aebc', -0.3, 0.2, 0.3, 0.23); },
    build: ctx => { ringAt(ctx.body, 0xb8bcc8, 0.24, 0.075, 0.74); hoodUp(ctx, 0xe8ecf3, { rim: 0xb4bac8, tube: 0.05, fringe: true }); for (const sx of [-1, 1]) { const l = add(ctx.head, GEO.cyl(0.07, 0.07, 0.1, 8), 0x9aa0b0, sx * 0.45, 0.02, 0.05); l.rotation.z = Math.PI / 2; } } },
  Mummy: { c: 0xe8dcb8, long: true, pants: 0xe8dcb8, draw: g => { const r = rng(3); for (let i = 0; i < 16; i++) { const v = -0.24 + i * 0.03; BD.path(g, '#a89868', 4, [[-0.6, v + 0.04], [0.6, v - 0.04 + r() * 0.02]]); } BD.path(g, '#c8b888', 3, [[-0.6, 0.0], [0.6, -0.06]]); } },
  'Golden Armor': { c: 0xe0b040, draw: g => { BD.poly(g, '#f4d060', [[-0.2, -0.23], [0.2, -0.23], [0.16, 0.12], [0.0, 0.17], [-0.16, 0.12]], '#8a5a10', 5); BD.path(g, '#a87818', 4, [[0, -0.22], [0, 0.16]]); for (const sx of [-1, 1]) BD.path(g, '#a87818', 3, [[sx * 0.06, -0.1], [sx * 0.15, -0.04]]); BD.rect(g, '#8a5a10', -0.3, 0.14, 0.3, 0.21); BD.disc(g, '#f8e888', 0, 0.175, 0.04, 0.03, '#6a4208', 3); },
    build: ctx => { for (let i = 0; i < 2; i++) { const a = ctx.arms[i], sx = i ? 1 : -1; const p = add(a, GEO.sph(0.17, 10, 7), 0xe0b040, sx * 0.02, 0.03, 0); p.scale.set(1.1, 0.72, 1.12); const q = add(a, GEO.sph(0.15, 10, 7), 0xf0c860, sx * 0.03, 0.0, 0); q.scale.set(1.1, 0.5, 1.08); ringAt(a, 0x8a5a10, 0.15, 0.012, 0.04).scale.set(1, 1, 0.6); } } },
  'Duck Float': { c: 0x4a3a9a, draw: g => { BD.rect(g, '#6a58c8', -0.3, -0.23, 0.3, -0.18); },
    build: ctx => { const b = ctx.body; const r = ringAt(b, 0xf4d03a, 0.31, 0.085, 0.4); r.scale.set(1, 1, 0.9); const h = add(b, GEO.sph(0.11, 10, 8), 0xf4d03a, -0.22, 0.52, 0.28); add(b, GEO.cone(0.045, 0.1, 5), 0xf08a20, -0.27, 0.51, 0.39).rotation.set(Math.PI / 2, 0, 0.3); for (const dz of [-1, 1]) { const e = decal(new THREE.CircleGeometry(0.014, 6), 0x1a1a22, -0.22 + dz * 0.06, 0.55, 0.345); e.rotation.y = -0.3; b.add(e); } add(b, GEO.sph(0.09, 8, 6), 0xf4d03a, -0.2, 0.42, 0.16).scale.set(1.2, 0.9, 1); } },
  'Banana suit': { c: 0xf4c020, long: true, pants: 0xf4c020, draw: g => { for (const u of [-0.13, 0.0, 0.13]) BD.path(g, '#c8901a', 4, [[u, -0.23], [u * 1.1, 0.23]]); BD.disc(g, '#f8e68a', 0, 0.08, 0.15, 0.15); }, build: ctx => animalHood(ctx, 0xf4b420, 0xf8d860, c2 => { const st = add(ctx.head, GEO.cyl(0.035, 0.05, 0.1, 6), 0x6a4a1a, 0, 0.58, -0.1); st.rotation.x = -0.4; }) },
  'Dragon suit': { c: 0xe8402a, long: true, pants: 0xe8402a, draw: g => { BD.disc(g, '#f4b070', 0, 0.06, 0.15, 0.18); for (const v of [-0.06, 0.0, 0.06, 0.12]) BD.arc(g, '#d88a50', 4, 0, v, 0.13, 0.03, 0.2, Math.PI - 0.2); },
    build: ctx => animalHood(ctx, 0xe8402a, 0xf06a3a, () => { for (const sx of [-1, 1]) { const h = add(ctx.head, GEO.cone(0.075, 0.24, 6), 0xf4c88a, sx * 0.3, 0.52, 0.0); h.rotation.z = -sx * 0.4; } for (let i = 0; i < 3; i++) add(ctx.head, GEO.cone(0.045, 0.1, 5), 0xf4c88a, 0, 0.55 - i * 0.1, -0.08 - i * 0.14).rotation.x = -0.3 - i * 0.3; for (const sx of [-1, 1]) { const w = add(ctx.body, GEO.cone(0.12, 0.34, 3), 0xc02a1a, sx * 0.22, 0.6, -0.3, true); w.rotation.set(0.1, 0, -sx * 1.0); w.scale.set(1, 1, 0.25); } }) },
  'Shark Suit': { c: 0x3a8ad0, long: true, pants: 0x3a8ad0, draw: g => { BD.disc(g, '#eaf4fa', 0, 0.06, 0.15, 0.19); },
    build: ctx => animalHood(ctx, 0x3a8ad0, 0xdceefa, () => { for (let i = 0; i < 13; i++) { const a = -0.45 + (i / 12) * (Math.PI + 0.9), x = Math.cos(a) * 0.3, y = -0.03 + Math.sin(a) * 0.3 * 1.04; const t = add(ctx.head, GEO.cone(0.035, 0.09, 4), 0xffffff, x, y, 0.33); t.rotation.z = a + Math.PI / 2 + Math.PI; } const fin = add(ctx.head, GEO.cone(0.12, 0.26, 3), 0x2e74b8, 0, 0.58, -0.22); fin.scale.set(0.3, 1, 1); fin.rotation.x = -0.35; }) },
  'toad blue suit': toad(0x3a78e0, 0xa8d8f8, 0x90e030, '#a8f0d8'), 'Toad green Suit': toad(0x28c890, 0xb8f0b0, 0xf08a28, '#a8f4d8'), 'Toad pink suit': toad(0xe8508c, 0xf8a8c8, 0x30c0f0, '#f8a0c0'),
  'Gangster suit': { c: 0x2a2a44, long: true, draw: BODY_HOODIE_DRAW(0x2a2a44), build: ctx => { hoodUp(ctx, 0x2a2a44, { rim: 0x3a3a58 }); bandana(ctx); } },
  // robes
  Jesus: { c: 0xf4f0e4, long: true, pants: 0xf4f0e4, draw: g => { BD.poly(g, '#e4dccc', [[-0.09, -0.23], [0.09, -0.23], [0.0, -0.06]], '#c8bca4', 3); BD.poly(g, '#c82a20', [[-0.3, -0.23], [-0.2, -0.23], [0.3, 0.12], [0.3, 0.2], [0.22, 0.2]], '#6a1410', 4); BD.rect(g, '#c8bca4', -0.3, 0.2, 0.3, 0.23); }, build: ctx => skirt(ctx, 0xf4f0e4) },
  'Jesus Robe': { c: 0xf4f0e4, long: true, pants: 0xf4f0e4, draw: g => { BD.poly(g, '#e4dccc', [[-0.09, -0.23], [0.09, -0.23], [0.0, -0.06]], '#c8bca4', 3); BD.poly(g, '#b82a24', [[-0.3, -0.23], [-0.04, -0.23], [0.12, 0.0], [0.3, 0.1], [0.3, 0.23], [-0.3, 0.23]], '#5a1010', 4); BD.rect(g, '#d8c890', -0.3, 0.2, 0.3, 0.23); }, build: ctx => skirt(ctx, 0xf4f0e4) },
  'Kings Robe': { c: 0xf08ab0, long: true, pants: 0xf08ab0, draw: g => { for (const sx of [-1, 1]) { BD.rect(g, '#f8f6f0', sx * 0.03 - (sx > 0 ? 0 : 0.07), -0.23, sx * 0.03 + (sx > 0 ? 0.07 : 0), 0.23); const r = rng(sx + 4); for (let i = 0; i < 9; i++) BD.disc(g, '#2a2230', sx * (0.03 + r() * 0.05), -0.2 + i * 0.05, 0.007, 0.012); } BD.rect(g, '#f8f6f0', -0.3, 0.17, 0.3, 0.23); const r = rng(2); for (let i = 0; i < 14; i++) BD.disc(g, '#2a2230', -0.28 + i * 0.04, 0.2 + (i % 2) * 0.015, 0.008, 0.012); },
    build: ctx => { skirt(ctx, 0xf08ab0); add(ctx.body, GEO.box(0.62, 0.62, 0.04), 0xc02030, 0, 0.42, -0.3); const f = ringAt(ctx.body, 0xf8f6f0, 0.24, 0.075, 0.73); } },
  'White Yukata': yukata(0xf6f0e8, 0xa078d0, 0xf0a0c0), 'Yellow Yukata': yukata(0xf0b030, 0xb03020, 0xd88a20, true),
  Wizard: wizard(0x1c1c34, 0xf0c040, false), 'Wizard Cape': wizard(0x24367a, 0xf0d060, true),
});
// the gangster's hoodie front (pocket, strings) and the red bandana over the lower face
function BODY_HOODIE_DRAW(c) { return g => { BD.poly(g, shade(c, 0.88), [[-0.15, 0.03], [0.15, 0.03], [0.21, 0.2], [-0.21, 0.2]], shade(c, 0.66), 5); for (const sx of [-1, 1]) { BD.path(g, '#f4f0e8', 5, [[sx * 0.045, -0.21], [sx * 0.05, 0.0]]); BD.disc(g, '#f4f0e8', sx * 0.05, 0.015, 0.012, 0.018); } BD.rect(g, shade(c, 0.8), -0.3, 0.205, 0.3, 0.23); }; }
function bandana(ctx) {
  const s = new THREE.Shape(); s.moveTo(-0.3, -0.02); s.lineTo(0.3, -0.02); s.lineTo(0.27, -0.12); s.lineTo(0.0, -0.3); s.lineTo(-0.27, -0.12); s.closePath();
  const w = decal(new THREE.ShapeGeometry(s), 0xf4f0e8, 0, 0, 0.056, 1.05, 1.05); w.position.y -= 0.006; ctx.face.add(w); const b = decal(new THREE.ShapeGeometry(s), 0xd8201c, 0, 0, 0.06); ctx.face.add(b);
  const r = rng(13); for (let i = 0; i < 16; i++) ctx.face.add(decal(new THREE.CircleGeometry(0.011, 6), 0xffffff, (r() - 0.5) * 0.4, -0.05 - r() * 0.15, 0.064));
}
function yukata(c, obi, flower, waves) {
  return { c, long: true, pants: c, draw: g => {
    const r = rng(21); if (waves) { for (let k = 0; k < 14; k++) { const u = (r() - 0.5) * 0.6, v = (r() - 0.5) * 0.44; for (const s of [0.05, 0.035, 0.02]) BD.arc(g, shade(c, 0.72), 3, u, v, s, s * 0.9, Math.PI, Math.PI * 2); } }
    else for (let i = 0; i < 30; i++) { const u = (r() - 0.5) * 0.6, v = (r() - 0.5) * 0.44; for (let k = 0; k < 5; k++) { const a = k * 1.2566 + r(); BD.disc(g, mixc(flower, 0xffffff, 0.2), u + Math.cos(a) * 0.014, v + Math.sin(a) * 0.02, 0.011, 0.015); } }
    BD.poly(g, shade(c, 0.9), [[-0.2, -0.23], [-0.09, -0.23], [0.1, 0.1], [0.0, 0.1]], mixc(c, 0x6a5aa8, 0.5), 5); BD.poly(g, shade(c, 0.96), [[0.2, -0.23], [0.09, -0.23], [-0.1, 0.1], [0.0, 0.1]], mixc(c, 0x6a5aa8, 0.5), 5);
    BD.rect(g, hx(obi), -0.3, 0.07, 0.3, 0.18); BD.path(g, shade(obi, 0.7), 3, [[-0.3, 0.125], [0.3, 0.125]]); }, build: ctx => skirt(ctx, c) };
}
function wizard(c, gold, stars) {
  return { c, long: true, pants: c, draw: g => { BD.path(g, hx(gold), 4, [[-0.1, -0.22], [0, -0.14], [0.1, -0.22]]); const r = rng(stars ? 8 : 6); for (let i = 0; i < 24; i++) BD.disc(g, hx(gold), (r() - 0.5) * 0.5, (r() - 0.3) * 0.4, 0.007, 0.01); },
    build: ctx => {
      const mat = bodyPattern('cloak' + c, 128, 128, (g, w, h) => { g.fillStyle = hx(c); g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 26; i++) { g.fillStyle = hx(gold); const x = r() * w, y = r() * h, s = 2 + r() * 3; if (stars) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, rr = k % 2 ? s * 0.45 : s; g.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr); } g.fill(); } else { g.fillRect(x, y, s * 0.8, s * 0.8); } } }, 2, 1);
      const cloak = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.43, 0.56, 10, 1, true), mat); cloak.position.y = 0.45; cloak.castShadow = true; cloak.userData.noOutline = true; ctx.body.add(cloak);
      const lin = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.07, 6, 12), bodyPattern('lin' + c, 64, 64, (g, w, h) => { g.fillStyle = hx(stars ? 0x2a4aa8 : 0x2a2a58); g.fillRect(0, 0, w, h); g.fillStyle = hx(gold); const r = rng(2); for (let i = 0; i < 12; i++) g.fillRect(r() * w, r() * h, 4, 4); }, 3, 1)); lin.rotation.x = Math.PI / 2; lin.position.y = 0.76; ctx.body.add(lin);
      for (const sx of [-1, 1]) { add(ctx.body, GEO.sph(0.02, 6, 5), 0xf4f0e4, sx * 0.07, 0.68, 0.22); add(ctx.body, GEO.cyl(0.008, 0.008, 0.12, 4), 0xf4f0e4, sx * 0.06, 0.62, 0.23); }
    } };
}

// ---- chog.js reads this
function bodyLookOf(o) { return o.bodyName && BODY_LOOK[o.bodyName]; }
function bodyBuild(ctx, s, name) { ctx.body.add(bodyOverlay(name, s.draw || (() => { }))); s.build && s.build(ctx); }
