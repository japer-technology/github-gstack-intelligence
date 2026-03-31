# 05 — Workflows

### Single super yml workflow definition with yml functions for each skill capability

---

## Workflow Design Principles

1. **One workflow file** — `github-gstack-intelligence-agent.yml` handles ALL events, just like `github-minimum-intelligence-agent.yml`
2. **Authorize first** — every event checks collaborator permissions before running the agent
3. **Concurrency control** — event-scoped concurrency groups prevent parallel runs from conflicting
4. **Fail-closed** — unauthorized actors are rejected with a 👎 reaction, not silently ignored
5. **TypeScript routing** — all skill selection logic lives in `router.ts`, not YAML conditionals
6. **Cancel-in-progress: context-dependent** — PR reviews cancel on new push; conversations queue

---

## The Single Super YML Workflow: `github-gstack-intelligence-agent.yml`

This single workflow file handles every event type. The routing logic determines which skill to execute based on the event, following the GMI pattern.

```yaml
name: github-gstack-intelligence-agent

on:
  # Issue-driven skills (office-hours, investigate, qa, etc.)
  issues:
    types: [opened, labeled]
  issue_comment:
    types: [created]

  # PR-driven skills (review, cso, design-review)
  pull_request:
    types: [opened, synchronize]

  # Scheduled skills (retro, benchmark)
  schedule:
    - cron: '0 17 * * 5'    # Friday 5pm UTC — retro
    - cron: '0 6 * * *'     # Daily 6am UTC — benchmark

  # Event-driven skills (document-release, canary)
  release:
    types: [published]
  deployment_status:

  # Manual trigger + run-refresh-gstack
  workflow_dispatch:
    inputs:
      function:
        description: 'Function to run (run-refresh-gstack, or skill name)'
        default: ''
      args:
        description: 'Arguments for the function'
        default: ''

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  run-agent:
    runs-on: ubuntu-latest
    # Guard: skip bot-triggered events to prevent infinite loops
    if: >-
      (github.event_name == 'issues')
      || (github.event_name == 'issue_comment' && !endsWith(github.event.comment.user.login, '[bot]'))
      || (github.event_name == 'pull_request')
      || (github.event_name == 'schedule')
      || (github.event_name == 'release')
      || (github.event_name == 'deployment_status' && github.event.deployment_status.state == 'success')
      || (github.event_name == 'workflow_dispatch')
    concurrency:
      group: >-
        github-gstack-intelligence-${{ github.repository }}-${{
          github.event_name == 'issue_comment' && format('issue-{0}', github.event.issue.number) ||
          github.event_name == 'issues' && format('issue-{0}', github.event.issue.number) ||
          github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) ||
          github.event_name == 'schedule' && 'schedule' ||
          github.event_name == 'release' && 'release' ||
          github.event_name == 'deployment_status' && format('deploy-{0}', github.event.deployment.environment) ||
          github.event_name == 'workflow_dispatch' && 'dispatch'
        }}
      # PR reviews cancel on new push; conversations queue
      cancel-in-progress: ${{ github.event_name == 'pull_request' || github.event_name == 'release' || github.event_name == 'deployment_status' }}
    steps:
      - name: Authorize
        run: |
          # Schedule and release events don't have an actor to check
          if [[ "${{ github.event_name }}" == "schedule" ]] || [[ "${{ github.event_name }}" == "release" ]] || [[ "${{ github.event_name }}" == "deployment_status" ]]; then
            echo "::notice::Automated trigger — no actor authorization needed"
            exit 0
          fi
          PERM=$(gh api "repos/${{ github.repository }}/collaborators/${{ github.actor }}/permission" --jq '.permission')
          if [[ "$PERM" != "admin" && "$PERM" != "maintain" && "$PERM" != "write" ]]; then
            echo "::error::Unauthorized actor: ${{ github.actor }} ($PERM)"
            exit 1
          fi
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2

      - name: Indicate
        run: bun .github-gstack-intelligence/lifecycle/indicator.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Install dependencies
        run: cd .github-gstack-intelligence && bun install --frozen-lockfile

      - name: Install Playwright (conditional)
        if: >-
          github.event_name == 'issue_comment' && (
            startsWith(github.event.comment.body, '/qa ') ||
            startsWith(github.event.comment.body, '/qa-only ') ||
            startsWith(github.event.comment.body, '/design-review') ||
            startsWith(github.event.comment.body, '/canary')
          ) || (
            github.event_name == 'deployment_status'
          )
        run: npx playwright install chromium --with-deps

      - name: Route and Execute
        run: bun .github-gstack-intelligence/lifecycle/agent.ts --route
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PLAYWRIGHT_BROWSERS_PATH: /ms-playwright
```

---

## YML Functions (Logical Functions Within the Single Workflow)

