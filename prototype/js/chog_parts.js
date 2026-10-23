// ===== Chog parts driven by NFT traits: eyes, mouth, hats, accessories, aura =====
// Called from chog() in chog.js when the matching option is set. Face-local axes: x right, y up, z towards the camera.
const DARK = 0x120820, TEAR = 0xa8d8f0;
const boxM = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.userData.noOutline = true; return m; };
const glowM = (geo, c, op = 0.8) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); m.userData.noOutline = true; m.userData.noNormal = true; return m; };
const heartGeo = k => { const s = new THREE.Shape(); s.moveTo(0, -0.5); s.bezierCurveTo(-0.9, 0.1, -0.5, 0.8, 0, 0.35); s.bezierCurveTo(0.5, 0.8, 0.9, 0.1, 0, -0.5); const g = new THREE.ShapeGeometry(s); g.scale(k, k, 1); return g; };
const arcDecal = (r, tube, c, x, y, z, up, sy = 1, arc = Math.PI) => { const m = decal(new THREE.TorusGeometry(r, tube, 4, 10, arc), c, x, y, z, 1, sy); if (!up) m.rotation.z = Math.PI; return m; };
function gradTex(c1, c2) {
  const t = paint(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#' + new THREE.Color(c1).getHexString()); gr.addColorStop(1, '#' + new THREE.Color(c2).getHexString()); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  t.magFilter = t.minFilter = THREE.LinearFilter; return t;
}

const glowAt = (x, y, r, c, op) => { const g = glowM(new THREE.CircleGeometry(r, 16), c, op); g.position.set(x, y, 0.04); return g; };
// ---- eyes (+ cheeks, brows). Returns the meshes that blink (scaled in y).
function chogEyes(face, o) {
  if (o.eyeName && typeof EYE_LOOK !== 'undefined' && EYE_LOOK[o.eyeName]) return eyeLook(face, o);                  // chog_eyes.js: every Eyes value has its own drawing
  const st = o.eyeStyle, ec = o.eyeColor ?? 0x40e0f0, fill = o.eyeFill, blink = [];
  const cheeks = () => { if (!o.noCheeks) for (const sx of [-1, 1]) face.add(decal(new THREE.CircleGeometry(0.065, 14), 0xd93d86, sx * 0.205, -0.1, 0.033, 1, 0.85)); };
  const brows = (tilt, y = 0.135) => { for (const sx of [-1, 1]) { const br = decal(new THREE.PlaneGeometry(0.12, 0.02), DARK, sx * 0.125, y, 0.036); br.rotation.z = -sx * tilt; face.add(br); } };
  const round = (sx, col = DARK, hi = true, sc = 1) => {
    const e = decal(new THREE.CircleGeometry(1, 18), col, sx * 0.125, 0.02, 0.036, 0.07 * sc, 0.095 * sc); e.userData.by = 0.095 * sc; face.add(e); blink.push(e);
    if (hi) { face.add(decal(new THREE.CircleGeometry(0.033 * sc, 12), 0xffffff, sx * 0.108, 0.06, 0.044)); face.add(decal(new THREE.CircleGeometry(0.014 * sc, 8), 0xffffff, sx * 0.148, -0.025, 0.044)); }
  };
  const lid = (sx, frac) => face.add(decal(new THREE.PlaneGeometry(0.2, 0.19 * frac), o.faceC || 0xfdf3cc, sx * 0.125, 0.02 + 0.095 - 0.095 * frac, 0.05));
  const tears = () => { for (const sx of [-1, 1]) { face.add(decal(new THREE.PlaneGeometry(0.04, 0.2), TEAR, sx * 0.155, -0.09, 0.04)); face.add(decal(new THREE.CircleGeometry(0.02, 8), TEAR, sx * 0.155, -0.19, 0.04)); } };
  if (st === 'socket') {                                   // skull
    for (const sx of [-1, 1]) { const e = decal(new THREE.CircleGeometry(1, 14), DARK, sx * 0.125, 0.0, 0.037, 0.085, 0.11); face.add(e); }
    return blink;
  }
  switch (st) {
    case 'glow': for (const sx of [-1, 1]) { face.add(glowAt(sx * 0.125, 0.03, 0.17, ec, 0.55)); const e = decal(new THREE.CircleGeometry(1, 18), ec, sx * 0.125, 0.03, 0.04, 0.085, 0.1); e.userData.by = 0.1; face.add(e); blink.push(e); face.add(decal(new THREE.CircleGeometry(0.045, 12), 0xffffff, sx * 0.125, 0.03, 0.044)); } break;
    case 'ring': for (const sx of [-1, 1]) { face.add(decal(new THREE.CircleGeometry(0.115, 18), 0x9a6a40, sx * 0.125, 0.04, 0.036)); const e = decal(new THREE.CircleGeometry(0.095, 18), 0xfff3cf, sx * 0.125, 0.04, 0.038); e.userData.by = 1; face.add(e); face.add(decal(new THREE.CircleGeometry(0.02, 8), 0x4a2a20, sx * 0.125, 0.04, 0.041)); blink.push(e); } break;
    case 'zombie': for (const sx of [-1, 1]) { face.add(decal(new THREE.CircleGeometry(0.115, 18), DARK, sx * 0.125, 0.02, 0.036)); face.add(glowAt(sx * 0.125, 0.02, 0.2, 0x50ff30, 0.4)); const e = decal(new THREE.CircleGeometry(0.055, 14), 0x60ff40, sx * 0.125, 0.02, 0.041); e.userData.by = 0.055; face.add(e); blink.push(e); face.add(decal(new THREE.CircleGeometry(0.02, 8), 0xffffff, sx * 0.115, 0.04, 0.045)); } break;
    case 'frog': for (const sx of [-1, 1]) { face.add(decal(new THREE.CircleGeometry(0.115, 18), 0x1a3a22, sx * 0.125, 0.02, 0.035)); face.add(decal(new THREE.CircleGeometry(0.098, 18), 0xfdf6e0, sx * 0.125, 0.02, 0.037)); const e = decal(new THREE.CircleGeometry(0.06, 14), 0x1a3a22, sx * 0.125, -0.005, 0.041); e.userData.by = 0.06; face.add(e); blink.push(e); face.add(decal(new THREE.PlaneGeometry(0.24, 0.09), o.faceC || 0xfdf3cc, sx * 0.125, 0.085, 0.05)); face.add(decal(new THREE.PlaneGeometry(0.24, 0.016), 0x1a3a22, sx * 0.125, 0.04, 0.052)); } break;
    case 'manga': for (const sx of [-1, 1]) { face.add(decal(new THREE.CircleGeometry(0.115, 18), 0x14141c, sx * 0.125, 0.02, 0.035)); face.add(decal(new THREE.CircleGeometry(0.097, 18), 0xffffff, sx * 0.125, 0.02, 0.037)); const e = decal(new THREE.CircleGeometry(0.05, 14), 0x14141c, sx * 0.125 - sx * 0.01, 0.02, 0.041); e.userData.by = 0.05; face.add(e); blink.push(e); face.add(decal(new THREE.CircleGeometry(0.014, 8), 0xffffff, sx * 0.125 - sx * 0.025, 0.04, 0.045)); const br = decal(new THREE.PlaneGeometry(0.17, 0.035), 0x14141c, sx * 0.125, 0.15, 0.04); br.rotation.z = -sx * 0.42; face.add(br); } break;
    case 'anime': for (const sx of [-1, 1]) { face.add(decal(new THREE.CircleGeometry(0.12, 18), 0x3a2a6a, sx * 0.13, 0.025, 0.035, 0.85, 1.05)); face.add(decal(new THREE.CircleGeometry(0.105, 18), 0xffffff, sx * 0.13, 0.025, 0.037, 0.85, 1.05)); const e = decal(new THREE.CircleGeometry(0.075, 16), ec, sx * 0.13, 0.015, 0.041, 0.9, 1.15); e.userData.by = 1.15 * 0.075; face.add(e); blink.push(e); face.add(decal(new THREE.CircleGeometry(0.03, 10), 0x2a2060, sx * 0.13, 0.015, 0.044)); face.add(decal(new THREE.CircleGeometry(0.022, 8), 0xffffff, sx * 0.13 - 0.03, 0.07, 0.047)); const br = decal(new THREE.PlaneGeometry(0.18, 0.025), 0x3a2a6a, sx * 0.13, 0.15, 0.04); br.rotation.z = -sx * 0.18; face.add(br); } break;
    case 'goldeye': for (const sx of [-1, 1]) { face.add(decal(new THREE.CircleGeometry(0.1, 18), 0x6a3a08, sx * 0.125, 0.02, 0.035, 0.85, 1.05)); const e = decal(new THREE.CircleGeometry(0.088, 18), ec, sx * 0.125, 0.02, 0.037, 0.85, 1.05); e.userData.by = 1.05 * 0.088; face.add(e); blink.push(e); face.add(decal(new THREE.CircleGeometry(0.03, 10), 0xffffff, sx * 0.125 - 0.025, 0.07, 0.045)); face.add(decal(new THREE.CircleGeometry(0.014, 8), 0xffffff, sx * 0.125 + 0.03, -0.02, 0.045)); } break;
    case 'white': for (const sx of [-1, 1]) { face.add(decal(new THREE.CircleGeometry(1, 18), 0x7a2a88, sx * 0.125, 0.02, 0.035, 0.085, 0.11)); const e = decal(new THREE.CircleGeometry(1, 18), fill ?? 0xffffff, sx * 0.125, 0.02, 0.037, 0.068, 0.092); e.userData.by = 0.092; face.add(e); blink.push(e); } brows(0.1); break;
    case 'happy': for (const sx of [-1, 1]) face.add(arcDecal(0.06, 0.013, DARK, sx * 0.125, 0.0, 0.037, true)); brows(0.05, 0.15); break;
    case 'closed': for (const sx of [-1, 1]) face.add(arcDecal(0.06, 0.013, DARK, sx * 0.125, 0.045, 0.037, false)); brows(0.1); break;
    case 'heart': for (const sx of [-1, 1]) { const h = decal(heartGeo(0.17), 0xe83a5a, sx * 0.125, 0.025, 0.04); face.add(h); blink.push(h); h.userData.by = 1; } break;
    case 'x': for (const sx of [-1, 1]) for (const r of [Math.PI / 4, -Math.PI / 4]) { const l = decal(new THREE.PlaneGeometry(0.15, 0.025), DARK, sx * 0.125, 0.02, 0.04); l.rotation.z = r; face.add(l); } break;
    case 'side': for (const sx of [-1, 1]) { face.add(decal(new THREE.CircleGeometry(1, 18), 0xffffff, sx * 0.125, 0.02, 0.036, 0.07, 0.095)); face.add(decal(new THREE.CircleGeometry(0.048, 12), DARK, sx * 0.125 + 0.03, 0.02, 0.04)); lid(sx, 0.4); } brows(0.05); break;
    case 'tired': for (const sx of [-1, 1]) { round(sx, DARK, false); lid(sx, 0.5); } brows(-0.12, 0.12); break;
    case 'angry': for (const sx of [-1, 1]) round(sx); brows(0.4); break;
    case 'slit': for (const sx of [-1, 1]) { face.add(decal(new THREE.CircleGeometry(1, 18), ec, sx * 0.125, 0.02, 0.036, 0.07, 0.095)); face.add(decal(new THREE.PlaneGeometry(0.018, 0.17), DARK, sx * 0.125, 0.02, 0.04)); } brows(0.1); break;
    case 'flat': for (const sx of [-1, 1]) { const e = decal(new THREE.CircleGeometry(1, 18), ec, sx * 0.125, 0.02, 0.036, 0.07, 0.095); e.userData.by = 0.095; face.add(e); blink.push(e); } brows(0.1); break;
    case 'clown': for (const sx of [-1, 1]) { face.add(decal(new THREE.CircleGeometry(1, 18), ec, sx * 0.125, 0.02, 0.035, 0.09, 0.115)); const e = decal(new THREE.CircleGeometry(1, 18), 0xffffff, sx * 0.125, 0.02, 0.037, 0.065, 0.088); face.add(e); face.add(decal(new THREE.CircleGeometry(0.03, 10), DARK, sx * 0.125, 0.02, 0.04)); } brows(0.1); break;
    case 'laser':
      for (const sx of [-1, 1]) { round(sx); const b = glowM(new THREE.CylinderGeometry(0.024, 0.03, 0.34, 6), ec, 0.9); b.rotation.set(Math.PI / 2, 0, 0); const g = new THREE.Group(); g.add(b); b.position.z = 0.18; g.position.set(sx * 0.125, 0.02, 0.05); face.add(g); }
      brows(0.3); break;
    case 'visor': {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), new THREE.MeshBasicMaterial({ map: gradTex(ec, o.eyeColor2 ?? ec) })); m.position.set(0, 0.03, 0.046); m.userData.noOutline = true; face.add(m);
      face.add(boxM(0.64, 0.02, 0.012, 0x20182c, 0, 0.11, 0.046)); face.add(boxM(0.64, 0.02, 0.012, 0x20182c, 0, -0.05, 0.046)); break;
    }
    case 'glass': {
      for (const sx of [-1, 1]) {
        round(sx);
        const ring = decal(new THREE.TorusGeometry(0.105, 0.014, 5, 16), o.frameColor ?? 0x222230, sx * 0.125, 0.02, 0.05); face.add(ring);
        const lens = decal(new THREE.CircleGeometry(0.105, 16), ec, sx * 0.125, 0.02, 0.048); lens.material.transparent = true; lens.material.opacity = 0.32; face.add(lens);
      }
      face.add(decal(new THREE.PlaneGeometry(0.06, 0.016), o.frameColor ?? 0x222230, 0, 0.04, 0.05)); break;
    }
    case 'vr': {
      face.add(cm(new THREE.BoxGeometry(0.62, 0.21, 0.09), 0x22222c, 0, 0.03, 0.07));
      for (const sx of [-1, 1]) face.add(decal(new THREE.PlaneGeometry(0.2, 0.12), ec, sx * 0.14, 0.03, 0.12));
      break;
    }
    default: for (const sx of [-1, 1]) round(sx); brows(0.1);
  }
  if (o.tears) tears();
  cheeks();
  return blink;
}

