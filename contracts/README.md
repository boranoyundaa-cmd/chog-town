# ChogShop contracts

One contract, `src/ChogShop.sol`: the official Chog Hotel shop on **Monad mainnet (chain id 143)**. No testnet; deploy straight to mainnet.

## What it does

- **Soulbound ERC-1155 items** (decor, cosmetics, venue extras). Only minting is allowed; any transfer reverts. Admin sets the metadata URI (`setURI`).
- `setItem(id, priceChog, active, minTier, maxPerWallet)` (admin; `setItems` for batches). Prices are fixed $CHOG amounts in base units (18 decimals). `maxPerWallet` 0 = unlimited.
- `buyWithChog(id, qty)`: pulls price*qty $CHOG, **10 % (floored) to `team`, the rest (90 % + dust) burned** with the token's own `burn(uint256)`, mints the items.
- `buyWithMon(id, qty, minChogOut, deadline)` payable: wraps MON to WMON, swaps exact-input straight against one Uniswap V3 style pool (`pool.swap`, no router; the shop pays WMON in `uniswapV3SwapCallback`, which only accepts the configured pool, only during a purchase, only up to the MON sent), requires received >= max(price, minChogOut), splits 90/10 on the price, refunds the $CHOG surplus and any WMON the pool did not take (price limit hit) to the buyer. **Disabled while `pool` is zero** (reverts `NoPool`). `setPool(pool, wmon, factory, fee)` checks the pool holds exactly {WMON, CHOG}, records the token order and, if `factory` is non-zero, that `factory.getPool(wmon, chog, fee) == pool`.
- `tip(to, venueId, amount)`: 100 % of $CHOG from the sender to the venue owner; emits `Tip(from,to,venueId,amount)`.
- Pausable, Ownable2Step admin, reentrancy guard, daily caps (`setCaps(total, perWallet)`, UTC day, in $CHOG of item volume, 0 = unlimited; tips are not capped), `setTeam`, `rescueToken`, `rescueMon` (the shop holds nothing between transactions, so these only recover stray funds).
- Events for the game server to index: `Purchase(buyer,id,qty,chogPaid,burned,toTeam)`, `Tip`, `PaidWithMon`, `ItemSet`, `TeamSet`, `PoolSet`, `CapsSet`.
- **`minTier` is stored but not enforced on chain.** Tier comes from NFT holdings, which the game server reads; the shop UI and server refuse tier-locked purchases/placements ("Requires Whale"). Anyone calling the contract directly can buy a tier-locked item; the game must therefore check tier when the item is *placed or worn*, not only when bought.

## Verified on chain (2026-10-15, https://rpc.monad.xyz)

| Fact | Value |
|---|---|
| $CHOG token | `0x350035555E10d9AfAF1566AaebfCeD5BA6C27777`, "Chog" / CHOG, 18 decimals, supply 1,000,000,000 |
| Token kind | EIP-1167 minimal proxy to `0x7f64ccfeb3e3afd7691ea0ef404e947786cefae8`. The implementation has `burn(uint256)` and `burnFrom` (selectors present; `burn` simulated OK from a holder). Shop uses `burn()`. |
| Chog collection | `0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763` |
| Owner of Chog #1700 (team wallet + admin) | `0xb36dd9f235ef6a5dc3b193c493d2ce2b7874454f` (read at this date; the holder can change if the NFT is sold, re-check before deploying) |
| Deepest $CHOG pool | Capricorn CHOG/WMON 1 %: `0x116e7d070f1888b81e1e0324f56d6746b2d7d8f1` (about $100K liquidity per GeckoTerminal; Uniswap V3 style: `factory()` `0x6b5f564339dbad6b780249827f2198a841feb7f3`, fee 10000, token0 CHOG, token1 WMON `0x3bd359c1119da7da1d913d1c4d2b7c461115433a`) |
| Other pools | Uniswap V4 MON/CHOG (about $3K, V4 needs a different router), PancakeSwap V3 (about $1K), Atlantis 0.05 % (about $0.6K) |
| Pool factory | Capricorn V3 `0x6B5F564339DbAD6b780249827f2198a841FEB7F3`; `getPool(WMON, CHOG, 10000)` returns the pool above. WMON `0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A`. No standard SwapRouter exists, so the shop calls the pool directly. |
| Price | about $0.0016 per CHOG (GeckoTerminal, 2026-10-15), so $1 is about 625 CHOG. Placeholder catalog prices are based on this. |

### The MON path (pool, no router)

