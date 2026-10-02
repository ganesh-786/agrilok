import { describe, expect, it } from "vitest";

import { parseAnswer, parseInline } from "@/lib/answer-text";
import { staticAssets } from "@/lib/client/offline";
import { placeOf, switchPath } from "@/lib/context";
import { isAskKey, type EnterKey } from "@/lib/enter-to-ask";
import { formatDate, localDigits } from "@/lib/format";
import { demoNotices, questionsBySyllabus, syllabi } from "@/lib/data/demo";
import { validateQuestion } from "@/lib/data/demo/ask";
import { dictionaries } from "@/lib/i18n";
import { levelFromSlug, slugFromLevel } from "@/lib/levels";
import { relevance } from "@/lib/notices";
import { looksPersonal } from "@/lib/pii";
import { adoptedProfile } from "@/lib/profile";
import { LONGEST_MS, SHORTEST_MS, readingTime } from "@/lib/reading-time";
import { subjectIconKey } from "@/lib/subject-icon";

describe("answer text", () => {
  it("turns citation markers into cite parts and keeps the text around them", () => {
    expect(parseInline("200 marks [1][2].")).toEqual([
      { kind: "text", text: "200 marks " },
      { kind: "cite", n: 1 },
      { kind: "cite", n: 2 },
      { kind: "text", text: "." },
    ]);
  });

  it("groups bullet lines into one list and keeps paragraphs apart", () => {
    const blocks = parseAnswer("The topics are:\n- soil [1]\n- water [1]\n\nMore text.");
    expect(blocks.map((b) => b.kind)).toEqual(["paragraph", "list", "paragraph"]);
    const list = blocks[1];
    expect(list?.kind === "list" && list.items.length).toBe(2);
  });

  it("never treats angle brackets as markup", () => {
    const parts = parseInline("<script>alert(1)</script> [1]");
    expect(parts[0]).toEqual({ kind: "text", text: "<script>alert(1)</script> " });
  });
});

describe("privacy warning", () => {
  it.each([
    ["call me on 9841234567", true],
    ["मेरो नम्बर ९८४१२३४५६७", true],
    ["ram@example.com", true],
    ["What is Article 36?", false],
    ["Seeds Act 2045 and Regulation 2069", false],
  ])("%s -> %s", (text, expected) => {
    expect(looksPersonal(text)).toBe(expected);
  });
});

describe("levels", () => {
  it("maps URL slugs to API codes and back, and nothing else", () => {
    expect(levelFromSlug("level-4")).toBe("level_4");
    expect(levelFromSlug("level-7")).toBe("level_7");
    expect(levelFromSlug("level-5")).toBeNull();
    expect(slugFromLevel("level_7")).toBe("level-7");
  });
});

describe("exam context", () => {
  const l4 = { level: "level_4", province: "lumbini", group: "agri_extension" } as const;
  const l7 = { level: "level_7", province: "lumbini", group: "agri_extension" } as const;

  it("finds the section of a study page and whether it was a deeper page", () => {
    const base = "/level-4/lumbini/agri-extension";
    expect(placeOf(base)).toEqual({ ctx: l4, section: "", detail: false });
    expect(placeOf(`${base}/`)).toEqual({ ctx: l4, section: "", detail: false });
    expect(placeOf(`${base}/practice`)).toMatchObject({ section: "/practice", detail: false });
    expect(placeOf(`${base}/syllabus/u5-5.3`)).toMatchObject({
      section: "/syllabus",
      detail: true,
    });
    expect(placeOf(`${base}/practice/session?mode=mock`)).toMatchObject({
      section: "/practice",
      detail: true,
    });
    expect(placeOf(`${base}/updates?kind=exam`)).toMatchObject({
      section: "/updates",
      detail: false,
    });
  });

  it("treats anything outside a valid exam as no place at all", () => {
    expect(placeOf("/start")).toBeNull();
    expect(placeOf("/")).toBeNull();
    expect(placeOf("/level-5/lumbini/agri-extension/practice")).toBeNull();
    expect(placeOf("/level-4/atlantis/agri-extension")).toBeNull();
    expect(placeOf("/level-4/lumbini/astrology/ask")).toBeNull();
  });

  it("keeps the destination when the exam changes, and says when a deeper page was left", () => {
    expect(switchPath("/level-4/lumbini/agri-extension/ask", l7)).toBe(
      "/level-7/lumbini/agri-extension/ask?switched=1",
    );
    expect(switchPath("/level-4/lumbini/agri-extension/syllabus/u5-5.3", l7)).toBe(
      "/level-7/lumbini/agri-extension/syllabus?switched=2",
    );
    // From a page that is not inside an exam, the new exam opens at Home.
    expect(switchPath("/sources", l7)).toBe("/level-7/lumbini/agri-extension?switched=1");
  });

  it("keeps an exam date only for the exam it was set for", () => {
    const saved = { ...l4, examDate: "2099-01-01" };
    expect(adoptedProfile(saved, l4).examDate).toBe("2099-01-01");
    expect(adoptedProfile(saved, l7)).toEqual({ ...l7, examDate: null });
    expect(adoptedProfile(saved, { ...l4, group: "agronomy" }).examDate).toBeNull();
    expect(adoptedProfile(null, l7)).toEqual({ ...l7, examDate: null });
  });
});

