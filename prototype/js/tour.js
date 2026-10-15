// ===== tour: first-visit tips =====
// Light, skippable, shown once. Five short cards that follow what the player actually does (walk, find the door, decorate, place something, save),
// plus a pin on the Hotel door when it is out of sight. Progress and "done" live in localStorage; Settings can show the tips again.
// Loaded after room.js and ui.js. Nothing here changes the game: it only reads GAME, ROOM and WALLET.
const TOUR = { ui: null, cur: -1, f: {}, done: false, hidden: false };
(function () {
  const KEY = 'chog_tour';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify({ done: TOUR.done, f: TOUR.f })); } catch (e) { /* ignore */ } };
  const saved = load(); if (saved) { TOUR.done = !!saved.done; TOUR.f = saved.f || {}; }
  if (QS.has('tour')) { TOUR.done = false; TOUR.f = {}; }                                    // ?tour=1 forces the tips (testing)
  if (QS.has('room')) TOUR.done = true;                                                        // an invite link: the visitor came for a room, not for the tips

  const CARDS = [
    { t: 'Welcome to Chog Hotel', b: 'Click the ground, or use WASD, to walk around.' },
    { t: 'You have a free room', b: 'Walk into the Chog Hotel (press E at its door) and talk to Lev at the desk. He checks you in and hands you a key. It is free.' },
    { t: 'Make it yours', b: 'Press B, or the Decorate button, to start decorating.' },
    { t: 'Place something', b: 'Pick a piece on the right, then click a spot in the room. Click a piece in the room to move it.' },
    { t: 'Keep it', b: () => (WALLET.account ? 'Press Save and sign in your wallet (free). Your room is open to visitors unless you lock the door.' : 'Connect a wallet to keep your room on the server. Without one it stays on this device.') },
  ];
  if (typeof CULTURE !== 'undefined' && CULTURE.ui.tour) {                                    // the card texts come from culture_data.js (a short how-to stays at the end where the joke would hide it)
    const HINT = ['', ' Press E at the Hotel door, then talk to Lev.', ' Press B, or the Decorate button.', ' Click a piece in the room to move it.', null];
    CULTURE.ui.tour.forEach((x, i) => { const c = CARDS[i]; if (!c) return; c.t = x.title; if (i === 4) { const orig = c.b; c.b = () => x.text + ' ' + orig(); } else c.b = x.text + HINT[i]; });
  }

  // which card fits what the player has done so far; null = nothing to show right now
  function want() {
    const f = TOUR.f, inRoomNow = ROOM.active && ROOM.mine;
    if (!f.walked) return 0;
    if (!f.entered) return 1;
    if (!f.edited) return inRoomNow ? 2 : 1;
    if (!f.placed) return inRoomNow ? (ROOM.mode === 'edit' ? 3 : 2) : 1;
    return inRoomNow ? 4 : null;
  }
  function finish(msg) { TOUR.done = true; store(); if (msg && typeof toast === 'function') toast(msg); TOUR.refresh(); }
  TOUR.skip = () => finish();
  TOUR.restart = () => { TOUR.done = false; TOUR.f = {}; start = null; store(); TOUR.refresh(); };

  // ---- the card (persistent element, re-attached by ui.js render())
  TOUR.hud = function () { if (!TOUR.ui) { TOUR.ui = el('div', 'tourwrap'); TOUR.refresh(); } return TOUR.ui; };
  TOUR.refresh = function () {
    const u = TOUR.ui; if (!u) return; u.innerHTML = ''; if (TOUR.done || TOUR.cur == null || TOUR.cur < 0) return;
    const c = CARDS[TOUR.cur], card = el('div', 'tour card hit'), t = el('b'), p = el('p'), dots = el('div', 'dots'), sk = el('button', 'sk', 'Skip tips');
    t.textContent = c.t; p.textContent = typeof c.b === 'function' ? c.b() : c.b; sk.onclick = () => TOUR.skip();
    for (let i = 0; i < CARDS.length; i++) dots.appendChild(el('i', i === TOUR.cur ? 'on' : i < TOUR.cur ? 'past' : ''));
    const foot = el('div', 'foot'); foot.appendChild(dots); foot.appendChild(sk);
    card.appendChild(t); card.appendChild(p); card.appendChild(foot); u.appendChild(card);
  };

  // ---- the pin that points at the door of the Hotel
  const pin = document.createElement('div'); pin.id = 'tourpin'; pin.style.display = 'none'; pin.innerHTML = '<span class="arr">▲</span><b>Chog Hotel</b>';
  document.body.insertBefore(pin, document.getElementById('ui'));
  const v = new THREE.Vector3(), DOOR = [CITY.doors.hotel.x, 2.7, CITY.doors.hotel.z];

  let start = null, lastCard = -2, lastBody = '', placed0 = ROOM.placedCount || 0;
  animated.push(() => {
    if (TOUR.done || !GAME.me) { if (pin.style.display !== 'none') pin.style.display = 'none'; return; }
    const inHotel = typeof HOTEL !== 'undefined' && (HOTEL.active || HOTEL.away);
    const me = GAME.me.position, f = TOUR.f;
    if (!start) start = { x: me.x, z: me.z };
    if (!f.walked && !ROOM.active && !inHotel && Math.hypot(me.x - start.x, me.z - start.z) > 1.5) { f.walked = true; store(); }
    if (ROOM.active && ROOM.mine && !f.entered) { f.entered = true; f.walked = true; store(); }
    if (ROOM.active && ROOM.mine && ROOM.mode === 'edit' && !f.edited) { f.edited = true; f.entered = true; f.walked = true; store(); }
    if (ROOM.active && ROOM.mine && f.edited && !f.placed && ROOM.placedCount > placed0) { f.placed = true; store(); }
    if (f.placed && ROOM.savedAt && !ROOM.dirty) { finish('Nice room! You are all set. Anyone can visit it unless you lock the door.'); return; }
    if (f.placed && !ROOM.active) { finish(); return; }                                       // they left after decorating: the tips did their job
    const w = want(), body = w != null && typeof CARDS[w].b === 'function' ? CARDS[w].b() : '';
    if (w !== lastCard || body !== lastBody) { lastCard = w; lastBody = body; TOUR.cur = w; TOUR.refresh(); }
    // pin: only while the door is the next thing to find, and it is not already in front of the player
    let show = false;
    if (w === 1 && !ROOM.active && !inHotel && (typeof FIRST === 'undefined' || FIRST.st.closed)) {
      const d = Math.hypot(me.x - DOOR[0], me.z - DOOR[2]);
      if (d > 2.2) {
        show = true; v.set(DOOR[0], DOOR[1], DOOR[2]).project(cam);
        const W = innerWidth, H = innerHeight, x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H, m = 56, top = 110, bot = 170;
        const off = x < m || x > W - m || y < top || y > H - bot, cx = Math.max(m, Math.min(W - m, x)), cy = Math.max(top, Math.min(H - bot, y));
        const arr = pin.firstChild; if (off) arr.style.transform = `rotate(${(Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90).toFixed(0)}deg)`; else arr.style.transform = 'rotate(180deg)';
        const bob = Math.sin(performance.now() / 300) * 4, sc = Math.max(0.8, Math.min(1.6, H / 810));
        pin.style.transform = `translate(${cx.toFixed(0)}px, ${(cy + (off ? 0 : -28) + bob).toFixed(0)}px) translate(-50%, -50%) scale(${sc})`;
      }
    }
    pin.style.display = show ? 'flex' : 'none';
  });
})();
