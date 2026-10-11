"use client";

import Link from "next/link";
import { useState } from "react";
import { ChatCircle, Flag } from "@phosphor-icons/react/ssr";
import { ApiError, newId, unwrap, type Discussion } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { formatDate, problemMessage } from "@/lib/i18n";

type Props = { recipeId: string; authorId: string; initial: Discussion[]; initialContinuation: string | null };

/** Comments / questions and single-level replies. Posting is online; nothing is shown as added before the server confirms it. */
export function DiscussionThread({ recipeId, authorId, initial, initialContinuation }: Props) {
  const { user, api } = useAuth();
  const [items, setItems] = useState<Discussion[]>(initial);
  const [continuation, setContinuation] = useState(initialContinuation);
  const topLevel = items.filter((d) => !d.parentId);
  const replies = (id: string) => items.filter((d) => d.parentId === id);

  async function loadMore() {
    const page = await unwrap(
      api.GET("/v1/recipes/{recipeId}/discussions", { params: { path: { recipeId }, query: { continuation: continuation ?? undefined } } }),
    );
    setItems((prev) => [...prev, ...page.items.filter((x) => !prev.some((p) => p.id === x.id))]);
    setContinuation(page.continuation ?? null);
  }

  return (
    <section aria-labelledby="discussion" className="flex max-w-3xl flex-col gap-6">
      <h2 id="discussion" className="section-title">Comments and questions</h2>
      {topLevel.length === 0 ? (
        <p className="flex items-center gap-2 text-muted">
          <ChatCircle size={20} aria-hidden />
          No comments yet.
        </p>
      ) : null}
      <ul className="flex flex-col gap-4">
        {topLevel.map((d) => (
          <li key={d.id} className="card">
            <Entry d={d} recipeId={recipeId} />
            {replies(d.id).length > 0 ? (
              <ul className="ml-1 mt-4 flex flex-col gap-4 border-l-2 border-accent-soft pl-5">
                {replies(d.id).map((r) => (
                  <li key={r.id}><Entry d={r} recipeId={recipeId} /></li>
                ))}
              </ul>
            ) : null}
            {user && !d.removed ? (
              <Composer
                recipeId={recipeId}
                parentId={d.id}
                compact
                onCreated={(c) => setItems((prev) => [...prev, c])}
                apiCall={api}
              />
            ) : null}
          </li>
        ))}
      </ul>
      {continuation ? <button type="button" className="btn-ghost self-start" onClick={loadMore}>Load more</button> : null}
      {user ? (
        <div className="card">
          <Composer recipeId={recipeId} onCreated={(c) => setItems((prev) => [...prev, c])} apiCall={api} isOwner={user.uid === authorId} />
        </div>
      ) : (
        <p className="text-muted">
          <Link className="font-semibold text-accent-ink underline underline-offset-4" href={`/sign-in?next=/recipe/${recipeId}`}>Sign in</Link> to comment.
        </p>
      )}
    </section>
  );
}

function Entry({ d, recipeId }: { d: Discussion; recipeId: string }) {
  const { user, api } = useAuth();
  const [reported, setReported] = useState(false);
  if (d.removed) return <p className="italic text-muted">This entry was removed.</p>;
  return (
    <div className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken font-display font-bold text-muted" aria-hidden>
        {d.author.displayName.trim().charAt(0).toUpperCase() || "?"}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <strong className="font-semibold text-foreground">{d.author.displayName}</strong>
          {d.isRecipeOwner ? <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-contrast">Recipe owner</span> : null}
          {d.kind === "question" ? <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold">Question</span> : null}
          <span>{formatDate(d.createdAt)}</span>
        </p>
        <p className="whitespace-pre-line break-words">{d.body}</p>
        {user && user.uid !== d.author.id && !reported ? (
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-1 self-start text-sm text-muted hover:text-foreground"
            onClick={async () => {
              await unwrap(api.POST("/v1/reports", { body: { operationId: newId(), targetType: "discussion", targetId: d.id, recipeId, reason: "abuse" } }));
              setReported(true);
            }}
          >
            <Flag size={14} aria-hidden />
            Report
          </button>
        ) : null}
        {reported ? <span className="text-sm text-ok" role="status">Reported</span> : null}
      </div>
    </div>
  );
}

function Composer({
  recipeId, parentId, compact, isOwner, onCreated, apiCall,
}: {
  recipeId: string; parentId?: string; compact?: boolean; isOwner?: boolean;
  onCreated: (d: Discussion) => void; apiCall: ReturnType<typeof useAuth>["api"];
}) {
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"comment" | "question">("comment");
  const [op, setOp] = useState(() => newId());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!compact);

  if (!open)
    return (
      <button type="button" className="btn-quiet mt-3 min-h-9 px-3 text-sm" onClick={() => setOpen(true)}>
        Reply
      </button>
    );

  return (
    <form
      className={`flex flex-col gap-3 ${compact ? "mt-4" : ""}`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setBusy(true);
        setError(null);
        try {
          const created = await unwrap(
            apiCall.POST("/v1/recipes/{recipeId}/discussions", {
              params: { path: { recipeId } },
              body: { operationId: op, kind: parentId ? "reply" : kind, parentId: parentId ?? null, body },
            }),
          );
          onCreated(created);
          setBody("");
          setOp(newId());
          if (compact) setOpen(false);
        } catch (err) {
          // The text is kept; it can be retried with the same operationId.
          setError(problemMessage(err instanceof ApiError ? err.code : undefined));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="flex flex-col gap-2">
        <span className="field-label">{parentId ? "Your reply" : isOwner ? "Add a note" : "Your comment or question"}</span>
        <textarea className="input min-h-24" value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} required />
      </label>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Sending…" : "Send"}</button>
        {!parentId ? (
          <fieldset className="flex gap-4">
            <legend className="sr-only">Type</legend>
            <label className="flex min-h-11 items-center gap-2"><input type="radio" checked={kind === "comment"} onChange={() => setKind("comment")} /> Comment</label>
            <label className="flex min-h-11 items-center gap-2"><input type="radio" checked={kind === "question"} onChange={() => setKind("question")} /> Question</label>
          </fieldset>
        ) : null}
      </div>
    </form>
  );
}
