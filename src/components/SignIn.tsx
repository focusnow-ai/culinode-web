"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

/** Google sign-in on the web (Apple sign-in lives in the iOS app; Apple users can link Google from iOS). */
export function SignIn() {
  const { user, ready, signInWithGoogle, signInWithEmulator } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [emuEmail, setEmuEmail] = useState("chef@example.com");

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
          ? "The sign-in window was closed."
          : code === "auth/network-request-failed"
            ? "The first sign-in needs an internet connection."
            : "Could not sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Sign in</h1>
      <p>Sign in with your Google account to see your recipes on all your devices.</p>
      <button type="button" className="btn-primary" disabled={busy} onClick={() => run(signInWithGoogle)}>
        Continue with Google
      </button>
      <p className="text-sm text-muted">
        If you signed in with Apple on your iPhone, first complete Account → Link Google account in the iOS app
        to reach the same recipe book on the web.
      </p>
      {signInWithEmulator ? (
        <form
          className="card flex flex-col gap-2 border-dashed"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => signInWithEmulator(emuEmail, emuEmail.split("@")[0]));
          }}
        >
          <p className="text-sm font-semibold">Local development: Auth Emulator test sign-in</p>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input className="input" value={emuEmail} onChange={(e) => setEmuEmail(e.target.value)} />
          </label>
          <button type="submit" className="btn-ghost" disabled={busy}>Sign in with emulator</button>
        </form>
      ) : null}
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
    </div>
  );
}

function safeNext(v: string | null): string {
  if (!v || !v.startsWith("/") || v.startsWith("//")) return "/notebook";
  return v;
}
