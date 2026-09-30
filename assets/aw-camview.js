/* Air Watch lesson — the live camera on the screens (projector, laptops, observers, and the teacher's
   preview). The teacher's phone (cam.html) chooses how the class sees it:
   · Live video (VDO.Ninja): the phone opens a VDO.Ninja camera page that sends one stream to VDO.Ninja's free
     relay (Meshcast); every screen here plays it in a VDO.Ninja player (an iframe). cam/<key> says
     { mode: "ninja" } while the phone is on it.
   · Pictures (the backup): the phone keeps the newest picture under cam/<key>. While the teacher shows it
     (state.camOn), each screen fetches the newest picture itself, at most 4 a second, so a slow laptop
     simply gets fewer pictures and never falls behind.
     Direct video: with pictures, the projector, the teacher's preview and the observers' page also ask the
     phone for real video (WebRTC). It connects when the phone and that laptop can reach each other — e.g. the
     teacher's laptop on the phone's hotspot. While it is connected the pictures stop on that screen; if it
     drops, the pictures come back by themselves. */
(function () {
  "use strict";
  const { U, LS } = window.AWL;
  const { esc } = U;
  let ST = {}, METER = {}, PHONE = null, phoneKey = null, unPhone = null;
  const views = [];
  const METERS = [["base", "Room air"], ["peak", "Smoke at the meter"], ["after", "60 s later"]];
  const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  const fresh = f => !!(f && f.f && !f.stopped && LS.now() - (f.at || 0) < 8000);
  const rid = () => Math.random().toString(36).slice(2, 10);
  const { NINJA } = window.AWL;
  const viewURL = NINJA.view;
  const isNinja = f => !!(f && f.mode === "ninja" && !f.stopped);
  const rendered = el => !!el && !el.closest("details:not([open])") && (el.checkVisibility ? el.checkVisibility() : el.getClientRects().length > 0);

  function meterHTML() {
    const parts = METERS.filter(([k]) => METER[k] != null && METER[k] !== "").map(([k, l]) => '<span>' + esc(l) + ' <b>' + esc(METER[k]) + '</b></span>');
    return parts.length ? parts.join('<i>→</i>') + '<small>µg/m³ PM2.5</small>' : '';
  }
  function make(o) {
    const v = { o, el: o.el, on: false, seq: null, timer: null, last: null, direct: false, rtc: null, tries: 0, triesFor: null, retryT: null, mode: null, ifr: null, ifrKey: null, hit: null };
    v.el.classList.add("camview", "cv-" + o.kind);
    v.el.hidden = true;
    v.el.innerHTML = '<div class="cvhead"><b class="cvlive">● LIVE</b><span class="cvtitle">' + esc(o.title || "The jar test — from the teacher’s phone") + '</span><span class="cvmeter"></span></div>' +
      '<div class="cvpic"><img alt="Live picture from the teacher’s phone">' + (o.direct ? '<video class="cvvid" playsinline muted autoplay></video>' : '') + '<p class="cvwait">Waiting for the camera…</p></div>' +
      (o.kind === "laptop" ? '<p class="cvtap">Tap the picture to make it bigger.</p>' : '');
    v.img = v.el.querySelector("img"); v.vid = v.el.querySelector("video"); v.wait = v.el.querySelector(".cvwait"); v.meter = v.el.querySelector(".cvmeter"); v.pic = v.el.querySelector(".cvpic");
    if (v.vid) v.vid.muted = true;
    if (o.kind === "laptop") v.el.querySelector(".cvpic").onclick = () => v.el.classList.toggle("big");
    return v;
  }
  const wanted = v => !!ST.camKey && ST.live !== false && (v.o.kind === "preview" || !!ST.camOn);
  function sync() {
    watchPhone();
    views.forEach(v => {
      const w = wanted(v);
      v.el.hidden = !w;
      v.meter.innerHTML = v.o.kind === "preview" ? "" : meterHTML();
      if (w && !v.on) { v.on = true; v.seq = null; loop(v); }
      if (!w && v.on) { v.on = false; clearTimeout(v.timer); v.el.classList.remove("big"); stopDirect(v, false); setNinja(v, false); v.mode = null; report(v, null); }
      if (v.on && v.o.direct) syncDirect(v);
    });
  }

  /* ───────── pictures ───────── */
  function loop(v) {
    if (!v.on) return;
    const t0 = Date.now(), every = v.mode === "ninja" || v.direct ? 2000 : v.o.kind === "preview" ? 1000 : 250;
    LS.getCam(ST.camKey).then(f => {
      if (!v.on) return;
      paint(v, f);
      v.timer = setTimeout(() => loop(v), Math.max(40, every - (Date.now() - t0)));
    });
  }
  function paint(v, f) {
    v.mode = isNinja(f) ? "ninja" : "pics";
    setNinja(v, v.mode === "ninja");
    if (v.mode === "ninja") { v.el.classList.remove("stale"); v.wait.textContent = "Waiting for the live video…"; report(v, f); return; }
    if (f && f.stopped && v.direct) stopDirect(v, false);   /* the phone pressed Stop: end the video now */
    const ok = fresh(f);
    if (ok && f.seq !== v.seq && !v.direct) { v.seq = f.seq; v.img.src = f.f; }
    v.el.classList.toggle("stale", !ok && !v.direct);
    v.wait.textContent = f && f.stopped ? "The camera has stopped." : "Waiting for the camera…";
    report(v, f);
  }
  function report(v, f) {
    if (f !== undefined) v.last = f;
    const nj = v.mode === "ninja";
    if (v.o.onStatus) try { v.o.onStatus({ live: fresh(v.last) || v.direct || nj, frame: v.last || null, direct: v.direct, ninja: nj }); } catch (e) {}
  }

  /* ───────── live video: the VDO.Ninja player ─────────
     Only while the camera is shown (the teacher's preview: only while its box is open, so a closed box uses
     no data). A clear layer on top keeps clicks (and the keyboard focus) on this page: tapping still makes
     the laptop's picture bigger, and the "stay in the lesson" check is not fooled by the player. */
  function setNinja(v, on) {
    const want = !!on && !!ST.camKey && (v.o.kind !== "preview" || rendered(v.el));
    if (v.ifr && (!want || v.ifrKey !== ST.camKey)) { v.ifr.remove(); v.ifr = null; v.ifrKey = null; if (v.hit) { v.hit.remove(); v.hit = null; } }
    if (want && !v.ifr) {
      stopDirect(v, false);
      const f = v.ifr = document.createElement("iframe");
      f.className = "cvninja"; f.title = "Live video from the teacher’s phone";
      f.allow = "autoplay; fullscreen; picture-in-picture"; f.setAttribute("allowfullscreen", "");
      f.src = viewURL(ST.camKey); v.ifrKey = ST.camKey;
      v.pic.appendChild(f);
      v.hit = document.createElement("div"); v.hit.className = "cvhit"; v.pic.appendChild(v.hit);
    }
    v.el.classList.toggle("ninja", !!on);
  }

  /* ───────── direct video (WebRTC) ───────── */
  function watchPhone() {
    const key = ST.camKey && ST.live !== false ? ST.camKey : null;
    if (key === phoneKey) return;
    if (unPhone) { unPhone(); unPhone = null; }
    phoneKey = key; PHONE = null;
    if (key && views.some(v => v.o.direct)) unPhone = LS.rtcWatch(key, "phone", p => { PHONE = p && p.id ? p : null; views.forEach(v => { if (v.on && v.o.direct) syncDirect(v); }); });
  }
  function syncDirect(v) {
    if (v.mode === "ninja") return;
    const pid = PHONE && PHONE.id;
    /* the phone's entry went away: stop trying — but keep a video that is already flowing (the internet may
       have dropped for a moment; the video itself goes phone → laptop). A new phone id means it restarted. */
    if (v.rtc && (pid ? v.rtc.pid !== pid : !v.direct)) stopDirect(v, false);
    if (!pid) return;
    if (v.triesFor !== pid) { v.triesFor = pid; v.tries = 0; clearTimeout(v.retryT); v.retryT = null; }
    if (!v.rtc && !v.retryT && v.tries < 3) startDirect(v);
  }
  function gathered(pc, ms) {
    return new Promise(res => {
      if (pc.iceGatheringState === "complete") return res();
      const t = setTimeout(res, ms);
      pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); res(); } });
    });
  }
  function startDirect(v) {
    if (!window.RTCPeerConnection || !PHONE) return;
    const key = ST.camKey, vid = rid(), r = v.rtc = { vid, key, pid: PHONE.id, pc: null, un: [], t: null };
    LS.rtcOnLeave(key, "req/" + vid, true);
    LS.rtcSet(key, "req/" + vid, { at: LS.now(), kind: v.o.kind, pid: PHONE.id });
    r.t = setTimeout(() => { if (v.rtc === r && !v.direct) stopDirect(v, true); }, 15000);   /* no video within 15 s: try again later */
    r.un.push(LS.rtcWatch(key, "off/" + vid, off => {
      if (!off || !off.sdp || r.pc || v.rtc !== r) return;
      const pc = r.pc = new RTCPeerConnection(ICE);
      pc.ontrack = e => { const s = (e.streams && e.streams[0]) || new MediaStream([e.track]); if (v.vid.srcObject !== s) { v.vid.srcObject = s; const p = v.vid.play(); if (p && p.catch) p.catch(() => {}); } };
      pc.onconnectionstatechange = () => {
        if (v.rtc !== r) return;
        const cs = pc.connectionState;
        if (cs === "connected") { v.direct = true; v.tries = 0; clearTimeout(r.t); v.el.classList.add("direct"); v.el.classList.remove("stale"); report(v); }
        else if (cs === "failed" || cs === "closed") stopDirect(v, true);
        else if (cs === "disconnected") { clearTimeout(r.t); r.t = setTimeout(() => { if (v.rtc === r && pc.connectionState !== "connected") stopDirect(v, true); }, 5000); }
      };
      pc.setRemoteDescription({ type: "offer", sdp: off.sdp })
        .then(() => pc.createAnswer()).then(a => pc.setLocalDescription(a))
        .then(() => gathered(pc, 2500))
        .then(() => { if (v.rtc === r) LS.rtcSet(key, "ans/" + vid, { sdp: pc.localDescription.sdp, at: LS.now() }); })
        .catch(() => stopDirect(v, true));
    }));
  }
  function stopDirect(v, retry) {
    const r = v.rtc;
    if (r) {
      v.rtc = null; clearTimeout(r.t); r.un.forEach(f => f());
      if (r.pc) try { r.pc.close(); } catch (e) {}
      LS.rtcOnLeave(r.key, "req/" + r.vid, false);
      LS.rtcSet(r.key, "req/" + r.vid, null); LS.rtcSet(r.key, "ans/" + r.vid, null);
    }
    const was = v.direct;
    v.direct = false; v.el.classList.remove("direct");
    if (v.vid) v.vid.srcObject = null;
    if (was) { v.seq = null; report(v); }
    if (retry && v.on && v.o.direct) {
      v.tries++;
      if (v.tries < 3) { clearTimeout(v.retryT); v.retryT = setTimeout(() => { v.retryT = null; if (v.on) syncDirect(v); }, [5000, 15000, 45000][v.tries - 1]); }
    }
  }

  window.AWCAM = {
    /* o = { el, kind: "proj" | "laptop" | "obs" | "preview", title?, onStatus?, direct? } */
    mount(o) { const v = make(o); views.push(v); sync(); return v; },
    /* the teacher's preview box was opened or closed: start or stop its player now */
    refresh() { views.forEach(v => { if (v.on) setNinja(v, v.mode === "ninja"); }); },
    fresh, isNinja
  };
  LS.watchState(s => { ST = s || {}; sync(); });
  LS.watchMeter(m => { METER = m || {}; views.forEach(v => { if (v.o.kind !== "preview") v.meter.innerHTML = meterHTML(); }); });
})();
