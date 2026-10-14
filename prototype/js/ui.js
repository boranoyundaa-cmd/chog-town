// ===== UI: the HUD (skins: warm cards by default, neon, storybook; see docs/art/art-direction.md): state, windows, wallet, minimap, action bar =====
const SKINS_OK = ['warm', 'neon', 'storybook'];
const UI = { sel: null, open: null, demo: false, toastT: 0, skin: (() => { try { const k = localStorage.getItem('chog_skin'); return k && SKINS_OK.includes(k) ? k : 'warm'; } catch (e) { return 'warm'; } })() };
const DEMO_IDS = [1700, 1557, 409, 1808, 1000, 1942];
// venue license copy. The rules (points per rarity, tier thresholds) come from data/tokens.json via WALLET.license; the tier names are placeholders.
const TIER_NAME = { 1: 'Ser', 2: 'Fren', 3: 'Whale', 4: 'Legend' };
const TIER_SIZE = { 1: 'Room', 2: 'Suite', 3: 'Floor', 4: 'Penthouse' };
const TIER_PERK = { 1: '12 inside · game tables', 2: '20 inside · stage + DJ booth + music', 3: '32 inside · two levels with a VIP lounge', 4: '50 inside · whole floor, VIP lounge, guard at the lift' };       // what each venue tier adds (server/hotel.js TEMPLATES)
const TIER_COL = { 1: '#8a8497', 2: '#3a8ad8', 3: '#9a5ad8', 4: '#e8a620' };
const RARITY_COL = { Common: '#8a8497', Uncommon: '#4aa84a', Rare: '#3a8ad8', Epic: '#9a5ad8', Legendary: '#e8a620' };
const tierPill = (t, txt) => `<span class="tp" style="--tc:${TIER_COL[t]}">${txt || 'Tier ' + t}</span>`;
const aOrAn = w => (/^[AEIOU]/i.test(w) ? 'an ' : 'a ') + w;
function tierReq(v) {                                                              // "1 Rare, or 3 Chogs": the smallest single rarity that reaches the threshold, or that many Chogs
  if (v.min <= 1) return 'any 1 Chog';
  const r = Object.entries(TIERS.points).filter(([, p]) => p >= v.min).sort((a, b) => a[1] - b[1])[0];
  return (r ? '1 ' + r[0] + ', or ' : '') + v.min + ' Chogs';
}
const hex = c => '#' + c.toString(16).padStart(6, '0');
const shortAddr = a => a.slice(0, 6) + '…' + a.slice(-4);
const inRoom = () => typeof ROOM !== 'undefined' && ROOM.active;
const inHotel = () => typeof HOTEL !== 'undefined' && HOTEL.active;                         // hotel.js loads after this file                      // room.js loads after this file
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

// ---- menu: id, label, key, icon (inline SVG so the look does not depend on the OS emoji font)
const ICONS = {
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/>',
  bag: '<path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  game: '<rect x="3" y="7" width="18" height="11" rx="5"/><path d="M8 10v5M5.5 12.5h5"/><circle cx="15.5" cy="11.5" r=".9"/><circle cx="18" cy="14" r=".9"/>',
};
const icon = (n, size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;
const MENU = [
  { id: 'chog', label: 'My Chog', key: 'C', icon: 'person' }, { id: 'room', label: 'My Room', key: 'R', icon: 'home' },
  { id: 'shop', label: 'Shop', key: 'M', icon: 'bag' }, { id: 'venues', label: 'Venues', key: 'V', icon: 'pin' },
  { id: 'settings', label: 'Settings', key: 'O', icon: 'gear' }, { id: 'games', label: 'Games', key: 'G', icon: 'game' },
];
// interface skins: warm modern cards (default), neon night, storybook (the first look). cls goes on #ui and on <body> (nameplates live outside #ui)
const SKINS = { warm: { label: 'Warm cards', cls: 'warm', sub: 'Soft cream cards, Chog purple' }, neon: { label: 'Neon night', cls: 'neon', sub: 'Dark glass, cyan and pink lines' }, storybook: { label: 'Storybook', cls: '', sub: 'Wood and parchment' } };
function applySkin() {
  const k = SKINS[UI.skin] || SKINS.warm, root = document.getElementById('ui'); if (root) root.className = k.cls;
  document.body.classList.remove('warm', 'neon'); if (k.cls) document.body.classList.add(k.cls);
}
function menuClick(m) { if (m.soon) { toast(m.label + ' is coming soon'); return; } if (m.id === 'room') { ROOM.toggle(); return; } if (m.id === 'games') { if (typeof GAMES !== 'undefined') GAMES.toggle(); return; } if (m.id === 'shop') { if (typeof SHOP !== 'undefined') SHOP.toggle(); return; } UI.open = UI.open === m.id ? null : m.id; render(); }

// ---- portraits: render a Chog once into a PNG with a second, hidden renderer
const portraits = {};
let _pr;
function portrait(traits) {
  const key = JSON.stringify(traits); if (portraits[key]) return portraits[key];
  if (!_pr) { _pr = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); _pr.setSize(320, 320); }
  const sc = new THREE.Scene(), cm2 = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
  sc.add(new THREE.HemisphereLight(0xc7b8ff, 0x9c7a6c, 0.95)); const dl = new THREE.DirectionalLight(0xffd8a0, 1.0); dl.position.set(-3, 4, 4); sc.add(dl);
  const c = chog(Object.assign(chogOptionsFromTraits(traits), { scale: 1.0 })); c.rotation.y = -0.4; sc.add(c);
  c.traverse(o => { if (o.userData && o.userData.noNormal) o.visible = false; });
  cm2.position.set(0, 1.05, 4.2); cm2.lookAt(0, 0.95, 0); _pr.render(sc, cm2);
  return (portraits[key] = _pr.domElement.toDataURL('image/png'));
}

