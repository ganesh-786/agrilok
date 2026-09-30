import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { API_URL, INTERNAL_TOKEN } from "@/lib/config";
import type {
  AskResponse,
  CommonQuestion,
  DocumentDetail,
  LevelCode,
  LevelLibrary,
  Meta,
  SearchResults,
} from "@/lib/types";

export class ApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

/**
 * A stable, non-reversible id for the browser behind this request, used only
 * by the API's rate limiter. The raw address never leaves this process, and a
 * daily salt means ids cannot be linked across days (docs/privacy.md).
 */
async function clientId(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${INTERNAL_TOKEN}|${day}|${ip}`).digest("hex").slice(0, 32);
}

async function request<T>(
  path: string,
  init: RequestInit & { revalidate?: number | false } = {},
): Promise<T | null> {
  const { revalidate, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        accept: "application/json",
        ...(INTERNAL_TOKEN ? { "x-agrilok-internal": INTERNAL_TOKEN } : {}),
        ...rest.headers,
      },
      ...(revalidate === undefined
        ? { cache: "no-store" as const }
        : { next: { revalidate: revalidate === false ? 0 : revalidate } }),
      signal: rest.signal ?? AbortSignal.timeout(120_000),
    });
  } catch (error) {
    throw new ApiUnavailableError(`the API did not respond: ${(error as Error).message}`);
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new ApiUnavailableError(`the API answered ${response.status}`);
  }
  return (await response.json()) as T;
}

function query(params: Record<string, string | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const api = {
  meta: () => request<Meta>("/v1/meta", { revalidate: 60 }),

  levelDocuments: (level: LevelCode, province?: string, group?: string) =>
    request<LevelLibrary>(`/v1/levels/${level}/documents${query({ province, group })}`, {
      revalidate: 300,
    }),

  document: (id: string) =>
    request<DocumentDetail>(`/v1/documents/${encodeURIComponent(id)}`, { revalidate: 300 }),

  commonQuestions: (level: LevelCode) =>
    request<CommonQuestion[]>(`/v1/levels/${level}/common-questions`, { revalidate: 120 }),

  answer: (id: string) =>
    request<AskResponse>(`/v1/answers/${encodeURIComponent(id)}`, { revalidate: 60 }),

  search: async (level: LevelCode, q: string, province?: string, group?: string) =>
    request<SearchResults>(
      `/v1/levels/${level}/search${query({ q, province, group, limit: "12" })}`,
      { headers: { "x-agrilok-client": await clientId() } },
    ),

  ask: async (
    level: LevelCode,
    body: { question: string; province?: string; service_group?: string; fresh?: boolean },
  ): Promise<AskResponse | { error: "rate_limited" | "invalid"; message: string }> => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/v1/levels/${level}/ask`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          ...(INTERNAL_TOKEN ? { "x-agrilok-internal": INTERNAL_TOKEN } : {}),
          "x-agrilok-client": await clientId(),
        },
        body: JSON.stringify(body),
        // Generation with quoted claims can take a while on a busy model.
        signal: AbortSignal.timeout(180_000),
      });
    } catch (error) {
      throw new ApiUnavailableError(`the API did not respond: ${(error as Error).message}`);
    }
    if (response.status === 429) return { error: "rate_limited", message: "" };
    if (response.status === 422) return { error: "invalid", message: "" };
    if (!response.ok) throw new ApiUnavailableError(`the API answered ${response.status}`);
    return (await response.json()) as AskResponse;
  },
};
