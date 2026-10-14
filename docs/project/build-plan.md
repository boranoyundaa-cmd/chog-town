# Build plan (owner decisions of 2026-10-15)

All open questions were put to the owner on 2026-10-15. These answers are final for the hackathon build; they replace older text where they disagree.

## Status

**Built and tested locally (mock chain and wallet):** rename and tiers, culture pass (42 residents, plaques, props, events, UI text), synthesized audio, 7 mini-games with NPC challenges, boards and trophies, Exhibition floor, tier perks (capacity, stage and DJ booth, VIP level, game tables, tier-locked pieces, freeze, upgrade, move), shop UI and server, ChogShop contract with tests and deploy script, guest portrait, small fixes (invite matching by id, queued `enter` calls), bigger town and interiors.

**Left:**
1. Deploy the server, then the site; commit and push both repos.
2. The owner deploys ChogShop from their wallet and sets `SHOP_CONFIG.shop` (client) and `SHOP_ADDRESS` (server); the MON path stays off until a router is set.
3. Live checks with a real wallet and a second player.
4. Performance on real hardware.
5. Demo video and submission: the owner's call.

## Name and language

- The game is called **Chog Hotel** (was Chog Town; renamed everywhere).
- In-game text is **English only**.

## Tiers

- Tier names: **Ser, Fren, Whale, Legend** (tiers 1 to 4, same points and thresholds as `docs/game/design.md`).
- The venue each tier gets is named **Room, Suite, Floor, Penthouse**.
- Each tier adds, besides size and budgets: **capacity** (people inside at once), **stage + DJ booth** (music choice from the synthesized tracks), **VIP room** (a part of the venue with its own entry rule), **mini-game tables** (Connect four, Long/Short) placeable inside. Which tier gets which: Claude decides, rising with tier.
- **Tier-locked shop items:** the most legendary and expensive shop items need a venue tier to buy or place, shown as "Requires Whale" (or the tier name) in the shop.
- **Holdings fall:** the venue is **frozen** (closed, decor kept); if the tier is regained within 7 days it reopens, otherwise the slot is freed. Falling to a lower tier offers a move to the smaller room.
- **No anti-rental rule** (no holding period, no delegation).
- Left to Claude: tier upgrade of an existing venue (door number change), penthouse at the top of the tower, tower height from the floor count, guard at the elevator of a whole-floor venue.

## Economy and $CHOG

- **$CHOG token:** `0x350035555E10d9AfAF1566AaebfCeD5BA6C27777` (given by the owner; verify on chain before use).
- **Every spend in the shop:** **90 % of the price is burned as $CHOG, 10 % goes to the team wallet as $CHOG.** The team wallet (and contract admin) is **the wallet that holds Chog #1700** (read from chain).
- **Pay in $CHOG or in MON:** paying in MON swaps to $CHOG on a Monad DEX inside the same transaction, then burns 90 % / sends 10 %. Claude picks the DEX (deepest $CHOG pool) and guards the swap (slippage limit, min out).
- **Prices are fixed $CHOG amounts** set by the admin (one call to update). Level: cheap, about **$0.5 to 3** each at today's price.
- **Only the official shop.** No player-to-player market, no creator publishing.
- **Shop items are soulbound ERC-1155 NFTs** (on chain, visible in the wallet, not transferable).
- **No venue license contract:** the server keeps reading Chog holdings from chain.
- **Tips:** a visitor can tip a venue owner in $CHOG; **100 % goes to the owner.**
- Contracts are pausable with daily caps (no testnet, Monad mainnet). **Claude writes the contracts, tests and a deploy script; the owner deploys from their own wallet** and gives the addresses back.
- Gambling venues: **not in v1** (final).

### What the shop sells

- **Furniture and decor kits** (themed: degen, bull/bear, halloween...). The current free pieces and the 5 themes **stay free**; the shop only adds new pieces.
- **Chog cosmetics in extra slots only:** they never replace NFT traits (aura or effect, held item, badge, name plate colour, laser eyes...). Guests and holders both wear them.
- **Venue extras:** extra light and piece budget, events / festivals (announced in the lobby and town, "tonight"), the **security camera** (on PC a window showing the venue live; mobile later).

## Mini-games

All solo-playable; NPCs accept two-player challenges (labelled), so a lone judge can play everything. No token rewards. **Trophies and badges** (daily-capped) become shelf pieces in the Home and badges on the My Chog card, plus **daily and weekly leaderboards** per game (server side).

| Kind | Game | Where |
|---|---|---|
| Record | Stack the luggage (one button) | Arcade |
| Record | Rhythm to the club music | NOVA DJ booth |
| Record | Daily Chog: guess today's Chog from trait hints, same puzzle for all | Gallery |
| Two players | Rock-paper-scissors with Chog gestures | anywhere, "Challenge" on a player or NPC |
| Two players | Dance copy | anywhere |
| Two players | Connect four, Chog-face pieces | café tables, venue tables |
| Two players | **Long/Short duel:** both pick long or short on the same fake chart, the candle opens, PnL decides | arcade, venue tables |
| Contest | Weekly Home contest | Exhibition floor |

**Exhibition floor:** a weekly theme; a player submits a snapshot of their Home; **one signed vote per wallet, no vote for yourself**; the winner tops the floor for a week and gets a trophy.

## Sound and music

**Synthesized in code (WebAudio), no files.** Sound effects for the game, the rhythm game's track, and **ambient looping music per place** (light and repeating: hotel lobby, outdoors, café, club, arcade...). Volume and mute in Settings.

## Culture

- **Archetypes:** all 23 from `docs/game/culture-cast.md` go in; Claude cuts weak or generic lines and keeps the best 6 to 8 per character.
- **Cameos (all 16 of `docs/game/culture-cameos.md`):** to avoid legal risk they appear **under a nickname** (e.g. "The Duck" for DonAlt), as **our own original Chog design** that only nods to their profile picture (never a copy of it, never the real face), saying **only their real posts**, with the date and "X post" in small print and **no real name or handle**. Lines marked (?) ship only once checked against the original. Anyone who asks is removed.
- **The Nad and Monad in-jokes:** Claude researches Monad community culture and writes them; the owner corrects later.
- **World content, all of it:** plaques and redrawn iconic images, the interactive props (the Rug, gm wall, laser-eyes booth, liquidation button, seed-phrase vending machine, elevator "ser, please"...), real-clock events, UI text (loading tips, buttons, errors, toasts). Source: `docs/game/culture-world.md`.
- Dialogue plays **only on click** (done).
- **No reference hunt** (dropped by the owner).
- NPC crowd outside stays **about 16** at once (`NPC.target`); the 42 characters rotate by their schedules.

## Other

- **Guest portrait:** a player without an NFT shows **the Chog Genesis collection's own profile picture** (the purple Chog) on their profile card.
- Demo video, submission text, demo tour: **not now**; the owner handles promotion. The game must work and be good.
- **Deploy only at the end of the build.** Live checks with a real wallet are done by the owner after the deploy.
