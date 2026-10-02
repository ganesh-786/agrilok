import { expect, test, type Page } from "@playwright/test";

// Changing the exam in place (docs/ui-quality-contract.md, "directly editable
// exam context"): each dimension is edited on the page, Cancel changes
// nothing, a valid choice moves the URL, the label, the content and (only when
// asked) the saved profile together, and an exam without a syllabus is opened
// as itself, never swapped for another.

const origin = "http://127.0.0.1:3000";
const l4 = "/level-4/lumbini/agri-extension";
const l7 = "/level-7/lumbini/agri-extension";
const L4_PROFILE = "1|level_4|lumbini|agri_extension|";

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "agrilok_lang", value: "en", url: origin },
    { name: "agrilok_profile", value: L4_PROFILE, url: origin },
  ]);
});

function bar(page: Page) {
  const root = page.getByTestId("exam-bar");
  return {
    root,
    toggle: root.locator("summary"),
    label: root.getByTestId("exam-label"),
    form: root.getByTestId("exam-switcher"),
    level: root.getByRole("combobox", { name: "Level", exact: true }),
    commission: root.getByRole("combobox", { name: "Commission", exact: true }),
    group: root.getByRole("combobox", { name: "Service group", exact: true }),
    save: root.getByRole("checkbox", { name: /Make this my exam/ }),
    open: root.getByRole("button", { name: "Open this exam", exact: true }),
    cancel: root.getByRole("button", { name: "Cancel", exact: true }),
    availability: root.getByTestId("exam-availability"),
    viewing: root.getByTestId("exam-viewing"),
    saved: root.getByTestId("exam-saved"),
  };
}

async function savedProfile(page: Page) {
  const cookies = await page.context().cookies(origin);
  // The server writes the cookie percent-encoded; the test seeds it raw.
  const value = cookies.find((cookie) => cookie.name === "agrilok_profile")?.value;
  return value === undefined ? undefined : decodeURIComponent(value);
}

test("the exam bar names the exam and opens its editor by keyboard", async ({ page }) => {
  await page.goto(`${l4}/practice`);
  const exam = bar(page);
  await expect(exam.label).toHaveText("Level 4 · Lumbini · Agriculture Extension");
  await expect(exam.form).not.toBeVisible();
  await exam.toggle.focus();
  await page.keyboard.press("Enter");
  await expect(exam.form).toBeVisible();
  // Three labelled controls, each showing the exam on screen.
  await expect(exam.level).toHaveValue("level-4");
  await expect(exam.commission).toHaveValue("lumbini");
  await expect(exam.group).toHaveValue("agri_extension");
  // On their own exam, adopting the choice is the default.
  await expect(exam.save).toBeChecked();
});

test("Cancel and Escape leave the exam, the URL and the saved profile unchanged", async ({
  page,
}) => {
  await page.goto(`${l4}/practice`);
  const exam = bar(page);
  await exam.toggle.click();
  await exam.level.selectOption("level-7");
  await exam.commission.selectOption("koshi");
  await exam.cancel.click();
  await expect(exam.form).not.toBeVisible();
  await expect(exam.toggle).toBeFocused();
  await expect(page).toHaveURL(`${origin}${l4}/practice`);
  await expect(exam.label).toHaveText("Level 4 · Lumbini · Agriculture Extension");
  expect(await savedProfile(page)).toBe(L4_PROFILE);

  // Reopened, the editor shows the real exam again, not the abandoned choice.
  await exam.toggle.click();
  await expect(exam.level).toHaveValue("level-4");
  await expect(exam.commission).toHaveValue("lumbini");

  await exam.group.selectOption("fisheries");
  await exam.cancel.focus();
  await page.keyboard.press("Escape");
  await expect(exam.form).not.toBeVisible();
  await expect(exam.toggle).toBeFocused();
  await exam.toggle.click();
  await expect(exam.group).toHaveValue("agri_extension");
  await expect(page).toHaveURL(`${origin}${l4}/practice`);
});

