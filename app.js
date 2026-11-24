// ============================================================
// Wortsuchspiel (früher Wördle) – app.js
// Ein Tagesrätsel je Sprache (wird gespeichert), anklickbare Felder,
// Statistik, Teilen, Deutsch/Englisch umschaltbar.
// Die Farbvergabe steht in evaluate.js, die Wörter in woerter*.js.
// ============================================================

const WORTLAENGE = 5;
const MAX_VERSUCHE = 6;
const STAT_SCHLUESSEL = "woerdle-statistik";
const REVEAL_DONE_MS = 1300;  // 5 Felder, je 0,2 s versetzt, jedes dreht sich 0,5 s (siehe style.css)
const TOAST_MS = 1500;        // so lange bleibt eine Einblendung stehen
// Die Statistik geht erst auf, wenn die letzte Zeile umgedreht ist und die Einblendung gelesen wurde.
const STATS_OPEN_DELAY_MS = REVEAL_DONE_MS + TOAST_MS;
const NEW_DAY_CHECK_MS = 60000;
const APP_VERSION = "2.18";   // bei jedem Release hochzählen, zusammen mit CACHE_VERSION im Service Worker
// Unter diesem Namen liegen Tagesspielstand und Tagesstatistik auf den Geräten. Er stammt aus der Zeit
// mit zwei Modi und bleibt, damit vorhandene Spielstände und Statistiken weiter gefunden werden.
const DAILY_KEY_PART = "taeglich";

// --- Texte je Sprache ---
const TEXTE = {
  de: {
    fill5: "Bitte alle 5 Felder ausfüllen.",
    notinlist: "Dieses Wort ist nicht in der Liste.",
    // Lob nach einem Sieg, je nach Zahl der Versuche (1 bis 6), wie im Original.
    praise: ["Genial!", "Großartig!", "Beeindruckend!", "Prima!", "Gut gemacht!", "Puh!"],
    answer: "Lösung: ",
    greetingWon: "Herzlichen Glückwunsch! 🎉", greetingLost: "Danke fürs Spielen!",
    copied: "Ergebnis kopiert! 📋", copyFailed: "Kopieren nicht möglich",
    share: "Ergebnis kopieren",
    played: "Gespielt", winRate: "Siege %", streak: "Streak", best: "Beste",
    stats: "Statistik", guesses: "Versuche", nextWord: "Nächstes Wort in", langName: "Deutsch",
    shareTitle: "Wortsuchspiel", langBtn: "EN",
    newDaily: "Neues Tagesrätsel verfügbar!",
    continueBtn: "Weiterspielen", newWordBtn: "Neues Wort",
    todayWordBtn: "Heutiges Wort", oldFinished: "Altes Spiel beendet.",
    flagEmoji: "🇩🇪",
    switchLanguage: "Sprache wechseln", close: "Schließen",
    settings: "Einstellungen", reportBug: "Fehler melden", puzzle: "Rätsel Nr. ",
    help: "Anleitung", helpTitle: "So wird gespielt",
    helpIntro: [
      "Errate das Wort des Tages in 6 Versuchen.",
      "Jeder Versuch muss ein Wort mit 5 Buchstaben sein, das es gibt.",
      "Nach jedem Versuch zeigen die Farben, wie nah du dran bist.",
    ],
    helpExamplesTitle: "Beispiele",
    // index: welcher Buchstabe eingefärbt ist; color: wie in evaluate.js
    helpExamples: [
      { word: "STURM", index: 0, color: "gruen", text: "S steht an der richtigen Stelle." },
      { word: "KRONE", index: 2, color: "gelb", text: "O kommt im Wort vor, aber an einer anderen Stelle." },
      { word: "BLATT", index: 1, color: "grau", text: "L kommt im Wort nicht vor." },
    ],
    helpOutro: "Jeden Tag um Mitternacht gibt es ein neues Rätsel.",
  },
  en: {
    fill5: "Please fill all 5 boxes.",
    notinlist: "This word is not in the list.",
    praise: ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"],
    answer: "Answer: ",
    greetingWon: "Congratulations! 🎉", greetingLost: "Thanks for playing today!",
    copied: "Result copied! 📋", copyFailed: "Could not copy",
    share: "Copy result",
    played: "Played", winRate: "Win %", streak: "Streak", best: "Best",
    stats: "Statistics", guesses: "Guesses", nextWord: "Next word in", langName: "English",
    shareTitle: "Wordle", langBtn: "DE",
    newDaily: "New daily puzzle available!",
    continueBtn: "Continue", newWordBtn: "New word",
    todayWordBtn: "Today's word", oldFinished: "Old game finished.",
    flagEmoji: "🇬🇧",
    switchLanguage: "Switch language", close: "Close",
    settings: "Settings", reportBug: "Report a problem", puzzle: "Puzzle no. ",
    help: "How to play", helpTitle: "How to play",
    helpIntro: [
      "Guess the word of the day in 6 tries.",
      "Each guess must be a valid 5-letter word.",
      "After each guess, the colors show how close you are.",
    ],
    helpExamplesTitle: "Examples",
    helpExamples: [
      { word: "CRANE", index: 0, color: "gruen", text: "C is in the word and in the right spot." },
      { word: "PLANT", index: 2, color: "gelb", text: "A is in the word but in the wrong spot." },
      { word: "STORM", index: 4, color: "grau", text: "M is not in the word in any spot." },
    ],
    helpOutro: "A new puzzle is released every day at midnight.",
  },
};

