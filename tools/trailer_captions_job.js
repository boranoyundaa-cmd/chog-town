// Run by tools/cdp.js: draws the trailer's captions (each with 1..n words showing) and the title card in the game's font, from prototype/shots/cap_spec.json
// (python tools/edit_trailer3.py spec), into prototype/shots/cap_<line>_<words>.png and cap_title.png.
const fs = require('fs'), path = require('path');
const SH = path.join(__dirname, '..', 'prototype', 'shots');
module.exports = async ({ page, eval: ev, send }) => {
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await page('http://localhost:8766/trailer_captions.html');
  await ev('CAP.ready');
  const save = (name, url) => fs.writeFileSync(path.join(SH, name), Buffer.from(url.split(',')[1], 'base64'));
  for (const c of JSON.parse(fs.readFileSync(path.join(SH, 'cap_spec.json'), 'utf8'))) {
    const n = await ev(`CAP.words(${JSON.stringify(c.text.replace(/\|/g, ' '))}).length`);
    for (let k = 1; k <= n; k++) save(`cap_${c.i}_${k}.png`, await ev(c.place === 'left' ? `CAP.renderLeft(${JSON.stringify(c.text)}, ${k})` : `CAP.render(${JSON.stringify(c.text)}, ${k}, ${JSON.stringify(c.place)})`));
  }
  save('cap_title.png', await ev('CAP.title()'));
  console.log('captions done');
};
