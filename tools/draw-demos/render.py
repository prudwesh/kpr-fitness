"""Draw two-frame demo illustrations (start / end position) for the KPR
Fitness exercises that have no photo demo. A figure is posed by segment
directions in degrees: 0 = straight down, 90 = forward (right), 180 = up,
-90 = back (left). Writes demos/<id>/0.jpg and 1.jpg (480x320)."""
import math, os, sys
from PIL import Image, ImageDraw

W, H, SS = 480, 320, 3          # output size, supersampling
GROUND = 292
L = dict(torso=60, neck=7, head=12, upper=29, fore=27, thigh=40, shin=39, foot=12)
BG, FLOOR, MAT = (238, 242, 247), (221, 227, 236), (186, 225, 214)
NEAR, FAR, SKIN = (11, 110, 92), (102, 186, 167), (11, 110, 92)
PROP, PROP2, BALL = (120, 132, 150), (160, 170, 186), (240, 150, 60)
LIMB = 8.5

def seg(p, a, n):
    r = math.radians(a)
    return (p[0] + n * math.sin(r), p[1] + n * math.cos(r))

def pose_points(P):
    """Joint positions with the hip at (0, 0)."""
    front = P.get('front', False)
    hip = (0.0, 0.0)
    sh = seg(hip, P.get('torso', 180), L['torso'])
    neck = seg(sh, P.get('head', P.get('torso', 180)), L['neck'])
    head = seg(neck, P.get('head', P.get('torso', 180)), L['head'])
    arms, legs = [], []
    for i, (u, f) in enumerate(P.get('arms', [(0, 0), (0, 0)])):
        s = sh if not front else (sh[0] + (17 if i == 0 else -17), sh[1] + 3)
        e = seg(s, u, L['upper']); h = seg(e, f, L['fore'])
        arms.append((s, e, h))
    for i, lg in enumerate(P.get('legs', [(0, 0, 90), (0, 0, 90)])):
        t, s_, ft = (lg + (90,))[:3] if len(lg) == 2 else lg
        hp = hip if not front else (hip[0] + (10 if i == 0 else -10), hip[1])
        k = seg(hp, t, L['thigh']); a = seg(k, s_, L['shin']); toe = seg(a, ft, L['foot'])
        legs.append((hp, k, a, toe))
    ox, oy = P.get('shift', (0, 0))
    mv = lambda q: (q[0] + ox, q[1] + oy)
    return dict(hip=mv(hip), sh=mv(sh), neck=mv(neck), head=mv(head),
                arms=[tuple(mv(q) for q in a) for a in arms], legs=[tuple(mv(q) for q in l) for l in legs], front=front)

def all_pts(pt):
    out = [pt['hip'], pt['sh'], pt['neck'], (pt['head'][0], pt['head'][1] + L['head']), (pt['head'][0], pt['head'][1] - L['head'])]
    for a in pt['arms']: out += list(a)
    for l in pt['legs']: out += list(l)
    return out

