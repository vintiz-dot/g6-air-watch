/* Air Watch lesson — every word students and teacher see.
   Book items are copied word for word from Natural Science 6, Lesson 6 (pp. 30–36).
   `short` labels are projector cues only; the laptops always show the book wording. */
window.LESSON = {
  title: "Air Pollution & AQI",
  sub: "Grade 6 · Lesson 6 · E11 · Wednesday 30 September, 9:40–10:25",
  bigQ: "The air looks clear. Is it clean? How would we know?",
  criteria: [
    "I can explain why “looks clear” isn’t “is clean”, using a number as evidence.",
    "I can say what the AQI is made of and what it hides.",
    "I can plan a fair way to measure air quality: where, when, how often, compared with what."
  ],

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

  jar: {
    predict1: { q: "When the smoke clears, will the air in the jar be clean?", opts: [["yes", "Yes, clean"], ["no", "No, not clean"], ["cant", "Can't tell"]] },
    predict2: { q: "How high will the PM2.5 number go?", opts: [["low", "Low (under 50)"], ["mid", "Middle (50–150)"], ["high", "High (over 150)"]] },
    frame: ["It looks", "but the meter shows", "so"],
    bookQ3: { page: 32, text: "3. What evidence is there to prove air pollution?" }
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
      { en: "Air pollution", ipa: "/eər pəˈluː.ʃən/", vn: "Ô nhiễm không khí" },
      { en: "Air quality", ipa: "/eər ˈkwɒl.ə.ti/", vn: "Chất lượng không khí" },
      { en: "Fine dust (PM2.5)", ipa: "/faɪn dʌst/", vn: "Bụi mịn (PM2.5)" },
      { en: "AQI (Air Quality Index)", ipa: "/eɪ.kjuː.ˈaɪ/", vn: "Chỉ số chất lượng không khí" },
      { en: "Pollutant", ipa: "/pəˈluː.tənt/", vn: "Chất gây ô nhiễm" },
      { en: "Emission", ipa: "/ɪˈmɪʃ.ən/", vn: "Khí thải" }
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
    tw2: { page: 32, text: "2. Do you think the quality of air in Hanoi is good or bad? How do you know?", frame: ["tells us that the AQI was", "on", "so the air was"] }
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
    plan: [["where", "WHERE would the sensors go, and why there?"], ["when", "WHEN would you record?"], ["often", "HOW OFTEN?"], ["compare", "COMPARED WITH what?"]],
    ask: "We want feedback on",
    checks: ["Where", "When", "How often", "Compared with"]
  },

  reflect: {
    bookQ4: { page: 32, text: "4. Why do we need to talk about the air quality?" },
    levels: [["no", "NOT YET"], ["almost", "ALMOST"], ["yes", "YES"]],
    next: "Next lesson (E12): your week becomes a research report comparing two places — book page 35, and the self-assessment on page 36."
  },

  challenge: {
    1: "Look at both weeks. Which day do you think had heavy traffic? What in the data tells you?",
    2: "A photo can show fog. Can a photo ever show PM2.5? Why or why not?",
    3: "The candle smoke was an emission. Name two emissions near our school.",
    4: "Carbon dioxide is not one of the six AQI parts. Is it a pollutant? Use your rule.",
    5: "Two stations both show AQI 120. Could their air still be different? How?",
    6: "The Mauna Loa graph goes up and down every year like a saw. What could make it go down every year?",
    7: "Find something that breaks your rule. Then fix the rule.",
    8: "Your plan costs money. Which ONE part would you keep if you could only afford one?",
    9: "What would you need to measure next week to answer your own ‘I wonder’ question?"
  },

  /* teacher run sheet — one card per screen */
  script: {
    1: ["Silent for 90 seconds — the screen is the instruction.", "At 0:02: Navigator of Pair 1 reads the three criteria aloud.", "Say once: “At the end you will judge yourselves against these three.”"],
    2: ["Press Reveal: the class guess score. Wait 5 seconds. Say nothing.", "Photo game: 60 seconds to vote → Reveal the numbers.", "Ask once: “So — can you tell by looking?” Wait 5 seconds.", "Every pair posts one question. Spotlight two."],
    3: ["Assistants to the bench. Type the room baseline.", "Light the tealight, close the lid, watch the flame die (B11: burning needs oxygen).", "Beam through the smoke. Lift the lid at the meter → type the peak.", "Wait 60 s → type ‘after’. Say: “Looking is not measuring.”", "Book T&W Q3 (p.32): one sentence with the beam or the number."],
    4: ["Sort: 60 s. “The fog and the smoke looked the same. Which is a pollutant?”", "Rule: 60 s → spotlight the best rule, in their words.", "Terms: 60 s — the Navigator teaches the Pilot.", "Book Q1 + Q2 (p.32): 90 s → Reveal answers.", "Metaphor (30 s): the AQI is a report card — one number from six subjects."],
    5: ["AQI made of: 2½ min → show the total / average / biggest split.", "Time or place: 2½ min → show the charts.", "Ask once: “Is a different number always a wrong number?” Wait 5 s.", "Check the trap: “AQI went from 60 to 180 — did air QUALITY go up or down?”"],
    6: ["DBQ1 (p.33) + DBQ2 (p.34): 3½ min → show the bars.", "Name the structure: one cause, one effect.", "T&W Q2 (p.32): 1½ min, with their own number and source."],
    7: ["Write: 1½ min.", "Spotlight three rules. “Would it work for a city you have never been to?”", "Vote: 30 s → class rule.", "10 seconds: “Rule G1 is also true of your exam grades.”", "Book T&W Q1 (p.31)."],
    8: ["Q3 (p.32): 3 min → Reveal A, B, C. The failure sentences for D and E are what you mark.", "Redesign our week: 3 min. “Our numbers disagreed. Design a system where they would not have.”", "Peer check: 2 min. Do not help — count your interventions."],
    9: ["Re-vote: 30 s → show the before/after shift.", "Cover the criteria with your hand. Goals from memory: 1 min.", "Self-rate with evidence: 1½ min.", "Exit: book T&W Q4 (p.32).", "Launch E12 (p.35, self-assessment p.36)."]
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
