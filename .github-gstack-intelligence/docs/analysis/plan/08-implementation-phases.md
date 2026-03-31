# 08 — Implementation Phases

### Five-phase rollout from proof-of-concept to marketplace distribution, plus additional ideas

---

## Phase Overview

| Phase | Name | Skills | Deliverable |
|-------|------|--------|-------------|
| 1 | Core Review + Refresh | `/review`, `/cso`, `run-refresh-gstack` | Working PR review + security audit + resource extraction mechanism |
| 2 | QA + Investigation | `/qa`, `/qa-only`, `/investigate` | Browser-based QA testing and root-cause debugging |
| 3 | Conversation Skills | `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review` | Multi-turn conversation via issue comments |
| 4 | Scheduled + Event-Driven | `/retro`, `/benchmark`, `/document-release`, `/canary` | Automated periodic and event-triggered skills |
| 5 | Distribution | All + installer | Self-installer, documentation, and distribution |

Each phase builds on the previous one. Phase 1 proves the architecture (including the single super yml workflow and resource extraction); Phase 5 makes it available to any repository.

---

## Phase 1 — Core Review + Refresh (Proof of Concept)

### Goal

The single super yml workflow runs. `run-refresh-gstack` extracts resources. `/review` runs automatically on every PR and posts findings as a PR comment. `/cso` runs on PRs with the `security-audit` label.

### Tasks

1. **Create `.github-gstack-intelligence/` folder structure**
   - `package.json` with `@mariozechner/pi-coding-agent` dependency
   - `.pi/settings.json` with Anthropic provider config
   - `.pi/APPEND_SYSTEM.md` with gstack ETHOS principles
   - `config.json` with review + cso skill configuration
   - `AGENTS.md` with agent identity
   - `ETHOS.md` (reference copy from `repo/gstack/ETHOS.md`)

2. **Write `run-refresh-gstack` mechanism**
   - `lifecycle/refresh.ts` — fetches gstack source, extracts skills, applies CI adaptations
   - Tests extraction of `/review` and `/cso` skill prompts as proof of concept
   - Commits extracted resources to `.github-gstack-intelligence/skills/`

3. **Write the single super yml workflow**
   - `.github/workflows/github-gstack-intelligence-agent.yml` — handles `pull_request`, `issue_comment`, `workflow_dispatch` events
   - All event routing in TypeScript, not YAML

4. **Adapt `/review` skill prompt**
   - Take `repo/gstack/review/SKILL.md.tmpl` as source
   - Remove `{{PREAMBLE}}` expansion (replace with CI-specific context injection)
   - Remove `AskUserQuestion` references (ASK items posted as comments)
   - Remove `gstack-review-log` (replace with state file commit)
   - Replace `~/.claude/skills/review/checklist.md` path with `.github-gstack-intelligence/skills/references/review-checklist.md`
   - Add GitHub context header (repo, PR number, branch, diff stat)
   - Output → `.github-gstack-intelligence/skills/review.md`

5. **Adapt `/cso` skill prompt**
   - Same adaptation pattern as `/review`
   - Output → `.github-gstack-intelligence/skills/cso.md`

6. **Copy supplementary files**
   - `repo/gstack/review/checklist.md` → `.github-gstack-intelligence/skills/references/review-checklist.md`
   - `repo/gstack/review/design-checklist.md` → `.github-gstack-intelligence/skills/references/review-design-checklist.md`
   - `repo/gstack/cso/ACKNOWLEDGEMENTS.md` → `.github-gstack-intelligence/skills/references/cso-acknowledgements.md`

7. **Write lifecycle scripts**
   - `lifecycle/indicator.ts` — port from GMI (minor path adjustments)
   - `lifecycle/router.ts` — event-to-skill routing (PR → review, dispatch → refresh, etc.)
   - `lifecycle/agent.ts` — extend GMI's agent.ts with `--route` mode for router-based execution

8. **Create state directories**
   - `state/issues/` (empty, for future session mapping)
   - `state/results/review/` (for review result persistence)
   - `state/results/security/` (for CSO result persistence)

9. **Test on a real repository**
   - Install in a test repo (copy workflow file + dot-folder)
   - Run `run-refresh-gstack` to extract resources
   - Open a PR with intentional issues (SQL injection, race condition, missing validation)
   - Verify review findings appear as PR comment
   - Verify security audit findings appear as separate PR comment

