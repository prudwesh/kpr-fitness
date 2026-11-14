# KPR Fitness

Every exercise with how-to steps, workout logging, routines, records and
progress. Served at **https://fitness.kprapps.online/** by GitHub Pages
(`CNAME`). One of the KPR apps: sign-in, access, the header, account menu,
theme and Report issue all come from kpr-core (`core.kprapps.online`), the
same as every other KPR app.

## What's here

- `index.html`: the page and its styles (KPR theme tokens, light and dark,
  phone and computer sizes).
- `app.js`: the app. Views: Today, Workout (the logger), Exercises,
  Routines, History, Progress, Body, plus Settings.
- `ai.js`: the **AI Coach** (header button). A chat with voice, like KPR
  Finance's assistant: it answers about the person's own training (it looks
  up workouts, records, exercise history, body log and routines on the
  device, read-only), exercise technique, plans and recovery, and how to use
  the app, and declines anything that isn't fitness. It can show exercises
  (with their demo) and draft a routine that opens in the routine editor
  for the person to save. It calls KPR AI (`prudwesh/kpr-ai`, app id
  `fitness`), which must list `fitness` in its `CLIENTS` with the same
  fitness-only ground rules. Turn it off per device in Settings.
- `demos/<exercise-id>/0.jpg, 1.jpg`: every exercise's demo, the start and
  end position played as a loop in the exercise view and in routines. 182
  are photos from [Free Exercise DB](https://github.com/yuhonas/free-exercise-db)
  (public domain, Unlicense); the other 44 (`DRAWN` in `exercises.js`) are
  drawings made for KPR Fitness with `tools/draw-demos` (Python + Pillow:
  poses in `poses.py`; from the repo root, `python3 tools/draw-demos/render.py demos <id>` redraws one). A new
  exercise needs a demo here too: a photo pair, or a pose in `poses.py`.
- `exercises.js`: the exercise library (226 exercises: muscle, equipment,
  type, how a set is logged, steps, tip) and the built-in programs. An
  exercise's id is its name in lower-case-with-dashes; never rename one,
  since saved workouts point at it.
- `sw.js`, `manifest.webmanifest`, `icons/`: install as an app.
- `tools/bump-version.py`: raises the version (see `CLAUDE.md`).

## Data and security

Everything is in the shared KPR Firebase project (`kpr-finance-app`), in
Firestore `users/{uid}/fitness/*`, one document per workout, routine,
custom exercise or body entry, plus `settings` and `active` (the workout in
progress). Weights are kept in kg, distances in km, times in seconds.

The rules for it are in **prudwesh/kprapps → `firestore.rules`** (one rules
file for every KPR app): only the owner can read or write their data, not
admins, and only with Fitness access (`grants/{uid}.access.fitness`, or the
app's `access` set to `all`). Every field is checked. kprapps'
`tools/fitness-rules/` tests those rules on the Firestore emulator.

## Setting up the site (once)

1. Repo → **Settings → Pages**: deploy from `main`, `/` (root). The custom
   domain is `fitness.kprapps.online` (from `CNAME`); tick **Enforce HTTPS**
   once the certificate is ready.
2. DNS for `kprapps.online`: a **CNAME** record `fitness` →
   `prudwesh.github.io`.
3. Firebase console → `kpr-finance-app` → **Authentication → Settings →
   Authorized domains**: add `fitness.kprapps.online`.
4. The hub's tile already points here (kprapps `shared/kpr-apps.js`), and
   `kprapps.online/fitness/` redirects here. Give people access in the hub's
   Admin page (Fitness).

## Local preview

```
npx serve .
```
