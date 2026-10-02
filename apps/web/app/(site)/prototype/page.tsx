import type { Metadata } from "next";

import { setSimulation } from "@/app/actions";
import { ResetDemo } from "@/components/prototype/ResetDemo";
import { PageHeader, RowLink, RowList, SectionHeader } from "@/components/ui/Blocks";
import { contextPath, parseContext } from "@/lib/context";
import { notesFor, practiceQuestions, syllabusFor, topicsInOrder, getSimulation } from "@/lib/data";
import { getDictionary } from "@/lib/preferences";

export const metadata: Metadata = { title: "Prototype tools" };

const LEVEL_4 = parseContext({ level: "level-4", province: "lumbini", group: "agri-extension" });
const LEVEL_7 = parseContext({ level: "level-7", province: "lumbini", group: "agri-extension" });
const NO_SYLLABUS = parseContext({ level: "level-4", province: "karnali", group: "fisheries" });

export default async function PrototypePage() {
  const { t } = await getDictionary();
  const simulation = await getSimulation();
  const level4Syllabus = LEVEL_4 ? syllabusFor(LEVEL_4) : null;
  const level4Notes = level4Syllabus ? notesFor(level4Syllabus) : null;
  const level4Questions = level4Syllabus ? practiceQuestions(level4Syllabus) : [];
  const noNoteTopic =
    level4Syllabus && level4Notes
      ? topicsInOrder(level4Syllabus).find(({ topic }) => !level4Notes.has(topic.id))?.topic
      : null;
  const noQuestionsTopic = level4Syllabus
    ? topicsInOrder(level4Syllabus).find(
        ({ topic }) => !level4Questions.some((question) => question.topicId === topic.id),
      )?.topic
    : null;

  return (
    <div className="wrap">
      <PageHeader title={t.prototype.title} lead={t.prototype.lead} />

      <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="ruled space-y-4" aria-labelledby="simulations-title">
          <div>
            <SectionHeader id="simulations-title" title={t.prototype.simulations} />
            <p className="mt-1 text-small text-ink-2">{t.ask.toolsFree}</p>
          </div>
          <form action={setSimulation} className="space-y-3">
            <label className="choice">
              <input type="checkbox" name="ai" defaultChecked={simulation.aiUnavailable} />
              <span className="text-small">{t.prototype.ai}</span>
            </label>
            <label className="choice">
              <input
                type="checkbox"
                name="sources"
                defaultChecked={simulation.sourcesUnavailable}
              />
              <span className="text-small">{t.prototype.sources}</span>
            </label>
            <button type="submit" className="btn btn-primary">
              {t.prototype.apply}
            </button>
          </form>
        </section>

        <section className="ruled space-y-3" aria-labelledby="jumps-title">
          <SectionHeader id="jumps-title" title={t.prototype.jumps} />
          <RowList label={t.prototype.jumps}>
            {NO_SYLLABUS ? (
              <li>
                <RowLink href={contextPath(NO_SYLLABUS)} title={t.prototype.jumpNoSyllabus} />
              </li>
            ) : null}
            {LEVEL_7 ? (
              <li>
                <RowLink href={contextPath(LEVEL_7)} title={t.prototype.jumpLevel7} />
              </li>
            ) : null}
            {LEVEL_4 ? (
              <li>
                <RowLink href={contextPath(LEVEL_4)} title={t.prototype.jumpLevel4} />
              </li>
            ) : null}
            {LEVEL_4 && noNoteTopic ? (
              <li>
                <RowLink
                  href={`${contextPath(LEVEL_4)}/syllabus/${encodeURIComponent(noNoteTopic.id)}`}
                  title={`${t.prototype.jumpNoNote}: ${noNoteTopic.code}`}
                />
              </li>
            ) : null}
            {LEVEL_4 && noQuestionsTopic ? (
              <li>
                <RowLink
                  href={`${contextPath(LEVEL_4)}/syllabus/${encodeURIComponent(noQuestionsTopic.id)}`}
                  title={`${t.prototype.jumpNoQuestions}: ${noQuestionsTopic.code}`}
                />
              </li>
            ) : null}
            {LEVEL_4 ? (
              <li>
                <RowLink
                  href={`${contextPath(LEVEL_4)}/updates/l4-vacancy-closed`}
                  title={t.prototype.jumpExpired}
                />
              </li>
            ) : null}
          </RowList>
        </section>

        <section className="ruled space-y-3 lg:col-span-2" aria-labelledby="reset-title">
          <SectionHeader id="reset-title" title={t.prototype.reset} />
          <p className="text-small text-ink-2">{t.prototype.offlineHow}</p>
          <ResetDemo label={t.prototype.reset} doneLabel={t.prototype.resetDone} />
        </section>
      </div>
    </div>
  );
}
