# Spaces: rooms and venues, and how much freedom creators get

## The principle (owner, 2026-10-08, important for every asset in the game)

**One art style for the whole game.** The render pipeline, the outline, the toon shading, the proportions and the asset language are fixed and shared by everything: city, stock rooms, creator rooms, items, Chogs. Nothing in a space can change how the game is rendered. A consistent look is what makes the world feel like one game.

**Variety comes from asset themes, not art styles.** Players get a very wide range of assets that cover many themes (modern, cyberpunk, retro 80s, space, halloween, and more over time), all drawn in the one style. A creator can build a halloween house or a space station without the game ever looking like a different game. The same holds for wallpapers, floors, backgrounds and anything else we sell or give.

Rules for any new asset, stock or creator-made:
1. Same visual language as `docs/art/art-direction.md` (chunky toon shapes, saturated palette, small lit details, readable silhouettes).
2. Theme through content and palette, never through shaders, outline changes, realism or pixel/photo styles.
3. Colours and patterns are free; the construction vocabulary (shapes, proportions, scale) is shared.
4. A new theme means a new kit: a palette, default wall and floor, a set of pieces. Nothing else changes.

(A dev-only `?style=` switch exists in the engine for art comparison; the game never exposes it.)

The viewer `prototype/space.html?layout=studio|cyberpunk|retro80s|space|halloween|gallery&view=day|evening|night|neon` shows the system.

## What a creator controls

| Control | What it is | Status |
|---|---|---|
| **Theme kit** | palette, default wall and floor, window shape, scenery, ~60 themed pieces | 5 kits built |
| **Wall and floor** | any colour + a pattern from a list (plaster, brick, subway tile, stripes, zigzag, dots, planks, herringbone, terrazzo, carpet, grid, metal...) | built |
| **Window view** | what is seen through the windows: follows the real clock, the owner may pin it. Background only; it never lights the room | built (`SPACE.VIEWS`; the pin is `view` in the document, absent = real clock) |
| **Lights** | placed lights are the only light inside a space (small fixed floor so an unlit room stays readable); a lamp piece is in every new space; the light budget grows with tier | built: a fixed light floor (`SPACE.INTERIOR`) plus placed lights (pendant lamp, ceiling neon, floor and table lamps...); budget 10 lights, not yet by tier |
| **Pieces** | place, rotate, tint, scale (0.4x to 3x) any piece from the catalog | built; the free-room editor offers place, turn, tint (no scale yet) |
| **Own pieces** | build a piece from shapes and colours: box, cylinder, sphere, cone, ring, plane, glowing parts, lights, simple motion (spin, bob, blink, pulse), up to 48 parts | format built, editor ("Part Lab") to do |
| **Text** | words on the wall, any text up to 24 characters, colour, glow | built |
| **NFT frames** | frames, easels and plinths that show an NFT from the owner's wallet (any collection, Chog or not) | pieces built with demo images; wallet feed to do |
| **Windows** | on or off, to free wall space | built |

## The model: a space is a document, never code

```
space  = { name, theme, view?, wall?:{c,pat}, floor?:{c,pat}, windows?:false, pieces:[{p, x, z, y?, ry?, c?, k?, txt?, img?}], custom?:{id: piece} }
theme  = { palette tokens, floorTex, wallTex, windows, scenery, neon lights }
piece  = { name, cat, fp:[w,d], parts:[ part ... ] }              (stock furniture, theme kits and creator pieces are the same thing)
part   = { t: box|cyl|sph|cone|tor|plane|text|img|light, s, p, r, c:'$token'|'#hex', e (glow), o (opacity), k (scale), g (halo), a: spin|bob|blink|pulse, edit }
```

- `js/space.js` interprets documents (numbers clamped; at most 48 parts per piece, 400 pieces, 10 lights). `js/space_data.js` holds the kits, window views and pieces. Colour tokens (`$accent`, `$wood`...) resolve against the theme palette, so one sofa fits every theme.
- **No scripts, no network access from a document.** It cannot run code or load anything by itself, so a venue cannot attack visitors; the worst case is an ugly or heavy room, which budgets and reports handle.

