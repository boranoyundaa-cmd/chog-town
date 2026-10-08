"""Fidelity audit: official art next to the game's 3D head, per token, with the traits underneath.
1. In the running game (python prototype/server.py, open index.html), run in the console:
     for (const id of [1,2,3]) { const b = await (await fetch(portrait(TOKENS[id].traits))).blob(); await fetch('/save?name=cmp_' + id + '.png', { method: 'POST', body: b }); }
2. python tools/compare_portraits.py 1 2 3        -> prototype/shots/compare.png   (needs prototype/data/portraits from fetch_portraits.py)"""
import json, os, sys
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'prototype')
tokens = json.load(open(os.path.join(D, 'data', 'tokens.json'), encoding='utf-8'))['tokens']
ids = sys.argv[1:]
S = 256
COLS = 3
sheet = Image.new('RGB', (S * 2 * COLS, (S + 36) * ((len(ids) + COLS - 1) // COLS)), 'white')
dr = ImageDraw.Draw(sheet)
for i, tid in enumerate(ids):
    x0, y = (i % COLS) * S * 2, (i // COLS) * (S + 36)
    sheet.paste(Image.open(os.path.join(D, 'data', 'portraits', tid + '.webp')).convert('RGB'), (x0, y))
    g = Image.open(os.path.join(D, 'shots', f'cmp_{tid}.png')).convert('RGBA').resize((S, S))
    bg = Image.new('RGB', (S, S), (200, 190, 230)); bg.paste(g, (0, 0), g); sheet.paste(bg, (x0 + S, y))
    t = tokens[tid]['traits']
    dr.text((x0 + 4, y + S + 2), f"#{tid}  " + ' | '.join(f"{k}: {t[k]}" for k in ('Skin', 'Base', 'Body', 'Head', 'Eyes', 'Mouth', 'Aura') if k in t), fill='black')
out = os.path.join(D, 'shots', 'compare.png'); sheet.save(out); print(out)
