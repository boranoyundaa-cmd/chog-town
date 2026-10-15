// ===== first steps: the waypoint over the Hotel door, the checklist card, the guided walk ("Show me around") and the big map (key M) =====
// One goal on screen from the first frame: enter the Chog Hotel. The checklist ticks itself (it only watches HOTEL, GAMES, ROOM and localStorage) and every item can walk you there.
// Auto-walks use GAME.walkTo with the existing A* (game.js); over about 20 m the player runs (GAME.runMul). Nothing teleports. State lives in localStorage ('chog_first'), always in try/catch.
// Loaded after tour.js, before audio_wire.js. Texts are English. Names here start with FS/FIRST because every script shares one global scope.
const FIRST = { st: { done: {}, collapsed: false, closed: false }, target: null, ui: null, map: null };
(function () {
  const KEY = 'chog_first';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(FIRST.st)); } catch (e) { /* ignore */ } };
  const saved = load(); if (saved) Object.assign(FIRST.st, saved);
  if (!FIRST.st.done) FIRST.st.done = {};
  if (QS.has('steps')) FIRST.st = { done: {}, collapsed: false, closed: false };                  // ?steps=1 shows the checklist again (testing)
  if (QS.has('room')) FIRST.st.closed = true;                                                      // an invite link: the visitor came for a room, not for the checklist
  const st = () => FIRST.st;
  const outside = () => !(typeof ROOM !== 'undefined' && ROOM.active) && !(typeof HOTEL !== 'undefined' && (HOTEL.active || HOTEL.away));
  const saySafe = (r, text) => { if (r && r.plate && typeof PLATES !== 'undefined') PLATES.say(r.plate, text); };

  // ---------- places in the town (walk points are on the pavement in front of the doors)
  const bld = n => CITY.buildings.find(b => b.name === n);
  const front = (n, dx) => { const b = bld(n); return b ? { x: b.x + dx, z: b.z + b.d / 2 + 0.8 } : null; };
  const side = (n) => { const b = bld(n); return b ? { x: b.x + b.w / 2 + 1.2, z: b.z } : null; };       // the west row faces east
  const hd = CITY.doors.hotel, hm = CITY.doors.home;
  // id, label on the map, walk point, height of the waypoint above the ground, a longer note for the map tooltip, dy: label offset on the map in pixels
  const PLACES = [
    { id: 'hotel', label: 'Chog Hotel', at: { x: hd.x, z: hd.out }, y: 2.7, dy: -26 },
    { id: 'gallery', label: 'Gallery · Daily Chog', at: front('Gallery', 1.2), y: 2.6, dy: -26 },
    { id: 'nova', label: 'NOVA Club', at: front('NOVA Club', -0.9), y: 2.8, dy: -26 },
    { id: 'moka', label: 'Moka & Co', at: side('Moka & Co'), y: 2.6, dy: -26 },
    { id: 'bakery', label: 'Bakery', at: side('Bakery'), y: 2.6, dy: -26 },
    { id: 'arcade', label: 'Arcade', at: front('Arcade', -0.8), y: 2.8, dy: 26 },
    { id: 'plaza', label: 'Chog Plaza', at: { x: -6, z: -6 }, y: 1.2, dy: -22, noWp: true },
    { id: 'park', label: 'Lantern Park', at: { x: -12.75, z: 18 }, y: 1.2, dy: -22, noWp: true },
    { id: 'home', label: 'Your Home', at: { x: hm.x, z: hm.out }, y: 2.6, dy: 26 },
  ].filter(p => p.at);
  const PL = {}; for (const p of PLACES) PL[p.id] = p;

  // ---------- checklist items: label, where to go (a point, or a function for a resident who moves), what to say on arrival
  const nearestResident = () => {
    if (typeof NPC === 'undefined' || !GAME.me) return null; let best = null, bd = 1e9; const me = GAME.me.position;
    for (const r of NPC.list) { if (!r.c || !r.show || r.f < 0.9 || !r.w || r.w.inside || /Guard/i.test(r.role || '')) continue; const d = Math.hypot(r.c.position.x - me.x, r.c.position.z - me.z); if (d < bd) { bd = d; best = r; } }
    return best;
  };
  // The checklist as data: text (the label), check (polled; true = done) and go (where a click walks). Retarget an item by editing its entry only.
  const placed0 = typeof ROOM !== 'undefined' ? ROOM.placedCount || 0 : 0, FSCHALLENGED = { v: false };
  const dailySolved = () => { try { const j = JSON.parse(localStorage.getItem('chog_games') || '{}'); return !!(j.daily && j.daily.solved); } catch (e) { return false; } };
  const played = () => { try { const j = JSON.parse(localStorage.getItem('chog_games') || '{}'); return Object.keys(j.played || {}).length > 0; } catch (e) { return false; } };
  const ITEMS = [
    { id: 'hotel', text: 'Check in at the Chog Hotel', check: () => typeof HOTEL !== 'undefined' && HOTEL.active, go: () => ({ place: 'hotel', arrive: 'Press E at the door to go in.' }) },
    { id: 'challenge', text: 'Challenge a resident', check: () => FSCHALLENGED.v, go: () => { const r = nearestResident(); return r ? { dyn: r, label: r.name, y: 2.6, arrive: 'Click ' + r.name + ', then Challenge.' } : { place: 'plaza' }; } },
    { id: 'daily', text: 'Solve today\'s Daily Chog', check: () => dailySolved(), go: () => ({ place: 'gallery', arrive: 'Step to the door to play the Daily Chog.' }) },
    { id: 'game', text: 'Play a mini-game', check: () => (typeof GAMES !== 'undefined' && !!(GAMES.match || (GAMES.open && ['stack', 'rhythm', 'daily'].includes(GAMES.open.id)))) || played(), go: () => ({ place: 'arcade', arrive: 'Step to the door to play Stack the luggage.' }) },
    { id: 'home', text: 'Decorate your Home', check: () => typeof ROOM !== 'undefined' && ROOM.active && ROOM.mine && (ROOM.placedCount || 0) > placed0, go: () => ({ place: 'home', arrive: 'Press E at the glowing door, then B to decorate.' }) },
  ];
  const doneCount = () => ITEMS.filter(i => st().done[i.id]).length;
  function mark(id) {
    if (st().done[id]) return; st().done[id] = true; store();
    const it = ITEMS.find(x => x.id === id); if (it && typeof toast === 'function' && !(FIRST.tour && FIRST.tour.quiet)) toast('✓ ' + it.text);
    if (FIRST.target && FIRST.target.id === id) FIRST.target = null;
    if (doneCount() === ITEMS.length) { setTimeout(() => { if (typeof toast === 'function') toast('First steps done. You know your way around.'); st().closed = true; store(); FIRST.refresh(); }, 2600); }
    FIRST.refresh();
  }
  FIRST.mark = mark;

  // ---------- the checklist card (a persistent element, re-attached by ui.js render())
  FIRST.hud = function () { if (!FIRST.ui) { FIRST.ui = el('div', 'stepswrap'); FIRST.refresh(); } return FIRST.ui; };
  FIRST.refresh = function () {
    const u = FIRST.ui; if (!u) return; u.innerHTML = ''; if (st().closed) { u.style.display = 'none'; return; } u.style.display = '';
    const card = el('div', 'steps card hit' + (st().collapsed ? ' min' : '')), head = el('div', 'sh'), n = doneCount();
    head.innerHTML = `<b>First steps</b><span class="n">${n}/${ITEMS.length}</span>`;
    const mn = el('button', 'sx', st().collapsed ? '+' : '–'); mn.title = st().collapsed ? 'Show the list' : 'Hide the list'; mn.onclick = () => { st().collapsed = !st().collapsed; store(); FIRST.refresh(); };
    const cl = el('button', 'sx', '×'); cl.title = 'Close (Settings brings it back)'; cl.onclick = () => { st().closed = true; store(); FIRST.refresh(); };
    head.appendChild(mn); head.appendChild(cl); card.appendChild(head);
    if (!st().collapsed) {
      const ul = el('div', 'sl');
      for (const it of ITEMS) {
        const d = !!st().done[it.id], b = el('button', 'si' + (d ? ' done' : '') + (FIRST.target && FIRST.target.id === it.id ? ' on' : ''), `<i>${d ? '✓' : ''}</i><span></span>`);
        b.lastChild.textContent = it.text; b.title = d ? 'Done' : 'Show me where'; b.onclick = () => FIRST.goTo(it.id); ul.appendChild(b);
      }
      card.appendChild(ul);
    }
    u.appendChild(card);
  };
  FIRST.reopen = () => { st().closed = false; st().collapsed = false; if (doneCount() === ITEMS.length) st().done = {}; store(); FIRST.refresh(); };

  // ---------- walking somewhere on purpose: sets the waypoint and walks (runs when far)
  function walkPoint(p, run) { GAME.walkTo(p.x, p.z, false, run !== false); }
  FIRST.goTo = function (id) {
    if (!outside()) { if (typeof toast === 'function') toast('Step outside first.'); return; }
    const it = ITEMS.find(x => x.id === id); if (!it || !GAME.me) return; const g = it.go(), pl = g.place ? PL[g.place] : null;
    const pos = g.dyn ? g.dyn.c.position : pl.at;
    FIRST.target = { id, x: pos.x, z: pos.z, y: g.y || pl.y, label: g.label || pl.label, dyn: g.dyn || null, arrive: g.arrive || '' };
    walkPoint(pos); FIRST.refresh();
  };
  FIRST.goPlace = function (id) {                                                                  // from the map
    if (!outside()) return; const p = PL[id]; if (!p || !GAME.me) return;
    FIRST.target = p.noWp ? null : { id: 'place:' + id, x: p.at.x, z: p.at.z, y: p.y, label: p.label, arrive: '' };
    walkPoint(p.at); FIRST.refresh();
    if (typeof toast === 'function') toast('On the way to ' + p.label);
  };

  // ---------- the waypoint: a small soft pill over the target, bobbing a little; it clamps to the screen edge with a chevron when the target is off screen
  const wp = document.createElement('div'); wp.id = 'fswp'; wp.style.display = 'none'; wp.innerHTML = '<b></b><i></i>';
  document.body.insertBefore(wp, document.getElementById('ui'));
  const v = new THREE.Vector3(); let wpLabel = '';
  const active = () => { if (FIRST.target) return FIRST.target; if (!st().done.hotel) return { id: 'hotel', x: hd.x, z: hd.z, y: 2.7, label: 'Chog Hotel', home: true }; return null; };

  // ---------- detecting the items (cheap polling; the games keep their own state)
  let pollT = 0;
  const wrapNpc = () => {                                                                           // "Challenge a resident": a match started with a named resident
    if (typeof GAMES === 'undefined' || !GAMES.vsNpc || GAMES.vsNpc.fs) return; const o = GAMES.vsNpc;
    GAMES.vsNpc = function (game, npc) { if (npc) { FSCHALLENGED.v = true; mark('challenge'); } return o.apply(this, arguments); }; GAMES.vsNpc.fs = true;
  };

  animated.push((t, dt) => {
    if (!GAME.me) return; wrapNpc();
    pollT -= dt; if (pollT < 0) { pollT = 0.25; for (const it of ITEMS) if (!st().done[it.id] && it.check()) mark(it.id); }
    // the waypoint
    const tg = active(), me = GAME.me.position;
    if (FIRST.tour || !tg || !outside()) { if (wp.style.display !== 'none') wp.style.display = 'none'; if (FIRST.target && !outside()) FIRST.target = null; }
    else {
      let tx = tg.x, tz = tg.z; if (tg.dyn && tg.dyn.c) { tx = tg.dyn.c.position.x; tz = tg.dyn.c.position.z; }
      const d = Math.hypot(me.x - tx, me.z - tz);
      if (FIRST.target && d < 2.4) {                                                              // arrived
        if (FIRST.target.arrive && typeof toast === 'function') toast(FIRST.target.arrive);
        FIRST.target = null; FIRST.refresh();
      }
      if (!FIRST.target && !tg.home) { wp.style.display = 'none'; }
      else if (d < 2.4 && tg.home) { wp.style.display = 'none'; }
      else {
        if (tg.label !== wpLabel) { wpLabel = tg.label; wp.firstChild.textContent = tg.label; }
        v.set(tx, tg.y, tz).project(cam);
        const W = innerWidth, H = innerHeight, x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H, m = 70, top = 100, bot = 180;
        const off = x < m || x > W - m || y < top || y > H - bot, cx = Math.max(m, Math.min(W - m, x)), cy = Math.max(top, Math.min(H - bot, y));
        const ch = wp.lastChild; ch.style.transform = off ? `rotate(${(Math.atan2(y - cy, x - cx) * 180 / Math.PI - 90).toFixed(0)}deg)` : 'rotate(180deg)';
        const bob = Math.sin(performance.now() / 420) * 4, sc = Math.max(0.8, Math.min(1.5, H / 810));
        wp.style.transform = `translate(${cx.toFixed(0)}px, ${(cy + (off ? 0 : -16) + bob).toFixed(0)}px) translate(-50%, -100%) scale(${sc})`;
        wp.style.display = 'flex';
      }
    }
    // the card sits under the checklist
    const tw = typeof TOUR !== 'undefined' ? TOUR.ui : null, sw = FIRST.ui;
    if (tw && sw) { const h = sw.style.display === 'none' ? 0 : sw.offsetHeight + 10; const want = (100 + h) + 'px'; if (tw.style.top !== want) tw.style.top = want; }
    tick(dt);
  });

  // ---------- "Show me around": the guide walks you to the Hotel door, says a line or two on the way, then points out the rest
  function pathLen(p, x, z) { let L = 0; for (const q of p) { L += Math.hypot(q[0] - x, q[1] - z); x = q[0]; z = q[1]; } return L; }
  FIRST.startTour = function (r) {
    if (FIRST.tour || !GAME.me || !outside() || !r || !r.c) return;
    const gx = r.c.position.x, gz = r.c.position.z, stop = [hd.x - 1.5, hd.out], path = findPath(gx, gz, stop[0], stop[1]);
    FIRST.reopen(); FIRST.target = null;
    FIRST.tour = { r, path, pos: { x: gx, z: gz, ry: r.ry || 0 }, phase: 'lead', t: 0, total: Math.max(1, pathLen(path, gx, gz)), left: 0, said: 0, wait: 0, quiet: false };
    NPC.escort = { r, w: { x: gx, z: gz, ry: r.ry || 0, moving: false, inside: false, place: null } };
    GAME.walkTo(hd.x, hd.out, false, false);
    saySafe(r, 'Follow me. First stop: the Chog Hotel.');
  };
  function stepAlong(tr, sp) {
    const q = tr.path[0]; if (!q) return false; const dx = q[0] - tr.pos.x, dz = q[1] - tr.pos.z, L = Math.hypot(dx, dz);
    if (L < 0.12) { tr.path.shift(); return tr.path.length > 0; }
    const k = Math.min(1, sp / L); tr.pos.x += dx * k; tr.pos.z += dz * k; tr.pos.ry = Math.atan2(dx, dz); tr.left += L * k; return true;
  }
  function endTour() { FIRST.tour = null; if (typeof NPC !== 'undefined') NPC.escort = null; }
  function tick(dt) {
    const tr = FIRST.tour; if (!tr) return;
    if (!outside() || !NPC.group.visible) { endTour(); return; }                                  // they went inside: the guide just goes back to his post
    const me = GAME.me.position, e = NPC.escort.w, dp = Math.hypot(me.x - tr.pos.x, me.z - tr.pos.z); tr.t += dt;
    let moving = false;
    if (tr.phase === 'lead') {
      if (tr.path.length) {
        if (dp < 5) { moving = stepAlong(tr, 3.5 * dt); tr.wait = 0; }
        else { tr.wait += dt; tr.pos.ry = Math.atan2(me.x - tr.pos.x, me.z - tr.pos.z); if (tr.wait > 6) { tr.wait = 0; saySafe(tr.r, 'This way!'); } }
        if (!tr.said && tr.left > tr.total * 0.5) { tr.said = 1; saySafe(tr.r, 'Everyone ends up at the Hotel sooner or later.'); }
        if (tr.t > 150 || dp > 40) { tr.phase = 'back'; tr.path = null; }
      } else {
        tr.pos.ry = Math.atan2(me.x - tr.pos.x, me.z - tr.pos.z);
        if (Math.hypot(me.x - hd.x, me.z - hd.out) < 4) { tr.phase = 'point'; tr.t = 0; saySafe(tr.r, 'Here we are. Press E at the door to go in.'); }
        else if (tr.t > 150) { tr.phase = 'back'; tr.path = null; }
      }
    } else if (tr.phase === 'point') {
      tr.pos.ry = Math.atan2(me.x - tr.pos.x, me.z - tr.pos.z);
      if (tr.t > 2.6 && tr.said < 2) { tr.said = 2; if (typeof toast === 'function') toast('Arcade: stack the luggage · Gallery: the Daily Chog · R: your free Home'); }
      if (tr.t > 4.6 && tr.said < 3) { tr.said = 3; saySafe(tr.r, 'The Arcade is east, the Gallery west. gm. Come find me if you get lost.'); }
      if (tr.t > 9) { tr.phase = 'back'; tr.path = null; }
    }
    if (tr.phase === 'back') {
      if (!tr.path) { const keep = NPC.escort; NPC.escort = null; const w = NPC.where(tr.r.id, NPC.now() % 86400); NPC.escort = keep; tr.home = w ? [w.x, w.z] : [tr.pos.x, tr.pos.z]; tr.path = findPath(tr.pos.x, tr.pos.z, tr.home[0], tr.home[1]); tr.t = 0; }
      moving = stepAlong(tr, 3.0 * dt);
      if (!moving || tr.t > 60) { endTour(); return; }
    }
    e.x = tr.pos.x; e.z = tr.pos.z; e.ry = tr.pos.ry; e.moving = moving;
  }

  // ---------- the big map (key M, the Map button, a click on the minimap): the whole town, named places, a click walks there
  const wrap = document.createElement('div'); wrap.id = 'fsmap';
  wrap.innerHTML = '<div class="box"><div class="mh"><b>Town map</b><small>Click a place to walk there</small><button class="mx" title="Close (M)">×</button></div><canvas></canvas></div>';
  document.body.appendChild(wrap);
  const cv = wrap.querySelector('canvas'), tip = { id: null }; let hits = [];
  const size = () => Math.round(Math.max(360, Math.min(innerHeight * 0.74, innerWidth * 0.8, 760)));
  function drawMap() {
    if (!wrap.classList.contains('open')) return; const S = size() * 2; if (cv.width !== S) { cv.width = cv.height = S; cv.style.width = cv.style.height = S / 2 + 'px'; }
    drawMinimap(cv, true);
    const g = cv.getContext('2d'), k = S / 92, R = Math.SQRT1_2, P = (x, z) => [S / 2 + (x - z) * R * k, S / 2 + (x + z) * R * k], fs = Math.round(S / 48);
    g.font = `700 ${fs}px "Fredoka", "Nunito", sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'center'; hits = [];
    const neon = typeof UI !== 'undefined' && UI.skin === 'neon';
    for (const p of PLACES) {
      const [x, y] = P(p.at.x, p.at.z), w = g.measureText(p.label).width + fs * 1.2, h = fs * 1.7, lx = x, ly = y + p.dy * (S / 1500) * 2, hot = tip.id === p.id, tg = FIRST.target && FIRST.target.id === (p.id === 'hotel' ? 'hotel' : 'place:' + p.id);
      g.beginPath(); g.moveTo(x, y); g.lineTo(lx, ly); g.strokeStyle = neon ? '#7ae8ff' : '#5a24a8'; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(x, y, fs * 0.28, 0, 7); g.fillStyle = neon ? '#ff5ab8' : '#7a3ac8'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
      g.beginPath(); g.roundRect ? g.roundRect(lx - w / 2, ly - h / 2, w, h, h / 2) : g.rect(lx - w / 2, ly - h / 2, w, h);
      g.fillStyle = hot ? (neon ? '#ff5ab8' : '#7a3ac8') : neon ? 'rgba(20,10,44,.92)' : '#fffaf3'; g.fill(); g.lineWidth = tg ? 4 : 2; g.strokeStyle = tg ? '#ffc23a' : neon ? '#7ae8ff' : 'rgba(58,36,96,.35)'; g.stroke();
      g.fillStyle = hot ? '#fff' : neon ? '#f2eaff' : '#2b2140'; g.fillText(p.label, lx, ly + 1);
      hits.push({ id: p.id, x0: lx - w / 2, x1: lx + w / 2, y0: ly - h / 2, y1: ly + h / 2 });
    }
  }
  const at = e => { const r = cv.getBoundingClientRect(), f = cv.width / r.width; return { x: (e.clientX - r.left) * f, y: (e.clientY - r.top) * f }; };
  const hitAt = e => { const q = at(e); return hits.find(h => q.x >= h.x0 && q.x <= h.x1 && q.y >= h.y0 && q.y <= h.y1) || null; };
  cv.addEventListener('pointermove', e => { const h = hitAt(e); tip.id = h ? h.id : null; cv.style.cursor = h ? 'pointer' : 'default'; });
  cv.addEventListener('click', e => { const h = hitAt(e); if (h) { FIRST.toggleMap(false); FIRST.goPlace(h.id); } });
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.classList.contains('mx')) FIRST.toggleMap(false); });
  FIRST.toggleMap = function (on) {
    const open = on === undefined ? !wrap.classList.contains('open') : on;
    if (open && !outside()) { if (typeof toast === 'function') toast('The map shows the town. Step outside first.'); return; }
    wrap.classList.toggle('open', open); if (open) { closeOtherPanels('map'); drawMap(); }
  };
  setInterval(drawMap, 120);
  addEventListener('keydown', e => { if (e.code === 'Escape' && wrap.classList.contains('open')) FIRST.toggleMap(false); });
  addEventListener('resize', () => { if (wrap.classList.contains('open')) drawMap(); });
})();