// --- Tastatur-Layouts ---
const TASTATUR_DE = [
  ["Q", "W", "E", "R", "T", "Z", "U", "I", "O", "P", "Ü"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ö", "Ä"],
  ["Enter", "Y", "X", "C", "V", "B", "N", "M", "Backspace"],
];
const TASTATUR_EN = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Enter", "Z", "X", "C", "V", "B", "N", "M", "Backspace"],
];

// --- Zustand ---
let sprache = ladeSprache();   // "de" oder "en"
let ZIEL = "";
let aktuelleZeile = 0;
let zeileBuchstaben = emptyRow();
let aktivesFeld = 0;
let spielVorbei = false;
let verlauf = [];
let eingaben = [];
let teilenText = "";
let tagesDatum = "";           // Datum, zu dem das aktuelle Tagesspiel gehört
let statsOpenTimer = null;     // verzögertes Öffnen des Dialogs nach Spielende
let countdownTimer = null;     // zählt im Dialog bis zum nächsten Tageswort herunter
let shownDay = "";             // Tag, an dem das Spiel zuletzt gestartet wurde
let revealTimers = [];         // warten aufs Aufdecken: Tastenfarben und Spielende-Anzeige
let toastTimer = null;         // blendet die aktuelle Einblendung wieder aus
const felder = [];

// --- kleine Helfer ---
// Eine leere Eingabezeile. Aus WORTLAENGE gebildet, damit die Länge nur an einer Stelle steht.
// Als function deklariert, weil sie schon oben bei den Zustandsvariablen gebraucht wird.
function emptyRow() {
  return new Array(WORTLAENGE).fill("");
}
function t(schluessel) {
  return TEXTE[sprache][schluessel];
}
function zielListe() {
  if (sprache === "en") { return ZIELWOERTER_EN; }
  return ZIELWOERTER;
}
function erlaubtListe() {
  if (sprache === "en") { return ERLAUBTE_EN; }
  return ERLAUBTE;
}
function tastaturLayout() {
  if (sprache === "en") { return TASTATUR_EN; }
  return TASTATUR_DE;
}
// Ist gerade irgendein Fenster offen (Statistik, Menü, Fehler melden)? Dann gehören Tasten
// und Tagwechsel nicht dem Spielfeld.
function anyDialogOpen() {
  return document.querySelector("dialog[open]") !== null;
}

// Kurze Einblendung oben über dem Spielfeld. Sie verschwindet nach TOAST_MS von selbst.
function showToast(text) {
  clearTimeout(toastTimer);
  document.getElementById("meldung").textContent = text;
  toastTimer = setTimeout(hideToast, TOAST_MS);
}
function hideToast() {
  clearTimeout(toastTimer);
  document.getElementById("meldung").textContent = "";
}

// ------------------------------------------------------------
// Raster
// ------------------------------------------------------------
function rasterAufbauen() {
  const raster = document.getElementById("raster");
  for (let zeile = 0; zeile < MAX_VERSUCHE; zeile++) {
    felder[zeile] = [];
    for (let spalte = 0; spalte < WORTLAENGE; spalte++) {
      const feld = document.createElement("div");
      feld.className = "feld";
      const z = zeile;
      const s = spalte;
      // Ein Tipp auf ein Feld der aktuellen Zeile setzt die Schreibmarke dorthin, so lässt sich
      // ein einzelner Buchstabe ändern, ohne alles dahinter zu löschen.
      feld.addEventListener("click", () => {
        if (spielVorbei) {
          return;
        }
        if (z === aktuelleZeile) {
          aktivesFeld = s;
          eingabeAnzeigen();
        }
      });
      raster.appendChild(feld);
      felder[zeile][spalte] = feld;
    }
  }
}

function eingabeAnzeigen() {
  for (let spalte = 0; spalte < WORTLAENGE; spalte++) {
    const feld = felder[aktuelleZeile][spalte];
    feld.textContent = zeileBuchstaben[spalte];
    feld.classList.toggle("gefuellt", zeileBuchstaben[spalte] !== "");
    feld.classList.toggle("aktiv-feld", spalte === aktivesFeld);
  }
}

// ------------------------------------------------------------
// Bildschirm-Tastatur
// ------------------------------------------------------------
function tastaturAufbauen() {
  const tastatur = document.getElementById("tastatur");
  tastatur.innerHTML = "";
  for (const reihe of tastaturLayout()) {
    const reiheDiv = document.createElement("div");
    reiheDiv.className = "tasten-reihe";
    for (const taste of reihe) {
      const knopf = document.createElement("button");
      knopf.className = "taste";
      knopf.dataset.taste = taste;
      if (taste === "Backspace") {
        knopf.textContent = "⌫";
        knopf.classList.add("taste-breit");
      } else if (taste === "Enter") {
        knopf.textContent = "Enter";
        knopf.classList.add("taste-breit", "taste-enter");
      } else {
        knopf.textContent = taste;
      }
      knopf.addEventListener("click", () => {
        verarbeiteTaste(taste);
        knopf.blur();
      });
      reiheDiv.appendChild(knopf);
    }
    tastatur.appendChild(reiheDiv);
  }
}

// Eine Taste zeigt das beste, was man über ihren Buchstaben schon weiß: Grün bleibt grün,
// Gelb schlägt Grau. Sonst könnte ein späteres Grau (z. B. ein überzähliges M) ein früheres
// Gelb oder Grün wieder verdecken.
function tasteEinfaerben(buchstabe, farbe) {
  const knopf = document.querySelector('.taste[data-taste="' + buchstabe + '"]');
  if (knopf === null) {
    return;
  }
  if (knopf.classList.contains("gruen")) {
    return;
  }
  if (farbe === "gruen") {
    knopf.classList.remove("gelb", "grau");
    knopf.classList.add("gruen");
  } else if (farbe === "gelb") {
    if (!knopf.classList.contains("gelb")) {
      knopf.classList.remove("grau");
      knopf.classList.add("gelb");
    }
  } else {
    if (!knopf.classList.contains("gelb")) {
      knopf.classList.add("grau");
    }
  }
}

