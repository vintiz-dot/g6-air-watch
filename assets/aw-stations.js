/* Air Watch — station readings for every chosen station at all three times of day.
   One file for the homework pages, the lesson pages and the GitHub job (tools/air-watch-readings.mjs).

   Firebase, room G6HW6:
     stationMeta/s{uid}               { name, lat, lon, cls }
     stationLog/s{uid}/{date}/{slot}  real readings { aqi, pm25, pm10, o3, no2, so2, co, dom, t, at, src, by }
                                      src: "app" (a homework page saved it) · "gh" (the GitHub job) · "class" (copied from a student's log)
     stationEst/s{uid}/{date}/{slot}  computer-model estimates { aqi, pm25, pm10, c25, c10, at, src: "cams" }
     stationEstAt                     when the estimates were last refreshed
     roster/{code}                    { n, c, st, d, up }   — lets a student find their log again
     moved/{code}                     the code a log was merged into

   Readings are AQI numbers on the US EPA scale, the same scale aqicn.org shows.
   Estimates come from Open-Meteo (CAMS model, CC BY 4.0) and are always marked "estimate". */
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

  /* ───────── 1 · save every chosen station for the time window we are in ───────── */
  async function collect(o) {
    const now = o.now || Date.now(), h = hanoi(now), sl = slotAt(h.min, 0, o.after == null ? 30 : o.after);
    const res = { date: h.date, slot: sl ? sl.k : null, saved: 0, had: 0, stale: 0, failed: 0 };
    if (!sl) return res;
    if (o.day1 && o.days) { const ds = dates(o.day1, o.days); if (h.date < ds[0] || h.date > ds[ds.length - 1]) { res.slot = null; return res; } }
    const meta = (await o.db.get("stationMeta")) || {};
    const uids = (o.stations || Object.keys(meta).map(uidOf)).map(String).filter(u => /^\d+$/.test(u));
    for (const uid of uids) {
      const have = await o.db.get("stationLog/" + key(uid) + "/" + h.date + "/" + sl.k);
      if (have && have.aqi != null && have.src !== "class") { res.had++; continue; }
      try {
        const f = await waqiFeed(o.fetch, o.token, uid, o.waqiBase);
        if (f.aqi == null) { res.failed++; continue; }
        if (isFinite(f.tms) && (now - f.tms > 3 * 3600e3 || hanoi(f.tms).date !== h.date)) { res.stale++; continue; }
        await o.db.set("stationLog/" + key(uid) + "/" + h.date + "/" + sl.k,
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
  function studentReadings(students) {
    const out = [];
    Object.keys(students || {}).forEach(code => {
      const s = students[code] || {}, days = s.days || {};
      Object.keys(days).forEach(n => {
        const d = days[n];
        if (!d || !d.a || d.late || !d.date) return;
        const sl = readingSlot(d); if (!sl) return;
        if (s.st && s.st.uid && num(d.a.aqi) != null) out.push({ uid: s.st.uid, date: d.date, slot: sl, aqi: num(d.a.aqi), pm25: num(d.a.pm25), code, at: d.at || 0, kind: "home" });
        if (d.ref && d.ref.uid && num(d.ref.aqi) != null && !d.ref.same) out.push({ uid: d.ref.uid, date: d.date, slot: sl, aqi: num(d.ref.aqi), pm25: num(d.ref.pm25), code, at: d.at || 0, kind: "class" });
      });
    });
    return out.sort((a, b) => a.at - b.at);
  }
  async function copyClassmates(o) {
    const log = (await o.db.get("stationLog")) || {}, upd = {};
    studentReadings(o.students).forEach(r => {
      const k = key(r.uid), have = log[k] && log[k][r.date] && log[k][r.date][r.slot], p = k + "/" + r.date + "/" + r.slot;
      if (have || upd[p]) return;
      upd[p] = clean({ aqi: r.aqi, pm25: r.pm25, at: r.at, src: "class", by: r.code });
    });
    const n = Object.keys(upd).length;
    if (n) await o.db.update("stationLog", upd);
    return n;
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
        const at = {}; H.time.forEach((t, i) => { at[t] = i; });
        const upd = {};
        ds.forEach(d => SLOTS.forEach(sl => {
          if (!ended(d, sl, now)) return;
          const idx = sl.hours.map(hh => at[d + "T" + String(hh).padStart(2, "0") + ":00"]).filter(i => i != null);
          const avg = arr => { const v = idx.map(i => arr ? num(arr[i]) : null).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
          const c25 = avg(H.pm2_5), c10 = avg(H.pm10), a25 = aqiPM25(c25), a10 = aqiPM10(c10);
          if (a25 == null && a10 == null) return;
          upd[d + "/" + sl.k] = clean({ aqi: Math.max(a25 == null ? 0 : a25, a10 == null ? 0 : a10), pm25: a25, pm10: a10,
            c25: c25 == null ? null : Math.round(c25 * 10) / 10, c10: c10 == null ? null : Math.round(c10), at: now, src: "cams" });
          res.cells++;
        }));
        if (Object.keys(upd).length) await o.db.update("stationEst/" + k, upd);
        res.stations++;
      } catch (e) { res.failed++; }
    }
    await o.db.set("stationEstAt", now);
    return res;
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
    SLOTS, SRC, key, uidOf, hanoi, slotAt, slotOf, dates, hm, ended, nextWindow,
    aqiPM25, aqiPM10, waqiFeed,
    collect, readingSlot, studentReadings, copyClassmates, stationsOf, syncMeta, estimate,
    cell, week, coverage,
    norm, nameScore, findInRoster, rosterEntry, mergeDays, sameStudent, syncRoster, duplicates
  };
});
