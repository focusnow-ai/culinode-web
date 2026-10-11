import { describe, expect, it, vi } from "vitest";
import { formatQuantity, problemMessage } from "@/lib/i18n";
import { recipeJsonLd } from "@/lib/public-data";
import { ApiError, apiUrl, unwrap, type PublicRecipe } from "@/lib/api/client";

const recipe: PublicRecipe = {
  id: "r1", title: "Mercimek <script>", description: "d", tags: ["Çorba"], author: { id: "a", displayName: "Ayşe" },
  publishedAt: "2026-10-11T10:00:00Z", updatedAt: "2026-10-11T10:00:00Z", publicRevision: 1, copyAllowed: true,
  prepMinutes: 10, cookMinutes: 20, yield: { amount: 4, unit: "porsiyon" },
  ingredients: [{ id: "i", name: "Tuz", quantity: { toTaste: true } }],
  steps: [{ id: "s", text: "Pişir" }],
};

describe("formatQuantity", () => {
  it("gerektiği kadar gösterir", () => expect(formatQuantity({ toTaste: true })).toBe("gerektiği kadar"));
  it("Türkçe sayı ve birim", () => expect(formatQuantity({ amount: 1.5, unit: "cup", toTaste: false })).toBe("1,5 su bardağı"));
});

describe("recipeJsonLd", () => {
  it("schema.org Recipe üretir ve süreleri ISO 8601 yazar", () => {
    const ld = recipeJsonLd(recipe, "https://site", null);
    expect(ld["@type"]).toBe("Recipe");
    expect(ld.totalTime).toBe("PT30M");
    expect(ld.recipeIngredient).toEqual(["Tuz (gerektiği kadar)"]);
    expect(JSON.stringify(ld)).not.toContain("privateNote");
  });
});

describe("api client", () => {
  it("public medya yolunu API köküne çözer", () => expect(apiUrl("/api/v1/x")).toBe("http://api.test/api/v1/x"));
  it("Problem Details'i ApiError'a çevirir", async () => {
    const res = new Response(null, { status: 409 });
    await expect(
      unwrap(Promise.resolve({ error: { code: "revision-conflict", status: 409, title: "x", type: "t", retryable: false }, response: res })),
    ).rejects.toMatchObject({ status: 409, code: "revision-conflict" });
  });
  it("ağ hatası sahte başarı üretmez", () => {
    const e = new ApiError(0, null);
    expect(e.isNetwork).toBe(true);
    expect(problemMessage(e.code)).toContain("kaydedilmedi");
  });
  vi.unstubAllGlobals();
});
