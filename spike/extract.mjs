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
// real documents found exactly that in 10 of them (see
// reports/extraction-notes.md) - this is not a hypothetical concern.
//
// This script only measures and reports. The raw extracted text is written
// unmodified, because it is the evidence of what the PDF actually contained.
// Removing gibberish lines happens downstream in chunk.mjs, on derived data.
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
import { analyzeText } from "./lib/corruption.mjs";

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

// --- Main ------------------------------------------------------------------

async function main() {
  const manifest = yaml.load(await fs.readFile(paths.sources, "utf8"));
  await fs.mkdir(paths.extracted, { recursive: true });

  const pdftotextFallbackAvailable = await checkPdftotext();
  console.log(
    `Primary backend: pdf-parse (pure JS). Fallback: pdftotext ${pdftotextFallbackAvailable ? "(available)" : "(not found - pdf-parse only)"}.\n`,
  );

  const report = [];
  const MIN_TEXT_LAYER_CHARS = 200;

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
      const analysis = analyzeText(text);

      const outPath = path.join(paths.extracted, `${doc.id}.txt`);
      await fs.writeFile(outPath, text, "utf8");

      // A scanned PDF has no text layer, so pdf-parse succeeds and returns
      // almost nothing. This used to print "OK - 0 chars" and carry on, so a
      // 91-page regulation and a 51-page Act were treated as extracted while
      // producing no chunks and no warning. Nothing real is under 200
      // characters, so treat that as a distinct, visible failure that needs
      // OCR (ADR-0002) instead of a success.
      if (analysis.totalChars < MIN_TEXT_LAYER_CHARS) {
        console.log(
          `NO TEXT LAYER - ${analysis.totalChars} chars from a ${(exists.size / 1024 / 1024).toFixed(1)} MB file, ` +
            `almost certainly a scanned image. Needs OCR with mandatory review (ADR-0002); nothing will be chunked.`,
        );
        report.push({ id: doc.id, status: "no_text_layer", bytes: exists.size, ...analysis });
        continue;
      }

      const flag = analysis.gibberishLines ? "  (legacy-font lines found)" : "";
      console.log(
        `OK - ${analysis.totalChars} chars, ${analysis.devanagariCount} Devanagari, ` +
          `${analysis.gibberishLines}/${analysis.substantialLines} gibberish lines [${usedBackend}]${flag}`,
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

  const affected = report.filter((r) => r.gibberishLines > 0);
  const failed = report.filter((r) => r.status !== "extracted");

  console.log(`\n${report.length - failed.length}/${report.length} extracted.`);
  if (affected.length) {
    const total = affected.reduce((sum, r) => sum + r.gibberishLines, 0);
    console.log(
      `\n${affected.length} document(s) contain legacy-font Devanagari lines (${total} lines in total):`,
    );
    for (const r of affected) {
      console.log(`  - ${r.id}: ${r.gibberishLines}/${r.substantialLines} lines`);
    }
    console.log(
      `\nThe raw text above is kept as extracted. chunk.mjs drops these lines from the chunks it ` +
        `builds and records how many it dropped. See reports/extraction-notes.md.`,
    );
  } else if (report.length - failed.length > 0) {
    console.log(`No legacy-font lines found.`);
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
