# /qa-only — QA Testing (Report Only)

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

Runs the same systematic QA testing methodology as `/qa` — navigation, forms, interactions, console checks, responsive layout verification — but **never fixes anything**. Report-only mode that captures screenshots and documents issues with severity levels and reproduction steps.

---

## Trigger

| Event | Condition | Manual |
|---|---|---|
| `issue_comment` | Comment `/qa-only` or `/qa-only <url>` on an issue | — |

The `/qa-only` skill is invoked by commenting on a GitHub issue. It does not trigger automatically.

---

## How to Use

**Basic:** Comment on an issue:

```
/qa-only
```

If no URL is provided and you're on a feature branch, the skill auto-enters **diff-aware mode** — it focuses testing on pages affected by the branch changes.

**With a URL:**

```
/qa-only https://myapp.com
```

**With options:**

```
/qa-only https://staging.myapp.com --quick
/qa-only https://myapp.com --regression .github-gstack-intelligence/state/local/qa-reports/baseline.json
```

### Parameters

| Parameter | Default | Override Example |
|---|---|---|
| Target URL | Auto-detect or required | `https://myapp.com`, `http://localhost:3000` |
| Mode | Full | `--quick`, `--regression <baseline.json>` |
| Output dir | `.github-gstack-intelligence/state/local/qa-reports/` | — |
| Scope | Full app (or diff-scoped) | `Focus on the billing page` |
| Auth | None | `Sign in to user@example.com` |

---

## What It Does

The `/qa-only` skill tests a web application like a real user but **never makes code changes**. It documents everything it finds for manual review and fixing.

### Testing Methodology

1. **Navigate every page** — follows links, checks navigation, verifies routing
2. **Fill every form** — tests validation, error states, success paths
3. **Click every interactive element** — buttons, dropdowns, toggles, modals
4. **Check console** — captures JavaScript errors, warnings, failed network requests
5. **Verify responsive layouts** — tests at multiple viewport sizes
6. **Test edge cases** — empty states, boundary inputs, rapid interactions

### Per-Page Exploration Checklist

For each page visited, the skill runs through 7 systematic checks from the [QA issue taxonomy](../skills/references/qa-issue-taxonomy.md) covering Visual/UI, Functional, UX, Content, Performance, Console/Errors, and Accessibility categories.

### Issue Categories and Severities

| Severity | Description |
|---|---|
| **Critical** | Application crashes, data loss, security vulnerabilities |
| **High** | Major functionality broken, blocking user flows |
| **Medium** | Functionality works but with notable issues |
| **Low** | Cosmetic issues, minor UX improvements |

### Modes

- **Full mode (default):** Tests the entire application
- **Quick mode:** Abbreviated testing — critical paths only
- **Diff-aware mode:** When on a feature branch with no URL, scopes testing to pages affected by branch changes
- **Regression mode:** Compares against a previous baseline report to detect regressions

### Key Differences from `/qa`

| Feature | `/qa` | `/qa-only` |
|---|---|---|
| Finds bugs | ✅ | ✅ |
| Fixes bugs | ✅ | ❌ Never |
| Reads source code | ✅ | ❌ Never |
| Commits changes | ✅ | ❌ Never |
| Screenshots | ✅ Before/after | ✅ Evidence only |
| Report | ✅ With fix details | ✅ Issues only |
| Suggests fixes | ✅ | ❌ |

> **No test framework detected?** If the project has no test infrastructure, the report includes: *"No test framework detected. Run `/qa` to bootstrap one and enable regression test generation."*

---

## Example Output

```
## QA Report (Report Only) — myapp.com
**Date:** 2026-03-12 | **Mode:** Full | **Health Score:** 72/100

### Summary by Severity
| Severity | Count |
|---|---|
| 🔴 Critical | 1 |
| 🟠 High | 2 |
| 🟡 Medium | 4 |
| 🔵 Low | 3 |

### Top 3 Issues

1. 🔴 **Critical** — Login form submits with empty password
   - Page: `/login`
   - Steps: 1) Navigate to /login  2) Leave password empty  3) Click Submit
   - Expected: Validation error
   - Actual: Form submits, returns 500 error
   - Screenshot: `screenshots/issue-001-result.png`

2. 🟠 **High** — Settings page 500 error on save
   - Page: `/settings`
   - Steps: 1) Navigate to /settings  2) Change display name  3) Click Save
   - Expected: Settings saved
   - Actual: 500 Internal Server Error
   - Screenshot: `screenshots/issue-002-result.png`

3. 🟠 **High** — Mobile nav doesn't close on backdrop click
   - Page: all pages (320px viewport)
   - Steps: 1) Open mobile menu  2) Click backdrop area
   - Expected: Menu closes
   - Actual: Menu stays open
   - Screenshot: `screenshots/issue-003-result.png`

### Console Health
- 3 JavaScript errors captured
- 1 failed network request (404 on `/api/v1/deprecated`)
```

---

## Configuration

In [`config.json`](../config.json):

```json
{
  "qa-only": {
    "enabled": true,
    "trigger": "issue_comment"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Set to `false` to disable the skill |
| `trigger` | `string` | GitHub event type — `issue_comment` (activated by slash command) |

---

## Requirements

| Requirement | Details |
|---|---|
| Browser | ✅ **Required** — Playwright Chromium (`npx playwright install chromium`) |
| Model | Default model from config (`gpt-5.4`) recommended |
| Permissions | `admin`, `maintain`, or `write` on the repository |
| Tools | Bash, Read, Write, WebSearch |

---

## Results

QA reports and screenshots are saved to:

```
.github-gstack-intelligence/state/results/qa/issue-{N}.json
```

Local report output:

```
.github-gstack-intelligence/state/local/qa-reports/
├── qa-report-{domain}-{YYYY-MM-DD}.md    # Structured report
├── screenshots/
│   ├── initial.png                        # Landing page
│   ├── issue-001-step-1.png               # Per-issue evidence
│   ├── issue-001-result.png
│   └── ...
└── baseline.json                          # For regression mode
```

Report filenames use the domain and date: `qa-report-myapp-com-2026-03-12.md`

---

## Related Files

| File | Purpose |
|---|---|
| [`skills/qa-only.md`](../skills/qa-only.md) | Skill prompt definition |
| [`skills/references/qa-issue-taxonomy.md`](../skills/references/qa-issue-taxonomy.md) | Issue severity levels and 7 categories with per-page checklist |
| [`skills/references/qa-report-template.md`](../skills/references/qa-report-template.md) | Report template with health score and summary structure |
| [`config.json`](../config.json) | Skill enablement and trigger configuration |
| [`lifecycle/router.ts`](../lifecycle/router.ts) | Event routing — maps GitHub events to skills |

---

## See Also

- [`/qa`](qa.md) — Full QA with automated fixes (use when you want bugs fixed, not just reported)
- [`/design-review`](design-review.md) — Visual design audit (complementary — `/qa-only` finds functional bugs, `/design-review` finds visual issues)

---

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence">
  </picture>
</p>

[← Back to Command Reference](README.md)
