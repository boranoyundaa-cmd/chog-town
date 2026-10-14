// ===== culture: the real-clock events of the town (CULTURE.events), their banner, a few cheap effects and the loading tip =====
// Events run on the same clock as the day cycle and the residents (NPC.now(): real clock, or ?hour= / Settings). The date is the player's own (?date=2026-10-10 pins it for tests).
// Daily chances are rolled from the date, so every player sees the same day. Testing: ?event=whale_alert,gm_hour or CULTURE_RT.force('whale_alert').
// Others read CULTURE_RT.active() / .isActive(id). Loaded after npc.js. No server, no state.
const CULTURE_RT = { list: [], ids: new Set(), forced: new Set(), banners: [], dateOverride: null };
(function () {
  const QSX = new URLSearchParams(location.search);
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0); };
  const pad = n => String(n).padStart(2, '0');
  if (QSX.has('date')) { const p = QSX.get('date').split('-').map(Number); if (p.length === 3 && p.every(Number.isFinite)) CULTURE_RT.dateOverride = new Date(p[0], p[1] - 1, p[2], 12, 0, 0); }
  if (QSX.has('event')) QSX.get('event').split(',').forEach(id => CULTURE_RT.forced.add(id.trim()));
  CULTURE_RT.date = () => CULTURE_RT.dateOverride || new Date();
  CULTURE_RT.hour = () => (typeof NPC !== 'undefined' ? NPC.now() % 86400 : new Date().getHours() * 3600) / 3600;
  CULTURE_RT.active = () => CULTURE_RT.list;
  CULTURE_RT.isActive = id => CULTURE_RT.ids.has(id);
  CULTURE_RT.force = (id, on = true) => { if (on) CULTURE_RT.forced.add(id); else CULTURE_RT.forced.delete(id); CULTURE_RT.tick(true); };
  const dayRoll = (key, d) => hash(key + d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()) / 4294967296;
  const WHALE_S = 60;

  // is this event on right now? -> null, or { ev, from, to } (the window in hours, narrowed for the whale)
  function check(ev, d, h) {
    const w = ev.when || {}, forced = CULTURE_RT.forced.has(ev.id);
    let from = w.hourFrom, to = w.hourTo;
    if (forced) { if (ev.id === 'whale_alert') { if (!CULTURE_RT.forcedAt) CULTURE_RT.forcedAt = h; from = CULTURE_RT.forcedAt; to = from + WHALE_S / 3600; if (h >= to) { CULTURE_RT.forced.delete(ev.id); CULTURE_RT.forcedAt = null; return null; } } return { ev, from: from === undefined ? 0 : from, to: to === undefined ? 24 : to }; }
    if (w.year && d.getFullYear() !== w.year) return null;
    if (w.month && d.getMonth() + 1 !== w.month) return null;
    if (w.day && d.getDate() !== w.day) return null;
    if (w.weekday !== undefined && d.getDay() !== w.weekday) return null;
    if (w.lastDayOfMonth && d.getDate() !== new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()) return null;
    if (w.chance !== undefined) {
      if (dayRoll(ev.id, d) >= w.chance) return null;
      if (ev.id === 'whale_alert') { from = w.hourFrom + dayRoll(ev.id + 't', d) * (w.hourTo - w.hourFrom - WHALE_S / 3600); to = from + WHALE_S / 3600; }
    }
    if (from !== undefined && (h < from || h >= to)) return null;
    return { ev, from: from === undefined ? 0 : from, to: to === undefined ? 24 : to };
  }

  // ---------- the HUD banner: a small pill under the top edge, one per active event, gone after 15 s (the event itself goes on)
  const css = document.createElement('style');
  css.textContent = `
    #cbanner { position: fixed; left: 50%; top: 10px; transform: translateX(-50%); display: flex; flex-direction: column; gap: 6px; align-items: center; z-index: 12; pointer-events: none; font: 700 13px/1.25 "Nunito", system-ui, sans-serif; }
    #cbanner .cb { max-width: min(520px, 80vw); padding: 6px 16px; border-radius: 999px; background: #fffaf3; color: #2b2140; border: 1.5px solid rgba(58,36,96,.2); box-shadow: 0 6px 18px rgba(40,20,70,.22); text-align: center; opacity: 0; transform: translateY(-8px); transition: opacity .4s, transform .4s; }
    #cbanner .cb.on { opacity: 1; transform: none; } #cbanner .cb b { color: #7a3ac8; font-family: "Fredoka", sans-serif; font-weight: 600; margin-right: 6px; }
    #ctip { position: fixed; right: 16px; top: 280px; max-width: 320px; padding: 8px 16px; border-radius: 14px; background: #fffaf3; color: #2b2140; border: 1.5px solid rgba(58,36,96,.2); box-shadow: 0 6px 18px rgba(40,20,70,.22); font: 600 13px/1.3 "Fredoka", "Nunito", sans-serif; z-index: 12; pointer-events: none; opacity: 0; transition: opacity .6s; }
    #ctip.on { opacity: 1; } #ctip i { font-style: normal; color: #7a3ac8; margin-right: 6px; }
    #ui .pcard .acts { flex-wrap: wrap; } #ui .pcard small.src { display: block; opacity: .7; font-size: 11px; margin: -6px 0 8px; }`;
  document.head.appendChild(css);
  const bar = document.createElement('div'); bar.id = 'cbanner'; document.body.appendChild(bar);
  const shownBanners = {}, BANNER_OK = new Set(['uptober', 'whale_alert']);                  // only real, rare events get a banner
  const dayKey = () => new Date().toDateString();
  const seenToday = id => { if (id === 'whale_alert') return false; try { return localStorage.getItem('chog_seen_' + id) === dayKey(); } catch (e) { return false; } };
  const markSeen = id => { try { localStorage.setItem('chog_seen_' + id, dayKey()); } catch (e) { /* ignore */ } };
  function syncBanners() {
    const town = typeof NPC === 'undefined' || NPC.group.visible;
    for (const a of CULTURE_RT.list) if (a.ev.banner && BANNER_OK.has(a.ev.id) && !shownBanners[a.ev.id] && !seenToday(a.ev.id)) {
      shownBanners[a.ev.id] = performance.now(); markSeen(a.ev.id); const e = document.createElement('div'); e.className = 'cb'; e.style.pointerEvents = 'auto'; e.style.cursor = 'pointer'; e.title = 'Dismiss'; e.onclick = () => { e.classList.remove('on'); setTimeout(() => e.remove(), 450); }; e.dataset.id = a.ev.id; const b = document.createElement('b'); b.textContent = a.ev.id === 'whale_alert' ? '!' : '•'; e.append(b, a.ev.banner); bar.appendChild(e); requestAnimationFrame(() => requestAnimationFrame(() => e.classList.add('on')));
    }
    for (const e of Array.from(bar.children)) {
      const id = e.dataset.id, live = CULTURE_RT.ids.has(id), old = performance.now() - shownBanners[id] > 15000;
      if (!live || old || !town) { e.classList.remove('on'); setTimeout(() => e.remove(), 450); if (!live) delete shownBanners[id]; }
    }
    bar.style.display = town ? 'flex' : 'none';
  }

  // ---------- effects
  const PINS = { oct10: { liquidated: 'pz4' }, pizza_day: { pizza: 'pizzaStand' }, hodl_day: { hodler: 'hf3' }, monad_anniv: { nad: 'hf2' }, friday_liq: { degen: 'c5' } };
  let lastSiren = -1, bunting = null, whale = null, whaleSpan = null;
  function makeBunting() {
    const g = new THREE.Group(), cols = [0xf08a30, 0x3ac85a], pole = tmat(0x3f3850);
    const hang = (a, b) => { for (let i = 1; i < 8; i++) { const u = i / 8, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u, y = 3.55 - Math.sin(u * Math.PI) * 0.3;
      const f = new THREE.Mesh(new THREE.CircleGeometry(0.14, 3), tmat(cols[i % 2], { em: 0.4 })); f.material.side = THREE.DoubleSide; f.position.set(x, y - 0.1, z); f.rotation.set(0, Math.atan2(b[0] - a[0], b[1] - a[1]) - Math.PI / 2, -Math.PI / 2); f.castShadow = false; g.add(f); }
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, Math.hypot(b[0] - a[0], b[1] - a[1]), 4), pole); wire.position.set((a[0] + b[0]) / 2, 3.42, (a[1] + b[1]) / 2); wire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(b[0] - a[0], 0, b[1] - a[1]).normalize()); g.add(wire); };
    const L = 6, X = CITY.plaza.x, Z = CITY.plaza.z, P = [[X - L, Z - L], [X + L, Z - L], [X + L, Z + L], [X - L, Z + L]];   // between the four lit plaza lamps for (let i = 0; i < 4; i++) hang(P[i], P[(i + 1) % 4]);
    g.traverse(o => { o.userData.noOutline = true; }); world.add(g); CITY_NODES.push(g); return g;
  }
  function makeWhale() {
    const c = chogFromTraits({ Background: 'Light Purple', Base: 'Origin', Form: 'Chog', Skin: 'Blue', Eyes: 'Happy', Mouth: 'Gold Tooth', Side: 'Right', Naked: 'No', Body: 'Blue Sleeveless', Head: 'Crown', Tier: 'Rare' }, { scale: CHOG_SCALE * 2.5 });
    c.userData.netName = 'A Whale'; c.userData.onClick = () => { if (typeof toast === 'function') toast('A whale. Probably nothing.'); }; c.visible = false; world.add(c); CITY_NODES.push(c);
    c.userData.plate = PLATES.add(c, 'Whale'); walkers.push({ c }); return c;
  }
  function whaleStep(tm, h) {
    const a = CULTURE_RT.list.find(x => x.ev.id === 'whale_alert'), town = NPC.group.visible;
    if (!a || !town) { if (whale) whale.visible = false; return; }
    if (!whale) whale = makeWhale();
    const s = Math.max(0, Math.min(WHALE_S, (h - a.from) * 3600)), u = s / WHALE_S, x = -17 + u * 22, z = 2.6, fade = Math.min(1, s / 3, (WHALE_S - s) / 3), u2 = whale.userData;
    whale.visible = fade > 0.02; whale.position.set(x, 0, z); whale.rotation.y = Math.PI / 2; whale.scale.setScalar(CHOG_SCALE * 2.5 * (0.3 + 0.7 * fade));
    const sw = Math.sin(tm * 2.6); u2.legs[0].rotation.x = sw * 0.5; u2.legs[1].rotation.x = -sw * 0.5; u2.arms[0].rotation.x = -sw * 0.4; u2.arms[1].rotation.x = sw * 0.4; u2.body.position.y = Math.abs(sw) * 0.05;
  }

  let acc = 9;
  CULTURE_RT.tick = force => {
    const d = CULTURE_RT.date(), h = CULTURE_RT.hour(), prev = CULTURE_RT.ids, list = [];
    for (const ev of CULTURE.events) { const a = check(ev, d, h); if (a) list.push(a); }
    CULTURE_RT.list = list; CULTURE_RT.ids = new Set(list.map(a => a.ev.id));
    const changed = list.length !== prev.size || list.some(a => !prev.has(a.ev.id));
    if (changed || force) {
      const pins = {}; for (const a of list) Object.assign(pins, PINS[a.ev.id] || {}); NPC.pins = pins; NPC.dirty = true;
      if (CULTURE_RT.ids.has('uptober') && !bunting) bunting = makeBunting(); if (bunting) bunting.visible = CULTURE_RT.ids.has('uptober');
      syncBanners();
    }
    if (CULTURE_RT.ids.has('friday_liq') && window.AUDIO && NPC.group.visible) { const slot = Math.floor(h * 12); if (slot !== lastSiren && h * 12 - slot < 0.2) { lastSiren = slot; AUDIO.sfx('siren'); } }
  };
  animated.push((tm, dt) => {
    acc += dt; const h = CULTURE_RT.hour();
    if (acc > 1) { acc = 0; CULTURE_RT.tick(); syncBanners(); }
    whaleStep(tm, h);
  });

  // ---------- the loading tip: one random line from CULTURE.ui.tips in a corner of the screen for a few seconds after the page is ready
  const tip = document.createElement('div'); tip.id = 'ctip'; document.body.appendChild(tip);
  CULTURE_RT.tip = () => { const t = CULTURE.pick(CULTURE.ui.tips, CULTURE_RT.tipHolder || (CULTURE_RT.tipHolder = {})); tip.innerHTML = '<i>Tip</i>'; tip.append(t); tip.classList.add('on'); clearTimeout(CULTURE_RT.tipT); CULTURE_RT.tipT = setTimeout(() => tip.classList.remove('on'), 7000); return t; };
  try { if (localStorage.getItem('chog_tip_day') !== new Date().toDateString()) { localStorage.setItem('chog_tip_day', new Date().toDateString()); setTimeout(() => CULTURE_RT.tip(), 1500); } } catch (e) { /* ignore */ }      // a tip once a day at most
  CULTURE_RT.tick(true);
})();
