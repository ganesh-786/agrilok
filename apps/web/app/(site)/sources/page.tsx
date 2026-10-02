import type { Metadata } from "next";
import Link from "next/link";

import { DocumentRow, DocumentsByProvince } from "@/components/DocumentList";
import { Callout } from "@/components/ui/Callout";
import { PageHeader } from "@/components/ui/Blocks";
import { sourcesPage } from "@/content/pages";
import { groupNames, provinceNames } from "@/content/taxonomy";
import { api } from "@/lib/api";
import { GROUPS, PROVINCES } from "@/lib/contracts";
import { getDictionary } from "@/lib/preferences";
import type { LevelCode } from "@/lib/types";

// Names already ship with the app and are checked against the database seed.
// Reading sources must not depend on /meta's unrelated live-answer quota reads.
const provinces = PROVINCES.map((code) => ({
  code,
  name_ne: provinceNames[code].short.ne,
  name_en: provinceNames[code].short.en,
}));
const groups = GROUPS.map((code) => ({
  code,
  name_ne: groupNames[code].ne,
  name_en: groupNames[code].en,
}));

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getDictionary();
  return { title: sourcesPage[lang].title, description: sourcesPage[lang].lede };
}

export default async function SourcesPage() {
  const { lang, t } = await getDictionary();
  const c = sourcesPage[lang];
  const levels: LevelCode[] = ["level_4", "level_7"];
  const libraries = await Promise.all(
    levels.map((level) => api.levelDocuments(level).catch(() => null)),
  );
  const reference = libraries.find((library) => library !== null)?.reference ?? [];
  const unavailable = libraries.some((library) => !library);

  return (
    <div className="wrap">
      <PageHeader title={c.title} lead={c.lede} />

      <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
        <section className="ruled">
          <h2 className="text-title">{c.ruleTitle}</h2>
          <p className="mt-2 text-ink-2">{c.rule}</p>
        </section>
        <section className="ruled">
          <h2 className="text-title">{c.collectedTitle}</h2>
          <p className="mt-2 text-ink-2">{c.collected}</p>
        </section>
      </div>

      {unavailable ? (
        <div className="mt-8">
          <Callout tone="warning" title={t.common.errorTitle}>
            <p>{t.common.errorBody}</p>
            {/* A full navigation retries the failed library request even on this same URL. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/sources" className="btn btn-primary mt-4">
              {t.common.retry}
            </a>
          </Callout>
        </div>
      ) : null}

      {levels.map((level, i) =>
        libraries[i] ? (
          <section key={level} className="ruled mt-10" aria-labelledby={`sources-${level}`}>
            <h2 id={`sources-${level}`} className="text-headline">
              <Link href={level === "level_4" ? "/level-4" : "/level-7"} className="no-underline">
                {t.levels[level].name}
              </Link>
            </h2>
            <div className="mt-4">
              <DocumentsByProvince
                docs={libraries[i]?.syllabi ?? []}
                t={t}
                lang={lang}
                provinces={provinces}
                groups={groups}
              />
            </div>
          </section>
        ) : null,
      )}

      {reference.length ? (
        <section className="ruled mt-10">
          <h2 className="text-headline">{t.library.referenceTitle}</h2>
          <p className="mt-1 text-ink-2">{t.library.referenceLead}</p>
          <ul className="mt-4">
            {reference.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} t={t} lang={lang} groups={groups} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="ruled mt-10">
        <h2 className="text-title">{c.takedownTitle}</h2>
        <p className="mt-2 max-w-prose break-words text-small text-ink-2">{c.takedown}</p>
      </section>
    </div>
  );
}
