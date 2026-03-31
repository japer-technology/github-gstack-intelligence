/**
 * browser.ts — Playwright utility module for browser-based skills.
 *
 * Provides reusable browser functions for QA, design-review, and canary skills.
 * All functions use Playwright's Chromium instance installed via the workflow's
 * conditional `npx playwright install chromium --with-deps` step.
 *
 * This module is designed to be invoked by the AI agent via its bash tool
 * (not directly imported by agent.ts). Usage from the agent:
 *
 *   bun .github-gstack-intelligence/lifecycle/browser.ts navigate-and-capture \
 *       --url https://staging.example.com --output /tmp/screenshots/home.png
 *
 * The module can also be imported directly by other TypeScript modules.
 */

import { chromium, type Browser, type Page, type BrowserContext } from "playwright-core";
import { mkdirSync, existsSync } from "fs";
import { dirname, resolve } from "path";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HealthReport {
  url: string;
  status: number;
  title: string;
  loadTimeMs: number;
  consoleErrors: string[];
  consoleWarnings: string[];
  resourceErrors: string[];
  accessible: boolean;
}

export interface ResponsiveReport {
  url: string;
  viewports: ViewportResult[];
}

export interface ViewportResult {
  name: string;
  width: number;
  height: number;
  screenshot: string;
  overflowDetected: boolean;
}

export interface NavigateResult {
  screenshot: string;
  title: string;
  status: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Default responsive viewports for layout testing. */
const RESPONSIVE_VIEWPORTS = [
  { name: "mobile",  width: 375,  height: 812  },
  { name: "tablet",  width: 768,  height: 1024 },
  { name: "desktop", width: 1280, height: 800  },
  { name: "wide",    width: 1920, height: 1080 },
];

/** Default navigation timeout in milliseconds. */
const NAV_TIMEOUT_MS = 30_000;

/** Default screenshot quality for JPEG format. */
const JPEG_QUALITY = 80;

// ─── Browser Management ─────────────────────────────────────────────────────

/**
 * Launch a headless Chromium browser instance.
 *
 * The browser is started fresh per invocation — there is no persistent
 * browser daemon. In CI, the Chromium binary is pre-installed by the
 * workflow's `npx playwright install chromium --with-deps` step.
 *
 * @returns A Playwright Browser instance. The caller is responsible for
 *          calling `browser.close()` when done.
 */
export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
}

// ─── Screenshot Helpers ─────────────────────────────────────────────────────

/**
 * Capture a full-page screenshot of the current page state.
 *
 * @param page       - An active Playwright Page instance.
 * @param outputPath - Absolute file path for the screenshot (PNG or JPEG).
 * @returns          - The resolved absolute path of the saved screenshot.
 */
export async function captureScreenshot(
  page: Page,
  outputPath: string,
): Promise<string> {
  const resolvedPath = resolve(outputPath);
  mkdirSync(dirname(resolvedPath), { recursive: true });

  const isJpeg = resolvedPath.endsWith(".jpg") || resolvedPath.endsWith(".jpeg");
  await page.screenshot({
    path: resolvedPath,
    fullPage: true,
    type: isJpeg ? "jpeg" : "png",
    ...(isJpeg ? { quality: JPEG_QUALITY } : {}),
  });

  return resolvedPath;
}

/**
 * Navigate to a URL, wait for the page to load, and capture a screenshot.
 *
 * @param url        - The URL to navigate to.
 * @param outputPath - Absolute file path for the screenshot.
 * @returns          - Navigation result with screenshot path, page title, and HTTP status.
 */
export async function navigateAndCapture(
  url: string,
  outputPath: string,
): Promise<NavigateResult> {
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: "GStackIntelligence/1.0 (Playwright; QA Automation)",
    });
    const page = await context.newPage();

    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: NAV_TIMEOUT_MS,
    });

    const status = response?.status() ?? 0;
    const title = await page.title();
    const screenshot = await captureScreenshot(page, outputPath);

    await context.close();
    return { screenshot, title, status };
  } finally {
    await browser.close();
  }
}

// ─── Health Check ───────────────────────────────────────────────────────────

/**
 * Perform a comprehensive health check on a URL.
 *
 * Navigates to the page and collects:
 * - HTTP status code
 * - Page title
 * - Load time
 * - Console errors and warnings
 * - Failed resource loads (images, scripts, etc.)
 * - Basic accessibility check
 *
 * @param url - The URL to check.
 * @returns   - A HealthReport with all collected data.
 */
export async function checkPageHealth(url: string): Promise<HealthReport> {
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: "GStackIntelligence/1.0 (Playwright; Health Check)",
    });
    const page = await context.newPage();

    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const resourceErrors: string[] = [];

    // Collect console messages.
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      } else if (msg.type() === "warning") {
        consoleWarnings.push(msg.text());
      }
    });

    // Collect failed resource loads.
    page.on("requestfailed", (request) => {
      resourceErrors.push(
        `${request.resourceType()}: ${request.url()} (${request.failure()?.errorText ?? "unknown"})`,
      );
    });

    const startTime = Date.now();
    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: NAV_TIMEOUT_MS,
    });
    const loadTimeMs = Date.now() - startTime;

    const status = response?.status() ?? 0;
    const title = await page.title();

    // Basic accessibility check: are there images without alt text?
    const accessible = await page.evaluate(() => {
      const images = document.querySelectorAll("img");
      for (const img of images) {
        if (!img.alt && !img.getAttribute("aria-label") && !img.getAttribute("role")) {
          return false;
        }
      }
      return true;
    });

    await context.close();

    return {
      url,
      status,
      title,
      loadTimeMs,
      consoleErrors,
      consoleWarnings,
      resourceErrors,
      accessible,
    };
  } finally {
    await browser.close();
  }
}

