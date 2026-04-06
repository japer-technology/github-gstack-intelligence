# GStack Intelligence — Command Reference

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

GitHub GStack Intelligence ships twenty-six AI skills that run as GitHub Actions workflows. Each skill is an AI specialist triggered by GitHub events — pull requests, issue comments, labels, releases, schedules, and deployments.

This directory is the single source of truth for command documentation. Click any command below to see the full reference.

---

## Quick Reference

| Command | Summary | Trigger | Browser | Default |
|---|---|---|---|---|
| [`/review`](review.md) | PR code review — SQL injection, race conditions, trust boundaries | Automatic on PR | No | ✅ Enabled |
| [`/cso`](cso.md) | Chief Security Officer audit — secrets, supply chain, OWASP, STRIDE | PR + `security-audit` label | No | ✅ Enabled |
| [`/investigate`](investigate.md) | Systematic root-cause debugging with 4-phase methodology | Issue + `investigate` label | No | ✅ Enabled |
| [`/qa`](qa.md) | QA testing with automated fixes and before/after evidence | `/qa [url]` comment | Yes | ✅ Enabled |
| [`/qa-only`](qa-only.md) | QA testing — report only, no code changes | `/qa-only [url]` comment | Yes | ✅ Enabled |
| [`/design-review`](design-review.md) | Visual design audit with iterative fixes | PR + `design-review` label | Yes | ✅ Enabled |
| [`/design-consultation`](design-consultation.md) | Full design system builder — typography, color, layout | Issue + `design-consultation` label | No | ✅ Enabled |
| [`/design-html`](design-html.md) | Design finalization — production-quality HTML/CSS | `/design-html` comment | Yes | ✅ Enabled |
| [`/design-shotgun`](design-shotgun.md) | Rapid design exploration — multiple variant comparison | `/design-shotgun` comment | Yes | ✅ Enabled |
| [`/autoplan`](autoplan.md) | One-command CEO + Design + Eng review pipeline | `/autoplan` comment | No | ✅ Enabled |
| [`/plan-ceo-review`](plan-ceo-review.md) | CEO/founder plan review — scope, strategy, failure modes | `/plan-ceo-review` comment | No | ✅ Enabled |
| [`/plan-eng-review`](plan-eng-review.md) | Engineering plan review — architecture, data flow, tests | `/plan-eng-review` comment | No | ✅ Enabled |
| [`/plan-design-review`](plan-design-review.md) | Designer plan review — hierarchy, empty states, accessibility | `/plan-design-review` comment | No | ✅ Enabled |
| [`/plan-devex-review`](plan-devex-review.md) | Developer experience plan review — DX scoring and personas | `/plan-devex-review` comment | No | ✅ Enabled |
| [`/devex-review`](devex-review.md) | Live developer experience audit with DX scorecard | `/devex-review` comment | Yes | ✅ Enabled |
| [`/office-hours`](office-hours.md) | YC office hours — startup forcing questions or builder brainstorm | Issue + `office-hours` label | No | ✅ Enabled |
| [`/ship`](ship.md) | Automated ship workflow — merge, test, version bump, PR | `/ship` comment | No | ✅ Enabled |
| [`/land-and-deploy`](land-and-deploy.md) | Land and deploy — merge PR, CI, production verification | `/land-and-deploy` comment | Yes | ✅ Enabled |
| [`/document-release`](document-release.md) | Post-ship documentation update | Automatic on release | No | ✅ Enabled |
| [`/careful`](careful.md) | Safety guardrails — warns before destructive commands | `/careful` comment | No | ✅ Enabled |
| [`/guard`](guard.md) | Full safety — destructive warnings + directory-scoped edits | `/guard` comment | No | ✅ Enabled |
| [`/health`](health.md) | Code quality dashboard — composite 0–10 score with trends | `/health` comment | No | ✅ Enabled |
| [`/learn`](learn.md) | Manage project learnings — review, search, prune, export | `/learn` comment | No | ✅ Enabled |
| [`/retro`](retro.md) | Weekly engineering retrospective with trend tracking | Scheduled (Fridays 5 PM UTC) | No | ❌ Disabled |
| [`/benchmark`](benchmark.md) | Performance regression detection with Core Web Vitals | Scheduled (daily 6 AM UTC) | No | ❌ Disabled |
| [`/canary`](canary.md) | Post-deploy monitoring and anomaly detection | Automatic on deployment | Yes | ❌ Disabled |

