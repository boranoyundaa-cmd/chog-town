// Gallery of real Chogs from trait data: ?ids=1700,1557,409 (default: the fixtures). Data: data/tokens.json (all 1,969 tokens) over the data/chogs.manual.json fixtures.
const world = new THREE.Group(); scene.add(world);
scene.add(M(new THREE.CylinderGeometry(7, 7, 0.3, 28), tmat(0xffffff, { tex: TEX.grass, em: 0.15 }), 0, -0.15, 0));
const GAL = { ids: [], tokens: {} };
(function () {
  const q = new URLSearchParams(location.search);
  const req = q.has('ids') ? q.get('ids').split(',').map(Number) : [1700, 1557, 409, 1808, 1000, 1942];
  const xhr = u => { const r = new XMLHttpRequest(); r.open('GET', u, false); try { r.send(); } catch (e) { return null; } return r.status === 200 ? JSON.parse(r.responseText) : null; };
  const manual = xhr('data/chogs.manual.json'), full = xhr('data/tokens.json');
  GAL.tokens = Object.assign({}, manual ? manual.tokens : {}, full ? full.tokens : {});
  for (const t of Object.values(GAL.tokens)) { const m = / — (.+)$/.exec(t.name || ''); if (m && t.traits && t.traits.Base === '1:1') t.traits.Legend = m[1]; }      // the ten one-of-one Chogs (wallet.js does the same in the game)
  GAL.ids = req.filter(id => GAL.tokens[id]);
  const n = GAL.ids.length, gap = 1.45, cap = document.getElementById('cap');
  GAL.ids.forEach((id, i) => {
    const t = GAL.tokens[id].traits, c = chogFromTraits(t, { scale: 1.0 });
    const k = (i - (n - 1) / 2) * gap, r = Math.SQRT1_2;
    c.position.set(k * r, 0, -k * r); c.rotation.y = Math.PI / 4; world.add(c);
    const d = document.createElement('div'); d.innerHTML = '<b>#' + id + '</b><br>' + Object.entries(t).filter(([k]) => ['Skin', 'Body', 'Head', 'Eyes', 'Mouth', 'Aura', 'Accessory'].includes(k)).map(([k, v]) => v).join(' · '); cap.appendChild(d);
  });
})();
scene.traverse(o => { if (o.userData && (o.userData.isHull || o.userData.noNormal)) hiddenInNormal.push(o); });
FW = Math.max(6, 2.4 + GAL.ids.length * 1.45); camTarget.set(0, 1.35, 0); updateCam();
