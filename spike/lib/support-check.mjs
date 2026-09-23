// Deterministic support check (ADR-0008, Option C). Runs after generation and
// before an answer is shown. No model calls.
//
// The model returns, for every factual claim, the id of ONE source chunk and a
// quote copied from it. This checks three things per claim:
//
//   1. the quote exists in that chunk as one contiguous passage, not stitched
//      together from separate places;
//   2. every number in the claim appears in the quote;
//   3. enough of the claim's key words appear in the quote itself.
//
// Any failing claim downgrades the whole answer to a refusal.
//
// Why a quote and not plain word overlap: in PP-01 the cited chunk contains
// both "Crop Cutting" and "Secondary data", in two separate numbered syllabus
// items. A check that only asks "are the claim's words somewhere in the chunk"
// passes it. Requiring one passage that states the whole claim does not.
//
// Known limits, measured against the golden set rather than assumed away:
// a claim in English over a Nepali quote cannot be word-checked (only the
// quote and its numbers are), so a mistranslated label can still pass.

// Devanagari extraction in this corpus is lossy (matras misplaced, "ह"
// sometimes lost), so words are compared on a consonant skeleton and fuzzily.
const DEVANAGARI_DIGITS = "०१२३४५६७८९";
const DROP_MARKS = /[ऀ-ःऺ-ॏ॑-ॗॢॣ‌‍]/g;

const EN_STOPWORDS = new Set(
  (
    "the a an of and or to in on for from by with as at is are was were be been this that these those it its " +
    "which what who whom whose how why when where according source sources provided material states stated " +
    "under section article nepal nepali constitution also such any all not no".split(" ")
  ),
);
// Common Nepali function words, compared on their skeletons.
const NE_STOPWORDS = new Set(
  // Structural words (article, sub-article, clause, schedule) label where a
  // provision sits; they are not part of what it says.
  ("र को का की मा ले लाई हो छ छन हुने हुन्छ गर्ने गरी भएको यो त्यो पनि वा तथा सम्बन्धी अनुसार बमोजिम लागि रहेको गरिएको छ " +
    "धारा उपधारा खण्ड अनुसूची परिच्छेद भाग")
    .split(" ")
    .map((w) => skeleton(w)),
);

function toAsciiDigits(s) {
  return s.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
}

function skeleton(word) {
  return toAsciiDigits(word).replace(DROP_MARKS, "");
}

/** Lowercase, ASCII digits, Devanagari reduced to consonants, punctuation to spaces. */
export function normalize(text) {
  // Only Latin letters, digits and Devanagari letters survive. The model's
  // copy of a damaged legacy-font passage sometimes contains stray Gujarati
  // letters or raw bytes the source never had; left in, they made genuine
  // quotes score below the match threshold (SMOKE-03, SMOKE-05 on a live run).
  return toAsciiDigits(String(text).toLowerCase())
    .replace(DROP_MARKS, "")
    .replace(/[^a-z0-9ऄ-हक़-ॡॲ-ॿ]+/g, " ")
    .trim();
}

// Matching form. Two things the model does to a damaged passage when copying
// it, both seen on a live run: it writes a character it cannot reproduce as a
// literal escape code ("ी" as text, SMOKE-03), and it writes a word
// correctly where the extraction split it with a stray space ("क ष" for
// "कृषि", SMOKE-05). Escapes are decoded, and spaces between two Devanagari
// letters are removed, on both sides of the comparison.
function compact(text) {
  const decoded = String(text)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x[0-9a-fA-F]{2}/g, "");
  return normalize(decoded).replace(/([ऀ-ॿ]) (?=[ऀ-ॿ])/g, "$1");
}

function numbersIn(text) {
  return new Set((toAsciiDigits(String(text)).match(/\d+(?:\.\d+)?/g) || []).map((n) => n.replace(/^0+(?=\d)/, "")));
}

function keyTerms(text) {
  const out = [];
  for (const raw of normalize(text).split(" ")) {
    if (!raw || /^\d/.test(raw)) continue;
    const isDevanagari = /[ऀ-ॿ]/.test(raw);
    if (isDevanagari) {
      if (raw.length < 2 || NE_STOPWORDS.has(raw)) continue;
    } else if (raw.length < 4 || EN_STOPWORDS.has(raw)) {
      continue;
    }
    out.push({ term: raw, devanagari: isDevanagari });
  }
  return out;
}

function trigrams(s) {
  const set = new Set();
  const t = ` ${s} `;
  for (let i = 0; i + 3 <= t.length; i++) set.add(t.slice(i, i + 3));
  return set;
}

// Best contiguous match of `quote` inside `chunk`: slide a window the length of
// the quote across the chunk and take the highest trigram containment. A quote
// assembled from two distant passages cannot score well in any single window.
export function bestWindowMatch(quote, chunk) {
  const q = compact(quote);
  const c = compact(chunk);
  if (!q) return { score: 0, window: "" };
  if (c.includes(q)) return { score: 1, window: q };
  const qGrams = trigrams(q);
  const len = q.length;
  let best = { score: 0, window: "" };
  const step = Math.max(1, Math.floor(len / 10));
  for (let start = 0; start <= Math.max(0, c.length - Math.floor(len * 0.8)); start += step) {
    for (const size of [Math.floor(len * 0.9), len, Math.ceil(len * 1.15)]) {
      const window = c.slice(start, start + size);
      const wGrams = trigrams(window);
      let hit = 0;
      for (const g of qGrams) if (wGrams.has(g)) hit++;
      const score = hit / qGrams.size;
      if (score > best.score) best = { score, window };
    }
  }
  return best;
}

