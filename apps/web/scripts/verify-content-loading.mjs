import http from "node:http";
import { spawn, execFile } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { chromium, expect } from "@playwright/test";

// Run after npm run build; uses an isolated mock API and the production standalone server.
const web = path.resolve(import.meta.dirname, "..");
const artifacts = path.resolve(web, "../../.local");
fs.mkdirSync(artifacts, { recursive: true });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const label = "after-regression";
const delayMs = Number(process.env.PROBE_DELAY_MS || 12000);
let mode = "healthy";
let requests = [];
let child, upstream, browser;

(async () => {
  // Empty catalogues are test fixtures, not fabricated study material.
  const fixtures = {
    "/v1/meta": Buffer.from(
      JSON.stringify({
        levels: [],
        provinces: [],
        service_groups: [],
        library: {
          documents: 0,
          syllabi_by_level: { level_4: 0, level_7: 0 },
          reference_documents: 0,
          verified_documents: 0,
          provinces: [],
          last_fetched_on: null,
        },
        live: {
          configured: false,
          available: false,
          reason: "not_configured",
          used_today: 0,
          limit_today: 0,
          resets_at: "2026-10-02T00:00:00Z",
        },
      }),
    ),
    "/v1/levels/level_4/documents": Buffer.from('{"level":"level_4","syllabi":[],"reference":[]}'),
    "/v1/levels/level_7/documents": Buffer.from('{"level":"level_7","syllabi":[],"reference":[]}'),
  };
  upstream = http.createServer(async (req, res) => {
    const endpoint = req.url.split("?")[0];
    const delayed =
      (mode === "level7-failure" && endpoint.includes("level_7")) ||
      (mode === "meta-failure" && endpoint === "/v1/meta");
    requests.push({ mode, path: endpoint, delayed });
    if (delayed) await wait(delayMs);
    if (res.destroyed) return;
    res.writeHead(delayed ? 503 : fixtures[endpoint] ? 200 : 404, {
      "content-type": "application/json",
    });
    res.end(delayed ? '{"detail":"Controlled delayed failure"}' : fixtures[endpoint] || "{}");
  });
  // A fresh upstream origin keeps earlier Next data-cache entries out of each run.
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const upstreamUrl = "http://127.0.0.1:" + upstream.address().port;
  const standalone = path.join(web, ".next/standalone");
  fs.cpSync(path.join(web, ".next/static"), path.join(standalone, ".next/static"), {
    recursive: true,
  });
  fs.cpSync(path.join(web, "public"), path.join(standalone, "public"), { recursive: true });
  child = spawn(process.execPath, [path.join(standalone, "server.js")], {
    cwd: web,
    env: { ...process.env, AGRILOK_API_URL: upstreamUrl, PORT: "3101", HOSTNAME: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  child.stdout.resume();
  for (let i = 0; i < 80; i++) {
    try {
      await fetch("http://127.0.0.1:3101/start", { signal: AbortSignal.timeout(1000) });
      break;
    } catch {
      await wait(250);
    }
  }
  if (child.exitCode !== null) throw new Error("The isolated production server failed to start.");
  browser = await chromium.launch();
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  const externalHosts = new Set();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") externalHosts.add(url.hostname);
  });
  const results = [];
  // First read has a slow failure, so it cannot seed a successful level-7 cache entry.
  mode = "level7-failure";
  const started = performance.now();
  const navigating = page.goto("http://127.0.0.1:3101/sources", {
    waitUntil: "load",
    timeout: 25000,
  });
  await page.locator("main h1").waitFor({ timeout: 25000 });
  const titleMs = Math.round(performance.now() - started);
  await navigating;
  results.push({
    case: mode,
    titleMs,
    completeMs: Math.round(performance.now() - started),
    healthyLevelVisible: await page.locator("#sources-level_4").count(),
  });
  console.log(JSON.stringify(results.at(-1)));
  const switching = performance.now();
  await page
    .locator("form")
    .filter({ has: page.locator('input[name="lang"]') })
    .locator("button")
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en", { timeout: 25000 });
  results.push({
    case: "language-switch-with-level7-failure",
    languageMs: Math.round(performance.now() - switching),
  });
  console.log(JSON.stringify(results.at(-1)));
  mode = "meta-failure";
  const metadata = performance.now();
  await page.goto("http://127.0.0.1:3101/sources", { waitUntil: "load", timeout: 25000 });
  results.push({
    case: mode,
    completeMs: Math.round(performance.now() - metadata),
    healthyLevelVisible: await page.locator("#sources-level_4").count(),
  });
  {
    expect(results[0].completeMs).toBeLessThan(8000);
    expect(results[1].languageMs).toBeLessThan(8000);
    expect(requests.some((request) => request.path === "/v1/meta")).toBe(false);
    mode = "healthy";
    await page.goto("http://127.0.0.1:3101/sources");
    const countBefore = requests.filter(
      (request) => request.path === "/v1/documents/__latency_missing__",
    ).length;
    const detail = await page.goto("http://127.0.0.1:3101/documents/__latency_missing__");
    const docRequests =
      requests.filter((request) => request.path === "/v1/documents/__latency_missing__").length -
      countBefore;
    expect(detail.status()).toBe(404);
    expect(docRequests).toBe(1);
    results.push({ case: "metadata-page-read-deduplication", docRequests });
    await page.goto("http://127.0.0.1:3101/sources");
    const healthy = performance.now();
    await page
      .locator("form")
      .filter({ has: page.locator('input[name="lang"]') })
      .locator("button")
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ne");
    results.push({
      case: "healthy-language-switch",
      languageMs: Math.round(performance.now() - healthy),
    });
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["light", "dark"]) {
        await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        ).toBe(true);
      }
    }
    const native = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: "block" });
    await native.addCookies([
      { name: "agrilok_lang", value: "en", domain: "127.0.0.1", path: "/" },
    ]);
    const nativePage = await native.newPage();
    await nativePage.goto("http://127.0.0.1:3101/sources");
    await expect(nativePage.locator("main h1")).toHaveText("Sources");
    await Promise.all([
      nativePage.waitForNavigation(),
      nativePage
        .locator("form")
        .filter({ has: nativePage.locator('input[name="lang"]') })
        .locator("button")
        .click(),
    ]);
    await expect(nativePage.locator("html")).toHaveAttribute("lang", "ne");
    await expect(nativePage.locator("#sources-level_4")).toBeVisible();
    results.push({ case: "no-JavaScript-language-switch", passed: true });
    await native.close();
    expect(externalHosts.size).toBe(0);
    mode = "level7-failure";
    for (const studyPath of [
      "/level-4/lumbini/agri-extension/syllabus",
      "/level-4/lumbini/agri-extension/ask",
    ]) {
      const requestsBefore = requests.length;
      await page.goto("http://127.0.0.1:3101" + studyPath);
      const targetLang = (await page.locator("html").getAttribute("lang")) === "ne" ? "en" : "ne";
      const started = performance.now();
      await page
        .locator("form")
        .filter({ has: page.locator('input[name="lang"]') })
        .locator("button")
        .click();
      await expect(page.locator("html")).toHaveAttribute("lang", targetLang);
      expect(requests.length - requestsBefore).toBe(0);
      results.push({
        case: studyPath + "-language-switch",
        languageMs: Math.round(performance.now() - started),
        apiReads: 0,
      });
    }
  }
  const output = { label, delayMs, results, requests, externalHosts: [...externalHosts] };
  fs.writeFileSync(
    path.join(artifacts, "content-latency-" + label + ".json"),
    JSON.stringify(output, null, 2),
  );
  console.log(JSON.stringify(output));
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (child?.pid && process.platform === "win32")
      await new Promise((resolve) =>
        execFile("taskkill", ["/pid", String(child.pid), "/t", "/f"], { timeout: 3000 }, () =>
          resolve(),
        ),
      );
    else if (child?.pid) child.kill("SIGTERM");
    if (browser) await Promise.race([browser.close(), wait(3000)]);
    if (upstream) {
      upstream.closeAllConnections();
      upstream.close();
    }
    process.exit(process.exitCode || 0);
  });
