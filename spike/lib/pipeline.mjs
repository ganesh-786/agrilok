// Ties retrieval, prompt assembly and generation into one call. Used by both
// ask.mjs (interactive, one question) and evaluate.mjs (the golden set, many
// questions) so the two never drift apart in behaviour.
import { retrieve } from "./retrieve.mjs";
import { buildPrompt } from "./prompt.mjs";
import { generate } from "./gemini.mjs";

/**
 * @param {string} question
 * @param {{level?: number, province?: string, group?: string}} filters
 */
export async function answerQuestion(question, filters = {}) {
  const { results, belowThresholdCount, totalCandidates } = await retrieve(question, filters);

  if (results.length === 0) {
    return {
      question,
      filters,
      refused: true,
      refusalStage: "retrieval",
      refusalReason:
        totalCandidates === 0
          ? "No chunks matched the given filters at all - check the level/province/group values."
          : belowThresholdCount > 0
            ? `${belowThresholdCount} chunk(s) were found but none scored above the similarity threshold - ` +
              `the corpus likely does not cover this question.`
            : "No chunks were retrieved.",
      retrievedChunks: [],
      answer: null,
      citedSourceIds: [],
    };
  }

  const prompt = buildPrompt(question, results);
  const generation = await generate({
    systemInstruction: prompt.systemInstruction,
    contents: prompt.contents,
  });

  if (generation.blocked) {
    return {
      question,
      filters,
      refused: true,
      refusalStage: "generation_blocked",
      refusalReason: `Gemini blocked the response: ${generation.blockReason}`,
      retrievedChunks: results.map(toChunkSummary),
      answer: null,
      citedSourceIds: [],
    };
  }

  // The model is instructed to refuse in-text when sources are insufficient
  // (see lib/prompt.mjs rule 1). Detect that so evaluate.mjs can report it
  // as a refusal rather than scoring it as a normal answer.
  const modelRefused = /does not contain enough information to answer/i.test(generation.text || "");

  const citedSourceIds = extractCitations(generation.text || "", results);

  return {
    question,
    filters,
    refused: modelRefused,
    refusalStage: modelRefused ? "generation_self_refused" : null,
    refusalReason: modelRefused ? "Model determined retrieved sources were insufficient." : null,
    retrievedChunks: results.map(toChunkSummary),
    answer: generation.text,
    citedSourceIds,
    // Chunks that were retrieved but never actually cited in the answer -
    // worth a human's attention during faithfulness review; may mean
    // retrieval over-fetched, or the model under-cited.
    uncitedRetrievedIds: results
      .map((r) => r.chunk.chunkId)
      .filter((id) => !citedSourceIds.includes(id)),
  };
}

function toChunkSummary({ chunk, score }) {
  return {
    chunkId: chunk.chunkId,
    sourceId: chunk.sourceId,
    sourceTitle: chunk.sourceTitle,
    sourceUrl: chunk.sourceUrl,
    examLevel: chunk.examLevel,
    province: chunk.province,
    serviceGroups: chunk.serviceGroups,
    score: Number(score.toFixed(3)),
  };
}

function extractCitations(answerText, retrievedResults) {
  const knownIds = new Set(retrievedResults.map((r) => r.chunk.chunkId));
  const found = new Set();
  const re = /\[([A-Za-z0-9._-]+)\]/g;
  let m;
  while ((m = re.exec(answerText)) !== null) {
    if (knownIds.has(m[1])) found.add(m[1]);
  }
  return [...found];
}
