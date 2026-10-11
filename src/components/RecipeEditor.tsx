"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError, newId, unwrap,
  type Collection, type Ingredient, type Media, type Recipe, type RecipeContent, type Step, type Unit,
} from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { problemMessage, tr, unitLabels } from "@/lib/i18n";
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
 * Web tarif editörü: tamamen online. Kayıt yalnız sunucu onayıyla başarılıdır. Ağ kaybında metin
 * bellekte korunur ve "Kaydedilmedi" gösterilir; otomatik offline kuyruk/replay yoktur.
 */
export function RecipeEditor({ initial }: { initial: Recipe | null }) {
  const { api } = useAuth();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(initial);
  const [content, setContent] = useState<RecipeContent>(() => (initial ? contentOf(initial) : emptyContent()));
  const [save, setSave] = useState<SaveState>({ kind: "clean" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  // Aynı içerik için retry boyunca sabit operationId; içerik değişince yenilenir.
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
      if (!recipe) router.replace(`/defter/${saved.id}`);
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
    const created = await unwrap(api.POST("/v1/recipes", { body: { operationId: op, recipeId: id, content: { ...content, title: `${content.title} (benim sürümüm)` } } }));
    router.push(`/defter/${created.id}`);
  }

  async function remove() {
    if (!recipe || !confirm("Bu tarif silinsin mi? Yayındaysa yayından da kaldırılır.")) return;
    try {
      await unwrap(api.DELETE("/v1/recipes/{recipeId}", { params: { path: { recipeId: recipe.id }, query: { operationId: newId(), baseRevision: recipe.revision } } }));
      router.push("/defter");
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
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="flex-1 font-[family-name:var(--font-display)] text-2xl font-bold">{recipe ? "Tarifi düzenle" : "Yeni tarif"}</h1>
        <SaveIndicator state={save} />
        <button type="button" className="btn-primary" disabled={save.kind === "saving" || save.kind === "clean" || save.kind === "saved"} onClick={() => doSave()}>
          {save.kind === "saving" ? tr.recipe.saving : tr.recipe.save}
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
        <p className="card text-sm">
          {tr.recipe.copiedFrom}: <strong>{recipe.source.authorDisplayName}</strong> — bu bağımsız, özel bir kopyadır.
        </p>
      ) : null}

      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); doSave(); }} noValidate>
        <Field label={tr.recipe.title} error={err("title")}>
          <input className="input text-xl" value={content.title} maxLength={120} onChange={(e) => update({ title: e.target.value })} />
        </Field>
        <Field label={tr.recipe.description} error={err("description")}>
          <textarea className="input min-h-20" value={content.description ?? ""} maxLength={2000} onChange={(e) => update({ description: e.target.value || null })} />
        </Field>
        <CoverPicker mediaId={content.coverMediaId ?? null} onChange={(id) => update({ coverMediaId: id })} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Porsiyon" error={err("yield.amount")}>
            <input className="input" type="number" min={0} inputMode="decimal" value={content.yield?.amount ?? ""} onChange={(e) => update({ yield: { ...content.yield, amount: e.target.value === "" ? null : Number(e.target.value) } })} />
          </Field>
          <Field label="Birim">
            <input className="input" value={content.yield?.unit ?? ""} maxLength={30} placeholder="porsiyon" onChange={(e) => update({ yield: { ...content.yield, unit: e.target.value || null } })} />
          </Field>
          <Field label={tr.recipe.prep} error={err("prepMinutes")}>
            <input className="input" type="number" min={0} inputMode="numeric" value={content.prepMinutes ?? ""} onChange={(e) => update({ prepMinutes: e.target.value === "" ? null : Number(e.target.value) })} />
          </Field>
          <Field label={tr.recipe.cook} error={err("cookMinutes")}>
            <input className="input" type="number" min={0} inputMode="numeric" value={content.cookMinutes ?? ""} onChange={(e) => update({ cookMinutes: e.target.value === "" ? null : Number(e.target.value) })} />
          </Field>
        </div>

        <IngredientsEditor items={content.ingredients} errors={fieldErrors} onChange={(ingredients) => update({ ingredients })} />
        <StepsEditor items={content.steps} errors={fieldErrors} onChange={(steps) => update({ steps })} />

        <Field label={`${tr.recipe.tags} (virgülle ayırın)`} error={err("tags")}>
          <TagsInput value={content.tags} onChange={(tags) => update({ tags })} />
        </Field>
        <Field label={tr.recipe.privateNote} error={err("privateNote")}>
          <textarea className="input min-h-20" value={content.privateNote ?? ""} maxLength={5000} onChange={(e) => update({ privateNote: e.target.value || null })} />
        </Field>
      </form>

      {recipe ? (
        <>
          <CollectionMembership recipeId={recipe.id} />
          {isCopy ? (
            <p className="card text-sm text-muted">{tr.publish.copyNotRepublishable}</p>
          ) : (
            <PublishPanel recipe={recipe} dirty={dirty} onChanged={setRecipe} />
          )}
          <button type="button" className="btn-danger self-start" onClick={remove}>{tr.recipe.delete}</button>
        </>
      ) : null}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const text =
    state.kind === "saving" ? tr.recipe.saving
    : state.kind === "saved" ? tr.recipe.saved
    : state.kind === "dirty" ? tr.recipe.unsaved
    : state.kind === "error" ? `${tr.recipe.unsaved}: ${state.message}`
    : state.kind === "conflict" ? tr.conflict.title
    : "";
  const tone = state.kind === "saved" ? "text-ok" : state.kind === "error" || state.kind === "conflict" ? "text-danger" : "text-muted";
  return <span role="status" aria-live="polite" className={`text-sm ${tone}`}>{text}</span>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-semibold">{label}</span>
      {children}
      {error ? <span className="text-sm text-danger">{error}</span> : null}
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
    <fieldset className="card flex flex-col gap-3">
      <legend className="px-1 text-xl font-bold">{tr.recipe.ingredients}</legend>
      <ol className="flex flex-col gap-3">
        {items.map((ing, i) => (
          <li key={ing.id} className="grid grid-cols-[4.5rem_8rem_1fr] items-start gap-2 sm:grid-cols-[5rem_9rem_1fr_auto]">
            <input aria-label={`Malzeme ${i + 1} miktar`} className="input" type="number" min={0} step="any" inputMode="decimal"
              value={ing.quantity.amount ?? ""} disabled={ing.quantity.toTaste && ing.quantity.amount == null}
              onChange={(e) => set(i, { quantity: { ...ing.quantity, amount: e.target.value === "" ? null : Number(e.target.value) } })} />
            <select aria-label={`Malzeme ${i + 1} birim`} className="input" value={ing.quantity.unit ?? ""}
              onChange={(e) => set(i, { quantity: { ...ing.quantity, unit: (e.target.value || null) as Unit | null } })}>
              <option value="">—</option>
              {(Object.keys(unitLabels) as Unit[]).filter((u) => u !== "other").map((u) => <option key={u} value={u}>{unitLabels[u]}</option>)}
            </select>
            <div className="flex flex-col gap-1">
              <input aria-label={`Malzeme ${i + 1} adı`} className="input" value={ing.name} maxLength={120} placeholder="ör. kırmızı mercimek" onChange={(e) => set(i, { name: e.target.value })} />
              <input aria-label={`Malzeme ${i + 1} not`} className="input text-sm" value={ing.note ?? ""} maxLength={200} placeholder="not (isteğe bağlı)" onChange={(e) => set(i, { note: e.target.value || null })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ing.quantity.toTaste} onChange={(e) => set(i, { quantity: { ...ing.quantity, toTaste: e.target.checked } })} />
                {tr.recipe.toTaste}
              </label>
              {errors[`ingredients[${i}].quantity`] || errors[`ingredients[${i}].name`] ? (
                <span className="text-sm text-danger">{[...(errors[`ingredients[${i}].name`] ?? []), ...(errors[`ingredients[${i}].quantity`] ?? [])].join(" ")}</span>
              ) : null}
            </div>
            <div className="col-span-3 flex gap-1 sm:col-span-1">
              <button type="button" className="btn-ghost px-2" aria-label={`Malzeme ${i + 1} yukarı taşı`} onClick={() => onChange(move(items, i, -1))} disabled={i === 0}>↑</button>
              <button type="button" className="btn-ghost px-2" aria-label={`Malzeme ${i + 1} aşağı taşı`} onClick={() => onChange(move(items, i, 1))} disabled={i === items.length - 1}>↓</button>
              <button type="button" className="btn-ghost px-2" aria-label={`Malzeme ${i + 1} sil`} onClick={() => onChange(items.filter((_, k) => k !== i))}>✕</button>
            </div>
          </li>
        ))}
      </ol>
      {errors.ingredients ? <p className="text-sm text-danger">{errors.ingredients.join(" ")}</p> : null}
      <button type="button" className="btn-ghost self-start" onClick={() => onChange([...items, { id: newId(), name: "", quantity: { amount: null, unit: null, toTaste: false }, note: null }])}>
        + {tr.recipe.addIngredient}
      </button>
    </fieldset>
  );
}

