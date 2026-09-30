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
