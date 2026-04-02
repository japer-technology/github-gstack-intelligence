# 01 — Routing Tests

Validates that every GitHub event type is correctly routed to the expected skill
by `router.ts`. These tests cover the `parseSlashCommand()` function and the
`route()` function across all 17 skills.

---

## Unit Tests (bun test)

These tests run instantly with no API key. They are the primary routing
validation and are already implemented in `lifecycle/router.test.ts`. The test
cases below extend coverage to ensure completeness.

### RT-001: Slash Command Parsing — All 17 Commands

Run `parseSlashCommand()` for every valid command and assert the correct result.

```typescript
// In router.test.ts or a new file docs/test/scripts/routing.test.ts

import { describe, expect, test } from "bun:test";
import { parseSlashCommand } from "../../lifecycle/router";

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
```

**Expected:** All 17 commands produce a `SlashCommand` with the correct `skill`.

---

### RT-002: URL Commands Accept Valid URLs

```typescript
describe("RT-002: URL commands accept URLs", () => {
  const urlCommands = ["qa", "qa-only", "canary"];
  const urls = [
    "https://staging.example.com",
    "http://localhost:3000",
    "https://app.example.com/dashboard?tab=users",
  ];

  for (const cmd of urlCommands) {
    for (const url of urls) {
      test(`/${cmd} ${url} → url=${url}`, () => {
        const result = parseSlashCommand(`/${cmd} ${url}`);
        expect(result).not.toBeNull();
        expect(result!.url).toBe(url);
      });
    }
  }
});
```

**Expected:** URL is captured for `qa`, `qa-only`, and `canary` commands.

---

### RT-003: URL Commands Reject Invalid URLs

```typescript
describe("RT-003: URL commands reject non-URLs", () => {
  test("/qa with plain text returns skill without url", () => {
    const result = parseSlashCommand("/qa not-a-url");
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("qa");
    expect(result!.url).toBeUndefined();
  });

  test("/canary with plain text returns skill without url", () => {
    const result = parseSlashCommand("/canary some-text");
    expect(result).not.toBeNull();
    expect(result!.skill).toBe("canary");
    expect(result!.url).toBeUndefined();
  });
});
```

---

### RT-004: Non-URL Commands Capture Args

```typescript
describe("RT-004: Non-URL commands capture args", () => {
  test("/investigate some bug → args='some bug'", () => {
    const result = parseSlashCommand("/investigate some bug");
    expect(result!.args).toBe("some bug");
  });

  test("/retro 7d → args='7d'", () => {
    const result = parseSlashCommand("/retro 7d");
    expect(result!.args).toBe("7d");
  });

  test("/review with no args → args undefined", () => {
    const result = parseSlashCommand("/review");
    expect(result!.args).toBeUndefined();
  });
});
```

---

### RT-005: Edge Cases

```typescript
describe("RT-005: Edge cases", () => {
  test("empty string → null", () => {
    expect(parseSlashCommand("")).toBeNull();
  });

  test("plain text → null", () => {
    expect(parseSlashCommand("Hello world")).toBeNull();
  });

  test("unknown command → null", () => {
    expect(parseSlashCommand("/unknown")).toBeNull();
  });

  test("leading whitespace is trimmed", () => {
    const result = parseSlashCommand("   /review");
    expect(result!.skill).toBe("review");
  });

  test("only first line is parsed", () => {
    const result = parseSlashCommand("/review\nignore this line");
    expect(result!.skill).toBe("review");
    expect(result!.args).toBeUndefined();
  });

  test("case-insensitive command names", () => {
    const result = parseSlashCommand("/Review");
    expect(result!.skill).toBe("review");
  });

  test("command with trailing whitespace", () => {
    const result = parseSlashCommand("/review   ");
    expect(result!.skill).toBe("review");
  });
});
```

---

## Route Function Tests

### RT-010: pull_request → /review (default)

```typescript
test("RT-010: pull_request defaults to review", () => {
  const event = {
    pull_request: { number: 1, head: { ref: "feat" }, labels: [] },
  };
  const result = route(event, "pull_request", testConfig);
  expect(result!.skill).toBe("review");
  expect(result!.context.prNumber).toBe(1);
  expect(result!.context.branch).toBe("feat");
  expect(result!.needsBrowser).toBe(false);
  expect(result!.sessionMode).toBe("new");
});
```

### RT-011: pull_request + `security-audit` label → /cso

```typescript
test("RT-011: security-audit label routes to cso", () => {
  const event = {
    pull_request: {
      number: 2, head: { ref: "fix" },
      labels: [{ name: "security-audit" }],
    },
  };
  const result = route(event, "pull_request", testConfig);
  expect(result!.skill).toBe("cso");
});
```

### RT-012: pull_request + `design-review` label → /design-review

```typescript
test("RT-012: design-review label routes to design-review", () => {
  const event = {
    pull_request: {
      number: 3, head: { ref: "ui" },
      labels: [{ name: "design-review" }],
    },
  };
  const result = route(event, "pull_request", testConfig);
  expect(result!.skill).toBe("design-review");
  expect(result!.needsBrowser).toBe(true);
});
```