// ---- the profile picture: a holder sees their own NFT (the official art, kept as a small file per token: tools/fetch_portraits.py), everyone else a drawn guest Chog.
// The 3D character is the game body, not the picture of who you are; it is only the fallback when a portrait file is missing.
const GUEST_ART = 'data/portraits/guest.webp';   // the collection's own profile picture (OpenSea collection logo), shown for players without a Chog
const artOf = id => (id && TOKENS[id] ? 'data/portraits/' + id + '.webp' : GUEST_ART);

// ---- state -> Chog
const traitsFor = id => (id && TOKENS[id] ? TOKENS[id].traits : null);
async function chooseChog(id, demo = false) {
  UI.sel = id; UI.demo = !!demo;
  const tr = id ? await WALLET.traitsOf(id).catch(() => null) : null;
  GAME.setTraits(tr || DEFAULT_TRAITS); if (!tr) UI.sel = null;
  try { localStorage.setItem('chog_sel', UI.sel && !demo ? String(UI.sel) : ''); } catch (e) { /* ignore */ }
  render(); NET.appear(UI.sel && !demo ? UI.sel : null);
}
const curTraits = () => (UI.sel && traitsFor(UI.sel)) || DEFAULT_TRAITS;
const isHolder = () => !!UI.sel;
const playerName = () => (typeof NET !== 'undefined' && NET.authed && NET.username ? NET.username : isHolder() ? 'Chog #' + UI.sel : (typeof NET !== 'undefined' && NET.status === 'online' && NET.name) || 'Guest Chog');
GAME.nameFn = () => playerName();
const playerSub = () => (isHolder() ? (UI.demo ? 'Demo preview' : curTraits().Tier || 'Chog') : 'Free to play');
// the venue license counts every Chog of the connected wallet (not only the selected one); a demo preview counts just that one token
const licenseIds = () => (!isHolder() ? [] : UI.demo ? [UI.sel] : WALLET.owned);
function licenseCard() {
  const ids = licenseIds(), L = WALLET.license(ids), t = L.tier, maxP = L.tiers[L.tiers.length - 1].min; if (!t) return null;
  const c = el('div', 'lic'), n = ids.length;
  const ticks = L.tiers.map(v => `<u style="left:${v.min / maxP * 100}%"><span${v.tier === L.tiers.length ? ' class="end"' : ''}>${TIER_NAME[v.tier]}</span></u>`).join('');
  const nx = L.next ? (L.next.need === 1 ? `<b>1 more point</b> to ${aOrAn(TIER_NAME[L.next.tier])}: any other Chog in this wallet.` : `<b>${L.next.need} more points</b> to ${aOrAn(TIER_NAME[L.next.tier])}: ${aOrAn(L.next.rarity)} Chog, or ${L.next.need} more Chogs in this wallet.`) : 'Top tier reached.';
  c.innerHTML = `<div class="lh"><h3>Venue license</h3>${tierPill(t, 'Tier ' + t + ' · ' + TIER_NAME[t])}</div>
    <div class="pts"><b>${L.points}</b>points from ${n} Chog${n > 1 ? 's' : ''}${UI.demo ? ' (demo preview)' : ''}</div>
    ${L.rows.map(r => `<div class="lr"><span class="d" style="--tc:${RARITY_COL[r.rarity] || '#8a8497'}"></span><span>${r.tokens.length === 1 ? 'Chog #' + r.tokens[0] + ' · ' + r.rarity : r.tokens.length + ' × ' + r.rarity}</span><b>+${r.points}</b></div>`).join('')}
    <div class="bar" style="--tc:${TIER_COL[t]}"><i style="width:${Math.min(L.points, maxP) / maxP * 100}%"></i>${ticks}</div><div class="next">${nx}</div>`;
  return c;
}
function toast(msg) { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.style.opacity = 1; clearTimeout(UI.toastT); UI.toastT = setTimeout(() => t.style.opacity = 0, 3600); }

// ---- username: one unique name per wallet, claimed by signing; venue guest lists use it
function usernameRow() {
  const r = el('div', 'unrow'), cur = NET.authed ? NET.username : null;
  const i = document.createElement('input'); i.type = 'text'; i.maxLength = 16; i.placeholder = cur ? 'Change username' : 'Choose a username'; i.value = UI.nameDraft || ''; i.oninput = () => { UI.nameDraft = i.value; };
  i.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') b.click(); if (e.key === 'Escape') i.blur(); };
  const b = el('button', 'btn ghost', cur ? 'Change' : 'Claim'); b.onclick = async () => { if (await NET.claimName(i.value)) UI.nameDraft = ''; render(); };
  r.appendChild(el('small', '', cur ? 'Username: ' + cur : 'Pick a name others can find you by (free)')); const row = el('div', 'unin'); row.appendChild(i); row.appendChild(b); r.appendChild(row); return r;
}

