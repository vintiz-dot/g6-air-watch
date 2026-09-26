/* Air Watch — World Air Quality Index API helper (api.waqi.info).
   Every call fails soft: the pages keep working without it. */
(function () {
  "use strict";
  const C = window.AW || {};
  const BASE = "https://api.waqi.info";

  async function getJSON(url, ms) {
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), ms || 9000) : null;
    try {
      const r = await fetch(url, ctl ? { signal: ctl.signal } : undefined);
      return await r.json();
    } finally { if (t) clearTimeout(t); }
  }
  const num = v => (v === null || v === undefined || v === "" || v === "-" || !isFinite(+v)) ? null : +v;

  /* All stations inside the Hanoi box, with their current AQI. */
  async function stations() {
    const b = C.bounds || [20.85, 105.65, 21.2, 106.05];
    const url = BASE + "/v2/map/bounds?latlng=" + b.join(",") + "&networks=all&token=" + encodeURIComponent(C.waqiToken || "");
    const res = await getJSON(url, 10000);
    if (!res || res.status !== "ok" || !Array.isArray(res.data)) throw new Error((res && res.data) || "No station list");
    const now = Date.now();
    return res.data.map(s => {
      const name = (s.station && s.station.name) || ("Station " + s.uid);
      const iso = s.station && s.station.time;
      const t = iso ? Date.parse(iso) : NaN;
      const ageH = isFinite(t) ? Math.round((now - t) / 36e5) : null;
      return { uid: s.uid, name, aqi: num(s.aqi), time: iso || null, ageH, lat: s.lat, lon: s.lon };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  /* One station, all its parts. */
  async function feed(uid) {
    const res = await getJSON(BASE + "/feed/@" + uid + "/?token=" + encodeURIComponent(C.waqiToken || ""), 9000);
    if (!res || res.status !== "ok" || !res.data) throw new Error((res && res.data) || "No data");
    const d = res.data, i = d.iaqi || {};
    const v = k => (i[k] ? num(i[k].v) : null);
    const parts = { pm25: v("pm25"), pm10: v("pm10"), o3: v("o3"), no2: v("no2"), so2: v("so2"), co: v("co") };
    return {
      uid: d.idx != null ? d.idx : uid,
      name: (d.city && d.city.name) || null,
      url: (d.city && d.city.url) || link(uid),
      aqi: num(d.aqi), dom: d.dominentpol || null,
      time: (d.time && (d.time.iso || d.time.s)) || null,
      parts,
      nParts: Object.values(parts).filter(x => x !== null).length,
      forecast: (d.forecast && d.forecast.daily) || null
    };
  }

  /* stations from other networks have negative numbers; their pages live under /station/ */
  function link(uid) { return +uid < 0 ? "https://aqicn.org/station/@" + (-uid) : "https://aqicn.org/city/@" + uid; }

  function distanceKm(a, b) {
    const R = 6371, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  window.WAQI = { stations, feed, link, distanceKm };
})();
