import Link from "next/link";

import { LogoMark } from "@/components/Logo";
import type { Dictionary } from "@/lib/i18n";

const REPO_URL = "https://github.com/ganesh-786/agrilok";

export function SiteFooter({ t }: { t: Dictionary }) {
  return (
    <footer className="mt-16 border-t border-rule bg-paper-2">
      <div className="wrap grid grid-cols-1 gap-6 py-10 text-sm text-ink-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-ink">
            <LogoMark size={24} />
            <span className="font-serif font-bold">agrilok</span>
          </div>
          <p className="max-w-prose">{t.footer.independent}</p>
          <p className="font-semibold text-ink">{t.footer.free}</p>
        </div>
        <div className="space-y-2">
          <ul className="space-y-1.5">
            <li>
              <Link href="/how-it-works" className="link">
                {t.nav.how}
              </Link>
            </li>
            <li>
              <Link href="/sources" className="link">
                {t.nav.sources}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="link">
                {t.footer.privacy}
              </Link>
            </li>
            <li>
              <Link href="/credits" className="link">
                {t.footer.credits}
              </Link>
            </li>
            <li>
              <a href={REPO_URL} className="link" rel="noopener noreferrer">
                {t.footer.code}
              </a>
            </li>
          </ul>
          <p className="pt-2 text-xs text-ink-3">{t.footer.license}</p>
        </div>
      </div>
    </footer>
  );
}
