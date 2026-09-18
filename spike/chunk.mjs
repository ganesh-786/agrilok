#!/usr/bin/env node
// Split extracted text into retrievable chunks and attach provenance +
// classification metadata, matching the shape docs/rag-pipeline.md specifies
// for the real pipeline - chunk size, overlap, and required metadata fields
// are the same numbers, so a Phase 0 result says something about that design,
// not about a different one this spike happened to use.
//
// Token counting is an approximation: words * 0.75 (roughly 1.3 tokens per
// English word, the commonly cited ratio). This is NOT a real tokenizer and
// will be measurably wrong for Devanagari, which tokenizes less efficiently
// per docs/nepali-devanagari.md. For a spike measuring retrieval faithfulness
// rather than exact context-window budgeting, that's an acceptable
// approximation - it is not acceptable for anything that has to fit a hard
// token limit, which is why Phase 1 needs a real tokenizer and this note
// exists to say so plainly rather than let the approximation go unnoticed.
//
// Legacy-font gibberish lines are removed here, before chunking, and the
// count is recorded on every chunk from that source. The extracted .txt files
// are left untouched as evidence. Without this, gibberish took up retrieval
// slots: the first live query pulled LUM-06-021, which is nothing but Preeti
// bytes, into its six results.
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { paths, chunking } from "./lib/config.mjs";
import { removeGibberishLines } from "./lib/corruption.mjs";

const WORDS_PER_TOKEN = 0.75; // see file header

function approxTokens(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.round(words / WORDS_PER_TOKEN);
}

// Best-effort section heading detection: numbered outline markers like
// "1.2.3" or "Section (B)" that these syllabi use heavily (confirmed by
// direct inspection of LUM-01 during research). Best-effort and allowed to
// miss - it's metadata for a human skimming results, not a correctness
// requirement.
const HEADING_RE = /^(?:\d+(?:\.\d+)*\.?\s+\S|Section\s*\([A-Z]\)|[०-९]+\.)/;

function splitIntoParagraphs(text, targetTokens) {
  const blocks = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // pdf-parse (this spike's extraction backend, see extract.mjs) inserts
  // blank lines mostly at page boundaries, not paragraph boundaries -
  // confirmed by running this against the real corpus, where every
  // "paragraph" from a naive blank-line split came out as an entire page
  // (2500-3700 characters, roughly 450-650 tokens on its own). Treating
  // that as one atomic, unsplittable unit produced chunks averaging 916
  // tokens against a 400 target. So: any block still bigger than the target
  // after the blank-line split gets split further on single newlines, which
  // pdf-parse does preserve at real line breaks within a page.
  const paragraphs = [];
  for (const block of blocks) {
    const collapsed = block.replace(/[ \t]+/g, " ").trim();
    if (approxTokens(collapsed) <= targetTokens) {
      paragraphs.push(collapsed);
      continue;
    }
    for (const line of block.split(/\n/)) {
      const t = line.replace(/[ \t]+/g, " ").trim();
      if (t) paragraphs.push(t);
    }
  }
  return paragraphs;
}

function chunkDocument(text, targetTokens, overlapRatio) {
  const paragraphs = splitIntoParagraphs(text, targetTokens);
  const chunks = [];
  let current = [];
  let currentTokens = 0;
  let currentHeading = null;

  function flush() {
    if (current.length === 0) return;
    chunks.push({ text: current.join("\n\n"), sectionHeading: currentHeading });
  }

  for (const para of paragraphs) {
    if (HEADING_RE.test(para) && para.length < 120) {
      currentHeading = para;
    }
    const paraTokens = approxTokens(para);

    if (currentTokens + paraTokens > targetTokens && current.length > 0) {
      flush();
      // Overlap: carry the last overlapRatio of the target forward, cut at
      // word level. This used to walk back whole paragraphs until the budget
      // was met, which always kept at least one paragraph however large - a
      // 330-word paragraph was carried forward against a 45-word budget, and
      // in 57 of 214 adjacent chunk pairs the carried text was more than
      // twice the budget. Those near-duplicates then took several of the six
      // retrieval slots at once.
      const overlapWords = Math.round(targetTokens * overlapRatio * WORDS_PER_TOKEN);
      const tailText = current.join("\n\n").split(/\s+/).filter(Boolean).slice(-overlapWords).join(" ");
      current = tailText ? [tailText] : [];
      currentTokens = approxTokens(tailText);
    }

    current.push(para);
    currentTokens += paraTokens;
  }
  flush();

  return chunks;
}

