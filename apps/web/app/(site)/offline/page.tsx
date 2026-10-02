import Link from "next/link";

import { WifiOff } from "@/components/Icons";
import { getDictionary } from "@/lib/preferences";

// Served by the service worker when a page is not cached and there is no
// network. It is itself cached on install, so it always opens.
export default async function OfflinePage() {
  const { t } = await getDictionary();
  return (
    <div className="wrap-narrow py-10 sm:py-14">
      <div className="max-w-xl">
        <WifiOff className="h-8 w-8 text-ink-2" />
        <h1 className="mt-5 text-headline">{t.common.offlineTitle}</h1>
        <p className="mt-3 text-ink-2">{t.common.offlineBody}</p>
        <p className="mt-6">
          <Link href="/" className="btn btn-primary">
            {t.common.goHome}
          </Link>
        </p>
      </div>
    </div>
  );
}
