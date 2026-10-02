import { expect, test } from "@playwright/test";

const exam = "/level-4/lumbini/agri-extension";

test.describe("student experience shell", () => {
  test("keeps the phone layout inside the viewport", async ({ page }) => {
    test.skip(test.info().project.name !== "mobile", "This assertion is for the mobile project.");
    await page.goto(exam);

    await expect(page.getByTestId("bottom-nav")).toBeVisible();
    await expect(page.getByRole("link", { name: /गृह|Home/ }).first()).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  });

  test("persists an explicit light and dark mode choice", async ({ page }) => {
    await page.goto("/start");

    const toggle = page.getByTestId("theme-toggle");
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("Enter asks on a keyboard and stays a new line on a touch screen", async ({ page }) => {
    await page.goto(`${exam}/ask`);
    const question = page.getByRole("textbox", { name: /तपाईंको प्रश्न|Your question/ });

    await question.fill("How many marks does a wrong answer lose?");
    await question.press("Shift+Enter");
    await expect(question).toHaveValue(/\n$/);
    await question.press("Enter");

    if (test.info().project.name === "mobile") {
      // A phone keyboard has no Shift + Enter, so Enter must not send a
      // half-written question. The button does.
      await expect(question).toHaveValue(/\n\n$/);
      await expect(page.locator("#answer-title")).toHaveCount(0);
      await page.getByRole("button", { name: /^(सोध्नुहोस्|Ask)$/ }).click();
    }
    await expect(page.locator("#answer-title")).toBeVisible({ timeout: 15_000 });
  });
});
