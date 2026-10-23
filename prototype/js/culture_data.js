// culture_data.js - Chog Hotel culture content (data only, English). One global: CULTURE.
// Dialogue is shown ONLY on click. Cast / cameos / nad lines: use CULTURE.pick(lines, holder) so a click never repeats the last line.
//
// INTERNAL ONLY (owner: delete a cameo object below to remove a person, nothing else depends on it):
//   nickname            -> who
//   The Duck            -> DonAlt
//   The Tidy Teacher    -> Cred
//   The Host            -> Cobie
//   The Milkshake Man   -> Hsaka
//   The Rabbit Hunter   -> GCR
//   The Tea Sage        -> Pentoshi
//   The Funny Hat       -> Arthur Hayes
//   Banana Man          -> Raoul Pal
//   Mr. Four            -> CZ
//   The Orange Wizard   -> Michael Saylor
//   Smol Wassie         -> Smolting
//   Sweater Anon        -> Loomdart
//   The Cold Coffee     -> Andrew Kang
//   The Pyramid Podcaster -> Pomp
//   Cricket Whale       -> Tetranode
//   Bear Suit Guest     -> Vitalik
//   (The Old Bankers = Buffett / Dimon quotes, Satoshi's Shadow = Satoshi forum quotes; both flagged verify:true)
//
// Shapes:
//   cast:    { id, name, role, look, place, hours:[[from,to,placeId],...], lines:[string] }   hours are local clock hours 0-24; place 'any' = roams
//   cameos:  same + lines:[{text, src}] ; src is 'X post, Mon YYYY' (date only, no handle, no link); optional when:{month,dayFrom,dayTo}, rare, needsCheck
//   events:  when:{ month, day, weekday(0=Sun), hourFrom, hourTo (decimal hours), chance (0..1; per day unless perDay:false), lastDayOfMonth, year }
const CULTURE = (() => {
  const L = (text, src) => ({ text, src: 'X post, ' + src });
  const P = (id, place, title, text, art) => { const o = { id, place, title, text }; if (art) o.art = art; return o; };

  // ---------------------------------------------------------------- the Nad (shared by cast.nad and CULTURE.nad)
  const nadLines = [
    "gmonad.",
    "Parallel execution means everything happens at once. Including the memes.",
    "Ten thousand TPS. Ask me again. Ten thousand.",
    "Testnet nads remember the faucet. We remember the queue.",
    "Chog is the lore. There is no deeper lore. Stop digging.",
    "Molandak is spiky, wholesome, mildly threatening. Do not hug.",
    "Mainnet went live on November 24, 2025. The animals finally have a home.",
    "Same EVM, same tools, just faster. We kept the vibes purple."
  ];

  // ---------------------------------------------------------------- 1. cast (23 archetypes + 2 verified-quote figures)
  const cast = [
    { id: 'sergm', name: 'Ser Gm', role: 'The gm guy', look: 'Cream chog in a green scarf and a beanie, one hand always waving, a tiny sun badge.', place: 'plaza', hours: [[0, 24, 'plaza']],
      lines: ["gm.", "gm. It's 3 AM. gm.", "Have you said gm today? It's free. It's the only free thing in crypto.", "gm ser. Wait, am I the ser?", "I say gm to everyone. Some say gm back. Those are my friends.", "Someone gm'd me yesterday and I felt something. Probably nothing.", "Time zones are a lie. It's always gm.", "I said gm to a rug once. It didn't pull. Respect."] },
    { id: 'hodler', name: 'The Old Hodler', role: 'Since 2013', look: 'Grey-whiskered chog in a worn flannel, a thermos, a framed printout reading I AM HODLING under one arm.', place: 'park', hours: [[8, 18, 'park']],
      lines: ["I AM HODLING.", "I typed it wrong. I knew it was wrong. I kept it wrong. That is conviction.", "Sell? I do not know that word.", "It fell 40% in a day once. I had whiskey. I was fine.", "\"Hold On for Dear Life.\" That's what the H stands for. It doesn't. Doesn't matter.", "Hodl is not a strategy. It's a personality.", "It's all green on my screen. It's just not mine yet.", "I'm not drunk. I'm just very long."] },
    { id: 'pizza', name: 'Pizza Man', role: 'Delivery', look: 'Chog in a red delivery cap and jacket, a flat pizza box stack on a scooter-rack backpack.', place: 'street', hours: [[11, 14, 'street'], [18, 21, 'street']],
      lines: ["Two pizzas. Ten thousand bitcoin. May 22, 2010. Best deal I ever saw. For the pizza place.", "Don't ask what it costs. Ask what it will cost.", "Please don't pay me in coins. I know how this story goes.", "One day a pizza will be worth a house. That day was yesterday. You missed it.", "Large pizza: 0.0004 BTC. Subject to change. Mostly up.", "Delivery is free. Gas is not.", "Every May 22 we eat for free. In theory.", "I never got paid in BTC. That's the other joke."] },
    { id: 'larry', name: 'Line-Drawer Larry', role: 'The chartist', look: 'Chog with a pencil behind the ear, paint-splattered smock, a wheeled whiteboard covered in crayon lines.', place: 'street', hours: [[9, 17, 'street']],
      lines: ["See this? Head and shoulders. See THIS? Also head and shoulders. Everything is head and shoulders.", "I drew a line. Price touched it. Price touched it again. That's called science.", "The chart is bullish. Unless it goes down. Then it was a fakeout.", "Support is a state of mind.", "If it breaks out, I called it. If it breaks down, I called it. I always called it.", "My wife says it's just a heart. I say it's a double bottom.", "I don't need fundamentals. I have crayons.", "A candle is just a candle. Until it's a very long candle."] },
    { id: 'doombear', name: 'The Doom Bear', role: 'It is over', look: 'Chog in a heavy brown bear-ear hood, black coat, perched on a rooftop edge with a single umbrella.', place: 'plaza', hours: [[17, 23, 'plaza']],
      lines: ["It's over.", "It's so over. ...It's so back? No. It's over.", "Every cycle I call the top. Twice I was right. Both times I sold.", "I've been bearish since 2017 and I'm still waiting to be right.", "Winter is coming. It's always coming. It's coming for you.", "You're up? Cute. Check back in a month.", "I have cash. Lots of cash. Inflation has been very hard on it.", "My therapist calls it catastrophizing. I call it being early."] },
    { id: 'nocoiner', name: 'The Nocoiner', role: 'Tourist', look: 'Chog in a bucket hat, a camera and a paper map, a very confused expression and a fanny pack.', place: 'street', hours: [[9, 19, 'street']],
      lines: ["So it's a game where you own a cartoon animal? And that's the whole thing?", "Is this a casino?", "What's a \"ser\"? Is it a typo?", "Everybody keeps saying \"gm\". I said \"good afternoon\" and got three confused looks.", "Everyone says they're \"early\". For what?", "Someone said \"DYOR\" and walked away. Do my own what?", "Can I pay in dollars? I have dollars. *people gasp*", "They keep saying \"not financial advice\". Then who is giving the advice?"] },
    { id: 'wassie', name: 'The Wassie', role: 'Reads every tweet', look: 'Small green frog-like chog, a crescent moon on the chest, big wet eyes, a tiny phone.', place: 'any', hours: [[0, 24, 'any']],
      lines: ["ser pls.", "i was born in the bear market and i will die in it.", "we are so back. we are so back. we are so back. ngmi.", "i live two weeks. i spent one of them reading tweets.", "a wassie reads every tweet. every. tweet. help.", "touch grass? the grass is on the chart.", "ser the chart is red ser.", "frens, i have a feeling. it is probably nothing."] },
    { id: 'midwit', name: 'The Midwit', role: 'Cafe terrace', look: 'Chog with round glasses, a turtleneck and a laptop covered in stickers, a bell-curve mug.', place: 'cafe', hours: [[9, 17, 'cafe']],
      lines: ["Actually, if you think about it, the fundamentals suggest...", "It's not a currency, it's an asset class. Also a currency. Depending.", "Be careful with leverage. Anyway, I'm 5x long.", "I don't believe in memecoins. I believe in infrastructure tokens with a strong community.", "Both extremes are wrong. I'm moderate. Moderately rekt.", "I read the whitepaper. The first page.", "I've done my own research. Three podcasts.", "It's a bell curve. I'm the hump."] },
    { id: 'degen', name: 'The Degen', role: 'Arcade regular', look: 'Chog with red-rimmed eyes, an energy-drink can, a hoodie full of arcade tokens, bed hair.', place: 'arcade', hours: [[18, 24, 'arcade'], [0, 3, 'arcade']],
      lines: ["100x leverage. What's the worst that could happen. *looks at wallet* ...", "I'm not gambling. I'm high-frequency conviction.", "Up 40x on Monday. Down 100% on Tuesday. Net result: character development.", "Rent is due. Rent is a long-term position.", "One more trade and I'm out. *that was six trades ago*", "My liquidation price? Oh, it's close. Emotionally close.", "Sold my car for the airdrop. The airdrop was a quest.", "Ape first, read later. The docs were a blog post anyway."] },
    { id: 'farmer', name: 'The Airdrop Farmer', role: 'Six laptops', look: 'Chog in a quilted vest with a head-lamp, six laptops wired together, cables everywhere.', place: 'cafe', hours: [[10, 22, 'cafe']],
      lines: ["Eight hundred wallets. Zero friends.", "I bridged $4 to nine chains. Each one sent me a mascot.", "Quest 41 of 90: swap a token you don't want for a token you don't want.", "Points. They're points. Points will be worth something. Points.", "Wen snapshot? I haven't eaten since the last snapshot.", "Sybil? Me? I prefer \"distributed enthusiast\".", "Claim opens in two days. It has opened in two days for six weeks.", "The airdrop was 4,000 tokens. They're worth $11. I regret nothing. I regret everything."] },
    { id: 'saver', name: 'The Right-Click Saver', role: 'Gallery lobby', look: 'Chog with a cursor-arrow pin, a tote bag of printouts, a smug half-smile.', place: 'gallery', hours: [[11, 19, 'gallery']],
      lines: ["I right-clicked. I saved. I own it now. Spiritually.", "An NFT is a screenshot with extra steps.", "Looks rare.", "The JPEG isn't the point. The token is the point. I'm told.", "This collection has a Discord with 100k members. 99k are bots. The bots are the community.", "Floor was 12. Floor is 0.01. Floor is a journey.", "Utility is coming. Utility has been coming since 2021.", "gm. Mint is live. Mint is dead. gm."] },
    { id: 'rugvictim', name: 'The Rug Victim', role: 'Quiet bench by the exit', look: 'Pale-pink chog, long sad face, red tear streaks, a worn rug-patterned blanket on the shoulders. Gentle, never mocked.', place: 'street', hours: [[7, 22, 'street']],
      lines: ["I was early. So early I was there before the rug.", "The dev was doxxed, they said. He wasn't.", "It had an audit. The audit was a screenshot.", "Never again. *looks at phone* ...Is that a new launch?", "The roadmap had a game. The game was a PDF.", "The Telegram admin said \"we are building\". Then the Telegram was deleted.", "At least I learned something. What did I learn? That it hurts.", "There's a support group. It's a group chat. I'm checking it isn't a rug."] },
    { id: 'jeet', name: 'The Jeet', role: 'Always walking', look: 'Chog in running shoes and a sweatband, a stopwatch, wrists lined with little profit stickers.', place: 'any', hours: [[0, 24, 'any']],
      lines: ["Up 2x? Sold.", "Why hold when you can have profits right now?", "I sold the top. The top of a 4% pump. That's technically the top.", "Bought at 10, sold at 12. It went to 400. Anyway.", "I take profits every time. Of 1.3%.", "Paper hands built this town.", "Diamond hands? My hands are a spreadsheet.", "Every coin I sold is up 10,000%. Which proves I'm good at getting out of the way."] },
    { id: 'kol', name: 'The Influencer', role: 'KOL', look: 'Chog in white sneakers and a puffer vest with a ring light on a stick, always filming himself.', place: 'street', hours: [[10, 19, 'street']],
      lines: ["NFA. DYOR. But also: this will 100x.", "Link in bio. The bio is a link.", "Thread: 1/47. Why this changes everything.", "I only shill things I believe in. I believe in everything. It's a gift.", "Disclosure: I was paid. Disclosure for the disclosure: I was paid to disclose.", "Alpha group, $200 a month. The alpha: \"buy low\".", "I called it at 4 cents. Here's the screenshot. Ignore the other forty calls.", "I'm just asking questions. Questions that happen to hold bags."] },
    { id: 'maxi', name: 'The Maxi', role: 'Steakhouse door', look: 'All-orange chog in an orange hoodie with a laser-etched B, a steak knife, a stack of coin tokens.', place: 'street', hours: [[12, 22, 'street']],
      lines: ["Bitcoin fixes this.", "Bitcoin fixes inflation. And the weather.", "Not your keys, not your coins. Not your steak, not my problem.", "Number go up technology. That's the whole thing.", "Ethereum is a tech company. Solana is a casino. Bitcoin is a religion. I'm a bishop.", "Fiat is melting. Look. See it melt? You're holding a puddle.", "I pray at the genesis block every January 3.", "I'm not angry. I'm orange. There's a difference."] },
    { id: 'ethguy', name: 'The ETH Guy', role: 'Lobby, by the elevator', look: 'Slim chog in a grey-blue diamond-patterned hoodie, a tiny diamond pin, a latte cup and laptop.', place: 'lobby', hours: [[8, 20, 'lobby']],
      lines: ["ETH is ultrasound money. Don't ask me what it means. It burns.", "Gas? Cheap today. Tomorrow is a mystery.", "The flippening is near. It's been near since 2017.", "Layer 2? Layer 3? Layers all the way down, ser.", "Staked, restaked, re-restaked. I own nothing. It's on a ledger of ledgers.", "Home of DeFi, NFTs and the world's most expensive screenshot.", "Gas is just a spicy tax.", "I'm bullish on rollups. Also on rolls."] },
    { id: 'nad', name: 'The Nad', role: 'Monad insider', look: 'Purple chog in a purple hoodie with an M patch, a tiny Molandak plush clipped to the bag, glowing violet eyes.', place: 'monad_floor', hours: [[10, 22, 'monad_floor'], [22, 24, 'plaza']],
      lines: nadLines },
    { id: 'liquidated', name: 'The Liquidated Trader', role: 'Always on a phone', look: 'Chog in a rumpled suit with loosened tie, staring at a phone with a red candle on the screen.', place: 'arcade', hours: [[12, 24, 'arcade']],
      lines: ["October 10. At 9:59 I was up. At 10:00 I wasn't.", "Nineteen billion got liquidated that day. I like to think I was a significant part of that. I was 0.00001%.", "I hit 100x leverage once. That's not a brag. That's a diagnosis.", "Some alts went to zero and came back. Mine only went to zero.", "I'm fine. This is fine. *sits in a room on fire*", "A year later I still check the liquidation page. Just to see.", "Binance said sorry. I said sorry to my landlord.", "They say it was the biggest liquidation in history. I say it was personal."] },
    { id: 'macro', name: 'The Macro Guy', role: 'Hotel bar', look: 'Chog in a pinstripe vest, a banana peeking from the pocket, a tablet with a stack of identical charts.', place: 'club', hours: [[16, 23, 'club']],
      lines: ["It's all liquidity. Everything is liquidity.", "Welcome to the banana zone.", "The Fed speaks at two. Nobody breathe.", "CPI day. Cancel your plans. They were already cancelled.", "I have a chart for everything. It's all the same chart.", "Rate cuts bullish. Rate hikes bullish. No rate change bullish. Context is bullish.", "The cycle is 4 years. Unless it isn't. Then it's 4 years and a feeling.", "Not a call, a view. Not a view, a mood."] },
    { id: 'memekid', name: 'The Memecoin Kid', role: 'Plaza, late', look: 'Small chog in an oversized hoodie and bright sneakers, a phone with a dog-and-hat sticker case.', place: 'plaza', hours: [[20, 24, 'plaza']],
      lines: ["Launched my coin in 40 seconds. The dev sold in 41. The dev is also me.", "It has a dog, a hat, and no roadmap. Perfect.", "Utility? It's a vibe. Vibes have utility.", "Everyone says it's a casino. Yeah. That's why I'm here.", "A coin about a squirrel went to a billion. A coin about a toilet went to a billion. I'm not saying anything.", "Pump it. Then buy another. Then pump that.", "The dev is doxxed. His name is Dev. That's doxxed.", "Mom says dinner. Mom says sell. Mom is wrong about one of those."] },
    { id: 'sleuth', name: 'The Sleuth', role: 'Alley behind the hotel', look: 'Chog in a dark hood with a magnifying glass on a lanyard, a laptop full of sticky notes and red string.', place: 'street', hours: [[19, 24, 'street']],
      lines: ["I traced it. Seven wallets. One guy.", "Receipts or it didn't happen.", "The \"team\" is three stock photos and a guy named Kevin.", "I don't make accusations. I post screenshots. The screenshots accuse.", "Follow the money. It always leads to a fountain pen and a yacht.", "Today's thread: how a \"partnership\" turned out to be a coffee.", "Every rug leaves tracks. Mostly Etherscan tracks.", "Anonymous? So am I. The difference is, I'm right."] },
    { id: 'linkmarine', name: 'The Link Marine', role: 'Plaza flagpole', look: 'Chog in a blue beret with a small chain-link badge, salutes stiffly beside the flagpole.', place: 'plaza', hours: [[6, 18, 'plaza']],
      lines: ["Oracles. It's always been oracles.", "Reserve confirmed. Reserve always confirmed.", "I will not sell. I will not retreat. I will not have a normal conversation.", "The oracle problem will be solved. By us. At some point.", "Stay LINK. Stay awake.", "I've been waiting since 2017. It's an honor.", "At ease. Not at ease. Never at ease."] },
    { id: 'twins', name: 'The Calling Twins', role: 'Two identical suits on the phone', look: 'Two identical grey-suited chogs, each holding a phone that hides the face. Never look at you. Not real people.', place: 'plaza', hours: [[9, 17, 'plaza']],
      lines: ["“He bought?” “He bought.” “Dump it.”", "“He sold?” “He sold.” “Pump it.”", "“Activate CRAB-17.” *they both nod*", "“Is he long?” “Very.” “Perfect.”", "“Is the chart green?” “It was.” “Was.”", "“He's watching us.” “He's always watching us.” “Dump it anyway.”", "“Did he set a stop?” “No.” “Ah. Beautiful.”"] },
    // verified-quote figures (Part 2 of the cast doc); lines are real public quotes, check wording against originals before shipping
    { id: 'oldbankers', name: 'The Old Bankers', role: 'Three on a bench', look: 'Three grey-suited chogs on a bench with a flyer for a bitcoin fund beside them.', place: 'plaza', hours: [[10, 16, 'plaza']], quoted: true, verify: true,
      lines: [{ text: "Probably rat poison squared.", src: 'TV interview, 2018' }, { text: "It's worse than tulip bulbs. It won't end well.", src: 'Press interview, 2017' }] },
    { id: 'satoshishadow', name: "Satoshi's Shadow", role: 'Midnight only', look: 'Faceless hooded figure, a long dark cloak, one lit lantern. Gone after one minute.', place: 'plaza', hours: [[0, 0.02, 'plaza']], quoted: true, rare: true, verify: true,
      lines: [{ text: "If you don't believe me or don't get it, I don't have time to try to convince you, sorry.", src: 'Forum post, Jul 2010' }, { text: "Lost coins only make everyone else's coins worth slightly more. Think of it as a donation to everyone.", src: 'Forum post, Jun 2010' }, { text: "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks", src: 'Genesis block, Jan 2009' }] }
  ];

  // ---------------------------------------------------------------- 2. cameos (nicknames only; originals redrawn, never a copy)
  const cameos = [
    { id: 'duck', name: 'The Duck', role: 'Dry, calm trader', look: 'Chog in a grey hoodie with a small yellow duck-bill hat, a laptop, a tiny potted plant.', place: 'cafe', hours: [[11, 14, 'cafe'], [20, 23, 'club']],
      lines: [
        L("Miners get half the amount of Bitcoin and can only sell it for half the price. Halving sounds like a shit deal for them, not gonna lie.", 'Mar 2020'),
        L("Worst case, all of this internet money goes to zero. We will lose the ability to gamble. Wtf is the planet gonna do without us.", 'Feb 2025'),
        L("How cool is it that crypto is pricing in the Monday stock market dump while traditional markets are closed. And on Monday we can take part in that dump again.", 'Feb 2025'),
        L("Every time I give my bags a shoutout, some catastrophic FUD event happens to the market.", 'Apr 2023'),
        L("Woke up to my coins pumping, the fever gone and the sun shining.", 'Feb 2023'),
        L("Being wealthy, to me, means you can live where you want.", 'Jun 2023'),
        L("If you're a holder, hold. If you're a trader, trade.", 'Sep 2020'),
        L("I dislike XLM with a passion but when the chart looks good the chart looks good.", 'Nov 2019'),
        L("This is what capitulation looks like. It can go much lower than you'd expect. Not in the mood to go catch bloody knives.", 'Mar 2020'),
        L("Memes and ponzis are all fun and games until shit hits the fan.", 'Feb 2022'),
        L("Weekend rally would be nice for a change. Could kill off some cocky late bears.", 'Nov 2025'),
        L("Retraces are short and vicious. Crashes even more so. 40% down is not unlikely, it'll happen again.", 'Jun 2020'),
        L("I'm expecting a rekt timeline again. Until then have some fun, just don't fall for the same trick twice.", 'May 2021')] },
    { id: 'teacher', name: 'The Tidy Teacher', role: 'Trader and teacher', look: 'Chog with round glasses, a chalk-dusted sleeve, a tidy notebook and a small whiteboard.', place: 'lobby', hours: [[10, 17, 'lobby']],
      lines: [
        L("Revenge short: \"Can't believe I missed this piece of shit scam pumping; it's up so much it HAS to come down.\"", 'Aug 2026'),
        L("Was I long the breakout? No. Did I catch the news? No. But do I have a tactical pool of capital ready to deploy with a clear plan? Also no.", 'Aug 2026'),
        L("My BTC chart hasn't moved in over a month. I need volatility so I can buy the top, sell the bottom, and blame Wintermute.", 'Dec 2025'),
        L("I've had a rough personal week. It's hard to have a rough week when you trade the 10-year chart.", 'Feb 2024'),
        L("These are the days you never forget in your trading career.", 'Mar 2020'),
        L("\"Rotating\" is one of the biggest psyops. Most rotations are traders buying weak stuff because they missed the strong stuff.", 'Jun 2024'),
        L("Trading should be boring. The majority of the time is spent waiting.", 'Apr 2024'),
        L("The best trade management advice I ever received: \"Give your trade some room to breathe.\"", 'Jun 2024'),
        L("Most people who made and kept a lot of money in crypto simply survived long enough to hit a few big wins.", 'Aug 2024'),
        L("Fear of being wrong typically leads to poor trade management.", 'Feb 2023'),
        L("If it keeps going up, the market is bullish. If it stops going up and goes down, the market is bearish.", 'Aug 2026')] },
    { id: 'host', name: 'The Host', role: 'Podcast host', look: 'Relaxed chog with big headphones round the neck, a microphone with a tiny UP ONLY sticker.', place: 'club', hours: [[18, 23, 'club']],
      lines: [
        L("That coin was \"worth\" $17 million when I burned it, lol.", 'Nov 2024'),
        L("My Bitcoin price target is $238,855. I got it by googling the distance between the earth and the moon and converting miles to dollars.", 'Dec 2020'),
        L("People keep talking about \"the crypto crash\" as if Netflix is not down like 85% since December, lol.", 'May 2022'),
        L("What percent of your net worth is in crypto?", 'Dec 2021'),
        L("Nobody move.", 'Aug 2026'),
        L("The world you grew up in no longer exists.", 'Jul 2026'),
        L("I joined crypto with $200. Held that Bitcoin and never traded: about $300k. Put it all in the Ethereum ICO: about $150m.", 'Oct 2025'),
        Object.assign(L("Didn't realize it's already May.", 'May 2026'), { when: { month: 5 } })] },
    { id: 'milkshake', name: 'The Milkshake Man', role: 'Perps trader', look: 'Very still chog in front of three small monitors, a pink milkshake with a straw, an eerie calm.', place: 'arcade', hours: [[19, 24, 'arcade'], [0, 3, 'arcade']],
      lines: [
        L("There is no bear market. There is no bull market. There is only... *takes a fat rip* the market.", 'Nov 2019'),
        L("Everyone would rather be long (my) bags making new local highs over (your) bags not doing the same.", 'May 2024'),
        L("If you caught none of the top performers, you're not locked in enough. If you caught all of them, seek help.", 'Dec 2024'),
        L("Which sophisticated market participant woke up and decided to speedrun weeks worth of rotations within a few hours.", 'Nov 2025'),
        L("Degens flocking en masse to the 125x watering hole.", 'Jun 2020'),
        L("I still remember that day. Thought the Binance UI was glitching. Went through the entire gamut of emotions in seconds.", 'Feb 2022'),
        L("With every subsequent test of a supply/demand zone, the zone loses its strength.", 'Jun 2018'),
        { text: "I trade, I drink your milkshake.", src: 'X bio' },
        Object.assign(L("Merry Christmas, ya filthy animals.", 'Dec 2025'), { when: { month: 12, dayFrom: 24, dayTo: 26 } })] },
    { id: 'rabbit', name: 'The Rabbit Hunter', role: 'Anonymous trader', look: 'Hooded faceless silhouette in a dark cloak, two small white rabbits at the feet.', place: 'plaza', hours: [[18.5, 19, 'plaza']], rare: true, card: 'A silhouette with two rabbits: legend says he once bet ten million against a founder.',
      lines: [
        { text: "He who chases two rabbits catches neither.", src: 'X bio' },
        L("By my hand [$LUNC] will die. Again.", 'Sep 2022'),
        L("Are you confused as to why $SHIB finally broke out after months of consolidation, anon?", 'Oct 2021')] },
    { id: 'teasage', name: 'The Tea Sage', role: 'Trader with a notebook', look: 'Kind-faced chog with a steaming tea cup, a worn leather notebook, a knitted scarf.', place: 'park', hours: [[9, 17, 'park']],
      lines: [
        L("Was waaay too big of an ETH position, out of just pure greed. The market humbles all and it always makes sure you pay the price of tuition.", 'Oct 2025'),
        L("Your wealth begins to trickle away like warm grains of sand sliding between your fingers. Each granule is a small loss.", 'Nov 2025'),
        L("Imagine if you sold every CPI print, lmao. All news is good news, except one out of every fifty times.", 'Sep 2025'),
        L("Some red in a few charts, which means someone sold, or more people sold than bought today.", 'Oct 2026'),
        L("I remember my first bear market.", 'Dec 2022'),
        L("It's been a tough year mentally, tbh.", 'Dec 2022'),
        L("I don't have a degree in economics but still outperformed most of those that do.", 'Dec 2022'),
        L("Some thoughts about surviving and time.", 'Jun 2023')] },
    { id: 'funnyhat', name: 'The Funny Hat', role: 'Essay writer', look: 'Chog in a sharp open-collar shirt with sunglasses pushed up on a tall paper hat, a map of the Pacific.', place: 'club', hours: [[15, 18, 'club']],
      lines: [
        L("If I'm the Pope, I think I need a funny hat.", 'Dec 2018'),
        L("Nothing like a BTC pump to get you going for Friday happy hour! Drink responsibly.", 'Apr 2018'),
        L("BTC is heavy. I took a cheeky short. Pray for my soul, for I am a degen.", 'Sep 2024'),
        L("This is what happens when you don't respect the pump.", 'Dec 2023'),
        L("Kabloom... Hold on to your butts!", 'Mar 2026'),
        L("Let's play \"Hide the Bailout.\" It's my fav game because politics is all about misdirection.", 'Nov 2023'),
        L("Another episode in gimme 'dem dollaz!!!", 'Oct 2022'),
        L("Curious thangs going on with dollar liquidity.", 'Oct 2022'),
        L("Ouchie. Time to do some thinking.", 'Aug 2022'),
        L("Guess who is pumping BTC and ETH.", 'Oct 2022'),
        L("The exchange should never lose money if a customer gets liquidated.", 'Jan 2023')] },
    { id: 'banana', name: 'Banana Man', role: 'Macro investor', look: 'Chog in a bright tropical shirt, a banana in the pocket, a tablet showing a banana-shaped chart.', place: 'club', hours: [[16, 23, 'club']],
      lines: [
        L("We are still in the Banana Zone. Phase 1 was the breakout, now the consolidation. Next up, the \"Banana Singularity,\" when everything goes up.", 'Jan 2025'),
        L("Seems like the Banana Zone wasn't such a stupid idea... Strap in.", 'Nov 2024'),
        L("Is the Banana Zone in with us in the room right now?", 'Sep 2024'),
        L("It can't be this easy, right?... right?", 'Feb 2024'),
        L("This too shall pass...", 'Mar 2025'),
        L("Let's talk about the Crypto Waiting Room.", 'Aug 2025'),
        L("We are very close to being in the Last Chance to Add Zone in crypto.", 'Nov 2024'),
        L("Postcards from the Death of the American Dream...", 'Sep 2023'),
        L("What is Macro/Crypto Summer and why does it matter?", 'Mar 2024'),
        L("Ever wondered where all my research comes from? I've been writing it for 20 years.", 'Apr 2024')] },
    { id: 'mrfour', name: 'Mr. Four', role: 'Exchange founder', look: 'Easy-smiling chog beside a small locked box labelled SAFU, a phone, a huge number 4 on a lanyard.', place: 'lobby', hours: [[7, 12, 'lobby']],
      lines: [
        L("4.", 'Mar 2023'),
        L("Remember 4.", 'Mar 2023'),
        L("4 funny FUDs.", 'Feb 2026'),
        L("If you ever wondered why people say 4, it came from a list I made. In hindsight, I should've made \"4\" the zeroth point.", 'Jan 2025'),
        L("One, education. Two, compliance. Three, product. Four, ignore FUD, fake news, attacks.", 'Jan 2023'),
        L("Funds are #safu. No need to FUD.", 'May 2019'),
        L("FUD helps us grow, even though they are thoroughly annoying.", 'Dec 2022'),
        L("Crypto doesn't need saving. Crypto is fine. It's the beauty of decentralization.", 'Dec 2022'),
        L("Write down the decisions you make and why you made them.", 'Feb 2023'),
        L("Large liquidity is one of the best consumer protection mechanisms.", 'Jul 2022')] },
    { id: 'wizard', name: 'The Orange Wizard', role: 'Orange-pill preacher', look: 'Chog in a long orange robe with a pointed hat, a staff topped with a glowing coin.', place: 'plaza', hours: [[11, 14, 'plaza']],
      lines: [
        L("The cure to economic ill is the orange pill.", 'Jun 2024'),
        L("Never short a man who buys orange ink by the barrel.", 'May 2025'),
        L("Need a bigger orange bag.", 'Feb 2026'),
        L("Even more orange.", 'Sep 2026'),
        L("A little more orange.", '2026'),
        L("Needs more orange.", 'Mar 2025'),
        L("Bigger orange.", 'Jan 2026'),
        L("The Proof of Work architecture is a masterpiece of engineering that anchors the system to the real world.", 'May 2021')] },
    { id: 'smolwassie', name: 'Smol Wassie', role: 'Tiny wassie with a laptop', look: 'Tiny green wassie chog in a hoodie, a laptop twice his size, crescent-moon patch.', place: 'any', hours: [[0, 24, 'any']],
      lines: [
        L("The best time to quit crypto was yesterday. The second best time is today. Do it.", 'Feb 2019'),
        L("oke, we still be slayin' against bits Coin liek a boss.", 'Apr 2021'),
        L("a few pipl mite end up making it all...", 'Apr 2021'),
        L("...fries and hanburgers.", 'Apr 2021'),
        L("imagine.", 'Feb 2020'),
        L("you, by the time the chart reaches the right hand side of the screen, own 1 BTC of this nameless shitcoin on a small exchange.", 'Feb 2020'),
        L("your avg entry price is about 1k sat. it's 2017. it's just one of your say 15 shitcoin bags.", 'Feb 2020'),
        L("then this bag starts moving. u agonizingly watch as it goes higher and higher. the size of ur bag is now 22 BTC.", 'Feb 2020')] },
    { id: 'sweateranon', name: 'Sweater Anon', role: 'Trader with three phones', look: 'Chog drowning in an oversized knit sweater, a half-eaten sandwich, three phones propped on a bar.', place: 'arcade', hours: [[21, 24, 'arcade'], [0, 2, 'arcade']],
      lines: [
        L("Bitcoin was dead at 30k, now it's dead at 45k, soon it will be dead at 100000000000000000000000000000000000000000000000k.", 'Sep 2021'),
        L("The IQ bell curve meme is actually very funny because conventional intelligence does not translate well into trading performance at all.", 'Apr 2023'),
        L("I made a vow to only ever trade when I was willing to write a substack about it.", 'Oct 2024'),
        L("They really finally taught everyone about cycles and then supercycled it.", 'Aug 2025'),
        L("lmao the psychology behind identified groupthink in markets is so fkn interesting, man.", 'Aug 2025'),
        L("Usually black swans occur once, then never occur again.", 'Aug 2025'),
        L("Truth is, markets aren't conquerable at all.", 'Aug 2025')] },
    { id: 'coldcoffee', name: 'The Cold Coffee', role: 'Investor with a checklist', look: 'Chog in a well-cut jacket, a laminated checklist, a paper cup of coffee long gone cold.', place: 'gallery', hours: [[14, 18, 'gallery']],
      lines: [
        L("Close your eyes and pick a shitcoin.", 'Dec 2020'),
        L("10 IQ > 110 IQ.", 'Aug 2020'),
        L("Looks like we're taking the liquidity.", 'Nov 2020'),
        L("Straight line up.", 'Nov 2020'),
        L("Every cycle, people need a good excuse to miss the bottom.", 'Jan 2023'),
        L("Vaporware is still trading at multi-billion dollar valuations and people are still calling bottoms.", 'Nov 2022'),
        L("Low float tokenomics don't work. The market is not capable of accurately pricing the effect of future emissions on token price.", 'May 2022'),
        L("Launching with a tiny token float has a high potential for short term euphoria at the cost of long term pain.", '2022')] },
    { id: 'pyramid', name: 'The Pyramid Podcaster', role: 'Investor and podcaster', look: 'Bright energetic chog with a mic on a boom, a toy pyramid desk ornament, a pile of charts.', place: 'plaza', hours: [[17, 21, 'plaza']],
      lines: [
        L("Long Bitcoin, short the bankers!", '2019'),
        L("I have said for years that \"Long Bitcoin, Short the Bankers\" will be the trade of our generation.", 'Mar 2023'),
        L("Bitcoin is the best inflation hedge, in my opinion.", 'Mar 2023'),
        L("When market turmoil happens, I make a list of things I learn so I can remember them later. Lesson one: act with urgency.", 'Mar 2023'),
        L("What is the most impactful thing you have ever done for someone else, and why did you do it?", 'May 2023'),
        L("It reportedly took 100,000 men more than 20 years to construct the Great Pyramid at Giza.", 'Oct 2022'),
        L("The best investors know that \"market selection\" is more important than \"asset selection.\"", 'Sep 2022'),
        L("The adult industry pioneers new technology.", 'Mar 2023')] },
    { id: 'cricketwhale', name: 'Cricket Whale', role: 'Big wallet, small bugs', look: 'Very large chog in a baggy hoodie holding a jar of crickets.', place: 'street', hours: [[7, 11, 'street']],
      lines: [
        L("Chitin is potentially an inflammatory agent. Do not eat the bugs whose carapace are made of chitin.", 'Sep 2022'),
        L("Who gives a shit about token price when our runway does not depend on it.", 'Sep 2022'),
        L("Okay, finally looked into what Aptos and Sui is. They're another L1 attempt? WTF are you guys doing?", 'Aug 2022')] },
    { id: 'bearsuit', name: 'Bear Suit Guest', role: 'Conference guest', look: 'Chog in a bear costume with the head tucked under one arm, in front of a painted backdrop of a cat on a unicorn-llama under UFOs.', place: 'lobby', hours: [[13, 13.5, 'lobby'], [19, 19.5, 'lobby']], rare: true,
      lines: [
        L("If all that we accomplish is lambo memes and immature puns about \"sharting\", then I WILL leave.", 'Dec 2017'),
        L("I have been told that I need to \"do less philosophizing and do more ethereum bullposting\".", 'Aug 2024'),
        L("How many times do I have to use this same meme over and over again???", 'Oct 2018'),
        L("Why do all the stupid memes keep reusing this picture? IMO it's not even a particularly good one.", 'Aug 2016'),
        L("What else could memecoins be?", 'Mar 2024'),
        L("ok can you guys stop trading.", '2016')] }
  ];

  // ---------------------------------------------------------------- 3. the Nad
  const nad = {
    id: 'nad', name: 'The Nad', role: 'Monad community insider',
    look: 'Purple chog in a purple hoodie with an M patch, a Molandak plush clipped to the bag, glowing violet eyes.',
    place: 'monad_floor', hours: [[10, 22, 'monad_floor'], [22, 24, 'plaza']],
    lines: nadLines
  };

  // ---------------------------------------------------------------- 4. plaques, posters, signs, redrawn images
  const plaques = [
    // lobby (framed, brass, calm)
    P('lobby_rabbits', 'lobby', 'Brass plaque', "He who chases two rabbits, catches neither."),
    P('lobby_satoshi1', 'lobby', 'Framed quote', "If you don't believe me or don't get it, I don't have time to try to convince you, sorry. (Jul 2010)"),
    P('lobby_satoshi2', 'lobby', 'Framed quote', "Lost coins only make everyone else's coins worth slightly more. (Jun 2010)"),
    P('lobby_times', 'lobby', 'Framed front page', "The Times 03/Jan/2009 - Chancellor on brink of second bailout for banks", 'A yellowed broadsheet front page in a gold frame, headline in tall serif, our style, original layout.'),
    P('lobby_keys', 'lobby', 'Brass plaque', "Not your keys, not your coins."),
    P('lobby_ngu', 'lobby', 'Brass plaque', "Number go up."),
    P('lobby_nothing', 'lobby', 'Brass plaque', "Probably nothing."),
    P('lobby_wagmi', 'lobby', 'Brass plaque', "We're all gonna make it. (Terms and conditions apply.)"),
    P('lobby_hours', 'lobby', 'Reception sign', "Reception closes at 17:00. The market never does."),
    P('lobby_liability', 'lobby', 'Notice', "Management is not responsible for lost keys, lost coins or lost interest."),
    P('lobby_emergency', 'lobby', 'Wall notice', "In case of emergency: gm."),
    P('lobby_wifi', 'lobby', 'Wi-Fi card', "Network: gm_guest   Password: hodl2013"),
    P('lobby_bears', 'lobby', 'Sign', "Please do not feed the bears."),
    P('lobby_nfa', 'lobby', 'Small print', "This hotel is not financial advice."),
    P('lobby_clock', 'lobby', 'Wall clock', "Stuck at 17:59. Lightning is coming in 18 months.", 'A round brass clock frozen at 17:59 with a small paper sign taped under it.'),
    P('lobby_hodling', 'lobby', 'Framed printout', "I AM HODLING", 'A framed forum-post printout, the title typo kept, dated Dec 18, 2013, our style.'),
    P('lobby_pizza_print', 'lobby', 'Hotel print', "Two pizzas. 10,000 BTC.", 'Two pizzas on a table and a paper receipt reading 10,000 BTC.'),
    P('lobby_bearsuit', 'lobby', 'Standee', "Photo spot: take a picture with the bear.", 'A life-size cardboard standee of a bear costume with the head under its arm.'),
    P('lobby_mountains', 'lobby', 'Window view', "Dude, check out those mountains.", 'A window view where the mountain range is also a price chart.'),
    // elevator
    P('elev_floors', 'elevator', 'Floor buttons', "0 Lobby / 1 Bull Run / 2 Bear Market / 3 Crab Market / 4 Exit Liquidity"),
    P('elev_up', 'elevator', 'Display', "Going up. Only up."),
    P('elev_down', 'elevator', 'Display', "Going down. Wait, why?"),
    P('elev_close', 'elevator', 'Voice', "Doors closing. Your position is not."),
    P('elev_arrive', 'elevator', 'Voice', "You have arrived. gm."),
    P('elev_muzak', 'elevator', 'Muzak plaque', "Now playing: Number Go Up (instrumental)."),
    // street and plaza
    P('st_buy', 'plaza', 'Street statue', "BUY BITCOIN", 'A bronze-look statue of a figure behind a podium holding a sign that reads BUY BITCOIN, original pose.'),
    P('st_dyor', 'street', 'Chalk on the pavement', "DYOR"),
    P('st_wagmi', 'street', 'Graffiti', "WAGMI  (and underneath, a different hand: NGMI)"),
    P('st_rugs', 'street', 'Graffiti', "RUG PULLS BUILD CHARACTER"),
    P('st_dip', 'street', 'Sign by a puddle', "Buy the dip."),
    P('st_lambo', 'plaza', 'Plinth', "Not a Lambo.", 'A toy sports car on a marble plinth, original car shape.'),
    P('st_grass', 'park', 'Roped-off lawn', "Touch grass. (Please.)"),
    P('st_parking', 'street', 'Parking sign', "Lambo parking only. Currently: bicycles."),
    P('st_rug', 'street', 'Wet-floor sign', "CAUTION: RUG."),
    P('st_bench', 'plaza', 'Bench plaque', "Reserved for people who sold the bottom."),
    P('st_exit', 'plaza', 'Arrow sign', "Exit liquidity -> this way."),
    P('st_bus', 'street', 'Bus stop ad', "Wen moon? Wen you stop asking."),
    P('st_billboard', 'street', 'Billboard', "Sold the top? Congratulations. Nobody cares."),
    P('st_trust', 'street', 'Poster', "Trust me, bro.", 'Two hands in a firm handshake, one holding a fistful of cash behind its back.'),
    P('st_names', 'street', 'Street name signs', "Satoshi Street / Genesis Avenue / Hodl Lane / Nakamoto Plaza / Gwei Road / Rekt Alley"),
    P('st_hydrant', 'street', 'Fire hydrant', "liquidity"),
    P('st_meter', 'street', 'Parking meter', "Pay 0.0003 gas for 1 hour."),
    P('st_lost', 'street', 'Lamp-post flyer', "Lost: 1 hardware wallet. Reward: eternal gratitude. Seed phrase on the back."),
    P('st_virus', 'street', 'Old poster', "THE VIRUS IS SPREADING", 'An orange coin on a faded poster; pure period piece.'),
    P('st_bankers', 'street', 'Old poster', "Long Bitcoin, short the bankers"),
    P('st_arcade_banner', 'arcade', 'Banner on the Arcade', "Everyone is getting hilariously rich and you are not."),
    P('st_news', 'street', 'Newspaper stand', "Headline of the day (rotates with the clock)", 'A street newspaper stand; headline plate changes.'),
    P('st_pipe', 'street', 'Billboard', "Bitcoin fixes this.", 'A leaking pipe with a bandage, original drawing.'),
    P('st_mural', 'plaza', 'Chart mural', "Every candle is a different Chog.", 'A long mural of a price chart where every candle is a different chog.'),
    P('st_soover', 'street', 'Graffiti', "it's so over  /  we're so back"),
    P('st_buyhigh', 'street', 'Stencil', "Buy high, sell low."),
    P('st_lamp', 'street', 'Tiny lamp sign', "Technically, you kinda lost your money."),
    P('st_whitepaper', 'street', 'Bookshop window', "The Whitepaper (9 pages). Nobody read it."),
    // redrawn iconic images (our style, original drawings)
    P('img_laser', 'gallery', 'Laser eyes booth', "", 'A chog portrait with two red beams from the eyes, a cheek tag reading LaserRayUntil100K; also a cosmetic.'),
    P('img_wojak', 'arcade', 'Trading wall', "", 'A smiling green chog next to a pink bleeding-eyed chog, original sad-faces, not a copy.'),
    P('img_frog', 'park', 'Frog on a bench', "", 'An original smug green frog sitting on a bench; not the famous frog.'),
    P('img_dog', 'cafe', 'Poster', "much wow", 'An original shiba-like dog with a floppy head and rainbow comic text; hint only.'),
    P('img_chad', 'street', 'Gym billboard', "", 'An original silhouette with a jaw like a cliff.'),
    P('img_pain', 'park', 'Bench scene', "", 'A generic man smiling through visible pain; no real stock photo.'),
    P('img_twins', 'plaza', 'Calling corner', "", 'Two identical grey-suited figures each holding a phone that hides the face.'),
    P('img_fire', 'street', 'Guard post poster', "This is fine.", 'A dog in a burning room with a coffee, original drawing.'),
    P('img_stonks', 'arcade', 'Arcade poster', "STONKS", 'A man in a suit with a rising arrow behind him; original face.'),
    P('img_barting', 'street', "Larry's whiteboard", "", 'A chart where the candles form a Bart-like spiky head.'),
    P('img_orange_coin', 'street', 'Steakhouse plinth', "", 'A large orange coin on a plinth.'),
    P('img_catuni', 'gallery', 'Painting', "", 'A cat riding a unicorn-llama under UFOs; no person drawn.'),
    P('img_stage', 'club', 'Small stage', "MC ETH", 'A small stage with a keyboard and a rapper-shaped silhouette; no likeness.'),
    P('img_wassies', 'street', 'Wall photo', "", 'A group picture of green wassie chogs.'),
    P('img_crab', 'plaza', 'Fountain statue', "", 'A crab statue flanked by two identical suited twins.'),
    P('img_printer', 'club', 'Money printer', "brrr", 'A bulky printer feeding sheets of green notes.'),
    P('img_looksrare', 'gallery', 'Wall of frames', "Looks rare.", 'A grid of plain identical square frames, each with a small RARE label.'),
    P('img_bullbear', 'plaza', 'Statues', "", 'A bull and a bear statue facing each other, original sculpture.'),
    P('img_banana', 'club', 'Wall painting', "", 'Bananas arranged on a rising chart.'),
    P('img_monad_mural', 'monad_floor', 'Purple mural', "", 'A purple mural with the monanimals (Chog, Molandak) in a happy line.'),
    P('img_pizza_banner', 'street', 'Banner (May 22 only)', "Bitcoin Pizza Day", 'Pizza slice and a coin; shows only on May 22.'),
    P('img_rekt_wall', 'park', 'Rekt wall', "", 'A wall of crossed-out logos replaced by tiny chog hats.'),
    P('img_graveyard', 'park', 'Garden of dead coins', "Fictional tickers only.", 'A small graveyard with headstones of made-up tickers.'),
    P('rekt_fund', 'park', 'Memorial plaque', "We are in the process of communicating with relevant parties. (a fund statement, Jun 2022)"),
    P('rekt_gox', 'park', 'Gox plaque', "Goxxed, 2014"),
    // Monad in-jokes
    P('monad_gm', 'monad_floor', 'Neon sign', "gmonad. Say it back."),
    P('monad_tps', 'monad_floor', 'Occupancy sign', "Capacity: 10,000 TPS. Occupancy: vibes."),
    P('monad_elevator', 'lobby', 'Elevator notice', "Blocks are fast. Elevators are not. Floor 1 is purple."),
    P('monad_lanes', 'monad_floor', 'Corridor sign', "Parallel execution: please use all lanes of the corridor."),
    P('monad_molandak', 'monad_floor', 'Warning sign', "Please do not feed the Molandak."),
    P('monad_chog', 'monad_floor', 'Statue plaque', "Chog is the lore. This statue is the lore.", 'A tall purple statue of a chog on a plinth.')
  ];

  // ---------------------------------------------------------------- 5. interactive props
  const props = [
    { id: 'rug', place: 'lobby', label: 'The Rug', effect: 'On click, everyone standing on the carpet slides and falls (3 s). Rug resets after 60 s. Tag: "do not pull". No damage.', lines: ["The rug has been pulled.", "Do not pull. (Pulled.)", "That was a rug pull. A small, friendly one."] },
    { id: 'gmwall', place: 'lobby', label: 'gm wall', effect: 'Click spawns a ring of "gm" text bubbles that float up from every avatar in the room; 5 s cooldown.', lines: ["gm, everyone.", "A wall of gm appeared."] },
    { id: 'laserbooth', place: 'gallery', label: 'Laser-eyes photo booth', effect: 'Click gives your Chog red laser eyes for 10 s, then a full-size screenshot with a small watermark is offered for download.', lines: ["Say cheese. Say laser.", "Eyes: red. Wallet: optional.", "Smile. You are about to be posted."] },
    { id: 'printer', place: 'club', label: 'Money printer', effect: 'Click plays a "brrr" sound; barista menu prices rise by 10% for one real-clock hour (visual only).', lines: ["brrr.", "Prices may go up. Prices have always gone up.", "Printer go brrr."] },
    { id: 'draw', place: 'street', label: 'Draw a line', effect: 'Opens a whiteboard where the player draws lines on a chart; after release the chart plays the opposite move.', lines: ["Nice line. The chart disagrees.", "Support! ...Was that support?", "The chart did the opposite. Consistency."] },
    { id: 'grass', place: 'park', label: 'Touch grass', effect: 'Walking in the roped patch counts one step per second; at 10 patches visited grant the cosmetic title "Touched grass".', lines: ["It is grass. It is real.", "Touched. Feels fine.", "You went outside. Remarkable."] },
    { id: 'gasbench', place: 'street', label: 'Gas station bench', effect: 'Sitting prints a receipt toast "0.0001 gas" but costs nothing.', lines: ["Receipt: 0.0001 gas.", "Sat down. Gas paid. By nobody."] },
    { id: 'liq', place: 'arcade', label: 'Liquidation button', effect: 'Big red button; press triggers a harmless siren (2 s) and every degen NPC in view says "NOOO". 30 s cooldown.', lines: ["NOOO.", "That button is not a trade. But it felt like one.", "Position closed. Feelings open."] },
    { id: 'vending', place: 'cafe', label: 'Seed-phrase vending machine', effect: 'Insert a word: gives a random common word each press; the sixth press gives "never share this".', lines: ["Insert a word.", "Here is a word. Keep it secret.", "Word 6: never share this."] },
    { id: 'elevbuttons', place: 'elevator', label: 'Elevator buttons', effect: 'If the player presses all five floor buttons within 20 s, the voice says "ser, please".', lines: ["ser, please.", "Pressing everything is not a strategy.", "The elevator knows."] }
  ];

  // ---------------------------------------------------------------- 6. real-clock events
  const events = [
    { id: 'gm_hour', when: { hourFrom: 6, hourTo: 10 }, banner: 'gm hour: every resident starts with gm.', effect: 'lobby neon shows "gm"; each NPC click line is prefixed with "gm. "' },
    { id: 'satoshi_shadow', when: { hourFrom: 0, hourTo: 0.02, chance: 0.3 }, banner: 'A shadow passes through the plaza.', effect: 'spawn cast.satoshishadow for 60 s at the plaza' },
    { id: 'four_twenty', when: { hourFrom: 16.33, hourTo: 16.5 }, banner: '4:20 in the plaza.', effect: 'plaza clock shows 4:20 in pale green; NPCs near the fountain check their watches' },
    { id: 'friday_liq', when: { weekday: 5, hourFrom: 21, hourTo: 24 }, banner: 'Friday night liquidation.', effect: 'arcade siren every 5 min; degen NPCs move to the club bar' },
    { id: 'sunday_scaries', when: { weekday: 0, hourFrom: 18, hourTo: 23 }, banner: 'Sunday scaries.', effect: 'Doom Bear bubble is larger (scale 1.3) and lines loop faster' },
    { id: 'uptober', when: { month: 10 }, banner: 'Uptober. Up only (October only).', effect: 'orange and green banners across town; neon "UP ONLY" in the lobby' },
    { id: 'oct10', when: { month: 10, day: 10 }, banner: 'October 10: we remember. Nineteen billion got liquidated.', effect: 'Liquidated Trader stands in the plaza all day; NPC lines mention the day' },
    { id: 'whitepaper', when: { month: 10, day: 31 }, banner: 'Whitepaper anniversary.', effect: 'bookshop window shows the nine-page whitepaper lit up' },
    { id: 'monad_anniv', when: { month: 11, day: 24 }, banner: 'Monad mainnet anniversary. gmonad.', effect: 'purple confetti on the Monad floor; the Nad stands in the lobby' },
    { id: 'genesis_day', when: { month: 1, day: 3 }, banner: 'Genesis block day.', effect: 'the Maxi kneels at the plinth; the orange coin glows' },
    { id: 'pizza_day', when: { month: 5, day: 22 }, banner: 'Bitcoin Pizza Day: the pizza stand is free today.', effect: 'pizza stand sign swaps to FREE; Pizza Man stays all day; pizza banner appears' },
    { id: 'hodl_day', when: { month: 12, day: 18 }, banner: 'I AM HODLING anniversary: the Old Hodler buys everyone a drink.', effect: 'Old Hodler moves to the bar; every player gets a "round on the house" toast' },
    { id: 'halving', when: { year: 2028, month: 4 }, banner: 'Supply halved. Prices: pending.', effect: 'a bell tolls once at the plaza; sign in the lobby; date is approximate, swap for a real block-height trigger later' },
    { id: 'monthly_close', when: { lastDayOfMonth: true, hourFrom: 18, hourTo: 24 }, banner: 'Monthly close.', effect: 'NPCs stop and look at phones for 30 s once an hour' },
    { id: 'whale_alert', when: { chance: 0.005, hourFrom: 12, hourTo: 20 }, banner: 'Whale alert!', effect: 'a very large chog walks through the plaza (scale 2.5); every NPC freezes and stares for 20 s' }
  ];

  // ---------------------------------------------------------------- 7. interface text
  const ui = {
    tips: [
      "gm is a state of mind.", "Not your keys, not your coins. Also: not your couch.", "DYOR (Decorate Your Own Room).", "Tip: the elevator knows.",
      "Touch grass. We have some.", "Probably nothing.", "Number go up (loading).", "The market is open. The town is open.",
      "Wen? Now.", "ser, please wait.", "Your Chog is being minted (not really).", "Compiling hopium...",
      "Gas: 0. We pay it.", "Buying the dip... please wait.", "Reticulating liquidity pools..."
    ],
    buttons: {
      connect: "Connect wallet", save: "Sign and save (your keys, your room)", delete: "Rug it",
      deleteConfirm: "Are you sure? This one is a real rug pull.", report: "Report (receipts attached)",
      mute: "Touch grass for this one", settings: "Settings (financial advice not included)"
    },
    errors: {
      gas: "Transaction failed: out of gas.", walletNotFound: "Wallet not found. Did you lose it?", serverDown: "Server is down. Please remain calm. Stay bullish.",
      notFound: "404: Rug pulled.", connectionLost: "Connection lost. Reconnecting. Hodl.", rateLimited: "You are rate limited. Slow down, degen."
    },
    toasts: {
      gm: "A wild gm appeared.", friendOnline: "A fren came online.", venueOpen: "Your venue is now open (the roadmap continues).",
      banned: "Banned: not a ban, a touch-grass period.", saved: "Saved. (Not financial advice.)"
    },
    tour: [
      { title: "Walk", text: "Use WASD or click to walk. Nobody here has ever been in a hurry. Except the Jeet." },
      { title: "Find the front desk", text: "Your room is in the Chog Hotel. Lev, at the desk, checks you in. No rent. Terms apply." },
      { title: "Press B to decorate", text: "B opens the build menu. DYOR: Decorate Your Own Room." },
      { title: "Place something", text: "Pick an item, put it down. Rugs are allowed, rug pulls are not." },
      { title: "Save", text: "Sign and save. Your keys, your room. Not financial advice." }
    ]
  };

  // ---------------------------------------------------------------- 8. places and seed venues
  const places = {
    taglines: {
      moka: "Gas included.", arcade: "Leverage up to 100x. Ask for the exit.", gallery: "Looks rare.",
      nova: "Open until the funding rate resets.", hotel: "Check in. Never check out."
    },
    seedVenues: [
      { name: "The Dip", cat: "bar", desc: "Every drink is half-price when the clock hour is odd." },
      { name: "Gas Cafe", cat: "cafe", desc: "Coffee priced in gwei." },
      { name: "Exit Liquidity Lounge", cat: "club", desc: "The club by the back door." },
      { name: "Cold Storage", cat: "shop", desc: "A freezer shop whose items never leave." },
      { name: "The Mempool", cat: "lounge", desc: "A waiting room where everyone waits their turn, slowly." },
      { name: "Rug & Carpet Co.", cat: "shop", desc: "A flooring shop. The sign: No rug pulls (terms apply)." },
      { name: "Hopium Den", cat: "lounge", desc: "A quiet smoking room with big windows." },
      { name: "Copium Cafe", cat: "cafe", desc: "Tea and cake for the unlucky." },
      { name: "Liquidity Pool", cat: "pool", desc: "An actual pool, with lanes." },
      { name: "Block Explorer", cat: "shop", desc: "A map and travel shop." },
      { name: "Satoshi's Pizza", cat: "restaurant", desc: "The pizza stand, a venue for holders." },
      { name: "Shut Exchange Storage", cat: "shop", desc: "A shop shut for years, with a temporarily closed sign." },
      { name: "Bear Market Bar", cat: "bar", desc: "A bar with a bear in the corner." },
      { name: "Bull Run Steakhouse", cat: "restaurant", desc: "Where the maxis eat." },
      { name: "Airdrop Terminal", cat: "shop", desc: "A check-in desk that always says come back later." },
      { name: "The Bridge", cat: "lounge", desc: "A toll bridge." },
      { name: "Validator Tower", cat: "lounge", desc: "A lighthouse with an observation deck." },
      { name: "Whitepaper Library", cat: "library", desc: "Quiet. Every book is nine pages." },
      { name: "Alpha Group Chat", cat: "lounge", desc: "A private lounge, invite only, nothing happens inside." },
      { name: "Wen Lambo Dealership", cat: "shop", desc: "Sells toy cars; the test drive is a loop." },
      { name: "NFA Legal Office", cat: "office", desc: "Disclaimers for everyone." },
      { name: "DYOR University", cat: "school", desc: "A lecture hall; the only course is read the docs." },
      { name: "gm Cafe", cat: "cafe", desc: "Open 24 hours; the greeting is the password." },
      { name: "Rekt Memorial Garden", cat: "garden", desc: "A gentle graveyard of dead tickers. Founders only on the plaques, never victims." },
      { name: "Farming Supply", cat: "shop", desc: "A farm shop selling yield by the sack." },
      { name: "Pump Pub", cat: "bar", desc: "Memecoin kids, no ID." },
      { name: "Hash Rate Spa", cat: "spa", desc: "Hot and loud." },
      { name: "Monad Floor", cat: "lounge", desc: "Purple, the monanimals, a statue of a Chog." }
    ]
  };

  // ---------------------------------------------------------------- 9. Lev, the receptionist of the Chog Hotel (lev.js plays these)
  // A former trader who got liquidated, took the hotel's night shift and never left. "Lev" is short for leverage: the joke is never explained.
  // His voice: ultra-formal hotel speech read from a form, often closed with *stamp*; rooms are "positions", an upgrade is "adding leverage", the basement is "cold storage".
  // For an event he first states exactly what happened ({ form }), then adds his own aside ({ aside }, starting "So..." or "Much like..."). Underneath he quietly cares and never says so.
  // Tokens: {no} the door number, {floor} the floor, {reason} the server's reason. A plain string is one line; { form, aside } is two beats.
  const lev = {
    name: "Lev", role: "Night shift",
    hello: [
      "Chog Hotel, front desk. State your business. Briefly. *stamp*",
      "Good evening. It is always evening at this desk. How may I assist? *stamp*",
      "Front desk. Night shift. Day shift. I stopped checking which. How may I assist?",
      "Reception. Please remain calm. I will be calm for both of us. *stamp*"
    ],
    helloBack: [
      "Welcome back. Your position is exactly where you left it. I checked. Do not tell anyone I checked. *stamp*",
      "You again. Good. I mean: your presence has been logged. *stamp*",
      "Room {no} is in good order. Nobody has touched it. I made sure. As a matter of procedure. *stamp*"
    ],
    first: {
      greet: "Welcome to Chog Town. New arrivals receive one (1) room. Non-transferable. Non-refundable. Much like my twenties. *stamp*",
      directory: "Before the paperwork: the directory of rooms. The hotel is very proud of it. I am told. Please look. Briefly. *stamp*",
      afterDirectory: "Thank you for your attention. Now, your room. One (1) moment. *stamp*"
    },
    list: "The directory of open positions. Look, do not touch. Regulations. *stamp*",
    barks: [
      "No? Fine. I'll just stand here. I'm very good at it. Eleven years of practice.",
      "The directory is non-binding. As is everything in this building. *stamp*",
      "Window shopping is permitted. It is, in fact, my entire portfolio.",
      "Noted. No room selected. No position taken. Capital preserved. A first. *stamp*",
      "Take your time. The desk is not going anywhere. Neither am I. Obviously.",
      "You looked at all of them and chose none. I respect the discipline. I never had it.",
      "If you need me, I will be here. If you do not need me, I will also be here. *stamp*",
      "A cautious one. Good. The hotel does not see many."
    ],
    checkin: {
      sign: "Please sign. Your wallet will ask. It is free. No transaction. I checked. Twice. *stamp*",
      declined: "No signature, no position. Those are the rules. I wrote none of them. *stamp*",
      already: { form: "Our records show you already hold room {no} on floor {floor}. One (1) room per arrival. No further rooms are available.", aside: "So... one is the limit. Ask my accountants. I have none left. *stamp*" },
      done: { form: "Check-in complete. You have been assigned room {no} on floor {floor}. One (1) key has been issued.", aside: "So... you now hold a position in this hotel. Please do not leverage it. *stamp*" },
      failed: { form: "Your check-in could not be completed: {reason}", aside: "So... the system said no. I know the feeling. Try again shortly. *stamp*" },
      offline: { form: "The central ledger is not answering at present.", aside: "Much like my old broker. Return in a moment. *stamp*" }
    },
    guest: [
      "Without a wallet I can only offer a temporary room. It is not saved. It has no door number. It is, strictly speaking, a coat check. *stamp*",
      "Connect a wallet, a free signature, no NFT required, and you receive a real one. Saved. With a door. I would do it. *stamp*",
      "Your temporary room is prepared. Please try not to get attached. *stamp*"
    ],
    key: {
      first: "Room {no}. Your key. Please do not lose it. I have lost many things. It does not get easier. *stamp*",
      leaving: "Enjoy your stay. Or do not. The invoice is zero (0) either way. *stamp*",
      moved: "Room {no}. A new key. The old one is now decorative. Much like my diploma. *stamp*"
    },
    upgrade: {
      ask: "Adding leverage. A bold request. Let me consult the books. *stamp*",
      grown: { form: "Your room has been expanded in place. Door {no} remains yours. Your furniture is undisturbed.", aside: "So... leverage added, nothing liquidated. A first for this building. *stamp*" },
      moved: { form: "Your room could not be expanded: the adjacent rooms are occupied. You have been assigned room {no} on floor {floor}. Your furniture has been moved.", aside: "So... your old position couldn't take the leverage. We closed it and opened a bigger one. Story of my life. *stamp*" },
      'tier-low': { form: "Your request cannot be processed: no Chog was found in the connected wallet. An upgrade requires at least one (1).", aside: "So... no collateral, no leverage. I would explain further, but it would hurt. *stamp*" },
      max: { form: "Your room is already the largest size your holdings qualify for. No further expansion can be issued.", aside: "So... you are at maximum leverage. I advise against asking for more. I speak from experience. *stamp*" },
      smaller: { form: "Your room is larger than your current holdings support. An upgrade cannot be issued until it has been moved to a smaller size.", aside: "So... the position is over-extended. We both know how that ends. *stamp*" },
      'no-room': { form: "No room is registered to you. Leverage requires a position.", aside: "So... check in first. Then we may discuss ambition. *stamp*" },
      chain: { form: "The ledger could not be read. Your holdings could not be verified at this time.", aside: "Much like my own positions, at the end. Try again shortly. *stamp*" },
      busy: "One request at a time, please. I have one pair of hands and no hope. *stamp*",
      failed: { form: "The upgrade could not be completed: {reason}", aside: "So... the system declined. Try again shortly. *stamp*" }
    },
    basement: {
      lobby: "Ah. You're back. We put your room in cold storage. It's fine. It's warmer than it sounds.",
      back: { form: "Your room has been returned from cold storage to room {no} on floor {floor}. Your furniture is intact.", aside: "So... welcome to the surface. It is brighter than it sounds. *stamp*" },
      above: { form: "Your room is already above ground. Nothing needs to be brought up.", aside: "So... you are already warm. Enjoy it. *stamp*" },
      'no-room': { form: "No room is registered to you, in cold storage or elsewhere.", aside: "So... a clean slate. Rare, in this business. *stamp*" },
      busy: "One request at a time, please. Cold storage does not like to be rushed. *stamp*",
      failed: { form: "Your room could not be moved: {reason}", aside: "So... it stays cold for now. Try again shortly. *stamp*" }
    },
    bye: [
      "Dismissed. I mean: have a pleasant day. *stamp*",
      "Mind the elevator. Eat something. That is not official advice. *stamp*",
      "Thank you for your custom. It has been noted. By nobody. *stamp*",
      "Get some rest. Not that I would know. *stamp*"
    ],
    menu: { list: "Room list", checkin: "Check in", upgrade: "Upgrade my room", up: "Bring my room back up", phone: "A key for my phone", bye: "Bye." },
    // the phone companion: on the PC Lev hands out a key card (a QR code, lev.js); on the phone (mobile.js) he answers a few fixed questions about your room.
    // Tokens: {no} door, {n} a number, {names} who is inside, {list} tonight's events. Arrays of three are [none, one, many].
    phone: {
      give: "A key card for your telephone. Scan it with the phone's camera. It works once and expires in ten (10) minutes. Much like my bonuses. *stamp*",
      noWallet: "A telephone key requires a signed-in wallet. Regulations. *stamp*",
      failed: { form: "A key could not be issued: {reason}", aside: "So... no key tonight. Try again shortly. *stamp*" },
      hello: [
        "Good evening, guest of {no}. The night shift reporting. *stamp*",
        "Room {no}. Your report, as requested. Nobody requested it. Here it is. *stamp*",
        "Front desk, telephone line. I prefer this. Nobody can see my face. *stamp*"
      ],
      inside: ["Nobody is inside. The room is resting. So am I, technically.", "One (1) guest inside at present. Behaving. Mostly.", "{n} guests inside at present. All logged. *stamp*"],
      today: ["No visitors today. Quiet days are underrated. I would know.", "One (1) visitor today. Quality over quantity. *stamp*", "{n} visitors today. The hotel is pleased. I am neutral. *stamp*"],
      tips: ["", "One (1) CHOG in tips today. It is the thought. *stamp*", "{n} CHOG in tips today. Logged, as always. *stamp*"],
      who: "Inside now: {names}. *stamp*",
      whoBlind: "I count {n}. Names and faces need the security camera. Regulations. I did not write them. *stamp*",
      locked: "Door {no} is locked. Only you may enter. Those inside may stay. *stamp*",
      unlocked: "Door {no} is open to the public again. Brace yourself. *stamp*",
      lockFailed: { form: "The door could not be changed: {reason}", aside: "So... the lock is being difficult. Like most things here. *stamp*" },
      tonight: ["Nothing is announced tonight. A quiet night. My favourite kind. *stamp*", "Tonight: {list}. Attendance is optional. Like everything. *stamp*", "Tonight: {list}. Attendance is optional. Like everything. *stamp*"],
      noRoom: "No room is registered to this key. Check in at the front desk, on your computer. *stamp*",
      basement: "Your room is in cold storage, {no}. Visit me on your computer and I will bring it back up. *stamp*",
      offline: "The line is down. The hotel is not answering. I will keep trying. It is what I do. *stamp*",
      unpaired: "This telephone holds no key. Ask me for one at the front desk, on your computer. *stamp*",
      // notifications (server/push.js writes the pushed lines themselves)
      pushOn: "Very well. I will ring this telephone when someone walks into your room, at most every half hour, and when a tip arrives. *stamp*",
      pushOff: "No more calls. The line stays open if you need me. You will not. *stamp*",
      pushDenied: "Your telephone refused my calls. It can be changed in its settings, for this site. I am not offended. I am a professional. *stamp*",
      pushIos: "On an iPhone I can only ring the hotel's own icon. Tap Share, then Add to Home Screen, open Chog Hotel from there, and ask me again. *stamp*",
      pushNone: "This telephone does not take calls from websites. Regulations. Its own. *stamp*",
      pushFailed: { form: "The calls could not be set up: {reason}", aside: "So... the line is busy. Try again shortly. *stamp*" },
      remindSet: "Noted. I will ring at {time}. Once. I do not do twice. *stamp*",
      remindOff: "Your {time} call is cancelled. As if it never happened. Much like my bonus. *stamp*",
      chips: { who: "Who's inside?", today: "How was today?", tonight: "What's on tonight?", lock: "Lock my door", unlock: "Unlock my door", pushOn: "Ring my phone", pushOff: "Stop ringing", remind: "Ring me at 21:00", remindOff: "Cancel my call" }
    }
  };

  // ---------------------------------------------------------------- extra small tables used by world content
  const doorSigns = ["Back in 12 blocks.", "Out for liquidity.", "Gone to touch grass.", "Opening soon (roadmap Q-infinity).", "Closed: dev is building.", "Sold out. Floor is 0."];
  const newsHeadlines = ["Experts say: it's over.", "Experts say: we're back.", "Local man holds, stays holding.", "Dev says \"we are building\".", "Whale moves coins, nobody knows why."];
  const homeWalls = ["gm", "my home, my keys", "home sweet home (nfa)", "up only (in here)", "no leverage past this point", "wagmi", "probably nothing", "touch grass", "ser, this is a home", "I AM HODLING", "dyor (I did, it's lovely)", "few understand this room"];
  const residents = {
    mika: ["What can I get you?", "Oat milk? That's 3 gwei more.", "Gas fee included.", "Filter coffee. Not a filter on your losses.", "Refills are free. Like airdrops. No."],
    juno: ["This way to number go up.", "Tip one: gm. Tip two: do not click that. Tip three: you will click that.", "Everything here is a reference. Have fun spotting them, ser."],
    rex: ["No leverage past this point.", "Dress code: hoodie, fear in the eyes.", "I've seen things. Mostly charts."]
  };

  return {
    cast, cameos,
    cameoNote: 'Real public posts, shown as written (some shortened). Old posts, not advice.',
    nad, plaques, props, events, ui, places, doorSigns, newsHeadlines, homeWalls, residents, lev,
    // returns a random item of arr never equal to the previous one; holder is any object ({}) that remembers the last index
    pick(arr, holder) {
      if (!arr || !arr.length) return undefined;
      if (arr.length === 1) { if (holder) holder.i = 0; return arr[0]; }
      let i;
      do { i = Math.floor(Math.random() * arr.length); } while (holder && i === holder.i);
      if (holder) holder.i = i;
      return arr[i];
    }
  };
})();
