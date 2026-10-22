"""Cut the trailer: the shots tools/trailer_capture.js renders (prototype/shots/V<nn>_<name>_%04d.png), hard cuts on the music's hits,
the narrator (video/vo/vo_<nn>.mp3) on each line, the line as a caption word by word, the title card on the last hit.

  python tools/edit_trailer3.py spec   -> prototype/shots/cap_spec.json, then: node tools/cdp.js tools/trailer_captions_job.js (caption and title PNGs)
  python tools/edit_trailer3.py        -> video/chog_hotel_trailer.mp4
"""
import json, os, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SH = os.path.join(ROOT, 'prototype', 'shots')
VO = os.path.join(ROOT, 'video', 'vo')
MUSIC = os.path.join(ROOT, 'video', 'music', 'comedy_tension_trailer.mp3')   # Pixabay, "Comedy Tension Trailer (Major)": 92.3 BPM, hits measured below
OUT = os.path.join(ROOT, 'video', 'chog_hotel_trailer.mp4')
FPS, W, H, TOTAL = 30, 1920, 1080, 60.0

# shot, cut-in time on the music (each runs to the next one's)
CUTS = [('V01_open', 0.0), ('V02_street', 5.21), ('V03_rise', 8.48), ('V04_lev', 13.05), ('V05a_decor', 17.61), ('V05b_lock', 18.92), ('V05c_party', 20.22), ('V06_locals', 23.48),
        ('V07_great', 28.05), ('V08_notgreat', 30.0), ('V09_club', 31.97), ('V10_stack', 35.88), ('V11_rhythm', 37.26), ('V12_rps', 38.64),
        ('V13_c4', 40.02), ('V14_hodler', 41.4), ('V15_jeet', 42.71), ('V16_doom', 44.01), ('V17_timelapse', 45.32), ('V17b_phone', 49.88), ('V18_finale', 53.48, 1.3)]   # (shot, cut-in, seconds skipped into the shot)
TITLE_AT = 57.06                                   # the last hit

# narrator line: file, start, caption (*accent*), where the caption sits (bottom unless the game's own box is there), caption ends at
LINES = [
    ('vo_01', 0.7, 'In a town where everyone is *early*...', 'bottom', 5.21),
    ('vo_02', 5.45, '...and nobody is *selling*...', 'bottom', 8.48),
    ('vo_03', 9.0, '...one hotel *welcomes them all.*', 'bottom', 13.05),
    ('vo_04', 13.4, 'Every wallet gets a *room.*', 'top', 17.61),
    ('vo_05@0:1.05', 17.68, '*Decorate* it.', 'bottom', 18.92),            # one line, three shots: each sentence on its own cut
    ('vo_05@1.1:2.0', 19.15, '*Lock* it.', 'bottom', 20.22),
    ('vo_05@2.0:', 20.35, 'Throw a *party* in it.', 'bottom', 23.48),
    ('vo_06', 23.7, 'Meet the *locals.*', 'bottom', 28.05),
    ('vo_07', 28.1, 'Some of them are doing *great.*', 'bottom', 30.0),
    ('vo_08', 30.15, 'Some are *not.*', 'bottom', 31.97),
    ('vo_09', 32.3, 'Host the *party.*', 'bottom', 35.88),
    ('vo_10', 36.0, 'Seven games. Daily boards. *Bragging rights.*', 'top', 41.4),
    ('vo_11', 41.6, '*Crypto Twitter*... as a town.', 'bottom', 47.28),
    ('vo_12', 45.5, 'Open 24/7. *Just like the market.*', 'bottom', 49.88),
    ('vo_15', 49.95, "Logged off?|*Your room isn't.*", 'left', 53.48),     # the phone companion (m.html): the game is on the PC, the phone keeps you in it
    ('vo_13', 57.25, None, None, None),            # "Chog Hotel. Check in." over the title card
]

TIGHT = {}                  # a pause cut out of a line (seconds into the file), so it fits its shot
SPOKEN = {'24/7.': 'twenty-four seven.'}          # how a caption word is said, for its timing

def voice(f):                                      # the line's audio file: 'name@a:b' is a piece of it (seconds), TIGHT cuts a pause out; made once
    if '@' in f:
        name, rng = f.split('@'); a, b = rng.split(':'); src = os.path.join(VO, name + '.mp3')
        out = os.path.join(VO, 'tight', f'{name}_{a}_{b or "end"}.wav'); os.makedirs(os.path.dirname(out), exist_ok=True)
        if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(src):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', f'atrim=start={a}' + (f':end={b}' if b else '') + ',asetpts=PTS-STARTPTS,afade=t=in:d=0.02', out], check=True)
        return out
    src = os.path.join(VO, f + '.mp3')
    if f not in TIGHT: return src
    a, b = TIGHT[f]; out = os.path.join(VO, 'tight', f + '.wav'); os.makedirs(os.path.dirname(out), exist_ok=True)
    if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(src):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter_complex', f'[0:a]atrim=0:{a},asetpts=PTS-STARTPTS[x];[0:a]atrim={b},asetpts=PTS-STARTPTS[y];[x][y]concat=n=2:v=0:a=1', out], check=True)
    return out

