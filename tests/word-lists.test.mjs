// Prüft die Wortlisten. Wichtig, weil das Spiel ein Zielwort nur annimmt, wenn es auch in der
// Liste der erlaubten Wörter steht: Fehlt es dort, wäre das Tagesrätsel an dem Tag unlösbar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadScript } from "./load-script.mjs";

const de = loadScript("woerter.js", ["ZIELWOERTER", "ERLAUBTE"]);
const en = loadScript("woerter-en.js", ["ZIELWOERTER_EN", "ERLAUBTE_EN"]);

const languages = [
  { name: "Deutsch", targets: de.ZIELWOERTER, allowed: de.ERLAUBTE, letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ" },
  { name: "Englisch", targets: en.ZIELWOERTER_EN, allowed: en.ERLAUBTE_EN, letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
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
