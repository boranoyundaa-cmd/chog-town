// ===== shop: the official Chog Hotel shop (docs/project/build-plan.md "Economy and $CHOG", contracts/) =====
// Soulbound ERC-1155 items bought with $CHOG (90 % burned, 10 % to the team) on Monad. Three tabs: decor kits (room pieces), cosmetics (worn in EXTRA Chog slots only:
// aura, held item, badge, name plate colour, laser eyes; they never replace NFT traits) and venue extras (budget, events, security camera). Also: tips for venue owners,
// the "Tonight at ..." banner, and the security camera window.
// Money flow lives in the wallet: this file only builds transactions (approve exact amount, then buyWithChog / tip) and the player clicks Buy and confirms in the wallet.
// What a wallet owns is read by the server (server/shop.js, balanceOfBatch) and sent in `shopstate`; the server enforces tier locks and ownership again.
// Modes: 'off' (no shop address yet: items and prices are shown, "Shop opens soon"), 'chain' (address set), 'mock' (`?shopmock=1`: purchases recorded locally, or on a server run with SHOP_MOCK=1).
// Loaded after games.js, before main.js. Keep helper names inside the IIFE: all scripts share one global scope.

// ---- the one place for chain settings. After deploying ChogShop put its address here, and set SHOP_ADDRESS on the server (docs/engineering/server.md)
const SHOP_CONFIG = {
  chainId: 143,
  chog: '0x350035555E10d9AfAF1566AaebfCeD5BA6C27777',                 // $CHOG, 18 decimals
  shop: "0x0eD0D1c8782819Cb9AbFe183C6c0235F248B2F9a",                  // ChogShop on Monad, deployed by the owner 2026-10-15 (null = "Shop opens soon")
  pool: '0x116e7d070f1888b81e1e0324f56d6746b2d7d8f1',                  // Capricorn CHOG/WMON 1 % pool (token0 CHOG, token1 WMON): only read, to quote the MON price; the shop swaps against the pool set on chain (shop.pool())
  chogUsd: 0.0016,                                                     // display only ("about $"), contracts/README.md 2026-10-15
};

// ABI-BEGIN  (tiny encoder; the server test checks every selector and the layout against ethers)
const SHOP_ABI = (function () {
  const w = n => BigInt(n).toString(16).padStart(64, '0'), a = x => String(x).toLowerCase().replace(/^0x/, '').padStart(64, '0');
  return {
    approve: (spender, amount) => '0x095ea7b3' + a(spender) + w(amount),
    allowance: (owner, spender) => '0xdd62ed3e' + a(owner) + a(spender),
    balanceOf: owner => '0x70a08231' + a(owner),
    buyWithChog: (id, qty) => '0x18dd6628' + w(id) + w(qty),
    buyWithMon: (id, qty, minOut, deadline) => '0x5d399aa3' + w(id) + w(qty) + w(minOut) + w(deadline),
    tip: (to, venueId, amount) => '0xb7577fbe' + a(to) + w(venueId) + w(amount),
    pool: () => '0x16f0115b',
    zeroForOne: () => '0xb25b6bd7',
    router: () => '0xf887ea40',                                         // legacy, unused
    slot0: () => '0x3850c7bd',
    balanceOfBatch: (accounts, ids) => '0x4e1273f4' + w(64) + w(64 + 32 + accounts.length * 32) + w(accounts.length) + accounts.map(a).join('') + w(ids.length) + ids.map(w).join(''),
    wei: whole => BigInt(whole) * 10n ** 18n,
  };
})();
// ABI-END

const SHOP = { items: [], byId: new Map(), owned: {}, equip: {}, events: { event: 0, mega: 0 }, camera: false, budget: { pieces: 0, lights: 0 }, tab: 'decor', win: null, tx: null, serverMode: null, serverAddress: null, mismatch: false, monOk: false, monPrice: null, chogBal: null, tipping: false, banners: [], ready: null };

