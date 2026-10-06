import { expect, test } from "@playwright/test";

// Home is where a study session starts, and it holds seven different kinds of
// thing. A student must be able to tell them apart by looking: one next step,
// named groups, and a panel with its own icon and name for each thing. The
// colour of what can be pressed is the exam's own, never plain ink.

const origin = "http://127.0.0.1:3000";
const l4 = "/level-4/lumbini/agri-extension";
const l7 = "/level-7/lumbini/agri-extension";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "agrilok_lang", value: "en", url: origin }]);
});

test("Home has one next step, named groups, and a named panel for each thing", async ({ page }) => {
  await page.goto(l4);
  const main = page.locator("main");
  await expect(main.locator("h1")).toHaveText("Today");

  // One filled block with one button reversed out of it: the next study step.
  const next = main.locator('section[aria-labelledby="next-step"]');
  await expect(next).toBeVisible();
  await expect(main.locator(".lead-block")).toHaveCount(1);
  await expect(main.locator(".btn-on-hero, .btn-primary")).toHaveCount(1);
  const open = next.getByRole("link", { name: "Open topic", exact: true });
  await expect(open).toBeVisible();
  // How far through the syllabus this device has got: words, a share and a bar.
  const progress = next.getByTestId("hero-progress");
  await expect(progress).toContainText(/\d+ of \d+ topics studied/);
  await expect(progress).toContainText(/\d+%/);
  // The bar sits above the button with clear space between, never beside it.
  const bar = (await progress.locator(".hero-meter").boundingBox())!;
  const button = (await open.boundingBox())!;
  expect(
    button.y - (bar.y + bar.height),
    "space between the bar and the button",
  ).toBeGreaterThanOrEqual(20);
  // The block carries a photograph, credited to its photographer.
  const photo = next.getByTestId("lead-photo");
  await expect(photo.locator("img")).toHaveAttribute("alt", "");
  await expect(photo.getByRole("link", { name: /^Photo: / })).toHaveAttribute(
    "href",
    "/credits#photos",
  );

  // The groups a student scans for, in the order a session uses them.
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([
    /.+/, // the topic to open next
    "Today's practice",
    "Your progress",
    "Your exam",
    "Study offline",
  ]);
  // Each thing is a panel with a name and an icon of its own.
  for (const name of [
    "Today's practice",
    "Study plan",
    "Weak topics",
    "Papers and marks",
    "Latest notice",
    "How to prepare",
    "Study offline",
  ]) {
    const heading = main.getByRole("heading", { name, exact: true });
    await expect(heading).toHaveCount(1);
    const panel = main.locator(`section[aria-labelledby="${await heading.getAttribute("id")}"]`);
    await expect(panel.locator(".icon-chip svg").first()).toBeVisible();
  }
});

test("what can be pressed is drawn in the exam's colour, and the two exams differ", async ({
  page,
}) => {
  const colours: string[] = [];
  for (const exam of [l4, l7]) {
    await page.goto(exam);
    const css = (selector: string, property: "backgroundColor" | "color") =>
      page
        .locator(selector)
        .first()
        .evaluate((element, name) => getComputedStyle(element)[name], property);
    const hero = await css("main .lead-block", "backgroundColor");
    const heroButtonText = await css("main .btn-on-hero", "color");
    const outline = await css("main .btn-secondary", "color");
    const ink = await css("main h1", "color");
    // The filled block is a colour, not the ink text is set in and not black;
    // the button reversed out of it is lettered in that same colour; and the
    // outline button is the exam's colour too.
    expect(hero).not.toBe(ink);
    expect(hero).not.toBe("rgb(0, 0, 0)");
    expect(heroButtonText).toBe(hero);
    expect(outline).not.toBe(ink);
    colours.push(hero);
    // On an inner page the solid button is the exam bar's own colour.
    await page.goto(`${exam}/practice/session?mode=quick`);
    await page.getByRole("radio").first().check();
    const bar = await css('[data-testid="exam-bar"]', "backgroundColor");
    expect(await css("main .btn-primary", "backgroundColor")).toBe(bar);
  }
  expect(colours[0]).not.toBe(colours[1]);
});