// the coin held in the mouth: BTC orange with a white B, Mon indigo with the white rounded-square mark
const COIN_TEX = {};
function coinTexture(kind) {
  if (COIN_TEX[kind]) return COIN_TEX[kind];
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), mon = kind === 'mon';
  const gr = g.createRadialGradient(46, 42, 6, 64, 64, 64); gr.addColorStop(0, mon ? '#8a72e8' : '#ffb347'); gr.addColorStop(1, mon ? '#4a34a8' : '#e07a14'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = mon ? '#2e2070' : '#b85a0c'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 55, 0, Math.PI * 2); g.stroke(); g.strokeStyle = mon ? '#b8a8ff' : '#ffd890'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 47, 0, Math.PI * 2); g.stroke();
  g.fillStyle = g.strokeStyle = '#ffffff';
  if (mon) { g.lineWidth = 9; g.lineJoin = 'round'; g.beginPath(); g.moveTo(44, 48); g.lineTo(84, 48); g.lineTo(98, 64); g.lineTo(84, 80); g.lineTo(44, 80); g.lineTo(30, 64); g.closePath(); g.stroke(); }
  else { g.font = '700 74px "Fredoka", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₿', 64, 68); }
  const t = new THREE.CanvasTexture(cv); t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; return COIN_TEX[kind] = t;
}
// ---- mouth
function chogMouth(face, o) {
  const m = o.mouth, X = 0.015, ink = 0x2a1230;
  const smile = (y = -0.115, r = 0.065) => face.add(arcDecal(r, 0.009, ink, X, y, 0.036, false, 0.55));
  switch (m) {
    case 'sad': face.add(arcDecal(0.06, 0.009, ink, X, -0.15, 0.036, true, 0.5)); break;
    case 'flat': face.add(decal(new THREE.PlaneGeometry(0.11, 0.014), ink, X, -0.125, 0.036)); break;
    case 'worried': case 'wavy': { for (let i = 0; i < 4; i++) { const l = decal(new THREE.PlaneGeometry(0.045, 0.013), ink, X - 0.07 + i * 0.047, -0.125 + (i % 2 ? 0.012 : -0.012), 0.036); l.rotation.z = i % 2 ? -0.5 : 0.5; face.add(l); } if (m === 'worried') face.add(decal(new THREE.CircleGeometry(0.02, 8), TEAR, 0.19, 0.1, 0.04)); break; }
    case 'drool': {                                                   // an open mouth (dark inside, pink tongue) with a stream of drool from its lower edge
      face.add(decal(new THREE.CircleGeometry(1, 18), ink, X, -0.15, 0.036, 0.07, 0.062)); face.add(decal(new THREE.CircleGeometry(1, 18), 0x6a2a2a, X, -0.15, 0.038, 0.058, 0.05)); face.add(decal(new THREE.CircleGeometry(1, 14), 0xf0708f, X, -0.168, 0.04, 0.042, 0.026));
      face.add(decal(new THREE.PlaneGeometry(0.03, 0.2), TEAR, X - 0.025, -0.28, 0.042)); face.add(decal(new THREE.CircleGeometry(0.018, 8), TEAR, X - 0.025, -0.385, 0.042)); break; }
    case 'wo': face.add(decal(new THREE.CircleGeometry(1, 16), ink, X + 0.015, -0.135, 0.036, 0.03, 0.043)); face.add(decal(new THREE.CircleGeometry(1, 8), 0xffffff, X + 0.006, -0.12, 0.04, 0.008, 0.011)); break;
    case 'bubble': { smile(-0.13, 0.05); const b = cm(new THREE.SphereGeometry(0.075, 8, 6), 0xff7ab8, X, -0.115, 0.08); b.userData.noOutline = true; face.add(b); break; }
    case 'puke': { smile(-0.125, 0.05); ['#e83a3a', '#f08a30', '#f4d83a', '#4ac85a', '#3a8ae8', '#8a4ad8'].forEach((c, i) => face.add(decal(new THREE.PlaneGeometry(0.035, 0.3), parseInt(c.slice(1), 16), -0.0 + (i - 2.5) * 0.034, -0.27, 0.05))); break; }
    case 'gold': face.add(decal(new THREE.PlaneGeometry(0.17, 0.05), 0xffffff, X, -0.125, 0.036)); face.add(arcDecal(0.085, 0.012, ink, X, -0.1, 0.038, false, 0.6)); face.add(decal(new THREE.PlaneGeometry(0.03, 0.036), 0xf0c040, 0.05, -0.135, 0.041)); break;
    case 'grit': face.add(decal(new THREE.PlaneGeometry(0.15, 0.075), 0x2a1230, X, -0.125, 0.036)); face.add(decal(new THREE.PlaneGeometry(0.13, 0.055), 0xffffff, X, -0.125, 0.038)); for (const x of [-0.04, 0, 0.04]) face.add(decal(new THREE.PlaneGeometry(0.008, 0.055), ink, X + x, -0.125, 0.04)); break;
    case 'lipbite': smile(-0.12, 0.06); face.add(decal(new THREE.PlaneGeometry(0.1, 0.02), 0xffffff, X, -0.118, 0.038)); face.add(decal(new THREE.PlaneGeometry(0.02, 0.05), 0xe86a8a, 0.06, -0.14, 0.04)); break;
    case 'coin': {                                                    // the art: a wide grin of white teeth and a big coin held at its lower left, over the chin
      const grin = new THREE.Shape(); grin.moveTo(X - 0.04, -0.095); grin.lineTo(X + 0.17, -0.07); grin.lineTo(X + 0.17, -0.108); for (let i = 0; i < 6; i++) grin.lineTo(X + 0.17 - (i + 0.5) * 0.035, -0.13 - (i % 2 ? 0 : 0.01)), grin.lineTo(X + 0.17 - (i + 1) * 0.035, -0.118); grin.lineTo(X - 0.04, -0.095);
      for (const [dx, dy] of [[-0.007, 0], [0.007, 0], [0, -0.007], [0, 0.007], [0.005, 0.005], [-0.005, -0.005]]) { const ol = decal(new THREE.ShapeGeometry(grin), ink, dx, dy, 0.036); face.add(ol); } face.add(decal(new THREE.ShapeGeometry(grin), 0xf6f6f2, 0, 0, 0.038));
      for (const x of [-0.02, 0.02, 0.06, 0.1]) face.add(decal(new THREE.PlaneGeometry(0.006, 0.04), 0xb8b8c0, X + x, -0.098, 0.04));
      const tex = coinTexture(o.coinKind || 'btc'), edge = tmat(new THREE.Color(o.coinKind === 'mon' ? 0x3a2a80 : 0xb86a10).multiplyScalar(EXPO).getHex(), { em: 0.2 }), fm = new THREE.MeshToonMaterial({ map: tex, gradientMap: toonGrad4, color: 0x9a9aa0, emissive: 0x201810 });
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.032, 24), [edge, fm, fm]); c.rotation.x = Math.PI / 2; const cg = new THREE.Group(); cg.position.set(X + 0.02, -0.215, 0.08); c.userData.noOutline = true; cg.rotation.z = -0.35; cg.rotation.y = 0.3; cg.add(c); face.add(cg); break; }
    case 'clown': face.add(arcDecal(0.135, 0.03, 0xd8202a, X, -0.085, 0.037, false, 0.62)); face.add(arcDecal(0.12, 0.012, 0x7a1018, X, -0.115, 0.039, false, 0.55)); break;
    case 'oval': face.add(decal(new THREE.CircleGeometry(1, 16), 0x6a3a28, X, -0.15, 0.036, 0.05, 0.085)); face.add(decal(new THREE.CircleGeometry(1, 16), 0x3a1a14, X, -0.16, 0.038, 0.036, 0.065)); break;
    case 'zomb': face.add(decal(new THREE.PlaneGeometry(0.27, 0.13), 0x3a1020, X, -0.14, 0.036)); for (let i = -3; i <= 3; i++) { const t = decal(new THREE.CircleGeometry(0.03, 3), 0xf4f4e0, X + i * 0.037, -0.09, 0.04); t.rotation.z = Math.PI / 2 * 3 + Math.PI / 2; face.add(t); const u = decal(new THREE.CircleGeometry(0.026, 3), 0xf4f4e0, X + i * 0.037 + 0.018, -0.2, 0.04); u.rotation.z = Math.PI / 2; face.add(u); }
      for (const [x, len] of [[-0.06, 0.2], [0.05, 0.28], [0.1, 0.16]]) { face.add(decal(new THREE.PlaneGeometry(0.03, len), 0x9ae04a, x, -0.2 - len / 2, 0.042)); face.add(decal(new THREE.CircleGeometry(0.02, 8), 0x9ae04a, x, -0.2 - len, 0.042)); } break;
    case 'frog': face.add(arcDecal(0.11, 0.028, 0xe86a8a, X, -0.14, 0.037, true, 0.55)); face.add(arcDecal(0.1, 0.014, 0x8a2a4a, X, -0.17, 0.039, true, 0.55)); break;
    case 'fangs': smile(-0.115, 0.07); for (const sx of [-1, 1]) { const f = decal(new THREE.CircleGeometry(0.022, 3), 0xffffff, X + sx * 0.06, -0.14, 0.04); f.rotation.z = Math.PI / 2; face.add(f); } break;
    case 'teeth': face.add(decal(new THREE.PlaneGeometry(0.22, 0.06), 0xf0eedc, X, -0.14, 0.037)); for (let i = -2; i <= 2; i++) face.add(decal(new THREE.PlaneGeometry(0.008, 0.06), ink, X + i * 0.04, -0.14, 0.039)); break;
    default: smile();
  }
  if (o.cigar) {
    const c = cm(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6), 0x7a4a24, 0.09, -0.15, 0.08); c.rotation.z = 1.2; c.userData.noOutline = true; face.add(c);
    const e = glowM(new THREE.SphereGeometry(0.03, 6, 5), 0xff6a20, 0.9); e.position.set(0.19, -0.11, 0.08); face.add(e);
  }
}

