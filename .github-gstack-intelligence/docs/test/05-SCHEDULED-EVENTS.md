# 05 — Scheduled & Event-Driven Tests

Validates skills triggered by schedule, release, and deployment_status events:
`/retro`, `/benchmark`, `/document-release`, and `/canary` (deployment path).

---

## Prerequisites

- Test repo with GStack Intelligence installed
- For schedule tests: Enable `retro` and `benchmark` in `config.json`
- For release tests: `document-release` must be enabled (default: true)
- For deployment tests: Enable `canary` in `config.json`

---

## Schedule Tests

### SE-001: Retro Triggered by Schedule

**Setup:** Enable retro in config.json:
```json
"retro": { "enabled": true, "trigger": "schedule", "schedule": "0 17 * * 5" }
```

**Trigger:** The weekly cron (`0 17 * * 5` — Friday 5pm UTC) fires automatically.
For manual testing, use workflow_dispatch:

```bash
gh workflow run github-gstack-intelligence-agent.yml -f function=retro
```

**Expected outcomes:**
1. ✅ Router matches `schedule: "0 17 * * 5"` to `retro` skill
2. ✅ `sessionMode: "none"` (no session continuity for scheduled runs)
3. ✅ Agent generates a weekly engineering retrospective
4. ✅ No comment posted (automated events skip comment posting)
5. ✅ Result file created at `state/results/retro/{date}.json`
6. ✅ No session mapping created (automated event)

**Verification:**
```bash
# Check result file exists (date will be today's date)
DATE=$(date +%Y-%m-%d)
cat .github-gstack-intelligence/state/results/retro/${DATE}.json
```

**Expected result schema:**
```json
{
  "skill": "retro",
  "date": "2026-04-02",
  "timestamp": "2026-04-02T17:00:00.000Z",
  "status": "completed",
  "commit": "abc123"
}
```

---

### SE-002: Retro via Slash Command (Manual Trigger)

```bash
ISSUE_NUM=$(gh issue create --title "Manual retro" --body "Run a retrospective" --json number -q '.number')
gh issue comment $ISSUE_NUM --body "/retro"
```

**Expected:** Routes to `retro` skill and posts a comment (unlike scheduled run).

---

### SE-003: Retro with Args

```bash
gh issue comment $ISSUE_NUM --body "/retro 7d"
```

**Expected:** `context.args: "7d"` — agent should scope the retro to the last 7 days.

---

### SE-010: Benchmark Triggered by Schedule

**Setup:** Enable benchmark in config.json:
```json
"benchmark": { "enabled": true, "trigger": "schedule", "schedule": "0 6 * * *" }
```

**Trigger:**
```bash
gh workflow run github-gstack-intelligence-agent.yml -f function=benchmark
```

**Expected outcomes:**
1. ✅ Routes to `benchmark` skill
2. ✅ Agent performs performance regression detection
3. ✅ Result file at `state/benchmarks/history/{date}.json`
4. ✅ Agent references `state/benchmarks/baseline.json` if it exists

**Expected result schema:**
```json
{
  "skill": "benchmark",
  "date": "2026-04-02",
  "timestamp": "2026-04-02T06:00:00.000Z",
  "status": "completed",
  "commit": "abc123"
}
```

---

### SE-011: Benchmark via Slash Command

```bash
gh issue comment $ISSUE_NUM --body "/benchmark"
```

**Expected:** Routes to `benchmark` skill and posts a comment.

---

### SE-020: Unmatched Cron Pattern Returns Null

**Unit test:**
```typescript
test("SE-020: unknown cron → null", () => {
  const cfg = enableSkill(testConfig, "retro");
  const event = { schedule: "0 0 * * *" }; // midnight, not matching any config
  const result = route(event, "schedule", cfg);
  expect(result).toBeNull();
});
```

---

## Release Tests

### SE-030: Document-Release on Release Published

**Trigger:** Create a release in the test repo.

```bash
# Tag and release
git tag v1.0.0-test
git push origin v1.0.0-test
gh release create v1.0.0-test --title "Test Release v1.0.0" \
  --notes "## Changes\n- Added feature A\n- Fixed bug B"
```

