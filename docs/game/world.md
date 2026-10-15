# World architecture

Decided with the owner on 2026-10-08. The open items are at the end. Rooms, themes and the document model are in `docs/game/spaces.md`; license tiers and economy in `docs/game/design.md`.

## Structure

One outdoor **town** on a single shard. Every door leads to a **space** (a document, `docs/game/spaces.md`) with its own presence and chat. The town stays small and content grows inward, because a big world with a small population feels empty (`docs/game/core-loop-research.md`).

- **Size:** 64 x 64 m (built 2026-10-15; the earlier target was 40 x 40). At 3.4 m/s that is about 19 s across (auto-walks from the map run at 1.4x). The camera follows the player everywhere, so the town never reads as small. A second district only if this one is full.
- **Four kinds of space:**

| Space | Who | Access |
|---|---|---|
| **Room** | every wallet, free, one per wallet (14 x 10 m, 80 pieces); a walletless guest gets a temporary, unsaved one | public unless its owner locks the door; listed in the Hotel |
| **Venue** | a Room a license holder upgraded; tier sets frontage, budget, features | public, listed in the Hotel before the free rooms |
| **Exhibit** | a weekly contest entry: a frozen copy of a room | public for that week, on the Exhibition floor |
| **Official place** | made by us | public |

**Principle: what is scarce is the stage, not creativity.** Anyone can decorate a room, host in it, play and enter contests. A permanent public address (a door, listing, entry rules, tickets, a guard) is what the Chog license unlocks. Without the NFT you can still play and build, but you cannot run a place.

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
| **Chog Hotel** | The venue hub, described below. The outside is a tower with one storey per above-ground floor, grown from the middle (fixed lobby base and stepped crown with a lantern and spire); an Inspect stand by the door pulls the camera out to show the whole building. The advertising column by NOVA and the plaza street board show the live Hotel news (events, busiest room, Exhibition winner); a click walks you to the Hotel door |
| **Home** (a plain house) | Everyone enters through the same door and finds their own Home. Not an apartment block |
| **Arcade** | Record games on cabinets |
| **Moka & Co** | Social place, daily tasks from the barista |
| **Gallery** | The Chog Wall (all 1,969 Chogs, the ones with an owner glow), NFT showpieces |
| **NOVA Club** | Official events; opens in the evening by the real clock |

The shop (cosmetics, furniture) is a window in the HUD, not a building (`js/shop.js`).

### Your room (built 2026-10-15, `docs/project/build-plan.md` "Rooms for everyone")

Every wallet player has **one room in the Hotel**. The wallet **checks in** at the reception (a free signature, like a username claim; a few check-ins per address and day) and the hotel gives it a free **Room: 14 x 10 m, 80 pieces, 10 lights, one wall unit**, at the first free unit of the building, else a new floor on top. It is **public: nobody needs an invitation** (there are no invites or share links any more). The owner can **lock** it (a padlock beside the door in the hall, and a Lock button next to Leave inside): while locked only the owner gets in, people already inside stay. A walletless guest keeps a temporary room that is not saved and has no door number. Old Homes were moved into free rooms on the first start (20 x 15 shifted into 14 x 10 with `shiftDoc`; what no longer fits went to the inventory).

A free room **nobody entered for 30 days moves to the basement** (floors B1, B2... downward, 8 units each, first fit; door number `-(floor x 100 + unit)`, tag `B103`) and its unit is freed; a `reactivate` request moves it back up (first free unit, else a new top floor). The sweep runs at server start and daily. **Holder venues never go to the basement.**

**Upgrades** go through the receptionist (`upgrade`): a tier rise never grows a room by itself. It asks for the room of the license's current tier: if the units beside it (and the floor above, where needed) are free it grows **in place** (same door); otherwise it **moves** to the first free run of the right length on one wall (plus the floor above), else a new top floor; the decor moves with it. The answer says whether it moved, the new door, or why not (no Chog, already at the maximum, no room). A falling tier freezes the venue (below); after 7 days it **shrinks in place** to what the license allows (a free room when no Chog is left): it keeps its first unit and frees the rest, and whatever no longer fits goes to the **inventory**.

**Inventory** (`server/inventory.js`, per wallet, 400 pieces): pieces that no longer fit a room (smaller floor, lower budget, tier-locked, venue-only) and the pieces of an old Home that a holder could not take. The editor's **Stored** tab lists them and places them again; placing one and saving takes it out. A tier-locked piece stays: "Safe in your inventory. Needs a Chog to place." Shop pieces stay owned on chain either way.

