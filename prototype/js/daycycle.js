// ===== daycycle: lighting that follows the real clock =====
// Dawn and dusk are the warm golden look, midday is the bright pastel look, night is the neon-dusk look; keyframes blend smoothly in between.
// The world registers what changes with the hour: window instances (lit or dark), lamp and neon glows, point lights.
// Modes: 'real' (the player's own clock) or 'fixed' (DAY.fixedHour, from Settings or ?hour=). Loaded after core.js, before the world.
const DAY = { mode: 'real', fixedHour: 14, hour: 12, n: 0, lamp: 0, windowSets: [], glows: [], lights: [], hour0: null };
(function () {
  const C = h => new THREE.Color(h);
  const K = o => ({ sky: o.sky.map(C), fog: C(o.fog), hemiC: C(o.hemi[0]), hemiG: C(o.hemi[1]), hemiI: o.hemi[2], sunC: C(o.sun[0]), sunI: o.sun[1], rimC: C(o.rim[0]), rimI: o.rim[1], n: o.n, lit: o.lit, off: new THREE.Vector3(...o.off), moon: o.moon || 0, stars: o.stars || 0 });
  const KEYS = {
    night:  K({ sky: ['#120a30', '#381568', '#a52a74', '#e0705a'], fog: 0x4a1d6e, hemi: [0x6a58d0, 0x30224a, 0.34], sun: [0x9a8cf0, 0.3], rim: [0xff5aa8, 0.22], n: 1, lit: 0.8, off: [-11, 10, 6], moon: 1, stars: 1 }),
    dawn:   K({ sky: ['#4a5aa8', '#f09aa6', '#ffd0a0', '#fff0c8'], fog: 0xf0b0a0, hemi: [0xb0b4ff, 0x9a7a70, 0.4], sun: [0xffb890, 0.6], rim: [0x9ab0ff, 0.16], n: 0.3, lit: 0.32, off: [-11, 9, 6], stars: 0.2 }),
    golden: K({ sky: ['#5d4f9c', '#e0807f', '#ffc27c', '#ffe3a8'], fog: 0xf0a888, hemi: [0xb7a3ff, 0x8c6a5c, 0.42], sun: [0xffc88a, 0.68], rim: [0x8e78ff, 0.16], n: 0.12, lit: 0.2, off: [-11, 10, 6] }),
    day:    K({ sky: ['#3f8fe0', '#7dbdf2', '#b8dcf8', '#e3f3ff'], fog: 0xcfe6fb, hemi: [0xbcd6f6, 0x9a8f86, 0.4], sun: [0xffeccc, 0.58], rim: [0x9db4f0, 0.1], n: 0, lit: 0.07, off: [-6, 16, 5] }),
    dusk:   K({ sky: ['#2a1c6a', '#b24a84', '#ff7a6a', '#ffb070'], fog: 0xc07090, hemi: [0x9a86ff, 0x6a4a60, 0.44], sun: [0xff9a70, 0.42], rim: [0xff5aa8, 0.24], n: 0.72, lit: 0.6, off: [-11, 8, 6], stars: 0.35 }),
  };
  const SCHED = [[0, 'night'], [5.0, 'night'], [6.0, 'dawn'], [7.3, 'golden'], [9.2, 'day'], [15.8, 'day'], [17.4, 'golden'], [19.0, 'dusk'], [20.6, 'night'], [24, 'night']];
  const S = { sky: [C(0), C(0), C(0), C(0)], fog: C(0), hemiC: C(0), hemiG: C(0), hemiI: 0, sunC: C(0), sunI: 0, rimC: C(0), rimI: 0, n: 0, lit: 0, off: new THREE.Vector3(), moon: 0, stars: 0 };
  const lerp = (a, b, t) => a + (b - a) * t, smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function blend(h) {
    let i = 0; while (i < SCHED.length - 2 && h >= SCHED[i + 1][0]) i++;
    const [h0, k0] = SCHED[i], [h1, k1] = SCHED[i + 1], t = smooth(0, 1, (h - h0) / (h1 - h0)), a = KEYS[k0], b = KEYS[k1];
    for (let j = 0; j < 4; j++) S.sky[j].copy(a.sky[j]).lerp(b.sky[j], t);
    S.fog.copy(a.fog).lerp(b.fog, t); S.hemiC.copy(a.hemiC).lerp(b.hemiC, t); S.hemiG.copy(a.hemiG).lerp(b.hemiG, t); S.sunC.copy(a.sunC).lerp(b.sunC, t); S.rimC.copy(a.rimC).lerp(b.rimC, t);
    S.hemiI = lerp(a.hemiI, b.hemiI, t); S.sunI = lerp(a.sunI, b.sunI, t); S.rimI = lerp(a.rimI, b.rimI, t); S.n = lerp(a.n, b.n, t); S.lit = lerp(a.lit, b.lit, t);
    S.moon = lerp(a.moon, b.moon, t); S.stars = lerp(a.stars, b.stars, t); S.off.copy(a.off).lerp(b.off, t);
  }

  // sky: one canvas texture, repainted when the hour has moved enough
  const skyCv = document.createElement('canvas'); skyCv.width = 4; skyCv.height = 256;
  const skyTex = new THREE.CanvasTexture(skyCv); scene.background = skyTex;
  function paintSky() { const g = skyCv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); [0, 0.42, 0.78, 1].forEach((s, i) => gr.addColorStop(s, '#' + S.sky[i].getHexString())); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); skyTex.needsUpdate = true; }

  // stars: screen-fixed points on the camera, fading in at dusk
  const starGeo = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 90; i++) { sp.push((Math.random() - 0.5) * 26 * 1.9, 1.5 + Math.random() * 5.8, -118); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 5, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  stars.userData.noNormal = true; stars.frustumCulled = false; cam.add(stars);

  // window instances: each has its own random threshold, so the number of lit windows grows smoothly with S.lit
  const warm = C(0xffd27a), cool = C(0x9adcff), dayGlass = [C(0x6fb6e4), C(0x9ccdf2)], nightGlass = [C(0x26467a), C(0x3a62a0)], tmp = C();
  let lastLit = -1, lastN = -1;
  function paintWindows(force) {
    if (!force && Math.abs(S.lit - lastLit) < 0.008 && Math.abs(S.n - lastN) < 0.008) return; lastLit = S.lit; lastN = S.n;
    for (const set of DAY.windowSets) {
      for (let i = 0; i < set.flags.length; i++) {
        const f = set.flags[i]; if (f.r < S.lit) tmp.copy(f.cool ? cool : warm).multiplyScalar(0.92 + f.v * 0.16); else tmp.copy(dayGlass[f.g]).lerp(nightGlass[f.g], S.n);
        set.mesh.setColorAt(i, tmp);
      }
      set.mesh.instanceColor.needsUpdate = true;
    }
  }
  DAY.addWindows = (mesh, flags) => { DAY.windowSets.push({ mesh, flags }); paintWindows(true); };
  DAY.glow = (sprite, base) => { DAY.glows.push({ s: sprite, base }); };                 // opacity follows lamp/neon switching
  DAY.light = (light, base) => { DAY.lights.push({ l: light, base }); };

  const clock = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };
  DAY.setMode = (mode, hour) => { DAY.mode = mode; if (hour !== undefined) DAY.fixedHour = hour; DAY.dirty = true; };
  let lastSky = -99;
  DAY.tick = function () {
    if (DAY.paused) return;                                                       // inside a space only its placed lights count; space.js draws the window view (background only)
    const h = DAY.mode === 'real' ? clock() : DAY.fixedHour; DAY.hour = h; blend(h);
    if (Math.abs(h - lastSky) > 0.004 || DAY.dirty) { lastSky = h; DAY.dirty = false; paintSky(); }
    scene.fog.color.copy(S.fog); hemi.color.copy(S.hemiC); hemi.groundColor.copy(S.hemiG); hemi.intensity = S.hemiI; sun.color.copy(S.sunC); sun.intensity = S.sunI; rim.color.copy(S.rimC); rim.intensity = S.rimI;
    SUN_OFF.copy(S.off); DAY.n = S.n; DAY.lamp = smooth(0.1, 0.6, S.n);
    for (const g of DAY.glows) g.s.material.opacity = g.base * DAY.lamp;
    for (const l of DAY.lights) l.l.intensity = l.base * DAY.lamp;
    paintWindows(false);
    // sun disc by day, moon by night (same screen spot); stars fade in with the dark
    const sunVis = 1 - S.moon;
    sunSprites.forEach(([s, base], i) => { s.visible = true; s.material.color.set(i === 0 ? (S.moon > 0.5 ? 0xb8b0ff : 0xffd890) : (S.moon > 0.5 ? 0xf4f0ff : 0xfff2cc)); s.material.opacity = i === 0 ? lerp(0.7 * sunVis + 0.12, 0.55, S.moon) : lerp(0.9 * Math.max(0.35, sunVis), 0.95, S.moon); });
    stars.material.opacity = S.stars * 0.9; stars.scale.setScalar(FW / 26);
  };
  DAY.pause = () => { DAY.paused = true; stars.material.opacity = 0; };
  DAY.resume = () => { DAY.paused = false; DAY.dirty = true; scene.background = skyTex; DAY.tick(); };
  animated.push(() => DAY.tick());
  const qh = new URLSearchParams(location.search).get('hour'); if (qh !== null) DAY.setMode('fixed', +qh);
  else { try { const m = JSON.parse(localStorage.getItem('chog_time') || 'null'); if (m && m.mode === 'fixed') DAY.setMode('fixed', +m.hour || 14); } catch (e) { /* ignore */ } }
  DAY.tick();
})();