**Expected outcomes:**
1. ✅ Workflow triggers on `release: published`
2. ✅ Router routes to `document-release` skill
3. ✅ Agent updates documentation (README, CHANGELOG, etc.)
4. ✅ No comment posted (release events are automated — no target issue/PR)
5. ✅ Result file at `state/results/releases/v1.0.0-test.json`
6. ✅ Tag name sanitised in filename (special chars replaced with `_`)

**Verification:**
```bash
cat .github-gstack-intelligence/state/results/releases/v1.0.0-test.json
```

**Expected result schema:**
```json
{
  "skill": "document-release",
  "tag": "v1.0.0-test",
  "timestamp": "2026-04-02T12:00:00.000Z",
  "status": "completed",
  "commit": "abc123"
}
```

---

### SE-031: Document-Release via Slash Command

```bash
gh issue comment $ISSUE_NUM --body "/document-release"
```

**Expected:** Routes to `document-release` via slash command and posts a comment.

---

### SE-032: Document-Release Disabled

**Unit test:**
```typescript
test("SE-032: disabled document-release → null", () => {
  const cfg = disableSkill(testConfig, "document-release");
  const event = { release: { tag_name: "v1.0.0" } };
  const result = route(event, "release", cfg);
  expect(result).toBeNull();
});
```

---

## Deployment Status Tests

### SE-040: Canary on Successful Deployment

**Setup:** Enable canary in config.json.

**Trigger:** Deployment success event (hard to simulate directly). Use
workflow_dispatch instead:

```bash
gh workflow run github-gstack-intelligence-agent.yml -f function=canary
```

**Expected outcomes:**
1. ✅ Routes to `canary` skill with `needsBrowser: true`
2. ✅ Agent performs post-deploy monitoring
3. ✅ Result file at `state/results/canary/{timestamp}.json`

**Expected result schema:**
```json
{
  "skill": "canary",
  "url": "https://staging.example.com",
  "timestamp": "2026-04-02T12:00:00.000Z",
  "status": "completed",
  "commit": "abc123"
}
```

---

### SE-041: Canary Skips Failed Deployments

**Unit test:** Already covered in routing tests (RT-060). A `deployment_status`
with `state: "failure"` must return `null`.

---

### SE-042: Canary URL from environment_url vs target_url

**Unit tests:**
```typescript
test("SE-042a: environment_url is primary", () => {
  const cfg = enableSkill(testConfig, "canary");
  const event = {
    deployment_status: { state: "success", target_url: "https://fallback.com" },
    deployment: { environment_url: "https://primary.com" },
  };
  const result = route(event, "deployment_status", cfg);
  expect(result!.context.url).toBe("https://primary.com");
});

test("SE-042b: target_url is fallback", () => {
  const cfg = enableSkill(testConfig, "canary");
  const event = {
    deployment_status: { state: "success", target_url: "https://fallback.com" },
    deployment: {},
  };
  const result = route(event, "deployment_status", cfg);
  expect(result!.context.url).toBe("https://fallback.com");
});
```

---

## Automated Event Behaviour

### SE-050: Automated Events Skip Comment Posting

For schedule, release, and deployment_status events, the agent should NOT post
a comment (there's no target issue/PR). Verify by checking the workflow logs:

```
Automated event (schedule) — skipping comment posting, results committed to state
```

### SE-051: Automated Events Skip Session Mapping

Session mapping files (`state/issues/{N}.json`) should NOT be created for
automated events.

### SE-052: Automated Event Title/Body Derivation

**Unit test (agent.ts logic):**

| Event | Expected title | Expected body |
|---|---|---|
| `release` | `Release: v1.0.0` | Release notes body |
| `deployment_status` | `Deployment: production` | `Status: success` |
| `schedule` | `Scheduled run: 0 17 * * 5` | `""` (empty) |

---

## Cleanup

```bash
gh release delete v1.0.0-test --yes
git push origin --delete v1.0.0-test
gh issue close $ISSUE_NUM
```
