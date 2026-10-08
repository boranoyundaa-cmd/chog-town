// ===== venue: your own venue in the Chog Hotel (docs/game/world.md) =====
// A holder activates a venue from the license (the server reads the wallet's Chogs on chain and gives the tier's room). It starts CLOSED: its door in the corridor
// shows "closed" and only the owner can walk in. The owner decorates it with the same editor as the Home (room.js, bigger budget), saves it (wallet signature) and
// presses "Open venue". This file holds the state the server reports (VENUE.info, VENUE.mine) and the card in the Venues window. Loaded after hotel.js.
const VENUE = { info: null, mine: null, busy: false, tried: false, draft: { name: '', cat: 'Lounge', desc: '' }, err: '' };
(function () {
  const CATS = ['Club', 'Café', 'Arcade', 'Gallery', 'Lounge', 'Spooky', 'Workshop', 'Other'];
  const RULES = [['public', 'Anyone'], ['holders', 'Chog holders only'], ['list', 'Guest list']];
  const redraw = () => { if (typeof render === 'function') render(); };
  VENUE.onMine = m => { VENUE.mine = m || null; if (typeof HOTEL !== 'undefined') HOTEL.mineId = m ? m.id : null; if (typeof ROOM !== 'undefined' && ROOM.refreshUI) ROOM.refreshUI(); redraw(); };
  VENUE.onInfo = m => { VENUE.info = { tier: m.tier, points: m.points, tokens: m.tokens, templates: m.templates }; VENUE.onMine(m.mine); };
  WALLET.on('account', () => { VENUE.info = null; VENUE.mine = null; VENUE.tried = false; if (typeof HOTEL !== 'undefined') HOTEL.mineId = null; });
  // ask the server (needs the wallet signed in); quiet when there is nothing to ask
  VENUE.refresh = async function () {
    if (VENUE.busy || !WALLET.account || NET.status !== 'online' || !NET.hotel) return;
    VENUE.busy = true; redraw();
    try { if (!await NET.authenticate()) return; NET.send({ t: 'venueinfo' }); await NET.waitFor(['venueinfo', 'roomfail'], 12000); } finally { VENUE.busy = false; redraw(); }
  };
  const call = async (msg, until) => { if (VENUE.busy) return null; VENUE.busy = true; VENUE.err = ''; redraw(); try { if (!await NET.authenticate()) return null; NET.send(msg); return await NET.waitFor(until, 12000); } finally { VENUE.busy = false; redraw(); } };
  VENUE.make = async function () {
    const r = await call({ t: 'venuemake', name: VENUE.draft.name, cat: VENUE.draft.cat, desc: VENUE.draft.desc }, ['venuemine', 'roomfail']);
    if (r && r.t === 'venuemine') { VENUE.onMine(r.mine); toast('Your venue is ready, and closed. Go to its door, decorate it, then open it.'); }
  };
  VENUE.set = async function (patch) { const r = await call(Object.assign({ t: 'venueset' }, patch), ['venuemine', 'roomfail']); if (r && r.t === 'venuemine') VENUE.onMine(r.mine); return r; };
  VENUE.toggleOpen = async function () {
    if (!VENUE.mine) return;
    if (typeof ROOM !== 'undefined' && ROOM.active && ROOM.kind === 'venue' && ROOM.dirty) { toast('Save the room first (the wallet signs it), then open the venue.'); return; }
    const open = VENUE.mine.state !== 'open', r = await VENUE.set({ open });
    if (r && r.t === 'venuemine') toast(open ? 'Your venue is open. Visitors can come in.' : 'Your venue is closed. Only you can enter.');
  };
  VENUE.goToDoor = function () {
    const v = VENUE.mine; if (!v) return;
    UI.open = null;
    if (typeof HOTEL !== 'undefined' && HOTEL.active) HOTEL.goTo(v); else HOTEL.gotoVenue(v);
    redraw();
  };

  // ---- the card inside the Venues window (holders only)
  const field = (label, node) => { const l = el('label', 'vf'); const s = el('span'); s.textContent = label; l.appendChild(s); l.appendChild(node); return l; };
  const input = (key, max, ph) => { const i = document.createElement('input'); i.type = 'text'; i.maxLength = max; i.placeholder = ph || ''; i.value = VENUE.draft[key] || ''; i.oninput = () => { VENUE.draft[key] = i.value; }; i.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') i.blur(); }; return i; };
  const catSel = () => { const s = document.createElement('select'); for (const c of CATS) s.appendChild(new Option(c, c)); s.value = VENUE.draft.cat || 'Lounge'; s.onchange = () => { VENUE.draft.cat = s.value; }; return s; };
  VENUE.section = function () {
    const box = el('div', 'vsec'), t = VENUE.info && VENUE.info.templates && VENUE.info.templates[VENUE.info.tier];
    if (!WALLET.account || NET.status !== 'online' || !NET.hotel) { box.appendChild(el('p', 'vnote', !WALLET.account ? 'Connect your wallet to open your venue.' : 'The town server is offline, so venues cannot be managed right now.')); return box; }
    if (!VENUE.info) { const b = el('button', 'btn', VENUE.busy ? 'Checking your wallet…' : 'Check my venue'); b.disabled = VENUE.busy; b.onclick = () => VENUE.refresh(); box.appendChild(el('p', 'vnote', 'The server reads your Chogs on the chain to confirm your tier.')); box.appendChild(b); return box; }
    if (!VENUE.info.tier) { box.appendChild(el('p', 'vnote', 'This wallet holds no Chog, so there is no venue to open.')); return box; }
    const m = VENUE.mine;
    if (!m) {
      box.appendChild(el('h3', '', 'Open your venue'));
      if (t) box.appendChild(el('p', 'vnote', 'Your license gives a room of ' + t.size[0] + ' × ' + t.size[1] + ' m with ' + t.pieces + ' pieces, and a facade ' + t.span + ' door' + (t.span > 1 ? 's' : '') + ' wide (' + t.facade + ' pieces).'));
      box.appendChild(field('Name', input('name', 32, 'e.g. Skyline Club'))); box.appendChild(field('Kind', catSel())); box.appendChild(field('Description', input('desc', 120, 'One line for the directory')));
      const b = el('button', 'btn', VENUE.busy ? 'Working…' : 'Activate venue'); b.disabled = VENUE.busy; b.onclick = () => VENUE.make(); box.appendChild(b);
      box.appendChild(el('p', 'vnote', 'It starts closed: the door shows "Closed" and only you can go in. Decorate it, then press Open venue.'));
    } else {
      const open = m.state === 'open', head = el('div', 'vhead'); head.innerHTML = '<b></b><span></span>'; head.querySelector('b').textContent = m.name;
      const sp = head.querySelector('span'); sp.textContent = (open ? 'Open' : 'Closed') + ' · Room ' + m.no + ' · Floor ' + m.floor; sp.className = open ? 'on' : 'off'; box.appendChild(head);
      box.appendChild(el('p', 'vnote', m.size[0] + ' × ' + m.size[1] + ' m room · ' + (m.template ? m.template.pieces : '') + ' pieces · ' + (m.hasDoc ? 'room saved' : 'room not decorated yet')));
      const row = el('div', 'actions');
      const go = el('button', 'btn', 'Go to my venue'); go.onclick = () => VENUE.goToDoor(); row.appendChild(go);
      const tg = el('button', 'btn ' + (open ? 'ghost' : ''), open ? 'Close venue' : 'Open venue'); tg.disabled = VENUE.busy || (!open && !m.hasDoc); tg.title = !open && !m.hasDoc ? 'Decorate and save the room first' : ''; tg.onclick = () => VENUE.toggleOpen(); row.appendChild(tg); box.appendChild(row);
      const rs = document.createElement('select'); for (const [k, lb] of RULES) rs.appendChild(new Option(lb, k)); rs.value = m.rule || 'public'; rs.onchange = () => VENUE.set({ rule: rs.value }); box.appendChild(field('Who may enter', rs));
      if (VENUE.draft.lists !== m.id) Object.assign(VENUE.draft, { guests: (m.guests || []).join(', '), bans: (m.bans || []).join(', '), lists: m.id });
      const ta = (key, ph) => { const t = document.createElement('textarea'); t.rows = 2; t.maxLength = 700; t.placeholder = ph; t.value = VENUE.draft[key] || ''; t.oninput = () => { VENUE.draft[key] = t.value; }; t.onkeydown = e => e.stopPropagation(); return t; };
      const names = s => String(s || '').split(/[\s,;]+/).filter(Boolean);
      if (m.rule === 'list') box.appendChild(field('Guest list', ta('guests', 'usernames, separated by commas')));
      box.appendChild(field('Banned', ta('bans', 'usernames the guard turns away')));
      const sl = el('button', 'btn ghost', 'Save lists'); sl.onclick = () => VENUE.set({ guests: names(VENUE.draft.guests), bans: names(VENUE.draft.bans) }).then(r => r && r.t === 'venuemine' && toast('Lists saved.')); box.appendChild(sl);
      box.appendChild(el('p', 'vnote', 'Lists use usernames, not wallet addresses. Players claim a username in My Chog. A player without a wallet has none, so a guest list keeps them out.'));
      if (!VENUE.draft.loaded || VENUE.draft.id !== m.id) Object.assign(VENUE.draft, { name: m.name, cat: m.cat, desc: m.desc, loaded: true, id: m.id });
      box.appendChild(field('Name', input('name', 32))); box.appendChild(field('Kind', catSel())); box.appendChild(field('Description', input('desc', 120)));
      const sv = el('button', 'btn ghost', 'Save details'); sv.onclick = () => VENUE.set({ name: VENUE.draft.name, cat: VENUE.draft.cat, desc: VENUE.draft.desc }).then(r => r && r.t === 'venuemine' && toast('Details saved.')); box.appendChild(sv);
    }
    if (VENUE.err) box.appendChild(el('p', 'vnote err', VENUE.err));
    return box;
  };
})();
