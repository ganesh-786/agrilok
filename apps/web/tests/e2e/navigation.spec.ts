import { expect, test, type Page } from "@playwright/test";

// The navigation contract (docs/ui-quality-contract.md): a destination is
// working only when a real tap changes the URL, shows that destination's own
// content, moves the current marker and keeps the exam. Hrefs and active
// styles alone prove nothing.

const origin = "http://127.0.0.1:3000";
const supported = "/level-4/lumbini/agri-extension";
const unsupported = "/level-4/karnali/fisheries";
const topic = `${supported}/syllabus/u5-5.3`;

const destinations = [
  { name: "Syllabus", path: "/syllabus", title: "Syllabus" },
  { name: "Practice", path: "/practice", title: "Practice" },
  { name: "Updates", path: "/updates", title: "Updates" },
  { name: "Ask", path: "/ask", title: "Ask" },
  { name: "Home", path: "", title: "Today" },
] as const;

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "agrilok_lang", value: "en", url: origin }]);
});

function primaryNav(page: Page) {
  return test.info().project.name === "mobile"
    ? page.getByTestId("bottom-nav")
    : page.getByTestId("top-nav");
}

/** Press a control the way a student does: a finger on a phone, a mouse on a laptop. */
async function press(page: Page, locator: ReturnType<Page["locator"]>) {
  if (test.info().project.name === "mobile") await locator.tap();
  else await locator.click();
}

for (const [label, exam] of [
  ["an exam with a syllabus", supported],
  ["an exam without a syllabus", unsupported],
] as const) {
  test(`every destination opens its own page in ${label}`, async ({ page }) => {
    await page.goto(exam);
    const examLabel = await page.getByTestId("exam-label").innerText();
    const bodies = new Set<string>();
    for (const destination of destinations) {
      const link = primaryNav(page).getByRole("link", { name: destination.name, exact: true });
      await press(page, link);
      await expect(page).toHaveURL(`${origin}${exam}${destination.path}`);
      await expect(page.locator("main h1")).toHaveText(destination.title);
      await expect(primaryNav(page).locator('[aria-current="page"]')).toHaveCount(1);
      await expect(link).toHaveAttribute("aria-current", "page");
      // The exam never changes by itself.
      await expect(page.getByTestId("exam-label")).toHaveText(examLabel);
      bodies.add((await page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 400));
    }
    // Five destinations, five different pages: no shared placeholder.
    expect(bodies.size).toBe(destinations.length);
  });
}

