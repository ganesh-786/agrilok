import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AskForm } from "@/components/AskForm";
import { ReviewBadge } from "@/components/Badges";
import { DocumentRow, DocumentsByProvince } from "@/components/DocumentList";
import { Figure } from "@/components/Figure";
import { ArrowRight, Search } from "@/components/Icons";
import { SaveOffline } from "@/components/SaveOffline";
import { photos } from "@/content/photos";
import { api } from "@/lib/api";
import { SITE_URL } from "@/lib/config";
import { labelFor, localDigits } from "@/lib/format";
import { dictionaries } from "@/lib/i18n";
import { levelFromSlug } from "@/lib/levels";
import { getDictionary, getLite } from "@/lib/preferences";

type Params = { level: string };
type Search = { province?: string; group?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const level = levelFromSlug((await params).level);
  if (!level) return {};
  const { lang } = await getDictionary();
  const info = dictionaries[lang].levels[level];
  return { title: info.name, description: info.post };
}

export default async function LevelPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { level: slug } = await params;
  const level = levelFromSlug(slug);
  if (!level) notFound();
  const { lang, t } = await getDictionary();
  const lite = await getLite();
  const query = await searchParams;

  const meta = await api.meta();
  if (!meta) notFound();
  // Only known codes reach the API; anything else is quietly ignored.
  const province = meta.provinces.some((p) => p.code === query.province)
    ? query.province
    : undefined;
  const group = meta.service_groups.some((g) => g.code === query.group) ? query.group : undefined;

  const [library, commonOrNull] = await Promise.all([
    api.levelDocuments(level, province, group),
    api.commonQuestions(level).catch(() => null),
  ]);
  const common = commonOrNull ?? [];
  const syllabi = library?.syllabi ?? [];
  const reference = library?.reference ?? [];
  const four = level === "level_4";
  const info = t.levels[level];
  const tone = four ? "text-field" : "text-clay";
  const provincesWithDocs = meta.provinces.filter((p) =>
    (meta.library.provinces ?? []).includes(p.code),
  );

  return (
    <>
      <section className={`border-b-4 ${four ? "border-field" : "border-clay"}`}>
        <div className="wrap grid grid-cols-1 gap-6 pb-8 pt-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] md:items-end">
          <div>
            <p className={`eyebrow ${tone}`}>{t.level.eyebrow}</p>
            <h1 className="mt-2 flex items-baseline gap-3 text-[2rem] font-extrabold sm:text-[2.5rem]">
              <span className={`font-serif text-[3.2rem] leading-none sm:text-[4rem] ${tone}`}>
                {localDigits(four ? 4 : 7, lang)}
              </span>
              <span>{info.name}</span>
            </h1>
            <p className="mt-3 max-w-prose text-lg text-ink-2">{info.post}</p>
            <p className="mt-1 max-w-prose text-ink-3">{info.blurb}</p>
            {!four ? (
              <p className="mt-4 max-w-prose border-l-2 border-mustard bg-mustard-tint px-3 py-2 text-sm text-ink">
                {t.level.level7Notice}
              </p>
            ) : null}
          </div>
          <Figure
            photo={four ? photos.ripePaddy : photos.terraces}
            lang={lang}
            lite={lite}
            priority
            sizes="(min-width: 768px) 30vw, 100vw"
            aspect="aspect-[16/10]"
            className="hidden md:block"
          />
        </div>
      </section>

      <div className="wrap grid grid-cols-1 gap-10 py-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:gap-12">
        <div className="space-y-10">
          <section aria-labelledby="ask">
            <h2 id="ask" className="text-2xl font-bold">
              {t.level.askTitle}
            </h2>
            <p className="mt-1 text-ink-2">{t.level.askLead}</p>
            <div className="mt-4">
              <AskForm
                level={level}
                province={province}
                group={group}
                askLabels={t.ask}
                answerLabels={t.answer}
                lang={lang}
                siteUrl={SITE_URL}
              />
            </div>
          </section>

          {common.length ? (
            <section aria-labelledby="common" className="rule pt-8">
              <h2 id="common" className="text-2xl font-bold">
                {t.level.commonTitle}
              </h2>
              <p className="mt-1 text-sm text-ink-3">{t.level.commonLead}</p>
              <ul className="mt-4 divide-y divide-rule border-y border-rule">
                {common.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/answers/${item.id}`}
                      className="flex items-start justify-between gap-4 py-3 no-underline hover:bg-card"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug text-ink">
                          {item.question}
                        </span>
                        {item.province ? (
                          <span className="text-sm text-ink-3">
                            {labelFor(meta.provinces, item.province, lang)}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <ReviewBadge state={item.review.state} t={t} compact />
                        <ArrowRight className={`h-4 w-4 ${tone}`} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-8 lg:pt-1">
          <form
            method="get"
            className="space-y-3 rounded-[var(--radius-card)] border border-rule bg-card p-4"
          >
            <div>
              <label htmlFor="province" className="mb-1 block text-sm font-semibold">
                {t.level.province}
              </label>
              <select id="province" name="province" defaultValue={province ?? ""} className="field">
                <option value="">{t.level.allProvinces}</option>
                {provincesWithDocs.map((p) => (
                  <option key={p.code} value={p.code}>
                    {lang === "ne" ? p.name_ne : p.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="group" className="mb-1 block text-sm font-semibold">
                {t.level.group}
              </label>
              <select id="group" name="group" defaultValue={group ?? ""} className="field">
                <option value="">{t.level.allGroups}</option>
                {meta.service_groups.map((g) => (
                  <option key={g.code} value={g.code}>
                    {lang === "ne" ? g.name_ne : g.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="btn btn-primary">
                {t.level.apply}
              </button>
              {province || group ? (
                <Link href={`/${slug}`} className="link text-sm">
                  {t.level.clear}
                </Link>
              ) : null}
            </div>
          </form>

          <form method="get" action={`/${slug}/search`} className="space-y-2">
            <h2 className="text-lg font-bold">{t.level.searchTitle}</h2>
            <p className="text-sm text-ink-3">{t.level.searchLead}</p>
            {province ? <input type="hidden" name="province" value={province} /> : null}
            {group ? <input type="hidden" name="group" value={group} /> : null}
            <div className="flex gap-2">
              <label htmlFor="q" className="sr-only">
                {t.level.searchTitle}
              </label>
              <input
                id="q"
                name="q"
                required
                minLength={2}
                maxLength={200}
                placeholder={t.level.searchPlaceholder}
                className="field"
              />
              <button
                type="submit"
                className="btn btn-quiet px-3"
                aria-label={t.level.searchButton}
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </form>

          <SaveOffline
            packUrl={`/api/offline-pack?level=${slug}`}
            labels={{
              save: t.level.offlineSave,
              saving: t.level.offlineSaving,
              saved: t.level.offlineSaved,
              failed: t.level.offlineFailed,
              unsupported: t.level.offlineUnsupported,
            }}
          />
        </aside>
      </div>

      <section aria-labelledby="library" className="rule">
        <div className="wrap py-10">
          <h2 id="library" className="text-2xl font-bold">
            {t.level.libraryTitle}
          </h2>
          <p className="mt-1 text-ink-2">{t.level.libraryLead}</p>
          <div className="mt-6">
            <DocumentsByProvince
              docs={syllabi}
              t={t}
              lang={lang}
              provinces={meta.provinces}
              groups={meta.service_groups}
            />
          </div>
        </div>
      </section>

      {reference.length ? (
        <section aria-labelledby="reference" className="rule bg-paper-2">
          <div className="wrap py-10">
            <h2 id="reference" className="text-2xl font-bold">
              {t.level.referenceTitle}
            </h2>
            <p className="mt-1 text-ink-2">{t.level.referenceLead}</p>
            <ul className="mt-4">
              {reference.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  t={t}
                  lang={lang}
                  groups={meta.service_groups}
                />
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