### RT-013: pull_request with diffStat

```typescript
test("RT-013: diffStat formatted correctly", () => {
  const event = {
    pull_request: {
      number: 4, head: { ref: "feat" }, labels: [],
      additions: 100, deletions: 20, changed_files: 5,
    },
  };
  const result = route(event, "pull_request", testConfig);
  expect(result!.context.diffStat).toBe("+100 -20 across 5 files");
});
```

### RT-014: security-audit label priority over default review

```typescript
test("RT-014: security-audit takes priority", () => {
  const event = {
    pull_request: {
      number: 5, head: { ref: "fix" },
      labels: [{ name: "security-audit" }, { name: "design-review" }],
    },
  };
  const result = route(event, "pull_request", testConfig);
  expect(result!.skill).toBe("cso");
});
```

---

### RT-020: issue_comment → slash command routing

For each of these slash commands via issue comment:

| Command | Expected Skill | needsBrowser | sessionMode |
|---|---|---|---|
| `/review` | review | false | new |
| `/cso` | cso | false | new |
| `/qa https://example.com` | qa | true | new |
| `/qa-only https://example.com` | qa-only | true | new |
| `/investigate` | investigate | false | new |
| `/ship` | ship | false | new |
| `/office-hours` | office-hours | false | new |
| `/plan-ceo-review` | plan-ceo-review | false | new |
| `/plan-eng-review` | plan-eng-review | false | new |
| `/plan-design-review` | plan-design-review | false | new |
| `/design-review` | design-review | true | new |
| `/design-consultation` | design-consultation | false | new |
| `/autoplan` | autoplan | false | **none** |
| `/retro` | retro (if enabled) | false | new |
| `/benchmark` | benchmark (if enabled) | false | new |
| `/document-release` | document-release | false | new |
| `/canary https://example.com` | canary (if enabled) | true | new |

```typescript
describe("RT-020: issue_comment slash command routing", () => {
  const cases = [
    { body: "/review", skill: "review", browser: false, session: "new" },
    { body: "/qa https://x.com", skill: "qa", browser: true, session: "new" },
    { body: "/ship", skill: "ship", browser: false, session: "new" },
    { body: "/autoplan", skill: "autoplan", browser: false, session: "none" },
    // ... all 17 commands
  ];

  for (const c of cases) {
    test(`/${c.skill} routes correctly`, () => {
      const event = { comment: { body: c.body }, issue: { number: 1 } };
      const result = route(event, "issue_comment", allEnabledConfig);
      expect(result!.skill).toBe(c.skill);
      expect(result!.needsBrowser).toBe(c.browser);
      expect(result!.sessionMode).toBe(c.session);
    });
  }
});
```

**Critical check:** `/autoplan` must have `sessionMode: "none"` (all others default to `"new"`).

---

### RT-030: issues (opened) → label-based routing

| Label | Expected Skill |
|---|---|
| `investigate` | investigate |
| `office-hours` | office-hours |
| `design-consultation` | design-consultation |
| `bug` (no mapping) | null (general conversation) |
| (no labels) | null |

```typescript
describe("RT-030: issues label routing", () => {
  test("investigate label → investigate skill", () => {
    const event = { issue: { number: 1, labels: [{ name: "investigate" }] } };
    const result = route(event, "issues", testConfig);
    expect(result!.skill).toBe("investigate");
  });

  test("no matching label → null", () => {
    const event = { issue: { number: 2, labels: [{ name: "bug" }] } };
    const result = route(event, "issues", testConfig);
    expect(result).toBeNull();
  });
});
```

---

### RT-031: issues (opened) → slash command in title

```typescript
test("RT-031: /investigate in title routes to investigate", () => {
  const event = {
    issue: { number: 10, title: "/investigate Memory leak", labels: [] },
  };
  const result = route(event, "issues", testConfig);
  expect(result!.skill).toBe("investigate");
  expect(result!.context.args).toBe("Memory leak");
});
```

### RT-032: Label takes priority over title slash command

```typescript
test("RT-032: label beats title slash command", () => {
  const event = {
    issue: {
      number: 11,
      title: "/review",
      labels: [{ name: "investigate" }],
    },
  };
  const result = route(event, "issues", testConfig);
  expect(result!.skill).toBe("investigate");
});
```

---

### RT-040: schedule event routing

```typescript
describe("RT-040: schedule routing", () => {
  test("Friday 5pm cron → retro (when enabled)", () => {
    const cfg = enableSkill(testConfig, "retro");
    const event = { schedule: "0 17 * * 5" };
    const result = route(event, "schedule", cfg);
    expect(result!.skill).toBe("retro");
    expect(result!.sessionMode).toBe("none");
  });

  test("daily 6am cron → benchmark (when enabled)", () => {
    const cfg = enableSkill(testConfig, "benchmark");
    const event = { schedule: "0 6 * * *" };
    const result = route(event, "schedule", cfg);
    expect(result!.skill).toBe("benchmark");
  });

  test("unknown cron → null", () => {
    const event = { schedule: "0 0 * * *" };
    const result = route(event, "schedule", testConfig);
    expect(result).toBeNull();
  });
});
```

