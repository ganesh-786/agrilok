// Run with the local app on port 3000. Artifacts live outside Playwright's
// test-results cleanup so a full regression run cannot remove the review.
import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const exam = "/level-4/lumbini/agri-extension";
const out = path.resolve("../../.local/ui-review/practice-ask");
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const issues = [];
  const errors = [];
  let cases = 0;
  for (const lang of ["ne", "en"]) {
    for (const theme of ["light", "dark"]) {
      for (const width of [360, 390, 1366]) {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        await context.addCookies([
          { name: "agrilok_lang", value: lang, url: "http://127.0.0.1:3000" },
        ]);
        await context.addInitScript((value) => localStorage.setItem("agrilok:theme", value), theme);
        const page = await context.newPage();
        page.on("pageerror", (error) => errors.push(error.message));
        const routes = [
          "practice",
          "practice/session?mode=quick",
          "practice/session?mode=mock",
          "ask",
          "practice/review",
        ];
        for (const route of routes) {
          await page.goto(`http://127.0.0.1:3000${exam}/${route}`);
          await page.locator("h1").waitFor();
          await page.evaluate(() => document.fonts.ready);
          await expect(page.locator(".skeleton")).toHaveCount(0);
          if (route.endsWith("mode=mock")) {
            await page.getByTestId("question-overview").locator("summary").click();
          }
          const wide = await page.evaluate(() => ({
            viewport: innerWidth,
            body: document.documentElement.scrollWidth,
          }));
          if (wide.body > wide.viewport) issues.push({ lang, theme, width, route, wide });
          const label = route.replaceAll("/", "-").replaceAll("?", "-").replaceAll("=", "-");
          await page.screenshot({
            path: path.join(out, `${label}-${lang}-${theme}-${width}.png`),
            fullPage: true,
          });
          cases += 1;
          if (route === "ask") {
            await page
              .locator("#question-to-explain")
              .evaluate((element) => (element.closest("details").open = true));
            await page.locator("#question-to-explain").selectOption({ index: 1 });
            const pickerWidth = await page.evaluate(() => ({
              viewport: innerWidth,
              body: document.documentElement.scrollWidth,
            }));
            if (pickerWidth.body > pickerWidth.viewport)
              issues.push({ lang, theme, width, route: "ask-picker", wide: pickerWidth });
            await page.screenshot({
              path: path.join(out, `ask-picker-${lang}-${theme}-${width}.png`),
              fullPage: true,
            });
            cases += 1;
          }
        }
        await context.close();
      }
    }
  }
  fs.writeFileSync(
    path.join(out, "practice-ask-viewport-results.json"),
    JSON.stringify({ cases, issues, errors }, null, 2),
  );
  console.log(JSON.stringify({ cases, issues, errors }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
