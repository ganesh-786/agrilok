import type { Metadata } from "next";

import { privacyPage } from "@/content/pages";
import { PageHeader } from "@/components/ui/Blocks";
import { getDictionary } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getDictionary();
  return { title: privacyPage[lang].title };
}

export default async function PrivacyPage() {
  const { lang } = await getDictionary();
  const c = privacyPage[lang];
  return (
    <div className="wrap-narrow">
      <PageHeader title={c.title} />
      <article>
        <ul className="divide-y divide-line border-t border-line">
          {c.points.map((point) => (
            <li key={point} className="py-5 text-ink-2">
              {point}
            </li>
          ))}
        </ul>
        <p className="break-words border-t border-line pt-6 text-small text-ink-2">{c.contact}</p>
      </article>
    </div>
  );
}
