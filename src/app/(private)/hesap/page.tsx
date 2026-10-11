"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorState, Loading } from "@/components/States";
import { ApiError, newId, unwrap } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/hooks";
import { problemMessage, tr } from "@/lib/i18n";

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
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">{tr.nav.account}</h1>
      {msg ? <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-ok" : "text-danger"}>{msg.text}</p> : null}
      {p.status === "restricted" ? <p className="card border-danger">Hesabınız public etkileşim için kısıtlandı.</p> : null}

      <form className="card flex flex-col gap-3" onSubmit={async (e) => {
        e.preventDefault();
        try {
          await unwrap(api.PUT("/v1/me", { body: { displayName: name ?? p.displayName, bio: bio ?? p.bio } }));
          setMsg({ ok: true, text: "Profil kaydedildi." });
          me.reload();
        } catch (err) { fail(err); }
      }}>
        <h2 className="text-xl font-bold">Public şef profili</h2>
        <label className="flex flex-col gap-1">Görünen ad
          <input className="input" value={name ?? p.displayName} maxLength={60} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1">Biyografi
          <textarea className="input min-h-24" value={bio ?? p.bio} maxLength={500} onChange={(e) => setBio(e.target.value)} />
        </label>
        <p className="text-sm text-muted">E-posta adresiniz ve giriş yöntemleriniz public profilde görünmez.</p>
        <div className="flex gap-2">
          <button className="btn-primary" type="submit">Kaydet</button>
          <Link className="btn-ghost" href={`/sef/${encodeURIComponent(p.id)}`}>Public profili gör</Link>
        </div>
      </form>

      <section className="card flex flex-col gap-2">
        <h2 className="text-xl font-bold">Giriş yöntemleri</h2>
        <p>Bağlı: {p.providers.map((x) => (x === "google.com" ? "Google" : x === "apple.com" ? "Apple" : x)).join(", ")}</p>
        <p className="text-sm text-muted">
          Apple ile iOS&apos;tan giriş yapan kullanıcılar, aynı deftere web ve Android&apos;den erişmek için iOS uygulamasında
          Hesap → Google hesabını bağla adımını kullanır. Hesaplar e-posta eşleşmesiyle otomatik birleştirilmez.
        </p>
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="text-xl font-bold">Verilerimi dışa aktar</h2>
        <p className="text-sm">Tarifleriniz (özel notlar dahil), koleksiyonlarınız ve yorumlarınız JSON dosyası olarak hazırlanır. Bağlantı kısa sürelidir.</p>
        <button type="button" className="btn-ghost self-start" onClick={async () => {
          try {
            let job = await unwrap(api.POST("/v1/me/export", { body: { operationId: exportOp } }));
            for (let i = 0; i < 20 && job.status !== "completed" && job.status !== "failed"; i++) {
              setMsg({ ok: true, text: "Dışa aktarma hazırlanıyor…" });
              await new Promise((r) => setTimeout(r, 1500 + i * 500));
              job = await unwrap(api.GET("/v1/me/export/{jobId}", { params: { path: { jobId: job.id } } }));
            }
            if (job.downloadUrl) { setExportUrl(job.downloadUrl); setMsg({ ok: true, text: "Dosya hazır." }); }
            else setMsg({ ok: false, text: "Dışa aktarma henüz hazır değil; daha sonra tekrar deneyin." });
          } catch (err) { fail(err); }
        }}>Dışa aktarmayı başlat</button>
        {exportUrl ? <a className="btn-primary self-start" href={exportUrl} rel="noopener">Dosyayı indir</a> : null}
      </section>

      <section className="card flex flex-col gap-2 border-danger">
        <h2 className="text-xl font-bold text-danger">Hesabı sil</h2>
        <p className="text-sm">
          Silme başlayınca yayınlarınız hemen kapanır, oturumlarınız sonlanır ve tüm verileriniz kalıcı olarak silinir.
          Daha önce izin verip başkalarının deftere kopyaladığı tarifler onlarda kalır; adınız &quot;Silinmiş kullanıcı&quot; olarak görünür.
        </p>
        <button type="button" className="btn-danger self-start" onClick={async () => {
          if (!confirm("Hesabınız ve tüm tarifleriniz kalıcı olarak silinecek. Emin misiniz?")) return;
          try {
            await reauthenticate(); // yakın tarihli giriş zorunlu
            await unwrap(api.POST("/v1/me/deletion", { body: { operationId: newId() } }));
            setMsg({ ok: true, text: "Hesap silme başlatıldı." });
            await signOut();
          } catch (err) { fail(err); }
        }}>Hesabımı sil</button>
      </section>
      {p.isModerator ? <Link className="btn-ghost self-start" href="/moderasyon">{tr.nav.moderation}</Link> : null}
    </div>
  );
}
