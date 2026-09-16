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
  if (!raw) return { model: null, dimensions: null, vectors: {} };
  const parsed = JSON.parse(raw);
  return { model: parsed.model, dimensions: parsed.dimensions, vectors: parsed.vectors || {} };
}

async function main() {
  const chunksRaw = await fs.readFile(paths.chunksIndex, "utf8").catch(() => null);
  if (!chunksRaw) {
    console.error("No chunks found. Run `node chunk.mjs` first.");
    process.exitCode = 1;
    return;
  }
  const chunks = JSON.parse(chunksRaw);
  const store = await loadExistingStore();

  const alreadyDone = Object.keys(store.vectors).length;
  const remaining = chunks.filter((c) => !store.vectors[c.chunkId]);

  console.log(`${chunks.length} chunks total, ${alreadyDone} already embedded, ${remaining.length} remaining.`);
  if (remaining.length === 0) {
    console.log("Nothing to do. Delete corpus/chunks/vectors.json to force a full re-embed.");
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

  console.log(
    `\nDone. ${Object.keys(store.vectors).length}/${chunks.length} chunks embedded` +
      (failures ? `, ${failures} failed (re-run to retry them).` : "."),
  );
}

main().catch((err) => {
  console.error("embed.mjs failed:", err);
  process.exitCode = 1;
});
