"""Cut the trailer from the frames prototype/trailer_shots.js renders into prototype/shots/ (T<nn>_<shot>_%04d.png plus track.json, where each speaker's head is per frame).
The residents talk in the game's own speech bubbles, Lev in his own dialog box, typed out and stamped; the lines are the game's (prototype/js/culture_data.js).

  python tools/edit_trailer.py spec    -> shots/overlay_spec.json: what the browser draws (prototype/trailer_overlays.html: bubbles, Lev's box per typed letter, the title)
  python tools/edit_trailer.py         -> video/chog_hotel_trailer.mp4 (frames + overlays piped to ffmpeg, music and the game's sound effects mixed under)
"""
import json, os, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SH = os.path.join(ROOT, 'prototype', 'shots')
OUT = os.path.join(ROOT, 'video'); os.makedirs(OUT, exist_ok=True)
FPS, W, H = 30, 1920, 1080
HOLD = 4.3                                        # the last frame holds under the title

# shot, seconds, events: ('say', who, start, text[, small[, end]]) | ('lev', start, text, fade_out_at, voice) | ('vo', start, voice)
# voices: edge-tts (Lev: en-GB-ThomasNeural, the narrator: en-US-ChristopherNeural), pauses shortened; Lev types as fast as he speaks
SHOTS = [
    ('T01_gm', 4.2, [('vo', 0.1, 'vo_n1.wav'), ('say', 'sergm', 0.25, 'gm'), ('say', 'linkmarine', 0.75, 'gm.'), ('say', 'nad', 1.25, 'gmonad.'), ('say', 'memekid', 1.75, 'gm ser'),
                     ('say', 'doombear', 2.7, "It's over.")]),
    ('T02_lev', 9.2, [('lev', 0.3, 'Welcome to Chog Town. New arrivals receive one (1) room. Non-transferable. Non-refundable. Much like my twenties.', None, 'vo_l1.wav')]),
    ('T03_hodler', 6.0, [('say', 'hodler', 0.3, 'I AM HODLING.', None, 2.1), ('say', 'hodler', 2.25, 'I typed it wrong. I knew it was wrong. I kept it wrong. That is conviction.')]),
    ('T04_larry', 5.2, [('say', 'larry', 0.3, "I drew a line. Price touched it. Price touched it again. That's called science.")]),
    ('T05_farmer', 3.6, [('say', 'farmer', 0.3, 'Eight hundred wallets. Zero friends.')]),
    ('T06_degen', 4.6, [('say', 'degen', 0.3, "My liquidation price? Oh, it's close. Emotionally close.")]),
    ('T07_four', 2.6, [('say', 'mrfour', 0.35, '4.', 'X post, Mar 2023')]),
    ('T08_club', 5.0, [('say', 'macro', 0.6, 'Welcome to the banana zone.')]),
    ('T09_rug', 4.4, [('say', 'rugvictim', 0.3, 'I was early. So early I was there before the rug.')]),
    ('T10_night', 5.6, [('say', 'sergm', 3.5, "gm. It's 3 AM. gm.")]),
    ('T11_finale', 6.4, [('lev', 0.35, 'Enjoy your stay. Or do not. The invoice is zero (0) either way.', 5.75, 'vo_l2.wav'), ('vo', 6.15, 'vo_n2.wav')]),
]
MUSIC = {'T08_club': 'club'}                      # every other shot runs on one continuous town theme
TITLE_AT = 6.0                                    # seconds into the last shot

def spec():
    bubbles, levs = [], []
    for name, _d, evs in SHOTS:
        for ev in evs:
            if ev[0] == 'say': bubbles.append({'text': ev[3], 'small': ev[4] if len(ev) > 4 else None})
            elif ev[0] == 'lev': levs.append(ev[2])
    json.dump({'bubbles': bubbles, 'levs': levs}, open(os.path.join(SH, 'overlay_spec.json'), 'w'), indent=1)
    print(len(bubbles), 'bubbles,', len(levs), 'lines for Lev')

if len(sys.argv) > 1 and sys.argv[1] == 'spec': spec(); sys.exit()

track = json.load(open(os.path.join(SH, 'track.json')))
img = {}
def load(name):
    if name not in img: img[name] = Image.open(os.path.join(SH, name)).convert('RGBA')
    return img[name]

def smooth(points, k=3):                          # head positions bob with the walk/idle animation; the bubble should not
    out = []
    for i in range(len(points)):
        win = [p for p in points[max(0, i - k):i + k + 1] if p]
        out.append((sum(p[0] for p in win) / len(win), sum(p[1] for p in win) / len(win)) if win else None)
    return out

def ease_back(u):                                 # the pop: a little overshoot, like the game's .2s transform
    c = 1.7; u -= 1; return 1 + (c + 1) * u ** 3 + c * u ** 2

def paste(frame, im, x, y, scale=1.0, alpha=1.0):
    if scale != 1.0: im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
    if alpha < 1.0: im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v: int(v * alpha)))
    frame.alpha_composite(im, (int(x), int(y)))

# the plan on the global timeline (and the sound effects and voices at their times)
def dur_of(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(SH, f)], capture_output=True, text=True).stdout)
sfx, vox, plan, bi, li, t0 = [], [], [], 0, 0, 0.0
for name, dur, evs in SHOTS:
    d = dur + (HOLD if name == SHOTS[-1][0] else 0)
    ev2 = []
    for ev in evs:
        if ev[0] == 'say':
            end = ev[5] if len(ev) > 5 else d
            ev2.append(('say', ev[1], ev[2], end, f'ov_bubble_{bi}.png')); sfx.append(('chat', t0 + ev[2])); bi += 1
        elif ev[0] == 'lev':
            n, a, voice = len(ev[2]), ev[1], ev[4]; spoken = dur_of(voice); cps = n / spoken
            ev2.append(('lev', li, a, n, a + spoken, ev[3] if ev[3] is not None else d, cps)); sfx.append(('place', t0 + a + spoken + 0.1)); vox.append((voice, t0 + a)); li += 1
        else: vox.append((ev[2], t0 + ev[1]))
    plan.append((name, dur, d, t0, ev2)); t0 += d