describe("saving for offline", () => {
  it("finds each script and stylesheet a saved page needs, once", () => {
    const html =
      '<link rel="stylesheet" href="/_next/static/chunks/a1.css"><script src="/_next/static/chunks/b2.js" async></script>' +
      '<script>self.__next_f.push([1,"/_next/static/chunks/b2.js\\",\\"/_next/static/chunks/c3.js"])</script>' +
      '<a href="/level-4/lumbini/agri-extension">Home</a><img src="/icons/icon-192.png">';
    expect(staticAssets(html)).toEqual([
      "/_next/static/chunks/a1.css",
      "/_next/static/chunks/b2.js",
      "/_next/static/chunks/c3.js",
    ]);
    expect(staticAssets("<p>no assets</p>")).toEqual([]);
  });
});

describe("formatting", () => {
  it("uses Devanagari digits in Nepali", () => {
    expect(localDigits(2026, "ne")).toBe("२०२६");
    expect(localDigits(2026, "en")).toBe("2026");
  });

  it("shows a fetch date on the day it was recorded in Nepal", () => {
    expect(formatDate("2026-09-16", "en")).toBe("16 Sept 2026");
    expect(formatDate("2026-09-15T18:15:00Z", "en")).toBe("16 Sept 2026");
  });
});

describe("dictionaries", () => {
  it("say the same number of things in both languages", () => {
    const { ne, en } = dictionaries;
    expect(en.guide.use).toHaveLength(ne.guide.use.length);
    expect(en.guide.revise).toHaveLength(ne.guide.revise.length);
    expect(Object.keys(en.answer.reasons).sort()).toEqual(Object.keys(ne.answer.reasons).sort());
  });
});

describe("enter to ask", () => {
  const key = (over: Partial<EnterKey> = {}): EnterKey => ({
    key: "Enter",
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    isComposing: false,
    keyCode: 13,
    ...over,
  });
  const DESKTOP = false;
  const PHONE = true;

  it("asks on Enter and starts a new line on Shift + Enter", () => {
    expect(isAskKey(key(), DESKTOP)).toBe(true);
    expect(isAskKey(key({ shiftKey: true }), DESKTOP)).toBe(false);
    expect(isAskKey(key({ altKey: true }), DESKTOP)).toBe(false);
  });

  it("never asks while an input method is composing a Nepali word", () => {
    expect(isAskKey(key({ isComposing: true }), DESKTOP)).toBe(false);
    // Safari: composition already ended, but the key press is the IME's.
    expect(isAskKey(key({ keyCode: 229 }), DESKTOP)).toBe(false);
    expect(isAskKey(key({ ctrlKey: true, isComposing: true }), DESKTOP)).toBe(false);
  });

  it("keeps Enter as a new line on a touch screen, where Shift + Enter does not exist", () => {
    expect(isAskKey(key(), PHONE)).toBe(false);
  });

  it("asks on Ctrl + Enter or Cmd + Enter everywhere", () => {
    expect(isAskKey(key({ ctrlKey: true }), PHONE)).toBe(true);
    expect(isAskKey(key({ metaKey: true }), DESKTOP)).toBe(true);
  });

  it("ignores every other key", () => {
    expect(isAskKey(key({ key: "a", keyCode: 65 }), DESKTOP)).toBe(false);
  });
});

