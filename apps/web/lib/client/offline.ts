// Saving pages for offline study. Pages go into the same cache the service
// worker reads (public/service-worker.js, "agrilok-pages-v1"), one at a time
// so a slow connection is not flooded, and a list of what was saved is kept
// so Home can say exactly what works without internet.

import { useSyncExternalStore } from "react";

const CACHE = "agrilok-pages-v1";
const KEY = "agrilok:offline:v1";
const EVENT = "agrilok:offline";

export type SavedItem = {
  id: string;
  kind: "topic" | "syllabus" | "practice" | "exam";
  label: string;
  href: string;
  urls: string[];
  savedAt: string;
};

let cachedRaw: string | null = null;
let cachedList: SavedItem[] = [];

function readList(): SavedItem[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cachedList;
  }
  if (raw === cachedRaw) return cachedList;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as SavedItem[]) : [];
    cachedList = Array.isArray(parsed) ? parsed : [];
  } catch {
    cachedList = [];
  }
  return cachedList;
}

function writeList(list: SavedItem[]): void {
  try {
    const raw = JSON.stringify(list);
    window.localStorage.setItem(KEY, raw);
    cachedRaw = raw;
  } catch {
    // Kept for this visit only.
  }
  cachedList = list;
  window.dispatchEvent(new Event(EVENT));
}

export function offlineSupported(): boolean {
  return typeof window !== "undefined" && "caches" in window && "serviceWorker" in navigator;
}

export type SaveResult = "saved" | "unsupported" | "failed";

/** The build's own scripts and styles that a saved page names in its HTML. */
export function staticAssets(html: string): string[] {
  return [...new Set(html.match(/\/_next\/static\/[^"'\\\s)<>]+\.(?:js|css)/g) ?? [])];
}

export async function saveForOffline(item: Omit<SavedItem, "savedAt">): Promise<SaveResult> {
  if (!offlineSupported()) return "unsupported";
  try {
    const cache = await caches.open(CACHE);
    const assets = new Set<string>();
    for (const url of item.urls) {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) return "failed";
      for (const asset of staticAssets(await response.clone().text())) assets.add(asset);
      await cache.put(url, response);
    }
    // A saved page is only its HTML. A page the student has not opened yet
    // (the practice set saved with a topic) also needs scripts this visit never
    // loaded, or it opens offline as a skeleton that never fills. Asking for
    // them now lets the service worker keep them; it stores each file once.
    // Fonts are left out: text still reads in the device's own face, and the
    // files are large for a connection that may be metered.
    if (navigator.serviceWorker.controller) {
      for (const asset of assets) {
        const response = await fetch(asset);
        if (!response.ok) return "failed";
      }
    }
    const others = readList().filter((saved) => saved.id !== item.id);
    writeList([{ ...item, savedAt: new Date().toISOString() }, ...others]);
    return "saved";
  } catch {
    return "failed";
  }
}

export async function removeSaved(id: string): Promise<void> {
  const item = readList().find((saved) => saved.id === id);
  if (item && offlineSupported()) {
    try {
      const cache = await caches.open(CACHE);
      await Promise.all(item.urls.map((url) => cache.delete(url)));
    } catch {
      // The list is what the student sees; drop the entry either way.
    }
  }
  writeList(readList().filter((saved) => saved.id !== id));
}

export async function clearSaved(): Promise<void> {
  for (const item of readList()) await removeSaved(item.id);
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useSavedItems(): SavedItem[] | null {
  return useSyncExternalStore(subscribe, readList, () => null);
}
