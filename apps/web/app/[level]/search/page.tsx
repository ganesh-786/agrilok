import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LevelBadge, ReviewBadge } from "@/components/Badges";
import { ExternalLink } from "@/components/Icons";
import { SlashBreaks } from "@/components/SlashBreaks";
import { api } from "@/lib/api";
import { formatDate, labelFor } from "@/lib/format";
import { levelFromSlug } from "@/lib/levels";
import { getDictionary } from "@/lib/preferences";

type Params = { level: string };
type Search = { q?: string; province?: string; group?: string };

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.search.title, robots: { index: false } };
}

export default async function SearchPage({
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
  const query = await searchParams;
  const q = (query.q ?? "").trim().slice(0, 200);
  const meta = await api.meta();
  if (!meta) notFound();
  const province = meta.provinces.some((p) => p.code === query.province)
    ? query.province
    : undefined;
  const group = meta.service_groups.some((g) => g.code === query.group) ? query.group : undefined;
  const results = q.length >= 2 ? await api.search(level, q, province, group) : null;

  return (
    <div className="wrap max-w-4xl py-8">
      <p className="text-sm">
        <Link href={`/${slug}`} className="link">
          ← {t.levels[level].name}
        </Link>
      </p>
      <h1 className="mt-3 text-3xl font-extrabold">{t.search.title}</h1>
      <form method="get" className="mt-4 flex gap-2">
        {province ? <input type="hidden" name="province" value={province} /> : null}
        {group ? <input type="hidden" name="group" value={group} /> : null}
        <label htmlFor="q" className="sr-only">
          {t.level.searchTitle}
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          required
          minLength={2}
          maxLength={200}
          className="field"
          placeholder={t.level.searchPlaceholder}
        />
        <button type="submit" className="btn btn-primary">
          {t.level.searchButton}
        </button>
      </form>
      <p className="mt-2 text-sm text-ink-3">{t.search.note}</p>

      {results ? (
        results.hits.length ? (
          <ol className="mt-8 space-y-5">
            {results.hits.map((hit) => (
              <li key={hit.chunk_id} className="border-t border-rule pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {hit.exam_level ? <LevelBadge level={hit.exam_level} t={t} lang={lang} /> : null}
                  <ReviewBadge state={hit.review_state} t={t} />
                  <span className="text-sm text-ink-3">
                    {labelFor(meta.provinces, hit.province, lang)} · {t.level.fetched}{" "}
                    {formatDate(hit.fetched_on, lang)}
                  </span>
                </div>
                <p className="mt-2 font-semibold">
                  <Link href={`/documents/${encodeURIComponent(hit.document_id)}`} className="link">
                    <SlashBreaks text={hit.document_title} />
                  </Link>
                </p>
                <p className="mt-1 border-l-2 border-mustard pl-3 text-ink-2">{hit.snippet}</p>
                <p className="mt-1 text-sm">
                  <a
                    href={hit.resolvable_url}
                    className="link inline-flex items-center gap-1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.level.officialPdf}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-8 rounded-[var(--radius-card)] border border-rule bg-card px-4 py-3">
            {t.search.none}
          </p>
        )
      ) : null}
    </div>
  );
}