The single workflow supports several logical "functions" — capabilities triggered by different events or `workflow_dispatch` inputs. These are not separate workflow files but conceptual functions routed by `router.ts`.

### Function: `run-refresh-gstack`

**Trigger:** `workflow_dispatch` with `function: run-refresh-gstack`

**Purpose:** Extracts the latest resources (skill prompts, checklists, ethos documents) from the gstack source repo and commits them to `.github-gstack-intelligence/skills/`. This ensures all resources are pre-extracted and local — no external fetches during skill execution.

**Invocation:**
```
gh workflow run github-gstack-intelligence-agent.yml \
  -f function=run-refresh-gstack \
  -f args="tag:v1.2.0"
```

**What it does:**
1. Fetches gstack repo source (pinned tag or latest)
2. Extracts skill prompts from `SKILL.md.tmpl` files
3. Applies CI adaptations (replaces local paths, browse commands, etc.)
4. Copies supplementary references (checklists, taxonomies)
5. Updates `VERSION` with extraction metadata
6. Commits and pushes all changes

### Function: `run-review`

**Trigger:** `pull_request: [opened, synchronize]`

**Purpose:** Automatic PR code review using the `/review` skill prompt. Posts findings as PR comments.

### Function: `run-cso`

**Trigger:** `pull_request` when `security-audit` label is present

**Purpose:** OWASP Top 10 + STRIDE security audit on PR changes.

### Function: `run-qa`

**Trigger:** `issue_comment` starting with `/qa <url>`

**Purpose:** Browser-based QA testing with Playwright. Posts findings with inline screenshots.

### Function: `run-retro`

**Trigger:** `schedule` (Friday 5pm UTC) or `workflow_dispatch`

**Purpose:** Weekly retrospective with per-person breakdowns. Creates a new issue with the report.

### Function: `run-benchmark`

**Trigger:** `schedule` (daily 6am UTC) or `push` to main

**Purpose:** Performance regression detection against committed baselines.

### Function: `run-investigate`

**Trigger:** `issues` with `investigate` label, or `issue_comment` with `/investigate`

**Purpose:** Systematic root-cause debugging of reported bugs.

### Function: `run-conversation`

**Trigger:** `issue_comment` on issues with conversation skill labels (`office-hours`, `ceo-review`, `eng-review`, `design-consultation`)

**Purpose:** Multi-turn conversation with session continuity.

### Function: `run-document-release`

**Trigger:** `release: [published]`

**Purpose:** Updates documentation to match what was shipped. Opens a PR with changes.

### Function: `run-canary`

**Trigger:** `deployment_status: [success]`

**Purpose:** Post-deploy monitoring with browser-based health checks.

### Function: `run-ship`

**Trigger:** `issue_comment` with `/ship`

**Purpose:** Full shipping workflow — tests, review, version bump, PR creation.

### Function: `run-autoplan`

**Trigger:** `issue_comment` with `/autoplan`

**Purpose:** Sequential CEO review → design review → eng review pipeline.

---

## How the Single Workflow Replaces Eight Separate Files

| Previous Plan (8 files) | Single Workflow Equivalent |
|---|---|
| `gstack-review.yml` | `pull_request` trigger → `router.ts` routes to review/cso |
| `gstack-agent.yml` | `issues` + `issue_comment` triggers → `router.ts` routes by command/label |
| `gstack-qa.yml` | `issue_comment` trigger + conditional Playwright install |
| `gstack-retro.yml` | `schedule` trigger → `router.ts` routes to retro |
| `gstack-benchmark.yml` | `schedule` trigger → `router.ts` routes to benchmark |
| `gstack-document-release.yml` | `release` trigger → `router.ts` routes to document-release |
| `gstack-canary.yml` | `deployment_status` trigger → `router.ts` routes to canary |
| `gstack-install.yml` | `workflow_dispatch` with `function: run-refresh-gstack` |

The key insight: YAML is not the place for routing logic. All complexity moves into TypeScript (`router.ts`), which is testable, debuggable, and version-controlled in the same folder.

---

## Concurrency Strategy

| Event Source | Concurrency Group | Cancel-in-progress | Rationale |
|---|---|---|---|
| `pull_request` | `github-gstack-intelligence-{repo}-pr-{PR#}` | `true` | New push supersedes previous review |
| `issues` / `issue_comment` | `github-gstack-intelligence-{repo}-issue-{issue#}` | `false` | Queue conversation messages, don't drop |
| `schedule` | `github-gstack-intelligence-{repo}-schedule` | `false` | Only one scheduled job at a time |
| `release` | `github-gstack-intelligence-{repo}-release` | `true` | Latest release is the one that matters |
| `deployment_status` | `github-gstack-intelligence-{repo}-deploy-{env}` | `true` | Latest deployment is the one to monitor |
| `workflow_dispatch` | `github-gstack-intelligence-{repo}-dispatch` | `false` | Don't cancel manual operations |
