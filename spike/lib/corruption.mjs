// Detects legacy-font Devanagari (Preeti, Kalimati and similar) that was
// extracted from a PDF text layer as if it were Unicode. See
// reports/extraction-notes.md for the finding and the measurements behind
// every constant in this file.
//
// Works per LINE, not per document. Document-level flagging turned out to be
// wrong in both directions on the real corpus: "corrupted" documents contain
// long runs of perfectly clean English (LUM-06's soil science section scores
// 0.0000), and one "clean" document (GAN-04) contains genuine gibberish lines
// the document-level detector never caught.

const DEVANAGARI = /[ऀ-ॿ]/;

// Punctuation stripped from token edges before judging the token. Dashes are
// included because "Section A– 30 Marks" was a real false positive without
// them.
const EDGE = /^[()\[\]{},.;:"'`!?–—-]+|[()\[\]{},.;:"'`!?–—-]+$/g;

const CLEAN_WORD = /^[A-Za-z][a-z]{2,}$|^[A-Z]{2,}$/;

// Latin-1 supplement characters that Preeti emits (Í å ÷ § Ë « ...) but
// that English agriculture syllabus text does not. Deliberately excludes the
// three that do appear in clean documents: ° (U+00B0), µ (U+00B5) and
// × (U+00D7).
const PREETI_ONLY = /[¡-¯±-´¶-ÖØ-ÿ]/;

// Share of a line's tokens that must look like Preeti fragments for the line
// to count as gibberish. Measured on all 18 documents: at 0.3 there were zero
// false positives on real English or Unicode Devanagari lines. Lower values
// start catching mixed lines that carry useful English, such as
// "(Two or more parts of a single question) jf Pp6f k|Zg ...".
export const GIBBERISH_TOKEN_RATIO = 0.3;

const MIN_LINE_CHARS = 15;

function isGibberishToken(raw) {
  const tok = raw.replace(EDGE, "");
  if (!tok) return false;
  if (PREETI_ONLY.test(tok)) return true;
  if (!/[A-Za-z]/.test(tok)) return false; // numbers and punctuation are neutral
  if (!/[^A-Za-z0-9.]/.test(tok)) return false; // an ordinary word or number
  // An internal symbol. English does this for pairs of real words
  // ("Extension/Horticulture"); Preeti does it with fragments ("k|b]z",
  // "t/sf/L", "n'lDagL").
  const parts = tok.split(/[^A-Za-z]+/).filter(Boolean);
  return !parts.every((p) => CLEAN_WORD.test(p));
}

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isGibberishLine(line) {
  if (line.replace(/\s/g, "").length < MIN_LINE_CHARS) return false;
  // Legacy-font output never contains a real Devanagari code point, so any
  // line that has one is genuine text, however oddly punctuated.
  if (DEVANAGARI.test(line)) return false;
  const tokens = line.split(/\s+/).filter((t) => t.replace(EDGE, "").length > 0);
  if (tokens.length < 2) return false;
  const bad = tokens.filter(isGibberishToken).length;
  return bad / tokens.length >= GIBBERISH_TOKEN_RATIO;
}

/**
 * Removes gibberish lines. Returns the cleaned text and how many lines were
 * dropped, so callers can record it rather than hide it.
 * @param {string} text
 */
export function removeGibberishLines(text) {
  let dropped = 0;
  const kept = [];
  for (const line of text.split("\n")) {
    if (isGibberishLine(line)) {
      dropped += 1;
    } else {
      kept.push(line);
    }
  }
  return { text: kept.join("\n"), droppedLines: dropped };
}

/**
 * Document-level summary for the extraction report.
 * @param {string} text
 */
export function analyzeText(text) {
  let substantialLines = 0;
  let gibberishLines = 0;
  for (const line of text.split("\n")) {
    if (line.replace(/\s/g, "").length < MIN_LINE_CHARS) continue;
    substantialLines += 1;
    if (isGibberishLine(line)) gibberishLines += 1;
  }
  const devanagariCount = (text.match(/[ऀ-ॿ]/g) || []).length;
  return {
    totalChars: text.replace(/\s/g, "").length,
    devanagariCount,
    substantialLines,
    gibberishLines,
    gibberishLineShare: substantialLines ? Number((gibberishLines / substantialLines).toFixed(4)) : 0,
  };
}
