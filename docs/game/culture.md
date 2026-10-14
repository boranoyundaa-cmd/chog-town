# Culture (the theme)

Decision 2026-10-09 (owner). **The town is made of crypto culture: references and jokes only Crypto Twitter (CT) understands.** The name stays Chog Town; the culture is the flavour, not a rename.

## Why

- ~1,000 holder wallets cannot keep a shared world alive (online at once is a small fraction). The volume must be **crypto-native people who do not own a Chog**.
- "Habbo on blockchain" gives them no reason to come: social worlds are a solved genre, and genre rivals (Among Us...) win on polish. A genre cannot be our novelty.
- Culture cannot be copied by shipping an app. It is cheap (content, not engineering), works alone (NPCs and art carry it, no concurrency needed), makes a trailer that a CT scroller saves, and CT already has wallets, so the wallet step stops being a wall. The Chogathon judges are the in-group.

## Audience

CT / crypto-native first. Holders are the supply side (venues, own look); non-holder crypto people are the volume (visitors, customers). Everyone else is welcome, never the design target.

## Where it shows

NPC roster (CT archetypes and a few caricatures of public figures, with their schedule lines), lobby art and wall quotes, venue seed names, chat-bubble lines, item and decor kits (degen, bull/bear...), crypto-themed mini-games later. Monad and Chog in-jokes come first.

## Content drafts (owner review pending, nothing in the game yet)

- Cast and click lines (archetypes): `docs/game/culture-cast.md`
- Real CT characters, their own real posts: `docs/game/culture-cameos.md`
- Plaques, images, places, events, interface text, lexicon, the hunt: `docs/game/culture-world.md`

## Rules

- **Insider voice.** The owner writes or approves the jokes. A generic "crypto bro" stereotype is worse than none.
- **Real people (cameos) say only what they really said** (owner decision 2026-10-09): their own public posts, with source and date kept in the data entry and shown in small print. No invented lines, no parody. A post that only works as a tweet may be reshaped to be spoken, using that post's own content (marked "adapted" in the draft). Every quote is re-copied from the original before shipping; a person who asks to be removed is removed. The dead, victims and private people are never characters. Invented archetypes (no real person) are written freely by us.
- **Dialogue plays only on click** (owner decision 2026-10-09). Nothing is said because a player walked close. A click shows one random line of that character, never the same twice in a row. **Conflict to resolve:** `js/npc.js` currently has resident bubble lines that appear when a player is near; remove or turn them into click lines when the culture pass is built.
- **No reference hunt** (dropped by the owner, 2026-10-15).
- **Cameos appear under a nickname** with our own original design that only nods to their profile picture, no real name, handle or face; only their real posts, dated "X post" in small print (owner, 2026-10-15, to avoid legal risk).
- Players can add their own jokes through wall text, frames and kits (the room tools in `docs/game/spaces.md`).

## Open

Decided 2026-10-15 (`docs/project/build-plan.md`): all archetypes (best 6 to 8 lines each), all cameos in the nickname form, Claude writes the Monad voice, all world content goes in. Open: the owner's corrections after seeing it in the game.
