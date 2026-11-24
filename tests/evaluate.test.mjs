// Tests für die Farbvergabe. Starten im Repo-Ordner mit: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadScript } from "./load-script.mjs";

const { evaluateGuess } = loadScript("evaluate.js", ["evaluateGuess"]);

// Vergleicht über JSON, weil das Feld aus einer anderen vm-Umgebung stammt.
function colors(target, guess) {
  return JSON.parse(JSON.stringify(evaluateGuess(target, guess)));
}

test("richtiges Wort: alles grün", () => {
  assert.deepEqual(colors("STURM", "STURM"), ["gruen", "gruen", "gruen", "gruen", "gruen"]);
});

test("kein Buchstabe kommt vor: alles grau", () => {
  assert.deepEqual(colors("STURM", "KLEID"), ["grau", "grau", "grau", "grau", "grau"]);
});

test("doppelter Buchstabe im Versuch, einfacher im Ziel: nur einer wird gelb", () => {
  // STURM hat ein M. Das erste M in SUMMT wird gelb, das zweite grau.
  assert.deepEqual(colors("STURM", "SUMMT"), ["gruen", "gelb", "gelb", "grau", "gelb"]);
});

test("grün hat Vorrang vor gelb beim selben Buchstaben", () => {
  // Das M an der richtigen Stelle verbraucht das einzige M, das M davor bleibt grau.
  assert.deepEqual(colors("STURM", "STUMM"), ["gruen", "gruen", "gruen", "grau", "gruen"]);
});

test("mehr gleiche Buchstaben im Versuch als im Ziel: die überzähligen werden grau", () => {
  // LEBEN hat zwei E, EBENE hat drei. Die ersten beiden E sind gelb, das dritte grau.
  assert.deepEqual(colors("LEBEN", "EBENE"), ["gelb", "gelb", "gelb", "gelb", "grau"]);
});

test("Umlaute zählen als eigene Buchstaben", () => {
  assert.deepEqual(colors("BÄUME", "BAUME"), ["gruen", "grau", "gruen", "gruen", "gruen"]);
});
