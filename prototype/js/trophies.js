// ===== trophies: the "Trophy shelf" piece of the Home catalog (space_data.js) shows up to 6 of your trophies as small 3D cups and medals =====
// The trophies come from the client's own lists: the mini-games (GAMES.trophies(), one cup per game per day) and the Exhibition (EXH.trophies(), a medal per won week).
// They are not part of the room document, so the server and the saved Home do not know about them: the shelf is filled when you stand in your own Home (a visitor sees the empty shelf).
// Hover a trophy to read its label. Wraps SPACE.makePiece (space.js). Needs GAMES and EXH only at run time. Loaded after games.js.
const TROPHIES = { shelves: [], tip: null, sig: '' };
(function () {
  const MAX = 6, SLOTS = [[-0.5, 1.98], [0, 1.98], [0.5, 1.98], [-0.5, 1.48], [0, 1.48], [0.5, 1.48]];
  const GOLD = 0xffd84a, COLS = { stack: 0xffd84a, rhythm: 0xff7ac8, daily: 0x7ad8a8, rps: 0xc8d0e0, dance: 0xff9a4a, connect4: 0x6aa8ff, duel: 0xb08aff };
  const mine = () => typeof ROOM !== 'undefined' && ROOM.active && ROOM.mine && ROOM.kind !== 'venue';
  function list() {
    const out = [];
    try { for (const t of (typeof EXH !== 'undefined' ? EXH.trophies() : []).slice().reverse()) out.push({ kind: 'medal', col: GOLD, label: 'Exhibition winner: ' + (t.name || 'my Home') + ' · ' + (t.theme || t.week) }); } catch (e) { /* optional */ }
    try { for (const t of (typeof GAMES !== 'undefined' ? GAMES.trophies() : [])) { const m = (GAMES.META || []).find(x => x.id === t.game); out.push({ kind: 'cup', col: COLS[t.game] || GOLD, label: (m ? m.name : t.game) + ' · ' + t.day }); } } catch (e) { /* optional */ }
    return out.slice(0, MAX);
  }
  function cupMesh(col) {
    const g = new THREE.Group(), m = tmat(col, { em: 0.25 }), dark = tmat(0x3f3850);
    g.add(BOX(0.12, 0.025, 0.12, dark, 0, 0.0125, 0)); g.add(CYL(0.012, 0.012, 0.08, m, 0, 0.065, 0, 6)); g.add(CYL(0.065, 0.032, 0.11, m, 0, 0.165, 0, 10));
    for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 5, 10), m); h.position.set(s * 0.075, 0.17, 0); g.add(h); }
    return g;
  }
  function medalMesh(col) {
    const g = new THREE.Group(), m = tmat(col, { em: 0.25 }), dark = tmat(0x3f3850), rib = tmat(0xe84a6a);
    g.add(BOX(0.12, 0.025, 0.1, dark, 0, 0.0125, 0)); g.add(BOX(0.012, 0.1, 0.012, dark, 0, 0.075, -0.02));
    const d = CYL(0.07, 0.07, 0.018, m, 0, 0.19, 0, 16); d.rotation.x = Math.PI / 2; g.add(d); const r = CYL(0.045, 0.045, 0.02, tmat(0xfff2a8, { em: 0.4 }), 0, 0.19, 0.002, 12); r.rotation.x = Math.PI / 2; g.add(r);
    g.add(BOX(0.04, 0.09, 0.008, rib, 0, 0.275, -0.004)); return g;
  }
  function clearShelf(e) { if (e.trophyGroup) { e.g.remove(e.trophyGroup); e.trophyGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); }); e.trophyGroup = null; } }
  function fill(e) {
    clearShelf(e); if (!mine()) return; const grp = new THREE.Group(); e.trophyGroup = grp; e.g.add(grp);
    list().forEach((t, i) => { const m = t.kind === 'medal' ? medalMesh(t.col) : cupMesh(t.col), s = SLOTS[i]; m.position.set(s[0], s[1] + 0.025, 0.15); m.userData.tip = t.label; grp.add(m); });
  }
  const sigNow = () => (mine() ? 'm' : 'x') + list().map(t => t.label).join('|');
  const origMake = SPACE.makePiece;
  SPACE.makePiece = function (it, o) {
    const e = origMake.apply(this, arguments);
    if (e && it && it.p === 'trophyShelf' && !(o && o.ghost)) { TROPHIES.shelves.push(e); fill(e); }
    return e;
  };
  // the lists arrive later (the server answers after the room opened): refill when they change
  setInterval(() => {
    TROPHIES.shelves = TROPHIES.shelves.filter(e => e.g.parent); if (!TROPHIES.shelves.length) { TROPHIES.sig = ''; return; }
    const s = sigNow(); if (s !== TROPHIES.sig) { TROPHIES.sig = s; for (const e of TROPHIES.shelves) fill(e); }
  }, 1500);

  // ---- hover label
  const dom = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const tip = document.createElement('div'); tip.style.cssText = 'position:fixed;z-index:30;pointer-events:none;display:none;padding:5px 10px;border-radius:10px;background:#2b1d44;color:#fff6e0;font:600 13px Fredoka,Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)'; document.body.appendChild(tip);
  dom.addEventListener('pointermove', e => {
    if (!TROPHIES.shelves.length || (typeof GAME !== 'undefined' && GAME.dragUI)) { tip.style.display = 'none'; return; }
    const groups = TROPHIES.shelves.filter(s => s.trophyGroup && s.g.parent).map(s => s.trophyGroup); if (!groups.length) { tip.style.display = 'none'; return; }
    const r = dom.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(groups, true)[0]; let o = hit && hit.object; while (o && !o.userData.tip) o = o.parent;
    if (o) { tip.textContent = o.userData.tip; tip.style.display = 'block'; tip.style.left = Math.min(innerWidth - 260, e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 16) + 'px'; } else tip.style.display = 'none';
  });
  dom.addEventListener('pointerleave', () => { tip.style.display = 'none'; });
})();
