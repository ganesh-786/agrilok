import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

test("setup retains selections after validation and saves without JavaScript", async ({ page }) => {
  await page
    .context()
    .addCookies([{ name: "agrilok_lang", value: "en", url: "http://127.0.0.1:3000" }]);
  await page.goto("/start");
  await page.locator('input[name="level"][value="level_7"]').check();
  await page.locator('select[name="province"]').selectOption("lumbini");
  await page.locator('select[name="group"]').selectOption("agri_extension");
  await page.locator('input[name="examDate"]').fill("2000-01-01");
  await page.getByRole("button", { name: "Save and start" }).click();
  await expect(page.getByTestId("profile-error-summary")).toBeVisible();
  await expect(page.locator('input[name="level"][value="level_7"]')).toBeChecked();
  await expect(page.locator('select[name="province"]')).toHaveValue("lumbini");
  await expect(page.locator('select[name="group"]')).toHaveValue("agri_extension");
  await expect(page.locator('input[name="examDate"]')).toHaveValue("2000-01-01");
  await page.locator('input[name="examDate"]').fill("");
  await page.getByRole("button", { name: "Save and start" }).click();
  await expect(page).toHaveURL(/\/level-7\/lumbini\/agri-extension$/);
  await expect(page.locator("main h1")).toBeVisible();
});

test("changes exam from the exam bar without JavaScript, keeping the destination", async ({
  page,
}) => {
  await page
    .context()
    .addCookies([{ name: "agrilok_lang", value: "en", url: "http://127.0.0.1:3000" }]);
  await page.goto("/level-4/lumbini/agri-extension/updates");
  const bar = page.getByTestId("exam-bar");
  await bar.locator("summary").click();
  await bar.getByRole("combobox", { name: "Level", exact: true }).selectOption("level-7");
  await bar.getByRole("button", { name: "Open this exam", exact: true }).click();
  await expect(page).toHaveURL(/\/level-7\/lumbini\/agri-extension\/updates\?switched=1$/);
  await expect(bar.getByTestId("exam-label")).toHaveText(
    "Level 7 · Lumbini · Agriculture Extension",
  );
  await expect(page.locator("main h1")).toHaveText("Updates");
  // The passing message needs JavaScript to appear, so here the bar's own
  // label is the confirmation; nothing is left floating that could not be closed.
  await expect(page.getByTestId("toast")).toBeHidden();
});

test("opens a bank question from the native picker without JavaScript", async ({ page }) => {
  await page
    .context()
    .addCookies([{ name: "agrilok_lang", value: "en", url: "http://127.0.0.1:3000" }]);
  const exam = "/level-4/lumbini/agri-extension";
  await page.goto(`${exam}/ask`);
  await page.locator("summary").filter({ hasText: "Explain this question" }).click();
  const picker = page.getByRole("combobox", { name: "Choose a question", exact: true });
  await picker.selectOption({ index: 1 });
  const id = await picker.inputValue();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page).toHaveURL(`${exam}/practice/question/${encodeURIComponent(id)}`);
  await expect(page.getByRole("heading", { name: "Explanation", exact: true })).toBeVisible();
});

test("renders study content and submits a sourced question without JavaScript", async ({
  page,
}) => {
  await page
    .context()
    .addCookies([{ name: "agrilok_lang", value: "en", url: "http://127.0.0.1:3000" }]);
  const exam = "/level-4/lumbini/agri-extension";

  await page.goto(exam);
  const nextStep = page.locator('section[aria-labelledby="next-step"]');
  await expect(nextStep).toBeVisible();
  await nextStep.getByRole("link", { name: "Open topic", exact: true }).click();
  await expect(page).toHaveURL(/\/syllabus\//);
  await expect(page.locator("main h1")).toBeVisible();

  await page.goto(`${exam}/syllabus`);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("main").getByRole("link").first()).toBeVisible();

  await page.goto(`${exam}/ask`);
  const question = page.getByRole("textbox", { name: "Your question", exact: true });
  await expect(question).toBeVisible();
  await question.fill("How many marks does a wrong answer lose?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();

  await expect(page.locator("#answer-title")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sources", exact: true })).toBeVisible();
  await expect(page.getByText("Pending review", { exact: true })).toBeVisible();
  const source = page.getByRole("link", { name: /Open the official document/ }).first();
  await expect(source).toBeVisible();
  await expect(source).toHaveAttribute("href", /^https:\/\/ppsc\.lumbini\.gov\.np\//);
});
