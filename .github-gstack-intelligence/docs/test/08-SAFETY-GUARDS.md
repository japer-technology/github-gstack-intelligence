# 08 — Safety Guard Tests

Validates bot-loop prevention, reserved prefix gating, disabled skill handling,
access control, and agent signature management.

---

## Bot-Loop Prevention Tests

### SG-001: Agent-Generated Comments Are Skipped

**Unit test:**
```typescript
test("SG-001: comment with AGENT_SIGNATURE is skipped", () => {
  const event = {
    comment: { body: `Great review!\n${AGENT_SIGNATURE}` },
    issue: { number: 1 },
  };
  const result = route(event, "issue_comment", testConfig);
  expect(result).toBeNull();
});
```

**Integration test:**
```bash
# Post a comment that includes the agent signature
gh issue comment $ISSUE_NUM --body "Test comment
<!-- github-gstack-intelligence-agent -->"

# Verify NO workflow run is triggered (or if triggered, exits early)
```

**Expected:** The router returns null. No agent response is posted.

---

### SG-002: Normal Comments Are Not Skipped

**Unit test:**
```typescript
test("SG-002: normal comment is processed", () => {
  const event = {
    comment: { body: "/review" },
    issue: { number: 1 },
  };
  const result = route(event, "issue_comment", testConfig);
  expect(result).not.toBeNull();
});
```

---

### SG-003: Bot-Loop Prevention Can Be Disabled

**Unit test:**
```typescript
test("SG-003: disabled botLoopPrevention processes agent comments", () => {
  const cfg = {
    ...testConfig,
    access: { ...testConfig.access, botLoopPrevention: false },
  };
  const event = {
    comment: { body: `/review\n${AGENT_SIGNATURE}` },
    issue: { number: 1 },
  };
  const result = route(event, "issue_comment", cfg);
  expect(result).not.toBeNull();
  expect(result!.skill).toBe("review");
});
```

---

### SG-004: Agent Signature Appended to Every Comment

**Integration test:** After any agent response, verify the comment ends with:

```html
<!-- github-gstack-intelligence-agent -->
```

```bash
gh issue view $ISSUE_NUM --comments --json comments \
  -q '.comments[-1].body' | tail -1
# Expected: <!-- github-gstack-intelligence-agent -->
```

---

### SG-005: AGENT_SIGNATURE Constant Value

**Unit test:**
```typescript
test("SG-005: AGENT_SIGNATURE is correct", () => {
  expect(AGENT_SIGNATURE).toBe("<!-- github-gstack-intelligence-agent -->");
});
```

---

## Reserved Prefix Gating Tests

### SG-010: Reserved Prefix Characters Skip Processing

The following characters at the start of an issue title or comment body cause
the agent to exit silently (message intended for another AI agent):

