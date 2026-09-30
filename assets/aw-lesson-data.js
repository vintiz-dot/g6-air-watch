/* Air Watch lesson — every word students and teacher see.
   Book items are copied word for word from Natural Science 6, Lesson 6 (pp. 30–36).
   `short` labels are projector cues only; the laptops always show the book wording. */
window.LESSON = {
  title: "Air Pollution & AQI",
  sub: "Grade 6 · Lesson 6 · E11 · Wednesday 30 September, 9:40–10:25",
  bigQ: "The air looks clear. Is it clean? How would we know?",
  /* three goals, measured screen by screen (see goalChecks in aw-evidence.js) */
  goals: [
    { k: "sci",   label: "Science goal",  short: "Science",
      text: "I can explain why clear-looking air can still be polluted, and what the AQI is made of." },
    { k: "lang",  label: "Language goal", short: "Language",
      text: "I can use the key words (pollutant, emission, PM2.5, AQI) and report a number with its source: “___ tells us that ___.”" },
    { k: "think", label: "Thinking goal", short: "Thinking",
      text: "I can explain what an index hides as well as what it shows." }
  ],
  /* which goals each screen works on (shown on every laptop) */
  screenGoals: { 1: ["sci"], 2: ["sci"], 3: ["sci", "lang"], 4: ["sci", "lang"], 5: ["sci", "lang", "think"], 6: ["sci", "lang", "think"], 7: ["think"], 8: ["lang"], 9: ["sci", "lang", "think"] },

  /* 9 screens · minutes add up to 44 + 1 minute to close = 45 */
  screens: [
    { n: 1, key: "threshold", phase: "Engage",      name: "Our two weeks",               min: 3 },
    { n: 2, key: "look",      phase: "Engage",      name: "Can you tell by looking?",    min: 5 },
    { n: 3, key: "jar",       phase: "Engage",      name: "The Jar Test",                min: 4 },
    { n: 4, key: "focus",     phase: "Focus",       name: "What makes a pollutant?",     min: 5 },
    { n: 5, key: "inv1",      phase: "Investigate", name: "What is the AQI made of?",    min: 5 },
    { n: 6, key: "inv2",      phase: "Investigate", name: "Read the graphs",             min: 5 },
    { n: 7, key: "gen",       phase: "Generalize",  name: "Say it without Hanoi",        min: 4 },
    { n: 8, key: "transfer",  phase: "Transfer",    name: "Fix our week",                min: 8 },
    { n: 9, key: "reflect",   phase: "Reflect",     name: "Where are you now?",          min: 5 }
  ],

  /* one question, asked at the start and at the end */
  vote: { q: "Can you tell how clean the air is just by looking at the sky?", vn: "Chỉ nhìn bầu trời, em có biết không khí sạch hay không?",
    opts: [["yes", "Yes"], ["some", "Sometimes"], ["no", "No"]] },

  starters: ["What would happen if…", "Why does… but not…?", "How could we know…?", "What if we measured…"],

  /* one rule on every screen (the Pilot has the laptop, the Navigator speaks for the pair) */
  talkRule: "Talk first: the Navigator says it, the Pilot types what the Navigator said.",
  talkRuleShort: "Talk first — then type",

  /* screen 2: invite a change early */
  invite: "Could a task today be better for you? Press Suggest a change at the bottom of the screen — your teacher answers here.",

  /* screens 7 and 9: back to the questions */
  wonder: { q: "Which Wonder Wall question can we answer now? Which is still open?",
    sharp: "Write ONE sharper question for E12 — one we could answer by measuring.",
    sharpPh: "e.g. Is the air at our school gate worse at 7:00 than at 16:30?" },

  /* early finishers: the book first — the exact page and question (book pp. 30–36). Also used by the print pack. */
  book: {
    1: [{ p: "34", what: "Air Watch table", do: "Every day needs its PM2.5 number. Copy any missing day from the week on your screen." }],
    2: [{ p: "34", what: "Air Watch table", do: "Check that all 7 days are filled in." }],
    3: [{ p: "32", what: "Talk & Write Q3", do: "“What evidence is there to prove air pollution?” Write one sentence with the beam or the meter number." }],
    4: [{ p: "30", what: "Key words", do: "The six words and what they mean." }, { p: "32", what: "Q1 and Q2", do: "Write your answers: Q1 (match) and Q2 (true or false)." }],
    5: [{ p: "30–31", what: "The reading and the AQI colour table", do: "Read it again: which colour band was your worst day?" }],
    6: [{ p: "33", what: "Data question 1", do: "Circle your two answers." }, { p: "34", what: "Data question 2", do: "Circle your answer." }, { p: "32", what: "Talk & Write Q2", do: "Your sentence with a number from your week." }],
    7: [{ p: "31", what: "Talk & Write Q1", do: "“What is your understanding of Air Pollution and Air Quality?” Write the class rule, or your better version." }],
    8: [{ p: "32", what: "Q3", do: "Circle your three answers, then write one sentence: why would D or E fail?" }],
    9: [{ p: "32", what: "Talk & Write Q4", do: "“Why do we need to talk about the air quality?” Stretch: “I used to think… Now I think…”" }]
  },

  jar: {
    predict1: { q: "When the smoke clears, will the air in the jar be clean?", opts: [["yes", "Yes, clean"], ["no", "No, not clean"], ["cant", "Can't tell"]] },
    predict2: { q: "How high will the PM2.5 number go?", opts: [["low", "Low (under 50)"], ["mid", "Middle (50–150)"], ["high", "High (over 150)"]] },
    /* the frame answers the book question: "What evidence is there to prove air pollution?" */
    frame: ["The evidence is the", ", which showed", "even though the air looked", "."],
    ph: ["meter / beam of light", "the number, e.g. 64 µg/m³ of PM2.5", "clean / clear"],
    bookHint: "Your sentence answers this question — copy it into your book.",
    bookQ3: { page: 32, text: "3. What evidence is there to prove air pollution?" },
    /* shown after the teacher's reveal, once the jar looks clear again */
    size: { title: "Why can’t we see it? How small is PM2.5?", img: "assets/img/pm25-size.webp",
      alt: "A human hair 50 to 70 micrometres wide next to grains of fine beach sand 90 micrometres wide, a line of PM10 particles under 10 micrometres, and PM2.5 particles under 2.5 micrometres — far thinner than the hair.",
      lines: ["A human hair is about 50–70 micrometres (µm) wide.", "A PM2.5 particle is 2.5 µm or smaller — about 30 times thinner than a hair.", "Our eyes cannot see one particle that small. The meter can."],
      vn: "Bụi mịn PM2.5 nhỏ hơn sợi tóc khoảng 30 lần — mắt thường không nhìn thấy được.",
      credit: "Image: U.S. Environmental Protection Agency (EPA)" }
  },

  focus: {
    cards: [
      { k: "pm25", en: "PM2.5 (fine dust)", vn: "bụi mịn", yes: true },
      { k: "co", en: "carbon monoxide", vn: "khí CO", yes: true },
      { k: "o3", en: "ozone", vn: "ô-dôn", yes: true },
      { k: "no2", en: "nitrogen dioxide", vn: "khí NO₂", yes: true },
      { k: "o2", en: "oxygen", vn: "khí oxy", yes: false },
      { k: "n2", en: "nitrogen", vn: "khí nitơ", yes: false },
      { k: "fog", en: "water vapour (fog)", vn: "hơi nước (sương mù)", yes: false },
      { k: "smell", en: "a smell you dislike", vn: "mùi em không thích", yes: false }
    ],
    rule: ["A pollutant is a substance that", "when there is enough of it. You cannot always", "it."],
    terms: [
      { en: "Air pollution", ipa: "/eər pəˈluː.ʃən/", vn: "Ô nhiễm không khí", ic: "pollution" },
      { en: "Air quality", ipa: "/eər ˈkwɒl.ə.ti/", vn: "Chất lượng không khí", ic: "quality" },
      { en: "Fine dust (PM2.5)", ipa: "/faɪn dʌst/", vn: "Bụi mịn (PM2.5)", ic: "pm25" },
      { en: "AQI (Air Quality Index)", ipa: "/eɪ.kjuː.ˈaɪ/", vn: "Chỉ số chất lượng không khí", ic: "aqi" },
      { en: "Pollutant", ipa: "/pəˈluː.tənt/", vn: "Chất gây ô nhiễm", ic: "pollutant" },
      { en: "Emission", ipa: "/ɪˈmɪʃ.ən/", vn: "Khí thải", ic: "emission" }
    ],
    q1: { page: 32, head: "1. (DOK1) Match the term with its definition:",
      terms: ["1. AQI", "2. Emission", "3. Pollutant", "4. PM2.5"],
      defs: ["a. A number that shows how polluted the air is", "b. Smoke or gas released from engines or factories", "c. A substance that causes pollution", "d. Tiny particles that are dangerous to inhale"],
      key: ["a", "b", "c", "d"] },
    q2: { page: 32, head: "2. (DOK2) True or False:",
      items: ["a. ……… PM2.5 can enter your lungs and cause health problems.", "b. ……… Emissions from trees are the biggest cause of pollution.",
        "c. ……… AQI is a helpful tool to check air pollution levels.", "d. ……… A high AQI means the air is safe and clean."],
      key: ["T", "F", "T", "F"] },
    map: { q: "Choose the correct sentence.", opts: ["A. The AQI tell us how polluted the air is.", "B. The AQI tells us how polluted the air is.", "C. The AQI telling us how polluted the air is.", "D. The AQI to tell us how polluted the air is."], key: 1 }
  },

  inv1: {
    example: { name: "Example station", aqi: 132, six: { pm25: 132, pm10: 61, o3: 12, no2: 9, so2: 3, co: 4 } },
    frame: ["The AQI shows", "but it hides"],
    diffQ: "Is a different number always a wrong number?"
  },

  inv2: {
    dbq1: { page: 33, img: "assets/img/dbq1-co2.jpg",
      lead: "DATA-BASED QUESTIONS (DOK2) Students are investigating the change in concentrations of carbon dioxide over time.",
      q: "Students wonder about the causes and effects of this change. Which two questions best clarify the cause and effects of the change in carbon dioxide levels?",
      opts: ["A. Did light intensity at Earth's surface increase after 1950?", "B. Did global temperature increase in 2015 compared to 1950?",
        "C. Did the wind speed at the equator consistently increase after 1950?", "D. Did fossil fuel use increase in 1950 compared to the previous century?",
        "E. Did the oxygen concentration in Earth's atmosphere begin to decrease in 1950?"],
      key: ["B", "D"], roles: { B: "effect", D: "cause" },
      short: ["A · light at Earth’s surface", "B · global temperature", "C · wind at the equator", "D · fossil fuel use", "E · oxygen in the air"] },
    dbq2: { page: 34, img: "assets/img/dbq2-maunaloa.jpg",
      lead: "DATA-BASED QUESTIONS (DOK2)",
      q: "Which statement best supports the data trend shown in the graph?",
      opts: ["A. More fossil fuels were burned as a power source in 2005 than in 1960.", "B. Fossil fuels consumed before 1970 produced less pollution than those consumed after 1970.",
        "C. Alternative energy sources introduced in the 1990s have reduced dependence on fossil fuels.", "D. Volcanic eruptions were more common before 1980 than they have been since 1980."],
      key: "A",
      short: ["A · more fossil fuels burned in 2005", "B · older fuels polluted less", "C · alternative energy since the 1990s", "D · more volcanoes before 1980"] },
    tw2: { page: 32, text: "2. Do you think the quality of air in Hanoi is good or bad? How do you know?", frame: ["tells us that the AQI was", "on", "so the air was"] },
    /* before the carbon dioxide graphs */
    bridge: "Carbon dioxide (CO₂) is not one of the AQI parts. At these levels it does not hurt your lungs — it warms the planet. A different problem, the same skill: reading a trend."
  },

  gen: {
    frames: [
      { k: "g1", parts: ["An index turns", "into one number, so people can", "but it hides"] },
      { k: "g2", parts: ["You cannot reduce", "until you can", "it fairly, so", "is part of the solution."] },
      { k: "g3", parts: ["Pollution comes from what people", "so the pattern in the data follows"] }
    ],
    bank: ["pollutant", "emission", "index", "measure", "source", "place", "time", "decide", "hide"],
    bookQ1: { page: 31, text: "1. What is your understanding of Air Pollution and Air Quality?" }
  },

  transfer: {
    q3: { page: 32, text: "3. (DOK3) The population of a city is growing. City officials want to monitor air quality to minimize negative impacts from the increased population. Which three procedures should the city use for the air quality monitoring system?",
      opts: ["A. Install sensors in a variety of locations around the city.", "B. Compare collected data to long-term baseline levels of key pollutants.",
        "C. Collect data systematically at the same times of day and from the same locations.", "D. Collect data only during times that people are most likely to participate in outdoor activities.",
        "E. Use sensors that start recording data when air pollutant concentrations rise above healthy levels."],
      key: ["A", "B", "C"],
      short: ["A · sensors in many places", "B · compare with a long-term baseline", "C · same times, same places", "D · only when people are outside", "E · record only above healthy levels"] },
    failD: ["If the city did D, it would miss"],
    failE: ["If the city used E, it could never"],
    plan: [["where", "WHERE would the sensors go?"], ["when", "WHEN would you record?"], ["often", "HOW OFTEN?"], ["compare", "COMPARED WITH what?"]],
    /* every part of the plan ends in "because…": a reason that points to a problem in our week */
    because: "because…",
    ask: "We want feedback on",
    checks: ["Where", "When", "How often", "Compared with"],
    checkRule: "Tick a part only if it has a real reason — a “because…” that points to a problem in their week.",
    /* how good is a plan? (DOK levels, as in the book) */
    ladder: [
      { lv: "DOK 1 · Recall", sounds: "Copies the book’s options.", ex: "“Sensors in many places. Same time.”" },
      { lv: "DOK 2 · Explain", sounds: "All four parts, with general reasons.", ex: "“WHEN: 7:00 every day, so it is fair.”" },
      { lv: "DOK 3 · Justify — our target", sounds: "Every part is tied to a problem in OUR week.", ex: "“WHEN: everyone at 7:00 and 17:00, because a morning 140 and an evening 70 on the same day can’t be compared.”" },
      { lv: "DOK 4 · Design", sounds: "The plan checks itself and names a trade-off.", ex: "“Two sensors 50 m apart: if they differ by more than 10, one is broken.”" }
    ]
  },

  reflect: {
    bookQ4: { page: 32, text: "4. Why do we need to talk about the air quality?" },
    levels: [["no", "NOT YET"], ["almost", "ALMOST"], ["yes", "YES"]],
    /* recall alone first: each student writes both goals in their own book, from memory */
    alone: "Alone, in your own book — no talking, no looking: write today’s science goal and thinking goal from memory.",
    had: [["both", "Both goals"], ["one", "One"], ["none", "Not yet"]],
    e12: "In E12 I will…",
    next: "Next lesson (E12): your week becomes a research report comparing two places — book page 35, and the self-assessment on page 36."
  },

  challenge: {
    1: "Look at both weeks. Which day do you think had heavy traffic? What in the data tells you?",
    2: "A photo can show fog. Can a photo ever show PM2.5? Why or why not?",
    3: "The candle smoke was an emission. Name two emissions near our school.",
    4: "Loud noise is not a substance. Can it still be called “pollution”? Use your rule to decide.",
    5: "Two stations both show AQI 120. Could their air still be different? How?",
    6: "Carbon dioxide is not one of the six AQI parts. Is it a pollutant? Use your rule from screen 4.",
    7: "Find something that breaks your rule. Then fix the rule.",
    8: "Your plan costs money. Which ONE part would you keep if you could only afford one?",
    9: "What would you need to measure next week to answer your own ‘I wonder’ question?"
  },

  /* teacher run sheet — one card per screen */
  script: {
    1: ["Silent for 90 seconds — the screen is the instruction.", "At 0:02: Navigator of Pair 1 reads the three goals aloud — science, language, thinking.", "Say once: “At the end you will tell me the science goal and the thinking goal from memory.”", "Rule for every screen (on every laptop): talk first — the Navigator says it, the Pilot types it. Cold-call Navigators."],
    2: ["Press Reveal: the class guess score. Wait 5 seconds. Say nothing.", "Photo game: 60 seconds to vote → Reveal the numbers.", "Ask once: “So — can you tell by looking?” Wait 5 seconds.", "Every pair posts up to three questions — they start from the questions they wrote at home. Put them on the wall → the whole wall, full screen → spotlight two.", "Say: “If a task could be better for you, press Suggest a change.” Accept the first good one aloud."],
    3: ["Assistants to the bench. Type the room baseline.", "Light the tealight, close the lid, watch the flame die (B11: burning needs oxygen).", "Beam through the smoke. Lift the lid at the meter → type the peak.", "Wait 60 s → type ‘after’. Say: “Looking is not measuring.”", "Reveal the size picture (20 s): “A hair is 50–70 micrometres. PM2.5 is 2.5 or less — 30 times thinner. Your eyes cannot see one.”", "Book T&W Q3 (p.32): one sentence with the beam or the number."],
    4: ["Sort: 60 s. “The fog and the smoke looked the same. Which is a pollutant?”", "Rule: 60 s → spotlight the best rule, in their words.", "Terms: 60 s — the Navigator teaches the Pilot.", "Book Q1 + Q2 (p.32): 90 s → Reveal answers.", "Metaphor (30 s): the AQI is a report card — one number from six subjects."],
    5: ["AQI made of: 2½ min → show the total / average / biggest split.", "Time or place: 2½ min → show the charts.", "Ask once: “Is a different number always a wrong number?” Wait 5 s.", "Check the trap: “AQI went from 60 to 180 — did air QUALITY go up or down?”"],
    6: ["Bridge (10 s): “CO2 is not in the AQI. At these levels it doesn’t hurt your lungs; it warms the planet. Different problem, same skill: reading a trend.”", "DBQ1 (p.33) + DBQ2 (p.34): 3½ min → show the bars.", "Name the structure: one cause, one effect.", "T&W Q2 (p.32): 1½ min — their week is on the laptop: tap a number, then finish “so the air was ___”."],
    7: ["Write: 1½ min.", "Spotlight three rules. “Would it work for a city you have never been to?”", "Vote: 30 s → class rule.", "10 seconds: “Rule G1 is also true of your exam grades.”", "Wonder Wall (30 s): “Which question can we answer now? Which is still open?”", "Book T&W Q1 (p.31)."],
    8: ["Q3 (p.32): 3 min → Reveal A, B, C. The failure sentences for D and E are what you mark.", "Redesign our week: 3 min. “Our numbers disagreed. Design a system where they would not have.” Every part ends in “because…” — point at the ladder: level 3 ties each part to a problem in our week.", "Peer check: 2 min. Tick a part only if it has a reason. Do not help — count your interventions."],
    9: ["Re-vote: 30 s → show the before/after shift.", "Cover the goals. Alone, in their own books: the SCIENCE goal and the THINKING goal from memory. Then the pair types its best version and checks: 1 min. Ask: “Hands up if you had both.” Each student marks it.", "Self-rate all three goals with evidence, and finish “In E12 I will…”: 1½ min → show the goals on the board.", "Wonder Wall: “Which question can we answer now? Which is still open?” Each pair posts one sharper question.", "Exit: book T&W Q4 (p.32).", "Launch E12 (p.35, self-assessment p.36).", "After the bell: Print pack (session card) — one A5 half per student to glue into the notebook and copy into the book."]
  },

  /* if the projected finish passes 45:00 — what to drop on each screen (planned cuts, never the evidence) */
  cut: {
    1: "Skip “How sure are you?”. Move on as soon as the goals have been read aloud.",
    2: "Drop the photo game: reveal the guess score, then go straight to questions.",
    3: "The book sentence (p.32 Q3) moves to tonight’s homework.",
    4: "Terms: hear each word once. Q2 in class; Q1 moves to tonight’s homework.",
    5: "Ask “Is a different number always a wrong number?” aloud instead of typing it.",
    6: "DBQ2 (p.34) moves to tonight’s homework; keep DBQ1 and T&W Q2.",
    7: "No vote: spotlight one strong rule and make it the class rule.",
    8: "Plan WHERE and WHEN only — keep the peer check (it is your 3D.2 / 3E.2 evidence).",
    9: "Do not cut this screen: the re-vote and the goals from memory are your evidence. Take the time from screen 8."
  },

  nudges: ["One minute left — finish this part.", "Swap roles now: the Navigator takes the laptop.", "Use the sentence frame on your screen.", "Read the question aloud to each other, then answer.", "Good — now try the challenge card."]
};
window.LESSON.criteria = window.LESSON.goals.map(g => g.text);
