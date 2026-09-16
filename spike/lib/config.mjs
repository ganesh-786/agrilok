// Central config for the spike. One place to read env vars so every script
// fails the same way, with the same message, when something is missing.
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPIKE_ROOT = path.resolve(__dirname, "..");

loadEnv({ path: path.join(SPIKE_ROOT, ".env") });

function required(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing ${name}. Copy spike/.env.example to spike/.env and fill it in. ` +
        `Get a free key at https://aistudio.google.com/apikey`,
    );
  }
  return v;
}

function int(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) throw new Error(`${name} must be an integer, got "${v}"`);
  return n;
}

function float(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number.parseFloat(v);
  if (Number.isNaN(n)) throw new Error(`${name} must be a number, got "${v}"`);
  return n;
}

export const paths = {
  root: SPIKE_ROOT,
  sources: path.join(SPIKE_ROOT, "corpus", "sources.yaml"),
  raw: path.join(SPIKE_ROOT, "corpus", "raw"),
  extracted: path.join(SPIKE_ROOT, "corpus", "extracted"),
  chunks: path.join(SPIKE_ROOT, "corpus", "chunks"),
  chunksIndex: path.join(SPIKE_ROOT, "corpus", "chunks", "chunks.json"),
  vectorStore: path.join(SPIKE_ROOT, "corpus", "chunks", "vectors.json"),
  extractionReport: path.join(SPIKE_ROOT, "corpus", "extracted", "extraction-report.json"),
  goldenSet: path.join(SPIKE_ROOT, "golden_set", "questions.yaml"),
  reports: path.join(SPIKE_ROOT, "reports"),
};

// Lazily validated — only scripts that actually call the API need the key,
// so `node chunk.mjs` shouldn't fail just because .env isn't filled in yet.
export function getApiKey() {
  return required("GEMINI_API_KEY");
}

export const gemini = {
  generationModel: process.env.GEMINI_GENERATION_MODEL || "gemini-flash-latest",
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
  embeddingDimensions: int("GEMINI_EMBEDDING_DIMENSIONS", 768),
  maxRequestsPerMinute: int("GEMINI_MAX_REQUESTS_PER_MINUTE", 8),
  requestTimeoutMs: int("GEMINI_REQUEST_TIMEOUT_MS", 30000),
};

export const retrieval = {
  topK: int("RETRIEVAL_TOP_K", 6),
  minScore: float("RETRIEVAL_MIN_SCORE", 0.55),
};

export const chunking = {
  targetTokens: int("CHUNK_TARGET_TOKENS", 400),
  overlapRatio: float("CHUNK_OVERLAP_RATIO", 0.15),
};