// ---- the My Chog card (same structure for every concept, each stylesheet dresses it)
function card(onClose) {
  const tr = curTraits(), o = chogOptionsFromTraits(tr), holder = isHolder();
  const c = el('div', 'card hit' + (holder ? ' holder' : ''));
  const hero = el('div', 'hero'); hero.style.setProperty('--bg', hex(o.bg));
  hero.innerHTML = `<img alt="" src="${holder ? artOf(UI.sel) : GUEST_ART}"><span class="tier" style="--tier:${holder ? hex(o.tier) : '#6a5a8a'}">${holder ? tr.Tier || 'Common' : 'Guest'}</span>${onClose ? '<button class="x" aria-label="Close">×</button>' : ''}`;
  if (onClose) hero.querySelector('.x').onclick = onClose;
  if (holder) hero.querySelector('img').onerror = e => { e.target.onerror = null; e.target.src = portrait(tr); };                // no portrait file for this token: the 3D head
  c.appendChild(hero);
  c.appendChild(el('h2', '', playerName()));
  if (WALLET.account && typeof NET !== 'undefined' && NET.status === 'online') c.appendChild(usernameRow());
  c.appendChild(el('div', 'sub', holder ? (UI.demo ? 'Demo preview of a holder Chog' : 'Your Genesis Chog') : 'Free default Chog. Hold a Chog NFT to play as your own.'));
  if (holder) { const chips = el('div', 'chips'); for (const k of ['Skin', 'Body', 'Head', 'Eyes', 'Mouth', 'Aura', 'Accessory']) if (tr[k]) chips.appendChild(el('span', 'chip', `<b>${k}</b>${tr[k]}`)); c.appendChild(chips); }
  const perk = (ok, txt, soon) => `<div class="perk ${ok ? '' : 'off'}"><i>${ok ? '✓' : '🔒'}</i><span>${txt}${soon ? ' <small>(soon)</small>' : ''}</span></div>`;
  if (typeof SHOP !== 'undefined') c.appendChild(SHOP.chogRow());                              // cosmetics bought in the shop, worn in the extra slots (shop.js)
  if (typeof GAMES !== 'undefined') c.appendChild(GAMES.trophyRow());                       // trophies and badges from the mini-games (games.js)
  const lic = holder ? licenseCard() : null; if (lic) c.appendChild(lic);                // holders: the license card; free players see the venue ladder in Venues
  c.appendChild(el('div', 'perks', `<h3>${holder ? 'Holder perks' : 'Unlocked by holding a Chog'}</h3>` +
    perk(holder, 'Play as your own Chog, with its traits') + (holder ? '' : perk(false, 'A venue license: run your own club, shop or gallery', true))));
  if (WALLET.scanning > 0) c.appendChild(el('div', 'scan', `<i style="width:${Math.round(WALLET.scanning * 100)}%"></i>`));
  if (WALLET.owned.length > 1) {
    const d = el('div', 'demo', 'Your Chogs'), row = el('div', 'row');
    for (const id of WALLET.owned) { const b = el('button', 'mini' + (UI.sel === id && !UI.demo ? ' on' : '')); const t = traitsFor(id); if (t) b.style.backgroundImage = `url(${artOf(id)}), url(${portrait(t)})`; b.title = '#' + id; b.onclick = () => chooseChog(id); row.appendChild(b); }
    d.appendChild(row); c.appendChild(d);
  }
  if (!WALLET.owned.length) {
    const d = el('div', 'demo', 'No Chog? Preview what holders get'), row = el('div', 'row');
    const g = el('button', 'mini guest' + (!UI.sel ? ' on' : ''), 'Guest'); g.onclick = () => chooseChog(null); row.appendChild(g);
    for (const id of DEMO_IDS) { const t = traitsFor(id); if (!t) continue; const b = el('button', 'mini' + (UI.sel === id && UI.demo ? ' on' : '')); b.style.backgroundImage = `url(${artOf(id)}), url(${portrait(t)})`; b.title = '#' + id; b.onclick = () => chooseChog(id, true); row.appendChild(b); }
    d.appendChild(row); c.appendChild(d);
  }
  const act = el('div', 'actions');
  if (WALLET.account) { const b = el('button', 'btn ghost', 'Disconnect'); b.onclick = () => { WALLET.disconnect(); chooseChog(null); }; act.appendChild(b); }
  else { const b = el('button', 'btn', cx('buttons', 'connect', 'Connect wallet')); b.onclick = connectFlow; act.appendChild(b); }
  if (!holder) { const a = el('a', 'btn ghost', 'Get a Chog'); a.href = 'https://opensea.io/collection/chog-genesis'; a.target = '_blank'; a.rel = 'noopener'; act.appendChild(a); }
  c.appendChild(act);
  return c;
}

