// Service Worker - network-first (automatische Updates, offline via Cache).
// Spielstände & Statistik liegen in localStorage und werden NIE angefasst.
const CACHE_VERSION = "woerdle-v24";
const DATEIEN = [
  // Die Startadresse ohne Dateinamen ist für den Cache ein eigener Eintrag. Ohne ihn
  // bleibt die Seite offline leer, wenn man sie nach dem ersten Besuch über "/" aufruft.
  "./",
  "index.html",
  "style.css",
  "app.js",
  "woerter.js",
  "woerter-en.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/flag-de.svg",
  "icons/flag-gb.svg",
  "icons/cat-silhouette.svg",
  "icons/favicon.svg",
  "icons/favicon-32.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(DATEIEN)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  // Fremde Adressen (etwa den Aufrufzähler auf tourelleworks.de) lädt der Browser selbst. Über den
  // Service Worker liefe die Anfrage unter dessen strengeren Regeln und käme womöglich nie an.
  if (new URL(event.request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    // "no-cache" fragt bei jeder Datei beim Server nach, ob sie noch aktuell ist. Ohne das nimmt
    // der Browser Dateien aus seinem HTTP-Cache, und nach einem Update kann eine alte index.html
    // auf eine neue app.js treffen. Das Skript bricht dann ab und das Spiel bleibt leer.
    fetch(event.request, { cache: "no-cache" })
      .then((antwort) => {
        const kopie = antwort.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(event.request, kopie));
        return antwort;
      })
      .catch(() => caches.match(event.request))
  );
});
