#!/usr/bin/env node
// Embed every chunk with gemini-embedding-001 and write a local vector store.
//
// At the conservative rate limit this project sets by default (8 req/min,
// spike/.env.example), a ~150-300 chunk corpus takes 20-40 minutes to embed -
// a real runtime, not a formality. So this script checkpoints after every
// successful embedding and is safe to re-run: it picks up where it left off
// rather than re-spending quota on work already done. That matters generally
// (docs/free-tier-budget.md) and especially here, where quota is the
// scarcest thing a single free-tier key has.
import fs from "node:fs/promises";
import { paths, gemini as geminiConfig } from "./lib/config.mjs";
import { embedTexts } from "./lib/gemini.mjs";

async function loadExistingStore() {
  const raw = await fs.readFile(paths.vectorStore, "utf8").catch(() => null);
  if (!raw) return { model: null, dimensions: null, vectors: {}, hashes: {} };
  const parsed = JSON.parse(raw);
  return {
    model: parsed.model,
    dimensions: parsed.dimensions,
    vectors: parsed.vectors || {},
    // Stores written before hashes were recorded have none. Every vector in
    // such a store counts as stale, because there is no way to tell which
    // text it was computed from.
    hashes: parsed.hashes || {},
  };
}

// A vector is reusable only if it was computed from exactly this chunk's
// current text, with the currently configured model and dimensions. Keying on
// chunkId alone was a real bug: re-chunking with gibberish lines removed keeps
// most chunk IDs but changes their text, and the old vectors would have been
// silently reused for text they no longer describe.
function isFresh(store, chunk) {
  return Boolean(store.vectors[chunk.chunkId]) && store.hashes[chunk.chunkId] === chunk.contentHash;
}

async function main() {
  const chunksRaw = await fs.readFile(paths.chunksIndex, "utf8").catch(() => null);
  if (!chunksRaw) {
    console.error("No chunks found. Run `node chunk.mjs` first.");
    process.exitCode = 1;
    return;
  }
  const chunks = JSON.parse(chunksRaw);
  if (chunks.some((c) => !c.contentHash)) {
    console.error("chunks.json predates content hashes. Run `node chunk.mjs` again first.");
    process.exitCode = 1;
    return;
  }
  const store = await loadExistingStore();

  const settingsChanged =
    Object.keys(store.vectors).length > 0 &&
    (store.model !== geminiConfig.embeddingModel || store.dimensions !== geminiConfig.embeddingDimensions);
  if (settingsChanged) {
    console.log(
      `Embedding settings changed (${store.model}/${store.dimensions} -> ` +
        `${geminiConfig.embeddingModel}/${geminiConfig.embeddingDimensions}). All vectors are stale.`,
    );
    store.vectors = {};
    store.hashes = {};
  }

  // Drop vectors for chunks that no longer exist, so retrieval can never
  // return a chunk ID that chunks.json doesn't know about.
  const liveIds = new Set(chunks.map((c) => c.chunkId));
  let pruned = 0;
  for (const id of Object.keys(store.vectors)) {
    if (!liveIds.has(id)) {
      delete store.vectors[id];
      delete store.hashes[id];
      pruned += 1;
    }
  }

  const remaining = chunks.filter((c) => !isFresh(store, c));
  const alreadyDone = chunks.length - remaining.length;

  console.log(
    `${chunks.length} chunks total, ${alreadyDone} up to date, ${remaining.length} to embed` +
      (pruned ? `, ${pruned} stale vector(s) pruned.` : "."),
  );
  if (remaining.length === 0) {
    if (pruned) await fs.writeFile(paths.vectorStore, JSON.stringify(store));
    console.log("Nothing to embed.");
    return;
  }
  const etaMin = Math.ceil((remaining.length / geminiConfig.maxRequestsPerMinute));
  console.log(`At ${geminiConfig.maxRequestsPerMinute} req/min this will take roughly ${etaMin} minute(s).\n`);

  store.model = geminiConfig.embeddingModel;
  store.dimensions = geminiConfig.embeddingDimensions;

  let done = 0;
  let failures = 0;

  for (const chunk of remaining) {
    try {
      const [vector] = await embedTexts([chunk.text], "RETRIEVAL_DOCUMENT");
      store.vectors[chunk.chunkId] = vector;
      store.hashes[chunk.chunkId] = chunk.contentHash;
      done += 1;

      // Checkpoint every chunk. A single JSON.stringify + write of a few
      // hundred short vectors is cheap; losing 20 minutes of embedding work
      // to a network blip is not.
      await fs.writeFile(paths.vectorStore, JSON.stringify(store));

      if (done % 10 === 0 || done === remaining.length) {
        console.log(`  ${alreadyDone + done}/${chunks.length} embedded`);
      }
    } catch (err) {
      failures += 1;
      console.error(`  FAILED ${chunk.chunkId}: ${err.message.slice(0, 150)}`);
      if (failures > 10) {
        console.error("\nToo many consecutive-ish failures. Stopping rather than burning quota. " +
          "Check GEMINI_API_KEY and network, then re-run - already-embedded chunks are saved.");
        process.exitCode = 1;
        return;
      }
    }
  }

  const fresh = chunks.filter((c) => isFresh(store, c)).length;
  console.log(
    `\nDone. ${fresh}/${chunks.length} chunks embedded and up to date` +
      (failures ? `, ${failures} failed (re-run to retry them).` : "."),
  );
}

main().catch((err) => {
  console.error("embed.mjs failed:", err);
  process.exitCode = 1;
});
