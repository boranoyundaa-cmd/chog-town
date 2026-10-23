// ===== the aura of every Aura trait value, one by one (22 values) =====
// In the official art the aura is a splash behind the Chog: blobs and drips of paint, flames, bolts, crystal shards, bubbles, petals, wind curls, in two or three colours.
// Each value is a row of AURA_LOOK (its colours and the kind of splash); the splash is a painted sprite behind the Chog plus a ring on the ground and a few moving bits.
// chog.js calls chogAuraLook(root, o) for a value listed here; unknown values fall back to the older single-colour glow in chog_parts.js.
const AURA_LOOK = {
  'Aqua Aura': { c: [0x30d8e8, 0xb0f060, 0xffffff], st: 'wave' }, 'Burning Aura': { c: [0xe040d0, 0xff8a20, 0xffd040], st: 'splat' }, Clean: { c: [0xd0f0c0, 0xffffff, 0xb0e8f0], st: 'splat', soft: true },
  'Cool Aura': { c: [0x70e0f0, 0xf8a0d0, 0x4a8af0], st: 'splat' }, 'Electric Shock': { c: [0xffe030, 0xffffff, 0xffa020], st: 'bolt' }, 'Fiery Aura': { c: [0xff3020, 0xffd030, 0xff8020], st: 'flame' },
  Fire: { c: [0xf02818, 0xff8020, 0xffd030], st: 'flame' }, 'Green Aura': { c: [0x90f030, 0x30c840, 0xd8ff80], st: 'splat' }, 'Light Purple': { c: [0xd8b8f8, 0xf8d0f0, 0xffffff], st: 'splat', soft: true },
  Mint: { c: [0x80f0c0, 0xf0f080, 0xffffff], st: 'splat' }, 'Pink Mist': { c: [0xff90d0, 0xf8e060, 0xffffff], st: 'smoke' }, Purple: { c: [0xe030e0, 0x8a30e8, 0xff90ff], st: 'splat' },
  'Rose Aura': { c: [0xf8b0c0, 0xfff0d0, 0xff90a8], st: 'splat', soft: true }, 'Rose Scent': { c: [0xff90b0, 0x70e0f0, 0xffffff], st: 'petal' }, 'Royal Aura': { c: [0x3a50f0, 0xa060f0, 0x80a0ff], st: 'splat' },
  'Royal Blue': { c: [0x2a80f0, 0xf890c0, 0x80c0ff], st: 'shard' }, 'Royal Blue Aura': { c: [0x2840d8, 0x8040d8, 0x60a0ff], st: 'splat' }, Smoke: { c: [0xd8c8f0, 0xb0a0e0, 0xffffff], st: 'smoke', soft: true },
  Violet: { c: [0xe030f0, 0x30e0e0, 0xa040ff], st: 'splat' }, 'White Aura': { c: [0xffffff, 0xf04040, 0xffd0d0], st: 'splat' }, Wind: { c: [0xc8f060, 0xf0fff0, 0xffffff], st: 'swirl' },
  'Yellow Aura': { c: [0xf8f080, 0xfff8c0, 0xffe040], st: 'splat', soft: true },
};
const AURA_TEX = {};
function auraTexture(name, s) {
  if (AURA_TEX[name]) return AURA_TEX[name];
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d'), r = rng(hashStr(name)), C = 256, col = i => hx(s.c[i % s.c.length]);
  const blob = (x, y, rad, c) => { g.fillStyle = c; g.beginPath(); const n = 8, pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = rad * (0.75 + r() * 0.4); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
    g.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2); for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } g.fill(); };
  const ring = (rmin, rmax) => { const a = r() * Math.PI * 2, d = rmin + r() * (rmax - rmin); return [C + Math.cos(a) * d, C + Math.sin(a) * d * 0.95, a]; };
  const st = s.st;
  if (st === 'splat') {
    for (let i = 0; i < 7; i++) { const [x, y, a] = ring(110, 190), rad = 34 + r() * 40; blob(x, y, rad, col(i % 2)); if (r() < 0.7) blob(x + Math.cos(a) * rad * 0.3, y + Math.sin(a) * rad * 0.3, rad * 0.5, col(2)); }
    for (let i = 0; i < 22; i++) { const [x, y] = ring(130, 240); blob(x, y, 5 + r() * 12, col(i)); }
    for (let i = 0; i < 4; i++) { const [x, y] = ring(130, 200); g.fillStyle = col(i); g.fillRect(x - 5, y, 10, 36 + r() * 60); g.beginPath(); g.arc(x, y + 36 + r() * 60 - 2, 8, 0, Math.PI * 2); g.fill(); }
  } else if (st === 'wave') {
    g.lineCap = 'round'; for (let k = 0; k < 6; k++) { g.strokeStyle = col(k % 2); g.lineWidth = 16 - k; g.beginPath(); const a0 = r() * Math.PI * 2, d = 140 + k * 14; for (let t = 0; t <= 1.001; t += 0.05) { const a = a0 + t * 2.4, rr = d + Math.sin(t * 14 + k) * 14; const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr * 0.95; t === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 16; i++) { const [x, y] = ring(150, 235); blob(x, y, 5 + r() * 9, col(i + 1)); }
  } else if (st === 'flame') {
    for (let i = 0; i < 13; i++) { const x = C + (i - 6) * 36 + (r() - 0.5) * 20, base = C + 150 + r() * 70 - Math.abs(i - 6) * 8, h = 150 + r() * 130 - Math.abs(i - 6) * 14, w = 36 + r() * 18;
      for (let k = 0; k < 3; k++) { g.fillStyle = col(k === 0 ? 0 : k === 1 ? 2 : 1); const s2 = 1 - k * 0.28; g.beginPath(); g.moveTo(x - w * s2, base); g.quadraticCurveTo(x - w * s2 * 0.9, base - h * 0.5 * s2, x + (r() - 0.5) * 18, base - h * s2); g.quadraticCurveTo(x + w * s2 * 0.9, base - h * 0.5 * s2, x + w * s2, base); g.closePath(); g.fill(); } }
    for (let i = 0; i < 14; i++) { const [x, y] = ring(140, 240); blob(x, y - 20, 4 + r() * 8, col(i)); }
  } else if (st === 'bolt') {
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + r() * 0.4; g.strokeStyle = col(k % 2 ? 1 : 0); g.lineWidth = 12; g.lineJoin = 'round'; g.beginPath(); let x = C + Math.cos(a) * 110, y = C + Math.sin(a) * 110; g.moveTo(x, y);
      for (let t = 1; t <= 5; t++) { const rr = 110 + t * 28; x = C + Math.cos(a + (r() - 0.5) * 0.35) * rr; y = C + Math.sin(a + (r() - 0.5) * 0.35) * rr; g.lineTo(x, y); } g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.stroke(); }
    for (let i = 0; i < 6; i++) { const [x, y] = ring(140, 215); blob(x, y, 14 + r() * 22, col(i)); }
  } else if (st === 'shard') {
    for (let i = 0; i < 16; i++) { const [x, y, a] = ring(125, 215), len = 30 + r() * 60, wd = 12 + r() * 20; g.fillStyle = col(i % 2); g.beginPath(); g.moveTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.lineTo(x + Math.cos(a + 1.6) * wd, y + Math.sin(a + 1.6) * wd); g.lineTo(x + Math.cos(a - 0.4) * -wd * 0.4, y + Math.sin(a - 0.4) * -wd * 0.4); g.lineTo(x + Math.cos(a - 1.6) * wd, y + Math.sin(a - 1.6) * wd); g.closePath(); g.fill(); g.strokeStyle = col(2); g.lineWidth = 3; g.stroke(); }
  } else if (st === 'smoke') {
    for (let i = 0; i < 16; i++) { const [x, y] = ring(105, 215), rad = 22 + r() * 40; g.fillStyle = hx(s.c[i % 2]); g.globalAlpha = 0.55; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill(); g.globalAlpha = 0.9; g.strokeStyle = col(2); g.lineWidth = 3; g.stroke(); }
    g.globalAlpha = 1; for (let i = 0; i < 14; i++) { const [x, y] = ring(140, 240); g.fillStyle = col(i); g.beginPath(); g.arc(x, y, 4 + r() * 8, 0, Math.PI * 2); g.fill(); }
  } else if (st === 'petal') {
    for (let i = 0; i < 24; i++) { const [x, y, a] = ring(115, 225); g.save(); g.translate(x, y); g.rotate(a + r()); g.fillStyle = col(i % 2); g.beginPath(); g.ellipse(0, 0, 32 + r() * 18, 13 + r() * 7, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = col(2); g.lineWidth = 2; g.stroke(); g.restore(); }
  } else if (st === 'swirl') {
    g.lineCap = 'round'; for (let k = 0; k < 8; k++) { g.strokeStyle = col(k % 2); g.lineWidth = 9 - (k % 3) * 2; const a0 = r() * Math.PI * 2, d = 120 + (k % 4) * 26; g.beginPath(); g.arc(C, C, d, a0, a0 + 1.4 + r()); g.stroke(); }
    for (let i = 0; i < 18; i++) { const [x, y] = ring(120, 235); blob(x, y, 4 + r() * 9, col(i)); }
  }
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return AURA_TEX[name] = t;
}
function chogAuraLook(root, o) {
  const s = AURA_LOOK[o.auraName]; if (!s) return false;
  const g = new THREE.Group(), sc = s.c, bits = []; root.add(g);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: auraTexture(o.auraName, s), transparent: true, opacity: s.soft ? 0.45 : 0.55, depthWrite: false })); sp.scale.set(2.3, 2.3, 1); sp.position.set(0, 0.95, -0.55); sp.userData.noNormal = true; g.add(sp);
  const ringM = glowM(new THREE.RingGeometry(0.44, 0.58, 24), sc[0], 0.3); ringM.rotation.x = -Math.PI / 2; ringM.position.y = 0.02; g.add(ringM);
  const st = s.st;
  if (st === 'flame') for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, f = glowM(new THREE.ConeGeometry(0.07, 0.4, 4), i % 2 ? sc[2] : sc[0], 0.8); f.position.set(Math.cos(a) * 0.5, 0.2, Math.sin(a) * 0.5); g.add(f); bits.push([f, i]); }
  if (st === 'swirl') for (let i = 0; i < 3; i++) { const w = glowM(new THREE.TorusGeometry(0.55 + i * 0.08, 0.012, 4, 24, 4.4), sc[i % 2], 0.4); w.rotation.x = Math.PI / 2; w.position.y = 0.35 + i * 0.4; g.add(w); bits.push([w, i]); }
  if (st === 'smoke') for (let i = 0; i < 6; i++) { const b = glowM(new THREE.SphereGeometry(0.1, 6, 5), sc[i % 2], 0.35); g.add(b); bits.push([b, i]); }
  if (st === 'petal') for (let i = 0; i < 7; i++) { const b = glowM(new THREE.CircleGeometry(0.07, 5), sc[i % 2], 0.8); b.scale.set(1, 0.55, 1); g.add(b); bits.push([b, i]); }
  root.userData.tick = t => {
    sp.material.rotation = Math.sin(t * 0.35) * 0.05; const k = 1 + 0.025 * Math.sin(t * 1.7); sp.scale.set(3.0 * k, 3.0 * k, 1);
    if (st === 'bolt') sp.material.opacity = 0.55 + 0.4 * Math.abs(Math.sin(t * 9) * Math.sin(t * 3.1));
    for (const [b, i] of bits) {
      if (st === 'flame') { b.scale.y = 0.75 + 0.45 * Math.abs(Math.sin(t * 6 + i * 1.7)); b.position.y = 0.05 + 0.2 * b.scale.y; }
      else if (st === 'swirl') b.rotation.z = t * (1.6 - i * 0.4) + i * 2;
      else { const p = (t * 0.35 + i / 6) % 1, a = i * 1.9; b.position.set(Math.cos(a) * 0.45, 0.1 + p * 1.3, Math.sin(a) * 0.45); b.material.opacity = 0.4 * (1 - p); b.scale.setScalar(st === 'petal' ? 1 : 0.7 + p); if (st === 'petal') b.rotation.z = t + i; }
    }
  };
  return true;
}
