// Which icon stands for a subject, worked out from its English title.
//
// A syllabus names its subjects in words, and the same subject turns up under
// different unit numbers in different syllabi (Level 4's "Soil management" is
// unit 9, Level 7's "Soil science" unit 3), so the title is the only stable
// thing to go by. The first rule that matches wins, which is why the narrow
// words come before the broad ones: "Crop protection" is protection, not
// crops, and "Agricultural economics" is economics, not agriculture. A subject
// nothing matches gets the book, so a new syllabus never breaks a page.

export type SubjectIconKey =
  | "reasoning"
  | "awareness"
  | "government"
  | "history"
  | "environment"
  | "law"
  | "research"
  | "extension"
  | "economics"
  | "soil"
  | "protection"
  | "horticulture"
  | "technology"
  | "crops"
  | "agriculture"
  | "book";

const RULES: [RegExp, SubjectIconKey][] = [
  [/reason/, "reasoning"],
  [/awareness|contemporary|general knowledge/, "awareness"],
  [/public management|governance|administration/, "government"],
  [/history/, "history"],
  [/natural resource|environment|climate/, "environment"],
  [/legislation|polic|\blaw|trade/, "law"],
  [/research/, "research"],
  [/extension/, "extension"],
  [/econom|market/, "economics"],
  [/soil/, "soil"],
  [/protection|pest/, "protection"],
  [/horticultur/, "horticulture"],
  [/technolog|management/, "technology"],
  [/agronomy|crop/, "crops"],
  [/agricultur/, "agriculture"],
];

export function subjectIconKey(titleEn: string): SubjectIconKey {
  const title = titleEn.toLowerCase();
  return RULES.find(([pattern]) => pattern.test(title))?.[1] ?? "book";
}
