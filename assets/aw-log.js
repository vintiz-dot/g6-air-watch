/* My 7-Day Air Watch — student log (Grade 6, Lesson 6).
   Saves on the device as the student types, and to the teacher (Firebase)
   whenever a day is saved. */
(function () {
  "use strict";
  const C = window.AW, CAT = window.AW_CAT, CATS = window.AW_CATS, PARTS = window.AW_PARTS;
  const CK = Object.assign({ tol: 10, estLow: 0.25, estHigh: 3, estPad: 10, tries: 3, waitSec: 30, brokenShare: 0.33 }, C.check || {});
  const fetchFn = (u, o) => fetch(u, o);
  const K = "g6aw6_log";
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const txt = v => String(v == null ? "" : v).trim();
  function el(tag, cls, html) { const d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; }

  /* ───────── dates (Hanoi time) ───────── */
  function hanoiDate(d) {
    d = d || new Date();
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    } catch (e) { return new Date(d.getTime() + 7 * 36e5).toISOString().slice(0, 10); }
  }
  function dateOfDay(n) {
    const p = C.day1.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2]) + (n - 1) * 864e5).toISOString().slice(0, 10);
  }
  function pretty(iso) {
    const p = iso.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  }
  function todayIndex() {
    const t = hanoiDate();
    if (t < dateOfDay(1)) return 0;
    for (let n = 1; n <= C.days; n++) if (dateOfDay(n) === t) return n;
    return C.days + 1;
  }

  /* ───────── state ───────── */
  const BLANK = { code: "", name: "", cls: "", area: "", slot: "", st: null, stPrev: [], days: {}, drafts: {}, thumbs: {}, refl: {}, q: null, sub: false, subAt: 0, created: 0, started: false };
  const STARTERS = ["What would happen if…", "Why does… but not…?", "How could we know…?", "What if we measured…"];
  let S;
  try { S = Object.assign({}, BLANK, JSON.parse(localStorage.getItem(K) || "{}")); } catch (e) { S = Object.assign({}, BLANK); }
  S.days = S.days || {}; S.drafts = S.drafts || {}; S.thumbs = S.thumbs || {}; S.refl = S.refl || {}; S.stPrev = S.stPrev || [];
  if (!S.code) { S.code = makeCode(); S.created = Date.now(); }
  let CFG = {};
  let SEL = null;
  let stationCache = null;

  function makeCode() {
    const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = "";
    for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  }
  function saveLocal() { try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) {} }
  let pushT = null;
  function save(pushSoon) { saveLocal(); if (pushSoon) { clearTimeout(pushT); pushT = setTimeout(push, 1200); } }
  function payload() {
    return {
      n: txt(S.name), c: txt(S.cls), area: txt(S.area), slot: S.slot || "", st: S.st || null, stPrev: S.stPrev || [],
      days: S.days, refl: S.refl, q: S.q || null, sub: !!S.sub, subAt: S.subAt || 0,
      created: S.created || 0, up: Date.now(), build: C.build
    };
  }
  let rosterKey = "";
  function push() {
    if (!window.AWSYNC || !AWSYNC.available() || txt(S.name).length < 2) { paintLive(); return Promise.resolve(false); }
    const code = S.code;
    /* if the teacher joined this log with another one, carry on in that one;
       if the teacher sent a day back, reopen it before saving (so it is not sent again) */
    return Promise.all([AWSYNC.getPath("moved/" + code), AWSYNC.getPath("sentBack/" + code)]).then(([to, back]) => {
      if (to && to !== code) { loadCode(to); return false; }
      applyBack(back);
      const data = payload();
      return AWSYNC.saveStudent(code, data).then(r => {
        paintLive(r);
        if (r && window.AWST) {
          const e = AWST.rosterEntry(data); delete e.up;
          const k = JSON.stringify(e);
          if (k !== rosterKey) { rosterKey = k; quietSet("roster/" + code, Object.assign(e, { up: Date.now() })); }
          registerStation();
        }
        return r;
      });
    });
  }
  let lastPushOk = false;
  function paintLive(r) {
    if (r === true) lastPushOk = true;
    const lv = $("#live"), tx = $("#livetx");
    const err = window.AWSYNC && AWSYNC.lastError && AWSYNC.lastError();
    const on = window.AWSYNC && AWSYNC.available();
    lv.classList.toggle("on", !!on && !err && lastPushOk);
    lv.classList.toggle("err", !!err);
    tx.textContent = err ? ("Not sending to your teacher — " + err) : (on && lastPushOk) ? "Saved and sent to your teacher" : "Saved on this device";
  }

  const setupDone = () => txt(S.name).length >= 2 && txt(S.cls) && S.slot && S.st && txt(S.st.name) && S.started;
  const slotOf = k => (C.slots.find(s => s.k === k) || null);

  /* ───────── header ───────── */
  function renderHeader() {
    const h = $("#hdr");
    h.innerHTML =
      '<div class="hero"><h1>My 7-Day Air Watch</h1>' +
      '<p class="sub">Nhật ký không khí 7 ngày · Grade 6 Natural Science · Lesson 6 · Book page ' + esc(C.bookPage) +
      '<br>' + esc(pretty(dateOfDay(1))) + ' – ' + esc(pretty(dateOfDay(C.days))) + ' · We use your week in class on ' + esc(C.lessonLabel) + '.</p></div>' +
      '<div class="bigq"><span>The question your week will answer</span><b>Can you tell how clean the air is just by looking?</b>' +
      '<div class="vn" style="color:#BCD6E2">Chỉ nhìn bầu trời, em có biết không khí sạch hay không?</div></div>';
    const cc = $("#codeChip");
    cc.hidden = false; cc.textContent = "My code: " + S.code;
    cc.onclick = () => {
      let n = $("#codeNote");
      if (n) { n.remove(); return; }
      n = el("div", "note", "Your code is <b>" + esc(S.code) + "</b>. On another phone or computer, open <b>your own link</b> below — or open the homework page, choose <b>Find my Air Watch</b> and type your name. Your week comes with you. · <span>Mã của em là " + esc(S.code) + ".</span>" +
        '<div class="row2" style="margin-top:8px"><input readonly id="myLink" value="' + esc(myLink()) + '"><div><button class="btn sm" id="copyMy" type="button">Copy my link</button></div></div>');
      n.id = "codeNote"; h.appendChild(n);
      $("#copyMy").onclick = () => { const i = $("#myLink"); i.select(); try { navigator.clipboard.writeText(i.value); } catch (e) { try { document.execCommand("copy"); } catch (x) {} } $("#copyMy").textContent = "Copied ✓"; };
    };
  }

  /* ───────── setup ───────── */
  function renderSetup() {
    const w = $("#setup"); w.innerHTML = "";
    if (setupDone()) {
      const slot = slotOf(S.slot);
      const c = el("div", "card");
      c.innerHTML = '<div class="eyebrow">My Air Watch</div>' +
        '<dl class="sum"><dt>Name</dt><dd>' + esc(S.name) + ' · ' + esc(S.cls) + '</dd>' +
        '<dt>My station</dt><dd>' + esc(S.st.name) + (S.st.url ? ' · <a href="' + esc(S.st.url) + '" target="_blank" rel="noopener">open</a>' : '') + '</dd>' +
        '<dt>My time</dt><dd>' + esc(slot ? slot.en : "") + ' — every day</dd>' +
        (S.area ? '<dt>I live in</dt><dd>' + esc(S.area) + '</dd>' : '') + '</dl>';
      w.appendChild(c);
      return;
    }
    /* already started? find it again by name (or code) */
    const cont = el("div", "card");
    cont.innerHTML = '<div class="eyebrow">Already started? · Em đã bắt đầu rồi?</div><h2 style="font-size:22px">Find my Air Watch</h2>' +
      '<p class="vn" style="margin:4px 0 0">New phone or computer, or this page forgot you? Type your name and class as you did on the first day. · Nhập tên và lớp của em.</p>' +
      '<div class="row2"><div><label for="fnm">Your name · Tên</label><input id="fnm" autocomplete="name" placeholder="Nguyễn Minh Anh"></div>' +
      '<div><label for="fcl">Your class · Lớp</label><input id="fcl" placeholder="6H1"></div></div>' +
      '<div class="btns"><button class="btn" id="findBtn" type="button">Find my Air Watch</button></div><div id="found"></div>' +
      '<details style="margin-top:12px"><summary>I have my 6-letter code</summary>' +
      '<div class="row2"><div><label for="cc">Your code · Mã của em</label><input id="cc" maxlength="6" placeholder="K7Q2MX" style="text-transform:uppercase"></div>' +
      '<div style="align-self:end"><button class="btn ghost" id="ccBtn" type="button">Continue with my code</button></div></div></details><div class="err" id="ccErr"></div>';
    w.appendChild(cont);

    const c = el("div", "card");
    c.innerHTML =
      '<div class="eyebrow">New here? Start here · Bắt đầu</div><h2 style="font-size:22px">Set up your week (2 minutes)</h2>' +
      '<p class="vn" style="margin:4px 0 0">You choose ONE station and ONE time, and you keep them for all 7 days. That is what makes your data fair.<br>Chọn MỘT trạm và MỘT giờ, giữ nguyên cả 7 ngày.</p>' +
      '<div class="row2"><div><label for="nm">Your name · Tên</label><input id="nm" autocomplete="name" placeholder="Nguyễn Minh Anh"></div>' +
      '<div><label for="cl">Your class · Lớp</label><input id="cl" placeholder="6H1"></div></div>' +
      '<label for="ar">Where do you live? (area or phường) · Em sống ở đâu?</label><input id="ar" placeholder="e.g. Cầu Giấy">' +
      '<label>Your time every day · Giờ em kiểm tra mỗi ngày</label><div class="chips" id="slots"></div>' +
      '<p class="vn" style="margin:6px 0 0">Morning or after school is best — you must be able to see the sky.</p>' +
      '<label>Your station · Trạm của em</label>' +
      '<p class="vn" style="margin:0 0 6px">Choose the station nearest your home.</p>' +
      '<div class="btns" style="margin-top:0"><button class="btn sm" id="loadSt">Show stations in Hanoi</button><button class="btn sm ghost" id="nearSt" hidden>Sort by nearest to me</button></div>' +
      '<div id="stMsg" class="vn"></div><div id="stList"></div><div id="stPicked"></div>' +
      '<div class="err" id="setupErr"></div><div id="dupBox"></div>' +
      '<div class="btns"><button class="btn g" id="startBtn">Start my Air Watch</button></div>';
    w.appendChild(c);

    const nm = $("#nm"), cl = $("#cl"), ar = $("#ar");
    nm.value = S.name; cl.value = S.cls; ar.value = S.area;
    nm.oninput = () => { S.name = nm.value; save(true); };
    cl.oninput = () => { S.cls = cl.value; save(true); };
    ar.oninput = () => { S.area = ar.value; save(true); };

    const sl = $("#slots");
    C.slots.forEach(s => {
      const b = el("button", "chip" + (S.slot === s.k ? " on" : ""), esc(s.en) + "<small>" + esc(s.vn) + "</small>");
      b.type = "button";
      b.onclick = () => { S.slot = s.k; save(true); sl.querySelectorAll(".chip").forEach(x => x.classList.remove("on")); b.classList.add("on"); };
      sl.appendChild(b);
    });

    paintPicked();
    $("#loadSt").onclick = loadStations;
    $("#nearSt").onclick = sortNearest;
    $("#startBtn").onclick = () => {
      const e = $("#setupErr");
      if (txt(S.name).length < 2) { e.textContent = "Type your name first."; nm.focus(); return; }
      if (!txt(S.cls)) { e.textContent = "Type your class."; cl.focus(); return; }
      if (!S.slot) { e.textContent = "Choose your time."; return; }
      if (!S.st || !txt(S.st.name)) { e.textContent = "Choose your station."; return; }
      e.textContent = "";
      /* one log per student: if this name and class already has one, offer it first */
      checkExisting().then(m => { if (m) askSame(m); else begin(); });
    };
    $("#findBtn").onclick = () => {
      const out = $("#found"), fn = txt($("#fnm").value), fc = txt($("#fcl").value);
      if (fn.length < 2) { out.innerHTML = '<div class="err">Type your name first.</div>'; return; }
      if (!window.AWSYNC || !AWSYNC.available() || !window.AWST) { out.innerHTML = '<div class="err">Cannot reach your teacher’s page right now. Check the internet and try again.</div>'; return; }
      out.innerHTML = '<p class="vn">Looking…</p>';
      AWSYNC.getPath("roster").then(r => {
        const list = AWST.findInRoster(r || {}, fn, fc);
        if (!list.length) { out.innerHTML = '<div class="note">No Air Watch found with that name. Check the spelling, try only your first name, or ask your teacher for your code.</div>'; return; }
        out.innerHTML = '<p class="vn" style="margin:10px 0 6px">Tap your own Air Watch — check the station and the days saved:</p>';
        const box = el("div", "stlist");
        list.forEach(m => {
          const b = el("button", "st findrow", '<span class="nm">' + esc(m.n) + ' · ' + esc(m.c) + '<small>' + esc(m.st || "no station yet") + ' · ' + (m.d || 0) + (m.d === 1 ? ' day' : ' days') + ' saved</small></span><span class="me">This is me</span>');
          b.type = "button";
          b.onclick = () => { out.querySelectorAll(".findrow").forEach(x => { x.disabled = true; }); loadCode(m.code, out); };
          box.appendChild(b);
        });
        out.appendChild(box);
      });
    };
    $("#ccBtn").onclick = () => {
      const code = txt($("#cc").value).toUpperCase();
      const e = $("#ccErr");
      if (!/^[A-Z0-9]{6}$/.test(code)) { e.textContent = "Your code has 6 letters or numbers."; return; }
      e.textContent = "Loading…";
      loadCode(code, e);
    };
  }

  /* ───────── one log per student: find, load, join ───────── */
  function quietSet(p, v) { const db = window.AWSYNC && AWSYNC.stationDb(); return db ? db.set(p, v).catch(() => {}) : Promise.resolve(); }
  function myLink() { return location.href.split("#")[0].split("?")[0] + "?code=" + S.code; }
  function tell(box, msg) { if (!box) { alertNote(msg); return; } if (box.id === "found") box.innerHTML = '<div class="err">' + esc(msg) + '</div>'; else box.textContent = msg; }
  function alertNote(msg) { const h = $("#hdr"); if (!h) return; const n = el("div", "note", esc(msg)); h.appendChild(n); setTimeout(() => n.remove(), 9000); }
  function loadCode(code, box, hops) {
    if (!window.AWSYNC || !AWSYNC.available()) { tell(box, "Cannot reach your teacher's page right now. Check the internet and try again."); return Promise.resolve(false); }
    return AWSYNC.getPath("moved/" + code).then(to => {
      if (to && to !== code && (hops || 0) < 3) return loadCode(to, box, (hops || 0) + 1);
      return AWSYNC.getStudent(code).then(v => {
        if (!v) { tell(box, "No Air Watch found with that code."); return false; }
        adopt(code, v); return true;
      });
    });
  }
  function adopt(code, v) {
    const old = S, oldDays = old.days || {};
    /* this device already has days saved for the same student under another code: join them */
    const join = old.code !== code && Object.keys(oldDays).length > 0 && (!txt(old.name) || (window.AWST && AWST.nameScore(old.name, v.n) > 0));
    S = Object.assign({}, BLANK, {
      code, name: v.n || "", cls: v.c || "", area: v.area || "", slot: v.slot || old.slot || "", st: v.st || old.st || null,
      stPrev: v.stPrev ? (Array.isArray(v.stPrev) ? v.stPrev : Object.values(v.stPrev)).filter(Boolean) : [],
      days: join ? AWST.mergeDays(v.days || {}, oldDays) : (v.days || {}), drafts: old.drafts || {}, thumbs: {}, refl: v.refl || (join ? old.refl : {}) || {},
      q: v.q || (join ? old.q : null) || null, sub: !!v.sub, subAt: v.subAt || 0, created: v.created || Date.now(), started: true
    });
    SEL = null; rosterKey = ""; saveLocal(); lastPushOk = true;
    if (join && old.code && window.AWSYNC) {
      const fromOld = Object.keys(oldDays).filter(k => S.days[k] === oldDays[k] && oldDays[k] && oldDays[k].photo);
      AWSYNC.copyPhotos(old.code, code, fromOld).then(() => quietSet("moved/" + old.code, code)).then(() => { quietSet("students/" + old.code, null); quietSet("roster/" + old.code, null); });
    }
    Object.keys(CHK).forEach(k => { delete CHK[k]; });
    push(); renderAll(); paintLive(true); watchBack();
    alertNote("Welcome back, " + (S.name || "") + " — your Air Watch is here." + (join ? " Your days from this device were added to it." : ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function checkExisting() {
    if (!window.AWSYNC || !AWSYNC.available() || !window.AWST) return Promise.resolve(null);
    return AWSYNC.getPath("roster").then(r => AWST.findInRoster(r || {}, S.name, S.cls).find(x => x.code !== S.code && AWST.sameStudent({ n: x.n, c: x.c }, { n: S.name, c: S.cls })) || null).catch(() => null);
  }
  function askSame(m) {
    const box = $("#dupBox"); if (!box) { begin(); return; }
    box.innerHTML = '<div class="note">We found an Air Watch for <b>' + esc(m.n) + ' · ' + esc(m.c) + '</b> (' + esc(m.st || "no station yet") + ', ' + (m.d || 0) + (m.d === 1 ? ' day' : ' days') + ' saved). Is it yours?' +
      '<div class="btns"><button class="btn g sm" type="button" id="yesMine">Yes — continue it</button><button class="btn ghost sm" type="button" id="notMine">No — I am a different student</button></div><div class="err" id="dupErr"></div></div>';
    $("#yesMine").onclick = () => loadCode(m.code, $("#dupErr"));
    $("#notMine").onclick = () => { box.innerHTML = ""; begin(); };
  }
  function begin() { S.started = true; save(); push(); renderAll(); watchBack(); window.scrollTo({ top: 0, behavior: "smooth" }); }

  function paintPicked() {
    const p = $("#stPicked"); if (!p) return;
    if (!S.st) { p.innerHTML = ""; return; }
    p.innerHTML = '<div class="ok">Your station: <b>' + esc(S.st.name) + '</b>' +
      (S.st.parts && S.st.parts.length ? '<br><span style="font-size:14px">It shows: ' + esc(S.st.parts.join(", ")) + '</span>' : '') +
      (S.st.url ? '<br><a href="' + esc(S.st.url) + '" target="_blank" rel="noopener">Open it on aqicn.org</a>' : '') + '</div>';
  }

  function stationRow(s, extra) {
    const cat = CAT(s.aqi);
    const b = el("button", "st" + (S.st && S.st.uid === s.uid ? " on" : ""));
    b.type = "button";
    const stale = s.ageH !== null && s.ageH > 6;
    b.innerHTML = '<span class="nm">' + esc(s.name) + '<small>' + (stale ? "not updating recently" : (s.ageH !== null ? "updated " + (s.ageH <= 1 ? "this hour" : s.ageH + " h ago") : "")) + (extra ? " · " + esc(extra) : "") + '</small></span>' +
      (cat ? '<span class="aqi" style="background:' + cat.col + ';color:' + cat.ink + '">' + s.aqi + '</span>' : '<span class="aqi none">–</span>');
    if (stale) b.style.opacity = ".6";
    b.onclick = () => pickStation(s);
    return b;
  }
  function drawList(list, extraFn) {
    const L = $("#stList"); if (!L) return;
    L.innerHTML = "";
    const box = el("div", "stlist");
    list.forEach(s => box.appendChild(stationRow(s, extraFn ? extraFn(s) : "")));
    L.appendChild(box);
  }
  function loadStations() {
    const m = $("#stMsg");
    m.textContent = "Loading stations…";
    WAQI.stations().then(list => {
      /* stations that are not working (no AQI, or far below every other station) are not offered */
      const all = list.map(s => ({ uid: s.uid, aqi: s.aqi, tms: s.time ? Date.parse(s.time) : NaN }));
      const recent = list.filter(s => s.ageH === null || s.ageH <= 72);
      stationCache = window.AWST ? recent.filter(s => !AWST.isBroken({ uid: s.uid, aqi: s.aqi }, all, CK)) : recent;
      const hidden = recent.length - stationCache.length;
      m.textContent = stationCache.length + " stations. Tap the one nearest your home." + (hidden ? " (" + hidden + (hidden === 1 ? " station is" : " stations are") + " not working right now, so " + (hidden === 1 ? "it is" : "they are") + " not shown.)" : "");
      $("#nearSt").hidden = !("geolocation" in navigator);
      drawList(stationCache);
    }).catch(() => {
      m.innerHTML = "";
      drawManual();
    });
  }
  function sortNearest() {
    if (!stationCache) return;
    const m = $("#stMsg");
    m.textContent = "Finding you… (your location stays on this device)";
    navigator.geolocation.getCurrentPosition(pos => {
      const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      const withD = stationCache.map(s => Object.assign({}, s, { km: WAQI.distanceKm(me, s) })).sort((a, b) => a.km - b.km);
      m.textContent = "Nearest first. Tap the one nearest your home.";
      drawList(withD, s => s.km.toFixed(1) + " km away");
    }, () => { m.textContent = "Could not use your location. Choose from the list instead."; }, { timeout: 8000 });
  }
  function drawManual() {
    const L = $("#stList");
    L.innerHTML = '<div class="note">The station list did not load. Open the Hanoi map, tap the station nearest your home, and type its name here exactly as it is written.</div>' +
      '<div class="btns" style="margin-top:0"><a class="btn sm ghost" target="_blank" rel="noopener" href="' + esc(C.hanoiMap) + '">Open the Hanoi map</a></div>' +
      '<label for="stName">Station name</label><input id="stName" placeholder="e.g. Hà Nội: Công viên Nhân Chính">';
    const i = $("#stName");
    if (S.st && S.st.custom) i.value = S.st.name;
    i.oninput = () => { S.st = { uid: null, name: i.value, custom: true, url: C.hanoiMap }; save(true); };
  }
  function pickStation(s) {
    S.st = { uid: s.uid, name: s.name, custom: false, url: WAQI.link(s.uid), parts: [], lat: s.lat, lon: s.lon };
    save(true);
    document.querySelectorAll(".st").forEach(x => x.classList.remove("on"));
    paintPicked();
    WAQI.feed(s.uid).then(f => {
      if (!S.st || S.st.uid !== s.uid) return;
      S.st.url = f.url || S.st.url;
      S.st.parts = PARTS.filter(p => f.parts[p.k] !== null).map(p => p.en);
      save(true); paintPicked();
    }).catch(() => {});
    const L = $("#stList"); if (L) L.querySelectorAll(".st").forEach(x => { if (x.querySelector(".nm").firstChild.textContent === s.name) x.classList.add("on"); });
  }

  /* ───────── week strip ───────── */
  function dayState(n) {
    const t = todayIndex();
    if (S.days[n]) return "done";
    if (n > t) return "lock";
    if (n === t) return "today";
    return "missed";
  }
  function renderWeek() {
    const w = $("#weekWrap"); w.innerHTML = "";
    if (!setupDone()) return;
    const t = todayIndex();
    if (SEL === null) {
      if (t >= 1 && t <= C.days) SEL = t;
      else if (t > C.days) SEL = C.days;
      else SEL = 1;
    }
    const g = el("div", "week");
    for (let n = 1; n <= C.days; n++) {
      const st = dayState(n);
      const b = el("button", "dchip" + (st === "today" ? " today" : "") + (st === "lock" ? " lock" : "") + (SEL === n ? " sel" : ""));
      b.type = "button";
      let tag = st === "done" ? "✓ saved" : st === "today" ? "today" : st === "missed" ? "catch up" : "later";
      let aq = "";
      if (st === "done") {
        const a = S.days[n].a && S.days[n].a.aqi; const c = CAT(a);
        if (c) aq = '<span class="aq" style="background:' + c.col + ';color:' + c.ink + '">' + a + '</span>';
        if (S.days[n].late) tag = "✓ late";
      }
      b.innerHTML = "<b>Day " + n + "</b><i>" + esc(pretty(dateOfDay(n))) + "</i>" + (aq || "<i>" + tag + "</i>");
      b.disabled = st === "lock";
      b.onclick = () => { SEL = n; renderWeek(); renderDay(); };
      g.appendChild(b);
    }
    w.appendChild(g);
    if (t === 0) w.appendChild(el("div", "note", "Your week starts on " + esc(pretty(dateOfDay(1))) + "."));
  }

  /* ───────── one day ───────── */
  const SKY = [["clear", "Clear", "Trong"], ["hazy", "Hazy", "Mờ"], ["foggy", "Foggy or misty", "Sương mù"], ["rainy", "Rainy", "Mưa"], ["dark", "Dark — can't see", "Tối"]];
  const WHAT = [["rain", "Rain", "Mưa"], ["wind", "Strong wind", "Gió mạnh"], ["sun", "Hot and sunny", "Nắng nóng"], ["traffic", "Heavy traffic nearby", "Tắc đường"],
    ["build", "Construction nearby", "Công trình"], ["smoke", "Smoke or burning smell", "Khói, mùi đốt"], ["incense", "Incense or cooking smoke", "Hương, khói bếp"],
    ["weekend", "Weekend or holiday", "Cuối tuần, ngày lễ"], ["none", "Nothing special", "Bình thường"]];

  function draftOf(n) { S.drafts[n] = S.drafts[n] || { what: [] }; return S.drafts[n]; }

  function renderDay() {
    const w = $("#dayWrap"); w.innerHTML = "";
    if (!setupDone()) return;
    const n = SEL; if (!n || n < 1 || n > C.days) return;
    const st = dayState(n);
    if (st === "lock") { w.appendChild(el("div", "note", "Day " + n + " opens on " + esc(pretty(dateOfDay(n))) + ".")); return; }
    if (S.days[n]) { const sc = summaryCard(n); w.appendChild(sc); allTimes(n, sc); return; }
    /* the station numbers at all three times appear once the day is saved (not before: the student reads them from aqicn.org) */
    w.appendChild(formCard(n, st === "missed"));
  }

  function catChip(c, on) {
    const b = el("button", "chip cat" + (on ? " on" : ""), esc(c.en) + '<small style="color:inherit;opacity:.85">' + esc(c.vn) + '</small>');
    b.type = "button"; b.style.background = c.col; b.style.color = c.ink;
    return b;
  }

  function formCard(n, late) {
    const d = draftOf(n);
    const past = dateOfDay(n) !== hanoiDate();
    const card = el("div", "card");
    const head = el("div");
    head.innerHTML = '<div class="eyebrow">Day ' + n + ' · ' + esc(pretty(dateOfDay(n))) + '</div>' +
      '<h2 style="font-size:22px">Look first. Then check.</h2>' +
      (d.back ? '<div class="note back"><b>Your teacher sent this day back:</b> the numbers did not match your station. ' +
          (past ? 'If you wrote the real numbers down on that day, type them again. If you did not, leave this day empty — that is OK. · Nếu em đã ghi lại số thật của hôm đó, hãy nhập lại. Nếu không, hãy để trống ngày này.'
            : 'Look at your station again and type exactly what it shows. · Hãy xem lại trạm của em và nhập đúng số.') + '</div>'
        : late ? '<div class="note">Catching up. That is fine — this day will show as <b>entered late</b>, so be honest: only fill it in if you checked on that day (for example, you wrote it in your book). Your numbers are checked against what your station recorded that day.</div>' : '');
    card.appendChild(head);

    /* step 1 */
    const s1 = el("div", "step");
    s1.innerHTML = '<h3><span class="num">1</span>Look outside (before you check!)</h3><p class="how">At your time, look at the sky. Nhìn bầu trời trước, rồi mới kiểm tra.</p>' +
      '<label>How does the sky look?</label><div class="chips" id="sky"></div>' +
      '<label>Guess today\'s air from what you see · Đoán chất lượng không khí</label><div class="chips" id="guess"></div>' +
      '<div class="err" id="e1"></div>';
    card.appendChild(s1);
    const skyBox = s1.querySelector("#sky"), gBox = s1.querySelector("#guess");
    SKY.forEach(([k, en, vn]) => {
      const b = el("button", "chip" + (d.sky === k ? " on" : ""), esc(en) + "<small>" + esc(vn) + "</small>");
      b.type = "button"; b.disabled = !!d.gAt;
      b.onclick = () => { d.sky = k; save(); skyBox.querySelectorAll(".chip").forEach(x => x.classList.remove("on")); b.classList.add("on"); };
      skyBox.appendChild(b);
    });
    CATS.slice(0, 5).forEach(c => {
      const b = catChip(c, d.guess === c.k); b.disabled = !!d.gAt;
      b.onclick = () => { d.guess = c.k; save(); gBox.querySelectorAll(".chip").forEach(x => x.classList.remove("on")); b.classList.add("on"); };
      gBox.appendChild(b);
    });
    if (!d.gAt) {
      const lock = el("div", "btns"); const lb = el("button", "btn", "Lock my guess"); lb.type = "button"; lock.appendChild(lb); s1.appendChild(lock);
      lb.onclick = () => {
        if (!d.sky) { s1.querySelector("#e1").textContent = "Choose how the sky looks."; return; }
        if (!d.guess) { s1.querySelector("#e1").textContent = "Make your guess."; return; }
        d.gAt = Date.now(); save(); renderDay();
      };
      return card;
    }
    s1.appendChild(el("p", "vn", "Guess locked at " + new Date(d.gAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + ". Now check the real number."));

    /* step 2 — own station */
    const six = n === C.days;
    const s2 = el("div", "step");
    s2.innerHTML = '<h3><span class="num">2</span>Check your station</h3>' +
      '<p class="how">' + esc(S.st.name) + (S.st.url ? ' · <a href="' + esc(S.st.url) + '" target="_blank" rel="noopener">open it on aqicn.org</a>' : '') + '</p>' +
      '<div class="brokenbox" id="brk" hidden></div>' +
      '<div class="row2"><div><label for="aqi">AQI (the big number)</label><input id="aqi" type="number" inputmode="numeric" min="0" max="999"><div class="chk" data-f="aqi"></div></div>' +
      '<div><label for="upd">Time on the page ("Updated…")</label><input id="upd" type="time"></div></div>' +
      (six ? '<label>Day ' + n + ' bonus: write ALL six parts. Tick “not shown” if your station does not show one.</label><div class="row3" id="sixBox"></div><div class="chk" data-f="pm25"></div>'
        : '<div class="row2"><div><label for="pm">PM2.5</label><input id="pm" type="number" inputmode="numeric" min="0" max="999"><div class="chk" data-f="pm25"></div></div>' +
          '<div style="align-self:end"><label style="font-weight:500"><input type="checkbox" id="pmna"> PM2.5 not shown</label></div></div>') +
      '<div class="guide" id="g2" hidden></div>' +
      '<label>Which part is the biggest today?</label><div class="chips" id="big"></div><div class="err" id="e2"></div>';
    card.appendChild(s2);
    const aqi = s2.querySelector("#aqi"), upd = s2.querySelector("#upd");
    aqi.value = d.aqi ?? ""; upd.value = d.upd || "";
    aqi.oninput = () => { d.aqi = aqi.value; save(); };
    upd.oninput = () => { d.upd = upd.value; save(); };
    aqi.addEventListener("change", () => runCheck("aqi"));
    if (six) {
      d.six = d.six || {};
      const box = s2.querySelector("#sixBox");
      PARTS.forEach(p => {
        const cell = el("div");
        cell.innerHTML = '<label>' + esc(p.en) + '</label><input type="number" inputmode="numeric" min="0" max="999" data-k="' + p.k + '"><label style="font-weight:500;margin-top:4px"><input type="checkbox" data-na="' + p.k + '"> not shown</label>';
        const i = cell.querySelector("input[type=number]"), c = cell.querySelector("input[type=checkbox]");
        const cur = d.six[p.k] || {};
        i.value = cur.v ?? ""; c.checked = !!cur.na; i.disabled = !!cur.na;
        i.oninput = () => { d.six[p.k] = { v: i.value, na: false }; save(); };
        c.onchange = () => { d.six[p.k] = { v: "", na: c.checked }; i.disabled = c.checked; if (c.checked) i.value = ""; save(); if (p.k === "pm25") paintField("pm25", ""); };
        if (p.k === "pm25") i.addEventListener("change", () => runCheck("pm25"));
        box.appendChild(cell);
      });
    } else {
      const pm = s2.querySelector("#pm"), na = s2.querySelector("#pmna");
      pm.value = d.pm25 ?? ""; na.checked = !!d.pm25na; pm.disabled = !!d.pm25na;
      pm.oninput = () => { d.pm25 = pm.value; save(); };
      pm.addEventListener("change", () => runCheck("pm25"));
      na.onchange = () => { d.pm25na = na.checked; pm.disabled = na.checked; if (na.checked) { pm.value = ""; d.pm25 = ""; paintField("pm25", ""); } save(); };
    }
    const bigBox = s2.querySelector("#big");
    PARTS.concat([{ k: "notshown", en: "Can't tell" }]).forEach(p => {
      const b = el("button", "chip" + (d.big === p.k ? " on" : ""), esc(p.en)); b.type = "button";
      b.onclick = () => { d.big = p.k; save(); bigBox.querySelectorAll(".chip").forEach(x => x.classList.remove("on")); b.classList.add("on"); };
      bigBox.appendChild(b);
    });

    /* step 3 — class station */
    const cs = CFG.classStation;
    const same = cs && S.st && cs.uid != null && String(S.st.uid) === String(cs.uid);
    let s3 = null, clsOff = false;
    if (cs && cs.name && !same) {
      s3 = el("div", "step");
      s3.innerHTML = '<h3><span class="num">3</span>Check the class station</h3>' +
        '<p class="how">Everyone in the class checks this one too: <b>' + esc(cs.name) + '</b>' + (cs.url ? ' · <a href="' + esc(cs.url) + '" target="_blank" rel="noopener">open it</a>' : '') + '</p>' +
        '<div class="note" id="clsOff" hidden>The class station is not showing a number right now — skip this step today.</div>' +
        '<div class="row2"><div><label for="raqi">AQI</label><input id="raqi" type="number" inputmode="numeric" min="0" max="999"><div class="chk" data-f="raqi"></div></div>' +
        '<div><label for="rpm">PM2.5 (leave empty if not shown)</label><input id="rpm" type="number" inputmode="numeric" min="0" max="999"></div></div>' +
        '<div class="guide" id="g3" hidden></div><div class="err" id="e3"></div>';
      card.appendChild(s3);
      const ra = s3.querySelector("#raqi"), rp = s3.querySelector("#rpm");
      ra.value = d.raqi ?? ""; rp.value = d.rpm25 ?? "";
      ra.oninput = () => { d.raqi = ra.value; save(); };
      rp.oninput = () => { d.rpm25 = rp.value; save(); };
      ra.addEventListener("change", () => runCheck("raqi"));
    }

    /* step 4 — what was happening */
    const k4 = s3 ? 4 : 3;
    const s4 = el("div", "step");
    s4.innerHTML = '<h3><span class="num">' + k4 + '</span>What was happening today?</h3><p class="how">Tick everything that is true near you. Chọn tất cả những gì đúng.</p>' +
      '<div class="chips" id="what"></div><label for="note">Anything else? (one line, optional)</label><input id="note" maxlength="140" placeholder="e.g. the road outside was very busy"><div class="err" id="e4"></div>';
    card.appendChild(s4);
    const wb = s4.querySelector("#what");
    WHAT.forEach(([k, en, vn]) => {
      const on = d.what.includes(k);
      const b = el("button", "chip" + (on ? " on" : ""), esc(en) + "<small>" + esc(vn) + "</small>"); b.type = "button";
      b.onclick = () => {
        if (k === "none") d.what = d.what.includes("none") ? [] : ["none"];
        else { d.what = d.what.filter(x => x !== "none"); d.what = d.what.includes(k) ? d.what.filter(x => x !== k) : d.what.concat([k]); }
        save();
        wb.querySelectorAll(".chip").forEach((x, i) => x.classList.toggle("on", d.what.includes(WHAT[i][0])));
      };
      wb.appendChild(b);
    });
    const note = s4.querySelector("#note"); note.value = d.note || "";
    note.oninput = () => { d.note = note.value; save(); };

    /* step 5 — photo */
    const s5 = el("div", "step");
    s5.innerHTML = '<h3><span class="num">' + (k4 + 1) + '</span>Photo of the sky (optional)</h3>' +
      '<p class="how">Sky only — no people, no house numbers. Chỉ chụp bầu trời.</p>' +
      '<input type="file" id="ph" accept="image/*" capture="environment"><div id="phPrev"></div>';
    card.appendChild(s5);
    const ph = s5.querySelector("#ph"), prev = s5.querySelector("#phPrev");
    if (d.photo) prev.innerHTML = '<img class="thumb" alt="Your sky photo" src="' + d.photo + '">';
    else if (d.hadPhoto) prev.innerHTML = '<p class="vn">Your photo for this day is already sent ✓ — add a new one only if you want to change it.</p>';
    ph.onchange = () => {
      const f = ph.files && ph.files[0]; if (!f) return;
      prev.textContent = "Getting your photo ready…";
      compress(f, 900, 0.62).then(u => { d.photo = u; save(); prev.innerHTML = '<img class="thumb" alt="Your sky photo" src="' + u + '">'; })
        .catch(() => { prev.textContent = "That photo did not work. Try another one, or skip it."; });
    };

    /* ── checking the numbers: with the station, as soon as they are typed ── */
    const ownUid = S.st && S.st.uid != null && !S.st.custom ? String(S.st.uid) : null;
    const input = f => f === "aqi" ? aqi : f === "raqi" ? (s3 && s3.querySelector("#raqi")) : (six ? s2.querySelector('#sixBox input[data-k="pm25"]') : s2.querySelector("#pm"));
    const valueOf = f => f === "aqi" ? d.aqi : f === "raqi" ? d.raqi : six ? ((d.six || {}).pm25 || {}).v : d.pm25;
    const wrong = {};
    const ckOf = f => { d.ck = d.ck || {}; return (d.ck[f] = d.ck[f] || { fails: 0, until: 0 }); };
    const waitText = until => { const s = Math.ceil((until - Date.now()) / 1000); return s > 0 ? "Too many tries. Look at the station page again — you can check again in " + s + " s." : "You can try again now."; };
    let tick = null;
    function paintField(f, st, r) {
      const b = card.querySelector('.chk[data-f="' + f + '"]'); if (!b) return;
      const i = input(f); if (i) i.classList.toggle("bad", st === "bad" || st === "wait");
      const nm = f === "raqi" ? (cs || {}).name : S.st.name;
      b.className = "chk" + (st ? " c-" + st : "");
      b.innerHTML = st === "busy" ? "Checking with the station…"
        : st === "ok" ? (r && r.by === "est" ? "✓ Looks right for that day" : "✓ Matches " + esc(nm))
        : st === "bad" ? "✗ This does not match " + esc(nm) + (past ? " on that day." : " right now.")
        : st === "none" ? "Could not check this number just now — you can still save."
        : st === "wait" ? esc(waitText(ckOf(f).until)) : "";
      wrong[f] = st === "bad" || st === "wait";
      [2, 3].forEach(k => {
        const g = card.querySelector("#g" + k); if (!g) return;
        const on = k === 2 ? !!(wrong.aqi || wrong.pm25) : !!wrong.raqi;
        if (on && !g.dataset.done) { g.innerHTML = guideHTML(k === 3 ? "class" : "own", past, n); g.dataset.done = "1"; }
        g.hidden = !on;
      });
      if (st === "wait") {
        clearInterval(tick);
        tick = setInterval(() => {
          const c = ckOf(f);
          if (!b.classList.contains("c-wait")) { clearInterval(tick); return; }
          if (c.until <= Date.now()) { c.until = 0; save(); clearInterval(tick); b.className = "chk"; b.textContent = "You can try again now."; return; }
          b.textContent = waitText(c.until);
        }, 1000);
      }
    }
    async function runCheck(f) {
      const v = int(valueOf(f));
      if (v === null) { paintField(f, ""); return null; }
      const c = ckOf(f);
      if (c.until > Date.now()) { paintField(f, "wait"); return false; }
      paintField(f, "busy");
      let r;
      try { r = await checkNumber(n, f, v); } catch (e) { r = { ok: null }; }
      if (int(valueOf(f)) !== v) return null;   /* the number changed while we were checking */
      if (r.broken) { paintField(f, ""); showBroken(); return false; }
      if (r.ok === false) {
        c.fails++;
        if (c.fails >= CK.tries) { c.fails = 0; c.until = Date.now() + CK.waitSec * 1000; save(); paintField(f, "wait"); return false; }
        save(); paintField(f, "bad"); return false;
      }
      c.fails = 0; save();
      paintField(f, r.ok === true ? "ok" : "none", r);
      return r;
    }
    function showBroken() {
      const box = s2.querySelector("#brk"); if (!box || !box.hidden) return;
      prepCheck(n).then(st => {
        const feed = st.feeds[ownUid];
        const near = AWST.nearestWorking(st.list || [], S.st.lat != null ? { lat: S.st.lat, lon: S.st.lon } : null, 6, CK, Date.now()).filter(x => String(x.uid) !== ownUid).slice(0, 5);
        box.hidden = false;
        box.innerHTML = '<b>Your station is not working right now.</b> ' +
          (feed && feed.aqi == null ? 'Its page shows no AQI number (–). ' : 'Its numbers are far lower than every other station in Hanoi, so it is probably broken. ') +
          'Choose a working station near you. Your saved days stay. · Trạm của em đang không hoạt động. Hãy chọn một trạm khác gần nhà em.' +
          (near.length ? '<div class="stlist">' + near.map((x, i) => '<button class="st" type="button" data-i="' + i + '"><span class="nm">' + esc(x.name) + '<small>' + (x.km != null ? x.km.toFixed(1) + ' km from your old station' : '') + '</small></span><span class="me">Use this one</span></button>').join("") + '</div>'
            : '<p>The list of stations did not load. Try again in a minute.</p>');
        box.querySelectorAll("[data-i]").forEach(b => b.onclick = () => switchStation(near[+b.dataset.i]));
        box.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
    /* as soon as step 2 opens: get the live readings ready; tell the student now if their station is broken */
    prepCheck(n).then(st => {
      if (!card.isConnected) return;
      const feed = st.feeds[ownUid];
      if (st.today && feed && AWST.isBroken(feed, st.list, CK)) showBroken();
      const cf = cs && cs.uid != null ? st.feeds[String(cs.uid)] : null;
      if (s3 && st.today && cf && cf.aqi == null) { clsOff = true; s3.querySelector("#clsOff").hidden = false; s3.querySelector(".row2").hidden = true; }
      ["aqi", "pm25", "raqi"].forEach(f => { if (int(valueOf(f)) !== null && (f !== "raqi" || (s3 && !clsOff))) runCheck(f); });
    });

    /* save */
    const sv = el("div", "btns"); const sb = el("button", "btn g", "Save Day " + n); sb.type = "button"; sv.appendChild(sb); card.appendChild(sv);
    const eS = el("div", "err"); card.appendChild(eS);
    sb.onclick = async () => {
      const bad = (i, msg, box) => { if (i) { i.classList.add("bad"); i.focus(); } (box || eS).textContent = msg; return false; };
      [aqi].forEach(i => i.classList.remove("bad"));
      s2.querySelector("#e2").textContent = ""; eS.textContent = "";
      const A = int(d.aqi);
      if (A === null || A < 0 || A > 999) return bad(aqi, "Type the AQI number from your station (0–999).", s2.querySelector("#e2"));
      let pm25 = null, sixOut = null;
      if (six) {
        sixOut = {}; let any = false;
        for (const p of PARTS) {
          const cur = d.six[p.k] || {};
          if (cur.na) { sixOut[p.k] = null; continue; }
          const v = int(cur.v);
          if (v === null) return bad(null, "For each part, type the number or tick “not shown” (" + p.en + ").", s2.querySelector("#e2"));
          sixOut[p.k] = v; any = true;
        }
        if (!any) return bad(null, "Type at least one part.", s2.querySelector("#e2"));
        pm25 = sixOut.pm25;
      } else if (!d.pm25na) {
        pm25 = int(d.pm25);
        if (pm25 === null || pm25 < 0 || pm25 > 999) return bad(s2.querySelector("#pm"), "Type the PM2.5 number, or tick “not shown”.", s2.querySelector("#e2"));
      }
      if (!d.big) return bad(null, "Choose which part is the biggest (or “Can't tell”).", s2.querySelector("#e2"));
      let rA = null, rP = null;
      if (s3 && !clsOff) {
        rA = int(d.raqi);
        if (rA === null || rA < 0 || rA > 999) return bad(s3.querySelector("#raqi"), "Type the class station's AQI.", s3.querySelector("#e3"));
        rP = int(d.rpm25);
      }
      if (!d.what.length) return bad(null, "Tick at least one thing (or “Nothing special”).", s4.querySelector("#e4"));

      /* the numbers must match the station before the day is saved */
      sb.disabled = true; sb.textContent = "Checking with the station…";
      const reset = () => { sb.disabled = false; sb.textContent = "Save Day " + n; };
      const st = await prepCheck(n);
      const feed = st.feeds[ownUid];
      if (st.today && feed && AWST.isBroken(feed, st.list, CK)) { showBroken(); reset(); eS.textContent = "Your station is not working right now — choose a working station in step 2 first."; return; }
      const res = {};
      for (const f of ["aqi"].concat(pm25 !== null ? ["pm25"] : []).concat(rA !== null ? ["raqi"] : [])) {
        const r = await runCheck(f);
        if (r === false) {
          reset();
          eS.textContent = f === "raqi" ? "The class station number does not match — look at the steps in step 3." : "Your numbers do not match your station — look at the steps in step 2.";
          const i = input(f); if (i) i.focus();
          return;
        }
        res[f] = r;
      }

      const now = Date.now();
      const isLate = hanoiDate(new Date(now)) !== dateOfDay(n);
      const pack = r => r && r.ok !== undefined ? { ok: r.ok, by: r.by || null, r: r.r == null ? null : r.r } : null;
      const rec = {
        date: dateOfDay(n), at: now, late: isLate,
        g: { sky: d.sky, guess: d.guess, at: d.gAt },
        a: { aqi: A, pm25: pm25, pm25na: six ? (sixOut.pm25 === null) : !!d.pm25na, big: d.big, upd: d.upd || "", st: S.st.uid },
        what: d.what.slice(), note: txt(d.note), photo: !!d.photo || !!d.hadPhoto,
        chk: { aqi: pack(res.aqi), pm25: pack(res.pm25), raqi: pack(res.raqi), at: now }
      };
      if (six) rec.six = sixOut;
      if (s3) rec.ref = clsOff ? { aqi: null, pm25: null, uid: cs.uid, nodata: true } : { aqi: rA, pm25: rP, uid: cs.uid };
      else if (same) rec.ref = { aqi: A, pm25: pm25, uid: cs.uid, same: true };
      sb.textContent = "Saving…";
      const photo = d.photo;
      S.days[n] = rec;
      if (photo) makeThumb(photo).then(t => { S.thumbs[n] = t; saveLocal(); }).catch(() => {});
      delete S.drafts[n];
      saveLocal();
      const jobs = [push()];
      if (photo && window.AWSYNC && AWSYNC.available()) jobs.push(AWSYNC.savePhoto(S.code, n, photo));
      Promise.all(jobs).finally(() => { renderWeek(); renderDay(); renderExtra(); const r = $("#result"); if (r) r.scrollIntoView({ behavior: "smooth", block: "center" }); });
    };
    return card;
  }

  /* ───────── checking a number against the station (live reading, saved readings, or the estimate) ───────── */
  const CHK = {};
  function prepCheck(n, force) {
    const date = dateOfDay(n), today = date === hanoiDate(), cs = CFG.classStation;
    const own = S.st && S.st.uid != null && !S.st.custom ? String(S.st.uid) : null;
    const cls = cs && cs.uid != null ? String(cs.uid) : null;
    const k = [n, own, cls, date].join("|"), cur = CHK[n];
    if (cur && cur.k === k && !force && Date.now() - cur.at < 3 * 60000) return cur.ready;
    const st = { k, at: Date.now(), today, feeds: {}, data: {}, list: null, est: {} };
    CHK[n] = st;
    if (!window.AWST) { st.ready = Promise.resolve(st); return st.ready; }
    const db = window.AWSYNC && AWSYNC.available() ? AWSYNC.stationDb() : null;
    const jobs = [];
    [own, cls].filter((u, i, a) => u != null && a.indexOf(u) === i).forEach(uid => {
      if (today) jobs.push(AWST.waqiFeed(fetchFn, C.waqiToken, uid).then(f => { st.feeds[uid] = f; }).catch(() => { st.feeds[uid] = null; }));
      if (db) jobs.push(Promise.all(["stationLog", "stationHist", "stationEst"].map(p => db.get(p + "/s" + uid + "/" + date).catch(() => null)))
        .then(([l, h, e]) => { st.data[uid] = { l, h, e }; }));
    });
    if (today) jobs.push(AWST.waqiBounds(fetchFn, C.waqiToken, C.bounds).then(l => { st.list = l; }).catch(() => {}));
    st.ready = Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 9000))]).then(() => {
      /* every live reading we see helps the checker later (a number read now, saved in an hour) */
      if (db) Object.keys(st.feeds).forEach(uid => { const f = st.feeds[uid]; if (f && !AWST.isBroken(f, st.list, CK)) AWST.saveHist(db, uid, f, Date.now()).catch(() => {}); });
      return st;
    });
    return st.ready;
  }
  async function checkNumber(n, f, v, again) {
    const st = await prepCheck(n, again);
    const d = draftOf(n), date = dateOfDay(n), cs = CFG.classStation || {};
    const uid = f === "raqi" ? (cs.uid != null ? String(cs.uid) : null) : (S.st && S.st.uid != null && !S.st.custom ? String(S.st.uid) : null);
    if (uid == null) return { ok: null };
    const feed = st.feeds[uid];
    if (f !== "raqi" && st.today && feed && AWST.isBroken(feed, st.list, CK)) return { ok: null, broken: true };
    const x = st.data[uid] || {}, wrap = v2 => v2 ? { ["s" + uid]: { [date]: v2 } } : null;
    const R = AWST.refs({ uid, date, slot: S.slot, now: Date.now(), live: feed ? [feed] : [], log: wrap(x.l), hist: wrap(x.h), est: wrap(x.e), upd: AWST.hm(d.upd), from: d.gAt, at: Date.now() });
    const field = f === "raqi" ? "aqi" : f;
    if (!R.real.some(r => r[field] != null) && !(R.est && R.est[field] != null)) {
      const e = await estFor(st, uid, date);
      if (e) R.est = { aqi: e.aqi, pm25: e.pm25 == null ? null : e.pm25 };
    }
    const r = AWST.judge(v, R, field, CK);
    /* the station may have updated since we last looked: read it again once before saying no */
    if (r.ok === false && !again && st.today && Date.now() - st.at > 30000) return checkNumber(n, f, v, true);
    return r;
  }
  /* nothing saved for that day: ask the model (Open-Meteo) directly */
  function estFor(st, uid, date) {
    if (st.est[uid] !== undefined) return Promise.resolve(st.est[uid]);
    const feed = st.feeds[uid];
    const ll = S.st && String(S.st.uid) === uid && S.st.lat != null ? { lat: S.st.lat, lon: S.st.lon } : feed && feed.geo ? { lat: feed.geo[0], lon: feed.geo[1] } : null;
    const where = ll ? Promise.resolve(ll) : (window.AWSYNC && AWSYNC.available() ? AWSYNC.getPath("stationMeta/s" + uid) : Promise.resolve(null));
    const job = where.then(m => m && m.lat != null ? AWST.estimateAt({ fetch: fetchFn, lat: m.lat, lon: m.lon, date, slot: S.slot }) : null).catch(() => null);
    return Promise.race([job, new Promise(r => setTimeout(() => r(null), 8000))]).then(e => { st.est[uid] = e || null; return st.est[uid]; });
  }
  /* how to find the right number — shown under a number that does not match */
  function guideHTML(which, past, n) {
    const cs = CFG.classStation || {};
    const nm = which === "class" ? cs.name : S.st.name, url = which === "class" ? cs.url : S.st.url;
    const open = which === "class" ? "Open the class station" : "Open my station";
    if (past) return '<b>That number does not match what ' + esc(nm) + ' recorded on ' + esc(pretty(dateOfDay(n))) + ' at your time.</b>' +
      '<p>Only fill in a past day if you wrote the numbers down on that day. If you did not, leave this day empty — that is OK. · Chỉ điền ngày cũ nếu em đã ghi lại số của hôm đó. Nếu không, hãy để trống ngày này.</p>' +
      '<p>If you did write them down, check you are typing the numbers for <b>' + esc(nm) + '</b>: the AQI is the big number, PM2.5 is the first number in the PM2.5 row.</p>' + whereHTML(nm);
    return '<b>That number does not match ' + esc(nm) + ' right now.</b> <span class="vn">Số này không khớp với trạm ' + esc(nm) + '.</span>' +
      '<ol><li>Tap <b>' + open + '</b>. Check the name at the top is <b>' + esc(nm) + '</b> — not another station. <span class="vn">Kiểm tra đúng tên trạm.</span></li>' +
      '<li>The <b>AQI</b> is the big number in the coloured box at the top — not the temperature and not the forecast. <span class="vn">AQI là số to trong ô màu ở trên cùng.</span></li>' +
      '<li><b>PM2.5</b> is in the list under it: the <b>PM2.5</b> row, the first number. <span class="vn">PM2.5 là số đầu tiên ở dòng PM2.5.</span></li>' +
      '<li>Type exactly what you see now — the numbers change during the day. <span class="vn">Gõ đúng số em thấy bây giờ.</span></li></ol>' +
      (url ? '<a class="btn sm" href="' + esc(url) + '" target="_blank" rel="noopener">' + open + '</a>' : '') + whereHTML(nm);
  }
  function whereHTML(nm) {
    return '<details class="where"><summary>Show me where to look</summary><div class="aqmock" role="img" aria-label="Example of a station page on aqicn.org: the AQI is the big number at the top, PM2.5 is the first number in the PM2.5 row">' +
      '<div class="mtop"><span class="mbig">87</span><div><b>' + esc(nm) + '</b><small>Moderate</small><small>Updated on Saturday 19:00</small></div></div>' +
      '<table><tr><th></th><th>current</th><th>min</th><th>max</th></tr>' +
      '<tr class="hi"><td>PM2.5</td><td><b>87</b></td><td>55</td><td>152</td></tr><tr><td>PM10</td><td>41</td><td>20</td><td>66</td></tr><tr class="no"><td>Temp.</td><td>29</td><td>26</td><td>34</td></tr></table>' +
      '<ol class="mkeys"><li><b>AQI</b> = the big number at the top (here 87)</li><li><b>PM2.5</b> = the first number in the PM2.5 row</li><li><b>Updated…</b> = the time under the name</li><li>Not the temperature, humidity or wind</li></ol>' +
      '<small class="vn">Example only — your station and numbers will be different, and the page looks a little different on a phone.</small></div></details>';
  }
  /* the student's station stopped working: move to a working one (saved days stay as they are) */
  function switchStation(x) {
    if (!x) return;
    const old = S.st || {};
    S.stPrev = (S.stPrev || []).concat([{ uid: old.uid, name: old.name || "", until: Date.now(), why: "not working" }]);
    S.st = { uid: x.uid, name: x.name, custom: false, url: WAQI.link(x.uid), parts: [], lat: x.lat, lon: x.lon };
    Object.keys(S.drafts).forEach(k => {
      const dr = S.drafts[k]; if (!dr) return;
      ["aqi", "pm25", "upd", "big"].forEach(f => { delete dr[f]; });
      dr.pm25na = false; dr.six = {};
      if (dr.ck) { delete dr.ck.aqi; delete dr.ck.pm25; }
    });
    Object.keys(CHK).forEach(k => { delete CHK[k]; });
    registered = ""; save(); push();
    WAQI.feed(x.uid).then(f => {
      if (!S.st || S.st.uid !== x.uid) return;
      S.st.url = f.url || S.st.url;
      S.st.parts = PARTS.filter(p => f.parts[p.k] !== null).map(p => p.en);
      save(true); renderSetup();
    }).catch(() => {});
    renderAll();
    alertNote("Your station is now " + x.name + ". Your saved days stay.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  /* the teacher sent a day back: reopen it with the guess and notes kept, the numbers empty */
  function applyBack(back) {
    if (!back || typeof back !== "object") return false;
    let changed = false;
    Object.keys(back).forEach(n => {
      const b = back[n], r = S.days[n];
      if (!b || !b.at || !r || (r.at || 0) > b.at) return;
      S.drafts[n] = { sky: r.g && r.g.sky, guess: r.g && r.g.guess, gAt: r.g && r.g.at, what: (r.what || []).slice(), note: r.note || "", hadPhoto: !!r.photo, back: { at: b.at } };
      delete S.days[n]; changed = true;
    });
    if (changed) { saveLocal(); if (setupDone()) { renderWeek(); renderDay(); renderExtra(); } }
    return changed;
  }
  let backCode = "";
  function watchBack() {
    if (!window.AWSYNC || !AWSYNC.available() || backCode === S.code) return;
    const code = backCode = S.code;
    AWSYNC.watchPath("sentBack/" + code, v => { if (code === S.code && applyBack(v)) push(); });
  }

  function int(v) { const s = txt(v); if (!/^\d{1,4}$/.test(s)) return null; return parseInt(s, 10); }

  function summaryCard(n) {
    const r = S.days[n];
    const card = el("div", "card");
    const real = CAT(r.a.aqi), guess = CATS.find(c => c.k === r.g.guess);
    const right = real && guess && real.k === guess.k;
    const skyTxt = (SKY.find(s => s[0] === r.g.sky) || [0, "?"])[1];
    card.innerHTML = '<div class="eyebrow">Day ' + n + ' · ' + esc(pretty(r.date)) + (r.late ? ' · <span class="late">entered late</span>' : '') + '</div>' +
      '<div id="result" class="result ' + (right ? "ok" : "no") + '">' +
      (right ? '<b>Your eyes were right today.</b><br>' : '<b>Looking was not enough today.</b><br>') +
      'The sky looked <b>' + esc(skyTxt.toLowerCase()) + '</b>. You guessed <b>' + esc(guess ? guess.en : "?") + '</b>. Your station said <b>' + r.a.aqi + '</b> — ' + esc(real ? real.en : "?") + '.</div>' +
      '<dl class="sum">' +
      '<dt>My station</dt><dd>AQI ' + r.a.aqi + (r.a.pm25 !== null ? ' · PM2.5 ' + r.a.pm25 : ' · PM2.5 not shown') + ' · biggest: ' + esc(partName(r.a.big)) + (r.a.upd ? ' · updated ' + esc(r.a.upd) : '') + '</dd>' +
      (r.ref ? '<dt>Class station</dt><dd>AQI ' + r.ref.aqi + (r.ref.pm25 !== null && r.ref.pm25 !== undefined ? ' · PM2.5 ' + r.ref.pm25 : '') + '</dd>' : '') +
      (r.six ? '<dt>Six parts</dt><dd>' + PARTS.map(p => esc(p.en) + ' ' + (r.six[p.k] === null ? '–' : r.six[p.k])).join(' · ') + '</dd>' : '') +
      '<dt>Happening</dt><dd>' + esc(r.what.map(k => (WHAT.find(w => w[0] === k) || [0, k])[1]).join(", ")) + (r.note ? ' — ' + esc(r.note) : '') + '</dd>' +
      '</dl>' +
      (S.thumbs[n] ? '<img class="thumb" alt="Your sky photo" src="' + S.thumbs[n] + '">' : (r.photo ? '<p class="vn">Photo sent ✓</p>' : '')) +
      '<div class="book">Now write it in your book, page ' + esc(C.bookPage) + ', Day ' + n + ': <b>' + (r.a.pm25 !== null ? 'PM2.5 = ' + r.a.pm25 : 'AQI = ' + r.a.aqi) + '</b>. Viết vào sách trang ' + esc(C.bookPage) + '.</div>';
    const nx = nextOpenDay();
    if (nx) {
      const b = el("div", "btns"); const bb = el("button", "btn ghost", nx.label); bb.type = "button";
      bb.onclick = () => { SEL = nx.n; renderWeek(); renderDay(); window.scrollTo({ top: 0, behavior: "smooth" }); };
      b.appendChild(bb); card.appendChild(b);
    }
    return card;
  }
  function partName(k) { if (k === "notshown") return "can't tell"; const p = PARTS.find(x => x.k === k); return p ? p.en : "?"; }
  function nextOpenDay() {
    const t = Math.min(todayIndex(), C.days);
    for (let n = 1; n <= t; n++) if (!S.days[n]) return { n, label: n === todayIndex() ? "Go to today (Day " + n + ")" : "Catch up Day " + n };
    return null;
  }

  /* ───────── the station at all three times (saved by the app, a classmate, or estimated) ───────── */
  function allTimes(n, card, before) {
    if (!window.AWSYNC || !AWSYNC.available() || !window.AWST || !S.st || !S.st.uid) return;
    const date = dateOfDay(n), cs = CFG.classStation;
    const list = [[S.st.uid, "Your station"]];
    if (cs && cs.uid && cs.uid !== S.st.uid) list.push([cs.uid, "Class station"]);
    const box = el("div", "alltimes"); box.innerHTML = '<p class="vn">Loading the station numbers…</p>';
    if (before) card.insertBefore(box, before); else card.appendChild(box);
    Promise.all(list.map(([uid]) => Promise.all([AWSYNC.getPath("stationLog/s" + uid + "/" + date), AWSYNC.getPath("stationEst/s" + uid + "/" + date)]))).then(rs => {
      let any = false;
      const rows = rs.map(([log, est], i) => '<div class="atrow"><span class="atn">' + esc(list[i][1]) + '</span>' + AWST.SLOTS.map(sl => {
        const L = log && log[sl.k], E = est && est[sl.k];
        const mine = S.slot === sl.k ? " mine" : "";
        if (L && L.aqi != null) { any = true; const c = CAT(L.aqi); return '<span class="atc' + mine + '"><i>' + esc(sl.short) + '</i><b class="aqi" style="background:' + c.col + ';color:' + c.ink + '">' + L.aqi + '</b><small>' + (L.by === S.code ? "you" : L.src === "class" ? "a classmate" : "station record") + '</small></span>'; }
        if (E && E.aqi != null) { any = true; const c = CAT(E.aqi); return '<span class="atc est' + mine + '"><i>' + esc(sl.short) + '</i><b class="aqi" style="border-color:' + c.col + '">≈' + E.aqi + '</b><small>estimate</small></span>'; }
        return '<span class="atc none' + mine + '"><i>' + esc(sl.short) + '</i><b>–</b><small>' + (AWST.ended(date, sl, Date.now()) ? "no reading" : "later") + '</small></span>';
      }).join("") + '</div>').join("");
      box.innerHTML = '<b>All three times on ' + esc(pretty(date)) + '</b><p class="vn" style="margin:2px 0 6px">Compare the morning, after school and the evening. Your time is outlined. ≈ = an estimate from a computer model, not a measurement.</p>' + rows;
      if (!any && dayState(n) !== "today") box.innerHTML += '<p class="vn">No station numbers for this day yet.</p>';
    }).catch(() => { box.remove(); });
  }
  /* every open homework page helps: in each time window it saves every chosen station once */
  let registered = "";
  function registerStation() {
    if (!window.AWST || !window.AWSYNC || !AWSYNC.available() || !S.st || !S.st.uid) return;
    const rk = S.st.uid + "|" + ((CFG.classStation || {}).uid || "");
    if (rk === registered) return; registered = rk;
    const want = {}; want["s" + S.st.uid] = S.st.lat != null ? { name: S.st.name, lat: S.st.lat, lon: S.st.lon } : { name: S.st.name };
    const cs = CFG.classStation; if (cs && cs.uid) want["s" + cs.uid] = { name: cs.name, cls: true };
    AWST.syncMeta({ db: AWSYNC.stationDb(), want }).catch(() => {});
  }
  let collecting = false;
  function startCollector() {
    if (collecting || !window.AWST || !window.AWSYNC || !AWSYNC.available() || typeof fetch !== "function") return;
    collecting = true;
    const run = () => { const db = AWSYNC.stationDb(); if (!db) return; AWST.collect({ db, fetch: (u, o) => fetch(u, o), token: C.waqiToken, after: 30, src: "app", day1: C.day1, days: C.days, bounds: C.bounds, check: CK }).catch(() => {}); };
    setTimeout(run, 4000 + Math.random() * 20000);
    setInterval(run, 4 * 60000 + Math.random() * 60000);
  }

  /* ───────── my question for the lesson ───────── */
  function renderQuestion() {
    const w = $("#qWrap"); if (!w) return;
    w.innerHTML = "";
    if (!setupDone()) return;
    const q = S.q || {};
    const c = el("div", "card qcard");
    c.innerHTML = '<div class="eyebrow">For the lesson on ' + esc(C.lessonLabel) + ' · Cho tiết học</div><h2 style="font-size:22px">My question</h2>' +
      '<p class="vn" style="margin:4px 0 8px">What do you wonder about the air now? Write ONE question. You can change it any day before the lesson. In class, you and your partner choose one question to ask. · Em thắc mắc điều gì về không khí? Viết MỘT câu hỏi.</p>' +
      '<label>Start with one of these</label><div class="chips" id="qst"></div>' +
      '<label for="qtx">My question · Câu hỏi của em</label><textarea id="qtx" rows="2" maxlength="200" placeholder="What would happen if…"></textarea><div class="vn" id="qsaved"></div>';
    w.appendChild(c);
    const box = c.querySelector("#qst"), ta = c.querySelector("#qtx"), sv = c.querySelector("#qsaved");
    const paintQ = () => { const t = txt((S.q || {}).t); sv.innerHTML = t.length >= 8 ? '✓ Saved' + ((S.q || {}).at ? ' · ' + esc(new Date(S.q.at).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })) : '') + (/\?\s*$/.test(t) ? '' : ' · <b>End it with a question mark?</b>') : 'Write a full question (a few words or more).'; };
    STARTERS.forEach(st => {
      const b = el("button", "chip" + (q.st === st ? " on" : ""), esc(st)); b.type = "button";
      b.onclick = () => {
        S.q = Object.assign({}, S.q, { st, at: Date.now() });
        if (!txt(ta.value)) ta.value = st.replace("…", " ");
        S.q.t = ta.value; save(true);
        box.querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x === b));
        ta.focus(); paintQ();
      };
      box.appendChild(b);
    });
    ta.value = q.t || "";
    ta.oninput = () => { S.q = Object.assign({}, S.q, { t: ta.value, at: Date.now() }); save(true); paintQ(); };
    paintQ();
  }

  /* ───────── look back + hand in ───────── */
  function renderExtra() {
    const w = $("#extraWrap"); w.innerHTML = "";
    if (!setupDone()) return;
    const done = Object.keys(S.days).map(Number).filter(n => S.days[n]);
    const t = todayIndex();
    if (!(S.days[C.days] || t > C.days)) {
      w.appendChild(el("p", "vn", "Days saved: " + done.length + " of " + C.days + ". On Day " + C.days + " you will also look back at your whole week."));
      return;
    }
    const right = done.filter(n => { const r = S.days[n]; const c = CAT(r.a.aqi); return c && r.g.guess === c.k; }).length;
    let worst = null;
    done.forEach(n => { if (!worst || S.days[n].a.aqi > S.days[worst].a.aqi) worst = n; });
    const card = el("div", "card");
    const wr = worst ? S.days[worst] : null;
    card.innerHTML = '<div class="eyebrow">Look back at your week · Nhìn lại cả tuần</div>' +
      '<h2 style="font-size:22px">What did your week show?</h2>' +
      '<div class="ok" style="background:var(--soft);color:var(--text)">Your guesses were right on <b>' + right + ' of ' + done.length + '</b> ' + (done.length === 1 ? 'day' : 'days') + '.' +
      (wr ? '<br>Your worst day was <b>Day ' + worst + '</b> (' + esc(pretty(wr.date)) + '): AQI <b>' + wr.a.aqi + '</b>. You noted: ' + esc(wr.what.map(k => (WHAT.find(x => x[0] === k) || [0, k])[1]).join(", ")) + '.' : '') + '</div>' +
      '<label for="rf1">Why do you think Day ' + (worst || "?") + ' was the worst? · Vì sao?</label><input id="rf1" maxlength="200" placeholder="I think it was the worst because…">' +
      '<label for="rf2">What do your guesses tell you about looking at the sky?</label><input id="rf2" maxlength="200" placeholder="Looking at the sky… because…">' +
      '<p class="vn" style="margin-top:8px">Check <b>My question</b> above too — is it the question you want to ask on ' + esc(C.lessonLabel.split(",")[0]) + '?</p>' +
      '<div class="err" id="eR"></div>' +
      '<div class="btns"><button class="btn g" id="hand">' + (S.sub ? "Update my hand-in" : "Hand in my Air Watch") + '</button></div>' +
      (S.sub ? '<div class="ok">Handed in ' + new Date(S.subAt).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" }) + '. Bring your book on ' + esc(C.lessonLabel) + '.</div>' : '');
    w.appendChild(card);
    const r1 = card.querySelector("#rf1"), r2 = card.querySelector("#rf2");
    r1.value = S.refl.why || ""; r2.value = S.refl.look || "";
    r1.oninput = () => { S.refl.why = r1.value; S.refl.worst = worst; save(true); };
    r2.oninput = () => { S.refl.look = r2.value; save(true); };
    card.querySelector("#hand").onclick = () => {
      if (txt(S.refl.why).length < 8 || txt(S.refl.look).length < 8) { card.querySelector("#eR").textContent = "Write both sentences first."; return; }
      S.refl.right = right; S.refl.of = done.length; S.refl.worst = worst;
      S.sub = true; S.subAt = Date.now(); save(); push().then(() => renderExtra());
    };
  }

  /* ───────── photos ───────── */
  function compress(file, max, q) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s));
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
        res(c.toDataURL("image/jpeg", q));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("image")); };
      img.src = url;
    });
  }
  function makeThumb(dataUrl) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { const s = Math.min(1, 220 / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.6)); };
      img.onerror = rej; img.src = dataUrl;
    });
  }

  /* ───────── boot ───────── */
  function renderAll() { renderHeader(); renderSetup(); renderWeek(); renderDay(); renderQuestion(); renderExtra(); paintLive(); if (setupDone()) startCollector(); }
  if (window.AWSYNC) {
    AWSYNC.onError(() => paintLive());
    AWSYNC.watchConfig(c => { const before = JSON.stringify(CFG.classStation || null); CFG = c || {}; if (JSON.stringify(CFG.classStation || null) !== before) { renderDay(); registerStation(); } });
  }
  saveLocal();
  renderAll();
  /* my own link (…homework.html?code=ABC123) opens my log on any device */
  const linkCode = (/[?&]code=([A-Za-z0-9]{6})(?:&|$)/.exec(location.search) || [])[1];
  if (linkCode) { try { history.replaceState(null, "", location.pathname); } catch (e) {} }
  if (linkCode && linkCode.toUpperCase() !== S.code) loadCode(linkCode.toUpperCase(), null);
  else if (setupDone()) { push(); watchBack(); }
})();