**Nobody limits how many people are inside** any room (the tier "people inside" perk is gone).

### Hotel

- **Lobby:** a reception NPC, a directory with search and categories. The directory lists **above-ground rooms only: the game's venues and the holders' first, free rooms below them**; each result shows name, description, room number and floor, a "Locked" tag when it is, plus a "Go to room" button that puts you **in the hall in front of the door**, not inside.
- **Floors (owner, 2026-10-09; units 2026-10-15):** reached by elevator. A floor is a **square hall, 24 x 24 m, 6 m tall, open in the middle** (a rug, a sitting corner, benches, plants), and the **rooms stand on the two back walls only**, because the camera draws only those two. **Eight units of 5 m of wall**: units 1 to 4 on the north wall, 5 to 8 on the west wall; the elevator takes the 3.5 m corner. A room takes a **run of units on one wall**: free 1, Ser 2, Fren 4 (a whole wall), Whale 4 and the same wall on the floor above, Legend all 8 and the floor above. **Door number = floor x 100 + first unit** (e.g. 1204) and **never moves**, except when a room relocates itself. The lobby is 16.5 x 12 m. A room's wall is its **facade** (venues only), edited like a room (below). The **elevator panel has a room-number field**: type `1204` to go to that door, `B103` for the basement, a number below 100 for a floor; the list scrolls because floors reach the hundreds. Basement floors are halls too (grey tiles, "COLD STORAGE"), reached by the same elevator, listing their rooms when you step on them. Empty units show a small "vacant" plate. A free room's door is just the door and a plate (5 m of wall, no windows); a Ser door has a window each side.
- **Hotel numbers for the town (`hotelinfo`):** the server tells the town on connect, when you enter the town and when it changes (at most every 10 s) how many floors are above and below ground, how many rooms, the busiest room right now, tonight's events and the Exhibition winner; the town's billboards, signs and the tower read it (`js/hotel_live.js`).
- **Venue lifecycle (owner, 2026-10-09; rooms 2026-10-15):** a venue is the free room **upgraded** (above), so it keeps its decor and its open state; a **new venue record starts closed** (tests, an upgrade that never was open). The owner decorates (same editor, bigger budget) and can **Close** and **Open venue**: closed means only the owner enters. **Lock** is separate and works for every room: a locked door refuses everybody but the owner whatever the other rules say.
- **Facade (owner, 2026-10-09): free placement, not a fixed template.** The facade is the strip of hall wall around the door (10 or 20 m wide, 1.6 m deep; a free room has none), edited like a room: a grid of squares, any piece in any square (decoration, sign, window, door style, plants, neon). Reason: with many venues, fixed facades would all look alike. Limits that stay: the door itself is always there, a small piece budget by tier, the same piece whitelist and text cleaning as rooms, and nothing blocks the way along the wall. The strip is a document like a room (`facade`), signed on save.
- **Tier (owner, 2026-10-09; sizes enlarged and names set 2026-10-15):** what a tier holds on the wall, how big its room is and what it adds. Numbers are in `server/hotel.js` `TEMPLATES`; names are Ser / Fren / Whale / Legend, venues Room / Suite / Floor / Penthouse.

| Tier | Wall | Levels | Room (per level) | Pieces per level | Lights | Facade pieces | Perks |
|---|---|---|---|---|---|---|---|
| 0 Free | 1 unit (5 m) | 1 | 14 x 10 m | 80 | 10 | none | |
| 1 Ser | 2 units (10 m) | 1 | 22 x 16 m | 200 | 16 | 20 | entry rules, game tables |
| 2 Fren | a whole wall (4 units, 20 m) | 1 | 27 x 20 m | 300 | 18 | 40 | stage and DJ booth, music |
| 3 Whale | a whole wall **and the same wall on the floor above** | 2 | 27 x 20 m | 280 | 18 | 60 | + VIP upper level with its own entry rule |
| 4 Legend | **the whole floor (8 units) and the floor above** (penthouse) | 2 | 33 x 22 m | 340 | 22 | 80 | + VIP upper level |

  Game tables (Connect four, Long/Short) and the most legendary shop pieces are tier-locked (shown as "Requires Whale" in the shop). **Holdings fall:** the venue is frozen (closed, decor kept); regained within 7 days it reopens, otherwise it shrinks in place to the license's room (above); a lower tier also offers a move to the smaller room at once (`venuemove`), a higher tier the upgrade (`upgrade`). Old rooms are shifted into the new sizes on load.
  Rooms are 5 m tall (hotel venues and halls 6 m); the temporary solo room is 20 x 15 m. A two-level venue is **two rooms joined by stairs**: a second signed document (`level 2`), a space of its own on the server (presence, chat and head count per level, the plate adds them), a stair door beside the exit (`UPSTAIRS` / `DOWNSTAIRS`, `E`), the foot of the stairs is where you arrive. The wall the venue holds on the floor above shows glowing windows and a plate "UPPER LEVEL" (nobody else can rent it); a whole-floor venue also shows "PENTHOUSE" windows on its second wall. The facade (door, wall panel, floor mat, any piece) is always on the first wall, 10 or 20 m wide. Units fill first-fit; a room that needs two floors takes the first floor pair with the right units free; a Legend's penthouse goes above every smaller room.
