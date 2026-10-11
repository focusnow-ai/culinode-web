import createClient from "openapi-fetch";
import type { components, paths } from "./schema";
import { config } from "../config";

export type Schemas = components["schemas"];
export type Recipe = Schemas["Recipe"];
export type RecipeContent = Schemas["RecipeContent"];
export type PublicRecipe = Schemas["PublicRecipe"];
export type PublicRecipeSummary = Schemas["PublicRecipeSummary"];
export type Problem = Schemas["Problem"];
export type Collection = Schemas["Collection"];
export type Profile = Schemas["Profile"];
export type Discussion = Schemas["Discussion"];
export type Notification = Schemas["Notification"];
export type Favorite = Schemas["Favorite"];
export type Media = Schemas["Media"];
export type Ingredient = Schemas["Ingredient"];
export type Step = Schemas["Step"];
export type Unit = NonNullable<Schemas["Unit"]>;

/** API hatası: Problem Details + ağ hatası ayrımı. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: Problem | null,
    message?: string,
  ) {
    super(message ?? problem?.detail ?? `HTTP ${status}`);
  }
  get code() {
    return this.problem?.code ?? (this.status === 0 ? "network" : "internal");
  }
  get isNetwork() {
    return this.status === 0;
  }
}

/** Ağ kopması (fetch reddedildi) → status 0. Sahte başarı yok. */
const safeFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (e) {
    throw new ApiError(0, null, e instanceof Error ? `Sunucuya ulaşılamadı: ${e.message}` : "Sunucuya ulaşılamadı");
  }
};

/**
 * Sunucu tarafı (SSR) public istemci: yalnız public veri, her istek taze (no-store),
 * kullanıcı verisi ve token taşımaz.
 */
export function serverPublicClient() {
  return createClient<paths>({
    baseUrl: `${config.apiBaseUrl}/api`,
    fetch: (req: Request) => safeFetch(new Request(req, { cache: "no-store" })),
  });
}

/** Tarayıcı istemcisi: Firebase ID token'ı her isteğe eklenir. Private yanıtlar cache'lenmez. */
export function browserClient(getToken: () => Promise<string | null>) {
  const client = createClient<paths>({ baseUrl: `${config.apiBaseUrl}/api`, fetch: safeFetch, cache: "no-store" });
  client.use({
    async onRequest({ request }) {
      const token = await getToken();
      if (token) request.headers.set("Authorization", `Bearer ${token}`);
      return request;
    },
  });
  return client;
}

export type BrowserClient = ReturnType<typeof browserClient>;

/** openapi-fetch sonucunu açar: hata varsa ApiError fırlatır. */
export async function unwrap<T>(
  p: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await p;
  if (error !== undefined || !response.ok) {
    const problem = (error && typeof error === "object" && "code" in (error as object) ? error : null) as Problem | null;
    throw new ApiError(response.status, problem);
  }
  return data as T;
}

export function newId(): string {
  return crypto.randomUUID();
}

/** Public medya yolu API köküne göre çözülür. */
export function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${config.apiBaseUrl}${path}`;
}
