#!/usr/bin/env node
// PDF text extraction. Text layer first, per ADR-0002 - none of these 18
// documents are scans (all had a real text layer when checked by hand during
// research), so the OCR fallback path from ADR-0002 is intentionally not
// implemented here. See README.md's "known gaps".
//
// What this script actually earns its place by doing: detecting a THIRD case
// ADR-0002 doesn't name explicitly - a text layer that exists and extracts
// without error, but is encoded in a legacy 8-bit Nepali font (Preeti,
// Kalimati) rather than Unicode. That produces neither clean text nor an
// extraction error - it produces plausible-looking garbage that would enter
// the corpus silently if nothing checked for it. Running this against all 18
// real documents found exactly that in 8 of them (see
// reports/extraction-notes.md) - this is not a hypothetical concern.
//
// Backend choice was also decided by running both on the real corpus, not by
// assumption: pdf-parse (pure JS, pdf.js-based) is primary because it
// recovered genuine Devanagari Unicode in 10/18 documents where this
// environment's pdftotext (an xpdf 4.06 build, not poppler - the two are
// different codebases despite the shared command name) extracted zero
// Devanagari from all 18, while matching pdf-parse's English-text extraction
// closely. pdftotext is kept as a fallback since it may behave differently
// (e.g. a poppler build) in another environment, and its -layout mode is
// still useful for column-heavy pages pdf-parse handles less cleanly.
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import yaml from "js-yaml";
import { paths } from "./lib/config.mjs";

const execFileAsync = promisify(execFile);

// --- Extraction backends -------------------------------------------------

async function extractWithPdftotext(pdfPath) {
  // -layout preserves column/table structure reasonably well, which matters
  // for these syllabi - they are full of numbered outline structure
  // (1.1, 1.1.2, ...) that a naive text dump can run together.
  const { stdout } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"], {
    maxBuffer: 20 * 1024 * 1024,
  });
  return stdout;
}

async function extractWithPdfParse(pdfPath) {
  const { default: pdfParse } = await import("pdf-parse");
  const buf = await fs.readFile(pdfPath);
  const result = await pdfParse(buf);
  return result.text;
}

let pdftotextAvailable = null;
async function checkPdftotext() {
  if (pdftotextAvailable !== null) return pdftotextAvailable;
  try {
    await execFileAsync("pdftotext", ["-v"]);
    pdftotextAvailable = true;
  } catch (err) {
    // Found the hard way: this environment's pdftotext is xpdf (not
    // poppler), and xpdf's `-v` prints its version banner to stderr and
    // still exits non-zero - execFile treats that as an error regardless of
    // what actually happened. The only real "not found" signal is ENOENT;
    // anything else means the binary ran and said something, so it exists.
    pdftotextAvailable = err.code !== "ENOENT";
  }
  return pdftotextAvailable;
}

async function extractText(pdfPath) {
  // pdf-parse first - see file header for why this order was chosen based on
  // actually running both against the real corpus, not assumed in advance.
  try {
    return { text: await extractWithPdfParse(pdfPath), backend: "pdf-parse" };
  } catch (err) {
    console.warn(`    pdf-parse failed (${err.message.slice(0, 100)}), falling back to pdftotext`);
  }
  if (await checkPdftotext()) {
    return { text: await extractWithPdftotext(pdfPath), backend: "pdftotext" };
  }
  throw new Error("both pdf-parse and pdftotext failed or are unavailable");
}

// --- Corruption heuristics -------------------------------------------------
// See the file header. This is a heuristic flag for human review, not a
// certainty - consistent with how the real pipeline treats extraction
// confidence (docs/rag-pipeline.md).

const DEVANAGARI_RE = /[ऀ-ॿ]/g;
const REPLACEMENT_CHAR_RE = /�/g;
const ENGLISH_WORD_RE = /\b[A-Za-z]{3,}\b/g;
// Characters that are near-absent from real prose (English or Devanagari)
// but appear constantly when a legacy 8-bit Nepali font (Preeti, Kalimati)
// is extracted as if it were Unicode - the font maps Devanagari matras and
// conjuncts onto ASCII punctuation code points, so "प्रदेश" comes out as
// something like "k|b]z". Found empirically, not from a spec: an English-
// word-count heuristic tried first was fooled by documents that genuinely
// mix real English phrases ("Written Examination", "Group Test") with
// Preeti gibberish in the same file - this symbol-density signal is what
// actually separates the two cleanly on all 18 real source documents.
const SUSPICIOUS_SYMBOL_RE = /[\]\[|^~{}\\]/g;
const SUSPICIOUS_SYMBOL_DENSITY_THRESHOLD = 0.01; // clean docs measured 0.0000-0.0001; corrupted ones 0.008-0.085

