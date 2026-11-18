import { expect, test } from "@playwright/test";

const handle = process.env.E2E_DESK_HANDLE;

test.describe("customer chat and website widget", () => {
  test.skip(!handle, "Set E2E_DESK_HANDLE to an existing organization's chat handle to run these.");

  test("the public chat page is ready for a question", async ({ page }) => {
    await page.goto(`/chat/${handle}`);
    await expect(page.getByLabel("Your name")).toBeVisible();
    await expect(page.getByLabel("Your question")).toBeVisible();
    await expect(page).toHaveTitle(/help desk/);
  });

  test("one script tag adds a chat button that opens the desk on another website", async ({ page, baseURL }) => {
    // A stand-in for a business's website on its own origin (setContent's about:blank has an opaque origin, which
    // browsers refuse to let frame anything), with hostile styles the widget must survive.
    // Locally the shop must also be a local address (browsers block public pages from loading localhost scripts);
    // 127.0.0.1 is still a different origin from localhost, so this remains a real cross-site embed.
    const app = new URL(baseURL!);
    const shop = app.hostname === "localhost" ? `http://127.0.0.1:${app.port}/__test-shop` : "http://shop.test/";
    await page.route(shop, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><html><head><style>button{background:hotpink!important}</style></head>
          <body><h1>Some shop</h1><script src="${baseURL}/widget.js" data-desk="${handle}" data-color="#0f62fe" data-label="Ask us" async></script></body></html>`,
      }),
    );
    await page.goto(shop);

    const launcher = page.locator("[data-omnidesk-widget]").locator("button");
    await expect(launcher).toHaveText("Ask us");
    // Shadow DOM isolation: the host page's !important button colour does not reach the launcher.
    expect(await launcher.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(15, 98, 254)");

    await launcher.click();
    await expect(launcher).toHaveAttribute("aria-expanded", "true");
    const chat = page.frameLocator("[data-omnidesk-widget] iframe");
    // The panel loads the desk from the server (and its database) on first open.
    await expect(chat.getByLabel("Your question")).toBeVisible({ timeout: 20_000 });

    // The close button is server-rendered, so it can be visible a moment before React attaches its click handler.
    await expect(async () => {
      await chat.getByRole("button", { name: "Close chat" }).click();
      await expect(launcher).toHaveAttribute("aria-expanded", "false", { timeout: 1000 });
    }).toPass({ timeout: 15_000 });
  });
});
