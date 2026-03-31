# 01 — Resource Extraction

### What to extract from gstack, what to leave behind, and the `run-refresh-gstack` mechanism

---

## The Extraction Principle

gstack is a dual-nature project: **skill content** (Markdown prompt templates, checklists, quality standards) and **local infrastructure** (browse binary, Claude Code integration, interactive prompt system). The skill content is the value. The local infrastructure is the execution model that must be replaced.

Resource extraction identifies which components carry their value forward into a GitHub-native context and which are bound to the local execution model.

---

## Extracted Resources — The Value Layer

### Foundational Documents

These documents define the philosophy, identity, and operational standards of gstack. They are injected into every skill or referenced during execution.

| Resource | Source Location | Extraction Purpose |
|----------|----------------|-------------------|
| `ETHOS.md` | `repo/gstack/ETHOS.md` | Three builder principles (Boil the Lake, Search Before Building, User Sovereignty) — injected into the pi-coding-agent's system prompt as operational values |
| `ARCHITECTURE.md` | `repo/gstack/ARCHITECTURE.md` | Architectural decisions and rationale — context for adapting skills |
| `AGENTS.md` | `repo/gstack/AGENTS.md` | Skill routing table and agent definitions — becomes the foundation for the skill router |
| `SKILL.md.tmpl` | `repo/gstack/SKILL.md.tmpl` | Root skill template with browse/QA capabilities and proactive routing rules — template for the CI-adapted base prompt |

### Tier 1 Skills — Natural Fit (event-driven, no user interaction)

These skills already operate on artifacts GitHub can provide (diffs, branches, commit history). They require minimal adaptation.

| Skill | Source Directory | What It Does | Value Extracted |
|-------|-----------------|--------------|-----------------|
| `/review` | `repo/gstack/review/` | Pre-landing PR review with structured checklists | `SKILL.md.tmpl` + `checklist.md` + `design-checklist.md` + `TODOS-format.md` + `greptile-triage.md` |
| `/cso` | `repo/gstack/cso/` | OWASP Top 10 + STRIDE security audit | `SKILL.md.tmpl` + `ACKNOWLEDGEMENTS.md` |
| `/ship` | `repo/gstack/ship/` | Run tests, review, push, open PR — full shipping workflow | `SKILL.md.tmpl` |
| `/benchmark` | `repo/gstack/benchmark/` | Performance regression detection | `SKILL.md.tmpl` |
| `/retro` | `repo/gstack/retro/` | Weekly retrospective with per-person breakdowns | `SKILL.md.tmpl` |
| `/document-release` | `repo/gstack/document-release/` | Update docs to match what was shipped | `SKILL.md.tmpl` |

### Tier 2 Skills — Good Fit (URL or brief input via issues)

These skills need a URL or brief user input, provided via issue body or comment.

| Skill | Source Directory | What It Does | Value Extracted |
|-------|-----------------|--------------|-----------------|
| `/qa` | `repo/gstack/qa/` | Browser-based QA testing with bug reporting | `SKILL.md.tmpl` + `references/issue-taxonomy.md` + `templates/qa-report-template.md` |
| `/qa-only` | `repo/gstack/qa-only/` | QA report only — no code changes | `SKILL.md.tmpl` |
| `/design-review` | `repo/gstack/design-review/` | Design audit with before/after screenshots | `SKILL.md.tmpl` |
| `/plan-design-review` | `repo/gstack/plan-design-review/` | Report-only design audit | `SKILL.md.tmpl` |
| `/investigate` | `repo/gstack/investigate/` | Systematic root-cause debugging | `SKILL.md.tmpl` |
| `/canary` | `repo/gstack/canary/` | Post-deploy monitoring loop | `SKILL.md.tmpl` |

### Tier 3 Skills — Moderate Fit (multi-turn conversation)

These skills require back-and-forth with the user via issue comments. They follow GMI's conversation pattern.

| Skill | Source Directory | What It Does | Value Extracted |
|-------|-----------------|--------------|-----------------|
| `/office-hours` | `repo/gstack/office-hours/` | Product idea refinement through conversation | `SKILL.md.tmpl` |
| `/plan-ceo-review` | `repo/gstack/plan-ceo-review/` | CEO-level feature review | `SKILL.md.tmpl` |
| `/plan-eng-review` | `repo/gstack/plan-eng-review/` | Architecture lock — data flow, edge cases, tests | `SKILL.md.tmpl` |
| `/design-consultation` | `repo/gstack/design-consultation/` | Build a complete design system from scratch | `SKILL.md.tmpl` |
| `/autoplan` | `repo/gstack/autoplan/` | Auto-review pipeline: CEO → design → eng | `SKILL.md.tmpl` |

### Skill Infrastructure

| Resource | Source Location | Extraction Purpose |
|----------|----------------|-------------------|
| `scripts/gen-skill-docs.ts` | `repo/gstack/scripts/gen-skill-docs.ts` | Reference for building CI-adapted skill generation |
| `scripts/skill-check.ts` | `repo/gstack/scripts/skill-check.ts` | Health dashboard pattern for monitoring skill availability |
| `scripts/discover-skills.ts` | `repo/gstack/scripts/discover-skills.ts` | Skill discovery utility — reference for router implementation |
| `scripts/resolvers/` | `repo/gstack/scripts/resolvers/` | Template resolver modules — preamble, browse, design, review, testing |
| `lib/worktree.ts` | `repo/gstack/lib/worktree.ts` | Git worktree management for parallel skill execution |
| `conductor.json` | `repo/gstack/conductor.json` | Orchestration configuration pattern |

---

