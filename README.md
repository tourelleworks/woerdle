# Wördle 🟩🟨⬜

Ein Wortratespiel auf Deutsch und Englisch: Errate das 5-Buchstaben-Wort in
6 Versuchen. Nach jedem Rateversuch färben sich die Buchstaben:

- 🟩 **grün** – richtiger Buchstabe, richtige Stelle
- 🟨 **gelb** – Buchstabe kommt vor, aber an anderer Stelle
- ⬜ **grau** – Buchstabe kommt nicht vor

**Live:** https://woerdle.tourelleworks.de

## Funktionen

- **Zwei Sprachen** – Deutsch und Englisch, umschaltbar über den Flaggen-Knopf
  oben rechts (eigene Wortlisten und eigene Tastatur je Sprache).
- **Tagesrätsel** – jeden Tag ein Wort, das für alle Spieler gleich ist.
- **Endlos-Modus** – beliebig viele Runden; jedes Zielwort kommt einmal dran,
  bevor sich eines wiederholt.
- **Spielstände bleiben erhalten** – Tages- und Endlos-Spiel werden je Sprache
  gespeichert und beim nächsten Start wiederhergestellt.
- **Statistik** – gespielte Spiele, Siegquote und Streak.
- **Ergebnis teilen** – Emoji-Raster mit Datum und Sprach-Flagge in die
  Zwischenablage kopieren.
- **PWA** – auf dem Handy installierbar, offline spielbar, aktualisiert sich
  beim Öffnen automatisch.

## Projektstruktur

Die App liegt bewusst im **Wurzelverzeichnis**, damit GitHub Pages sie direkt
unter der eigenen Domain ausliefert (und nicht unter einem Unterpfad).

```
.
├── index.html          # Grundgerüst der Seite
├── style.css           # gesamtes Styling
├── app.js              # Spiel-Logik (Eingabe, Auswertung, Modi, Sprachen)
├── woerter.js          # deutsche Wortlisten (Ziel- und erlaubte Wörter)
├── woerter-en.js       # englische Wortlisten
├── manifest.json       # PWA-Manifest (Name, Icons, Startseite)
├── service-worker.js   # Offline-Cache und automatische Updates
├── icons/              # App-Icons, Flaggen, Katzen-Silhouette
├── CNAME               # eigene Domain für GitHub Pages
└── CLAUDE.md           # Projektkontext für Claude Code
```

## Lokal starten

Service Worker funktionieren nicht über `file://`, es braucht einen echten
Webserver. Im Projektordner:

```
python -m http.server 8000
```

Dann http://localhost:8000 öffnen. In WebStorm geht auch: Rechtsklick auf
`index.html` → „Open in Browser".

## Deployment

Veröffentlicht über **GitHub Pages** mit „Deploy from a branch"
(Branch `master`, Ordner `/ (root)`). Die Datei `CNAME` im Wurzelverzeichnis
bindet die eigene Domain `woerdle.tourelleworks.de`.

Bei jedem Release hochzählen:

- `APP_VERSION` in `app.js` – die sichtbare Versionsnummer unten in der Ecke.
- `CACHE_VERSION` in `service-worker.js` – damit der Cache sicher erneuert wird.
