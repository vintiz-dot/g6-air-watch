# Air Watch — Grade 6, Lesson 6 (Air Pollution & AQI)

Two parts, one folder:

- the **7-day air-quality homework** (23–29 September), and
- the **lesson app** for the observed lesson on **Wednesday 30 September, period 3 (9:40–10:25)**:
  pair laptops, your laptop, the projector and the observers’ laptop, all live. See **section 6**.

| Page | Who | What it does |
|---|---|---|
| `homework.html` | students | The daily log: look and guess first, then check the station, then note what was happening. About 3 minutes a day. Plus **My question** for the lesson, and **Find my Air Watch** on a new device. |
| `homework-teacher.html` | you (PIN) | Every student's week, live. Choose the class station, star sky photos, see every station at all three times of day, read the students' questions, join a student's two logs, download CSVs. |
| `check.html` | you | Tests the database (homework and lesson rooms), the air-quality data and the class station. Every red row says what to fix. |
| `index.html` | pair laptops 1–11 | **The lesson.** Join with station + names, then the 9 screens, following your screen changes. |
| `teacher.html` | your laptop (PIN) | Runs the lesson: screens and timers, reveals, spotlight, private nudges, student ideas, rule vote, the three goal scores, live targets. |
| `projector.html` | the projector | Class results only: timer, the three goal scores, votes, charts, Wonder Wall, spotlight. Opened from `teacher.html`. |
| `observer.html` | observers’ laptop | Read-only: every pair’s live work, the three goals measured as the lesson goes, planned vs actual time, and the evidence for each framework component. |
| `cam.html` | your phone | **Live camera** for the jar test, opened from the QR code on `teacher.html`. **Live video (VDO.Ninja)** sends smooth video to the projector, the laptops and the observers; the backup, **Pictures + record on this phone**, sends about 4 pictures a second and records on the phone. |
| `rec.html` | your laptop | **Records the live video** on your laptop (opened by **● Record on this laptop**); the file goes to Downloads. |

Teacher PIN: the `teacherPin` in `assets/aw-config.js`.

---

## 1 · Put it online (10 minutes, same as the Materials Bench)

1. On GitHub make a new repository, e.g. `g6-air-watch`.
2. Upload **everything in this folder**, keeping the `assets/` folder as it is.
   `assets/firebase-config.js` is already copied from the Materials Bench, so the live data goes to the
   same **g6-science** Firebase project (in a new room, `G6HW6`).
3. **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save.**
4. After about a minute:

```
https://vintiz-dot.github.io/g6-air-watch/homework.html          ← send to students
https://vintiz-dot.github.io/g6-air-watch/homework-teacher.html  ← yours (PIN)
https://vintiz-dot.github.io/g6-air-watch/check.html             ← run this first
```

If the repository has another name, the links change the same way.

**Database rules.** These pages write under `rooms/`, exactly like the Materials Bench. If you already
pasted the rules from the Materials Bench README, there is nothing to do. `check.html` tells you if
writing fails.

---

## 2 · Tonight, before you send the link

1. Open `check.html`. The rows should be green (the class station row stays amber until step 2).
2. Open `homework-teacher.html` → PIN → **Load live Hanoi stations** → press **check** on two or three
   stations → **Use** the one that updates every hour and shows the most of the six parts.
   Every student will also record this *class station*, so on the 30th the class can compare
   **time** (one place, different times) with **place** (different stations, similar times).
3. Send the student message in `SEND_TO_STUDENTS.txt` with your link.

---

## 3 · What students do every day (about 3 minutes)

Day 1 only: name, class, where they live, **one time** (morning / after school / evening) and **one
station** near home (from the live list, or typed from the aqicn.org map). They keep both all week —
that is the fair-test part.

Then every day, in this order:

1. **Look first.** How does the sky look? Guess the air (Good → Very unhealthy). The guess is locked
   before they see any number.
2. **Check their station** on aqicn.org: AQI, PM2.5, which part is biggest, the “Updated” time.
   On **Day 7** they write **all six parts** — the data for “what is the AQI made of?” in the lesson.
3. **Check the class station**: AQI and PM2.5.
4. **What was happening**: rain, wind, traffic, construction, smoke, incense/cooking, weekend…
5. **Photo of the sky** — sky only, no people. **From 28 September a day saves only with a photo**:
   it counts as much as the numbers (the lesson compares what the sky looked like with what the
   station measured). On a phone the page opens the camera. On a computer it shows a **QR code**: the
   student points a phone camera at it, takes the photo, taps *Send to my computer*, and the photo
   appears on the computer by itself (the phone keeps nothing). No phone? *Use this computer's camera*,
   or choose a photo already on the computer. Details in **4d**.

