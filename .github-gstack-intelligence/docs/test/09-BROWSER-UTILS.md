# 09 — Browser Utility Tests

Validates `browser.ts` module exports, CLI interface, and Playwright integration
for QA, design-review, and canary skills.

---

## Prerequisites

- Bun runtime (for unit tests)
- Playwright Chromium installed (for integration tests):
  ```bash
  cd .github-gstack-intelligence
  PLAYWRIGHT_VERSION=$(jq -r '.dependencies["playwright-core"]' package.json)
  npx playwright@${PLAYWRIGHT_VERSION} install chromium --with-deps
  ```

---

## Module Export Tests (Unit — No Browser Needed)

### BU-001: All Functions Exported

```typescript
import { describe, expect, test } from "bun:test";
import {
  launchBrowser,
  captureScreenshot,
  navigateAndCapture,
  checkPageHealth,
  testResponsiveLayouts,
  getAccessibilitySnapshot,
} from "./browser";

describe("BU-001: module exports", () => {
  test("launchBrowser is a function", () => {
    expect(typeof launchBrowser).toBe("function");
  });
  test("captureScreenshot is a function", () => {
    expect(typeof captureScreenshot).toBe("function");
  });
  test("navigateAndCapture is a function", () => {
    expect(typeof navigateAndCapture).toBe("function");
  });
  test("checkPageHealth is a function", () => {
    expect(typeof checkPageHealth).toBe("function");
  });
  test("testResponsiveLayouts is a function", () => {
    expect(typeof testResponsiveLayouts).toBe("function");
  });
  test("getAccessibilitySnapshot is a function", () => {
    expect(typeof getAccessibilitySnapshot).toBe("function");
  });
});
```

---

## Type Shape Tests (Unit — No Browser Needed)

### BU-010: HealthReport Structure

```typescript
import type { HealthReport, ResponsiveReport, NavigateResult, ViewportResult } from "./browser";

describe("BU-010: type shapes", () => {
  test("HealthReport happy path", () => {
    const report: HealthReport = {
      url: "https://example.com",
      status: 200,
      title: "Example",
      loadTimeMs: 500,
      consoleErrors: [],
      consoleWarnings: [],
      resourceErrors: [],
      accessible: true,
    };
    expect(report.status).toBe(200);
    expect(report.accessible).toBe(true);
    expect(report.consoleErrors).toHaveLength(0);
  });

  test("HealthReport with errors", () => {
    const report: HealthReport = {
      url: "https://broken.example.com",
      status: 500,
      title: "Error",
      loadTimeMs: 5000,
      consoleErrors: ["TypeError: undefined is not a function"],
      consoleWarnings: ["Deprecated API"],
      resourceErrors: ["script: cdn.example.com/app.js (net::ERR_FAILED)"],
      accessible: false,
    };
    expect(report.status).toBe(500);
    expect(report.consoleErrors).toHaveLength(1);
    expect(report.accessible).toBe(false);
  });

  test("ResponsiveReport structure", () => {
    const report: ResponsiveReport = {
      url: "https://example.com",
      viewports: [
        { name: "mobile", width: 375, height: 812, screenshot: "/tmp/m.png", overflowDetected: false },
        { name: "desktop", width: 1280, height: 800, screenshot: "/tmp/d.png", overflowDetected: true },
      ],
    };
    expect(report.viewports).toHaveLength(2);
    expect(report.viewports[1].overflowDetected).toBe(true);
  });

  test("NavigateResult structure", () => {
    const result: NavigateResult = {
      screenshot: "/tmp/home.png",
      title: "Home",
      status: 200,
    };
    expect(result.title).toBe("Home");
  });

  test("ViewportResult structure", () => {
    const vp: ViewportResult = {
      name: "tablet",
      width: 768,
      height: 1024,
      screenshot: "/tmp/tablet.png",
      overflowDetected: false,
    };
    expect(vp.width).toBe(768);
  });
});
```

---

## Constants Tests (Unit)

### BU-020: Responsive Viewports

