"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, newId, unwrap } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { problemMessage } from "@/lib/i18n";

/** Favorite, copy to recipe book, report and block for signed-in readers. All online. */
export function PublicRecipeActions({ recipeId, authorId, copyAllowed }: { recipeId: string; authorId: string; copyAllowed: boolean }) {
  const { user, ready, api } = useAuth();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  // The copy request id stays stable across retries (idempotent).
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
        To add favorites, copy to your recipe book and ask questions,{" "}
        <Link className="font-semibold underline" href={`/sign-in?next=/recipe/${recipeId}`}>sign in</Link>.
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
            {isFavorite ? "★ In favorites" : "☆ Add to favorites"}
          </button>
        ) : (
          <Link className="btn-ghost" href={`/notebook/${recipeId}`}>Edit in my recipes</Link>
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
                setMessage({ kind: "ok", text: "Added to your recipe book as a private copy." });
                router.push(`/notebook/${copy.id}`);
              })
            }
          >
            {busy === "copy" ? "Copying…" : "Copy to my recipes"}
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
                  if (!confirm("Report this recipe as inappropriate?")) return;
                  await unwrap(api.POST("/v1/reports", { body: { operationId: newId(), targetType: "recipe", targetId: recipeId, reason: "abuse" } }));
                  setMessage({ kind: "ok", text: "Thanks, your report was received." });
                })
              }
            >
              Report
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={busy !== null}
              onClick={() =>
                run("block", async () => {
                  if (!confirm("If you block this chef, they can no longer interact with you. Continue?")) return;
                  await unwrap(api.PUT("/v1/blocks/{userId}", { params: { path: { userId: authorId } } }));
                  setMessage({ kind: "ok", text: "User blocked." });
                })
              }
            >
              Block
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
