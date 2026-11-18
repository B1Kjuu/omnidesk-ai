import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke tests of the public site. They never create data, so they are safe to run against production:
 *   BASE_URL=https://omnidesk-ai-one.vercel.app npm run test:e2e
 * Without BASE_URL they start the production build locally (run `npm run build` first; needs .env.local).
 * E2E_DESK_HANDLE (an existing organization's chat handle) enables the chat-page and widget tests.
 */
const baseURL = process.env.BASE_URL ?? "http://localhost:3130";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    // Local runs only: the widget test embeds a localhost app into a 127.0.0.1 "shop", which Chromium's Local
    // Network Access check would block behind a permission prompt. Real sites load the widget from a public domain.
    launchOptions: baseURL.includes("localhost") ? { args: ["--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests"] } : {},
    // Locally, use the installed Edge so no browser download is needed; CI installs Chromium.
    ...(process.env.CI ? {} : { channel: "msedge" }),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...(process.env.CI ? {} : { channel: "msedge" }) } },
    { name: "mobile", use: { ...devices["Pixel 7"], ...(process.env.CI ? {} : { channel: "msedge" }) } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npx next start -p 3130", url: "http://localhost:3130/privacy", reuseExistingServer: true, timeout: 60_000 },
});
