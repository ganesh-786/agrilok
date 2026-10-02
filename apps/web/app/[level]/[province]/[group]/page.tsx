import type { Metadata } from "next";
import Link from "next/link";

import { Bell, Calendar, ChevronRight, Compass, Document } from "@/components/Icons";
import { ExamSummary } from "@/components/study/ExamSummary";
import { NextStep, OfflineCard, TodayPractice, WeakTopics } from "@/components/study/HomeCards";
import { NoticeRow } from "@/components/study/NoticeRow";
import { Unavailable } from "@/components/study/Unavailable";
import { PageHeader, Panel, Zone } from "@/components/ui/Blocks";
import { sameContext } from "@/lib/context";
import { noticesFor, questionsFor } from "@/lib/data";
import { nepalToday } from "@/lib/dates";
import { localDigits, tr } from "@/lib/format";
import { buildPlan, currentBlockIndex, daysLeft, priorities, recommendedLength } from "@/lib/plan";
import { getProfile } from "@/lib/preferences";
import { contextLabel, loadStudyContext, type ContextParams } from "@/lib/study-context";
import { buildIndex, examOfflineUrls } from "@/lib/study-index";

export async function generateMetadata({ params }: { params: ContextParams }): Promise<Metadata> {
  const { ctx, t, lang } = await loadStudyContext(params);
  return { title: contextLabel(ctx, t, lang) };
}