// ---- Venues: what each license tier gives and where you stand; holders manage their own venue here (venue.js).
function venuesCard(onClose) {
  const c = el('div', 'card hit venues'), holder = isHolder() && !!WALLET.license(licenseIds()).tier, L = WALLET.license(holder ? licenseIds() : []), cur = holder ? L.tier : 0, S = WALLET.tierStats();
  c.innerHTML = `<button class="x" aria-label="Close">×</button><h2>Venues</h2><div class="sub">Your license decides what kind of place you can run</div>
    <div class="mine">${holder ? `${tierPill(cur, 'Tier ' + cur + ' · ' + TIER_NAME[cur])}<b>${L.points} points</b><small>${UI.demo ? 'Demo preview' : TIER_NAME[cur] + ' unlocked'}</small>` : '<b>Free player</b><small>Hold a Chog to open a venue</small>'}</div>
    <div class="ladder">${[...L.tiers].reverse().map(v => `<div class="rung ${v.tier === cur ? 'cur' : v.tier < cur ? '' : 'lock'}" style="--tc:${TIER_COL[v.tier]}"><div class="rk">${v.tier}</div>
      <div><b>${TIER_NAME[v.tier]}</b><small>${v.min} point${v.min > 1 ? 's' : ''}: ${tierReq(v)}</small><small class="pk">${TIER_SIZE[v.tier]} · ${TIER_PERK[v.tier]}</small></div>
      <div class="rs">${S.total ? `${S.dist[v.tier]} of ${S.total.toLocaleString('en-US')}<br>wallets` : ''}<i>${v.tier === cur ? '★' : v.tier < cur ? '✓' : icon('lock', 18)}</i></div></div>`).join('')}</div>
    <div class="note">${S.asOf ? 'Wallet counts: snapshot of ' + new Date(S.asOf * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '. ' : ''}</div><div class="actions"></div>`;
  c.querySelector('.x').onclick = onClose;
  const act = c.querySelector('.actions');
  if (holder && typeof VENUE !== 'undefined') {
    c.insertBefore(VENUE.section(), c.querySelector('.note'));
    if (!VENUE.info && !VENUE.busy && !VENUE.tried && WALLET.account) { VENUE.tried = true; setTimeout(() => VENUE.refresh(), 0); }
  } else if (!holder) {
    if (!WALLET.account) { const b = el('button', 'btn', cx('buttons', 'connect', 'Connect wallet')); b.onclick = connectFlow; act.appendChild(b); }
    const a = el('a', 'btn ghost', 'Get a Chog'); a.href = 'https://opensea.io/collection/chog-genesis'; a.target = '_blank'; a.rel = 'noopener'; act.appendChild(a);
  }
  return c;
}

// ---- Settings: interface skin and time of day
function settingsCard(onClose) {
  const c = el('div', 'card hit settings');
  c.appendChild(el('h2', '', cx('buttons', 'settings', 'Settings'))); const x = el('button', 'x', '×'); x.setAttribute('aria-label', 'Close'); x.onclick = onClose; c.appendChild(x);
  c.appendChild(el('h3', 'sect', 'Interface style')); const sk = el('div', 'skins');
  for (const id of SKINS_OK) { const b = el('button', 'opt skin-' + id + (UI.skin === id ? ' on' : ''), `<i class="sw"><u></u><u></u><u></u></i><b>${SKINS[id].label}</b><small>${SKINS[id].sub}</small>`); b.onclick = () => { UI.skin = id; try { localStorage.setItem('chog_skin', id); } catch (e) { /* ignore */ } applySkin(); render(); }; sk.appendChild(b); }
  c.appendChild(sk);
  if (typeof AUDIO !== 'undefined') {                                                                  // sound: three volumes and a mute switch (AUDIO keeps them)
    c.appendChild(el('h3', 'sect', 'Sound'));
    for (const [k, lb] of [['master', 'Master'], ['music', 'Music'], ['sfx', 'Effects']]) {
      const row = el('div', 'timerow'), nm = el('span', 'tl', lb), v = el('span', 'tl', ''), sl = document.createElement('input'); nm.style.cssText = 'width:62px;text-align:left'; row.style.marginTop = '6px';
      sl.type = 'range'; sl.min = 0; sl.max = 100; sl.step = 1; sl.value = Math.round(AUDIO.settings()[k] * 100); v.textContent = sl.value;
      sl.oninput = () => { AUDIO.setVolume(k, +sl.value / 100); v.textContent = sl.value; }; sl.onchange = () => AUDIO.sfx('click');
      row.appendChild(nm); row.appendChild(sl); row.appendChild(v); c.appendChild(row);
    }
    const mu = el('button', 'btn' + (AUDIO.settings().muted ? '' : ' ghost'), AUDIO.settings().muted ? 'Sound is off (click to turn on)' : 'Mute all sound'); mu.style.margin = '10px 16px 0';
    mu.onclick = () => { AUDIO.mute(!AUDIO.settings().muted); render(); }; c.appendChild(mu);
  }
  c.appendChild(el('h3', 'sect', 'Welcome tips')); const tb = el('button', 'btn ghost', 'Show the tips again'); tb.style.margin = '0 12px'; tb.onclick = () => { TOUR.restart(); closeWin(); }; c.appendChild(tb);
  c.appendChild(el('h3', 'sect', 'Time of day'));
  const seg = el('div', 'seg'), real = DAY.mode === 'real', save = () => { try { localStorage.setItem('chog_time', JSON.stringify({ mode: DAY.mode, hour: DAY.fixedHour })); } catch (e) { /* ignore */ } };
  const b1 = el('button', 'btn' + (real ? '' : ' ghost'), 'Real time'), b2 = el('button', 'btn' + (!real ? '' : ' ghost'), 'Choose a time');
  b1.onclick = () => { DAY.setMode('real'); save(); render(); }; b2.onclick = () => { DAY.setMode('fixed', DAY.hour); save(); render(); };
  seg.appendChild(b1); seg.appendChild(b2); c.appendChild(seg);
  const fmt = h => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60) % 60; return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
  const row = el('div', 'timerow'), lab = el('span', 'tl', fmt(DAY.hour)), sl = document.createElement('input');
  sl.type = 'range'; sl.min = 0; sl.max = 23.75; sl.step = 0.25; sl.value = DAY.hour; sl.disabled = real;
  sl.oninput = () => { DAY.setMode('fixed', +sl.value); lab.textContent = fmt(+sl.value); save(); };
  row.appendChild(sl); row.appendChild(lab); c.appendChild(row);
  c.appendChild(el('div', 'note', real ? 'The town follows your own clock: golden light at dawn and dusk, bright by day, neon at night.' : 'Drag to preview the town at any hour. Switch back to Real time to follow your clock.'));
  return c;
}

