/**
 * routing.test.ts — Definitive routing tests for all 17 skills.
 *
 * Covers: slash command parsing, event routing, browser flag, session mode,
 * disabled skills, bot-loop prevention, and edge cases.
 *
 * Run with: cd .github-gstack-intelligence && bun test docs/test/scripts/routing.test.ts
 */

import { describe, expect, test } from "bun:test";
import {
  parseSlashCommand,
  route,
  loadConfig,
  AGENT_SIGNATURE,
} from "../../../lifecycle/router";
import type { Config, SkillConfig } from "../../../lifecycle/router";

// ─── Test Helpers ───────────────────────────────────────────────────────────

/** Base test config with all skills enabled for comprehensive testing. */
const allEnabledConfig: Config = {
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
    "qa-only": { enabled: true, trigger: "issue_comment" },
    investigate: { enabled: true, trigger: "issue_label", label: "investigate" },
    "office-hours": { enabled: true, trigger: "issue_label", label: "office-hours" },
    "design-consultation": { enabled: true, trigger: "issue_label", label: "design-consultation" },
    ship: { enabled: true, trigger: "issue_comment" },
    "design-review": { enabled: true, trigger: "pull_request", labelGated: true, label: "design-review" },
    "plan-ceo-review": { enabled: true, trigger: "issue_comment" },
    "plan-eng-review": { enabled: true, trigger: "issue_comment" },
    "plan-design-review": { enabled: true, trigger: "issue_comment" },
    autoplan: { enabled: true, trigger: "issue_comment" },
    retro: { enabled: true, trigger: "schedule", schedule: "0 17 * * 5" },
    benchmark: { enabled: true, trigger: "schedule", schedule: "0 6 * * *" },
    "document-release": { enabled: true, trigger: "release" },
    canary: { enabled: true, trigger: "deployment_status" },
  },
};

/** Create a config with a specific skill disabled. */
function disableSkill(config: Config, skill: string): Config {
  return {
    ...config,
    skills: {
      ...config.skills,
      [skill]: { ...config.skills[skill], enabled: false },
    },
  };
}

// ─── RT-001: All 17 Slash Commands Parse ────────────────────────────────────

describe("RT-001: All 17 slash commands parse correctly", () => {
  const commands = [
    "review", "cso", "qa", "qa-only", "investigate", "ship",
    "office-hours", "plan-ceo-review", "plan-eng-review",
    "design-review", "plan-design-review", "design-consultation",
    "autoplan", "retro", "benchmark", "document-release", "canary",
  ];

  for (const cmd of commands) {
    test(`parses /${cmd}`, () => {
      const result = parseSlashCommand(`/${cmd}`);
      expect(result).not.toBeNull();
      expect(result!.skill).toBe(cmd);
    });
  }
});

// ─── RT-002: URL Commands Accept Valid URLs ─────────────────────────────────

describe("RT-002: URL commands accept valid URLs", () => {
  const urlCommands = ["qa", "qa-only", "canary"];
  const urls = [
    "https://staging.example.com",
    "http://localhost:3000",
    "https://app.example.com/dashboard?tab=users&page=1",
  ];

  for (const cmd of urlCommands) {
    for (const url of urls) {
      test(`/${cmd} ${url}`, () => {
        const result = parseSlashCommand(`/${cmd} ${url}`);
        expect(result).not.toBeNull();
        expect(result!.skill).toBe(cmd);
        expect(result!.url).toBe(url);
      });
    }
  }
});

// ─── RT-003: URL Commands Reject Non-URLs ───────────────────────────────────

describe("RT-003: URL commands reject non-URLs", () => {
  const urlCommands = ["qa", "qa-only", "canary"];

  for (const cmd of urlCommands) {
    test(`/${cmd} with non-URL text → no url field`, () => {
      const result = parseSlashCommand(`/${cmd} not-a-url`);
      expect(result).not.toBeNull();
      expect(result!.skill).toBe(cmd);
      expect(result!.url).toBeUndefined();
    });
  }
});

// ─── RT-004: Non-URL Commands Capture Args ──────────────────────────────────

