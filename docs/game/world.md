# World architecture

Decided with the owner on 2026-10-08. The open items are at the end. Rooms, themes and the document model are in `docs/game/spaces.md`; license tiers and economy in `docs/game/design.md`.

## Structure

One outdoor **town** on a single shard. Every door leads to a **space** (a document, `docs/game/spaces.md`) with its own presence and chat. The town stays small and content grows inward, because a big world with a small population feels empty (`docs/game/core-loop-research.md`).

- **Size:** target about 40 x 40 m (now 16 x 16). At 2.7 m/s that is roughly 15 s corner to corner. A second district only if the first one is full.
- **Four kinds of space:**

| Space | Who | Access |
|---|---|---|
| **Home** | everyone, free, one per wallet, small budget | private; visits by invitation only |
| **Venue** | a license holder; tier sets frontage, budget, features | public, listed in the Hotel |
| **Exhibit** | a weekly contest entry: a frozen copy of a Home | public for that week, on the Exhibition floor |
| **Official place** | made by us | public |

**Principle: what is scarce is the stage, not creativity.** Anyone can decorate, host by invitation, play and enter contests. A permanent public address (a door, listing, entry rules, tickets, a guard) is what the Chog license unlocks. Without the NFT you can still play and build, but you cannot run a place.

## Buildings

