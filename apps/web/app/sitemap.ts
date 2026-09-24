import type { MetadataRoute } from "next";

import { api } from "@/lib/api";
import { SITE_URL } from "@/lib/config";
import type { LevelCode } from "@/lib/types";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["/", "/level-4", "/level-7", "/sources", "/how-it-works", "/privacy", "/credits"];
  const entries: MetadataRoute.Sitemap = pages.map((path) => ({ url: `${SITE_URL}${path}` }));
  try {
    const levels: LevelCode[] = ["level_4", "level_7"];
    const libraries = await Promise.all(levels.map((level) => api.levelDocuments(level)));
    const ids = new Set<string>();
    for (const library of libraries) {
      for (const doc of [...(library?.syllabi ?? []), ...(library?.reference ?? [])])
        ids.add(doc.id);
    }
    for (const id of ids) entries.push({ url: `${SITE_URL}/documents/${encodeURIComponent(id)}` });
  } catch {
    // Without the API the sitemap lists the fixed pages only.
  }
  return entries;
}