describe("how long a passing message stays", () => {
  const en = dictionaries.en.context;
  const ne = dictionaries.ne.context;
  const label = "Level 7 · Lumbini · Agriculture Extension";

  it("gives a short confirmation the shortest time, not less", () => {
    expect(readingTime(dictionaries.en.offline.backOnline)).toBe(SHORTEST_MS);
    expect(readingTime("")).toBe(SHORTEST_MS);
  });

  it("gives a longer message longer, and never more than the longest time", () => {
    const short = readingTime(`${en.switched.replace("{context}", label)} ${en.switchedKept}`);
    const long = readingTime(`${en.switched.replace("{context}", label)} ${en.switchedDetail}`);
    expect(short).toBeGreaterThan(SHORTEST_MS);
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThanOrEqual(LONGEST_MS);
    expect(readingTime("word ".repeat(200))).toBe(LONGEST_MS);
  });

  it("counts words, not the dots between the parts of an exam's name", () => {
    expect(readingTime("one · two · three · four · five · six · seven")).toBe(
      readingTime("one two three four five six seven"),
    );
  });

  it("times a Nepali message by its words too", () => {
    const text = `${ne.switched.replace("{context}", "तह ७ · लुम्बिनी · कृषि प्रसार")} ${ne.switchedKept}`;
    expect(readingTime(text)).toBeGreaterThan(SHORTEST_MS);
    expect(readingTime(text)).toBeLessThanOrEqual(LONGEST_MS);
  });
});

describe("the icon a subject gets", () => {
  it("goes by the narrow word before the broad one", () => {
    expect(subjectIconKey("Crop protection")).toBe("protection");
    expect(subjectIconKey("Agricultural economics")).toBe("economics");
    expect(subjectIconKey("Soil management")).toBe("soil");
    expect(subjectIconKey("Public management")).toBe("government");
    expect(subjectIconKey("Agricultural research, extension and education")).toBe("research");
    expect(subjectIconKey("Agriculture extension")).toBe("extension");
    expect(subjectIconKey("General agriculture")).toBe("agriculture");
    expect(subjectIconKey("General reasoning test")).toBe("reasoning");
  });

  it("gives every subject of both Lumbini syllabi a mark of its own kind, never the fallback", () => {
    expect(syllabi).toHaveLength(2);
    for (const syllabus of syllabi) {
      const keys = syllabus.subjects.map((subject) => subjectIconKey(subject.title.en));
      expect(keys, syllabus.id).not.toContain("book");
      // Two subjects of one paper never share a mark, or the marks say nothing.
      const general = syllabus.subjects.filter((subject) => subject.area !== "technical");
      const marks = general.map((subject) => subjectIconKey(subject.title.en));
      expect(new Set(marks).size, syllabus.id + " general subjects").toBe(marks.length);
    }
  });

  it("falls back to the book for a subject it does not know", () => {
    expect(subjectIconKey("Veterinary pharmacology")).toBe("book");
    expect(subjectIconKey("")).toBe("book");
  });
});

describe("what a written question may contain", () => {
  it("refuses a phone number or an email before anything else is done with it", () => {
    expect(validateQuestion("Call me on 9841234567 about IPM")).toEqual({
      status: "invalid",
      reason: "personal_data",
    });
    expect(validateQuestion("Send the seed rules to ram.thapa@example.com")).toEqual({
      status: "invalid",
      reason: "personal_data",
    });
  });

  it("lets an ordinary question through, and names what is wrong with the others", () => {
    expect(validateQuestion("How many marks does a wrong answer lose?")).toBeNull();
    expect(validateQuestion("  a ")).toEqual({ status: "invalid", reason: "too_short" });
    expect(validateQuestion("x".repeat(1001))).toEqual({ status: "invalid", reason: "too_long" });
  });
});

describe("Level 4 and Level 7 never mix", () => {
  const l4 = { level: "level_4", province: "lumbini", group: "agri_extension" } as const;
  const l7 = { level: "level_7", province: "lumbini", group: "agri_extension" } as const;

  it("gives each level a syllabus of its own, with its own questions and notes", () => {
    expect(syllabi.map((syllabus) => syllabus.level).sort()).toEqual(["level_4", "level_7"]);
    const [first, second] = syllabi;
    const ids = (list: { id: string }[]) => new Set(list.map((item) => item.id));
    const firstQuestions = ids(questionsBySyllabus[first!.id]!);
    for (const question of questionsBySyllabus[second!.id]!) {
      expect(firstQuestions.has(question.id), question.id).toBe(false);
    }
  });

  it("never shows a notice to the other level, whatever the commission", () => {
    const notices = demoNotices("2026-10-01");
    expect(notices.length).toBeGreaterThan(0);
    for (const notice of notices) {
      // Every notice is for exactly one level, so it is hidden from the other.
      expect(notice.appliesTo.levels, notice.id).toHaveLength(1);
      const [mine, other] = notice.appliesTo.levels[0] === "level_4" ? [l4, l7] : [l7, l4];
      expect(relevance(notice, other), notice.id).toBeNull();
      expect(relevance(notice, { ...mine, province: "koshi" }), notice.id).not.toBeNull();
    }
  });
});
