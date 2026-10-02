import "server-only";

import { notFound } from "next/navigation";

import { groupNames, provinceNames } from "@/content/taxonomy";
import type { ExamContext, Syllabus } from "@/lib/contracts";
import { contextPath, parseContext } from "@/lib/context";
import { syllabusFor } from "@/lib/data";
import type { Dictionary, Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/preferences";

export type ContextParams = Promise<{ level: string; province: string; group: string }>;

export type StudyContext = {
  ctx: ExamContext;
  syllabus: Syllabus | null;
  base: string;
  lang: Lang;
  t: Dictionary;
};

/**
 * Every exam-context page starts here: parse the URL strictly (an unknown
 * level, commission or group is a 404, never a guess), find the syllabus, and
 * load the language.
 */
export async function loadStudyContext(params: ContextParams): Promise<StudyContext> {
  const ctx = parseContext(await params);
  if (!ctx) notFound();
  const { lang, t } = await getDictionary();
  return { ctx, syllabus: syllabusFor(ctx), base: contextPath(ctx), lang, t };
}

/** "Level 4 · Lumbini · Agriculture Extension" */
export function contextLabel(ctx: ExamContext, t: Dictionary, lang: Lang): string {
  return [
    t.levels[ctx.level].short,
    provinceNames[ctx.province].short[lang],
    groupNames[ctx.group][lang],
  ].join(" · ");
}
