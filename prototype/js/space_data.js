// ===== space data: themes and the piece catalog (all data, no behaviour). Format documented in space.js =====
// Stock themes: studio is the house style (modern, warm). The other four exist to prove the range creators get: cyberpunk, retro80s, space, halloween.
// Creators will author their own themes and pieces in exactly this format.
(function () {
  const B = (s, p, c, o) => Object.assign({ t: 'box', s, p, c }, o), Cy = (s, p, c, o) => Object.assign({ t: 'cyl', s, p, c }, o), Sp = (s, p, c, o) => Object.assign({ t: 'sph', s, p, c }, o);
  const Cn = (s, p, c, o) => Object.assign({ t: 'cone', s, p, c }, o), Tr = (s, p, c, o) => Object.assign({ t: 'tor', s, p, c }, o), Pl = (s, p, c, o) => Object.assign({ t: 'plane', s, p, c }, o);
  const Tx = (txt, s, p, c, o) => Object.assign({ t: 'text', txt, s, p, c }, o), Li = (p, c, i, d) => ({ t: 'light', p, c, i, d });

  // scenery helper: a world position that lands at screen offset (r right, u up) from the room centre, d units behind it (camera looks along -(1,1,1))
  const at = (r, u, d = 40) => { const k = d / Math.sqrt(3); return [r * 0.7071 - u * 0.4082 - k, u * 0.8165 - k, -r * 0.7071 - u * 0.4082 - k]; };
  // windows sit above the furniture line (bottom edge at 1.6): two on the back wall, one over the desk
  const wins = (w, h, shape) => [{ wall: 'z', u: -1.3, y: 2.15, w, h, shape }, { wall: 'z', u: 1.2, y: 2.15, w, h, shape }, { wall: 'x', u: -1.8, y: 2.15, w, h, shape }];
  // ---------------------------------------------------------------- themes = asset kits: a palette, a default wall and floor, window shape, scenery. NO render style, NO lighting (light comes only from the pieces placed in a space).
  const T = SPACE.THEMES;
  T.studio = {
    name: 'Modern studio', floorTex: 'wood', wallTex: 'plaster',
    pal: { wall: 0xf0e2d0, floor: 0xc89a6a, trim: 0x3f3850, accent: 0x7a3ac8, accent2: 0xff7aa8, wood: 0xb07a4a, metal: 0xc0bccb, fabric1: 0x6fbdb0, fabric2: 0xf0aebb, glow: 0xffe0a0, plant: 0x5eb868, screen: 0x9ad8ff },
    windows: wins(1.5, 1.1),
  };
  T.cyberpunk = {
    name: 'Cyberpunk', floorTex: 'metal', wallTex: 'brick', slab: 0x2a2250,
    pal: { wall: 0x4a3a7a, floor: 0x2a2458, trim: 0x14102c, accent: 0xff2a98, accent2: 0x2ad8ff, wood: 0x4a3d6a, metal: 0x6a7aa0, fabric1: 0x4a3f98, fabric2: 0x9a2a80, glow: 0xff5ac8, plant: 0x2aa88a, screen: 0x2ad8ff },
    windows: wins(1.0, 1.1),
    outside: [B([1.6, 7, 1.6], at(-8.6, 1.5, 45), 0x2a1a50), B([2.2, 10, 2.2], at(-6.6, 2.6, 52), 0x34205e), B([1.4, 5, 1.4], at(-9.8, 0.8, 40), 0x261848), B([2, 8, 2], at(7.8, 2.0, 50), 0x2a1a50), B([1.6, 11, 1.6], at(9.2, 3.2, 56), 0x34205e), B([0.9, 0.9, 0.9], at(-6.6, 7.5, 52), '$accent', { e: 1, g: 5 }), B([0.9, 0.9, 0.9], at(9.2, 8.6, 56), '$accent2', { e: 1, g: 5 })],
  };
  T.retro80s = {
    name: 'Retro 80s', floorTex: 'grid', wallTex: 'stripes', slab: 0x3a1a6a,
    pal: { wall: 0x7a50c0, floor: 0x3a2880, trim: 0x1c1040, accent: 0xff4ac8, accent2: 0x4ae8ff, wood: 0x9a5aba, metal: 0xb8b0e0, fabric1: 0xff4ac8, fabric2: 0x4ae8ff, glow: 0xffe24a, plant: 0x4ae8a0, screen: 0xff8ad8 },
    windows: wins(1.9, 1.0), outside: [Sp([3.6], at(-6.8, 4.2, 55), 0xffc060, { e: 1, g: 14 })],
  };
  T.space = {
    name: 'Space station', floorTex: 'metal', wallTex: 'panels', slab: 0x303858,
    pal: { wall: 0x4a5684, floor: 0x505a7c, trim: 0x1c2244, accent: 0x5ad8ff, accent2: 0xffb03a, wood: 0x7a84a0, metal: 0xa8b4d0, fabric1: 0x4a6ab0, fabric2: 0x8a5ac0, glow: 0x7affea, plant: 0x4ad89a, screen: 0x5ad8ff },
    windows: wins(1.1, 1.1, 'round'),
    outside: [Sp([3.8], at(-7.0, 3.8, 55), 0x3a8ae8, { m: 0.5 }), Tr([5.6, 0.22], at(-7.0, 3.8, 55), 0xb8c8ff, { r: [75, 0, 20], m: 0.5, k: [1, 1, 0.25] }), Sp([0.9], at(7.6, 4.8, 60), 0xc8c0b8, { m: 0.5 })],
  };
  T.halloween = {
    name: 'Halloween', floorTex: 'boards', wallTex: 'planks', slab: 0x3a2a40,
    pal: { wall: 0x7a5a94, floor: 0x5a3a28, trim: 0x2c1c34, accent: 0xff7a1a, accent2: 0x9a4ad8, wood: 0x7a5232, metal: 0x8a8098, fabric1: 0x8a3ac8, fabric2: 0xff7a1a, glow: 0xffb030, plant: 0x4a8a3a, screen: 0x7aff5a },
    windows: wins(1.2, 1.1), outside: [Sp([1.8], at(7.4, 4.8, 58), 0xfff0b0, { e: 1, g: 9 })],
  };
  // ---------------------------------------------------------------- window views: the background only (sky, fog, sun or moon, stars, window glass, scenery beyond the windows).
  // Default = the real clock (space.js picks the view for the hour); an owner may pin one. A view NEVER lights the room: interiors are lit only by the lights placed in them (docs/game/world.md).
  const V = SPACE.VIEWS;
  V.day = { name: 'Day', sky: ['#7fb0e8', '#b8d8f4', '#f6e6d0', '#ffe3b0'], fog: 0xf0d8c0, sunDisc: 0xffd890, window: 0xdff0ff };
  V.evening = { name: 'Evening', sky: ['#5d4f9c', '#e0807f', '#ffc27c', '#ffe3a8'], fog: 0xf0a888, sunDisc: 0xffd890, window: 0xffcf98 };
  V.night = { name: 'Night', sky: ['#120a30', '#381568', '#a52a74', '#e0705a'], fog: 0x4a1d6e, sunDisc: 0xf4f0ff, stars: 150, outside: true, window: 0x30508a };
  V.neon = { name: 'Neon night', sky: ['#06030f', '#150a30', '#3a0a50', '#7a1a6a'], fog: 0x15082a, stars: 90, outside: true, neon: true, window: 0x7a3ac8 };
  // the fixed light floor of every interior: small, the same at every hour, not selectable. It only keeps an unlit room readable (and shaded); the mood comes from placed lights.
  SPACE.INTERIOR = { hemi: [0xfff0dc, 0x7a6a62, 0.3], sun: [0xffe6c8, 0.2], rim: [0xb0a0ff, 0.1] };

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
  def('pendantLamp', 'Pendant lamp', 'ceiling', [0.5, 0.5], [Cy([0.012, 0.012, 0.7, 4], [0, 2.95, 0], '$trim'), Cy([0.05, 0.3, 0.26, 14], [0, 2.52, 0], '$trim'), Cy([0.2, 0.2, 0.05, 14], [0, 2.38, 0], '$glow', { e: 1, g: 2.6 }), Li([0, 2.3, 0], '$glow', 0.85, 8.5)]);
  def('ceilingNeon', 'Ceiling neon', 'ceiling', [1.6, 0.3], [B([1.7, 0.05, 0.1], [0, 3.1, 0], '$trim'), B([1.6, 0.06, 0.12], [0, 3.03, 0], '$accent', { e: 1, g: 2.4 }), Li([0, 2.8, 0], '$accent', 0.8, 7)]);
  def('plant', 'Plant', 'deco', [0.6, 0.6], [Cy([0.22, 0.17, 0.34, 10], [0, 0.17, 0], '$accent2'), Cy([0.03, 0.03, 0.5, 5], [0, 0.55, 0], '$plant'), Sp([0.26], [0, 0.85, 0], '$plant', { k: [1, 0.9, 1] }), Sp([0.2], [0.2, 0.7, 0.05], '$plant'), Sp([0.2], [-0.18, 0.72, -0.05], '$plant')]);
  def('tallPlant', 'Tall plant', 'deco', [0.7, 0.7], [Cy([0.26, 0.2, 0.42, 10], [0, 0.21, 0], '$trim'), Cy([0.04, 0.05, 1.3, 5], [0, 1.0, 0], '$wood'), Sp([0.4], [0, 1.85, 0], '$plant', { k: [1, 0.8, 1] }), Sp([0.3], [0.3, 1.5, 0.1], '$plant'), Sp([0.3], [-0.3, 1.55, -0.1], '$plant')]);
  def('rug', 'Rug', 'floor', [3.0, 2.0], [B([3.0, 0.03, 2.0], [0, 0.015, 0], '$fabric2'), B([2.6, 0.035, 1.6], [0, 0.017, 0], '$fabric1'), B([2.2, 0.04, 1.2], [0, 0.02, 0], '$fabric2')]);
  def('desk', 'Desk and computer', 'work', [1.8, 0.9], [B([1.7, 0.06, 0.8], [0, 0.76, 0], '$wood'), ...legs4(1.7, 0.8, 0.75, '$trim', 0.03), B([0.8, 0.5, 0.05], [0, 1.18, -0.22], '$trim'), Pl([0.72, 0.42], [0, 1.18, -0.19], '$screen', { e: 1 }), Cy([0.03, 0.03, 0.2, 5], [0, 0.9, -0.22], '$trim'), B([0.5, 0.02, 0.18], [0, 0.8, 0.1], '$metal')]);
  def('wallArt', 'Wall art', 'wall', [1.0, 0.1], [B([1.0, 0.76, 0.05], [0, 1.9, 0.03], '$trim'), B([0.9, 0.66, 0.02], [0, 1.9, 0.06], '$accent'), Cy([0.2, 0.2, 0.02, 16], [-0.15, 1.95, 0.08], '$accent2', { r: [90, 0, 0] }), B([0.35, 0.05, 0.02], [0.2, 1.75, 0.08], '#ffffff')]);
  def('speaker', 'Speaker', 'media', [0.45, 0.4], [B([0.4, 1.0, 0.36], [0, 0.5, 0], '$trim'), Cy([0.14, 0.14, 0.04, 14], [0, 0.72, 0.19], '$metal', { r: [90, 0, 0] }), Cy([0.1, 0.1, 0.04, 14], [0, 0.3, 0.19], '$metal', { r: [90, 0, 0] })]);
  def('kitchen', 'Kitchen counter', 'kitchen', [2.4, 0.8], [B([2.2, 0.9, 0.7], [0, 0.45, 0], '$trim'), B([2.3, 0.06, 0.76], [0, 0.93, 0], '$wood'), B([0.6, 0.04, 0.4], [-0.5, 0.97, 0.02], '$metal'), B([0.5, 0.02, 0.4], [0.6, 0.97, 0.02], '$trim'), Cy([0.09, 0.09, 0.02, 10], [0.5, 0.99, 0.02], '$accent2', { e: 1 }), Cy([0.09, 0.09, 0.02, 10], [0.75, 0.99, 0.02], '$accent2', { e: 1 })]);
  def('fridge', 'Fridge', 'kitchen', [0.9, 0.8], [B([0.85, 1.9, 0.75], [0, 0.95, 0], '$metal'), B([0.04, 0.5, 0.04], [0.32, 1.2, 0.4], '$trim'), B([0.8, 0.03, 0.02], [0, 1.15, 0.38], '$trim')]);
  def('beanbag', 'Bean bag', 'seat', [1.1, 1.1], [Sp([0.55], [0, 0.38, 0], '$fabric2', { k: [1, 0.7, 1] }), Sp([0.3], [0, 0.6, -0.2], '$fabric2', { k: [1, 0.6, 1] })]);
  def('neonOpen', 'Neon sign', 'wall', [1.4, 0.1], [Tx('OPEN', [1.2, 0.42], [0, 1.9, 0.04], '$accent', { glow: '$accent' }), Pl([1.6, 0.8], [0, 1.9, 0.03], '$accent', { e: 1, o: 0.12 })]);

  // cyberpunk kit
  kit = 'cyberpunk';
  def('neonTube', 'Neon tube', 'wall', [2.2, 0.1], [Cy([0.04, 0.04, 2.2, 8], [0, 1.6, 0.06], '$accent', { r: [0, 0, 90], e: 1, g: 3.2 })]);
  def('neonTubeBlue', 'Neon tube (blue)', 'wall', [2.2, 0.1], [Cy([0.04, 0.04, 2.2, 8], [0, 1.2, 0.06], '$accent2', { r: [0, 0, 90], e: 1, g: 3.2 })]);
  def('holoScreen', 'Hologram screen', 'media', [1.4, 0.5], [Cy([0.15, 0.2, 0.06, 10], [0, 0.03, 0], '$trim'), Cy([0.02, 0.02, 0.8, 5], [0, 0.4, 0], '$metal'), Pl([1.2, 0.8], [0, 1.4, 0], '$accent2', { e: 1, o: 0.38, a: 'pulse' }), B([1.24, 0.03, 0.03], [0, 1.82, 0], '$accent2', { e: 1 }), B([1.24, 0.03, 0.03], [0, 0.98, 0], '$accent2', { e: 1 }), Li([0, 1.4, 0.5], '$accent2', 0.5, 5)]);
  const rackLights = []; for (let i = 0; i < 12; i++) rackLights.push(B([0.07, 0.04, 0.03], [-0.25 + (i % 4) * 0.15, 0.4 + Math.floor(i / 4) * 0.5, 0.36], i % 3 ? '$accent2' : '$accent', { e: 1, a: 'blink' }));
  def('serverRack', 'Server rack', 'tech', [0.9, 0.8], [B([0.8, 1.9, 0.7], [0, 0.95, 0], '$trim'), B([0.7, 1.7, 0.02], [0, 0.95, 0.36], '#05040c'), ...rackLights]);
  def('vending', 'Vending machine', 'tech', [1.0, 0.85], [B([0.95, 1.9, 0.75], [0, 0.95, 0], '$trim'), Pl([0.72, 1.3], [0, 1.1, 0.39], '$accent2', { e: 1, o: 0.9 }), ...[0.2, 0.55, 0.9, 1.25].map(y => B([0.6, 0.04, 0.03], [0, y + 0.55, 0.4], '$accent', { e: 1 })), B([0.5, 0.2, 0.03], [0, 0.22, 0.38], '#05040c'), Li([0, 1.2, 0.8], '$accent2', 0.5, 4)]);
  def('cityModel', 'City model', 'deco', [0.9, 0.9], [B([0.9, 0.05, 0.9], [0, 0.45, 0], '$trim'), ...[[-0.25, -0.2, 0.5], [0.15, -0.25, 0.8], [0.25, 0.2, 0.35], [-0.2, 0.25, 0.6], [0, 0, 1.0]].map(([x, z, h], i) => B([0.2, h, 0.2], [x, 0.48 + h / 2, z], i % 2 ? '$accent' : '$accent2', { e: 1, o: 0.75, a: i === 4 ? 'pulse' : undefined }))]);
  def('gamingChair', 'Gaming chair', 'seat', [0.8, 0.8], [Cy([0.3, 0.3, 0.08, 10], [0, 0.5, 0], '$trim'), B([0.55, 0.9, 0.12], [0, 0.98, -0.28], '$trim'), B([0.5, 0.06, 0.1], [0, 1.25, -0.22], '$accent', { e: 1 }), Cy([0.04, 0.04, 0.4, 6], [0, 0.25, 0], '$metal'), Cy([0.3, 0.3, 0.04, 5], [0, 0.04, 0], '$trim')]);
  // retro 80s kit
  kit = 'retro80s';
  def('arcadeCab', 'Arcade cabinet', 'tech', [1.0, 0.9], [B([0.9, 1.85, 0.75], [0, 0.93, -0.05], '$accent'), B([0.88, 0.1, 0.5], [0, 1.0, 0.33], '$trim', { r: [-12, 0, 0] }), Pl([0.7, 0.55], [0, 1.45, 0.34], '$screen', { e: 1, r: [-8, 0, 0] }), B([0.88, 0.25, 0.1], [0, 1.82, 0.3], '$glow', { e: 1 }), Cy([0.02, 0.02, 0.18, 5], [-0.15, 1.1, 0.4], '$trim'), Sp([0.04], [-0.15, 1.2, 0.4], '#ff3030'), Li([0, 1.4, 0.9], '$screen', 0.5, 4)]);
  def('boombox', 'Boombox', 'media', [1.0, 0.4], [B([1.0, 0.5, 0.28], [0, 0.25, 0], '$trim'), Cy([0.17, 0.17, 0.05, 14], [-0.28, 0.25, 0.15], '$metal', { r: [90, 0, 0] }), Cy([0.17, 0.17, 0.05, 14], [0.28, 0.25, 0.15], '$metal', { r: [90, 0, 0] }), B([0.22, 0.12, 0.03], [0, 0.34, 0.15], '$accent2', { e: 1 }), B([0.7, 0.04, 0.04], [0, 0.55, 0], '$metal')]);
  def('palm', 'Palm plant', 'deco', [0.8, 0.8], [Cy([0.24, 0.2, 0.36, 8], [0, 0.18, 0], '$accent2'), Cy([0.05, 0.07, 1.0, 6], [0, 0.85, 0], '$wood', { r: [0, 0, 5] }), ...[0, 60, 120, 180, 240, 300].map(a => Cn([0.1, 0.8, 4], [Math.sin(a * Math.PI / 180) * 0.35, 1.45, Math.cos(a * Math.PI / 180) * 0.35], '$plant', { r: [Math.cos(a * Math.PI / 180) * 70, 0, -Math.sin(a * Math.PI / 180) * 70] }))]);
  def('sunPoster', 'Sunset poster', 'wall', [1.4, 0.1], [B([1.5, 1.1, 0.05], [0, 1.9, 0.03], '$trim'), Cy([0.4, 0.4, 0.02, 20], [0, 2.0, 0.07], '$glow', { r: [90, 0, 0], e: 1 }), ...[0.08, 0.2, 0.32].map(y => B([1.4, 0.05, 0.03], [0, 1.66 + y, 0.09], '$accent', { e: 1 })), B([1.4, 0.2, 0.03], [0, 1.5, 0.09], '$accent2', { e: 1 })]);
  def('discoBall', 'Disco ball', 'light', [0.6, 0.6], [Cy([0.01, 0.01, 1.0, 4], [0, 2.8, 0], '$metal'), Sp([0.32], [0, 2.2, 0], '#e8e8ff', { a: 'spin', g: 2.2, m: 0.5 }), Li([0, 2.0, 0], '$accent', 0.6, 6)]);
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
  kit = 'stock';
  // a creator-made piece lives inside the space document itself, in this same format (here: a little robot made of 11 shapes)
  SPACE.DEMO_ROBOT = { name: 'Robo', cat: 'custom', fp: [0.8, 0.8], parts: [Cy([0.3, 0.3, 0.6, 10], [0, 0.4, 0], '#e8d84a'), B([0.34, 0.18, 0.34], [0, 0.8, 0], '#e8d84a'), Sp([0.26], [0, 1.0, 0], '#e8d84a'), Sp([0.07], [-0.1, 1.04, 0.22], '#ffffff', { e: 1 }), Sp([0.07], [0.1, 1.04, 0.22], '#ffffff', { e: 1 }), Cy([0.015, 0.015, 0.3, 4], [0, 1.4, 0], '#444444'), Sp([0.05], [0, 1.58, 0], '#ff4a4a', { e: 1, a: 'blink', g: 1 }), B([0.12, 0.5, 0.12], [-0.42, 0.45, 0], '#d8c83a', { r: [0, 0, 10] }), B([0.12, 0.5, 0.12], [0.42, 0.45, 0], '#d8c83a', { r: [0, 0, -10] }), B([0.14, 0.3, 0.2], [-0.15, 0.1, 0], '#444444'), B([0.14, 0.3, 0.2], [0.15, 0.1, 0], '#444444')] };

  // ---------------------------------------------------------------- demo layouts: the same studio floor plan; each theme brings its own assets (the window view is picked separately: ?view=day|evening|night|neon, default the real clock)
  const base = [
    { p: 'rug', x: 0.6, z: 0.6 }, { p: 'bed', x: -3.2, z: 1.9, ry: 90 }, { p: 'sofa', x: 0.7, z: 1.5, ry: 180 }, { p: 'coffeeTable', x: 0.7, z: 0.1 },
    { p: 'tvUnit', x: 0.7, z: -3.15 }, { p: 'bookshelf', x: -3.3, z: -3.15 }, { p: 'desk', x: -4.05, z: -1.8, ry: 90 }, { p: 'chair', x: -3.15, z: -1.8, ry: -90 },
    { p: 'floorLamp', x: 2.2, z: -3.0 }, { p: 'plant', x: 4.1, z: -2.9 }, { p: 'wallArt', x: -4.5, z: 0.3, ry: 90 },
  ];
  const L = SPACE.LAYOUTS;
  L.studio = { name: 'Studio', theme: 'studio', pieces: base.concat([{ p: 'sideTable', x: -1.6, z: 1.9 }, { p: 'tableLamp', x: -1.6, y: 0.58, z: 1.9 }, { p: 'tallPlant', x: -4.1, z: 3.0 }, { p: 'armchair', x: -1.0, z: -1.1, ry: 40 }, { p: 'speaker', x: 1.9, z: -3.1 }]) };
  L.cyberpunk = { name: 'Neon loft', theme: 'cyberpunk', pieces: base.filter(b => !['wallArt', 'plant', 'bookshelf'].includes(b.p)).map(b => b.p === 'chair' ? { ...b, p: 'gamingChair' } : b).concat([{ p: 'neonTube', x: -1.3, y: -0.75, z: -3.5 }, { p: 'neonTubeBlue', x: -1.3, y: -1.1, z: -3.5 }, { p: 'neonOpen', x: -4.5, z: 0.3, ry: 90 }, { p: 'serverRack', x: 4.0, z: -2.9 }, { p: 'holoScreen', x: -1.2, z: 3.0, ry: 160 }, { p: 'vending', x: -4.05, z: -3.0, ry: 90 }, { p: 'cityModel', x: -1.6, y: 0, z: 1.9 }, { p: 'speaker', x: 1.9, z: -3.1 }]) };
  L.retro80s = { name: 'Arcade apartment', theme: 'retro80s', pieces: base.filter(b => !['bookshelf', 'wallArt', 'tvUnit'].includes(b.p)).concat([{ p: 'retroTv', x: 0.7, z: -3.1 }, { p: 'arcadeCab', x: -1.7, z: -3.0 }, { p: 'arcadeCab', x: -0.7, z: -3.0 }, { p: 'sunPoster', x: -4.5, z: 0.3, ry: 90 }, { p: 'triangleNeon', x: 2.4, z: -3.5 }, { p: 'boombox', x: -1.6, z: 1.9 }, { p: 'palm', x: -4.0, z: 3.0 }, { p: 'discoBall', x: 0.6, z: 0.6 }, { p: 'beanbag', x: -1.3, z: -0.9 }]) };
  L.space = { name: 'Orbital quarters', theme: 'space', pieces: base.filter(b => !['bed', 'bookshelf', 'wallArt', 'plant', 'tvUnit', 'sofa', 'desk', 'chair', 'floorLamp'].includes(b.p)).concat([{ p: 'capsuleBed', x: -3.4, z: 2.2, ry: 90 }, { p: 'sofa', x: 0.7, z: 1.5, ry: 180 }, { p: 'consoleDesk', x: 0.7, z: -3.0 }, { p: 'consoleDesk', x: -2.6, z: -3.0 }, { p: 'spaceChair', x: -2.6, z: -1.9 }, { p: 'holoGlobe', x: 3.0, z: -2.6 }, { p: 'crystal', x: -1.5, z: 1.9 }, { p: 'oxygenTube', x: -4.0, z: -0.6 }, { p: 'oxygenTube', x: 4.0, z: -0.2 }]) };
  L.halloween = { name: 'Haunted house', theme: 'halloween', pieces: base.filter(b => !['bed', 'wallArt', 'plant', 'tvUnit'].includes(b.p)).concat([{ p: 'coffinBed', x: -3.4, z: 1.9, ry: 90 }, { p: 'cauldron', x: 3.0, z: 0.6 }, { p: 'pumpkin', x: 2.4, z: -2.9 }, { p: 'bigPumpkin', x: 3.8, z: 2.9 }, { p: 'gravestone', x: -1.4, z: 2.8, ry: 25 }, { p: 'ghost', x: 1.8, z: 2.4 }, { p: 'candles', x: -1.6, z: 1.9 }, { p: 'cobweb', x: -4.45, z: -3.4, ry: 45 }, { p: 'bat', x: 0.7, z: -3.5 }, { p: 'bat', x: -1.4, z: -3.5 }, { p: 'witchHat', x: -3.6, z: -0.6 }, { p: 'tvUnit', x: 0.7, z: -3.15 }]) };
  // the free room every player starts with (small, cosy, themed by the studio kit; the player redecorates it in the room editor)
  SPACE.starterRoom = (theme = 'studio') => ({
    name: 'My Home', theme,
    pieces: [{ p: 'pendantLamp', x: 0, z: 0.5 }, { p: 'rug', x: 0, z: 0.5 }, { p: 'sofa', x: 0, z: 1.5, ry: 180 }, { p: 'coffeeTable', x: 0, z: 0 }, { p: 'tvUnit', x: 0, z: -3.225 }, { p: 'bed', x: -3.45, z: 2, ry: 90 },
      { p: 'bookshelf', x: -3.3, z: -3.275 }, { p: 'plant', x: 4.1, z: -3.2 }, { p: 'floorLamp', x: 2.5, z: 1.5 }, { p: 'wallArt', x: -4.5, z: 0, ry: 90 }],
  });
  // a gallery: your own wall colour and floor pattern, text on the wall, NFT frames (the pictures are the owner's tokens; here demo images), and a piece the creator built from shapes
  L.gallery = {
    name: 'My gallery', theme: 'studio', windows: false, wall: { c: '#f4efe6', pat: 'subway' }, floor: { c: '#c9b8a0', pat: 'herringbone' }, custom: { robo: SPACE.DEMO_ROBOT },
    pieces: [
      { p: 'wallText', x: -3.4, z: -3.5, txt: 'MY CHOGS', c: '#7a3ac8' }, { p: 'nftFrame', x: -1.6, z: -3.5, img: 'data/nft_demo_1700.png' }, { p: 'nftFrameWide', x: 0.0, z: -3.5, img: 'data/nft_demo_1700.png' }, { p: 'nftFrame', x: 1.6, z: -3.5, img: 'data/nft_demo_1700.png' },
      { p: 'nftFrame', x: -4.5, z: -2.6, ry: 90, img: 'data/nft_demo_1700.png' }, { p: 'nftFrameWide', x: -4.5, z: -0.2, ry: 90, img: 'data/nft_demo_1700.png' }, { p: 'wallTextSoft', x: -4.5, z: 2.4, ry: 90, txt: 'welcome', c: '#3f3850' },
      { p: 'nftEasel', x: 1.2, z: 0.8, ry: -30, img: 'data/nft_demo_1700.png' }, { p: 'nftPlinth', x: -1.8, z: 1.2, ry: 20, img: 'data/nft_demo_1700.png' }, { p: 'robo', x: 3.4, z: -1.6, ry: -40 },
      { p: 'sofa', x: 0.3, z: 2.7, ry: 180, k: 0.9 }, { p: 'rug', x: 0.2, z: 1.0 }, { p: 'tallPlant', x: -4.0, z: 3.0 }, { p: 'tallPlant', x: 4.0, z: -2.9 }, { p: 'floorLamp', x: 4.0, z: 0.4 },
    ],
  };
})();
