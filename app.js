/* KPR Fitness (fitness.kprapps.online) — app logic.

   Data: Firestore users/{uid}/fitness/{docId}, private to the owner (the
   rules are in prudwesh/kprapps firestore.rules, shared by every KPR app;
   admins can't read it). One doc per
   thing, told apart by `kind`:
     workout   a finished workout: name, date, start, end, notes, items, routine
     routine   a saved routine: name, notes, items [{ex, sets, reps, rest}]
     exercise  an exercise the person made: name, muscle, equipment, category,
               track, secondary, notes (steps, one per line)
     body      a body log: date, weight (kg), fat (%), waist (cm), notes
     settings  id "settings": unit, rest, goal, height, sound, favs
     profile   id "profile": age (also kept in localStorage for this device)
     active    id "active": the workout in progress, so it carries on on
               another device. Also kept in localStorage for this device.
   Weights are stored in kg, distances in km, times in seconds; the
   person's unit choice only changes what's shown. */
(() => {
  "use strict";
  const D = window.KPR_FITNESS_DATA;

  // ===================================================================
  // helpers
  // ===================================================================
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} };
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => { d = new Date(d); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  const fromYmd = (s) => { const [y, m, d] = String(s || "").split("-").map(Number); return new Date(y || 1970, (m || 1) - 1, d || 1); };
  const DAY = 86400000;
  const weekStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
  const fmtDate = (t, o) => new Date(t).toLocaleDateString(undefined, o || { weekday: "short", month: "short", day: "numeric" });
  const fmtNum = (n, dp = 0) => (n == null || !isFinite(n) ? "–" : Number(n).toLocaleString(undefined, { maximumFractionDigits: dp }));
  const fmtClock = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`; };
  const fmtDur = (ms) => { const m = Math.round(ms / 60000); if (m < 60) return m + " min"; return Math.floor(m / 60) + "h " + pad(m % 60) + "m"; };
  const parseTime = (v) => {
    v = String(v == null ? "" : v).trim(); if (!v) return null;
    if (/^\d+(\.\d+)?$/.test(v)) return Math.round(parseFloat(v));
    const p = v.split(":").map((x) => parseFloat(x) || 0);
    let s = 0; for (const x of p) s = s * 60 + x; return Math.round(s);
  };
  const parseNum = (v) => { v = String(v == null ? "" : v).replace(",", ".").trim(); if (!v) return null; const n = parseFloat(v); return isFinite(n) && n >= 0 ? n : null; };

  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    more: '<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    starFill: '<path fill="currentColor" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    up: '<path d="M18 15l-6-6-6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    left: '<path d="M15 18l-6-6 6-6"/>',
    right: '<path d="M9 18l6-6-6-6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    swap: '<path d="M7 16V4M3 8l4-4 4 4M17 8v12M21 16l-4 4-4-4"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    play: '<path fill="currentColor" stroke="none" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
    pause: '<path fill="currentColor" stroke="none" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    send: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    volume: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    mute: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 6 6M22 9l-6 6"/>',
  };
  const I = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;

  function toast(msg, action, ms = 3200) {
    const t = document.createElement("div"); t.className = "toast";
    t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
    if (action) t.querySelector("button").onclick = () => { action.run(); t.remove(); };
    $("#toasts").appendChild(t); setTimeout(() => t.remove(), ms);
  }

  // ===================================================================
  // state
  // ===================================================================
  let db = null, me = null;
  const docs = new Map();           // id -> data, everything in users/{uid}/fitness
  let loaded = false, loadErr = null;
  const DEFAULT_SETTINGS = { unit: "kg", rest: 90, goal: 3, height: 0, sound: true, favs: [] };
  let S = Object.assign({}, DEFAULT_SETTINGS);
  let active = null;                // the workout in progress
  let derived = null;               // rebuilt from docs on every change
  const lib = { q: "", muscle: "", equipment: "", category: "", only: "", sort: "az", limit: 60 };
  const ui = { hist: { month: null, day: null }, prog: { ex: "", metric: "" }, body: { range: 90 } };

  const ACTIVE_KEY = () => "kprfitness.active." + me.uid;
  const col = () => db.collection("users").doc(me.uid).collection("fitness");
  const ts = () => firebase.firestore.FieldValue.serverTimestamp();

  // units
  const LB = 2.2046226218, MI = 1.609344;
  const isLb = () => S.unit === "lb";
  const wU = () => (isLb() ? "lb" : "kg");
  const dU = () => (isLb() ? "mi" : "km");
  const round1 = (n) => Math.round(n * 10) / 10;
  const wShow = (kg) => (kg == null ? "" : String(round1(isLb() ? kg * LB : kg)));
  const wIn = (v) => { const n = parseNum(v); return n == null ? null : Math.round((isLb() ? n / LB : n) * 10000) / 10000; };
  const dShow = (km) => (km == null ? "" : String(Math.round((isLb() ? km / MI : km) * 100) / 100));
  const dIn = (v) => { const n = parseNum(v); return n == null ? null : Math.round((isLb() ? n * MI : n) * 10000) / 10000; };
  const volShow = (kg) => fmtNum(isLb() ? kg * LB : kg) + " " + wU();

  // exercises
  const customEx = () => Array.from(docs.entries()).filter(([, d]) => d.kind === "exercise").map(([id, d]) => ({
    id, name: d.name || "Exercise", muscle: d.muscle || "fullbody", equipment: d.equipment || "other", category: d.category || "strength",
    track: d.track || "wr", secondary: d.secondary || [], steps: String(d.notes || "").split("\n").map((s) => s.trim()).filter(Boolean), tip: "", builtin: false,
  }));
  let exCache = null;
  function allEx() { if (!exCache) exCache = D.LIST.concat(customEx()); return exCache; }
  function exById(id, fallbackName) {
    const d = docs.get(id);
    if (d && d.kind === "exercise") return allEx().find((e) => e.id === id);
    return D.BY_ID.get(id) || { id, name: fallbackName || "Removed exercise", muscle: "fullbody", equipment: "other", category: "strength", track: "wr", secondary: [], steps: [], tip: "", builtin: false, missing: true };
  }
  const isFav = (id) => (S.favs || []).includes(id);

  // set maths
  const e1rm = (w, r) => (!w || !r ? 0 : r === 1 ? w : w * (1 + r / 30));
  const counts = (s) => s && s.done !== false && s.k !== "w";
  function setValue(track, s) {
    if (track === "wr") return e1rm(s.w, s.r);
    if (track === "r") return s.r || 0;
    if (track === "t") return s.t || 0;
    if (track === "dt") return s.d || 0;
    return 0;
  }
  function setText(track, s) {
    if (!s) return "";
    if (track === "wr") return s.w != null || s.r != null ? `${wShow(s.w) || 0} ${wU()} × ${s.r || 0}` : "";
    if (track === "r") return (s.w ? `+${wShow(s.w)} ${wU()} × ` : "") + (s.r != null ? s.r + " reps" : "");
    if (track === "t") return s.t != null ? fmtClock(s.t) : "";
    if (track === "dt") return [s.d != null ? dShow(s.d) + " " + dU() : "", s.t != null ? fmtClock(s.t) : ""].filter(Boolean).join(" · ");
    return "";
  }
  const METRICS = {
    wr: [["e1rm", "Est. 1-rep max"], ["weight", "Heaviest"], ["vol", "Workout volume"]],
    r: [["reps", "Most reps"], ["total", "Total reps"]],
    t: [["time", "Longest"], ["total", "Total time"]],
    dt: [["dist", "Distance"], ["pace", "Pace"]],
  };
  function metricOf(track, metric, sets) {
    const c = sets.filter(counts);
    if (!c.length) return null;
    const max = (f) => Math.max(...c.map(f));
    switch (metric) {
      case "e1rm": return max((s) => e1rm(s.w, s.r)) || null;
      case "weight": return max((s) => s.w || 0) || null;
      case "vol": return c.reduce((a, s) => a + (s.w || 0) * (s.r || 0), 0) || null;
      case "reps": return max((s) => s.r || 0) || null;
      case "time": return max((s) => s.t || 0) || null;
      case "dist": return max((s) => s.d || 0) || null;
      case "pace": { const p = c.filter((s) => s.d && s.t).map((s) => s.t / s.d); return p.length ? Math.min(...p) : null; }
      case "total": return c.reduce((a, s) => a + ((track === "t" ? s.t : s.r) || 0), 0) || null;
    }
    return null;
  }
  function metricText(track, metric, v) {
    if (v == null) return "–";
    if (["e1rm", "weight"].includes(metric)) return wShow(v) + " " + wU();
    if (metric === "vol") return volShow(v);
    if (metric === "time" || (metric === "total" && track === "t")) return fmtClock(v);
    if (metric === "dist") return dShow(v) + " " + dU();
    if (metric === "pace") return fmtClock(isLb() ? v * MI : v) + " /" + dU();
    return fmtNum(v) + " reps";
  }
  const metricToY = (track, metric, v) => (["e1rm", "weight"].includes(metric) ? (isLb() ? v * LB : v) : metric === "vol" ? (isLb() ? v * LB : v) : metric === "dist" ? (isLb() ? v / MI : v) : metric === "pace" ? (isLb() ? v * MI : v) / 60 : metric === "time" || (metric === "total" && track === "t") ? v / 60 : v);
  // Best over a list of {it} entries: lowest for pace, highest otherwise.
  function bestMetric(list, track, metric) {
    const vals = list.map(({ it }) => metricOf(track, metric, it.sets || [])).filter((x) => x != null && x > 0);
    if (!vals.length) return null;
    return metric === "pace" ? Math.min(...vals) : Math.max(...vals);
  }
  function workoutVolume(w) {
    let v = 0;
    for (const it of w.items || []) for (const s of it.sets || []) if (counts(s) && s.w && s.r) v += s.w * s.r;
    return v;
  }
  const plural = (n, one, many) => `${fmtNum(n)} ${n === 1 ? one : many || one + "s"}`;
  const workoutSets = (w) => (w.items || []).reduce((a, it) => a + (it.sets || []).filter(counts).length, 0);

  // ===================================================================
  // derived data
  // ===================================================================
  function rebuild() {
    exCache = null;
    const s = docs.get("settings");
    S = Object.assign({}, DEFAULT_SETTINGS, s ? pick(s, Object.keys(DEFAULT_SETTINGS)) : {});
    if (!Array.isArray(S.favs)) S.favs = [];
    const workouts = [], routines = [], body = [];
    for (const [id, d] of docs) {
      if (d.kind === "workout") workouts.push(Object.assign({ id }, d));
      else if (d.kind === "routine") routines.push(Object.assign({ id }, d));
      else if (d.kind === "body") body.push(Object.assign({ id }, d));
    }
    workouts.sort((a, b) => (b.start || 0) - (a.start || 0));
    routines.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    body.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    // per exercise, oldest first
    const hist = new Map();
    for (let i = workouts.length - 1; i >= 0; i--) {
      const w = workouts[i];
      for (const it of w.items || []) {
        if (!hist.has(it.ex)) hist.set(it.ex, []);
        hist.get(it.ex).push({ w, it });
      }
    }
    // personal-record moments, in order
    const prs = [];
    for (const [exId, list] of hist) {
      const ex = exById(exId, list[0].it.name);
      let best = 0;
      for (const { w, it } of list) {
        let top = 0, topSet = null;
        for (const st of it.sets || []) if (counts(st)) { const v = setValue(ex.track, st); if (v > top) { top = v; topSet = st; } }
        if (top > best) { if (best > 0) prs.push({ exId, name: ex.name, w, set: topSet, track: ex.track, value: top }); best = top; }
      }
    }
    prs.sort((a, b) => (b.w.start || 0) - (a.w.start || 0));
    derived = { workouts, routines, body, hist, prs };
  }
  function pick(o, keys) { const r = {}; for (const k of keys) if (o[k] !== undefined) r[k] = o[k]; return r; }
  // The last time an exercise was done (skipping the workout being edited).
  function lastSets(exId, skipId) {
    const list = derived.hist.get(exId) || [];
    for (let i = list.length - 1; i >= 0; i--) if (list[i].w.id !== skipId) return (list[i].it.sets || []).filter((s) => s.done !== false);
    return [];
  }
  function bestBefore(exId, track, skipId) {
    let best = 0;
    for (const { w, it } of derived.hist.get(exId) || []) if (w.id !== skipId) for (const s of it.sets || []) if (counts(s)) best = Math.max(best, setValue(track, s));
    return best;
  }

  // ===================================================================
  // Firestore
  // ===================================================================
  function reportErr(e, what) {
    console.warn("[fitness]", what, e);
    toast(e && e.code === "permission-denied" ? `Couldn't ${what}: you don't have access to KPR Fitness.` : `Couldn't ${what}. ${e && e.message ? e.message : ""}`, null, 5000);
  }
  // Writes don't wait for the server: the listener shows them straight
  // away and Firestore sends them when it can (offline too).
  // The change goes into `docs` straight away too, so the screen is right
  // before the listener catches up (a refused write comes back through the
  // listener and undoes it).
  function saveDoc(id, data, what = "save") {
    const clean = clone(data);
    if (id && docs.has(id)) {
      docs.set(id, Object.assign({}, docs.get(id), clean));
      col().doc(id).update(Object.assign(clone(clean), { updatedAt: ts() })).catch((e) => reportErr(e, what));
    } else {
      const ref = id ? col().doc(id) : col().doc();
      id = ref.id;
      docs.set(id, clean);
      ref.set(Object.assign(clone(clean), { createdAt: ts(), updatedAt: ts() })).catch((e) => reportErr(e, what));
    }
    if (clean.kind !== "active") rebuild();
    return id;
  }
  function removeDoc(id, what = "delete") {
    const kind = (docs.get(id) || {}).kind;
    docs.delete(id);
    if (kind !== "active") rebuild();
    col().doc(id).delete().catch((e) => reportErr(e, what));
  }
  function saveSettings(patch) {
    Object.assign(S, patch);
    saveDoc("settings", Object.assign({ kind: "settings" }, pick(S, Object.keys(DEFAULT_SETTINGS))), "save your settings");
  }

  let listening = false;
  function listen() {
    if (listening) return;
    listening = true;
    col().onSnapshot((snap) => {
      const first = !loaded;
      let other = first;
      snap.docChanges().forEach((ch) => {
        const id = ch.doc.id;
        if (id !== "active") other = true;
        if (ch.type === "removed") {
          docs.delete(id);
          // Finished or discarded on another device.
          if (id === "active" && active && !active.editingId && (ch.doc.data() || {}).start === active.start) {
            active = null; lsSet(ACTIVE_KEY(), null); stopRest(); tickFab();
            toast("That workout was finished on another device.");
            other = true;
          }
        } else docs.set(id, ch.doc.data({ serverTimestamps: "estimate" }));
      });
      loaded = true; loadErr = null;
      rebuild();
      adoptRemoteActive();
      if (first) syncProfile();
      // Don't redraw under someone typing in the logger.
      if (first || (other && (currentRoute().name !== "workout" || !active))) render();
    }, (e) => {
      listening = false;
      console.warn("[fitness] load", e);
      loaded = true; loadErr = e; render();
    });
  }

  // ===================================================================
  // workout in progress
  // ===================================================================
  let activeTimer = null;
  function loadActive() {
    try { const a = JSON.parse(lsGet(ACTIVE_KEY()) || "null"); if (a && Array.isArray(a.items)) active = a; } catch {}
    tickFab();
  }
  function adoptRemoteActive() {
    const r = docs.get("active");
    if (!active && r && Array.isArray(r.items) && lsGet(ACTIVE_KEY() + ".gone") !== String(r.start)) {
      active = { name: r.name || "Workout", start: r.start || Date.now(), notes: r.notes || "", routine: r.routine || "", editingId: r.ref || null, items: clone(r.items) };
      lsSet(ACTIVE_KEY(), JSON.stringify(active));
      tickFab();
    }
  }
  let remoteT = null;
  function persistActive(now) {
    if (!active) return;
    lsSet(ACTIVE_KEY(), JSON.stringify(active));
    clearTimeout(remoteT);
    const push = () => saveDoc("active", { kind: "active", name: active.name, start: active.start, notes: active.notes || "", routine: active.routine || "", ref: active.editingId || "", items: active.items }, "save the workout in progress");
    if (now) push(); else remoteT = setTimeout(push, 1500);
  }
  function clearActive() {
    clearTimeout(remoteT);
    if (active) lsSet(ACTIVE_KEY() + ".gone", String(active.start));
    active = null;
    lsSet(ACTIVE_KEY(), null);
    if (docs.has("active")) removeDoc("active", "clear the workout in progress");
    stopRest();
    tickFab();
  }
  function tickFab() {
    const fab = $("#fab");
    const show = !!active && currentRoute().name !== "workout";
    fab.classList.toggle("show", show);
    $("#startBtn").textContent = active ? "Resume workout" : "+ Start workout";
    const fabText = () => (active.editingId ? "Editing workout" : active.past ? "Logging a past workout" : "Workout · " + fmtClock((Date.now() - active.start) / 1000));
    if (active) $("#fabT").textContent = fabText();
    clearInterval(activeTimer);
    if (active) activeTimer = setInterval(() => {
      if (!active) return;
      const t = fmtClock((Date.now() - active.start) / 1000);
      $("#fabT").textContent = fabText();
      const el = $("#wkTime"); if (el && !active.editingId && !active.past) el.textContent = t;
    }, 1000);
  }
  function newSet(ex, target) { return { k: "n", w: null, r: null, d: null, t: null, done: false, tr: target || null }; }
  function makeItem(exId, nSets, target, rest) {
    const ex = exById(exId);
    const last = lastSets(exId);
    const n = nSets || Math.max(1, Math.min(last.length || 3, 10));
    return { uid: uid(), ex: exId, name: ex.name, note: "", rest: rest != null ? rest : (ex.track === "wr" || ex.track === "r" ? S.rest : 0), sets: Array.from({ length: n }, () => newSet(ex, target)) };
  }
  function startWorkout(opts = {}) {
    if (active) { toast("You already have a workout going."); go("workout"); return; }
    active = { name: opts.name || defaultName(), start: Date.now(), notes: "", routine: opts.routine || "", editingId: null, items: opts.items || [] };
    lsSet(ACTIVE_KEY() + ".gone", null);
    persistActive(true); tickFab(); go("workout");
  }
  function defaultName() {
    const h = new Date().getHours();
    return (h < 5 ? "Night" : h < 12 ? "Morning" : h < 17 ? "Afternoon" : h < 21 ? "Evening" : "Night") + " workout";
  }
  // ---- Warm-up ----
  // Starting a routine (or repeating a workout) puts about 5 minutes of
  // moving stretches first, chosen for the muscles the workout uses: a pulse
  // raiser, then the moves that warm those muscles most. They're marked
  // warm: true, shown under their own heading, and aren't saved with the
  // workout (no sets, volume or records). Moving stretches before training;
  // long holds belong at the end. Off per device in Settings.
  const WARM_MOVES = [   // [exercise, sets, reps or seconds, muscles it warms]
    ["jumping-jacks", 1, 60, ["cardio", "fullbody", "calves", "shoulders"]],
    ["arm-circles", 1, 10, ["shoulders", "chest", "traps", "triceps", "biceps"]],
    ["thoracic-rotation", 1, 8, ["back", "traps", "shoulders", "obliques", "chest"]],
    ["cat-cow", 1, 10, ["lowerback", "back", "abs"]],
    ["world-s-greatest-stretch", 1, 6, ["hamstrings", "glutes", "quads", "abductors", "adductors", "back"]],
    ["leg-swings", 1, 10, ["hamstrings", "glutes", "quads", "abductors", "adductors"]],
    ["hip-circles", 1, 10, ["glutes", "abductors", "adductors", "lowerback"]],
    ["bodyweight-squat", 1, 10, ["quads", "glutes", "adductors"]],
    ["lateral-lunge", 1, 8, ["adductors", "abductors", "glutes", "quads"]],
    ["ankle-mobility-drill", 1, 10, ["calves"]],
    ["bird-dog", 1, 8, ["abs", "lowerback", "glutes"]],
    ["wrist-stretch", 1, 30, ["forearms", "biceps", "triceps"]],
  ];
  const WARM_KEY = "kprfitness.warmup";
  const warmupOn = () => lsGet(WARM_KEY) !== "0";
  function warmupFor(exIds) {
    const exs = exIds.map((id) => exById(id)).filter((e) => !e.missing);
    if (!exs.length) return [];
    // A stretching, yoga or mobility session is its own warm-up.
    const easy = exs.filter((e) => ["stretching", "yoga", "mobility"].includes(e.category)).length;
    if (easy * 2 > exs.length) return [];
    const want = {};
    for (const e of exs) for (const [m, v] of Object.entries(exHeat(e))) want[m] = (want[m] || 0) + v;
    const have = new Set(exIds);
    const picks = [WARM_MOVES[0]];
    const pool = WARM_MOVES.slice(1).filter((w) => !have.has(w[0]));
    while (picks.length < 5 && pool.length) {
      let best = -1, score = 0;
      pool.forEach((w, i) => { const sc = w[3].reduce((n, m) => n + (want[m] || 0), 0); if (sc > score) { score = sc; best = i; } });
      if (best < 0) break;
      const [w] = pool.splice(best, 1);
      w[3].forEach((m) => { if (want[m]) want[m] /= 2; });   // spread over the muscles, not five moves for one
      picks.push(w);
    }
    return picks.map(([id, sets, target]) => Object.assign(makeItem(id, sets, target, 0), { warm: true }));
  }
  function startRoutine(r) {
    const items = (r.items || []).filter((x) => x && x.ex).map((x) => makeItem(x.ex, clamp(x.sets || 3, 1, 20), x.reps || null, x.rest));
    startWorkout({ name: r.name, items: (warmupOn() ? warmupFor(items.map((it) => it.ex)) : []).concat(items), routine: r.id || "" });
  }
  function repeatWorkout(w) {
    const items = (w.items || []).map((it) => { const m = makeItem(it.ex, Math.max(1, (it.sets || []).length)); m.rest = it.rest != null ? it.rest : m.rest; return m; });
    startWorkout({ name: w.name, items: (warmupOn() ? warmupFor(items.map((it) => it.ex)) : []).concat(items), routine: w.routine || "" });
  }
  function editWorkout(w) {
    if (active) { toast("Finish or discard the workout in progress first."); return; }
    active = {
      name: w.name, start: w.start, end: w.end, notes: w.notes || "", routine: w.routine || "", editingId: w.id,
      items: (w.items || []).map((it) => ({ uid: uid(), ex: it.ex, name: it.name, note: it.note || "", rest: it.rest || 0, sets: (it.sets || []).map((s) => Object.assign({ k: "n", w: null, r: null, d: null, t: null }, s, { done: true })) })),
    };
    closeAllModals(); persistActive(true); tickFab(); go("workout");
  }
  function addExercisesToActive(ids) {
    if (!active) return;
    for (const id of ids) active.items.push(makeItem(id));
    persistActive(); render();
  }

  // ===================================================================
  // rest timer
  // ===================================================================
  let rest = null, restT = null, audio = null;
  function startRest(sec, label) {
    if (!sec) return;
    rest = { end: Date.now() + sec * 1000, total: sec, label };
    clearInterval(restT); restT = setInterval(paintRest, 250); paintRest();
  }
  function stopRest() { rest = null; clearInterval(restT); $("#rest").classList.add("hidden"); }
  function paintRest() {
    const el = $("#rest");
    if (!rest) { el.classList.add("hidden"); return; }
    const left = Math.max(0, (rest.end - Date.now()) / 1000);
    el.classList.remove("hidden");
    if (!el.dataset.built) {
      el.innerHTML = `<div style="flex:1;min-width:0"><small id="restL"></small><b id="restN"></b></div>
        <button class="btn sm" data-rest="-15" type="button">−15</button><button class="btn sm" data-rest="15" type="button">+15</button>
        <button class="btn sm primary" data-rest="skip" type="button">Skip</button><span class="bar" id="restBar"></span>`;
      el.dataset.built = "1";
    }
    $("#restL").textContent = left > 0 ? "Rest" + (rest.label ? " · " + rest.label : "") : "Rest over — next set!";
    $("#restN").textContent = fmtClock(Math.ceil(left));
    $("#restBar").style.width = (100 * left / rest.total) + "%";
    if (left <= 0 && !rest.rang) {
      rest.rang = true;
      if (S.sound) beep();
      try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch {}
      setTimeout(() => { if (rest && rest.rang && Date.now() - rest.end > 2500) stopRest(); }, 3000);
    }
  }
  function beep() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach((d) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
        g.gain.setValueAtTime(0.0001, audio.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + d + 0.18);
        o.start(audio.currentTime + d); o.stop(audio.currentTime + d + 0.2);
      });
    } catch {}
  }
  $("#rest").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rest]"); if (!b || !rest) return;
    const v = b.dataset.rest;
    if (v === "skip") return stopRest();
    rest.end += +v * 1000; rest.total = Math.max(rest.total + +v, 1); rest.rang = false; paintRest();
  });

  // ===================================================================
  // body map
  // ===================================================================
  const L = (cx, cy, rx, ry, rot) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ""}/>`;
  const pair = (fn) => fn(1) + fn(-1);
  const mx = (x, s) => (s > 0 ? x : 100 - x);
  const SIL = `<g class="sil"><circle cx="50" cy="14" r="10"/><rect x="45" y="22" width="10" height="10"/><rect x="31" y="31" width="38" height="66" rx="13"/>
    <g stroke="currentColor" stroke-linecap="round" style="color:var(--card-2)"><path d="M31 38 L24 72 L20 100" stroke-width="11" fill="none"/><path d="M69 38 L76 72 L80 100" stroke-width="11" fill="none"/>
    <path d="M41 94 L39.5 145 L39 188" stroke-width="15" fill="none"/><path d="M59 94 L60.5 145 L61 188" stroke-width="15" fill="none"/></g>
    <circle cx="19.5" cy="104" r="4.5"/><circle cx="80.5" cy="104" r="4.5"/><ellipse cx="38" cy="193" rx="6" ry="3"/><ellipse cx="62" cy="193" rx="6" ry="3"/></g>`;
  const FRONT = [
    ["neck", `<rect x="46" y="24" width="8" height="7" rx="2"/>`],
    ["traps", `<path d="M44 31 L37 34.5 L44.5 35.5 Z"/><path d="M56 31 L63 34.5 L55.5 35.5 Z"/>`],
    ["shoulders", L(31, 40, 6.5, 6.5) + L(69, 40, 6.5, 6.5)],
    ["chest", `<path d="M36 38 Q44 35 49.5 38 L49.5 52 Q42 55 35 50 Z"/><path d="M64 38 Q56 35 50.5 38 L50.5 52 Q58 55 65 50 Z"/>`],
    ["biceps", pair((s) => L(mx(26.8, s), 55, 4.4, 9, 12 * s))],
    ["forearms", pair((s) => L(mx(21.8, s), 86, 3.8, 12, 7 * s))],
    ["abs", `<rect x="43.5" y="56" width="13" height="32" rx="4"/>`],
    ["obliques", L(38, 72, 4, 12) + L(62, 72, 4, 12)],
    ["abductors", L(36.5, 93, 4, 6) + L(63.5, 93, 4, 6)],
    ["adductors", L(46, 110, 3.2, 11) + L(54, 110, 3.2, 11)],
    ["quads", L(39.5, 120, 6.5, 19) + L(60.5, 120, 6.5, 19)],
    ["calves", L(39, 166, 4.5, 15) + L(61, 166, 4.5, 15)],
  ];
  const BACK = [
    ["neck", `<rect x="46" y="24" width="8" height="7" rx="2"/>`],
    ["traps", `<path d="M50 27 L38 35 L50 58 L62 35 Z"/>`],
    ["shoulders", L(31, 40, 6.5, 6.5) + L(69, 40, 6.5, 6.5)],
    ["back", `<path d="M36 39 L47 47 L47 74 Q39 71 34 60 Z"/><path d="M64 39 L53 47 L53 74 Q61 71 66 60 Z"/>`],
    ["triceps", pair((s) => L(mx(26.8, s), 55, 4.4, 9, 12 * s))],
    ["forearms", pair((s) => L(mx(21.8, s), 86, 3.8, 12, 7 * s))],
    ["lowerback", `<rect x="44" y="74" width="12" height="17" rx="3"/>`],
    ["abductors", L(36, 89, 4, 5) + L(64, 89, 4, 5)],
    ["glutes", L(43, 100, 7.5, 8) + L(57, 100, 7.5, 8)],
    ["hamstrings", L(40, 127, 6, 17) + L(60, 127, 6, 17)],
    ["calves", L(39.5, 162, 5.5, 13) + L(60.5, 162, 5.5, 13)],
  ];
  const FRONT_SET = new Set(FRONT.map((x) => x[0])), BACK_SET = new Set(BACK.map((x) => x[0]));
  const fillFor = (v) => (v > 0 ? `style="fill:color-mix(in srgb, var(--accent) ${Math.round(25 + 75 * clamp(v, 0, 1))}%, var(--card-3))"` : "");
  function bodySvg(parts, heat, label) {
    return `<svg viewBox="0 0 100 ${label ? 206 : 198}" role="img" aria-label="${esc(label || "Muscles")}">${SIL}${parts.map(([m, shp]) => `<g class="m" data-m="${m}" ${fillFor(heat[m] || 0)}><title>${esc(D.MUSCLES[m] || m)}</title>${shp}</g>`).join("")}${label ? `<text class="lbl-fb" x="50" y="204">${esc(label)}</text>` : ""}</svg>`;
  }
  function bodyMap(heat, opts = {}) {
    if (opts.side === "auto") {
      const keys = Object.keys(heat).filter((k) => heat[k] >= 1);
      const back = keys.some((k) => BACK_SET.has(k) && !FRONT_SET.has(k));
      return `<div class="bodymap mini-map">${bodySvg(back ? BACK : FRONT, heat)}</div>`;
    }
    return `<div class="bodymap">${bodySvg(FRONT, heat, "Front")}${bodySvg(BACK, heat, "Back")}</div>`;
  }
  function exHeat(ex) {
    const h = {};
    if (ex.muscle === "fullbody") ["chest", "back", "shoulders", "quads", "glutes", "hamstrings", "abs", "traps", "biceps", "triceps"].forEach((m) => (h[m] = 0.55));
    (ex.secondary || []).forEach((m) => { if (m === "fullbody") return; h[m] = Math.max(h[m] || 0, 0.4); });
    if (ex.muscle !== "fullbody") h[ex.muscle] = 1;
    if (ex.muscle === "cardio" && !(ex.secondary || []).length) ["quads", "calves", "hamstrings"].forEach((m) => (h[m] = 0.4));
    return h;
  }
  function heatSince(since) {
    const raw = {};
    for (const w of derived.workouts) {
      if ((w.start || 0) < since) break;
      for (const it of w.items || []) {
        const n = (it.sets || []).filter(counts).length; if (!n) continue;
        const h = exHeat(exById(it.ex, it.name));
        for (const m in h) raw[m] = (raw[m] || 0) + n * (h[m] >= 1 ? 1 : 0.5);
      }
    }
    return raw;
  }
  const normHeat = (raw) => { const max = Math.max(1, ...Object.values(raw)); const h = {}; for (const m in raw) h[m] = raw[m] / max; return h; };

  // ===================================================================
  // charts (one series each: a bar chart and a line chart, with hover)
  // ===================================================================
  const charts = {};
  let chartN = 0;
  const niceMax = (v) => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
  const shortNum = (v) => (v >= 10000 ? Math.round(v / 1000) + "k" : v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(Math.round(v * 10) / 10));
  // A chart is a placeholder until bindCharts() draws it at the width it
  // actually has, so text stays the same size on a phone and a big screen.
  function barChart(data, { h = 170, label = "", int = false } = {}) {
    const id = "c" + (++chartN);
    charts[id] = { kind: "bar", data, h, label, int };
    return `<div class="chart" data-chart="${id}" style="min-height:${h}px"></div>`;
  }
  function lineChart(points, { h = 190, label = "", fmt = shortNum } = {}) {
    if (!points.length) return `<div class="empty" style="padding:30px">Nothing to show yet.</div>`;
    const id = "c" + (++chartN);
    charts[id] = { kind: "line", points, h, label, fmt };
    return `<div class="chart" data-chart="${id}" style="min-height:${h}px"></div>`;
  }
  function drawBar(c, W) {
    const { data, h } = c, top = 10, bot = 22, left = 34, right = 6;
    let max = niceMax(Math.max(...data.map((d) => d.v), 0));
    if (c.int) max = Math.max(2, Math.ceil(max / 2) * 2);
    const ih = h - top - bot, iw = W - left - right, bw = iw / data.length;
    const y = (v) => top + ih - (v / max) * ih;
    const every = Math.ceil(data.length / Math.max(1, Math.floor(iw / 56)));
    let g = "";
    for (let i = 0; i <= 2; i++) { const v = (max / 2) * i, yy = y(v); g += `<line class="grid-l" x1="${left}" x2="${W - right}" y1="${yy}" y2="${yy}"/><text class="ax" x="${left - 6}" y="${yy + 3.5}" text-anchor="end">${shortNum(v)}</text>`; }
    const pts = [];
    data.forEach((d, i) => {
      const x = left + i * bw, w = Math.max(2, Math.min(28, bw - 4)), bx = x + (bw - w) / 2, by = y(d.v), bh = top + ih - by, r = Math.min(4, bh, w / 2);
      if (d.v > 0) g += `<path class="bar" d="M${bx} ${top + ih}V${by + r}q0 -${r} ${r} -${r}h${w - 2 * r}q${r} 0 ${r} ${r}V${top + ih}z"/>`;
      if (d.l && (data.length - 1 - i) % every === 0) g += `<text class="ax" x="${x + bw / 2}" y="${h - 6}" text-anchor="middle">${esc(d.l)}</text>`;
      g += `<rect class="hit" data-i="${i}" x="${x}" y="${top}" width="${bw}" height="${ih}"/>`;
      pts.push({ x: x + bw / 2, y: Math.min(by, top + ih - 2), tip: d.tip });
    });
    return { g, pts };
  }
  function drawLine(c, W) {
    const { points, h, fmt } = c, top = 12, bot = 22, left = 44, right = 10;
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
    let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= DAY * 3; x1 += DAY * 3; }
    let y0 = Math.min(...ys), y1 = Math.max(...ys); const pad = (y1 - y0) * 0.15 || Math.max(1, y1 * 0.1); y0 = Math.max(0, y0 - pad); y1 = y1 + pad;
    const ih = h - top - bot, iw = W - left - right;
    const X = (v) => left + ((v - x0) / (x1 - x0)) * iw, Y = (v) => top + ih - ((v - y0) / (y1 - y0)) * ih;
    let g = "";
    for (let i = 0; i <= 3; i++) { const v = y0 + ((y1 - y0) / 3) * i, yy = Y(v); g += `<line class="grid-l" x1="${left}" x2="${W - right}" y1="${yy}" y2="${yy}"/><text class="ax" x="${left - 6}" y="${yy + 3.5}" text-anchor="end">${esc(fmt(v))}</text>`; }
    const fmtX = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    g += `<text class="ax" x="${left}" y="${h - 6}">${fmtX(x0)}</text><text class="ax" x="${W - right}" y="${h - 6}" text-anchor="end">${fmtX(x1)}</text>`;
    const P = points.map((p) => [X(p.x), Y(p.y)]);
    const d = P.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
    if (P.length > 1) g += `<path class="ar" d="${d}L${P[P.length - 1][0]} ${top + ih}L${P[0][0]} ${top + ih}Z"/><path class="ln" d="${d}"/>`;
    if (P.length <= iw / 12) P.forEach((p) => (g += `<circle class="dot" cx="${p[0]}" cy="${p[1]}" r="4"/>`));
    else g += `<circle class="dot" cx="${P[P.length - 1][0]}" cy="${P[P.length - 1][1]}" r="4"/>`;
    g += `<line class="xh" x1="0" x2="0" y1="${top}" y2="${top + ih}" style="display:none"/><circle class="dot hov" r="5" style="display:none"/>`;
    g += `<rect class="hit" x="${left}" y="${top}" width="${iw}" height="${ih}"/>`;
    return { g, pts: points.map((p, i) => ({ x: P[i][0], y: P[i][1], tip: p.tip })) };
  }
  function drawChart(el) {
    const c = charts[el.dataset.chart]; if (!c) return;
    const W = Math.max(200, Math.round(el.clientWidth || 560));
    if (c.W === W && el.querySelector("svg")) return;
    const { g, pts } = c.kind === "bar" ? drawBar(c, W) : drawLine(c, W);
    c.W = W; c.pts = pts;
    el.innerHTML = `<svg width="${W}" height="${c.h}" viewBox="0 0 ${W} ${c.h}" role="img" aria-label="${esc(c.label)}">${g}</svg>`;
  }
  function bindCharts(root) {
    $$("[data-chart]", root).forEach((el) => {
      const c = charts[el.dataset.chart]; if (!c) return;
      drawChart(el);
      let tip = null;
      const svgOf = () => el.querySelector("svg");
      const show = (p) => {
        if (!tip || !tip.isConnected) { tip = document.createElement("div"); tip.className = "tip"; el.appendChild(tip); }
        tip.innerHTML = p.tip; tip.style.left = clamp(p.x, 60, c.W - 60) + "px"; tip.style.top = p.y + "px"; tip.style.display = "";
        if (c.kind === "line") {
          const svg = svgOf(), xh = svg.querySelector(".xh"), hv = svg.querySelector(".hov");
          xh.setAttribute("x1", p.x); xh.setAttribute("x2", p.x); xh.style.display = ""; hv.setAttribute("cx", p.x); hv.setAttribute("cy", p.y); hv.style.display = "";
        }
      };
      const hide = () => { if (tip) tip.style.display = "none"; const svg = svgOf(); if (svg && c.kind === "line") { svg.querySelector(".xh").style.display = "none"; svg.querySelector(".hov").style.display = "none"; } };
      const move = (e) => {
        const svg = svgOf(); if (!svg) return;
        const r = svg.getBoundingClientRect(), cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        if (c.kind === "line") { let best = c.pts[0]; for (const p of c.pts) if (Math.abs(p.x - cx) < Math.abs(best.x - cx)) best = p; show(best); }
        else { const t = e.target.closest(".hit"); if (t) show(c.pts[+t.dataset.i]); else hide(); }
      };
      el.addEventListener("mousemove", move); el.addEventListener("touchstart", move, { passive: true }); el.addEventListener("touchmove", move, { passive: true });
      el.addEventListener("mouseleave", hide);
    });
  }
  let resizeT = null;
  addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => $$("[data-chart]").forEach(drawChart), 150); });

  // ===================================================================
  // modals & menus
  // ===================================================================
  const modalStack = [];
  function openModal(renderFn, wide) { modalStack.push({ renderFn, wide }); paintModal(); }
  function paintModal() {
    const top = modalStack[modalStack.length - 1];
    const ov = $("#modalOv"), m = $("#modal");
    if (!top) { ov.classList.remove("open"); m.innerHTML = ""; document.body.style.overflow = ""; return; }
    m.className = "modal" + (top.wide ? " wide" : "");
    m.innerHTML = "";
    ov.classList.add("open"); document.body.style.overflow = "hidden";
    top.renderFn(m);
    bindCharts(m);
  }
  function closeModal() { modalStack.pop(); paintModal(); }
  function closeAllModals() { modalStack.length = 0; paintModal(); }
  const refreshModal = () => paintModal();
  $("#modalOv").addEventListener("mousedown", (e) => { if (e.target.id === "modalOv") closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if ($("#menu").classList.contains("open")) closeMenu(); else if (modalStack.length) closeModal(); }
  });
  function modalShell(m, { title, sub, body, foot }) {
    m.innerHTML = `<div class="modal-h"><div style="flex:1;min-width:0"><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div><button class="icon-btn" data-x type="button" aria-label="Close">${I("x", 20)}</button></div>
      <div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ""}`;
    m.querySelector("[data-x]").onclick = closeModal;
  }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise((res) => {
      openModal((m) => {
        modalShell(m, { title: esc(title), body: `<p style="margin:0;color:var(--text-2)">${esc(text)}</p>`, foot: `<button class="btn" data-no type="button">Cancel</button><button class="btn ${danger ? "danger" : "primary"}" data-ok type="button">${esc(okLabel)}</button>` });
        m.querySelector("[data-x]").onclick = () => { closeModal(); res(false); };
        m.querySelector("[data-no]").onclick = () => { closeModal(); res(false); };
        m.querySelector("[data-ok]").onclick = () => { closeModal(); res(true); };
      });
    });
  }
  function openMenu(anchor, items) {
    const m = $("#menu");
    m.innerHTML = items.map((it, i) => (it === "-" ? "<hr>" : `<button type="button" data-i="${i}" class="${it.danger ? "danger" : ""}">${it.icon ? I(it.icon, 16) : ""}${esc(it.label)}</button>`)).join("");
    m.classList.add("open");
    const r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    m.style.left = clamp(r.right - mw, 8, innerWidth - mw - 8) + "px";
    m.style.top = (r.bottom + mh + 8 > innerHeight ? Math.max(8, r.top - mh - 6) : r.bottom + 6) + "px";
    m.onclick = (e) => { const b = e.target.closest("[data-i]"); if (!b) return; closeMenu(); items[+b.dataset.i].run(); };
  }
  function closeMenu() { $("#menu").classList.remove("open"); }
  document.addEventListener("mousedown", (e) => { if (!e.target.closest("#menu") && !e.target.closest("[data-menu]")) closeMenu(); });

  // ===================================================================
  // router
  // ===================================================================
  const ROUTES = ["today", "workout", "exercises", "routines", "history", "progress", "body"];
  function currentRoute() { const p = (location.hash || "").replace(/^#\/?/, "").split("/"); return { name: ROUTES.includes(p[0]) ? p[0] : "today", arg: decodeURIComponent(p[1] || "") }; }
  function go(name, arg) { const h = "#/" + name + (arg ? "/" + encodeURIComponent(arg) : ""); if (location.hash === h) render(); else location.hash = h; }
  // A new page (a tab, or the phone's Back button) closes anything open over the old one.
  addEventListener("hashchange", () => { closeMenu(); if (modalStack.length) closeAllModals(); render(); scrollTo(0, 0); });

  // Where the sticky header and tab row end, so bars that stick under them
  // (exercise search, the workout's timer bar) sit below, not behind, them.
  function measureStick() {
    const t = $(".kpr-tabs"), h = $(".kpr-hdr");
    const tabsOn = t && getComputedStyle(t).display !== "none";
    const bottom = tabsOn ? t.getBoundingClientRect().height + (parseFloat(getComputedStyle(t).top) || 0) : (h ? h.getBoundingClientRect().height : 60);
    document.documentElement.style.setProperty("--stick-top", Math.round(bottom) + "px");
  }
  addEventListener("resize", measureStick);
  // The workout's mini demos: one timer for all of them, start ↔ end. Off
  // when the device asks for less motion, and while the page is hidden.
  setInterval(() => {
    if (document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.getAttribute("data-kpr-motion") === "calm") return;
    $$(".exb-demo").forEach((d) => d.classList.toggle("end"));
  }, 1100);
  // On a phone the tab row scrolls sideways: keep the open page's tab in view.
  function showTab() {
    const t = $(".kpr-tabs"), on = t && t.querySelector(".on");
    if (!on || t.scrollWidth <= t.clientWidth) return;
    const l = on.offsetLeft - t.offsetLeft, r = l + on.offsetWidth;
    if (l < t.scrollLeft + 8) t.scrollLeft = Math.max(0, l - 16);
    else if (r > t.scrollLeft + t.clientWidth - 8) t.scrollLeft = r - t.clientWidth + 16;
  }
  function render() {
    const r = currentRoute();
    const tab = { history: "progress", body: "progress" }[r.name] || r.name;
    $$(".kpr-tabs [data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === tab));
    measureStick(); showTab();
    tickFab();
    const v = $("#view");
    if (!me || !loaded) { v.innerHTML = `<div class="grid"><div class="skel"></div><div class="skel"></div></div>`; return; }
    if (loadErr) {
      v.innerHTML = `<div class="card empty"><b>Couldn't load your fitness data</b>${loadErr.code === "permission-denied" ? "You don't have access to KPR Fitness yet. Ask an admin to give you access." : esc(loadErr.message || "Check your connection and try again.")}<p><button class="btn primary" onclick="location.reload()" type="button">Try again</button></p></div>`;
      return;
    }
    v.onclick = null;
    ({ today: viewToday, workout: viewWorkout, exercises: viewExercises, routines: viewRoutines, history: viewHistory, progress: viewProgress, body: viewBody })[r.name](v, r.arg);
    bindCharts(v);
  }

  // ===================================================================
  // Today
  // ===================================================================
  function weekStats() {
    const ws = weekStart(Date.now());
    const days = Array.from({ length: 7 }, (_, i) => ({ t: ws + i * DAY, n: 0 }));
    for (const w of derived.workouts) { if (w.start < ws) break; const i = Math.round((new Date(w.start).setHours(0, 0, 0, 0) - ws) / DAY); if (days[i]) days[i].n++; }
    const count = derived.workouts.filter((w) => w.start >= ws).length;
    // weeks in a row that hit the goal (this week counts once it's hit)
    let streak = 0;
    const goal = Math.max(1, S.goal || 1);
    const perWeek = new Map();
    for (const w of derived.workouts) { const k = weekStart(w.start); perWeek.set(k, (perWeek.get(k) || 0) + 1); }
    let k = ws;
    if ((perWeek.get(k) || 0) >= goal) streak++;
    // DST-safe step back one week
    const prevWeek = (t) => weekStart(t - 3 * DAY);
    k = prevWeek(k);
    while ((perWeek.get(k) || 0) >= goal) { streak++; k = prevWeek(k); }
    return { days, count, streak, goal };
  }
  function ring(value, goal) {
    const r = 54, c = 2 * Math.PI * r, f = clamp(goal ? value / goal : 0, 0, 1);
    return `<div class="ring"><svg width="132" height="132" viewBox="0 0 132 132"><circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--card-3)" stroke-width="12"/><circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}"/></svg><div><b>${value}<span style="font-size:15px;color:var(--muted)">/${goal}</span></b><span>this week</span></div></div>`;
  }
  const QUOTES = ["Small steps, every day.", "Show up. The rest follows.", "Strong is built one set at a time.", "Progress, not perfection.", "Your only competition is yesterday's you.", "Motion is lotion.", "Done is better than perfect.", "Consistency beats intensity."];
  // The next workout in the plan the person is following: the routine after
  // the last one they did from a program, round and round.
  function upNext() {
    const w = derived.workouts.find((x) => x.routine);
    if (!w) return null;
    const g = D.GOALS.find((x) => x.routines.includes(w.routine));
    if (g) { const i = g.routines.indexOf(w.routine); return { r: findRoutine(g.routines[(i + 1) % g.routines.length]), goal: g }; }
    const mine = derived.routines.find((r) => r.id === w.routine);
    return mine ? { r: mine } : null;
  }
  const goalCards = () => `<div class="goals">${D.GOALS.map((g) => `<a class="goal-card" href="#/routines/${esc(g.id)}">
      <span class="goal-ic" aria-hidden="true">${g.icon}</span>
      <span class="goal-t"><b>${esc(g.name)}</b><small>${esc(g.tagline)}</small></span>
      <span class="goal-n">${g.routines.length} workout${g.routines.length === 1 ? "" : "s"} ${I("right", 14)}</span>
    </a>`).join("")}</div>`;
  const upNextCard = (n) => (n && n.r ? `<div class="upnext"><div class="grow"><small>Up next${n.goal ? " · " + esc(n.goal.name) : ""}</small><b>${esc(n.r.name)}</b></div><button class="btn primary" data-start-r="${esc(n.r.id)}" type="button">${I("play", 14)} Start</button></div>` : "");
  function viewToday(v) {
    const ws = weekStats(), name = ((me && me.displayName) || "").split(" ")[0];
    const h = new Date().getHours();
    const hello = (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening") + (name ? ", " + esc(name) : "");
    // First visit: one question, not a page of zeros.
    if (!derived.workouts.length && !active) {
      v.innerHTML = `<div class="card hero" style="grid-template-columns:1fr"><div>
          <h1>${hello} 👋</h1>
          <p style="margin:0">Pick what you want to achieve. You'll get a ready-made plan: each workout has how-to demos, a warm-up, and remembers your numbers for next time.</p>
        </div></div>
        <div class="sec-t">What's your goal?</div>
        ${goalCards()}
        <div class="row" style="justify-content:center;margin-top:18px"><button class="btn" data-act="start" type="button">${I("plus", 16)} Or start an empty workout</button></div>`;
      bindCommon(v);
      return;
    }
    const next = !active && upNext();
    const quote = QUOTES[Math.floor(Date.now() / DAY) % QUOTES.length];
    const last = derived.workouts[0];
    const month = derived.workouts.filter((w) => w.start >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()).length;
    const heat = normHeat(heatSince(Date.now() - 7 * DAY));
    const routines = derived.routines.slice(0, 3).concat(D.ROUTINES.slice(0, Math.max(0, 4 - derived.routines.length)));
    const todayKey = ymd(Date.now());
    v.innerHTML = `
      <div class="card hero">
        <div>
          <h1>${hello}</h1>
          <p>${esc(quote)} ${ws.count >= ws.goal ? "You've hit this week's goal — nice." : `${ws.goal - ws.count} more workout${ws.goal - ws.count === 1 ? "" : "s"} to hit this week's goal.`}</p>
          <div class="row">
            ${active ? `<button class="btn primary lg" data-act="resume" type="button">${I("play")} Resume workout</button>`
              : next && next.r ? `<button class="btn primary lg" data-start-r="${esc(next.r.id)}" type="button">${I("play")} Start ${esc(next.r.name)}</button>`
              : `<a class="btn primary lg" href="#/routines">${I("play")} Pick a workout</a>`}
            ${active ? "" : `<a class="btn lg" href="#/workout">Other workout</a>`}
          </div>
          ${next && next.r ? `<p style="margin:10px 0 0;font-size:13px">Up next${next.goal ? " in <b>" + esc(next.goal.name) + "</b>" : ""}, after your last workout.</p>` : ""}
        </div>
        ${ring(ws.count, ws.goal)}
      </div>
      ${active ? todayWorkoutCard() : ""}
      <div class="card" style="margin-top:16px">
        <div class="week">${ws.days.map((d) => `<div class="day ${d.n ? "done" : ""} ${ymd(d.t) === todayKey ? "today" : ""}">${new Date(d.t).toLocaleDateString(undefined, { weekday: "narrow" })}<i>${d.n ? I("check", 16) : ""}</i></div>`).join("")}</div>
      </div>
      <div class="grid g4" style="margin-top:16px">
        <div class="card stat"><span>Week streak</span><b>${ws.streak}</b><small>${ws.streak === 1 ? "week" : "weeks"} hitting ${ws.goal}/week</small></div>
        <div class="card stat"><span>This month</span><b>${month}</b><small>workouts</small></div>
        <div class="card stat"><span>All time</span><b>${derived.workouts.length}</b><small>workouts logged</small></div>
        <div class="card stat"><span>Records</span><b>${derived.prs.length}</b><small>personal bests set</small></div>
      </div>
      <div class="grid g3" style="margin-top:16px">
        <div class="card"><div class="card-h"><h3>Muscles this week</h3><span class="sub">last 7 days</span></div>
          ${Object.keys(heat).length ? bodyMap(heat) + `<div class="legend"><span><i style="background:color-mix(in srgb, var(--accent) 35%, var(--card-3))"></i>A little</span><span><i style="background:var(--accent)"></i>A lot</span></div>` : `<div class="empty" style="padding:30px 10px">${bodyMap({})}<p>Log a workout to see which muscles you've trained.</p></div>`}
        </div>
        <div class="card"><div class="card-h"><h3>Last workout</h3>${last ? `<a class="sub" href="#/history">All history</a>` : ""}</div>
          ${last ? workoutSummary(last, true) : `<div class="empty" style="padding:30px 10px"><b>No workouts yet</b>Start one and it shows up here.</div>`}
        </div>
        <div class="card"><div class="card-h"><h3>Recent records</h3>${derived.prs.length ? `<a class="sub" href="#/progress">Progress</a>` : ""}</div>
          ${derived.prs.length ? `<div class="list">${derived.prs.slice(0, 5).map((p) => `<button class="item" style="padding:10px" data-ex="${esc(p.exId)}" type="button"><span style="color:var(--warn)">${I("trophy")}</span><span class="t"><b style="font-size:13.5px">${esc(p.name)}</b><p>${esc(setText(p.track, p.set))} · ${fmtDate(p.w.start, { month: "short", day: "numeric" })}</p></span></button>`).join("")}</div>` : `<div class="empty" style="padding:30px 10px"><b>No records yet</b>Beat your best set on any exercise and it shows here.</div>`}
        </div>
      </div>
      <div class="sec-t">Quick start</div>
      <div class="grid rgrid">${routines.map((r) => routineCard(r, true)).join("")}</div>`;
    bindCommon(v);
  }
  // The workout in progress on Today (the AI coach can add to it too).
  function todayWorkoutCard() {
    const items = active.items.filter((it) => !it.warm);
    return `<div class="card" style="margin-top:16px"><div class="card-h"><h3>Today's workout</h3><button class="btn primary sm" data-act="resume" type="button">${I("play", 14)} Resume</button></div>
      ${items.length ? `<ul class="exlist">${items.map((it) => { const ex = exById(it.ex, it.name); return `<li><button class="rx" type="button" data-ex="${esc(ex.id)}">${demoThumb(ex)}<span>${esc(ex.name)}</span></button><span class="rx-n">${it.sets.filter((s) => s.done).length}/${it.sets.length} sets</span></li>`; }).join("")}</ul>`
        : `<p class="muted" style="margin:0">No exercises yet. Add some, or ask the AI Coach what to do.</p>`}</div>`;
  }
  function workoutSummary(w, compact) {
    const vol = workoutVolume(w);
    return `<button class="item" data-w="${esc(w.id)}" type="button" style="${compact ? "border:0;padding:0;background:none" : ""}">
      <span class="datebox"><b>${new Date(w.start).getDate()}</b><span>${new Date(w.start).toLocaleDateString(undefined, { month: "short" })}</span></span>
      <span class="t"><b>${esc(w.name || "Workout")}</b><p>${fmtDate(w.start)} · ${new Date(w.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
        <span class="meta"><span>${I("timer", 14)} ${fmtDur((w.end || w.start) - w.start)}</span>${vol ? `<span>${volShow(vol)}</span>` : ""}<span>${plural(workoutSets(w), "set")}</span></span>
        <ul class="exlist">${(w.items || []).slice(0, compact ? 4 : 6).map((it) => `<li>${(it.sets || []).filter(counts).length} × ${esc(exById(it.ex, it.name).name)}</li>`).join("")}${(w.items || []).length > (compact ? 4 : 6) ? `<li class="muted">+${(w.items || []).length - (compact ? 4 : 6)} more</li>` : ""}</ul>
      </span></button>`;
  }
  function routineCard(r, small) {
    return `<div class="card routine">
      <div class="card-h" style="margin:0"><h3>${esc(r.name)}</h3>${r.builtin ? `<span class="tag">${esc(r.level || "Program")}</span>` : `<button class="icon-btn sm" data-menu data-rmenu="${esc(r.id)}" type="button" aria-label="More">${I("more", 16)}</button>`}</div>
      ${r.about || r.notes ? `<p class="muted" style="margin:0;font-size:12.5px">${esc(r.about || r.notes)}</p>` : ""}
      <ul class="exlist">${(r.items || []).slice(0, small ? 4 : 8).map((x) => { const ex = exById(x.ex); return `<li><button class="rx" type="button" data-ex="${esc(ex.id)}" title="How to do ${esc(ex.name)}">${demoThumb(ex)}<span>${esc(ex.name)}</span></button><span class="rx-n">${x.sets} × ${ex.track === "t" ? x.reps + "s" : ex.track === "dt" ? "–" : x.reps || "–"}</span></li>`; }).join("")}${(r.items || []).length > (small ? 4 : 8) ? `<li class="muted"><span>+${r.items.length - (small ? 4 : 8)} more</span></li>` : ""}</ul>
      <div class="row" style="margin-top:4px"><button class="btn primary sm grow" data-start-r="${esc(r.id)}" type="button">${I("play", 14)} Start</button>${r.builtin && !small ? `<button class="btn sm" data-copy-r="${esc(r.id)}" type="button">${I("copy", 14)} Copy</button>` : ""}</div>
    </div>`;
  }
  // A small still of an exercise's demo (or a plain dot when it has none),
  // beside its name in routine cards; tapping the name opens the full demo.
  // Drawn demos have their own thumbnail (t.jpg), cropped to the figure, so
  // it reads at this size; photos use their start frame.
  const demoSrc = (ex) => `demos/${encodeURIComponent(ex.id)}/${ex.drawn ? "t" : "0"}.jpg`;
  const demoThumb = (ex) => (ex.demo ? `<img class="rx-img" src="${demoSrc(ex)}" alt="" loading="lazy" decoding="async" />` : `<i class="rx-img rx-none">${I("info", 13)}</i>`);
  const findRoutine = (id) => derived.routines.find((r) => r.id === id) || D.ROUTINES.find((r) => r.id === id);
  // Clicks shared by several views.
  function bindCommon(root) {
    root.onclick = (e) => {
      const t = e.target.closest("[data-act],[data-w],[data-ex],[data-start-r],[data-copy-r],[data-rmenu]");
      if (!t || !root.contains(t)) return;
      if (t.dataset.act === "start") startWorkout();
      else if (t.dataset.act === "resume") go("workout");
      else if (t.dataset.w) workoutDetail(t.dataset.w);
      else if (t.dataset.ex) exerciseDetail(t.dataset.ex);
      else if (t.dataset.startR) { const r = findRoutine(t.dataset.startR); if (r) startRoutine(r); }
      else if (t.dataset.copyR) { const r = findRoutine(t.dataset.copyR); if (r) routineEditor({ name: r.name, notes: r.about || "", items: clone(r.items) }); }
      else if (t.dataset.rmenu) {
        const r = findRoutine(t.dataset.rmenu); if (!r) return;
        openMenu(t, [
          { label: "Edit", icon: "edit", run: () => routineEditor(Object.assign({}, clone(r), { id: r.id })) },
          { label: "Duplicate", icon: "copy", run: () => routineEditor({ name: r.name + " (copy)", notes: r.notes || "", items: clone(r.items || []) }) },
          "-",
          { label: "Delete", icon: "trash", danger: true, run: async () => { if (await confirmBox("Delete routine?", `“${r.name}” will be deleted. Workouts you did with it stay in your history.`, "Delete", true)) { removeDoc(r.id); toast("Routine deleted"); } } },
        ]);
      }
    };
  }

  // ===================================================================
  // Workout (the logger)
  // ===================================================================
  function viewWorkout(v) {
    if (!active) {
      const recent = derived.workouts.slice(0, 3);
      v.innerHTML = `<div class="page-h"><div class="grow"><h1>Start a workout</h1></div></div>
        ${upNextCard(upNext())}
        <div class="grid g2">
          <div class="card" style="display:grid;gap:10px;align-content:start">
            <a class="btn primary lg" href="#/routines">${I("play")} Choose a program</a>
            <button class="btn lg" data-act="start" type="button">${I("plus")} Start empty workout</button>
            <button class="btn ghost sm" data-act="log" type="button">Log a workout I already did</button>
          </div>
          ${recent.length ? `<div class="card"><div class="card-h"><h3>Do one again</h3></div>
            <div class="list">${recent.map((w) => `<div class="row" style="flex-wrap:nowrap"><div class="grow">${workoutSummary(w, true)}</div><button class="btn sm" data-repeat="${esc(w.id)}" type="button">${I("repeat", 14)} Again</button></div>`).join("")}</div>
          </div>` : ""}
        </div>
        ${derived.routines.length ? `<div class="sec-t">My routines</div><div class="grid rgrid">${derived.routines.map((r) => routineCard(r, true)).join("")}</div>` : ""}`;
      bindCommon(v);
      const base = v.onclick;
      v.onclick = (e) => {
        const rp = e.target.closest("[data-repeat]"); if (rp) { const w = derived.workouts.find((x) => x.id === rp.dataset.repeat); if (w) repeatWorkout(w); return; }
        const lg = e.target.closest('[data-act="log"]'); if (lg) { startWorkout({ name: "Workout" }); active.start = Date.now() - 3600000; active.past = true; persistActive(); render(); toast("Add what you did, then set the date when you finish."); return; }
        base(e);
      };
      return;
    }
    const a = active;
    const done = a.items.reduce((n, it) => n + (it.warm ? 0 : it.sets.filter((s) => s.done).length), 0);
    const warms = a.items.filter((it) => it.warm), mains = a.items.filter((it) => !it.warm);
    const warmHtml = warms.length
      ? `<div class="wk-sec warm"><div class="grow"><b>🤸 Warm-up</b><small>About 5 minutes of moving stretches for the muscles in this workout. Tick each one as you go.</small></div><button class="btn ghost sm" id="wkSkipWarm" type="button">Skip warm-up</button></div>
         ${warms.map((it) => warmRow(it)).join("")}
         ${mains.length ? `<div class="wk-sec"><div class="grow"><b>💪 Workout</b></div></div>` : ""}`
      : mains.length && !a.editingId ? `<div class="row" style="margin:-4px 0 12px"><button class="btn ghost sm" id="wkAddWarm" type="button">🤸 Add warm-up stretches</button></div>` : "";
    v.innerHTML = `
      <div class="wk-top">
        <input class="wk-name" id="wkName" value="${esc(a.name)}" aria-label="Workout name" maxlength="120" />
        <div class="wk-stats">
          <div>${a.editingId ? "Editing" : a.past ? "Logging" : "Time"}<b id="wkTime">${a.editingId ? fmtDate(a.start, { month: "short", day: "numeric" }) : a.past ? "Past workout" : fmtClock((Date.now() - a.start) / 1000)}</b></div>
          <div>Volume<b id="wkVol">${volShow(liveVolume())}</b></div>
          <div>Sets<b id="wkSets">${done}</b></div>
        </div>
        <button class="icon-btn" data-menu id="wkMenu" type="button" aria-label="Workout options">${I("more")}</button>
        <button class="btn primary" id="wkFinish" type="button">${a.editingId ? "Save" : "Finish"}</button>
      </div>
      <div id="wkItems">${warmHtml}${derived.workouts.length || a.editingId || !mains.length ? "" : `<p class="wk-hint">💡 Type the weight and reps you did, then tap ✓. Grey numbers are suggestions: ✓ uses them if you leave the box empty. Tap a picture to see how it's done.</p>`}${mains.map((it) => itemBlock(it)).join("")}</div>
      ${a.items.length ? "" : `<div class="card empty"><b>No exercises yet</b>Add the exercises you're doing. Each one remembers what you did last time.</div>`}
      <div class="row" style="margin:14px 0"><button class="btn primary block lg" id="wkAdd" type="button">${I("plus")} Add exercises</button></div>
      <label class="lbl" for="wkNotes">Notes</label>
      <textarea class="textarea" id="wkNotes" maxlength="5000" placeholder="How did it feel?">${esc(a.notes || "")}</textarea>
      <div class="row" style="margin-top:18px;justify-content:center"><button class="btn ghost danger" id="wkDiscard" type="button">${a.editingId ? "Cancel editing" : "Discard workout"}</button></div>`;
    bindWorkout(v);
  }
  // Last time's set to show beside set i: warm-ups line up with warm-ups,
  // working sets with working sets.
  function prevFor(prev, sets, i) {
    const warm = (x) => x.k === "w";
    const kind = warm(sets[i]);
    const nth = sets.slice(0, i).filter((x) => warm(x) === kind).length;
    return prev.filter((x) => warm(x) === kind)[nth] || null;
  }
  function liveVolume() { let n = 0; for (const it of active.items) for (const s of it.sets) if (s.done && s.k !== "w" && s.w && s.r) n += s.w * s.r; return n; }
  const demoMini = (ex) => (ex.demo ? `<button class="exb-demo${ex.drawn ? " drawn" : ""}" data-how="${esc(ex.id)}" type="button" aria-label="How to do ${esc(ex.name)}" title="How to do it"><img class="f0" src="demos/${encodeURIComponent(ex.id)}/0.jpg" alt="" decoding="async" /><img class="f1" src="demos/${encodeURIComponent(ex.id)}/1.jpg" alt="" decoding="async" /></button>` : "");
  // A warm-up move is one line: picture, name, how much, tick.
  function warmRow(it) {
    const ex = exById(it.ex, it.name), s = it.sets[0] || {};
    const amt = s.tr ? (ex.track === "t" ? s.tr + " sec" : s.tr + " reps") : "";
    return `<div class="wrow${s.done ? " done" : ""}" data-item="${it.uid}">${demoMini(ex)}<button class="nm" data-how="${esc(it.ex)}" type="button">${esc(ex.name)}</button><span class="wt">${esc(amt)}</span><button class="ok" data-wtick="${it.uid}" type="button" aria-label="Done" aria-pressed="${!!s.done}">${I("check", 18)}</button></div>`;
  }
  const noteInput = (it) => `<input class="exb-note" data-note="${it.uid}" value="${esc(it.note || "")}" placeholder="Add a note" maxlength="300" />`;
  function itemBlock(it, idx) {
    if (it.warm) return warmRow(it);
    const ex = exById(it.ex, it.name), tr = ex.track, prev = lastSets(it.ex, active.editingId);
    const hasPrev = prev.length > 0;   // no history yet: no "Previous" column full of dashes
    const head = { wr: [wU(), "Reps"], r: ["+" + wU(), "Reps"], t: ["Time", ""], dt: [dU(), "Time"] }[tr];
    let n = 0;
    const rows = it.sets.map((s, i) => {
      const lab = s.k === "n" ? ++n : s.k.toUpperCase();
      const p = prevFor(prev, it.sets, i);
      const lastWork = prev.filter((x) => x.k !== "w").pop();
      const phW = p && p.w != null ? wShow(p.w) : s.k !== "w" && lastWork && lastWork.w != null ? wShow(lastWork.w) : "";
      const phR = s.tr && tr !== "t" ? s.tr : p && p.r != null ? p.r : "";
      const phT = tr === "t" ? (s.tr ? fmtClock(s.tr) : p && p.t != null ? fmtClock(p.t) : "") : p && p.t != null ? fmtClock(p.t) : "";
      const phD = p && p.d != null ? dShow(p.d) : "";
      const inp = (f, val, ph, mode) => `<td><input data-f="${f}" data-it="${it.uid}" data-si="${i}" value="${esc(val)}" placeholder="${esc(ph)}" inputmode="${mode}" aria-label="${f}" autocomplete="off"/></td>`;
      const cells = tr === "wr" ? inp("w", wShow(s.w), phW || "0", "decimal") + inp("r", s.r ?? "", phR, "numeric")
        : tr === "r" ? inp("w", wShow(s.w), "–", "decimal") + inp("r", s.r ?? "", phR, "numeric")
        : tr === "t" ? inp("t", s.t != null ? fmtClock(s.t) : "", phT || "0:00", "text") + "<td></td>"
        : inp("d", dShow(s.d), phD || "0", "decimal") + inp("t", s.t != null ? fmtClock(s.t) : "", phT || "0:00", "text");
      return `<tr class="${s.done ? "done" : ""}" data-row="${it.uid}:${i}"><td><button class="k ${s.k}" data-kind="${it.uid}:${i}" type="button" title="Tap to change set type: warm-up, normal, drop set, failure">${lab}</button>${!hasPrev && s.pr ? '<span class="pr-badge">PR</span>' : ""}</td>
        ${hasPrev ? `<td class="prev" data-prev="${it.uid}:${i}" title="Use last time's numbers">${esc(setText(tr, p)) || "–"}${s.pr ? '<span class="pr-badge">PR</span>' : ""}</td>` : ""}${cells}
        <td><button class="ok" data-ok="${it.uid}:${i}" type="button" aria-label="Done">${I("check", 16)}</button></td>
        <td><button class="icon-btn sm del" data-del="${it.uid}:${i}" type="button" aria-label="Remove set">${I("x", 14)}</button></td></tr>`;
    }).join("");
    return `<div class="exb${it.warm ? " warm" : ""}" data-item="${it.uid}">
      <div class="exb-h">${demoMini(ex)}<button class="nm" data-how="${esc(it.ex)}" type="button">${esc(ex.name)}</button>
        ${it.rest ? `<span class="tag">${I("timer", 12)} ${fmtClock(it.rest)}</span>` : ""}
        <button class="icon-btn sm" data-menu data-imenu="${it.uid}" type="button" aria-label="Exercise options">${I("more", 16)}</button></div>
      ${it.note ? noteInput(it) : ""}
      <table class="sets"><thead><tr><th>Set</th>${hasPrev ? "<th>Last time</th>" : ""}<th>${head[0]}</th><th>${head[1]}</th><th>${I("check", 13)}</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      <button class="btn ghost sm block" data-addset="${it.uid}" type="button" style="margin-top:6px">${I("plus", 14)} Add set</button>
    </div>`;
  }
  const findItem = (u) => active.items.find((x) => x.uid === u);
  const refOf = (k) => { const [u, i] = k.split(":"); const it = findItem(u); return it ? { it, s: it.sets[+i], i: +i } : null; };
  function paintLive() {
    const vol = $("#wkVol"); if (vol) vol.textContent = volShow(liveVolume());
    const st = $("#wkSets"); if (st) st.textContent = active.items.reduce((n, it) => n + (it.warm ? 0 : it.sets.filter((s) => s.done).length), 0);
  }
  function bindWorkout(v) {
    $("#wkName").oninput = (e) => { active.name = e.target.value.slice(0, 120); persistActive(); };
    $("#wkNotes").oninput = (e) => { active.notes = e.target.value.slice(0, 5000); persistActive(); };
    $("#wkAdd").onclick = () => pickExercises({ title: "Add exercises", onPick: addExercisesToActive });
    const skipW = $("#wkSkipWarm");
    if (skipW) skipW.onclick = () => { active.items = active.items.filter((it) => !it.warm); persistActive(); render(); toast("Warm-up skipped"); };
    const addW = $("#wkAddWarm");
    if (addW) addW.onclick = () => {
      const w = warmupFor(active.items.map((it) => it.ex));
      if (!w.length) { toast("This workout is already stretching — no warm-up needed."); return; }
      active.items = w.concat(active.items); persistActive(); render(); scrollTo(0, 0);
    };
    $("#wkFinish").onclick = finishWorkout;
    $("#wkDiscard").onclick = async () => {
      if (active.editingId) { clearActive(); go("history"); toast("Nothing changed"); return; }
      if (await confirmBox("Discard workout?", "Everything you logged in this workout will be lost.", "Discard", true)) { clearActive(); go("today"); toast("Workout discarded"); }
    };
    $("#wkMenu").onclick = (e) => openMenu(e.currentTarget, [
      { label: "Add exercises", icon: "plus", run: () => $("#wkAdd").click() },
      { label: "Rest timer: " + (rest ? "stop" : "start " + fmtClock(S.rest)), icon: "timer", run: () => (rest ? stopRest() : startRest(S.rest)) },
      "-",
      { label: active.editingId ? "Cancel editing" : "Discard workout", icon: "trash", danger: true, run: () => $("#wkDiscard").click() },
    ]);
    const items = $("#wkItems");
    items.addEventListener("input", (e) => {
      const t = e.target;
      if (t.dataset.note) { const it = findItem(t.dataset.note); if (it) { it.note = t.value.slice(0, 300); persistActive(); } return; }
      if (!t.dataset.f) return;
      const it = findItem(t.dataset.it); if (!it) return;
      const s = it.sets[+t.dataset.si]; const f = t.dataset.f;
      s[f] = f === "w" ? wIn(t.value) : f === "d" ? dIn(t.value) : f === "t" ? parseTime(t.value) : (() => { const n = parseNum(t.value); return n == null ? null : Math.min(9999, Math.round(n)); })();
      persistActive(); if (s.done) paintLive();
    });
    items.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || !e.target.dataset.f) return;
      e.preventDefault();
      const ins = $$("input[data-f]", items), i = ins.indexOf(e.target);
      if (ins[i + 1]) ins[i + 1].focus(); else e.target.blur();
    });
    items.addEventListener("click", (e) => {
      const t = e.target.closest("button,[data-prev]"); if (!t) return;
      if (t.dataset.ok) return tick(t.dataset.ok);
      if (t.dataset.wtick) {
        const it = findItem(t.dataset.wtick); if (!it || !it.sets[0]) return;
        const s = it.sets[0]; s.done = !s.done;
        if (s.done && s.tr) { if (exById(it.ex).track === "t") s.t = s.tr; else s.r = s.tr; }
        persistActive(); rerenderItem(it);
        if (s.done && active.items.every((x) => !x.warm || x.sets.every((y) => y.done))) toast("Warm-up done — on to the workout 💪");
        return;
      }
      if (t.dataset.kind) { const r = refOf(t.dataset.kind); if (!r) return; r.s.k = { n: "w", w: "d", d: "f", f: "n" }[r.s.k] || "n"; persistActive(); rerenderItem(r.it); return; }
      if (t.dataset.prev) {
        const r = refOf(t.dataset.prev); if (!r) return;
        const p = prevFor(lastSets(r.it.ex, active.editingId), r.it.sets, r.i); if (!p) return;
        Object.assign(r.s, { w: p.w ?? null, r: p.r ?? null, d: p.d ?? null, t: p.t ?? null }); persistActive(); rerenderItem(r.it); return;
      }
      if (t.dataset.del) {
        const r = refOf(t.dataset.del); if (!r) return;
        r.it.sets.splice(r.i, 1);
        if (!r.it.sets.length) { const idx = active.items.indexOf(r.it); active.items.splice(idx, 1); persistActive(); render(); return; }
        persistActive(); rerenderItem(r.it); paintLive(); return;
      }
      if (t.dataset.addset) {
        const it = findItem(t.dataset.addset); if (!it) return;
        const last = it.sets[it.sets.length - 1];
        const s = newSet(null, last ? last.tr : null);
        if (last) { s.w = last.w; s.r = last.r; s.d = last.d; s.t = last.t; }
        it.sets.push(s); persistActive(); rerenderItem(it);
        const ins = $$(`[data-item="${it.uid}"] input[data-f]`); if (ins.length && !last) ins[ins.length - (exById(it.ex).track === "t" ? 1 : 2)].focus();
        return;
      }
      if (t.dataset.how) return exerciseDetail(t.dataset.how);
      if (t.dataset.imenu) {
        const it = findItem(t.dataset.imenu); if (!it) return;
        const idx = active.items.indexOf(it);
        openMenu(t, [
          { label: "How to do it", icon: "info", run: () => exerciseDetail(it.ex) },
          { label: it.note ? "Edit note" : "Add a note", icon: "edit", run: () => { const el = $(`[data-item="${it.uid}"]`); if (!el) return; let inp = $(".exb-note", el); if (!inp) { el.querySelector(".exb-h").insertAdjacentHTML("afterend", noteInput(it)); inp = $(".exb-note", el); } inp.focus(); } },
          { label: "Rest timer: " + (it.rest ? fmtClock(it.rest) : "off"), icon: "timer", run: () => restPicker(it) },
          { label: "Replace exercise", icon: "swap", run: () => pickExercises({ title: "Replace " + it.name, single: true, onPick: (ids) => { const ex = exById(ids[0]); it.ex = ex.id; it.name = ex.name; it.sets.forEach((s) => (s.pr = false)); persistActive(); render(); } }) },
          idx > 0 ? { label: "Move up", icon: "up", run: () => { active.items.splice(idx - 1, 0, active.items.splice(idx, 1)[0]); persistActive(); render(); } } : null,
          idx < active.items.length - 1 ? { label: "Move down", icon: "down", run: () => { active.items.splice(idx + 1, 0, active.items.splice(idx, 1)[0]); persistActive(); render(); } } : null,
          "-",
          { label: "Remove exercise", icon: "trash", danger: true, run: () => { active.items.splice(idx, 1); persistActive(); render(); paintLive(); toast("Exercise removed"); } },
        ].filter(Boolean));
      }
    });
  }
  function rerenderItem(it) {
    const el = $(`[data-item="${it.uid}"]`); if (!el) return render();
    const tmp = document.createElement("div"); tmp.innerHTML = itemBlock(it, active.items.indexOf(it)); el.replaceWith(tmp.firstElementChild);
  }
  function tick(key) {
    const r = refOf(key); if (!r) return;
    const { it, s } = r, ex = exById(it.ex, it.name), tr = ex.track;
    if (!s.done) {
      // Empty boxes take the greyed-out suggestion (last time / the routine's target).
      const row = $(`[data-row="${key}"]`);
      $$("input[data-f]", row).forEach((inp) => {
        const f = inp.dataset.f;
        if (s[f] == null && inp.placeholder && inp.placeholder !== "–") {
          s[f] = f === "w" ? wIn(inp.placeholder) : f === "d" ? dIn(inp.placeholder) : f === "t" ? parseTime(inp.placeholder) : parseNum(inp.placeholder);
          if (s[f] === 0 && f !== "w") s[f] = null;
        }
      });
      const ok = tr === "wr" || tr === "r" ? s.r > 0 : tr === "t" ? s.t > 0 : s.d > 0 || s.t > 0;
      if (!ok) { toast(tr === "t" ? "Enter a time first" : tr === "dt" ? "Enter a distance or time first" : "Enter your reps first"); return; }
      s.done = true;
      s.pr = s.k !== "w" && (() => { const before = bestBefore(it.ex, tr, active.editingId); const v = setValue(tr, s); const inThis = Math.max(0, ...it.sets.filter((x) => x !== s && x.done && x.k !== "w").map((x) => setValue(tr, x))); return before > 0 && v > before && v > inThis; })();
      if (s.pr) toast("New record on " + ex.name + "!");
      if (it.rest && !active.editingId && !active.past) startRest(it.rest, ex.name);
    } else { s.done = false; s.pr = false; }
    persistActive(); rerenderItem(it); paintLive();
  }
  function restPicker(it) {
    const opts = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];
    openModal((m) => {
      modalShell(m, { title: "Rest timer", sub: esc(it.name) + " — starts when you tick a set.", body: `<div class="chips" style="flex-wrap:wrap">${opts.map((o) => `<button class="chip ${it.rest === o ? "on" : ""}" data-r="${o}" type="button">${o ? fmtClock(o) : "Off"}</button>`).join("")}</div>` });
      m.onclick = (e) => { const b = e.target.closest("[data-r]"); if (!b) return; it.rest = +b.dataset.r; persistActive(); closeModal(); rerenderItem(it); };
    });
  }
  function finishWorkout() {
    // The warm-up is guidance, not part of the saved workout.
    const a = Object.assign({}, active, { items: active.items.filter((it) => !it.warm) });
    const hasNum = (s, tr) => (tr === "wr" || tr === "r" ? s.r > 0 : tr === "t" ? s.t > 0 : s.d > 0 || s.t > 0);
    const unticked = a.items.reduce((n, it) => n + it.sets.filter((s) => !s.done && hasNum(s, exById(it.ex, it.name).track)).length, 0);
    const doneSets = a.items.reduce((n, it) => n + it.sets.filter((s) => s.done).length, 0);
    if (!doneSets && !unticked) { toast("Tick at least one set before finishing."); return; }
    const end = a.editingId ? a.end || Date.now() : a.past ? a.start + 3600000 : Date.now();
    let draft = { name: a.name || "Workout", date: ymd(a.start), time: pad(new Date(a.start).getHours()) + ":" + pad(new Date(a.start).getMinutes()), mins: Math.max(1, Math.round((end - a.start) / 60000)), keep: true, asRoutine: false };
    // Records this workout sets, against everything before it.
    const prs = [];
    for (const it of a.items) {
      const ex = exById(it.ex, it.name);
      const sets = it.sets.filter((s) => s.done && s.k !== "w");
      if (!sets.length) continue;
      const top = Math.max(...sets.map((s) => setValue(ex.track, s))), before = bestBefore(it.ex, ex.track, a.editingId);
      if (before > 0 && top > before) prs.push({ ex, set: sets.find((s) => setValue(ex.track, s) === top) });
    }
    openModal((m) => {
      modalShell(m, {
        title: a.editingId ? "Save changes" : "Finish workout",
        body: `<div class="celebrate"><div class="big">${prs.length ? "🏆" : "💪"}</div><h3 style="margin:8px 0 2px">${prs.length ? `${prs.length} new record${prs.length > 1 ? "s" : ""}!` : "Nice work!"}</h3>
            <p class="muted" style="margin:0">${plural(doneSets, "set")} · ${volShow(liveVolume())} · ${plural(a.items.filter((it) => it.sets.some((x) => x.done)).length, "exercise")}</p>
            ${prs.length ? `<div class="prs">${prs.map((p) => `<div>${I("trophy", 16)}<b>${esc(p.ex.name)}</b><span class="muted">${esc(setText(p.ex.track, p.set))}</span></div>`).join("")}</div>` : ""}</div>
          <label class="lbl" for="fName">Name</label><input class="input" id="fName" maxlength="120" value="${esc(draft.name)}" />
          <div class="fields"><div><label class="lbl" for="fDate">Date</label><input class="input" id="fDate" type="date" value="${draft.date}" max="${ymd(Date.now())}" /></div>
            <div><label class="lbl" for="fTime">Started</label><input class="input" id="fTime" type="time" value="${draft.time}" /></div>
            <div><label class="lbl" for="fMins">Minutes</label><input class="input" id="fMins" type="number" min="1" max="1440" value="${draft.mins}" /></div></div>
          ${unticked ? `<label class="row" style="margin-top:14px;gap:8px;flex-wrap:nowrap"><input type="checkbox" id="fKeep" checked /> <span>Also save ${unticked} set${unticked > 1 ? "s" : ""} you filled in but didn't tick</span></label>` : ""}
          ${!a.editingId && !a.routine ? `<label class="row" style="margin-top:10px;gap:8px;flex-wrap:nowrap"><input type="checkbox" id="fRoutine" /> <span>Also save it as a routine</span></label>` : ""}`,
        foot: `<button class="btn" data-x2 type="button">Back</button><button class="btn primary" id="fSave" type="button">${a.editingId ? "Save changes" : "Save workout"}</button>`,
      });
      m.querySelector("[data-x2]").onclick = closeModal;
      m.querySelector("#fSave").onclick = () => {
        const start = (() => { const d = fromYmd(m.querySelector("#fDate").value || draft.date); const [hh, mm] = (m.querySelector("#fTime").value || "0:0").split(":").map(Number); d.setHours(hh || 0, mm || 0, 0, 0); return d.getTime(); })();
        if (start > Date.now() + 60000) { toast("The start can't be in the future."); return; }
        const mins = clamp(parseInt(m.querySelector("#fMins").value, 10) || 1, 1, 1440);
        const keep = m.querySelector("#fKeep") ? m.querySelector("#fKeep").checked : false;
        const items = a.items.map((it) => {
          const tr = exById(it.ex, it.name).track;
          const sets = it.sets.filter((s) => s.done || (keep && hasNum(s, tr))).map((s) => ({ k: s.k || "n", w: s.w ?? null, r: s.r ?? null, d: s.d ?? null, t: s.t ?? null }));
          return { ex: it.ex, name: exById(it.ex, it.name).name, note: it.note || "", rest: it.rest || 0, sets };
        }).filter((it) => it.sets.length).slice(0, 60);
        const name = (m.querySelector("#fName").value || "Workout").trim().slice(0, 120);
        const doc = { kind: "workout", name, date: ymd(start), start, end: start + mins * 60000, notes: a.notes || "", items, routine: a.routine || "" };
        const id = saveDoc(a.editingId || null, doc, "save your workout");
        if (m.querySelector("#fRoutine") && m.querySelector("#fRoutine").checked) {
          saveDoc(null, { kind: "routine", name, notes: "", items: items.map((it) => ({ ex: it.ex, sets: it.sets.filter((s) => s.k !== "w").length || it.sets.length, reps: (() => { const tr = exById(it.ex).track; const s = it.sets.find((x) => x.k !== "w") || it.sets[0]; return tr === "t" ? s.t || 30 : s.r || 10; })(), rest: it.rest || 0 })) }, "save the routine");
        }
        const wasEditing = !!a.editingId;
        clearActive(); closeAllModals();
        toast(wasEditing ? "Changes saved" : prs.length ? `Workout saved — ${prs.length} new record${prs.length > 1 ? "s" : ""}!` : "Workout saved");
        go("history"); setTimeout(() => workoutDetail(id), 50);
      };
    });
  }

  // ===================================================================
  // Exercises
  // ===================================================================
  function filterEx(f) {
    const q = (f.q || "").toLowerCase().trim();
    const words = q.split(/\s+/).filter(Boolean);
    let list = allEx().filter((e) => {
      if (f.muscle && e.muscle !== f.muscle && !(f.wide && e.secondary.includes(f.muscle))) return false;
      if (f.equipment && e.equipment !== f.equipment) return false;
      if (f.category && e.category !== f.category) return false;
      if (f.only === "fav" && !isFav(e.id)) return false;
      if (f.only === "mine" && e.builtin) return false;
      if (words.length) {
        const hay = (e.name + " " + (D.MUSCLES[e.muscle] || "") + " " + (D.EQUIPMENT[e.equipment] || "") + " " + (D.CATEGORIES[e.category] || "") + " " + e.secondary.map((m) => D.MUSCLES[m]).join(" ")).toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    const timesDone = (id) => (derived.hist.get(id) || []).length;
    if (f.sort === "done") list.sort((a, b) => timesDone(b.id) - timesDone(a.id) || a.name.localeCompare(b.name));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }
  function exCard(e, sel) {
    const done = (derived.hist.get(e.id) || []).length;
    return `<button class="ex-card ${sel ? "sel" : ""}" data-ex="${esc(e.id)}" type="button">
      ${e.demo ? `<img class="ex-thumb${e.drawn ? " drawn" : ""}" src="${demoSrc(e)}" alt="" loading="lazy" decoding="async" />` : bodyMap(exHeat(e), { side: "auto" })}
      <span class="t"><b>${esc(e.name)}</b><span><span class="tag acc">${esc(D.MUSCLES[e.muscle] || e.muscle)}</span><span class="tag">${esc(D.EQUIPMENT[e.equipment] || e.equipment)}</span>${e.builtin ? "" : `<span class="tag">Mine</span>`}</span>
        <span class="muted" style="font-size:12px">${esc(D.CATEGORIES[e.category] || "")}${done ? ` · done ${done}×` : ""}</span></span>
      ${sel !== undefined ? `<span class="check">${I("check", 14)}</span>` : isFav(e.id) ? `<span class="star">${I("starFill", 16)}</span>` : ""}
    </button>`;
  }
  function filterBar(f, idp) {
    const opt = (o, cur, all) => `<option value="">${all}</option>` + Object.entries(o).map(([k, v]) => `<option value="${k}" ${cur === k ? "selected" : ""}>${esc(v)}</option>`).join("");
    return `<div class="lib-filters">
        <input class="input" id="${idp}q" type="search" placeholder="Search ${allEx().length} exercises" value="${esc(f.q)}" autocomplete="off" />
        <button class="btn" id="${idp}ft" type="button" aria-expanded="${!!f.open}" aria-controls="${idp}more">${filterLabel(f)}</button>
      </div>
      <div class="lib-more" id="${idp}more" ${f.open ? "" : "hidden"}>
        <select class="select" id="${idp}eq" aria-label="Equipment">${opt(D.EQUIPMENT, f.equipment, "Any equipment")}</select>
        <select class="select" id="${idp}cat" aria-label="Type">${opt(D.CATEGORIES, f.category, "Any type")}</select>
        <select class="select" id="${idp}sort" aria-label="Sort"><option value="az">A–Z</option><option value="done" ${f.sort === "done" ? "selected" : ""}>Most done</option></select>
      </div>
      <div class="chips" id="${idp}chips">
        <button class="chip ${!f.muscle && !f.only ? "on" : ""}" data-m="" type="button">All</button>
        <button class="chip ${f.only === "fav" ? "on" : ""}" data-only="fav" type="button">${I("star", 13)} Favourites</button>
        <button class="chip ${f.only === "mine" ? "on" : ""}" data-only="mine" type="button">Mine</button>
        ${Object.entries(D.MUSCLES).map(([k, v]) => `<button class="chip ${f.muscle === k ? "on" : ""}" data-m="${k}" type="button">${esc(v)}</button>`).join("")}
      </div>`;
  }
  const filterLabel = (f) => { const n = (f.equipment ? 1 : 0) + (f.category ? 1 : 0); return "Filters" + (n ? ` (${n})` : ""); };
  function bindFilterBar(root, f, idp, onChange0) {
    const ft = $("#" + idp + "ft", root);
    const onChange = (x) => { ft.textContent = filterLabel(f); onChange0(x); };
    ft.onclick = () => { f.open = !f.open; $("#" + idp + "more", root).hidden = !f.open; ft.setAttribute("aria-expanded", f.open); };
    const q = $("#" + idp + "q", root);
    q.oninput = () => { f.q = q.value; f.limit = 60; onChange(true); };
    $("#" + idp + "eq", root).onchange = (e) => { f.equipment = e.target.value; f.limit = 60; onChange(); };
    $("#" + idp + "cat", root).onchange = (e) => { f.category = e.target.value; f.limit = 60; onChange(); };
    $("#" + idp + "sort", root).onchange = (e) => { f.sort = e.target.value; onChange(); };
    $("#" + idp + "chips", root).onclick = (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      if (b.dataset.only) { f.only = f.only === b.dataset.only ? "" : b.dataset.only; }
      else { f.muscle = b.dataset.m; if (!b.dataset.m) f.only = ""; }
      f.limit = 60; onChange();
    };
  }
  function viewExercises(v) {
    v.innerHTML = `<div class="page-h"><div class="grow"><h1>Exercises</h1><p>Every exercise with how-to steps, the muscles it works and your history on it.</p></div>
        <button class="btn" id="newEx" type="button">${I("plus", 16)} New exercise</button></div>
      <div class="lib-bar">${filterBar(lib, "l")}</div><div id="libList"></div>`;
    const paint = () => {
      const list = filterEx(lib);
      $("#libList").innerHTML = list.length ? `<p class="count">${list.length} exercise${list.length === 1 ? "" : "s"}</p><div class="ex-grid">${list.slice(0, lib.limit).map((e) => exCard(e)).join("")}</div>
        ${list.length > lib.limit ? `<div class="row" style="justify-content:center;margin-top:16px"><button class="btn" id="more" type="button">Show more (${list.length - lib.limit})</button></div>` : ""}`
        : `<div class="empty"><b>No exercises match</b>Try fewer filters, or add your own with New exercise.</div>`;
      const more = $("#more"); if (more) more.onclick = () => { lib.limit += 120; paint(); };
    };
    bindFilterBar(v, lib, "l", (typing) => { if (!typing) { const y = scrollY; viewExercises(v); scrollTo(0, y); } else paint(); $("#q").value = lib.q; });
    $("#newEx").onclick = () => customExerciseEditor();
    paint();
    $("#libList").onclick = (e) => { const c = e.target.closest("[data-ex]"); if (c) exerciseDetail(c.dataset.ex); };
  }
  // The exercise's demo: its start and end photos, shown one after the other
  // as a loop (Free Exercise DB, public domain). Starts paused when the device
  // asks for less motion. Stops by itself once the player leaves the page.
  const DEMO_MS = 1100;
  function demoHtml(ex) {
    if (!ex.demo) return "";
    const src = (n) => `demos/${encodeURIComponent(ex.id)}/${n}.jpg`;
    return `<div class="demo" data-demo>
        <img src="${src(0)}" alt="${esc(ex.name)}: start position" class="f0" decoding="async" />
        <img src="${src(1)}" alt="${esc(ex.name)}: end position" class="f1" decoding="async" />
        <span class="demo-lbl" data-demo-lbl>Start</span>
        <button class="demo-pp" type="button" data-demo-pp aria-label="Pause demo">${I("pause", 16)}</button>
      </div>
      <p class="demo-credit">${ex.drawn ? "Demo drawing: KPR Fitness" : `Demo photos: <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">Free Exercise DB</a> (public domain)`}</p>`;
  }
  function runDemo(root) {
    const el = root.querySelector("[data-demo]");
    if (!el) return;
    const lbl = el.querySelector("[data-demo-lbl]"), pp = el.querySelector("[data-demo-pp]");
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.getAttribute("data-kpr-motion") === "calm";
    let timer = null;
    const flip = () => {
      if (!el.isConnected) return stop();
      const end = el.classList.toggle("end");
      lbl.textContent = end ? "End" : "Start";
    };
    const stop = () => { clearInterval(timer); timer = null; };
    const paint = () => { pp.innerHTML = I(timer ? "pause" : "play", 16); pp.setAttribute("aria-label", timer ? "Pause demo" : "Play demo"); el.classList.toggle("paused", !timer); };
    const play = () => { stop(); timer = setInterval(flip, DEMO_MS); };
    pp.onclick = (e) => { e.stopPropagation(); if (timer) stop(); else { flip(); play(); } paint(); };
    // Tapping the photo itself steps through it by hand.
    el.onclick = () => { if (!timer) flip(); };
    if (!calm) play();
    paint();
  }
  function exerciseDetail(id) {
    const ex = exById(id);
    openModal((m) => {
      const list = derived.hist.get(id) || [];
      const tr = ex.track, metrics = METRICS[tr];
      const met = metrics[0][0];
      const pts = list.map(({ w, it }) => ({ x: w.start, v: metricOf(tr, met, it.sets || []) })).filter((p) => p.v);
      const recent = list.slice(-5).reverse();
      modalShell(m, {
        title: esc(ex.name),
        sub: `<span class="row" style="gap:6px;margin-top:6px"><span class="tag acc">${esc(D.MUSCLES[ex.muscle] || ex.muscle)}</span>${ex.secondary.map((s) => `<span class="tag">${esc(D.MUSCLES[s] || s)}</span>`).join("")}<span class="tag">${esc(D.EQUIPMENT[ex.equipment] || "")}</span><span class="tag">${esc(D.CATEGORIES[ex.category] || "")}</span></span>`,
        body: `${demoHtml(ex)}<div class="ex-detail">
            <div>${bodyMap(exHeat(ex))}<div class="legend"><span><i style="background:var(--accent)"></i>Main</span><span><i style="background:color-mix(in srgb, var(--accent) 55%, var(--card-3))"></i>Also works</span></div></div>
            <div>
              ${ex.steps.length ? `<h3 style="margin:0 0 8px;font-size:14px">How to do it</h3><ol class="steps">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : `<p class="muted">No steps written for this exercise.</p>`}
              ${ex.tip ? `<div class="tipbox">${I("bulb", 16)}<span>${esc(ex.tip)}</span></div>` : ""}
              ${ex.missing ? `<p class="muted">This exercise was deleted. Your history on it is kept.</p>` : ""}
            </div>
          </div>
          <h3 style="margin:22px 0 4px;font-size:14px">Your history</h3>
          ${list.length ? `<div class="kv">${metrics.map(([k, l]) => `<div><b>${metricText(tr, k, bestMetric(list, tr, k))}</b><span>Best ${l.toLowerCase()}</span></div>`).join("")}<div><b>${list.length}</b><span>Times done</span></div><div><b>${fmtDate(list[list.length - 1].w.start, { month: "short", day: "numeric" })}</b><span>Last done</span></div></div>
            ${pts.length > 1 ? `<div style="margin-top:14px"><p class="muted" style="margin:0 0 6px;font-size:12.5px">${esc(metrics[0][1])} over time</p>${lineChart(pts.map((p) => ({ x: p.x, y: metricToY(tr, met, p.v), tip: `<b>${metricText(tr, met, p.v)}</b>${fmtDate(p.x)}` })), { h: 160, label: ex.name + " progress" })}</div>` : ""}
            <table class="table" style="margin-top:12px"><thead><tr><th>Date</th><th>Sets</th></tr></thead><tbody>${recent.map(({ w, it }) => `<tr><td style="white-space:nowrap">${fmtDate(w.start, { month: "short", day: "numeric" })}</td><td>${(it.sets || []).filter((s) => s.done !== false).map((s) => esc(setText(tr, s)) + (s.k === "w" ? " <span class='muted'>(warm-up)</span>" : "")).join("<br>")}</td></tr>`).join("")}</tbody></table>`
            : `<p class="muted" style="margin:6px 0 0">You haven't done this one yet.</p>`}`,
        foot: `<button class="icon-btn ${isFav(id) ? "on" : ""}" id="fav" type="button" aria-label="Favourite" title="Favourite">${I(isFav(id) ? "starFill" : "star")}</button>
          ${!ex.builtin && !ex.missing ? `<button class="btn ghost" id="exEdit" type="button">${I("edit", 15)} Edit</button>` : ""}<span class="grow"></span>
          ${ex.missing ? "" : active ? `<button class="btn primary" id="exAdd" type="button">${I("plus", 16)} Add to workout</button>` : `<button class="btn primary" id="exStart" type="button">${I("play", 15)} Start a workout with it</button>`}`,
      });
      runDemo(m);
      m.querySelector("#fav").onclick = () => {
        const favs = new Set(S.favs || []); favs.has(id) ? favs.delete(id) : favs.add(id);
        saveSettings({ favs: Array.from(favs).slice(0, 500) }); refreshModal();
        if (currentRoute().name === "exercises") render();
      };
      const ed = m.querySelector("#exEdit"); if (ed) ed.onclick = () => customExerciseEditor(ex);
      const ad = m.querySelector("#exAdd"); if (ad) ad.onclick = () => { addExercisesToActive([id]); closeAllModals(); toast(ex.name + " added"); go("workout"); };
      const st = m.querySelector("#exStart"); if (st) st.onclick = () => { closeAllModals(); startWorkout({ items: [makeItem(id)] }); };
    }, true);
  }
  function pickExercises({ title, single, onPick }) {
    const f = { q: "", muscle: "", equipment: "", category: "", only: "", sort: "done", limit: 80 };
    const sel = [];
    openModal((m) => {
      modalShell(m, { title: esc(title), body: `<div style="position:sticky;top:58px;background:var(--card);z-index:1;padding-bottom:8px;display:grid;gap:8px">${filterBar(f, "p")}</div><div id="pList"></div>`, foot: `<button class="btn ghost" id="pNew" type="button">${I("plus", 15)} New exercise</button><span class="grow"></span><button class="btn" data-x2 type="button">Cancel</button>${single ? "" : `<button class="btn primary" id="pAdd" type="button" disabled>Add</button>`}` });
      m.querySelector("[data-x2]").onclick = closeModal;
      const paint = () => {
        const list = filterEx(f);
        $("#pList", m).innerHTML = list.length ? `<div class="ex-grid">${list.slice(0, f.limit).map((e) => exCard(e, sel.includes(e.id))).join("")}</div>${list.length > f.limit ? `<div class="row" style="justify-content:center;margin-top:12px"><button class="btn" id="pMore" type="button">Show more</button></div>` : ""}` : `<div class="empty"><b>No exercises match</b></div>`;
        const more = $("#pMore", m); if (more) more.onclick = () => { f.limit += 120; paint(); };
        paintAdd();
      };
      const paintAdd = () => { const add = $("#pAdd", m); if (add) { add.disabled = !sel.length; add.textContent = sel.length ? `Add ${sel.length} exercise${sel.length > 1 ? "s" : ""}` : "Add"; } };
      bindFilterBar(m, f, "p", (typing) => { if (typing) return paint(); refreshModal(); });
      $("#pList", m).onclick = (e) => {
        const c = e.target.closest("[data-ex]"); if (!c) return;
        const id = c.dataset.ex;
        if (single) { closeModal(); onPick([id]); return; }
        const i = sel.indexOf(id); i >= 0 ? sel.splice(i, 1) : sel.push(id);
        c.classList.toggle("sel"); paintAdd();
      };
      const add = $("#pAdd", m); if (add) add.onclick = () => { const ids = sel.slice(); closeModal(); onPick(ids); };
      $("#pNew", m).onclick = () => customExerciseEditor(null, (newId) => { if (single) { closeModal(); onPick([newId]); } else { sel.push(newId); refreshModal(); } });
      paint();
      const q = $("#pq", m); if (q && matchMedia("(pointer:fine)").matches) setTimeout(() => q.focus(), 30);
    }, true);
  }
  function customExerciseEditor(ex, onCreated) {
    const d = ex ? { name: ex.name, muscle: ex.muscle, equipment: ex.equipment, category: ex.category, track: ex.track, secondary: ex.secondary.slice(), notes: ex.steps.join("\n") } : { name: "", muscle: "chest", equipment: "barbell", category: "strength", track: "wr", secondary: [], notes: "" };
    openModal((m) => {
      const opt = (o, cur) => Object.entries(o).map(([k, v]) => `<option value="${k}" ${cur === k ? "selected" : ""}>${esc(v)}</option>`).join("");
      modalShell(m, {
        title: ex ? "Edit exercise" : "New exercise",
        body: `<label class="lbl" for="cName">Name</label><input class="input" id="cName" maxlength="120" value="${esc(d.name)}" placeholder="e.g. Landmine row" />
          <div class="fields"><div><label class="lbl">Main muscle</label><select class="select" id="cMus">${opt(D.MUSCLES, d.muscle)}</select></div>
            <div><label class="lbl">Equipment</label><select class="select" id="cEq">${opt(D.EQUIPMENT, d.equipment)}</select></div>
            <div><label class="lbl">Type</label><select class="select" id="cCat">${opt(D.CATEGORIES, d.category)}</select></div>
            <div><label class="lbl">Log sets as</label><select class="select" id="cTr">${opt(D.TRACKS, d.track)}</select></div></div>
          <label class="lbl">Also works</label><div class="chips" id="cSec" style="flex-wrap:wrap">${Object.entries(D.MUSCLES).map(([k, v]) => `<button class="chip ${d.secondary.includes(k) ? "on" : ""}" data-s="${k}" type="button">${esc(v)}</button>`).join("")}</div>
          <label class="lbl" for="cNotes">How to do it <span class="muted">(one step per line)</span></label><textarea class="textarea" id="cNotes" maxlength="5000" rows="5">${esc(d.notes)}</textarea>`,
        foot: `${ex ? `<button class="btn ghost danger" id="cDel" type="button">${I("trash", 15)} Delete</button>` : ""}<span class="grow"></span><button class="btn" data-x2 type="button">Cancel</button><button class="btn primary" id="cSave" type="button">Save</button>`,
      });
      m.querySelector("[data-x2]").onclick = closeModal;
      $("#cSec", m).onclick = (e) => { const b = e.target.closest("[data-s]"); if (!b) return; b.classList.toggle("on"); };
      $("#cSave", m).onclick = () => {
        const name = $("#cName", m).value.trim().slice(0, 120);
        if (!name) { toast("Give the exercise a name"); return; }
        const doc = { kind: "exercise", name, muscle: $("#cMus", m).value, equipment: $("#cEq", m).value, category: $("#cCat", m).value, track: $("#cTr", m).value,
          secondary: $$("#cSec .chip.on", m).map((b) => b.dataset.s).filter((s) => s !== $("#cMus", m).value).slice(0, 10), notes: $("#cNotes", m).value.slice(0, 5000) };
        const id = saveDoc(ex ? ex.id : null, doc, "save the exercise");
        closeModal(); toast(ex ? "Exercise saved" : "Exercise added");
        exCache = null;
        if (onCreated) onCreated(id); else if (ex) refreshModal(); else if (currentRoute().name === "exercises") render();
      };
      const del = $("#cDel", m);
      if (del) del.onclick = async () => {
        if (!(await confirmBox("Delete exercise?", `“${ex.name}” will be deleted. Workouts that used it keep their sets.`, "Delete", true))) return;
        removeDoc(ex.id); closeAllModals(); toast("Exercise deleted");
      };
    });
  }

  // ===================================================================
  // Routines
  // ===================================================================
  // Routines: yours, then the programs, picked by goal (lose fat, six-pack,
  // build muscle…). #/routines/<goal-id> opens one goal's page.
  function viewRoutines(v, arg) {
    const goal = D.GOALS.find((g) => g.id === arg);
    if (goal) {
      const list = goal.routines.map(findRoutine).filter(Boolean);
      v.innerHTML = `<a class="btn ghost sm" href="#/routines" style="margin:2px 0 10px -6px">${I("left", 15)} All programs</a>
        <div class="card goal-head">
          <span class="goal-ic big" aria-hidden="true">${goal.icon}</span>
          <div class="grow">
            <h1>${esc(goal.name)}</h1><p class="muted" style="margin:2px 0 10px">${esc(goal.tagline)}</p>
            <p style="margin:0;color:var(--text-2)">${esc(goal.about)}</p>
          </div>
        </div>
        <div class="grid g2" style="margin-top:16px">
          <div class="card"><div class="card-h"><h3>${I("timer", 16)} Suggested week</h3></div><p style="margin:0;color:var(--text-2)">${esc(goal.week)}</p></div>
          <div class="card"><div class="card-h"><h3>${I("bulb", 16)} Tips</h3></div><ul class="goal-tips">${goal.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
        </div>
        <div class="sec-t">Workouts in this program</div>
        <div class="grid rgrid">${list.map((r) => routineCard(r)).join("")}</div>
        <p class="muted" style="font-size:12.5px;margin-top:16px">Start a workout to follow it as it is, or Copy it to your routines to change it. Check with a doctor before starting a new training plan.</p>`;
      bindCommon(v);
      return;
    }
    const mine = derived.routines.length ? `<div class="sec-t" style="margin-top:6px">My routines</div><div class="grid rgrid">${derived.routines.map((r) => routineCard(r)).join("")}</div>` : "";
    v.innerHTML = `<div class="page-h"><div class="grow"><h1>Programs</h1><p>Pick a goal to get a plan of ready-made workouts.</p></div>
        <button class="btn" id="newR" type="button">${I("plus", 16)} My own routine</button></div>
      ${upNextCard(upNext())}
      ${mine}
      <div class="sec-t" style="margin-top:6px">What do you want to do?</div>
      ${goalCards()}`;
    $("#newR").onclick = () => routineEditor({ name: "", notes: "", items: [] });
    bindCommon(v);
  }
  function routineEditor(r) {
    const d = { id: r.id && !r.builtin ? r.id : null, name: r.name || "", notes: r.notes || "", items: (r.items || []).map((x) => ({ ex: x.ex, sets: x.sets || 3, reps: x.reps ?? 10, rest: x.rest ?? S.rest })) };
    openModal((m) => {
      modalShell(m, {
        title: d.id ? "Edit routine" : "New routine",
        body: `<label class="lbl" for="rName">Name</label><input class="input" id="rName" maxlength="120" value="${esc(d.name)}" placeholder="e.g. Monday push" />
          <label class="lbl" for="rNotes">Notes</label><input class="input" id="rNotes" maxlength="5000" value="${esc(d.notes)}" placeholder="Optional" />
          <label class="lbl">Exercises</label>
          ${d.items.length ? `<div class="ri ri-h"><span>Exercise</span><span>Sets</span><span>Reps/sec</span><span>Rest (s)</span><span></span></div>` : ""}
          <div id="rItems">${d.items.map((x, i) => { const ex = exById(x.ex); return `<div class="ri" data-i="${i}"><button class="rx" type="button" data-ex="${esc(ex.id)}" title="How to do ${esc(ex.name)}">${demoThumb(ex)}<b>${esc(ex.name)}</b></button>
            <input class="input" data-f="sets" type="number" min="1" max="20" value="${x.sets}" aria-label="Sets" />
            <input class="input" data-f="reps" type="number" min="0" max="999" value="${x.reps}" aria-label="${ex.track === "t" ? "Seconds" : "Reps"}" ${ex.track === "dt" ? "disabled" : ""} />
            <input class="input" data-f="rest" type="number" min="0" max="900" step="15" value="${x.rest}" aria-label="Rest seconds" />
            <span class="row" style="gap:0;flex-wrap:nowrap"><button class="icon-btn sm" data-up="${i}" type="button" aria-label="Move up" ${i ? "" : "disabled"}>${I("up", 14)}</button><button class="icon-btn sm" data-rm="${i}" type="button" aria-label="Remove">${I("x", 14)}</button></span></div>`; }).join("")}</div>
          <button class="btn block" id="rAdd" type="button" style="margin-top:10px">${I("plus", 15)} Add exercises</button>`,
        foot: `<button class="btn" data-x2 type="button">Cancel</button><button class="btn primary" id="rSave" type="button">Save routine</button>`,
      });
      m.querySelector("[data-x2]").onclick = closeModal;
      const sync = () => { d.name = $("#rName", m).value; d.notes = $("#rNotes", m).value; };
      $("#rItems", m).oninput = (e) => {
        const row = e.target.closest("[data-i]"); if (!row) return;
        const x = d.items[+row.dataset.i], f = e.target.dataset.f, n = parseInt(e.target.value, 10);
        x[f] = clamp(isNaN(n) ? 0 : n, f === "sets" ? 1 : 0, f === "sets" ? 20 : f === "rest" ? 900 : 999);
      };
      $("#rItems", m).onclick = (e) => {
        const up = e.target.closest("[data-up]"), rm = e.target.closest("[data-rm]"), how = e.target.closest("[data-ex]");
        if (how) { sync(); exerciseDetail(how.dataset.ex); return; }
        if (up) { sync(); const i = +up.dataset.up; d.items.splice(i - 1, 0, d.items.splice(i, 1)[0]); refreshModal(); }
        if (rm) { sync(); d.items.splice(+rm.dataset.rm, 1); refreshModal(); }
      };
      $("#rAdd", m).onclick = () => { sync(); pickExercises({ title: "Add to routine", onPick: (ids) => { ids.forEach((id) => { const ex = exById(id); d.items.push({ ex: id, sets: 3, reps: ex.track === "t" ? 30 : ex.track === "dt" ? 0 : 10, rest: ex.track === "wr" || ex.track === "r" ? S.rest : 0 }); }); refreshModal(); } }); };
      $("#rSave", m).onclick = () => {
        sync();
        const name = d.name.trim().slice(0, 120);
        if (!name) { toast("Give the routine a name"); return; }
        if (!d.items.length) { toast("Add at least one exercise"); return; }
        saveDoc(d.id, { kind: "routine", name, notes: d.notes.slice(0, 5000), items: d.items.slice(0, 60) }, "save the routine");
        closeModal(); toast("Routine saved");
        if (currentRoute().name !== "routines") go("routines");
      };
    }, true);
  }

  // ===================================================================
  // History
  // ===================================================================
  const subnav = (on) => `<nav class="subnav" aria-label="Progress">${[["progress", "Stats"], ["history", "History"], ["body", "Body"]].map(([k, l]) => `<a href="#/${k}" class="${on === k ? "on" : ""}" ${on === k ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>`;
  function viewHistory(v) {
    const now = new Date();
    if (!ui.hist.month) ui.hist.month = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
    const m0 = fromYmd(ui.hist.month), y = m0.getFullYear(), mo = m0.getMonth();
    const byDay = new Map();
    for (const w of derived.workouts) { const k = ymd(w.start); byDay.set(k, (byDay.get(k) || 0) + 1); }
    const first = new Date(y, mo, 1), off = (first.getDay() + 6) % 7, startCal = new Date(y, mo, 1 - off);
    const cells = Array.from({ length: 42 }, (_, i) => new Date(startCal.getFullYear(), startCal.getMonth(), startCal.getDate() + i));
    const todayK = ymd(Date.now());
    let list = derived.workouts;
    if (ui.hist.day) list = list.filter((w) => ymd(w.start) === ui.hist.day);
    const groups = [];
    for (const w of list) { const k = new Date(w.start).toLocaleDateString(undefined, { month: "long", year: "numeric" }); if (!groups.length || groups[groups.length - 1].k !== k) groups.push({ k, ws: [] }); groups[groups.length - 1].ws.push(w); }
    const monthCount = derived.workouts.filter((w) => { const d = new Date(w.start); return d.getFullYear() === y && d.getMonth() === mo; });
    v.innerHTML = `${subnav("history")}<div class="page-h"><div class="grow"><h1>History</h1><p>${derived.workouts.length} workout${derived.workouts.length === 1 ? "" : "s"} logged.</p></div>
        <button class="btn" id="exportCsv" type="button" ${derived.workouts.length ? "" : "disabled"}>${I("download", 15)} Export CSV</button></div>
      <div class="split">
        <div class="card">
          <div class="cal-h"><button class="icon-btn sm" data-mo="-1" type="button" aria-label="Previous month">${I("left", 16)}</button><b>${first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</b><button class="icon-btn sm" data-mo="1" type="button" aria-label="Next month">${I("right", 16)}</button></div>
          <div class="cal">${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<span>${d}</span>`).join("")}
            ${cells.map((d) => { const k = ymd(d); return `<button type="button" data-day="${k}" class="${d.getMonth() !== mo ? "out" : ""} ${byDay.has(k) ? "has" : ""} ${k === todayK ? "today" : ""} ${ui.hist.day === k ? "pick" : ""}" title="${byDay.get(k) || 0} workout(s)">${d.getDate()}</button>`; }).join("")}</div>
          <div class="kv"><div><b>${monthCount.length}</b><span>Workouts</span></div><div><b>${fmtDur(monthCount.reduce((a, w) => a + ((w.end || w.start) - w.start), 0))}</b><span>Time</span></div><div><b>${volShow(monthCount.reduce((a, w) => a + workoutVolume(w), 0))}</b><span>Volume</span></div></div>
        </div>
        <div>
          ${ui.hist.day ? `<div class="row" style="margin-bottom:10px"><span class="tag acc">${fmtDate(fromYmd(ui.hist.day).getTime(), { weekday: "long", month: "long", day: "numeric" })}</span><button class="btn sm ghost" id="clearDay" type="button">Show all</button></div>` : ""}
          ${groups.length ? groups.map((g) => `<div class="sec-t" style="margin-top:0">${esc(g.k)}</div><div class="list" style="margin-bottom:20px">${g.ws.map((w) => workoutSummary(w)).join("")}</div>`).join("")
            : `<div class="card empty"><b>${ui.hist.day ? "No workouts that day" : "No workouts yet"}</b>${ui.hist.day ? "" : "Finished workouts show up here."}</div>`}
        </div>
      </div>`;
    bindCommon(v);
    const base = v.onclick;
    v.onclick = (e) => {
      const mo = e.target.closest("[data-mo]"), day = e.target.closest("[data-day]");
      if (mo) { const d = fromYmd(ui.hist.month); d.setMonth(d.getMonth() + +mo.dataset.mo); ui.hist.month = ymd(d); render(); return; }
      if (day) { ui.hist.day = ui.hist.day === day.dataset.day ? null : day.dataset.day; render(); return; }
      if (e.target.closest("#clearDay")) { ui.hist.day = null; render(); return; }
      if (e.target.closest("#exportCsv")) { exportCsv(); return; }
      base(e);
    };
  }
  function workoutDetail(id) {
    const w = derived.workouts.find((x) => x.id === id);
    if (!w) return;
    openModal((m) => {
      const vol = workoutVolume(w);
      const prSet = new Set(derived.prs.filter((p) => p.w.id === w.id).map((p) => p.set));
      modalShell(m, {
        title: esc(w.name || "Workout"),
        sub: `${fmtDate(w.start, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · ${new Date(w.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
        body: `<div class="kv" style="margin-top:4px"><div><b>${fmtDur((w.end || w.start) - w.start)}</b><span>Duration</span></div><div><b>${vol ? volShow(vol) : "–"}</b><span>Volume</span></div><div><b>${workoutSets(w)}</b><span>Sets</span></div><div><b>${prSet.size}</b><span>Records</span></div></div>
          ${(w.items || []).map((it) => { const ex = exById(it.ex, it.name); let n = 0; return `<div style="margin-top:16px"><button class="nm" data-ex="${esc(it.ex)}" type="button" style="background:none;border:0;padding:0;color:var(--accent);font-weight:700;font-size:14.5px;cursor:pointer">${esc(ex.name)}</button>${it.note ? `<p class="muted" style="margin:2px 0 0;font-size:12.5px">${esc(it.note)}</p>` : ""}
            <table class="table" style="margin-top:4px"><tbody>${(it.sets || []).map((s) => `<tr><td style="width:44px;color:var(--muted);font-weight:700">${s.k === "n" || !s.k ? ++n : s.k.toUpperCase()}</td><td>${esc(setText(ex.track, s))}${prSet.has(s) ? '<span class="pr-badge">PR</span>' : ""}</td><td class="r muted">${ex.track === "wr" && s.w && s.r ? "1RM " + wShow(e1rm(s.w, s.r)) : ""}</td></tr>`).join("")}</tbody></table></div>`; }).join("")}
          ${w.notes ? `<h3 style="margin:18px 0 4px;font-size:14px">Notes</h3><p style="margin:0;white-space:pre-wrap;color:var(--text-2)">${esc(w.notes)}</p>` : ""}`,
        foot: `<button class="btn ghost danger" id="wDel" type="button">${I("trash", 15)} Delete</button><span class="grow"></span>
          <button class="btn" id="wEdit" type="button">${I("edit", 15)} Edit</button><button class="btn" id="wRout" type="button">${I("copy", 15)} Save as routine</button><button class="btn primary" id="wRep" type="button">${I("repeat", 15)} Repeat</button>`,
      });
      m.onclick = (e) => { const b = e.target.closest("[data-ex]"); if (b) exerciseDetail(b.dataset.ex); };
      $("#wDel", m).onclick = async () => {
        if (!(await confirmBox("Delete workout?", `“${w.name}” on ${fmtDate(w.start)} will be deleted for good.`, "Delete", true))) return;
        removeDoc(w.id); closeAllModals(); toast("Workout deleted");
      };
      $("#wEdit", m).onclick = () => editWorkout(w);
      $("#wRep", m).onclick = () => { closeAllModals(); repeatWorkout(w); };
      $("#wRout", m).onclick = () => routineEditor({ name: w.name, notes: "", items: (w.items || []).map((it) => { const tr = exById(it.ex, it.name).track; const s = (it.sets || []).find((x) => x.k !== "w") || (it.sets || [])[0] || {}; return { ex: it.ex, sets: (it.sets || []).filter((x) => x.k !== "w").length || 1, reps: tr === "t" ? s.t || 30 : s.r || 10, rest: it.rest || 0 }; }) });
    }, true);
  }

  // ===================================================================
  // Progress
  // ===================================================================
  function weeksBack(n) { const out = []; let k = weekStart(Date.now()); for (let i = 0; i < n; i++) { out.unshift(k); k = weekStart(k - 3 * DAY); } return out; }
  function viewProgress(v) {
    const W = derived.workouts;
    const d30 = Date.now() - 30 * DAY;
    const last30 = W.filter((w) => w.start >= d30);
    const weeks = weeksBack(12);
    const perWeek = weeks.map((k) => W.filter((w) => weekStart(w.start) === k));
    const doneEx = Array.from(derived.hist.keys()).map((id) => ({ id, ex: exById(id, derived.hist.get(id)[0].it.name), n: derived.hist.get(id).length })).sort((a, b) => b.n - a.n);
    if (!ui.prog.ex || !derived.hist.has(ui.prog.ex)) ui.prog.ex = doneEx.length ? doneEx[0].id : "";
    const cur = ui.prog.ex ? exById(ui.prog.ex, derived.hist.get(ui.prog.ex)[0].it.name) : null;
    const mets = cur ? METRICS[cur.track] : [];
    if (cur && !mets.some((x) => x[0] === ui.prog.metric)) ui.prog.metric = mets[0][0];
    const pts = cur ? derived.hist.get(cur.id).map(({ w, it }) => ({ x: w.start, v: metricOf(cur.track, ui.prog.metric, it.sets || []) })).filter((p) => p.v) : [];
    const muscleRaw = heatSince(d30);
    const muscles = Object.entries(muscleRaw).sort((a, b) => b[1] - a[1]);
    const mMax = Math.max(1, ...muscles.map((x) => x[1]));
    // Best estimated 1RM per weight exercise
    const prRows = doneEx.filter((x) => x.ex.track === "wr").map((x) => {
      let best = 0, bs = null, bw = null;
      for (const { w, it } of derived.hist.get(x.id)) for (const s of it.sets || []) if (counts(s)) { const v = e1rm(s.w, s.r); if (v > best) { best = v; bs = s; bw = w; } }
      return { ex: x.ex, best, set: bs, w: bw };
    }).filter((r) => r.best > 0).sort((a, b) => b.best - a.best).slice(0, 12);
    v.innerHTML = `${subnav("progress")}<div class="page-h"><div class="grow"><h1>Progress</h1><p>How your training is adding up.</p></div></div>
      <div class="grid g4">
        <div class="card stat"><span>Workouts · 30 days</span><b>${last30.length}</b><small>${fmtNum(last30.length / 4.3, 1)} a week</small></div>
        <div class="card stat"><span>Time · 30 days</span><b>${fmtDur(last30.reduce((a, w) => a + ((w.end || w.start) - w.start), 0))}</b><small>avg ${last30.length ? fmtDur(last30.reduce((a, w) => a + ((w.end || w.start) - w.start), 0) / last30.length) : "–"}</small></div>
        <div class="card stat"><span>Volume · 30 days</span><b>${volShow(last30.reduce((a, w) => a + workoutVolume(w), 0))}</b><small>weight × reps</small></div>
        <div class="card stat"><span>Sets · 30 days</span><b>${fmtNum(last30.reduce((a, w) => a + workoutSets(w), 0))}</b><small>working sets</small></div>
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-h"><h3>Workouts per week</h3><span class="sub">12 weeks</span></div>
          ${barChart(perWeek.map((ws, i) => ({ v: ws.length, l: i % 2 === 1 || i === 11 ? new Date(weeks[i]).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "", tip: `<b>${ws.length} workout${ws.length === 1 ? "" : "s"}</b>Week of ${fmtDate(weeks[i], { month: "short", day: "numeric" })}` })), { label: "Workouts per week", int: true })}</div>
        <div class="card"><div class="card-h"><h3>Volume per week</h3><span class="sub">${wU()} lifted</span></div>
          ${barChart(perWeek.map((ws, i) => { const vv = ws.reduce((a, w) => a + workoutVolume(w), 0); return { v: isLb() ? vv * LB : vv, l: i % 2 === 1 || i === 11 ? new Date(weeks[i]).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "", tip: `<b>${volShow(vv)}</b>Week of ${fmtDate(weeks[i], { month: "short", day: "numeric" })}` }; }), { label: "Volume per week" })}</div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-h" style="flex-wrap:wrap"><h3>Exercise progress</h3>
          ${doneEx.length ? `<select class="select" id="pgEx" style="width:auto;max-width:100%">${doneEx.map((x) => `<option value="${esc(x.id)}" ${x.id === ui.prog.ex ? "selected" : ""}>${esc(x.ex.name)} (${x.n})</option>`).join("")}</select>
          <div class="seg" id="pgMet">${mets.map(([k, l]) => `<button type="button" data-k="${k}" class="${k === ui.prog.metric ? "on" : ""}">${esc(l)}</button>`).join("")}</div>` : ""}</div>
        ${cur ? `${lineChart(pts.map((p) => ({ x: p.x, y: metricToY(cur.track, ui.prog.metric, p.v), tip: `<b>${metricText(cur.track, ui.prog.metric, p.v)}</b>${fmtDate(p.x)}` })), { label: cur.name + " progress", fmt: (n) => (["time", "pace"].includes(ui.prog.metric) || (ui.prog.metric === "total" && cur.track === "t") ? fmtClock(n * 60) : shortNum(n)) })}
          <div class="kv">${mets.map(([k, l]) => `<div><b>${metricText(cur.track, k, bestMetric(derived.hist.get(cur.id), cur.track, k))}</b><span>Best ${esc(l.toLowerCase())}</span></div>`).join("")}
            <div><b>${pts.length >= 2 ? (() => { const a = pts[0].v, b = pts[pts.length - 1].v, ch = ((b - a) / a) * 100; return (ui.prog.metric === "pace" ? -ch : ch) >= 0 ? "+" + fmtNum(Math.abs(ch), 0) + "%" : "−" + fmtNum(Math.abs(ch), 0) + "%"; })() : "–"}</b><span>Since first time</span></div></div>`
          : `<div class="empty" style="padding:30px"><b>Nothing to chart yet</b>Log a few workouts and your progress shows here.</div>`}
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-h"><h3>Muscles worked</h3><span class="sub">sets · 30 days</span></div>
          ${muscles.length ? `<div class="split mus">${bodyMap(normHeat(muscleRaw))}<div class="hbars">${muscles.slice(0, 10).map(([k, n]) => `<div class="hbar"><span>${esc(D.MUSCLES[k] || k)}</span><span><i style="width:${(n / mMax) * 100}%"></i></span><span>${fmtNum(n, 1)}</span></div>`).join("")}</div></div><p class="muted" style="font-size:12px;margin:10px 0 0">A set counts fully for its main muscle and half for the others it works.</p>` : `<div class="empty" style="padding:30px">No sets in the last 30 days.</div>`}
        </div>
        <div class="card"><div class="card-h"><h3>Personal records</h3><span class="sub">best estimated 1-rep max</span></div>
          ${prRows.length ? `<table class="table"><thead><tr><th>Exercise</th><th>Best set</th><th class="r">1RM</th></tr></thead><tbody>${prRows.map((r) => `<tr data-ex="${esc(r.ex.id)}" style="cursor:pointer"><td>${esc(r.ex.name)}<div class="muted" style="font-size:11.5px">${fmtDate(r.w.start, { month: "short", day: "numeric", year: "numeric" })}</div></td><td>${esc(setText("wr", r.set))}</td><td class="r"><b>${wShow(r.best)}</b> ${wU()}</td></tr>`).join("")}</tbody></table>` : `<div class="empty" style="padding:30px">Weight exercises you log show their best here.</div>`}
        </div>
      </div>
      <div class="sec-t">Tools</div>
      <div class="grid g2">
        <div class="card"><div class="card-h"><h3>1-rep max calculator</h3></div>
          <div class="fields"><div><label class="lbl" for="t1w">Weight (${wU()})</label><input class="input" id="t1w" inputmode="decimal" placeholder="100" /></div><div><label class="lbl" for="t1r">Reps</label><input class="input" id="t1r" inputmode="numeric" placeholder="5" /></div></div>
          <div id="t1out" style="margin-top:12px" class="muted">Enter a set to see your estimated max and training weights.</div></div>
        <div class="card"><div class="card-h"><h3>Plate calculator</h3></div>
          <div class="fields"><div><label class="lbl" for="tpw">Target (${wU()})</label><input class="input" id="tpw" inputmode="decimal" placeholder="${isLb() ? 225 : 100}" /></div><div><label class="lbl" for="tpb">Bar (${wU()})</label><input class="input" id="tpb" inputmode="decimal" value="${isLb() ? 45 : 20}" /></div></div>
          <div id="tpout" style="margin-top:12px" class="muted">Plates to load on each side.</div></div>
      </div>`;
    const ex = $("#pgEx"); if (ex) ex.onchange = (e) => { ui.prog.ex = e.target.value; ui.prog.metric = ""; render(); };
    const met = $("#pgMet"); if (met) met.onclick = (e) => { const b = e.target.closest("[data-k]"); if (b) { ui.prog.metric = b.dataset.k; render(); } };
    v.onclick = (e) => { const r = e.target.closest("[data-ex]"); if (r) exerciseDetail(r.dataset.ex); };
    const calc1 = () => {
      const w = parseNum($("#t1w").value), r = parseNum($("#t1r").value);
      if (!w || !r) { $("#t1out").innerHTML = "Enter a set to see your estimated max and training weights."; return; }
      const max = e1rm(w, Math.round(r));
      $("#t1out").innerHTML = `<div class="stat"><span>Estimated 1-rep max</span><b>${fmtNum(max, 1)} ${wU()}</b></div>
        <table class="table" style="margin-top:8px"><thead><tr><th>%</th><th>Weight</th><th class="r">About</th></tr></thead><tbody>${[95, 90, 85, 80, 75, 70, 65, 60].map((p) => `<tr><td>${p}%</td><td>${fmtNum(max * p / 100, 1)} ${wU()}</td><td class="r muted">${Math.max(1, Math.round(30 * (100 / p - 1)))} reps</td></tr>`).join("")}</tbody></table>`;
    };
    const calcP = () => {
      const t = parseNum($("#tpw").value), bar = parseNum($("#tpb").value) || 0;
      if (!t) { $("#tpout").innerHTML = "Plates to load on each side."; return; }
      if (t < bar) { $("#tpout").innerHTML = "That's less than the bar."; return; }
      const plates = isLb() ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];
      let side = (t - bar) / 2; const out = [];
      for (const p of plates) while (side >= p - 1e-9) { out.push(p); side -= p; }
      $("#tpout").innerHTML = `<div class="stat"><span>Each side</span><b>${out.length ? out.join(" + ") : "Just the bar"}</b>${side > 0.01 ? `<small>${fmtNum(side * 2, 2)} ${wU()} short — round to ${fmtNum(t - side * 2, 2)} ${wU()}</small>` : ""}</div>`;
    };
    ["t1w", "t1r"].forEach((i) => ($("#" + i).oninput = calc1));
    ["tpw", "tpb"].forEach((i) => ($("#" + i).oninput = calcP));
  }

  // ===================================================================
  // Body
  // ===================================================================
  function viewBody(v) {
    const B = derived.body;
    const withW = B.filter((b) => b.weight > 0);
    const latest = withW[0];
    const ago = (days) => { const t = ymd(Date.now() - days * DAY); return withW.find((b) => b.date <= t); };
    const m30 = ago(30);
    const bmi = latest && S.height > 0 ? latest.weight / Math.pow(S.height / 100, 2) : null;
    const fat = B.find((b) => b.fat > 0);
    const since = ui.body.range ? ymd(Date.now() - ui.body.range * DAY) : "";
    const pts = withW.filter((b) => !since || b.date >= since).slice().reverse().map((b) => ({ x: fromYmd(b.date).getTime(), y: isLb() ? b.weight * LB : b.weight, tip: `<b>${wShow(b.weight)} ${wU()}</b>${fmtDate(fromYmd(b.date).getTime())}` }));
    const cm = (n) => (isLb() ? fmtNum(n / 2.54, 1) + " in" : fmtNum(n, 1) + " cm");
    v.innerHTML = `${subnav("body")}<div class="page-h"><div class="grow"><h1>Body</h1><p>Track your weight and measurements.</p></div></div>
      <div class="grid g4">
        <div class="card stat"><span>Weight</span><b>${latest ? wShow(latest.weight) + " " + wU() : "–"}</b><small>${latest ? fmtDate(fromYmd(latest.date).getTime(), { month: "short", day: "numeric" }) : "No entries yet"}</small></div>
        <div class="card stat"><span>30-day change</span><b>${latest && m30 && m30 !== latest ? (latest.weight - m30.weight >= 0 ? "+" : "−") + wShow(Math.abs(latest.weight - m30.weight)) + " " + wU() : "–"}</b><small>since ${m30 ? fmtDate(fromYmd(m30.date).getTime(), { month: "short", day: "numeric" }) : "–"}</small></div>
        <div class="card stat"><span>BMI</span><b>${bmi ? fmtNum(bmi, 1) : "–"}</b><small>${bmi ? (bmi < 18.5 ? "Under the healthy range" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Over the healthy range" : "Well over the healthy range") : `<a href="#" id="setH" style="color:var(--accent)">Add your height</a>`}</small></div>
        <div class="card stat"><span>Body fat</span><b>${fat ? fmtNum(fat.fat, 1) + "%" : "–"}</b><small>${fat ? fmtDate(fromYmd(fat.date).getTime(), { month: "short", day: "numeric" }) : "Optional"}</small></div>
      </div>
      <div class="split rev" style="margin-top:16px">
        <div class="card"><div class="card-h" style="flex-wrap:wrap"><h3>Weight</h3><div class="seg" id="bRange">${[[30, "1M"], [90, "3M"], [365, "1Y"], [0, "All"]].map(([d, l]) => `<button type="button" data-d="${d}" class="${ui.body.range === d ? "on" : ""}">${l}</button>`).join("")}</div></div>
          ${pts.length ? lineChart(pts, { label: "Body weight", h: 220 }) : `<div class="empty" style="padding:40px">Log your weight to see the trend.</div>`}</div>
        <div class="card"><div class="card-h"><h3>Log an entry</h3></div>
          <div class="fields"><div><label class="lbl" for="bDate">Date</label><input class="input" id="bDate" type="date" value="${ymd(Date.now())}" max="${ymd(Date.now())}" /></div>
            <div><label class="lbl" for="bW">Weight (${wU()})</label><input class="input" id="bW" inputmode="decimal" placeholder="${latest ? wShow(latest.weight) : ""}" /></div>
            <div><label class="lbl" for="bF">Body fat (%)</label><input class="input" id="bF" inputmode="decimal" placeholder="Optional" /></div>
            <div><label class="lbl" for="bWa">Waist (${isLb() ? "in" : "cm"})</label><input class="input" id="bWa" inputmode="decimal" placeholder="Optional" /></div></div>
          <label class="lbl" for="bN">Note</label><input class="input" id="bN" maxlength="500" placeholder="Optional" />
          <button class="btn primary block" id="bSave" type="button" style="margin-top:14px">Save entry</button>
        </div>
      </div>
      <div class="sec-t">Entries</div>
      ${B.length ? `<div class="card" style="padding:6px 12px;overflow-x:auto"><table class="table"><thead><tr><th>Date</th><th>Weight</th><th>Body fat</th><th>Waist</th><th>Note</th><th></th></tr></thead><tbody>
        ${B.slice(0, 200).map((b) => `<tr><td style="white-space:nowrap">${fmtDate(fromYmd(b.date).getTime(), { month: "short", day: "numeric", year: "numeric" })}</td><td>${b.weight > 0 ? wShow(b.weight) + " " + wU() : "–"}</td><td>${b.fat > 0 ? fmtNum(b.fat, 1) + "%" : "–"}</td><td>${b.waist > 0 ? cm(b.waist) : "–"}</td><td class="muted">${esc(b.notes || "")}</td><td class="r"><button class="icon-btn sm" data-bdel="${esc(b.id)}" type="button" aria-label="Delete entry">${I("trash", 14)}</button></td></tr>`).join("")}
      </tbody></table></div>` : `<div class="card empty" style="padding:30px">No entries yet.</div>`}`;
    $("#bRange").onclick = (e) => { const b = e.target.closest("[data-d]"); if (b) { ui.body.range = +b.dataset.d; render(); } };
    const sh = $("#setH"); if (sh) sh.onclick = (e) => { e.preventDefault(); settingsModal(); };
    $("#bSave").onclick = () => {
      const date = $("#bDate").value || ymd(Date.now());
      const weight = wIn($("#bW").value), fatV = parseNum($("#bF").value), waistIn = parseNum($("#bWa").value);
      const waist = waistIn == null ? 0 : isLb() ? waistIn * 2.54 : waistIn;
      if (!weight && !fatV && !waist) { toast("Enter your weight or a measurement"); return; }
      if ((weight || 0) > 1000 || (fatV || 0) > 100 || waist > 500) { toast("That number looks too big"); return; }
      const r = saveBodyEntry({ date, weight, fat: fatV, waist, notes: $("#bN").value });
      toast(r.updated ? "Entry updated" : "Entry saved");
    };
    v.onclick = async (e) => {
      const d = e.target.closest("[data-bdel]"); if (!d) return;
      if (await confirmBox("Delete entry?", "This body entry will be deleted.", "Delete", true)) removeDoc(d.dataset.bdel);
    };
  }

  // ===================================================================
  // Settings, export & import
  // ===================================================================
  function settingsModal() {
    openModal((m) => {
      const heightShow = S.height > 0 ? (isLb() ? Math.round(S.height / 2.54) : Math.round(S.height)) : "";
      const P = profile(), lw = latestWeight();
      modalShell(m, {
        title: "Settings",
        sub: "Saved to your account, so they follow you to every device.",
        body: `<h3 style="margin:0 0 4px;font-size:14px">About you</h3>
          <p class="muted" style="margin:0;font-size:13px">So the AI Coach can pick workouts that suit you. Weight goes in your body log for today.</p>
          <div class="fields"><div><label class="lbl" for="sAge">Age</label><input class="input" id="sAge" type="number" min="10" max="120" value="${P.age || ""}" placeholder="Years" /></div>
            <div><label class="lbl" for="sH">Height (${isLb() ? "in" : "cm"})</label><input class="input" id="sH" type="number" min="0" max="${isLb() ? 118 : 300}" value="${heightShow}" placeholder="For BMI" /></div>
            <div><label class="lbl" for="sW">Weight (${wU()})</label><input class="input" id="sW" inputmode="decimal" value="${lw ? wShow(lw) : ""}" placeholder="${wU()}" /></div></div>
          <h3 style="margin:22px 0 6px;font-size:14px">Training</h3>
          <label class="lbl">Units</label><div class="seg" id="sUnit"><button type="button" data-u="kg" class="${!isLb() ? "on" : ""}">kg · km · cm</button><button type="button" data-u="lb" class="${isLb() ? "on" : ""}">lb · mi · in</button></div>
          <div class="fields"><div><label class="lbl" for="sRest">Default rest (seconds)</label><input class="input" id="sRest" type="number" min="0" max="900" step="15" value="${S.rest}" /></div>
            <div><label class="lbl" for="sGoal">Workouts a week</label><input class="input" id="sGoal" type="number" min="1" max="14" value="${S.goal}" /></div></div>
          <label class="row" style="margin-top:14px;gap:8px;flex-wrap:nowrap"><input type="checkbox" id="sSound" ${S.sound ? "checked" : ""} /> <span>Beep when rest is over</span></label>
          <label class="row" style="margin-top:10px;gap:8px;flex-wrap:nowrap"><input type="checkbox" id="sWarm" ${warmupOn() ? "checked" : ""} /> <span>Start routines with a warm-up of moving stretches (on this device)</span></label>
          <label class="row" style="margin-top:10px;gap:8px;flex-wrap:nowrap"><input type="checkbox" id="sAi" ${!window.KPRFitAI || window.KPRFitAI.enabled() ? "checked" : ""} /> <span>Show the AI Coach (on this device)</span></label>
          <h3 style="margin:22px 0 6px;font-size:14px">Your data</h3>
          <p class="muted" style="margin:0 0 10px;font-size:13px">Download everything, or bring back a file you downloaded before.</p>
          <div class="row"><button class="btn" id="sExp" type="button">${I("download", 15)} Download (JSON)</button><button class="btn" id="sCsv" type="button">${I("download", 15)} Workouts (CSV)</button><button class="btn" id="sImp" type="button">${I("upload", 15)} Import JSON</button><input type="file" id="sFile" accept="application/json,.json" hidden /></div>
          <h3 style="margin:22px 0 6px;font-size:14px">About &amp; privacy</h3>
          <p class="muted" style="margin:0;font-size:13px;line-height:1.55">KPR Fitness keeps your workouts, routines, exercises, body entries and settings in your own KPR account. Only you can see them — not other users and not KPR admins. Nothing is shared or sold. The AI Coach sends nothing until you ask it something; then your messages, and the training data it looks up to answer, go through KPR AI to Claude (Anthropic) and aren't kept by KPR Fitness. Exercise demo photos come from Free Exercise DB (public domain). Delete a workout or entry and it's gone for good. The exercise how-tos are general guidance, not medical advice: check with a doctor before starting a new training plan, and stop if something hurts.</p>`,
        foot: `<button class="btn" data-x2 type="button">Close</button><button class="btn primary" id="sSave" type="button">Save</button>`,
      });
      m.querySelector("[data-x2]").onclick = closeModal;
      let unit = S.unit;
      $("#sUnit", m).onclick = (e) => { const b = e.target.closest("[data-u]"); if (!b) return; unit = b.dataset.u; $$("#sUnit button", m).forEach((x) => x.classList.toggle("on", x === b)); };
      $("#sSave", m).onclick = () => {
        // Height and weight are typed in the units shown when the box opened.
        const hv = parseNum($("#sH", m).value);
        const height = hv ? Math.round((isLb() ? hv * 2.54 : hv) * 10) / 10 : 0;
        const age = parseInt($("#sAge", m).value, 10), wv = parseNum($("#sW", m).value);
        if ($("#sAge", m).value && !(age >= 10 && age <= 120)) { toast("Enter an age from 10 to 120"); return; }
        if (wv != null && (wv <= 0 || wv > (isLb() ? 2200 : 1000))) { toast("That weight doesn't look right"); return; }
        const kg = wv ? wIn(wv) : 0;
        if (kg && (!lw || Math.abs(kg - lw) > 0.05)) saveBodyEntry({ date: ymd(Date.now()), weight: kg });
        if (age || P.age) saveProfile({ age: age || 0 });
        saveSettings({ unit, rest: clamp(parseInt($("#sRest", m).value, 10) || 0, 0, 900), goal: clamp(parseInt($("#sGoal", m).value, 10) || 3, 1, 14), height: clamp(height, 0, 300), sound: $("#sSound", m).checked });
        if (window.KPRFitAI) window.KPRFitAI.setEnabled($("#sAi", m).checked);
        lsSet(WARM_KEY, $("#sWarm", m).checked ? null : "0");
        closeModal(); toast("Settings saved"); rebuild(); render();
      };
      $("#sExp", m).onclick = exportJson;
      $("#sCsv", m).onclick = exportCsv;
      $("#sImp", m).onclick = () => $("#sFile", m).click();
      $("#sFile", m).onchange = (e) => { const f = e.target.files[0]; if (f) importJson(f); e.target.value = ""; };
    });
  }
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function exportJson() {
    const out = [];
    for (const [id, d] of docs) {
      if (d.kind === "active") continue;
      const x = Object.assign({ id }, d);
      delete x.createdAt; delete x.updatedAt;
      out.push(x);
    }
    download(`kpr-fitness-${ymd(Date.now())}.json`, JSON.stringify({ app: "kpr-fitness", exported: new Date().toISOString(), docs: out }, null, 1), "application/json");
  }
  function exportCsv() {
    const q = (s) => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`;
    const rows = [["Date", "Workout", "Exercise", "Set", "Type", `Weight (${wU()})`, "Reps", `Distance (${dU()})`, "Time (s)", "Notes"].map(q).join(",")];
    for (const w of derived.workouts.slice().reverse()) for (const it of w.items || []) (it.sets || []).forEach((s, i) => {
      rows.push([ymd(w.start), w.name, exById(it.ex, it.name).name, i + 1, { n: "Normal", w: "Warm-up", d: "Drop", f: "Failure" }[s.k] || "Normal", wShow(s.w), s.r ?? "", dShow(s.d), s.t ?? "", it.note || ""].map(q).join(","));
    });
    download(`kpr-fitness-workouts-${ymd(Date.now())}.csv`, rows.join("\n"), "text/csv");
  }
  const KEYS = { workout: ["name", "date", "start", "end", "notes", "items", "routine"], routine: ["name", "notes", "items"], exercise: ["name", "muscle", "equipment", "category", "track", "secondary", "notes"], body: ["date", "weight", "fat", "waist", "notes"], settings: Object.keys(DEFAULT_SETTINGS), profile: ["age"] };
  async function importJson(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch { toast("That file isn't valid JSON."); return; }
    const list = Array.isArray(data && data.docs) ? data.docs : null;
    if (!list || (data.app && data.app !== "kpr-fitness")) { toast("That isn't a KPR Fitness file."); return; }
    const good = list.filter((d) => d && KEYS[d.kind] && typeof d.id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(d.id) && (d.kind === "settings") === (d.id === "settings") && (d.kind === "profile") === (d.id === "profile"));
    if (!good.length) { toast("Nothing to import in that file."); return; }
    if (!(await confirmBox("Import?", `${good.length} item${good.length > 1 ? "s" : ""} will be added. Ones you already have (same id) are replaced.`, "Import"))) return;
    try {
      for (let i = 0; i < good.length; i += 400) {
        const b = db.batch();
        for (const d of good.slice(i, i + 400)) {
          const clean = pick(d, KEYS[d.kind]);
          clean.kind = d.kind;
          if (d.kind === "workout") { clean.start = Math.round(+clean.start || 0); clean.end = Math.round(+clean.end || 0); clean.items = (clean.items || []).slice(0, 60); }
          if (clean.items) clean.items = clone(clean.items).slice(0, 60);
          const ref = col().doc(d.id);
          if (docs.has(d.id)) b.update(ref, Object.assign(clean, { updatedAt: ts() }));
          else b.set(ref, Object.assign(clean, { createdAt: ts(), updatedAt: ts() }));
        }
        await b.commit();
      }
      toast(`Imported ${good.length} item${good.length > 1 ? "s" : ""}`);
    } catch (e) { reportErr(e, "import that file"); }
  }

  // ===================================================================
  // profile, and what the AI coach can change
  // ===================================================================
  // Age lives in its own doc (id "profile", kind "profile"), so the
  // settings doc keeps its shape, and on this device too, so the coach
  // knows it even before the account has it. Height stays in settings;
  // weight is the latest body-log entry.
  const PROFILE_KEY = () => "kprfitness.profile." + me.uid;
  function profile() {
    let local = {};
    try { local = JSON.parse(lsGet(PROFILE_KEY()) || "{}") || {}; } catch {}
    const d = docs.get("profile") || {};
    return { age: d.age > 0 ? d.age : local.age > 0 ? local.age : 0 };
  }
  function saveProfile(patch) {
    const before = profile();
    const p = Object.assign({}, before, patch);
    p.age = clamp(Math.round(+p.age || 0), 0, 120);
    lsSet(PROFILE_KEY(), JSON.stringify(p));
    if (p.age !== before.age || !docs.has("profile")) saveDoc("profile", { kind: "profile", age: p.age }, "save your age");
  }
  // An age kept only on this device (its save was refused, or made offline
  // and lost) goes up to the account the next time the app opens.
  function syncProfile() {
    let local = {};
    try { local = JSON.parse(lsGet(PROFILE_KEY()) || "{}") || {}; } catch {}
    const d = docs.get("profile");
    if (local.age > 0 && !(d && d.age > 0)) saveDoc("profile", { kind: "profile", age: clamp(Math.round(local.age), 0, 120) }, "save your age");
  }
  const latestWeight = () => { const b = derived.body.find((x) => x.weight > 0); return b ? b.weight : 0; };
  // One body entry per day: the same date updates it.
  function saveBodyEntry({ date, weight, fat, waist, notes }) {
    const same = derived.body.find((b) => b.date === date);
    const doc = { kind: "body", date, weight: weight || (same ? same.weight || 0 : 0), fat: fat ?? (same ? same.fat || 0 : 0), waist: waist || (same ? same.waist || 0 : 0), notes: String(notes || (same ? same.notes || "" : "")).slice(0, 500) };
    return { id: saveDoc(same ? same.id : null, doc, "save the entry"), updated: !!same };
  }

  // Each action does the change straight away and returns
  // { ok, done: "what changed", undo() }, or { error }. Numbers come in the
  // person's units. The chat shows what changed with an Undo button.
  // Deleting or discarding asks the person first.
  function coachSnap(ids, withActive) {
    return { act: withActive ? { a: active ? clone(active) : null } : null, prof: lsGet(PROFILE_KEY()),
      docs: ids.filter(Boolean).map((id) => [id, docs.has(id) ? clone(docs.get(id)) : null]) };
  }
  function coachRestore(s) {
    for (const [id, d] of s.docs) {
      if (!d) { if (docs.has(id)) removeDoc(id, "undo that"); continue; }
      const clean = pick(d, KEYS[d.kind] || []);
      clean.kind = d.kind;
      saveDoc(id, clean, "undo that");
      if (d.kind === "profile") lsSet(PROFILE_KEY(), s.prof);
    }
    if (s.act) {
      if (s.act.a) { active = s.act.a; lsSet(ACTIVE_KEY() + ".gone", null); persistActive(true); }
      else if (active) clearActive();
      tickFab();
    }
    render();
  }
  const done = (snap, text, extra) => Object.assign({ ok: true, done: text, undo: () => coachRestore(snap) }, extra || {});
  const lifts = (tr) => tr === "wr" || tr === "r";
  const numIn = (v, hi) => { const n = parseNum(v); return n == null ? null : Math.min(hi, n); };
  function coachSet(tr, x, isDone) {
    x = x || {};
    const s = { k: { warmup: "w", drop: "d", failure: "f" }[x.type] || "n", w: null, r: null, d: null, t: null, done: isDone };
    if (lifts(tr)) { s.w = x.weight != null && x.weight !== "" ? wIn(x.weight) : null; const r = numIn(x.reps, 9999); s.r = r == null ? null : Math.round(r); }
    if (tr === "t" || tr === "dt") { const t = numIn(x.seconds, 86400); s.t = t == null ? null : Math.round(t); }
    if (tr === "dt") s.d = x.distance != null && x.distance !== "" ? dIn(x.distance) : null;
    return s;
  }
  const hasNum = (s, tr) => (lifts(tr) ? s.r > 0 : tr === "t" ? s.t > 0 : s.d > 0 || s.t > 0);
  const knownEx = (id) => { const ex = exById(id); return ex.missing ? null : ex; };
  const routineItems = (list) => (Array.isArray(list) ? list : []).map((x) => {
    const ex = x && knownEx(x.ex); if (!ex) return null;
    const n = (v, lo, hi, d) => { const k = parseInt(v, 10); return isNaN(k) ? d : clamp(k, lo, hi); };
    return { ex: ex.id, sets: n(x.sets, 1, 20, 3), reps: ex.track === "dt" ? 0 : n(x.reps, 0, 999, ex.track === "t" ? 30 : 10), rest: n(x.rest, 0, 900, lifts(ex.track) ? S.rest : 0) };
  }).filter(Boolean).slice(0, 60);
  const names = (ids) => ids.map((id) => exById(id).name).join(", ");

  const coach = {
    // Add exercises to today's workout, starting one if none is going.
    addToWorkout(input) {
      if (active && active.editingId) return { error: "They're editing a past workout; it has to be saved or cancelled first." };
      const items = (input.items || []).map((x) => {
        const ex = x && knownEx(x.ex); if (!ex) return null;
        const sets = clamp(parseInt(x.sets, 10) || 3, 1, 20);
        const target = ex.track === "dt" ? null : clamp(parseInt(x.reps, 10) || 0, 0, 999) || null;
        const rest = x.rest != null && !isNaN(parseInt(x.rest, 10)) ? clamp(parseInt(x.rest, 10), 0, 900) : null;
        const it = makeItem(ex.id, sets, target, rest);
        if (x.weight != null && lifts(ex.track)) { const w = wIn(x.weight); it.sets.forEach((s) => { s.w = w; }); }
        return it;
      }).filter(Boolean).slice(0, 20);
      if (!items.length) return { error: "None of those exercise ids are in the library. Look them up with find_exercises." };
      const snap = coachSnap([], true);
      const ids = items.map((it) => it.ex);
      if (!active) {
        const warm = input.warmup !== false && warmupOn() ? warmupFor(ids) : [];
        startWorkout({ name: String(input.name || "").slice(0, 120) || defaultName(), items: warm.concat(items) });
        return done(snap, `Started today's workout with ${names(ids)}${warm.length ? " (after a short warm-up)" : ""}`);
      }
      active.items.push(...items);
      persistActive(); render();
      return done(snap, `Added ${names(ids)} to today's workout`);
    },
    removeFromWorkout(input) {
      if (!active) return { error: "No workout in progress." };
      const ex = knownEx(input.ex) || { id: input.ex };
      const keep = active.items.filter((it) => it.warm || it.ex !== ex.id);
      if (keep.length === active.items.length) return { error: "That exercise isn't in the workout in progress." };
      const snap = coachSnap([], true);
      active.items = keep; persistActive(); render();
      return done(snap, `Removed ${exById(ex.id).name} from today's workout`);
    },
    // Log sets the person says they did, ticking them in the workout.
    logSets(input) {
      const ex = knownEx(input.ex);
      if (!ex) return { error: "Unknown exercise id." };
      if (active && active.editingId) return { error: "They're editing a past workout; it has to be saved or cancelled first." };
      const given = (Array.isArray(input.sets) ? input.sets : []).slice(0, 30).map((x) => coachSet(ex.track, x, true)).filter((s) => hasNum(s, ex.track));
      if (!given.length) return { error: ex.track === "wr" ? "Each set needs reps (and weight)." : ex.track === "r" ? "Each set needs reps." : ex.track === "t" ? "Each set needs seconds." : "Each set needs a distance or time." };
      const snap = coachSnap([], true);
      if (!active) startWorkout({ name: defaultName(), items: [] });
      let it = active.items.find((x) => !x.warm && x.ex === ex.id);
      if (!it) { it = makeItem(ex.id, 1); it.sets = []; active.items.push(it); }
      for (const s of given) {
        const slot = it.sets.find((x) => !x.done);
        if (slot) Object.assign(slot, s); else it.sets.push(Object.assign(newSet(ex), s));
      }
      persistActive(); render();
      return done(snap, `Logged ${plural(given.length, "set")} of ${ex.name}: ${given.map((s) => setText(ex.track, s)).join(", ")}`);
    },
    // Save the workout in progress to history.
    finishWorkout(input) {
      if (!active) return { error: "No workout in progress." };
      const a = active;
      const items = a.items.filter((it) => !it.warm).map((it) => {
        const ex = exById(it.ex, it.name);
        const sets = it.sets.filter((s) => s.done || hasNum(s, ex.track)).map((s) => ({ k: s.k || "n", w: s.w ?? null, r: s.r ?? null, d: s.d ?? null, t: s.t ?? null }));
        return { ex: it.ex, name: ex.name, note: it.note || "", rest: it.rest || 0, sets };
      }).filter((it) => it.sets.length).slice(0, 60);
      if (!items.length) return { error: "Nothing is logged in the workout yet: no set has numbers." };
      const end = a.editingId ? a.end || Date.now() : a.past ? a.start + 3600000 : Date.now();
      const snap = coachSnap([a.editingId], true);
      const name = String(input.name || a.name || "Workout").trim().slice(0, 120);
      const id = saveDoc(a.editingId || null, { kind: "workout", name, date: ymd(a.start), start: a.start, end: Math.max(end, a.start + 60000), notes: a.notes || "", items, routine: a.routine || "" }, "save your workout");
      if (!a.editingId) snap.docs.push([id, null]);
      clearActive(); closeAllModals(); render();
      return done(snap, `Saved “${name}” to your history (${plural(items.reduce((n, it) => n + it.sets.length, 0), "set")})`);
    },
    async discardWorkout() {
      if (!active) return { error: "No workout in progress." };
      if (!(await confirmBox("Discard workout?", "The AI coach wants to discard the workout in progress. Nothing in it will be saved.", "Discard", true))) return { error: "The person said no; nothing was discarded." };
      const snap = coachSnap([], true);
      clearActive(); render();
      return done(snap, "Discarded the workout in progress");
    },
    startRoutine(input) {
      const r = findRoutine(input.routine);
      if (!r) return { error: "No routine with that id. Get ids from get_routines." };
      if (active) return { error: "A workout is already in progress; add exercises to it, or finish it first." };
      const snap = coachSnap([], true);
      startRoutine(r);
      return done(snap, `Started “${r.name}”`);
    },
    // Create a routine, or change one of the person's own.
    saveRoutine(input) {
      const own = input.id ? derived.routines.find((r) => r.id === input.id) : null;
      if (input.id && !own) return { error: "Only the person's own routines can be changed. Leave id out to save a new one (e.g. a copy of a program workout)." };
      const items = routineItems(input.items != null ? input.items : own && own.items);
      if (!items.length) return { error: "A routine needs at least one exercise from the library." };
      const name = String(input.name || (own && own.name) || "").trim().slice(0, 120);
      if (!name) return { error: "Give the routine a name." };
      const snap = coachSnap([own && own.id]);
      const id = saveDoc(own ? own.id : null, { kind: "routine", name, notes: String(input.notes != null ? input.notes : (own && own.notes) || "").slice(0, 5000), items }, "save the routine");
      if (!own) snap.docs.push([id, null]);
      return done(snap, `${own ? "Updated" : "Saved"} the routine “${name}” (${plural(items.length, "exercise")})`, { id });
    },
    async deleteRoutine(input) {
      const r = derived.routines.find((x) => x.id === input.id);
      if (!r) return { error: "Only the person's own routines can be deleted." };
      if (!(await confirmBox("Delete routine?", `The AI coach wants to delete “${r.name}”. Workouts you did with it stay in your history.`, "Delete", true))) return { error: "The person said no; nothing was deleted." };
      const snap = coachSnap([r.id]);
      removeDoc(r.id); render();
      return done(snap, `Deleted the routine “${r.name}”`);
    },
    // A workout done earlier, straight into history.
    logPastWorkout(input) {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date || "") ? input.date : ymd(Date.now());
      const start = fromYmd(date);
      const [hh, mm] = String(input.time || "18:00").split(":").map(Number);
      start.setHours(clamp(hh || 0, 0, 23), clamp(mm || 0, 0, 59), 0, 0);
      if (start.getTime() > Date.now()) return { error: "That's in the future." };
      const items = (input.items || []).map((x) => {
        const ex = x && knownEx(x.ex); if (!ex) return null;
        const sets = (Array.isArray(x.sets) ? x.sets : []).slice(0, 30).map((s) => coachSet(ex.track, s, true)).filter((s) => hasNum(s, ex.track)).map(({ k, w, r, d, t }) => ({ k, w, r, d, t }));
        return sets.length ? { ex: ex.id, name: ex.name, note: "", rest: lifts(ex.track) ? S.rest : 0, sets } : null;
      }).filter(Boolean).slice(0, 60);
      if (!items.length) return { error: "No sets to save: each exercise needs a library id and sets with numbers." };
      const mins = clamp(parseInt(input.minutes, 10) || 60, 1, 1440);
      const name = String(input.name || "Workout").trim().slice(0, 120);
      const snap = coachSnap([]);
      const id = saveDoc(null, { kind: "workout", name, date, start: start.getTime(), end: start.getTime() + mins * 60000, notes: String(input.notes || "").slice(0, 5000), items, routine: "" }, "save your workout");
      snap.docs.push([id, null]);
      render();
      return done(snap, `Saved “${name}” on ${fmtDate(start.getTime())} (${names(items.map((it) => it.ex))})`);
    },
    logBody(input) {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date || "") && input.date <= ymd(Date.now()) ? input.date : ymd(Date.now());
      const weight = input.weight != null ? wIn(input.weight) : null, fat = numIn(input.bodyFat, 100);
      const wa = numIn(input.waist, 500), waist = wa == null ? 0 : isLb() ? wa * 2.54 : wa;
      if (!weight && !fat && !waist) return { error: "Give a weight, body fat or waist." };
      if ((weight || 0) > 1000) return { error: "That weight looks too big." };
      const same = derived.body.find((b) => b.date === date);
      const snap = coachSnap([same && same.id]);
      const r = saveBodyEntry({ date, weight, fat, waist, notes: input.note });
      if (!same) snap.docs.push([r.id, null]);
      render();
      return done(snap, `${r.updated ? "Updated" : "Logged"} your body entry for ${fmtDate(fromYmd(date).getTime())}`);
    },
    // Age, height, weight (today's body entry), weekly goal, default rest.
    updateProfile(input) {
      const today = ymd(Date.now()), same = derived.body.find((b) => b.date === today);
      const snap = coachSnap(["settings", "profile", same && same.id]);
      const said = [], patch = {};
      if (input.age != null) { const a = parseInt(input.age, 10); if (a >= 10 && a <= 120) { saveProfile({ age: a }); said.push(`age ${a}`); } }
      if (input.height != null) { const h = numIn(input.height, 400); if (h > 0) { patch.height = clamp(round1(isLb() ? h * 2.54 : h), 0, 300); said.push(`height ${input.height} ${isLb() ? "in" : "cm"}`); } }
      if (input.weeklyGoal != null) { const g = parseInt(input.weeklyGoal, 10); if (g >= 1 && g <= 14) { patch.goal = g; said.push(`${g} workouts a week`); } }
      if (input.defaultRest != null) { const r = parseInt(input.defaultRest, 10); if (r >= 0 && r <= 900) { patch.rest = r; said.push(`default rest ${r}s`); } }
      if (Object.keys(patch).length) saveSettings(patch);
      if (input.weight != null) { const w = wIn(input.weight); if (w > 0 && w <= 1000) { const r = saveBodyEntry({ date: today, weight: w }); if (!same) snap.docs.push([r.id, null]); said.push(`weight ${input.weight} ${wU()}`); } }
      if (!said.length) return { error: "Nothing to change (age 10-120, height, weight, weeklyGoal 1-14, defaultRest 0-900)." };
      rebuild(); render();
      return done(snap, `Updated your ${said.join(", ")}`);
    },
    createExercise(input) {
      const name = String(input.name || "").trim().slice(0, 120);
      if (!name) return { error: "Give the exercise a name." };
      const dup = allEx().find((e) => e.name.toLowerCase() === name.toLowerCase());
      if (dup) return { error: `“${dup.name}” is already in the library (id ${dup.id}).` };
      const ok = (o, v, d) => (o[v] ? v : d);
      const muscle = ok(D.MUSCLES, input.muscle, "fullbody");
      const snap = coachSnap([]);
      const id = saveDoc(null, { kind: "exercise", name, muscle, equipment: ok(D.EQUIPMENT, input.equipment, "other"), category: ok(D.CATEGORIES, input.category, "strength"), track: ok(D.TRACKS, input.track, "wr"),
        secondary: (Array.isArray(input.alsoWorks) ? input.alsoWorks : []).filter((m) => D.MUSCLES[m] && m !== muscle).slice(0, 10), notes: (Array.isArray(input.steps) ? input.steps : []).map(String).join("\n").slice(0, 5000) }, "save the exercise");
      snap.docs.push([id, null]);
      exCache = null; render();
      return done(snap, `Added your own exercise “${name}”`, { id });
    },
  };

  // ===================================================================
  // header, boot
  // ===================================================================
  $("#startBtn").onclick = () => (active ? go("workout") : startWorkout());
  $("#settingsBtn").onclick = $("#settingsIb").onclick = () => { if (me && loaded && !loadErr) settingsModal(); };
  $("#fab").onclick = () => go("workout");
  $("#q").addEventListener("input", (e) => {
    lib.q = e.target.value; lib.limit = 60;
    if (currentRoute().name !== "exercises") go("exercises");
    else { const li = $("#lq"); if (li) { li.value = lib.q; li.dispatchEvent(new Event("input")); } }
  });
  // Leaving with a workout going: it's saved, so just say so.
  addEventListener("beforeunload", () => { if (active) persistActive(true); });

  // What ai.js (the AI coach) may read and do: read-only views of the data,
  // opening things on screen, and the coach actions above (each undoable).
  window.KPRFit = {
    ready: () => !!(me && loaded && !loadErr),
    user: () => me,
    settings: () => Object.assign({}, S),
    derived: () => derived,
    active: () => active,
    D, exById, allEx, setText, metricOf, metricText, METRICS, e1rm, counts, workoutVolume, workoutSets, bestMetric,
    wShow, wU, dShow, dU, isLb, fmtClock, fmtDur, ymd, fromYmd, weekStats, heatSince,
    findRoutine, filterEx, demoSrc,
    openExercise: (id) => exerciseDetail(id),
    openRoutineDraft: (r) => routineEditor(r),
    startRoutine: (r) => startRoutine(r),
    profile, latestWeight, coach,
    go,
    I, esc, toast,
  };

  render();
  KPR.init({
    appVersion: "1.7.2",
    appId: "fitness",
    appName: "KPR Fitness",
    reportButton: false,
    onReady: (user) => {
      me = user;
      db = firebase.firestore();
      // An older kpr-core still draws its own profile button.
      const account = document.getElementById("kpr-core-account");
      if (account) document.querySelector(".kpr-hdr").appendChild(account);
      loadActive();
      listen();
      render();
    },
  });
})();
