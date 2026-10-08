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
| **Hotel** (today's Chog Lofts) | The venue hub, described below. The tower is as tall as the number of floors |
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

- **Lobby:** a reception NPC, a list with search and categories. Each result shows the venue's name, description, room number and floor, plus a "Go to room" button. The button puts you **in the corridor in front of the door**, not inside, so the world feels larger.
- **Floors:** reached by elevator. A floor is a list of facades, generated from data, so adding floors costs nothing. Rooms are listed in publish order; categories exist only in the search. A venue not entered for 30 days leaves the list and keeps its number.
- **Facade:** a small editable surface in the corridor: showcase, wall, sign, a guard or none. It uses the same space system with a small budget. The door plate shows name, number and a live "N inside". The inside is not shown live (cost); the showcase is static.
- **Tier:** frontage width (1 / 2 / 3 slots), upper and penthouse floors for tier 4, the guard, the light budget. Tier names stay placeholders.
- **Exhibition floor:** its doors come from the week's contest entries (snapshot copies of Homes); likes decide the winner, who gets a trophy. It gives free players a public stage without a permanent address. Details are open.
- **Seed:** we publish 12 venues of our own, labelled "Chog Town", so the first floors are never empty for a judge who tests alone (`tools/build_seed_venues.js`: a café, a club, two arcades, a gallery, a library, a studio, three lounges, a spooky room and a cyberpunk canteen, all made from the player catalog with the editor's placement rules checked by the tool).
- **Built (2026-10-08, v0):** lobby with the receptionist and the directory (search, kinds, "Go to room" puts you at the door), elevator panel, L-shaped floors (long wall: slots 1 to 4 after the elevator, short wall: slots 5 to 8), plain doors in a colour per kind with a window glow and a plate (number, name, live "N inside"), venues open as normal rooms and leaving returns to the door. Not built yet: the tower's height from the floor count, facades beyond the plain door, holder venues, tiers, guards.

## Light

**The real clock affects only the background**: the outdoor town and what is seen through windows (the owner may pin the view, for example always night). **Interiors are lit only by lights placed in them**, never by the clock and never by a room-wide setting.

- A small fixed light floor keeps an unlit room readable (and the editor usable); new spaces start with a ceiling lamp.
- Lights become an item category (lamp, neon strip, spot, lantern) and the light budget grows with tier.
- The same rule holds for the lobby and the corridors.
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

## Mini-games (not decided, the owner will pick)

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

- Which mini-games enter the first slice.
- Final name: Chog Town or Chog Hotel (a "Hotel" invites the Habbo comparison; the NFT license and the physical corridors carry the novelty).
- Exhibition floor: voting, anti-abuse, how long a winner stays.
- Guard rules (dress code, guest list, holders only) and what each tier adds beyond width.
- Invite link: assumed revocable and expiring.
- Window view: assumed to follow the clock by default with a pin option.
