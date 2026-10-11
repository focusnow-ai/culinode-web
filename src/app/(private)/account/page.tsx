"use client";

import Link from "next/link";
import { useState } from "react";
import type { Icon } from "@phosphor-icons/react";
import { DownloadSimple, IdentificationCard, Key, ShieldCheck, Trash } from "@phosphor-icons/react/ssr";
import { ErrorState, Loading, PageHeader } from "@/components/States";
import { ApiError, newId, unwrap } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/hooks";
import { problemMessage, t } from "@/lib/i18n";

function Section({ icon: Glyph, title, tone, children }: { icon: Icon; title: string; tone?: "danger"; children: React.ReactNode }) {
  return (
    <section className={`card flex flex-col gap-4 p-6 ${tone === "danger" ? "border-danger/40" : ""}`}>
      <h2 className={`flex items-center gap-2.5 font-display text-xl font-bold ${tone === "danger" ? "text-danger" : ""}`}>
        <Glyph size={22} className={tone === "danger" ? "" : "text-accent"} aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function AccountPage() {
  const { api, reauthenticate, signOut } = useAuth();
  const me = useAsync(async () => unwrap(api.GET("/v1/me")), [api]);
  const [name, setName] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [exportOp] = useState(() => newId());
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  if (me.state.status === "loading") return <Loading variant="form" />;
  if (me.state.status === "error") return <ErrorState error={me.state.error} onRetry={me.reload} />;
  const p = me.state.data;
  const fail = (e: unknown) => setMsg({ ok: false, text: problemMessage(e instanceof ApiError ? e.code : undefined) });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={t.nav.account}
        actions={p.isModerator ? <Link className="btn-ghost" href="/moderation"><ShieldCheck size={18} aria-hidden />{t.nav.moderation}</Link> : null}
      />
      {msg ? (
        <p role={msg.ok ? "status" : "alert"} className={`rounded-xl px-4 py-3 font-medium ${msg.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
          {msg.text}
        </p>
      ) : null}
      {p.status === "restricted" ? (
        <p className="rounded-xl bg-danger-soft px-4 py-3 font-medium text-danger">Your account is restricted from public interaction.</p>
      ) : null}

      <form
        className="contents"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await unwrap(api.PUT("/v1/me", { body: { displayName: name ?? p.displayName, bio: bio ?? p.bio } }));
            setMsg({ ok: true, text: "Profile saved." });
            me.reload();
          } catch (err) { fail(err); }
        }}
      >
        <Section icon={IdentificationCard} title="Public chef profile">
          <label className="flex flex-col gap-2">
            <span className="field-label">Display name</span>
            <input className="input" value={name ?? p.displayName} maxLength={60} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-2">
            <span className="field-label">Bio</span>
            <textarea className="input min-h-28" value={bio ?? p.bio} maxLength={500} onChange={(e) => setBio(e.target.value)} />
          </label>
          <p className="text-sm text-muted">Your email address and sign-in methods are not shown on your public profile.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" type="submit">Save</button>
            <Link className="btn-quiet" href={`/chef/${encodeURIComponent(p.id)}`}>View public profile</Link>
          </div>
        </Section>
      </form>

      <Section icon={Key} title="Sign-in methods">
        <ul className="flex flex-wrap gap-2">
          {p.providers.map((x) => (
            <li key={x} className="rounded-full bg-sunken px-3.5 py-1.5 text-sm font-semibold">
              {x === "google.com" ? "Google" : x === "apple.com" ? "Apple" : x}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          Users who sign in with Apple on iOS use Account, then Link Google account, in the iOS app to reach the same
          recipe book from the web and Android. Accounts are never merged automatically by matching email.
        </p>
      </Section>

      <Section icon={DownloadSimple} title="Export my data">
        <p className="text-muted">Your recipes (including private notes), collections and comments are prepared as a JSON file. The link is short-lived.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={async () => {
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
          {exportUrl ? <a className="btn-primary" href={exportUrl} rel="noopener"><DownloadSimple size={18} aria-hidden />Download file</a> : null}
        </div>
      </Section>

      <Section icon={Trash} title="Delete account" tone="danger">
        <p className="text-muted">
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
      </Section>
    </div>
  );
}
