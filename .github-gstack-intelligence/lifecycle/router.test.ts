/**
 * router.test.ts — Unit tests for the GStack Intelligence router.
 *
 * Run with: cd .github-gstack-intelligence && bun test
 */

import { describe, expect, test } from "bun:test";
import { parseSlashCommand, route, AGENT_SIGNATURE } from "./router";
import type { Config } from "./router";

// ─── Test Config ────────────────────────────────────────────────────────────

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
    "office-hours": { enabled: true, trigger: "issue_label", label: "office-hours" },
    retro: { enabled: false, trigger: "schedule", schedule: "0 17 * * 5" },
    benchmark: { enabled: false, trigger: "schedule", schedule: "0 6 * * *" },
    ship: { enabled: true, trigger: "issue_comment" },
    "document-release": { enabled: true, trigger: "release" },
    canary: { enabled: false, trigger: "deployment_status" },
    autoplan: { enabled: true, trigger: "issue_comment" },
    "plan-ceo-review": { enabled: true, trigger: "issue_comment" },
    "plan-eng-review": { enabled: true, trigger: "issue_comment" },
    "design-review": { enabled: true, trigger: "pull_request", labelGated: true, label: "design-review" },
    "plan-design-review": { enabled: true, trigger: "issue_comment" },
    "design-consultation": { enabled: true, trigger: "issue_label", label: "design-consultation" },
    "qa-only": { enabled: true, trigger: "issue_comment" },
  },
};

// ─── Slash-Command Parser Tests ─────────────────────────────────────────────

describe("parseSlashCommand", () => {
  test("parses /review", () => {
    const result = parseSlashCommand("/review");
    expect(result).toEqual({ skill: "review" });
  });

  test("parses /cso", () => {
    const result = parseSlashCommand("/cso");
    expect(result).toEqual({ skill: "cso" });
  });

  test("parses /qa with URL", () => {
    const result = parseSlashCommand("/qa https://staging.example.com");
    expect(result).toEqual({ skill: "qa", url: "https://staging.example.com" });
  });

  test("parses /qa-only with URL", () => {
    const result = parseSlashCommand("/qa-only https://staging.example.com");
    expect(result).toEqual({ skill: "qa-only", url: "https://staging.example.com" });
  });

  test("parses /qa with http URL", () => {
    const result = parseSlashCommand("/qa http://localhost:3000");
    expect(result).toEqual({ skill: "qa", url: "http://localhost:3000" });
  });

  test("parses /investigate", () => {
    const result = parseSlashCommand("/investigate");
    expect(result).toEqual({ skill: "investigate" });
  });

  test("parses /ship", () => {
    const result = parseSlashCommand("/ship");
    expect(result).toEqual({ skill: "ship" });
  });

  test("parses /office-hours", () => {
    const result = parseSlashCommand("/office-hours");
    expect(result).toEqual({ skill: "office-hours" });
  });

  test("parses /plan-ceo-review", () => {
    const result = parseSlashCommand("/plan-ceo-review");
    expect(result).toEqual({ skill: "plan-ceo-review" });
  });

  test("parses /plan-eng-review", () => {
    const result = parseSlashCommand("/plan-eng-review");
    expect(result).toEqual({ skill: "plan-eng-review" });
  });

  test("parses /design-review", () => {
    const result = parseSlashCommand("/design-review");
    expect(result).toEqual({ skill: "design-review" });
  });

  test("parses /plan-design-review", () => {
    const result = parseSlashCommand("/plan-design-review");
    expect(result).toEqual({ skill: "plan-design-review" });
  });

  test("parses /design-consultation", () => {
    const result = parseSlashCommand("/design-consultation");
    expect(result).toEqual({ skill: "design-consultation" });
  });

  test("parses /autoplan", () => {
    const result = parseSlashCommand("/autoplan");
    expect(result).toEqual({ skill: "autoplan" });
  });

  test("parses /retro with args", () => {
    const result = parseSlashCommand("/retro 7d");
    expect(result).toEqual({ skill: "retro", args: "7d" });
  });

  test("parses /benchmark", () => {
    const result = parseSlashCommand("/benchmark");
    expect(result).toEqual({ skill: "benchmark" });
  });

  test("returns null for plain text", () => {
    const result = parseSlashCommand("Hello, can you help me?");
    expect(result).toBeNull();
  });

  test("returns null for empty string", () => {
    const result = parseSlashCommand("");
    expect(result).toBeNull();
  });

  test("returns null for unknown command", () => {
    const result = parseSlashCommand("/unknown-command");
    expect(result).toBeNull();
  });

  test("handles leading whitespace", () => {
    const result = parseSlashCommand("  /review");
    expect(result).toEqual({ skill: "review" });
  });

  test("parses command from first line only", () => {
    const result = parseSlashCommand("/review\nThis is extra context");
    expect(result).toEqual({ skill: "review" });
  });

  test("returns skill without url for /qa with invalid URL", () => {
    const result = parseSlashCommand("/qa not-a-url");
    expect(result).toEqual({ skill: "qa" });
  });

  test("is case-insensitive for command names", () => {
    const result = parseSlashCommand("/Review");
    expect(result).toEqual({ skill: "review" });
  });
});

