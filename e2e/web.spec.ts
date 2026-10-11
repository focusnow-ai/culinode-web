import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { api, content, createPublished, emulatorToken, uid, type Recipe } from "./helpers";

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in?next=/notebook");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Sign in with emulator" }).click();
  await expect(page.getByRole("heading", { name: "My recipes" })).toBeVisible();
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test("public recipe SSR: content, JSON-LD, no private note, accessibility", async ({ page }) => {
  const token = await emulatorToken(`pub-${uid()}@example.com`);
  const title = `E2E Soup ${uid()}`;
  const r = await createPublished(token, title);
  const resp = await page.request.get(`/recipe/${r.id}`);
  const html = await resp.text();
  expect(html).toContain(title);
  expect(html).toContain("application/ld+json");
  expect(html).not.toContain("SECRET-E2E-NOTE");
  await page.goto(`/recipe/${r.id}`);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await axe(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "New recipes" })).toBeVisible();
  await axe(page);
});

test("web recipe book: create → save (server confirmed) → on network loss 'Not saved' and text is kept", async ({ page }) => {
  await signIn(page, `ed-${uid()}@example.com`);
  await axe(page);
  await page.getByRole("link", { name: "New recipe" }).click();
  const title = `Web recipe ${uid()}`;
  await page.getByLabel("Recipe title").fill(title);
  await page.getByLabel("Ingredient 1 name").fill("Bulgur");
  await page.getByLabel("Step 1", { exact: true }).fill("Boil the water.");
  await axe(page);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
  await expect(page).toHaveURL(/\/notebook\/[0-9a-f-]{36}$/);

  // Network loss: the API request fails → no fake success, the text stays in memory
  await page.route("**/api/v1/recipes/**", (route) => (route.request().method() === "PUT" ? route.abort("internetdisconnected") : route.continue()));
  await page.getByLabel("Recipe title").fill(`${title} (offline edit)`);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/Not saved/)).toBeVisible();
  await expect(page.getByLabel("Recipe title")).toHaveValue(`${title} (offline edit)`);
  await page.unroute("**/api/v1/recipes/**");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
});

test("web: a same-revision conflict keeps both versions and the local one can be saved as a new recipe", async ({ page }) => {
  const email = `cf-${uid()}@example.com`;
  const token = await emulatorToken(email);
  const r = await api<Recipe>(token, "POST", "/v1/recipes", { operationId: randomUUID(), recipeId: randomUUID(), content: content("Shared recipe") });
  await signIn(page, email);
  await page.goto(`/notebook/${r.id}`);
  await expect(page.getByLabel("Recipe title")).toHaveValue("Shared recipe");
  // Another device (mobile) changes the same revision
  await api(token, "PUT", `/v1/recipes/${r.id}`, { operationId: randomUUID(), baseRevision: r.revision, content: content("Mobile version") });
  await page.getByLabel("Recipe title").fill("Web version");
  await page.getByRole("button", { name: "Save" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("This recipe changed somewhere else");
  await expect(dialog).toContainText("Web version");
  await expect(dialog).toContainText("Mobile version");
  await dialog.getByRole("button", { name: "Keep my version as a new recipe" }).click();
  await expect(page.getByLabel("Recipe title")).toHaveValue("Web version (my version)");
  const server = await api<Recipe>(token, "GET", `/v1/recipes/${r.id}`);
  expect(server.title).toBe("Mobile version");
});