// ---- wallet
// a modal that stays until closed (a toast is too easy to miss, and the HUD redraws under it)
function walletModal(title, build) {
  document.querySelectorAll('#ui .modal.walletm').forEach(x => x.remove());
  const m = el('div', 'modal walletm hit'), box = el('div', 'card'); box.appendChild(el('h2', '', title)); box.firstChild.style.margin = '16px 16px 4px';
  const x = el('button', 'x', '×'); x.setAttribute('aria-label', 'Close'); x.onclick = () => m.remove(); box.appendChild(x); build(box, () => m.remove());
  m.appendChild(box); m.onclick = e => { if (e.target === m) m.remove(); }; document.getElementById('ui').appendChild(m); return m;
}
const note = txt => { const p = el('p', 'wnote'); p.textContent = txt; return p; };
async function connectFlow() {
  const list = await WALLET.refresh();
  if (!list.length) {
    walletModal('No wallet found', (box, close) => {
      box.appendChild(note('This browser has no crypto wallet. Install one, then reload this page. You can keep playing as a guest meanwhile.'));
      for (const [nm, url] of [['Rabby', 'https://rabby.io'], ['MetaMask', 'https://metamask.io/download']]) { const a = el('a', 'btn ghost wal', 'Get ' + nm); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; box.appendChild(a); }
      const r = el('button', 'btn wal', 'I installed one, reload'); r.onclick = () => location.reload(); box.appendChild(r);
    }); return;
  }
  const go = async entry => {
    const m = walletModal('Connecting…', box => box.appendChild(note('Check your wallet: it asks to share your address. This does not cost anything.')));
    const before = WALLET.account; await WALLET.connect(entry); m.remove();
    if (!WALLET.account && WALLET.error) walletModal('Could not connect', (box, close) => { box.appendChild(note(WALLET.error)); const r = el('button', 'btn wal', 'Try again'); r.onclick = () => { close(); connectFlow(); }; box.appendChild(r); });
    else if (WALLET.account && WALLET.account !== before) { /* the account handler says "Connected" */ }
  };
  if (list.length === 1) { go(list[0]); return; }
  walletModal('Choose a wallet', (box, close) => {
    for (const p of list) { const b = el('button', 'btn ghost wal', (p.info.icon ? `<img src="${p.info.icon}" width="22" height="22" style="vertical-align:middle;margin-right:8px;border-radius:6px">` : '') + p.info.name); b.onclick = () => { close(); go(p); }; box.appendChild(b); }
  });
}
function walletButton(cls = 'btn') {
  if (WALLET.account) { const p = el('button', cls + ' ghost wallet hit', `<span class="dot"></span>${shortAddr(WALLET.account)}`); p.onclick = () => menuClick(MENU[0]); return p; }
  const b = el('button', cls + ' wallet hit', cx('buttons', 'connect', 'Connect wallet')); b.onclick = connectFlow; return b;
}

