// The exam profile: level, commission, service group and an optional exam
// date, kept in one cookie. No account and nothing that identifies a person.
//
// The cookie is parsed strictly on every read. A value that does not parse is
// treated as no profile, so the student is sent to setup rather than shown a
// half-valid, possibly mixed exam.

import type { ExamContext, ExamProfile } from "@/lib/contracts";
import { groupFromSlug, isProvince, sameContext } from "@/lib/context";
import { addDays, isIsoDay } from "@/lib/dates";
import { LEVELS } from "@/lib/contracts";

export const PROFILE_COOKIE = "agrilok_profile";
const VERSION = "1";

export function serializeProfile(profile: ExamProfile): string {
  return [VERSION, profile.level, profile.province, profile.group, profile.examDate ?? ""].join(
    "|",
  );
}

export function parseProfile(value: string | undefined | null): ExamProfile | null {
  if (!value) return null;
  const [version, level, province, group, examDate] = value.split("|");
  if (version !== VERSION || !level || !province || !group) return null;
  if (!(LEVELS as readonly string[]).includes(level) || !isProvince(province)) return null;
  const groupCode = groupFromSlug(group);
  if (!groupCode) return null;
  return {
    level: level as ExamProfile["level"],
    province,
    group: groupCode,
    examDate: examDate && isIsoDay(examDate) ? examDate : null,
  };
}

/**
 * The profile to save when the student adopts an exam from a study page.
 *
 * An exam date belongs to one exam. Carrying it to a different level,
 * commission or group would build a study plan that counts down to the wrong
 * day, so it is kept only when the exam itself has not changed, and Home asks
 * for the new exam's date instead.
 */
export function adoptedProfile(previous: ExamProfile | null, ctx: ExamContext): ExamProfile {
  return { ...ctx, examDate: sameContext(previous, ctx) ? (previous?.examDate ?? null) : null };
}

export type ExamDateError = "invalid" | "past" | "too_far";

/**
 * Validate an optional exam date typed in setup. Empty is fine: the date is
 * optional. A date in the past, or more than three years away, is almost
 * certainly a typing slip, so it is refused with a reason rather than kept.
 */
export function checkExamDate(value: string, today: string): ExamDateError | null {
  if (!value) return null;
  if (!isIsoDay(value)) return "invalid";
  if (value < today) return "past";
  if (value > addDays(today, 3 * 366)) return "too_far";
  return null;
}
