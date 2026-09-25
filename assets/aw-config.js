/* ─────────────────────────────────────────────────────────────
   Air Watch — settings for the Grade 6 Lesson 6 homework log
   and (later) the E11 lesson app. Edit values here only.
   ───────────────────────────────────────────────────────────── */
window.AW = {
  build: "2026-09-24",

  /* Firebase rooms (same g6-science project as the Materials Bench) */
  room: "G6HW6",          // the 7-day homework log
  lessonRoom: "G6W6",     // the 30 Sept lesson (student, teacher, projector, observer pages)

  /* Pair laptops in the lesson (station cards 1–11; the 12th laptop is the observers') */
  stations: 11,

  /* Teacher pages ask for this PIN. Change it to any 4–6 digits. */
  teacherPin: "2307",

  /* World Air Quality Index Project token (aqicn.org/data-platform/token).
     Like the Firebase keys, it is visible in the page code — that is normal. */
  waqiToken: "763787b219d2f4edbd995e291af3732587556cb3",

  /* The week. Day 1 is the day the homework was set. */
  day1: "2026-09-23",
  days: 7,
  lessonDay: "2026-09-30",
  lessonLabel: "Wednesday 30 September, period 3",
  bookPage: "34",

  /* Hanoi box for finding stations: south, west, north, east */
  bounds: [20.85, 105.65, 21.20, 106.05],
  hanoiMap: "https://aqicn.org/map/hanoi/",

  /* Time slots students choose from on Day 1 */
  slots: [
    { k: "am",  en: "Morning, 6:30–7:30",      vn: "Buổi sáng, 6:30–7:30" },
    { k: "pm",  en: "After school, 16:30–17:30", vn: "Sau giờ học, 16:30–17:30" },
    { k: "eve", en: "Evening, 19:00–20:00",     vn: "Buổi tối, 19:00–20:00" }
  ]
};

/* AQI bands (US EPA scale used by aqicn.org; book p.31 colour table) */
window.AW_CATS = [
  { k: "good", max: 50,   en: "Good",               vn: "Tốt",        col: "#00A35A", ink: "#FFFFFF" },
  { k: "mod",  max: 100,  en: "Moderate",           vn: "Trung bình", col: "#F5D400", ink: "#3B3000" },
  { k: "usg",  max: 150,  en: "Unhealthy for some", vn: "Kém",        col: "#F7922E", ink: "#3B1D00" },
  { k: "unh",  max: 200,  en: "Unhealthy",          vn: "Xấu",        col: "#D7263D", ink: "#FFFFFF" },
  { k: "vun",  max: 300,  en: "Very unhealthy",     vn: "Rất xấu",    col: "#7B2FA0", ink: "#FFFFFF" },
  { k: "haz",  max: 99999,en: "Hazardous",          vn: "Nguy hại",   col: "#7E0023", ink: "#FFFFFF" }
];
window.AW_CAT = function (aqi) {
  if (aqi === null || aqi === undefined || aqi === "" || !isFinite(+aqi)) return null;
  const v = +aqi;
  for (const c of window.AW_CATS) if (v <= c.max) return c;
  return window.AW_CATS[window.AW_CATS.length - 1];
};
window.AW_PARTS = [
  { k: "pm25", en: "PM2.5" }, { k: "pm10", en: "PM10" }, { k: "o3", en: "O₃ (ozone)" },
  { k: "no2", en: "NO₂" }, { k: "so2", en: "SO₂" }, { k: "co", en: "CO" }
];