// ---- location + minimap (rotated to match the isometric view: screen up = world -x -z)
function locationName() {
  if (inHotel()) return HOTEL.title() + ' · ' + HOTEL.where();
  if (inRoom()) return ROOM.title();
  const p = GAME.me ? GAME.me.position : { x: 0, z: 0 };
  for (const b of CITY.buildings) if (Math.abs(p.x - b.x) < b.w / 2 + 1.3 && Math.abs(p.z - b.z) < b.d / 2 + 1.3) return b.name;
  for (const r of CITY.roads || []) if (Math.abs((r.axis === 'z' ? p.z : p.x) - r.at) < CITY.road / 2 + 0.3) return r.name;
  for (const a of CITY.areas || []) if (p.x >= a.x0 && p.x <= a.x1 && p.z >= a.z0 && p.z <= a.z1) return a.name;
  return 'Downtown Chog';
}
function drawMinimap(cv) {
  if (inHotel()) return HOTEL.drawMap(cv);
  if (inRoom()) return ROOM.drawMap(cv);
  const S = cv.width, g = cv.getContext('2d'), VIEW = 46, k = S / VIEW, R = Math.SQRT1_2, N = UI.skin === 'neon', RW = CITY.road;      // a window of about 46 m round the player
  const C = GAME.me ? GAME.me.position : { x: 0, z: 0 }, P = (x, z) => [S / 2 + ((x - C.x) - (z - C.z)) * R * k, S / 2 + ((x - C.x) + (z - C.z)) * R * k];
  g.clearRect(0, 0, S, S);
  const poly = (pts, col) => { g.beginPath(); pts.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fillStyle = col; g.fill(); };
  const rect = (x, z, hw, hd, col) => poly([[x - hw, z - hd], [x + hw, z - hd], [x + hw, z + hd], [x - hw, z + hd]], col);
  rect(0, 0, HALF, HALF, N ? '#5a4a86' : '#d9cfc0');
  rect(-12.75, 21.25, 18.25, 10.25, N ? '#3a6a5a' : '#a8d890'); if (CITY.plaza) rect(CITY.plaza.x, CITY.plaza.z, 10.5, 10.5, N ? '#6a5a96' : '#ece2d2');
  for (const r of CITY.roads || []) r.axis === 'z' ? rect(0, r.at, HALF, RW / 2, N ? '#2d2548' : '#8d8a9c') : rect(r.at, 0, RW / 2, HALF, N ? '#2d2548' : '#8d8a9c');
  for (const b of CITY.buildings) rect(b.x, b.z, b.w / 2, b.d / 2, N ? '#' + new THREE.Color(b.color).multiplyScalar(0.8).getHexString() : b.color);
  if (typeof NET !== 'undefined') for (const r of NET.remotes.values()) if (r.root) { const [a, b] = P(r.root.position.x, r.root.position.z); g.beginPath(); g.arc(a, b, 3, 0, 7); g.fillStyle = '#7ad89a'; g.strokeStyle = '#1a0a2e'; g.lineWidth = 1.2; g.fill(); g.stroke(); }
  if (GAME.me) {                                                                    // the player: a gold arrow pointing the way it faces
    const [a, b] = P(GAME.me.position.x, GAME.me.position.z), ry = GAME.me.rotation.y, dx = Math.sin(ry), dz = Math.cos(ry), [ex, ey] = [(dx - dz) * R, (dx + dz) * R];
    g.save(); g.translate(a, b); g.rotate(Math.atan2(ey, ex) + Math.PI / 2); g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(0, 2); g.lineTo(-5, 5); g.closePath();
    g.fillStyle = '#ffd84a'; g.strokeStyle = '#1a0a2e'; g.lineWidth = 2; g.stroke(); g.fill(); g.restore();
  }
}
function minimap(size) { const cv = el('canvas', 'minimap'); cv.width = cv.height = size * 2; cv.style.width = cv.style.height = size + 'px'; return cv; }
setInterval(() => { for (const cv of document.querySelectorAll('canvas.minimap')) drawMinimap(cv); for (const n of document.querySelectorAll('.locname')) n.textContent = locationName(); }, 120);

