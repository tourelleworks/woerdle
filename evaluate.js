// Farbvergabe für einen Rateversuch – bewusst eine eigene Datei ohne Zugriff auf die Seite.
// So lässt sie sich ohne Browser testen (tests/evaluate.test.mjs), und app.js kümmert sich
// nur noch ums Anzeigen.
//
// Ergebnis: fünf Farben in der Reihenfolge der Buchstaben, je "gruen", "gelb" oder "grau".
// Die Namen bleiben deutsch, weil sie so in den gespeicherten Spielständen stehen.
function evaluateGuess(target, guess) {
  // Wie oft jeder Buchstabe im Zielwort noch "zu vergeben" ist.
  const remaining = {};
  for (const letter of target) {
    if (remaining[letter] === undefined) {
      remaining[letter] = 0;
    }
    remaining[letter] = remaining[letter] + 1;
  }

  // Erst alle Treffer an der richtigen Stelle. Sie haben Vorrang, sonst könnte ein gelber
  // Buchstabe weiter links einem späteren grünen den letzten Vorrat wegnehmen.
  const result = new Array(guess.length);
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === target[i]) {
      result[i] = "gruen";
      remaining[guess[i]] = remaining[guess[i]] - 1;
    }
  }

  // Dann von links nach rechts gelb, solange vom Buchstaben noch etwas übrig ist.
  // Ein Buchstabe, den das Zielwort seltener enthält als der Versuch, wird beim Überzähligen grau.
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === undefined) {
      const letter = guess[i];
      if (remaining[letter] > 0) {
        result[i] = "gelb";
        remaining[letter] = remaining[letter] - 1;
      } else {
        result[i] = "grau";
      }
    }
  }
  return result;
}
