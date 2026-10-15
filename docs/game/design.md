# Game design

Direction chosen 2026-10-08: a social creator sandbox (Habbo / Roblox tradition), **not** a combat MMORPG. The medieval MMORPG plan (mobs, skill tree, duels) is dropped: too much content for 14 days, crowded field, weak solo demo. Evidence: `docs/game/core-loop-research.md`.

## Core idea

One shared town, one shard, where all 1,969 Chogs exist. Players **run places** (venues): a club, a shop, a gallery, an arcade, an event hall. Everyone can visit, chat and spend. Anyone plays free as a default purple Chog; holders play as their own Chog and hold venue licenses.

Pitch (draft): *a town where the Chog you own is who you are, and the place you run is yours.*

## Design preference

Ideas that **solve several problems at once, live inside the world, and are fun** are especially valuable to us, but this is a preference, not a rule: ideas that fit only some of these are welcome too. The security camera is the model case (mobile view + burn sink + reason to check in + moderation aid).

## Audience and platform

- **Crypto Twitter / crypto-native people first** (decided 2026-10-09, `docs/game/culture.md`), not Turkish-first, not "everyone". Holders are the supply side, non-holder crypto people the volume. Not nostalgia-led: nostalgia alone does not retain (Habbo Origins reviews) and that audience is not in web3.
- **PC (desktop browser) first.** The game is not played on mobile; do not design play around touch.
- **The phone companion (built 2026-10-16, owner):** a phone that opens the site gets `m.html` (`index.html` sends coarse-pointer small screens there; `?pc=1` opens the game anyway). It shows your room as a small diorama lit by the real clock, with Lev's message tab (fixed questions: who is inside, today's visitors and tips, tonight's events, lock the door). The phone signs in with a one-time QR key from Lev on the PC (no wallet on the phone). Guests inside show live only with the security camera from the shop; without it the phone shows the head count. A phone without a key sees a short page that points to the PC. Lev can ring the phone (Web Push, turned on in his tab): a visitor while you are away from the PC (at most every 30 minutes), a tip, and a reminder at 21:00; on an iPhone this works only from the home screen icon.

## Creator freedom (decided 2026-10-08)

The game has **one art style**; player freedom is in **assets**: themed kits (modern, cyberpunk, retro 80s, space, halloween...), wall and floor colours and patterns, own pieces built from shapes and colours, text on walls, and NFT frames that show any NFT from the owner's wallet (Chog or not; frames are items to buy). Spaces are data documents, never code. Principle, toolset, budgets: `docs/game/spaces.md`.

## Pillars (the vertical slice)

1. **Living town:** shared walkable map, other players, chat. Fictional NPC residents with real-clock routines keep it from ever being empty (judges test alone); they never copy a real token. Details: `docs/game/world.md`.
2. **Venues:** a place of your own, a wall with an editable facade in the **Hotel**, from **templates plus settings** (decor, music, entry rule, VIP area, shelves). Not free scripting: it fits 14 days and keeps the set of allowed venue types controllable. The permanent public address is what the license unlocks; free players keep a private Home and contests (`docs/game/world.md`).
3. **Items:** an official shop only (owner, 2026-10-15): soulbound ERC-1155 items paid in $CHOG or MON, no player market, no creator publishing. `docs/project/build-plan.md`.

Later: mini-games in venues, NPC daily events.

## NFT-essential rule

"Take the NFT out, does it still work?" Without the NFT, no own look and no venue license.

- **Look:** holders appear as their own Chog (traits). Free players are the default purple Chog and may change its colour; cosmetic items from the market add variety.
- **Venue license** from holdings, one venue per wallet at the highest tier reached (no stacking). Points come from the collection's own on-chain `Tier` trait: Common 1, Uncommon 1, Rare 3, Epic 5, Legendary 12; the wallet's tier comes from its total points. So one Rare is already tier 2, one Epic tier 3, one Legendary tier 4 (from the full dump, approved by the owner 2026-10-08).

| Tier | Name | Points | Venue | Room (per level) | People inside | Perks | Wallets (of 1,012) |
|---|---|---|---|---|---|---|---|
| 1 | Ser | 1 | Room: a wall segment | 22 x 16 m | 12 | | 814 |
| 2 | Fren | 3 | Suite: a whole wall | 27 x 20 m | 20 | stage and DJ booth | 99 |
| 3 | Whale | 5 | Floor: a whole wall on two floors, stairs | 27 x 20 m, 2 levels | 32 | + VIP upper level | 72 |
| 4 | Legend | 12 | Penthouse: the whole floor and the one above | 33 x 22 m, 2 levels | 50 | + VIP upper level | 27 |

Pieces per level 200 / 300 / 280 / 340, lights 16 / 18 / 18 / 22 (`server/hotel.js` `TEMPLATES`, the source of truth). Game tables and the most legendary shop pieces are tier-locked. The free Home is 20 x 15 m with 140 pieces.

