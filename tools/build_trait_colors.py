"""Reads the colour of every Head and Body trait value from the official art, so the 3D Chog wears the right colours (prototype/data/trait_colors.json).
The art of a trait value looks the same on every token, only the background differs, so for each value we gather the pixels of the hat zone (top of the picture) or the
clothes zone (bottom) from all tokens that carry it and take the most common colour that is not outline, face cream or a lone background.
Needs prototype/data/portraits (tools/fetch_portraits.py). Run:  python tools/build_trait_colors.py"""
import colorsys, json, os
from collections import Counter, defaultdict
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'prototype', 'data')
tokens = json.load(open(os.path.join(D, 'tokens.json'), encoding='utf-8'))['tokens']
ZONES = {'Head': (50, 4, 206, 64), 'Body': (40, 214, 216, 256)}     # x0, y0, x1, y1 on the 256 px portrait
Q = 24                                                               # colour bins per channel step (256 / 24)
CREAM = (253, 243, 204)

def bin_of(r, g, b): return (r // Q, g // Q, b // Q)
def usable(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if l < 0.16: return False                                        # the ink outline
    if abs(r - CREAM[0]) + abs(g - CREAM[1]) + abs(b - CREAM[2]) < 60: return False   # the face
    return True

hist = {k: defaultdict(Counter) for k in ZONES}                     # kind -> value -> bin -> pixels
sums = {k: defaultdict(lambda: defaultdict(lambda: [0, 0, 0, 0])) for k in ZONES}
n_tok = Counter()
for tid, t in tokens.items():
    path = os.path.join(D, 'portraits', tid + '.webp')
    if not os.path.exists(path): continue
    im = Image.open(path).convert('RGB')
    for kind, box in ZONES.items():
        val = t['traits'].get(kind)
        if not val or (kind == 'Body' and t['traits'].get('Naked') == 'Yes'): continue
        n_tok[(kind, val)] += 1
        px = im.crop(box).resize((26, 8)).getdata()
        for r, g, b in px:
            if not usable(r, g, b): continue
            k = bin_of(r, g, b); hist[kind][val][k] += 1; s = sums[kind][val][k]; s[0] += r; s[1] += g; s[2] += b; s[3] += 1

out = {'Head': {}, 'Body': {}, '_n': {}}
for kind in ZONES:
    for val, c in hist[kind].items():
        if n_tok[(kind, val)] < 3: continue                          # too few examples to tell the clothes from the background
        # a bin counts when many different tokens put pixels there (the background changes from token to token, the clothes do not): use the most common bin
        k, cnt = c.most_common(1)[0]; r, g, b, n = sums[kind][val][k]
        out[kind][val] = '#%02x%02x%02x' % (round(r / n), round(g / n), round(b / n)); out['_n'][kind + ':' + val] = n_tok[(kind, val)]
json.dump(out, open(os.path.join(D, 'trait_colors.json'), 'w'), indent=0)
print({k: len(v) for k, v in out.items() if k != '_n'}, 'tokens used:', sum(1 for tid in tokens if os.path.exists(os.path.join(D, 'portraits', tid + '.webp'))))
