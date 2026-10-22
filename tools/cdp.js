// A tiny DevTools-protocol driver for Edge: captures the game page with its HTML interface (the trailer's interface shots; the 3D-only shots use prototype/trailer.js).
// node tools/cdp.js <script.js>   - the script exports async ({ eval, shot, wait, page }) => {...}; frames go to prototype/shots/
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), http = require('http');
const WebSocket = require(path.join(__dirname, '..', 'server', 'node_modules', 'ws'));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', PORT = +process.env.CDP_PORT || 9333;
const PROFILE = path.join(process.env.TEMP || '.', 'chog-cdp-profile' + (process.env.CDP_PORT ? '-' + process.env.CDP_PORT : '')), SHOTS = path.join(__dirname, '..', 'prototype', 'shots');
const getJSON = url => new Promise((res, rej) => http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej));
const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const head = process.argv.includes('--show') ? [] : ['--headless=new'];
  const edge = spawn(EDGE, [...head, `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--window-size=1920,1080', '--force-device-scale-factor=1', '--hide-scrollbars',
    '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11', '--force_high_performance_gpu', '--autoplay-policy=no-user-gesture-required', '--mute-audio', ...(process.env.EDGE_FLAGS ? process.env.EDGE_FLAGS.split(' ') : []), 'about:blank'], { stdio: 'ignore' });
  let list; for (let i = 0; i < 40 && !list; i++) { await wait(250); list = await getJSON(`http://127.0.0.1:${PORT}/json/list`).catch(() => null); }
  const tab = list.find(t => t.type === 'page'); const ws = new WebSocket(tab.webSocketDebuggerUrl, { maxPayload: 512 * 1024 * 1024 });
  await new Promise(r => ws.on('open', r));
  let id = 0; const pending = new Map();
  const waiters = [];
  ws.on('message', m => { const j = JSON.parse(m); if (j.id && pending.has(j.id)) { const p = pending.get(j.id); pending.delete(j.id); j.error ? p.rej(new Error(j.error.message)) : p.res(j.result); }
    else if (j.method) for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].name === j.method) { waiters[i].res(j.params); waiters.splice(i, 1); } });
  const event = name => new Promise(res => waiters.push({ name, res }));
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  const api = {
    send, wait, event,
    // virtual time: the page's clocks (timers, requestAnimationFrame, CSS animations, performance.now) only move when told to; tick() moves them one frame
    pause: () => send('Emulation.setVirtualTimePolicy', { policy: 'pause' }),
    tick: async (ms = 1000 / 30) => { const e = event('Emulation.virtualTimeBudgetExpired'); await send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms }); await e; },
    // our own clock (tools/vclock.js): call before page(); then freeze() once the scene is set and step() per frame
    vclock: () => send('Page.addScriptToEvaluateOnNewDocument', { source: fs.readFileSync(path.join(__dirname, 'vclock.js'), 'utf8') }),
    freeze: () => api.eval('__vt.freeze()'),
    step: (ms = 1000 / 30) => api.eval(`__vt.tick(${ms})`),
    page: async url => { await send('Page.navigate', { url }); await wait(1500); },
    eval: async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text); return r.result.value; },
    shot: async name => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, optimizeForSpeed: true }); fs.writeFileSync(path.join(SHOTS, name), Buffer.from(r.data, 'base64')); },
  };
  try { await require(path.resolve(process.argv[2]))(api); } finally { ws.close(); edge.kill(); }
}
main().catch(e => { console.error(e); process.exit(1); });
