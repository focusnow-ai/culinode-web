import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "src/test/empty.ts") } },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"], exclude: ["e2e/**", "node_modules/**"], env: { NEXT_PUBLIC_API_BASE_URL: "http://api.test", NEXT_PUBLIC_SITE_URL: "http://site.test" } },
});
