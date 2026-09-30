import { NextResponse, type NextRequest } from "next/server";

import { api } from "@/lib/api";
import { levelFromSlug } from "@/lib/levels";

// The list of pages to save for one level: its hub, every document it shows,
// and its prepared answers. The browser then fetches and caches each one.
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("level") ?? "";
  const level = levelFromSlug(slug);
  if (!level) return NextResponse.json({ error: "unknown level" }, { status: 400 });

  const [library, common] = await Promise.all([
    api.levelDocuments(level),
    api.commonQuestions(level).catch(() => []),
  ]);
  const urls = new Set<string>([`/${slug}`, "/how-it-works", "/offline"]);
  for (const doc of [...(library?.syllabi ?? []), ...(library?.reference ?? [])]) {
    urls.add(`/documents/${encodeURIComponent(doc.id)}`);
  }
  for (const item of common ?? []) urls.add(`/answers/${item.id}`);
  return NextResponse.json(
    { level: slug, urls: [...urls] },
    { headers: { "cache-control": "no-store" } },
  );
}