## NOT Extracted — The Local Infrastructure Layer

These resources are tightly coupled to gstack's local execution model and have no meaningful transfer to GitHub Actions.

| Resource | Why It Stays Behind | GitHub-Native Replacement |
|----------|--------------------|-----------------------------|
| `browse/` source code | Persistent Chromium daemon optimized for sub-second local latency. CI doesn't need persistent daemons — ephemeral browsers are fine. | Playwright launched fresh per workflow run |
| Tier 4 skills (`/careful`, `/freeze`, `/guard`, `/unfreeze`) | Local editing safety skills. CI has its own safety model: branch protection, CODEOWNERS, required reviews. | Branch protection rules and CODEOWNERS |
| `/setup-browser-cookies` | Imports cookies from a developer's local browser. No equivalent in CI — authenticated testing uses service accounts or API tokens. | GitHub Secrets for service account credentials |
| `/setup-deploy` | One-time local configuration | `workflow_dispatch` setup wizard or installation workflow |
| `/gstack-upgrade` | Local update mechanism | `run-refresh-gstack` function in the single super yml workflow |
| `/codex` | Multi-AI second opinion via Codex CLI | Potentially reimplementable but high cost per invocation |
| `/land-and-deploy` | Merge → deploy → canary chain | Decomposed into separate workflow functions: merge via PR, deploy via existing CD, canary via `/canary` skill |
| `design/` binary tooling | Local-only design HTML generation | Not needed — design review posts findings as Markdown comments |
| `test/` tests | Coupled to local execution model and browse binary | New tests for CI-adapted skills |
| `bun.lock` | Specific to gstack's dependency tree | New lockfile for the `.github-gstack-intelligence/` package |
| `bin/` dev scripts | Local development tooling | Replaced by workflow dispatch and lifecycle scripts |
| `supabase/` | Infrastructure-specific | Not applicable |
| `.env.example` | Local configuration | GitHub Secrets |

---

## The `run-refresh-gstack` Mechanism

A key design principle is that **resource extraction happens at refresh time, not at execution time**. The single super yml workflow includes a `run-refresh-gstack` function that:

1. **Fetches the latest gstack source** from `garrytan/gstack` (or a pinned tag/commit)
2. **Extracts transferable resources** — skill prompts, checklists, ethos documents, quality standards
3. **Applies CI adaptations** — replaces local references with GitHub-native equivalents
4. **Commits the extracted resources** to `.github-gstack-intelligence/skills/` and `.github-gstack-intelligence/skills/references/`
5. **Updates the VERSION file** — tracks which gstack version the resources were extracted from

```
run-refresh-gstack trigger (workflow_dispatch or schedule)
    │
    ▼
Fetch latest gstack repo → Extract skill prompts + references
    │
    ▼
Apply CI adaptations (replace local paths, browse commands, etc.)
    │
    ▼
Commit to .github-gstack-intelligence/skills/
    │
    ▼
Update .github-gstack-intelligence/VERSION with source commit/tag
```

**Why refresh-time extraction, not runtime fetching:**
- **Zero external fetches during skill execution** — all resources are pre-committed and local
- **Deterministic behaviour** — the exact skill prompts are version-controlled and auditable
- **No network dependency** — skill execution works even if the gstack repo is unavailable
- **Diffable changes** — `git diff` shows exactly what changed between gstack versions
- **Controlled cadence** — teams decide when to pull new gstack resources, not on every PR

---

## The Transformation Map

For each extracted resource, the transformation from local to GitHub-native follows a consistent pattern:

| Local Pattern | GitHub-Native Equivalent |
|---|---|
| `{{PREAMBLE}}` template variable | CI-specific preamble injecting repo context, PR number, branch, diff summary |
| `{{BROWSE_SETUP}}` template variable | Playwright setup block with `npx playwright install chromium` |
| `AskUserQuestion` tool | Post an issue comment requesting input; wait for next `issue_comment` event |
| `$B <command>` (browse binary) | Playwright API calls in lifecycle TypeScript (`page.goto()`, `page.screenshot()`) |
| Local file paths (`~/.gstack/`, `~/.claude/skills/`) | Runner workspace paths (`$GITHUB_WORKSPACE/.github-gstack-intelligence/`) |
| `gstack-config` settings | `.github-gstack-intelligence/config.json` committed to repo |
| `gstack-review-log` | State committed to `.github-gstack-intelligence/state/results/` |
| Interactive skill routing (`/review` slash command) | Event-driven routing via single super yml workflow (PR opened → review, issue labeled → investigate) |
| `conductor.json` setup/archive | GitHub Actions `workflow_dispatch` for setup, no teardown needed |
| `/gstack-upgrade` local command | `run-refresh-gstack` function in the single super yml workflow |

---

## Extraction Completeness

| Category | Count | Status |
|----------|-------|--------|
| Foundational documents | 4 | ✅ Fully extracted in `repo/gstack/` |
| Tier 1 skills (event-driven) | 6 | ✅ Fully extracted |
| Tier 2 skills (brief input) | 6 | ✅ Fully extracted |
| Tier 3 skills (multi-turn) | 5 | ✅ Fully extracted |
| Skill supplementary files | 7 | ✅ Fully extracted |
| Skill generation tooling | 4+ | ✅ Fully extracted |
| Local infrastructure | 12 items | ⛔ Not extracted — replaced by GitHub-native equivalents |

**Total skills for reimplementation: 17** (6 Tier 1 + 6 Tier 2 + 5 Tier 3)

The extraction is complete. Every transferable resource already exists in `repo/gstack/`. The next step is adaptation and reimplementation.
