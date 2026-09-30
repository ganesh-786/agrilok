import Link from "next/link";

import { LogoMark } from "@/components/Logo";
import { getDictionary } from "@/lib/preferences";

// Served by the service worker when a page is not cached and there is no
// network. It is itself cached on install, so it always opens.
export default async function OfflinePage() {
  const { t } = await getDictionary();
  return (
    <div className="wrap max-w-xl py-16 text-center">
      <LogoMark size={48} className="mx-auto" />
      <h1 className="mt-6 text-3xl font-extrabold">{t.common.offlineTitle}</h1>
      <p className="mt-3 text-ink-2">{t.common.offlineBody}</p>
      <p className="mt-6">
        <Link href="/" className="btn btn-quiet">
          {t.common.goHome}
        </Link>
      </p>
    </div>
  );
}
