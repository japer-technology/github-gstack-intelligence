# 06 — State Management

### Git-as-memory patterns for sessions, benchmarks, retros, and QA reports

---

## The Principle

All state lives in the repository, committed to git. No databases, no external storage, no session cookies. Git provides versioning, auditability, and persistence. You can `git log`, `git blame`, and `git revert` any AI-generated output.

This is the same pattern proven by GMI. gstack-actions extends it with skill-specific state types.

---

## State Directory Structure

```
.gstack-actions/state/
├── issues/                          # Issue-to-session mappings
│   ├── 7.json                       # Issue #7 → session file path + active skill
│   ├── 12.json                      # Issue #12 → session file path + active skill
│   └── ...
│
├── sessions/                        # Conversation transcripts (JSONL)
│   ├── 2026-03-28T10-15-00.jsonl    # Session for issue #7
│   ├── 2026-03-29T14-22-00.jsonl    # Session for issue #12
│   └── ...
│
├── results/                         # Per-skill output history
│   ├── review/
│   │   ├── pr-42.json               # Review results for PR #42
│   │   ├── pr-43.json
│   │   └── ...
│   ├── security/
│   │   ├── pr-42.json               # Security audit for PR #42
│   │   └── ...
│   ├── qa/
│   │   ├── report-2026-03-28.json   # QA report with findings
│   │   ├── screenshots/             # QA screenshots (referenced by reports)
│   │   │   ├── qa-42-homepage.png
│   │   │   ├── qa-42-login-error.png
│   │   │   └── ...
│   │   └── ...
│   └── retro/
│       ├── 2026-03-21.md            # Retro for week of March 21
│       ├── 2026-03-28.md            # Retro for week of March 28
│       └── ...
│
└── benchmarks/                      # Benchmark baselines
    ├── baseline.json                # Current baseline measurements
    ├── history/
    │   ├── 2026-03-28.json          # Historical benchmark run
    │   └── ...
    └── ...
```

---

## Issue-to-Session Mapping

Each issue gets a mapping file that tracks which skill is active and which session file to resume:

```json
// .gstack-actions/state/issues/7.json
{
  "issueNumber": 7,
  "skill": "office-hours",
  "sessionFile": "2026-03-28T10-15-00.jsonl",
  "createdAt": "2026-03-28T10:15:00Z",
  "lastUpdated": "2026-03-28T14:30:00Z",
  "turnCount": 4
}
```

**Session resolution flow:**

```
Issue #7 comment arrives
    │
    ▼
Check state/issues/7.json
    │
    ├── Exists? → Load sessionFile path
    │               │
    │               ├── Session file exists? → Resume: pi --session state/sessions/2026-03-28T10-15-00.jsonl
    │               │
    │               └── Session file missing? → Create new session, update mapping
    │
    └── Not found? → Create new mapping + new session
                      │
                      ├── Issue has skill label? → Set skill from label
                      ├── Comment starts with /command? → Set skill from command
                      └── Neither? → Default to general conversation
```

---

## Review Results

Review results are persisted for auditability and for use by the `/ship` skill (which checks if review has already been run):

```json
// .gstack-actions/state/results/review/pr-42.json
{
  "prNumber": 42,
  "skill": "review",
  "timestamp": "2026-03-28T10:15:00Z",
  "status": "issues_found",
  "issuesFound": 7,
  "critical": 2,
  "informational": 5,
  "autoFixed": 3,
  "askItems": 2,
  "commit": "a1b2c3d",
  "scopeCheck": "CLEAN",
  "designReviewIncluded": true
}
```

The `/ship` skill reads this file to determine whether to run `/review` again or skip it.

---

## QA Reports

QA reports include findings, screenshots, and health scores:

```json
// .gstack-actions/state/results/qa/report-2026-03-28.json
{
  "url": "https://staging.example.com",
  "timestamp": "2026-03-28T10:15:00Z",
  "tier": "standard",
  "healthScore": {
    "before": 72,
    "after": 91
  },
  "findings": [
    {
      "severity": "high",
      "description": "Login form submits on Enter but doesn't show loading state",
      "screenshot": "screenshots/qa-42-login-error.png",
      "status": "fixed",
      "fixCommit": "d4e5f6a"
    },
    {
      "severity": "medium",
      "description": "Mobile nav hamburger menu doesn't close on outside click",
      "screenshot": "screenshots/qa-42-mobile-nav.png",
      "status": "fixed",
      "fixCommit": "b7c8d9e"
    }
  ],
  "shipReadiness": "READY"
}
```

**Screenshot handling:**

