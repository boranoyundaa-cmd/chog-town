// ===== venue: your own venue in the Chog Hotel (docs/game/world.md) =====
// A holder activates a venue from the license (the server reads the wallet's Chogs on chain and gives the tier's room). It starts CLOSED: its door in the hotel hall
// shows "closed" and only the owner can walk in. The owner decorates it with the same editor as the Home (room.js, bigger budget), saves it (wallet signature) and
// presses "Open venue". This file holds the state the server reports (VENUE.info, VENUE.mine, VENUE.offer = a move the license allows: upgrade / downsize / restore), the card in the Venues window,
// the venue music (DJ booth, AUDIO.setPlace) and the clicks on the game tables. Tier perks (docs/project/build-plan.md): capacity, stage and DJ booth (Fren), VIP lounge (Whale), tables (all). Loaded after hotel.js.
const VENUE = { info: null, mine: null, offer: null, archived: false, inside: null, busy: false, tried: false, draft: { name: '', cat: 'Lounge', desc: '' }, err: '' };
(function () {
  const CATS = ['Club', 'Café', 'Arcade', 'Gallery', 'Lounge', 'Spooky', 'Workshop', 'Other'];
  const RULES = [['public', 'Anyone'], ['holders', 'Chog holders only'], ['list', 'Guest list']];
  const redraw = () => { if (typeof render === 'function') render(); };
  VENUE.onMine = m => { VENUE.mine = m || null; if (typeof HOTEL !== 'undefined') HOTEL.mineId = m ? m.id : null; if (typeof ROOM !== 'undefined' && ROOM.refreshUI) ROOM.refreshUI(); redraw(); };
  VENUE.onInfo = m => { VENUE.info = { tier: m.tier, points: m.points, tokens: m.tokens, templates: m.templates, music: m.music || MUSIC.map(x => x[0]) }; VENUE.offer = m.offer || null; VENUE.archived = !!m.archived; VENUE.onMine(m.mine); };
  const MUSIC = [['', 'Automatic (by kind)'], ['lobby', 'Lobby lounge'], ['cafe', 'Café jazz'], ['arcade', 'Arcade chiptune'], ['club', 'Club beat'], ['gallery', 'Gallery ambient'], ['home', 'Home chill']];
  const AUTO = { Club: 'club', 'Café': 'cafe', Arcade: 'arcade', Gallery: 'gallery' };
  const setPlace = id => { try { if (window.AUDIO && AUDIO.setPlace) AUDIO.setPlace(id); } catch (e) { /* the sound is optional */ } };
  VENUE.trackOf = v => (v && v.music) || AUTO[v && v.cat] || 'lobby';
  VENUE.onEnterVenue = v => { VENUE.inside = v || null; setPlace(VENUE.trackOf(v)); };
  VENUE.onLeaveVenue = () => { VENUE.inside = null; if (VENUE.closeDj) VENUE.closeDj(); setPlace('lobby'); };
  // messages that only this file cares about (NET calls every waiter for every message)
  if (typeof NET !== 'undefined' && NET.waiters) NET.waiters.add(m => {
    if (m.t === 'venuemine') { if ('offer' in m) VENUE.offer = m.offer || null; if ('archived' in m) VENUE.archived = !!m.archived; }
    else if (m.t === 'venuemusic') { if (VENUE.inside && VENUE.inside.id === m.id) { VENUE.inside.music = m.music; setPlace(VENUE.trackOf(VENUE.inside)); } }
    else if (m.t === 'kicked') { if (typeof ROOM !== 'undefined' && ROOM.active && ROOM.venue) { toast('You were asked to leave the venue.'); ROOM.leave(); } }
  });
  WALLET.on('account', () => { VENUE.info = null; VENUE.mine = null; VENUE.offer = null; VENUE.archived = false; VENUE.tried = false; if (typeof HOTEL !== 'undefined') HOTEL.mineId = null; });
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
  // the license changed: move into the room of the new tier (bigger, smaller, or out of the archive); the server keeps a copy of the old documents
  VENUE.move = async function () {
    const o = VENUE.offer; if (!o) return;
    const r = await call({ t: 'venuemove' }, ['venuemine', 'roomfail']);
    if (r && r.t === 'venuemine') { VENUE.onMine(r.mine); VENUE.offer = null; VENUE.archived = false; toast(o.kind === 'upgrade' ? 'Your venue moved into a bigger room. Check the pieces, then open it.' : 'Your venue moved into the room of your tier. Check the pieces, then open it.'); }
  };
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
    const m = VENUE.mine, off = VENUE.offer, tn = t => (typeof TIER_SIZE !== 'undefined' && TIER_SIZE[t]) || 'room';
    if (!m && VENUE.archived) {
      box.appendChild(el('h3', '', 'Your old venue is kept'));
      box.appendChild(el('p', 'vnote', 'You held fewer Chogs than it needed for 7 days, so its slot was freed. Its decor is saved.' + (off ? ' You can move it into a ' + tn(off.tier) + ' now.' : '')));
      if (off) { const b = el('button', 'btn', VENUE.busy ? 'Working…' : 'Move it into a ' + tn(off.tier)); b.disabled = VENUE.busy; b.onclick = () => VENUE.move(); box.appendChild(b); box.appendChild(el('p', 'vnote', 'Pieces that do not fit the room or the tier are dropped; the original is kept.')); }
    } else if (!m) {
      box.appendChild(el('h3', '', 'Open your venue'));
      if (t) box.appendChild(el('p', 'vnote', 'Your license gives a room of ' + t.size[0] + ' × ' + t.size[1] + ' m with ' + t.pieces + ' pieces' + (t.levels > 1 ? ' on each of its 2 levels (joined by stairs)' : '') + ', and ' + (t.span === 1 ? 'a segment of wall' : t.span === 2 ? 'a whole wall' : 'a whole floor') + ' in the hotel hall to decorate as its front (' + t.facade + ' pieces).'));
      box.appendChild(field('Name', input('name', 32, 'e.g. Skyline Club'))); box.appendChild(field('Kind', catSel())); box.appendChild(field('Description', input('desc', 120, 'One line for the directory')));
      const b = el('button', 'btn', VENUE.busy ? 'Working…' : 'Activate venue'); b.disabled = VENUE.busy; b.onclick = () => VENUE.make(); box.appendChild(b);
      box.appendChild(el('p', 'vnote', 'It starts closed: the door shows "Closed" and only you can go in. Decorate it, then press Open venue.'));
    } else {
      const open = m.state === 'open', frozen = m.state === 'frozen', head = el('div', 'vhead'); head.innerHTML = '<b></b><span></span>'; head.querySelector('b').textContent = m.name;
      const sp = head.querySelector('span'); sp.textContent = (frozen ? 'Frozen' : open ? 'Open' : 'Closed') + ' · Room ' + m.no + ' · Floor ' + m.floor + ' · ' + (typeof TIER_SIZE !== 'undefined' ? TIER_SIZE[m.tier] : 'tier ' + m.tier) + ' · up to ' + m.cap + ' inside'; sp.className = open ? 'on' : 'off'; box.appendChild(head);
      if (frozen) box.appendChild(el('p', 'vnote err', 'Frozen: this wallet holds fewer Chogs than the venue needs. It is closed, your decor is kept. Hold the tier again within ' + (m.daysLeft || 0) + ' day' + (m.daysLeft === 1 ? '' : 's') + ' and it reopens; after that the slot is freed.'));
      if (off) {
        const up = off.kind === 'upgrade', b = el('button', 'btn' + (up ? '' : ' ghost'), VENUE.busy ? 'Working…' : up ? 'Upgrade venue to a ' + tn(off.tier) : 'Move to a smaller room (' + tn(off.tier) + ')'); b.disabled = VENUE.busy; b.onclick = () => VENUE.move(); box.appendChild(b);
        box.appendChild(el('p', 'vnote', up ? 'Your license grew. The venue moves to a new slot of the bigger room (the door number may change) and the old slot is freed. Your decor comes with it.' : 'The venue moves to the room of your tier. Pieces that do not fit are dropped; a copy of the original is kept.'));
      }
      box.appendChild(el('p', 'vnote', m.size[0] + ' × ' + m.size[1] + ' m room' + (m.levels > 1 ? ' on 2 levels' : '') + ' · ' + (m.template ? m.template.pieces : '') + ' pieces' + (m.levels > 1 ? ' each' : '') + ' · ' + (m.hasDoc ? 'room saved' : 'room not decorated yet')));
      const row = el('div', 'actions');
      const go = el('button', 'btn', 'Go to my venue'); go.onclick = () => VENUE.goToDoor(); row.appendChild(go);
      const tg = el('button', 'btn ' + (open ? 'ghost' : ''), open ? 'Close venue' : 'Open venue'); tg.disabled = VENUE.busy || frozen || (!open && !m.hasDoc); tg.title = frozen ? 'Frozen: hold the tier again' : !open && !m.hasDoc ? 'Decorate and save the room first' : ''; tg.onclick = () => VENUE.toggleOpen(); row.appendChild(tg); box.appendChild(row);
      const rs = document.createElement('select'); for (const [k, lb] of RULES) rs.appendChild(new Option(lb, k)); rs.value = m.rule || 'public'; rs.onchange = () => VENUE.set({ rule: rs.value }); box.appendChild(field('Who may enter', rs));
      if (VENUE.draft.lists !== m.id) Object.assign(VENUE.draft, { guests: (m.guests || []).join(', '), bans: (m.bans || []).join(', '), lists: m.id });
      const ta = (key, ph) => { const t = document.createElement('textarea'); t.rows = 2; t.maxLength = 700; t.placeholder = ph; t.value = VENUE.draft[key] || ''; t.oninput = () => { VENUE.draft[key] = t.value; }; t.onkeydown = e => e.stopPropagation(); return t; };
      const names = s => String(s || '').split(/[\s,;]+/).filter(Boolean);
      if (m.rule === 'list') box.appendChild(field('Guest list', ta('guests', 'usernames, separated by commas')));
      box.appendChild(field('Banned', ta('bans', 'usernames the guard turns away')));
      const sl = el('button', 'btn ghost', 'Save lists'); sl.onclick = () => VENUE.set({ guests: names(VENUE.draft.guests), bans: names(VENUE.draft.bans) }).then(r => r && r.t === 'venuemine' && toast('Lists saved.')); box.appendChild(sl);
      box.appendChild(el('p', 'vnote', 'Lists use usernames, not wallet addresses. Players claim a username in My Chog. A player without a wallet has none, so a guest list keeps them out.'));
      const tpl = m.template || {};
      if (tpl.music) { const ms = document.createElement('select'); for (const [k, lb] of MUSIC) ms.appendChild(new Option(lb, k)); ms.value = m.music || ''; ms.onchange = () => VENUE.set({ music: ms.value }); box.appendChild(field('Venue music', ms)); box.appendChild(el('p', 'vnote', 'Also set from your DJ booth: click it inside the venue.')); }
      if (tpl.vip) {
        const vs = document.createElement('select'); for (const [k, lb] of [['public', 'No VIP lounge (anyone may go up)'], ['holders', 'VIP: Chog holders only'], ['list', 'VIP: guest list']]) vs.appendChild(new Option(lb, k)); vs.value = m.vipRule || 'public'; vs.onchange = () => VENUE.set({ vipRule: vs.value }); box.appendChild(field('Upper level (VIP)', vs));
        if (m.vipRule === 'list') {
          if (VENUE.draft.vipFor !== m.id) Object.assign(VENUE.draft, { vipGuests: (m.vipGuests || []).join(', '), vipFor: m.id });
          const vt = document.createElement('textarea'); vt.rows = 2; vt.maxLength = 700; vt.placeholder = 'usernames, separated by commas'; vt.value = VENUE.draft.vipGuests || ''; vt.oninput = () => { VENUE.draft.vipGuests = vt.value; }; vt.onkeydown = e => e.stopPropagation(); box.appendChild(field('VIP guest list', vt));
          const vb = el('button', 'btn ghost', 'Save VIP list'); vb.onclick = () => VENUE.set({ vipGuests: String(VENUE.draft.vipGuests || '').split(/[\s,;]+/).filter(Boolean) }).then(r => r && r.t === 'venuemine' && toast('VIP list saved.')); box.appendChild(vb);
        }
        box.appendChild(el('p', 'vnote', 'The server checks this rule when someone takes the stairs to the upper level.'));
      }
      if (typeof SHOP !== 'undefined') box.appendChild(SHOP.venueExtras(m));                       // shop extras: event, security camera, budget (shop.js)
      if (!VENUE.draft.loaded || VENUE.draft.id !== m.id) Object.assign(VENUE.draft, { name: m.name, cat: m.cat, desc: m.desc, loaded: true, id: m.id });
      box.appendChild(field('Name', input('name', 32))); box.appendChild(field('Kind', catSel())); box.appendChild(field('Description', input('desc', 120)));
      const sv = el('button', 'btn ghost', 'Save details'); sv.onclick = () => VENUE.set({ name: VENUE.draft.name, cat: VENUE.draft.cat, desc: VENUE.draft.desc }).then(r => r && r.t === 'venuemine' && toast('Details saved.')); box.appendChild(sv);
    }
    if (VENUE.err) box.appendChild(el('p', 'vnote err', VENUE.err));
    return box;
  };

  // ---- pieces you can click inside a venue: the game tables open GAMES (games.js), the DJ booth picks the music (owner) or says what is playing
  const TABLE_NAME = { c4: 'Connect four', ls: 'Long/Short' };
  let djBox = null;
  VENUE.closeDj = () => { if (djBox) { djBox.remove(); djBox = null; } };
  VENUE.openDj = function () {
    VENUE.closeDj(); const inside = VENUE.inside, cur = VENUE.trackOf(inside), name = (MUSIC.find(x => x[0] === cur) || [0, cur])[1];
    if (!VENUE.mine || !inside || VENUE.mine.id !== inside.id) { toast('Now playing: ' + name + '.'); return; }
    const b = el('div', 'card hit djpick'); b.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:30;padding:12px 14px;min-width:240px;display:flex;flex-direction:column;gap:8px';
    const h = el('b'); h.textContent = 'DJ booth: venue music'; b.appendChild(h);
    const s = document.createElement('select'); for (const [k, lb] of MUSIC) s.appendChild(new Option(lb, k)); s.value = (VENUE.mine && VENUE.mine.music) || '';
    s.onchange = async () => { const r = await VENUE.set({ music: s.value }); if (r && r.t === 'venuemine') toast('Now playing: ' + (MUSIC.find(x => x[0] === s.value) || [0, ''])[1] + '.'); };
    s.onkeydown = e => e.stopPropagation(); b.appendChild(s);
    const x = el('button', 'btn ghost', 'Close'); x.onclick = () => VENUE.closeDj(); b.appendChild(x); document.body.appendChild(b); djBox = b;
  };
  VENUE.usePiece = function (act) {
    if (act === 'music') return VENUE.openDj();
    const g = window.GAMES;
    if (g && typeof g.openTable === 'function') g.openTable(act); else toast((TABLE_NAME[act] || 'This table') + ' opens soon.');
  };
  {
    const dom = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let dn = null;
    dom.addEventListener('pointerdown', e => { dn = { x: e.clientX, y: e.clientY, t: performance.now(), b: e.button }; });
    addEventListener('pointerup', e => {
      const d0 = dn; dn = null;
      if (!d0 || d0.b !== 0 || e.target !== dom || typeof ROOM === 'undefined' || !ROOM.active || ROOM.kind !== 'venue' || ROOM.mode !== 'walk') return;
      if (Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 10 || performance.now() - d0.t > 500) return;
      const r = dom.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
      const groups = SPACE.placed.filter(q => q.def && q.def.act).map(q => q.g); if (!groups.length) return;
      const hit = ray.intersectObjects(groups, true).find(h => h.object.isMesh && !(h.object.userData && (h.object.userData.isHull || h.object.userData.noNormal))); if (!hit) return;
      let o = hit.object; while (o && !groups.includes(o)) o = o.parent; const q = SPACE.placed.find(x => x.g === o); if (q) VENUE.usePiece(q.def.act);
    });
  }
})();
