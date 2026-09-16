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

async function callWithRetry(fn, label) {
  let attempt = 0;
  for (;;) {
    attempt += 1;
    await throttle();
    try {
      return await fn();
    } catch (err) {
      const status = err.status;
      const retryable = RETRYABLE_STATUS.has(status);
      if (!retryable || attempt > MAX_RETRIES) {
        throw err;
      }
      // Exponential backoff with jitter. Honour Retry-After if the API sent one -
      // same courtesy this project extends to the government sites it crawls
      // (docs/crawl-policy.md), applied here to a provider we depend on.
      const retryAfterMs = err.retryAfterSeconds ? err.retryAfterSeconds * 1000 : null;
      const backoffMs = retryAfterMs ?? Math.min(2 ** attempt * 1000, 20000) + Math.random() * 500;
      console.warn(
        `  [gemini] ${label} got ${status}, retrying in ${Math.round(backoffMs / 1000)}s ` +
          `(attempt ${attempt}/${MAX_RETRIES})`,
      );
      await sleep(backoffMs);
    }
  }
}

async function post(pathSuffix, body, label) {
  const url = `${API_BASE}/${pathSuffix}`;
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
      const err = new Error(`${label} failed: HTTP ${res.status} ${text.slice(0, 300)}`);
      err.status = res.status;
      const retryAfter = res.headers.get("retry-after");
      if (retryAfter) err.retryAfterSeconds = Number.parseInt(retryAfter, 10);
      throw err;
    }
    return res.json();
  });
}

/**
 * Embed a batch of texts. Returns an array of float arrays, same order as input.
 * @param {string[]} texts
 * @param {"RETRIEVAL_DOCUMENT"|"RETRIEVAL_QUERY"} taskType
 */
export async function embedTexts(texts, taskType) {
  const out = [];
  // One request per text rather than a batch call - simpler error attribution
  // (we know exactly which chunk failed) and the corpus here is ~150-300
  // chunks, not large enough for batching to matter.
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

/**
 * Generate an answer. `systemInstruction` and `contents` follow the Gemini
 * REST shape directly rather than being abstracted away - for a spike whose
 * whole purpose is inspecting exactly what went into the model, hiding the
 * request shape behind a nicer API would work against the goal.
 */
export async function generate({ systemInstruction, contents, temperature = 0.1 }) {
  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: 2048,
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
