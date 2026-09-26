/* Air Watch — station readings for every chosen station at all three times of day.
   One file for the homework pages, the lesson pages and the GitHub job (tools/air-watch-readings.mjs).

   Firebase, room G6HW6:
     stationMeta/s{uid}               { name, lat, lon, cls }
     stationLog/s{uid}/{date}/{slot}  real readings { aqi, pm25, pm10, o3, no2, so2, co, dom, t, at, src, by }
                                      src: "app" (a homework page saved it) · "gh" (the GitHub job) · "class" (copied from a student's log)
     stationEst/s{uid}/{date}/{slot}  computer-model estimates { aqi, pm25, pm10, c25, c10, at, src: "cams" }
     stationEstAt                     when the estimates were last refreshed
     stationHist/s{uid}/{date}/t{HHMM} every reading a page or the job saw, by the station's own clock { aqi, pm25, t, at }
                                      (the checker compares students' numbers with these)
     roster/{code}                    { n, c, st, d, up }   — lets a student find their log again
     moved/{code}                     the code a log was merged into
     sentBack/{code}/{day}            { at, why, was }      — the teacher sent a day back to be redone

   Readings are AQI numbers on the US EPA scale, the same scale aqicn.org shows.
   Estimates come from Open-Meteo (CAMS model, CC BY 4.0) and are always marked "estimate".
   Station numbers can be negative (stations from other networks, e.g. -477292). */
