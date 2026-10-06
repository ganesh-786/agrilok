// Nepali first, English second, both complete (apps/web/README.md: "Nepali and
// English are both first-class"). The English dictionary is typed against the
// Nepali one, so a missing string is a type error, not a blank on the page.

import { en } from "./en";
import { ne, type Dictionary } from "./ne";

export type { Dictionary };

export type Lang = "ne" | "en";
export const LANGS: Lang[] = ["ne", "en"];

export const dictionaries: Record<Lang, Dictionary> = { ne, en };

export function isLang(value: unknown): value is Lang {
  return value === "ne" || value === "en";
}