// ---- headwear (the plain cap / straw / crown / headset stay in chog.js)
function chogHead(head, o, trim) {
  const k = o.head, c = o.headC ?? 0x3a8ad6, c2 = o.headC2 ?? 0xffffff;
  const add = m => { head.add(m); return m; };
  const dome = (r, y, col, sy = 0.85) => { const m = cm(new THREE.SphereGeometry(r * 1.2, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), col, 0, y, -0.1); m.scale.set(1, sy, 1); return add(m); };
  const ring = (r, tube, y, col, z = -0.04) => { const t = cm(new THREE.TorusGeometry(r, tube, 5, 12), col, 0, y, z); t.rotation.x = Math.PI / 2; return add(t); };
  switch (k) {
    case 'bucket': add(cm(new THREE.CylinderGeometry(0.34, 0.42, 0.22, 10), c, 0, 0.44, -0.1)); add(cm(new THREE.CylinderGeometry(0.6, 0.6, 0.03, 12), c, 0, 0.34, -0.06)); ring(0.4, 0.03, 0.38, c2, -0.1); break;
    case 'beanie': dome(0.37, 0.3, c); ring(0.46, 0.05, 0.3, c2, -0.1); if (o.pom) add(cm(new THREE.SphereGeometry(0.075, 7, 6), c2, 0, 0.64, -0.04)); break;
    case 'wizard': { const cone = add(cm(new THREE.ConeGeometry(0.42, 0.95, 8), c, 0, 0.82, -0.14)); cone.rotation.x = -0.2; add(cm(new THREE.CylinderGeometry(0.62, 0.62, 0.03, 12), c, 0, 0.38, -0.08)); ring(0.45, 0.04, 0.44, c2, -0.1); break; }
    case 'headband': { ring(0.5, 0.04, 0.2, c, -0.12); add(cm(new THREE.SphereGeometry(0.07, 6, 5), c, -0.5, 0.2, -0.1)); for (const dy of [-0.06, -0.14]) add(cm(new THREE.BoxGeometry(0.05, 0.16, 0.025), c, -0.53, 0.12 + dy, -0.16)); break; }
    case 'durag': dome(0.38, 0.26, c); for (const sx of [-1, 1]) add(cm(new THREE.BoxGeometry(0.07, 0.4, 0.02), c, sx * 0.08, 0.1, -0.6)); break;
    case 'helmet': { dome(0.4, 0.26, 0xb8bcc8, 0.95); add(cm(new THREE.BoxGeometry(0.09, 0.22, 0.7), 0xd8302a, 0, 0.66, -0.1)); for (const sx of [-1, 1]) add(cm(new THREE.BoxGeometry(0.06, 0.34, 0.26), 0xb8bcc8, sx * 0.5, 0.0, 0.0)); break; }
    case 'ushanka': dome(0.39, 0.28, c); for (const sx of [-1, 1]) add(cm(new THREE.BoxGeometry(0.1, 0.32, 0.32), c, sx * 0.52, 0.04, -0.08)); break;
    case 'thorn': for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(cm(new THREE.ConeGeometry(0.055, 0.24, 5), 0xa8a8b8, Math.cos(a) * 0.2, 0.52, Math.sin(a) * 0.2 - 0.06)); } break;
    case 'horns': for (const sx of [-1, 1]) { const h = add(cm(new THREE.ConeGeometry(0.1, 0.5, 6), c, sx * 0.3, 0.62, -0.1)); h.rotation.z = -sx * 0.5; h.rotation.x = -0.15; const b = add(cm(new THREE.CylinderGeometry(0.11, 0.13, 0.08, 6), new THREE.Color(c).multiplyScalar(0.75).getHex(), sx * 0.24, 0.42, -0.1)); b.rotation.z = -sx * 0.5; } break;
    case 'seal': {                                                    // the Holy Seal: a floating golden sun, a ring with twelve spikes round a lattice
      const g = new THREE.Group(); g.position.set(0, 0.8, -0.04); head.add(g); const gold = 0xf4c030;
      const r = cm(new THREE.TorusGeometry(0.15, 0.028, 6, 18), gold, 0, 0, 0); g.add(r);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, s = cm(new THREE.ConeGeometry(0.03, 0.1, 5), gold, Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0); s.rotation.z = a - Math.PI / 2; g.add(s); }
      const lat = decal(new THREE.CircleGeometry(0.135, 14), 0xffe070, 0, 0, 0.004); g.add(lat); for (const k of [-0.09, -0.045, 0, 0.045, 0.09]) { g.add(decal(new THREE.PlaneGeometry(0.01, 0.26 * Math.sqrt(1 - (k / 0.135) ** 2)), 0xb07a10, k, 0, 0.008)); const h = decal(new THREE.PlaneGeometry(0.26 * Math.sqrt(1 - (k / 0.135) ** 2), 0.01), 0xb07a10, 0, k, 0.008); g.add(h); }
      const g2 = glowM(new THREE.CircleGeometry(0.3, 16), 0xffe080, 0.4); g2.position.set(0, 0, -0.02); g.add(g2); break; }
    case 'plumber': add(cm(new THREE.CylinderGeometry(0.3, 0.34, 0.18, 8), 0xd8302a, 0, 0.42, -0.02)); add(cm(new THREE.BoxGeometry(0.4, 0.04, 0.26), 0xd8302a, 0, 0.36, 0.34)); add(decal(new THREE.CircleGeometry(0.08, 12), 0xffffff, 0, 0.43, 0.33)); break;
    case 'robber': dome(0.37, 0.3, 0x24222e); ring(0.36, 0.05, 0.32, 0x24222e); break;
    default: dome(0.37, 0.3, c);                            // unknown hat: a plain dome in the trait colour
  }
}

