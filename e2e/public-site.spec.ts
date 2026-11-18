import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("landing page explains the product and leads to sign-up", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/OmniDesk AI/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every answer leaves with its source");
    const signUp = page.getByRole("link", { name: /create an account|open your own desk/i }).first();
    await expect(signUp).toHaveAttribute("href", /\/auth\?mode=sign-up/);
  });

  test("footer links to privacy and terms work", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("navigation", { name: "Footer" });
    await footer.getByRole("link", { name: "Privacy" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
    await page.goto("/terms");
    await expect(page.getByRole("heading", { level: 1, name: "Terms of use" })).toBeVisible();
  });

  test("no page scrolls sideways", async ({ page }) => {
    for (const path of ["/", "/auth", "/privacy", "/terms"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(1);
    }
  });

  test("unknown pages show the custom 404", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("No train runs to this platform");
  });
});

test.describe("accounts", () => {
  test("sign-in form has labelled fields and a password reset path", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveCount(0);
  });

  test("an expired email link explains what happened", async ({ page }) => {
    await page.goto("/auth?reason=link-invalid");
    await expect(page.getByText(/invalid, expired, or already used/)).toBeVisible();
  });

  test("the dashboard requires signing in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\?reason=session-expired/);
  });

  test("invitation links that do not exist are handled", async ({ page }) => {
    await page.goto("/invite/not-a-real-invitation-token-123");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Invitation not found");
  });
});

test.describe("search engines and security", () => {
  test("robots.txt keeps private pages out of search, and the sitemap lists public ones", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /dashboard");
    expect(robots).toContain("Sitemap:");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/privacy");
  });

  test("pages have a social preview image and security headers", async ({ request }) => {
    expect((await request.get("/opengraph-image")).headers()["content-type"]).toBe("image/png");
    const headers = (await request.get("/")).headers();
    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toBe("frame-ancestors 'self'");
  });

  test("the chat API rejects requests without a bot check token when Turnstile is on", async ({ request }) => {
    const response = await request.post("/api/chat", {
      data: { organizationId: "00000000-0000-4000-8000-000000000000", name: "e2e", message: "smoke test" },
    });
    // 403 with Turnstile configured; 4xx/5xx otherwise. Never a 2xx, since the organization does not exist.
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
