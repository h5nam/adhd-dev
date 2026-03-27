#!/usr/bin/env python3
"""Animated preview of crayfish sprites with pixel-level distortion. Ctrl+C to exit."""
import sys, os, time, math
from PIL import Image
import numpy as np

ASSETS = os.path.join(os.path.dirname(__file__), '..', 'assets', 'crayfish')

def ansi_fg(r,g,b): return f'\033[38;2;{r};{g};{b}m'
def ansi_bg(r,g,b): return f'\033[48;2;{r};{g};{b}m'
R = '\033[0m'; B = '\033[1m'; DIM = '\033[2m'
HIDE = '\033[?25l'; SHOW = '\033[?25h'; HOME = '\033[H'; CLEAR = '\033[2J'

SPARKLES = ['✨', '·', '★', '⭐', '✦', '•', '∗']
ZZZ = ['  z', ' zZ', 'zZZ', ' zZ']
NUM_FRAMES = 8

def distort(arr, state, frame):
    h, w = arr.shape[:2]
    result = np.zeros_like(arr)
    phase = (frame / NUM_FRAMES) * 2 * math.pi
    if state == 'idle':
        for y in range(h):
            weight = max(0, 1.0 - y / h)
            dx = int(math.sin(phase + y * 0.15) * 2 * weight)
            for x in range(w):
                sx = x - dx
                if 0 <= sx < w: result[y, x] = arr[y, sx]
    elif state == 'working':
        bounce_dy = int(math.sin(phase) * 2)
        for y in range(h):
            amp = 1.5 + math.sin(y * 0.2) * 0.5
            dx = int(math.sin(phase + y * 0.25) * amp)
            sy = y - bounce_dy
            for x in range(w):
                sx = x - dx
                if 0 <= sx < w and 0 <= sy < h: result[y, x] = arr[sy, sx]
    elif state == 'complete':
        scale = 1.0 + math.sin(phase) * 0.04
        cy, cx = h / 2, w / 2
        for y in range(h):
            for x in range(w):
                sy = int(cy + (y - cy) / scale)
                sx = int(cx + (x - cx) / scale)
                if 0 <= sy < h and 0 <= sx < w: result[y, x] = arr[sy, sx]
    elif state == 'sleeping':
        breath = 1.0 + math.sin(phase) * 0.03
        for y in range(h):
            sy = int(h - (h - y) * breath)
            dx = int(math.sin(phase * 0.5 + y * 0.05))
            for x in range(w):
                sx = x - dx
                if 0 <= sy < h and 0 <= sx < w: result[y, x] = arr[sy, sx]
    return result

def render_halfblock(arr, tw):
    img = Image.fromarray(arr)
    w, h = img.size; s = tw / w; nw, nh = tw, int(h * s)
    if nh % 2: nh += 1
    arr2 = np.array(img.resize((nw, nh), Image.NEAREST))
    lines = []
    for y in range(0, nh, 2):
        l = ''
        for x in range(nw):
            t = arr2[y, x]; b2 = arr2[y+1, x] if y+1 < nh else np.array([0,0,0,0])
            tv, bv = t[3] > 128, b2[3] > 128
            if tv and bv: l += f'{ansi_fg(t[0],t[1],t[2])}{ansi_bg(b2[0],b2[1],b2[2])}▀{R}'
            elif tv: l += f'{ansi_fg(t[0],t[1],t[2])}▀{R}'
            elif bv: l += f'{ansi_fg(b2[0],b2[1],b2[2])}▄{R}'
            else: l += ' '
        lines.append(l.rstrip())
    while lines and not lines[-1]: lines.pop()
    return lines

def add_effects(lines, state, frame):
    result = list(lines)
    if state == 'complete':
        sp = SPARKLES[frame % len(SPARKLES)]
        sp2 = SPARKLES[(frame + 3) % len(SPARKLES)]
        off = (frame * 7) % 12 + 2
        result.insert(0, ' ' * off + f'\033[33m{sp}{R}   \033[33m{sp2}{R}')
        w2 = (frame * 5) % 10 + 1
        result.append(' ' * w2 + f'\033[33m{SPARKLES[(frame+1) % len(SPARKLES)]}{R}    \033[33m{sp}{R}')
    elif state == 'sleeping':
        zzz = ZZZ[(frame // 2) % len(ZZZ)]
        ti = next((i for i, l in enumerate(result) if l.strip()), 0)
        result[ti] = result[ti] + f'  {DIM}{zzz}{R}'
    return result

# Parse args
stage_filter = sys.argv[1] if len(sys.argv) > 1 else 'king'
state_filter = sys.argv[2] if len(sys.argv) > 2 else None

stage_list = [
    ('baby',     'Baby',    30),
    ('juvenile', 'Juvenile', 30),
    ('adult',    'Adult',    40),
    ('warrior',  'Warrior',  40),
    ('king',     'King',     40),
]
state_list = ['idle', 'working', 'complete', 'sleeping']
if state_filter: state_list = [state_filter]

# Load source images
sources = {}
for stage, label, w in stage_list:
    if stage_filter != 'all' and stage != stage_filter: continue
    for state in state_list:
        img = Image.open(os.path.join(ASSETS, f'{stage}_{state}.png')).convert('RGBA')
        sources[(stage, state)] = (np.array(img), label, w)

if not sources:
    print(f"Usage: python3 preview-animated.py [baby|juvenile|adult|warrior|king|all] [idle|working|complete|sleeping]")
    sys.exit(1)

MAX_H = 22
print(HIDE + CLEAR, end='')
try:
    frame = 0
    while True:
        out = HOME
        out += f'{B}  Crayfish Pixel Animation{R} (frame {frame})  Ctrl+C to exit\n\n'
        for (stage, state), (arr, label, tw) in sources.items():
            d = distort(arr, state, frame % NUM_FRAMES)
            lines = render_halfblock(d, tw)
            lines = add_effects(lines, state, frame)
            out += f'  {B}{label} - {state}{R}\n'
            for line in lines[:MAX_H]:
                out += f'    {line}\n'
            for _ in range(MAX_H - min(len(lines), MAX_H)):
                out += '\n'
            out += '\n'
        print(out, end='', flush=True)
        frame += 1
        time.sleep(0.3)
except KeyboardInterrupt:
    print(SHOW + CLEAR + HOME, end='')
    print("Done!")
