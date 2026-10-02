import Link from "next/link";

import { Bell, ChevronRight, Compass, ExternalLink } from "@/components/Icons";
import { OpenExamEditor } from "@/components/shell/OpenExamEditor";
import { PageHeader, Panel } from "@/components/ui/Blocks";
import { commissionSites } from "@/content/taxonomy";
import type { ExamContext } from "@/lib/contracts";
import { contextPath, type Section } from "@/lib/context";
import { nearestAvailable, noticesFor } from "@/lib/data";
import { fmt } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import { checkOfficialLink } from "@/lib/official-links";
import { contextLabel } from "@/lib/study-context";

// An exam whose syllabus is not in the library yet.
//
// Each destination keeps its own title and says, in its own words, what it
// cannot do without a syllabus. Showing one identical page under all five
// tabs made every tap look like it had failed. Nothing is substituted: another
// exam's syllabus is offered as a link the student chooses, never shown in
// this exam's place. Updates is not here at all, because notices do not need
// a syllabus and that page simply works.
//
// The exam is changed in the exam bar at the top, like everywhere else. This
// page offers a button that opens that editor; it does not carry a second set
// of pickers.

export type UnavailablePage = "home" | "syllabus" | "practice" | "ask" | "guide";

const SECTION: Record<UnavailablePage, Section> = {
  home: "",
  syllabus: "/syllabus",
  practice: "/practice",
  ask: "/ask",
  guide: "/guide",
};

export function Unavailable({
  page,
  ctx,
  t,
  lang,
  children,
}: {
  page: UnavailablePage;
  ctx: ExamContext;
  t: Dictionary;
  lang: Lang;
  /** Anything this destination can still show for the exam (Guidance's general advice). */
  children?: React.ReactNode;
}) {
  const u = t.unavailable;
  const base = contextPath(ctx);
  const site = checkOfficialLink(commissionSites[ctx.province]);
  const nearest = nearestAvailable(ctx);
  const notices = noticesFor(ctx).length;
  const title =
    page === "home"
      ? t.home.title
      : page === "syllabus"
        ? t.syllabus.title
        : page === "practice"
          ? t.practice.title
          : page === "ask"
            ? t.ask.title
            : t.guide.title;

  return (
    <div className="wrap" data-testid={`unavailable-${page}`}>
      <PageHeader title={title} />
      <div className="wash-block max-w-3xl space-y-3 px-5 py-6 sm:p-8">
        <p className="text-lead font-semibold text-ink">
          {fmt(u.notAdded, { context: contextLabel(ctx, t, lang) }, lang)}
        </p>
        <p className="text-ink-2">{u[page]}</p>
        <div className="pt-2">
          <OpenExamEditor
            href={`/start?level=${ctx.level}&province=${ctx.province}&group=${ctx.group}`}
            className="btn btn-primary"
          >
            {u.chooseAnother}
          </OpenExamEditor>
        </div>
      </div>

      {children ? <div className="mt-8">{children}</div> : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Panel id="still-works" level={2} icon={<Bell className="h-5 w-5" />} title={u.stillWorks}>
          <ul className="space-y-4">
            {notices > 0 ? (
              <li>
                <Link href={`${base}/updates`} className="link">
                  {u.updates}
                </Link>
                <p className="mt-1 text-small text-ink-2">{u.updatesBody}</p>
              </li>
            ) : null}
            {site.ok ? (
              <li>
                <a
                  href={site.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link inline-flex flex-wrap items-center gap-x-2"
                >
                  {t.context.commissionSite}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-normal text-ink-3">{site.host}</span>
                  <span className="sr-only">{t.common.externalHint}</span>
                </a>
                <p className="mt-1 text-small text-ink-2">{u.official}</p>
              </li>
            ) : null}
          </ul>
        </Panel>

        {nearest.length ? (
          <Panel
            id="nearest"
            level={2}
            icon={<Compass className="h-5 w-5" />}
            title={t.context.nearest}
          >
            <ul className="-mx-2 -my-1 divide-y divide-line">
              {nearest.map((option) => (
                <li key={contextPath(option)}>
                  <Link
                    href={`${contextPath(option)}${SECTION[page]}`}
                    className="row-link flex min-h-12 items-center justify-between gap-3 rounded-lg px-2 py-3 text-small font-semibold no-underline"
                  >
                    <span className="min-w-0">{contextLabel(option, t, lang)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
