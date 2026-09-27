import { describe, expect, it } from "vitest";

import { parseAnswer, parseInline } from "@/lib/answer-text";
import { isAskKey, type EnterKey } from "@/lib/enter-to-ask";
import { formatDate, localDigits } from "@/lib/format";
import { dictionaries } from "@/lib/i18n";
import { levelFromSlug, slugFromLevel } from "@/lib/levels";
import { looksPersonal } from "@/lib/pii";

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
    expect(en.home.what).toHaveLength(ne.home.what.length);
    expect(en.home.limits).toHaveLength(ne.home.limits.length);
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
