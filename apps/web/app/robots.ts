import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/level-4/search", "/level-7/search"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
