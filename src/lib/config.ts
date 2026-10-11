// Ortam yapılandırması. Eksik değer anlaşılır hata verir (sessiz varsayılan yok).

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Eksik yapılandırma: ${name}. apps/web/.env.example dosyasını .env.local olarak kopyalayıp doldurun.`,
    );
  }
  return value.replace(/\/+$/, "");
}

// NEXT_PUBLIC_* değerleri derleme zamanında gömülür; bu yüzden doğrudan referans verilir.
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
  /** Yalnız yerel geliştirme. Production derlemesinde tanımlıysa reddedilir. */
  get authEmulatorUrl(): string | null {
    const v = process.env.NEXT_PUBLIC_AUTH_EMULATOR_URL;
    if (!v) return null;
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ALLOW_EMULATOR !== "true") {
      throw new Error("NEXT_PUBLIC_AUTH_EMULATOR_URL production derlemesinde kullanılamaz.");
    }
    return v;
  },
};
