/* Air Watch lesson — live evidence, counted from the pairs' own work.
   Used by the teacher view (targets) and the observer view (framework panel).
   Pure functions: nothing here writes to the database. */
(function () {
  "use strict";
  const D = window.LESSON, CAT = window.AW_CAT;
  const { U, HW } = window.AWL;
  const t = v => U.txt(v);
  /* Firebase returns a partly-filled list (e.g. only blank 3 typed) as an object: read both */
  const arr = v => Array.isArray(v) ? v : (v && typeof v === "object") ? Object.keys(v).filter(k => /^\d+$/.test(k)).reduce((o, k) => { o[+k] = v[k]; return o; }, []) : [];
  const nFilled = v => arr(v).filter(x => t(x)).length;
  const has = v => v !== null && v !== undefined && v !== "" && v !== false && !(Array.isArray(v) && !v.length);
  const S = (p, n) => (p && p.a && p.a["s" + n]) || {};
  const pl = (n, one, many) => n + " " + (n === 1 ? one : (many || one + "s"));


  function pairs(P) {
    return Object.keys(P || {}).map(pid => P[pid] && Object.assign({ pid }, P[pid], { names: arr(P[pid].names).filter(Boolean) }))
      .filter(p => p && p.st && p.names.length)
      .sort((a, b) => a.st - b.st || (a.joined || 0) - (b.joined || 0));
  }
  const evList = E => Object.keys(E || {}).map(k => Object.assign({ id: k }, E[k])).filter(e => e && e.at).sort((a, b) => a.at - b.at);
  const label = (opts, k) => { const o = (opts || []).find(x => x[0] === k); return o ? o[1] : k; };

  /* ───────── auto-marked checks ───────── */
  const MARK = {
    sort: (a, cd) => (a.sort && a.sort[cd.k]) ? a.sort[cd.k] === (cd.yes ? "yes" : "no") : null,
    sortAll: a => Object.keys(a.sort || {}).length < D.focus.cards.length ? null : D.focus.cards.every(cd => a.sort[cd.k] === (cd.yes ? "yes" : "no")),
    q1: (a, i) => arr(a.q1)[i] ? arr(a.q1)[i] === D.focus.q1.key[i] : null,
    q2: (a, i) => arr(a.q2)[i] ? arr(a.q2)[i] === D.focus.q2.key[i] : null,
    map: a => a.map == null ? null : a.map === D.focus.map.key,
    hyp: a => a.hyp ? a.hyp === "big" : null,
    dbq1: a => { const p = arr(a.d1 && a.d1.pick); return p.length < 2 ? null : (p.includes("B") && p.includes("D")); },
    dbq1roles: a => { const r = (a.d1 && a.d1.role) || {}; return (!r.B || !r.D) ? null : (r.B === "effect" && r.D === "cause"); },
    dbq2: a => (a.d2 && a.d2.pick) ? a.d2.pick === D.inv2.dbq2.key : null,
    q3: a => { const p = arr(a.q3); return p.length < 3 ? null : ["A", "B", "C"].every(k => p.includes(k)); }
  };
  function checks(P) {
    const L = pairs(P);
    const row = (label, n, f) => { const v = L.map(p => f(S(p, n))).filter(x => x !== null); return { label, screen: n, n: v.length, right: v.filter(Boolean).length, pct: v.length ? U.pct(v.filter(Boolean).length, v.length) : null }; };
    return [
      row("Sort: all 8 right", 4, MARK.sortAll),
      ...D.focus.q1.terms.map((term, i) => row("Q1 " + term, 4, a => MARK.q1(a, i))),
      ...D.focus.q2.items.map((it, i) => row("Q2 " + it.slice(0, 2) + " (" + D.focus.q2.key[i] + ")", 4, a => MARK.q2(a, i))),
      row("Language: “The AQI tells us…”", 4, MARK.map),
      row("AQI = the biggest part", 5, MARK.hyp),
      row("DBQ1 (p.33): B and D", 6, MARK.dbq1),
      row("DBQ1: B effect, D cause", 6, MARK.dbq1roles),
      row("DBQ2 (p.34): A", 6, MARK.dbq2),
      row("Q3 (p.32): A, B, C", 8, MARK.q3)
    ];
  }

  /* ───────── progress on one screen ───────── */
  function progress(n, a, ctx) {
    a = a || {}; ctx = ctx || {};
    let items;
    switch (n) {
      case 1: items = [a.worst, a.eyes, a.pre, a.preConf]; break;
      case 2: items = [a.qPosted].concat(ctx.photos ? [a.photoVote] : []); break;
      case 3: items = [a.p1, a.p2, nFilled(a.ex) >= 2, a.book]; break;
      case 4: items = [Object.keys(a.sort || {}).length >= D.focus.cards.length, nFilled(a.rule) >= 1, nFilled(a.q1) >= 4, nFilled(a.q2) >= 4, a.map != null, a.book]; break;
      case 5: items = [a.hyp, nFilled(a.fr) >= 1, a.time && a.time.yn, a.place && a.place.yn, a.diff && a.diff.yn]; break;
      case 6: items = [arr(a.d1 && a.d1.pick).length === 2, Object.keys((a.d1 && a.d1.role) || {}).length >= 2, a.d2 && a.d2.pick, nFilled(a.tw2) >= 3, a.book]; break;
      case 7: items = [a.frame, a.submitted, a.book].concat(ctx.ruleVote ? [a.vote != null] : []); break;
      case 8: items = [arr(a.q3).length === 3, nFilled(a.fD) >= 1, nFilled(a.fE) >= 1, Object.values(a.plan || {}).filter(x => t(x)).length >= 3, a.reviewed]; break;
      case 9: items = [a.post, a.goalsShown, (a.rec || {}).sci && (a.rec || {}).think, arr(a.rate).filter(r => r && r.lv).length === 3, t(a.exit), a.book]; break;
      default: items = [];
    }
    return { got: items.filter(has).length, of: items.length };
  }

  /* ───────── one-line summary of a pair's work on a screen (HTML) ───────── */
  const ok = v => v === null ? "" : v ? ' <b class="yes">✓</b>' : ' <b class="no">✗</b>';
  const q = s => t(s) ? "“" + U.esc(t(s)) + "”" : "";
  function frameText(parts, vals, count) {
    vals = arr(vals); if (!nFilled(vals)) return "";
    let s = ""; for (let i = 0; i < count; i++) s += (parts[i] || "") + " " + (t(vals[i]) || "…") + " ";
    if (parts.length > count) s += parts[count];
    return t(s.replace(/\s+/g, " "));
  }
  function summary(n, p, ctx) {
    ctx = ctx || {};
    const a = S(p, n), H = ctx.homework || {}, e = U.esc, out = [];
    switch (n) {
      case 1: {
        const w = a.worst, aq = w ? HW.photoAqi(H, w.code, w.day) : null;
        if (w) out.push("Worst: Day " + w.day + (aq != null ? " " + U.catChip(aq) : ""));
        if (a.eyes) out.push("eyes right? " + (a.eyes === "yes" ? "yes" : "no"));
        if (a.pre) out.push("Tell by looking? <b>" + e(label(D.vote.opts, a.pre)) + "</b>" + (a.preConf ? " (" + ["", "not sure", "quite sure", "very sure"][+a.preConf] + ")" : ""));
        break;
      }
      case 2:
        if (a.photoVote) out.push("Photo vote: " + e(a.photoVote));
        if (a.qPosted) out.push("Asked: " + q(a.q)); else if (t(a.q)) out.push("<i>drafting:</i> " + q(a.q));
        break;
      case 3:
        if (a.p1) out.push("Clean? " + e(label(D.jar.predict1.opts, a.p1)));
        if (a.p2) out.push("PM2.5: " + e(label(D.jar.predict2.opts, a.p2)));
        if (nFilled(a.ex)) out.push(q(frameText(D.jar.frame, a.ex, 3)));
        break;
      case 4: {
        const srt = D.focus.cards.map(cd => MARK.sort(a, cd)).filter(x => x !== null);
        if (srt.length) out.push("Sort " + srt.filter(Boolean).length + "/" + srt.length);
        const q1 = D.focus.q1.key.map((k, i) => MARK.q1(a, i)).filter(x => x !== null), q2 = D.focus.q2.key.map((k, i) => MARK.q2(a, i)).filter(x => x !== null);
        if (q1.length) out.push("Q1 " + q1.filter(Boolean).length + "/" + q1.length);
        if (q2.length) out.push("Q2 " + q2.filter(Boolean).length + "/" + q2.length);
        if (a.map != null) out.push("Language" + ok(MARK.map(a)));
        if (nFilled(a.rule)) out.push("Rule: " + q(frameText(D.focus.rule, a.rule, 2)));
        break;
      }
      case 5:
        if (a.hyp) out.push("AQI = " + ({ total: "all six added", avg: "the average", big: "the biggest part" }[a.hyp] || a.hyp) + ok(MARK.hyp(a)));
        if (a.time && a.time.yn) out.push("time changes it? " + e(a.time.yn) + (t(a.time.ev) ? " — " + q(a.time.ev) : ""));
        if (a.place && a.place.yn) out.push("place? " + e(a.place.yn) + (t(a.place.ev) ? " — " + q(a.place.ev) : ""));
        if (nFilled(a.fr)) out.push(q(frameText(D.inv1.frame, a.fr, 2)));
        break;
      case 6: {
        const pk = arr(a.d1 && a.d1.pick);
        if (pk.length) out.push("DBQ1 " + e(pk.join("+")) + ok(MARK.dbq1(a)));
        if (a.d2 && a.d2.pick) out.push("DBQ2 " + e(a.d2.pick) + ok(MARK.dbq2(a)));
        if (nFilled(a.tw2)) out.push(q(frameText(["", D.inv2.tw2.frame[0], D.inv2.tw2.frame[1], D.inv2.tw2.frame[2]], a.tw2, 4)));
        break;
      }
      case 7: {
        const f = D.gen.frames.find(x => x.k === a.frame);
        if (a.submitted && t(a.rule)) out.push("<b>Sent:</b> " + q(a.rule));
        else if (f && a.parts && nFilled(a.parts[f.k])) out.push("<i>drafting " + e(f.k.toUpperCase()) + ":</i> " + q(frameText(f.parts, a.parts[f.k], f.parts.length - (f.k === "g2" ? 1 : 0))));
        if (a.vote != null) out.push("voted " + "ABC"[a.vote]);
        break;
      }
      case 8: {
        if (arr(a.q3).length) out.push("Q3 " + e(arr(a.q3).slice().sort().join(", ")) + ok(MARK.q3(a)));
        if (nFilled(a.fD)) out.push(q(D.transfer.failD[0] + " " + t(a.fD[0])));
        if (nFilled(a.fE)) out.push(q(D.transfer.failE[0] + " " + t(a.fE[0])));
        const pl = a.plan || {}, got = D.transfer.plan.filter(([k]) => t(pl[k]));
        if (got.length) out.push("Plan " + got.length + "/4" + (t(pl.where) ? " · where: " + q(pl.where) : ""));
        if (a.reviewed) out.push("feedback sent ✓");
        break;
      }
      case 9: {
        if (a.post) out.push("Tell by looking? <b>" + e(label(D.vote.opts, a.post)) + "</b>" + (S(p, 1).pre ? " (was " + e(label(D.vote.opts, S(p, 1).pre)) + ")" : ""));
        if (a.goalsShown) {
          const r = a.rec || {}, w = { got: "got it", partly: "partly", missed: "missed" };
          out.push("from memory — science goal: " + (w[r.sci] || "…") + keyHint(a.memSci, "sci") + " · thinking goal: " + (w[r.think] || "…") + keyHint(a.memThink, "think"));
        }
        const r = arr(a.rate).filter(x => x && x.lv);
        if (r.length) out.push("self-rating: " + r.map(x => ({ no: "not yet", almost: "almost", yes: "yes" }[x.lv])).join(", "));
        if (t(a.exit)) out.push(q(a.exit));
        break;
      }
    }
    if (t(a.ch)) out.push("★ challenge: " + q(a.ch));
    return out.join(" · ");
  }

  /* ───────── choice counts for the projector ───────── */
  function tally(P, n, get, keys) {
    const L = pairs(P), c = {}; keys.forEach(k => { c[k] = 0; });
    let total = 0;
    L.forEach(p => { let v = get(S(p, n)); if (v && typeof v === "object" && !Array.isArray(v)) v = arr(v); (Array.isArray(v) ? v : [v]).forEach(x => { if (x != null && c[x] != null) { c[x]++; } }); if (v != null && !(Array.isArray(v) && !v.length)) total++; });
    return { counts: c, total };
  }
  function shift(P) {
    const L = pairs(P), rank = { yes: 0, some: 1, no: 2 };
    const pre = { yes: 0, some: 0, no: 0 }, post = { yes: 0, some: 0, no: 0 };
    let moved = 0, both = 0;
    L.forEach(p => {
      const a = S(p, 1).pre, b = S(p, 9).post;
      if (a && pre[a] != null) pre[a]++;
      if (b && post[b] != null) post[b]++;
      if (a && b) { both++; if (rank[b] > rank[a]) moved++; }
    });
    return { pre, post, moved, both };
  }

  /* ───────── the three goals, measured screen by screen ───────── */
  const hasDigit = v => /\d/.test(arr(v).join(" "));
  const noPlace = x => !/ha\s*noi|hà\s*nội/i.test(x || "");
  const allOf = (vals, need) => { const done = vals.filter(x => x !== null); if (!done.length) return null; return done.length === vals.length && vals.filter(Boolean).length >= need; };
  const GC = [
    { id: "s3",  g: "sci",   n: 3, label: "Jar Test: explained with the number, not the look", test: a => nFilled(a.ex) ? (nFilled(a.ex) >= 2 && hasDigit(a.ex)) : null },
    { id: "s4a", g: "sci",   n: 4, label: "Pollutant or not: 7–8 of 8 cards right", test: a => allOf(D.focus.cards.map(cd => MARK.sort(a, cd)), 7) },
    { id: "s4b", g: "sci",   n: 4, label: "Book Q2 (p.32): 3–4 of 4 right", test: a => allOf(D.focus.q2.key.map((k, i) => MARK.q2(a, i)), 3) },
    { id: "s5",  g: "sci",   n: 5, label: "The AQI is the biggest of the six parts", test: MARK.hyp },
    { id: "s6",  g: "sci",   n: 6, label: "DBQ2 (p.34): A", test: MARK.dbq2 },
    { id: "l4a", g: "lang",  n: 4, label: "Key words: book Q1 matched 4 of 4", test: a => allOf(D.focus.q1.key.map((k, i) => MARK.q1(a, i)), 4) },
    { id: "l4b", g: "lang",  n: 4, label: "Grammar: “The AQI tells us…”", test: MARK.map },
    { id: "l5",  g: "lang",  n: 5, label: "“The AQI shows ___, but it hides ___.”", test: a => nFilled(a.fr) ? nFilled(a.fr) >= 2 : null },
    { id: "l6",  g: "lang",  n: 6, label: "“___ tells us that the AQI was ___” with a number", test: a => nFilled(a.tw2) > 1 ? (nFilled(a.tw2) >= 3 && hasDigit(arr(a.tw2).slice(1))) : null },
    { id: "l8",  g: "lang",  n: 8, label: "“If the city did D, it would miss ___” — both sentences", test: a => (nFilled(a.fD) || nFilled(a.fE)) ? (nFilled(a.fD) >= 1 && nFilled(a.fE) >= 1) : null },
    { id: "t2",  g: "think", n: 2, label: "Asked a question to investigate", test: a => a.qPosted ? true : (t(a.q) ? false : null) },
    { id: "t5",  g: "think", n: 5, label: "Time or place: decided with evidence", test: a => { const tm = a.time || {}, pl = a.place || {}; if (!tm.yn && !pl.yn) return null; return !!(tm.yn && pl.yn && (t(tm.ev) || t(pl.ev))); } },
    { id: "t6",  g: "think", n: 6, label: "DBQ1 (p.33): one cause and one effect", test: a => { const x = MARK.dbq1(a); return x === null ? null : (x && MARK.dbq1roles(a) === true); } },
    { id: "t7",  g: "think", n: 7, label: "A rule for any city (no place name)", test: a => a.submitted ? (!!t(a.rule) && noPlace(a.rule)) : (a.frame ? false : null) },
    { id: "t8a", g: "think", n: 8, label: "Q3 (p.32): A, B and C", test: MARK.q3 },
    { id: "t8b", g: "think", n: 8, label: "A fair plan: where, when, how often, compared with what", test: a => { const k = Object.values(a.plan || {}).filter(x => t(x)).length; return k ? k >= 4 : null; } }
  ];
  /* key words that suggest a goal was recalled (teacher hint only) */
  const KW = {
    sci: ["clear", "clean", "pollut", "aqi", "made of", "pm", "part", "look", "air"],
    think: ["evidence", "test", "fair", "plan", "measure", "where", "when", "often", "compar", "prove", "number"]
  };
  function keyHits(text, k) { const s = String(text || "").toLowerCase(); return (KW[k] || []).filter(w => s.includes(w)).length; }
  function keyHint(text, k) { return t(text) ? (keyHits(text, k) >= 2 ? " (key words ✓)" : " (few key words)") : ""; }
  function goals(X) {
    const L = pairs(X.pairs), N = L.length, ST = X.state || {}, cur = ST.screen || 1, live = ST.live !== false;
    const opened = new Set();
    evList(X.events).forEach(e => { if ((e.kind === "screen" || e.kind === "bell") && (!ST.startedAt || e.at >= ST.startedAt - 1000)) opened.add(e.n || 1); });
    const stateOf = n => !ST.startedAt ? "later" : (n === cur && live) ? "live" : (opened.has(n) || n < cur || (!live && n <= cur)) ? "closed" : "later";
    return D.goals.map(g => {
      const checks = GC.filter(c => c.g === g.k).map(c => {
        const res = L.map(p => c.test(S(p, c.n)));
        const met = res.filter(r => r === true).length;
        return { id: c.id, n: c.n, label: c.label, met, tried: res.filter(r => r !== null).length, N, pct: N ? U.pct(met, N) : null, state: stateOf(c.n) };
      });
      const closed = checks.filter(c => c.state === "closed" && c.pct !== null);
      const liveC = checks.filter(c => c.state === "live" && c.pct !== null);
      const avg = cs => cs.length ? Math.round(cs.reduce((s, c) => s + c.pct, 0) / cs.length) : null;
      return Object.assign({}, g, { checks, pct: avg(closed), closed: closed.length, livePct: avg(liveC), live: liveC.length });
    });
  }
  /* one pair: checks met so far for each goal */
  function pairGoals(p, ST) {
    const cur = (ST && ST.screen) || 1;
    return D.goals.map(g => {
      const cs = GC.filter(c => c.g === g.k && c.n <= cur);
      return { k: g.k, short: g.short, met: cs.filter(c => c.test(S(p, c.n)) === true).length, of: cs.length };
    });
  }
  const goalTone = pct => pct == null ? "later" : pct >= 80 ? "met" : pct >= 60 ? "near" : "low";

  /* ───────── the framework panel ───────── */
  function rubric(X) {
    const L = pairs(X.pairs), N = L.length;
    const ST = X.state || {}, EV = evList(X.events), cur = ST.screen || 1;
    const pc = k => N ? U.pct(k, N) : null;
    const byPid = f => EV.filter(f).reduce((m, e) => { if (e.pid) m[e.pid] = (m[e.pid] || 0) + 1; return m; }, {});
    const opened = {}; EV.forEach(e => { if (e.kind === "screen" || e.kind === "bell") opened[e.n || 1] = true; });
    const closed = Object.keys(opened).map(Number).filter(n => n < cur);
    const rows = [];

    /* 3A.1 recall + self-assessment of the goals */
    const recOf = (p, k) => ((S(p, 9).rec || {})[k]) || null;
    const typed = L.filter(p => S(p, 9).goalsShown);
    const rec2 = typed.filter(p => recOf(p, "sci") === "got" && recOf(p, "think") === "got");
    const cntRec = (k, v) => L.filter(p => recOf(p, k) === v).length;
    const rated = L.filter(p => arr(S(p, 9).rate).filter(r => r && r.lv).length === 3);
    const ratedEv = L.filter(p => arr(S(p, 9).rate).filter(r => r && r.lv && r.ev).length === 3);
    const a31 = L.filter(p => rec2.includes(p) && rated.includes(p));
    rows.push({ code: "3A.1", name: "Setting objectives", when: 9, target: 80, pct: pc(a31.length), k: a31.length,
      detail: "From memory — science goal: got it " + cntRec("sci", "got") + ", partly " + cntRec("sci", "partly") + " · thinking goal: got it " + cntRec("think", "got") + ", partly " + cntRec("think", "partly") + " · both goals right and all three self-assessed: " + a31.length + " of " + N + " pairs." });

    /* 3A.2 standards shown on each task → pairs finishing each task */
    const done = n => L.filter(p => p.done && p.done[n]).length;
    const perScreen = closed.map(n => ({ n, pct: pc(done(n)) }));
    const avg = perScreen.length ? Math.round(perScreen.reduce((s, x) => s + (x.pct || 0), 0) / perScreen.length) : null;
    rows.push({ code: "3A.2", name: "Giving instruction", when: 2, target: 80, pct: avg, k: null,
      detail: perScreen.length ? "Pairs who finished each task to its criteria: " + perScreen.map(x => "screen " + x.n + " " + x.pct + "%").join(" · ") + "." : "Counted once the first screen is over." });

    /* 3B technology */
    const saved = L.reduce((s, p) => s + Object.keys(p.a || {}).filter(k => progress(+k.slice(1), p.a[k]).got > 0).length, 0);
    const hwStudents = HW.list(X.homework).filter(s => HW.days(s).length).length;
    const hwReadings = HW.readings(X.homework);
    rows.push({ code: "3B", name: "Using ICT", kind: "evidence",
      detail: "Pairs online: " + N + " · " + saved + " tasks saved as they work · " + hwReadings + " readings from " + hwStudents + " students’ own 7-day Air Watch feed the lesson · live PM2.5 meter · four linked views (pairs, teacher, projector, observers)." });

    /* 3C.1 explaining with evidence + talk */
    const evSent = p => [nFilled(S(p, 3).ex) >= 2, nFilled(S(p, 5).fr) >= 1 || t((S(p, 5).time || {}).ev) || t((S(p, 5).place || {}).ev), nFilled(S(p, 6).tw2) >= 3, nFilled(S(p, 8).fD) >= 1 && nFilled(S(p, 8).fE) >= 1].filter(Boolean).length;
    const c1 = L.filter(p => evSent(p) >= 2);
    rows.push({ code: "3C.1", name: "Student engagement", when: 5, target: 80, pct: pc(c1.length), k: c1.length,
      detail: "Pairs with 2+ written explanations that use a number or observation as evidence: " + c1.length + " of " + N + ". Talk: Pilot and Navigator swap at every screen; the Navigator speaks for the pair." + (X.talk ? " Observer’s talk tally: students " + X.talk + "% of talk time." : "") });

    /* 3C.2 teams without the teacher */
    const helps = byPid(e => e.kind === "help"), inter = byPid(e => e.kind === "helped" || e.kind === "nudge");
    const c2 = L.filter(p => (inter[p.pid] || 0) <= 1);
    const totalInter = Object.values(inter).reduce((s, v) => s + v, 0);
    const peerInter = EV.filter(e => (e.kind === "helped" || e.kind === "nudge") && e.n === 8).length;
    rows.push({ code: "3C.2", name: "Working in teams", when: 1, target: 80, pct: pc(c2.length), k: c2.length,
      detail: "Pairs needing at most one teacher intervention: " + c2.length + " of " + N + ". Help asked " + pl(Object.values(helps).reduce((s, v) => s + v, 0), "time") + " · teacher interventions: " + totalInter + " (during the peer check: " + peerInter + ")." });

    /* 3C.3 student initiatives */
    const sugg = Object.keys(X.sugg || {}).map(k => X.sugg[k]);
    const yes = sugg.filter(s => s.status === "yes").length;
    const frames = {}; L.forEach(p => { const f = S(p, 7).frame; if (f) frames[f] = (frames[f] || 0) + 1; });
    rows.push({ code: "3C.3", name: "Differentiation", kind: "evidence", k: sugg.length,
      detail: pl(sugg.length, "student suggestion") + " to change a task (" + yes + " accepted) · rule frame chosen by each pair: " + (Object.keys(frames).length ? Object.keys(frames).sort().map(k => k.toUpperCase() + " " + frames[k]).join(", ") : "–") + " · challenge cards are optional, taken by choice.",
      list: sugg.map(s => ({ text: s.text, status: s.status })) });

    /* 3D.1 questions */
    const qs = Object.keys(X.questions || {}).map(k => X.questions[k]);
    const asked = new Set(qs.map(x => x.pid));
    const d1 = L.filter(p => asked.has(p.pid));
    rows.push({ code: "3D.1", name: "Questioning", when: 2, target: 80, pct: pc(d1.length), k: d1.length,
      detail: "Pairs who posted their own question: " + d1.length + " of " + N + " · " + pl(qs.length, "question") + " posted (" + qs.filter(x => x.starter).length + " with a higher-order starter)." });

    /* 3D.2 feedback asked for, received, acted on */
    const fb = X.feedback || {};
    const askedFb = L.filter(p => t(S(p, 8).ask));
    const got = L.filter(p => fb[p.pid] && t(fb[p.pid].strength) && t(fb[p.pid].question));
    const change = L.filter(p => t(S(p, 9).change));
    const d2 = L.filter(p => askedFb.includes(p) && got.includes(p));
    rows.push({ code: "3D.2", name: "Discussion", when: 8, target: 80, pct: pc(d2.length), k: d2.length,
      detail: "Asked for feedback on something specific: " + askedFb.length + " · received a strength and a question from another pair: " + got.length + " · planned a change after feedback: " + change.length + "." });

    /* 3E.1 analyse progress against the criteria */
    const sh = shift(X.pairs);
    rows.push({ code: "3E.1", name: "Monitoring learning", when: 9, target: 80, pct: pc(ratedEv.length), k: ratedEv.length,
      detail: "Rated all three goals and named the screen that proves it: " + ratedEv.length + " of " + N + ". Moved away from “you can tell by looking”: " + sh.moved + " of " + sh.both + " pairs." });

    /* 3E.2 self- and peer assessment */
    const gave = L.filter(p => Object.keys(fb).some(k => fb[k] && fb[k].from === p.pid && t(fb[k].strength) && t(fb[k].question)));
    rows.push({ code: "3E.2", name: "Feedback to students", when: 8, target: 80, pct: pc(gave.length), k: gave.length,
      detail: "Gave another pair a strength and a question: " + gave.length + " of " + N + " · self-assessed against the criteria: " + rated.length + " · teacher interventions during the peer check: " + peerInter + "." });

    /* 2B.2 procedures */
    const t0 = ST.startedAt;
    const onTime = t0 ? L.filter(p => p.joined && p.joined <= t0 + 60000) : [];
    const nudges = EV.filter(e => e.kind === "nudge").length;
    rows.push({ code: "2B.2", name: "Procedures & behaviour", when: 1, target: 85, pct: t0 ? pc(onTime.length) : null, k: onTime.length,
      detail: (t0 ? "At their station and logged in by the first minute: " + onTime.length + " of " + N + ". " : "Counted from the bell. ") + "Private nudges sent to laptops: " + nudges + " (corrections stay private)." });

    /* 2C.2 effort beyond the task */
    const chal = L.filter(p => Object.keys(p.a || {}).some(k => t(p.a[k] && p.a[k].ch)));
    const most = L.filter(p => closed.length && closed.filter(n => p.done && p.done[n]).length >= Math.ceil(closed.length * 0.8));
    rows.push({ code: "2C.2", name: "Effort & persistence", when: 2, target: 80, pct: closed.length ? pc(most.length) : null, k: most.length,
      detail: "Finished 80%+ of the tasks so far: " + most.length + " of " + N + " · went on to a challenge card: " + chal.length + "." });

    /* 2C.3 curiosity & own investigation */
    const photos = HW.list(X.homework).reduce((s, st) => s + HW.days(st).filter(d => d.photo).length, 0);
    rows.push({ code: "2C.3", name: "Curiosity & passion", kind: "evidence",
      detail: hwStudents + " students ran their own 7-day investigation (" + hwReadings + " readings, " + photos + " sky photos) · " + qs.length + " questions of their own, which seed the E12 research reports." });

    rows.forEach(r => { r.status = status(r, cur, ST); });
    return rows;
  }
  function status(r, cur, ST) {
    if (r.kind === "evidence") return "evidence";
    if (r.pct == null || (ST.startedAt && cur < r.when) || !ST.startedAt) return "later";
    if (r.pct >= r.target) return "met";
    if (r.pct >= r.target - 20) return "near";
    return "low";
  }

  window.AWE = { pairs, evList, progress, summary, checks, tally, shift, rubric, MARK, label, frameText, arr, goalChecks: GC, goals, pairGoals, goalTone, keyHits };
})();
