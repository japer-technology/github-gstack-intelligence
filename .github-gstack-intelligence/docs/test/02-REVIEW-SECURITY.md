# 02 — Review & Security Audit Tests

Validates `/review` (PR review) and `/cso` (Chief Security Officer audit) skills
end-to-end: routing, agent execution, comment posting, and result persistence.

---

## Prerequisites

- Test repo with GStack Intelligence installed and API key configured
- A branch with code changes ready to open as a PR
- `security-audit` label created in the test repo

---

## Test Cases

### RV-001: Auto-Review on PR Open

**Trigger:** Open a new pull request with a small code change.

```bash
# Create a branch with a deliberate code change
git checkout -b test/rv-001-review
echo 'export function add(a: number, b: number) { return a + b; }' > math.ts
git add math.ts && git commit -m "Add math utility"
git push origin test/rv-001-review

# Open a PR
gh pr create --title "Add math utility" --body "Simple addition function" \
  --base main --head test/rv-001-review
```

**Expected outcomes:**
1. ✅ Workflow triggers on `pull_request: opened`
2. ✅ Router routes to `review` skill (`skill: "review"`)
3. ✅ Agent posts a PR comment with review findings
4. ✅ Comment contains the `AGENT_SIGNATURE` (`<!-- github-gstack-intelligence-agent -->`)
5. ✅ Result file created at `state/results/review/pr-{N}.json`
6. ✅ Result file contains `{ skill: "review", status: "completed", prNumber: N }`
7. ✅ 👍 reaction added to the PR on success

**Verification:**
```bash
PR_NUM=$(gh pr list --head test/rv-001-review --json number -q '.[0].number')

# Check comment was posted
gh pr view $PR_NUM --comments --json comments \
  -q '.comments[-1].body' | grep -q 'github-gstack-intelligence-agent'

# Check result file
cat .github-gstack-intelligence/state/results/review/pr-${PR_NUM}.json
```

---

### RV-002: Review with Intentional Bug

**Trigger:** Open a PR with a known SQL injection vulnerability.

```bash
git checkout -b test/rv-002-security-bug
cat > query.ts << 'EOF'
export function getUser(db: any, userId: string) {
  // Intentional SQL injection vulnerability
  return db.query(`SELECT * FROM users WHERE id = '${userId}'`);
}
EOF
git add query.ts && git commit -m "Add user query"
git push origin test/rv-002-security-bug

gh pr create --title "Add user query" \
  --body "Query function for user lookup" \
  --base main --head test/rv-002-security-bug
```

**Expected outcomes:**
1. ✅ Review comment identifies the SQL injection vulnerability
2. ✅ Comment recommends parameterised queries or input sanitisation
3. ✅ Result persisted to `state/results/review/pr-{N}.json`

---

### RV-003: Review on PR Synchronize (New Push)

**Trigger:** Push a new commit to an already-open PR.

```bash
# Push an additional commit to the RV-001 PR branch
git checkout test/rv-001-review
echo 'export function subtract(a: number, b: number) { return a - b; }' >> math.ts
git add math.ts && git commit -m "Add subtract function"
git push origin test/rv-001-review
```

**Expected outcomes:**
1. ✅ Workflow triggers on `pull_request: synchronize`
2. ✅ New review comment posted (cancels any in-progress review via concurrency group)
3. ✅ Result file updated with new timestamp and commit SHA

---

### RV-004: Diff Stat in Review Context

**Trigger:** Open a PR with known additions/deletions.

**Verification:** Check workflow logs for context line:
```
Diff: +N -M across K files
```

The diff stat is passed as `context.diffStat` in the RouteResult and included in
the prompt sent to the AI agent.

---

## CSO (Security Audit) Tests

### SC-001: CSO Triggered by Label

**Trigger:** Open a PR with the `security-audit` label.

```bash
git checkout -b test/sc-001-cso
echo 'export const API_KEY = "sk-1234567890";' > secrets.ts
git add secrets.ts && git commit -m "Add config"
git push origin test/sc-001-cso

gh pr create --title "Add configuration" \
  --body "Configuration constants" \
  --base main --head test/sc-001-cso \
  --label "security-audit"
```

**Expected outcomes:**
1. ✅ Router routes to `cso` skill (not `review`) because `security-audit` label is present
2. ✅ Agent performs security-focused analysis (OWASP, STRIDE, secrets scanning)
3. ✅ Comment posted with security audit findings
4. ✅ Hardcoded API key flagged as a security risk
5. ✅ Result file created at `state/results/security/pr-{N}.json`
6. ✅ Result contains `{ skill: "cso", status: "completed" }`

**Verification:**
```bash
PR_NUM=$(gh pr list --head test/sc-001-cso --json number -q '.[0].number')
cat .github-gstack-intelligence/state/results/security/pr-${PR_NUM}.json
```

---

### SC-002: CSO Label Priority Over Default Review

**Trigger:** Open a PR with both `security-audit` and other labels.

**Expected:** Router selects `cso` (security-audit label is checked first in the
code before default review fallback).

---

### SC-003: CSO via Slash Command

**Trigger:** Comment `/cso` on an existing issue.

```bash
gh issue comment $ISSUE_NUM --body "/cso"
```

**Expected:** Routes to `cso` skill via issue_comment event.

---

## Result File Format Verification

### RV-010: Review Result Schema

After any review run, verify the result file matches this schema:

```json
{
  "prNumber": 123,
  "skill": "review",
  "timestamp": "2026-04-02T12:00:00.000Z",
  "status": "completed",
  "commit": "abc123def456"
}
```

### SC-010: Security Result Schema

```json
{
  "prNumber": 123,
  "skill": "cso",
  "timestamp": "2026-04-02T12:00:00.000Z",
  "status": "completed",
  "commit": "abc123def456"
}
```

---

## Cleanup

```bash
# Close test PRs and delete branches
gh pr close --delete-branch test/rv-001-review
gh pr close --delete-branch test/rv-002-security-bug
gh pr close --delete-branch test/sc-001-cso
```