// ------------------------------------------------------------
// Eingabe
// ------------------------------------------------------------
function tastendruck(event) {
  // Tastenkürzler wie Strg+R gehören dem Browser, gehaltene Tasten sollen nichts wiederholen.
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) {
    return;
  }
  // Bei offenem Fenster darf nichts ins Spielfeld getippt werden.
  if (anyDialogOpen()) {
    return;
  }
  const dialog = document.getElementById("stats-dialog");
  // Nach Esc kann der Fokus noch auf einem Knopf im geschlossenen Dialog liegen.
  // Ohne das Lösen würde das nächste Enter ihn auslösen und zum Beispiel erneut kopieren.
  if (dialog.contains(document.activeElement)) {
    document.activeElement.blur();
  } else if (event.key === "Enter" && event.target.tagName === "BUTTON") {
    // Enter auf einem per Tab gewählten Knopf löst nur diesen Knopf aus, nicht zusätzlich das Raten.
    return;
  }
  verarbeiteTaste(event.key);
}

// Wackelt die aktuelle Zeile, damit eine Ablehnung auch ohne Lesen der Meldung auffällt.
function shakeRow() {
  for (const feld of felder[aktuelleZeile]) {
    feld.classList.remove("wackeln");
    void feld.offsetWidth;   // erzwingt einen Neustart der Animation bei schneller Wiederholung
    feld.classList.add("wackeln");
    feld.addEventListener("animationend", () => feld.classList.remove("wackeln"), { once: true });
  }
}

function verarbeiteTaste(taste) {
  // Nach Spielende gibt es heute nichts mehr zu tippen, das nächste Rätsel kommt morgen.
  if (spielVorbei) {
    return;
  }

  if (taste === "Enter") {
    const wort = zeileBuchstaben.join("");
    if (wort.length < WORTLAENGE) {
      showToast(t("fill5"));
      shakeRow();
    } else if (!erlaubtListe().includes(wort)) {
      showToast(t("notinlist"));
      shakeRow();
    } else {
      hideToast();
      zeileAuswerten();
    }
    return;
  }

  if (taste === "Backspace") {
    if (zeileBuchstaben[aktivesFeld] !== "") {
      zeileBuchstaben[aktivesFeld] = "";
    } else if (aktivesFeld > 0) {
      aktivesFeld = aktivesFeld - 1;
      zeileBuchstaben[aktivesFeld] = "";
    }
    hideToast();
    eingabeAnzeigen();
    return;
  }

  // Erlaubt ist, was die Tastatur der Sprache zeigt. So lässt sich im Englischen kein Ä über
  // eine echte Tastatur eingeben, das ohnehin in keinem englischen Wort vorkommen kann.
  if (tastaturLayout().flat().includes(taste.toUpperCase())) {
    zeileBuchstaben[aktivesFeld] = taste.toUpperCase();
    // Nach dem Tippen ein Feld weiter, damit man ein Wort am Stück eintippen kann. Auf dem
    // letzten Feld bleibt die Marke stehen; ein weiterer Buchstabe ersetzt dann den fünften.
    if (aktivesFeld < WORTLAENGE - 1) {
      aktivesFeld = aktivesFeld + 1;
    }
    hideToast();
    eingabeAnzeigen();
  }
}

// ------------------------------------------------------------
// Auswertung
// ------------------------------------------------------------
function zeileAuswerten() {
  const wort = zeileBuchstaben.join("");
  // Welche Farbe jeder Buchstabe bekommt, rechnet evaluate.js aus; hier wird nur angezeigt.
  const ergebnis = evaluateGuess(ZIEL, wort);

  for (let i = 0; i < WORTLAENGE; i++) {
    const feld = felder[aktuelleZeile][i];
    feld.classList.remove("gefuellt", "aktiv-feld");
    feld.classList.add(ergebnis[i]);
    feld.style.animationDelay = (i * 0.2) + "s";
    feld.classList.add("aufgedeckt");
  }
  // Die Tasten erst nach dem Umdrehen färben, sonst verraten sie das Ergebnis vorab.
  afterReveal(() => {
    for (let i = 0; i < WORTLAENGE; i++) {
      tasteEinfaerben(wort[i], ergebnis[i]);
    }
  });

  verlauf.push(ergebnis.slice());
  eingaben.push(wort);

  const gewonnen = wort === ZIEL;
  aktuelleZeile++;
  zeileBuchstaben = emptyRow();
  aktivesFeld = 0;

  if (gewonnen) {
    spielBeenden(true);
  } else if (aktuelleZeile >= MAX_VERSUCHE) {
    spielBeenden(false);
  } else {
    spielSpeichern(false, false);
    eingabeAnzeigen();
  }
}

// Führt etwas aus, sobald die gerade geratene Zeile fertig umgedreht ist. Die Uhr wird gemerkt,
// damit ein Sprachwechsel sie abbrechen kann, und nach dem Ablaufen wieder vergessen.
function afterReveal(action) {
  const timer = setTimeout(() => {
    revealTimers = revealTimers.filter((other) => other !== timer);
    action();
  }, REVEAL_DONE_MS);
  revealTimers.push(timer);
}

