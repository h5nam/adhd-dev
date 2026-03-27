#!/usr/bin/env python3
"""Preview all crayfish sprites in terminal with ANSI truecolor halfblock rendering."""
import sys
from PIL import Image
import numpy as np

ASSETS = 'assets/crayfish'

def ansi_fg(r, g, b): return f'\033[38;2;{r};{g};{b}m'
def ansi_bg(r, g, b): return f'\033[48;2;{r};{g};{b}m'
R = '\033[0m'
B = '\033[1m'

def render(img, tw):
    w, h = img.size
    s = tw / w
    nw, nh = tw, int(h * s)
    if nh % 2: nh += 1
    arr = np.array(img.resize((nw, nh), Image.NEAREST))
    lines = []
    for y in range(0, nh, 2):
        l = ''
        for x in range(nw):
            t = arr[y, x]
            b2 = arr[y+1, x] if y+1 < nh else np.array([0,0,0,0])
            tv, bv = t[3] > 128, b2[3] > 128
            if tv and bv:
                l += f'{ansi_fg(t[0],t[1],t[2])}{ansi_bg(b2[0],b2[1],b2[2])}▀{R}'
            elif tv: l += f'{ansi_fg(t[0],t[1],t[2])}▀{R}'
            elif bv: l += f'{ansi_fg(b2[0],b2[1],b2[2])}▄{R}'
            else: l += ' '
        lines.append(l.rstrip())
    while lines and not lines[-1]:
        lines.pop()
    return lines

stages = [
    ('baby',     'Baby Crayfish',    30),
    ('juvenile', 'Juvenile Crayfish', 30),
    ('adult',    'Adult Crayfish',    40),
    ('warrior',  'Warrior Crayfish',  40),
    ('king',     'King Crayfish',     40),
]
states = ['idle', 'working', 'complete', 'sleeping']

# Filter by stage arg if given
filter_stage = sys.argv[1] if len(sys.argv) > 1 else None

for stage, label, w in stages:
    if filter_stage and stage != filter_stage:
        continue
    print(f'\n{B}{"═"*60}{R}')
    print(f'{B}  {label}{R}')
    print(f'{B}{"═"*60}{R}')
    for state in states:
        print(f'\n  {B}[ {state.upper()} ]{R}')
        img = Image.open(f'{ASSETS}/{stage}_{state}.png').convert('RGBA')
        for line in render(img, w):
            print(f'  {line}')
    print()
