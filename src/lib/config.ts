// Environment configuration. A missing value raises a clear error (no silent defaults).

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing configuration: ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value.replace(/\/+$/, "");
}

// NEXT_PUBLIC_* values are inlined at build time, so they are referenced directly.
export const config = {
  get apiBaseUrl() {
    return required("NEXT_PUBLIC_API_BASE_URL", process.env.NEXT_PUBLIC_API_BASE_URL);
  },
  get siteUrl() {
    return required("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL);
  },
  get firebase() {
    return {
      apiKey: required("NEXT_PUBLIC_FIREBASE_API_KEY", process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      authDomain: required("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
      projectId: required("NEXT_PUBLIC_FIREBASE_PROJECT_ID", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      appId: required("NEXT_PUBLIC_FIREBASE_APP_ID", process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    };
  },
  /** Local development only. Rejected if set in a production build. */
  get authEmulatorUrl(): string | null {
    const v = process.env.NEXT_PUBLIC_AUTH_EMULATOR_URL;
    if (!v) return null;
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ALLOW_EMULATOR !== "true") {
      throw new Error("NEXT_PUBLIC_AUTH_EMULATOR_URL cannot be used in a production build.");
    }
    return v;
  },
};
