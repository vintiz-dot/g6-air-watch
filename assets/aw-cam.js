/* Air Watch lesson — the live camera on the teacher's phone (cam.html?k=KEY, opened from the QR code on the
   teacher's page). While it is live:
   · direct video (WebRTC) to the teacher's laptop — projector and preview — when the phone and the laptop
     can reach each other (best: the laptop on the phone's hotspot). Smooth, about 30 frames a second.
   · pictures to the lesson room for the laptops and the observers (and as a fallback): about 4 a second while
     the teacher shows it on the screens, one every 2 seconds otherwise.
   · a video recorded on the phone; Stop → Save the video. */
(function () {
  "use strict";
  const { U, LS } = window.AWL;
  const { $, esc } = U;
  const key = (new URLSearchParams(location.search).get("k") || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 24);
  let ST = {}, stateSeen = false, connected = null;
  let stream = null, live = false, seq = 0, inFlight = 0, lastSent = 0, acks = [], sizes = [];
  let rec = null, chunks = [], recStart = 0, recType = "", clip = null, wake = null, camErr = "", starting = false;
  const canvas = document.createElement("canvas"), cx = canvas.getContext("2d");
  /* WebP where the browser can make it (smaller for the same quality), JPEG otherwise (iPhone) */
  const PIC = (() => { try { const c = document.createElement("canvas"); c.width = c.height = 2; return c.toDataURL("image/webp", 0.6).indexOf("data:image/webp") === 0 ? "image/webp" : "image/jpeg"; } catch (e) { return "image/jpeg"; } })();

  $("#app").innerHTML =
    '<div class="card" id="cmsg" hidden></div>' +
    '<div class="card camcard" id="cmain" hidden>' +
      '<div class="eyebrow">Live camera · the jar test</div>' +
      '<div class="camvid" id="cvbox" hidden><video id="cv" playsinline muted autoplay></video><span class="camlive" id="cvlive" hidden>● LIVE</span></div>' +
      '<p class="vn" id="chint"></p>' +
      '<div class="err" id="cerr"></div>' +
      '<div class="btns" id="cbtns"></div>' +
      '<label class="tickline" id="crecl"><input type="checkbox" id="crec" checked> Also record a video on this phone</label>' +
      '<p class="cstat" id="cstat"></p>' +
      '<div id="csave"></div>' +
    '</div>';
  const video = $("#cv");
  video.muted = true;

  function paintLive() {
    const lv = $("#live"), tx = $("#livetx"), err = LS.lastError();
    lv.classList.toggle("on", LS.available() && connected !== false && !err);
    lv.classList.toggle("err", !!err || !LS.available() || connected === false);
    tx.textContent = err ? "Not sending — " + err : !LS.available() ? "No database — check firebase-config.js" : connected === false ? "Reconnecting…" : "Connected · room " + (window.AW.lessonRoom || "G6W6");
  }
  const linkState = () => !key ? "nokey" : !stateSeen ? "wait" : !ST.reset ? "nosession" : ST.camKey !== key ? "old" : "ok";
  const mmss = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  function btn(label, cls, fn) { const b = document.createElement("button"); b.type = "button"; b.className = "btn " + cls; b.textContent = label; b.onclick = fn; return b; }

  function paint() {
    paintLive();
    const ls = linkState(), m = $("#cmsg"), main = $("#cmain");
    const msgs = {
      nokey: ["Open this page from the QR code", "On your laptop: teacher page → <b>Show on the projector</b> → <b>Live camera</b>. Scan the square with this phone’s camera."],
      nosession: ["No lesson session yet", "Start a session on your laptop (teacher page), then scan the QR code again."],
      old: ["This link is from an earlier session", "Scan the new QR code on your laptop: <b>Show on the projector</b> → <b>Live camera</b>."],
      wait: ["Connecting…", "One moment."]
    };
    if (ls !== "ok" && !live) {
      m.hidden = false; main.hidden = true;
      m.innerHTML = '<div class="eyebrow">Live camera</div><h2 class="title">' + msgs[ls][0] + '</h2><p class="sub">' + msgs[ls][1] + '</p>';
      return;
    }
    m.hidden = true; main.hidden = false;
    $("#cvbox").hidden = !stream;
    $("#cvlive").hidden = !live;
    $("#recTag").hidden = !rec;
    $("#cerr").textContent = camErr;
    $("#crecl").hidden = !stream || live || !window.MediaRecorder;
    const b = $("#cbtns"); b.innerHTML = "";
    if (!stream) {
      $("#chint").innerHTML = "Stand the phone where it sees the jar <b>and</b> the meter, sideways (landscape). Plug it in if you can.";
      b.appendChild(btn(starting ? "Starting the camera…" : "Turn on the camera", "g big", startCamera));
    } else if (!live) {
      $("#chint").innerHTML = "Check the picture: the jar and the meter’s number should both be in it.";
      b.appendChild(btn($("#crec").checked && window.MediaRecorder ? "● Start: live + record" : "● Start live", "g big", start));
    } else {
      $("#chint").innerHTML = "Keep this page open and the phone unlocked until you press Stop.";
      b.appendChild(btn("■ Stop", "big stopbtn", stop));
    }
    paintStat();
    paintSave();
  }
  function paintStat() {
    const s = $("#cstat"); if (!s) return;
    if (!live) { s.textContent = ""; return; }
    const n = Date.now(); acks = acks.filter(x => n - x < 5000);
    const fps = acks.length / 5, kb = sizes.length ? Math.round(sizes.reduce((a, v) => a + v, 0) / sizes.length * 0.75 / 1024) : 0;
    const dn = directN();
    s.innerHTML = (ST.camOn ? '<b class="on">On every screen now</b>' : '<b>Only your laptop sees it</b> — press Tab there (or “Show on every screen”)') +
      '<br>' + (dn ? '<b class="on">Direct video to your laptop ✓</b>' + (dn > 1 ? " (" + dn + " screens)" : "") : '<span>Direct video: not connected — put your laptop on this phone’s hotspot</span>') +
      ' · pictures for the laptops: ' + fps.toFixed(1) + ' a second' + (kb ? ' · ' + kb + ' KB each' : '') + (rec ? ' · <b class="rec">● REC ' + mmss(Math.round((n - recStart) / 1000)) + '</b>' : '');
  }
  function paintSave() {
    const box = $("#csave"); box.innerHTML = "";
    if (!clip || live) return;
    const mb = (clip.blob.size / 1048576).toFixed(1);
    box.innerHTML = '<div class="savebox"><b>' + (clip.saved ? "Video saved ✓" : "Your video (" + mmss(clip.secs) + ", " + mb + " MB) is only on this page") + '</b><p class="vn">' +
      (clip.saved ? "You can press Save again for another copy." : "Save it now — it is lost if this page closes.") + '</p><div class="btns"></div></div>';
    const bt = box.querySelector(".btns");
    bt.appendChild(btn(canShareClip() ? "Save the video (Photos / Files)" : "Save the video", "g", saveClip));
    if (canShareClip()) bt.appendChild(btn("Download instead", "ghost sm", () => download()));
  }

  /* ───────── camera ───────── */
  function startCamera() {
    if (starting) return;
    camErr = "";
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camErr = "This browser cannot use the camera. On iPhone use Safari; on Android use Chrome."; paint(); return; }
    starting = true; paint();
    const vid = { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } };
    navigator.mediaDevices.getUserMedia({ video: vid, audio: true })
      .catch(() => navigator.mediaDevices.getUserMedia({ video: vid, audio: false }))
      .then(s => {
        stream = s; starting = false;
        video.srcObject = s; const p = video.play(); if (p && p.catch) p.catch(() => {});
        const tr = s.getVideoTracks()[0];
        if (tr) tr.addEventListener("ended", () => { if (live) stop(); stream = null; camErr = "The camera stopped (another app may have taken it). Press Turn on the camera."; paint(); });
        paint();
      })
      .catch(e => {
        starting = false;
        camErr = e && e.name === "NotAllowedError" ? "The camera is blocked for this page. Allow it (Safari: aA → Website Settings → Camera; Chrome: ⋮ → Settings → Site settings → Camera), then press again." : "The camera did not start: " + ((e && e.message) || e);
        paint();
      });
  }
  function start() {
    if (!stream || live) return;
    live = true; acks = []; sizes = []; inFlight = 0; lastSent = 0; clip = null;
    startRec(); keepAwake(true); rtcStart(); paint();
  }
  function stop() {
    if (!live) return;
    live = false; keepAwake(false); rtcStop();
    if (rec) { const r = rec; try { r.stop(); } catch (e) { rec = null; } }
    LS.camFrame(key, { stopped: true, at: LS.now(), seq: ++seq });
    paint();
  }
  /* the newest picture (720 px), at most two on the way, so a slow Wi-Fi only lowers the rate */
  function pump() {
    if (!live || !video.videoWidth) return;
    const t = Date.now(), every = ST.camOn ? 250 : 2000;
    if (inFlight >= 2 || t - lastSent < every) return;
    const vw = video.videoWidth, vh = video.videoHeight, sc = Math.min(1, 720 / Math.max(vw, vh));
    canvas.width = Math.round(vw * sc); canvas.height = Math.round(vh * sc);
    let f = null;
    try { cx.drawImage(video, 0, 0, canvas.width, canvas.height); f = canvas.toDataURL(PIC, PIC === "image/webp" ? 0.6 : 0.62); } catch (e) { return; }
    lastSent = t; inFlight++; seq++;
    const n = Date.now(); acks = acks.filter(x => n - x < 5000);
    LS.camFrame(key, { f, at: LS.now(), seq, w: canvas.width, h: canvas.height, rec: !!rec, fps: Math.round(acks.length / 5 * 10) / 10 }).then(ok => {
      inFlight = Math.max(0, inFlight - 1);
      if (ok) { acks.push(Date.now()); sizes.push(f.length); if (sizes.length > 15) sizes.shift(); }
    });
  }
  setInterval(pump, 60);
  setInterval(() => { if (live) paintStat(); }, 1000);

  /* ───────── direct video (WebRTC) to the teacher's laptop ─────────
     The laptop (projector window, preview) asks under rtc/<key>/req; the phone answers each with its own
     connection (at most 4). Only the handshake goes through the database; the video goes phone → laptop. */
  const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  let phoneId = null, peers = {}, unReq = null;
  function rtcStart() {
    if (!window.RTCPeerConnection || !stream || phoneId) return;
    phoneId = Math.random().toString(36).slice(2, 10);
    LS.rtcOnLeave(key, "phone", true);
    LS.rtcSet(key, "phone", { id: phoneId, at: LS.now() });
    unReq = LS.rtcWatch(key, "req", reqs => {
      reqs = reqs || {};
      /* a request that went away: drop it unless the video is already flowing (a short internet cut must not stop it) */
      Object.keys(peers).forEach(vid => { if (!reqs[vid] && peers[vid].pc.connectionState !== "connected") dropPeer(vid); });
      Object.keys(reqs).forEach(vid => { const r = reqs[vid]; if (live && !peers[vid] && r && r.pid === phoneId && Object.keys(peers).length < 4) makePeer(vid); });
    });
  }
  function rtcStop() {
    if (unReq) { unReq(); unReq = null; }
    Object.keys(peers).forEach(dropPeer);
    if (phoneId) { LS.rtcOnLeave(key, "phone", false); LS.rtcSet(key, "", null); }
    phoneId = null;
  }
  function gathered(pc, ms) {
    return new Promise(res => {
      if (pc.iceGatheringState === "complete") return res();
      const t = setTimeout(res, ms);
      pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); res(); } });
    });
  }
  function makePeer(vid) {
    const pc = new RTCPeerConnection(ICE), p = peers[vid] = { pc, un: null };
    stream.getVideoTracks().forEach(t => pc.addTrack(t, stream));
    pc.onconnectionstatechange = () => { if (pc.connectionState === "failed" || pc.connectionState === "closed") dropPeer(vid); paintStat(); };
    pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => gathered(pc, 2500)).then(() => {
      if (peers[vid] !== p) return;
      LS.rtcSet(key, "off/" + vid, { sdp: pc.localDescription.sdp, pid: phoneId, at: LS.now() });
      p.un = LS.rtcWatch(key, "ans/" + vid, a => {
        if (!a || !a.sdp || peers[vid] !== p || pc.signalingState !== "have-local-offer") return;
        pc.setRemoteDescription({ type: "answer", sdp: a.sdp }).then(() => sharp(pc)).catch(() => dropPeer(vid));
      });
    }).catch(() => dropPeer(vid));
  }
  /* up to 2.5 Mbps: sharp enough to see the smoke and the meter's number */
  function sharp(pc) {
    pc.getSenders().forEach(s => {
      if (!s.track || s.track.kind !== "video" || !s.getParameters) return;
      try { const pr = s.getParameters(); if (!pr.encodings || !pr.encodings.length) pr.encodings = [{}]; pr.encodings[0].maxBitrate = 2500000; s.setParameters(pr).catch(() => {}); } catch (e) {}
    });
  }
  function dropPeer(vid) {
    const p = peers[vid]; if (!p) return;
    delete peers[vid];
    if (p.un) p.un();
    try { p.pc.close(); } catch (e) {}
    LS.rtcSet(key, "off/" + vid, null);
  }
  const directN = () => Object.keys(peers).filter(v => peers[v].pc.connectionState === "connected").length;

  /* ───────── recording on the phone ───────── */
  function startRec() {
    rec = null;
    if (!$("#crec").checked || !window.MediaRecorder || !stream) return;
    const types = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    recType = types.find(t => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) || "";
    let r = null;
    try { r = new MediaRecorder(stream, recType ? { mimeType: recType, videoBitsPerSecond: 2500000 } : {}); }
    catch (e) { try { r = new MediaRecorder(stream); recType = ""; } catch (x) { camErr = "This phone cannot record here — the live pictures still work."; return; } }
    chunks = [];
    r.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    r.onstop = () => {
      const type = r.mimeType || recType || "video/webm";
      clip = { blob: new Blob(chunks, { type }), type, secs: Math.max(1, Math.round((Date.now() - recStart) / 1000)), at: new Date(), saved: false };
      chunks = []; rec = null; paint();
    };
    try { r.start(1000); rec = r; recStart = Date.now(); } catch (e) { camErr = "Recording did not start — the live pictures still work."; }
  }
  const clipName = () => {
    const d = clip.at, p = n => String(n).padStart(2, "0");
    return "jar-test-" + d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + (/mp4/.test(clip.type) ? ".mp4" : ".webm");
  };
  const clipFile = () => { try { return new File([clip.blob], clipName(), { type: clip.type }); } catch (e) { return null; } };
  function canShareClip() { try { const f = clip && clipFile(); return !!(f && navigator.canShare && navigator.canShare({ files: [f] })); } catch (e) { return false; } }
  function saveClip() {
    if (!clip) return;
    if (canShareClip()) navigator.share({ files: [clipFile()], title: "Jar test" }).then(() => { clip.saved = true; paint(); }).catch(() => {});
    else download();
  }
  function download() {
    if (!clip) return;
    const a = document.createElement("a"); a.href = URL.createObjectURL(clip.blob); a.download = clipName();
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 120000);
    clip.saved = true; paint();
  }

  /* keep the screen on while live; warn before closing while live or with a video not saved */
  function keepAwake(on) {
    try {
      if (on && "wakeLock" in navigator && !wake) navigator.wakeLock.request("screen").then(w => { wake = w; w.addEventListener("release", () => { wake = null; }); }).catch(() => {});
      if (!on && wake) { wake.release().catch(() => {}); wake = null; }
    } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && live) keepAwake(true); });
  window.addEventListener("beforeunload", e => { if (live || rec || (clip && !clip.saved)) { e.preventDefault(); e.returnValue = ""; } });
  window.addEventListener("pagehide", () => { if (live) LS.camFrame(key, { stopped: true, at: LS.now(), seq: ++seq }); });

  LS.onError(paintLive);
  LS.watchConnected(v => { connected = v; paintLive(); });
  LS.watchState(s => { ST = s || {}; stateSeen = true; paint(); });
  if (!LS.available()) { stateSeen = true; paint(); }
  paint();
})();