describe("RT-004: non-URL commands capture args", () => {
  test("/investigate some bug → args='some bug'", () => {
    const result = parseSlashCommand("/investigate some bug");
    expect(result!.skill).toBe("investigate");
    expect(result!.args).toBe("some bug");
  });

  test("/retro 7d → args='7d'", () => {
    const result = parseSlashCommand("/retro 7d");
    expect(result!.skill).toBe("retro");
    expect(result!.args).toBe("7d");
  });

  test("/ship with no args → args undefined", () => {
    const result = parseSlashCommand("/ship");
    expect(result!.args).toBeUndefined();
  });

  test("/review with no args → args undefined", () => {
    const result = parseSlashCommand("/review");
    expect(result!.args).toBeUndefined();
  });
});

// ─── RT-005: Edge Cases ─────────────────────────────────────────────────────

describe("RT-005: slash command edge cases", () => {
  test("empty string → null", () => {
    expect(parseSlashCommand("")).toBeNull();
  });

  test("plain text → null", () => {
    expect(parseSlashCommand("Hello world")).toBeNull();
  });

  test("unknown command → null", () => {
    expect(parseSlashCommand("/unknown")).toBeNull();
  });

  test("leading whitespace trimmed", () => {
    expect(parseSlashCommand("   /review")!.skill).toBe("review");
  });

  test("only first line parsed", () => {
    const result = parseSlashCommand("/review\nThis is extra context");
    expect(result!.skill).toBe("review");
    expect(result!.args).toBeUndefined();
  });

  test("case-insensitive", () => {
    expect(parseSlashCommand("/Review")!.skill).toBe("review");
    expect(parseSlashCommand("/CSO")!.skill).toBe("cso");
    expect(parseSlashCommand("/QA")!.skill).toBe("qa");
  });

  test("trailing whitespace on command", () => {
    expect(parseSlashCommand("/review   ")!.skill).toBe("review");
  });

  test("slash in middle of text → null", () => {
    expect(parseSlashCommand("Please run /review")).toBeNull();
  });
});

// ─── RT-010–014: pull_request Routing ───────────────────────────────────────

describe("RT-010: pull_request routing", () => {
  test("RT-010: defaults to review", () => {
    const event = {
      pull_request: { number: 1, head: { ref: "feat" }, labels: [] },
    };
    const result = route(event, "pull_request", allEnabledConfig);
    expect(result!.skill).toBe("review");
    expect(result!.context.prNumber).toBe(1);
    expect(result!.context.branch).toBe("feat");
    expect(result!.needsBrowser).toBe(false);
    expect(result!.sessionMode).toBe("new");
  });

  test("RT-011: security-audit label → cso", () => {
    const event = {
      pull_request: {
        number: 2,
        head: { ref: "fix" },
        labels: [{ name: "security-audit" }],
      },
    };
    const result = route(event, "pull_request", allEnabledConfig);
    expect(result!.skill).toBe("cso");
    expect(result!.needsBrowser).toBe(false);
  });

  test("RT-012: design-review label → design-review", () => {
    const event = {
      pull_request: {
        number: 3,
        head: { ref: "ui" },
        labels: [{ name: "design-review" }],
      },
    };
    const result = route(event, "pull_request", allEnabledConfig);
    expect(result!.skill).toBe("design-review");
    expect(result!.needsBrowser).toBe(true);
  });

  test("RT-013: diffStat formatted correctly", () => {
    const event = {
      pull_request: {
        number: 4,
        head: { ref: "feat" },
        labels: [],
        additions: 100,
        deletions: 20,
        changed_files: 5,
      },
    };
    const result = route(event, "pull_request", allEnabledConfig);
    expect(result!.context.diffStat).toBe("+100 -20 across 5 files");
  });

  test("RT-013b: missing diff stats → undefined diffStat", () => {
    const event = {
      pull_request: { number: 5, head: { ref: "feat" }, labels: [] },
    };
    const result = route(event, "pull_request", allEnabledConfig);
    expect(result!.context.diffStat).toBeUndefined();
  });

  test("RT-014: security-audit takes priority over design-review", () => {
    const event = {
      pull_request: {
        number: 6,
        head: { ref: "fix" },
        labels: [{ name: "security-audit" }, { name: "design-review" }],
      },
    };
    const result = route(event, "pull_request", allEnabledConfig);
    expect(result!.skill).toBe("cso");
  });
});

