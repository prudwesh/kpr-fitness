/* KPR Fitness — AI Coach.

   A chat panel (header button "AI Coach"), the same kind of assistant as KPR
   Finance's: type or speak a question, Claude answers through KPR AI
   (ai.kprapps.online, prudwesh/kpr-ai: the one AI service every KPR app
   uses; the Anthropic key lives only there).

   Fitness only. It answers about the person's own training in KPR Fitness
   (workouts, records, exercise history, body log, routines), exercise
   technique and the exercise library, training plans, warm-ups, mobility,
   recovery, and how to use the app. Anything else it declines in one line.
   The same rules are also set on the server (CLIENTS.fitness in kpr-ai), so
   a changed page can't remove them.

   It reads with the lookup tools, and it can act with the action tools:
   add exercises to today's workout (starting one), log sets, finish the
   workout, start a routine or program workout, save or change the person's
   routines, log a past workout or a body entry, set age / height / weight /
   weekly goal, and add an exercise of their own. Each action is done by
   KPRFit.coach in app.js, straight away, and the chat shows what changed
   with an Undo button. Deleting a routine or discarding a workout asks the
   person first. It can also show exercises (with their demo).

   What's sent: the conversation and whatever the tools look up, as text.
   Nothing until the person asks something. Turn the coach off in Settings. */
