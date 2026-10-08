// ===== net: the realtime link to server/index.js: other players, chat, wallet proof =====
// The server only relays presence and chat. Who owns which Chog is checked on chain by the server (ownerOf), after the wallet
// signs a challenge once (a free signature, no transaction); a 12 h session token in localStorage avoids signing on every visit.
// The game works offline: if the server is unreachable you walk the town alone and the chat box says so.
// Loaded after ui.js and plates.js.
const NET = {
  ws: null, status: 'connecting', id: null, name: '', maxChat: 140, remotes: new Map(), log: [], draft: '', retry: 0,
  muted: new Set(), authed: false, authBusy: null, lastSent: null, card: null, space: 'city', rooms: false,
};
(function () {
  const QSV = new URLSearchParams(location.search);
  const LOCAL = !location.hostname || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.hostname.endsWith('.localhost');
  const URL_ = QSV.get('server') || (LOCAL ? 'ws://' + (location.hostname || 'localhost') + ':8767' : 'wss://chog-town-ws.fly.dev');   // local dev server, else the live one
  try { JSON.parse(localStorage.getItem('chog_muted') || '[]').forEach(k => NET.muted.add(k)); } catch (e) { /* ignore */ }
  const saveMuted = () => { try { localStorage.setItem('chog_muted', JSON.stringify([...NET.muted].slice(-200))); } catch (e) { /* ignore */ } };
  const send = m => { if (NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(m)); };
  const refreshChat = () => { if (NET.refreshChat) NET.refreshChat(); };
  const addLog = (kind, text, extra) => { NET.log.push(Object.assign({ kind, text, at: Date.now() }, extra)); if (NET.log.length > 120) NET.log.shift(); refreshChat(); };
  NET.sys = text => addLog('sys', text);
  GAME.extraRoots = () => [...NET.remotes.values()].map(r => r.root);

  // ---- other players: a Chog with the right look, a plate, smooth movement
  const SCALE = CHOG_SCALE * 1.08;
  function dispose(root) {                                          // leave no trace in the render passes
    world.remove(root);
    root.userData.tick = () => { };
    root.traverse(m => { const i = hiddenInNormal.indexOf(m); if (i >= 0) hiddenInNormal.splice(i, 1); if (m.geometry && !m.userData.shared) m.geometry.dispose(); });
  }
  function build(r, traits) {
    const old = r.root, c = chogFromTraits(traits, { scale: SCALE });
    c.position.set(r.x, 0, r.z); c.rotation.y = r.ry; c.userData.netId = r.id; c.userData.netName = r.name; world.add(c);
    r.root = c; r.t0 = Math.random() * 6; r.traits = traits;
    if (r.plate) r.plate.root = c; else r.plate = PLATES.add(c);
    r.plate.tierColor = traits.Tier && r.token ? hex(chogOptionsFromTraits(traits).tier) : null;
    if (old) dispose(old);
  }
  async function look(r) {                                          // default Chog now, the real traits once they load
    if (!r.root) build(r, DEFAULT_TRAITS);
    if (!r.token) { if (r.traits !== DEFAULT_TRAITS) build(r, DEFAULT_TRAITS); return; }
    const want = r.token;
    try { const tr = await WALLET.traitsOf(want); if (NET.remotes.get(r.id) === r && r.token === want) build(r, tr); } catch (e) { /* stays default */ }
  }
  function upsert(p) {
    let r = NET.remotes.get(p.id);
    if (!r) { r = { id: p.id, x: p.x, z: p.z, ry: p.ry, tx: p.x, tz: p.z, tr: p.ry, mv: !!p.mv, root: null, plate: null, token: null, name: '' }; NET.remotes.set(p.id, r); }
    const changed = r.token !== (p.token || null) || !r.root; r.token = p.token || null; r.name = p.name;
    if (r.root) r.root.userData.netName = r.name;
    if (changed) look(r);
    return r;
  }
  function remove(id) { const r = NET.remotes.get(id); if (!r) return; NET.remotes.delete(id); if (r.plate) PLATES.remove(r.plate); if (r.root) dispose(r.root); if (NET.card === id) NET.closeCard(); refreshChat(); }
  function clearAll() { for (const id of [...NET.remotes.keys()]) remove(id); }

  animated.push((t, dt) => {
    for (const r of NET.remotes.values()) {
      const c = r.root; if (!c) continue;
      const dx = r.tx - c.position.x, dz = r.tz - c.position.z, d = Math.hypot(dx, dz);
      if (d > 3) c.position.set(r.tx, 0, r.tz); else { const k = 1 - Math.exp(-dt * 12); c.position.x += dx * k; c.position.z += dz * k; }
      let dr = r.tr - c.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); c.rotation.y += dr * Math.min(1, dt * 12);
      const u = c.userData, moving = r.mv || d > 0.04, ph = t * 9 + r.t0, sw = Math.sin(ph);
      if (!u.legs) continue;
      if (moving) { u.legs[0].rotation.x = sw * 0.65; u.legs[1].rotation.x = -sw * 0.65; u.arms[0].rotation.x = -sw * 0.7; u.arms[1].rotation.x = sw * 0.7; u.body.position.y = Math.abs(sw) * 0.05; u.head.position.y = 1.0 + Math.abs(sw) * 0.05; }
      else { const b = Math.sin(t * 2 + r.t0) * 0.015; u.body.position.y = b; u.head.position.y = 1.0 + b * 1.4; u.legs.forEach(l => l.rotation.x = 0); u.arms.forEach(a => a.rotation.x = Math.sin(t * 2 + r.t0) * 0.05); }
      const blink = Math.sin(t * 0.9 + r.t0 * 5) > 0.985 ? 0.12 : 1; u.eyes.forEach(e => e.scale.y = (e.userData.by || 0.095) * blink);
    }
  });

  // ---- sending our own position: only when something changed, ~10 per second
  setInterval(() => {
    const me = GAME.me; if (!me || NET.status !== 'online') return;
    if (typeof ROOM !== 'undefined' && ROOM.active && NET.space === 'city') return;                 // in a room the server does not know about (old server, or the answer is on its way): do not report room positions as town positions
    const s = { x: +me.position.x.toFixed(2), z: +me.position.z.toFixed(2), ry: +me.rotation.y.toFixed(2), mv: GAME.moving ? 1 : 0 }, l = NET.lastSent;
    if (l && l.x === s.x && l.z === s.z && l.ry === s.ry && l.mv === s.mv) return;
    NET.lastSent = s; send(Object.assign({ t: 'move' }, s));
  }, 100);

  // ---- wallet proof and appearance
  const hexOf = s => '0x' + [...new TextEncoder().encode(s)].map(b => b.toString(16).padStart(2, '0')).join('');
  const sessKey = () => 'chog_session_' + (WALLET.account || '').toLowerCase();
  function waitFor(types, ms = 15000) {
    return new Promise(res => { const t = setTimeout(() => { done(null); }, ms); const h = m => { if (types.includes(m.t)) done(m); }; const done = m => { clearTimeout(t); NET.waiters.delete(h); res(m); }; NET.waiters.add(h); });
  }
  NET.waiters = new Set();
  // prove the connected wallet to the server (resume a session, else sign the challenge once)
  NET.authenticate = function () {
    if (NET.authed) return Promise.resolve(true);
    if (NET.authBusy) return NET.authBusy;
    NET.authBusy = (async () => {
      try {
        if (!WALLET.account || !WALLET.provider || NET.status !== 'online') return false;
        let s = null; try { s = localStorage.getItem(sessKey()); } catch (e) { /* ignore */ }
        if (s) { send({ t: 'auth', session: s }); const r = await waitFor(['authed', 'authfail'], 6000); if (r && r.t === 'authed') return true; try { localStorage.removeItem(sessKey()); } catch (e) { /* ignore */ } }
        toast('Sign the message in your wallet to play as your Chog (free, no transaction).');
        const sig = await WALLET.provider.request({ method: 'personal_sign', params: [hexOf(NET.challenge), WALLET.account] });
        send({ t: 'auth', addr: WALLET.account, sig }); const r = await waitFor(['authed', 'authfail'], 8000);
        if (r && r.t === 'authed') { try { localStorage.setItem(sessKey(), r.session); } catch (e) { /* ignore */ } return true; }
        return false;
      } catch (e) { NET.sys(e && e.code === 4001 ? 'Signing was declined. Others see you as a guest.' : 'Could not sign in to the server.'); return false; }
      finally { NET.authBusy = null; }
    })();
    return NET.authBusy;
  };
  // tell the server which Chog we look like (null = the default one)
  NET.appear = async function (token) {
    NET.want = token || null;
    if (NET.status !== 'online') return;
    if (!NET.want) { send({ t: 'appear', token: null }); return; }
    if (await NET.authenticate()) send({ t: 'appear', token: NET.want });
  };
  // ---- spaces: change where we are (the town, a private spot, somebody's saved room); the server then only relays this space to us
  NET.enter = async function (spec) {
    if (NET.status !== 'online' || !NET.rooms) return null;                                  // an older server does not know rooms: the client plays the room alone
    send(Object.assign({ t: 'enter' }, spec));
    return await waitFor(['entered', 'roomfail'], 8000);
  };
  NET.send = send;
  NET.waitFor = waitFor;
  NET.logout = function () { NET.authed = false; NET.want = null; send({ t: 'logout' }); };

  // ---- chat and moderation
  NET.say = function (text) {
    text = String(text || '').trim(); if (!text) return;
    if (NET.status !== 'online') { NET.sys('Not connected to the town server.'); return; }
    send({ t: 'chat', text });
  };
  NET.report = function (id, reason) { send({ t: 'report', id, reason }); };
  NET.mute = function (r) { const k = r.token ? 't' + r.token : 'n' + r.name; NET.muted.add(k); saveMuted(); NET.sys(r.name + ' is muted for you.'); };
  NET.unmute = function (r) { NET.muted.delete(r.token ? 't' + r.token : 'n' + r.name); saveMuted(); };
  NET.isMuted = r => NET.muted.has(r.token ? 't' + r.token : 'n' + r.name);
  NET.openCard = id => { if (NET.remotes.has(id)) { NET.card = id; if (typeof render === 'function') render(); } };
  NET.closeCard = () => { NET.card = null; if (typeof render === 'function') render(); };
  NET.online = () => NET.remotes.size + (NET.status === 'online' ? 1 : 0);

  // ---- messages
  function onMsg(m) {
    for (const h of [...NET.waiters]) h(m);
    switch (m.t) {
      case 'welcome':
        NET.id = m.id; NET.name = m.name; NET.challenge = m.challenge; NET.maxChat = m.maxChat || 140; NET.rooms = !!m.rooms; NET.status = 'online'; NET.retry = 0; NET.authed = false; NET.lastSent = null;
        clearAll(); for (const p of m.players) upsert(p);
        addLog('sys', NET.log.length ? 'Reconnected to the town.' : 'Connected. ' + (m.players.length ? m.players.length + ' other' + (m.players.length > 1 ? 's' : '') + ' in town.' : 'You are the first one here.'));
        if (GAME.me) { send({ t: 'move', x: +GAME.me.position.x.toFixed(2), z: +GAME.me.position.z.toFixed(2), ry: +GAME.me.rotation.y.toFixed(2), mv: 0 }); }
        NET.space = 'city'; if (ROOM.active) ROOM.resync();                // the server starts every connection in the town: go back to the room we were in
        if (NET.want) NET.appear(NET.want);
        refreshChat(); if (typeof render === 'function') render(); break;
      case 'entered': NET.space = m.space; NET.lastSent = null; clearAll(); for (const p of m.players) upsert(p); refreshChat(); if (typeof render === 'function') render(); break;
      case 'roomdoc': if (ROOM.onDoc) ROOM.onDoc(m.doc); break;
      case 'roomfail': toast(m.reason || 'That did not work.'); break;
      case 'join': upsert(m.p); if (NET.refreshChat) NET.refreshChat(); break;
      case 'leave': remove(m.id); break;
      case 'appear': if (m.p.id === NET.id) { NET.name = m.p.name; if (typeof render === 'function') render(); } else upsert(m.p); break;
      case 'state': for (const [id, x, z, ry, mv] of m.p) { const r = NET.remotes.get(id); if (r) { r.tx = x; r.tz = z; r.tr = ry; r.mv = !!mv; } } break;
      case 'snap': if (GAME.me) { GAME.me.position.set(m.x, 0, m.z); GAME.path = []; } break;
      case 'authed': NET.authed = true; break;
      case 'authfail': NET.authed = false; break;
      case 'sys': addLog('sys', m.text); break;
      case 'chat': {
        const r = NET.remotes.get(m.id), mine = m.id === NET.id;
        if (r && NET.isMuted(r)) break;
        addLog('chat', m.text, { name: m.name, id: m.id, mine });
        const plate = mine ? PLATES.me : r && r.plate; if (plate) PLATES.say(plate, m.text);
        break;
      }
    }
  }

  // ---- connection with backoff
  function connect() {
    NET.status = 'connecting'; refreshChat();
    let ws; try { ws = new WebSocket(URL_); } catch (e) { return later(); }
    NET.ws = ws;
    ws.onmessage = e => { try { onMsg(JSON.parse(e.data)); } catch (err) { console.warn('net', err); } };
    ws.onclose = ev => {
      if (NET.ws !== ws) return;
      const was = NET.status === 'online'; NET.status = 'offline'; NET.authed = false; clearAll(); NET.id = null;
      if (ev.code === 4001) { NET.sys('This Chog is open in another window.'); } else if (was) NET.sys('Lost connection to the town. Retrying…'); else if (!NET.log.some(l => l.text.startsWith('Town server offline'))) NET.sys('Town server offline. You can still walk around; chat is off.');
      refreshChat(); if (ev.code !== 4001) later();
    };
    ws.onerror = () => { };
  }
  function later() { NET.retry = Math.min(NET.retry + 1, 6); setTimeout(connect, Math.min(15000, 1000 * 2 ** NET.retry)); }
  NET.connect = connect;
  connect();
})();
