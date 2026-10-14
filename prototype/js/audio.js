// Chog Hotel audio: everything is synthesized with WebAudio, no files, no libraries.
// One global: AUDIO. All internals live inside the IIFE below.
var AUDIO = (function () {
  'use strict';
  const STORE_KEY = 'chog_audio';
  const LOOKAHEAD = 0.1;
  const TICK_MS = 25;

  let AC = null, failed = false, gestured = false;
  let busMaster, busComp, busMusic, busSfx, revMusicIn, revSfxIn, noiseBuf;
  let SFXO = null;
  let timer = null;
  let players = [];          // live music players (current + fading out)
  let curPlace = null;       // currently playing place player
  let wantPlace = null;      // requested place id (applied once ctx exists)
  let trackPl = null;        // rhythm track player
  const sfxLast = {};
  const st = { master: 0.8, music: 0.35, sfx: 0.8, muted: false };

  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      ['master', 'music', 'sfx'].forEach(function (k) {
        if (typeof o[k] === 'number' && o[k] >= 0 && o[k] <= 1) st[k] = o[k];
      });
      st.muted = !!o.muted;
    }
  } catch (e) { /* ignore */ }

  function save() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (e) { /* ignore */ }
  }

  // ---------- helpers ----------
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function hs(n, s) { const x = Math.sin(n * 12.9898 + (s || 0) * 78.233) * 43758.5453; return x - Math.floor(x); }
  function bassFold(m) { while (m > 47) m -= 12; while (m < 34) m += 12; return m; }
  const CHT = {
    maj: [0, 4, 7, 12], m: [0, 3, 7, 12], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14],
    maj7: [0, 4, 7, 11, 14], m7: [0, 3, 7, 10, 14], d7: [0, 4, 7, 10, 14], sus: [0, 5, 7, 12]
  };
  function ch(root, type) { return { r: root, n: CHT[type].map(function (x) { return root + x; }) }; }

  // ---------- voices ----------
  // o = { out: AudioNode, rev: AudioNode }
  function vTone(o, t, p) {
    const osc = AC.createOscillator();
    osc.type = p.type || 'sine';
    osc.frequency.setValueAtTime(p.f, t);
    if (p.f2) osc.frequency.exponentialRampToValueAtTime(p.f2, t + (p.fd || p.dur));
    if (p.det) osc.detune.value = p.det;
    const g = AC.createGain();
    const atk = p.atk || 0.005, dur = p.dur, vol = p.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    let end;
    if (p.hold) {
      const rel = p.rel || 0.3;
      g.gain.setValueAtTime(vol, t + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
      end = t + dur + rel;
    } else {
      g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dur);
      end = t + atk + dur;
    }
    let last = osc;
    if (p.lp) {
      const bq = AC.createBiquadFilter();
      bq.type = 'lowpass'; bq.frequency.value = p.lp; bq.Q.value = p.q || 0.7;
      osc.connect(bq); last = bq;
    }
    last.connect(g); g.connect(o.out);
    if (p.send) { const s = AC.createGain(); s.gain.value = p.send; g.connect(s); s.connect(o.rev); }
    osc.start(t); osc.stop(end + 0.05);
  }

  function vNoise(o, t, p) {
    const src = AC.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const bq = AC.createBiquadFilter();
    bq.type = p.type || 'bandpass';
    bq.frequency.setValueAtTime(p.f, t);
    if (p.f2) bq.frequency.exponentialRampToValueAtTime(p.f2, t + p.dur);
    bq.Q.value = p.q || 0.8;
    const g = AC.createGain();
    const atk = p.atk || 0.003;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(p.vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + p.dur);
    src.connect(bq); bq.connect(g); g.connect(o.out);
    if (p.send) { const s = AC.createGain(); s.gain.value = p.send; g.connect(s); s.connect(o.rev); }
    src.start(t, Math.random() * 1.5); src.stop(t + atk + p.dur + 0.05);
  }

  function vEp(o, t, m, vol, dur, send) {
    const f = mtof(m);
    vTone(o, t, { f: f, dur: dur, vol: vol, type: 'sine', atk: 0.006, send: send, lp: 3000 });
    vTone(o, t, { f: f * 2, dur: dur * 0.35, vol: vol * 0.35, type: 'sine', atk: 0.003, send: send });
  }
  function vBell(o, t, m, vol, dur, send) {
    const f = mtof(m);
    vTone(o, t, { f: f, dur: dur, vol: vol, type: 'sine', atk: 0.004, send: send });
    vTone(o, t, { f: f * 2.76, dur: dur * 0.45, vol: vol * 0.22, type: 'sine', atk: 0.002, send: send });
    vTone(o, t, { f: f * 5.4, dur: dur * 0.2, vol: vol * 0.08, type: 'sine', atk: 0.002, send: send });
  }
  function vKick(o, t, vol) { vTone(o, t, { f: 150, f2: 45, fd: 0.12, dur: 0.22, vol: vol, type: 'sine', atk: 0.002 }); }
  function vHat(o, t, vol, dur) { vNoise(o, t, { type: 'highpass', f: 7000, dur: dur || 0.04, vol: vol, q: 0.5 }); }
  function vPad(o, t, m, vol, dur, atk, lp, send) {
    const f = mtof(m);
    vTone(o, t, { f: f, dur: dur, vol: vol, type: 'sawtooth', det: -7, atk: atk, hold: true, rel: atk, lp: lp, send: send });
    vTone(o, t, { f: f, dur: dur, vol: vol, type: 'sawtooth', det: 7, atk: atk, hold: true, rel: atk, lp: lp, send: send });
  }

  // ---------- music tracks ----------
  // Each track: bpm, spb (steps per beat), bpb (beats per bar), bars, prog (chord per bar),
  // f(o, t, chord, x) schedules one step. x = {i, bar, sb, sd, total}.
  const TR = {};

  TR.lobby = {
    bpm: 88, spb: 4, bpb: 4, bars: 8,
    prog: [ch(48, 'maj7'), ch(45, 'm7'), ch(50, 'm7'), ch(43, 'd7'), ch(52, 'm7'), ch(45, 'd7'), ch(50, 'm7'), ch(43, 'd7')],
    f: function (o, t, c, x) {
      const sb = x.sb;
      if (sb === 0 || sb === 3 || sb === 6 || sb === 10 || sb === 12) {
        const vel = sb === 0 ? 1 : 0.7;
        const v = c.n.slice(1, 4).map(function (m) { return m + 12; });
        for (let k = 0; k < v.length; k++) vEp(o, t + k * 0.012, v[k], 0.06 * vel, sb === 0 ? 1.1 : 0.5, 0.4);
      }
      if (sb === 0) vTone(o, t, { f: mtof(bassFold(c.r)), dur: 0.5, vol: 0.2, type: 'sine', atk: 0.01, lp: 400 });
      if (sb === 6) vTone(o, t, { f: mtof(bassFold(c.n[2])), dur: 0.4, vol: 0.16, type: 'sine', atk: 0.01, lp: 400 });
      if (sb === 10 && x.bar % 2) vTone(o, t, { f: mtof(bassFold(c.r)), dur: 0.3, vol: 0.12, type: 'sine', atk: 0.01, lp: 400 });
      if (sb % 2 === 0) vNoise(o, t, { type: 'bandpass', f: 7500, q: 0.6, dur: 0.07, vol: sb % 4 === 0 ? 0.04 : 0.022 });
      if (sb === 3 || sb === 13) vNoise(o, t, { type: 'bandpass', f: 1900, q: 1.5, dur: 0.04, vol: 0.03 });
    }
  };

  TR.hall = {
    bpm: 70, spb: 1, bpb: 4, bars: 8,
    prog: TR.lobby.prog,
    f: function (o, t, c, x) {
      if (x.sb === 0) {
        const bar = x.sd * 4;
        c.n.slice(1, 4).forEach(function (m) { vPad(o, t, m, 0.014, bar, 0.9, 700, 0.6); });
        vTone(o, t, { f: mtof(bassFold(c.r)), dur: bar * 0.9, vol: 0.12, type: 'sine', atk: 0.3, lp: 300 });
      }
      if (x.sb === 2 && hs(x.i, 3) < 0.6) {
        vEp(o, t, c.n[1 + Math.floor(hs(x.i, 5) * 3)] + 24, 0.04, 1.4, 0.7);
      }
    }
  };

  TR.town_day = {
    bpm: 96, spb: 2, bpb: 4, bars: 8,
    prog: [ch(48, 'add9'), ch(43, 'add9'), ch(45, 'madd9'), ch(41, 'add9'), ch(48, 'add9'), ch(43, 'add9'), ch(41, 'add9'), ch(43, 'sus')],
    f: function (o, t, c, x) {
      if (x.sb === 0) {
        const bar = x.sd * 8;
        c.n.slice(0, 3).forEach(function (m) { vPad(o, t, m + 12, 0.011, bar, 1.2, 800, 0.5); });
        vTone(o, t, { f: mtof(bassFold(c.r)), dur: 1.1, vol: 0.18, type: 'sine', atk: 0.01, lp: 350 });
      }
      if (hs(x.i, 1) < 0.55) {
        const m = c.n[Math.floor(hs(x.i, 2) * c.n.length)] + 24 + (hs(x.i, 4) < 0.2 ? 12 : 0);
        vTone(o, t, { f: mtof(m), dur: 0.55, vol: 0.085, type: 'triangle', atk: 0.004, lp: 3200, send: 0.6 });
      }
      if (x.sb % 2 === 1) vNoise(o, t, { type: 'highpass', f: 8000, dur: 0.03, vol: 0.014 });
    }
  };

  TR.town_night = {
    bpm: 72, spb: 4, bpb: 4, bars: 8,
    prog: [ch(41, 'maj7'), ch(40, 'm7'), ch(50, 'm7'), ch(48, 'maj7'), ch(41, 'maj7'), ch(43, 'd7'), ch(40, 'm7'), ch(45, 'm7')],
    f: function (o, t, c, x) {
      const sb = x.sb;
      if (sb === 0 || sb === 10) {
        const len = sb === 0 ? 1.6 : 0.6;
        c.n.slice(1, 4).forEach(function (m, k) {
          const f = mtof(m + 12);
          vTone(o, t + k * 0.015, { f: f, dur: len, vol: 0.05, type: 'triangle', det: (k - 1) * 9, atk: 0.01, lp: 1400, send: 0.4 });
        });
      }
      if (sb === 0 || sb === 10) vKick(o, t, 0.28);
      if (sb === 8) {
        vNoise(o, t, { type: 'bandpass', f: 1800, q: 0.9, dur: 0.14, vol: 0.09 });
        vTone(o, t, { f: 200, f2: 130, dur: 0.1, vol: 0.06, type: 'triangle', atk: 0.002 });
      }
      if (sb % 2 === 0) vHat(o, t + (sb % 4 === 2 ? 0.02 : 0), 0.02 + hs(x.i, 7) * 0.02, 0.035);
      if (sb === 0 || sb === 3) vTone(o, t, { f: mtof(bassFold(c.r)), dur: 0.5, vol: 0.2, type: 'sine', atk: 0.01, lp: 300 });
      if (hs(x.i, 11) < 0.22) vNoise(o, t + hs(x.i, 13) * x.sd, { type: 'highpass', f: 2500, dur: 0.012, vol: 0.03 + hs(x.i, 17) * 0.05 });
      if (sb % 4 === 0) vNoise(o, t, { type: 'lowpass', f: 5000, dur: 0.4, atk: 0.1, vol: 0.006 });
    }
  };

  TR.cafe = {
    bpm: 124, spb: 3, bpb: 4, bars: 8,
    prog: [ch(50, 'm7'), ch(43, 'd7'), ch(48, 'maj7'), ch(45, 'd7'), ch(50, 'm7'), ch(43, 'd7'), ch(48, 'maj7'), ch(45, 'd7')],
    f: function (o, t, c, x) {
      const sb = x.sb;
      if (sb % 3 === 0) {
        const k = sb / 3;
        const note = [c.n[0], c.n[2], c.n[1], c.n[3]][k];
        vTone(o, t, { f: mtof(bassFold(note)), dur: 0.32, vol: 0.2, type: 'triangle', atk: 0.01, lp: 500 });
      }
      if (sb === 0 || sb === 5) {
        const v = c.n.slice(1, 4).map(function (m) { return m + 12; });
        for (let k = 0; k < v.length; k++) vEp(o, t + k * 0.01, v[k], 0.05, sb === 0 ? 1.0 : 0.4, 0.35);
      }
      if (sb % 3 === 0 || sb === 8) vNoise(o, t, { type: 'bandpass', f: 7000, q: 0.6, dur: 0.1, vol: 0.026 });
      if (sb === 3 || sb === 9) vNoise(o, t, { type: 'highpass', f: 5500, dur: 0.05, vol: 0.04 });
      if (sb === 0 && hs(x.bar, 9) < 0.5) vEp(o, t + 0.4, c.n[2] + 24, 0.035, 0.6, 0.5);
    }
  };

  TR.arcade = {
    bpm: 132, spb: 4, bpb: 4, bars: 8,
    prog: [ch(45, 'm'), ch(41, 'maj'), ch(48, 'maj'), ch(43, 'maj'), ch(45, 'm'), ch(41, 'maj'), ch(48, 'maj'), ch(43, 'maj')],
    f: function (o, t, c, x) {
      const sb = x.sb;
      const pat = [0, 1, 2, 3, 2, 1, 2, 3];
      vTone(o, t, { f: mtof(c.n[pat[sb % 8]] + 12), dur: 0.09, vol: 0.04, type: 'square', atk: 0.002, lp: 2600 });
      if (sb % 2 === 0) vTone(o, t, { f: mtof(bassFold(c.r) + (sb % 4 === 2 ? 12 : 0)), dur: 0.1, vol: 0.18, type: 'triangle', atk: 0.003 });
      if (sb === 4 || sb === 12) vNoise(o, t, { type: 'bandpass', f: 3000, q: 0.8, dur: 0.07, vol: 0.05 });
      if (sb % 2 === 1) vHat(o, t, 0.014, 0.02);
      if (x.bar >= 4 && (sb === 0 || sb === 6 || sb === 10) && hs(x.i, 21) < 0.8) {
        vTone(o, t, { f: mtof(c.n[1 + (x.i % 3)] + 24), dur: 0.22, vol: 0.03, type: 'square', atk: 0.003, lp: 3000 });
      }
    }
  };

  TR.club = {
    bpm: 122, spb: 4, bpb: 4, bars: 8,
    prog: [ch(45, 'm7'), ch(41, 'maj7'), ch(48, 'maj7'), ch(43, 'd7'), ch(45, 'm7'), ch(41, 'maj7'), ch(48, 'maj7'), ch(43, 'd7')],
    f: function (o, t, c, x) {
      const sb = x.sb;
      if (sb % 4 === 0) vKick(o, t, 0.36);
      if (sb % 4 === 2) vNoise(o, t, { type: 'highpass', f: 8000, q: 0.5, dur: 0.08, vol: 0.04 });
      if (sb % 2 === 1) vHat(o, t, 0.014, 0.02);
      if (sb === 4 || sb === 12) vNoise(o, t, { type: 'bandpass', f: 1500, q: 0.9, dur: 0.1, vol: 0.05 });
      if (sb % 4 === 2) vTone(o, t, { f: mtof(bassFold(c.r)), dur: 0.14, vol: 0.14, type: 'sawtooth', atk: 0.004, lp: 320 });
      if (sb === 3 || sb === 6 || sb === 11) {
        const sweep = 500 + 1100 * (0.5 - 0.5 * Math.cos(2 * Math.PI * x.i / x.total));
        c.n.slice(1, 4).forEach(function (m) {
          vTone(o, t, { f: mtof(m + 12), dur: 0.16, vol: 0.028, type: 'sawtooth', atk: 0.004, lp: sweep, send: 0.4 });
        });
      }
    }
  };

  TR.gallery = {
    bpm: 60, spb: 2, bpb: 4, bars: 16,
    prog: (function () {
      const q = [ch(48, 'maj7'), ch(45, 'm7'), ch(41, 'maj7'), ch(43, 'sus')], a = [];
      for (let i = 0; i < 16; i++) a.push(q[i >> 2]);
      return a;
    })(),
    f: function (o, t, c, x) {
      if (x.sb === 0 && x.bar % 4 === 0) {
        const len = x.sd * 8 * 4;
        vPad(o, t, c.r, 0.012, len, 2.2, 600, 0.7);
        vPad(o, t, c.r + 7, 0.009, len, 2.6, 600, 0.7);
      }
      if (hs(x.i, 31) < 0.15) {
        const pent = [0, 2, 4, 7, 9];
        const m = 72 + pent[Math.floor(hs(x.i, 33) * 5)] + (hs(x.i, 35) < 0.3 ? 12 : 0);
        vBell(o, t, m, 0.07, 3, 0.9);
      }
    }
  };

  TR.home = {
    bpm: 84, spb: 2, bpb: 3, bars: 8,
    prog: [ch(48, 'maj'), ch(45, 'm'), ch(41, 'maj'), ch(43, 'maj'), ch(48, 'maj'), ch(40, 'm'), ch(41, 'maj'), ch(43, 'maj')],
    f: function (o, t, c, x) {
      const pat = [0, 1, 2, 3, 2, 1];
      const m = c.n[pat[x.sb]] + 24;
      const f = mtof(m);
      vTone(o, t, { f: f, dur: 0.9, vol: x.sb === 0 ? 0.085 : 0.06, type: 'sine', atk: 0.002, send: 0.55 });
      vTone(o, t, { f: f * 3, dur: 0.15, vol: 0.018, type: 'triangle', atk: 0.001, send: 0.4 });
      if (x.sb === 0) vTone(o, t, { f: mtof(bassFold(c.r)), dur: 0.7, vol: 0.12, type: 'sine', atk: 0.01, lp: 350 });
      if (x.sb === 3 && hs(x.i, 41) < 0.5) vTone(o, t, { f: mtof(c.n[2] + 36), dur: 0.5, vol: 0.03, type: 'sine', atk: 0.002, send: 0.8 });
    }
  };

  // ---------- context / buses ----------
  function mkImpulse(sec, decay) {
    const n = Math.floor(AC.sampleRate * sec);
    const b = AC.createBuffer(2, n, AC.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return b;
  }

  function applyVolumes() {
    if (!AC) return;
    const now = AC.currentTime;
    busMaster.gain.setTargetAtTime(st.muted ? 0 : st.master, now, 0.03);
    busMusic.gain.setTargetAtTime(st.music * 2, now, 0.03);
    busSfx.gain.setTargetAtTime(st.sfx * 1.2, now, 0.03);
  }

  function canInit() {
    if (gestured) return true;
    try { return !!(navigator.userActivation && navigator.userActivation.hasBeenActive); } catch (e) { return false; }
  }

  function init() {
    if (AC || failed) return !!AC;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) { failed = true; return false; }
      AC = new C();
      busMaster = AC.createGain();
      busComp = AC.createDynamicsCompressor();
      busComp.threshold.value = -14; busComp.ratio.value = 4; busComp.attack.value = 0.01; busComp.release.value = 0.2;
      busMusic = AC.createGain();
      busSfx = AC.createGain();
      busMusic.connect(busMaster); busSfx.connect(busMaster);
      busMaster.connect(busComp); busComp.connect(AC.destination);
      // noise buffer
      const nl = AC.sampleRate * 2;
      noiseBuf = AC.createBuffer(1, nl, AC.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
      // music reverb + feedback delay
      revMusicIn = AC.createGain();
      const cv = AC.createConvolver(); cv.buffer = mkImpulse(2.0, 3);
      const cvg = AC.createGain(); cvg.gain.value = 0.55;
      revMusicIn.connect(cv); cv.connect(cvg); cvg.connect(busMusic);
      const dl = AC.createDelay(1.0); dl.delayTime.value = 0.34;
      const fb = AC.createGain(); fb.gain.value = 0.32;
      const dlp = AC.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400;
      const dlg = AC.createGain(); dlg.gain.value = 0.3;
      revMusicIn.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(dlg); dlg.connect(busMusic);
      // sfx reverb
      revSfxIn = AC.createGain();
      const cv2 = AC.createConvolver(); cv2.buffer = mkImpulse(1.1, 3);
      const cvg2 = AC.createGain(); cvg2.gain.value = 0.5;
      revSfxIn.connect(cv2); cv2.connect(cvg2); cvg2.connect(busSfx);
      SFXO = { out: busSfx, rev: revSfxIn };
      applyVolumes();
      timer = setInterval(tick, TICK_MS);
      if (AC.state === 'suspended') AC.resume().catch(function () {});
      if (wantPlace) applyPlace(wantPlace);
      return true;
    } catch (e) {
      failed = true; AC = null;
      return false;
    }
  }

  function onGesture() {
    gestured = true;
    init();
    if (AC && AC.state === 'suspended') AC.resume().catch(function () {});
    try {
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
    } catch (e) { /* ignore */ }
  }
  try {
    window.addEventListener('pointerdown', onGesture, true);
    window.addEventListener('keydown', onGesture, true);
  } catch (e) { /* ignore */ }

  // ---------- players / scheduler ----------
  function newPlayer(tr, bpm, fadeIn) {
    const P = AC.createGain(), R = AC.createGain();
    const now = AC.currentTime;
    if (fadeIn > 0) {
      P.gain.setValueAtTime(0, now); P.gain.linearRampToValueAtTime(1, now + fadeIn);
      R.gain.setValueAtTime(0, now); R.gain.linearRampToValueAtTime(1, now + fadeIn);
    }
    P.connect(busMusic); R.connect(revMusicIn);
    const pl = {
      tr: tr, P: P, R: R, o: { out: P, rev: R },
      sd: 60 / (bpm || tr.bpm) / tr.spb,
      start: now + 0.1, i: 0, total: tr.bars * tr.spb * tr.bpb, spbar: tr.spb * tr.bpb, dead: false
    };
    players.push(pl);
    return pl;
  }

  function killPlayer(pl, fade) {
    if (pl.dead) return;
    pl.dead = true;
    const now = AC.currentTime;
    try {
      pl.P.gain.cancelScheduledValues(now); pl.P.gain.setValueAtTime(pl.P.gain.value, now); pl.P.gain.linearRampToValueAtTime(0, now + fade);
      pl.R.gain.cancelScheduledValues(now); pl.R.gain.setValueAtTime(pl.R.gain.value, now); pl.R.gain.linearRampToValueAtTime(0, now + fade);
    } catch (e) { /* ignore */ }
    setTimeout(function () {
      try { pl.P.disconnect(); pl.R.disconnect(); } catch (e) { /* ignore */ }
      const k = players.indexOf(pl);
      if (k >= 0) players.splice(k, 1);
    }, fade * 1000 + 700);
  }

  function runPlayer(pl, now, ahead) {
    const tr = pl.tr, sd = pl.sd;
    let guard = 0;
    while (pl.start + pl.i * sd < now + ahead && guard++ < 600) {
      const gi = pl.i, t = pl.start + gi * sd;
      pl.i++;
      if (t < now - 0.02) continue; // too late (throttled tab): skip, keep the grid
      const g = gi % pl.total, bar = Math.floor(g / pl.spbar), sb = g % pl.spbar;
      try { tr.f(pl.o, t, tr.prog[bar], { i: g, bar: bar, sb: sb, sd: sd, total: pl.total }); } catch (e) { /* ignore */ }
    }
  }

  function tick() {
    if (!AC || AC.state !== 'running') return;
    const now = AC.currentTime;
    const ahead = (typeof document !== 'undefined' && document.hidden) ? 1.5 : LOOKAHEAD;
    for (let k = 0; k < players.length; k++) if (!players[k].dead) runPlayer(players[k], now, ahead);
  }

  const PLACE_MAP = {
    town_day: 'town_day', town_night: 'town_night', lobby: 'lobby', hall: 'hall', home: 'home',
    cafe: 'cafe', arcade: 'arcade', club: 'club', gallery: 'gallery'
  };

  function applyPlace(id) {
    if (!AC) return;
    if (trackPl) return; // rhythm track owns the music bus; restored on stopTrack
    if (curPlace && curPlace.id === id) return;
    if (curPlace) { killPlayer(curPlace, 2); curPlace = null; }
    if (id && PLACE_MAP[id]) {
      const pl = newPlayer(TR[PLACE_MAP[id]], null, 2);
      pl.id = id;
      curPlace = pl;
    }
  }

  // ---------- SFX ----------
  function tn(O, t, f, dur, vol, type, x) {
    const p = { f: f, dur: dur, vol: vol, type: type || 'sine' };
    if (x) for (const k in x) p[k] = x[k];
    vTone(O, t, p);
  }
  function nz(O, t, f, dur, vol, type, x) {
    const p = { f: f, dur: dur, vol: vol, type: type || 'bandpass' };
    if (x) for (const k in x) p[k] = x[k];
    vNoise(O, t, p);
  }
  function arp(O, t, notes, gap, dur, vol, type, send) {
    notes.forEach(function (f, k) { tn(O, t + k * gap, f, dur, vol, type || 'sine', { send: send || 0.3 }); });
  }

  const S = {
    click: function (t, O) { tn(O, t, 880, 0.07, 0.2, 'sine', { f2: 560 }); },
    hover: function (t, O) { tn(O, t, 1400, 0.03, 0.06, 'sine'); },
    open: function (t, O) { tn(O, t, 520, 0.1, 0.16, 'triangle', { send: 0.2 }); tn(O, t + 0.07, 780, 0.14, 0.16, 'triangle', { send: 0.2 }); },
    close: function (t, O) { tn(O, t, 780, 0.1, 0.15, 'triangle', { send: 0.2 }); tn(O, t + 0.07, 520, 0.14, 0.15, 'triangle', { send: 0.2 }); },
    step: function (t, O) {
      const j = 0.85 + Math.random() * 0.3;
      nz(O, t, 500 * j, 0.05, 0.1, 'lowpass');
      tn(O, t, 130 * j, 0.06, 0.12, 'sine', { f2: 70 });
    },
    place: function (t, O) { tn(O, t, 320, 0.13, 0.26, 'sine', { f2: 170 }); nz(O, t, 1200, 0.04, 0.1); },
    pickup: function (t, O) { tn(O, t, 500, 0.12, 0.2, 'sine', { f2: 950 }); },
    rotate: function (t, O) { tn(O, t, 700, 0.04, 0.14, 'triangle'); tn(O, t + 0.05, 930, 0.05, 0.14, 'triangle'); },
    'delete': function (t, O) {
      nz(O, t, 3000, 0.28, 0.14, 'bandpass', { f2: 400, q: 1.2 });
      tn(O, t, 400, 0.2, 0.14, 'sawtooth', { f2: 110, lp: 900 });
    },
    save: function (t, O) { arp(O, t, [660, 880, 1100], 0.08, 0.2, 0.14, 'sine', 0.4); },
    error: function (t, O) {
      tn(O, t, 200, 0.12, 0.2, 'square', { lp: 700 });
      tn(O, t + 0.14, 150, 0.18, 0.2, 'square', { lp: 700 });
    },
    coin: function (t, O) { tn(O, t, 988, 0.06, 0.12, 'square', { lp: 4000 }); tn(O, t + 0.07, 1319, 0.3, 0.12, 'square', { lp: 4000, send: 0.2 }); },
    purchase: function (t, O) {
      nz(O, t, 4000, 0.03, 0.1, 'highpass');
      arp(O, t + 0.04, [784, 988, 1175, 1568], 0.06, 0.25, 0.12, 'triangle', 0.35);
    },
    burn: function (t, O) {
      nz(O, t, 300, 0.9, 0.2, 'bandpass', { f2: 2800, q: 0.9, atk: 0.12 });
      nz(O, t + 0.3, 2800, 0.6, 0.12, 'bandpass', { f2: 600, q: 0.9, atk: 0.05 });
      tn(O, t, 70, 0.9, 0.2, 'sawtooth', { f2: 45, lp: 200, atk: 0.1 });
      for (let k = 0; k < 8; k++) nz(O, t + 0.1 + Math.random() * 0.8, 3500, 0.015, 0.07, 'highpass');
    },
    toast: function (t, O) { tn(O, t, 1046, 0.14, 0.12, 'sine', { send: 0.3 }); tn(O, t + 0.08, 1318, 0.2, 0.12, 'sine', { send: 0.3 }); },
    door: function (t, O) {
      tn(O, t, 190, 0.28, 0.1, 'sawtooth', { f2: 120, lp: 500, atk: 0.06 });
      nz(O, t + 0.25, 400, 0.08, 0.2, 'lowpass');
      tn(O, t + 0.25, 100, 0.12, 0.22, 'sine', { f2: 60 });
    },
    elevator_ding: function (t, O) {
      tn(O, t, 1568, 1.1, 0.16, 'sine', { send: 0.5 });
      tn(O, t, 3136, 0.4, 0.04, 'sine', { send: 0.5 });
    },
    chat: function (t, O) { tn(O, t, 600, 0.06, 0.12, 'sine', { f2: 900 }); tn(O, t + 0.07, 800, 0.07, 0.1, 'sine', { f2: 1100 }); },
    win: function (t, O) {
      arp(O, t, [523, 659, 784], 0.09, 0.2, 0.16, 'triangle', 0.35);
      tn(O, t + 0.27, 1047, 0.7, 0.18, 'triangle', { send: 0.4 });
      tn(O, t + 0.27, 1568, 0.5, 0.05, 'sine', { send: 0.4 });
    },
    lose: function (t, O) {
      arp(O, t, [392, 330, 262], 0.16, 0.3, 0.15, 'triangle', 0.25);
      tn(O, t + 0.5, 196, 0.6, 0.14, 'sine', { f2: 150 });
    },
    tie: function (t, O) { tn(O, t, 440, 0.14, 0.14, 'triangle'); tn(O, t + 0.17, 440, 0.2, 0.14, 'triangle'); },
    countdown: function (t, O) { tn(O, t, 660, 0.14, 0.2, 'sine', { send: 0.2 }); },
    go: function (t, O) { tn(O, t, 990, 0.35, 0.2, 'sine', { send: 0.3 }); tn(O, t, 1320, 0.35, 0.1, 'triangle', { send: 0.3 }); },
    stack: function (t, O) { tn(O, t, 230, 0.1, 0.24, 'sine', { f2: 110 }); nz(O, t, 700, 0.06, 0.12, 'lowpass'); },
    stack_perfect: function (t, O) {
      S.stack(t, O);
      tn(O, t + 0.04, 1320, 0.4, 0.12, 'sine', { send: 0.5 });
      tn(O, t + 0.1, 1760, 0.5, 0.1, 'sine', { send: 0.5 });
    },
    drop: function (t, O) {
      tn(O, t, 900, 0.3, 0.14, 'sine', { f2: 200 });
      tn(O, t + 0.3, 110, 0.14, 0.26, 'sine', { f2: 55 });
      nz(O, t + 0.3, 600, 0.08, 0.14, 'lowpass');
    },
    hit_perfect: function (t, O) {
      tn(O, t, 1318, 0.14, 0.16, 'sine', { send: 0.3 });
      tn(O, t, 1760, 0.2, 0.12, 'triangle', { send: 0.3 });
      nz(O, t, 5000, 0.03, 0.08, 'highpass');
    },
    hit_good: function (t, O) { tn(O, t, 880, 0.11, 0.15, 'triangle', { send: 0.15 }); },
    miss: function (t, O) { tn(O, t, 150, 0.16, 0.18, 'sine', { f2: 80 }); nz(O, t, 300, 0.08, 0.08, 'lowpass'); },
    siren: function (t, O) {
      const osc = AC.createOscillator(), g = AC.createGain(), bq = AC.createBiquadFilter();
      osc.type = 'triangle'; bq.type = 'lowpass'; bq.frequency.value = 1500;
      for (let k = 0; k < 4; k++) {
        osc.frequency.setValueAtTime(k % 2 ? 860 : 640, t + k * 0.14);
        osc.frequency.linearRampToValueAtTime(k % 2 ? 640 : 860, t + k * 0.14 + 0.13);
      }
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.setValueAtTime(0.12, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
      osc.connect(bq); bq.connect(g); g.connect(O.out);
      osc.start(t); osc.stop(t + 0.7);
    },
    brrr: function (t, O) {
      for (let k = 0; k < 14; k++) {
        const tt = t + k * 0.045;
        nz(O, tt, 2200 + k * 80, 0.03, 0.12, 'bandpass', { q: 1.5 });
        tn(O, tt, 140 + k * 10, 0.04, 0.05, 'square', { lp: 800 });
      }
      tn(O, t + 0.66, 1568, 0.3, 0.1, 'sine', { send: 0.3 });
    },
    gm: function (t, O) {
      vBell(O, t, 79, 0.16, 0.7, 0.5);
      vBell(O, t + 0.14, 86, 0.16, 1.0, 0.5);
    },
    rug: function (t, O) {
      nz(O, t, 1500, 0.35, 0.16, 'bandpass', { f2: 300, q: 1, atk: 0.05 });
      tn(O, t + 0.36, 85, 0.2, 0.3, 'sine', { f2: 45 });
      nz(O, t + 0.36, 400, 0.08, 0.15, 'lowpass');
    },
    camera_shutter: function (t, O) {
      nz(O, t, 3500, 0.025, 0.22, 'bandpass', { q: 1.2 });
      tn(O, t, 1800, 0.015, 0.08, 'sine');
      nz(O, t + 0.045, 2500, 0.035, 0.2, 'bandpass', { q: 1.2 });
    },
    cheer: function (t, O) {
      nz(O, t, 900, 1.1, 0.12, 'bandpass', { q: 0.8, atk: 0.3, send: 0.3 });
      nz(O, t, 1600, 1.0, 0.07, 'bandpass', { q: 0.8, atk: 0.3, send: 0.3 });
      for (let k = 0; k < 8; k++) nz(O, t + 0.2 + Math.random() * 0.8, 2500, 0.04, 0.07, 'bandpass', { q: 1 });
      for (let k = 0; k < 3; k++) tn(O, t + k * 0.12, 500 + k * 60, 0.45, 0.045, 'sine', { f2: 900 + k * 80, lp: 1800, atk: 0.05 });
    },
    trophy: function (t, O) {
      arp(O, t, [523, 659, 784], 0.12, 0.25, 0.15, 'triangle', 0.4);
      tn(O, t + 0.4, 1047, 1.0, 0.18, 'triangle', { send: 0.5 });
      tn(O, t + 0.4, 784, 1.0, 0.1, 'triangle', { send: 0.5 });
      for (let k = 0; k < 4; k++) tn(O, t + 0.5 + k * 0.08, 2093 + k * 300, 0.25, 0.04, 'sine', { send: 0.6 });
    }
  };

  // ---------- public API ----------
  const api = {
    setVolume: function (which, v) {
      try {
        if (!(which in st) || which === 'muted') return;
        v = Math.max(0, Math.min(1, +v || 0));
        st[which] = v;
        save(); applyVolumes();
      } catch (e) { /* ignore */ }
    },
    mute: function (b) {
      try { st.muted = !!b; save(); applyVolumes(); } catch (e) { /* ignore */ }
    },
    settings: function () {
      return { master: st.master, music: st.music, sfx: st.sfx, muted: st.muted };
    },
    setPlace: function (id) {
      try {
        wantPlace = id || null;
        if (!AC && canInit()) init();
        if (!AC) return;
        applyPlace(wantPlace);
      } catch (e) { /* ignore */ }
    },
    sfx: function (name) {
      try {
        if (!AC && canInit()) init();
        if (!AC || !SFXO || AC.state !== 'running') return;
        const fn = S[name];
        if (!fn) return;
        const now = AC.currentTime;
        if (sfxLast[name] && now - sfxLast[name] < 0.03) return;
        sfxLast[name] = now;
        fn(now + 0.005, SFXO);
      } catch (e) { /* ignore */ }
    },
    now: function () { return AC ? AC.currentTime : 0; },
    playTrack: function (id, bpm) {
      bpm = Math.max(60, Math.min(200, +bpm || 120));
      const mk = function (start) {
        return {
          startTime: start, bpm: bpm,
          beats: function (n, from) {
            const a = [], k0 = from || 0;
            for (let k = 0; k < n; k++) a.push(start + (k0 + k) * 60 / bpm);
            return a;
          }
        };
      };
      try {
        if (!AC && canInit()) init();
        if (!AC) return mk(0);
        api.stopTrack(true);
        if (curPlace) { killPlayer(curPlace, 0.4); curPlace = null; }
        const pl = newPlayer(TR.club, bpm, 0.15);
        pl.start = AC.currentTime + 0.3;
        trackPl = pl;
        return mk(pl.start);
      } catch (e) { return mk(0); }
    },
    stopTrack: function (keepSilent) {
      try {
        if (trackPl && AC) { killPlayer(trackPl, 0.4); trackPl = null; }
        if (!keepSilent && AC && wantPlace) applyPlace(wantPlace);
      } catch (e) { /* ignore */ }
    }
  };
  return api;
})();
