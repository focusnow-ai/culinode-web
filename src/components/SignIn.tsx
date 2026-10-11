"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CloudCheck, GoogleLogo, Lock, WifiSlash } from "@phosphor-icons/react/ssr";
import { useAuth } from "@/lib/auth";

const points = [
  { icon: Lock, text: "Your recipe book is private. Nothing is public until you publish it." },
  { icon: CloudCheck, text: "The same recipes on the web, iPhone and Android." },
  { icon: WifiSlash, text: "The mobile app keeps working in a kitchen with no signal." },
];

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
    <div className="grid items-center gap-10 py-4 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-10">
      <div className="flex flex-col gap-6">
        <h1 className="max-w-[14ch] font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Sign in</h1>
        <p className="max-w-[44ch] text-lg text-muted">Sign in with your Google account to see your recipes on all your devices.</p>
        <ul className="flex flex-col gap-4">
          {points.map(({ icon: Glyph, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                <Glyph size={20} aria-hidden />
              </span>
              <span className="pt-1.5">{text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card flex flex-col gap-5 p-6 sm:p-8">
        <button type="button" className="btn-primary min-h-13 w-full text-base" disabled={busy} onClick={() => run(signInWithGoogle)}>
          <GoogleLogo size={20} weight="bold" aria-hidden />
          Continue with Google
        </button>
        <p className="text-sm text-muted">
          If you signed in with Apple on your iPhone, first open Account and choose Link Google account in the iOS app
          to reach the same recipe book on the web.
        </p>
        {error ? <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p> : null}
        {signInWithEmulator ? (
          <form
            className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => signInWithEmulator(emuEmail, emuEmail.split("@")[0]));
            }}
          >
            <p className="text-sm font-semibold">Local development: Auth Emulator test sign-in</p>
            <label className="flex flex-col gap-2">
              <span className="field-label">Email</span>
              <input className="input" value={emuEmail} onChange={(e) => setEmuEmail(e.target.value)} />
            </label>
            <button type="submit" className="btn-ghost" disabled={busy}>Sign in with emulator</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function safeNext(v: string | null): string {
  if (!v || !v.startsWith("/") || v.startsWith("//")) return "/notebook";
  return v;
}
