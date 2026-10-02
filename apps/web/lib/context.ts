// The exam context in URLs: /{level}/{province}/{group}.
//
// Putting the whole context in the path means a page can only ever show one
// exam, a shared link opens exactly that exam, and the offline cache keeps
// each exam's pages apart (docs/student-experience.md, section 1). Anything
// that does not parse is rejected, never guessed.

import {
  GROUPS,
  PROVINCES,
  type ExamContext,
  type GroupCode,
  type ProvinceCode,
} from "@/lib/contracts";
import { levelFromSlug, slugFromLevel } from "@/lib/levels";

export function groupSlug(group: GroupCode): string {
  return group.replace(/_/g, "-");
}

export function groupFromSlug(slug: string): GroupCode | null {
  const code = slug.replace(/-/g, "_");
  return (GROUPS as readonly string[]).includes(code) ? (code as GroupCode) : null;
}

export function isProvince(value: string): value is ProvinceCode {
  return (PROVINCES as readonly string[]).includes(value);
}

export function parseContext(params: {
  level: string;
  province: string;
  group: string;
}): ExamContext | null {
  const level = levelFromSlug(params.level);
  const group = groupFromSlug(params.group);
  if (!level || !group || !isProvince(params.province)) return null;
  return { level, province: params.province, group };
}

/** The base path of a context: "/level-4/lumbini/agri-extension". */
export function contextPath(ctx: ExamContext): string {
  return `/${slugFromLevel(ctx.level)}/${ctx.province}/${groupSlug(ctx.group)}`;
}

export function sameContext(a: ExamContext | null, b: ExamContext | null): boolean {
  return !!a && !!b && a.level === b.level && a.province === b.province && a.group === b.group;
}

/** The pages every exam has: Home (""), the other four destinations, and Guidance. */
export const SECTIONS = ["", "/syllabus", "/practice", "/updates", "/ask", "/guide"] as const;
export type Section = (typeof SECTIONS)[number];

export type Place = {
  ctx: ExamContext;
  section: Section;
  /** True when the path was a page below its section: a topic, a notice, a question. */
  detail: boolean;
};

/**
 * Where a study page sits inside its exam. Used to change exam without losing
 * the student's place: Practice in one exam opens Practice in the other.
 *
 * A topic, a notice and a question belong to one exam only, so they collapse
 * to their section, and `detail` lets the next page say so. Null for a path
 * that is not inside an exam.
 */
export function placeOf(pathname: string): Place | null {
  const [level, province, group, first, ...rest] = pathname.split("?")[0]!.split("/").slice(1);
  if (!level || !province || !group) return null;
  const ctx = parseContext({ level, province, group });
  if (!ctx) return null;
  if (!first) return { ctx, section: "", detail: false };
  const section = SECTIONS.find((s) => s === `/${first}`);
  if (!section) return { ctx, section: "", detail: true };
  return { ctx, section, detail: rest.some(Boolean) };
}

/** The same place in another exam, with a note of whether a deeper page was left behind. */
export function switchPath(from: string, to: ExamContext): string {
  const place = placeOf(from);
  return `${contextPath(to)}${place?.section ?? ""}?switched=${place?.detail ? "2" : "1"}`;
}