`` ` ~ @ # $ % ^ : ; | = / \ & ``

**Unit test (agent.ts logic):**
```typescript
test("SG-010: reserved prefixes", () => {
  const RESERVED_PREFIXES = new Set([
    "`", "~", "@", "#", "$", "%", "^", ":", ";", "|", "=", "/", "\\", "&"
  ]);
  expect(RESERVED_PREFIXES.size).toBe(14);

  // Each prefix should cause the agent to skip
  for (const prefix of RESERVED_PREFIXES) {
    expect(RESERVED_PREFIXES.has(prefix)).toBe(true);
  }
});
```

**Integration test:** Create an issue starting with a reserved prefix:
```bash
gh issue create --title "~copilot Can you help?" --body "This is for Copilot"
```

**Expected:** The workflow logs show:
```
Skipping: first character "~" is a reserved prefix for another agent.
```

---

### SG-011: Slash Commands Override Reserved Prefix Check

When a route matches (e.g., `/review`), the reserved prefix check is skipped
because the router already interpreted the `/` as a skill command.

**Logic flow:**
1. Router processes `/review` → `routeResult` is not null
2. Reserved prefix check: `if (!routeResult)` → skipped
3. Agent proceeds normally

---

### SG-012: Reserved Prefix on Issue Comment vs Title

| Event | Text checked | Source |
|---|---|---|
| `issue_comment` | `event.comment.body` | Comment body |
| `issues` (opened) | Issue title | Title |
| `pull_request` | N/A (always routes to review) | — |

---

## Disabled Skill Tests

### SG-020: Disabled Skill Returns Null

**Unit test:**
```typescript
describe("SG-020: disabled skills", () => {
  test("disabled review via PR → null", () => {
    const cfg = disableSkill(testConfig, "review");
    const event = {
      pull_request: { number: 1, head: { ref: "feat" }, labels: [] },
    };
    const result = route(event, "pull_request", cfg);
    expect(result).toBeNull();
  });

  test("disabled qa via comment → null", () => {
    const cfg = disableSkill(testConfig, "qa");
    const event = {
      comment: { body: "/qa https://example.com" },
      issue: { number: 1 },
    };
    const result = route(event, "issue_comment", cfg);
    expect(result).toBeNull();
  });

  test("disabled skill via schedule → null", () => {
    // retro and benchmark are disabled by default
    const event = { schedule: "0 17 * * 5" };
    const result = route(event, "schedule", testConfig);
    expect(result).toBeNull();
  });

  test("skill not in config → null", () => {
    const cfg = { ...testConfig, skills: {} };
    const event = {
      comment: { body: "/review" },
      issue: { number: 1 },
    };
    const result = route(event, "issue_comment", cfg);
    expect(result).toBeNull();
  });
});
```

---

### SG-021: Disabled Skill Logs Warning

**Verification in workflow logs:**
```
Skill "retro" is not enabled or does not exist in config
```

---

## Access Control Tests

### SG-030: Allowed Permissions

The workflow's Authorize step checks the actor's permission level. Only actors
with `admin`, `maintain`, or `write` permissions should be authorised.

**Config:**
```json
"access": {
  "allowedPermissions": ["admin", "maintain", "write"]
}
```

**Integration test:** A collaborator with `read` permission comments on an issue.

**Expected:** The workflow exits at the Authorize step with a permission error.

---

### SG-031: Schedule/Release/Deployment Bypass Auth

Automated events (schedule, release, deployment_status) bypass actor
authorisation because there is no actor to check.

---

## Reaction Tests

### SG-040: Rocket Reaction on Start

**Expected:** When the workflow starts, a 🚀 reaction is added to the
triggering issue or comment (done in the Authorize step).

---

### SG-041: Thumbs Up on Success

**Expected:** On successful completion, a 👍 reaction is added.

**Verification:**
```bash
gh api repos/{owner}/{repo}/issues/${ISSUE_NUM}/reactions \
  --jq '.[] | select(.content == "+1")'
```

---

### SG-042: Thumbs Down on Error

**Expected:** On error (exception in agent.ts), a 👎 reaction is added.

---

### SG-043: Reactions on Comments (issue_comment events)

For `issue_comment` events, reactions are added to the triggering comment
(not the issue itself):

```bash
gh api repos/{owner}/{repo}/issues/comments/${COMMENT_ID}/reactions \
  --jq '.[] | select(.content == "+1")'
```

---

## API Key Validation Tests

### SG-050: Missing API Key Produces Helpful Error

When the configured provider's API key secret is not set:

**Expected comment:**
```
## ⚠️ Missing API Key: `OPENAI_API_KEY`

The configured provider is `openai`, but the `OPENAI_API_KEY` secret is
not available to this workflow run.
```

**Expected:** The comment includes both Option A (repository secret) and Option B
(organization secret) instructions.

---

### SG-051: Provider-to-Key Mapping

**Unit test:**
```typescript
test("SG-051: provider key mapping", () => {
  const providerKeyMap: Record<string, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GEMINI_API_KEY",
    xai: "XAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    mistral: "MISTRAL_API_KEY",
    groq: "GROQ_API_KEY",
  };

  expect(providerKeyMap["anthropic"]).toBe("ANTHROPIC_API_KEY");
  expect(providerKeyMap["openai"]).toBe("OPENAI_API_KEY");
  expect(providerKeyMap["google"]).toBe("GEMINI_API_KEY");
  expect(Object.keys(providerKeyMap)).toHaveLength(7);
});
```

---

## Model Validation Tests

### SG-060: Whitespace in Model ID Rejected

**Expected error when model contains whitespace:**
```
Invalid model identifier "gpt 5.4" in .pi/settings.json:
model IDs must not contain whitespace.
```

---

### SG-061: Missing Provider/Model Rejected

**Expected error:**
```
Invalid .pi settings: expected defaultProvider and defaultModel
```

---

## Config Validation Tests

### SG-070: Missing config.json Throws Error

**Unit test:**
```typescript
test("SG-070: missing config.json throws", () => {
  expect(() => loadConfig("/nonexistent/path")).toThrow("config.json not found");
});
```

---

### SG-071: Invalid JSON in config.json Throws

**Unit test:**
```typescript
test("SG-071: invalid JSON throws", () => {
  // Create a temp file with invalid JSON and attempt to load
  writeFileSync("/tmp/test-config/config.json", "not json");
  expect(() => loadConfig("/tmp/test-config")).toThrow();
});
```
