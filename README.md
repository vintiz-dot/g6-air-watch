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
5. **Photo of the sky** (optional — sky only, no people).

The page tells them straight away whether their eyes were right, and reminds them to write the PM2.5
number in the book table (page 34). After Day 7 they look back: how many guesses were right, their
worst day and why — then **Hand in**.

Missed a day? They can catch up; it is saved as **entered late**, with the real time it was typed.

**My question.** Under the day, every student writes ONE question for the lesson (with the four
starters) and can improve it any day. On screen 2 each pair sees both partners' questions and picks one.

**New phone, or the page forgot them?** On the first screen they choose **Find my Air Watch**, type
their name and class, and tap their own log (it shows their station and days saved). They can also use
**their own link** (tap *My code* at the top → *Copy my link*) or the 6-letter code. Setting up again
with the same name and class asks *“Is it yours?”* first, so a student does not end up with two logs.
If it happens anyway, your page shows **The same student twice?** → **Join** (the other device follows
by itself).

---

## 4 · What you see

- Who has joined, how many logged each day, who has handed in.
- The class total: **how many guesses by looking were right** — the number that opens the lesson.
- Every student's week in one table; tap a row for everything, including photos.
- **Star** the sky photos you want to use in the lesson's opening (clear-looking sky, high AQI…).
- **Download all answers (CSV)** — one row per student per day, opens in Excel (now with each question).
- **Station readings** — every chosen station at 6:30–7:30, 16:30–17:30 and 19:00–20:00, day by day:
  a filled square is a real reading, a dashed one an estimate. Download them as a CSV too.
- **Questions for the lesson** — every student's question, by class.

---

## 4b · Every station at all three times

Each student checks once a day, at their own time. So that everyone can compare morning, after school
and evening at their own station, the readings are filled in for them — **only the station numbers,
never a guess, a note or a photo**:

1. **In each time window, any open homework page** (a student's or yours) saves every chosen station
   once. Leave `homework-teacher.html` open on a computer to be safe.
2. **The GitHub job** does the same at about 6:50, 16:50 and 19:20 even if no page is open
   (`tools/air-watch-readings.mjs`, started by a workflow file). **To switch it on**, move
   `tools/air-watch-readings.yml` into the folder `.github/workflows/` (GitHub only runs workflow files
   from there), then commit and push. On github.com instead: **Add file → Create new file**, name it
   `.github/workflows/air-watch-readings.yml`, paste the file's text, **Commit**. To test it: GitHub →
   **Actions** → *Air Watch station readings* → **Run workflow**. The teacher page then shows
   *GitHub job: last reading …*.
3. **Readings students typed on time** are shared, so classmates at the same station see them.
4. **Times nobody measured** (mostly 23–25 September, before this started) get an **estimate** from a
   computer model — Open-Meteo (CAMS model, CC BY 4.0) — always marked **≈ estimate**. Estimates can be
   quite different from a station, which is itself a good question for E12.

Students see all three times under each saved day (after they have locked their guess). In the lesson
they appear on screen 1 (days a student missed, marked *station* or *estimate*), screen 5 (the time and
place charts) and screen 6 (the table for Talk & Write Q2).

---

## 5 · Privacy

Stored: first name, class, the area they typed, their readings, their question and optional sky photos.
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

1. Laptops 1–11: open `index.html` and leave them on the join screen. Station cards on the desks.
2. Laptop 12: open `observer.html` for the observers.
3. Your laptop: connect the projector and press **Windows + P → Extend**. Open `teacher.html` → PIN →
   **Start a new session**.
4. Press **Projector ↗**, drag the window onto the projector, then press **Full screen on the
   projector** (Chrome and Edge can send it to the projector by themselves; allow the permission if asked).
5. In **Before the bell**: type the meter’s room reading and choose three sky photos (★ starred ones come first).
6. At 9:40 press **▶ Bell**. The 45 minutes and the screen-1 timer start.

### During the lesson

- **Next →** opens the next screen on every laptop, with its timer; **← Back** reopens the one before.
  The run sheet shows the reveal buttons first, then your script for that screen and a planned cut
  (**If you are behind**).
- The badge at the top says when the lesson will finish if you keep every remaining timer. It turns red
  and says how much to cut if you are heading past 45:00.
- **Reveal** buttons show answers on the laptops and the projector. **★ Spotlight** puts a pair’s
  sentence on the projector (they see “Your work is on the board!”); **✕ End spotlight** in the top bar,
  **Esc**, or a click on the projector takes it off. **Nudge** sends a private message to one laptop.
  **✓ Helped** clears a help request.
- **Goals** (right column): the class score for the Science, Language and Thinking goals, from the
  screens already finished, plus the screen you are on. Open **Every check** to see what is counted.
  Green is 80% or more. The projector’s top bar shows the same three scores.
- Screen 2: each pair sees the questions both partners wrote at home and picks one to post.
- Screen 3: after “60 seconds later”, press **Show how small PM2.5 is** — the EPA hair-and-sand picture
  appears on the laptops and the projector.
- Screen 6: the laptops show the pair’s whole week (and the class station); tapping a number fills
  “___ tells us that the AQI was ___ on ___”.
- Screen 7: tick up to three rules → **Put the ticked rules to the vote** → **Close the vote** makes the
  winner the class rule.
- Screen 9: pairs type the science goal and the thinking goal from memory, press **Check our answers**,
  and mark each one got it / partly / missed it; the run sheet lists what each pair typed. Then press
  **Show the goals and self-ratings on the board**.
- Keys: **N** next screen · **B** back · **P** pause/resume · **+** one more minute · **Esc** end the spotlight.

### If something goes wrong

- **A laptop loses Wi-Fi:** its work stays on the laptop. After 20 seconds it shows Back / Next so the
  pair can follow you; it sends everything when the Wi-Fi returns.
- **A laptop reloads:** it carries on where it was.
- **A browser closes or crashes:** reopen `index.html` and press **Continue as Station N** (or join again
  with the same station and names) — the answers come back.
- **Your laptop crashes:** reopen `teacher.html`. The lesson carries on where it was; nothing is lost.
- **Two laptops choose the same station:** the teacher view shows a warning on both cards.
- **Never press “Start a new session” during the lesson** — it clears every answer (it asks twice).

Built for Victor Moronu, The Olympia Schools, Hanoi · build 2026-09-25. PM2.5 size picture: U.S. EPA (public domain).
