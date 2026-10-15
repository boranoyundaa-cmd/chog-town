# World architecture

Decided with the owner on 2026-10-08. The open items are at the end. Rooms, themes and the document model are in `docs/game/spaces.md`; license tiers and economy in `docs/game/design.md`.

## Structure

One outdoor **town** on a single shard. Every door leads to a **space** (a document, `docs/game/spaces.md`) with its own presence and chat. The town stays small and content grows inward, because a big world with a small population feels empty (`docs/game/core-loop-research.md`).

- **Size:** 64 x 64 m (built 2026-10-15; the earlier target was 40 x 40). At 3.4 m/s that is about 19 s across (auto-walks from the map run at 1.4x). The camera follows the player everywhere, so the town never reads as small. A second district only if this one is full.
- **Four kinds of space:**

| Space | Who | Access |
|---|---|---|
| **Home** | everyone, free, one per wallet, small budget | private; visits by invitation only |
| **Venue** | a license holder; tier sets frontage, budget, features | public, listed in the Hotel |
| **Exhibit** | a weekly contest entry: a frozen copy of a Home | public for that week, on the Exhibition floor |
| **Official place** | made by us | public |

**Principle: what is scarce is the stage, not creativity.** Anyone can decorate, host by invitation, play and enter contests. A permanent public address (a door, listing, entry rules, tickets, a guard) is what the Chog license unlocks. Without the NFT you can still play and build, but you cannot run a place.

## Town (built 2026-10-15, `js/world_city.js`)

| Place | Where | Holds |
|---|---|---|
| **Plaza** | centre, at (-6,-6) | fountain, benches, the residents' noon spot |
| **Hotel Street** | north | Gallery, Books, **Chog Hotel**, NOVA, Pizza |
| **Moka Lane** | west | Moka & Co, Bakery, Florist |
| **Arcade Road** | east | Arcade, Laundry, parking |
| **Lantern Park** | south-west | pond, gazebo, lawn |
| **Maple Row** | south-east | the Home house and its neighbours |

