import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { api, content, createPublished, emulatorToken, uid, type Recipe } from "./helpers";

async function signIn(page: Page, email: string) {
  await page.goto("/giris?next=/defter");
  await page.getByLabel("E-posta").fill(email);
  await page.getByRole("button", { name: "Emulator ile giriş" }).click();
  await expect(page.getByRole("heading", { name: "Defterim" })).toBeVisible();
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test("public tarif SSR: içerik, JSON-LD, özel not yok, erişilebilirlik", async ({ page }) => {
  const token = await emulatorToken(`pub-${uid()}@example.com`);
  const title = `E2E Çorba ${uid()}`;
  const r = await createPublished(token, title);
  const resp = await page.request.get(`/tarif/${r.id}`);
  const html = await resp.text();
  expect(html).toContain(title);
  expect(html).toContain("application/ld+json");
  expect(html).not.toContain("GIZLI-E2E-NOT");
  await page.goto(`/tarif/${r.id}`);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await axe(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Yeni tarifler" })).toBeVisible();
  await axe(page);
});

test("web defteri: oluştur → kaydet (sunucu onayı) → ağ kaybında 'Kaydedilmedi' ve metin korunur", async ({ page }) => {
  await signIn(page, `ed-${uid()}@example.com`);
  await axe(page);
  await page.getByRole("link", { name: "+ Yeni tarif" }).click();
  const title = `Web tarifi ${uid()}`;
  await page.getByLabel("Tarif adı").fill(title);
  await page.getByLabel("Malzeme 1 adı").fill("Bulgur");
  await page.getByLabel("Adım 1", { exact: true }).fill("Suyu kaynat.");
  await axe(page);
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("Kaydedildi")).toBeVisible();
  await expect(page).toHaveURL(/\/defter\/[0-9a-f-]{36}$/);

  // Ağ kaybı: API isteği başarısız → sahte başarı yok, metin bellekte
  await page.route("**/api/v1/recipes/**", (route) => (route.request().method() === "PUT" ? route.abort("internetdisconnected") : route.continue()));
  await page.getByLabel("Tarif adı").fill(`${title} (offline düzenleme)`);
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText(/Kaydedilmedi/)).toBeVisible();
  await expect(page.getByLabel("Tarif adı")).toHaveValue(`${title} (offline düzenleme)`);
  await page.unroute("**/api/v1/recipes/**");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("Kaydedildi")).toBeVisible();
});

test("web: aynı revision çakışması iki sürümü korur ve yerel sürüm yeni tarif olarak saklanabilir", async ({ page }) => {
  const email = `cf-${uid()}@example.com`;
  const token = await emulatorToken(email);
  const r = await api<Recipe>(token, "POST", "/v1/recipes", { operationId: randomUUID(), recipeId: randomUUID(), content: content("Ortak tarif") });
  await signIn(page, email);
  await page.goto(`/defter/${r.id}`);
  await expect(page.getByLabel("Tarif adı")).toHaveValue("Ortak tarif");
  // Başka cihaz (mobil) aynı revision üzerinde değiştirir
  await api(token, "PUT", `/v1/recipes/${r.id}`, { operationId: randomUUID(), baseRevision: r.revision, content: content("Mobil sürüm") });
  await page.getByLabel("Tarif adı").fill("Web sürümü");
  await page.getByRole("button", { name: "Kaydet" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Tarif başka bir yerde değişti");
  await expect(dialog).toContainText("Web sürümü");
  await expect(dialog).toContainText("Mobil sürüm");
  await dialog.getByRole("button", { name: "Benim sürümümü yeni tarif olarak sakla" }).click();
  await expect(page.getByLabel("Tarif adı")).toHaveValue("Web sürümü (benim sürümüm)");
  const server = await api<Recipe>(token, "GET", `/v1/recipes/${r.id}`);
  expect(server.title).toBe("Mobil sürüm");
});
