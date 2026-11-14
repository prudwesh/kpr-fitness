"""Two frames (start, end) per exercise. Angles: 0 down, 90 forward/right,
180 up, -90 back/left. arms: [(upper, forearm) near, far];
legs: [(thigh, shin, foot) near, far]. front=True draws a front view.
shift=(x, y) moves a frame's body; rest_y sets where the ground is."""

def P(torso=180, arms=((9, 5), (-7, -4)), legs=((2, 2, 90), (-2, -2, 90)), **kw):
    d = dict(torso=torso, arms=list(arms), legs=list(legs)); d.update(kw); return d

UP = ((150, 154), (157, 160))           # arms overhead, a little forward of the head
STAND = P()
PLANK = P(torso=98, arms=((3, 3), (-3, -3)), legs=((-82, -82, 0), (-80, -80, 0)))
MAT = [('mat',)]
LIE_ARMS = ((84, 88), (80, 86))         # lying on the back, arms along the body

POSES = {
    # ---- in programs ----
    "burpee": [P(arms=UP, legs=((2, 2, 60), (-2, -2, 60)), air=18), PLANK],
    "jumping-jacks": [P(front=True, arms=((15, 5), (-15, -5)), legs=((5, 2, 90), (-5, -2, -90))),
                      P(front=True, arms=((150, 165), (-150, -165)), legs=((25, 22, 90), (-25, -22, -90)), air=8)],
    "high-knees": [P(torso=175, arms=((-40, 50), (40, 130)), legs=((95, 0, 90), (-5, -10, 70))),
                   P(torso=175, arms=((40, 130), (-40, 50)), legs=((-5, -10, 70), (95, 0, 90)))],
    "running": [P(torso=170, arms=((-45, 45), (40, 130)), legs=((40, -5, 95), (-30, -110, -10)), air=6),
                P(torso=170, arms=((40, 130), (-45, 45)), legs=((-30, -110, -10), (40, -5, 95)), air=6)],
    "walking": [P(torso=178, arms=((-20, -10), (20, 30)), legs=((22, 8, 95), (-18, -25, 70))),
                P(torso=178, arms=((20, 30), (-20, -10)), legs=((-18, -25, 70), (22, 8, 95)))],
    "assault-bike": [P(torso=165, arms=((60, 150), (35, 120)), legs=((85, 10, 95), (50, -20, 90)), props=[('bike',)]),
                     P(torso=165, arms=((35, 120), (60, 150)), legs=((50, -20, 90), (85, 10, 95)), props=[('bike',)])],
    "bird-dog": [P(torso=90, arms=((0, 0), (2, 2)), legs=((0, -90, -90), (2, -90, -90)), props=MAT),
                 P(torso=90, arms=((92, 92), (2, 2)), legs=((0, -90, -90), (-90, -90, -90)), props=MAT)],
    "hollow-body-hold": [P(torso=-90, head=-90, arms=((-90, -90), (-88, -88)), legs=((90, 90, 180), (88, 88, 180)), props=MAT),
                         P(torso=-112, head=-118, arms=((-125, -125), (-122, -122)), legs=((112, 112, 180), (110, 110, 180)), props=MAT)],
    "pigeon-stretch": [P(torso=178, arms=((25, 10), (20, 5)), legs=((70, -60, -90), (-92, -92, -90)), props=MAT),
                       P(torso=100, head=102, arms=((95, 92), (93, 90)), legs=((70, -60, -90), (-92, -92, -90)), props=MAT)],
    "wrist-stretch": [P(arms=((90, 90), (-7, -4))), P(arms=((90, 90), (55, 105)))],
    "sun-salutation": [P(torso=184, arms=((165, 165), (170, 170))),
                       P(torso=25, head=15, arms=((10, 5), (8, 3)))],
    "downward-dog": [dict(PLANK, props=MAT),
                     P(torso=42, head=40, arms=((42, 42), (40, 40)), legs=((-38, -38, 90), (-36, -36, 90)), props=MAT)],
    "cobra-pose": [P(torso=90, head=95, arms=((-40, 60), (-38, 58)), legs=((-90, -90, -90), (-90, -90, -90)), props=MAT),
                   P(torso=128, head=140, arms=((5, 5), (3, 3)), legs=((-90, -90, -90), (-90, -90, -90)), props=MAT)],
    "warrior-ii": [P(front=True, arms=((10, 5), (-10, -5)), legs=((25, 20, 90), (-25, -20, -90))),
                   P(front=True, arms=((90, 90), (-90, -90)), legs=((65, 5, 90), (-35, -35, -90)))],
    "tree-pose": [P(front=True, arms=((25, 135), (-25, -135)), legs=((3, 0, 90), (-3, 0, -90))),
                  P(front=True, arms=((172, 178), (-172, -178)), legs=((55, -55, -60), (-3, 0, -90)))],
    "corpse-pose": [P(torso=-90, head=-90, arms=LIE_ARMS, legs=((90, 90, 170), (92, 92, 160)), props=MAT),
                    P(torso=-90, head=-92, arms=((78, 84), (74, 82)), legs=((90, 90, 165), (92, 92, 155)), props=MAT)],
    # quadruped "open the book": hand under the body, then up to the sky
    "thoracic-rotation": [P(torso=90, head=85, arms=((-15, -60), (0, 0)), legs=((0, -90, -90), (2, -90, -90)), props=MAT),
                          P(torso=90, head=120, arms=((172, 172), (0, 0)), legs=((0, -90, -90), (2, -90, -90)), props=MAT)],
    "deep-squat-hold": [STAND, P(torso=162, arms=((60, 130), (55, 125)), legs=((98, -22, 90), (95, -24, 90)))],
    # ---- the rest of the library ----
    "pike-push-up": [P(torso=42, head=40, arms=((42, 42), (40, 40)), legs=((-38, -38, 90), (-36, -36, 90)), props=MAT),
                     P(torso=25, head=20, arms=((-55, 55), (-53, 53)), legs=((-45, -45, 90), (-43, -43, 90)), props=MAT)],
    "landmine-press": [P(torso=172, arms=((10, 165), (5, 160)), legs=((20, 5, 90), (-20, -15, 80)), props=[('landmine',)]),
                       P(torso=168, arms=((135, 135), (130, 130)), legs=((20, 5, 90), (-20, -15, 80)), props=[('landmine',)])],
    "dead-hang": [P(arms=((172, 174), (176, 178)), legs=((2, 2, 30), (-2, -2, 30)), air=40, props=[('bar', -50, 50, -118)]),
                  P(arms=((172, 174), (176, 178)), legs=((14, -20, 30), (10, -24, 30)), air=40, props=[('bar', -50, 50, -118)])],
    "lateral-lunge": [P(front=True, legs=((30, 28, 90), (-30, -28, -90))),
                      P(front=True, torso=175, arms=((40, 100), (-40, -100)), legs=((55, 5, 90), (-58, -58, -90)))],
    "wall-sit": [P(props=[('wall', -16)]),
                 P(arms=((5, 5), (2, 2)), legs=((90, 0, 90), (88, -2, 90)), props=[('wall', -16)])],
    # side-lying, seen from the front: the legs reach a little into the floor's depth
    "clamshell": [P(torso=-90, head=-90, arms=((-90, -45), (-85, -40)), legs=((55, -55, -60), (60, -55, -60)), rest_y=9, props=MAT),
                  P(torso=-90, head=-90, arms=((-90, -45), (-85, -40)), legs=((140, -40, -40), (60, -55, -60)), rest_y=9, props=MAT)],
    "single-leg-calf-raise": [P(legs=((0, 0, 90), (-5, -75, -70))), P(legs=((0, 0, 25), (-5, -75, -70)))],
    "tibialis-raise": [P(torso=190, legs=((20, 20, 90), (18, 18, 90)), props=[('wall', -40)]),
                       P(torso=190, legs=((20, 20, 150), (18, 18, 150)), props=[('wall', -40)])],
    # supports under the hands; hips about 50 px above the floor
    "l-sit": [P(arms=((0, 0), (3, 3)), legs=((100, 0, 90), (98, -2, 90)), rest_y=50, props=[('box', -9, -4, 18, 54)]),
              P(arms=((0, 0), (3, 3)), legs=((90, 90, 150), (88, 88, 150)), rest_y=50, props=[('box', -9, -4, 18, 54)])],
    # shoulders stay on the bench; frame 2 is shifted so they don't move
    "dragon-flag": [P(torso=-15, head=-90, arms=((-110, -60), (-108, -58)), legs=((180, 180, 90), (178, 178, 90)), rest_y=104, props=[('bench', -120, 10, 64)]),
                    P(torso=-55, head=-90, arms=((-110, -60), (-108, -58)), legs=((125, 125, 90), (123, 123, 90)), shift=(33.6, 23.6), rest_y=104, props=[('bench', -120, 10, 64)])],
    "man-maker": [dict(PLANK, props=[('db',)]), P(arms=UP, legs=((5, 2, 90), (-5, -2, 90)), props=[('db',)])],
    "wall-ball": [P(torso=165, arms=((40, 150), (35, 145)), legs=((70, -20, 90), (68, -22, 90)), props=[('ball', 6, -6)]),
                  P(torso=182, arms=UP, legs=((2, 2, 60), (-2, -2, 60)), props=[('ball', 0, -16)])],
    "bear-crawl": [P(torso=95, arms=((15, 10), (-10, -10)), legs=((-5, -60, -10), (25, -40, 10))),
                   P(torso=95, arms=((-10, -10), (15, 10)), legs=((25, -40, 10), (-5, -60, -10)))],
    "swimming": [P(torso=90, head=95, arms=((90, 90), (-80, -90)), legs=((-95, -95, -90), (-85, -85, -90)), rest_y=0, props=[('water', -6)]),
                 P(torso=90, head=95, arms=((-80, -90), (90, 90)), legs=((-85, -85, -90), (-95, -95, -90)), rest_y=0, props=[('water', -6)])],
    "ski-erg": [P(arms=UP, legs=((5, 2, 90), (-5, -2, 90))),
                P(torso=130, head=125, arms=((10, -5), (8, -7)), legs=((15, -5, 90), (12, -8, 90)))],
    "dancing": [P(front=True, torso=175, arms=((150, 120), (-60, -30)), legs=((25, -10, 90), (-5, 0, -90))),
                P(front=True, torso=185, arms=((60, 30), (-150, -120)), legs=((5, 0, 90), (-25, 10, -90)))],
    "boxing": [P(torso=178, arms=((35, 165), (25, 160)), legs=((15, 5, 90), (-20, -10, 80))),
               P(torso=172, arms=((90, 90), (25, 160)), legs=((15, 5, 90), (-20, -10, 80)))],
    "shadow-boxing": [P(torso=172, arms=((35, 165), (90, 90)), legs=((15, 5, 90), (-20, -10, 80))),
                      P(torso=176, arms=((140, 100), (25, 160)), legs=((15, 5, 90), (-20, -10, 80)))],
    "butterfly-stretch": [P(front=True, arms=((10, 25), (-10, -25)), legs=((75, -100, -90), (-75, 100, 90)), props=MAT),
                          P(front=True, arms=((15, 30), (-15, -30)), legs=((88, -95, -90), (-88, 95, 90)), props=MAT)],
    "chair-pose": [P(arms=UP), P(torso=160, arms=((150, 150), (154, 154)), legs=((62, -22, 90), (60, -24, 90)))],
    "bridge-pose": [P(torso=-90, head=-90, arms=LIE_ARMS, legs=((135, 0, 90), (133, -2, 90)), props=MAT),
                    P(torso=-62, head=-75, arms=((60, 75), (56, 72)), legs=((108, 0, 90), (106, -2, 90)), props=MAT)],
    "boat-pose": [P(torso=-158, arms=((90, 90), (88, 88)), legs=((135, 75, 120), (133, 73, 118)), props=MAT),
                  P(torso=-150, arms=((95, 95), (93, 93)), legs=((128, 128, 160), (126, 126, 158)), props=MAT)],
    "seated-forward-fold": [P(arms=UP, legs=((90, 90, 170), (88, 88, 170)), props=MAT),
                            P(torso=100, head=98, arms=((92, 92), (90, 90)), legs=((90, 90, 170), (88, 88, 170)), props=MAT)],
    "hip-circles": [P(arms=((60, 80), (3, 3)), legs=((92, 0, 90), (-2, -2, 90)), props=[('wall', 70)]),
                    P(arms=((60, 80), (3, 3)), legs=((-35, -80, -40), (-2, -2, 90)), props=[('wall', 70)])],
    "leg-swings": [P(arms=((60, 80), (3, 3)), legs=((60, 55, 120), (-2, -2, 90)), props=[('wall', 70)]),
                   P(arms=((60, 80), (3, 3)), legs=((-40, -45, 30), (-2, -2, 90)), props=[('wall', 70)])],
    "ankle-mobility-drill": [P(torso=180, arms=((95, 95), (93, 93)), legs=((85, 0, 90), (0, -90, -90)), props=[('wall', 66)]),
                             P(torso=172, arms=((95, 95), (93, 93)), legs=((80, -28, 90), (0, -90, -90)), props=[('wall', 66)])],
}
