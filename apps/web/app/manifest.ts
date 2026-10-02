import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "agrilok · लोकसेवा कृषि तयारी",
    short_name: "agrilok",
    description:
      "Official Loksewa agriculture syllabi for Level 4 and Level 7, and answers that cite them.",
    lang: "ne",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // The paper canvas from app/globals.css. The splash screen and the
    // installed app's title bar stay the page's own colour.
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
