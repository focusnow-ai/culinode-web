import type { Metadata } from "next";
import { Suspense } from "react";
import { SignIn } from "@/components/SignIn";

export const metadata: Metadata = { title: "Giriş", robots: { index: false } };

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
