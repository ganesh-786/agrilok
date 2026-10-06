// agrilok service worker: study without a connection.
//
// - A build asset is served from cache first only when the server itself
//   said it will never change (Cache-Control: immutable). A production build
//   says that for everything under /_next/static, because those file names
//   carry a hash of their contents. A development server does not, and there
//   the same file name is reused for every edit, so nothing of it is kept.
//   Version 1 kept every /_next/static response regardless: a browser that
//   had once opened a production build on localhost then drew every later
//   development page with an old stylesheet and old scripts.
// - Icons, photographs and resized images can change at the same address, so
//   they come from the network, with the last copy kept for when there is
//   none.
// - Pages are fetched from the network first, so students always get current
//   answers and review states when online; the saved copy is used only when
//   the network fails, and /offline when nothing was saved.
// - Nothing that is not a GET is ever intercepted: asking a question always
//   goes to the server.
//
// Bump VERSION when this file's behaviour changes; old caches are deleted.

const VERSION = "v2";
const PAGES = "agrilok-pages-v1"; // shared with the "save for offline" button
const ASSETS = `agrilok-assets-${VERSION}`;
const OFFLINE_URL = "/offline";
const MAX_PAGES = 120;
const MAX_ASSETS = 300;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const replaced = (async () => {
    const keys = await caches.keys();
    const old = keys.filter((key) => key.startsWith("agrilok-") && key !== PAGES && key !== ASSETS);
    await Promise.all(old.map((key) => caches.delete(key)));
    await self.clients.claim();
    return old.length > 0;
  })();
  event.waitUntil(replaced);
  // A page that is open right now was drawn by the worker this one replaces,
  // possibly from the caches just deleted. Loading it again is the only way
  // to be sure it matches the server. It happens once, when an older version
  // is replaced, never on a first install.
  //
  // This must not be part of waitUntil above. The reloaded page asks this
  // worker for its HTML, and a worker answers nothing until its activation
  // has finished; waiting here for the reload would be waiting for itself
  // (measured: the page hung and the server never saw the request).
  replaced
    .then(async (wasReplaced) => {
      if (!wasReplaced) return;
      const windows = await self.clients.matchAll({ type: "window" });
      for (const client of windows) client.navigate(client.url).catch(() => null);
    })
    .catch(() => null);
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) {
    await cache.delete(key);
  }
}

function isImmutable(response) {
  return /\bimmutable\b/i.test(response.headers.get("Cache-Control") ?? "");
}

async function immutableFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && isImmutable(response)) {
    await cache.put(request, response.clone());
    trim(ASSETS, MAX_ASSETS);
  }
  return response;
}

async function networkFirst(request, cacheName, max, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
      trim(cacheName, max);
    }
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (fallbackUrl && (await cache.match(fallbackUrl))) ||
      Response.error()
    );
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(immutableFirst(request));
    return;
  }
  if (
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/photos/")
  ) {
    event.respondWith(networkFirst(request, ASSETS, MAX_ASSETS));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGES, MAX_PAGES, OFFLINE_URL));
  }
});