---

## Skills by Category

### Code Quality & Review

| Command | What it does |
|---|---|
| [`/review`](review.md) | Structured, checklist-driven pre-landing code review. Analyzes PR diffs for SQL injection, LLM trust boundary violations, race conditions, and conditional side effects. Auto-fixes mechanical issues, flags critical findings. |
| [`/cso`](cso.md) | Chief Security Officer audit — secrets archaeology, dependency supply chain analysis, CI/CD pipeline security, LLM/AI integration checks, and OWASP Top 10 / STRIDE threat modeling. |
| [`/investigate`](investigate.md) | Root cause investigation following the Iron Law: "no fixes without root cause investigation first." Four-phase methodology with scope lock and a 3-strike rule. |

### QA & Design

| Command | What it does |
|---|---|
| [`/qa`](qa.md) | Systematically tests a web app like a real user — clicks everything, fills forms, checks states — finds bugs, then iteratively fixes them with atomic commits and re-verifies. |
| [`/qa-only`](qa-only.md) | Same testing methodology as `/qa` but report-only — captures screenshots and documents issues without making any code changes. |
| [`/design-review`](design-review.md) | Designer's-eye QA that finds visual inconsistency, spacing issues, hierarchy problems, and AI slop patterns — then fixes them iteratively with before/after screenshots. |
| [`/design-consultation`](design-consultation.md) | Proposes a complete design system — aesthetic, typography, color palette, layout grid, spacing scale, and motion principles. Creates a `DESIGN.md` as the project's design source of truth. |
| [`/design-html`](design-html.md) | Design finalization — generates production-quality HTML/CSS from approved mockups, CEO plans, or design review context. Dynamic layouts, real reflow, zero dependencies. |
| [`/design-shotgun`](design-shotgun.md) | Design exploration — generates multiple AI design variants, opens a comparison board, collects structured feedback, and iterates. Visual brainstorming for any UI feature. |

### Planning

| Command | What it does |
|---|---|
| [`/autoplan`](autoplan.md) | One-command, fully-reviewed plan. Runs CEO, design, and engineering reviews sequentially with auto-decisions. Surfaces taste decisions at a final approval gate. |
| [`/plan-ceo-review`](plan-ceo-review.md) | CEO/founder-mode review — rethinks the problem, finds the "10-star product," challenges premises, expands scope when it creates a better product. |
| [`/plan-eng-review`](plan-eng-review.md) | Engineering manager-mode review — locks in architecture, data flow, diagrams, edge cases, test coverage, and performance before code is written. |
| [`/plan-design-review`](plan-design-review.md) | Interactive designer's-eye plan review — rates each design dimension 0–10, explains what would make it a 10, then improves the plan. |
| [`/plan-devex-review`](plan-devex-review.md) | Interactive developer experience plan review — explores personas, benchmarks competitors, designs magical moments, traces friction points. Three modes: DX expansion, polish, triage. |
| [`/office-hours`](office-hours.md) | YC office hours partner mode — Startup mode (forcing questions) or Builder mode (brainstorming). Produces a design document for downstream planning. |

### Developer Experience

| Command | What it does |
|---|---|
| [`/devex-review`](devex-review.md) | Live developer experience audit — navigates docs, tries the getting started flow, times TTHW, screenshots error messages, evaluates CLI help text. Produces a DX scorecard with evidence. |

### Shipping & Documentation

| Command | What it does |
|---|---|
| [`/ship`](ship.md) | Fully automated shipping — detects base branch, merges, runs tests, reviews, bumps VERSION, updates CHANGELOG, commits, pushes, and opens a PR. |
| [`/land-and-deploy`](land-and-deploy.md) | Land and deploy workflow — merges the PR, waits for CI and deploy, verifies production health via canary checks. Takes over after `/ship` creates the PR. |
| [`/document-release`](document-release.md) | Post-ship documentation update — ensures README, ARCHITECTURE, CONTRIBUTING, and CHANGELOG are accurate and up-to-date with shipped code. |

### Safety & Guardrails

| Command | What it does |
|---|---|
| [`/careful`](careful.md) | Safety guardrails for destructive commands — warns before `rm -rf`, `DROP TABLE`, force-push, `git reset --hard`, and similar operations. Override any warning. |
| [`/guard`](guard.md) | Full safety mode — combines `/careful` (destructive command warnings) with `/freeze` (directory-scoped edits). Maximum safety for production work. |