// ---- small shared HUD pieces
const hint = () => el('div', 'hint', inHotel() ? HOTEL.hint() : inRoom() ? ROOM.hint() : 'Click to walk · WASD move · Wheel zoom · Enter chat · C My Chog · R My Room');
// the chat box is built once and re-attached on every render(), so the log, the draft and the focus survive HUD rebuilds
let _chat = null;
function refreshChat() {
  if (!_chat) return;
  const log = _chat.querySelector('.log'), stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 40;
  log.innerHTML = '';
  for (const l of NET.log.slice(-80)) {
    const p = el('p', l.kind === 'sys' ? 'sys' : l.mine ? 'mine' : '');
    if (l.kind === 'sys') p.textContent = l.text;
    else { const b = el('b'); b.textContent = l.name; if (!l.mine) b.onclick = () => NET.openCard(l.id); p.appendChild(b); p.appendChild(document.createTextNode(' ' + l.text)); }
    log.appendChild(p);
  }
  if (stick) log.scrollTop = log.scrollHeight;
  const on = NET.status === 'online', inp = _chat.querySelector('input');
  _chat.querySelector('.tabs .on').textContent = inHotel() ? 'Hotel' : inRoom() ? 'Room' : 'Town';
  _chat.querySelector('.count').textContent = on ? NET.online() + ' in town' : NET.status === 'connecting' ? 'Connecting…' : 'Offline';
  inp.disabled = !on; _chat.classList.toggle('off', !on); inp.placeholder = on ? 'Press Enter to chat' : 'Chat is offline';
}
function chatBox() {
  if (!_chat) {
    _chat = el('div', 'chat hit', '<div class="tabs"><span class="on">Town</span><span class="count"></span></div><div class="log"></div><div class="in"><input autocomplete="off" spellcheck="false"></div>');
    const inp = _chat.querySelector('input'); inp.maxLength = NET.maxChat;
    inp.onkeydown = e => {
      e.stopPropagation();                                                              // typing must not move the Chog or open windows
      if (e.key === 'Enter') { if (inp.value.trim()) NET.say(inp.value); inp.value = ''; NET.draft = ''; inp.blur(); }
      else if (e.key === 'Escape') inp.blur();
    };
    inp.oninput = () => { NET.draft = inp.value; };
    NET.refreshChat = refreshChat;
  }
  _chat.querySelector('input').value = NET.draft; refreshChat();
  return _chat;
}
// a small card for another player: report / mute
function playerCard() {
  const r = NET.remotes.get(NET.card); if (!r) return null;
  const c = el('div', 'pcard paper hit', '<button class="x" aria-label="Close">×</button><h3></h3><small></small><div class="acts"></div>');
  c.querySelector('h3').textContent = r.name; c.querySelector('small').textContent = r.token ? 'Chog holder · #' + r.token : 'Free Chog';
  const im = el('img', 'art'); im.alt = ''; im.src = artOf(r.token); im.onerror = () => { im.onerror = null; im.src = GUEST_ART; }; c.insertBefore(im, c.firstChild.nextSibling);      // their NFT (or the guest drawing) beside the name
  c.querySelector('.x').onclick = () => NET.closeCard();
  const acts = c.querySelector('.acts'), muted = NET.isMuted(r);
  const vb = el('button', 'btn ghost', 'Invite home'); vb.title = 'Invite this player to your Home'; vb.onclick = () => { NET.invite(r.id); NET.closeCard(); }; acts.appendChild(vb);
  const mb = el('button', 'btn ghost', muted ? 'Unmute' : cx('buttons', 'mute', 'Mute')); mb.onclick = () => { if (muted) { NET.unmute(r); NET.sys(r.name + ' is unmuted.'); } else NET.mute(r); NET.closeCard(); };
  const rb = el('button', 'btn ghost', cx('buttons', 'report', 'Report'));
  rb.onclick = () => { if (rb.dataset.sure) { NET.report(r.id, 'chat/behaviour'); NET.closeCard(); } else { rb.dataset.sure = 1; rb.textContent = 'Confirm report'; } };
  if (typeof GAMES !== 'undefined') { const gb = el('button', 'btn', 'Challenge'); gb.title = 'Challenge this player to a game'; gb.onclick = () => GAMES.challengePlayer(r); acts.insertBefore(gb, acts.firstChild); }
  acts.appendChild(mb); acts.appendChild(rb);
  return c;
}
// a small card for a resident: role, one line from them, and an action for service NPCs (Juno replays the tips)
function cx(group, key, dflt) { return typeof CULTURE !== 'undefined' && CULTURE.ui[group] && CULTURE.ui[group][key] || dflt; }          // button, error and toast texts from culture_data.js
function npcCard() {
  const r = typeof NPC !== 'undefined' && NPC.card; if (!r) return null;
  const c = el('div', 'pcard npc paper hit', '<button class="x" aria-label="Close">×</button><h3></h3><small></small><p class="say"></p><div class="acts"></div>');
  c.querySelector('h3').textContent = r.name; c.querySelector('small').textContent = (r.role || 'Resident') + ' · Chog Hotel resident'; c.querySelector('.say').textContent = '“' + r.cardLine + '”';
  if (r.cardSrc) { const sm = el('small', 'src'); sm.textContent = r.cardSrc; c.querySelector('.say').after(sm); }      // a cameo's line: where it comes from, in small print
  if (r.cardNote) { const sm = el('small', 'src'); sm.style.opacity = .55; sm.textContent = r.cardNote; c.querySelector('.acts').before(sm); }
  c.querySelector('.x').onclick = () => NPC.closeCard();
  const a = NPC.actionFor(r), acts = c.querySelector('.acts'); if (a) { const b = el('button', 'btn', a.label); b.onclick = a.run; acts.appendChild(b); }
  if (typeof GAMES !== 'undefined') { const gb = el('button', 'btn', 'Challenge'); gb.title = 'Play a two-player game against this resident (NPC)'; gb.onclick = () => GAMES.challengeNpc(r); acts.appendChild(gb); }
  const cb = el('button', 'btn ghost', 'Bye'); cb.onclick = () => NPC.closeCard(); acts.appendChild(cb);
  return c;
}
// an invitation to somebody's Home: go or not now (a Home is private, this is the way in)
function inviteCards() {
  const now = Date.now(); NET.invites = NET.invites.filter(i => i.exp > now); if (!NET.invites.length) return null;
  const w = el('div', 'invwrap');
  for (const i of NET.invites.slice(-3)) {
    const c = el('div', 'invcard paper hit', '<b></b><small>invites you to their Home</small><div class="acts"></div>'); c.querySelector('b').textContent = i.from;
    const a = c.querySelector('.acts'), go = el('button', 'btn', 'Go'); go.onclick = () => NET.acceptInvite(i.owner); const no = el('button', 'btn ghost', 'Not now'); no.onclick = () => NET.dismissInvite(i.owner); a.appendChild(go); a.appendChild(no); w.appendChild(c);
  }
  return w;
}
const toastEl = () => { const t = el('div', ''); t.id = 'toast'; return t; };
const dock = (cls, withLabels) => { const d = el('div', cls); for (const m of MENU) { const b = el('button', 'dk hit' + (m.soon ? ' soon' : '') + (UI.open === m.id ? ' on' : ''), `<span class="ic">${icon(m.icon, 26)}</span>${withLabels ? `<span class="lb">${m.label}</span>` : ''}<span class="kb">${m.key}</span>`); b.title = m.label; b.onclick = () => menuClick(m); d.appendChild(b); } return d; };

