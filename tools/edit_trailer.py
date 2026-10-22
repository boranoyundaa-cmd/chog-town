"""Cut the trailer from the frames that prototype/trailer_shots.js renders into prototype/shots/.
Shots crossfade into each other, captions fade in and out, the music follows the place (the game's own synthesized tracks,
recorded from audio_test.html as shots/music_<place>.webm), the last shot holds under the title card.
Run: python tools/edit_trailer.py  ->  video/chog_hotel_trailer.mp4"""
import os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SH = os.path.join(ROOT, 'prototype', 'shots')
OUT = os.path.join(ROOT, 'video'); os.makedirs(OUT, exist_ok=True)
FPS, X, HOLD = 30, 0.4, 3.6                      # frame rate, crossfade length, title hold after the last shot

# name, seconds, caption, music track, offset in the track
SHOTS = [
    ('T1_plaza', 6, 'T1', 'town_day', None),
    ('T2_follow', 5, 'T2', 'town_day', None),
    ('T3_timelapse', 6, 'T3', 'town_day', None),
    ('T4_hotelnight', 4, None, 'town_night', 0),
    ('T5_lobby', 4, 'T5', 'lobby', 0),
    ('T6_cafe', 5, 'T6', 'cafe', 0),
    ('T7_club', 6, 'T7', 'club', 0),
    ('T8_legends', 5, 'T8', 'gallery', 0),
    ('T9_finale', 7, None, 'town_day', 14),
]

import sys
if len(sys.argv) > 1: SHOTS = SHOTS[:int(sys.argv[1])]          # a quick check on the first shots: python tools/edit_trailer.py 1
durs = [d for _, d, *_ in SHOTS]; durs[-1] += HOLD
starts, t = [], 0.0
for d in durs: starts.append(t); t += d - X
total = starts[-1] + durs[-1]

args, fl = ['ffmpeg', '-y', '-hide_banner'], []
for name, *_ in SHOTS: args += ['-framerate', str(FPS), '-i', os.path.join(SH, name + '_%04d.png')]
n = len(SHOTS)
# video: the last shot freezes for the title, then the crossfade chain
for i in range(n):
    pad = f',tpad=stop_mode=clone:stop_duration={HOLD}' if i == n - 1 else ''
    fl.append(f'[{i}:v]fps={FPS},format=yuv420p,setpts=PTS-STARTPTS{pad}[v{i}]')
prev = 'v0'
for i in range(1, n):
    fl.append(f'[{prev}][v{i}]xfade=transition=fade:duration={X}:offset={starts[i]:.3f}[x{i}]'); prev = f'x{i}'
# captions and the title card: still images, faded, laid over at their times
k = n
for i, (_, d, cap, *_r) in enumerate(SHOTS):
    if not cap: continue
    st, du = starts[i] + 0.45, d - 0.45 - 0.5
    args += ['-loop', '1', '-t', f'{du:.3f}', '-i', os.path.join(SH, f'cap_{cap}.png')]
    fl.append(f'[{k}:v]format=rgba,fade=t=in:st=0:d=0.35:alpha=1,fade=t=out:st={du - 0.35:.3f}:d=0.35:alpha=1,setpts=PTS-STARTPTS+{st:.3f}/TB[c{k}]')
    fl.append(f'[{prev}][c{k}]overlay=eof_action=pass[o{k}]'); prev = f'o{k}'; k += 1
tst = starts[-1] + SHOTS[-1][1] - 0.9                     # the title comes in as the last camera move settles
tdu = total - tst
args += ['-loop', '1', '-t', f'{tdu:.3f}', '-i', os.path.join(SH, 'title.png')]
fl.append(f'[{prev}]drawbox=x=0:y=0:w=iw:h=ih:color=0x160a28@0.38:t=fill:enable=\'gte(t,{tst + 0.2:.3f})\'[dim]')
fl.append(f'[{k}:v]format=rgba,fade=t=in:st=0:d=0.8:alpha=1,setpts=PTS-STARTPTS+{tst:.3f}/TB[tt]')
fl.append(f'[dim][tt]overlay=eof_action=pass,fade=t=out:st={total - 0.6:.3f}:d=0.6[vout]'); k += 1
# music: one slice per shot from its place's track (consecutive shots on one track continue where the last left off), crossfaded like the picture
uses = {}
for i, (*_x, tr, _o) in enumerate(SHOTS): uses.setdefault(tr, []).append(i)
src = {}                                                  # shot -> the stream label it trims from (a track used by several shots is split)
for tr, ids in uses.items():
    args += ['-i', os.path.join(SH, f'music_{tr}.webm')]
    if len(ids) == 1: src[ids[0]] = f'{k}:a'
    else:
        fl.append(f'[{k}:a]asplit={len(ids)}' + ''.join(f'[m{i}]' for i in ids))
        for i in ids: src[i] = f'm{i}'
    k += 1
pos = {}
for i, (_, d, _c, tr, off) in enumerate(SHOTS):
    o = off if off is not None else pos.get(tr, 0.0)
    fl.append(f'[{src[i]}]atrim=start={o:.3f}:duration={durs[i]:.3f},asetpts=PTS-STARTPTS,aresample=48000[a{i}]')
    pos[tr] = o + durs[i] - X
prev = 'a0'
for i in range(1, n):
    fl.append(f'[{prev}][a{i}]acrossfade=d={X}:c1=tri:c2=tri[ac{i}]'); prev = f'ac{i}'
fl.append(f'[{prev}]loudnorm=I=-15:TP=-1.5:LRA=11,afade=t=in:d=0.6,afade=t=out:st={total - 2.5:.3f}:d=2.5[aout]')

out = os.path.join(OUT, 'chog_hotel_trailer.mp4' if len(sys.argv) < 2 else 'trailer_check.mp4')
args += ['-filter_complex', ';'.join(fl), '-map', '[vout]', '-map', '[aout]', '-t', f'{total:.3f}',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', str(FPS),
         '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]
print(f'{total:.1f} s')
subprocess.run(args, check=True)
print(out)
