// The service worker as it shipped before 2026-10-01, kept only so a test can
// start from a browser that still has it (tests/e2e/service-worker.spec.ts).
// It kept every /_next/static response forever. Do not use it.

// agrilok service worker: study without a connection.
//
// - Build assets (/_next/static, optimised images, icons) never change once
//   built, so they are served from cache first.
// - Pages are fetched from the network first, so students always get current
//   answers and review states when online; the saved copy is used only when
//   the network fails, and /offline when nothing was saved.
// - Nothing that is not a GET is ever intercepted: asking a question always
//   goes to the server.
//
// Bump VERSION when this file's behaviour changes; old caches are deleted.

const VERSION = "v1";
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
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("agrilok-") && key !== PAGES && key !== ASSETS)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) {
    await cache.delete(key);
  }
}

async function assetFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    trim(ASSETS, MAX_ASSETS);
  }
  return response;
}

async function pageNetworkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
      trim(PAGES, MAX_PAGES);
    }
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(assetFirst(request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(pageNetworkFirst(request));
  }
});
