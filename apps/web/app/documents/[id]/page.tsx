import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LevelBadge, ReviewBadge } from "@/components/Badges";
import { ExternalLink } from "@/components/Icons";
import { SlashBreaks } from "@/components/SlashBreaks";
import { api } from "@/lib/api";
import { formatBytes, formatDate, labelFor, localDigits } from "@/lib/format";
import { slugFromLevel } from "@/lib/levels";
import { getDictionary } from "@/lib/preferences";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const doc = await api.document((await params).id).catch(() => null);
  return doc ? { title: doc.title, description: doc.authority } : {};
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-t border-rule py-2.5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-semibold text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default async function DocumentPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const [{ lang, t }, doc, meta] = await Promise.all([
    getDictionary(),
    api.document(id),
    api.meta(),
  ]);
  if (!doc || !meta) notFound();
  const back = doc.exam_level ? `/${slugFromLevel(doc.exam_level)}` : "/sources";
  const confidence = Math.round(doc.extraction_confidence * 100);

  return (
    <div className="wrap max-w-4xl py-8">
      <p className="text-sm">
        <Link href={back} className="link">
          ← {t.document.back}
        </Link>
      </p>

      <header className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {doc.exam_level ? <LevelBadge level={doc.exam_level} t={t} lang={lang} /> : null}
          <span className="rounded bg-paper-2 px-1.5 py-0.5 text-[0.78rem] font-semibold text-ink-2">
            {doc.doc_class === "reference" ? t.answer.referenceDoc : t.answer.syllabusDoc}
          </span>
          <ReviewBadge state={doc.review.state} t={t} />
        </div>
        <h1 className="text-[1.7rem] font-extrabold leading-snug sm:text-3xl">
          <SlashBreaks text={doc.title} />
        </h1>
        <p className="text-ink-2">{doc.authority}</p>
        <p>
          <a
            href={doc.resolvable_url}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.answer.officialDoc}
            <ExternalLink className="h-4 w-4" />
          </a>
        </p>
        {doc.archived ? <p className="text-sm text-ink-3">{t.level.archived}</p> : null}
      </header>

      <section aria-labelledby="outline" className="mt-10">
        <h2 id="outline" className="text-xl font-bold">
          {t.document.outline}
        </h2>
        <p className="mt-1 text-sm text-ink-3">{t.document.outlineLead}</p>
        {doc.outline.length ? (
          <ol className="mt-4 space-y-1.5">
            {doc.outline.map((entry, i) => (
              <li key={`${entry.label}-${i}`} className="flex gap-3">
                <span className="w-7 shrink-0 text-right font-serif font-bold text-ink-3">
                  {entry.label ? localDigits(entry.label, lang) : "·"}
                </span>
                <span>{entry.text}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-ink-3">{t.document.noOutline}</p>
        )}
      </section>

      <section aria-labelledby="provenance" className="mt-10">
        <h2 id="provenance" className="text-xl font-bold">
          {t.document.reviewTitle}
        </h2>
        <dl className="mt-3 border-b border-rule">
          <Row label={t.document.authority}>{doc.authority}</Row>
          {doc.exam_level ? (
            <Row label={t.document.level}>{t.levels[doc.exam_level].name}</Row>
          ) : null}
          <Row label={t.document.province}>{labelFor(meta.provinces, doc.province, lang)}</Row>
          {doc.service_groups.length ? (
            <Row label={t.document.groups}>
              {doc.service_groups.map((g) => labelFor(meta.service_groups, g, lang)).join(", ")}
            </Row>
          ) : null}
          <Row label={t.document.fetched}>{formatDate(doc.fetched_on, lang)}</Row>
          <Row label={t.document.officialLink}>
            <a href={doc.source_url} className="link break-all" rel="noopener noreferrer">
              {doc.source_url}
            </a>
          </Row>
          {doc.referring_page ? (
            <Row label={t.document.referringPage}>
              <a href={doc.referring_page} className="link break-all" rel="noopener noreferrer">
                {doc.referring_page}
              </a>
            </Row>
          ) : null}
          <Row label={t.document.extraction}>
            {doc.extraction_method === "ocr" ? t.document.ocr : t.document.textLayer}
            {" · "}
            {t.document.confidence} {localDigits(confidence, lang)}%
            {doc.gibberish_lines_dropped ? (
              <span className="block text-sm text-ink-3">
                {localDigits(doc.gibberish_lines_dropped, lang)} {t.document.droppedLines}
              </span>
            ) : null}
          </Row>
          <Row label={t.document.acquisition}>{doc.source_name}</Row>
          <Row label={t.document.size}>{formatBytes(doc.bytes, lang)}</Row>
          <Row label={t.document.checksum}>
            <code className="break-all text-xs">{doc.checksum}</code>
          </Row>
          <Row label={t.document.reviewTitle}>
            <ReviewBadge state={doc.review.state} t={t} />
            {doc.review.state === "verified" ? (
              <span className="mt-1 block text-sm text-ink-2">
                {t.answer.reviewVerifiedNote} {doc.review.reviewed_by},{" "}
                {formatDate(doc.review.reviewed_at, lang)}
                {doc.review.self_review ? ` (${t.answer.selfReview})` : ""}
              </span>
            ) : null}
          </Row>
        </dl>
      </section>

      {doc.exam_level ? (
        <p className="mt-8">
          <Link
            href={`/${slugFromLevel(doc.exam_level)}?province=${doc.province}#ask`}
            className="btn btn-quiet"
          >
            {t.document.askAbout}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