def speech(f, gap=0.12):                          # where the narrator is talking: [(start, end)] in seconds, pauses of at least gap between them
    import numpy as np
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).astype(float) / 32768; hop = 160
    on = [20 * np.log10(np.sqrt(np.mean(x[i:i + hop] ** 2) + 1e-12)) > -38 for i in range(0, len(x) - hop, hop)]
    out = []
    for i, v in enumerate(on):
        if not v: continue
        t = i * 0.01
        if out and t - out[-1][1] < gap: out[-1][1] = t + 0.01
        else: out.append([t, t + 0.01])
    return [s for s in out if s[1] - s[0] > 0.04]

def dur_of(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)

if len(sys.argv) > 1 and sys.argv[1] == 'spec':
    caps = [{'i': i, 'text': t, 'place': p} for i, (_f, _a, t, p, _e) in enumerate(LINES) if t]
    json.dump(caps, open(os.path.join(SH, 'cap_spec.json'), 'w'), indent=1); print(len(caps), 'captions'); sys.exit()

def ease_back(u):
    c = 1.7; u -= 1; return 1 + (c + 1) * u ** 3 + c * u ** 2

img = {}
def load(name):
    if name not in img: img[name] = Image.open(os.path.join(SH, name)).convert('RGBA')
    return img[name]

def cropped(name, box_of=None):                   # an overlay cut to its own box (box_of: share another image's box, so a line keeps its place as words appear)
    key = (name, box_of)
    if key not in img:
        im = load(name); box = load(box_of or name).getbbox(); img[key] = (im.crop(box), box)
    return img[key]

def put(frame, name, scale=1.0, alpha=1.0, box_of=None):   # scaled about its own centre
    im, (x0, y0, x1, y1) = cropped(name, box_of)
    if scale != 1.0: im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BILINEAR)
    if alpha < 1.0: im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v: int(v * alpha)))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    frame.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))

# words appear as the narrator says them: the line's sentences go to its longest pauses, words within a sentence by their letters as spoken
caps = []
for i, (f, a, text, place, end) in enumerate(LINES):
    if not text: continue
    ws = text.replace('*', '').replace('|', ' ').split(' '); segs = speech(voice(f))
    groups, cur = [], []
    for w in ws:
        cur.append(w)
        if w[-1] in '.?!' and w != ws[-1]: groups.append(cur); cur = []
    if cur: groups.append(cur)
    gaps = sorted(range(len(segs) - 1), key=lambda j: segs[j][0] - segs[j + 1][0])[:len(groups) - 1]   # widest pauses first
    cuts = sorted(gaps); spans, s0 = [], 0
    for j in cuts + [len(segs) - 1]: spans.append((segs[s0][0], segs[j][1])); s0 = j + 1
    while len(spans) < len(groups): spans.append(spans[-1])
    at = []
    for gw, (g0, g1) in zip(groups, spans):
        n = sum(len(SPOKEN.get(w, w)) for w in gw); acc = 0
        for w in gw: at.append(a + g0 + (g1 - g0) * 0.9 * acc / n); acc += len(SPOKEN.get(w, w))
    caps.append((i, a, end, at, place))

counts = {c[0]: len([f for f in os.listdir(SH) if f.startswith(c[0] + '_') and f.endswith('.png')]) for c in CUTS}
start_f = [round(c[1] * FPS) for c in CUTS]          # each shot's first frame on the timeline, counted once (a half-frame cut-in made frames repeat and skip)

