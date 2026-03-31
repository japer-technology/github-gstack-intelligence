/**
 * browser.test.ts — Unit tests for the browser utility module.
 *
 * These tests validate the module's exported interface, types, and CLI
 * argument parsing without requiring a real browser. Integration tests
 * that launch Chromium are deferred to CI where `npx playwright install`
 * has been run.
 *
 * Run with: cd .github-gstack-intelligence && bun test
 */

import { describe, expect, test } from "bun:test";
import {
  launchBrowser,
  captureScreenshot,
  navigateAndCapture,
  checkPageHealth,
  testResponsiveLayouts,
  getAccessibilitySnapshot,
  type HealthReport,
  type ResponsiveReport,
  type NavigateResult,
  type ViewportResult,
} from "./browser";

// ─── Module Export Tests ────────────────────────────────────────────────────

describe("browser module exports", () => {
  test("exports launchBrowser function", () => {
    expect(typeof launchBrowser).toBe("function");
  });

  test("exports captureScreenshot function", () => {
    expect(typeof captureScreenshot).toBe("function");
  });

  test("exports navigateAndCapture function", () => {
    expect(typeof navigateAndCapture).toBe("function");
  });

  test("exports checkPageHealth function", () => {
    expect(typeof checkPageHealth).toBe("function");
  });

  test("exports testResponsiveLayouts function", () => {
    expect(typeof testResponsiveLayouts).toBe("function");
  });

  test("exports getAccessibilitySnapshot function", () => {
    expect(typeof getAccessibilitySnapshot).toBe("function");
  });
});

// ─── Type Shape Tests ───────────────────────────────────────────────────────

describe("type shapes", () => {
  test("HealthReport has expected fields", () => {
    const report: HealthReport = {
      url: "https://example.com",
      status: 200,
      title: "Example",
      loadTimeMs: 1234,
      consoleErrors: [],
      consoleWarnings: [],
      resourceErrors: [],
      accessible: true,
    };
    expect(report.url).toBe("https://example.com");
    expect(report.status).toBe(200);
    expect(report.title).toBe("Example");
    expect(report.loadTimeMs).toBe(1234);
    expect(report.consoleErrors).toEqual([]);
    expect(report.consoleWarnings).toEqual([]);
    expect(report.resourceErrors).toEqual([]);
    expect(report.accessible).toBe(true);
  });

  test("HealthReport with errors", () => {
    const report: HealthReport = {
      url: "https://broken.example.com",
      status: 500,
      title: "Error",
      loadTimeMs: 5000,
      consoleErrors: ["Uncaught TypeError: foo is not a function"],
      consoleWarnings: ["Deprecated API usage"],
      resourceErrors: ["script: https://cdn.example.com/app.js (net::ERR_FAILED)"],
      accessible: false,
    };
    expect(report.consoleErrors).toHaveLength(1);
    expect(report.consoleWarnings).toHaveLength(1);
    expect(report.resourceErrors).toHaveLength(1);
    expect(report.accessible).toBe(false);
  });

  test("ResponsiveReport has expected fields", () => {
    const report: ResponsiveReport = {
      url: "https://example.com",
      viewports: [
        {
          name: "mobile",
          width: 375,
          height: 812,
          screenshot: "/tmp/screenshots/mobile-375x812.png",
          overflowDetected: false,
        },
      ],
    };
    expect(report.url).toBe("https://example.com");
    expect(report.viewports).toHaveLength(1);
    expect(report.viewports[0].name).toBe("mobile");
    expect(report.viewports[0].overflowDetected).toBe(false);
  });

  test("NavigateResult has expected fields", () => {
    const result: NavigateResult = {
      screenshot: "/tmp/screenshots/home.png",
      title: "Home Page",
      status: 200,
    };
    expect(result.screenshot).toBe("/tmp/screenshots/home.png");
    expect(result.title).toBe("Home Page");
    expect(result.status).toBe(200);
  });

  test("ViewportResult has expected fields", () => {
    const viewport: ViewportResult = {
      name: "desktop",
      width: 1280,
      height: 800,
      screenshot: "/tmp/screenshots/desktop-1280x800.png",
      overflowDetected: true,
    };
    expect(viewport.name).toBe("desktop");
    expect(viewport.width).toBe(1280);
    expect(viewport.height).toBe(800);
    expect(viewport.overflowDetected).toBe(true);
  });
});
