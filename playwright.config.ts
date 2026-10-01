import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Tests read SUPABASE_URL etc. directly; load .env.local like `next` does (CI sets them explicitly).
loadEnvConfig(process.cwd());

const PORT = Number(process.env.PORT ?? 3100);
const CDN_PORT = 8787;
process.env.YEARBOOK_SIGNING_SECRET ??= "local-yearbook-signing-secret-0123456789";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /screenshots\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "screenshots",
      testMatch: /screenshots\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./tests/global-setup.ts",
  webServer: [
    {
      // Stand-in for the yearbook image Worker: same signature check, local files
      // (the grey test pages, plus real scans when ingested locally).
      command: `node scripts/yearbook-cdn-dev.mts tests/fixtures/yearbook-assets,.yearbook-build/assets ${CDN_PORT}`,
      url: `http://localhost:${CDN_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `npm run start -- -p ${PORT}`,
      url: `http://localhost:${PORT}/robots.txt`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        YEARBOOK_CDN_URL: `http://localhost:${CDN_PORT}`,
        YEARBOOK_SIGNING_SECRET: process.env.YEARBOOK_SIGNING_SECRET ?? "local-yearbook-signing-secret-0123456789",
        // Never send real email from tests: without a key, preview logs to email_log.
        RESEND_API_KEY: "",
      },
    },
  ],
});
