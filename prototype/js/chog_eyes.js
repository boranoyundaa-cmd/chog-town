// ===== the eyes of every Eyes trait value, one by one (58 values) =====
// Each value is a small drawing on the face plate, made from a few primitives and compared with the official art one by one
// (tools/value_sheet.py list|sheet Eyes). chog_parts.js chogEyes() calls eyeLook() when the trait value is known here; the older keyword styles stay for the legends.
// Face-local axes: x right, y up, z towards the camera. The eyes sit at x = -0.125 / +0.125, y = 0.02; the face is about 0.55 wide.
const EYE_X = 0.125, EYE_Y = 0.02, INKC = 0x120820;
function eyeBuilder(face, o) {
  let n = 0; const z = () => 0.035 + (n++) * 0.0016, blink = [], add = m => { face.add(m); return m; };
  const b = {
    blink,
    oval(x, y, rx, ry, c, bl) { const m = add(decal(new THREE.CircleGeometry(1, 22), c, x, y, z(), rx, ry)); if (bl) { m.userData.by = ry; blink.push(m); } return m; },
    ring(x, y, r, tube, c, sy = 1) { return add(decal(new THREE.TorusGeometry(r, tube, 5, 24), c, x, y, z(), 1, sy)); },
    line(x, y, w, h, rot, c) { const m = add(decal(new THREE.PlaneGeometry(w, h), c, x, y, z())); m.rotation.z = rot; return m; },
    arc(x, y, r, up, c, t = 0.015, sy = 1) { return add(arcDecal(r, t, c, x, y, z(), up, sy)); },
    tri(x, y, s, rot, c) { const m = add(decal(new THREE.CircleGeometry(s, 3), c, x, y, z())); m.rotation.z = rot; return m; },
    glossy(x, y, rx, ry, c = INKC, bl = true) {                                           // the art's eye: a black (or coloured) glossy oval with one big and one small highlight
      b.oval(x, y, rx * 1.1, ry * 1.08, INKC); const e = b.oval(x, y, rx, ry, c, bl);
      b.oval(x - rx * 0.28, y + ry * 0.34, rx * 0.3, ry * 0.26, 0xffffff); b.oval(x + rx * 0.34, y - ry * 0.38, rx * 0.12, ry * 0.1, 0xffffff); return e;
    },
    sclera(x, y, rx, ry, pupil = INKC, ox = 0, oy = 0, pr = 0.5, line = INKC, fill = 0xffffff) {      // a white eye with a pupil, the way the "retard", "round eye" and "side eye" eyes are drawn
      b.oval(x, y, rx * 1.1, ry * 1.08, line); b.oval(x, y, rx, ry, fill); const p = b.oval(x + ox, y + oy, rx * pr, ry * pr * (ry / rx), pupil, true); b.oval(x + ox - rx * 0.12, y + oy + ry * 0.12, rx * 0.12, rx * 0.12, 0xffffff); return p;
    },
    brow(x, y, w, rot, c = INKC, t = 0.022) { return b.line(x, y, w, t, rot, c); },
    lid(x, y, w, h, c) { return b.line(x, y, w, h, 0, c || o.faceC || 0xfdf3cc); },
    tears(sx, long = 0.2) { b.line(sx * 0.155, -0.09, 0.04, long, 0, 0xa8d8f0); b.oval(sx * 0.155, -0.09 - long / 2, 0.022, 0.022, 0xa8d8f0); },
    beam(sx, c, core) {                                                                    // a laser leaving the eye (glow objects, not drawn in portraits)
      const g = new THREE.Group(), m = glowM(new THREE.CylinderGeometry(0.024, 0.03, 0.34, 6), c, 0.9); m.rotation.x = Math.PI / 2; m.position.z = 0.18; g.add(m);    // straight ahead and parallel, short (angled beams looked cross-eyed)
      if (core) { const k = glowM(new THREE.CylinderGeometry(0.01, 0.014, 0.34, 5), core, 1); k.rotation.x = Math.PI / 2; k.position.z = 0.18; g.add(k); }
      g.position.set(sx * EYE_X, EYE_Y, 0.05); face.add(g);
    },
    visor(stops, w = 0.62, h = 0.16, y = 0.03, frame = 0x20182c) {                         // a wide strip over both eyes with a colour gradient
      const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: gradStops(stops) }))); m.position.set(0, y, z() + 0.01); m.userData.noOutline = true;
      for (const dy of [h / 2, -h / 2]) add(boxM(w + 0.02, 0.022, 0.012, frame, 0, y + dy, z() + 0.012)); for (const sx of [-1, 1]) add(boxM(0.022, h + 0.02, 0.012, frame, sx * w / 2, y, z() + 0.012));
      add(decal(new THREE.PlaneGeometry(w * 0.4, 0.014), 0xffffff, -w * 0.18, y + h * 0.28, z() + 0.02)); return m;
    },
    pair(f) { for (const sx of [-1, 1]) f(sx); },
  };
  return b;
}
function gradStops(stops) {                                                              // horizontal gradient texture from colours
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 4; const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 128, 0);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), '#' + new THREE.Color(c).getHexString())); g.fillStyle = gr; g.fillRect(0, 0, 128, 4); const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.LinearFilter; return t;
}
function letterTex(ch, fg, bg) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); g.fillStyle = bg; g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill(); g.strokeStyle = fg; g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.stroke(); g.fillStyle = fg; g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 32, 35); return new THREE.CanvasTexture(cv); }

