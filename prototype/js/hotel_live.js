// ===== hotel live: what the server says about the Hotel (message `hotelinfo`), the tower that grows from it, the Inspect camera and the data for the town's billboards =====
// Message: { t:'hotelinfo', floors, basement, rooms, busiest:{door,name,inside}|null, events:[{door,name,title,until}], winner:{name}|null }, routed here by net.js to HLIVE.onInfo.
// Until it arrives (and offline) the tower keeps its cached floor count and the billboards show their calm default. The tower itself is built in world_city.js (HTOWER.set).
// Inspect: a 5 s camera move that pulls out until the whole building fits, holds with a caption, then returns. game.js calls GAME.cine(t, dt) first in its camera step; while it returns true
// the camera is ours (it overrides the zoom limit, the depth range and the fog only for the animation) and all input is swallowed (Esc skips). The stand that starts it is built in props.js
// (PROPS.inspectSpot); the pages the billboards rotate through come from HLIVE.pages(). Loaded after firststeps.js. Names here start with HLIVE because every script shares one global scope.
const HLIVE = { info: null, rev: 0, active: false, pending: 0 };
(function () {
  const outside = () => !(typeof ROOM !== 'undefined' && ROOM.active) && !(typeof HOTEL !== 'undefined' && (HOTEL.active || HOTEL.away));
  const int = v => { v = Math.round(+v); return Number.isFinite(v) && v > 0 ? v : 0; };
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  // ---------- the data
  HLIVE.onInfo = function (m) {
    if (!m) return;
    const info = { floors: int(m.floors), basement: int(m.basement), rooms: int(m.rooms), busiest: m.busiest && m.busiest.door !== undefined && m.busiest.door !== null ? m.busiest : null, events: Array.isArray(m.events) ? m.events.filter(e => e && e.title) : [], winner: m.winner && m.winner.name ? m.winner : null };
    HLIVE.info = info; HLIVE.rev++;
    if (info.floors) { try { localStorage.setItem('chog_hotel_floors', String(info.floors)); } catch (e) { /* ignore */ } if (HLIVE.active) HLIVE.pending = info.floors; else HTOWER.set(info.floors); }
  };
  HLIVE.floors = () => (HLIVE.info && HLIVE.info.floors) || HTOWER.floors;
  function timeOf(u) {                                                       // an epoch (ms or s) or a ready string -> "23:40"
    if (u === undefined || u === null || u === '') return '';
    let ms = null; const n = +u;
    if (Number.isFinite(n) && String(u).trim() !== '') ms = n > 1e12 ? n : n > 1e9 ? n * 1000 : null;
    else if (typeof u === 'string' && Number.isFinite(Date.parse(u))) ms = Date.parse(u);
    else if (typeof u === 'string') return u.slice(0, 12);
    if (ms === null) return '';
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  // the pages the billboards rotate through; only pages with data, or one calm default
  HLIVE.pages = function () {
    const i = HLIVE.info, out = [];
    if (i) {
      if (i.events.length) out.push({ k: 'events', rows: i.events.slice(0, 3).map(e => ({ title: String(e.title).slice(0, 40), sub: ['Room ' + e.door, e.name ? String(e.name).slice(0, 18) : '', timeOf(e.until) ? 'until ' + timeOf(e.until) : ''].filter(Boolean).join(' · ') })), more: Math.max(0, i.events.length - 3) });
      if (i.busiest) out.push({ k: 'busiest', door: String(i.busiest.door), name: i.busiest.name ? String(i.busiest.name).slice(0, 24) : '', inside: int(i.busiest.inside) });
      if (i.winner) out.push({ k: 'winner', name: String(i.winner.name).slice(0, 28) });
    }
    if (!out.length) out.push({ k: 'default', size: i && i.floors ? [plural(i.floors, 'floor'), i.rooms ? plural(i.rooms, 'room') : ''].filter(Boolean).join(' · ') : '' });
    return out;
  };
  HLIVE.goHotel = () => { if (typeof FIRST !== 'undefined' && FIRST.goPlace) FIRST.goPlace('hotel'); };

  // ---------- Inspect
  const css = document.createElement('style');
  css.textContent = `
    #hlcap { position: fixed; left: 50%; bottom: 13%; transform: translateX(-50%); z-index: 20; padding: 12px 26px; border-radius: 999px; background: #fffaf3; border: 1.5px solid rgba(58,36,96,.22); box-shadow: 0 10px 30px rgba(40,20,70,.35); font: 600 26px "Fredoka", "Nunito", sans-serif; color: #2b2140; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .5s; }
    #hlcap b { color: #7a3ac8; font-weight: 700; } #hlcap i { font-style: normal; opacity: .4; margin: 0 .35em; }
    body.hlt #ui, body.hlt #plates, body.hlt #fswp, body.hlt #cprops, body.hlt #hlgo { transition: opacity .35s; } body.hlcine #ui, body.hlcine #plates, body.hlcine #fswp, body.hlcine #cprops, body.hlcine #hlgo { opacity: 0 !important; pointer-events: none !important; }
    #hlgo { position: fixed; left: 0; top: 0; z-index: 14; display: none; align-items: center; gap: 8px; padding: 7px 16px 7px 12px; border-radius: 999px; background: #fffaf3; border: 1.5px solid #7a3ac8; box-shadow: 0 6px 18px rgba(40,20,70,.3); font: 600 15px "Fredoka", "Nunito", sans-serif; color: #2b2140; cursor: pointer; white-space: nowrap; }
    #hlgo kbd { font: 700 12px "Nunito", sans-serif; padding: 1px 7px; border-radius: 6px; background: #7a3ac8; color: #fff; } #hlgo:hover { background: #f1e6ff; }`;
  document.head.appendChild(css);
  const cap = document.createElement('div'); cap.id = 'hlcap'; document.body.appendChild(cap);
  const go = document.createElement('button'); go.id = 'hlgo'; go.innerHTML = 'Inspect the Hotel <kbd>I</kbd>'; document.body.appendChild(go);
  go.addEventListener('click', e => { e.stopPropagation(); HLIVE.inspect(); });
  const uiZoom = () => { const u = document.getElementById('ui'); return u && u.style.zoom ? u.style.zoom : 1; };

  const K_VIEW = Math.cos(Math.atan(1 / Math.SQRT2)), K_DEP = 1 / Math.sqrt(3);     // a vertical metre is 0.816 m on screen; a vertical metre moves a point 0.577 m along the view axis
  const T_OUT = 2.1, T_HOLD = 1.9, T_BACK = 1.7;                                    // about 5.7 s in all
  const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const lerp = (a, b, s) => a + (b - a) * s;
  const cine = { on: false, phase: '', t: 0, s: 0, from: 0, dur: T_BACK };
  const N0 = { far: 260, fogN: 112, fogF: 190 };
  let goal = null;
  const countText = k => { const f = goal.floors * k, r = goal.rooms * k; return `<b>Chog Hotel</b><i>·</i>${plural(Math.round(f), 'floor')}${goal.rooms ? `<i>·</i>${plural(Math.round(r), 'room')}` : ''}`; };

  HLIVE.inspect = function () {
    if (cine.on) return;
    if (!outside() || !GAME.me) { if (typeof toast === 'function') toast('Step outside to see the whole Hotel.'); return; }
    if (typeof closeOtherPanels === 'function') closeOtherPanels('inspect'); if (typeof PROPS !== 'undefined' && PROPS.closeCard) PROPS.closeCard(); if (typeof NPC !== 'undefined' && NPC.closeCard) NPC.closeCard();
    const H = HTOWER.height(), i = HLIVE.info, floors = HLIVE.floors();
    const D1 = Math.max(90, K_DEP * H / 2 + 130), far1 = D1 + K_DEP * H / 2 + 180, fogN1 = D1 + K_DEP * H / 2 + 80;
    goal = { floors, rooms: i ? i.rooms : 0, FW: Math.max(46, H * K_VIEW * 1.34 * ASPECT), y: H / 2, D: D1, far: far1, fogN: fogN1, fogF: fogN1 + 100 };
    cine.on = true; HLIVE.active = true; cine.phase = 'out'; cine.t = 0; cine.s = 0; cine.dur = T_BACK; cap.innerHTML = countText(0); cap.style.zoom = uiZoom(); cap.style.opacity = 0;
    GAME.dragUI = true; GAME.hoverChog = null; GAME.cine = tick; document.body.classList.add('hlt'); void document.body.offsetWidth; document.body.classList.add('hlcine');
  };
  function finish() {
    cine.on = false; HLIVE.active = false; GAME.cine = null; GAME.dragUI = false; cap.style.opacity = 0;
    cam.far = N0.far; scene.fog.near = N0.fogN; scene.fog.far = N0.fogF; updateCam();
    document.body.classList.remove('hlcine'); setTimeout(() => { if (!cine.on) document.body.classList.remove('hlt'); }, 600);
    if (HLIVE.pending) { const n = HLIVE.pending; HLIVE.pending = 0; HTOWER.set(n); }
  }
  function tick(t, dt) {
    if (!cine.on) return false;
    cine.t += dt;
    if (cine.phase === 'out') { cine.s = ease(cine.t / T_OUT); if (cine.t >= T_OUT) { cine.phase = 'hold'; cine.t = 0; } }
    else if (cine.phase === 'hold') { cine.s = 1; if (cine.t >= T_HOLD) { cine.phase = 'back'; cine.t = 0; cine.from = 1; cine.dur = T_BACK; } }
    else { cine.s = cine.from * (1 - ease(cine.t / cine.dur)); if (cine.t >= cine.dur) { cine.s = 0; apply(0); finish(); return false; } }
    cap.innerHTML = countText(cine.phase === 'out' ? ease((cine.t / T_OUT - 0.25) / 0.75) : 1);
    cap.style.opacity = (cine.phase === 'hold' || (cine.phase === 'out' && cine.t > T_OUT * 0.55) ) ? 1 : 0;
    apply(cine.s); return true;
  }
  function apply(s) {
    const me = GAME.me.position; GAME.path.length = 0; GAME.run = false; for (const k in GAME.keys) GAME.keys[k] = false;
    const bx = me.x + GAME.camBias.x, bz = me.z + GAME.camBias.z, fw0 = GAME.zoomT;
    camTarget.set(lerp(bx, HTOWER.x, s), lerp(1.1, goal.y, s), lerp(bz, HTOWER.z, s));
    FW = Math.exp(lerp(Math.log(fw0), Math.log(goal.FW), s));
    cam.far = lerp(N0.far, goal.far, s); scene.fog.near = lerp(N0.fogN, goal.fogN, s); scene.fog.far = lerp(N0.fogF, goal.fogF, s);
    updateCam(); cam.position.copy(camTarget).addScaledVector(CAM_DIR, lerp(90, goal.D, s)); cam.lookAt(camTarget); cam.updateMatrixWorld();
  }

  // ---------- input is ignored while it runs; Esc skips (a quick way back)
  const swallow = e => {
    if (!cine.on) return;
    if (e.type === 'keydown' && e.code === 'Escape') { if (cine.phase !== 'back') { cine.from = cine.s; cine.phase = 'back'; cine.t = 0; cine.dur = 0.7; } e.stopImmediatePropagation(); e.preventDefault(); return; }
    if (e.type === 'keydown' && e.target && e.target.matches && e.target.matches('input,textarea')) return;
    e.stopImmediatePropagation(); if (e.type !== 'wheel') e.preventDefault();
  };
  for (const ty of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'wheel', 'contextmenu']) addEventListener(ty, swallow, { capture: true, passive: false });
  addEventListener('keydown', e => { if (e.code === 'KeyI' && !e.repeat && !cine.on && !(e.target && e.target.matches && e.target.matches('input,textarea')) && near()) HLIVE.inspect(); });

  // ---------- the prompt over the stand while you are close (clicking the stand itself is wired in props.js)
  const v = new THREE.Vector3();
  const near = () => { const s = typeof PROPS !== 'undefined' && PROPS.inspectSpot; return !!(s && GAME.me && outside() && NPC.group.visible && Math.hypot(GAME.me.position.x - s.x, GAME.me.position.z - s.z) < 2.6); };
  animated.push(() => {
    if (cine.on || !near()) { if (go.style.display !== 'none') go.style.display = 'none'; return; }
    const s = PROPS.inspectSpot; v.set(s.x, s.y, s.z).project(cam);
    const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight, sc = Math.max(0.8, Math.min(1.5, innerHeight / 810));
    go.style.display = 'flex'; go.style.transform = `translate(${x.toFixed(0)}px, ${(y - 14).toFixed(0)}px) translate(-50%, -100%) scale(${sc})`;
  });
})();
