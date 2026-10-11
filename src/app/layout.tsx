import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { Providers } from "@/components/Providers";
import { t } from "@/lib/i18n";
import "./globals.css";

const body = Atkinson_Hyperlegible({ variable: "--font-body", subsets: ["latin", "latin-ext"], weight: ["400", "700"] });
const display = Fraunces({ variable: "--font-display", subsets: ["latin", "latin-ext"], weight: ["600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: `${t.appName} — ${t.tagline}`, template: `%s · ${t.appName}` },
  description: "A private recipe book for chefs, with an optional public recipe portal.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffdf8" },
    { media: "(prefers-color-scheme: dark)", color: "#15130f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#content" className="sr-only-focusable btn-primary absolute left-2 top-2 z-50">
          Skip to content
        </a>
        <Providers>
          <SiteHeader />
          <main id="content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
            {children}
          </main>
        </Providers>
        <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted">
          {t.appName} · Recipes belong to their authors.
        </footer>
      </body>
    </html>
  );
}
