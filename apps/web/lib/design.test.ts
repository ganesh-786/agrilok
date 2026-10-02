import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const blocks = [...css.matchAll(/(?:@theme|:root[^\{]*)\s*\{([^}]+)\}/g)]
  .map((match) =>
    Object.fromEntries(
      [...match[1]!.matchAll(/--color-([\w-]+):\s*(#[\da-f]{6});/g)].map((entry) => [
        entry[1],
        entry[2],
      ]),
    ),
  )
  .filter((tokens) => tokens.canvas);

function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((position) => parseInt(hex.slice(position, position + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

describe("the contrast check itself", () => {
  it("fails a pair that is known to be too faint", () => {
    // #777 on white is the textbook near miss: 4.48:1.
    expect(contrast("#777777", "#ffffff")).toBeLessThan(4.5);
    expect(contrast("#767676", "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("shared design contrast", () => {
  it("checks all four light, dark and system theme declarations", () => {
    expect(blocks).toHaveLength(4);
    expect(blocks[0]).toEqual(blocks[3]);
    expect(blocks[1]).toEqual(blocks[2]);
  });

  for (const [index, tokens] of blocks.entries()) {
    it(`theme ${index + 1} meets text and control contrast requirements`, () => {
      // Every foreground the interface puts on every background it can sit on.
      const surfaces = ["canvas", "surface", "sunken"] as const;
      const textPairs: [string, string][] = [
        ...["ink", "ink-2", "ink-3", "l4-ink", "l7-ink", "success", "warning", "danger"].flatMap(
          (fg) => surfaces.map((bg): [string, string] => [fg, bg]),
        ),
        // What can be pressed is drawn in the brand green outside an exam and
        // in the exam's own colour inside one: a solid button and its hover,
        // coloured text and outlines on every surface, and ordinary text on
        // the wash behind the filled block and a selected choice.
        ...["brand", "l4", "l7"].flatMap((action): [string, string][] => [
          [`on-${action}`, action],
          [`on-${action}`, `${action}-hover`],
          [`${action}-ink`, `${action}-tint`],
          ["ink", `${action}-tint`],
          ["ink-2", `${action}-tint`],
          ["ink-3", `${action}-tint`],
        ]),
        ...surfaces.map((bg): [string, string] => ["brand-ink", bg]),
        // The filled block: its words and its quieter words on the fill, and
        // the button reversed out of it (the fill's colour as text on white),
        // at rest and under the pointer.
        ...["brand-hero", "l4-hero", "l7-hero"].flatMap((hero): [string, string][] => [
          ["on-hero", hero],
          ["on-hero-2", hero],
          [hero, "on-hero"],
          [hero, "on-hero-2"],
        ]),
        ["success", "success-tint"],
        ["warning", "warning-tint"],
        ["danger", "danger-tint"],
        ["ink", "success-tint"],
        ["ink", "warning-tint"],
        ["ink", "danger-tint"],
        ["ink-2", "success-tint"],
        ["ink-2", "warning-tint"],
        ["ink-2", "danger-tint"],
        ["on-logo", "logo"],
      ];
      for (const [fg, bg] of textPairs) {
        expect(tokens[fg], `token ${fg} exists`).toBeDefined();
        expect(tokens[bg], `token ${bg} exists`).toBeDefined();
        expect(contrast(tokens[fg]!, tokens[bg]!), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
      // Control boundaries, the focus ring and the exam bar against what they sit on.
      for (const bg of surfaces) {
        expect(
          contrast(tokens["line-strong"]!, tokens[bg]!),
          `control on ${bg}`,
        ).toBeGreaterThanOrEqual(3);
        expect(contrast(tokens.focus!, tokens[bg]!), `focus on ${bg}`).toBeGreaterThanOrEqual(3);
      }
      // A solid button, a meter's fill and the exam bar are shapes, not text:
      // each must stand out from every surface it is drawn on, the wash of
      // the filled block included.
      for (const action of ["brand", "l4", "l7"]) {
        for (const bg of [...surfaces, `${action}-tint`]) {
          expect(
            contrast(tokens[action]!, tokens[bg]!),
            `${action} fill on ${bg}`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    });
  }
});