// ─── RT-020: issue_comment Slash Command Routing ────────────────────────────

describe("RT-020: issue_comment routing for all skills", () => {
  const cases: Array<{
    body: string;
    skill: string;
    needsBrowser: boolean;
    sessionMode: string;
  }> = [
    { body: "/review", skill: "review", needsBrowser: false, sessionMode: "new" },
    { body: "/cso", skill: "cso", needsBrowser: false, sessionMode: "new" },
    { body: "/qa https://example.com", skill: "qa", needsBrowser: true, sessionMode: "new" },
    { body: "/qa-only https://example.com", skill: "qa-only", needsBrowser: true, sessionMode: "new" },
    { body: "/investigate", skill: "investigate", needsBrowser: false, sessionMode: "new" },
    { body: "/ship", skill: "ship", needsBrowser: false, sessionMode: "new" },
    { body: "/office-hours", skill: "office-hours", needsBrowser: false, sessionMode: "new" },
    { body: "/plan-ceo-review", skill: "plan-ceo-review", needsBrowser: false, sessionMode: "new" },
    { body: "/plan-eng-review", skill: "plan-eng-review", needsBrowser: false, sessionMode: "new" },
    { body: "/plan-design-review", skill: "plan-design-review", needsBrowser: false, sessionMode: "new" },
    { body: "/design-review", skill: "design-review", needsBrowser: true, sessionMode: "new" },
    { body: "/design-consultation", skill: "design-consultation", needsBrowser: false, sessionMode: "new" },
    { body: "/autoplan", skill: "autoplan", needsBrowser: false, sessionMode: "none" },
    { body: "/retro", skill: "retro", needsBrowser: false, sessionMode: "new" },
    { body: "/benchmark", skill: "benchmark", needsBrowser: false, sessionMode: "new" },
    { body: "/document-release", skill: "document-release", needsBrowser: false, sessionMode: "new" },
    { body: "/canary https://example.com", skill: "canary", needsBrowser: true, sessionMode: "new" },
  ];

  for (const c of cases) {
    test(`/${c.skill} → skill=${c.skill}, browser=${c.needsBrowser}, session=${c.sessionMode}`, () => {
      const event = { comment: { body: c.body }, issue: { number: 1 } };
      const result = route(event, "issue_comment", allEnabledConfig);
      expect(result).not.toBeNull();
      expect(result!.skill).toBe(c.skill);
      expect(result!.needsBrowser).toBe(c.needsBrowser);
      expect(result!.sessionMode).toBe(c.sessionMode);
    });
  }

  test("plain text → null (general conversation)", () => {
    const event = { comment: { body: "Hello, can you help?" }, issue: { number: 1 } };
    const result = route(event, "issue_comment", allEnabledConfig);
    expect(result).toBeNull();
  });

  test("URL and issueNumber in context", () => {
    const event = { comment: { body: "/qa https://staging.example.com" }, issue: { number: 42 } };
    const result = route(event, "issue_comment", allEnabledConfig);
    expect(result!.context.url).toBe("https://staging.example.com");
    expect(result!.context.issueNumber).toBe(42);
  });

  test("args passed through", () => {
    const event = { comment: { body: "/investigate memory leak" }, issue: { number: 300 } };
    const result = route(event, "issue_comment", allEnabledConfig);
    expect(result!.context.args).toBe("memory leak");
    expect(result!.context.issueNumber).toBe(300);
  });
});

// ─── RT-030: issues (opened) Label Routing ──────────────────────────────────

describe("RT-030: issues label routing", () => {
  test("investigate label → investigate", () => {
    const event = { issue: { number: 20, labels: [{ name: "investigate" }] } };
    const result = route(event, "issues", allEnabledConfig);
    expect(result!.skill).toBe("investigate");
    expect(result!.context.issueNumber).toBe(20);
  });

  test("office-hours label → office-hours", () => {
    const event = { issue: { number: 30, labels: [{ name: "office-hours" }] } };
    const result = route(event, "issues", allEnabledConfig);
    expect(result!.skill).toBe("office-hours");
  });

  test("design-consultation label → design-consultation", () => {
    const event = { issue: { number: 40, labels: [{ name: "design-consultation" }] } };
    const result = route(event, "issues", allEnabledConfig);
    expect(result!.skill).toBe("design-consultation");
    expect(result!.needsBrowser).toBe(false);
  });

  test("no matching label → null", () => {
    const event = { issue: { number: 50, labels: [{ name: "bug" }] } };
    const result = route(event, "issues", allEnabledConfig);
    expect(result).toBeNull();
  });

  test("no labels → null", () => {
    const event = { issue: { number: 60, labels: [] } };
    const result = route(event, "issues", allEnabledConfig);
    expect(result).toBeNull();
  });
});

