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
    responseSchema: prompt.responseSchema,
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

  // The model returns a JSON object (see lib/prompt.mjs's responseSchema)
  // instead of prose we then had to regex for a refusal phrase. That prose
  // approach was patched three times on real runs (see docs/evaluation.md)
  // and failed a new way each time - the model kept finding fresh, honest
  // phrasings of "insufficient" that no fixed pattern anticipated. A schema
  // field the model must set to true or false directly is not something it
  // can phrase around.
  let parsed;
  try {
    parsed = JSON.parse(generation.text || "");
  } catch (err) {
    // Structured output failing to parse is itself a real failure worth
    // surfacing distinctly, not silently treated as a refusal or an answer.
    return {
      question,
      filters,
      refused: true,
      refusalStage: "malformed_structured_output",
      refusalReason: `Model response was not valid JSON: ${err.message}`,
      retrievedChunks: results.map(toChunkSummary),
      answer: generation.text,
      citedSourceIds: [],
    };
  }

  const modelRefused = parsed.sufficient === false;
  const answerText = typeof parsed.answer === "string" ? parsed.answer : "";
  const citedSourceIds = extractCitations(answerText, results);

  return {
    question,
    filters,
    refused: modelRefused,
    refusalStage: modelRefused ? "generation_self_refused" : null,
    refusalReason: modelRefused ? "Model determined retrieved sources were insufficient." : null,
    retrievedChunks: results.map(toChunkSummary),
    answer: answerText,
    citedSourceIds,
    // Chunks that were retrieved but never actually cited in the answer;
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
    docClass: chunk.docClass,
    province: chunk.province,
    serviceGroups: chunk.serviceGroups,
    score: Number(score.toFixed(3)),
  };
}

function extractCitations(answerText, retrievedResults) {
  const knownIds = new Set(retrievedResults.map((r) => r.chunk.chunkId));
  const found = new Set();
  // The model routinely cites several sources in one bracket, e.g.
  // "[LUM-01-016, BAG-01-012]" - a real evaluation run against a 40-document
  // corpus showed the old single-id pattern (`[A-Za-z0-9._-]+` with no comma
  // or space allowed) silently matched nothing for any multi-id bracket,
  // so answers with a dozen visible citations were reported as "Cited:
  // (none)". Matching the whole bracket and splitting on comma fixes this
  // without introducing false positives: a split token only counts if it
  // exactly equals a known chunk id after trimming.
  const re = /\[([^[\]]+)\]/g;
  let m;
  while ((m = re.exec(answerText)) !== null) {
    for (const token of m[1].split(",")) {
      const id = token.trim();
      if (knownIds.has(id)) found.add(id);
    }
  }
  return [...found];
}