const EYE_LOOK = {
  '3D Glass': b => { for (const [sx, c] of [[-1, 0xe84a4a], [1, 0x4a6ae8]]) { b.oval(sx * EYE_X, EYE_Y, 0.11, 0.085, c); b.line(sx * EYE_X, EYE_Y + 0.085, 0.24, 0.02, 0, 0x2a2a3a); b.line(sx * EYE_X, EYE_Y - 0.085, 0.24, 0.02, 0, 0x2a2a3a); b.line(sx * (EYE_X + 0.11), EYE_Y, 0.02, 0.17, 0, 0x2a2a3a); b.line(sx * (EYE_X - 0.11), EYE_Y, 0.02, 0.17, 0, 0x2a2a3a); b.oval(sx * EYE_X - 0.03, EYE_Y + 0.02, 0.03, 0.025, 0xffffff); } b.line(0, EYE_Y + 0.07, 0.04, 0.02, 0, 0x2a2a3a); },
  Angry: b => b.pair(sx => { b.glossy(sx * EYE_X, EYE_Y, 0.065, 0.088); b.brow(sx * EYE_X, 0.145, 0.17, sx * 0.45, INKC, 0.026); }),
  'Anime Glass': b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.11, 0.11, 0xe8f4ff); b.glossy(sx * EYE_X, EYE_Y, 0.04, 0.055, 0x2a2438); b.ring(sx * EYE_X, EYE_Y, 0.115, 0.016, 0xf4f4f4); b.ring(sx * EYE_X, EYE_Y, 0.128, 0.01, 0x1a1a24); }),
  Base: b => b.pair(sx => { b.glossy(sx * EYE_X, EYE_Y, 0.065, 0.088); b.brow(sx * EYE_X, 0.14, 0.14, sx * 0.1); }),
  'Blue Flat': b => b.pair(sx => b.line(sx * EYE_X, EYE_Y, 0.15, 0.022, sx * -0.08, 0x1a4a9a)),
  'Blue Happy': b => b.pair(sx => b.arc(sx * EYE_X, EYE_Y - 0.01, 0.06, true, 0x1a4a9a, 0.016)),
  'Blue Retard': b => { b.sclera(-EYE_X, EYE_Y, 0.1, 0.1, INKC, 0.02, 0.0, 0.55, 0x1a4a9a); b.sclera(EYE_X + 0.01, EYE_Y, 0.065, 0.075, INKC, -0.01, 0.0, 0.55, 0x1a4a9a); },
  'Blue Round Eye': b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.1, 0.1, 0x1a4a9a); b.oval(sx * EYE_X, EYE_Y, 0.083, 0.083, 0xe0f8ff); }),
  'Blue Smirk': b => { b.arc(-EYE_X, EYE_Y + 0.0, 0.065, false, 0x1a4a9a, 0.016); b.glossy(EYE_X, EYE_Y, 0.07, 0.09, 0x2a5ae0); b.brow(EYE_X, 0.15, 0.14, -0.15, 0x1a4a9a); },
  'BTC Glass': b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.115, 0.115, 0xf0a030); b.ring(sx * EYE_X, EYE_Y, 0.1, 0.012, 0xc87818); const l = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), new THREE.MeshBasicMaterial({ map: letterTex('B', '#ffffff', '#f0a030'), transparent: true })); l.position.set(sx * EYE_X, EYE_Y, 0.052); l.userData.noOutline = true; b.face.add(l); }),
  'Chog Viper': b => b.visor([0x30c8f0, 0x2a8af0, 0x1a4ad8], 0.64, 0.19, 0.03, 0xf4f8ff),
  'Classic VR': b => {                                                                    // wide black goggles in a light frame, three white slanted glints (the slab's front is at z = 0.105)
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.22, 0.07), tmat(0x22222c, { em: 0.2 })); m.position.set(0, 0.03, 0.07); face_add(b, m);
    const on = (g, c, x, y, z, rot = 0) => { const d = decal(g, c, x, y, z); d.rotation.z = rot; b.face.add(d); return d; };
    on(roundRectGeo(0.67, 0.245, 0.07), 0x9a9aa6, 0, 0.03, 0.1075); on(roundRectGeo(0.6, 0.18, 0.055), 0x15151d, 0, 0.03, 0.109);
    for (const [x, w] of [[-0.15, 0.05], [-0.04, 0.035], [0.07, 0.05]]) { const g = new THREE.Shape(); g.moveTo(-w / 2 - 0.05, -0.085); g.lineTo(w / 2 - 0.05, -0.085); g.lineTo(w / 2 + 0.05, 0.085); g.lineTo(-w / 2 + 0.05, 0.085); g.closePath(); on(new THREE.ShapeGeometry(g), 0xeeeef4, x, 0.03, 0.1105); }
    on(new THREE.PlaneGeometry(0.58, 0.012), 0x5a5a66, 0, 0.105, 0.1105);
  },
  'Closed Eye Crying': b => b.pair(sx => { b.arc(sx * EYE_X, EYE_Y + 0.045, 0.06, false, INKC, 0.016); b.tears(sx); }),
  'Clown Eye': b => b.pair(sx => { b.glossy(sx * EYE_X, EYE_Y, 0.06, 0.085); b.tri(sx * (EYE_X + 0.075), EYE_Y + 0.07, 0.05, sx * 0.5, sx < 0 ? 0xd82230 : 0x2a50d0); b.brow(sx * EYE_X, 0.15, 0.14, sx * -0.3); }),
  'Clown Eye Mix': b => b.pair(sx => { b.glossy(sx * EYE_X, EYE_Y, 0.06, 0.085); b.tri(sx * (EYE_X - 0.07), EYE_Y + 0.06, 0.05, 3.14 + sx * 0.5, sx < 0 ? 0xd82230 : 0x2a50d0); b.brow(sx * EYE_X, 0.15, 0.14, sx * 0.25); }),
  'cyan laser': b => b.pair(sx => { b.glossy(sx * EYE_X, EYE_Y, 0.065, 0.085); b.beam(sx, 0x30e0f0, 0xe0ffff); b.brow(sx * EYE_X, 0.145, 0.15, sx * 0.3); }),
  Dead: b => b.pair(sx => { for (const r of [Math.PI / 4, -Math.PI / 4]) b.line(sx * EYE_X, EYE_Y, 0.17, 0.034, r, INKC); }),
  'fire laser': b => b.pair(sx => { b.glossy(sx * EYE_X, EYE_Y, 0.065, 0.085); b.beam(sx, 0xff4a20, 0xffe040); b.brow(sx * EYE_X, 0.145, 0.15, sx * 0.35); }),
  Flat: b => b.pair(sx => b.line(sx * EYE_X, EYE_Y, 0.15, 0.026, 0, INKC)),
  Frog: b => b.pair(sx => { b.sclera(sx * EYE_X, EYE_Y, 0.095, 0.085, INKC, sx * 0.02, 0.0, 0.62); b.lid(sx * EYE_X, EYE_Y + 0.062, 0.22, 0.07); b.line(sx * EYE_X, EYE_Y + 0.03, 0.2, 0.018, 0, INKC); }),
  'Gradient visor': b => b.visor([0xe8308a, 0x7a3ad8, 0x3a6af0], 0.62, 0.17),
  'Green Happy': b => b.pair(sx => b.arc(sx * EYE_X, EYE_Y - 0.01, 0.06, true, 0x0a5a2a, 0.016)),
  'Green laser': b => b.pair(sx => { b.glossy(sx * EYE_X, EYE_Y, 0.065, 0.085); b.beam(sx, 0x30e040, 0xe8ffe0); b.brow(sx * EYE_X, 0.145, 0.15, sx * 0.3); }),
  'Green Retard': b => { b.sclera(-EYE_X, EYE_Y, 0.1, 0.1, 0x0a5a2a, 0.0, 0.0, 0.45, 0x0a5a2a); b.sclera(EYE_X + 0.01, EYE_Y, 0.07, 0.075, 0x0a5a2a, -0.01, 0, 0.5, 0x0a5a2a); },
  'Green Round Eye': b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.1, 0.1, 0x3a8a1a); b.oval(sx * EYE_X, EYE_Y, 0.083, 0.083, 0xf0f830); }),
  'Green Side Eye': b => b.pair(sx => { b.glossy(sx * EYE_X, EYE_Y - 0.005, 0.065, 0.07, 0x0a5a2a); b.lid(sx * EYE_X, EYE_Y + 0.065, 0.2, 0.06); b.line(sx * EYE_X, EYE_Y + 0.036, 0.19, 0.02, sx * 0.1, INKC); }),
  'Green Smirk': b => { b.glossy(-EYE_X, EYE_Y, 0.065, 0.08, 0x1a8a3a); b.glossy(EYE_X, EYE_Y, 0.065, 0.08, 0x1a8a3a); b.brow(-EYE_X, 0.15, 0.15, -0.25, 0x0a5a2a); b.brow(EYE_X, 0.14, 0.15, -0.05, 0x0a5a2a); },
  Happy: b => b.pair(sx => b.arc(sx * EYE_X, EYE_Y - 0.01, 0.06, true, INKC, 0.018)),
  Heart: b => b.pair(sx => { const h = decal(heartGeo(0.19), 0xe83a3a, sx * EYE_X, EYE_Y + 0.02, 0.04); h.userData.by = 1; b.blink.push(h); face_add(b, h); }),
  'Mixed Happy': b => { b.pair(sx => b.arc(sx * EYE_X, EYE_Y - 0.01, 0.06, true, 0x5a1a8a, 0.016)); },
  'Mixed Retard': b => { b.sclera(-EYE_X, EYE_Y, 0.1, 0.1, 0x6a2a8a, 0.02, 0.0, 0.5, 0x5a1a7a); b.sclera(EYE_X + 0.01, EYE_Y, 0.065, 0.075, 0x6a2a8a, -0.01, 0, 0.55, 0x5a1a7a); },
  'Mixed Round Eye': b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.108, 0.115, 0x6a2a8a); b.oval(sx * EYE_X, EYE_Y, 0.093, 0.1, 0xffffff); }),
  'Mixed Side Eye': b => { b.arc(-EYE_X, EYE_Y, 0.06, false, 0x5a1a7a, 0.016); b.glossy(EYE_X, EYE_Y - 0.01, 0.065, 0.06, 0x6a2a9a); b.lid(EYE_X, EYE_Y + 0.05, 0.2, 0.06); b.line(EYE_X, EYE_Y + 0.024, 0.19, 0.02, 0.05, 0x5a1a7a); },
  'Modern VR': b => {                                                                     // black glossy visor with a cyan neon rim and a curved glint
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.22, 0.07), tmat(0x101016, { em: 0.2 })); m.position.set(0, 0.03, 0.07); face_add(b, m);
    const on = (g, c, x, y, z, rot = 0) => { const d = decal(g, c, x, y, z); d.rotation.z = rot; b.face.add(d); return d; };
    on(roundRectGeo(0.67, 0.245, 0.09), 0x30c8ff, 0, 0.03, 0.1075); on(roundRectGeo(0.64, 0.215, 0.08), 0x0a0a10, 0, 0.03, 0.109);
    const g = decal(new THREE.TorusGeometry(0.075, 0.012, 4, 16, Math.PI * 0.9), 0xffffff, -0.1, 0.045, 0.1105); g.rotation.z = Math.PI * 0.55; b.face.add(g); on(new THREE.CircleGeometry(0.012, 8), 0xffffff, -0.17, 0.0, 0.1105);
  },
  MOG: b => b.visor([0xe83a2a, 0xf4a020, 0xf0e040, 0x40d8b0, 0x2a8ae8], 0.64, 0.18),
  Normal: b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.082, 0.1, INKC); b.oval(sx * EYE_X - 0.02, EYE_Y + 0.035, 0.022, 0.026, 0xffffff); }),
  'Normal Eye': b => { b.glossy(-EYE_X, EYE_Y, 0.065, 0.09); b.glossy(EYE_X, EYE_Y, 0.065, 0.09); b.brow(-EYE_X, 0.14, 0.15, -0.12); b.brow(EYE_X, 0.15, 0.15, 0.25); },
  'Plasma visor': b => b.visor([0x30a8f8, 0x30e0a0, 0xe8f030, 0xf08a20], 0.64, 0.19),
  'Purple laser': b => b.pair(sx => { b.glossy(sx * EYE_X, EYE_Y, 0.065, 0.085); b.beam(sx, 0xb040ff, 0xf0d8ff); b.brow(sx * EYE_X, 0.145, 0.15, sx * 0.3); }),
  'Red Flat': b => b.pair(sx => b.line(sx * EYE_X, EYE_Y, 0.15, 0.026, sx * -0.05, 0x8a1a2a)),
  'Red Retard': b => { b.sclera(-EYE_X, EYE_Y, 0.1, 0.1, 0x8a1a2a, 0.0, 0.0, 0.5, 0x8a1a2a); b.sclera(EYE_X + 0.01, EYE_Y, 0.065, 0.075, 0x8a1a2a, -0.01, 0, 0.55, 0x8a1a2a); },
  'Red Round Eye': b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.108, 0.115, 0x8a1a2a); b.oval(sx * EYE_X, EYE_Y, 0.093, 0.1, 0xffffff); }),
  Retard: b => { b.sclera(-EYE_X, EYE_Y, 0.105, 0.105, INKC, 0.025, 0.0, 0.5); b.sclera(EYE_X + 0.015, EYE_Y, 0.07, 0.08, INKC, -0.01, 0.0, 0.5); },
  'Retro Glass': b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.108, 0.088, 0xa8d8f0); b.glossy(sx * EYE_X, EYE_Y, 0.04, 0.055, 0x2a2438); b.line(sx * EYE_X, EYE_Y + 0.088, 0.23, 0.02, 0, 0xd8323c); b.line(sx * EYE_X, EYE_Y - 0.088, 0.23, 0.02, 0, 0xd8323c); b.line(sx * (EYE_X + 0.11), EYE_Y, 0.02, 0.18, 0, 0xd8323c); b.line(sx * (EYE_X - 0.11), EYE_Y, 0.02, 0.18, 0, 0xd8323c); }),
  Round: b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.098, 0.105, INKC); b.oval(sx * EYE_X, EYE_Y, 0.082, 0.09, INKC, true); b.oval(sx * EYE_X - 0.026, EYE_Y + 0.035, 0.03, 0.034, 0xffffff); b.oval(sx * EYE_X + 0.03, EYE_Y - 0.035, 0.014, 0.014, 0xffffff); }),
  'Round Crying': b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.098, 0.105, INKC); b.oval(sx * EYE_X - 0.026, EYE_Y + 0.035, 0.03, 0.034, 0xffffff); b.oval(sx * EYE_X + 0.03, EYE_Y - 0.035, 0.014, 0.014, 0xffffff); b.tears(sx, 0.22); }),
  'Round Eye': b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.1, 0.105, INKC); b.oval(sx * EYE_X, EYE_Y, 0.082, 0.088, 0xffffff); b.oval(sx * EYE_X, EYE_Y, 0.058, 0.064, INKC, true); }),
  'Round Tear': b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.098, 0.105, INKC); b.oval(sx * EYE_X - 0.026, EYE_Y + 0.035, 0.03, 0.034, 0xffffff); b.oval(sx * EYE_X + 0.03, EYE_Y - 0.035, 0.014, 0.014, 0xffffff); b.tears(-1, 0.16); }),
  'Side Eye': b => b.pair(sx => { b.sclera(sx * EYE_X, EYE_Y - 0.005, 0.085, 0.07, INKC, 0.03, -0.0, 0.62); b.lid(sx * EYE_X, EYE_Y + 0.052, 0.22, 0.06); b.line(sx * EYE_X, EYE_Y + 0.026, 0.2, 0.022, sx * 0.1, INKC); }),
  Smirk: b => { b.sclera(-EYE_X, EYE_Y, 0.085, 0.075, INKC, 0.025, 0.01, 0.6); b.sclera(EYE_X, EYE_Y, 0.07, 0.08, INKC, 0.02, 0.01, 0.6); b.lid(-EYE_X, EYE_Y + 0.05, 0.2, 0.05); b.line(-EYE_X, EYE_Y + 0.026, 0.19, 0.02, 0.1, INKC); b.brow(EYE_X, 0.15, 0.14, -0.3); },
  'Sunset visor': b => b.visor([0x8a0a1a, 0xe03a20, 0xf48a30], 0.64, 0.19),
  Teary: b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.1, 0.105, INKC); b.oval(sx * EYE_X, EYE_Y, 0.082, 0.09, INKC, true); b.oval(sx * EYE_X - 0.026, EYE_Y + 0.035, 0.03, 0.034, 0xffffff); b.oval(sx * EYE_X + 0.03, EYE_Y - 0.035, 0.016, 0.016, 0xffffff); b.tears(sx, 0.17); }),
  Thug: b => { b.line(0, 0.04, 0.62, 0.14, 0, INKC); b.line(0, 0.1, 0.5, 0.03, 0, INKC); for (const [x, y] of [[-0.2, 0.03], [-0.14, 0.07], [0.12, 0.03], [0.18, 0.07], [0.06, 0.075]]) b.line(x, y, 0.022, 0.022, 0, 0xffffff); b.line(0, 0.07, 0.07, 0.024, 0, INKC); },
  Tired: b => b.pair(sx => { b.glossy(sx * EYE_X, EYE_Y - 0.015, 0.065, 0.065, INKC); b.lid(sx * EYE_X, EYE_Y + 0.048, 0.2, 0.06); b.line(sx * EYE_X, EYE_Y + 0.022, 0.2, 0.026, sx * 0.08, INKC); b.arc(sx * EYE_X, EYE_Y - 0.075, 0.05, false, 0xb0a090, 0.008); }),
  Up: b => b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.1, 0.11, INKC); b.oval(sx * EYE_X, EYE_Y + 0.04, 0.034, 0.04, 0xffffff); }),
  Vertical: b => { b.sclera(-EYE_X, EYE_Y, 0.1, 0.075, INKC, 0.0, 0, 0.0); b.line(-EYE_X, EYE_Y, 0.02, 0.15, 0, INKC); b.oval(-EYE_X - 0.02, EYE_Y + 0.02, 0.02, 0.018, 0xffffff); b.sclera(EYE_X + 0.01, EYE_Y, 0.06, 0.06, INKC, 0.0, 0, 0.0); b.line(EYE_X + 0.01, EYE_Y, 0.014, 0.1, 0, INKC); },
  Worried: b => b.pair(sx => { b.glossy(sx * EYE_X, EYE_Y, 0.065, 0.088); b.brow(sx * EYE_X, 0.15, 0.17, sx * -0.4, INKC, 0.026); if (sx > 0) b.line(0.22, 0.08, 0.02, 0.05, 0, 0xa8d8f0); }),
  XD: b => b.pair(sx => { b.line(sx * EYE_X - sx * 0.01, EYE_Y + 0.025, 0.1, 0.03, -sx * 0.45, INKC); b.line(sx * EYE_X - sx * 0.01, EYE_Y - 0.025, 0.1, 0.03, sx * 0.45, INKC); }),
};
function roundRectGeo(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return new THREE.ShapeGeometry(s); }
function face_add(b, m) { m.userData.noOutline = true; b.face && b.face.add(m); }
function eyeLook(face, o) {                                                              // build the eyes of o.eyeName; returns the meshes that blink
  const b = eyeBuilder(face, o); b.face = face;
  if (o.bald) { b.pair(sx => { b.oval(sx * EYE_X, EYE_Y, 0.095, 0.115, INKC); }); }       // a skull: every eye sits in a black socket
  const look = EYE_LOOK[o.eyeName];
  if (o.bald && !/laser|Dead|Happy|Heart|XD|Visor|visor|VR|Glass|MOG|Thug/.test(o.eyeName)) { b.pair(sx => b.oval(sx * EYE_X, EYE_Y + (o.eyeName === 'Up' ? 0.04 : 0), 0.034, 0.04, 0xffffff, true)); if (/Angry/.test(o.eyeName)) b.pair(sx => b.brow(sx * EYE_X, 0.15, 0.17, sx * 0.45, INKC, 0.03)); }
  else look(b);
  if (o.tears) b.pair(sx => b.tears(sx));
  if (!o.noCheeks) for (const sx of [-1, 1]) face.add(decal(new THREE.CircleGeometry(0.065, 14), 0xd93d86, sx * 0.205, -0.1, 0.033, 1, 0.85));
  return b.blink;
}
