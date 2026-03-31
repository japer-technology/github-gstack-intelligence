# Current Status — GitHub GStack Intelligence

### Snapshot of what exists today and what remains to be built

---

## What Is Built and Working

| Component | Location | Status |
|-----------|----------|--------|
| **Single super workflow** | `.github/workflows/github-gstack-intelligence-agent.yml` (v1.1.2) | ✅ Production — handles `issues`, `issue_comment`, `push`, `workflow_dispatch` |
| **Self-installer** (`run-install`) | Inline in workflow YML | ✅ Production — copies agent folder on first `workflow_dispatch`, upgrades on subsequent runs |
| **Resource extraction** (`run-refresh-gstack`) | `.github-gstack-intelligence/lifecycle/refresh.ts` | ✅ Production — extracts all 17 skills + 4 foundational docs + 7 supplementary references from `garrytan/gstack` |
| **Core agent orchestrator** | `.github-gstack-intelligence/lifecycle/agent.ts` | ✅ Production — runs pi-coding-agent, manages sessions, posts replies, commits state |
| **Session continuity** | `state/issues/*.json` → `state/sessions/*.jsonl` | ✅ Production — multi-turn conversations persist across workflow runs |
| **Push conflict resolution** | In `agent.ts` — 10-retry rebase loop | ✅ Production — concurrent agents don't lose work |
| **Pi-mono runtime** | `package.json` → `@mariozechner/pi-coding-agent` v0.57.1 | ✅ Production — multi-provider LLM support (OpenAI default, Anthropic, Google, xAI, etc.) |
| **Extracted skill prompts** | `.github-gstack-intelligence/skills/*.md` (17 files) | ✅ Extracted and CI-adapted — review, cso, ship, qa, retro, etc. |
| **Extracted references** | `.github-gstack-intelligence/skills/references/` (11 files) | ✅ Extracted — checklists, taxonomies, templates, foundational docs |
| **Source tracking** | `.github-gstack-intelligence/skills/source.json` | ✅ Production — tracks upstream commit SHA, file manifest, extraction timestamp |
| **Agent identity** | `.github-gstack-intelligence/AGENTS.md` | ✅ Present (not yet hatched) |
| **System prompt** | `.github-gstack-intelligence/.pi/APPEND_SYSTEM.md` | ✅ Configured |
| **Bootstrap** | `.github-gstack-intelligence/.pi/BOOTSTRAP.md` | ✅ Configured — hatching personality flow |
| **GitHub Pages** | `run-gitpages` job in workflow | ✅ Production — publishes `public-fabric/` |
| **Verification step** | In workflow YML (lines 328–412) | ✅ Production — validates all extracted files exist, have content ≥50 bytes, contain generated marker |
| **Analysis documents** | `.github-gstack-intelligence/docs/analysis/` | ✅ Complete — 2 overview docs + 8 detailed plan docs |

---

## What Exists But Is Not Yet Activated

| Component | Status | What's Missing |
|-----------|--------|----------------|
| **Skill prompts** (all 17) | Extracted and CI-adapted | No skill **router** to invoke them based on events — agent.ts currently handles all events as general conversation |
| **PR-triggered skills** (`/review`, `/cso`, `/design-review`) | Prompts exist | Workflow doesn't listen to `pull_request` events yet; no router to select skill by event type |
| **Scheduled skills** (`/retro`, `/benchmark`) | Prompts exist | No `schedule` trigger in the workflow; no router to map cron to skill |
| **Release/deploy skills** (`/document-release`, `/canary`) | Prompts exist | No `release` or `deployment_status` triggers in workflow |
| **Browser-based skills** (`/qa`, `/qa-only`, `/design-review`, `/canary`) | Prompts exist | No Playwright setup step in workflow; no `browser.ts` helper |
| **Slash-command routing** (`/review`, `/qa <url>`, `/investigate`) | Pattern defined in analysis | No command parser in agent.ts — all comments go to general conversation |
| **Skill-specific state** (`state/results/review/`, `state/results/qa/`, etc.) | Directory structure defined | Not created; agent.ts doesn't write skill-specific results |
| **config.json** | Full schema defined in analysis docs | File doesn't exist yet — no skill enable/disable, no model tiering, no label gating |
| **Cost controls** | Rate limiting, model tiering, diff filtering designed | Not implemented — every invocation uses the same model regardless of skill type |

---

## What Does NOT Exist Yet

| Component | Description | Priority |
|-----------|-------------|----------|
| **`router.ts`** | Maps GitHub events → skill names + context; parses slash commands; checks config | **P0** — prerequisite for all multi-skill functionality |
| **`config.json`** | Skill enablement, model selection per skill, label gating, rate limits | **P0** — controls cost and which skills run |
| **`browser.ts`** | Playwright helper: navigate, screenshot, health check, responsive test | **P1** — needed for QA, design-review, canary |
| **PR event handling** | Workflow `on: pull_request` trigger + review/cso routing | **P0** — highest-value immediate unlock |
| **Slash-command parser** | Extract `/review`, `/qa <url>`, etc. from issue comments | **P0** — user interface for all skill invocation |
| **Skill-specific results persistence** | Write structured JSON to `state/results/{skill}/` | **P1** — needed for auditability and `/ship` pre-checks |
| **Schedule triggers** | `on: schedule` crons for retro (weekly) and benchmark (daily) | **P2** — automated cadence |
| **Release/deploy triggers** | `on: release` and `on: deployment_status` | **P2** — event-driven skills |
| **Issue templates** | `.github/ISSUE_TEMPLATE/gstack-*.yml` for QA, investigate, office-hours | **P2** — better user experience |
| **Model tiering** | Per-skill model selection (Sonnet for reasoning, Haiku for structured) | **P1** — cost optimization |
| **Rate limiting** | `maxRunsPerHour`, `maxRunsPerDay` enforcement | **P2** — cost safety net |
| **Bot loop prevention (comment signature)** | `<!-- github-gstack-intelligence-agent -->` in agent comments | **P1** — safety mechanism |
| **Diff-based filtering** | Skip review for docs-only PRs, trivial diffs | **P2** — cadence reduction |

---

## Architecture Gap Summary

```
Current State                          Target State
─────────────                          ────────────
                                       
issues + issue_comment                 issues + issue_comment
    │                                      │
    ▼                                      ▼
agent.ts (general conversation)        router.ts (event → skill selection)
    │                                      │
    ▼                                      ├── /review  (pull_request)
pi-coding-agent                        ├── /cso      (pull_request + label)
    │                                      ├── /qa       (issue_comment + URL)
    ▼                                      ├── /retro    (schedule)
post reply as comment                  ├── /ship     (issue_comment)
                                       ├── ... (14 more skills)
                                       │
                                       ▼
                                   agent.ts (skill-aware execution)
                                       │
                                       ├── load skills/{skill}.md
                                       ├── inject context (PR diff, issue body)
                                       ├── optional: setup Playwright
                                       ├── run pi-coding-agent
                                       ├── persist to state/results/{skill}/
                                       └── post reply as comment
```

The single biggest gap is `router.ts` — the brain that maps events to skills. Without it, the seventeen extracted skill prompts sit unused, and every issue comment goes through the same general conversation path.

---

*Status as of 2026-03-31. Version 1.1.0.*
