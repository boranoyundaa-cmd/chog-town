# Realtime server

`server/` (Node 20+, `ws` + `ethers`). Carries **presence and chat**, and stores **room documents** signed by their owners (`rooms.js`). Ownership, items and money live on Monad; the server never holds funds or signs anything. If it is down, nobody loses anything: the client falls back to walking the town alone with the NPC residents.

## Run

```bash
cd server && npm install      # once
node index.js                 # ws://localhost:8767, GET /health for counters
npm test                      # 62 checks (chat, identity, rooms, invitations, hotel) against a mock chain, no network needed except the RPC stand-in
```

Env: `PORT`, `RPC_URL`, `NFT_ADDR`, `ALLOWED_ORIGINS` (comma list; empty = any, dev only), `MAX_PLAYERS`, `MAX_PER_IP`, `DATA_DIR` (reports and `rooms/`; default `server/data`), `ROOM_PREP_MS` / `ROOM_SAVE_MS` (min time between room signatures / saves). The page connects to `ws://<host>:8767`; override with `?server=ws://...`. Preview config `town-server` is in `.claude/launch.json`.

## Deployed (2026-10-08)

Fly.io app `chog-town-ws`, Frankfurt, one `shared-cpu-1x` 256 MB machine that never sleeps (about $2.5 a month plus cents of egress). Address: `wss://chog-town-ws.fly.dev` (`/health` for counters). Config in `server/fly.toml`; the Dockerfile runs as user `node`. Measured from the dev machine: chat A to B about 50 ms, position relay one tick (100 ms).

- Deploy: `flyctl deploy --ha=false --remote-only` from `server/`. `flyctl` is installed in `~/.fly/bin` (not on PATH). `--ha=false` matters: the default would start two machines, and players on different machines would not see each other (the server is single-process by design).
- A deploy onto a machine that crashed past its restart limit leaves it stopped: `flyctl machine start <id>`.
- Logs: `flyctl logs`. Reports are also printed there (`report {json}`), because the container disk is lost on every deploy.
- The live page picks this server automatically (`net.js`); locally it uses `ws://localhost:8767`, and `?server=` overrides both. `ALLOWED_ORIGINS` in `fly.toml` allows only `https://chog-town.pages.dev` and `http://localhost:8766`. This stops other websites from using the server from a visitor's browser; it is not authentication (a script can fake the header). Add any new page address there and redeploy.
- Source of the deployed code: private GitHub repo `boranoyundaa-cmd/chog-town-server` (only `server/`).
- Why a server at all, and why not on-chain: Monad is 300 ms blocks / 600 ms finality (July 2026, MIP-12); 100 players at 10 position updates a second would be 1,000 tx/s, a tenth of the chain's design capacity, each paying gas and a signature. Chat could technically go on-chain but every line would be permanent and paid. Ownership and money stay on-chain.

## Protocol (JSON frames; `server/index.js` header is the source of truth)

Client to server: `auth {addr, sig}` or `auth {session}`, `appear {token|null}`, `logout`, `move {x,z,ry,mv}` (~10/s), `chat {text}`, `report {id, reason}`, `enter {space, who, x, z, ry}`, `roomprep {doc}`, `roomsave {doc, ts, sig}`.
Server to client: `welcome` (id, challenge, current players, `rooms:1` when the server knows rooms), `join`, `leave`, `appear`, `state` (batched moves, 10 Hz, only players that moved), `snap`, `chat`, `sys`, `authed`, `authfail`, `entered`, `roomprep`, `roomsaved`, `roomfail`, `roomdoc`.

## Spaces and rooms