The page tells them straight away whether their eyes were right, and reminds them to write the PM2.5
number in the book table (page 34). After Day 7 they look back: how many guesses were right, their
worst day and why — then **Hand in**.

Missed a day? They can catch up; it is saved as **entered late**, with the real time it was typed. If
they did not check that day, they tap *I did not check that day — copy the station's record* instead.

**The first time** (a student with no saved day yet) the page first shows *How to find your numbers*
(the six daily steps and the picture of a station page), then makes them **catch up** before today:
details in **4d**.

**The numbers are checked.** When a student types the AQI, the PM2.5 or the class station's AQI, the page
compares it with that station (within 10 points). A number that does not match is not saved: the page
shows how to find the right one (the right station, the big number, the PM2.5 row, with a picture) but
never the number itself. If their station has stopped working, the page says so and offers the nearest
working stations. Details in **4c**.

**My question.** Under the day, every student writes ONE question for the lesson (with the four
starters) and can improve it any day. On screen 2 each pair sees both partners' questions and picks one.

**New phone, or the page forgot them?** On the first screen they choose **Find my Air Watch**, type
their name and class, and tap their own log (it shows their station and days saved). One log can be
used on several devices (a phone and a laptop): each page takes in the days saved on the others before
it saves, so a device with an older copy never removes a day, and a sky photo shows on every device. They can also use
**their own link** (tap *My code* at the top → *Copy my link*) or the 6-letter code. Setting up again
with the same name and class asks *“Is it yours?”* first, so a student does not end up with two logs.
If it happens anyway, your page shows **The same student twice?** → **Join** (the other device follows
by itself).

---

## 4 · What you see

- Who has joined, how many logged each day, who has handed in.
- The class total: **how many guesses by looking were right** — the number that opens the lesson.
- Every student's week in one table; tap a row for everything, including photos.
- **Star** the sky photos you want to use in the lesson's opening (clear-looking sky, high AQI…). A
  student's photos also show under their week when you open it.
- **Download all answers (CSV)** — one row per student per day, opens in Excel (now with each question).
- **Station readings** — every chosen station at 6:30–7:30, 16:30–17:30 and 19:00–20:00, day by day:
  a filled square is a real reading, a dashed one an estimate. Download them as a CSV too.
- **Questions for the lesson** — every student's question, by class.
- **Numbers to check** — saved days with a number that does not match the station (⚠ in the table),
  each with a **Send back** button. Every day in a student's full week has **Send back** too.

---

## 4b · Every station at all three times

Each student checks once a day, at their own time. So that everyone can compare morning, after school
and evening at their own station, the readings are filled in for them — **only the station numbers,
never a guess, a note or a photo**:

