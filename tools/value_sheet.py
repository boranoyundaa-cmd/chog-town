"""One example token per trait value, official art next to the game's 3D head: the way to model EVERY value of a category (docs/project/overview.md, Chog likeness).
  python tools/value_sheet.py list Eyes            -> prints the representative token ids (and fetches a missing portrait)
  (in the running game console, render them:  for (const id of IDS) { const b = await (await fetch(portrait(TOKENS[id].traits))).blob(); await fetch('/save?name=cmp_' + id + '.png', { method: 'POST', body: b }); })
  python tools/value_sheet.py sheet Eyes [page]    -> prototype/shots/values_Eyes_<page>.png  (12 values per page, value name under each pair)
The representative of a value is the token whose other traits are the plainest (Origin base, fewest extras), so the value itself is easy to see."""
import io, json, os, sys, time, urllib.request
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'prototype')
tokens = json.load(open(os.path.join(D, 'data', 'tokens.json'), encoding='utf-8'))['tokens']
raw = json.load(open(os.path.join(D, 'data', 'chogs.json'), encoding='utf-8')); raw = raw.get('tokens', raw)
PER_PAGE = 12

def reps(cat):
    best = {}
    for tid, t in tokens.items():
        v = t['traits'].get(cat)
        if not v: continue
        plain = sum(1 for k in ('Aura', 'Accessory', 'Head') if t['traits'].get(k)) + (0 if t['traits'].get('Base') == 'Origin' else 5) + (0 if t['traits'].get('Naked') != 'Yes' else 1)
        have = os.path.exists(os.path.join(D, 'data', 'portraits', tid + '.webp'))
        key = (plain - (3 if have else 0), int(tid))
        if v not in best or key < best[v][0]: best[v] = (key, tid)
    return sorted(((v, tid) for v, (_, tid) in best.items()), key=lambda x: x[0].lower())

def fetch(tid):
    path = os.path.join(D, 'data', 'portraits', tid + '.webp')
    if os.path.exists(path): return
    for k in range(6):
        try:
            b = urllib.request.urlopen(urllib.request.Request('https://ipfs.filebase.io/ipfs/' + raw[tid]['image'][7:], headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read()
            Image.open(io.BytesIO(b)).convert('RGB').resize((256, 256), Image.LANCZOS).save(path, 'WEBP', quality=78, method=6); return
        except Exception: time.sleep(2)
    print('could not fetch', tid)

cmd, cat = sys.argv[1], sys.argv[2]
r = reps(cat)
if cmd == 'list':
    for _, tid in r: fetch(tid)
    print(len(r), 'values'); print(json.dumps([int(t) for _, t in r]))
else:
    page = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    part = r[page * PER_PAGE:(page + 1) * PER_PAGE]; S = 256; COLS = 3
    sheet = Image.new('RGB', (S * 2 * COLS, (S + 22) * ((len(part) + COLS - 1) // COLS)), 'white'); dr = ImageDraw.Draw(sheet)
    for i, (v, tid) in enumerate(part):
        x0, y = (i % COLS) * S * 2, (i // COLS) * (S + 22)
        sheet.paste(Image.open(os.path.join(D, 'data', 'portraits', tid + '.webp')).convert('RGB'), (x0, y))
        g = Image.open(os.path.join(D, 'shots', f'cmp_{tid}.png')).convert('RGBA').resize((S, S)); bg = Image.new('RGB', (S, S), (200, 190, 230)); bg.paste(g, (0, 0), g); sheet.paste(bg, (x0 + S, y))
        dr.text((x0 + 4, y + S + 4), f'{cat}: {v}   (#{tid})', fill='black')
    out = os.path.join(D, 'shots', f'values_{cat}_{page}.png'); sheet.save(out); print(out, f'{len(part)} of {len(r)} values, page {page}/{(len(r) - 1) // PER_PAGE}')