Ordinary signage, plaques and a few hidden finds fill the streets (`js/props.js`, `docs/game/culture.md`). The slab half size is 32 (`HALF`, the server's `CFG.half`). Camera: follows the player in the town and in every interior; maximum zoom is 24 m of visible width everywhere (owner), rooms open at 18 m; there is no whole-room view.

## Buildings

| Building | Job |
|---|---|
| **Chog Hotel** | The venue hub, described below |
| **Home** (a plain house) | Everyone enters through the same door and finds their own Home. Not an apartment block |
| **Arcade** | Record games on cabinets |
| **Moka & Co** | Social place, daily tasks from the barista |
| **Gallery** | The Chog Wall (all 1,969 Chogs, the ones with an owner glow), NFT showpieces |
| **NOVA Club** | Official events; opens in the evening by the real clock |

The shop (cosmetics, furniture) is a window in the HUD, not a building (`js/shop.js`).

### Home

Entry is one door for all; the server puts you in your own Home. **Visits are by invitation only:** the owner invites a player from the player card ("Invite home") or shares a revocable invite link. There is no Home directory and no public "visit by wallet". Built (2026-10-08): a Home opens only for its owner, for a player the owner invited from the player card (30 minutes), or for someone with the owner's share link (7 days, "Reset link" revokes it).

### Hotel

- **Lobby:** a reception NPC, a list with search and categories. Each result shows the venue's name, description, room number and floor, plus a "Go to room" button. The button puts you **in the hall in front of the door**, not inside, so the world feels larger.
- **Floors (owner, 2026-10-09, replaces the L-shaped corridor):** reached by elevator. A floor is a **square hall, 24 x 24 m, 6 m tall, open in the middle** (a rug, a sitting corner, benches, plants: people can gather), and the **rooms stand on the two back walls only**, because the camera draws only those two (north wall to the screen's upper right, west wall to the upper left; a door on a front wall would show its back). **Four slots of 10 m of wall**: slots 1 and 2 on the north wall, 3 and 4 on the west wall; the elevator takes the 3.5 m corner between them. The lobby is 16.5 x 12 m. A room's wall is its **facade**, edited like a room (below). Floors are generated from data, so adding floors costs nothing. Rooms are listed in publish order; categories exist only in the search. A venue not entered for 30 days leaves the list and keeps its number (floor x 100 + first slot, e.g. 304).
- **Venue lifecycle (owner, 2026-10-09):** a venue is a **separate room from the Home**, with its own structure. The holder **activates** it from the license (tier decides the template); until the owner presses **Open**, the room is **closed**: the door in the corridor shows a "Closed" plate and nobody but the owner can enter. The owner walks in, decorates (same editor as the Home, bigger budget), then presses **Open venue**; entry opens. The owner can close it again.
- **Facade (owner, 2026-10-09): free placement, not a fixed template.** The facade is the strip of hall wall around the door (10 or 20 m wide, 1.6 m deep), edited like a room: a grid of squares, any piece in any square (decoration, sign, window, door style, plants, neon). Reason: with many venues, fixed facades would all look alike. Limits that stay: the door itself is always there, a small piece budget by tier, the same piece whitelist and text cleaning as rooms, and nothing blocks the way along the wall. The strip is a document like a room (`facade`), signed on save.
- **Tier (owner, 2026-10-09; sizes enlarged and names set 2026-10-15):** what a tier holds on the wall, how big its room is and what it adds. Numbers are in `server/hotel.js` `TEMPLATES`; names are Ser / Fren / Whale / Legend, venues Room / Suite / Floor / Penthouse.

| Tier | Wall | Levels | Room (per level) | Pieces per level | Lights | Facade pieces | People inside | Perks |
|---|---|---|---|---|---|---|---|---|
| 1 Ser | one slot (10 m) | 1 | 22 x 16 m | 200 | 16 | 20 | 12 | |
| 2 Fren | a whole wall (2 slots, 20 m) | 1 | 27 x 20 m | 300 | 18 | 40 | 20 | stage and DJ booth |
| 3 Whale | a whole wall **and the same wall on the floor above** | 2 | 27 x 20 m | 280 | 18 | 60 | 32 | + VIP upper level with its own entry rule |
| 4 Legend | **the whole floor and the floor above** (penthouse) | 2 | 33 x 22 m | 340 | 22 | 80 | 50 | + VIP upper level |

  Game tables (Connect four, Long/Short) and the most legendary shop pieces are tier-locked (shown as "Requires Whale" in the shop). **Holdings fall:** the venue is frozen (closed, decor kept); regained within 7 days it reopens, otherwise the slot is freed; a lower tier offers a move to the smaller room, a higher tier an upgrade (`venuemove`). Old rooms are shifted into the new sizes on load.
  The free **Home is 20 x 15 m, 140 pieces, 14 lights**, walls 5 m (hotel venues and halls 6 m). A two-level venue is **two rooms joined by stairs**: a second signed document (`level 2`), a space of its own on the server (presence, chat and head count per level, the plate adds them), a stair door beside the exit (`UPSTAIRS` / `DOWNSTAIRS`, `E`), the foot of the stairs is where you arrive. The wall the venue holds on the floor above shows glowing windows and a plate "UPPER LEVEL" (nobody else can rent it); a whole-floor venue also shows "PENTHOUSE" windows on its second wall. The facade (door, wall panel, floor mat, any piece) is always on the first wall, 10 or 20 m wide. A free slot shows a plate "ROOM #n, free for a Chog holder". Floors fill first-fit; a room that needs two floors takes the first floor pair with the right slots free.
- **Guard (owner, 2026-10-09): full control.** The owner sets the entry rule: open to everyone, holders only, closed, or **guest list**; plus a ban list. The guard NPC stands at the door and enforces it (server checks on `enter`). **Guest lists use usernames, not wallet addresses**, so that needs a **username**: unique, claimed once with a wallet signature (free, no NFT needed), shown on the plate instead of "Chog #n" or "Guest-1234". A player with no wallet has no username and cannot be on a list.
- **Exhibition floor (built 2026-10-15, floor `E`):** its doors are the week's contest entries (read-only snapshots of Homes, four to a page), the last winner first, the week's theme on the wall. One signed vote per wallet, none for yourself; the winner gets a trophy and heads the next week. It gives free players a public stage without a permanent address (`server/exhibition.js`).
- **Seed:** we publish 12 venues of our own, labelled "Chog Hotel", four to a floor (101 to 104, 201 to 204, 301 to 304), so the first floors are never empty for a judge who tests alone. Each is a **ready-made room** (below) laid out for a tier 1 room: a café, a club, an arcade, a gallery, a reading nook, a workshop, an orbit lounge, a haunted hall, a terrace, a garage, a canteen and a sleepover suite (`tools/build_seed_venues.js`).
- **Empty rooms and ready-made rooms (owner, 2026-10-09):** every new room, Home or venue, **comes bare**: walls, floor and windows, nothing inside, not even a lamp (the fixed light floor keeps it readable). The editor's Room look tab offers **ready-made rooms**: the 12 layouts above, laid out for the floor in hand (from the Home up to a Penthouse level), as a starting point that replaces the room and stays fully editable. A layout is built from the walls outwards, never leaves a wall piece off its wall, hides art behind a tall piece, blocks a window, the door or the stairs, and is checked at every room size by `node tools/check_layouts.js` (`prototype/js/space_layouts.js`). The server also snaps every wall piece onto a back wall on save, so a room that changed size cannot leave a picture floating.
- **Built (2026-10-09):** the whole holder-venue loop. The Venues window (holders) activates a venue (the server checks the wallet's Chogs on chain), the door shows **Closed**, the owner enters it, decorates with the tier's budget and floor, saves (wallet signs), presses **Open venue**. Facade: the **Facade** button inside the venue opens a strip workbench (wall panel, floor mat, any piece; the door area stays clear), shown in the hall right away. The owner's **entry rule** (anyone, holders only, guest list) plus a **ban list**, a **guard** NPC beside the door when a rule is set, and **usernames** (My Chog card) for the lists. Code `js/venue.js`, `server/hotel.js`, `server/users.js`, `server/license.js`.
- **Built (2026-10-08, v0):** lobby with the receptionist and the directory (search, kinds, "Go to room" puts you at the door), elevator panel, doors in a colour per kind with a window glow and a plate (number, name, live "N inside"), venues open as normal rooms and leaving returns to the door.
- **Built (2026-10-09, rooms and floors rework):** the square hall with four 10 m slots (above), a default shopfront (tinted wall, big lit windows) for a venue that has no facade of its own yet, tier templates with levels and the stairs, the upper-level and penthouse wall segments, bigger rooms, empty new rooms, the 12 ready-made rooms, the camera that follows you, per-size window layout. Old venue records (8 small slots) are moved into the new numbering when the server starts (`server/test/migrate.js`).

## Light

**The real clock affects only the background**: the outdoor town and what is seen through windows (the owner may pin the view, for example always night). **Interiors are lit only by lights placed in them**, never by the clock and never by a room-wide setting.

- A small fixed light floor keeps an unlit room readable (and the editor usable); new spaces start empty. **Ceiling lamps do not exist** (removed from the game and the catalog, owner 2026-10-15); light comes from floor and table lamps, neon and wall lights.
- Lights become an item category (lamp, neon strip, spot, lantern) and the light budget grows with tier.
- The same rule holds for the lobby and the halls.
- **Built (2026-10-08):** the old room "ambience" is now a window view only (`SPACE.VIEWS`, `space.js` `applyView`): real clock by default, pinnable. The fixed light floor is `SPACE.INTERIOR` (hemi 0.3, key 0.2). There is no shadow under a room.

## NPCs

- **Kinds:** ambient residents (life) and service NPCs (guide, barista, guard, shopkeeper: a role card with one action). Hired staff come later.
- **Daily cycle without a simulation:** a resident's position is a pure function of its id and the real time (morning café, noon plaza, evening arcade or club, night they go inside). Every client computes the same, so the server holds no NPC state. This keeps the earlier "no deep offline simulation" decision.
- **Adaptive crowd:** aim for about 16 visible people; the NPC count is that target minus the players online. A lone judge sees up to 15 residents, a busy town shows few.
- **Never counted** in rankings, visitor counts or "N inside" (wash trading).
- **Built (`js/npc.js`, cast in `js/culture_data.js`):** 42 residents (service: Mika barista, Juno guide, Rex guard; archetypes and nickname-only cameos), schedules as `[hour, place]` lists, paths on the walk grid, residents go inside a door and disappear, the crowd target `NPC.target` is 16, muted plates with a role, a click card with one line, no minimap dots. Residents accept mini-game challenges (labelled). Not built: hired staff.
- **Dialogue** is written lines, shown **only on click** (no proximity bubbles). No LLM chat (cost, moderation, time).
- **Telling NPCs from players:** nameplate (players: name and tier pill; NPCs: muted plate with a "resident" icon and role), minimap (players are bright dots, NPCs have none), click card (player: invite, mute, report; NPC: role and action), movement on routes, a role costume (apron, cap, headset). NPCs never copy a real token's traits.
- **No offline holder Chogs** in town (decided): only fictional NPCs.

## Mini-games (built 2026-10-15, `js/games.js`, `server/games.js`)

Two groups. **Record games** run in the client and send only the result, so latency does not matter. **Two-player games** are turn-based or simultaneous choices; a few small messages over the existing WebSocket. Real-time action duels are out (latency, cost).

Rules for any game: solo-playable, 1 to 2 minutes, your own Chog is the character, no token reward, only daily-capped trophies and badges that become **shelf pieces in your Home**. A game lives where its fiction belongs.

| Group | Game | Where |
|---|---|---|
| Record | Stack the luggage (one button) | Arcade |
| Record | Rhythm with the club music | NOVA DJ booth |
| Record | Daily Chog: guess today's Chog from trait hints, same puzzle for all | Gallery |
| Two players | Rock-paper-scissors with Chog gestures above the heads | anywhere: "Challenge" on a player or resident |
| Two players | Dance copy | anywhere |
| Two players | Connect four, pieces are Chog faces | café tables, venue tables |
| Two players | Long/Short duel on a fake chart | arcade, venue tables |
| Contest | Weekly Home contest | Exhibition floor |

Daily and weekly boards per game, daily-capped trophies and badges (shelf piece in the Home, `js/trophies.js`). NPC residents accept challenges (their opponent is labelled), so a lone judge can test the two-player games.

## Open

Decided and built 2026-10-15 (`docs/project/build-plan.md`): the mini-games, the name (**Chog Hotel**), the Exhibition floor, tier perks.

- **Camera (owner, 2026-10-09):** a free or rotating camera is **dropped for now** (the whole game, the art and the editor assume one fixed isometric angle). If it ever comes back, the idea is 90-degree steps (Q and E) inside rooms and the Home only, never in the hotel or the town.
- Dress code for the guard (not planned).
- Invite link: assumed revocable and expiring.
- Window view: assumed to follow the clock by default with a pin option.
