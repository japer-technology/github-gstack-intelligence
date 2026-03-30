# 05 — Workflows

### GitHub Actions workflow definitions for each skill tier

---

## Workflow Design Principles

1. **One workflow per trigger pattern** — PR-triggered skills share a workflow, schedule-triggered skills share another
2. **Authorize first** — every workflow checks collaborator permissions before running the agent
3. **Concurrency control** — issue-scoped concurrency groups prevent parallel runs from conflicting
4. **Fail-closed** — unauthorized actors are rejected with a 👎 reaction, not silently ignored
5. **Cancel-in-progress: context-dependent** — PR reviews cancel on new push; conversations queue

---

## Workflow 1: `gstack-review.yml` — PR Review + Security Audit

Triggered on every pull request. Runs `/review` (always) and `/cso` (if label-gated and label present, or if enabled without label gating).

```yaml
name: gstack-review

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  review:
    runs-on: ubuntu-latest
    concurrency:
      group: gstack-review-${{ github.event.pull_request.number }}
      cancel-in-progress: true  # New push supersedes previous review
    steps:
      - name: Authorize
        run: |
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

      - name: Install
        run: cd .gstack-actions && bun install --frozen-lockfile

      - name: Indicate
        run: bun .gstack-actions/lifecycle/indicator.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Review
        run: bun .gstack-actions/lifecycle/agent.ts --skill review --pr ${{ github.event.pull_request.number }}
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  security:
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.labels.*.name, 'security-audit') || true  # Configurable via config.json
    concurrency:
      group: gstack-security-${{ github.event.pull_request.number }}
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2

      - name: Install
        run: cd .gstack-actions && bun install --frozen-lockfile

      - name: Security Audit
        run: bun .gstack-actions/lifecycle/agent.ts --skill cso --pr ${{ github.event.pull_request.number }}
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Workflow 2: `gstack-agent.yml` — General-Purpose Issue Agent

Handles all issue-driven skills: conversation skills, investigation, manual review requests, and skill commands in comments.

```yaml
name: gstack-agent

on:
  issues:
    types: [opened, labeled]
  issue_comment:
    types: [created]

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  run-agent:
    runs-on: ubuntu-latest
    # Don't run on PR review comments (those are handled by gstack-review)
    if: >-
      !github.event.issue.pull_request &&
      (
        github.event_name == 'issues' ||
        (github.event_name == 'issue_comment' && !startsWith(github.event.comment.body, '/gstack-skip'))
      )
    concurrency:
      group: gstack-agent-${{ github.event.issue.number }}
      cancel-in-progress: false  # Queue, don't drop — conversations need every message
    steps:
      - name: Authorize
        run: |
          PERM=$(gh api "repos/${{ github.repository }}/collaborators/${{ github.actor }}/permission" --jq '.permission')
          if [[ "$PERM" != "admin" && "$PERM" != "maintain" && "$PERM" != "write" ]]; then
            gh api "repos/${{ github.repository }}/issues/${{ github.event.issue.number }}/reactions" -f content="-1" || true
            echo "::error::Unauthorized actor: ${{ github.actor }} ($PERM)"
            exit 1
          fi
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Bot loop prevention
        run: |
          if [[ "${{ github.actor }}" == *"[bot]"* ]] || [[ "${{ github.actor }}" == "github-actions" ]]; then
            echo "::notice::Skipping bot-triggered event"
            exit 0
          fi

      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2

      - name: Install
        run: cd .gstack-actions && bun install --frozen-lockfile

      - name: Indicate
        run: bun .gstack-actions/lifecycle/indicator.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Route and Execute
        run: bun .gstack-actions/lifecycle/agent.ts --route
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Workflow 3: `gstack-qa.yml` — QA Testing

Separate workflow for QA skills because they need Playwright browser setup.

```yaml
name: gstack-qa

on:
  issue_comment:
    types: [created]

permissions:
  contents: write
  issues: write

jobs:
  qa:
    runs-on: ubuntu-latest
    if: >-
      !github.event.issue.pull_request &&
      (
        startsWith(github.event.comment.body, '/qa ') ||
        startsWith(github.event.comment.body, '/qa-only ') ||
        startsWith(github.event.comment.body, '/design-review')
      )
    concurrency:
      group: gstack-qa-${{ github.event.issue.number }}
      cancel-in-progress: false
    steps:
      - name: Authorize
        run: |
          PERM=$(gh api "repos/${{ github.repository }}/collaborators/${{ github.actor }}/permission" --jq '.permission')
          if [[ "$PERM" != "admin" && "$PERM" != "maintain" && "$PERM" != "write" ]]; then
            echo "::error::Unauthorized"
            exit 1
          fi
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: cd .gstack-actions && bun install --frozen-lockfile

      - name: Install Playwright
        run: npx playwright install chromium --with-deps

      - name: Indicate
        run: bun .gstack-actions/lifecycle/indicator.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Run QA
        run: bun .gstack-actions/lifecycle/agent.ts --route
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PLAYWRIGHT_BROWSERS_PATH: /ms-playwright
```

---

