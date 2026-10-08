// ===== Chog character: angular, cel-shaded, inked =====
const INK = 0x1a0a2e;
const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const inkMatDS = new THREE.MeshBasicMaterial({ color: INK, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 3, polygonOffsetUnits: 3 });
const CHOG_SCALE = 0.74;

// The scene's light makes a lit toon colour about 1.7x brighter than its value, so colours read from the art (hats, clothes) are built at EXPO of their value: CM_K is set
// around those parts. Fur and the older hand-tuned parts keep their values.
const EXPO = 0.6; let CM_K = 1;
function cm(geo, c, x = 0, y = 0, z = 0, ds = false) { return M(geo, tmat(CM_K === 1 ? c : new THREE.Color(c).multiplyScalar(CM_K).getHex(), { ds, em: 0.2 }), x, y, z); }
function decal(geo, c, x, y, z, sx = 1, sy = 1) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.scale.set(sx, sy, 1); m.userData.noOutline = true; return m; }
function blade(L, W, T, bend, segs = 5) {
  const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, w = W * Math.pow(1 - t, 0.8) * 0.5 + 0.003, th = T * (1 - t) * 0.5 + 0.003;
    const y = t * L, z = bend * t * t * L;
    pos.push(-w, y, z - th, w, y, z - th, w, y, z + th, -w, y, z + th);
  }
  for (let i = 0; i < segs; i++) { const a = i * 4, b = (i + 1) * 4; for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; idx.push(a + k, a + k2, b + k, a + k2, b + k2, b + k); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
}
const FACE_SHAPE = () => {
  const s = new THREE.Shape();
  s.moveTo(-0.27, 0.19); s.lineTo(-0.14, 0.215); s.lineTo(-0.05, 0.185); s.lineTo(0.06, 0.225); s.lineTo(0.15, 0.19); s.lineTo(0.27, 0.21);
  s.lineTo(0.285, -0.03); s.quadraticCurveTo(0.26, -0.2, 0.1, -0.245); s.lineTo(-0.1, -0.245); s.quadraticCurveTo(-0.26, -0.2, -0.285, -0.03); s.lineTo(-0.27, 0.19);
  return s;
};
const FACE_GEO = (() => {
  const s = FACE_SHAPE();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.018, bevelSegments: 1, curveSegments: 3 });
  g.translate(0, 0, -0.1); return g;
})();
// a vertical colour gradient laid over the face (Multi Colored skin: pink at the top, green at the jaw)
function faceGradient(stops) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 64; const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), '#' + new THREE.Color(c).getHexString())); g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
  const geo = new THREE.ShapeGeometry(FACE_SHAPE()), uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, 1 - (p.getY(i) + 0.245) / 0.47);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.9 })); m.position.z = 0.032; m.userData.noOutline = true; return m;
}
// the hair's bangs inside an open hood or helmet: a rounded cap of hair colour following the opening, zigzag lower edge, so it reads as sitting behind the hood's rim
function hairFringe(c) {
  const sh = new THREE.Shape(), cx = 0, cy = -0.03, rx = 0.26, ry = 0.27, a0 = 0.56;
  for (let i = 0; i <= 14; i++) { const a = Math.PI - a0 - (Math.PI - 2 * a0) * (1 - i / 14), x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a); i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
  const tips = [-0.2, -0.1, 0, 0.1, 0.2], valleys = [-0.15, -0.05, 0.05, 0.15];
  sh.lineTo(-0.22, 0.13); tips.forEach((x, i) => { sh.lineTo(x, 0.12 + (i % 2) * 0.012); if (i < 4) sh.lineTo(valleys[i], 0.19); }); sh.lineTo(0.22, 0.13);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: c })); m.position.z = 0.043; m.userData.noOutline = true; return m;
}
function orientBlade(mesh, d) {
  const Y = d.clone().normalize(); const Z = new THREE.Vector3(0, 0.25, 1); Z.addScaledVector(Y, -Z.dot(Y));
  if (Z.lengthSq() < 1e-3) Z.set(0, 1, 0); Z.normalize();
  const X = new THREE.Vector3().crossVectors(Y, Z).normalize();
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}
function addOutlines(root, t = HULL_T) {
  const list = []; root.traverse(m => { if (m.isMesh && !m.userData.noOutline && !m.userData.isHull) list.push(m); });
  for (const m of list) {
    m.geometry.computeBoundingSphere(); const r = Math.max(m.geometry.boundingSphere.radius, 0.06);
    const h = new THREE.Mesh(m.geometry, m.material.side === THREE.DoubleSide ? inkMatDS : inkMat); h.userData.isHull = true;
    h.position.copy(m.position); h.quaternion.copy(m.quaternion); h.scale.copy(m.scale).multiplyScalar(1 + t / r);
    h.castShadow = false; h.receiveShadow = false; m.parent.add(h);
  }
}
// Mask pass (main.js): layer 1 = every visible Chog part, layer 2 = the face. The final pass draws one continuous outline around layer 1
// (so hair blades, which have no ink hull, get an outline too) and keeps ambient occlusion off the face.
function tagChogLayers(root, face) {
  root.traverse(m => { if (m.isMesh && !(m.userData && (m.userData.isHull || m.userData.noNormal))) m.layers.enable(1); });
  face.traverse(m => { if (m.isMesh && !(m.userData && m.userData.noNormal)) m.layers.enable(2); });
}
// a Multi Colored radioactive skull: the whole head is a diagonal rainbow (blue and pink above, orange, then green at the jaw), as in the art
const SKULL_RAINBOW = {};
function skullRainbow(stops) {
  const key = stops.join(',');
  if (!SKULL_RAINBOW[key]) { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 128, 128); const cs = ['#38c8f0', '#ff6ad0', '#ffb070', '#ffe060', '#84d840']; cs.forEach((c, i) => gr.addColorStop(i / (cs.length - 1), c)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); SKULL_RAINBOW[key] = new THREE.CanvasTexture(cv); }
  return SKULL_RAINBOW[key];
}
const scarfTex = paint(32, 16, (g, w, h) => { for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { g.fillStyle = ((x + y) / 4) % 2 ? '#d83a9a' : '#a02470'; g.fillRect(x, y, 4, 4); } }, 6, 1);

