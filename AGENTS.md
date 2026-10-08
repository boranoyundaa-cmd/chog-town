# Chog Town

A browser MMO built around the 1,969 Chog Genesis NFTs on Monad, for the Chogathon hackathon. Goal: win it.
Current phase: **modern city world with a real-clock day cycle, walking, wallet, multiplayer chat, trait characters and free rooms (decorate, signed save, visits) are built; the world architecture is decided (town, Home house, Hotel for venues, NPC schedules; `docs/game/world.md`); next is building it.**

The owner speaks Turkish. Reply in Turkish unless asked otherwise.

## Map

| Path | What it is |
|---|---|
| `prototype/` | Working art prototype (Three.js, no build step). Run: `python prototype/server.py` → http://localhost:8766 |
| `tools/` | Data scripts (owners, traits, rarity) and `build_site.py` (collects the static game into `dist/` for hosting) |
| `server/` | Realtime server (Node, WebSocket): presence, chat, signed rooms. Run: `cd server && node index.js` → ws://localhost:8767 |
| `docs/` | All documentation, by category. Start at `docs/README.md` |
| `docs/assets/` | Reference screenshots and style references |

## Read before working

- What we are building and what is next: `docs/project/overview.md`
- World structure (town, Home, Hotel, NPCs, light, mini-games): `docs/game/world.md`
- Hackathon rules and judging: `docs/project/hackathon.md`
- Visual rules (do not drift from these): `docs/art/art-direction.md`
- How the prototype works and its pitfalls: `docs/engineering/prototype.md`
- Realtime server and multiplayer protocol: `docs/engineering/server.md`

## Rules

- **One art style, many asset themes.** Never add per-space or per-player render styles. Every asset (stock or creator-made) keeps the game's visual language; variety is theme content (halloween, retro, cyberpunk...). Read `docs/game/spaces.md` and `docs/art/art-direction.md` before making or approving any asset.
- **PC first.** The game is played on desktop; mobile is a later companion (view the Chog, inventory, market). Do not design gameplay or layout around phones.
- Free to play, NFT essential: anyone can play with a default purple Chog; the NFT must unlock things the game cannot work the same without (see `docs/game/design.md`). The game must be fun on its own first; NFT promotion comes second. Never pay-to-win.
- Judge every visual change from a full-resolution PNG (`capture()` / `P` key), never from a downscaled pane screenshot.
- Keep docs short and current. Document decisions and constraints, not history. Delete or rewrite stale text instead of appending.
- Update `docs/project/overview.md` (status + next steps) at the end of each work session.
