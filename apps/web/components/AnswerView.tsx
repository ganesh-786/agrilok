import Link from "next/link";

import { ExternalLink, Flag } from "@/components/Icons";
import { SlashBreaks } from "@/components/SlashBreaks";
import { parseAnswer, type Inline } from "@/lib/answer-text";
import { formatDate, localDigits } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import type { AskResponse, Citation } from "@/lib/types";

const REPO_URL = "https://github.com/ganesh-786/agrilok";

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
      className={`rounded-[var(--radius-card)] border px-3.5 py-2.5 text-sm ${
        verified
          ? "border-ok/40 bg-ok-tint text-ink"
          : "border-dashed border-warn/60 bg-mustard-tint text-ink"
      }`}
    >
      <p className={`font-bold ${verified ? "text-ok" : "text-warn"}`}>
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
}: {
  citation: Citation;
  prefix: string;
  labels: Labels;
  lang: Lang;
}) {
  const reference = citation.doc_class === "reference";
  return (
    <li id={`${prefix}-cite-${citation.n}`} className="scroll-mt-24 border-t border-rule pt-3">
      <div className="flex gap-3">
        <span className="font-serif text-lg font-extrabold text-field" aria-hidden="true">
          {localDigits(citation.n, lang)}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-semibold leading-snug">
            <Link href={`/documents/${encodeURIComponent(citation.document_id)}`} className="link">
              <SlashBreaks text={citation.document_title} />
            </Link>
          </p>
          <p className="text-xs text-ink-3">
            {reference ? labels.referenceDoc : labels.syllabusDoc}
            {citation.authority ? ` · ${citation.authority}` : ""}
            {citation.fetched_on
              ? ` · ${labels.fetched} ${formatDate(citation.fetched_on, lang)}`
              : ""}
          </p>
          {citation.quotes.map((quote, i) => (
            <blockquote
              key={i}
              className="border-l-2 border-mustard bg-card px-3 py-1.5 text-[0.92rem] text-ink-2"
            >
              <span className="sr-only">{labels.quote}: </span>
              {quote}
            </blockquote>
          ))}
          <p className="text-sm">
            <a
              href={citation.resolvable_url}
              className="link inline-flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              {labels.officialDoc}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
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
}: {
  result: AskResponse;
  asked?: string;
  labels: Labels;
  lang: Lang;
  siteUrl: string;
  prefix?: string;
}) {
  const blocks = result.answer_text ? parseAnswer(result.answer_text) : [];
  const answered = result.status === "answered";
  // GitHub issue forms fill a field from a query parameter named after its id.
  const where = result.id ? `${siteUrl}/answers/${result.id}` : siteUrl;
  const reportUrl =
    `${REPO_URL}/issues/new?template=content_error.yml` +
    `&title=${encodeURIComponent(`[content]: answer ${result.id ?? ""}`)}` +
    `&where=${encodeURIComponent(where)}`;

  return (
    <article className="space-y-5" aria-live="polite">
      {asked && asked !== result.question && result.cache.kind === "similar" ? (
        <p className="text-sm text-ink-3">
          {labels.youAsked}: <span className="text-ink-2">{asked}</span>
        </p>
      ) : null}

      {result.cache.kind === "similar" && result.cache.matched_question ? (
        <p className="rounded-[var(--radius-card)] border border-rule bg-card px-3.5 py-2.5 text-sm">
          {labels.similarNote}{" "}
          <span className="font-semibold">“{result.cache.matched_question}”</span>
        </p>
      ) : (
        <h3 className="font-serif text-xl font-bold leading-snug">{result.question}</h3>
      )}

      {answered ? (
        <>
          <div className="space-y-3 text-[1.02rem] leading-[1.8]">
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
            <h4 id={`${prefix}-sources`} className="eyebrow uppercase">
              {labels.sources}
            </h4>
            <ol className="space-y-3">
              {result.citations.map((citation) => (
                <CitationItem
                  key={citation.n}
                  citation={citation}
                  prefix={prefix}
                  labels={labels}
                  lang={lang}
                />
              ))}
            </ol>
          </section>
        </>
      ) : (
        <div className="space-y-3">
          <div className="rounded-[var(--radius-card)] border border-rule bg-card px-4 py-3">
            <p className="font-bold">{labels.refusalTitle}</p>
            <p className="text-ink-2">
              {result.reason ? labels.reasons[result.reason.code] : labels.reasons.no_sources}
            </p>
            {result.reason?.code === "quota" && result.retry_after ? (
              <p className="mt-1 text-sm text-ink-3">
                {labels.retryAfter} {formatDate(result.retry_after, lang)}
              </p>
            ) : null}
          </div>
          {result.consulted.length ? (
            <div className="space-y-1.5 text-sm">
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

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3">
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
