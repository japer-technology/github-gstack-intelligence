# /review — PR Code Review

Structured, checklist-driven pre-landing code review that analyzes PR diffs for SQL injection, LLM trust boundary violations, race conditions, conditional side effects, and other structural issues that tests don't catch.

---

## Trigger

| Event | Condition | Manual |
|---|---|---|
| `pull_request` | Automatic on every PR opened or synchronized | Comment `/review` on an issue |

The `/review` skill runs **automatically** on every pull request event — no labels or special configuration needed. It can also be invoked manually by commenting `/review` on any issue.

---

## How to Use

**Automatic (default):** Simply open or push to a pull request. The review runs automatically.

**Manual:** Comment on an issue:

```
/review
```

The skill will:
1. Detect the current branch and diff against the base branch
2. Read the review checklist
3. Analyze the full diff for critical and informational issues
4. Auto-fix mechanical problems and flag critical findings for human approval

---

## What It Does

The `/review` skill performs a multi-pass code review following a strict checklist methodology:

### Step 1 — Branch & Diff Detection
Checks the current branch against the base branch. If there's no diff, it stops early with a clear message.

### Step 2 — Checklist Loading
Reads the [review checklist](../skills/references/review-checklist.md) which defines all review categories, severity classifications, and suppression rules. **The review will not proceed without the checklist.**

### Step 3 — Full Diff Analysis
Fetches the latest base branch and runs `git diff origin/<base>` to get the complete diff including both committed and uncommitted changes.

### Step 4 — Critical Pass (Two-Pass Review)

**CRITICAL categories:**
- SQL & Data Safety — injection, unsafe interpolation
- Race Conditions & Concurrency — shared state without protection
- LLM Output Trust Boundary — unsanitized AI output reaching DB or DOM
- Shell Injection — unsanitized input in shell commands
- Enum & Value Completeness — new enum values not handled everywhere

**INFORMATIONAL categories:**
- Async/Sync Mixing
- Column/Field Name Safety
- LLM Prompt Issues
- Type Coercion
- View/Frontend issues
- Time Window Safety
- Completeness Gaps
- Distribution & CI/CD

The Enum check is special — it **reads code outside the diff** to verify all switch/case statements and type handlers cover the new value.

### Step 5 — Fix-First Review

Every finding gets action, not just a comment:

1. **Classify** each finding as `AUTO-FIX` (mechanical, safe to apply) or `ASK` (requires human judgment)
2. **Auto-fix** all `AUTO-FIX` items directly with one-line summaries
3. **Batch-ask** about `ASK` items in a single follow-up comment with A) Fix / B) Skip options
4. **Apply** user-approved fixes

### Step 5.5 — TODOS Cross-Reference
If `TODOS.md` exists, cross-references the PR against open TODOs — notes which TODOs are addressed, flags new work that should become a TODO.

### Step 5.6 — Documentation Staleness Check
Checks if code changes affect features described in repo documentation (README, ARCHITECTURE, etc.) that wasn't updated in the branch.

### Step 5.8 — Persist Results
Writes the final review outcome to `state/results/review/review-log.json` so `/ship` can verify that an engineering review was completed.

### Verification of Claims
Before producing final output, the skill verifies every claim:
- "This pattern is safe" → must cite the specific line
- "This is handled elsewhere" → must read and cite the handling code
- "Tests cover this" → must name the test file and method
- Never says "likely handled" or "probably tested"

### Adversarial Pass
A final pass tries to disprove each finding using the checked-out code before publishing.

---

## Example Output

```
## Pre-Landing Review: 5 issues (2 critical, 3 informational)

### Auto-Fixed (3)

[AUTO-FIXED] src/utils.ts:1 — Unused import `fs` → removed
[AUTO-FIXED] src/api.ts:22 — Missing return type → added `: Promise<void>`
[AUTO-FIXED] README.md:45 — References removed endpoint `/v1/users` → updated to `/v2/users`

### Needs Your Input (2)

I auto-fixed 3 issues. 2 need your input:

1. [CRITICAL] src/db.ts:45 — SQL Injection: user input directly interpolated into query
   Fix: Use parameterized query with `$1` placeholder
   → A) Fix  B) Skip

2. [CRITICAL] src/auth.ts:112 — Race condition: token refresh not mutex-protected
   Fix: Add mutex lock around token refresh block
   → A) Fix  B) Skip

RECOMMENDATION: Fix both — #1 is exploitable SQL injection, #2 causes
intermittent "session not found" errors under load.
```

---

## Configuration

In [`config.json`](../config.json):

```json
{
  "review": {
    "enabled": true,
    "trigger": "pull_request"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Set to `false` to disable the skill |
| `trigger` | `string` | GitHub event type — `pull_request` for automatic PR reviews |

---

## Requirements

| Requirement | Details |
|---|---|
| Browser | ❌ Not needed |
| Model | Default model from config (`gpt-5.4`) recommended |
| Permissions | `admin`, `maintain`, or `write` on the repository |
| Tools | Bash, Read, Edit, Write, Grep, Glob, Agent, WebSearch |

---

## Results

Review outcomes are persisted to:

```
.github-gstack-intelligence/state/results/review/review-log.json
```

Each entry includes:
- `skill` — `"review"`
- `timestamp` — ISO 8601 datetime
- `status` — `"clean"` (no unresolved findings) or `"issues_found"`
- `issues_found` — total remaining unresolved findings
- `critical` / `informational` — counts by severity
- `commit` — short SHA of the reviewed commit

The `/ship` skill reads this file to confirm that an engineering review was completed before shipping.

---

## Related Files

| File | Purpose |
|---|---|
| [`skills/review.md`](../skills/review.md) | Skill prompt definition |
| [`skills/references/review-checklist.md`](../skills/references/review-checklist.md) | Two-pass review checklist (CRITICAL + INFORMATIONAL categories) |
| [`skills/references/review-todos-format.md`](../skills/references/review-todos-format.md) | Canonical TODOS.md format reference |
| [`skills/references/review-greptile-triage.md`](../skills/references/review-greptile-triage.md) | Greptile comment triage and reply templates |
| [`config.json`](../config.json) | Skill enablement and trigger configuration |
| [`lifecycle/router.ts`](../lifecycle/router.ts) | Event routing — maps GitHub events to skills |

---

## See Also

- [`/cso`](cso.md) — Chief Security Officer audit for deeper security analysis
- [`/ship`](ship.md) — Automated shipping workflow (reads `/review` results before merging)

---

[← Back to Command Reference](README.md)
