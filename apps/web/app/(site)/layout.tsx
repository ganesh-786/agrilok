import Link from "next/link";

import { Wordmark } from "@/components/Logo";
import { LanguageSwitch } from "@/components/shell/LanguageSwitch";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { SiteFooter } from "@/components/SiteFooter";
import { contextPath } from "@/lib/context";
import { getDictionary, getProfile } from "@/lib/preferences";

// Pages outside an exam: setup, how it works, sources, privacy. The header
// always offers the way back into the student's own exam.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getDictionary();
  const profile = await getProfile();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="wrap flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
          <Link
            href="/"
            className="flex min-h-11 items-center no-underline"
            aria-label={`agrilok, ${t.nav.home}`}
          >
            <Wordmark />
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {profile ? (
              <Link href={contextPath(profile)} className="btn btn-secondary btn-sm">
                {t.nav.openStudy}
              </Link>
            ) : null}
            <ThemeToggle t={t} />
            <LanguageSwitch t={t} lang={lang} />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter t={t} />
    </div>
  );
}
