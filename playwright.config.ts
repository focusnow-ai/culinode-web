import { defineConfig, devices } from "@playwright/test";

// Local end-to-end tests: need a running API (func :7071), Auth Emulator (:9099) and web (:3000).
// See docs/LOCAL_DEVELOPMENT.md. These tests produce [emulator] results.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "tr-TR",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
