// ===== props: plaques, signs and small interactive props of the town (CULTURE.plaques, CULTURE.props) =====
// Plaques are simple signs in the game's style (a post and a board, chalk or graffiti on the pavement, a poster on two legs with the text in big letters on a coloured field).
// Click one to read it (a card). Interactive props: gm wall, touch grass, liquidation button, seed-phrase vending machine, money printer, draw-a-line whiteboard,
// gas station bench, laser-eyes photo booth. Everything solid registers a walking blocker (WORLD_BLOCKERS and game.js BLOCKERS) away from doors and the residents' spots.
// Live Hotel boards (hotel_live.js feeds them): the advertising column by NOVA, the plaza street board, and the Inspect stand by the Hotel door.
// Lobby / elevator / hotel-hall plaques and props are not placed here: PROPS.forPlace(placeId) returns their data for hotel.js. Loaded after npc.js and culture.js.
const PROPS = { roots: [], placed: [], group: new THREE.Group(), card: null, count: 0 };
(function () {
  world.add(PROPS.group); CITY_NODES.push(PROPS.group);
  const PLACE_EXTRA = false;                                                      // liquidation button, money printer, vending machine, whiteboard, gas bench: dormant (not placed in the town)
  const INK = '#2b2140', CREAM = '#fff6e0', PAL = ['#7a3ac8', '#ff5aa8', '#e8a817', '#2fb5a0', '#e8742a', '#5a3a9a', '#3a74d8'], ROT = Math.PI / 4;       // boards face the camera (it looks along -1,-1,-1)
  const FONT = '"Fredoka", "Nunito", sans-serif', FONT2 = '"Bungee", "Fredoka", sans-serif';
  const hashS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const redraws = [], dimMats = [];
  const forPlace = id => ({ plaques: CULTURE.plaques.filter(p => p.place === id), props: CULTURE.props.filter(p => p.place === id) });
  PROPS.forPlace = forPlace;

  // ---------- canvas textures (repainted when the web fonts arrive)
  function wrapText(g, text, maxW, maxLines, px0, pxMin, font) {
    if (String(text).includes('\n')) { const ls = String(text).split('\n'); for (let px = px0; px >= pxMin; px -= 2) { g.font = `600 ${px}px ${font}`; if (ls.length <= maxLines + 2 && ls.every(l => g.measureText(l).width <= maxW)) return { lines: ls, px }; } return null; }
    for (let px = px0; px >= pxMin; px -= 2) {
      g.font = `600 ${px}px ${font}`; const words = String(text).split(/\s+/), lines = []; let cur = '';
      for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } } if (cur) lines.push(cur);
      if (lines.length <= maxLines && lines.every(l => g.measureText(l).width <= maxW)) return { lines, px };
    }
    return null;
  }
  function canvasMat(w, h, drawFn, transparent = true) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    const draw = () => { g.clearRect(0, 0, w, h); drawFn(g, w, h); tex.needsUpdate = true; }; draw(); redraws.push(draw);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent, side: THREE.DoubleSide }); dimMats.push(m); return m;
  }
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // a board: text on a field. o = { bg, fg, border, font, shadow, px }
  function boardMat(w, h, text, o = {}) {
    const W = 512, H = Math.round(512 * h / w);
    return canvasMat(W, H, (g, cw, ch) => {
      if (o.bg) { g.fillStyle = o.bg; rrect(g, 6, 6, cw - 12, ch - 12, 26); g.fill(); if (o.border) { g.lineWidth = 8; g.strokeStyle = o.border; g.stroke(); } }
      const fit = wrapText(g, text, cw - 60, 4, o.px || 76, 22, o.font || FONT) || { lines: [String(text).slice(0, 14)], px: 40 };
      g.font = `600 ${fit.px}px ${o.font || FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; const lh = fit.px * 1.12;
      fit.lines.forEach((l, i) => { const y = ch / 2 + (i - (fit.lines.length - 1) / 2) * lh; if (o.shadow) { g.lineWidth = 9; g.strokeStyle = o.shadow; g.lineJoin = 'round'; g.strokeText(l, cw / 2, y); } g.fillStyle = o.fg || INK; g.fillText(l, cw / 2, y); });
    });
  }
  const posterMat = (title, text, col, art, faded) => canvasMat(256, 340, (g, w, h) => {
    g.fillStyle = CREAM; g.fillRect(0, 0, w, h); g.fillStyle = col; g.fillRect(14, 14, w - 28, h - 28); g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(w * 0.8, h * 0.2, 70, 0, 7); g.fill();
    g.fillStyle = CREAM; g.textAlign = 'center'; g.textBaseline = 'middle';
    const big = text || title, fit = wrapText(g, big, w - 56, 4, 58, 20, FONT2) || { lines: [String(big).slice(0, 12)], px: 30 }; g.font = `${fit.px}px ${FONT2}`; const lh = fit.px * 1.08;
    fit.lines.forEach((l, i) => { const y = h / 2 + 10 + (i - (fit.lines.length - 1) / 2) * lh; g.lineWidth = 8; g.strokeStyle = INK; g.lineJoin = 'round'; g.strokeText(l, w / 2, y); g.fillStyle = CREAM; g.fillText(l, w / 2, y); });
    if (faded) { g.fillStyle = 'rgba(226,214,196,.6)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,70,50,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h * 0.62); g.lineTo(w * 0.4, h * 0.5); g.lineTo(w * 0.7, h * 0.7); g.stroke(); }
  }, false);
  if (document.fonts) Promise.all(['64px "Bungee"', '600 48px "Fredoka"'].map(f => document.fonts.load(f))).then(() => redraws.forEach(f => f())).catch(() => { });

  // ---------- walking blockers (both lists: the world's and game.js's copy), and a place finder that keeps doors, residents and other things clear
  const addBlock = (x, z, hw, hd) => { const b = { x, z, hw, hd }; WORLD_BLOCKERS.push(b); if (typeof BLOCKERS !== 'undefined' && BLOCKERS !== WORLD_BLOCKERS) BLOCKERS.push(b); if (BG) stamp(BG, b); return b; };
  const doorPts = () => { const p = []; for (const k of ['moka', 'arcade', 'nova', 'gallery', 'hotel']) if (NPC.PL[k]) p.push([NPC.PL[k].x, NPC.PL[k].z]); for (const k in CITY.doors) { const d = CITY.doors[k]; p.push([d.x, d.z]); if (d.out !== undefined) p.push([d.x, d.out]); } return p; };
  const DOORS = doorPts(), SPOTS = Object.values(NPC.PL).filter(p => p.act !== 'in' && p.act !== 'stroll');
  const taken = [];
  const free = (x, z, r, gap, roadOk) => {
    if (Math.abs(x) > HALF - 0.8 || Math.abs(z) > HALF - 0.8) return false;
    if (!roadOk) for (const rd of CITY.roads || []) if (Math.abs((rd.axis === 'z' ? z : x) - rd.at) < CITY.road / 2 + 0.4) return false;
    for (const b of WORLD_BLOCKERS) if (Math.abs(x - b.x) < b.hw + r + 0.1 && Math.abs(z - b.z) < b.hd + r + 0.1) return false;
    for (const d of DOORS) if (Math.hypot(x - d[0], z - d[1]) < 1.15) return false;
    for (const s of SPOTS) if (Math.hypot(x - s.x, z - s.z) < 0.7) return false;
    for (const t of taken) if (Math.hypot(x - t.x, z - t.z) < t.r + r + gap) return false;
    return true;
  };
  // a new blocker must not seal a door or a resident's spot off from the street: flood fill from the spawn on a 0.25 grid (the player's walking radius)
  const RG = 0.25, RN = Math.round((HALF * 2 + 2) / RG), rIdx = v => Math.max(0, Math.min(RN - 1, Math.floor((v + HALF + 1) / RG))), rW = c => (c + 0.5) * RG - HALF - 1;
  const targets = () => { const t = []; for (const k in NPC.PL) { const p = NPC.PL[k]; if (p.act !== 'stroll') t.push([p.x, p.z]); } const h = CITY.doors.hotel; if (h) t.push([h.x, h.out !== undefined ? h.out : h.z]); return t; };
  let BG = null;                                                              // the blocker grid, built once and stamped as blockers are added (rebuilding it per candidate froze the 64 m town)
  function stamp(g, q) { const i0 = rIdx(q.x - q.hw - 0.25), i1 = rIdx(q.x + q.hw + 0.25), j0 = rIdx(q.z - q.hd - 0.25), j1 = rIdx(q.z + q.hd + 0.25);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.abs(rW(i) - q.x) < q.hw + 0.25 && Math.abs(rW(j) - q.z) < q.hd + 0.25) g[j * RN + i] = 1; }
  function baseGrid() {
    if (!BG) { BG = new Uint8Array(RN * RN); const lim = HALF - 0.45; for (let j = 0; j < RN; j++) for (let i = 0; i < RN; i++) if (Math.abs(rW(i)) > lim || Math.abs(rW(j)) > lim) BG[j * RN + i] = 1; for (const q of WORLD_BLOCKERS) stamp(BG, q); }
    return BG.slice();
  }
  function reachable(extra) {                                                  // extra = {x, z, hw, hd} a candidate blocker; returns the targets that cannot be reached
    const g = baseGrid(); if (extra) stamp(g, extra);
    const seen = new Uint8Array(RN * RN), q = [rIdx(CITY.spawn[0]) + rIdx(CITY.spawn[1]) * RN]; seen[q[0]] = 1;
    for (let h = 0; h < q.length; h++) { const c = q[h], ci = c % RN, cj = (c / RN) | 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const i = ci + di, j = cj + dj; if ((di || dj) && i >= 0 && j >= 0 && i < RN && j < RN && !g[j * RN + i] && !seen[j * RN + i] && !(di && dj && (g[cj * RN + i] || g[j * RN + ci]))) { seen[j * RN + i] = 1; q.push(j * RN + i); } } }
    return targets().filter(([x, z]) => { const i = rIdx(x), j = rIdx(z); for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) if (seen[(j + dj) * RN + i + di]) return false; return true; });
  }
  PROPS.reachable = reachable; let BASE = [];
  function fit(x, z, r = 0.3, gap = 1.2, roadOk = false, hw = 0) {
    for (let rad = 0; rad <= 8; rad += 0.25) { const n = rad === 0 ? 1 : Math.round(rad * 10); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, px = x + Math.cos(a) * rad, pz = z + Math.sin(a) * rad; if (free(px, pz, r, gap, roadOk) && (!hw || !reachable({ x: px, z: pz, hw, hd: hw }).some(t => !BASE.includes(String(t))))) return [px, pz]; } }
    return null;
  }
  PROPS.free = free; PROPS.fit = fit;                                           // for tests

  // ---------- picking, hover and the reading card
  const dom = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const rootOf = o => { for (; o; o = o.parent) if (o.userData && o.userData.cultureClick) return o; return null; };
  function pickAt(e) {
    if (!NPC.group.visible || (typeof GAME !== 'undefined' && (GAME.editMode || GAME.room))) return null;
    if (typeof GAME !== 'undefined' && GAME.hoverChog && GAME.hoverChog !== GAME.me) return null;                     // a Chog in front of a sign wins
    const r = dom.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(PROPS.roots.filter(g => g.visible), true).find(h => h.object.isMesh && !(h.object.userData && h.object.userData.noPick)); return hit ? rootOf(hit.object) : null;
  }
  let down = null, lastPtr = null;
  dom.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  dom.addEventListener('pointermove', e => { lastPtr = e; });
  dom.addEventListener('pointerleave', () => { lastPtr = null; });
  addEventListener('pointerup', e => {
    if (!down || e.target !== dom) { down = null; return; } const d = down; down = null;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 500) return;
    const g = pickAt(e); if (g) g.userData.cultureClick(g);
  });
  const hoverRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 28), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  hoverRing.rotation.x = -Math.PI / 2; hoverRing.userData.noNormal = true; hiddenInNormal.push(hoverRing); PROPS.group.add(hoverRing);
  const upd = GAME.updateHover;
  GAME.updateHover = () => {
    upd(); hoverRing.material.opacity = 0; if (!lastPtr || GAME.dragUI || GAME.editMode) return;
    const g = pickAt(lastPtr); if (g) { dom.style.cursor = 'pointer'; hoverRing.position.set(g.position.x, 0.05, g.position.z); hoverRing.scale.setScalar(g.userData.ringR || 1); hoverRing.material.opacity = 0.7; }
  };

  const css = document.createElement('style');
  css.textContent = `
    #cprops { position: fixed; inset: 0; z-index: 14; pointer-events: none; font: 700 14px/1.3 "Nunito", system-ui, sans-serif; color: ${INK}; }
    #cprops .cpc { position: absolute; left: 16px; bottom: 200px; width: 270px; padding: 12px 14px 14px; border-radius: 16px; background: #fffaf3; border: 1.5px solid rgba(58,36,96,.18); box-shadow: 0 8px 24px rgba(40,20,70,.24); pointer-events: auto; }
    #cprops .cpc h3 { margin: 0 24px 4px 0; font: 400 19px "Bree Serif", Georgia, serif; } #cprops .cpc p { margin: 6px 0 0; line-height: 1.35; font-weight: 600; } #cprops .cpc small { display: block; opacity: .65; font-size: 11px; margin-top: 8px; }
    #cprops .cpc .x { position: absolute; top: 6px; right: 6px; width: 26px; height: 26px; border: 0; border-radius: 50%; background: rgba(255,255,255,.9); box-shadow: 0 2px 8px rgba(40,20,70,.3); cursor: pointer; font-size: 15px; color: ${INK}; }
    #cprops .cgm { position: absolute; left: 0; top: 0; padding: 3px 12px; border-radius: 999px; background: #fff; border: 2.5px solid #3a2012; font: 600 16px "Fredoka", sans-serif; color: ${INK}; will-change: transform; }
    #cprops .cflash { position: absolute; inset: 0; background: radial-gradient(transparent 40%, rgba(255,40,40,.5)); opacity: 0; }
    #cprops .cwb { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 14px; border-radius: 18px; background: #fffaf3; border: 1.5px solid rgba(58,36,96,.2); box-shadow: 0 14px 40px rgba(40,20,70,.4); pointer-events: auto; text-align: center; }
    #cprops .cwb canvas { display: block; border-radius: 10px; background: #fff; cursor: crosshair; touch-action: none; border: 2px solid ${INK}; } #cprops .cwb b { display: block; margin-bottom: 6px; font: 400 18px "Bree Serif", Georgia, serif; } #cprops .cwb p { margin: 8px 0 0; min-height: 1.3em; }
    #cprops .cwb button { margin: 4px 4px 0; padding: 6px 16px; border-radius: 999px; border: 0; background: #7a3ac8; color: #fff; font: 700 13px "Nunito", sans-serif; cursor: pointer; } #cprops .cwb button.g { background: #e9e0f5; color: ${INK}; }`;
  document.head.appendChild(css);
  const host = document.createElement('div'); host.id = 'cprops'; document.body.appendChild(host);
  const uiZoom = () => { const u = document.getElementById('ui'); return u && u.style.zoom ? u.style.zoom : 1; };
  PROPS.closeCard = () => { if (PROPS.card) { PROPS.card.remove(); PROPS.card = null; } };
  PROPS.openCard = (title, text, small) => {
    PROPS.closeCard(); if (typeof NPC !== 'undefined' && NPC.card) NPC.closeCard();
    const c = document.createElement('div'); c.className = 'cpc'; c.style.zoom = uiZoom(); const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.onclick = PROPS.closeCard;
    const h = document.createElement('h3'); h.textContent = title; c.append(x, h); if (text) { const p = document.createElement('p'); p.textContent = text; c.appendChild(p); }
    if (small) { const s = document.createElement('small'); s.textContent = small; c.appendChild(s); } host.appendChild(c); PROPS.card = c; return c;
  };
  addEventListener('keydown', e => { if (e.code === 'Escape' && PROPS.card) PROPS.closeCard(); });
  const say = line => { if (typeof toast === 'function') toast(line); };
  const lines = id => (CULTURE.props.find(p => p.id === id) || { lines: [''] }).lines;
  const rand = a => a[Math.floor(Math.random() * a.length)];
  const sfx = n => { try { if (window.AUDIO) AUDIO.sfx(n); } catch (e) { /* ignore */ } };
  const reg = (g, click, ringR) => { g.userData.cultureClick = click; if (ringR) g.userData.ringR = ringR; PROPS.group.add(g); PROPS.roots.push(g); return g; };

  // ---------- plaques
  const kindOf = p => p.kind || /chalk|graffiti|stencil|puddle/i.test(p.title) ? 'ground' : p.art ? 'poster' : /statue|plinth/i.test(p.title) ? 'plinth' : 'post';
  const styleOf = p => {
    if (p.style) return p.style;
    if (/brass|memorial|gox|framed|print|notice|small print|clock|standee|window|plaque/i.test(p.title)) return { bg: '#ecc977', fg: '#3a2a14', border: '#8a6a2a' };
    if (/billboard|banner|ad\b|stand/i.test(p.title)) return { bg: PAL[hashS(p.id) % PAL.length], fg: CREAM, border: INK, shadow: INK, font: FONT2 };
    return { bg: CREAM, fg: INK, border: '#7a3ac8' };
  };
  const SHORT = { st_names: 'Satoshi Street / Hodl Lane', st_lost: 'Lost: 1 hardware wallet. Seed phrase on the back.', st_soover: "it's so over / we're so back", st_wagmi: 'WAGMI / NGMI', rekt_gox: 'Goxxed, 2014', img_looksrare: 'Looks rare.' };
const textOn = p => p.disp || SHORT[p.id] || p.text || p.title;
  function makePlaque(p, x, z) {
    const g = new THREE.Group(), kind = kindOf(p), wood = tmat(0x6a4c3a), trim = tmat(0x3f3850); g.position.set(x, 0, z); g.rotation.y = ROT;
    if (kind === 'ground') {
      const gr = /graffiti|stencil/i.test(p.title), m = boardMat(1.15, 0.62, textOn(p), gr ? { fg: '#ff5aa8', shadow: INK, font: FONT2, px: 80 } : { fg: '#f4f4f0', shadow: 'rgba(0,0,0,.35)', font: FONT2, px: 80 });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.62), m); pl.rotation.x = -Math.PI / 2; pl.position.y = 0.025; g.add(pl);
    } else if (kind === 'chalk') {
      for (const s of [-1, 1]) g.add(BOX(0.05, 1.05, 0.05, wood, s * 0.3, 0.52, -0.05));
      g.add(BOX(0.74, 0.96, 0.05, tmat(0x8a6238), 0, 0.82, 0)); const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.88), boardMat(0.66, 0.88, textOn(p), { bg: '#2c3a34', fg: '#f0f0e6', border: '#2c3a34', px: 52 })); pl.position.set(0, 0.82, 0.03); g.add(pl); addBlock(x, z, 0.35, 0.3);
    } else if (kind === 'bench') {
      g.add(BOX(1.4, 0.07, 0.42, tmat(0xc89868), 0, 0.46, 0)); g.add(BOX(1.4, 0.34, 0.06, tmat(0xb8885a), 0, 0.72, -0.2)); for (const s of [-1, 1]) g.add(BOX(0.07, 0.46, 0.4, tmat(0x3f3850), s * 0.6, 0.23, 0));
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), boardMat(0.3, 0.1, p.disp, { bg: '#b49a68', fg: '#6b5a30', border: '#8a7444', px: 60 })); pl.position.set(0.4, 0.72, -0.165); g.add(pl); addBlock(x, z, 0.6, 0.6);
    } else if (kind === 'poster') {
      for (const s of [-1, 1]) g.add(BOX(0.06, 1.3, 0.06, wood, s * 0.4, 0.65, -0.04));
      g.add(BOX(0.92, 1.18, 0.05, tmat(0xf4ead8), 0, 1.0, 0)); const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.1), posterMat(p.title, p.disp || p.text, p.col || PAL[hashS(p.id) % PAL.length], p.art, p.faded)); pl.position.set(0, 1.0, 0.03); g.add(pl);
      addBlock(x, z, 0.4, 0.4);
    } else if (kind === 'plinth') {
      g.add(BOX(0.7, 0.55, 0.7, tmat(0xe8dfd2), 0, 0.28, 0)); g.add(BOX(0.8, 0.07, 0.8, tmat(0xcfc4b4), 0, 0.58, 0));
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.34), boardMat(0.62, 0.34, textOn(p), styleOf(p))); pl.position.set(0, 0.3, 0.36); g.add(pl);
      g.add(SPH(0.22, tmat(PAL[hashS(p.id) % PAL.length], { em: 0.3 }), 0, 0.9, 0)); addBlock(x, z, 0.45, 0.45);
    } else {
      g.add(CYL(0.035, 0.045, 1.05, trim, 0, 0.52, -0.02, 6)); g.add(CYL(0.12, 0.14, 0.05, trim, 0, 0.03, -0.02, 8));
      g.add(BOX(1.04, 0.62, 0.06, tmat(0x3f3850), 0, 1.25, 0)); const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.56), boardMat(0.98, 0.56, textOn(p), styleOf(p))); pl.position.set(0, 1.25, 0.034); g.add(pl);
      addBlock(x, z, 0.2, 0.2);
    }
    g.traverse(o => { if (o.isMesh) { o.userData.noOutline = true; o.castShadow = kind !== 'ground'; } });
    reg(g, () => { PROPS.openCard(p.title, p.text, p.art ? '' : ''); sfx('click'); }, 0.8); PROPS.placed.push({ id: p.id, x, z, kind }); taken.push({ x, z, r: 0.35 }); PROPS.count++;
  }

  // ---------- interactive props. Each builds a group, registers its blocker and click, and may add a per-frame function
  const ticks = [];
  const flash = el => { el.style.transition = 'none'; el.style.opacity = 0.9; requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = 'opacity 1.6s'; el.style.opacity = 0; })); };
  const projV = new THREE.Vector3();
  const screenOf = (root, up) => { projV.set(root.position.x, root.position.y + up, root.position.z).project(cam); return [(projV.x * 0.5 + 0.5) * innerWidth, (-projV.y * 0.5 + 0.5) * innerHeight, projV.z]; };

  // gm wall: a ring of "gm" bubbles rises over every Chog near the wall
  const gm = { x: 1.4, z: -12.4, cool: 0, fl: [] };
  (function () {
    const g = new THREE.Group(); g.position.set(gm.x, 0, gm.z);
    for (const s of [-1, 1]) g.add(BOX(0.07, 1.5, 0.07, tmat(0x6a4c3a), s * 0.64, 0.75, -0.04));
    g.add(BOX(1.4, 0.95, 0.06, tmat(0x8a6238), 0, 1.05, 0));
    const gmWord = () => ((DAY.lamp || 0) < 0.35 ? 'gmonad' : 'gn'); gm.word = gmWord();
    const NOTES = [[40, 40, 130, 100, '#fff6e0', 'Piano lessons'], [190, 30, 100, 110, '#ffe27a', '@GM'], [310, 50, 150, 90, '#bfe6d4', 'Yard sale Sun'], [60, 190, 110, 100, '#f6c4d4', 'Free books'], [200, 180, 120, 110, '#fff6e0', 'Lost: grey cat'], [350, 190, 100, 100, '#cfd8f4', 'Room 4 free']];
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.85), canvasMat(520, 340, (c, w, h) => { c.fillStyle = '#c9a06a'; c.fillRect(0, 0, w, h); for (let [x, y, nw, nh, col, t] of NOTES) { c.fillStyle = col; c.fillRect(x, y, nw, nh); c.fillStyle = '#d04a4a'; c.beginPath(); c.arc(x + nw / 2, y + 8, 5, 0, 7); c.fill(); c.fillStyle = INK; if (t === '@GM') t = gmWord(); c.font = `600 ${t === 'gmonad' || t === 'gn' ? 27 : 19}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, x + nw / 2, y + nh / 2 + 6); } }, false)); pl.position.set(0, 1.05, 0.04); g.add(pl); gm.redraw = redraws[redraws.length - 1];
    const rc = new THREE.Group(); rc.position.set(0.5, 0.92, 0.06); const rp = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.26), canvasMat(80, 130, (c, w, h) => { c.fillStyle = '#f8f6ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#7a7a7a'; c.font = `600 11px ${FONT}`; c.textAlign = 'center'; c.fillText('RECEIPT', w / 2, 18); c.fillText('2 pizzas', w / 2, 52); c.fillText('10,000 BTC', w / 2, 70); c.fillText('2010', w / 2, 100); }, false)); rc.add(rp);
    rc.userData.cultureClick = () => PROPS.openCard('Pinned receipt', '2 pizzas. 10,000 BTC. May 22, 2010.'); g.add(rc);
    g.traverse(o => { if (o.isMesh) o.userData.noOutline = true; }); addBlock(gm.x, gm.z, 0.75, 0.15);
    reg(g, () => PROPS.gm(), 1.2); gm.g = g; PROPS.placed.push({ id: 'noticeboard', x: gm.x, z: gm.z }); taken.push({ x: gm.x, z: gm.z, r: 0.9 });
  })();
  PROPS.gm = () => {
    const now = performance.now(); if (now < gm.cool) { say('The wall is still saying gm.'); return; } gm.cool = now + 5000;
    const roots = [GAME.me, ...NPC.list.filter(r => r.c && r.c.visible).map(r => r.c), ...GAME.extraRoots()].filter(o => o && o.visible && Math.hypot(o.position.x - gm.x, o.position.z - gm.z) < 8);
    roots.forEach((root, i) => { const e = document.createElement('div'); e.className = 'cgm'; e.textContent = gm.word; e.style.opacity = 0; host.appendChild(e); gm.fl.push({ e, root, t0: now + i * 120 + 40 }); });
    sfx('gm'); if (gm.word === 'gmonad') say(CULTURE.ui.toasts.gm);
  };
  ticks.push(() => {
    const now = performance.now(), w = (DAY.lamp || 0) < 0.35 ? 'gmonad' : 'gn'; if (w !== gm.word) { gm.word = w; if (gm.redraw) gm.redraw(); }
    gm.fl = gm.fl.filter(f => {
      const age = (now - f.t0) / 1000; if (age < 0) return true; if (age > 2.6 || !f.root.parent) { f.e.remove(); return false; }
      const [sx, sy, sz] = screenOf(f.root, 2.0 * f.root.scale.y / CHOG_SCALE * 0.9 + age * 0.8), hide = sz > 1 || !NPC.group.visible;
      f.e.style.opacity = hide ? 0 : Math.min(1, age * 5) * Math.min(1, (2.6 - age) * 2); f.e.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -100%) scale(${(uiZoom() * (0.8 + Math.min(0.3, age))).toFixed(2)})`; return true;
    });
  });

  // touch grass: a roped patch; one second inside is one touch; ten touches unlock the title and a toast
  const grass = { x: -10.5, z: 21.5, hw: 1.1, hd: 0.7, t: 0, n: 0, inside: false };
  (function () {
    try { grass.n = +localStorage.getItem('chog_grass') || 0; } catch (e) { /* ignore */ }
    const g = new THREE.Group(); g.position.set(grass.x, 0, grass.z);
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(grass.hw * 2, grass.hd * 2), tmat(0x5eb868, { em: 0.25 })); patch.rotation.x = -Math.PI / 2; patch.position.y = 0.09; patch.userData.noPick = false; g.add(patch);
    for (let i = 0; i < 36; i++) { const t = M(new THREE.ConeGeometry(0.05, 0.22, 4), tmat(i % 3 ? 0x4aa858 : 0x7ad07a), (Math.random() * 2 - 1) * (grass.hw - 0.1), 0.15, (Math.random() * 2 - 1) * (grass.hd - 0.1)); t.rotation.y = Math.random() * 3; g.add(t); }
    g.traverse(o => { if (o.isMesh) { o.userData.noOutline = true; o.castShadow = false; } });
    PROPS.group.add(g); PROPS.placed.push({ id: 'grass', x: grass.x, z: grass.z }); taken.push({ x: grass.x, z: grass.z, r: 1.3 });
  })();
  ticks.push(dt => {
    if (!GAME.me || !NPC.group.visible) return; const p = GAME.me.position, ins = Math.abs(p.x - grass.x) < grass.hw && Math.abs(p.z - grass.z) < grass.hd;
    grass.inside = ins;
    if (ins) { grass.t += dt; if (grass.t >= 1) { grass.t -= 1; grass.n++; try { localStorage.setItem('chog_grass', grass.n); } catch (e) { /* ignore */ } if (grass.n === 10) { say('Touched grass x10. Title unlocked: "Touched grass".'); try { localStorage.setItem('chog_title_grass', '1'); } catch (e) { /* ignore */ } } } }
  });
  PROPS.grass = grass;

  // liquidation button next to the Arcade: siren, red flash, the degens say NOOO
  const liq = { x: 7.45, z: 3.7, cool: 0, beacon: null, until: 0 };
  if (PLACE_EXTRA) (function () {
    const g = new THREE.Group(); g.position.set(liq.x, 0, liq.z);
    g.add(CYL(0.16, 0.2, 0.9, tmat(0x3f3850), 0, 0.45, 0, 10)); g.add(BOX(0.5, 0.12, 0.5, tmat(0xd8d0e4), 0, 0.96, 0)); const bt = CYL(0.18, 0.2, 0.12, tmat(0xe02a2a, { em: 0.6 }), 0, 1.08, 0, 14); g.add(bt);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.3), boardMat(0.7, 0.3, 'DO NOT PUSH', { bg: '#f4c82c', fg: INK, border: INK, px: 70 })); pl.position.set(0, 0.6, 0.22); g.add(pl);
    const bc = SPH(0.12, tmat(0xff3030, { em: 0.2 }), 0, 1.3, 0); g.add(bc); liq.beacon = bc; liq.bt = bt;
    g.traverse(o => { if (o.isMesh) o.userData.noOutline = true; }); addBlock(liq.x, liq.z, 0.3, 0.3); reg(g, () => PROPS.liquidate(), 1); PROPS.placed.push({ id: 'liq', x: liq.x, z: liq.z }); taken.push({ x: liq.x, z: liq.z, r: 0.8 });
    const fl = document.createElement('div'); fl.className = 'cflash'; host.appendChild(fl); liq.fl = fl;
  })();
  PROPS.liquidate = () => {
    const now = performance.now(); if (now < liq.cool) { say('Cooling down. Your position is already closed.'); return; } liq.cool = now + 30000; liq.until = now + 2000;
    sfx('siren'); flash(liq.fl); say(rand(lines('liq')));
    for (const r of NPC.list) if (r.c && r.c.visible && ['degen', 'liquidated', 'milkshake', 'sweateranon'].includes(r.id)) PLATES.say(r.plate, 'NOOO.');
  };
  ticks.push(() => { if (!PLACE_EXTRA) return; const on = performance.now() < liq.until; liq.beacon.material.emissive.setHex(on && Math.floor(performance.now() / 160) % 2 ? 0xff4040 : 0x400000); liq.bt.position.y = on ? 1.04 : 1.08; });

  // seed-phrase vending machine near Moka & Co
  const vend = { x: -7.45, z: 6.0, n: 0 }, WORDS = ['apple', 'orbit', 'candle', 'harbor', 'ticket', 'velvet', 'ladder', 'quiet', 'jungle', 'marble', 'pepper', 'rocket', 'sunset', 'tunnel', 'wagon', 'yellow', 'zebra', 'anchor', 'bamboo', 'cactus'];
  if (PLACE_EXTRA) (function () {
    const g = new THREE.Group(); g.position.set(vend.x, 0, vend.z); g.rotation.y = 0.3;
    g.add(BOX(0.95, 1.75, 0.7, tmat(0x7a3ac8, { em: 0.25 }), 0, 0.88, 0)); g.add(BOX(0.7, 1.0, 0.04, tmat(0x1a1030), -0.05, 1.05, 0.36));
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.96), boardMat(0.66, 0.96, 'SEED PHRASE\ninsert a word', { bg: '#2a1a50', fg: '#7ae8ff', border: '#7ae8ff', px: 64 })); pl.position.set(-0.05, 1.05, 0.385); g.add(pl);
    g.add(BOX(0.7, 0.18, 0.04, tmat(0x1a1030), -0.05, 0.28, 0.36)); const lamp = BOX(0.1, 0.1, 0.05, glowMat(0x7ae8ff), 0.38, 1.4, 0.37); g.add(lamp); vend.lamp = lamp;
    g.traverse(o => { if (o.isMesh) o.userData.noOutline = true; }); addBlock(vend.x, vend.z, 0.55, 0.45); reg(g, () => PROPS.vend(), 1.1); PROPS.placed.push({ id: 'vending', x: vend.x, z: vend.z }); taken.push({ x: vend.x, z: vend.z, r: 0.9 });
  })();
  PROPS.vend = () => { vend.n++; sfx('coin'); if (vend.n >= 6) { vend.n = 0; say('Word 6: never share this.'); } else say(`Word ${vend.n}: ${rand(WORDS)}. Keep it secret.`); };

  // money printer by NOVA: brrr and flying notes
  const prn = { x: 8.2, z: -5.3, notes: [] };
  if (PLACE_EXTRA) (function () {
    const g = new THREE.Group(); g.position.set(prn.x, 0, prn.z);
    g.add(BOX(1.0, 0.8, 0.8, tmat(0x6a7a8c), 0, 0.4, 0)); g.add(BOX(1.04, 0.1, 0.84, tmat(0x4a5868), 0, 0.85, 0)); g.add(BOX(0.7, 0.04, 0.5, tmat(0xf0f0e8), 0, 0.92, 0.1)); g.add(BOX(0.3, 0.06, 0.12, glowMat(0x58e07a), 0.3, 0.7, 0.42));
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), boardMat(0.5, 0.2, 'brrr', { fg: '#3ac85a', shadow: INK, font: FONT2, px: 110 })); pl.position.set(-0.2, 0.45, 0.41); g.add(pl);
    for (let i = 0; i < 10; i++) { const n = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.14), new THREE.MeshBasicMaterial({ color: 0x8adf8a, side: THREE.DoubleSide, transparent: true })); n.visible = false; n.userData.noPick = true; g.add(n); prn.notes.push({ m: n, t: 99, vx: 0, vz: 0 }); }
    g.traverse(o => { if (o.isMesh) o.userData.noOutline = true; }); addBlock(prn.x, prn.z, 0.55, 0.45); reg(g, () => PROPS.print(), 1.1); prn.g = g; PROPS.placed.push({ id: 'printer', x: prn.x, z: prn.z }); taken.push({ x: prn.x, z: prn.z, r: 0.9 });
  })();
  PROPS.print = () => { sfx('brrr'); say(rand(lines('printer'))); prn.notes.forEach((n, i) => { n.t = -i * 0.12; n.vx = (Math.random() - 0.3) * 0.9; n.vz = 0.5 + Math.random() * 0.8; n.r = Math.random() * 6; }); prn.shake = 1.2; };
  ticks.push(dt => {
    if (!PLACE_EXTRA) return; for (const n of prn.notes) { n.t += dt; if (n.t < 0 || n.t > 1.8) { n.m.visible = false; continue; } n.m.visible = true; n.m.position.set(n.vx * n.t, 1.0 + n.t * 1.2 - n.t * n.t * 0.9, 0.2 + n.vz * n.t); n.m.rotation.set(n.t * 3, n.r + n.t * 2, n.t * 2); n.m.material.opacity = Math.min(1, (1.8 - n.t) * 2); }
    if (prn.shake > 0) { prn.shake -= dt; prn.g.rotation.z = Math.sin(prn.shake * 60) * 0.015; } else prn.g.rotation.z = 0;
  });

  // whiteboard: draw a line, the chart does the opposite
  const wb = { x: -7.4, z: 3.9, open: null };
  if (PLACE_EXTRA) (function () {
    const g = new THREE.Group(); g.position.set(wb.x, 0, wb.z); g.rotation.y = 0.35;
    for (const s of [-1, 1]) g.add(CYL(0.03, 0.04, 1.7, tmat(0x3f3850), s * 0.5, 0.85, -0.12, 6));
    g.add(BOX(1.2, 0.85, 0.06, tmat(0xf4f4ec), 0, 1.2, 0));
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.75), canvasMat(440, 300, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(122,58,200,.15)'; c.lineWidth = 2; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(0, i * h / 6); c.lineTo(w, i * h / 6); c.stroke(); }
      c.strokeStyle = '#e04a4a'; c.lineWidth = 7; c.lineJoin = 'round'; c.beginPath(); [[20, 220], [90, 120], [140, 190], [210, 70], [270, 150], [330, 60], [410, 110]].forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.fillStyle = INK; c.font = `600 34px ${FONT}`; c.textAlign = 'left'; c.fillText('DRAW A LINE', 18, 38); }, false)); pl.position.set(0, 1.2, 0.04); g.add(pl);
    g.traverse(o => { if (o.isMesh) o.userData.noOutline = true; }); addBlock(wb.x, wb.z, 0.62, 0.22); reg(g, () => PROPS.board(), 1.1); PROPS.placed.push({ id: 'draw', x: wb.x, z: wb.z }); taken.push({ x: wb.x, z: wb.z, r: 0.9 });
  })();
  PROPS.board = () => {
    if (wb.open) return; PROPS.closeCard();
    const box = document.createElement('div'); box.className = 'cwb'; box.style.zoom = uiZoom(); box.innerHTML = '<b>Draw a line</b>'; const cv = document.createElement('canvas'); cv.width = 560; cv.height = 300; box.appendChild(cv);
    const msg = document.createElement('p'), b1 = document.createElement('button'), b2 = document.createElement('button'); b1.textContent = 'Clear'; b1.className = 'g'; b2.textContent = 'Done'; box.append(msg, b1, b2); host.appendChild(box); wb.open = box;
    const g = cv.getContext('2d'); let pts = [], opp = null, drawing = false, raf = 0, ani = 0;
    const seed = hashS(String(Date.now())), series = []; let v = 150; for (let i = 0; i < 28; i++) { v += ((hashS(seed + ':' + i) % 100) - 50) * 0.5; v = Math.max(60, Math.min(240, v)); series.push(v); }
    const paintBoard = () => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 560, 300); g.strokeStyle = 'rgba(122,58,200,.14)'; g.lineWidth = 1; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(0, i * 37.5); g.lineTo(560, i * 37.5); g.stroke(); }
      series.forEach((s, i) => { const x = 14 + i * 19.5, up = i && s <= series[i - 1]; g.fillStyle = up ? '#3ac85a' : '#e04a4a'; g.fillRect(x, s - 14, 9, 28); g.fillRect(x + 3.5, s - 24, 2, 48); });
      if (pts.length > 1) { g.strokeStyle = '#7a3ac8'; g.lineWidth = 5; g.lineJoin = g.lineCap = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
      if (opp) { const n = Math.max(2, Math.floor(opp.length * Math.min(1, ani))); g.strokeStyle = '#e04a4a'; g.lineWidth = 7; g.beginPath(); opp.slice(0, n).forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
    };
    const loop = () => { paintBoard(); if (opp && ani < 1) { ani += 0.03; raf = requestAnimationFrame(loop); } };
    const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 560 / r.width, (e.clientY - r.top) * 300 / r.height]; };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); drawing = true; pts = [at(e)]; opp = null; msg.textContent = ''; paintBoard(); });
    cv.addEventListener('pointermove', e => { if (drawing) { pts.push(at(e)); paintBoard(); } });
    const up = () => { if (!drawing) return; drawing = false; if (pts.length < 4) return; const y0 = pts[0][1]; opp = pts.map(p => [p[0], Math.max(8, Math.min(292, 2 * y0 - p[1]))]); ani = 0; msg.textContent = rand(lines('draw')); sfx('click'); raf = requestAnimationFrame(loop); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    b1.onclick = () => { pts = []; opp = null; msg.textContent = ''; paintBoard(); };
    const close = () => { cancelAnimationFrame(raf); box.remove(); wb.open = null; }; b2.onclick = close; box.addEventListener('keydown', e => e.stopPropagation()); PROPS.closeBoard = close; paintBoard();
  };
  addEventListener('keydown', e => { if (e.code === 'Escape' && wb.open) PROPS.closeBoard(); });

  // gas station bench: a receipt when you sit down (stand next to it) or click it
  const gas = { x: 8.55, z: -1.95, near: false };
  if (PLACE_EXTRA) (function () {
    const g = new THREE.Group(); g.position.set(gas.x, 0, gas.z);
    g.add(BOX(1.4, 0.07, 0.42, tmat(0xc89868), 0, 0.46, 0.15)); g.add(BOX(1.4, 0.34, 0.06, tmat(0xb8885a), 0, 0.72, -0.05)); for (const s of [-1, 1]) g.add(BOX(0.07, 0.46, 0.4, tmat(0x3f3850), s * 0.6, 0.23, 0.15));
    g.add(BOX(0.34, 1.2, 0.3, tmat(0xe8503a, { em: 0.3 }), 0.95, 0.6, -0.1)); g.add(BOX(0.26, 0.26, 0.02, glowMat(0xfff2c8), 0.95, 1.0, 0.06)); g.add(CYL(0.02, 0.02, 0.5, tmat(0x24222e), 1.14, 0.6, -0.05, 4));
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), boardMat(0.5, 0.2, 'GAS', { bg: '#fff6e0', fg: INK, border: '#e8503a', font: FONT2, px: 100 })); pl.position.set(0.95, 1.4, 0); g.add(pl);
    g.traverse(o => { if (o.isMesh) o.userData.noOutline = true; }); addBlock(gas.x + 0.4, gas.z, 1.0, 0.42); reg(g, () => PROPS.receipt(), 1.2); PROPS.placed.push({ id: 'gasbench', x: gas.x, z: gas.z }); taken.push({ x: gas.x, z: gas.z, r: 1.2 });
  })();
  PROPS.receipt = () => { sfx('coin'); say(`Receipt #${1000 + Math.floor(Math.random() * 9000)}: 0.0001 gas. ` + rand(['Sat down. Gas paid. By nobody.', 'Total: 0. Tip: optional.'])); };
  ticks.push(() => { if (!PLACE_EXTRA || !GAME.me || !NPC.group.visible) return; const near = Math.hypot(GAME.me.position.x - gas.x, GAME.me.position.z - (gas.z + 0.55)) < 0.75; if (near && !gas.near) PROPS.receipt(); gas.near = near; });

  // laser-eyes photo booth: red eyes for 10 s, a picture with a small watermark two seconds in
  const booth = { x: 2.2, z: -15.6, laser: null, until: 0, snap: 0 };
  (function () {
    const g = new THREE.Group(); g.position.set(booth.x, 0, booth.z);
    g.add(BOX(1.0, 2.1, 0.95, tmat(0x7a3ac8, { em: 0.25 }), 0, 1.05, -0.05)); g.add(BOX(0.7, 1.55, 0.05, tmat(0x1a1030), 0, 0.95, 0.43)); g.add(BOX(0.74, 1.6, 0.04, tmat(0xe83a6a), 0.02, 0.95, 0.46));
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.3), boardMat(0.96, 0.3, 'PHOTO', { bg: '#1a1030', fg: '#ff5a5a', border: '#ff5a5a', px: 70 })); pl.position.set(0, 1.92, 0.43); g.add(pl);
    const eye = SPH(0.07, glowMat(0xff3030), 0.28, 1.5, 0.5); g.add(eye); booth.eye = eye;
    g.traverse(o => { if (o.isMesh) o.userData.noOutline = true; }); addBlock(booth.x, booth.z, 0.55, 0.5); reg(g, () => PROPS.laser(), 1.3); PROPS.placed.push({ id: 'laserbooth', x: booth.x, z: booth.z }); taken.push({ x: booth.x, z: booth.z, r: 1.0 });
  })();
  function laserOff() {
    if (!booth.laser) return; for (const o of booth.laser) { if (o.parent) o.parent.remove(o); const i = noNormalPass.indexOf(o); if (i >= 0) noNormalPass.splice(i, 1); } booth.laser = null;
  }
  PROPS.laser = () => {
    if (!GAME.me || !NPC.group.visible) return; laserOff(); sfx('camera_shutter'); say(rand(lines('laserbooth')));
    const eyes = GAME.me.userData.eyes || [], out = [];
    for (const e of eyes) {
      const p = e.parent; if (!p) continue;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 3.2), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      beam.position.set(e.position.x, e.position.y, e.position.z + 1.7); beam.userData.noNormal = true; beam.userData.noPick = true;
      const gl = glowSprite(0xff2a2a, 0.9, 1); gl.position.set(e.position.x, e.position.y, e.position.z + 0.08); gl.userData.noNormal = true;
      p.add(beam); p.add(gl); out.push(beam, gl); noNormalPass.push(beam, gl); hiddenInNormal.push(beam, gl);
    }
    booth.laser = out; booth.until = performance.now() + 10000; booth.snap = performance.now() + 2200;
  };
  ticks.push(() => {
    if (booth.laser) {
      const now = performance.now(), k = 0.75 + Math.sin(now / 70) * 0.25; for (const o of booth.laser) if (o.material && o.material.opacity !== undefined) o.material.opacity = k * (o.isSprite ? 1 : 0.85);
      if (booth.snap && now > booth.snap) { booth.snap = 0; PROPS.snap('chog_laser_' + Date.now() + '.png'); }
      if (now > booth.until) laserOff();
    }
    booth.eye.material.color.setHex(Math.floor(performance.now() / 500) % 2 ? 0xff3030 : 0x801818);
  });
  // a picture of the town with a small "Chog Hotel" watermark: saved by the dev server on localhost (like capture()), downloaded elsewhere
  PROPS.snap = async name => {
    try {
      renderFrame(); const src = renderer.domElement, cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; const g = cv.getContext('2d'); g.drawImage(src, 0, 0);
      const s = cv.height / 1080; g.font = `700 ${Math.round(40 * s)}px Fredoka, sans-serif`; g.textAlign = 'right'; g.textBaseline = 'bottom'; g.lineWidth = 7 * s; g.lineJoin = 'round'; g.strokeStyle = 'rgba(43,33,64,.85)'; g.strokeText('Chog Hotel', cv.width - 30 * s, cv.height - 24 * s); g.fillStyle = '#fff6e0'; g.fillText('Chog Hotel', cv.width - 30 * s, cv.height - 24 * s);
      const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) { await fetch('/save?name=' + name, { method: 'POST', body: blob }); say('Saved ' + name); }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); say('Picture saved. Smile.'); }
      return name;
    } catch (e) { console.warn('snap failed', e); return null; }
  };

  // ---------- the plaques: anchors are wishes, the finder moves each to free ground. Spots are chosen to be seen (the camera looks from the south-east)
  // ordinary signage (no jokes), and three hidden things: a tiny plate on a park bench, a faded old poster, one item on the cafe menu (the pinned receipt is on the notice board)
  const ST = { street: { bg: '#2f6a5c', fg: '#ffffff', border: '#e8f0e8' }, bus: { bg: '#ffd84a', fg: INK, border: INK }, hours: { bg: CREAM, fg: INK, border: '#8a6a3a' }, park: { bg: '#2f6a5c', fg: '#ffffff', border: '#e8f0e8' }, noskate: { bg: '#ffffff', fg: '#c02a2a', border: '#c02a2a' }, parking: { bg: '#3a74d8', fg: '#ffffff', border: '#ffffff' } };
  const SIGNS = [
    { id: 'sg_street', title: 'Street sign', text: 'Chog Avenue / Hotel Street', disp: 'Chog Avenue', style: ST.street, at: [6.0, 5.8], live: true },
    { id: 'sg_bus', title: 'Bus 7 timetable', text: 'Bus 7: every 30 minutes, 06:30 to 22:00.', disp: 'Bus 7\n07:10  07:40\n08:10  08:40', style: ST.bus, at: [-10.2, 11.2] },
    { id: 'sg_moka', title: 'Opening hours', text: 'Moka & Co: open 06:30 to 20:00.', disp: 'Moka & Co\nOpen 06:30 - 20:00', style: ST.hours, at: [-22.6, -12.4] },
    { id: 'sg_arcade', title: 'Opening hours', text: 'Arcade: open 15:00 to 02:00.', disp: 'Arcade\nOpen 15:00 - 02:00', style: ST.hours, at: [19.8, 5.6] },
    { id: 'sg_parking', title: 'Parking', text: 'Parking: 2 hours maximum.', disp: 'P\n2 hours max', style: ST.parking, at: [10.4, -10.4] },
    { id: 'sg_menu', title: 'Today at Moka & Co', text: 'Flat white 3.2 / Oat latte 3.8 / Hopium latte 4.2 / Croissant 2.5', disp: 'TODAY\nFlat white  3.2\nOat latte  3.8\nHopium latte  4.2\nCroissant  2.5', kind: 'chalk', at: [-22.2, -3.2] },
    { id: 'sg_park', title: 'Lantern Park', text: 'Lantern Park. Open from dawn to dusk.', disp: 'Lantern Park', style: ST.park, at: [-6.0, 11.0] },
    { id: 'sg_noskate', title: 'Park rules', text: 'No skateboarding.', disp: 'No skateboarding', style: ST.noskate, at: [-3.4, 11.2] },
    { id: 'hid_gox', title: 'Bench plaque', text: 'Goxxed, 2014', disp: 'Goxxed, 2014', kind: 'bench', at: [-14.0, 16.9] },
    { id: 'hid_poster', title: 'Old poster', text: 'BULL RUN. Nov 10, 2021. (Torn.)', disp: 'BULL RUN\nNov 2021', kind: 'poster', faded: true, col: '#9a8f86', at: [20.0, -3.2] },
  ];
  BASE = reachable().map(String);                                                 // targets that are already cut off stay allowed (otherwise no post could be placed at all)
  for (const p of SIGNS) {
    const k = kindOf(p), q = fit(p.at[0], p.at[1], 0.3, 1.2, false, k === 'ground' ? 0 : k === 'post' ? 0.2 : 0.5); if (!q) { console.warn('sign has no room', p.id); continue; }
    if (p.live) (PROPS.liveQ = PROPS.liveQ || []).push([p, q[0], q[1]]); else makePlaque(p, q[0], q[1]);
  }

  // ---------- live billboards: the Hotel's news (tonight's events, the busiest room, the Exhibition winner) on canvas, one page at a time, rotating every few seconds
  // Pages come from HLIVE.pages() (hotel_live.js, loaded later: read lazily); with no data one calm default page. A click walks you to the Hotel door (FIRST.goPlace, the first-steps auto-walk).
  const LIVE = { boards: [], pages: [{ k: 'default', size: '' }], page: 0, from: null, fade: 1, t: 0, rev: -1 };
  const HCOL = { events: '#e0408a', busiest: '#d99a10', winner: '#1f9a88', default: '#7a3ac8' }, HHEAD = { events: 'TONIGHT', busiest: 'BUSIEST ROOM', winner: 'EXHIBITION', default: 'CHOG HOTEL' };
  function fitOne(g, txt, maxW, px, font) { g.font = `600 ${px}px ${font}`; const wd = g.measureText(String(txt)).width; return { lines: [String(txt)], px: Math.max(8, Math.floor(wd > maxW ? px * maxW / wd : px)) }; }          // too wide even at the smallest size: shrink it to fit instead of cutting the text off
  function paintLive(g, w, h, pg, foot, inset) {
    const hh = Math.round(h * 0.17), ft = Math.round(h * 0.085), y0 = hh + 8, y1 = h - ft - 8, ch = y1 - y0, tw = w - inset, sc = Math.min(h, w) / 300;
    g.save(); g.fillStyle = CREAM; rrect(g, 6, 6, w - 12, h - 12, 26); g.fill(); g.clip(); g.fillStyle = HCOL[pg.k]; g.fillRect(0, 0, w, hh); g.restore();
    g.lineWidth = 8; g.strokeStyle = '#7a3ac8'; rrect(g, 6, 6, w - 12, h - 12, 26); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    { let hp = Math.round(hh * 0.52); g.font = `${hp}px ${FONT2}`; while (hp > 14 && g.measureText(HHEAD[pg.k]).width > tw) { hp -= 2; g.font = `${hp}px ${FONT2}`; } } g.lineWidth = 7; g.strokeStyle = INK; g.fillStyle = CREAM; g.strokeText(HHEAD[pg.k], w / 2, hh / 2 + 5); g.fillText(HHEAD[pg.k], w / 2, hh / 2 + 5);
    g.font = `600 ${Math.round(ft * 0.66)}px ${FONT}`; g.fillStyle = 'rgba(43,33,64,.55)'; g.fillText(foot, w / 2, h - ft / 2 - 10);
    const line = (txt, y, px0, pxMin, font, color, maxW) => { const f = wrapText(g, txt, maxW || tw, 1, Math.round(px0), Math.round(pxMin), font) || fitOne(g, txt, maxW || tw, Math.round(pxMin), font); g.font = `600 ${f.px}px ${font}`; g.fillStyle = color; g.fillText(f.lines[0], w / 2, y); return f.px; };
    if (pg.k === 'events') {
      const n = pg.rows.length, slot = ch / Math.max(n, 1);
      pg.rows.forEach((r, i) => { const cy = y0 + slot * (i + 0.5) - (pg.more && i === n - 1 ? 8 * sc : 0), tp = Math.min(slot * 0.4, 46 * sc);
        const px = line(r.title, cy - tp * 0.28, tp, 16 * sc, FONT, INK); line(r.sub, cy + px * 0.62, tp * 0.56, 12 * sc, FONT, '#6a5a86');
        if (i < n - 1) { g.strokeStyle = 'rgba(122,58,200,.2)'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, y0 + slot * (i + 1)); g.lineTo(w - 40, y0 + slot * (i + 1)); g.stroke(); } });
      if (pg.more) { g.font = `600 ${Math.round(15 * sc)}px ${FONT}`; g.fillStyle = '#7a3ac8'; g.fillText('+' + pg.more + ' more', w / 2, y1 - 1 * sc); }
    } else if (pg.k === 'busiest') {
      line('Room ' + pg.door, y0 + ch * 0.3, 70 * sc, 26 * sc, FONT2, INK);
      line(pg.inside + ' inside', y0 + ch * 0.62, 44 * sc, 18 * sc, FONT, '#e0408a');
      if (pg.name) line(pg.name, y0 + ch * 0.86, 26 * sc, 14 * sc, FONT, '#6a5a86');
    } else if (pg.k === 'winner') {
      g.fillStyle = '#e8a817'; g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); const cx = w / 2, cy = y0 + ch * 0.22, R = 24 * sc; for (let i = 0; i < 10; i++) { const r = i % 2 ? R * 0.45 : R, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.stroke(); g.fill();
      line("This week's winner", y0 + ch * 0.5, 28 * sc, 14 * sc, FONT, '#6a5a86'); line(pg.name, y0 + ch * 0.78, 50 * sc, 18 * sc, FONT, INK);
    } else {
      line('rooms for every', y0 + ch * 0.32, 44 * sc, 18 * sc, FONT, INK); line('new arrival', y0 + ch * 0.58, 44 * sc, 18 * sc, FONT, INK);
      if (pg.size) line(pg.size, y0 + ch * 0.85, 24 * sc, 12 * sc, FONT, '#7a3ac8');
    }
  }
  function liveMat(w, h, foot, inset = 76) {
    const m = canvasMat(w, h, (g, cw, ch) => { const cur = LIVE.pages[LIVE.page] || LIVE.pages[0]; paintLive(g, cw, ch, cur, foot, inset); if (LIVE.fade < 1 && LIVE.from) { g.save(); g.globalAlpha = 1 - LIVE.fade; paintLive(g, cw, ch, LIVE.from, foot, inset); g.restore(); } });
    dimMats.pop(); LIVE.boards.push(redraws[redraws.length - 1]); return m;                     // a screen: lit at night, not dimmed like the painted boards
  }
  const goHotel = () => { if (typeof HLIVE !== 'undefined') HLIVE.goHotel(); sfx('click'); };
  function liveBoard(p, x, z) {                                                                  // the plaza's street board: a post with a bigger lit screen
    const g = new THREE.Group(), trim = tmat(0x3f3850); g.position.set(x, 0, z); g.rotation.y = ROT;
    for (const s of [-1, 1]) g.add(CYL(0.035, 0.045, 1.5, trim, s * 0.55, 0.75, -0.02, 6));
    g.add(BOX(1.74, 1.1, 0.07, tmat(0x3f3850), 0, 1.5, 0)); const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.64, 1.0), liveMat(512, 312, 'Chog Avenue')); pl.position.set(0, 1.5, 0.041); g.add(pl);
    g.traverse(o => { if (o.isMesh) { o.userData.noOutline = true; o.castShadow = o.geometry.type !== 'PlaneGeometry'; } });
    addBlock(x, z, 0.65, 0.3); reg(g, goHotel, 1.1); PROPS.placed.push({ id: p.id, x, z, kind: 'live' }); taken.push({ x, z, r: 0.8 }); PROPS.count++;
  }
  (function () {                                                                                 // the advertising column by NOVA: a curved screen on a dark pillar with a teal cap
    const q = fit(11.4, -22.5, 0.75, 1.0, false, 0.7); if (!q) { console.warn('ad column has no room'); return; }
    const g = new THREE.Group(), trim = tmat(0x3f3850), R = 0.62, arc = 2.6; g.position.set(q[0], 0, q[1]); g.rotation.y = ROT;
    g.add(CYL(0.78, 0.82, 0.22, tmat(0xcfc4b4), 0, 0.11, 0, 24)); g.add(CYL(R - 0.02, R - 0.02, 3.0, trim, 0, 1.7, 0, 24));
    const scr = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 2.1, 36, 1, true, -arc / 2, arc), liveMat(480, 540, 'Click to walk to the Hotel', 170)); scr.position.y = 1.7; g.add(scr);
    g.add(CYL(0.74, 0.74, 0.2, tmat(0x4a8a78), 0, 3.3, 0, 24)); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), tmat(0x4a8a78)); dome.position.y = 3.4; g.add(dome);
    const gl = glowSprite(0xffe9c0, 3.4, 0.5); gl.position.set(0, 1.7, 0.9); noNormalPass.push(gl); DAY.glow(gl, 0.4); g.add(gl);
    g.traverse(o => { if (o.isMesh) { o.userData.noOutline = true; o.castShadow = o !== scr; } });
    addBlock(q[0], q[1], 0.8, 0.8); reg(g, goHotel, 1.2); PROPS.placed.push({ id: 'adcolumn', x: q[0], z: q[1], kind: 'live' }); taken.push({ x: q[0], z: q[1], r: 0.9 }); PROPS.count++;
  })();
  ticks.push(dt => {
    const H = typeof HLIVE !== 'undefined' ? HLIVE : null;
    if (H && H.rev !== LIVE.rev) {                                                              // new data: keep the page you are on when it still exists (the server repeats the message)
      LIVE.rev = H.rev; const cur = LIVE.pages[LIVE.page] || LIVE.pages[0], np = H.pages(), same = np.findIndex(x => x.k === cur.k);
      LIVE.pages = np; if (same >= 0) LIVE.page = same; else { LIVE.from = cur; LIVE.page = 0; LIVE.fade = 0; } LIVE.boards.forEach(f => f());
    }
    LIVE.t += dt; if (LIVE.t > 6 && LIVE.pages.length > 1) { LIVE.t = 0; LIVE.from = LIVE.pages[LIVE.page]; LIVE.page = (LIVE.page + 1) % LIVE.pages.length; LIVE.fade = 0; }
    if (LIVE.fade < 1) { LIVE.fade = Math.min(1, LIVE.fade + dt * 2.2); LIVE.boards.forEach(f => f()); }
  });
  PROPS.live = LIVE; for (const a of PROPS.liveQ || []) liveBoard(...a);

  // ---------- the Inspect stand by the Hotel door: a brass plaque and a little viewer pointed at the tower; the prompt and the camera are in hotel_live.js
  (function () {
    const q = fit(-8.6, -22.5, 0.5, 0.8, false, 0.25); if (!q) { console.warn('inspect stand has no room'); return; }
    const g = new THREE.Group(), trim = tmat(0x3f3850), brass = tmat(0xd8aa4a, { em: 0.25 }); g.position.set(q[0], 0, q[1]); g.rotation.y = ROT;
    g.add(CYL(0.14, 0.18, 0.06, trim, 0, 0.03, 0, 10)); g.add(CYL(0.04, 0.05, 1.0, trim, 0, 0.52, 0, 6));
    g.add(BOX(0.74, 0.28, 0.05, tmat(0x3f3850), 0, 0.82, 0.02)); const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.22), boardMat(0.68, 0.22, 'INSPECT', { bg: '#ecc977', fg: '#3a2a14', border: '#8a6a2a', px: 96 })); pl.position.set(0, 0.82, 0.05); g.add(pl);
    const yoke = BOX(0.1, 0.16, 0.1, trim, 0, 1.08, 0); g.add(yoke); const tube = CYL(0.06, 0.085, 0.62, brass, 0, 0, 0, 12); const tp = new THREE.Group(); tp.position.set(0, 1.2, 0); tp.rotation.set(-0.95, 0, 0); tube.position.y = 0.2; tp.add(tube); tp.add(CYL(0.09, 0.09, 0.05, trim, 0, 0.53, 0, 12).translateY(-0.2)); g.add(tp);
    g.traverse(o => { if (o.isMesh) { o.userData.noOutline = true; o.castShadow = true; } });
    addBlock(q[0], q[1], 0.28, 0.28); reg(g, () => { if (typeof HLIVE !== 'undefined') HLIVE.inspect(); }, 0.9); PROPS.placed.push({ id: 'inspect', x: q[0], z: q[1], kind: 'stand' }); taken.push({ x: q[0], z: q[1], r: 0.6 }); PROPS.count++;
    PROPS.inspectSpot = { x: q[0], z: q[1], y: 1.5 };
  })();

  // ---------- per frame, dimming at night, and tell the residents the blockers changed
  let dimK = -1;
  animated.push((tm, dt) => {
    if (!NPC.group.visible) { if (PROPS.card) PROPS.closeCard(); if (wb.open) PROPS.closeBoard(); }
    for (const f of ticks) f(Math.min(dt || 0.016, 0.1));
    const k = 1 - 0.42 * (DAY.lamp || 0); if (Math.abs(k - dimK) > 0.01) { dimK = k; for (const m of dimMats) m.color.setScalar(k); }
  });
  const sealed = reachable().filter(t => !BASE.includes(String(t))); if (sealed.length) console.warn('props seal off', sealed.map(t => t.map(v => v.toFixed(1)).join(',')).join(' '));
  if (typeof GAME !== 'undefined' && GAME.regrid) GAME.regrid();
  NPC.invalidate();
})();
