"use client";

import { useState } from "react";

import { Download } from "@/components/Icons";

type Labels = { save: string; saving: string; saved: string; failed: string; unsupported: string };

// Saves every page of one level into the browser's cache, so a student can
// study on a bus with no signal (ADR architecture: "offline topic packs").
// The service worker then serves them when the network is gone.
export function SaveOffline({ packUrl, labels }: { packUrl: string; labels: Labels }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed" | "unsupported">(
    "idle",
  );

  async function save() {
    if (!("caches" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }
    setState("saving");
    try {
      const response = await fetch(packUrl, { cache: "no-store" });
      const { urls } = (await response.json()) as { urls: string[] };
      const cache = await caches.open("agrilok-pages-v1");
      // One page at a time: gentle on a slow connection, and a failure part
      // way through still leaves the pages already saved.
      for (const url of urls) {
        const page = await fetch(url, { credentials: "same-origin" });
        if (page.ok) await cache.put(url, page);
      }
      setState("saved");
    } catch {
      setState("failed");
    }
  }

  const message =
    state === "saved"
      ? labels.saved
      : state === "failed"
        ? labels.failed
        : state === "unsupported"
          ? labels.unsupported
          : null;

  return (
    <div className="space-y-2">
      <button type="button" className="btn btn-quiet" onClick={save} disabled={state === "saving"}>
        <Download className="h-4 w-4" />
        {state === "saving" ? labels.saving : labels.save}
      </button>
      {message ? (
        <p role="status" className="text-sm text-ink-3">
          {message}
        </p>
      ) : null}
    </div>
  );
}