// Nepali case endings and postpositions, on their skeletons (मा -> म, को -> क,
// लाई -> ल, बाट -> बट, हरू -> हर). The same noun turns up as संघमा in an
// answer and संघको in the source; comparing stems lets them meet.
const NE_SUFFIXES = ["हरक", "हरल", "हरम", "बट", "सग", "हर", "म", "क", "ल"];

function stem(term) {
  for (const s of NE_SUFFIXES) {
    if (term.endsWith(s) && term.length - s.length >= 2) return term.slice(0, -s.length);
  }
  return term;
}

function plainTrigrams(s) {
  const set = new Set();
  for (let i = 0; i + 3 <= s.length; i++) set.add(s.slice(i, i + 3));
  return set;
}

// A term counts as present if it, or something close to it, appears in the
// text. Devanagari is compared with spaces removed, because extraction splits
// words ("स ं विधान"), and on stems. Latin is compared word by word.
function termPresent(t, text) {
  if (t.devanagari) {
    const flat = text.replace(/ /g, "");
    const s = stem(t.term);
    if (flat.includes(s)) return true;
    if (s.length < 4) return false;
    const tg = plainTrigrams(s);
    const fg = plainTrigrams(flat);
    let hit = 0;
    for (const g of tg) if (fg.has(g)) hit++;
    return hit / tg.size >= 0.67;
  }
  const words = text.split(" ");
  const bare = t.term.replace(/s$/, "");
  return words.some((w) => w === t.term || w.replace(/s$/, "") === bare);
}

// How far above the quoted passage a heading number may sit (characters of
// normalised text).
const HEADING_WINDOW = 600;

export const THRESHOLDS = {
  quoteMatch: 0.85, // share of the quote's trigrams found in one window of the chunk
  // Stitching: a claim term that the cited chunk contains, but outside the
  // quoted passage. At or above this share of the claim's checkable terms,
  // the claim is taken to be assembled from separate places.
  stitchedShare: 0.34,
};

/**
 * @param {{claim: string, source_id: string, quote: string}[]} claims
 * @param {Map<string, string>} chunkTextById  retrieved chunks only
 */
/**
 * @param metaById  per chunk: its source title, province and service groups.
 *   The model is shown these in each <source> tag, so a claim that names the
 *   province or group a passage belongs to is using given context, not
 *   stitching (SMOKE-03 on a live run: "Veterinary Group" from the title).
 */
export function checkSupport(claims, chunkTextById, thresholds = THRESHOLDS, question = "", metaById = new Map()) {
  // Numbers the student's question already contains ("Level 7", "Article
  // 36") are context the answer may restate, not facts it must quote.
  const questionNumbers = numbersIn(question);
  if (!Array.isArray(claims) || claims.length === 0) {
    return { supported: false, reason: "no claims were given to check", results: [] };
  }
  const results = claims.map((c) => {
    const chunk = chunkTextById.get(c.source_id);
    if (!chunk) return { ...c, ok: false, reason: `cites ${c.source_id}, which was not retrieved` };
    if (!c.quote || !c.quote.trim()) return { ...c, ok: false, reason: "no quote given" };

    const match = bestWindowMatch(c.quote, chunk);
    if (match.score < thresholds.quoteMatch) {
      return { ...c, ok: false, quoteMatch: +match.score.toFixed(2), reason: "quote is not one passage of the cited chunk" };
    }

    const passage = match.window;
    // A number may also come from the heading just above the quoted passage:
    // quoting clause (3) of Article 36 and calling it "Article 36" is right
    // (U-02 on a live run). The window is limited to the text before the
    // passage, so a number from an unrelated later item still fails.
    const chunkNorm = compact(chunk);
    const at = chunkNorm.indexOf(passage);
    const heading = at > 0 ? chunkNorm.slice(Math.max(0, at - HEADING_WINDOW), at) : "";
    const allowed = new Set([...numbersIn(passage), ...numbersIn(heading), ...questionNumbers]);
    const missingNumbers = [...numbersIn(c.claim)].filter((n) => !allowed.has(n));
    if (missingNumbers.length) {
      return { ...c, ok: false, quoteMatch: +match.score.toFixed(2), reason: `numbers not in the quoted passage: ${missingNumbers.join(", ")}` };
    }

    // Checkable terms are the claim's words that occur somewhere in the cited
    // chunk. Words that occur nowhere in it (a paraphrase, a translation, or a
    // word the lossy extraction mangled) cannot tell us anything, so they are
    // left out rather than counted as failures.
    // Words the question itself uses ("the General Introduction of Soil
    // Science") are context the answer may restate, not facts it must quote.
    const questionNorm = compact(question);
    const metaNorm = compact(metaById.get(c.source_id) || "");
    const checkable = keyTerms(c.claim).filter(
      (t) => termPresent(t, chunkNorm) && !termPresent(t, questionNorm) && !termPresent(t, metaNorm),
    );
    if (checkable.length === 0) {
      return {
        ...c,
        ok: true,
        quoteMatch: +match.score.toFixed(2),
        stitched: [],
        note: "no claim words occur in the chunk; only the quote and numbers were checked",
      };
    }
    const stitched = checkable.filter((t) => !termPresent(t, passage)).map((t) => t.term);
    const share = stitched.length / checkable.length;
    if (share >= thresholds.stitchedShare) {
      return {
        ...c,
        ok: false,
        quoteMatch: +match.score.toFixed(2),
        stitched,
        reason: `the claim uses words from elsewhere in the chunk, not from the quoted passage: ${stitched.join(", ")}`,
      };
    }
    return { ...c, ok: true, quoteMatch: +match.score.toFixed(2), stitched };
  });
  const failed = results.filter((r) => !r.ok);
  return {
    supported: failed.length === 0,
    reason: failed.length ? failed.map((f) => `${f.source_id}: ${f.reason}`).join("; ") : null,
    results,
  };
}
