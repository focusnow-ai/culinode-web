import type { Metadata } from "next";
import { RequireAuth } from "@/components/RequireAuth";

// Özel ekranlar: indekslenmez, istemci tarafında token ile API'ye gider (SSR kullanıcı verisi yok).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
