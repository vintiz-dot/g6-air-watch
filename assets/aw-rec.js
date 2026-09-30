/* Air Watch lesson — record the live video on the teacher's laptop (rec.html?k=KEY, opened from the teacher
   page: ● Record on this laptop). The window plays the VDO.Ninja live video from the phone. Start recording →
   the browser asks to share this tab → Allow; the recording is cropped to the video. Stop and save → the file
   goes to the Downloads folder. The teacher page shows the time and can stop it too (BroadcastChannel). */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const key = (new URLSearchParams(location.search).get("k") || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 24);
  /* the same player link as AWL.NINJA.view in aw-core.js */
  const VIEW = k => "https://vdo.ninja/?view=aw" + k + "&cleanoutput&transparent&noaudio";
  let stream = null, mr = null, chunks = [], t0 = 0, clip = null, type = "", cropped = false, errText = "", starting = false;
  let bc = null;
  try { bc = new BroadcastChannel("aw_rec"); } catch (e) {}
  const secs = () => mr ? Math.round((Date.now() - t0) / 1000) : clip ? clip.secs : 0;
  const mmss = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  const state = () => mr ? "rec" : clip ? "saved" : "ready";
  function tell(st) { try { if (bc) bc.postMessage({ from: "rec", st: st || state(), secs: secs(), name: clip ? clip.name : "" }); } catch (e) {} }
  if (bc) bc.onmessage = e => { const d = e.data || {}; if (d.from !== "teach") return; if (d.cmd === "stop") stop(); if (d.cmd === "ping") tell(); };

  /* the player */
  const fr = $("#rframe");
  if (key) {
    const f = document.createElement("iframe");
    f.className = "cvninja"; f.title = "Live video from the teacher’s phone";
    f.allow = "autoplay; fullscreen; picture-in-picture"; f.src = VIEW(key);
    fr.appendChild(f);
    const hit = document.createElement("div"); hit.className = "cvhit"; fr.appendChild(hit);
  }

  function paint() {
    const st = $("#rstat");
    $("#rstart").hidden = !!mr || !key;
    $("#rstart").disabled = starting;
    $("#rstart").textContent = starting ? "Waiting for your OK…" : clip ? "● Record again" : "● Start recording";
    $("#rstop").hidden = !mr;
    $("#rsave").hidden = !clip || !!mr;
    document.body.classList.toggle("recording", !!mr);
    if (!key) { st.innerHTML = "Open this window from the teacher page: <b>● Record on this laptop</b>."; return; }
    if (errText) { st.innerHTML = '<span class="rerr">' + errText + "</span>"; return; }
    if (mr) { st.innerHTML = '<b class="rrec">● REC ' + mmss(secs()) + "</b> Keep this window open — other windows can go on top of it." + (cropped ? "" : " (Recording the whole window.)"); return; }
    if (clip) { st.innerHTML = "Saved ✓ <b>" + clip.name + "</b> (" + mmss(clip.secs) + ", " + (clip.blob.size / 1048576).toFixed(1) + " MB) in your <b>Downloads</b> folder."; return; }
    st.innerHTML = "When the video shows, press <b>Start recording</b>. The browser asks to share this tab — choose <b>Allow</b>.";
  }
  /* MP4 with H.264 plays everywhere (Windows, PowerPoint, phones); WebM when the browser cannot make it */
  const pick = () => ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1.4D401F", "video/mp4;codecs=avc1.42E01F", "video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]
    .find(t => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) || "";

  async function start() {
    if (mr || starting || !key) return;
    errText = "";
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia || !window.MediaRecorder) { errText = "This browser cannot record a tab. Use Chrome or Edge on this laptop."; paint(); return; }
    starting = true; paint();
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false,
        preferCurrentTab: true, selfBrowserSurface: "include", surfaceSwitching: "exclude", monitorTypeSurfaces: "exclude"
      });
    } catch (e) {
      starting = false; stream = null;
      errText = e && e.name === "NotAllowedError" ? "Not recording — the browser needs your OK. Press Start recording again and choose Allow." : "Recording did not start: " + ((e && e.message) || e);
      paint(); return;
    }
    starting = false;
    const tr = stream.getVideoTracks()[0];
    cropped = false;
    /* only the video, not the buttons (Chrome and Edge) */
    try { if (window.CropTarget && CropTarget.fromElement && tr && tr.cropTo) { await tr.cropTo(await CropTarget.fromElement(fr)); cropped = true; } } catch (e) {}
    if (tr) tr.addEventListener("ended", () => stop());
    type = pick();
    try { mr = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 6000000 } : { videoBitsPerSecond: 6000000 }); }
    catch (e) { try { mr = new MediaRecorder(stream); type = ""; } catch (x) { mr = null; drop(); errText = "This browser cannot record here."; paint(); return; } }
    chunks = []; clip = null;
    const r = mr;
    r.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    r.onstop = () => finish(r);
    try { r.start(1000); } catch (e) { mr = null; drop(); errText = "Recording did not start: " + ((e && e.message) || e); paint(); return; }
    t0 = Date.now();
    tell("rec"); paint();
  }
  function stop() { if (!mr) return; const r = mr; try { r.stop(); } catch (e) { finish(r); } }
  function finish(r) {
    if (r !== mr) return;
    const tp = (r.mimeType || type || "video/webm").split(";")[0];
    const d = new Date(), p = n => String(n).padStart(2, "0");
    const name = "jar-test-" + d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + (/mp4/.test(tp) ? ".mp4" : ".webm");
    clip = { blob: new Blob(chunks, { type: tp }), type: tp, secs: Math.max(1, Math.round((Date.now() - t0) / 1000)), name };
    chunks = []; mr = null; drop();
    save(); tell("saved"); paint();
  }
  function drop() { if (stream) stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); stream = null; }
  function save() {
    if (!clip) return;
    const a = document.createElement("a"); a.href = URL.createObjectURL(clip.blob); a.download = clip.name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 120000);
  }
  $("#rstart").onclick = start;
  $("#rstop").onclick = stop;
  $("#rsave").onclick = save;
  window.addEventListener("beforeunload", e => { if (mr) { e.preventDefault(); e.returnValue = ""; } });
  window.addEventListener("pagehide", () => { if (mr) stop(); tell("closed"); });
  setInterval(() => { if (mr) { paint(); tell("rec"); } }, 1000);
  setInterval(() => { if (!mr) tell(); }, 4000);
  tell(); paint();
  window.AWREC = { start, stop, get recording() { return !!mr; }, get clip() { return clip; }, get cropped() { return cropped; }, get type() { return type; } };
})();
