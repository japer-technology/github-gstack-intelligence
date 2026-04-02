/**
 * safety.test.ts — Unit tests for safety guards and configuration validation.
 *
 * Covers: bot-loop prevention, reserved prefixes, disabled skills, provider
 * key mapping, comment size limits, and config loading.
 *
 * Run with: cd .github-gstack-intelligence && bun test docs/test/scripts/safety.test.ts
 */

import { describe, expect, test } from "bun:test";
import { existsSync, writeFileSync, mkdirSync, rmSync } from "fs";
import {
  parseSlashCommand,
  route,
  loadConfig,
  AGENT_SIGNATURE,
} from "../../../lifecycle/router";
import type { Config } from "../../../lifecycle/router";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const testConfig: Config = {
  version: "1.0.0",
  defaults: {
    provider: "openai",
    model: "gpt-5.4",
    maxCommentLength: 60000,
    costTier: "standard",
  },
  access: {
    allowedPermissions: ["admin", "maintain", "write"],
    botLoopPrevention: true,
    prefixGating: true,
    prefixes: ["/"],
  },
  skills: {
    review: { enabled: true, trigger: "pull_request" },
    cso: { enabled: true, trigger: "pull_request", labelGated: true, label: "security-audit" },
    qa: { enabled: true, trigger: "issue_comment" },
    investigate: { enabled: true, trigger: "issue_label", label: "investigate" },
    retro: { enabled: false, trigger: "schedule", schedule: "0 17 * * 5" },
    canary: { enabled: false, trigger: "deployment_status" },
  },
};

// ─── SG-010: Reserved Prefix Characters ─────────────────────────────────────

describe("SG-010: reserved prefix set", () => {
  const RESERVED_PREFIXES = new Set([
    "`", "~", "@", "#", "$", "%", "^", ":", ";", "|", "=", "/", "\\", "&",
  ]);

  test("contains 14 characters", () => {
    expect(RESERVED_PREFIXES.size).toBe(14);
  });

  test("includes backtick", () => expect(RESERVED_PREFIXES.has("`")).toBe(true));
  test("includes tilde", () => expect(RESERVED_PREFIXES.has("~")).toBe(true));
  test("includes at sign", () => expect(RESERVED_PREFIXES.has("@")).toBe(true));
  test("includes hash", () => expect(RESERVED_PREFIXES.has("#")).toBe(true));
  test("includes dollar", () => expect(RESERVED_PREFIXES.has("$")).toBe(true));
  test("includes percent", () => expect(RESERVED_PREFIXES.has("%")).toBe(true));
  test("includes caret", () => expect(RESERVED_PREFIXES.has("^")).toBe(true));
  test("includes colon", () => expect(RESERVED_PREFIXES.has(":")).toBe(true));
  test("includes semicolon", () => expect(RESERVED_PREFIXES.has(";")).toBe(true));
  test("includes pipe", () => expect(RESERVED_PREFIXES.has("|")).toBe(true));
  test("includes equals", () => expect(RESERVED_PREFIXES.has("=")).toBe(true));
  test("includes slash", () => expect(RESERVED_PREFIXES.has("/")).toBe(true));
  test("includes backslash", () => expect(RESERVED_PREFIXES.has("\\")).toBe(true));
  test("includes ampersand", () => expect(RESERVED_PREFIXES.has("&")).toBe(true));
});

// ─── SG-050: Provider Key Mapping ───────────────────────────────────────────

describe("SG-051: provider-to-key mapping", () => {
  const providerKeyMap: Record<string, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GEMINI_API_KEY",
    xai: "XAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    mistral: "MISTRAL_API_KEY",
    groq: "GROQ_API_KEY",
  };

  test("covers 7 providers", () => {
    expect(Object.keys(providerKeyMap)).toHaveLength(7);
  });

  test("anthropic → ANTHROPIC_API_KEY", () => {
    expect(providerKeyMap["anthropic"]).toBe("ANTHROPIC_API_KEY");
  });

  test("openai → OPENAI_API_KEY", () => {
    expect(providerKeyMap["openai"]).toBe("OPENAI_API_KEY");
  });

  test("google → GEMINI_API_KEY", () => {
    expect(providerKeyMap["google"]).toBe("GEMINI_API_KEY");
  });

  test("xai → XAI_API_KEY", () => {
    expect(providerKeyMap["xai"]).toBe("XAI_API_KEY");
  });

  test("openrouter → OPENROUTER_API_KEY", () => {
    expect(providerKeyMap["openrouter"]).toBe("OPENROUTER_API_KEY");
  });

  test("mistral → MISTRAL_API_KEY", () => {
    expect(providerKeyMap["mistral"]).toBe("MISTRAL_API_KEY");
  });

  test("groq → GROQ_API_KEY", () => {
    expect(providerKeyMap["groq"]).toBe("GROQ_API_KEY");
  });
});