## NFT display
- **Who can show what:** anyone with any NFT in their wallet can show it, Chog holder or not. Free players buy frames, easels and plinths (market items), which gives free players something to spend on and gives every collector a reason to join. Chog holders keep the venue licence and the bigger budgets (below), so the Chog NFT stays essential to the game while the display is open to all.
- **Never load a URL straight from the document.** The server resolves `tokenURI`, fetches the image through a proxy with a host allow-list (IPFS gateways, Arweave, known collection hosts), size limit (about 2 MB), still images only (png, jpeg, webp), and caches it. Visitors never contact third-party hosts (no IP leak, no tracking pixels).
- **Ownership is checked** when a space loads (`ownerOf` or `balanceOf` for ERC-1155): a frame whose owner no longer holds the token shows an empty frame, so a room cannot display NFTs it does not own.
- **To research:** how to list a wallet's NFTs on Monad (an NFT indexer API; `ERC721Enumerable` is not guaranteed). Not decided.
- **Moderation:** reported spaces are hidden from the directory; NFT images can be offensive, so reports apply to frames too.

## Budgets: where the Chog NFT matters
Venue tier (from holdings, `docs/game/design.md`) sets the budget: floor size, pieces, custom parts, lights, kit slots. Free rooms get a small fixed budget and the stock kits. Freedom is wide, cost is bounded, and a top-tier holder gets the biggest canvas.

## Storage and trust (built for free rooms, 2026-10-08)
One room per wallet, stored as JSON. **Save = the wallet signs a readable message that contains the hash of the cleaned document** (`personal_sign`, free, once per Save, never per placed piece); the server stores the document with the signature and serves it to the owner and invited visitors. Flow: `roomprep {doc}` returns the cleaned document's message, the wallet signs, `roomsave {doc, ts, sig}` is accepted only if the signature recovers to the session's wallet, matches the cleaned document and is under two minutes old. The server **rebuilds the document from a whitelist** (known pieces, themes, window views, patterns; numbers clamped to the floor; 90 degree turns; text cleaned of links and addresses; no images, scale, height or `custom` pieces yet) and enforces the budget, so a hacked client can only make an ugly room, not a harmful one. Geometry (overlaps) is not checked on the server. Storage is one file per wallet (`DATA_DIR/rooms/<address>.json`); the signed document can later be mirrored or its hash anchored on-chain. Guests (no wallet) decorate a local draft (`localStorage`) and cannot save to the server.

## The room editor (owner decisions, 2026-10-08)
Pieces snap to a **half-metre grid** (within half a metre of a wall they glue to it); **click to pick, click to place** (no dragging): choose a piece in the panel or click a placed one to pick it up, the preview turns green or red, click the spot. `R` turns, `Del` removes, `Esc`/right click cancels (a picked-up piece goes back), `Shift` keeps placing. Wall pieces snap to the wall under the cursor and never cover the door or a window. The way from the door stays free. Rules live in one function (`fits` in `js/room.js`).

## Safety
Reports and auto-mute exist (`docs/engineering/server.md`); venues get the same, and reported spaces are hidden from the directory pending review. Owner entry rules and a ban list. No gambling (deferred, `docs/game/design.md`). No profanity filter by owner decision; links and wallet addresses are stripped from text.

## Kinds of space (2026-10-08)
Home (private, invitation only), Venue (holder, public, a door in the Hotel with an editable facade), Exhibit (a frozen copy of a Home for a weekly contest) and official places. Who gets which, and the Hotel, in `docs/game/world.md`. A Home is served only to its owner and invited players (built 2026-10-08: direct invitation or revocable share link, `docs/engineering/server.md`).

## To build, in order
1. ~~Enter and leave a space from the city, per-space presence and chat, walk collision inside.~~ Done (2026-10-08).
2. ~~Placement editor and signed save.~~ Done for the free room (grid, pick and place, tint, text, theme, light, wall and floor). To add: stacking on tables, free scale, undo.
3. ~~The free room for every player.~~ Done. To do: first-visit tour, deploy with a persistent volume.
4. NFT frames wired to the wallet (indexer + image proxy).
5. Part Lab: build and name your own piece, use it in your space, later publish it as an item.
6. Market: kits, frames and pieces as items.
7. Hotel (holders): lobby, directory, elevator, floors, facade editor, tiers, entry rule, guard. See `docs/game/world.md`.