const closeWin = () => { UI.open = null; render(); };
function meBadge() {
  const tr = curTraits(), o = chogOptionsFromTraits(tr), lt = isHolder() ? WALLET.venueTier(licenseIds()).tier : 0;
  const b = el('button', 'me hit', `<span class="av" style="background-image:url(${isHolder() ? artOf(UI.sel) : GUEST_ART})${isHolder() ? ', url(' + portrait(tr) + ')' : ''};--bg:${hex(o.bg)}"></span><span class="nm"><b>${playerName()}</b><small>${playerSub()}</small></span>${lt ? tierPill(lt) : ''}`);
  b.onclick = () => menuClick(MENU[0]); return b;
}
function render() {
  const root = document.getElementById('ui'); root.innerHTML = ''; applySkin();
  root.appendChild(meBadge());
  const tr = el('div', 'topright'), mm = el('div', 'mmwrap'); mm.appendChild(minimap(150)); mm.appendChild(el('div', 'loc', '<span class="locname">Chog Plaza</span>')); tr.appendChild(mm); tr.appendChild(walletButton('btn')); root.appendChild(tr);
  root.appendChild(chatBox()); root.appendChild(dock('dock', true)); root.appendChild(hint());
  if (inRoom()) root.appendChild(ROOM.hud());
  if (inHotel()) root.appendChild(HOTEL.hud());
  if (typeof TOUR !== 'undefined') root.appendChild(TOUR.hud());
  const w = el('div', 'win' + (['chog', 'settings', 'venues'].includes(UI.open) ? ' open' : '') + (UI.open === 'venues' ? ' venues' : ''));
  w.appendChild(UI.open === 'settings' ? settingsCard(closeWin) : UI.open === 'venues' ? venuesCard(closeWin) : card(closeWin)); root.appendChild(w);
  const pc = playerCard() || npcCard(); if (pc) root.appendChild(pc);
  const iv = inviteCards(); if (iv) root.appendChild(iv);
  root.appendChild(toastEl());
}
// the HUD is laid out for a 1440x810 window and scaled with the window height
function fitUI() { document.getElementById('ui').style.zoom = Math.max(0.8, Math.min(1.6, innerHeight / 810)); }
addEventListener('resize', fitUI);
addEventListener('keydown', e => { if (e.target.matches && e.target.matches('input,textarea')) return; if (e.code === 'KeyC') menuClick(MENU[0]); if (e.code === 'KeyV') menuClick(MENU[3]); if (e.code === 'KeyR' && typeof ROOM !== 'undefined' && !ROOM.editing()) menuClick(MENU[1]); if (e.code === 'KeyO') menuClick(MENU[4]); if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey && !e.altKey) menuClick(MENU[2]); if (e.code === 'Escape') { if (NET.card) NET.closeCard(); else if (typeof NPC !== 'undefined' && NPC.card) NPC.closeCard(); else if (UI.open) { UI.open = null; render(); } }
  if ((e.code === 'Enter' || e.code === 'NumpadEnter') && _chat) { const i = _chat.querySelector('input'); if (!i.disabled) { e.preventDefault(); i.focus(); } } });

(async function initUI() {
  const root = el('div'); root.id = 'ui'; document.body.appendChild(root);
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'css/ui.css'; document.head.appendChild(css);
  await WALLET.dataReady;
  if (document.readyState === 'loading') await new Promise(r => addEventListener('DOMContentLoaded', r));   // the first render needs net.js, room.js and tour.js, which load after this file (slow connections hit this)
  fitUI(); render();
  WALLET.on('account', a => { if (a) toast('Connected ' + shortAddr(a)); else NET.logout(); render(); });
  WALLET.on('scan', () => render());
  WALLET.on('error', m => { if (!document.querySelector('#ui .modal.walletm')) toast(/gas/i.test(m) ? cx('errors', 'gas', m) : /not found|no wallet|install/i.test(m) ? cx('errors', 'walletNotFound', m) : /rate.?limit|too many/i.test(m) ? cx('errors', 'rateLimited', m) : m); });
  WALLET.on('owned', async ids => {
    if (!ids.length) { if (WALLET.account) toast('No Chog found in this wallet. You can still play as a Guest Chog.'); render(); return; }
    let want = ids[0]; try { const s = +localStorage.getItem('chog_sel'); if (ids.includes(s)) want = s; } catch (e) { /* ignore */ }
    toast(ids.length > 1 ? `You hold ${ids.length} Chogs` : `Welcome back, Chog #${want}`); await chooseChog(want);
  });
  WALLET.resume();
  const as = QS.get('as'); if (as) await chooseChog(+as, true);                        // ?as=1700 previews a token without a wallet
  if (QS.has('open')) { UI.open = ['venues', 'settings'].includes(QS.get('open')) ? QS.get('open') : 'chog'; render(); }   // ?open=venues|settings|1
})();
