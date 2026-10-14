// ===== ready-made rooms: layouts that fit any floor size, and the checker that every one of them must pass =====
// A layout is a function (W, D, opts) -> room document. It is built from the walls outwards (furniture flush against a wall, art hung on a wall, a cluster in the middle), so the same layout
// fills a 20 x 15 Home or a 33 x 22 penthouse. The editor offers them as a starting point (room.js "Ready-made rooms"); the hotel's own venues are made from them (tools/build_seed_venues.js).
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
    const add = (p, x, z, ry = 0, o) => { if (!P[p]) return { p, x: num(x), z: num(z) };                // a piece that left the catalog (the ceiling lamps) is skipped
      const it = Object.assign({ p, x: num(x), z: num(z) }, ry ? { ry } : {}, o || {}); items.push(it); return it; };
    const r = { W, D, x0, z0, x1, z1, doorU, northEnd, items, add, wins, mx: 0, mz: 0 };
    // the stretches of a wall that a piece may not occupy: the door, the stairs, windows (for tall pieces and for art), and floor pieces already standing against it (for art: only tall ones)
    const taken = (wall, tall, hang, bottom = 0) => {
      const out = [];
      if (wall === 'n') { out.push([doorU - 0.9, doorU + 0.9]); if (stairsU !== null) out.push([stairsU - 1.2, stairsU + 1.2]); }
      for (const w of wins) if (w.wall === (wall === 'n' ? 'z' : 'x') && (tall || hang)) out.push([w.u - w.w / 2 - (hang ? 0.15 : 0.05), w.u + w.w / 2 + (hang ? 0.15 : 0.05)]);
      for (const it of items) {
        const d = P[it.p]; if (hang && isWall(d) && (swap(it.ry) ? 'w' : 'n') === wall) { const u = wall === 'n' ? it.x : it.z; out.push([u - d.fp[0] / 2 - 0.12, u + d.fp[0] / 2 + 0.12]); continue; }       // wall pieces already hung
        if (isWall(d) || isFlat(d)) continue; const q = rectOf(it);
        if (hang && heightOf(it.p) <= Math.max(1.2, bottom + 0.1)) continue;
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
        for (let guard = 0; guard < 80; guard++) { const c = taken(wall, true, true, wallBottom(id)).find(([a, b]) => u + half > a && u - half < b); if (!c) { ok = true; break; } u = c[1] + half + 0.02; }
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
    // ---- placement with checks (2026-10-15): put/ok place only where a piece fits, scatter spreads zones over a region, mount hangs one wall piece at an exact spot
    r.cap = W <= 20.5 ? 14 : W <= 22.5 ? 16 : W <= 27.5 ? 18 : 22;                    // the light budget of this size (server/rooms.js LIMITS, hotel.js TEMPLATES)
    r.lights = () => items.reduce((n, it) => n + (P[it.p] ? lightsIn(it.p) : 0), 0);
    const grpOf = d => d.cat === 'ceiling' ? 2 : d.cat === 'floor' ? 1 : 0;
    r.rectFree = (x, z, hw, hd, pad = 0.02) => {                                       // is a footprint inside the room, off the door and stairs, and clear of every solid piece?
      if (x - hw < x0 - 1e-6 || x + hw > x1 + 1e-6 || z - hd < z0 - 1e-6 || z + hd > z1 + 1e-6) return false;
      if (Math.abs(x - doorU) < hw + 1.3 && z - hd < z0 + 4.2) return false;
      if (stairsU !== null && Math.abs(x - stairsU) < hw + 1.5 && z - hd < z0 + 3.4) return false;
      for (const it of items) { const e = P[it.p]; if (isWall(e) || grpOf(e) !== 0) continue; const q = rectOf(it); if (Math.abs(x - q.x) < hw + q.hw + pad - 0.02 && Math.abs(z - q.z) < hd + q.hd + pad - 0.02) return false; }
      return true;
    };
    r.ok = (id, x, z, ry = 0, pad = 0.02) => {
      const d = P[id]; if (!d) return false; const q = swap(ry), hw = (q ? d.fp[1] : d.fp[0]) / 2, hd = (q ? d.fp[0] : d.fp[1]) / 2, g = grpOf(d), tall = heightOf(id);
      if (g !== 0) {                                                                    // rugs and floor tiles: inside the room and not on another floor piece
        if (x - hw < x0 - 1e-6 || x + hw > x1 + 1e-6 || z - hd < z0 - 1e-6 || z + hd > z1 + 1e-6) return false;
        for (const it of items) { const e = P[it.p]; if (isWall(e) || grpOf(e) !== g) continue; const o = rectOf(it); if (Math.abs(x - o.x) < hw + o.hw - 0.02 && Math.abs(z - o.z) < hd + o.hd - 0.02) return false; }
        return true;
      }
      if (!r.rectFree(x, z, hw, hd, pad)) return false;
      if (tall > 1.55) {
        if (z - hd < z0 + 0.9) for (const w of wins) if (w.wall === 'z' && Math.abs(x - w.u) < hw + w.w / 2 - 0.1) return false;
        if (x - hw < x0 + 0.9) for (const w of wins) if (w.wall === 'x' && Math.abs(z - w.u) < hd + w.w / 2 - 0.1) return false;
      }
      if (tall > 1.2) for (const it of items) {                                         // never hide a wall piece that is already hung
        if (!isWall(P[it.p])) continue; const bottom = wallBottom(it.p) + 0.1, wz = !swap(it.ry), u = wz ? it.x : it.z, half = P[it.p].fp[0] / 2;
        if (tall < bottom) continue;
        if (wz && z - hd < z0 + 0.9 && Math.abs(u - x) < half + hw) return false;
        if (!wz && x - hw < x0 + 0.9 && Math.abs(u - z) < half + hd) return false;
      }
      return true;
    };
    r.put = (id, x, z, ry = 0, o) => r.ok(id, x, z, ry) && (!P[id] || r.lights() + lightsIn(id) <= r.cap) ? add(id, x, z, ry, o) : null;      // a lit piece only goes in while the light budget has room
    r.first = (id, spots, o) => { for (const [x, z, ry] of spots) { const it = r.put(id, x, z, ry || 0, o); if (it) return it; } return null; };
    r.lamp = (id, x, z, ry = 0) => r.lights() + lightsIn(id) <= r.cap ? r.put(id, x, z, ry) : null;      // a lit piece, only inside the light budget
    r.mount = (wall, id, u, o) => {                                                    // one wall piece at an exact spot: off windows, the door, tall furniture and other wall pieces
      const half = fpOf(id)[0] / 2, lo = (wall === 'n' ? x0 : z0) + 0.05, hi = wall === 'n' ? northEnd : z1 - 0.05;
      if (u - half < lo || u + half > hi) return null; if (r.lights() + lightsIn(id) > r.cap) return null;
      if (taken(wall, true, true, wallBottom(id)).some(([a, b]) => u + half > a && u - half < b)) return null;
      for (const q of items) { if (!isWall(P[q.p]) || (swap(q.ry) ? 'w' : 'n') !== wall) continue; if (Math.abs(u - (wall === 'n' ? q.x : q.z)) < half + fpOf(q.p)[0] / 2 + 0.1) return null; }
      return wall === 'n' ? add(id, u, z0, 0, o) : add(id, x0, u, 90, o);
    };
    // wall lamps along a stretch of a wall: in the gaps between windows when there are windows, else evenly spaced
    r.lampsAlong = (wall, from, to, n, id = 'wallLamp') => {
      const ws = wins.filter(w => w.wall === (wall === 'n' ? 'z' : 'x')).map(w => w.u).sort((a, b) => a - b), spots = [];
      if (ws.length) { for (let i = 0; i + 1 < ws.length; i++) spots.push((ws[i] + ws[i + 1]) / 2); }
      else for (let k = 0; k < n; k++) spots.push(from + (to - from) * (k + 0.5) / n);
      let c = 0; for (const u of spots) { if (c >= n) break; if (u > from && u < to && r.mount(wall, id, u)) c++; } return c;
    };
    // spread zones over a region with a low-discrepancy sequence (never a grid): fn(x, z, i) builds a zone where the probe footprint (hw, hd) is free
    r.scatter = (ax, bx, az, bz, n, hw, hd, fn, o = {}) => {
      let placed = 0; for (let k = 1 + (o.skip || 0); k < 500 && placed < n; k++) {
        const x = ax + ((k * 0.7548776662 + 0.2) % 1) * (bx - ax), z = az + ((k * 0.5698402910 + 0.45) % 1) * (bz - az);
        if (!r.rectFree(x, z, hw, hd, o.pad ?? 0.6)) continue; fn(+x.toFixed(2), +z.toFixed(2), placed); placed++;
      } return placed;
    };
    r.lamps = Math.max(6, Math.floor(W / 2.1));                                       // how many pendants and ceiling neons a room of this width may use (the light budgets are small)
    r.edgeS = (id, gap) => { for (let u = x0 + 2.2; u < x1 - 1.6; u += gap) r.put(id, u, down2(z1 - fpOf(id)[1] / 2), 180); };      // pieces spaced along the open south edge (plants and the like)
    r.edgeE = (id, gap) => { for (let u = z0 + 3.6; u < z1 - 1.4; u += gap) r.put(id, down2(x1 - fpOf(id)[1] / 2), u, 270); };      // and along the open east edge
    r.doc = (name, extra) => Object.assign({ name, theme, pieces: items }, windows === false ? { windows: false } : {}, extra || {});
    return r;
  }
  SPACE.layoutKit = R;


  // ------------------------------------------------------------------ the layouts
  // Rooms are designed as zones (a bar, a lounge, window tables, a reading nook...) placed from the walls inwards. Bigger floors get more zones, not more copies of one piece:
  // zones that do not fit are skipped (`put` / `scatter`), so every size stays a clean room. Lights: wall lamps between windows, floor lamps in the lounges; `r.cap` is the budget.
  const READY = SPACE.READY = {}, def = (id, name, cat, theme, desc, make) => { READY[id] = { id, name, cat, theme, desc, make }; };
  const cyc = (id, n) => Array.from({ length: n }, () => id);
  const edges = r => ({ X: u => r.x0 + u, Z: u => r.z0 + u, XE: u => r.x1 - u, ZS: u => r.z1 - u });

  // a table with seats; kind 0 round + 2 chairs, 1 round + 3 stools, 2 dining + 4 chairs, 3 dining + 2 end chairs, 4 side table + 2 armchairs (a coffee corner)
  function tableSet(r, x, z, kind, o = {}) {
    const chair = o.chair || 'chair', stool = o.stool || 'stool', big = chair === 'gamingChair', rz = big ? 1.07 : 0.92, dz = big ? 0.97 : 0.82, dx = big ? 0.46 : 0.45, ex = big ? 1.37 : 1.25;
    if (kind === 0) { r.add('roundTable', x, z); r.add(chair, x, z - rz, 0); r.add(chair, x, z + rz, 180); }
    else if (kind === 1) { r.add('roundTable', x, z); r.add(stool, x - 0.92, z + 0.35); r.add(stool, x + 0.92, z + 0.35); r.add(stool, x, z - 0.86); }
    else if (kind === 2) { r.add('diningTable', x, z); r.add(chair, x - dx, z - dz, 0); r.add(chair, x + dx, z - dz, 0); r.add(chair, x - dx, z + dz, 180); r.add(chair, x + dx, z + dz, 180); }
    else if (kind === 3) { r.add('diningTable', x, z); r.add(chair, x - ex, z, 90); r.add(chair, x + ex, z, 270); }
    else { r.add('sideTable', x, z); r.add('armchair', x - 0.95, z, 90); r.add('armchair', x + 0.95, z, 270); }
  }
  const SET_PROBE = [[1.3, 1.45], [1.3, 1.2], [1.35, 1.45], [1.9, 0.9], [1.5, 0.6]];
  // a lounge: rug, sofa facing south, a low table, two armchairs, a floor lamp. (x, z) = the low table
  function lounge(r, x, z, o = {}) {
    r.put('rug', x, z - 0.5); r.add(o.sofa || 'sofa', x, z - 1.4, 0); r.add(o.table || 'coffeeTable', x, z); r.add(o.chair || 'armchair', x - 1.95, z - 0.7, 90); r.add(o.chair || 'armchair', x + 1.95, z - 0.7, 270);
    if (o.lamp !== false) r.lamp('floorLamp', x + 2.9, z - 1.7); if (o.plant) r.put(o.plant, x - 2.9, z - 1.5);
  }
  const LOUNGE_PROBE = [3.0, 1.55];
  // greenery: a tall plant with two small ones leaning towards the open floor
  function greens(r, x, z, sx = 1, sz = 1, tallId = 'tallPlant', smallId = 'plant') { r.put(tallId, x, z); r.put(smallId, x + 0.8 * sx, z + 0.1 * sz); r.put(smallId, x + 0.15 * sx, z + 0.8 * sz); }

  // ------------------------------------------------------------------ a library of zones: each is a small designed group with the footprint it needs (hw, hd are half sizes round the point).
  // Bigger floors get more zones (extraCount), never more copies of one group: a layout names its extra zones in order and as many as the area earns are placed where they fit.
  const ZONES = {
    lounge: { hw: 3.0, hd: 1.7, fn: (r, x, z) => lounge(r, x, z + 0.6, { plant: 'plant' }) },
    pit: { hw: 3.1, hd: 2.3, fn: (r, x, z) => { r.put('rug', x, z); r.add('sofa', x, z - 1.5, 0); r.add('sofa', x, z + 1.5, 180); r.add('coffeeTable', x, z); r.add('beanbag', x - 2.6, z); r.add('beanbag', x + 2.6, z); r.lamp('floorLamp', x + 3.2, z - 1.6); } },
    garden: { hw: 2.8, hd: 1.4, fn: (r, x, z) => { r.add('planter', x - 1.0, z - 0.2); r.add('planter', x + 1.0, z - 0.2); r.add('tallPlant', x - 2.4, z - 0.1); r.add('tallPlant', x + 2.4, z - 0.1); r.add('bench', x, z + 0.8, 0); r.add('plant', x - 1.6, z + 0.9); r.add('plant', x + 1.6, z + 0.9); } },
    bar: { hw: 1.9, hd: 1.2, fn: (r, x, z) => { r.add('barCounter', x, z); for (const d of [-0.9, 0, 0.9]) r.add('stool', x + d, z + 0.95); r.put('plant', x + 2.0, z); } },
    noodle: { hw: 3.3, hd: 1.3, fn: (r, x, z) => { r.add('barCounter', x - 1.55, z); r.add('barCounter', x + 1.55, z); for (const d of [-2.4, -1.5, -0.6, 0.6, 1.5, 2.4]) r.add('stool', x + d, z + 0.95); r.put('holoScreen', x - 3.9, z); r.put('holoScreen', x + 3.9, z); } },
    read: { hw: 1.9, hd: 1.6, fn: (r, x, z) => { r.put('rug', x, z); r.add('armchair', x - 1.0, z, 90); r.add('armchair', x + 1.0, z, 270); r.add('lampTable', x, z - 0.9); r.add('sideTable', x, z + 0.55); } },
    study: { hw: 2.3, hd: 1.5, fn: (r, x, z) => { tableSet(r, x, z, 2); r.add('lampTable', x + 1.9, z - 0.5); r.put('lowShelf', x - 2.0, z + 0.2, 90); } },
    tables: { hw: 1.4, hd: 1.5, fn: (r, x, z) => tableSet(r, x, z, 0) },
    tables2: { hw: 1.4, hd: 1.4, fn: (r, x, z) => { tableSet(r, x, z, 1); r.put('plant', x + 1.5, z - 0.9); } },
    install: { hw: 2.8, hd: 2.6, fn: (r, x, z) => { r.put('rug', x, z); r.add('sculpture', x, z); for (const [dx, dz] of [[-2.0, -1.5], [2.0, -1.5], [-2.0, 1.5], [2.0, 1.5]]) r.add('plinth', x + dx, z + dz); } },
    beans: { hw: 2.1, hd: 1.6, fn: (r, x, z) => { beanRing(r, x, z); r.lamp('floorLamp', x + 2.2, z - 1.4); } },
    pouf: { hw: 2.0, hd: 1.5, fn: (r, x, z) => { r.put('rug', x, z); r.add('coffeeTable', x, z); r.add('ottoman', x - 1.3, z); r.add('ottoman', x + 1.3, z); r.add('ottoman', x, z + 0.95); } },
    graves: { hw: 3.2, hd: 1.2, fn: (r, x, z) => { for (let i = 0; i < 5; i++) r.add('gravestone', x + (i - 2) * 1.25, z + (i % 2) * 0.4, 180); r.lamp('candles', x - 1.9, z + 1.0); r.lamp('candles', x + 1.9, z + 1.0); r.add('ghost', x + 0.2, z - 1.0); } },
    patch: { hw: 1.7, hd: 1.4, fn: (r, x, z) => { r.lamp('bigPumpkin', x, z); r.lamp('pumpkin', x + 1.4, z + 0.3); r.add('witchHat', x - 1.2, z + 0.4); r.lamp('pumpkin', x - 0.2, z + 1.1); } },
    ritual: { hw: 2.3, hd: 2.0, fn: (r, x, z) => { r.lamp('cauldron', x, z); for (const [dx, dz] of [[-1.7, -1.2], [1.8, -1.2], [-1.5, 1.4], [1.9, 1.5]]) r.lamp('candles', x + dx, z + dz); r.add('ghost', x - 2.6, z); } },
    cabs: { hw: 1.9, hd: 1.0, fn: (r, x, z) => { for (let i = 0; i < 3; i++) { r.add('arcadeCab', x + (i - 1) * 1.05, z - 0.45, 0); r.add('arcadeCab', x + (i - 1) * 1.05, z + 0.45, 180); } } },
    tv: { hw: 2.0, hd: 2.3, fn: (r, x, z) => { r.add('retroTv', x, z - 1.4, 0); r.put('rug', x, z); r.add('sofa', x, z + 1.4, 180); r.add('beanbag', x - 1.9, z + 0.2); r.add('beanbag', x + 1.9, z + 0.2); r.lamp('floorLamp', x + 2.4, z - 1.2); } },
    workbench: { hw: 2.2, hd: 1.3, fn: (r, x, z) => { r.add('desk', x - 1.0, z, 0); r.add('desk', x + 1.0, z, 0); r.add('chair', x - 1.0, z + 0.9, 180); r.add('chair', x + 1.0, z + 0.9, 180); r.put('plant', x + 2.1, z - 0.3); } },
    consoles: { hw: 2.7, hd: 1.4, fn: (r, x, z) => { r.add('consoleDesk', x - 1.2, z, 0); r.add('consoleDesk', x + 1.2, z, 0); r.add('spaceChair', x - 1.2, z + 1.05, 180); r.add('spaceChair', x + 1.2, z + 1.05, 180); r.add('holoGlobe', x + 3.0, z - 0.1); } },
    vend: { hw: 1.8, hd: 1.5, fn: (r, x, z) => { r.add('vending', x - 0.55, z - 0.5); r.add('vending', x + 0.55, z - 0.5); r.add('beanbag', x - 1.2, z + 0.9); r.add('beanbag', x + 0.3, z + 1.1); r.lamp('floorLamp', x + 1.9, z - 0.5); } },
    dance: { hw: 2.1, hd: 2.1, fn: (r, x, z) => { r.put('danceFloor', x, z); r.lamp('discoBall', x, z); } },
    booth: { hw: 1.4, hd: 1.9, fn: (r, x, z) => { r.add('banquette', x, z - 1.2, 0); r.add('banquette', x, z + 1.2, 180); r.add('roundTable', x, z); } },
    beds: { hw: 3.0, hd: 1.5, fn: (r, x, z) => { r.add('bed', x - 1.35, z); r.add('bed', x + 1.35, z); r.add('lampTable', x, z - 1.0); } },
    obs: { hw: 2.3, hd: 1.7, fn: (r, x, z) => { r.put('rug', x, z); r.add('beanbag', x - 1.2, z); r.add('beanbag', x + 0.1, z + 0.9); r.add('beanbag', x + 1.3, z - 0.1); r.add('planter', x, z - 1.2); } },
  };
  const extraCount = (W, D) => Math.max(0, Math.round((W * D - 330) / 75));                  // 20 x 15: 0, 22 x 16: 0, 27 x 20: 3, 33 x 22: 5
  const addZones = (r, names, region, n = extraCount(r.W, r.D)) => {
    const [ax, bx, az, bz] = region || [r.x0 + 4, r.x1 - 2.2, r.z0 + 5.4, r.z1 - 1.6];
    names.slice(0, n).forEach((nm, i) => { const z = ZONES[nm]; r.scatter(ax, bx, az, bz, 1, z.hw, z.hd, (x, y) => z.fn(r, x, y), { pad: 0.9, skip: 9 * i }); });
  };

  def('cafe', 'Café', 'Café', 'studio', 'Coffee, quiet tables and a counter. Say hi to whoever sits next to you.', (W, D, o) => {
    const r = R(W, D, 'studio', true, o), { x0, z0, x1, z1 } = r, { X, Z, XE, ZS } = edges(r), pitch = W > 30 ? 21 : 24;
    // the bar along the back wall: a kitchen line behind, the counter with stools in front, the pastry case at its end
    r.line('n', ['kitchen', 'fridge', 'kitchen'], { from: 0.3, gap: 0.1, to: X(11) });
    r.put('barCounter', X(2.4), Z(2.5)); r.put('barCounter', X(5.6), Z(2.5)); r.put('pastryCase', X(8.0), Z(2.5));
    for (const u of [1.5, 2.4, 3.3, 4.7, 5.6, 6.5]) r.put('stool', X(u), Z(3.5));
    // window side: booths with a round table, alternating with a pair of chairs
    let k = 0; for (const w of r.wins) if (w.wall === 'x' && w.u >= Z(5.6)) {
      if (k++ % 2 === 0) { r.put('banquette', X(0.45), w.u, 90); r.put('roundTable', X(1.95), w.u); r.put('chair', X(3.1), w.u - 0.45, 270); r.put('chair', X(3.1), w.u + 0.45, 270); }
      else { r.put('roundTable', X(1.6), w.u); r.put('chair', X(1.6), w.u - 0.92, 0); r.put('chair', X(1.6), w.u + 0.92, 180); }
    }
    // the lounge nook under the back wall, then a reading nook with books further along
    const nooks = [13.0, 20.5, 28.0].filter(u => u < W - 6.4);
    nooks.forEach((u, i) => {
      if (i % 2 === 0) { r.put('rug', X(u), Z(2.6)); r.put('sofa', X(u), Z(0.55)); r.put('coffeeTable', X(u), Z(2.4)); r.put('armchair', X(u) - 2.0, Z(2.3), 90); r.put('armchair', X(u) + 2.0, Z(2.3), 270); r.first('floorLamp', [[X(u) + 3.0, Z(0.6)], [X(u) - 3.0, Z(0.6)], [X(u) + 2.7, Z(3.3)]]); }
      else { r.line('n', cyc('bookshelf', 3), { from: u - 2.0, gap: 0.12, to: X(u + 3.2) }); r.put('rug', X(u), Z(3.1)); r.put('armchair', X(u) - 0.6, Z(3.1), 0); r.put('lampTable', X(u) + 0.7, Z(3.0)); r.put('plant', X(u) + 1.7, Z(2.4)); }
    });
    r.lampsAlong('n', X(0), X(W - 6), 4); r.lampsAlong('w', Z(0), Z(D), 3);
    addZones(r, ['lounge', 'garden', 'read', 'bar', 'pit']);
    // the middle: tables of different shapes, spread, with plants between them
    const kinds = [0, 2, 1, 3, 1, 0, 2, 4], want = Math.round(W * D / 52);
    r.scatter(X(6.0), XE(2.2), Z(6.6), ZS(1.6), want, 1.45, 1.5, (x, z, i) => { const kd = kinds[i % kinds.length]; tableSet(r, x, z, kd); if (i % 3 === 0) r.put('plant', x + 1.5, z - 1.0); }, { pad: 0.9 });
    greens(r, x0 + 0.6, z1 - 0.7, 1, -1); greens(r, x1 - 0.7, z1 - 0.7, -1, -1); r.edgeE('tallPlant', 7.5); r.edgeS('plant', 6.5);
    r.hang('n', [{ p: 'wallTextSoft', txt: 'good coffee', c: '#3f3850' }, 'neonOpen', ...cyc('wallArt', 5)], { from: 0.8, step: 1.6 }); r.hang('w', cyc('wallArt', 6), { from: 0.8, step: 1.5 });
    return r.doc('Café', { wall: { c: '#f0d8c0', pat: 'wainscot' }, floor: { c: '#b8855a', pat: 'boards' } });
  });

  // --- shared zones for the rest of the rooms
  // a booth against the west or north wall: bench, round table, two poufs or chairs
  const westBooth = (r, u, o = {}) => { const { x0 } = r; if (!r.put(o.bench || 'banquette', x0 + 0.45, u, 90)) return false; r.put(o.table || 'roundTable', x0 + 1.95, u); r.put(o.seat || 'ottoman', x0 + 3.0, u - 0.55, 270); r.put(o.seat || 'ottoman', x0 + 3.0, u + 0.55, 270); return true; };
  const northBooth = (r, u, o = {}) => { const { z0 } = r; if (!r.put(o.bench || 'banquette', u, z0 + 0.45, 0)) return false; r.put(o.table || 'roundTable', u, z0 + 1.95); r.put(o.seat || 'ottoman', u - 0.55, z0 + 3.0, 0); r.put(o.seat || 'ottoman', u + 0.55, z0 + 3.0, 0); return true; };
  // a pit of bean bags round a low table
  const beanRing = (r, x, z, o = {}) => { r.put('rug', x, z); r.add(o.table || 'sideTable', x, z); const dx = o.dx || 1.0; r.add('beanbag', x - dx, z + 0.25); r.add('beanbag', x + dx, z + 0.25); r.add('beanbag', x - 0.2, z - 1.0); if (o.fourth !== false) r.add('beanbag', x + 0.9, z - 1.0); };

  def('club', 'Neon club', 'Club', 'cyberpunk', 'The neon room. Lights are the whole point here: place a few and watch the mood change.', (W, D, o) => {
    const r = R(W, D, 'cyberpunk', false, o), { x0, z0, x1, z1 } = r, { X, Z, XE, ZS } = edges(r), sx = X(Math.round(W * 0.38));
    // the DJ stage on the back wall: deck, speakers, a big screen, a dance floor with a disco ball in front of it
    r.n('djDeck', sx); r.mount('n', 'ledPanel', sx); for (const d of [-2.1, 2.1, -2.65, 2.65]) r.n('speaker', sx + d);
    r.put('holoScreen', sx - 4.7, z0 + 0.25); if (W > 24) r.put('holoScreen', sx + 4.7, z0 + 0.25);
    const floors = W > 31 ? [-4, 0, 4] : W > 25 ? [0, 4] : [0]; for (const d of floors) r.put('danceFloor', sx + d, Z(3.5));
    r.put('discoBall', sx + (W > 25 ? 2 : 0), Z(3.5));
    // the bar down the west wall, vending machines at its end
    for (const u of [8.6, 11.8, 15.0]) if (Z(u) + 1.5 <= z1 - 2.2) { r.put('barCounter', X(0.45), Z(u), 90); for (const d of [-0.9, 0, 0.9]) r.put('stool', X(1.5), Z(u + d)); }
    r.put('vending', X(0.45), z1 - 0.9, 90); r.put('vending', X(0.45), z1 - 2.0, 90);
    // booths: two on the west wall above the bar, a row on the back wall right of the stage
    for (const u of [2.8, 5.4]) westBooth(r, Z(u));
    for (let u = Math.round(W * 0.38) + 5.6; X(u + 1.2) <= r.northEnd; u += 3.0) northBooth(r, X(u));
    addZones(r, ['pit', 'bar', 'booth', 'beans', 'lounge'], [X(5), XE(2), Z(8), ZS(1.6)]);
    // lounge islands in the open south-east
    const kinds = [0, 1, 2, 1, 0, 2], want = Math.round(W * D / 75);
    r.scatter(X(5.5), XE(2.2), Z(8.4), ZS(1.8), want, 2.1, 1.7, (x, z, i) => {
      const kd = kinds[i % kinds.length]; r.put('rug', x, z - 0.2);
      if (kd === 0) { r.add('coffeeTable', x, z); r.add('gamingChair', x - 1.4, z, 90); r.add('gamingChair', x + 1.4, z, 270); r.add('beanbag', x, z + 1.35); }
      else if (kd === 1) beanRing(r, x, z, { fourth: false });
      else { r.add('sofa', x, z - 1.2, 0); r.add('coffeeTable', x, z + 0.1); r.add('ottoman', x - 1.1, z + 0.35); r.add('ottoman', x + 1.1, z + 0.35); }
      if (i % 2 === 0) r.put('floorLamp', x + 2.2, z - 1.5);
    }, { pad: 0.9 });
    r.lampsAlong('n', sx + 3.4, r.northEnd, 3); r.lampsAlong('w', Z(0.8), z1, 4);
    greens(r, x0 + 0.6, z1 - 3.2, 1, 1); greens(r, x1 - 0.7, z1 - 0.7, -1, -1); r.edgeE('plant', 6.5);
    const neons = ['neonTube', 'neonOpen', 'neonTubeBlue', 'triangleNeon', 'neonTubeBlue', 'neonTube'];
    r.hang('w', neons, { from: 0.8, step: 1.0 }); r.hang('n', neons.slice().reverse(), { from: Math.round(W * 0.38) + 3.2, step: 1.0 });
    return r.doc('Neon club', { view: 'neon', wall: { c: '#2a2058', pat: 'panels' }, floor: { c: '#1c1840', pat: 'grid' } });
  });

  def('arcade', 'Arcade', 'Arcade', 'retro80s', 'Cabinets in rows, a boombox and a high-score wall. Come break a record.', (W, D, o) => {
    const r = R(W, D, 'retro80s', false, o), { x0, z0, x1, z1 } = r, { X, Z, XE, ZS } = edges(r);
    // the back wall: a bank of cabinets, the prize counter under the high-score screen, a few more cabinets
    r.line('n', cyc('arcadeCab', 5), { from: 0.3, gap: 0.05 }); r.n('barCounter', X(8.7)); r.mount('n', 'ledPanel', X(8.7)); r.put('stool', X(7.9), Z(1.55)); r.put('stool', X(9.5), Z(1.55));
    r.line('n', cyc('arcadeCab', 5), { from: 10.5, gap: 0.05 });
    r.line('w', cyc('arcadeCab', 5), { from: 1.3, gap: 0.05, to: Z(7.0) });
    for (let u = 8.4; Z(u) + 1.2 <= z1 - 1.2 && u < 14; u += 3.0) westBooth(r, Z(u));
    // islands of back to back cabinets, three to five a side
    const nIsl = Math.max(3, Math.min(5, Math.floor((W - 10) / 2.3))), islands = [[0.46, 7.4], [0.5, 12.8], [0.62, 7.4]];
    islands.slice(0, W > 31 ? 3 : D > 17 ? 2 : 1).forEach(([f, zz]) => {
      const cx = X(W * f + 2.2), zc = Z(zz); if (!r.rectFree(cx, zc, nIsl * 0.55 + 0.3, 1.0, 0.1)) return;
      for (let i = 0; i < nIsl; i++) { const x = cx + (i - (nIsl - 1) / 2) * 1.05; r.add('arcadeCab', x, zc - 0.45, 0); r.add('arcadeCab', x, zc + 0.45, 180); }
      r.put('discoBall', cx + nIsl * 0.55 + 1.2, zc);
    });
    addZones(r, ['cabs', 'bar', 'tv', 'cabs', 'beans'], [X(4), XE(2.2), Z(8.5), ZS(1.6)]);
    // a lounge of bean bags and a TV for people waiting their turn, palms on the open edges
    const kinds = [1, 0, 1]; r.scatter(X(4.5), XE(2.2), Z(9.4), ZS(1.8), Math.round(W * D / 110), 2.0, 1.7, (x, z, i) => {
      if (kinds[i % kinds.length] === 1) beanRing(r, x, z, { table: 'coffeeTable', dx: 1.3 }); else { r.put('rug', x, z); r.add('retroTv', x, z - 1.2, 0); r.add('beanbag', x - 0.9, z + 0.3); r.add('beanbag', x + 0.9, z + 0.3); r.add('ottoman', x, z + 1.1); }
      r.put('floorLamp', x + 2.3, z - 1.4);
    }, { pad: 0.9 });
    r.put('lowShelf', XE(2.6), Z(8.5), 270); r.put('boombox', XE(0.5), Z(12.0), 270);
    r.lampsAlong('n', X(0), r.northEnd, 3); r.lampsAlong('w', Z(0.5), z1, 3);
    r.edgeS('palm', 7); r.edgeE('palm', 7.5);
    r.hang('n', ['triangleNeon', 'sunPoster', 'triangleNeon'], { from: 0.8, step: 1.4 }); r.hang('w', ['sunPoster', 'triangleNeon', 'sunPoster', 'triangleNeon'], { from: 0.8, step: 1.4 });
    return r.doc('Arcade', { view: 'night' });
  });

  def('gallery', 'Gallery', 'Gallery', 'studio', 'A white room with a few pictures and a lot of quiet. A good place to look at things.', (W, D, o) => {
    const r = R(W, D, 'studio', false, o), { x0, z0, x1, z1 } = r, { X, Z, XE, ZS } = edges(r);
    // art on the two back walls, spaced, a picture lamp after every second piece
    const row = [{ p: 'wallText', txt: 'GALLERY', c: '#7a3ac8' }, ...Array.from({ length: 18 }, (_, i) => i % 3 === 1 ? 'wallLamp' : 'wallArt')];
    r.hang('n', row, { from: 0.9, step: 1.2 }); r.hang('w', [{ p: 'wallTextSoft', txt: 'welcome', c: '#3f3850' }, ...row.slice(1)], { from: 0.9, step: 1.2 });
    // the floor: a seating island on a rug, plinths and sculptures spread out
    addZones(r, ['install', 'lounge', 'garden', 'bar', 'read'], [X(3.4), XE(2.0), Z(4.6), ZS(1.6)]);
    const n = Math.round(W * D / 68), exh = ['plinth', 'sculpture', 'plinth', 'plinth', 'sculpture'];
    r.scatter(X(4.0), XE(2.5), Z(5.0), ZS(2.0), 1, 3.1, 1.7, (x, z) => { r.put('rug', x, z); r.add('sofa', x, z - 0.6, 0); r.add('sofa', x, z + 0.6, 180); r.add('ottoman', x - 2.0, z); r.add('ottoman', x + 2.0, z); r.put('floorLamp', x + 2.9, z - 1.5); }, { pad: 1.2 });
    r.scatter(X(3.4), XE(2.0), Z(4.2), ZS(1.6), n, 0.95, 0.95, (x, z, i) => { r.add(exh[i % exh.length], x, z); if (i % 3 === 0) r.put('floorLamp', x + 1.3, z + 0.9); }, { pad: 1.3 });
    for (const u of [4.5, 10.5, 16.5, 22.5]) if (u + 1 < W - 6) r.put('bench', X(u), Z(2.7), 180);
    for (const u of [5.5, 12.0, 18.5]) if (u + 2 < D) r.put('bench', X(2.7), Z(u), 270);
    greens(r, x0 + 0.6, z1 - 0.7, 1, -1); r.put('plant', x1 - 0.5, z1 - 0.5); r.put('tallPlant', x1 - 0.7, z0 + (D > 18 ? 6 : 5.5));
    r.lampsAlong('n', X(0), r.northEnd, 3); r.lampsAlong('w', Z(0), z1, 3);
    return r.doc('Gallery', { wall: { c: '#f4efe6', pat: 'subway' }, floor: { c: '#c9b8a0', pat: 'herringbone' } });
  });

  def('orbit', 'Orbit lounge', 'Lounge', 'space', 'A quiet station with a view of nothing but stars. Sit down, take your helmet off.', (W, D, o) => {
    const r = R(W, D, 'space', true, o), { x0, z0, x1, z1 } = r, { X, Z, XE, ZS } = edges(r);
    // the flight deck along the back wall
    const run = r.line('n', ['consoleDesk', 'holoGlobe', 'consoleDesk', 'crystal', 'consoleDesk'], { from: 0.5, gap: 0.5, to: X(14) });
    for (const it of run) if (it.p === 'consoleDesk') r.put('spaceChair', it.x, z0 + 1.5, 180);
    // sleep capsules down the west wall, separated by a plant
    r.line('w', ['capsuleBed', 'capsuleBed', 'tallPlant', 'capsuleBed', 'capsuleBed'], { from: 6.0, gap: 0.4, to: z1 - 0.5 });
    // the conversation pit round a hologram, a nutrient bar, a hydroponic garden in the corner
    r.scatter(X(8), XE(3), Z(4.6), ZS(3.0), Math.round(W / 14), 3.3, 2.7, (x, z) => { r.put('rug', x, z); r.add('holoGlobe', x, z); r.add('sofa', x, z - 1.7, 0); r.add('sofa', x, z + 1.7, 180); r.add('beanbag', x - 2.6, z); r.add('beanbag', x + 2.6, z); }, { pad: 0.8 });
    addZones(r, ['consoles', 'garden', 'obs', 'bar', 'pit'], [X(4.5), XE(2.2), Z(5.0), ZS(1.6)]);
    r.scatter(X(4.5), XE(2.5), Z(6.8), ZS(1.8), 1, 2.3, 1.5, (x, z, i) => { r.add('barCounter', x, z); for (const d of [-0.9, 0, 0.9]) r.add('stool', x + d, z + 0.95); if (i === 0) r.put('tallPlant', x + 2.3, z); }, { pad: 0.9, skip: 7 });
    for (const [x, z] of [[XE(0.8), ZS(0.8)], [XE(1.8), ZS(0.8)], [XE(0.8), ZS(2.4)], [XE(0.8), ZS(4.0)]]) r.put('oxygenTube', x, z);
    r.put('planter', XE(3.4), ZS(0.6), 180); r.put('planter', XE(0.6), ZS(6.0), 270);
    r.first('floorLamp', [[X(8.6), Z(1.0)], [X(10.0), Z(1.0)], [X(12.8), Z(1.0)]]);
    r.lampsAlong('n', X(0), r.northEnd, 4); r.lampsAlong('w', Z(0), z1, 4);
    r.edgeS('tallPlant', 7); r.edgeE('planter', 9);
    return r.doc('Orbit lounge', { view: 'night' });
  });

  def('haunted', 'Haunted hollow', 'Spooky', 'halloween', 'A cauldron, a few ghosts and candles that flicker on their own. Not scary, mostly.', (W, D, o) => {
    const r = R(W, D, 'halloween', true, o), { x0, z0, x1, z1 } = r, { X, Z, XE, ZS } = edges(r), cx = (x0 + x1) / 2 + 0.6, cz = (z0 + z1) / 2 + 0.2;
    // the witch's study under the back wall: shelves, an armchair by the candles, a sideboard of potions
    r.line('n', cyc('bookshelf', 3), { from: 0.4, gap: 0.12, to: X(9.5) });
    r.put('rug', X(3.2), Z(3.0)); r.put('armchair', X(3.2), Z(2.6), 0); r.put('lowShelf', X(6.6), Z(0.5)); r.lamp('candles', X(4.6), Z(2.9));
    // coffins down the west wall, candles between them
    r.line('w', ['coffinBed', 'candles', 'coffinBed'], { from: 5.4, gap: 0.5, to: Z(D > 17 ? 12.5 : 11.5) });
    // the cauldron circle in the middle
    r.lamp('cauldron', cx, cz); for (const [dx, dz] of [[-1.7, -1.3], [1.8, -1.2], [-1.5, 1.4], [1.9, 1.5]]) r.lamp('candles', cx + dx, cz + dz);
    r.put('ghost', cx - 3.0, cz - 0.6); r.put('ghost', cx + 3.3, cz + 0.2);
    // a seance table with candles
    r.scatter(X(5.5), XE(2.5), Z(5.0), ZS(2.0), W > 25 ? 2 : 1, 1.6, 1.6, (x, z, i) => { r.add('roundTable', x, z); r.add('chair', x - 0.1, z - 0.92, 0); r.add('chair', x - 0.95, z + 0.5, 90); r.add('chair', x + 0.95, z + 0.5, 270); r.lamp('candles', x + 1.9, z - 1.0); }, { pad: 0.9, skip: 3 });
    addZones(r, ['graves', 'ritual', 'patch', 'graves', 'tables'], [X(4), XE(2.2), Z(5.0), ZS(1.6)]);
    for (let u = 3.4; u < 10.5; u += 1.3) r.put('gravestone', XE(u), ZS(1.3 + (Math.round(u * 10) % 2) * 0.35), 180);        // one short row of stones along the south edge
    // the pumpkin patch
    r.lamp('bigPumpkin', XE(1.0), ZS(1.0)); r.lamp('pumpkin', XE(2.3), ZS(1.9)); r.lamp('pumpkin', XE(1.0), ZS(2.6)); r.lamp('bigPumpkin', X(1.2), ZS(1.2)); r.lamp('pumpkin', X(2.5), ZS(1.0)); r.put('witchHat', X(1.2), ZS(3.2));
    if (W > 24) { r.put('ghost', cx - 8, cz + 1.4); r.put('ghost', cx + 8.5, cz - 2.4); r.lamp('bigPumpkin', cx - 7, cz - 3.4); r.put('witchHat', cx + 6.5, cz + 3.2); r.lamp('candles', cx + 9, cz + 2.6); r.lamp('candles', cx - 6.5, cz + 3.4); }
    if (D > 18) { r.lamp('cauldron', cx + 7.5, cz + 4.2); r.lamp('candles', cx + 9.0, cz + 4.0); r.put('ghost', cx - 4.0, cz + 4.4); }
    r.first('floorLamp', [[X(7.9), Z(3.4)], [X(2.2), Z(5.6)], [X(10), Z(1.0)]]); r.lampsAlong('n', X(0), r.northEnd, 3); r.lampsAlong('w', Z(0), z1, 3);
    r.hang('n', ['cobweb', 'bat', 'bat', 'cobweb', 'bat'], { from: 0.7, step: 3 }); r.hang('w', ['cobweb', 'bat', 'bat', 'cobweb', 'bat'], { from: 0.7, step: 3 });
    return r.doc('Haunted hollow', { view: 'night' });
  });

  def('library', 'Reading nook', 'Lounge', 'studio', 'Shelves to the ceiling, soft lamps, nobody talking. Chat is allowed anyway.', (W, D, o) => {
    const r = R(W, D, 'studio', false, o), { x0, z0, x1, z1 } = r, { X, Z, XE, ZS } = edges(r);
    // shelves in bays of three, an alcove with an armchair and a lamp between the bays
    for (let u = 0.2; X(u + 3.9) <= r.northEnd; u += 5.8) { r.line('n', cyc('bookshelf', 3), { from: u, gap: 0.12, to: X(u + 4.2) }); r.put('armchair', X(u + 5.0), Z(0.5), 0); r.mount('n', 'wallLamp', X(u + 5.0)); }
    for (let u = 0.7; Z(u + 3.9) <= z1 - 1.0; u += 5.8) { r.line('w', cyc('bookshelf', 3), { from: u, gap: 0.12, to: Z(u + 4.2) }); r.put('armchair', X(0.5), Z(u + 5.0), 90); r.mount('w', 'wallLamp', Z(u + 5.0)); }
    addZones(r, ['read', 'study', 'lounge', 'read', 'pit']);
    // reading nooks on rugs: two armchairs, a lamp table, a sofa with a coffee table
    const kinds = [0, 1, 2, 0, 1, 2];
    r.scatter(X(4.5), XE(2.5), Z(4.6), ZS(1.8), Math.round(W * D / 64), 2.6, 1.8, (x, z, i) => {
      const kd = kinds[i % kinds.length];
      if (kd === 0) { r.put('rug', x, z); r.add('armchair', x - 1.0, z, 90); r.add('armchair', x + 1.0, z, 270); r.add('lampTable', x, z - 0.9); r.add('sideTable', x, z + 0.55); }
      else if (kd === 1) lounge(r, x, z + 0.8, { lamp: false });
      else { tableSet(r, x - 1.0, z, 2, { chair: 'chair' }); r.add('lampTable', x + 1.3, z - 0.6); r.put('lowShelf', x + 1.3, z + 0.9); }
    }, { pad: 0.7 });
    r.first('floorLamp', [[XE(0.8), z0 + 5.0], [XE(0.8), ZS(4)], [X(1.2), ZS(1.2)]]); r.first('floorLamp', [[XE(0.8), ZS(1.2)], [XE(0.8), ZS(7.5)]]);
    greens(r, x0 + 0.7, z1 - 0.8, 1, -1); r.put('plant', x1 - 0.5, z1 - 0.5); r.edgeS('tallPlant', 8.5); r.edgeE('plant', 9);
    r.hang('w', cyc('wallArt', 3), { from: 0.8, step: 1.2 }); r.hang('n', cyc('wallArt', 2), { from: 0.8, step: 1.2 });
    return r.doc('Reading nook', { wall: { c: '#d8c0a0', pat: 'wainscot' }, floor: { c: '#8a5a3a', pat: 'boards' } });
  });

  def('studio', 'Workshop', 'Workshop', 'studio', 'Desks, a kitchenette and a sofa corner. Where people make things together.', (W, D, o) => {
    const r = R(W, D, 'studio', true, o), { x0, z0, x1, z1 } = r, { X, Z, XE, ZS } = edges(r);
    // desks along the back wall, each with a chair, a plant between pairs
    const run = r.line('n', ['desk', 'plant', 'desk', 'lowShelf', 'desk'], { from: 0.4, gap: 0.5, to: X(15) }); for (const it of run) if (it.p === 'desk') r.put('chair', it.x, z0 + 1.35, 180);
    // the kitchenette on the west wall
    r.line('w', ['kitchen', 'fridge', 'kitchen', 'lowShelf'], { from: 3.2, gap: 0.2, to: z1 - 4.0 });
    r.first('roundTable', [[X(3.4), Z(7.2)], [X(3.4), Z(9.6)]]); r.put('stool', X(3.4), Z(8.2)); r.put('stool', X(4.5), Z(7.0)); r.put('stool', X(2.4), Z(7.0));
    addZones(r, ['workbench', 'study', 'lounge', 'bar', 'tables'], [X(6), XE(2.2), Z(5.2), ZS(1.8)]);
    // work zones in the middle, each different: a pair of desks, a maker table, a standing bar with stools
    const wk = [0, 1, 2, 0, 1, 2]; r.scatter(X(6.0), XE(2.5), Z(5.0), ZS(5.5), Math.round(W * D / 75), 2.3, 1.5, (x, z, i) => {
      const kd = wk[i % wk.length];
      if (kd === 0) { r.add('desk', x - 1.0, z, 0); r.add('desk', x + 1.0, z, 0); r.add('chair', x - 1.0, z + 0.9, 180); r.add('chair', x + 1.0, z + 0.9, 180); r.put('plant', x + 2.1, z - 0.3); }
      else if (kd === 1) { tableSet(r, x, z, 2); r.put('lampTable', x + 1.9, z - 0.5); r.put('lowShelf', x - 2.0, z + 0.2, 90); }
      else { r.add('barCounter', x, z); for (const d of [-0.9, 0, 0.9]) r.add('stool', x + d, z + 0.95); r.put('tallPlant', x + 2.2, z); }
      if (i % 2 === 0) r.put('floorLamp', x - 2.2, z - 0.4);
    }, { pad: 1.0 });
    // the meeting table and the sofa corner
    r.scatter(X(6.0), XE(2.5), ZS(6.0), ZS(1.8), 1, 2.1, 1.6, (x, z) => { r.add('diningTable', x - 0.9, z); r.add('diningTable', x + 0.9, z); for (const d of [-1.4, 0, 1.4]) { r.add('chair', x + d - 0.0, z - 0.8, 0); r.add('chair', x + d, z + 0.8, 180); } }, { pad: 0.9 });
    r.scatter(X(1.5), X(11), ZS(6.4), ZS(1.6), 1, LOUNGE_PROBE[0], LOUNGE_PROBE[1], (x, z) => lounge(r, x, z + 0.6, { plant: 'plant' }), { pad: 0.6 });
    if (D >= 18) r.scatter(XE(9), XE(3), ZS(7.6), ZS(2.0), 1, LOUNGE_PROBE[0], LOUNGE_PROBE[1], (x, z) => lounge(r, x, z + 0.6, { plant: 'tallPlant' }), { pad: 0.6 });
    r.lampsAlong('n', X(0), r.northEnd, 3); r.lampsAlong('w', Z(0), z1, 3);
    greens(r, x0 + 0.6, z1 - 0.7, 1, -1); r.put('tallPlant', x1 - 0.7, z1 - 0.7); r.edgeE('tallPlant', 7.5);
    r.hang('n', cyc('wallArt', 6), { from: 0.8, step: 1.6 });
    return r.doc('Workshop', { wall: { c: '#e6e0f0', pat: 'plaster' }, floor: { c: '#a89888', pat: 'tiles' } });
  });

  def('terrace', 'Sunset terrace', 'Lounge', 'studio', 'It is always golden hour here. Bean bags, plants and a speaker for the evening.', (W, D, o) => {
    const r = R(W, D, 'studio', true, o), { x0, z0, x1, z1 } = r, { X, Z, XE, ZS } = edges(r);
    // a drinks bar and the sound system on the back wall, a sofa corner next to them
    r.n('barCounter', X(2.6)); for (const u of [1.7, 2.6, 3.5]) r.put('stool', X(u), Z(1.6)); r.n('speaker', X(5.0)); r.n('speaker', X(5.6));
    r.put('rug', X(10.6), Z(2.4)); r.put('sofa', X(10.6), Z(0.55)); r.put('sideTable', X(10.6), Z(2.3)); r.put('armchair', X(8.6), Z(2.2), 90); r.put('armchair', X(12.6), Z(2.2), 270);
    // window benches on the west wall
    let k = 0; for (const w of r.wins) if (w.wall === 'x' && w.u >= Z(4.4) && k++ < 3) { r.put('banquette', X(0.45), w.u, 90); r.put('sideTable', X(1.6), w.u); r.put('sideTable', X(1.6), w.u + 1.0); }
    addZones(r, ['beans', 'pouf', 'lounge', 'garden', 'bar']);
    // bean bag pits and little round table sets spread over the floor
    const kinds = [1, 2, 1, 0, 2]; r.scatter(X(5.5), XE(2.2), Z(5.5), ZS(1.7), Math.round(W * D / 56), 2.1, 1.6, (x, z, i) => {
      const kd = kinds[i % kinds.length];
      if (kd === 0) beanRing(r, x, z); else if (kd === 1) { r.put('rug', x, z); r.add('coffeeTable', x, z); r.add('ottoman', x - 1.3, z); r.add('ottoman', x + 1.3, z); r.add('ottoman', x, z + 0.95); } else tableSet(r, x, z, 1);
      if (i % 2 === 1) r.put('floorLamp', x + 2.2, z - 1.4);
    }, { pad: 0.8 });
    r.first('floorLamp', [[X(7.2), Z(0.8)], [X(13.8), Z(0.8)]]); r.lampsAlong('n', X(0), r.northEnd, 4); r.lampsAlong('w', Z(0), z1, 3);
    for (let u = 3.5; u < W - 6; u += 6.5) r.put('planter', X(u), ZS(0.5), 180); r.edgeE('planter', 7.5);
    greens(r, x0 + 0.6, z1 - 0.8, 1, -1, 'tallPlant', 'plant'); greens(r, x1 - 0.7, z1 - 0.8, -1, -1);
    r.hang('w', cyc('wallArt', 4), { from: 0.8, step: 1.8 }); r.hang('n', cyc('wallArt', 4), { from: 0.8, step: 1.8 });
    return r.doc('Sunset terrace', { view: 'evening', wall: { c: '#f4c8a0', pat: 'plaster' }, floor: { c: '#c8a070', pat: 'wood' } });
  });

  def('garage', 'Synthwave garage', 'Arcade', 'retro80s', 'Old screens, a boombox and a grid floor. Always 1986 in here.', (W, D, o) => {
    const r = R(W, D, 'retro80s', false, o), { x0, z0, x1, z1 } = r, { X, Z, XE, ZS } = edges(r);
    // the TV wall: screens on both sides of a shelf with the boombox, cabinets at the end
    r.line('n', ['retroTv', 'retroTv', 'retroTv', 'lowShelf', 'retroTv', 'retroTv'], { from: 0.5, gap: 0.2, to: X(11) }); r.put('boombox', X(8.2), Z(0.9), 0, undefined);
    r.line('n', ['arcadeCab', 'arcadeCab', 'arcadeCab'], { from: 11.3, gap: 0.05 });
    // cabinets and a workbench down the west wall
    r.line('w', ['arcadeCab', 'arcadeCab', 'boombox', 'arcadeCab', 'arcadeCab'], { from: 1.4, gap: 0.3, to: Z(9.6) });
    r.put('desk', X(0.45), Z(11.4), 90); r.put('chair', X(1.6), Z(11.4), 270); if (D > 17) { r.put('desk', X(0.45), Z(14.0), 90); r.put('chair', X(1.6), Z(14.0), 270); }
    addZones(r, ['tv', 'cabs', 'workbench', 'dance', 'beans'], [X(5), XE(2.2), Z(5.0), ZS(1.6)]);
    // the couch pit in front of the screens, a neon dance mat, a ring of bean bags
    r.scatter(X(5.5), XE(3.0), Z(5.0), ZS(2.5), Math.round(W * D / 100), 2.1, 1.7, (x, z, i) => {
      if (i % 2 === 0) { r.put('rug', x, z); r.add('coffeeTable', x, z); r.add('sofa', x, z + 1.35, 180); r.add('beanbag', x - 1.8, z); r.add('beanbag', x + 1.8, z); }
      else beanRing(r, x, z, { table: 'coffeeTable', dx: 1.3 });
      r.put('floorLamp', x + 2.5, z - 1.4);
    }, { pad: 0.9 });
    r.put('danceFloor', X(W * 0.5 + 1), Z(6.6)); r.put('discoBall', X(W * 0.5 + 1), Z(6.6));
    r.lampsAlong('n', X(0), r.northEnd, 3); r.lampsAlong('w', Z(0.8), z1, 3);
    r.edgeS('palm', 7); r.edgeE('palm', 8);
    r.hang('n', ['triangleNeon', 'sunPoster', 'triangleNeon'], { from: 0.8, step: 1.8 }); r.hang('w', ['sunPoster', 'triangleNeon', 'sunPoster'], { from: 0.8, step: 1.8 });
    return r.doc('Synthwave garage', { view: 'neon' });
  });

  def('canteen', 'Ghost kitchen', 'Café', 'cyberpunk', 'A cyberpunk canteen: vending machines, noodles in the air, holograms over the tables.', (W, D, o) => {
    const r = R(W, D, 'cyberpunk', false, o), { x0, z0, x1, z1 } = r, { X, Z, XE, ZS } = edges(r);
    // the kitchen and the vending machines on the back wall, menu screens either side
    r.line('n', ['kitchen', 'fridge', 'kitchen', 'vending', 'vending', 'kitchen'], { from: 0.3, gap: 0.15 });
    // a noodle bar island in the middle: two counters end to end with stools on the front
    const bx = X(Math.round(W * 0.34)), bz = Z(Math.min(7.6, D * 0.45));
    r.put('barCounter', bx - 1.55, bz); r.put('barCounter', bx + 1.55, bz); for (const d of [-2.4, -1.5, -0.6, 0.6, 1.5, 2.4]) r.put('stool', bx + d, bz + 0.95); r.put('holoScreen', bx - 3.4, bz - 0.2); r.put('holoScreen', bx + 3.4, bz - 0.2);
    // booths down the west wall
    for (let u = 3.0; Z(u) + 1.3 <= z1 - 1.0 && u < 15; u += 3.2) westBooth(r, Z(u), { seat: 'gamingChair' });
    addZones(r, ['noodle', 'vend', 'tables', 'booth', 'tables2'], [X(6), XE(2.2), Z(5.2), ZS(1.8)]);
    // small tables of different shapes
    const kinds = [0, 2, 1, 3]; r.scatter(X(6.2), XE(2.2), Z(5.2), ZS(1.8), Math.round(W * D / 70), 1.5, 1.5, (x, z, i) => { tableSet(r, x, z, kinds[i % kinds.length], { chair: 'gamingChair' }); if (i % 3 === 1) r.put('holoScreen', x + 1.9, z - 0.2); else r.put('floorLamp', x + 1.9, z - 0.8); }, { pad: 0.9, skip: 2 });
    r.first('floorLamp', [[XE(0.8), Z(5.5)], [XE(0.8), ZS(4.5)], [X(5.5), ZS(1.0)]]);
    r.lampsAlong('n', X(0), r.northEnd, 3); r.lampsAlong('w', Z(0.8), z1, 3);
    greens(r, x1 - 0.7, z1 - 0.7, -1, -1); r.put('beanbag', x0 + 1.0, z1 - 1.0); r.put('beanbag', x0 + 2.3, z1 - 0.9); r.edgeS('plant', 8); r.edgeE('beanbag', 7);
    r.hang('w', ['neonOpen', 'neonTube', 'neonTubeBlue', 'neonTube'], { from: 0.8, step: 1.4 }); r.hang('n', ['neonTubeBlue', 'neonTube', 'neonOpen'], { from: 0.8, step: 1.4 });
    return r.doc('Ghost kitchen', { view: 'night', wall: { c: '#3a2a70', pat: 'brick' } });
  });

  def('sleepover', 'Sleepover suite', 'Lounge', 'studio', 'Beds, bean bags and a TV. Bring snacks.', (W, D, o) => {
    const r = R(W, D, 'studio', true, o), { x0, z0, x1, z1 } = r, { X, Z, XE, ZS } = edges(r);
    // beds down the west wall with lamp tables between them
    r.line('w', ['bed', 'lampTable', 'bed', 'lampTable', 'bed', 'lampTable', 'bed'], { from: 1.2, gap: 0.2, to: z1 - 0.4 });
    // the TV corner and the snack kitchen on the back wall
    r.put('lowShelf', X(6.6), Z(0.5)); r.n('tvUnit', X(8.8)); r.put('lowShelf', X(11.0), Z(0.5)); r.first('lampTable', [[X(5.2), Z(0.5)], [X(12.5), Z(0.5)]]);
    r.put('rug', X(8.8), Z(3.5)); r.put('sofa', X(8.8), Z(5.6), 180); r.put('beanbag', X(6.5), Z(4.2)); r.put('beanbag', X(11.1), Z(4.2)); r.put('ottoman', X(8.8), Z(3.0));
    if (W > 24) { r.line('n', ['kitchen', 'fridge', 'kitchen'], { from: 14.2, gap: 0.1, to: r.northEnd }); tableSet(r, X(17.5), Z(3.6), 1); }
    addZones(r, ['beds', 'beans', 'tv', 'pouf', 'tables2'], [X(5), XE(2.2), Z(6.5), ZS(1.6)]);
    // pillow forts and snack tables
    const kinds = [1, 2, 0, 1, 2]; r.scatter(X(4.8), XE(2.2), Z(7.2), ZS(1.7), Math.round(W * D / 80), 2.1, 1.6, (x, z, i) => {
      const kd = kinds[i % kinds.length];
      if (kd === 0) beanRing(r, x, z); else if (kd === 1) { r.put('rug', x, z); r.add('coffeeTable', x, z); r.add('ottoman', x - 1.2, z + 0.3); r.add('ottoman', x + 1.2, z + 0.3); r.add('beanbag', x, z - 1.0); } else tableSet(r, x, z, 1, {});
      if (i % 2 === 0) r.put('floorLamp', x + 2.2, z - 1.4);
    }, { pad: 0.8 });
    r.first('floorLamp', [[X(14.0), Z(0.7)], [X(3.6), Z(1.0)]]); r.lampsAlong('n', X(0), r.northEnd, 3); r.lampsAlong('w', Z(0), z1, 3);
    greens(r, x1 - 0.7, z1 - 0.7, -1, -1); r.put('plant', x0 + 0.8, z1 - 0.7); for (let u = x0 + 4.5; u < x1 - 1.6; u += 6) r.put('plant', u, z1 - 0.5, 180); r.edgeE('tallPlant', 8);
    r.hang('n', cyc('wallArt', 4), { from: 0.8, step: 1.8 });
    return r.doc('Sleepover suite', { wall: { c: '#e8d0e8', pat: 'dots' }, floor: { c: '#d8c8b0', pat: 'carpet' } });
  });
  SPACE.READY_ORDER = Object.keys(READY);
})();
