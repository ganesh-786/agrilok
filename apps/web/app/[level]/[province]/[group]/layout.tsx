import Link from "next/link";
import { Suspense } from "react";

import { ChevronRight } from "@/components/Icons";
import { Wordmark } from "@/components/Logo";
import { AdaptiveChrome } from "@/components/shell/AdaptiveChrome";
import { ConnectivityBanner } from "@/components/shell/ConnectivityBanner";
import { ExamBar } from "@/components/shell/ExamBar";
import { LanguageSwitch } from "@/components/shell/LanguageSwitch";
import { ShellToasts } from "@/components/shell/ShellToasts";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { BottomNav, TopTabs, type NavItem } from "@/components/shell/StudyNav";
import { SHOW_DEMO_BANNER } from "@/lib/config";
import { sameContext } from "@/lib/context";
import { DATA_MODE } from "@/lib/data";
import { fmt } from "@/lib/format";
import { getProfile } from "@/lib/preferences";
import { contextLabel, loadStudyContext, type ContextParams } from "@/lib/study-context";

// The study shell. From the top: the masthead with the five destinations, then
// the exam bar, in the exam's own colour and in words, so Level 4 and Level 7
// can never be confused. The bar is the only place the exam is named and the
// only place it is changed. On a phone the destinations are a bar at the
// bottom instead. Passing messages (a change of exam, back online) are toasts
// that leave by themselves; only a state that is still true, such as being
// offline, takes room on the page.
export default async function StudyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: ContextParams;
}) {
  const { ctx, base, lang, t } = await loadStudyContext(params);
  const profile = await getProfile();
  const mine = profile && !sameContext(profile, ctx) ? profile : null;
  const nav: NavItem[] = [
    { key: "home", href: base, label: t.nav.home },
    { key: "syllabus", href: `${base}/syllabus`, label: t.nav.syllabus },
    { key: "practice", href: `${base}/practice`, label: t.nav.practice },
    { key: "updates", href: `${base}/updates`, label: t.nav.updates },
    { key: "ask", href: `${base}/ask`, label: t.nav.ask },
  ];

  return (
    <div className="flex min-h-dvh flex-col" data-level={ctx.level}>
      <AdaptiveChrome />
      <noscript>
        <style>{`.study-header, .study-exam { position: static; }`}</style>
      </noscript>
      <header className="study-header z-30 border-b border-line bg-canvas lg:sticky lg:top-0">
        <div className="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2">
          <Link
            href={base}
            className="flex min-h-11 shrink-0 items-center no-underline"
            aria-label={`agrilok, ${t.nav.home}`}
          >
            <Wordmark />
          </Link>
          <div className="study-header-tabs order-3 hidden w-full min-w-0 lg:order-none lg:block lg:w-auto">
            <TopTabs items={nav} base={base} label={t.nav.main} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle t={t} />
            <LanguageSwitch t={t} lang={lang} />
          </div>
        </div>
      </header>

      <ExamBar ctx={ctx} t={t} lang={lang} mine={mine} />

      {DATA_MODE === "demo" && SHOW_DEMO_BANNER ? (
        <div className="bg-warning-tint text-warning">
          <details className="reveal wrap" data-testid="demo-notice">
            <summary className="flex min-h-11 items-center justify-between gap-3 py-1.5 text-caption font-semibold">
              <span>{t.demo.compactBanner}</span>
              <ChevronRight className="disclosure-icon h-4 w-4 shrink-0" />
            </summary>
            <div className="space-y-2 border-t border-warning/25 pb-3 pt-2 text-caption">
              <p>
                {t.demo.banner} {t.demo.bannerReal}
              </p>
              <Link href="/prototype" className="link inline-flex min-h-11 items-center">
                {t.demo.tools}
              </Link>
            </div>
          </details>
        </div>
      ) : null}

      <ConnectivityBanner offline={t.offline.offlineBanner} />

      <main id="main" tabIndex={-1} className="flex-1 pb-12 outline-none lg:pb-16">
        {children}
      </main>

      <footer className="study-footer border-t border-line pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
        <div className="wrap flex flex-col gap-x-10 gap-y-2 py-6 text-caption text-ink-3 lg:flex-row lg:items-start lg:justify-between">
          <p className="max-w-prose">{t.footer.independent}</p>
          <p className="flex shrink-0 flex-wrap gap-x-5">
            {[
              ["/how-it-works", t.nav.how],
              ["/sources", t.nav.sources],
              ["/privacy", t.footer.privacy],
            ].map(([href, label]) => (
              <Link key={href} href={href!} className="link inline-flex min-h-11 items-center">
                {label}
              </Link>
            ))}
          </p>
        </div>
      </footer>

      <BottomNav items={nav} base={base} label={t.nav.main} />

      <Suspense>
        <ShellToasts
          switched={fmt(t.context.switched, { context: contextLabel(ctx, t, lang) }, lang)}
          kept={t.context.switchedKept}
          switchedDetail={t.context.switchedDetail}
          backOnline={t.offline.backOnline}
          close={t.common.close}
        />
      </Suspense>
    </div>
  );
}