Screenshots are saved to `.gstack-actions/state/results/qa/screenshots/` and committed to git. They are also uploaded to the issue as comment attachments for inline display. The JSON report references the git-committed paths for permanent record; the issue comment uses the uploaded GitHub URLs for rendering.

---

## Benchmark Baselines

Benchmark results are committed for regression detection:

```json
// .gstack-actions/state/benchmarks/baseline.json
{
  "lastUpdated": "2026-03-28T06:00:00Z",
  "commit": "a1b2c3d",
  "measurements": {
    "build_time_seconds": 42.3,
    "test_suite_seconds": 18.7,
    "bundle_size_kb": 1240,
    "lighthouse_performance": 92,
    "lighthouse_accessibility": 98,
    "first_contentful_paint_ms": 1200
  }
}
```

The `/benchmark` skill compares current measurements against the baseline and reports regressions:

```
Benchmark Report: 2 regressions, 1 improvement

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| Build time | 42.3s | 45.1s | +6.6% ⚠️ REGRESSION |
| Bundle size | 1240 KB | 1310 KB | +5.6% ⚠️ REGRESSION |
| Test suite | 18.7s | 17.2s | -8.0% ✅ IMPROVEMENT |
```

---

## Retro History

Retro reports are committed as Markdown for trend tracking and human readability:

```markdown
<!-- .gstack-actions/state/results/retro/2026-03-28.md -->
# Weekly Retro — March 22–28, 2026

## Summary
- 47 commits by 3 contributors
- 12 PRs merged
- 2,847 lines added, 891 lines removed

## Per-Person Breakdown

### @alice (22 commits)
- 🏆 Shipping streak: 5 weeks
- Key: Implemented payment integration (#42, #43, #45)
- Growth: Consider splitting large PRs — PR #43 was 1,200 lines

### @bob (18 commits)
- Key: Refactored auth middleware (#44, #46)
- 🎯 Clean code: 0 review findings on 3 PRs

### @carol (7 commits)
- Key: Documentation overhaul (#47, #48)
- Note: First week on the project — ramping up

## Trends
- Shipping velocity: ↑ 15% vs prior week
- Average PR size: ↓ 20% (good — smaller PRs)
- Review turnaround: 2.3 hours average
```

The agent reads prior retro files to provide trend comparisons: "Shipping velocity is up 15% compared to last week."

---

## Commit Strategy

State changes are committed alongside any code edits the agent makes, using a specific commit message format:

```
gstack: {skill} on {target} — {summary}
```

Examples:
- `gstack: review on PR #42 — 7 issues found, 3 auto-fixed`
- `gstack: qa on staging.example.com — 4 bugs found, 4 fixed`
- `gstack: retro for 2026-03-22 to 2026-03-28`
- `gstack: office-hours turn 3 on issue #12`

### Push Conflict Resolution

Following GMI's pattern, the agent retries failed pushes up to 10 times with increasing backoff:

```typescript
for (let attempt = 1; attempt <= 10; attempt++) {
  const pushResult = await git('push', 'origin', 'HEAD');
  if (pushResult.exitCode === 0) break;

  // Pull with rebase, preferring the remote's changes for state files
  await git('pull', '--rebase', '-X', 'theirs', 'origin', 'HEAD');

  // Backoff: 1s, 2s, 4s, 8s, ... capped at 30s
  await sleep(Math.min(1000 * Math.pow(2, attempt - 1), 30000));
}
```

The `-X theirs` strategy is correct for state files: if two agents commit different session files concurrently, both should be preserved. Rebasing ensures the latest push includes both agents' work.

---

## State Size Management

Over time, state directories grow. Mitigation strategies:

| Strategy | When | How |
|----------|------|-----|
| **Archive old sessions** | Sessions older than 90 days | Move to `state/archive/sessions/` — still in git history but not in working tree |
| **Prune screenshots** | QA screenshots older than 30 days | Delete from working tree — still in git history |
| **Compress retros** | After 52 weeks | Consolidate into yearly summary |
| **Rotate benchmarks** | Keep latest 30 runs | Archive older runs to `state/archive/benchmarks/` |

A periodic maintenance workflow (monthly cron) can handle this automatically.

---

## .gitignore Considerations

Some files should NOT be committed:

```gitignore
# In .gstack-actions/.gitignore

# Temporary files from agent execution
/tmp/
*.tmp

# Node modules (installed fresh each run)
node_modules/

# Playwright browser binaries (installed fresh each run)
/ms-playwright/
```

Everything in `state/` IS committed — that's the point. The state directory is the agent's persistent memory.
