// ===== room: a room, and the editor for yours =====
// Every wallet player has a room in the Hotel (a venue record on the server, tier 0 = free): the hotel hall's door brings you in (ROOM.enterVenue); walk around, decorate (grid, click a piece, click the spot), save it signed by your wallet; the owner can lock the door.
// A walletless guest gets a temporary room (kind 'solo') that is never saved.
// A room is a space document (js/space.js, docs/game/spaces.md); this file owns the rules around it: entering and leaving the town scene, walking collision,
// the placement editor and its panel, the server link (net.js: enter / roomprep / roomsave). Loaded after net.js and ui.js.
const ROOM = {
  active: false, kind: null /* 'solo' | 'venue' | 'facade' */, mode: 'walk' /* 'walk' | 'edit' */, doc: null, owner: null, ownerName: null, mine: true,
  dirty: false, savedAt: null, held: null, busy: false, ui: null, tab: 'pieces', cat: 'all', rects: [],
};
(function () {
  const SNAP = 0.5, LIMIT = 80, HOME = [14, 10], LIGHTS = 14, WALL_H = 5.0, FACADE_H = 6.0, HALL_H = 6.0;                             // grid step; pieces per free Home and its floor in metres (the server enforces the same numbers, server/rooms.js LIMITS); rooms are 5 m tall, the facade strip shows the 6 m hall wall
  const HOTEL_DOOR = CITY.doors.hotel, CITY_OUT = { x: HOTEL_DOOR.x, z: HOTEL_DOOR.out, ry: 0 };   // leaving a temporary room puts you on the pavement in front of the Hotel
  const spawnIn = (size, at) => ({ x: at === 'stairs' ? SPACE.stairsU(size[0]) : size[0] / 2 - 1.6, z: -size[1] / 2 + (at === 'stairs' ? 2.1 : 1.2), ry: 0 });      // where you appear inside: by the room's own door (or the foot of its stairs)
  // unsaved drafts from before the rooms grew (2026-10-15) have no `sz`: shift them like the server shifts saved rooms (every piece keeps its place against the back walls)
  const OLD_ROOM = { home: [13, 10], 1: [15, 11], 2: [18, 13], 3: [18, 13], 4: [22, 15] };
  const draftDoc = (dr, oldKey, to) => { const from = !dr.sz && OLD_ROOM[oldKey]; if (!from || !to) return dr.doc; const dx = (from[0] - to[0]) / 2, dz = (from[1] - to[1]) / 2; return Object.assign({}, dr.doc, { pieces: (dr.doc.pieces || []).map(it => Object.assign({}, it, { x: +(it.x + dx).toFixed(2), z: +(it.z + dz).toFixed(2) })) }); };
  const WALL_GAP = 0.3, rad = d => d * Math.PI / 180;
  const isWall = d => d.cat === 'wall' || d.fp[1] <= 0.12, isFlat = d => d.cat === 'floor' || d.cat === 'ceiling', grp = d => (d.cat === 'ceiling' ? 2 : d.cat === 'floor' ? 1 : 0);          // rugs and ceiling lights do not block walking; each kind only collides with its own kind
  const rotated = it => Math.round((it.ry || 0) / 90) % 2 !== 0;
  const rectOf = (it, d) => ({ x: it.x, z: it.z, hw: (rotated(it) ? d.fp[1] : d.fp[0]) / 2, hd: (rotated(it) ? d.fp[0] : d.fp[1]) / 2 });
  const wallOf = it => (rotated(it) ? 'x' : 'z');
  const hexOf = s => '0x' + [...new TextEncoder().encode(s)].map(b => b.toString(16).padStart(2, '0')).join('');
  const dims = () => SPACE.size;
  const scatter = p => ({ x: p.x + (Math.random() - 0.5) * 0.8, z: p.z + Math.random() * 0.5, ry: 0 });         // a little scatter so two people arriving together do not stand inside each other
  // a wall piece hangs ON a back wall, whatever size the room had when it was saved (the server does the same when it stores a room)
  const snapWalls = (doc, W, D) => { for (const it of doc.pieces) { const d = SPACE.PIECES[it.p]; if (!d || !isWall(d)) continue; if (rotated(it)) { it.ry = 90; it.x = -W / 2; it.z = Math.max(-D / 2, Math.min(D / 2, it.z)); } else { delete it.ry; it.z = -D / 2; it.x = Math.max(-W / 2, Math.min(W / 2, it.x)); } } return doc; };
  const defOf = it => SPACE.PIECES[it.p];
  const CATS = [['all', 'All'], ['seat', 'Seating'], ['table', 'Tables'], ['sleep', 'Beds'], ['storage', 'Storage'], ['light', 'Lights'], ['ceiling', 'Ceiling'], ['deco', 'Decor'], ['floor', 'Rugs'], ['wall', 'Wall'], ['media', 'Media'], ['tech', 'Tech'], ['work', 'Work'], ['kitchen', 'Kitchen'], ['venue', 'Stage & games']];
  const TINTS = ['#7a3ac8', '#ff7aa8', '#6fbdb0', '#ffc23a', '#e8553a', '#3a8ad8', '#4aa84a', '#f4f0e8', '#2b2140'];
  const save$ = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const load$ = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const draftKey = () => (ROOM.kind === 'venue' ? (ROOM.level === 2 ? 'chog_venue2_' : 'chog_venue_') : ROOM.kind === 'facade' ? 'chog_facade_' : 'chog_room_') + ((ROOM.owner || (WALLET.account || 'guest')) + '').toLowerCase();
  // the tier that unlocks pieces here: a venue's own tier, else the wallet's license (0 until it is read). A piece with `minTier` needs it; a `venue` piece only goes into a hotel venue.
  const tierNow = () => ((ROOM.kind === 'venue' || ROOM.kind === 'facade') && ROOM.venue ? ROOM.venue.tier || 0 : (typeof VENUE !== 'undefined' && VENUE.info && VENUE.info.tier) || 0);      // a room's own tier (0 = a free room), not the wallet's
  const tierName = t => (typeof TIER_NAME !== 'undefined' && TIER_NAME[t]) || 'tier ' + t;
  const lockedFor = d => ((d.minTier || 0) > tierNow() ? 'Requires ' + tierName(d.minTier) : d.shop && !(typeof SHOP !== 'undefined' && SHOP.owns(d.shop)) ? 'Buy in the Shop' : '');      // shop pieces (kit 'shop') need the soulbound item; the server checks it again on save
  const usable = d => !d.venue || (ROOM.kind === 'venue' && tierNow() > 0);
  ROOM.lockedFor = lockedFor;
  const limitNow = () => ((ROOM.kind === 'venue' || ROOM.kind === 'facade') && ROOM.venue && ROOM.venue.limit) || LIMIT;                        // pieces: the free room, or the venue's tier budget (the server enforces the same number)

  // ------------------------------------------------------------------ the Hotel door in the town (rooms live in the Hotel; the old Home house is gone)
  const prompt = document.createElement('button'); prompt.id = 'doorp'; prompt.style.display = 'none'; prompt.onclick = () => doorAction();
  document.body.insertBefore(prompt, document.getElementById('ui'));
  const doorAction = () => { if (ROOM.busy || ROOM.mode === 'edit' || (typeof HOTEL !== 'undefined' && (HOTEL.active || HOTEL.busy))) return; if (ROOM.active) { if (nearStairs()) ROOM.goLevel(); else if (nearExit()) ROOM.leave(); } else if (nearHotel()) HOTEL.enterFromTown(); };
  const inTownNow = () => !(typeof HOTEL !== 'undefined' && HOTEL.active);                  // the hotel scenes reuse the coordinates of the street
  const nearHotel = () => inTownNow() && GAME.me && Math.hypot(GAME.me.position.x - HOTEL_DOOR.x, GAME.me.position.z - HOTEL_DOOR.z) < 1.6;
  const exitSpot = () => { const [RW, RD] = dims(); return { x: SPACE.door ? SPACE.door.u : RW / 2 - 1.6, z: -RD / 2 }; };
  const nearStairs = () => SPACE.stairs && GAME.me && Math.hypot(GAME.me.position.x - SPACE.stairs.u, GAME.me.position.z - (-dims()[1] / 2 + 1.9)) < 1.7;
  const nearExit = () => { const e = exitSpot(); return GAME.me && Math.hypot(GAME.me.position.x - e.x, GAME.me.position.z - e.z) < 1.9; };

  // ------------------------------------------------------------------ entering and leaving
  let prev = null;
  function enterScene() {
    const sc = sun.shadow.camera; prev = { zoom: GAME.zoomT, shadow: { l: sc.left, r: sc.right, t: sc.top, b: sc.bottom, f: sc.far } };
    DAY.pause(); for (const o of CITY_NODES) o.visible = false;
    GAME.room = { blocked: (x, z, r) => roomBlocked(x, z, r) }; ROOM.active = true; GAME.path = []; GAME.keys = {};
    GAME.camFixed = new THREE.Vector3(0, 1.0, 0); GAME.sceneZoom(13.5);
  }
  const fitZoom = () => { const [w, d] = dims(), z = 13.5 * Math.max(1, (w + d) / 16); GAME.zoomMax = 24; GAME.camFollowAt = z; GAME.sceneZoom(z); if (GAME.room) Object.assign(GAME.room, { size: [w, d], h: SPACE.H, center: [0, 1.0, 0], bounds: { x0: -w / 2 + 0.3, x1: w / 2 - 0.3, z0: -d / 2 + 0.3, z1: d / 2 - 0.3 }, zoom: z, follow: 18 }); };      // GAME.room also tells the camera: floor size, wall height, walking bounds, the zoom that shows the whole room (zoom) and the closer one to follow the player with (follow)      // a bigger floor needs a wider view; zoomed in beyond it the camera follows you (game.js)
  ROOM.showTown = on => { for (const o of CITY_NODES) o.visible = on; };            // the hotel hides and shows the street the same way a room does
  function leaveScene(keepTown) {                                                          // keepTown: going from a venue back to the hotel, the street stays hidden
    SPACE.unload(); if (!keepTown) { ROOM.showTown(true); DAY.resume(); }
    const sc = sun.shadow.camera; if (prev) { Object.assign(sc, { left: prev.shadow.l, right: prev.shadow.r, top: prev.shadow.t, bottom: prev.shadow.b, far: prev.shadow.f }); sc.updateProjectionMatrix(); if (!keepTown) GAME.sceneZoom(GAME.townBase); }
    GAME.room = null; GAME.camFixed = null; GAME.camFollowAt = 0; GAME.zoomMax = 24; SPACE.level = null; SPACE.limits.lights = LIGHTS; GAME.editMode = false; GAME.dragUI = false; GAME.regrid(); ROOM.active = false; ROOM.mode = 'walk';
    if (!keepTown) { const me = GAME.me; me.position.set(CITY_OUT.x, 0, CITY_OUT.z); me.rotation.y = CITY_OUT.ry; GAME.path = []; }
    SPACE.refreshHidden(); document.body.classList.remove('inroom');
  }
  function placeMe(s) { const me = GAME.me; me.position.set(s.x, 0, s.z); me.rotation.y = s.ry; GAME.path = []; }

  // a walletless guest's temporary room (unsaved, no door number); a wallet's room is a Hotel room (ROOM.enterVenue, HOTEL.arrive). Called by ROOM.enterSolo and ?room=mine.
  async function enterSolo() {
    if (ROOM.busy || (typeof HOTEL !== 'undefined' && HOTEL.busy)) return; ROOM.busy = true;
    const SPAWN_AT = scatter(spawnIn(HOME));
    try {
      const addr = WALLET.account ? WALLET.account.toLowerCase() : null, info = { kind: 'solo', owner: addr, ownerName: null, mine: true, savedAt: null, draft: false, venue: null };
      if (NET.status === 'online') await NET.enter(Object.assign({ space: 'solo' }, SPAWN_AT));
      let doc = null; const dr = load$('chog_room_' + (addr || 'guest'));                      // unsaved changes from last time
      if (dr && dr.doc) { doc = draftDoc(dr, 'home', HOME); info.draft = true; toast('Your unsaved changes are back.'); }
      if (!doc) doc = SPACE.starterRoom();
      info.spawn = SPAWN_AT; if (typeof HOTEL !== 'undefined' && (HOTEL.active || HOTEL.away)) { HOTEL.hideScene(false); HOTEL.away = false; }       // from inside the hotel: the street comes back when you leave
      ROOM.setup(doc, info);
    } finally { ROOM.busy = false; ROOM.refreshUI(); }
  }
  // a hotel venue: a room document the server serves to anyone who walks in (not editable, not a Home). Returns true when it opened.
  ROOM.enterVenue = async function (v, lv) {
    if (ROOM.busy) return false; ROOM.busy = true;
    const level = lv === 2 ? 2 : 1, arrive = ROOM.active ? 'stairs' : null, SPAWN_AT = ROOM.active && ROOM.venue ? scatter(spawnIn(ROOM.venue.size, arrive)) : { x: 0, z: 0, ry: 0 };          // (from the hotel the size is not known yet: the server answers with it)
    try {
      const r = await NET.enter(Object.assign({ space: 'venue', id: v.id, level }, SPAWN_AT)); if (!r || r.t !== 'entered') return false;
      if (typeof HOTEL !== 'undefined' && HOTEL.active) { HOTEL.hideScene(true); HOTEL.away = true; }
      const ven = r.venue || v, spawn = scatter(spawnIn(ven.size || [22, 16], arrive));                 // just inside the door (the foot of the stairs when you came from the other level)
      let doc = r.doc, draft = false;
      if (r.mine) {                                                                              // the owner: unsaved changes win, a new venue starts as an empty room
        const dr = load$((level === 2 ? 'chog_venue2_' : 'chog_venue_') + (r.owner || '')); if (dr && dr.doc) { doc = draftDoc(dr, ven.tier || (typeof VENUE !== 'undefined' && VENUE.mine && VENUE.mine.tier), ven.size); draft = true; toast('Your unsaved changes are back.'); }
        if (!doc) doc = SPACE.starterRoom();
      }
      if (!doc) doc = SPACE.starterRoom();                                                       // an upper level nobody has decorated yet
      ROOM.setup(doc, { kind: 'venue', owner: r.owner || null, ownerName: null, mine: !!r.mine, savedAt: r.doc ? Date.now() : null, draft, venue: ven, level, spawn }); if (typeof VENUE !== 'undefined' && VENUE.onEnterVenue) VENUE.onEnterVenue(ven); return true;
    } finally { ROOM.busy = false; ROOM.refreshUI(); }
  };
  // the stairs of a two-level venue: the other level is a room of its own (the server keeps presence and chat per level)
  ROOM.goLevel = async function () {
    if (!ROOM.active || ROOM.kind !== 'venue' || !ROOM.venue || !(ROOM.venue.levels > 1) || ROOM.busy) return;
    const v = ROOM.venue, to = ROOM.level === 1 ? 2 : 1; setEdit(false);
    if (typeof HOTEL !== 'undefined' && HOTEL.fade) await HOTEL.fade(() => ROOM.enterVenue(v, to)); else await ROOM.enterVenue(v, to);
  };
  ROOM.exitVenueScene = function () { setEdit(false); ROOM.venue = null; if (typeof VENUE !== 'undefined' && VENUE.onLeaveVenue) VENUE.onLeaveVenue(); leaveScene(true); ROOM.refreshUI(); if (typeof render === 'function') render(); };
  ROOM.setup = function (doc, info) {
    if (!Array.isArray(doc.pieces)) doc.pieces = [];
    const ven = info.venue; SPACE.size = (ven && ven.size) || HOME; doc.pieces = doc.pieces.filter(it => SPACE.PIECES[it.p]).slice(0, (ven && ven.limit) || LIMIT);
    snapWalls(doc, SPACE.size[0], SPACE.size[1]);
    SPACE.level = info.kind === 'venue' && ven && ven.levels > 1 ? { n: info.level || 1, of: ven.levels } : null; SPACE.limits.lights = (ven && ven.lights) || LIGHTS; SPACE.H = info.kind === 'facade' ? FACADE_H : WALL_H;      // upper level: stairs on the north wall; the tier's light budget
    Object.assign(ROOM, info, { doc, dirty: !!info.draft, held: null, hover: null, mode: 'walk', level: info.kind === 'venue' ? info.level || 1 : 1 });
    if (!ROOM.active) enterScene();
    GAME.editMode = false; GAME.dragUI = false; dropGhost();
    SPACE.build(doc); const sc = sun.shadow.camera; sc.updateProjectionMatrix();
    fitZoom(); placeMe(info.spawn || spawnIn(SPACE.size)); rebuildNav(); document.body.classList.add('inroom');
    ROOM.refreshUI(); if (typeof render === 'function') render();
  };
  ROOM.leave = function () {
    if (!ROOM.active) return; if (ROOM.kind === 'facade') { ROOM.endFacade(); return; } setEdit(false);
    if (ROOM.venue && typeof HOTEL !== 'undefined') { HOTEL.returnFromVenue(ROOM.venue); return; }          // back to its door in the hotel corridor
    leaveScene(false); if (NET.status === 'online') NET.enter(Object.assign({ space: 'city' }, CITY_OUT));
    ROOM.refreshUI(); if (typeof render === 'function') render();
  };
  // the facade of your venue: the strip of corridor wall around its door, edited like a room (a small scene; Done returns to the venue)
  const facadeStarter = () => ({ name: 'Facade', theme: 'studio', windows: false, pieces: [] });
  ROOM.editFacade = function () {
    if (!ROOM.active || ROOM.kind !== 'venue' || !ROOM.mine || typeof VENUE === 'undefined' || !VENUE.mine) return;
    const m = VENUE.mine, tpl = m.template || { facade: 12 }, me = GAME.me;
    ROOM.stash = { doc: ROOM.doc, info: { kind: 'venue', owner: ROOM.owner, ownerName: null, mine: true, savedAt: ROOM.savedAt, draft: ROOM.dirty, venue: ROOM.venue, level: ROOM.level, spawn: { x: me.position.x, z: me.position.z, ry: me.rotation.y } } };
    let doc = m.facade ? JSON.parse(JSON.stringify(m.facade)) : facadeStarter(), draft = false; const dr = load$('chog_facade_' + (ROOM.owner || '')); if (dr && dr.doc) { doc = dr.doc; draft = true; }
    SPACE.doorAt = { wall: 'z', u: 0 }; setEdit(false);
    ROOM.setup(doc, { kind: 'facade', owner: ROOM.owner, ownerName: null, mine: true, savedAt: m.hasFacade ? Date.now() : null, draft, venue: { id: m.id, no: m.no, floor: m.floor, name: m.name, tier: m.tier, size: m.facadeSize || [7, 1.6], limit: tpl.facade }, spawn: { x: 0, z: 0.4, ry: 0 } });
    setEdit(true);
  };
  ROOM.endFacade = function () {
    if (!ROOM.active || ROOM.kind !== 'facade' || !ROOM.stash) return; const st = ROOM.stash; ROOM.stash = null;
    setEdit(false); SPACE.doorAt = null; ROOM.setup(st.doc, st.info);
  };
  // the R key and the My Room button: leave the room you are in, otherwise go to your own Hotel room (lev.js: walks to the Hotel, then the hall in front of your door; no room yet: to Lev)
  ROOM.toggle = function () { if (ROOM.busy) return; if (ROOM.active) ROOM.leave(); else if (typeof LEV !== 'undefined') LEV.goMyRoom(); };
  ROOM.enterSolo = enterSolo;
  ROOM.resync = function () {                                                              // the server connection came back (it starts every connection in the town): rejoin this room
    if (!ROOM.active) return; const me = GAME.me, pos = { x: me.position.x, z: me.position.z, ry: me.rotation.y };
    if (ROOM.venue) { NET.enter(Object.assign({ space: ROOM.venue.exhibit ? 'exhibit' : 'venue', id: ROOM.venue.id }, pos)); return; }
    NET.enter(Object.assign({ space: 'solo' }, pos));
  };
  ROOM.onDoc = function (doc) { if (!ROOM.active || ROOM.mine) return; ROOM.doc = snapWalls(doc, SPACE.size[0], SPACE.size[1]); SPACE.build(doc); rebuildNav(); toast('The owner changed the room.'); };       // the owner saved while we are visiting
  ROOM.editing = () => ROOM.active && ROOM.mode === 'edit';
  ROOM.title = () => (ROOM.kind === 'facade' ? 'Facade' : ROOM.kind === 'venue' ? (ROOM.venue && ROOM.venue.name) || 'Hotel room' : ROOM.kind === 'visit' ? (ROOM.doc && ROOM.doc.name ? ROOM.doc.name : 'A room') : ROOM.doc && ROOM.doc.name ? ROOM.doc.name : 'My room');
  ROOM.hint = () => (ROOM.kind === 'facade' ? 'Decorate the wall and floor around your door · Save · Done goes back to your venue' : ROOM.mode === 'edit'
    ? (ROOM.held ? 'Click the spot to place · R turn · Del remove · Esc cancel · Shift: keep placing' : 'Pick a piece from the list, or click one in the room to move it · B done')
    : ROOM.mine ? 'Click to walk · B decorate · E at the door to leave · R leave' : 'Click to walk · E at the door to leave');

  // ------------------------------------------------------------------ collision: the floor, the walls and the furniture
  function roomBlocked(x, z, r) {
    const [RW, RD] = dims(); if (Math.abs(x) > RW / 2 - WALL_GAP || Math.abs(z) > RD / 2 - WALL_GAP) return true;
    for (const b of ROOM.rects) if (Math.abs(x - b.x) < b.hw + r && Math.abs(z - b.z) < b.hd + r) return true;
    return false;
  }
  function rebuildNav() {
    ROOM.rects = []; for (const e of SPACE.placed) { const d = e.def; if (isWall(d) || isFlat(d)) continue; ROOM.rects.push(rectOf(e.it, d)); }
    if (SPACE.stairs) ROOM.rects.push({ x: SPACE.stairs.u, z: -dims()[1] / 2 + 0.75, hw: 0.82, hd: 0.75 });                  // the flight of stairs is solid; you stand at its foot
    GAME.regrid();
    const me = GAME.me; if (me && roomBlocked(me.position.x, me.position.z, 0.2)) { const g = nearestFree(me.position.x, me.position.z); if (g) me.position.set(g[0], 0, g[1]); }     // furniture dropped on the player: step out
  }

  // ------------------------------------------------------------------ placement rules (one place for the editor and for tests)
  function fits(it, d, ignore) {
    const [RW, RD] = dims(), eps = 1e-6;
    if (isWall(d)) {
      const wall = wallOf(it), half = d.fp[0] / 2, u = wall === 'z' ? it.x : it.z, len = wall === 'z' ? RW : RD;
      if (ROOM.kind === 'facade' && wall !== 'z') return 'On a facade, wall pieces go on the back wall.';
      if (Math.abs(u) + half > len / 2 + eps) return 'Outside the wall.';
      if (wall === 'z' && SPACE.door && Math.abs(u - SPACE.door.u) < half + 0.8) return 'That would block the door.';
      if (wall === 'z' && SPACE.stairs && Math.abs(u - SPACE.stairs.u) < half + 0.8) return 'That would block the stairs.';
      for (const w of SPACE.windows) if (w.wall === wall && Math.abs(u - w.u) < half + w.w / 2 + 0.15) return 'That is in front of a window.';
      for (const e of SPACE.placed) { if (e.it === ignore || !isWall(e.def) || wallOf(e.it) !== wall) continue; const u2 = wall === 'z' ? e.it.x : e.it.z; if (Math.abs(u - u2) < half + e.def.fp[0] / 2 - 0.02) return 'Something is already on the wall there.'; }
      return null;
    }
    const r = rectOf(it, d);
    if (r.x - r.hw < -RW / 2 - eps || r.x + r.hw > RW / 2 + eps || r.z - r.hd < -RD / 2 - eps || r.z + r.hd > RD / 2 + eps) return 'Outside the room.';
    const ex = exitSpot(); if (!isFlat(d) && Math.abs(r.x - ex.x) < r.hw + 0.9 && r.z - r.hd < ex.z + 1.5) return 'Keep the way to the door clear.';
    if (!isFlat(d) && SPACE.stairs && Math.abs(r.x - SPACE.stairs.u) < r.hw + 1.2 && r.z - r.hd < -RD / 2 + 2.4) return 'Keep the stairs clear.';
    for (const e of SPACE.placed) {
      if (e.it === ignore || isWall(e.def) || grp(e.def) !== grp(d)) continue;
      const o = rectOf(e.it, e.def); if (Math.abs(r.x - o.x) < r.hw + o.hw - 0.02 && Math.abs(r.z - o.z) < r.hd + o.hd - 0.02) return 'That spot is taken.';
    }
    return null;
  }
  ROOM.fits = fits;

  // ------------------------------------------------------------------ the editor
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), P = new THREE.Vector3(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const dom = renderer.domElement;
  let ptr = null, down = null, ghost = null, plate = null, hoverBox = null;

  function ensureHelpers() {
    if (!plate) { plate = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, 1), new THREE.MeshBasicMaterial({ color: 0x40ff80, transparent: true, opacity: 0.5, depthWrite: false })); plate.userData.noNormal = true; plate.visible = false; world.add(plate); }
    if (!hoverBox) { hoverBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffd84a })); hoverBox.userData.noNormal = true; hoverBox.visible = false; world.add(hoverBox); }
    SPACE.refreshHidden();
  }
  function dropGhost() { if (ghost) { SPACE.disposeGhost(ghost); ghost = null; } if (plate) plate.visible = false; if (hoverBox) hoverBox.visible = false; }
  function setEdit(on) {
    if (on && (!ROOM.mine || !ROOM.active)) return;
    ROOM.mode = on ? 'edit' : 'walk'; GAME.editMode = on; GAME.dragUI = on; GAME.path = [];
    if (!on) { cancelHeld(); dropGhost(); dom.style.cursor = 'default'; }
    else { ensureHelpers(); if (ROOM.kind === 'venue' && typeof VENUE !== 'undefined') VENUE.loadInventory(); }
    GAME.camFixed = on ? new THREE.Vector3(0, 1.0, 0).addScaledVector(CAM_RIGHT, 1.7) : new THREE.Vector3(0, 1.0, 0);          // the panel covers the right side: slide the room left
    ROOM.refreshUI(); if (typeof render === 'function') render();
  }
  ROOM.setEdit = setEdit;
  const touch = () => { ROOM.dirty = true; save$(draftKey(), { doc: ROOM.doc, at: Date.now(), sz: SPACE.size }); };
  const entryOf = it => SPACE.placed.find(e => e.it === it);

  // what the pointer points at: a wall (for wall pieces) or the floor, snapped to the grid; returns an item position
  function aim(d, ry) {
    const [RW, RD] = dims();
    if (isWall(d)) {
      const half = d.fp[0] / 2, c = [];
      const hitZ = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), RD / 2), new THREE.Vector3()), hitX = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(1, 0, 0), RW / 2), new THREE.Vector3());
      if (hitZ && hitZ.y >= -0.1 && hitZ.y <= SPACE.H && Math.abs(hitZ.x) <= RW / 2 + 0.3) c.push(['z', hitZ]);
      if (hitX && hitX.y >= -0.1 && hitX.y <= SPACE.H && Math.abs(hitX.z) <= RD / 2 + 0.3) c.push(['x', hitX]);
      let wall, pt;
      if (c.length) { c.sort((a, b) => ray.ray.origin.distanceTo(a[1]) - ray.ray.origin.distanceTo(b[1])); [wall, pt] = c[0]; }
      else if (ray.ray.intersectPlane(floorPlane, P)) { wall = P.z + RD / 2 < P.x + RW / 2 ? 'z' : 'x'; pt = P; } else return null;
      const len = wall === 'z' ? RW : RD, u0 = wall === 'z' ? pt.x : pt.z, lim = Math.max(0, len / 2 - half), u = Math.max(-lim, Math.min(lim, Math.round(u0 / SNAP) * SNAP));
      return wall === 'z' ? { x: u, z: -RD / 2, ry: 0 } : { x: -RW / 2, z: u, ry: 90 };
    }
    if (!ray.ray.intersectPlane(floorPlane, P)) return null;
    const it = { ry }, q = rotated(it), hw = (q ? d.fp[1] : d.fp[0]) / 2, hd = (q ? d.fp[0] : d.fp[1]) / 2;
    const snap1 = (c, half, lo, hi) => { let v = Math.round(c / SNAP) * SNAP; if (v - half - lo < SNAP) v = lo + half; else if (hi - (v + half) < SNAP) v = hi - half; return Math.max(lo + half, Math.min(hi - half, +v.toFixed(3))); };   // within half a metre of a wall: flush against it
    return { x: snap1(P.x, hw, -RW / 2, RW / 2), z: snap1(P.z, hd, -RD / 2, RD / 2), ry };
  }
  function setGhost(it) {                                                                   // (re)build the preview of the held item
    if (ghost) SPACE.disposeGhost(ghost);
    ghost = SPACE.makePiece(it, { ghost: true }); if (ghost) { world.add(ghost.g); SPACE.refreshHidden(); }
  }
  function hold(it, from) {
    ROOM.held = { it, from: from || null, valid: false, reason: '' }; ensureHelpers(); setGhost(it); ROOM.refreshUI(); if (typeof render === 'function') render();
  }
  function cancelHeld() {
    const h = ROOM.held; if (!h) return; ROOM.held = null;
    if (h.from) { ROOM.doc.pieces.splice(h.from.idx, 0, h.from.it); const e = SPACE.makePiece(h.from.it); if (e) SPACE.addEntry(e); SPACE.refreshHidden(); rebuildNav(); }       // a picked-up piece goes back where it was
    dropGhost(); ROOM.refreshUI(); if (typeof render === 'function') render();
  }
  function pickUp(e) {
    const idx = ROOM.doc.pieces.indexOf(e.it); if (idx < 0) return;
    ROOM.doc.pieces.splice(idx, 1); SPACE.removeEntry(e); SPACE.refreshHidden(); rebuildNav();
    hold(Object.assign({}, e.it), { it: e.it, idx }); sfxPlay('pickup');
  }
  function placeHeld(keep) {
    const h = ROOM.held; if (!h || !h.valid) { if (h && h.reason) toast(h.reason); return; }
    const it = Object.assign({}, h.it), idx = h.from ? h.from.idx : ROOM.doc.pieces.length;
    ROOM.doc.pieces.splice(idx, 0, it); const e = SPACE.makePiece(it); if (e) SPACE.addEntry(e);
    if (h.stored && typeof VENUE !== 'undefined' && VENUE.inv) { const k = VENUE.inv.items.indexOf(h.stored); if (k >= 0) VENUE.inv.items.splice(k, 1); }           // a stored piece that now stands in the room leaves the Stored list (the server takes it out when the room is saved)
    SPACE.refreshHidden(); rebuildNav(); touch(); sfxPlay('place'); ROOM.placedCount = (ROOM.placedCount || 0) + 1;                     // (the tips watch this)
    if (keep && !h.from && !h.stored) { ROOM.held = { it: Object.assign({}, it), from: null, valid: false, reason: '' }; setGhost(ROOM.held.it); } else { ROOM.held = null; dropGhost(); }
    ROOM.refreshUI(); if (typeof render === 'function') render();
  }
  function deleteHeld() {
    const h = ROOM.held; if (!h) return; if (h.from) touch(); sfxPlay('close'); ROOM.held = null; dropGhost(); rebuildNav(); ROOM.refreshUI(); if (typeof render === 'function') render();
  }
  function rotateHeld() {
    const h = ROOM.held; if (!h || isWall(defOf(h.it))) return; h.it.ry = ((h.it.ry || 0) + 90) % 360; sfxPlay('rotate'); if (ghost) ghost.g.rotation.y = rad(h.it.ry);
  }
  // extra = a stored piece being placed again ({c, txt} and its place in the inventory list, so the Stored tab can drop it once it stands in the room)
  ROOM.hold = (p, extra) => { const lock = SPACE.PIECES[p] && lockedFor(SPACE.PIECES[p]); if (lock) { toast(lock + ' to place the ' + SPACE.PIECES[p].name.toLowerCase() + '.'); return; } if (!ROOM.editing() || (ROOM.doc.pieces.length >= limitNow())) { if (ROOM.doc && ROOM.doc.pieces.length >= limitNow()) toast('This room is full (' + limitNow() + ' pieces).'); return; } cancelHeld(); const d = SPACE.PIECES[p], t = d.parts.find(x => x.edit && x.t === 'text'); hold(Object.assign({ p, x: 0, z: 0, ry: 0 }, t ? { txt: t.txt } : {}, extra && extra.c ? { c: extra.c } : {}, extra && extra.txt ? { txt: extra.txt } : {})); if (extra && ROOM.held) ROOM.held.stored = extra.item; };
  ROOM.rotate = rotateHeld; ROOM.drop = deleteHeld; ROOM.cancel = cancelHeld;
  ROOM.retint = c => { const h = ROOM.held; if (!h) return; if (c) h.it.c = c; else delete h.it.c; setGhost(h.it); ROOM.refreshUI(); if (typeof render === 'function') render(); };
  ROOM.retext = t => { const h = ROOM.held; if (!h) return; h.it.txt = t.slice(0, 24); setGhost(h.it); };

  // per frame in edit mode: the ghost follows the pointer, a frame marks the piece under it
  function pick() {
    const groups = SPACE.placed.map(e => e.g), hits = ray.intersectObjects(groups, true).filter(h => h.object.isMesh && !(h.object.userData && (h.object.userData.isHull || h.object.userData.noNormal)));
    if (!hits.length) return null; let o = hits[0].object; while (o && !groups.includes(o)) o = o.parent; return SPACE.placed.find(e => e.g === o) || null;
  }
  const box3 = new THREE.Box3(), c3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  function updateEdit() {
    const h = ROOM.held; if (!ptr || (h && !ghost)) return;
    const r = dom.getBoundingClientRect(); ndc.set(((ptr.clientX - r.left) / r.width) * 2 - 1, -((ptr.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
    if (h) {
      hoverBox.visible = false; const d = defOf(h.it), a = aim(d, h.it.ry || 0);
      if (!a) { ghost.g.visible = false; plate.visible = false; return; }
      ghost.g.visible = true; Object.assign(h.it, { x: a.x, z: a.z }); if (isWall(d)) h.it.ry = a.ry;
      ghost.g.position.set(a.x, 0, a.z); ghost.g.rotation.y = rad(h.it.ry || 0);
      h.reason = fits(h.it, d, null) || ''; h.valid = !h.reason;
      const q = rotated(h.it), w = isWall(d) ? d.fp[0] : (q ? d.fp[1] : d.fp[0]), dd = isWall(d) ? 0.3 : (q ? d.fp[0] : d.fp[1]), wl = isWall(d) ? wallOf(h.it) : null;
      plate.visible = true; plate.material.color.set(h.valid ? 0x40ff80 : 0xff5a4a); plate.scale.set(wl === 'x' ? dd : w, 1, wl === 'x' ? w : dd);
      plate.position.set(wl === 'z' ? a.x : wl === 'x' ? a.x + dd / 2 : a.x, 0.03, wl === 'z' ? a.z + dd / 2 : a.z);
      dom.style.cursor = h.valid ? 'copy' : 'not-allowed';
    } else {
      const e = pick(); ROOM.hover = e;
      if (e) { box3.setFromObject(e.g); box3.getCenter(c3); box3.getSize(s3); hoverBox.position.copy(c3); hoverBox.scale.set(s3.x + 0.06, s3.y + 0.06, s3.z + 0.06); hoverBox.visible = true; dom.style.cursor = 'pointer'; }
      else { hoverBox.visible = false; dom.style.cursor = 'default'; }
    }
  }
  dom.addEventListener('pointermove', e => { ptr = e; });
  dom.addEventListener('pointerleave', () => { ptr = null; if (plate) plate.visible = false; if (hoverBox) hoverBox.visible = false; if (ghost) ghost.g.visible = false; });
  dom.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now(), b: e.button }; });
  dom.addEventListener('contextmenu', e => { if (ROOM.editing()) { e.preventDefault(); if (ROOM.held) cancelHeld(); } });
  addEventListener('pointerup', e => {
    if (!ROOM.editing() || !down || e.target !== dom || down.b !== 0) { down = null; return; }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null; if (moved > 8 || dt > 600) return;
    ptr = e; updateEdit();
    if (ROOM.held) placeHeld(e.shiftKey); else if (ROOM.hover) pickUp(ROOM.hover);
  });
  addEventListener('keydown', e => {
    const typing = e.target.matches && e.target.matches('input,textarea,select');
    if (e.code === 'Escape' && ROOM.editing()) { if (ROOM.held) cancelHeld(); else if (!typing) setEdit(false); return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyE') doorAction();
    else if (e.code === 'KeyB' && ROOM.active && ROOM.mine) setEdit(!ROOM.editing());
    else if (ROOM.editing() && e.code === 'KeyR') rotateHeld();
    else if (ROOM.editing() && (e.code === 'Delete' || e.code === 'Backspace' || e.code === 'KeyX')) deleteHeld();
  });

  // ------------------------------------------------------------------ per frame: door prompt, edit preview
  const v3 = new THREE.Vector3();
  animated.push(() => {
    if (!GAME.me) return;
    if (ROOM.editing()) updateEdit();
    let show = false, label = '', at = null;
    if (!ROOM.active && nearHotel() && !ROOM.busy) { show = true; label = '<kbd>E</kbd> Enter the Chog Hotel'; at = [HOTEL_DOOR.x, 2.35, HOTEL_DOOR.z]; }
    else if (ROOM.active && ROOM.mode === 'walk' && nearStairs() && !ROOM.busy) { show = true; label = '<kbd>E</kbd> Go ' + (SPACE.stairs.up ? 'upstairs' : 'downstairs'); at = [SPACE.stairs.u, 3.6, -dims()[1] / 2]; }
    else if (ROOM.active && ROOM.mode === 'walk' && nearExit() && !ROOM.busy) { const ex = exitSpot(); show = true; label = '<kbd>E</kbd> Leave the room'; at = [ex.x, 2.5, ex.z]; }
    if (show) {
      v3.set(at[0], at[1], at[2]).project(cam); const sc = Math.max(0.8, Math.min(1.6, innerHeight / 810));
      prompt.style.display = 'flex'; prompt.innerHTML = label; prompt.style.transform = `translate(${((v3.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-v3.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%, -100%) scale(${sc})`;
    } else prompt.style.display = 'none';
  });

  // ------------------------------------------------------------------ rebuild after look changes (theme, window view, wall, floor, windows)
  function rebuild() { SPACE.build(ROOM.doc); if (ROOM.held) setGhost(ROOM.held.it); SPACE.refreshHidden(); rebuildNav(); }
  SPACE.onView = () => { if (ROOM.active) rebuild(); };
  const look = fn => () => { fn(); touch(); rebuild(); ROOM.refreshUI(); if (typeof render === 'function') render(); };

  // ------------------------------------------------------------------ saving: the wallet signs the cleaned document, the server stores it
  ROOM.save = async function () {
    if (ROOM.busy || !ROOM.mine) return;
    if (ROOM.kind === 'solo') { toast(WALLET.account ? 'This temporary room is not saved. Check in at the Hotel reception for a room of your own.' : 'This temporary room is not saved. Connect a wallet and check in at the Hotel reception for a room of your own.'); if (!WALLET.account && typeof connectFlow === 'function') connectFlow(); return; }
    if (!WALLET.account) { toast('Connect a wallet to save your room. Your changes stay on this device meanwhile.'); if (typeof connectFlow === 'function') connectFlow(); return; }
    if (NET.status !== 'online' || !NET.rooms) { toast('The town server is offline. Your changes stay on this device.'); return; }
    ROOM.busy = true; ROOM.refreshUI();
    try {
      if (!await NET.authenticate()) { toast('Signing in with your wallet did not work.'); return; }
      const ven = ROOM.kind === 'venue' || ROOM.kind === 'facade', kn = ROOM.kind === 'facade' ? 'facade' : 'venue', pt = ven ? kn + 'prep' : 'roomprep';
      NET.send({ t: pt, doc: ROOM.doc, level: ROOM.level }); const prep = await NET.waitFor([pt, 'roomfail'], 8000);
      if (!prep || prep.t !== pt) { if (!prep) toast('The server did not answer.'); return; }
      toast('Sign the message in your wallet to save the ' + (ven ? kn : 'room') + ' (free, no transaction).');
      let sig; try { sig = await WALLET.provider.request({ method: 'personal_sign', params: [hexOf(prep.message), WALLET.account] }); } catch (e) { toast(e && e.code === 4001 ? 'Not saved: you declined the signature.' : 'Could not sign.'); return; }
      const st = ven ? kn + 'save' : 'roomsave', sd = ven ? kn + 'saved' : 'roomsaved';
      NET.send({ t: st, doc: ROOM.doc, ts: prep.ts, sig, level: ROOM.level }); const r = await NET.waitFor([sd, 'roomfail'], 8000);
      if (r && r.t === sd && ven) { ROOM.dirty = false; sfxPlay('save'); ROOM.savedAt = r.at; save$(draftKey(), null); if (typeof VENUE !== 'undefined') VENUE.onMine(r.mine); toast(kn === 'facade' ? 'Facade saved. It shows in the hall right away.' : r.mine && r.mine.state === 'open' ? (r.mine.tier ? 'Venue saved. Visitors see the new look.' : 'Room saved. Visitors see the new look.') : 'Venue saved. Press Open venue when you are ready.'); }
      else if (r && r.t === sd) {
        ROOM.dirty = false; sfxPlay('save'); ROOM.savedAt = r.at; ROOM.owner = WALLET.account.toLowerCase(); save$(draftKey(), null); toast('Room saved.');
        if (ROOM.kind === 'solo') { ROOM.kind = 'mine'; const me = GAME.me; NET.enter({ space: 'room', who: 'me', x: me.position.x, z: me.position.z, ry: me.rotation.y }); }      // now others can come in
      } else if (r && r.t === 'roomfail') { /* net.js already showed why */ } else if (!r) toast('The server did not answer. Try Save again.');
    } finally { ROOM.busy = false; ROOM.refreshUI(); if (typeof render === 'function') render(); }
  };
  // ------------------------------------------------------------------ HUD: top bar, the panel
  ROOM.hud = function () { if (!ROOM.ui) { ROOM.ui = el('div', 'roomhud'); ROOM.refreshUI(); } return ROOM.ui; };
  ROOM.refreshUI = function () {
    const u = ROOM.ui; if (!u) return; const sc = u.querySelector('.rp-body'); const top = sc ? sc.scrollTop : 0; u.innerHTML = '';
    if (!ROOM.active) return; u.appendChild(topBar()); if (ROOM.mode === 'edit') { u.appendChild(panel()); const b = u.querySelector('.rp-body'); if (b) b.scrollTop = top; }
  };
  const btn = (cls, txt, fn, title) => { const b = el('button', 'btn hit ' + cls, ''); b.textContent = txt; b.onclick = fn; if (title) b.title = title; return b; };
  function topBar() {
    const bar = el('div', 'roombar hit'), name = el('div', 'rn'); const t = el('b'); t.textContent = ROOM.title(); name.appendChild(t);
    const s = el('small'); s.textContent = ROOM.kind === 'facade' ? (ROOM.dirty ? 'Unsaved changes' : 'The strip around your door') : ROOM.kind === 'venue' && ROOM.mine ? (ROOM.venue.tier ? 'Your venue' : 'Your room') + ' · Room ' + (ROOM.venue.tag || ROOM.venue.no) + (ROOM.venue.levels > 1 ? ' · ' + (ROOM.level === 2 ? 'Upper level' : 'Entrance level') : '') + ' · ' + (ROOM.dirty ? 'Unsaved changes' : typeof VENUE !== 'undefined' && VENUE.mine && VENUE.mine.locked ? 'Locked' : (typeof VENUE !== 'undefined' && VENUE.mine && VENUE.mine.state === 'open' ? (ROOM.venue.tier ? 'Open' : 'Open to visitors') : 'Closed to visitors')) : ROOM.kind === 'venue' && ROOM.venue.exhibit ? EXH.subtitle() : ROOM.kind === 'venue' ? 'Room ' + (ROOM.venue.tag || ROOM.venue.no) + ' · ' + (ROOM.venue.floor < 0 ? 'Basement' : 'Floor ' + (ROOM.venue.floor + ROOM.level - 1)) + ' · ' + (ROOM.venue.by || 'Chog Hotel') : ROOM.kind === 'visit' ? 'Visiting ' + (ROOM.ownerName || shortAddr(ROOM.owner || '0x0000000000')) : ROOM.mine ? (ROOM.kind === 'solo' ? 'Not saved to the server' : ROOM.dirty ? 'Unsaved changes' : ROOM.savedAt ? 'Saved' : 'New Home') : '';
    name.appendChild(s); bar.appendChild(name);
    if (ROOM.mine) {
      if (ROOM.kind !== 'facade') bar.appendChild(btn(ROOM.mode === 'edit' ? '' : 'ghost', ROOM.mode === 'edit' ? 'Done' : 'Decorate (B)', () => setEdit(ROOM.mode !== 'edit')));
      const sv = btn(ROOM.dirty || !ROOM.savedAt ? '' : 'ghost', ROOM.busy ? 'Saving…' : 'Save', () => ROOM.save(), 'Sign with your wallet to store the room on the server'); sv.disabled = ROOM.busy; bar.appendChild(sv);
      if (ROOM.kind === 'venue' && ROOM.venue && ROOM.venue.levels > 1) bar.appendChild(btn('ghost', ROOM.level === 2 ? 'Downstairs' : 'Upstairs', () => ROOM.goLevel(), 'The upper level is a room of its own: decorate and save it separately'));
      if (ROOM.kind === 'venue' && ROOM.level !== 2 && typeof EXH !== 'undefined') bar.appendChild(btn('ghost', 'Enter contest', () => EXH.enterContest(), 'Put a copy of your saved room into the weekly contest on the Exhibition floor'));
      if (ROOM.kind === 'venue' && ROOM.venue && ROOM.venue.tier) { bar.appendChild(btn('ghost', 'Facade', () => ROOM.editFacade(), 'Decorate the hall wall around your door')); if (typeof VENUE !== 'undefined') { const open = VENUE.mine && VENUE.mine.state === 'open'; bar.appendChild(btn(open ? 'ghost' : '', open ? 'Close venue' : 'Open venue', () => VENUE.toggleOpen(), open ? 'Visitors can no longer come in' : 'Let visitors in (the room must be saved)')); } }
      else if (ROOM.kind === 'facade') bar.appendChild(btn('', 'Done', () => ROOM.endFacade(), 'Back to your venue'));

    }
    if (ROOM.venue && ROOM.venue.exhibit && typeof EXH !== 'undefined') EXH.bar(bar, btn, 'entry');
    if (ROOM.kind === 'venue' && ROOM.mine && ROOM.venue && !ROOM.venue.exhibit && typeof VENUE !== 'undefined') {            // the door lock, next to the exit
      const lk = !!(VENUE.mine && VENUE.mine.id === ROOM.venue.id ? VENUE.mine.locked : ROOM.venue.locked);
      bar.appendChild(btn(lk ? '' : 'ghost', lk ? 'Unlock' : 'Lock', () => VENUE.setLock(!lk).then(r => r && r.ok && toast(r.locked ? 'The door is locked. Only you can come in; people inside can stay.' : 'The door is open again.')), lk ? 'The door is locked: only you can come in. Click to open it.' : 'Lock the door: only you can come in (people inside can stay)'));
    }
    if (ROOM.kind !== 'facade') bar.appendChild(btn('ghost', 'Leave', () => ROOM.leave())); return bar;
  }

  // thumbnails: each piece rendered once (current theme colours) by a second small renderer
  const thumbs = {}, thumbQ = []; let tr = null, thumbBusy = false;
  function renderThumb(id) {
    if (!tr) { tr = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); tr.setSize(112, 112); }
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x9a8878, 0.95)); const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(-3, 5, 4); sc.add(dl);
    const d = SPACE.PIECES[id], n0 = noNormalPass.length, t = d.parts.find(x => x.edit && x.t === 'text');
    const g = SPACE.buildParts(d.parts, SPACE.theme.pal, null, { anims: [], txt: t ? t.txt : undefined }); noNormalPass.splice(n0);
    g.traverse(o => { if (o.userData && o.userData.noNormal) o.visible = false; });
    sc.add(g); const b = new THREE.Box3().setFromObject(g), c = b.getCenter(new THREE.Vector3()), r = b.getSize(new THREE.Vector3()).length() * 0.5 * 0.92;
    const cm = new THREE.OrthographicCamera(-r, r, r, -r, 0.1, 100); cm.position.copy(c).addScaledVector(CAM_DIR, 30); cm.lookAt(c);
    tr.render(sc, cm); const url = tr.domElement.toDataURL('image/png'); g.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); return url;
  }
  function thumb(id, img) {
    const key = SPACE.theme.pal.wall + '|' + id; if (thumbs[key]) { img.src = thumbs[key]; return; }
    thumbQ.push([key, id, img]); if (thumbBusy) return; thumbBusy = true;
    const next = () => { const j = thumbQ.shift(); if (!j) { thumbBusy = false; return; } try { thumbs[j[0]] = renderThumb(j[1]); j[2].src = thumbs[j[0]]; } catch (e) { /* tile stays text-only */ } setTimeout(next, 0); }; setTimeout(next, 0);
  }

  function panel() {
    const p = el('div', 'rp card hit'), h = el('div', 'rp-head'), t = el('b'); t.textContent = 'Decorate'; h.appendChild(t);
    const n = el('small'); n.textContent = ROOM.doc.pieces.length + ' / ' + limitNow() + ' pieces'; h.appendChild(n); p.appendChild(h);
    if (ROOM.held) p.appendChild(holdBox());
    const stored = ROOM.kind === 'venue' && ROOM.mine && typeof VENUE !== 'undefined' && VENUE.inv ? VENUE.inv.items.length : 0;
    const tabs = el('div', 'rp-tabs'); for (const [id, lb] of [['pieces', 'Pieces'], ['stored', 'Stored' + (stored ? ' (' + stored + ')' : '')], ['look', 'Room look']]) { const b = el('button', ROOM.tab === id ? 'on' : ''); b.textContent = lb; b.onclick = () => { ROOM.tab = id; ROOM.refreshUI(); }; tabs.appendChild(b); } p.appendChild(tabs);
    const body = el('div', 'rp-body'); body.appendChild(ROOM.tab === 'pieces' ? piecesTab() : ROOM.tab === 'stored' ? storedTab() : lookTab()); p.appendChild(body); return p;
  }
  function holdBox() {
    const h = ROOM.held, d = defOf(h.it), b = el('div', 'rp-hold'), t = el('div', 'hn'); t.textContent = (h.from ? 'Moving: ' : 'Placing: ') + d.name; b.appendChild(t);
    const row = el('div', 'hb'); if (!isWall(d)) row.appendChild(btn('ghost', 'Turn (R)', rotateHeld)); row.appendChild(btn('ghost', h.from ? 'Remove (Del)' : 'Drop (Del)', deleteHeld)); row.appendChild(btn('ghost', 'Cancel (Esc)', cancelHeld)); b.appendChild(row);
    const sw = el('div', 'rp-sw'); const d0 = el('button', 'sw none' + (h.it.c ? '' : ' on')); d0.title = 'Original colour'; d0.onclick = () => ROOM.retint(null); sw.appendChild(d0);
    for (const c of TINTS) { const s = el('button', 'sw' + (h.it.c === c ? ' on' : '')); s.style.background = c; s.onclick = () => ROOM.retint(c); sw.appendChild(s); } b.appendChild(sw);
    if (d.parts.some(x => x.edit && x.t === 'text')) { const i = document.createElement('input'); i.type = 'text'; i.maxLength = 24; i.value = h.it.txt || ''; i.placeholder = 'Words on the wall'; i.oninput = () => ROOM.retext(i.value); i.onkeydown = e => { e.stopPropagation(); if (e.key === 'Escape') i.blur(); }; b.appendChild(i); }
    return b;
  }
  function piecesTab() {
    const w = el('div'), chips = el('div', 'rp-cats');
    for (const [id, lb] of CATS) { const c = el('button', ROOM.cat === id ? 'on' : ''); c.textContent = lb; c.onclick = () => { ROOM.cat = id; ROOM.refreshUI(); }; chips.appendChild(c); } w.appendChild(chips);
    const grid = el('div', 'rp-grid'), kit = ROOM.doc.theme, ids = Object.keys(SPACE.PIECES).filter(id => { const d = SPACE.PIECES[id]; return (d.kit === 'stock' || d.kit === 'shop' || d.kit === kit) && usable(d) && (ROOM.cat === 'all' || d.cat === ROOM.cat); });
    for (const id of ids) {
      const d = SPACE.PIECES[id], tile = el('button', 'tile'), im = document.createElement('img'), nm = el('span'); nm.textContent = d.name; im.alt = ''; tile.appendChild(im); tile.appendChild(nm);
      if (d.kit !== 'stock') tile.classList.add('kit'); const lock = lockedFor(d); if (lock) { tile.classList.add('locked'); tile.title = lock; tile.style.opacity = '0.45'; nm.textContent = d.name + ' · ' + lock; } tile.onclick = () => ROOM.hold(id); thumb(id, im); grid.appendChild(tile);
    }
    w.appendChild(grid); if (!ids.length) w.appendChild(el('div', 'rp-note', 'Nothing in this group for this theme.')); return w;
  }
  // the pieces that no longer fit a room (it shrank, or the budget fell) or came with an old Home: kept for the wallet, placed again from here
  function storedTab() {
    const w = el('div'), inv = typeof VENUE !== 'undefined' ? VENUE.inv : null;
    if (!inv) { w.appendChild(el('div', 'rp-note', 'Loading your inventory…')); if (typeof VENUE !== 'undefined') VENUE.loadInventory(); return w; }
    if (!inv.items.length) { w.appendChild(el('div', 'rp-note', 'Nothing stored. Pieces that no longer fit a room (a smaller room, a lower tier) are kept here, never lost.')); return w; }
    w.appendChild(el('div', 'rp-note', 'Safe in your inventory. Click a piece to place it again.'));
    const grid = el('div', 'rp-grid');
    for (const it of inv.items) {
      const d = SPACE.PIECES[it.p]; if (!d) continue;
      const tile = el('button', 'tile stored'), im = document.createElement('img'), nm = el('span'); nm.textContent = d.name; im.alt = ''; tile.appendChild(im); tile.appendChild(nm);
      if (it.locked) { tile.classList.add('locked'); tile.title = 'Safe in your inventory. Needs a Chog to place.'; nm.textContent = d.name + ' · needs a Chog'; }
      tile.onclick = () => (it.locked ? toast('Safe in your inventory. Needs a Chog to place.') : ROOM.hold(it.p, { c: it.c, txt: it.txt, item: it })); thumb(it.p, im); grid.appendChild(tile);
    }
    w.appendChild(grid); return w;
  }
  function lookTab() {
    const w = el('div'), doc = ROOM.doc, sect = t => { const h = el('h4'); h.textContent = t; w.appendChild(h); };
    const plain = (ROOM.kind === 'venue' && !(ROOM.venue && ROOM.venue.free)) || ROOM.kind === 'facade'; if (!plain) sect('Name'); const nm = document.createElement('input'); nm.type = 'text'; nm.maxLength = 32; nm.value = doc.name || ''; nm.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') nm.blur(); }; nm.onchange = () => { doc.name = nm.value.trim() || 'My Room'; touch(); ROOM.refreshUI(); }; if (!plain) w.appendChild(nm);
    sect('Theme'); const th = el('div', 'rp-opts'); for (const k of Object.keys(SPACE.THEMES)) { const b = el('button', doc.theme === k ? 'on' : ''); b.textContent = SPACE.THEMES[k].name; b.onclick = look(() => { doc.theme = k; }); th.appendChild(b); } w.appendChild(th);
    const fac = ROOM.kind === 'facade'; if (!fac) sect('Window view'); const am = el('div', 'rp-opts'); for (const k of ['', ...Object.keys(SPACE.VIEWS)]) { const b = el('button', (doc.view || '') === k ? 'on' : ''); b.textContent = k ? SPACE.VIEWS[k].name : 'Real time'; b.onclick = look(() => { if (k) doc.view = k; else delete doc.view; }); am.appendChild(b); } if (!fac) w.appendChild(am);
    const lt = el('div', 'rp-note'); lt.textContent = fac ? 'A wall colour or pattern becomes a panel on the hall wall around your door; a floor one becomes a mat in front of it.' : 'The view is only what you see through the windows. The room is lit by the lights you place.'; w.appendChild(lt);
    for (const [key, lb, pats, defC] of [['wall', 'Wall', SPACE.PATTERNS.wall, SPACE.theme.pal.wall], ['floor', 'Floor', SPACE.PATTERNS.floor, SPACE.theme.pal.floor]]) {
      sect(lb); const row = el('div', 'rp-row'), cur = doc[key] || {}, ci = document.createElement('input'); ci.type = 'color'; ci.value = cur.c || '#' + new THREE.Color(defC).getHexString();
      ci.onchange = look(() => { doc[key] = Object.assign({}, doc[key], { c: ci.value }); }); row.appendChild(ci);
      const sel = document.createElement('select'); sel.appendChild(new Option('Theme default', '')); for (const pt of pats) sel.appendChild(new Option(pt[0].toUpperCase() + pt.slice(1), pt)); sel.value = cur.pat || '';
      sel.onchange = look(() => { const o = Object.assign({}, doc[key]); if (sel.value) o.pat = sel.value; else delete o.pat; doc[key] = o; }); row.appendChild(sel);
      const rs = el('button', 'btn ghost'); rs.textContent = 'Reset'; rs.onclick = look(() => { delete doc[key]; }); row.appendChild(rs); w.appendChild(row);
    }
    const wl = el('label', 'rp-check'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = doc.windows !== false; cb.onchange = look(() => { if (cb.checked) delete doc.windows; else doc.windows = false; });
    wl.appendChild(cb); wl.appendChild(document.createTextNode(' Windows')); if (!fac) w.appendChild(wl);
    if (!fac) {                                                                                  // ready-made rooms: a starting point laid out for this floor (js/space_layouts.js)
      sect('Ready-made rooms'); const rd = el('div', 'rp-opts');
      for (const id of SPACE.READY_ORDER) {
        const R = SPACE.READY[id], b = el('button'); b.textContent = R.name; b.title = R.cat + ': ' + R.desc;
        b.onclick = () => {
          if (ROOM.doc.pieces.length && !b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Replace the room?'; setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = R.name; } }, 3000); return; }
          const [W, D] = dims(), d = R.make(W, D, { stairs: !!SPACE.stairs }); d.name = ROOM.doc.name || d.name; d.pieces = d.pieces.slice(0, limitNow()); ROOM.doc = d; touch(); rebuild(); ROOM.refreshUI(); if (typeof render === 'function') render();
        };
        rd.appendChild(b);
      }
      w.appendChild(rd); w.appendChild(el('div', 'rp-note', 'Fills the room with a layout made for this floor. It replaces what is there now; every piece can still be moved or removed.'));
    }
    const rs = btn('ghost', 'Start over', () => { if (rs.dataset.sure) { ROOM.doc = fac ? facadeStarter() : SPACE.starterRoom(); touch(); rebuild(); ROOM.refreshUI(); } else { rs.dataset.sure = 1; rs.textContent = 'Click again to empty the room'; } }); rs.classList.add('wide'); w.appendChild(rs);
    return w;
  }

  // ------------------------------------------------------------------ minimap of the room (same tilt as the town's)
  ROOM.drawMap = function (cv) {
    const S = cv.width, g = cv.getContext('2d'), [RW, RD] = dims(), R = Math.SQRT1_2, k = S / ((RW + RD) * R + 2), neon = UI.skin === 'neon';
    const Pm = (x, z) => [S / 2 + (x - z) * R * k, S / 2 + (x + z) * R * k]; g.clearRect(0, 0, S, S);
    const rect = (x, z, hw, hd, col) => { g.beginPath(); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b], i) => { const [px, py] = Pm(x + a * hw, z + b * hd); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fillStyle = col; g.fill(); };
    rect(0, 0, RW / 2, RD / 2, neon ? '#5a4a86' : '#e6d8c6');
    for (const e of SPACE.placed) { if (isWall(e.def)) continue; const r = rectOf(e.it, e.def); rect(r.x, r.z, r.hw, r.hd, isFlat(e.def) ? (neon ? '#6a5a9a' : '#cdbba4') : (neon ? '#8a6ac8' : '#a58a6e')); }
    const ex = exitSpot(), [dx, dy] = Pm(ex.x, ex.z + 0.2); g.fillStyle = '#ffd84a'; g.fillRect(dx - 4, dy - 4, 8, 8);
    for (const r of NET.remotes.values()) if (r.root) { const [a, b] = Pm(r.root.position.x, r.root.position.z); g.beginPath(); g.arc(a, b, 3, 0, 7); g.fillStyle = '#7ad89a'; g.strokeStyle = '#1a0a2e'; g.lineWidth = 1.2; g.fill(); g.stroke(); }
    if (GAME.me) { const [a, b] = Pm(GAME.me.position.x, GAME.me.position.z), ry = GAME.me.rotation.y, ddx = Math.sin(ry), ddz = Math.cos(ry), [ex2, ey] = [(ddx - ddz) * R, (ddx + ddz) * R];
      g.save(); g.translate(a, b); g.rotate(Math.atan2(ey, ex2) + Math.PI / 2); g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(0, 2); g.lineTo(-5, 5); g.closePath(); g.fillStyle = '#ffd84a'; g.strokeStyle = '#1a0a2e'; g.lineWidth = 2; g.stroke(); g.fill(); g.restore(); }
  };

  // ------------------------------------------------------------------ start-up options: ?room=mine opens your temporary room (old Home links ?room=<wallet address> now only say that Homes are Hotel rooms)
  const q = QS.get('room');
  if (q) (async () => { for (let i = 0; i < 60 && (NET.status !== 'online' && q !== 'mine'); i++) await new Promise(r => setTimeout(r, 500)); await WALLET.dataReady; if (q === 'mine') enterSolo(); else if (/^0x[0-9a-fA-F]{40}$/.test(q)) toast('Homes are Hotel rooms now. Find that room in the Hotel directory.'); })();
})();
