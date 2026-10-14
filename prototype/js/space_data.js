// ===== space data: themes and the piece catalog (all data, no behaviour). Format documented in space.js =====
// Stock themes: studio is the house style (modern, warm). The other four exist to prove the range creators get: cyberpunk, retro80s, space, halloween.
// Creators will author their own themes and pieces in exactly this format.
(function () {
  const B = (s, p, c, o) => Object.assign({ t: 'box', s, p, c }, o), Cy = (s, p, c, o) => Object.assign({ t: 'cyl', s, p, c }, o), Sp = (s, p, c, o) => Object.assign({ t: 'sph', s, p, c }, o);
  const Cn = (s, p, c, o) => Object.assign({ t: 'cone', s, p, c }, o), Tr = (s, p, c, o) => Object.assign({ t: 'tor', s, p, c }, o), Pl = (s, p, c, o) => Object.assign({ t: 'plane', s, p, c }, o);
  const Tx = (txt, s, p, c, o) => Object.assign({ t: 'text', txt, s, p, c }, o), Li = (p, c, i, d) => ({ t: 'light', p, c, i, d });

  // scenery helper: a world position that lands at screen offset (r right, u up) from the room centre, d units behind it (camera looks along -(1,1,1))
  const at = (r, u, d = 40) => { const k = d / Math.sqrt(3); return [r * 0.7071 - u * 0.4082 - k, u * 0.8165 - k, -r * 0.7071 - u * 0.4082 - k]; };
  // windows sit above the furniture line (bottom edge at 1.7, rooms are 5 m tall). A theme holds a window TEMPLATE (size and shape); SPACE.windowsFor(theme, W, D) lays the windows out for the room:
  // one every 4.4 m along each back wall, none over the door (z wall, right end) and none in the first 2.2 m of the wall that would crowd the corner
  const wins = (w, h, shape) => ({ w, h, shape, y: 1.7 + h / 2 });
  SPACE.stairsU = W => W / 2 - 4.8;                                       // where the stairs stand on the north wall of a room with an upper level (3.2 m left of the door)
  SPACE.windowsFor = (th, W, D, stairs) => {
    const t = th.windows; if (!t || !t.w) return Array.isArray(t) ? t : [];
    const out = [], end = (stairs ? SPACE.stairsU(W) - 1.3 : W / 2 - 1.6 - 0.9), gap = 4.4;
    for (let u = -W / 2 + 2.4; u + t.w / 2 + 0.6 < end; u += gap) out.push({ wall: 'z', u: +u.toFixed(2), y: t.y, w: t.w, h: t.h, shape: t.shape });
    for (let u = -D / 2 + 2.4; u + t.w / 2 + 0.6 < D / 2 - 0.4; u += gap) out.push({ wall: 'x', u: +u.toFixed(2), y: t.y, w: t.w, h: t.h, shape: t.shape });
    return out;
  };
  // ---------------------------------------------------------------- themes = asset kits: a palette, a default wall and floor, window shape, scenery. NO render style, NO lighting (light comes only from the pieces placed in a space).
  const T = SPACE.THEMES;
  T.studio = {
    name: 'Modern studio', floorTex: 'wood', wallTex: 'plaster',
    pal: { wall: 0xf0e2d0, floor: 0xc89a6a, trim: 0x3f3850, accent: 0x7a3ac8, accent2: 0xff7aa8, wood: 0xb07a4a, metal: 0xc0bccb, fabric1: 0x6fbdb0, fabric2: 0xf0aebb, glow: 0xffe0a0, plant: 0x5eb868, screen: 0x9ad8ff },
    windows: wins(1.9, 2.3),
  };
  T.cyberpunk = {
    name: 'Cyberpunk', floorTex: 'metal', wallTex: 'brick', slab: 0x2a2250,
    pal: { wall: 0x4a3a7a, floor: 0x2a2458, trim: 0x14102c, accent: 0xff2a98, accent2: 0x2ad8ff, wood: 0x4a3d6a, metal: 0x6a7aa0, fabric1: 0x4a3f98, fabric2: 0x9a2a80, glow: 0xff5ac8, plant: 0x2aa88a, screen: 0x2ad8ff },
    windows: wins(1.3, 2.5),
    outside: [B([1.6, 7, 1.6], at(-8.6, 1.5, 45), 0x2a1a50), B([2.2, 10, 2.2], at(-6.6, 2.6, 52), 0x34205e), B([1.4, 5, 1.4], at(-9.8, 0.8, 40), 0x261848), B([2, 8, 2], at(7.8, 2.0, 50), 0x2a1a50), B([1.6, 11, 1.6], at(9.2, 3.2, 56), 0x34205e), B([0.9, 0.9, 0.9], at(-6.6, 7.5, 52), '$accent', { e: 1, g: 5 }), B([0.9, 0.9, 0.9], at(9.2, 8.6, 56), '$accent2', { e: 1, g: 5 })],
  };
  T.retro80s = {
    name: 'Retro 80s', floorTex: 'grid', wallTex: 'stripes', slab: 0x3a1a6a,
    pal: { wall: 0x7a50c0, floor: 0x3a2880, trim: 0x1c1040, accent: 0xff4ac8, accent2: 0x4ae8ff, wood: 0x9a5aba, metal: 0xb8b0e0, fabric1: 0xff4ac8, fabric2: 0x4ae8ff, glow: 0xffe24a, plant: 0x4ae8a0, screen: 0xff8ad8 },
    windows: wins(2.4, 1.9), outside: [Sp([3.6], at(-6.8, 4.2, 55), 0xffc060, { e: 1, g: 14 })],
  };
  T.space = {
    name: 'Space station', floorTex: 'metal', wallTex: 'panels', slab: 0x303858,
    pal: { wall: 0x4a5684, floor: 0x505a7c, trim: 0x1c2244, accent: 0x5ad8ff, accent2: 0xffb03a, wood: 0x7a84a0, metal: 0xa8b4d0, fabric1: 0x4a6ab0, fabric2: 0x8a5ac0, glow: 0x7affea, plant: 0x4ad89a, screen: 0x5ad8ff },
    windows: wins(1.9, 1.9, 'round'),
    outside: [Sp([3.8], at(-7.0, 3.8, 55), 0x3a8ae8, { m: 0.5 }), Tr([5.6, 0.22], at(-7.0, 3.8, 55), 0xb8c8ff, { r: [75, 0, 20], m: 0.5, k: [1, 1, 0.25] }), Sp([0.9], at(7.6, 4.8, 60), 0xc8c0b8, { m: 0.5 })],
  };
  T.halloween = {
    name: 'Halloween', floorTex: 'boards', wallTex: 'planks', slab: 0x3a2a40,
    pal: { wall: 0x7a5a94, floor: 0x5a3a28, trim: 0x2c1c34, accent: 0xff7a1a, accent2: 0x9a4ad8, wood: 0x7a5232, metal: 0x8a8098, fabric1: 0x8a3ac8, fabric2: 0xff7a1a, glow: 0xffb030, plant: 0x4a8a3a, screen: 0x7aff5a },
    windows: wins(1.5, 2.3), outside: [Sp([1.8], at(7.4, 4.8, 58), 0xfff0b0, { e: 1, g: 9 })],
  };
  // ---------------------------------------------------------------- window views: the background only (sky, fog, sun or moon, stars, window glass, scenery beyond the windows).
  // Default = the real clock (space.js picks the view for the hour); an owner may pin one. A view NEVER lights the room: interiors are lit only by the lights placed in them (docs/game/world.md).
  const V = SPACE.VIEWS;
  V.day = { name: 'Day', sky: ['#7fb0e8', '#b8d8f4', '#f6e6d0', '#ffe3b0'], fog: 0xf0d8c0, sunDisc: 0xffd890, window: 0xdff0ff };
  V.evening = { name: 'Evening', sky: ['#5d4f9c', '#e0807f', '#ffc27c', '#ffe3a8'], fog: 0xf0a888, sunDisc: 0xffd890, window: 0xffcf98 };
  V.night = { name: 'Night', sky: ['#120a30', '#381568', '#a52a74', '#e0705a'], fog: 0x4a1d6e, sunDisc: 0xf4f0ff, stars: 150, outside: true, window: 0x30508a };
  V.neon = { name: 'Neon night', sky: ['#06030f', '#150a30', '#3a0a50', '#7a1a6a'], fog: 0x15082a, stars: 90, outside: true, neon: true, window: 0x7a3ac8 };
  // the fixed light floor of every interior: small, the same at every hour, not selectable. It only keeps an unlit room readable (and shaded); the mood comes from placed lights.
  SPACE.INTERIOR = { hemi: [0xfff0dc, 0x7a6a62, 0.5], sun: [0xffe6c8, 0.32], rim: [0xb0a0ff, 0.12] };

  // ---------------------------------------------------------------- pieces: stock furniture (every theme), then kits
  let kit = 'stock';                                                          // which kit the next pieces belong to: stock (every theme), then one kit per theme (the room editor lists stock + the room's theme kit)
  const P = SPACE.PIECES, def = (id, name, cat, fp, parts) => (P[id] = { name, cat, fp, parts, kit });
  const legs4 = (w, d, h, c, r = 0.04, y0 = 0) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => Cy([r, r, h, 6], [a * (w / 2 - r * 2), y0 + h / 2, b * (d / 2 - r * 2)], c));
  def('bed', 'Bed', 'sleep', [2.1, 2.7], [B([2.0, 0.3, 2.6], [0, 0.25, 0], '$wood'), B([1.9, 0.28, 2.45], [0, 0.5, 0.02], '$fabric2'), B([1.95, 0.1, 1.3], [0, 0.69, 0.55], '$fabric1'), B([0.7, 0.16, 0.45], [-0.5, 0.7, -0.9], '#ffffff'), B([0.7, 0.16, 0.45], [0.5, 0.7, -0.9], '#ffffff'), B([2.05, 1.05, 0.12], [0, 0.78, -1.3], '$trim')]);
  def('sofa', 'Sofa', 'seat', [2.3, 1.0], [B([2.2, 0.4, 0.95], [0, 0.22, 0], '$fabric1'), B([2.2, 0.6, 0.28], [0, 0.68, -0.34], '$fabric1'), B([0.26, 0.62, 0.95], [-0.97, 0.4, 0], '$fabric1'), B([0.26, 0.62, 0.95], [0.97, 0.4, 0], '$fabric1'), B([0.95, 0.16, 0.72], [-0.48, 0.5, 0.06], '$fabric2'), B([0.95, 0.16, 0.72], [0.48, 0.5, 0.06], '$fabric2'), ...legs4(2.0, 0.8, 0.1, '$trim', 0.04)]);
  def('armchair', 'Armchair', 'seat', [1.1, 1.0], [B([1.0, 0.4, 0.95], [0, 0.22, 0], '$fabric2'), B([1.0, 0.6, 0.26], [0, 0.68, -0.35], '$fabric2'), B([0.22, 0.55, 0.95], [-0.45, 0.4, 0], '$fabric2'), B([0.22, 0.55, 0.95], [0.45, 0.4, 0], '$fabric2'), B([0.7, 0.14, 0.7], [0, 0.48, 0.08], '$fabric1'), ...legs4(0.9, 0.8, 0.1, '$trim')]);
  def('coffeeTable', 'Coffee table', 'table', [1.3, 0.8], [B([1.3, 0.07, 0.7], [0, 0.42, 0], '$wood'), B([1.2, 0.04, 0.6], [0, 0.16, 0], '$trim'), ...legs4(1.3, 0.7, 0.4, '$trim', 0.035), Cy([0.09, 0.07, 0.2, 8], [0.3, 0.56, 0], '$accent2'), Sp([0.12], [0.3, 0.74, 0], '$plant', { k: [1, 1.2, 1] })]);
  def('sideTable', 'Side table', 'table', [0.6, 0.6], [Cy([0.3, 0.3, 0.05, 14], [0, 0.55, 0], '$wood'), Cy([0.04, 0.04, 0.55, 6], [0, 0.28, 0], '$trim'), Cy([0.2, 0.22, 0.05, 12], [0, 0.03, 0], '$trim')]);
  def('diningTable', 'Dining table', 'table', [1.8, 1.0], [B([1.7, 0.07, 0.9], [0, 0.76, 0], '$wood'), ...legs4(1.7, 0.9, 0.75, '$trim', 0.045)]);
  def('chair', 'Chair', 'seat', [0.55, 0.55], [B([0.5, 0.06, 0.5], [0, 0.46, 0], '$fabric1'), B([0.5, 0.55, 0.06], [0, 0.76, -0.22], '$fabric1'), ...legs4(0.5, 0.5, 0.45, '$trim', 0.03)]);
  def('stool', 'Stool', 'seat', [0.45, 0.45], [Cy([0.22, 0.2, 0.08, 12], [0, 0.72, 0], '$fabric2'), Cy([0.03, 0.03, 0.7, 6], [0, 0.35, 0], '$trim'), Cy([0.2, 0.22, 0.04, 10], [0, 0.02, 0], '$trim')]);
  const books = []; [0.5, 0.95, 1.4, 1.85].forEach((y, r) => { for (let i = 0; i < 7; i++) books.push(B([0.1, 0.28 + (i * 7 + r * 3) % 5 * 0.03, 0.24], [-0.48 + i * 0.15 + (r % 2) * 0.05, y + 0.17, 0], ['$accent', '$accent2', '$fabric1', '$fabric2', '#f0e8d8'][(i + r * 2) % 5])); });
  def('bookshelf', 'Bookshelf', 'storage', [1.3, 0.45], [B([1.3, 2.1, 0.38], [0, 1.05, 0], '$wood'), B([1.18, 1.98, 0.05], [0, 1.05, -0.12], '$trim'), ...[0.5, 0.95, 1.4, 1.85].map(y => B([1.18, 0.05, 0.34], [0, y, 0.02], '$wood')), ...books]);
  def('tvUnit', 'TV and stand', 'media', [1.8, 0.55], [B([1.7, 0.5, 0.5], [0, 0.25, 0], '$trim'), B([1.4, 0.8, 0.06], [0, 1.0, 0], '$trim'), Pl([1.3, 0.7], [0, 1.0, 0.04], '$screen', { e: 1 }), Cy([0.04, 0.04, 0.25, 6], [0, 0.6, 0], '$trim')]);
  def('floorLamp', 'Floor lamp', 'light', [0.5, 0.5], [Cy([0.2, 0.22, 0.05, 10], [0, 0.03, 0], '$trim'), Cy([0.025, 0.025, 1.7, 6], [0, 0.9, 0], '$trim'), Cy([0.22, 0.3, 0.42, 12], [0, 1.85, 0], '$glow', { e: 1, o: 0.95, g: 1.8 }), Li([0, 1.8, 0], '$glow', 0.6, 6)]);
  def('tableLamp', 'Table lamp', 'light', [0.4, 0.4], [Cy([0.12, 0.14, 0.04, 10], [0, 0.02, 0], '$trim'), Cy([0.02, 0.02, 0.3, 6], [0, 0.18, 0], '$trim'), Cy([0.1, 0.16, 0.2, 10], [0, 0.42, 0], '$glow', { e: 1, g: 1 }), Li([0, 0.5, 0], '$glow', 0.4, 4)]);
  def('plant', 'Plant', 'deco', [0.6, 0.6], [Cy([0.22, 0.17, 0.34, 10], [0, 0.17, 0], '$accent2'), Cy([0.03, 0.03, 0.5, 5], [0, 0.55, 0], '$plant'), Sp([0.26], [0, 0.85, 0], '$plant', { k: [1, 0.9, 1] }), Sp([0.2], [0.2, 0.7, 0.05], '$plant'), Sp([0.2], [-0.18, 0.72, -0.05], '$plant')]);
  def('tallPlant', 'Tall plant', 'deco', [0.7, 0.7], [Cy([0.26, 0.2, 0.42, 10], [0, 0.21, 0], '$trim'), Cy([0.04, 0.05, 1.3, 5], [0, 1.0, 0], '$wood'), Sp([0.4], [0, 1.85, 0], '$plant', { k: [1, 0.8, 1] }), Sp([0.3], [0.3, 1.5, 0.1], '$plant'), Sp([0.3], [-0.3, 1.55, -0.1], '$plant')]);
  def('rug', 'Rug', 'floor', [3.0, 2.0], [B([3.0, 0.03, 2.0], [0, 0.015, 0], '$fabric2'), B([2.6, 0.035, 1.6], [0, 0.017, 0], '$fabric1'), B([2.2, 0.04, 1.2], [0, 0.02, 0], '$fabric2')]);
  def('desk', 'Desk and computer', 'work', [1.8, 0.9], [B([1.7, 0.06, 0.8], [0, 0.76, 0], '$wood'), ...legs4(1.7, 0.8, 0.75, '$trim', 0.03), B([0.8, 0.5, 0.05], [0, 1.18, -0.22], '$trim'), Pl([0.72, 0.42], [0, 1.18, -0.19], '$screen', { e: 1 }), Cy([0.03, 0.03, 0.2, 5], [0, 0.9, -0.22], '$trim'), B([0.5, 0.02, 0.18], [0, 0.8, 0.1], '$metal')]);
  def('wallArt', 'Wall art', 'wall', [1.0, 0.1], [B([1.0, 0.76, 0.05], [0, 1.9, 0.03], '$trim'), B([0.9, 0.66, 0.02], [0, 1.9, 0.06], '$accent'), Cy([0.2, 0.2, 0.02, 16], [-0.15, 1.95, 0.08], '$accent2', { r: [90, 0, 0] }), B([0.35, 0.05, 0.02], [0.2, 1.75, 0.08], '#ffffff')]);
  // the free trophy shelf: two shelves for six places; trophies.js adds the player's own cups and medals to it (not part of the document)
  def('trophyShelf', 'Trophy shelf', 'wall', [1.7, 0.1], [B([1.7, 0.95, 0.03], [0, 1.72, 0.015], '$wood'), B([1.6, 0.05, 0.28], [0, 1.43, 0.15], '$trim'), B([1.6, 0.05, 0.28], [0, 1.93, 0.15], '$trim'), B([0.05, 0.12, 0.22], [-0.7, 1.35, 0.12], '$trim'), B([0.05, 0.12, 0.22], [0.7, 1.35, 0.12], '$trim'), B([0.05, 0.12, 0.22], [-0.7, 1.85, 0.12], '$trim'), B([0.05, 0.12, 0.22], [0.7, 1.85, 0.12], '$trim')]);
  def('speaker', 'Speaker', 'media', [0.45, 0.4], [B([0.4, 1.0, 0.36], [0, 0.5, 0], '$trim'), Cy([0.14, 0.14, 0.04, 14], [0, 0.72, 0.19], '$metal', { r: [90, 0, 0] }), Cy([0.1, 0.1, 0.04, 14], [0, 0.3, 0.19], '$metal', { r: [90, 0, 0] })]);
  def('kitchen', 'Kitchen counter', 'kitchen', [2.4, 0.8], [B([2.2, 0.9, 0.7], [0, 0.45, 0], '$trim'), B([2.3, 0.06, 0.76], [0, 0.93, 0], '$wood'), B([0.6, 0.04, 0.4], [-0.5, 0.97, 0.02], '$metal'), B([0.5, 0.02, 0.4], [0.6, 0.97, 0.02], '$trim'), Cy([0.09, 0.09, 0.02, 10], [0.5, 0.99, 0.02], '$accent2', { e: 1 }), Cy([0.09, 0.09, 0.02, 10], [0.75, 0.99, 0.02], '$accent2', { e: 1 })]);
  def('fridge', 'Fridge', 'kitchen', [0.9, 0.8], [B([0.85, 1.9, 0.75], [0, 0.95, 0], '$metal'), B([0.04, 0.5, 0.04], [0.32, 1.2, 0.4], '$trim'), B([0.8, 0.03, 0.02], [0, 1.15, 0.38], '$trim')]);
  def('beanbag', 'Bean bag', 'seat', [1.1, 1.1], [Sp([0.55], [0, 0.38, 0], '$fabric2', { k: [1, 0.7, 1] }), Sp([0.3], [0, 0.6, -0.2], '$fabric2', { k: [1, 0.6, 1] })]);
  def('neonOpen', 'Neon sign', 'wall', [1.4, 0.1], [Tx('OPEN', [1.2, 0.42], [0, 1.9, 0.04], '$accent', { glow: '$accent' }), Pl([1.6, 0.8], [0, 1.9, 0.03], '$accent', { e: 1, o: 0.12 })]);
  def('lampTable', 'Lamp table', 'light', [0.6, 0.6], [Cy([0.3, 0.3, 0.05, 14], [0, 0.55, 0], '$wood'), Cy([0.04, 0.04, 0.55, 6], [0, 0.28, 0], '$trim'), Cy([0.2, 0.22, 0.05, 12], [0, 0.03, 0], '$trim'), Cy([0.1, 0.12, 0.04, 10], [0, 0.61, 0], '$trim'), Cy([0.02, 0.02, 0.26, 6], [0, 0.76, 0], '$trim'), Cy([0.1, 0.16, 0.2, 10], [0, 0.98, 0], '$glow', { e: 1, g: 1 }), Li([0, 1.0, 0], '$glow', 0.4, 4)]);
  def('bench', 'Bench', 'seat', [1.6, 0.5], [B([1.6, 0.08, 0.5], [0, 0.45, 0], '$wood'), B([0.1, 0.42, 0.44], [-0.68, 0.21, 0], '$trim'), B([0.1, 0.42, 0.44], [0.68, 0.21, 0], '$trim'), B([1.3, 0.05, 0.38], [0, 0.49, 0], '$fabric1')]);

  // ---- designed-room pieces (2026-10-15): a bar, a pastry case, round and booth seating, plinths, a dance floor, a DJ table, sconces. Same chunky language; tokens recolour them per theme.
  def('barCounter', 'Bar counter', 'kitchen', [3.0, 0.9], [B([2.9, 1.0, 0.8], [0, 0.5, 0], '$trim'), B([3.0, 0.07, 0.92], [0, 1.04, 0], '$wood'), B([2.6, 0.1, 0.03], [0, 0.32, 0.41], '$accent', { e: 1, g: 0.8 }), B([2.6, 0.05, 0.03], [0, 0.9, 0.41], '$metal'),
    B([0.5, 0.34, 0.32], [-1.05, 1.25, -0.12], '$metal'), Cy([0.05, 0.05, 0.12, 8], [-1.05, 1.48, -0.12], '$trim'), Cy([0.06, 0.05, 0.09, 8], [-0.5, 1.12, 0.1], '#ffffff'), Cy([0.06, 0.05, 0.09, 8], [0.1, 1.12, 0.15], '#ffffff'), Cy([0.06, 0.05, 0.09, 8], [0.7, 1.12, 0.05], '$accent2'),
    Cy([0.07, 0.07, 0.28, 8], [1.15, 1.22, -0.2], '$plant', { o: 0.9 }), Cy([0.07, 0.07, 0.24, 8], [1.3, 1.2, -0.12], '$accent2', { o: 0.9 })]);
  def('pastryCase', 'Pastry case', 'kitchen', [1.6, 0.7], [B([1.5, 0.75, 0.55], [0, 0.375, 0], '$wood'), B([1.5, 0.05, 0.6], [0, 0.78, 0], '$trim'), B([1.4, 0.45, 0.5], [0, 1.03, 0], '#d8f0ff', { o: 0.3 }), B([1.4, 0.03, 0.46], [0, 0.95, 0], '$metal'),
    ...[-0.5, -0.17, 0.17, 0.5].map((x, i) => Sp([0.1], [x, 1.04, 0.08], ['$accent2', '#f0c878', '$fabric2', '#c88a58'][i], { k: [1, 0.7, 1] })), B([1.4, 0.04, 0.5], [0, 1.26, 0], '$trim')]);
  def('roundTable', 'Round table', 'table', [1.2, 1.2], [Cy([0.58, 0.58, 0.06, 16], [0, 0.74, 0], '$wood'), Cy([0.05, 0.05, 0.72, 6], [0, 0.37, 0], '$trim'), Cy([0.32, 0.36, 0.04, 12], [0, 0.02, 0], '$trim'), Cy([0.06, 0.05, 0.09, 8], [0.2, 0.82, 0.1], '#ffffff'), Sp([0.07], [-0.2, 0.84, -0.12], '$accent2')]);
  def('banquette', 'Booth bench', 'seat', [2.4, 0.9], [B([2.4, 0.42, 0.7], [0, 0.22, 0.08], '$fabric2'), B([2.4, 0.95, 0.2], [0, 0.65, -0.34], '$fabric2'), B([2.3, 0.1, 0.6], [0, 0.48, 0.1], '$fabric1'), B([2.4, 0.05, 0.22], [0, 1.15, -0.34], '$trim'), B([0.12, 0.6, 0.9], [-1.2, 0.3, 0], '$trim'), B([0.12, 0.6, 0.9], [1.2, 0.3, 0], '$trim')]);
  def('ottoman', 'Pouf', 'seat', [0.7, 0.7], [Cy([0.32, 0.34, 0.36, 14], [0, 0.2, 0], '$fabric1'), Cy([0.26, 0.26, 0.05, 14], [0, 0.4, 0], '$fabric2')]);
  def('lowShelf', 'Sideboard', 'storage', [1.8, 0.5], [B([1.8, 0.8, 0.46], [0, 0.45, 0], '$wood'), B([1.7, 0.7, 0.04], [0, 0.45, 0.24], '$trim'), B([0.04, 0.6, 0.02], [0, 0.45, 0.255], '$wood'), Cy([0.08, 0.1, 0.24, 8], [-0.55, 1.0, 0], '$accent2'), Sp([0.12], [-0.55, 1.2, 0], '$plant'), B([0.5, 0.05, 0.22], [0.4, 0.88, 0], '$accent'), B([0.45, 0.07, 0.2], [0.4, 0.95, 0], '$fabric1')]);
  def('planter', 'Planter box', 'deco', [1.8, 0.6], [B([1.8, 0.45, 0.55], [0, 0.225, 0], '$trim'), B([1.7, 0.04, 0.45], [0, 0.47, 0], '#5a3a28'), Sp([0.3], [-0.55, 0.78, 0], '$plant', { k: [1, 0.9, 1] }), Sp([0.36], [0.05, 0.9, 0], '$plant'), Sp([0.28], [0.6, 0.76, 0.05], '$plant', { k: [1, 0.9, 1] }), Cy([0.03, 0.03, 0.4, 5], [0.05, 0.6, 0], '$wood')]);
  def('plinth', 'Plinth', 'deco', [0.8, 0.8], [B([0.6, 1.0, 0.6], [0, 0.5, 0], '#f2eee6'), B([0.7, 0.05, 0.7], [0, 1.02, 0], '$trim'), B([0.5, 0.04, 0.5], [0, 0.04, 0], '$trim'), Sp([0.2], [0, 1.28, 0], '$accent', { m: 0.4 }), Tr([0.28, 0.02], [0, 1.28, 0], '$accent2', { r: [70, 0, 0], a: 'spin' })]);
  def('sculpture', 'Sculpture', 'deco', [1.0, 1.0], [Cy([0.45, 0.5, 0.2, 12], [0, 0.1, 0], '$trim'), B([0.5, 0.6, 0.5], [0, 0.5, 0], '$accent'), Sp([0.36], [0, 1.1, 0], '$accent2'), Cn([0.2, 0.7, 4], [0.05, 1.7, 0], '$glow', { e: 1, o: 0.9, g: 1.2 }), Tr([0.5, 0.04], [0, 1.0, 0], '$trim', { r: [75, 0, 20] })]);
  def('danceFloor', 'Dance floor', 'floor', [4.0, 4.0], [...[0, 1, 2, 3].flatMap(i => [0, 1, 2, 3].map(j => B([0.96, 0.03, 0.96], [-1.5 + i, 0.02, -1.5 + j], (i + j) % 2 ? '$accent' : '$accent2', { e: 1, o: 0.55 }))), B([4.0, 0.02, 4.0], [0, 0.012, 0], '$trim')]);
  def('djDeck', 'DJ deck', 'media', [2.8, 1.1], [B([2.8, 0.22, 1.1], [0, 0.11, 0], '$trim'), B([2.2, 0.9, 0.7], [0, 0.67, -0.08], '$trim'), B([2.3, 0.06, 0.8], [0, 1.14, -0.08], '$wood'), B([2.0, 0.04, 0.03], [0, 0.55, 0.28], '$accent', { e: 1, g: 1 }),
    ...[-1, 1].flatMap(s => [Cy([0.3, 0.3, 0.04, 18], [s * 0.65, 1.19, -0.06], '#1a1a22'), Cy([0.2, 0.2, 0.02, 18], [s * 0.65, 1.22, -0.06], '$accent2', { e: 1, a: 'spin' })]), B([0.42, 0.06, 0.5], [0, 1.2, -0.06], '$metal'), B([0.3, 0.02, 0.06], [0, 1.24, 0.04], '$accent', { e: 1 }),
    ...[-1, 1].map(s => B([0.5, 1.2, 0.4], [s * 1.2, 0.8, -0.2], '$trim')), ...[-1, 1].map(s => Cy([0.15, 0.15, 0.04, 14], [s * 1.2, 0.6, 0.01], '$metal', { r: [90, 0, 0] })), Li([0, 1.6, 0.4], '$accent2', 0.5, 5)]);
  def('ledPanel', 'LED panel', 'wall', [3.2, 0.1], [B([3.2, 1.4, 0.06], [0, 2.45, 0.03], '$trim'), Pl([3.0, 1.2], [0, 2.45, 0.065], '$screen', { e: 1, o: 0.75, a: 'pulse' }), B([3.0, 0.05, 0.03], [0, 1.78, 0.08], '$accent', { e: 1 }), B([3.0, 0.05, 0.03], [0, 3.12, 0.08], '$accent2', { e: 1 })]);
  def('wallLamp', 'Wall lamp', 'wall', [0.4, 0.1], [B([0.14, 0.3, 0.04], [0, 2.0, 0.02], '$trim'), B([0.06, 0.06, 0.16], [0, 2.0, 0.1], '$trim'), Cy([0.1, 0.16, 0.24, 10], [0, 2.1, 0.2], '$glow', { e: 1, o: 0.95, g: 1.5 }), Li([0, 2.1, 0.35], '$glow', 0.55, 5)]);

  // venue pieces (the Chog Hotel, docs/game/world.md): `venue` = only in a hotel venue (never a Home), `minTier` = the venue tier that unlocks it (1 Ser, 2 Fren, 3 Whale, 4 Legend), `act` = what a click does in the game
  const rowDisc = (cx, cy, n, cols) => Array.from({ length: n }, (_, i) => Cy([0.065, 0.065, 0.05, 10], [cx + ((i % 5) - 2) * 0.15, cy + Math.floor(i / 5) * 0.14, 0.04], cols[i % cols.length], { r: [90, 0, 0] }));
  def('stage', 'Stage', 'venue', [4.0, 2.4], [B([4.0, 0.3, 2.4], [0, 0.15, 0], '$wood'), B([4.06, 0.05, 2.46], [0, 0.32, 0], '$trim'), B([3.9, 0.03, 0.04], [0, 0.26, 1.2], '$accent', { e: 1, g: 1.2 }),
    B([3.7, 1.9, 0.1], [0, 1.25, -1.1], '$trim'), Pl([3.4, 1.6], [0, 1.25, -1.04], '$screen', { e: 1, o: 0.8, a: 'pulse' }),
    ...[-1, 1].flatMap(s => [B([0.55, 1.3, 0.5], [s * 1.6, 0.95, -0.55], '$trim'), Cy([0.18, 0.18, 0.04, 14], [s * 1.6, 0.75, -0.28], '$metal', { r: [90, 0, 0] }), Cy([0.11, 0.11, 0.04, 14], [s * 1.6, 1.3, -0.28], '$metal', { r: [90, 0, 0] })]), Li([0, 1.8, 0.2], '$accent', 0.7, 6)]);
  def('djBooth', 'DJ booth', 'venue', [2.2, 0.9], [B([2.0, 1.0, 0.7], [0, 0.5, 0], '$trim'), B([2.1, 0.06, 0.8], [0, 1.03, 0], '$wood'), B([2.0, 0.04, 0.03], [0, 0.6, 0.36], '$accent', { e: 1, g: 1 }),
    ...[-1, 1].flatMap(s => [Cy([0.3, 0.3, 0.04, 18], [s * 0.6, 1.08, 0.02], '#1a1a22'), Cy([0.2, 0.2, 0.02, 18], [s * 0.6, 1.11, 0.02], '$accent2', { e: 1, a: 'spin' })]), B([0.42, 0.06, 0.5], [0, 1.09, 0.02], '$metal'), B([0.3, 0.02, 0.06], [0, 1.13, 0.1], '$accent', { e: 1 }),
    B([0.7, 0.45, 0.04], [0, 1.4, -0.28], '$trim'), Pl([0.62, 0.36], [0, 1.4, -0.255], '$screen', { e: 1, a: 'pulse' }), Li([0, 1.4, 0.5], '$accent2', 0.5, 4)]);
  def('gameTable', 'Game table (Connect four)', 'venue', [1.5, 1.5], [Cy([0.7, 0.7, 0.06, 20], [0, 0.74, 0], '$wood'), Cy([0.07, 0.07, 0.7, 6], [0, 0.37, 0], '$trim'), Cy([0.38, 0.4, 0.05, 14], [0, 0.03, 0], '$trim'),
    B([0.86, 0.7, 0.05], [0, 1.15, 0], '#2a5ad8'), ...rowDisc(0, 0.9, 10, ['#e8453a', '#ffd23a', '#e8453a', '#ffd23a', '#ffd23a']), B([0.6, 0.04, 0.2], [0, 0.79, 0.3], '$trim'),
    Cy([0.2, 0.18, 0.06, 10], [-0.95, 0.46, 0], '$fabric1'), Cy([0.03, 0.03, 0.44, 6], [-0.95, 0.22, 0], '$trim'), Cy([0.2, 0.18, 0.06, 10], [0.95, 0.46, 0], '$fabric2'), Cy([0.03, 0.03, 0.44, 6], [0.95, 0.22, 0], '$trim')]);
  const candles = []; [[-0.45, 0.12, 1], [-0.32, 0.2, 0], [-0.19, 0.1, 0], [-0.06, 0.26, 1], [0.07, 0.18, 1], [0.2, 0.3, 1], [0.33, 0.14, 0], [0.46, 0.22, 1]].forEach(([x, h, up], i) => candles.push(B([0.07, h, 0.03], [x, 1.18 + (i % 3) * 0.06 + h / 2, -0.04], up ? '#3ad88a' : '#ff4a5a', { e: 1 })));
  def('chartTable', 'Chart table (Long / Short)', 'venue', [1.7, 1.0], [B([1.6, 0.06, 0.9], [0, 0.76, 0], '$wood'), ...legs4(1.6, 0.9, 0.75, '$trim', 0.04), B([1.3, 0.8, 0.05], [0, 1.3, -0.3], '$trim'), Pl([1.2, 0.7], [0, 1.3, -0.27], '#07140f', { e: 1 }), ...candles.map(c => Object.assign(c, { p: [c.p[0], c.p[1] + 0.02, -0.25] })),
    B([1.1, 0.02, 0.03], [0, 1.1, -0.26], '$accent', { e: 1 }), Cy([0.06, 0.06, 0.2, 8], [0.55, 0.88, 0.2], '#3ad88a', { e: 1 }), Cy([0.06, 0.06, 0.2, 8], [-0.55, 0.88, 0.2], '#ff4a5a', { e: 1 }), Li([0, 1.3, 0.3], '#3ad88a', 0.4, 4)]);
  Object.assign(P.stage, { venue: true, minTier: 2 }); Object.assign(P.djBooth, { venue: true, minTier: 2, act: 'music' });
  Object.assign(P.gameTable, { venue: true, minTier: 1, act: 'c4' }); Object.assign(P.chartTable, { venue: true, minTier: 1, act: 'ls' });

  // cyberpunk kit
  kit = 'cyberpunk';
  def('neonTube', 'Neon tube', 'wall', [2.2, 0.1], [Cy([0.04, 0.04, 2.2, 8], [0, 1.6, 0.06], '$accent', { r: [0, 0, 90], e: 1, g: 3.2 })]);
  def('neonTubeBlue', 'Neon tube (blue)', 'wall', [2.2, 0.1], [Cy([0.04, 0.04, 2.2, 8], [0, 1.2, 0.06], '$accent2', { r: [0, 0, 90], e: 1, g: 3.2 })]);
  def('holoScreen', 'Display stand', 'media', [1.4, 0.5], [B([0.9, 0.08, 0.5], [0, 0.04, 0], '$trim'), B([0.12, 1.0, 0.12], [0, 0.55, -0.04], '$metal'), B([1.34, 0.92, 0.07], [0, 1.5, -0.04], '$trim'), Pl([1.2, 0.78], [0, 1.5, 0.0], '$accent2', { e: 1, o: 0.55, a: 'pulse' }), B([1.24, 0.03, 0.03], [0, 1.99, 0.0], '$accent2', { e: 1 }), B([1.24, 0.03, 0.03], [0, 1.01, 0.0], '$accent2', { e: 1 }), Li([0, 1.5, 0.5], '$accent2', 0.5, 5)]);
  const rackLights = []; for (let i = 0; i < 12; i++) rackLights.push(B([0.07, 0.04, 0.03], [-0.25 + (i % 4) * 0.15, 0.4 + Math.floor(i / 4) * 0.5, 0.36], i % 3 ? '$accent2' : '$accent', { e: 1, a: 'blink' }));
  def('serverRack', 'Server rack', 'tech', [0.9, 0.8], [B([0.8, 1.9, 0.7], [0, 0.95, 0], '$trim'), B([0.7, 1.7, 0.02], [0, 0.95, 0.36], '#05040c'), ...rackLights]);
  def('vending', 'Vending machine', 'tech', [1.0, 0.85], [B([0.95, 1.9, 0.75], [0, 0.95, 0], '$trim'), Pl([0.72, 1.3], [0, 1.1, 0.39], '$accent2', { e: 1, o: 0.9 }), ...[0.2, 0.55, 0.9, 1.25].map(y => B([0.6, 0.04, 0.03], [0, y + 0.55, 0.4], '$accent', { e: 1 })), B([0.5, 0.2, 0.03], [0, 0.22, 0.38], '#05040c'), Li([0, 1.2, 0.8], '$accent2', 0.5, 4)]);
  def('cityModel', 'City model', 'deco', [0.9, 0.9], [B([0.9, 0.05, 0.9], [0, 0.45, 0], '$trim'), ...[[-0.25, -0.2, 0.5], [0.15, -0.25, 0.8], [0.25, 0.2, 0.35], [-0.2, 0.25, 0.6], [0, 0, 1.0]].map(([x, z, h], i) => B([0.2, h, 0.2], [x, 0.48 + h / 2, z], i % 2 ? '$accent' : '$accent2', { e: 1, o: 0.75, a: i === 4 ? 'pulse' : undefined }))]);
  def('gamingChair', 'Gaming chair', 'seat', [0.8, 0.8], [Cy([0.3, 0.3, 0.08, 10], [0, 0.5, 0], '$trim'), B([0.55, 0.9, 0.12], [0, 0.98, -0.28], '$trim'), B([0.5, 0.06, 0.1], [0, 1.25, -0.22], '$accent', { e: 1 }), Cy([0.04, 0.04, 0.4, 6], [0, 0.25, 0], '$metal'), Cy([0.3, 0.3, 0.04, 5], [0, 0.04, 0], '$trim')]);
  // retro 80s kit
  kit = 'retro80s';
  def('arcadeCab', 'Arcade cabinet', 'tech', [1.0, 0.9], [B([0.9, 1.85, 0.75], [0, 0.93, -0.05], '$accent'), B([0.88, 0.1, 0.5], [0, 1.0, 0.33], '$trim', { r: [-12, 0, 0] }), Pl([0.7, 0.55], [0, 1.45, 0.34], '$screen', { e: 1, r: [-8, 0, 0] }), B([0.88, 0.25, 0.1], [0, 1.82, 0.3], '$glow', { e: 1 }), Cy([0.02, 0.02, 0.18, 5], [-0.15, 1.1, 0.4], '$trim'), Sp([0.04], [-0.15, 1.2, 0.4], '#ff3030')]);
  def('boombox', 'Boombox', 'media', [1.0, 0.4], [B([1.0, 0.5, 0.28], [0, 0.25, 0], '$trim'), Cy([0.17, 0.17, 0.05, 14], [-0.28, 0.25, 0.15], '$metal', { r: [90, 0, 0] }), Cy([0.17, 0.17, 0.05, 14], [0.28, 0.25, 0.15], '$metal', { r: [90, 0, 0] }), B([0.22, 0.12, 0.03], [0, 0.34, 0.15], '$accent2', { e: 1 }), B([0.7, 0.04, 0.04], [0, 0.55, 0], '$metal')]);
  def('palm', 'Palm plant', 'deco', [0.8, 0.8], [Cy([0.24, 0.2, 0.36, 8], [0, 0.18, 0], '$accent2'), Cy([0.05, 0.07, 1.0, 6], [0, 0.85, 0], '$wood', { r: [0, 0, 5] }), ...[0, 60, 120, 180, 240, 300].map(a => Cn([0.1, 0.8, 4], [Math.sin(a * Math.PI / 180) * 0.35, 1.45, Math.cos(a * Math.PI / 180) * 0.35], '$plant', { r: [Math.cos(a * Math.PI / 180) * 70, 0, -Math.sin(a * Math.PI / 180) * 70] }))]);
  def('sunPoster', 'Sunset poster', 'wall', [1.4, 0.1], [B([1.5, 1.1, 0.05], [0, 1.9, 0.03], '$trim'), Cy([0.4, 0.4, 0.02, 20], [0, 2.0, 0.07], '$glow', { r: [90, 0, 0], e: 1 }), ...[0.08, 0.2, 0.32].map(y => B([1.4, 0.05, 0.03], [0, 1.66 + y, 0.09], '$accent', { e: 1 })), B([1.4, 0.2, 0.03], [0, 1.5, 0.09], '$accent2', { e: 1 })]);
  def('discoBall', 'Disco ball', 'light', [0.6, 0.6], [Cy([0.01, 0.01, 2.6, 4], [0, 3.7, 0], '$metal'), Sp([0.32], [0, 2.2, 0], '#e8e8ff', { a: 'spin', g: 2.2, m: 0.5 }), Li([0, 2.0, 0], '$accent', 0.6, 6)]);
  def('triangleNeon', 'Triangle neon', 'wall', [1.4, 0.1], [B([1.3, 0.05, 0.05], [0, 1.3, 0.05], '$accent2', { e: 1, g: 2 }), B([1.3, 0.05, 0.05], [-0.33, 1.95, 0.05], '$accent2', { e: 1, r: [0, 0, 60], g: 2 }), B([1.3, 0.05, 0.05], [0.33, 1.95, 0.05], '$accent2', { e: 1, r: [0, 0, -60], g: 2 })]);
  def('retroTv', 'CRT TV', 'media', [0.9, 0.7], [B([0.9, 0.7, 0.7], [0, 0.75, 0], '$wood'), Pl([0.62, 0.5], [-0.06, 0.78, 0.36], '$screen', { e: 1 }), Cy([0.04, 0.04, 0.03, 8], [0.33, 0.9, 0.36], '$metal', { r: [90, 0, 0] }), B([1.0, 0.42, 0.6], [0, 0.21, 0], '$trim')]);
  // space kit
  kit = 'space';
  def('consoleDesk', 'Console desk', 'tech', [2.0, 0.9], [B([1.9, 0.8, 0.7], [0, 0.4, 0], '$trim'), B([1.9, 0.1, 0.6], [0, 0.88, 0.1], '$metal', { r: [-18, 0, 0] }), Pl([0.7, 0.4], [-0.45, 1.15, 0.0], '$screen', { e: 1, r: [-22, 0, 0] }), Pl([0.7, 0.4], [0.45, 1.15, 0.0], '$accent2', { e: 1, r: [-22, 0, 0] }), ...[-0.8, -0.65, 0.6, 0.75].map(x => B([0.06, 0.03, 0.06], [x, 0.98, 0.3], '$accent', { e: 1, a: 'blink' })), Li([0, 1.2, 0.6], '$screen', 0.4, 4)]);
  def('holoGlobe', 'Hologram globe', 'deco', [0.8, 0.8], [Cy([0.2, 0.28, 0.14, 12], [0, 0.07, 0], '$trim'), Sp([0.4], [0, 0.8, 0], '$accent', { e: 1, w: 1, a: 'spin', o: 0.9, g: 2.4 }), Tr([0.5, 0.012], [0, 0.8, 0], '$accent2', { e: 1, r: [70, 0, 0], a: 'spin' }), Li([0, 0.9, 0.3], '$accent', 0.45, 4)]);
  def('crystal', 'Energy crystal', 'deco', [0.7, 0.7], [Cy([0.3, 0.34, 0.1, 6], [0, 0.05, 0], '$trim'), Cn([0.18, 1.0, 6], [0, 0.65, 0], '$glow', { e: 1, o: 0.85, g: 2.2 }), Cn([0.12, 0.6, 6], [0.2, 0.4, 0.1], '$glow', { e: 1, o: 0.8, r: [0, 0, -14] }), Cn([0.1, 0.5, 6], [-0.18, 0.35, -0.06], '$glow', { e: 1, o: 0.8, r: [0, 0, 16] }), Li([0, 0.7, 0.3], '$glow', 0.5, 4)]);
  def('capsuleBed', 'Sleep capsule', 'sleep', [2.2, 1.2], [B([2.1, 0.4, 1.0], [0, 0.3, 0], '$trim'), B([1.9, 0.18, 0.85], [0, 0.55, 0], '$fabric1'), Sp([0.6], [0, 0.6, 0], '$accent', { k: [1.75, 0.8, 0.85], o: 0.22, e: 1 }), B([0.4, 0.12, 0.02], [0.7, 0.35, 0.51], '$accent', { e: 1, a: 'blink' })]);
  def('oxygenTube', 'Garden tube', 'deco', [0.8, 0.8], [Cy([0.3, 0.3, 0.1, 12], [0, 0.05, 0], '$trim'), Cy([0.28, 0.28, 1.7, 14], [0, 0.95, 0], '$accent', { o: 0.2, e: 1 }), Sp([0.2], [0, 0.4, 0], '$plant'), Sp([0.18], [0.05, 0.75, 0], '$plant'), Sp([0.16], [-0.05, 1.1, 0], '$plant'), Cy([0.3, 0.3, 0.1, 12], [0, 1.85, 0], '$trim'), Li([0, 1.0, 0.3], '$glow', 0.4, 3)]);
  def('spaceChair', 'Pilot seat', 'seat', [0.8, 0.8], [B([0.6, 0.1, 0.6], [0, 0.45, 0], '$fabric1'), B([0.6, 0.9, 0.12], [0, 0.95, -0.3], '$fabric1'), B([0.12, 0.3, 0.5], [-0.36, 0.65, 0], '$trim'), B([0.12, 0.3, 0.5], [0.36, 0.65, 0], '$trim'), Cy([0.06, 0.1, 0.45, 8], [0, 0.22, 0], '$metal')]);
  // halloween kit
  kit = 'halloween';
  def('pumpkin', 'Jack-o-lantern', 'deco', [0.9, 0.9], [Sp([0.45], [0, 0.4, 0], '$accent', { k: [1.1, 0.85, 1.1] }), Cy([0.05, 0.07, 0.18, 6], [0, 0.82, 0], '$plant'), B([0.12, 0.12, 0.04], [-0.16, 0.5, 0.45], '$glow', { e: 1, r: [0, 0, 45], g: 1.2 }), B([0.12, 0.12, 0.04], [0.16, 0.5, 0.45], '$glow', { e: 1, r: [0, 0, 45], g: 1.2 }), B([0.34, 0.07, 0.04], [0, 0.28, 0.46], '$glow', { e: 1 }), B([0.08, 0.08, 0.04], [-0.12, 0.34, 0.46], '$glow', { e: 1 }), B([0.08, 0.08, 0.04], [0.12, 0.34, 0.46], '$glow', { e: 1 }), Li([0, 0.45, 0.2], '$glow', 0.7, 4)]);
  def('bigPumpkin', 'Big pumpkin', 'deco', [1.3, 1.3], P.pumpkin.parts.map(p => Object.assign({}, p, p.p ? { p: p.p.map(v => v * 1.5) } : {}, p.s ? { s: p.s.map(v => v * 1.5) } : {})));
  def('gravestone', 'Gravestone', 'deco', [0.8, 0.4], [B([0.7, 0.8, 0.14], [0, 0.4, 0], '$metal'), Cy([0.35, 0.35, 0.14, 14], [0, 0.8, 0], '$metal', { r: [90, 0, 0] }), Tx('RIP', [0.4, 0.2], [0, 0.78, 0.08], '#2a2430'), B([1.0, 0.08, 0.5], [0, 0.04, 0.1], '$trim')]);
  def('cauldron', 'Cauldron', 'deco', [1.3, 1.3], [Sp([0.6], [0, 0.55, 0], '$trim', { k: [1, 0.85, 1] }), Tr([0.55, 0.07], [0, 0.95, 0], '$metal', { r: [90, 0, 0] }), Cy([0.55, 0.55, 0.02, 18], [0, 0.92, 0], '$screen', { e: 1 }), Sp([0.1], [-0.2, 1.05, 0.1], '$screen', { e: 1, a: 'bob' }), Sp([0.07], [0.25, 1.08, -0.1], '$screen', { e: 1, a: 'bob' }), ...[-1, 1].map(s => Cy([0.06, 0.06, 0.2, 5], [s * 0.35, 0.1, 0.3], '$trim')), Li([0, 1.2, 0], '$screen', 0.7, 5)]);
  def('ghost', 'Ghost', 'deco', [0.7, 0.7], [Sp([0.34], [0, 1.25, 0], '#f4f0ff', { e: 1, o: 0.88, a: 'bob', g: 1.6 }), Cn([0.4, 0.9, 12], [0, 0.65, 0], '#f4f0ff', { e: 1, o: 0.8, r: [180, 0, 0] }), Sp([0.06], [-0.12, 1.3, 0.29], '#1a1020'), Sp([0.06], [0.12, 1.3, 0.29], '#1a1020'), Sp([0.07], [0, 1.1, 0.3], '#1a1020', { k: [1, 1.3, 0.5] })]);
  def('candles', 'Candles', 'light', [0.6, 0.6], [...[[0, 0, 0.5], [0.18, 0.1, 0.34], [-0.15, -0.08, 0.26]].flatMap(([x, z, h]) => [Cy([0.05, 0.05, h, 8], [x, h / 2, z], '#f4ecd8'), Cn([0.035, 0.12, 6], [x, h + 0.07, z], '$glow', { e: 1, g: 0.9 })]), Li([0, 0.7, 0], '$glow', 0.6, 4)]);
  def('cobweb', 'Cobweb', 'wall', [1.2, 0.1], [...[0, 1, 2, 3, 4].map(i => B([0.9, 0.012, 0.012], [0.35 + Math.cos(i * 0.4) * 0.0, 3.0 - 0.35, 0.04], '#e8e8f4', { o: 0.7, r: [0, 0, 190 + i * 22], p: [0.45 * Math.cos((i * 22 + 10) * Math.PI / 180) * 0 + 0.0, 2.95, 0.04] })), Tr([0.3, 0.008], [0, 2.95, 0.04], '#e8e8f4', { o: 0.7 }), Tr([0.55, 0.008], [0, 2.95, 0.04], '#e8e8f4', { o: 0.7 })]);
  def('coffinBed', 'Coffin bed', 'sleep', [1.2, 2.4], [B([1.0, 0.5, 2.2], [0, 0.35, 0], '$wood'), B([0.6, 0.12, 1.9], [0, 0.65, 0.05], '$fabric1'), B([1.0, 0.1, 0.1], [0, 0.65, 1.0], '$accent', { e: 1 }), B([0.1, 0.1, 1.0], [0, 0.65, 0.5], '$accent', { e: 1 })]);
  def('bat', 'Bat', 'wall', [0.8, 0.1], [Sp([0.1], [0, 2.4, 0.05], '#1a1020', { k: [1, 1.3, 0.7] }), B([0.34, 0.03, 0.18], [-0.24, 2.44, 0.04], '#1a1020', { r: [0, 0, 20], a: 'pulse' }), B([0.34, 0.03, 0.18], [0.24, 2.44, 0.04], '#1a1020', { r: [0, 0, -20], a: 'pulse' })]);
  def('witchHat', 'Witch hat', 'deco', [0.8, 0.8], [Cy([0.45, 0.45, 0.04, 16], [0, 0.05, 0], '$trim'), Cn([0.28, 0.9, 12], [0, 0.5, 0], '$trim'), Cy([0.29, 0.3, 0.1, 12], [0, 0.18, 0], '$accent')]);

  // text on the wall (edit the words and the colour per placed item) and NFT frames (the picture comes from the owner's wallet, see docs/game/spaces.md)
  kit = 'stock';
  def('wallText', 'Wall text', 'wall', [2.0, 0.1], [Tx('YOUR TEXT', [2.0, 0.5], [0, 1.9, 0.04], '$accent', { edit: true, glow: '$accent' })]);
  def('wallTextSoft', 'Wall text (no glow)', 'wall', [2.0, 0.1], [Tx('hello', [2.0, 0.5], [0, 1.9, 0.04], '$trim', { edit: true, font: '"Fredoka", sans-serif' })]);
  kit = 'nft';                                                                // not offered in rooms until frames are wired to the wallet (docs/game/spaces.md step 4)
  def('nftFrame', 'NFT frame', 'art', [1.1, 0.1], [B([1.1, 1.1, 0.06], [0, 1.85, 0.03], '$trim'), B([0.98, 0.98, 0.03], [0, 1.85, 0.06], '#fffaf0'), { t: 'img', s: [0.9, 0.9], p: [0, 1.85, 0.085], edit: true }]);
  def('nftFrameWide', 'NFT frame (wide)', 'art', [1.7, 0.1], [B([1.7, 1.1, 0.06], [0, 1.85, 0.03], '$trim'), B([1.58, 0.98, 0.03], [0, 1.85, 0.06], '#fffaf0'), { t: 'img', s: [1.5, 0.9], p: [0, 1.85, 0.085], edit: true }]);
  def('nftEasel', 'Easel', 'art', [1.0, 0.8], [B([0.05, 1.5, 0.05], [-0.4, 0.75, 0.1], '$wood', { r: [0, 0, 8] }), B([0.05, 1.5, 0.05], [0.4, 0.75, 0.1], '$wood', { r: [0, 0, -8] }), B([0.05, 1.3, 0.05], [0, 0.65, -0.3], '$wood', { r: [14, 0, 0] }), B([0.95, 0.95, 0.05], [0, 1.15, 0.06], '$trim'), B([0.85, 0.85, 0.03], [0, 1.15, 0.09], '#fffaf0'), { t: 'img', s: [0.78, 0.78], p: [0, 1.15, 0.115], edit: true }]);
  def('nftPlinth', 'Plinth with screen', 'art', [1.0, 0.8], [Cy([0.35, 0.4, 0.8, 4], [0, 0.4, 0], '$trim', { r: [0, 45, 0] }), B([0.8, 0.8, 0.04], [0, 1.25, 0.1], '$trim', { r: [-12, 0, 0] }), { t: 'img', s: [0.7, 0.7], p: [0, 1.25, 0.13], edit: true, r: [-12, 0, 0] }]);
  // the Chog Hotel's own furniture (kit 'hotel': used by js/hotel.js, never listed in the room editor)
  kit = 'hotel';
  def('receptionDesk', 'Reception desk', 'deco', [3.3, 0.9], [B([3.2, 0.95, 0.7], [0, 0.475, 0], '$wood'), B([3.34, 0.08, 0.86], [0, 0.99, 0], '$trim'), B([3.0, 0.55, 0.05], [0, 0.55, 0.37], '$accent'),
    Tx('RECEPTION', [1.7, 0.26], [0, 0.6, 0.4], '#ffffff', { glow: '#ff9ad8' }), B([0.5, 0.34, 0.04], [-0.9, 1.22, -0.1], '$screen', { e: 1 }), B([0.12, 0.14, 0.12], [-0.9, 1.07, -0.1], '$trim'),
    Cy([0.1, 0.12, 0.05, 12], [0.8, 1.05, 0.05], '$metal'), Sp([0.07], [0.8, 1.1, 0.05], '$glow', { e: 1 }), Cy([0.025, 0.03, 0.32, 6], [1.25, 1.18, -0.1], '$trim'), Cy([0.12, 0.16, 0.16, 10], [1.25, 1.42, -0.1], '$glow', { e: 1, g: 1.2 })]);
  // the shop's decor kits (kit 'shop', each piece carries `shop: <item id>` = the ERC-1155 item on the ChogShop contract that unlocks it; contracts/items.json). Listed in every room's editor, locked until owned.
  kit = 'shop';
  const shopDef = (itemId, id, name, cat, fp, parts, minTier) => { def(id, name, cat, fp, parts); P[id].shop = itemId; if (minTier) P[id].minTier = minTier; };
  shopDef(1, 'shopNeonSign', 'Degen neon sign', 'wall', [1.9, 0.1], [B([1.9, 0.7, 0.05], [0, 1.9, 0.025], '#1a1030'), B([1.9, 0.04, 0.06], [0, 2.25, 0.03], '#ff5ab8', { e: 1 }), B([1.9, 0.04, 0.06], [0, 1.55, 0.03], '#ff5ab8', { e: 1 }),
    Tx('DEGEN', [1.6, 0.5], [0, 1.9, 0.06], '#ff5ab8', { glow: '#ff5ab8' }), Li([0, 1.9, 0.6], '#ff5ab8', 0.5, 4)]);
  shopDef(2, 'shopBull', 'Bull statue', 'deco', [1.3, 0.8], [Cy([0.5, 0.55, 0.3, 12], [0, 0.15, 0], '$trim'), B([0.8, 0.42, 0.38], [-0.05, 0.64, 0], '#e0a824'), B([0.34, 0.34, 0.32], [0.5, 0.74, 0], '#e0a824'), B([0.14, 0.12, 0.2], [0.7, 0.66, 0], '#c88c18'),
    Cn([0.045, 0.22, 6], [0.46, 1.0, 0.2], '#fff0c0', { r: [-30, 0, 25] }), Cn([0.045, 0.22, 6], [0.46, 1.0, -0.2], '#fff0c0', { r: [30, 0, 25] }),
    B([0.09, 0.16, 0.09], [-0.35, 0.38, 0.14], '#c88c18'), B([0.09, 0.16, 0.09], [-0.35, 0.38, -0.14], '#c88c18'), B([0.09, 0.16, 0.09], [0.25, 0.38, 0.14], '#c88c18'), B([0.09, 0.16, 0.09], [0.25, 0.38, -0.14], '#c88c18'),
    Cy([0.015, 0.015, 0.35, 5], [-0.5, 0.64, 0], '#c88c18', { r: [0, 0, 70] }), Sp([0.025], [0.62, 0.8, 0.14], '#1a1030'), Sp([0.025], [0.62, 0.8, -0.14], '#1a1030')]);
  shopDef(3, 'shopBearRug', 'Bear rug', 'floor', [2.3, 1.8], [Cy([0.8, 0.8, 0.03, 14], [0, 0.02, 0], '#7a4a2a', { k: [1.15, 1, 0.95] }), Cy([0.38, 0.38, 0.035, 12], [0.95, 0.025, 0], '#8a5a34'),
    Cy([0.1, 0.1, 0.04, 8], [1.12, 0.03, 0.3], '#7a4a2a'), Cy([0.1, 0.1, 0.04, 8], [1.12, 0.03, -0.3], '#7a4a2a'), Cy([0.16, 0.16, 0.04, 10], [1.2, 0.04, 0], '#d8b890'), Cy([0.045, 0.045, 0.05, 8], [1.3, 0.05, 0], '#1a1030'),
    Cy([0.17, 0.17, 0.035, 8], [0.5, 0.025, 0.7], '#6a3a1e'), Cy([0.17, 0.17, 0.035, 8], [0.5, 0.025, -0.7], '#6a3a1e'), Cy([0.17, 0.17, 0.035, 8], [-0.6, 0.025, 0.7], '#6a3a1e'), Cy([0.17, 0.17, 0.035, 8], [-0.6, 0.025, -0.7], '#6a3a1e'),
    Cy([0.035, 0.035, 0.05, 6], [1.15, 0.05, 0.14], '#1a1030'), Cy([0.035, 0.035, 0.05, 6], [1.15, 0.05, -0.14], '#1a1030')]);
  const pumpkin = (x, z, k) => [Sp([0.28 * k], [x, 0.26 * k, z], '#f08a1a', { k: [1.15, 0.9, 1.15] }), Cy([0.04, 0.05, 0.14, 5], [x, 0.5 * k, z], '#4a7a2a'), Pl([0.08, 0.08], [x - 0.09 * k, 0.3 * k, z + 0.31 * k], '#ffd84a', { e: 1 }), Pl([0.08, 0.08], [x + 0.09 * k, 0.3 * k, z + 0.31 * k], '#ffd84a', { e: 1 }), Pl([0.2 * k, 0.05], [x, 0.17 * k, z + 0.31 * k], '#ffd84a', { e: 1 })];
  shopDef(4, 'shopPumpkins', 'Halloween pumpkin set', 'deco', [1.2, 0.8], [...pumpkin(-0.3, 0, 1), ...pumpkin(0.3, 0.1, 0.8), ...pumpkin(0, -0.2, 0.6), Li([0, 0.5, 0.5], '#ff9a30', 0.5, 3)]);
  shopDef(5, 'shopArcade', 'Retro arcade cabinet', 'tech', [0.9, 0.9], [B([0.8, 1.5, 0.7], [0, 0.75, 0], '#2b2a66'), B([0.8, 0.25, 0.2], [0, 1.6, 0.2], '#ff5ab8', { e: 1 }), Pl([0.55, 0.4], [0, 1.15, 0.356], '$screen', { e: 1 }), B([0.8, 0.1, 0.35], [0, 0.78, 0.4], '#1a1a40'),
    Cy([0.015, 0.015, 0.12, 6], [-0.15, 0.88, 0.42], '#d0d0e0'), Sp([0.03], [-0.15, 0.95, 0.42], '#ff3a3a'), Sp([0.03], [0.1, 0.84, 0.42], '#ffd84a', { e: 1 }), Sp([0.03], [0.2, 0.84, 0.42], '#4ae8ff', { e: 1 }), Li([0, 1.0, 0.8], '#7a8aff', 0.35, 3)]);
  shopDef(6, 'shopCyberLamps', 'Cyberpunk lamp pair', 'light', [1.8, 0.4], [Cy([0.2, 0.22, 0.05, 10], [-0.7, 0.025, 0], '#2a2a3a'), Cy([0.2, 0.22, 0.05, 10], [0.7, 0.025, 0], '#2a2a3a'), Cy([0.03, 0.04, 1.9, 6], [-0.7, 0.95, 0], '#2a2a3a'), Cy([0.03, 0.04, 1.9, 6], [0.7, 0.95, 0], '#2a2a3a'),
    Cy([0.05, 0.05, 0.7, 6], [-0.7, 1.75, 0], '#30e8ff', { e: 1, g: 1.0 }), Cy([0.05, 0.05, 0.7, 6], [0.7, 1.75, 0], '#ff3ac8', { e: 1, g: 1.0 }), Li([-0.7, 1.8, 0.2], '#30e8ff', 0.7, 6), Li([0.7, 1.8, 0.2], '#ff3ac8', 0.7, 6)]);
  shopDef(7, 'shopTrophyShelf', 'Gold trophy shelf', 'wall', [1.7, 0.1], [B([1.7, 0.9, 0.03], [0, 1.75, 0.015], '$wood'), B([1.6, 0.06, 0.28], [0, 1.5, 0.15], '#e0a824'), B([1.6, 0.06, 0.28], [0, 2.0, 0.15], '#e0a824'), B([0.05, 0.14, 0.2], [-0.7, 1.42, 0.12], '#c88c18'), B([0.05, 0.14, 0.2], [0.7, 1.42, 0.12], '#c88c18'),
    ...[-0.5, 0, 0.5].flatMap((x, i) => [Cy([0.04, 0.07, 0.1 + i * 0.03, 8], [x, 1.58 + i * 0.015, 0.15], '#ffd84a'), Cy([0.09, 0.05, 0.1, 10], [x, 1.7 + i * 0.03, 0.15], '#ffd84a'), Tr([0.08, 0.012], [x, 1.7 + i * 0.03, 0.15], '#ffd84a', { r: [90, 0, 0] })]),
    Sp([0.1], [-0.4, 2.1, 0.15], '#ffd84a'), Sp([0.1], [0.4, 2.1, 0.15], '#c8d0e0')]);
  shopDef(8, 'shopAquarium', 'Whale tank aquarium', 'deco', [2.4, 0.9], [B([2.4, 0.5, 0.9], [0, 0.25, 0], '$trim'), B([2.4, 0.06, 0.9], [0, 1.62, 0], '$trim'), B([2.3, 1.08, 0.8], [0, 1.08, 0], '#2a9ad8', { e: 1, o: 0.35 }),
    Sp([0.28], [0, 1.1, 0], '#4a6ad8', { k: [1.8, 0.85, 0.85], a: 'bob' }), Sp([0.26], [0.05, 1.0, 0.05], '#c8d8ff', { k: [1.5, 0.5, 0.8] }), Cn([0.14, 0.35, 6], [-0.66, 1.18, 0], '#4a6ad8', { r: [0, 0, 90] }), B([0.04, 0.3, 0.16], [-0.86, 1.3, 0], '#4a6ad8'),
    Sp([0.03], [0.4, 1.18, 0.2], '#1a1030'), Sp([0.035], [-0.8, 1.45, 0.2], '#ffffff', { e: 1, o: 0.6 }), Sp([0.03], [0.7, 1.4, -0.2], '#ffffff', { e: 1, o: 0.6 }), Sp([0.025], [0.9, 1.2, 0.1], '#ffffff', { e: 1, o: 0.6 }),
    Cn([0.08, 0.4, 5], [-0.95, 0.75, 0.25], '#3aa86a'), Cn([0.08, 0.5, 5], [0.95, 0.8, -0.2], '#3aa86a'), Li([0, 1.2, 0.7], '#40a8ff', 0.6, 5)], 3);
  kit = 'stock';
  // a creator-made piece lives inside the space document itself, in this same format (here: a little robot made of 11 shapes)
  SPACE.DEMO_ROBOT = { name: 'Robo', cat: 'custom', fp: [0.8, 0.8], parts: [Cy([0.3, 0.3, 0.6, 10], [0, 0.4, 0], '#e8d84a'), B([0.34, 0.18, 0.34], [0, 0.8, 0], '#e8d84a'), Sp([0.26], [0, 1.0, 0], '#e8d84a'), Sp([0.07], [-0.1, 1.04, 0.22], '#ffffff', { e: 1 }), Sp([0.07], [0.1, 1.04, 0.22], '#ffffff', { e: 1 }), Cy([0.015, 0.015, 0.3, 4], [0, 1.4, 0], '#444444'), Sp([0.05], [0, 1.58, 0], '#ff4a4a', { e: 1, a: 'blink', g: 1 }), B([0.12, 0.5, 0.12], [-0.42, 0.45, 0], '#d8c83a', { r: [0, 0, 10] }), B([0.12, 0.5, 0.12], [0.42, 0.45, 0], '#d8c83a', { r: [0, 0, -10] }), B([0.14, 0.3, 0.2], [-0.15, 0.1, 0], '#444444'), B([0.14, 0.3, 0.2], [0.15, 0.1, 0], '#444444')] };

  // the room every player starts with: bare walls, floor and windows, nothing inside. The editor offers ready-made rooms (js/space_layouts.js) and the whole catalog.
  SPACE.starterRoom = (theme = 'studio') => ({ name: 'My Home', theme, pieces: [] });
})();