Every player is in exactly one **space**: `city` (the town, default on connect), `room:<wallet>` (a saved Home; the owner and invited visitors share it) or `solo:<id>` (a private spot for guests and unsaved rooms), `hotel:<floor>` (0 = lobby, walking limits 5.3 x 3.8; floors 7.4 x 7.4) or `venue:<id>` (a hotel venue: the room document comes from `seed_venues.json`, one space per venue, nobody can edit it). Presence, movement, chat and `appear` only reach players in the same space; walking limits are per space (town slab, or the 9 x 7 room floor). `enter` changes space and answers `entered {space, owner, mine, ownerName, doc, savedAt, players}`; `who` is `'me'` (needs a signed-in wallet) or a wallet address. **A Home is private**: entering someone else's needs a direct invitation (`invite {id}`: the owner invites one connected player for 30 minutes; the guest gets `invited {owner, from}`) or the owner's share link token (`enter {..., inv}`; `invlink {renew?}` returns the token, one per owner, 7 days, renewing revokes the old one; stored in `DATA_DIR/invites.json`, `server/invites.js`). Inviting needs a signed-in wallet and a saved Home. A client that does not see `rooms:1` in `welcome` (older server) plays rooms locally; `hotel:1` says the server knows the hotel. The hotel (`server/hotel.js`, v0: only the venues the game itself makes, built by `node tools/build_seed_venues.js`; venue number = floor * 100 + slot): `hotelinfo` answers `hotel {floors, venues, counts}` (no room documents), `enter {space:'hotel', floor}` and `enter {space:'venue', id}` answer `entered` with `floor` / `venue` / `doc`, and `counts {c}` (people inside each venue, real players only) is pushed every 2 s to players on hotel floors when it changed. **Update the `COPY` line of the `Dockerfile` whenever the server gets a new file.**

Saving: `roomprep` returns the cleaned document's hash message and a timestamp, the wallet signs it, `roomsave` is stored only if the signature recovers to the signed-in wallet, matches the cleaned document and is under 2 minutes old. The document is rebuilt from `room_catalog.json` (pieces, themes, window views, patterns; **generated from the game data: `node tools/build_room_catalog.js` after any catalog change**), budget 40 pieces, text cleaned. A save is broadcast to the visitors inside as `roomdoc`. Frames are limited to 2 KB, except `roomprep` and `roomsave` (16 KB).

**Persistence (live since 2026-10-08).** Rooms live in `DATA_DIR/rooms/`; on Fly that is the 1 GB volume `chog_data` mounted at `/data` (about $0.15 a month, daily snapshots kept 5 days; one machine only, a volume belongs to one machine). The volume is mounted root-owned, so the Dockerfile starts as root, `chown`s `/data` and drops to `node` with `su-exec`. A live check (sign in, save, read back) passed; look at the files with `flyctl ssh console -a chog-town-ws -C "ls /data/rooms"`. Deploy the **server before the site**: a new site on an old server still works, rooms then stay local.

## Identity

1. Everyone is a **guest** on connect (default Chog, name `Guest-NNNN`).
2. To appear as Chog #N the wallet signs the server's challenge once (`personal_sign`, free, no transaction); the server recovers the address and checks `ownerOf(N)` on chain. A 12 h session token (kept in `localStorage`, held in server memory) skips the signature on later visits; a server restart means one new signature.
3. One window per Chog: a second login with the same token replaces the first.
4. Traits are not sent by the server; clients load them from the token id (`WALLET.traitsOf`).

## Anti-abuse (v0)

- Movement: positions are clamped to the island and to 1.6x walk speed; repeated violations get a `snap` back. **No building collision on the server yet** (a modified client can walk through walls).
- Chat: 140 chars, burst of 3 per 6 s, repeat text blocked, links and wallet addresses stripped (scam vector in a crypto game). **No word/profanity filter** (owner decision: adult, crypto-native audience); moderation is reports, auto-mute and local mute.
- Reports: written to `server/data/reports.jsonl` with the target's last 5 lines; 3 distinct reporters in 10 min auto-mute the target for 10 min. Players can also mute locally. Nobody reviews the file yet.
- Limits: 6 connections per IP, 200 players, 2 KB frames, Origin allow-list.

## Not done

Server-side collision, venues (owner entry rules, tier budgets), backups of the room files, moderation of room text and reported rooms, horizontal scaling (single process, single shard by design), moderator tooling, TLS (put it behind a reverse proxy with `wss://` for deployment; the page picks `wss` automatically on https).
