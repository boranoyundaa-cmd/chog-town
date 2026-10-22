// Captures the trailer's shots with Edge (tools/cdp.js) and virtual time: one fresh browser per shot, the scene from prototype/trailer3.js, one PNG per frame
// with the game's own interface where the scene keeps it. Inputs (keys, clicks) are sent at given frames, like a player would.
//   node tools/trailer_capture.js [shot ...]      (no names: every shot)       frames -> prototype/shots/V<nn>_<name>_0001.png
const { spawnSync } = require('child_process'), path = require('path'), fs = require('fs');
const FPS = 30, BEAT = 60 / 92.3, SH = path.join(__dirname, '..', 'prototype', 'shots');
const URL = 'http://localhost:8766/?res=1920x1080&pc=1&hour=18';

// name, seconds, scene, pre-roll seconds (ticked, not saved), actions [frame, js] run in the page before that frame is captured
const key = code => `(() => { const code = ${JSON.stringify(code)}; for (const t of ['keydown', 'keyup']) dispatchEvent(new KeyboardEvent(t, { code, key: code === 'Space' ? ' ' : code.replace(/^Key|^Digit/, '').toLowerCase(), bubbles: true })); return 1; })()`;
const at = s => Math.round(s * FPS);
// presses Start, then hits every note on time (most PERFECT, a few GOOD), as a good player would
const RHYTHM_BOT = `(() => { const b = [...document.querySelectorAll('#gm button')].find(b => /Start/.test(b.textContent)); if (b) b.click();
  let k = 0; const iv = setInterval(() => { const R = GAMES.rhythmProbe; if (!R || R.state() !== 'play') return; const now = R.now();
    for (const n of R.notes()) if (!n.st && !n.bot && now >= n.t + ((k * 37) % 5 === 0 ? 0.09 : 0.01)) { n.bot = 1; k++; R.hit(n.lane); } }, 8); return !!b; })()`;
const SHOTS = [
  ['V01_open', 5.21, 'open'],
  ['V02_street', 3.27, 'street'],
  ['V03_rise', 4.57, 'rise'],
  ['V04_lev', 4.56, 'lev', 0.2],
  ['V05_room', 5.87, 'room', 0.3],
  ['V05a_decor', 1.4, 'decor', 0.2, [], { layout: 'cafe', fill: 1.1 }],          // "Decorate it."
  ['V05b_lock', 1.4, 'lockdoor', 0.2, [], { no: 405, at: 0.35 }],              // "Lock it.": the plate turns on the word
  ['V05c_party', 3.35, 'party', 0.3, [], { layout: 'garage' }],                 // "Throw a party in it."
  ['V06_locals', 4.57, 'locals', 0.4],
  ['V07_great', 1.95, 'great', 0.4, [], { yaw: -1.2 }],
  ['V08_notgreat', 1.97, 'notgreat', 0.4, [], { yaw: -0.6 }],
  ['V09_club', 3.91, 'club', 0.3],
  ['V10_stack', 1.38, 'games', 1.2, [[-36, 'GAMES.play("stack"), 1'], [-13, key('Space')], [8, key('Space')], [28, key('Space')]]],   // drops where each suitcase lines up (115 px at 150 + 11 px/s per floor)
  ['V11_rhythm', 1.38, 'games', 24, [[-720, 'GAMES.play("rhythm"), 1'], [-712, RHYTHM_BOT]]],
  ['V12_rps', 1.38, 'rps', 1.6, [[at(0.15), `(() => { const b = [...document.querySelectorAll('#gm button')].find(b => /Rock/.test(b.textContent)); if (b) b.click(); return !!b; })()`]]],
  ['V13_c4', 1.38, 'c4', 1.6, [[-20, key('Digit4')], [at(0.35), key('Digit3')], [at(1.0), key('Digit5')]]],
  ['V14_hodler', 1.96, 'say', 0.3, [], { id: 'hodler', place: 'parkA', hour: 15, text: 'I AM HODLING.' }],
  ['V15_jeet', 1.96, 'say', 0.3, [], { id: 'jeet', place: 'c5', hour: 13, text: 'Up 2x? Sold.' }],
  ['V16_doom', 1.96, 'say', 0.3, [], { id: 'doombear', place: 'pz1', hour: 21.5, text: "It's over." }],
  ['V17_timelapse', 4.9, 'timelapse'],
  ['V18_finale', 4.88 + 3.0, 'finale'],
];

const only = process.argv.slice(2);
const todo = SHOTS.filter(s => !only.length || only.includes(s[0]) || only.includes(s[2]));
fs.writeFileSync(path.join(SH, 'v_job.json'), JSON.stringify(todo));
const job = path.join(__dirname, 'trailer_capture_job.js');
for (const s of todo) {
  console.log('shot', s[0]);
  let ok = false;
  for (let i = 0; i < 3 && !ok; i++) ok = spawnSync(process.execPath, [path.join(__dirname, 'cdp.js'), job, JSON.stringify(s)], { stdio: 'inherit' }).status === 0;   // a page that loads slowly gets another go
  if (!ok) { console.log('failed', s[0]); process.exit(1); }
}
