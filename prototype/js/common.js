// ===== common: rng, materials, textures, helpers =====
let _seed = 12345;
const rnd = () => (_seed = (_seed * 16807) % 2147483647) / 2147483647;
const rr = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];

// render style, chosen by ?style=hybrid|pixel|smooth|paint|flat|comic|mini (default hybrid = the locked look)
const STYLE = new URLSearchParams(location.search).get('style') || 'hybrid';
const PIXEL = STYLE === 'pixel';
const SOFT_SHADE = STYLE === 'smooth' || STYLE === 'mini' || STYLE === 'paint' || STYLE === 'hybrid';
const HULL_T = STYLE === 'hybrid' ? 0.055 : 0.035;   // Chog ink outline thickness (world units)

const toonGrad4 = (() => {
  const d = new Uint8Array(SOFT_SHADE ? [120, 165, 215, 255] : [95, 150, 210, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.LuminanceFormat);
  t.minFilter = t.magFilter = SOFT_SHADE ? THREE.LinearFilter : THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
})();

function setShadeSoft(soft) {                         // toon ramp: soft bands for painterly styles, hard bands for flat and comic
  toonGrad4.image.data.set(soft ? [120, 165, 215, 255] : [95, 150, 210, 255]); toonGrad4.minFilter = toonGrad4.magFilter = soft ? THREE.LinearFilter : THREE.NearestFilter; toonGrad4.needsUpdate = true;
}

const _mc = {};
function tmat(color, o = {}) {
  const key = color + '|' + (o.em ?? '') + '|' + (o.ds ? 1 : 0) + '|' + (o.tex ? o.tex.uuid : '');
  if (!o.noCache && _mc[key]) return _mc[key];
  const m = new THREE.MeshToonMaterial({
    color, gradientMap: toonGrad4, map: o.tex || null,
    emissive: new THREE.Color(color).multiplyScalar(o.em ?? 0.13),
    side: o.ds ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (!o.noCache) _mc[key] = m;
  return m;
}
const glowMat = c => new THREE.MeshBasicMaterial({ color: c });

function M(geo, mat, x = 0, y = 0, z = 0, cast = true, recv = true) {
  const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = recv; return o;
}
const BOX = (w, h, d, mat, x = 0, y = 0, z = 0) => M(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
const CYL = (rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 8) => M(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
const SPH = (r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const m = M(new THREE.SphereGeometry(r, 10, 8), mat, x, y, z); m.scale.set(sx, sy, sz); return m; };
const ICO = (r, mat, x = 0, y = 0, z = 0, d = 0) => M(new THREE.IcosahedronGeometry(r, d), mat, x, y, z);

function paint(w, h, fn, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; fn(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  const f = PIXEL ? THREE.NearestFilter : THREE.LinearFilter;
  t.magFilter = f; t.minFilter = f; t.generateMipmaps = false;
  return t;
}
function reTex(tex, rx, ry) { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return t; }

// grayscale detail textures (multiplied by material colour)
const TEX = {};
TEX.grass = paint(128, 128, (g, w, h) => {
  g.fillStyle = '#86b255'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) { g.fillStyle = rnd() < .5 ? 'rgba(110,160,70,.55)' : 'rgba(170,205,100,.45)'; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, rr(8, 22), rr(6, 14), 0, 0, 7); g.fill(); }
  for (let i = 0; i < 520; i++) { g.fillStyle = ['#6f9c46', '#9ac860', '#78a84c', '#b2d87a'][i % 4]; const x = rnd() * w, y = rnd() * h; g.fillRect(x, y, 1, 3); g.fillRect(x + 1, y + 1, 1, 2); }
}, 5, 5);
TEX.cobble = paint(128, 128, (g, w, h) => {
  g.fillStyle = '#a89070'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 22) {
    const ox = ((y / 16) % 2) ? 11 : 0;
    g.fillStyle = ['#d6bf98', '#c8ae88', '#b89e7a', '#d0b690', '#c2a880'][Math.floor(rnd() * 5)];
    g.fillRect(x + ox + 1, y + 1, 20, 14);
    g.fillStyle = 'rgba(255,240,210,.35)'; g.fillRect(x + ox + 1, y + 1, 20, 2);
    g.fillStyle = '#7e6a50'; g.fillRect(x + ox, y + 15, 22, 1); g.fillRect(x + ox + 21, y, 1, 16);
  }
}, 4, 4);
TEX.plaster = paint(64, 64, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${200 + rnd() * 40 | 0},${190 + rnd() * 40 | 0},${170 + rnd() * 40 | 0},.5)`; g.fillRect(rnd() * w, rnd() * h, rr(1, 3), rr(1, 3)); }
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(160,140,120,.18)'; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, rr(6, 14), rr(3, 8), 0, 0, 7); g.fill(); }
});
TEX.brick = paint(64, 64, (g, w, h) => {
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 16) {
    const ox = ((y / 8) % 2) ? 8 : 0; const v = 205 + rnd() * 50 | 0;
    g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x + ox, y, 15, 7);
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x + ox, y, 15, 1);
    g.fillStyle = '#8a8a8a'; g.fillRect(x + ox + 15, y, 1, 8); g.fillRect(x + ox, y + 7, 16, 1);
  }
});
TEX.roof = paint(64, 64, (g, w, h) => {
  g.fillStyle = '#e0e0e0'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 16) {
    const ox = ((y / 8) % 2) ? 8 : 0; const v = 215 + rnd() * 40 | 0;
    g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x + ox, y, 15, 8);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + ox, y, 15, 1);
    g.fillStyle = 'rgba(90,90,90,.9)'; g.fillRect(x + ox, y + 7, 15, 1); g.fillRect(x + ox + 15, y, 1, 8);
  }
});
TEX.wood = paint(64, 64, (g, w, h) => {
  g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 8) { g.fillStyle = `rgba(0,0,0,${.08 + rnd() * .1})`; g.fillRect(x, 0, 1, h); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 1, 0, 1, h); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(rnd() * w, rnd() * h, 1, rr(2, 6)); }
});
TEX.rock = paint(64, 64, (g, w, h) => {
  g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { const v = 150 + rnd() * 90 | 0; g.fillStyle = `rgba(${v},${v},${v},.7)`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, rr(4, 12), rr(3, 8), rnd() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(40,30,50,.35)'; g.fillRect(rnd() * w, rnd() * h, rr(6, 16), 1); }
});
TEX.water = paint(64, 64, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(150,215,240,${.3 + rnd() * .4})`; g.lineWidth = 1; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 2, x + 12, y); g.stroke(); }
});
TEX.fall = paint(32, 64, (g, w, h) => {
  g.fillStyle = '#bfe6ff'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 30; i++) { g.fillStyle = rnd() < .6 ? '#ffffff' : '#8cc8f0'; g.fillRect(rnd() * w, rnd() * h, rr(1, 3), rr(6, 18)); }
}, 1, 2);

