import { expect, test } from "@playwright/test";

const exam = "/level-4/lumbini/agri-extension";
const routes = [
  exam,
  `${exam}/syllabus`,
  `${exam}/practice`,
  `${exam}/updates`,
  `${exam}/guide`,
  `${exam}/ask`,
  "/start",
];

for (const lang of ["ne", "en"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`study tasks reflow in ${lang}, ${theme}`, async ({ page, context }) => {
      test.setTimeout(90_000);
      await context.addCookies([
        { name: "agrilok_lang", value: lang, url: "http://127.0.0.1:3000" },
      ]);
      await page.addInitScript((value) => localStorage.setItem("agrilok:theme", value), theme);
      const widths = test.info().project.name === "mobile" ? [320, 360, 390] : [768, 1024, 1440];
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of routes) {
          await page.goto(route);
          await expect(page.locator("main h1")).toHaveCount(1);
          await expect(page.locator("main h1")).toBeVisible();
          await expect(page.locator("html")).toHaveAttribute("lang", lang);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          );
          expect(overflow, `${route}, ${width}px, ${lang}, ${theme}`).toBeLessThanOrEqual(1);
          if (route !== "/start") {
            // The five destinations move from the bottom bar to the masthead at 1024px.
            const nav = width < 1024 ? page.getByTestId("bottom-nav") : page.getByTestId("top-nav");
            await expect(nav).toBeVisible();
            await expect(nav.getByRole("link")).toHaveCount(5);
            await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
          }
        }
      }
    });
  }
}

test("setup errors focus the summary and preserve the selected exam", async ({ page, context }) => {
  await context.addCookies([{ name: "agrilok_lang", value: "en", url: "http://127.0.0.1:3000" }]);
  await page.goto("/start");
  await page.getByRole("button", { name: "Save and start" }).click();
  const summary = page.getByTestId("profile-error-summary");
  await expect(summary).toBeFocused();
  await expect(summary.getByRole("link")).toHaveCount(3);
  await summary.getByRole("link", { name: "Choose a level." }).click();
  await expect(page.locator('input[name="level"]').first()).toBeFocused();
  await summary.getByRole("link", { name: "Choose a commission." }).click();
  await expect(page.locator('select[name="province"]')).toBeFocused();
  await page.locator('input[name="level"][value="level_4"]').check();
  await expect(page.locator('select[name="province"] option[value="lumbini"]')).toContainText(
    "Syllabus available",
  );
  await expect(page.locator('select[name="province"] option[value="karnali"]')).toContainText(
    "Syllabus coming",
  );
  await page.locator('select[name="province"]').selectOption("lumbini");
  await page.locator('select[name="group"]').selectOption("agri_extension");
  await page.locator('input[name="examDate"]').fill("2000-01-01");
  await page.getByRole("button", { name: "Save and start" }).click();
  await expect(summary).toBeFocused();
  await expect(page.locator('input[name="level"][value="level_4"]')).toBeChecked();
  await expect(page.locator('select[name="province"]')).toHaveValue("lumbini");
  await expect(page.locator('select[name="group"]')).toHaveValue("agri_extension");
  await expect(page.locator('input[name="examDate"]')).toHaveValue("2000-01-01");
});

test("keyboard skip link and reduced motion work at enlarged text size", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(exam);
  await page.keyboard.press("Tab");
  const skip = page.locator('a[href="#main"]').first();
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "212.5%";
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  const motion = await page.evaluate(() => {
    const element = document.createElement("div");
    element.className = "feedback-enter skeleton";
    document.body.append(element);
    const animation = getComputedStyle(element).animationName;
    element.remove();
    return animation;
  });
  expect(motion).toBe("none");
  // What the layout owes a reader at this size: whatever stays fixed on
  // screen must leave most of the viewport for the page. It may do that by
  // being small, or by going back into the page's flow.
  const free = await page.evaluate(() => {
    let taken = 0;
    for (const selector of [".study-header", ".study-exam", ".study-bottom-nav"]) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const position = getComputedStyle(element).position;
      if (position !== "sticky" && position !== "fixed") continue;
      if (getComputedStyle(element).display === "none") continue;
      const row = selector === ".study-exam" ? element.querySelector("summary")! : element;
      taken += row.getBoundingClientRect().height;
    }
    return 1 - taken / innerHeight;
  });
  expect(free, "share of the viewport left for content").toBeGreaterThanOrEqual(0.55);
});

test("enlarged syllabus links stay reachable by keyboard", async ({ page }) => {
  await page.goto(`${exam}/syllabus`);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "212.5%";
  });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const visible = await page.evaluate(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !active.matches("a,button,input,select")) return true;
      const rect = active.getBoundingClientRect();
      const bottom = document.querySelector(".study-bottom-nav");
      // The lowest edge of anything stuck to the top: masthead, exam bar.
      const topEdge = Math.max(
        0,
        ...[".study-header", ".study-exam"].map((selector) => {
          const element = document.querySelector(selector);
          if (!element || getComputedStyle(element).position !== "sticky") return 0;
          if (active.closest(selector)) return 0;
          const edge = element.getBoundingClientRect();
          return edge.top <= 0 ? edge.bottom : 0;
        }),
      );
      const bottomEdge =
        bottom &&
        getComputedStyle(bottom).position === "fixed" &&
        getComputedStyle(bottom).display !== "none"
          ? bottom.getBoundingClientRect().top
          : innerHeight;
      return rect.bottom > topEdge && rect.top < bottomEdge;
    });
    expect(visible, `Focused control ${i + 1} must not be hidden by fixed chrome`).toBe(true);
  }
});

test("report dialog keeps keyboard focus and honors reduced motion", async ({ page, context }) => {
  await context.addCookies([{ name: "agrilok_lang", value: "en", url: "http://127.0.0.1:3000" }]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${exam}/practice/session?mode=quick`);
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  const report = page.getByRole("button", { name: "Report a problem", exact: true });
  await report.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  await expect(dialog).toHaveCSS("animation-name", "none");
  expect(
    await dialog.evaluate((element) => getComputedStyle(element, "::backdrop").animationName),
  ).toBe("none");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(report).toBeFocused();
  await report.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(report).toBeFocused();
});
