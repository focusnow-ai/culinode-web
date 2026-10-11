import { describe, expect, it, vi } from "vitest";
import { formatQuantity, problemMessage } from "@/lib/i18n";
import { recipeJsonLd } from "@/lib/public-data";
import { ApiError, apiUrl, unwrap, type PublicRecipe } from "@/lib/api/client";

const recipe: PublicRecipe = {
  id: "r1", title: "Lentils <script>", description: "d", tags: ["Soup"], author: { id: "a", displayName: "Alex" },
  publishedAt: "2026-10-11T10:00:00Z", updatedAt: "2026-10-11T10:00:00Z", publicRevision: 1, copyAllowed: true,
  prepMinutes: 10, cookMinutes: 20, yield: { amount: 4, unit: "servings" },
  ingredients: [{ id: "i", name: "Salt", quantity: { toTaste: true } }],
  steps: [{ id: "s", text: "Cook" }],
};

describe("formatQuantity", () => {
  it("shows to taste", () => expect(formatQuantity({ toTaste: true })).toBe("to taste"));
  it("formats number and unit", () => expect(formatQuantity({ amount: 1.5, unit: "cup", toTaste: false })).toBe("1.5 cup"));
});

describe("recipeJsonLd", () => {
  it("builds a schema.org Recipe with ISO 8601 durations", () => {
    const ld = recipeJsonLd(recipe, "https://site", null);
    expect(ld["@type"]).toBe("Recipe");
    expect(ld.totalTime).toBe("PT30M");
    expect(ld.recipeIngredient).toEqual(["Salt (to taste)"]);
    expect(JSON.stringify(ld)).not.toContain("privateNote");
  });
});

describe("api client", () => {
  it("resolves public media paths against the API root", () => expect(apiUrl("/api/v1/x")).toBe("http://api.test/api/v1/x"));
  it("maps Problem Details to ApiError", async () => {
    const res = new Response(null, { status: 409 });
    await expect(
      unwrap(Promise.resolve({ error: { code: "revision-conflict", status: 409, title: "x", type: "t", retryable: false }, response: res })),
    ).rejects.toMatchObject({ status: 409, code: "revision-conflict" });
  });
  it("a network error never fakes success", () => {
    const e = new ApiError(0, null);
    expect(e.isNetwork).toBe(true);
    expect(problemMessage(e.code)).toContain("not saved");
  });
  vi.unstubAllGlobals();
});
