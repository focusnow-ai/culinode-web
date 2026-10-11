import { randomUUID } from "node:crypto";

export const API = process.env.E2E_API_URL ?? "http://127.0.0.1:7071";
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";

export async function emulatorToken(email: string): Promise<string> {
  const idToken = JSON.stringify({ sub: `emu-${email}`, email, name: email.split("@")[0], email_verified: true });
  const r = await fetch(`http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postBody: `id_token=${idToken}&providerId=google.com`, requestUri: "http://localhost", returnSecureToken: true }),
  });
  return ((await r.json()) as { idToken: string }).idToken;
}

export async function api<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${API}/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${await r.text()}`);
  return (await r.json()) as T;
}

export function content(title: string, note = "GIZLI-E2E-NOT") {
  return {
    title,
    description: "Uçtan uca test tarifi",
    ingredients: [{ id: randomUUID(), name: "Kırmızı mercimek", quantity: { amount: 1, unit: "cup", toTaste: false } }],
    steps: [{ id: randomUUID(), text: "Mercimeği yıka ve haşla." }],
    tags: ["Çorba"],
    privateNote: note,
  };
}

export type Recipe = { id: string; revision: number; title: string };

export async function createPublished(token: string, title: string): Promise<Recipe> {
  const r = await api<Recipe>(token, "POST", "/v1/recipes", { operationId: randomUUID(), recipeId: randomUUID(), content: content(title) });
  await api(token, "POST", `/v1/recipes/${r.id}/publish`, { operationId: randomUUID(), revision: r.revision, copyAllowed: true });
  return r;
}

export const uid = () => randomUUID().slice(0, 8);
