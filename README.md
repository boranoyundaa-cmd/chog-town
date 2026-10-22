# Chog Hotel

A shared 3D town in the browser where all 1,969 Chog Genesis NFTs live, and where the Chog you hold decides who you are and what place you run. Built for Chogathon 2026 on Monad.

**Play:** https://chog-hotel.pages.dev (desktop browser; a phone gets the companion page)

## What it is

- **A living town:** a 64 x 64 m town (plaza, Hotel Street, Moka Lane, Arcade Road, Lantern Park, Maple Row) with 42 residents who follow the real clock, real-clock lighting, synthesized music, other players and chat.
- **The Chog Hotel:** Lev at the front desk checks you in. Every wallet gets a free room to decorate (a catalog of furniture, lights, wall text and room looks); Chog holders get a venue on the hotel floors (Room, Suite, Floor, Penthouse) with a facade, entry rules, a DJ booth, a VIP level, events and tips. The hotel tower in the town grows with the number of rooms.
- **Seven mini-games:** Stack the luggage, Rhythm, Daily Chog, rock-paper-scissors, Dance copy, Connect four, Long/Short duel; against residents or players, daily and weekly boards, trophies on a shelf in your room.
- **Exhibition floor:** a weekly room contest with signed entries and votes.
- **Shop:** soulbound ERC-1155 items (decor, cosmetics, venue upgrades) paid in $CHOG or MON. 90 % of every spend is burned as $CHOG, 10 % goes to the team; tips go 100 % to the venue owner.
- **Phone companion:** Lev gives you a QR key; your phone shows your room as a live diorama and rings when someone visits while you are away.

## Why the Chog NFT is essential

- **You are your Chog.** Every trait value has its own 3D model (58 eyes, 66 heads, 96 bodies, 22 auras, 9 items, the 10 one-of-one Legendaries), so a holder walks around as their own token. Without one you are the default purple guest.
- **Your Chogs are your license.** The collection's on-chain `Tier` trait gives points (Common 1, Uncommon 1, Rare 3, Epic 5, Legendary 12); the wallet's total sets the venue tier: size, capacity (12 / 20 / 32 / 50), stage, VIP level, tier-locked pieces. Sell below the tier and the venue freezes for 7 days, then shrinks.
- **Not pay-to-win:** games, rooms and contests are free for everyone; the NFT unlocks identity and the right to run a public place.

## How to test (alone, about 5 minutes)

1. Open the site on a desktop browser. You start on the plaza as a guest; the First steps list (top left) guides you.
2. Walk into the Chog Hotel (click the ground or WASD; the pill marks the door) and talk to **Lev** at the desk (E). Without a wallet he gives you a temporary room; with a wallet (a free signature, no NFT needed) you get a saved room with a door number.
3. Press **B** in your room to decorate.
4. Press **G** for the games, or click a resident and press **Challenge**. Try the Daily Chog.
5. Press **C** (My Chog) and pick a token under "Preview what holders get" to see a holder's Chog and tier without owning one.
6. Holders: connect the wallet that holds your Chog; you appear as it and can activate a venue at Lev's desk (Upgrade my room).

Keys: click / WASD walk, wheel zoom, Enter chat, M map, R my room, B decorate, G games, K shop, V venues, I at the Inspect stand to see the whole hotel, P screenshot.

## Under the hood

- **Client** (`prototype/`): Three.js r128, plain scripts, no build step; Chogs, town and rooms are procedural (no model files). Custom post-processing (outline, bloom, toon light), A* path finding, room documents as JSON.
- **Server** ([chog-town-server](https://github.com/boranoyundaa-cmd/chog-town-server), checked out at `server/`): Node + WebSocket on Fly.io: presence, chat, signed rooms, hotel records, game referee, Exhibition, shop checks, phone keys and Web Push. Holds no funds; the game still runs solo without it.
- **Contract** (`contracts/`): ChogShop, soulbound ERC-1155 (Foundry), live on Monad at `0x0eD0D1c8782819Cb9AbFe183C6c0235F248B2F9a`. MON payments swap directly against the Capricorn CHOG/WMON pool.
- **Data** (`tools/`): owner snapshot and traits of all 1,969 tokens, rarity and tier tables; no IPFS calls at runtime.
- **Docs** (`docs/`): design, world, culture, art direction, engineering notes. Start at `docs/README.md`.

Run locally:

```bash
python prototype/server.py          # http://localhost:8766
cd server && npm install && node index.js   # ws://localhost:8767 (optional; npm test runs the checks)
```

## Pre-existing work

The Chog character renderer and the art style (smooth stylised 3D with ink outlines, `prototype/js/chog*.js`, `common.js`, `main.js`, `styles.js`) began as an art prototype before the hackathon started. Everything else (the town, hotel, rooms, residents, games, Exhibition, shop, contract, server, phone companion) was built during Chogathon. Three.js, ethers.js, ws, web-push and OpenZeppelin are used under their licenses. Chog art and the collection belong to their creators.
