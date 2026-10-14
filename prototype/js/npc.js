// ===== npc: the town's residents (docs/game/world.md, docs/game/culture.md) =====
// The residents are the cast of CULTURE (culture_data.js): archetypes and nickname-only cameos. A resident's position is a pure function of its schedule and the clock:
// no server state, every client computes the same. A schedule is a list of [hour, place]; between two places the resident walks a path found on the town's blockers,
// then stays (stands, strolls an avenue, or goes inside a building and disappears). The crowd is topped up to NPC.target people: the residents shown are the first K
// of those that are outside, K = target - 1 (you) - players in town. NPCs are never counted anywhere (rankings, "N inside", the minimap).
// Dialogue only on click: the card shows one random line (CULTURE.pick) and the Chog says it in a bubble. Nothing is said by itself.
// Loaded after culture_data.js, plates.js and net.js (it uses CULTURE, PLATES, NET, TOUR and the world); culture.js (events) and props.js (plaques, props) come after it.
// The receptionist of the Chog Hotel lives in hotel.js. Chogs are built the first time a resident is shown (42 of them at load would be wasted work).
const NPC = { list: [], group: new THREE.Group(), target: 12, card: null, override: null, pins: {}, t0: performance.now() };
(function () {
  world.add(NPC.group); CITY_NODES.push(NPC.group);                                   // rooms and the hotel hide the street together with its residents
  const DAY_S = 86400, CELL_N = 0.3, GH = HALF - 0.4, NG = Math.round(GH * 2 / CELL_N);

  // ---------- places: a door (inside), a spot to stand, or a beat to stroll. ry = where it faces (0 = +z, PI/2 = +x). Most spots face the camera (+x +z, about 0.8)
  const door = (x, z) => ({ act: 'in', x, z, ry: 0 });
  const stand = (x, z, ry = 0.8, act = 'idle', mate = 0) => ({ act, x, z, ry, mate });
  const beat = (ax, az, bx, bz) => ({ act: 'stroll', x: ax, z: az, bx, bz, len: Math.hypot(bx - ax, bz - az), ry: 0 });
  const PL = {
    moka: door(-3.6, 6.75), arcade: door(4.0, 6.75), nova: door(3.85, -2.6), gallery: door(1.2, -5.1), hotel: door(-4.8, -2.7),
    baristaPost: stand(-2.4, 5.4, 1.2, 'wave'), guidePost: stand(2.4, 3.0, 3.6), guardPost: stand(3.85, -2.5, 0),
    // cafe terrace and the arcade and gallery fronts (they face the shop)
    cafeQ1: stand(-3.1, 6.95, 3.14), cafeQ2: stand(-4.15, 6.95, 3.14), cafeT3: stand(-5.25, 6.95, 3.14), cafeT4: stand(-6.2, 6.95, 3.14),
    arcadeFront1: stand(3.3, 6.95, 3.14), arcadeFront2: stand(5.2, 6.95, 3.14), arcadeFront3: stand(6.15, 6.95, 3.14), liqSpot: stand(6.9, 4.5, 0.9),
    galleryFront: stand(0.4, -4.75, 3.14), galleryFront2: stand(2.3, -4.75, 3.14),
    // park (north-west corner), in front of the hotel, the plaza ring, the street
    parkA: stand(-8.4, -3.7, 0.8), parkB: stand(-7.6, -8.2, 0.6),
    hf1: stand(-5.6, -1.25), hf2: stand(-4.7, -1.25), hf3: stand(-3.9, -1.25), hf4: stand(-6.5, -1.25), bankers: stand(-2.5, -1.25),
    pz1: stand(-1.1, -1.1), pz2: stand(1.1, -1.1, -0.8), pz3: stand(1.1, 1.1, -2.3), pz4: stand(-1.1, 1.1, 2.3), pzFlag: stand(2.5, -0.9, 1.5), pzShadow: stand(0, -1.3, 0),
    twA: stand(2.1, 0.9, -1.5, 'chat', -1), twB: stand(1.3, 0.9, 1.5, 'chat', 1),
    pizzaStand: stand(7.6, 2.2), tourist: stand(8.3, 0.95, 1.6), larryPost: stand(-7.4, 4.7, 3.14), kolSpot: stand(7.0, -1.95), maxiSpot: stand(9.2, -7.0), exitBench: stand(2.7, 7.3, 0.4), cricketSpot: stand(9.2, 3.8),
    c1: stand(6.3, -2.5), c2: stand(7.3, -3.6), c3: stand(8.1, -3.0), c4: stand(7.2, -5.7), c5: stand(8.5, -4.1),
    avenueEW: beat(-7, 0.2, 7, 0.2), jeetBeat: beat(-7.5, -0.1, 7.5, -0.1), wassieBeat: beat(1.5, 9.3, 9.0, 9.3),
    sidewalkS: beat(-8.5, 7.9, 1.0, 7.9), westWalk: beat(-8.6, -7.0, -8.6, 7.0), northWalk: beat(-8.5, -8.7, 8.5, -8.7),
  };

  // ---------- the roster, built from CULTURE.cast + CULTURE.cameos. Looks are real trait values (chog_hats / chog_bodies / chog_items names) that match each `look` hint; the colour of
  // an outfit comes from the value, never from a real person. [Skin, Body, Head, Eyes, Accessory, Mouth, Aura, size]
  const LOOK = {
    sergm: ['Yellow', 'Farmer Shirt', 'Choggie Beanie', 'Happy', null, 'Smile'], hodler: ['Grey', 'Grey Homeless Shirt', 'Silver wreath', 'Tired', 'Cigar', 'Flat'],
    pizza: ['Red', 'Red jacket', 'Red Peace Cap', 'Round Eye', 'SB'], larry: ['Aqua', 'Orange Holed Jacket', 'Japan Headband', 'Happy', 'Red Candle'],
    doombear: ['Brown', 'dark jacket', 'Russian Hat', 'Tired', null, 'Sad'], nocoiner: ['White', 'Cream Tuxedo', 'Gray Bucket Cap', 'Worried', null, 'Worried'],
    wassie: ['Blue', 'toad blue suit', null, 'Frog', 'Fwog', 'Sad', null, 0.7], midwit: ['Mint', 'White Shirt', null, 'Retro Glass', null, 'Flat'],
    degen: ['Green', 'Orange Hoodie', null, 'Tired', 'Green Candle', 'Grit'], farmer: ['Gold', 'Army Vest', 'Blue Laser', 'Tired', null, 'Worried'],
    saver: ['Pink', 'Cyan Shirt', null, 'Smirk', 'SB'], rugvictim: ['Rose', 'Brown Homeless Shirt', null, 'Round Crying', null, 'Sad'],
    jeet: ['Silver', 'Red Sleeveless', 'Red Headband', 'Happy'], kol: ['Cyan', 'pink vest', null, 'Happy', null, 'Gold Tooth'],
    maxi: ['Orange', 'Orange Hoodie', 'BTC Cap', 'Angry', 'Knife', 'Grit'], ethguy: ['Navy', 'Sky Hoodie', 'Diamond', 'Round', null, 'Smile', null, 0.96],
    nad: ['Origin', 'Mon Hoodie', 'Mon Beanie', 'Purple laser', null, 'Smile', 'Violet'], liquidated: ['Royal', 'Tuxedo', null, 'Round Crying', 'Red Candle', 'Worried'],
    macro: ['Yellow', 'CEO Vest', 'Taped Banana', 'Round Eye'], memekid: ['Red', 'Peach Hoodie', null, 'Happy', null, 'Bubblegum', null, 0.78],
    sleuth: ['Black', 'Gojo', 'Durag', 'Side Eye', null, 'Flat'], linkmarine: ['Blue', 'Blue Mafia', 'Blue Bucket Cap', 'Angry', null, 'Flat'],
    twins: ['Grey', 'Tuxedo', null, 'Flat', null, 'Flat'], oldbankers: ['White', 'White tuxedo', null, 'Tired', null, 'Flat'],
    satoshishadow: ['Black', 'Wizard Cape', null, 'Flat', null, 'Flat', 'Smoke'],
    duck: ['Yellow', 'Sky Hoodie', 'Orange Bucket Cap', 'Tired'], teacher: ['Aqua', 'White Shirt', null, 'Retro Glass'], host: ['Pink', 'Black Shirt', 'Head Wrap', 'Happy'],
    milkshake: ['Rose', 'Pink Shirt', null, 'Flat', null, 'Flat'], rabbit: ['Black', 'Gangster suit', null, 'Flat', null, 'Flat', 'Smoke'], teasage: ['Green', 'White Yukata', null, 'Happy'],
    funnyhat: ['Gold', 'White Shirt', 'Mafia Hat', 'Retro Glass'], banana: ['Yellow', 'Hawaiian Polo', null, 'Happy'], mrfour: ['Gold', 'Yellow Shirt', null, 'Happy', 'Coin'],
    wizard: ['Orange', 'Wizard', 'Wizard Hat', 'Round Eye'], smolwassie: ['Green', 'Glitch Hoodie', null, 'Frog', null, 'Smile', null, 0.62], sweateranon: ['Brown', 'Grey Shirt', null, 'Tired', null, 'Flat'],
    coldcoffee: ['Navy', 'Blue jacket', null, 'Round', null, 'Flat'], pyramid: ['Red', 'Blue Sleeveless', null, 'Happy', 'Coin'], cricketwhale: ['Blue', 'Electro Hoodie', null, 'Round', null, 'Smile', null, 1.55],
    bearsuit: ['Brown', 'Shark Suit', null, 'Happy', null, 'Smile', null, 1.05],
  };
  const traitsOf = a => { const [skin, body, head, eyes, acc, mouth, aura] = a, o = { Background: 'Light Purple', Base: 'Origin', Form: 'Chog', Skin: skin || 'Origin', Eyes: eyes || 'Round', Mouth: mouth || 'Smile', Side: 'Right', Naked: body ? 'No' : 'Yes', Tier: 'Common' };
    if (body) o.Body = body; if (head) o.Head = head; if (acc) o.Accessory = acc; if (aura) o.Aura = aura; return o; };

  // where each resident stands for each place of its day (CULTURE hours name the place, this names the spot). 'any' = a beat to stroll
  const SPOT = {
    hodler: { park: 'parkA' }, pizza: { street: 'pizzaStand' }, larry: { street: 'larryPost' }, doombear: { plaza: 'pz1' }, nocoiner: { street: 'tourist' }, wassie: { any: 'wassieBeat' },
    degen: { arcade: 'arcadeFront1' }, farmer: { cafe: 'cafeT3' }, saver: { gallery: 'galleryFront' }, rugvictim: { street: 'exitBench' }, jeet: { any: 'jeetBeat' }, kol: { street: 'kolSpot' },
    maxi: { street: 'maxiSpot' }, ethguy: { lobby: 'hf1' }, nad: { monad_floor: 'hf2', plaza: 'pz2' }, liquidated: { arcade: 'liqSpot' }, macro: { club: 'c1' }, memekid: { plaza: 'pz3' },
    linkmarine: { plaza: 'pzFlag' }, twins1: { plaza: 'twA' }, twins2: { plaza: 'twB' }, oldbankers: { plaza: 'bankers' }, satoshishadow: { plaza: 'pzShadow' },
    duck: { cafe: 'cafeT4', club: 'c2' }, teacher: { lobby: 'hf3' }, host: { club: 'c3' }, milkshake: { arcade: 'arcadeFront3' }, rabbit: { plaza: 'pz4' }, teasage: { park: 'parkB' },
    funnyhat: { club: 'c4' }, banana: { club: 'c5' }, mrfour: { lobby: 'hf4' }, wizard: { plaza: 'pz2' }, smolwassie: { any: 'sidewalkS' }, sweateranon: { arcade: 'arcadeFront2' },
    coldcoffee: { gallery: 'galleryFront2' }, pyramid: { plaza: 'pz2' }, cricketwhale: { street: 'cricketSpot' }, bearsuit: { lobby: 'hf4' },
  };
  // the three service roles are cast members: the barista at Moka & Co, the guide of the town (and the tour) and the guard of NOVA. Their own day replaces the cast hours
  const SERVICE = {
    midwit: { role: 'Barista · Moka & Co', svc: 'barista', sched: [[6.5, 'baristaPost'], [20, 'moka']], extra: 'mika', speed: 1.0 },
    sergm: { role: 'Guide · gm', svc: 'guide', sched: [[0, 'guidePost']], extra: 'juno', speed: 1.0 },
    sleuth: { role: 'Guard · NOVA', svc: 'guard', sched: [[3, 'nova'], [19.25, 'guardPost']], extra: 'rex', speed: 0.9 },
  };
  const SPEED = { jeet: 1.4, smolwassie: 0.8, wassie: 0.85, cricketwhale: 0.8, memekid: 1.1 };
  const line = l => (typeof l === 'string' ? { text: l } : l);

  function schedOf(c, id) {                                                          // CULTURE hours [[from, to, place]] -> [[hour, spot]]; gaps become "inside the hotel" (or a poof for the rare ones)
    const rs = c.hours.slice().sort((a, b) => a[0] - b[0]), out = []; let hasZero = false;
    const spotOf = p => { const s = SPOT[id]; return (s && s[p]) || (s && s.any) || (p === 'any' ? 'sidewalkS' : p === 'street' ? 'tourist' : 'hf1'); };
    for (let i = 0; i < rs.length; i++) {
      const [from, to, place] = rs[i], sp = spotOf(place); if (from === 0) hasZero = true;
      out.push([from, sp]);
      const next = rs[i + 1]; if (to < 24 && !(next && next[0] === to)) { const off = c.rare ? 'poof_' + sp : 'hotel'; if (c.rare && !PL[off]) PL[off] = door(PL[sp].x, PL[sp].z); out.push([to, off]); }
    }
    if (!hasZero) { const off = c.rare ? 'poof_' + out[out.length - 1][1].replace(/^poof_/, '') : 'hotel'; if (c.rare && !PL[off]) PL[off] = door(PL[out[0][1]].x, PL[out[0][1]].z); out.unshift([0, off]); }
    return out.sort((a, b) => a[0] - b[0]);
  }
  const ROSTER = [];
  const addMember = (c, cameo, idOverride, mate) => {
    const id = idOverride || c.id, sv = SERVICE[c.id], x = CULTURE.residents && sv ? CULTURE.residents[sv.extra] || [] : [];
    const pool = c.lines.map(line).concat(x.map(line)), look = LOOK[c.id] || LOOK.twins;
    const r = { id, name: c.name, role: sv ? sv.role : c.role, cameo, svc: sv ? sv.svc : null, pool, rare: !!c.rare, quoted: !!c.quoted, card: c.card || '',
      traits: traitsOf(look), k: look[7] || 1, speed: sv ? sv.speed : (SPEED[c.id] || 0.9), mate, pk: {} };
    r.sched = sv ? sv.sched : schedOf(c, id);
    ROSTER.push(r);
  };
  for (const c of CULTURE.cast) { if (c.id === 'twins') { addMember(c, false, 'twins1'); addMember(c, false, 'twins2'); } else addMember(c, false); }
  for (const c of CULTURE.cameos) addMember(c, true);

  // ---------- walkable grid and paths between places (built on the first frame, so props.js can add its blockers first and call NPC.invalidate())
  const gi = v => Math.max(0, Math.min(NG - 1, Math.floor((v + GH) / CELL_N))), gw = c => (c + 0.5) * CELL_N - GH;
  const G = new Uint8Array(NG * NG);
  const blockedAt = (x, z, r = 0.28) => { if (Math.abs(x) > GH || Math.abs(z) > GH) return true; for (const b of WORLD_BLOCKERS) if (Math.abs(x - b.x) < b.hw + r && Math.abs(z - b.z) < b.hd + r) return true; return false; };
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
  let ROUTES = {}, planned = false;
  const routeBetween = (a, b) => ROUTES[a + '>' + b] || (ROUTES[a + '>' + b] = route(PL[a].x, PL[a].z, PL[b].x, PL[b].z));
  const PL0 = {}; for (const k in PL) PL0[k] = { x: PL[k].x, z: PL[k].z };

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
  function planAll() {                                                              // grid from the blockers as they are now, spots nudged to free ground, every day planned
    for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) G[j * NG + i] = blockedAt(gw(i), gw(j)) ? 1 : 0;
    ROUTES = {};
    for (const k in PL) { const p = PL[k], o = PL0[k], [x, z] = freeNear(o.x, o.z); if (Math.hypot(x - o.x, z - o.z) > 0.05 && p.act !== 'in') console.warn('npc place moved', k, o.x, o.z, '->', x, z); if (p.act !== 'in') { p.x = x; p.z = z; } else { p.x = o.x; p.z = o.z; } }
    for (const r of ROSTER) plan(r);
    planned = true;
  }

  // ---------- where is a resident at time t (seconds of the day)? -> {x, z, ry, moving, inside, place}
  const tri = p => { const q = ((p % 2) + 2) % 2; return q < 1 ? q : 2 - q; };
  const atPlace = (p, t, since, speed) => {
    if (p.act === 'in') return { x: p.x, z: p.z, ry: p.ry, moving: false, inside: true, place: p };
    if (p.act === 'stroll') {
      const ph = (t - since) * speed / p.len, f = tri(ph), dir = (((ph % 2) + 2) % 2) < 1 ? 1 : -1, ang = Math.atan2(p.bx - p.x, p.bz - p.z);
      return { x: p.x + (p.bx - p.x) * f, z: p.z + (p.bz - p.z) * f, ry: dir > 0 ? ang : ang + Math.PI, moving: true, inside: false, place: p };
    }
    return { x: p.x, z: p.z, ry: p.ry, moving: false, inside: false, place: p };
  };
  function where(r, t) {
    const pin = NPC.pins[r.id]; if (pin && PL[pin]) return atPlace(PL[pin], t, 0, r.speed);      // an event keeps this resident somewhere (culture.js)
    const s = r.segs.find(g => t >= g.t0 && t < g.t1) || r.segs[r.segs.length - 1];
    if (s.kind === 'go') {
      const d = Math.min(s.rt.len, (t - s.t0) * r.speed), c = s.rt.cum; let i = 1; while (i < c.length - 1 && c[i] < d) i++;
      const a = s.rt.pts[i - 1], b = s.rt.pts[i], u = (d - c[i - 1]) / Math.max(1e-6, c[i] - c[i - 1]);
      return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, ry: Math.atan2(b[0] - a[0], b[1] - a[1]), moving: true, inside: false, place: PL[s.to] };
    }
    return atPlace(PL[s.place], t, s.since, r.speed);
  }

  // ---------- the bodies
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0); };
  NPC.now = () => NPC.override !== null ? NPC.override : (DAY.mode === 'real' ? DAY.hour * 3600 : (DAY.fixedHour * 3600 + (performance.now() - NPC.t0) / 1000));
  const today = () => (typeof CULTURE_RT !== 'undefined' ? CULTURE_RT.date() : new Date());
  const rtOn = id => typeof CULTURE_RT !== 'undefined' && CULTURE_RT.isActive(id);
  const dayRoll = id => hash(id + today().toDateString()) / 4294967296;                 // the same number for everyone on one day
  function gateOf(r) {                                                              // rare residents come on some days only
    if (r.id === 'satoshishadow') return rtOn('satoshi_shadow') || NPC.forced === 'satoshishadow';
    return !r.rare || dayRoll(r.id) < 0.5 || NPC.forced === r.id;
  }
  function build(r) {
    const c = chogFromTraits(r.traits, { scale: CHOG_SCALE * r.k });
    c.userData.netName = r.name; c.userData.npc = r; c.userData.onClick = () => NPC.openCard(r); c.visible = false; NPC.group.add(c);
    r.c = c; r.plate = PLATES.add(c, r.role || 'Resident'); walkers.push({ c, npc: r });
  }
  for (const r of ROSTER) { r.base = CHOG_SCALE * r.k; r.f = 0; r.show = false; r.t0 = (hash(r.id) % 600) / 100; r.w = null; r.ry = 0; r.c = null; NPC.list.push(r); }
  const key = (r, slot) => r.svc ? -1 : (r.rare ? 0 : 1 + (hash(r.id + slot) % 1000) / 1000);      // service first, rare guests, then a shuffle that turns every two hours

  // ---------- per frame: place everyone, cap the crowd, animate
  let acc = 1;
  animated.push((tm, dt) => {
    if (!NPC.group.visible) return;                                                 // inside a room or the hotel
    if (!planned) planAll();
    const t = NPC.now() % DAY_S;
    acc += dt; const sel = acc > 0.4; if (sel) acc = 0;
    for (const r of NPC.list) r.w = where(r, t);
    if (sel || NPC.dirty) {
      NPC.dirty = false; const room = Math.max(0, Math.min(NPC.list.length, NPC.target - 1 - (typeof NET !== 'undefined' ? NET.remotes.size : 0))); let n = 0, slot = Math.floor(t / 7200);
      for (const r of NPC.list.slice().sort((a, b) => key(a, slot) - key(b, slot))) { r.show = !r.w.inside && gateOf(r) && n < room; if (r.show) { n++; if (!r.c) build(r); } }
    }
    for (const r of NPC.list) {
      if (!r.c) continue;
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
    if (NPC.card && (!NPC.card.show || NPC.card.f < 0.5)) NPC.closeCard();
  });

  // ---------- lines: only when you click (no proximity bubbles). One random line of the pool, never the same twice in a row
  function poolOf(r) {
    const d = today(), m = d.getMonth() + 1, dd = d.getDate();
    const ok = l => !l.when || ((!l.when.month || l.when.month === m) && (!l.when.dayFrom || dd >= l.when.dayFrom) && (!l.when.dayTo || dd <= l.when.dayTo));
    const p = r.pool.filter(ok); if (rtOn('oct10')) p.push({ text: 'October 10. Nineteen billion. We remember.' });
    return p;
  }
  NPC.sayLine = r => {
    const l = CULTURE.pick(poolOf(r), r.pk) || { text: '...' }; let text = l.text;
    if (rtOn('gm_hour') && !/^gm\b/i.test(text)) text = 'gm. ' + text;               // the gm hour: every resident starts with gm
    return { text, src: l.src || '' };
  };
  const short = s => (s.length > 110 ? s.slice(0, 107).replace(/\s+\S*$/, '') + '…' : s);
  NPC.openCard = r => {
    if (typeof PROPS !== 'undefined' && PROPS.closeCard) PROPS.closeCard();
    NPC.card = r; const l = NPC.sayLine(r); r.cardLine = l.text; r.cardSrc = l.src; r.cardNote = r.cameo ? CULTURE.cameoNote : (r.card || '');
    if (r.plate) { PLATES.say(r.plate, short(l.text)); if (r.plate.say) r.plate.say.style.fontSize = rtOn('sunday_scaries') && r.id === 'doombear' ? '1.3em' : ''; }
    if (typeof render === 'function') render();
  };
  NPC.closeCard = () => { NPC.card = null; if (typeof render === 'function') render(); };
  NPC.actionFor = r => (r.svc === 'guide' ? { label: 'Show me around', run: () => { NPC.closeCard(); if (typeof TOUR !== 'undefined') TOUR.restart(); } } : null);
  NPC.setTime = s => { NPC.override = s === null ? null : s; NPC.dirty = true; };             // testing: NPC.setTime(14 * 3600) pins the schedule clock
  NPC.where = (id, s) => { const r = NPC.list.find(x => x.id === id); if (!planned) planAll(); return r ? where(r, s % DAY_S) : null; };
  NPC.invalidate = () => { planned = false; NPC.dirty = true; };                             // props.js added blockers: plan again on the next frame
  NPC.byId = id => NPC.list.find(x => x.id === id);
  NPC.PL = PL; NPC.ROSTER = ROSTER; NPC.blockedAt = blockedAt;
})();
