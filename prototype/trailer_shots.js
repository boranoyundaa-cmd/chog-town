// ===== the trailer's shots (needs trailer.js). TR.runTown() in a fresh page in the town, TR.runHotel() after it; frames go to shots/T<n>_<shot>_0001.png =====
(function () {
  const E = TR.ease, L = TR.lerp, W = ms => new Promise(r => setTimeout(r, ms));
  TR.log = [];
  const done = (name, n) => { TR.log.push(name + ' ' + n); };
  const followNpc = id => { const w = NPC.where(id, NPC.override); return w; };

  TR.runTown = async function (only) {
    const go = k => !only || only.includes(k);
    TR.setup({ hour: 17.6 });
    if (go(1)) done('T1', await TR.shot('T1_plaza', 6, u => { const e = E(u); TR.cam(-6, -6, L(46, 32, e), L(-0.25, 0.05, e)); }, { hour0: 17.6, hour1: 17.7 }));
    if (go(2)) {
      DAY.fixedHour = 17.7; const id = 'linkmarine';
      done('T2', await TR.shot('T2_follow', 5, u => { const w = followNpc(id); TR.cam(w.x, w.z, L(10, 8.5, E(u)), L(0.15, 0.35, u)); }));
    }
    if (go(3)) done('T3', await TR.shot('T3_timelapse', 6, u => TR.cam(-6, -18, 30, L(-0.35, -0.2, u)), { hour0: 16.5, hour1: 21.8, timeScale: 400 }));
    if (go(4)) { DAY.fixedHour = 22; done('T4', await TR.shot('T4_hotelnight', 4, u => { const e = E(u); TR.cam(-6, L(-20.5, -22.8, e), L(20, 13, e), -0.25); })); }
    if (go(9)) { DAY.fixedHour = 19.2; done('T9', await TR.shot('T9_finale', 7, u => { const e = E(Math.min(1, u * 1.15)); TR.cam(-6, L(-23, -24, e), L(13, 74, e), L(0.05, -0.12, e), L(1.1, 8, e)); })); }
    return TR.log;
  };

  const enter = async id => { GAME.cine = null; const v = HOTEL.info.venues.find(v => v.id === id); if (!HOTEL.active && !ROOM.active) await HOTEL.enterFromTown(); else if (ROOM.active) { await HOTEL.returnFromVenue(ROOM.venue || v); } await W(1200); await HOTEL.goTo(v); await W(1200); await HOTEL.enterVenue(v); await W(2500); GAME.cine = () => true; if (GAME.me) GAME.me.visible = false; };
  const piecesOf = re => (ROOM.doc.pieces || []).filter(i => re.test(i.p));
  // free floor: grid points at least `gap` m from every piece and inside the walls, in pairs facing each other (two people talking)
  // free floor: points at least `gap` m from every piece, spread over the middle of the room, in pairs facing each other (two people talking)
  const freePairs = (n, gap = 1.4, spread = 3.4) => {
    const P = ROOM.doc.pieces || [], [w, d] = ROOM.venue ? ROOM.venue.size : [22, 16], cand = [], out = [];
    const clear = (x, z) => P.every(p => Math.hypot(p.x - x, p.z - z) > gap);
    for (let x = -Math.min(7, w / 2 - 2); x <= Math.min(7, w / 2 - 2); x += 0.5) for (let z = -Math.min(5, d / 2 - 2); z <= Math.min(5, d / 2 - 1.5); z += 0.5)
      if (clear(x, z) && clear(x + 0.9, z + 0.5) && clear(x + 0.45, z + 0.25)) cand.push([x, z]);
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
    const ry = Math.atan2(0.9, 0.5);
    for (const [x, z] of cand) { if (out.length >= n * 2) break; if (out.every(o => Math.hypot(o[0] - x, o[1] - z) > spread)) out.push([x, z, ry], [x + 0.9, z + 0.5, ry + Math.PI]); }
    return out;
  };
  const pick = (n, seed) => { const out = []; let s = seed; while (out.length < n) { s = (s * 16807) % 2147483647; const id = 1 + (s % 1969); if (!out.includes(id)) out.push(id); } return out; };

  TR.runHotel = async function (only) {
    const go = k => !only || only.includes(k);
    if (go(5)) {
      GAME.cine = null; if (!HOTEL.active) await HOTEL.enterFromTown(); await W(1500); GAME.cine = () => true; GAME.me.visible = false; TR.clear();
      TR.crowd(pick(4, 31337), [[0.4, -3.5, Math.PI], [0.5, -2.6, Math.PI], [0.3, -1.7, Math.PI + 0.3], [-4.6, -1.8, 1.2]], 'idle');                  // a queue at the desk
      done('T5', await TR.shot('T5_lobby', 4, u => { const e = E(u); TR.cam(L(0, 1.5, e), L(-1, -0.5, e), L(17, 13.5, e), L(0.12, -0.05, e)); }));
    }
    if (go(6)) {
      await enter('v101'); TR.clear();
      const spots = freePairs(5); TR.log.push('cafe spots ' + spots.length);
      TR.crowd(pick(spots.length, 4242), spots, 'idle');
      done('T6', await TR.shot('T6_cafe', 5, u => { const e = E(u); TR.cam(L(-3, 2, e), L(-1, 1, e), L(14, 12, e), L(-0.2, 0.1, e)); }));
      TR.clear();
    }
    if (go(7)) {
      await enter('v102'); TR.clear();
      const ids = [1700, 561, 212, 1337, 77, 999, 1514, 420, 1234, 808, 1881, 69, 1969], spots = [];
      for (const dx of [-1.3, 0, 1.3]) for (const dz of [-1.3, 0, 1.3]) spots.push([-3 + dx + Math.sin(dx * 7 + dz) * 0.2, -4.5 + dz + Math.cos(dz * 5 + dx) * 0.2, Math.PI / 4]);
      spots.push([-6.5, -2, Math.PI / 4], [0.5, -1.5, Math.PI / 4], [-1, -7.2, Math.PI / 4], [-5.2, -6.6, Math.PI / 3]);
      TR.crowd(ids, spots, 'dance');
      done('T7', await TR.shot('T7_club', 6, u => { const e = E(u); TR.cam(-2.8, -4.2, L(13, 10.5, e), L(-0.35, 0.45, e)); }));
      TR.clear();
    }
    if (go(8)) {
      await enter('v104'); TR.clear();
      const legends = [561, 900, 942, 1002, 1481, 1514, 1667, 1798, 1881, 1884], spots = legends.map((_, i) => [-6.6 + i * 1.6, 5.6, Math.PI / 4]);
      TR.crowd(legends, spots, 'idle');
      done('T8', await TR.shot('T8_legends', 5, u => { const e = E(u); TR.cam(L(-4.5, 6, e), 5.2, 10, 0.05); }));
      TR.clear();
    }
    return TR.log;
  };
})();
