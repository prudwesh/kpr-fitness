/* KPR Fitness service worker: the same as kprapps' shared/kpr-sw.js.
   Network first for pages, so a deploy shows up straight away; the app
   shell is cached so it still opens offline. */
const CACHE_VERSION = "kpr-v3";
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const CACHE_NAME = "kpr-shell::" + SCOPE_PATH + "::" + CACHE_VERSION;

// Same-origin paths that should be pre-cached so the shell renders offline.
const SHELL_URLS = [
  SCOPE_PATH,
  SCOPE_PATH + "manifest.webmanifest",
  SCOPE_PATH + "icons/fitness.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Pre-cache best effort — 404s should not abort install.
      Promise.all(SHELL_URLS.map((u) => cache.add(u).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n.startsWith("kpr-shell::" + SCOPE_PATH + "::") && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache Firebase auth callbacks, Firestore, or Supabase edge fns.
  // (They're cross-origin so already filtered above, but be explicit.)
  const isHtml = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHtml) {
    // Network-first for HTML so a deploy shows up immediately when online.
    event.respondWith(
      // no-cache: revalidate with the server so a fresh deploy shows up on
      // the next load instead of after the HTTP cache (10 min on Pages) expires.
      fetch(req.url, { cache: "no-cache", credentials: "same-origin" })
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(SCOPE_PATH)))
    );
    return;
  }

  // Stale-while-revalidate for other same-origin assets (CSS/JS/img/icons):
  // serve from cache for instant paint, but always refetch in the background
  // so the next visit sees the newly deployed asset. Cache-first alone left
  // returning users stuck on old JS/CSS after a Pages deploy.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req).then((resp) => {
          if (resp && resp.status === 200 && resp.type === "basic") {
            cache.put(req, resp.clone()).catch(() => {});
          }
          return resp;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});

// Tapping a notification kpr-core showed (a reminder) opens its link, in an
// open KPR window when there is one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || SCOPE_PATH;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const same = list.find((c) => c.url === url);
      if (same) return same.focus();
      return self.clients.openWindow(url);
    })
  );
});
