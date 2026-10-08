"""Writes server/license_data.json: what the realtime server needs to work out a wallet's venue tier (docs/game/design.md).
Points per token (from the collection's Tier trait) and the tier thresholds come from prototype/data/tokens.json; the owner snapshot only
speeds up the lookup (every token is still verified on chain). Run after build_tokens.py or fetch_owners.py:  python tools/build_license_data.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tok = json.load(open(os.path.join(ROOT, 'prototype', 'data', 'tokens.json'), encoding='utf-8'))
own = json.load(open(os.path.join(ROOT, 'prototype', 'data', 'owners.json'), encoding='utf-8'))
pts = {k: tok['tierPoints'].get((v.get('traits') or {}).get('Tier'), 0) for k, v in tok['tokens'].items()}
out = {'supply': tok['supply'], 'venueTiers': tok['venueTiers'], 'points': pts, 'owners': {k: v.lower() for k, v in own['owners'].items()}, 'ownersAsOf': own.get('block_time', 0)}
json.dump(out, open(os.path.join(ROOT, 'server', 'license_data.json'), 'w'), separators=(',', ':'))
print('server/license_data.json', len(pts), 'tokens,', len(out['owners']), 'owners')
