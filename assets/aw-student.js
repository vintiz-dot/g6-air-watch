/* Air Watch lesson — the pair view on each laptop. */
(function () {
  "use strict";
  const { U, LS, HW, CH } = window.AWL;
  const { $, esc, txt, el } = U;
  const C = window.AW, D = window.LESSON, CAT = window.AW_CAT, CATS = window.AW_CATS, PARTS = window.AW_PARTS;
  const K = "aw_lesson_pair";

  /* ───────── local state ───────── */
  let P;
  try { P = JSON.parse(localStorage.getItem(K) || "{}"); } catch (e) { P = {}; }
  if (!P.pid) P.pid = "P" + Math.random().toString(36).slice(2, 10);
  P.a = P.a || {};
  const saveLocal = () => { try { localStorage.setItem(K, JSON.stringify(P)); } catch (e) {} };
  saveLocal();

  let ST = {}, HOMEWORK = {}, PAIRS = {}, METER = {}, VOTES = {}, FEEDBACK = {}, SUGG = {};
  let shown = 0, offline = false, offlineScreen = 1;
  let connected = null, lostAt = 0;
  const A = n => (P.a["s" + n] = P.a["s" + n] || {});
  const timers = {};
  function saveAns(n, now) {
    A(n).t = LS.now();
    saveLocal();
    clearTimeout(timers[n]);
    const go = () => { if (P.joined) LS.saveAnswer(P.pid, n, A(n)).then(paintLive); };
    if (now) go(); else timers[n] = setTimeout(go, 700);
  }
  const joined = () => !!(P.joined && P.names && P.names.length >= 1 && P.st);
  const screenNow = () => offline ? offlineScreen : (ST.screen || 1);

  function paintLive() {
    const lv = $("#live"), tx = $("#livetx");
    const err = LS.lastError();
    const up = LS.available() && connected !== false;
    lv.classList.toggle("on", up && !err);
    lv.classList.toggle("err", !!err || (LS.available() && connected === false));
    tx.textContent = err ? ("Not saving — " + err)
      : !LS.available() ? "Offline — work is saved on this laptop"
      : connected === false ? "Reconnecting… your work is kept on this laptop"
      : "Connected to your teacher";
  }

  /* ───────── join ───────── */
  function renderJoin() {
    $("#dock").hidden = true; $("#roles").hidden = true;
    const app = $("#app"); app.innerHTML = "";
    const c = el("div", "card");
    c.innerHTML = '<div class="eyebrow">Before we start</div><h2 class="title">Who is at this laptop?</h2>' +
      '<p class="sub">Choose your station number (on the card on your desk), then your names.</p>' +
      '<label>Station</label><div class="chips" id="stn"></div>' +
      '<div class="row2"><div><label for="n1">Partner 1</label><select id="n1"></select><input id="t1" placeholder="Type your name" hidden></div>' +
      '<div><label for="n2">Partner 2</label><select id="n2"></select><input id="t2" placeholder="Type your name" hidden></div></div>' +
      '<div id="third" hidden><label for="n3">Partner 3</label><select id="n3"></select><input id="t3" placeholder="Type your name" hidden></div>' +
      '<div class="btns"><button class="btn sm ghost" type="button" id="add3">+ We are three today</button></div>' +
      '<div class="err" id="je"></div><div class="btns"><button class="btn g" id="jb">Join the lesson</button></div>';
    app.appendChild(c);
    const stn = $("#stn");
    for (let i = 1; i <= (C.stations || 11); i++) {
      const b = el("button", "chip" + (P.st === i ? " on" : ""), String(i)); b.type = "button";
      b.onclick = () => { P.st = i; saveLocal(); stn.querySelectorAll(".chip").forEach(x => x.classList.remove("on")); b.classList.add("on"); };
      stn.appendChild(b);
    }
    const people = HW.list(HOMEWORK).filter(s => s.n).sort((a, b) => a.n.localeCompare(b.n));
    [["n1", "t1"], ["n2", "t2"], ["n3", "t3"]].forEach(([sid, tid]) => {
      const s = $("#" + sid), t = $("#" + tid);
      s.innerHTML = '<option value="">— choose —</option>' + people.map(p => '<option value="' + esc(p.code) + '">' + esc(p.n) + (p.c ? " · " + esc(p.c) : "") + '</option>').join("") +
        '<option value="__type">My name is not in the list</option>' + (sid === "n2" ? '<option value="__none">No partner today — I work alone</option>' : '');
      s.onchange = () => { t.hidden = s.value !== "__type"; if (!t.hidden) t.focus(); };
    });
    $("#add3").onclick = () => { const on = $("#third").hidden; $("#third").hidden = !on; $("#add3").textContent = on ? "− We are two" : "+ We are three today"; };
    $("#jb").onclick = () => {
      const names = [], codes = [];
      const slots = [["n1", "t1"], ["n2", "t2"]].concat($("#third").hidden ? [] : [["n3", "t3"]]);
      for (const [sid, tid] of slots) {
        const s = $("#" + sid), t = $("#" + tid);
        if (s.value === "__none") continue;
        if (s.value === "__type") { if (txt(t.value).length < 2) { $("#je").textContent = "Type every name."; return; } names.push(txt(t.value)); codes.push(null); }
        else if (s.value) { names.push(HOMEWORK[s.value].n); codes.push(s.value); }
        else { $("#je").textContent = sid === "n1" ? "Choose your name." : "Choose every name (or ‘No partner today’)."; return; }
      }
      if (!P.st) { $("#je").textContent = "Choose your station number."; return; }
      const real = codes.filter(Boolean);
      if (new Set(real).size !== real.length) { $("#je").textContent = "Choose different names."; return; }
      if ($("#n2").value === "__none" && names.length > 1) { $("#je").textContent = "‘No partner today’ is only for one person."; return; }
      P.names = names; P.codes = codes; P.joined = LS.now(); P.a = {}; saveLocal();
      LS.savePair(P.pid, { st: P.st, names, codes, joined: P.joined }).then(() => { render(true); });
      if (!LS.available()) render(true);
    };
  }

  /* ───────── chrome ───────── */
  function paintRoles(n) {
    const r = $("#roles"); if (!joined()) { r.hidden = true; return; }
    const k = P.names.length;
    r.hidden = false;
    if (k === 1) r.innerHTML = '<span><b>' + esc(P.names[0]) + '</b> <i>working alone today — read each question aloud quietly, then answer</i></span>';
    else {
      const pilot = P.names[(n - 1) % k], nav = P.names[n % k];
      r.innerHTML = '<span><b>Pilot:</b> ' + esc(pilot) + ' <i>hands on the laptop</i></span><span><b>Navigator:</b> ' + esc(nav) + ' <i>reads aloud, holds the book, speaks for you</i></span>' +
        (k === 3 ? '<span><b>Checker:</b> ' + esc(P.names[(n + 1) % k]) + ' <i>checks the answer against our 3 goals</i></span>' : '');
    }
    if (shown && shown !== n) { r.classList.remove("swap"); void r.offsetWidth; r.classList.add("swap"); }
  }
  function tickClock() {
    const c = $("#clock");
    const T = offline ? null : U.timer(ST, LS.now());
    if (!T) { c.textContent = ""; c.classList.remove("low"); return; }
    c.textContent = (T.paused ? "❚❚ " : "") + U.mmss(T.left); c.classList.toggle("low", !T.paused && T.left < 60000);
    /* lost the connection for 20 s mid-lesson: let the pair move on by themselves */
    if (connected === false && lostAt && LS.now() - lostAt > 20000 && !$("#selfnav") && joined()) addSelfNav();
  }
  setInterval(tickClock, 500);
  function addSelfNav() {
    const n = screenNow(), app = $("#app");
    const nav = el("div", "btns selfnav"); nav.id = "selfnav";
    nav.innerHTML = '<p class="vn" style="flex-basis:100%;margin:0">We cannot reach your teacher’s laptop. Follow your teacher, and move on with these buttons.</p>';
    const back = el("button", "btn ghost", "← Back"), next = el("button", "btn", "Next →");
    back.disabled = n <= 1; next.disabled = n >= 9;
    back.onclick = () => { offline = true; offlineScreen = Math.max(1, n - 1); render(true); };
    next.onclick = () => { offline = true; offlineScreen = Math.min(9, n + 1); render(true); };
    nav.appendChild(back); nav.appendChild(next); app.appendChild(nav);
  }

  function header(n) {
    const s = D.screens[n - 1];
    return '<div class="eyebrow ' + s.phase.toLowerCase() + '">' + esc(s.phase) + ' · ' + n + ' of 9</div><h2 class="title">' + esc(s.name) + '</h2>';
  }
  function bookBox(page, text, extra) {
    return '<div class="bookq"><div class="bk">Book page ' + page + ' — word for word</div><div class="bt">' + esc(text) + '</div>' + (extra || "") + '</div>';
  }
  function tick(n, key, label) {
    const a = A(n);
    const w = el("label", "tickline");
    w.innerHTML = '<input type="checkbox"' + (a[key] ? " checked" : "") + '> ' + esc(label);
    w.querySelector("input").onchange = e => { a[key] = e.target.checked; saveAns(n, true); };
    return w;
  }
  function chips(opts, cur, onPick, cls) {
    const box = el("div", "chips");
    opts.forEach(([k, label]) => {
      const b = el("button", "chip" + (cls ? " " + cls : "") + (cur === k ? " on" : ""), esc(label)); b.type = "button";
      b.onclick = () => { onPick(k); box.querySelectorAll(".chip").forEach(x => x.classList.remove("on")); b.classList.add("on"); };
      box.appendChild(b);
    });
    return box;
  }
  function frameInputs(n, key, parts, count) {
    const a = A(n); a[key] = a[key] || [];
    const w = el("div", "frame");
    let h = "";
    for (let i = 0; i < count; i++) h += '<span>' + esc(parts[i] || "") + '</span><input data-i="' + i + '" value="' + esc(a[key][i] || "") + '">';
    if (parts.length > count) h += '<span>' + esc(parts[count]) + '</span>';
    w.innerHTML = h;
    w.querySelectorAll("input").forEach(inp => inp.oninput = () => { a[key][+inp.dataset.i] = inp.value; saveAns(n); });
    return w;
  }
  function doneBar(n) {
    const a = A(n);
    const w = el("div", "donebar");
    const b = el("button", "btn g", a.done ? "✓ Done — waiting for your teacher" : "We're done"); b.type = "button";
    b.onclick = () => { a.done = true; saveAns(n, true); LS.markDone(P.pid, n, true); b.textContent = "✓ Done — waiting for your teacher"; paintChallenge(n, w); };
    w.appendChild(b);
    if (a.done) paintChallenge(n, w);
    return w;
  }
  function paintChallenge(n, w) {
    if (w.querySelector(".challenge") || !D.challenge[n]) return;
    const a = A(n);
    const c = el("div", "challenge", '<b>Challenge</b><p>' + esc(D.challenge[n]) + '</p><input placeholder="Your idea">');
    const i = c.querySelector("input"); i.value = a.ch || ""; i.oninput = () => { a.ch = i.value; saveAns(n); };
    w.appendChild(c);
  }

  /* ───────── screens ───────── */
  function weekStrip(code) {
    const s = HOMEWORK[code];
    if (!s) return '<p class="vn">No Air Watch found for this name — use your partner’s week.</p>';
    const days = {}; HW.days(s).forEach(d => { days[d.n] = d; });
    let h = '<div class="mini">';
    for (let i = 1; i <= 7; i++) {
      const d = days[i];
      if (!d) { h += '<button class="mday" disabled><i>Day ' + i + '</i><span>–</span></button>'; continue; }
      const c = CAT(d.a.aqi), right = c && d.g && d.g.guess === c.k;
      h += '<button class="mday" data-code="' + esc(code) + '" data-day="' + i + '"><i>Day ' + i + '</i><span class="aqi" style="background:' + c.col + ';color:' + c.ink + '">' + d.a.aqi + '</span><em>' + (right ? "eyes ✓" : "eyes ✗") + '</em></button>';
    }
    return h + '</div>';
  }

  const SCREENS = {
    1(n, box) {
      const a = A(n);
      box.innerHTML = header(n) + '<p class="sub">Silent start. Look at ' + (P.names.length === 1 ? "your week" : P.names.length === 3 ? "all three of your weeks" : "both of your weeks") + '.</p>';
      P.names.forEach((nm, i) => {
        const w = el("div", "weekcard", '<b>' + esc(nm) + '</b>' + (P.codes[i] ? weekStrip(P.codes[i]) : '<p class="vn">No Air Watch for this name' + (P.codes.some(Boolean) ? " — use your partner’s week." : " — skip to question 3.") + '</p>'));
        box.appendChild(w);
      });
      const t = el("div", "task", '<h3>1 · Tap your worst day (the highest number).</h3><p class="vn" id="worstTxt"></p><h3>2 · Were your eyes right on that day?</h3>');
      box.appendChild(t);
      const paintW = () => { const x = a.worst; $("#worstTxt").textContent = x ? ("You chose " + (P.names[P.codes.indexOf(x.code)] || "") + ", Day " + x.day + ".") : "Tap a day above."; box.querySelectorAll(".mday").forEach(b => b.classList.toggle("on", !!x && b.dataset.code === x.code && +b.dataset.day === x.day)); };
      box.querySelectorAll(".mday[data-day]").forEach(b => b.onclick = () => { a.worst = { code: b.dataset.code, day: +b.dataset.day }; saveAns(n); paintW(); });
      t.appendChild(chips([["yes", "Yes"], ["no", "No"]], a.eyes, k => { a.eyes = k; saveAns(n); }));
      paintW();
      const v = el("div", "task", '<h3>3 · ' + esc(D.vote.q) + '</h3><p class="vn">' + esc(D.vote.vn) + '</p>');
      v.appendChild(chips(D.vote.opts, a.pre, k => { a.pre = k; saveAns(n, true); }));
      v.appendChild(el("label", "", "How sure are you?"));
      v.appendChild(chips([["1", "Not sure"], ["2", "Quite sure"], ["3", "Very sure"]], a.preConf, k => { a.preConf = k; saveAns(n); }));
      box.appendChild(v);
      box.appendChild(goalsCard());
      box.appendChild(doneBar(n));
    },

    2(n, box) {
      const a = A(n);
      box.innerHTML = header(n);
      box.appendChild(el("div", "task", '<div id="gscore"></div>'));
      const game = el("div", "task", '<h3>Which sky had the worst air?</h3><p class="vn">These are photos from our class this week. Vote first — then your teacher shows the numbers.</p><div class="pgame" id="pgame"></div>');
      box.appendChild(game);
      const q = el("div", "task", '<h3>Your question</h3><p class="vn">Write one question you have now. Start with one of these:</p><div id="starters"></div><textarea id="qtxt" rows="2" maxlength="200" placeholder="Our question…"></textarea><div class="btns"><button class="btn" id="qpost">Post our question</button></div><div id="qdone" class="vn"></div>');
      box.appendChild(q);
      q.querySelector("#starters").appendChild(chips(D.starters.map(s => [s, s]), a.qStarter, k => { a.qStarter = k; const t = $("#qtxt"); if (!txt(t.value)) { t.value = k.replace("…", " "); a.q = t.value; } t.focus(); saveAns(n); }));
      const qt = $("#qtxt"); qt.value = a.q || ""; qt.oninput = () => { a.q = qt.value; saveAns(n); };
      $("#qpost").onclick = () => {
        if (txt(a.q).length < 8) { $("#qdone").textContent = "Write a full question first."; return; }
        LS.addQuestion(P.pid, { text: txt(a.q), starter: a.qStarter || "" }).then(() => { a.qPosted = (a.qPosted || 0) + 1; saveAns(n, true); $("#qdone").textContent = "Posted ✓ — your teacher may show it on the board."; });
        if (!LS.available()) { a.qPosted = 1; saveAns(n); $("#qdone").textContent = "Saved on this laptop."; }
      };
      if (a.qPosted) $("#qdone").textContent = "Posted ✓";
      paint2();
      box.appendChild(doneBar(n));
    },

    3(n, box) {
      const a = A(n);
      box.innerHTML = header(n);
      const p = el("div", "task", '<h3>Predict</h3><p>' + esc(D.jar.predict1.q) + '</p>');
      p.appendChild(chips(D.jar.predict1.opts, a.p1, k => { a.p1 = k; saveAns(n, true); }));
      p.appendChild(el("p", "", esc(D.jar.predict2.q)));
      p.appendChild(chips(D.jar.predict2.opts, a.p2, k => { a.p2 = k; saveAns(n, true); }));
      box.appendChild(p);
      box.appendChild(el("div", "task", '<h3>Observe</h3><div id="meter" class="meter"></div>'));
      const ex = el("div", "task", '<h3>Explain</h3>');
      ex.appendChild(frameInputs(n, "ex", D.jar.frame, 3));
      box.appendChild(ex);
      const bk = el("div", "task", bookBox(D.jar.bookQ3.page, D.jar.bookQ3.text, '<p class="vn">Write one sentence in your book. Use the beam or the number as your evidence.</p>'));
      bk.appendChild(tick(n, "book", "We wrote it in our books"));
      box.appendChild(bk);
      paintMeter();
      box.appendChild(doneBar(n));
    },

    4(n, box) {
      const a = A(n); a.sort = a.sort || {}; a.q1 = a.q1 || []; a.q2 = a.q2 || []; a.q2why = a.q2why || {};
      box.innerHTML = header(n);
      const s = el("div", "task", '<h3>Sort: pollutant or not?</h3><p class="vn">Tap 🔊 to hear. Then choose for each one.</p><div class="sort" id="sort"></div>');
      box.appendChild(s);
      D.focus.cards.forEach(cd => {
        const r = el("div", "srow", '<button class="say" type="button" aria-label="Hear it">🔊</button><span class="sn">' + esc(cd.en) + '<small>' + esc(cd.vn) + '</small></span>');
        r.querySelector(".say").onclick = () => U.speak(cd.en);
        r.appendChild(chips([["yes", "Pollutant"], ["no", "Not a pollutant"]], a.sort[cd.k], k => { a.sort[cd.k] = k; saveAns(n); }, "sm"));
        r.appendChild(el("span", "mark", "")).id = "sm_" + cd.k;
        s.querySelector("#sort").appendChild(r);
      });
      const rl = el("div", "task", '<h3>Write the rule</h3><p class="vn">The fog and the jar smoke looked the same. Which one is a pollutant — and why?</p>');
      rl.appendChild(frameInputs(n, "rule", D.focus.rule, 2));
      box.appendChild(rl);
      const tm = el("div", "task", '<h3>Six words (book page 30)</h3><p class="vn">The Navigator says each word; the Pilot repeats it.</p><div class="terms" id="terms"></div>');
      box.appendChild(tm);
      D.focus.terms.forEach(t => {
        const r = el("div", "trow", '<button class="say" type="button" aria-label="Hear it">🔊</button><b>' + esc(t.en) + '</b><span class="ipa">' + esc(t.ipa) + '</span><span class="vn">' + esc(t.vn) + '</span>');
        r.querySelector(".say").onclick = () => U.speak(t.en.replace("(PM2.5)", "P M two point five").replace("AQI", "A Q I"));
        tm.querySelector("#terms").appendChild(r);
      });
      const bq = el("div", "task", bookBox(D.focus.q1.page, "PART A. QUESTIONS", '<p class="vn">Answer in your book first. Then put the same answers here.</p>'));
      const q1 = el("div", "q1", '<b>' + esc(D.focus.q1.head) + '</b>');
      const defs = D.focus.q1.defs;
      D.focus.q1.terms.forEach((t, i) => {
        const r = el("div", "qrow", '<span>' + esc(t) + '</span><select data-i="' + i + '"><option value="">…</option>' + ["a", "b", "c", "d"].map(k => '<option' + (a.q1[i] === k ? " selected" : "") + '>' + k + '</option>').join("") + '</select><span class="mark" id="q1m' + i + '"></span>');
        r.querySelector("select").onchange = e => { a.q1[i] = e.target.value; saveAns(n); };
        q1.appendChild(r);
      });
      q1.appendChild(el("div", "defs", defs.map(x => esc(x)).join("<br>")));
      bq.appendChild(q1);
      const q2 = el("div", "q1", '<b>' + esc(D.focus.q2.head) + '</b>');
      D.focus.q2.items.forEach((t, i) => {
        const r = el("div", "qrow", '<span>' + esc(t) + '</span>');
        r.appendChild(chips([["T", "True"], ["F", "False"]], a.q2[i], k => { a.q2[i] = k; saveAns(n); }, "sm"));
        r.appendChild(el("span", "mark", "")).id = "q2m" + i;
        q2.appendChild(r);
      });
      bq.appendChild(q2);
      bq.appendChild(el("div", "", '<div id="q2why"></div>'));
      const mp = el("div", "q1", '<b>' + esc(D.focus.map.q) + '</b>');
      mp.appendChild(chips(D.focus.map.opts.map((o, i) => [String(i), o]), a.map != null ? String(a.map) : null, k => { a.map = +k; saveAns(n); }, "wide"));
      mp.appendChild(el("span", "mark", "")).id = "mapm";
      bq.appendChild(mp);
      bq.appendChild(tick(n, "book", "We wrote Q1 and Q2 in our books"));
      box.appendChild(bq);
      paint4();
      box.appendChild(doneBar(n));
    },

    5(n, box) {
      const a = A(n); a.time = a.time || {}; a.place = a.place || {}; a.diff = a.diff || {};
      box.innerHTML = header(n);
      let src = null, who = "";
      for (let i = 0; i < P.codes.length; i++) { const c = P.codes[i]; const s = c && HOMEWORK[c]; const x = s && HW.six(s); if (x) { src = x; who = P.names[i] + "’s Day 7"; break; } }
      if (!src) { src = { aqi: D.inv1.example.aqi, six: D.inv1.example.six }; who = "an example station (no Day 7 data)"; }
      const vals = PARTS.map(p => src.six[p.k]).filter(v => v !== null && v !== undefined);
      const total = vals.reduce((x, y) => x + y, 0), avg = vals.length ? Math.round(total / vals.length) : 0, big = vals.length ? Math.max(...vals) : 0;
      const t = el("div", "task", '<h3>Part A · How is ONE number made from SIX?</h3><p class="vn">Data: ' + esc(who) + '. AQI = <b>' + src.aqi + '</b>.</p>' +
        '<table class="six"><tr>' + PARTS.map(p => '<th>' + esc(p.en) + '</th>').join("") + '</tr><tr>' + PARTS.map(p => '<td>' + (src.six[p.k] == null ? "–" : src.six[p.k]) + '</td>').join("") + '</tr></table>' +
        '<p>Which one gives the AQI (' + src.aqi + ')?</p>');
      t.appendChild(chips([["total", "All six added: " + total], ["avg", "The average: " + avg], ["big", "The biggest one: " + big]], a.hyp, k => { a.hyp = k; saveAns(n, true); paintHyp(); }));
      t.appendChild(el("p", "fb", "")).id = "hypfb";
      t.appendChild(frameInputs(n, "fr", D.inv1.frame, 2));
      box.appendChild(t);
      function paintHyp() { const f = $("#hypfb"); if (!a.hyp) { f.textContent = ""; return; } f.innerHTML = a.hyp === "big" ? "✓ Yes — the AQI is the <b>biggest</b> part. The other five are hidden behind it." : "Check again: compare each number with " + src.aqi + "."; }
      paintHyp();
      const g = el("div", "task", '<h3>Part B · Time or place?</h3><div id="tp"></div>');
      box.appendChild(g);
      const q = el("div", "task");
      q.innerHTML = '<p><b>Does TIME change the number?</b> (look at the class station)</p>';
      q.appendChild(chips([["yes", "Yes"], ["no", "No"], ["cant", "Can't tell"]], a.time.yn, k => { a.time.yn = k; saveAns(n); }));
      const ti = el("input"); ti.placeholder = "Our evidence…"; ti.value = a.time.ev || ""; ti.oninput = () => { a.time.ev = ti.value; saveAns(n); }; q.appendChild(ti);
      q.appendChild(el("p", "", "<b>Does PLACE change the number?</b> (look at our stations)"));
      q.appendChild(chips([["yes", "Yes"], ["no", "No"], ["cant", "Can't tell"]], a.place.yn, k => { a.place.yn = k; saveAns(n); }));
      const pi = el("input"); pi.placeholder = "Our evidence…"; pi.value = a.place.ev || ""; pi.oninput = () => { a.place.ev = pi.value; saveAns(n); }; q.appendChild(pi);
      q.appendChild(el("p", "", "<b>" + esc(D.inv1.diffQ) + "</b>"));
      q.appendChild(chips([["yes", "Yes"], ["no", "No"]], a.diff.yn, k => { a.diff.yn = k; saveAns(n); }));
      const di = el("input"); di.placeholder = "Because…"; di.value = a.diff.why || ""; di.oninput = () => { a.diff.why = di.value; saveAns(n); }; q.appendChild(di);
      box.appendChild(q);
      paint5();
      box.appendChild(doneBar(n));
    },

    6(n, box) {
      const a = A(n); a.d1 = a.d1 || { pick: [], role: {} }; a.d2 = a.d2 || {}; a.tw2 = a.tw2 || [];
      box.innerHTML = header(n);
      const q1 = D.inv2.dbq1;
      const t1 = el("div", "task", bookBox(q1.page, q1.lead) + '<img class="graph" alt="Carbon dioxide concentration from 800,000 BCE to 2015 CE, and from 1950 to 2015" src="' + q1.img + '"><p class="bt">' + esc(q1.q) + '</p><div id="d1opts"></div><div id="d1role"></div>');
      box.appendChild(t1);
      const d1 = t1.querySelector("#d1opts");
      q1.opts.forEach(o => {
        const k = o[0];
        const b = el("button", "chip wide" + (a.d1.pick.includes(k) ? " on" : ""), esc(o)); b.type = "button";
        b.onclick = () => {
          if (a.d1.pick.includes(k)) a.d1.pick = a.d1.pick.filter(x => x !== k);
          else { if (a.d1.pick.length >= 2) a.d1.pick.shift(); a.d1.pick.push(k); }
          saveAns(n); d1.querySelectorAll(".chip").forEach(x => x.classList.toggle("on", a.d1.pick.includes(x.textContent[0]))); paintRoles6();
        };
        d1.appendChild(b);
      });
      function paintRoles6() {
        const r = $("#d1role"); r.innerHTML = "";
        if (!a.d1.pick.length) return;
        r.appendChild(el("p", "vn", "One must be a CAUSE and one an EFFECT. Label them:"));
        a.d1.pick.forEach(k => { const row = el("div", "qrow", "<span>" + k + "</span>"); row.appendChild(chips([["cause", "cause"], ["effect", "effect"]], a.d1.role[k], v => { a.d1.role[k] = v; saveAns(n); }, "sm")); r.appendChild(row); });
        const why = el("input"); why.placeholder = "Why is one of the others wrong? (one sentence)"; why.value = a.d1.why || ""; why.oninput = () => { a.d1.why = why.value; saveAns(n); }; r.appendChild(why);
      }
      paintRoles6();
      const q2 = D.inv2.dbq2;
      const t2 = el("div", "task", bookBox(q2.page, q2.lead) + '<img class="graph" alt="Atmospheric carbon dioxide at Mauna Loa, 1958 to 2009, rising from about 315 to 390 ppm" src="' + q2.img + '"><p class="bt">' + esc(q2.q) + '</p>');
      t2.appendChild(chips(q2.opts.map(o => [o[0], o]), a.d2.pick, k => { a.d2.pick = k; saveAns(n); }, "wide"));
      const w2 = el("input"); w2.placeholder = "Why is C tempting, but not shown by the graph?"; w2.value = a.d2.why || ""; w2.oninput = () => { a.d2.why = w2.value; saveAns(n); }; t2.appendChild(w2);
      t2.appendChild(el("div", "", '<div id="dbqKey"></div>'));
      box.appendChild(t2);
      const tw = el("div", "task", bookBox(D.inv2.tw2.page, D.inv2.tw2.text, '<p class="vn">Use one number from your own week. Write it in your book too.</p>'));
      const st0 = P.codes[0] && HOMEWORK[P.codes[0]] && HOMEWORK[P.codes[0]].st ? HOMEWORK[P.codes[0]].st.name : "Our station";
      if (!a.tw2[0]) a.tw2[0] = st0;
      tw.appendChild(frameInputs(n, "tw2", ["", D.inv2.tw2.frame[0], D.inv2.tw2.frame[1], D.inv2.tw2.frame[2]], 4));
      tw.appendChild(tick(n, "book", "We wrote it in our books"));
      box.appendChild(tw);
      paint6();
      box.appendChild(doneBar(n));
    },

    7(n, box) {
      const a = A(n); a.parts = a.parts || {};
      box.innerHTML = header(n) + '<p class="sub">Write a rule that is true for ANY city — not only Hanoi.</p>';
      const t = el("div", "task", '<h3>Choose one frame</h3><div id="frames"></div><div class="bank">' + D.gen.bank.map(w => '<span>' + esc(w) + '</span>').join("") + '</div><div class="btns"><button class="btn" id="subRule">Send our rule</button></div><div id="ruleMsg" class="vn"></div>');
      box.appendChild(t);
      const fr = t.querySelector("#frames");
      D.gen.frames.forEach(f => {
        const c = el("div", "fchoice" + (a.frame === f.k ? " on" : ""));
        const radio = el("button", "chip sm" + (a.frame === f.k ? " on" : ""), f.k.toUpperCase()); radio.type = "button";
        c.appendChild(radio);
        a.parts[f.k] = a.parts[f.k] || [];
        const inputsNeeded = f.parts.length - (f.k === "g2" ? 1 : 0);
        const wrap = el("div", "frame");
        let h = "";
        f.parts.forEach((p, i) => { h += "<span>" + esc(p) + "</span>"; if (i < inputsNeeded) h += '<input data-i="' + i + '" value="' + esc(a.parts[f.k][i] || "") + '">'; });
        wrap.innerHTML = h;
        wrap.querySelectorAll("input").forEach(inp => inp.oninput = () => { a.parts[f.k][+inp.dataset.i] = inp.value; a.frame = f.k; saveAns(n); mark(); });
        c.appendChild(wrap);
        radio.onclick = () => { a.frame = f.k; saveAns(n); mark(); };
        fr.appendChild(c);
      });
      function mark() { fr.querySelectorAll(".fchoice").forEach((c, i) => { const on = a.frame === D.gen.frames[i].k; c.classList.toggle("on", on); c.querySelector(".chip").classList.toggle("on", on); }); }
      $("#subRule").onclick = () => {
        const f = D.gen.frames.find(x => x.k === a.frame);
        if (!f) { $("#ruleMsg").textContent = "Choose a frame first."; return; }
        const filled = (a.parts[f.k] || []).filter(x => txt(x)).length;
        if (filled < 2) { $("#ruleMsg").textContent = "Fill the blanks first."; return; }
        a.rule = ruleText(f, a.parts[f.k]); a.submitted = LS.now(); saveAns(n, true);
        $("#ruleMsg").textContent = "Sent ✓ Your teacher may put it on the board.";
      };
      if (a.submitted) $("#ruleMsg").textContent = "Sent ✓";
      box.appendChild(el("div", "task", '<h3>Vote</h3><div id="rvote"><p class="vn">When your teacher puts three rules on the board, vote here for the one that works best in ANY city.</p></div>'));
      const bk = el("div", "task", bookBox(D.gen.bookQ1.page, D.gen.bookQ1.text, '<p class="vn">Write the class rule — or your own better version — in your book.</p>'));
      bk.appendChild(tick(n, "book", "We wrote it in our books"));
      box.appendChild(bk);
      paint7();
      box.appendChild(doneBar(n));
    },

    8(n, box) {
      const a = A(n); a.q3 = a.q3 || []; a.plan = a.plan || {};
      box.innerHTML = header(n);
      const q3 = D.transfer.q3;
      const t = el("div", "task", bookBox(q3.page, q3.text) + '<div id="q3opts"></div><div id="q3key"></div>');
      box.appendChild(t);
      const ob = t.querySelector("#q3opts");
      q3.opts.forEach(o => {
        const k = o[0];
        const b = el("button", "chip wide" + (a.q3.includes(k) ? " on" : ""), esc(o)); b.type = "button";
        b.onclick = () => { if (a.q3.includes(k)) a.q3 = a.q3.filter(x => x !== k); else { if (a.q3.length >= 3) a.q3.shift(); a.q3.push(k); } saveAns(n); ob.querySelectorAll(".chip").forEach(x => x.classList.toggle("on", a.q3.includes(x.textContent[0]))); };
        ob.appendChild(b);
      });
      const fs = el("div", "task", '<h3>What would go wrong?</h3>');
      fs.appendChild(frameInputs(n, "fD", D.transfer.failD, 1));
      fs.appendChild(frameInputs(n, "fE", D.transfer.failE, 1));
      box.appendChild(fs);
      const pl = el("div", "task", '<h3>Fix our week</h3><p class="vn">Our numbers disagreed. Design a way to measure where our numbers would NOT disagree.</p>');
      D.transfer.plan.forEach(([k, label]) => { pl.appendChild(el("label", "", esc(label))); const i = el("input"); i.value = a.plan[k] || ""; i.oninput = () => { a.plan[k] = i.value; saveAns(n); }; pl.appendChild(i); });
      pl.appendChild(el("label", "", esc(D.transfer.ask) + "…"));
      const ask = el("input"); ask.value = a.ask || ""; ask.placeholder = "e.g. whether our WHEN is fair"; ask.oninput = () => { a.ask = ask.value; saveAns(n); }; pl.appendChild(ask);
      box.appendChild(pl);
      box.appendChild(el("div", "task", '<h3>Check another pair’s plan</h3><div id="peer"></div>'));
      paint8();
      box.appendChild(doneBar(n));
    },

    9(n, box) {
      const a = A(n); a.rate = a.rate || [{}, {}, {}];
      box.innerHTML = header(n);
      const v = el("div", "task", '<h3>' + esc(D.vote.q) + '</h3><p class="vn">Same question as the start. Answer again.</p>');
      v.appendChild(chips(D.vote.opts, a.post, k => { a.post = k; saveAns(n, true); }));
      v.appendChild(chips([["1", "Not sure"], ["2", "Quite sure"], ["3", "Very sure"]], a.postConf, k => { a.postConf = k; saveAns(n); }));
      box.appendChild(v);
      const g = el("div", "task", '<h3>Today’s three goals — from memory</h3><p class="vn">Do not look. Type what you remember.</p><textarea id="gm" rows="3" placeholder="1… 2… 3…"></textarea><div class="btns"><button class="btn" id="gmb">Show the goals and score ourselves</button></div><div id="rate"></div>');
      box.appendChild(g);
      const gm = g.querySelector("#gm"); gm.value = a.goals || ""; gm.oninput = () => { a.goals = gm.value; saveAns(n); };
      $("#gmb").onclick = () => { if (txt(a.goals).length < 10) { gm.focus(); return; } a.goalsShown = LS.now(); saveAns(n, true); paintRate(); };
      function paintRate() {
        const r = $("#rate"); r.innerHTML = ""; if (!a.goalsShown) return;
        $("#gmb").hidden = true; gm.readOnly = true;
        const rc = el("div", "raterow", '<p><b>How many of the 3 goals did we remember?</b></p>');
        rc.appendChild(chips([["0", "0"], ["1", "1"], ["2", "2"], ["3", "All 3"]], a.recall != null ? String(a.recall) : null, k => { a.recall = +k; saveAns(n, true); }, "sm"));
        r.appendChild(rc);
        r.appendChild(el("p", "vn", "Now judge yourselves: for each goal choose NOT YET, ALMOST or YES — and the screen that proves it."));
        D.criteria.forEach((c, i) => {
          const row = el("div", "raterow", '<p><b>' + (i + 1) + '.</b> ' + esc(c) + '</p>');
          row.appendChild(chips(D.reflect.levels, a.rate[i].lv, k => { a.rate[i].lv = k; saveAns(n); }, "sm"));
          const s = el("select"); s.innerHTML = '<option value="">The screen that proves it…</option>' + D.screens.map(x => '<option value="' + x.n + '"' + (+a.rate[i].ev === x.n ? " selected" : "") + '>' + x.n + ' · ' + esc(x.name) + '</option>').join("");
          s.onchange = () => { a.rate[i].ev = s.value; saveAns(n); };
          row.appendChild(s); r.appendChild(row);
        });
      }
      paintRate();
      box.appendChild(el("div", "task", '<h3>Feedback on our plan</h3><div id="fbin"></div>'));
      const ex = el("div", "task", bookBox(D.reflect.bookQ4.page, D.reflect.bookQ4.text, '<p class="vn">Write it in your book. Stretch: “I used to think… Now I think…”</p>'));
      const ei = el("input"); ei.placeholder = "We need to talk about air quality because…"; ei.value = a.exit || ""; ei.oninput = () => { a.exit = ei.value; saveAns(n); }; ex.appendChild(ei);
      ex.appendChild(tick(n, "book", "We wrote it in our books"));
      box.appendChild(ex);
      box.appendChild(el("div", "note", esc(D.reflect.next)));
      paint9();
      box.appendChild(doneBar(n));
    }
  };

  function ruleText(f, parts) { let s = ""; f.parts.forEach((p, i) => { s += p + " "; if (parts[i]) s += txt(parts[i]) + " "; }); return txt(s.replace(/\s+/g, " ")); }
  function goalsCard() { return el("div", "goals", '<b>Our 3 goals today</b><ol>' + D.criteria.map(c => '<li>' + esc(c) + '</li>').join("") + '</ol>'); }

  /* ───────── live sub-panels ───────── */
  function paint2() {
    const g = $("#gscore"); if (!g) return;
    const s = HW.guessScore(HOMEWORK);
    g.innerHTML = (ST.reveal && ST.reveal.guess) ? '<div class="bignum"><b>' + s.pct + '%</b><span>Our class guessed right ' + s.right + ' times out of ' + s.total + ' by looking at the sky.</span></div>' : '<p class="vn">Your teacher will show the class result in a moment…</p>';
    const pg = $("#pgame"); if (!pg) return;
    const photos = ST.photos || [];
    if (!photos.length) { pg.innerHTML = '<p class="vn">No photos today — skip to your question.</p>'; return; }
    const a = A(2);
    if (pg.dataset.key !== JSON.stringify(photos)) {
      pg.dataset.key = JSON.stringify(photos); pg.innerHTML = "";
      photos.forEach((p, i) => {
        const L = "ABC"[i];
        const f = el("figure", "", '<div class="ph" id="ph' + i + '">loading…</div><figcaption><button class="chip' + (a.photoVote === L ? " on" : "") + '" type="button">' + L + '</button><span class="phaqi" id="phq' + i + '"></span></figcaption>');
        f.querySelector("button").onclick = () => { a.photoVote = L; saveAns(2, true); LS.vote(P.pid, "photo", L); pg.querySelectorAll("figcaption .chip").forEach(x => x.classList.toggle("on", x.textContent === L)); };
        pg.appendChild(f);
        LS.getPhoto(p.code, p.day).then(v => { const d = $("#ph" + i); if (d) d.innerHTML = v && v.d ? '<img alt="Sky photo ' + L + '" src="' + v.d + '">' : "photo missing"; });
      });
    }
    photos.forEach((p, i) => { const q = $("#phq" + i); if (!q) return; const aq = HW.photoAqi(HOMEWORK, p.code, p.day); q.innerHTML = (ST.reveal && ST.reveal.photos && aq != null) ? U.catChip(aq) : ""; });
  }
  function paintMeter() {
    const m = $("#meter"); if (!m) return;
    const v = k => (METER[k] != null && METER[k] !== "") ? METER[k] : "–";
    m.innerHTML = '<div><span>Room air</span><b>' + v("base") + '</b></div><div><span>Smoke at the meter</span><b>' + v("peak") + '</b></div><div><span>60 s later — looks clear</span><b>' + v("after") + '</b></div><p class="vn">PM2.5 in micrograms per cubic metre (µg/m³)</p>';
  }
  function paint4() {
    const a = A(4); const rev = ST.reveal && ST.reveal.q1q2;
    const revS = ST.reveal && ST.reveal.sort;
    const mk = (m, ok, wrong) => { if (!m) return; m.textContent = ok == null ? "" : ok ? "✓" : "✗ " + wrong; m.classList.toggle("ok", !!ok); };
    D.focus.cards.forEach(cd => mk($("#sm_" + cd.k), revS ? (a.sort || {})[cd.k] === (cd.yes ? "yes" : "no") : null, cd.yes ? "pollutant" : "not a pollutant"));
    D.focus.q1.key.forEach((k, i) => mk($("#q1m" + i), rev ? a.q1[i] === k : null, k));
    D.focus.q2.key.forEach((k, i) => mk($("#q2m" + i), rev ? a.q2[i] === k : null, k === "T" ? "True" : "False"));
    mk($("#mapm"), rev ? a.map === D.focus.map.key : null, "B");
    const w = $("#q2why"); if (!w) return;
    if (!rev) { w.innerHTML = ""; return; }
    if (w.dataset.done) return; w.dataset.done = "1";
    w.appendChild(el("p", "vn", "For each FALSE statement, which word makes it false?"));
    ["b", "d"].forEach(k => { const i = el("input"); i.placeholder = "Statement " + k + ": the word…"; i.value = (a.q2why || {})[k] || ""; i.oninput = () => { a.q2why[k] = i.value; saveAns(4); }; w.appendChild(i); });
  }
  function paint5() {
    const tp = $("#tp"); if (!tp) return;
    const pts = HW.classPoints(HOMEWORK), slots = HW.bySlot(pts), sts = HW.byStation(HOMEWORK);
    if (!pts.length && !sts.length) { tp.innerHTML = '<p class="vn">No class data yet.</p>'; return; }
    tp.innerHTML = '<div class="two-charts"><div><b>One place (class station), different times</b>' + CH.dots(pts) +
      '<p class="legend"><i style="background:#1C7293"></i>Morning <i style="background:#C8871B"></i>After school <i style="background:#7B2FA0"></i>Evening</p>' +
      '<p class="vn">' + slots.filter(s => s.n).map(s => esc(s.label) + ": average " + s.avg).join(" · ") + '</p></div>' +
      '<div><b>Different places (our stations), whole week</b>' + CH.bars(sts.slice(0, 8).map(s => ({ label: s.name.length > 18 ? s.name.slice(0, 17) + "…" : s.name, v: s.avg, col: (CAT(s.avg) || {}).col })), { label: "Average AQI by station" }) + '</div></div>';
  }
  function paint6() {
    const k = $("#dbqKey"); if (!k) return;
    k.innerHTML = (ST.reveal && ST.reveal.dbq) ? '<div class="ok">Data question 1: <b>B</b> (effect) and <b>D</b> (cause). Data question 2: <b>A</b>.</div>' : "";
  }
  function paint7() {
    const r = $("#rvote"); if (!r) return;
    const rv = ST.ruleVote;
    if (!rv || !rv.items || !rv.items.length) return;
    const key = JSON.stringify([rv.items, rv.open, ST.classRule || null]);
    if (r.dataset.key === key) return; r.dataset.key = key;
    const my = A(7).vote != null ? A(7).vote : (VOTES.rule || {})[P.pid];
    r.innerHTML = "";
    if (ST.classRule && ST.classRule.text) r.appendChild(el("div", "ok", "<b>Our class rule:</b> " + esc(ST.classRule.text)));
    r.appendChild(el("p", "vn", rv.open === false ? "The vote is closed." : "Which rule works for ANY city?"));
    const box = el("div", "chips");
    rv.items.forEach((it, i) => {
      const b = el("button", "chip wide" + (String(my) === String(i) ? " on" : ""), esc("ABC"[i] + ". " + it.text)); b.type = "button";
      b.disabled = rv.open === false;
      b.onclick = () => { LS.vote(P.pid, "rule", i); A(7).vote = i; saveAns(7); box.querySelectorAll(".chip").forEach((x, j) => x.classList.toggle("on", j === i)); };
      box.appendChild(b);
    });
    r.appendChild(box);
  }
  function peerTarget() {
    const list = Object.keys(PAIRS).map(pid => Object.assign({ pid }, PAIRS[pid])).filter(p => p.st).sort((x, y) => x.st - y.st);
    if (list.length < 2) return null;
    const i = list.findIndex(p => p.pid === P.pid); if (i < 0) return null;
    return list[(i + 1) % list.length];
  }
  function paint8() {
    const k = $("#q3key"); if (k) k.innerHTML = (ST.reveal && ST.reveal.q3) ? '<div class="ok">Answer: <b>A, B and C</b>. The sentences about D and E are what counts.</div>' : "";
    const box = $("#peer"); if (!box) return;
    const tgt = peerTarget();
    if (!tgt) { box.innerHTML = '<p class="vn">Waiting for another pair…</p>'; return; }
    const their = (tgt.a && tgt.a.s8) || {};
    const plan = their.plan || {};
    const mine = FEEDBACK[tgt.pid] && FEEDBACK[tgt.pid].from === P.pid ? FEEDBACK[tgt.pid] : null;
    if (box.dataset.tgt === tgt.pid && box.dataset.filled === String(!!Object.keys(plan).length) && box.dataset.sent === String(!!mine)) return;
    box.dataset.tgt = tgt.pid; box.dataset.filled = String(!!Object.keys(plan).length); box.dataset.sent = String(!!mine);
    if (!Object.keys(plan).length) { box.innerHTML = '<p class="vn">Station ' + tgt.st + ' is still writing their plan…</p>'; return; }
    box.innerHTML = '<div class="plan"><b>Station ' + tgt.st + '’s plan</b>' + D.transfer.plan.map(([k2, l]) => '<p><i>' + esc(l.split("?")[0]) + ':</i> ' + esc(plan[k2] || "—") + '</p>').join("") + (their.ask ? '<p class="vn">They want feedback on: ' + esc(their.ask) + '</p>' : '') + '</div>';
    const f = el("div", "");
    const ticks = {};
    D.transfer.checks.forEach(c => { const l = el("label", "tickline", '<input type="checkbox"> ' + esc(c)); l.querySelector("input").onchange = e => { ticks[c] = e.target.checked; }; f.appendChild(l); });
    const s1 = el("input"); s1.placeholder = "One strength: …"; const s2 = el("input"); s2.placeholder = "One question: …";
    f.appendChild(s1); f.appendChild(s2);
    const b = el("button", "btn", mine ? "Update our feedback" : "Send our feedback"); b.type = "button";
    const msg = el("p", "vn", mine ? "Sent ✓" : "");
    b.onclick = () => {
      if (txt(s1.value).length < 5 || txt(s2.value).length < 5) { msg.textContent = "Write a strength and a question."; return; }
      LS.sendFeedback(tgt.pid, { from: P.pid, fromSt: P.st, ticks: D.transfer.checks.filter(c => ticks[c]), strength: txt(s1.value), question: txt(s2.value) });
      A(8).reviewed = tgt.pid; saveAns(8, true); msg.textContent = "Sent ✓";
    };
    f.appendChild(b); f.appendChild(msg);
    box.appendChild(f);
  }
  function paint9() {
    const b = $("#fbin"); if (!b) return;
    const f = FEEDBACK[P.pid];
    const a = A(9);
    if (!f) { b.innerHTML = '<p class="vn">No feedback yet.</p>'; return; }
    if (b.dataset.at === String(f.at)) return; b.dataset.at = String(f.at);
    b.innerHTML = '<div class="plan"><p>From station ' + esc(f.fromSt) + ': ✓ ' + esc((f.ticks || []).join(", ") || "no ticks") + '</p><p><b>Strength:</b> ' + esc(f.strength) + '</p><p><b>Question:</b> ' + esc(f.question) + '</p></div>';
    const i = el("input"); i.placeholder = "One thing we will change in our plan…"; i.value = a.change || ""; i.oninput = () => { a.change = i.value; saveAns(9); };
    b.appendChild(i);
  }
  function repaintLive() { const n = screenNow(); if (n === 2) paint2(); if (n === 3) paintMeter(); if (n === 4) paint4(); if (n === 5) paint5(); if (n === 6) paint6(); if (n === 7) paint7(); if (n === 8) paint8(); if (n === 9) paint9(); }

  /* ───────── dock: help, ideas, goals ───────── */
  function setupDock() {
    const help = $("#helpBtn"), idea = $("#ideaBtn"), goals = $("#goalsBtn");
    help.onclick = () => {
      P.help = !P.help; saveLocal(); LS.setHelp(P.pid, P.help);
      if (P.help) LS.logEvent("help", { pid: P.pid, st: P.st, n: screenNow() });
      help.classList.toggle("on", P.help); help.textContent = P.help ? "Help asked — waiting" : "Help";
    };
    goals.onclick = () => { if (screenNow() === 9 && !A(9).goalsShown) { toast("Try from memory first!"); return; } toast(D.criteria.map((c, i) => (i + 1) + ". " + c).join("\n"), 9000); };
    idea.onclick = () => {
      if ($("#ideaBox")) { $("#ideaBox").remove(); return; }
      const b = el("div", "card ideabox", '<b>Suggest a change to this task</b><p class="vn">e.g. “We want to use a different station because…”, “Can we work alone for this part?”</p><textarea rows="2" maxlength="200"></textarea><div class="btns"><button class="btn sm">Send to our teacher</button></div>');
      b.id = "ideaBox";
      b.querySelector("button").onclick = () => { const t = txt(b.querySelector("textarea").value); if (t.length < 6) return; LS.addSuggestion(P.pid, t); b.innerHTML = '<p class="vn">Sent ✓ Your teacher will answer on this screen.</p>'; setTimeout(() => b.remove(), 3000); };
      $("#app").prepend(b);
    };
  }
  function toast(text, ms) { const t = $("#toast"); t.textContent = text; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, ms || 6000); }

  /* ───────── render ───────── */
  function render(force) {
    paintLive();
    if (!joined()) { renderJoin(); return; }
    if (ST.live === false && !offline) { $("#app").innerHTML = '<div class="card"><h2 class="title">The lesson has finished.</h2><p class="sub">Thank you. Your work is saved.</p></div>'; $("#dock").hidden = true; return; }
    const n = screenNow();
    if (!force && n === shown) { repaintLive(); return; }
    paintRoles(n);
    shown = n;
    $("#dock").hidden = false;
    const app = $("#app"); app.innerHTML = "";
    const box = el("div", "card scr on");
    app.appendChild(box);
    SCREENS[n](n, box);
    if (offline) {
      const nav = el("div", "btns");
      const back = el("button", "btn ghost", "← Back"), next = el("button", "btn", "Next →");
      back.disabled = n <= 1; next.disabled = n >= 9;
      back.onclick = () => { offlineScreen = Math.max(1, n - 1); render(true); };
      next.onclick = () => { offlineScreen = Math.min(9, n + 1); render(true); };
      nav.appendChild(back); nav.appendChild(next); app.appendChild(nav);
    }
    window.scrollTo({ top: 0 });
  }

  /* ───────── boot ───────── */
  setupDock();
  LS.onError(() => paintLive());
  if (!LS.available()) {
    offline = true;
    render(true);
  } else {
    setTimeout(() => { if (!ST.screen && !ST.reset) { offline = true; render(true); } }, 10000);
    LS.watchConnected(up => {
      const was = connected; connected = up;
      if (!up) lostAt = lostAt || LS.now();
      else { lostAt = 0; const sn = $("#selfnav"); if (sn) sn.remove(); if (was === false && offline && ST.screen) { offline = false; render(true); } }
      paintLive();
    });
    LS.watchState(s => {
      const prevReset = ST.reset;
      ST = s || {};
      if (offline && ST.screen) { offline = false; shown = 0; }
      if (ST.reset && P.joined && P.joined < ST.reset) { P = { pid: P.pid, a: {} }; saveLocal(); shown = 0; }
      if (prevReset !== ST.reset) shown = 0;
      render(false);
      tickClock();
      const sp = ST.spot;
      if (sp && sp.pid === P.pid && sp.at && sp.at > (P.lastSpot || 0) && joined()) { P.lastSpot = sp.at; saveLocal(); toast("★ Your work is on the board!", 6000); }
    });
    LS.watchHomework(v => { HOMEWORK = v || {}; if (!joined()) renderJoin(); else repaintLive(); });
    LS.watchPairs(v => {
      PAIRS = v || {};
      const me = PAIRS[P.pid];
      if (P.joined && !me && ST.reset && P.joined >= ST.reset) LS.savePair(P.pid, { st: P.st, names: P.names, codes: P.codes, joined: P.joined, a: P.a });
      if (me && P.help && !me.help) { P.help = false; saveLocal(); const h = $("#helpBtn"); h.classList.remove("on"); h.textContent = "Help"; }
      if (screenNow() === 8) paint8();
    });
    LS.watchMeter(v => { METER = v || {}; if (screenNow() === 3) paintMeter(); });
    LS.watchVotes(v => { VOTES = v || {}; });
    LS.watchFeedback(v => { FEEDBACK = v || {}; if (screenNow() === 8) paint8(); if (screenNow() === 9) paint9(); });
    LS.watchNudge(P.pid, v => { if (v && v.at && v.at > (P.lastNudge || 0)) { P.lastNudge = v.at; saveLocal(); if (joined()) toast("From your teacher: " + v.text, 8000); } });
    LS.watchSuggestions(v => {
      SUGG = v || {};
      Object.keys(SUGG).forEach(id => { const s = SUGG[id]; if (s.pid === P.pid && s.status !== "new" && !P["seen_" + id]) { P["seen_" + id] = 1; saveLocal(); toast(s.status === "yes" ? "Your teacher said YES to your idea: “" + s.text + "”" : "Your teacher says: not this time — “" + s.text + "”", 8000); } });
    });
  }
})();
