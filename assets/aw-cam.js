/* Air Watch lesson — the live camera on the teacher's phone (cam.html?k=KEY, opened from the QR code on the
   teacher's page). While it is live it sends the newest picture from the back camera to the lesson room:
   about 3 a second while the teacher shows it on the screens, one every 2 seconds otherwise (the teacher's
   preview). It records a video on the phone at the same time; Stop → Save the video. */
(function () {
  "use strict";
  const { U, LS } = window.AWL;
  const { $, esc } = U;
  const key = (new URLSearchParams(location.search).get("k") || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 24);
  let ST = {}, stateSeen = false, connected = null;
  let stream = null, live = false, seq = 0, inFlight = 0, lastSent = 0, acks = [], sizes = [];
  let rec = null, chunks = [], recStart = 0, recType = "", clip = null, wake = null, camErr = "", starting = false;
  const canvas = document.createElement("canvas"), cx = canvas.getContext("2d");

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
    s.innerHTML = (ST.camOn ? '<b class="on">On every screen now</b>' : '<b>Only your laptop sees it</b> — press Tab there (or “Show on every screen”)') +
      ' · ' + fps.toFixed(1) + ' pictures a second' + (kb ? ' · ' + kb + ' KB each' : '') + (rec ? ' · <b class="rec">● REC ' + mmss(Math.round((n - recStart) / 1000)) + '</b>' : '');
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
    startRec(); keepAwake(true); paint();
  }
  function stop() {
    if (!live) return;
    live = false; keepAwake(false);
    if (rec) { const r = rec; try { r.stop(); } catch (e) { rec = null; } }
    LS.camFrame(key, { stopped: true, at: LS.now(), seq: ++seq });
    paint();
  }
  /* the newest picture: small (640 px), at most two on the way, so a slow Wi-Fi only lowers the rate */
  function pump() {
    if (!live || !video.videoWidth) return;
    const t = Date.now(), every = ST.camOn ? 330 : 2000;
    if (inFlight >= 2 || t - lastSent < every) return;
    const vw = video.videoWidth, vh = video.videoHeight, sc = Math.min(1, 640 / Math.max(vw, vh));
    canvas.width = Math.round(vw * sc); canvas.height = Math.round(vh * sc);
    let f = null;
    try { cx.drawImage(video, 0, 0, canvas.width, canvas.height); f = canvas.toDataURL("image/jpeg", 0.55); } catch (e) { return; }
    lastSent = t; inFlight++; seq++;
    const n = Date.now(); acks = acks.filter(x => n - x < 5000);
    LS.camFrame(key, { f, at: LS.now(), seq, w: canvas.width, h: canvas.height, rec: !!rec, fps: Math.round(acks.length / 5 * 10) / 10 }).then(ok => {
      inFlight = Math.max(0, inFlight - 1);
      if (ok) { acks.push(Date.now()); sizes.push(f.length); if (sizes.length > 15) sizes.shift(); }
    });
  }
  setInterval(pump, 60);
  setInterval(() => { if (live) paintStat(); }, 1000);

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
