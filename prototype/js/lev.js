// ===== lev: the receptionist of the Chog Hotel, his menu, the first-visit prologue, the key cut-scene and "go to my room" (docs/game/world.md, build-plan "Rooms for everyone") =====
// Lev is a former trader who got liquidated and took the night shift for good. His lines are data in culture_data.js (CULTURE.lev); this file plays them.
//   LEV.make()       builds his Chog (hotel uniform, name badge, cold coffee); hotel.js puts it behind the desk and calls LEV.talk() on a click or E.
//   LEV.talk()       the dialog: Room list / Check in / Upgrade my room / Bring my room back up / Bye. The very first visit runs the prologue (greeting, room list, check-in, key cut-scene).
//   cut-scene        fade to black, you stand in the hall at your door, a CLIENT-ONLY Lev (nobody else sees him; the real one stays at the desk) hands you a key, says his line and walks to the elevator.
//                    Input is locked meanwhile (GAME.locked); Esc skips. Used by check-in, and by an upgrade (a move to a new door gets the key, a growth in place only a short fade and a line).
//   LEV.goMyRoom()   the R key / "My Room" button: from the street walk to the Hotel and land at your door; in the Hotel go to your door; no room yet: to Lev.
//   LEV.onLobby()    called by hotel.js when the lobby is shown: a player whose room went to the basement is greeted with the cold-storage line.
// Loaded after firststeps.js. Names here start with LEV because every script shares one global scope. State in localStorage ('chog_lev'), always in try/catch.
const LEV = { st: { met: false, guest: false }, busy: false, pending: null, skip: null, cut: false };
(function () {
  const KEY = 'chog_lev', wait = ms => new Promise(r => setTimeout(r, ms));
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(LEV.st)); } catch (e) { /* ignore */ } };
  const saved = load(); if (saved) Object.assign(LEV.st, saved);
  if (QS.has('lev')) LEV.st = { met: false, guest: false };                                         // ?lev=1: the prologue again (testing)
  const C = () => CULTURE.lev, holders = {}, pick = (arr, k) => CULTURE.pick(arr, holders[k] || (holders[k] = {}));
  const fill = (t, d) => String(t).replace(/\{(\w+)\}/g, (m, k) => (d && d[k] !== undefined ? d[k] : ''));
  const beatsOf = (x, d) => (typeof x === 'string' ? [fill(x, d)] : [fill(x.form, d), fill(x.aside, d)]);          // { form, aside } = the formal statement, then his own aside
  const has = () => typeof VENUE !== 'undefined' && !!VENUE.mine;
  const dOf = m => ({ no: m ? (m.tag || m.no) : '', floor: m ? (m.floor < 0 ? 'B' + (-m.floor) : m.floor) : '' });
  const sfx = n => { if (typeof sfxPlay === 'function') sfxPlay(n); };
  const TRAITS = { Background: 'Light Purple', Base: 'Origin', Form: 'Chog', Skin: 'Grey', Eyes: 'Tired', Mouth: 'Flat', Side: 'Right', Naked: 'No', Body: 'Lev Uniform', Tier: 'Common' };

  // ------------------------------------------------------------------ his look: grey hair, tired eyes with bags, a flat mouth, a dark jacket that is a little too neat (long sleeves of the same cloth, white shirt in the V, wine tie), dark trousers, a gold name badge, a cold coffee in his hand
  // The uniform is painted onto the torso skin like every outfit in chog_bodies.js (so it wraps all the way round: shirt front, tie and badge in front; collar yoke and centre seam at the back)
  // and the shirt collar, the jacket's sleeves and the trousers are 3D parts all round. Nothing stands off the body.
  const LEVC = 0x2a2c34;
  BODY_LOOK['Lev Uniform'] = {
    c: LEVC, long: true, pants: 0x23242c,                                                     // the sleeves are the jacket's cloth (they were white shirt sleeves and read as bare arms)
    draw: g => {
      const edge = shade(LEVC, 1.55), dark = shade(LEVC, 0.6), brass = '#e8c35a';
      BD.poly(g, '#f4f0e4', [[-0.1, -0.23], [0.1, -0.23], [0.0, 0.08]]);                                  // the shirt in the jacket's V
      BD.path(g, edge, 4, [[-0.1, -0.23], [0.0, 0.08], [0.1, -0.23]]); BD.path(g, dark, 3, [[0.0, 0.08], [0.0, 0.23]]);
      BD.poly(g, '#7a1c2e', [[-0.03, -0.215], [0.03, -0.215], [0.022, -0.165], [-0.022, -0.165]]);          // the tie: knot, then the blade
      BD.poly(g, '#7a1c2e', [[-0.022, -0.165], [0.022, -0.165], [0.042, -0.01], [0.0, 0.045], [-0.042, -0.01]]);
      for (const v of [0.125, 0.185]) BD.disc(g, shade(LEVC, 1.9), 0.0, v, 0.012, 0.018);
      BD.rect(g, brass, 0.05, -0.105, 0.19, -0.04); BD.path(g, '#8a6a1c', 3, [[0.05, -0.105], [0.19, -0.105], [0.19, -0.04], [0.05, -0.04]], true);          // the name badge
      BD.text(g, 'LEV', 0.12, -0.087, 0.03, '#3a2a10'); BD.text(g, 'NIGHT SHIFT', 0.12, -0.056, 0.0105, '#3a2a10', { font: '700 100px "Nunito", sans-serif' });
      BD.rect(g, shade(LEVC, 0.8), -0.72, 0.205, 0.72, 0.23);                                              // the hem, all round
      for (const e of [-1, 1]) {                                                                           // the back (u = +-0.72 is the seam behind): collar yoke and seam
        BD.rect(g, '#f4f0e4', e > 0 ? 0.5 : -0.74, -0.23, e > 0 ? 0.74 : -0.5, -0.185); BD.path(g, dark, 4, [[e * 0.72, -0.19], [e * 0.72, 0.2]]);
      }
    },
    build: ctx => collar(ctx, 0xf4f0e4, 0.2, 0.05, 0.76),                                                  // the shirt collar, all round the neck
  };
  LEV.make = function (k = 1) { return chogFromTraits(TRAITS, { scale: CHOG_SCALE * k, item: 'mug' }); };
  // idle: slow breathing, a heavy blink, the head a little low, and now and then a sip of the cold coffee
  LEV.idle = function (npc, t) {
    const u = npc.userData, b = Math.sin(t * 1.4) * 0.012, c = (t % 16) / 16, sip = c > 0.84 ? Math.sin((c - 0.84) / 0.16 * Math.PI) : 0;
    u.body.position.y = b; u.head.position.y = 1.0 + b * 1.4; u.head.rotation.x = 0.07 + Math.sin(t * 0.45) * 0.03 + sip * -0.12; u.legs.forEach(l => l.rotation.x = 0);
    u.arms[0].rotation.x = Math.sin(t * 1.4) * 0.04; u.arms[1].rotation.x = -sip * 1.25; u.arms[1].rotation.z = 0.02;
    const blink = Math.sin(t * 0.8) > 0.975 ? 0.12 : 1; u.eyes.forEach(e => e.scale.y = (e.userData.by || 0.095) * blink);
  };

  // ------------------------------------------------------------------ the dialog box (bottom of the screen, typed out, click or Space to go on, Esc closes)
  let box = null, cancelCur = null, advanceCur = null;
  const STAMP = '*stamp*';
  const unitsOf = s => { const out = []; for (let i = 0; i < s.length;) { if (s.startsWith(STAMP, i)) { out.push(STAMP); i += STAMP.length; } else out.push(s[i++]); } return out; };
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function ensureBox() {
    if (box) return box;
    box = document.createElement('div'); box.id = 'levbox';
    box.innerHTML = '<div class="lv-face"><img alt=""></div><div class="lv-main"><div class="lv-name"><b>Lev</b><small>Night shift</small></div><p class="lv-text"></p><div class="lv-opts"></div></div><i class="lv-next">▼</i>';
    document.body.appendChild(box);
    try { box.querySelector('img').src = portrait(TRAITS); } catch (e) { box.querySelector('.lv-face').style.display = 'none'; }
    return box;
  }
  function closeBox() { if (cancelCur) cancelCur(null); if (box) box.classList.remove('on', 'narrow'); }
  // beats: a string or a list of strings; buttons: [{ id, label, ghost }] shown after the last beat; o.auto: ms to wait after each beat, then go on by itself; o.narrow: leave room for the directory.
  // -> a promise: the id of the button pressed, or null (no buttons: after the last beat; closed or skipped: null too)
  function speak(beats, buttons, o = {}) {
    beats = [].concat(beats); ensureBox(); if (cancelCur) cancelCur(null); box.classList.add('on'); box.classList.toggle('narrow', !!o.narrow); box.classList.toggle('cut', !!o.cut);
    if (o.narrow) { const hp = document.querySelector('#ui .hp'), r = hp ? innerWidth - hp.getBoundingClientRect().left + 14 : 480; box.style.right = r + 'px'; box.style.width = Math.min(560, innerWidth - r - 16) + 'px'; } else { box.style.right = ''; box.style.width = ''; }
    const txt = box.querySelector('.lv-text'), opts = box.querySelector('.lv-opts'), nx = box.querySelector('.lv-next');
    return new Promise(resolve => {
      let i = 0, un = [], n = 0, timer = 0, auto = 0, done = false, typed = false;
      const finish = id => { if (done) return; done = true; clearInterval(timer); clearTimeout(auto); if (cancelCur === cancel) cancelCur = advanceCur = null; box.onclick = null; resolve(id); };
      const cancel = () => finish(null);
      const paint = () => { txt.innerHTML = un.slice(0, n).map(x => (x === STAMP ? '<em class="stamp">stamp</em>' : esc(x))).join(''); };
      const afterTyped = () => {
        typed = true; const last = i >= beats.length - 1;
        if (!last) { nx.style.display = 'block'; if (o.auto) auto = setTimeout(advance, o.auto + beats[i].length * 28); return; }
        if (buttons && buttons.length) {
          nx.style.display = 'none'; opts.innerHTML = '';
          for (const b of buttons) { const bt = document.createElement('button'); bt.className = 'lv-btn' + (b.ghost ? ' ghost' : ''); bt.textContent = b.label; bt.onclick = ev => { ev.stopPropagation(); sfx('click'); finish(b.id); }; opts.appendChild(bt); }
        } else if (o.auto) auto = setTimeout(() => finish(null), o.auto + beats[i].length * 28);
        else nx.style.display = 'block';
      };
      const start = () => {
        un = unitsOf(beats[i]); n = 0; typed = false; opts.innerHTML = ''; nx.style.display = 'none'; paint();
        timer = setInterval(() => { n = Math.min(un.length, n + 2); if (un[n - 1] === STAMP || un[n - 2] === STAMP) sfx('place'); paint(); if (n >= un.length) { clearInterval(timer); afterTyped(); } }, 24);
      };
      const advance = () => {
        if (done) return; clearTimeout(auto);
        if (!typed) { clearInterval(timer); n = un.length; paint(); afterTyped(); return; }
        if (i < beats.length - 1) { i++; start(); } else if (!(buttons && buttons.length)) finish(null);
      };
      cancelCur = cancel; advanceCur = advance; box.onclick = e => { if (!e.target.closest('button')) advance(); }; start();
    });
  }

  // ------------------------------------------------------------------ the conversation
  async function ready() {                                                                               // the room list needs the server's answer for this wallet
    if (!WALLET.account || typeof VENUE === 'undefined') return;
    if (!VENUE.info && NET.status === 'online' && NET.hotel) await VENUE.refresh();
    for (let i = 0; i < 60 && !VENUE.info && VENUE.busy; i++) await wait(150);
  }
  LEV.talk = async function () {
    if (LEV.busy || GAME.locked || HOTEL.busy || !HOTEL.active || HOTEL.floor !== 0) return;
    HOTEL.panel = null; HOTEL.refreshUI(); LEV.busy = true;
    try { await ready(); if (!has() && !LEV.st.met) await prologue(); else await menu(has() ? beatsOf(pick(C().helloBack, 'back'), dOf(VENUE.mine)) : beatsOf(pick(C().hello, 'hello'))); }
    finally { LEV.busy = false; closeBox(); }
  };
  async function menu(beats) {
    const M = C().menu;
    for (;;) {
      const m = has() ? VENUE.mine : null, opts = [{ id: 'list', label: M.list }];
      if (!m) opts.push({ id: 'checkin', label: M.checkin }); else opts.push({ id: 'upgrade', label: M.upgrade });
      if (m && m.basement) opts.push({ id: 'up', label: M.up });
      opts.push({ id: 'bye', label: M.bye, ghost: true });
      const id = await speak(beats, opts);
      if (id === null) return;
      if (id === 'bye') { await speak(pick(C().bye, 'bye'), null, { auto: 1100 }); return; }
      if (id === 'list') { await listFlow(); return; }
      if (id === 'checkin') { const r = await checkInFlow(); if (r === 'done') return; beats = r; continue; }
      if (id === 'upgrade') {
        await speak(beatsOf(C().upgrade.ask), null, { auto: 500 });
        const r = await VENUE.upgrade(); if (r && r.ok) { await cutscene(r.mine || VENUE.mine, r.moved ? 'moved' : 'grown'); return; }
        const U = C().upgrade, d = dOf(VENUE.mine); beats = !r ? [U.busy] : r.code === 'busy' ? [U.busy] : U[r.code] ? beatsOf(U[r.code], d) : beatsOf(U.failed, { reason: r.reason || 'that did not work.' }); continue;
      }
      if (id === 'up') {
        const r = await VENUE.reactivate(), B = C().basement;
        beats = r && r.ok ? beatsOf(B.back, dOf(r.mine || VENUE.mine)) : !r || r.code === 'busy' ? [B.busy] : B[r.code] ? beatsOf(B[r.code]) : beatsOf(B.failed, { reason: (r && r.reason) || 'that did not work.' });
      }
    }
  }
  // the room list: the directory opens; closed without a room chosen, Lev says one of his barks
  async function listFlow() {
    closeBox(); HOTEL.openPanel('dir');
    await new Promise(res => { const t = setInterval(() => { if (HOTEL.panel !== 'dir' || !HOTEL.active) { clearInterval(t); res(); } }, 100); });
    await wait(120); if (HOTEL.busy || !HOTEL.active || HOTEL.floor !== 0) return;                       // a room was chosen: the elevator is already on its way
    await speak(pick(C().barks, 'bark'), null, { auto: 2200 });
  }
  // check in. -> 'done' (the cut-scene or the temporary room followed) or the beats to show in the menu again
  async function checkInFlow() {
    const K = C().checkin;
    if (!WALLET.account) return await guestFlow();
    if (NET.status !== 'online' || !NET.hotel) return beatsOf(K.offline);
    const p = VENUE.checkIn(); speak(K.sign, null);                                                      // the wallet asks for a free signature while he says so
    const r = await p;
    if (!r) return [C().upgrade.busy];
    if (!r.ok) return r.reason === 'declined' ? [K.declined] : beatsOf(K.failed, { reason: r.reason || 'that did not work.' });
    const d = dOf(r.mine || VENUE.mine); if (r.already) return beatsOf(K.already, d);
    LEV.st.met = true; store();
    if (await speak(beatsOf(K.done, d), [{ id: 'go', label: 'Take the key' }]) === null) return 'done';
    await cutscene(r.mine || VENUE.mine, 'first'); return 'done';
  }
  // no wallet: only a temporary room (not saved, no door number); a free signature gets a real one. Then the screen fades into the temporary room.
  async function guestFlow() {
    const G = C().guest, id = await speak([G[0], G[1]], [{ id: 'temp', label: 'A temporary room, then' }, { id: 'connect', label: 'Connect a wallet', ghost: true }]);
    if (id === 'connect') { closeBox(); if (typeof connectFlow === 'function') connectFlow(); return 'done'; }
    if (id !== 'temp') return 'done';
    LEV.st.met = true; LEV.st.guest = true; store();
    await speak(G[2], null, { auto: 700 }); closeBox();
    await HOTEL.fade(async () => { await ROOM.enterSolo(); });
    return 'done';
  }
  // the first visit: greeting, the room list shown briefly as the hotel's pride, then the check-in and the key
  async function prologue() {
    const F = C().first;
    if (await speak(F.greet, [{ id: 'next', label: 'Next' }]) === null) return;
    HOTEL.openPanel('dir');
    const id = await speak(F.directory, [{ id: 'next', label: 'Next' }], { narrow: true }); HOTEL.closePanel(); if (id === null) return;
    await speak(F.afterDirectory, null, { auto: 450 });
    const r = await checkInFlow(); if (r === 'done') return;
    await menu(r);
  }

  // ------------------------------------------------------------------ input lock during a cut-scene (Esc skips); the dialog box keeps its own clicks
  function setLock(on) { GAME.locked = on; LEV.cut = on; document.body.classList.toggle('levcut', on); if (on) { GAME.keys = {}; GAME.path = []; GAME.run = false; } }
  addEventListener('keydown', e => {
    if (!GAME.locked) return;
    if (e.code === 'Escape' && LEV.skip) LEV.skip(); else if ((e.code === 'Space' || e.code === 'Enter') && advanceCur) advanceCur();
    e.stopImmediatePropagation(); e.preventDefault();
  }, true);
  for (const ev of ['pointerdown', 'pointerup', 'contextmenu']) addEventListener(ev, e => { if (GAME.locked && e.target === renderer.domElement) e.stopImmediatePropagation(); }, true);
  addEventListener('keydown', e => { if (e.code === 'Escape' && box && box.classList.contains('on') && !GAME.locked && !(e.target.matches && e.target.matches('input,textarea'))) closeBox(); });

  // ------------------------------------------------------------------ the key cut-scene (the Lev in it exists on this screen only)
  let chipEl = null, chipT = 0;
  function chip(text) {
    if (!chipEl) { chipEl = document.createElement('div'); chipEl.id = 'levchip'; chipEl.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/></svg><b></b>'; document.body.appendChild(chipEl); }
    chipEl.querySelector('b').textContent = text; chipEl.classList.add('on'); clearTimeout(chipT); chipT = setTimeout(() => chipEl.classList.remove('on'), 4600);
  }
  function keyMesh() {                                                                                    // a small brass key: ring, shaft, two teeth
    const g = new THREE.Group(), m = tmat(0xf2c23a, { em: 0.7 }); g.scale.setScalar(1.7);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 12), m); ring.position.x = -0.12; g.add(ring);
    g.add(BOX(0.24, 0.035, 0.035, m, 0.04, 0, 0)); g.add(BOX(0.035, 0.07, 0.035, m, 0.13, -0.045, 0)); g.add(BOX(0.035, 0.05, 0.035, m, 0.075, -0.035, 0));
    g.traverse(o => { if (o.isMesh) o.userData.noOutline = true; }); return g;
  }
  let cs = null;                                                                                          // the running scene: { lv, plate, key, phase, t0, ... }
  const ease = x => x * x * (3 - 2 * x);
  animated.push((t, dt) => {
    if (!cs) return; const now = performance.now(), me = GAME.me, lv = cs.lv, u = lv.userData, el = (now - cs.t0) / 1000;
    if (cs.phase === 'idle') LEV.idle(lv, now / 1000);
    else if (cs.phase === 'give') {                                                                       // arm up, the key flies from his hand to yours, arm down
      LEV.idle(lv, now / 1000); const k = Math.min(1, el / 0.45); u.arms[1].rotation.x = -1.35 * ease(k) * (el > 1.7 ? Math.max(0, 1 - (el - 1.7) / 0.35) : 1);
      const hx = lv.position.x + cs.fx * 0.5, hz = lv.position.z + cs.fz * 0.5, tx = me.position.x, tz = me.position.z, f = Math.min(1, Math.max(0, (el - 0.5) / 1.0));
      cs.key.visible = el > 0.2 && f < 1; cs.key.position.set(hx + (tx - hx) * ease(f), 0.85 + Math.sin(f * Math.PI) * 0.35 + (1.0 - 0.85) * f, hz + (tz - hz) * ease(f)); cs.key.rotation.set(0, el * 5, 0.3);
      if (f >= 1 && !cs.given) { cs.given = true; sfx('purchase'); chip(cs.chipText); }
    } else if (cs.phase === 'walk') {                                                                     // to the elevator, then gone
      const p = cs.path, L = cs.len, d = Math.min(L, el * 2.5); let acc = 0, a = p[0], b = p[1];
      for (let i = 1; i < p.length; i++) { const sl = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); a = p[i - 1]; b = p[i]; if (acc + sl >= d) { const q = (d - acc) / Math.max(1e-6, sl); lv.position.x = a[0] + (b[0] - a[0]) * q; lv.position.z = a[1] + (b[1] - a[1]) * q; lv.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]); break; } acc += sl; if (i === p.length - 1) { lv.position.x = b[0]; lv.position.z = b[1]; } }
      const ph = el * 9; u.legs[0].rotation.x = Math.sin(ph) * 0.7; u.legs[1].rotation.x = -Math.sin(ph) * 0.7; u.arms[0].rotation.x = -Math.sin(ph) * 0.5; u.arms[1].rotation.x = Math.sin(ph) * 0.5; u.body.position.y = Math.abs(Math.sin(ph)) * 0.02;
      if (d >= L) { const k = Math.min(1, (el - L / 2.5) / 0.35); lv.scale.setScalar(cs.base * Math.max(0.001, 1 - ease(k))); if (!cs.dinged) { cs.dinged = true; sfx('elevator_ding'); } if (k >= 1) cs.phase = 'gone'; }
    }
  });
  const phase = (ph) => { cs.phase = ph; cs.t0 = performance.now(); };
  function dropScene() {
    if (!cs) return; const c = cs; cs = null; if (c.plate) PLATES.remove(c.plate);
    for (const o of [c.lv, c.key]) if (o && o.parent) o.parent.remove(o);
  }
  // kind: 'first' (check-in), 'moved' (a new door), 'grown' (the same door, wider). m: the room (VENUE.mine after the call).
  async function cutscene(m, kind) {
    const K = C().key, U = C().upgrade, d = dOf(m); let skipped = false;
    closeBox(); setLock(true);
    const skipP = new Promise(res => { LEV.skip = () => { skipped = true; if (cancelCur) cancelCur(null); res(); }; });
    const nap = ms => Promise.race([wait(ms), skipP]);
    try {
      const withLev = kind !== 'grown', ok = await HOTEL.arrive(m, async () => {
        await nap(520); const me = GAME.me, st = HOTEL.doorOf(m).stand, wallZ = HOTEL.doorOf(m).wall === 'z';
        if (!withLev) { me.rotation.y = wallZ ? 0 : Math.PI / 2; return; }
        const lx = wallZ ? st.x - 1.5 : st.x, lz = wallZ ? st.z : st.z - 1.5, lv = LEV.make(), g = HOTEL.sceneGroup(), key = keyMesh();
        lv.position.set(lx, 0, lz); lv.rotation.y = Math.atan2(st.x - lx, st.z - lz); me.rotation.y = Math.atan2(lx - st.x, lz - st.z); g.add(lv); key.visible = false; g.add(key);
        const fx = Math.sin(lv.rotation.y), fz = Math.cos(lv.rotation.y), plate = PLATES.add(lv, 'Night shift'); lv.userData.netName = 'Lev';
        const path = wallZ ? [[lx, lz], [-10.25, lz], [-10.25, -11.35]] : [[lx, lz], [st.x, -9.7], [-10.25, -9.7], [-10.25, -11.35]];
        cs = { lv, key, plate, base: lv.scale.x, fx, fz, path, len: path.reduce((s, p, i) => s + (i ? Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]) : 0), 0), phase: 'idle', t0: performance.now(), chipText: 'Room ' + d.no + ' key' };
      });
      if (!ok) { toast('The Hotel did not answer. Your room is still yours: press R.'); return; }
      if (kind === 'grown') { await nap(250); if (!skipped) await speak(beatsOf(U.grown, d), null, { auto: 1100, cut: true }); return; }
      if (!skipped) { if (kind === 'moved') { await speak(beatsOf(U.moved, d), null, { auto: 1100, cut: true }); if (!skipped) await speak(fill(K.moved, d), null, { auto: 500, cut: true }); } else await speak(fill(K.first, d), null, { auto: 500, cut: true }); }
      if (!skipped) { phase('give'); await nap(2100); }
      if (cs && !cs.given) { cs.given = true; chip(cs.chipText); }
      if (!skipped && kind === 'first') { speak(K.leaving, null, { auto: 1200, cut: true }); await nap(600); }
      if (!skipped && cs) { phase('walk'); await nap(cs.len / 2.5 * 1000 + 800); }
    } finally {
      if (cs && !cs.given) { chip(cs.chipText); } closeBox(); dropScene(); LEV.skip = null; setLock(false);
    }
  }

  // ------------------------------------------------------------------ the lobby: the cold-storage line, a nudge for a new arrival
  LEV.onLobby = async function () {
    await wait(1500); if (!HOTEL.active || HOTEL.floor !== 0 || LEV.busy) return;
    await ready(); if (!HOTEL.active || HOTEL.floor !== 0 || LEV.busy) return;
    if (has() && VENUE.mine.basement) { LEV.busy = true; try { await speak(C().basement.lobby, null, { auto: 2600 }); } finally { LEV.busy = false; closeBox(); } return; }
    if (!has() && !LEV.st.met) toast('Talk to Lev at the desk: click him, or press E.');
  };

  // ------------------------------------------------------------------ "my room" (the R key, the My Room button, the checklist)
  const meNear = () => { const d = CITY.doors.hotel, me = GAME.me.position; return Math.hypot(me.x - d.x, me.z - d.out) < 2.6; };
  function toHotel(kind) {
    if (meNear()) return arriveHotel(kind);
    LEV.pending = { kind, idle: 0 }; if (typeof FIRST !== 'undefined') FIRST.goPlace('hotel');
  }
  function arriveHotel(kind) {
    LEV.pending = null; const m = has() ? VENUE.mine : null;
    if (kind === 'room' && m) HOTEL.gotoVenue(m); else HOTEL.enterFromTown();
  }
  LEV.goMyRoom = async function () {
    if (LEV.busy || GAME.locked || HOTEL.busy || ROOM.busy || !GAME.me) return;
    LEV.pending = null; await ready();
    const m = has() ? VENUE.mine : null, town = !HOTEL.active && !HOTEL.away && !ROOM.active;
    if (m) { if (HOTEL.active) { HOTEL.panel = null; HOTEL.goTo(m); } else if (town) toHotel('room'); return; }
    if (!WALLET.account && LEV.st.guest) { ROOM.enterSolo(); return; }                                     // a walletless guest who took the temporary room
    toast('Your room is waiting at the front desk. Talk to Lev.');
    if (HOTEL.active) { if (HOTEL.floor === 0) GAME.walkTo(0.3, -3.5); else HOTEL.goFloor(0); } else if (town) toHotel('lobby');
  };
  animated.push((t, dt) => {                                                                              // an auto-walk to the Hotel door that ends in the Hotel
    const p = LEV.pending; if (!p || !GAME.me) return;
    if (HOTEL.active || HOTEL.away || ROOM.active || GAME.locked) { LEV.pending = null; return; }
    if (meNear()) { arriveHotel(p.kind); return; }
    const walking = GAME.path.length > 0 || Object.values(GAME.keys).some(Boolean);
    if (GAME.keys && Object.values(GAME.keys).some(Boolean)) { LEV.pending = null; return; }               // you took over with the keys
    p.idle = walking ? 0 : p.idle + dt; if (p.idle > 0.8) LEV.pending = null;
  });
})();