def draw_frame(P, dx, dy, props):
    img = Image.new('RGB', (W * SS, H * SS), BG)
    d = ImageDraw.Draw(img)
    S = lambda p: ((p[0] + dx) * SS, (p[1] + dy) * SS)
    d.rectangle([0, GROUND * SS, W * SS, H * SS], fill=FLOOR)
    pt = pose_points(P)
    # props behind the figure
    for pr in props:
        kind = pr[0]
        if kind == 'mat':
            xs = [p[0] for p in all_pts(pt)]
            x0, x1 = min(xs) - 18, max(xs) + 18
            d.rounded_rectangle([(x0 + dx) * SS, (GROUND - 5) * SS, (x1 + dx) * SS, (GROUND + 3) * SS], radius=4 * SS, fill=MAT)
        elif kind == 'wall':
            x = pr[1]
            d.rectangle([(x + dx) * SS, 40 * SS, (x + dx + 10) * SS, GROUND * SS], fill=PROP2)
        elif kind == 'bar':
            _, x0, x1, y = pr
            d.line([S((x0, y)), S((x1, y))], fill=PROP, width=7 * SS)
            for x in (x0, x1): d.line([S((x, y)), S((x, 12 - dy))], fill=PROP2, width=5 * SS)
        elif kind == 'box':
            _, x, y, w, h = pr
            d.rounded_rectangle([S((x, y)), S((x + w, y + h))], radius=3 * SS, fill=PROP2)
        elif kind == 'bench':
            _, x0, x1, y = pr
            d.rounded_rectangle([S((x0, y)), S((x1, y + 9))], radius=3 * SS, fill=PROP)
            for x in (x0 + 12, x1 - 12): d.line([S((x, y + 9)), ((x + dx) * SS, GROUND * SS)], fill=PROP2, width=5 * SS)
        elif kind == 'bike':
            hp = pt['hip']
            seat = (hp[0] - 4, hp[1] + 10)
            d.line([S((seat[0] - 12, seat[1])), S((seat[0] + 12, seat[1]))], fill=PROP, width=6 * SS)
            d.line([S(seat), S((seat[0] + 10, GROUND - dy))], fill=PROP, width=6 * SS)
            fan = (hp[0] + 82, GROUND - dy - 34)
            r = 32
            d.ellipse([S((fan[0] - r, fan[1] - r)), S((fan[0] + r, fan[1] + r))], outline=PROP, width=5 * SS)
            d.line([S((seat[0] + 10, seat[1] + 40)), S(fan)], fill=PROP, width=6 * SS)
            d.line([S(fan), S((fan[0] - 18, fan[1] - 70))], fill=PROP, width=5 * SS)
        elif kind == 'water':
            y = pr[1]
            pts = [S((x - dx, y + 4 * math.sin(x / 14))) for x in range(0, W + 1, 6)]
            d.rectangle([0, (y + dy) * SS, W * SS, H * SS], fill=(214, 232, 245))
            d.line(pts, fill=(150, 190, 225), width=3 * SS)
    # far limbs, body, near limbs
    def limb(chain, col):
        pts = [S(p) for p in chain]
        d.line(pts, fill=col, width=int(LIMB * SS), joint='curve')
        for p in pts: d.ellipse([p[0] - LIMB * SS / 2, p[1] - LIMB * SS / 2, p[0] + LIMB * SS / 2, p[1] + LIMB * SS / 2], fill=col)
    farc = NEAR if pt['front'] else FAR
    limb(pt['arms'][1], farc); limb(pt['legs'][1], farc)
    if pt['front']:
        limb([pt['legs'][0][0], pt['legs'][1][0]], NEAR)
        limb([pt['arms'][0][0], pt['arms'][1][0]], NEAR)
    limb([pt['hip'], pt['sh'], pt['neck']], NEAR)
    hx, hy = S(pt['head']); r = L['head'] * SS
    d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=SKIN)
    limb(pt['legs'][0], NEAR); limb(pt['arms'][0], NEAR)
    for pr in props:
        if pr[0] == 'ball':
            h = pt['arms'][0][2]; h2 = pt['arms'][1][2]
            c = ((h[0] + h2[0]) / 2 + pr[1], (h[1] + h2[1]) / 2 + pr[2])
            d.ellipse([S((c[0] - 13, c[1] - 13)), S((c[0] + 13, c[1] + 13))], fill=BALL)
        elif pr[0] == 'db':
            for a in pt['arms']:
                h = a[2]
                d.rounded_rectangle([S((h[0] - 11, h[1] - 4)), S((h[0] + 11, h[1] + 4))], radius=2 * SS, fill=PROP)
        elif pr[0] == 'landmine':
            h = pt['arms'][0][2]
            d.line([S(h), S((h[0] - 150, GROUND - dy))], fill=PROP, width=6 * SS)
    return img.resize((W, H), Image.LANCZOS)

def render(ex_id, frames, out_dir):
    pts = [pose_points(f) for f in frames]
    xs = [p[0] for pt in pts for p in all_pts(pt)]
    xs += [x for f in frames for pr in f.get('props', []) if pr[0] == 'wall' for x in (pr[1], pr[1] + 10)]
    dx = W / 2 - (min(xs) + max(xs)) / 2
    os.makedirs(os.path.join(out_dir, ex_id), exist_ok=True)
    for i, (f, pt) in enumerate(zip(frames, pts)):
        low = max(p[1] for p in all_pts(pt))
        if f.get('rest_y') is not None: low = f['rest_y']
        dy = GROUND - low - f.get('air', 0)
        img = draw_frame(f, dx, dy, f.get('props', []))
        img.save(os.path.join(out_dir, ex_id, f'{i}.jpg'), 'JPEG', quality=82, optimize=True)

if __name__ == '__main__':
    from poses import POSES
    out = sys.argv[1]
    only = set(sys.argv[2:])
    for k, fr in POSES.items():
        if not only or k in only:
            render(k, fr, out)
    print(len(POSES), 'exercises')
