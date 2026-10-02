import Link from "next/link";

import { Flag } from "@/components/Icons";
import { OfficialDocumentLink } from "@/components/DocumentList";
import { SlashBreaks } from "@/components/SlashBreaks";
import { parseAnswer, type Inline } from "@/lib/answer-text";
import { REPO_URL } from "@/lib/config";
import { formatDate, localDigits } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import type { AskResponse, Citation } from "@/lib/types";

type Labels = Dictionary["answer"];

// Shared by the ask form (a client component) and the answer page (a server
// component), so it imports nothing server-only and renders no raw HTML.

function Inlines({ parts, prefix, lang }: { parts: Inline[]; prefix: string; lang: Lang }) {
  return (
    <>
      {parts.map((part, i) =>
        part.kind === "text" ? (
          <span key={i}>{part.text}</span>
        ) : (
          <a key={i} href={`#${prefix}-cite-${part.n}`} className="cite">
            {localDigits(part.n, lang)}
          </a>
        ),
      )}
    </>
  );
}

function ReviewLine({ result, labels, lang }: { result: AskResponse; labels: Labels; lang: Lang }) {
  const verified = result.review.state === "verified";
  return (
    <div
      className={`rounded-lg border p-4 text-small ${
        verified
          ? "border-success/40 bg-success-tint text-ink"
          : "border-dashed border-warning/60 bg-warning-tint text-ink"
      }`}
    >
      <p className={`font-semibold ${verified ? "text-success" : "text-warning"}`}>
        {verified ? labels.reviewVerified : labels.reviewPending}
      </p>
      {verified ? (
        <p>
          {labels.reviewVerifiedNote} {result.review.reviewed_by},{" "}
          {formatDate(result.review.reviewed_at, lang)}
          {result.review.self_review ? ` (${labels.selfReview})` : ""}
        </p>
      ) : (
        <p>{labels.reviewPendingNote}</p>
      )}
    </div>
  );
}

function CitationItem({
  citation,
  prefix,
  labels,
  lang,
  sourceLabels,
}: {
  citation: Citation;
  prefix: string;
  labels: Labels;
  lang: Lang;
  sourceLabels: Pick<Dictionary, "source" | "common">;
}) {
  const reference = citation.doc_class === "reference";
  return (
    <li
      id={`${prefix}-cite-${citation.n}`}
      className="border-t border-line pt-4 first:border-t-0 first:pt-0"
    >
      <div className="flex gap-3">
        <span className="code text-lead" aria-hidden="true">
          {localDigits(citation.n, lang)}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-semibold leading-snug">
            <Link href={`/documents/${encodeURIComponent(citation.document_id)}`} className="link">
              <SlashBreaks text={citation.document_title} />
            </Link>
          </p>
          <p className="text-caption text-ink-3">
            {reference ? labels.referenceDoc : labels.syllabusDoc}
            {citation.authority ? ` · ${citation.authority}` : ""}
            {citation.fetched_on
              ? ` · ${labels.fetched} ${formatDate(citation.fetched_on, lang)}`
              : ""}
          </p>
          {citation.quotes.map((quote, i) => (
            <blockquote
              key={i}
              className="border-l-2 border-ink bg-sunken px-4 py-3 text-small text-ink-2"
            >
              <span className="sr-only">{labels.quote}: </span>
              {quote}
            </blockquote>
          ))}
          <p
            className={`text-small font-semibold ${citation.review_state === "verified" ? "text-success" : "text-warning"}`}
          >
            {citation.review_state === "verified" ? labels.reviewVerified : labels.reviewPending}
          </p>
          <OfficialDocumentLink
            href={citation.resolvable_url}
            label={labels.officialDoc}
            t={sourceLabels}
          />
        </div>
      </div>
    </li>
  );
}

