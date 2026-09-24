import Link from "next/link";

import { getDictionary } from "@/lib/preferences";

export default async function NotFound() {
  const { t } = await getDictionary();
  return (
    <div className="wrap max-w-xl py-16">
      <p className="font-serif text-6xl font-extrabold text-rule">404</p>
      <h1 className="mt-4 text-3xl font-extrabold">{t.common.notFoundTitle}</h1>
      <p className="mt-2 text-ink-2">{t.common.notFoundBody}</p>
      <p className="mt-6">
        <Link href="/" className="btn btn-primary">
          {t.common.goHome}
        </Link>
      </p>
    </div>
  );
}