test("an exam without a syllabus explains each destination and keeps Updates working", async ({
  page,
}) => {
  for (const [path, id, reason] of [
    ["", "unavailable-home", /no study plan, topic list or practice/],
    ["/syllabus", "unavailable-syllabus", /Read the official one on the commission's site/],
    ["/practice", "unavailable-practice", /written from each exam's own syllabus/],
    ["/ask", "unavailable-ask", /a question cannot be answered here/],
    ["/guide", "unavailable-guide", /The advice below applies to any exam/],
  ] as const) {
    await page.goto(`${unsupported}${path}`);
    const state = page.getByTestId(id);
    await expect(state).toBeVisible();
    await expect(state).toContainText(reason);
    // The exam shown is the one asked for, never a substitute.
    await expect(state).toContainText("Level 4 · Karnali · Fisheries");
    await expect(
      state.getByRole("link", { name: /The commission's official site/ }),
    ).toHaveAttribute("href", "https://ppsc.karnali.gov.np/");
    // Changing the exam is offered from the page, and it opens the editor in
    // the bar at the top rather than a second set of pickers.
    await expect(state.getByTestId("exam-switcher")).toHaveCount(0);
    await state.getByRole("link", { name: "Choose another exam", exact: true }).click();
    const editor = page.getByTestId("exam-bar").getByTestId("exam-switcher");
    await expect(editor).toBeVisible();
    await expect(editor.getByRole("combobox", { name: "Level", exact: true })).toBeFocused();
    await expect(page).toHaveURL(`${origin}${unsupported}${path}`);
  }
  // Guidance still gives the advice that does not depend on a syllabus.
  await expect(
    page.getByRole("heading", { name: "How to revise mistakes", exact: true }),
  ).toBeVisible();

  // Notices need no syllabus: Updates is the real page, with its filters.
  await page.goto(`${unsupported}/updates`);
  await expect(page.locator("main h1")).toHaveText("Updates");
  await expect(page.getByRole("navigation", { name: "Type", exact: true })).toBeVisible();
  await expect(page.locator('[data-testid^="unavailable-"]')).toHaveCount(0);
  await page.getByRole("link", { name: "All commissions", exact: true }).click();
  await expect(page).toHaveURL(/scope=all/);
  await expect(page.locator("main ul[aria-label='Updates'] li").first()).toBeVisible();
});

test("a nearby exam opens the same destination the student was on", async ({ page }) => {
  await page.goto(`${unsupported}/practice`);
  await page
    .getByTestId("unavailable-practice")
    .getByRole("link", { name: "Level 4 · Lumbini · Agriculture Extension", exact: true })
    .click();
  await expect(page).toHaveURL(`${origin}${supported}/practice`);
  await expect(page.locator("#quick")).toBeVisible();
});

test("destination tabs are the top element at their own centre and large enough to tap", async ({
  page,
}) => {
  await page.goto(supported);
  // Anything that draws itself over the page late (a toolbar, a badge) is on
  // screen by now.
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  const links = primaryNav(page).getByRole("link");
  await expect(links).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    const link = links.nth(i);
    const box = (await link.boundingBox())!;
    expect(box.height, `tab ${i} height`).toBeGreaterThanOrEqual(44);
    expect(box.width, `tab ${i} width`).toBeGreaterThanOrEqual(44);
    const onTop = await link.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return element.contains(hit);
    });
    expect(onTop, `tab ${i} is covered by another element`).toBe(true);
  }
});

test("a tapped tab answers at once while the page is still loading", async ({ page }) => {
  await page.goto(supported);
  await page.waitForLoadState("networkidle");
  // Hold back the next page, as a slow connection would.
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(`**${supported}/syllabus*`, async (route) => {
    await held;
    await route.continue();
  });
  const link = primaryNav(page).getByRole("link", { name: "Syllabus", exact: true });
  await press(page, link);
  await expect(link.locator(".tab-body")).toHaveAttribute("data-pending", "");
  await expect(page.getByTestId("nav-progress")).toHaveAttribute("data-active", "");
  // Nothing has loaded yet: the page is still Home.
  await expect(page.locator("main h1")).toHaveText("Today");
  release();
  await expect(page).toHaveURL(`${origin}${supported}/syllabus`);
  await expect(page.locator("main h1")).toHaveText("Syllabus");
  await expect(link).toHaveAttribute("aria-current", "page");
  await expect(link.locator(".tab-body")).not.toHaveAttribute("data-pending", "");
  await expect(page.getByTestId("nav-progress")).not.toHaveAttribute("data-active", "");
});

test("direct entry, refresh, Back and Forward keep the page and the exam", async ({ page }) => {
  await page.goto(topic);
  const heading = await page.locator("main h1").innerText();
  await expect(page.getByTestId("exam-label")).toHaveText(
    "Level 4 · Lumbini · Agriculture Extension",
  );
  await page.reload();
  await expect(page.locator("main h1")).toHaveText(heading);

  const practice = primaryNav(page).getByRole("link", { name: "Practice", exact: true });
  await press(page, practice);
  await expect(page.locator("main h1")).toHaveText("Practice");
  await page.goBack();
  await expect(page).toHaveURL(`${origin}${topic}`);
  await expect(page.locator("main h1")).toHaveText(heading);
  await expect(
    primaryNav(page).getByRole("link", { name: "Syllabus", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goForward();
  await expect(page).toHaveURL(`${origin}${supported}/practice`);
  await expect(page.locator("main h1")).toHaveText("Practice");
});

test("breadcrumbs name the page and link every ancestor to a real page", async ({ page }) => {
  await page.goto(topic);
  const crumbs = page.getByRole("navigation", { name: "Where this page is", exact: true });
  await expect(crumbs.getByRole("link")).toHaveText(["Home", "Syllabus", "5. Crop protection"]);
  const current = crumbs.locator('[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toContainText("5.3");
  // The current page is named, not linked to itself.
  await expect(crumbs.getByRole("link", { name: /5\.3/ })).toHaveCount(0);

  await crumbs.getByRole("link", { name: "5. Crop protection", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${supported}/syllabus#subject-`));
  await expect(page.locator("main h1")).toHaveText("Syllabus");

  await page.goto(topic);
  await crumbs.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(`${origin}${supported}`);
  await expect(page.locator("main h1")).toHaveText("Today");

  for (const [path, trail, last] of [
    [`${supported}/practice/session?mode=quick`, ["Home", "Practice"], "Quick practice"],
    [`${supported}/practice/review`, ["Home", "Practice"], "Review mistakes"],
    [`${supported}/guide`, ["Home"], "Guidance"],
    [`${supported}/updates/l4-exam-schedule`, ["Home", "Updates"], "Notice"],
  ] as const) {
    await page.goto(path);
    await expect(crumbs.getByRole("link")).toHaveText([...trail]);
    await expect(crumbs.locator('[aria-current="page"]')).toContainText(last);
    await expect(page.locator("main h1")).toHaveCount(1);
  }
});