function StepsEditor({ items, errors, onChange }: { items: Step[]; errors: Record<string, string[]>; onChange: (v: Step[]) => void }) {
  return (
    <fieldset className="card flex flex-col gap-3">
      <legend className="px-1 text-xl font-bold">{tr.recipe.steps}</legend>
      <ol className="flex flex-col gap-3">
        {items.map((s, i) => (
          <li key={s.id} className="flex items-start gap-2">
            <span className="mt-2 w-6 font-bold" aria-hidden>{i + 1}.</span>
            <textarea aria-label={`Adım ${i + 1}`} className="input min-h-20 flex-1" value={s.text} maxLength={2000}
              onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))} />
            <div className="flex flex-col gap-1">
              <button type="button" className="btn-ghost px-2" aria-label={`Adım ${i + 1} yukarı taşı`} onClick={() => onChange(move(items, i, -1))} disabled={i === 0}>↑</button>
              <button type="button" className="btn-ghost px-2" aria-label={`Adım ${i + 1} aşağı taşı`} onClick={() => onChange(move(items, i, 1))} disabled={i === items.length - 1}>↓</button>
              <button type="button" className="btn-ghost px-2" aria-label={`Adım ${i + 1} sil`} onClick={() => onChange(items.filter((_, k) => k !== i))}>✕</button>
            </div>
          </li>
        ))}
      </ol>
      {errors.steps ? <p className="text-sm text-danger">{errors.steps.join(" ")}</p> : null}
      <button type="button" className="btn-ghost self-start" onClick={() => onChange([...items, { id: newId(), text: "" }])}>+ {tr.recipe.addStep}</button>
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

