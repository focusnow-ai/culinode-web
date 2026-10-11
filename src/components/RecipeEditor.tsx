"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError, newId, unwrap,
  type Collection, type Ingredient, type Media, type Recipe, type RecipeContent, type Step, type Unit,
} from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { problemMessage, t, unitLabels } from "@/lib/i18n";
import { ArrowDown, ArrowUp, Camera, Plus, Trash, X } from "@phosphor-icons/react/ssr";
import { PublishPanel } from "./PublishPanel";

const emptyContent = (): RecipeContent => ({
  title: "",
  description: null,
  coverMediaId: null,
  yield: { amount: null, unit: null },
  prepMinutes: null,
  cookMinutes: null,
  ingredients: [{ id: newId(), name: "", quantity: { amount: null, unit: null, toTaste: false }, note: null }],
  steps: [{ id: newId(), text: "" }],
  tags: [],
  privateNote: null,
});

function contentOf(r: Recipe): RecipeContent {
  return {
    title: r.title, description: r.description ?? null, coverMediaId: r.coverMediaId ?? null,
    yield: r.yield ?? { amount: null, unit: null }, prepMinutes: r.prepMinutes ?? null, cookMinutes: r.cookMinutes ?? null,
    ingredients: r.ingredients, steps: r.steps, tags: r.tags, privateNote: r.privateNote ?? null,
  };
}

type SaveState =
  | { kind: "clean" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string }
  | { kind: "conflict"; remote: Recipe };

/**
 * Web recipe editor: fully online. A save only succeeds once the server confirms it. If the network drops,
 * the text is kept in memory and "Not saved" is shown; there is no automatic offline queue/replay.
 */
