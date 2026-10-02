import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

// The offline service worker, tested by itself against a small server that
// can change a file, switch workers and go away, none of which the real app
// can be asked to do in the middle of a test run.
//
// What it guards: on 2026-10-01 the owner's browser, which had once opened a
// production build on localhost:3000, kept drawing development pages with an
// old stylesheet and old scripts. The worker then in use kept everything
// under /_next/static for ever, and a development server reuses file names.

const WORKER = readFileSync(path.join(process.cwd(), "public", "service-worker.js"), "utf8");
const OLD_WORKER = readFileSync(
  path.join(process.cwd(), "tests", "fixtures", "service-worker-v1.js"),
  "utf8",
);

type Site = {
  origin: string;
  /** The worker the server hands out at /service-worker.js. */
  worker: string;
  /** What the development stylesheet says today. */
  edit: string;
  /** When true the server drops every connection, like a network that is gone. */
  down: boolean;
  close: () => Promise<void>;
};

async function startSite(): Promise<Site> {
  const site = { worker: WORKER, edit: "first", down: false } as Site;
  const server: Server = createServer((request, response) => {
    if (site.down) return void request.socket.destroy();
    const url = new URL(request.url ?? "/", "http://site");
    const send = (type: string, body: string, cache = "no-cache") => {
      response.writeHead(200, { "Content-Type": type, "Cache-Control": cache });
      response.end(body);
    };
    if (url.pathname === "/service-worker.js") {
      return send("application/javascript", site.worker, "no-store");
    }
    // A development asset: the same name for every edit, and the server says so.
    if (url.pathname === "/_next/static/chunks/dev.css") {
      return send("text/css", `:root { --dev: ${site.edit}; }`, "no-cache, must-revalidate");
    }
    // A production asset: its name carries a hash, and the server says it never changes.
    if (url.pathname === "/_next/static/chunks/build.4f9a1c.css") {
      return send("text/css", ":root { --build: hashed; }", "public, max-age=31536000, immutable");
    }
    if (url.pathname === "/icons/mark.svg") {
      return send(
        "image/svg+xml",
        '<svg xmlns="http://www.w3.org/2000/svg"/>',
        "public, max-age=0",
      );
    }
    if (url.pathname === "/offline") return send("text/html", "<h1>No internet right now</h1>");
    if (url.pathname === "/study" || url.pathname === "/other") {
      return send(
        "text/html",
        `<!doctype html><title>${url.pathname}</title>
         <link rel="stylesheet" href="/_next/static/chunks/dev.css">
         <link rel="stylesheet" href="/_next/static/chunks/build.4f9a1c.css">
         <img src="/icons/mark.svg" alt="">
         <h1>${url.pathname === "/study" ? "Study page" : "Other page"}</h1>`,
      );
    }
    response.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  site.origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  site.close = () =>
    new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
  return site;
}

/** Register the worker the way the app does, and wait until it runs the page. */
async function register(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/service-worker.js", {
      scope: "/",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }),
      );
    }
  });
}

// A new worker reloads the page it takes over. A question asked of the page at
// that instant has nowhere to land, so it answers "loading" and is asked again.
const LOADING = "(the page was loading)";

const drawnWith = (page: Page, name: "--dev" | "--build") =>
  page
    .evaluate(
      (property) => getComputedStyle(document.documentElement).getPropertyValue(property).trim(),
      name,
    )
    .catch(() => LOADING);

const cacheNames = (page: Page) => page.evaluate(() => caches.keys()).catch(() => [LOADING]);

let site: Site;
test.beforeEach(async () => {
  site = await startSite();
});
test.afterEach(async () => {
  await site.close();
});

test("a file the server does not call immutable is never kept, so an edit shows at once", async ({
  page,
}) => {
  await page.goto(`${site.origin}/study`);
  await register(page);
  await page.reload();
  expect(await drawnWith(page, "--dev")).toBe("first");

  site.edit = "second";
  await page.reload();
  expect(await drawnWith(page, "--dev")).toBe("second");
  site.edit = "third";
  await page.reload();
  expect(await drawnWith(page, "--dev")).toBe("third");
});

test("a browser left with the old worker heals by itself when the new one arrives", async ({
  page,
}) => {
  // The browser as the owner's was: the old worker in charge, files kept.
  site.worker = OLD_WORKER;
  await page.goto(`${site.origin}/study`);
  await register(page);
  await page.reload();
  expect(await cacheNames(page)).toContain("agrilok-assets-v1");
  site.edit = "second";
  await page.reload();
  // The fault itself: the page is drawn with the stylesheet from before the edit.
  expect(await drawnWith(page, "--dev")).toBe("first");

  // The new worker is published. The student only opens the page again; the
  // worker replaces the old one, throws its files away and loads the page afresh.
  site.worker = WORKER;
  await page.goto(`${site.origin}/study`);
  await expect.poll(() => drawnWith(page, "--dev"), { timeout: 15_000 }).toBe("second");
  await expect
    .poll(async () => {
      const names = await cacheNames(page);
      return names.includes(LOADING) || names.includes("agrilok-assets-v1");
    })
    .toBe(false);
  // And it stays healed.
  site.edit = "third";
  await page.reload();
  await expect.poll(() => drawnWith(page, "--dev")).toBe("third");
});

test("build files, icons and visited pages still open when the network is gone", async ({
  page,
}) => {
  await page.goto(`${site.origin}/study`);
  await register(page);
  // Visited with the worker in charge: this is what gets kept.
  await page.reload();
  expect(await drawnWith(page, "--build")).toBe("hashed");
  // Asked of the worker's own store, not of what the page shows: the browser
  // keeps an immutable file by itself too, and that would hide a worker that
  // had stopped keeping anything.
  const kept = await page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      if (!name.startsWith("agrilok-assets-")) continue;
      for (const request of await (await caches.open(name)).keys()) {
        paths.push(new URL(request.url).pathname);
      }
    }
    return paths;
  });
  expect(kept).toContain("/_next/static/chunks/build.4f9a1c.css");
  expect(kept).toContain("/icons/mark.svg");
  expect(kept).not.toContain("/_next/static/chunks/dev.css");

  site.down = true;
  await page.reload();
  await expect(page.locator("h1")).toHaveText("Study page");
  // The hashed build file comes from the cache; the development one was never kept.
  expect(await drawnWith(page, "--build")).toBe("hashed");
  expect(await drawnWith(page, "--dev")).toBe("");
  const icon = await page.evaluate(async () => (await fetch("/icons/mark.svg")).ok);
  expect(icon).toBe(true);

  // A page never visited has nothing saved: the offline page says so.
  await page.goto(`${site.origin}/other`);
  await expect(page.locator("h1")).toHaveText("No internet right now");
});

test("a request that changes something is never answered from a cache", async ({ page }) => {
  await page.goto(`${site.origin}/study`);
  await register(page);
  await page.reload();
  site.down = true;
  const posted = await page.evaluate(() =>
    fetch("/study", { method: "POST" }).then(
      () => "answered",
      () => "failed",
    ),
  );
  expect(posted).toBe("failed");
});
