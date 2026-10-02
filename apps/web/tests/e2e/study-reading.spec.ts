import { expect, test } from "@playwright/test";

const syllabus = "/level-4/lumbini/agri-extension/syllabus";

test.describe("syllabus source evidence", () => {
  test.use({ javaScriptEnabled: false });

  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: "agrilok_lang", value: "en", domain: "127.0.0.1", path: "/" },
    ]);
  });

  test("keeps source, date and review visible before opening reference details", async ({
    page,
  }) => {
    await page.goto(syllabus);
    const source = page.getByRole("region", { name: "Official syllabus", exact: true });
    const details = page.getByTestId("syllabus-source-details");

    await expect(details).not.toHaveAttribute("open", "");
    await expect(source.getByRole("link", { name: /Original PDF/ })).toHaveAttribute(
      "href",
      /^https:\/\/ppsc\.lumbini\.gov\.np\/media\//,
    );
    await expect(source.getByText("ppsc.lumbini.gov.np", { exact: true }).first()).toBeVisible();
    await expect(source.getByText(/^Fetched by us \d+ \w+ \d{4}$/)).toBeVisible();
    await expect(source.getByText("Pending review", { exact: true })).toBeVisible();
    await expect(source.getByText(/The prototype shows a selection of topics/)).toBeVisible();

    await details.locator("summary").focus();
    await details.locator("summary").press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await expect(details.getByText(/Agriculture Service, Assistant Level 4 \(/)).toBeVisible();
  });

  test("names an unavailable source and retains its date without an outgoing link", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "agrilok_sim", value: "sources", domain: "127.0.0.1", path: "/" },
    ]);
    await page.goto(syllabus);
    const source = page.getByRole("region", { name: "Official syllabus", exact: true });

    await expect(
      source.getByText(/Link withheld\. The source could not be reached/).first(),
    ).toBeVisible();
    await expect(source.getByText("ppsc.lumbini.gov.np", { exact: true })).toBeVisible();
    await expect(source.getByText(/^Fetched by us \d+ \w+ \d{4}$/)).toBeVisible();
    await expect(source.getByRole("link", { name: /Original PDF/ })).toHaveCount(0);
  });
});
