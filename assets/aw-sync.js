/* Air Watch — Firebase Realtime Database wrapper for the homework room.
   Uses assets/firebase-config.js (the same g6-science project as the
   Materials Bench). If Firebase is unavailable every call is a safe no-op. */
(function () {
  "use strict";
  const cfg = window.FIREBASE_CONFIG || {};
  const ready = !!(cfg.databaseURL && cfg.apiKey);
  const ROOM = (window.AW && window.AW.room) || "G6HW6";
  let db = null, failed = false, lastErr = null, onErr = null;

  function boot() {
    if (!ready || db || failed) return db;
    try {
      if (typeof firebase === "undefined") { failed = true; return null; }
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      db = firebase.database();
    } catch (e) { failed = true; db = null; }
    return db;
  }
  /* Firebase rejects a whole write if anything inside is undefined. */
  function clean(v) {
    if (v === undefined) return null;
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(clean);
    const o = {};
    for (const k in v) if (v[k] !== undefined) o[k] = clean(v[k]);
    return o;
  }
  function fail(where, e) {
    lastErr = where + ": " + ((e && e.message) ? e.message : e);
    try { console.error("[AW SYNC] " + lastErr); } catch (x) {}
    if (onErr) try { onErr(lastErr); } catch (x) {}
  }
  function ok() { if (lastErr) { lastErr = null; if (onErr) onErr(null); } }
  const ref = p => boot().ref("rooms/" + ROOM + "/" + p);

  window.AWSYNC = {
    configured: ready,
    available() { return !!boot(); },
    lastError() { return lastErr; },
    onError(fn) { onErr = fn; if (fn) fn(lastErr); },

    /* ---- students ---- */
    saveStudent(code, data) {
      if (!boot()) return Promise.resolve(false);
      return ref("students/" + code).set(clean(data)).then(() => { ok(); return true; })
        .catch(e => { fail("could not save your log", e); return false; });
    },
    getStudent(code) {
      if (!boot()) return Promise.resolve(null);
      return ref("students/" + code).once("value").then(s => s.val()).catch(e => { fail("could not load", e); return null; });
    },
    savePhoto(code, day, dataUrl) {
      if (!boot()) return Promise.resolve(false);
      return ref("photos/" + code + "_" + day).set({ d: dataUrl, at: Date.now(), code, day })
        .then(() => { ok(); return true; }).catch(e => { fail("could not save the photo", e); return false; });
    },
    watchConfig(fn) {
      if (!boot()) { fn({}); return; }
      try { ref("config").on("value", s => fn(s.val() || {})); } catch (e) { fn({}); }
    },

    /* ---- teacher ---- */
    setConfig(key, val) {
      if (!boot()) return Promise.resolve(false);
      return ref("config/" + key).set(clean(val)).then(() => true).catch(e => { fail("could not save the setting", e); return false; });
    },
    watchStudents(fn) {
      if (!boot()) { fn({}); return null; }
      const r = ref("students");
      try { r.on("value", s => fn(s.val() || {})); } catch (e) { fn({}); }
      return r;
    },
    listPhotoKeys() {
      if (!boot()) return Promise.resolve([]);
      /* shallow read of keys only would need REST; read flags stored on students instead */
      return Promise.resolve([]);
    },
    getPhoto(code, day) {
      if (!boot()) return Promise.resolve(null);
      return ref("photos/" + code + "_" + day).once("value").then(s => s.val()).catch(() => null);
    },
    setPhotoFlag(code, day, flag) {
      if (!boot()) return Promise.resolve(false);
      return ref("photoFlags/" + code + "_" + day).set(flag).then(() => true).catch(e => { fail("could not flag the photo", e); return false; });
    },
    watchPhotoFlags(fn) {
      if (!boot()) { fn({}); return; }
      try { ref("photoFlags").on("value", s => fn(s.val() || {})); } catch (e) { fn({}); }
    },
    clearAll() {
      if (!boot()) return Promise.resolve(false);
      return Promise.all(["students", "photos", "photoFlags", "roster", "moved", "sentBack", "stationLog", "stationEst", "stationMeta", "stationEstAt", "stationHist"].map(k => ref(k).remove()))
        .then(() => true).catch(e => { fail("could not clear the room", e); return false; });
    },
    removeStudent(code) {
      if (!boot()) return Promise.resolve(false);
      return Promise.all([ref("students/" + code).remove(), ref("roster/" + code).remove(), ref("sentBack/" + code).remove()]).then(() => true).catch(e => { fail("could not remove", e); return false; });
    },

    /* ---- any path in the room: station readings, roster, moved logs ---- */
    getPath(p) {
      if (!boot()) return Promise.resolve(null);
      return ref(p).once("value").then(s => s.val()).catch(() => null);
    },
    setPath(p, v) {
      if (!boot()) return Promise.resolve(false);
      return ref(p).set(v === undefined ? null : clean(v)).then(() => true).catch(e => { fail("could not save", e); return false; });
    },
    updatePath(p, v) {
      if (!boot()) return Promise.resolve(false);
      return ref(p).update(clean(v)).then(() => true).catch(e => { fail("could not save", e); return false; });
    },
    watchPath(p, fn) {
      if (!boot()) { fn(null); return; }
      try { ref(p).on("value", s => fn(s.val())); } catch (e) { fn(null); }
    },
    /* when two logs are joined, their sky photos move with the days */
    copyPhotos(from, to, days) {
      if (!boot()) return Promise.resolve(0);
      return Promise.all((days || []).map(d => ref("photos/" + from + "_" + d).once("value").then(s => {
        const v = s.val(); if (!v) return 0;
        return ref("photos/" + to + "_" + d).set(Object.assign({}, v, { code: to })).then(() => 1);
      }).catch(() => 0))).then(r => r.reduce((a, b) => a + b, 0));
    },
    /* the small database interface that aw-stations.js expects */
    stationDb() {
      if (!boot()) return null;
      return {
        get: p => ref(p).once("value").then(s => s.val()),
        set: (p, v) => ref(p).set(v),
        update: (p, v) => ref(p).update(v)
      };
    },

    /* ---- check page ---- */
    selfTest() {
      if (!boot()) return Promise.reject(new Error(ready ? "Firebase did not load" : "firebase-config.js is not filled in"));
      const stamp = Date.now();
      return ref("_check").set({ at: stamp })
        .then(() => ref("_check").once("value"))
        .then(s => { const v = s.val(); if (!v || v.at !== stamp) throw new Error("wrote but could not read back"); return true; });
    },
    room: ROOM
  };
})();