// ---- held item / accessory (right hand)
function chogAccessory(arm, face, o) {
  const k = o.acc; let m;
  if (k === 'coin') { m = cm(new THREE.CylinderGeometry(0.1, 0.1, 0.025, 12), 0xf0b030, 0, 0, 0); m.rotation.x = Math.PI / 2; m.position.set(0.16, -0.42, 0.17); }
  else if (k === 'candle') { m = new THREE.Group(); m.add(cm(new THREE.BoxGeometry(0.08, 0.26, 0.08), o.accColor ?? 0x3ac85a, 0, 0, 0)); m.add(boxM(0.012, 0.42, 0.012, o.accColor ?? 0x3ac85a, 0, 0, 0)); m.position.set(0.16, -0.35, 0.16); }
  else if (k === 'heart') { m = new THREE.Mesh(heartGeo(0.22), new THREE.MeshBasicMaterial({ color: 0xff4a80, side: THREE.DoubleSide })); m.position.set(0.16, -0.42, 0.2); m.userData.noOutline = true; }
  else if (k === 'knife') { m = new THREE.Group(); const bl = cm(new THREE.BoxGeometry(0.035, 0.26, 0.01), 0xc8ccd8, 0, 0.14, 0); m.add(bl); m.add(cm(new THREE.BoxGeometry(0.045, 0.1, 0.045), 0x3a2418, 0, -0.04, 0)); m.position.set(0.16, -0.42, 0.14); m.rotation.z = -0.5; }
  else if (k === 'frog') { m = new THREE.Group(); m.add(cm(new THREE.SphereGeometry(0.1, 8, 6), 0x4ac85a, 0, 0, 0)); for (const sx of [-1, 1]) { m.add(cm(new THREE.SphereGeometry(0.04, 6, 5), 0xffffff, sx * 0.06, 0.08, 0.04)); m.add(decal(new THREE.CircleGeometry(0.018, 8), DARK, sx * 0.06, 0.08, 0.085)); } m.position.set(0.16, -0.44, 0.18); }
  else if (k === 'badge') { m = cm(new THREE.BoxGeometry(0.16, 0.16, 0.03), 0x8a4ad8, 0.16, -0.42, 0.17); }
  if (m) arm.add(m);
}

