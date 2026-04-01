# Current Status — GitHub GStack Intelligence

### Snapshot of what exists today and what remains to be built

---

## What Is Built and Working

| Component | Location | Status |
|-----------|----------|--------|
| **Single super workflow** | `.github/workflows/github-gstack-intelligence-agent.yml` (v1.1.2) | ✅ Production — handles `issues`, `issue_comment`, `pull_request`, `push`, `schedule`, `release`, `deployment_status`, `workflow_dispatch` |
| **Self-installer** (`run-install`) | Inline in workflow YML | ✅ Production — copies agent folder on first `workflow_dispatch`, upgrades on subsequent runs |
| **Resource extraction** (`run-refresh-gstack`) | `.github-gstack-intelligence/lifecycle/refresh.ts` | ✅ Production — extracts all 17 skills + 4 foundational docs + 7 supplementary references from `garrytan/gstack` |
| **Core agent orchestrator** | `.github-gstack-intelligence/lifecycle/agent.ts` | ✅ Production — runs pi-coding-agent with `--route` mode, manages sessions, posts replies, commits state |
| **Event router** | `.github-gstack-intelligence/lifecycle/router.ts` | ✅ Production — maps GitHub events → skills, parses slash commands, checks config, bot-loop prevention |
| **Router unit tests** | `.github-gstack-intelligence/lifecycle/router.test.ts` | ✅ Complete — covers all event types, slash commands, label routing, bot-loop prevention, disabled skills |
| **Browser helper** | `.github-gstack-intelligence/lifecycle/browser.ts` | ✅ Production — Playwright utility with navigate, screenshot, health check, responsive test, accessibility snapshot, CLI interface |
| **Browser unit tests** | `.github-gstack-intelligence/lifecycle/browser.test.ts` | ✅ Complete — validates module exports and type shapes |
| **Config** | `.github-gstack-intelligence/config.json` | ✅ Production — skill enablement, model defaults, access controls, bot-loop prevention, label gating |
| **Session continuity** | `state/issues/*.json` → `state/sessions/*.jsonl` | ✅ Production — multi-turn conversations persist across workflow runs |
| **Push conflict resolution** | In `agent.ts` — 10-retry rebase loop | ✅ Production — concurrent agents don't lose work |
| **Pi-mono runtime** | `package.json` → `@mariozechner/pi-coding-agent` v0.57.1 | ✅ Production — multi-provider LLM support (OpenAI default, Anthropic, Google, xAI, etc.) |
| **Extracted skill prompts** | `.github-gstack-intelligence/skills/*.md` (17 files) | ✅ Extracted and CI-adapted — review, cso, ship, qa, retro, etc. |
| **Extracted references** | `.github-gstack-intelligence/skills/references/` (10 files) | ✅ Extracted — checklists, taxonomies, templates, foundational docs |
| **Source tracking** | `.github-gstack-intelligence/skills/source.json` | ✅ Production — tracks upstream commit SHA, file manifest, extraction timestamp |
| **Agent identity** | `.github-gstack-intelligence/AGENTS.md` | ✅ Present (not yet hatched) |
| **System prompt** | `.github-gstack-intelligence/.pi/APPEND_SYSTEM.md` | ✅ Configured |
| **Bootstrap** | `.github-gstack-intelligence/.pi/BOOTSTRAP.md` | ✅ Configured — hatching personality flow |
| **GitHub Pages** | `run-gitpages` job in workflow | ✅ Production — publishes `public-fabric/` |
| **Verification step** | In workflow YML | ✅ Production — validates all extracted files exist, have content ≥50 bytes, contain generated marker |
| **Analysis documents** | `.github-gstack-intelligence/docs/analysis/` | ✅ Complete — 2 overview docs + 8 detailed plan docs |
| **Slash-command parser** | Inside `router.ts` | ✅ Production — parses all 17 commands, validates URL arguments, case-insensitive |
| **Bot-loop prevention** | `AGENT_SIGNATURE` in `router.ts` + actor check in workflow | ✅ Production — prevents agent-to-agent reply loops |
| **Skill-specific state directories** | `state/results/` | ✅ Created — `review/`, `security/`, `qa/`, `qa/screenshots/`, `retro/`, `benchmarks/`, `canary/`, `design-review/`, `releases/` |
| **Benchmark baseline** | `state/benchmarks/baseline.json` + `history/` | ✅ Created — initial structure ready for first benchmark run |
| **PR event handling** | Workflow `on: pull_request: [opened, synchronize]` | ✅ Production — routes to `/review`, `/cso` (label-gated), `/design-review` (label-gated) |
| **Schedule triggers** | Workflow `on: schedule` | ✅ Production — `0 17 * * 5` (retro), `0 6 * * *` (benchmark) |
| **Release trigger** | Workflow `on: release: [published]` | ✅ Production — routes to `/document-release` |
| **Deployment trigger** | Workflow `on: deployment_status` | ✅ Production — routes successful deployments to `/canary` |
| **Conditional Playwright install** | Workflow step with `if:` guard | ✅ Production — only installs Chromium for `/qa`, `/qa-only`, `/design-review`, `/canary`, `deployment_status` |
| **Issue templates** | `.github/ISSUE_TEMPLATE/gstack-*.yml` (3 files) | ✅ Created — office-hours, QA testing, bug investigation |