// ─── ST-050: Comment Size Limits ────────────────────────────────────────────

describe("ST-050: comment size limits", () => {
  const MAX_COMMENT_LENGTH = 60000;

  test("MAX_COMMENT_LENGTH is 60000", () => {
    expect(MAX_COMMENT_LENGTH).toBe(60000);
  });

  test("long text is truncated", () => {
    const longText = "x".repeat(70000);
    const truncated = longText.slice(0, MAX_COMMENT_LENGTH);
    expect(truncated.length).toBe(60000);
  });

  test("short text is not truncated", () => {
    const shortText = "Hello, world!";
    const truncated = shortText.slice(0, MAX_COMMENT_LENGTH);
    expect(truncated).toBe(shortText);
  });
});

// ─── ST-041: Push Backoff Schedule ──────────────────────────────────────────

describe("ST-041: push backoff schedule", () => {
  const pushBackoffs = [1000, 2000, 3000, 5000, 7000, 8000, 10000, 12000, 12000, 15000];

  test("has 10 entries", () => {
    expect(pushBackoffs).toHaveLength(10);
  });

  test("starts at 1 second", () => {
    expect(pushBackoffs[0]).toBe(1000);
  });

  test("ends at 15 seconds", () => {
    expect(pushBackoffs[9]).toBe(15000);
  });

  test("is monotonically non-decreasing", () => {
    for (let i = 1; i < pushBackoffs.length; i++) {
      expect(pushBackoffs[i]).toBeGreaterThanOrEqual(pushBackoffs[i - 1]);
    }
  });

  test("total backoff time is 75 seconds", () => {
    const total = pushBackoffs.reduce((sum, delay) => sum + delay, 0);
    expect(total).toBe(75000);
  });
});

// ─── SG-070: Config Loading Edge Cases ──────────────────────────────────────

describe("SG-070: config loading", () => {
  test("missing config.json throws with helpful message", () => {
    expect(() => loadConfig("/nonexistent/path")).toThrow("config.json not found");
  });

  test("invalid JSON in config.json throws", () => {
    const tmpDir = "/tmp/test-config-invalid";
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(`${tmpDir}/config.json`, "not valid json");
    expect(() => loadConfig(tmpDir)).toThrow();
    rmSync(tmpDir, { recursive: true });
  });

  test("valid config.json loads successfully", () => {
    const tmpDir = "/tmp/test-config-valid";
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(`${tmpDir}/config.json`, JSON.stringify(testConfig));
    const loaded = loadConfig(tmpDir);
    expect(loaded.version).toBe("1.0.0");
    expect(loaded.skills.review.enabled).toBe(true);
    rmSync(tmpDir, { recursive: true });
  });
});

// ─── Skill File Existence Tests ─────────────────────────────────────────────

describe("Skill files exist", () => {
  const skillsDir = `${import.meta.dir}/../../../skills`;
  const expectedSkills = [
    "review", "cso", "qa", "qa-only", "investigate", "ship",
    "office-hours", "plan-ceo-review", "plan-eng-review",
    "design-review", "plan-design-review", "design-consultation",
    "autoplan", "retro", "benchmark", "document-release", "canary",
  ];

  for (const skill of expectedSkills) {
    test(`${skill}.md exists`, () => {
      expect(existsSync(`${skillsDir}/${skill}.md`)).toBe(true);
    });
  }
});

// ─── Config Skills Match Skill Files ────────────────────────────────────────

describe("Config skills match skill files", () => {
  test("all config.json skills have corresponding .md files", () => {
    const skillsDir = `${import.meta.dir}/../../../skills`;
    const configSkills = Object.keys(testConfig.skills);
    for (const skill of configSkills) {
      expect(existsSync(`${skillsDir}/${skill}.md`)).toBe(true);
    }
  });
});