function chog(o = {}) {
  const hairC = o.hair || 0x5b35b0, suitC = o.suit || 0x5a32b0, trim = o.trim || 0xffd060;
  const MAG = o.hands || 0xd43d7c, MAGD = o.hands ? new THREE.Color(o.hands).multiplyScalar(0.72).getHex() : 0x9a2a68, CREAM = o.faceC || 0xfdf3cc;
  const FACEL = new THREE.Color(CREAM).multiplyScalar(0.7).getHex();             // the lit plate: built at EXPO so it reads as the art's cream (decals on it, like eyelids, are unlit and keep CREAM)
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const hatLook = o.hatName && typeof HAT_LOOK !== 'undefined' && HAT_LOOK[o.hatName];                 // chog_hats.js: every Head value has its own hat
  const hasHat = (!!o.head && o.head !== 'none' && !['headset', 'clownnose', 'thirdeye', 'thorn', 'wig'].includes(o.head)) || (!!hatLook && typeof HAT_COVERS !== 'undefined' && HAT_COVERS.has(o.hatName));
  // clothing from traits: kind = shirt|vest|jacket|tux|hoodie|robe|suit (see js/traits.js); fur colour is suitC
  const bl = typeof bodyLookOf !== 'undefined' && bodyLookOf(o);                                      // chog_bodies.js: every Body value has its own clothes
  const kind = bl ? undefined : o.kind, cloth = bl ? undefined : o.cloth;
  const ex = c => new THREE.Color(c).multiplyScalar(EXPO).getHex();
  const torsoC = bl ? ex(bl.c) : cloth !== undefined && kind && kind !== 'vest' ? cloth : suitC;
  const armC = bl ? (bl.long ? ex(bl.arm ?? bl.c) : suitC) : cloth !== undefined && ['jacket', 'tux', 'hoodie', 'robe', 'suit'].includes(kind) ? cloth : suitC;
  const legC = bl ? (bl.pants !== undefined ? ex(bl.pants) : suitC) : cloth !== undefined && ['suit', 'tux'].includes(kind) ? (o.pants ?? cloth) : suitC;
  body.add(cm(new THREE.CylinderGeometry(0.235, 0.275, 0.46, 8), torsoC, 0, 0.5, 0));
  if (kind === 'vest') body.add(cm(new THREE.CylinderGeometry(0.25, 0.29, 0.32, 8), cloth, 0, 0.46, 0));
  if (kind === 'tux' || kind === 'jacket') {
    body.add(cm(new THREE.BoxGeometry(0.15, 0.36, 0.03), o.shirt ?? 0xf4f0e4, 0, 0.5, 0.265));
    if (kind === 'tux') { const tie = cm(new THREE.ConeGeometry(0.045, 0.2, 3), o.tie ?? 0x1a1a24, 0, 0.5, 0.29); tie.rotation.x = Math.PI; body.add(tie); }
  }
  if (kind === 'hoodie') {
    const hd = cm(new THREE.TorusGeometry(0.2, 0.075, 6, 10), cloth, 0, 0.78, -0.03); hd.rotation.x = Math.PI / 2; body.add(hd);
    body.add(cm(new THREE.BoxGeometry(0.2, 0.09, 0.04), new THREE.Color(cloth).multiplyScalar(0.82).getHex(), 0, 0.36, 0.27));
  }
  if (kind === 'robe') {
    body.add(cm(new THREE.CylinderGeometry(0.26, 0.37, 0.36, 8), cloth, 0, 0.36, 0));
    body.add(cm(new THREE.CylinderGeometry(0.29, 0.29, 0.06, 8), o.robeTrim ?? 0xffd060, 0, 0.5, 0));
  }
  if (o.stripes) for (const y of [0.4, 0.5, 0.6]) { const sr = cm(new THREE.CylinderGeometry(0.262 - (0.6 - y) * 0.04, 0.262 - (0.6 - y) * 0.04, 0.045, 8), o.stripes, 0, y, 0); body.add(sr); }
  if (kind === 'suit' && o.belly !== undefined) { const bl = cm(new THREE.SphereGeometry(0.17, 8, 6), o.belly, 0, 0.45, 0.17); bl.scale.set(1, 1.15, 0.5); body.add(bl); }
  if (o.outfit === 'vest') body.add(cm(new THREE.CylinderGeometry(0.25, 0.29, 0.32, 8), o.vest || 0xd6a04c, 0, 0.46, 0));
  else if (o.outfit === 'tunic') body.add(cm(new THREE.CylinderGeometry(0.255, 0.34, 0.36, 8), o.vest || 0xa63a44, 0, 0.4, 0));
  else if (o.outfit === 'jacket') { body.add(cm(new THREE.CylinderGeometry(0.25, 0.29, 0.34, 8), 0x2a2440, 0, 0.46, 0)); body.add(cm(new THREE.BoxGeometry(0.03, 0.34, 0.03), trim, 0, 0.46, 0.27)); }
  else if (o.outfit === 'apron') { body.add(cm(new THREE.CylinderGeometry(0.25, 0.29, 0.34, 8), 0xf4f0e4, 0, 0.44, 0)); }
  if (o.outfit) { body.add(cm(new THREE.CylinderGeometry(0.29, 0.29, 0.06, 8), 0xc87a28, 0, 0.34, 0)); body.add(cm(new THREE.BoxGeometry(0.1, 0.08, 0.04), 0xe8d078, 0, 0.34, 0.29)); }
  if (o.scarf) { const sc = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 6, 10), new THREE.MeshToonMaterial({ map: scarfTex, gradientMap: toonGrad4, emissive: 0x401030 })); sc.rotation.x = Math.PI / 2; sc.position.y = 0.76; sc.castShadow = true; body.add(sc); }
  const legs = [];
  for (const sx of [-1, 1]) {
    const lg = new THREE.Group(); lg.position.set(sx * 0.13, 0.2, 0);
    lg.add(cm(new THREE.CylinderGeometry(0.085, 0.1, 0.24, 6), legC, 0, 0, 0));
    lg.add(cm(new THREE.CylinderGeometry(0.108, 0.108, 0.05, 6), MAG, 0, -0.11, 0));
    lg.add(cm(new THREE.BoxGeometry(0.17, 0.09, 0.28), MAG, 0, -0.16, 0.05));
    for (const tx of [-0.055, 0, 0.055]) lg.add(cm(new THREE.BoxGeometry(0.045, 0.06, 0.05), MAGD, tx, -0.165, 0.2));
    root.add(lg); legs.push(lg);
  }
  const arms = [];
  for (const sx of [-1, 1]) {
    const ar = new THREE.Group(); ar.position.set(sx * 0.2, 0.69, 0);
    const ang = 0.3, dx = Math.sin(ang) * sx, dy = -Math.cos(ang);
    const along = t => [dx * t, dy * t, 0];
    ar.add(cm(new THREE.IcosahedronGeometry(0.125, 1), armC, 0, -0.01, 0));                       // shoulder cap hides the joint
    const a = cm(new THREE.CylinderGeometry(0.105, 0.078, 0.34, 7), armC, ...along(0.17)); a.rotation.z = sx * ang; ar.add(a);
    const cf = cm(new THREE.CylinderGeometry(0.098, 0.098, 0.06, 7), MAG, ...along(0.355)); cf.rotation.z = sx * ang; ar.add(cf);
    const hd = cm(new THREE.IcosahedronGeometry(0.11, 0), MAG, ...along(0.455)); hd.position.z = 0.015; hd.scale.set(1, 1.1, 0.95); ar.add(hd);
    ar.add(cm(new THREE.BoxGeometry(0.045, 0.085, 0.05), MAG, along(0.43)[0] - sx * 0.07, along(0.43)[1], 0.075));
    body.add(ar); arms.push(ar);
  }
  const head = new THREE.Group(); head.position.y = 1.0; root.add(head);
  const hairG = new THREE.Group(); head.add(hairG);
  const mass = cm(new THREE.IcosahedronGeometry(0.44, 1), hairC, 0, 0.06, -0.12); mass.scale.set(1.08, 0.95, 0.98); hairG.add(mass);
  if (o.faceGrad && !o.bald) mass.material = new THREE.MeshToonMaterial({ map: skullRainbow(o.faceGrad), gradientMap: toonGrad4, emissive: 0x303030 });                 // a Multi Colored radioactive head is rainbow all over
  if (o.bald) { hairG.remove(mass); const cr = cm(new THREE.SphereGeometry(0.43, 14, 10), FACEL, 0, 0.07, -0.06); cr.scale.set(1.12, 1.0, 1.0); hairG.add(cr); if (o.faceGrad) cr.material = new THREE.MeshToonMaterial({ map: skullRainbow(o.faceGrad), gradientMap: toonGrad4, emissive: 0x303030 }); }                // a skull: a bare round head, no hair
  const hc = new THREE.Color(hairC), hsl = {}; hc.getHSL(hsl);
  const shadeC = k => new THREE.Color().setHSL(hsl.h, hsl.s, Math.min(0.85, Math.max(0.1, hsl.l * k))).getHex();
  const top = hasHat ? 0.55 : 1;
  const blades = [
    [[0, 0.4, -0.14], [0, 1, -0.55], 0.5 * top, 0.32, -0.55, 1.0],
    [[-0.2, 0.38, -0.12], [-0.55, 1, -0.5], 0.42 * top, 0.28, -0.5, 0.9],
    [[0.2, 0.38, -0.12], [0.55, 1, -0.5], 0.42 * top, 0.28, -0.5, 1.1],
    [[0, 0.3, -0.36], [0, 0.7, -1], 0.55 * top, 0.34, -0.4, 0.85],
    [[-0.4, 0.18, -0.08], [-1, 0.4, -0.3], 0.56, 0.26, -0.3, 1.05],
    [[0.4, 0.18, -0.08], [1, 0.4, -0.3], 0.56, 0.26, -0.3, 1.05],
    [[-0.4, -0.06, -0.08], [-1, -0.1, -0.3], 0.46, 0.22, -0.3, 0.85],
    [[0.4, -0.06, -0.08], [1, -0.1, -0.3], 0.46, 0.22, -0.3, 0.85],
    [[-0.22, -0.2, -0.32], [-0.5, -0.5, -1], 0.4, 0.2, -0.2, 0.8],
    [[0.22, -0.2, -0.32], [0.5, -0.5, -1], 0.4, 0.2, -0.2, 0.8],
  ];
  let bi = 0; const rainbow = () => new THREE.Color().setHSL((bi++ * 0.093) % 1, 0.78, 0.56).getHex(), palette = () => o.hairPalette[bi++ % o.hairPalette.length], hk = o.hairScale || 1;     // palette: a flame's or a devil's own hair colours
  if (!o.bald) for (const [p, d, L, W, bend, k] of blades) {
    const b = cm(blade(L * hk, W * 1.15 * (hk > 1 ? 1.15 : 1), 0.16, bend), o.hairMulti ? rainbow() : o.hairPalette ? palette() : shadeC(0.92 + (k - 0.8) * 0.4), p[0], p[1], p[2], true); b.userData.noOutline = true;
    orientBlade(b, new THREE.Vector3(d[0], d[1], d[2]));
    hairG.add(b);
  }
  if (!o.bald) for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, dxh = Math.sin(a), dzh = Math.cos(a); if (dzh > 0.3) continue;
    const b = cm(blade(0.42 * hk, 0.34, 0.16, -0.3), o.hairMulti ? rainbow() : o.hairPalette ? palette() : shadeC(0.9 + 0.2 * Math.abs(Math.sin(i * 2.3))), dxh * 0.4, 0.12 + 0.12 * Math.sin(i * 1.7), dzh * 0.36 - 0.12, true); b.userData.noOutline = true;
    orientBlade(b, new THREE.Vector3(dxh, 0.4, dzh * 0.8 - 0.25)); hairG.add(b);
  }
  const face = new THREE.Group(); face.position.set(0, -0.02, 0.35); head.add(face);
  { const fm = cm(FACE_GEO, o.bald ? new THREE.Color(FACEL).multiplyScalar(0.84).getHex() : FACEL); fm.receiveShadow = false; if (o.bald) fm.userData.noOutline = true; face.add(fm); }          // a bald skull's face plate has no ink line of its own: it sits in the round skull          // the face never sits in the hair's shadow
  if (o.faceGrad) face.add(faceGradient(o.faceGrad));
  const hl = shadeC(0.95);
  if ((o.fringe || (bl && bl.fringe)) && !hasHat && !o.bald) face.add(hairFringe(hl));          // bangs only where headwear leaves the forehead open (hoods, helmet, toad suits); under a cap the art shows none
  let eyes = [];
  if (o.eyeStyle) eyes = chogEyes(face, o);
  else for (const sx of [-1, 1]) {
    const e = decal(new THREE.CircleGeometry(1, 18), 0x120820, sx * 0.125, 0.02, 0.036, 0.07, 0.095); e.userData.by = 0.095; face.add(e); eyes.push(e);
    face.add(decal(new THREE.CircleGeometry(0.033, 12), 0xffffff, sx * 0.108, 0.06, 0.044));
    face.add(decal(new THREE.CircleGeometry(0.014, 8), 0xffffff, sx * 0.148, -0.025, 0.044));
    const br = decal(new THREE.PlaneGeometry(0.12, 0.02), 0x120820, sx * 0.125, 0.135, 0.036); br.rotation.z = -sx * (o.angry ? 0.35 : 0.1); face.add(br);
    face.add(decal(new THREE.CircleGeometry(0.065, 14), 0xd93d86, sx * 0.205, -0.1, 0.033, 1, 0.85));
  }
  const nose = decal(new THREE.CircleGeometry(0.032, 3), o.noseC ?? 0xe0509a, 0, -0.055, 0.036); nose.rotation.z = Math.PI / 2 * 3 + Math.PI / 6; face.add(nose);
  if (o.mouth || o.cigar) chogMouth(face, o);
  else { const mo = decal(new THREE.TorusGeometry(0.065, 0.009, 4, 10, Math.PI), 0x2a1230, 0.015, -0.115, 0.036, 1, 0.55); mo.rotation.z = Math.PI; face.add(mo); }
  if (o.head === 'clownnose') { const cn = cm(new THREE.SphereGeometry(0.1, 12, 9), 0xe8202a, 0, -0.06, 0.1); cn.userData.noOutline = true; face.add(cn); face.add(decal(new THREE.CircleGeometry(0.026, 8), 0xffffff, -0.035, -0.02, 0.196, 1, 0.7)); }
  if (o.head === 'thirdeye') { face.add(decal(new THREE.CircleGeometry(1, 16), 0x1a1030, 0, 0.115, 0.045, 0.1, 0.056)); face.add(decal(new THREE.CircleGeometry(1, 16), 0xffffff, 0, 0.115, 0.047, 0.088, 0.046)); face.add(decal(new THREE.CircleGeometry(0.026, 10), 0x1a1030, 0, 0.115, 0.049)); face.add(decal(new THREE.CircleGeometry(0.009, 6), 0xffffff, -0.01, 0.125, 0.05)); }
  CM_K = EXPO;
  if (bl && bl.fringe && !hatLook) { /* fringe is added below the face block; see o.fringe */ }
  if (bl) bodyBuild({ root, body, head, hairG, face, arms, legs, o, hasHat }, bl, o.bodyName);
  if (hatLook) hatLook(head, o);
  else if (o.head === 'straw') {
    head.add(cm(new THREE.CylinderGeometry(0.56, 0.56, 0.035, 12), 0xe8c46c, 0, 0.4, 0));
    head.add(cm(new THREE.CylinderGeometry(0.28, 0.31, 0.2, 10), 0xe8c46c, 0, 0.5, 0));
    head.add(cm(new THREE.CylinderGeometry(0.315, 0.315, 0.05, 10), 0xc04a4a, 0, 0.44, 0));
  } else if (o.head === 'crown') {
    const rg = cm(new THREE.TorusGeometry(0.27, 0.04, 5, 10), trim, 0, 0.37, -0.04); rg.rotation.x = Math.PI / 2; head.add(rg);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; head.add(cm(new THREE.ConeGeometry(0.06, 0.17, 4), trim, Math.cos(a) * 0.27, 0.47, Math.sin(a) * 0.27 - 0.04)); }
    head.add(cm(new THREE.OctahedronGeometry(0.05), 0xe84a60, 0, 0.4, 0.25));
  } else if (o.head === 'headset') {
    head.add(cm(new THREE.TorusGeometry(0.46, 0.03, 5, 14, Math.PI), 0x30304a, 0, 0.06, -0.02));
    for (const sx of [-1, 1]) { const cup = cm(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 8), 0x30304a, sx * 0.48, 0, -0.02); cup.rotation.z = Math.PI / 2; head.add(cup); }
  } else if (o.head === 'cap') {
    head.add(cm(new THREE.CylinderGeometry(0.3, 0.34, 0.18, 8), o.capC || 0x3a8ad6, 0, 0.42, -0.02));
    head.add(cm(new THREE.BoxGeometry(0.4, 0.04, 0.26), o.capC || 0x3a8ad6, 0, 0.36, 0.34));
    if (o.logoC !== undefined) head.add(decal(new THREE.CircleGeometry(0.07, 12), o.logoC, 0, 0.45, 0.285));
  } else if (o.head && o.head !== 'none' && !['clownnose', 'thirdeye', 'wig'].includes(o.head)) chogHead(head, o, trim);
  CM_K = 1;
  if (o.item === 'mug') { const m = cm(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8), 0xe8d8b0, 0, 0, 0); m.position.set(0.17, -0.4, 0.14); arms[1].add(m); }
  if (o.accName && typeof ITEM_LOOK !== 'undefined' && ITEM_LOOK[o.accName]) ITEM_LOOK[o.accName](arms[1], o);
  else if (o.acc) chogAccessory(arms[1], face, o);
  if (o.special && typeof CHOG_SPECIAL !== 'undefined' && CHOG_SPECIAL[o.special]) CHOG_SPECIAL[o.special]({ root, body, head, face, hairG, arms, legs, o });      // one of the ten one-of-one Chogs (chog_legends.js)
  root.userData = { body, head, hairG, legs, arms, eyes, face };
  if (typeof chogAuraLook !== 'undefined' && o.auraName && chogAuraLook(root, o)) { /* chog_auras.js: this Aura value has its own splash */ } else if (o.aura !== undefined) chogAura(root, o);
  addOutlines(root);
  tagChogLayers(root, face);
  root.scale.setScalar(o.scale || CHOG_SCALE);
  return root;
}