## Workflow 4: `gstack-retro.yml` — Scheduled Retrospective

```yaml
name: gstack-retro

on:
  schedule:
    - cron: '0 17 * * 5'  # Friday 5pm UTC
  workflow_dispatch:
    inputs:
      window:
        description: 'Time window (e.g., 7d, 14d, 30d)'
        default: '7d'

permissions:
  contents: write
  issues: write

jobs:
  retro:
    runs-on: ubuntu-latest
    concurrency:
      group: gstack-retro
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2

      - name: Install
        run: cd .gstack-actions && bun install --frozen-lockfile

      - name: Run Retrospective
        run: |
          WINDOW="${{ github.event.inputs.window || '7d' }}"
          bun .gstack-actions/lifecycle/agent.ts --skill retro --args "$WINDOW"
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Workflow 5: `gstack-benchmark.yml` — Performance Benchmarks

```yaml
name: gstack-benchmark

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'  # Daily 6am UTC
  workflow_dispatch:

permissions:
  contents: write
  issues: write

jobs:
  benchmark:
    runs-on: ubuntu-latest
    if: ${{ vars.GSTACK_BENCHMARK_ENABLED == 'true' }}
    concurrency:
      group: gstack-benchmark
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2

      - name: Install
        run: cd .gstack-actions && bun install --frozen-lockfile

      - name: Run Benchmarks
        run: bun .gstack-actions/lifecycle/agent.ts --skill benchmark
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Workflow 6: `gstack-document-release.yml` — Post-Release Documentation

```yaml
name: gstack-document-release

on:
  release:
    types: [published]

permissions:
  contents: write
  pull-requests: write

jobs:
  document:
    runs-on: ubuntu-latest
    concurrency:
      group: gstack-document-release
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2

      - name: Install
        run: cd .gstack-actions && bun install --frozen-lockfile

      - name: Update Documentation
        run: |
          bun .gstack-actions/lifecycle/agent.ts \
            --skill document-release \
            --args "${{ github.event.release.tag_name }}"
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Workflow 7: `gstack-canary.yml` — Post-Deploy Monitoring

```yaml
name: gstack-canary

on:
  deployment_status:

permissions:
  contents: write
  issues: write

jobs:
  canary:
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success'
    concurrency:
      group: gstack-canary-${{ github.event.deployment.environment }}
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - name: Install
        run: cd .gstack-actions && bun install --frozen-lockfile

      - name: Install Playwright
        run: npx playwright install chromium --with-deps

      - name: Monitor Deployment
        run: |
          bun .gstack-actions/lifecycle/agent.ts \
            --skill canary \
            --args "${{ github.event.deployment_status.target_url }}"
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PLAYWRIGHT_BROWSERS_PATH: /ms-playwright
```

---

## Workflow 8: `gstack-install.yml` — Self-Installer

A `workflow_dispatch` workflow that installs or upgrades gstack-actions in any repository. Follows the GMI self-installer pattern.

```yaml
name: gstack-install

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'gstack-actions version to install'
        default: 'latest'

permissions:
  contents: write

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download gstack-actions
        run: |
          VERSION="${{ github.event.inputs.version }}"
          if [[ "$VERSION" == "latest" ]]; then
            VERSION=$(gh api repos/japer-technology/githubification-gstack/releases/latest --jq '.tag_name')
          fi
          gh api repos/japer-technology/githubification-gstack/tarball/$VERSION \
            -H "Accept: application/octet-stream" > /tmp/gstack.tar.gz
          tar -xzf /tmp/gstack.tar.gz --strip-components=1 -C /tmp/gstack-src
          cp -r /tmp/gstack-src/.gstack-actions .
          cp -r /tmp/gstack-src/.github/workflows/gstack-*.yml .github/workflows/
          cp -r /tmp/gstack-src/.github/ISSUE_TEMPLATE/gstack-*.yml .github/ISSUE_TEMPLATE/ 2>/dev/null || true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Commit
        run: |
          git config user.name "gstack-actions[bot]"
          git config user.email "gstack-actions[bot]@users.noreply.github.com"
          git add .gstack-actions .github/workflows/gstack-*.yml .github/ISSUE_TEMPLATE/gstack-*.yml
          git commit -m "Install gstack-actions ${{ github.event.inputs.version }}"
          git push
```

---

## Concurrency Strategy Summary

| Workflow | Concurrency Group | Cancel-in-progress | Rationale |
|----------|------------------|-------------------|-----------|
| review | `gstack-review-{PR#}` | `true` | New push supersedes previous review |
| agent | `gstack-agent-{issue#}` | `false` | Queue conversation messages, don't drop |
| qa | `gstack-qa-{issue#}` | `false` | Queue, don't drop QA requests |
| retro | `gstack-retro` | `false` | Only one retro at a time |
| benchmark | `gstack-benchmark` | `true` | Latest push is the one that matters |
| document-release | `gstack-document-release` | `true` | Latest release is the one that matters |
| canary | `gstack-canary-{env}` | `true` | Latest deployment is the one to monitor |
| install | (none) | N/A | Manual trigger, no concurrency concern |
