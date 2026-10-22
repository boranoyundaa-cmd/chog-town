# Overview

## Vision

**Chog Hotel** (named Chog Town until 2026-10-15): a living, shared 3D town where all 1,969 Chog Genesis NFTs exist at once and players run their own places: clubs, shops, galleries, arcades. Anyone can play (default purple Chog); Chog holders play as their own Chog and hold venue licenses (higher tier with more or rarer Chogs). Runs on Monad (single shard).

**The game is played on PC.** A phone gets a companion page (your room as a live diorama and Lev's message tab), not the game. Everything is built and polished for the desktop browser first.

Pitch (draft): *a town where the Chog you own is who you are, and the place you run is yours.* Details and rules: `docs/game/design.md`.


## Status (update every session)

The whole plan of `docs/project/build-plan.md` plus the phone companion is **built and deployed** (server `chog-town-ws.fly.dev`, site `https://chog-hotel.pages.dev`, last site deploy 2026-10-22 with the town paving lowered under y = 0, so feet no longer sink into it). Both repos are **public** with READMEs for the judges (2026-10-22). Submission answers and the video plan are kept locally in `docs/project/submission.md` (ignored by git). Tested locally with a mock chain and wallet; the live checks with a real wallet, a second player and a real phone are what remains.

- **Name and tiers:** Chog Hotel; tiers Ser / Fren / Whale / Legend with venues Room / Suite / Floor / Penthouse (`ui.js`). Guest portrait = the collection's purple Chog (`data/portraits/guest.webp`).
- **Town:** 64 x 64 m (`HALF` 32, server `CFG.half` 32): plaza with a fountain at (-6,-6), Hotel Street north (Gallery, Books, Chog Hotel, NOVA, Pizza), Moka Lane west (Moka & Co, Bakery, Florist), Arcade Road east (Arcade, Laundry, parking), Lantern Park south-west (pond, gazebo), Maple Row south-east (Home and neighbours). The camera follows the player everywhere; zoom is capped at 24 m of visible width outdoors and indoors (owner), rooms open at 18 m and follow the player; there is no whole-room view. Layout and sizes: `docs/game/world.md`.
- **Interiors:** walls 5 m (rooms) / 6 m (lobby, halls); Home 20 x 15 m with 140 pieces; venues 22 x 16 / 27 x 20 / 27 x 20 on two levels / 33 x 22 on two levels; halls 24 x 24 m, lobby 16.5 x 12 m. Ceiling lamps are gone from the game and the catalog (owner). Old Homes and venues are shifted into the new sizes on load (`rooms.shiftDoc`).
- **Culture** (`culture_data.js`, `npc.js`, `culture.js`, `props.js`): 42 residents (archetypes and nickname-only cameos), click-only lines, crowd target 16, plaques, ordinary town signage with 4 hidden finds, gmonad notice board by day / gn at night, photo booth, lawn, real-clock events. Owner rule: jokes are rare, hidden, contextual. `docs/game/culture.md`.
- **Audio** (`audio.js`, `audio_wire.js`): all synthesized, music per place, effects, Settings sliders.
- **Mini-games** (`games.js`, `server/games.js`, `trophies.js`): 7 games (Stack, Rhythm, Daily Chog, rock-paper-scissors, Dance copy, Connect four, Long/Short), NPC challenges, daily and weekly boards, trophies on a shelf piece in the Home. **Exhibition floor** (`exhibition.js`, `server/exhibition.js`): weekly contest, signed entries and votes.
- **Tier perks** (`server/hotel.js` `TEMPLATES`, `license.js`, `venue.js`): capacity 12 / 20 / 32 / 50, DJ booth and stage from Fren, VIP upper level from Whale, game tables, tier-locked pieces, freeze (7 days) and thaw, tier upgrade, move to a smaller room.
- **Shop** (`shop.js`, `server/shop.js`, `contracts/`): ChogShop soulbound ERC-1155, 90 % burn / 10 % team, tips 100 % to the owner; MON payments swap directly against the Capricorn CHOG/WMON pool (`capricornCLSwapCallback`, checked on a mainnet fork). **Live:** ChogShop `0x0eD0D1c8782819Cb9AbFe183C6c0235F248B2F9a` (Monad, deployed by the owner 2026-10-15; admin and team = the #1700 wallet), set in `SHOP_CONFIG.shop` (client) and `SHOP_ADDRESS` (`server/fly.toml`).
- **Path finding:** A* with binary heaps and closed sets, linear string pulling (the big town froze otherwise).
- **Direction (2026-10-09, owner):** the answer to "Habbo on blockchain: nobody has a reason to play" is **culture**: Crypto Twitter references, audience crypto-native non-holders, holders are the supply side (`docs/game/culture.md`).
- **World architecture (owner):** one town, a free Hotel room for every wallet (public unless locked; the town has no Home door), the Hotel with Lev at the desk, holder venues (floors of four wall slots, free facades, entry rule and guard, usernames), Exhibition floor, real-clock lighting only in the background, NPC schedules without server state (`docs/game/world.md`, `docs/game/spaces.md`).
- **Chog likeness:** every trait value has its own model (Eyes 58, Head 66, Body 96, Aura 22, Accessory 9, the ten 1:1 Legendaries in `chog_legends.js`); the audit tools are `tools/value_sheet.py` and `tools/compare_portraits.py`. Approximate: small details seen only up close. Colours read from the art are built at `EXPO` (0.6).
- **Data:** 1,969 tokens in 1,012 wallets (`prototype/data/owners.json`); all traits in `tokens.json`, no IPFS calls at runtime. Collection `Tier` trait: Common 1,279, Uncommon 590, Rare 60, Epic 30, Legendary 10.
- **Backups (private GitHub):** the game, docs and tools in `boranoyundaa-cmd/chog-town`, the server in `boranoyundaa-cmd/chog-town-server`. Commit and push both at the end of a session.
- **Live accounts:** Fly and Cloudflare under neoboranaybek@gmail.com.
- **Performance (2026-10-16):** static meshes of the town and of every Chog are merged at build time; draw calls per frame halved (plaza 4,119 → 2,103), CPU per frame ~25 → ~15 ms. A full frame took ~8 ms on an RTX 3060 laptop (2026-10-22). Details and the `noMerge` rule: `docs/engineering/prototype.md` (Performance notes).
- **Never tried:** a real wallet signing on the live site, a second real player in the hotel, performance on weaker hardware (integrated GPU, big rooms with many pieces and lights, 4096 shadow map, 2x supersampling).
- **Known limits:** rooms have no stacking and turn in 90 degree steps; NFT frames and the Part Lab are not offered (no Monad NFT indexer chosen); the Chog is polygonal next to the smooth official art.

## Decisions (and why)

| Decision | Why |
|---|---|
| Venues live in a Hotel (floors, corridors, facades), not as buildings in the town (2026-10-08) | A town cannot hold a building per license (1,012 wallets); walking past doors is browsing and discovery; floors are generated from data and grow with demand. `docs/game/world.md` |
| Permanent public address = the Chog license; Homes are private, invitation only (2026-10-08) | If everyone had a public door the NFT would add only a wider door and fail the "take the NFT out" test. Free players still decorate, invite, play and enter contests |
| The real clock lights only the background; interiors are lit by placed lights only (2026-10-08) | Lights become a creative tool and an item category, and tiers can scale the light budget |
| NPC positions are a function of the real clock, no server simulation; crowd topped up to ~12 (2026-10-08) | A lone judge sees a living town, no server state, no offline sim |
| One art style; creator variety comes from asset themes (2026-10-08) | A consistent look makes the world one game. Players get themed kits, patterns, own shapes, text and NFT frames, never different render styles. `docs/game/spaces.md` |
| Social creator sandbox with player-run venues, not a combat MMORPG (2026-10-08) | An MMORPG needs content we cannot write in 14 days and is a crowded field; players make the content here. Research: `docs/game/core-loop-research.md` |
| Venue license from holdings: points per Chog by rarity, tier from total, one venue per wallet | Splitting NFTs across wallets must not pay; consolidating should. Diminishing returns. See `docs/game/design.md` |
| Host economy, not play-to-earn: no minted rewards, income only from running a venue, free entry by default | Axie-style emission-funded rewards collapse; venue income is player-to-player. "Passive income" is never promised |
| No gambling venues in v1 (2026-10-15) | Fits neither the no play-and-earn rule nor the legal risk (Roblox class action, Second Life ban) |
| Official shop only: soulbound items, 90 % of every spend burned as $CHOG, 10 % to the team, payable in MON via swap; tips 100 % to owners (2026-10-15) | Owner decision; a burn sink with a small team income, no secondary market to police. `docs/project/build-plan.md` |
| Theme = crypto culture, audience = Crypto Twitter, not "everyone" and not nostalgia (2026-10-09) | ~1,000 wallets cannot fill a world; the volume must be crypto-native non-holders, and a Habbo clone gives them no reason to come. Culture cannot be copied, is cheap, works alone and fits CT's existing wallets. `docs/game/culture.md` |
| Smooth stylised 3D ("hybrid"), not pixel-3D | Chog faces and outlines read far better, closer to the official art; code produces lighting, depth, animation and trait swapping. Pixel-3D stays as `?style=pixel` |
| Warm, soft world | Owner preference; fits Chog's friendly character |
| No testnet, Monad mainnet | Owner decision (fees are low). Mitigate with pausable contracts and daily caps |
| Server-light architecture, plus a small realtime server (Node + WebSocket) | Contracts hold ownership and money; the server only relays presence and chat, holds no funds, and the game degrades to solo play if it is down. Same language as the browser client |
| HUD: Storybook (wood and parchment) | Chosen by the owner from three concepts; rules in `docs/art/art-direction.md` |
| PC-first; the phone gets a companion (room diorama + Lev), paired by a QR key from Lev (2026-10-16) | The game is played on desktop; the phone gives owners a reason to look in while away |
| No deep offline simulation | Costly, adds little |


## Handover (end of the 2026-10-15 session)

- **State:** everything is built and deployed (2026-10-16) and the shop contract is live; live checks are all that remain. Server checks: `cd server && npm test`.
- **Lev and rooms for everyone, client side (2026-10-15):** Lev replaced the lobby receptionist (`js/lev.js`; menu, prologue, key cut-scene, upgrade and basement lines in `CULTURE.lev`); the town's Home house is an ordinary neighbour; R / My Room go to your hotel room; invite UI removed. Verified with a mock wallet against a staged server (check-in, grown and moved upgrades, basement return, walletless guest). Not yet checked with a real wallet.
- **Owner preferences:** the owner speaks Turkish (answer in Turkish); consult before UI/UX, platform and design choices, then write the decision into the docs; ideas that solve several problems at once inside the fiction are valued; jokes stay rare, hidden and contextual.
- **Deploying:** the server first (`flyctl deploy --ha=false --remote-only` from `server/`; the `Dockerfile` copies files by name, add new ones: `games.js`, `exhibition.js`, `shop.js`, `shop_items.json` are already listed), then the site (`python tools/build_site.py`, `wrangler pages deploy` from outside the repo, `docs/engineering/prototype.md`). Commit and push both repos (`server/` is its own repo).
- **Shop admin:** prices, caps, pause and the pool are changed from the admin wallet (`contracts/README.md`; `contracts/deploy.html` is the browser deploy page).
- **Testing tips** are in `docs/engineering/prototype.md` under Pitfalls (Browser pane size, tabs, snapping, mock wallet, venue recipe).

## Next steps (in order)

0. **Submit before the deadline (≈ 2026-10-23 evening):** the 60 s trailer is cut (`video/chog_hotel_trailer.mp4`, not in git; tools `tools/trailer_capture.js` -> `tools/edit_trailer3.py`, narrator from ElevenLabs in `video/vo/`). The owner records the 2 minute walkthrough, the two are joined (walkthrough, then the trailer), uploaded, and the answers pasted into the form (owner signs in).
1. A small test purchase with $CHOG and with MON on the live site.
2. Live checks with a real wallet (check in with Lev, the key scene, sign a room save, a tier upgrade, activate a venue) and with a second player (hotel head counts, challenges, Exhibition votes).
3. The phone on a real device: ask Lev for "A key for my phone", scan the QR code, turn on "Ring my phone" (on an iPhone from the home screen icon) and have a second player walk into the room while the PC is closed.
4. Performance: a quality setting (render scale, shadow map size, `preserveDrawingBuffer` off) and a check on a laptop with an integrated GPU; hotel rooms with many pieces are not merged yet (pieces are editable).
5. Owner corrections to the culture content after seeing it in the game.

Promotion is the owner's call.

## Open questions

- **Do non-holders pay?** The economy assumes free players spend $CHOG or MON in the shop. Test after the deploy.
- **Long-term goals without combat:** collection, venue upgrades, reputation. Undecided.
- **Phone companion** needs a test on a real phone (frame rate, battery, QR scan from a PC screen, a notification on Android and from the iPhone home screen icon).
- **Moderation:** filter, report, who reviews.
- **NFT frames:** which indexer lists a wallet's NFTs on Monad.
- Real-data testing: the owner holds token #1700 (Epic); trait art layers are not available, the character is rebuilt procedurally from trait values.

- **2026-10-16:** the phone companion is built locally (`m.html`, `js/mobile.js`, `css/mobile.css`, `server/phone.js`, decided by the owner from the design canvas: the live pocket room with Lev's message tab, QR key from Lev on the PC, live guests only with the security camera, a plain page for phones without a key) and Lev's phone notifications (`server/push.js`, `prototype/sw.js`: a visit while you are away, a tip, a 21:00 reminder). Chog face ink line thinned to the body outline's width; Lev's uniform is a jacket with sleeves of its own cloth; wizard cloaks open in front. Deployed the same night (server, then site); checked live: the phone page reaches the live server, desktop still connects.
- Playtest fixes (2026-10-15): spawn at the plaza's north edge with the camera leaning to the Hotel, waypoint over the Hotel door, First steps checklist, working "Show me around" walk, walk speed 3.4 m/s (server `CFG.speed` too), big map on M (Shop is now K).
