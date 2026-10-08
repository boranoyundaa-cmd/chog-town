// ===== npc: the town's residents (docs/game/world.md) =====
// A resident's position is a pure function of its schedule and the clock: no server state, every client computes the same.
// A schedule is a list of [hour, place]; between two places the resident walks a path found on the town's blockers, then stays (stands, chats,
// strolls an avenue, or goes inside a building and disappears). The crowd is topped up to NPC.target people: the residents shown are the first K
// of those that are outside, K = target - 1 (you) - players in town. NPCs are never counted anywhere (rankings, "N inside", the minimap).
// Loaded after plates.js and net.js (it uses PLATES, NET, TOUR and the world); the receptionist of the Chog Hotel lives in hotel.js.
const NPC = { list: [], group: new THREE.Group(), target: 12, card: null, override: null, t0: performance.now() };
(function () {
  world.add(NPC.group); CITY_NODES.push(NPC.group);                                   // rooms and the hotel hide the street together with its residents
  const DAY_S = 86400, CELL_N = 0.3, GH = HALF - 0.4, NG = Math.round(GH * 2 / CELL_N);

  // ---------- places: a door (inside), a spot to stand or chat, or a beat to stroll. ry = where it faces (0 = +z, PI/2 = +x)
  const door = (x, z) => ({ act: 'in', x, z, ry: 0 });
  const stand = (x, z, ry, say, act = 'idle', mate = 0) => ({ act, x, z, ry, say, mate });
  const beat = (ax, az, bx, bz, say) => ({ act: 'stroll', x: ax, z: az, bx, bz, len: Math.hypot(bx - ax, bz - az), ry: 0, say });
  const PL = {
    moka: door(-3.6, 6.75), arcade: door(4.0, 6.75), nova: door(3.85, -2.6), gallery: door(1.2, -5.1), hotel: door(-4.8, -2.7),
    baristaPost: stand(-2.4, 5.4, 1.2, ['Fresh coffee, still warm!', 'The usual? Moka & Co opens early.'], 'wave'),
    guidePost: stand(2.4, 3.0, 3.6, ['New in town? Your free Home is the little house by the south corner.', 'Press B inside your Home to decorate it.']),
    guardPost: stand(3.85, -2.5, 0, ['NOVA is open tonight.', 'Evening. Enjoy the music.']),
    cafeQ1: stand(-3.1, 6.95, 3.14, ['Mika makes the best flat white.', 'I come here every day.'], 'chat', 1), cafeQ2: stand(-4.15, 6.95, 3.14, ['The pastries sell out by noon.', 'Same time tomorrow?'], 'chat', -1),
    arcadeFront1: stand(3.3, 6.95, 3.14, ['Sixty floors on the luggage game. A record!', 'The Arcade is always loud on Fridays.']), arcadeFront2: stand(5.2, 6.95, 3.14, ['One more round, then home.']),
    galleryFront: stand(0.4, -4.75, 3.14, ['The Chog Wall has all 1,969 of us.', 'I like the quiet in there.']),
    pylon: stand(4.2, -2.0, 1.57, ['Tonight\'s list is on the pylon.', 'Read the board: something is on tonight.']),
    plazaA: stand(-0.95, -2.45, 1.2, ['Did you see the sunset?', 'Nice evening for a walk.'], 'chat', 1), plazaB: stand(-0.35, -2.6, -1.9, ['It was golden over the Hotel.', 'I could stay out all night.'], 'chat', -1),
    busStop: stand(-2.5, 1.95, 3.14, ['The 7 is late again.', 'Still waiting for the bus.']), busStop2: stand(-5.65, 1.85, 0.4, ['Is that the 7?']),
    scooterGuy: stand(6.4, 2.35, 2.4, ['Nice ride, right?', 'I would race you, but my scooter is shy.']),
    cornerFolk: stand(7.3, 4.3, 2.0, ['Quiet corner. I like it.']),
    avenueEW: beat(-7, 0.2, 7, 0.2, ['Just walking.', 'Chog Avenue never gets old.']), avenueNS: beat(-0.2, -4.9, -0.2, 7, ['Good day for it.', 'Taking the long way.']),
    crossing: beat(-2.4, -0.2, 2.4, -0.2, ['Wait for me!', 'Race you to the lamp!']),
    sidewalkS: beat(-8.5, 7.9, 1.0, 7.9, ['Window shopping.']), westWalk: beat(-8.6, -7.0, -8.6, 7.0, ['The air smells like rain.']), northWalk: beat(-8.5, -8.7, 8.5, -8.7, ['Quiet up here.']),
  };

  // ---------- the roster. prio: lower shows first when the crowd is capped. sched hours are local (the clock that lights the town)
  const L = (hair, outfit, o = {}) => Object.assign({ hair, outfit }, o);
  const ROSTER = [
    { id: 'mika', name: 'Mika', role: 'Barista', look: L(0xf4c82c, 'apron', { head: 'cap', capC: 0x3a6a5c }), prio: 0, speed: 1.0, lines: ['What can I get you?', 'Try the oat flat white.'], sched: [[6.5, 'baristaPost'], [20, 'moka']] },
    { id: 'juno', name: 'Juno', role: 'Guide', look: L(0xff4a98, 'jacket', { trim: 0x60e0f0, head: 'headset' }), prio: 1, speed: 1.0, lines: ['Ask me anything about the town.'], sched: [[8, 'guidePost'], [21.5, 'hotel']] },
    { id: 'rex', name: 'Rex', role: 'Guard', look: L(0x3a3550, 'jacket', { trim: 0xff3aa8, head: 'cap', capC: 0x1a1030 }), prio: 2, speed: 0.9, lines: ['Doors open at eight.'], sched: [[3, 'nova'], [19.25, 'guardPost']] },
    { id: 'pip', name: 'Pip', look: L(0xe0283a, 'jacket', { trim: 0xffd060 }), prio: 3, speed: 0.9, sched: [[6.5, 'avenueEW'], [12.5, 'cafeQ1'], [13.5, 'avenueEW'], [18.5, 'arcadeFront1'], [20.5, 'nova'], [23.5, 'hotel']] },
    { id: 'mochi', name: 'Mochi', look: L(0x2fb58a, 'vest', { vest: 0x3a8a6a }), prio: 4, speed: 0.8, sched: [[6.8, 'avenueNS'], [12, 'galleryFront'], [13, 'gallery'], [15, 'avenueNS'], [17.5, 'busStop'], [19, 'hotel']] },
    { id: 'biscuit', name: 'Biscuit', look: L(0xb06aff, 'vest', { vest: 0xe86a7a, scale: CHOG_SCALE * 0.78 }), prio: 5, speed: 1.2, lines: ['Catch me if you can!'], sched: [[9, 'crossing'], [16, 'scooterGuy'], [18.5, 'hotel']] },
    { id: 'olive', name: 'Olive', look: L(0x5b35b0, 'vest'), prio: 6, speed: 0.9, mate: 'maple', sched: [[8.5, 'plazaA'], [12, 'cafeQ1'], [13, 'plazaA'], [17, 'busStop'], [20, 'hotel']] },
    { id: 'maple', name: 'Maple', look: L(0xff4a98, 'jacket', { trim: 0xff7aa8, head: 'cap', capC: 0x2a2050 }), prio: 7, speed: 0.9, sched: [[8.6, 'plazaB'], [12.1, 'cafeQ2'], [13.1, 'plazaB'], [17.1, 'busStop2'], [20.1, 'hotel']] },
    { id: 'pepper', name: 'Pepper', look: L(0xf48a3a, 'jacket', { trim: 0x7a4ab0 }), prio: 8, speed: 1.0, sched: [[6, 'pylon'], [11, 'avenueEW'], [14, 'galleryFront'], [16, 'gallery'], [18, 'arcadeFront2'], [21, 'hotel']] },
    { id: 'waffle', name: 'Waffle', look: L(0x4a7ab8, 'vest', { vest: 0xffd060 }), prio: 9, speed: 1.1, sched: [[10, 'scooterGuy'], [13, 'cafeQ2'], [15.5, 'arcade'], [20.5, 'arcadeFront2'], [23, 'hotel']] },
    { id: 'nori', name: 'Nori', look: L(0x7a5ae0, 'jacket', { trim: 0x7ae8ff }), prio: 10, speed: 1.0, sched: [[9.5, 'sidewalkS'], [11.5, 'cornerFolk'], [14, 'sidewalkS'], [19, 'arcadeFront1'], [22, 'pylon']] },
    { id: 'sprout', name: 'Sprout', look: L(0x3aa860, 'vest', { vest: 0xf0d070 }), prio: 11, speed: 0.9, sched: [[2.5, 'hotel'], [10.5, 'northWalk'], [17, 'sidewalkS'], [21, 'nova']] },
    { id: 'clover', name: 'Clover', look: L(0x2a9a8a, 'jacket', { trim: 0xff9ad8 }), prio: 12, speed: 0.85, sched: [[7, 'hotel'], [19, 'westWalk'], [23, 'plazaA']] },
    { id: 'truffle', name: 'Truffle', look: L(0x9a4a28, 'vest', { vest: 0x5a3a8a }), prio: 13, speed: 0.85, sched: [[7.2, 'hotel'], [19.2, 'northWalk'], [23.2, 'plazaB']] },
    { id: 'pudding', name: 'Pudding', look: L(0xffb0d0, 'vest', { vest: 0x6a4ac0 }), prio: 14, speed: 0.9, sched: [[7.5, 'hotel'], [21, 'busStop'], [23.5, 'pylon']] },
  ];

  // ---------- walkable grid and paths between places (built once, cached per pair)
  const gi = v => Math.max(0, Math.min(NG - 1, Math.floor((v + GH) / CELL_N))), gw = c => (c + 0.5) * CELL_N - GH;
  const G = new Uint8Array(NG * NG);
  const blockedAt = (x, z, r = 0.28) => { if (Math.abs(x) > GH || Math.abs(z) > GH) return true; for (const b of WORLD_BLOCKERS) if (Math.abs(x - b.x) < b.hw + r && Math.abs(z - b.z) < b.hd + r) return true; return false; };
  for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) G[j * NG + i] = blockedAt(gw(i), gw(j)) ? 1 : 0;
  function freeNear(x, z) {
    const ci = gi(x), cj = gi(z); if (!G[cj * NG + ci]) return [x, z];
    for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = ci + di, j = cj + dj; if (i >= 0 && j >= 0 && i < NG && j < NG && !G[j * NG + i]) return [gw(i), gw(j)]; }
    return [x, z];
  }
  const cellBlocked = (x, z) => x < -GH || x > GH || z < -GH || z > GH || G[gi(z) * NG + gi(x)] === 1;      // grid lookup: cheap enough to sample a segment
  const clear = (ax, az, bx, bz) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.12); for (let k = 0; k <= n; k++) if (cellBlocked(ax + (bx - ax) * k / n, az + (bz - az) * k / n)) return false; return true; };
  class Heap {                                                                      // min-heap of [priority, value]
    constructor() { this.a = []; }
    get size() { return this.a.length; }
    push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
    pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  }
  function route(ax, az, bx, bz) {                                                  // A* with string pulling; returns {pts, cum}
    const [sx, sz] = freeNear(ax, az), [ex, ez] = freeNear(bx, bz);
    let pts;
    if (clear(sx, sz, ex, ez)) pts = [[ax, az], [bx, bz]];
    else {
      const si = gi(sx), sj = gi(sz), ti = gi(ex), tj = gi(ez), g = new Float32Array(NG * NG).fill(1e9), from = new Int32Array(NG * NG).fill(-1), open = new Heap(); open.push([0, sj * NG + si]); g[sj * NG + si] = 0;
      while (open.size) {
        const cur = open.pop()[1], ci = cur % NG, cj = (cur / NG) | 0; if (ci === ti && cj === tj) break;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= NG || j >= NG || G[j * NG + i]) continue;
          if (di && dj && (G[cj * NG + i] || G[j * NG + ci])) continue;
          const ng = g[cur] + Math.hypot(di, dj); if (ng < g[j * NG + i]) { g[j * NG + i] = ng; from[j * NG + i] = cur; open.push([ng + Math.hypot(i - ti, j - tj), j * NG + i]); }
        }
      }
      const cells = []; for (let c = tj * NG + ti; c >= 0 && c !== sj * NG + si; c = from[c]) cells.push(c); cells.reverse();
      const raw = [[ax, az], ...cells.map(c => [gw(c % NG), gw((c / NG) | 0)]), [bx, bz]]; pts = [raw[0]];
      let k = 0; while (k < raw.length - 1) { let far = k + 1; for (let m = raw.length - 1; m > k + 1; m--) if (clear(raw[k][0], raw[k][1], raw[m][0], raw[m][1])) { far = m; break; } pts.push(raw[far]); k = far; }
    }
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum[cum.length - 1] };
  }
  const ROUTES = {};
  const routeBetween = (a, b) => ROUTES[a + '>' + b] || (ROUTES[a + '>' + b] = route(PL[a].x, PL[a].z, PL[b].x, PL[b].z));
  for (const k in PL) { const p = PL[k], [x, z] = freeNear(p.x, p.z); if (Math.hypot(x - p.x, z - p.z) > 0.05) { if (p.act !== 'in') console.warn('npc place moved', k, p.x, p.z, '->', x, z); p.x = x; p.z = z; } }

  // ---------- the day of a resident: segments built once; 'go' = walking a route, 'stay' = at a place
  function plan(r) {
    const run = arr0 => {
      const segs = []; let cur = r.sched[r.sched.length - 1][1], t = 0, arr = arr0;
      for (const [h, name] of r.sched) {
        let D = Math.max(t, h * 3600);
        if (PL[cur].act === 'stroll') { const per = 2 * PL[cur].len / r.speed; D = arr + Math.ceil(Math.max(0, D - arr) / per - 1e-9) * per; }   // leave when back at the start of the beat
        if (name === cur) continue;
        if (D > t) segs.push({ t0: t, t1: D, kind: 'stay', place: cur, since: arr });
        const rt = routeBetween(cur, name), dur = rt.len / r.speed;
        segs.push({ t0: D, t1: D + dur, kind: 'go', rt, from: cur, to: name }); t = D + dur; arr = t; cur = name;
      }
      segs.push({ t0: t, t1: Infinity, kind: 'stay', place: cur, since: arr }); return { segs, arr };
    };
    const first = run(-DAY_S); r.segs = run(first.arr - DAY_S).segs;                  // the second pass knows when the last place of the previous day was reached
  }

  // ---------- where is a resident at time t (seconds of the day)? -> {x, z, ry, moving, inside, place}
  const tri = p => { const q = ((p % 2) + 2) % 2; return q < 1 ? q : 2 - q; };
  function where(r, t) {
    const s = r.segs.find(g => t >= g.t0 && t < g.t1) || r.segs[r.segs.length - 1];
    if (s.kind === 'go') {
      const d = Math.min(s.rt.len, (t - s.t0) * r.speed), c = s.rt.cum; let i = 1; while (i < c.length - 1 && c[i] < d) i++;
      const a = s.rt.pts[i - 1], b = s.rt.pts[i], u = (d - c[i - 1]) / Math.max(1e-6, c[i] - c[i - 1]);
      return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, ry: Math.atan2(b[0] - a[0], b[1] - a[1]), moving: true, inside: false, place: PL[s.to] };
    }
    const p = PL[s.place];
    if (p.act === 'in') return { x: p.x, z: p.z, ry: p.ry, moving: false, inside: true, place: p };
    if (p.act === 'stroll') {
      const ph = (t - s.since) * r.speed / p.len, f = tri(ph), dir = (((ph % 2) + 2) % 2) < 1 ? 1 : -1, ang = Math.atan2(p.bx - p.x, p.bz - p.z);
      return { x: p.x + (p.bx - p.x) * f, z: p.z + (p.bz - p.z) * f, ry: dir > 0 ? ang : ang + Math.PI, moving: true, inside: false, place: p };
    }
    return { x: p.x, z: p.z, ry: p.ry, moving: false, inside: false, place: p };
  }

  // ---------- the bodies
  const PERIODS = [[5, 'morning'], [11, 'day'], [17, 'evening'], [22, 'night']];
  const GENERIC = { morning: ['Good morning!', 'Early bird, huh?', 'Another fresh day in Chog Town.'], day: ['Lovely day.', 'Have you seen the Gallery yet?', 'Busy day in town.'], evening: ['The lights are coming on.', 'Evenings are the best here.', 'Going to NOVA later?'], night: ['Shhh, the town is sleeping.', 'I love it when it is quiet.', 'Look at all those neon lights.'] };
  const periodOf = h => { let p = 'night'; for (const [a, n] of PERIODS) if (h >= a) p = n; return p; };
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0); };
  NPC.now = () => NPC.override !== null ? NPC.override : (DAY.mode === 'real' ? DAY.hour * 3600 : (DAY.fixedHour * 3600 + (performance.now() - NPC.t0) / 1000));
  NPC.lineFor = (r, t, k = 0) => {
    const h = (t / 3600) % 24, pool = []; const w = r.w; if (w && w.place && w.place.say) pool.push(...w.place.say); if (r.lines) pool.push(...r.lines); pool.push(...GENERIC[periodOf(h)]);
    return pool[(hash(r.id + Math.floor(t / 30)) + k) % pool.length];
  };
  for (const r of ROSTER) {
    plan(r); r.base = r.look.scale || CHOG_SCALE;
    const c = chog(r.look); c.userData.netName = r.name; c.userData.npc = r; c.userData.onClick = () => NPC.openCard(r); c.visible = false; NPC.group.add(c);
    r.c = c; r.f = 0; r.show = false; r.t0 = (hash(r.id) % 600) / 100; r.w = null; r.ry = 0; r.plate = PLATES.add(c, r.role || 'Resident'); r.sayAt = -1;
    walkers.push({ c, npc: r }); NPC.list.push(r);
  }

  // ---------- per frame: place everyone, cap the crowd, animate
  let acc = 1;
  animated.push((tm, dt) => {
    if (!NPC.group.visible) return;                                                 // inside a room or the hotel
    const t = NPC.now() % DAY_S;
    acc += dt; const sel = acc > 0.4; if (sel) acc = 0;
    for (const r of NPC.list) r.w = where(r, t);
    if (sel || NPC.dirty) {
      NPC.dirty = false; const room = Math.max(0, Math.min(NPC.list.length, NPC.target - 1 - (typeof NET !== 'undefined' ? NET.remotes.size : 0))); let n = 0;
      for (const r of NPC.list.slice().sort((a, b) => a.prio - b.prio)) { r.show = !r.w.inside && n < room; if (r.show) n++; }
    }
    for (const r of NPC.list) {
      const c = r.c, w = r.w, u = c.userData;
      r.f += ((r.show ? 1 : 0) - r.f) * Math.min(1, dt * 4); if (r.show && r.f > 0.98) r.f = 1; if (!r.show && r.f < 0.02) r.f = 0;
      c.visible = r.f > 0; if (!c.visible) continue; c.scale.setScalar(Math.max(0.001, r.base * (0.25 + 0.75 * r.f)));
      c.position.set(w.x, 0, w.z); let dr = w.ry - r.ry; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); r.ry += dr * Math.min(1, dt * 8); c.rotation.y = r.ry;
      const ph = tm * 9 + r.t0, sw = Math.sin(ph), act = w.place && w.place.act;
      if (w.moving) { u.legs[0].rotation.x = sw * 0.65; u.legs[1].rotation.x = -sw * 0.65; u.arms[0].rotation.x = -sw * 0.7; u.arms[1].rotation.x = sw * 0.7; u.arms[0].rotation.z = u.arms[1].rotation.z = 0; u.body.position.y = Math.abs(sw) * 0.05; u.head.position.y = 1.0 + Math.abs(sw) * 0.05; u.hairG.rotation.x = Math.sin(ph + 1) * 0.05; }
      else {
        const b = Math.sin(tm * 2 + r.t0) * 0.015; u.body.position.y = b; u.head.position.y = 1.0 + b * 1.4; u.legs.forEach(l => l.rotation.x = 0);
        u.arms.forEach(a => { a.rotation.z = 0; });
        if (act === 'wave') { u.arms[1].rotation.z = 2.7 + Math.sin(tm * 7) * 0.4; u.arms[1].rotation.x = 0; u.arms[0].rotation.x = 0; }
        else if (act === 'chat') { const mate = w.place.mate, arm = u.arms[mate > 0 ? 1 : 0]; u.head.rotation.x = Math.sin(tm * 5 + r.t0 * 2) * 0.05; arm.rotation.z = mate * (0.7 + Math.sin(tm * 4 + r.t0) * 0.4); arm.rotation.x = -0.3; u.arms[mate > 0 ? 0 : 1].rotation.x = 0; }
        else u.arms.forEach(a => { a.rotation.x = Math.sin(tm * 2 + r.t0) * 0.05; });
      }
      const blink = Math.sin(tm * 0.9 + r.t0 * 5) > 0.985 ? 0.12 : 1; u.eyes.forEach(e => e.scale.y = (e.userData.by || 0.095) * blink);
    }
    // a resident near you now and then says a line above the head (a bubble, not chat: it never enters the log)
    if (GAME.me && sel) {
      const slot = Math.floor(t / 20);
      for (const r of NPC.list) {
        if (!r.show || r.f < 1 || r.w.moving || r.sayAt === slot) continue;
        if (Math.hypot(r.w.x - GAME.me.position.x, r.w.z - GAME.me.position.z) > 6) continue;
        r.sayAt = slot; if (hash(r.id + slot) % 4 === 0) PLATES.say(r.plate, NPC.lineFor(r, t));
      }
    }
    if (NPC.card && (!NPC.card.show || NPC.card.f < 0.5)) NPC.closeCard();
  });

  // ---------- the card (ui.js draws it): who, what they do, one line from them, an action for service NPCs
  NPC.openCard = r => { NPC.card = r; r.cardLine = NPC.lineFor(r, NPC.now() % DAY_S, 7); if (typeof render === 'function') render(); };
  NPC.closeCard = () => { NPC.card = null; if (typeof render === 'function') render(); };
  NPC.actionFor = r => (r.id === 'juno' ? { label: 'Show me around', run: () => { NPC.closeCard(); if (typeof TOUR !== 'undefined') TOUR.restart(); } } : null);
  NPC.setTime = s => { NPC.override = s === null ? null : s; NPC.dirty = true; };             // testing: NPC.setTime(14 * 3600) pins the schedule clock
  NPC.where = (id, s) => { const r = NPC.list.find(x => x.id === id); return r ? where(r, s % DAY_S) : null; };
  NPC.PL = PL; NPC.ROSTER = ROSTER; NPC.blockedAt = blockedAt;
})();
