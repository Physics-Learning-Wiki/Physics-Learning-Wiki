import { expect, test, type Page, type TestInfo } from "@playwright/test";

const basePath = "/Physics-Learning-Wiki/";

const forbiddenOrdinaryPageRequests = [
  /mathjax\.css/i,
  /(?:^|\/)features\/mermaid\.js/i,
  /(?:^|\/)features\/quiz\.js/i,
  /(?:^|\/)css\/quiz\.css/i,
  /(?:^|\/)features\/submit\.(?:js|css)/i,
  /(?:^|\/)features\/question-contribute\.(?:js|css)/i,
  /easymde/i,
  /(?:^|\/)pagefind(?:\/|\.|-)/i,
  /(?:^|\/)\_generated\/question-bank\//i
];

async function navigateByInstantLink(page: Page, route: string): Promise<void> {
  const target = `${await page.evaluate(() => location.origin)}${basePath}${route}`;
  await page.evaluate(targetUrl => {
    const link = [...document.querySelectorAll<HTMLAnchorElement>("a")].find(anchor => anchor.href === targetUrl);
    if (!link) throw new Error(`No site link points to ${targetUrl}`);
    link.click();
  }, target);
  await expect(page).toHaveURL(new RegExp(`/Physics-Learning-Wiki/${route.replaceAll("/", "\\/")}$`));
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
}

async function installVitalsObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0 };
    (window as Window & { __plwVitals?: typeof metrics }).__plwVitals = metrics;
    if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) metrics.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    }
    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
          if (!shift.hadRecentInput) metrics.cls += shift.value ?? 0;
        }
      }).observe({ type: "layout-shift", buffered: true });
    }
  });
}

function createPerformanceRecorder(page: Page) {
  const requests: Array<{ url: string; resourceType: string }> = [];
  const bodySizeTasks: Array<Promise<number>> = [];
  page.on("request", request => requests.push({ url: request.url(), resourceType: request.resourceType() }));
  page.on("requestfinished", request => {
    bodySizeTasks.push(
      request
        .sizes()
        .then(sizes => sizes.responseBodySize)
        .catch(() => 0)
    );
  });

  let previousRequestCount = 0;
  let previousBodyBytes = 0;
  return async (label: string) => {
    await page.waitForTimeout(200);
    const bodyBytesByRequest = await Promise.all(bodySizeTasks);
    const bodyBytes = bodyBytesByRequest.reduce((total, size) => total + size, 0);
    const stageRequests = requests.slice(previousRequestCount);
    const vitals = await page.evaluate(
      () => (window as Window & { __plwVitals?: { lcp: number; cls: number } }).__plwVitals
    );
    const sample = {
      label,
      requests: stageRequests.length,
      responseBodyBytes: bodyBytes - previousBodyBytes,
      fontRequests: stageRequests.filter(request => request.resourceType === "font").length,
      lcpMs: vitals?.lcp ?? null,
      cls: vitals?.cls ?? null
    };
    previousRequestCount = requests.length;
    previousBodyBytes = bodyBytes;
    return sample;
  };
}

test("ordinary pages do not request page-specific features", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));

  await page.goto(`${basePath}intro/about/`);
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
  await page.waitForTimeout(300);

  const eagerFeatureRequests = requests.filter(url =>
    forbiddenOrdinaryPageRequests.some(pattern => pattern.test(new URL(url).pathname))
  );
  expect(eagerFeatureRequests).toEqual([]);
});

