// Generates contracts/deploy.html: a self-contained browser page to deploy ChogShop with your own wallet.
// Usage: forge build && node tools/make_deploy_page.js
// The page never asks for a private key; the wallet (MetaMask/Rabby) signs every transaction.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const art = JSON.parse(fs.readFileSync(path.join(root, 'out', 'ChogShop.sol', 'ChogShop.json'), 'utf8'));
const itemsJson = JSON.parse(fs.readFileSync(path.join(root, 'items.json'), 'utf8'));

const bytecode = art.bytecode.object.startsWith('0x') ? art.bytecode.object : '0x' + art.bytecode.object;
const items = itemsJson.items.map((it) => ({
  id: it.id,
  name: it.name,
  price: (BigInt(it.priceChog) * 10n ** 18n).toString(), // wei, as Deploy.s.sol
  active: !!it.active,
  minTier: it.minTier,
  maxPerWallet: it.maxPerWallet,
}));

const config = {
  chainId: 143,
  chainName: 'Monad Mainnet',
  rpc: 'https://rpc.monad.xyz',
  explorer: 'https://monadscan.com',
  chog: '0x350035555E10d9AfAF1566AaebfCeD5BA6C27777',
  team: '0xb36Dd9f235eF6a5DC3B193C493D2Ce2b7874454F',
  chogNft: '0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763',
  chogNftTokenId: 1700,
  pool: '0x116e7D070f1888B81E1E0324F56d6746B2D7d8f1',
  wmon: '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A',
  factory: '0x6B5F564339DbAD6b780249827f2198a841FEB7F3',
  poolFee: 10000,
  capTotal: (2000000n * 10n ** 18n).toString(), // same defaults as Deploy.s.sol
  capWallet: (20000n * 10n ** 18n).toString(),
  uri: 'https://chog.town/items/{id}.json',
  chunk: 12, // items per setItems tx
  abi: art.abi,
  bytecode,
  items,
};

const html = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Deploy ChogShop</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; max-width: 760px; margin: 24px auto; padding: 0 16px; color: #1a1a1a; background: #fafafa; }
  h1 { font-size: 22px; } h2 { font-size: 17px; margin: 0 0 6px; }
  .step { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 14px 16px; margin: 14px 0; }
  .step.locked { opacity: .5; }
  button { font: inherit; padding: 6px 14px; border-radius: 6px; border: 1px solid #555; background: #eee; cursor: pointer; margin: 4px 6px 4px 0; }
  button:disabled { cursor: not-allowed; opacity: .5; }
  code, .mono { font-family: ui-monospace, Consolas, monospace; font-size: 13px; word-break: break-all; }
  .status { margin-top: 6px; white-space: pre-wrap; }
  .ok { color: #0a7a2f; } .warn { color: #a05a00; } .err { color: #b00020; }
  table { border-collapse: collapse; font-size: 13px; } td, th { border: 1px solid #ddd; padding: 2px 8px; text-align: left; }
</style>
</head>
<body>
<h1>Deploy ChogShop (Monad mainnet)</h1>
<p>Everything is signed by your own wallet. This page never asks for a private key or seed phrase. Nothing is sent until you click a button and confirm in the wallet. The deploying address becomes the shop admin (owner).</p>

<div class="step" id="s1">
  <h2>1. Connect wallet</h2>
  <button id="b1">Connect wallet / switch to Monad</button>
  <div class="status" id="t1"></div>
</div>

<div class="step locked" id="s2">
  <h2>2. Deploy ChogShop</h2>
  <button id="b2" disabled>Deploy</button>
  <div class="status" id="t2"></div>
</div>

<div class="step locked" id="s3">
  <h2>3. setPool (pay with MON)</h2>
  <button id="b3" disabled>Set pool</button>
  <div class="status" id="t3"></div>
</div>

<div class="step locked" id="s4">
  <h2>4. Load items and daily caps</h2>
  <div id="itemsInfo"></div>
  <button id="b4" disabled>Send setItems (all chunks), then setCaps</button>
  <div class="status" id="t4"></div>
</div>

<div class="step locked" id="s5">
  <h2>5. Verify</h2>
  <button id="b5" disabled>Read back from chain</button>
  <div class="status" id="t5"></div>
</div>

<p><button id="reset">Forget saved shop address</button></p>

<script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.4/ethers.umd.min.js"></script>
<script>
const CFG = __CONFIG__;
const $ = (id) => document.getElementById(id);
let provider, signer, me, shopAddr;
const LS = 'chogshop.deploy.address';

function say(id, msg, cls) { const e = $(id); e.className = 'status ' + (cls || ''); e.textContent = msg; }
function sayHtml(id, html) { const e = $(id); e.className = 'status'; e.innerHTML = html; }
function unlock(n, on) { const s = $('s' + n); s.classList.toggle('locked', !on); $('b' + n).disabled = !on; }
function txLink(h) { return CFG.explorer + '/tx/' + h; }
function short(a) { return a.slice(0, 8) + '...' + a.slice(-6); }
function same(a, b) { return a.toLowerCase() === b.toLowerCase(); }
function fmtMon(w) { return ethers.formatEther(w) + ' MON'; }
function errMsg(e) { return (e && (e.shortMessage || e.reason || e.message)) || String(e); }

async function estimate(txReq) {
  const gas = await provider.estimateGas(txReq);
  const fee = await provider.getFeeData();
  const price = fee.maxFeePerGas || fee.gasPrice || 0n;
  return { gas, cost: gas * price };
}

// Estimate, show it, then ask the wallet to sign. Returns the receipt.
async function sendWithEstimate(statusId, label, txReq) {
  say(statusId, label + ': estimating gas...');
  const est = await estimate({ ...txReq, from: me });
  const info = label + ': estimated gas ' + est.gas.toString() + ' (about ' + fmtMon(est.cost) + '). Confirm in your wallet...';
  say(statusId, info);
  const tx = await signer.sendTransaction({ ...txReq, gasLimit: est.gas * 12n / 10n });
  say(statusId, info + '\nSent: ' + tx.hash + '\nWaiting for confirmation...');
  const rc = await tx.wait();
  if (rc.status !== 1) throw new Error('transaction reverted: ' + tx.hash);
  return rc;
}

async function switchChain() {
  const hex = '0x' + CFG.chainId.toString(16);
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] });
  } catch (e) {
    if (e && (e.code === 4902 || e.code === -32603)) {
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{
        chainId: hex, chainName: CFG.chainName, rpcUrls: [CFG.rpc],
        nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
        blockExplorerUrls: [CFG.explorer] }] });
    } else throw e;
  }
}