/** Kapak fotoğrafı: tek blob kısa süreli yükleme yetkisi → PUT → tamamla → işlenene kadar bekle. */
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
    if (!["image/jpeg", "image/png", "image/webp"].includes(original.type)) { setStatus("Yalnız JPEG, PNG veya WebP."); return; }
    const id = newId();
    try {
      setStatus("Hazırlanıyor…");
      const file = await downscale(original);
      if (file.size > 10 * 1024 * 1024) { setStatus("Fotoğraf en fazla 10 MB olabilir."); return; }
      setStatus("Yükleniyor…");
      const grant = await unwrap(api.POST("/v1/media/uploads", { body: { mediaId: id, contentType: file.type as "image/jpeg", sizeBytes: file.size } }));
      const put = await fetch(grant.uploadUrl, { method: "PUT", headers: grant.headers, body: file });
      if (!put.ok) throw new Error(`Yükleme başarısız (${put.status})`);
      await unwrap(api.POST("/v1/media/{mediaId}/complete", { params: { path: { mediaId: id } } }));
      setStatus("İşleniyor… Kaydetmeyi unutmayın.");
      onChange(id);
    } catch (e) {
      setStatus(e instanceof ApiError ? problemMessage(e.code) : "Fotoğraf yüklenemedi.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-semibold">{tr.recipe.cover}</span>
      {mediaId && media?.id === mediaId && media.status === "ready" && media.thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.thumbUrl} alt="Kapak önizlemesi" width={400} height={300} className="w-48 rounded-lg object-cover" />
      ) : mediaId ? (
        <p className="text-sm text-muted">{media?.status === "rejected" ? `Fotoğraf reddedildi: ${media.rejectReason ?? ""}` : "Fotoğraf işleniyor…"}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <label className="btn-ghost cursor-pointer">
          Fotoğraf seç
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {mediaId ? <button type="button" className="btn-ghost" onClick={() => onChange(null)}>Kaldır</button> : null}
      </div>
      {status ? <p role="status" className="text-sm text-muted">{status}</p> : null}
    </div>
  );
}

