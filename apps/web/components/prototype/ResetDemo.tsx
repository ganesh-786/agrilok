"use client";

import { useState } from "react";

import { clearSaved } from "@/lib/client/offline";
import { resetProgress } from "@/lib/client/progress";

export function ResetDemo({ label, doneLabel }: { label: string; doneLabel: string }) {
  const [done, setDone] = useState(false);

  async function handleReset() {
    resetProgress();
    await clearSaved();
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = sessionStorage.key(i);
        if (key?.startsWith("agrilok:session:")) sessionStorage.removeItem(key);
      }
    } catch {
      // Session storage is optional; progress reset still succeeds.
    }
    setDone(true);
  }

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={handleReset}
      onBlur={() => setDone(false)}
    >
      {done ? doneLabel : label}
    </button>
  );
}
