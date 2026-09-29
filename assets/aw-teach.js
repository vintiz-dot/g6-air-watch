/* Air Watch lesson — the teacher's private view (laptop screen). PIN-gated.
   Runs the screens and timers, reveals answers, spotlights work on the projector,
   sends private nudges, answers student ideas, and shows live targets. */
(function () {
  "use strict";
  const { U, LS, HW, PLAN } = window.AWL;
  const { $, $$, esc, txt, el } = U;
  const C = window.AW, D = window.LESSON, CAT = window.AW_CAT, E = window.AWE;
  const NST = C.stations || 11;

  let ST = {}, PAIRS = {}, QS = {}, SUGG = {}, FB = {}, VOTES = {}, METER = {}, EVENTS = {}, HOMEWORK = {}, HWCFG = {}, FLAGS = {}, PRES = {};
  let connected = null, builtFor = null, sessMode = null, projWin = null;
  const TID = Math.random().toString(36).slice(2);
  let BC = null; try { BC = new BroadcastChannel("aw_remote"); } catch (e) { BC = null; }
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
          '<div class="card" id="scrCard"><h3>Screens <small>44 min + 1 to close = 45</small></h3><div class="steps" id="steps"></div><div class="stepnow" id="stepNow"></div><div class="tctrl" id="tctrl"></div><div class="navrow"><button class="btn ghost" id="backBtn" type="button" hidden>← Back</button><button class="btn g bigbtn" id="nextBtn" type="button" hidden></button></div></div>' +
          '<div class="card showcard" id="showCard"></div>' +
          '<div class="card" id="run"></div>' +
        '</div>' +
        '<div class="tmid"><div class="card"><div class="pairhead" id="phead"></div><div class="pairs" id="pairs"></div></div></div>' +
        '<div class="tright">' +
          '<div class="card" id="goalsCard"></div>' +
          '<div class="card" id="voice"></div>' +
          '<div class="card" id="targets"></div>' +
          '<div class="card"><h3>Log <small>the observers see this too</small></h3><ul class="log" id="log"></ul></div>' +
        '</div>' +
      '</div>';
    $("#openProj").onclick = () => { projWin = window.open("projector.html", "aw_projector", "popup=yes,width=1280,height=720"); later("sess", paintSessionDyn, 500); };
    $("#openObs").onclick = () => window.open("observer.html", "_blank");
    document.addEventListener("keydown", keys);
    /* keys pressed on the projector window come here: only the teacher window used last acts on them */
    const fromProj = d => {
      if (!d || d.aw !== "remote") return;
      let act = null; try { act = localStorage.getItem("aw_teach_active"); } catch (e) {}
      if (act && act !== TID) return;
      remote(d.key, d.to);
    };
    if (BC) BC.onmessage = ev => fromProj(ev.data);
    window.addEventListener("message", ev => { if (ev.origin === location.origin) fromProj(ev.data); });
    const claim = () => { try { localStorage.setItem("aw_teach_active", TID); } catch (e) {} };
    window.addEventListener("focus", claim); document.addEventListener("pointerdown", claim, true); claim();
    const fit = () => {
      const wide = window.innerWidth >= 1281;
      document.body.classList.toggle("cockpit", wide);
      if (wide) document.documentElement.style.setProperty("--colH", Math.max(320, window.innerHeight - $("#bar").offsetHeight - 12) + "px");
    };
    window.addEventListener("resize", fit); fit(); setTimeout(fit, 400);
    $("#spotOff").onclick = () => LS.setState({ spot: null });
    setInterval(tick, 500);
    setInterval(() => later("pairs", paintPairs, 50), 5000);

    LS.onError(paintLive);
    LS.watchConnected(v => { connected = v; paintLive(); later("sess", paintSessionDyn, 200); });
    LS.watchState(s => { ST = s || {}; onState(); later("goals", paintGoals, 300); });
    LS.watchPairs(v => { PAIRS = v || {}; later("show", paintShow, 250); later("goals", paintGoals, 800); later("pairs", paintPairs, 250); later("run", paintRunLive, 300); later("rules", paintRules, 300); later("targets", paintTargets, 900); later("sess", paintSessionDyn, 400); });
    LS.watchQuestions(v => { QS = v || {}; later("show", paintShow, 150); later("voice", paintVoice, 200); later("targets", paintTargets, 900); later("run", paintRunLive, 300); });
    LS.watchSuggestions(v => { SUGG = v || {}; later("voice", paintVoice, 200); later("targets", paintTargets, 900); });
    LS.watchFeedback(v => { FB = v || {}; later("run", paintRunLive, 300); later("targets", paintTargets, 900); });
    LS.watchVotes(v => { VOTES = v || {}; later("show", paintShow, 200); later("run", paintRunLive, 200); later("rules", paintRules, 200); });
    LS.watchMeter(v => { METER = v || {}; paintMeterInputs(); later("run", paintRunLive, 200); later("sess", paintSessionDyn, 300); });
    LS.watchEvents(v => { EVENTS = v || {}; later("show", paintShow, 300); later("goals", paintGoals, 600); later("log", paintLog, 300); later("targets", paintTargets, 900); });
    LS.watchHomework(v => { HOMEWORK = v || {}; later("photos", paintAllPhotos, 300); later("sess", paintSessionDyn, 300); later("pairs", paintPairs, 300); later("run", paintRunLive, 300); });
    LS.watchHomeworkConfig(v => { HWCFG = v || {}; later("sess", paintSessionDyn, 300); });
    LS.watchPhotoFlags(v => { FLAGS = v || {}; later("photos", paintAllPhotos, 300); });
    LS.watchPresence(v => { PRES = v || {}; later("pairs", paintPairs, 150); setTimeout(() => later("pairs", paintPairs, 50), 5200); });
    paintLive();
  }

  function paintLive() {
    const lv = $("#live"), tx = $("#livetx"), err = LS.lastError();
    lv.classList.toggle("on", LS.available() && connected !== false && !err);
    lv.classList.toggle("err", !!err || !LS.available() || connected === false);
    tx.textContent = err ? "Not saving — " + err : !LS.available() ? "No database — check firebase-config.js (check.html)" : connected === false ? "Reconnecting…" : "Live · room " + (C.lessonRoom || "G6W6");
  }

  function onState() {
    const so = $("#spotOff"); if (so) so.hidden = !ST.spot;
    if (LOC.reset !== ST.reset) { LOC = { reset: ST.reset, tab: LOC.tab }; saveLoc(); }
    paintSession();
    paintSteps();
    const key = (ST.reset || "") + ":" + cur();
    if (builtFor !== key) { builtFor = key; buildRun(); buildShow(); const tl = $(".tleft"); if (tl && document.body.classList.contains("cockpit")) tl.scrollTop = 0; }
    else { paintShow(); paintRunLive(); paintRules(); paintAllPhotos(); paintSpotCtl(); }
    const bb = $("#blankB"); if (bb) bb.hidden = !ST.blank;
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
    if (mode !== sessMode) {
      sessMode = mode; buildSession(mode);
      /* while the lesson runs, "Show on the projector" leads the column and the session card goes to the bottom */
      const tl = $(".tleft");
      if (tl) (mode === "running" ? ["showCard", "scrCard", "run", "sess"] : ["sess", "scrCard", "showCard", "run"]).forEach(id => { const e = document.getElementById(id); if (e) tl.appendChild(e); });
    }
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
        '<button class="btn g bigbtn" id="bellBtn" type="button" style="margin:0 0 8px">▶ Bell — start the 45 minutes</button><div id="setupRows"></div><div class="checkrow lockrow" id="lockRow"></div>' +
        '<details class="setupbox"><summary><b>Photos for screen 2</b> <span class="vn" id="phCount"></span></summary><div class="photobox" id="setupPhotos"></div></details>' +
        '<details class="setupbox"><summary><b>PM2.5 meter (screen 3)</b></summary><div class="meterbox" id="setupMeter"></div></details>' +
        '<div class="btns"><button class="btn sm ghost danger" id="newS" type="button"></button></div>';
      $("#bellBtn").onclick = () => LS.bell(scr(1).min);
      confirmBtn($("#newS"), "New session (clears all answers)", "Click again — this clears everything", newSession);
      mountPhotos($("#setupPhotos")); mountMeter($("#setupMeter"), "s");
      return;
    }
    if (mode === "running") {
      s.innerHTML = '<h3>Lesson running <small id="joinedTxt"></small></h3><p class="vn" id="runTxt"></p><div class="checkrow lockrow" id="lockRow"></div><div class="btns"><button class="btn sm ghost" id="endS" type="button"></button><button class="btn sm ghost danger" id="newS" type="button"></button></div>' + packRow();
      confirmBtn($("#endS"), "End the lesson", "Click again to end", () => LS.endSession());
      bindPack();
      confirmBtn($("#newS"), "New session", "Click again — clears everything", newSession);
      return;
    }
    s.innerHTML = '<h3>Lesson ended <small id="joinedTxt"></small></h3><p class="vn">The laptops show “The lesson has finished”. All work stays saved.</p>' + packRow(true) + '<div class="btns"><button class="btn sm" id="reopen" type="button">Re-open the lesson</button><button class="btn sm ghost danger" id="newS" type="button"></button></div>';
    bindPack();
    $("#reopen").onclick = () => { LS.setState({ live: true, endedAt: null }); LS.logEvent("reopen", {}); };
    confirmBtn($("#newS"), "New session", "Click again — clears everything", newSession);
  }
  /* the print pack: every student's work on an A5 half-page, to glue into the notebook */
  function packRow(big) {
    return '<div class="packrow"><button class="btn ' + (big ? "g" : "sm ghost") + '" id="packBtn" type="button">Print pack — every student’s work (A5)</button><span class="vn" id="packMsg">' + (big ? "Two students per A4 sheet: print, cut, glue into the notebook. Save as PDF from the print window." : "") + '</span></div>';
  }
  function bindPack() {
    const b = $("#packBtn"); if (!b) return;
    b.onclick = () => {
      if (!window.AWPACK) return;
      const ok = AWPACK.open({ pairs: PAIRS, homework: HOMEWORK, feedback: FB, state: ST });
      $("#packMsg").textContent = ok ? "Opened in a new window — press Print / Save as PDF there." : "The browser blocked the new window: allow pop-ups for this page and press again.";
      LS.logEvent("pack", {});
    };
  }
  /* the laptops' lock: full screen + "Leave site?" from the bell to the end (on unless switched off) */
  function paintLock() {
    const lr = $("#lockRow"); if (!lr) return;
    const off = !!ST.lockOff, key = String(off);
    if (lr.dataset.k === key) return; lr.dataset.k = key;
    lr.innerHTML = '<span class="s ' + (off ? "warn" : "ok") + '"></span><div><b>Laptops ' + (off ? "unlocked" : "locked from the bell") + '</b><small>' +
      (off ? "No full screen and no “Leave site?” check. You still see who leaves." : "Full screen, and “Leave site?” before a tab closes. You see who leaves (red on the pair card).") + '</small></div>' +
      '<button class="btn sm ghost" type="button">' + (off ? "Lock again" : "Unlock") + '</button>';
    lr.querySelector("button").onclick = () => { LS.setState({ lockOff: off ? null : true }); LS.logEvent("lock", { on: off }); };
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
    paintLock();
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
    LS.setState({ screen: n, screenAt: t, timerEnd: ST.startedAt && ST.live !== false ? t + scr(n).min * 60000 : null, pausedLeft: null, spot: null, blank: null });
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
        '<span class="n">' + s.n + '</span><span class="mm">' + s.min + '′</span><span class="mk">' + marks(s.n) + '</span>');
      b.type = "button"; b.title = s.n + " · " + s.name + " — " + s.phase + ", " + s.min + " min, planned from " + PLAN.startOf(s.n) + "′. Show: " + seqSummary(s.n) + ". Click to open it on every laptop.";
      b.onclick = () => openScreen(s.n);
      box.appendChild(b);
    });
    const sc = scr(n);
    $("#stepNow").innerHTML = '<div class="mklegend">Under each number: <i class="m r">▶</i> reveal · <i class="m w">W</i> Wonder Wall · <i class="m s">★</i> spotlight</div>' +
      (ST.reset ? '<b>Now: ' + n + ' · ' + esc(sc.name) + '</b> <span class="vn">' + esc(sc.phase) + ' · planned ' + PLAN.startOf(n) + '′–' + (PLAN.startOf(n) + sc.min) + '′</span>' : '');
    const tc = $("#tctrl"); tc.innerHTML = "";
    if (ST.startedAt && ST.live !== false) {
      const T = U.timer(ST, now());
      [["+1 min", plus1], [T && T.paused ? "▶ Resume" : "❚❚ Pause", T && T.paused ? resume : pause], ["↺ " + scr(n).min + " min again", restart]].forEach(([l, f]) => { const b = el("button", "btn sm ghost", l); b.type = "button"; b.onclick = f; tc.appendChild(b); });
      tc.appendChild(el("span", "vn", "Keys: P pause · + one minute · Esc end the spotlight")).style.fontSize = "11px";
    }
    const bb = $("#backBtn"), pv = D.screens[n - 2];
    bb.hidden = !ST.reset || !ST.startedAt || ST.live === false || !pv;
    if (pv) { bb.textContent = "← Back to " + pv.n; bb.title = "Open screen " + pv.n + " · " + pv.name + " again"; bb.onclick = () => openScreen(pv.n); }
    const nb = $("#nextBtn"), nx = D.screens[n];
    if (!ST.reset || !ST.startedAt || ST.live === false) nb.hidden = true;
    else if (!nx) { nb.hidden = false; confirmBtn(nb, "Finish — end the lesson", "Click again to end", () => LS.endSession()); }
    else { nb.hidden = false; nb.textContent = "Next → " + nx.n + " · " + nx.name + " (" + nx.min + " min)"; nb.onclick = () => openScreen(nx.n); }
  }
  function keys(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || "", typing = /INPUT|TEXTAREA|SELECT/.test(tag), k = e.key;
    /* a presentation remote: Page Down / Page Up / Tab work even while a box has the cursor (not inside the nudge box) */
    if (k === "PageDown" || k === "PageUp" || (k === "Tab" && !e.shiftKey && !$("#pop"))) {
      e.preventDefault(); if (e.repeat) return;
      if (typing && e.target.blur) e.target.blur();
      remote(k); return;
    }
    if (typing) return;
    if (k === "b" || k === "B" || k === ".") { e.preventDefault(); if (!e.repeat) remote("blank"); return; }
    if (k === "Escape") { if (ST.spot) LS.setState({ spot: null }); closePop(); return; }
    if (!ST.startedAt || ST.live === false) return;
    if (k === "n" || k === "N") goNext();
    else if (k === "p" || k === "P") { ST.pausedLeft != null ? resume() : pause(); }
    else if (k === "+" || k === "=") plus1();
  }
  function remote(k, to) {
    if (k === "blank") {
      if (!ST.reset) { toastT("Start a session first (session card).", 0, true); return; }
      const on = to == null ? !ST.blank : !!to;
      LS.setState({ blank: on || null }); LS.logEvent("blank", { on, n: cur() }); return;
    }
    /* while the projector is blank, the first press only brings the picture back */
    if (ST.blank && (k === "PageDown" || k === "PageUp" || k === "Tab")) { LS.setState({ blank: null }); LS.logEvent("blank", { on: false, n: cur() }); toastT("Projector back on — press again to go on."); return; }
    if (k === "PageDown") goNext();
    else if (k === "PageUp") goBack();
    else if (k === "Tab") runNext();
  }
  /* the first and the last step need a second press within 4 seconds */
  let armedWhat = null, armedAt = 0;
  function armed(what) { const t = Date.now(); if (armedWhat === what && t - armedAt < 4000) { armedWhat = null; return true; } armedWhat = what; armedAt = t; return false; }
  function goNext() {
    if (!ST.reset) { toastT("Start a session first (session card).", 0, true); return; }
    if (ST.live === false) { toastT("The lesson has ended.", 0, true); return; }
    if (!ST.startedAt) { if (armed("bell")) { LS.bell(scr(1).min); hideToast(); } else toastT("Press Page Down again to ring the bell and start the 45 minutes.", 4000, true); return; }
    const nx = D.screens[cur()];
    if (nx) { openScreen(nx.n); return; }
    if (armed("end")) { LS.endSession(); hideToast(); } else toastT("This is the last screen. Press Page Down again to end the lesson.", 4000, true);
  }
  function goBack() {
    if (!ST.reset || !ST.startedAt || ST.live === false) { toastT(ST.live === false ? "The lesson has ended." : "The lesson has not started.", 0, true); return; }
    const pv = D.screens[cur() - 2]; if (pv) openScreen(pv.n); else toastT("This is screen 1 — there is no screen before it.", 0, true);
  }
  /* a message on the laptop; `proj` also shows it small on the projector (for someone holding the remote) */
  let toastT_ = null;
  function toastT(msg, ms, proj, cls) {
    const t = $("#ttoast"); if (!t) return;
    t.textContent = msg; t.className = cls || ""; t.hidden = false; t.onclick = () => { t.hidden = true; };
    clearTimeout(toastT_); toastT_ = setTimeout(() => { t.hidden = true; }, ms || 4500);
    if (proj) toProj({ aw: "hint", msg, ms: Math.min(ms || 3500, 4000) });
  }
  function hideToast() { const t = $("#ttoast"); if (t) t.hidden = true; toProj({ aw: "hint", msg: "" }); }
  function toProj(m) { try { if (BC) BC.postMessage(m); else if (projWin && !projWin.closed) projWin.postMessage(m, location.origin); } catch (e) {} }

  /* ───────── run sheet for the current screen ───────── */
  function buildRun() {
    const n = cur(), s = scr(n), r = $("#run");
    r.className = "card ph-" + s.phase.toLowerCase();
    LOC.did = LOC.did || {}; const did = LOC.did[n] = LOC.did[n] || {};
    r.innerHTML = '<h3>' + n + ' · ' + esc(s.name) + ' <small>' + esc(s.phase) + ' · ' + s.min + ' min</small></h3>' +
      '<div id="ctl"></div><div id="spotCtl"></div><div class="runlbl">Run sheet</div><ul class="script" id="script"></ul>' +
      '<div class="cut" id="cutBox"><b>If you are behind</b>' + esc(D.cut[n] || "") + '</div><div id="runLive"></div>';
    (D.script[n] || []).forEach((line, i) => {
      const li = el("li", did[i] ? "did" : "", '<input type="checkbox"' + (did[i] ? " checked" : "") + '><span>' + esc(line) + '</span>');
      li.querySelector("input").onchange = e => { did[i] = e.target.checked; li.classList.toggle("did", did[i]); saveLoc(); };
      $("#script").appendChild(li);
    });
    const ctl = $("#ctl");
    if (n === 2) { const d = el("details", "setupbox", '<summary><b>Photo game</b> <span class="vn">' + (ST.photos || []).length + ' of 3 chosen</span></summary><div class="photobox"></div>'); d.open = !(ST.photos || []).length; ctl.appendChild(d); mountPhotos(d.querySelector(".photobox")); }
    if (n === 7) ctl.appendChild(el("div", "", '<div id="ruleList"></div>'));
    paintSpotCtl();
    paintRunLive();
    paintRules();
    tick();
  }
  /* ───────── show on the projector: this screen's steps, in the order of the script ─────────
     Tab (or a remote's Tab key) runs the highlighted step · Page Down / Page Up change the screen ·
     B or . blanks the projector. The same keys pressed on the projector window are passed here. */
  const REV = {
    guess: ["Reveal the guess score", "How often our eyes were right, for the whole class"],
    photos: ["Reveal the photo numbers", "The AQI under each sky photo"],
    pred: ["Show the class predictions", "The split for both questions"],
    size: ["Show how small PM2.5 is", "The EPA hair-and-sand picture, on the laptops too"],
    sort: ["Reveal the sort answers", "✓ and ✗ on every card"],
    q1q2: ["Reveal Q1, Q2 & language answers", "Marks on the laptops, % right on the projector"],
    dbq: ["Reveal the DBQ answers", "B and D (cause and effect) for DBQ1, A for DBQ2"],
    q3: ["Reveal the Q3 answer", "A, B and C"],
    shift: ["Show before → after", "How the class answer changed since the start"],
    goals: ["Show the goals and self-ratings", "The recall count and the class ratings"]
  };
  const SEQ = {
    1: [],
    2: [["rev", "guess"], ["rev", "photos"], ["wall"], ["spot", 1], ["spot", 2]],
    3: [["rev", "pred"], ["rev", "size"], ["spot", 1]],
    4: [["rev", "sort"], ["spot", 1], ["rev", "q1q2"]],
    5: [["spot", 1]],
    6: [["rev", "dbq"], ["spot", 1]],
    7: [["spot", 1], ["spot", 2], ["spot", 3], ["vote"], ["close"], ["wall"]],
    8: [["rev", "q3"], ["spot", 1]],
    9: [["rev", "shift"], ["rev", "goals"], ["wall"], ["spot", 1]]
  };
  const SPOTWHY = { 2: "a question to investigate", 3: "explains with the meter number", 4: "names harm and amount", 5: "says what the AQI shows and hides",
    6: "a number with its source", 7: "no place name — true for any city", 8: "a reason in every part", 9: "a sharper question for E12" };
  const NOSHOW = { 1: "Nothing to show on this screen — silent start. The class vote stays hidden until screen 9." };
  const marks = n => { const q = SEQ[n] || [], has = k => q.some(x => x[0] === k);
    return (has("rev") || has("vote") ? '<i class="m r">▶</i>' : "") + (has("wall") ? '<i class="m w">W</i>' : "") + (has("spot") ? '<i class="m s">★</i>' : "") || '<i class="m">·</i>'; };
  function seqSummary(n) {
    const q = SEQ[n] || [], parts = [], spots = q.filter(x => x[0] === "spot").length;
    q.forEach(([k, a]) => { if (k === "rev") parts.push(REV[a][0].replace(/^(Reveal|Show) /, "").replace(/^the /, "")); if (k === "wall") parts.push("the Wonder Wall"); if (k === "vote") parts.push("the rule vote"); });
    if (spots) parts.push(spots === 1 ? "a spotlight" : spots + " spotlights");
    return parts.length ? parts.join(" · ") : "nothing to show";
  }
  const gc = id => (E.goalChecks.find(c => c.id === id) || {}).test || (() => null);
  const spottedOn = n => ((LOC.spotted || {})[n] || []);
  /* what is worth a spotlight on screen n: the pairs' own answers that meet the screen's check first */
  function spotCands(n) {
    const done = new Set(spottedOn(n).map(x => x.key));
    const ever = new Set(E.evList(EVENTS).filter(e => e.kind === "spot" && e.pid).map(e => e.pid));
    const out = [];
    if (n === 2 || n === 9) Object.keys(QS).forEach(id => {
      const q = QS[id]; if (!q || !txt(q.text) || q.ok === false || !!q.sharp !== (n === 9)) return;
      const p = PAIRS[q.pid]; if (!p) return;
      const good = n === 9 || !!q.starter || /measur|compar|how could we know|what if/i.test(q.text);
      out.push({ key: "q:" + id, pid: q.pid, st: p.st, kind: n === 9 ? "Our sharper question for E12" : "Our question", text: txt(q.text), why: good ? SPOTWHY[n] : "", score: (good ? 10 : 0) + (q.ok === true ? 2 : 0) });
    });
    if (n !== 2) E.pairs(PAIRS).forEach(p => {
      const a = (p.a || {})["s" + n] || {};
      if (n === 9) { if (txt(a.exit)) out.push({ key: p.pid, pid: p.pid, st: p.st, kind: "Why we need to talk about air quality", text: txt(a.exit), why: "", score: 1 }); return; }
      const sp = spotText(n, a); if (!sp) return;
      let good = false;
      if (n === 3) good = gc("s3")(a) === true;
      if (n === 4) { const r = E.frameText(D.focus.rule, a.rule, 2); good = /harm|hurt|damag|danger|bad for|sick|ill|disease/i.test(r) && /enough|amount|much|level|lot|many/i.test(r); }
      if (n === 5) good = gc("l5")(a) === true;
      if (n === 6) good = gc("l6")(a) === true;
      if (n === 7) good = gc("t7")(a) === true;
      if (n === 8) good = E.reasons(a) >= 4;
      out.push({ key: p.pid, pid: p.pid, st: p.st, kind: sp[0], text: sp[1], why: good ? SPOTWHY[n] : "", score: (good ? 10 : 0) + (n === 8 ? E.reasons(a) : 0) });
    });
    return out.filter(c => !done.has(c.key)).map(c => Object.assign(c, { score: c.score + (ever.has(c.pid) ? 0 : 2) })).sort((x, y) => y.score - x.score || x.st - y.st);
  }
  function showActions(n) {
    const out = [], cands = spotCands(n), L = E.pairs(PAIRS), N = L.length;
    let ci = 0;
    (SEQ[n] || []).forEach(([kind, arg]) => {
      if (kind === "rev") {
        const on = !!(ST.reveal && ST.reveal[arg]), [label, sub] = REV[arg];
        if (arg === "photos" && !(ST.photos || []).length) { out.push({ kind, rev: arg, label, sub: "No photos chosen — choose three in the run sheet below", state: "skip" }); return; }
        out.push({ kind, rev: arg, label, sub: on ? "On the projector now — click to hide it again" : sub, state: on ? "done" : "ready", run: () => reveal(arg, true), click: () => reveal(arg, !on) });
        return;
      }
      if (kind === "wall") {
        const sharp = n === 9, what = sharp ? "sharper question" : "question";
        const qs = Object.keys(QS).map(id => Object.assign({ id }, QS[id])).filter(q => q && txt(q.text) && !!q.sharp === sharp);
        const fresh = qs.filter(q => q.ok == null), on = qs.filter(q => q.ok === true), asked = new Set(qs.map(q => q.pid)).size;
        if (fresh.length) out.push({ kind, label: "Wonder Wall: put " + fresh.length + " new " + what + (fresh.length === 1 ? "" : "s") + " on the wall", sub: fresh.slice(0, 2).map(q => "“" + txt(q.text) + "”").join(" · ") + (fresh.length > 2 ? " …" : ""), state: "ready",
          run: () => { fresh.forEach(q => LS.flagQuestion(q.id, true)); LS.setState({ spot: null }); LS.logEvent("wall", { n, k: fresh.length }); } });
        else if (on.length) out.push({ kind, label: "Wonder Wall: " + on.length + " " + what + (on.length === 1 ? "" : "s") + " on the wall", sub: n === 7 ? "On the projector: “Which question can we answer now? Which is still open?”" : "To take one down: Wonder questions → Hide (right column)", state: "done" });
        else out.push({ kind, label: "Wonder Wall", sub: "Waiting for " + what + "s — " + asked + " of " + N + " pairs have posted", state: "wait" });
        return;
      }
      if (kind === "spot") {
        const done = spottedOn(n);
        if (done.length >= arg) { const d = done[arg - 1]; out.push({ kind, label: "★ Spotlight — station " + d.st, sub: "“" + d.text + "”", state: "done" }); return; }
        if (n === 7 && ST.ruleVote && ST.ruleVote.items) { out.push({ kind, label: "★ Spotlight", sub: "Skipped — the vote has started", state: "skip" }); return; }
        const c = cands[ci++];
        if (!c) { out.push({ kind, label: "★ Spotlight", sub: "Waiting for a pair’s answer on this screen", state: "wait" }); return; }
        out.push({ kind, cand: c, spot: true, label: "★ Spotlight station " + c.st + (c.why ? " — " + c.why : ""), sub: "“" + c.text + "”", state: "ready", run: () => spotCand(c) });
        return;
      }
      if (kind === "vote") {
        const rv = ST.ruleVote && ST.ruleVote.items ? ST.ruleVote : null;
        if (rv) { out.push({ kind, label: "Rules put to the vote (" + rv.items.length + ")", sub: rv.items.map((it, i) => "ABC"[i] + ". " + it.text).join(" · "), state: "done" }); return; }
        const picks = votePicks();
        if (!picks.length) { out.push({ kind, label: "Put three rules to the vote", sub: "Waiting for rules — " + L.filter(p => ((p.a || {}).s7 || {}).submitted).length + " of " + N + " pairs have sent one", state: "wait" }); return; }
        out.push({ kind, label: "Put " + (picks.length === 1 ? "this rule" : "these " + picks.length + " rules") + " to the vote", sub: picks.map(p => "St " + p.st + ": “" + txt(((p.a || {}).s7 || {}).rule) + "”").join(" · "), state: "ready", run: () => startVote(picks) });
        return;
      }
      if (kind === "close") {
        const rv = ST.ruleVote && ST.ruleVote.items ? ST.ruleVote : null;
        if (!rv) { out.push({ kind, label: "Close the vote → class rule", sub: "After the vote opens", state: "wait" }); return; }
        if (rv.open === false) { out.push({ kind, label: "Class rule chosen", sub: ST.classRule ? "“" + ST.classRule.text + "”" : "", state: "done" }); return; }
        const c = votesFor("rule"), tot = Object.values(c).reduce((a, v) => a + v, 0);
        out.push({ kind, label: "Close the vote → the winner is the class rule", sub: tot + " of " + N + " pairs have voted", state: "ready", run: closeVote });
      }
    });
    if (ST.spot) out.push({ kind: "clear", label: "End the spotlight", sub: "“" + (ST.spot.text || "") + "” — station " + ST.spot.st, state: "ready", run: () => LS.setState({ spot: null }) });
    return out;
  }
  function reveal(key, on) { const patch = { ["reveal/" + key]: !!on }; if (on) { patch.spot = null; patch.blank = null; } LS.setState(patch); if (on) LS.logEvent("reveal", { what: key, n: cur() }); }
  function spotCand(c) {
    const p = Object.assign({ pid: c.pid }, PAIRS[c.pid] || { st: c.st, names: [] });
    spotlight(p, c.kind, c.text, c.key);
  }
  /* the rules for the vote: the ones ticked or spotlighted first, then the best of the rest up to three
     (no place name first, one per frame) */
  function votePicks() {
    const L = E.pairs(PAIRS).filter(p => { const a = (p.a || {}).s7 || {}; return a.submitted && txt(a.rule); });
    const byPid = pid => L.find(p => p.pid === pid);
    const picks = (LOC.pick7 || []).map(byPid).filter(Boolean).slice(0, 3);
    const ranked = L.map(p => ({ p, good: gc("t7")(p.a.s7) === true ? 1 : 0, f: p.a.s7.frame || "" })).sort((x, y) => (y.good - x.good) || x.p.st - y.p.st);
    const seen = new Set(picks.map(p => p.a.s7.frame || ""));
    ranked.forEach(r => { if (picks.length < 3 && !picks.includes(r.p) && !seen.has(r.f)) { picks.push(r.p); seen.add(r.f); } });
    ranked.forEach(r => { if (picks.length < 3 && !picks.includes(r.p)) picks.push(r.p); });
    return picks;
  }
  function startVote(picks) {
    const items = picks.map(p => ({ pid: p.pid, st: p.st, text: txt(((p.a || {}).s7 || {}).rule) })).filter(x => x.text);
    if (!items.length) return;
    LS.clearVotes("rule");
    LS.setState({ ruleVote: { items, open: true, at: now() }, classRule: null, spot: null });
    LS.logEvent("vote", { n: 7, k: items.length });
  }
  /* Tab: the highlighted step */
  function runNext() {
    if (!ST.reset) { toastT("Start a session first (session card).", 0, true); return; }
    if (!ST.startedAt) { toastT("The lesson has not started: press Page Down twice to ring the bell.", 0, true); return; }
    if (ST.live === false) { toastT("The lesson has ended — the print pack is in the session card.", 0, true); return; }
    const acts = showActions(cur()), i = acts.findIndex(x => x.state === "ready" || x.state === "wait");
    if (i < 0) { const nx = D.screens[cur()]; toastT(nx ? "Nothing more to show on this screen. Page Down → " + nx.n + " · " + nx.name + "." : "Nothing more to show. Page Down twice ends the lesson.", 0, true); return; }
    const a = acts[i];
    if (a.state === "wait") { toastT(waitMsg(a), 0, true); flashRow(i); return; }
    a.run(); flashRow(i);
  }
  const waitMsg = a => /^waiting/i.test(a.sub || "") ? a.sub : "Waiting — " + (a.sub || a.label);
  function flashRow(i) { const b = document.querySelector('#shList .sact[data-i="' + i + '"]'); if (!b) return; b.classList.add("sa-flash"); setTimeout(() => b.classList.remove("sa-flash"), 900); }
  /* the panel: built when the screen changes, the list repainted as the class works */
  function buildShow() {
    const box = $("#showCard"); if (!box) return;
    const n = cur(), s = scr(n);
    box.className = "card showcard ph-" + s.phase.toLowerCase();
    box.innerHTML = '<div class="shhead"><b>Show on the projector</b><span id="shWhere"></span></div><div id="shList"></div><div id="shExtra"></div><p class="shnext" id="shNext"></p>' +
      '<p class="shkeys">Remote or keyboard: <kbd>Page Down</kbd> next screen · <kbd>Page Up</kbd> back · <kbd>Tab</kbd> the highlighted step · <kbd>B</kbd> blank the projector</p>';
    $("#shList").onclick = e => {
      const b = e.target.closest(".sact"); if (!b) return;
      const a = showActions(cur())[+b.dataset.i]; if (!a) return;
      if (ST.blank && (a.click || (a.state === "ready" && a.run))) LS.setState({ blank: null });
      if (a.click) a.click(); else if (a.state === "ready" && a.run) a.run(); else if (a.state === "wait") toastT(waitMsg(a));
      flashRow(+b.dataset.i);
    };
    /* screen 3: the meter numbers go straight onto the projector as they are typed */
    if (n === 3) { const m = el("div", "meterbox"); $("#shExtra").appendChild(m); mountMeter(m, "r"); }
    paintShow();
  }
  let lastNudge = "";
  function paintShow() {
    const box = $("#showCard"); if (!box || !$("#shList")) return;
    const n = cur(), running = ST.reset && ST.startedAt && ST.live !== false;
    $("#shWhere").textContent = "screen " + n + " · " + scr(n).name;
    const acts = showActions(n), nextI = running ? acts.findIndex(x => x.state === "ready" || x.state === "wait") : -1;
    const rows = acts.map((a, i) => '<button type="button" class="sact sa-' + a.state + (i === nextI ? " sa-next" : "") + (a.spot ? " sa-spot" : "") + '" data-i="' + i + '"' + (a.rev ? ' data-rev="' + a.rev + '"' : '') + '>' +
      '<span class="sno">' + (a.state === "done" ? "✓" : i + 1) + '</span><span class="tx"><b>' + esc(a.label) + '</b>' + (a.sub ? '<small>' + esc(a.sub) + '</small>' : '') + '</span>' +
      (i === nextI ? '<span class="kk">' + (a.state === "wait" ? "waiting" : "Tab") + '</span>' : '') + '</button>').join("");
    const html = !ST.startedAt ? '<p class="shnone">Before the bell. <kbd>Page Down</kbd> twice (or <b>▶ Bell</b> in the session card) starts the 45 minutes.</p>'
      : ST.live === false ? '<p class="shnone">The lesson has ended. The print pack is in the session card.</p>'
      : acts.length ? '<div class="shlist">' + rows + '</div>' : '<p class="shnone">' + esc(NOSHOW[n] || "Nothing to show on this screen.") + '</p>';
    const L = $("#shList"); if (L.dataset.h !== html) { L.dataset.h = html; L.innerHTML = html; }
    const nx = D.screens[n];
    $("#shNext").innerHTML = running && nx ? '<b>Next · ' + nx.n + ' ' + esc(nx.name) + ':</b> ' + esc(seqSummary(nx.n)) : '';
    /* the top bar always says what Tab or Page Down does now */
    const bn = $("#barNext");
    if (bn) {
      const a = nextI >= 0 ? acts[nextI] : null;
      bn.hidden = !ST.reset || ST.live === false;
      bn.className = "barnext" + (a && a.state === "wait" ? " wait" : a && a.spot ? " bspot" : "");
      bn.textContent = !ST.startedAt ? "Page Down twice ▸ ring the bell" : a ? (a.state === "wait" ? "Waiting · " + a.label : "Tab ▸ " + a.label) : nx ? "Page Down ▸ " + nx.n + " · " + nx.name : "Page Down twice ▸ end the lesson";
    }
    /* something worth a spotlight has just appeared: say so once */
    const a = nextI >= 0 ? acts[nextI] : null;
    if (a && a.spot && a.state === "ready") { const k = (ST.reset || "") + ":" + n + ":" + nextI; if (k !== lastNudge) { lastNudge = k; toastT("★ Ready to spotlight: station " + a.cand.st + (a.cand.why ? " — " + a.cand.why : "") + ". Press Tab (or click the amber row).", 7000, false, "tspot"); } }
  }
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
        '<b>Plans with 3+ parts:</b> ' + cnt(p => Object.values(A(p, 8).plan || {}).filter(x => txt(x)).length >= 3) + ' of ' + N + ' · <b>with a reason in every part:</b> ' + cnt(p => E.reasons(A(p, 8)) >= 4) + ' of ' + N + ' · <b>feedback sent:</b> ' + cnt(p => gave.has(p.pid)) + ' of ' + N;
    }
    if (n === 9) {
      const sh = E.shift(PAIRS);
      h = '<b>Before → now</b>' + miniBars(D.vote.opts.map(o => ({ label: o[1] + " (start " + sh.pre[o[0]] + ")", v: sh.post[o[0]], of: N, key: o[0] === "no" }))) +
        'Moved away from “yes”: ' + sh.moved + ' of ' + sh.both + '<br><b>From memory</b> — science goal got it: ' + cnt(p => (A(p, 9).rec || {}).sci === "got") + ', partly: ' + cnt(p => (A(p, 9).rec || {}).sci === "partly") +
        ' · thinking goal got it: ' + cnt(p => (A(p, 9).rec || {}).think === "got") + ', partly: ' + cnt(p => (A(p, 9).rec || {}).think === "partly") + ' (of ' + N + ') · self-rated all three: ' + cnt(p => E.arr(A(p, 9).rate).filter(r => r && r.lv).length === 3);
      const hb = L.reduce((m, p) => { const x = E.hadBoth(p); m.both += x.both; m.marked += x.marked; return m; }, { both: 0, marked: 0 });
      const stuN = L.reduce((s2, p) => s2 + p.names.length, 0);
      h += '<br><b>Hands up — had both goals in their own book:</b> ' + hb.both + ' of ' + stuN + ' students' + (hb.marked < stuN ? ' (' + hb.marked + ' marked so far)' : '') +
        ' · <b>In E12 I will…</b> ' + cnt(p => txt(A(p, 9).e12)) + ' of ' + N + ' · <b>sharper questions:</b> ' + Object.keys(QS).filter(k => QS[k] && QS[k].sharp).length;
      const typed = L.filter(p => txt(A(p, 9).memSci) || txt(A(p, 9).memThink)).sort((x, y) => x.st - y.st);
      if (typed.length) {
        const w = { got: "got it", partly: "partly", missed: "missed" };
        const one = (a, k, f) => '<span class="gtag sm g-' + k + '">' + (k === "sci" ? "S" : "T") + '</span> ' + (txt(a[f]) ? '“' + esc(txt(a[f])) + '”' : '—') + ((a.rec || {})[k] ? ' <i>' + w[a.rec[k]] + '</i>' : '');
        h += '<div class="memlist"><b>What each pair typed from memory</b>' + typed.map(p => { const a = A(p, 9);
          return '<div><b>' + p.st + '</b> ' + one(a, "sci", "memSci") + '<br>' + one(a, "think", "memThink") + '</div>'; }).join("") + '</div>';
      }
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
      box.innerHTML = '<b>' + (rv.open === false ? "Vote closed" : "Voting now") + '</b> <span class="vn">' + tot + (tot === 1 ? " vote" : " votes") + '</span>' +
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
      case 8: { const p = a.plan || {}, w = a.why || {}; const parts = D.transfer.plan.filter(([k]) => txt(p[k])).map(([k, l]) => l.split(/[?(]/)[0].replace(/ would.*| do you.*/i, "").trim() + ": " + txt(p[k]) + (txt(w[k]) ? " because " + txt(w[k]) : "")); return parts.length ? ["A fair way to measure", parts.join(" · ")] : null; }
      case 9: return txt(a.exit) ? ["Why we need to talk about air quality", txt(a.exit)] : (txt(a.sharp) && a.sharpPosted ? ["Our sharper question for E12", txt(a.sharp)] : null);
    }
    return null;
  }
  function spotlight(p, kind, text, key) {
    const names = E.arr(p.names).filter(Boolean), n = cur();
    LS.setState({ spot: { kind, text, st: p.st, names: names.join(" & "), pid: p.pid, at: now() }, blank: null });
    LS.logEvent("spot", { pid: p.pid, st: p.st, n, what: kind, text });
    LOC.spotted = LOC.spotted || {};
    const list = LOC.spotted[n] = LOC.spotted[n] || [], k = key || p.pid;
    if (!list.some(x => x.key === k)) list.push({ key: k, pid: p.pid, st: p.st, text: String(text || "").slice(0, 160) });
    if (n === 7 && ((p.a || {}).s7 || {}).submitted) { LOC.pick7 = (LOC.pick7 || []).filter(x => x !== p.pid); LOC.pick7.push(p.pid); if (LOC.pick7.length > 3) LOC.pick7.shift(); }
    saveLoc(); later("show", paintShow, 60); later("rules", paintRules, 60);
  }
  /* where a pair's laptop page is: hidden / another window / out of full screen only count after the bell */
  const AWAY = { gone: ["✕ not connected", "The lesson page closed, the laptop went to sleep, or the Wi-Fi dropped. They reopen index.html → Continue as Station."],
    closed: ["✕ tab closed", "The lesson tab was closed or reloaded. They reopen index.html → Continue as Station."],
    hidden: ["↗ other tab or app", "The lesson page is hidden: another tab or app, a minimised window, or the screen went to sleep."],
    blur: ["↗ other window", "Another window is in front of the lesson page."],
    fs: ["⛶ left full screen", "They pressed Esc. Any tap brings full screen back."] };
  function awayOf(p) {
    if (ST.live === false || !ST.reset) return null;
    const a = PRES[p.pid]; if (!a || !AWAY[a.k]) return null;
    if (!ST.startedAt && (a.k === "hidden" || a.k === "blur" || a.k === "fs")) return null;
    return a;
  }
  const awaySeen = {}; let pairsFrom = 0;
  function paintPairs() {
    const box = $("#pairs"); if (!box) return;
    if (document.querySelector("#pop")) return; /* keep the grid still while a nudge menu is open */
    const n = cur(), L = E.pairs(PAIRS), t = now(), cx = ctx();
    const sugg = new Set(); if (ST.startedAt && ST.live !== false) showActions(n).forEach(a => { if (a.spot && a.state === "ready") sugg.add(a.cand.pid); });
    const byS = {}; L.forEach(p => (byS[p.st] = byS[p.st] || []).push(p));
    const cards = [];
    for (let s = 1; s <= NST; s++) { if (!byS[s]) cards.push({ empty: s }); else byS[s].forEach(p => cards.push({ p, dup: byS[s].length > 1 })); }
    Object.keys(byS).map(Number).filter(s => s > NST).forEach(s => byS[s].forEach(p => cards.push({ p })));
    box.innerHTML = "";
    cards.forEach(c => {
      if (c.empty) { box.appendChild(el("div", "pair empty", "Station " + c.empty + " — not joined")); return; }
      const p = c.p, a = (p.a || {})["s" + n] || {}, pr = E.progress(n, a, cx);
      const done = p.done && p.done[n], help = p.help, lastT = a.t || 0, opened = ST.screenAt || 0;
      const aw = awayOf(p);
      const idle = !aw && !done && !help && ST.startedAt && ST.live !== false && t - opened > 60000 && t - Math.max(lastT, opened) > 90000;
      const card = el("div", "pair" + (done ? " done" : "") + (help ? " help" : "") + (aw ? " away" : "") + (idle ? " idle" : "") + (sugg.has(p.pid) ? " suggest" : ""));
      card.innerHTML = '<div class="ph"><span class="stn">' + p.st + '</span><span class="who">' + esc(p.names.join(" & ")) + '<small>' + (c.dup ? "⚠ two laptops on station " + p.st : lastT ? "last typed " + U.ago(t - lastT) + " ago" : "joined " + clock(p.joined)) + '</small></span>' +
        (help ? '<span class="flag hp">HELP · ' + U.ago(t - help) + '</span>' : aw ? '<span class="flag aw" title="' + esc(AWAY[aw.k][1]) + '">' + AWAY[aw.k][0] + (aw.at ? ' · ' + U.ago(t - aw.at) : '') + '</span>' : sugg.has(p.pid) ? '<span class="flag sg">★ spotlight?</span>' : done ? '<span class="flag dn">✓ done</span>' : idle ? '<span class="flag id">quiet</span>' : '') + '</div>' +
        (aw && help ? '<div class="awline">' + AWAY[aw.k][0] + (aw.at ? ' · ' + U.ago(t - aw.at) : '') + '</div>' : '') +
        '<div class="prog" title="' + pr.got + ' of ' + pr.of + ' parts"><i style="width:' + U.pct(pr.got, pr.of) + '%"></i></div>' +
        '<div class="sum">' + E.summary(n, p, cx) + '</div>' +
        (ST.startedAt ? '<div class="pg">' + E.pairGoals(p, ST).map(x => x.of ? '<span class="gtag sm g-' + x.k + '" title="' + esc(x.short) + ' checks met so far">' + esc(x.short[0]) + ' ' + x.met + '/' + x.of + '</span>' : '').join("") + '</div>' : '') +
        '<div class="acts"></div>';
      const acts = card.querySelector(".acts");
      const nb = el("button", "btn ghost", "Nudge ▾"); nb.type = "button"; nb.onclick = ev => { ev.stopPropagation(); nudgeMenu(nb, p); }; acts.appendChild(nb);
      const sp = spotText(n, a);
      const sb = el("button", "btn " + (sugg.has(p.pid) ? "sgb" : "ghost"), "★ Spotlight"); sb.type = "button"; sb.disabled = !sp; if (sp) sb.title = sp[1];
      sb.onclick = () => sp && spotlight(p, sp[0], sp[1]); acts.appendChild(sb);
      if (help) { const hb = el("button", "btn g", "✓ Helped"); hb.type = "button"; hb.onclick = () => { LS.setHelp(p.pid, false); LS.logEvent("helped", { pid: p.pid, st: p.st, n }); }; acts.appendChild(hb); }
      box.appendChild(card);
    });
    const doneN = L.filter(p => p.done && p.done[n]).length, helpN = L.filter(p => p.help).length, awayL = L.filter(p => awayOf(p));
    $("#phead").innerHTML = '<b>Pairs · screen ' + n + '</b><span>' + L.length + ' of ' + NST + ' stations · ' + L.reduce((s, p) => s + p.names.length, 0) + ' students</span><span>done ' + doneN + ' of ' + L.length + '</span>' +
      (helpN ? '<span style="color:var(--crimson);font-weight:700">help ' + helpN + '</span>' : '') +
      (awayL.length ? '<span style="color:var(--crimson);font-weight:700" title="Stations whose lesson page is closed, hidden or out of full screen">away ' + awayL.length + ' (st ' + awayL.map(p => p.st).join(", ") + ')</span>' : '') + '<span>“quiet” = nothing typed for 90 s</span>';
    /* someone has been away for 5 seconds: say so once */
    if (!pairsFrom) pairsFrom = t;
    awayL.forEach(p => { const a = awayOf(p); if (a.at && a.at >= pairsFrom - 5000 && t - a.at >= 5000 && awaySeen[p.pid] !== a.k + a.at) { awaySeen[p.pid] = a.k + a.at; toastT("Station " + p.st + " (" + p.names.join(" & ") + "): " + AWAY[a.k][0].replace(/^\S+ /, ""), 6000, false, "taway"); } });
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
        const it = el("div", "vitem" + (q.ok === true ? " ok" : q.ok === false ? " hid" : ""), '<div class="meta">Station ' + esc(stOf(q.pid)) + ' · ' + clock(q.at) + (q.sharp ? " · sharper question (screen 9)" : "") + (q.ok === true ? " · on the wall" : q.ok === false ? " · hidden" : " · new") + '</div>' + esc(q.text) + '<div class="acts"></div>');
        const acts = it.querySelector(".acts");
        [["✓ Wall", () => LS.flagQuestion(q.id, true)], ["Hide", () => LS.flagQuestion(q.id, false)], ["★ Spotlight", () => { const p = PAIRS[q.pid] || { st: "?", names: [] }; spotlight(Object.assign({ pid: q.pid }, p), q.sharp ? "Our sharper question for E12" : "Our question", q.text, "q:" + q.id); }]]
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

  /* ───────── the three goals, measured as the lesson goes ───────── */
  function paintGoals() {
    const box = $("#goalsCard"); if (!box) return;
    const G = E.goals(X());
    const det = box.querySelector("details"); if (det) LOC.gdet = det.open;
    const h = '<h3>Goals — measured as we go <small>class · finished screens</small></h3>' + G.map(g => {
      const tone = E.goalTone(g.pct);
      return '<div class="goalrow"><div class="gtop"><span class="gtag g-' + g.k + '" title="' + esc(g.text) + '">' + esc(g.short) + '</span><span class="gpct">' + (g.pct == null ? "–" : g.pct + "%") + '</span></div>' +
        '<div class="gbar st-' + tone + '"><i style="width:' + (g.pct || 0) + '%"></i></div>' +
        '<div class="gmeta">' + g.closed + ' of ' + g.checks.length + ' checks done' + (g.live ? ' · on this screen now: ' + g.livePct + '%' : '') + '</div></div>';
    }).join("") +
      '<details class="gdet"' + (LOC.gdet ? " open" : "") + '><summary>Every check (pairs who met it)</summary>' +
      G.map(g => g.checks.map(c => '<div class="gck ' + c.state + '"><span class="gtag sm g-' + g.k + '">' + esc(g.short[0]) + '</span><span>' + c.n + ' · ' + esc(c.label) + '</span><b>' + (c.state === "later" ? "–" : c.met + "/" + c.N) + '</b></div>').join("")).join("") + '</details>';
    if (box.dataset.h === h) return; box.dataset.h = h; box.innerHTML = h;
    box.querySelector("details").ontoggle = e => { LOC.gdet = e.target.open; saveLoc(); };
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
      case "pack": return "Print pack opened";
      case "wall": return "Wonder Wall: " + e.k + " question" + (e.k === 1 ? "" : "s") + " put up";
      case "blank": return e.on ? "Projector blanked" : "Projector back on";
      case "lock": return e.on ? "Laptops locked (full screen + leave check)" : "Laptops unlocked";
    }
    return e.kind;
  }
  function paintLog() {
    const list = E.evList(EVENTS).slice(-16).reverse();
    $("#log").innerHTML = list.length ? list.map(e => '<li><time>' + rel(e.at) + '</time><span>' + esc(describe(e)) + '</span></li>').join("") : '<li>Nothing yet.</li>';
  }
})();
