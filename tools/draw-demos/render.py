"""Draw two-frame demo illustrations (start / end position) for the KPR
Fitness exercises that have no photo demo, plus a thumbnail.

A figure is posed by segment directions in degrees: 0 = straight down,
90 = forward (right), 180 = up, -90 = back (left); poses are in poses.py.
Each exercise is scaled to fill the frame. Writes, for each exercise:
  demos/<id>/0.jpg, 1.jpg   480x320, start and end position
  demos/<id>/t.jpg          144x96 thumbnail, cropped to the figure

    python3 tools/draw-demos/render.py demos            # all
    python3 tools/draw-demos/render.py demos burpee     # one
"""
import math, os, sys
from PIL import Image, ImageDraw

W, H, SS = 480, 320, 3          # output size, supersampling
GROUND = 296
BASE = dict(torso=60, neck=7, head=12, upper=29, fore=27, thigh=40, shin=39, foot=12)
BG, FLOOR, MAT = (238, 242, 247), (221, 227, 236), (186, 225, 214)
NEAR, FAR = (11, 110, 92), (95, 180, 160)
PROP, PROP2, BALL = (120, 132, 150), (160, 170, 186), (240, 150, 60)
THUMB_BG = (214, 238, 231)
MAX_K = 1.55

def seg(p, a, n):
    r = math.radians(a)
    return (p[0] + n * math.sin(r), p[1] + n * math.cos(r))

def pose_points(P, k):
    """Joint positions (scaled by k) with the hip at (0, 0) plus any shift."""
    L = {n: v * k for n, v in BASE.items()}
    front = P.get('front', False)
    hip = (0.0, 0.0)
    sh = seg(hip, P.get('torso', 180), L['torso'])
    hd = P.get('head', P.get('torso', 180))
    neck = seg(sh, hd, L['neck'])
    head = seg(neck, hd, L['head'])
    arms, legs = [], []
    for i, (u, f) in enumerate(P.get('arms', [(0, 0), (0, 0)])):
        s = sh if not front else (sh[0] + (17 * k if i == 0 else -17 * k), sh[1] + 3 * k)
        e = seg(s, u, L['upper']); h = seg(e, f, L['fore'])
        arms.append((s, e, h))
    for i, lg in enumerate(P.get('legs', [(0, 0, 90), (0, 0, 90)])):
        t, s_, ft = lg if len(lg) == 3 else (lg[0], lg[1], 90)
        hp = hip if not front else (hip[0] + (10 * k if i == 0 else -10 * k), hip[1])
        kn = seg(hp, t, L['thigh']); a = seg(kn, s_, L['shin']); toe = seg(a, ft, L['foot'])
        legs.append((hp, kn, a, toe))
    ox, oy = P.get('shift', (0, 0))
    mv = lambda q: (q[0] + ox * k, q[1] + oy * k)
    return dict(hip=mv(hip), sh=mv(sh), neck=mv(neck), head=mv(head), r=L['head'],
                arms=[tuple(mv(q) for q in a) for a in arms], legs=[tuple(mv(q) for q in l) for l in legs], front=front)

def body_pts(pt):
    r = pt['r']
    out = [pt['hip'], pt['sh'], pt['neck'], (pt['head'][0] - r, pt['head'][1] - r), (pt['head'][0] + r, pt['head'][1] + r)]
    for a in pt['arms']: out += list(a)
    for l in pt['legs']: out += list(l)
    return out

def ground_y(P, pt, k):
    """Where the floor is, in figure coordinates (before the frame offset)."""
    if P.get('rest_y') is not None:
        return P['rest_y'] * k
    return max(p[1] for p in body_pts(pt)) + P.get('air', 0) * k

