// Air Watch — scheduled station readings (runs on GitHub Actions, see .github/workflows/air-watch-readings.yml).
//
// Each run:
//   1. lists every station a student chose, plus the class station;
//   2. if it is inside a time window (morning, after school, evening), saves each station's reading once;
//   3. copies the readings students typed on time, so classmates at the same station can compare;
//   4. fills times nobody measured with a computer-model estimate (Open-Meteo, CAMS), marked "estimate".
// It uses only the files already in this repository: assets/aw-config.js, assets/firebase-config.js, assets/aw-stations.js.
//
//   node tools/air-watch-readings.mjs          collect (if in a window) + copy + estimates
//   node tools/air-watch-readings.mjs fill     copy + estimates only
//
// Test overrides: DB_URL, WAQI_BASE, OM_BASE, NOW (milliseconds).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const S = require(path.join(root, "assets", "aw-stations.js"));

function loadWindow(file) {
  const ctx = { window: {} };
  vm.runInNewContext(readFileSync(path.join(root, file), "utf8"), ctx);
  return ctx.window;
}
const AW = loadWindow("assets/aw-config.js").AW;
const FB = loadWindow("assets/firebase-config.js").FIREBASE_CONFIG || {};

const DB_URL = String(process.env.DB_URL || FB.databaseURL || "").replace(/\/$/, "");
const ROOM = process.env.ROOM || AW.room || "G6HW6";
const NOW = process.env.NOW ? Number(process.env.NOW) : Date.now();
const MODE = (process.argv[2] || "all").toLowerCase();
if (!DB_URL) { console.error("No databaseURL in assets/firebase-config.js"); process.exit(1); }

const base = `${DB_URL}/rooms/${ROOM}/`;
async function answer(r) {
  const body = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${body.slice(0, 200)}`);
  return body ? JSON.parse(body) : null;
}
const db = {
  get: p => fetch(base + p + ".json").then(answer),
  set: (p, v) => fetch(base + p + ".json", { method: "PUT", body: JSON.stringify(v) }).then(answer),
  update: (p, v) => fetch(base + p + ".json", { method: "PATCH", body: JSON.stringify(v) }).then(answer)
};

const days = S.dates(AW.day1, AW.days);
const h = S.hanoi(NOW);
const last = days[days.length - 1];
const after = S.dates(last, 2)[1]; // the day after the week: one last run fills the final evening
console.log(`Air Watch readings · Hanoi ${h.date} ${String(Math.floor(h.min / 60)).padStart(2, "0")}:${String(h.min % 60).padStart(2, "0")} · room ${ROOM} · mode ${MODE}`);
if (h.date < days[0] || h.date > after) { console.log(`Outside the homework week (${days[0]} to ${last}) — nothing to do.`); process.exit(0); }

try {
  const students = (await db.get("students")) || {};
  const cfg = (await db.get("config")) || {};
  const n = await S.syncMeta({ db, students, cfg });
  console.log(`Stations: ${n} (students: ${Object.keys(students).length})`);
  const changed = await S.syncRoster({ db, students, now: NOW });
  if (changed) console.log(`Roster: ${changed} names updated (for "Find my Air Watch").`);
  if (MODE !== "fill") {
    const r = await S.collect({ db, fetch, token: AW.waqiToken, now: NOW, after: 60, src: "gh", day1: AW.day1, days: AW.days, waqiBase: process.env.WAQI_BASE });
    console.log(r.slot ? `Window ${r.slot}: saved ${r.saved}, already there ${r.had}, not updating ${r.stale}, failed ${r.failed}.` : "Not inside a time window — no readings saved now.");
  }
  const copied = await S.copyClassmates({ db, students });
  console.log(`Students' readings shared: ${copied}.`);
  const e = await S.estimate({ db, fetch, now: NOW, day1: AW.day1, days: AW.days, omBase: process.env.OM_BASE });
  console.log(`Estimates: ${e.cells} times at ${e.stations} stations${e.failed ? `, ${e.failed} stations failed` : ""}.`);
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
}
