import "server-only";

// Server-side configuration. None of this reaches the browser: the web server
// calls the API on the student's behalf, so the API address and the internal
// token stay on the server (CONTRIBUTING.md ground rule 5).
export const API_URL = (process.env.AGRILOK_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
export const INTERNAL_TOKEN = process.env.API_INTERNAL_TOKEN ?? "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
export const REPO_URL = "https://github.com/ganesh-786/agrilok";

// The band across every study page that says the content is demo material.
// Off while the app runs only on its developers' machines (owner, 2026-10-01),
// where there is nobody to mislead. Every demo item still carries its own
// "Demo" label. Set AGRILOK_DEMO_BANNER=1 before anyone outside the team can
// reach a build that still serves demo content.
export const SHOW_DEMO_BANNER = process.env.AGRILOK_DEMO_BANNER === "1";
