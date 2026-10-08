'use strict';
// Builds server/seed_venues.json: the venues the game itself puts in the Chog Hotel (so the first floors are never empty).
// Each venue is a normal room document made from the player catalog; the server serves it to visitors like any other. Run after changing the catalog:
//   node tools/build_room_catalog.js && node tools/build_seed_venues.js
// The checks mirror the placement rules of the room editor (js/room.js `fits`): inside the floor, no overlaps, the way to the door free, no wall piece over a window.
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'prototype', 'js');
const SPACE = { THEMES: {}, VIEWS: {}, PIECES: {}, LAYOUTS: {} };
vm.runInNewContext(fs.readFileSync(path.join(JS, 'space_data.js'), 'utf8'), { SPACE });
const rooms = require('../server/rooms');
const [W, D] = rooms.LIMITS.size, DOOR_U = W / 2 - 1.6, LIMIT = 60;

const P = (p, x, z, ry = 0, o = {}) => Object.assign({ p, x, z }, ry ? { ry } : {}, o);
// a table with stools on both long sides
const set = (x, z, table = 'diningTable', seat = 'stool', dx = 0.5, dz = 0.78) => [P(table, x, z), P(seat, x - dx, z - dz, 180), P(seat, x + dx, z - dz, 180), P(seat, x - dx, z + dz), P(seat, x + dx, z + dz)];

const V = [];
const add = (no, name, cat, desc, doc) => V.push({ id: 'v' + no, no, floor: Math.floor(no / 100), name, cat, desc, doc });

