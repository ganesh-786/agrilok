"use client";

import { useEffect, useId, useRef } from "react";

import { Close } from "@/components/Icons";

// A modal sheet on the native <dialog>: focus is trapped and Escape closes it
// without any library. It rises from the bottom on a phone and sits centred
// on a wide screen.
export function Sheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      onClose={onClose}
      className="sheet mx-auto mb-0 mt-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-0 text-ink shadow-sheet backdrop:bg-black/45 sm:mb-auto sm:rounded-2xl"
    >
      <div className="space-y-4 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <h2 id={headingId} className="text-title">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-ink-2 hover:bg-sunken"
            aria-label={closeLabel}
          >
            <Close className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