### Exit Criteria

- ✅ Single super yml workflow handles PR events and workflow_dispatch
- ✅ `run-refresh-gstack` extracts resources from gstack and commits them
- ✅ `/review` runs on every PR and posts structured findings
- ✅ `/cso` runs when label is applied and posts security findings
- ✅ Results are committed to `state/results/`
- ✅ Authorization blocks unauthorized actors
- ✅ Bot loop prevention works (agent comments don't trigger re-runs)
- ✅ All resources are pre-extracted — no external fetches during skill execution

---

## Phase 2 — QA + Investigation

### Goal

`/qa` runs browser-based testing on a URL provided via issue comment. `/investigate` performs root-cause debugging on issues with the `investigate` label.

### Tasks

1. **Adapt `/qa` skill prompt**
   - Replace `$B <command>` syntax with Playwright equivalents
   - Replace `{{BROWSE_SETUP}}` with Playwright initialization instructions
   - Replace QA report local output with GitHub comment format
   - Copy issue taxonomy and report template to references/

2. **Adapt `/qa-only` skill prompt**
   - Same as `/qa` minus the fix-and-verify loop

3. **Adapt `/investigate` skill prompt**
   - Remove `AskUserQuestion` for follow-up (replace with "post comment requesting clarification")
   - Issue body = bug description

4. **Write `lifecycle/browser.ts`**
   - Playwright helper functions: navigate, screenshot, health check, responsive test
   - Screenshot upload to GitHub via API

5. **Extend the single super yml workflow**
   - Add conditional Playwright install step (only for browser-needing skills)
   - Add `issue_comment` trigger handling for `/qa`, `/qa-only`, `/investigate` commands
   - All routing in `router.ts`

6. **Extend router for issue commands**
   - `/investigate` handled by `router.ts` (no browser needed)
   - `/qa` and `/qa-only` routed with `needsBrowser: true`

7. **Extend router for skill commands**
   - `lifecycle/router.ts` — parse issue comments for `/qa`, `/investigate` commands
   - Route to appropriate skill prompt with browser flag

### Exit Criteria

- ✅ `/qa https://example.com` in an issue comment triggers browser-based QA
- ✅ Screenshots appear inline in issue comments
- ✅ QA findings are committed to `state/results/qa/`
- ✅ `/investigate` reads issue body and posts root-cause analysis

---

## Phase 3 — Conversation Skills

### Goal

Multi-turn conversation skills (`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`) work through issue comments with session continuity.

### Tasks

1. **Implement session management**
   - `state/issues/{N}.json` → `state/sessions/{timestamp}.jsonl` mapping
   - Session resolution logic in `agent.ts` (create or resume)
   - Session file committed after each turn

2. **Adapt conversation skill prompts**
   - `/office-hours` — remove `AskUserQuestion`, add "post a comment to continue"
   - `/plan-ceo-review` — same adaptation
   - `/plan-eng-review` — same adaptation
   - `/plan-design-review` — same adaptation

3. **Extend router for label-based routing**
   - Issues labeled `office-hours` → route to office-hours skill
   - Issues labeled `ceo-review` → route to plan-ceo-review skill
   - Comments on existing sessions → resume with the active skill

4. **Create issue templates**
   - `.github/ISSUE_TEMPLATE/gstack-office-hours.yml`
   - `.github/ISSUE_TEMPLATE/gstack-review.yml` (manual review request)

5. **Add `/autoplan`**
   - Sequential execution: CEO review → design review → eng review
   - Single agent invocation with combined prompt, or three sequential invocations

6. **Add `/design-consultation`**
   - Extended multi-turn conversation — longest session type
   - Same session management pattern, just more turns

### Exit Criteria

- ✅ Opening an issue with `office-hours` label starts a conversation
- ✅ Commenting on the issue resumes from where the agent left off
- ✅ Session state persists across days/weeks
- ✅ `/autoplan` runs all three review skills sequentially

---

## Phase 4 — Scheduled + Event-Driven Skills

### Goal

Automated skills that run on schedules or in response to GitHub events.

### Tasks

1. **Adapt `/retro` skill prompt**
   - Remove interactive time window selection (use workflow_dispatch input or cron default)
   - Output → new issue with retro report, or comment on dedicated retro issue

2. **Adapt `/benchmark` skill prompt**
   - Remove local benchmark paths
   - Add baseline comparison logic using committed `state/benchmarks/baseline.json`
   - Output → issue comment with regression table

3. **Adapt `/document-release` skill prompt**
   - Triggered by release event
   - Read release notes, compare to documentation, open PR with updates

4. **Adapt `/canary` skill prompt**
   - Triggered by deployment_status event
   - Browser-based health checks on deployment URL
   - Create issue if problems found

5. **Extend the single super yml workflow**
   - Add `schedule`, `release`, and `deployment_status` triggers to the workflow `on:` block
   - Router handles schedule → retro/benchmark, release → document-release, deployment_status → canary
   - All new event types handled by the same `router.ts`

6. **Adapt `/ship` skill prompt**
   - Checks for existing review results in `state/results/review/`
   - Runs tests on runner
   - Creates PR via `gh pr create`
   - Handles version bumping

7. **Adapt `/design-review` skill prompt**
   - PR-triggered when CSS/UI files change
   - Browser-based before/after screenshots
   - Posts findings as PR comment

### Exit Criteria

- ✅ Weekly retro runs every Friday and creates an issue with the report
- ✅ Benchmark runs daily and reports regressions
- ✅ `/document-release` updates docs when a release is published
- ✅ `/ship` creates a PR with version bump and changelog
- ✅ All seventeen skills are operational (Phases 1–4 combined)

---

## Phase 5 — Distribution

### Goal

Make github-gstack-intelligence available to any GitHub repository as a one-step installation.

### Tasks

1. **Create self-installer mechanism**
   - `run-refresh-gstack` already handles extracting resources from the gstack repo
   - Add an installation mode: download `.github-gstack-intelligence/` folder and the single workflow file from `japer-technology/github-gstack-intelligence`
   - User copies one workflow file, runs `workflow_dispatch` with `function: run-refresh-gstack`, agent installs itself

2. **Package as distributable**
   - Option A: Template repository — users "Use this template" and get everything
   - Option B: Self-installer (GMI pattern) — copy one workflow file, run it
   - Option C: Composite GitHub Action — `uses: japer-technology/github-gstack-intelligence@v1`

3. **Write installation guide**
   - Step-by-step: add secrets, copy workflow, run installer, verify
   - Skill configuration guide
   - Cost estimation calculator

4. **Publish to GitHub Marketplace** (if using Action format)
   - `action.yml` metadata
   - Marketplace listing with description, screenshots, usage examples

5. **Version management**
   - Semantic versioning for `.github-gstack-intelligence/` package
   - Upgrade workflow that pulls latest version without losing config
   - `VERSION` file tracking installed version

6. **Documentation**
   - README with quick start
   - Per-skill documentation with examples
   - Troubleshooting guide
   - Cost management guide

### Exit Criteria

- ✅ Any repository can install github-gstack-intelligence in under 5 minutes (copy one workflow file + run refresh)
- ✅ Upgrade path preserves user configuration
- ✅ Documentation covers all seventeen skills
- ✅ Installation tested on repos with different languages and frameworks

---

## Phase Dependencies

```
Phase 1 (Core Review + Refresh)
    │
    ├─── Phase 2 (QA + Investigation)
    │        │
    │        └─── Phase 4 (Scheduled + Event-Driven)  ← needs browser.ts from Phase 2
    │
    └─── Phase 3 (Conversation Skills)
             │
             └─── Phase 4 (Scheduled + Event-Driven)  ← needs session mgmt from Phase 3
                       │
                       └─── Phase 5 (Distribution)
```

Phase 1 is the foundation. Phases 2 and 3 can proceed in parallel after Phase 1. Phase 4 depends on components from both Phase 2 (browser helper) and Phase 3 (session management). Phase 5 depends on all skills being operational.

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| LLM costs exceed budget | High | Medium | Model tiering, label gating, rate limits (see 07-cost-and-controls.md) |
| Playwright cold start too slow | Low | Low | Acceptable for CI; ~10s startup vs. gstack's ~3s persistent daemon |
| Session files grow unbounded | Medium | Medium | Archive policy (90-day rotation) |
| Agent generates incorrect code fixes | High | Medium | Auto-fix only for mechanical issues; ASK for anything risky |
| Push conflicts with concurrent agents | Medium | Medium | 10-retry loop with `-X theirs` rebase (proven by GMI) |
| GitHub API rate limiting | Medium | Low | Agent uses `gh` CLI with GITHUB_TOKEN (5,000 requests/hour) |
| Skill prompt adaptation introduces regressions | Medium | Medium | Test each adapted skill against known scenarios in Phase 1 |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Review accuracy | Agent catches ≥80% of issues found by human reviewers |
| False positive rate | <20% of flagged issues are false positives |
| Time to first review comment | <3 minutes from PR opened |
| QA bug detection | Agent finds ≥3 bugs per QA session on average |
| Session continuity | 100% of resumed conversations retain full context |
| Installation time | New repo fully operational in <5 minutes |
| Cost per PR (standard tier) | <$0.15 for review + security audit |
| Resource refresh time | `run-refresh-gstack` completes in <60 seconds |

---

## Additional Ideas

### 1. Skill Composition / Chaining

Allow skills to be composed in user-defined sequences via `config.json`. Instead of hardcoding `/autoplan` as CEO → design → eng, let teams define their own chains:

```json
{
  "chains": {
    "full-review": ["review", "cso", "design-review"],
    "ship-ready": ["review", "cso", "qa"],
    "planning": ["plan-ceo-review", "plan-eng-review"]
  }
}
```

Invoked via `/chain full-review` in an issue comment.

### 2. Skill Marketplace / Community Skills

Allow third-party skill prompts to be installed alongside the core gstack skills. The `run-refresh-gstack` mechanism could be generalised to `run-refresh-skills` that pulls from multiple sources:

```json
{
  "skillSources": [
    { "repo": "garrytan/gstack", "skills": ["review", "cso", "qa"] },
    { "repo": "community/accessibility-audit", "skills": ["a11y"] },
    { "repo": "internal/compliance-check", "skills": ["compliance"] }
  ]
}
```

### 3. Cross-Repository Intelligence

A single `japer-technology/github-gstack-intelligence` installation could serve as a "hub" that monitors multiple repositories. Using repository dispatch events, satellite repos could request skill execution from the hub, centralising LLM costs and configuration.

### 4. Skill Learning / Feedback Loop

Track which review findings are accepted vs. dismissed by developers. Over time, use this data to refine skill prompts:

- If a finding type is dismissed 80% of the time → reduce its severity or suppress it
- If a finding type is always accepted → promote it to critical
- Store acceptance rates in `state/results/review/feedback/`

### 5. Differential Resource Extraction

Enhance `run-refresh-gstack` to show a diff of what changed between the current extracted skills and the new version before committing. This gives teams visibility into skill prompt changes:

```
run-refresh-gstack completed:
  - review.md: 3 lines changed (added edge case for async/await patterns)
  - cso.md: unchanged
  - qa.md: 12 lines changed (updated Playwright API calls)
  - NEW: a11y.md (new accessibility audit skill)
```

### 6. Lightweight "Dry Run" Mode

Add a `--dry-run` flag to the agent that returns the skill prompt and context injection without actually invoking the LLM. Useful for debugging routing, testing configuration changes, and verifying resource extraction.

### 7. Skill Health Dashboard

A GitHub Pages site (or issue-based dashboard) that shows skill execution statistics:

- Which skills run most frequently
- Average execution time per skill
- Cost per skill per week
- Success/error rates
- Last `run-refresh-gstack` timestamp and source version

Generated by a weekly cron job reading from `state/results/`.

### 8. Progressive Skill Rollout

When `run-refresh-gstack` pulls new skill versions, don't immediately apply them to all PRs. Instead, use a canary approach:

- Apply new skill version to 10% of PRs initially
- Compare findings quality between old and new versions
- Auto-promote to 100% if quality metrics hold

### 9. Offline Skill Execution Cache

Cache the last N LLM responses for identical inputs (same diff, same skill prompt). If a PR is force-pushed with no meaningful changes, skip the LLM call and return the cached result. Significant cost reduction for rebase-heavy workflows.
