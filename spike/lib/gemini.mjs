// Minimal Gemini REST client. No SDK dependency - one fewer thing that can be
// the wrong version, and the surface area we actually need (generateContent,
// embedContent) is small enough that a thin wrapper is more honest about what
// it does than a full SDK would be for a spike.
//
// Handles the two things that matter for reliability at free-tier scale:
// rate limiting (space requests out so we hit our own ceiling before the
// provider's) and retry-with-backoff on 429/5xx. Both are required reading
// before touching this file: docs/free-tier-budget.md, ADR-0004.
import { getApiKey, gemini as geminiConfig } from "./config.mjs";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// --- Rate limiting -----------------------------------------------------
// A simple minimum-interval gate, not a full token bucket - a spike run by
// one person asking one question at a time doesn't need more than that, and
// a more elaborate limiter would be untested complexity for no real benefit
// here.
let lastRequestAt = 0;

async function throttle() {
  const minIntervalMs = Math.ceil(60000 / geminiConfig.maxRequestsPerMinute);
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < minIntervalMs) {
    await sleep(minIntervalMs - elapsed);
  }
  lastRequestAt = Date.now();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Retry with backoff -------------------------------------------------
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 4;
// Retry-After is honoured below, but never past this, so a provider-sent
// value (which could legitimately be hours for a daily quota reset) can
// never stall a run indefinitely.
const MAX_BACKOFF_MS = 20000;

async function callWithRetry(fn, label) {
  let attempt = 0;
  for (;;) {
    attempt += 1;
    await throttle();
    try {
      return await fn();
    } catch (err) {
      const status = err.status;
      // A 429 is not one thing. "Too many requests this second" clears in
      // seconds and is worth retrying. "You have used today's quota" will
      // not clear before this process exits, no matter how long it waits -
      // found the hard way: this used to retry both identically, burning
      // four backoff cycles (30s) against a quota that could not possibly
      // reset in that window. err.exhausted is set below, from the parsed
      // response body, not from the status code alone.
      const retryable = RETRYABLE_STATUS.has(status) && !err.exhausted;
      if (!retryable || attempt > MAX_RETRIES) {
        throw err;
      }
      const retryAfterMs = err.retryAfterSeconds ? err.retryAfterSeconds * 1000 : null;
      const backoffMs = Math.min(
        retryAfterMs ?? 2 ** attempt * 1000 + Math.random() * 500,
        MAX_BACKOFF_MS,
      );
      console.warn(
        `  [gemini] ${label} got ${status}, retrying in ${Math.round(backoffMs / 1000)}s ` +
          `(attempt ${attempt}/${MAX_RETRIES})`,
      );
      await sleep(backoffMs);
    }
  }
}

// Turns a non-ok HTTP response into an Error carrying everything needed to
// decide whether it is worth retrying, and everything needed to diagnose it
// if not. This used to just slice the raw response body to 300 characters -
// found, on a real 429, that the cut landed mid-sentence right before the
// one line ("Quota exceeded for quota metric ... model ...") that would have
// said which quota was hit and for which model. Now parses Google's
// structured error body instead of truncating it blindly.
export function buildApiError(status, rawText, label, retryAfterHeader) {
  let message = rawText;
  let googleStatus = null;
  let quotaDetail = null;

  try {
    const parsed = JSON.parse(rawText);
    const apiError = parsed?.error;
    if (apiError) {
      message = apiError.message ?? message;
      googleStatus = apiError.status ?? null;
      const quotaFailure = (apiError.details ?? []).find((d) =>
        d?.["@type"]?.includes("QuotaFailure"),
      );
      const violation = quotaFailure?.violations?.[0];
      if (violation) {
        quotaDetail = `quotaId=${violation.quotaId ?? "?"} quotaMetric=${violation.quotaMetric ?? "?"}`;
      }
    }
  } catch {
    // Not JSON, or not the shape expected - fall through with the raw text.
    // Still not truncated: a non-JSON error body from this API is itself
    // useful evidence, and these bodies are small enough that there is no
    // real cost to keeping the whole thing.
  }

  // RESOURCE_EXHAUSTED is Google's status for "quota exceeded", distinct
  // from a plain 429 for pacing - a project-level or per-model daily/minute
  // budget being used up, which will not resolve within this process's
  // retry window. Falls back to matching the human-readable message in case
  // the status field is ever absent, so this does not silently stop
  // detecting exhaustion if the response shape shifts slightly.
  const exhausted =
    googleStatus === "RESOURCE_EXHAUSTED" || /exceeded your current quota/i.test(message);

  const err = new Error(
    `${label} failed: HTTP ${status}${googleStatus ? ` (${googleStatus})` : ""} - ${message}` +
      (quotaDetail ? ` [${quotaDetail}]` : ""),
  );
  err.status = status;
  err.exhausted = exhausted;
  if (retryAfterHeader) err.retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
  return err;
}