`script/Deploy.s.sol` calls `setPool` with the Capricorn pool, WMON and the factory above (override with env `POOL`, `WMON`, `FACTORY`, `POOL_FEE`). It reverts if the on-chain tokens or factory do not match. Setting `POOL=0x0000000000000000000000000000000000000000` deploys with the MON path off.

Change or turn it on later from the admin wallet:

```
cast send <SHOP> "setPool(address,address,address,uint24)" 0x116e7d070f1888b81e1e0324f56d6746b2d7d8f1 0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A 0x6B5F564339DbAD6b780249827f2198a841FEB7F3 10000 --interactive --rpc-url https://rpc.monad.xyz
```

Turn it off: `setPool(0x0, 0x0, 0x0, 0)` (the shop UI hides the MON option when `pool()` is zero). Test with a tiny purchase first (a 300 CHOG item with about 0.5 MON). Trust model: the pool is admin-chosen; a different pool address is only trusted for the WMON it is owed during the swap, capped at the MON the buyer sent.

## Deploy on Windows (step by step)

1. Install Foundry: download `foundry_stable_win32_amd64.zip` from https://github.com/foundry-rs/foundry/releases, unzip to e.g. `C:\foundry`, add it to PATH. Check `forge --version`.
2. In Git Bash or PowerShell: `cd D:\Projects\Chog\contracts`
3. Dependencies (skip if `lib/` exists; it is git-ignored): 
   `forge install --no-git OpenZeppelin/openzeppelin-contracts@v5.1.0 foundry-rs/forge-std`
4. Tests: `forge test`
5. Review prices in `items.json` (whole CHOG, the script multiplies by 1e18).
6. Set env (PowerShell):
   ```
   $env:CHOG_TOKEN="0x350035555E10d9AfAF1566AaebfCeD5BA6C27777"
   $env:TEAM="0xb36dd9f235ef6a5dc3b193c493d2ce2b7874454f"
   $env:ADMIN="0xb36dd9f235ef6a5dc3b193c493d2ce2b7874454f"   # optional, see below
   # optional: POOL, WMON, FACTORY, POOL_FEE, CAP_TOTAL (default 2,000,000 CHOG/day), CAP_WALLET (default 20,000 CHOG/day), ITEM_URI
   ```
7. Dry run (simulation only, nothing sent; needs about 0.93 MON for the real run):
   `forge script script/Deploy.s.sol --rpc-url https://rpc.monad.xyz --sender <YOUR_ADDRESS>`
8. Real run with your own key, never in a file. Pick one:
   - `forge script script/Deploy.s.sol --rpc-url https://rpc.monad.xyz --broadcast --interactive`
   - `forge script script/Deploy.s.sol --rpc-url https://rpc.monad.xyz --broadcast --ledger`
9. The deployer owns the shop during the script. If `ADMIN` differs from the deployer, ownership is only *offered*: the admin wallet must call `acceptOwnership()`:
   `cast send <SHOP> "acceptOwnership()" --interactive --rpc-url https://rpc.monad.xyz`
10. Give the shop address back to Claude for the game server and client.

## Deploy from the browser (no Foundry)

`deploy.html` deploys ChogShop with your own wallet (MetaMask/Rabby); it never asks for a key. Regenerate after contract or `items.json` changes: `forge build && node tools/make_deploy_page.js`.
Open it through a local server: `cd contracts && python -m http.server 8790`, then http://localhost:8790/deploy.html. Steps: connect (Monad 143), deploy, setPool, items + caps, verify. Connect as the TEAM/admin wallet; the deployer becomes owner. Copy the final shop address to Claude.

## Updating prices and settings (admin wallet)

```
cast send <SHOP> "setItem(uint256,uint256,bool,uint8,uint32)" <ID> <PRICE_IN_WEI> true <MIN_TIER> <MAX_PER_WALLET> --interactive --rpc-url https://rpc.monad.xyz
```
Price in wei: 600 CHOG is `600000000000000000000` (`cast to-wei 600`). Deactivate an item with `false`. Other admin calls: `setItems`, `setURI`, `setTeam`, `setCaps`, `setPool`, `pause`, `unpause`, `transferOwnership` (two-step).

## For the game

- ABI: `contracts/out-abi/ChogShop.json` (regenerate with `forge inspect ChogShop abi --json > out-abi/ChogShop.json` after any contract change).
- Item catalog (ids, kinds, names, minTier): `contracts/items.json`.
- Index `Purchase` and `Tip` events by block range of at most a few hundred blocks per `eth_getLogs` call on the public RPC.
- Players must `approve` the shop for $CHOG before `buyWithChog` or `tip`.
