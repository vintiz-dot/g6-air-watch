/* My 7-Day Air Watch — student log (Grade 6, Lesson 6).
   Saves on the device as the student types, and to the teacher (Firebase)
   whenever a day is saved. */
(function () {
  "use strict";
  const C = window.AW, CAT = window.AW_CAT, CATS = window.AW_CATS, PARTS = window.AW_PARTS;
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
  const BLANK = { code: "", name: "", cls: "", area: "", slot: "", st: null, days: {}, drafts: {}, thumbs: {}, refl: {}, sub: false, subAt: 0, created: 0, started: false };
  let S;
  try { S = Object.assign({}, BLANK, JSON.parse(localStorage.getItem(K) || "{}")); } catch (e) { S = Object.assign({}, BLANK); }
  S.days = S.days || {}; S.drafts = S.drafts || {}; S.thumbs = S.thumbs || {}; S.refl = S.refl || {};
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
      n: txt(S.name), c: txt(S.cls), area: txt(S.area), slot: S.slot || "", st: S.st || null,
      days: S.days, refl: S.refl, sub: !!S.sub, subAt: S.subAt || 0,
      created: S.created || 0, up: Date.now(), build: C.build
    };
  }
  function push() {
    if (!window.AWSYNC || !AWSYNC.available() || txt(S.name).length < 2) { paintLive(); return Promise.resolve(false); }
    return AWSYNC.saveStudent(S.code, payload()).then(r => { paintLive(r); return r; });
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
      n = el("div", "note", "Your code is <b>" + esc(S.code) + "</b>. On another phone or computer, open this page and choose <b>Continue with my code</b>. Your week comes with you. · <span>Mã của em là " + esc(S.code) + ".</span>");
      n.id = "codeNote"; h.appendChild(n);
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
    const c = el("div", "card");
    c.innerHTML =
      '<div class="eyebrow">Start here · Bắt đầu</div><h2 style="font-size:22px">Set up your week (2 minutes)</h2>' +
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
      '<div class="err" id="setupErr"></div>' +
      '<div class="btns"><button class="btn g" id="startBtn">Start my Air Watch</button></div>';
    w.appendChild(c);

    const cont = el("div", "card");
    cont.innerHTML = '<div class="eyebrow">Already started on another phone or computer?</div>' +
      '<div class="row2"><div><label for="cc">Your code · Mã của em</label><input id="cc" maxlength="6" placeholder="K7Q2MX" style="text-transform:uppercase"></div>' +
      '<div style="align-self:end"><button class="btn ghost" id="ccBtn">Continue with my code</button></div></div><div class="err" id="ccErr"></div>';
    w.appendChild(cont);

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
      S.started = true; save(); push();
      renderAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    $("#ccBtn").onclick = () => {
      const code = txt($("#cc").value).toUpperCase();
      const e = $("#ccErr");
      if (!/^[A-Z0-9]{6}$/.test(code)) { e.textContent = "Your code has 6 letters or numbers."; return; }
      if (!window.AWSYNC || !AWSYNC.available()) { e.textContent = "Cannot reach your teacher's page right now. Check the internet and try again."; return; }
      e.textContent = "Loading…";
      AWSYNC.getStudent(code).then(v => {
        if (!v) { e.textContent = "No Air Watch found with that code."; return; }
        S = Object.assign({}, BLANK, { code, name: v.n || "", cls: v.c || "", area: v.area || "", slot: v.slot || "", st: v.st || null, days: v.days || {}, refl: v.refl || {}, sub: !!v.sub, subAt: v.subAt || 0, created: v.created || Date.now(), started: true });
        saveLocal(); lastPushOk = true; renderAll(); paintLive(true);
      });
    };
  }

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
      stationCache = list.filter(s => s.ageH === null || s.ageH <= 72);
      m.textContent = stationCache.length + " stations. Tap the one nearest your home.";
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
    S.st = { uid: s.uid, name: s.name, custom: false, url: WAQI.link(s.uid), parts: [] };
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
    if (S.days[n]) { w.appendChild(summaryCard(n)); return; }
    w.appendChild(formCard(n, st === "missed"));
  }

  function catChip(c, on) {
    const b = el("button", "chip cat" + (on ? " on" : ""), esc(c.en) + '<small style="color:inherit;opacity:.85">' + esc(c.vn) + '</small>');
    b.type = "button"; b.style.background = c.col; b.style.color = c.ink;
    return b;
  }

  function formCard(n, late) {
    const d = draftOf(n);
    const card = el("div", "card");
    const head = el("div");
    head.innerHTML = '<div class="eyebrow">Day ' + n + ' · ' + esc(pretty(dateOfDay(n))) + '</div>' +
      '<h2 style="font-size:22px">Look first. Then check.</h2>' +
      (late ? '<div class="note">Catching up. That is fine — this day will show as <b>entered late</b>, so be honest: only fill it in if you checked on that day (for example, you wrote it in your book).</div>' : '');
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
      '<div class="row2"><div><label for="aqi">AQI (the big number)</label><input id="aqi" type="number" inputmode="numeric" min="0" max="999"></div>' +
      '<div><label for="upd">Time on the page ("Updated…")</label><input id="upd" type="time"></div></div>' +
      (six ? '<label>Day ' + n + ' bonus: write ALL six parts. Tick “not shown” if your station does not show one.</label><div class="row3" id="sixBox"></div>'
        : '<div class="row2"><div><label for="pm">PM2.5</label><input id="pm" type="number" inputmode="numeric" min="0" max="999"></div>' +
          '<div style="align-self:end"><label style="font-weight:500"><input type="checkbox" id="pmna"> PM2.5 not shown</label></div></div>') +
      '<label>Which part is the biggest today?</label><div class="chips" id="big"></div><div class="err" id="e2"></div>';
    card.appendChild(s2);
    const aqi = s2.querySelector("#aqi"), upd = s2.querySelector("#upd");
    aqi.value = d.aqi ?? ""; upd.value = d.upd || "";
    aqi.oninput = () => { d.aqi = aqi.value; save(); };
    upd.oninput = () => { d.upd = upd.value; save(); };
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
        c.onchange = () => { d.six[p.k] = { v: "", na: c.checked }; i.disabled = c.checked; if (c.checked) i.value = ""; save(); };
        box.appendChild(cell);
      });
    } else {
      const pm = s2.querySelector("#pm"), na = s2.querySelector("#pmna");
      pm.value = d.pm25 ?? ""; na.checked = !!d.pm25na; pm.disabled = !!d.pm25na;
      pm.oninput = () => { d.pm25 = pm.value; save(); };
      na.onchange = () => { d.pm25na = na.checked; pm.disabled = na.checked; if (na.checked) { pm.value = ""; d.pm25 = ""; } save(); };
    }
    const bigBox = s2.querySelector("#big");
    PARTS.concat([{ k: "notshown", en: "Can't tell" }]).forEach(p => {
      const b = el("button", "chip" + (d.big === p.k ? " on" : ""), esc(p.en)); b.type = "button";
      b.onclick = () => { d.big = p.k; save(); bigBox.querySelectorAll(".chip").forEach(x => x.classList.remove("on")); b.classList.add("on"); };
      bigBox.appendChild(b);
    });

    /* step 3 — class station */
    const cs = CFG.classStation;
    const same = cs && S.st && cs.uid && S.st.uid === cs.uid;
    let s3 = null;
    if (cs && cs.name && !same) {
      s3 = el("div", "step");
      s3.innerHTML = '<h3><span class="num">3</span>Check the class station</h3>' +
        '<p class="how">Everyone in the class checks this one too: <b>' + esc(cs.name) + '</b>' + (cs.url ? ' · <a href="' + esc(cs.url) + '" target="_blank" rel="noopener">open it</a>' : '') + '</p>' +
        '<div class="row2"><div><label for="raqi">AQI</label><input id="raqi" type="number" inputmode="numeric" min="0" max="999"></div>' +
        '<div><label for="rpm">PM2.5 (leave empty if not shown)</label><input id="rpm" type="number" inputmode="numeric" min="0" max="999"></div></div><div class="err" id="e3"></div>';
      card.appendChild(s3);
      const ra = s3.querySelector("#raqi"), rp = s3.querySelector("#rpm");
      ra.value = d.raqi ?? ""; rp.value = d.rpm25 ?? "";
      ra.oninput = () => { d.raqi = ra.value; save(); };
      rp.oninput = () => { d.rpm25 = rp.value; save(); };
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
    ph.onchange = () => {
      const f = ph.files && ph.files[0]; if (!f) return;
      prev.textContent = "Getting your photo ready…";
      compress(f, 900, 0.62).then(u => { d.photo = u; save(); prev.innerHTML = '<img class="thumb" alt="Your sky photo" src="' + u + '">'; })
        .catch(() => { prev.textContent = "That photo did not work. Try another one, or skip it."; });
    };

    /* save */
    const sv = el("div", "btns"); const sb = el("button", "btn g", "Save Day " + n); sb.type = "button"; sv.appendChild(sb); card.appendChild(sv);
    const eS = el("div", "err"); card.appendChild(eS);
    sb.onclick = () => {
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
      if (s3) {
        rA = int(d.raqi);
        if (rA === null || rA < 0 || rA > 999) return bad(s3.querySelector("#raqi"), "Type the class station's AQI.", s3.querySelector("#e3"));
        rP = int(d.rpm25);
      }
      if (!d.what.length) return bad(null, "Tick at least one thing (or “Nothing special”).", s4.querySelector("#e4"));
      const now = Date.now();
      const isLate = hanoiDate(new Date(now)) !== dateOfDay(n);
      const rec = {
        date: dateOfDay(n), at: now, late: isLate,
        g: { sky: d.sky, guess: d.guess, at: d.gAt },
        a: { aqi: A, pm25: pm25, pm25na: six ? (sixOut.pm25 === null) : !!d.pm25na, big: d.big, upd: d.upd || "" },
        what: d.what.slice(), note: txt(d.note), photo: !!d.photo
      };
      if (six) rec.six = sixOut;
      if (s3) rec.ref = { aqi: rA, pm25: rP, uid: CFG.classStation.uid || null };
      else if (same) rec.ref = { aqi: A, pm25: pm25, uid: CFG.classStation.uid || null, same: true };
      sb.disabled = true; sb.textContent = "Saving…";
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
  function renderAll() { renderHeader(); renderSetup(); renderWeek(); renderDay(); renderExtra(); paintLive(); }
  if (window.AWSYNC) {
    AWSYNC.onError(() => paintLive());
    AWSYNC.watchConfig(c => { const before = JSON.stringify(CFG.classStation || null); CFG = c || {}; if (JSON.stringify(CFG.classStation || null) !== before) renderDay(); });
  }
  saveLocal();
  renderAll();
  if (setupDone()) push();
})();
