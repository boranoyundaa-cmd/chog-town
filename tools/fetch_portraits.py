"""Downloads the official art of every Chog and stores a small portrait per token: prototype/data/portraits/<tokenId>.webp (256 px, about 10 KB).
The game shows a holder's own NFT in the profile frame from these files, so the page never calls IPFS at runtime (docs/engineering/prototype.md, gateways).
Source: image URIs in prototype/data/chogs.json (Filebase gateway; Pinata's free gateway bans after ~250 requests). Resumable: existing files are skipped.
Run:  python tools/fetch_portraits.py [--size 256]"""
import io, json, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'prototype', 'data', 'portraits')
GATEWAY = 'https://ipfs.filebase.io/ipfs/'
SIZE = int(sys.argv[sys.argv.index('--size') + 1]) if '--size' in sys.argv else 256
os.makedirs(OUT, exist_ok=True)
tokens = json.load(open(os.path.join(ROOT, 'prototype', 'data', 'chogs.json'), encoding='utf-8'))
tokens = tokens.get('tokens', tokens)

def one(tid):
    path = os.path.join(OUT, f'{tid}.webp')
    if os.path.exists(path): return tid, 'have'
    uri = tokens[tid]['image']
    for k in range(5):
        try:
            req = urllib.request.Request(GATEWAY + uri[len('ipfs://'):], headers={'User-Agent': 'Mozilla/5.0'})
            im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=40).read())).convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
            im.save(path + '.tmp', 'WEBP', quality=78, method=6); os.replace(path + '.tmp', path); return tid, 'ok'
        except Exception as e:
            time.sleep(1.5 * (k + 1)); err = str(e)
    return tid, 'FAIL ' + err

ids = [k for k in tokens if k.isdigit()]
done = fail = 0
with ThreadPoolExecutor(20) as ex:
    for tid, st in ex.map(one, ids):
        done += 1
        if st.startswith('FAIL'): fail += 1; print(tid, st, flush=True)
        if done % 100 == 0: print(done, '/', len(ids), 'fails', fail, flush=True)
print('done', done, 'fails', fail, 'size MB', round(sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) / 1e6, 1))
