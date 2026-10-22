// ===== trailer3: scenes for the trailer, captured by tools/trailer_capture.js through Edge's DevTools protocol with virtual time =====
// The page runs its own loop; the browser clock moves one frame (1/30 s) per capture, so the game, its interface, CSS and timers all move frame by frame.
// TRV.scene(name) sets a scene up (real time, before the clock is paused); from then on GAME.cine calls the scene's camera every frame with t = seconds into the shot.
(function () {
  const TRV = window.TRV = {};
  const E = u => u * u * (3 - 2 * u), L = (a, b, u) => a + (b - a) * u, W = ms => new Promise(r => setTimeout(r, ms));
  const C = (a, b, u) => Math.max(a, Math.min(b, u));
  const R = id => NPC.list.find(r => r.id === id);
  // the camera: target on the ground, visible width, yaw around the iso direction, target height
  const cam3 = (x, z, fw, yaw = 0, ty = 1.1) => { const a = Math.PI / 4 + yaw; CAM_DIR.set(Math.sin(a) * Math.SQRT2, 1, Math.cos(a) * Math.SQRT2).normalize(); camTarget.set(x, ty, z); FW = fw; GAME.zoomT = fw; updateCam(); };
  // what of the interface shows: nothing, or only the listed elements (and the nameplates when asked)
  let st = null;
  TRV.ui = (keep = [], plates = false) => {
    if (!st) { st = document.createElement('style'); document.head.appendChild(st); }
    const show = keep.map(s => `${s}, ${s} *`).join(', ');
    st.textContent = `body > *:not(canvas)${plates ? ':not(#plates)' : ''} { visibility: hidden !important; } ${show ? show + ' { visibility: visible !important; }' : ''} #plates .plate.me { visibility: hidden !important; }`;
  };
  const pin = (map, face = true, yaw = 0.15) => { NPC.pins = map; if (face) for (const k in map) if (NPC.PL[map[k]]) NPC.PL[map[k]].ry = Math.PI / 4 + yaw; NPC.dirty = true; };
  const crowd = [];
  const addChog = (traits, x, z, ry, mode = 'idle') => { const c = chogFromTraits(traits, { scale: CHOG_SCALE }); c.position.set(x, 0, z); c.rotation.y = ry; scene.add(c); crowd.push({ c, mode, ry, ph: crowd.length * 1.7 }); return c; };
  const animCrowd = t => { for (const k of crowd) { const u = k.c.userData, ph = t * (k.mode === 'dance' ? 7.5 : 2) + k.ph, sw = Math.sin(ph);
    if (k.mode === 'dance') { u.body.position.y = Math.abs(sw) * 0.08; u.head.position.y = 1.0 + Math.abs(sw) * 0.1; u.arms[0].rotation.z = -2.4 - sw * 0.5; u.arms[1].rotation.z = 2.4 + sw * 0.5; u.legs[0].rotation.x = sw * 0.3; u.legs[1].rotation.x = -sw * 0.3; k.c.rotation.y = k.ry + Math.sin(t * 1.3 + k.ph) * 0.5; }
    else { const b = Math.sin(ph) * 0.015; u.body.position.y = b; u.head.position.y = 1.0 + b * 1.4; } } };
  const pick = (n, seed) => { const out = []; let s = seed; while (out.length < n) { s = (s * 16807) % 2147483647; const id = 1 + (s % 1969); if (!out.includes(id)) out.push(id); } return out; };
  let hour0 = 18, npc0 = 0, frameFn = null, tStart = null, extra = null;
  // the scene's camera runs inside the game's own loop (game.js asks GAME.cine first)
  const install = (fn, o = {}) => {
    frameFn = fn; tStart = null; hour0 = o.hour ?? DAY.fixedHour; npc0 = (o.npcTime ?? hour0) * 3600; extra = o.each || null;
    DAY.setMode('fixed', hour0); NPC.override = npc0 % 86400;
    GAME.cine = (tt, dt) => { const now = performance.now() / 1000; if (tStart === null) tStart = now; const t = Math.max(0, now - tStart);
      if (o.hour1 !== undefined) DAY.fixedHour = L(o.hour0 ?? hour0, o.hour1, C(0, 1, t / o.span)) % 24;
      NPC.override = (npc0 + t * (o.timeScale || 1)) % 86400; animCrowd(t); if (extra) extra(t); frameFn(t); return true; };
  };
  const meHide = () => { if (GAME.me) GAME.me.visible = false; if (GAME.ring) GAME.ring.visible = false; };
  const stopEvents = () => { CULTURE_RT.tick(true); CULTURE_RT.tick = () => {}; };
  const toHotel = async () => { GAME.cine = null; if (!HOTEL.active) await HOTEL.enterFromTown(); await W(1200); };
  const toVenue = async id => { await toHotel(); const v = HOTEL.info.venues.find(v => v.id === id); await HOTEL.goTo(v); await W(900); await HOTEL.enterVenue(v); await W(2200); };

  const S = TRV.S = {};
  // 01 the town from above at dusk, the camera sinks towards the plaza
  S.open = async () => { TRV.ui(); meHide(); NPC.target = 40; stopEvents();
    install(t => { const u = E(C(0, 1, t / 6.0)); cam3(L(-2, -5.6, u), L(-14, -7, u), L(60, 26, u), L(-0.5, -0.12, u), L(9, 1.1, u)); }, { hour: 18.4 }); };
  // 02 Hotel Street, sliding sideways past the residents
  S.street = async () => { TRV.ui(); meHide(); NPC.target = 40; stopEvents();
    install(t => { const u = t / 3.3; cam3(L(-22, -2, u), -19.5, 15, -0.05); }, { hour: 17.6 }); };
  // 03 rising up the hotel front, from the door to the crown
  S.rise = async () => { TRV.ui(); meHide(); NPC.target = 40; stopEvents();
    install(t => { const u = E(C(0, 1, t / 5.3)); cam3(-6, L(-22.5, -26, u), L(12, 30, u), L(-0.25, 0.1, u), L(1.4, 16, u)); }, { hour: 19 }); };
  // 04 the lobby: Lev's dialog, the real one (his greeting typed out by the game)
  S.lev = async () => { await toHotel(); meHide(); TRV.ui(['#levbox']); stopEvents();
    const me = GAME.me; me.position.set(0.4, 0, -3.4); me.rotation.y = Math.PI; GAME.path = [];
    LEV.st.met = false; LEV.talk();
    install(t => { const u = E(C(0, 1, t / 5.3)); cam3(L(1.6, 0.6, u), L(-2.4, -3.6, u), L(13, 10.5, u), L(0.15, 0.02, u)); }, { hour: 19 }); };
  // 05 a room filling up on the beat, the decorate panel open
  S.room = async (o = {}) => { GAME.cine = null; await ROOM.enterSolo(); await W(800); ROOM.setEdit(true); await W(300); meHide(); TRV.ui(['#ui .rp']); stopEvents();
    const [w, d] = ROOM.bounds ? [ROOM.bounds.x1 - ROOM.bounds.x0 + 0.6, ROOM.bounds.z1 - ROOM.bounds.z0 + 0.6] : [14, 10];
    const R0 = SPACE.READY.studio.make(Math.round(w), Math.round(d), {}); const all = R0.pieces.slice(); ROOM.doc.pieces = []; SPACE.unload && 0;
    const beat = 60 / 92.3; let placed = 0; const step = Math.max(1, Math.ceil(all.length / 8));
    install(t => { const want = Math.min(all.length, Math.floor(t / beat + 1) * step); while (placed < want) { const it = all[placed++]; ROOM.doc.pieces.push(it); const e = SPACE.makePiece(it); if (e) SPACE.addEntry(e); }
      const u = E(C(0, 1, t / 6.6)); cam3(L(1.6, 2.2, u), L(-1.2, -1.6, u), L(17, 14, u), L(-0.2, 0.08, u)); }, { hour: 15 }); };          // the panel takes the right side: the room sits left of centre
  // 05a "Decorate it.": a room in another theme filling up fast, the decorate panel open (o.layout: a SPACE.READY id, o.fill: seconds to place everything)
  const roomSize = () => ROOM.bounds ? [Math.round(ROOM.bounds.x1 - ROOM.bounds.x0 + 0.6), Math.round(ROOM.bounds.z1 - ROOM.bounds.z0 + 0.6)] : [14, 10];
  const lookOf = R0 => { const d = ROOM.doc; for (const k of ['theme', 'view', 'wall', 'floor', 'windows']) if (R0[k] !== undefined) d[k] = R0[k]; };
  S.decor = async (o = {}) => { GAME.cine = null; await ROOM.enterSolo(); await W(800); ROOM.setEdit(true); await W(300); meHide(); stopEvents();
    const [w, d] = roomSize(), R0 = SPACE.READY[o.layout || 'cafe'].make(w, d, {}), all = R0.pieces.slice();
    lookOf(R0); ROOM.doc.pieces = []; SPACE.build(ROOM.doc); SPACE.refreshHidden(); if (ROOM.refreshUI) ROOM.refreshUI(); await W(600); TRV.ui(['#ui .rp']);
    let placed = 0; const fill = o.fill || 1.1;
    install(t => { const want = TRV.zeroed ? Math.min(all.length, Math.ceil(all.length * C(0, 1, (t + 0.05) / fill))) : 0; while (placed < want) { const it = all[placed++]; ROOM.doc.pieces.push(it); const e = SPACE.makePiece(it); if (e) SPACE.addEntry(e); }
      const u = t / 1.6; cam3(L(1.8, 2.3, u), L(-1.2, -1.5, u), L(16.5, 14.5, u), L(-0.25, -0.1, u)); }, { hour: 15 }); };
  // 05b "Lock it.": a door in the hotel hall, its plate turns to LOCKED on the word (o.no: the room number, o.at: seconds in)
  S.lockdoor = async (o = {}) => { await toHotel(); let v = HOTEL.info.venues.find(v => v.no === (o.no || 405)) || HOTEL.info.venues.find(v => v.floor > 0);
    await HOTEL.goTo(v); await W(1500); stopEvents(); TRV.ui();
    HOTEL.onInfo = () => {}; const setCounts = HOTEL.setCounts; HOTEL.setCounts = () => {};             // the server's own updates would put the door back as it really is
    const hv = HOTEL.info.venues.find(x => x.id === v.id) || v; hv.locked = false; HOTEL.counts = Object.assign({}, HOTEL.counts, { [hv.id]: 3 }); HOTEL.rebuildHere(); await W(500);
    const p = GAME.me.position.clone(); meHide(); let done = false; v = hv;
    install(t => { if (!done && TRV.zeroed && t >= (o.at || 0.35)) { done = true; v.locked = true; setCounts(Object.assign({}, HOTEL.counts, { [v.id]: 2 })); }
      cam3(p.x + (o.dx || 0), p.z + (o.dz || 0), L(7.6, 6.6, t / 1.4), (o.yaw ?? 0.1) + t * 0.04, 2.9); }, { hour: 20 }); };
  // 05c "Throw a party in it.": a finished room in another theme, full of dancing Chogs, at night
  S.party = async (o = {}) => { GAME.cine = null; await ROOM.enterSolo(); await W(800); meHide(); stopEvents(); TRV.ui();
    const [w, d] = roomSize(), R0 = SPACE.READY[o.layout || 'garage'].make(w, d, {}); lookOf(R0); ROOM.doc.pieces = R0.pieces.slice(); SPACE.build(ROOM.doc); SPACE.refreshHidden(); await W(600);
    const ids = [1700, 561, 212, 1337, 77, 999, 1514, 420, 1234, 808, 1881, 69, 1969, 333]; let k = 0;
    for (const [x, z] of o.spots || [[-2.2, -0.6], [-1.0, -0.3], [0.2, -0.6], [-1.6, 0.6], [-0.4, 0.8], [0.8, 0.5], [-2.6, 1.6], [-1.2, 1.9], [0.1, 1.8], [-3.4, 0.4], [1.4, -0.4], [-0.6, -1.5]]) addChog(traitsFor(ids[k++ % ids.length]), x, z, Math.PI / 4 + (k % 3 - 1) * 0.4, 'dance');
    install(t => { const u = t / 3.3; cam3(L(0.4, -0.2, u), L(1.4, 1.8, u), L(13, 11, u), L(-0.35, 0.05, u), 1.0); }, { hour: 22.5 }); };
  // 06 meet the locals: a cut on every second beat, residents with their nameplates
  S.locals = async () => { TRV.ui([], true); meHide(); NPC.target = 60; stopEvents();
    const who = [['wizard', 'pz2'], ['larry', 'larryPost'], ['mrfour', 'hf4'], ['banana', 'c5'], ['hodler', 'parkA'], ['nocoiner', 'tourist'], ['maxi', 'maxiSpot']];
    pin(Object.fromEntries(who)); const beat = 60 / 92.3;
    install(t => { const i = Math.min(who.length - 1, Math.floor(t / beat)), c = R(who[i][0]).c, k = (t - i * beat) / beat; const p = c ? c.position : NPC.PL[who[i][1]]; cam3(p.x + L(-0.2, 0.2, k), p.z, 5.4, 0.1 + i * 0.05, 1.0); }, { hour: 12 }); };   // the camera sits on the resident itself (spots are nudged off blockers)
  // 07 doing great: the Influencer filming himself
  S.great = async (o = {}) => { const yaw = o.yaw ?? 0.15; TRV.ui([], true); meHide(); NPC.target = 60; stopEvents(); pin({ kol: 'kolSpot' }, true, yaw);
    install(t => { const p = R('kol').c ? R('kol').c.position : NPC.PL.kolSpot, u = t / 2; cam3(p.x, p.z, L(7.5, 6.6, u), yaw, 1.0); }, { hour: 14 }); };
  // 08 not doing great: the Liquidated Trader at the arcade, at night
  S.notgreat = async (o = {}) => { const yaw = o.yaw ?? 0.2; TRV.ui([], true); meHide(); NPC.target = 60; stopEvents(); pin({ liquidated: 'liqSpot' }, true, yaw);
    install(t => { const p = R('liquidated').c ? R('liquidated').c.position : NPC.PL.liqSpot, u = t / 2; cam3(p.x, p.z, L(6.4, 5.6, u), yaw, 1.0); }, { hour: 23 }); };
  // 09 the club, a full dance floor: a fast push, then round
  S.club = async () => { await toVenue('v102'); meHide(); TRV.ui(); stopEvents();
    const ids = [1700, 561, 212, 1337, 77, 999, 1514, 420, 1234, 808, 1881, 69, 1969, 333, 1111, 404];
    let k = 0; for (const dx of [-1.3, 0, 1.3]) for (const dz of [-1.3, 0, 1.3]) addChog(traitsFor(ids[k++]), -3 + dx + Math.sin(dx * 7 + dz) * 0.2, -4.5 + dz + Math.cos(dz * 5 + dx) * 0.2, Math.PI / 4, 'dance');
    for (const [x, z] of [[-6.5, -2], [-1, -7.2], [-5.2, -6.6], [1.6, -6.0], [0.4, -2.4], [-6.8, -4.4], [1.8, -3.6]]) addChog(traitsFor(ids[k++]), x, z, Math.PI / 4, 'dance');
    install(t => { const a = E(C(0, 1, t / 0.9)), b = Math.max(0, t - 0.9) * 0.32; cam3(L(-1, -2.9, a), L(-2.6, -4.3, a), L(18, 9.5, a) - b * 0.6, L(-0.1, 0, a) + b, 1.0); }, { hour: 23 }); };
  // 10 mini-games: each opened by the game itself, played by the scene (TRV.game(id, t) is called every frame)
  S.games = async () => { TRV.ui(['#gm']); meHide(); stopEvents(); NPC.target = 30;
    install(t => cam3(-6, -6, 22, 0), { hour: 16 }); };
  // 11 culture: the gm wall in the lobby, the laser booth, the shop
  S.gmwall = async () => { await toHotel(); meHide(); TRV.ui([], false); stopEvents();
    for (const [x, z, r] of [[-1.5, 1.4, 2.4], [1.2, 2.2, 3.6], [-3.4, -0.6, 1.1], [2.8, 0.2, -2.6], [0.2, -1.4, 3.2]]) addChog(traitsFor(pick(1, Math.round((x + 9) * 1000 + z * 77))[0]), x, z, r, 'idle');
    install(t => { const u = E(C(0, 1, t / 2)); cam3(L(-0.4, 0, u), L(0.2, 0, u), L(16, 13, u), 0.05); }, { hour: 19 }); };
  S.shop = async () => { TRV.ui(['#shop']); meHide(); stopEvents(); SHOP.open();
    install(t => cam3(-6, -6, 22, 0), { hour: 16 }); };
  // 12 day to night over Hotel Street, residents rushing (time-lapse)
  S.timelapse = async () => { TRV.ui(); meHide(); NPC.target = 40; stopEvents();
    install(t => { const u = t / 4.9; cam3(L(-9, -3, u), -17, 30, L(-0.35, -0.2, u)); }, { hour: 15, hour0: 15, hour1: 23.5, span: 4.9, timeScale: 420 }); };
  // 13 the finale: from the door back over the whole hotel
  S.finale = async () => { TRV.ui(); meHide(); NPC.target = 40; stopEvents();
    install(t => { const u = E(C(0, 1, t / 5.4)), v = Math.max(0, t - 5.4); cam3(-6, L(-23, -24, u), L(12, 76, u) + v * 2.5, L(0.05, -0.12, u) - v * 0.03, L(1.1, 8, u)); }, { hour: 19.3 }); };

  // two-player games against a resident: the player and the resident face each other at the plaza, the game's panel or window on top
  const duel = async (game, id, place) => { NPC.target = 30; stopEvents(); pin({ [id]: place });
    const p = NPC.PL[place], me = GAME.me; me.position.set(p.x - 1.6, 0, p.z + 0.6); me.rotation.y = Math.atan2(1.6, -0.6); GAME.path = []; NPC.PL[place].ry = Math.atan2(-1.6, 0.6);
    TRV.ui(['#gm'], true); GAMES.vsNpc(game, R(id));
    install(t => cam3(p.x - 0.9, p.z + 0.4, L(9, 8, t / 1.4), 0.1, 1.0), { hour: 16 }); };
  S.rps = () => duel('rps', 'doombear', 'pz1');
  S.c4 = () => duel('c4', 'midwit', 'pz2');
  // one resident and one of its lines, in the game's own speech bubble over its nameplate
  S.say = async o => { meHide(); NPC.target = 60; stopEvents(); TRV.ui([], true); pin({ [o.id]: o.place }, true, o.yaw ?? 0.15);
    let said = false;
    install(t => { const c = R(o.id).c, p = c ? c.position : NPC.PL[o.place]; if (!said && t > 0.25 && R(o.id).plate) { said = true; PLATES.say(R(o.id).plate, o.text); } cam3(p.x, p.z, L(6.8, 6, t / 2), o.yaw ?? 0.15, 1.0); }, { hour: o.hour }); };

  TRV.zero = pre => { tStart = performance.now() / 1000 + pre; TRV.zeroed = true; return 1; };   // the capture calls this once the page clock is frozen: t = 0 on the first saved frame
  TRV.scene = async (name, o) => { DAY.setMode('fixed', 18); await S[name](o); return name; };
})();