// ─── Responsive Layout Testing ──────────────────────────────────────────────

/**
 * Test a page across multiple viewport sizes and capture screenshots.
 *
 * For each viewport, the function:
 * - Sets the viewport dimensions
 * - Navigates to the URL
 * - Checks for horizontal overflow (content wider than viewport)
 * - Captures a full-page screenshot
 *
 * @param url       - The URL to test.
 * @param outputDir - Directory where screenshots will be saved.
 * @returns         - A ResponsiveReport with results for each viewport.
 */
export async function testResponsiveLayouts(
  url: string,
  outputDir: string,
): Promise<ResponsiveReport> {
  const browser = await launchBrowser();
  try {
    const viewports: ViewportResult[] = [];

    for (const vp of RESPONSIVE_VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: "GStackIntelligence/1.0 (Playwright; Responsive Test)",
      });
      const page = await context.newPage();

      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: NAV_TIMEOUT_MS,
      });

      // Check for horizontal overflow.
      const overflowDetected = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      const screenshotPath = resolve(outputDir, `${vp.name}-${vp.width}x${vp.height}.png`);
      const screenshot = await captureScreenshot(page, screenshotPath);

      viewports.push({
        name: vp.name,
        width: vp.width,
        height: vp.height,
        screenshot,
        overflowDetected,
      });

      await context.close();
    }

    return { url, viewports };
  } finally {
    await browser.close();
  }
}

// ─── Accessibility Snapshot ─────────────────────────────────────────────────

/**
 * Get an accessibility tree snapshot of the current page.
 *
 * Returns a structured text representation of the page's accessibility tree,
 * useful for understanding the semantic structure and identifying
 * accessibility issues.
 *
 * @param page - An active Playwright Page instance.
 * @returns    - A text representation of the accessibility tree.
 */
export async function getAccessibilitySnapshot(page: Page): Promise<string> {
  const snapshot = await page.accessibility.snapshot();
  if (!snapshot) return "No accessibility tree available.";
  return formatAccessibilityNode(snapshot, 0);
}

/**
 * Recursively format an accessibility node into a readable text tree.
 */
function formatAccessibilityNode(node: any, depth: number): string {
  const indent = "  ".repeat(depth);
  const role = node.role ?? "unknown";
  const name = node.name ? `: "${node.name}"` : "";
  const value = node.value ? ` [value: "${node.value}"]` : "";

  let line = `${indent}${role}${name}${value}\n`;

  if (node.children) {
    for (const child of node.children) {
      line += formatAccessibilityNode(child, depth + 1);
    }
  }

  return line;
}

// ─── CLI Interface ──────────────────────────────────────────────────────────
// When invoked directly (not imported), parse CLI arguments and execute
// the requested browser command. The agent calls these via its bash tool.

if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0];

  function getArg(name: string): string | undefined {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
  }

  async function cli() {
    switch (command) {
      case "navigate-and-capture": {
        const url = getArg("url");
        const output = getArg("output") ?? "/tmp/screenshots/capture.png";
        if (!url) {
          console.error("Usage: browser.ts navigate-and-capture --url <url> --output <path>");
          process.exit(1);
        }
        const result = await navigateAndCapture(url, output);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case "health-check": {
        const url = getArg("url");
        if (!url) {
          console.error("Usage: browser.ts health-check --url <url>");
          process.exit(1);
        }
        const report = await checkPageHealth(url);
        console.log(JSON.stringify(report, null, 2));
        break;
      }

      case "responsive-test": {
        const url = getArg("url");
        const outputDir = getArg("output-dir") ?? "/tmp/screenshots/responsive";
        if (!url) {
          console.error("Usage: browser.ts responsive-test --url <url> --output-dir <dir>");
          process.exit(1);
        }
        const report = await testResponsiveLayouts(url, outputDir);
        console.log(JSON.stringify(report, null, 2));
        break;
      }

      case "accessibility-snapshot": {
        const url = getArg("url");
        if (!url) {
          console.error("Usage: browser.ts accessibility-snapshot --url <url>");
          process.exit(1);
        }
        const browser = await launchBrowser();
        try {
          const context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
          });
          const page = await context.newPage();
          await page.goto(url, {
            waitUntil: "networkidle",
            timeout: NAV_TIMEOUT_MS,
          });
          const snapshot = await getAccessibilitySnapshot(page);
          console.log(snapshot);
          await context.close();
        } finally {
          await browser.close();
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.error("Available commands:");
        console.error("  navigate-and-capture  --url <url> --output <path>");
        console.error("  health-check          --url <url>");
        console.error("  responsive-test       --url <url> --output-dir <dir>");
        console.error("  accessibility-snapshot --url <url>");
        process.exit(1);
    }
  }

  cli().catch((err) => {
    console.error("Browser error:", err.message ?? err);
    process.exit(1);
  });
}