function shop() { return new ethers.Contract(shopAddr, CFG.abi, signer); }

function setShop(a) {
  shopAddr = a;
  try { localStorage.setItem(LS, a); } catch (e) {}
  unlock(3, true); unlock(4, true); unlock(5, true);
}

// ---- step 1
$('b1').onclick = async () => {
  try {
    if (!window.ethereum) { say('t1', 'No wallet found. Install MetaMask or Rabby and reload.', 'err'); return; }
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    await switchChain();
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    me = await signer.getAddress();
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== CFG.chainId) throw new Error('wrong chain ' + net.chainId + ', expected ' + CFG.chainId);
    const bal = await provider.getBalance(me);
    let out = 'Connected: ' + me + '\nChain: ' + net.chainId + '\nBalance: ' + fmtMon(bal) + '  (a full run needs about 1 MON)';
    let cls = 'ok';
    if (!same(me, CFG.team)) {
      out += '\nWARNING: this is not the TEAM address (' + CFG.team + '). The deploying address becomes the shop admin (owner), not the team address. Fees still go to TEAM. Continue only if you want this address as admin.';
      cls = 'warn';
    }
    try {
      const nft = new ethers.Contract(CFG.chogNft, ['function ownerOf(uint256) view returns (address)'], provider);
      const o = await nft.ownerOf(CFG.chogNftTokenId);
      out += '\nChog #' + CFG.chogNftTokenId + ' owner: ' + o + (same(o, CFG.team) ? ' (still TEAM)' : ' (NOT TEAM anymore)');
    } catch (e) { out += '\nCould not read ownerOf(' + CFG.chogNftTokenId + '): ' + errMsg(e); }
    say('t1', out, cls);
    unlock(2, true);
    let saved = null;
    try { saved = localStorage.getItem(LS); } catch (e) {}
    if (saved && ethers.isAddress(saved)) {
      const code = await provider.getCode(saved);
      if (code && code !== '0x') {
        setShop(saved);
        say('t2', 'Resumed saved shop: ' + saved + '\n' + CFG.explorer + '/address/' + saved, 'ok');
      }
    }
  } catch (e) { say('t1', 'Failed: ' + errMsg(e), 'err'); }
};

// ---- step 2
$('b2').onclick = async () => {
  try {
    if (shopAddr && !confirm('A shop is already saved (' + shopAddr + '). Deploy another one anyway?')) return;
    $('b2').disabled = true;
    const f = new ethers.ContractFactory(CFG.abi, CFG.bytecode, signer);
    const dep = await f.getDeployTransaction(CFG.chog, CFG.team, CFG.uri, me);
    const rc = await sendWithEstimate('t2', 'Deploy', { to: null, data: dep.data });
    setShop(rc.contractAddress);
    say('t2', 'Deployed. Tx ' + rc.hash + '\nShop address: ' + rc.contractAddress + '\n' + txLink(rc.hash), 'ok');
  } catch (e) { say('t2', 'Failed: ' + errMsg(e), 'err'); }
  $('b2').disabled = false;
};