async function post(pathSuffix, body, label) {
  const url = `${API_BASE}/${pathSuffix}`;
  // label is passed through to callWithRetry below as well as being used
  // directly inside this closure - it used to be captured here but never
  // forwarded, so callWithRetry's own retry-warning log printed
  // "undefined got <status>" instead of naming the call that failed. Found
  // by a test asserting on the warning text, not by inspection.
  return callWithRetry(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), geminiConfig.requestTimeoutMs);
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": getApiKey(),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (networkErr) {
      if (networkErr.name === "AbortError") {
        const err = new Error(`${label} timed out after ${geminiConfig.requestTimeoutMs}ms`);
        err.status = 504;
        throw err;
      }
      throw networkErr;
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw buildApiError(res.status, text, label, res.headers.get("retry-after"));
    }
    return res.json();
  }, label);
}

/**
 * Embed a single text. Kept for callers that only ever have one text (query
 * embedding at retrieval time) - embedTextsBatch below is what embed.mjs
 * uses for the corpus, because one-request-per-chunk was the actual reason a
 * 170-chunk embed run took 22 minutes: the throttle, not the API, dominated
 * that time. This function still exists because a single query embedding
 * doesn't benefit from batching and shouldn't wait to be grouped with others.
 * @param {string[]} texts
 * @param {"RETRIEVAL_DOCUMENT"|"RETRIEVAL_QUERY"} taskType
 */
export async function embedTexts(texts, taskType) {
  const out = [];
  for (const [i, text] of texts.entries()) {
    const body = {
      model: `models/${geminiConfig.embeddingModel}`,
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: geminiConfig.embeddingDimensions,
    };
    const json = await post(
      `models/${geminiConfig.embeddingModel}:embedContent`,
      body,
      `embed[${i + 1}/${texts.length}]`,
    );
    const values = json?.embedding?.values;
    if (!Array.isArray(values)) {
      throw new Error(`embed[${i}] returned no embedding.values: ${JSON.stringify(json).slice(0, 200)}`);
    }
    out.push(values);
  }
  return out;
}

// Google does not document a maximum request count per batchEmbedContents
// call (checked https://ai.google.dev/api/embeddings and the developer
// forum directly - neither states one). 25 is chosen to be comfortably under
// anything plausible rather than measured against a real ceiling, since
// there is no documented ceiling to measure against.
const DEFAULT_BATCH_SIZE = 25;

/**
 * Embeds many texts using batchEmbedContents: one HTTP request for up to
 * `batchSize` texts, instead of one request per text. This is the actual fix
 * for embedding taking 22 minutes over 170 chunks at a conservative 8
 * requests/minute throttle - that time is almost entirely the throttle
 * waiting between requests, not the API doing work, so cutting the request
 * count by ~25x cuts the wall-clock time by roughly the same factor without
 * needing to touch the rate limit at all.
 *
 * If a batch request fails, it is split in half and retried rather than
 * abandoning the whole batch - this keeps error attribution close to what
 * embedTexts gives per-item, in exchange for a few extra requests only on
 * the batch that actually failed.
 *
 * @param {{ id: string, text: string }[]} items
 * @param {"RETRIEVAL_DOCUMENT"|"RETRIEVAL_QUERY"} taskType
 * @param {{ batchSize?: number, onGroupDone?: (results: Map<string, number[]>) => Promise<void>|void }} [options]
 *   onGroupDone is called with the vectors for each completed group of API
 *   calls (a full batch, or the pieces a failed batch was split into) as
 *   soon as they are known, so the caller can checkpoint incrementally
 *   instead of losing everything since the last write if the run stops
 *   partway through.
 * @returns {Promise<Map<string, number[]>>} every vector keyed by item id
 */