test("browsing another exam keeps the destination and does not change the saved exam", async ({
  page,
}) => {
  await page.goto(`${l4}/practice`);
  const exam = bar(page);
  await exam.toggle.click();
  await exam.level.selectOption("level-7");
  await expect(exam.availability).toHaveText("This exam's syllabus is in the library.");
  await exam.save.uncheck();
  await exam.open.click();

  // URL, label and content move together; the destination is kept.
  await expect(page).toHaveURL(`${origin}${l7}/practice?switched=1`);
  await expect(exam.label).toHaveText("Level 7 · Lumbini · Agriculture Extension");
  await expect(page.locator("main h1")).toHaveText("Practice");
  await expect(
    page.getByRole("status").filter({ hasText: "Now showing Level 7 · Lumbini" }),
  ).toBeVisible();
  // Only browsing: the profile is still Level 4, and the bar says so. Nothing
  // else on the page repeats it.
  expect(await savedProfile(page)).toBe(L4_PROFILE);
  await expect(exam.viewing).toHaveText("Viewing only");
  await expect(page.locator("main")).not.toContainText("Your saved exam");
  // The editor now starts from the exam on screen, names the saved exam with
  // the way back to it, and does not adopt by default.
  await exam.toggle.click();
  await expect(exam.level).toHaveValue("level-7");
  await expect(exam.save).not.toBeChecked();
  await expect(exam.saved).toContainText(
    "Your saved exam is Level 4 · Lumbini · Agriculture Extension.",
  );
  await expect(
    exam.saved.getByRole("link", { name: "Go to my exam", exact: true }),
  ).toHaveAttribute("href", `${l4}`);
  await exam.cancel.click();

  // Back returns to the first exam.
  await page.goBack();
  await expect(page).toHaveURL(`${origin}${l4}/practice`);
  await expect(exam.label).toHaveText("Level 4 · Lumbini · Agriculture Extension");
});

test("adopting an exam saves it, and a deeper page falls back to its section with a reason", async ({
  page,
  context,
}) => {
  // A date that belongs to the Level 4 exam.
  await context.addCookies([
    { name: "agrilok_profile", value: `${L4_PROFILE}2099-01-01`, url: origin },
  ]);
  await page.goto(`${l4}/syllabus/u5-5.3`);
  const exam = bar(page);
  await exam.toggle.click();
  await exam.level.selectOption("level-7");
  await expect(exam.save).toBeChecked();
  await exam.open.click();

  // The topic exists only in the Level 4 syllabus: the Level 7 syllabus opens.
  await expect(page).toHaveURL(`${origin}${l7}/syllabus?switched=2`);
  await expect(page.locator("main h1")).toHaveText("Syllabus");
  await expect(
    page.getByRole("status").filter({ hasText: "belongs to the other exam" }),
  ).toBeVisible();
  // Saved, and the old exam's date is not carried to a different exam.
  expect(await savedProfile(page)).toBe("1|level_7|lumbini|agri_extension|");
  await expect(exam.viewing).toHaveCount(0);
  await page.goto("/");
  await expect(page).toHaveURL(`${origin}${l7}`);
});

test("an exam without a syllabus is opened as itself and explained", async ({ page }) => {
  await page.goto(`${l4}/practice`);
  const exam = bar(page);
  await exam.toggle.click();
  await exam.commission.selectOption("karnali");
  await expect(exam.group.locator('option[value="fisheries"]')).toContainText("Syllabus coming");
  await exam.group.selectOption("fisheries");
  await expect(exam.availability).toContainText("not in the library yet");
  await exam.save.uncheck();
  await exam.open.click();

  await expect(page).toHaveURL(`${origin}/level-4/karnali/fisheries/practice?switched=1`);
  await expect(exam.label).toHaveText("Level 4 · Karnali · Fisheries");
  await expect(page.getByTestId("unavailable-practice")).toContainText(
    "written from each exam's own syllabus",
  );
  expect(await savedProfile(page)).toBe(L4_PROFILE);
});