### Operations & Monitoring

| Command | What it does |
|---|---|
| [`/health`](health.md) | Code quality dashboard — wraps existing project tools (type checker, linter, test runner), computes a weighted composite 0–10 score, and tracks trends over time. |
| [`/learn`](learn.md) | Manage project learnings — review, search, prune, and export what the agent has learned across sessions. Surface past patterns and decisions. |
| [`/retro`](retro.md) | Weekly engineering retrospective — analyzes commit history, work patterns, code quality metrics. Per-person breakdown with praise and growth areas. |
| [`/benchmark`](benchmark.md) | Performance regression detection — captures real Core Web Vitals data, compares against baselines, and tracks trends over time. |
| [`/canary`](canary.md) | Post-deploy monitoring — watches the live app for console errors, performance regressions, and page failures with periodic screenshots. |

---

## Configuration

All skills are configured in [`config.json`](../config.json). Each skill entry controls whether it is enabled and how it is triggered:

```json
{
  "skills": {
    "review": { "enabled": true, "trigger": "pull_request" },
    "cso": { "enabled": true, "trigger": "pull_request", "labelGated": true, "label": "security-audit" },
    "retro": { "enabled": false, "trigger": "schedule", "schedule": "0 17 * * 5" }
  }
}
```

- **`enabled`** — Set to `false` to disable a skill without removing its configuration.
- **`trigger`** — The GitHub event type that activates the skill (`pull_request`, `issue_comment`, `issue_label`, `schedule`, `release`, `deployment_status`).
- **`labelGated`** / **`label`** — For label-gated skills, the skill only triggers when the specified label is present.
- **`schedule`** — Cron expression for scheduled skills. Must also be registered in the workflow file.

Global defaults (model, cost tier, max comment length) are set in the `defaults` section of `config.json`. The AI model is configured in [`.pi/settings.json`](../.pi/settings.json).

---

## Key Files

| File | Purpose |
|---|---|
| [`config.json`](../config.json) | Skill enablement, triggers, labels, and global defaults |
| [`.pi/settings.json`](../.pi/settings.json) | AI model and provider configuration |
| [`skills/`](../skills/) | Skill prompt definitions (the AI instructions for each skill) |
| [`skills/references/`](../skills/references/) | Shared reference documents used by skills (checklists, templates, taxonomies) |
| [`lifecycle/router.ts`](../lifecycle/router.ts) | Event routing — maps GitHub events to skills |
| [`lifecycle/agent.ts`](../lifecycle/agent.ts) | Agent orchestration — runs skills and posts results |
| [`lifecycle/browser.ts`](../lifecycle/browser.ts) | Playwright browser utilities for browser-dependent skills |
| [`state/`](../state/) | Persisted results, benchmarks, and session data |

---

## Access Control

Skills are gated by repository permissions. Only users with `admin`, `maintain`, or `write` permissions can trigger commands. Bot-loop prevention is enabled by default. See the `access` section in [`config.json`](../config.json) for details.

---

## Deep Guides

These documents explain how to use GStack Intelligence as a **system** — not just individual commands, but a disciplined engineering methodology.

| Guide | What It Covers |
|---|---|
| **[The Method](the-method.md)** | The complete methodology for software development excellence — five phases, decision frameworks, anti-patterns, and how to measure engineering quality |
| **[Workflows](workflows.md)** | Step-by-step recipes for 8 common scenarios — greenfield features, bug fixes, security sprints, design system setup, pre-launch quality blitz, and more |
| **[Getting Started](getting-started.md)** | Your first day with GStack Intelligence — installation, first commands, configuration, troubleshooting |
| **[ETHOS](../ETHOS.md)** | The builder principles behind every skill — Boil the Lake, Search Before Building, User Sovereignty |

---

## Getting Help

- **This file** — Command index and quick reference
- **Deep guides** — [The Method](the-method.md), [Workflows](workflows.md), [Getting Started](getting-started.md) for comprehensive usage guidance
- **Individual command pages** — Click any command in the table above for full documentation
- **Skill prompts** — See [`skills/`](../skills/) for the raw AI instructions behind each skill
- **Architecture** — See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for how the system works internally

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence">
  </picture>
</p>
