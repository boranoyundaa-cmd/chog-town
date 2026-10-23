// ===== the headwear of every Head trait value, one by one (66 values) =====
// The official art draws big hats with their words on them: baseball caps (BOOB, JEET, MCGA, WAGMI ...), bucket hats, knit beanies, wraps, horns and one-offs
// (a plunger, a banana, mushrooms). Each value is a row here: a shape (cap | bucket | beanie | ...) plus its colours and words, compared with the art with
// tools/value_sheet.py list|sheet Head. chog.js calls HAT_LOOK[o.hatName](head, o); values not listed fall back to the older keyword hats in chog_parts.js.
// Head-local axes: x right, y up, z towards the camera; the forehead is at about y = 0.2, z = 0.37 and the hair mass reaches y = 0.48.
function labelMesh(text, w, h, fg, bg, font = '700 64px "Bungee", "Fredoka", Impact, sans-serif') {
  const lines = String(text).split('\n'), cv = document.createElement('canvas'); cv.width = 256; cv.height = Math.round(256 * h / w);
  const draw = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height); }
    let px = Math.min(cv.height / lines.length * 0.82, 84); g.font = font.replace(/\d+px/, px + 'px'); while (px > 14 && Math.max(...lines.map(l => g.measureText(l).width)) > cv.width * 0.94) { px -= 3; g.font = font.replace(/\d+px/, px + 'px'); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, cv.width / 2, cv.height * (i + 0.5) / lines.length + 2)); };
  draw(); const tex = new THREE.CanvasTexture(cv); if (document.fonts) document.fonts.load('64px "Bungee"').then(() => { draw(); tex.needsUpdate = true; }).catch(() => { });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })); m.userData.noOutline = true; return m;
}
const hx = c => '#' + new THREE.Color(c).getHexString();
const HAT = {
  dome(head, r, y, c, sy = 0.85, z = -0.1) { const m = cm(new THREE.SphereGeometry(r, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2), c, 0, y, z); m.scale.set(1, sy, 1.04); head.add(m); return m; },
  ring(head, r, tube, y, c, z = -0.08, sy = 1) { const t = cm(new THREE.TorusGeometry(r, tube, 6, 18), c, 0, y, z); t.rotation.x = Math.PI / 2; t.scale.set(1, 1, sy); head.add(t); return t; },
  // a baseball cap: a big crown with words on the front panel and a curved bill
  cap(head, o, s) {
    HAT.dome(head, 0.49, 0.16, s.c, 0.9); HAT.ring(head, 0.485, 0.03, 0.16, s.c, -0.1);
    const bill = cm(new THREE.CylinderGeometry(0.44, 0.44, 0.045, 14, 1, false, -0.95, 1.9), s.b ?? s.c, 0, 0.19, 0.0); bill.scale.set(1, 1, 0.85); bill.position.set(0, 0.2, 0.06); bill.rotation.x = 0.1; bill.rotation.y = Math.PI; head.add(bill);
    const btn = cm(new THREE.SphereGeometry(0.035, 6, 5), s.b ?? s.c, 0, 0.6, -0.1); head.add(btn);
    if (s.t) { const l = labelMesh(s.t, 0.36, s.t.includes('\n') ? 0.26 : 0.18, hx(s.tc ?? 0xffffff)); l.position.set(0, 0.43, 0.33); l.rotation.x = -0.62; head.add(l); }
  },
  // a bucket hat: a short crown and a brim all around, slightly drooping
  bucket(head, o, s) {
    head.add(cm(new THREE.CylinderGeometry(0.38, 0.46, 0.3, 14), s.c, 0, 0.4, -0.1));
    const brim = cm(new THREE.CylinderGeometry(0.66, 0.66, 0.035, 18), s.b ?? s.c, 0, 0.27, -0.04); brim.rotation.x = 0.08; head.add(brim);
    head.add(cm(new THREE.CylinderGeometry(0.385, 0.385, 0.05, 14), s.band ?? new THREE.Color(s.c).multiplyScalar(0.75).getHex(), 0, 0.3, -0.1));
    if (s.t) { const l = labelMesh(s.t, 0.4, 0.2, hx(s.tc ?? 0xffffff), s.tbg || null); l.position.set(0, 0.42, 0.37); l.rotation.x = -0.18; head.add(l); }
  },
  // a knit beanie with a ribbed cuff
  beanie(head, o, s) {
    HAT.dome(head, 0.5, 0.2, s.c, 0.95);
    const cuff = cm(new THREE.CylinderGeometry(0.5, 0.52, 0.17, 16), s.cuff ?? s.c, 0, 0.2, -0.1); head.add(cuff);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; head.add(decal(new THREE.PlaneGeometry(0.018, 0.15), s.rib ?? 0x24222e, Math.sin(a) * 0.525, 0.2, Math.cos(a) * 0.525 - 0.1)); head.children[head.children.length - 1].rotation.y = a; }
    if (s.pom) head.add(cm(new THREE.SphereGeometry(0.08, 8, 6), s.pom, 0, 0.7, -0.1));
    if (s.t) { const l = labelMesh(s.t, 0.2, 0.2, hx(s.tc ?? 0xffffff), s.tbg || null); l.position.set(0, 0.33, 0.41); l.rotation.x = -0.12; head.add(l); }
  },
  horns(head, o, s) {                                                                    // two curled ram horns
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const t = i / 3, a = t * 1.8, r = 0.24 - t * 0.12; const seg = cm(new THREE.CylinderGeometry(0.075 - t * 0.04, 0.09 - t * 0.04, 0.17, 7), i % 2 ? new THREE.Color(s.c).multiplyScalar(0.85).getHex() : s.c, sx * (0.32 + Math.sin(a) * 0.2), 0.48 + t * 0.2 - Math.cos(a) * 0.05, -0.05); seg.rotation.z = -sx * (0.5 + a * 0.7); head.add(seg); }
  },
  spikes(head, o, s) { for (const [x, y, r, h, rz] of s.list) { const c = cm(new THREE.ConeGeometry(r, h, 7), s.c, x, y, -0.06); c.rotation.z = rz; head.add(c); head.add(cm(new THREE.CylinderGeometry(r * 1.02, r * 1.25, 0.04, 7), new THREE.Color(s.c).multiplyScalar(0.7).getHex(), x - Math.sin(rz) * h * -0.45 * 0 + 0, y - h * 0.5 * Math.cos(rz), -0.06)); } },
  band(head, o, s) {                                                                    // a headband / bandana around the forehead with a knot and tails
    if (o && o.radio) {                                                                 // on a radioactive head the wrap is see-through red across the forehead, above the eyes, as in the art
      const w = cm(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 20, 1, true), s.c, 0, 0.27, -0.1, true); w.material = w.material.clone(); Object.assign(w.material, { transparent: true, opacity: 0.6, depthWrite: false }); w.userData.noOutline = true; w.scale.set(1, 1, 1.02); head.add(w);
      HAT.ring(head, 0.5, 0.02, 0.37, s.c, -0.1, 1.02); HAT.ring(head, 0.51, 0.02, 0.17, s.c, -0.1, 1.02);
    } else HAT.ring(head, 0.5, 0.045, 0.2, s.c, -0.1, 1.05);
    if (s.dot) head.add(decal(new THREE.CircleGeometry(0.06, 14), s.dot, 0, 0.2, 0.43));
    if (s.knot) { head.add(cm(new THREE.SphereGeometry(0.075, 7, 6), s.c, -0.5, 0.2, -0.1)); for (const dy of [-0.07, -0.16]) { const t = cm(new THREE.BoxGeometry(0.07, 0.17, 0.03), s.c, -0.55, 0.18 + dy, -0.16); t.rotation.z = 0.2; head.add(t); } }
  },
  afro(head, o, s) { for (const [x, y, z, r, c] of s.puffs) head.add(cm(new THREE.IcosahedronGeometry(r, 1), c, x, y, z)); },
  gem(head, o, s) { const g = cm(new THREE.OctahedronGeometry(0.075), s.c, 0, 0.17, 0.4); g.scale.set(1, 1.3, 0.7); head.add(g); },
};
const CAP = (c, b, t, tc) => (head, o) => HAT.cap(head, o, { c, b, t, tc });
const BUCKET = (c, t, tc, extra = {}) => (head, o) => HAT.bucket(head, o, Object.assign({ c, t, tc }, extra));
const BEANIE = (c, extra = {}) => (head, o) => HAT.beanie(head, o, Object.assign({ c }, extra));
const HORNS = c => (head, o) => HAT.horns(head, o, { c });
const SPIKES = (c, list) => (head, o) => HAT.spikes(head, o, { c, list });
const HAT_LOOK = {
  '10k TPS Cap': CAP(0xdcdce2, 0x34343c, '10K\nTPS', 0x3a3aa8), 'BOOB Cap': CAP(0xe85a20, 0x7a3a18, 'BOOB', 0xfff0e0), BOOBCap: CAP(0xe85a20, 0x7a3a18, 'BOOB', 0xfff0e0),
  'BTC Cap': CAP(0xf08a20, 0x6a3a18, '₿', 0xffffff), 'Buttcoin Cap': CAP(0xf08a20, 0x5a3010, 'Buttcoin', 0xfff4e0), 'Chog Cap': CAP(0x7a3ac8, 0x2a1a4a, 'MAKE CHOG\nGREAT AGAIN', 0xf4f0ff),
  MCGA: CAP(0x7a3ac8, 0x2a1a4a, 'MAKE CHOG\nGREAT AGAIN', 0xf4f0ff), 'Choggie Cap': CAP(0xd8d8e0, 0xd04a7a, 'CHOG', 0x5a2a9a), 'ETH Cap': CAP(0xe8e8f0, 0xc8c8d4, 'Ξ', 0x7a7a8a),
  'Horny Cap': CAP(0x2a5ac8, 0x2a3a8a, 'HORNY', 0xf4b020), 'JEET Cap': CAP(0x2aa84a, 0x7ad88a, 'JEET', 0xffffff), JeetCap: CAP(0x2aa84a, 0x7ad88a, 'JEET', 0xffffff),
  'MCGA Cap': CAP(0xd82a2a, 0xa81a1a, 'MCGA', 0xf4c020), 'MEGA Chog': CAP(0xf4ecd8, 0xf0702a, 'MEGA\nCHOG', 0x2a2230), 'MMGA Cap': CAP(0xc8c8d0, 0x2a6ac8, 'MMGA', 0x2a3a98),
  'Mon Cap': CAP(0x4a2a9a, 0x2a1a5a, 'O', 0xffffff), NEET: CAP(0xe8e8ee, 0x2a4ac8, 'NEET', 0x2a3ac8), 'RETARD Cap': CAP(0xa83ae8, 0xc890f0, 'RETARD', 0xf4ecff),
  'WAGMI Cap': CAP(0xe8308a, 0xf080b8, 'WAGMI', 0xffffff), 'TISM Cap': CAP(0xc82a30, 0x1a1a22, 'TISM', 0xffffff), 'Peace hat': CAP(0x6a7a6a, 0x4a584a, '☮', 0xe8f0e8),
  'Balls Cap': BUCKET(0x8a2ac0, '', 0xffffff), 'Blue Bucket Cap': BUCKET(0x2a4ac0), 'Cloud Cap': BUCKET(0x2a4aa8, '☁', 0xffffff), 'Dollar Cap': BUCKET(0x2a8ac0, 'JUST A KID WITH\n$1 AND A DREAM', 0x1a2a4a, { tbg: '#f0e8d0' }),
  'Gray Bucket Cap': BUCKET(0xa4aab2, '', 0xffffff, { band: 0xe8e8ec }), 'Orange Bucket Cap': BUCKET(0xe86a20), 'Thunder Cap': BUCKET(0x1a8ad8, '⚡', 0xf4d020), 'Red Peace Cap': BUCKET(0xc02a34, '☮', 0xffffff),
  'Peace Cap': BUCKET(0xc02a34, '☮', 0xffffff), 'Star Cap': BUCKET(0x505058, '★', 0xffffff),
  '8 Ball Beanie': BEANIE(0x34343c, { cuff: 0x2a2a32, rib: 0x4a4a54, t: '8', tc: 0x14141c, tbg: '#f4f4f4' }), 'BTC Beanie': BEANIE(0xf0601a, { cuff: 0xe85a18, rib: 0xb83a10 }),
  'Choggie Beanie': BEANIE(0x3a3a40, { cuff: 0x34343a, rib: 0x1a1a22, t: '✿', tc: 0xf080c0 }), 'Mon Beanie': BEANIE(0x2a8ae8, { cuff: 0x4a40d8, rib: 0x2a8ae8 }),
  'RH Beanie': BEANIE(0xc4ee18, { cuff: 0xc4ee18, rib: 0x8aa810, t: '✒', tc: 0x14141c }), 'Wizard Beanie': BEANIE(0x2a3ad8, { cuff: 0x2a3ad8, rib: 0x1a2a98 }),
  'Demon Horn': SPIKES(0xe8502a, [[-0.34, 0.5, 0.07, 0.36, 0.5], [0, 0.6, 0.07, 0.4, 0], [0.34, 0.5, 0.07, 0.36, -0.5]]), 'devil horn': SPIKES(0xd8302a, [[-0.3, 0.52, 0.08, 0.4, 0.4], [0, 0.62, 0.08, 0.44, 0], [0.3, 0.52, 0.08, 0.4, -0.4]]),
  'Void Horn': SPIKES(0x8a58d0, [[-0.34, 0.5, 0.06, 0.3, 0.5], [0, 0.6, 0.06, 0.34, 0], [0.34, 0.5, 0.06, 0.3, -0.5]]), 'Purple Horn': HORNS(0x6a58c8), 'Red Horn': HORNS(0x8a3a2a),
};
const star = (head, x, y, z, c) => { const m = cm(new THREE.OctahedronGeometry(0.035), c, x, y, z); m.scale.set(1, 1, 0.4); m.userData.noOutline = true; head.add(m); };
const ONEOFFS = {
  'Blue Laser': head => { const b = glowM(new THREE.CylinderGeometry(0.02, 0.04, 0.8, 6), 0x40d8ff, 0.9); b.position.set(0, 0.4, 0.62); b.rotation.x = -1.15; head.add(b); head.add(decal(new THREE.CircleGeometry(0.04, 10), 0xe8ffff, 0, 0.17, 0.4)); },
  'Bob Hair': head => { HAT.afro(head, null, { puffs: [[-0.44, 0.3, -0.05, 0.19, 0xf4c020], [0.44, 0.3, -0.05, 0.19, 0xf4c020], [-0.32, 0.55, -0.08, 0.2, 0xf4c020], [0.32, 0.55, -0.08, 0.2, 0xf4c020], [0, 0.64, -0.1, 0.22, 0xf4c020], [-0.5, 0.05, -0.1, 0.15, 0xf4c020], [0.5, 0.05, -0.1, 0.15, 0xf4c020]] }); HAT.ring(head, 0.5, 0.07, 0.34, 0xd82a2a, -0.1, 1.05); },
  'Rainbow Wig': head => { const cs = [0xe83a3a, 0xf08a30, 0xf4d83a, 0x4ac85a, 0x3a8ae8, 0x8a4ad8]; HAT.afro(head, null, { puffs: [[-0.42, 0.3, -0.05, 0.2, cs[0]], [0.42, 0.3, -0.05, 0.2, cs[4]], [-0.3, 0.56, -0.08, 0.22, cs[1]], [0.3, 0.56, -0.08, 0.22, cs[3]], [0, 0.66, -0.1, 0.24, cs[2]], [-0.5, 0.05, -0.1, 0.16, cs[5]], [0.5, 0.05, -0.1, 0.16, cs[5]]] }); },
  Diamond: head => HAT.gem(head, null, { c: 0x4aa8f0 }),
  Durag: head => { HAT.dome(head, 0.49, 0.2, 0x34343c, 0.95); HAT.ring(head, 0.49, 0.03, 0.2, 0x2a2a32, -0.1); for (const sx of [-1, 1]) head.add(cm(new THREE.BoxGeometry(0.08, 0.44, 0.02), 0x34343c, sx * 0.09, 0.0, -0.62)); },
  Crown: head => { const g = 0xe8a830; head.add(cm(new THREE.CylinderGeometry(0.44, 0.47, 0.2, 10, 1, true), g, 0, 0.42, -0.08)); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; const c = cm(new THREE.ConeGeometry(0.1, 0.26, 4), g, Math.sin(a) * 0.43, 0.65, Math.cos(a) * 0.43 - 0.08); head.add(c); head.add(cm(new THREE.SphereGeometry(0.035, 6, 5), i % 2 ? 0x3a8ae8 : 0xe83a4a, Math.sin(a) * 0.43, 0.8, Math.cos(a) * 0.43 - 0.08)); } head.add(cm(new THREE.OctahedronGeometry(0.075), 0xe83a4a, 0, 0.44, 0.4)); },
  'Gold Thorn': head => HAT.thorn(head, 0xe0a020), 'Silver Thorn': head => HAT.thorn(head, 0xa8a8b8),
  'Head Wrap': head => { HAT.dome(head, 0.5, 0.18, 0xf4f4f0, 0.95); for (const [y, r, t] of [[0.22, 0.5, 0.09], [0.4, 0.45, 0.08], [0.56, 0.34, 0.07]]) HAT.ring(head, r, t, y, 0xeaeae4, -0.1, 1.05); },
  'Japan Headband': head => HAT.band(head, null, { c: 0xf4f4f0, dot: 0xd82a2a }),
  'Mafia Hat': head => { head.add(cm(new THREE.CylinderGeometry(0.34, 0.4, 0.34, 12), 0x2a2a32, 0, 0.46, -0.1)); const br = cm(new THREE.CylinderGeometry(0.66, 0.66, 0.035, 18), 0x34343c, 0, 0.28, -0.04); br.rotation.x = 0.1; head.add(br); head.add(cm(new THREE.CylinderGeometry(0.405, 0.405, 0.07, 12), 0xc8c8d0, 0, 0.34, -0.1)); },
  Plumber: head => { const d = cm(new THREE.SphereGeometry(0.25, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), 0xd82a2a, -0.02, 0.5, -0.02); d.scale.set(1, 0.85, 1); head.add(d); const st = cm(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), 0x8a5a38, 0.18, 0.78, -0.02); st.rotation.z = -0.6; head.add(st); },
  'Poison Shroom': head => { for (const [x, y, z, r] of [[-0.2, 0.6, 0.0, 0.17], [0.22, 0.56, -0.05, 0.15], [-0.4, 0.38, 0.05, 0.1]]) { head.add(cm(new THREE.CylinderGeometry(r * 0.2, r * 0.25, r * 1.2, 6), 0xe8e0c0, x, y - r * 0.5, z)); const c = cm(new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0x8ac0a0, x, y, z); c.scale.set(1.2, 0.6, 1.2); head.add(c); head.add(decal(new THREE.CircleGeometry(r * 0.16, 6), 0xe8e8c0, x + r * 0.3, y + r * 0.36, z + r * 0.4)); } },
  'Red Bandana': (head, o) => HAT.band(head, o, { c: 0xd8452a, knot: true }), 'Red Headband': (head, o) => HAT.band(head, o, { c: 0xd8323c, knot: true }),
  Robber: head => { HAT.dome(head, 0.53, 0.14, 0x4a4a52, 1.0); for (const sx of [-1, 1]) head.add(cm(new THREE.BoxGeometry(0.1, 0.5, 0.55), 0x4a4a52, sx * 0.5, -0.02, -0.04)); },
  'Russian Hat': head => { HAT.dome(head, 0.52, 0.22, 0xb8a080, 0.95); HAT.ring(head, 0.5, 0.07, 0.2, 0xd8c4a0, -0.1, 1.05); for (const sx of [-1, 1]) head.add(cm(new THREE.BoxGeometry(0.13, 0.4, 0.36), 0xb8a080, sx * 0.53, -0.05, -0.05)); },
  'Silver wreath': head => { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, l = cm(new THREE.SphereGeometry(0.075, 6, 5), 0x9ac0a8, Math.sin(a) * 0.5, 0.26, Math.cos(a) * 0.5 - 0.1); l.scale.set(0.5, 0.25, 1.4); l.rotation.y = a; l.userData.noOutline = false; head.add(l); } },
  'Spartan Helmet': head => { HAT.dome(head, 0.5, 0.15, 0xd8a040, 0.95); head.add(cm(new THREE.BoxGeometry(0.1, 0.22, 0.7), 0xd8302a, 0, 0.7, -0.1)); for (const sx of [-1, 1]) head.add(cm(new THREE.BoxGeometry(0.07, 0.4, 0.3), 0xd8a040, sx * 0.5, -0.1, 0.05)); head.add(cm(new THREE.BoxGeometry(0.5, 0.06, 0.06), 0xd8a040, 0, 0.18, 0.4)); },
  'Taped Banana': head => { const b = cm(new THREE.TorusGeometry(0.17, 0.045, 6, 10, 2.4), 0xf4d838, 0, 0.3, 0.39); b.rotation.set(0, 0, 1.2); head.add(b); head.add(decal(new THREE.PlaneGeometry(0.2, 0.05), 0x9a9aa4, 0, 0.3, 0.45)); },
  // a wizard cap: a low dome, then a cone that bends back at the tip (a ball read as a ball), stars laid on the cone
  'Wizard Hat': head => {
    const c = 0x1a2a7a; HAT.dome(head, 0.5, 0.2, c, 0.7);
    const cone = cm(new THREE.ConeGeometry(0.36, 0.7, 10), c, 0, 0.74, -0.14); cone.rotation.x = -0.28; head.add(cone);
    for (const [a, h] of [[-0.6, 0.08], [0.5, 0.14], [2.2, 0.1], [-2.3, 0.18], [0.0, 0.3], [-1.1, 0.34]]) { const r = 0.36 * (1 - (h + 0.05) / 0.7) + 0.03, st = cm(new THREE.OctahedronGeometry(0.045), 0xf4c43c, Math.sin(a) * r, 0.42 + h * 0.95, -0.1 + Math.cos(a) * r - 0.04 - h * 0.28); st.scale.set(1, 1, 0.4); st.rotation.y = a; st.userData.noOutline = true; head.add(st); }
  },
};
Object.assign(HAT_LOOK, ONEOFFS);
HAT.thorn = (head, c) => { HAT.ring(head, 0.5, 0.03, 0.3, c, -0.1, 1.05); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, t = cm(new THREE.ConeGeometry(0.03, 0.12, 4), c, Math.sin(a) * 0.54, 0.3, Math.cos(a) * 0.54 - 0.1); t.rotation.set(Math.cos(a) * 1.57, 0, -Math.sin(a) * 1.57); head.add(t); } };
// the hats that cover the whole crown: under them the hair blades on top and round the rim are not built (blade shards poked through); the side and back spikes stay, as in the art
const HAT_HIDES = new Set([...Object.keys(HAT_LOOK).filter(k => !ONEOFFS[k] && !/horn/i.test(k)), 'Durag', 'Head Wrap', 'Mafia Hat', 'Robber', 'Russian Hat', 'Spartan Helmet', 'Wizard Hat', 'Bob Hair', 'Rainbow Wig', 'Crown']);
const HAT_COVERS = new Set(['Durag', 'Head Wrap', 'Mafia Hat', 'Robber', 'Russian Hat', 'Spartan Helmet', 'Wizard Hat', 'Bob Hair', 'Rainbow Wig', ...Object.keys(HAT_LOOK).filter(k => !ONEOFFS[k])]);
