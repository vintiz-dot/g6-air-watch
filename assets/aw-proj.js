/* Air Watch lesson — the class display on the projector (read-only).
   Shows class-level results only; names appear only on a spotlight the teacher chooses. */
(function () {
  "use strict";
  const { U, LS, HW, CH } = window.AWL;
  const { $, esc } = U;
  const C = window.AW, D = window.LESSON, CAT = window.AW_CAT, E = window.AWE;
  const NST = C.stations || 11;
  let ST = {}, PAIRS = {}, QS = {}, VOTES = {}, METER = {}, HOMEWORK = {}, HWCFG = {}, FB = {}, EVENTS = {};
  let builtKey = null, upd = null, aqNow = null, aqUid = null;
  const photoSrc = {};
  const rev = k => !!(ST.reveal && ST.reveal[k]);
  const pairsL = () => E.pairs(PAIRS);

  /* ───────── controls: theme, full screen on the projector ───────── */
  try { const t = localStorage.getItem("aw_proj_theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  $("#theme").onclick = () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("aw_proj_theme", t); } catch (e) {} };
  $("#fs").onclick = async () => {
    const root = document.documentElement;
    try {
      if (window.getScreenDetails) {
        const sd = await window.getScreenDetails();
        const ext = sd.screens.find(s => !s.isPrimary) || sd.currentScreen;
        await root.requestFullscreen({ screen: ext });
      } else await root.requestFullscreen();
    } catch (e) { try { await root.requestFullscreen(); } catch (x) {} }
  };
  let hideT;
  const showCtl = () => { $("#pctrl").classList.remove("hide"); clearTimeout(hideT); hideT = setTimeout(() => $("#pctrl").classList.add("hide"), 3500); };
  document.addEventListener("mousemove", showCtl); showCtl();

  /* ───────── small builders ───────── */
  function bars(rows, pct, cls) {
    return '<div class="pbars' + (cls ? " " + cls : "") + '">' + rows.map(r => {
      const p = U.pct(r.v, Math.max(1, r.of));
      return '<div class="pbar' + (r.key ? " key" : "") + '"><span class="l">' + r.label + '</span><span class="t"><i style="width:' + p + '%"></i></span><span class="v">' + (pct ? p + "%" : r.v) + '</span></div>';
    }).join("") + '</div>';
  }
  function tally(n, get, opts, keys) {
    const N = pairsL().length, r = E.tally(PAIRS, n, get, opts.map(o => o[0]));
    return { rows: opts.map(o => ({ label: esc(o[1]), v: r.counts[o[0]], of: Math.max(1, r.total), key: (keys || []).includes(o[0]) })), total: r.total, N };
  }
  const short = (s, n) => s.length > n ? s.slice(0, n - 1) + "…" : s;
  function joinGrid(box) {
    if (!box) return;
    const on = {}; pairsL().forEach(p => { on[p.st] = true; });
    let h = ""; for (let i = 1; i <= NST; i++) h += '<span class="' + (on[i] ? "on" : "") + '">' + i + '</span>';
    box.innerHTML = h;
  }
  const votes = n => n + (n === 1 ? " vote" : " votes");
  const answered = (n, f) => pairsL().filter(p => f(((p.a || {})["s" + n]) || {})).length;

  /* ───────── the stage for each moment ───────── */
  const BUILD = {
    none(stg) { stg.innerHTML = '<div class="pwait"><div class="pq">' + esc(D.title) + '</div><p style="font-size:1.2em;margin:0">' + (LS.available() ? "Waiting for the teacher to start the lesson…" : "No database connection — open check.html on this laptop.") + '</p></div>'; return null; },
    before(stg) {
      stg.innerHTML = '<div class="pwait"><div class="pnote" style="font-size:1em;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Welcome, Grade 6</div><div class="pq">' + esc(D.bigQ) + '</div>' +
        '<p style="font-size:1.25em;margin:0">Sit at your station. On the laptop, choose your <b>station number</b>, then your <b>names</b>.</p><div class="pjoin" id="pj" style="width:82%"></div><p class="pnote" id="pjn"></p></div>';
      return () => { joinGrid($("#pj")); const L = pairsL(); $("#pjn").textContent = L.length + " of " + NST + " stations ready · " + L.reduce((s, p) => s + p.names.length, 0) + " students"; };
    },
    ended(stg) { stg.innerHTML = '<div class="pwait"><div class="pq">Thank you, Grade 6.</div><p style="font-size:1.25em;margin:0;max-width:70%">' + esc(D.reflect.next) + '</p></div>'; return null; },

    s1(stg) {
      stg.innerHTML = '<div class="pgrid2"><div class="pcard"><h3>Our big question</h3><div class="pq">' + esc(D.bigQ) + '</div><h3 style="margin-top:1em">Our 3 goals today</h3><ul class="pgoals labelled">' + D.goals.map(g => '<li><span class="gtag g-' + g.k + '">' + esc(g.short) + '</span> ' + esc(g.text) + '</li>').join("") + '</ul></div>' +
        '<div class="pcard"><h3>Silent start <small>on your laptop</small></h3><ol class="pgoals"><li>Tap your worst day — the highest number.</li><li>Were your eyes right on that day?</li><li>Vote: can you tell by looking?</li></ol><h3 style="margin-top:1em">Stations</h3><div class="pjoin" id="pj"></div><p class="pnote" id="pv"></p></div></div>';
      return () => { joinGrid($("#pj")); $("#pv").textContent = answered(1, a => a.pre) + " of " + pairsL().length + " pairs have voted. The class answer stays hidden until the end of the lesson."; };
    },

    s2(stg) {
      stg.innerHTML = '<div class="pgrid2" style="grid-template-columns:1fr 1.7fr"><div class="pcard"><h3>How often were our eyes right?</h3><div id="gs"></div><h3 style="margin-top:.7em">Wonder Wall <small id="wwn"></small></h3><div class="pwall" id="ww"></div></div><div class="pcard" id="rc"></div></div>';
      return () => {
        const g = HW.guessScore(HOMEWORK);
        $("#gs").innerHTML = rev("guess") ? '<div class="pbig">' + g.pct + '%<small>Our class guessed right ' + g.right + ' times out of ' + g.total + ' — by looking at the sky.</small></div>'
          : '<div class="pbig">?<small>Every day you guessed <b>before</b> you checked. ' + g.total + ' guesses from our class.</small></div>';
        const qs = Object.keys(QS).map(k => QS[k]).filter(q => q.ok === true).sort((a, b) => b.at - a.at);
        $("#wwn").textContent = qs.length ? qs.length + " questions" : "";
        $("#ww").innerHTML = qs.length ? qs.slice(0, 6).map(q => '<div>' + esc(q.text) + '</div>').join("") : '<p class="pnote" style="margin:0">Your questions appear here.</p>';
        const rc = $("#rc"), ph = ST.photos || [], pk = JSON.stringify(ph);
        if (rc.dataset.key !== pk) {
          rc.dataset.key = pk;
          if (!ph.length) rc.innerHTML = '<h3>Your question <small>post it on your laptop</small></h3><ol class="pgoals">' + D.starters.map(s => '<li>' + esc(s) + '</li>').join("") + '</ol>';
          else {
            rc.innerHTML = '<h3>Which sky had the worst air? <small>vote A, B or C on your laptop</small></h3><div class="pphotos">' + ph.map((p, i) => '<figure><div class="im" id="pim' + i + '">loading…</div><figcaption><span class="L">' + "ABC"[i] + '</span><span class="vt" id="pvt' + i + '"></span><span class="aq" id="paq' + i + '"></span></figcaption></figure>').join("") + '</div>';
            ph.forEach((p, i) => {
              const k = p.code + "_" + p.day, put = src => { const d = $("#pim" + i); if (d) d.innerHTML = src ? '<img alt="Sky photo ' + "ABC"[i] + '" src="' + src + '">' : "photo missing"; };
              if (photoSrc[k] !== undefined) put(photoSrc[k]); else LS.getPhoto(p.code, p.day).then(v => { photoSrc[k] = v && v.d ? v.d : null; put(photoSrc[k]); });
            });
          }
        }
        if (ph.length) {
          const vs = VOTES.photo || {}, ids = new Set(pairsL().map(p => p.pid)), c = {};
          Object.keys(vs).forEach(pid => { if (ids.has(pid)) c[vs[pid]] = (c[vs[pid]] || 0) + 1; });
          ph.forEach((p, i) => {
            const L1 = "ABC"[i], aq = HW.photoAqi(HOMEWORK, p.code, p.day), cat = CAT(aq);
            const v = $("#pvt" + i), a = $("#paq" + i);
            if (v) v.textContent = votes(c[L1] || 0);
            if (a) a.innerHTML = rev("photos") && aq != null ? U.catChip(aq) + " <small>" + esc(cat ? cat.en : "") + "</small>" : "";
          });
        }
      };
    },

    s3(stg) {
      stg.innerHTML = '<div class="pcard"><h3>Predict → Observe → Explain <small>PM2.5 at the jar, micrograms per cubic metre (µg/m³)</small></h3><div class="pmeter" id="pm"></div></div>' +
        '<div class="pgrid2"><div class="pcard"><h3>Our predictions <small id="pdn"></small></h3><div id="pd"></div></div>' +
        '<div class="pcard"><h3>Explain</h3><div class="pframe">It looks ____ but the meter shows ____ so ____</div><p class="pnote" style="margin-top:.6em">Book page ' + D.jar.bookQ3.page + ' — ' + esc(D.jar.bookQ3.text) + '</p></div></div>';
      return () => {
        const has = k => METER[k] != null && METER[k] !== "", v = k => has(k) ? esc(METER[k]) : "–";
        const x = (a, b) => has(a) && has(b) && +METER[b] > 0 && isFinite(+METER[a]) ? +METER[a] / +METER[b] : null;
        const rp = x("peak", "base"), ra = x("after", "base");
        $("#pm").innerHTML = '<div><span>Room air</span><b>' + v("base") + '</b><em>before</em></div>' +
          '<div class="' + (has("peak") ? "x" : "") + '"><span>Smoke at the meter</span><b>' + v("peak") + '</b><em>' + (rp && rp >= 2 ? Math.round(rp) + " × the room air" : "&nbsp;") + '</em></div>' +
          '<div><span>60 seconds later</span><b>' + v("after") + '</b><em>' + (ra && ra >= 1.5 ? "looks clear — still " + (Math.round(ra * 10) / 10) + " × the room air" : "looks clear") + '</em></div>';
        const n1 = answered(3, a => a.p1), N = pairsL().length;
        $("#pdn").textContent = n1 + " of " + N + " pairs predicted";
        $("#pd").innerHTML = rev("pred")
          ? '<p class="pnote" style="margin:0">' + esc(D.jar.predict1.q) + '</p>' + bars(tally(3, a => a.p1, D.jar.predict1.opts).rows) + '<p class="pnote" style="margin:.4em 0 0">' + esc(D.jar.predict2.q) + '</p>' + bars(tally(3, a => a.p2, D.jar.predict2.opts).rows)
          : '<p class="pq" style="font-size:1.35em">Predict on your laptop first.</p><p class="pnote">The class predictions appear when your teacher shows them.</p>';
      };
    },

    s4(stg) {
      stg.innerHTML = '<div class="pgrid2"><div class="pcard"><h3>Pollutant or not? <small id="sn"></small></h3><div id="srt"></div></div><div class="pcard"><h3>Book page ' + D.focus.q1.page + ' · Q1 and Q2 <small id="qn"></small></h3><div id="q12"></div></div></div>';
      return () => {
        const L = pairsL(), rs = rev("sort");
        let any = 0;
        $("#srt").innerHTML = '<div class="pbars wide sm">' + D.focus.cards.map(cd => {
          const vals = L.map(p => (((p.a || {}).s4 || {}).sort || {})[cd.k]).filter(Boolean);
          any = Math.max(any, vals.length);
          const y = U.pct(vals.filter(x => x === "yes").length, Math.max(1, vals.length));
          return '<div class="pbar' + (rs && cd.yes ? " key" : "") + '"><span class="l">' + esc(cd.en) + (rs && !cd.yes ? ' <small style="color:var(--muted)">(not)</small>' : '') + '</span><span class="t"><i style="width:' + y + '%"></i></span><span class="v">' + y + '%</span></div>';
        }).join("") + '</div><p class="pnote" style="margin:.3em 0 0">Bar = % of pairs who said “pollutant”.' + (rs ? " ✓ = it is a pollutant." : "") + '</p>';
        $("#sn").textContent = any + " pairs sorting";
        const n2 = answered(4, a => E.arr(a.q2).filter(Boolean).length >= 4);
        $("#qn").textContent = n2 + " of " + L.length + " pairs answered";
        if (!rev("q1q2")) $("#q12").innerHTML = '<p class="pq" style="font-size:1.35em">Answer in your book first — then on your laptop.</p><p class="pnote">The answers appear here when your teacher shows them.</p>';
        else {
          const ch = E.checks(PAIRS).filter(c => c.screen === 4 && c.label.indexOf("Sort") !== 0 && c.n);
          $("#q12").innerHTML = bars(ch.map(c => ({ label: esc(c.label), v: c.right, of: c.n })), true, "wide sm") +
            '<p class="pnote" style="margin:.4em 0 0">Bar = % of pairs right. Q1: 1-a, 2-b, 3-c, 4-d · Q2: T, F, T, F · Language: B</p>';
        }
      };
    },

    s5(stg) {
      stg.innerHTML = '<div class="pgrid2" style="grid-template-columns:.8fr 2fr"><div class="pcard"><h3>How is ONE number made from SIX?</h3><div id="hy"></div><h3 style="margin-top:.6em">Time or place?</h3><div id="tpq"></div></div><div class="pcard"><h3>Our data <small>one place at different times · different places</small></h3><div id="tpc"></div></div></div>';
      return () => {
        $("#hy").innerHTML = bars(tally(5, a => a.hyp, [["total", "All six added"], ["avg", "The average"], ["big", "The biggest"]]).rows, false, "sm");
        const yn = [["yes", "Yes"], ["no", "No"], ["cant", "Can’t tell"]];
        const t = tally(5, a => a.time && a.time.yn, yn).rows, p = tally(5, a => a.place && a.place.yn, yn).rows;
        $("#tpq").innerHTML = '<p class="pnote" style="margin:0">Does TIME change it?</p>' + bars(t, false, "sm") + '<p class="pnote" style="margin:.3em 0 0">Does PLACE change it?</p>' + bars(p, false, "sm");
        const k = JSON.stringify([HW.readings(HOMEWORK), Object.keys(HOMEWORK).length]);
        const tpc = $("#tpc");
        if (tpc.dataset.key !== k) {
          tpc.dataset.key = k;
          const pts = HW.classPoints(HOMEWORK), sts = HW.byStation(HOMEWORK);
          tpc.innerHTML = (pts.length || sts.length) ? '<div class="pcols" style="grid-template-columns:1fr 1fr"><div><p class="pnote" style="margin:0">Class station: every dot is one reading</p>' + CH.dots(pts, { w: 440, h: 300, fs: 16, r: 7 }) +
            '<p class="legend"><i style="background:#1C7293"></i>Morning <i style="background:#C8871B"></i>After school <i style="background:#7B2FA0"></i>Evening</p></div>' +
            '<div><p class="pnote" style="margin:0">Our stations: average AQI for the week</p>' + CH.bars(sts.slice(0, 7).map(s => ({ label: short(s.name.replace(/^Hanoi:\s*/, ""), 16), v: s.avg, col: (CAT(s.avg) || {}).col })), { label: "Average AQI by station", w: 440, rowH: 42, pad: 150, fs: 18 }) + '</div></div>'
            : '<p class="pnote">No homework data yet.</p>';
        }
      };
    },

    s6(stg) {
      stg.innerHTML = '<div class="pgrid2"><div class="pcard"><h3>Data question 1 · book p.' + D.inv2.dbq1.page + ' <small>choose two</small></h3><img class="pimg big" alt="Carbon dioxide over time" src="' + D.inv2.dbq1.img + '"><div id="d1"></div></div>' +
        '<div class="pcard"><h3>Data question 2 · book p.' + D.inv2.dbq2.page + '</h3><img class="pimg big" alt="Carbon dioxide at Mauna Loa" src="' + D.inv2.dbq2.img + '"><div id="d2"></div></div></div>';
      return () => {
        const r = rev("dbq");
        $("#d1").innerHTML = bars(tally(6, a => a.d1 && a.d1.pick, D.inv2.dbq1.opts.map((o, i) => [o[0], D.inv2.dbq1.short[i]]), r ? ["B", "D"] : []).rows, false, "wide sm") + (r ? '<p class="pnote" style="margin:.3em 0 0">B is an <b>effect</b>, D is a <b>cause</b>.</p>' : '');
        $("#d2").innerHTML = bars(tally(6, a => a.d2 && a.d2.pick, D.inv2.dbq2.opts.map((o, i) => [o[0], D.inv2.dbq2.short[i]]), r ? ["A"] : []).rows, false, "wide sm") + '<p class="pnote" style="margin:.3em 0 0">Short labels — the full wording is on your laptop and in the book.</p>';
      };
    },

    s7(stg) {
      stg.innerHTML = '<div class="pcard" style="flex:1"><h3>Say it without Hanoi <small id="rn"></small></h3><div id="gv"></div></div>';
      return () => {
        const L = pairsL(), sent = answered(7, a => a.submitted);
        $("#rn").textContent = sent + " of " + L.length + " pairs have sent a rule";
        const gv = $("#gv"), rv = ST.ruleVote;
        const voteBars = () => {
          const vs = VOTES.rule || {}, ids = new Set(L.map(p => p.pid)), c = {}; let tot = 0;
          Object.keys(vs).forEach(pid => { if (ids.has(pid)) { c[vs[pid]] = (c[vs[pid]] || 0) + 1; tot++; } });
          return { tot, html: bars(rv.items.map((it, i) => ({ label: '<b>' + "ABC"[i] + '.</b> ' + esc(it.text), v: c[i] || 0, of: Math.max(1, tot) })), false, "rules") };
        };
        if (ST.classRule && ST.classRule.text) {
          const vb = rv && rv.items && rv.items.length ? voteBars() : null;
          gv.innerHTML = '<p class="pnote" style="margin:0 0 .3em;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Our class rule — true for any city</p><div class="prule" style="font-size:2em">' + esc(ST.classRule.text) + '</div><p class="pnote" style="margin:.8em 0">Book page ' + D.gen.bookQ1.page + ' — ' + esc(D.gen.bookQ1.text) + '</p>' +
            (vb ? '<div style="font-size:.8em;opacity:.85"><p class="pnote" style="margin:0 0 .3em">How we voted (' + votes(vb.tot) + ')</p>' + vb.html + '</div>' : '');
        } else if (rv && rv.items && rv.items.length) {
          const vb = voteBars();
          gv.innerHTML = '<p class="pnote" style="margin:0 0 .5em">Which rule works for ANY city? Vote on your laptop. (' + votes(vb.tot) + ')</p>' + vb.html;
        } else gv.innerHTML = D.gen.frames.map(f => '<div class="pframe" style="margin-bottom:.5em"><b>' + f.k.toUpperCase() + '</b> ' + f.parts.map(esc).join(" ____ ") + (f.k === "g2" ? "" : " ____") + '</div>').join("") +
          '<div class="bank" style="font-size:.9em">' + D.gen.bank.map(w => '<span>' + esc(w) + '</span>').join("") + '</div>';
      };
    },

    s8(stg) {
      stg.innerHTML = '<div class="pgrid2" style="grid-template-columns:1.35fr 1fr"><div class="pcard"><h3>Book page ' + D.transfer.q3.page + ' · Q3 <small>choose three</small></h3><p style="margin:0 0 .5em;font-size:.8em;line-height:1.35">' + esc(D.transfer.q3.text) + '</p><div id="q3"></div></div>' +
        '<div class="pcard"><h3>Fix our week</h3><div class="pframe" style="font-size:1em">Our numbers disagreed. Design a way where they would not.</div><ol class="pgoals" style="font-size:1em">' + D.transfer.plan.map(([k, l]) => '<li>' + esc(l) + '</li>').join("") + '</ol><div class="pgrid3" id="fx" style="margin-top:.6em"></div></div></div>';
      return () => {
        const r = rev("q3");
        $("#q3").innerHTML = bars(tally(8, a => a.q3, D.transfer.q3.opts.map((o, i) => [o[0], D.transfer.q3.short[i]]), r ? ["A", "B", "C"] : []).rows, false, "wide") + (r ? '<p class="pnote" style="margin:.3em 0 0">A, B and C. Why would D and E fail?</p>' : '');
        const L = pairsL(), plans = answered(8, a => Object.values(a.plan || {}).filter(x => U.txt(x)).length >= 3);
        const gave = new Set(Object.keys(FB).map(k => FB[k] && FB[k].from)), fb = L.filter(p => gave.has(p.pid)).length;
        $("#fx").innerHTML = '<div class="pbig" style="font-size:2.6em">' + plans + '<small>plans ready</small></div><div class="pbig" style="font-size:2.6em">' + fb + '<small>peer checks sent</small></div><div class="pbig" style="font-size:2.6em">' + L.length + '<small>pairs</small></div>';
      };
    },

    s9(stg) {
      stg.innerHTML = '<div class="pgrid2"><div class="pcard"><h3>' + esc(D.vote.q) + '</h3><div id="sh"></div><p class="pnote" id="nx" style="margin-top:auto"></p></div><div class="pcard"><h3>Our 3 goals</h3><div id="gl"></div></div></div>';
      return () => {
        const L = pairsL(), sh = E.shift(PAIRS);
        const tot = o => Math.max(1, Object.values(o).reduce((s, v) => s + v, 0));
        if (rev("shift")) {
          const tp = tot(sh.pre), tq = tot(sh.post);
          $("#sh").innerHTML = '<div class="pshift">' + D.vote.opts.map(o => {
            const a = U.pct(sh.pre[o[0]], tp), b = U.pct(sh.post[o[0]], tq);
            return '<div class="row"><span class="l">' + esc(o[1]) + '</span><div class="bb"><div class="b0"><i style="width:' + a + '%"></i><em>' + a + '% at the start</em></div><div class="b1"><i style="width:' + b + '%"></i><em>' + b + '% now</em></div></div></div>';
          }).join("") + '</div><p class="pq" style="font-size:1.3em;margin-top:.6em">' + sh.moved + ' of ' + sh.both + ' pairs changed their minds.</p>';
        } else $("#sh").innerHTML = '<p class="pq" style="font-size:1.4em">Same question as the start — answer again on your laptop.</p><p class="pnote">' + answered(9, a => a.post) + ' of ' + L.length + ' pairs have answered.</p>';
        const typed = answered(9, a => a.goalsShown);
        const got = k => answered(9, a => (a.rec || {})[k] === "got");
        if (rev("goals")) {
          const rows = D.goals.map((g, i) => {
            const n = { yes: 0, almost: 0, no: 0 };
            L.forEach(p => { const r = E.arr((((p.a || {}).s9) || {}).rate)[i]; if (r && r.lv && n[r.lv] != null) n[r.lv]++; });
            const t = Math.max(1, n.yes + n.almost + n.no);
            return '<li><span class="gtag g-' + g.k + '">' + esc(g.short) + '</span> ' + esc(g.text) + '<div class="stack"><i class="y" style="width:' + U.pct(n.yes, t) + '%"></i><i class="a" style="width:' + U.pct(n.almost, t) + '%"></i><i class="n" style="width:' + U.pct(n.no, t) + '%"></i></div><small>YES ' + n.yes + ' · ALMOST ' + n.almost + ' · NOT YET ' + n.no + '</small></li>';
          }).join("");
          const mem = k => '<span><span class="gtag g-' + k + '">' + (k === "sci" ? "Science" : "Thinking") + '</span> from memory: <b>' + got(k) + '</b> of ' + L.length + ' pairs got it</span>';
          $("#gl").innerHTML = '<div class="pmem">' + mem("sci") + mem("think") + '</div><ul class="pgoals rated labelled">' + rows + '</ul>';
        } else $("#gl").innerHTML = '<p class="pq" style="font-size:1.4em">From memory first — do not look!</p><p style="margin:0 0 .4em">Write our <span class="gtag g-sci">Science</span> goal and our <span class="gtag g-think">Thinking</span> goal on your laptop.</p><p class="pnote">' + typed + ' of ' + L.length + ' pairs have checked their answers.</p>';
        $("#nx").textContent = D.reflect.next;
      };
    }
  };

  /* ───────── frame: top bar, bottom bar, spotlight ───────── */
  function paintTop() {
    const n = ST.screen || 1, s = D.screens[n - 1], running = ST.reset && ST.live !== false && ST.startedAt;
    const top = $("#ptop"), key = [n, !!running, ST.live].join();
    if (top.dataset.key === key) return; top.dataset.key = key;
    top.className = "ptop ph-" + s.phase.toLowerCase();
    top.innerHTML = running
      ? '<span class="pchip">' + esc(s.phase) + '</span><div class="pname"><small>Screen ' + n + ' of 9</small>' + esc(s.name) + '</div><div class="pgoalbar" id="pgoals" title="Our goals — measured on the screens we have finished"></div><div class="ptimer" id="ptm"></div>'
      : '<div class="pname"><small>Grade 6 · Natural Science · Lesson 6</small>' + esc(D.title) + '</div><div class="ptimer" id="ptm"></div>';
    tickTimer(); paintGoalBar();
  }
  function paintGoalBar() {
    const box = $("#pgoals"); if (!box) return;
    const h = E.goals({ state: ST, pairs: PAIRS, events: EVENTS }).map(g => '<div class="pgm g-' + g.k + '"><span>' + esc(g.short) + '<em>' + (g.pct == null ? "–" : g.pct + "%") + '</em></span><i><b style="width:' + (g.pct || 0) + '%"></b></i></div>').join("");
    if (box.dataset.h !== h) { box.dataset.h = h; box.innerHTML = h; }
  }
  function tickTimer() {
    const t = $("#ptm"); if (!t) return;
    const T = U.timer(ST, LS.now());
    if (!T || !ST.startedAt) { t.textContent = ""; t.className = "ptimer"; return; }
    t.textContent = U.mmss(Math.max(0, T.left));
    t.className = "ptimer" + (T.paused ? " paused" : T.left <= 0 ? " zero" : T.left < 60000 ? " low" : "");
  }
  setInterval(tickTimer, 250);
  function paintBot() {
    const L = pairsL(), n = ST.screen || 1, running = ST.startedAt && ST.live !== false;
    const done = L.filter(p => p.done && p.done[n]).length;
    $("#pbot").innerHTML = '<span class="bq"><b>Big question:</b> ' + esc(D.bigQ) + '</span>' +
      (running ? '<span class="cnt">Done: ' + done + ' of ' + L.length + ' pairs</span>' : '<span class="cnt">' + L.length + ' of ' + NST + ' stations</span>') +
      (aqNow ? '<span class="aqnow">Outside now · ' + esc(short(aqNow.name, 26)) + ' ' + U.catChip(aqNow.aqi) + '</span>' : '');
  }
  function paintSpot() {
    const sp = ST.spot, box = $("#spot");
    if (!sp || !sp.text) { box.hidden = true; box.dataset.at = ""; return; }
    if (box.dataset.at === String(sp.at)) return; box.dataset.at = String(sp.at);
    box.innerHTML = '<div><div class="k">★ ' + esc(sp.kind || "Spotlight") + '</div><div class="tx">' + esc(sp.text) + '</div><div class="by">Station ' + esc(sp.st) + (sp.names ? " · " + esc(sp.names) : "") + '</div></div>';
    box.hidden = false;
  }
  $("#spot").addEventListener("click", () => { $("#spot").hidden = true; });
  document.addEventListener("keydown", e => { if (e.key === "Escape") $("#spot").hidden = true; });
  function paintStage() {
    const mode = !ST.reset ? "none" : ST.live === false ? "ended" : !ST.startedAt ? "before" : "s" + (ST.screen || 1);
    const key = mode + ":" + (ST.reset || "");
    if (key !== builtKey) { builtKey = key; const stg = $("#stage"); stg.innerHTML = ""; upd = BUILD[mode] ? BUILD[mode](stg) : null; }
    if (upd) upd();
  }
  const queued = {};
  function later(name, fn, ms) { if (queued[name]) return; queued[name] = setTimeout(() => { queued[name] = null; try { fn(); } catch (e) { console.error(e); } }, ms || 150); }
  const all = () => { paintTop(); paintStage(); paintBot(); paintSpot(); };

  /* the class station's live number, every 10 minutes */
  function pollAqi() {
    const cs = HWCFG.classStation;
    if (!cs || !cs.uid || !window.WAQI) { aqNow = null; later("bot", paintBot, 50); return; }
    WAQI.feed(cs.uid).then(f => { aqNow = f && f.aqi != null ? { name: cs.name, aqi: f.aqi } : null; later("bot", paintBot, 50); })
      .catch(() => { aqNow = null; later("bot", paintBot, 50); });
  }
  setInterval(pollAqi, 10 * 60000);

  all();
  LS.watchState(s => { ST = s || {}; all(); });
  LS.watchEvents(v => { EVENTS = v || {}; later("goalbar", paintGoalBar, 300); });
  LS.watchPairs(v => { PAIRS = v || {}; later("stage", paintStage, 250); later("bot", paintBot, 300); later("goalbar", paintGoalBar, 800); });
  LS.watchQuestions(v => { QS = v || {}; later("stage", paintStage, 200); });
  LS.watchVotes(v => { VOTES = v || {}; later("stage", paintStage, 200); });
  LS.watchMeter(v => { METER = v || {}; later("stage", paintStage, 100); });
  LS.watchFeedback(v => { FB = v || {}; later("stage", paintStage, 300); });
  LS.watchHomework(v => { HOMEWORK = v || {}; later("stage", paintStage, 300); });
  LS.watchHomeworkConfig(v => { HWCFG = v || {}; const uid = HWCFG.classStation && HWCFG.classStation.uid; if (uid !== aqUid) { aqUid = uid; pollAqi(); } });
})();
