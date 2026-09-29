/* Air Watch lesson — the live camera on the screens (projector, laptops, observers, and the teacher's
   preview). The teacher's phone (cam.html) keeps the newest picture under cam/<key>. While the teacher shows
   it (state.camOn), each screen fetches the newest picture itself, at most about 3 a second, so a slow
   laptop simply gets fewer pictures and never falls behind. The preview on the teacher's page runs
   whenever there is a camera key, once a second, and reports whether the phone is live. */
(function () {
  "use strict";
  const { U, LS } = window.AWL;
  const { esc } = U;
  let ST = {}, METER = {};
  const views = [];
  const METERS = [["base", "Room air"], ["peak", "Smoke at the meter"], ["after", "60 s later"]];
  const fresh = f => !!(f && f.f && !f.stopped && LS.now() - (f.at || 0) < 8000);

  function meterHTML() {
    const parts = METERS.filter(([k]) => METER[k] != null && METER[k] !== "").map(([k, l]) => '<span>' + esc(l) + ' <b>' + esc(METER[k]) + '</b></span>');
    return parts.length ? parts.join('<i>→</i>') + '<small>µg/m³ PM2.5</small>' : '';
  }
  function make(o) {
    const v = { o, el: o.el, on: false, seq: null, timer: null, last: null };
    v.el.classList.add("camview", "cv-" + o.kind);
    v.el.hidden = true;
    v.el.innerHTML = '<div class="cvhead"><b class="cvlive">● LIVE</b><span class="cvtitle">' + esc(o.title || "The jar test — from the teacher’s phone") + '</span><span class="cvmeter"></span></div>' +
      '<div class="cvpic"><img alt="Live picture from the teacher’s phone"><p class="cvwait">Waiting for the camera…</p></div>' + (o.kind === "laptop" ? '<p class="cvtap">Tap the picture to make it bigger.</p>' : '');
    v.img = v.el.querySelector("img"); v.wait = v.el.querySelector(".cvwait"); v.meter = v.el.querySelector(".cvmeter");
    if (o.kind === "laptop") v.el.querySelector(".cvpic").onclick = () => v.el.classList.toggle("big");
    return v;
  }
  const wanted = v => !!ST.camKey && ST.live !== false && (v.o.kind === "preview" || !!ST.camOn);
  function sync() {
    views.forEach(v => {
      const w = wanted(v);
      v.el.hidden = !w;
      v.meter.innerHTML = v.o.kind === "preview" ? "" : meterHTML();
      if (w && !v.on) { v.on = true; v.seq = null; loop(v); }
      if (!w && v.on) { v.on = false; clearTimeout(v.timer); v.el.classList.remove("big"); report(v, null); }
    });
  }
  function loop(v) {
    if (!v.on) return;
    const t0 = Date.now(), every = v.o.kind === "preview" ? 1000 : 300;
    LS.getCam(ST.camKey).then(f => {
      if (!v.on) return;
      paint(v, f);
      v.timer = setTimeout(() => loop(v), Math.max(40, every - (Date.now() - t0)));
    });
  }
  function paint(v, f) {
    const ok = fresh(f);
    if (ok && f.seq !== v.seq) { v.seq = f.seq; v.img.src = f.f; }
    v.el.classList.toggle("stale", !ok);
    v.wait.textContent = f && f.stopped ? "The camera has stopped." : "Waiting for the camera…";
    report(v, f);
  }
  function report(v, f) {
    v.last = f;
    if (v.o.onStatus) try { v.o.onStatus({ live: fresh(f), frame: f || null }); } catch (e) {}
  }

  window.AWCAM = {
    /* o = { el, kind: "proj" | "laptop" | "obs" | "preview", title?, onStatus? } */
    mount(o) { const v = make(o); views.push(v); sync(); return v; },
    fresh
  };
  LS.watchState(s => { ST = s || {}; sync(); });
  LS.watchMeter(m => { METER = m || {}; views.forEach(v => { if (v.o.kind !== "preview") v.meter.innerHTML = meterHTML(); }); });
})();
