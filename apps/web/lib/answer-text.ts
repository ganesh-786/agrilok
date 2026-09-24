// Turn an answer's text into blocks and inline pieces, so citation markers can
// become links without ever injecting HTML. The API has already replaced the
// model's [chunk_id] citations with [1], [2]; this only has to find them.

export type Inline = { kind: "text"; text: string } | { kind: "cite"; n: number };
export type Block = { kind: "paragraph"; parts: Inline[] } | { kind: "list"; items: Inline[][] };

const MARKER = /\[(\d{1,2})\]/g;
const BULLET = /^\s*(?:[-*•]|\d{1,2}[.)])\s+/;

export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(MARKER)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: "text", text: text.slice(last, index) });
    parts.push({ kind: "cite", n: Number(match[1]) });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

export function parseAnswer(text: string): Block[] {
  const blocks: Block[] = [];
  let list: Inline[][] | null = null;
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      list = null;
      continue;
    }
    if (BULLET.test(line)) {
      if (!list) {
        list = [];
        blocks.push({ kind: "list", items: list });
      }
      list.push(parseInline(line.replace(BULLET, "")));
    } else {
      list = null;
      blocks.push({ kind: "paragraph", parts: parseInline(line) });
    }
  }
  return blocks;
}