async function main() {
  const manifest = yaml.load(await fs.readFile(paths.sources, "utf8"));
  const docsById = Object.fromEntries(manifest.documents.map((d) => [d.id, d]));

  await fs.mkdir(paths.chunks, { recursive: true });

  const allChunks = [];
  let skipped = 0;
  let totalDropped = 0;

  for (const doc of manifest.documents) {
    const textPath = path.join(paths.extracted, `${doc.id}.txt`);
    const text = await fs.readFile(textPath, "utf8").catch(() => null);
    if (text === null) {
      console.log(`${doc.id}  SKIPPED - not extracted yet (run \`node extract.mjs\` first)`);
      skipped += 1;
      continue;
    }

    const { text: cleanText, droppedLines } = removeGibberishLines(text);
    totalDropped += droppedLines;

    const rawChunks = chunkDocument(cleanText, chunking.targetTokens, chunking.overlapRatio);
    rawChunks.forEach((c, idx) => {
      allChunks.push({
        chunkId: `${doc.id}-${String(idx).padStart(3, "0")}`,
        text: c.text,
        // embed.mjs compares this against the hash stored with each vector,
        // so a chunk whose text changes gets re-embedded instead of silently
        // keeping a vector computed from the old text.
        contentHash: crypto.createHash("sha256").update(c.text).digest("hex"),
        approxTokens: approxTokens(c.text),
        gibberishLinesDroppedFromSource: droppedLines,
        sectionHeading: c.sectionHeading,
        chunkIndex: idx,
        // Provenance + classification, carried straight from sources.yaml -
        // every field docs/rag-pipeline.md requires a chunk to carry.
        sourceId: doc.id,
        // sourceUrl is what the model is told and what a student sees as the
        // citation link (lib/prompt.mjs, ask.mjs, evaluate.mjs) - it has to
        // actually resolve. For a document recovered via Wayback because its
        // original government URL now 404s, that's the archive snapshot, not
        // the dead original. originalSourceUrl keeps the true provenance
        // record (the URL the government body actually published to)
        // regardless of whether it currently resolves.
        sourceUrl: doc.archived_via || doc.url,
        originalSourceUrl: doc.url,
        sourceTitle: doc.title,
        fetchedOn: doc.verified_on,
        examLevel: doc.level,
        levelConfidence: doc.level_confidence || "stated",
        province: doc.province,
        serviceGroups: doc.groups,
        docType: doc.doc_type,
      });
    });
    const note = droppedLines ? `  (${droppedLines} legacy-font lines dropped)` : "";
    console.log(`${doc.id}  ${rawChunks.length} chunks${note}`);
  }

  await fs.writeFile(paths.chunksIndex, JSON.stringify(allChunks, null, 2));

  const avgTokens = Math.round(
    allChunks.reduce((sum, c) => sum + c.approxTokens, 0) / (allChunks.length || 1),
  );
  console.log(
    `\n${allChunks.length} chunks written to corpus/chunks/chunks.json ` +
      `(target ${chunking.targetTokens} tokens, actual average ~${avgTokens}).`,
  );
  if (totalDropped) {
    console.log(`${totalDropped} legacy-font lines dropped before chunking. Run embed.mjs to refresh changed chunks.`);
  }
  if (skipped) console.log(`${skipped} document(s) skipped - run extract.mjs first.`);
}

main().catch((err) => {
  console.error("chunk.mjs failed:", err);
  process.exitCode = 1;
});
