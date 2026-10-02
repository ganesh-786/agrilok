"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

// A hairline across the top of the screen from the moment an internal link is
// pressed until the next page is on screen. Study pages are rendered on
// request and have no streaming fallback (it would hide the page from a
// browser without JavaScript), so this is the only sign that a tap on a topic
// row or a filter was heard.
//
// It listens for presses on the document rather than wrapping every link, so
// a link added later is covered without anyone remembering to. The bar is
// decoration for sighted users; Next.js already announces the new page to a
// screen reader.
export function NavProgress() {
  const bar = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const search = useSearchParams().toString();

  // The page changed: the wait is over.
  useEffect(() => {
    bar.current?.removeAttribute("data-active");
  }, [pathname, search]);

  useEffect(() => {
    let timer = 0;
    const stop = () => {
      window.clearTimeout(timer);
      bar.current?.removeAttribute("data-active");
    };
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // The same page, or a jump within it: nothing will load.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      bar.current?.setAttribute("data-active", "");
      // A navigation that never lands (the request failed and the page stayed)
      // must not leave the bar running.
      window.clearTimeout(timer);
      timer = window.setTimeout(stop, 12_000);
    }
    // Capture phase: the router cancels the click's default action, and a
    // cancelled click must still count.
    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", stop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", stop);
      window.clearTimeout(timer);
    };
  }, []);

  return <div ref={bar} className="nav-progress" aria-hidden="true" data-testid="nav-progress" />;
}