| Building | Job |
|---|---|
| **Hotel** (today's Chog Lofts) | The venue hub, described below. The tower is as tall as the number of floors (a fixed height today) |
| **Home** (new, a plain house) | Everyone enters through the same door and finds their own Home. Not an apartment block |
| **Arcade** | Record games on cabinets |
| **Moka & Co** | Social place, daily tasks from the barista |
| **Gallery** | The Chog Wall (all 1,969 Chogs, the ones with an owner glow), NFT showpieces |
| **NOVA Club** | Official events; opens in the evening by the real clock |
| **Town Hall** (new) | Guide NPC, license desk, "tonight" board |
| **Market** (new) | Cosmetics, furniture, kits made by creators |

Town Hall and Market may start as a counter inside another building. Build order is under Next steps in `docs/project/overview.md`.

### Home

Entry is one door for all; the server puts you in your own Home. **Visits are by invitation only:** the owner invites a player from the player card ("Invite home") or shares a revocable invite link. There is no Home directory and no public "visit by wallet". Built (2026-10-08): a Home opens only for its owner, for a player the owner invited from the player card (30 minutes), or for someone with the owner's share link (7 days, "Reset link" revokes it).

### Hotel

- **Lobby:** a reception NPC, a list with search and categories. Each result shows the venue's name, description, room number and floor, plus a "Go to room" button. The button puts you **in the hall in front of the door**, not inside, so the world feels larger.
- **Floors (owner, 2026-10-09, replaces the L-shaped corridor):** reached by elevator. A floor is a **square hall, 16 x 16 m, open in the middle** (a rug, a sitting corner, benches, plants: people can gather), and the **rooms stand on the two back walls only**, because the camera draws only those two (north wall to the screen's upper right, west wall to the upper left; a door on a front wall would show its back). **Four slots of 6.5 m of wall**: slots 1 and 2 on the north wall, 3 and 4 on the west wall; the elevator takes the 3 m corner between them. A room's wall is its **facade**, edited like a room (below). Floors are generated from data, so adding floors costs nothing. Rooms are listed in publish order; categories exist only in the search. A venue not entered for 30 days leaves the list and keeps its number (floor x 100 + first slot, e.g. 304).
- **Venue lifecycle (owner, 2026-10-09):** a venue is a **separate room from the Home**, with its own structure. The holder **activates** it from the license (tier decides the template); until the owner presses **Open**, the room is **closed**: the door in the corridor shows a "Closed" plate and nobody but the owner can enter. The owner walks in, decorates (same editor as the Home, bigger budget), then presses **Open venue**; entry opens. The owner can close it again.
- **Facade (owner, 2026-10-09): free placement, not a fixed template.** The facade is the strip of hall wall around the door (6.5 or 13 m wide, 1.6 m deep), edited like a room: a grid of squares, any piece in any square (decoration, sign, window, door style, plants, neon). Reason: with many venues, fixed facades would all look alike. Limits that stay: the door itself is always there, a small piece budget by tier, the same piece whitelist and text cleaning as rooms, and nothing blocks the way along the wall. The strip is a document like a room (`facade`), signed on save.
- **Tier (owner, 2026-10-09):** what a tier holds on the wall and how big its room is. Numbers are placeholders (`server/hotel.js` `TEMPLATES`); tier names stay placeholders.

| Tier | Wall | Levels | Room (per level) | Pieces per level | Lights | Facade pieces |
|---|---|---|---|---|---|---|
| 1 | one slot (6.5 m) | 1 | 15 x 11 m | 120 | 12 | 20 |
| 2 | a whole wall (2 slots, 13 m) | 1 | 18 x 13 m | 180 | 14 | 40 |
| 3 | a whole wall, **and the same wall on the floor above** | 2 | 18 x 13 m | 160 | 14 | 60 |
| 4 | **the whole floor and the floor above** (penthouse) | 2 | 22 x 15 m | 200 | 16 | 80 |

  The free **Home is 13 x 10 m, 80 pieces, 10 lights** (twice the old 9 x 7). A two-level venue is **two rooms joined by stairs**: a second signed document (`level 2`), a space of its own on the server (presence, chat and head count per level, the plate adds them), a stair door beside the exit (`UPSTAIRS` / `DOWNSTAIRS`, `E`), the foot of the stairs is where you arrive. The wall the venue holds on the floor above shows glowing windows and a plate "UPPER LEVEL" (nobody else can rent it); a whole-floor venue also shows "PENTHOUSE" windows on its second wall. The facade (door, wall panel, floor mat, any piece) is always on the first wall, 6.5 or 13 m wide. A free slot shows a plate "ROOM #n, free for a Chog holder". Floors fill first-fit; a room that needs two floors takes the first floor pair with the right slots free.
- **Guard (owner, 2026-10-09): full control.** The owner sets the entry rule: open to everyone, holders only, closed, or **guest list**; plus a ban list. The guard NPC stands at the door and enforces it (server checks on `enter`). **Guest lists use usernames, not wallet addresses**, so that needs a **username**: unique, claimed once with a wallet signature (free, no NFT needed), shown on the plate instead of "Chog #n" or "Guest-1234". A player with no wallet has no username and cannot be on a list.
- **Exhibition floor:** its doors come from the week's contest entries (snapshot copies of Homes); likes decide the winner, who gets a trophy. It gives free players a public stage without a permanent address. Details are open.
- **Seed:** we publish 12 venues of our own, labelled "Chog Town", four to a floor (101 to 104, 201 to 204, 301 to 304), so the first floors are never empty for a judge who tests alone. Each is a **ready-made room** (below) laid out for a tier 1 floor (15 x 11 m): a café, a club, an arcade, a gallery, a reading nook, a workshop, an orbit lounge, a haunted hall, a terrace, a garage, a canteen and a sleepover suite (`tools/build_seed_venues.js`).
- **Empty rooms and ready-made rooms (owner, 2026-10-09):** every new room, Home or venue, **comes bare**: walls, floor and windows, nothing inside, not even a lamp (the fixed light floor keeps it readable). The editor's Room look tab offers **ready-made rooms**: the 12 layouts above, laid out for the floor in hand (13 x 10 up to 22 x 15), as a starting point that replaces the room and stays fully editable. A layout is built from the walls outwards, never leaves a wall piece off its wall, hides art behind a tall piece, blocks a window, the door or the stairs, and is checked at every room size by `node tools/check_layouts.js` (`prototype/js/space_layouts.js`). The server also snaps every wall piece onto a back wall on save, so a room that changed size cannot leave a picture floating.
- **Built (2026-10-09):** the whole holder-venue loop. The Venues window (holders) activates a venue (the server checks the wallet's Chogs on chain), the door shows **Closed**, the owner enters it, decorates with the tier's budget and floor, saves (wallet signs), presses **Open venue**. Facade: the **Facade** button inside the venue opens a strip workbench (wall panel, floor mat, any piece; the door area stays clear), shown in the hall right away. The owner's **entry rule** (anyone, holders only, guest list) plus a **ban list**, a **guard** NPC beside the door when a rule is set, and **usernames** (My Chog card) for the lists. Code `js/venue.js`, `server/hotel.js`, `server/users.js`, `server/license.js`.
- **Built (2026-10-08, v0):** lobby with the receptionist and the directory (search, kinds, "Go to room" puts you at the door), elevator panel, doors in a colour per kind with a window glow and a plate (number, name, live "N inside"), venues open as normal rooms and leaving returns to the door.
- **Built (2026-10-09, rooms and floors rework):** the square hall with four 6.5 m slots (above), a default shopfront (tinted wall, big lit windows) for a venue that has no facade of its own yet, tier templates with levels and the stairs, the upper-level and penthouse wall segments, bigger rooms (Home 13 x 10), empty new rooms, the 12 ready-made rooms, the camera that follows you once you zoom in on a big room, per-size window layout. Old venue records (8 small slots) are moved into the new numbering when the server starts (`server/test/migrate.js`).

## Light

**The real clock affects only the background**: the outdoor town and what is seen through windows (the owner may pin the view, for example always night). **Interiors are lit only by lights placed in them**, never by the clock and never by a room-wide setting.

- A small fixed light floor keeps an unlit room readable (and the editor usable); new spaces start with a ceiling lamp.
- Lights become an item category (lamp, neon strip, spot, lantern) and the light budget grows with tier.
- The same rule holds for the lobby and the halls.
- **Built (2026-10-08):** the old room "ambience" is now a window view only (`SPACE.VIEWS`, `space.js` `applyView`): real clock by default, pinnable. The fixed light floor is `SPACE.INTERIOR` (hemi 0.3, key 0.2); the starter Home has a pendant lamp. A ceiling piece class (`cat: 'ceiling'`) does not block walking.

## NPCs

- **Kinds:** ambient residents (12 to 16, life) and service NPCs (guide, barista, guard, shopkeeper: a role card with one action). Hired staff come later.
- **Daily cycle without a simulation:** a resident's position is a pure function of its id and the real time (morning café, noon plaza, evening arcade or club, night they go inside). Every client computes the same, so the server holds no NPC state. This keeps the earlier "no deep offline simulation" decision.
- **Adaptive crowd:** aim for about 12 visible people; the NPC count is that target minus the players online. A lone judge sees 12 residents, a busy town shows few.
- **Never counted** in rankings, visitor counts or "N inside" (wash trading).
- **Built (2026-10-08, `js/npc.js`):** 15 residents (3 service, 12 ambient), schedules as `[hour, place]` lists, paths computed on the walk grid, residents go inside a door and disappear, the crowd cap (`NPC.target` 12), muted plates with a role, a click card with one line and an action for Juno, no minimap dots. Night: about 4 to 6 outside, day: 10 to 11. Not built: challenges, hired staff.
- **Dialogue** is written lines by time and place. No LLM chat (cost, moderation, time).
- **Telling NPCs from players:** nameplate (players: name and tier pill; NPCs: muted plate with a "resident" icon and role), minimap (players are bright dots, NPCs have none), click card (player: invite, mute, report; NPC: role and action), movement on routes, a role costume (apron, cap, headset). NPCs never copy a real token's traits.
- **No offline holder Chogs** in town (decided): only fictional NPCs.

## Mini-games (picked 2026-10-15, list in `docs/project/build-plan.md`)

Two groups. **Record games** run in the client and send only the result, so latency does not matter. **Two-player games** are turn-based or simultaneous choices; a few small messages over the existing WebSocket. Real-time action duels are out (latency, cost).

Rules for any game: solo-playable, 1 to 2 minutes, your own Chog is the character, no token reward, only daily-capped trophies and badges that become **shelf pieces in your Home**. A game lives where its fiction belongs.

| Group | Idea | Where |
|---|---|---|
| Record | Stack the luggage, floors reached (one button) | Arcade |
| Record | Barista orders, fastest wins | Moka counter |
| Record | Rhythm with the club music | NOVA DJ booth |
| Record | Daily Chog: guess today's Chog from trait hints, Wordle style, same puzzle for all | Gallery |
| Two players | Rock-paper-scissors with Chog gestures shown above the heads | anywhere: stand next to another Chog, press "Challenge" |
| Two players | Dance copy: one shows a sequence, the other repeats | anywhere |
| Two players | Connect four, pieces are Chog faces | café tables |
| Contest | Weekly Home contest, theme and likes | Exhibition floor |

NPC residents accept challenges (their opponent is labelled), so a lone judge can test the two-player games.

## Open

Decided 2026-10-15 (`docs/project/build-plan.md`): the mini-games, the name (**Chog Hotel**), the Exhibition floor (one signed vote per wallet, no self-vote, winner tops the floor for a week), tier perks (capacity, stage and DJ booth, VIP room, game tables, tier-locked shop items).

- **Camera (owner, 2026-10-09):** a free or rotating camera is **dropped for now** (the whole game, the art and the editor assume one fixed isometric angle). If it ever comes back, the idea is 90-degree steps (Q and E) inside rooms and the Home only, never in the hotel or the town.
- Dress code for the guard (not planned).
- Invite link: assumed revocable and expiring.
- Window view: assumed to follow the clock by default with a pin option.
