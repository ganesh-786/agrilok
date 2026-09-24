import Link from "next/link";

import { ReviewBadge } from "@/components/Badges";
import { ArrowRight, ExternalLink } from "@/components/Icons";
import { SlashBreaks } from "@/components/SlashBreaks";
import { formatDate, labelFor } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import type { DocumentSummary, Label } from "@/lib/types";

// A syllabus row: what it is, who published it, when we fetched it, whether a
// person has checked it, and the way to the original. No excerpt of the text.
export function DocumentRow({
  doc,
  t,
  lang,
  groups,
}: {
  doc: DocumentSummary;
  t: Dictionary;
  lang: Lang;
  groups: Label[];
}) {
  return (
    <li className="border-t border-rule py-4 first:border-t-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1.5">
          <p className="font-semibold leading-snug">
            <Link href={`/documents/${encodeURIComponent(doc.id)}`} className="link">
              <SlashBreaks text={doc.title} />
            </Link>
          </p>
          <p className="text-sm text-ink-3">
            {doc.authority} · {t.level.fetched} {formatDate(doc.fetched_on, lang)}
          </p>
          {doc.service_groups.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {doc.service_groups.map((code) => (
                <li
                  key={code}
                  className="rounded bg-paper-2 px-1.5 py-0.5 text-[0.78rem] font-semibold text-ink-2"
                >
                  {labelFor(groups, code, lang)}
                </li>
              ))}
            </ul>
          ) : null}
          {doc.archived ? <p className="text-xs text-ink-3">{t.level.archived}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm">
          <ReviewBadge state={doc.review.state} t={t} />
          <a
            href={doc.resolvable_url}
            className="link inline-flex items-center gap-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.level.officialPdf}
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="sr-only">{t.common.externalHint}</span>
          </a>
          <Link
            href={`/documents/${encodeURIComponent(doc.id)}`}
            className="inline-flex items-center gap-1 font-semibold text-ink-2 no-underline hover:text-ink"
          >
            {t.level.details}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </li>
  );
}

export function DocumentsByProvince({
  docs,
  t,
  lang,
  provinces,
  groups,
}: {
  docs: DocumentSummary[];
  t: Dictionary;
  lang: Lang;
  provinces: Label[];
  groups: Label[];
}) {
  if (!docs.length) return <p className="text-ink-3">{t.level.noDocs}</p>;
  const order = provinces.map((p) => p.code);
  const byProvince = new Map<string, DocumentSummary[]>();
  for (const doc of docs) {
    byProvince.set(doc.province, [...(byProvince.get(doc.province) ?? []), doc]);
  }
  const keys = [...byProvince.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return (
    <div className="space-y-8">
      {keys.map((province) => (
        <section key={province} aria-labelledby={`province-${province}`}>
          <h3
            id={`province-${province}`}
            className="mb-1 font-sans text-sm font-bold uppercase tracking-wide text-ink-3"
          >
            {labelFor(provinces, province, lang)}
          </h3>
          <ul>
            {(byProvince.get(province) ?? []).map((doc) => (
              <DocumentRow key={doc.id} doc={doc} t={t} lang={lang} groups={groups} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
