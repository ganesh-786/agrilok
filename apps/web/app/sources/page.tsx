import type { Metadata } from "next";
import Link from "next/link";

import { DocumentRow, DocumentsByProvince } from "@/components/DocumentList";
import { sourcesPage } from "@/content/pages";
import { api } from "@/lib/api";
import { getDictionary } from "@/lib/preferences";
import type { LevelCode } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getDictionary();
  return { title: sourcesPage[lang].title, description: sourcesPage[lang].lede };
}

export default async function SourcesPage() {
  const { lang, t } = await getDictionary();
  const c = sourcesPage[lang];
  const meta = await api.meta();
  const levels: LevelCode[] = ["level_4", "level_7"];
  const libraries = await Promise.all(levels.map((level) => api.levelDocuments(level)));
  const reference = libraries[0]?.reference ?? [];

  return (
    <div className="wrap max-w-5xl py-10">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{c.title}</h1>
      <p className="mt-4 max-w-prose text-lg text-ink-2">{c.lede}</p>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold">{c.ruleTitle}</h2>
          <p className="mt-2 text-ink-2">{c.rule}</p>
        </section>
        <section>
          <h2 className="text-xl font-bold">{c.collectedTitle}</h2>
          <p className="mt-2 text-ink-2">{c.collected}</p>
        </section>
      </div>

      {meta
        ? levels.map((level, i) => (
            <section key={level} className="rule mt-10 pt-8" aria-labelledby={`sources-${level}`}>
              <h2 id={`sources-${level}`} className="text-2xl font-bold">
                <Link href={level === "level_4" ? "/level-4" : "/level-7"} className="no-underline">
                  {t.levels[level].name}
                </Link>
              </h2>
              <div className="mt-4">
                <DocumentsByProvince
                  docs={libraries[i]?.syllabi ?? []}
                  t={t}
                  lang={lang}
                  provinces={meta.provinces}
                  groups={meta.service_groups}
                />
              </div>
            </section>
          ))
        : null}

      {meta && reference.length ? (
        <section className="rule mt-10 pt-8">
          <h2 className="text-2xl font-bold">{t.level.referenceTitle}</h2>
          <p className="mt-1 text-ink-2">{t.level.referenceLead}</p>
          <ul className="mt-4">
            {reference.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} t={t} lang={lang} groups={meta.service_groups} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rule mt-10 pt-8">
        <h2 className="text-xl font-bold">{c.takedownTitle}</h2>
        <p className="mt-2 text-ink-2">{c.takedown}</p>
      </section>
    </div>
  );
}
