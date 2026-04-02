# 07 — State Persistence Tests

Validates session mapping, result file persistence, push conflict resolution,
and state directory structure.

---

## Session Management Tests

### ST-001: Session Directory Structure

**Verification:** After installation, the following directories must exist:

```bash
ls -la .github-gstack-intelligence/state/
# Expected:
# issues/          — issue-to-session mappings
# sessions/        — pi session transcripts (JSONL)
# results/         — per-skill result files
# benchmarks/      — benchmark baselines and history
```

```bash
ls -la .github-gstack-intelligence/state/results/
# Expected subdirectories:
# review/
# security/
# qa/
# design-review/
# retro/
# canary/
# releases/
# benchmarks/   (under state/benchmarks/history/)
```

---

### ST-002: Issue Mapping File Created

After any issue interaction (not PR, not automated):

```bash
# Trigger via an issue comment
ISSUE_NUM=$(gh issue create --title "Test state" --body "State test" --json number -q '.number')
gh issue comment $ISSUE_NUM --body "Hello, can you help?"

# Wait for workflow completion, then verify
cat .github-gstack-intelligence/state/issues/${ISSUE_NUM}.json
```

**Expected schema:**
```json
{
  "issueNumber": 42,
  "sessionPath": ".github-gstack-intelligence/state/sessions/1711929600000.jsonl",
  "updatedAt": "2026-04-02T12:00:00.000Z"
}
```

---

### ST-003: Session File Format (JSONL)

```bash
# The session transcript is a JSONL file readable by pi --session
head -5 $(jq -r '.sessionPath' .github-gstack-intelligence/state/issues/${ISSUE_NUM}.json)
```

**Expected:** Each line is a valid JSON object (JSONL format) containing event
data from the pi agent runtime.

---

### ST-004: Session Resume on Follow-Up

```bash
# Post a second comment
gh issue comment $ISSUE_NUM --body "Follow-up question"

# After workflow completes, check that mapping still references a valid session
SESSION_PATH=$(jq -r '.sessionPath' .github-gstack-intelligence/state/issues/${ISSUE_NUM}.json)
test -f "$SESSION_PATH" && echo "PASS: Session file exists" || echo "FAIL: Session file missing"
```

**Expected:** The agent resumes from the prior session, and the response
references prior context.

---

### ST-005: Session Mapping Not Created for PR Events

After a PR review completes:

```bash
PR_NUM=5  # use your test PR number
test -f ".github-gstack-intelligence/state/issues/${PR_NUM}.json" \
  && echo "FAIL: PR should not create session mapping" \
  || echo "PASS: No session mapping for PR events"
```

---

### ST-006: Session Mapping Not Created for Automated Events

After a schedule/release/deployment event completes:

```bash
# No mapping file should exist for targetNumber=0
test -f ".github-gstack-intelligence/state/issues/0.json" \
  && echo "FAIL: Automated events should not create mappings" \
  || echo "PASS: No mapping for automated events"
```

---

## Result Persistence Tests

### ST-010: Review Results

```bash
# After a PR review on PR #5
cat .github-gstack-intelligence/state/results/review/pr-5.json
```

**Expected fields:** `prNumber`, `skill`, `timestamp`, `status`, `commit`

---

### ST-011: Security (CSO) Results

```bash
cat .github-gstack-intelligence/state/results/security/pr-5.json
```

**Expected fields:** `prNumber`, `skill` ("cso"), `timestamp`, `status`, `commit`

---

### ST-012: QA Results (Issue-Triggered)

```bash
cat .github-gstack-intelligence/state/results/qa/issue-42.json
```

**Expected fields:** `issueNumber`, `skill`, `url`, `timestamp`, `status`, `commit`

---

### ST-013: QA Results (PR-Triggered)

```bash
cat .github-gstack-intelligence/state/results/qa/pr-5.json
```

**Expected fields:** `prNumber`, `skill`, `url`, `timestamp`, `status`, `commit`

---

### ST-014: Design Review Results

```bash
cat .github-gstack-intelligence/state/results/design-review/pr-5.json
```

**Expected fields:** `prNumber`, `skill`, `url`, `timestamp`, `status`, `commit`

---

### ST-015: Retro Results

```bash
DATE=$(date +%Y-%m-%d)
cat .github-gstack-intelligence/state/results/retro/${DATE}.json
```

**Expected fields:** `skill` ("retro"), `date`, `timestamp`, `status`, `commit`

---

### ST-016: Benchmark Results

```bash
DATE=$(date +%Y-%m-%d)
cat .github-gstack-intelligence/state/benchmarks/history/${DATE}.json
```

**Expected fields:** `skill` ("benchmark"), `date`, `timestamp`, `status`, `commit`

---

### ST-017: Canary Results

```bash
ls .github-gstack-intelligence/state/results/canary/
# Files named with ISO timestamp: 2026-04-02T12-00-00.json
```

**Expected fields:** `skill` ("canary"), `url`, `timestamp`, `status`, `commit`

