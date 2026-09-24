import Link from "next/link";

import { AnswerView } from "@/components/AnswerView";
import { Figure } from "@/components/Figure";
import { ArrowRight, PaddyStalk } from "@/components/Icons";
import { photos } from "@/content/photos";
import { api } from "@/lib/api";
import { SITE_URL } from "@/lib/config";
import { formatDate, localDigits } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import { getDictionary, getLite } from "@/lib/preferences";
import type { AskResponse, LevelCode, Meta } from "@/lib/types";

async function safe<T>(promise: Promise<T>): Promise<T | null> {
  // The home page still renders if the API is down; it just shows less.
  try {
    return await promise;
  } catch {
    return null;
  }
}

async function sampleAnswer(): Promise<AskResponse | null> {
  for (const level of ["level_7", "level_4"] as LevelCode[]) {
    const common = await safe(api.commonQuestions(level));
    const first = common?.[0];
    if (first) return safe(api.answer(first.id));
  }
  return null;
}

function LevelCard({
  level,
  t,
  lang,
  count,
}: {
  level: LevelCode;
  t: Dictionary;
  lang: Lang;
  count: number | null;
}) {
  const info = t.levels[level];
  const four = level === "level_4";
  return (
    <Link
      href={four ? "/level-4" : "/level-7"}
      className={`group flex items-stretch gap-4 rounded-[var(--radius-card)] border border-rule bg-card p-4 no-underline transition-colors hover:border-ink-3 sm:p-5 ${
        four ? "border-l-[6px] border-l-field" : "border-l-[6px] border-l-clay"
      }`}
    >
      <span
        aria-hidden="true"
        className={`font-serif text-[3.25rem] font-extrabold leading-none ${four ? "text-field" : "text-clay"}`}
      >
        {localDigits(four ? 4 : 7, lang)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-serif text-lg font-bold leading-snug text-ink">{info.name}</span>
        <span className="text-sm text-ink-2">{info.post}</span>
        <span className="mt-1 flex items-center justify-between gap-2 text-sm">
          <span className="text-ink-3">
            {count !== null ? `${localDigits(count, lang)} ${t.home.syllabiCount}` : ""}
          </span>
          <span
            className={`inline-flex items-center gap-1 font-semibold ${four ? "text-field" : "text-clay"}`}
          >
            {t.home.open}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </span>
    </Link>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-t border-rule pt-3">
      <p className="font-serif text-3xl font-extrabold leading-none text-ink">{value}</p>
      <p className="mt-2 text-sm text-ink-2">{label}</p>
    </div>
  );
}

export default async function HomePage() {
  const { lang, t } = await getDictionary();
  const lite = await getLite();
  const [meta, sample] = await Promise.all([safe(api.meta()), sampleAnswer()]);
  const library: Meta["library"] | null = meta?.library ?? null;

  return (
    <>
      <section className="wrap grid grid-cols-1 gap-8 pb-10 pt-8 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-start md:gap-12 md:pt-14">
        <div>
          <p className="eyebrow">{t.home.eyebrow}</p>
          <h1 className="mt-3 text-[1.9rem] font-extrabold tracking-tight sm:text-[2.35rem] md:text-[2.6rem]">
            {t.home.title}
          </h1>
          <p className="mt-4 max-w-prose text-[1.06rem] text-ink-2">{t.home.lede}</p>
          <h2 className="mt-8 font-sans text-sm font-bold text-ink-3">{t.home.choose}</h2>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <LevelCard
              level="level_4"
              t={t}
              lang={lang}
              count={library?.syllabi_by_level.level_4 ?? null}
            />
            <LevelCard
              level="level_7"
              t={t}
              lang={lang}
              count={library?.syllabi_by_level.level_7 ?? null}
            />
          </div>
        </div>
        <Figure
          photo={photos.mustardTerraces}
          lang={lang}
          lite={lite}
          priority
          sizes="(min-width: 768px) 38vw, 100vw"
          aspect="aspect-[4/3] md:aspect-[4/5]"
        />
      </section>

      <section className="rule">
        <div className="wrap py-10">
          <div className="flex items-center gap-3 text-field">
            <PaddyStalk />
            <h2 className="text-2xl font-bold text-ink">{t.home.whatTitle}</h2>
          </div>
          <ol className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            {t.home.what.map((item, i) => (
              <li key={item.title} className="border-t-2 border-ink pt-3">
                <p className="font-serif text-xl font-extrabold text-mustard" aria-hidden="true">
                  {localDigits(i + 1, lang)}
                </p>
                <h3 className="mt-1 text-lg font-bold">{item.title}</h3>
                <p className="mt-1.5 text-ink-2">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {sample ? (
        <section className="rule bg-paper-2">
          <div className="wrap grid grid-cols-1 gap-6 py-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-12">
            <div>
              <h2 className="text-2xl font-bold">{t.home.sampleTitle}</h2>
              <p className="mt-2 max-w-sm text-ink-2">{t.home.sampleLead}</p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-rule bg-card p-4 sm:p-6">
              <AnswerView
                result={sample}
                labels={t.answer}
                lang={lang}
                siteUrl={SITE_URL}
                prefix="sample"
              />
            </div>
          </div>
        </section>
      ) : null}

      {library ? (
        <section className="rule">
          <div className="wrap py-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-2xl font-bold">{t.home.libraryTitle}</h2>
              {library.last_fetched_on ? (
                <p className="text-sm text-ink-3">
                  {t.home.libraryFetched}: {formatDate(library.last_fetched_on, lang)}
                </p>
              ) : null}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
              <Stat value={localDigits(library.documents, lang)} label={t.home.libraryDocs} />
              <Stat
                value={localDigits(library.provinces.length, lang)}
                label={t.home.libraryProvinces}
              />
              <Stat
                value={localDigits(library.reference_documents, lang)}
                label={t.home.libraryReference}
              />
              <Stat
                value={localDigits(library.verified_documents, lang)}
                label={t.home.libraryVerified}
              />
            </div>
            <p className="mt-6">
              <Link href="/sources" className="link inline-flex items-center gap-1 font-semibold">
                {t.home.librarySources}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      <section className="rule">
        <div className="wrap grid grid-cols-1 gap-8 py-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center md:gap-12">
          <Figure
            photo={photos.harvest}
            lang={lang}
            lite={lite}
            sizes="(min-width: 768px) 40vw, 100vw"
          />
          <div>
            <h2 className="text-2xl font-bold">{t.home.limitsTitle}</h2>
            <ul className="mt-4 space-y-4">
              {t.home.limits.map((line) => (
                <li key={line} className="border-l-2 border-mustard pl-4 text-ink-2">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