---

## Phases 1–5: Implementation Status

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| **1** | Foundation | ✅ Complete | `config.json`, `router.ts`, slash-command parser, bot-loop prevention, `--route` mode in `agent.ts`, `state/results/` directories — all built and tested |
| **2** | PR Review & Security | ✅ Complete | `pull_request` trigger, review/cso/design-review routing, PR context injection, concurrency groups — all wired |
| **3** | Browser & QA | ✅ Complete | `browser.ts` with full Playwright API, conditional install step, `/qa`/`/qa-only`/`/design-review` routing — all built |
| **4** | Conversations | ✅ Complete | Label-based routing (office-hours, investigate, design-consultation), `/plan-ceo-review`, `/plan-eng-review`, `/autoplan` pipeline, issue templates — all built |
| **5** | Scheduled & Event-Driven | ✅ Complete | Schedule/release/deployment triggers, retro/benchmark/document-release/canary/ship routing, benchmark baseline structure — all built |
| **6** | Cost Controls | 🔲 Not started | Model tiering, rate limiting, diff-based filtering, label gating enforcement, `--dry-run` mode — not yet implemented |
| **7** | Distribution | 🔲 Not started | Installer upgrade protection for `config.json`, documentation, marketplace listing — not yet implemented |

---

## What Remains To Be Built

| Component | Description | Priority |
|-----------|-------------|----------|
| **Model tiering** | Per-skill model selection (Sonnet for reasoning, Haiku for structured) in `config.json` | **P1** — cost optimization |
| **Cost tier presets** | `economy`, `standard`, `premium` preset configurations | **P1** — cost management |
| **Rate limiting** | `maxRunsPerHour`, `maxRunsPerDay` enforcement in `router.ts` | **P2** — cost safety net |
| **Diff-based filtering** | Skip review for docs-only PRs, trivial diffs (<5 lines) | **P2** — cadence reduction |
| **`--dry-run` mode** | Test routing without LLM invocation | **P2** — debugging tool |
| **Installer upgrade safety** | Preserve `config.json` customizations during upgrades | **P1** — distribution requirement |
| **Documentation site** | End-user documentation for skill usage, configuration | **P2** — distribution requirement |

---

## Architecture (Current State)

```
issues + issue_comment + pull_request + schedule + release + deployment_status
    │
    ▼
agent.ts --route
    │
    ▼
router.ts (event → skill selection)
    │
    ├── /review      (pull_request)
    ├── /cso         (pull_request + security-audit label)
    ├── /design-review (pull_request + design-review label)
    ├── /qa          (issue_comment + /qa <url>)
    ├── /qa-only     (issue_comment + /qa-only <url>)
    ├── /investigate (issues + investigate label)
    ├── /office-hours (issues + office-hours label)
    ├── /design-consultation (issues + design-consultation label)
    ├── /plan-ceo-review (issue_comment + /plan-ceo-review)
    ├── /plan-eng-review (issue_comment + /plan-eng-review)
    ├── /plan-design-review (issue_comment)
    ├── /autoplan    (issue_comment → combined pipeline)
    ├── /ship        (issue_comment)
    ├── /retro       (schedule: Friday 5pm UTC)
    ├── /benchmark   (schedule: daily 6am UTC)
    ├── /document-release (release: published)
    ├── /canary      (deployment_status: success)
    └── (no match)   → general conversation fallback
    │
    ▼
agent.ts (skill-aware execution)
    │
    ├── load skills/{skill}.md
    ├── inject context (PR diff, issue body, URL)
    ├── optional: Playwright browser (if needsBrowser)
    ├── run pi-coding-agent
    ├── persist to state/results/{skill}/
    └── post reply as comment
```

---

*Status as of 2026-04-01. Version 1.1.2.*