def draw_frame(P, k, dx, pt):
    """One frame. Figure coordinates map to the image by (x + dx, y + dy)."""
    dy = GROUND - ground_y(P, pt, k)
    img = Image.new('RGB', (W * SS, H * SS), BG)
    d = ImageDraw.Draw(img)
    S = lambda p: ((p[0] + dx) * SS, (p[1] + dy) * SS)
    gy = GROUND - dy                      # the floor, in figure coordinates
    lw = lambda n: max(1, int(n * k * SS))
    d.rectangle([0, GROUND * SS, W * SS, H * SS], fill=FLOOR)
    pts = body_pts(pt)
    for pr in P.get('props', []):
        kind, a = pr[0], [v * k for v in pr[1:]]
        if kind == 'mat':
            xs = [p[0] for p in pts]
            d.rounded_rectangle([S((min(xs) - 18 * k, gy - 5 * k)), S((max(xs) + 18 * k, gy + 3 * k))], radius=4 * k * SS, fill=MAT)
        elif kind == 'wall':
            d.rectangle([S((a[0], gy - 260 * k)), S((a[0] + 10 * k, gy))], fill=PROP2)
        elif kind == 'bar':
            x0, x1, y = a
            d.line([S((x0, y)), S((x1, y))], fill=PROP, width=lw(7))
            for x in (x0, x1): d.line([S((x, y)), S((x, y - 40 * k))], fill=PROP2, width=lw(5))
        elif kind == 'box':
            x, y, w, h = a
            d.rounded_rectangle([S((x, y)), S((x + w, y + h))], radius=3 * k * SS, fill=PROP2)
        elif kind == 'bench':
            x0, x1, y = a
            d.rounded_rectangle([S((x0, y)), S((x1, y + 9 * k))], radius=3 * k * SS, fill=PROP)
            for x in (x0 + 12 * k, x1 - 12 * k): d.line([S((x, y + 9 * k)), S((x, gy))], fill=PROP2, width=lw(5))
        elif kind == 'bike':
            hp = pt['hip']
            seat = (hp[0] - 4 * k, hp[1] + 10 * k)
            d.line([S((seat[0] - 12 * k, seat[1])), S((seat[0] + 12 * k, seat[1]))], fill=PROP, width=lw(6))
            d.line([S(seat), S((seat[0] + 10 * k, gy))], fill=PROP, width=lw(6))
            fan = (hp[0] + 82 * k, gy - 34 * k); r = 32 * k
            d.ellipse([S((fan[0] - r, fan[1] - r)), S((fan[0] + r, fan[1] + r))], outline=PROP, width=lw(5))
            d.line([S((seat[0] + 10 * k, seat[1] + 40 * k)), S(fan)], fill=PROP, width=lw(6))
            d.line([S(fan), S((fan[0] - 18 * k, fan[1] - 70 * k))], fill=PROP, width=lw(5))
        elif kind == 'water':
            y = a[0]
            d.rectangle([0, (y + dy) * SS, W * SS, H * SS], fill=(214, 232, 245))
            d.line([((x) * SS, (y + dy + 4 * math.sin(x / 14)) * SS) for x in range(0, W + 1, 6)], fill=(150, 190, 225), width=lw(3))
    limb_w = 8.5 * k
    def limb(chain, col):
        ps = [S(p) for p in chain]
        d.line(ps, fill=col, width=int(limb_w * SS), joint='curve')
        for p in ps: d.ellipse([p[0] - limb_w * SS / 2, p[1] - limb_w * SS / 2, p[0] + limb_w * SS / 2, p[1] + limb_w * SS / 2], fill=col)
    farc = NEAR if pt['front'] else FAR
    limb(pt['arms'][1], farc); limb(pt['legs'][1], farc)
    if pt['front']:
        limb([pt['legs'][0][0], pt['legs'][1][0]], NEAR)
        limb([pt['arms'][0][0], pt['arms'][1][0]], NEAR)
    limb([pt['hip'], pt['sh'], pt['neck']], NEAR)
    hx, hy = S(pt['head']); r = pt['r'] * SS
    d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=NEAR)
    limb(pt['legs'][0], NEAR); limb(pt['arms'][0], NEAR)
    for pr in P.get('props', []):
        if pr[0] == 'ball':
            h, h2 = pt['arms'][0][2], pt['arms'][1][2]
            c = ((h[0] + h2[0]) / 2 + pr[1] * k, (h[1] + h2[1]) / 2 + pr[2] * k); r = 13 * k
            d.ellipse([S((c[0] - r, c[1] - r)), S((c[0] + r, c[1] + r))], fill=BALL)
        elif pr[0] == 'db':
            for arm in pt['arms']:
                h = arm[2]
                d.rounded_rectangle([S((h[0] - 11 * k, h[1] - 4 * k)), S((h[0] + 11 * k, h[1] + 4 * k))], radius=2 * k * SS, fill=PROP)
        elif pr[0] == 'landmine':
            h = pt['arms'][0][2]
            d.line([S(h), S((h[0] - 150 * k, gy))], fill=PROP, width=lw(6))
    img = img.resize((W, H), Image.LANCZOS)
    # the figure's box in the image, for the thumbnail
    xs = [p[0] + dx for p in pts]; ys = [p[1] + dy for p in pts]
    return img, (min(xs), min(ys), max(xs), max(ys))

