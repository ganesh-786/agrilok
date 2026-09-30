import Link from "next/link";
import { Suspense } from "react";

import { setLanguage, setLite } from "@/app/actions";
import { Wordmark } from "@/components/Logo";
import { NavLinks, ReturnTo } from "@/components/NavState";
import type { Dictionary, Lang } from "@/lib/i18n";

// Plain forms, not client-side toggles: switching language or hiding photos
// works on the oldest phone browser, with or without JavaScript.
export function SiteHeader({ t, lang, lite }: { t: Dictionary; lang: Lang; lite: boolean }) {
  const links = [
    { href: "/level-4", label: t.nav.level_4, tone: "text-field" },
    { href: "/level-7", label: t.nav.level_7, tone: "text-clay" },
    { href: "/sources", label: t.nav.sources, tone: "" },
    { href: "/how-it-works", label: t.nav.how, tone: "" },
  ];
  return (
    <header className="border-b border-rule bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-card focus:px-3 focus:py-2"
      >
        {t.nav.skip}
      </a>
      <div className="wrap flex items-center justify-between gap-3 py-3">
        <Link href="/" className="no-underline" aria-label={`agrilok, ${t.nav.home}`}>
          <Wordmark tagline={t.site.tagline} />
        </Link>
        <div className="flex items-center gap-1.5">
          <form action={setLite}>
            <input type="hidden" name="lite" value={lite ? "0" : "1"} />
            <Suspense>
              <ReturnTo />
            </Suspense>
            <button
              type="submit"
              className="hidden rounded px-2 py-1.5 text-sm text-ink-3 hover:text-ink sm:inline"
            >
              {lite ? t.nav.liteOn : t.nav.lite}
            </button>
          </form>
          <form action={setLanguage}>
            <input type="hidden" name="lang" value={lang === "ne" ? "en" : "ne"} />
            <Suspense>
              <ReturnTo />
            </Suspense>
            <button
              type="submit"
              title={t.nav.switchTitle}
              lang={lang === "ne" ? "en" : "ne"}
              className="rounded border border-rule bg-card px-2.5 py-1 text-sm font-semibold hover:border-ink-3"
            >
              {t.nav.switchLabel}
            </button>
          </form>
        </div>
      </div>
      <NavLinks links={links} label={t.nav.menu} />
    </header>
  );
}
