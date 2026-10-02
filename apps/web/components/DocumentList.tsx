import Link from "next/link";

import { ArrowRight, ChevronRight, ExternalLink } from "@/components/Icons";
import { SlashBreaks } from "@/components/SlashBreaks";
import { ReviewLabel } from "@/components/ui/Tag";
import { formatDate, labelFor } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import type { DocumentSummary, Label } from "@/lib/types";
import { checkOfficialLink } from "@/lib/official-links";

/** Legacy library data uses the same verified-address policy as study citations. */
export function OfficialDocumentLink({
  href,
  label,
  t,
  className = "link",
}: {
  href: string;
  label: string;
  t: Pick<Dictionary, "source" | "common">;
  className?: string;
}) {
  const link = checkOfficialLink(href);
  if (!link.ok) {
    return (
      <span className="block text-small text-ink-2">
        <span className="font-semibold text-warning">{t.source.withheld}.</span>{" "}
        {t.source.reasons[link.reason]}
      </span>
    );
  }
  return (
    <span className="inline-flex max-w-full flex-col gap-1">
      <a
        href={link.href}
        className={`${className} inline-flex items-center gap-2`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
        <ExternalLink className="h-4 w-4 shrink-0" />
        <span className="sr-only">{t.common.externalHint}</span>
      </a>
      <span className="break-words text-caption text-ink-3">
        {link.host}
        {link.archived ? ` · ${t.source.archived}` : ""}
      </span>
    </span>
  );
}

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
    <li className="border-t border-line py-5 first:border-t-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 space-y-1.5">
          <p className="text-lead font-semibold">
            <Link href={`/documents/${encodeURIComponent(doc.id)}`} className="link">
              <SlashBreaks text={doc.title} />
            </Link>
          </p>
          <p className="text-small text-ink-3">
            {doc.authority} · {t.library.fetched} {formatDate(doc.fetched_on, lang)}
          </p>
          {doc.service_groups.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {doc.service_groups.map((code) => (
                <li
                  key={code}
                  className="rounded-md bg-sunken px-2 py-1 text-caption font-medium text-ink-2"
                >
                  {labelFor(groups, code, lang)}
                </li>
              ))}
            </ul>
          ) : null}
          {doc.archived ? <p className="text-caption text-ink-3">{t.library.archived}</p> : null}
        </div>
        <div className="flex flex-wrap items-start gap-4 text-small lg:max-w-64 lg:justify-end">
          <ReviewLabel state={doc.review.state} t={t} />
          <OfficialDocumentLink href={doc.resolvable_url} label={t.library.officialPdf} t={t} />
          <Link
            href={`/documents/${encodeURIComponent(doc.id)}`}
            className="link inline-flex min-h-11 items-center gap-2"
          >
            {t.library.details}
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
  if (!docs.length) return <p className="text-ink-3">{t.library.noDocs}</p>;
  const order = provinces.map((p) => p.code);
  const byProvince = new Map<string, DocumentSummary[]>();
  for (const doc of docs) {
    byProvince.set(doc.province, [...(byProvince.get(doc.province) ?? []), doc]);
  }
  const keys = [...byProvince.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return (
    <div className="space-y-3">
      {keys.map((province, index) => (
        <details key={province} className="reveal rounded-lg border border-line" open={index === 0}>
          <summary className="flex min-h-14 items-center justify-between gap-3 rounded-lg bg-sunken px-4 py-3">
            <h3 className="text-lead text-ink">{labelFor(provinces, province, lang)}</h3>
            <ChevronRight className="disclosure-icon h-5 w-5 shrink-0 text-ink-3" />
          </summary>
          <ul className="px-4">
            {(byProvince.get(province) ?? []).map((doc) => (
              <DocumentRow key={doc.id} doc={doc} t={t} lang={lang} groups={groups} />
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
