import Link from "next/link";

import { ChevronRight } from "@/components/Icons";
import { DemoTag, Tag } from "@/components/ui/Tag";
import type { NoticeView } from "@/lib/data";
import { fmt, formatDate, tr } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";

export function DeadlineTag({ view, t, lang }: { view: NoticeView; t: Dictionary; lang: Lang }) {
  const d = view.deadline;
  if (!d) return null;
  if (d.state === "closed") return <Tag tone="neutral">{t.updates.closed}</Tag>;
  if (d.daysLeft === 0) return <Tag tone="danger">{t.updates.closesToday}</Tag>;
  return (
    <Tag tone={d.state === "closing" ? "warning" : "neutral"}>
      {fmt(t.updates.daysLeft, { n: d.daysLeft }, lang)}
    </Tag>
  );
}

/** One notice in a list: type, title, publication date, deadline, relevance. */
export function NoticeRow({
  view,
  href,
  t,
  lang,
}: {
  view: NoticeView;
  href: string;
  t: Dictionary;
  lang: Lang;
}) {
  const n = view.notice;
  const closed = view.deadline?.state === "closed";
  return (
    <Link
      href={href}
      className="row-link group flex min-h-24 items-start gap-3 rounded-lg px-2 py-4 no-underline sm:gap-5"
    >
      <span className="min-w-0 flex-1 space-y-2">
        <span className="flex flex-wrap items-center gap-2">
          <Tag tone="outline">{t.updates.kinds[n.kind]}</Tag>
          {n.provenance === "demo" ? <DemoTag t={t} /> : null}
          <DeadlineTag view={view} t={t} lang={lang} />
          {view.relevance === "other_commission" ? (
            <Tag tone="neutral">{t.updates.otherCommission}</Tag>
          ) : null}
        </span>
        <span
          className={`block font-semibold leading-relaxed ${closed ? "text-ink-2" : "text-ink"}`}
        >
          {tr(n.title, lang)}
        </span>
        <span className="block space-y-1 text-caption text-ink-3">
          <span className="block">{tr(n.publisher, lang)}</span>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span>{fmt(t.updates.published, { date: formatDate(n.publishedOn, lang) }, lang)}</span>
            {n.deadline ? (
              <span>{fmt(t.updates.deadline, { date: formatDate(n.deadline, lang) }, lang)}</span>
            ) : null}
          </span>
          <span className={`block font-semibold ${n.checked ? "text-success" : "text-warning"}`}>
            {n.checked ? t.reviewState.verified : t.updates.unchecked}
          </span>
        </span>
      </span>
      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-ink-3 group-hover:text-ink" />
    </Link>
  );
}
