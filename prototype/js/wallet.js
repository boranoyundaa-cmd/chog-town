// ===== wallet: connect (EIP-1193 / EIP-6963), Monad network, which Chogs a wallet owns, trait data =====
// No libraries: raw JSON-RPC. Reads go to the public Monad RPC; the wallet is only asked to connect and switch network.
const CHAIN = { id: '0x8f', name: 'Monad', rpc: 'https://rpc.monad.xyz', symbol: 'MON' };           // chain id 143
const NFT_ADDR = '0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763';
const SUPPLY = 1969;
const WALLET = { providers: [], provider: null, account: null, owned: [], scanning: 0, error: null, handlers: {} };
WALLET.on = (ev, fn) => (WALLET.handlers[ev] = WALLET.handlers[ev] || []).push(fn);
const emit = (ev, v) => (WALLET.handlers[ev] || []).forEach(f => f(v));
const pad32 = h => h.replace(/^0x/, '').toLowerCase().padStart(64, '0');

// ---- token table: shipped with the page (data/tokens.json, built by tools/build_tokens.py), never fetched from IPFS at runtime
const TOKENS = {}, OWNERS = {};                          // OWNERS: id -> owner at snapshot time (tools/fetch_owners.py)
const TIERS = { points: {}, venue: [] };                 // venue-tier rules from the header of tokens.json (docs/game/design.md)
WALLET.loadData = async function () {
  try { const r = await fetch('data/owners.json'); if (r.ok) { const j = await r.json(); Object.assign(OWNERS, j.owners || {}); WALLET.ownersAsOf = j.block_time || 0; } } catch (e) { /* optional */ }
  for (const url of ['data/chogs.manual.json', 'data/tokens.json']) {                  // fixtures first, the full table wins
    try {
      const r = await fetch(url); if (!r.ok) continue;
      const j = await r.json(); Object.assign(TOKENS, j.tokens || {});
      if (j.tierPoints) { TIERS.points = j.tierPoints; TIERS.venue = j.venueTiers || []; }
    } catch (e) { /* optional */ }
  }
};
WALLET.dataReady = WALLET.loadData().then(() => { for (const t of Object.values(TOKENS)) { const m = / — (.+)$/.exec(t.name || ''); if (m && t.traits && t.traits.Base === '1:1') t.traits.Legend = m[1]; } }).then(async () => { try { const r = await fetch('data/trait_colors.json'); if (r.ok) { const j = await r.json(); Object.assign(TRAIT_COLORS.Head, j.Head || {}); Object.assign(TRAIT_COLORS.Body, j.Body || {}); } } catch (e) { /* optional: the keyword guesses stay */ } });
// Venue license points: from the token's collection Tier trait; a wallet's venue tier from its total (0 = no Chog, no venue). Call after dataReady.
WALLET.pointsOf = id => (TOKENS[id] && TOKENS[id].traits && TIERS.points[TOKENS[id].traits.Tier]) || 0;
WALLET.venueTier = ids => {
  const points = (ids || []).reduce((s, id) => s + WALLET.pointsOf(id), 0);
  let tier = 0; for (const v of TIERS.venue) if (points >= v.min) tier = v.tier;
  return { points, tier };
};
// Full license view for a set of token ids: points per rarity, the venue tier, and what the next tier needs.
WALLET.license = ids => {
  const by = {}; for (const id of ids || []) { const r = TOKENS[id] && TOKENS[id].traits && TOKENS[id].traits.Tier; if (r) (by[r] = by[r] || []).push(+id); }
  const rows = Object.entries(by).map(([rarity, tokens]) => ({ rarity, tokens, points: tokens.length * (TIERS.points[rarity] || 0) })).sort((a, b) => (TIERS.points[b.rarity] || 0) - (TIERS.points[a.rarity] || 0) || a.rarity.localeCompare(b.rarity));
  const { points, tier } = WALLET.venueTier(ids), nx = TIERS.venue.find(v => v.tier === tier + 1);
  let next = null;
  if (nx) { const need = nx.min - points, r = Object.entries(TIERS.points).filter(([, p]) => p >= need).sort((a, b) => a[1] - b[1])[0]; next = { tier: nx.tier, need, rarity: r ? r[0] : null }; }
  return { points, tier, rows, next, tiers: TIERS.venue };
};
// How many wallets sit in each venue tier, from the owner snapshot (data/owners.json, date in WALLET.ownersAsOf). Call after dataReady.
WALLET.tierStats = () => {
  if (WALLET._stats) return WALLET._stats;
  const wallets = {}; for (const [id, o] of Object.entries(OWNERS)) (wallets[o] = wallets[o] || []).push(id);
  const dist = {}; for (const v of TIERS.venue) dist[v.tier] = 0;
  for (const ids of Object.values(wallets)) { const t = WALLET.venueTier(ids).tier; if (t) dist[t]++; }
  return (WALLET._stats = { dist, total: Object.keys(wallets).length, asOf: WALLET.ownersAsOf || 0 });
};

