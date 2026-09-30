import type { Metadata } from "next";

import { privacyPage } from "@/content/pages";
import { getDictionary } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getDictionary();
  return { title: privacyPage[lang].title };
}

export default async function PrivacyPage() {
  const { lang } = await getDictionary();
  const c = privacyPage[lang];
  return (
    <div className="wrap max-w-3xl py-10">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{c.title}</h1>
      <ul className="mt-6 space-y-4">
        {c.points.map((point) => (
          <li key={point} className="border-l-2 border-field pl-4 text-ink-2">
            {point}
          </li>
        ))}
      </ul>
      <p className="mt-8 text-ink-2">{c.contact}</p>
    </div>
  );
}
