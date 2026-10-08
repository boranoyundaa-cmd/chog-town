"""Build the token table the game ships: prototype/data/tokens.json (from the full dump chogs.json).

The client loads this file instead of calling IPFS at runtime. It holds each token's name, traits and rarity rank, plus the venue-tier rules:
points per collection `Tier` trait and the point thresholds of venue tiers 1..4 (docs/game/design.md). Points are derived from the Tier trait
on the client, never stored per token, so the rules live in one place (this file's constants -> the header of tokens.json).

Also prints how many wallets in the owner snapshot land in each venue tier, as a check against the design target.

Usage: python tools/build_tokens.py        (needs prototype/data/chogs.json from tools/fetch_chogs.py and owners.json from tools/fetch_owners.py)
"""
import collections, json, os, sys

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "prototype", "data")
SUPPLY = 1969
TIER_POINTS = {"Common": 1, "Uncommon": 1, "Rare": 3, "Epic": 5, "Legendary": 12}   # approved 2026-10-08
VENUE_TIERS = [{"tier": 1, "min": 1}, {"tier": 2, "min": 3}, {"tier": 3, "min": 5}, {"tier": 4, "min": 12}]
EXPECTED = {1: 814, 2: 99, 3: 72, 4: 27}                                            # wallets per venue tier on the 2026-10-07 owner snapshot


def main():
    toks = json.load(open(os.path.join(DATA, "chogs.json"), encoding="utf-8"))["tokens"]
    if len(toks) != SUPPLY or any(str(i) not in toks for i in range(1, SUPPLY + 1)):
        sys.exit(f"chogs.json is incomplete ({len(toks)} of {SUPPLY}); run tools/fetch_chogs.py")
    bad = sorted({t["traits"].get("Tier") for t in toks.values()} - set(TIER_POINTS))
    if bad: sys.exit(f"unknown Tier trait value(s) {bad}: add them to TIER_POINTS")

    cats = sorted({c for t in toks.values() for c in t["traits"]})                  # rarity rank: sum of 1/(share of tokens with that value)
    freq = {c: collections.Counter(t["traits"].get(c, "None") for t in toks.values()) for c in cats}
    score = {k: sum(SUPPLY / freq[c][t["traits"].get(c, "None")] for c in cats) for k, t in toks.items()}
    rank = {k: i for i, k in enumerate(sorted(score, key=lambda k: -score[k]), 1)}

    out = {"version": 1, "supply": SUPPLY, "tierPoints": TIER_POINTS, "venueTiers": VENUE_TIERS,
           "tokens": {str(i): {"name": toks[str(i)]["name"], "traits": toks[str(i)]["traits"], "rank": rank[str(i)]} for i in range(1, SUPPLY + 1)}}
    path = os.path.join(DATA, "tokens.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {os.path.normpath(path)}: {SUPPLY} tokens, {os.path.getsize(path) // 1024} KB (chogs.json is {os.path.getsize(os.path.join(DATA, 'chogs.json')) // 1024} KB)")

    owners = json.load(open(os.path.join(DATA, "owners.json"), encoding="utf-8"))["owners"]
    pts = collections.Counter()
    for k, t in toks.items(): pts[owners[k]] += TIER_POINTS[t["traits"]["Tier"]]
    got = collections.Counter(max((v["tier"] for v in VENUE_TIERS if p >= v["min"]), default=0) for p in pts.values())
    got = {t: got[t] for t in (1, 2, 3, 4)}
    print("wallets per venue tier:", got, "| design target", EXPECTED, "| OK" if got == EXPECTED else "| DIFFERS (owner snapshot older than the target, or rules changed)")


if __name__ == "__main__":
    main()
