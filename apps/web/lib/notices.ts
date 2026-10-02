// Which notices matter to a student, and how urgent their deadlines are.
//
// Notices never cross levels: a Level 4 student sees Level 4 notices only,
// from their own commission by default and from every commission on request.

import type { ExamContext, Notice } from "@/lib/contracts";
import { daysBetween } from "@/lib/dates";

export type Relevance = "mine" | "other_commission";

/** Null means the notice is for another level and is never shown. */
export function relevance(notice: Notice, ctx: ExamContext): Relevance | null {
  if (!notice.appliesTo.levels.includes(ctx.level)) return null;
  const groupMatches =
    notice.appliesTo.groups === "all" || notice.appliesTo.groups.includes(ctx.group);
  if (notice.appliesTo.provinces.includes(ctx.province) && groupMatches) return "mine";
  return "other_commission";
}

export type DeadlineStatus = { state: "open" | "closing" | "closed"; daysLeft: number } | null;

/** Closing when seven days or fewer remain; closed after the deadline day. */
export function deadlineStatus(notice: Notice, today: string): DeadlineStatus {
  if (!notice.deadline) return null;
  const left = daysBetween(today, notice.deadline);
  if (left < 0) return { state: "closed", daysLeft: left };
  if (left <= 7) return { state: "closing", daysLeft: left };
  return { state: "open", daysLeft: left };
}

/** Newest first; an open deadline breaks a tie. */
export function sortNotices(notices: Notice[]): Notice[] {
  return [...notices].sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
}