export default async function HomePage({ params }: { params: ContextParams }) {
  const { ctx, syllabus, base, lang, t } = await loadStudyContext(params);
  if (!syllabus) return <Unavailable page="home" ctx={ctx} t={t} lang={lang} />;

  const profile = await getProfile();
  const today = nepalToday();
  const examDate = profile && sameContext(profile, ctx) ? profile.examDate : null;
  const left = daysLeft(examDate, today);
  const length = recommendedLength(left);
  const plan = buildPlan(syllabus, length);
  const nowIndex = currentBlockIndex(plan, length, left);
  const now = plan[nowIndex];
  const subjectTitle = (id: string) =>
    tr(syllabus.subjects.find((s) => s.id === id)?.title ?? { ne: id, en: id }, lang);

  // "Start here": the first topic with a study note in the heaviest subject.
  const index = buildIndex(syllabus, base, lang);
  const order = priorities(syllabus);
  let startHere: { topicId: string; subjectTitle: string; questions: number } | null = null;
  for (const p of order) {
    const subject = syllabus.subjects.find((s) => s.id === p.subjectId);
    const topic = subject?.topics.find((tp) => index.topics[tp.id]?.hasNote) ?? subject?.topics[0];
    if (subject && topic && index.topics[topic.id]?.hasNote) {
      startHere = {
        topicId: topic.id,
        subjectTitle: tr(subject.title, lang),
        questions: p.questions,
      };
      break;
    }
  }

  const latest = noticesFor(ctx, today).find((view) => view.relevance === "mine");
  const questionTotal = questionsFor(syllabus).length;
  // Client cards get only their own strings, not the whole dictionary.
  const labels = { home: t.home, offline: t.offline, demo: t.demo, photoBy: t.common.photoBy };
  const examItem = {
    id: `exam:${base}`,
    kind: "exam" as const,
    label: t.home.offlineExamLabel,
    href: base,
    urls: examOfflineUrls(syllabus, base),
  };
  const setup = `/start?level=${ctx.level}&province=${ctx.province}&group=${ctx.group}`;
  const [daysBefore = "", daysAfter = ""] = t.home.daysToExam.split("{n}");
  const pair = "grid gap-4 lg:grid-cols-2 lg:gap-6";

  // Three groups, in the order a study session uses them: what to do now, how
  // it is going, and what the exam asks. Each thing is a panel with its own
  // icon and name, so a student finds one by looking, not by reading the page.
  // Saving for offline is a single strip at the foot: it is used rarely and
  // belongs to no group.
  return (
    <div className="wrap">
      <PageHeader title={t.home.title} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-6">
        <NextStep index={index} startHere={startHere} labels={labels} lang={lang} />
        {questionTotal > 0 ? (
          <TodayPractice
            index={index}
            size={Math.min(10, questionTotal)}
            labels={labels}
            lang={lang}
          />
        ) : null}
      </div>

      <Zone id="progress" title={t.home.progressTitle}>
        <div className={pair}>
          <Panel
            id="plan"
            icon={<Calendar className="h-5 w-5" />}
            title={t.home.planTitle}
            action={
              <Link href={`${base}/guide#plan`} className="link">
                {t.home.seePlan}
              </Link>
            }
          >
            {left === null ? (
              <>
                <p className="text-small text-ink-2">{t.home.planNoDate}</p>
                <div className="mt-auto pt-4">
                  <Link href={setup} className="btn btn-secondary btn-sm">
                    {t.home.addDate}
                  </Link>
                </div>
              </>
            ) : left < 0 ? (
              <>
                <p className="text-small font-semibold text-warning">{t.home.examPassed}</p>
                <div className="mt-auto pt-4">
                  <Link href={setup} className="btn btn-secondary btn-sm">
                    {t.home.addDate}
                  </Link>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="font-display text-headline" data-testid="days-to-exam">
                  {left === 0 ? (
                    t.home.examToday
                  ) : (
                    // The number is set large where the sentence has it, so
                    // the word order of each language is left alone.
                    <>
                      {daysBefore}
                      <span className="num text-display text-action-ink">
                        {localDigits(left, lang)}
                      </span>
                      {daysAfter}
                    </>
                  )}
                </p>
                {now ? (
                  <p className="text-small text-ink-2">
                    <span className="font-semibold text-ink">{t.home.thisPeriod}: </span>
                    {t.guide.focus[now.focus]}
                    {now.subjectIds.length
                      ? ` · ${now.subjectIds.map(subjectTitle).join(", ")}`
                      : ""}
                  </p>
                ) : null}
              </div>
            )}
          </Panel>

          <WeakTopics index={index} labels={labels} lang={lang} />
        </div>
      </Zone>

      <Zone
        id="exam-facts"
        title={t.home.examTitle}
        action={
          <Link href={`${base}/guide`} className="link">
            {t.home.fullGuide}
          </Link>
        }
      >
        <div className={pair}>
          <Panel
            id="structure"
            icon={<Document className="h-5 w-5" />}
            title={t.home.structureTitle}
          >
            <ExamSummary syllabus={syllabus} t={t} lang={lang} />
          </Panel>

          {/* The table on the left is tall; two shorter panels beside it
              keep the row level instead of leaving one long empty box. */}
          <div className="flex flex-col gap-4 lg:gap-6">
            <Panel
              id="latest"
              icon={<Bell className="h-5 w-5" />}
              title={t.home.noticeTitle}
              action={
                <Link href={`${base}/updates`} className="link">
                  {t.home.allUpdates}
                </Link>
              }
            >
              {latest ? (
                <div className="-mx-2 -my-2">
                  <NoticeRow
                    view={latest}
                    href={`${base}/updates/${latest.notice.id}`}
                    t={t}
                    lang={lang}
                  />
                </div>
              ) : (
                <p className="text-small text-ink-2">{t.home.noNotice}</p>
              )}
            </Panel>

            <Panel
              id="guidance"
              icon={<Compass className="h-5 w-5" />}
              title={t.home.guidanceTitle}
              className="flex-1"
            >
              <ul className="-mx-2 -my-1 divide-y divide-line">
                {[
                  { href: `${base}/guide#first`, label: t.home.guidanceFirst },
                  { href: `${base}/guide#plan`, label: t.home.guidancePlans },
                  { href: `${base}/guide#compare`, label: t.home.guidanceCompare },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="row-link flex min-h-12 items-center justify-between gap-3 rounded-lg px-2 py-3 text-small font-semibold no-underline"
                    >
                      {item.label}
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </Zone>

      <div className="mt-10 lg:mt-12">
        <OfflineCard examItem={examItem} labels={labels} lang={lang} />
      </div>
    </div>
  );
}
