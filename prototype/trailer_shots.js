// ===== the trailer's shots (needs trailer.js): a trailer for Crypto Twitter, the residents and Lev do the talking =====
// TR.runAll() in a fresh page in the town. Frames go to shots/T<nn>_<shot>_0001.png; TR.track (where each speaker's head is on screen, per frame) is saved as shots/track.json
// for tools/edit_trailer.py, which draws the speech bubbles and Lev's box over the frames. Lines are the game's own (culture_data.js).
(function () {
  const E = TR.ease, L = TR.lerp, W = ms => new Promise(r => setTimeout(r, ms));
  TR.log = []; TR.track = {};
  const done = (name, n) => TR.log.push(name + ' ' + n);
  const R = id => NPC.list.find(r => r.id === id);
  const pin = map => { NPC.pins = map; for (const k in map) if (NPC.PL[map[k]]) NPC.PL[map[k]].ry = Math.PI / 4 + 0.15; NPC.dirty = true; };   // pinned speakers face the camera (the iso view looks from +x +z)
  const _v = new THREE.Vector3(), _b = new THREE.Box3();
  // screen position (1920 x 1080 px) of the top of a Chog's head; o = the Chog's root group
  const headOf = o => { _b.setFromObject(o); _v.set((_b.min.x + _b.max.x) / 2, _b.max.y, (_b.min.z + _b.max.z) / 2).project(cam); return [Math.round((_v.x + 1) * 960), Math.round((1 - _v.y) * 540)]; };
  // who: { key: () => root group } -> TR.track[shot][key][frame] = [x, y] (null while hidden)
  const tracker = (shot, who) => { TR.track[shot] = {}; for (const k in who) TR.track[shot][k] = []; return () => { for (const k in who) { const o = who[k](); TR.track[shot][k].push(o && o.visible !== false ? headOf(o) : null); } }; };
  const npcRoot = id => () => R(id) && R(id).c;
  const shot = async (name, secs, cam, o = {}) => { if (o.hour0 !== undefined) DAY.fixedHour = o.hour0 % 24; cam(0, 0); NPC.dirty = true; step(45, 1 / 30);   // a warm-up that is not saved: residents pinned for this shot have faded in
    const n = await TR.shot(name, secs, cam, Object.assign({ after: o.who ? tracker(name, o.who) : null }, o)); done(name, n); };

  TR.runTown = async function () {
    TR.setup({ hour: 17.8 }); NPC.target = 60;                                          // everybody out (the crowd cap is lifted for the trailer)
    CULTURE_RT.tick(true); CULTURE_RT.tick = () => {};                                    // events stay as they are now: an event changing with the hour would reset the pins below
    // 01 the plaza at golden hour: gm, gm, gm... it's over
    pin({ sergm: 'pz3', linkmarine: 'pzFlag', nad: 'pz2', memekid: 'pz4', doombear: 'pz1' });
    await shot('T01_gm', 4.2, u => { const e = E(u); TR.cam(-5.8, -6.2, L(16.5, 13.8, e), L(-0.12, 0.05, e)); }, { who: { sergm: npcRoot('sergm'), linkmarine: npcRoot('linkmarine'), nad: npcRoot('nad'), memekid: npcRoot('memekid'), doombear: npcRoot('doombear') } });
    // 03 the Old Hodler in the park
    DAY.fixedHour = 15; pin({ hodler: 'parkA' });
    await shot('T03_hodler', 6, u => { const e = E(u); TR.cam(-16, 21, L(10, 8.4, e), L(0.25, 0.1, e)); }, { who: { hodler: npcRoot('hodler') } });
    // 04 Line-Drawer Larry by his post
    DAY.fixedHour = 11; pin({ larry: 'larryPost' });
    await shot('T04_larry', 5.2, u => { const e = E(u); TR.cam(-11.6, -21.6, L(10, 8.6, e), L(-0.2, -0.05, e)); }, { who: { larry: npcRoot('larry') } });
    // 05 the Airdrop Farmer on the cafe terrace
    DAY.fixedHour = 13; pin({ farmer: 'cafeT3', duck: 'cafeT4' });
    await shot('T05_farmer', 3.6, u => { const e = E(u); TR.cam(-22.2, -5.6, L(9.5, 8.6, e), L(0.3, 0.2, e)); }, { who: { farmer: npcRoot('farmer') } });
    // 06 the Degen at the arcade, at night
    DAY.fixedHour = 22.5; pin({ degen: 'arcadeFront1', sweateranon: 'arcadeFront2', milkshake: 'arcadeFront3' });
    await shot('T06_degen', 4.6, u => { const e = E(u); TR.cam(13.6, 5.4, L(8.6, 7.4, e), L(-0.15, 0.05, e)); }, { who: { degen: npcRoot('degen') } });
    // 07 Mr. Four in front of the hotel, morning
    DAY.fixedHour = 9.5; pin({ mrfour: 'hf4', ethguy: 'hf1', teacher: 'hf3' });
    await shot('T07_four', 2.6, u => TR.cam(-2.8, -21.8, L(8.2, 7.6, u), 0.12), { who: { mrfour: npcRoot('mrfour') } });
    // 09 the Rug Victim on the bench by the exit
    DAY.fixedHour = 18.6; pin({ rugvictim: 'exitBench' });
    await shot('T09_rug', 4.4, u => { const e = E(u); TR.cam(-9.6, 10.9, L(9.5, 8.2, e), L(0.35, 0.2, e)); }, { who: { rugvictim: npcRoot('rugvictim') } });
    // 10 day to night on Hotel Street, then Ser Gm at 3 AM
    pin({ sergm: 'guidePost' });
    await shot('T10_night', 5.6, u => TR.cam(L(-5.5, -4.2, E(u)), L(-19.5, -17.6, E(u)), L(24, 11, E(u)), L(-0.3, -0.12, u)), { hour0: 16.5, hour1: 27, timeScale: 300, who: { sergm: npcRoot('sergm') } });
    // 11 the finale: the camera pulls out over the whole hotel at dusk (Lev's last line and the title come in the edit)
    DAY.fixedHour = 19.3; pin({});
    await shot('T11_finale', 6.4, u => { const e = E(Math.min(1, u * 1.12)); TR.cam(-6, L(-23, -24, e), L(13, 74, e), L(0.05, -0.12, e), L(1.1, 8, e)); });
    return TR.log;
  };

  const enter = async id => { GAME.cine = null; const v = HOTEL.info.venues.find(v => v.id === id); await HOTEL.goTo(v); await W(1200); await HOTEL.enterVenue(v); await W(2500); GAME.cine = () => true; if (GAME.me) GAME.me.visible = false; };
  const pick = (n, seed) => { const out = []; let s = seed; while (out.length < n) { s = (s * 16807) % 2147483647; const id = 1 + (s % 1969); if (!out.includes(id)) out.push(id); } return out; };

  TR.runLev = async function () {
    // 02 Lev at the desk (two guests in the queue); Lev's portrait for the box is taken from the game's own dialog
    GAME.cine = null; window.__hold = false; if (!HOTEL.active) await HOTEL.enterFromTown(); await W(1500);
    LEV.talk(); await W(800); const img = document.querySelector('#levbox img');
    if (img && img.src) await fetch('/save?name=lev_face.png', { method: 'POST', body: await (await fetch(img.src)).blob() });
    document.querySelector('#levbox').classList.remove('on');
    window.__hold = true; GAME.cine = () => true; GAME.me.visible = false; TR.clear();
    TR.crowd(pick(3, 31337), [[0.4, -3.5, Math.PI], [0.5, -2.6, Math.PI], [-4.6, -1.8, 1.2]], 'idle');
    await shot('T02_lev', 9.2, u => { const e = E(u); TR.cam(L(0.6, 0.4, e), L(-3.2, -4.2, e), L(13, 9.6, e), L(0.1, -0.02, e)); });   // as long as Lev's spoken line
  };
  TR.runHotel = async function () {
    await TR.runLev();
    // 08 the club: a full dance floor, the Macro Guy at the edge of it
    await enter('v102'); TR.clear();
    const ids = [1700, 561, 212, 1337, 77, 999, 1514, 420, 1234, 808, 1881, 69, 1969], spots = [];
    for (const dx of [-1.3, 0, 1.3]) for (const dz of [-1.3, 0, 1.3]) spots.push([-3 + dx + Math.sin(dx * 7 + dz) * 0.2, -4.5 + dz + Math.cos(dz * 5 + dx) * 0.2, Math.PI / 4]);
    spots.push([-6.5, -2, Math.PI / 4], [-1, -7.2, Math.PI / 4], [-5.2, -6.6, Math.PI / 3], [1.6, -6.0, Math.PI / 3]);
    TR.crowd(ids, spots, 'dance');
    const macro = chogFromTraits(R('macro').traits, { scale: CHOG_SCALE }); macro.position.set(0.6, 0, -2.2); macro.rotation.y = Math.PI / 4 + 0.25; scene.add(macro); TR.extras.push(macro);
    await shot('T08_club', 5, u => { const e = E(u); TR.cam(-1.6, -3.6, L(12.5, 10.5, e), L(-0.3, 0.3, e)); }, { who: { macro: () => macro } });
    TR.clear();
    return TR.log;
  };

  TR.runAll = async function () { await TR.runTown(); await TR.runHotel(); for (let i = 0; i < 8; i++) { try { if ((await fetch('/save?name=track.json', { method: 'POST', body: JSON.stringify(TR.track) })).ok) break; } catch (e) { /* again */ } await W(800); } return TR.log; };
})();
