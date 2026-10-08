'use strict';
// Builds server/room_catalog.json from the game's own data (prototype/js/space_data.js and space.js), so the server accepts exactly the pieces,
// themes, window views and patterns the client knows. Run after changing the catalog:  node tools/build_room_catalog.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'prototype', 'js');
const SPACE = { THEMES: {}, VIEWS: {}, PIECES: {}, LAYOUTS: {} };
vm.runInNewContext(fs.readFileSync(path.join(JS, 'space_data.js'), 'utf8'), { SPACE });

const src = fs.readFileSync(path.join(JS, 'space.js'), 'utf8');
const names = block => {                                                            // the pattern names are the keys of the WALL and FLOOR tables in space.js
  const a = src.indexOf('const ' + block + ' = {'), b = src.indexOf('\n  };', a); if (a < 0 || b < 0) throw new Error('block ' + block + ' not found');
  return [...src.slice(a, b).matchAll(/^ {4}(\w+): \(\) =>/gm)].map(x => x[1]);
};

const WALLED = def => def.cat === 'wall' || def.fp[1] <= 0.12;                      // mounted on a wall (same rule as room.js)
const pieces = {};
for (const [id, d] of Object.entries(SPACE.PIECES)) {
  if (d.kit === 'nft' || d.kit === 'hotel') continue;                                                     // frames need the wallet feed first
  pieces[id] = { fp: d.fp, cat: d.cat, kit: d.kit, wall: WALLED(d), edit: d.parts.some(p => p.t === 'text' && p.edit) };
}
const out = { themes: Object.keys(SPACE.THEMES), views: Object.keys(SPACE.VIEWS), walls: names('WALL'), floors: names('FLOOR'), pieces,
  windows: Object.fromEntries(Object.entries(SPACE.THEMES).map(([k, t]) => [k, (t.windows || []).map(w => ({ wall: w.wall, u: w.u, w: w.w }))])) };
fs.writeFileSync(path.join(__dirname, '..', 'server', 'room_catalog.json'), JSON.stringify(out));
console.log('room_catalog.json:', out.themes.length, 'themes,', Object.keys(pieces).length, 'pieces,', out.walls.length, 'wall and', out.floors.length, 'floor patterns');