- **Guard (owner, 2026-10-09): full control.** The owner sets the entry rule: open to everyone, holders only, closed, or **guest list**; plus a ban list. The guard NPC stands at the door and enforces it (server checks on `enter`). **Guest lists use usernames, not wallet addresses**, so that needs a **username**: unique, claimed once with a wallet signature (free, no NFT needed), shown on the plate instead of "Chog #n" or "Guest-1234". A player with no wallet has no username and cannot be on a list.
- **Exhibition floor (built 2026-10-15, floor `E`):** its doors are the week's contest entries (read-only snapshots of a wallet's saved room, shown at that room's size, four to a page; entered from the room's **Enter contest** button), the last winner first, the week's theme on the wall. One signed vote per wallet, none for yourself; the winner gets a trophy and heads the next week. It gives free players a public stage without a permanent address (`server/exhibition.js`).
- **Seed:** we publish 12 venues of our own, labelled "Chog Hotel", two units each, four to a floor (doors 101, 103, 105, 107, 201... 307: the old slot numbers 101 to 304 became units when the wall was cut into 5 m), so the first floors are never empty for a judge who tests alone. Each is a **ready-made room** (below) laid out for a tier 1 room: a café, a club, an arcade, a gallery, a reading nook, a workshop, an orbit lounge, a haunted hall, a terrace, a garage, a canteen and a sleepover suite (`tools/build_seed_venues.js`).
- **Empty rooms and ready-made rooms (owner, 2026-10-09):** every new room, Home or venue, **comes bare**: walls, floor and windows, nothing inside, not even a lamp (the fixed light floor keeps it readable). The editor's Room look tab offers **ready-made rooms**: the 12 layouts above, laid out for the floor in hand (from the Home up to a Penthouse level), as a starting point that replaces the room and stays fully editable. A layout is built from the walls outwards, never leaves a wall piece off its wall, hides art behind a tall piece, blocks a window, the door or the stairs, and is checked at every room size by `node tools/check_layouts.js` (`prototype/js/space_layouts.js`). The server also snaps every wall piece onto a back wall on save, so a room that changed size cannot leave a picture floating.
- **Built (2026-10-09, updated 2026-10-15):** the holder-venue loop. The Venues window (every wallet with a room) shows the room card: check in, go to the room, lock, ask for a bigger room, move it back up from the basement; for a venue also open/close, **entry rule** (anyone, holders only, guest list) with a **ban list**, music, VIP rule and the shop extras. The **Facade** button inside a venue opens a strip workbench (wall panel, floor mat, any piece; the door area stays clear), shown in the hall right away. A **guard** NPC stands beside the door when a rule is set, and **usernames** (My Chog card) feed the lists. Code `js/venue.js` (state and the calls the receptionist uses: `VENUE.checkIn()`, `upgrade()`, `reactivate()`, `setLock()`, `loadInventory()`), `js/hotel.js`, `js/room.js`, `server/hotel.js`, `server/inventory.js`, `server/users.js`, `server/license.js`.
- **Built (2026-10-08, v0):** lobby with the receptionist and the directory, elevator panel, doors in a colour per kind with a window glow and a plate (number, name, live "N inside", or "LOCKED"), rooms open as normal rooms and leaving returns to the door.
- **Built (2026-10-09, rooms and floors rework):** the square hall, a default shopfront (tinted wall, big lit windows) for a venue that has no facade of its own yet, tier templates with levels and the stairs, the upper-level and penthouse wall segments, bigger rooms, empty new rooms, the 12 ready-made rooms, the camera that follows you, per-size window layout. Old venue records are moved into the current numbering when the server starts (`server/test/migrate.js`: first numbering, slots, units).

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