// ─── RT-031–032: Issue Title Slash Commands ─────────────────────────────────

describe("RT-031: issue title slash commands", () => {
  test("title /investigate → investigate with args", () => {
    const event = {
      issue: { number: 200, title: "/investigate Memory leak", labels: [] },
    };
    const result = route(event, "issues", allEnabledConfig);
    expect(result!.skill).toBe("investigate");
    expect(result!.context.args).toBe("Memory leak");
  });

  test("title /qa → qa", () => {
    const event = {
      issue: { number: 201, title: "/qa", labels: [] },
    };
    const result = route(event, "issues", allEnabledConfig);
    expect(result!.skill).toBe("qa");
  });

  test("RT-032: label beats title slash command", () => {
    const event = {
      issue: { number: 202, title: "/review", labels: [{ name: "investigate" }] },
    };
    const result = route(event, "issues", allEnabledConfig);
    expect(result!.skill).toBe("investigate");
  });

  test("unknown command in title → null", () => {
    const event = {
      issue: { number: 203, title: "/unknown-command", labels: [] },
    };
    const result = route(event, "issues", allEnabledConfig);
    expect(result).toBeNull();
  });

  test("disabled skill in title → null", () => {
    const cfg = disableSkill(allEnabledConfig, "investigate");
    const event = {
      issue: { number: 204, title: "/investigate", labels: [] },
    };
    const result = route(event, "issues", cfg);
    expect(result).toBeNull();
  });
});

// ─── RT-040: Schedule Routing ───────────────────────────────────────────────

describe("RT-040: schedule routing", () => {
  test("Friday 5pm → retro", () => {
    const event = { schedule: "0 17 * * 5" };
    const result = route(event, "schedule", allEnabledConfig);
    expect(result!.skill).toBe("retro");
    expect(result!.sessionMode).toBe("none");
    expect(result!.needsBrowser).toBe(false);
  });

  test("daily 6am → benchmark", () => {
    const event = { schedule: "0 6 * * *" };
    const result = route(event, "schedule", allEnabledConfig);
    expect(result!.skill).toBe("benchmark");
    expect(result!.sessionMode).toBe("none");
  });

  test("unmatched cron → null", () => {
    const event = { schedule: "0 0 * * *" };
    const result = route(event, "schedule", allEnabledConfig);
    expect(result).toBeNull();
  });

  test("disabled retro → null", () => {
    const cfg = disableSkill(allEnabledConfig, "retro");
    const event = { schedule: "0 17 * * 5" };
    const result = route(event, "schedule", cfg);
    expect(result).toBeNull();
  });
});

// ─── RT-050: Release Routing ────────────────────────────────────────────────

describe("RT-050: release routing", () => {
  test("release → document-release", () => {
    const event = { release: { tag_name: "v1.0.0" } };
    const result = route(event, "release", allEnabledConfig);
    expect(result!.skill).toBe("document-release");
    expect(result!.needsBrowser).toBe(false);
    expect(result!.sessionMode).toBe("new");
  });

  test("disabled document-release → null", () => {
    const cfg = disableSkill(allEnabledConfig, "document-release");
    const event = { release: { tag_name: "v1.0.0" } };
    const result = route(event, "release", cfg);
    expect(result).toBeNull();
  });
});

// ─── RT-060: Deployment Status Routing ──────────────────────────────────────

