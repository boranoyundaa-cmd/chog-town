// One shot of tools/trailer_capture.js, run by tools/cdp.js: set the scene up in real time, then pause the page's clock and capture frame by frame.
const FPS = 30;
module.exports = async ({ page, eval: ev, shot, wait, vclock, freeze, step }) => {
  const [name, secs, scene, pre = 0, actions = [], opts = {}] = JSON.parse(process.argv[3]);
  await vclock();
  await page('http://localhost:8766/?res=1920x1080&pc=1&hour=18&r=' + Date.now());
  let ready = false;
  for (let i = 0; i < 90 && !ready; i++) { await wait(500); ready = await ev('!!window.__ready && typeof NET !== "undefined" && NET.status === "online"').catch(() => false); }
  if (!ready) throw new Error('the game did not load: ' + await ev('document.title + " " + typeof GAME').catch(e => e.message));
  await wait(2500);
  await ev(`new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/trailer3.js?' + Date.now(); s.onload = res; s.onerror = rej; document.head.appendChild(s); })`);
  await ev(`TRV.scene(${JSON.stringify(scene)}, ${JSON.stringify(opts)})`);
  await wait(400);
  await freeze();
  await ev(`TRV.zero(${pre})`);
  const n = Math.round(secs * FPS), p = Math.round(pre * FPS), acts = new Map(); for (const [f, js] of actions) acts.set(f, (acts.get(f) || []).concat(js));
  for (let f = -p; f < n; f++) {
    for (const js of acts.get(f) || []) await ev(js);
    const t0 = Date.now(); await step(); const t1 = Date.now();
    if (f >= 0 && (!process.env.PEEK || f === 0 || f === n - 1 || f === (n >> 1))) await shot(`${name}_${String(f + 1).padStart(4, '0')}.png`);
    if (process.env.TIMING) console.log(f, 'tick', t1 - t0, 'shot', Date.now() - t1);   // PEEK=1: first, middle and last frame only
  }
  console.log(name, n, 'frames');
};
