/* Air Watch — teacher view of the 7-day homework log. */
(function () {
  "use strict";
  const C = window.AW, CAT = window.AW_CAT, CATS = window.AW_CATS, PARTS = window.AW_PARTS;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const txt = v => String(v == null ? "" : v).trim();
  function el(tag, cls, html) { const d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; }
  const SKY = { clear: "Clear", hazy: "Hazy", foggy: "Foggy", rainy: "Rainy", dark: "Dark" };
  const WHAT = { rain: "Rain", wind: "Strong wind", sun: "Hot and sunny", traffic: "Heavy traffic", build: "Construction", smoke: "Smoke / burning smell", incense: "Incense / cooking smoke", weekend: "Weekend / holiday", none: "Nothing special" };
  const partName = k => k === "notshown" ? "can't tell" : ((PARTS.find(p => p.k === k) || {}).en || "?");
  const catName = k => ((CATS.find(c => c.k === k) || {}).en || "?");

  let STUDENTS = {}, CFG = {}, FLAGS = {}, SELECTED = null;
  let LOG = {}, EST = {}, META = {}, ESTAT = 0, COL = null, HIST = {}, BACK = {};
  /* is a saved number believable? (compared with the station: see assets/aw-stations.js, verdict) */
  const ctx = () => ({ log: LOG, hist: HIST, est: EST, check: C.check, now: Date.now() });
  const vOf = (s, d) => (window.AWST && s && d && d.a) ? AWST.verdict(s, d, ctx()) : { v: "none", bad: [], j: {} };
  const FNAME = { aqi: "AQI", pm25: "PM2.5", raqi: "class station AQI" };
  const BY = { live: "the station when it was saved", record: "the station record", est: "the model estimate" };

  /* ───────── PIN ───────── */
  function gate() {
    const app = $("#app");
    let okd = false; try { okd = sessionStorage.getItem("aw_t") === "1"; } catch (e) {}
    if (okd) return start();
    app.innerHTML = '<div class="card" style="max-width:420px;margin:40px auto"><div class="eyebrow">Teacher only</div><h2 style="font-size:22px">Enter your PIN</h2>' +
      '<label for="pin">PIN</label><input id="pin" type="password" inputmode="numeric" autocomplete="off"><div class="err" id="pe"></div>' +
      '<div class="btns"><button class="btn" id="pb">Open</button></div></div>';
    const go = () => {
      if ($("#pin").value.trim() === String(C.teacherPin)) { try { sessionStorage.setItem("aw_t", "1"); } catch (e) {} start(); }
      else $("#pe").textContent = "That PIN is not right.";
    };
    $("#pb").onclick = go; $("#pin").onkeydown = e => { if (e.key === "Enter") go(); };
    $("#pin").focus();
  }

  /* ───────── layout ───────── */
  function start() {
    const app = $("#app");
    const base = location.href.replace(/[^/]*$/, "");
    app.innerHTML =
      '<div class="card"><div class="eyebrow">Before you send the link</div>' +
      '<div id="ready"></div>' +
      '<label>Student link (send this)</label><div class="row2"><input id="stuLink" readonly value="' + esc(base + "homework.html") + '"><div><button class="btn sm" id="copyLink">Copy link</button> <a class="btn sm ghost" href="check.html" target="_blank">Open the check page</a></div></div></div>' +

      '<div class="card"><div class="eyebrow">Class station — everyone also checks this one</div><div id="csNow"></div>' +
      '<div class="btns" style="margin-top:8px"><button class="btn sm" id="loadSt">Load live Hanoi stations</button></div><div id="stMsg" class="vn"></div><div id="stList"></div></div>' +

      '<div class="card"><div class="eyebrow">Progress</div><div id="prog"></div></div>' +
      '<div class="card" id="flagCard" hidden></div>' +
      '<div class="card" id="dupCard" hidden></div>' +
      '<div class="card"><div class="eyebrow">Every student · tap a row for the full week</div><div class="tblwrap" id="tbl"></div>' +
      '<div class="btns"><button class="btn sm" id="csv">Download all answers (CSV)</button><button class="btn sm ghost" id="json">Download a backup (JSON)</button><button class="btn sm ghost" id="clearAll">Clear the whole homework room…</button></div></div>' +
      '<div class="card" id="detail" hidden></div>' +
      '<div class="card"><div class="eyebrow">Station readings — every chosen station at all three times</div><div id="stRead"></div>' +
      '<div class="btns"><button class="btn sm" id="estNow">Fill gaps with estimates now</button><button class="btn sm ghost" id="stCsv">Download station readings (CSV)</button></div></div>' +
      '<div class="card"><div class="eyebrow">Questions for the lesson — written at home</div><div id="qList"></div></div>' +
      '<div class="card"><div class="eyebrow">Sky photos · star the ones to use in class</div><p class="vn">Photos load only when you ask, to keep this page fast.</p><div class="btns" style="margin-top:0"><button class="btn sm" id="loadPh">Load all photos</button></div><div id="phWall" style="margin-top:10px"></div></div>';

    $("#copyLink").onclick = () => { const i = $("#stuLink"); i.select(); try { navigator.clipboard.writeText(i.value); } catch (e) { document.execCommand && document.execCommand("copy"); } $("#copyLink").textContent = "Copied"; };
    $("#loadSt").onclick = loadStations;
    $("#csv").onclick = downloadCSV;
    $("#json").onclick = () => download("air-watch-backup.json", JSON.stringify(STUDENTS, null, 1), "application/json");
    $("#loadPh").onclick = loadPhotos;
    const ca = $("#clearAll");
    ca.onclick = () => {
      const step = +(ca.dataset.step || 0);
      if (step === 0) { ca.dataset.step = "1"; ca.textContent = "Download the CSV first. Then tap again."; return; }
      if (step === 1) { ca.dataset.step = "2"; ca.textContent = "Last chance: tap again to delete every student's week and photos."; return; }
      AWSYNC.clearAll().then(ok => { ca.dataset.step = "0"; ca.textContent = ok ? "Cleared" : "Could not clear"; });
    };

    AWSYNC.watchConfig(c => { CFG = c || {}; paintReady(); paintCS(); housekeeping(); });
    AWSYNC.watchPhotoFlags(f => { FLAGS = f || {}; paintStars(); });
    AWSYNC.watchStudents(v => { STUDENTS = v || {}; paintReady(); paintProgress(); paintTable(); paintFlags(); paintQuestions(); paintDups(); paintStations(); housekeeping(); if (SELECTED) paintDetail(SELECTED); });
    AWSYNC.watchPath("stationLog", v => { LOG = v || {}; paintStations(); recheck(); });
    AWSYNC.watchPath("stationEst", v => { EST = v || {}; paintStations(); recheck(); });
    AWSYNC.watchPath("stationHist", v => { HIST = v || {}; recheck(); });
    AWSYNC.watchPath("sentBack", v => { BACK = v || {}; paintFlags(); housekeeping(); if (SELECTED) paintDetail(SELECTED); });
    AWSYNC.watchPath("stationMeta", v => { META = v || {}; paintStations(); });
    AWSYNC.watchPath("stationEstAt", v => { ESTAT = +v || 0; paintStations(); });
    $("#estNow").onclick = () => runEstimates($("#estNow"));
    $("#stCsv").onclick = downloadStations;
    startStationJobs();
    paintReady();
  }

  function paintReady() {
    const r = $("#ready"); if (!r) return;
    const fb = AWSYNC.available();
    const cs = CFG.classStation;
    r.innerHTML =
      row(fb ? "ok" : "bad", fb ? "Firebase connected" : "Firebase not connected", fb ? "Student work arrives here live (room " + esc(AWSYNC.room) + ")." : "Check assets/firebase-config.js and the database rules — see the README.") +
      row(cs ? "ok" : "warn", cs ? "Class station: " + esc(cs.name) : "No class station yet", cs ? "Every student also records this station, so the class can compare TIME at one place." : "Choose one below before you send the link (recommended).") +
      row("ok", "Week: " + esc(C.day1) + " → Day " + C.days, "Lesson: " + esc(C.lessonLabel) + ". Students: " + Object.keys(STUDENTS).length + ".");
  }
  function row(s, b, small) { return '<div class="checkrow"><span class="s ' + s + '"></span><div><b>' + b + '</b><small>' + small + '</small></div></div>'; }

  /* ───────── class station ───────── */
  function paintCS() {
    const n = $("#csNow"); if (!n) return;
    const cs = CFG.classStation;
    n.innerHTML = cs ? '<div class="ok">Now: <b>' + esc(cs.name) + '</b>' + (cs.parts ? ' · shows ' + esc(cs.parts.join(", ")) : '') + (cs.url ? ' · <a href="' + esc(cs.url) + '" target="_blank" rel="noopener">open</a>' : '') + '</div>'
      : '<div class="note">Pick a station that updates every hour and shows several of the six parts. It will appear on every student\'s page as step 3.</div>';
  }
  function loadStations() {
    const m = $("#stMsg"); m.textContent = "Loading…";
    WAQI.stations().then(all => {
      const list = all.filter(s => s.ageH === null || s.ageH <= 72).sort((a, b) => ((a.aqi === null) - (b.aqi === null)) || a.name.localeCompare(b.name));
      const hl = all.map(s => ({ uid: s.uid, aqi: s.aqi, tms: s.time ? Date.parse(s.time) : NaN }));
      const broken = s => window.AWST && AWST.isBroken({ uid: s.uid, aqi: s.aqi }, hl, C.check);
      m.textContent = list.length + " stations in the Hanoi area are updating. Check the parts before choosing.";
      const L = $("#stList"); L.innerHTML = "";
      const t = el("table", "tbl");
      t.innerHTML = "<thead><tr><th>Station</th><th>AQI now</th><th>Updated</th><th>Parts</th><th></th></tr></thead>";
      const tb = el("tbody");
      list.forEach(s => {
        const c = CAT(s.aqi);
        const tr = el("tr");
        tr.innerHTML = '<td>' + esc(s.name) + (broken(s) ? ' <span class="tag">not working now</span>' : '') + '</td><td>' + (c ? '<span class="aqi" style="background:' + c.col + ';color:' + c.ink + '">' + s.aqi + '</span>' : '–') + '</td>' +
          '<td>' + (s.ageH === null ? "?" : s.ageH <= 1 ? "this hour" : s.ageH + " h ago") + '</td><td class="pp"><button class="btn sm ghost">check</button></td><td><button class="btn sm">Use</button></td>';
        const [chk, use] = tr.querySelectorAll("button");
        chk.onclick = () => { chk.textContent = "…"; WAQI.feed(s.uid).then(f => { tr.querySelector(".pp").textContent = f.nParts + " of 6: " + PARTS.filter(p => f.parts[p.k] !== null).map(p => p.en).join(", "); }).catch(() => { chk.textContent = "failed"; }); };
        use.onclick = () => {
          use.textContent = "…";
          WAQI.feed(s.uid).then(f => f).catch(() => null).then(f => {
            const val = { uid: s.uid, name: s.name, url: (f && f.url) || WAQI.link(s.uid), parts: f ? PARTS.filter(p => f.parts[p.k] !== null).map(p => p.en) : null, at: Date.now() };
            AWSYNC.setConfig("classStation", val).then(ok => { use.textContent = ok ? "✓ chosen" : "failed"; });
          });
        };
        tb.appendChild(tr);
      });
      t.appendChild(tb); const wrap = el("div", "tblwrap"); wrap.appendChild(t); L.appendChild(wrap);
    }).catch(e => { m.textContent = "Could not load stations (" + (e && e.message ? e.message : e) + "). Check the token on the check page."; });
  }

  /* ───────── progress + table ───────── */
  const list = () => Object.keys(STUDENTS).map(code => Object.assign({ code }, STUDENTS[code])).sort((a, b) => String(a.n || "").localeCompare(String(b.n || "")));
  const daysOf = s => s.days || {};
  function rightCount(s) {
    let r = 0, n = 0;
    Object.values(daysOf(s)).forEach(d => { if (!d || !d.a) return; n++; const c = CAT(d.a.aqi); if (c && d.g && d.g.guess === c.k) r++; });
    return [r, n];
  }
  function paintProgress() {
    const p = $("#prog"); if (!p) return;
    const L = list();
    const per = []; for (let i = 1; i <= C.days; i++) per.push(L.filter(s => daysOf(s)[i]).length);
    const max = Math.max(1, L.length);
    let tr = 0, tn = 0; L.forEach(s => { const [r, n] = rightCount(s); tr += r; tn += n; });
    const photos = L.reduce((a, s) => a + Object.values(daysOf(s)).filter(d => d && d.photo).length, 0);
    p.innerHTML = '<div class="row3"><div><b style="font-size:26px">' + L.length + '</b><br><span class="vn">students joined</span></div>' +
      '<div><b style="font-size:26px">' + L.filter(s => s.sub).length + '</b><br><span class="vn">handed in</span></div>' +
      '<div><b style="font-size:26px">' + (tn ? Math.round(100 * tr / tn) + "%" : "–") + '</b><br><span class="vn">guesses by looking that were right (' + tr + '/' + tn + ') · ' + photos + ' photos</span></div></div>' +
      '<div class="bars">' + per.map(v => '<div style="height:' + Math.round(100 * v / max) + '%"><span>' + v + '</span></div>').join("") + '</div>' +
      '<div class="barlab">' + per.map((_, i) => "Day " + (i + 1)).join("</div><div>").replace(/^/, "<div>") + '</div></div>';
  }
  function chip(d, s) {
    if (!d || !d.a) return '<span class="vn">—</span>';
    const c = CAT(d.a.aqi), V = s ? vOf(s, d) : null;
    return '<span class="aqi" style="background:' + (c ? c.col : "#ccc") + ';color:' + (c ? c.ink : "#000") + '">' + d.a.aqi + '</span>' + (d.late ? '<span class="late" title="entered late">*</span>' : '') +
      (V && V.v === "bad" ? '<span class="flag" title="' + esc(badText(V)) + '">⚠</span>' : '');
  }
  function badText(V) {
    return V.bad.map(b => FNAME[b.f] + " " + b.got + " — " + (b.by === "est" ? "the estimate for that time is ≈" + b.r : (b.by === "live" ? "the station showed " : "the station record says ") + b.r)).join("; ");
  }
  function paintTable() {
    const t = $("#tbl"); if (!t) return;
    const L = list();
    if (!L.length) { t.innerHTML = '<p class="vn">No students yet. When the first student starts, they appear here within a second or two.</p>'; return; }
    let h = '<table class="tbl"><thead><tr><th>Name</th><th>Class</th><th>Station</th><th>Time</th>';
    for (let i = 1; i <= C.days; i++) h += '<th>D' + i + '</th>';
    h += '<th>Guess right</th><th>Handed in</th></tr></thead><tbody>';
    L.forEach(s => {
      const slot = (C.slots.find(x => x.k === s.slot) || {}).en || "";
      const [r, n] = rightCount(s);
      h += '<tr class="click" data-code="' + esc(s.code) + '"><td><b>' + esc(s.n) + '</b></td><td>' + esc(s.c) + '</td><td>' + esc(s.st ? s.st.name : "") + '</td><td>' + esc(slot.split(",")[0]) + '</td>';
      for (let i = 1; i <= C.days; i++) h += '<td>' + chip(daysOf(s)[i], s) + '</td>';
      h += '<td>' + (n ? r + "/" + n : "–") + '</td><td>' + (s.sub ? "✓" : "") + '</td></tr>';
    });
    h += '</tbody></table><p class="vn">* entered late (on a different day from the day it describes). ⚠ a number does not match the station — see “Numbers to check”.</p>';
    t.innerHTML = h;
    t.querySelectorAll("tr.click").forEach(tr => tr.onclick = () => { SELECTED = tr.dataset.code; paintDetail(SELECTED); $("#detail").scrollIntoView({ behavior: "smooth", block: "start" }); });
  }

  /* ───────── one student ───────── */
  function paintDetail(code) {
    const s = STUDENTS[code]; const box = $("#detail"); if (!s || !box) return;
    box.hidden = false;
    const slot = (C.slots.find(x => x.k === s.slot) || {}).en || "";
    const prev = s.stPrev ? (Array.isArray(s.stPrev) ? s.stPrev : Object.values(s.stPrev)).filter(Boolean) : [];
    const back = BACK[code] || {};
    let h = '<div class="eyebrow">' + esc(s.n) + ' · ' + esc(s.c) + ' · code ' + esc(code) + '</div>' +
      '<p style="margin:0 0 8px">Station: <b>' + esc(s.st ? s.st.name : "") + '</b> · Time: ' + esc(slot) + (s.area ? ' · Lives in ' + esc(s.area) : '') + '</p>' +
      (prev.length ? '<p class="vn" style="margin:-4px 0 8px">Changed station: ' + prev.map(p => esc(p.name || ("station " + p.uid)) + ' (until ' + esc(hhmm(p.until)) + (p.why ? ', ' + esc(p.why) : '') + ')').join(" → ") + ' → ' + esc(s.st ? s.st.name : "") + '.</p>' : '') +
      '<div class="tblwrap"><table class="tbl"><thead><tr><th>Day</th><th>Sky</th><th>Guess</th><th>AQI</th><th>PM2.5</th><th>Biggest</th><th>Updated</th><th>Class stn</th><th>Happening</th><th>Saved</th><th>Photo</th><th>Check</th></tr></thead><tbody>';
    for (let i = 1; i <= C.days; i++) {
      const d = daysOf(s)[i];
      if (!d) {
        const b = back[i];
        h += '<tr><td>' + i + '</td><td colspan="11" class="vn">' + (b && b.at ? 'sent back ' + esc(hhmm(b.at)) + ' — waiting for the student to redo it' : 'not logged') + '</td></tr>'; continue;
      }
      const c = CAT(d.a.aqi); const right = c && d.g && d.g.guess === c.k;
      const V = vOf(s, d);
      h += '<tr><td>' + i + '</td><td>' + esc(SKY[d.g.sky] || "") + '</td><td>' + esc(catName(d.g.guess)) + (right ? ' ✓' : ' ✗') + '</td><td>' + chip(d, s) + '</td>' +
        '<td>' + (d.a.pm25 === null || d.a.pm25 === undefined ? "–" : d.a.pm25) + '</td><td>' + esc(partName(d.a.big)) + '</td><td>' + esc(d.a.upd || "") + '</td>' +
        '<td>' + (d.ref ? (d.ref.nodata ? "no data" : d.ref.aqi) : "–") + '</td><td>' + esc((d.what || []).map(k => WHAT[k] || k).join(", ")) + (d.note ? '<br><i>' + esc(d.note) + '</i>' : '') + '</td>' +
        '<td>' + new Date(d.at).toLocaleString("en-GB", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) + (d.late ? ' <span class="late">late</span>' : '') + '</td>' +
        '<td>' + (d.photo ? '<button class="btn sm ghost" data-ph="' + i + '">show</button>' : '') + '</td>' +
        '<td>' + checkCell(V) + '<br><button class="btn sm ghost" data-back="' + i + '">Send back</button></td></tr>';
      if (d.six) h += '<tr><td></td><td colspan="11" class="vn">Six parts: ' + PARTS.map(p => esc(p.en) + ' ' + (d.six[p.k] === null ? '–' : d.six[p.k])).join(' · ') + '</td></tr>';
    }
    h += '</tbody></table></div><p class="vn">Check: ✓ matches the station · ≈ close enough to the model estimate (no station reading for that time) · ? nothing to compare with yet · ⚠ does not match. <b>Send back</b> reopens the day on the student’s page (their guess and notes stay; they type the numbers again and the page checks them).</p>';
    if (s.q && txt(s.q.t)) h += '<div class="ok" style="background:var(--soft);color:var(--text)"><b>Question for the lesson:</b> ' + esc(txt(s.q.t)) + '</div>';
    if (s.refl && (s.refl.why || s.refl.look)) h += '<div class="ok" style="background:var(--soft);color:var(--text)"><b>Look back:</b> worst day ' + esc(s.refl.worst || "?") + ' — “' + esc(s.refl.why || "") + '”<br>“' + esc(s.refl.look || "") + '”</div>';
    h += '<div id="dPh" class="pgrid" style="margin-top:10px"></div>' +
      '<div class="btns"><button class="btn sm ghost" id="rm">Remove this student (test entries)</button><button class="btn sm ghost" id="cl">Close</button></div>';
    box.innerHTML = h;
    box.querySelectorAll("[data-ph]").forEach(b => b.onclick = () => showPhoto(code, +b.dataset.ph, $("#dPh")));
    box.querySelectorAll("[data-back]").forEach(b => b.onclick = () => armBack(b, code, +b.dataset.back));
    $("#cl").onclick = () => { SELECTED = null; box.hidden = true; };
    const rm = $("#rm");
    rm.onclick = () => {
      if (rm.dataset.arm !== "1") { rm.dataset.arm = "1"; rm.textContent = "Tap again to remove " + (s.n || code); return; }
      AWSYNC.removeStudent(code).then(() => { SELECTED = null; box.hidden = true; });
    };
  }
  function checkCell(V) {
    const j = V.j || {};
    if (V.v === "bad") return '<span class="ckc bad" title="' + esc(badText(V)) + '">⚠ ' + esc(V.bad.map(b => FNAME[b.f] + " " + b.got + " vs " + (b.by === "est" ? "≈" : "") + b.r).join(", ")) + '</span>';
    if (V.v === "ok") return '<span class="ckc good" title="' + esc("Matches " + (BY[V.by] || "the station")) + '">' + (V.by === "est" ? "≈ plausible" : "✓ station") + '</span>';
    return '<span class="ckc" title="No station reading or estimate for that time yet">? not checked</span>';
  }
  /* two taps: send the day back so the student redoes it (the guess and notes stay) */
  function armBack(b, code, n) {
    if (b.dataset.arm !== "1") { b.dataset.arm = "1"; b.textContent = "Tap again to send back"; return; }
    b.disabled = true; b.textContent = "Sending…";
    sendBack(code, n).then(ok => { b.textContent = ok ? "Sent back ✓" : "Could not send"; });
  }
  function sendBack(code, n) {
    const s = STUDENTS[code] || {}, d = daysOf(s)[n];
    if (!d) return Promise.resolve(false);
    const was = { aqi: d.a ? d.a.aqi : null, pm25: d.a ? d.a.pm25 : null, raqi: d.ref ? d.ref.aqi : null, date: d.date || null, at: d.at || null };
    return AWSYNC.setPath("sentBack/" + code + "/" + n, { at: Date.now(), why: "numbers", was })
      .then(ok => ok ? AWSYNC.setPath("students/" + code + "/days/" + n, null) : false);
  }
  /* every day with a number that does not match its station, and days sent back and not yet redone */
  function paintFlags() {
    const box = $("#flagCard"); if (!box || !window.AWST) return;
    const rows = [], waiting = [];
    list().forEach(s => {
      for (let i = 1; i <= C.days; i++) {
        const d = daysOf(s)[i];
        if (d) { const V = vOf(s, d); if (V.v === "bad") rows.push({ s, i, d, V }); }
        else { const b = (BACK[s.code] || {})[i]; if (b && b.at) waiting.push({ s, i, b }); }
      }
    });
    box.hidden = !rows.length && !waiting.length;
    if (box.hidden) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="eyebrow">Numbers to check</div>' +
      (rows.length ? '<p class="vn" style="margin:0 0 6px">These saved days have a number that does not match the station at that time (a wrong station, a typing mistake, or a made-up number). <b>Send back</b> reopens the day for the student — their guess and notes stay, and their page checks the new numbers.</p>' +
        rows.map((r, k) => '<div class="flagrow"><div><b>' + esc(r.s.n) + '</b> · ' + esc(r.s.c) + ' · Day ' + r.i + ' (' + esc(r.d.date || "") + ')' + (r.d.late ? ' <span class="late">late</span>' : '') +
          '<small>' + esc(badText(r.V)) + '</small></div><button class="btn sm" data-k="' + k + '">Send back</button></div>').join("") : '') +
      (waiting.length ? '<p class="vn" style="margin:10px 0 4px"><b>Sent back, waiting for the student:</b> ' + waiting.map(w => esc(w.s.n) + ' Day ' + w.i + ' (' + esc(hhmm(w.b.at)) + ')').join(" · ") + '</p>' : '');
    box.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { const r = rows[+b.dataset.k]; armBack(b, r.s.code, r.i); });
  }
  let reT = null;
  function recheck() { clearTimeout(reT); reT = setTimeout(() => { paintTable(); paintFlags(); if (SELECTED) paintDetail(SELECTED); }, 700); }

  /* ───────── station readings: collect, share classmates' readings, estimate the gaps ───────── */
  const fetchFn = (u, o) => fetch(u, o);
  let houseT = null;
  function housekeeping() {
    clearTimeout(houseT);
    houseT = setTimeout(() => {
      const db = AWSYNC.stationDb(); if (!db || !window.AWST) return;
      AWST.syncMeta({ db, students: STUDENTS, cfg: CFG })
        .then(() => AWST.syncRoster({ db, students: STUDENTS }))
        .then(() => AWST.copyClassmates({ db, students: STUDENTS, log: LOG, hist: HIST, est: EST, check: C.check }))
        .then(() => reapplyBack())
        .catch(e => console.warn("[AW] housekeeping", e));
    }, 1500);
  }
  /* a day sent back must stay open even if an old copy of the student's page saves it again */
  function reapplyBack() {
    const jobs = [];
    Object.keys(BACK).forEach(code => {
      const s = STUDENTS[code], b = BACK[code] || {};
      if (!s) return;
      Object.keys(b).forEach(n => { const d = daysOf(s)[n]; if (b[n] && b[n].at && d && (d.at || 0) <= b[n].at) jobs.push(AWSYNC.setPath("students/" + code + "/days/" + n, null)); });
    });
    return Promise.all(jobs);
  }
  function runCollect() {
    const db = AWSYNC.stationDb(); if (!db || !window.AWST) return Promise.resolve(null);
    return AWST.collect({ db, fetch: fetchFn, token: C.waqiToken, after: 30, src: "app", day1: C.day1, days: C.days, bounds: C.bounds, check: C.check })
      .then(r => { if (r && r.slot) { COL = Object.assign({ at: Date.now() }, r); paintStations(); } return r; }).catch(() => null);
  }
  function runEstimates(btn) {
    const db = AWSYNC.stationDb(); if (!db || !window.AWST) return Promise.resolve(null);
    if (btn) { btn.disabled = true; btn.textContent = "Working…"; }
    return AWST.estimate({ db, fetch: fetchFn, day1: C.day1, days: C.days }).then(r => {
      if (btn) { btn.disabled = false; btn.textContent = r.stations ? "Done ✓ — " + r.stations + " stations, " + r.cells + " times" : (r.failed ? "Could not reach the estimate service" : "No station locations yet — try again in a minute"); }
      return r;
    }).catch(() => { if (btn) { btn.disabled = false; btn.textContent = "Could not reach the estimate service"; } return null; });
  }
  function startStationJobs() {
    setTimeout(runCollect, 3000);
    setInterval(runCollect, 3 * 60000);
    setTimeout(() => { if (Date.now() - ESTAT > 2 * 3600e3) runEstimates(null); }, 6000);
    setInterval(() => { if (Date.now() - ESTAT > 55 * 60000) runEstimates(null); }, 10 * 60000);
  }
  const hhmm = ms => new Date(ms).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  function paintStations() {
    const box = $("#stRead"); if (!box || !window.AWST) return;
    const uids = Object.keys(META).map(k => AWST.uidOf(k)).filter(u => /^-?\d+$/.test(u));
    const now = Date.now(), win = AWST.nextWindow(now);
    let gh = 0, app = 0, cls = 0;
    Object.values(LOG).forEach(byDate => Object.values(byDate || {}).forEach(bySlot => Object.values(bySlot || {}).forEach(r => {
      if (!r) return; if (r.src === "gh") gh = Math.max(gh, r.at || 0); else if (r.src === "app") app = Math.max(app, r.at || 0); else if (r.src === "class") cls++;
    })));
    let h = row(win.open ? "ok" : "warn", win.open ? "Collecting now: " + esc(win.slot.en) + " window" : (win.tomorrow ? "Next window: tomorrow morning, 6:30" : "Next window: " + esc(win.slot.en) + ", " + fmtMin(win.slot.from)),
      "While this page is open it saves every chosen station once in each window (6:30–7:30, 16:30–17:30, 19:00–20:00). Students’ own pages help too." + (COL ? " Last check " + esc(hhmm(COL.at)) + ": " + COL.saved + " saved, " + COL.had + " already there." : "")) +
      row(gh ? "ok" : "warn", gh ? "GitHub job: last reading " + esc(hhmm(gh)) : "GitHub job: no readings yet", gh ? "Runs at about 6:50, 16:50 and 19:20 even when no page is open." : "It starts after you push .github/workflows/air-watch-readings.yml — see the README. Until then, pages save readings when they are open.") +
      row(ESTAT ? "ok" : "warn", ESTAT ? "Estimates refreshed " + esc(hhmm(ESTAT)) : "No estimates yet", "Times nobody measured are filled with a computer-model estimate (Open-Meteo, CAMS model, CC BY 4.0), always marked ≈. " + cls + " readings came from students’ own logs.");
    if (!uids.length) { box.innerHTML = h + '<p class="vn">No stations yet — they appear when students choose one.</p>'; return; }
    const ds = AWST.dates(C.day1, C.days);
    const names = k => (META[k] && META[k].name) || ("Station " + AWST.uidOf(k));
    const order = Object.keys(META).filter(k => /^s-?\d+$/.test(k)).sort((a, b) => ((META[b] || {}).cls ? 1 : 0) - ((META[a] || {}).cls ? 1 : 0) || names(a).localeCompare(names(b)));
    const cov = {}; AWST.coverage(LOG, EST, order.map(AWST.uidOf), C.day1, C.days, now).forEach(c => { cov[c.uid] = c; });
    let t = '<div class="tblwrap"><table class="tbl stcov"><thead><tr><th>Station</th>' + ds.map((d, i) => '<th title="' + esc(d) + '">D' + (i + 1) + '<br><small>M · A · E</small></th>').join("") + '<th>Real / ≈ / none</th></tr></thead><tbody>';
    order.forEach(k => {
      const uid = AWST.uidOf(k), c = cov[uid] || { real: 0, est: 0, none: 0 };
      const users = Object.values(STUDENTS).filter(s => s.st && String(s.st.uid) === uid).length;
      t += '<tr><td><b>' + esc(names(k)) + '</b>' + ((META[k] || {}).cls ? ' <span class="tag">class station</span>' : '') + '<br><small class="vn">' + users + (users === 1 ? ' student' : ' students') + ((META[k] || {}).lat == null ? ' · no location yet' : '') + '</small></td>';
      ds.forEach(d => {
        t += '<td class="dots">' + AWST.SLOTS.map(sl => {
          const x = AWST.cell(LOG, EST, uid, d, sl.k);
          if (!x) return '<i class="d0" title="' + esc(sl.en + ", " + d + ": " + (AWST.ended(d, sl, now) ? "no reading" : "later")) + '"></i>';
          const cat = CAT(x.aqi);
          return x.src === "est" ? '<i class="de" style="border-color:' + cat.col + '" title="' + esc(sl.en + ", " + d + ": ≈" + x.aqi + " (estimate)") + '"></i>'
            : '<i class="dr" style="background:' + cat.col + '" title="' + esc(sl.en + ", " + d + ": " + x.aqi + " (" + (x.src === "class" ? "a student's reading" : "station record") + ")") + '"></i>';
        }).join("") + '</td>';
      });
      t += '<td>' + c.real + ' / ' + c.est + ' / ' + c.none + '</td></tr>';
    });
    t += '</tbody></table></div><p class="vn"><i class="dr" style="background:var(--teal)"></i> real reading &nbsp; <i class="de" style="border-color:var(--teal)"></i> estimate &nbsp; <i class="d0"></i> none yet · M = morning, A = after school, E = evening. Students’ guesses, notes and photos are never filled in — only station numbers.</p>';
    box.innerHTML = h + t;
  }
  function fmtMin(m) { return Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0"); }
  function downloadStations() {
    const rows = [["station", "station_id", "date", "time_window", "aqi", "pm25", "source", "station_time"]];
    Object.keys(META).filter(k => /^s-?\d+$/.test(k)).forEach(k => {
      const uid = AWST.uidOf(k), nm = (META[k] || {}).name || "";
      AWST.dates(C.day1, C.days).forEach(d => AWST.SLOTS.forEach(sl => {
        const x = AWST.cell(LOG, EST, uid, d, sl.k); if (!x) return;
        rows.push([nm, uid, d, sl.en, x.aqi, x.pm25 == null ? "" : x.pm25, x.src === "est" ? "estimate (Open-Meteo CAMS)" : x.src === "class" ? "student reading" : "station record (aqicn.org)", x.t || ""]);
      }));
    });
    const csv = rows.map(r => r.map(v => { const x = String(v == null ? "" : v); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(",")).join("\r\n");
    download("air-watch-station-readings.csv", "﻿" + csv, "text/csv;charset=utf-8");
  }

  /* ───────── questions written at home ───────── */
  function paintQuestions() {
    const box = $("#qList"); if (!box) return;
    const L = list(), withQ = L.filter(s => s.q && txt(s.q.t).length >= 4);
    if (!withQ.length) { box.innerHTML = '<p class="vn">No questions yet. Students write one under “My question” on their homework page; it comes with them to screen 2 of the lesson.</p>'; return; }
    box.innerHTML = '<p class="vn">' + withQ.length + ' of ' + L.length + ' students have written a question.</p><ol class="qlist">' +
      withQ.sort((a, b) => String(a.c || "").localeCompare(String(b.c || "")) || String(a.n || "").localeCompare(String(b.n || ""))).map(s => '<li><b>' + esc(s.n) + '</b> <span class="vn">' + esc(s.c) + '</span><br>' + esc(txt(s.q.t)) + '</li>').join("") + '</ol>';
  }

  /* ───────── the same student twice (a new phone, a cleared browser) ───────── */
  function paintDups() {
    const box = $("#dupCard"); if (!box || !window.AWST) return;
    const groups = AWST.duplicates(STUDENTS);
    box.hidden = !groups.length;
    if (!groups.length) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="eyebrow">The same student twice?</div><p class="vn" style="margin:0 0 8px">These logs have the same name and class — usually a new phone or a cleared browser. <b>Join</b> keeps every saved day in the first log; the student’s other device switches to it by itself.</p>' +
      groups.map((g, i) => '<div class="duprow"><div>' + g.map(c => { const s = STUDENTS[c] || {}; return '<b>' + esc(s.n) + '</b> · ' + esc(s.c) + ' · code ' + esc(c) + ' · ' + Object.keys(s.days || {}).filter(k => (s.days || {})[k]).length + ' days · ' + esc(s.st ? s.st.name : "no station") + ' · started ' + (s.created ? esc(hhmm(s.created)) : "?"); }).join("<br>") + '</div><button class="btn sm" data-g="' + i + '">Join</button></div>').join("");
    box.querySelectorAll("[data-g]").forEach(b => b.onclick = () => {
      if (b.dataset.arm !== "1") { b.dataset.arm = "1"; b.textContent = "Tap again to join"; return; }
      b.disabled = true; b.textContent = "Joining…";
      joinLogs(groups[+b.dataset.g]).then(() => { b.textContent = "Joined ✓"; });
    });
  }
  function joinLogs(codes) {
    const keep = codes[0], base = STUDENTS[keep] || {};
    let days = base.days || {};
    const from = {};
    codes.slice(1).forEach(c => {
      const next = AWST.mergeDays(days, (STUDENTS[c] || {}).days || {});
      Object.keys(next).forEach(k => { if (next[k] !== days[k] && next[k] && next[k].photo) from[k] = c; });
      days = next;
    });
    const others = codes.slice(1).map(c => STUDENTS[c] || {});
    const merged = Object.assign({}, base, {
      days, up: Date.now(),
      q: base.q || (others.find(o => o.q) || {}).q || null,
      refl: base.refl && (base.refl.why || base.refl.look) ? base.refl : ((others.find(o => o.refl && (o.refl.why || o.refl.look)) || {}).refl || base.refl || {}),
      sub: !!(base.sub || others.some(o => o.sub)), subAt: Math.max(base.subAt || 0, ...others.map(o => o.subAt || 0))
    });
    return AWSYNC.saveStudent(keep, merged)
      .then(() => Promise.all(Object.keys(from).map(k => AWSYNC.copyPhotos(from[k], keep, [k]))))
      .then(() => Promise.all(codes.slice(1).map(c => AWSYNC.setPath("moved/" + c, keep).then(() => AWSYNC.removeStudent(c)))));
  }

  /* ───────── photos ───────── */
  function fig(code, day, data) {
    const s = STUDENTS[code] || {}; const d = (s.days || {})[day] || {};
    const c = d.a ? CAT(d.a.aqi) : null; const key = code + "_" + day;
    const f = el("figure");
    f.innerHTML = '<img alt="Sky photo, ' + esc(s.n) + ', day ' + day + '" src="' + data + '"><figcaption><span>' + esc(s.n || code) + ' · D' + day + ' · ' +
      (c ? '<b style="color:' + c.col + '">AQI ' + d.a.aqi + '</b>' : '') + ' · guessed ' + esc(catName(d.g && d.g.guess)) + '</span><button class="star' + (FLAGS[key] === "star" ? " on" : "") + '" data-k="' + key + '" title="Use in class">★</button></figcaption>';
    const st = f.querySelector(".star");
    st.onclick = () => { const on = FLAGS[key] === "star"; AWSYNC.setPhotoFlag(code, day, on ? null : "star"); };
    return f;
  }
  function showPhoto(code, day, into) {
    AWSYNC.getPhoto(code, day).then(p => { if (p && p.d) into.appendChild(fig(code, day, p.d)); });
  }
  function loadPhotos() {
    const wall = $("#phWall"); wall.innerHTML = ""; const g = el("div", "pgrid"); wall.appendChild(g);
    const jobs = [];
    list().forEach(s => Object.keys(daysOf(s)).forEach(k => { if (daysOf(s)[k] && daysOf(s)[k].photo) jobs.push([s.code, +k]); }));
    if (!jobs.length) { wall.innerHTML = '<p class="vn">No photos yet.</p>'; return; }
    jobs.forEach(([c, d]) => showPhoto(c, d, g));
  }
  function paintStars() { document.querySelectorAll(".star").forEach(b => b.classList.toggle("on", FLAGS[b.dataset.k] === "star")); }

  /* ───────── export ───────── */
  function downloadCSV() {
    const cols = ["code", "name", "class", "area", "station", "time_slot", "day", "date", "saved_at", "late", "sky", "guess", "aqi", "aqi_band", "guess_right", "pm25", "biggest", "page_updated", "class_aqi", "class_pm25", "happening", "note", "photo",
      "six_pm25", "six_pm10", "six_o3", "six_no2", "six_so2", "six_co", "handed_in", "worst_day_why", "looking_sentence", "question", "check", "check_detail", "sent_back"];
    const rows = [cols];
    list().forEach(s => {
      for (let i = 1; i <= C.days; i++) {
        const d = daysOf(s)[i]; if (!d) continue;
        const c = CAT(d.a.aqi), V = vOf(s, d);
        rows.push([s.code, s.n, s.c, s.area, s.st ? s.st.name : "", s.slot, i, d.date, new Date(d.at).toISOString(), d.late ? "yes" : "no", d.g.sky, d.g.guess, d.a.aqi, c ? c.k : "", c && d.g.guess === c.k ? "yes" : "no",
          d.a.pm25 == null ? "" : d.a.pm25, d.a.big, d.a.upd || "", d.ref ? d.ref.aqi : "", d.ref && d.ref.pm25 != null ? d.ref.pm25 : "", (d.what || []).join("|"), d.note || "", d.photo ? "yes" : "no",
          ...(d.six ? PARTS.map(p => d.six[p.k] == null ? "" : d.six[p.k]) : ["", "", "", "", "", ""]),
          s.sub ? "yes" : "no", s.refl ? s.refl.why || "" : "", s.refl ? s.refl.look || "" : "", s.q ? txt(s.q.t) : "",
          V.v === "bad" ? "does not match" : V.v === "ok" ? (V.by === "est" ? "plausible (estimate)" : "matches station") : "not checked", V.v === "bad" ? badText(V) : "",
          (BACK[s.code] || {})[i] ? "yes" : ""]);
      }
    });
    const csv = rows.map(r => r.map(v => { const x = String(v == null ? "" : v); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(",")).join("\r\n");
    download("air-watch-7-days.csv", "﻿" + csv, "text/csv;charset=utf-8");
  }
  function download(name, content, type) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  gate();
})();
