// ===== the ten one-of-one Legendary Chogs: each is a drawing of its own, so each gets its own model =====
// (docs/project/overview.md, "Chog likeness"). The other 1,959 Chogs are built from traits (traits.js); these ten have no traits, only a name in the metadata
// (CHOG #53 — Blaze), which WALLET.loadData copies into traits.Legend. LEGEND_OPTS gives chog() its colours and face, CHOG_SPECIAL adds the parts only that Chog has.
// Face-local axes: x right, y up, z towards the camera; the head group is centred 1.0 above the feet. Checked against the official art with tools/compare_portraits.py.
const LEGEND_TOKEN_NAMES = ['Blaze', 'Burning Skully', 'Chog Scream', 'Chogbomination', 'Frogger', 'Grim', 'Halo', 'Krown', 'Midas', 'Redd'];
const LEGEND_OPTS = {
  Blaze: { special: 'blaze', hair: 0xff8a1a, hairPalette: [0xff6a10, 0xff9a20, 0xffc030, 0xff7a14], faceC: 0xff7414, suit: 0xf07818, hands: 0xff8420, kind: 'shirt', cloth: 0xf07418, eyeStyle: 'glow', eyeColor: 0xfff27a, mouth: 'smile', noseC: 0xe86a10, noCheeks: true, aura: 0xff9a20, auraStyle: 'fire' },
  'Burning Skully': { special: 'skully', bald: true, hair: 0xf0e6d0, faceC: 0xf2e8d2, suit: 0xf0e6d0, hands: 0xf0e6d0, kind: 'suit', cloth: 0xf0e6d0, stripes: 0xb08a5a, eyeStyle: 'socket', mouth: 'teeth', noseC: 0x4a2a20, noCheeks: true, aura: 0xff7a1a, auraStyle: 'fire' },
  'Chog Scream': { special: 'scream', hair: 0x3a2a8a, faceC: 0xf2c68a, suit: 0x3a2a8a, kind: 'jacket', cloth: 0x2e2470, eyeStyle: 'ring', mouth: 'oval', noseC: 0xe0509a },
  Chogbomination: { special: 'zombie', hair: 0xe0e6cc, faceC: 0xe4ead2, suit: 0xe0e6cc, kind: 'hoodie', cloth: 0x5a34a8, eyeStyle: 'zombie', mouth: 'zomb', noseC: 0xe0707a, aura: 0x50ff30, auraStyle: 'smoke' },
  Frogger: { special: 'frogger', hair: 0x6a3ab8, faceC: 0xeec4a4, suit: 0x4ac85a, hands: 0x4ac85a, kind: 'suit', cloth: 0x4ac85a, belly: 0xb8e890, eyeStyle: 'frog', mouth: 'frog', noseC: 0xe0707a },
  Grim: { special: 'grim', hair: 0xeeeeee, hairScale: 1.5, faceC: 0xf6f6f6, suit: 0xb8b8c0, hands: 0xdcdce2, kind: 'jacket', cloth: 0x1c1c24, shirt: 0x3a3a44, eyeStyle: 'manga', mouth: 'flat', noseC: 0x8a8a94, noCheeks: true, aura: 0xdddddd, auraStyle: 'wind' },
  Halo: { special: 'halo', hair: 0xfff0d0, faceC: 0xf0d09c, suit: 0xffeccc, hands: 0xf0d09c, kind: 'robe', cloth: 0xfff4dc, robeTrim: 0xf0c040, eyeStyle: 'tired', mouth: 'flat', noseC: 0xe8a090, aura: 0xffe890, auraStyle: 'glow' },
  Krown: { special: 'krown', hair: 0x6a2ab0, hairScale: 1.25, faceC: 0xf4d6b8, suit: 0x6a2ab0, hands: 0xe8a0b8, kind: 'robe', cloth: 0x6a2ab0, robeTrim: 0xf4c43c, eyeStyle: 'anime', eyeColor: 0x7aa8ff, mouth: 'flat', noseC: 0xe0509a, aura: 0x4ac8ff, auraStyle: 'wind' },
  Midas: { special: 'midas', hair: 0xf4c020, faceC: 0xf0b010, suit: 0xe8a812, hands: 0xf4bc18, kind: 'shirt', cloth: 0xe8a812, eyeStyle: 'goldeye', eyeColor: 0xe89a10, mouth: 'smile', noseC: 0xe8a010, noCheeks: true, aura: 0xffd040, auraStyle: 'glow' },
  Redd: { special: 'redd', hair: 0xe02a20, hairPalette: [0xe02a20, 0xff4a20, 0xc01418, 0xff6a28], faceC: 0xe86068, suit: 0xc8202e, hands: 0xe86068, kind: 'jacket', cloth: 0xb8182c, shirt: 0xe0606a, eyeStyle: 'goldeye', eyeColor: 0xe01020, mouth: 'fangs', noseC: 0xe0507a, aura: 0xff3a20, auraStyle: 'fire' },
};
const lg = {
  glowCone: (c, r, h, x, y, z, op = 0.7) => { const m = glowM(new THREE.ConeGeometry(r, h, 5), c, op); m.position.set(x, y, z); return m; },
};
const CHOG_SPECIAL = {
  // a living flame in a red cape
  blaze({ body, head }) {
    body.add(cm(new THREE.BoxGeometry(0.7, 0.76, 0.05), 0xd8302a, 0, 0.46, -0.31)); body.add(cm(new THREE.BoxGeometry(0.76, 0.16, 0.06), 0xb02420, 0, 0.12, -0.31));
    const col = cm(new THREE.TorusGeometry(0.27, 0.075, 6, 12), 0xd8302a, 0, 0.78, 0); col.rotation.x = Math.PI / 2; body.add(col);
    const belt = cm(new THREE.CylinderGeometry(0.285, 0.285, 0.07, 10), 0x8a4a2a, 0, 0.36, 0); body.add(belt);
    body.add(cm(new THREE.SphereGeometry(0.06, 8, 6), 0xf4b020, 0, 0.74, 0.27));
    for (const [x, y, z, r, h] of [[0, 0.68, -0.1, 0.14, 0.5], [-0.22, 0.6, -0.1, 0.1, 0.38], [0.22, 0.6, -0.1, 0.1, 0.38], [0, 0.62, -0.32, 0.12, 0.42]]) head.add(lg.glowCone(0xffd04a, r, h, x, y, z, 0.75));
  },
  // a bone skull with half its head on fire
  skully({ head, face }) {
    for (const sx of [-1, 1]) { const rim = decal(new THREE.TorusGeometry(0.1, 0.014, 5, 16), 0xf08a30, sx * 0.125, 0.0, 0.039, 1, 1.2); face.add(rim); }
    face.add(decal(new THREE.PlaneGeometry(0.012, 0.16), 0x7a5a3a, 0.17, 0.15, 0.04)); face.add(decal(new THREE.PlaneGeometry(0.1, 0.012), 0x7a5a3a, 0.2, 0.2, 0.04));
    for (const [x, y, z, r, h, rz] of [[-0.42, 0.18, -0.02, 0.13, 0.55, 0.5], [-0.46, -0.04, -0.04, 0.1, 0.42, 0.7], [-0.34, 0.42, -0.06, 0.12, 0.5, 0.3], [-0.2, 0.55, -0.08, 0.1, 0.4, 0.15]]) { const f = lg.glowCone(0xff9a20, r, h, x, y, z, 0.85); f.rotation.z = rz; head.add(f); const f2 = lg.glowCone(0xffe060, r * 0.55, h * 0.6, x, y - 0.03, z + 0.02, 0.9); f2.rotation.z = rz; head.add(f2); }
  },
  // The Scream: a long tan face, ringed eyes, an open mouth and two hands on the cheeks
  scream({ head, face }) {
    face.scale.set(1, 1.28, 1); face.position.y = -0.1;
    for (const sx of [-1, 1]) { const cheek = decal(new THREE.CircleGeometry(0.09, 14), 0xe8508a, sx * 0.19, -0.16, 0.041, 1, 1.3); face.add(cheek); }
    for (const sx of [-1, 1]) { const hand = cm(new THREE.IcosahedronGeometry(0.13, 0), 0xe8508a, sx * 0.4, -0.18, 0.2); hand.scale.set(0.95, 1.25, 0.8); head.add(hand); const fin = cm(new THREE.BoxGeometry(0.05, 0.1, 0.05), 0xe8508a, sx * 0.31, -0.06, 0.28); head.add(fin); }
  },
  // a zombie Chog with its brain showing, green eyes and a drooling mouth
  zombie({ head, face }) {
    const brain = new THREE.Group(); brain.position.set(-0.12, 0.5, -0.02); head.add(brain);
    for (const [x, y, z, r] of [[0, 0, 0, 0.16], [0.14, 0.03, -0.02, 0.12], [-0.12, 0.02, 0.02, 0.12], [0.04, 0.1, -0.05, 0.1]]) { const b = cm(new THREE.IcosahedronGeometry(r, 1), 0xe8808a, x, y, z); b.scale.set(1, 0.85, 1); brain.add(b); }
    const fold = cm(new THREE.TorusGeometry(0.1, 0.012, 4, 8, Math.PI), 0xb04a5a, 0.0, 0.09, 0.08); fold.userData.noOutline = true; brain.add(fold);
    for (const [x, y] of [[-0.18, 0.12], [0.0, 0.04], [0.18, 0.1], [-0.08, -0.12], [0.1, -0.16]]) face.add(decal(new THREE.CircleGeometry(0.018, 8), 0xb02a3a, x, y, 0.045));
    for (const sx of [-1, 1]) face.add(decal(new THREE.CircleGeometry(0.06, 10), 0xe0508a, sx * 0.2, -0.1, 0.043, 1, 0.8));
  },
  // a Chog in a frog costume: green hood with two big eyes on top, a hoodie with spines down the back
  frogger({ head, body }) {
    const hood = cm(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x4ac85a, 0, 0.2, -0.1); hood.scale.set(1.0, 0.8, 1.0); head.add(hood);
    const rim = cm(new THREE.TorusGeometry(0.5, 0.05, 5, 14), 0x3aa84a, 0, 0.2, -0.1); rim.rotation.x = Math.PI / 2; rim.scale.set(1, 1, 0.9); head.add(rim);
    for (const sx of [-1, 1]) { head.add(cm(new THREE.BoxGeometry(0.1, 0.5, 0.34), 0x4ac85a, sx * 0.47, -0.04, 0.0)); }
    for (const sx of [-1, 1]) { head.add(cm(new THREE.SphereGeometry(0.17, 10, 8), 0xf4f8e8, sx * 0.24, 0.62, 0.1)); const p = decal(new THREE.CircleGeometry(0.085, 12), 0x1a1a24, sx * 0.24, 0.63, 0.265); p.rotation.x = -0.35; head.add(p); }
    for (let i = 0; i < 4; i++) { const c = cm(new THREE.ConeGeometry(0.07, 0.2, 4), 0x3aa84a, 0, 0.78 - i * 0.14, -0.3 - i * 0.02); c.rotation.x = -1.2; body.add(c); }
  },
  // a black-and-white manga Chog: huge white hair, a black high collar, nothing in colour
  grim({ head, body }) {
    const col = cm(new THREE.TorusGeometry(0.25, 0.1, 6, 12), 0x1c1c24, 0, 0.8, 0); col.rotation.x = Math.PI / 2; body.add(col);
  },
  // an angel: a golden halo and cream wings
  halo({ head, body }) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 6, 20), new THREE.MeshBasicMaterial({ color: 0xffc830 })); ring.position.set(0, 0.82, -0.1); ring.rotation.x = Math.PI / 2 - 0.15; ring.userData.noOutline = true; head.add(ring);
    const glow = glowM(new THREE.TorusGeometry(0.34, 0.1, 6, 20), 0xffe070, 0.5); glow.position.copy(ring.position); glow.rotation.copy(ring.rotation); head.add(glow);
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const w = cm(blade(0.62 - i * 0.07, 0.3, 0.05, -0.2), i % 2 ? 0xfff4e0 : 0xffffff, sx * 0.14, 0.58 - i * 0.07, -0.3, true); w.userData.noOutline = true; orientBlade(w, new THREE.Vector3(sx * (0.7 + i * 0.22), 0.55 - i * 0.28, -0.5)); body.add(w); }
  },
  // a crowned warrior: a golden helm with a ruby, face paint, a feather collar and a cape
  krown({ head, body, face }) {
    const band = cm(new THREE.BoxGeometry(0.62, 0.1, 0.06), 0xf4c43c, 0, 0.32, 0.36); band.userData.noOutline = false; head.add(band);
    for (const sx of [-1, 1]) { const w = cm(new THREE.BoxGeometry(0.1, 0.34, 0.06), 0xf4c43c, sx * 0.3, 0.2, 0.33); w.rotation.z = sx * 0.1; head.add(w); }
    const peak = cm(new THREE.ConeGeometry(0.14, 0.3, 4), 0xf4c43c, 0, 0.5, 0.36); peak.rotation.y = Math.PI / 4; peak.scale.set(1.1, 1, 0.5); head.add(peak);
    head.add(cm(new THREE.OctahedronGeometry(0.075), 0xe02838, 0, 0.5, 0.4));
    for (const sx of [-1, 1]) for (const dx of [0.04, 0.09]) face.add(decal(new THREE.PlaneGeometry(0.02, 0.2), 0xf08aa8, sx * (0.125 + dx), -0.1, 0.043));
    const ruff = cm(new THREE.TorusGeometry(0.27, 0.09, 6, 12), 0xf4c43c, 0, 0.78, 0); ruff.rotation.x = Math.PI / 2; body.add(ruff);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; const f = cm(new THREE.ConeGeometry(0.06, 0.2, 4), 0xe8a828, Math.sin(a) * 0.3, 0.74, Math.cos(a) * 0.3); f.rotation.set(Math.cos(a) * 1.0, 0, -Math.sin(a) * 1.0); body.add(f); }
    body.add(cm(new THREE.BoxGeometry(0.74, 0.8, 0.05), 0x6a2ab0, 0, 0.44, -0.31));
  },
  // a solid-gold Chog: glossy highlights on everything
  midas({ head, face, body }) {
    for (const sx of [-1, 1]) face.add(decal(new THREE.CircleGeometry(0.02, 8), 0xffffff, sx * 0.11, 0.07, 0.05));
    const sheen = decal(new THREE.PlaneGeometry(0.06, 0.22), 0xfff8c0, -0.22, 0.05, 0.045); sheen.rotation.z = 0.2; face.add(sheen);
    body.add(decal(new THREE.PlaneGeometry(0.07, 0.3), 0xfff8c0, -0.12, 0.52, 0.28));
  },
  // a little red devil: flame horns, bat wings and a purple pitchfork
  redd({ head, body, arms }) {
    for (const sx of [-1, 1]) { const h = glowM(new THREE.ConeGeometry(0.1, 0.42, 6), 0xff2a20, 0.95); h.position.set(sx * 0.3, 0.64, -0.06); h.rotation.z = -sx * 0.35; head.add(h); const base = cm(new THREE.ConeGeometry(0.1, 0.3, 6), 0x8a1a28, sx * 0.28, 0.5, -0.06); base.rotation.z = -sx * 0.3; head.add(base); }
    for (const sx of [-1, 1]) { const w = cm(new THREE.ConeGeometry(0.34, 0.8, 3), 0x8a1a28, sx * 0.38, 0.62, -0.36); w.rotation.set(0.1, 0, -sx * 1.0); w.scale.set(1, 1, 0.12); body.add(w); const w2 = cm(new THREE.ConeGeometry(0.2, 0.5, 3), 0xa82030, sx * 0.62, 0.78, -0.36); w2.rotation.set(0.1, 0, -sx * 1.2); w2.scale.set(1, 1, 0.12); body.add(w2); }
    const fork = new THREE.Group(); fork.add(cm(new THREE.CylinderGeometry(0.018, 0.018, 1.0, 5), 0x7a3ac8, 0, 0.1, 0)); fork.add(cm(new THREE.BoxGeometry(0.2, 0.025, 0.025), 0x7a3ac8, 0, 0.6, 0));
    for (const dx of [-0.09, 0, 0.09]) fork.add(cm(new THREE.ConeGeometry(0.025, 0.2, 4), 0x9a5ae8, dx, 0.7, 0));
    fork.position.set(0.12, -0.3, 0.2); fork.rotation.z = -0.15; arms[1].add(fork);
  },
};
