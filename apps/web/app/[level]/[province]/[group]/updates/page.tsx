import type { Metadata } from "next";
import Link from "next/link";

import { NoticeRow } from "@/components/study/NoticeRow";
import { ChipLinks, EmptyState, PageHeader } from "@/components/ui/Blocks";
import { noticesFor } from "@/lib/data";
import { nepalToday } from "@/lib/dates";
import { loadStudyContext, type ContextParams } from "@/lib/study-context";
import type { NoticeKind } from "@/lib/contracts";

const KINDS = ["all", "vacancy", "exam", "syllabus", "policy", "result"] as const;
type KindFilter = (typeof KINDS)[number];

type Search = { kind?: string; scope?: string };

function isKind(value: string | undefined): value is KindFilter {
  return !!value && (KINDS as readonly string[]).includes(value);
}

export async function generateMetadata({ params }: { params: ContextParams }): Promise<Metadata> {
  const { t } = await loadStudyContext(params);
  return { title: t.updates.title };
}

export default async function UpdatesPage({
  params,
  searchParams,
}: {
  params: ContextParams;
  searchParams: Promise<Search>;
}) {
  // Notices belong to a level and a commission, not to a syllabus, so this
  // page works for every exam, including one whose syllabus is not in the
  // library yet.
  const { ctx, base, lang, t } = await loadStudyContext(params);

  const query = await searchParams;
  const kind: KindFilter = isKind(query.kind) ? query.kind : "all";
  const scope = query.scope === "all" ? "all" : "mine";
  const views = noticesFor(ctx, nepalToday()).filter((view) => {
    if (scope === "mine" && view.relevance !== "mine") return false;
    return kind === "all" || view.notice.kind === (kind as NoticeKind);
  });
  const queryFor = (nextKind: KindFilter, nextScope: string) => {
    const params = new URLSearchParams();
    if (nextKind !== "all") params.set("kind", nextKind);
    if (nextScope !== "mine") params.set("scope", nextScope);
    const queryString = params.toString();
    return `${base}/updates${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <div className="wrap">
      <PageHeader title={t.updates.title} lead={t.updates.lead} />
      <div className="space-y-5">
        <div className="flex flex-wrap items-start gap-x-10 gap-y-3">
          <div className="min-w-0 space-y-1">
            <h2 className="text-caption font-semibold text-ink-2">{t.updates.kindLabel}</h2>
            <ChipLinks
              label={t.updates.kindLabel}
              items={KINDS.map((item) => ({
                href: queryFor(item, scope),
                label: t.updates.kinds[item],
                active: item === kind,
              }))}
            />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-caption font-semibold text-ink-2">{t.updates.scopeLabel}</h2>
            <ChipLinks
              label={t.updates.scopeLabel}
              items={(["mine", "all"] as const).map((item) => ({
                href: queryFor(kind, item),
                label: t.updates.scopes[item],
                active: item === scope,
              }))}
            />
          </div>
        </div>

        <section aria-label={t.updates.title} className="min-w-0">
          {views.length ? (
            <ul className="divide-y divide-line border-y border-line" aria-label={t.updates.title}>
              {views.map((view) => (
                <li key={view.notice.id}>
                  <NoticeRow
                    view={view}
                    href={`${base}/updates/${encodeURIComponent(view.notice.id)}`}
                    t={t}
                    lang={lang}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t.updates.empty}>
              <Link href={`${base}/updates`} className="link font-semibold">
                {t.updates.showAll}
              </Link>
            </EmptyState>
          )}
          <p className="mt-6 max-w-prose text-small text-ink-2">{t.updates.uncheckedNote}</p>
        </section>
      </div>
    </div>
  );
}
