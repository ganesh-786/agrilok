import type { Metadata } from "next";
import Image from "next/image";

import { creditsPage } from "@/content/pages";
import { photos } from "@/content/photos";
import { PageHeader } from "@/components/ui/Blocks";
import { getDictionary } from "@/lib/preferences";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getDictionary();
  return { title: creditsPage[lang].title };
}

export default async function CreditsPage() {
  const { lang } = await getDictionary();
  const c = creditsPage[lang];
  return (
    <div className="wrap-narrow">
      <PageHeader title={c.title} />
      <article>
        <section className="ruled" id="photos">
          <h2 className="text-title">{c.photosTitle}</h2>
          <p className="mt-2 text-ink-2">{c.photosLead}</p>
          <ul className="mt-4 divide-y divide-line">
            {Object.values(photos).map((photo) => (
              <li key={photo.source} className="flex gap-4 py-4">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-sunken">
                  <Image src={photo.image} alt="" fill sizes="96px" className="object-cover" />
                </div>
                <div className="min-w-0 text-small">
                  <p className="font-semibold text-ink">{photo.caption[lang]}</p>
                  <p className="text-ink-2">
                    {photo.place[lang]} · {photo.author} ·{" "}
                    <a href={photo.licenseUrl} className="link" rel="license noopener noreferrer">
                      {photo.license}
                    </a>
                  </p>
                  <p>
                    <a href={photo.source} className="link" rel="noopener noreferrer">
                      {c.source}: Wikimedia Commons
                    </a>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="ruled mt-8">
          <h2 className="text-title">{c.fontsTitle}</h2>
          <p className="mt-2 text-ink-2">{c.fonts}</p>
        </section>
        <section className="ruled mt-8">
          <h2 className="text-title">{c.softwareTitle}</h2>
          <p className="mt-2 text-ink-2">{c.software}</p>
        </section>
        <section className="ruled mt-8">
          <h2 className="text-title">{c.documentsTitle}</h2>
          <p className="mt-2 text-ink-2">{c.documents}</p>
        </section>
      </article>
    </div>
  );
}