# the phone shot: the companion's screen (m.html) in a phone on the right, the town it left behind blurring away (the time-lapse's last frame), the line on the left
PHONE = {}
def phone_frame(idx, t):
    from PIL import ImageDraw, ImageFilter
    if not PHONE:
        last = sorted(f for f in os.listdir(SH) if f.startswith('V17_timelapse_') and f.endswith('.png'))[-1]
        PHONE['bg0'] = Image.open(os.path.join(SH, last)).convert('RGBA')
        PHONE['bg1'] = Image.blend(PHONE['bg0'].filter(ImageFilter.GaussianBlur(18)), Image.new('RGBA', (W, H), (22, 10, 40, 255)), 0.4)
        sh_ = 940; sw_ = round(sh_ * 860 / 1864); PHONE['size'] = (sw_, sh_)
        m = Image.new('L', (sw_, sh_), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, sw_ - 1, sh_ - 1), 54, fill=255); PHONE['mask'] = m
        b = 14; body = Image.new('RGBA', (sw_ + 2 * b, sh_ + 2 * b), (0, 0, 0, 0)); d = ImageDraw.Draw(body)
        d.rounded_rectangle((0, 0, body.width - 1, body.height - 1), 66, fill=(16, 9, 30, 255), outline=(150, 120, 210, 255), width=3)
        sha = Image.new('RGBA', (body.width + 160, body.height + 160), (0, 0, 0, 0)); ImageDraw.Draw(sha).rounded_rectangle((80, 110, 80 + body.width, 110 + body.height), 66, fill=(8, 3, 18, 170))
        PHONE['body'], PHONE['shadow'], PHONE['b'] = body, sha.filter(ImageFilter.GaussianBlur(36)), b
    k = min(1, t / 0.35); k = k * k * (3 - 2 * k)                       # the town blurs out as the phone comes in
    bg = Image.blend(PHONE['bg0'], PHONE['bg1'], k) if k < 1 else PHONE['bg1']
    z = 1.0 + 0.025 * t; bw, bh = int(W * z), int(H * z)
    frame = bg.resize((bw, bh), Image.BILINEAR).crop(((bw - W) // 2, (bh - H) // 2, (bw - W) // 2 + W, (bh - H) // 2 + H))
    u = min(1, t / 0.6); e = 1 - (1 - u) ** 3                          # ease out, no bounce
    sc = 0.94 + 0.06 * e + 0.012 * t                                   # and it keeps drifting closer
    scr = Image.open(os.path.join(SH, f'V17b_phone_{idx + 1:04d}.png')).convert('RGBA').resize(PHONE['size'], Image.LANCZOS); scr.putalpha(PHONE['mask'])
    ph = PHONE['body'].copy(); ph.alpha_composite(scr, (PHONE['b'], PHONE['b']))
    ph = ph.resize((int(ph.width * sc), int(ph.height * sc)), Image.LANCZOS); shd = PHONE['shadow'].resize((int(PHONE['shadow'].width * sc), int(PHONE['shadow'].height * sc)), Image.BILINEAR)
    al = min(1, t / 0.3)
    if al < 1:
        for im in (ph, shd): im.putalpha(im.getchannel('A').point(lambda v: int(v * al)))
    cx, cy = 1330, H / 2 + (1 - e) * 120
    frame.alpha_composite(shd, (int(cx - shd.width / 2), max(0, int(cy - shd.height / 2 + 20 * sc))))
    frame.alpha_composite(ph, (int(cx - ph.width / 2), max(0, int(cy - ph.height / 2))))
    return frame

def frames():
    black = Image.new('RGBA', (W, H), (0, 0, 0, 255)); shade = Image.new('RGBA', (W, H), (22, 10, 40, 255))
    for g in range(round(TOTAL * FPS)):
        t = g / FPS
        k = max(j for j in range(len(CUTS)) if start_f[j] <= g); name, s = CUTS[k][0], CUTS[k][1]; skip = round((CUTS[k][2] if len(CUTS[k]) > 2 else 0) * FPS)
        idx = min(g - start_f[k] + skip, counts[name] - 1)
        if name == 'V17b_phone': frame = phone_frame(idx, t - s)
        else: frame = Image.open(os.path.join(SH, f'{name}_{idx + 1:04d}.png')).convert('RGBA')
        for i, a, end, at, place in caps:
            if not (a <= t < end): continue
            shown = sum(1 for x in at if x <= t)
            if not shown: continue
            u = min(1, (t - a) / 0.22)
            put(frame, f'cap_{i}_{shown}.png', 0.9 + 0.1 * ease_back(u), min(1, (t - a) / 0.1), f'cap_{i}_{len(at)}.png')   # leaves with the shot on the hard cut
        if t >= TITLE_AT:
            u = min(1, (t - TITLE_AT) / 0.25)
            frame = Image.blend(frame, shade, 0.55 * u)
            put(frame, 'cap_title.png', 1.25 - 0.25 * ease_back(min(1, (t - TITLE_AT) / 0.35)), u)
        if t < 0.35: frame = Image.blend(black, frame, t / 0.35)
        if TOTAL - t < 0.6: frame = Image.blend(black, frame, max(0, (TOTAL - t) / 0.6))
        yield frame.convert('RGB').tobytes()

# sound: the track at full length, ducked a little under the narrator
inputs, fl = ['-i', MUSIC], []
for j, (f, a, *_r) in enumerate(LINES):
    inputs += ['-i', voice(f)]
    fl.append(f'[{j + 2}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(a * 1000)}:all=1,volume=1.6[v{j}]')
fl.append(''.join(f'[v{j}]' for j in range(len(LINES))) + f'amix=inputs={len(LINES)}:normalize=0,apad=whole_dur={TOTAL:.3f},asplit=2[vox][key]')
fl.append(f'[1:a]atrim=0:{TOTAL:.3f},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo[mus];[mus][key]sidechaincompress=threshold=0.03:ratio=4:attack=20:release=350:makeup=1[duck]')
fl.append(f'[duck][vox]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st={TOTAL - 0.6:.3f}:d=0.6[aout]')

cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-'] + inputs + [
    '-filter_complex', ';'.join(fl), '-map', '0:v', '-map', '[aout]', '-t', f'{TOTAL:.3f}',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for i, fr in enumerate(frames()):
    p.stdin.write(fr)
    if i % 300 == 0: print('frame', i, flush=True)
p.stdin.close(); p.wait()
print(OUT if p.returncode == 0 else 'ffmpeg failed')
