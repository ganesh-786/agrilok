"use client";

import { useEffect } from "react";

// The offline service worker belongs to production builds only.
//
// In production it is registered. In development it is removed: a browser
// that once opened a production build on this address still has that build's
// worker, and a worker left in charge of a development server is how a page
// ends up drawn with yesterday's stylesheet and scripts. Its asset cache goes
// with it; saved pages are left alone.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/service-worker.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // Offline support is an enhancement; the site works without it.
        });
      return;
    }
    // A worker in charge of this page may have drawn it from its cache. Once
    // the worker and the cache are gone the page is loaded again, so what is
    // on screen is what the development server sent. That can happen only
    // once: after the reload nothing controls the page.
    const controlled = navigator.serviceWorker.controller !== null;
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
      .then(() => ("caches" in window ? caches.keys() : []))
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith("agrilok-assets-")).map((key) => caches.delete(key)),
        ),
      )
      .then(() => {
        if (controlled) window.location.reload();
      })
      .catch(() => {
        // Nothing was registered, or storage is blocked: nothing to remove.
      });
  }, []);
  return null;
}
