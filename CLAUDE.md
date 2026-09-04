# CLAUDE.md – Kontext für Claude Code

> Diese Datei liest Claude Code zu Beginn jeder Session automatisch. Halte sie
> aktuell, wenn sich etwas Grundlegendes ändert.

## Über dieses Projekt
**Wördle** – ein Wortratespiel (wie Wordle) auf Deutsch und Englisch:
5-Buchstaben-Wort in 6 Versuchen erraten, mit Farb-Feedback (grün/gelb/grau).
Mein **erstes eigenes Entwicklungsprojekt**.
Live unter https://woerdle.tourelleworks.de

## Über mich (den Entwickler)
- Ausgebildeter Anwendungsentwickler, Schwerpunkt **Java**.
- **Neu für mich:** JavaScript, Web-Frontend, PWAs.
- **Ein paar Stunden pro Woche** Zeit.

## Wie du (Claude) mir helfen sollst
- **Erklären statt nur liefern.** Ich will verstehen, was passiert – kommentiere
  neuen/ungewohnten Code kurz und erkläre das *Warum*.
- **Kleine Schritte.** Immer nur eine Sache. Nichts ungefragt vorwegnehmen.
- **Sag mir genau, wo ich was tun soll** (Anpassen / Hinzufügen / Entfernen)
  und in welcher Datei.
- **Bezug zu Java** herstellen, wo es hilft.
- **Einfachste Lösung zuerst**, die funktioniert – nicht die cleverste.
- Arbeitsweise: ein **Feature-Branch** pro Aufgabe, testen, committen, mergen.

## Aktueller Stand
Das Spiel ist **fertig und veröffentlicht**: Farb-Logik inkl. doppelter
Buchstaben, Gewinn/Niederlage, Wortprüfung, Bildschirm-Tastatur, Statistik,
Teilen-Funktion, Tages- und Endlos-Modus sowie Deutsch/Englisch.

## Tech-Stack & Konventionen
- **Frontend:** reines HTML/CSS/JavaScript, kein Framework.
- **Struktur:** Die App liegt im **Wurzelverzeichnis** (nicht in `app/`), damit
  GitHub Pages sie direkt unter der Domain ausliefert.
- **Wortlisten:** `woerter.js` (Deutsch) und `woerter-en.js` (Englisch).
- **Speicher:** `localStorage` für Spielstände, Statistik, Sprache und Modus.
- Bezeichner im Code **englisch**; UI-Texte und Kommentare **deutsch** ok.
- **Kein `?`-Operator** (kein ternäres `? :`, kein `?.`, kein `??`).
- Einrückung: 2 Leerzeichen.

## Definition of Done
1. Funktioniert im Browser, manuell getestet.
2. `APP_VERSION` (app.js) und `CACHE_VERSION` (service-worker.js) hochgezählt.
3. `git commit` mit klarer Nachricht, Branch in `master` gemerged.

## Wichtige Dateien
- `app.js` – die gesamte Spiel-Logik.
- `woerter.js` / `woerter-en.js` – die Wortlisten.
- `service-worker.js` – Offline-Cache und automatische Updates.
- `CNAME` – bindet die eigene Domain an GitHub Pages (nicht löschen!).
