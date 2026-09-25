/* Air Watch lesson — the observers' view (read-only; never writes to the database).
   Live work of every pair, the lesson map with planned vs actual time, and the evidence
   for the Teacher Competences Framework counted from the pairs' own work. */
(function () {
  "use strict";
  const { U, LS, HW, PLAN } = window.AWL;
  const { $, esc, el } = U;
  const C = window.AW, D = window.LESSON, E = window.AWE;
  const NST = C.stations || 11;
  let ST = {}, PAIRS = {}, QS = {}, SUGG = {}, FB = {}, VOTES = {}, EVENTS = {}, HOMEWORK = {};
  let connected = null;
  const X = () => ({ state: ST, pairs: PAIRS, questions: QS, sugg: SUGG, feedback: FB, votes: VOTES, events: EVENTS, homework: HOMEWORK, talk: talkPct() });
  const clock = ts => { if (!ts) return ""; const d = new Date(ts); return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); };

  /* optional talk-time tally — stays in this browser only */
  let TALK = { t: 0, s: 0, mode: "", since: 0 };
  try { TALK = Object.assign(TALK, JSON.parse(localStorage.getItem("aw_obs_talk") || "{}")); } catch (e) {}
  const saveTalk = () => { try { localStorage.setItem("aw_obs_talk", JSON.stringify(TALK)); } catch (e) {} };
  function talkNow() { const x = { t: TALK.t, s: TALK.s }; if (TALK.mode && TALK.since) x[TALK.mode] += Date.now() - TALK.since; return x; }
  function talkPct() { const x = talkNow(), tot = x.t + x.s; return tot >= 60000 ? Math.round(100 * x.s / tot) : null; }

  $("#app").innerHTML =
    '<div class="ohead"><div class="bq">' + esc(D.bigQ) + '</div><div class="ostat"><div>Lesson<b id="oel">–:–</b></div><div>Screen<b id="osc">–</b></div><div>Timer<b id="otm">–:–</b></div><div>Pairs<b id="opn">–</b></div><div>Students<b id="osn">–</b></div></div></div>' +
    '<div class="omap" id="omap"></div>' +
    '<div class="ogrid"><div>' +
      '<div class="card"><h3 id="lwh">Live work</h3><div class="pairs" id="opairs"></div></div>' +
      '<div class="card"><h3>Student voice <small class="vn">questions · ideas to change a task · peer feedback · spotlights</small></h3><ul class="feed" id="feed"></ul></div>' +
    '</div><div>' +
      '<div class="card"><h3>Goals — measured as the lesson goes <small class="vn">finished screens · % of pairs meeting each check</small></h3><div id="ogoals"></div></div>' +
      '<div class="card"><h3>Evidence for the Teacher Competences Framework <small class="vn">counted live from the pairs’ work · 1 pair = 2 students</small></h3><div id="rub"></div></div>' +
      '<div class="card"><h3>Checks for understanding <small class="vn">auto-marked · % of pairs right</small></h3><div id="chk"></div></div>' +
      '<div class="card"><h3>Talk-time tally <small class="vn">optional · for your own notes · stays on this laptop</small></h3><div id="talk"></div></div>' +
      '<div class="card"><h3>The lesson in brief</h3><div id="about" class="vn" style="font-size:14px"></div></div>' +
    '</div></div>';

  /* ───────── header, map ───────── */
  function tick() {
    const t = LS.now(), T = U.timer(ST, t), L = E.pairs(PAIRS), n = ST.screen || 1, s = D.screens[n - 1];
    $("#oel").textContent = ST.startedAt ? U.mmss((ST.live === false && ST.endedAt ? ST.endedAt : t) - ST.startedAt) + " / 45:00" : "not started";
    $("#osc").textContent = ST.reset ? n + " · " + s.phase : "–";
    $("#otm").textContent = T && ST.startedAt ? (T.paused ? "❚❚ " : "") + U.mmss(Math.max(0, T.left)) : "–:–";
    $("#opn").textContent = L.length + " / " + NST;
    $("#osn").textContent = L.reduce((a, p) => a + p.names.length, 0);
    if (TALK.mode) paintTalk();
  }
  setInterval(tick, 500);
  function paintMap() {
    const spent = PLAN.spent(EVENTS, ST, LS.now()), n = ST.screen || 1;
    let total = 0;
    $("#omap").innerHTML = D.screens.map(s => {
      const ms = spent[s.n], diff = ms != null ? ms - s.min * 60000 : null, isCur = s.n === n && ST.startedAt && ST.live !== false;
      if (ms) total += ms;
      const mark = ms == null || isCur ? "" : diff > 30000 ? ' <em class="ovr">+' + U.mmss(diff) + '</em>' : diff < -30000 ? ' <em class="und">−' + U.mmss(-diff) + '</em>' : " ✓";
      return '<div class="ph-' + s.phase.toLowerCase() + (isCur ? " cur" : "") + '"><b>' + s.n + " · " + esc(s.name) + '</b><span>' + esc(s.phase) + " · plan " + s.min + "′ (from " + PLAN.startOf(s.n) + "′)</span><br><span>" + (ms != null ? "actual " + U.mmss(ms) + mark : "&nbsp;") + "</span></div>";
    }).join("");
  }

  /* ───────── live work ───────── */
  function paintPairs() {
    const n = ST.screen || 1, L = E.pairs(PAIRS), t = LS.now(), s = D.screens[n - 1];
    const cx = { homework: HOMEWORK, photos: (ST.photos || []).length, ruleVote: !!(ST.ruleVote && ST.ruleVote.items) };
    $("#lwh").textContent = "Live work — screen " + n + " · " + s.name + " (" + s.phase + ")";
    const byS = {}; L.forEach(p => (byS[p.st] = byS[p.st] || []).push(p));
    const box = $("#opairs"); box.innerHTML = "";
    const stations = Array.from(new Set([...Array.from({ length: NST }, (_, i) => i + 1), ...Object.keys(byS).map(Number)])).sort((a, b) => a - b);
    stations.forEach(st => {
      if (!byS[st]) { box.appendChild(el("div", "pair empty", "Station " + st + " — not joined")); return; }
      byS[st].forEach(p => {
        const a = (p.a || {})["s" + n] || {}, pr = E.progress(n, a, cx), done = p.done && p.done[n], help = p.help, lastT = a.t || 0;
        const idle = !done && !help && ST.startedAt && ST.live !== false && t - (ST.screenAt || 0) > 60000 && t - Math.max(lastT, ST.screenAt || 0) > 90000;
        const card = el("div", "pair" + (done ? " done" : "") + (help ? " help" : "") + (idle ? " idle" : ""));
        card.innerHTML = '<div class="ph"><span class="stn">' + p.st + '</span><span class="who">' + esc(p.names.join(" & ")) + '<small>' + (lastT ? "last typed " + U.ago(t - lastT) + " ago" : "joined " + clock(p.joined)) + '</small></span>' +
          (help ? '<span class="flag hp">asked for help</span>' : done ? '<span class="flag dn">✓ done</span>' : idle ? '<span class="flag id">quiet</span>' : '') + '</div>' +
          '<div class="prog" title="' + pr.got + ' of ' + pr.of + ' parts"><i style="width:' + U.pct(pr.got, pr.of) + '%"></i></div><div class="sum">' + E.summary(n, p, cx) + '</div>';
        box.appendChild(card);
      });
    });
  }

  /* ───────── student voice feed ───────── */
  function paintFeed() {
    const stOf = pid => (PAIRS[pid] && PAIRS[pid].st) || "?";
    const items = [];
    Object.keys(QS).forEach(k => { const q = QS[k]; items.push({ at: q.at, meta: "Station " + stOf(q.pid) + " · question" + (q.ok === true ? " · on the Wonder Wall" : ""), text: q.text }); });
    Object.keys(SUGG).forEach(k => { const s = SUGG[k]; items.push({ at: s.at, meta: "Station " + stOf(s.pid) + " · idea to change a task → teacher: " + (s.status === "yes" ? "YES" : s.status === "no" ? "not this time" : "deciding…"), text: s.text }); });
    Object.keys(FB).forEach(to => { const f = FB[to]; if (!f) return; items.push({ at: f.at, meta: "Peer feedback: station " + f.fromSt + " → station " + stOf(to) + (f.ticks && f.ticks.length ? " · ticked " + f.ticks.join(", ") : ""), text: "Strength: " + f.strength + " · Question: " + f.question }); });
    E.evList(EVENTS).forEach(e => {
      if (e.kind === "spot") items.push({ at: e.at, meta: "Spotlight on the projector · station " + e.st + (e.what ? " · " + e.what : ""), text: e.text || "" });
      if (e.kind === "classrule" && ST.classRule) items.push({ at: e.at, meta: "Class rule chosen by vote", text: ST.classRule.text });
    });
    items.sort((a, b) => b.at - a.at);
    const h = items.slice(0, 50).map(i => '<li><small>' + clock(i.at) + ' · ' + esc(i.meta) + '</small>' + esc(i.text) + '</li>').join("") || '<li class="vn">Questions, ideas and peer feedback appear here as students send them.</li>';
    const f = $("#feed"); if (f.dataset.h !== h) { f.dataset.h = h; f.innerHTML = h; }
  }

  /* ───────── the three goals, measured screen by screen ───────── */
  function paintGoals() {
    const G = E.goals(X());
    const h = G.map(g => {
      const tone = E.goalTone(g.pct);
      return '<div class="goalrow"><div class="gtop"><span><span class="gtag g-' + g.k + '">' + esc(g.label) + '</span> <span class="vn" style="font-size:13px">' + esc(g.text) + '</span></span><span class="gpct">' + (g.pct == null ? "–" : g.pct + "%") + '</span></div>' +
        '<div class="gbar st-' + tone + '"><i style="width:' + (g.pct || 0) + '%"></i></div>' +
        g.checks.map(c => '<div class="gck ' + c.state + '"><span class="vn" style="font-size:11px">screen ' + c.n + '</span><span>' + esc(c.label) + (c.state === "live" ? " <i>(now)</i>" : "") + '</span><b>' + (c.state === "later" ? "–" : c.met + " / " + c.N) + '</b></div>').join("") + '</div>';
    }).join("");
    const box = $("#ogoals"); if (box.dataset.h !== h) { box.dataset.h = h; box.innerHTML = h; }
  }

  /* ───────── framework evidence ───────── */
  const stLabel = { met: "target met", near: "close to target", low: "below target so far", later: "measured later", evidence: "evidence" };
  function paintRub() {
    const rows = E.rubric(X());
    const h = rows.map(r => '<div class="rub"><div class="top"><span class="code">' + r.code + '</span><span class="nm">' + esc(r.name) + ' <span class="sttag ' + r.status + '">' + stLabel[r.status] + '</span></span><span class="pct">' + (r.kind === "evidence" ? "" : r.pct == null || r.status === "later" ? "–" : r.pct + "%") + '</span></div>' +
      (r.kind === "evidence" ? "" : '<div class="bar st-' + r.status + '"><i style="width:' + (r.status === "later" ? 0 : r.pct || 0) + '%"></i><u style="left:' + r.target + '%"></u></div>') +
      '<div class="det">' + esc(r.detail) + '</div>' +
      (r.list && r.list.length ? '<div class="lst">' + r.list.map(x => '<div>“' + esc(x.text) + '” — ' + (x.status === "yes" ? '<b class="yes">accepted</b>' : x.status === "no" ? "not this time" : "waiting") + '</div>').join("") + '</div>' : '') +
      '</div>').join("");
    const box = $("#rub"); if (box.dataset.h === h) return; box.dataset.h = h; box.innerHTML = h;
  }
  function paintChecks() {
    const rows = E.checks(PAIRS).filter(c => c.n);
    const h = rows.length ? rows.map(c => '<div class="chk"><span>' + esc(c.label) + ' <span class="vn">(' + c.n + ')</span></span><span class="bar"><i style="width:' + c.pct + '%"></i></span><b>' + c.pct + '%</b></div>').join("") : '<p class="vn" style="margin:0">Appears as pairs answer the book questions (screens 4–8).</p>';
    const box = $("#chk"); if (box.dataset.h !== h) { box.dataset.h = h; box.innerHTML = h; }
  }

  /* ───────── talk tally ───────── */
  function buildTalk() {
    $("#talk").innerHTML = '<div class="talk"><button class="btn sm ghost" type="button" data-m="t">Teacher talking</button><button class="btn sm ghost" type="button" data-m="s">Students talking</button><button class="btn sm ghost" type="button" data-m="">Pause</button><button class="btn sm ghost" type="button" id="treset">Reset</button></div>' +
      '<div class="talkbar"><i id="tbs" style="background:var(--green)"></i><i id="tbt" style="background:var(--amber)"></i></div><p class="vn" id="ttx" style="margin:0;font-size:13px"></p>';
    $("#talk").querySelectorAll("[data-m]").forEach(b => b.onclick = () => {
      const x = talkNow(); TALK.t = x.t; TALK.s = x.s; TALK.mode = b.dataset.m; TALK.since = b.dataset.m ? Date.now() : 0; saveTalk(); paintTalk(); later("rub", paintRub, 100);
    });
    const r = $("#treset");
    r.onclick = () => {
      if (!r.dataset.arm) { r.dataset.arm = "1"; r.textContent = "Click again to reset"; setTimeout(() => { delete r.dataset.arm; r.textContent = "Reset"; }, 4000); return; }
      TALK = { t: 0, s: 0, mode: "", since: 0 }; saveTalk(); delete r.dataset.arm; r.textContent = "Reset"; paintTalk(); later("rub", paintRub, 100);
    };
    paintTalk();
  }
  function paintTalk() {
    const x = talkNow(), tot = x.t + x.s;
    $("#tbs").style.width = U.pct(x.s, tot) + "%"; $("#tbt").style.width = U.pct(x.t, tot) + "%";
    $("#ttx").textContent = tot ? "Students " + U.pct(x.s, tot) + "% · teacher " + U.pct(x.t, tot) + "% of " + U.mmss(tot) + " tallied" + (TALK.mode ? " · now: " + (TALK.mode === "s" ? "students" : "teacher") : " · paused") : "Tap who is talking, and tap again when it changes. Pair talk counts as students talking.";
    $("#talk").querySelectorAll("[data-m]").forEach(b => b.classList.toggle("on", b.dataset.m === TALK.mode && !!TALK.mode));
  }

  function paintAbout() {
    const hwN = HW.list(HOMEWORK).filter(s => HW.days(s).length).length, rd = HW.readings(HOMEWORK);
    $("#about").innerHTML = '<p style="margin:0 0 6px"><b>Concept-Based Inquiry:</b> Engage → Focus → Investigate → Generalize → Transfer → Reflect, in 9 timed screens (44 minutes + 1 to close). Pairs share one laptop; Pilot and Navigator swap at every screen.</p>' +
      '<p style="margin:0 0 6px"><b>Goals shown to students:</b></p><ul class="glist" style="margin:0 0 6px">' + D.goals.map(g => '<li><span class="gtag g-' + g.k + '">' + esc(g.short) + '</span> ' + esc(g.text) + '</li>').join("") + '</ul>' +
      '<p style="margin:0"><b>Input:</b> each student’s own 7-day Air Watch (' + hwN + ' students, ' + rd + ' readings) and a live PM2.5 meter at the jar. Book pages 30–34 are used in class; page 35 and the page-36 self-assessment are in the next lesson (E12).</p>';
  }

  /* ───────── wiring ───────── */
  const queued = {};
  function later(name, fn, ms) { if (queued[name]) return; queued[name] = setTimeout(() => { queued[name] = null; try { fn(); } catch (e) { console.error(e); } }, ms || 200); }
  function paintLive() {
    const lv = $("#live"), tx = $("#livetx");
    lv.classList.toggle("on", LS.available() && connected !== false);
    lv.classList.toggle("err", !LS.available() || connected === false);
    tx.textContent = !LS.available() ? "No database connection" : connected === false ? "Reconnecting…" : "Live · read-only";
  }
  buildTalk(); paintMap(); paintPairs(); paintFeed(); paintGoals(); paintRub(); paintChecks(); paintAbout(); tick();
  setInterval(() => { later("map", paintMap, 50); later("pairs", paintPairs, 50); later("rub", paintRub, 50); later("goals", paintGoals, 60); }, 5000);
  LS.watchConnected(v => { connected = v; paintLive(); });
  LS.watchState(s => { ST = s || {}; later("goals", paintGoals, 300); tick(); later("map", paintMap, 100); later("pairs", paintPairs, 100); later("rub", paintRub, 400); later("feed", paintFeed, 300); });
  LS.watchPairs(v => { PAIRS = v || {}; later("goals", paintGoals, 800); later("pairs", paintPairs, 400); later("rub", paintRub, 1000); later("chk", paintChecks, 1000); later("feed", paintFeed, 600); });
  LS.watchQuestions(v => { QS = v || {}; later("feed", paintFeed, 300); later("rub", paintRub, 1000); });
  LS.watchSuggestions(v => { SUGG = v || {}; later("feed", paintFeed, 300); later("rub", paintRub, 1000); });
  LS.watchFeedback(v => { FB = v || {}; later("feed", paintFeed, 300); later("rub", paintRub, 1000); });
  LS.watchVotes(v => { VOTES = v || {}; });
  LS.watchEvents(v => { EVENTS = v || {}; later("goals", paintGoals, 600); later("map", paintMap, 300); later("feed", paintFeed, 300); later("rub", paintRub, 1000); });
  LS.watchHomework(v => { HOMEWORK = v || {}; later("about", paintAbout, 300); later("rub", paintRub, 1000); later("pairs", paintPairs, 400); });
  paintLive();
})();