/** Yüklemeden önce en uzun kenarı 2400 px'e küçültür (bant genişliği ve sunucu belleği için). */
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
    return file; // tarayıcı desteklemiyorsa orijinal (sunucu yine doğrular)
  }
}

function ConflictDialog({ local, remote, onUseRemote, onKeepLocal, onOverwrite }: {
  local: RecipeContent; remote: Recipe; onUseRemote: () => void; onKeepLocal: () => void; onOverwrite: () => void;
}) {
  const diffs = useMemo(() => {
    const rc = contentOf(remote);
    const fields: [string, unknown, unknown][] = [
      [tr.recipe.title, local.title, rc.title],
      [tr.recipe.description, local.description, rc.description],
      [tr.recipe.ingredients, local.ingredients.map((i) => i.name).join(", "), rc.ingredients.map((i) => i.name).join(", ")],
      [tr.recipe.steps, local.steps.map((s) => s.text).join(" / "), rc.steps.map((s) => s.text).join(" / ")],
      [tr.recipe.tags, local.tags.join(", "), rc.tags.join(", ")],
      [tr.recipe.privateNote, local.privateNote, rc.privateNote],
    ];
    return fields.filter(([, a, b]) => JSON.stringify(a ?? "") !== JSON.stringify(b ?? ""));
  }, [local, remote]);
  return (
    <section role="alertdialog" aria-labelledby="cakisma" className="card flex flex-col gap-3 border-danger">
      <h2 id="cakisma" className="text-xl font-bold">{tr.conflict.title}</h2>
      <p>{remote.deleted ? "Bu tarif başka bir cihazda silindi." : tr.conflict.body}</p>
      {!remote.deleted ? (
        <table className="w-full text-left text-sm">
          <thead><tr><th scope="col">Alan</th><th scope="col">Sizin sürümünüz</th><th scope="col">Sunucudaki sürüm</th></tr></thead>
          <tbody>
            {diffs.map(([f, a, b]) => (
              <tr key={f} className="border-t border-border align-top"><th scope="row" className="pr-2">{f}</th><td className="pr-2">{String(a ?? "—")}</td><td>{String(b ?? "—")}</td></tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!remote.deleted ? <button type="button" className="btn-ghost" onClick={onUseRemote}>{tr.conflict.useRemote}</button> : null}
        <button type="button" className="btn-primary" onClick={onKeepLocal}>{tr.conflict.keepLocalAsNew}</button>
        {!remote.deleted ? <button type="button" className="btn-danger" onClick={onOverwrite}>{tr.conflict.overwrite}</button> : null}
      </div>
    </section>
  );
}

/** Koleksiyon üyeliği: revision kontrollü; çakışmada güncel koleksiyon üzerine yeniden uygulanır. */
function CollectionMembership({ recipeId }: { recipeId: string }) {
  const { api } = useAuth();
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    unwrap(api.GET("/v1/collections", { params: { query: { limit: 50 } } })).then((p) => setCollections(p.items)).catch(() => setError("Koleksiyonlar yüklenemedi."));
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
    <fieldset className="card">
      <legend className="px-1 font-bold">Koleksiyonlar</legend>
      <div className="flex flex-wrap gap-4">
        {collections.map((c) => (
          <label key={c.id} className="flex items-center gap-2">
            <input type="checkbox" checked={c.recipeIds.includes(recipeId)} onChange={(e) => toggle(c, e.target.checked)} />
            {c.name}
          </label>
        ))}
      </div>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </fieldset>
  );
}