// ---------------------------------------------------------------- floor 1
add(101, 'Moka Corner', 'Café', 'Coffee, quiet tables and a window seat. Say hi to whoever sits next to you.', {
  name: 'Moka Corner', theme: 'studio', wall: { c: '#f0d8c0', pat: 'wainscot' }, floor: { c: '#b8855a', pat: 'boards' },
  pieces: [P('kitchen', -3.2, -3.1), P('fridge', -1.45, -3.1), P('bookshelf', 0.5, -3.275), ...set(-2.6, 0.2), ...set(0.3, 0.2), ...set(3.1, 0.6),
    P('tallPlant', -4.1, 3.0), P('plant', 4.1, 3.0), P('neonOpen', -4.5, 2.5, 90), P('wallArt', -4.5, 0.9, 90),
    P('pendantLamp', -2.6, 0.2), P('pendantLamp', 0.3, 0.2), P('pendantLamp', 3.1, 0.6)],
});
add(102, 'NOVA After Dark', 'Club', 'The neon room. Lights are the whole point here: place a few and watch the mood change.', {
  name: 'NOVA After Dark', theme: 'cyberpunk', view: 'neon', windows: false, wall: { c: '#2a2058', pat: 'panels' }, floor: { c: '#1c1840', pat: 'grid' },
  pieces: [P('neonTube', -3.2, -3.5), P('neonTubeBlue', -0.6, -3.5), P('speaker', -4.2, -3.25), P('serverRack', -2.2, -3.1), P('holoScreen', -0.6, -3.2), P('speaker', 1.2, -3.25),
    P('vending', -4.0, 3.0, 0), P('beanbag', -3.2, 1.5), P('beanbag', -1.8, 2.4), P('gamingChair', 1.0, 1.2, 180), P('gamingChair', 2.2, 1.9, 180), P('coffeeTable', 1.6, 2.9),
    P('discoBall', 0.5, 0.0), P('ceilingNeon', -1.8, 0.8, 0, { c: '#ff2a98' }), P('ceilingNeon', 2.6, 0.2, 0, { c: '#2ad8ff' }), P('neonOpen', -4.5, 0.0, 90)],
});
add(103, 'Pixel Palace', 'Arcade', 'Five cabinets, one boombox and a high-score wall. Come break a record.', {
  name: 'Pixel Palace', theme: 'retro80s', view: 'night', windows: false,
  pieces: [P('arcadeCab', -4.0, -3.05), P('arcadeCab', -3.0, -3.05), P('arcadeCab', -2.0, -3.05), P('arcadeCab', -1.0, -3.05), P('arcadeCab', 0.0, -3.05),
    P('arcadeCab', -4.05, -1.5, 90), P('arcadeCab', -4.05, -0.5, 90), P('arcadeCab', -4.05, 0.5, 90), P('boombox', 1.5, -3.3), P('palm', 4.1, 3.0), P('palm', -3.9, 3.0),
    P('beanbag', -1.8, 1.4), P('beanbag', -0.5, 2.5), P('retroTv', 3.6, 0.6, -90), P('triangleNeon', -2.0, -3.5), P('sunPoster', -4.5, 2.3, 90),
    P('discoBall', 0.8, 0.2), P('ceilingNeon', -1.6, -0.5, 0, { c: '#ff4ac8' }), P('ceilingNeon', 2.2, 1.6, 0, { c: '#4ae8ff' })],
});
add(104, 'Gallery One', 'Gallery', 'A white room with a few pictures and a lot of quiet. A good place to look at things.', {
  name: 'Gallery One', theme: 'studio', windows: false, wall: { c: '#f4efe6', pat: 'subway' }, floor: { c: '#c9b8a0', pat: 'herringbone' },
  pieces: [P('wallArt', -3.5, -3.5), P('wallArt', -1.8, -3.5), P('wallArt', -0.1, -3.5), P('wallArt', -4.5, -2.5, 90), P('wallArt', -4.5, -0.9, 90), P('wallText', -4.5, 1.6, 90, { txt: 'GALLERY ONE', c: '#7a3ac8' }),
    P('rug', -0.5, 0.8), P('sofa', -0.5, 0.8, 180), P('tallPlant', -4.1, 3.0), P('tallPlant', 4.0, -1.2), P('floorLamp', 3.7, 1.6), P('plant', 4.1, 3.0),
    P('pendantLamp', -2.4, -0.6), P('pendantLamp', 0.2, -0.6), P('pendantLamp', 2.0, 1.8)],
});
add(105, 'Orbit Lounge', 'Lounge', 'A quiet station with a view of nothing but stars. Sit down, take your helmet off.', {
  name: 'Orbit Lounge', theme: 'space', view: 'night',
  pieces: [P('consoleDesk', -3.1, -3.05), P('spaceChair', -3.1, -2.0, 180), P('holoGlobe', -0.7, -3.1), P('crystal', 1.0, -3.1), P('oxygenTube', -4.0, 3.0), P('oxygenTube', 4.0, 3.0),
    P('rug', 0.2, 1.4), P('sofa', 0.2, 2.6), P('coffeeTable', 0.2, 1.3), P('capsuleBed', 3.0, 0.2, -90), P('ceilingNeon', -2.0, 0.6, 0, { c: '#5ad8ff' }), P('ceilingNeon', 2.0, 1.6, 0, { c: '#ffb03a' })],
});
add(106, 'Haunted Hollow', 'Spooky', 'A cauldron, a few ghosts and candles that flicker on their own. Not scary, mostly.', {
  name: 'Haunted Hollow', theme: 'halloween', view: 'night',
  pieces: [P('coffinBed', -3.3, 1.9, 90), P('cauldron', 0.4, 0.4), P('pumpkin', -0.5, -3.0), P('bigPumpkin', 3.7, 2.7), P('gravestone', -1.4, 2.8), P('gravestone', -0.2, 3.1), P('gravestone', 1.2, 2.9),
    P('ghost', 1.9, 1.3), P('ghost', -1.6, 0.5), P('candles', -2.2, -2.6), P('candles', 1.6, -2.6), P('candles', 3.9, -0.4), P('witchHat', -3.8, -2.6), P('cobweb', -3.7, -3.5), P('bat', -4.5, 2.2, 90)],
});
add(107, 'The Reading Nook', 'Lounge', 'Shelves to the ceiling, soft lamps, nobody talking. Chat is allowed anyway.', {
  name: 'The Reading Nook', theme: 'studio', wall: { c: '#d8c0a0', pat: 'wainscot' }, floor: { c: '#8a5a3a', pat: 'boards' },
  pieces: [P('bookshelf', -3.8, -3.275), P('bookshelf', -2.5, -3.275), P('bookshelf', -1.2, -3.275), P('bookshelf', 0.2, -3.275), P('bookshelf', -4.275, 0.0, 90), P('bookshelf', -4.275, 1.3, 90), P('bookshelf', -4.275, 2.6, 90),
    P('rug', -0.8, 1.0), P('armchair', -1.8, 1.0, 90), P('armchair', 0.2, 1.0, -90), P('sideTable', -0.8, 1.9), P('tableLamp', -0.8, 1.9, 0, { y: 0.58 }), P('floorLamp', -2.8, 2.6), P('floorLamp', 1.5, 2.6), P('tallPlant', 4.0, 0.2), P('plant', 4.1, 3.0),
    P('pendantLamp', -0.8, 0.0)],
});
add(108, 'Chog Studio', 'Workshop', 'Desks, a kitchenette and a sofa corner. Where people make things together.', {
  name: 'Chog Studio', theme: 'studio', wall: { c: '#e6e0f0', pat: 'plaster' }, floor: { c: '#a89888', pat: 'tiles' },
  pieces: [P('desk', -3.4, -3.05), P('desk', -1.4, -3.05), P('chair', -3.4, -2.2, 180), P('chair', -1.4, -2.2, 180), P('desk', -4.05, 0.3, 90), P('chair', -3.2, 0.3, -90), P('tvUnit', 0.7, -3.225),
    P('rug', 1.3, 1.5), P('sofa', 1.3, 2.7), P('coffeeTable', 1.3, 1.4), P('tallPlant', 4.0, 0.0), P('plant', 4.1, 3.0), P('floorLamp', -4.0, 3.0), P('pendantLamp', -2.4, -1.4), P('pendantLamp', 1.3, 1.5)],
});