TEX.ripple = paint(64, 64, (g, w, h) => {
  for (let i = 0; i < 34; i++) { g.strokeStyle = `rgba(255,255,255,${0.55 + rnd() * 0.4})`; g.lineWidth = 1.5; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 7, y - 3, x + 15, y); g.stroke(); }
});
// misc
function glowSprite(color, size, opacity = 1) {
  const t = paint(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, 1); s.userData.noNormal = true; return s;
}
// Static merge: meshes that never move relative to each other become one mesh per look (material, shadow flags, layers, attributes), so every pass draws them in
// one call. Equal-looking toon/basic materials count as one. Left alone: instanced, multi-material, transparent, glow (noNormal), mirrored meshes, meshes with
// children, and anything tagged userData.noMerge (with its subtree) or under a node in o.skip. Ink hulls merge only with hulls and stay hulls.
// Geometries are never disposed here (Chog parts share theirs). Run it before the meshes are registered anywhere (hiddenInNormal, occluders, pick lists).
function matSig(m) {
  if (m.type !== 'MeshToonMaterial' && m.type !== 'MeshBasicMaterial') return m.uuid;
  const u = t => t ? t.uuid : '';
  return [m.type, m.color.getHex(), m.emissive ? m.emissive.getHex() : '', m.emissiveIntensity, u(m.map), u(m.gradientMap), m.side, m.opacity, m.vertexColors, m.fog, m.depthTest, m.depthWrite, m.blending, m.alphaTest, m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits].join('|');
}
const MERGE = { _v: new THREE.Vector3(), _inv: new THREE.Matrix4(), _rel: new THREE.Matrix4() };
MERGE.ok = n => n.isMesh && !n.userData.rig && !n.isInstancedMesh && !n.isSkinnedMesh && !Array.isArray(n.material) && !n.material.transparent && !n.userData.noNormal && !n.userData.noMerge
  && n.visible && n.renderOrder === 0 && !n.children.length && n.geometry.isBufferGeometry && !Object.keys(n.geometry.morphAttributes).length
  && Object.values(n.geometry.attributes).every(a => !a.isInterleavedBufferAttribute) && n.matrixWorld.determinant() > 0;