test("an unfinished question survives a change of exam and back", async ({ page }) => {
  await page.goto(`${l4}/ask`);
  const question = page.getByRole("textbox", { name: "Your question", exact: true });
  await question.fill("What does the syllabus say about seed certification?");
  const exam = bar(page);
  await exam.toggle.click();
  await exam.level.selectOption("level-7");
  await exam.save.uncheck();
  await exam.open.click();
  await expect(page).toHaveURL(`${origin}${l7}/ask?switched=1`);
  // The other exam has its own, empty draft.
  await expect(page.getByRole("textbox", { name: "Your question", exact: true })).toHaveValue("");

  await exam.toggle.click();
  await exam.level.selectOption("level-4");
  await exam.open.click();
  await expect(page).toHaveURL(`${origin}${l4}/ask?switched=1`);
  await expect(page.getByRole("textbox", { name: "Your question", exact: true })).toHaveValue(
    "What does the syllabus say about seed certification?",
  );
});

test("language and theme stay as chosen through a change of exam", async ({ page }) => {
  await page.goto(`${l4}/updates`);
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const exam = bar(page);
  await exam.toggle.click();
  await exam.level.selectOption("level-7");
  await exam.save.uncheck();
  await exam.open.click();
  await expect(page).toHaveURL(`${origin}${l7}/updates?switched=1`);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // Switching language keeps the exam and the page.
  await page.getByRole("button", { name: "नेपाली", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${l7}/updates`));
  await expect(page.locator("html")).toHaveAttribute("lang", "ne");
  await expect(exam.label).toHaveText("तह ७ · लुम्बिनी · कृषि प्रसार");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("an exam opened from a shared link is adopted from the bar, on the same page", async ({
  page,
}) => {
  await page.goto(`${l7}/practice`);
  const exam = bar(page);
  await expect(exam.viewing).toBeVisible();
  await exam.toggle.click();
  await exam.save.check();
  await exam.open.click();
  await expect(exam.viewing).toHaveCount(0);
  await expect(page).toHaveURL(`${origin}${l7}/practice`);
  expect(await savedProfile(page)).toBe("1|level_7|lumbini|agri_extension|");
});

test("the exam is named and changed in the bar only", async ({ page }) => {
  for (const path of [l4, `${l4}/syllabus`, "/level-4/karnali/fisheries", `${l7}/practice`]) {
    await page.goto(path);
    // One editor on the page, inside the bar: no second set of pickers below.
    await expect(page.getByTestId("exam-switcher")).toHaveCount(1);
    await expect(page.getByTestId("exam-bar").getByTestId("exam-switcher")).toHaveCount(1);
    await expect(page.locator("main select[name='level']")).toHaveCount(0);
    // No banner band and no warning box between the bar and the page.
    await expect(page.getByTestId("demo-notice")).toHaveCount(0);
    await expect(page.getByText("You are looking at another exam")).toHaveCount(0);
  }
});

/**
 * Whether the exam's name can actually be seen. On a laptop the tucked bar
 * slides behind the masthead, where it is still inside the viewport but
 * covered, so the question is asked of the pixel, not of the geometry.
 */
async function labelSeen(page: Page) {
  return page.getByTestId("exam-label").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight) return false;
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return !!hit && (element.contains(hit) || hit.contains(element));
  });
}

/** Scroll the way a student does, in steps, so the page sees a direction. */
async function scrollBy(page: Page, total: number) {
  const step = total > 0 ? 120 : -120;
  for (let moved = 0; Math.abs(moved) < Math.abs(total); moved += step) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(40);
  }
}

test("the exam bar steps aside on the way down, returns on the way up, and stays put while editing", async ({
  page,
}) => {
  test.skip(test.info().project.name === "mobile", "wheel scrolling is a desktop gesture");
  await page.goto(`${l4}/syllabus`);
  const exam = bar(page);
  // At the top of the page the bar is simply there.
  await expect(exam.root).not.toHaveAttribute("data-tucked", "");
  expect(await labelSeen(page)).toBe(true);

  // Reading down: the bar leaves the page to the content.
  await scrollBy(page, 1400);
  await expect(exam.root).toHaveAttribute("data-tucked", "");
  await expect.poll(() => labelSeen(page)).toBe(false);
  // A sliver of the exam's colour stays under the masthead.
  const sliver = await exam.root.evaluate((element) => {
    const masthead = document.querySelector(".study-header")!.getBoundingClientRect();
    return Math.round(element.getBoundingClientRect().bottom - masthead.bottom);
  });
  expect(sliver).toBeGreaterThanOrEqual(2);
  expect(sliver).toBeLessThanOrEqual(4);
  // The destinations in the masthead never leave.
  await expect(page.getByTestId("top-nav")).toBeInViewport();

  // The first scroll up brings it back, wherever the student is on the page.
  await scrollBy(page, -240);
  await expect(exam.root).not.toHaveAttribute("data-tucked", "");
  await expect.poll(() => labelSeen(page)).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(800);

  // The keyboard brings it back too: focus is never on a bar that is out of sight.
  await scrollBy(page, 480);
  await expect(exam.root).toHaveAttribute("data-tucked", "");
  await exam.toggle.focus();
  await expect(exam.root).not.toHaveAttribute("data-tucked", "");
  await expect.poll(() => labelSeen(page)).toBe(true);

  // Open, the editor is part of the page: it never covers the content as it scrolls.
  await page.evaluate(() => window.scrollTo(0, 0));
  await exam.toggle.click();
  await expect(exam.root).toHaveCSS("position", "static");
  await exam.cancel.click();
  await expect(exam.root).toHaveCSS("position", "sticky");
});

test("on a phone the exam bar steps aside while scrolling down and returns on the way up", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "mobile",
    "touch scrolling is checked on the phone project",
  );
  await page.goto(`${l4}/syllabus`);
  const exam = bar(page);
  for (const y of [200, 500, 800, 1100]) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(60);
  }
  await expect(exam.root).toHaveAttribute("data-tucked", "");
  await expect.poll(() => labelSeen(page)).toBe(false);
  // The five destinations stay at the bottom throughout.
  await expect(page.getByTestId("bottom-nav")).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, 1000));
  await expect(exam.root).not.toHaveAttribute("data-tucked", "");
  await expect.poll(() => labelSeen(page)).toBe(true);
});

test("the change-of-exam message leaves by itself and takes its marker out of the address", async ({
  page,
}) => {
  await page.goto(`${l4}/practice`);
  const exam = bar(page);
  await exam.toggle.click();
  await exam.level.selectOption("level-7");
  await exam.save.uncheck();
  await exam.open.click();
  await expect(page).toHaveURL(`${origin}${l7}/practice?switched=1`);
  const toast = page.getByTestId("toast");
  await expect(toast).toContainText("Now showing Level 7 · Lumbini · Agriculture Extension");
  await expect(toast).toContainText("Progress for each exam is kept separately.");
  // It floats over the page instead of pushing it down.
  await expect(toast).toHaveCSS("position", "relative");
  await expect(page.getByTestId("toast-region")).toHaveCSS("position", "fixed");

  // No click and no move: it goes on its own, even when the pointer that
  // pressed the button is resting exactly where the message appeared (it is,
  // on a phone). A refresh does not bring it back.
  await expect(toast).not.toHaveAttribute("data-held", "");
  await expect(toast).toHaveCount(0, { timeout: 15_000 });
  await expect(page).toHaveURL(`${origin}${l7}/practice`);
  await page.reload();
  await expect(page.locator("main h1")).toHaveText("Practice");
  await expect(page.getByTestId("toast")).toHaveCount(0);
});

test("the change-of-exam message waits while it is being read and closes on request", async ({
  page,
}) => {
  test.skip(test.info().project.name === "mobile", "hover is a pointer gesture");
  await page.goto(`${l7}/practice?switched=1`);
  const toast = page.getByTestId("toast");
  await expect(toast).toBeVisible();
  // Kept under the pointer for longer than it would otherwise stay. The
  // pointer moves onto it once the page can answer, the way a hand does; one
  // that was merely resting there is the other test.
  await page.waitForLoadState("networkidle");
  const box = (await toast.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2 + 6, box.y + box.height / 2 + 3, { steps: 3 });
  await expect(toast).toHaveAttribute("data-held", "");
  await page.waitForTimeout(10_000);
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Close", exact: true }).click();
  await expect(toast).toHaveCount(0);
  await expect(page).toHaveURL(`${origin}${l7}/practice`);
});
