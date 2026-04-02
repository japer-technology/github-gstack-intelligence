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

  // pull_request → review with diffStat
  test("includes diffStat in pull_request route context", () => {
    const event = {
      pull_request: {
        number: 7,
        head: { ref: "diff-branch" },
        labels: [],
        additions: 42,
        deletions: 10,
        changed_files: 3,
      },
    };
    const result = route(event, "pull_request", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("review");
    expect(result!.context.diffStat).toBe("+42 -10 across 3 files");
  });

  // pull_request → review without diff stats
  test("omits diffStat when PR payload lacks additions field", () => {
    const event = {
      pull_request: {
        number: 8,
        head: { ref: "no-stats" },
        labels: [],
      },
    };
    const result = route(event, "pull_request", testConfig);
    expect(result).not.toBeNull();
    expect(result!.context.diffStat).toBeUndefined();
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

  // Conversation skill routing (Phase 4)

  test("routes issue with design-consultation label to design-consultation", () => {
    const event = {
      issue: {
        number: 40,
        labels: [{ name: "design-consultation" }],
      },
    };
    const result = route(event, "issues", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("design-consultation");
    expect(result!.context.issueNumber).toBe(40);
    expect(result!.needsBrowser).toBe(false);
    expect(result!.sessionMode).toBe("new");
  });

  test("routes /plan-ceo-review command from issue comment", () => {
    const event = {
      comment: { body: "/plan-ceo-review" },
      issue: { number: 50 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("plan-ceo-review");
    expect(result!.context.issueNumber).toBe(50);
    expect(result!.needsBrowser).toBe(false);
    expect(result!.sessionMode).toBe("new");
  });

  test("routes /plan-eng-review command from issue comment", () => {
    const event = {
      comment: { body: "/plan-eng-review" },
      issue: { number: 51 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("plan-eng-review");
    expect(result!.context.issueNumber).toBe(51);
    expect(result!.needsBrowser).toBe(false);
    expect(result!.sessionMode).toBe("new");
  });

  test("routes /autoplan command with sessionMode none", () => {
    const event = {
      comment: { body: "/autoplan" },
      issue: { number: 60 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("autoplan");
    expect(result!.context.issueNumber).toBe(60);
    expect(result!.needsBrowser).toBe(false);
    expect(result!.sessionMode).toBe("none");
  });

  test("routes /design-consultation command from issue comment", () => {
    const event = {
      comment: { body: "/design-consultation" },
      issue: { number: 70 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("design-consultation");
    expect(result!.context.issueNumber).toBe(70);
    expect(result!.needsBrowser).toBe(false);
    expect(result!.sessionMode).toBe("new");
  });

  test("non-autoplan commands still use sessionMode new", () => {
    const event = {
      comment: { body: "/plan-ceo-review" },
      issue: { number: 80 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).not.toBeNull();
    expect(result!.sessionMode).toBe("new");
  });

  // ── Scheduled & Event-Driven skill routing (Phase 5) ────────────────────

  // schedule → retro (enabled)
  test("routes schedule event to retro when enabled", () => {
    const enabledConfig = {
      ...testConfig,
      skills: { ...testConfig.skills, retro: { enabled: true, trigger: "schedule", schedule: "0 17 * * 5" } },
    };
    const event = { schedule: "0 17 * * 5" };
    const result = route(event, "schedule", enabledConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("retro");
    expect(result!.needsBrowser).toBe(false);
    expect(result!.sessionMode).toBe("none");
  });

  // schedule → benchmark (enabled)
  test("routes schedule event to benchmark when enabled", () => {
    const enabledConfig = {
      ...testConfig,
      skills: { ...testConfig.skills, benchmark: { enabled: true, trigger: "schedule", schedule: "0 6 * * *" } },
    };
    const event = { schedule: "0 6 * * *" };
    const result = route(event, "schedule", enabledConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("benchmark");
    expect(result!.needsBrowser).toBe(false);
    expect(result!.sessionMode).toBe("none");
  });

  // schedule → no match for unknown cron
  test("returns null for schedule with unmatched cron pattern", () => {
    const enabledConfig = {
      ...testConfig,
      skills: { ...testConfig.skills, retro: { enabled: true, trigger: "schedule", schedule: "0 17 * * 5" } },
    };
    const event = { schedule: "0 0 * * *" };
    const result = route(event, "schedule", enabledConfig);
    expect(result).toBeNull();
  });

  // deployment_status → canary (enabled, success)
  test("routes deployment_status success to canary when enabled", () => {
    const enabledConfig = {
      ...testConfig,
      skills: { ...testConfig.skills, canary: { enabled: true, trigger: "deployment_status" } },
    };
    const event = {
      deployment_status: { state: "success" },
      deployment: { environment_url: "https://canary.example.com" },
    };
    const result = route(event, "deployment_status", enabledConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("canary");
    expect(result!.needsBrowser).toBe(true);
    expect(result!.context.url).toBe("https://canary.example.com");
    expect(result!.sessionMode).toBe("new");
  });

  // deployment_status → canary uses target_url fallback
  test("routes deployment_status with target_url fallback", () => {
    const enabledConfig = {
      ...testConfig,
      skills: { ...testConfig.skills, canary: { enabled: true, trigger: "deployment_status" } },
    };
    const event = {
      deployment_status: { state: "success", target_url: "https://fallback.example.com" },
      deployment: {},
    };
    const result = route(event, "deployment_status", enabledConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("canary");
    expect(result!.context.url).toBe("https://fallback.example.com");
  });

  // deployment_status → skip non-success
  test("returns null for deployment_status with non-success state", () => {
    const enabledConfig = {
      ...testConfig,
      skills: { ...testConfig.skills, canary: { enabled: true, trigger: "deployment_status" } },
    };
    const event = {
      deployment_status: { state: "failure" },
      deployment: { environment_url: "https://canary.example.com" },
    };
    const result = route(event, "deployment_status", enabledConfig);
    expect(result).toBeNull();
  });

  // release → document-release (with context)
  test("routes release event to document-release with sessionMode new", () => {
    const event = { release: { tag_name: "v2.0.0", body: "Release notes" } };
    const result = route(event, "release", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("document-release");
    expect(result!.needsBrowser).toBe(false);
    expect(result!.sessionMode).toBe("new");
  });

  // release → disabled document-release
  test("returns null for release event when document-release is disabled", () => {
    const disabledConfig = {
      ...testConfig,
      skills: { ...testConfig.skills, "document-release": { enabled: false, trigger: "release" } },
    };
    const event = { release: { tag_name: "v1.0.0" } };
    const result = route(event, "release", disabledConfig);
    expect(result).toBeNull();
  });

  // /ship slash command routing
  test("routes /ship with issueNumber context", () => {
    const event = {
      comment: { body: "/ship" },
      issue: { number: 99 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("ship");
    expect(result!.context.issueNumber).toBe(99);
    expect(result!.needsBrowser).toBe(false);
    expect(result!.sessionMode).toBe("new");
  });

  // /canary slash command via issue_comment
  test("routes /canary slash command with URL from issue comment", () => {
    const enabledConfig = {
      ...testConfig,
      skills: { ...testConfig.skills, canary: { enabled: true, trigger: "deployment_status" } },
    };
    const event = {
      comment: { body: "/canary https://staging.example.com" },
      issue: { number: 42 },
    };
    const result = route(event, "issue_comment", enabledConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("canary");
    expect(result!.needsBrowser).toBe(true);
    expect(result!.context.url).toBe("https://staging.example.com");
  });

  // /document-release slash command via issue_comment
  test("routes /document-release slash command from issue comment", () => {
    const event = {
      comment: { body: "/document-release" },
      issue: { number: 55 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("document-release");
    expect(result!.context.issueNumber).toBe(55);
    expect(result!.needsBrowser).toBe(false);
  });

  // /retro and /benchmark via issue_comment (when enabled)
  test("routes /retro slash command when enabled", () => {
    const enabledConfig = {
      ...testConfig,
      skills: { ...testConfig.skills, retro: { enabled: true, trigger: "schedule", schedule: "0 17 * * 5" } },
    };
    const event = {
      comment: { body: "/retro" },
      issue: { number: 101 },
    };
    const result = route(event, "issue_comment", enabledConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("retro");
    expect(result!.context.issueNumber).toBe(101);
  });

  test("routes /benchmark slash command when enabled", () => {
    const enabledConfig = {
      ...testConfig,
      skills: { ...testConfig.skills, benchmark: { enabled: true, trigger: "schedule", schedule: "0 6 * * *" } },
    };
    const event = {
      comment: { body: "/benchmark" },
      issue: { number: 102 },
    };
    const result = route(event, "issue_comment", enabledConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("benchmark");
    expect(result!.context.issueNumber).toBe(102);
  });

  // workflow_dispatch → scheduled skills
  test("routes workflow_dispatch with retro function input", () => {
    const enabledConfig = {
      ...testConfig,
      skills: { ...testConfig.skills, retro: { enabled: true, trigger: "schedule", schedule: "0 17 * * 5" } },
    };
    const event = { inputs: { function: "retro" } };
    const result = route(event, "workflow_dispatch", enabledConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("retro");
    expect(result!.sessionMode).toBe("new");
  });

  // ── Slash command in issue title (issues event) ──────────────────────────

  test("routes issue with /investigate in title to investigate skill", () => {
    const event = {
      issue: {
        number: 200,
        title: "/investigate The Investigation",
        labels: [],
      },
    };
    const result = route(event, "issues", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("investigate");
    expect(result!.context.issueNumber).toBe(200);
    expect(result!.context.args).toBe("The Investigation");
    expect(result!.sessionMode).toBe("new");
  });

  test("routes issue with /qa in title to qa skill", () => {
    const event = {
      issue: {
        number: 201,
        title: "/qa",
        labels: [],
      },
    };
    const result = route(event, "issues", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("qa");
    expect(result!.context.issueNumber).toBe(201);
  });

  test("label-based routing takes priority over title slash command", () => {
    const event = {
      issue: {
        number: 202,
        title: "/review",
        labels: [{ name: "investigate" }],
      },
    };
    const result = route(event, "issues", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("investigate");
  });

  test("returns null for issue with unknown slash command in title", () => {
    const event = {
      issue: {
        number: 203,
        title: "/unknown-command",
        labels: [],
      },
    };
    const result = route(event, "issues", testConfig);
    expect(result).toBeNull();
  });

  test("returns null for issue title with disabled skill slash command", () => {
    const event = {
      issue: {
        number: 204,
        title: "/retro",
        labels: [],
      },
    };
    const result = route(event, "issues", testConfig);
    expect(result).toBeNull();
  });

  // ── Args passed through in issue_comment context ─────────────────────────

  test("passes args through in issue_comment context", () => {
    const event = {
      comment: { body: "/investigate some bug description" },
      issue: { number: 300 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("investigate");
    expect(result!.context.args).toBe("some bug description");
    expect(result!.context.issueNumber).toBe(300);
  });

  test("args are undefined when no args provided in slash command", () => {
    const event = {
      comment: { body: "/investigate" },
      issue: { number: 301 },
    };
    const result = route(event, "issue_comment", testConfig);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("investigate");
    expect(result!.context.args).toBeUndefined();
  });
});
