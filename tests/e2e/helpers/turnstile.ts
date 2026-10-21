import type { Page } from "@playwright/test";

const turnstileUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export async function mockTurnstile(page: Page): Promise<void> {
  await page.route(turnstileUrl, route =>
    route.fulfill({
      contentType: "text/javascript",
      body: `
        window.__plwTurnstileCounts = { render: 0, remove: 0, reset: 0 };
        window.__plwTurnstileWidgets = new Map();
        window.turnstile = {
          render(container, options) {
            const id = String(++window.__plwTurnstileCounts.render);
            const node = document.createElement("div");
            node.className = "plw-test-turnstile-widget";
            node.textContent = "Test verification";
            container.append(node);
            window.__plwTurnstileWidgets.set(id, { container, options });
            setTimeout(() => options.callback("test-turnstile-token"), 0);
            return id;
          },
          remove(id) {
            window.__plwTurnstileCounts.remove += 1;
            window.__plwTurnstileWidgets.get(id)?.container.replaceChildren();
            window.__plwTurnstileWidgets.delete(id);
          },
          reset(id) {
            window.__plwTurnstileCounts.reset += 1;
            const widget=window.__plwTurnstileWidgets.get(id);
            if(widget)setTimeout(()=>widget.options.callback("test-turnstile-token"),0);
          }
        };
      `
    })
  );
}