// ---- aura: glow behind the Chog + a ring on the ground, animated by root.userData.tick(t)
function chogAura(root, o) {
  const c = o.aura, st = o.auraStyle || 'glow', g = new THREE.Group(); root.add(g);
  const sp = glowSprite(c, 3.4, 0.5); sp.position.set(0, 0.95, -0.5); g.add(sp);
  const ringM = glowM(new THREE.RingGeometry(0.44, 0.6, 24), c, 0.55); ringM.rotation.x = -Math.PI / 2; ringM.position.y = 0.02; g.add(ringM);
  const bits = [];
  if (st === 'fire') for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, f = glowM(new THREE.ConeGeometry(0.07, 0.4, 4), i % 2 ? 0xffd040 : c, 0.8); f.position.set(Math.cos(a) * 0.5, 0.2, Math.sin(a) * 0.5); g.add(f); bits.push([f, i]); }
  if (st === 'wind') for (let i = 0; i < 3; i++) { const w = glowM(new THREE.TorusGeometry(0.55 + i * 0.08, 0.012, 4, 24, 4.4), c, 0.7); w.rotation.x = Math.PI / 2; w.position.y = 0.35 + i * 0.4; g.add(w); bits.push([w, i]); }
  if (st === 'smoke') for (let i = 0; i < 6; i++) { const s = glowM(new THREE.SphereGeometry(0.12, 6, 5), c, 0.35); g.add(s); bits.push([s, i]); }
  root.userData.tick = t => {
    sp.material.opacity = 0.42 + 0.1 * Math.sin(t * 2.2);
    for (const [b, i] of bits) {
      if (st === 'fire') { b.scale.y = 0.75 + 0.45 * Math.abs(Math.sin(t * 6 + i * 1.7)); b.position.y = 0.05 + 0.2 * b.scale.y; }
      else if (st === 'wind') b.rotation.z = t * (1.6 - i * 0.4) + i * 2;
      else { const p = (t * 0.35 + i / 6) % 1, a = i * 1.9; b.position.set(Math.cos(a) * 0.45, 0.1 + p * 1.3, Math.sin(a) * 0.45); b.material.opacity = 0.35 * (1 - p); b.scale.setScalar(0.7 + p); }
    }
  };
}
