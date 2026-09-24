/* Air Watch lesson — the teacher's private view (laptop screen). PIN-gated.
   Runs the screens and timers, reveals answers, spotlights work on the projector,
   sends private nudges, answers student ideas, and shows live targets. */
(function () {
  "use strict";
  const { U, LS, HW, PLAN } = window.AWL;
  const { $, $$, esc, txt, el } = U;
  const C = window.AW, D = window.LESSON, CAT = window.AW_CAT, E = window.AWE;
  const NST = C.stations || 11;

  let ST = {}, PAIRS = {}, QS = {}, SUGG = {}, FB = {}, VOTES = {}, METER = {}, EVENTS = {}, HOMEWORK = {}, HWCFG = {}, FLAGS = {};
  let connected = null, builtFor = null, sessMode = null, projWin = null;
  let LOC = {}; try { LOC = JSON.parse(localStorage.getItem("aw_teach_local") || "{}") || {}; } catch (e) { LOC = {}; }
  const saveLoc = () => { try { localStorage.setItem("aw_teach_local", JSON.stringify(LOC)); } catch (e) {} };
  const scr = n => D.screens[(n || 1) - 1];
  const cur = () => ST.screen || 1;
  const now = () => LS.now();
  const X = () => ({ state: ST, pairs: PAIRS, questions: QS, sugg: SUGG, feedback: FB, votes: VOTES, events: EVENTS, homework: HOMEWORK });
  const ctx = () => ({ homework: HOMEWORK, photos: (ST.photos || []).length, ruleVote: !!(ST.ruleVote && ST.ruleVote.items) });

  /* run a painter at most every `ms` */
  const queued = {};
  function later(name, fn, ms) { if (queued[name]) return; queued[name] = setTimeout(() => { queued[name] = null; try { fn(); } catch (e) { console.error(e); } }, ms || 150); }
  /* two-step confirm, no browser dialogs */
  function confirmBtn(b, label, sure, fn) {
    b.textContent = label;
    b.onclick = () => {
      if (b.dataset.arm) { clearTimeout(b._t); delete b.dataset.arm; b.textContent = label; fn(); return; }
      b.dataset.arm = "1"; b.textContent = sure;
      b._t = setTimeout(() => { delete b.dataset.arm; b.textContent = label; }, 4000);
    };
  }
  const clock = ts => { if (!ts) return ""; const d = new Date(ts); return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); };
  const rel = ts => ST.startedAt && ts >= ST.startedAt ? "+" + U.mmss(ts - ST.startedAt) : clock(ts);

  U.gate(boot);

  function boot() {
    $("#app").innerHTML =
      '<div class="tgrid">' +
        '<div class="tleft">' +
          '<div class="card" id="sess"></div>' +
          '<div class="card"><h3>Screens <small>44 min + 1 to close = 45</small></h3><div class="steps" id="steps"></div><div class="stepnow" id="stepNow"></div><div class="tctrl" id="tctrl"></div><button class="btn g bigbtn" id="nextBtn" type="button" hidden></button></div>' +
          '<div class="card" id="run"></div>' +
        '</div>' +
        '<div class="tmid"><div class="card"><div class="pairhead" id="phead"></div><div class="pairs" id="pairs"></div></div></div>' +
        '<div class="tright">' +
          '<div class="card" id="voice"></div>' +
          '<div class="card" id="targets"></div>' +
          '<div class="card"><h3>Log <small>the observers see this too</small></h3><ul class="log" id="log"></ul></div>' +
        '</div>' +
      '</div>';
    $("#openProj").onclick = () => { projWin = window.open("projector.html", "aw_projector", "popup=yes,width=1280,height=720"); later("sess", paintSessionDyn, 500); };
    $("#openObs").onclick = () => window.open("observer.html", "_blank");
    document.addEventListener("keydown", keys);
    setInterval(tick, 500);
    setInterval(() => later("pairs", paintPairs, 50), 5000);

    LS.onError(paintLive);
    LS.watchConnected(v => { connected = v; paintLive(); later("sess", paintSessionDyn, 200); });
    LS.watchState(s => { ST = s || {}; onState(); });
    LS.watchPairs(v => { PAIRS = v || {}; later("pairs", paintPairs, 250); later("run", paintRunLive, 300); later("rules", paintRules, 300); later("targets", paintTargets, 900); later("sess", paintSessionDyn, 400); });
    LS.watchQuestions(v => { QS = v || {}; later("voice", paintVoice, 200); later("targets", paintTargets, 900); later("run", paintRunLive, 300); });
    LS.watchSuggestions(v => { SUGG = v || {}; later("voice", paintVoice, 200); later("targets", paintTargets, 900); });
    LS.watchFeedback(v => { FB = v || {}; later("run", paintRunLive, 300); later("targets", paintTargets, 900); });
    LS.watchVotes(v => { VOTES = v || {}; later("run", paintRunLive, 200); later("rules", paintRules, 200); });
    LS.watchMeter(v => { METER = v || {}; paintMeterInputs(); later("run", paintRunLive, 200); later("sess", paintSessionDyn, 300); });
    LS.watchEvents(v => { EVENTS = v || {}; later("log", paintLog, 300); later("targets", paintTargets, 900); });
    LS.watchHomework(v => { HOMEWORK = v || {}; later("photos", paintAllPhotos, 300); later("sess", paintSessionDyn, 300); later("pairs", paintPairs, 300); later("run", paintRunLive, 300); });
    LS.watchHomeworkConfig(v => { HWCFG = v || {}; later("sess", paintSessionDyn, 300); });
    LS.watchPhotoFlags(v => { FLAGS = v || {}; later("photos", paintAllPhotos, 300); });
    paintLive();
  }

  function paintLive() {
    const lv = $("#live"), tx = $("#livetx"), err = LS.lastError();
    lv.classList.toggle("on", LS.available() && connected !== false && !err);
    lv.classList.toggle("err", !!err || !LS.available() || connected === false);
    tx.textContent = err ? "Not saving — " + err : !LS.available() ? "No database — check firebase-config.js (check.html)" : connected === false ? "Reconnecting…" : "Live · room " + (C.lessonRoom || "G6W6");
  }

  function onState() {
    if (LOC.reset !== ST.reset) { LOC = { reset: ST.reset, tab: LOC.tab }; saveLoc(); }
    paintSession();
    paintSteps();
    const key = (ST.reset || "") + ":" + cur();
    if (builtFor !== key) { builtFor = key; buildRun(); }
    else { paintRevealBtns(); paintRunLive(); paintRules(); paintAllPhotos(); paintSpotCtl(); }
    later("pairs", paintPairs, 80); later("targets", paintTargets, 500); later("voice", paintVoice, 200);
    tick();
  }

  /* ───────── clocks: lesson, screen, projected finish ───────── */
  function tick() {
    const t = now(), T = U.timer(ST, t);
    const lc = $("#lclock"), tc = $("#tclock"), pb = $("#projb");
    if (!lc) return;
    if (ST.startedAt) { const e = (ST.live === false && ST.endedAt ? ST.endedAt : t) - ST.startedAt; lc.innerHTML = "Lesson <b>" + U.mmss(e) + "</b> / 45:00"; lc.classList.toggle("over", e > 45 * 60000); }
    else lc.innerHTML = "Lesson <b>not started</b>";
    if (T) {
      tc.innerHTML = "Screen " + cur() + " <b>" + (T.paused ? "❚❚ " : "") + (T.left < 0 ? "−" + U.mmss(-T.left) : U.mmss(T.left)) + "</b>";
      tc.classList.toggle("low", !T.paused && T.left > 0 && T.left < 60000); tc.classList.toggle("over", !T.paused && T.left <= 0);
    } else { tc.innerHTML = "Screen " + cur() + " <b>–:–</b>"; tc.classList.remove("low", "over"); }
    const pr = PLAN.projected(ST, t);
    if (pr == null || ST.live === false) pb.hidden = true;
    else {
      const over = pr - PLAN.total * 60000;
      pb.hidden = false; pb.className = "projbadge " + (over > 15000 ? "late" : "ok");
      pb.textContent = over > 15000 ? "Finish " + U.mmss(pr) + " · cut " + U.mmss(over) : "On time · finish " + U.mmss(pr);
      pb.title = "If you keep every remaining timer, the lesson ends at " + U.mmss(pr) + " (45:00 is the bell).";
      const cb = $("#cutBox"); if (cb) cb.classList.toggle("hot", over > 15000);
    }
  }

  /* ───────── session card ───────── */
  function paintSession() {
    const mode = !ST.reset ? "none" : ST.live === false ? "ended" : ST.startedAt ? "running" : "before";
    if (mode !== sessMode) { sessMode = mode; buildSession(mode); }
    paintSessionDyn();
  }
  function buildSession(mode) {
    const s = $("#sess");
    if (mode === "none") {
      s.innerHTML = '<h3>Session</h3><p class="vn">No lesson session yet. Start one before the students arrive — it also clears any test answers.</p><button class="btn g bigbtn" id="newS" type="button"></button>';
      confirmBtn($("#newS"), "Start a new session", "Click again to start", newSession);
      return;
    }
    if (mode === "before") {
      s.innerHTML = '<h3>Before the bell <small id="joinedTxt"></small></h3>' +
        '<button class="btn g bigbtn" id="bellBtn" type="button" style="margin:0 0 8px">▶ Bell — start the 45 minutes</button><div id="setupRows"></div>' +
        '<details class="setupbox"><summary><b>Photos for screen 2</b> <span class="vn" id="phCount"></span></summary><div class="photobox" id="setupPhotos"></div></details>' +
        '<details class="setupbox"><summary><b>PM2.5 meter (screen 3)</b></summary><div class="meterbox" id="setupMeter"></div></details>' +
        '<div class="btns"><button class="btn sm ghost danger" id="newS" type="button"></button></div>';
      $("#bellBtn").onclick = () => LS.bell(scr(1).min);
      confirmBtn($("#newS"), "New session (clears all answers)", "Click again — this clears everything", newSession);
      mountPhotos($("#setupPhotos")); mountMeter($("#setupMeter"), "s");
      return;
    }
    if (mode === "running") {
      s.innerHTML = '<h3>Lesson running <small id="joinedTxt"></small></h3><p class="vn" id="runTxt"></p><div class="btns"><button class="btn sm ghost" id="endS" type="button"></button><button class="btn sm ghost danger" id="newS" type="button"></button></div>';
      confirmBtn($("#endS"), "End the lesson", "Click again to end", () => LS.endSession());
      confirmBtn($("#newS"), "New session", "Click again — clears everything", newSession);
      return;
    }
    s.innerHTML = '<h3>Lesson ended <small id="joinedTxt"></small></h3><p class="vn">The laptops show “The lesson has finished”. All work stays saved.</p><div class="btns"><button class="btn sm" id="reopen" type="button">Re-open the lesson</button><button class="btn sm ghost danger" id="newS" type="button"></button></div>';
    $("#reopen").onclick = () => { LS.setState({ live: true, endedAt: null }); LS.logEvent("reopen", {}); };
    confirmBtn($("#newS"), "New session", "Click again — clears everything", newSession);
  }
  function newSession() {
    LOC = { tab: LOC.tab }; saveLoc();
    LS.startSession();
  }
  function paintSessionDyn() {
    const L = E.pairs(PAIRS), jt = $("#joinedTxt");
    if (jt) jt.textContent = L.length + " of " + NST + " stations · " + L.reduce((s, p) => s + p.names.length, 0) + " students";
    const rt = $("#runTxt"); if (rt) rt.textContent = "Started at " + clock(ST.startedAt) + " · 45 minutes end at " + clock(ST.startedAt + PLAN.total * 60000) + ".";
    const pc = $("#phCount"); if (pc) pc.textContent = (ST.photos || []).length + " of 3 chosen";
    const box = $("#setupRows"); if (!box) return;
    const hwN = HW.list(HOMEWORK).filter(x => HW.days(x).length).length, rd = HW.readings(HOMEWORK), g = HW.guessScore(HOMEWORK);
    const cs = HWCFG.classStation;
    const rows = [
      [LS.available() && connected !== false ? "ok" : "bad", "Database", LS.available() ? (connected === false ? "reconnecting…" : "live") : "not configured — open check.html"],
      [hwN ? "ok" : "warn", "Homework", hwN + " students · " + rd + " readings · eyes right " + g.pct + "%"],
      [cs ? "ok" : "warn", "Class station", cs ? cs.name : "none chosen (time chart will be empty)"],
      [(ST.photos || []).length ? "ok" : "warn", "Photo game", (ST.photos || []).length + " of 3 photos chosen (below)"],
      [METER.base != null ? "ok" : "warn", "Meter", METER.base != null ? "room air " + METER.base + " µg/m³" : "type the room reading (below)"],
      [projWin && !projWin.closed ? "ok" : "warn", "Projector", projWin && !projWin.closed ? "window open — make it full screen on the projector" : "press Projector ↗ (Windows+P → Extend)"],
      [L.length >= NST ? "ok" : "warn", "Pairs", L.length + " of " + NST + " stations joined"]
    ];
    box.innerHTML = rows.map(r => '<div class="checkrow"><span class="s ' + r[0] + '"></span><div><b>' + esc(r[1]) + '</b><small>' + esc(r[2]) + '</small></div></div>').join("");
  }

  /* ───────── screens + timer controls ───────── */
  function openScreen(n) {
    if (!ST.reset) return;
    const t = now();
    LS.setState({ screen: n, screenAt: t, timerEnd: ST.startedAt && ST.live !== false ? t + scr(n).min * 60000 : null, pausedLeft: null, spot: null });
    LS.logEvent("screen", { n });
  }
  function plus1() {
    const t = now();
    if (ST.pausedLeft != null) LS.setState({ pausedLeft: ST.pausedLeft + 60000 });
    else LS.setState({ timerEnd: Math.max(ST.timerEnd || t, t) + 60000 });
    LS.logEvent("timer", { action: "+1 min", n: cur() });
  }
  function pause() { if (!ST.timerEnd) return; LS.setState({ pausedLeft: Math.max(0, ST.timerEnd - now()), timerEnd: null }); LS.logEvent("timer", { action: "paused", n: cur() }); }
  function resume() { if (ST.pausedLeft == null) return; LS.setState({ timerEnd: now() + ST.pausedLeft, pausedLeft: null }); LS.logEvent("timer", { action: "resumed", n: cur() }); }
  function restart() { LS.setState({ timerEnd: now() + scr(cur()).min * 60000, pausedLeft: null }); LS.logEvent("timer", { action: "restarted", n: cur() }); }

  function paintSteps() {
    const n = cur(), seen = {};
    E.evList(EVENTS).forEach(e => { if (e.kind === "screen" || e.kind === "bell") seen[e.n || 1] = true; });
    const box = $("#steps"); box.innerHTML = "";
    D.screens.forEach(s => {
      const b = el("button", "step1 ph-" + s.phase.toLowerCase() + (s.n === n ? " cur" : "") + (seen[s.n] && s.n !== n ? " seen" : ""),
        '<span class="n">' + s.n + '</span><span class="mm">' + s.min + '′</span>');
      b.type = "button"; b.title = s.n + " · " + s.name + " — " + s.phase + ", " + s.min + " min, planned from " + PLAN.startOf(s.n) + "′. Click to open it on every laptop.";
      b.onclick = () => openScreen(s.n);
      box.appendChild(b);
    });
    const sc = scr(n);
    $("#stepNow").innerHTML = (ST.reset ? '<b>Now: ' + n + ' · ' + esc(sc.name) + '</b> <span class="vn">' + esc(sc.phase) + ' · planned ' + PLAN.startOf(n) + '′–' + (PLAN.startOf(n) + sc.min) + '′</span>' : '');
    const tc = $("#tctrl"); tc.innerHTML = "";
    if (ST.startedAt && ST.live !== false) {
      const T = U.timer(ST, now());
      [["+1 min", plus1], [T && T.paused ? "▶ Resume" : "❚❚ Pause", T && T.paused ? resume : pause], ["↺ " + scr(n).min + " min again", restart]].forEach(([l, f]) => { const b = el("button", "btn sm ghost", l); b.type = "button"; b.onclick = f; tc.appendChild(b); });
      tc.appendChild(el("span", "vn", "Keys: N next · P pause · + minute · Esc clear spotlight")).style.fontSize = "11px";
    }
    const nb = $("#nextBtn"), nx = D.screens[n];
    if (!ST.reset || !ST.startedAt || ST.live === false) nb.hidden = true;
    else if (!nx) { nb.hidden = false; confirmBtn(nb, "Finish — end the lesson", "Click again to end", () => LS.endSession()); }
    else { nb.hidden = false; nb.textContent = "Next → " + nx.n + " · " + nx.name + " (" + nx.min + " min)"; nb.onclick = () => openScreen(nx.n); }
  }
  function keys(e) {
    const tag = (e.target && e.target.tagName) || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!ST.startedAt || ST.live === false) return;
    if (e.key === "n" || e.key === "N") { const nx = D.screens[cur()]; if (nx) openScreen(nx.n); }
    else if (e.key === "p" || e.key === "P") { ST.pausedLeft != null ? resume() : pause(); }
    else if (e.key === "+" || e.key === "=") plus1();
    else if (e.key === "Escape") { if (ST.spot) LS.setState({ spot: null }); closePop(); }
  }

  /* ───────── run sheet for the current screen ───────── */
  function buildRun() {
    const n = cur(), s = scr(n), r = $("#run");
    r.className = "card ph-" + s.phase.toLowerCase();
    LOC.did = LOC.did || {}; const did = LOC.did[n] = LOC.did[n] || {};
    r.innerHTML = '<h3>' + n + ' · ' + esc(s.name) + ' <small>' + esc(s.phase) + ' · ' + s.min + ' min</small></h3><ul class="script" id="script"></ul>' +
      '<div class="cut" id="cutBox"><b>If you are behind</b>' + esc(D.cut[n] || "") + '</div><div id="ctl"></div><div id="spotCtl"></div><div id="runLive"></div>';
    (D.script[n] || []).forEach((line, i) => {
      const li = el("li", did[i] ? "did" : "", '<input type="checkbox"' + (did[i] ? " checked" : "") + '><span>' + esc(line) + '</span>');
      li.querySelector("input").onchange = e => { did[i] = e.target.checked; li.classList.toggle("did", did[i]); saveLoc(); };
      $("#script").appendChild(li);
    });
    const ctl = $("#ctl"), rev = el("div", "rev");
    const add = (k, l) => rev.appendChild(revealBtn(k, l));
    if (n === 2) { add("guess", "Reveal the guess score"); add("photos", "Reveal the photo numbers"); }
    if (n === 3) add("pred", "Show the class predictions");
    if (n === 4) { add("sort", "Reveal the sort answers"); add("q1q2", "Reveal Q1, Q2 & language answers"); }
    if (n === 6) add("dbq", "Reveal the DBQ answers");
    if (n === 8) add("q3", "Reveal the Q3 answer");
    if (n === 9) { add("shift", "Show before → after"); add("goals", "Show the 3 goals on the board"); }
    if (rev.children.length) ctl.appendChild(rev);
    if (n === 2) { const d = el("details", "setupbox", '<summary><b>Photo game</b> <span class="vn">' + (ST.photos || []).length + ' of 3 chosen</span></summary><div class="photobox"></div>'); d.open = !(ST.photos || []).length; ctl.appendChild(d); mountPhotos(d.querySelector(".photobox")); }
    if (n === 3) { const m = el("div", "meterbox"); ctl.appendChild(m); mountMeter(m, "r"); }
    if (n === 7) ctl.appendChild(el("div", "", '<div id="ruleList"></div>'));
    paintSpotCtl();
    paintRunLive();
    paintRules();
    tick();
  }
  function revealBtn(key, label) {
    const b = el("button", "chip"); b.type = "button"; b.dataset.rev = key; b.dataset.label = label;
    b.onclick = () => { const v = !(ST.reveal && ST.reveal[key]); LS.setState({ ["reveal/" + key]: v }); if (v) LS.logEvent("reveal", { what: key, n: cur() }); };
    paintOneReveal(b); return b;
  }
  function paintOneReveal(b) { const on = !!(ST.reveal && ST.reveal[b.dataset.rev]); b.classList.toggle("on", on); b.textContent = (on ? "✓ " : "") + b.dataset.label + (on ? " (on)" : ""); }
  function paintRevealBtns() { $$("[data-rev]").forEach(paintOneReveal); }
  function paintSpotCtl() {
    const box = $("#spotCtl"); if (!box) return;
    if (!ST.spot) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="cut" style="background:var(--soft);border-color:var(--line);color:var(--text)"><b>On the projector now</b>' + esc(ST.spot.text) + ' <span class="vn">— station ' + esc(ST.spot.st) + '</span><div class="btns" style="margin-top:6px"><button class="btn sm" type="button">Clear spotlight</button></div></div>';
    box.querySelector("button").onclick = () => LS.setState({ spot: null });
  }

  /* private class results for the current screen */
  function miniBars(rows, cls) {
    return '<div class="pbars' + (cls ? " " + cls : "") + '" style="font-size:13px;margin:4px 0 8px">' + rows.map(r => '<div class="pbar' + (r.key ? " key" : "") + '"><span class="l">' + esc(r.label) + '</span><span class="t"><i style="width:' + U.pct(r.v, Math.max(1, r.of)) + '%"></i></span><span class="v">' + r.v + '</span></div>').join("") + '</div>';
  }
  function tallyRows(n, get, opts, keys) {
    const N = E.pairs(PAIRS).length, r = E.tally(PAIRS, n, get, opts.map(o => o[0]));
    return opts.map(o => ({ label: o[1], v: r.counts[o[0]], of: N, key: (keys || []).includes(o[0]) }));
  }
  function votesFor(key) { const L = E.pairs(PAIRS), v = VOTES[key] || {}, c = {}; L.forEach(p => { const x = v[p.pid]; if (x != null) c[x] = (c[x] || 0) + 1; }); return c; }
  function paintRunLive() {
    const box = $("#runLive"); if (!box) return;
    const n = cur(), L = E.pairs(PAIRS), N = L.length, A = (p, k) => (p.a || {})["s" + k] || {};
    const cnt = f => L.filter(f).length;
    let h = "";
    if (n === 1) h = '<b>Vote before (only you see this)</b>' + miniBars(tallyRows(1, a => a.pre, D.vote.opts)) + 'Eyes right on their worst day: ' + cnt(p => A(p, 1).eyes === "yes") + ' · wrong: ' + cnt(p => A(p, 1).eyes === "no");
    if (n === 2) {
      const g = HW.guessScore(HOMEWORK);
      h = '<b>Guess score:</b> ' + g.pct + '% (' + g.right + ' of ' + g.total + ' days by looking)';
      const ph = ST.photos || [];
      if (ph.length) { const c = votesFor("photo"); h += '<br><b>Photo votes</b>' + miniBars(ph.map((p, i) => { const L1 = "ABC"[i], aq = HW.photoAqi(HOMEWORK, p.code, p.day); return { label: L1 + " · AQI " + (aq == null ? "?" : aq), v: c[L1] || 0, of: N }; })); }
      const asked = new Set(Object.keys(QS).map(k => QS[k].pid));
      h += '<b>Questions:</b> ' + cnt(p => asked.has(p.pid)) + ' of ' + N + ' pairs posted';
    }
    if (n === 3) h = '<b>Clean when the smoke clears?</b>' + miniBars(tallyRows(3, a => a.p1, D.jar.predict1.opts)) + '<b>How high will PM2.5 go?</b>' + miniBars(tallyRows(3, a => a.p2, D.jar.predict2.opts));
    if (n === 4) {
      const ch = E.checks(PAIRS).filter(c => c.screen === 4 && c.n);
      h = '<b>Sort — pairs who got each card right</b>' + miniBars(D.focus.cards.map(cd => { const v = L.map(p => E.MARK.sort(A(p, 4), cd)).filter(x => x !== null); return { label: cd.en + (cd.yes ? " (pollutant)" : " (not)"), v: v.filter(Boolean).length, of: v.length }; })) +
        (ch.length ? '<b>Book items — pairs right</b>' + miniBars(ch.map(c => ({ label: c.label, v: c.right, of: c.n }))) : "");
    }
    if (n === 5) h = '<b>Which one gives the AQI?</b>' + miniBars(tallyRows(5, a => a.hyp, [["total", "All six added"], ["avg", "The average"], ["big", "The biggest one"]], ["big"])) +
      '<b>Does TIME change it?</b>' + miniBars(tallyRows(5, a => a.time && a.time.yn, [["yes", "Yes"], ["no", "No"], ["cant", "Can’t tell"]])) +
      '<b>Does PLACE change it?</b>' + miniBars(tallyRows(5, a => a.place && a.place.yn, [["yes", "Yes"], ["no", "No"], ["cant", "Can’t tell"]]));
    if (n === 6) h = '<b>DBQ1 (key B + D)</b>' + miniBars(tallyRows(6, a => a.d1 && a.d1.pick, D.inv2.dbq1.opts.map((o, i) => [o[0], D.inv2.dbq1.short[i]]), ["B", "D"]), "stack") +
      '<b>DBQ2 (key A)</b>' + miniBars(tallyRows(6, a => a.d2 && a.d2.pick, D.inv2.dbq2.opts.map((o, i) => [o[0], D.inv2.dbq2.short[i]]), ["A"]), "stack");
    if (n === 7) h = '<b>Rules sent:</b> ' + cnt(p => A(p, 7).submitted) + ' of ' + N + ' · frames: ' + ["g1", "g2", "g3"].map(k => k.toUpperCase() + " " + cnt(p => A(p, 7).frame === k)).join(", ");
    if (n === 8) {
      const gave = new Set(Object.keys(FB).map(k => FB[k] && FB[k].from));
      h = '<b>Q3 (key A, B, C)</b>' + miniBars(tallyRows(8, a => a.q3, D.transfer.q3.opts.map((o, i) => [o[0], D.transfer.q3.short[i]]), ["A", "B", "C"]), "stack") +
        '<b>Plans with 3+ parts:</b> ' + cnt(p => Object.values(A(p, 8).plan || {}).filter(x => txt(x)).length >= 3) + ' of ' + N + ' · <b>feedback sent:</b> ' + cnt(p => gave.has(p.pid)) + ' of ' + N;
    }
    if (n === 9) {
      const sh = E.shift(PAIRS);
      h = '<b>Before → now</b>' + miniBars(D.vote.opts.map(o => ({ label: o[1] + " (start " + sh.pre[o[0]] + ")", v: sh.post[o[0]], of: N, key: o[0] === "no" }))) +
        'Moved away from “yes”: ' + sh.moved + ' of ' + sh.both + ' · goals from memory 2–3: ' + cnt(p => +A(p, 9).recall >= 2) + ' of ' + N + ' · self-rated all three: ' + cnt(p => E.arr(A(p, 9).rate).filter(r => r && r.lv).length === 3);
    }
    box.innerHTML = h ? '<div style="margin-top:10px;font-size:13px">' + h + '</div>' : "";
  }

  /* ───────── photo game picker ───────── */
  const thumbs = {};
  function photoCands() {
    const out = [];
    HW.list(HOMEWORK).forEach(s => HW.days(s).forEach(d => { if (d.photo) out.push({ code: s.code, day: d.n, aqi: d.a.aqi, guess: d.g && d.g.guess, name: s.n, star: FLAGS[s.code + "_" + d.n] === "star" }); }));
    return out.sort((a, b) => (b.star - a.star) || ((b.aqi || 0) - (a.aqi || 0)));
  }
  function mountPhotos(box) {
    box.innerHTML = '<p class="vn" style="margin:6px 0">Tap up to 3 (A, B, C). Best: a clear-looking sky with a high number next to a hazy one with a lower number. ★ = starred on the homework page.</p><div class="phpick"></div><div class="btns"><button class="btn sm ghost" type="button">Show more</button></div>';
    box._limit = 9;
    box.querySelector(".btns button").onclick = () => { box._limit += 9; box.querySelector(".phpick").dataset.key = ""; paintPhotos(box); };
    paintPhotos(box);
  }
  function paintAllPhotos() { $$(".photobox").forEach(paintPhotos); const pc = $("#phCount"); if (pc) pc.textContent = (ST.photos || []).length + " of 3 chosen"; }
  function paintPhotos(box) {
    const grid = box.querySelector(".phpick"); if (!grid) return;
    const cands = photoCands(), sel = (ST.photos || []).map(p => p.code + "_" + p.day);
    const list = cands.slice(0, box._limit || 9);
    const key = JSON.stringify([list.map(c => c.code + "_" + c.day + (c.star ? "*" : "") + (thumbs[c.code + "_" + c.day] ? "t" : "")), sel]);
    if (grid.dataset.key === key) return; grid.dataset.key = key;
    box.querySelector(".btns").hidden = cands.length <= (box._limit || 9);
    if (!cands.length) { grid.innerHTML = '<p class="vn" style="grid-column:1/-1;margin:0">No sky photos in the homework yet.</p>'; return; }
    grid.innerHTML = "";
    list.forEach(c => {
      const k = c.code + "_" + c.day, pos = sel.indexOf(k), th = thumbs[k];
      const gc = (window.AW_CATS || []).find(x => x.k === c.guess);
      const b = el("button", pos >= 0 ? "on" : "", (th && th !== "none" && th !== "loading" ? '<img alt="" src="' + th + '">' : '<div class="ph0">' + (th === "none" ? "missing" : "…") + '</div>') +
        (pos >= 0 ? '<b class="pos">' + "ABC"[pos] + '</b>' : '') + '<span>' + (c.star ? "★ " : "") + "Day " + c.day + " " + U.catChip(c.aqi) + (gc ? "<br>looked: " + esc(gc.en) : "") + '</span>');
      b.type = "button"; b.title = c.name || "";
      b.onclick = () => togglePhoto(c);
      grid.appendChild(b);
      if (!th) { thumbs[k] = "loading"; LS.getPhoto(c.code, c.day).then(v => { thumbs[k] = v && v.d ? v.d : "none"; later("photos", paintAllPhotos, 150); }); }
    });
  }
  function togglePhoto(c) {
    const sel = (ST.photos || []).slice(), i = sel.findIndex(p => p.code === c.code && p.day === c.day);
    if (i >= 0) sel.splice(i, 1); else { if (sel.length >= 3) sel.shift(); sel.push({ code: c.code, day: c.day }); }
    LS.setState({ photos: sel.length ? sel : null, "reveal/photos": false });
    LS.clearVotes("photo");
  }

  /* ───────── meter ───────── */
  function mountMeter(box, pre) {
    box.innerHTML = '<p class="vn" style="margin:6px 0">Type what the meter shows (PM2.5, µg/m³). Every laptop and the projector update as you type.</p>' +
      [["base", "Room air (before)"], ["peak", "Smoke at the meter"], ["after", "60 s later — looks clear"]].map(([k, l]) => '<div class="minirow"><label for="m' + pre + k + '">' + l + '</label><input id="m' + pre + k + '" inputmode="decimal" data-mk="' + k + '" placeholder="µg/m³" autocomplete="off"></div>').join("");
    box.querySelectorAll("input").forEach(i => {
      i.value = METER[i.dataset.mk] != null ? METER[i.dataset.mk] : "";
      i.oninput = () => {
        clearTimeout(i._t);
        i._t = setTimeout(() => {
          const v = txt(i.value), val = v === "" ? null : (isFinite(+v) ? +v : v);
          LS.setMeter({ [i.dataset.mk]: val });
          if (val != null) LS.logEvent("meter", { what: i.dataset.mk, v: val });
        }, 600);
      };
    });
  }
  function paintMeterInputs() { $$("input[data-mk]").forEach(i => { if (document.activeElement !== i) i.value = METER[i.dataset.mk] != null ? METER[i.dataset.mk] : ""; }); }

  /* ───────── screen 7: the rule vote ───────── */
  function paintRules() {
    const box = $("#ruleList"); if (!box) return;
    const L = E.pairs(PAIRS).filter(p => { const a = (p.a || {}).s7 || {}; return a.submitted && txt(a.rule); });
    const rv = ST.ruleVote && ST.ruleVote.items ? ST.ruleVote : null;
    LOC.pick7 = LOC.pick7 || [];
    const c = votesFor("rule");
    const key = JSON.stringify([L.map(p => p.pid + p.a.s7.rule), rv, ST.classRule || null, LOC.pick7, c]);
    if (box.dataset.key === key) return; box.dataset.key = key;
    if (rv) {
      const tot = Object.values(c).reduce((s, v) => s + v, 0);
      box.innerHTML = '<b>' + (rv.open === false ? "Vote closed" : "Voting now") + '</b> <span class="vn">' + tot + ' votes</span>' +
        miniBars(rv.items.map((it, i) => ({ label: "ABC"[i] + ". " + it.text, v: c[i] || 0, of: Math.max(1, tot) })), "stack") +
        (ST.classRule ? '<div class="cut" style="background:var(--okBg);border-color:var(--green);color:var(--okInk)"><b>Class rule</b>' + esc(ST.classRule.text) + '</div>' : '') +
        '<div class="btns"></div>';
      const bt = box.querySelector(".btns");
      if (rv.open !== false) { const b = el("button", "btn sm g", "Close the vote → the winner is our class rule"); b.type = "button"; b.onclick = closeVote; bt.appendChild(b); }
      const nb = el("button", "btn sm ghost", "Start a new vote"); nb.type = "button"; nb.onclick = () => { LS.setState({ ruleVote: null, classRule: null }); LS.clearVotes("rule"); }; bt.appendChild(nb);
      return;
    }
    if (!L.length) { box.innerHTML = '<p class="vn">Rules appear here when pairs press “Send our rule”.</p>'; return; }
    box.innerHTML = '<b>Tick up to 3 rules for the vote</b><div class="vlist" style="max-height:240px;margin-top:6px"></div><div class="btns"></div>';
    const list = box.querySelector(".vlist");
    L.forEach(p => {
      const it = el("label", "vitem tickline", '<input type="checkbox"' + (LOC.pick7.includes(p.pid) ? " checked" : "") + '> <span><span class="meta">Station ' + p.st + ' · ' + esc(((p.a.s7.frame || "") + "").toUpperCase()) + '</span><br>' + esc(p.a.s7.rule) + '</span>');
      it.style.fontWeight = "500"; it.style.margin = "0";
      it.querySelector("input").onchange = e => { LOC.pick7 = LOC.pick7.filter(x => x !== p.pid); if (e.target.checked) { LOC.pick7.push(p.pid); if (LOC.pick7.length > 3) LOC.pick7.shift(); } saveLoc(); box.dataset.key = ""; paintRules(); };
      list.appendChild(it);
    });
    const go = el("button", "btn sm g", "Put the ticked rules to the vote"); go.type = "button"; go.disabled = !LOC.pick7.length;
    go.onclick = () => {
      const items = LOC.pick7.filter(pid => PAIRS[pid]).map(pid => { const p = PAIRS[pid]; return { pid, st: p.st, text: txt(((p.a || {}).s7 || {}).rule) }; }).filter(x => x.text);
      if (!items.length) return;
      LS.clearVotes("rule");
      LS.setState({ ruleVote: { items, open: true, at: now() }, classRule: null, spot: null });
      LS.logEvent("vote", { n: 7, k: items.length });
    };
    box.querySelector(".btns").appendChild(go);
  }
  function closeVote() {
    const rv = ST.ruleVote; if (!rv || !rv.items) return;
    const c = votesFor("rule"); let best = 0;
    rv.items.forEach((it, i) => { if ((c[i] || 0) > (c[best] || 0)) best = i; });
    const w = rv.items[best];
    LS.setState({ "ruleVote/open": false, classRule: { text: w.text, st: w.st, pid: w.pid } });
    LS.logEvent("classrule", { st: w.st, pid: w.pid });
  }

  /* ───────── pairs grid ───────── */
  function spotText(n, a) {
    a = a || {};
    switch (n) {
      case 2: return txt(a.q) ? ["Our question", txt(a.q)] : null;
      case 3: { const s = E.frameText(D.jar.frame, a.ex, 3); return s ? ["Looking is not measuring", s] : null; }
      case 4: { const s = E.frameText(D.focus.rule, a.rule, 2); return s ? ["What makes a pollutant", s] : null; }
      case 5: { const s = E.frameText(D.inv1.frame, a.fr, 2) || txt((a.place || {}).ev) || txt((a.time || {}).ev); return s ? ["What the AQI hides", s] : null; }
      case 6: { const s = E.frameText(["", D.inv2.tw2.frame[0], D.inv2.tw2.frame[1], D.inv2.tw2.frame[2]], a.tw2, 4); return s ? ["Evidence from our week", s] : null; }
      case 7: return txt(a.rule) ? ["A rule for any city", txt(a.rule)] : null;
      case 8: { const p = a.plan || {}; const parts = D.transfer.plan.filter(([k]) => txt(p[k])).map(([k, l]) => l.split(/[?(]/)[0].replace(/ would.*| do you.*/i, "").trim() + ": " + txt(p[k])); return parts.length ? ["A fair way to measure", parts.join(" · ")] : null; }
      case 9: return txt(a.exit) ? ["Why we need to talk about air quality", txt(a.exit)] : null;
    }
    return null;
  }
  function spotlight(p, kind, text) {
    LS.setState({ spot: { kind, text, st: p.st, names: p.names.join(" & "), pid: p.pid, at: now() } });
    LS.logEvent("spot", { pid: p.pid, st: p.st, n: cur(), what: kind, text });
  }
  function paintPairs() {
    const box = $("#pairs"); if (!box) return;
    if (document.querySelector("#pop")) return; /* keep the grid still while a nudge menu is open */
    const n = cur(), L = E.pairs(PAIRS), t = now(), cx = ctx();
    const byS = {}; L.forEach(p => (byS[p.st] = byS[p.st] || []).push(p));
    const cards = [];
    for (let s = 1; s <= NST; s++) { if (!byS[s]) cards.push({ empty: s }); else byS[s].forEach(p => cards.push({ p, dup: byS[s].length > 1 })); }
    Object.keys(byS).map(Number).filter(s => s > NST).forEach(s => byS[s].forEach(p => cards.push({ p })));
    box.innerHTML = "";
    cards.forEach(c => {
      if (c.empty) { box.appendChild(el("div", "pair empty", "Station " + c.empty + " — not joined")); return; }
      const p = c.p, a = (p.a || {})["s" + n] || {}, pr = E.progress(n, a, cx);
      const done = p.done && p.done[n], help = p.help, lastT = a.t || 0, opened = ST.screenAt || 0;
      const idle = !done && !help && ST.startedAt && ST.live !== false && t - opened > 60000 && t - Math.max(lastT, opened) > 90000;
      const card = el("div", "pair" + (done ? " done" : "") + (help ? " help" : "") + (idle ? " idle" : ""));
      card.innerHTML = '<div class="ph"><span class="stn">' + p.st + '</span><span class="who">' + esc(p.names.join(" & ")) + '<small>' + (c.dup ? "⚠ two laptops on station " + p.st : lastT ? "last typed " + U.ago(t - lastT) + " ago" : "joined " + clock(p.joined)) + '</small></span>' +
        (help ? '<span class="flag hp">HELP · ' + U.ago(t - help) + '</span>' : done ? '<span class="flag dn">✓ done</span>' : idle ? '<span class="flag id">quiet</span>' : '') + '</div>' +
        '<div class="prog" title="' + pr.got + ' of ' + pr.of + ' parts"><i style="width:' + U.pct(pr.got, pr.of) + '%"></i></div>' +
        '<div class="sum">' + E.summary(n, p, cx) + '</div><div class="acts"></div>';
      const acts = card.querySelector(".acts");
      const nb = el("button", "btn ghost", "Nudge ▾"); nb.type = "button"; nb.onclick = ev => { ev.stopPropagation(); nudgeMenu(nb, p); }; acts.appendChild(nb);
      const sp = spotText(n, a);
      const sb = el("button", "btn ghost", "★ Spotlight"); sb.type = "button"; sb.disabled = !sp; if (sp) sb.title = sp[1];
      sb.onclick = () => sp && spotlight(p, sp[0], sp[1]); acts.appendChild(sb);
      if (help) { const hb = el("button", "btn g", "✓ Helped"); hb.type = "button"; hb.onclick = () => { LS.setHelp(p.pid, false); LS.logEvent("helped", { pid: p.pid, st: p.st, n }); }; acts.appendChild(hb); }
      box.appendChild(card);
    });
    const doneN = L.filter(p => p.done && p.done[n]).length, helpN = L.filter(p => p.help).length;
    $("#phead").innerHTML = '<b>Pairs · screen ' + n + '</b><span>' + L.length + ' of ' + NST + ' stations · ' + L.reduce((s, p) => s + p.names.length, 0) + ' students</span><span>done ' + doneN + ' of ' + L.length + '</span>' +
      (helpN ? '<span style="color:var(--crimson);font-weight:700">help ' + helpN + '</span>' : '') + '<span>“quiet” = nothing typed for 90 s</span>';
  }
  function nudgeMenu(btn, p) {
    closePop();
    const pop = el("div", "pop"); pop.id = "pop";
    pop.appendChild(el("div", "vn", "Private message to station " + p.st + " only:")).style.padding = "4px 8px";
    D.nudges.forEach(tx => { const b = el("button", "", esc(tx)); b.type = "button"; b.onclick = () => { sendNudge(p, tx); closePop(); }; pop.appendChild(b); });
    const inp = el("input"); inp.placeholder = "Or type your own…"; pop.appendChild(inp);
    const go = el("button", "", "<b>Send ↵</b>"); go.type = "button"; go.onclick = () => { if (txt(inp.value)) { sendNudge(p, txt(inp.value)); closePop(); } }; pop.appendChild(go);
    inp.onkeydown = e => { if (e.key === "Enter") go.onclick(); if (e.key === "Escape") closePop(); };
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(window.innerWidth - pop.offsetWidth - 8, r.left)) + "px";
    pop.style.top = Math.max(8, Math.min(window.innerHeight - pop.offsetHeight - 8, r.bottom + 4)) + "px";
    setTimeout(() => document.addEventListener("click", outside, true), 0);
  }
  function outside(e) { const pop = $("#pop"); if (pop && !pop.contains(e.target)) closePop(); }
  function closePop() { const pop = $("#pop"); if (pop) pop.remove(); document.removeEventListener("click", outside, true); later("pairs", paintPairs, 50); }
  function sendNudge(p, text) { LS.sendNudge(p.pid, text); LS.logEvent("nudge", { pid: p.pid, st: p.st, n: cur(), text }); }

  /* ───────── student voice: questions and ideas ───────── */
  function paintVoice() {
    const v = $("#voice"); if (!v) return;
    if (!v.dataset.built) {
      v.dataset.built = "1";
      v.innerHTML = '<div class="tabs"><button type="button" data-t="q">Wonder questions <span class="ct"></span></button><button type="button" data-t="i">Ideas to change a task <span class="ct"></span></button></div><div id="vbody"></div>';
      v.querySelectorAll(".tabs button").forEach(b => b.onclick = () => { LOC.tab = b.dataset.t; saveLoc(); v.dataset.key = ""; paintVoice(); });
    }
    const tab = LOC.tab || "q";
    const qs = Object.keys(QS).map(k => Object.assign({ id: k }, QS[k])).sort((a, b) => b.at - a.at);
    const ss = Object.keys(SUGG).map(k => Object.assign({ id: k }, SUGG[k])).sort((a, b) => b.at - a.at);
    const stOf = pid => (PAIRS[pid] && PAIRS[pid].st) || "?";
    const key = JSON.stringify([tab, qs, ss, ST.spot && ST.spot.at]);
    if (v.dataset.key === key) return; v.dataset.key = key;
    v.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.t === tab));
    const cts = v.querySelectorAll(".ct");
    cts[0].textContent = qs.filter(q => q.ok == null).length || ""; cts[1].textContent = ss.filter(s => s.status === "new").length || "";
    const body = $("#vbody"); body.innerHTML = "";
    if (tab === "q") {
      if (!qs.length) { body.innerHTML = '<p class="vn">Pairs post questions on screen 2. Tick one to put it on the Wonder Wall.</p>'; return; }
      const top = el("div", "btns"); top.style.marginTop = "0";
      const all = el("button", "btn sm ghost", "Put all new ones on the wall"); all.type = "button";
      all.onclick = () => qs.filter(q => q.ok == null).forEach(q => LS.flagQuestion(q.id, true)); top.appendChild(all); body.appendChild(top);
      const list = el("div", "vlist"); body.appendChild(list);
      qs.forEach(q => {
        const it = el("div", "vitem" + (q.ok === true ? " ok" : q.ok === false ? " hid" : ""), '<div class="meta">Station ' + esc(stOf(q.pid)) + ' · ' + clock(q.at) + (q.ok === true ? " · on the wall" : q.ok === false ? " · hidden" : " · new") + '</div>' + esc(q.text) + '<div class="acts"></div>');
        const acts = it.querySelector(".acts");
        [["✓ Wall", () => LS.flagQuestion(q.id, true)], ["Hide", () => LS.flagQuestion(q.id, false)], ["★ Spotlight", () => { const p = PAIRS[q.pid] || { st: "?", names: [] }; spotlight(Object.assign({ pid: q.pid }, p), "Our question", q.text); }]]
          .forEach(([l, f]) => { const b = el("button", "btn ghost", l); b.type = "button"; b.onclick = f; acts.appendChild(b); });
        list.appendChild(it);
      });
    } else {
      if (!ss.length) { body.innerHTML = '<p class="vn">When a pair presses “Suggest a change”, it appears here. Your answer pops up on their laptop, and the observers see it (3C.3).</p>'; return; }
      const list = el("div", "vlist"); body.appendChild(list);
      ss.forEach(s => {
        const it = el("div", "vitem" + (s.status === "yes" ? " yes" : s.status === "no" ? " no" : ""), '<div class="meta">Station ' + esc(stOf(s.pid)) + ' · ' + clock(s.at) + (s.status === "yes" ? " · you said YES" : s.status === "no" ? " · not this time" : " · new") + '</div>' + esc(s.text) + '<div class="acts"></div>');
        const acts = it.querySelector(".acts");
        [["Yes, do it", "yes"], ["Not this time", "no"]].forEach(([l, st]) => {
          const b = el("button", "btn " + (st === "yes" ? "g" : "ghost"), l); b.type = "button";
          b.onclick = () => { LS.setSuggestion(s.id, st); LS.logEvent("suggestion", { sid: s.id, status: st, pid: s.pid, st: stOf(s.pid), n: cur() }); };
          acts.appendChild(b);
        });
        list.appendChild(it);
      });
    }
  }

  /* ───────── live targets + log ───────── */
  function paintTargets() {
    const box = $("#targets"); if (!box) return;
    const rows = E.rubric(X()).filter(r => r.kind !== "evidence");
    box.innerHTML = '<h3>Framework targets <small>live · counted in pairs</small></h3>' +
      rows.map(r => '<div class="targ st-' + r.status + '" title="' + esc(r.code + " " + r.name + ": " + r.detail) + '"><span class="c">' + r.code + '</span><span class="bar"><i style="width:' + (r.status === "later" ? 0 : r.pct || 0) + '%"></i><u style="left:' + r.target + '%"></u></span><span class="v">' + (r.pct == null || r.status === "later" ? "–" : r.pct + "%") + '</span></div>').join("") +
      '<p class="vn" style="font-size:12px;margin:6px 0 0">Line = level-4 target (80%, or 85% for 2B.2). Grey = not measured yet. Hover a row to see what is counted.</p>';
  }
  function describe(e) {
    const s = e.n ? scr(e.n) : null;
    switch (e.kind) {
      case "session": return "New session";
      case "bell": return "Bell — the 45 minutes started";
      case "screen": return "Screen " + e.n + " · " + (s ? s.name : "");
      case "reveal": return "Revealed: " + e.what;
      case "spot": return "Spotlight: station " + e.st + " — " + (e.what || "");
      case "nudge": return "Private nudge → station " + e.st + ": " + e.text;
      case "helped": return "Helped station " + e.st;
      case "help": return "Station " + e.st + " asked for help";
      case "suggestion": return "Idea from station " + e.st + " → " + (e.status === "yes" ? "YES" : "not this time");
      case "vote": return "Rule vote opened (" + e.k + " rules)";
      case "classrule": return "Class rule chosen (station " + e.st + ")";
      case "meter": return "Meter " + e.what + ": " + e.v;
      case "timer": return "Timer " + e.action;
      case "reopen": return "Lesson re-opened";
      case "end": return "Lesson ended";
    }
    return e.kind;
  }
  function paintLog() {
    const list = E.evList(EVENTS).slice(-16).reverse();
    $("#log").innerHTML = list.length ? list.map(e => '<li><time>' + rel(e.at) + '</time><span>' + esc(describe(e)) + '</span></li>').join("") : '<li>Nothing yet.</li>';
  }
})();