MERGE.into = function (target, meshes, cell = 0) {                   // meshes (anywhere under target) -> merged meshes added to target
  const buckets = new Map(), canon = new Map();
  for (const n of meshes) {
    const ms = matSig(n.material); let at = '';
    if (cell) { n.getWorldPosition(MERGE._v); at = Math.floor(MERGE._v.x / cell) + ',' + Math.floor(MERGE._v.z / cell); }
    const key = [ms, n.castShadow, n.receiveShadow, n.frustumCulled, n.layers.mask, !!n.userData.isHull, Object.keys(n.geometry.attributes).sort().join(','), at].join('#');
    if (!canon.has(ms)) canon.set(ms, n.material);
    if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(n);
  }
  const inv = MERGE._inv.copy(target.matrixWorld).invert(); let merged = 0;
  for (const [key, list] of buckets) {
    if (list.length < 2) continue;
    const parts = list.map(n => n.geometry.clone().applyMatrix4(MERGE._rel.multiplyMatrices(inv, n.matrixWorld)));
    let nv = 0, ni = 0; for (const p of parts) { nv += p.attributes.position.count; ni += p.index ? p.index.count : p.attributes.position.count; }
    const out = new THREE.BufferGeometry(), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    for (const a of Object.keys(parts[0].attributes)) {
      const s = parts[0].attributes[a], arr = new s.array.constructor(nv * s.itemSize); let off = 0;
      for (const p of parts) { arr.set(p.attributes[a].array, off); off += p.attributes[a].array.length; }
      out.setAttribute(a, new THREE.BufferAttribute(arr, s.itemSize, s.normalized));
    }
    let base = 0, k = 0;
    for (const p of parts) { const c = p.attributes.position.count; if (p.index) for (let i = 0; i < p.index.count; i++) idx[k++] = p.index.array[i] + base; else for (let i = 0; i < c; i++) idx[k++] = base + i; base += c; }
    out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeBoundingSphere(); out.computeBoundingBox();
    const f = list[0], m = new THREE.Mesh(out, canon.get(key.split('#')[0]));
    m.castShadow = f.castShadow; m.receiveShadow = f.receiveShadow; m.frustumCulled = f.frustumCulled; m.layers.mask = f.layers.mask;
    m.userData.merged = list.length; if (f.userData.isHull) m.userData.isHull = m.userData.noOutline = true;
    for (const n of list) n.parent.remove(n);
    target.add(m); m.updateMatrixWorld(); merged += list.length;
  }
  return merged;
};
// a whole static subtree into root (o.cell: split into ground cells of that size, so frustum culling still works across the town); empty groups are dropped
function mergeStatic(root, o = {}) {
  const skip = o.skip || new Set(), list = [];
  root.updateMatrixWorld(true);
  (function walk(n) { for (const c of n.children) { if (skip.has(c) || c.userData.noMerge || !c.visible) continue; if (MERGE.ok(c)) list.push(c); else walk(c); } })(root);
  const merged = MERGE.into(root, list, o.cell || 0);
  (function prune(n) { for (const c of n.children.slice()) { if (skip.has(c) || c.userData.noMerge) continue; prune(c); if (c.type === 'Group' && !c.children.length) n.remove(c); } })(root);
  return merged;
}
// a rigged model (a Chog): every node keeps its place and moves as before; only the plain meshes directly under one node merge, into that node.
// Tag the parts that animate on their own: userData.rig (kept, its children still merge) or userData.noMerge (kept with its whole subtree)
function mergeRigid(root) {
  root.updateMatrixWorld(true); let merged = 0;
  (function walk(n) { const kids = n.children.filter(MERGE.ok); merged += MERGE.into(n, kids); for (const c of n.children.slice()) if (!c.userData.noMerge && c.visible && !c.userData.merged) walk(c); })(root);
  return merged;
}
function addRot(parent, mesh, rx = 0, ry = 0, rz = 0) { mesh.rotation.set(rx, ry, rz); parent.add(mesh); return mesh; }
const animated = [];       // fn(t, dt)
const noNormalPass = [];   // objects hidden during the normal pass
const hiddenInNormal = []; // ink hulls and glow objects the normal pass must skip (each scene fills it after building)
const smokeSources = [];
const lights = [];