function spielBeenden(gewonnen) {
  // Der Stand wird sofort gespeichert, damit ein Neuladen während des Umdrehens nichts verliert.
  spielVorbei = true;
  teilenText = baueTeilenText(gewonnen);
  statistikAktualisieren(gewonnen);
  spielSpeichern(gewonnen, true);
  afterReveal(() => showGameEnd(gewonnen));
  // Erst öffnen, wenn die letzte Zeile fertig aufgedeckt ist.
  statsOpenTimer = setTimeout(openStats, STATS_OPEN_DELAY_MS);
}

// Wie im Original: Nach einem Sieg ein kurzes Lob, das von der Zahl der Versuche abhängt,
// nach einer Niederlage nur die Lösung. Wann das nächste Wort kommt, zeigt danach die Statistik.
function gameEndToast(gewonnen) {
  if (gewonnen) {
    return t("praise")[eingaben.length - 1];
  }
  return ZIEL;
}

// Einblendung und Knöpfe kommen erst nach dem Umdrehen, sonst stünde das Ergebnis vor den Farben fest.
function showGameEnd(gewonnen) {
  showToast(gameEndToast(gewonnen));
  if (tagesDatum !== heuteText()) {
    // altes Tagesspiel beendet -> heutiges Wort anbieten
    tagesFrageZeigen(t("oldFinished"), t("todayWordBtn"), function () { neuesTageswort(); }, null, null);
  }
}

// ------------------------------------------------------------
// Statistik
// ------------------------------------------------------------
// Getrennt je Sprache: Deutsch und Englisch sind zwei verschiedene Rätsel am selben Tag.
function statsKey() {
  return STAT_SCHLUESSEL + "-" + DAILY_KEY_PART + "-" + sprache;
}
function emptyStats() {
  return {
    gespielt: 0, gewonnen: 0, streak: 0, maxStreak: 0,
    distribution: [0, 0, 0, 0, 0, 0],   // Siege je Versuchsanzahl (Index 0 = im 1. Versuch)
    lastWinDate: null,                  // Datum des letzten gewonnenen Rätsels
  };
}
function statistikLaden() {
  const roh = localStorage.getItem(statsKey());
  if (roh !== null) {
    return JSON.parse(roh);
  }
  const stat = emptyStats();
  // Die alte Statistik mischte alle Modi und Sprachen und lässt sich nicht mehr aufteilen.
  // Sie zählt deshalb als deutsches Tagesrätsel, der alte Eintrag bleibt unverändert liegen.
  const old = localStorage.getItem(STAT_SCHLUESSEL);
  if (old !== null && sprache === "de") {
    const oldStat = JSON.parse(old);
    stat.gespielt = oldStat.gespielt;
    stat.gewonnen = oldStat.gewonnen;
    stat.streak = oldStat.streak;
    stat.maxStreak = oldStat.maxStreak;
    // "Gestern gewonnen", damit eine laufende Streak beim nächsten Sieg weiterzählt.
    stat.lastWinDate = yesterdayText();
  }
  return stat;
}
function statistikSpeichern(stat) {
  localStorage.setItem(statsKey(), JSON.stringify(stat));
}
function statistikAktualisieren(hatGewonnen) {
  const stat = statistikLaden();
  stat.gespielt = stat.gespielt + 1;
  if (hatGewonnen) {
    stat.gewonnen = stat.gewonnen + 1;
    stat.distribution[eingaben.length - 1] = stat.distribution[eingaben.length - 1] + 1;
    // Tage zählen: Die Streak läuft nur weiter, wenn das Rätsel vom Vortag gewonnen wurde.
    if (stat.lastWinDate !== null && dayNumber(tagesDatum) - dayNumber(stat.lastWinDate) === 1) {
      stat.streak = stat.streak + 1;
    } else {
      stat.streak = 1;
    }
    stat.lastWinDate = tagesDatum;
    if (stat.streak > stat.maxStreak) {
      stat.maxStreak = stat.streak;
    }
  } else {
    stat.streak = 0;
  }
  statistikSpeichern(stat);
}
// Gespeichert wird die Streak nur bei Spielende. Wurde seitdem ein Tag ausgelassen,
// ist sie schon gerissen und muss beim Anzeigen als 0 erscheinen.
function currentStreak(stat) {
  if (stat.lastWinDate === null) {
    return 0;
  }
  if (dayNumber(heuteText()) - dayNumber(stat.lastWinDate) > 1) {
    return 0;
  }
  return stat.streak;
}

function renderDistribution(stat) {
  const box = document.getElementById("distribution");
  box.innerHTML = "";
  const highest = Math.max(1, Math.max(...stat.distribution));
  // Den Balken des gerade gewonnenen Spiels hervorheben.
  let currentRow = -1;
  if (spielVorbei && eingaben[eingaben.length - 1] === ZIEL) {
    currentRow = eingaben.length - 1;
  }
  for (let i = 0; i < MAX_VERSUCHE; i++) {
    const row = document.createElement("div");
    row.className = "verteilung-zeile";
    const number = document.createElement("span");
    number.className = "verteilung-nummer";
    number.textContent = i + 1;
    const track = document.createElement("div");
    track.className = "verteilung-spur";
    const bar = document.createElement("div");
    bar.className = "verteilung-balken";
    bar.textContent = stat.distribution[i];
    bar.style.width = Math.round((stat.distribution[i] / highest) * 100) + "%";
    if (i === currentRow) {
      bar.classList.add("aktuell");
    }
    track.appendChild(bar);
    row.appendChild(number);
    row.appendChild(track);
    box.appendChild(row);
  }
}

