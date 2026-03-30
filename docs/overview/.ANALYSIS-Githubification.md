# Githubification Analysis — gstack

### How this repo could become a GitHub Action based mechanism

---

## The Subject

[gstack](https://github.com/garrytan/gstack) is a collection of SKILL.md files that give AI agents (Claude Code, Codex, Gemini CLI, Cursor) structured roles for software development. It packages twenty-five specialist skills — CEO reviewer, eng manager, designer, QA lead, PR reviewer, security officer, release engineer, debugger, and more — alongside a fast headless Chromium browser for QA testing. Skills are invoked as slash commands (`/review`, `/qa`, `/ship`, `/cso`) and orchestrate multi-step workflows that would otherwise require a team of specialists.

Today, gstack runs **locally** on a developer's machine. The skills execute inside Claude Code sessions, the headless browser daemon runs on localhost, and everything operates interactively with the developer in the loop. There is no server component, no GitHub integration beyond what Claude Code itself provides.

This document analyzes how gstack could be Githubified — transformed from a local development tool into a **GitHub Action based mechanism** that runs its skills autonomously on GitHub Actions, using Issues as the user interface, Git as persistent memory, and Actions as compute.

---

## What Githubification Means

[Githubification](https://github.com/japer-technology/githubification) is the act of converting a repository into GitHub-as-infrastructure. Instead of cloning the repo and running the software elsewhere, the repo becomes something that runs on GitHub itself via GitHub Actions. Four GitHub primitives serve four roles universally:

| GitHub Primitive | Role |
|---|---|
| **GitHub Actions** | Compute — the runner that executes the agent or software |
| **Git** | Storage and memory — state is committed, versioned, searchable |
| **GitHub Issues** | User interface — each issue is a conversation or task request |
| **GitHub Secrets** | Credential store — API keys, tokens, never hardcoded |

The [Githubification project](https://github.com/japer-technology/githubification) identifies three types of repos and five strategies. gstack falls into **Type 2 — Non-AI Software Repo** with strong elements of **Type 3 — Hybrid**. It is not itself an AI agent, but it is a toolkit that orchestrates AI agents. This puts it in a unique position: the tool that powers local AI workflows could itself become a GitHub-native AI workflow.

---

## The Reference Model: GitHub Minimum Intelligence

[GitHub Minimum Intelligence (GMI)](https://github.com/japer-technology/github-minimum-intelligence) demonstrates the gold standard of native Githubification. Its architecture provides the template for how gstack could operate on GitHub:

| Component | GMI Implementation | gstack Equivalent |
|---|---|---|
| **Trigger** | Issue opened or commented | Issue opened, PR opened, push, comment, schedule, `workflow_dispatch` |
| **Authorization** | Workflow step checks collaborator permissions | Same — workflow-level auth via `gh api` |
| **Runtime** | `pi-coding-agent` via Bun | `claude` CLI (Anthropic) or `pi-coding-agent` via Bun |
| **State** | `.github-minimum-intelligence/state/` committed to git | `.gstack-actions/state/` committed to git |
| **Conversation** | Issue #N → session file → JSONL transcript | Issue #N → skill invocation → results posted as comment |
| **Configuration** | `.pi/settings.json` | `.gstack-actions/config.json` — skill selection, model, triggers |
| **Identity** | Hatched via `BOOTSTRAP.md` | Configured via skill selection and persona settings |

GMI proves that a two-file lifecycle (`indicator.ts` + `agent.ts`) is sufficient for a production AI agent on GitHub Actions. gstack's Githubification would follow the same pattern but extend it with skill-specific routing.

---

## Githubification Strategy: Transformation + Native Hybrid

gstack's Githubification requires a **Transformation** strategy (its interaction model must change from interactive/local to event-driven/remote) combined with elements of **Native** design (new GitHub-specific orchestration built from scratch).

### Why Not Pure Wrapping

Wrapping would mean running gstack's skills exactly as they run locally. This fails for several reasons:

1. **Interactive dependency.** Skills use `AskUserQuestion` for user input — impossible on an unattended Actions runner.
2. **Browser daemon model.** gstack's browse binary runs a persistent Chromium daemon on localhost. Actions runners are ephemeral — no persistent processes.
3. **Claude Code dependency.** Skills are prompt templates consumed by Claude Code's slash-command system. GitHub Actions has no Claude Code runtime.

### Why Transformation Works

The transformation acknowledges that gstack's *value* is in its skill definitions (the prompt engineering, the workflow structure, the quality standards), not in its specific local execution model. The transformation maps each skill's workflow to GitHub Action triggers and replaces interactive prompts with issue-driven interfaces:

| Local Interaction | GitHub Action Equivalent |
|---|---|
| Developer types `/review` in Claude Code | PR is opened → workflow triggers → `/review` skill runs |
| Developer types `/qa https://staging.example.com` | Issue comment contains "qa staging.example.com" → workflow triggers |
| `AskUserQuestion` pauses for input | Agent posts a comment asking for input, waits for reply |
| Browse daemon on localhost | Playwright launched fresh per workflow run (cold-start acceptable for CI) |
| Results shown in Claude Code terminal | Results posted as issue/PR comments with Markdown formatting |

---

## Skill-to-GitHub-Action Mapping

Not all twenty-five skills are equally suited for Githubification. This section maps each skill to its most natural GitHub Action trigger and assesses feasibility.

### Tier 1 — Natural Fit (event-driven, no user interaction needed)

These skills already operate on artifacts that GitHub can provide (diffs, branches, URLs):

| Skill | Trigger | How It Works on GitHub |
|---|---|---|
| `/review` | `pull_request: [opened, synchronize]` | Runs on every PR. Posts a structured code review as a PR comment. No user input needed — the diff IS the input. |
| `/cso` | `pull_request: [opened, synchronize]` | OWASP Top 10 + STRIDE security audit runs automatically on every PR. Posts findings as a PR comment. |
| `/ship` | `workflow_dispatch` or issue comment | Runs tests, reviews, pushes. The orchestrated version of the full shipping workflow. |
| `/benchmark` | `push` to main or `schedule` | Performance regression detection. Runs benchmarks, compares to baseline committed in git. Posts results as an issue comment. |
| `/retro` | `schedule: cron` (weekly) | Weekly retrospective with per-person breakdowns. Reads git history, posts summary as a new issue. |
| `/document-release` | `release: [published]` | Updates docs to match what was just shipped. Commits changes and opens a PR. |

### Tier 2 — Good Fit (needs URL or brief input, provided via issue)

| Skill | Trigger | How It Works on GitHub |
|---|---|---|
| `/qa` | Issue comment with URL | User opens issue: "QA https://staging.example.com". Workflow launches Chromium on the runner, runs QA tests, posts bug report as comments with screenshots. |
| `/qa-only` | Issue comment with URL | Same as `/qa` but report-only — no code changes. |
| `/design-review` | `pull_request` on CSS/UI files | Design audit on PRs that touch visual files. Posts findings with before/after screenshots. |
| `/plan-design-review` | Issue comment | Report-only design audit, triggered by user request in an issue. |
| `/investigate` | Issue with `investigate` label | Systematic root-cause debugging. User describes the bug in an issue, agent investigates and posts findings. |
| `/canary` | `deployment_status: [success]` | Post-deploy monitoring loop. After a deployment succeeds, the agent monitors and reports. |

### Tier 3 — Moderate Fit (requires multi-turn conversation)

| Skill | Trigger | How It Works on GitHub |
|---|---|---|
| `/office-hours` | Issue with `office-hours` label | Multi-turn conversation. User describes their product idea, agent asks questions via comments, user replies, agent refines. Follows the GMI conversation pattern exactly. |
| `/plan-ceo-review` | Issue comment | CEO-level review of a feature idea. Posts structured analysis as a comment. May ask clarifying questions. |
| `/plan-eng-review` | Issue comment | Architecture review. Locks architecture, data flow, edge cases, tests. Posts as comment. |
| `/design-consultation` | Issue with `design-consultation` label | Multi-turn design system creation. Requires back-and-forth. |
| `/autoplan` | Issue comment | Auto-review pipeline: CEO → design → eng. Runs all three reviews sequentially, posts combined results. |

### Tier 4 — Low Fit (local-only, safety, or meta-skills)

| Skill | Assessment |
|---|---|
| `/careful`, `/freeze`, `/guard`, `/unfreeze` | Safety skills for local editing. Not applicable to CI — replaced by branch protection rules and CODEOWNERS. |
| `/browse` | The underlying browser is needed by other skills (QA, design-review) but `/browse` as a standalone interactive skill doesn't map to CI. The browser *capability* is Githubified; the *skill* is not. |
| `/setup-browser-cookies` | Local-only. Cookie import from a developer's browser has no CI equivalent. |
| `/setup-deploy` | One-time local configuration. Could be replaced by a `workflow_dispatch` setup wizard. |
| `/gstack-upgrade` | Local update mechanism. Replaced by Dependabot or Renovate for the action version. |
| `/codex` | Multi-AI second opinion via OpenAI Codex CLI. Could work on CI but requires Codex credentials and has high cost per invocation. |
| `/land-and-deploy` | Merge → deploy → canary. Partially Githubifiable — the merge and deploy steps map to GitHub, but the canary monitoring maps to `/canary` separately. |

---

## Proposed Architecture

### Folder Structure

Following the Githubification convention of a dot-prefixed folder:

```
.gstack-actions/
├── workflows/
│   ├── gstack-review.yml           # PR review workflow
│   ├── gstack-qa.yml               # QA testing workflow
│   ├── gstack-security.yml         # CSO security audit workflow
│   ├── gstack-retro.yml            # Weekly retrospective workflow
│   ├── gstack-benchmark.yml        # Performance benchmark workflow
│   ├── gstack-office-hours.yml     # Interactive office hours workflow
│   ├── gstack-agent.yml            # General-purpose issue-driven agent
│   └── gstack-document-release.yml # Post-release doc updates
├── lifecycle/
│   ├── indicator.ts                # Add 🚀 reaction (GMI pattern)
│   ├── router.ts                   # Skill router — maps triggers to skills
│   └── agent.ts                    # Core orchestrator — runs claude/pi, posts replies
├── skills/                         # Extracted skill prompts (no bash preamble, no browse setup)
│   ├── review.md                   # /review skill adapted for CI
│   ├── cso.md                      # /cso skill adapted for CI
│   ├── qa.md                       # /qa skill adapted for CI
│   ├── retro.md                    # /retro skill adapted for CI
│   └── ...                         # Other adapted skills
├── config.json                     # Skill enablement, model selection, trigger config
├── state/
│   ├── issues/                     # Issue-to-session mappings
│   └── sessions/                   # Conversation transcripts
├── package.json                    # Runtime dependency (pi-coding-agent)
└── bun.lock                        # Dependency lockfile
```

### Workflow Pattern

Each workflow follows the GMI two-step lifecycle pattern:

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
      cancel-in-progress: true
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

      - name: Install
        run: cd .gstack-actions && bun install --frozen-lockfile

      - name: Review
        run: bun .gstack-actions/lifecycle/agent.ts --skill review --pr ${{ github.event.pull_request.number }}
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Skill Router

The `router.ts` maps GitHub events to skills:

```
pull_request.opened       → /review, /cso, /design-review (if UI files changed)
pull_request.synchronize  → /review (re-review on push)
issues.opened             → parse body for skill command, route to appropriate skill
issue_comment.created     → continue conversation or invoke requested skill
schedule                  → /retro (weekly), /benchmark (nightly)
release.published         → /document-release
deployment_status.success → /canary
workflow_dispatch          → /ship, /office-hours, /plan-ceo-review
```

### Browser on CI

For skills that need a browser (`/qa`, `/design-review`, `/qa-only`), the GitHub Actions runner provides the environment:

- **Ubuntu runners** include Chromium via `apt` or Playwright's bundled browsers
- **No persistent daemon needed** — each workflow run launches Playwright fresh, acceptable for CI latency
- **Screenshots** are uploaded as PR comments or issue attachments via the GitHub API
- The browse binary can be compiled for Linux x86_64 (current binary is macOS arm64 only) or replaced with direct Playwright API calls in the lifecycle scripts

### State Management

Following GMI's git-as-memory pattern:

- **Per-skill results** are committed to `.gstack-actions/state/results/` with timestamps
- **Conversation sessions** (for multi-turn skills like `/office-hours`) use the same `issues/{N}.json` → `sessions/{timestamp}.jsonl` mapping
- **Benchmark baselines** are committed to `.gstack-actions/state/benchmarks/` for regression detection
- **Retro history** is committed for trend analysis across weeks

---

## The Unique Value Proposition

Githubified gstack would be fundamentally different from existing GitHub AI bots (Copilot PR review, CodeRabbit, etc.) in several ways:

### 1. Multi-Specialist Architecture

Existing bots do one thing — usually code review. Githubified gstack provides the full engineering team: CEO review, design review, architecture review, security audit, QA testing, performance benchmarking, retrospectives, and release documentation. All from the same installation.

### 2. Opinionated Quality Standards

gstack's skills encode specific quality bars and workflow practices (the "Boil the Lake" philosophy, the Completeness Principle, AI effort compression tables). These are not generic "review my code" prompts — they are structured engineering workflows developed through shipping 600,000+ lines of production code.

### 3. Real Browser Testing

No other GitHub Action provides AI-driven QA testing with a real headless browser. `/qa` opens a real Chromium instance, navigates the site, finds bugs, takes screenshots, and reports them — all on the CI runner.

### 4. Composable Skill System

Skills are Markdown files. Users can modify prompts, add new skills, disable skills, or compose multi-skill workflows through configuration. This is the SKILL.md standard — an open format, not a proprietary plugin system.

### 5. Full Auditability (GMI Pattern)

Every AI decision, every review comment, every QA finding is committed to git. You can `git log`, `git blame`, and `git revert` any AI-generated output. The reasoning is preserved alongside the result.

---

## Implementation Challenges

### Challenge 1: AI Runtime on GitHub Actions

gstack skills are prompt templates designed for Claude Code. On GitHub Actions, the runtime options are:

| Runtime | Pros | Cons |
|---|---|---|
| `claude` CLI (Anthropic) | Direct Claude access, supports tools, MCP | Requires `ANTHROPIC_API_KEY`, Claude-specific |
| `pi-coding-agent` (pi-mono) | Multi-provider, proven on Actions (GMI uses it), session management | Smaller community, single maintainer |
| Direct API calls | Maximum control, any provider | Must implement tool use, retry, streaming manually |

**Recommendation:** Start with `pi-coding-agent` for consistency with the GMI pattern. It handles session management, multi-provider support, and tool execution out of the box. The same single dependency that powers GMI can power Githubified gstack.

### Challenge 2: Skill Prompt Adaptation

gstack's SKILL.md files contain:
- A bash preamble that sets up local state (`~/.gstack/sessions/`, config detection)
- Browse setup blocks that start/connect to the local Chromium daemon
- `AskUserQuestion` calls for interactive input
- References to local paths and state

For Githubification, each skill prompt must be adapted:
- **Remove local preamble** — replace with CI-specific context injection (repo name, PR number, branch, diff)
- **Replace browse setup** — use Playwright directly on the runner
- **Replace AskUserQuestion** — post a comment and wait for a reply (or skip for non-interactive skills)
- **Replace local paths** — use runner workspace paths and git-committed state

This is a one-time adaptation per skill, not ongoing maintenance.

### Challenge 3: Cost Management

Running an LLM on every PR push could be expensive. Mitigation:

- **Configurable triggers** — `config.json` lets users enable/disable individual skills
- **Label-gated skills** — expensive skills (full `/review`, `/cso`) only run when a label is applied
- **Diff-based filtering** — skip review if only docs changed, skip design-review if no UI files changed
- **Model selection** — allow cheaper models for routine checks, reserve expensive models for `/ship`
- **Concurrency limits** — prevent parallel runs on the same PR from stacking costs

### Challenge 4: Runner Time Limits

GitHub Actions has a 6-hour job time limit (free tier: 2,000 minutes/month for private repos, unlimited for public). Multi-turn conversations (`/office-hours`) could hit limits.

Mitigation: Each turn is a separate workflow run, triggered by a new issue comment. No single run needs more than a few minutes.

### Challenge 5: Browser Binary Compatibility

The current browse binary is compiled for macOS arm64. GitHub Actions runners are Linux x86_64.

Options:
1. **Cross-compile** — `bun build --compile --target=bun-linux-x64` produces a Linux binary
2. **Build from source on runner** — install Bun, compile during workflow (adds ~30s)
3. **Use Playwright directly** — bypass the browse binary entirely and use Playwright's Node.js API in the lifecycle scripts

**Recommendation:** Option 3 for CI. The browse daemon model (persistent Chromium, sub-second latency) optimizes for interactive use. CI workflows don't need sub-second latency — they need reliability. Launch Playwright fresh per run, take screenshots, post results.

---

## Implementation Roadmap

### Phase 1 — Core Review Workflow (Proof of Concept)

**Goal:** `/review` runs automatically on every PR and posts findings as a comment.

1. Create `.gstack-actions/` folder structure
2. Adapt the `/review` skill prompt for CI (remove preamble, inject PR context)
3. Write `agent.ts` orchestrator using `pi-coding-agent`
4. Write `gstack-review.yml` workflow triggered on `pull_request`
5. Test on a real repository

**Deliverable:** A working GitHub Action that reviews PRs with gstack's quality standards.

### Phase 2 — Security + QA

**Goal:** `/cso` and `/qa` run on PRs and on-demand via issues.

1. Adapt `/cso` skill prompt for CI
2. Adapt `/qa` skill prompt for CI with Playwright browser integration
3. Add screenshot capture and GitHub API image upload
4. Write `gstack-security.yml` and `gstack-qa.yml` workflows
5. Add `config.json` for skill enablement and model selection

### Phase 3 — Multi-Turn Conversation Skills

**Goal:** `/office-hours`, `/plan-ceo-review`, `/plan-eng-review` work through issue conversations.

1. Implement conversation state management (GMI's issue→session mapping)
2. Write the general-purpose `gstack-agent.yml` workflow triggered on issues
3. Implement the skill router (`router.ts`)
4. Add session persistence via git commits

### Phase 4 — Scheduled and Event-Driven Skills

**Goal:** `/retro`, `/benchmark`, `/document-release`, `/canary` run automatically.

1. Write cron-triggered workflows for `/retro` and `/benchmark`
2. Write release-triggered workflow for `/document-release`
3. Write deployment-triggered workflow for `/canary`
4. Implement state persistence for benchmark baselines and retro history

### Phase 5 — Distribution as a GitHub Action

**Goal:** Publish as a reusable GitHub Action that any repo can adopt.

1. Package as a composite action or Docker-based action
2. Publish to GitHub Marketplace
3. Provide a one-line installation (add workflow file + configure secrets)
4. Alternatively, follow GMI's self-installer pattern: copy one workflow file, run it, agent installs itself

---

## Githubification Classification

| Dimension | Assessment |
|---|---|
| **Repo type** | Type 2 (Non-AI Software) + Type 3 (Hybrid) — gstack is a toolkit for AI agents, not an agent itself |
| **Strategy** | Transformation — the interaction model must change from interactive/local to event-driven/remote |
| **Lifecycle complexity** | Moderate — skill routing adds a layer beyond GMI's simple two-step lifecycle |
| **Runtime dependencies** | 1 primary (`pi-coding-agent`), 1 optional (`playwright` for browser skills) |
| **Impedance mismatch** | Moderate — skills are already structured prompts, but they assume local execution and interactive input |
| **Feasibility** | High — the skill prompts are the hard part, and they already exist. The plumbing (workflows, lifecycle scripts, state management) is proven by GMI |

---

## What Makes This Case Unique

gstack is not a typical Githubification candidate. It is a **meta-tool** — a tool that makes AI agents better at software engineering. Githubifying it creates a recursive loop: the AI engineering workflow tool becomes itself an AI engineering workflow running on GitHub.

This is analogous to GMI's observation that "when the agent IS the Githubification layer, the architecture collapses." For gstack, the insight is: **when the engineering workflow tool IS the CI pipeline, the distinction between development and deployment collapses.**

A developer using Githubified gstack would experience:

1. **Push code** → gstack `/review` and `/cso` run automatically → findings appear as PR comments
2. **Open an issue** → gstack `/investigate` debugs the problem → posts root-cause analysis
3. **Deploy** → gstack `/canary` monitors → posts results
4. **Every week** → gstack `/retro` summarizes the team's shipping velocity
5. **Need design help** → open an issue with the `design-consultation` label → multi-turn design system conversation

The same twenty-five specialists that run locally in Claude Code would run autonomously on GitHub, triggered by the natural events of software development. No installation. No CLI. No Claude Code subscription. Just GitHub.

---

## Conclusion

gstack is highly suited for Githubification. Its skills are already structured as self-contained Markdown prompts with clear inputs and outputs. The GMI project provides a proven execution template (workflow, lifecycle scripts, state management, git-as-memory). The main work is adaptation — mapping local interactive patterns to GitHub's event-driven model — rather than reimplementation.

The result would be something that does not exist today: a **full AI engineering team as a GitHub Action** — review, security, QA, design, architecture, retrospectives, and release management, all running autonomously on the code events that already happen in every GitHub repository.

> *"Githubification leverages the same primitives: Actions as compute, Git as storage and memory, Issues as the user interface, Secrets as the credential store. By applying these primitives to any repository, Githubification turns GitHub from a place where code is stored into a place where code is run."*

gstack is ready to make that transition.

---

*Analysis applied to [githubification-gstack](https://github.com/japer-technology/githubification-gstack), informed by [GitHub Minimum Intelligence](https://github.com/japer-technology/github-minimum-intelligence) v1.0.8 and [Githubification](https://github.com/japer-technology/githubification) methodology.*
