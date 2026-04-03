# /design-review — Visual Design Audit

Designer's-eye QA that finds visual inconsistency, spacing issues, hierarchy problems, AI slop patterns, and slow interactions on live sites — then fixes them iteratively with atomic commits and before/after screenshots.

---

## Trigger

| Event | Condition | Manual |
|---|---|---|
| `pull_request` | Automatic when the PR has the `design-review` label | Comment `/design-review` on an issue |

The `/design-review` skill is **label-gated** — it only triggers automatically on pull requests that carry the `design-review` label. It can also be invoked manually by commenting `/design-review` on any issue.

---

## How to Use

**Automatic:** Add the `design-review` label to a pull request. The design audit runs on the next PR event.

**Manual:** Comment on an issue:

```
/design-review
```

**With a URL:**

```
/design-review https://myapp.com
```

**With options:**

```
/design-review https://myapp.com --quick
/design-review https://staging.myapp.com --deep
/design-review --scope "Focus on the settings page"
```

### Parameters

| Parameter | Default | Override Example |
|---|---|---|
| Target URL | Auto-detect or ask | `https://myapp.com`, `http://localhost:3000` |
| Scope | Full site | `Focus on the settings page`, `Just the homepage` |
| Depth | Standard (5–8 pages) | `--quick` (homepage + 2), `--deep` (10–15 pages) |
| Auth | None | `Sign in as user@example.com`, `Import cookies` |

### Modes

- **Full mode (default):** Reviews the entire site at standard depth (5–8 pages)
- **Quick mode (`--quick`):** Homepage plus 2 key pages — fast design check
- **Deep mode (`--deep`):** 10–15 pages — comprehensive visual audit
- **Diff-aware mode:** When on a feature branch with no URL, scopes review to pages affected by branch changes

---

## What It Does

The `/design-review` skill acts as a senior product designer AND frontend engineer. It reviews live sites with exacting visual standards, then fixes what it finds.

### Design Checklist

The review follows the [design review checklist](../skills/references/review-design-checklist.md) which covers 6 categories:

| Category | Items | Examples |
|---|---|---|
| **AI Slop Detection** | 6 checks | Generic gradients, placeholder copy, stock-photo aesthetics, inconsistent icon styles |
| **Typography** | 4 checks | Font hierarchy, line height, orphaned headings, responsive scaling |
| **Spacing & Layout** | 4 checks | Padding consistency, alignment grid, whitespace balance, container widths |
| **Interaction States** | 3 checks | Hover/focus/active states, loading indicators, transition smoothness |
| **DESIGN.md Violations** | 3 checks | Deviations from the project's stated design system (if `DESIGN.md` exists) |
| **Suppressions** | — | Rules for what NOT to flag (e.g., intentional design choices) |

### Confidence Tiers

Each finding is classified by confidence:

| Tier | Confidence | Action |
|---|---|---|
| **HIGH** | Clear violation with evidence | AUTO-FIX — applied directly |
| **MEDIUM** | Likely issue, some ambiguity | ASK — presents options before fixing |
| **LOW** | Subjective or taste-dependent | Report only — included in findings, not fixed |

### Fix Loop (Atomic Commits)

For each design issue found:
1. Take a **before screenshot** at the relevant viewport
2. Fix the issue in source code (CSS, HTML, component files)
3. Commit the fix atomically (one commit per issue)
4. Take an **after screenshot** to prove the improvement
5. Run regression checks to ensure the fix didn't break other views

### Scoring

The skill produces two scores:

- **Design Score** — overall visual quality rating (0–100)
- **AI Slop Score** — how "AI-generated" the interface looks (lower is better)

### Safety Guardrails

- **30 fix cap** — stops after 30 design fixes per session
- **20% risk stop gate** — if fixes start causing regressions at a rate exceeding 20%, the skill stops and reports
- **Clean working tree required** — refuses to start if there are uncommitted changes
- **DESIGN.md calibration** — if a project has a `DESIGN.md`, all design decisions are calibrated against it; deviations are higher severity

---

## Example Output

```
## Design Review — myapp.com
**Date:** 2026-03-12 | **Depth:** Standard (7 pages) | **Design Score:** 65 → 84 | **AI Slop Score:** 4/10 → 2/10

### AI Slop Issues (3)
1. 🔴 Generic gradient background on hero section — replaced with solid brand color (fixed ✅)
2. 🟡 Placeholder "Lorem ipsum" in testimonial section (fixed ✅)
3. 🟡 Inconsistent icon style — mixed outline and filled icons (fixed ✅)

### Typography (2)
1. 🟠 Body text line-height too tight (1.2 → 1.5) (fixed ✅)
2. 🟡 H3 headings orphaned at bottom of columns (fixed ✅)

### Spacing & Layout (3)
1. 🟠 Inconsistent card padding — 16px vs 24px across sections (fixed ✅)
2. 🟡 Footer alignment off-grid by 4px (fixed ✅)
3. 🟡 Mobile: content touching screen edges — added horizontal padding (fixed ✅)

### Interaction States (1)
1. 🟡 Primary buttons missing hover state (fixed ✅)

### Fixes Applied (9)
| # | Category | File | Commit |
|---|---|---|---|
| 1 | AI Slop | src/components/Hero.tsx:12 | abc1234 |
| 2 | AI Slop | src/pages/Home.tsx:45 | def5678 |
| 3 | AI Slop | src/components/Icons.tsx:8 | ghi9012 |
| ... | | | |

### Before/After Evidence
All 9 fixes verified with before/after screenshots at 1440px, 768px, and 375px viewports.
```

---

## Configuration

In [`config.json`](../config.json):

```json
{
  "design-review": {
    "enabled": true,
    "trigger": "pull_request",
    "labelGated": true,
    "label": "design-review"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Set to `false` to disable the skill |
| `trigger` | `string` | GitHub event type — `pull_request` |
| `labelGated` | `boolean` | When `true`, the skill only triggers if the specified label is present |
| `label` | `string` | The label that gates activation — `design-review` |

---

## Requirements

| Requirement | Details |
|---|---|
| Browser | ✅ **Required** — Playwright Chromium (`npx playwright install chromium`) |
| Model | Default model from config (`gpt-5.4`) recommended |
| Permissions | `admin`, `maintain`, or `write` on the repository |
| Tools | Bash, Read, Write, Edit, Glob, Grep, WebSearch |
| Working Tree | Must be clean (`git status --porcelain` returns empty) |

---

## Results

Design review outcomes are persisted to:

```
.github-gstack-intelligence/state/results/design-review/pr-{N}.json
```

Screenshots are captured at multiple viewports (desktop, tablet, mobile) and stored alongside the report as before/after evidence for each fix.

---

## Related Files

| File | Purpose |
|---|---|
| [`skills/design-review.md`](../skills/design-review.md) | Skill prompt definition |
| [`skills/references/review-design-checklist.md`](../skills/references/review-design-checklist.md) | Design review checklist — AI Slop, Typography, Spacing, Interaction States, DESIGN.md violations |
| [`config.json`](../config.json) | Skill enablement and trigger configuration |
| [`lifecycle/router.ts`](../lifecycle/router.ts) | Event routing — maps GitHub events to skills |

---

## See Also

- [`/qa`](qa.md) — QA testing with fixes (complementary — `/qa` finds functional bugs, `/design-review` finds visual issues)
- [`/design-consultation`](design-consultation.md) — Full design system builder (use before `/design-review` to establish a `DESIGN.md`)
- [`/plan-design-review`](plan-design-review.md) — Design review at the plan stage (before implementation)

---

[← Back to Command Reference](README.md)