function updateCountdown() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const seconds = Math.floor((midnight - now) / 1000);
  const parts = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60];
  const text = parts.map((n) => String(n).padStart(2, "0")).join(":");
  document.getElementById("next-word").textContent = t("nextWord") + " " + text;
}

function renderStats() {
  const stat = statistikLaden();
  let rate = 0;
  if (stat.gespielt > 0) {
    rate = Math.round((stat.gewonnen / stat.gespielt) * 100);
  }
  document.getElementById("stats-title").textContent = t("stats");
  // Die Statistik gilt je Sprache, darum steht sie unter dem Titel.
  document.getElementById("stats-mode").textContent = t("langName");
  // Nach einer Niederlage bleibt die Lösung hier nachlesbar, die Einblendung ist ja gleich wieder weg.
  const answer = document.getElementById("stats-answer");
  const lost = spielVorbei && eingaben[eingaben.length - 1] !== ZIEL;
  answer.hidden = !lost;
  answer.textContent = t("answer") + ZIEL;
  // Wie im Original begrüßt die Statistik nach dem Spiel: Glückwunsch bei Sieg, Dank sonst.
  // Öffnet man sie mitten im Spiel über den Knopf, bleibt die Zeile weg.
  const greeting = document.getElementById("stats-greeting");
  greeting.hidden = !spielVorbei;
  if (lost) {
    greeting.textContent = t("greetingLost");
  } else {
    greeting.textContent = t("greetingWon");
  }
  document.getElementById("stat-played").textContent = stat.gespielt;
  document.getElementById("label-played").textContent = t("played");
  document.getElementById("stat-win-rate").textContent = rate;
  document.getElementById("label-win-rate").textContent = t("winRate");
  document.getElementById("stat-streak").textContent = currentStreak(stat);
  document.getElementById("label-streak").textContent = t("streak");
  document.getElementById("stat-best").textContent = stat.maxStreak;
  document.getElementById("label-best").textContent = t("best");
  document.getElementById("distribution-title").textContent = t("guesses");
  renderDistribution(stat);

  // Teilen und Countdown ergeben erst Sinn, wenn das heutige Rätsel fertig ist.
  const action = document.getElementById("stats-action");
  const nextWord = document.getElementById("next-word");
  action.hidden = !spielVorbei;
  nextWord.hidden = !spielVorbei;
  action.textContent = t("share");
  action.onclick = ergebnisTeilen;
}

function openStats() {
  const dialog = document.getElementById("stats-dialog");
  if (dialog.open) {
    return;
  }
  // Fokus vorher lösen: Sonst käme er beim Schließen auf den Knopf zurück
  // und das nächste Enter würde den Dialog wieder öffnen, statt zu raten.
  document.activeElement.blur();
  renderStats();
  dialog.showModal();
  const action = document.getElementById("stats-action");
  if (!action.hidden) {
    action.focus();
  }
  if (spielVorbei) {
    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 1000);
  }
}
function closeStats() {
  const dialog = document.getElementById("stats-dialog");
  if (dialog.open) {
    dialog.close();
  }
}

// ------------------------------------------------------------
// Einstellungen und Anleitung
// ------------------------------------------------------------
function openSettings() {
  const dialog = document.getElementById("settings-dialog");
  if (dialog.open) {
    return;
  }
  document.activeElement.blur();
  document.getElementById("puzzle-number").textContent = t("puzzle") + puzzleNumber();
  dialog.showModal();
}
function closeSettings() {
  const dialog = document.getElementById("settings-dialog");
  if (dialog.open) {
    dialog.close();
  }
}

// Baut die Anleitung in der aktuellen Sprache. Alles über textContent, damit kein Text
// versehentlich als HTML gelesen wird.
function renderHelp() {
  document.getElementById("help-title").textContent = t("helpTitle");
  const box = document.getElementById("help-content");
  box.innerHTML = "";
  const intro = document.createElement("ul");
  for (const line of t("helpIntro")) {
    const item = document.createElement("li");
    item.textContent = line;
    intro.appendChild(item);
  }
  box.appendChild(intro);

  const examplesTitle = document.createElement("h3");
  examplesTitle.textContent = t("helpExamplesTitle");
  box.appendChild(examplesTitle);
  for (const example of t("helpExamples")) {
    // Kleine Felder wie im Spiel; nur der erklärte Buchstabe ist eingefärbt.
    const row = document.createElement("div");
    row.className = "beispiel-zeile";
    for (let i = 0; i < example.word.length; i++) {
      const cell = document.createElement("span");
      cell.className = "beispiel-feld";
      if (i === example.index) {
        cell.classList.add(example.color);
      }
      cell.textContent = example.word[i];
      row.appendChild(cell);
    }
    box.appendChild(row);
    const text = document.createElement("p");
    text.textContent = example.text;
    box.appendChild(text);
  }

  const outro = document.createElement("p");
  outro.className = "anleitung-schluss";
  outro.textContent = t("helpOutro");
  box.appendChild(outro);
}
function openHelp() {
  const dialog = document.getElementById("help-dialog");
  if (dialog.open) {
    return;
  }
  document.activeElement.blur();
  renderHelp();
  dialog.showModal();
  // Gesehen ist gesehen: Beim nächsten Öffnen der App geht die Anleitung nicht mehr von selbst auf.
  localStorage.setItem("woerdle-anleitung-gesehen", "1");
}
function closeHelp() {
  const dialog = document.getElementById("help-dialog");
  if (dialog.open) {
    dialog.close();
  }
}
// Wie im Original bekommt nur, wer zum ersten Mal da ist, die Anleitung von selbst gezeigt.
// Wer schon vor der Anleitung gespielt hat, hat Spielstand oder Statistik und kennt das Spiel.
function isFirstVisit() {
  if (localStorage.getItem("woerdle-anleitung-gesehen") !== null) {
    return false;
  }
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("woerdle-taeglich-") || key.startsWith("woerdle-statistik")) {
      return false;
    }
  }
  return true;
}

