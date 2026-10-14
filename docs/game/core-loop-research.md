# Core loop research

Question: what is the core loop, and why would Chog Hotel be fun? Researched 2026-10-07 from web sources (mostly secondary: press, analyst blogs, interviews; figures are as reported, not audited). Conclusions marked **[inference]** are ours, not a source's.

## 1. Why blockchain games failed

Scale: up to $15B spent on web3 games; ~93% of projects effectively dead; 300+ shut down; only 12% of gamers had even tried a crypto game at the peak (Caladan / DappRadar / Coda Labs via CoinDesk). Axie Infinity went from ~2.7M daily users to ~5,500. Hamster Kombat lost 96% of its users in six months. Web3 D30 retention is typically 2-5% and DAU often falls ~95% within 8 weeks once airdrop farmers leave.

Root causes, in order of weight:

1. **Money was the motivation, so the game was a financial loop.** Axie's earnings needed a constant flow of new buyers; sources (tokens) were huge, sinks weak, supply uncapped. When inflow slowed, earnings fell and players left. A 2025 study of Axie and Gods Unchained found token rewards attract crowds but do not keep them once play stops being enjoyed.
2. **Token and NFT before game.** Capital funded tokens, not games people wanted. Examples: Pixelmon raised $70M, no game after four years; Ember Sword spent $18M over seven years and shut down without refunds. Dev cycles (3-5 years) outlast the token cycle.
3. **Wrong audience.** Built for crypto speculators, not gamers. Pixels' CEO (2026): stop building for crypto gamers; crypto should be the backend, invisible to the player.
4. **Extraction.** A tiny fraction of players drove nearly all spend in Pixels; ~40% of its active wallets were bots; rewards subsidised extractors. The Pixels team later cut DAU on purpose and now manages "return on reward spend".
5. **Empty worlds.** Metaverses (Decentraland, Sandbox, Somnium) were valued at ~$1B with tens to thousands of daily users; the draw was assets, not a place worth being in. Wallet friction and chain latency add to it (Primodium: 2 minute world load).
6. **Entry cost and grind.** Axie needed an upfront NFT purchase; Big Time NFT prices rose until new players were priced out.

What the survivors share: **the core loop is fun without the token.** Off The Grid (battle royale, optional web3, ~15k Steam peak), Pixels (browser farming, ~86% of daily base returning users, but new-user D1 only ~25% vs a 40% target), Sunflower Land (rebuilt after a 2022 collapse, renamed "play-and-own", chapter updates every ~3 months, Google login), Gods Unchained (real card game). Even they struggle to grow.

## 2. Why MMOs fail (any chain)

- **Early churn is the biggest loss:** most players leave in the first minutes/hours, long before any paywall (Aion analytics).
- **Dropped into a world with no goal.** Tutorials that end with "go do whatever" lose newcomers; fix: goals that can be dropped at any time.
- **MMOs neglect the solo player.** Population thin at launch, so every group-dependent feature is dead on arrival; players should enter as individuals and opt into grouping.
- **Split audience / grind** (WildStar: hard raids pushed casuals out, grind drained hardcore). Unstable, slow launch.
- **Too big a world for the population;** players concentrate into a few huge guilds.
- **Cost:** story content is expensive and consumed fast; MMOs need repeatable content.

## 3. What worked (isometric / social MMOs)

Isometric view is not the problem: Albion, Dofus, Tibia, RuneScape, Habbo, Ragnarok all use it. They died or lived on loop and population.

- **Habbo** (GDC): players and their rooms are the content; user-made content kept it fresh for years. Social value decays fast when you are away, so remind players the world exists (mail, events). Newcomers face a "valley of death" before they learn the social norms; small badge/goal systems gave structure. An *earned* currency made expensive items long-term goals and improved retention.
- **Ultima Online** (25 years): player economy and crafted goods, player housing (hire NPC shopkeepers), community, and constant maintenance by many hands. Houses are a long-term anchor.
- **Albion:** a clear niche, **all items crafted by players**, a Black Market that works as an item sink, tiered risk/reward zones so newcomers learn safely, free-to-play at the right moment. Founding packs rather than crowdfunding.
- **Dofus:** ~95,000 guilds and 13,000 alliances; deliberately limited retro servers because empty servers cannot be merged later.
- **Tibia / OSRS:** long life from continuous updates and nostalgia; RuneScape's graphics overhaul reportedly cost players.

## 4. What this means for Chog Hotel

Written against the original medieval plan (pillars: town, duels, market); the chosen direction is in section 5. Facts about that design, then **[inference]**:

