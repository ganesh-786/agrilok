import type { Metadata } from "next";
import Image from "next/image";

import { creditsPage } from "@/content/pages";
import { photos } from "@/content/photos";
import { getDictionary, getLite } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getDictionary();
  return { title: creditsPage[lang].title };
}

export default async function CreditsPage() {
  const { lang } = await getDictionary();
  const lite = await getLite();
  const c = creditsPage[lang];
  return (
    <div className="wrap max-w-4xl py-10">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{c.title}</h1>

      <section className="mt-8">
        <h2 className="text-2xl font-bold">{c.photosTitle}</h2>
        <p className="mt-2 text-ink-2">{c.photosLead}</p>
        <ul className="mt-5 divide-y divide-rule border-y border-rule">
          {Object.values(photos).map((photo) => (
            <li key={photo.source} className="flex gap-4 py-4">
              {lite ? null : (
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-paper-2">
                  <Image src={photo.image} alt="" fill sizes="96px" className="object-cover" />
                </div>
              )}
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{photo.alt[lang]}</p>
                <p className="text-ink-2">
                  {photo.place[lang]} · {photo.author} ·{" "}
                  <a href={photo.licenseUrl} className="link" rel="license noopener noreferrer">
                    {photo.license}
                  </a>
                </p>
                <p>
                  <a href={photo.source} className="link break-all" rel="noopener noreferrer">
                    {c.source}: Wikimedia Commons
                  </a>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rule mt-10 pt-8">
        <h2 className="text-xl font-bold">{c.fontsTitle}</h2>
        <p className="mt-2 text-ink-2">{c.fonts}</p>
      </section>
      <section className="rule mt-8 pt-8">
        <h2 className="text-xl font-bold">{c.softwareTitle}</h2>
        <p className="mt-2 text-ink-2">{c.software}</p>
      </section>
      <section className="rule mt-8 pt-8">
        <h2 className="text-xl font-bold">{c.documentsTitle}</h2>
        <p className="mt-2 text-ink-2">{c.documents}</p>
      </section>
    </div>
  );
}