async function rpc(method, params) {
  for (let k = 0; k < 6; k++) {
    try {
      const r = await fetch(CHAIN.rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Array.isArray(method) ? method : { jsonrpc: '2.0', id: 1, method, params }) });
      if (r.status === 429) { await new Promise(res => setTimeout(res, 800 * (k + 1))); continue; }
      return await r.json();
    } catch (e) { await new Promise(res => setTimeout(res, 500 * (k + 1))); }
  }
  throw new Error('rpc unreachable');
}
const ethCall = async (data) => { const r = await rpc('eth_call', [{ to: NFT_ADDR, data }, 'latest']); if (r.error) throw new Error(r.error.message); return r.result; };
WALLET.balanceOf = async a => parseInt(await ethCall('0x70a08231' + pad32(a)), 16);
WALLET.ownerOf = async id => '0x' + (await ethCall('0x6352211e' + pad32(id.toString(16)))).slice(-40);

WALLET.traitsOf = async function (id) {
  await WALLET.dataReady;
  if (TOKENS[id] && TOKENS[id].traits) return TOKENS[id].traits;
  throw new Error('unknown token ' + id);                                             // callers fall back to the default Chog
};

// ---- which Chogs does this wallet own? snapshot owners (when the dump has them) are verified on-chain; otherwise scan ownerOf 1..1969
WALLET.findOwned = async function (account) {
  await WALLET.dataReady;
  const want = await WALLET.balanceOf(account), acc = account.toLowerCase(), found = [];
  if (!want) return [];
  const cache = (() => { try { return JSON.parse(localStorage.getItem('chog_owned_' + acc) || 'null'); } catch (e) { return null; } })();
  const candidates = new Set([...(cache || []), ...Object.entries(OWNERS).filter(([, o]) => o.toLowerCase() === acc).map(([id]) => +id)]);
  for (const id of candidates) if ((await WALLET.ownerOf(id)).toLowerCase() === acc) found.push(id);
  if (found.length < want) {                                                            // snapshot is stale or empty: scan, 25 calls per request
    WALLET.scanning = 0;
    for (let start = 1; start <= SUPPLY && found.length < want; start += 25) {
      const ids = []; for (let i = start; i < Math.min(start + 25, SUPPLY + 1); i++) if (!found.includes(i)) ids.push(i);
      const res = await rpc(ids.map((id, i) => ({ jsonrpc: '2.0', id: i, method: 'eth_call', params: [{ to: NFT_ADDR, data: '0x6352211e' + pad32(id.toString(16)) }, 'latest'] })));
      for (const x of res) if (x.result && ('0x' + x.result.slice(-40)).toLowerCase() === acc) found.push(ids[x.id]);
      WALLET.scanning = Math.min(1, (start + 25) / SUPPLY); emit('scan', WALLET.scanning);
      await new Promise(r => setTimeout(r, 150));
    }
    WALLET.scanning = 0;
  }
  try { localStorage.setItem('chog_owned_' + acc, JSON.stringify(found)); } catch (e) { /* private mode */ }
  return found.sort((a, b) => a - b);
};

