"use client";

import Link from "next/link";

// A way to reach the exam bar's editor from further down a page, without
// putting a second set of pickers there.
//
// It is a real link to setup, so it still leads somewhere useful before
// JavaScript loads or without it. With JavaScript it opens the editor in the
// bar at the top instead and puts the keyboard on its first choice.
export function OpenExamEditor({
  href,
  className,
  children,
}: {
  /** Setup, pre-filled with the exam on screen. */
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      data-testid="open-exam-editor"
      onClick={(event) => {
        const details = document.querySelector<HTMLDetailsElement>("details#exam");
        if (!details) return;
        event.preventDefault();
        details.open = true;
        details.closest(".study-exam")?.removeAttribute("data-tucked");
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        // A control inside a disclosure cannot take focus in the same task
        // that opens it: the browser has not laid the panel out yet (measured
        // in Chromium: 0 ms fails, 20 ms works). How many frames that takes
        // differs between a laptop and a phone, so it asks again each frame
        // until the focus has landed, and gives up after a quarter of a second.
        const first = details.querySelector<HTMLSelectElement>("select");
        let frames = 0;
        const focus = () => {
          first?.focus({ preventScroll: true });
          if (document.activeElement !== first && frames++ < 15) requestAnimationFrame(focus);
        };
        requestAnimationFrame(focus);
      }}
    >
      {children}
    </Link>
  );
}