export async function embedTextsBatch(items, taskType, options = {}) {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const results = new Map();

  async function embedGroup(group) {
    if (group.length === 0) return;
    if (group.length === 1) {
      const [vector] = await embedTexts([group[0].text], taskType);
      results.set(group[0].id, vector);
      await options.onGroupDone?.(new Map([[group[0].id, vector]]));
      return;
    }

    const body = {
      requests: group.map((item) => ({
        model: `models/${geminiConfig.embeddingModel}`,
        content: { parts: [{ text: item.text }] },
        taskType,
        outputDimensionality: geminiConfig.embeddingDimensions,
      })),
    };

    try {
      const json = await post(
        `models/${geminiConfig.embeddingModel}:batchEmbedContents`,
        body,
        `embedBatch[${group.length} items]`,
      );
      const embeddings = json?.embeddings;
      if (!Array.isArray(embeddings) || embeddings.length !== group.length) {
        throw new Error(
          `batchEmbedContents returned ${embeddings?.length ?? "no"} embeddings for ${group.length} requests`,
        );
      }
      const groupResults = new Map();
      group.forEach((item, i) => {
        const values = embeddings[i]?.values;
        if (!Array.isArray(values)) {
          throw new Error(`batch item ${i} (${item.id}) has no embedding.values`);
        }
        results.set(item.id, values);
        groupResults.set(item.id, values);
      });
      await options.onGroupDone?.(groupResults);
    } catch (err) {
      if (group.length === 1) throw err; // nothing smaller to fall back to
      console.warn(
        `  [gemini] batch of ${group.length} failed (${err.message.slice(0, 100)}), splitting and retrying`,
      );
      const mid = Math.ceil(group.length / 2);
      await embedGroup(group.slice(0, mid));
      await embedGroup(group.slice(mid));
    }
  }

  for (let i = 0; i < items.length; i += batchSize) {
    await embedGroup(items.slice(i, i + batchSize));
  }
  return results;
}

/**
 * Generate an answer. `systemInstruction` and `contents` follow the Gemini
 * REST shape directly rather than being abstracted away - for a spike whose
 * whole purpose is inspecting exactly what went into the model, hiding the
 * request shape behind a nicer API would work against the goal.
 *
 * `responseSchema`, when given, is passed through as Gemini's structured
 * JSON output config. This replaced regex-matching the model's prose for a
 * refusal signal after that approach failed three separate times on real
 * runs (see docs/evaluation.md) - each fix caught one more phrasing the
 * model used to say "insufficient" without ever closing the class of the
 * problem. A schema field the model must set to true or false is not
 * guessable-around the way prose is grep-able-around.
 */
export async function generate({ systemInstruction, contents, temperature = 0.1, responseSchema }) {
  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: 2048,
      ...(responseSchema ? { responseMimeType: "application/json", responseSchema } : {}),
    },
  };
  const json = await post(
    `models/${geminiConfig.generationModel}:generateContent`,
    body,
    "generate",
  );

  const candidate = json?.candidates?.[0];
  if (!candidate) {
    const blockReason = json?.promptFeedback?.blockReason;
    if (blockReason) {
      return { text: null, blocked: true, blockReason, raw: json };
    }
    throw new Error(`generate returned no candidates: ${JSON.stringify(json).slice(0, 300)}`);
  }
  const text = candidate.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return {
    text,
    blocked: false,
    finishReason: candidate.finishReason,
    raw: json,
  };
}