export function AnswerView({
  result,
  asked,
  labels,
  lang,
  siteUrl,
  prefix = "a",
  sourceLabels,
  headingLevel = 3,
}: {
  result: AskResponse;
  asked?: string;
  labels: Labels;
  lang: Lang;
  siteUrl: string;
  prefix?: string;
  sourceLabels: Pick<Dictionary, "source" | "common">;
  headingLevel?: 1 | 3;
}) {
  const blocks = result.answer_text ? parseAnswer(result.answer_text) : [];
  const answered = result.status === "answered";
  const Heading = headingLevel === 1 ? "h1" : "h3";
  // GitHub issue forms fill a field from a query parameter named after its id.
  const where = result.id ? `${siteUrl}/answers/${result.id}` : siteUrl;
  const reportUrl =
    `${REPO_URL}/issues/new?template=content_error.yml` +
    `&title=${encodeURIComponent(`[content]: answer ${result.id ?? ""}`)}` +
    `&where=${encodeURIComponent(where)}`;

  return (
    <article className="space-y-6" aria-live="polite">
      {asked && asked !== result.question && result.cache.kind === "similar" ? (
        <p className="text-small text-ink-3">
          {labels.youAsked}: <span className="text-ink-2">{asked}</span>
        </p>
      ) : null}

      {headingLevel === 1 || result.cache.kind !== "similar" || !result.cache.matched_question ? (
        <Heading className={headingLevel === 1 ? "text-headline" : "text-title"}>
          {result.question}
        </Heading>
      ) : null}
      {result.cache.kind === "similar" && result.cache.matched_question ? (
        <p className="rounded-lg border border-line bg-sunken px-4 py-3 text-small">
          {labels.similarNote}{" "}
          <span className="font-semibold">“{result.cache.matched_question}”</span>
        </p>
      ) : null}

      {answered ? (
        <>
          <div className="max-w-prose space-y-4 leading-[1.85]">
            {blocks.map((block, i) =>
              block.kind === "paragraph" ? (
                <p key={i}>
                  <Inlines parts={block.parts} prefix={prefix} lang={lang} />
                </p>
              ) : (
                <ul key={i} className="list-disc space-y-1.5 pl-5">
                  {block.items.map((item, j) => (
                    <li key={j}>
                      <Inlines parts={item} prefix={prefix} lang={lang} />
                    </li>
                  ))}
                </ul>
              ),
            )}
          </div>
          <ReviewLine result={result} labels={labels} lang={lang} />
          <section aria-labelledby={`${prefix}-sources`} className="space-y-3">
            <h2 id={`${prefix}-sources`} className="text-title">
              {labels.sources}
            </h2>
            <ol className="space-y-4">
              {result.citations.map((citation) => (
                <CitationItem
                  key={citation.n}
                  citation={citation}
                  prefix={prefix}
                  labels={labels}
                  lang={lang}
                  sourceLabels={sourceLabels}
                />
              ))}
            </ol>
          </section>
        </>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-surface px-4 py-3">
            <p className="font-semibold">{labels.refusalTitle}</p>
            <p className="text-ink-2">
              {result.reason ? labels.reasons[result.reason.code] : labels.reasons.no_sources}
            </p>
            {result.reason?.code === "quota" && result.retry_after ? (
              <p className="mt-1 text-small text-ink-3">
                {labels.retryAfter} {formatDate(result.retry_after, lang)}
              </p>
            ) : null}
          </div>
          {result.consulted.length ? (
            <div className="space-y-1.5 text-small">
              <p className="font-semibold">{labels.consultedTitle}</p>
              <p className="text-ink-3">{labels.consultedLead}</p>
              <ul className="space-y-1">
                {result.consulted.slice(0, 5).map((doc) => (
                  <li key={doc.document_id}>
                    <Link
                      href={`/documents/${encodeURIComponent(doc.document_id)}`}
                      className="link"
                    >
                      <SlashBreaks text={doc.title ?? doc.document_id} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-small text-ink-3">
        {result.id ? (
          <Link href={`/answers/${result.id}`} className="link">
            {labels.permalink}
          </Link>
        ) : null}
        {result.cache.hit && result.cache.served_count > 1 ? (
          <span>
            {localDigits(result.cache.served_count, lang)} {labels.served}
          </span>
        ) : null}
        {answered ? (
          <a
            href={reportUrl}
            className="link inline-flex items-center gap-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Flag className="h-3.5 w-3.5" />
            {labels.report}
          </a>
        ) : null}
      </p>
    </article>
  );
}
