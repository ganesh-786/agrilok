import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronLeft } from "@/components/Icons";
import { OfficialDocumentLink } from "@/components/DocumentList";
import { SlashBreaks } from "@/components/SlashBreaks";
import { ReviewLabel, Tag } from "@/components/ui/Tag";
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
    <div className="grid grid-cols-1 gap-1 border-t border-line py-4">
      <dt className="text-caption font-semibold text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words text-small">{children}</dd>
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
    <div className="wrap py-6 sm:py-8">
      <p className="text-small">
        <Link href={back} className="link inline-flex min-h-11 items-center gap-2">
          <ChevronLeft className="h-4 w-4 shrink-0" /> {t.document.back}
        </Link>
      </p>

      <header className="mt-5 max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {doc.exam_level ? (
            <Tag tone={doc.exam_level}>{t.levels[doc.exam_level].short}</Tag>
          ) : null}
          <Tag tone="neutral">
            {doc.doc_class === "reference" ? t.answer.referenceDoc : t.answer.syllabusDoc}
          </Tag>
          <ReviewLabel state={doc.review.state} t={t} />
        </div>
        <h1 className="text-headline">
          <SlashBreaks text={doc.title} />
        </h1>
        <p className="text-ink-2">{doc.authority}</p>
        <OfficialDocumentLink
          href={doc.resolvable_url}
          label={t.answer.officialDoc}
          t={t}
          className="btn btn-primary"
        />
        {doc.archived ? <p className="text-small text-ink-3">{t.library.archived}</p> : null}
      </header>

      <div className="mt-10 grid items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-labelledby="outline" className="ruled">
          <h2 id="outline" className="text-title">
            {t.document.outline}
          </h2>
          <p className="mt-1 text-small text-ink-3">{t.document.outlineLead}</p>
          {doc.outline.length ? (
            <ol className="mt-5 divide-y divide-line">
              {doc.outline.map((entry, i) => (
                <li key={`${entry.label}-${i}`} className="flex gap-4 py-3">
                  <span className="code w-8 shrink-0 text-right">
                    {entry.label ? localDigits(entry.label, lang) : "·"}
                  </span>
                  <span className="min-w-0">{entry.text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-ink-3">{t.document.noOutline}</p>
          )}
        </section>

        <section aria-labelledby="provenance" className="ruled">
          <h2 id="provenance" className="text-title">
            {t.document.reviewTitle}
          </h2>
          <dl className="mt-3 border-b border-line">
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
              <OfficialDocumentLink href={doc.source_url} label={t.document.officialLink} t={t} />
            </Row>
            {doc.referring_page ? (
              <Row label={t.document.referringPage}>
                <OfficialDocumentLink
                  href={doc.referring_page}
                  label={t.document.referringPage}
                  t={t}
                />
              </Row>
            ) : null}
            <Row label={t.document.extraction}>
              {doc.extraction_method === "ocr" ? t.document.ocr : t.document.textLayer}
              {" · "}
              {t.document.confidence} {localDigits(confidence, lang)}%
              {doc.gibberish_lines_dropped ? (
                <span className="block text-small text-ink-3">
                  {localDigits(doc.gibberish_lines_dropped, lang)} {t.document.droppedLines}
                </span>
              ) : null}
            </Row>
            <Row label={t.document.acquisition}>{doc.source_name}</Row>
            <Row label={t.document.size}>{formatBytes(doc.bytes, lang)}</Row>
            <Row label={t.document.checksum}>
              <code className="break-all text-caption">{doc.checksum}</code>
            </Row>
            <Row label={t.document.reviewTitle}>
              <ReviewLabel state={doc.review.state} t={t} />
              {doc.review.state === "verified" ? (
                <span className="mt-1 block text-small text-ink-2">
                  {t.answer.reviewVerifiedNote} {doc.review.reviewed_by},{" "}
                  {formatDate(doc.review.reviewed_at, lang)}
                  {doc.review.self_review ? ` (${t.answer.selfReview})` : ""}
                </span>
              ) : null}
            </Row>
          </dl>
        </section>
      </div>

      {doc.exam_level ? (
        <p className="mt-8">
          <Link
            href={`/${slugFromLevel(doc.exam_level)}?province=${doc.province}#ask`}
            className="btn btn-secondary"
          >
            {t.document.askAbout}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
