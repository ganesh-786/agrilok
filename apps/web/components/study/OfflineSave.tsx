"use client";

import { useState } from "react";

import { Check, Download } from "@/components/Icons";
import { removeSaved, saveForOffline, useSavedItems, type SavedItem } from "@/lib/client/offline";

type Labels = {
  save: string;
  saving: string;
  saved: string;
  remove: string;
  failed: string;
  unsupported: string;
};

/**
 * Save a set of pages for offline study. The list of pages comes from the
 * server, so a saved topic always includes its practice set as well.
 */
export function OfflineSave({
  item,
  labels,
  variant = "secondary",
}: {
  item: Omit<SavedItem, "savedAt">;
  labels: Labels;
  variant?: "secondary" | "quiet";
}) {
  const saved = useSavedItems();
  const [state, setState] = useState<"idle" | "saving" | "failed" | "unsupported">("idle");
  const isSaved = !!saved?.some((s) => s.id === item.id);

  async function save() {
    setState("saving");
    const result = await saveForOffline(item);
    setState(result === "saved" ? "idle" : result);
  }

  return (
    <div className="space-y-2">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          isSaved || state === "failed" || state === "unsupported" ? "text-small" : "sr-only"
        }
      >
        {isSaved ? (
          <span className="inline-flex items-center gap-2 font-semibold text-success">
            <Check className="h-5 w-5" />
            {labels.saved}
          </span>
        ) : state === "failed" || state === "unsupported" ? (
          <p className="text-warning">{state === "failed" ? labels.failed : labels.unsupported}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => void (isSaved ? removeSaved(item.id) : save())}
        disabled={state === "saving" || saved === null}
        aria-busy={state === "saving"}
        className={`btn btn-${isSaved ? "quiet" : variant} btn-sm`}
      >
        {isSaved ? null : <Download className="h-5 w-5" />}
        {isSaved ? labels.remove : state === "saving" ? labels.saving : labels.save}
      </button>
    </div>
  );
}
