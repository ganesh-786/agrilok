"use client";

import { useEffect } from "react";

// Registers the offline service worker in production only, so development
// never serves a stale cached page by surprise.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Offline support is an enhancement; the site works without it.
      });
  }, []);
  return null;
}
