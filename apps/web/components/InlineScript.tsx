"use client";

// A script that must run while the browser is still reading the page, before
// anything is painted (the saved theme, so a dark page never flashes light).
//
// The server sends it as a real script. On the client React can only ever
// create the element, never run it, and says so with a console error
// ("Encountered a script tag while rendering React component") whenever it
// has to build this part of the page itself: after a hydration error, or on a
// development remount. Marking it as plain text there tells React it is not
// meant to run a second time. This is the pattern Next.js documents in
// "How to prevent flash before hydration".
export function InlineScript({ html, nonce }: { html: string; nonce?: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
