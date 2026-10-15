// ===== exhibition: the weekly room contest (docs/project/build-plan.md). Server side: server/exhibition.js =====
// The Exhibition floor is a hotel floor "E" (hotel.js builds it with buildFloor): its four 10 m doors (two wall units each) show a page of this week's entries, last week's winner first.
// An entry is a read-only snapshot of a room; it opens like a hotel venue (ROOM.setup with venue.exhibit) and the top bar gets a Vote button.
// Needs NET, WALLET, ROOM, HOTEL. Loaded after hotel.js and venue.js.
const EXH = { data: null, page: 0, busy: false };
(function () {
  const SLOTS = 4, wait = ms => new Promise(r => setTimeout(r, ms));
  const hexOf = s => '0x' + [...new TextEncoder().encode(s)].map(b => b.toString(16).padStart(2, '0')).join('');

  // ---- the server's list: theme, entries (counts only after you voted), last week's winner, what you may do, your trophies
  EXH.load = async function () {
    for (let i = 0; i < 2; i++) {
      NET.send({ t: 'ex_list' }); const r = await NET.waitFor(['ex_list', 'ex_fail'], 6000);
      if (r && r.t === 'ex_list') { EXH.take(r); return true; }
      if (!r || !/Slow down/.test(r.reason || '')) break; await wait(500);
    }
    return !!EXH.data;
  };
  EXH.take = r => { EXH.data = r; const n = EXH.pages(); if (EXH.page >= n) EXH.page = Math.max(0, n - 1); if (HOTEL.active && HOTEL.floor === 'E') HOTEL.refreshUI(); if (ROOM.active) ROOM.refreshUI(); };
  EXH.trophies = () => (EXH.data && EXH.data.trophies) || [];                              // [{week, theme, name, votes}] won by this wallet
  const all = () => { const d = EXH.data; return d ? (d.winner ? [d.winner] : []).concat(d.entries) : []; };
  EXH.pages = () => Math.max(1, Math.ceil(all().length / SLOTS));
  // the doors of the current page, shaped like hotel venues so the hall generator can draw them (unit = the first of its two wall units)
  EXH.pageItems = function () {
    return all().slice(EXH.page * SLOTS, EXH.page * SLOTS + SLOTS).map((e, i) => ({
      id: 'x:' + e.id, ex: true, entry: e, no: i + 1, unit: 2 * i + 1, units: 2, floor: 'E', levels: 1, name: e.name, cat: e.winner ? 'Winner' : 'Gallery', desc: e.theme, state: 'open', rule: 'public', cap: 0, by: e.by,
      tag: e.winner ? '★' : e.mine ? 'YOU' : '#' + (EXH.page * SLOTS + i + 1 - (EXH.data.winner ? 1 : 0)),
      line: e.winner ? '★ WINNER · ' + e.votes + ' votes' : e.votes == null ? '♥ vote to see' : '♥ ' + e.votes + (e.yours ? ' · your vote' : ''),
      sub: 'by ' + e.by,
    }));
  };
  const left = ms => { const h = Math.max(0, Math.floor(ms / 3600e3)); return h >= 48 ? Math.floor(h / 24) + ' days' : h + ' hours'; };
  EXH.summary = function () {
    const d = EXH.data; if (!d) return 'Loading…'; const w = d.week, now = Date.now();
    return 'Theme: ' + w.theme + ' · ' + (w.submitOpen ? 'entries close in ' + left(w.submitUntil - now) : 'voting ends in ' + left(w.endsAt - now)) + (EXH.pages() > 1 ? ' · page ' + (EXH.page + 1) + '/' + EXH.pages() : '') + (EXH.trophies().length ? ' · trophies ' + EXH.trophies().length : '');
  };
  EXH.theme = () => (EXH.data ? EXH.data.week.theme : '');
  EXH.setPage = function (p) { const n = EXH.pages(); EXH.page = ((p % n) + n) % n; if (HOTEL.active && HOTEL.floor === 'E' && !HOTEL.busy) HOTEL.rebuildHere(); };

  // ---- a signed action: ask the server for the text, the wallet signs it (free, no transaction), the server checks it
  async function signedAction(prep, prepReply, doneType, extra) {
    if (NET.status !== 'online') { toast('The town server is not reachable right now.'); return null; }
    if (!WALLET.account || !WALLET.provider) { toast('Connect your wallet first (top right), then try again.'); return null; }
    if (!await NET.authenticate()) { toast('Sign in with your wallet first.'); return null; }
    NET.send(prep); const p = await NET.waitFor([prepReply, 'ex_fail'], 8000);
    if (!p) { toast('The server did not answer.'); return null; } if (p.t === 'ex_fail') { toast(p.reason); return null; }
    let sig; try { sig = await WALLET.provider.request({ method: 'personal_sign', params: [hexOf(p.message), WALLET.account] }); } catch (e) { toast(e && e.code === 4001 ? 'Not sent: you declined to sign.' : 'Could not sign the message.'); return null; }
    NET.send(Object.assign({ t: doneType, ts: p.ts, sig }, extra || {})); const r = await NET.waitFor(['ex_done', 'ex_fail'], 8000);
    if (!r) { toast('The server did not answer.'); return null; } if (r.t === 'ex_fail') { toast(r.reason); return null; }
    EXH.take(r); return r;
  }
  // the room top bar button: put a snapshot of your SAVED room into this week's contest (or replace your entry until Sunday noon UTC)
  EXH.enterContest = async function () {
    if (EXH.busy) return; if (typeof ROOM !== 'undefined' && ROOM.active && ROOM.mine && (ROOM.dirty || !ROOM.savedAt)) { toast('Save your room first: the contest takes a copy of the saved room.'); return; }
    EXH.busy = true; try {
      const r = await signedAction({ t: 'ex_prep' }, 'ex_prep', 'ex_submit');
      if (r) toast(r.replaced ? 'Your entry was replaced with your current room.' : 'Your room is in this week\'s contest: ' + r.week.theme + '. Find it on the Exhibition floor.');
    } finally { EXH.busy = false; if (ROOM.active) ROOM.refreshUI(); }
  };
  EXH.vote = async function (e) {
    if (EXH.busy || !e) return; EXH.busy = true; try {
      const r = await signedAction({ t: 'ex_voteprep', id: e.id }, 'ex_voteprep', 'ex_vote', { id: e.id });
      if (r) { toast(r.moved ? 'Your vote moved to this room.' : 'Vote counted. You can move it until the week ends.'); const x = r.entries.find(y => y.id === e.id); if (x && ROOM.venue && ROOM.venue.exhibit) ROOM.venue.entry = Object.assign({}, ROOM.venue.entry, x); }
    } finally { EXH.busy = false; if (ROOM.active) ROOM.refreshUI(); }
  };

  // ---- walking into an entry (like a hotel venue, read only)
  EXH.enter = async function (v) {
    if (ROOM.busy) return false; ROOM.busy = true;
    try {
      const r = await NET.enter({ space: 'exhibit', id: v.entry.id, x: 0, z: 0, ry: 0 }); if (!r || r.t !== 'entered') return false;
      if (HOTEL.active) { HOTEL.hideScene(true); HOTEL.away = true; }
      const ex = r.exhibit || {}, entry = Object.assign({}, v.entry, ex);
      const ven = { id: v.entry.id, exhibit: true, entry, no: v.no, floor: 'E', units: 2, levels: 1, name: ex.name || v.name, by: ex.by || v.by, size: ex.size || [20, 15], tier: 0 };
      ROOM.setup(r.doc || SPACE.starterRoom(), { kind: 'venue', owner: null, ownerName: null, mine: false, savedAt: Date.now(), draft: false, venue: ven, level: 1 });
      return true;
    } finally { ROOM.busy = false; ROOM.refreshUI(); }
  };
  EXH.subtitle = function () {
    const v = ROOM.venue, e = v.entry, d = EXH.data, mine = d && d.entries.find(x => x.id === v.id);
    const cur = mine || e;
    return (e.winner ? 'Winner of ' + e.week : 'Exhibition') + ' · ' + (e.theme || '') + ' · by ' + v.by + (cur.votes != null ? ' · ♥ ' + cur.votes : '');
  };
  // buttons in the top bar: `btn(cls, text, fn, title)` is the caller's own button maker. In the hall: pages. Inside an entry: Vote.
  EXH.bar = function (bar, btn, where) {
    if (where === 'hall') {
      if (EXH.pages() > 1) { bar.appendChild(btn('ghost', '◀', () => EXH.setPage(EXH.page - 1), 'Previous page of entries')); bar.appendChild(btn('ghost', '▶', () => EXH.setPage(EXH.page + 1), 'Next page of entries')); }
      const y = EXH.data && EXH.data.you; if (y && y.canEnter) bar.appendChild(btn('', y.entered ? 'Replace my entry' : 'Enter my room', () => EXH.enterContest(), 'Put a copy of your saved room into this week\'s contest'));
      return;
    }
    const v = ROOM.venue, e = v.entry, d = EXH.data; if (e.winner || e.current === false) return;
    const mine = e.mine || (d && d.entries.some(x => x.id === v.id && x.mine)), voted = d && d.you && d.you.voted === v.id, open = !d || d.week.voteOpen;
    const b = btn(voted || mine ? 'ghost' : '', mine ? 'Your entry' : voted ? 'Your vote' : 'Vote for this room', () => EXH.vote(e), mine ? 'You cannot vote for your own entry' : 'One signed vote per week. You can move it until Sunday midnight UTC.');
    b.disabled = !!mine || !!voted || !open || EXH.busy; bar.appendChild(b);
  };
})();
