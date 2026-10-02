import Link from "next/link";

import { LogoMark } from "@/components/Logo";
import { REPO_URL } from "@/lib/config";
import type { Dictionary } from "@/lib/i18n";

export function SiteFooter({ t }: { t: Dictionary }) {
  return (
    <footer className="mt-14 border-t border-line">
      <div className="wrap grid grid-cols-1 gap-8 py-8 text-small text-ink-2 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-ink">
            <LogoMark size={24} />
            <span className="font-semibold">agrilok</span>
          </div>
          <p className="max-w-lg">{t.footer.independent}</p>
          <p className="font-semibold text-ink">{t.footer.free}</p>
        </div>
        <div className="space-y-2">
          <ul className="grid grid-cols-2 gap-x-5 gap-y-1">
            <li>
              <Link href="/how-it-works" className="link inline-flex min-h-11 items-center">
                {t.nav.how}
              </Link>
            </li>
            <li>
              <Link href="/sources" className="link inline-flex min-h-11 items-center">
                {t.nav.sources}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="link inline-flex min-h-11 items-center">
                {t.footer.privacy}
              </Link>
            </li>
            <li>
              <a
                href={REPO_URL}
                className="link inline-flex min-h-11 items-center"
                rel="noopener noreferrer"
              >
                {t.footer.code}
              </a>
            </li>
          </ul>
          <p className="pt-2 text-caption">{t.footer.license}</p>
        </div>
      </div>
    </footer>
  );
}
