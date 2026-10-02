import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExternalLink } from "@/components/Icons";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { DeadlineTag } from "@/components/study/NoticeRow";
import { Callout } from "@/components/ui/Callout";
import { PageHeader, SectionHeader } from "@/components/ui/Blocks";
import { DemoTag, Tag } from "@/components/ui/Tag";
import { getSimulation, noticeFor } from "@/lib/data";
import { fmt, formatDate, tr } from "@/lib/format";
import { checkOfficialLink } from "@/lib/official-links";
import { loadStudyContext } from "@/lib/study-context";
import { nepalToday } from "@/lib/dates";

type Params = Promise<{ level: string; province: string; group: string; noticeId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ctx, lang } = await loadStudyContext(params);
  const view = noticeFor(ctx, decodeURIComponent((await params).noticeId), nepalToday());
  return view ? { title: tr(view.notice.title, lang) } : {};
}

export default async function NoticePage({ params }: { params: Params }) {
  const { ctx, base, lang, t } = await loadStudyContext(params);
  const view = noticeFor(ctx, decodeURIComponent((await params).noticeId), nepalToday());
  if (!view) notFound();

  const { notice, deadline } = view;
  const simulation = await getSimulation();
  const source = checkOfficialLink(notice.officialUrl);
  const closed = deadline?.state === "closed";

  return (
    <article className="wrap">
      <Breadcrumbs
        label={t.nav.breadcrumb}
        trail={[
          { href: base, label: t.nav.home },
          { href: `${base}/updates`, label: t.nav.updates },
        ]}
        current={t.updates.notice}
        currentDetail={tr(notice.title, lang)}
      />
      <PageHeader plain title={tr(notice.title, lang)}>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Tag tone="outline">{t.updates.kinds[notice.kind]}</Tag>
          {notice.provenance === "demo" ? <DemoTag t={t} /> : null}
          <Tag tone={notice.checked ? "success" : "warning"}>
            {notice.checked ? t.reviewState.verified : t.updates.unchecked}
          </Tag>
          <DeadlineTag view={view} t={t} lang={lang} />
          {view.relevance === "other_commission" ? <Tag>{t.updates.otherCommission}</Tag> : null}
        </div>
      </PageHeader>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-12">
        <div className="order-2 min-w-0 space-y-5 xl:order-1">
          {!notice.checked ? (
            <Callout tone="warning" title={t.updates.unchecked}>
              {t.updates.uncheckedNote}
            </Callout>
          ) : null}
          {closed ? <Callout tone="info">{t.updates.expired}</Callout> : null}

          <section className="space-y-5" aria-labelledby="summary">
            <SectionHeader id="summary" title={t.updates.summaryTitle} />
            <p className="max-w-prose leading-[1.85] text-ink">{tr(notice.summary, lang)}</p>
            <dl className="grid gap-5 border-t border-line pt-5 text-small sm:grid-cols-2">
              <div>
                <dt className="text-ink-3">{t.updates.publishedLabel}</dt>
                <dd className="font-semibold text-ink">{formatDate(notice.publishedOn, lang)}</dd>
              </div>
              {notice.deadline ? (
                <div>
                  <dt className="text-ink-3">{t.updates.deadlineLabel}</dt>
                  <dd className="font-semibold text-ink">{formatDate(notice.deadline, lang)}</dd>
                </div>
              ) : null}
              {notice.eventOn ? (
                <div>
                  <dt className="text-ink-3">{t.updates.eventLabel}</dt>
                  <dd className="font-semibold text-ink">{formatDate(notice.eventOn, lang)}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-ink-3">{t.updates.appliesTo}</dt>
                <dd className="font-semibold text-ink">{tr(notice.publisher, lang)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="card order-1 min-w-0 space-y-4 p-5 xl:order-2" aria-labelledby="source">
          <SectionHeader id="source" title={t.session.source} />
          {simulation.sourcesUnavailable ? (
            <Callout tone="offline">{t.source.reasons.down}</Callout>
          ) : source.ok ? (
            <a
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary flex"
              data-testid="official-notice"
            >
              {t.updates.openOfficial}
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">{t.common.externalHint}</span>
            </a>
          ) : (
            <Callout tone="warning">
              {source.reason === "not_official"
                ? t.source.reasons.not_official
                : source.reason === "not_https"
                  ? t.source.reasons.not_https
                  : t.source.reasons.invalid}
            </Callout>
          )}
          <p className="text-caption text-ink-3">{tr(notice.publisher, lang)}</p>
          {source.ok ? (
            <p className="text-caption text-ink-3 [overflow-wrap:anywhere]">
              {fmt(t.source.opens, { host: source.host }, lang)}
            </p>
          ) : null}
        </section>
      </div>
    </article>
  );
}