describe("RT-060: deployment_status routing", () => {
  test("success → canary with environment_url", () => {
    const event = {
      deployment_status: { state: "success" },
      deployment: { environment_url: "https://staging.example.com" },
    };
    const result = route(event, "deployment_status", allEnabledConfig);
    expect(result!.skill).toBe("canary");
    expect(result!.needsBrowser).toBe(true);
    expect(result!.context.url).toBe("https://staging.example.com");
    expect(result!.sessionMode).toBe("new");
  });

  test("success with target_url fallback", () => {
    const event = {
      deployment_status: { state: "success", target_url: "https://fallback.example.com" },
      deployment: {},
    };
    const result = route(event, "deployment_status", allEnabledConfig);
    expect(result!.context.url).toBe("https://fallback.example.com");
  });

  test("environment_url takes priority over target_url", () => {
    const event = {
      deployment_status: { state: "success", target_url: "https://fallback.com" },
      deployment: { environment_url: "https://primary.com" },
    };
    const result = route(event, "deployment_status", allEnabledConfig);
    expect(result!.context.url).toBe("https://primary.com");
  });

  test("failure → null", () => {
    const event = {
      deployment_status: { state: "failure" },
      deployment: { environment_url: "https://x.com" },
    };
    const result = route(event, "deployment_status", allEnabledConfig);
    expect(result).toBeNull();
  });

  test("pending → null", () => {
    const event = {
      deployment_status: { state: "pending" },
      deployment: { environment_url: "https://x.com" },
    };
    const result = route(event, "deployment_status", allEnabledConfig);
    expect(result).toBeNull();
  });

  test("disabled canary → null", () => {
    const cfg = disableSkill(allEnabledConfig, "canary");
    const event = {
      deployment_status: { state: "success" },
      deployment: { environment_url: "https://x.com" },
    };
    const result = route(event, "deployment_status", cfg);
    expect(result).toBeNull();
  });
});

// ─── RT-070: workflow_dispatch Routing ───────────────────────────────────────

describe("RT-070: workflow_dispatch routing", () => {
  test("function=retro → retro", () => {
    const event = { inputs: { function: "retro" } };
    const result = route(event, "workflow_dispatch", allEnabledConfig);
    expect(result!.skill).toBe("retro");
    expect(result!.sessionMode).toBe("new");
  });

  test("function=benchmark → benchmark", () => {
    const event = { inputs: { function: "benchmark" } };
    const result = route(event, "workflow_dispatch", allEnabledConfig);
    expect(result!.skill).toBe("benchmark");
  });

  test("function=review → review", () => {
    const event = { inputs: { function: "review" } };
    const result = route(event, "workflow_dispatch", allEnabledConfig);
    expect(result!.skill).toBe("review");
  });

  test("function=run-install → null (reserved)", () => {
    const event = { inputs: { function: "run-install" } };
    const result = route(event, "workflow_dispatch", allEnabledConfig);
    expect(result).toBeNull();
  });

  test("function=run-refresh-gstack → null (reserved)", () => {
    const event = { inputs: { function: "run-refresh-gstack" } };
    const result = route(event, "workflow_dispatch", allEnabledConfig);
    expect(result).toBeNull();
  });

  test("no inputs → null", () => {
    const event = {};
    const result = route(event, "workflow_dispatch", allEnabledConfig);
    expect(result).toBeNull();
  });

  test("empty function → null", () => {
    const event = { inputs: { function: "" } };
    const result = route(event, "workflow_dispatch", allEnabledConfig);
    expect(result).toBeNull();
  });
});

// ─── RT-080: needsBrowser Flag ──────────────────────────────────────────────

describe("RT-080: needsBrowser classification", () => {
  const browserSkills = ["qa", "qa-only", "canary", "design-review"];
  const nonBrowserSkills = [
    "review", "cso", "investigate", "ship", "office-hours",
    "plan-ceo-review", "plan-eng-review", "plan-design-review",
    "design-consultation", "autoplan", "retro", "benchmark", "document-release",
  ];

  for (const skill of browserSkills) {
    test(`${skill} → needsBrowser=true`, () => {
      const event = { comment: { body: `/${skill}` }, issue: { number: 1 } };
      const result = route(event, "issue_comment", allEnabledConfig);
      expect(result).not.toBeNull();
      expect(result!.needsBrowser).toBe(true);
    });
  }

  for (const skill of nonBrowserSkills) {
    test(`${skill} → needsBrowser=false`, () => {
      const event = { comment: { body: `/${skill}` }, issue: { number: 1 } };
      const result = route(event, "issue_comment", allEnabledConfig);
      expect(result).not.toBeNull();
      expect(result!.needsBrowser).toBe(false);
    });
  }
});

