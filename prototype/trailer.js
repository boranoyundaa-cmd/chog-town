// ===== trailer: renders cinematic shots frame by frame to shots/ (not shipped; build_site.py copies js/ only) =====
// Load in the game page (index.html?res=1920x1080&hour=18): await import('/trailer.js') or a <script> tag, then TR.setup() and await TR.shot(...).
// Every frame: the camera is placed by the shot, the world advances by 1/30 s (residents on NPC.override), the canvas is saved as shots/<name>_0001.png.
(function () {
  const TR = window.TR = { fps: 30, t: 0 };
  let style = null;
  TR.setup = function (o = {}) {
    if (!style) { style = document.createElement('style'); document.head.appendChild(style); }
    style.textContent = o.ui ? '' : 'body > *:not(canvas) { display: none !important; }';
    if (GAME.me) GAME.me.visible = !!o.me; if (GAME.ring) GAME.ring.visible = !!o.me; if (GAME.mark) GAME.mark.visible = false;
    GAME.cine = () => true;                                                        // the shot owns the camera
    window.__hold = true;                                                          // the game's own loop stops: time moves only with the frames (main.js frame())
    DAY.setMode('fixed', o.hour ?? 18); TR.t = (o.hour ?? 18) * 3600; NPC.override = TR.t; NPC.dirty = true;
  };
  TR.cam = function (x, z, fw, yaw = 0, ty = 1.1) {                                 // target on the ground, visible width, yaw around the iso direction (radians)
    const a = Math.PI / 4 + yaw; CAM_DIR.set(Math.sin(a) * Math.SQRT2, 1, Math.cos(a) * Math.SQRT2).normalize();
    camTarget.set(x, ty, z); FW = fw; updateCam();
  };
  const post = (name, b) => Promise.race([fetch('/save?name=' + name, { method: 'POST', body: b }).then(r => r.ok, () => new Promise(r => setTimeout(() => r(false), 500))), new Promise(r => setTimeout(() => r(false), 15000))]);   // a refused or dropped POST counts as a miss and is sent again
  const toBlobSync = () => { const u = renderer.domElement.toDataURL('image/png'), bin = atob(u.slice(u.indexOf(',') + 1)), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: 'image/png' }); };
  const save = async name => { const b = toBlobSync(); for (let i = 0; i < 12; i++) { if (await post(name, b)) return; await new Promise(r => setTimeout(r, 500 * (i + 1))); } throw new Error('could not save ' + name); };   // toDataURL is synchronous (toBlob never called back once on a hidden page); a POST that fails is sent again, waiting longer each time
  TR.have = new Set();                                                             // frames already on disk (TR.resume() reads shots/): rendered for continuity, not saved again
  TR.resume = async () => { const h = await (await fetch('/shots/')).text(); TR.have = new Set([...h.matchAll(/href="(T\d+_[^"]+\.png)"/g)].map(m => m[1])); return TR.have.size; };
  const ease = u => u * u * (3 - 2 * u);
  TR.ease = ease; TR.lerp = (a, b, u) => a + (b - a) * u;
  // shot(name, seconds, fn): fn(u, k) places the camera (u = 0..1 eased by the caller if wanted); o.hour0/o.hour1 sweep the time of day
  // extras: real tokens placed for a shot. spots: [[x, z, ry], ...]; mode 'dance' | 'idle' | 'cheer'. TR.clear() removes them.
  TR.ticks = []; TR.extras = [];
  TR.crowd = function (ids, spots, mode = 'dance') {
    const out = [];
    ids.forEach((id, i) => {
      const s = spots[i % spots.length], c = chogFromTraits(traitsFor(id), { scale: CHOG_SCALE });
      c.position.set(s[0], s[3] || 0, s[1]); c.rotation.y = s[2] || 0; scene.add(c); TR.extras.push(c); out.push(c);
      const ph0 = i * 1.7, u = c.userData;
      TR.ticks.push(t => {
        const ph = t * (mode === 'dance' ? 7.5 : 2) + ph0, sw = Math.sin(ph);
        if (mode === 'dance') { u.body.position.y = Math.abs(sw) * 0.08; u.head.position.y = 1.0 + Math.abs(sw) * 0.1; u.arms[0].rotation.z = -2.4 - sw * 0.5; u.arms[1].rotation.z = 2.4 + sw * 0.5; u.legs[0].rotation.x = sw * 0.3; u.legs[1].rotation.x = -sw * 0.3; c.rotation.y = (s[2] || 0) + Math.sin(t * 1.3 + ph0) * 0.5; }
        else if (mode === 'cheer') { u.arms[1].rotation.z = 2.7 + Math.sin(ph * 3) * 0.3; u.body.position.y = Math.abs(Math.sin(ph * 2)) * 0.05; }
        else { const b = Math.sin(ph) * 0.015; u.body.position.y = b; u.head.position.y = 1.0 + b * 1.4; }
        const blink = Math.sin(t * 0.9 + ph0 * 5) > 0.985 ? 0.12 : 1; u.eyes.forEach(e => e.scale.y = (e.userData.by || 0.095) * blink);
      });
    });
    return out;
  };
  TR.clear = () => { for (const c of TR.extras) scene.remove(c); TR.extras = []; TR.ticks = []; };
  let clockT = 0;
  TR.shot = async function (name, secs, fn, o = {}) {
    const n = Math.round(secs * TR.fps), dt = 1 / TR.fps;
    const ks = TR.preview ? [0, Math.floor(n / 2), n - 1] : null;
    const realNow = performance.now.bind(performance); let virt = realNow();          // whatever reads performance.now (Lev's idle, blinking props) sees frame time too
    performance.now = () => virt;
    try {
    for (let k = 0; k < n; k++) {
      if (ks && !ks.includes(k)) { TR.t += dt * (o.timeScale || 1); clockT += dt; continue; }
      const u = n > 1 ? k / (n - 1) : 0;
      if (o.hour0 !== undefined) DAY.fixedHour = TR.lerp(o.hour0, o.hour1, o.easeHour ? ease(u) : u) % 24;
      TR.t += dt * (o.timeScale || 1); NPC.override = TR.t % 86400;                     // time first, so a camera that follows a resident sees where it is in this frame
      fn(u, k); clockT += dt; for (const f of TR.ticks) f(clockT);
      step(1, dt); if (o.after) o.after();
      virt += dt * 1000;
      const file = name + '_' + String(k + 1).padStart(4, '0') + '.png'; if (!o.dry && !TR.have.has(file)) await save(file);
    }
    } finally { performance.now = realNow; }
    return n;
  };
})();