- **Why this shape:** splitting NFTs across wallets must not pay. Tier 4 must be worth more than ten tier 1 venues (capacity, VIP room, stage, shelves, not just size), so holders consolidate instead of farming wallets.
- **No anti-rental rule** (owner, 2026-10-15: no holding period, no delegation). A venue **freezes** if holdings fall below its tier and is freed after 7 days (`docs/project/build-plan.md`).
- **Pyramid:** target ~20-30 tier 4, 60-80 tier 3, 150-200 tier 2, rest tier 1; the table above lands on it, except tier 2 (99, lower than target, acceptable). By holding count alone (1 / 3 / 5 / 10) the split would be 867 / 81 / 45 / 19.
- **Rarity source:** the collection's own `Tier` trait, not OpenSea's coloured rank badge (rank badges cannot be read from chain). Distribution: Common 1,279, Uncommon 590, Rare 60, Epic 30, Legendary 10. Giving Uncommon 2 points inflates the top (45 wallets in tier 4 at the old 10-point threshold). Rank-band schemes (e.g. top 20 / 100 / 500 by trait-rarity score) overshoot tier 4 (56 wallets), so the on-chain trait is both simpler and more verifiable. **Approved by the owner 2026-10-08 and embedded in the client** (`prototype/data/tokens.json`, built by `tools/build_tokens.py`).
- **Anti-farm check:** the 10 Legendary tokens sit in 10 distinct wallets, Epic in 29 of 30, Rare in 50 of 60. 14 single-token wallets already reach tier 3 or 4 through one Epic or Legendary, which is the intended reward for owning a rare and means high-tier venues are not only whale venues.
- **How the license shows in the game (built 2026-10-08):** a "Tier N" pill under the player frame and a license card in My Chog, both for holders only; the Venues window shows the four-tier ladder with wallet counts for everyone (free players see it locked, with "Get a Chog"). The license counts all Chogs of the connected wallet. Tier names are **Ser / Fren / Whale / Legend**, their venues **Room / Suite / Floor / Penthouse** (owner, 2026-10-15); perks in `docs/project/build-plan.md`. Wallet counts are a snapshot (dated in the window) refreshed by `tools/fetch_owners.py` and a rebuild.

## Economy rules

The aim is a host economy, not play-to-earn. Axie died because the game printed rewards funded by new entrants; here all income is player-to-player.

1. The game **never mints rewards** for playing.
2. Income comes from **running** a venue, never from holding. Never market it as "passive income": most venues earn near zero (Roblox, Second Life payouts are top-heavy).
3. **Town and venue entry are free.** Visitors may tip an owner in $CHOG (100 % to the owner). Paywalling the core hurts participation.
4. Customers must exist: free players buy cosmetics, tickets, events.
5. **Discoverability:** directory, featured venues, ratings, so new venues get visitors.
6. Block wash trading (visiting your own venue to inflate rankings).
7. **Every shop spend: 90 % burned as $CHOG, 10 % to the team wallet as $CHOG** (owner, 2026-10-15; replaces "no developer share"). Prices are fixed $CHOG amounts, payable in MON through a swap. Details `docs/project/build-plan.md`.
8. **Gambling:** not in v1 (owner, 2026-10-15). Roblox faces a gambling class action; Second Life banned casinos in 2007.

## Venue customization and the security camera (idea, 2026-10-08)

Owners can customize their venue with `$CHOG` burns (optional; which items cost what is still to be discussed). First concrete item: the **security camera**.

- The owner installs a camera in their venue. On mobile they open the site and see their Chog, inventory, revenue, and **a live view of the venue through the camera** while away from the PC.
- **Look:** low resolution, noise and scanlines, so it reads as a surveillance camera by design, not as poor quality. This is also the cheap way to render a live 3D venue on a phone.
- **Why it works:** it makes the mobile companion more than a stats page, gives the owner a reason to check in (a world that exists while you are away), is a burn sink the owner chooses, and also a moderation aid for the owner.
- **How (to verify):** no video streaming. The phone is a spectator client of the same realtime venue state, rendered at a low internal resolution from a fixed camera angle. Needs a test on a real phone for frame rate and battery.
- **Visitor privacy:** a visible camera icon in the venue; the owner sees the scene, not private data (no wallet addresses, no private chat). Whether chat shows on the camera view is open.
- **Tiers:** number of cameras and angles could scale with venue tier.

## Candidate features (liked by the owner, not decided)

- **Venue opening hours ("tonight").** Owners set when the doors open; the directory and mobile notifications list what is on tonight. Why: with a small population, concentrating people in time makes venues feel alive instead of scattering them (Dofus limited its retro servers for the same reason). Also gives events, a daily reason to return and mobile pings ("your club opens in 10 minutes, 12 inside"). Risk: time zones.
- **Doorman.** A guard NPC at the venue's facade in the Hotel hall enforces the owner's entry rule: dress code (a cosmetic item), guest list, holders only, membership pass. Passes and tickets are items, so there is no wallet popup per entry. Why: free players get a reason to buy cosmetics, the owner gets a moderation tool (ban list) and a venue identity. Entry stays free by default; any rule is the owner's choice.

Other ideas floated but not picked up: an NPC critic that reviews new venues in a town gazette, hired staff (DJ, bartender) from free players, and traits giving venue roles. Revisit if needed.

## Safety

Chat with a report button, auto-mute and local mute from day one; links and wallet addresses are stripped (scams). **No profanity filter** (owner decision 2026-10-08: adult, crypto-native audience). Habbo disabled chat in 2012 after a child-safety scandal and Sanalika was blocked temporarily in Turkey.

## Architecture direction

- **On-chain (Monad):** ownership, items, market, venue licensing (tier from holdings), entry payments. Pausable contracts and daily caps (no testnet by owner decision).
- **Static client** plus a **small realtime server** (presence, chat). Required: everything social depends on it. Plus an indexer for fast reads.
- No wallet popup per action: session keys or a prepaid balance for entry fees and purchases.

## Scope guard

Judges weigh novelty, fun, retention, clarity and execution, and test alone within a week. Prefer a polished slice (town, one venue template with tiers, items, NPC residents) over many half-built venue types. Every feature must be explainable in one sentence in the 3-minute demo.