// ---------------------------------------------------------------- floor 2
add(201, 'Sunset Terrace', 'Lounge', 'It is always golden hour here. Bean bags, plants and a speaker for the evening.', {
  name: 'Sunset Terrace', theme: 'studio', view: 'evening', wall: { c: '#f4c8a0', pat: 'plaster' }, floor: { c: '#c8a070', pat: 'wood' },
  pieces: [P('rug', -0.2, 0.8), P('sofa', -0.2, -2.4), P('beanbag', -2.4, 1.0), P('beanbag', -1.0, 2.4), P('beanbag', 1.6, 1.2), P('sideTable', 1.8, 2.6), P('speaker', -3.6, -3.2), P('tallPlant', -4.1, 3.0), P('tallPlant', 4.0, 0.2), P('plant', 4.1, 3.0),
    P('floorLamp', -3.8, 0.4), P('floorLamp', 3.6, -1.2), P('pendantLamp', -0.2, 0.8)],
});
add(202, 'Synthwave Garage', 'Arcade', 'Old screens, a boombox and a grid floor. Always 1986 in here.', {
  name: 'Synthwave Garage', theme: 'retro80s', view: 'neon', windows: false,
  pieces: [P('retroTv', -3.9, -3.15), P('retroTv', -2.7, -3.15), P('retroTv', -1.5, -3.15), P('arcadeCab', -0.3, -3.05), P('arcadeCab', 0.7, -3.05), P('boombox', -4.0, -0.2, 90), P('beanbag', -2.4, 0.9), P('beanbag', -0.8, 1.9),
    P('palm', 4.1, 3.0), P('sunPoster', -4.5, 2.4, 90), P('triangleNeon', 0.6, -3.5), P('discoBall', 1.4, 0.8), P('ceilingNeon', -2.0, 0.0, 0, { c: '#ff4ac8' }), P('ceilingNeon', 2.4, 1.8, 0, { c: '#4ae8ff' })],
});
add(203, 'Ghost Kitchen', 'Café', 'A cyberpunk canteen: vending machines, noodles in the air, holograms over the tables.', {
  name: 'Ghost Kitchen', theme: 'cyberpunk', view: 'night', wall: { c: '#3a2a70', pat: 'brick' },
  pieces: [P('kitchen', -3.2, -3.1), P('fridge', -1.45, -3.1), P('vending', -0.2, -3.05), P('vending', 0.9, -3.05), ...set(-1.8, 0.6, 'diningTable', 'gamingChair', 0.5, 0.92), ...set(1.4, 1.0, 'diningTable', 'gamingChair', 0.5, 0.92),
    P('holoScreen', -4.25, 1.2, 90), P('neonOpen', -4.5, 2.8, 90), P('serverRack', 4.0, 0.0, -90), P('ceilingNeon', -1.8, 0.6, 0, { c: '#ff2a98' }), P('ceilingNeon', 1.4, 1.0, 0, { c: '#2ad8ff' })],
});
add(204, 'Sleepover Suite', 'Lounge', 'Beds, bean bags and a TV. Bring snacks.', {
  name: 'Sleepover Suite', theme: 'studio', wall: { c: '#e8d0e8', pat: 'dots' }, floor: { c: '#d8c8b0', pat: 'carpet' },
  pieces: [P('bed', -3.15, -0.2, 90), P('bed', -3.15, 2.2, 90), P('beanbag', -0.4, 1.0), P('beanbag', 0.9, 2.2), P('rug', 0.8, 0.8), P('tvUnit', 0.7, -3.225), P('sideTable', -1.4, -2.7), P('tableLamp', -1.4, -2.7, 0, { y: 0.58 }),
    P('plant', 4.1, 3.0), P('tallPlant', 4.0, 0.0), P('floorLamp', 2.6, 2.8), P('pendantLamp', 0.8, 0.8)],
});

