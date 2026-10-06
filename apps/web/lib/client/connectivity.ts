// Is this device online, and can saved pages open without a connection?
//
// Built on the browser's own online and offline events. Next.js 16.3 has an
// experimental useOffline hook that also notices failed requests; it needs an
// experimental flag, so it is left for later rather than shipped in a build
// meant for students (docs/student-experience.md, section 5.6).

import { useSyncExternalStore } from "react";

function subscribeOnline(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** Null until the browser has been asked (server render and first paint). */
export function useOnline(): boolean | null {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => null,
  );
}

function subscribeWorker(callback: () => void): () => void {
  if (!("serviceWorker" in navigator)) return () => {};
  navigator.serviceWorker.addEventListener("controllerchange", callback);
  return () => navigator.serviceWorker.removeEventListener("controllerchange", callback);
}

/**
 * True when a service worker controls this page, so saved pages will open
 * offline. It is registered in production builds only (components/ServiceWorker).
 */
export function useOfflineReady(): boolean | null {
  return useSyncExternalStore(
    subscribeWorker,
    () => "serviceWorker" in navigator && navigator.serviceWorker.controller !== null,
    () => null,
  );
}