TOTAL = t0

def frames():
    black = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    for name, dur, d, start, evs in plan:
        n_src = round(dur * FPS); tr = {k: smooth(v) for k, v in track.get(name, {}).items()}
        for k in range(round(d * FPS)):
            t, ks = k / FPS, min(k, n_src - 1)
            frame = Image.open(os.path.join(SH, f'{name}_{ks + 1:04d}.png')).convert('RGBA')
            for ev in evs:
                if ev[0] == 'say':
                    _, who, a, b, file = ev
                    pts = tr.get(who)
                    if not (a <= t < b) or not pts or not pts[ks]: continue
                    pos, im = pts[ks], load(file)
                    sc = 0.82 + 0.18 * ease_back(min(1, (t - a) / 0.18)); al = min(1, (t - a) / 0.1) * (max(0, min(1, (b - t) / 0.12)) if b < d else 1)
                    w, h = im.width * sc, im.height * sc
                    paste(frame, im, min(max(pos[0] - w / 2, 24), W - 24 - w), pos[1] - 10 - h, sc, al)
                else:
                    _, i, a, n, typed, fade, cps = ev
                    if t < a or t >= fade + 0.35: continue
                    im = load(f'ov_lev_{i}_{"s" if t >= typed else min(n, int((t - a) * cps))}.png')
                    al = min(1, (t - a) / 0.15) * (1 - max(0, min(1, (t - fade) / 0.35)))
                    paste(frame, im, (W - im.width) / 2, H - 70 - im.height + (1 - min(1, (t - a) / 0.2)) * 18, 1.0, al)
            if name == SHOTS[-1][0] and t >= TITLE_AT:
                u = min(1, (t - TITLE_AT) / 0.9)
                frame.alpha_composite(Image.new('RGBA', (W, H), (22, 10, 40, int(110 * u))))
                paste(frame, load('ov_title.png'), 0, 0, 1.0, u)
            g = start + t
            if g < 0.4: frame = Image.blend(black, frame, g / 0.4)
            if TOTAL - g < 0.7: frame = Image.blend(black, frame, max(0, (TOTAL - g) / 0.7))
            yield frame.convert('RGB').tobytes()

# sound: the town theme runs under everything, the club shot cuts to the club's own track; one chat blip per bubble, Lev's stamp
inputs, fl = [], []
def inp(path): inputs.extend(['-i', path]); return len(inputs) // 2   # input 0 is the video pipe
town, club = inp(os.path.join(SH, 'music_town_day_long.webm')), inp(os.path.join(SH, 'music_club_long.webm'))
segs, pos = [], 0.0
for name, _dur, d, _s, _e in plan:
    if MUSIC.get(name) == 'club': segs.append((club, 0.0, d))
    else: segs.append((town, pos, d)); pos += d
for i, (src, o, d) in enumerate(segs):
    fl.append(f'[{src}:a]atrim=start={o:.3f}:duration={d:.3f},asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:d=0.02,afade=t=out:st={d - 0.03:.3f}:d=0.03[m{i}]')
fl.append(''.join(f'[m{i}]' for i in range(len(segs))) + f'concat=n={len(segs)}:v=0:a=1[mus]')
mix = []
for j, (kind, at) in enumerate(sfx):
    s_ = inp(os.path.join(SH, f'sfx_{kind}.webm'))
    fl.append(f'[{s_}:a]atrim=start=0.25:duration=1.2,asetpts=PTS-STARTPTS,aresample=48000,adelay={int(at * 1000)}:all=1,volume={1.4 if kind == "chat" else 1.8}[s{j}]'); mix.append(f'[s{j}]')
for j, (f, at) in enumerate(vox):                          # the voices, and the music ducks under them
    v = inp(os.path.join(SH, f))
    fl.append(f'[{v}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(at * 1000)}:all=1,volume=2.2[v{j}]')
fl.append(''.join(f'[v{j}]' for j in range(len(vox))) + f'amix=inputs={len(vox)}:normalize=0,apad=whole_dur={TOTAL:.3f},asplit=2[vox][key]')
fl.append('[mus]aformat=channel_layouts=stereo[mus2];[mus2][key]sidechaincompress=threshold=0.02:ratio=8:attack=30:release=400:makeup=1[duck]')
fl.append('[duck]' + ''.join(mix) + f'[vox]amix=inputs={len(mix) + 2}:normalize=0:duration=first,loudnorm=I=-15:TP=-1.5:LRA=11,afade=t=in:d=0.4,afade=t=out:st={TOTAL - 0.6:.3f}:d=0.6[aout]')

out = os.path.join(OUT, 'chog_hotel_trailer.mp4')
cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-'] + inputs + [
    '-filter_complex', ';'.join(fl), '-map', '0:v', '-map', '[aout]', '-t', f'{TOTAL:.3f}',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]
print(f'{TOTAL:.1f} s, {len(sfx)} sound effects')
p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for i, f in enumerate(frames()):
    p.stdin.write(f)
    if i % 300 == 0: print('frame', i, flush=True)
p.stdin.close(); p.wait()
print(out if p.returncode == 0 else 'ffmpeg failed')
