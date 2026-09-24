/* Air Watch lesson — shared helpers, live sync for the lesson room,
   and homework statistics. Used by index / teacher / projector / observer. */
(function () {
  "use strict";
  const C = window.AW || {};
  const CAT = window.AW_CAT, CATS = window.AW_CATS, PARTS = window.AW_PARTS;

  /* ───────── helpers ───────── */
  const U = {
    $: s => document.querySelector(s),
    $$: s => Array.from(document.querySelectorAll(s)),
    esc: s => String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m])),
    txt: v => String(v == null ? "" : v).trim(),
    el(tag, cls, html) { const d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; },
    mmss(ms) { if (ms == null) return "–:–"; const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); },
    catChip(aqi) { const c = CAT(aqi); return c ? '<span class="aqi" style="background:' + c.col + ';color:' + c.ink + '">' + aqi + '</span>' : '<span class="aqi none">–</span>'; },
    pct(a, b) { return b ? Math.round(100 * a / b) : 0; },
    ago(ms) { if (ms == null || !isFinite(ms)) return ""; const s = Math.max(0, Math.round(ms / 1000)); return s < 60 ? s + " s" : Math.floor(s / 60) + " min"; },
    /* countdown for the current screen: {left, paused} or null */
    timer(ST, now) {
      if (!ST || ST.live === false) return null;
      if (ST.pausedLeft != null) return { left: ST.pausedLeft, paused: true };
      if (ST.timerEnd) return { left: ST.timerEnd - now, paused: false };
      return null;
    },
    speak(text) { try { const u = new SpeechSynthesisUtterance(text); u.lang = "en-GB"; u.rate = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} },
    pinOK() { try { return sessionStorage.getItem("aw_t") === "1"; } catch (e) { return false; } },
    gate(onOk) {
      if (U.pinOK()) return onOk();
      const box = U.el("div", "card", '<div class="eyebrow">Teacher only</div><h2 style="font-size:22px">Enter your PIN</h2><label for="pin">PIN</label><input id="pin" type="password" inputmode="numeric" autocomplete="off"><div class="err" id="pe"></div><div class="btns"><button class="btn" id="pb">Open</button></div>');
      box.style.maxWidth = "420px"; box.style.margin = "40px auto";
      document.body.appendChild(box);
      const go = () => { if (U.$("#pin").value.trim() === String(C.teacherPin)) { try { sessionStorage.setItem("aw_t", "1"); } catch (e) {} box.remove(); onOk(); } else U.$("#pe").textContent = "That PIN is not right."; };
      U.$("#pb").onclick = go; U.$("#pin").onkeydown = e => { if (e.key === "Enter") go(); }; U.$("#pin").focus();
    }
  };

  /* ───────── Firebase ───────── */
  const cfg = window.FIREBASE_CONFIG || {};
  const ready = !!(cfg.databaseURL && cfg.apiKey);
  let db = null, failed = false, offset = 0, lastErr = null;
  const errFns = [];
  function boot() {
    if (!ready || db || failed) return db;
    try {
      if (typeof firebase === "undefined") { failed = true; return null; }
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      db = firebase.database();
      db.ref(".info/serverTimeOffset").on("value", s => { offset = s.val() || 0; });
    } catch (e) { failed = true; db = null; }
    return db;
  }
  function clean(v) {
    if (v === undefined) return null;
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(clean);
    const o = {}; for (const k in v) if (v[k] !== undefined) o[k] = clean(v[k]); return o;
  }
  function fail(where, e) { lastErr = where + ": " + ((e && e.message) ? e.message : e); try { console.error("[AW] " + lastErr); } catch (x) {} errFns.forEach(f => { try { f(lastErr); } catch (x) {} }); }
  const L = p => boot().ref("rooms/" + (C.lessonRoom || "G6W6") + (p ? "/" + p : ""));
  const H = p => boot().ref("rooms/" + (C.room || "G6HW6") + (p ? "/" + p : ""));
  const on = (r, fn, dflt) => { if (!boot()) { fn(dflt); return; } try { r().on("value", s => fn(s.val() == null ? dflt : s.val())); } catch (e) { fn(dflt); } };
  const set = (r, v, what) => { if (!boot()) return Promise.resolve(false); return r().set(clean(v)).then(() => true).catch(e => { fail(what || "saving", e); return false; }); };
  const upd = (r, v, what) => { if (!boot()) return Promise.resolve(false); return r().update(clean(v)).then(() => true).catch(e => { fail(what || "saving", e); return false; }); };
  const pushTo = (r, v, what) => { if (!boot()) return Promise.resolve(null); try { const p = r().push(); return p.set(clean(v)).then(() => p.key).catch(e => { fail(what || "saving", e); return null; }); } catch (e) { return Promise.resolve(null); } };

  const LS = {
    available: () => !!boot(),
    configured: ready,
    now: () => Date.now() + offset,
    lastError: () => lastErr,
    onError: fn => errFns.push(fn),
    /* true while the browser has a live connection to the database */
    watchConnected(fn) {
      if (!boot()) { fn(false); return; }
      try { db.ref(".info/connected").on("value", s => fn(s.val() === true)); } catch (e) { fn(false); }
    },

    /* state */
    watchState: fn => on(() => L("state"), fn, {}),
    setState: patch => upd(() => L("state"), patch, "changing the screen"),

    /* pairs */
    watchPairs: fn => on(() => L("pairs"), fn, {}),
    watchPair: (pid, fn) => on(() => L("pairs/" + pid), fn, null),
    savePair: (pid, patch) => upd(() => L("pairs/" + pid), patch, "saving your work"),
    saveAnswer: (pid, n, data) => set(() => L("pairs/" + pid + "/a/s" + n), data, "saving your answer"),
    markDone: (pid, n, v) => set(() => L("pairs/" + pid + "/done/" + n), v ? LS.now() : null, "saving"),
    setHelp: (pid, v) => set(() => L("pairs/" + pid + "/help"), v ? LS.now() : null, "asking for help"),

    /* wonder questions, suggestions, nudges, feedback, votes */
    addQuestion: (pid, q) => pushTo(() => L("questions"), Object.assign({ pid, at: LS.now() }, q), "posting your question"),
    watchQuestions: fn => on(() => L("questions"), fn, {}),
    flagQuestion: (qid, v) => set(() => L("questions/" + qid + "/ok"), v, "moderating"),
    addSuggestion: (pid, text) => pushTo(() => L("suggestions"), { pid, text, at: LS.now(), status: "new" }, "sending your idea"),
    watchSuggestions: fn => on(() => L("suggestions"), fn, {}),
    setSuggestion: (sid, status) => set(() => L("suggestions/" + sid + "/status"), status, "answering the idea"),
    sendNudge: (pid, text) => set(() => L("nudges/" + pid), { text, at: LS.now() }, "sending a nudge"),
    watchNudge: (pid, fn) => on(() => L("nudges/" + pid), fn, null),
    sendFeedback: (toPid, data) => set(() => L("feedback/" + toPid), Object.assign({ at: LS.now() }, data), "sending feedback"),
    watchFeedback: fn => on(() => L("feedback"), fn, {}),
    vote: (pid, key, val) => set(() => L("votes/" + key + "/" + pid), val, "voting"),
    watchVotes: fn => on(() => L("votes"), fn, {}),
    clearVotes: key => set(() => L("votes/" + key), null, "clearing the vote"),
    setMeter: m => upd(() => L("meter"), m, "saving the meter"),
    watchMeter: fn => on(() => L("meter"), fn, {}),
    logEvent: (kind, data) => pushTo(() => L("events"), Object.assign({ kind, at: LS.now() }, data || {}), "logging"),
    watchEvents: fn => on(() => L("events"), fn, {}),

    /* session: "new session" clears everything and opens screen 1 with no clock running;
       "bell" starts the 45 minutes and the screen-1 timer. */
    startSession() {
      if (!boot()) return Promise.resolve(false);
      const now = LS.now();
      return Promise.all(["pairs", "questions", "suggestions", "nudges", "feedback", "votes", "meter", "events"].map(k => L(k).remove()))
        .then(() => L("state").set({ screen: 1, live: true, reset: now, startedAt: null, screenAt: now, timerEnd: null, pausedLeft: null, reveal: {}, photos: null, ruleVote: null, classRule: null, spot: null }))
        .then(() => { LS.logEvent("session", {}); return true; }).catch(e => { fail("starting the session", e); return false; });
    },
    bell(firstMin) {
      const now = LS.now();
      return upd(() => L("state"), { live: true, startedAt: now, screen: 1, screenAt: now, timerEnd: now + (firstMin || 3) * 60000, pausedLeft: null }, "starting the lesson")
        .then(ok => { if (ok) LS.logEvent("bell", { n: 1 }); return ok; });
    },
    endSession: () => upd(() => L("state"), { live: false, timerEnd: null, pausedLeft: null, endedAt: LS.now() }, "ending the session").then(ok => { if (ok) LS.logEvent("end", {}); return ok; }),

    /* homework room (read) */
    watchHomework: fn => on(() => H("students"), fn, {}),
    watchHomeworkConfig: fn => on(() => H("config"), fn, {}),
    watchPhotoFlags: fn => on(() => H("photoFlags"), fn, {}),
    getPhoto: (code, day) => boot() ? H("photos/" + code + "_" + day).once("value").then(s => s.val()).catch(() => null) : Promise.resolve(null)
  };

  /* ───────── homework statistics ───────── */
  const HW = {
    list: students => Object.keys(students || {}).map(code => Object.assign({ code }, students[code])),
    days: s => Object.keys((s && s.days) || {}).map(Number).filter(n => s.days[n] && s.days[n].a).sort((a, b) => a - b).map(n => Object.assign({ n }, s.days[n])),
    guessScore(students) {
      let right = 0, total = 0;
      HW.list(students).forEach(s => HW.days(s).forEach(d => { const c = CAT(d.a.aqi); if (!c || !d.g) return; total++; if (d.g.guess === c.k) right++; }));
      return { right, total, pct: U.pct(right, total) };
    },
    /* class-station readings: time comparison at one place */
    classPoints(students) {
      const out = [];
      HW.list(students).forEach(s => HW.days(s).forEach(d => { if (d.ref && d.ref.aqi != null) out.push({ day: d.n, slot: s.slot || "?", aqi: d.ref.aqi, code: s.code }); }));
      return out;
    },
    bySlot(points) {
      const g = {};
      points.forEach(p => { (g[p.slot] = g[p.slot] || []).push(p.aqi); });
      return (C.slots || []).map(sl => { const v = g[sl.k] || []; return { k: sl.k, label: sl.en.split(",")[0], n: v.length, avg: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null, min: v.length ? Math.min(...v) : null, max: v.length ? Math.max(...v) : null }; });
    },
    /* own stations: place comparison */
    byStation(students) {
      const g = {};
      HW.list(students).forEach(s => { if (!s.st || !s.st.name) return; HW.days(s).forEach(d => { (g[s.st.name] = g[s.st.name] || []).push(d.a.aqi); }); });
      return Object.keys(g).map(name => { const v = g[name]; return { name, n: v.length, avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length), min: Math.min(...v), max: Math.max(...v) }; })
        .sort((a, b) => b.avg - a.avg);
    },
    readings(students) { return HW.list(students).reduce((a, s) => a + HW.days(s).length, 0); },
    completed(students) { return HW.list(students).filter(s => HW.days(s).length >= 5).length; },
    six(s) {
      const d = HW.days(s).filter(x => x.six).pop();
      if (!d) return null;
      return { aqi: d.a.aqi, six: d.six, date: d.date };
    },
    photoAqi(students, code, day) { const s = (students || {})[code]; const d = s && s.days && s.days[day]; return d && d.a ? d.a.aqi : null; },
    guessOf(students, code, day) { const s = (students || {})[code]; const d = s && s.days && s.days[day]; return d && d.g ? d.g : null; }
  };

  /* ───────── the 45-minute plan: planned starts, projection, time spent ───────── */
  const PLAN = {
    total: 45, close: 1,
    screens: () => (window.LESSON && window.LESSON.screens) || [],
    min: n => ((PLAN.screens()[n - 1] || {}).min || 0),
    startOf: n => PLAN.screens().filter(s => s.n < n).reduce((a, s) => a + s.min, 0),
    after: n => PLAN.screens().filter(s => s.n > n).reduce((a, s) => a + s.min, 0),
    /* when the lesson would end (ms after the bell) if every remaining timer is kept */
    projected(ST, now) {
      if (!ST || !ST.startedAt) return null;
      const n = ST.screen || 1, T = U.timer(ST, now);
      const left = T ? Math.max(0, T.left) : 0;
      return (now - ST.startedAt) + left + (PLAN.after(n) + PLAN.close) * 60000;
    },
    /* ms actually spent on each screen since the bell, from the event log */
    spent(events, ST, now) {
      const list = Object.keys(events || {}).map(k => events[k]).filter(e => e && e.at).sort((a, b) => a.at - b.at);
      const out = {}; let cur = null;
      const close = at => { if (cur) { out[cur.n] = (out[cur.n] || 0) + Math.max(0, at - cur.from); cur = null; } };
      list.forEach(e => {
        if (e.kind === "bell") { close(e.at); cur = { n: e.n || 1, from: e.at }; }
        else if (e.kind === "screen" && cur) { close(e.at); cur = { n: e.n, from: e.at }; }
        else if (e.kind === "end") close(e.at);
      });
      if (cur) close(ST && ST.live === false && ST.endedAt ? ST.endedAt : now);
      return out;
    }
  };

  /* ───────── small SVG charts (theme-aware through CSS variables) ───────── */
  const CH = {
    bars(items, opts) {
      opts = opts || {};
      const W = opts.w || 560, rowH = opts.rowH || 34, pad = opts.pad || 150, fs = opts.fs || 15, max = Math.max(1, ...items.map(i => i.v || 0));
      const H = items.length * rowH + 10;
      let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + U.esc(opts.label || "bar chart") + '">';
      items.forEach((it, i) => {
        const y = 5 + i * rowH, bw = Math.round((W - pad - 60) * (it.v || 0) / max);
        s += '<text x="' + (pad - 8) + '" y="' + (y + rowH / 2 + 5) + '" text-anchor="end" font-size="' + fs + '" fill="var(--text)">' + U.esc(it.label) + '</text>';
        s += '<rect x="' + pad + '" y="' + (y + 5) + '" width="' + Math.max(2, bw) + '" height="' + (rowH - 12) + '" rx="5" fill="' + (it.col || "var(--teal)") + '"' + (it.hi ? ' stroke="var(--ink)" stroke-width="3"' : '') + '/>';
        s += '<text x="' + (pad + Math.max(2, bw) + 8) + '" y="' + (y + rowH / 2 + 5) + '" font-size="' + fs + '" font-weight="700" fill="var(--text)">' + U.esc(it.show != null ? it.show : it.v) + '</text>';
      });
      return s + "</svg>";
    },
    /* class station AQI by day, coloured by time slot */
    dots(points, opts) {
      opts = opts || {};
      const W = opts.w || 560, H = opts.h || 250, l = 44, r = 26, t = 14, b = 34, fs = opts.fs || 12;
      const maxA = Math.max(100, ...points.map(p => p.aqi)) * 1.1;
      const x = d => l + (d - 1) * (W - l - r) / 6, y = a => H - b - (a / maxA) * (H - t - b);
      const col = { am: "#1C7293", pm: "#C8871B", eve: "#7B2FA0" };
      let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Class station AQI by day and time">';
      [50, 100, 150, 200].filter(v => v < maxA).forEach(v => { s += '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)"/><text x="' + (l - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-size="' + fs + '" fill="var(--muted)">' + v + '</text>'; });
      for (let d = 1; d <= 7; d++) s += '<text x="' + x(d) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="' + fs + '" fill="var(--muted)">Day ' + d + '</text>';
      points.forEach((p, i) => { const jitter = ((i * 37) % 11 - 5) * 2.2; s += '<circle cx="' + (x(p.day) + jitter) + '" cy="' + y(p.aqi) + '" r="' + (opts.r || 6) + '" fill="' + (col[p.slot] || "#888") + '" fill-opacity=".85"/>'; });
      return s + "</svg>";
    }
  };

  window.AWL = { U, LS, HW, CH, PLAN };
})();
