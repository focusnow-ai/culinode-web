"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, newId, unwrap } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { problemMessage } from "@/lib/i18n";

/** Giriş yapmış okuyucu için favori, deftere kopyalama, bildirme ve engelleme. Tümü online. */
export function PublicRecipeActions({ recipeId, authorId, copyAllowed }: { recipeId: string; authorId: string; copyAllowed: boolean }) {
  const { user, ready, api } = useAuth();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  // Kopyalama isteğinin kimliği retry boyunca sabit kalır (idempotent).
  const [copyOp] = useState(() => newId());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    unwrap(api.GET("/v1/public/recipes/{recipeId}", { params: { path: { recipeId } } }))
      .then((r) => !cancelled && setIsFavorite(r.viewer?.isFavorite ?? false))
      .catch(() => !cancelled && setIsFavorite(false));
    return () => {
      cancelled = true;
    };
  }, [user, api, recipeId]);

  if (!ready) return null;
  if (!user)
    return (
      <p className="card text-sm">
        Favorilere eklemek, deftere kopyalamak ve soru sormak için{" "}
        <Link className="font-semibold underline" href={`/giris?next=/tarif/${recipeId}`}>giriş yapın</Link>.
      </p>
    );
  const isAuthor = user.uid === authorId;

  async function run(name: string, fn: () => Promise<void>) {
    setBusy(name);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ kind: "error", text: problemMessage(e instanceof ApiError ? e.code : undefined) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {!isAuthor ? (
          <button
            type="button"
            className="btn-ghost"
            aria-pressed={isFavorite ?? false}
            disabled={busy !== null || isFavorite === null}
            onClick={() =>
              run("fav", async () => {
                if (isFavorite) {
                  await unwrap(api.DELETE("/v1/favorites/{recipeId}", { params: { path: { recipeId } } }));
                  setIsFavorite(false);
                } else {
                  await unwrap(api.PUT("/v1/favorites/{recipeId}", { params: { path: { recipeId } } }));
                  setIsFavorite(true);
                }
              })
            }
          >
            {isFavorite ? "★ Favorilerde" : "☆ Favorilere ekle"}
          </button>
        ) : (
          <Link className="btn-ghost" href={`/defter/${recipeId}`}>Defterimde düzenle</Link>
        )}
        {!isAuthor && copyAllowed ? (
          <button
            type="button"
            className="btn-primary"
            disabled={busy !== null}
            onClick={() =>
              run("copy", async () => {
                const copy = await unwrap(
                  api.POST("/v1/public/recipes/{recipeId}/copy", { params: { path: { recipeId } }, body: { operationId: copyOp } }),
                );
                setMessage({ kind: "ok", text: "Tarif defterinize özel kopya olarak eklendi." });
                router.push(`/defter/${copy.id}`);
              })
            }
          >
            {busy === "copy" ? "Kopyalanıyor…" : "Deftere kopyala"}
          </button>
        ) : null}
        {!isAuthor ? (
          <>
            <button
              type="button"
              className="btn-ghost"
              disabled={busy !== null}
              onClick={() =>
                run("report", async () => {
                  if (!confirm("Bu tarifi uygunsuz içerik olarak bildirmek istiyor musunuz?")) return;
                  await unwrap(api.POST("/v1/reports", { body: { operationId: newId(), targetType: "recipe", targetId: recipeId, reason: "abuse" } }));
                  setMessage({ kind: "ok", text: "Bildiriminiz alındı. Teşekkürler." });
                })
              }
            >
              Bildir
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={busy !== null}
              onClick={() =>
                run("block", async () => {
                  if (!confirm("Bu şefi engellerseniz sizinle etkileşim kuramaz. Devam edilsin mi?")) return;
                  await unwrap(api.PUT("/v1/blocks/{userId}", { params: { path: { userId: authorId } } }));
                  setMessage({ kind: "ok", text: "Kullanıcı engellendi." });
                })
              }
            >
              Engelle
            </button>
          </>
        ) : null}
      </div>
      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-danger" : "text-ok"}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