// ─── Router Tests ───────────────────────────────────────────────────────────

describe("route", () => {
  // Bot-loop prevention
  test("skips agent-generated comments", () => {
    const event = {
      comment: { body: `Some reply\n${AGENT_SIGNATURE}` },
      issue: { number: 1 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).toBeNull();
  });

  test("does not skip non-agent comments", () => {
    const event = {
      comment: { body: "/review" },
      issue: { number: 1 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("review");
  });

  // issue_comment → slash command
  test("routes /qa slash command with URL", () => {
    const event = {
      comment: { body: "/qa https://staging.example.com" },
      issue: { number: 42 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("qa");
    expect(result!.needsBrowser).toBe(true);
    expect(result!.context.url).toBe("https://staging.example.com");
    expect(result!.context.issueNumber).toBe(42);
  });

  test("routes /ship slash command", () => {
    const event = {
      comment: { body: "/ship" },
      issue: { number: 10 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("ship");
    expect(result!.needsBrowser).toBe(false);
  });

  test("returns null for plain conversation comment", () => {
    const event = {
      comment: { body: "Hello, can you help me?" },
      issue: { number: 1 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).toBeNull();
  });

  // issue_comment → disabled skill
  test("returns null for disabled skill command", () => {
    const event = {
      comment: { body: "/retro 7d" },
      issue: { number: 1 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).toBeNull();
  });

  // pull_request → review
  test("routes pull_request to review", () => {
    const event = {
      pull_request: {
        number: 5,
        head: { ref: "feature-branch" },
        labels: [],
      },
    };
    const result = route(event, "pull_request", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("review");
    expect(result!.context.prNumber).toBe(5);
    expect(result!.context.branch).toBe("feature-branch");
  });

  // pull_request → cso (security-audit label)
  test("routes pull_request with security-audit label to cso", () => {
    const event = {
      pull_request: {
        number: 5,
        head: { ref: "feature-branch" },
        labels: [{ name: "security-audit" }],
      },
    };
    const result = route(event, "pull_request", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("cso");
  });

  // pull_request → design-review (design-review label)
  test("routes pull_request with design-review label to design-review", () => {
    const event = {
      pull_request: {
        number: 5,
        head: { ref: "feature-branch" },
        labels: [{ name: "design-review" }],
      },
    };
    const result = route(event, "pull_request", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("design-review");
    expect(result!.needsBrowser).toBe(true);
  });

  // issues → label-mapped skill
  test("routes issue with investigate label to investigate", () => {
    const event = {
      issue: {
        number: 20,
        labels: [{ name: "investigate" }],
      },
    };
    const result = route(event, "issues", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("investigate");
    expect(result!.context.issueNumber).toBe(20);
  });

  test("routes issue with office-hours label to office-hours", () => {
    const event = {
      issue: {
        number: 30,
        labels: [{ name: "office-hours" }],
      },
    };
    const result = route(event, "issues", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("office-hours");
  });

  test("returns null for issue without matching label", () => {
    const event = {
      issue: {
        number: 1,
        labels: [{ name: "bug" }],
      },
    };
    const result = route(event, "issues", testConfig);
    expect(result).toBeNull();
  });

  test("returns null for issue with no labels", () => {
    const event = {
      issue: {
        number: 1,
        labels: [],
      },
    };
    const result = route(event, "issues", testConfig);
    expect(result).toBeNull();
  });

  // release → document-release
  test("routes release event to document-release", () => {
    const event = { release: { tag_name: "v1.0.0" } };
    const result = route(event, "release", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("document-release");
  });

  // deployment_status → canary (disabled)
  test("returns null for deployment_status when canary is disabled", () => {
    const event = {
      deployment_status: { state: "success" },
      deployment: { environment_url: "https://canary.example.com" },
    };
    const result = route(event, "deployment_status", testConfig);
    expect(result).toBeNull();
  });

  // schedule → disabled skills
  test("returns null for schedule when skill is disabled", () => {
    const event = { schedule: "0 17 * * 5" };
    const result = route(event, "schedule", testConfig);
    expect(result).toBeNull();
  });

  // Unknown event
  test("returns null for unknown event type", () => {
    const event = {};
    const result = route(event, "unknown_event", testConfig);
    expect(result).toBeNull();
  });

  // Bot-loop prevention disabled
  test("does not skip agent comments when botLoopPrevention is disabled", () => {
    const disabledConfig = {
      ...testConfig,
      access: { ...testConfig.access, botLoopPrevention: false },
    };
    const event = {
      comment: { body: `/review\n${AGENT_SIGNATURE}` },
      issue: { number: 1 },
    };
    const result = route(event, "issue_comment", disabledConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("review");
  });
});
