"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

/** Web'de Google ile giriş (Apple girişi iOS uygulamasındadır; Apple kullanıcıları iOS'tan Google bağlayabilir). */
export function SignIn() {
  const { user, ready, signInWithGoogle, signInWithEmulator } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [emuEmail, setEmuEmail] = useState("sef@example.com");

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setError(
        code === "auth/popup-closed-by-user"
          ? "Giriş penceresi kapatıldı."
          : code === "auth/network-request-failed"
            ? "İlk giriş için internet bağlantısı gerekir."
            : "Giriş yapılamadı. Lütfen tekrar deneyin.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Giriş yap</h1>
      <p>Tariflerinizi tüm cihazlarınızda görmek için Google hesabınızla giriş yapın.</p>
      <button type="button" className="btn-primary" disabled={busy} onClick={() => run(signInWithGoogle)}>
        Google ile devam et
      </button>
      <p className="text-sm text-muted">
        iPhone&apos;da Apple ile giriş yaptıysanız, aynı deftere webden erişmek için önce iOS uygulamasında
        Hesap → Google hesabını bağla adımını tamamlayın.
      </p>
      {signInWithEmulator ? (
        <form
          className="card flex flex-col gap-2 border-dashed"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => signInWithEmulator(emuEmail, emuEmail.split("@")[0]));
          }}
        >
          <p className="text-sm font-semibold">Yerel geliştirme: Auth Emulator test girişi</p>
          <label className="flex flex-col gap-1 text-sm">
            E-posta
            <input className="input" value={emuEmail} onChange={(e) => setEmuEmail(e.target.value)} />
          </label>
          <button type="submit" className="btn-ghost" disabled={busy}>Emulator ile giriş</button>
        </form>
      ) : null}
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
    </div>
  );
}

function safeNext(v: string | null): string {
  if (!v || !v.startsWith("/") || v.startsWith("//")) return "/defter";
  return v;
}