function analyzeExtraction(text) {
  const nonWhitespace = text.replace(/\s/g, "");
  const totalChars = nonWhitespace.length;
  const devanagariCount = (text.match(DEVANAGARI_RE) || []).length;
  const replacementCount = (text.match(REPLACEMENT_CHAR_RE) || []).length;
  const englishWords = (text.match(ENGLISH_WORD_RE) || []).length;
  const suspiciousSymbolCount = (text.match(SUSPICIOUS_SYMBOL_RE) || []).length;
  const devanagariRatio = totalChars > 0 ? devanagariCount / totalChars : 0;
  const suspiciousSymbolDensity = totalChars > 0 ? suspiciousSymbolCount / totalChars : 0;

  const looksLikeLegacyFontGibberish =
    totalChars > 200 && suspiciousSymbolDensity > SUSPICIOUS_SYMBOL_DENSITY_THRESHOLD;

  return {
    totalChars,
    devanagariCount,
    devanagariRatio: Number(devanagariRatio.toFixed(4)),
    replacementCharCount: replacementCount,
    englishWordCount: englishWords,
    suspiciousSymbolDensity: Number(suspiciousSymbolDensity.toFixed(4)),
    flaggedAsLikelyCorrupted: looksLikeLegacyFontGibberish || replacementCount > totalChars * 0.05,
  };
}

// --- Main ------------------------------------------------------------------

async function main() {
  const manifest = yaml.load(await fs.readFile(paths.sources, "utf8"));
  await fs.mkdir(paths.extracted, { recursive: true });

  const pdftotextFallbackAvailable = await checkPdftotext();
  console.log(
    `Primary backend: pdf-parse (pure JS). Fallback: pdftotext ${pdftotextFallbackAvailable ? "(available)" : "(not found - pdf-parse only)"}.\n`,
  );

  const report = [];

  for (const [i, doc] of manifest.documents.entries()) {
    const pdfPath = path.join(paths.raw, `${doc.id}.pdf`);
    const exists = await fs.stat(pdfPath).catch(() => null);
    process.stdout.write(`[${i + 1}/${manifest.documents.length}] ${doc.id}  `);

    if (!exists) {
      console.log("SKIPPED - not downloaded yet (run `node download.mjs` first)");
      report.push({ id: doc.id, status: "missing_source" });
      continue;
    }

    try {
      const { text, backend: usedBackend } = await extractText(pdfPath);
      const analysis = analyzeExtraction(text);

      const outPath = path.join(paths.extracted, `${doc.id}.txt`);
      await fs.writeFile(outPath, text, "utf8");

      const flag = analysis.flaggedAsLikelyCorrupted ? "  ⚠ FLAGGED (see below)" : "";
      console.log(
        `OK - ${analysis.totalChars} chars, ${analysis.devanagariCount} Devanagari, ` +
          `${analysis.englishWordCount} English words [${usedBackend}]${flag}`,
      );

      report.push({
        id: doc.id,
        status: "extracted",
        backend: usedBackend,
        ...analysis,
      });
    } catch (err) {
      console.log(`FAILED - ${err.message.slice(0, 150)}`);
      report.push({ id: doc.id, status: "extraction_failed", error: err.message });
    }
  }

  await fs.writeFile(paths.extractionReport, JSON.stringify(report, null, 2));

  const flagged = report.filter((r) => r.flaggedAsLikelyCorrupted);
  const failed = report.filter((r) => r.status !== "extracted");

  console.log(`\n${report.length - failed.length}/${report.length} extracted.`);
  if (flagged.length) {
    console.log(
      `\n${flagged.length} document(s) flagged as possibly using legacy Devanagari font encoding ` +
        `(text layer present, but reads as neither real Devanagari Unicode nor real English):`,
    );
    for (const f of flagged) console.log(`  - ${f.id}`);
    console.log(
      `\nThese chunks will still enter the corpus for this spike - excluding them would hide exactly ` +
        `the finding Phase 0 needs. But treat any faithfulness result touching them with real caution, ` +
        `and read reports/extraction-notes.md before trusting an answer sourced from one.`,
    );
  } else if (report.length - failed.length > 0) {
    console.log(`No documents flagged for likely legacy-font corruption.`);
  }
  if (failed.length) {
    console.log(`\n${failed.length} document(s) could not be processed:`);
    for (const f of failed) console.log(`  - ${f.id}: ${f.status}${f.error ? " - " + f.error : ""}`);
  }
}

main().catch((err) => {
  console.error("extract.mjs failed:", err);
  process.exitCode = 1;
});