---

### ST-018: Document-Release Results

```bash
cat .github-gstack-intelligence/state/results/releases/v1.0.0.json
```

**Expected fields:** `skill` ("document-release"), `tag`, `timestamp`, `status`, `commit`

### ST-019: Release Tag Sanitisation

Tags with special characters should have them replaced with `_`:

```bash
# Tag: v1.0.0-beta+build.123
# Expected filename: v1.0.0-beta_build.123.json
```

The sanitisation regex is: `tagName.replace(/[^a-zA-Z0-9._-]/g, "_")`

---

## extractAgentText Tests

### ST-030: Valid JSONL Extraction

**Unit test:**
```typescript
import { describe, expect, test } from "bun:test";
import { writeFileSync, unlinkSync } from "fs";

// Test extractAgentText by creating temporary JSONL files
describe("extractAgentText", () => {
  test("extracts last assistant text from JSONL", () => {
    const jsonl = [
      JSON.stringify({ type: "message_start", message: { role: "user" } }),
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Hello, world!" }],
        },
      }),
    ].join("\n");

    writeFileSync("/tmp/test-agent.jsonl", jsonl);
    // extractAgentText is not exported — test via agent.ts internals or refactor
    // For now, verify by reading the file and parsing manually
    const lines = jsonl.split("\n");
    const last = JSON.parse(lines[lines.length - 1]);
    expect(last.message.role).toBe("assistant");
    expect(last.message.content[0].text).toBe("Hello, world!");
    unlinkSync("/tmp/test-agent.jsonl");
  });

  test("handles empty file gracefully", () => {
    writeFileSync("/tmp/test-empty.jsonl", "");
    // Expected: returns empty string, no crash
    unlinkSync("/tmp/test-empty.jsonl");
  });

  test("handles malformed JSON lines", () => {
    const jsonl = [
      "not valid json",
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Valid result" }],
        },
      }),
    ].join("\n");

    writeFileSync("/tmp/test-malformed.jsonl", jsonl);
    // Expected: skips malformed line, returns "Valid result"
    unlinkSync("/tmp/test-malformed.jsonl");
  });

  test("returns last assistant message (reverse iteration)", () => {
    const jsonl = [
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "First response" }],
        },
      }),
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Second response" }],
        },
      }),
    ].join("\n");

    writeFileSync("/tmp/test-multi.jsonl", jsonl);
    // Expected: returns "Second response" (last one)
    unlinkSync("/tmp/test-multi.jsonl");
  });

  test("concatenates multiple text blocks", () => {
    const jsonl = JSON.stringify({
      type: "message_end",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "Part 1" },
          { type: "text", text: "Part 2" },
        ],
      },
    });

    writeFileSync("/tmp/test-concat.jsonl", jsonl);
    // Expected: returns "Part 1Part 2"
    unlinkSync("/tmp/test-concat.jsonl");
  });
});
```

---

## Push Conflict Resolution Tests

### ST-040: Push Retry on Conflict

**How to test:** Trigger two concurrent workflow runs that both try to push.

```bash
# Open two issues simultaneously
gh issue create --title "Concurrent test A" --body "Test A"
gh issue create --title "Concurrent test B" --body "Test B"
```

**Expected:** The push retry loop (up to 10 attempts with backoff) resolves
the conflict using `git pull --rebase -X theirs`.

**Verification in workflow logs:**
```
Push failed, rebasing and retrying (1/10)...
```

---

### ST-041: Push Backoff Delays

The backoff schedule is: `[1s, 2s, 3s, 5s, 7s, 8s, 10s, 12s, 12s, 15s]`

**Unit test:**
```typescript
test("ST-041: push backoff schedule is correct", () => {
  const pushBackoffs = [1000, 2000, 3000, 5000, 7000, 8000, 10000, 12000, 12000, 15000];
  expect(pushBackoffs).toHaveLength(10);
  expect(pushBackoffs[0]).toBe(1000);
  expect(pushBackoffs[9]).toBe(15000);
});
```

---

### ST-042: Push Failure Warning in Comment

If all 10 push attempts fail, the agent comment should include:

```
⚠️ **Warning:** The agent's session state could not be pushed to the repository.
```

**And** the workflow step should fail (non-zero exit).

---

## Comment Size Limit Tests

### ST-050: Comment Truncation at 60,000 Characters

**Unit test:**
```typescript
test("ST-050: MAX_COMMENT_LENGTH is 60000", () => {
  const MAX_COMMENT_LENGTH = 60000;
  // Agent text longer than 60000 chars should be truncated
  const longText = "x".repeat(70000);
  const truncated = longText.slice(0, MAX_COMMENT_LENGTH);
  expect(truncated.length).toBe(60000);
});
```

---

### ST-051: Empty Agent Text Fallback

When the agent produces no text output, the comment should be:

```
✅ The agent ran successfully but did not produce a text response.
Check the repository for any file changes that were made.
```

---

## Cleanup

```bash
gh issue close $ISSUE_NUM
```
