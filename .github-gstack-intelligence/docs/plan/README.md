# Plan: GitHub as Infrastructure for GStack

### Steps to make GStack Intelligence run as a full GitHub-native AI engineering platform

---

## Context

[GitHub GStack Intelligence](https://github.com/japer-technology/github-gstack-intelligence) has already completed the foundation: a working self-installer, a resource extraction pipeline (`run-refresh-gstack`), an agent that handles issue-based conversations, and seventeen CI-adapted skill prompts extracted from [garrytan/gstack](https://github.com/garrytan/gstack).

What remains is activating those skills — connecting GitHub events to the right skill prompts, extending the workflow to listen for PRs, schedules, releases, and deployments, and building the routing, browser, and cost-control layers that make the full skill system operational.

This plan is a **step-by-step implementation guide** organized into seven phases. Each phase builds on the previous one and has clear exit criteria.

---

## The Steps

| # | Phase | What It Delivers | Document |
|---|-------|------------------|----------|
| 1 | [Foundation](01-FOUNDATION.md) | `config.json`, `router.ts`, slash-command parser, bot-loop prevention | The brain and configuration layer |
| 2 | [PR Review & Security](02-REVIEW-SECURITY.md) | `/review` and `/cso` skills active on every PR | Highest-value, lowest-effort unlock |
| 3 | [Browser & QA](03-BROWSER-QA.md) | `browser.ts`, Playwright setup, `/qa`, `/qa-only`, `/design-review` | Browser-based testing skills |
| 4 | [Conversations](04-CONVERSATIONS.md) | `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/design-consultation`, `/autoplan` | Multi-turn conversation skills |
| 5 | [Scheduled & Event-Driven](05-SCHEDULED-EVENTS.md) | `/retro`, `/benchmark`, `/document-release`, `/canary`, `/ship` | Automated periodic and event-triggered skills |
| 6 | [Cost Controls](06-COST-CONTROLS.md) | Model tiering, rate limiting, diff-based filtering, label gating | Cost management and safety |
| 7 | [Distribution](07-DISTRIBUTION.md) | Installer improvements, documentation, marketplace listing | Make it available to any repo |

Supporting document: [**Current Status**](CURRENT-STATUS.md) — a snapshot of what exists today vs. what needs to be built.

---

## Step Summary (Ordered Task List)

### Phase 1 — Foundation (prerequisite for all other phases)

1. Create `.github-gstack-intelligence/config.json` with skill definitions, model defaults, and access controls
2. Write `.github-gstack-intelligence/lifecycle/router.ts` — event-to-skill routing engine
3. Implement slash-command parser (extract `/review`, `/qa <url>`, `/investigate`, etc. from issue comments)
4. Add bot-loop prevention — agent comment signature (`<!-- github-gstack-intelligence-agent -->`) and actor check
5. Extend `agent.ts` with `--route` mode that delegates to `router.ts` for skill selection
6. Create `state/results/` directory structure for skill-specific output persistence

### Phase 2 — PR Review & Security

7. Add `pull_request: [opened, synchronize]` trigger to the workflow
8. Wire router to map `pull_request` events → `/review` skill
9. Wire router to map `pull_request` events with `security-audit` label → `/cso` skill
10. Extend `agent.ts` to inject PR context (diff, file list, branch, base) into skill prompts
11. Persist review results to `state/results/review/pr-{N}.json`
12. Persist security results to `state/results/security/pr-{N}.json`
13. Test on a real PR with intentional issues (SQL injection, missing validation, race condition)

### Phase 3 — Browser & QA

14. Write `.github-gstack-intelligence/lifecycle/browser.ts` — Playwright helper (navigate, screenshot, health check)
15. Add conditional Playwright install step to workflow (only for browser-needing skills)
16. Wire router to map `/qa <url>` comments → QA skill with `needsBrowser: true`
17. Wire router to map `/qa-only <url>` comments → QA-only skill
18. Wire router to map `/design-review` on PRs with CSS/UI file changes → design-review skill
19. Implement screenshot upload to GitHub issue comments via API
20. Persist QA results to `state/results/qa/`
21. Test QA on a staging URL with known bugs

### Phase 4 — Conversations

22. Wire router to map issues labeled `office-hours` → office-hours skill with `sessionMode: 'resume'`
23. Wire router to map `/plan-ceo-review` comments → plan-ceo-review skill
24. Wire router to map `/plan-eng-review` comments → plan-eng-review skill
25. Wire router to map issues labeled `design-consultation` → design-consultation skill
26. Wire router to map `/autoplan` comments → sequential CEO → design → eng pipeline
27. Create issue templates: `.github/ISSUE_TEMPLATE/gstack-office-hours.yml`, `gstack-qa.yml`, `gstack-investigate.yml`
28. Test multi-turn conversation across multiple days (session resume from git)

### Phase 5 — Scheduled & Event-Driven

29. Add `schedule` trigger to workflow: `cron: '0 17 * * 5'` (retro), `cron: '0 6 * * *'` (benchmark)
30. Add `release: [published]` trigger to workflow
31. Add `deployment_status` trigger to workflow
32. Wire router to map schedule events → `/retro` and `/benchmark` skills
33. Wire router to map release events → `/document-release` skill
34. Wire router to map successful deployment events → `/canary` skill with `needsBrowser: true`
35. Wire router to map `/ship` comments → ship skill (checks existing review results, runs tests, creates PR)
36. Create `state/benchmarks/baseline.json` structure for regression detection
37. Persist retro reports to `state/results/retro/`
38. Test weekly retro on a repo with active commit history

### Phase 6 — Cost Controls

39. Implement per-skill model selection in `config.json` (Sonnet for reasoning skills, Haiku for structured)
40. Add `costTier` presets: `economy`, `standard`, `premium`
41. Implement rate limiting in `router.ts` — `maxRunsPerHour`, `maxRunsPerDay`
42. Implement diff-based filtering — skip review for docs-only PRs, trivial diffs (<5 lines)
43. Implement label gating — skills like `/cso` only run when `security-audit` label is present
44. Add `--dry-run` mode for testing routing without LLM invocation
45. Test cost controls on a high-activity repo (20+ PRs/day)

### Phase 7 — Distribution

46. Improve self-installer to handle upgrades without overwriting `config.json` customizations
47. Write installation guide (step-by-step: add secrets, copy workflow, run installer, verify)
48. Write per-skill documentation with usage examples
49. Write cost estimation guide with monthly scenarios
50. Write troubleshooting guide (common issues, debug steps)
51. Evaluate GitHub Marketplace listing (composite action vs. template repo)
52. Create version management for `.github-gstack-intelligence/` package (semantic versioning)
53. Test installation on repos with different languages, frameworks, and team sizes

---

## Phase Dependencies

```
Phase 1 (Foundation)
    │
    ├───► Phase 2 (PR Review & Security)
    │         │
    │         ├───► Phase 3 (Browser & QA)     ← needs workflow PR trigger pattern
    │         │         │
    │         │         ├───► Phase 5 (Scheduled & Events) ← needs browser.ts
    │         │         │
    │         │         └───► Phase 6 (Cost Controls) ← needs all skills active
    │         │
    │         └───► Phase 4 (Conversations) ← can run in parallel with Phase 3
    │                   │
    │                   └───► Phase 5 (Scheduled & Events) ← needs session mgmt
    │
    └───► Phase 7 (Distribution) ← depends on all phases
```

Phases 3 and 4 can proceed **in parallel** after Phase 2. Phase 5 depends on components from both (browser helper from Phase 3, session management patterns from Phase 4). Phase 6 should follow once all skills are operational. Phase 7 is the final packaging step.

---

## The Result

When all seven phases are complete, any GitHub repository gets a **full AI engineering team as a GitHub Action** — seventeen specialist skills covering PR review, security audit, QA testing with a real browser, architecture review, weekly retrospectives, release documentation, and more. All triggered by the natural events of software development through a single workflow file. No installation beyond copying one YML file. No CLI. No external services. Just GitHub.

---

*Plan for [japer-technology/github-gstack-intelligence](https://github.com/japer-technology/github-gstack-intelligence), building on analysis in [`analysis/`](../analysis/).*