1. **In each time window, any open homework page** (a student's or yours) saves every chosen station
   once. Leave `homework-teacher.html` open on a computer to be safe.
2. **The GitHub job** does the same at about 6:50, 16:50 and 19:20 even if no page is open:
   `.github/workflows/air-watch-readings.yml` (GitHub only runs workflow files from that folder) starts
   `tools/air-watch-readings.mjs`. To test it: GitHub → **Actions** → *Air Watch station readings* →
   **Run workflow**. The teacher page then shows *GitHub job: last reading …* (readings are only saved
   inside the three time windows).
3. **Readings students typed on time** are shared, so classmates at the same station see them.
4. **Times nobody measured** (mostly 23–25 September, before this started) get an **estimate** from a
   computer model — Open-Meteo (CAMS model, CC BY 4.0) — always marked **≈ estimate**. Estimates can be
   quite different from a station, which is itself a good question for E12.

Students see all three times under each saved day (only after saving, so they cannot copy them). In the lesson
they appear on screen 1 (days a student missed, marked *station* or *estimate*), screen 5 (the time and
place charts) and screen 6 (the table for Talk & Write Q2).

---

## 4c · Checking the numbers

Settings are in `assets/aw-config.js` → `check` (margin 10 points, 3 tries, 30 seconds, and so on).

- **Today:** the page reads the station live (the same data as aqicn.org) as soon as the student locks
  the guess, and checks each number when they leave the box and again on **Save**. It also accepts the
  station's readings from the time they looked, the time window, or the “Updated” time they typed, so a
  station that updates while they type is fine.
- **A past day (entered late):** compared with the station's saved readings for that day and window.
  For times with no saved reading (mostly 23–25 September), it uses the model estimate with a wide
  margin, so only numbers far off (like 4 on a day around 100) are rejected. The page tells students
  to leave a past day empty if they did not write the numbers down that day.
- **Three wrong numbers in a row** → a 30-second wait before the next check (no guessing games).
- **Nothing to compare with** (no internet, the station and the model both unavailable) → the day saves,
  marked *not checked*; your page checks it again later.
- **A station that is not working** — its page shows no AQI (“–”), or its AQI is below a third of the
  Hanoi median (in September 2026: *Hanoi, Vietnam*, *Hanoi US Embassy* and the two *Hà Nội/…* stations
  showed “–”) — is not offered when setting up. A student already on one is asked to choose one of the
  nearest working stations; their saved days stay, and your page shows the change.
- **Your page** flags every saved day that does not match (also older days saved before the checker)
  and lets you **Send back** a day: it reopens on the student's page with their guess and notes kept,
  and they type the numbers again (or leave a past day empty).
- **Shared data:** numbers that do not match are never shared with classmates, and the lesson leaves
  them out (screen 1 shows the station's number for that day instead).

---

## 4d · Joining late, and the sky photo

- **Walkthrough.** A student with no saved day sees *How to find your numbers* first: look and guess,
  open the station (check its name), the AQI, the PM2.5 row, the “Updated” time, and the photo (with
  the QR code for computers). *I know where to look — start* closes it. Anyone can open it again with
  **How to find the numbers** under their name.
- **Forced catch-up.** If days have already passed, today stays locked until every missed day is done.
  For each missed day the page shows what **their station recorded at their time** — the saved window
  reading, else the reading saved nearest to it, else a classmate's checked reading, else the model
  **estimate** (marked ≈, with “write ≈ in your book”). They type the AQI and PM2.5 **exactly** as shown
  (a different number is refused) and write them in the book, page 34. These days are saved as
  **catch-up**: no guess, no photo, not counted in “Can you tell by looking?”. A day with no record
  at all can be skipped (it stays empty). *I did check on this day* opens the normal form instead.
- **Your page** marks catch-up days with **c** in the table, *catch-up · no guess* and *copied the
  station record / the estimate* in the student's week, and a `catch_up` column in the CSV. The guess
  totals (yours and the lesson's) count only days with a guess.
- **The photo.** `photoFrom` in `assets/aw-config.js` (28 September) is the first day that needs one.
  A photo is sent as soon as it is taken, so it is kept even if the day is saved later or on another
  device. The phone page (`homework.html?code=ABC123&photo=6`, what the QR code opens) only takes and
  sends that one photo; a student who cannot scan can type the address shown under the code. A saved
  day without its photo (saved on an old copy of the page) shows **Add your sky photo**.

---

## 5 · Privacy

Stored: first name, class, the area they typed, their readings, their question and their sky photos (sky only).
No other personal data. To let students find their log again, a short list of names, classes, station
names and days saved (`roster`) can be read by the homework page. Station readings hold no names. Photos must show the sky only. After E12, download the CSV, then use
**Clear the whole homework room** at the bottom of the teacher page (it asks three times) — it also
clears the roster and the station readings.

The lesson room (`G6W6`) stores station numbers, first names and the pairs’ answers. The projector
shows names only on a spotlight you choose; the observers’ page shows names (staff only). The
projector and observer pages have no PIN because they cannot change anything — do not give those
two links to students. **Start a new session** on `teacher.html` clears the lesson room.

---

## 6 · The lesson on 30 September

### The four screens

| Where | Page | What it shows |
|---|---|---|
| Laptops 1–11 (one per pair) | `index.html` | Choose the station number on the desk card, then the names (from the homework list). Groups of 1 or 3 work too (“No partner today”, “We are three today”). Pilot and Navigator swap at every screen. |
| Your laptop screen | `teacher.html` | Three columns: run sheet and controls · every pair live · goals, student voice, targets and log. On a small screen the page scrolls as one column. |
| Projector (extended display) | `projector.html` | Timer, the three goal scores (top bar), class results, charts, photo game, Wonder Wall, spotlight. |
| Laptop 12, back of the room | `observer.html` | Every pair’s work, the three goals measured check by check, the lesson map (planned vs actual minutes), the evidence for each framework component counted live, checks for understanding, an optional talk-time tally. |

### The day before (15 minutes)

1. Commit and push the new files to the same GitHub repository (or **Add file → Upload files**, drag
   everything in this folder, **Commit**). `assets/firebase-config.js` stays as it is.
2. Open `check.html` on the **school Wi-Fi**. All rows should be green except “No lesson session yet”.
3. Rehearse once: `teacher.html` → PIN → **Start a new session**. Open `index.html` in two or three
   browser tabs (or on other devices) — each tab is its own station, so you can join stations 1, 2 and 3
   and send three rules on screen 7. Press **Bell** and click through the screens. **Start a new
   session** again afterwards — it clears the rehearsal.

### Before the bell (from 9:30)

1. Laptops 1–11: open `index.html` (or double-click `air-watch-kiosk.bat`, see *Keeping students in the
   lesson*) and leave them on the join screen. Station cards on the desks.
2. Laptop 12: open `observer.html` for the observers.
3. Your laptop: connect the projector and press **Windows + P → Extend**. Open `teacher.html` → PIN →
   **Start a new session**.
4. Press **Projector ↗**, drag the window onto the projector, then press **Full screen on the
   projector** (Chrome and Edge can send it to the projector by themselves; allow the permission if asked).
   **Live camera:** open **Live camera (your phone)** in *Show on the projector*, scan the QR code with
   your iPhone → **Live video (VDO.Ninja)** (see *Live camera* below), stand the phone at the jar, and
   check that your preview shows the video. Then **● Record on this laptop** → **Start recording** → **Allow**.
5. In **Before the bell**: type the meter’s room reading and choose up to six sky photos, A–F (★ starred ones come first).
6. At 9:40 press **▶ Bell**. The 45 minutes and the screen-1 timer start.

### During the lesson

- **Show on the projector** (top of the left column while the lesson runs) lists everything this screen
  puts on the board, in the order of the run sheet: reveals, the Wonder Wall, the rule vote and
  spotlights. The highlighted row is next — press **Tab** or click it. Green = ready; amber ★ = a pair’s
  answer is ready for a spotlight (their card turns amber too, and a message pops up once); dashed =
  waiting for the class; ✓ = on the board (click it to hide it again). Under each screen number in
  **Screens**: ▶ reveal · W Wonder Wall · ★ spotlight. The top bar always says what Tab or Page Down does now.
- **Presentation remote:** **Page Down** next screen · **Page Up** back · **Tab** the highlighted row ·
  **B** (or **.**, the remote’s black-screen button) blanks the projector — the next key brings the
  picture back. Before the bell, Page Down twice rings the bell; on screen 9, Page Down twice ends the
  lesson. The keys work whether your page or the projector window is in front (open the projector with
  **Projector ↗** so they can reach your page); short replies (“Press again…”, “Waiting for…”) show at
  the bottom of the projector as well. **F5** is ignored on the projector so it stays full screen.
- **Next →** and **← Back** do the same as Page Down and Page Up. The run sheet has your script for that
  screen and a planned cut (**If you are behind**).
- The badge at the top says when the lesson will finish if you keep every remaining timer. It turns red
  and says how much to cut if you are heading past 45:00.
- **Reveal** rows show answers on the laptops and the projector. **★ Spotlight** on a pair’s card puts
  their sentence on the projector (they see “Your work is on the board!”); **✕ End spotlight** in the top bar,
  **Esc**, or a click on the projector takes it off. **Nudge** sends a private message to one laptop.
  **✓ Helped** clears a help request.
- **Goals** (right column): the class score for the Science, Language and Thinking goals, from the
  screens already finished, plus the screen you are on. Open **Every check** to see what is counted.
  Green is 80% or more. The projector’s top bar shows the same three scores.
- **Every screen:** the bar at the top of each laptop (and the projector's bottom bar) shows the rule
  *Talk first — then type*: the Navigator says it, the Pilot types what the Navigator said.
- **Finished early?** When a pair presses *We're done*, the laptop sends them to their book first — the
  exact page and question for that screen (p.30–34), with *We wrote it in our books* — then the challenge card.
  **Spotlight a challenge answer:** **★ Challenge** on the pair’s card, or click a teal **★ Challenge —
  station N** row in *Show on the projector* (Tab never picks these, so your planned steps stay the same).
  The projector shows the challenge question above their answer.
- Screen 2: the photo game shows up to six photos (A–F); each pair votes for the worst sky. Each pair sees
  the questions both partners wrote at home and can post **up to three** questions (the box clears after
  each one, and they see their list with *3 of 3 posted*). Until you put a question on the wall they can
  **Take back** one to fix it. Under it, the laptops invite them to press **Suggest a change** if a task
  could work better for them.
- **The Wonder Wall** on the projector shows every question in full: the text shrinks to fit its box;
  when there are too many for a readable size it shows them a page at a time and turns the page every
  8 seconds (*36 questions · page 1 of 4*). Right after you put questions on the wall (screens 2, 7 and 9),
  **Tab** → *Show the whole Wonder Wall (full screen)*: every question, big. The next **Tab** (a
  spotlight), **Esc**, or a click on the projector closes it. The laptops list every question too.
- Screen 3: **Tab** → the class predictions; **Tab** → *Show the live camera on every screen* (if the
  phone is live). Type the meter numbers in the **Show on the projector** box — they appear on the board and
  on the camera view as you type. After “60 seconds later”, **Tab** → *Show how small PM2.5 is*: the EPA
  hair-and-sand picture appears on the laptops and the projector, and the camera view closes.
- Screen 6: a short bridge before the graphs (laptops and projector): CO₂ is not in the AQI; at these
  levels it warms the planet rather than hurting lungs — a different problem, the same skill of reading
  a trend. The laptops show the pair’s whole week (and the class station); tapping a number fills
  “___ tells us that the AQI was ___ on ___”.
- Screen 7: **Tab** spotlights up to three rules (the best ones first), then puts them to the vote (filled
  up to three), then closes it — the winner is the class rule. Or tick rules in the run sheet → **Put the
  ticked rules to the vote** → **Close the vote**. The Wonder Wall is back (laptops and projector):
  *Which question can we answer now? Which is still open?* Pairs tap the one they can answer now.
- Screen 8: every part of the plan (where, when, how often, compared with what) ends in **because…**.
  The four-step ladder (DOK 1 Recall → DOK 4 Design, level 3 is the target) is on the projector and
  on each laptop. In the peer check a part can be ticked only if it has a reason, and the reviewers
  place the plan on the ladder.
- Screen 9: each student first writes both goals **alone, in their own book**, from memory (the laptop
  asks them to confirm it). Then the pair types its best version, presses **Check our answers**, and
  marks each goal got it / partly / missed it. After “Hands up if you had both”, **each student** marks
  what they had in their own book — the run sheet and the observers' 3A.1 row count it in students.
  They self-rate the three goals and finish **In E12 I will…** → **Tab** → *Show the goals and
  self-ratings*. Back to the Wonder Wall: each pair posts one **sharper question** for E12 (it arrives in
  *Wonder questions* on your page, marked *sharper*); **Tab** puts them on the projector’s Wonder Wall,
  and the next **Tab** spotlights one.
- **After the bell — the print pack:** on your page, **Print pack — every student’s work (A5)** (in the
  session card). A new window shows one A5 half-page per student, two per A4 sheet (landscape), with a
  dashed cut line. Each student gets their group's answers under their own name, grouped by book page
  (p.30 → p.34, then E12): Q1, Q2, the language item, Q3 and both data questions show their answer, ✓
  or ✗ and the right answer; the sentences and the plan are printed as they wrote them; p.34 has their
  own Air Watch week for the table. A ☐ marks every answer that goes in the book. Press **Print / Save
  as PDF** → choose *Save as PDF* for a file, or print (A4, landscape, no margins). Long answers are
  set a little smaller so each student fits one half-page.
- Keys: **Page Down** next · **Page Up** back · **Tab** show the next thing · **B** blank the projector ·
  **P** pause/resume · **+** one more minute · **Esc** end the spotlight (or close the full Wonder Wall). (**B** no longer means back.)

### Live camera (the jar test from your phone)

- **What the class sees:** smooth live video from your iPhone on the projector, every laptop and the
  observers’ page, through **VDO.Ninja** (free, no account, nothing to install). The phone sends one
  stream to VDO.Ninja’s free relay (Meshcast) and every screen plays it in the camera box, with the meter
  numbers on top — about half a second behind.
- **Set up (before the bell):** on your page, *Show on the projector* → **Live camera (your phone)** →
  scan the QR code with the iPhone’s camera (it opens in Safari) → **▶ Live video (VDO.Ninja)** → allow
  the camera. Stand the phone sideways where it sees the jar **and** the meter’s number, plugged in if you
  can. Set **Settings → Display & Brightness → Auto-Lock → Never** for the lesson: a locked phone or
  another app stops the video. Your preview in the camera box shows the video — only you see it for now.
- **Record it on your laptop:** **● Record on this laptop** (camera box) opens a window with the live
  video → **● Start recording** → the browser asks to share this tab → **Allow** (Chrome or Edge). Leave
  that window open — other windows can go on top of it. Your page shows **● Recording 1:23**; press
  **■ Stop and save the recording** there (or in the window). The video goes to your **Downloads** folder
  (`jar-test-2026-09-30-0952.mp4`, or `.webm`).
- **Show it:** on screen 3, **Tab** → *Show the live camera on every screen* (or **Show on every
  screen**). Students can tap it to make it bigger.
- **Hide it:** the size picture (Tab), **Hide from the screens**, or moving to another screen. Hidden, the
  screens use no data.
- **If the live video does not show** (for example the school Wi-Fi blocks VDO.Ninja): on the phone press
  Safari’s **Back** button → **Pictures + record on this phone** → **Turn on the camera** → **● Start:
  live + record**. Every screen switches to pictures by itself (about 4 a second, about 1 second behind)
  and the phone records the video: **■ Stop** → **Save the video** (iPhone: *Save Video* puts it in
  Photos). With pictures, a laptop on the phone’s hotspot also gets direct video (**direct video ✓**).
- **Try it before the day** (5 minutes): start a session, scan the QR code, choose Live video, and check
  your preview; then open `index.html` on one more device and show the camera. At school before 9:30, do
  the same on one student laptop — that tells you whether the school Wi-Fi lets VDO.Ninja through.
- **Data:** while shown, each screen downloads the video (about 2–3 Mbps; about 30–40 Mbps for the whole
  class); the phone sends one stream over its Wi-Fi or mobile data. VDO.Ninja’s free relay has
  “fair use” limits and no guarantee — the pictures are the backup. The video passes through VDO.Ninja’s
  servers and is not kept there; the stream name comes from this class’s secret camera key. Film the jar,
  not the students.
- The link stays the same when you start a new session. If the phone ever says the link is old, scan the
  QR code again.

### Keeping students in the lesson

- From the bell to the end, every laptop: asks **“Leave site?”** before the lesson tab closes or reloads
  (students can still press Leave — no web page can stop a browser closing); goes **full screen** at the
  first tap or key (Esc gets out, the next tap goes back in, and a banner says so); and tells your page
  where it is.
- **Who left:** the pair’s card turns red — *✕ not connected* (tab closed, laptop asleep or Wi-Fi lost),
  *✕ tab closed*, *↗ other tab or app*, *↗ other window* or *⛶ left full screen* — with how long ago.
  The Pairs header says **away N (st …)**, and a red message pops up once when a station has been away for
  5 seconds. The projector never shows it.
- **Unlock** (session card) switches the full screen and the “Leave site?” check off on every laptop;
  you still see who leaves. **Lock again** switches them back on.
- If a tab does close, nothing is lost: reopen `index.html` → **Continue as Station N**.
- **Kiosk laptops (the strongest lock, optional):** copy `tools/air-watch-kiosk.bat` to each laptop
  (USB stick or shared drive) and double-click it before the lesson. The lesson opens full screen with no
  tabs and no address bar — in Chrome, or in Edge if the laptop has no Chrome. Close it at the end with
  **Alt+F4**. It keeps its own browser profile, so it works even if Chrome is already open; if it is closed
  by mistake, run it again and press **Continue as Station N**. Windows only; if the site address is different, change the
  `URL=` line. Without the file: right-click the desktop → **New → Shortcut** → paste
  `"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --user-data-dir="%LOCALAPPDATA%\AirWatchKiosk" https://vintiz-dot.github.io/g6-air-watch/`
  (for Edge: `"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk https://vintiz-dot.github.io/g6-air-watch/ --edge-kiosk-type=fullscreen --user-data-dir="%LOCALAPPDATA%\AirWatchKiosk"`).

### If something goes wrong

- **A laptop loses Wi-Fi:** its work stays on the laptop. After 20 seconds it shows Back / Next so the
  pair can follow you; it sends everything when the Wi-Fi returns.
- **A laptop reloads:** it carries on where it was.
- **A browser closes or crashes:** reopen `index.html` and press **Continue as Station N** (or join again
  with the same station and names) — the answers come back.
- **Your laptop crashes:** reopen `teacher.html`. The lesson carries on where it was; nothing is lost.
- **Two laptops choose the same station:** the teacher view shows a warning on both cards.
- **Never press “Start a new session” during the lesson** — it clears every answer (it asks twice).

Built for Victor Moronu, The Olympia Schools, Hanoi · build 2026-09-28c. PM2.5 size picture: U.S. EPA (public domain).