test("minified responsive pictures keep valid WebP and fallback sources under the site subpath", async ({ page }) => {
  const webpResponses: number[] = [];
  page.on("response", response => {
    if (new URL(response.url()).pathname.endsWith(".webp")) webpResponses.push(response.status());
  });

  await page.goto(`${basePath}mechanics/oscillation-wave/harmonic-wave/`);
  const picture = page.locator(
    'picture[data-plw-generated="responsive"]:has(img[alt="色散关系下的相速度与群速度示意"])'
  );
  const source = picture.locator('source[type="image/webp"]');
  const image = picture.locator("img");
  await expect(source).toBeAttached();
  await expect(source).toHaveAttribute("srcset", /\.w480\.webp 480w/);
  await expect(source).toHaveAttribute("sizes", "(max-width: 720px) 100vw, 720px");
  await expect(image).toHaveAttribute("src", /dispersion_group_velocity\.png$/);
  await expect(image).toHaveAttribute("alt", "色散关系下的相速度与群速度示意");
  await expect(image).toHaveAttribute("width", "2250");
  await expect(image).toHaveAttribute("height", "1350");
  await expect(image).toHaveAttribute("decoding", "async");
  await expect(image).not.toHaveAttribute("fetchpriority", "high");

  const variantUrl = await source.evaluate(element => {
    const firstCandidate = element.getAttribute("srcset")?.split(",")[0]?.trim().split(/\s+/)[0];
    if (!firstCandidate) throw new Error("Generated WebP srcset is empty");
    return new URL(firstCandidate, location.href).href;
  });
  expect(new URL(variantUrl).pathname).toContain(`${basePath}mechanics/images/dispersion_group_velocity.w480.webp`);

  const loadedVariant = page.waitForResponse(response => {
    const url = new URL(response.url());
    return (
      url.pathname.startsWith(basePath) &&
      /\/mechanics\/images\/dispersion_group_velocity\.w\d+\.webp$/.test(url.pathname)
    );
  });
  await image.evaluate(element => {
    (element as HTMLImageElement).loading = "eager";
  });
  await image.scrollIntoViewIfNeeded();
  const response = await loadedVariant;
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).pathname.startsWith(basePath)).toBe(true);
  await expect.poll(() => webpResponses.includes(200)).toBe(true);
});

test("reports browser loading measurements for cold pages and instant navigation", async ({
  page,
  browser
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await installVitalsObserver(page);
  const record = createPerformanceRecorder(page);
  const samples = [];

  await page.goto(`${basePath}intro/about/`);
  await expect(page.locator("article.md-content__inner.md-typeset")).toBeVisible();
  samples.push(await record("cold ordinary page"));
  await navigateByInstantLink(page, "modern/general-relativity/");
  await expect(page.locator("article mjx-container:visible").first()).toBeVisible();
  samples.push(await record("ordinary to math via instant navigation"));
  await navigateByInstantLink(page, "intro/about/");
  samples.push(await record("math to ordinary via instant navigation"));
  await navigateByInstantLink(page, "quiz/");
  await expect(page.locator(".plw-quiz-home-featured")).toBeVisible();
  samples.push(await record("ordinary to quiz via instant navigation"));
  await navigateByInstantLink(page, "intro/about/");
  const search = page.locator(".md-search__input");
  await search.fill("牛顿");
  await expect(page.locator(".md-search-result__link").first()).toBeVisible();
  samples.push(await record("ordinary search initialization"));

  const coldContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const coldMathPage = await coldContext.newPage();
  await installVitalsObserver(coldMathPage);
  const recordColdMath = createPerformanceRecorder(coldMathPage);
  await coldMathPage.goto(`${basePath}modern/general-relativity/`);
  await expect(coldMathPage.locator("article mjx-container:visible").first()).toBeVisible();
  samples.push(await recordColdMath("cold math page"));
  await coldContext.close();

  const report = {
    environment: {
      browser: browser.version(),
      viewport: "1280x800",
      server: "127.0.0.1 subpath server; unthrottled, no CDN compression or cache",
      metricScope:
        "LCP and CLS are document-level values sampled at each milestone; instant navigation retains the document"
    },
    samples
  };
  console.log(`PLW_BROWSER_PERFORMANCE_REPORT ${JSON.stringify(report)}`);
  await testInfo.attach("plw-browser-performance.json", {
    body: Buffer.from(JSON.stringify(report, null, 2)),
    contentType: "application/json"
  });
});

declare global {
  interface Window {
    __plwVitals?: { lcp: number; cls: number };
  }
}