// ------------------------------------------------------------
// Teilen
// ------------------------------------------------------------
function datumFormatiert(roh) {
  const teile = roh.split("-");
  if (teile.length !== 3) {
    return roh;
  }
  let monat = teile[1];
  let tag = teile[2];
  if (monat.length < 2) { monat = "0" + monat; }
  if (tag.length < 2) { tag = "0" + tag; }
  // ohne Jahr, damit WhatsApp es nicht als Telefonnummer erkennt
  return tag + "." + monat + ".";
}
function baueTeilenText(gewonnen) {
  // Das Datum des Rätsels, nicht das von heute: Ein nachgeholtes Rätsel von gestern trägt gestern.
  const datum = datumFormatiert(tagesDatum);
  let kopf;
  if (gewonnen) {
    kopf = t("shareTitle") + " " + datum + "\n" + t("flagEmoji") + " " + verlauf.length + "/6";
  } else {
    kopf = t("shareTitle") + " " + datum + "\n" + t("flagEmoji") + " X/6";
  }
  const zeilen = [];
  for (const reihe of verlauf) {
    let z = "";
    for (const farbe of reihe) {
      if (farbe === "gruen") {
        z += "🟩";
      } else if (farbe === "gelb") {
        z += "🟨";
      } else {
        z += "⬜";
      }
    }
    zeilen.push(z);
  }
  return kopf + "\n" + zeilen.join("\n");
}
// Rückmeldung am Knopf selbst, denn die Meldungszeile liegt hinter dem Dialog.
function showShareFeedback(text) {
  const action = document.getElementById("stats-action");
  action.textContent = text;
  setTimeout(() => { action.textContent = t("share"); }, 2000);
}
function ergebnisTeilen() {
  // Ohne HTTPS gibt es die Zwischenablage gar nicht, und der Browser kann den Zugriff auch verweigern.
  // Beides muss sichtbar werden, sonst sieht es so aus, als wäre der Knopf kaputt.
  if (navigator.clipboard === undefined) {
    showShareFeedback(t("copyFailed"));
    return;
  }
  navigator.clipboard.writeText(teilenText)
    .then(() => showShareFeedback(t("copied")))
    .catch(() => showShareFeedback(t("copyFailed")));
}

// ------------------------------------------------------------
// Sprache
// ------------------------------------------------------------
function ladeSprache() {
  const s = localStorage.getItem("woerdle-sprache");
  if (s === null) {
    return "de";
  }
  return s;
}
function spracheUmschalten() {
  if (sprache === "de") {
    sprache = "en";
  } else {
    sprache = "de";
  }
  localStorage.setItem("woerdle-sprache", sprache);
  tastaturAufbauen();
  uiTexteSetzen();
  spielStarten();
}
// Bis v2.11 gab es einen Endlos-Modus. Seine Daten braucht niemand mehr; sie werden einmal
// weggeräumt, damit nichts Veraltetes auf den Geräten liegen bleibt. Danach findet die Funktion
// nichts mehr und tut nichts.
function removeEndlessData() {
  const oldKeys = [
    "woerdle-modus",
    "woerdle-endlos-de", "woerdle-endlos-en",
    "woerdle-verwendet-de", "woerdle-verwendet-en",
    "woerdle-statistik-endlos-de", "woerdle-statistik-endlos-en",
  ];
  for (const key of oldKeys) {
    localStorage.removeItem(key);
  }
}
function uiTexteSetzen() {
  // Vorlesehilfen und die Silbentrennung richten sich nach dieser Angabe.
  document.documentElement.lang = sprache;
  document.getElementById("sprache").setAttribute("aria-label", t("switchLanguage"));
  document.getElementById("stats-close").setAttribute("aria-label", t("close"));
  document.getElementById("stats-button").setAttribute("aria-label", t("stats"));
  document.getElementById("settings-button").setAttribute("aria-label", t("settings"));
  document.getElementById("settings-close").setAttribute("aria-label", t("close"));
  document.getElementById("settings-title").textContent = t("settings");
  document.getElementById("settings-report").textContent = t("reportBug");
  document.getElementById("help-button").setAttribute("aria-label", t("help"));
  document.getElementById("help-close").setAttribute("aria-label", t("close"));
  let flagge;
  if (sprache === "de") {
    flagge = "icons/flag-de.svg";
  } else {
    flagge = "icons/flag-gb.svg";
  }
  document.getElementById("sprache-flagge").src = flagge;
}

