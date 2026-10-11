import type { Metadata } from "next";
import { RequireAuth } from "@/components/RequireAuth";

// Private screens: not indexed, call the API from the client with a token (no user data in SSR).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
