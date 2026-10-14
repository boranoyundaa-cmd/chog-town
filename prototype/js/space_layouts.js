// ===== ready-made rooms: layouts that fit any floor size, and the checker that every one of them must pass =====
// A layout is a function (W, D, opts) -> room document. It is built from the walls outwards (furniture flush against a wall, art hung on a wall, a cluster in the middle), so the same layout
// fills a 13 x 10 Home or a 22 x 15 penthouse. The editor offers them as a starting point (room.js "Ready-made rooms"); the hotel's own venues are made from them (tools/build_seed_venues.js).
// Loaded after space_data.js (needs SPACE.PIECES and SPACE.windowsFor). Also loaded by the tools through vm, so it only uses SPACE.
// Frame: x runs west to east, z north to south; the back walls are north (z = -D/2) and west (x = -W/2); the door is on the north wall at u = W/2 - 1.6, and in a room with an upper level the
// stairs stand 3.2 m to its left (SPACE.stairsU). A piece faces local +z: ry 0 faces south (so it stands against the north wall), 90 faces east (west wall), 180 faces north (south wall), 270 faces west (east wall).
(function () {
  const P = SPACE.PIECES, fpOf = id => P[id].fp, isWall = d => d.cat === 'wall' || d.fp[1] <= 0.12, isFlat = d => d.cat === 'floor' || d.cat === 'ceiling';
  const swap = ry => (((ry || 0) % 180) + 180) % 180 !== 0;
  const rectOf = it => { const d = P[it.p], q = swap(it.ry); return { x: it.x, z: it.z, hw: (q ? d.fp[1] : d.fp[0]) / 2, hd: (q ? d.fp[0] : d.fp[1]) / 2 }; };
  // how tall a piece stands (from its parts), to keep art from hanging behind a bookshelf and tall things from standing in front of a window
  const lying = p => p.r && (Math.abs(p.r[0]) === 90 || Math.abs(p.r[2]) === 90);
  const heightOf = id => { let h = 0; for (const p of P[id].parts) { if (p.t === 'light') continue; const y = (p.p || [0, 0, 0])[1], s = p.s || [], k = p.k ? p.k[1] : 1; let top = y; if (p.t === 'box') top = y + (s[1] || 1) / 2 * k; else if (p.t === 'cyl') top = y + (lying(p) ? (s[0] || 0.5) : (s[2] || 1) / 2); else if (p.t === 'sph') top = y + (s[0] || 0.5) * k; else if (p.t === 'cone') top = y + (s[1] || 1) / 2; else if (p.t === 'plane') top = y + (s[1] || 1) / 2; h = Math.max(h, top); } return h; };
  const wallBottom = id => { let m = 9; for (const p of P[id].parts) { if (p.t === 'light') continue; const y = (p.p || [0, 0, 0])[1], s = p.s || []; m = Math.min(m, p.t === 'box' || p.t === 'plane' ? y - (s[1] || 1) / 2 : p.t === 'cyl' && lying(p) ? y - (s[0] || 0.5) : y - (s[2] || s[1] || 0.1) / 2); } return m; };
  const lightsIn = id => P[id].parts.filter(p => p.t === 'light').length;
  const up2 = v => Math.ceil(v * 100 - 1e-6) / 100, down2 = v => Math.floor(v * 100 + 1e-6) / 100, num = v => +(+v).toFixed(2);

  // ------------------------------------------------------------------ the checker (the rules of room.js `fits`, plus "art must not hang behind a tall piece")
  SPACE.checkDoc = function (doc, W, D, o = {}) {
    const bad = [], items = doc.pieces || [], doorU = W / 2 - 1.6, eps = 1e-6, th = SPACE.THEMES[doc.theme] || SPACE.THEMES.studio;
    const wins = doc.windows === false ? [] : SPACE.windowsFor(th, W, D, !!o.stairs), stairsU = o.stairs ? SPACE.stairsU(W) : null;
    const note = (it, m) => bad.push(it.p + ' at ' + it.x + ',' + it.z + ': ' + m);
    if (o.limit && items.length > o.limit) bad.push(items.length + ' pieces (budget ' + o.limit + ')');
    let lights = 0; const placed = [];
    for (const it of items) {
      const d = P[it.p]; if (!d) { bad.push('unknown piece ' + it.p); continue; }
      lights += lightsIn(it.p);
      if (isWall(d)) {
        const w = swap(it.ry) ? 'x' : 'z', half = d.fp[0] / 2, u = w === 'z' ? it.x : it.z, len = w === 'z' ? W : D;
        if (w === 'z' ? Math.abs(it.z + D / 2) > eps : Math.abs(it.x + W / 2) > eps) note(it, 'not on the wall (floating)');
        if (Math.abs(u) + half > len / 2 + eps) note(it, 'outside the wall');
        if (w === 'z' && Math.abs(u - doorU) < half + 0.8) note(it, 'over the door');
        if (w === 'z' && stairsU !== null && Math.abs(u - stairsU) < half + 0.8) note(it, 'over the stairs');
        for (const win of wins) if (win.wall === w && Math.abs(u - win.u) < half + win.w / 2 + 0.15) note(it, 'in front of a window');
        for (const q of placed) if (q.wall && q.w === w && Math.abs(u - q.u) < half + q.half - 0.02) note(it, 'overlaps ' + q.p + ' on the wall');
        placed.push({ p: it.p, wall: true, w, u, half, bottom: wallBottom(it.p) }); continue;
      }
      const r = rectOf(it), flat = isFlat(d), grp = d.cat === 'ceiling' ? 2 : d.cat === 'floor' ? 1 : 0;
      if (r.x - r.hw < -W / 2 - eps || r.x + r.hw > W / 2 + eps || r.z - r.hd < -D / 2 - eps || r.z + r.hd > D / 2 + eps) note(it, 'outside the room');
      if (!flat && Math.abs(r.x - doorU) < r.hw + 0.9 && r.z - r.hd < -D / 2 + 1.5) note(it, 'blocks the way to the door');
      if (!flat && stairsU !== null && Math.abs(r.x - stairsU) < r.hw + 1.2 && r.z - r.hd < -D / 2 + 2.4) note(it, 'blocks the stairs');
      for (const q of placed) if (!q.wall && q.grp === grp && Math.abs(r.x - q.x) < r.hw + q.hw - 0.02 && Math.abs(r.z - q.z) < r.hd + q.hd - 0.02) note(it, 'overlaps ' + q.p);
      if (!flat && heightOf(it.p) > 1.55) {                                                // a piece that reaches a window's lower edge (1.6 m) and stands in front of it
        if (r.z - r.hd < -D / 2 + 0.9) for (const win of wins) if (win.wall === 'z' && Math.abs(r.x - win.u) < r.hw + win.w / 2 - 0.1) note(it, 'stands in front of a window');
        if (r.x - r.hw < -W / 2 + 0.9) for (const win of wins) if (win.wall === 'x' && Math.abs(r.z - win.u) < r.hd + win.w / 2 - 0.1) note(it, 'stands in front of a window');
      }
      placed.push({ p: it.p, x: r.x, z: r.z, hw: r.hw, hd: r.hd, grp, tall: heightOf(it.p) });
    }
    for (const a of placed) if (a.wall) for (const f of placed) {                          // art hidden behind a tall floor piece that stands against the same wall
      if (f.wall || f.grp !== 0 || f.tall < a.bottom + 0.1) continue;
      if (a.w === 'z' && f.z - f.hd < -D / 2 + 0.9 && Math.abs(a.u - f.x) < a.half + f.hw) bad.push(a.p + ' on the north wall hangs behind ' + f.p);
      if (a.w === 'x' && f.x - f.hw < -W / 2 + 0.9 && Math.abs(a.u - f.z) < a.half + f.hd) bad.push(a.p + ' on the west wall hangs behind ' + f.p);
    }
    if (lights > (o.lights || 99)) bad.push(lights + ' lights (budget ' + o.lights + ')');
    return { bad, lights };
  };

  // ------------------------------------------------------------------ the placement helpers
  function R(W, D, theme, windows, opts = {}) {
    const x0 = -W / 2, z0 = -D / 2, x1 = W / 2, z1 = D / 2, doorU = W / 2 - 1.6, th = SPACE.THEMES[theme] || SPACE.THEMES.studio, wins = windows === false ? [] : SPACE.windowsFor(th, W, D, !!opts.stairs);
    const stairsU = opts.stairs ? SPACE.stairsU(W) : null, northEnd = stairsU !== null ? stairsU - 1.3 : doorU - 0.95, items = [];
    const add = (p, x, z, ry = 0, o) => { const it = Object.assign({ p, x: num(x), z: num(z) }, ry ? { ry } : {}, o || {}); items.push(it); return it; };
    const r = { W, D, x0, z0, x1, z1, doorU, northEnd, items, add, wins, mx: 0, mz: 0 };
    // the stretches of a wall that a piece may not occupy: the door, the stairs, windows (for tall pieces and for art), and floor pieces already standing against it (for art: only tall ones)
    const taken = (wall, tall, hang) => {
      const out = [];
      if (wall === 'n') { out.push([doorU - 0.9, doorU + 0.9]); if (stairsU !== null) out.push([stairsU - 1.2, stairsU + 1.2]); }
      for (const w of wins) if (w.wall === (wall === 'n' ? 'z' : 'x') && (tall || hang)) out.push([w.u - w.w / 2 - (hang ? 0.15 : 0.05), w.u + w.w / 2 + (hang ? 0.15 : 0.05)]);
      for (const it of items) {
        const d = P[it.p]; if (isWall(d) || isFlat(d)) continue; const q = rectOf(it);
        if (hang && heightOf(it.p) <= 1.2) continue;
        if (wall === 'n' && q.z - q.hd < z0 + 0.9) out.push([q.x - q.hw, q.x + q.hw]);
        if (wall === 'w' && q.x - q.hw < x0 + 0.9) out.push([q.z - q.hd, q.z + q.hd]);
      }
      return out;
    };
    r.n = (id, u, o) => add(id, u, up2(z0 + fpOf(id)[1] / 2), 0, o);                  // against the north wall, facing south
    r.w = (id, u, o) => add(id, up2(x0 + fpOf(id)[1] / 2), u, 90, o);                  // against the west wall, facing east
    r.s = (id, u, o) => add(id, u, down2(z1 - fpOf(id)[1] / 2), 180, o);               // against the south wall, facing north
    r.e = (id, u, o) => add(id, down2(x1 - fpOf(id)[1] / 2), u, 270, o);               // against the east wall, facing west
    // line: pieces one after another along a wall from the corner; each moves past anything in its way and the run stops where the wall (or the door) ends
    r.line = (wall, ids, o = {}) => {
      const gap = o.gap ?? 0.05, lo = (wall === 'n' ? x0 : z0) + (o.from ?? 0.05), hi = o.to ?? (wall === 'n' ? northEnd : z1 - 0.05);
      let u = lo; const out = [];
      for (const id of ids) {
        const w = fpOf(id)[0], tall = heightOf(id) > 1.5;
        for (let guard = 0; guard < 30; guard++) { const c = taken(wall, tall, false).find(([a, b]) => u < b && u + w > a); if (!c) break; u = c[1] + 0.02; }
        if (u + w > hi + 1e-6) break;
        out.push(wall === 'n' ? r.n(id, u + w / 2) : r.w(id, u + w / 2)); u += w + gap;
      }
      return out;
    };
    // hang: wall pieces one after another over a stretch of a wall, skipping windows, the door, the stairs and tall furniture
    r.hang = (wall, ids, o = {}) => {
      const lo = (wall === 'n' ? x0 : z0) + (o.from ?? 0.8), hi = o.to ?? (wall === 'n' ? northEnd - 0.1 : z1 - 0.8), step = o.step ?? 0.4; let u = lo; const out = [];
      for (const spec of ids) {
        const id = typeof spec === 'string' ? spec : spec.p, extra = typeof spec === 'string' ? undefined : Object.assign({}, spec, { p: undefined });
        if (extra) delete extra.p;
        const half = fpOf(id)[0] / 2; let ok = false; u = Math.max(u, lo + half);
        for (let guard = 0; guard < 80; guard++) { const c = taken(wall, true, true).find(([a, b]) => u + half > a && u - half < b); if (!c) { ok = true; break; } u = c[1] + half + 0.02; }
        if (!ok || u + half > hi + 1e-6) break;
        out.push(wall === 'n' ? add(id, u, z0, 0, extra) : add(id, x0, u, 90, extra)); u += half + step + half;
      }
      return out;
    };
    // a table with seats on both long sides (the seats face the table: north side faces south, south side faces north)
    r.set = (x, z, table = 'diningTable', seat = 'stool', dx = 0.5, dz = 0.78) => { add(table, x, z); add(seat, x - dx, z - dz, 0); add(seat, x + dx, z - dz, 0); add(seat, x - dx, z + dz, 180); add(seat, x + dx, z + dz, 180); };
    // a grid inside a rectangle: as many columns and rows as fit at that pitch (at most maxC x maxR), spread evenly over it
    r.grid = (ax, bx, az, bz, px, pz, fn, o = {}) => {
      const cols = Math.max(1, Math.min(o.maxC || 9, Math.floor((bx - ax) / px + 1e-6))), rows = Math.max(1, Math.min(o.maxR || 9, Math.floor((bz - az) / pz + 1e-6)));
      const sx = (bx - ax) / cols, sz = (bz - az) / rows;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) fn(ax + sx / 2 + i * sx, az + sz / 2 + j * sz, i, j, cols, rows);
    };
    r.doc = (name, extra) => Object.assign({ name, theme, pieces: items }, windows === false ? { windows: false } : {}, extra || {});
    return r;
  }
  SPACE.layoutKit = R;

  // ------------------------------------------------------------------ the layouts
  const READY = SPACE.READY = {}, def = (id, name, cat, theme, desc, make) => { READY[id] = { id, name, cat, theme, desc, make }; };
  const cyc = (id, n) => Array.from({ length: n }, () => id);

  def('cafe', 'Café', 'Café', 'studio', 'Coffee, quiet tables and a counter. Say hi to whoever sits next to you.', (W, D, o) => {
    const r = R(W, D, 'studio', true, o), { x0, z0, x1, z1 } = r;
    r.line('n', ['kitchen', 'fridge', 'bookshelf', 'bookshelf'], { from: 0.1, gap: 0.2 });
    r.line('w', ['bookshelf', 'bookshelf'], { from: 1.2, gap: 0.2, to: z1 - 3.0 });
    r.grid(x0 + 2.4, x1 - 1.9, z0 + 3.0, z1 - 1.5, 2.9, 2.7, (x, z) => { r.set(x, z); r.add('pendantLamp', x, z); }, { maxC: 4, maxR: 3 });
    r.add('tallPlant', x0 + 0.6, z1 - 0.6); r.add('plant', x1 - 0.5, z1 - 0.5); r.add('tallPlant', x1 - 0.55, z0 + 3.5); r.add('plant', x0 + 0.5, z1 - 3.4);
    r.hang('n', ['neonOpen', 'wallArt', 'wallArt'], { from: 0.8 }); r.hang('w', ['wallArt', { p: 'wallTextSoft', txt: 'good coffee', c: '#3f3850' }, 'wallArt'], { from: 0.8 });
    return r.doc('Café', { wall: { c: '#f0d8c0', pat: 'wainscot' }, floor: { c: '#b8855a', pat: 'boards' } });
  });

  def('club', 'Neon club', 'Club', 'cyberpunk', 'The neon room. Lights are the whole point here: place a few and watch the mood change.', (W, D, o) => {
    const r = R(W, D, 'cyberpunk', false, o), { x0, z0, x1, z1 } = r, cx = (x0 + x1) / 2, dz = (z0 + z1) / 2 - 0.2;
    r.line('n', ['speaker', 'serverRack', 'holoScreen', 'serverRack', 'speaker'], { from: 0.4, gap: 0.45 });
    r.line('w', ['vending', 'vending'], { from: 1.6, gap: 0.3 });
    r.add('discoBall', cx + 0.6, dz);
    r.grid(x0 + 4, x1 - 2.5, dz - 2.2, dz + 2.2, 3.4, 3.0, (x, z, i, j) => { r.add('ceilingNeon', x, z, 0, { c: (i + j) % 2 ? '#2ad8ff' : '#ff2a98' }); }, { maxC: 3, maxR: 2 });
    const lounge = (x, z) => { r.add('coffeeTable', x, z); r.add('gamingChair', x - 1.35, z, 90); r.add('gamingChair', x + 1.35, z, 270); r.add('beanbag', x, z + 1.35); };
    lounge(x0 + 3.6, z1 - 2.4); lounge(x1 - 3.8, z1 - 2.4); if (W > 17) lounge(cx, z1 - 2.4);
    r.add('beanbag', x0 + 2.4, dz + 1.2); r.add('beanbag', x0 + 3.6, dz + 0.3);
    r.hang('w', ['neonTube', 'neonOpen', 'neonTubeBlue'], { from: 0.8, step: 0.5 }); r.hang('n', ['neonTube', 'neonTubeBlue'], { from: 0.8, step: 0.5 });
    return r.doc('Neon club', { view: 'neon', wall: { c: '#2a2058', pat: 'panels' }, floor: { c: '#1c1840', pat: 'grid' } });
  });

  def('arcade', 'Arcade', 'Arcade', 'retro80s', 'Cabinets in rows, a boombox and a high-score wall. Come break a record.', (W, D, o) => {
    const r = R(W, D, 'retro80s', false, o), { x0, z0, x1, z1 } = r, cx = (x0 + x1) / 2, zc = (z0 + z1) / 2 + 0.9;
    r.line('n', cyc('arcadeCab', 5), { from: 0.3, gap: 0.08 });
    r.line('w', cyc('arcadeCab', 3), { from: 0.3, gap: 0.08, to: zc - 1.4 });
    r.grid(x0 + 4.2, x1 - 2.2, zc - 0.5, zc + 0.5, 1.1, 1, (x, z, i) => { r.add('arcadeCab', x, zc - 0.45, 180); r.add('arcadeCab', x, zc + 0.45); }, { maxC: W > 17 ? 7 : 5, maxR: 1 });
    r.add('beanbag', x0 + 1.5, z1 - 2.7); r.add('beanbag', x0 + 3.0, z1 - 2.2); r.add('boombox', cx - 1.5, z1 - 1.6, 0);
    r.add('palm', x1 - 0.6, z1 - 0.6); r.add('palm', x0 + 0.6, z1 - 0.7); r.add('discoBall', cx + 0.5, (z0 + z1) / 2 - 1.2); r.add('ceilingNeon', cx - 2.6, zc + 2.2, 0, { c: '#ff4ac8' }); r.add('ceilingNeon', cx + 3.0, zc + 2.4, 0, { c: '#4ae8ff' });
    r.hang('n', ['triangleNeon'], { from: 0.8 }); r.hang('w', ['sunPoster'], { from: 0.8 });
    return r.doc('Arcade', { view: 'night' });
  });

  def('gallery', 'Gallery', 'Gallery', 'studio', 'A white room with a few pictures and a lot of quiet. A good place to look at things.', (W, D, o) => {
    const r = R(W, D, 'studio', false, o), { x0, z0, x1, z1 } = r, mx = (x0 + x1) / 2 + 0.6, mz = (z0 + z1) / 2 + 0.6;
    r.hang('n', [{ p: 'wallText', txt: 'GALLERY', c: '#7a3ac8' }, ...cyc('wallArt', 10)], { from: 0.8, step: 0.6 }); r.hang('w', [{ p: 'wallTextSoft', txt: 'welcome', c: '#3f3850' }, ...cyc('wallArt', 10)], { from: 0.8, step: 0.6 });
    r.add('rug', mx, mz); r.add('sofa', mx, mz + 0.62); r.add('sofa', mx, mz - 0.62, 180);
    r.add('bench', mx - 0.2, z0 + 2.9, 180); r.add('bench', x0 + 2.9, mz - 0.5, 270); if (W > 17) { r.add('bench', mx + 3.6, z0 + 2.9, 180); r.add('bench', x0 + 2.9, mz + 3.0, 270); }
    r.add('holoScreen', mx - 3.4, mz + 0.9, 20); r.add('holoScreen', mx + 3.4, mz - 0.2, -20); r.add('crystal', mx - 3.0, mz - 1.8); r.add('crystal', mx + 3.2, mz + 1.8);   // display stands and two plinths to walk around
    r.add('tallPlant', x0 + 0.6, z1 - 0.6); r.add('tallPlant', x1 - 0.6, z0 + 3.4); r.add('plant', x1 - 0.5, z1 - 0.5); r.add('floorLamp', x1 - 1.2, mz + 1.0); r.add('floorLamp', x0 + 1.4, z1 - 1.2);
    r.add('pendantLamp', mx - 2.4, mz - 1.5); r.add('pendantLamp', mx + 2.6, mz - 1.2); r.add('pendantLamp', mx, mz + 1.8);
    return r.doc('Gallery', { wall: { c: '#f4efe6', pat: 'subway' }, floor: { c: '#c9b8a0', pat: 'herringbone' } });
  });

  def('orbit', 'Orbit lounge', 'Lounge', 'space', 'A quiet station with a view of nothing but stars. Sit down, take your helmet off.', (W, D, o) => {
    const r = R(W, D, 'space', true, o), { x0, z0, x1, z1 } = r, cx = (x0 + x1) / 2, mz = (z0 + z1) / 2 + 0.8;
    const run = r.line('n', ['consoleDesk', 'holoGlobe', 'crystal', 'consoleDesk'], { from: 0.5, gap: 0.5 });
    for (const it of run) if (it.p === 'consoleDesk') r.add('spaceChair', it.x, z0 + 0.9 + 0.5, 180);
    r.line('w', ['capsuleBed', 'capsuleBed'], { from: 2.6, gap: 0.35 });
    for (const k of W > 17 ? [-3.4, 4.6] : [0]) { r.add('rug', cx + 1 + k, mz); r.add('sofa', cx + 1 + k, mz + 1.3); r.add('coffeeTable', cx + 1 + k, mz - 0.1); r.add('armchair', cx - 0.9 + k, mz - 0.1, 90); r.add('armchair', cx + 2.9 + k, mz - 0.1, 270); }
    r.add('oxygenTube', x0 + 0.6, z1 - 0.6); r.add('oxygenTube', x1 - 0.6, z1 - 0.7); r.add('oxygenTube', x1 - 0.6, z0 + 3.2); r.add('crystal', x0 + 0.8, z1 - 2.0);
    r.add('ceilingNeon', cx - 1.4, mz - 2.0, 0, { c: '#5ad8ff' }); r.add('ceilingNeon', cx + 3.4, mz + 2.2, 0, { c: '#ffb03a' });
    return r.doc('Orbit lounge', { view: 'night' });
  });

  def('haunted', 'Haunted hollow', 'Spooky', 'halloween', 'A cauldron, a few ghosts and candles that flicker on their own. Not scary, mostly.', (W, D, o) => {
    const r = R(W, D, 'halloween', true, o), { x0, z0, x1, z1 } = r, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2 + 0.6;
    r.line('w', ['coffinBed'], { from: 2.4 }); r.line('n', ['pumpkin', 'bigPumpkin', 'pumpkin'], { from: 1.0, gap: 0.6 });
    r.add('cauldron', cx + 0.8, cz); for (const [dx, dz] of [[-1.5, -1.3], [2.0, -1.2], [-1.4, 1.4], [2.0, 1.5]]) r.add('candles', cx + 0.8 + dx, cz + dz);
    r.add('ghost', cx - 2.8, cz - 0.4); r.add('ghost', cx + 3.2, cz + 0.2);
    for (let i = 0, u = x0 + 3.0; i < (W > 17 ? 8 : 4) && u < x1 - 2.6; i++, u += 1.5) r.add('gravestone', u, cz + (W > 17 ? 4.2 : 2.9));
    if (W > 17) { r.add('ghost', cx - 6.6, cz - 2.4); r.add('ghost', cx + 6.4, cz + 1.8); r.add('candles', cx - 6.6, cz - 0.6); r.add('candles', cx + 6.4, cz - 0.2); r.add('bigPumpkin', x1 - 1.0, z0 + 3.6); }
    r.add('witchHat', x1 - 0.9, z1 - 2.6); r.add('bigPumpkin', x1 - 0.9, z1 - 0.9);
    r.hang('n', ['cobweb', 'bat', 'bat'], { from: 0.7, step: 1.5 }); r.hang('w', ['cobweb', 'bat'], { from: 0.7, step: 1.5 });
    return r.doc('Haunted hollow', { view: 'night' });
  });

  def('library', 'Reading nook', 'Lounge', 'studio', 'Shelves to the ceiling, soft lamps, nobody talking. Chat is allowed anyway.', (W, D, o) => {
    const r = R(W, D, 'studio', false, o), { x0, z0, x1, z1 } = r, mx = (x0 + x1) / 2 + 0.4, mz = (z0 + z1) / 2 + 0.8;
    r.line('n', cyc('bookshelf', 9), { from: 0.05, gap: 0.12 }); r.line('w', cyc('bookshelf', 9), { from: 0.05, gap: 0.12, to: z1 - 2.6 });
    r.add('rug', mx - 1.4, mz); r.add('armchair', mx - 2.7, mz, 90); r.add('armchair', mx - 0.1, mz, 270); r.add('lampTable', mx - 1.4, mz + 1.3);
    r.add('rug', mx + 3.2, mz + 1.2); r.add('sofa', mx + 3.2, mz + 2.1); r.add('coffeeTable', mx + 3.2, mz + 0.5);
    r.add('floorLamp', x0 + 1.6, z1 - 1.1); r.add('floorLamp', x1 - 0.7, mz - 0.6); r.add('tallPlant', x1 - 0.6, z0 + 3.6); r.add('plant', x1 - 0.5, z1 - 0.5);
    r.add('pendantLamp', mx - 1.4, mz - 0.4); r.add('pendantLamp', mx + 3.2, mz + 0.6);
    r.hang('w', ['wallArt', 'wallArt'], { from: 0.8, step: 0.8 });
    return r.doc('Reading nook', { wall: { c: '#d8c0a0', pat: 'wainscot' }, floor: { c: '#8a5a3a', pat: 'boards' } });
  });

  def('studio', 'Workshop', 'Workshop', 'studio', 'Desks, a kitchenette and a sofa corner. Where people make things together.', (W, D, o) => {
    const r = R(W, D, 'studio', true, o), { x0, z0, x1, z1 } = r, cx = (x0 + x1) / 2;
    const dn = r.line('n', cyc('desk', 4), { from: 0.2, gap: 0.5 }); for (const it of dn) r.add('chair', it.x, z0 + 0.9 + 0.45, 180);
    const dw = r.line('w', ['desk', 'desk', 'kitchen', 'fridge'], { from: 1.4, gap: 0.3 }); for (const it of dw) if (it.p === 'desk') r.add('chair', x0 + 0.9 + 0.45, it.z, 270);
    const tz = z1 - 0.6; r.add('rug', cx + 1.2, tz - 3.1); r.add('sofa', cx + 1.2, tz - 1.9, 0); r.add('coffeeTable', cx + 1.2, tz - 3.4); r.add('armchair', cx - 1.4, tz - 3.2, 90); r.add('armchair', cx + 3.8, tz - 3.2, 270);
    r.add('tallPlant', x1 - 0.6, z1 - 0.6); r.add('plant', x0 + 2.4, z1 - 0.5); r.add('floorLamp', x0 + 1.6, z1 - 2.4); r.add('pendantLamp', cx + 1.2, tz - 3.4); r.add('pendantLamp', x0 + 3.2, z0 + 3.6); r.add('pendantLamp', cx + 2, z0 + 3.4);
    r.hang('n', ['wallArt', 'wallArt'], { from: 0.8 });
    return r.doc('Workshop', { wall: { c: '#e6e0f0', pat: 'plaster' }, floor: { c: '#a89888', pat: 'tiles' } });
  });

  def('terrace', 'Sunset terrace', 'Lounge', 'studio', 'It is always golden hour here. Bean bags, plants and a speaker for the evening.', (W, D, o) => {
    const r = R(W, D, 'studio', true, o), { x0, z0, x1, z1 } = r, cx = (x0 + x1) / 2, mz = (z0 + z1) / 2 + 0.8;
    r.line('n', ['speaker', 'sofa', 'lampTable'], { from: 0.8, gap: 0.3 });
    for (const k of W > 17 ? [-4.2, 4.2] : [0]) { r.add('rug', cx + k, mz); r.add('beanbag', cx + k - 2.2, mz - 0.4); r.add('beanbag', cx + k - 1.3, mz + 1.5); r.add('beanbag', cx + k + 2.2, mz); r.add('beanbag', cx + k + 1.2, mz + 1.6); r.add('sideTable', cx + k, mz - 0.1); }
    r.add('tallPlant', x0 + 0.6, z1 - 0.6); r.add('tallPlant', x1 - 0.6, z1 - 0.6); r.add('plant', x1 - 0.5, z0 + 3.4); r.add('plant', x0 + 0.5, z0 + 3.8); r.add('floorLamp', x0 + 1.6, mz + 1.0); r.add('floorLamp', x1 - 1.4, mz - 1.0);
    for (const k of W > 17 ? [-4.2, 4.2] : [0]) r.add('pendantLamp', cx + k, mz); r.hang('w', ['wallArt', 'wallArt'], { from: 0.8, step: 1.0 });
    return r.doc('Sunset terrace', { view: 'evening', wall: { c: '#f4c8a0', pat: 'plaster' }, floor: { c: '#c8a070', pat: 'wood' } });
  });

  def('garage', 'Synthwave garage', 'Arcade', 'retro80s', 'Old screens, a boombox and a grid floor. Always 1986 in here.', (W, D, o) => {
    const r = R(W, D, 'retro80s', false, o), { x0, z0, x1, z1 } = r, cx = (x0 + x1) / 2, mz = (z0 + z1) / 2 + 0.9;
    r.line('n', ['retroTv', 'retroTv', 'retroTv', 'arcadeCab', 'arcadeCab'], { from: 0.5, gap: 0.3 });
    r.line('w', ['boombox', 'arcadeCab'], { from: 1.8, gap: 0.5 });
    for (const k of W > 17 ? [-4, 4.4] : [0]) { r.add('rug', cx + k, mz); r.add('beanbag', cx + k - 1.7, mz - 0.3); r.add('beanbag', cx + k + 0.2, mz + 1.2); r.add('beanbag', cx + k + 1.9, mz - 0.2); r.add('coffeeTable', cx + k + 0.1, mz - 0.1); }
    r.add('palm', x1 - 0.6, z1 - 0.6); r.add('palm', x0 + 0.7, z1 - 0.6); r.add('discoBall', cx + 0.4, mz - 1.4); r.add('ceilingNeon', cx - 3.2 - (W > 17 ? 2 : 0), mz + 1.4, 0, { c: '#ff4ac8' }); r.add('ceilingNeon', cx + 3.4 + (W > 17 ? 2 : 0), mz + 1.6, 0, { c: '#4ae8ff' });
    r.hang('n', ['triangleNeon'], { from: 0.8 }); r.hang('w', ['sunPoster', 'triangleNeon'], { from: 0.8 });
    return r.doc('Synthwave garage', { view: 'neon' });
  });

  def('canteen', 'Ghost kitchen', 'Café', 'cyberpunk', 'A cyberpunk canteen: vending machines, noodles in the air, holograms over the tables.', (W, D, o) => {
    const r = R(W, D, 'cyberpunk', false, o), { x0, z0, x1, z1 } = r;
    r.line('n', ['kitchen', 'fridge', 'vending', 'vending'], { from: 0.1, gap: 0.2 }); r.line('w', ['serverRack', 'holoScreen'], { from: 1.4, gap: 0.5 });
    r.grid(x0 + 2.6, x1 - 1.9, z0 + 3.2, z1 - 1.5, 3.0, 2.9, (x, z) => { r.set(x, z, 'diningTable', 'gamingChair', 0.5, 0.95); r.add('ceilingNeon', x, z, 0, { c: '#ff2a98' }); }, { maxC: 3, maxR: 2 });
    r.add('beanbag', x1 - 0.8, z1 - 0.9); r.add('plant', x1 - 0.5, z0 + 3.5);
    r.hang('w', ['neonOpen', 'neonTube'], { from: 0.8 }); r.hang('n', ['neonTubeBlue'], { from: 0.8 });
    return r.doc('Ghost kitchen', { view: 'night', wall: { c: '#3a2a70', pat: 'brick' } });
  });

  def('sleepover', 'Sleepover suite', 'Lounge', 'studio', 'Beds, bean bags and a TV. Bring snacks.', (W, D, o) => {
    const r = R(W, D, 'studio', true, o), { x0, z0, x1, z1 } = r, cx = (x0 + x1) / 2, mz = (z0 + z1) / 2 + 0.6;
    r.line('w', ['bed', 'lampTable', 'bed', 'lampTable', 'bed'], { from: 1.2, gap: 0.2, to: z1 - 0.2 });
    r.n('tvUnit', cx + 0.4); r.add('rug', cx + 1.4, mz); r.add('beanbag', cx + 0.2, mz + 0.5); r.add('beanbag', cx + 2.6, mz + 0.4); r.add('beanbag', cx + 1.4, mz - 0.8);
    r.add('tallPlant', x1 - 0.6, z1 - 0.6); r.add('plant', x1 - 0.5, z0 + 3.5); r.add('floorLamp', x1 - 1.4, mz - 0.4); r.add('floorLamp', cx - 2.2, z1 - 1.0);
    r.add('pendantLamp', cx + 1.4, mz); r.hang('n', ['wallArt', 'wallArt'], { from: 0.8, step: 1.2 });
    return r.doc('Sleepover suite', { wall: { c: '#e8d0e8', pat: 'dots' }, floor: { c: '#d8c8b0', pat: 'carpet' } });
  });

  SPACE.READY_ORDER = Object.keys(READY);
})();