(function (root, factory) {
  const M = factory();
  if (typeof module === "object" && module.exports) module.exports = M;
  else root.AWST = M;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* the three time windows (minutes after midnight, Hanoi time) */
  const SLOTS = [
    { k: "am",  from: 390,  to: 450,  hours: [6, 7],   en: "Morning",      short: "Morning" },
    { k: "pm",  from: 990,  to: 1050, hours: [16, 17], en: "After school", short: "After school" },
    { k: "eve", from: 1140, to: 1200, hours: [19, 20], en: "Evening",      short: "Evening" }
  ];
  const OFF = 7 * 3600e3; /* Hanoi is UTC+7 all year */
  const key = uid => "s" + uid;
  const uidOf = k => String(k).replace(/^s/, "");
  const num = v => (v === null || v === undefined || v === "" || v === "-" || !isFinite(+v)) ? null : +v;
  const clean = o => { const r = {}; Object.keys(o).forEach(k => { if (o[k] !== undefined && o[k] !== null && !(typeof o[k] === "number" && !isFinite(o[k]))) r[k] = o[k]; }); return r; };

  function hanoi(ms) { const d = new Date((ms == null ? Date.now() : ms) + OFF); return { date: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() }; }
  function slotAt(min, before, after) { return SLOTS.find(s => min >= s.from - (before || 0) && min <= s.to + (after || 0)) || null; }
  function slotOf(k) { return SLOTS.find(s => s.k === k) || null; }
  function dates(day1, days) {
    const p = String(day1).split("-").map(Number), out = [];
    for (let i = 0; i < days; i++) out.push(new Date(Date.UTC(p[0], p[1] - 1, p[2]) + i * 864e5).toISOString().slice(0, 10));
    return out;
  }
  function hm(s) { const m = /^(\d{1,2})[:.h](\d{2})/.exec(String(s || "").trim()); if (!m) return null; const h = +m[1], mi = +m[2]; return h < 24 && mi < 60 ? h * 60 + mi : null; }
  function ended(date, slot, now) { const h = hanoi(now); return date < h.date || (date === h.date && h.min > slot.to); }
  function nextWindow(now) {
    const h = hanoi(now);
    for (const s of SLOTS) if (h.min <= s.to + 30) return { date: h.date, slot: s, open: h.min >= s.from };
    return { date: null, slot: SLOTS[0], open: false, tomorrow: true };
  }
  function distanceKm(a, b) {
    const R = 6371, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /* ───────── US EPA AQI from a concentration (µg/m³) ───────── */
  const BP25 = [[0, 12, 0, 50], [12.1, 35.4, 51, 100], [35.5, 55.4, 101, 150], [55.5, 150.4, 151, 200], [150.5, 250.4, 201, 300], [250.5, 350.4, 301, 400], [350.5, 500.4, 401, 500]];
  const BP10 = [[0, 54, 0, 50], [55, 154, 51, 100], [155, 254, 101, 150], [255, 354, 151, 200], [355, 424, 201, 300], [425, 504, 301, 400], [505, 604, 401, 500]];
  function subIndex(c, bp, dec) {
    if (c == null || !isFinite(c) || c < 0) return null;
    const f = Math.pow(10, dec); c = Math.floor(c * f) / f;
    for (const [cl, ch, il, ih] of bp) if (c <= ch) return Math.round((ih - il) / (ch - cl) * (c - cl) + il);
    return 500;
  }
  const aqiPM25 = c => subIndex(c, BP25, 1), aqiPM10 = c => subIndex(c, BP10, 0);

  /* ───────── the World Air Quality Index API (one station) ───────── */
  async function waqiFeed(fetchFn, token, uid, base) {
    const r = await fetchFn((base || "https://api.waqi.info") + "/feed/@" + uid + "/?token=" + encodeURIComponent(token || ""));
    const j = await r.json();
    if (!j || j.status !== "ok" || !j.data) throw new Error((j && j.data) || "no data");
    const d = j.data, i = d.iaqi || {}, v = k => (i[k] ? num(i[k].v) : null);
    const iso = d.time ? (d.time.iso || (d.time.s ? d.time.s.replace(" ", "T") + (d.time.tz || "+07:00") : null)) : null;
    return {
      uid: d.idx != null ? d.idx : uid, name: (d.city && d.city.name) || null,
      geo: d.city && Array.isArray(d.city.geo) ? d.city.geo.map(Number) : null,
      aqi: num(d.aqi), pm25: v("pm25"), pm10: v("pm10"), o3: v("o3"), no2: v("no2"), so2: v("so2"), co: v("co"),
      dom: d.dominentpol || null, t: iso, tms: iso ? Date.parse(iso) : NaN
    };
  }
  /* every station in the Hanoi box with its AQI now (null = the page shows "–", no data) */
  async function waqiBounds(fetchFn, token, b, base) {
    const r = await fetchFn((base || "https://api.waqi.info") + "/v2/map/bounds?latlng=" + (b || [20.85, 105.65, 21.2, 106.05]).join(",") + "&networks=all&token=" + encodeURIComponent(token || ""));
    const j = await r.json();
    if (!j || j.status !== "ok" || !Array.isArray(j.data)) throw new Error("no station list");
    return j.data.map(s => {
      const iso = s.station && s.station.time;
      return { uid: s.uid, name: (s.station && s.station.name) || ("Station " + s.uid), aqi: num(s.aqi), tms: iso ? Date.parse(iso) : NaN, lat: num(s.lat), lon: num(s.lon) };
    });
  }

  /* ───────── 1 · save every chosen station for the time window we are in ───────── */
  async function collect(o) {
    const now = o.now || Date.now(), h = hanoi(now), sl = slotAt(h.min, 0, o.after == null ? 30 : o.after);
    const res = { date: h.date, slot: sl ? sl.k : null, saved: 0, had: 0, stale: 0, failed: 0 };
    if (!sl) return res;
    if (o.day1 && o.days) { const ds = dates(o.day1, o.days); if (h.date < ds[0] || h.date > ds[ds.length - 1]) { res.slot = null; return res; } }
    const meta = (await o.db.get("stationMeta")) || {};
    const uids = (o.stations || Object.keys(meta).map(uidOf)).map(String).filter(u => /^-?\d+$/.test(u));
    /* with the Hanoi list we can also skip stations that are not working (no AQI, or far below all the others) */
    const list = o.bounds ? await waqiBounds(o.fetch, o.token, o.bounds, o.waqiBase).catch(() => null) : null;
    for (const uid of uids) {
      const path = "stationLog/" + key(uid) + "/" + h.date + "/" + sl.k;
      const have = await o.db.get(path);
      const hasSlot = !!(have && have.aqi != null && have.src !== "class");
      if (hasSlot) {
        /* the window is saved; still note a fresh reading every 20 minutes for the checker */
        const hist = (await o.db.get("stationHist/" + key(uid) + "/" + h.date)) || {};
        const last = Math.max(0, ...Object.values(hist).map(x => (x && x.at) || 0));
        if (now - last < 20 * 60000) { res.had++; continue; }
      }
      try {
        const f = await waqiFeed(o.fetch, o.token, uid, o.waqiBase);
        if (f.aqi == null || (list && isBroken(f, list, o.check, now))) { res.failed++; continue; }
        const stale = isFinite(f.tms) && (now - f.tms > 3 * 3600e3 || hanoi(f.tms).date !== h.date);
        if (!stale) await saveHist(o.db, uid, f, now);
        if (hasSlot) { res.had++; continue; }
        if (stale) { res.stale++; continue; }
        await o.db.set(path,
          clean({ aqi: f.aqi, pm25: f.pm25, pm10: f.pm10, o3: f.o3, no2: f.no2, so2: f.so2, co: f.co, dom: f.dom, t: f.t, at: now, src: o.src || "app" }));
        const m = meta[key(uid)] || {};
        if (f.geo && (m.lat == null || m.lon == null)) await o.db.update("stationMeta/" + key(uid), clean({ lat: f.geo[0], lon: f.geo[1], name: m.name || f.name }));
        res.saved++;
      } catch (e) { res.failed++; }
    }
    return res;
  }

  /* ───────── 2 · readings students typed on time (shared with classmates) ───────── */
  function readingSlot(d) {
    const m = hm(d && d.a && d.a.upd);
    if (m != null) { const s = slotAt(m, 60, 60); return s ? s.k : null; }
    if (!d || !d.at) return null;
    const h = hanoi(d.at); if (h.date !== d.date) return null;
    const s = slotAt(h.min, 60, 60); return s ? s.k : null;
  }
  /* readings students typed on time — only numbers that match the station (ctx: { log, hist, est, check, now }) */
  function studentReadings(students, ctx) {
    const out = [];
    Object.keys(students || {}).forEach(code => {
      const s = students[code] || {}, days = s.days || {};
      Object.keys(days).forEach(n => {
        const d = days[n];
        if (!d || !d.a || d.late || !d.date) return;
        const sl = readingSlot(d); if (!sl) return;
        const V = ctx ? verdict(s, d, ctx) : null, fine = f => !V || !V.j[f] || V.j[f].ok !== false;
        const uid = dayStation(s, d);
        if (uid != null && num(d.a.aqi) != null && fine("aqi")) out.push({ uid, date: d.date, slot: sl, aqi: num(d.a.aqi), pm25: fine("pm25") ? num(d.a.pm25) : null, code, at: d.at || 0, kind: "home" });
        if (d.ref && d.ref.uid != null && num(d.ref.aqi) != null && !d.ref.same && fine("raqi")) out.push({ uid: d.ref.uid, date: d.date, slot: sl, aqi: num(d.ref.aqi), pm25: num(d.ref.pm25), code, at: d.at || 0, kind: "class" });
      });
    });
    return out.sort((a, b) => a.at - b.at);
  }
  /* share believable readings with classmates at the same station; take back copies that no longer match */
  async function copyClassmates(o) {
    const log = o.log || (await o.db.get("stationLog")) || {};
    const ctx = { log, hist: o.hist || (await o.db.get("stationHist")) || {}, est: o.est || (await o.db.get("stationEst")) || {}, check: o.check, now: o.now || Date.now() };
    const rs = studentReadings(o.students, ctx), ok = {}, want = {}, upd = {};
    rs.forEach(r => { ok[key(r.uid) + "/" + r.date + "/" + r.slot + "|" + r.code] = r; });
    Object.keys(log).forEach(k => Object.keys(log[k] || {}).forEach(d => Object.keys(log[k][d] || {}).forEach(sl => {
      const x = log[k][d][sl], p = k + "/" + d + "/" + sl;
      if (!x || x.src !== "class") return;
      if (ok[p + "|" + x.by]) want[p] = "keep"; else upd[p] = null;
    })));
    rs.forEach(r => {
      const p = key(r.uid) + "/" + r.date + "/" + r.slot, [k, d, sl] = [key(r.uid), r.date, r.slot];
      const have = log[k] && log[k][d] && log[k][d][sl];
      if (want[p] || (have && have.src !== "class")) return;
      want[p] = r; upd[p] = clean({ aqi: r.aqi, pm25: r.pm25, at: r.at, src: "class", by: r.code });
    });
    const n = Object.keys(upd).length;
    if (n) await o.db.update("stationLog", upd);
    return Object.keys(upd).filter(p => upd[p] !== null).length;
  }

  /* ───────── 3 · every station anyone chose, plus the class station ───────── */
  function stationsOf(students, cfg) {
    const m = {};
    Object.keys(students || {}).forEach(c => { const s = students[c]; if (s && s.st && s.st.uid) m[key(s.st.uid)] = clean({ name: s.st.name, lat: num(s.st.lat), lon: num(s.st.lon) }); });
    const cs = cfg && cfg.classStation;
    if (cs && cs.uid) m[key(cs.uid)] = Object.assign(m[key(cs.uid)] || {}, clean({ name: cs.name, cls: true }));
    return m;
  }
  async function syncMeta(o) {
    const meta = (await o.db.get("stationMeta")) || {}, want = o.want || stationsOf(o.students, o.cfg), upd = {};
    Object.keys(want).forEach(k => {
      const w = want[k], m = meta[k];
      if (!m) { upd[k] = w; return; }
      if (w.name && !m.name) upd[k + "/name"] = w.name;
      if (w.lat != null && m.lat == null) { upd[k + "/lat"] = w.lat; upd[k + "/lon"] = w.lon; }
      if (w.cls && !m.cls) upd[k + "/cls"] = true;
    });
    if (Object.keys(upd).length) await o.db.update("stationMeta", upd);
    return Object.keys(want).length;
  }

  /* ───────── 4 · estimates for the gaps (Open-Meteo, CAMS model) ───────── */
  async function estimate(o) {
    const now = o.now || Date.now(), today = hanoi(now).date;
    const ds = dates(o.day1, o.days).filter(d => d <= today);
    const res = { stations: 0, cells: 0, failed: 0 };
    if (!ds.length) return res;
    const meta = (await o.db.get("stationMeta")) || {};
    for (const k of Object.keys(meta)) {
      const m = meta[k] || {};
      if (num(m.lat) == null || num(m.lon) == null) continue;
      try {
        const url = (o.omBase || "https://air-quality-api.open-meteo.com") + "/v1/air-quality?latitude=" + m.lat + "&longitude=" + m.lon +
          "&hourly=pm10,pm2_5&timezone=Asia%2FBangkok&start_date=" + ds[0] + "&end_date=" + ds[ds.length - 1];
        const j = await (await o.fetch(url)).json();
        const H = j && j.hourly;
        if (!H || !Array.isArray(H.time)) { res.failed++; continue; }
        const upd = {};
        ds.forEach(d => SLOTS.forEach(sl => {
          if (!ended(d, sl, now)) return;
          const e = slotEstimate(H, d, sl);
          if (!e) return;
          upd[d + "/" + sl.k] = Object.assign(e, { at: now, src: "cams" });
          res.cells++;
        }));
        if (Object.keys(upd).length) await o.db.update("stationEst/" + k, upd);
        res.stations++;
      } catch (e) { res.failed++; }
    }
    await o.db.set("stationEstAt", now);
    return res;
  }
  /* one time window from Open-Meteo's hourly data: the average of its hours, as AQI numbers */
  function slotEstimate(H, d, sl) {
    if (!H || !Array.isArray(H.time)) return null;
    const at = {}; H.time.forEach((t, i) => { at[t] = i; });
    const idx = sl.hours.map(hh => at[d + "T" + String(hh).padStart(2, "0") + ":00"]).filter(i => i != null);
    const avg = arr => { const v = idx.map(i => arr ? num(arr[i]) : null).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const c25 = avg(H.pm2_5), c10 = avg(H.pm10), a25 = aqiPM25(c25), a10 = aqiPM10(c10);
    if (a25 == null && a10 == null) return null;
    return clean({ aqi: Math.max(a25 == null ? 0 : a25, a10 == null ? 0 : a10), pm25: a25, pm10: a10,
      c25: c25 == null ? null : Math.round(c25 * 10) / 10, c10: c10 == null ? null : Math.round(c10) });
  }
  /* an estimate for one station, day and window, straight from Open-Meteo (the checker's last resort) */
  async function estimateAt(o) {
    const sl = slotOf(o.slot);
    if (!sl || num(o.lat) == null || num(o.lon) == null) return null;
    const url = (o.omBase || "https://air-quality-api.open-meteo.com") + "/v1/air-quality?latitude=" + o.lat + "&longitude=" + o.lon +
      "&hourly=pm10,pm2_5&timezone=Asia%2FBangkok&start_date=" + o.date + "&end_date=" + o.date;
    const j = await (await o.fetch(url)).json();
    return slotEstimate(j && j.hourly, o.date, sl);
  }

  /* ───────── 5 · checking a student's number against the station ─────────
     A number passes when it is within `tol` points of a reading of that station around the time
     the student looked (the live reading, the saved window, or the history). A past day with no
     saved reading is compared with the model estimate, with a wide margin: only numbers far off
     are rejected. Nothing to compare with → ok: null ("not checked"). */
  const CHECK = { tol: 10, estLow: 0.25, estHigh: 3, estPad: 10, brokenShare: 0.33 };
  const checkCfg = c => Object.assign({}, CHECK, c || {});
  function histSpot(f, now) {
    const h = hanoi(isFinite(f.tms) ? f.tms : now);
    return { date: h.date, k: "t" + String(Math.floor(h.min / 60)).padStart(2, "0") + String(h.min % 60).padStart(2, "0") };
  }
  async function saveHist(db, uid, f, now) {
    if (!db || !f || f.aqi == null) return false;
    now = now || Date.now();
    const s = histSpot(f, now);
    await db.set("stationHist/" + key(uid) + "/" + s.date + "/" + s.k, clean({ aqi: f.aqi, pm25: f.pm25, t: f.t, at: now }));
    return true;
  }
  const histMin = k => { const m = /^t(\d\d)(\d\d)$/.exec(k); return m ? +m[1] * 60 + +m[2] : null; };
  /* the readings a number for (station, day, window) can be compared with */
  function refs(o) {
    const k = key(o.uid), sl = slotOf(o.slot), now = o.now || Date.now(), today = hanoi(now).date === o.date;
    const real = [];
    if (today) (o.live || []).forEach(f => { if (f && f.aqi != null) real.push({ aqi: f.aqi, pm25: f.pm25 == null ? null : f.pm25, by: "live" }); });
    /* when the student could have looked: their window, the "Updated" time they typed, and from locking the guess to saving */
    const wins = [];
    if (sl) wins.push([sl.from - 60, sl.to + 60]);
    if (o.upd != null) wins.push([o.upd - 30, o.upd + 30]);
    const from = o.from ? hanoi(o.from) : null, to = hanoi(o.at || now);
    if (from && from.date === o.date) wins.push([from.min - 90, to.date === o.date ? to.min + 10 : 1440]);
    else if (to.date === o.date) wins.push([to.min - 90, to.min + 10]);
    const inWin = m => m != null && wins.some(w => m >= w[0] && m <= w[1]);
    const H = o.hist && o.hist[k] && o.hist[k][o.date];
    if (H) Object.keys(H).forEach(t => { const x = H[t]; if (x && x.aqi != null && inWin(histMin(t))) real.push({ aqi: x.aqi, pm25: x.pm25 == null ? null : x.pm25, by: "record" }); });
    const L = o.log && o.log[k] && o.log[k][o.date];
    if (L) Object.keys(L).forEach(s2 => {
      const x = L[s2]; if (!x || x.aqi == null || x.src === "class") return;
      const tm = x.t && isFinite(Date.parse(x.t)) ? hanoi(Date.parse(x.t)) : null;
      if (s2 === o.slot || (tm && tm.date === o.date && inWin(tm.min))) real.push({ aqi: x.aqi, pm25: x.pm25 == null ? null : x.pm25, by: "record" });
    });
    const E = o.est && o.est[k] && o.est[k][o.date] && o.est[k][o.date][o.slot];
    return { real, est: E && E.aqi != null ? { aqi: E.aqi, pm25: E.pm25 == null ? null : E.pm25 } : null };
  }
  function judge(v, R, field, cfg) {
    cfg = checkCfg(cfg); v = num(v);
    if (v == null || !R) return { ok: null, by: null, r: null };
    const vals = (R.real || []).filter(x => x[field] != null);
    if (vals.length) {
      let best = vals[0];
      vals.forEach(x => { if (Math.abs(x[field] - v) < Math.abs(best[field] - v)) best = x; });
      return { ok: Math.abs(best[field] - v) <= cfg.tol, by: best.by, r: best[field] };
    }
    const e = R.est && R.est[field] != null ? R.est[field] : null;
    if (e != null) return { ok: v >= e * cfg.estLow - cfg.estPad && v <= e * cfg.estHigh + cfg.estPad, by: "est", r: e };
    return { ok: null, by: null, r: null };
  }
  /* a station that is not working: its page shows no AQI ("–"), or its number is far below every other station in Hanoi */
  function isBroken(f, list, cfg, now) {
    if (!f) return false;
    if (num(f.aqi) == null) return true;
    const med = hanoiMedian(list, f.uid, now);
    return med != null && f.aqi < med * checkCfg(cfg).brokenShare;
  }
  function hanoiMedian(list, skip, now) {
    now = now || Date.now();
    const v = (list || []).filter(s => String(s.uid) !== String(skip) && s.aqi != null && (!isFinite(s.tms) || now - s.tms < 3 * 3600e3)).map(s => s.aqi).sort((a, b) => a - b);
    return v.length >= 3 ? v[Math.floor(v.length / 2)] : null;
  }
  /* the working stations nearest to a place (for a student whose station stopped working) */
  function nearestWorking(list, from, n, cfg, now) {
    const ok = (list || []).filter(s => s.lat != null && s.lon != null && !isBroken(s, list, cfg, now) && (!isFinite(s.tms) || (now || Date.now()) - s.tms < 6 * 3600e3));
    return ok.map(s => Object.assign({}, s, { km: from && from.lat != null ? distanceKm(from, s) : null }))
      .sort((a, b) => (a.km == null ? 1e9 : a.km) - (b.km == null ? 1e9 : b.km)).slice(0, n || 5);
  }
  /* which station a saved day was measured at (a student may have switched from a broken one) */
  function dayStation(s, d) {
    if (d && d.a && d.a.st != null) return String(d.a.st);
    const prev = s && s.stPrev ? (Array.isArray(s.stPrev) ? s.stPrev : Object.values(s.stPrev)) : [];
    const hit = prev.filter(p => p && p.until && d && d.at && d.at < p.until).sort((a, b) => a.until - b.until)[0];
    if (hit && hit.uid != null) return String(hit.uid);
    return s && s.st && s.st.uid != null ? String(s.st.uid) : null;
  }
  /* is a saved day believable? v: "ok" · "bad" (a number does not match the station) · "none" (nothing to compare with)
     ctx: { log, hist, est, check, now }. Numbers the student's page already checked live are trusted. */
  function verdict(s, d, ctx) {
    ctx = ctx || {};
    const out = { v: "none", bad: [], j: {}, by: null };
    if (!s || !d || !d.a) return out;
    const saved = d.chk || {}, now = ctx.now || Date.now();
    const base = { date: d.date, slot: s.slot || "am", now, log: ctx.log, hist: ctx.hist, est: ctx.est, upd: hm(d.a.upd), from: d.g && d.g.at, at: d.at };
    const test = (field, v, uid, prev) => {
      if (v == null || uid == null) return null;
      if (prev && prev.ok === true) return { ok: true, by: prev.by || "live", r: prev.r == null ? null : prev.r };
      return judge(v, refs(Object.assign({ uid }, base)), field, ctx.check);
    };
    const uid = dayStation(s, d);
    out.j.aqi = test("aqi", num(d.a.aqi), uid, saved.aqi);
    out.j.pm25 = d.a.pm25na ? null : test("pm25", num(d.a.pm25), uid, saved.pm25);
    out.j.raqi = d.ref && !d.ref.same && d.ref.uid != null ? test("aqi", num(d.ref.aqi), String(d.ref.uid), saved.raqi) : null;
    Object.keys(out.j).forEach(f => { const x = out.j[f]; if (x && x.ok === false) out.bad.push({ f, got: f === "raqi" ? d.ref.aqi : d.a[f], r: x.r, by: x.by }); });
    out.by = out.j.aqi ? out.j.aqi.by : null;
    out.v = out.bad.length ? "bad" : (out.j.aqi && out.j.aqi.ok === true) ? "ok" : "none";
    return out;
  }

  /* ───────── reading the data back ───────── */
  function cell(log, est, uid, date, slot) {
    const k = key(uid);
    const L = log && log[k] && log[k][date] && log[k][date][slot];
    if (L && L.aqi != null) return { aqi: L.aqi, pm25: L.pm25 == null ? null : L.pm25, src: L.src === "class" ? "class" : "auto", t: L.t || null };
    const E = est && est[k] && est[k][date] && est[k][date][slot];
    if (E && E.aqi != null) return { aqi: E.aqi, pm25: E.pm25 == null ? null : E.pm25, src: "est" };
    return null;
  }
  function week(log, est, uid, day1, days) {
    return dates(day1, days).map(d => { const r = { date: d }; SLOTS.forEach(s => { r[s.k] = uid ? cell(log, est, uid, d, s.k) : null; }); return r; });
  }
  /* how complete the week is for each station, counting only windows that have passed */
  function coverage(log, est, uids, day1, days, now) {
    return uids.map(uid => {
      const c = { uid, real: 0, est: 0, none: 0 };
      dates(day1, days).forEach(d => SLOTS.forEach(s => {
        if (!ended(d, s, now)) return;
        const x = cell(log, est, uid, d, s.k);
        if (!x) c.none++; else if (x.src === "est") c.est++; else c.real++;
      }));
      return c;
    });
  }
  const SRC = { own: "own reading", auto: "station record", class: "classmate's reading", est: "estimate" };

  /* ───────── finding a student's log again ───────── */
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function nameScore(q, n) {
    const a = norm(q).split(" ").filter(Boolean), b = norm(n).split(" ").filter(Boolean);
    if (!a.length || !b.length) return 0;
    const hit = a.filter(x => b.includes(x)).length;
    if (!hit) return 0;
    return hit / Math.max(a.length, b.length) + (a.join(" ") === b.join(" ") ? 1 : 0);
  }
  function findInRoster(roster, name, cls) {
    const c = norm(cls).replace(/ /g, "");
    return Object.keys(roster || {}).map(code => {
      const r = roster[code] || {};
      let s = nameScore(name, r.n);
      if (s && c && norm(r.c).replace(/ /g, "") === c) s += 0.5;
      return Object.assign({ code, score: s }, r);
    }).filter(r => r.score > 0).sort((x, y) => y.score - x.score || (y.d || 0) - (x.d || 0)).slice(0, 6);
  }
  function rosterEntry(s) {
    const days = s.days || {};
    return clean({ n: s.n || s.name || "", c: s.c || s.cls || "", st: s.st && s.st.name ? s.st.name : "", d: Object.keys(days).filter(k => days[k]).length, up: s.up || Date.now() });
  }
  /* join two copies of one student's week: keep the entry saved on the day, then the earlier one */
  function mergeDays(a, b) {
    const out = Object.assign({}, a || {});
    Object.keys(b || {}).forEach(n => {
      const x = out[n], y = b[n];
      if (!y) return;
      if (!x) { out[n] = y; return; }
      if ((x.late && !y.late) || (!!x.late === !!y.late && (y.at || 0) < (x.at || 0))) out[n] = y;
    });
    return out;
  }
  function sameStudent(a, b) { return !!norm(a.n) && norm(a.n) === norm(b.n) && norm(a.c).replace(/ /g, "") === norm(b.c).replace(/ /g, ""); }
  /* keep roster/ in step with students/ (names, class, station, days saved — no readings) */
  async function syncRoster(o) {
    const have = (await o.db.get("roster")) || {}, upd = {}, now = o.now || Date.now();
    Object.keys(o.students || {}).forEach(code => {
      const e = rosterEntry(o.students[code] || {}), h = have[code] || {};
      if (h.n !== e.n || h.c !== e.c || h.st !== e.st || h.d !== e.d) upd[code] = e;
    });
    Object.keys(have).forEach(code => { if (!(o.students || {})[code] && now - ((have[code] || {}).up || 0) > 10 * 60000) upd[code] = null; });
    if (Object.keys(upd).length) await o.db.update("roster", upd);
    return Object.keys(upd).length;
  }
  /* groups of logs that look like the same student (same name and class) */
  function duplicates(students) {
    const g = {};
    Object.keys(students || {}).forEach(code => {
      const s = students[code] || {}, k = norm(s.n) + "|" + norm(s.c).replace(/ /g, "");
      if (!norm(s.n)) return;
      (g[k] = g[k] || []).push(code);
    });
    return Object.keys(g).filter(k => g[k].length > 1).map(k => g[k].sort((a, b) => ((students[a].created || 0) - (students[b].created || 0))));
  }

  return {
    SLOTS, SRC, key, uidOf, hanoi, slotAt, slotOf, dates, hm, ended, nextWindow, distanceKm,
    aqiPM25, aqiPM10, waqiFeed, waqiBounds,
    collect, readingSlot, studentReadings, copyClassmates, stationsOf, syncMeta, estimate, slotEstimate, estimateAt,
    CHECK, checkCfg, saveHist, histMin, refs, judge, isBroken, hanoiMedian, nearestWorking, dayStation, verdict,
    cell, week, coverage,
    norm, nameScore, findInRoster, rosterEntry, mergeDays, sameStudent, syncRoster, duplicates
  };
});