export function RecipeEditor({ initial }: { initial: Recipe | null }) {
  const { api } = useAuth();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(initial);
  const [content, setContent] = useState<RecipeContent>(() => (initial ? contentOf(initial) : emptyContent()));
  const [save, setSave] = useState<SaveState>({ kind: "clean" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  // Stable operationId across retries for the same content; renewed when the content changes.
  const opRef = useRef<{ id: string; snapshot: string } | null>(null);
  const recipeIdRef = useRef<string>(initial?.id ?? newId());
  const isCopy = !!recipe?.source;

  const dirty = save.kind === "dirty" || save.kind === "error" || save.kind === "conflict";
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function update(patch: Partial<RecipeContent>) {
    setContent((c) => ({ ...c, ...patch }));
    setSave({ kind: "dirty" });
  }

  async function doSave(baseRevisionOverride?: number) {
    const snapshot = JSON.stringify({ content, base: baseRevisionOverride ?? recipe?.revision ?? null });
    if (!opRef.current || opRef.current.snapshot !== snapshot) opRef.current = { id: newId(), snapshot };
    setSave({ kind: "saving" });
    setFieldErrors({});
    try {
      const saved = recipe
        ? await unwrap(
            api.PUT("/v1/recipes/{recipeId}", {
              params: { path: { recipeId: recipe.id } },
              body: { operationId: opRef.current.id, baseRevision: baseRevisionOverride ?? recipe.revision, content },
            }),
          )
        : await unwrap(
            api.POST("/v1/recipes", { body: { operationId: opRef.current.id, recipeId: recipeIdRef.current, content } }),
          );
      opRef.current = null;
      setRecipe(saved);
      setSave({ kind: "saved" });
      if (!recipe) router.replace(`/notebook/${saved.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "revision-conflict" && e.problem?.currentRecipe) {
        setSave({ kind: "conflict", remote: e.problem.currentRecipe });
        return;
      }
      if (e instanceof ApiError && e.problem?.errors) setFieldErrors(e.problem.errors);
      setSave({ kind: "error", message: problemMessage(e instanceof ApiError ? e.code : undefined) });
    }
  }

  async function keepLocalAsNew() {
    const op = newId();
    const id = newId();
    const created = await unwrap(api.POST("/v1/recipes", { body: { operationId: op, recipeId: id, content: { ...content, title: `${content.title} (my version)` } } }));
    router.push(`/notebook/${created.id}`);
  }

  async function remove() {
    if (!recipe || !confirm("Delete this recipe? If it is published, it will be unpublished too.")) return;
    try {
      await unwrap(api.DELETE("/v1/recipes/{recipeId}", { params: { path: { recipeId: recipe.id }, query: { operationId: newId(), baseRevision: recipe.revision } } }));
      router.push("/notebook");
    } catch (e) {
      if (e instanceof ApiError && e.code === "revision-conflict" && e.problem?.currentRecipe) {
        setSave({ kind: "conflict", remote: e.problem.currentRecipe });
      } else {
        setSave({ kind: "error", message: problemMessage(e instanceof ApiError ? e.code : undefined) });
      }
    }
  }

  const err = (f: string) => fieldErrors[f]?.join(" ");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Save bar: pinned to the bottom on phones (thumb reach), under the site header on wider screens. */}
      <h1 className="page-title">{recipe ? "Edit recipe" : "New recipe"}</h1>
      <div className="sticky bottom-0 z-20 order-last -mx-4 -mt-3 flex items-center justify-end gap-3 border-t border-border bg-background/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 md:top-16 md:bottom-auto md:order-none md:mx-0 md:border-t-0 md:border-b md:px-0">
        <span className="mr-auto"><SaveIndicator state={save} /></span>
        <button type="button" className="btn-primary" disabled={save.kind === "saving" || save.kind === "clean" || save.kind === "saved"} onClick={() => doSave()}>
          {save.kind === "saving" ? t.recipe.saving : t.recipe.save}
        </button>
      </div>

      {save.kind === "conflict" ? (
        <ConflictDialog
          local={content}
          remote={save.remote}
          onUseRemote={() => {
            setRecipe(save.remote);
            setContent(contentOf(save.remote));
            setSave({ kind: "clean" });
          }}
          onKeepLocal={keepLocalAsNew}
          onOverwrite={() => doSave(save.remote.revision)}
        />
      ) : null}

      {recipe?.source ? (
        <p className="rounded-xl bg-sunken px-4 py-3 text-sm">
          {t.recipe.copiedFrom}: <strong>{recipe.source.authorDisplayName}</strong>. This is an independent private copy.
        </p>
      ) : null}

      <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); doSave(); }} noValidate>
        <Field label={t.recipe.title} error={err("title")}>
          <input className="input font-display text-2xl font-bold" value={content.title} maxLength={120} onChange={(e) => update({ title: e.target.value })} />
        </Field>
        <Field label={t.recipe.description} error={err("description")}>
          <textarea className="input min-h-20" value={content.description ?? ""} maxLength={2000} onChange={(e) => update({ description: e.target.value || null })} />
        </Field>
        <CoverPicker mediaId={content.coverMediaId ?? null} onChange={(id) => update({ coverMediaId: id })} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Servings" error={err("yield.amount")}>
            <input className="input" type="number" min={0} inputMode="decimal" value={content.yield?.amount ?? ""} onChange={(e) => update({ yield: { ...content.yield, amount: e.target.value === "" ? null : Number(e.target.value) } })} />
          </Field>
          <Field label="Unit">
            <input className="input" value={content.yield?.unit ?? ""} maxLength={30} placeholder="servings" onChange={(e) => update({ yield: { ...content.yield, unit: e.target.value || null } })} />
          </Field>
          <Field label={t.recipe.prep} error={err("prepMinutes")}>
            <input className="input" type="number" min={0} inputMode="numeric" value={content.prepMinutes ?? ""} onChange={(e) => update({ prepMinutes: e.target.value === "" ? null : Number(e.target.value) })} />
          </Field>
          <Field label={t.recipe.cook} error={err("cookMinutes")}>
            <input className="input" type="number" min={0} inputMode="numeric" value={content.cookMinutes ?? ""} onChange={(e) => update({ cookMinutes: e.target.value === "" ? null : Number(e.target.value) })} />
          </Field>
        </div>

        <IngredientsEditor items={content.ingredients} errors={fieldErrors} onChange={(ingredients) => update({ ingredients })} />
        <StepsEditor items={content.steps} errors={fieldErrors} onChange={(steps) => update({ steps })} />

        <Field label={`${t.recipe.tags} (comma separated)`} error={err("tags")}>
          <TagsInput value={content.tags} onChange={(tags) => update({ tags })} />
        </Field>
        <Field label={t.recipe.privateNote} error={err("privateNote")}>
          <textarea className="input min-h-20" value={content.privateNote ?? ""} maxLength={5000} onChange={(e) => update({ privateNote: e.target.value || null })} />
        </Field>
      </form>

      {recipe ? (
        <>
          <CollectionMembership recipeId={recipe.id} />
          {isCopy ? (
            <p className="rounded-xl bg-sunken px-4 py-3 text-sm text-muted">{t.publish.copyNotRepublishable}</p>
          ) : (
            <PublishPanel recipe={recipe} dirty={dirty} onChanged={setRecipe} />
          )}
          <button type="button" className="btn-danger self-start" onClick={remove}><Trash size={18} aria-hidden />{t.recipe.delete}</button>
        </>
      ) : null}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const text =
    state.kind === "saving" ? t.recipe.saving
    : state.kind === "saved" ? t.recipe.saved
    : state.kind === "dirty" ? t.recipe.unsaved
    : state.kind === "error" ? `${t.recipe.unsaved}: ${state.message}`
    : state.kind === "conflict" ? t.conflict.title
    : "";
  const tone = state.kind === "saved" ? "text-ok" : state.kind === "error" || state.kind === "conflict" ? "text-danger" : "text-muted";
  return <span role="status" aria-live="polite" className={`text-sm font-medium ${tone}`}>{text}</span>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="text-sm font-medium text-danger">{error}</span> : null}
    </label>
  );
}

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const copy = arr.slice();
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

function IngredientsEditor({ items, errors, onChange }: { items: Ingredient[]; errors: Record<string, string[]>; onChange: (v: Ingredient[]) => void }) {
  const set = (i: number, patch: Partial<Ingredient>) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  return (
    <fieldset className="card flex flex-col gap-4 p-5 sm:p-6">
      <legend className="float-left mb-1 w-full section-title">{t.recipe.ingredients}</legend>
      <ol className="clear-both flex flex-col divide-y divide-border">
        {items.map((ing, i) => (
          <li key={ing.id} className="grid grid-cols-[5rem_1fr] items-start gap-2 py-4 first:pt-0 sm:grid-cols-[5rem_8.5rem_1fr_auto]">
            <input aria-label={`Ingredient ${i + 1} amount`} className="input" type="number" min={0} step="any" inputMode="decimal"
              value={ing.quantity.amount ?? ""} disabled={ing.quantity.toTaste && ing.quantity.amount == null}
              onChange={(e) => set(i, { quantity: { ...ing.quantity, amount: e.target.value === "" ? null : Number(e.target.value) } })} />
            <select aria-label={`Ingredient ${i + 1} unit`} className="input" value={ing.quantity.unit ?? ""}
              onChange={(e) => set(i, { quantity: { ...ing.quantity, unit: (e.target.value || null) as Unit | null } })}>
              <option value="">No unit</option>
              {(Object.keys(unitLabels) as Unit[]).filter((u) => u !== "other").map((u) => <option key={u} value={u}>{unitLabels[u]}</option>)}
            </select>
            <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
              <input aria-label={`Ingredient ${i + 1} name`} className="input" value={ing.name} maxLength={120} placeholder="e.g. red lentils" onChange={(e) => set(i, { name: e.target.value })} />
              <input aria-label={`Ingredient ${i + 1} note`} className="input min-h-10 py-1.5 text-sm" value={ing.note ?? ""} maxLength={200} placeholder="note (optional)" onChange={(e) => set(i, { note: e.target.value || null })} />
              <label className="flex min-h-9 items-center gap-2 text-sm">
                <input type="checkbox" checked={ing.quantity.toTaste} onChange={(e) => set(i, { quantity: { ...ing.quantity, toTaste: e.target.checked } })} />
                {t.recipe.toTaste}
              </label>
              {errors[`ingredients[${i}].quantity`] || errors[`ingredients[${i}].name`] ? (
                <span className="text-sm font-medium text-danger">{[...(errors[`ingredients[${i}].name`] ?? []), ...(errors[`ingredients[${i}].quantity`] ?? [])].join(" ")}</span>
              ) : null}
            </div>
            <div className="col-span-2 -mt-2 flex justify-end gap-0.5 sm:col-span-1 sm:mt-0">
              <button type="button" className="btn-icon" aria-label={`Move ingredient ${i + 1} up`} onClick={() => onChange(move(items, i, -1))} disabled={i === 0}><ArrowUp size={18} aria-hidden /></button>
              <button type="button" className="btn-icon" aria-label={`Move ingredient ${i + 1} down`} onClick={() => onChange(move(items, i, 1))} disabled={i === items.length - 1}><ArrowDown size={18} aria-hidden /></button>
              <button type="button" className="btn-icon hover:text-danger" aria-label={`Delete ingredient ${i + 1}`} onClick={() => onChange(items.filter((_, k) => k !== i))}><X size={18} aria-hidden /></button>
            </div>
          </li>
        ))}
      </ol>
      {errors.ingredients ? <p className="text-sm font-medium text-danger">{errors.ingredients.join(" ")}</p> : null}
      <button type="button" className="btn-ghost self-start" onClick={() => onChange([...items, { id: newId(), name: "", quantity: { amount: null, unit: null, toTaste: false }, note: null }])}>
        <Plus size={18} weight="bold" aria-hidden />
        {t.recipe.addIngredient}
      </button>
    </fieldset>
  );
}

function StepsEditor({ items, errors, onChange }: { items: Step[]; errors: Record<string, string[]>; onChange: (v: Step[]) => void }) {
  return (
    <fieldset className="card flex flex-col gap-4 p-5 sm:p-6">
      <legend className="float-left mb-1 w-full section-title">{t.recipe.steps}</legend>
      <ol className="clear-both flex flex-col gap-4">
        {items.map((s, i) => (
          <li key={s.id} className="flex items-start gap-3">
            <span className="mt-2 grid size-9 shrink-0 place-items-center rounded-full border-2 border-accent font-mono text-sm font-medium text-accent-ink" aria-hidden>{i + 1}</span>
            <textarea aria-label={`Step ${i + 1}`} className="input min-h-20 flex-1" value={s.text} maxLength={2000}
              onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))} />
            <div className="flex flex-col">
              <button type="button" className="btn-icon" aria-label={`Move step ${i + 1} up`} onClick={() => onChange(move(items, i, -1))} disabled={i === 0}><ArrowUp size={18} aria-hidden /></button>
              <button type="button" className="btn-icon" aria-label={`Move step ${i + 1} down`} onClick={() => onChange(move(items, i, 1))} disabled={i === items.length - 1}><ArrowDown size={18} aria-hidden /></button>
              <button type="button" className="btn-icon hover:text-danger" aria-label={`Delete step ${i + 1}`} onClick={() => onChange(items.filter((_, k) => k !== i))}><X size={18} aria-hidden /></button>
            </div>
          </li>
        ))}
      </ol>
      {errors.steps ? <p className="text-sm font-medium text-danger">{errors.steps.join(" ")}</p> : null}
      <button type="button" className="btn-ghost self-start" onClick={() => onChange([...items, { id: newId(), text: "" }])}><Plus size={18} weight="bold" aria-hidden />{t.recipe.addStep}</button>
    </fieldset>
  );
}

function TagsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join(", "));
  return (
    <input className="input" value={text} onChange={(e) => {
      setText(e.target.value);
      onChange(e.target.value.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20));
    }} />
  );
}

/** Cover photo: single-blob short-lived upload grant → PUT → complete → wait until processed. */
function CoverPicker({ mediaId, onChange }: { mediaId: string | null; onChange: (id: string | null) => void }) {
  const { api } = useAuth();
  const [media, setMedia] = useState<Media | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaId) return;
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      try {
        const m = await unwrap(api.GET("/v1/media/{mediaId}", { params: { path: { mediaId } } }));
        if (cancelled) return;
        setMedia(m);
        if (m.status === "processing" && attempts++ < 20) setTimeout(poll, Math.min(1000 * 2 ** attempts, 8000));
      } catch {
        if (!cancelled) setMedia(null);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [api, mediaId]);

  async function upload(original: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(original.type)) { setStatus("JPEG, PNG or WebP only."); return; }
    const id = newId();
    try {
      setStatus("Preparing…");
      const file = await downscale(original);
      if (file.size > 10 * 1024 * 1024) { setStatus("The photo can be at most 10 MB."); return; }
      setStatus("Uploading…");
      const grant = await unwrap(api.POST("/v1/media/uploads", { body: { mediaId: id, contentType: file.type as "image/jpeg", sizeBytes: file.size } }));
      const put = await fetch(grant.uploadUrl, { method: "PUT", headers: grant.headers, body: file });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      await unwrap(api.POST("/v1/media/{mediaId}/complete", { params: { path: { mediaId: id } } }));
      setStatus("Processing… Don't forget to save.");
      onChange(id);
    } catch (e) {
      setStatus(e instanceof ApiError ? problemMessage(e.code) : "Could not upload the photo.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="field-label">{t.recipe.cover}</span>
      <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border p-4 sm:flex-row sm:items-center">
      {mediaId && media?.id === mediaId && media.status === "ready" && media.thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.thumbUrl} alt="Cover preview" width={400} height={300} className="aspect-[4/3] w-full rounded-xl object-cover sm:w-56" />
      ) : mediaId ? (
        <p className="text-sm text-muted">{media?.status === "rejected" ? `Photo rejected: ${media.rejectReason ?? ""}` : "Processing photo…"}</p>
      ) : (
        <span className="grid h-32 w-full place-items-center rounded-xl bg-sunken text-muted sm:aspect-[4/3] sm:h-auto sm:w-56" aria-hidden><Camera size={32} /></span>
      )}
      <div className="flex flex-wrap gap-2">
        <label className="btn-ghost cursor-pointer focus-within:outline-3 focus-within:outline-accent">
          <Camera size={18} aria-hidden />
          Choose photo
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {mediaId ? <button type="button" className="btn-quiet" onClick={() => onChange(null)}>Remove</button> : null}
      </div>
      </div>
      {status ? <p role="status" className="text-sm text-muted">{status}</p> : null}
    </div>
  );
}

/** Downscales the longest side to 2400 px before upload (for bandwidth and server memory). */
async function downscale(file: File, maxEdge = 2400): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.type === "image/jpeg") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file; // the original if the browser can't do it (the server validates anyway)
  }
}

function ConflictDialog({ local, remote, onUseRemote, onKeepLocal, onOverwrite }: {
  local: RecipeContent; remote: Recipe; onUseRemote: () => void; onKeepLocal: () => void; onOverwrite: () => void;
}) {
  const diffs = useMemo(() => {
    const rc = contentOf(remote);
    const fields: [string, unknown, unknown][] = [
      [t.recipe.title, local.title, rc.title],
      [t.recipe.description, local.description, rc.description],
      [t.recipe.ingredients, local.ingredients.map((i) => i.name).join(", "), rc.ingredients.map((i) => i.name).join(", ")],
      [t.recipe.steps, local.steps.map((s) => s.text).join(" / "), rc.steps.map((s) => s.text).join(" / ")],
      [t.recipe.tags, local.tags.join(", "), rc.tags.join(", ")],
      [t.recipe.privateNote, local.privateNote, rc.privateNote],
    ];
    return fields.filter(([, a, b]) => JSON.stringify(a ?? "") !== JSON.stringify(b ?? ""));
  }, [local, remote]);
  return (
    <section role="alertdialog" aria-labelledby="conflict" className="card flex flex-col gap-4 border-danger/50 bg-danger-soft/40">
      <h2 id="conflict" className="section-title">{t.conflict.title}</h2>
      <p>{remote.deleted ? "This recipe was deleted on another device." : t.conflict.body}</p>
      {!remote.deleted ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-sunken"><tr><th scope="col" className="px-3 py-2">Field</th><th scope="col" className="px-3 py-2">Your version</th><th scope="col" className="px-3 py-2">Server version</th></tr></thead>
          <tbody>
            {diffs.map(([f, a, b]) => (
              <tr key={f} className="border-t border-border align-top"><th scope="row" className="px-3 py-2">{f}</th><td className="px-3 py-2">{String(a ?? "(empty)")}</td><td className="px-3 py-2">{String(b ?? "(empty)")}</td></tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!remote.deleted ? <button type="button" className="btn-ghost" onClick={onUseRemote}>{t.conflict.useRemote}</button> : null}
        <button type="button" className="btn-primary" onClick={onKeepLocal}>{t.conflict.keepLocalAsNew}</button>
        {!remote.deleted ? <button type="button" className="btn-danger" onClick={onOverwrite}>{t.conflict.overwrite}</button> : null}
      </div>
    </section>
  );
}

/** Collection membership: revision checked; on conflict it is reapplied to the current collection. */
function CollectionMembership({ recipeId }: { recipeId: string }) {
  const { api } = useAuth();
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    unwrap(api.GET("/v1/collections", { params: { query: { limit: 50 } } })).then((p) => setCollections(p.items)).catch(() => setError("Could not load collections."));
  }, [api]);
  if (!collections || collections.length === 0) return error ? <p className="text-sm text-danger">{error}</p> : null;

  async function toggle(c: Collection, add: boolean, retry = true) {
    const ids = add ? [...new Set([...c.recipeIds, recipeId])] : c.recipeIds.filter((x) => x !== recipeId);
    try {
      const updated = await unwrap(api.PUT("/v1/collections/{collectionId}", {
        params: { path: { collectionId: c.id } },
        body: { operationId: newId(), baseRevision: c.revision, content: { name: c.name, recipeIds: ids } },
      }));
      setCollections((prev) => prev!.map((x) => (x.id === c.id ? updated : x)));
    } catch (e) {
      if (retry && e instanceof ApiError && e.code === "revision-conflict" && e.problem?.currentCollection) {
        await toggle(e.problem.currentCollection, add, false);
      } else setError(problemMessage(e instanceof ApiError ? e.code : undefined));
    }
  }

  return (
    <fieldset className="card p-5 sm:p-6">
      <legend className="float-left mb-3 w-full section-title">Collections</legend>
      <div className="clear-both flex flex-wrap gap-2">
        {collections.map((c) => (
          <label key={c.id} className="chip min-h-11 cursor-pointer has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent-ink">
            <input type="checkbox" checked={c.recipeIds.includes(recipeId)} onChange={(e) => toggle(c, e.target.checked)} />
            {c.name}
          </label>
        ))}
      </div>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </fieldset>
  );
}
