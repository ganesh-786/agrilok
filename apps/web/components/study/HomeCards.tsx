"use client";

import Link from "next/link";

import { ArrowRight, Book, Chart, Clock, Download, Target } from "@/components/Icons";
import { Meter, Panel, Skeleton } from "@/components/ui/Blocks";
import { LeadPhoto } from "@/components/ui/LeadPhoto";
import { Callout } from "@/components/ui/Callout";
import { OfflineSave } from "@/components/study/OfflineSave";
import { useOfflineReady } from "@/lib/client/connectivity";
import { useSavedItems, type SavedItem } from "@/lib/client/offline";
import { useProgress, useStorageAvailable } from "@/lib/client/progress";
import { nepalToday } from "@/lib/dates";
import { fmt, formatDateTime, localDigits } from "@/lib/format";
import type { Dictionary, Lang } from "@/lib/i18n";
import { dueQuestionIds, topicStats, weakTopics } from "@/lib/practice";
import type { StudyIndex } from "@/lib/study-index";

// Home's panels that depend on progress kept on this device. They render a
// skeleton until the browser has been read, so a returning student never sees
// a wrong "start here" flash before their own progress appears.

type HomeLabels = Pick<Dictionary, "home" | "offline" | "demo"> & { photoBy: string };

function NextStepCard({
  title,
  topic,
  body,
  href,
  action,
  studied,
  photoBy,
}: {
  title: string;
  topic: string;
  body: string;
  href: string;
  action: string;
  /** How far through the syllabus this device has got; absent before it is known. */
  studied?: { done: number; total: number; label: string; percent: string };
  photoBy: string;
}) {
  // From the top: what this is, the topic, why it is next, how far along, and
  // then the one button, each with clear space above it. The progress bar sits
  // over the button, never beside it, so the two are not read as one control.
  return (
    <section aria-labelledby="next-step" className="lead-block">
      <LeadPhoto photo="paddyTerraces" credit={photoBy} />
      <div className="lead-body flex h-full flex-col items-start px-5 pb-6 pt-4 sm:p-8">
        <p className="flex items-center gap-2.5 text-small font-bold">
          <span className="icon-chip" aria-hidden="true">
            <Book className="h-5 w-5" />
          </span>
          {title}
        </p>
        <h2 id="next-step" className="mt-4 text-headline">
          {topic}
        </h2>
        <p className="lead-block-quiet mt-2 text-small">{body}</p>
        {studied ? (
          <div className="mt-6 w-full max-w-md" data-testid="hero-progress">
            <p className="mb-2 flex items-baseline justify-between gap-4 text-small">
              <span className="font-semibold">{studied.label}</span>
              <span className="num lead-block-quiet">{studied.percent}</span>
            </p>
            <div className="hero-meter" role="img" aria-label={studied.label}>
              {/* Nothing studied draws no fill at all: an empty bar must look empty. */}
              {studied.done > 0 ? (
                <span style={{ width: `${(studied.done / Math.max(studied.total, 1)) * 100}%` }} />
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="mt-auto pt-7">
          <Link href={href} className="btn btn-on-hero">
            {action}
            <ArrowRight className="btn-arrow h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function NextStep({
  index,
  startHere,
  labels,
  lang,
}: {
  index: StudyIndex;
  startHere: { topicId: string; subjectTitle: string; questions: number } | null;
  labels: HomeLabels;
  lang: Lang;
}) {
  const progress = useProgress(index.syllabusId);
  const initialTopic = startHere ? index.topics[startHere.topicId] : undefined;
  const initialBody = startHere
    ? fmt(
        labels.home.startHereBody,
        { subject: startHere.subjectTitle, n: startHere.questions },
        lang,
      )
    : "";
  if (progress === null) {
    return (
      <>
        <div className="home-device-loading min-h-72 rounded-2xl bg-sunken p-6 sm:p-8">
          <Skeleton lines={3} />
        </div>
        <noscript>
          <style>{`.home-device-loading, .home-offline .skeleton { display: none; }`}</style>
          {initialTopic && startHere ? (
            <NextStepCard
              title={labels.home.startHere}
              topic={initialTopic.title}
              body={initialBody}
              href={`${index.base}/syllabus/${encodeURIComponent(startHere.topicId)}`}
              action={labels.home.openTopic}
              photoBy={labels.photoBy}
            />
          ) : null}
        </noscript>
      </>
    );
  }
  const last = progress.lastTopicId ? index.topics[progress.lastTopicId] : undefined;
  const topicId = last ? progress.lastTopicId : startHere?.topicId;
  const topic = topicId ? index.topics[topicId] : undefined;
  if (!topic || !topicId) return null;
  const total = Object.keys(index.topics).length;
  // A topic counts once, and only while it is still in the syllabus on screen.
  const done = Object.keys(progress.studied).filter((id) => index.topics[id]).length;
  // One visually dominant next step; progress decides whether to start or
  // resume. The block reserves space during device storage hydration.
  return (
    <NextStepCard
      title={last ? labels.home.continueTitle : labels.home.startHere}
      topic={topic.title}
      body={
        last
          ? `${topic.subjectTitle} · ${labels.home.continueBody}`
          : startHere
            ? initialBody
            : topic.subjectTitle
      }
      href={`${index.base}/syllabus/${encodeURIComponent(topicId)}`}
      action={labels.home.openTopic}
      studied={{
        done,
        total,
        label: fmt(labels.home.studiedCount, { n: done, total }, lang),
        percent: `${localDigits(total ? Math.round((done / total) * 100) : 0, lang)}%`,
      }}
      photoBy={labels.photoBy}
    />
  );
}

export function TodayPractice({
  index,
  size,
  labels,
  lang,
}: {
  index: StudyIndex;
  size: number;
  labels: HomeLabels;
  lang: Lang;
}) {
  const progress = useProgress(index.syllabusId);
  const due = progress ? dueQuestionIds(progress, nepalToday()).length : 0;
  return (
    <Panel
      id="today-practice"
      level={2}
      icon={<Target className="h-5 w-5" />}
      title={labels.home.practiceTitle}
    >
      <p className="font-display text-title">
        {fmt(labels.home.practiceBody, { n: size, m: size }, lang)}
      </p>
      {due > 0 ? (
        <p className="mt-3 flex items-start gap-2 text-small text-ink-2">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          {fmt(labels.home.practiceDue, { n: Math.min(due, size) }, lang)}
        </p>
      ) : null}
      <Link
        href={`${index.base}/practice/session?mode=quick`}
        className="btn btn-secondary mt-auto w-full"
      >
        {labels.home.startPractice}
      </Link>
    </Panel>
  );
}

export function WeakTopics({
  index,
  labels,
  lang,
}: {
  index: StudyIndex;
  labels: HomeLabels;
  lang: Lang;
}) {
  const progress = useProgress(index.syllabusId);
  const weak = progress ? weakTopics(topicStats(progress, index.questionTopic)).slice(0, 3) : [];
  return (
    <Panel id="weak-topics" icon={<Chart className="h-5 w-5" />} title={labels.home.weakTitle}>
      {progress === null ? (
        <div className="home-device-loading">
          <Skeleton lines={2} />
        </div>
      ) : weak.length === 0 ? (
        <p className="text-small text-ink-2">{labels.home.weakEmpty}</p>
      ) : (
        <ul className="-mx-2 -mt-1 space-y-1">
          {weak.map((stat) => {
            const topic = index.topics[stat.topicId];
            if (!topic) return null;
            const label = fmt(
              labels.home.weakItem,
              { right: stat.correct, total: stat.attempts },
              lang,
            );
            return (
              <li key={stat.topicId}>
                <Link
                  href={`${index.base}/practice/session?mode=topic&topic=${encodeURIComponent(stat.topicId)}`}
                  className="row-link block rounded-lg px-2 py-2.5 no-underline"
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="font-semibold text-ink">
                      <span className="code mr-1.5">{topic.code}</span>
                      {topic.title}
                    </span>
                    <span className="num shrink-0 text-small text-ink-3">{label}</span>
                  </span>
                  <span className="mt-2 block">
                    <Meter value={stat.correct} max={stat.attempts} label={label} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function OfflineCard({
  examItem,
  labels,
  lang,
}: {
  examItem: Omit<SavedItem, "savedAt">;
  labels: HomeLabels;
  lang: Lang;
}) {
  const saved = useSavedItems();
  const ready = useOfflineReady();
  const storage = useStorageAvailable();
  // A strip, not a panel in a group: what is saved on the left, the one
  // action on the right, stacked on a phone.
  return (
    <section
      aria-labelledby="offline"
      className="home-offline card flex flex-col gap-x-10 gap-y-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="icon-chip" aria-hidden="true">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 id="offline" className="font-sans text-lead font-bold leading-snug">
            {labels.home.offlineTitle}
          </h2>
          {saved === null ? (
            <Skeleton lines={2} />
          ) : saved.length === 0 ? (
            <p className="text-small text-ink-2">{labels.home.offlineNothing}</p>
          ) : (
            <div className="space-y-2">
              <p className="text-small font-semibold text-ink">
                {fmt(labels.home.offlineCount, { n: saved.length }, lang)}
              </p>
              <ul className="space-y-1 text-small text-ink-2">
                {saved.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="link">
                      {item.label}
                    </Link>{" "}
                    <span className="text-caption text-ink-3">
                      ·{" "}
                      {fmt(labels.home.savedAt, { time: formatDateTime(item.savedAt, lang) }, lang)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {storage === false ? (
            <Callout tone="warning">{labels.offline.storageBlocked}</Callout>
          ) : ready === false ? (
            <p className="text-caption text-ink-3">{labels.home.offlineNotReady}</p>
          ) : ready ? (
            <p className="text-caption text-ink-3">{labels.home.offlineReady}</p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0">
        <OfflineSave
          item={examItem}
          labels={{ ...labels.offline, save: labels.home.offlineSaveExam }}
          variant="secondary"
        />
      </div>
    </section>
  );
}