// ─── RT-090: Disabled Skills Return Null ────────────────────────────────────

describe("RT-090: disabled skills return null", () => {
  const allSkills = Object.keys(allEnabledConfig.skills);

  for (const skill of allSkills) {
    test(`disabled ${skill} via slash command → null`, () => {
      const cfg = disableSkill(allEnabledConfig, skill);
      const event = { comment: { body: `/${skill}` }, issue: { number: 1 } };
      const result = route(event, "issue_comment", cfg);
      expect(result).toBeNull();
    });
  }

  test("skill not in config → null", () => {
    const cfg = { ...allEnabledConfig, skills: {} };
    const event = { comment: { body: "/review" }, issue: { number: 1 } };
    const result = route(event, "issue_comment", cfg);
    expect(result).toBeNull();
  });
});

// ─── RT-100: Unknown Event ──────────────────────────────────────────────────

describe("RT-100: unknown events", () => {
  test("unknown event type → null", () => {
    expect(route({}, "unknown_event", allEnabledConfig)).toBeNull();
  });

  test("push event → null (not routed)", () => {
    expect(route({}, "push", allEnabledConfig)).toBeNull();
  });

  test("fork event → null", () => {
    expect(route({}, "fork", allEnabledConfig)).toBeNull();
  });
});

// ─── SG-001–005: Bot-Loop Prevention ────────────────────────────────────────

describe("SG: bot-loop prevention", () => {
  test("SG-001: agent signature in comment → null", () => {
    const event = {
      comment: { body: `Review done\n${AGENT_SIGNATURE}` },
      issue: { number: 1 },
    };
    expect(route(event, "issue_comment", allEnabledConfig)).toBeNull();
  });

  test("SG-002: normal comment processed", () => {
    const event = {
      comment: { body: "/review" },
      issue: { number: 1 },
    };
    expect(route(event, "issue_comment", allEnabledConfig)).not.toBeNull();
  });

  test("SG-003: disabled botLoopPrevention allows agent comments", () => {
    const cfg = {
      ...allEnabledConfig,
      access: { ...allEnabledConfig.access, botLoopPrevention: false },
    };
    const event = {
      comment: { body: `/review\n${AGENT_SIGNATURE}` },
      issue: { number: 1 },
    };
    const result = route(event, "issue_comment", cfg);
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("review");
  });

  test("SG-005: AGENT_SIGNATURE constant value", () => {
    expect(AGENT_SIGNATURE).toBe("<!-- github-gstack-intelligence-agent -->");
  });

  test("signature at start of comment → still skipped", () => {
    const event = {
      comment: { body: `${AGENT_SIGNATURE}\n/review` },
      issue: { number: 1 },
    };
    expect(route(event, "issue_comment", allEnabledConfig)).toBeNull();
  });

  test("signature in middle of comment → still skipped", () => {
    const event = {
      comment: { body: `Here is my analysis\n${AGENT_SIGNATURE}\nDone.` },
      issue: { number: 1 },
    };
    expect(route(event, "issue_comment", allEnabledConfig)).toBeNull();
  });
});

// ─── SG-070: Config Loading ─────────────────────────────────────────────────

describe("SG-070: config loading", () => {
  test("missing config.json throws", () => {
    expect(() => loadConfig("/nonexistent/path")).toThrow();
  });
});

// ─── SP-011: Autoplan Session Mode ──────────────────────────────────────────

describe("SP-011: autoplan special handling", () => {
  test("autoplan has sessionMode=none", () => {
    const event = { comment: { body: "/autoplan" }, issue: { number: 60 } };
    const result = route(event, "issue_comment", allEnabledConfig);
    expect(result!.skill).toBe("autoplan");
    expect(result!.sessionMode).toBe("none");
  });

  test("all other skills have sessionMode=new (via issue_comment)", () => {
    const nonAutoplanSkills = Object.keys(allEnabledConfig.skills).filter(s => s !== "autoplan");
    for (const skill of nonAutoplanSkills) {
      const event = { comment: { body: `/${skill}` }, issue: { number: 1 } };
      const result = route(event, "issue_comment", allEnabledConfig);
      if (result) {
        expect(result.sessionMode).toBe("new");
      }
    }
  });
});
