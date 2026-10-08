"""Pull every Chog Genesis token (id -> metadata file -> traits) into prototype/data/chogs.json.

Reads on-chain `ownerOf` and `tokenURI` from the Monad RPC, then the metadata JSON from an IPFS gateway.
Token ids are 1..1969. The metadata file number is NOT the token id (token 1700 -> 1192.json), so always go through tokenURI.

Usage: python tools/fetch_chogs.py [SECONDS_BETWEEN_REQUESTS]    (default 0.8; the gateway banned us for 1 hour at ~1 req/s, use 3 to be safe)
Resumable: progress is kept in chogs.json.partial.
"""
import json, os, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

RPC = "https://rpc.monad.xyz"
NFT = "0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763"
# Tried in order. ipfs.io / cloudflare / w3s.link / dweb.link return 403 for scripts. Pinata's free gateway allows only ~250-275 requests,
# then bans for an hour; Filebase's showed no limit so far.
GATEWAYS = ["https://ipfs.filebase.io/ipfs/", "https://gateway.pinata.cloud/ipfs/"]
FIRST, LAST = 1, 1969
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "prototype", "data", "chogs.json")
UA = {"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"}
DELAY = float(sys.argv[1]) if len(sys.argv) > 1 else 0.8


def rpc_batch(calls):
    body = json.dumps([{"jsonrpc": "2.0", "id": i, "method": "eth_call", "params": [{"to": NFT, "data": d}, "latest"]} for i, d in enumerate(calls)]).encode()
    for k in range(8):                       # the public RPC answers 429 under load: back off and retry
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(RPC, body, UA), timeout=60))
            res = {x["id"]: x.get("result") for x in r}
            if len(res) == len(calls) and all(res.values()): return res   # a batch can carry per-item errors
            raise ValueError(str([x for x in r if not x.get("result")][:1]))
        except Exception:
            time.sleep(2 * (k + 1))
    raise RuntimeError("rpc failed")


def decode_string(h):
    b = bytes.fromhex(h[2:]); n = int.from_bytes(b[32:64], "big"); return b[64:64 + n].decode()


class RateLimited(Exception):
    pass


def get_json(path, tries=6):
    """Fetch JSON from the first gateway that answers. A gateway that rate-limits us is skipped; only when all are banned does the run abort
    cleanly (progress is kept in the .partial file)."""
    banned = {}
    for k in range(tries):
        for g in GATEWAYS:
            if g in banned: continue
            try:
                return json.load(urllib.request.urlopen(urllib.request.Request(g + path, headers=UA), timeout=40))
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    wait = int(e.headers.get("Retry-After", "30"))
                    if wait > 300: banned[g] = wait; print(f"{g} banned us for {wait // 60} min, skipping it", flush=True)
                    else: time.sleep(wait + 1)
                else:
                    time.sleep(2 * (k + 1))
            except Exception:
                time.sleep(2 * (k + 1))
        if len(banned) == len(GATEWAYS):
            raise RateLimited(f"all gateways ban us for up to {max(banned.values()) // 60} min; rerun later, progress is saved")
    raise RuntimeError("failed: " + path)


def save(cache, path):
    """Atomic write so a killed run cannot leave a corrupt resume file."""
    with open(path + ".tmp", "w", encoding="utf-8") as f: json.dump(cache, f)
    os.replace(path + ".tmp", path)


def main():
    ids = list(range(FIRST, LAST + 1))
    uris, owners = {}, {}
    for i in range(0, len(ids), 25):
        chunk = ids[i:i + 25]; time.sleep(0.3)
        t = rpc_batch(["0xc87b56dd" + "%064x" % x for x in chunk]); o = rpc_batch(["0x6352211e" + "%064x" % x for x in chunk])
        for j, x in enumerate(chunk):
            uris[x] = decode_string(t[j]); owners[x] = "0x" + o[j][-40:]
    print("tokenURIs:", len(uris))

    cache_path = OUT + ".partial"            # resume file, deleted on success
    cache = json.load(open(cache_path, encoding="utf-8")) if os.path.exists(cache_path) else {}

    def one(x):
        if str(x) in cache: return x, cache[str(x)]
        u = uris[x]; assert u.startswith("ipfs://"), u
        time.sleep(DELAY)                        # ~1 request/s got us banned for ~1 hour by the free gateway; slow down instead
        m = get_json(u[len("ipfs://"):])
        d = {"file": u.rsplit("/", 1)[1], "name": m["name"], "image": m["image"],
             "owner": owners[x], "traits": {a["trait_type"]: a["value"] for a in m["attributes"]}}
        cache[str(x)] = d
        return x, d

    out, done, last = {}, 0, len(cache)
    print(f"resuming: {len(cache)} already saved, {len(ids) - len(cache)} left to fetch", flush=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    try:
        with ThreadPoolExecutor(1) as ex:
            for x, d in ex.map(one, ids):
                out[x] = d; done += 1
                if done % 25 == 0 and len(cache) != last:   # cached tokens are skipped without a request; only report real progress
                    last = len(cache); print(last, "/", len(ids), "saved", flush=True); save(cache, cache_path)
    except RateLimited as e:
        save(cache, cache_path)
        print("STOPPED:", e, "| cached", len(cache), "of", len(ids)); sys.exit(2)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"contract": NFT, "chain": "monad", "count": len(out), "tokens": {str(k): v for k, v in sorted(out.items())}}, f, ensure_ascii=False, separators=(",", ":"))
    if os.path.exists(cache_path): os.remove(cache_path)
    print("wrote", os.path.normpath(OUT), len(out))


if __name__ == "__main__":
    main()
