"use client";

import Link from "next/link";
import { useState } from "react";
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
    <section aria-labelledby="tartisma" className="flex flex-col gap-4">
      <h2 id="discussion" className="text-2xl font-bold">Comments and questions</h2>
      {topLevel.length === 0 ? <p className="text-muted">No comments yet.</p> : null}
      <ul className="flex flex-col gap-3">
        {topLevel.map((d) => (
          <li key={d.id} className="card">
            <Entry d={d} recipeId={recipeId} />
            <ul className="ml-4 mt-3 flex flex-col gap-2 border-l-2 border-border pl-4">
              {replies(d.id).map((r) => (
                <li key={r.id}><Entry d={r} recipeId={recipeId} /></li>
              ))}
            </ul>
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
        <Composer recipeId={recipeId} onCreated={(c) => setItems((prev) => [...prev, c])} apiCall={api} isOwner={user.uid === authorId} />
      ) : (
        <p className="text-sm">
          <Link className="underline" href={`/sign-in?next=/recipe/${recipeId}`}>Sign in</Link> to comment.
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
    <div>
      <p className="text-sm text-muted">
        <strong className="text-foreground">{d.author.displayName}</strong>
        {d.isRecipeOwner ? <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs text-accent-contrast">Recipe owner</span> : null}
        {d.kind === "question" ? <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-xs">Question</span> : null}
        {" · "}{formatDate(d.createdAt)}
      </p>
      <p className="whitespace-pre-line">{d.body}</p>
      {user && user.uid !== d.author.id && !reported ? (
        <button
          type="button"
          className="text-sm text-muted underline"
          onClick={async () => {
            await unwrap(api.POST("/v1/reports", { body: { operationId: newId(), targetType: "discussion", targetId: d.id, recipeId, reason: "abuse" } }));
            setReported(true);
          }}
        >
          Report
        </button>
      ) : null}
      {reported ? <span className="text-sm text-ok" role="status">Reported</span> : null}
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
    return <button type="button" className="mt-2 text-sm underline" onClick={() => setOpen(true)}>Reply</button>;

  return (
    <form
      className="mt-3 flex flex-col gap-2"
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
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{parentId ? "Your reply" : isOwner ? "Add a note" : "Your comment or question"}</span>
        <textarea className="input min-h-24" value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} required />
      </label>
      {!parentId ? (
        <fieldset className="flex gap-4">
          <legend className="sr-only">Type</legend>
          <label className="flex items-center gap-2"><input type="radio" checked={kind === "comment"} onChange={() => setKind("comment")} /> Comment</label>
          <label className="flex items-center gap-2"><input type="radio" checked={kind === "question"} onChange={() => setKind("question")} /> Question</label>
        </fieldset>
      ) : null}
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
      <button type="submit" className="btn-primary self-start" disabled={busy}>{busy ? "Sending…" : "Send"}</button>
    </form>
  );
}