// ---------------------------------------------------------------- checks (same rules as `fits` in js/room.js) and output
let bad = 0;
const warn = (v, m) => { bad++; console.log('  ! ' + v.id + ' ' + v.name + ': ' + m); };
for (const v of V) {
  const th = SPACE.THEMES[v.doc.theme], items = v.doc.pieces, placed = [];
  if (items.length > LIMIT) warn(v, items.length + ' pieces (limit ' + LIMIT + ')');
  for (const it of items) {
    const d = SPACE.PIECES[it.p]; if (!d) { warn(v, 'unknown piece ' + it.p); continue; }
    const rot = Math.round((it.ry || 0) / 90) % 2 !== 0, wall = d.cat === 'wall' || d.fp[1] <= 0.12, flat = d.cat === 'floor' || d.cat === 'ceiling', grp = d.cat === 'ceiling' ? 2 : d.cat === 'floor' ? 1 : 0;
    const hw = (rot ? d.fp[1] : d.fp[0]) / 2, hd = (rot ? d.fp[0] : d.fp[1]) / 2;
    if (wall) {
      const w = rot ? 'x' : 'z', half = d.fp[0] / 2, u = w === 'z' ? it.x : it.z, len = w === 'z' ? W : D;
      if (Math.abs(u) + half > len / 2 + 1e-6) warn(v, it.p + ' outside the wall');
      if (w === 'z' && Math.abs(u - DOOR_U) < half + 0.8) warn(v, it.p + ' blocks the door');
      if (v.doc.windows !== false) for (const win of th.windows || []) if (win.wall === w && Math.abs(u - win.u) < half + win.w / 2 + 0.15) warn(v, it.p + ' in front of a window');
      for (const o of placed) if (o.wall && o.w === w && Math.abs(u - o.u) < half + o.half - 0.02) warn(v, it.p + ' overlaps ' + o.p + ' on the wall');
      placed.push({ p: it.p, wall: true, w, u, half }); continue;
    }
    if (it.x - hw < -W / 2 - 1e-6 || it.x + hw > W / 2 + 1e-6 || it.z - hd < -D / 2 - 1e-6 || it.z + hd > D / 2 + 1e-6) warn(v, it.p + ' at ' + it.x + ',' + it.z + ' is outside the room');
    if (!flat && Math.abs(it.x - DOOR_U) < hw + 0.9 && it.z - hd < -D / 2 + 1.5) warn(v, it.p + ' blocks the way to the door');
    if (!it.y) for (const o of placed) if (!o.wall && o.grp === grp && !o.y && Math.abs(it.x - o.x) < hw + o.hw - 0.02 && Math.abs(it.z - o.z) < hd + o.hd - 0.02) warn(v, it.p + ' overlaps ' + o.p + ' at ' + it.x + ',' + it.z);
    placed.push({ p: it.p, x: it.x, z: it.z, hw, hd, grp, y: it.y });
  }
}
if (bad) { console.log(bad + ' problems, nothing written'); process.exit(1); }

// the room document goes through the server's own cleaner; height (y) is kept for the few stacked lamps because the cleaner drops it for player rooms
const out = V.map(v => {
  const doc = rooms.sanitize(v.doc, LIMIT);
  if (doc.pieces.length !== v.doc.pieces.length) throw new Error(v.id + ': the cleaner dropped pieces');
  doc.pieces.forEach((q, i) => { if (v.doc.pieces[i].y) q.y = v.doc.pieces[i].y; });
  return { id: v.id, no: v.no, floor: v.floor, name: v.name, cat: v.cat, desc: v.desc, by: 'Chog Town', doc };
});
fs.writeFileSync(path.join(__dirname, '..', 'server', 'seed_venues.json'), JSON.stringify(out));
console.log('seed_venues.json:', out.length, 'venues,', out.reduce((n, v) => n + v.doc.pieces.length, 0), 'pieces');
