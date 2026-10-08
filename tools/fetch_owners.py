"""Snapshot ownerOf for every Chog token id (1..1969) from the Monad RPC into prototype/data/owners.json.

Chain only (no IPFS gateway). The game uses it to find a wallet's Chogs in a few calls instead of scanning 1,969 tokens;
it is verified on-chain and falls back to a scan when the wallet's balance does not match.

Usage: python tools/fetch_owners.py
"""
import json, os, time, urllib.request

RPC, NFT = "https://rpc.monad.xyz", "0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "prototype", "data", "owners.json")
UA = {"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"}


def batch(ids):
    body = json.dumps([{"jsonrpc": "2.0", "id": i, "method": "eth_call", "params": [{"to": NFT, "data": "0x6352211e" + "%064x" % t}, "latest"]} for i, t in enumerate(ids)]).encode()
    for k in range(8):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(RPC, body, UA), timeout=60))
            res = {x["id"]: x.get("result") for x in r}
            if len(res) == len(ids) and all(res.values()): return res
        except Exception:
            pass
        time.sleep(2 * (k + 1))
    raise RuntimeError("rpc failed")


owners = {}
ids = list(range(1, 1970))
for i in range(0, len(ids), 25):
    chunk = ids[i:i + 25]; res = batch(chunk)
    for j, t in enumerate(chunk): owners[t] = "0x" + res[j][-40:]
    time.sleep(0.3)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({"contract": NFT, "block_time": int(time.time()), "owners": {str(k): v for k, v in owners.items()}}, open(OUT, "w"), separators=(",", ":"))
print("wrote", os.path.normpath(OUT), len(owners), "tokens,", len(set(owners.values())), "owners")