(() => {
  "use strict";
  const KPR_AI_URL = "https://ctcfyyvfclmohokgckkm.supabase.co/functions/v1/kpr-ai";
  const K_ON = "kprfitness.ai";            // "0" = turned off in Settings
  const K_SPEAK = "kprfitness.ai.speak";   // "1" = read replies aloud
  const K_SEEN = "kprfitness.ai.seen";     // the "where your words go" note was shown
  const DAY = 86400000;
  const MAX_HOPS = 10;
  const F = () => window.KPRFit;
  const $ = (s, r = document) => r.querySelector(s);
  const ls = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} },
  };
  const enabled = () => ls.get(K_ON) !== "0";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const EXAMPLES = [
    "What should I do today?",
    "How did my training go this week?",
    "I did 3 sets of 10 squats at 60",
    "Show me how to do a Romanian deadlift",
    "Make me a 3-day muscle-building routine",
    "Which muscles haven't I trained lately?",
    "How do I warm up for squats?",
  ];
  const GREETING = "Hi! I'm your AI coach. Ask me about your training, any exercise, or what to do next.";
  const NOTE = "Your messages, and the workout data I look up to answer them, go through KPR AI to Claude (Anthropic). When you ask, I can change your workouts, routines and body log; each change shows here with an Undo button.";

  // ---------------------------------------------------------------- tools
  // Lookups first, then actions. Units follow the person's setting.
  const SET_SCHEMA = { type: "object", properties: {
    weight: { type: "number", description: "In the person's weight unit. For bodyweight exercises, only added weight." },
    reps: { type: "integer" }, seconds: { type: "integer", description: "For timed or cardio exercises." },
    distance: { type: "number", description: "In the person's distance unit, for distance exercises." },
    type: { type: "string", enum: ["normal", "warmup", "drop", "failure"] } } };
  const ITEMS_SCHEMA = { type: "array", items: { type: "object", properties: {
    ex: { type: "string", description: "Exact exercise id from find_exercises." },
    sets: { type: "integer", description: "1-20" }, reps: { type: "integer", description: "Target reps, or seconds for timed exercises." },
    rest: { type: "integer", description: "Rest seconds, 0-900. Omit for their default." } }, required: ["ex"] } };
  const ACTIONS = {
    add_to_workout: "addToWorkout", remove_from_workout: "removeFromWorkout", log_sets: "logSets", finish_workout: "finishWorkout",
    discard_workout: "discardWorkout", start_routine: "startRoutine", save_routine: "saveRoutine", delete_routine: "deleteRoutine",
    log_past_workout: "logPastWorkout", log_body: "logBody", update_profile: "updateProfile", create_exercise: "createExercise",
  };
  const TOOLS = [
    { name: "get_overview",
      description: "The person's training at a glance: today's date, their units, weekly goal and this week's count, week streak, totals for all time and the last 30 days (workouts, minutes, volume, sets), their last workout, a workout in progress if any, and their height. Call this first for general questions about how they're doing.",
      input_schema: { type: "object", properties: {} } },
    { name: "get_workouts",
      description: "Finished workouts, newest first: date, name, minutes, volume and each exercise with its sets as logged (warm-up sets marked). Filter by date range.",
      input_schema: { type: "object", properties: {
        from: { type: "string", description: "YYYY-MM-DD, inclusive. Omit for no lower limit." },
        to: { type: "string", description: "YYYY-MM-DD, inclusive. Omit for up to today." },
        limit: { type: "integer", description: "At most this many, 1-30. Default 10." } } } },
    { name: "get_exercise_history",
      description: "One exercise's history: every session with its sets, the person's bests (estimated 1-rep max, heaviest, most reps, longest, farthest as fits the exercise), times done and last done. Give the exercise's id from find_exercises, or its name.",
      input_schema: { type: "object", properties: {
        exercise: { type: "string", description: "Exercise id (e.g. barbell-bench-press) or name." },
        limit: { type: "integer", description: "Most recent sessions to include, 1-30. Default 10." } }, required: ["exercise"] } },
    { name: "get_records",
      description: "Personal records: the best set on every exercise they've logged, and the most recent records they set (with dates).",
      input_schema: { type: "object", properties: {} } },
    { name: "get_muscles_trained",
      description: "Sets per muscle group over the last N days (a set counts fully for its main muscle, half for others it works), and the muscle groups with none. Use for balance and 'what haven't I trained' questions.",
      input_schema: { type: "object", properties: { days: { type: "integer", description: "1-90. Default 7." } } } },
    { name: "get_body",
      description: "The body log: weight, body fat and waist entries (newest first), height and BMI.",
      input_schema: { type: "object", properties: { limit: { type: "integer", description: "1-60. Default 20." } } } },
    { name: "get_routines",
      description: "The person's saved routines, and the built-in programs grouped by goal (lose fat, six-pack, build muscle, get stronger, stay fit, tone up, just starting, train at home, build stamina, flexibility, glutes & legs), each goal with its explanation, suggested week, tips and workouts.",
      input_schema: { type: "object", properties: {} } },
    { name: "find_exercises",
      description: "Search the app's exercise library (226 exercises plus the person's own). Returns ids, names, main muscle, equipment, type, how sets are logged and whether there's a demo. With details, also the how-to steps and a coaching tip. Use it to get exact ids before showing exercises or drafting a routine.",
      input_schema: { type: "object", properties: {
        query: { type: "string", description: "Words to match in the name, muscle, equipment or type, e.g. 'romanian deadlift' or 'dumbbell chest'." },
        muscle: { type: "string", description: "One of: chest, back, traps, shoulders, biceps, triceps, forearms, abs, obliques, lowerback, glutes, quads, hamstrings, calves, adductors, abductors, neck, fullbody, cardio." },
        equipment: { type: "string", description: "One of: barbell, dumbbell, kettlebell, machine, cable, smith, ezbar, bodyweight, band, pullupbar, bench, medball, trx, cardio, rope, box, foamroller, mat, other." },
        category: { type: "string", description: "One of: strength, calisthenics, cardio, hiit, plyometrics, olympic, stretching, yoga, mobility, core." },
        details: { type: "boolean", description: "Include steps and tip (for at most 8 results)." },
        limit: { type: "integer", description: "1-25. Default 10." } } } },
    { name: "get_workout_in_progress",
      description: "Today's workout in progress, if any: name, when it started, and each exercise with its sets (target, numbers, done or not). Check it before logging sets or adding exercises.",
      input_schema: { type: "object", properties: {} } },
    // ---- actions: each changes their data now; the chat shows it with Undo.
    { name: "add_to_workout",
      description: "Add exercises to today's workout. If no workout is going, starts one (with a short warm-up first unless warmup is false) and opens it. Use this when they ask what to do today or to add an exercise. Optional weight pre-fills each set.",
      input_schema: { type: "object", properties: {
        items: { type: "array", items: { type: "object", properties: {
          ex: { type: "string", description: "Exact exercise id from find_exercises." }, sets: { type: "integer", description: "1-20, default 3" },
          reps: { type: "integer", description: "Target reps, or seconds for timed exercises." }, weight: { type: "number", description: "Suggested weight in their unit." },
          rest: { type: "integer", description: "Rest seconds. Omit for their default." } }, required: ["ex"] } },
        name: { type: "string", description: "Workout name if a new one is started, e.g. 'Upper body'." },
        warmup: { type: "boolean", description: "False to skip the warm-up when starting." } }, required: ["items"] } },
    { name: "remove_from_workout",
      description: "Take an exercise out of today's workout in progress.",
      input_schema: { type: "object", properties: { ex: { type: "string", description: "Exercise id." } }, required: ["ex"] } },
    { name: "log_sets",
      description: "Log sets they did today: fills and ticks sets of that exercise in the workout in progress (adding the exercise, or starting a workout, if needed).",
      input_schema: { type: "object", properties: { ex: { type: "string", description: "Exercise id." }, sets: { type: "array", items: SET_SCHEMA } }, required: ["ex", "sets"] } },
    { name: "finish_workout",
      description: "Save the workout in progress to their history (ticked sets and sets with numbers). Only when they say they're done with it.",
      input_schema: { type: "object", properties: { name: { type: "string", description: "Optional new name." } } } },
    { name: "discard_workout",
      description: "Throw away the workout in progress without saving. The app asks them to confirm. Only when they ask.",
      input_schema: { type: "object", properties: {} } },
    { name: "start_routine",
      description: "Start a workout from one of their routines or a program workout (id from get_routines). Only when no workout is going.",
      input_schema: { type: "object", properties: { routine: { type: "string", description: "Routine id." } }, required: ["routine"] } },
    { name: "save_routine",
      description: "Save a new routine to their routines, or change one of their own (give its id; fields left out stay). Use it to build plans and programs they asked for, or to copy and adjust a program workout.",
      input_schema: { type: "object", properties: {
        id: { type: "string", description: "Their routine's id to change it; omit to make a new one." },
        name: { type: "string" }, notes: { type: "string" }, items: ITEMS_SCHEMA } } },
    { name: "delete_routine",
      description: "Delete one of their own routines. The app asks them to confirm. Only when they ask.",
      input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
    { name: "log_past_workout",
      description: "Save a workout they did on an earlier day (or earlier today, finished) straight into history.",
      input_schema: { type: "object", properties: {
        date: { type: "string", description: "YYYY-MM-DD" }, time: { type: "string", description: "HH:MM start, default 18:00" },
        minutes: { type: "integer" }, name: { type: "string" }, notes: { type: "string" },
        items: { type: "array", items: { type: "object", properties: { ex: { type: "string" }, sets: { type: "array", items: SET_SCHEMA } }, required: ["ex", "sets"] } } }, required: ["items"] } },
    { name: "log_body",
      description: "Log weight, body fat or waist in the body log (one entry per day; the same date updates it).",
      input_schema: { type: "object", properties: {
        date: { type: "string", description: "YYYY-MM-DD, default today." }, weight: { type: "number", description: "In their weight unit." },
        bodyFat: { type: "number", description: "Percent." }, waist: { type: "number", description: "cm, or in with lb units." }, note: { type: "string" } } } },
    { name: "update_profile",
      description: "Change their age, height (cm, or in with lb units), weight (today's body entry, their unit), weekly workout goal or default rest seconds.",
      input_schema: { type: "object", properties: {
        age: { type: "integer" }, height: { type: "number" }, weight: { type: "number" }, weeklyGoal: { type: "integer" }, defaultRest: { type: "integer" } } } },
    { name: "create_exercise",
      description: "Add an exercise of their own to the library, only when nothing in find_exercises fits.",
      input_schema: { type: "object", properties: {
        name: { type: "string" }, muscle: { type: "string", description: "Main muscle key, as in find_exercises." }, equipment: { type: "string" }, category: { type: "string" },
        track: { type: "string", enum: ["wr", "r", "t", "dt"], description: "wr weight × reps, r reps, t time, dt distance + time." },
        alsoWorks: { type: "array", items: { type: "string" } }, steps: { type: "array", items: { type: "string" } } }, required: ["name"] } },
    { name: "end_conversation",
      description: "Call when the person says they're done (bye, that's all, thanks that's it).",
      input_schema: { type: "object", properties: {} } },
  ];

  const clampInt = (v, lo, hi, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : Math.min(hi, Math.max(lo, n)); };
  const wtxt = (kg) => `${F().wShow(kg)} ${F().wU()}`;
  const vtxt = (kg) => `${Math.round(F().isLb() ? kg * 2.2046226218 : kg).toLocaleString("en-US")} ${F().wU()}`;
  function workoutOut(w) {
    const f = F();
    return {
      date: f.ymd(w.start), name: w.name || "Workout", minutes: Math.round(((w.end || w.start) - w.start) / 60000),
      volume: w.items && f.workoutVolume(w) ? vtxt(f.workoutVolume(w)) : null,
      exercises: (w.items || []).map((it) => {
        const ex = f.exById(it.ex, it.name);
        return { id: ex.id, name: ex.name, sets: (it.sets || []).filter((s) => s.done !== false).map((s) => (s.k === "w" ? "warm-up " : s.k === "d" ? "drop set " : s.k === "f" ? "to failure " : "") + f.setText(ex.track, s)), note: it.note || undefined };
      }),
      notes: w.notes || undefined,
    };
  }
  function findEx(q) {
    const f = F(), all = f.allEx();
    const s = String(q || "").trim().toLowerCase();
    if (!s) return null;
    let e = all.find((x) => x.id === s) || all.find((x) => x.name.toLowerCase() === s);
    if (e) return e;
    // Prefer ones they've done, then the library's best word match.
    const words = s.split(/[^a-z0-9]+/).filter(Boolean);
    const score = (x) => words.filter((w) => x.name.toLowerCase().includes(w)).length;
    const done = (x) => (f.derived().hist.get(x.id) || []).length;
    const cand = all.map((x) => ({ x, sc: score(x) })).filter((c) => c.sc === words.length && words.length);
    cand.sort((a, b) => done(b.x) - done(a.x) || a.x.name.length - b.x.name.length);
    return cand.length ? cand[0].x : null;
  }
  function bestsFor(exId) {
    const f = F(), ex = f.exById(exId), list = f.derived().hist.get(exId) || [];
    const out = {};
    for (const [k, label] of f.METRICS[ex.track]) out[label] = f.metricText(ex.track, k, f.bestMetric(list, ex.track, k));
    return out;
  }
  function profileOut() {
    const f = F(), S = f.settings(), P = f.profile(), w = f.latestWeight();
    return {
      age: P.age || null,
      height: S.height > 0 ? (f.isLb() ? Math.round(S.height / 2.54) + " in" : Math.round(S.height) + " cm") : null,
      weight: w ? wtxt(w) : null,
      bmi: w && S.height > 0 ? Math.round((w / Math.pow(S.height / 100, 2)) * 10) / 10 : null,
      missing: [!P.age && "age", !(S.height > 0) && "height", !w && "weight"].filter(Boolean),
    };
  }
  // Exercise ids the model gives may be names; resolve them before acting.
  function resolveIds(input) {
    const fix = (v) => { const e = findEx(v); return e ? e.id : v; };
    const out = Object.assign({}, input);
    if (out.ex) out.ex = fix(out.ex);
    if (Array.isArray(out.items)) out.items = out.items.map((x) => (x && x.ex ? Object.assign({}, x, { ex: fix(x.ex) }) : x));
    return out;
  }
  // Actions done this turn: shown as cards with Undo once the reply is in.
  let changes = [];
  async function runTool(name, input) {
    const f = F();
    if (!f || !f.ready()) return { error: "The person's data isn't loaded yet." };
    if (ACTIONS[name]) {
      try {
        const r = await f.coach[ACTIONS[name]](resolveIds(input || {}));
        if (r && r.ok) { changes.push({ text: r.done, undo: r.undo }); return Object.assign({ ok: true, done: r.done }, r.id ? { id: r.id } : {}); }
        return r && r.error ? { error: r.error } : { error: "That didn't work." };
      } catch (e) {
        console.warn("[ai] action", name, e);
        return { error: "That change failed." };
      }
    }
    const d = f.derived(), S = f.settings();
    try {
      switch (name) {
        case "get_overview": {
          const ws = f.weekStats(), since = Date.now() - 30 * DAY;
          const l30 = d.workouts.filter((w) => w.start >= since);
          const a = f.active();
          return {
            today: f.ymd(Date.now()), units: { weight: f.wU(), distance: f.dU() },
            weeklyGoal: ws.goal, workoutsThisWeek: ws.count, weekStreak: ws.streak,
            workoutsAllTime: d.workouts.length,
            last30Days: { workouts: l30.length, minutes: l30.reduce((n, w) => n + Math.round(((w.end || w.start) - w.start) / 60000), 0),
              volume: vtxt(l30.reduce((n, w) => n + f.workoutVolume(w), 0)), sets: l30.reduce((n, w) => n + f.workoutSets(w), 0) },
            lastWorkout: d.workouts[0] ? workoutOut(d.workouts[0]) : null,
            workoutInProgress: a ? { name: a.name, exercises: a.items.map((it) => f.exById(it.ex, it.name).name), setsDone: a.items.reduce((n, it) => n + it.sets.filter((s) => s.done).length, 0) } : null,
            savedRoutines: d.routines.length,
            profile: profileOut(),
          };
        }
        case "get_workouts": {
          const from = /^\d{4}-\d{2}-\d{2}$/.test(input.from || "") ? input.from : "";
          const to = /^\d{4}-\d{2}-\d{2}$/.test(input.to || "") ? input.to : "";
          const list = d.workouts.filter((w) => { const k = f.ymd(w.start); return (!from || k >= from) && (!to || k <= to); });
          return { count: list.length, workouts: list.slice(0, clampInt(input.limit, 1, 30, 10)).map(workoutOut) };
        }
        case "get_exercise_history": {
          const ex = findEx(input.exercise);
          if (!ex) return { error: `No exercise called "${input.exercise}". Use find_exercises to look it up.` };
          const list = d.hist.get(ex.id) || [];
          return {
            id: ex.id, name: ex.name, logsAs: f.D.TRACKS[ex.track], timesDone: list.length,
            lastDone: list.length ? f.ymd(list[list.length - 1].w.start) : null,
            bests: list.length ? bestsFor(ex.id) : null,
            sessions: list.slice(-clampInt(input.limit, 1, 30, 10)).reverse().map(({ w, it }) => ({
              date: f.ymd(w.start), sets: (it.sets || []).filter((s) => s.done !== false).map((s) => (s.k === "w" ? "warm-up " : "") + f.setText(ex.track, s)) })),
          };
        }
        case "get_records": {
          const best = Array.from(d.hist.keys()).map((id) => {
            const ex = f.exById(id, d.hist.get(id)[0].it.name);
            return { id, name: ex.name, timesDone: d.hist.get(id).length, bests: bestsFor(id) };
          }).sort((a, b) => b.timesDone - a.timesDone).slice(0, 60);
          return {
            bestPerExercise: best,
            recentRecords: d.prs.slice(0, 15).map((p) => ({ date: f.ymd(p.w.start), exercise: p.name, set: f.setText(p.track, p.set) })),
          };
        }
        case "get_muscles_trained": {
          const days = clampInt(input.days, 1, 90, 7);
          const raw = f.heatSince(Date.now() - days * DAY);
          const M = f.D.MUSCLES;
          const rows = Object.entries(raw).filter(([k]) => M[k]).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ muscle: M[k], sets: Math.round(n * 10) / 10 }));
          const none = Object.keys(M).filter((k) => !raw[k] && !["fullbody", "cardio", "neck"].includes(k)).map((k) => M[k]);
          return { days, setsPerMuscle: rows, notTrained: none };
        }
        case "get_body": {
          const withW = d.body.filter((b) => b.weight > 0);
          const bmi = withW[0] && S.height > 0 ? Math.round((withW[0].weight / Math.pow(S.height / 100, 2)) * 10) / 10 : null;
          return {
            heightCm: S.height || null, latestBmi: bmi,
            entries: d.body.slice(0, clampInt(input.limit, 1, 60, 20)).map((b) => ({
              date: b.date, weight: b.weight > 0 ? wtxt(b.weight) : null, bodyFatPercent: b.fat > 0 ? b.fat : null,
              waist: b.waist > 0 ? (f.isLb() ? Math.round(b.waist / 2.54 * 10) / 10 + " in" : b.waist + " cm") : null, note: b.notes || undefined })),
          };
        }
        case "get_routines": {
          const fmt = (r) => ({ id: r.id, name: r.name, about: r.about || r.notes || undefined,
            exercises: (r.items || []).map((x) => { const ex = f.exById(x.ex); return `${ex.name}: ${x.sets} x ${ex.track === "t" ? x.reps + "s" : x.reps || "-"}${x.rest ? `, rest ${x.rest}s` : ""}`; }) });
          const byId = new Map(f.D.ROUTINES.map((r) => [r.id, r]));
          return {
            mine: d.routines.map(fmt),
            // The built-in programs, grouped by goal (the Programs tab).
            programsByGoal: f.D.GOALS.map((g) => ({ goalId: g.id, goal: g.name, forWho: g.tagline, about: g.about, suggestedWeek: g.week, tips: g.tips,
              workouts: g.routines.map((id) => byId.get(id)).filter(Boolean).map(fmt) })),
          };
        }
        case "find_exercises": {
          const pick = (o, v) => (o[v] ? v : "");
          const list = f.filterEx({ q: input.query || "", muscle: pick(f.D.MUSCLES, input.muscle), equipment: pick(f.D.EQUIPMENT, input.equipment), category: pick(f.D.CATEGORIES, input.category), only: "", sort: "done", wide: true });
          const n = clampInt(input.limit, 1, 25, 10);
          return { total: list.length, exercises: list.slice(0, n).map((e, i) => Object.assign({
            id: e.id, name: e.name, muscle: f.D.MUSCLES[e.muscle], alsoWorks: e.secondary.map((m) => f.D.MUSCLES[m]),
            equipment: f.D.EQUIPMENT[e.equipment], type: f.D.CATEGORIES[e.category], logsAs: f.D.TRACKS[e.track],
            hasDemo: !!e.demo, timesDone: (d.hist.get(e.id) || []).length, own: !e.builtin || undefined,
          }, input.details && i < 8 ? { steps: e.steps, tip: e.tip || undefined } : {})) };
        }
        case "get_workout_in_progress": {
          const a = f.active();
          if (!a) return { inProgress: false };
          return {
            inProgress: true, name: a.name, started: new Date(a.start).toLocaleString(), editingPastWorkout: !!a.editingId,
            exercises: a.items.map((it) => {
              const ex = f.exById(it.ex, it.name);
              return { id: ex.id, name: ex.name, warmUp: it.warm || undefined, rest: it.rest || 0,
                sets: it.sets.map((s) => ({ done: !!s.done, logged: f.setText(ex.track, s) || null, target: s.tr ? (ex.track === "t" ? s.tr + "s" : s.tr + " reps") : undefined })) };
            }),
          };
        }
        case "end_conversation": ended = true; return { ok: true };
      }
    } catch (e) {
      console.warn("[ai] tool", name, e);
      return { error: "That lookup failed." };
    }
    return { error: "Unknown tool." };
  }

  // ---------------------------------------------------------------- prompt
  function systemPrompt() {
    const f = F(), S = f.settings();
    return [
      "You are the AI coach inside KPR Fitness, a workout tracker. Be warm, encouraging and practical.",
      "",
      "What you help with, and nothing else:",
      "1. The person's own training in KPR Fitness: workouts, sets, records, progress, consistency, muscle balance, body log and routines. Look these up with the tools; never guess or invent numbers, dates or exercises.",
      "2. Exercise and fitness knowledge: how to do an exercise and common mistakes, which exercises train a muscle, alternatives when equipment is missing, sets / reps / rest, progression, building a routine or plan, warm-ups and cool-downs, mobility and stretching, cardio, recovery, rest days and sleep for training, and general sports-nutrition basics for training (protein, hydration, eating around workouts).",
      "3. How to use the KPR Fitness app (see the guide below).",
      "",
      "Rules:",
      "- Anything else is off topic: general knowledge, news, coding, writing, homework, other apps, money, and medical questions. Don't answer it, not even partly; say in one short sentence that you only help with fitness and their training in KPR Fitness, and suggest something you can do.",
      "- Health and safety: you aren't a doctor. Don't diagnose pain, injuries or conditions, and don't give medical, medication or clinical-diet advice. If they mention pain, an injury, dizziness, chest pain, pregnancy or a medical condition, tell them to stop that exercise and see a doctor or physiotherapist; you can still talk about training in general.",
      "- Keep replies short: a few sentences, or a short list. Plain text; '- ' bullets and **bold** are fine; no headings or tables. Replies may be read aloud.",
      `- Use their units: weight in ${f.wU()}, distance in ${f.dU()}.`,
      "- Work out dates from today's date ('this week' starts Monday).",
      "- When an exercise would help them (how to do it, or one you're recommending), show it with a line [[show: id1, id2]] using exact ids from find_exercises (at most 4). The app turns it into cards that open the exercise with its demo.",
      "- When a goal program fits what they want (lose fat, belly fat, six-pack, build muscle, get stronger, stay fit, tone up, beginner, home, stamina, flexibility, glutes), recommend it and add a line [[program: goal-id]] with the goalId from get_routines; the app shows a card that opens that program. Be honest: fat can't be lost from one spot.",
      "",
      "You can change their training with the action tools, and should when they ask:",
      "- \"What should I do (today)?\" / \"Give me a workout\": look at get_overview (their profile: age, height, weight, BMI; last workout; any workout in progress), get_muscles_trained and their program (get_routines; the Up next workout if they follow one). Pick a session that fits their age, body, goal and history: muscles they haven't trained lately, equipment they've used, about 4-7 exercises with sets, reps and rest (and a starting weight from their history when there is one). Then add it with add_to_workout (it starts today's workout) and say in a few lines what it is and why. If their next program workout fits, start_routine with it instead.",
      "- Age and level matter: for beginners, people over 50, or a high BMI, go gentler (lighter loads, more rest, lower-impact moves). Teens: bodyweight and light weights, good form.",
      "- If age, height or weight is missing (profile.missing), still help, and once mention they can tell you or add it in Settings. When they tell you, save it with update_profile.",
      "- \"I did …\" today: log_sets (it ticks the sets in today's workout). Done training: finish_workout when they say so. An earlier day: log_past_workout. Weight or measurements: log_body.",
      "- Plans and programs: build routines with save_routine (ids from find_exercises; reps = seconds for timed exercises; at most 12 exercises each), e.g. one per training day of a plan; change their own routines by id. Start one with start_routine.",
      "- Only change what they asked for, and never log sets they didn't say they did. If it's unclear what to change, ask first. delete_routine and discard_workout ask them to confirm; use them only when asked.",
      "- After acting, say in a sentence what you did. The app lists each change with an Undo button.",
      "- If an action returns an error, tell them simply, or fix the input and try again.",
      "- The [[...]] lines are read by the app and hidden; never mention them.",
      "- When they're done (bye, that's all, thanks), call end_conversation and say a short goodbye.",
      "",
      `Today: ${f.ymd(Date.now())}. Units: ${f.wU()} and ${f.dU()}. Weekly goal: ${S.goal} workouts.`,
      "",
      "App guide: tabs are Today, Workout, Programs, Exercises, Progress. Today (first visit: pick a goal; then the Up next workout of their program, streak, muscles trained, last workout, records). Workout (start empty, from a routine, or repeat one; starting a routine puts a 5-minute warm-up of moving stretches for its muscles first, which Skip warm-up removes, or Add warm-up stretches adds to any workout; log sets; the Previous column shows last time; tap the set number for warm-up / drop / failure; tick a set to start the rest timer; Finish saves it, and can save it as a routine). Exercises (library with search and filters, each with steps, a muscle map and a demo; star favourites; New exercise for your own). Programs tab (Up next, your own routines, and programs picked by goal: lose fat, six-pack, build muscle, get stronger, stay fit, tone up, just starting, train at home, build stamina, flexibility, glutes & legs; each with a suggested week, tips and workouts to Start or Copy). Progress tab, switched at its top between Stats, History and Body. History (calendar, each workout: edit, repeat, save as routine, delete; Export CSV). Progress (charts, exercise progress, muscles worked, records, 1-rep-max and plate calculators). Body (weight, body fat, waist, BMI). Settings (about you: age, height, weight; units kg/lb, default rest, weekly goal, sound, warm-up on or off, download / import your data, AI Coach on or off). Today also lists the workout in progress.",
    ].join("\n");
  }

  // ---------------------------------------------------------------- calling KPR AI
  class AiDown extends Error { constructor(reason, detail) { super(reason); this.reason = reason; this.detail = detail; } }
  const DOWN = {
    "signed-out": "Sign in to use the AI coach.",
    unreachable: "Couldn't reach KPR AI. Check your connection and try again.",
    "not-deployed": "KPR AI isn't set up yet.",
    "unknown-app": "KPR AI doesn't have KPR Fitness on its list of apps yet, so the coach can't answer. (Admin: add \"fitness\" to CLIENTS in prudwesh/kpr-ai.)",
    "no-key": "KPR AI's Anthropic key isn't set up.",
    auth: "KPR AI turned the sign-in away. Sign in again and retry.",
    "no-access": "Your account doesn't have access to the AI in KPR Fitness. Ask the admin.",
    limit: "The AI is busy or today's limit is reached. Try again later.",
    credit: "The AI credit has run out. Try again later.",
    error: "The AI had a problem. Try again in a moment.",
  };
  async function token() {
    try { const u = window.firebase && firebase.auth().currentUser; return u ? await u.getIdToken() : null; } catch { return null; }
  }
  async function callAI() {
    const t = await token();
    if (!t) throw new AiDown("signed-out");
    let res;
    try {
      res = await fetch(KPR_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ app: "fitness", system: systemPrompt(), tools: TOOLS, messages: convo }),
      });
    } catch { throw new AiDown("unreachable"); }
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      const code = err && err.error;
      if (res.status === 400 && code === "unknown_app") throw new AiDown("unknown-app");
      const map = { 429: "limit", 402: "credit", 403: "no-access", 401: "auth", 404: "not-deployed", 503: "no-key" };
      throw new AiDown(map[res.status] || "error", map[res.status] ? "" : [res.status, err && (err.message || code)].filter(Boolean).join(": "));
    }
    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.content)) throw new AiDown("error");
    return { message: { role: "assistant", content: data.content }, refused: data.stop_reason === "refusal" };
  }

  // ---------------------------------------------------------------- conversation
  let convo = [], busy = false, ended = false, gen = 0;
  const userSaid = (m) => m.role === "user" && Array.isArray(m.content) && m.content.some((b) => b.type === "text") && !m.content.some((b) => b.type === "tool_result");
  function trim() {
    if (convo.length <= 30) return;
    let i = convo.length - 30;
    while (i < convo.length && !userSaid(convo[i])) i++;
    convo = convo.slice(i);
  }
  // [[show: a, b]] and [[routine: {...}]] lines, taken out of the text.
  function directives(text) {
    const out = { show: [], routine: null, program: null, text: "" };
    out.text = String(text || "").replace(/\[\[\s*(show|routine|program)\s*:\s*([\s\S]*?)\]\](?!\])/gi, (_, kind, body) => {
      if (kind.toLowerCase() === "show") body.split(",").map((s) => s.trim()).filter(Boolean).forEach((id) => out.show.push(id));
      else if (kind.toLowerCase() === "program") out.program = body.trim();
      else { try { out.routine = JSON.parse(body); } catch { /* ignored: not valid */ } }
      return "";
    }).replace(/\n{3,}/g, "\n\n").trim();
    return out;
  }
  function cleanRoutine(r) {
    const f = F();
    if (!r || typeof r !== "object" || !Array.isArray(r.items)) return null;
    const items = r.items.map((x) => {
      const ex = x && findEx(x.ex);
      if (!ex) return null;
      const n = (v, lo, hi, d) => { const k = parseInt(v, 10); return isNaN(k) ? d : Math.min(hi, Math.max(lo, k)); };
      return { ex: ex.id, sets: n(x.sets, 1, 20, 3), reps: n(x.reps, 0, 999, ex.track === "t" ? 30 : 10), rest: n(x.rest, 0, 900, f.settings().rest) };
    }).filter(Boolean).slice(0, 12);
    if (!items.length) return null;
    return { name: String(r.name || "AI routine").slice(0, 120), notes: String(r.notes || "").slice(0, 500), items };
  }
  async function ask(text) {
    text = String(text || "").trim();
    if (!text || busy) return;
    const my = gen;
    if (!ls.get(K_SEEN)) { ls.set(K_SEEN, "1"); bubble("note", NOTE); }
    bubble("you", text);
    $("#aiExamples").hidden = true;
    const mark = convo.length;
    convo.push({ role: "user", content: [{ type: "text", text }] });
    trim();
    busy = true; ended = false; changes = []; paintBusy();
    let said = "", refused = false;
    try {
      for (let hop = 0; hop < MAX_HOPS; hop++) {
        const r = await callAI();
        if (my !== gen) return;
        convo.push(r.message);
        const t = r.message.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
        if (t) { said = t; refused = false; } else if (r.refused) refused = true;
        const calls = r.message.content.filter((b) => b.type === "tool_use");
        if (!calls.length) break;
        const results = [];
        for (const b of calls) results.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(await runTool(b.name, b.input || {})) });
        if (my !== gen) return;
        convo.push({ role: "user", content: results });
        if (hop === MAX_HOPS - 1) said = said || "Sorry, that took too many steps. Try asking in a simpler way.";
      }
    } catch (e) {
      if (my !== gen) return;
      convo.length = Math.min(convo.length, mark);
      busy = false; paintBusy();
      showChanges();
      const reason = (e && e.reason) || "error";
      bubble("note", (DOWN[reason] || DOWN.error) + (e && e.detail ? ` (${String(e.detail).slice(0, 140)})` : ""));
      return;
    }
    busy = false; paintBusy();
    const d = directives(said);
    const reply = d.text || (refused ? "Sorry, I can't help with that one." : ended ? "Bye! Have a great workout." : "Done.");
    bubble("ai", reply);
    speak(reply);
    showChanges();
    const f = F();
    const shown = Array.from(new Set(d.show)).map((id) => findEx(id)).filter(Boolean).slice(0, 4);
    if (shown.length) card(shown.map((ex) => `<button class="ai-ex" type="button" data-ai-ex="${esc(ex.id)}">
        ${ex.demo ? `<img src="${f.demoSrc(ex)}" alt="" loading="lazy" />` : `<span class="ai-ex-ph">${f.I("info", 18)}</span>`}
        <span><b>${esc(ex.name)}</b><small>${esc(f.D.MUSCLES[ex.muscle] || "")} · ${esc(f.D.EQUIPMENT[ex.equipment] || "")}${ex.demo ? " · demo" : ""}</small></span></button>`).join(""));
    const g = d.program && f.D.GOALS.find((x) => x.id === d.program);
    if (g) card(`<a class="ai-ex" href="#/routines/${esc(g.id)}" data-ai-goal><span class="ai-ex-ph" style="font-size:22px">${g.icon}</span>
        <span><b>Program: ${esc(g.name)}</b><small>${esc(g.tagline)} · ${g.routines.length} workouts</small></span></a>`);
    const r = cleanRoutine(d.routine);
    if (r) card(`<div class="ai-routine"><b>${esc(r.name)}</b><ul>${r.items.map((x) => { const ex = f.exById(x.ex); return `<li>${esc(ex.name)} <span>${x.sets} × ${ex.track === "t" ? x.reps + "s" : ex.track === "dt" ? "–" : x.reps}</span></li>`; }).join("")}</ul>
        <button class="btn primary sm" type="button" data-ai-routine>Review and save</button></div>`, { routine: r });
  }

  // What the coach changed this turn, each with Undo.
  function showChanges() {
    const list = changes; changes = [];
    if (!list.length) return;
    const el = document.createElement("div");
    el.className = "ai-card";
    el.innerHTML = `<div class="ai-done">${list.map((c, i) => `<div class="ai-done-r"><span class="ai-done-ic">${F().I("check", 14)}</span><span class="grow">${esc(c.text)}</span><button class="btn sm" type="button" data-undo="${i}">Undo</button></div>`).join("")}</div>`;
    el.onclick = (e) => {
      const b = e.target.closest("[data-undo]"); if (!b || b.disabled) return;
      // Undo newer changes first, so an earlier undo doesn't bring back a later one.
      const i = +b.dataset.undo;
      for (let j = list.length - 1; j >= i; j--) {
        const btn = el.querySelector(`[data-undo="${j}"]`);
        if (btn.disabled) continue;
        try { list[j].undo(); } catch (err) { console.warn("[ai] undo", err); }
        btn.disabled = true; btn.textContent = "Undone";
      }
      F().toast("Undone");
      if (!busy) convo.push({ role: "user", content: [{ type: "text", text: "(I pressed Undo on: " + list.slice(i).map((c) => c.text).join("; ") + ".)" }] });
      if (!busy) convo.push({ role: "assistant", content: [{ type: "text", text: "Okay, that's undone." }] });
    };
    $("#aiLog").appendChild(el);
    scrollDown();
  }

  // ---------------------------------------------------------------- voice
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false;
  function listen() {
    if (!SR) return;
    if (listening) { try { rec.stop(); } catch {} return; }
    rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    const box = $("#aiInput");
    rec.onresult = (e) => {
      const r = Array.from(e.results).map((x) => x[0].transcript).join(" ");
      box.value = r;
      if (e.results[e.results.length - 1].isFinal) { try { rec.stop(); } catch {} send(); }
    };
    rec.onend = () => { listening = false; paintMic(); };
    rec.onerror = (e) => { listening = false; paintMic(); if (e.error === "not-allowed") bubble("note", "The microphone is blocked for this site. Allow it in the browser to talk to the coach."); };
    try { rec.start(); listening = true; stopSpeaking(); } catch { listening = false; }
    paintMic();
  }
  const speakOn = () => ls.get(K_SPEAK) === "1";
  // KPR AI's own voice (kpr-ai.js): the same on every device and in every
  // KPR app. The browser's voice is only for when kpr-ai.js didn't load.
  const V = () => window.KPRAI && window.KPRAI.voice;
  function speak(text) {
    if (!speakOn()) return;
    if (V()) { V().speak(text).catch(() => {}); return; }
    if (!window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/\*\*/g, "").replace(/^[-•] /gm, ""));
      u.lang = navigator.language || "en-US";
      speechSynthesis.speak(u);
    } catch {}
  }
  function stopSpeaking() {
    try { V() && V().stop(); } catch {}
    try { window.speechSynthesis && speechSynthesis.cancel(); } catch {}
  }

  // ---------------------------------------------------------------- UI
  function md(text) {
    const lines = String(text).split("\n");
    const bold = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    let html = "", list = null;
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of lines) {
      const l = raw.trim();
      if (!l) { close(); continue; }
      const ul = /^[-*•]\s+(.*)/.exec(l), ol = /^\d+[.)]\s+(.*)/.exec(l);
      if (ul || ol) {
        const kind = ul ? "ul" : "ol";
        if (list !== kind) { close(); html += `<${kind}>`; list = kind; }
        html += `<li>${bold((ul || ol)[1])}</li>`;
      } else { close(); html += `<p>${bold(l.replace(/^#+\s*/, ""))}</p>`; }
    }
    close();
    return html;
  }
  function bubble(who, text) {
    const el = document.createElement("div");
    el.className = "ai-msg " + who;
    el.innerHTML = who === "ai" ? md(text) : `<p>${esc(text)}</p>`;
    $("#aiLog").appendChild(el);
    scrollDown();
  }
  function card(html, data) {
    const el = document.createElement("div");
    el.className = "ai-card";
    el.innerHTML = html;
    if (data && data.routine) el.querySelector("[data-ai-routine]").onclick = () => F().openRoutineDraft(data.routine);
    $("#aiLog").appendChild(el);
    scrollDown();
  }
  const scrollDown = () => { const l = $("#aiLog"); l.scrollTop = l.scrollHeight; };
  function paintBusy() {
    $("#aiThinking").hidden = !busy;
    $("#aiSend").disabled = busy;
    if (busy) scrollDown();
  }
  function paintMic() {
    const b = $("#aiMic");
    if (!b) return;
    b.hidden = !SR;
    b.classList.toggle("on", listening);
    b.setAttribute("aria-label", listening ? "Stop listening" : "Speak");
    $("#aiInput").placeholder = listening ? "Listening…" : "Ask your coach";
  }
  function paintSpeak() {
    const b = $("#aiSpeak");
    b.innerHTML = F().I(speakOn() ? "volume" : "mute", 18);
    b.title = speakOn() ? "Reading replies aloud (tap to stop)" : "Read replies aloud";
    b.setAttribute("aria-pressed", String(speakOn()));
    b.hidden = !window.speechSynthesis && !V();
  }
  function send() {
    const box = $("#aiInput");
    const t = box.value;
    box.value = "";
    autosize();
    ask(t);
  }
  const autosize = () => { const b = $("#aiInput"); b.style.height = "auto"; b.style.height = Math.min(140, b.scrollHeight) + "px"; };
  function reset() {
    gen++; convo = []; busy = false; ended = false;
    stopSpeaking();
    $("#aiLog").innerHTML = "";
    bubble("ai", GREETING);
    $("#aiExamples").hidden = false;
    paintBusy();
  }
  const panel = () => $("#aiPanel");
  const isOpen = () => !panel().hidden;
  function open(on) {
    on = !!on && enabled();
    panel().hidden = !on;
    document.body.classList.toggle("ai-open", on);
    $("#aiBtn").setAttribute("aria-expanded", String(on));
    if (!on) { stopSpeaking(); if (listening) { try { rec.stop(); } catch {} } return; }
    if (!$("#aiLog").children.length) reset();
    if (speakOn() && V()) V().prepare();   // get the voice ready before the first reply
    if (matchMedia("(pointer:fine)").matches) setTimeout(() => $("#aiInput").focus(), 30);
  }
  function build() {
    const f = F();
    const btn = $("#aiBtn");
    btn.innerHTML = `${f.I("spark", 16)}<span class="ai-btn-t"> AI Coach</span>`;
    btn.setAttribute("aria-label", "AI Coach");
    btn.onclick = () => open(!isOpen());
    const p = panel();
    p.innerHTML = `
      <div class="ai-h">
        <span class="ai-logo">${f.I("spark", 18)}</span>
        <div class="ai-t"><b>AI Coach</b><small>Fitness only · answers from your training</small></div>
        <button class="icon-btn sm" id="aiSpeak" type="button"></button>
        <button class="icon-btn sm" id="aiNew" type="button" title="New conversation" aria-label="New conversation">${f.I("repeat", 16)}</button>
        <button class="icon-btn sm" id="aiClose" type="button" aria-label="Close">${f.I("x", 18)}</button>
      </div>
      <div class="ai-log" id="aiLog" aria-live="polite"></div>
      <div class="ai-thinking" id="aiThinking" hidden><span></span><span></span><span></span> Thinking…</div>
      <div class="ai-ex-row" id="aiExamples">${EXAMPLES.map((e) => `<button class="chip" type="button" data-ai-ask="${esc(e)}">${esc(e)}</button>`).join("")}</div>
      <form class="ai-in" id="aiForm">
        <textarea id="aiInput" rows="1" maxlength="2000" placeholder="Ask your coach" aria-label="Message"></textarea>
        <button class="icon-btn" id="aiMic" type="button" aria-label="Speak">${f.I("mic", 18)}</button>
        <button class="btn primary" id="aiSend" type="submit" aria-label="Send">${f.I("send", 18)}</button>
      </form>
      <p class="ai-foot">Goes through KPR AI to Claude. Not medical advice.</p>`;
    $("#aiClose").onclick = () => open(false);
    $("#aiNew").onclick = reset;
    $("#aiSpeak").onclick = () => { ls.set(K_SPEAK, speakOn() ? null : "1"); if (!speakOn()) stopSpeaking(); else if (V()) V().prepare(); paintSpeak(); };
    $("#aiMic").onclick = listen;
    $("#aiForm").onsubmit = (e) => { e.preventDefault(); send(); };
    const box = $("#aiInput");
    box.oninput = autosize;
    box.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
    p.addEventListener("click", (e) => {
      const ex = e.target.closest("[data-ai-ex]"); if (ex) return F().openExercise(ex.dataset.aiEx);
      const q = e.target.closest("[data-ai-ask]"); if (q) return ask(q.dataset.aiAsk);
      // A program opens on the page behind; on a phone the panel covers it.
      if (e.target.closest("[data-ai-goal]") && matchMedia("(max-width: 1099px)").matches) open(false);
    });
    // Capture phase: decided before the app's own Escape closes a popup, so
    // one press closes the popup only, and the next one closes the coach.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen() && !document.querySelector(".overlay.open") && !document.querySelector(".menu.open")) open(false);
    }, true);
    paintSpeak(); paintMic();
    refresh();
  }
  function refresh() {
    const on = enabled();
    $("#aiBtn").hidden = !on;
    if (!on && isOpen()) open(false);
  }

  // Wait for the app (and sign-in) before showing the button.
  const wait = setInterval(() => {
    if (!F() || !F().ready()) return;
    clearInterval(wait);
    build();
  }, 200);

  window.KPRFitAI = {
    enabled,
    setEnabled: (on) => { ls.set(K_ON, on ? null : "0"); if (F() && F().ready()) refresh(); },
    open: () => open(true),
  };
})();
