// ===== mobile: the phone companion (m.html). The hotel is played on a PC; the phone shows your room as a small live diorama and Lev answers questions about it =====
// Pairing: Lev on the PC shows a QR code for m.html#k=CODE (lev.js); the phone trades the code for a key it keeps (localStorage 'chog_phone_key').
// The server never treats this connection as a player (server/phone.js, ws url ?phone=1): nobody sees it, it can read its room and lock it, nothing else.
// Without a key: a short landing page and no 3D at all. With one: the room viewer of space.html loads (LITE render size, no supersampling) and builds the room
// from the server's document, lit by the real clock. Guests inside show live only with the security camera from the shop (camera frames, once a second);
// otherwise the phone shows the head count. Lev's lines are data (CULTURE.lev.phone in culture_data.js). Names here start with M because scripts share one scope.
// Notifications: sw.js shows what server/push.js sends (a visit, a tip, a reminder); Lev's tab turns them on and off. On an iPhone they work only from the home screen icon.
const MOB = { ws: null, authed: false, room: null, docKey: '', camera: false, inside: 0, today: { visitors: 0, tips: 0 }, events: [], guests: new Map(), three: null, levOpen: false, greeted: false, tries: 0, push: { on: false, remind: null, sub: null, bound: false } };
(function () {
  const QS0 = new URLSearchParams(location.search), $ = id => document.getElementById(id);
  const LOCAL = !location.hostname || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.hostname.endsWith('.localhost');
  const WS_URL = (QS0.get('server') || (LOCAL ? 'ws://' + (location.hostname || 'localhost') + ':8767' : 'wss://chog-town-ws.fly.dev')).replace(/\/$/, '') + '/?phone=1';
  const VER = ((document.currentScript && /[?&]v=(\w+)/.exec(document.currentScript.src)) || [])[1];          // the site build stamp (tools/build_site.py), passed on to the scripts loaded later
  const KEY = 'chog_phone_key';
  const getKey = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const setKey = k => { try { if (k) localStorage.setItem(KEY, k); else localStorage.removeItem(KEY); } catch (e) { /* private mode: the key lasts this visit */ } };
  let bootT = 0;
  const boot = on => { const b = $('boot'); clearTimeout(bootT); if (on) { b.hidden = false; b.classList.remove('off'); } else { b.classList.add('off'); bootT = setTimeout(() => { b.hidden = true; }, 450); } };          // hidden after the fade, also where transitions do not run

  // ------------------------------------------------------------------ landing: no key on this phone
  function showLanding(err) {
    $('app').hidden = true; $('landing').hidden = false; boot(false);
    const e = $('codeErr'); e.hidden = !err; e.textContent = err || '';
  }
  $('copy').onclick = async () => {
    const url = new URL('./', location.href).href, b = $('copy');
    try { await navigator.clipboard.writeText(url); b.textContent = 'Copied. Open it on your PC.'; }
    catch (e) { b.textContent = url; }
  };
  $('codeForm').onsubmit = ev => { ev.preventDefault(); const c = $('code').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length !== 8) return showLanding('A key code has 8 letters and numbers.'); start(c); };

  // ------------------------------------------------------------------ the link to the server
  let pairing = null, retryT = 0;
  function start(code) {
    pairing = code || null; boot(true); connect();
  }
  function connect() {
    clearTimeout(retryT);
    let ws; try { ws = new WebSocket(WS_URL); } catch (e) { return offline(); }
    MOB.ws = ws;
    ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } onMsg(m); };
    ws.onclose = () => { if (MOB.ws !== ws) return; MOB.ws = null; const was = MOB.authed; MOB.authed = false; if (was || getKey()) offline(); else showLanding(pairing ? 'Could not reach the hotel. Try again in a moment.' : ''); };
  }
  const send = m => { if (MOB.ws && MOB.ws.readyState === 1) MOB.ws.send(JSON.stringify(m)); };
  function offline() {
    status(); if (MOB.three) say(L().offline, { once: 'offline' });
    if (!MOB.three) { showApp(); empty(L().offline.replace(STAMP, '').trim()); }
    MOB.tries++; retryT = setTimeout(connect, Math.min(15000, 2000 * MOB.tries));
  }
  const waiters = new Set();
  const waitFor = (types, ms = 6000) => new Promise(res => { const t = setTimeout(() => done(null), ms); const h = m => { if (types.includes(m.t)) done(m); }; const done = m => { clearTimeout(t); waiters.delete(h); res(m); }; waiters.add(h); });
  function onMsg(m) {
    for (const h of [...waiters]) h(m);
    switch (m.t) {
      case 'welcome': if (pairing) send({ t: 'phonepair', code: pairing }); else if (getKey()) send({ t: 'phoneauth', key: getKey() }); else showLanding(); break;
      case 'phoneok': setKey(m.key); pairing = null; history.replaceState(null, '', location.pathname + location.search); authed(); break;
      case 'phonefail': if (!MOB.authed) { pairing = null; history.replaceState(null, '', location.pathname + location.search); showLanding(m.reason); } break;
      case 'phoneauth': if (m.ok) authed(); else { setKey(null); showLanding('This phone\'s key has expired. Ask Lev for a new one on your computer.'); } break;
      case 'm_room': onRoom(m); break;
      case 'm_count': setCount(m.inside, m.today); break;
      case 'camera': if (!m.init) onCamera(m.players || []); break;
      case 'lock': if (m.ok && MOB.room) { MOB.room.locked = !!m.locked; status(); } break;
      case 'push': MOB.push.on = !!m.on; MOB.push.remind = m.remind || null; if (!m.on && MOB.push.sub && !MOB.push.bound) { MOB.push.bound = true; send({ t: 'push_sub', sub: MOB.push.sub.toJSON() }); } if (MOB.greeted) chips(); break;
    }
  }
  function authed() { MOB.authed = true; MOB.tries = 0; send({ t: 'm_room' }); loadThree(); initPush(); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && MOB.authed) send({ t: 'm_room' }); });          // back on the phone: the owner may have redecorated

  // ------------------------------------------------------------------ the 3D room viewer (the scripts of space.html plus the trait parts, loaded only when paired)
  const SCRIPTS1 = ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'js/common.js', 'js/chog.js', 'js/chog_parts.js', 'js/chog_legends.js', 'js/chog_eyes.js', 'js/chog_hats.js', 'js/chog_bodies.js', 'js/chog_auras.js', 'js/chog_items.js', 'js/traits.js', 'js/core.js'];
  const SCRIPTS2 = ['js/space.js', 'js/space_data.js', 'js/space_layouts.js', 'js/styles.js', 'js/main.js', 'js/culture_data.js'];
  const loadSeq = list => new Promise((res, rej) => { list.forEach((src, i) => { const s = document.createElement('script'); s.src = src.startsWith('http') || !VER ? src : src + '?v=' + VER; s.async = false; if (i === list.length - 1) s.onload = res; s.onerror = () => rej(new Error(src)); document.body.appendChild(s); }); });
  function loadThree() {
    if (MOB.three) return MOB.three;
    window.LITE = true;
    MOB.three = loadSeq(SCRIPTS1).then(() => { window.world = new THREE.Group(); scene.add(world); sun.shadow.mapSize.set(1024, 1024); return loadSeq(SCRIPTS2); })
      .then(() => { animated.push(tickGuests); requestAnimationFrame(plates); showApp(); boot(false); })
      .catch(e => { console.error(e); empty('The hotel could not be drawn on this phone.'); boot(false); });
    return MOB.three;
  }
  function showApp() { $('landing').hidden = true; $('app').hidden = false; }
  function empty(text) { const e = $('empty'); e.hidden = !text; e.textContent = text || ''; }

  // ------------------------------------------------------------------ your room
  async function onRoom(m) {
    await MOB.three; if (typeof SPACE === 'undefined') return;
    MOB.room = m.room; MOB.camera = !!m.camera; MOB.events = m.events || []; setCount(m.inside || 0, m.today);
    if (!MOB.room) { clearGuests(); if (SPACE.group) { world.remove(SPACE.group); SPACE.group = null; } empty(L().noRoom.replace(STAMP, '').trim()); header(); greet(); return; }
    empty('');
    const doc = m.doc || SPACE.starterRoom(), key = JSON.stringify([m.room.size, m.room.levels, doc]);
    if (key !== MOB.docKey) {
      MOB.docKey = key; doc.pieces = (doc.pieces || []).filter(it => SPACE.PIECES[it.p]);
      SPACE.size = m.room.size; SPACE.H = 5.0; SPACE.level = m.room.levels > 1 ? { n: 1, of: m.room.levels } : null;
      SPACE.build(doc); SPACE.refreshHidden(); fit();
    }
    if (!MOB.camera) clearGuests();
    header(); status(); greet();
  }
  function fit() {                                          // the whole room in the width of the phone, a little below the clock
    const [w, d] = SPACE.size; FW = Math.max(10, (w + d) / Math.SQRT2 * 1.2); camTarget.set(0, 1.4 - FW / ASPECT * 0.04, 0); updateCam();
  }
  addEventListener('resize', () => { if (MOB.room && typeof SPACE !== 'undefined') setTimeout(fit, 200); });
  function header() {
    const r = MOB.room; $('rname').textContent = r ? r.name || 'My room' : '';
    $('rsub').textContent = r ? (r.floor < 0 ? 'Cold storage · ' + r.tag : 'Room ' + r.no + ' · Floor ' + r.floor) : '';
  }
  function setCount(n, today) {
    if (n > MOB.inside && !MOB.levOpen && MOB.greeted) $('levDot').classList.add('on');          // somebody walked in: Lev has news
    MOB.inside = n; if (today) MOB.today = today; status();
  }
  function status() {
    const s = $('status'), r = MOB.room; s.hidden = !r; if (!r) return;
    s.classList.toggle('locked', !!r.locked); s.classList.toggle('off', !MOB.authed);
    const n = MOB.inside, who = n === 0 ? 'nobody inside' : n === 1 ? '1 inside' : n + ' inside';
    s.querySelector('span').textContent = !MOB.authed ? 'Reconnecting…' : (r.locked ? 'Door locked · ' : 'Door open · ') + who + (MOB.camera || !n ? '' : ' · the security camera shows who');
  }
  // the clock and the sky icon follow the phone's own clock (the room's light follows the same hour, space.js)
  function clockTick() {
    const d = new Date(), h = d.getHours(); $('clock').textContent = String(h).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const night = h < 7 || h >= 19; $('skyPath').setAttribute('d', night ? 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z' : 'M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10z');
  }
  clockTick(); setInterval(clockTick, 15000);

  // ------------------------------------------------------------------ guests (security camera only): a Chog per player, walking to where the server says
  let TOK = null;
  const tokensReady = () => TOK || (TOK = fetch('data/tokens.json' + (VER ? '?v=' + VER : '')).then(r => r.json()).then(j => { const t = j.tokens || {}; for (const v of Object.values(t)) { const m = / — (.+)$/.exec(v.name || ''); if (m && v.traits && v.traits.Base === '1:1') v.traits.Legend = m[1]; } return t; }).catch(() => ({})));
  async function onCamera(list) {
    if (!MOB.camera || typeof SPACE === 'undefined') return;
    const tokens = list.some(p => p.token) ? await tokensReady() : {}, seen = new Set();
    for (const p of list) {
      if (p.l !== 1) continue; seen.add(p.id);
      let g = MOB.guests.get(p.id);
      if (!g || g.token !== p.token) {
        if (g) dropGuest(g);
        const tr = p.token && tokens[p.token] ? tokens[p.token].traits : DEFAULT_TRAITS, root = chogFromTraits(tr, { scale: CHOG_SCALE });
        root.position.set(p.x, 0, p.z); world.add(root);
        const e = document.createElement('div'); e.className = 'm-plate' + (p.owner ? ' owner' : p.token ? ' holder' : ''); e.innerHTML = '<i></i><b></b>'; e.querySelector('b').textContent = p.name; $('pills').appendChild(e);
        g = { root, token: p.token, e }; MOB.guests.set(p.id, g);
      }
      Object.assign(g, { x: p.x, z: p.z, ry: p.ry || 0, mv: !!p.mv, name: p.name });
    }
    for (const [id, g] of MOB.guests) if (!seen.has(id)) { dropGuest(g); MOB.guests.delete(id); }
  }
  const dropGuest = g => { world.remove(g.root); g.e.remove(); };
  function clearGuests() { for (const g of MOB.guests.values()) dropGuest(g); MOB.guests.clear(); }
  function tickGuests(t, dt) {
    for (const g of MOB.guests.values()) {
      const p = g.root.position, k = Math.min(1, dt * 6), dx = g.x - p.x, dz = g.z - p.z, moving = g.mv || dx * dx + dz * dz > 0.004;
      p.x += dx * k; p.z += dz * k; let da = g.ry - g.root.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); g.root.rotation.y += da * k;
      const u = g.root.userData, sw = moving ? Math.sin(t * 11) * 0.55 : 0;
      if (u.legs) { u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw; } if (u.arms) { u.arms[0].rotation.x = -sw * 0.6; u.arms[1].rotation.x = sw * 0.6; }
    }
  }
  const V3 = () => new THREE.Vector3();
  function plates() {                                       // the name tags follow the Chogs on screen
    requestAnimationFrame(plates); if (!MOB.guests.size) return;
    const v = V3();
    for (const g of MOB.guests.values()) { v.copy(g.root.position); v.y += 1.75; v.project(cam); g.e.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; g.e.style.top = ((1 - v.y) / 2 * innerHeight) + 'px'; }
  }

  // ------------------------------------------------------------------ Lev's line
  const STAMP = '*stamp*';
  const L = () => (typeof CULTURE !== 'undefined' && CULTURE.lev && CULTURE.lev.phone) || { offline: 'The line is down. *stamp*', noRoom: 'No room is registered to this key. *stamp*', hello: ['Front desk. *stamp*'], chips: {} };
  const fill = (t, d) => String(t).replace(/\{(\w+)\}/g, (m, k) => (d && d[k] !== undefined ? d[k] : ''));
  const byCount = (arr, n, d) => fill(arr[Math.min(n, 2)], Object.assign({ n }, d));
  const door = () => (MOB.room ? (MOB.room.floor < 0 ? MOB.room.tag : MOB.room.no) : '');
  let queue = Promise.resolve(); const said = new Set();
  function bubble(text, me) {
    const box = $('msgs'), row = document.createElement('div');
    if (me) { const b = document.createElement('div'); b.className = 'm-bub me'; b.textContent = text; box.appendChild(b); box.scrollTop = box.scrollHeight; return b; }
    row.className = 'm-row'; const last = box.lastElementChild, cont = last && last.classList.contains('m-row');
    if (cont) { const m = last.querySelector('.mini'); if (m) m.replaceWith(Object.assign(document.createElement('span'), { className: 'gap' })); }
    const av = document.createElement('img'); av.className = 'mini'; av.src = 'data/portraits/lev.webp'; av.alt = ''; row.appendChild(av);
    const b = document.createElement('div'); b.className = 'm-bub lev'; row.appendChild(b); box.appendChild(row);
    const stamped = text.includes(STAMP); b.textContent = text.split(STAMP).join('').replace(/\s+/g, ' ').trim();
    if (stamped) { b.classList.add('stamped'); const s = document.createElement('span'); s.className = 'stamp'; s.textContent = 'APPROVED'; b.appendChild(s); }
    box.scrollTop = box.scrollHeight; return b;
  }
  function say(text, o = {}) {
    if (!text) return queue; if (o.once) { if (said.has(o.once)) return queue; said.add(o.once); }
    queue = queue.then(async () => {
      const t = bubble('· · ·'); t.classList.add('typing'); await new Promise(r => setTimeout(r, MOB.levOpen ? 450 + Math.min(700, text.length * 8) : 0));
      t.parentElement.remove(); bubble(text);
    });
    return queue;
  }
  function greet() {
    if (MOB.greeted) { chips(); return; } MOB.greeted = true;
    const P = L();
    if (!MOB.room) { say(P.noRoom); chips(); return; }
    say(fill(P.hello[Math.floor(Math.random() * P.hello.length)], { no: door() }));
    if (MOB.room.floor < 0) say(fill(P.basement, { no: door() }));
    report(); chips();
  }
  function report() {
    const P = L(); say(byCount(P.inside, MOB.inside)); say(byCount(P.today, MOB.today.visitors)); if (MOB.today.tips > 0) say(byCount(P.tips, MOB.today.tips));
  }
  function chips() {
    const P = L(), C = P.chips || {}, box = $('chips'); box.innerHTML = '';
    const add = (label, fn, main) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (main) b.className = 'main'; b.onclick = () => { bubble(label, true); fn(); }; box.appendChild(b); };
    if (MOB.room) {
      add(C.who, () => { const names = [...MOB.guests.values()].map(g => g.name); say(!MOB.inside ? byCount(P.inside, 0) : MOB.camera && names.length ? fill(P.who, { names: names.join(', ') }) : fill(P.whoBlind, { n: MOB.inside })); }, true);
      add(C.today, () => { say(byCount(P.today, MOB.today.visitors)); if (MOB.today.tips > 0) say(byCount(P.tips, MOB.today.tips)); });
    }
    add(C.tonight, () => { const list = MOB.events.map(e => e.name + ' (' + e.door + '): ' + e.title).join('; '); say(byCount(P.tonight, MOB.events.length, { list })); });
    if (MOB.room) add(MOB.room.locked ? C.unlock : C.lock, async () => {
      const want = !MOB.room.locked; send({ t: 'roomlock', locked: want }); const r = await waitFor(['lock'], 6000);
      if (r && r.ok) { MOB.room.locked = !!r.locked; status(); say(fill(r.locked ? P.locked : P.unlocked, { no: door() })); }
      else say(fill(P.lockFailed.form, { reason: r ? r.reason : 'the hotel did not answer.' }) + ' ' + P.lockFailed.aside);
      chips();
    });
    if (MOB.room) {
      if (!MOB.push.on) add(C.pushOn, enablePush);
      else { add(MOB.push.remind ? C.remindOff : C.remind, toggleRemind); add(C.pushOff, disablePush); }
    }
  }
  // ------------------------------------------------------------------ notifications (Web Push through sw.js)
  const PUSH_OK = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let swReg = null;
  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, c => c.charCodeAt(0)); };
  async function initPush() {                               // a phone that already said yes: tell the server which wallet it rings for now
    if (!PUSH_OK || swReg) return;
    try { swReg = await navigator.serviceWorker.register('sw.js'); const sub = await swReg.pushManager.getSubscription(); MOB.push.sub = sub; if (sub) send({ t: 'push_state', endpoint: sub.endpoint }); }
    catch (e) { swReg = null; }
  }
  async function enablePush() {
    const P = L();
    if (!PUSH_OK || !swReg) { say(IOS && !STANDALONE ? P.pushIos : P.pushNone); return; }
    let perm = Notification.permission; if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') { say(P.pushDenied); return; }
    try {
      send({ t: 'push_key' }); const k = await waitFor(['push_key'], 6000); if (!k) throw new Error('the hotel did not answer.');
      const old = await swReg.pushManager.getSubscription(); if (old) await old.unsubscribe().catch(() => { });          // a fresh subscription, in case the server's key changed
      const sub = await swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.key) });
      MOB.push.sub = sub; MOB.push.bound = true; send({ t: 'push_sub', sub: sub.toJSON() }); const r = await waitFor(['push', 'phonefail'], 6000);
      if (!r || r.t !== 'push' || !r.on) throw new Error((r && r.reason) || 'the hotel did not answer.');
      say(P.pushOn);
    } catch (e) { say(fill(P.pushFailed.form, { reason: (e && e.message) || 'that did not work.' }) + ' ' + P.pushFailed.aside); }
    chips();
  }
  async function disablePush() {
    const sub = MOB.push.sub; if (sub) { send({ t: 'push_unsub', endpoint: sub.endpoint }); await waitFor(['push'], 4000); sub.unsubscribe().catch(() => { }); }
    MOB.push = { on: false, remind: null, sub: null, bound: false }; say(L().pushOff); chips();
  }
  async function toggleRemind() {
    const P = L(), sub = MOB.push.sub; if (!sub) return;
    const at = new Date(); at.setHours(21, 0, 0, 0); if (at.getTime() <= Date.now() + 60e3) at.setDate(at.getDate() + 1);          // the next 21:00 on this phone's clock
    const cancel = !!MOB.push.remind; send({ t: 'push_remind', endpoint: sub.endpoint, at: cancel ? 0 : at.getTime() }); const r = await waitFor(['push'], 6000);
    if (r) say(fill(cancel ? P.remindOff : P.remindSet, { time: '21:00' })); chips();
  }
  function openLev(on) {
    MOB.levOpen = on; $('lev').hidden = !on; $('tabLev').classList.toggle('on', on); $('tabRoom').classList.toggle('on', !on);
    if (on) { $('levDot').classList.remove('on'); const box = $('msgs'); box.scrollTop = box.scrollHeight; }
  }
  $('tabLev').onclick = () => openLev(true); $('tabRoom').onclick = () => openLev(false); $('levClose').onclick = () => openLev(false);
  $('unpair').onclick = () => { if (!confirm('Forget this phone? You will need a new key from Lev to see your room here again.')) return; setKey(null); location.replace(location.pathname); };

  // ------------------------------------------------------------------ go
  const code = (/[#&]k=([A-Za-z0-9-]+)/.exec(location.hash) || [])[1];
  if (code) start(code.toUpperCase().replace(/[^A-Z0-9]/g, '')); else if (getKey()) start(null); else showLanding();
  MOB.test = { onRoom, onCamera, say, openLev };
})();
