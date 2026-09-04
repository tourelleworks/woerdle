// ============================================================
// Woerdle - app.js
// Features: Tages- & Endlos-Modus (beide werden gespeichert),
// Lostrommel, anklickbare Felder, Statistik, Teilen,
// Deutsch/Englisch umschaltbar.
// ============================================================

const WORTLAENGE = 5;
const MAX_VERSUCHE = 6;
const STAT_SCHLUESSEL = "woerdle-statistik";
const APP_VERSION = "2.4";   // bei jedem Release hochzaehlen

// --- Texte je Sprache ---
const TEXTE = {
  de: {
    daily: "Tägliches Wort", endless: "Endlos",
    fill5: "Bitte alle 5 Felder ausfüllen.",
    notinlist: "Dieses Wort ist nicht in der Liste.",
    won: "Gewonnen! 🎉", lost: "Verloren. Lösung: ",
    comeback: " (Komm morgen wieder!)", copied: "Ergebnis kopiert! 📋",
    share: "Ergebnis kopieren", again: "Nochmal spielen",
    played: "Gespielt", wins: "Siege", streak: "Streak", best: "Beste",
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
    comeback: " (Come back tomorrow!)", copied: "Result copied! 📋",
    share: "Copy result", again: "Play again",
    played: "Played", wins: "Wins", streak: "Streak", best: "Best",
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
        knopf.textContent = "⏎";
        knopf.classList.add("taste-breit");
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
  verarbeiteTaste(event.key);
}

function verarbeiteTaste(taste) {
  if (spielVorbei) return;

  if (taste === "Enter") {
    const wort = zeileBuchstaben.join("");
    if (wort.length < WORTLAENGE) {
      document.getElementById("meldung").textContent = t("fill5");
    } else if (!erlaubtListe().includes(wort)) {
      document.getElementById("meldung").textContent = t("notinlist");
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
  const stat = statistikAktualisieren(gewonnen);
  statistikAnzeigen(stat);
  spielSpeichern(gewonnen, true);
  if (modus === "taeglich") {
    document.getElementById("teilen").hidden = false;
    document.getElementById("neustart").hidden = true;
    if (tagesDatum !== heuteText()) {
      // altes Tagesspiel beendet -> heutiges Wort anbieten
      tagesFrageZeigen(t("oldFinished"), t("todayWordBtn"), function () { neuesTageswort(); }, null, null);
    }
  } else {
    document.getElementById("teilen").hidden = true;
    document.getElementById("neustart").hidden = false;
  }
}

// ------------------------------------------------------------
// Statistik
// ------------------------------------------------------------
function statistikLaden() {
  const roh = localStorage.getItem(STAT_SCHLUESSEL);
  if (roh === null) {
    return { gespielt: 0, gewonnen: 0, streak: 0, maxStreak: 0 };
  }
  return JSON.parse(roh);
}
function statistikSpeichern(stat) {
  localStorage.setItem(STAT_SCHLUESSEL, JSON.stringify(stat));
}
function statistikAktualisieren(hatGewonnen) {
  const stat = statistikLaden();
  stat.gespielt = stat.gespielt + 1;
  if (hatGewonnen) {
    stat.gewonnen = stat.gewonnen + 1;
    stat.streak = stat.streak + 1;
    if (stat.streak > stat.maxStreak) {
      stat.maxStreak = stat.streak;
    }
  } else {
    stat.streak = 0;
  }
  statistikSpeichern(stat);
  return stat;
}
function statistikAnzeigen(stat) {
  let quote = 0;
  if (stat.gespielt > 0) {
    quote = Math.round((stat.gewonnen / stat.gespielt) * 100);
  }
  document.getElementById("statistik").textContent =
    t("played") + ": " + stat.gespielt +
    " · " + t("wins") + ": " + stat.gewonnen + " (" + quote + "%)" +
    " · " + t("streak") + ": " + stat.streak +
    " · " + t("best") + ": " + stat.maxStreak;
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
function ergebnisTeilen() {
  navigator.clipboard.writeText(teilenText);
  document.getElementById("meldung").textContent = t("copied");
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
  document.getElementById("teilen").textContent = t("share");
  document.getElementById("neustart").textContent = t("again");
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
  const start = new Date(2026, 0, 1);
  const jetzt = new Date();
  const einTag = 1000 * 60 * 60 * 24;
  const tage = Math.floor((jetzt - start) / einTag);
  let index = tage % liste.length;
  if (index < 0) {
    index = index + liste.length;
  }
  return liste[index];
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
  let verwendet = ladeVerwendet();
  let uebrig = liste.filter((w) => !verwendet.includes(w));
  if (uebrig.length === 0) {
    verwendet = [];
    uebrig = liste.slice();
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
      document.getElementById("teilen").hidden = false;
      document.getElementById("neustart").hidden = true;
      zusatz = t("comeback");
    } else {
      document.getElementById("teilen").hidden = true;
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

  document.getElementById("meldung").textContent = "";
  document.getElementById("neustart").hidden = true;
  document.getElementById("teilen").hidden = true;
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
      ZIEL = naechstesZielwort();
    }
  }
  console.log("Zielwort:", ZIEL);
  statistikAnzeigen(statistikLaden());
}

// "Weiterspielen" im Endlos-Modus: alten Stand verwerfen, neues Wort
function neuesEndlosSpiel() {
  localStorage.removeItem(spielSchluessel());
  boardZuruecksetzen();
  ZIEL = naechstesZielwort();
  console.log("Zielwort:", ZIEL);
  statistikAnzeigen(statistikLaden());
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
  console.log("Zielwort (heute):", ZIEL);
  spielSpeichern(false, false); // heutiges (leeres) Tagesspiel sichern, ersetzt das alte
  statistikAnzeigen(statistikLaden());
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
document.getElementById("teilen").addEventListener("click", ergebnisTeilen);
document.getElementById("modus-taeglich").addEventListener("click", () => modusSetzen("taeglich"));
document.getElementById("modus-endlos").addEventListener("click", () => modusSetzen("endlos"));
document.getElementById("sprache").addEventListener("click", spracheUmschalten);
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
