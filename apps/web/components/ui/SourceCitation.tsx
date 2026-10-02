import { ExternalLink } from "@/components/Icons";
import { Tag } from "@/components/ui/Tag";
import type { Citation } from "@/lib/contracts";
import { fmt, formatDate, localDigits, tr } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import { checkOfficialLink } from "@/lib/official-links";

// A source, shown the same way everywhere. An address becomes a link only if
// it is a verified official site (the owner's decision 6); otherwise the
// source is still named, the link is withheld, and the reason is given. The
// host is always printed, so a student sees where a link goes before tapping.
//
// Shared by server and client components, so it imports nothing server-only.

type Labels = Pick<Dictionary, "source" | "common">;

function OfficialAnchor({
  href,
  label,
  host,
  archived,
  labels,
  lang,
}: {
  href: string;
  label: string;
  host: string;
  archived: boolean;
  labels: Labels;
  lang: Lang;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="link inline-flex flex-wrap items-center gap-x-1.5 font-semibold"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
      <span className="text-caption font-normal text-ink-3 no-underline">
        {fmt(labels.source.opens, { host }, lang)}
        {archived ? ` · ${labels.source.archived}` : ""}
      </span>
      <span className="sr-only"> {labels.common.externalHint}</span>
    </a>
  );
}

function Withheld({
  reason,
  labels,
}: {
  reason: keyof Dictionary["source"]["reasons"];
  labels: Labels;
}) {
  return (
    <p className="text-small text-ink-3">
      <span className="font-semibold text-warning">{labels.source.withheld}.</span>{" "}
      {labels.source.reasons[reason]}
    </p>
  );
}

export function SourceCitation({
  citation,
  lang,
  labels,
  n,
  sourcesDown = false,
  id,
}: {
  citation: Citation;
  lang: Lang;
  labels: Labels;
  n?: number;
  sourcesDown?: boolean;
  id?: string;
}) {
  const marker =
    n !== undefined ? (
      <span className="code w-6 shrink-0" aria-hidden="true">
        {localDigits(n, lang)}
      </span>
    ) : null;

  if (citation.kind === "placeholder") {
    const link = citation.homepage ? checkOfficialLink(citation.homepage) : null;
    return (
      <div id={id} className="flex gap-2">
        {marker}
        <div className="min-w-0 flex-1 space-y-1.5">
          <Tag tone="demo">{labels.source.placeholderLabel}</Tag>
          <p className="text-small text-ink-2">
            {labels.source.placeholderBody}{" "}
            <span className="font-semibold text-ink">{tr(citation.publisher, lang)}</span>
          </p>
          {link?.ok && !sourcesDown ? (
            <p className="text-small">
              <OfficialAnchor
                href={link.href}
                label={labels.source.publisherSite}
                host={link.host}
                archived={link.archived}
                labels={labels}
                lang={lang}
              />
            </p>
          ) : link && !link.ok ? (
            <Withheld reason={link.reason} labels={labels} />
          ) : sourcesDown && link ? (
            <Withheld reason="down" labels={labels} />
          ) : (
            <p className="text-small text-ink-3">{labels.source.noSiteYet}</p>
          )}
        </div>
      </div>
    );
  }

  const doc = citation.document;
  const file = checkOfficialLink(doc.url);
  const page = doc.referringPage ? checkOfficialLink(doc.referringPage) : null;
  const quoteDiffers = citation.quote && citation.quote.lang !== lang;
  return (
    <div id={id} className="flex gap-2">
      {marker}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-semibold leading-snug">{tr(doc.title, lang)}</p>
        <p className="text-caption text-ink-3">
          {tr(doc.publisher, lang)}
          {doc.printedDate ? ` · ${tr(doc.printedDate, lang)}` : ""}
          {` · ${fmt(labels.source.fetched, { date: formatDate(doc.fetchedOn, lang) }, lang)}`}
        </p>
        <p className="text-small">
          <span className="text-ink-3">{labels.source.where}: </span>
          {tr(citation.locator, lang)}
        </p>
        {citation.quote ? (
          <figure className="space-y-1">
            <blockquote
              lang={citation.quote.lang}
              className="border-l-2 border-ink bg-sunken px-3 py-2 text-small text-ink"
            >
              <span className="sr-only">{labels.source.quote}: </span>
              {citation.quote.text}
            </blockquote>
            {quoteDiffers && citation.quote.translation ? (
              <figcaption className="text-caption text-ink-3">
                {labels.source.meaning}: {tr(citation.quote.translation, lang)}
              </figcaption>
            ) : null}
          </figure>
        ) : null}
        {sourcesDown ? (
          <Withheld reason="down" labels={labels} />
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-small">
            {file.ok ? (
              <OfficialAnchor
                href={file.href}
                label={labels.source.officialDoc}
                host={file.host}
                archived={file.archived}
                labels={labels}
                lang={lang}
              />
            ) : (
              <Withheld reason={file.reason} labels={labels} />
            )}
            {page?.ok ? (
              <OfficialAnchor
                href={page.href}
                label={labels.source.officialPage}
                host={page.host}
                archived={page.archived}
                labels={labels}
                lang={lang}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
