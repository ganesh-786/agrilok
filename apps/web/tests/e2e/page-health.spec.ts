import { expect, test } from "@playwright/test";

// A page that renders with an error in the console is not finished, even if
// it looks right: an invalid nesting or a hydration mismatch means the server
// and the browser disagree about the page. This once hid a report form nested
// inside the answer form, where sending a report also re-submitted the answer.

const exam = "/level-4/lumbini/agri-extension";
const routes = [
  exam,
  `${exam}/syllabus`,
  `${exam}/syllabus/u5-5.3`,
  `${exam}/practice`,
  `${exam}/practice/review`,
  `${exam}/updates`,
  `${exam}/updates/l4-exam-schedule`,
  `${exam}/guide`,
  `${exam}/ask`,
  "/level-4/karnali/fisheries",
  "/level-4/karnali/fisheries/guide",
  "/start",
  "/how-it-works",
  "/privacy",
  "/credits",
];

test("study and public pages load without console errors", async ({ page, context }) => {
  test.setTimeout(90_000);
  await context.addCookies([{ name: "agrilok_lang", value: "en", url: "http://127.0.0.1:3000" }]);
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`${page.url()}: ${message.text().slice(0, 300)}`);
  });
  page.on("pageerror", (error) => problems.push(`${page.url()}: ${String(error).slice(0, 300)}`));
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await page.waitForLoadState("networkidle");
  }
  expect(problems).toEqual([]);
});

test("a practice answer and its report form are separate forms", async ({ page, context }) => {
  await context.addCookies([{ name: "agrilok_lang", value: "en", url: "http://127.0.0.1:3000" }]);
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text().slice(0, 300));
  });
  await page.goto(`${exam}/practice/session?mode=quick`);
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator("main .feedback-enter")).toBeVisible();
  expect(await page.locator("form form").count()).toBe(0);

  // Sending a report must not submit the answer a second time.
  const attempts = () =>
    page.evaluate(() => {
      const stored = Object.keys(localStorage)
        .filter((key) => key.startsWith("agrilok:"))
        .map((key) => localStorage.getItem(key) ?? "")
        .join("");
      return [...stored.matchAll(/"attempts":(\d+)/g)].reduce((sum, m) => sum + Number(m[1]), 0);
    });
  const before = await attempts();
  expect(before).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Report a problem", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio").first().check();
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.getByRole("status")).toBeVisible();
  expect(await attempts()).toBe(before);
  expect(problems).toEqual([]);
});