// ---- step 3
$('b3').onclick = async () => {
  try {
    const c = shop();
    const data = c.interface.encodeFunctionData('setPool', [CFG.pool, CFG.wmon, CFG.factory, CFG.poolFee]);
    const rc = await sendWithEstimate('t3', 'setPool', { to: shopAddr, data });
    say('t3', 'Pool set. Tx ' + rc.hash + '\n' + txLink(rc.hash), 'ok');
  } catch (e) { say('t3', 'Failed: ' + errMsg(e), 'err'); }
};

// ---- step 4
(function () {
  const rows = CFG.items.map((i) => '<tr><td>' + i.id + '</td><td>' + i.name + '</td><td>' + ethers.formatEther(i.price) + '</td><td>' + i.minTier + '</td><td>' + i.maxPerWallet + '</td><td>' + i.active + '</td></tr>').join('');
  $('itemsInfo').innerHTML = '<p>' + CFG.items.length + ' items in chunks of ' + CFG.chunk + '. Caps: ' + ethers.formatEther(CFG.capTotal) + ' CHOG/day total, ' + ethers.formatEther(CFG.capWallet) + ' per wallet.</p><details><summary>Show items</summary><table><tr><th>id</th><th>name</th><th>CHOG</th><th>tier</th><th>max</th><th>active</th></tr>' + rows + '</table></details>';
})();
$('b4').onclick = async () => {
  try {
    const c = shop();
    let log = '';
    for (let i = 0; i < CFG.items.length; i += CFG.chunk) {
      const part = CFG.items.slice(i, i + CFG.chunk);
      const data = c.interface.encodeFunctionData('setItems', [
        part.map((x) => x.id), part.map((x) => x.price), part.map((x) => x.active),
        part.map((x) => x.minTier), part.map((x) => x.maxPerWallet)]);
      const rc = await sendWithEstimate('t4', log + 'setItems ' + (i + 1) + '-' + (i + part.length), { to: shopAddr, data });
      log += 'setItems ' + (i + 1) + '-' + (i + part.length) + ' done: ' + rc.hash + '\n';
    }
    const data = c.interface.encodeFunctionData('setCaps', [CFG.capTotal, CFG.capWallet]);
    const rc = await sendWithEstimate('t4', log + 'setCaps', { to: shopAddr, data });
    say('t4', log + 'setCaps done: ' + rc.hash + '\nAll items and caps are set.', 'ok');
  } catch (e) { say('t4', 'Failed (re-clicking repeats chunks, which is harmless): ' + errMsg(e), 'err'); }
};

// ---- step 5
$('b5').onclick = async () => {
  try {
    const c = shop();
    const [pool, team, owner, capT, capW, uri] = await Promise.all([c.pool(), c.team(), c.owner(), c.dailyCapTotal(), c.dailyCapPerWallet(), c.uri(1)]);
    const ids = [CFG.items[0].id, CFG.items[Math.floor(CFG.items.length / 2)].id, CFG.items[CFG.items.length - 1].id];
    let out = 'pool():  ' + pool + (same(pool, CFG.pool) ? '  OK' : '  MISMATCH') +
      '\nteam():  ' + team + (same(team, CFG.team) ? '  OK' : '  MISMATCH') +
      '\nowner(): ' + owner + (me && same(owner, me) ? '  OK (connected wallet)' : '  differs from connected wallet') +
      '\ncaps: ' + ethers.formatEther(capT) + ' / ' + ethers.formatEther(capW) + ' CHOG' + '\nuri: ' + uri;
    let good = same(pool, CFG.pool) && same(team, CFG.team) && me && same(owner, me) && capT.toString() === CFG.capTotal;
    for (const id of ids) {
      const it = await c.items(id);
      const want = CFG.items.find((x) => x.id === id);
      const ok = it.priceChog.toString() === want.price && it.active === want.active;
      good = good && ok;
      out += '\nitem ' + id + ': ' + ethers.formatEther(it.priceChog) + ' CHOG, active=' + it.active + (ok ? '  OK' : '  MISMATCH');
    }
    out += good ? '\n\nDone: shop address = ' + shopAddr + ', copy it to Claude.' : '\n\nSome checks did not match, see above. Shop address = ' + shopAddr;
    say('t5', out, good ? 'ok' : 'warn');
  } catch (e) { say('t5', 'Failed: ' + errMsg(e), 'err'); }
};

$('reset').onclick = () => { try { localStorage.removeItem(LS); } catch (e) {} shopAddr = null; [3, 4, 5].forEach((n) => unlock(n, false)); say('t2', 'Saved address cleared.'); };
</script>
</body>
</html>
`;

const out = html.replace('__CONFIG__', () => JSON.stringify(config));
fs.writeFileSync(path.join(root, 'deploy.html'), out);
console.log('wrote deploy.html', out.length, 'bytes; bytecode hex chars', bytecode.length - 2, '; items', items.length);
