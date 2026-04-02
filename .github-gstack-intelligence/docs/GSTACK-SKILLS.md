# GStack Skill Documentation

Complete reference for the seventeen skills available in GitHub GStack Intelligence.

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

Each skill is an AI specialist that runs as a GitHub Actions workflow. Skills are triggered by GitHub events (PRs, comments, labels, releases, schedules, deployments) and configured in [`config.json`](../config.json).

---

## Table of Contents

- [Skill Overview](#skill-overview)
- **Code Quality & Review**
  - [`/review` — PR Code Review](#review--pr-code-review)
  - [`/cso` — Security Audit](#cso--security-audit)
  - [`/investigate` — Systematic Debugging](#investigate--systematic-debugging)
- **QA & Design**
  - [`/qa` — QA Testing with Fixes](#qa--qa-testing-with-fixes)
  - [`/qa-only` — QA Testing (Report Only)](#qa-only--qa-testing-report-only)
  - [`/design-review` — Visual Design Audit](#design-review--visual-design-audit)
  - [`/design-consultation` — Design System Builder](#design-consultation--design-system-builder)
- **Planning**
  - [`/autoplan` — Auto-Review Pipeline](#autoplan--auto-review-pipeline)
  - [`/plan-ceo-review` — CEO/Founder Plan Review](#plan-ceo-review--ceofounder-plan-review)
  - [`/plan-eng-review` — Engineering Plan Review](#plan-eng-review--engineering-plan-review)
  - [`/plan-design-review` — Designer Plan Review](#plan-design-review--designer-plan-review)
  - [`/office-hours` — YC Office Hours](#office-hours--yc-office-hours)
- **Shipping & Documentation**
  - [`/ship` — Automated Ship Workflow](#ship--automated-ship-workflow)
  - [`/document-release` — Release Documentation](#document-release--release-documentation)
- **Operations & Monitoring**
  - [`/retro` — Weekly Retrospective](#retro--weekly-retrospective)
  - [`/benchmark` — Performance Regression Detection](#benchmark--performance-regression-detection)
  - [`/canary` — Post-Deploy Monitoring](#canary--post-deploy-monitoring)

---

## Skill Overview

| Skill | Trigger | Browser | Default |
|---|---|---|---|
| [`review`](#review--pr-code-review) | Automatic on PR | No | Enabled |
| [`cso`](#cso--security-audit) | PR with `security-audit` label | No | Enabled |
| [`investigate`](#investigate--systematic-debugging) | Issue with `investigate` label | No | Enabled |
| [`qa`](#qa--qa-testing-with-fixes) | `/qa [url]` comment | Yes | Enabled |
| [`qa-only`](#qa-only--qa-testing-report-only) | `/qa-only [url]` comment | Yes | Enabled |
| [`design-review`](#design-review--visual-design-audit) | PR with `design-review` label | Yes | Enabled |
| [`design-consultation`](#design-consultation--design-system-builder) | Issue with `design-consultation` label | No | Enabled |
| [`autoplan`](#autoplan--auto-review-pipeline) | `/autoplan` comment | No | Enabled |
| [`plan-ceo-review`](#plan-ceo-review--ceofounder-plan-review) | `/plan-ceo-review` comment | No | Enabled |
| [`plan-eng-review`](#plan-eng-review--engineering-plan-review) | `/plan-eng-review` comment | No | Enabled |
| [`plan-design-review`](#plan-design-review--designer-plan-review) | `/plan-design-review` comment | No | Enabled |
| [`office-hours`](#office-hours--yc-office-hours) | Issue with `office-hours` label | No | Enabled |
| [`ship`](#ship--automated-ship-workflow) | `/ship` comment | No | Enabled |
| [`document-release`](#document-release--release-documentation) | Automatic on release | No | Enabled |
| [`retro`](#retro--weekly-retrospective) | Scheduled (Fridays 5 PM UTC) | No | Disabled |
| [`benchmark`](#benchmark--performance-regression-detection) | Scheduled (daily 6 AM UTC) | No | Disabled |
| [`canary`](#canary--post-deploy-monitoring) | Automatic on deployment success | Yes | Disabled |

---

## Code Quality & Review

---

### `/review` — PR Code Review

**Trigger:** Automatic on every `pull_request` event (opened or synchronized), or manually by commenting `/review` on an issue.

**What it does:** Performs a structured, checklist-driven pre-landing code review. Analyzes the PR diff against the base branch for SQL injection, LLM trust boundary violations, race conditions, conditional side effects, and other structural issues. Classifies findings by severity (critical, informational) and posts results as a PR comment. Auto-fixes mechanical issues and flags critical findings that require human approval.

**Example input:**

Open a pull request — the review runs automatically. Or comment on an issue:

```
/review
```

**Example output:**

> ## Code Review — PR #42
>
> ### Critical (2)
> 1. **SQL Injection** in `src/db.ts:45` — user input directly interpolated into query
> 2. **Race condition** in `src/auth.ts:112` — token refresh not mutex-protected
>
> ### Informational (3)
> 1. Unused import `fs` in `src/utils.ts:1`
> 2. Consider extracting repeated error handling into a helper
> 3. Documentation in `README.md` references removed endpoint

**Configuration:**

```json
{
  "review": {
    "enabled": true,
    "trigger": "pull_request"
  }
}
```

**Model recommendation:** `gpt-5.4` (default). High-quality reasoning benefits review depth. Economy tier models work for smaller PRs.

**Results saved to:** `state/results/review/pr-{N}.json`

---

### `/cso` — Security Audit

**Trigger:** Automatic on `pull_request` event when the PR has the `security-audit` label. Can also be invoked by commenting `/cso` on an issue.

**What it does:** Chief Security Officer audit performing secrets archaeology (scanning git history for exposed keys), dependency supply chain analysis, CI/CD pipeline security review, LLM/AI integration security checks, and OWASP Top 10 / STRIDE threat modeling. Produces a Security Posture Report without making code changes. Supports two modes: daily (8/10 confidence gate for zero noise) and comprehensive (2/10 bar for monthly deep scans).

**Example input:**

Add the `security-audit` label to a PR, or comment:

```
/cso
```

**Example output:**

> ## Security Posture Report — PR #55
>
> ### Secrets Archaeology
> ✅ No exposed secrets found in git history
>
> ### Dependency Supply Chain
> ⚠️ `lodash@4.17.20` — known prototype pollution (CVE-2021-23337), upgrade to 4.17.21+
>
> ### OWASP Top 10
> 🔴 **A03:2021 Injection** — unsanitized user input in `src/search.ts:89`
>
> ### Threat Model (STRIDE)
> Spoofing: Low | Tampering: Medium | Repudiation: Low | Info Disclosure: Low | DoS: Low | Elevation: Low

**Configuration:**

```json
{
  "cso": {
    "enabled": true,
    "trigger": "pull_request",
    "labelGated": true,
    "label": "security-audit"
  }
}
```

**Model recommendation:** `gpt-5.4` (default). Security analysis benefits from stronger reasoning models.

**Results saved to:** `state/results/security/pr-{N}.json`

---

### `/investigate` — Systematic Debugging

**Trigger:** Automatic when an issue is opened with the `investigate` label. Can also be invoked by commenting `/investigate` on an issue.

**What it does:** Root cause investigation following the Iron Law: "no fixes without root cause investigation first." Four-phase methodology — investigate, analyze, hypothesize, implement — that prevents whack-a-mole debugging. Traces code paths from symptoms to causes, checks recent changes and git history for regressions, matches bugs against known patterns (race conditions, nil propagation, state corruption), and writes regression tests proving the fix works. Enforces scope lock and a 3-strike rule (stops after 3 failed hypotheses).

**Example input:**

Create an issue with the `investigate` label:

```
Title: Login fails intermittently after deploy
Body: Users report being logged out randomly. Started after last Thursday's deploy.
      Error: "session not found" in server logs.
```

**Example output:**

> ## Debug Report — Issue #31
>
> ### Root Cause
> Race condition in `src/auth/session.ts:112` — token refresh and session
> validation run concurrently without mutex protection. Under load, the refresh
> overwrites the session while validation reads stale data.
>
> ### Fix Applied
> Added mutex lock around token refresh (commit `abc1234`).
> Regression test added: `tests/auth/session-race.test.ts`
>
> ### Evidence
> - Reproduced locally with concurrent requests
> - Fix verified: 1000 concurrent logins, zero "session not found" errors

**Configuration:**

```json
{
  "investigate": {
    "enabled": true,
    "trigger": "issue_label",
    "label": "investigate"
  }
}
```

**Model recommendation:** `gpt-5.4` (default). Deep debugging requires strong reasoning.

---

## QA & Design

---

### `/qa` — QA Testing with Fixes

**Trigger:** Comment `/qa` or `/qa <url>` on an issue.

**What it does:** Systematically tests a web application like a real user — clicking everything, filling forms, checking states — finds bugs, then iteratively fixes them in source code with atomic commits and re-verifies. Takes before/after screenshots, captures console errors, and produces a health score report with fix evidence. Supports three tiers: Quick (critical/high only), Standard (+ medium), and Exhaustive (+ cosmetic). Caps at 50 fixes per session to prevent scope creep.

**Example input:**

```
/qa https://my-app.vercel.app
```

Or without a URL (uses the project's configured URL):

```
/qa
```

**Example output:**

> ## QA Report — Issue #18
>
> **URL:** https://my-app.vercel.app
> **Health score:** 62 → 91 (+29)
>
> | # | Issue | Severity | Status | Commit |
> |---|---|---|---|---|
> | 1 | Login form submits on empty fields | Critical | ✅ Fixed | `d4e5f6a` |
> | 2 | Mobile nav overlay doesn't close | High | ✅ Fixed | `a1b2c3d` |
> | 3 | Console error: "Cannot read null" on /settings | Medium | ✅ Fixed | `e7f8g9h` |
> | 4 | Footer overlaps content at 320px | Low | ⏭️ Deferred | — |
>
> **Screenshots:** Before/after attached for each viewport.

**Configuration:**

```json
{
  "qa": {
    "enabled": true,
    "trigger": "issue_comment"
  }
}
```

**Requires browser:** Yes — Playwright Chromium is launched for page interaction.

**Model recommendation:** `gpt-5.4` (default). QA requires both visual analysis and code generation for fixes.

**Results saved to:** `state/results/qa/issue-{N}.json`

---

### `/qa-only` — QA Testing (Report Only)

**Trigger:** Comment `/qa-only` or `/qa-only <url>` on an issue.

**What it does:** Runs the same systematic QA testing methodology as `/qa` — navigation, forms, interactions, console checks, responsive layout verification — but **never fixes anything**. Report-only mode. Captures screenshots and documents issues with severity levels and reproduction steps. Useful for stakeholders who want bug findings without code changes, or when you want to assess quality before deciding on a fix strategy.

**Example input:**

```
/qa-only https://staging.my-app.com
```

**Example output:**

> ## QA Report (Read-Only) — Issue #22
>
> **URL:** https://staging.my-app.com
> **Issues found:** 7
>
> | # | Issue | Severity | Location | Repro Steps |
> |---|---|---|---|---|
> | 1 | Signup button unresponsive | Critical | /signup | Click "Sign Up" with valid data |
> | 2 | Image alt text missing on 12 images | Medium | /about | Accessibility audit |
> | 3 | Layout breaks at 375px viewport | Medium | /pricing | Resize to mobile |
>
> **Screenshots:** Attached for each finding at desktop, tablet, and mobile viewports.

**Configuration:**

```json
{
  "qa-only": {
    "enabled": true,
    "trigger": "issue_comment"
  }
}
```

**Requires browser:** Yes — Playwright Chromium is launched for page interaction.

**Model recommendation:** `gpt-5.4` (default). Same reasoning needs as `/qa` for accurate bug identification.

**Results saved to:** `state/results/qa/issue-{N}.json`

---

### `/design-review` — Visual Design Audit

**Trigger:** Automatic on `pull_request` event when the PR has the `design-review` label. Can also be invoked by commenting `/design-review` on an issue.

**What it does:** Designer's-eye QA that finds visual inconsistency, spacing issues, hierarchy problems, AI slop patterns, and slow interactions on live sites — then fixes them iteratively with atomic commits. Takes before/after screenshots at multiple viewports. Rates a design score and an "AI slop" score (detecting generic card grids, centered hero sections, 3-column features). Caps at 30 design fixes per session with a 20% risk stop gate.

**Example input:**

Add the `design-review` label to a PR that changes frontend code.

**Example output:**

> ## Design Review — PR #67
>
> **Design score:** 5.2 → 7.8 (+2.6)
> **AI slop score:** 4/10 → 2/10 (improved)
>
> | # | Issue | Category | Status | Commit |
> |---|---|---|---|---|
> | 1 | Inconsistent button padding (12px vs 16px) | Spacing | ✅ Fixed | `f1a2b3c` |
> | 2 | H2 and H3 look identical — no hierarchy | Typography | ✅ Fixed | `d4e5f6g` |
> | 3 | Generic 3-column feature grid (AI slop) | Layout | ✅ Fixed | `h7i8j9k` |
> | 4 | Missing hover state on nav links | Interaction | ⏭️ Deferred | — |

**Configuration:**

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

**Requires browser:** Yes — Playwright Chromium captures screenshots at multiple viewports.

**Model recommendation:** `gpt-5.4` (default). Visual analysis and CSS generation benefit from stronger models.

**Results saved to:** `state/results/design-review/pr-{N}.json`

---

### `/design-consultation` — Design System Builder

**Trigger:** Automatic when an issue is opened with the `design-consultation` label. Can also be invoked by commenting `/design-consultation` on an issue.

**What it does:** Understands your product, researches the landscape, and proposes a complete design system — aesthetic, typography, color palette, layout grid, spacing scale, and motion principles. Creates a `DESIGN.md` file as your project's design source of truth, including HTML preview pages showing fonts and colors in action. Reads existing design docs or starts fresh. Integrates prior `/office-hours` output for product direction context.

**Example input:**

Create an issue with the `design-consultation` label:

```
Title: Design system for our developer tools dashboard
Body: We're building a CLI dashboard web app targeting senior engineers.
      Aesthetic: professional, minimal, dark mode preferred.
```

**Example output:**

> ## Design Consultation — Issue #40
>
> ### Proposed Design System
>
> **Aesthetic:** Technical minimalism — clean lines, monospace accents, dark-first
>
> **Typography:**
> - Headings: Inter, 600 weight, 1.2 line-height
> - Body: Inter, 400 weight, 1.5 line-height
> - Code: JetBrains Mono, 400 weight
>
> **Color palette:**
> - Primary: `#6366F1` (Indigo 500)
> - Background: `#0F172A` (Slate 900)
> - Surface: `#1E293B` (Slate 800)
> - Text: `#F8FAFC` (Slate 50)
> - Accent: `#22D3EE` (Cyan 400)
>
> **Spacing scale:** 4px base — 4, 8, 12, 16, 24, 32, 48, 64
>
> _Preview page generated at `design-preview.html`_
> _Design system saved to `DESIGN.md`_

**Configuration:**

```json
{
  "design-consultation": {
    "enabled": true,
    "trigger": "issue_label",
    "label": "design-consultation"
  }
}
```

**Model recommendation:** `gpt-5.4` (default). Creative design decisions benefit from stronger reasoning.

---

## Planning

---

### `/autoplan` — Auto-Review Pipeline

**Trigger:** Comment `/autoplan` on an issue.

**What it does:** One-command, fully-reviewed plan. Loads the CEO review, design review, and engineering review skills and runs them sequentially with auto-decisions using 6 decision principles (completeness, boil lakes, pragmatic, DRY, explicit over clever, bias toward action). Auto-decides mechanical decisions silently and surfaces taste decisions (where reasonable people disagree) at a final approval gate. The output is a fully reviewed plan ready for implementation.

**Example input:**

```
/autoplan
```

(Run on an issue that already contains a plan or feature description.)

**Example output:**

> ## Auto-Review Pipeline — Issue #50
>
> ### CEO Review ✅
> - Scope: HOLD (no expansion needed)
> - 3 edge cases identified and added to plan
> - ASCII diagram added for auth flow
>
> ### Design Review ✅
> - Empty states specified for all 4 screens
> - Mobile breakpoints defined
> - Accessibility: keyboard nav + screen reader requirements added
>
> ### Engineering Review ✅
> - Data flow diagram added
> - Race condition in webhook handler flagged — mutex recommended
> - Test coverage gaps: 3 integration tests specified
>
> ### Taste Decisions (require your approval)
> 1. **Caching strategy:** Redis vs in-memory — both viable, Redis recommended for scale
> 2. **Error format:** Structured JSON vs plain text — JSON recommended for API consistency

**Configuration:**

```json
{
  "autoplan": {
    "enabled": true,
    "trigger": "issue_comment"
  }
}
```

**Model recommendation:** `gpt-5.4` (default). Chains three skills — reasoning quality compounds across the pipeline.

---

### `/plan-ceo-review` — CEO/Founder Plan Review

**Trigger:** Comment `/plan-ceo-review` on an issue. Also runs as part of `/autoplan`.

**What it does:** CEO/founder-mode review that rethinks the problem, finds the "10-star product," challenges premises, and expands scope when it creates a better product. Applies 14 cognitive patterns of great CEOs (classification, paranoid scanning, inversion, focus, people-first) and 9 Prime Directives (zero silent failures, named errors, shadow paths, observability, diagrams). Four scope modes: SCOPE EXPANSION (dream big), SELECTIVE EXPANSION (hold + cherry-pick), HOLD SCOPE (bulletproof), SCOPE REDUCTION (essentials only). Output is an improved plan — no code changes.

**Example input:**

```
/plan-ceo-review
```

**Example output:**

> ## CEO Review — Issue #50
>
> **Scope mode selected:** SELECTIVE EXPANSION
>
> ### Expansion Opportunities
> 1. ✅ **Accept:** Add webhook retry logic — prevents data loss, 2 hours of work
> 2. ❌ **Reject:** Multi-tenant support — out of scope for v1, captured in TODOS.md
> 3. 🤔 **Your call:** Dark mode — easy win but delays launch by 1 day
>
> ### Failure Modes Identified
> - What if the webhook endpoint is down for 24 hours?
> - What if a user has 10,000 items? (pagination not in plan)
>
> ### Diagrams Added
> ```
> User → API Gateway → Auth → Handler → DB
>                         ↓
>                    Rate Limiter
> ```

**Configuration:**

```json
{
  "plan-ceo-review": {
    "enabled": true,
    "trigger": "issue_comment"
  }
}
```

**Model recommendation:** `gpt-5.4` (default). Strategic thinking requires strong reasoning.

---

### `/plan-eng-review` — Engineering Plan Review

**Trigger:** Comment `/plan-eng-review` on an issue. Also runs as part of `/autoplan`.

**What it does:** Engineering manager-mode review that locks in execution architecture, data flow, diagrams, edge cases, test coverage, and performance before any code is written. Applies 15 cognitive patterns of great eng managers (state diagnosis, blast radius, boring by default, reversibility, failure is information). Demands ASCII diagrams for data flow, state machines, and dependency graphs. Identifies essential vs accidental complexity and applies the "two-week smell test" — can a competent engineer ship a small feature in 2 weeks?

**Example input:**

```
/plan-eng-review
```

**Example output:**

> ## Engineering Review — Issue #50
>
> ### Architecture
> - Data flow: Request → Validate → Transform → Store → Notify
> - State machine for order lifecycle: Draft → Pending → Confirmed → Shipped → Delivered
>
> ### Concerns
> 1. **Blast radius:** Database migration touches 3 tables — add rollback script
> 2. **Missing test coverage:** No integration test for the webhook → DB pipeline
> 3. **Performance:** N+1 query in order listing — add eager loading
>
> ### Diagrams Required
> ```
> [Client] → [API] → [Queue] → [Worker] → [DB]
>                                   ↓
>                              [Notification]
> ```
>
> ### Two-Week Test: ✅ Pass
> Core feature is shippable in ~8 days with current architecture.

**Configuration:**

```json
{
  "plan-eng-review": {
    "enabled": true,
    "trigger": "issue_comment"
  }
}
```

**Model recommendation:** `gpt-5.4` (default). Technical architecture analysis benefits from deeper reasoning.

---

### `/plan-design-review` — Designer Plan Review

**Trigger:** Comment `/plan-design-review` on an issue. Also runs as part of `/autoplan`.

**What it does:** Interactive designer's-eye plan review that rates each design dimension 0–10, explains what would make it a 10, then improves the plan. Applies 9 design principles (empty states are features, every screen has hierarchy, specificity over vibes, AI slop is the enemy) and 14 cognitive patterns of great designers (seeing systems, empathy simulation, gestalt psychology, micro-interactions). Generates mockup variants and audits empty states, error states, and edge cases. Does not make code changes — improves the plan document.

**Example input:**

```
/plan-design-review
```

**Example output:**

> ## Design Review — Issue #50
>
> ### Dimension Ratings
> | Dimension | Score | To reach 10 |
> |---|---|---|
> | Visual hierarchy | 6/10 | Specify heading sizes, weights, and spacing for each screen |
> | Empty states | 3/10 | Design empty states for dashboard, search results, notifications |
> | Responsive design | 7/10 | Add tablet breakpoint (768px), specify touch targets |
> | Accessibility | 4/10 | Add keyboard nav spec, define focus indicators, ARIA labels |
>
> ### Mockups Generated
> - Dashboard (desktop): clean data table with empty state variant
> - Dashboard (mobile): stacked cards replacing table layout
>
> ### Edge Cases Specified
> - User with a 47-character name (truncation rule defined)
> - Zero search results (illustrated empty state with suggestions)

**Configuration:**

```json
{
  "plan-design-review": {
    "enabled": true,
    "trigger": "issue_comment"
  }
}
```

**Model recommendation:** `gpt-5.4` (default). Design reasoning and mockup generation benefit from stronger models.

---

### `/office-hours` — YC Office Hours

**Trigger:** Automatic when an issue is opened with the `office-hours` label. Can also be invoked by commenting `/office-hours` on an issue.

**What it does:** YC office hours partner mode that ensures problems are understood before solutions are proposed. Two modes: **Startup mode** (six forcing questions about demand reality, status quo, wedge, observations) and **Builder mode** (enthusiastic collaborative brainstorming for side projects, hackathons, learning). Reads existing design docs and prior office-hours outputs for context. Produces a design document — no code changes.

**Example input:**

Create an issue with the `office-hours` label:

```
Title: Should we pivot from B2B to B2C?
Body: We have 50 B2B customers paying $200/mo but growth stalled.
      Consumer interest is 10x higher based on signup page traffic.
```

**Example output:**

> ## Office Hours — Issue #35
>
> ### Forcing Questions
>
> **1. Demand reality:** Are the 10x consumer signups converting, or just curious?
> What's the signup-to-active ratio vs your B2B conversion?
>
> **2. Status quo:** Your B2B customers are paying — what's their alternative if you disappear?
> If they'd be fine, that's a weak moat. If they'd scramble, that's real value.
>
> **3. Narrowest wedge:** Instead of full pivot, could you serve a B2C niche that overlaps
> with your B2B strength? (e.g., prosumers who later become enterprise champions)
>
> ### Design Document
> _Saved to state for future `/autoplan` context._

**Configuration:**

```json
{
  "office-hours": {
    "enabled": true,
    "trigger": "issue_label",
    "label": "office-hours"
  }
}
```

**Model recommendation:** `gpt-5.4` (default). Nuanced strategic conversation benefits from strong reasoning.

---

## Shipping & Documentation

---

### `/ship` — Automated Ship Workflow

**Trigger:** Comment `/ship` on an issue.

**What it does:** Fully automated, non-interactive shipping workflow. Detects the base branch, merges, runs tests, performs a pre-landing review (if not already done), bumps `VERSION`, updates `CHANGELOG.md`, commits, pushes, and creates a PR. The user says `/ship` which means "do it" — the skill runs straight through with minimal stopping conditions. Only stops for: merge conflicts, in-branch test failures, ASK items from review, or plan verification failures. Auto-picks PATCH version bumps (asks for MINOR/MAJOR).

**Example input:**

```
/ship
```

**Example output:**

> ## Ship Report — Issue #45
>
> ### Pipeline
> 1. ✅ Base branch detected: `main`
> 2. ✅ Tests passing (47/47)
> 3. ✅ Pre-landing review: clean (from prior `/review`)
> 4. ✅ Version bumped: 1.0.3 → 1.0.4
> 5. ✅ CHANGELOG updated
> 6. ✅ Commits created (3 bisectable commits)
> 7. ✅ PR opened: #46
>
> **PR URL:** https://github.com/your-org/your-repo/pull/46

**Configuration:**

```json
{
  "ship": {
    "enabled": true,
    "trigger": "issue_comment"
  }
}
```

**Model recommendation:** `gpt-5.4` (default). Shipping requires reliable code generation for version bumps and changelog.

---

### `/document-release` — Release Documentation

**Trigger:** Automatic on `release` event (when a new release is published).

**What it does:** Post-ship documentation update ensuring all project docs (README, ARCHITECTURE, CONTRIBUTING, CLAUDE.md) are accurate and up-to-date with shipped code. Cross-references the diff, updates factual content automatically, polishes CHANGELOG voice, cleans TODOS.md, and optionally bumps VERSION. Classifies updates as auto-update (factual/safe) or ask-user (narrative/risky). Never silently changes VERSION — always asks.

**Example input:**

Publish a release on GitHub — the skill runs automatically.

**Example output:**

> ## Documentation Update — Release v1.2.0
>
> ### Auto-Updated
> - README.md: Updated API endpoint list (+2 new endpoints)
> - ARCHITECTURE.md: Added webhook subsystem diagram
> - CONTRIBUTING.md: Updated test command (was `npm test`, now `bun test`)
>
> ### CHANGELOG Polish
> - "Fixed bug" → "Fixed race condition in session refresh that caused intermittent logouts"
>
> ### TODOS Cleaned
> - ✅ Marked 3 items as completed
> - ➕ Added 1 new deferred item from review findings

**Configuration:**

```json
{
  "document-release": {
    "enabled": true,
    "trigger": "release"
  }
}
```

**Model recommendation:** `gpt-5.4` (default). Documentation accuracy requires strong comprehension of code changes.

**Results saved to:** `state/results/releases/{tag}.json`

---

## Operations & Monitoring

---

### `/retro` — Weekly Retrospective

**Trigger:** Scheduled via cron — `0 17 * * 5` (Fridays at 5 PM UTC). Can also be invoked by commenting `/retro` on an issue.

**What it does:** Weekly engineering retrospective analyzing commit history, work patterns, and code quality metrics. Team-aware breakdown of per-person contributions with praise and growth areas. Compares the current window vs the prior window for trend detection. Default 7-day window with support for 24h, 14d, 30d, or custom ranges. Results are persisted for cross-retro trend tracking.

**Example input:**

Runs automatically on schedule, or comment:

```
/retro
```

**Example output:**

> ## Weekly Retro — 2026-03-23 to 2026-03-30
>
> ### Team Summary
> - 47 commits across 3 contributors
> - 12 PRs merged (avg review time: 4.2 hours)
> - Test coverage: 78% → 82% (+4%)
>
> ### Per-Person Breakdown
> | Contributor | Commits | Files | +/- | Test:Prod Ratio |
> |---|---|---|---|---|
> | @alice | 22 | 34 | +1,200 / -400 | 1:3.2 |
> | @bob | 18 | 28 | +800 / -600 | 1:2.1 |
> | @carol | 7 | 12 | +300 / -50 | 1:1.5 ⭐ |
>
> ### Trends
> - 📈 Commit velocity up 15% from last week
> - 📉 Review turnaround slowed by 2 hours — consider async review norms
>
> ### Praise
> - @carol: Best test-to-production ratio this sprint

**Configuration:**

```json
{
  "retro": {
    "enabled": false,
    "trigger": "schedule",
    "schedule": "0 17 * * 5"
  }
}
```

> **Note:** Disabled by default. Set `"enabled": true` to activate the weekly schedule.

**Model recommendation:** `gpt-5.4` (default). Trend analysis and team insights benefit from stronger reasoning.

**Results saved to:** `state/results/retro/{date}.json`

---

### `/benchmark` — Performance Regression Detection

**Trigger:** Scheduled via cron — `0 6 * * *` (daily at 6 AM UTC). Can also be invoked by commenting `/benchmark` on an issue.

**What it does:** Performance regression detection using browser automation to establish baselines for page load times, Core Web Vitals, and resource sizes. Captures real `performance.getEntries()` data (not estimates) including TTFB, FCP, LCP, DOM interactive/complete, full load time, request counts, and transfer sizes. Compares against committed baselines with regression thresholds: >50% timing increase OR >500ms absolute increase = REGRESSION. Tracks trends over time and checks performance budgets against industry standards.

**Example input:**

Runs automatically on schedule, or comment:

```
/benchmark
```

**Example output:**

> ## Benchmark Report — 2026-03-30
>
> ### Page Metrics
> | Page | LCP | FCP | TTFB | Transfer | Status |
> |---|---|---|---|---|---|
> | / | 1.2s | 0.4s | 120ms | 245 KB | ✅ Pass |
> | /dashboard | 2.8s | 0.6s | 180ms | 890 KB | ⚠️ Regression (+35%) |
> | /settings | 1.1s | 0.3s | 95ms | 120 KB | ✅ Pass |
>
> ### Regressions Detected
> - `/dashboard` LCP: 2.1s → 2.8s (+33%, +700ms) — new chart library added 400 KB
>
> ### Bundle Analysis
> - JS total: 1.2 MB (+180 KB from last run)
> - Slowest resource: `chart-bundle.js` (420ms load, 380 KB)
>
> ### Trend (30-day)
> - LCP average: improving (2.4s → 1.8s)
> - Bundle size: growing (+15% this month)

**Configuration:**

```json
{
  "benchmark": {
    "enabled": false,
    "trigger": "schedule",
    "schedule": "0 6 * * *"
  }
}
```

> **Note:** Disabled by default. Set `"enabled": true` to activate the daily schedule.

**Model recommendation:** `gpt-5.4` (default). Performance analysis and recommendation generation benefit from strong reasoning.

**Results saved to:** `state/benchmarks/history/{date}.json`

---

### `/canary` — Post-Deploy Monitoring

**Trigger:** Automatic on `deployment_status` event when the deployment status is `success`. Can also be invoked by commenting `/canary <url>` on an issue.

**What it does:** Post-deploy visual monitoring that watches the live app for console errors, performance regressions, and page failures. Takes periodic screenshots, compares against pre-deploy baselines, and alerts on anomalies. Monitors for 10 minutes by default (configurable 1–30 minutes). Only alerts on patterns persistent across 2+ checks to avoid transient noise. Compares changes against the baseline, not absolute standards. Offers baseline update after a healthy deploy.

**Example input:**

Runs automatically after successful deployment, or comment:

```
/canary https://my-app.vercel.app
```

**Example output:**

> ## Canary Report — Deployment #89
>
> **URL:** https://my-app.vercel.app
> **Duration:** 10 minutes (6 checks)
>
> ### Page Health
> | Page | Status | Console Errors | Performance |
> |---|---|---|---|
> | / | ✅ Healthy | 0 new | LCP stable (1.1s) |
> | /dashboard | ⚠️ Alert | 2 new errors | LCP +400ms |
> | /settings | ✅ Healthy | 0 new | Stable |
>
> ### Alerts (persistent across 2+ checks)
> 1. `/dashboard`: `TypeError: Cannot read property 'map' of undefined` — new in this deploy
> 2. `/dashboard`: LCP regression 1.8s → 2.2s — persistent across all 6 checks
>
> ### Recommendation
> Investigate `/dashboard` console errors before updating baseline.

**Configuration:**

```json
{
  "canary": {
    "enabled": false,
    "trigger": "deployment_status"
  }
}
```

> **Note:** Disabled by default. Set `"enabled": true` to activate post-deploy monitoring.

**Requires browser:** Yes — Playwright Chromium captures screenshots and monitors pages.

**Model recommendation:** `gpt-5.4` (default). Anomaly detection and comparison against baselines benefit from reasoning depth.

**Results saved to:** `state/results/canary/{timestamp}.json`

---

## Enabling and Disabling Skills

Edit `.github-gstack-intelligence/config.json` to enable or disable any skill:

```json
{
  "skills": {
    "review": { "enabled": true, "trigger": "pull_request" },
    "retro": { "enabled": true, "trigger": "schedule", "schedule": "0 17 * * 5" }
  }
}
```

- Set `"enabled": false` to disable a skill without removing its configuration.
- Label-gated skills (`cso`, `design-review`) only trigger when the specified label is present on the PR.
- Scheduled skills (`retro`, `benchmark`) require the cron schedule to be registered in the workflow file.
- All skills use the global model configured in `.github-gstack-intelligence/.pi/settings.json`.

---

## Quick Reference

| Action | Command / Trigger |
|---|---|
| Review a PR | Open a PR (automatic) or `/review` |
| Security audit | Add `security-audit` label to PR |
| Debug a bug | Open issue with `investigate` label |
| Test a site and fix bugs | `/qa https://example.com` |
| Test a site (report only) | `/qa-only https://example.com` |
| Audit visual design | Add `design-review` label to PR |
| Build a design system | Open issue with `design-consultation` label |
| Full plan review pipeline | `/autoplan` |
| CEO-level plan review | `/plan-ceo-review` |
| Engineering plan review | `/plan-eng-review` |
| Designer plan review | `/plan-design-review` |
| Brainstorm / office hours | Open issue with `office-hours` label |
| Ship the branch | `/ship` |
| Update docs after release | Publish a release (automatic) |
| Weekly retrospective | Scheduled (or `/retro`) |
| Performance benchmarks | Scheduled (or `/benchmark`) |
| Post-deploy monitoring | Deploy succeeds (or `/canary <url>`) |

---

*See [config.json](../config.json) for the full configuration. See the [README](../README.md) for installation and setup.*
