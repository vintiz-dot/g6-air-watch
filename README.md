# Air Watch — Grade 6, Lesson 6 (Air Pollution & AQI)

Two parts, one folder:

- the **7-day air-quality homework** (23–29 September), and
- the **lesson app** for the observed lesson on **Wednesday 30 September, period 3 (9:40–10:25)**:
  pair laptops, your laptop, the projector and the observers’ laptop, all live. See **section 6**.

| Page | Who | What it does |
|---|---|---|
| `homework.html` | students | The daily log: look and guess first, then check the station, then note what was happening. About 3 minutes a day. |
| `homework-teacher.html` | you (PIN) | Every student's week, live. Choose the class station, star sky photos for the lesson, download a CSV. |
| `check.html` | you | Tests the database (homework and lesson rooms), the air-quality data and the class station. Every red row says what to fix. |
| `index.html` | pair laptops 1–11 | **The lesson.** Join with station + names, then the 9 screens, following your screen changes. |
| `teacher.html` | your laptop (PIN) | Runs the lesson: screens and timers, reveals, spotlight, private nudges, student ideas, rule vote, live targets. |
| `projector.html` | the projector | Class results only: timer, votes, charts, Wonder Wall, spotlight. Opened from `teacher.html`. |
| `observer.html` | observers’ laptop | Read-only: every pair’s live work, planned vs actual time, and level-4 evidence for the framework. |

Teacher PIN: **4826** — change it in `assets/aw-config.js` (`teacherPin`).

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
Changed phone? The **code** at the top of their page moves their week to another device.

---

## 4 · What you see

- Who has joined, how many logged each day, who has handed in.
- The class total: **how many guesses by looking were right** — the number that opens the lesson.
- Every student's week in one table; tap a row for everything, including photos.
- **Star** the sky photos you want to use in the lesson's opening (clear-looking sky, high AQI…).
- **Download all answers (CSV)** — one row per student per day, opens in Excel.

---

## 5 · Privacy

Stored: first name, class, the area they typed, their readings and optional sky photos. No other
personal data. Photos must show the sky only. After E12, download the CSV, then use
**Clear the whole homework room** at the bottom of the teacher page (it asks three times).

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
| Your laptop screen | `teacher.html` | Three columns: run sheet and controls · every pair live · student voice, targets and log. |
| Projector (extended display) | `projector.html` | Timer, class results, charts, photo game, Wonder Wall, spotlight. |
| Laptop 12, back of the room | `observer.html` | Every pair’s work, the lesson map (planned vs actual minutes), level-4 evidence counted live, checks for understanding, an optional talk-time tally. |

### The day before (15 minutes)

1. Upload the new files to the same GitHub repository (**Add file → Upload files**, drag everything
   in this folder, **Commit**). `assets/firebase-config.js` stays as it is.
2. Open `check.html` on the **school Wi-Fi**. All rows should be green except “No lesson session yet”.
3. Rehearse once: `teacher.html` → PIN → **Start a new session**; on a second device open `index.html`,
   join station 1, press **Bell** and click through a few screens. **Start a new session** again
   afterwards — it clears the rehearsal.

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

- **Next →** opens the next screen on every laptop, with its timer. The run sheet shows your script for
  that screen and a planned cut (**If you are behind**).
- The badge at the top says when the lesson will finish if you keep every remaining timer. It turns red
  and says how much to cut if you are heading past 45:00.
- **Reveal** buttons show answers on the laptops and the projector. **★ Spotlight** puts a pair’s
  sentence on the projector (they see “Your work is on the board!”). **Nudge** sends a private message
  to one laptop. **✓ Helped** clears a help request.
- Screen 7: tick up to three rules → **Put the ticked rules to the vote** → **Close the vote** makes the
  winner the class rule.
- Keys: **N** next screen · **P** pause/resume · **+** one more minute · **Esc** clear the spotlight.

### If something goes wrong

- **A laptop loses Wi-Fi:** its work stays on the laptop. After 20 seconds it shows Back / Next so the
  pair can follow you; it sends everything when the Wi-Fi returns.
- **A laptop reloads or crashes:** reopen `index.html` — the laptop remembers the station, the names and the answers.
- **Your laptop crashes:** reopen `teacher.html`. The lesson carries on where it was; nothing is lost.
- **Two laptops choose the same station:** the teacher view shows a warning on both cards.
- **Never press “Start a new session” during the lesson** — it clears every answer (it asks twice).

Built for Victor Moronu, The Olympia Schools, Hanoi · build 2026-09-23b.
