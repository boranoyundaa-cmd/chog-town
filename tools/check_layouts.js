'use strict';
// Checks every ready-made room (prototype/js/space_layouts.js) at every room size the game has, with the rules of the room editor plus "nothing floats, nothing hides".
// Run after changing a layout or the catalog:  node tools/check_layouts.js          (exit 1 on any problem)
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'prototype', 'js');
const SPACE = { THEMES: {}, VIEWS: {}, PIECES: {}, LAYOUTS: {} };
for (const f of ['space_data.js', 'space_layouts.js']) vm.runInNewContext(fs.readFileSync(path.join(JS, f), 'utf8'), { SPACE });
// size, piece budget, light budget: the free Home, then the four tiers (server/hotel.js TEMPLATES, server/rooms.js LIMITS)
const SIZES = [['Home', [13, 10], 80, 10, false], ['tier 1', [15, 11], 120, 12, false], ['tier 2', [18, 13], 180, 14, false], ['tier 3', [18, 13], 160, 14, true], ['tier 4', [22, 15], 200, 16, true]];   // the last flag: a room with an upper level has stairs
let bad = 0;
for (const id of Object.keys(SPACE.READY)) for (const [label, [W, D], limit, lights, stairs] of SIZES) {
  const doc = SPACE.READY[id].make(W, D, { stairs }), r = SPACE.checkDoc(doc, W, D, { limit, lights, stairs });
  for (const m of r.bad) { bad++; console.log('  ! ' + id + ' @ ' + label + ' ' + W + 'x' + D + ': ' + m); }
  if (process.argv.includes('-v')) console.log(id.padEnd(10), label.padEnd(7), String(doc.pieces.length).padStart(3), 'pieces', String(r.lights).padStart(2), 'lights');
}
console.log(bad ? bad + ' problems' : 'all ' + Object.keys(SPACE.READY).length + ' ready-made rooms pass at every size');
process.exit(bad ? 1 : 0);
