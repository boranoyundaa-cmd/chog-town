// ===== the held item of every Accessory trait value, one by one (9 values) =====
// Each value is a small model in the right hand (it swings with the arm): a cigar with its ember, a gold coin, a frog plush, red and green candlesticks, a heart,
// a combat knife, a Pepe plush and a coffee cup. Compared with the art with tools/value_sheet.py list|sheet Accessory.
// Colours are the art's own; ITEM() builds them at EXPO like clothes and hats (see CM_K in chog.js). Item-local axes are the arm's: the hand is at about (0.14, -0.43, 0.02).
const ITEM = fn => (arm, o) => { CM_K = EXPO; try { fn(arm, o); } finally { CM_K = 1; } };
const itemGroup = (arm, x = 0.16, y = -0.4, z = 0.17) => { const g = new THREE.Group(); g.position.set(x, y, z); arm.add(g); return g; };
const eyeBall = (g, x, y, z, r, pr = r * 0.5) => { g.add(cm(new THREE.SphereGeometry(r, 8, 6), 0xffffff, x, y, z)); const p = decal(new THREE.CircleGeometry(pr, 8), 0x14141c, x, y, z + r * 0.92); g.add(p); };
const ITEM_LOOK = {
  Cigar: ITEM((arm) => {
    const g = itemGroup(arm, 0.17, -0.38, 0.2); g.rotation.z = -0.6; g.rotation.x = -0.25;
    g.add(cm(new THREE.CylinderGeometry(0.03, 0.026, 0.34, 8), 0x7a4a24, 0, 0.0, 0)); g.add(cm(new THREE.CylinderGeometry(0.032, 0.032, 0.04, 8), 0xe8b030, 0, -0.07, 0)); g.add(cm(new THREE.CylinderGeometry(0.028, 0.03, 0.04, 8), 0x8a8a90, 0, 0.18, 0));
    const e = glowM(new THREE.SphereGeometry(0.036, 8, 6), 0xff6a20, 0.95); e.position.y = 0.2; g.add(e);
    for (let i = 0; i < 3; i++) { const s = glowM(new THREE.SphereGeometry(0.03 + i * 0.012, 6, 5), 0xe8e8f0, 0.3 - i * 0.07); s.position.set(0.02 * i, 0.28 + i * 0.08, 0); g.add(s); }
  }),
  Coin: ITEM((arm) => {
    const g = itemGroup(arm, 0.17, -0.4, 0.2); g.rotation.y = -0.35;
    const tex = paint(64, 64, (c, w, h) => { const gr = c.createRadialGradient(24, 22, 4, 32, 32, 32); gr.addColorStop(0, '#fff2a8'); gr.addColorStop(0.7, '#f4b830'); gr.addColorStop(1, '#c88410'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.strokeStyle = '#a86a08'; c.lineWidth = 4; c.beginPath(); c.arc(32, 32, 24, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#a86a08'; c.font = '700 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('C', 32, 34); }, 1, 1);
    const face = new THREE.MeshToonMaterial({ map: tex, gradientMap: toonGrad4, color: 0x9a9a9a, emissive: 0x2a1a00 }), edge = tmat(new THREE.Color(0xf0b030).multiplyScalar(EXPO).getHex(), { em: 0.2 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 18), [edge, face, face]); m.rotation.x = Math.PI / 2; m.castShadow = true; g.add(m);
  }),
  Fwog: ITEM((arm) => {
    const g = itemGroup(arm, 0.17, -0.4, 0.18); g.rotation.y = -0.3;
    const b = cm(new THREE.SphereGeometry(0.13, 10, 8), 0x4ac84a, 0, 0, 0); b.scale.set(1.1, 0.9, 0.9); g.add(b);
    for (const sx of [-1, 1]) { eyeBall(g, sx * 0.065, 0.1, 0.05, 0.05, 0.026); g.add(cm(new THREE.SphereGeometry(0.035, 6, 5), 0x4ac84a, sx * 0.1, -0.1, 0.06)); }
    g.add(decal(new THREE.PlaneGeometry(0.16, 0.014), 0x1a4a1a, 0, -0.01, 0.118)); g.add(decal(new THREE.CircleGeometry(0.014, 6), 0x1a4a1a, -0.025, 0.04, 0.12)); g.add(decal(new THREE.CircleGeometry(0.014, 6), 0x1a4a1a, 0.025, 0.04, 0.12));
  }),
  'Green Candle': ITEM((arm) => candle(arm, 0x2ec45a)), 'Red Candle': ITEM((arm) => candle(arm, 0xe03030)),
  Heart: ITEM((arm) => {
    const g = itemGroup(arm, 0.17, -0.36, 0.22);
    const w = new THREE.Mesh(heartGeo(0.3), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); w.userData.noOutline = true; g.add(w);
    const p = new THREE.Mesh(heartGeo(0.22), new THREE.MeshBasicMaterial({ color: 0xff7aa8, side: THREE.DoubleSide })); p.position.z = 0.004; p.position.y = -0.005; p.userData.noOutline = true; g.add(p);
    const q = new THREE.Mesh(heartGeo(0.07), new THREE.MeshBasicMaterial({ color: 0xffd0e0, side: THREE.DoubleSide })); q.position.set(-0.05, 0.05, 0.008); q.userData.noOutline = true; g.add(q);
  }),
  Knife: ITEM((arm) => {
    const g = itemGroup(arm, 0.17, -0.38, 0.2); g.rotation.z = -0.3; g.rotation.x = -0.25;
    g.add(cm(new THREE.CylinderGeometry(0.034, 0.03, 0.15, 8), 0x2a2a32, 0, -0.04, 0)); g.add(cm(new THREE.BoxGeometry(0.1, 0.03, 0.05), 0x5a5a66, 0, 0.05, 0));
    const bl = cm(new THREE.BoxGeometry(0.06, 0.2, 0.014), 0xc8ccd8, 0, 0.17, 0); g.add(bl); const tip = cm(new THREE.ConeGeometry(0.0425, 0.09, 4), 0xc8ccd8, 0, 0.31, 0); tip.rotation.y = Math.PI / 4; tip.scale.set(1, 1, 0.3); g.add(tip);
    g.add(decal(new THREE.PlaneGeometry(0.012, 0.2), 0xf4f6fa, -0.012, 0.17, 0.009));
  }),
  PEPE: ITEM((arm) => {
    const g = itemGroup(arm, 0.17, -0.4, 0.18); g.rotation.y = -0.3;
    const h = cm(new THREE.SphereGeometry(0.13, 10, 8), 0x4a9a3a, 0, 0, 0); h.scale.set(1.15, 0.9, 0.85); g.add(h);
    for (const sx of [-1, 1]) { eyeBall(g, sx * 0.07, 0.07, 0.05, 0.055, 0.025); const lid = decal(new THREE.PlaneGeometry(0.11, 0.03), 0x4a9a3a, sx * 0.07, 0.105, 0.108); g.add(lid); }
    g.add(decal(new THREE.PlaneGeometry(0.17, 0.035), 0xe0405a, 0, -0.04, 0.11)); g.add(decal(new THREE.PlaneGeometry(0.15, 0.008), 0x7a1a2a, 0, -0.03, 0.115));
    g.add(cm(new THREE.BoxGeometry(0.2, 0.06, 0.12), 0x2a5ac8, 0, -0.14, 0));
  }),
  SB: ITEM((arm) => {
    const g = itemGroup(arm, 0.17, -0.4, 0.19); g.rotation.z = 0.08;
    g.add(cm(new THREE.CylinderGeometry(0.085, 0.065, 0.2, 12), 0xf6f6f4, 0, 0, 0)); g.add(cm(new THREE.CylinderGeometry(0.092, 0.092, 0.025, 12), 0xf0f0ee, 0, 0.11, 0)); g.add(cm(new THREE.CylinderGeometry(0.07, 0.072, 0.03, 12), 0xe8e8e4, 0, 0.14, 0));
    g.add(cm(new THREE.CylinderGeometry(0.081, 0.07, 0.08, 12), 0xb88850, 0, -0.01, 0));
    g.add(decal(new THREE.CircleGeometry(0.036, 14), 0x0e7a4a, 0, 0.01, 0.085)); g.add(decal(new THREE.RingGeometry(0.018, 0.026, 14), 0xffffff, 0, 0.01, 0.087));
  }),
};
function candle(arm, c) {
  const g = itemGroup(arm, 0.17, -0.38, 0.18);
  g.add(cm(new THREE.BoxGeometry(0.1, 0.24, 0.1), c, 0, 0, 0)); g.add(cm(new THREE.BoxGeometry(0.014, 0.44, 0.014), c, 0, 0.02, 0)); g.add(decal(new THREE.PlaneGeometry(0.02, 0.18), 0xffffff, -0.025, 0, 0.052));
}
