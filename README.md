# Wördle 🟩🟨⬜

Ein Wortratespiel auf Deutsch und Englisch: Errate das 5-Buchstaben-Wort in
6 Versuchen. Nach jedem Rateversuch färben sich die Buchstaben:

- 🟩 **grün** – richtiger Buchstabe, richtige Stelle
- 🟨 **gelb** – Buchstabe kommt vor, aber an anderer Stelle
- ⬜ **grau** – Buchstabe kommt nicht vor (oder nicht so oft: Rätst du zwei M
  und das Wort hat nur eins, wird das zweite M grau)

**Live:** https://woerdle.tourelleworks.de

## Funktionen

- **Zwei Sprachen** – Deutsch und Englisch, umschaltbar über den Flaggen-Knopf
  oben rechts (eigene Wortlisten und eigene Tastatur je Sprache).
- **Tagesrätsel** – jeden Tag ein Wort, das für alle Spieler gleich ist.
- **Spielstand bleibt erhalten** – das Tagesrätsel wird je Sprache gespeichert
  und beim nächsten Start wiederhergestellt.
- **Statistik** – gespielte Spiele, Siegquote, Streak und Verteilung der Versuche,
  getrennt je Sprache.
- **Ergebnis teilen** – Emoji-Raster mit Datum und Sprach-Flagge in die
  Zwischenablage kopieren.
- **PWA** – auf dem Handy installierbar, offline spielbar, aktualisiert sich
  beim Öffnen automatisch.

## Projektstruktur

Die App liegt bewusst im **Wurzelverzeichnis** und wird von dort direkt unter der
eigenen Domain ausgeliefert (und nicht unter einem Unterpfad).

```
.
├── index.html          # Grundgerüst der Seite
├── style.css           # gesamtes Styling
├── app.js              # Spiel-Logik (Eingabe, Anzeige, Tagesrätsel, Sprachen)
├── evaluate.js         # Farbvergabe für einen Rateversuch (ohne Zugriff auf die Seite)
├── woerter.js          # deutsche Wortlisten (Ziel- und erlaubte Wörter)
├── woerter-en.js       # englische Wortlisten
├── manifest.json       # PWA-Manifest (Name, Icons, Startseite)
├── service-worker.js   # Offline-Cache und automatische Updates
├── zaehler.js          # Aufrufzähler von tourelleworks.de (ohne Cookie)
├── fehler.js/.css      # „Fehler melden“ (gleiche Datei in allen TourelleWorks-Apps)
├── tests/              # automatische Tests (Farbvergabe, Wortlisten)
├── icons/              # App-Icons, Flaggen, Katzen-Silhouette
├── wrangler.jsonc      # Cloudflare: Worker nur mit Dateien, eigene Domain
└── .assetsignore       # was nicht ausgeliefert wird (Tests, README, Konfiguration)
```

## Tests

Ohne Installation, mit dem in Node eingebauten Testlauf. Im Projektordner:

```
node --test
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

Seit 2026-11-28 ein **Cloudflare-Worker nur mit Dateien** (`wrangler.jsonc`) unter
`woerdle.tourelleworks.de`; vorher GitHub Pages. Grund: Das Anmelde-Cookie des
TourelleWorks-Kontos gilt für alle `*.tourelleworks.de` und landete bei GitHub.

Ausrollen: `npx wrangler deploy` im Repo-Ordner. Was nicht öffentlich sein soll
(Tests, README, Konfiguration), steht in `.assetsignore`.

Bei jedem Release hochzählen:

- `APP_VERSION` in `app.js` – die sichtbare Versionsnummer oben rechts.
- `CACHE_VERSION` in `service-worker.js` – damit der Cache sicher erneuert wird.