// ------------------------------------------------------------
// Datum + Wort des Tages
// ------------------------------------------------------------
function heuteText() {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
// Tage seit dem 1. Januar 2026, dem ersten Tag der Wortliste.
function daysSinceStart() {
  const jetzt = new Date();
  // Über Date.UTC zählen, weil lokale Zeiten bei der Sommerzeit eine Stunde
  // verrutschen: Das neue Wort kam sonst im Sommer erst um 1 Uhr, und zwischen
  // 0 und 1 Uhr gab es am neuen Tag noch einmal das Wort von gestern.
  const start = Date.UTC(2026, 0, 1);
  const heute = Date.UTC(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate());
  const einTag = 1000 * 60 * 60 * 24;
  return Math.floor((heute - start) / einTag);
}
// Fortlaufende Nummer des heutigen Rätsels (1. Januar 2026 = Nr. 1), wie im Original im Menü.
function puzzleNumber() {
  return daysSinceStart() + 1;
}
function wortDesTages() {
  const liste = zielListe();
  let index = daysSinceStart() % liste.length;
  if (index < 0) {
    index = index + liste.length;
  }
  return liste[index];
}
function yesterdayText() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
// Macht aus "2026-11-5" eine fortlaufende Tageszahl, damit sich Tage einfach vergleichen lassen.
function dayNumber(dateText) {
  const parts = dateText.split("-");
  const msPerDay = 1000 * 60 * 60 * 24;
  return Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) / msPerDay;
}
// ------------------------------------------------------------
// Spielstand speichern / laden / wiederherstellen
// ------------------------------------------------------------
function spielSchluessel() {
  return "woerdle-" + DAILY_KEY_PART + "-" + sprache;
}
function spielSpeichern(gewonnen, beendet) {
  const state = {
    ziel: ZIEL,
    eingaben: eingaben,
    verlauf: verlauf,
    gewonnen: gewonnen,
    beendet: beendet,
    datum: tagesDatum,
  };
  localStorage.setItem(spielSchluessel(), JSON.stringify(state));
}
function ladeSpielstand() {
  const roh = localStorage.getItem(spielSchluessel());
  if (roh === null) {
    return null;
  }
  return JSON.parse(roh);
}
function spielstandWiederherstellen(state) {
  for (let i = 0; i < state.eingaben.length; i++) {
    const wort = state.eingaben[i];
    const farben = state.verlauf[i];
    for (let j = 0; j < WORTLAENGE; j++) {
      const feld = felder[i][j];
      feld.textContent = wort[j];
      feld.classList.remove("aktiv-feld", "gefuellt");
      feld.classList.add(farben[j]);
    }
    for (let j = 0; j < WORTLAENGE; j++) {
      tasteEinfaerben(wort[j], farben[j]);
    }
    verlauf.push(farben);
    eingaben.push(wort);
  }
  aktuelleZeile = state.eingaben.length;
  zeileBuchstaben = emptyRow();
  aktivesFeld = 0;

  // Ein fertiges Spiel zeigt nur das Raster; Ergebnis und Countdown stehen in der Statistik.
  if (state.beendet) {
    spielVorbei = true;
    teilenText = baueTeilenText(state.gewonnen);
  } else {
    eingabeAnzeigen();
  }
}

// ------------------------------------------------------------
// Brett zurücksetzen + Spiel starten
// ------------------------------------------------------------
function boardZuruecksetzen() {
  aktuelleZeile = 0;
  zeileBuchstaben = emptyRow();
  aktivesFeld = 0;
  spielVorbei = false;
  verlauf = [];
  eingaben = [];

  // Beim Wechsel der Sprache darf der Dialog des alten Spiels nicht mehr aufgehen.
  clearTimeout(statsOpenTimer);
  closeStats();
  // Dasselbe gilt für alles, was noch aufs Umdrehen wartet: Es würde das neue Spiel einfärben.
  for (const timer of revealTimers) {
    clearTimeout(timer);
  }
  revealTimers = [];

  hideToast();
  document.getElementById("tages-frage").hidden = true;

  for (let zeile = 0; zeile < MAX_VERSUCHE; zeile++) {
    for (let spalte = 0; spalte < WORTLAENGE; spalte++) {
      const feld = felder[zeile][spalte];
      feld.textContent = "";
      feld.classList.remove("gruen", "gelb", "grau", "gefuellt", "aufgedeckt", "aktiv-feld");
      feld.style.animationDelay = "";
    }
  }
  const tasten = document.querySelectorAll(".taste");
  for (const tk of tasten) {
    tk.classList.remove("gruen", "gelb", "grau");
  }

  eingabeAnzeigen();
}

function spielStarten() {
  shownDay = heuteText();
  boardZuruecksetzen();
  const g = ladeSpielstand();
  const heute = heuteText();
  const entschieden = localStorage.getItem("woerdle-tagesentscheidung-" + sprache) === heute;

  // Vier Fälle: heutiges Spiel fortsetzen; altes unfertiges Spiel und noch nicht gefragt;
  // altes unfertiges Spiel und schon fürs Weiterspielen entschieden; sonst das heutige Wort.
  if (g !== null && g.datum === heute) {
    ZIEL = g.ziel;
    tagesDatum = heute;
    spielstandWiederherstellen(g);
  } else if (g !== null && g.beendet === false && !entschieden) {
    // altes, unfertiges Tagesspiel + neues Wort verfügbar -> fragen
    ZIEL = g.ziel;
    tagesDatum = g.datum;
    spielstandWiederherstellen(g);
    tagesFrageZeigen(
      t("newDaily"),
      t("continueBtn"),
      function () { tagesEntscheidungMerken(); tagesFrageAltweiter(); },
      t("newWordBtn"),
      function () { tagesEntscheidungMerken(); neuesTageswort(); }
    );
  } else if (g !== null && g.beendet === false && entschieden) {
    // hat sich fürs Weiterspielen entschieden -> altes Spiel fortsetzen
    ZIEL = g.ziel;
    tagesDatum = g.datum;
    spielstandWiederherstellen(g);
    tagesFrageAltweiter();
  } else {
    // kein oder bereits beendetes Tagesspiel -> heutiges Wort
    ZIEL = wortDesTages();
    tagesDatum = heute;
  }
}

