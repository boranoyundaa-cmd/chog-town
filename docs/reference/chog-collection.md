# Chog Genesis collection

Observed on OpenSea, 2026-10-07. Re-verify before relying on numbers.

- **Collection:** https://opensea.io/collection/chog-genesis (verified)
- **Chain / standard:** Monad, ERC-721
- **Contract:** `0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763`. Verified on-chain 2026-10-07 via `https://rpc.monad.xyz` (chain id 143): `name()` "Chog Genesis", `symbol()` CHOG, `totalSupply()` 1969, ERC-721 per `supportsInterface`.
- **Token ids:** 1..1969 (id 0 and 1970 revert).
- **Metadata:** `tokenURI(id)` → `ipfs://bafybeid4ybujnscdipkno7ps5utqelp5ry5ryreqhay3zhgk3a6x4jruqu/<file>.json`. **The file number is not the token id** (token 1700 → `1192.json`, name "CHOG #1192"). Always go through `tokenURI`. From scripts, `gateway.pinata.cloud` works; `ipfs.io`, `cloudflare-ipfs.com`, `w3s.link` returned 403. The public gateway and RPC rate-limit (429): batch small and retry.
- **Full dump:** `python tools/fetch_chogs.py 3` writes `prototype/data/chogs.json` (id → file, name, image, owner, traits); `python tools/build_tokens.py` then builds the slim table the game ships (`tokens.json`, with a rarity rank per token and the venue-tier rules). Details in `docs/engineering/prototype.md`.
- **Supply:** 1,969; 1,012 unique owners (on-chain snapshot 2026-10-07, `owners.json`); floor ~5,300 MON when observed
- Holders get access to the Board of the Chog World Order (community governance).
- Token page pattern: `https://opensea.io/item/monad/<contract>/<tokenId>`
- **Use the token ID as identity.** Names can differ from IDs (token #415 is named "CHOG #1876").

## Traits (13 categories, not every token has all)

Read from the metadata of token ids 1–201 (a ~10% sample, 2026-10-07; rerun `tools/fetch_chogs.py` for all 1,969). Always present: Background (21 values), Base (Origin / Skull / Radioactive), Skin (9), Side (Left / Right), Eyes (41), Form (Chog / Skull), Tier (Common / Uncommon / Rare / Epic), Naked (Yes / No). **Optional:** Mouth (94%, 15 values), Body (91%, 73 values), Head (89%, 47 values), **Aura** (49%, 17 values, e.g. Wind, Burning, Royal Blue), **Accessory** (10%, 8 values: Fwog, Coin, Cigar, Heart, Knife, Candles, SB).

- Most tokens are `Base: Origin` and `Form: Chog`; Skull / Radioactive bases and the Skull form are rare (~2% each) and recolour or reshape the whole character.
- The character builder must handle missing categories and unseen values (fall back to a default), because the long tail (Body 73, Head 47, Eyes 41 values) will not all be modelled by hand.
- Example token (id 1700 → `CHOG #1192`, Epic): Background Radioactive, Aura Wind, Base Radioactive, Skin Multi Colored, Side Left, Body purple vest, Eyes Mixed Round Eye, Head Red Bandana, Form Chog, Naked No. The official image uses thick, wobbly hand-drawn black outlines, flat colours and white round eyes here, so eyes are not always black.

`Tier` is a trait of the collection, separate from OpenSea's coloured rarity-rank badge. Trait offers apply to traits, not to rank badges.

Image layers are not published; the game rebuilds each Chog procedurally from trait values (`chog()` options in `docs/engineering/prototype.md`). NFT images are public via token metadata.

## Related

- `$CHOG` token (Monad): `0x350035555E10d9AfAF1566AaebfCeD5BA6C27777`. Verified on-chain 2026-10-07: ERC-20 "Chog" / CHOG, 18 decimals, total supply 1,000,000,000, not an ERC-721. **This is the token, not the NFT.**
- Official character art lives on https://www.chog.xyz (e.g. `/home/chog.png`, `/chog/read.png`, `/tools/jump.png`); local copies for reference are in `docs/assets/reference/`.
- Chogtober is the Chog team's October activation event; Chogathon is its hackathon (`docs/project/hackathon.md`).
