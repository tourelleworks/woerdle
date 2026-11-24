// Prüft die Wortlisten. Wichtig, weil das Spiel ein Zielwort nur annimmt, wenn es auch in der
// Liste der erlaubten Wörter steht: Fehlt es dort, wäre das Tagesrätsel an dem Tag unlösbar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadScript } from "./load-script.mjs";

const de = loadScript("woerter.js", ["ZIELWOERTER", "ERLAUBTE"]);
const en = loadScript("woerter-en.js", ["ZIELWOERTER_EN", "ERLAUBTE_EN"]);

// Wie im Original soll keine Mehrzahl die Lösung sein. Automatisch erkennen lässt sich das nicht
// (LEBEN, MAGEN, KÜKEN sind Einzahl), darum steht hier die Liste der am 2026-11-24 ersetzten
// Wörter: Sie dürfen nicht versehentlich zurückkommen. Neue Zielwörter bitte selbst prüfen.
const GERMAN_PLURALS = ("HUNDE LÖWEN FELLE HOSEN RÄUME HALME KÄMME PAARE EULEN RABEN ECKEN TÜTEN LEUTE " +
  "TEAMS MEERE RISSE KILOS SOFAS ZELTE HÄNDE WOGEN WAREN GÄNSE TUBEN NÄGEL ZONEN NOTEN SIEGE DOSEN " +
  "TEILE WÄNDE WITZE WERKE DINGE LÄDEN ZÄUNE TÄLER WORTE BÄREN FÄDEN PONYS JAHRE VASEN KERNE MÄUSE " +
  "GÄSTE FOTOS VERSE POSEN KERLE ZÖPFE DATEN DAMEN JUNGS BOOTE ZEHEN VIREN ROSEN NIXEN UHREN VÄTER " +
  "OPERN WEINE WERTE LAIEN PLÄNE BROTE HELME REIME FILME DÜFTE HÄFEN HEXEN TÜREN MADEN RINGE URNEN " +
  "PILZE ÄPFEL WÖLFE TIERE HÖHEN BÄUME MÖWEN PFADE ALPEN RÄDER SÖHNE TATEN HAARE HASEN FUGEN HEFTE " +
  "NASEN RÜBEN CHIPS SÄTZE WADEN BERGE DÜNEN LÄUSE OASEN ZÄHNE OHREN FESTE GÜTER RÜDEN SPÄNE ELFEN " +
  "ZIELE KEIME TAKTE TÖPFE TEXTE ULMEN IDEEN BEINE VENEN KEILE").split(" ");

// Englische Mehrzahlen enden fast immer auf S. Ausgenommen sind Endungen, die auch in der
// Einzahl häufig sind (GLASS, VIRUS, BASIS), und ATLAS. Dazu die unregelmäßigen mit fünf
// Buchstaben (CACTI wurde am 2026-11-24 durch COBRA ersetzt).
const englishTargets = en.ZIELWOERTER_EN;
const ENGLISH_PLURALS = englishTargets
  .filter((word) => /S$/.test(word) && !/(SS|US|IS)$/.test(word) && word !== "ATLAS")
  .concat(["CACTI", "FUNGI", "GEESE", "TEETH", "WOMEN"]);

const languages = [
  { name: "Deutsch", targets: de.ZIELWOERTER, allowed: de.ERLAUBTE, plurals: GERMAN_PLURALS, letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ" },
  { name: "Englisch", targets: englishTargets, allowed: en.ERLAUBTE_EN, plurals: ENGLISH_PLURALS, letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
];

for (const lang of languages) {
  test(lang.name + ": jedes Zielwort darf auch geraten werden", () => {
    const allowed = new Set(lang.allowed);
    const missing = lang.targets.filter((word) => !allowed.has(word));
    assert.deepEqual(missing, []);
  });

  test(lang.name + ": jedes Wort hat fünf Buchstaben, die die Tastatur hat", () => {
    const bad = lang.targets.concat(lang.allowed).filter((word) => {
      if (word.length !== 5) {
        return true;
      }
      return [...word].some((letter) => !lang.letters.includes(letter));
    });
    assert.deepEqual(bad, []);
  });

  test(lang.name + ": kein Zielwort ist eine der bekannten Mehrzahlen", () => {
    const found = lang.targets.filter((word) => lang.plurals.includes(word));
    assert.deepEqual(found, []);
  });

  test(lang.name + ": kein Zielwort doppelt", () => {
    const seen = new Set();
    const twice = [];
    for (const word of lang.targets) {
      if (seen.has(word)) {
        twice.push(word);
      }
      seen.add(word);
    }
    assert.deepEqual(twice, []);
  });
}
