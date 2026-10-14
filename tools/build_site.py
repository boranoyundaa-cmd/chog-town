"""Collect the static game into dist/ for hosting (Cloudflare Pages). Run: python tools/build_site.py
Copies only what the page loads: html, css, js, and the small data files. Leaves out screenshots, the dev server and partial dumps."""
import os, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(ROOT, 'prototype'), os.path.join(ROOT, 'dist')

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(os.path.join(OUT, 'data'))
for f in ('index.html', 'gallery.html', 'space.html'):
    shutil.copy(os.path.join(SRC, f), OUT)
for d in ('css', 'js'):
    shutil.copytree(os.path.join(SRC, d), os.path.join(OUT, d), ignore=shutil.ignore_patterns('lineup.js'))
for f in ('owners.json', 'chogs.manual.json', 'tokens.json', 'nft_demo_1700.png', 'shop_items.json'):    # tokens.json: python tools/build_tokens.py; the raw chogs.json dump stays out of the site
    p = os.path.join(SRC, 'data', f)
    if os.path.exists(p):
        shutil.copy(p, os.path.join(OUT, 'data', f))
    else:
        raise SystemExit(f'missing prototype/data/{f}')
pt = os.path.join(SRC, 'data', 'portraits')                                           # official art, one small file per token (tools/fetch_portraits.py); the profile frame uses them
if os.path.isdir(pt): shutil.copytree(pt, os.path.join(OUT, 'data', 'portraits'), ignore=shutil.ignore_patterns('*.tmp'))
else: print('warning: no prototype/data/portraits, holders will see the 3D head in the frame')
with open(os.path.join(OUT, '_headers'), 'w') as h:                                  # short cache so a redeploy shows up quickly
    h.write('/*\n  Cache-Control: public, max-age=300\n  X-Content-Type-Options: nosniff\n/data/portraits/*\n  Cache-Control: public, max-age=86400\n')
total = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(OUT) for f in fs)
print(f'dist/ ready: {sum(len(fs) for _, _, fs in os.walk(OUT))} files, {total/1024:.0f} KB')
