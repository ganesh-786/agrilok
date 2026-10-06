"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Check, Close, Info } from "@/components/Icons";
import { readingTime } from "@/lib/reading-time";

// A message that confirms something and then leaves by itself.
//
// It is only for news the page already shows another way (the exam bar names
// the exam, the page is back online), so nothing is lost when it goes; that is
// also why a time limit is acceptable here (WCAG 2.2.1, "Timing Adjustable").
// The countdown stops while the student is reading it with the pointer or the
// keyboard, and it can be closed at once. A state that is still true, such as
// being offline, is not a toast: it stays on the page until it stops being true.
//
// "Reading it with the pointer" means the pointer moved onto the message. A
// pointer that was already resting where the message appears has not asked for
// anything: the button that changes the exam sits where the message later
// shows on a phone, and treating that parked pointer as a reader kept the
// message on screen for good. However it is held, the message still leaves
// after the longest time below.

// The same length as --motion-feedback, which the leaving animation runs for.
const LEAVE_MS = 180;
// However long it is held under a pointer, it goes in the end.
const LONGEST_HELD_MS = 20_000;

export function Toast({
  tone = "info",
  title,
  detail,
  closeLabel,
  duration,
  onDone,
}: {
  tone?: "info" | "success";
  title: string;
  detail?: string | null;
  closeLabel: string;
  /** Milliseconds on screen; worked out from the text when not given. */
  duration?: number;
  /** Called once the message has left. */
  onDone: () => void;
}) {
  const total = duration ?? readingTime(`${title} ${detail ?? ""}`);
  const [leaving, setLeaving] = useState(false);
  const [held, setHeld] = useState(false);
  const remaining = useRef(total);
  const startedAt = useRef(0);
  const timer = useRef(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  const leave = useCallback(() => {
    window.clearTimeout(timer.current);
    setLeaving(true);
    timer.current = window.setTimeout(() => done.current(), LEAVE_MS);
  }, []);

  // Held by a reader or not. A ref as well as state, because the pointer can
  // arrive before the first timer has been set, and the timer must then not
  // start under it.
  const isHeld = useRef(false);

  const start = useCallback(() => {
    if (isHeld.current) return;
    window.clearTimeout(timer.current);
    startedAt.current = Date.now();
    timer.current = window.setTimeout(leave, remaining.current);
  }, [leave]);

  const hold = useCallback(() => {
    if (isHeld.current) return;
    isHeld.current = true;
    window.clearTimeout(timer.current);
    if (startedAt.current) {
      remaining.current = Math.max(1_000, remaining.current - (Date.now() - startedAt.current));
    }
    startedAt.current = 0;
    setHeld(true);
  }, []);

  const release = useCallback(() => {
    if (!isHeld.current) return;
    isHeld.current = false;
    setHeld(false);
    start();
  }, [start]);

  useEffect(() => {
    start();
    const longest = window.setTimeout(leave, Math.max(LONGEST_HELD_MS, total * 2));
    return () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(longest);
    };
  }, [start, leave, total]);

  const Icon = tone === "success" ? Check : Info;
  return (
    <div
      className="toast"
      data-testid="toast"
      data-leaving={leaving ? "" : undefined}
      data-held={held ? "" : undefined}
      onPointerMove={() => !leaving && hold()}
      onPointerLeave={() => !leaving && release()}
      onFocus={() => !leaving && hold()}
      onBlur={() => !leaving && release()}
    >
      <div className="flex items-start gap-3 py-3 pl-4 pr-2">
        <Icon
          className={`mt-0.5 h-5 w-5 shrink-0 ${tone === "success" ? "text-success" : "text-action-ink"}`}
        />
        <div className="min-w-0 flex-1 py-0.5 text-small">
          <p className="text-balance font-semibold text-ink">{title}</p>
          {detail ? <p className="mt-1 text-ink-2">{detail}</p> : null}
        </div>
        <button
          type="button"
          onClick={leave}
          aria-label={closeLabel}
          className="row-link -my-1 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-2"
        >
          <Close className="h-5 w-5" />
        </button>
      </div>
      <span
        className="toast-timer"
        aria-hidden="true"
        style={{ animationDuration: `${total}ms` }}
      />
    </div>
  );
}

/**
 * Where toasts appear. It is rendered empty from the first paint, because a
 * screen reader announces only what is added to a live region that already
 * exists.
 */
export function ToastRegion({ children }: { children?: React.ReactNode }) {
  return (
    <div className="toast-region" role="status" aria-live="polite" data-testid="toast-region">
      {children}
    </div>
  );
}
