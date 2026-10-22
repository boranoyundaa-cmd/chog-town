// Injected into m.html for the trailer (tools/trailer_phone_job.js): the phone companion's server link answered in the page, with one room and a few guests.
// window.__PHONE = { room, doc, guests: [{ name, token, x, z }] } is set before this runs. Nothing leaves the page.
(() => {
  const P = () => window.__PHONE, Real = window.WebSocket;
  try { localStorage.setItem('chog_phone_key', 'trailer'); } catch (e) { }
  window.WebSocket = function (url) {
    if (!/phone=1/.test(url)) return new Real(url);
    const ws = { readyState: 0, send(s) { const m = JSON.parse(s); setTimeout(() => reply(m), 30); }, close() { } }, out = m => ws.onmessage && ws.onmessage({ data: JSON.stringify(m) });
    let t = 0;
    const cam = () => { t += 1; const gs = P().guests.concat(t >= 3 && P().late ? [P().late] : []); if (t === 3 && P().late) out({ t: 'm_count', inside: gs.length, today: { visitors: 24, tips: 140 } }); out({ t: 'camera', players: gs.map((g, i) => ({ id: 'g' + i, l: 1, name: g.name, token: g.token, x: g.x + Math.sin(t * 0.9 + i * 2) * 1.2, z: g.z + Math.cos(t * 0.7 + i) * 0.8, owner: !!g.owner })) }); };
    function reply(m) {
      if (m.t === 'phoneauth') out({ t: 'phoneauth', ok: true, addr: '0xtrailer', name: 'neo' });
      if (m.t === 'm_room') { out({ t: 'm_room', room: P().room, doc: P().doc, doc2: null, camera: true, inside: P().guests.length, today: { visitors: 23, tips: 140 }, events: [] }); cam(); setInterval(cam, 1000); }
    }
    setTimeout(() => { ws.readyState = 1; ws.onopen && ws.onopen(); out({ t: 'welcome', id: 'phone', phone: 1 }); }, 50);
    return ws;
  };
  window.WebSocket.OPEN = 1; window.WebSocket.CONNECTING = 0; window.WebSocket.CLOSED = 3;
})();
