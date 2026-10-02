import { expect, test } from "@playwright/test";

const exam = "/level-4/lumbini/agri-extension";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "agrilok_lang", value: "en", url: "http://127.0.0.1:3000" }]);
});

test("offers quick practice and mock before subject browsing", async ({ page }) => {
  await page.goto(`${exam}/practice`);
  const mock = page.locator("#mock");
  const subjects = page.locator("#subjects");
  await expect(mock).toBeVisible();
  const mockBounds = await mock.boundingBox();
  const subjectBounds = await subjects.boundingBox();
  expect(mockBounds!.y).toBeLessThan(subjectBounds!.y);
  if (test.info().project.name === "desktop") {
    const subjectLinks = page.locator('a[href*="mode=subject"]');
    const first = await subjectLinks.nth(0).boundingBox();
    const second = await subjectLinks.nth(1).boundingBox();
    const third = await subjectLinks.nth(2).boundingBox();
    expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
    expect(Math.abs(first!.y - third!.y)).toBeLessThan(2);
  }
});

test("offers tools before writing and explains a bank question without prior mistakes", async ({
  page,
}) => {
  await page.goto(`${exam}/ask`);
  const tools = page.locator("#tools-title");
  const written = page.locator("#ask-form-title");
  if (test.info().project.name === "mobile") {
    expect((await tools.boundingBox())!.y).toBeLessThan((await written.boundingBox())!.y);
    await page.getByRole("link", { name: "Write a question", exact: true }).click();
    await expect(page.locator("#written-question")).toBeFocused();
  }
  await page.locator("summary").filter({ hasText: "Explain this question" }).click();
  const picker = page.getByRole("combobox", { name: "Choose a question", exact: true });
  await picker.selectOption({ index: 1 });
  const id = await picker.inputValue();
  const fullOption = await picker.locator("option:checked").innerText();
  const fullStem = fullOption.replace(/^Demo:\s*/, "");
  await expect(page.locator("#selected-question-preview p")).toHaveText(fullStem);
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page).toHaveURL(`${exam}/practice/question/${encodeURIComponent(id)}`);
  await expect(page.getByRole("heading", { name: "Explanation", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Source", exact: true })).toBeVisible();
});

test("empty mistake review offers a working first practice action", async ({ page }) => {
  await page.goto(`${exam}/practice/review`);
  await page.getByRole("link", { name: "Start practice", exact: true }).click();
  await expect(page.locator('input[type="radio"]').first()).toBeVisible();
});

test("mock overview jumps by keyboard and preserves answers without showing feedback", async ({
  page,
}) => {
  await page.goto(`${exam}/practice/session?mode=mock`);
  const firstAnswer = page.locator('input[type="radio"]').first();
  await firstAnswer.check();
  const value = await firstAnswer.inputValue();
  const overview = page.getByTestId("question-overview");
  await overview.locator("summary").click();
  const first = overview.getByRole("button", { name: /^Question 1 of \d+: Answered$/ });
  await expect(first).toBeVisible();
  const third = overview.getByRole("button", { name: /^Question 3 of \d+: Unanswered$/ });
  await third.focus();
  await third.press("Enter");
  await expect(page.locator("form legend")).toBeFocused();
  await expect(
    overview.getByRole("button", { name: /^Question 3 of \d+: Unanswered$/ }),
  ).toHaveAttribute("aria-current", "step");
  await first.click();
  await expect(page.locator(`input[type="radio"][value="${value}"]`)).toBeChecked();
  await expect(page.locator("main .feedback-enter")).toHaveCount(0);
  await overview.getByRole("button", { name: "Next unanswered question", exact: true }).click();
  await expect(
    overview.getByRole("button", { name: /^Question 2 of \d+: Unanswered$/ }),
  ).toHaveAttribute("aria-current", "step");
});
