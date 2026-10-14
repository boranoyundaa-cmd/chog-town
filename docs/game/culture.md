# Culture (the theme)

Decision 2026-10-09 (owner). **The town is made of crypto culture: references and jokes only Crypto Twitter (CT) understands.** The game is named Chog Hotel (renamed 2026-10-15); the culture is the flavour.

## Why

- ~1,000 holder wallets cannot keep a shared world alive (online at once is a small fraction). The volume must be **crypto-native people who do not own a Chog**.
- "Habbo on blockchain" gives them no reason to come: social worlds are a solved genre, and genre rivals (Among Us...) win on polish. A genre cannot be our novelty.
- Culture cannot be copied by shipping an app. It is cheap (content, not engineering), works alone (NPCs and art carry it, no concurrency needed), makes a trailer that a CT scroller saves, and CT already has wallets, so the wallet step stops being a wall. The Chogathon judges are the in-group.

## Audience

CT / crypto-native first. Holders are the supply side (venues, own look); non-holder crypto people are the volume (visitors, customers). Everyone else is welcome, never the design target.

## What is in the game (built 2026-10-15)

Data lives in `prototype/js/culture_data.js` (cast, cameos under nicknames, plaques, props, events, interface text); the code that shows it is `npc.js`, `culture.js`, `props.js` and the hotel and lobby in `hotel.js`.

- **42 residents:** the archetypes and the cameos (nickname-only, see Rules), each with their schedule and 6 to 8 click lines.
- **Town:** ordinary signage and plaques (they read as normal street furniture), 4 hidden finds, a gmonad notice board by day that becomes "gn" at night, a photo booth, a lawn, and the interactive props listed in `js/props.js`.
- **Real-clock events** (`culture.js`): same clock as the day cycle, daily chances rolled from the date so every player sees the same day. Test: `?event=<id>`.
- **Interface text:** loading tips, buttons, errors and toasts carry the voice.
- **Rule for density (owner): jokes are rare, hidden and contextual.** The town must read as an ordinary modern town first; a joke is found, not shouted.

The drafts the content came from stay as reference: cast and click lines `docs/game/culture-cast.md`, cameos with sources `docs/game/culture-cameos.md`, plaques, places, events, interface text and lexicon `docs/game/culture-world.md`.

## Rules

- **Insider voice.** The owner writes or approves the jokes. A generic "crypto bro" stereotype is worse than none.
- **Real people (cameos) say only what they really said** (owner decision 2026-10-09): their own public posts, with source and date kept in the data entry and shown in small print. No invented lines, no parody. A post that only works as a tweet may be reshaped to be spoken, using that post's own content (marked "adapted" in the draft). Every quote is re-copied from the original before shipping; a person who asks to be removed is removed. The dead, victims and private people are never characters. Invented archetypes (no real person) are written freely by us.
- **Dialogue plays only on click** (owner decision 2026-10-09; built). Nothing is said because a player walked close. A click shows one random line of that character, never the same twice in a row.
- **No reference hunt** (dropped by the owner, 2026-10-15); the 4 hidden finds are small surprises, not a quest.
- **Cameos appear under a nickname** with our own original design that only nods to their profile picture, no real name, handle or face; only their real posts, dated "X post" in small print (owner, 2026-10-15, to avoid legal risk).
- Players can add their own jokes through wall text, frames and kits (the room tools in `docs/game/spaces.md`).

## Open

The owner's corrections after seeing the content in the game. Quotes are re-copied from the original before any public launch.
