import Link from "next/link";

import { getDictionary } from "@/lib/preferences";

// A topic, question or notice id that does not exist in this exam. The shell
// stays, so the five destinations are still one tap away.
export default async function StudyNotFound() {
  const { t } = await getDictionary();
  return (
    <div className="wrap-narrow py-10">
      <div className="space-y-3">
        <h1 className="text-headline">{t.common.notFoundTitle}</h1>
        <p className="text-ink-2">{t.common.notFoundBody}</p>
        <Link href="/" className="btn btn-secondary">
          {t.common.goHome}
        </Link>
      </div>
    </div>
  );
}