// Eine App kann über Nacht offen bleiben, auf dem Handy auch im Hintergrund. Ohne diese Prüfung
// zeigt sie dann bis zum nächsten Neuladen weiter das Rätsel von gestern.
function checkForNewDay() {
  const today = heuteText();
  if (today === shownDay) {
    return;
  }
  // Ein offenes Fenster nicht wegziehen, beim Schließen wird erneut geprüft.
  if (anyDialogOpen()) {
    return;
  }
  shownDay = today;
  spielStarten();
}

// --- Tagesrätsel-Frage: altes weiterspielen vs. neues Wort ---
// Die Antwort gilt für den ganzen Tag, damit die Frage nicht bei jedem Öffnen wiederkommt.
function tagesEntscheidungMerken() {
  localStorage.setItem("woerdle-tagesentscheidung-" + sprache, heuteText());
}
function neuesTageswort() {
  tagesFrageWeg();
  boardZuruecksetzen();
  ZIEL = wortDesTages();
  tagesDatum = heuteText();
  // Das heutige (noch leere) Spiel gleich sichern: Es ersetzt das alte, sonst käme die Frage
  // nach dem Neuladen wieder.
  spielSpeichern(false, false);
}
// Kleiner Knopf, um beim Weiterspielen jederzeit zum heutigen Wort zu wechseln.
function tagesFrageAltweiter() {
  tagesFrageZeigen(null, t("todayWordBtn"), function () { neuesTageswort(); }, null, null);
}
function tagesFrageZeigen(text, label1, aktion1, label2, aktion2) {
  const box = document.getElementById("tages-frage");
  const txt = document.getElementById("tages-frage-text");
  const b1 = document.getElementById("btn-tag-1");
  const b2 = document.getElementById("btn-tag-2");
  if (text === null) {
    txt.hidden = true;
  } else {
    txt.hidden = false;
    txt.textContent = text;
  }
  b1.textContent = label1;
  b1.onclick = aktion1;
  if (label2 === null) {
    b2.hidden = true;
  } else {
    b2.hidden = false;
    b2.textContent = label2;
    b2.onclick = aktion2;
  }
  box.hidden = false;
}
function tagesFrageWeg() {
  document.getElementById("tages-frage").hidden = true;
}

// ------------------------------------------------------------
// Start
// ------------------------------------------------------------
removeEndlessData();
rasterAufbauen();
tastaturAufbauen();
document.addEventListener("keydown", tastendruck);
document.getElementById("stats-button").addEventListener("click", openStats);
document.getElementById("stats-close").addEventListener("click", closeStats);
const statsDialog = document.getElementById("stats-dialog");
// Ein Klick neben den Dialog trifft das dialog-Element selbst und schließt ihn.
statsDialog.addEventListener("click", (event) => {
  if (event.target === statsDialog) {
    closeStats();
  }
});
// Läuft bei jedem Schließen, auch per Esc-Taste.
statsDialog.addEventListener("close", () => {
  clearInterval(countdownTimer);
  checkForNewDay();
});
// Einstellungen (rechts oben) und Anleitung (links oben): schließen mit ×, Esc oder einem Klick daneben.
const settingsDialog = document.getElementById("settings-dialog");
document.getElementById("settings-button").addEventListener("click", openSettings);
document.getElementById("settings-close").addEventListener("click", closeSettings);
settingsDialog.addEventListener("click", (event) => {
  if (event.target === settingsDialog) {
    closeSettings();
  }
});
settingsDialog.addEventListener("close", checkForNewDay);
// „Fehler melden“ öffnet fehler.js selbst (es lauscht auf data-fehler-melden); die Einstellungen gehen
// dabei zu, damit nach dem Melden wieder das Spiel zu sehen ist.
document.getElementById("settings-report").addEventListener("click", closeSettings);
const helpDialog = document.getElementById("help-dialog");
document.getElementById("help-button").addEventListener("click", openHelp);
document.getElementById("help-close").addEventListener("click", closeHelp);
helpDialog.addEventListener("click", (event) => {
  if (event.target === helpDialog) {
    closeHelp();
  }
});
helpDialog.addEventListener("close", checkForNewDay);
// Maus-Klicks hinterlassen sonst den Fokus auf dem Knopf, und Enter würde ihn erneut auslösen.
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button !== null && !anyDialogOpen()) {
    button.blur();
  }
});
document.getElementById("sprache").addEventListener("click", spracheUmschalten);
// Zurück in die App (Tab-Wechsel, Handy entsperrt) oder lange offen auf dem Schirm: neuer Tag?
document.addEventListener("visibilitychange", checkForNewDay);
window.addEventListener("focus", checkForNewDay);
window.addEventListener("pageshow", checkForNewDay);
setInterval(checkForNewDay, NEW_DAY_CHECK_MS);
// Muss vor spielStarten stehen: Danach liegt schon ein Spielstand im Speicher.
const firstVisit = isFirstVisit();
uiTexteSetzen();
spielStarten();
// Wie im Original: Neue Spieler sehen zuerst die Anleitung. Wer das heutige Rätsel schon gelöst
// hat und wiederkommt, sieht gleich die Statistik.
if (firstVisit) {
  openHelp();
} else if (spielVorbei && tagesDatum === heuteText()) {
  openStats();
}
document.getElementById("pwa-status").textContent = "Wortsuchspiel v" + APP_VERSION;

// ------------------------------------------------------------
// PWA
// ------------------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => {
        // Das Häkchen zeigt: Der Offline-Speicher ist eingerichtet, das Spiel geht auch ohne Netz.
        document.getElementById("pwa-status").textContent = "Wortsuchspiel v" + APP_VERSION + " ✓";
      })
      .catch((err) => console.error("Service Worker Fehler:", err));
  });
}