test("outside an exam the action colour is the brand green, not ink", async ({ page }) => {
  await page.goto("/start");
  const save = page.getByRole("button", { name: "Save and start", exact: true });
  const [button, ink, logo] = await Promise.all([
    save.evaluate((element) => getComputedStyle(element).backgroundColor),
    page.locator("main h1").evaluate((element) => getComputedStyle(element).color),
    page
      .locator("header svg rect")
      .first()
      .evaluate((element) => getComputedStyle(element).fill),
  ]);
  expect(button).not.toBe(ink);
  expect(button).toBe(logo);
});

test("the foot of a study page carries no licence links and no demo warning", async ({ page }) => {
  await page.goto(l4);
  const footer = page.locator("footer.study-footer");
  await expect(footer.getByRole("link")).toHaveText(["How it works", "Sources", "Privacy"]);
  await expect(footer).not.toContainText("Software and fonts");
  await expect(page.getByText("Demo content. Do not use it for exam preparation.")).toHaveCount(0);
  // Demo items still say what they are, one by one.
  await expect(page.locator("main").getByText("Demo", { exact: true }).first()).toBeVisible();
  // The licences stay reachable, from the page that explains the site.
  await page.goto("/how-it-works");
  await page.getByRole("link", { name: "Software and fonts", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/credits`);
});

test("Practice shows each subject with its own mark and how much of it has been answered right", async ({
  page,
}) => {
  await page.goto(`${l4}/practice`);
  const cards = page.getByTestId("subject-card");
  await expect(cards).toHaveCount(9);
  const marks = await cards
    .locator(".icon-chip")
    .evaluateAll((chips) => chips.map((chip) => chip.getAttribute("data-subject-icon")));
  // Nine subjects, nine different marks, none of them the fallback.
  expect(new Set(marks).size).toBe(9);
  expect(marks).not.toContain("book");
  for (const chip of await cards.locator(".icon-chip svg").all()) await expect(chip).toBeVisible();
  // Nothing answered yet on this device: every bar says so, in words too.
  await expect(cards.first()).toContainText(/0 of \d+ right/);

  // One right answer in a subject moves that subject's bar and no other.
  await cards.filter({ hasText: "Horticulture" }).click();
  await expect(page.locator("main h1")).toHaveText("Subject practice: Horticulture");
  const subject = page.url();
  let right = 0;
  for (let i = 0; i < 4 && right === 0; i++) {
    await page.getByRole("radio").nth(i).check();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    const verdict = page.getByText(/^(Correct|Not right)$/).first();
    await expect(verdict).toBeVisible();
    if ((await verdict.innerText()) === "Correct") right = 1;
    else {
      await page.evaluate(() => localStorage.clear());
      await page.evaluate(() => sessionStorage.clear());
      await page.goto(subject);
    }
  }
  expect(right, "one of the four options is the right one").toBe(1);
  await page.goto(`${l4}/practice`);
  await expect(cards.filter({ hasText: "Horticulture" })).toContainText(/1 of \d+ right/);
  await expect(cards.filter({ hasText: "Agronomy" })).toContainText(/0 of \d+ right/);
});

test("the theme changes from the toggle, keeps its choice, and still works with motion reduced", async ({
  page,
}) => {
  await page.goto(l4);
  const html = page.locator("html");
  const toggle = page.getByTestId("theme-toggle");
  const canvas = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await expect(html).not.toHaveAttribute("data-theme", "dark");
  const light = await canvas();

  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  // The sweep finishes and leaves nothing behind on the page.
  await expect(html).not.toHaveAttribute("data-theme-change", "");
  expect(await canvas()).not.toBe(light);
  await expect(toggle).toHaveAccessibleName("Switch to light mode");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");

  // With motion reduced the theme changes at once, with no transition started.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    const start = document.startViewTransition?.bind(document);
    (window as unknown as { transitions: number }).transitions = 0;
    if (start) {
      document.startViewTransition = ((callback?: () => void) => {
        (window as unknown as { transitions: number }).transitions += 1;
        return start(callback);
      }) as typeof document.startViewTransition;
    }
  });
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "light");
  expect(
    await page.evaluate(() => (window as unknown as { transitions: number }).transitions),
  ).toBe(0);
});
