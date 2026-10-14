'use strict';
// Builds server/seed_venues.json: the venues the game itself puts in the Chog Hotel (so the first floors are never empty).
// Each venue is a ready-made room (prototype/js/space_layouts.js) laid out for a tier 1 floor (22 x 16 m), served to visitors like any holder's room. Four to a floor: 101..104, 201..204, 301..304.
// The same ready-made rooms are what the room editor offers every player. Run after changing a layout or the catalog:
//   node tools/build_room_catalog.js && node tools/check_layouts.js && node tools/build_seed_venues.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'prototype', 'js');
const SPACE = { THEMES: {}, VIEWS: {}, PIECES: {}, LAYOUTS: {} };
for (const f of ['space_data.js', 'space_layouts.js']) vm.runInNewContext(fs.readFileSync(path.join(JS, f), 'utf8'), { SPACE });
const rooms = require('../server/rooms');
const SIZE = [22, 16], LIMIT = 200, LIGHTS = 16;                                  // tier 1 (server/hotel.js TEMPLATES)

// [number, ready-made room, name, kind, listing text]
const V = [
  [101, 'cafe', 'Moka Corner', 'Café', 'Coffee, quiet tables and a counter. Say hi to whoever sits next to you.'],
  [102, 'club', 'NOVA After Dark', 'Club', 'The neon room. Lights are the whole point here: place a few and watch the mood change.'],
  [103, 'arcade', 'Pixel Palace', 'Arcade', 'Cabinets in rows and a high-score wall. Come break a record.'],
  [104, 'gallery', 'Gallery One', 'Gallery', 'A white room with a few pictures and a lot of quiet. A good place to look at things.'],
  [201, 'orbit', 'Orbit Lounge', 'Lounge', 'A quiet station with a view of nothing but stars. Sit down, take your helmet off.'],
  [202, 'haunted', 'Haunted Hollow', 'Spooky', 'A cauldron, a few ghosts and candles that flicker on their own. Not scary, mostly.'],
  [203, 'library', 'The Reading Nook', 'Lounge', 'Shelves to the ceiling, soft lamps, nobody talking. Chat is allowed anyway.'],
  [204, 'studio', 'Chog Studio', 'Workshop', 'Desks, a kitchenette and a sofa corner. Where people make things together.'],
  [301, 'terrace', 'Sunset Terrace', 'Lounge', 'It is always golden hour here. Bean bags, plants and a speaker for the evening.'],
  [302, 'garage', 'Synthwave Garage', 'Arcade', 'Old screens, a boombox and a grid floor. Always 1986 in here.'],
  [303, 'canteen', 'Ghost Kitchen', 'Café', 'A cyberpunk canteen: vending machines, noodles in the air, holograms over the tables.'],
  [304, 'sleepover', 'Sleepover Suite', 'Lounge', 'Beds, bean bags and a TV. Bring snacks.'],
];

let bad = 0;
const out = V.map(([no, ready, name, cat, desc]) => {
  const R = SPACE.READY[ready]; if (!R) throw new Error('no ready-made room ' + ready);
  const doc = Object.assign(R.make(SIZE[0], SIZE[1], {}), { name });
  const r = SPACE.checkDoc(doc, SIZE[0], SIZE[1], { limit: LIMIT, lights: LIGHTS });
  for (const m of r.bad) { bad++; console.log('  ! ' + no + ' ' + name + ': ' + m); }
  const clean = rooms.sanitize(doc, LIMIT, SIZE);                                  // through the server's own cleaner, exactly what a player's save goes through
  if (clean.pieces.length !== doc.pieces.length) throw new Error(no + ': the cleaner dropped pieces');
  clean.pieces.forEach((q, i) => { const d = doc.pieces[i]; if (Math.abs(q.x - d.x) > 0.011 || Math.abs(q.z - d.z) > 0.011) throw new Error(no + ': the cleaner moved ' + q.p + ' (' + d.x + ',' + d.z + ' -> ' + q.x + ',' + q.z + ')'); });
  return { id: 'v' + no, no, floor: Math.floor(no / 100), name, cat, desc, by: 'Chog Hotel', size: SIZE, doc: clean };
});
if (bad) { console.log(bad + ' problems, nothing written'); process.exit(1); }
fs.writeFileSync(path.join(__dirname, '..', 'server', 'seed_venues.json'), JSON.stringify(out));
try { fs.writeFileSync(path.join(__dirname, '..', 'prototype', 'shots', 'seed_preview.json'), JSON.stringify(out)); } catch (e) { /* the preview copy is only for space.html?seed= */ }
console.log('seed_venues.json:', out.length, 'venues,', out.reduce((n, v) => n + v.doc.pieces.length, 0), 'pieces');
