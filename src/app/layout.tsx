import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { Providers } from "@/components/Providers";
import { t } from "@/lib/i18n";
import "./globals.css";

const body = Geist({ variable: "--font-body", subsets: ["latin", "latin-ext"] });
const heading = Bricolage_Grotesque({ variable: "--font-heading", subsets: ["latin", "latin-ext"], weight: ["600", "700", "800"] });
const code = Geist_Mono({ variable: "--font-code", subsets: ["latin", "latin-ext"], weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: `${t.appName}: ${t.tagline}`, template: `%s · ${t.appName}` },
  description: "A private recipe book for chefs, with an optional public recipe portal.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1114" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} ${code.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#content" className="sr-only-focusable btn-primary absolute left-2 top-2 z-50">
          Skip to content
        </a>
        <Providers>
          <SiteHeader />
          <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
            {children}
          </main>
        </Providers>
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span className="font-display text-base font-bold text-foreground">{t.appName}</span>
            <span>Recipes belong to their authors.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
