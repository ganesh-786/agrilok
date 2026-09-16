// Retrieval: embed the query, cosine-similarity against the local vector
// store, filter by metadata, return the top K above a minimum score.
//
// This is vector-only, not the hybrid keyword+vector retrieval
// docs/rag-pipeline.md specifies for the real pipeline - see README.md's
// "known gaps". It is enough to test the thing Phase 0 actually needs to
// know: given a real question and real retrieved text, is the generated
// answer faithful to that text. Whether vector-only recall is good enough is
// itself part of what the faithfulness review should surface.
import fs from "node:fs/promises";
import { paths, retrieval as retrievalConfig } from "./config.mjs";
import { embedTexts } from "./gemini.mjs";

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

let cache = null;
async function loadCorpus() {
  if (cache) return cache;
  const [chunksRaw, storeRaw] = await Promise.all([
    fs.readFile(paths.chunksIndex, "utf8"),
    fs.readFile(paths.vectorStore, "utf8"),
  ]);
  const chunks = JSON.parse(chunksRaw);
  const store = JSON.parse(storeRaw);
  cache = { chunks, vectors: store.vectors };
  return cache;
}

/**
 * @param {string} query
 * @param {{level?: number, province?: string, group?: string}} filters
 * @returns {Promise<Array<{chunk: object, score: number}>>}
 */
export async function retrieve(query, filters = {}) {
  const { chunks, vectors } = await loadCorpus();
  const [queryVector] = await embedTexts([query], "RETRIEVAL_QUERY");

  let candidates = chunks;
  if (filters.level !== undefined) {
    candidates = candidates.filter((c) => c.examLevel === filters.level);
  }
  if (filters.province) {
    candidates = candidates.filter((c) => c.province === filters.province);
  }
  if (filters.group) {
    candidates = candidates.filter((c) => c.serviceGroups?.includes(filters.group));
  }

  const scored = candidates
    .filter((c) => vectors[c.chunkId])
    .map((c) => ({ chunk: c, score: cosineSimilarity(queryVector, vectors[c.chunkId]) }))
    .sort((a, b) => b.score - a.score);

  const topK = scored.slice(0, retrievalConfig.topK);
  const aboveThreshold = topK.filter((r) => r.score >= retrievalConfig.minScore);

  return {
    results: aboveThreshold,
    // Kept even when below threshold - useful for a human reviewing why the
    // pipeline refused, without that context being fed to the model itself.
    belowThresholdCount: topK.length - aboveThreshold.length,
    totalCandidates: candidates.length,
  };
}
