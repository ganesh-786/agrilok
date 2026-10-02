import Link from "next/link";

import { ChevronDown } from "@/components/Icons";
import { ExamSwitcher } from "@/components/shell/ExamSwitcher";
import { groupNames, provinceNames } from "@/content/taxonomy";
import { GROUPS, LEVELS, PROVINCES, type ExamContext } from "@/lib/contracts";
import { contextPath } from "@/lib/context";
import { availability } from "@/lib/data";
import { fmt } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import { slugFromLevel } from "@/lib/levels";
import { contextLabel } from "@/lib/study-context";

// The exam a study screen belongs to, in the exam's own colour and in words,
// on every study page. It is also the one place the exam is changed: the row
// is a native disclosure, so it opens by touch, mouse or keyboard, with or
// without JavaScript, and the editor appears in place instead of sending the
// student away to setup.
//
// Everything about "which exam" lives here and nowhere else on the page. When
// the exam on screen is not the saved one (a shared link, or a look at another
// exam), the bar says so itself: a short label beside the name, and inside the
// editor the saved exam with the way back to it.
export function ExamBar({
  ctx,
  t,
  lang,
  mine,
}: {
  ctx: ExamContext;
  t: Dictionary;
  lang: Lang;
  /** The saved exam, when it is not the one on screen. */
  mine: ExamContext | null;
}) {
  return (
    <div
      className="study-exam exam-bar sticky top-0 z-20 lg:top-[var(--masthead-h,3.75rem)]"
      data-testid="exam-bar"
    >
      <details className="reveal" id="exam">
        <summary className="wrap flex min-h-12 items-center justify-between gap-3 py-1.5 text-small font-semibold">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 py-1">
            <span className="min-w-0">
              <span className="sr-only">{t.context.label}: </span>
              <span data-testid="exam-label">
                {[
                  t.levels[ctx.level].short,
                  provinceNames[ctx.province].short[lang],
                  groupNames[ctx.group][lang],
                ].join(" · ")}
              </span>
            </span>
            {mine ? (
              <span
                className="exam-viewing rounded-md px-2 py-0.5 text-caption font-semibold"
                data-testid="exam-viewing"
                title={t.context.mismatchTitle}
              >
                {t.context.browsing}
              </span>
            ) : null}
          </span>
          <span className="exam-change inline-flex min-h-9 shrink-0 items-center gap-1.5 px-2.5 py-1">
            {/* The short word on a phone leaves the exam's own name the room. */}
            <span className="sm:hidden">{t.context.change}</span>
            <span className="hidden sm:inline">{t.context.changeExam}</span>
            <ChevronDown className="disclosure-icon disclosure-icon-down h-4 w-4 shrink-0" />
          </span>
        </summary>
        <div className="border-b border-line bg-canvas text-ink">
          <div className="wrap space-y-5 py-5">
            {mine ? (
              <p
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-sunken px-4 py-3 text-small text-ink-2"
                data-testid="exam-saved"
              >
                <span className="min-w-0">
                  {fmt(t.context.mismatchBody, { mine: contextLabel(mine, t, lang) }, lang)}
                </span>
                <Link href={contextPath(mine)} className="link shrink-0">
                  {t.context.goToMine}
                </Link>
              </p>
            ) : null}
            <ExamSwitcher
              current={{
                level: slugFromLevel(ctx.level),
                province: ctx.province,
                group: ctx.group,
              }}
              levels={LEVELS.map((code) => ({
                value: slugFromLevel(code),
                code,
                label: t.levels[code].name,
              }))}
              provinces={PROVINCES.map((code) => ({
                value: code,
                code,
                label: provinceNames[code].full[lang],
              }))}
              groups={GROUPS.map((code) => ({
                value: code,
                code,
                label: groupNames[code][lang],
              }))}
              available={availability()}
              saveDefault={!mine}
              labels={{
                context: t.context,
                level: t.start.levelLegend,
                province: t.start.provinceLegend,
                group: t.start.groupLegend,
                available: t.start.available,
                notAvailable: t.start.notAvailable,
                cancel: t.common.cancel,
              }}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