1. **We have a feature list, not a loop.** "Living town + duels + market/crafting" does not say what a player does in minute 5 or why they return tomorrow. Everything above says the loop must be fun *with no token and no rewards*.
2. **Population is our biggest structural risk.** At most 1,969 holders, few online at once, and the Chogathon rules say judges test alone within a week. Any loop that needs other players (duels, market) is empty in the demo. The loop must be **fully enjoyable solo**, with social as a bonus: PvE/bot duel opponents, NPC residents, asynchronous social (visit a home, leave a gift, leaderboard).
3. **Houses are the strongest retention evidence we have, and they are already NFT-exclusive.** UO and Habbo both anchor retention on a personal space you decorate and show off. This suggests house and decoration should be part of the core loop, not "later". Needs the owner's decision.
4. **A market full of tokenised items is the Axie trap if rewards are tied to it.** Rule: sinks > sources, no "earn" promise, no `$CHOG` reward for play. Prefer Albion's model: items crafted by players, consumed by use, an NPC sink.
5. **Trait abilities in duels create pay-to-win** for holders (owner already worries about snowballing). If duels stay, abilities should be sidegrades (different, not stronger).
6. **Judging fit:** Fun 20% and Retention 20% need a daily reason to return (small goals, daily events), Clarity 15% needs a one-sentence loop, Novelty 30% is where Chogs-as-residents and NFT houses can stand out.
7. **Idle/timer loops** (Sunflower Land) survive but are shallow; they should be a layer, not the loop.

## 5. Decision (2026-10-08) and follow-up findings

Chosen: a Habbo / Roblox-style **social creator sandbox with player-run venues** (`docs/game/design.md`). The medieval MMORPG and the duel ladder were dropped. Findings that shaped it:

- **Habbo itself tried it.** Sulake sold 12,500 Habbo Avatar NFTs (sold out in ~26 hours), announced a play-to-earn Web3 hotel "Habbo X" (alpha Dec 2022), then dropped "Web3" wording in 2023 and left Habbo X in alpha (no official cancellation found). "Habbo + blockchain" is not novel by itself; the Chog-specific hook has to carry novelty.
- **Nostalgia is weak as the hook.** Habbo Origins (2024) had demand but mostly negative recent Steam reviews; Club Penguin Rewritten had 5-11M accounts but was shut down by Disney over IP.
- **Play-to-earn splits in two.** Emission-funded rewards (Axie) fail. Player-to-player host income (Second Life, Roblox) lasts but is top-heavy: Roblox's DevEx median is ~$1,500 with 42,000+ participants; Second Life had 830 residents above $1,000/month in 2007. So "passive income" must never be promised.
- **Paywalls hurt participation** (Pixels reported weak turnout behind paywalled guilds; secondary report, not checked at source).
- **Gambling venues are a platform liability.** Roblox faces a class action over third-party gambling sites; Second Life banned casinos in 2007.
- **Holder data:** 1,969 tokens in 1,012 wallets; a flat per-wallet limit can be dodged by splitting, so the venue license is tiered by points per holding.

Sources for these: Sulake / Habbo X (pcgamer.com/habbo-abandons-web3-jargon-but-remains-all-in-on-the-blockchain), Habbo Origins (exchangewire.com/blog/2024/06/18/azerion-announces-launch-of-habbo-hotel-origins-a-nostalgic-trip-back-to-2005), Club Penguin Rewritten (techraptor.net), Second Life economy (modemworld.me/2024/12/20), Roblox payouts (dexerto.com Roblox top creators), Roblox gambling suit (dailydot.com/roblox-gambling-lawsuit), Second Life casino ban (giga.law/daily-news/2007/08/01/second-life-bans-gambling-cites-conflicting-regulations).

## Sources

- Caladan via CoinDesk: https://www.coindesk.com/markets/2026/04/23/more-than-90-of-web3-games-failed-after-usd15-billion-boom-as-gamers-never-showed-up-caladan
- BlockEden Q1 2026: https://blockeden.xyz/blog/2026/05/02/web3-gaming-collapse-q1-2026-eight-shutdowns-token-retention/
- DappRadar Q2 2025: https://dappradar.com/blog/state-of-blockchain-gaming-in-q2-2025
- Axie analyses: https://reason.com/2022/02/01/the-biggest-nft-video-games-economy-is-collapsing-because-nft-games-dont-work/ , https://yukaichou.com/gamification-study/economy-design-framework-axie-infinity-collapse/
- Pixels CEO: https://www.blockchaingamer.biz/features/interviews/41204/2026-trends-pixels-luke-barwikowski-only-way-save-crypto-gaming-not-build-for-crypto-gamers/ , https://www.blockchaingamer.biz/news/42338/where-does-pixels-go-next/
- Sunflower Land: https://naavik.co/digest/sunflower-land/
- Metaverse usage: https://hyperallergic.com/769614/metaverse-decentraland-is-empty/ , https://blockworks.co/news/metaverse-platforms-set-the-record-straight-about-daily-active-users
- On-chain games: https://cn.paradigm.xyz/2023/08/onchain-games , https://alliance.xyz/essays/unblocking-on-chain-games-part-one-throughput
- Habbo GDC: https://www.gamedeveloper.com/game-platforms/gdc-habbo-s-haro-talks-marrying-social-worlds-with-game-mechanics
- Ultima Online (Koster): https://www.raphkoster.com/?p=42744
- Albion: https://mein-mmo.de/en/8-year-old-mmorpg-from-berlin-is-successful-while-the-larger-competition-is-disappointing-now-it-reveals-the-secret,1517698/
- WildStar: https://massivelyop.com/2018/11/30/the-nexus-telegraph-what-other-games-can-learn-from-wildstars-demise/
- Solo MMO design: https://www.gamedeveloper.com/design/crafting-a-massively-single-player-online-experience
- New player churn: https://massivelyop.com/2022/05/25/perfect-ten-10-great-ways-to-lose-new-players-from-your-mmo/
