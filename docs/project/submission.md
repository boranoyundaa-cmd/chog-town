# Chogathon submission

Form answers (paste as they are) and the demo video plan. Deadline: the countdown on chogathon.chog.xyz read 1 d 9 h on 2026-10-22 morning (ends ≈ 2026-10-23 evening, Turkish time).

## 01 Your project

- **Project name:** Chog Hotel
- **Team:** <owner's name / handle> (solo)
- **Discord:** <handle>
- **X:** <handle>

## 02 What you built

Chog Hotel is a shared 3D town in the browser where all 1,969 Chog Genesis NFTs live. You walk in as your own Chog, check in with Lev at the front desk and get a room in the hotel. Decorate it, play seven mini-games against residents or other players, enter the weekly Exhibition contest, and if you hold Chogs, run a public venue on the hotel floors: a club, a café, a gallery, with your own facade, door rules, DJ booth, VIP level and events where visitors tip you.

The town never feels empty: 42 residents follow the real clock (the barista opens the café in the morning, the night owls come out after dark), the light follows your own time of day, and the music is synthesized live. It is built for crypto people: the residents, signs and hidden finds are full of Crypto Twitter references, kept rare and in context.

What is new: the NFT is not a profile picture pasted on a game. Each Chog is rebuilt in 3D from its traits, and the collection's on-chain rarity is the property market of the hotel. Your holdings are your license: they decide how big a place you can run and what it can do. The hotel tower in the town physically grows as more people check in. And your phone becomes a pocket view of your room: Lev rings it when someone visits while you are away.

## 03 Why Chog matters

Take the NFT out and two things disappear:

1. **Who you are.** Every trait value has its own 3D model (58 eyes, 66 heads, 96 bodies, 22 auras, 9 held items, the 10 one-of-one Legendaries), so holders walk around as their exact Chog. Everyone else is the default purple guest.
2. **What you can run.** The collection's on-chain `Tier` trait gives points (Common 1, Uncommon 1, Rare 3, Epic 5, Legendary 12). The wallet's total sets the venue tier: Room, Suite, Floor or Penthouse, with capacity 12 / 20 / 32 / 50, a stage from Fren, a VIP upper level from Whale, tier-locked pieces. Sell below your tier and the venue freezes for 7 days, then moves to a smaller room. Splitting Chogs across wallets does not pay; holding more does.

Holders are the hosts, everyone else is the crowd, and the crowd is free to play: games, rooms and contests never require an NFT, and nothing is pay-to-win.

**$CHOG:** the official shop sells soulbound items (decor, auras, laser eyes, extra piece budget, a security camera, 24 h events) for $CHOG or MON. 90 % of every spend is burned as $CHOG, 10 % goes to the team; MON payments swap directly against the CHOG/WMON pool. Tips go 100 % to the venue owner. Contract on Monad: `0x0eD0D1c8782819Cb9AbFe183C6c0235F248B2F9a`.

## 04 Show it working

- **Demo:** https://chog-hotel.pages.dev (desktop browser)
- **Video:** <YouTube / X link>
- **Testing instructions (about 5 minutes, works alone, no wallet needed):**
  1. Open the site on a desktop. The First steps list (top left) guides you.
  2. Walk into the Chog Hotel (click the ground or WASD) and talk to Lev at the desk (E). Without a wallet you get a temporary room; connecting one (a free signature, no NFT needed) gives you a saved room with a door number.
  3. In your room press B to decorate.
  4. Press G for the games, or click a resident and press Challenge. Try the Daily Chog.
  5. Press C and pick a token under "Preview what holders get" to see a holder's Chog and tier.
  6. Holders: connect your wallet; you appear as your Chog and can activate a venue at Lev's desk.

## 05 Under the hood

- **Repository:** https://github.com/boranoyundaa-cmd/chog-town (server: https://github.com/boranoyundaa-cmd/chog-town-server)
- **Stack:** Three.js (no build step, everything procedural: Chogs, town, rooms; custom outline and toon post-processing), Node + WebSocket server on Fly.io, Solidity + Foundry (soulbound ERC-1155 on Monad mainnet), ethers.js, Web Push, Cloudflare Pages.
- **Pre-existing work:** the Chog character renderer and the art style began as an art prototype before the hackathon. The town, hotel, rooms, residents, games, Exhibition, shop, contract, server and phone companion were built during Chogathon.

## 06 What's next

- **Usage so far:** live since 2026-10-16; tested end to end with a mock chain, wallet and second client (357 automated server checks). Real-world feedback starts with the judging week.
- **Next:** holder events (opening nights, DJ sets, gallery shows), NFT frames that show any NFT from your wallet on your walls, more asset themes for rooms, moderation tools for venue owners, and a mobile companion that grows from viewing your room to managing it.

## Demo video (≤ 3 min, desktop capture, captions instead of voice if preferred)

Record at 1920 x 1080 with sound on (the music is part of it). Use `?hour=19` for the golden hour if recording at night.

| Time | Shot | Caption |
|---|---|---|
| 0:00–0:12 | Plaza, slow walk past residents, the hotel in view | All 1,969 Chogs. One town. |
| 0:12–0:30 | My Chog window: guest, then two holder previews (C, "Preview what holders get") | Your Chog, rebuilt from its traits. No NFT? You are the purple guest. |
| 0:30–0:55 | Into the hotel, Lev's greeting, the key scene | Lev checks you in. Every wallet gets a room. |
| 0:55–1:20 | Decorating (B): place a sofa, a lamp, wall text; walk around it | Decorate it. Save it. Anyone can visit. |
| 1:20–1:45 | Elevator to a venue floor, a decorated venue with DJ booth, a tip toast | Holders run venues: more and rarer Chogs, bigger places. |
| 1:45–2:15 | Two quick games (Stack, rock-paper-scissors with a resident), trophy shelf | Seven mini-games. Daily boards. Trophies. |
| 2:15–2:35 | Shop (K): an aura and laser eyes, the burn line | The shop burns $CHOG. 90 % of every spend. |
| 2:35–2:50 | The phone: Lev's QR key, the room on the phone | Your room in your pocket. Lev rings when someone visits. |
| 2:50–3:00 | Inspect: the camera pulls out over the whole hotel | Chog Hotel. Check in. |
