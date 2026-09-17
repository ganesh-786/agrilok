#!/usr/bin/env node
// Embed every chunk with gemini-embedding-001 and write a local vector store.
//
// Uses batchEmbedContents (lib/gemini.mjs embedTextsBatch), grouping chunks
// into requests of 25 instead of one request per chunk. The first real run
// of this script, one request per chunk, took 22 minutes for 170 chunks at
// the conservative 8 req/min default - almost all of that was the throttle
// waiting between requests, not API latency, since a batch of 25 costs the
// same one request as a batch of 1. Cutting the request count by ~25x cuts
// the wall-clock time by roughly the same factor without touching the rate
// limit.
//
// Still checkpoints after every completed group of API calls, not only at
// the end, and is safe to re-run - it picks up where it left off rather than
// re-spending quota on work already done. That matters generally
// (docs/free-tier-budget.md) and especially here, where quota is the
// scarcest thing a single free-tier key has.
import fs from "node:fs/promises";
import { paths, gemini as geminiConfig } from "./lib/config.mjs";
import { embedTextsBatch } from "./lib/gemini.mjs";

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
  const batchSize = 25; // see file header - no documented server-side max, this is a conservative choice
  const requestCount = Math.ceil(remaining.length / batchSize);
  const etaMin = Math.ceil(requestCount / geminiConfig.maxRequestsPerMinute) || 1;
  console.log(
    `Grouping into ${requestCount} batch request(s) of up to ${batchSize} chunks each. ` +
      `At ${geminiConfig.maxRequestsPerMinute} req/min this will take roughly ${etaMin} minute(s).\n`,
  );

  store.model = geminiConfig.embeddingModel;
  store.dimensions = geminiConfig.embeddingDimensions;

  const chunkById = new Map(remaining.map((c) => [c.chunkId, c]));
  let done = 0;
  let failedIds = [];

  async function onGroupDone(groupResults) {
    for (const [chunkId, vector] of groupResults) {
      store.vectors[chunkId] = vector;
      store.hashes[chunkId] = chunkById.get(chunkId).contentHash;
    }
    done += groupResults.size;
    // Checkpoint after every completed group. A JSON.stringify + write of a
    // few hundred short vectors is cheap; losing embedding work to a network
    // blip partway through is not.
    await fs.writeFile(paths.vectorStore, JSON.stringify(store));
    console.log(`  ${alreadyDone + done}/${chunks.length} embedded`);
  }

  try {
    const items = remaining.map((c) => ({ id: c.chunkId, text: c.text }));
    await embedTextsBatch(items, "RETRIEVAL_DOCUMENT", { batchSize, onGroupDone });
  } catch (err) {
    // embedGroup already retries a failed batch by splitting it in half down
    // to individual calls (lib/gemini.mjs), so an error reaching here means
    // even a single-chunk call failed - not worth guessing at further
    // splitting, just report it and let a re-run retry from the checkpoint.
    console.error(`\nStopped early: ${err.message.slice(0, 200)}`);
    failedIds = chunks.filter((c) => !isFresh(store, c)).map((c) => c.chunkId);
  }

  const fresh = chunks.filter((c) => isFresh(store, c)).length;
  console.log(
    `\nDone. ${fresh}/${chunks.length} chunks embedded and up to date` +
      (failedIds.length ? `, ${failedIds.length} not yet embedded (re-run to retry).` : "."),
  );
}

main().catch((err) => {
  console.error("embed.mjs failed:", err);
  process.exitCode = 1;
});