// ---- providers (EIP-6963 announcements, plus the legacy window.ethereum)
addEventListener('eip6963:announceProvider', e => { if (!WALLET.providers.some(p => p.info.uuid === e.detail.info.uuid)) { WALLET.providers.push(e.detail); emit('providers', WALLET.providers); } });
dispatchEvent(new Event('eip6963:requestProvider'));
// every wallet the page can see: the EIP-6963 announcements, plus the legacy `window.ethereum` (and its `providers` list when several wallets share it), each once
const nameOfProvider = p => (p.isRabby ? 'Rabby' : p.isMetaMask ? 'MetaMask' : p.isCoinbaseWallet ? 'Coinbase Wallet' : p.isPhantom ? 'Phantom' : p.isBraveWallet ? 'Brave Wallet' : p.isOkxWallet || p.isOKExWallet ? 'OKX Wallet' : 'Browser wallet');
WALLET.available = () => {
  const out = [...WALLET.providers], seen = new Set(out.map(e => e.provider)), eth = window.ethereum;
  for (const p of eth ? (Array.isArray(eth.providers) && eth.providers.length ? eth.providers : [eth]) : []) {
    if (seen.has(p)) continue; const nm = nameOfProvider(p);
    if (out.some(e => e.info.name === nm && nm !== 'Browser wallet')) continue;            // the same wallet announced under its own name
    seen.add(p); out.push({ info: { name: nm, uuid: 'legacy-' + nm, icon: '' }, provider: p });
  }
  return out;
};
WALLET.refresh = async () => { dispatchEvent(new Event('eip6963:requestProvider')); await new Promise(r => setTimeout(r, 350)); return WALLET.available(); };      // ask again and give the wallets a moment to answer

async function ensureMonad(provider) {
  const cur = await provider.request({ method: 'eth_chainId' });
  if (cur === CHAIN.id) return true;
  try { await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN.id }] }); return true; }
  catch (e) {
    if (e && (e.code === 4902 || /unrecognized|not added/i.test(e.message || ''))) {
      await provider.request({ method: 'wallet_addEthereumChain', params: [{ chainId: CHAIN.id, chainName: CHAIN.name, nativeCurrency: { name: 'Monad', symbol: CHAIN.symbol, decimals: 18 }, rpcUrls: [CHAIN.rpc] }] });
      return true;
    }
    throw e;
  }
}
async function adopt(provider, account) {
  WALLET.provider = provider; WALLET.account = account; WALLET.error = null;
  try { localStorage.setItem('chog_wallet', WALLET.chosen || '1'); } catch (e) { /* ignore */ }     // saved first, so a reload resumes even if the scan below fails
  emit('account', account);
  WALLET.owned = await WALLET.findOwned(account); emit('owned', WALLET.owned);
}
WALLET.connect = async function (entry) {
  try {
    const picked = entry || WALLET.available()[0] || {}, provider = picked.provider; if (!provider) throw new Error('No wallet found'); WALLET.chosen = picked.info && picked.info.name;
    const accs = await provider.request({ method: 'eth_requestAccounts' });
    try { await ensureMonad(provider); } catch (e) { /* reading works on any chain; only switching failed */ }
    provider.on && provider.on('accountsChanged', a => { if (a[0]) adopt(provider, a[0]); else WALLET.disconnect(); });
    await adopt(provider, accs[0]);
  } catch (e) { WALLET.error = e.code === 4001 ? 'Request was declined in the wallet.' : (e.message || String(e)); emit('error', WALLET.error); }
};
WALLET.disconnect = function () { WALLET.provider = null; WALLET.account = null; WALLET.owned = []; try { localStorage.removeItem('chog_wallet'); } catch (e) { /* ignore */ } emit('account', null); emit('owned', []); };
// silently resume a previous session (eth_accounts shows no popup)
WALLET.resume = async function () {
  let want; try { want = localStorage.getItem('chog_wallet'); } catch (e) { return false; }
  if (!want) return false;                                                                          // holds the name of the wallet picked last time ('1' when it had none)
  let list = [], e;
  for (let k = 0; k < 6 && !e; k++) { list = await WALLET.refresh(); e = list.find(x => x.info.name === want) || (want === '1' && list[0]); }   // wallet extensions can announce themselves late
  e = e || list[0]; if (!e) return false;
  WALLET.chosen = e.info.name;
  const accs = await e.provider.request({ method: 'eth_accounts' }); if (accs[0]) { e.provider.on && e.provider.on('accountsChanged', a => { if (a[0]) adopt(e.provider, a[0]); else WALLET.disconnect(); }); await adopt(e.provider, accs[0]); return true; }
  return false;
};
