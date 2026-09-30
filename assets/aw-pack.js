/* Air Watch lesson — the print pack: every student's work on one A5 half-page, two per A4 sheet
   (landscape, with a cut line), to glue into their notebook and copy into the book.
   Each student gets their group's answers under their own name, grouped by book page;
   keyed questions show their answer, the right one, and ✓ or ✗. Opens in a new window:
   Print → "Save as PDF" (or print it straight away). */
(function () {
  "use strict";
  const D = window.LESSON, C = window.AW, CAT = window.AW_CAT;
  const E = () => window.AWE;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const txt = v => String(v == null ? "" : v).trim();
  const arr = v => Array.isArray(v) ? v : (v && typeof v === "object") ? Object.keys(v).filter(k => /^\d+$/.test(k)).reduce((o, k) => { o[+k] = v[k]; return o; }, []) : [];
  const S = (p, n) => (p && p.a && p.a["s" + n]) || {};
  const OK = '<b class="y">✓</b>', NO = '<b class="n">✗</b>';
  const miss = '<span class="miss">not answered</span>';
  const q = s => txt(s) ? "“" + esc(txt(s)) + "”" : miss;
  const tick = (ok, right) => ok === null ? "" : ok ? OK : NO + (right != null ? ' <span class="key">→ ' + esc(right) + '</span>' : "");
  const frame = (parts, vals, count) => { const s = E().frameText(parts, vals, count); return s ? "“" + esc(s) + "”" : miss; };

  /* one item: a tick box (for "written in my book"), a label, the answer */
  const item = (label, body, box) => '<div class="it">' + (box === false ? '<span class="bx0"></span>' : '<span class="bx">☐</span>') + '<div><b>' + label + '</b> ' + body + '</div></div>';
  const page = (p, title, items) => items.filter(Boolean).length ? '<div class="pg' + (/^p/.test(p) ? '' : ' nb') + '"><div class="pn">' + esc(p) + '</div><div class="its">' + (title ? '<div class="pt">' + esc(title) + '</div>' : '') + items.filter(Boolean).join("") + '</div></div>' : "";

  function dayCell(d) {
    if (!d || !d.a) return '<td class="none">–</td>';
    const v = d.a.pm25 != null && d.a.pm25 !== "" ? d.a.pm25 : d.a.aqi;
    return '<td>' + esc(v) + (d.a.pm25 == null || d.a.pm25 === "" ? '<small>AQI</small>' : '') + (d.catchup ? '<small>copied</small>' : '') + '</td>';
  }
  function weekTable(hw, code, worst) {
    const s = code && hw[code];
    if (!s) return '<span class="miss">No Air Watch found for this name — copy a partner’s week, or the class station.</span>';
    const days = s.days || {};
    let h = '<table class="wk"><tr><th>Day</th>';
    for (let i = 1; i <= C.days; i++) h += '<th' + (worst && worst.code === code && worst.day === i ? ' class="w"' : '') + '>' + i + '</th>';
    h += '</tr><tr><th>PM2.5</th>';
    for (let i = 1; i <= C.days; i++) h += dayCell(days[i]);
    return h + '</tr></table>';
  }

  /* everything one student needs, grouped by book page */
  function half(p, i, ctx) {
    const nm = p.names[i], others = p.names.filter((x, j) => j !== i), code = arr(p.codes)[i] || null;
    const hw = ctx.homework || {}, s1 = S(p, 1), s2 = S(p, 2), s3 = S(p, 3), s4 = S(p, 4), s5 = S(p, 5), s6 = S(p, 6), s7 = S(p, 7), s8 = S(p, 8), s9 = S(p, 9);
    const cls = code && hw[code] ? hw[code].c : "";
    const M = E().MARK;

    /* p.30 — what makes a pollutant */
    const sortN = D.focus.cards.map(cd => M.sort(s4, cd)).filter(x => x !== null);
    const p30 = page("p.30", "", [
      item("What makes a pollutant:", frame(D.focus.rule, s4.rule, 2) + (sortN.length ? ' · sort: ' + sortN.filter(Boolean).length + "/" + D.focus.cards.length + " right" : ""), false)
    ]);

    /* pp.30–31 — the reading and the AQI */
    const hyp = { total: "all six added", avg: "the average", big: "the biggest part" }[s5.hyp];
    const p31a = page("pp.30–31", "", [
      item("The AQI is", (hyp ? esc(hyp) + " " + tick(M.hyp(s5), "the biggest part") : miss) + " · " + frame(D.inv1.frame, s5.fr, 2) +
        ((s5.time && s5.time.yn) || (s5.place && s5.place.yn) ? " · time changes it: <b>" + esc((s5.time || {}).yn || "–") + "</b>, place: <b>" + esc((s5.place || {}).yn || "–") + "</b>" : ""), false)
    ]);

    /* p.31 — Talk & Write Q1 */
    const p31 = page("p.31", "", [
      item("Talk & Write Q1:", (txt(s7.rule) ? q(s7.rule) : miss) +
        (ctx.state && ctx.state.classRule && txt(ctx.state.classRule.text) && txt(ctx.state.classRule.text) !== txt(s7.rule) ? '<div class="sub">Class rule: “' + esc(ctx.state.classRule.text) + '”</div>' : ""))
    ]);

    /* p.32 — Part A questions and Talk & Write */
    const q1 = D.focus.q1.terms.map((t, j) => { const a = arr(s4.q1)[j]; return esc(t.replace(/^\d\.\s*/, "")) + " <b>" + esc(a || "–") + "</b> " + (a ? tick(a === D.focus.q1.key[j], D.focus.q1.key[j]) : ""); }).join(" · ");
    const q2 = D.focus.q2.key.map((k, j) => { const a = arr(s4.q2)[j]; return "abcd"[j] + " <b>" + esc(a || "–") + "</b> " + (a ? tick(a === k, k) : ""); }).join(" · ");
    const mapA = s4.map != null ? "ABCD"[s4.map] : null, mapK = "ABCD"[D.focus.map.key];
    const q3 = arr(s8.q3).filter(Boolean).slice().sort();
    const p32 = page("p.32", "", [
      item("Q1 Match:", arr(s4.q1).filter(Boolean).length ? q1 : miss),
      item("Q2 True / False:", arr(s4.q2).filter(Boolean).length ? q2 : miss),
      item("Language:", mapA ? "<b>" + mapA + "</b> " + tick(mapA === mapK, mapK) + ' — ' + esc(D.focus.map.opts[D.focus.map.key].replace(/^[A-D]\.\s*/, "")) : miss, false),
      item("Q3:", (q3.length ? "<b>" + esc(q3.join(", ")) + "</b> " + tick(q3.length === 3 && ["A", "B", "C"].every(k => q3.includes(k)), "A, B, C") : miss) +
        (txt(arr(s8.fD)[0]) ? ' · ' + esc(D.transfer.failD[0]) + " " + esc(txt(arr(s8.fD)[0])) + '.' : "") +
        (txt(arr(s8.fE)[0]) ? ' ' + esc(D.transfer.failE[0]) + " " + esc(txt(arr(s8.fE)[0])) + '.' : "")),
      item("Talk & Write Q2:", frame(["", D.inv2.tw2.frame[0], D.inv2.tw2.frame[1], D.inv2.tw2.frame[2]], s6.tw2, 4)),
      item("Talk & Write Q3:", frame(D.jar.frame, s3.ex, 3)),
      item("Talk & Write Q4:", q(s9.exit))
    ]);

    /* p.33 — data question 1 */
    const d1 = arr((s6.d1 || {}).pick).filter(Boolean).slice().sort(), roles = (s6.d1 || {}).role || {};
    const p33 = page("p.33", "", [
      item("Data question 1:", d1.length ? "<b>" + esc(d1.join(" + ")) + "</b> " + tick(E().MARK.dbq1(s6) === true, "B and D") +
        (roles.B || roles.D ? ' · B = ' + esc(roles.B || "–") + ", D = " + esc(roles.D || "–") + " " + tick(E().MARK.dbq1roles(s6), "B effect, D cause") : "") +
        (txt((s6.d1 || {}).why) ? " · " + q(s6.d1.why) : "") : miss)
    ]);

    /* p.34 — data question 2 and the Air Watch table */
    const d2 = (s6.d2 || {}).pick;
    const worst = s1.worst && s1.worst.code ? s1.worst : null;
    const p34 = page("p.34", "", [
      item("Data question 2:", d2 ? "<b>" + esc(d2) + "</b> " + tick(d2 === D.inv2.dbq2.key, D.inv2.dbq2.key) + (txt((s6.d2 || {}).why) ? " · " + q(s6.d2.why) : "") : miss),
      item("My Air Watch table" + (worst && worst.code === code ? ' <span class="sub">(our worst day: Day ' + esc(worst.day) + ')</span>' : "") + ":", weekTable(hw, code, worst))
    ]);

    /* E12 — pp.35–36 next lesson */
    const plan = s8.plan || {}, why = s8.why || {}, fb = (ctx.feedback || {})[p.pid];
    const planTxt = D.transfer.plan.filter(([k]) => txt(plan[k])).map(([k, l]) => '<div class="sub"><b>' + esc(l.split("?")[0].replace(/ would.*| do you.*/i, "").trim().toLowerCase().replace(/^./, c => c.toUpperCase())) + ':</b> ' + esc(txt(plan[k])) + (txt(why[k]) ? ' <b>because</b> ' + esc(txt(why[k])) : ' <span class="miss">(no reason)</span>') + '</div>').join("");
    const lv = fb && fb.level && D.transfer.ladder[fb.level - 1];
    const e12 = page("E12", "", [
      (() => { const mine = arr(s2.qs).filter(x => x && txt(x.t)).map(x => txt(x.t)), all = mine.length ? mine : txt(s2.q) ? [txt(s2.q)] : [];
        return item(all.length > 1 ? "Our questions:" : "Our question:", (all.length ? all.map(x => q(x)).join(" · ") : miss) + (txt(s9.sharp) ? ' · sharper: “' + esc(txt(s9.sharp)) + '”' : ""), false); })(),
      item("Our plan to fix our week:", planTxt || miss, false),
      fb ? item("Feedback" + (lv ? " (" + esc(lv.lv.split(" — ")[0]) + ")" : "") + ":", "strength " + q(fb.strength) + " · question " + q(fb.question) + (txt(s9.change) ? ' · we will change: “' + esc(txt(s9.change)) + '”' : ""), false) : "",
      item("In E12 I will…", q(s9.e12), false)
    ]);

    /* goals and the big question */
    const had = { both: "both ✓", one: "one", none: "not yet" }[arr(s9.recBy)[i]];
    const rate = arr(s9.rate), lvW = { no: "NOT YET", almost: "ALMOST", yes: "YES" };
    const vote = k => ({ yes: "Yes", some: "Sometimes", no: "No" }[k] || "–");
    const goals = '<div class="goals"><b>Can you tell by looking?</b> start: ' + vote(s1.pre) + " → end: " + vote(s9.post) +
      ' · <b>Goals from memory</b> (my book): ' + (had || "–") +
      (rate.some(r => r && r.lv) ? ' · <b>Self-rating</b> ' + D.goals.map((g, j) => esc(g.short) + " " + ((rate[j] && lvW[rate[j].lv]) || "–")).join(", ") : "") + '</div>';

    return '<div class="hd"><span>Air Watch · Grade 6 · Lesson 6 (E11) · 30 Sept 2026</span><span class="stn">Station ' + esc(p.st) + '</span></div>' +
      '<div class="nm">' + esc(nm) + (cls ? ' <small>' + esc(cls) + '</small>' : '') + (others.length ? ' <small>with ' + esc(others.join(" & ")) + '</small>' : ' <small>worked alone</small>') + '</div>' +
      '<div class="how">Glue this into your notebook. Copy each ☐ answer into your book, then tick it. ✗ → the right answer.</div>' +
      p30 + p31a + p31 + p32 + p33 + p34 + e12 + goals;
  }

  const CSS = '@page{size:A4 landscape;margin:0}' +
    'html,body{margin:0;background:#d9dde0}' +
    'body{font-family:"Segoe UI","Be Vietnam Pro",Arial,"Helvetica Neue",sans-serif;color:#141c20;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.bar{position:sticky;top:0;z-index:5;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;background:#0B3954;color:#fff;padding:10px 16px;font-size:14px}' +
    '.bar button{font:inherit;font-weight:700;border:0;border-radius:10px;padding:9px 16px;background:#2E9E6B;color:#fff;cursor:pointer}' +
    '.sheet{position:relative;width:297mm;height:210mm;margin:12px auto;background:#fff;display:flex;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.2);break-after:page;page-break-after:always}' +
    '.sheet:last-child{break-after:auto;page-break-after:auto}' +
    '.cut{position:absolute;left:148.5mm;top:0;bottom:0;border-left:.3mm dashed #8a9499}' +
    '.cut:before{content:"✂";position:absolute;top:3mm;left:-2.4mm;font-size:11pt;color:#6b777d;background:#fff}' +
    '.half{width:148.5mm;height:210mm;box-sizing:border-box;padding:6mm 7mm 5mm;overflow:hidden;font-size:9pt;line-height:1.28}' +
    '.hd{display:flex;justify-content:space-between;align-items:center;font-size:.86em;color:#4a5a62;border-bottom:.3mm solid #0B3954;padding-bottom:1mm}' +
    '.hd .stn{font-weight:800;color:#0B3954}' +
    '.nm{font-size:1.75em;font-weight:800;color:#0B3954;margin:1.6mm 0 .6mm;line-height:1.1}' +
    '.nm small{font-size:.5em;font-weight:600;color:#4a5a62;margin-left:1.5mm}' +
    '.how{font-size:.86em;color:#4a5a62;margin-bottom:1.6mm}' +
    '.pg{display:flex;gap:1.8mm;border-top:.2mm solid #cfd8dc;padding:.9mm 0}' +
    '.pn{flex:none;box-sizing:border-box;min-width:10.5mm;white-space:nowrap;font-weight:800;color:#fff;background:#C8871B;border-radius:1mm;text-align:center;align-self:flex-start;padding:.4mm 1mm;font-size:.9em}' +
    '.pg.nb .pn{background:#1C7293}' +
    '.its{flex:1;min-width:0}' +
    '.pt{font-weight:700;color:#4a5a62;font-size:.86em;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.4mm}' +
    '.it{display:flex;gap:1.2mm;margin:.35mm 0}' +
    '.bx{flex:none;font-size:1.05em;line-height:1.15;color:#0B3954}.bx0{flex:none;width:.9em}' +
    '.it b{color:#0B3954}.it i{color:#4a5a62}' +
    '.ans{margin:.3mm 0 0}.sub{margin:.3mm 0 0;color:#26343b}' +
    '.y{color:#1e7d4f !important}.n{color:#c2412d !important}.key{color:#1e7d4f;font-weight:700}' +
    '.miss{color:#9aa6ab;font-style:italic}' +
    '.wk{border-collapse:collapse;margin:.6mm 0 0;font-size:.95em}' +
    '.wk th,.wk td{border:.2mm solid #9fb0b7;padding:.4mm 1.6mm;text-align:center;min-width:6mm}' +
    '.wk th{background:#eef3f5;font-weight:700}.wk th.w{background:#fbe2dd}' +
    '.wk td small{display:block;font-size:.72em;color:#6b777d}.wk td.none{color:#9aa6ab}' +
    '.goals{border-top:.3mm solid #0B3954;margin-top:1mm;padding-top:1.2mm;font-size:.92em}' +
    '.goals b{color:#0B3954}' +
    '@media print{html,body{background:#fff}.bar{display:none}.sheet{margin:0;box-shadow:none}}';

  /* after the fonts load, shrink any half that does not fit its page */
  const FIT = 'function fit(){document.querySelectorAll(".half").forEach(function(h){var fs=9;h.style.fontSize=fs+"pt";while(h.scrollHeight>h.clientHeight+1&&fs>5.6){fs-=.2;h.style.fontSize=fs.toFixed(1)+"pt";}});}' +
    '(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(fit);window.addEventListener("load",fit);window.addEventListener("beforeprint",fit);';

  function build(ctx) {
    const L = E().pairs(ctx.pairs || {});
    const people = [];
    L.forEach(p => p.names.forEach((nm, i) => people.push({ p, i })));
    const halves = people.map(x => half(x.p, x.i, ctx));
    let sheets = "";
    for (let k = 0; k < halves.length; k += 2) sheets += '<section class="sheet"><div class="half">' + halves[k] + '</div><div class="cut"></div><div class="half">' + (halves[k + 1] || "") + '</div></section>';
    const title = "Air Watch E11 — class pack " + (C.lessonDay || "");
    return { count: people.length, html: '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<style>' + CSS + '</style></head><body>' +
      '<div class="bar"><b>' + people.length + ' students · ' + Math.ceil(people.length / 2) + ' A4 sheets (landscape) · cut along the dashed line</b><button onclick="print()">Print / Save as PDF</button>' +
      '<span>In the print window choose <b>Save as PDF</b> for a file, or your printer. Paper A4, landscape, margins none.</span></div>' +
      (people.length ? sheets : '<p style="text-align:center;font-size:18px;margin:40px">No groups have joined this lesson yet.</p>') +
      '<script>' + FIT + '</script></body></html>' };
  }

  window.AWPACK = {
    build,
    open(ctx) {
      const b = build(ctx);
      const w = window.open("", "aw_pack");
      if (!w) return false;
      w.document.open(); w.document.write(b.html); w.document.close();
      return true;
    }
  };
})();
