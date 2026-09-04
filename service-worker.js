// Service Worker - network-first (automatische Updates, offline via Cache).
// Spielstände & Statistik liegen in localStorage und werden NIE angefasst.
const CACHE_VERSION = "woerdle-v17";
const DATEIEN = [
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
  event.respondWith(
    fetch(event.request)
      .then((antwort) => {
        const kopie = antwort.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(event.request, kopie));
        return antwort;
      })
      .catch(() => caches.match(event.request))
  );
});
