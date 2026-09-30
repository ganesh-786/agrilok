import type { LevelCode } from "@/lib/types";

// URLs say "level-4" and "level-7"; the API says "level_4" and "level_7".
// Level is part of the path, never a query option, so the two exams can never
// share a page (CONTRIBUTING.md ground rule 4).
export const LEVEL_SLUGS = ["level-4", "level-7"] as const;
export type LevelSlug = (typeof LEVEL_SLUGS)[number];

export function levelFromSlug(slug: string): LevelCode | null {
  if (slug === "level-4") return "level_4";
  if (slug === "level-7") return "level_7";
  return null;
}

export function slugFromLevel(level: LevelCode): LevelSlug {
  return level === "level_4" ? "level-4" : "level-7";
}

export function levelNumber(level: LevelCode): 4 | 7 {
  return level === "level_4" ? 4 : 7;
}