---

### RT-050: release event routing

```typescript
test("RT-050: release → document-release", () => {
  const event = { release: { tag_name: "v1.0.0" } };
  const result = route(event, "release", testConfig);
  expect(result!.skill).toBe("document-release");
  expect(result!.needsBrowser).toBe(false);
  expect(result!.sessionMode).toBe("new");
});
```

---

### RT-060: deployment_status event routing

```typescript
describe("RT-060: deployment_status routing", () => {
  test("success → canary (when enabled)", () => {
    const cfg = enableSkill(testConfig, "canary");
    const event = {
      deployment_status: { state: "success" },
      deployment: { environment_url: "https://staging.example.com" },
    };
    const result = route(event, "deployment_status", cfg);
    expect(result!.skill).toBe("canary");
    expect(result!.needsBrowser).toBe(true);
    expect(result!.context.url).toBe("https://staging.example.com");
  });

  test("failure → null (even when enabled)", () => {
    const cfg = enableSkill(testConfig, "canary");
    const event = {
      deployment_status: { state: "failure" },
      deployment: { environment_url: "https://staging.example.com" },
    };
    const result = route(event, "deployment_status", cfg);
    expect(result).toBeNull();
  });

  test("success with target_url fallback", () => {
    const cfg = enableSkill(testConfig, "canary");
    const event = {
      deployment_status: { state: "success", target_url: "https://fallback.example.com" },
      deployment: {},
    };
    const result = route(event, "deployment_status", cfg);
    expect(result!.context.url).toBe("https://fallback.example.com");
  });
});
```

---

### RT-070: workflow_dispatch routing

```typescript
describe("RT-070: workflow_dispatch routing", () => {
  test("inputs.function=retro → retro", () => {
    const cfg = enableSkill(testConfig, "retro");
    const event = { inputs: { function: "retro" } };
    const result = route(event, "workflow_dispatch", cfg);
    expect(result!.skill).toBe("retro");
  });

  test("inputs.function=run-install → null (reserved)", () => {
    const event = { inputs: { function: "run-install" } };
    const result = route(event, "workflow_dispatch", testConfig);
    expect(result).toBeNull();
  });

  test("inputs.function=run-refresh-gstack → null (reserved)", () => {
    const event = { inputs: { function: "run-refresh-gstack" } };
    const result = route(event, "workflow_dispatch", testConfig);
    expect(result).toBeNull();
  });

  test("no inputs → null", () => {
    const event = {};
    const result = route(event, "workflow_dispatch", testConfig);
    expect(result).toBeNull();
  });
});
```

---

### RT-080: Browser skill classification

```typescript
describe("RT-080: needsBrowser flag", () => {
  const browserSkills = ["qa", "qa-only", "canary", "design-review"];
  const nonBrowserSkills = [
    "review", "cso", "investigate", "ship", "office-hours",
    "plan-ceo-review", "plan-eng-review", "plan-design-review",
    "design-consultation", "autoplan", "retro", "benchmark", "document-release",
  ];

  for (const skill of browserSkills) {
    test(`${skill} needs browser`, () => {
      // Route via issue_comment to check needsBrowser
      const event = { comment: { body: `/${skill}` }, issue: { number: 1 } };
      const cfg = enableSkill(testConfig, skill);
      const result = route(event, "issue_comment", cfg);
      expect(result!.needsBrowser).toBe(true);
    });
  }

  for (const skill of nonBrowserSkills) {
    test(`${skill} does not need browser`, () => {
      const event = { comment: { body: `/${skill}` }, issue: { number: 1 } };
      const cfg = enableSkill(testConfig, skill);
      const result = route(event, "issue_comment", cfg);
      expect(result!.needsBrowser).toBe(false);
    });
  }
});
```

---

### RT-090: Disabled skill returns null

```typescript
describe("RT-090: disabled skills return null", () => {
  test("disabled retro via schedule → null", () => {
    const event = { schedule: "0 17 * * 5" };
    const result = route(event, "schedule", testConfig); // retro disabled by default
    expect(result).toBeNull();
  });

  test("disabled canary via deployment → null", () => {
    const event = {
      deployment_status: { state: "success" },
      deployment: { environment_url: "https://x.com" },
    };
    const result = route(event, "deployment_status", testConfig); // canary disabled
    expect(result).toBeNull();
  });

  test("disabled skill via slash command → null", () => {
    const cfg = { ...testConfig, skills: { ...testConfig.skills, review: { enabled: false, trigger: "pull_request" } } };
    const event = { comment: { body: "/review" }, issue: { number: 1 } };
    const result = route(event, "issue_comment", cfg);
    expect(result).toBeNull();
  });
});
```

---

### RT-100: Unknown event type returns null

```typescript
test("RT-100: unknown event → null", () => {
  const result = route({}, "unknown_event", testConfig);
  expect(result).toBeNull();
});
```
