"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithCredential,
  signInWithPopup,
  signOut as fbSignOut,
  reauthenticateWithPopup,
  type Auth,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { browserClient, type BrowserClient } from "./api/client";
import { config } from "./config";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function firebaseAuth(): Auth {
  if (auth) return auth;
  app = getApps()[0] ?? initializeApp(config.firebase);
  auth = getAuth(app);
  const emulator = config.authEmulatorUrl;
  if (emulator) connectAuthEmulator(auth, emulator, { disableWarnings: true });
  return auth;
}

type AuthState = {
  user: User | null;
  ready: boolean;
  api: BrowserClient;
  signInWithGoogle: () => Promise<void>;
  /** Auth Emulator mode only: sign in with a test account. */
  signInWithEmulator?: (email: string, name: string) => Promise<void>;
  reauthenticate: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const a = firebaseAuth();
    return onIdTokenChanged(a, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const value = useMemo<AuthState>(() => {
    const api = browserClient(async () => {
      const u = firebaseAuth().currentUser;
      return u ? u.getIdToken() : null;
    });
    const emulator = config.authEmulatorUrl;
    return {
      user,
      ready,
      api,
      async signInWithGoogle() {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(firebaseAuth(), provider);
      },
      signInWithEmulator: emulator
        ? async (email: string, name: string) => {
            // The emulator accepts a fake Google identity; this is not real provider verification.
            const fake = JSON.stringify({ sub: `emu-${email}`, email, name, email_verified: true });
            await signInWithCredential(firebaseAuth(), GoogleAuthProvider.credential(fake));
          }
        : undefined,
      async reauthenticate() {
        const u = firebaseAuth().currentUser;
        if (!u) throw new Error("Not signed in");
        if (emulator) {
          // Emulator: signing in again with the same fake identity refreshes auth_time.
          const fake = JSON.stringify({ sub: `emu-${u.email}`, email: u.email, name: u.displayName, email_verified: true });
          await signInWithCredential(firebaseAuth(), GoogleAuthProvider.credential(fake));
          return;
        }
        await reauthenticateWithPopup(u, new GoogleAuthProvider());
      },
      async signOut() {
        await fbSignOut(firebaseAuth());
      },
    };
  }, [user, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth was used outside AuthProvider");
  return v;
}
