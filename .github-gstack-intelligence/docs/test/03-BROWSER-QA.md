# 03 — Browser & QA Tests

Validates browser-based skills: `/qa`, `/qa-only`, `/design-review`, and
`/canary`. These skills require Playwright and exercise `browser.ts` utilities.

---

## Prerequisites

- Test repo with GStack Intelligence installed
- A publicly accessible staging URL (or localhost tunnelled via ngrok)
- Playwright Chromium installed (automatic when browser skills route)
- Labels: `design-review` created in the test repo

---

## QA Skill Tests

### QA-001: QA with URL via Issue Comment

**Trigger:** Comment `/qa <url>` on an open issue.

```bash
# Create a test issue
ISSUE_NUM=$(gh issue create --title "QA Test" --body "Test QA skill" --json number -q '.number')

# Trigger QA with a URL
gh issue comment $ISSUE_NUM --body "/qa https://example.com"
```

**Expected outcomes:**
1. ✅ Workflow triggers with `needsBrowser: true`
2. ✅ Playwright is conditionally installed (check workflow logs for install step)
3. ✅ Agent navigates to the URL, captures screenshots, and runs health checks
4. ✅ Agent posts a comment with QA findings (bugs, accessibility issues, layout problems)
5. ✅ Comment includes before/after screenshots or health report data
6. ✅ Result file created at `state/results/qa/issue-{N}.json`
7. ✅ Result contains `{ skill: "qa", url: "https://example.com", status: "completed" }`

**Verification:**
```bash
cat .github-gstack-intelligence/state/results/qa/issue-${ISSUE_NUM}.json
```

---

### QA-002: QA Without URL

**Trigger:** Comment `/qa` without a URL argument.

```bash
gh issue comment $ISSUE_NUM --body "/qa"
```

**Expected:** Routes to QA skill. The agent may ask for a URL or attempt to find
one from the issue context. Result file has `url: null`.

---

### QA-003: QA with HTTP URL (not HTTPS)

**Trigger:** Comment with an HTTP URL.

```bash
gh issue comment $ISSUE_NUM --body "/qa http://localhost:3000"
```

**Expected:** URL is accepted (`http://` is valid per `parseSlashCommand`).

---

### QA-004: QA with URL Containing Query Parameters

```bash
gh issue comment $ISSUE_NUM --body "/qa https://example.com/app?page=1&filter=active"
```

**Expected:** Full URL including query string is captured in `context.url`.

---

## QA-Only Skill Tests

### QA-010: QA-Only Reports Without Fixing

**Trigger:** Comment `/qa-only <url>` on an issue.

```bash
ISSUE_NUM=$(gh issue create --title "QA-Only Test" --body "Report only" --json number -q '.number')
gh issue comment $ISSUE_NUM --body "/qa-only https://example.com"
```

**Expected outcomes:**
1. ✅ Routes to `qa-only` skill with `needsBrowser: true`
2. ✅ Agent produces a QA report but does NOT attempt fixes (report-only mode)
3. ✅ Result persisted to `state/results/qa/issue-{N}.json` with `skill: "qa-only"`

**Key difference from `/qa`:** The agent should only report findings, not modify code.

---

## Design Review Tests

### QA-020: Design Review on PR with Label

**Trigger:** Open a PR with the `design-review` label.

```bash
git checkout -b test/qa-020-design
cat > styles.css << 'EOF'
.button { background: red; color: white; font-size: 8px; }
.container { width: 100vw; overflow: hidden; }
EOF
git add styles.css && git commit -m "Add styles"
git push origin test/qa-020-design

gh pr create --title "Update styles" \
  --body "CSS changes for review" \
  --base main --head test/qa-020-design \
  --label "design-review"
```

**Expected outcomes:**
1. ✅ Router routes to `design-review` skill (not `review`)
2. ✅ `needsBrowser: true` — Playwright is installed
3. ✅ Agent performs visual design audit with screenshots
4. ✅ Comment includes design assessment (typography, colour, spacing, accessibility)
5. ✅ Result file at `state/results/design-review/pr-{N}.json`

---

### QA-021: Design Review via Slash Command

```bash
gh issue comment $ISSUE_NUM --body "/design-review"
```

**Expected:** Routes to `design-review` with `needsBrowser: true`.

---

## Canary Skill Tests

### QA-030: Canary via Deployment Status (Success)

**Trigger:** Simulate a successful deployment event via workflow_dispatch.

```bash
# Via workflow_dispatch (since deployment events are hard to simulate)
gh workflow run github-gstack-intelligence-agent.yml \
  -f function=canary
```

> **Note:** Canary is disabled by default in config.json. Enable it first:
> Set `"canary": { "enabled": true, "trigger": "deployment_status" }` in config.json.

**Expected outcomes:**
1. ✅ Routes to `canary` skill with `needsBrowser: true`
2. ✅ Agent checks the deployment URL for visual regressions, console errors
3. ✅ Result persisted to `state/results/canary/{timestamp}.json`

---

### QA-031: Canary via Slash Command

```bash
# Enable canary in config first
gh issue comment $ISSUE_NUM --body "/canary https://staging.example.com"
```

**Expected:** Routes to canary, captures URL, performs post-deploy monitoring.

---

### QA-032: Canary Ignores Non-Success Deployments

**Unit test:**
```typescript
test("QA-032: deployment failure → null", () => {
  const cfg = enableSkill(testConfig, "canary");
  const event = {
    deployment_status: { state: "failure" },
    deployment: { environment_url: "https://x.com" },
  };
  const result = route(event, "deployment_status", cfg);
  expect(result).toBeNull();
});
```

---

### QA-033: Canary URL Fallback to target_url

**Unit test:**
```typescript
test("QA-033: target_url fallback", () => {
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

## QA Result File Format

All QA-related skills persist results with this schema:

```json
{
  "issueNumber": 42,
  "skill": "qa",
  "url": "https://example.com",
  "timestamp": "2026-04-02T12:00:00.000Z",
  "status": "completed",
  "commit": "abc123def456"
}
```

For PR-triggered QA/design-review:
```json
{
  "prNumber": 5,
  "skill": "design-review",
  "url": null,
  "timestamp": "2026-04-02T12:00:00.000Z",
  "status": "completed",
  "commit": "abc123def456"
}
```

---

## Cleanup

```bash
gh pr close --delete-branch test/qa-020-design
gh issue close $ISSUE_NUM
```