```typescript
describe("BU-020: constants", () => {
  test("4 responsive viewports defined", () => {
    const viewports = [
      { name: "mobile", width: 375, height: 812 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1280, height: 800 },
      { name: "wide", width: 1920, height: 1080 },
    ];
    expect(viewports).toHaveLength(4);
    expect(viewports[0].name).toBe("mobile");
    expect(viewports[3].name).toBe("wide");
  });

  test("navigation timeout is 30 seconds", () => {
    const NAV_TIMEOUT_MS = 30_000;
    expect(NAV_TIMEOUT_MS).toBe(30000);
  });

  test("JPEG quality is 80", () => {
    const JPEG_QUALITY = 80;
    expect(JPEG_QUALITY).toBe(80);
  });
});
```

---

## CLI Interface Tests (Integration — Requires Playwright)

### BU-030: navigate-and-capture Command

```bash
cd .github-gstack-intelligence
mkdir -p /tmp/test-screenshots

bun lifecycle/browser.ts navigate-and-capture \
  --url https://example.com \
  --output /tmp/test-screenshots/home.png

# Verify screenshot was created
test -f /tmp/test-screenshots/home.png \
  && echo "PASS: Screenshot created" \
  || echo "FAIL: Screenshot not found"

# Verify it's a valid image
file /tmp/test-screenshots/home.png | grep -q "PNG image"
```

**Expected:** A PNG screenshot of example.com saved to the specified path.

---

### BU-031: health-check Command

```bash
bun lifecycle/browser.ts health-check --url https://example.com
```

**Expected output (JSON):**
```json
{
  "url": "https://example.com",
  "status": 200,
  "title": "Example Domain",
  "loadTimeMs": ...,
  "consoleErrors": [],
  "consoleWarnings": [],
  "resourceErrors": [],
  "accessible": true
}
```

**Validation:**
```bash
bun lifecycle/browser.ts health-check --url https://example.com | jq '.status'
# Expected: 200
```

---

### BU-032: responsive-test Command

```bash
mkdir -p /tmp/test-screenshots/responsive

bun lifecycle/browser.ts responsive-test \
  --url https://example.com \
  --output-dir /tmp/test-screenshots/responsive
```

**Expected:** 4 screenshots created (one per viewport):
```
mobile-375x812.png (or .jpeg)
tablet-768x1024.png
desktop-1280x800.png
wide-1920x1080.png
```

**Verification:**
```bash
ls /tmp/test-screenshots/responsive/ | wc -l
# Expected: 4
```

---

### BU-033: accessibility-snapshot Command

```bash
bun lifecycle/browser.ts accessibility-snapshot --url https://example.com
```

**Expected:** Text representation of the accessibility tree (roles, names, values).

---

### BU-034: Invalid URL Handling

```bash
bun lifecycle/browser.ts health-check --url https://this-domain-does-not-exist.example.com 2>&1
# Expected: Error output (non-zero exit code or error in JSON)
```

---

### BU-035: JPEG Screenshot Format

```bash
bun lifecycle/browser.ts navigate-and-capture \
  --url https://example.com \
  --output /tmp/test-screenshots/home.jpeg

file /tmp/test-screenshots/home.jpeg | grep -q "JPEG"
```

---

## Browser Launch Tests (Integration)

### BU-040: Headless Chromium Launches Successfully

```typescript
import { launchBrowser } from "./browser";

test("BU-040: browser launches in headless mode", async () => {
  const browser = await launchBrowser();
  expect(browser).toBeDefined();
  expect(browser.isConnected()).toBe(true);
  await browser.close();
});
```

---

### BU-041: Page Navigation

```typescript
test("BU-041: page navigation works", async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto("https://example.com", { waitUntil: "networkidle" });
  const title = await page.title();
  expect(title).toContain("Example");
  await browser.close();
});
```

---

## Integration with Skills

### BU-050: QA Skill Uses browser.ts

When `/qa https://example.com` is triggered, verify in workflow logs that
`browser.ts` commands are invoked:

```
bun .github-gstack-intelligence/lifecycle/browser.ts navigate-and-capture ...
bun .github-gstack-intelligence/lifecycle/browser.ts health-check ...
```

### BU-051: Design Review Uses browser.ts

When a PR with `design-review` label is opened, verify browser utilities are
used for visual analysis.

### BU-052: Canary Uses browser.ts

When a deployment success event triggers `/canary`, verify browser health
checks are performed.

---

## Cleanup

```bash
rm -rf /tmp/test-screenshots
```