(function () {
  const QS_ = new URLSearchParams(location.search), MOCK = QS_.has('shopmock');
  const TIER_N = t => (typeof TIER_NAME !== 'undefined' && TIER_NAME[t]) || 'tier ' + t;
  const SLOT_LABEL = { aura: 'Aura', held: 'Held item', badge: 'Badge', plate: 'Name plate', eyes: 'Eyes effect' };
  const sfx = n => { try { if (window.AUDIO && AUDIO.sfx) AUDIO.sfx(n); } catch (e) { /* sound is optional */ } };
  const fmt = n => Number(n).toLocaleString('en-US');
  const usd = n => { const v = n * SHOP_CONFIG.chogUsd; return v < 0.1 ? v.toFixed(3) : v.toFixed(2); };
  const hex6 = c => '#' + new THREE.Color(c).getHexString();
  { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/shop.css'; document.head.appendChild(l); }          // the plate extras, tip button and banner need it from the start
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const redrawHud = () => { if (typeof render === 'function') render(); };

  SHOP.mode = () => (MOCK ? 'mock' : SHOP_CONFIG.shop ? 'chain' : 'off');
  SHOP.myTier = () => { try { return typeof licenseIds === 'function' ? WALLET.venueTier(licenseIds()).tier : 0; } catch (e) { return 0; } };
  SHOP.owns = id => (SHOP.owned[id] || 0) > 0;
  SHOP.qty = id => SHOP.owned[id] || 0;
  const serverMock = () => SHOP.mode() === 'mock' && NET.status === 'online' && NET.authed && SHOP.serverMode === 'mock';       // purchases and worn items kept by the server (SHOP_MOCK=1)
  const viaServer = () => NET.status === 'online' && NET.authed && (SHOP.mode() === 'chain' || serverMock());
  const lockMsg = it => ((it.minTier || 0) > SHOP.myTier() ? 'Requires ' + TIER_N(it.minTier) : '');

  // ---- catalog (data/shop_items.json, built from contracts/items.json by tools/build_shop_catalog.js)
  SHOP.ready = fetch('data/shop_items.json').then(r => r.json()).then(j => { SHOP.items = j.items; SHOP.slots = j.slots; for (const it of j.items) SHOP.byId.set(it.id, it); SHOP.meta = j; }).catch(e => console.warn('shop catalog', e));

  // ---- local mock store (no server, or no wallet): ownership and worn items in this browser only
  const MK = 'chog_shop_mock';
  const loadMock = () => { try { return JSON.parse(localStorage.getItem(MK) || 'null') || { owned: {}, equip: {} }; } catch (e) { return { owned: {}, equip: {} }; } };
  const saveMock = m => { try { localStorage.setItem(MK, JSON.stringify(m)); } catch (e) { /* private mode */ } };
  function applyLocalMock() { if (SHOP.mode() !== 'mock' || serverMock()) return; const m = loadMock(); SHOP.owned = m.owned; SHOP.equip = m.equip; SHOP.dressMe(); }

  // ================================================================== cosmetics on the Chog (extra slots only)
  const live = new Set();                                              // dressed Chogs that need a tick
  function undress(root) {
    const e = root && root.userData.shopCos; if (!e) return;
    for (const n of e.nodes) { if (n.parent) n.parent.remove(n); n.traverse(o => { const i = hiddenInNormal.indexOf(o); if (i >= 0) hiddenInNormal.splice(i, 1); if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); }
    live.delete(e); root.userData.shopCos = null;
  }
  function finish(g) {                                                 // outlines and mask layers for a solid part; the glows stay unoutlined and out of the normal pass
    addOutlines(g);
    g.traverse(o => { if (o.isMesh && !(o.userData && (o.userData.isHull || o.userData.noNormal))) o.layers.enable(1); if (o.userData && (o.userData.isHull || o.userData.noNormal) && !hiddenInNormal.includes(o)) hiddenInNormal.push(o); });
  }
  const glowOf = (geo, c, op) => glowM(geo, c, op);
  function auraNode(it, ticks) {
    const L = it.look, g = new THREE.Group(), bits = [];
    const ring = glowOf(new THREE.RingGeometry(0.44, 0.6, 28), L.c, 0.6); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
    const ring2 = glowOf(new THREE.RingGeometry(0.62, 0.68, 28), L.c2, 0.35); ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.025; g.add(ring2);
    if (L.style === 'flare') {
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, c = glowOf(new THREE.BoxGeometry(0.07, 0.5, 0.07), i % 2 ? L.c2 : L.c, 0.75); c.position.set(Math.cos(a) * 0.52, 0.25, Math.sin(a) * 0.52); g.add(c); bits.push([c, i, 'candle']); }
    } else {
      for (let i = 0; i < 9; i++) { const s = glowOf(new THREE.SphereGeometry(0.035, 5, 4), i % 2 ? L.c2 : L.c, 0.85); g.add(s); bits.push([s, i, 'spark']); }
    }
    ticks.push(t => {
      ring.material.opacity = 0.5 + 0.15 * Math.sin(t * 2.4); ring2.scale.setScalar(1 + 0.06 * Math.sin(t * 2.4 + 1));
      for (const [b, i, k] of bits) {
        if (k === 'candle') { const f = 0.6 + 0.6 * Math.abs(Math.sin(t * 3 + i * 1.7)); b.scale.y = f; b.position.y = 0.25 * f; }
        else { const p = (t * 0.4 + i / 9) % 1, a = i * 2.1 + t * 0.5; b.position.set(Math.cos(a) * 0.5, 0.05 + p * 1.4, Math.sin(a) * 0.5); b.material.opacity = 0.85 * (1 - p); b.scale.setScalar(0.8 + p * 0.5); }
      }
    });
    return g;
  }
  function heldNode(it, ticks) {
    const L = it.look, g = new THREE.Group(); g.position.set(-0.17, -0.4, 0.15);
    if (L.style === 'cup') {
      g.add(cm(new THREE.CylinderGeometry(0.065, 0.05, 0.12, 10), L.c, 0, 0, 0)); g.add(cm(new THREE.CylinderGeometry(0.068, 0.068, 0.045, 10), L.c2, 0, 0, 0));
      const top = cm(new THREE.CylinderGeometry(0.058, 0.058, 0.01, 10), 0x4a2a14, 0, 0.062, 0); g.add(top);
      const h = cm(new THREE.TorusGeometry(0.035, 0.012, 5, 8), L.c, 0.075, 0, 0); g.add(h);
      const puffs = []; for (let i = 0; i < 3; i++) { const s = glowOf(new THREE.SphereGeometry(0.03, 6, 5), 0xffffff, 0.4); g.add(s); puffs.push(s); }
      ticks.push(t => puffs.forEach((s, i) => { const p = (t * 0.6 + i / 3) % 1; s.position.set(Math.sin(t + i * 2) * 0.02, 0.08 + p * 0.2, 0); s.material.opacity = 0.4 * (1 - p); s.scale.setScalar(0.7 + p); }));
    } else {
      const gem = cm(new THREE.OctahedronGeometry(0.1), L.c, 0, 0.02, 0); gem.scale.set(1, 1.35, 1); gem.material.emissive = new THREE.Color(0x2a8aa0); g.add(gem);
      const halo = glowOf(new THREE.SphereGeometry(0.17, 8, 6), L.c2, 0.22); halo.position.y = 0.02; g.add(halo);
      ticks.push(t => { gem.rotation.y = t * 1.4; halo.material.opacity = 0.18 + 0.1 * Math.sin(t * 3); });
    }
    return g;
  }
  function eyesNode(it, ticks) {
    const L = it.look, g = new THREE.Group(), mats = [];
    for (const sx of [-1, 1]) {
      const eye = glowOf(new THREE.CircleGeometry(0.075, 14), L.c, 0.9); eye.position.set(sx * 0.125, 0.02, 0.052); g.add(eye); mats.push(eye.material);
      const b = glowOf(new THREE.CylinderGeometry(0.02, 0.03, 0.95, 6), L.c, 0.85); b.rotation.x = Math.PI / 2; b.position.z = 0.475; mats.push(b.material);
      const bg = new THREE.Group(); bg.add(b); bg.position.set(sx * 0.125, 0.02, 0.05); bg.rotation.y = sx * 0.55; g.add(bg);
    }
    ticks.push(t => { for (const m of mats) { if (L.rainbow) m.color.setHSL((t * 0.4) % 1, 0.9, 0.55); else m.opacity = 0.7 + 0.2 * Math.sin(t * 9); } });
    return g;
  }
  // dress(root, cos): cos = { aura, held, badge, plate, eyes } item ids. Replaces what was there; only the three 3D slots live here (badge and plate are HTML on the nameplate).
  SHOP.dress = function (root, cos) {
    if (!root || !root.userData || !root.userData.arms || !SHOP.byId.size) return;
    undress(root); const items = {}; for (const s of ['aura', 'held', 'eyes']) { const it = cos && SHOP.byId.get(cos[s]); if (it && it.slot === s) items[s] = it; }
    if (!Object.keys(items).length) return;
    const e = { root, nodes: [], ticks: [] };
    if (items.aura) { const n = auraNode(items.aura, e.ticks); root.add(n); e.nodes.push(n); finish(n); }
    if (items.held) { const n = heldNode(items.held, e.ticks); root.userData.arms[0].add(n); e.nodes.push(n); finish(n); }
    if (items.eyes) { const n = eyesNode(items.eyes, e.ticks); root.userData.face.add(n); e.nodes.push(n); finish(n); }
    root.userData.shopCos = e; live.add(e);
  };
  animated.push(t => { for (const e of live) { if (!e.root.parent) { live.delete(e); continue; } for (const f of e.ticks) f(t); } });

  // nameplate extras: a badge above the plate and a coloured plate (HTML, in css/shop.css)
  SHOP.plateFx = function (pl, cos) {
    if (!pl || !pl.e) return; const e = pl.e, key = (cos && (cos.badge || 0) + '|' + (cos.plate || 0)) || '';
    if (pl.shopKey === key) return; pl.shopKey = key;
    const old = e.querySelector('.sbadge'); if (old) old.remove(); e.classList.remove('np'); e.style.removeProperty('--np1'); e.style.removeProperty('--np2'); e.style.removeProperty('--npink'); e.style.removeProperty('--npglow');
    const bd = cos && SHOP.byId.get(cos.badge), pn = cos && SHOP.byId.get(cos.plate);
    if (bd && bd.slot === 'badge') { const s = document.createElement('span'); s.className = 'sbadge'; s.textContent = bd.look.icon; s.title = bd.look.label; s.style.setProperty('--bc', bd.look.c); e.appendChild(s); }
    if (pn && pn.slot === 'plate') { e.classList.add('np'); e.style.setProperty('--np1', pn.look.c); e.style.setProperty('--np2', pn.look.c2); e.style.setProperty('--npink', pn.look.ink); if (pn.look.glow) e.style.setProperty('--npglow', pn.look.glow); }
  };
  SHOP.dressMe = function () { if (!GAME.me || !SHOP.byId.size) return; SHOP.dress(GAME.me, SHOP.equip); SHOP.plateFx(PLATES.me, SHOP.equip); };
  SHOP.applyRemote = function (r) { if (!r || !SHOP.byId.size) return; if (r.root) SHOP.dress(r.root, r.cos); if (r.plate) SHOP.plateFx(r.plate, r.cos); };
  SHOP.ready.then(() => { SHOP.dressMe(); for (const r of NET.remotes.values()) SHOP.applyRemote(r); applyLocalMock(); });
  { const orig = GAME.setTraits; GAME.setTraits = function (t) { orig.call(this, t); SHOP.dressMe(); }; }       // a new body gets the worn extras again

  // ================================================================== state from the server
  function onState(m) {
    SHOP.serverMode = m.mode || null; SHOP.serverAddress = m.address || null;
    SHOP.mismatch = !!(SHOP.mode() === 'chain' && m.address && SHOP_CONFIG.shop && m.address.toLowerCase() !== SHOP_CONFIG.shop.toLowerCase());
    if (SHOP.mismatch) console.warn('shop: the server reads a different shop contract than this page; buying is switched off');
    SHOP.owned = m.owned || {}; SHOP.equip = m.equip || {}; SHOP.events = m.events || SHOP.events; SHOP.camera = !!m.camera; SHOP.budget = m.budget || SHOP.budget;
    SHOP.dressMe(); if (SHOP.win) drawWin(); redrawHud();
  }
  const clearState = () => { SHOP.owned = {}; SHOP.equip = {}; SHOP.events = { event: 0, mega: 0 }; SHOP.camera = false; SHOP.budget = { pieces: 0, lights: 0 }; SHOP.dressMe(); applyLocalMock(); if (SHOP.win) drawWin(); };
  SHOP.refresh = function () {
    if (viaServer() || (NET.status === 'online' && NET.authed)) { NET.send({ t: 'shopget' }); return; }
    if (SHOP.mode() === 'chain' && WALLET.account) readOwnedDirect(); else applyLocalMock();
  };
  async function readOwnedDirect() {                                    // no town server: read the balances from the chain ourselves (display only)
    try {
      await SHOP.ready; const ids = SHOP.items.map(i => i.id), r = await rpc('eth_call', [{ to: SHOP_CONFIG.shop, data: SHOP_ABI.balanceOfBatch(ids.map(() => WALLET.account), ids) }, 'latest']);
      if (!r.result) return; const hx = r.result.slice(2), n = parseInt(hx.slice(64, 128), 16), o = {};
      for (let k = 0; k < n; k++) { const v = parseInt(hx.slice(128 + k * 64, 192 + k * 64), 16); if (v > 0) o[ids[k]] = v; }
      SHOP.owned = o; if (SHOP.win) drawWin();
    } catch (e) { /* the server is the main reader */ }
  }
  NET.waiters.add(m => {
    if (m.t === 'welcome') { SHOP.serverMode = m.shop ? m.shop.mode : null; SHOP.serverAddress = m.shop ? m.shop.address : null; }
    else if (m.t === 'shopstate') onState(m);
    else if (m.t === 'authed') setTimeout(() => NET.send({ t: 'shopget' }), 50);
    else if (m.t === 'events') { SHOP.banners = m.list || []; drawBanner(); }
    else if (m.t === 'tipped') { toast(m.name + ' tipped ' + fmt(m.amount) + ' $CHOG'); sfx('coin'); }
    else if (m.t === 'camera') onCamera(m);
  });
  WALLET.on('account', a => { SHOP.chogBal = null; if (!a) clearState(); else { SHOP.refresh(); if (SHOP.mode() === 'chain') readOwnedDirect(); } });
  WALLET.on('owned', () => { if (SHOP.win) drawWin(); });

  // ================================================================== chain: transactions
  async function sendTx(to, data, value) {
    await ensureMonad(WALLET.provider);
    const p = { from: WALLET.account, to, data }; if (value) p.value = '0x' + value.toString(16);
    return WALLET.provider.request({ method: 'eth_sendTransaction', params: [p] });
  }
  async function waitReceipt(hash) {
    for (let k = 0; k < 120; k++) { const r = await rpc('eth_getTransactionReceipt', [hash]); if (r && r.result) { if (r.result.status === '0x1') return r.result; throw new Error('The transaction failed on chain.'); } await sleep(1500); }
    throw new Error('Still pending. Check your wallet; your items appear once it confirms.');
  }
  const call = async (to, data) => { const r = await rpc('eth_call', [{ to, data }, 'latest']); if (r.error) throw new Error(r.error.message); return r.result; };
  const big = h => BigInt(h && h !== '0x' ? h : '0x0');
  async function chogBalance() { SHOP.chogBal = big(await call(SHOP_CONFIG.chog, SHOP_ABI.balanceOf(WALLET.account))); return SHOP.chogBal; }
  async function ensureAllowance(total) {                               // approve the EXACT amount (never unlimited), only when the allowance is lower
    const cur = big(await call(SHOP_CONFIG.chog, SHOP_ABI.allowance(WALLET.account, SHOP_CONFIG.shop)));
    if (cur >= total) return;
    setTx('approving', 'Approve ' + fmt(Number(total / 10n ** 18n)) + ' $CHOG in your wallet…');
    const h = await sendTx(SHOP_CONFIG.chog, SHOP_ABI.approve(SHOP_CONFIG.shop, total));
    setTx('approving', 'Waiting for the approval to confirm…'); await waitReceipt(h);
  }
  async function readChainExtras() {                                    // does the shop have a MON pool? and the live pool price for the quote
    if (!SHOP_CONFIG.shop) return;
    try {
      const pl = await call(SHOP_CONFIG.shop, SHOP_ABI.pool()); SHOP.monOk = big(pl) !== 0n;
      if (SHOP.monOk) {
        const poolAddr = '0x' + pl.slice(-40), z = await call(SHOP_CONFIG.shop, SHOP_ABI.zeroForOne());
        const s0 = await call(poolAddr, SHOP_ABI.slot0()), sq = big('0x' + s0.slice(2, 66));
        SHOP.monPrice = sq > 0n ? sq : null; SHOP.monZeroForOne = big(z) !== 0n;      // zeroForOne = WMON is the pool's token0
        if (!SHOP.monPrice) SHOP.monOk = false;
      }
    } catch (e) { SHOP.monOk = false; }
    if (SHOP.win) drawWin();
  }
  // MON (WMON wei) needed for chogWei of $CHOG. sqrtP = sqrt(token1 / token0) * 2^96. The pool keeps 1 % of the input, then +2 % slippage buffer;
  // the shop sends any surplus $CHOG (and unused WMON) back, so the buffer is not lost.
  const monFor = chogWei => {
    const sq = SHOP.monPrice, q = 2n ** 192n;
    const wmon = SHOP.monZeroForOne ? chogWei * q / (sq * sq) : chogWei * sq * sq / q;   // WMON is token0: P = CHOG per WMON; else P = WMON per CHOG
    return wmon * 102n / 99n;
  };
  const errText = e => (e && e.code === 4001 ? 'Cancelled in the wallet.' : e && e.message ? String(e.message).slice(0, 140) : 'That did not work.');
  function setTx(state, msg, id) { SHOP.tx = { state, msg, id }; if (SHOP.win) drawWin(); }

  // ---- buy: mock (local or server), or $CHOG / MON on chain. Only ever called from a click on Buy.
  SHOP.buy = async function (id, via) {
    const it = SHOP.byId.get(id); if (!it || (SHOP.tx && ['approving', 'buying'].includes(SHOP.tx.state))) return;
    const mode = SHOP.mode();
    if (mode === 'off') { toast('Shop opens soon.'); return; }
    if (!WALLET.account && !(mode === 'mock' && !viaServer())) { toast('Connect your wallet to buy.'); sfx('error'); return; }
    if (lockMsg(it)) { toast(lockMsg(it) + ' to buy this.'); sfx('error'); return; }
    if (it.maxPerWallet && SHOP.qty(id) >= it.maxPerWallet) { toast('You already own this.'); return; }
    try {
      if (mode === 'mock') {
        if (serverMock()) { setTx('buying', 'Buying (test mode)…', id); NET.send({ t: 'shopbuy', id, qty: 1 }); await NET.waitFor(['shopstate', 'roomfail'], 6000); }
        else { const m = loadMock(); m.owned[id] = (m.owned[id] || 0) + 1; saveMock(m); SHOP.owned = m.owned; }
        setTx('confirmed', 'Test purchase: ' + it.name, id); sfx('purchase'); sfx('burn'); SHOP.dressMe(); redrawHud(); return;
      }
      if (SHOP.mismatch) throw new Error('This page and the server use different shops. Try again later.');
      const price = SHOP_ABI.wei(it.priceChog);
      if (via === 'mon') {
        if (!SHOP.monOk) throw new Error('Paying with MON is not available yet.');
        const mon = monFor(price), deadline = Math.floor(Date.now() / 1000) + 300;
        setTx('buying', 'Confirm the purchase in your wallet (' + (Number(mon) / 1e18).toFixed(3) + ' MON)…', id);
        const h = await sendTx(SHOP_CONFIG.shop, SHOP_ABI.buyWithMon(id, 1, price, deadline), mon); setTx('buying', 'Waiting for the transaction to confirm…', id); await waitReceipt(h);
      } else {
        setTx('approving', 'Checking your $CHOG…', id); if (await chogBalance() < price) throw new Error('You need ' + fmt(it.priceChog) + ' $CHOG for this.');
        await ensureAllowance(price);
        setTx('buying', 'Confirm the purchase in your wallet…', id);
        const h = await sendTx(SHOP_CONFIG.shop, SHOP_ABI.buyWithChog(id, 1)); setTx('buying', 'Waiting for the transaction to confirm…', id); await waitReceipt(h);
      }
      setTx('confirmed', it.name + ' is yours. ' + (it.tab === 'decor' ? 'Find it in your room editor.' : ''), id); sfx('purchase'); setTimeout(() => sfx('burn'), 250);
      if (NET.status === 'online' && NET.authed) { NET.send({ t: 'shopnotice' }); } else readOwnedDirect();
      setTimeout(() => SHOP.refresh(), 3500);
    } catch (e) { setTx('failed', errText(e), id); sfx('error'); }
  };
  SHOP.setEquip = async function (slot, id) {
    if (viaServer()) { NET.send({ t: 'equip', slot, id: id || null }); return; }
    if (SHOP.mode() === 'mock') { const m = loadMock(); if (id) m.equip[slot] = id; else delete m.equip[slot]; saveMock(m); SHOP.equip = m.equip; }
    else { if (id) SHOP.equip[slot] = id; else delete SHOP.equip[slot]; toast('Offline: only you see this until the town server is back.'); }
    SHOP.dressMe(); if (SHOP.win) drawWin(); redrawHud();
  };

  // ================================================================== previews
  let sr = null; const prevCache = new Map(), prevQ = [];
  function renderPrev(it) {
    if (!sr) { sr = new THREE.WebGLRenderer({ alpha: false, antialias: true, preserveDrawingBuffer: true }); sr.setSize(200, 200); sr.setClearColor(0xefe6fa, 1); }
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xc7b8ff, 0x9c7a6c, 0.95)); const dl = new THREE.DirectionalLight(0xffd8a0, 1.0); dl.position.set(-3, 4, 4); sc.add(dl);
    let url;
    if (it.tab === 'decor') {
      const d = SPACE.PIECES[it.piece]; if (!d) return '';
      const n0 = noNormalPass.length, g = SPACE.buildParts(d.parts, SPACE.THEMES.studio.pal, null, { anims: [] }); noNormalPass.splice(n0);
      g.traverse(o => { if (o.userData && o.userData.noNormal) o.visible = false; });
      sc.add(g); const b = new THREE.Box3().setFromObject(g), c = b.getCenter(new THREE.Vector3()), r = b.getSize(new THREE.Vector3()).length() * 0.5 * 0.95;
      const cmr = new THREE.OrthographicCamera(-r, r, r, -r, 0.1, 100); cmr.position.copy(c).addScaledVector(CAM_DIR, 30); cmr.lookAt(c); sr.render(sc, cmr);
      url = sr.domElement.toDataURL('image/png'); g.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); return url;
    }
    const c = chog(Object.assign(chogOptionsFromTraits(typeof curTraits === 'function' ? curTraits() : DEFAULT_TRAITS), { scale: 1.0 })); c.rotation.y = it.slot === 'eyes' ? 0 : -0.4; sc.add(c);
    SHOP.dress(c, { [it.slot]: it.id }); const e = c.userData.shopCos; if (e) for (const f of e.ticks) f(1.3);
    c.traverse(o => { if (o.userData && o.userData.noNormal && !(e && e.nodes.some(n => n === o || n.getObjectById(o.id)))) o.visible = false; });
    const cmr = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
    if (it.slot === 'eyes') { cmr.position.set(0, 1.1, 2.6); cmr.lookAt(0, 1.0, 0); } else { cmr.position.set(0, 1.05, 4.2); cmr.lookAt(0, 0.95, 0); }
    sr.render(sc, cmr); url = sr.domElement.toDataURL('image/png');
    undress(c);
    return url;
  }
  function preview(it, img) {
    if (prevCache.has(it.id)) { img.src = prevCache.get(it.id); return; }
    prevQ.push([it, img]); if (prevQ.length > 1) return;
    const next = () => { const j = prevQ[0]; if (!j) return; try { const u = renderPrev(j[0]); prevCache.set(j[0].id, u); j[1].src = u; } catch (e) { console.warn('shop preview', e); } prevQ.shift(); if (prevQ.length) setTimeout(next, 0); }; setTimeout(next, 0);
  }

  // ================================================================== the Shop window
  const TABS = [['decor', 'Decor kits'], ['cosmetic', 'Cosmetics'], ['venue', 'Venue extras']];
  function ensureWin() {
    if (SHOP.win) return SHOP.win;
    const w = el('div'); w.id = 'shop'; document.body.appendChild(w); SHOP.win = w; return w;
  }
  SHOP.open = async function (tab) {
    await SHOP.ready; if (tab) SHOP.tab = tab; ensureWin(); SHOP.tx = null; drawWin(); SHOP.refresh();
    if (SHOP.mode() === 'chain' && WALLET.account) { chogBalance().then(() => SHOP.win && drawWin()).catch(() => { }); }
    readChainExtras();
  };
  SHOP.close = function () { if (SHOP.win) { SHOP.win.remove(); SHOP.win = null; } };
  SHOP.toggle = function () { if (SHOP.win) SHOP.close(); else SHOP.open(); };
  addEventListener('keydown', e => { if (e.code === 'Escape' && SHOP.win && !e.target.matches('input,textarea')) { e.stopPropagation(); SHOP.close(); } }, true);

  function card(it) {
    const c = el('div', 'sc' + (SHOP.owns(it.id) ? ' own' : '')), mode = SHOP.mode(), lock = lockMsg(it), q = SHOP.qty(it.id), maxed = it.maxPerWallet && q >= it.maxPerWallet;
    const pv = el('div', 'pv');
    if (it.slot === 'badge') pv.innerHTML = `<div class="mockplate"><span class="sbadge" style="--bc:${it.look.c}">${it.look.icon}</span><b>Your name</b></div>`;
    else if (it.slot === 'plate') pv.innerHTML = `<div class="mockplate np" style="--np1:${it.look.c};--np2:${it.look.c2};--npink:${it.look.ink};${it.look.glow ? '--npglow:' + it.look.glow : ''}"><i class="dot"></i><b>Your name</b></div>`;
    else if (it.tab === 'venue') pv.innerHTML = `<div class="vicon">${it.extra ? (it.extra.lights ? '💡 +' + it.extra.lights : '🧱 +' + it.extra.pieces) : it.use === 'camera' ? '📹' : '🎆'}</div>`;
    else { const im = document.createElement('img'); im.alt = ''; pv.appendChild(im); preview(it, im); }
    c.appendChild(pv);
    const nm = el('b', 'nm'); nm.textContent = it.name; c.appendChild(nm);
    const ds = el('p', 'ds'); ds.textContent = it.desc; c.appendChild(ds);
    if (lock) c.appendChild(el('span', 'lock', '🔒 ' + lock));
    const pr = el('div', 'pr', `<b>${fmt(it.priceChog)} $CHOG</b><small>about $${usd(it.priceChog)}${SHOP.monOk && SHOP.monPrice ? ' · ' + (Number(monFor(SHOP_ABI.wei(it.priceChog))) / 1e18).toFixed(2) + ' MON' : ''}</small>`); c.appendChild(pr);
    if (q) c.appendChild(el('span', 'owned', '✓ Owned' + (q > 1 ? ' ×' + q : '')));
    const acts = el('div', 'ac'), busy = SHOP.tx && ['approving', 'buying'].includes(SHOP.tx.state);
    const b = el('button', 'sb', maxed ? 'Owned' : mode === 'off' ? 'Opens soon' : q && !it.maxPerWallet ? 'Buy another' : 'Buy');
    b.disabled = !!(maxed || lock || busy || mode === 'off' || SHOP.mismatch); b.title = lock || (mode === 'off' ? 'Shop opens soon' : '');
    if (!WALLET.account && mode !== 'mock') { b.textContent = 'Connect wallet'; b.disabled = mode === 'off'; b.onclick = () => connectFlow(); } else b.onclick = () => SHOP.buy(it.id);
    acts.appendChild(b);
    if (mode === 'chain' && SHOP.monOk && SHOP.monPrice && !maxed && !lock && WALLET.account) { const m = el('button', 'sb ghost', 'Pay with MON'); m.disabled = !!busy; m.onclick = () => SHOP.buy(it.id, 'mon'); acts.appendChild(m); }
    if (it.slot && q) { const on = SHOP.equip[it.slot] === it.id, e = el('button', 'sb ghost', on ? 'Take off' : 'Wear'); e.disabled = !!lock; e.onclick = () => SHOP.setEquip(it.slot, on ? null : it.id); acts.appendChild(e); }
    if (it.tab === 'decor' && q) { const e = el('small', 'hint', 'Place it from My Room → Decorate'); acts.appendChild(e); }
    c.appendChild(acts); return c;
  }
  function drawWin() {
    const w = SHOP.win; if (!w) return; const mode = SHOP.mode(), top = w.querySelector('.body'), keep = top ? top.scrollTop : 0;
    w.innerHTML = ''; const back = el('div', 'back'); back.onclick = e => { if (e.target === back) SHOP.close(); };
    const cardEl = el('div', 'win'), head = el('div', 'head');
    head.innerHTML = '<h2>Shop</h2>'; const bal = el('span', 'bal');
    bal.textContent = mode === 'chain' && WALLET.account && SHOP.chogBal != null ? fmt(Math.floor(Number(SHOP.chogBal / 10n ** 18n))) + ' $CHOG' : ''; head.appendChild(bal);
    const x = el('button', 'x', '×'); x.setAttribute('aria-label', 'Close'); x.onclick = () => SHOP.close(); head.appendChild(x); cardEl.appendChild(head);
    if (mode === 'off') cardEl.appendChild(el('div', 'state soon', '<b>Shop opens soon.</b> Items and prices are final; buying switches on when the shop contract goes live.'));
    else if (mode === 'mock') cardEl.appendChild(el('div', 'state mock', '<b>Test mode.</b> Purchases here are fake and recorded ' + (serverMock() ? 'on the test server' : 'in this browser') + ' only.'));
    else if (SHOP.mismatch) cardEl.appendChild(el('div', 'state bad', 'The page and the server disagree about the shop contract, so buying is paused.'));
    else if (!WALLET.account) cardEl.appendChild(el('div', 'state soon', 'You can look around. Connect a wallet to buy.'));
    const tabs = el('div', 'tabs'); for (const [id, lb] of TABS) { const t = el('button', SHOP.tab === id ? 'on' : '', lb); t.onclick = () => { SHOP.tab = id; SHOP.tx = null; drawWin(); }; tabs.appendChild(t); } cardEl.appendChild(tabs);
    if (SHOP.tx) { const t = el('div', 'tx ' + SHOP.tx.state); t.textContent = ({ approving: '⏳ ', buying: '⏳ ', confirmed: '✅ ', failed: '⚠ ' }[SHOP.tx.state] || '') + SHOP.tx.msg; cardEl.appendChild(t); }
    const bodyEl = el('div', 'body'), grid = el('div', 'grid');
    for (const it of SHOP.items.filter(i => i.tab === SHOP.tab && i.active !== false)) grid.appendChild(card(it)); bodyEl.appendChild(grid);
    if (SHOP.tab === 'venue') bodyEl.appendChild(el('p', 'note', 'Venue extras apply to your own venue (Venues window). Events and the camera are managed there too.'));
    cardEl.appendChild(bodyEl);
    cardEl.appendChild(el('div', 'foot', '90 % of every price is burned, 10 % goes to the team. Items are soulbound NFTs: they stay in your wallet and cannot be traded.'));
    back.appendChild(cardEl); w.appendChild(back); bodyEl.scrollTop = keep;
  }

  // ================================================================== My Chog: what is worn
  SHOP.chogRow = function () {
    const box = el('div', 'shoprow'); box.appendChild(el('h3', '', 'Cosmetics'));
    const have = SHOP.items.filter(i => i.slot && SHOP.owns(i.id));
    if (!have.length) { box.appendChild(el('p', 'sn', mode_() === 'off' ? 'Aura, held item, badge, name plate and laser eyes come from the Shop. It opens soon.' : 'Buy auras, badges and more in the Shop. They are worn on top of your Chog.')); const b = el('button', 'btn ghost', 'Open the Shop'); b.onclick = () => SHOP.open('cosmetic'); box.appendChild(b); return box; }
    for (const s of SHOP.slots || []) {
      const opts = have.filter(i => i.slot === s); if (!opts.length) continue;
      const row = el('label', 'sr'); row.appendChild(el('span', '', SLOT_LABEL[s])); const sel = document.createElement('select'); sel.appendChild(new Option('None', ''));
      for (const o of opts) { const lock = lockMsg(o); const op = new Option(o.name + (lock ? ' (' + lock + ')' : ''), o.id); op.disabled = !!lock; sel.appendChild(op); }
      sel.value = SHOP.equip[s] || ''; sel.onchange = () => SHOP.setEquip(s, sel.value ? +sel.value : null); sel.onkeydown = e => e.stopPropagation(); row.appendChild(sel); box.appendChild(row);
    }
    return box;
  };
  const mode_ = () => SHOP.mode();

  // ================================================================== Venues window: budget, events, security camera
  SHOP.venueExtras = function (m) {
    const box = el('div', 'vsec shopx'); box.appendChild(el('h3', '', 'Shop extras'));
    const ex = (m.template && m.template.extra) || SHOP.budget || { pieces: 0, lights: 0 };
    box.appendChild(el('p', 'vnote', `Extra budget from the Shop: +${ex.pieces || 0} pieces, +${ex.lights || 0} lights (up to +${(SHOP.meta && SHOP.meta.extraCap.pieces) || 120} pieces and +${(SHOP.meta && SHOP.meta.extraCap.lights) || 8} lights).`));
    const open = m.state === 'open', ev = SHOP.events || {};
    const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 40; inp.placeholder = 'Event title, e.g. Green candle party'; inp.value = SHOP.evDraft || ''; inp.oninput = () => { SHOP.evDraft = inp.value; }; inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') inp.blur(); };
    if (ev.event > 0 || ev.mega > 0) {
      box.appendChild(inp); const row = el('div', 'actions');
      const b = el('button', 'btn', 'Announce (24 h)'); b.disabled = !open || !(ev.event > 0); b.title = !open ? 'Open your venue first' : ''; b.onclick = () => startEvent(false); row.appendChild(b);
      if (ev.mega > 0) { const g = el('button', 'btn ghost', 'Mega event'); g.disabled = !open; g.onclick = () => startEvent(true); row.appendChild(g); }
      box.appendChild(row); box.appendChild(el('p', 'vnote', `Event passes left: ${ev.event || 0}${ev.mega ? ', mega: ' + ev.mega : ''}. The title shows in the hotel directory and as a banner in town for 24 hours.`));
    } else { const b = el('button', 'btn ghost', 'Get an Event pass'); b.onclick = () => SHOP.open('venue'); box.appendChild(b); box.appendChild(el('p', 'vnote', 'An event announces your venue in the lobby directory and on a town banner for 24 hours.')); }
    if (SHOP.camera) { const b = el('button', 'btn ghost', 'Open security camera'); b.onclick = () => SHOP.openCamera(); box.appendChild(b); }
    else { const b = el('button', 'btn ghost', 'Get the security camera'); b.onclick = () => SHOP.open('venue'); box.appendChild(b); }
    return box;
  };
  async function startEvent(mega) {
    const title = (SHOP.evDraft || '').trim(); if (title.length < 3) { toast('Give the event a title first.'); return; }
    NET.send({ t: 'eventstart', title, mega }); const r = await NET.waitFor(['events', 'roomfail'], 6000);
    if (r && r.t === 'events') { SHOP.evDraft = ''; toast('Event announced for 24 hours.'); sfx('coin'); redrawHud(); }
  }

  // ---- town banner "Tonight at <venue>: <title>"
  let banner = null, bi = 0;
  function drawBanner() {
    if (!banner) { banner = el('button', 'tonight'); banner.id = 'tonight'; document.body.appendChild(banner); banner.onclick = () => { const e = SHOP.banners[bi % Math.max(1, SHOP.banners.length)]; if (e) toast(e.name + ' is in the Chog Hotel, room #' + e.no + '. Take the elevator.'); }; }
    const inTown = !(typeof ROOM !== 'undefined' && ROOM.active) && !(typeof HOTEL !== 'undefined' && HOTEL.active), list = SHOP.banners;
    if (!list.length || !inTown) { banner.style.display = 'none'; return; }
    const e = list[bi % list.length]; banner.style.display = ''; banner.className = 'tonight' + (e.mega ? ' mega' : '');
    banner.textContent = (e.mega ? '✨ ' : '') + 'Tonight at ' + e.name + ': ' + e.title;
  }
  setInterval(() => { bi++; drawBanner(); }, 6000);
  setInterval(() => { if (banner) drawBanner(); }, 1000);

  // ================================================================== tips
  let tipBtn = null, tipBox = null;
  const venueNow = () => (typeof ROOM !== 'undefined' && ROOM.active && ROOM.kind === 'venue' && !ROOM.mine && ROOM.owner && ROOM.venue ? ROOM.venue : null);
  function closeTip() { if (tipBox) { tipBox.remove(); tipBox = null; } }
  function openTip(v) {
    closeTip(); tipBox = el('div', 'tipbox'); tipBox.innerHTML = '<b></b><small>100 % of a tip goes to the owner.</small><div class="amts"></div><div class="tipst"></div>'; tipBox.querySelector('b').textContent = 'Tip the owner of ' + v.name;
    const amts = tipBox.querySelector('.amts');
    for (const a of [100, 500, 1000]) { const b = el('button', 'sb', fmt(a) + ' $CHOG'); b.onclick = () => doTip(v, a); amts.appendChild(b); }
    const x = el('button', 'sb ghost', 'Close'); x.onclick = closeTip; amts.appendChild(x); document.body.appendChild(tipBox);
  }
  async function doTip(v, amount) {
    if (SHOP.tipping) return; const st = tipBox && tipBox.querySelector('.tipst'), say = t => { if (st) st.textContent = t; };
    const mode = SHOP.mode();
    if (!WALLET.account && mode !== 'mock') { say('Connect your wallet to tip.'); return; }
    SHOP.tipping = true;
    try {
      if (!(NET.status === 'online' && await NET.authenticate())) throw new Error('The town server is needed to announce the tip.');
      let tx = null;
      if (mode === 'chain') {
        const wei = SHOP_ABI.wei(amount); say('Checking your $CHOG…'); if (await chogBalance() < wei) throw new Error('You need ' + fmt(amount) + ' $CHOG.');
        setTx('approving', ''); await ensureAllowance(wei); SHOP.tx = null;
        say('Confirm the tip in your wallet…'); tx = await sendTx(SHOP_CONFIG.shop, SHOP_ABI.tip(ROOM.owner, v.no, wei)); say('Waiting for the transaction to confirm…'); await waitReceipt(tx);
      }
      NET.send({ t: 'tip', venueId: v.id, amount, tx }); sfx('coin'); say('Thank you! Tip sent.'); setTimeout(closeTip, 1500);
    } catch (e) { say(errText(e)); sfx('error'); } finally { SHOP.tipping = false; }
  }
  setInterval(() => {
    const v = venueNow(), show = !!v && SHOP.mode() !== 'off' && !!(WALLET.account || SHOP.mode() === 'mock') && !(typeof ROOM !== 'undefined' && ROOM.mode === 'edit');
    if (!show) { if (tipBtn) { tipBtn.remove(); tipBtn = null; } closeTip(); return; }
    if (!tipBtn) { tipBtn = el('button', 'tipbtn', '🪙 Tip the owner'); tipBtn.onclick = () => { const vv = venueNow(); if (vv) (tipBox ? closeTip() : openTip(vv)); }; document.body.appendChild(tipBtn); }
  }, 500);

  // ================================================================== security camera (the simplest robust option: a live top-down plan of the venue, drawn from the room document the server sends,
  // with every person inside as a moving dot and a name; rendering the room through a second 3D camera was not needed). Scanlines and noise are a CSS overlay.
  let cam = null;
  SHOP.openCamera = function () {
    if (cam) return; if (!(NET.status === 'online')) { toast('The town server is offline.'); return; }
    const w = el('div', 'camwin'); w.innerHTML = '<div class="ch"><b>Security camera</b><span class="rec">● REC</span><button class="x" aria-label="Close">×</button></div><div class="cv"><canvas width="480" height="320"></canvas><div class="scan"></div><div class="noise"></div></div><div class="cf"><span class="who"></span><button class="sb ghost lv" style="display:none">Level 1</button></div>';
    document.body.appendChild(w); cam = { w, cv: w.querySelector('canvas'), level: 1, data: null, players: [] };
    w.querySelector('.x').onclick = SHOP.closeCamera; w.querySelector('.lv').onclick = () => { cam.level = cam.level === 1 ? 2 : 1; w.querySelector('.lv').textContent = 'Level ' + cam.level; drawCam(); };
    NET.send({ t: 'camopen' });
  };
  SHOP.closeCamera = function () { if (!cam) return; NET.send({ t: 'camclose' }); cam.w.remove(); cam = null; };
  function onCamera(m) {
    if (!cam) return;
    if (m.init) { cam.data = m; if (m.levels > 1) cam.w.querySelector('.lv').style.display = ''; cam.w.querySelector('.ch b').textContent = 'Camera: ' + m.name; }
    else { cam.players = m.players || []; cam.w.querySelector('.who').textContent = cam.players.length ? cam.players.map(p => p.name).join(', ') : 'Nobody inside'; }
    drawCam();
  }
  function drawCam() {
    if (!cam || !cam.data) return; const g = cam.cv.getContext('2d'), W = cam.cv.width, H = cam.cv.height, [rw, rd] = cam.data.size, k = Math.min((W - 24) / rw, (H - 24) / rd), ox = W / 2, oy = H / 2;
    g.fillStyle = '#06140e'; g.fillRect(0, 0, W, H); g.save(); g.translate(ox, oy);
    g.strokeStyle = '#2f8a5a'; g.lineWidth = 2; g.strokeRect(-rw * k / 2, -rd * k / 2, rw * k, rd * k);
    g.fillStyle = 'rgba(60,200,120,.12)'; g.fillRect(-rw * k / 2, -rd * k / 2, rw * k, rd * k);
    for (const p of (cam.level === 1 ? cam.data.pieces : cam.data.pieces2) || []) { g.save(); g.translate(p.x * k, p.z * k); g.rotate(-(p.ry || 0) * Math.PI / 180); const w = Math.max(3, p.w * k), d = Math.max(3, p.d * k); g.fillStyle = p.cat === 'floor' ? 'rgba(60,200,120,.10)' : 'rgba(60,200,120,.28)'; g.strokeStyle = 'rgba(90,255,160,.55)'; g.lineWidth = 1; g.fillRect(-w / 2, -d / 2, w, d); g.strokeRect(-w / 2, -d / 2, w, d); g.restore(); }
    g.font = '700 12px monospace'; g.textAlign = 'center';
    for (const p of cam.players) { if (p.l !== cam.level) continue; g.beginPath(); g.arc(p.x * k, p.z * k, 6, 0, 7); g.fillStyle = p.owner ? '#ffd84a' : '#7affb0'; g.fill(); g.strokeStyle = '#04100a'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#c8ffe0'; g.fillText(p.name, p.x * k, p.z * k - 10); }
    g.restore(); g.fillStyle = '#7affb0'; g.font = '700 11px monospace'; g.textAlign = 'left'; g.fillText(new Date().toLocaleTimeString('en-GB') + '  LEVEL ' + cam.level, 8, H - 8);
  }
  setInterval(() => { if (cam) drawCam(); }, 1000);

  // ================================================================== test hooks
  SHOP.test = { mockStore: loadMock, setTx, drawBanner, renderPrev, state: () => ({ mode: SHOP.mode(), owned: SHOP.owned, equip: SHOP.equip, serverMode: SHOP.serverMode }) };
  applyLocalMock();
})();
