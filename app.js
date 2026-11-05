// ============================================================
// Woerdle - app.js
// Features: Tages- & Endlos-Modus (beide werden gespeichert),
// Lostrommel, anklickbare Felder, Statistik, Teilen,
// Deutsch/Englisch umschaltbar.
// ============================================================

const WORTLAENGE = 5;
const MAX_VERSUCHE = 6;
const STAT_SCHLUESSEL = "woerdle-statistik";
const STATS_OPEN_DELAY_MS = 1600;
const NEW_DAY_CHECK_MS = 60000;
const APP_VERSION = "2.9";   // bei jedem Release hochzaehlen

// --- Texte je Sprache ---
const TEXTE = {
  de: {
    daily: "Tägliches Wort", endless: "Endlos",
    fill5: "Bitte alle 5 Felder ausfüllen.",
    notinlist: "Dieses Wort ist nicht in der Liste.",
    won: "Gewonnen! 🎉", lost: "Verloren. Lösung: ",
    comeback: " (Komm morgen wieder!)", copied: "Ergebnis kopiert! 📋", copyFailed: "Kopieren nicht möglich",
    share: "Ergebnis kopieren", again: "Nochmal spielen",
    played: "Gespielt", winRate: "Siege %", streak: "Streak", best: "Beste",
    stats: "Statistik", guesses: "Versuche", nextWord: "Nächstes Wort in", langName: "Deutsch",
    shareTitle: "Wördle", langBtn: "EN",
    newDaily: "Neues Tagesrätsel verfügbar!",
    continueBtn: "Weiterspielen", newWordBtn: "Neues Wort",
    todayWordBtn: "Heutiges Wort", oldFinished: "Altes Spiel beendet.",
    flagEmoji: "🇩🇪",
  },
  en: {
    daily: "Daily word", endless: "Endless",
    fill5: "Please fill all 5 boxes.",
    notinlist: "This word is not in the list.",
    won: "You won! 🎉", lost: "You lost. Answer: ",
    comeback: " (Come back tomorrow!)", copied: "Result copied! 📋", copyFailed: "Could not copy",
    share: "Copy result", again: "Play again",
    played: "Played", winRate: "Win %", streak: "Streak", best: "Best",
    stats: "Statistics", guesses: "Guesses", nextWord: "Next word in", langName: "English",
    shareTitle: "Wordle", langBtn: "DE",
    newDaily: "New daily puzzle available!",
    continueBtn: "Continue", newWordBtn: "New word",
    todayWordBtn: "Today's word", oldFinished: "Old game finished.",
    flagEmoji: "🇬🇧",
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
let modus = ladeModus();       // laufendes Endlos-Spiel? sonst Tagesmodus
let ZIEL = "";
let aktuelleZeile = 0;
let zeileBuchstaben = ["", "", "", "", ""];
let aktivesFeld = 0;
let spielVorbei = false;
let verlauf = [];
let eingaben = [];
let teilenText = "";
let tagesDatum = "";           // Datum, zu dem das aktuelle Tagesspiel gehoert
let statsOpenTimer = null;     // verzögertes Öffnen des Dialogs nach Spielende
let countdownTimer = null;     // zählt im Dialog bis zum nächsten Tageswort herunter
let shownDay = "";             // Tag, an dem das Spiel zuletzt gestartet wurde
const felder = [];

// --- kleine Helfer ---
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
      feld.addEventListener("click", () => {
        if (spielVorbei) return;
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

function naechstesLeeresFeld() {
  for (let i = aktivesFeld + 1; i < WORTLAENGE; i++) {
    if (zeileBuchstaben[i] === "") return i;
  }
  for (let i = 0; i < WORTLAENGE; i++) {
    if (zeileBuchstaben[i] === "") return i;
  }
  return aktivesFeld;
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
  // Bei offenem Dialog darf nichts ins Spielfeld getippt werden.
  const dialog = document.getElementById("stats-dialog");
  if (dialog.open) {
    return;
  }
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
  if (spielVorbei) {
    // Im Endlos-Modus reicht Enter für die nächste Runde, die Hand bleibt auf der Tastatur.
    if (taste === "Enter" && modus === "endlos") {
      neuesEndlosSpiel();
    }
    return;
  }

  if (taste === "Enter") {
    const wort = zeileBuchstaben.join("");
    if (wort.length < WORTLAENGE) {
      document.getElementById("meldung").textContent = t("fill5");
      shakeRow();
    } else if (!erlaubtListe().includes(wort)) {
      document.getElementById("meldung").textContent = t("notinlist");
      shakeRow();
    } else {
      document.getElementById("meldung").textContent = "";
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
    document.getElementById("meldung").textContent = "";
    eingabeAnzeigen();
    return;
  }

  if (/^[a-zA-ZäöüÄÖÜ]$/.test(taste)) {
    zeileBuchstaben[aktivesFeld] = taste.toUpperCase();
    // nach dem Tippen automatisch ein Feld weiter (bis zum letzten)
    if (aktivesFeld < WORTLAENGE - 1) {
      aktivesFeld = aktivesFeld + 1;
    }
    document.getElementById("meldung").textContent = "";
    eingabeAnzeigen();
  }
}

// ------------------------------------------------------------
// Auswertung
// ------------------------------------------------------------
function zeileAuswerten() {
  const wort = zeileBuchstaben.join("");

  const rest = {};
  for (let i = 0; i < WORTLAENGE; i++) {
    const b = ZIEL[i];
    if (rest[b] === undefined) {
      rest[b] = 0;
    }
    rest[b] = rest[b] + 1;
  }

  const ergebnis = new Array(WORTLAENGE);
  for (let i = 0; i < WORTLAENGE; i++) {
    if (wort[i] === ZIEL[i]) {
      ergebnis[i] = "gruen";
      rest[wort[i]] = rest[wort[i]] - 1;
    }
  }
  for (let i = 0; i < WORTLAENGE; i++) {
    if (ergebnis[i] === undefined) {
      const b = wort[i];
      if (rest[b] > 0) {
        ergebnis[i] = "gelb";
        rest[b] = rest[b] - 1;
      } else {
        ergebnis[i] = "grau";
      }
    }
  }

  for (let i = 0; i < WORTLAENGE; i++) {
    const feld = felder[aktuelleZeile][i];
    feld.classList.remove("gefuellt", "aktiv-feld");
    feld.classList.add(ergebnis[i]);
    feld.style.animationDelay = (i * 0.2) + "s";
    feld.classList.add("aufgedeckt");
  }
  for (let i = 0; i < WORTLAENGE; i++) {
    tasteEinfaerben(wort[i], ergebnis[i]);
  }

  verlauf.push(ergebnis.slice());
  eingaben.push(wort);

  const gewonnen = wort === ZIEL;
  aktuelleZeile++;
  zeileBuchstaben = ["", "", "", "", ""];
  aktivesFeld = 0;

  if (gewonnen) {
    document.getElementById("meldung").textContent = t("won");
    spielBeenden(true);
  } else if (aktuelleZeile >= MAX_VERSUCHE) {
    document.getElementById("meldung").textContent = t("lost") + ZIEL;
    spielBeenden(false);
  } else {
    spielSpeichern(false, false);
    eingabeAnzeigen();
  }
}

function spielBeenden(gewonnen) {
  spielVorbei = true;
  teilenText = baueTeilenText(gewonnen);
  statistikAktualisieren(gewonnen);
  spielSpeichern(gewonnen, true);
  if (modus === "taeglich") {
    document.getElementById("neustart").hidden = true;
    if (tagesDatum !== heuteText()) {
      // altes Tagesspiel beendet -> heutiges Wort anbieten
      tagesFrageZeigen(t("oldFinished"), t("todayWordBtn"), function () { neuesTageswort(); }, null, null);
    }
  } else {
    document.getElementById("neustart").hidden = false;
  }
  // Erst öffnen, wenn die letzte Zeile fertig aufgedeckt ist (5 Felder, zusammen ca. 1,3 s).
  statsOpenTimer = setTimeout(openStats, STATS_OPEN_DELAY_MS);
}

// ------------------------------------------------------------
// Statistik
// ------------------------------------------------------------
// Getrennt je Modus und Sprache, denn eine Streak aus Tagen und eine aus
// Endlos-Runden lassen sich nicht sinnvoll zusammenzählen.
function statsKey() {
  return STAT_SCHLUESSEL + "-" + modus + "-" + sprache;
}
function emptyStats() {
  return {
    gespielt: 0, gewonnen: 0, streak: 0, maxStreak: 0,
    distribution: [0, 0, 0, 0, 0, 0],   // Siege je Versuchsanzahl (Index 0 = im 1. Versuch)
    lastWinDate: null,                  // nur Tagesmodus: Datum des letzten gewonnenen Rätsels
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
  if (old !== null && modus === "taeglich" && sprache === "de") {
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
    if (modus === "taeglich") {
      // Tage zählen: Die Streak läuft nur weiter, wenn das Rätsel vom Vortag gewonnen wurde.
      if (stat.lastWinDate !== null && dayNumber(tagesDatum) - dayNumber(stat.lastWinDate) === 1) {
        stat.streak = stat.streak + 1;
      } else {
        stat.streak = 1;
      }
      stat.lastWinDate = tagesDatum;
    } else {
      stat.streak = stat.streak + 1;
    }
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
  if (modus !== "taeglich") {
    return stat.streak;
  }
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
  let modeName;
  if (modus === "taeglich") {
    modeName = t("daily");
  } else {
    modeName = t("endless");
  }
  document.getElementById("stats-mode").textContent = modeName + " · " + t("langName");
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

  // Der große Knopf zeigt, was nach Spielende als Nächstes sinnvoll ist.
  const action = document.getElementById("stats-action");
  const nextWord = document.getElementById("next-word");
  action.hidden = !spielVorbei;
  nextWord.hidden = !(spielVorbei && modus === "taeglich");
  if (modus === "taeglich") {
    action.textContent = t("share");
    action.onclick = ergebnisTeilen;
  } else {
    action.textContent = t("again");
    action.onclick = neuesEndlosSpiel;
  }
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
  if (spielVorbei && modus === "taeglich") {
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
  let datumRoh;
  if (modus === "taeglich") {
    datumRoh = tagesDatum;
  } else {
    datumRoh = heuteText();
  }
  const datum = datumFormatiert(datumRoh);
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
function uiTexteSetzen() {
  document.getElementById("modus-taeglich").textContent = t("daily");
  document.getElementById("modus-endlos").textContent = t("endless");
  document.getElementById("neustart").textContent = t("again");
  document.getElementById("stats-button").setAttribute("aria-label", t("stats"));
  let flagge;
  if (sprache === "de") {
    flagge = "icons/flag-de.svg";
  } else {
    flagge = "icons/flag-gb.svg";
  }
  document.getElementById("sprache-flagge").src = flagge;
}

// ------------------------------------------------------------
// Modus-Anzeige
// ------------------------------------------------------------
function ladeModus() {
  // zuletzt gewaehlten Tab wiederherstellen (Standard: Tagesmodus)
  const m = localStorage.getItem("woerdle-modus");
  if (m === null) {
    return "taeglich";
  }
  return m;
}
function modusSetzen(neu) {
  modus = neu;
  localStorage.setItem("woerdle-modus", neu);
  modusAnzeigen();
  spielStarten();
}
function modusAnzeigen() {
  const bt = document.getElementById("modus-taeglich");
  const be = document.getElementById("modus-endlos");
  bt.classList.remove("aktiv");
  be.classList.remove("aktiv");
  if (modus === "taeglich") {
    bt.classList.add("aktiv");
  } else {
    be.classList.add("aktiv");
  }
}

// ------------------------------------------------------------
// Datum + Wort des Tages + Lostrommel
// ------------------------------------------------------------
function heuteText() {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
function wortDesTages() {
  const liste = zielListe();
  const jetzt = new Date();
  // Über Date.UTC zählen, weil lokale Zeiten bei der Sommerzeit eine Stunde
  // verrutschen: Das neue Wort kam sonst im Sommer erst um 1 Uhr, und zwischen
  // 0 und 1 Uhr gab es am neuen Tag noch einmal das Wort von gestern.
  const start = Date.UTC(2026, 0, 1);
  const heute = Date.UTC(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate());
  const einTag = 1000 * 60 * 60 * 24;
  const tage = Math.floor((heute - start) / einTag);
  let index = tage % liste.length;
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
function verwendetSchluessel() {
  return "woerdle-verwendet-" + sprache;
}
function ladeVerwendet() {
  const roh = localStorage.getItem(verwendetSchluessel());
  if (roh === null) {
    return [];
  }
  return JSON.parse(roh);
}
function speichereVerwendet(liste) {
  localStorage.setItem(verwendetSchluessel(), JSON.stringify(liste));
}
function naechstesZielwort() {
  const liste = zielListe();
  // Das heutige Tageswort auslassen, damit es nicht am selben Tag auch im Endlos-Modus kommt.
  const todaysWord = wortDesTages();
  let verwendet = ladeVerwendet();
  let uebrig = liste.filter((w) => !verwendet.includes(w) && w !== todaysWord);
  if (uebrig.length === 0) {
    // Alle Wörter waren dran, neue Runde. Das zuletzt gespielte Wort auslassen,
    // sonst könnte es am Rundenwechsel direkt zweimal hintereinander kommen.
    const lastWord = verwendet[verwendet.length - 1];
    verwendet = [];
    uebrig = liste.filter((w) => w !== lastWord && w !== todaysWord);
  }
  const wort = uebrig[Math.floor(Math.random() * uebrig.length)];
  verwendet.push(wort);
  speichereVerwendet(verwendet);
  return wort;
}

// ------------------------------------------------------------
// Spielstand speichern / laden / wiederherstellen (beide Modi)
// ------------------------------------------------------------
function spielSchluessel() {
  return "woerdle-" + modus + "-" + sprache;
}
function spielSpeichern(gewonnen, beendet) {
  const state = {
    ziel: ZIEL,
    eingaben: eingaben,
    verlauf: verlauf,
    gewonnen: gewonnen,
    beendet: beendet,
  };
  if (modus === "taeglich") {
    state.datum = tagesDatum;
  }
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
  zeileBuchstaben = ["", "", "", "", ""];
  aktivesFeld = 0;

  if (state.beendet) {
    spielVorbei = true;
    teilenText = baueTeilenText(state.gewonnen);
    let zusatz = "";
    if (modus === "taeglich") {
      document.getElementById("neustart").hidden = true;
      zusatz = t("comeback");
    } else {
      document.getElementById("neustart").hidden = false;
    }
    if (state.gewonnen) {
      document.getElementById("meldung").textContent = t("won") + zusatz;
    } else {
      document.getElementById("meldung").textContent = t("lost") + ZIEL + zusatz;
    }
  } else {
    eingabeAnzeigen();
  }
}

// ------------------------------------------------------------
// Brett zuruecksetzen + Spiel starten
// ------------------------------------------------------------
function boardZuruecksetzen() {
  aktuelleZeile = 0;
  zeileBuchstaben = ["", "", "", "", ""];
  aktivesFeld = 0;
  spielVorbei = false;
  verlauf = [];
  eingaben = [];

  // Beim Wechsel von Modus oder Sprache darf der Dialog des alten Spiels nicht mehr aufgehen.
  clearTimeout(statsOpenTimer);
  closeStats();

  document.getElementById("meldung").textContent = "";
  document.getElementById("neustart").hidden = true;
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

  if (modus === "taeglich") {
    const heute = heuteText();
    const entschieden = localStorage.getItem("woerdle-tagesentscheidung-" + sprache) === heute;
    if (g !== null && g.datum === heute) {
      ZIEL = g.ziel;
      tagesDatum = heute;
      spielstandWiederherstellen(g);
    } else if (g !== null && g.beendet === false && !entschieden) {
      // altes, unfertiges Tagesspiel + neues Wort verfuegbar -> fragen
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
      // hat sich fuers Weiterspielen entschieden -> altes Spiel fortsetzen
      ZIEL = g.ziel;
      tagesDatum = g.datum;
      spielstandWiederherstellen(g);
      tagesFrageAltweiter();
    } else {
      // kein oder bereits beendetes Tagesspiel -> heutiges Wort
      ZIEL = wortDesTages();
      tagesDatum = heute;
    }
  } else {
    if (g !== null) {
      ZIEL = g.ziel;
      spielstandWiederherstellen(g);
    } else {
      startNextEndlessWord();
    }
  }
}

// Das neue Wort sofort speichern, auch ohne Rateversuch. Sonst würde jedes Neuladen und jeder
// Wechsel von Modus oder Sprache ein weiteres Wort ziehen und das alte ungespielt als "dran gewesen" zählen.
function startNextEndlessWord() {
  ZIEL = naechstesZielwort();
  spielSpeichern(false, false);
}

// Eine App kann über Nacht offen bleiben, auf dem Handy auch im Hintergrund. Ohne diese Prüfung
// zeigt sie dann bis zum nächsten Neuladen weiter das Rätsel von gestern.
function checkForNewDay() {
  const today = heuteText();
  if (today === shownDay) {
    return;
  }
  // Einen offenen Dialog nicht wegziehen, beim Schließen wird erneut geprüft.
  if (document.getElementById("stats-dialog").open) {
    return;
  }
  shownDay = today;
  // Das Endlos-Spiel hängt nicht am Datum und läuft einfach weiter.
  if (modus === "taeglich") {
    spielStarten();
  }
}

// "Weiterspielen" im Endlos-Modus: alten Stand verwerfen, neues Wort
function neuesEndlosSpiel() {
  localStorage.removeItem(spielSchluessel());
  boardZuruecksetzen();
  startNextEndlessWord();
}

// --- Tagesrätsel-Frage: altes weiterspielen vs. neues Wort ---
function tagesEntscheidungMerken() {
  localStorage.setItem("woerdle-tagesentscheidung-" + sprache, heuteText());
}
function neuesTageswort() {
  tagesFrageWeg();
  boardZuruecksetzen();
  ZIEL = wortDesTages();
  tagesDatum = heuteText();
  spielSpeichern(false, false); // heutiges (leeres) Tagesspiel sichern, ersetzt das alte
}
// kleiner Knopf, um beim Weiterspielen jederzeit zum heutigen Wort zu wechseln
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
rasterAufbauen();
tastaturAufbauen();
document.addEventListener("keydown", tastendruck);
document.getElementById("neustart").addEventListener("click", neuesEndlosSpiel);
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
// Maus-Klicks hinterlassen sonst den Fokus auf dem Knopf, und Enter würde ihn erneut auslösen.
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button !== null && !statsDialog.open) {
    button.blur();
  }
});
document.getElementById("modus-taeglich").addEventListener("click", () => modusSetzen("taeglich"));
document.getElementById("modus-endlos").addEventListener("click", () => modusSetzen("endlos"));
document.getElementById("sprache").addEventListener("click", spracheUmschalten);
// Zurück in die App (Tab-Wechsel, Handy entsperrt) oder lange offen auf dem Schirm: neuer Tag?
document.addEventListener("visibilitychange", checkForNewDay);
window.addEventListener("focus", checkForNewDay);
window.addEventListener("pageshow", checkForNewDay);
setInterval(checkForNewDay, NEW_DAY_CHECK_MS);
uiTexteSetzen();
modusAnzeigen();
spielStarten();
document.getElementById("pwa-status").textContent = "v" + APP_VERSION;

// ------------------------------------------------------------
// PWA
// ------------------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => {
        const el = document.getElementById("pwa-status");
        if (el) el.textContent = "v" + APP_VERSION + " ✓";
      })
      .catch((err) => console.error("Service Worker Fehler:", err));
  });
}
