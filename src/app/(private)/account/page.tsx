"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorState, Loading } from "@/components/States";
import { ApiError, newId, unwrap } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/hooks";
import { problemMessage, t } from "@/lib/i18n";

export default function AccountPage() {
  const { api, reauthenticate, signOut } = useAuth();
  const me = useAsync(async () => unwrap(api.GET("/v1/me")), [api]);
  const [name, setName] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [exportOp] = useState(() => newId());
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  if (me.state.status === "loading") return <Loading />;
  if (me.state.status === "error") return <ErrorState error={me.state.error} onRetry={me.reload} />;
  const p = me.state.data;
  const fail = (e: unknown) => setMsg({ ok: false, text: problemMessage(e instanceof ApiError ? e.code : undefined) });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">{t.nav.account}</h1>
      {msg ? <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-ok" : "text-danger"}>{msg.text}</p> : null}
      {p.status === "restricted" ? <p className="card border-danger">Your account is restricted from public interaction.</p> : null}

      <form className="card flex flex-col gap-3" onSubmit={async (e) => {
        e.preventDefault();
        try {
          await unwrap(api.PUT("/v1/me", { body: { displayName: name ?? p.displayName, bio: bio ?? p.bio } }));
          setMsg({ ok: true, text: "Profile saved." });
          me.reload();
        } catch (err) { fail(err); }
      }}>
        <h2 className="text-xl font-bold">Public chef profile</h2>
        <label className="flex flex-col gap-1">Display name
          <input className="input" value={name ?? p.displayName} maxLength={60} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1">Biyografi
          <textarea className="input min-h-24" value={bio ?? p.bio} maxLength={500} onChange={(e) => setBio(e.target.value)} />
        </label>
        <p className="text-sm text-muted">Your email address and sign-in methods are not shown on your public profile.</p>
        <div className="flex gap-2">
          <button className="btn-primary" type="submit">Save</button>
          <Link className="btn-ghost" href={`/chef/${encodeURIComponent(p.id)}`}>View public profile</Link>
        </div>
      </form>

      <section className="card flex flex-col gap-2">
        <h2 className="text-xl font-bold">Sign-in methods</h2>
        <p>Linked: {p.providers.map((x) => (x === "google.com" ? "Google" : x === "apple.com" ? "Apple" : x)).join(", ")}</p>
        <p className="text-sm text-muted">
          Users who sign in with Apple on iOS use Account → Link Google account in the iOS app to reach the same
          recipe book from the web and Android. Accounts are never merged automatically by matching email.
        </p>
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="text-xl font-bold">Export my data</h2>
        <p className="text-sm">Your recipes (including private notes), collections and comments are prepared as a JSON file. The link is short-lived.</p>
        <button type="button" className="btn-ghost self-start" onClick={async () => {
          try {
            let job = await unwrap(api.POST("/v1/me/export", { body: { operationId: exportOp } }));
            for (let i = 0; i < 20 && job.status !== "completed" && job.status !== "failed"; i++) {
              setMsg({ ok: true, text: "Preparing the export…" });
              await new Promise((r) => setTimeout(r, 1500 + i * 500));
              job = await unwrap(api.GET("/v1/me/export/{jobId}", { params: { path: { jobId: job.id } } }));
            }
            if (job.downloadUrl) { setExportUrl(job.downloadUrl); setMsg({ ok: true, text: "The file is ready." }); }
            else setMsg({ ok: false, text: "The export is not ready yet; please try again later." });
          } catch (err) { fail(err); }
        }}>Start export</button>
        {exportUrl ? <a className="btn-primary self-start" href={exportUrl} rel="noopener">Download file</a> : null}
      </section>

      <section className="card flex flex-col gap-2 border-danger">
        <h2 className="text-xl font-bold text-danger">Delete account</h2>
        <p className="text-sm">
          Once deletion starts, your publications close immediately, your sessions end and all your data is permanently deleted.
          Recipes others copied with your permission stay with them; your name will show as &quot;Deleted user&quot;.
        </p>
        <button type="button" className="btn-danger self-start" onClick={async () => {
          if (!confirm("Your account and all your recipes will be permanently deleted. Are you sure?")) return;
          try {
            await reauthenticate(); // a recent sign-in is required
            await unwrap(api.POST("/v1/me/deletion", { body: { operationId: newId() } }));
            setMsg({ ok: true, text: "Account deletion started." });
            await signOut();
          } catch (err) { fail(err); }
        }}>Delete my account</button>
      </section>
      {p.isModerator ? <Link className="btn-ghost self-start" href="/moderation">{t.nav.moderation}</Link> : null}
    </div>
  );
}
