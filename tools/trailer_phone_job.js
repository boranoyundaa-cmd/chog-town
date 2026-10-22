// Run by tools/cdp.js: the phone companion (m.html) at a phone's size, fed a room by tools/phone_mock.js, captured frame by frame like the other shots.
//   node tools/cdp.js tools/trailer_phone_job.js   -> prototype/shots/V17b_phone_%04d.png (860 x 1864)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), FPS = 30;
module.exports = async ({ send, page, eval: ev, shot, wait, vclock, freeze, step }) => {
  const [secs, pre] = [+(process.env.SECS || 3.7), +(process.env.PRE || 1.0)];
  const DOCS = path.join(ROOT, 'server/data/venue_docs'), file = process.env.ROOM || fs.readdirSync(DOCS).find(f => f.endsWith('.json'));   // a room from the local server's data
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/venue_meta', file), 'utf8'));
  const doc = JSON.parse(fs.readFileSync(path.join(DOCS, file), 'utf8')).doc;
  const room = { id: meta.id, no: meta.no, floor: meta.floor, name: meta.name, size: meta.size, levels: 1, locked: false, state: 'open', tier: 0, free: false };
  const guests = [{ name: 'neo', token: 1700, x: -2, z: -1, owner: true }, { name: 'degenmom', token: 561, x: 1.5, z: 0.5 }, { name: 'gmonad', token: 1337, x: 0, z: 2 }, { name: 'wagmi.eth', token: 212, x: 3, z: -2 }, { name: 'nad', token: 999, x: -3.5, z: 2 }];
  await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });
  const late = { name: 'gm.eth', token: 1969, x: 4.5, z: 3 };   // someone walks in while you are away
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__PHONE = ${JSON.stringify({ room, doc, guests, late })};` + fs.readFileSync(path.join(__dirname, 'phone_mock.js'), 'utf8') });
  await vclock();
  await page('http://localhost:8766/m.html?r=' + Date.now());
  let ready = false;
  for (let i = 0; i < 80 && !ready; i++) { await wait(500); ready = await ev('typeof MOB !== "undefined" && !!MOB.room && typeof SPACE !== "undefined" && !!SPACE.group && MOB.guests.size >= 3').catch(() => false); }
  if (!ready) throw new Error('phone did not load: ' + await ev('document.body.innerText.slice(0, 200)').catch(e => e.message));
  await ev('FW *= 0.6; camTarget.y += 0.4; updateCam(), 1');   // closer than the phone's own fit, so the room reads at trailer size
  await wait(1500);
  await freeze();
  const n = Math.round(secs * FPS), p = Math.round(pre * FPS);
  for (let f = -p; f < n; f++) { await step(); if (f >= 0 && (!process.env.PEEK || f === 0 || f === n - 1)) await shot(`V17b_phone_${String(f + 1).padStart(4, '0')}.png`); }
  console.log('V17b_phone', n, 'frames');
};