def extent(frames, k):
    """Union box of both frames' bodies, in frame-local coordinates where the
    floor is y = 0 (so frames line up on the floor)."""
    xs, ys = [], []
    for f in frames:
        pt = pose_points(f, k)
        g = ground_y(f, pt, k)
        for p in body_pts(pt):
            xs.append(p[0]); ys.append(p[1] - g)
        for pr in f.get('props', []):
            if pr[0] == 'wall': xs += [pr[1] * k, pr[1] * k + 10 * k]
            if pr[0] == 'bar': ys.append(pr[3] * k - g - 40 * k)
            if pr[0] == 'bike': xs.append(pt['hip'][0] + 116 * k)
    return min(xs), max(xs), min(ys), max(ys)

def render(ex_id, frames, out_dir):
    x0, x1, y0, _ = extent(frames, 1.0)
    room_w, room_h = W - 60, GROUND - 22
    k = min(MAX_K, room_w / (x1 - x0), room_h / max(1, -y0))
    x0, x1, _, _ = extent(frames, k)
    dx = W / 2 - (x0 + x1) / 2
    os.makedirs(os.path.join(out_dir, ex_id), exist_ok=True)
    drawn = []
    for i, f in enumerate(frames):
        pt = pose_points(f, k)
        img, box = draw_frame(f, k, dx, pt)
        img.save(os.path.join(out_dir, ex_id, f'{i}.jpg'), 'JPEG', quality=82, optimize=True)
        drawn.append((img, box))
    # The thumbnail uses whichever frame's shape suits a wide 3:2 tile best
    # (a burpee's plank reads better than its tall jump).
    fit = lambda b: abs(math.log(max(1, b[2] - b[0]) / max(1, b[3] - b[1]) / 1.5))
    img, box = min(drawn, key=lambda d: fit(d[1]))
    thumb(img, box).save(os.path.join(out_dir, ex_id, 't.jpg'), 'JPEG', quality=85, optimize=True)

def thumb(img, box):
    """The start frame cropped to the figure, 3:2, on a tinted background."""
    x0, y0, x1, y1 = box
    pad = 6
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, min(H, y1 + pad)
    w, h = x1 - x0, y1 - y0
    if w / h < 1.5:
        cx = (x0 + x1) / 2; w = h * 1.5; x0, x1 = cx - w / 2, cx + w / 2
    else:
        cy = (y0 + y1) / 2; h = w / 1.5; y0, y1 = cy - h / 2, cy + h / 2
    # crop from a padded copy, so a crop past the edge shows background, not black
    M = 300
    big = Image.new('RGB', (W + 2 * M, H + 2 * M), BG)
    big.paste(img, (M, M))
    crop = big.crop((round(x0) + M, round(y0) + M, round(x1) + M, round(y1) + M)).resize((144, 96), Image.LANCZOS)
    # swap the pale background for the tint so the figure stands out
    px = crop.load()
    for yy in range(crop.height):
        for xx in range(crop.width):
            r, g, b = px[xx, yy]
            if abs(r - BG[0]) < 10 and abs(g - BG[1]) < 10 and abs(b - BG[2]) < 10:
                px[xx, yy] = THUMB_BG
    return crop

if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from poses import POSES
    out = sys.argv[1] if len(sys.argv) > 1 else 'demos'
    only = set(sys.argv[2:])
    for key, fr in POSES.items():
        if not only or key in only:
            render(key, fr, out)
    print(len(only) or len(POSES), 'drawn')
