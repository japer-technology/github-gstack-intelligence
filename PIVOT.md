# PIVOT.md — Migrating `github-gstack-intelligence` to GitHub Agentic Workflows (`gh-aw`)

> Deep analysis of what would need to change in this repository to fully adopt
> [`gh-aw`](https://github.github.com/gh-aw) (GitHub Agentic Workflows) as the
> execution substrate for the AI agent, in place of the current hand-rolled
> Bun + `pi-coding-agent` + YAML stack.
>
> Sources: [`githubnext/gh-aw`](https://github.com/githubnext/gh-aw),
> [`github-agentic-workflows.md`](https://raw.githubusercontent.com/githubnext/gh-aw/main/.github/aw/github-agentic-workflows.md),
> and the published docs at `https://github.github.com/gh-aw/`.
> This repository is read at v1.0.5 (see `.github-gstack-intelligence/VERSION`).

---

## 1. TL;DR

`gh-aw` and `github-gstack-intelligence` solve overlapping problems —
*"run an LLM agent inside GitHub Actions in response to repo events"* —
but they are **architecturally inverted**:

| Dimension | This repo (today) | `gh-aw` |
|---|---|---|
| Authoring surface | Hand-written YAML workflow + 900-line `agent.ts` orchestrator + 372-line `router.ts` | Markdown file with YAML frontmatter; YAML workflow is a **generated `.lock.yml` artifact** |
| Agent runtime | `@earendil-works/pi-coding-agent` (single CLI) | Pluggable `engine:` — Copilot, Claude, Codex, Gemini, OpenCode |
| Write surface | `contents: write`, `issues: write`, `pull-requests: write` on the main job | Read-only main job; writes go through a separate **`safe-outputs`** job with a typed schema |
| Routing | TypeScript `router.ts` switches on event/label/slash command | Native `on:` triggers including `on.command:` and `on.reaction:` per workflow file |
| Tools | Implicit — whatever pi exposes + Playwright we install | Declarative `tools:` block (`github`, `bash`, `edit`, `web-fetch`, `playwright`, MCP servers) with allow-listing |
| Network | Unrestricted egress | `network:` allow-list (`defaults`, `github`, custom domains) enforced at workflow level |
| Memory | Git-committed JSONL session files under `state/` | `cache-memory:` / `memory:` primitives (file-based, scoped per workflow) |
| Compilation | None — YAML is the source of truth | `gh aw compile` produces `.lock.yml`; lock file is what Actions runs |
| Auth | Inline shell calling `gh api …/collaborators/<actor>/permission` | `roles:` frontmatter (`admin`, `maintain`, `write`) enforced by the compiler |
| Bot-loop prevention | Hidden HTML signature + skip in `router.ts` | Built-in; agent comments are tagged and filtered automatically |

Pivoting fully to gh-aw means **the current YAML workflow disappears**,
`lifecycle/agent.ts` and `lifecycle/router.ts` cease to exist as code,
and each of the 26 gstack skills becomes a **standalone `.github/workflows/<skill>.md`** file
(or a small number of multi-trigger workflow files). The skill *prompt content* survives
almost verbatim; the *orchestration code around it* is deleted.

The trade-off: we **lose** several distinctive properties of the current design
(single drop-in YAML, multi-provider key support, JSONL transcripts visible in git,
session resume across runs, the self-installer, the `garrytan/gstack` refresh pipeline).
We **gain** read-only-by-default security, declarative routing, sanitized inputs,
network egress controls, MCP allow-listing, and a much smaller code surface to maintain.

A staged migration (Section 7) is feasible; a clean-slate rewrite is also feasible
and probably faster than retrofitting.

---

## 2. Current architecture (what we have)

Reference points:

- `.github/workflows/github-gstack-intelligence-agent.yml` — single 955-line workflow with 4 jobs:
  - `run-install` — self-installer/upgrader pulling from this template repo
  - `run-refresh-gstack` — vendoring pipeline from `garrytan/gstack`
  - `run-agent` — the actual AI agent
  - `run-gitpages` — publishes `public-site/`
- `.github-gstack-intelligence/lifecycle/`
  - `agent.ts` (917 lines) — fetches event, resumes session, spawns `pi`, posts comment, commits state, retries on conflict
  - `router.ts` (372 lines) — maps `(event_name, comment_body, labels, schedule)` → skill name
  - `browser.ts` (434 lines) — Playwright wrapper for the 8 browser-using skills
  - `refresh.ts` — vendors upstream gstack prompts
- `.github-gstack-intelligence/skills/*.md` — 26 markdown skill prompts (e.g. `review.md`, `cso.md`, `qa.md`) imported from `garrytan/gstack`, each with their own frontmatter (`allowed-tools`, `triggers`, etc.)
- `.github-gstack-intelligence/config.json` — per-skill enabled/disabled flags + trigger metadata
- `.github-gstack-intelligence/.pi/settings.json` — LLM provider and model (per the stored memory, this is the source of truth, *not* `config.json.defaults`)
- `.github-gstack-intelligence/state/` — git-committed `sessions/*.jsonl` + `issues/<n>.json` mapping files
- `.github-gstack-intelligence/help/README.md` — slash-command reference

Key behaviours worth naming because gh-aw handles them differently:

1. **One workflow, many skills.** A single YAML file is the entry point; all routing is in TS.
2. **Self-installer.** Manual `workflow_dispatch` run copies the agent folder into the user's repo.
3. **Vendored prompts.** `refresh.ts` pulls upstream skills with SHA tracking in `skills/source.json`.
4. **Provider-agnostic.** Seven LLM API key env vars are passed through; `pi` chooses based on `.pi/settings.json`.
5. **Cross-run session continuity.** `state/sessions/<ts>.jsonl` is committed and replayed via `pi --session <path>`.
6. **Append-only memory.** `memory.log merge=union` git attribute lets parallel runs append without conflict.
7. **Inline auth.** Shell step queries `repos/.../collaborators/<actor>/permission` and 👎-reacts on rejection.
8. **Reaction lifecycle.** 🚀 added by Authorize step, swapped to 👍/👎 by `agent.ts` on exit.
9. **Push-retry loop.** Up to 10 attempts with `pull --rebase -X theirs` between tries.
10. **Conditional Playwright.** Only installed when the routed skill is in the browser set.
11. **GitHub Pages publishing.** `public-site/` deployed on every run.
12. **Sliding-window upgrade.** File-by-file copy with ALWAYS / NEVER / DEFAULT categories preserves user edits.

---

## 3. What `gh-aw` actually is

(Distilled from the upstream reference doc.)

### 3.1 File format
Each workflow is a **markdown file at `.github/workflows/<name>.md`** with a YAML frontmatter:

- `on:` — standard GH Actions triggers **plus** `on.command:` (slash commands), `on.reaction:` (emoji triggers), `on.stop-after:` deadlines, `forks:` controls.
- `engine:` — `copilot` | `claude` | `codex` | `gemini` | `opencode` (and `custom:` for arbitrary scripts).
- `permissions:` — same syntax as Actions, but conventions strongly discourage any write permission on the main job.
- `network:` — egress allow-list (`defaults`, `github`, `[domain.com]`).
- `tools:` — declarative; includes `github` (with `mode: gh-proxy` or `local`, plus `toolsets:` like `[default, issues, pull_requests]`), `bash:` (with a narrow allow-list of binaries), `edit:`, `web-fetch:`, `playwright:`, and arbitrary `mcps:` blocks (with SHA-pinned docker images, allowed-tools, env mapping).
- `safe-outputs:` — typed declarations of *the only writes the agent is permitted to perform*: `add-comment`, `create-issue`, `update-issue`, `add-labels`, `create-pull-request`, `create-pull-request-review-comment`, `create-discussion`, `assign-to-agent`, `upload-artifact`, etc. Each has parameters (`max:`, `title-prefix:`, `labels:`, `allowed:`, `skip-if-match:`).
- `roles:` / `cache-memory:` / `timeout-minutes:` / `strict: true` / `imports:` (for shared frontmatter snippets).

The markdown **body** is the natural-language prompt, interpolating Actions
context (`${{ github.event.issue.number }}`) and a **sanitized event payload**
(`${{ steps.sanitized.outputs.text }}` — `@`-mentions defanged, bot-trigger
phrases neutralised, length-capped).

### 3.2 Compilation
`gh aw compile` produces a sibling **`<name>.lock.yml`** which is the *actual*
Actions workflow that runs. Lock files:

- Are committed and reviewable in PRs (auditable codegen).
- SHA-pin every action and container image (supply-chain hardening).
- Split the run into a read-only "agent job" and a separate "safe-outputs job" with narrowly-scoped writes.
- Inject the sanitization step, network jail (squid proxy or similar), MCP server containers, bot-loop signatures, and role checks.

Editing frontmatter requires recompiling; editing the markdown body does not.

### 3.3 Safety model
- **Default-deny writes.** Main agent job runs `contents: read` only.
- **Safe outputs are a contract.** Agent emits a JSON envelope; the safe-outputs job validates against schema (title prefixes, label allow-lists, max counts, body length) and then performs the write.
- **Network jail.** Outbound traffic restricted by allow-list, defaulting to a small "defaults" set.
- **Tool jail.** `bash:` defaults to nothing; commands must be listed.
- **Role jail.** `roles: [admin, maintain]` short-circuits the run if the actor lacks the role.
- **Input sanitization.** Untrusted markdown (issue body, PR description, comments) is HTML-escaped and stripped of `@mentions` / instructions like `Ignore previous`.
- **Bot-loop prevention.** Built in — comments authored by the workflow's own bot identity are filtered automatically.

### 3.4 What gh-aw does *not* do (relevant gaps)
- It does **not** provide a "session resume across runs" primitive comparable to our committed JSONL transcripts. `cache-memory:` is per-workflow file-based memory, not multi-turn chat history.
- It does **not** auto-vendor upstream prompts. The `gh aw` CLI has `gh aw install <pkg>` for *workflows*, not for arbitrary prompt files like ours.
- It does **not** publish GitHub Pages (`run-gitpages` is out of scope — that's a normal Actions job).
- It does **not** allow truly arbitrary multi-provider key passing on a single workflow; one `engine:` per workflow (though `custom:` provides escape hatches).
- It does **not** ship a "single drop-in YAML to copy" deployment story; users `gh extension install githubnext/gh-aw` and then `gh aw add` workflows.

---

## 4. Component-by-component delta

### 4.1 The workflow file (`github-gstack-intelligence-agent.yml`)
**Disposition: deleted, replaced by N markdown workflow files.**

The current ~955-line YAML covers:
- 8 trigger classes (issues, issue_comment, pull_request, push, workflow_dispatch, schedule×2, release, deployment_status)
- 4 jobs (install, refresh, agent, gitpages)
- inline shell for: actor authorization, reactions lifecycle, semver upgrade check, file-by-file overlay, .gitignore/.gitattributes maintenance, Playwright conditional install, push retry

In gh-aw:
- Each **skill becomes its own `.md`** in `.github/workflows/` (or skills sharing a single trigger can share a file).
  - `review.md` → `on.pull_request.types: [opened, synchronize]`
  - `cso.md` → `on.pull_request:` + `labels: [security-audit]`
  - `qa.md` → `on.command: { name: qa }`
  - `retro.md` → `on.schedule: "weekly on friday at 17:00 UTC"`
  - `document-release.md` → `on.release.types: [published]`
  - …and so on for the other 21.
- The router YAML guards (`if: github.actor != 'github-actions[bot]' && …`) → replaced by `roles:` + automatic bot-loop filtering.
- Concurrency stanza per workflow (gh-aw supports the same `concurrency:` block in frontmatter; the elaborate expression we use can be expressed per-workflow).
- The 🚀 / 👍 / 👎 reaction lifecycle — **partially lost**. gh-aw shows status via the Actions UI and adds bot reactions on the triggering comment, but it is not exposing the granular 3-stage reaction handshake. Acceptable.
- The push-retry loop — gone. gh-aw writes go through the safe-outputs job which does not race against itself the same way.
- The Pages job — keep as a separate hand-written `pages.yml` (gh-aw doesn't replace this).

### 4.2 `lifecycle/router.ts`
**Disposition: deleted.**

372 lines of routing logic that translates `(event, comment, labels, config)` to a skill name disappears, because gh-aw lets each workflow file declare its own trigger. The `parseSlashCommand` function and `VALID_COMMANDS` set are replaced by `on.command:` per workflow.

The one piece worth porting: the **label-to-skill mapping** (`investigate`, `office-hours`, `design-consultation`) — these become `on.issues.types: [labeled]` + `labels:` filters in the respective workflow files.

`config.json` per-skill enable/disable becomes "delete the workflow file" or "rename `.md.disabled`". The `agentics-maintenance.yml` workflow that gh-aw ships supports `disable` / `enable` as `workflow_dispatch` operations, restoring this capability at the meta level.

### 4.3 `lifecycle/agent.ts`
**Disposition: deleted, except for two pieces.**

917 lines doing: gh event fetch → session resolve → prompt build → spawn `pi` → parse JSONL → comment post → git commit/push → reaction swap. gh-aw subsumes **all of it** through the compile pipeline (engine adapter + safe-outputs envelope + sanitization).

What we lose without a direct replacement:
- **Multi-turn session resume across runs.** No `--session <path>` equivalent. We have to either:
  - (a) accept stateless skills (gh-aw's normal mode — agents see the full thread on each run because comments are passed as context),
  - (b) implement memory via `cache-memory:` (a workflow-scoped file in a cache key — sufficient for `/learn`, `/health`, `/benchmark` tracking), or
  - (c) keep our own state directory and reference it from the markdown body. This works but is awkward — writing to it requires `safe-outputs.upload-artifact` rather than `git commit`.

What is worth porting into a tiny `lifecycle/helpers/` shared by the markdown bodies:
- `extractDiffStat()` style helpers — though gh-aw's `tools.github.toolsets: [pull_requests]` exposes diff data directly.
- The 60 000-character comment cap — gh-aw's `safe-outputs.add-comment` enforces a similar cap natively.

### 4.4 `lifecycle/browser.ts`
**Disposition: deleted.**

gh-aw supports Playwright as a first-class tool: `tools.playwright: { allowed-domains: […], version: "1.x" }`. The conditional install step in our YAML and the entire 434-line wrapper module are unnecessary. The 8 browser skills simply add `playwright:` to their `tools:` block.

### 4.5 `lifecycle/refresh.ts` + `run-refresh-gstack`
**Disposition: kept as-is, repurposed.**

gh-aw has no upstream-prompt-vendoring story. The pipeline that pulls from `garrytan/gstack`, removes `AskUserQuestion`, swaps the browse daemon for Playwright, stamps `<!-- GSTACK-INTELLIGENCE: GENERATED FILE -->`, and writes verified outputs is *our* differentiator and should stay.

Only the **output target changes**: instead of writing to `.github-gstack-intelligence/skills/<name>.md` (consumed by our `agent.ts`), it writes to `.github/workflows/<name>.md` with the appropriate gh-aw frontmatter prepended. The post-write validator (Python step) should be updated to recognise gh-aw frontmatter keys.

Practically, `refresh.ts` will need a **template-mapper**: each upstream gstack `<skill>.md` is rendered into a gh-aw workflow file by combining the gstack body with a hand-curated frontmatter template for that skill (capturing its trigger, safe-outputs, tools, roles). That template set is the new long-lived asset.

### 4.6 `lifecycle/agent.test.ts` / `router.test.ts` / `browser.test.ts`
**Disposition: deleted with the source they test.** Replaced by:
- `gh aw compile` exit code as the "lint" for every workflow.
- `gh aw compile --actionlint --zizmor --poutine` for security linting.
- `gh aw status` and `gh aw run --dry-run` for local smoke checks.

### 4.7 `config.json`
**Disposition: largely deleted, with one carve-out.**

- `defaults.provider` / `defaults.model` → moved into each workflow's `engine:` frontmatter. (Loss: no central place to swap model.)
- `defaults.maxCommentLength` → handled by `safe-outputs.add-comment.max-length` per workflow.
- `access.allowedPermissions` → `roles:` per workflow.
- `access.botLoopPrevention` → built-in.
- `access.prefixGating` / `prefixes` → `on.command:` per workflow.
- `skills.<name>.enabled` → presence/absence of the workflow file (or use `agentics-maintenance.yml`'s disable/enable).

**Carve-out:** central model selection is worth keeping. Implement as a tiny `imports:` snippet (`.github/workflows/_shared/engine.md`) that every workflow imports — change the model once, recompile all.

### 4.8 `.pi/settings.json`
**Disposition: deleted.** Provider/model now lives in `engine:` frontmatter. The corresponding stored memory ("`config.json.defaults` is not used for model selection") becomes obsolete and should be downvoted post-migration.

### 4.9 `state/` directory + memory log
**Disposition: re-modelled.**

- `state/sessions/*.jsonl` + `state/issues/<n>.json` — gone. gh-aw does not "resume" the way `pi --session` does. The agent re-derives context from the issue thread on each invocation. For skills where multi-run state is genuinely needed (e.g. `/learn` accumulating lessons), use `cache-memory:` or `safe-outputs.push-to-pull-request-branch` to write a `LESSONS.md`.
- `state/memory.log` (union-merge append-only) — port to `cache-memory:` with the same union-merge semantics, or convert to a committed `MEMORY.md` updated via `safe-outputs.create-pull-request`.
- `.gitattributes` union-merge entry — keep, in case we retain a `MEMORY.md`.

### 4.10 `run-install` (the self-installer)
**Disposition: replaced by `gh aw` CLI workflow.**

gh-aw's installation flow is: `gh extension install githubnext/gh-aw` then `gh aw add <package>/<workflow>`. To preserve our **"copy one YAML file and the agent appears"** ergonomic, we need a small **bootstrap workflow** that:

1. Installs the `gh-aw` extension on the runner.
2. Runs `gh aw add japer-technology/github-gstack-intelligence/<skills>` (assuming we publish ourselves as a gh-aw package — this is supported via `gh aw package` per upstream docs).
3. Commits the generated `.md` + `.lock.yml` files.

This is shorter than the current 250-line install job but **changes the UX**: the user must enable the `gh-aw` extension (or rely on `actions/setup-gh` + `gh extension install`). The "single secret + one file = working agent" promise weakens slightly; in exchange, every future upgrade is `gh aw upgrade` instead of a custom semver diff loop.

### 4.11 `run-gitpages`
**Disposition: keep as a standalone classic `.github/workflows/pages.yml`.** Out of scope for gh-aw.

### 4.12 Authorization + reactions
**Disposition: replaced.**

- The `gh api collaborators/<actor>/permission` shell → `roles: [admin, maintain, write]` in frontmatter.
- The 🚀 → 👍/👎 reaction lifecycle → gh-aw posts a status comment / reaction automatically. We lose the *exact* 3-state UX but gain it from the platform.
- The 👎-on-rejection unauthorized handling is built in.

### 4.13 Cost controls
The current workflow comment block calls out that **no rate limiting / model tiering is implemented (v1.0.5)**. gh-aw provides:
- `on.stop-after: 30d` budgets per workflow.
- `timeout-minutes:` per workflow.
- `safe-outputs.<type>.max:` to bound write fan-out.
- `cache-memory:` to dedupe (skip if we've already commented on this PR head SHA).
- Native concurrency groups (we have these too).

These directly address an acknowledged gap in our current README.

---

## 5. Skill-by-skill migration table

| Skill | New trigger (`on:`) | `safe-outputs` | `tools` notes |
|---|---|---|---|
| `review` | `pull_request.types: [opened, synchronize]` | `add-comment`, `create-pull-request-review-comment` | `github: { toolsets: [default, pull_requests] }`, `bash: [diff, grep, jq]` |
| `cso` | `pull_request` + `labels: [security-audit]` | `add-comment`, `create-issue` (for follow-ups) | same as `review` + `web-fetch` for CVE lookups |
| `design-review` | `pull_request` + `labels: [design-review]` | `add-comment` | `playwright` |
| `qa` | `on.command: qa` | `add-comment`, `upload-artifact` (screenshots) | `playwright` |
| `qa-only` | `on.command: qa-only` | `add-comment` | `playwright` |
| `investigate` | `issues.types: [labeled]` + `labels: [investigate]` | `add-comment` | `github`, `web-fetch` |
| `office-hours` | `issues.types: [labeled]` + `labels: [office-hours]` | `add-comment` | `github` |
| `design-consultation` | same with `[design-consultation]` | `add-comment` | `github` |
| `ship` | `on.command: ship` | `add-comment`, `create-pull-request` | `github`, `edit` |
| `autoplan` | `on.command: autoplan` | `add-comment`, `create-issue` (per stage) | chained — see §6.3 |
| `plan-{ceo,eng,design,devex}-review` | `on.command: plan-*-review` | `add-comment` | `github` |
| `retro` | `on.schedule: weekly on friday` | `create-discussion` | `github` |
| `benchmark` | `on.schedule: daily` | `create-issue` (regression only, `skip-if-match`) | `github`, `bash: [time, jq]` |
| `document-release` | `on.release.types: [published]` | `create-pull-request` (docs update) | `edit` |
| `canary` | `on.deployment_status` (state: success) | `add-comment`, `create-issue` (alert) | `playwright` |
| `careful` | `on.command: careful` | `add-comment` | `github` |
| `design-html` | `on.command: design-html` | `upload-artifact`, `add-comment` | `playwright`, `edit` |
| `design-shotgun` | `on.command: design-shotgun` | `upload-artifact`, `add-comment` | `playwright` |
| `devex-review` | `on.command: devex-review` | `add-comment` | `playwright` |
| `guard` | `on.command: guard` | `add-comment`, `add-labels` | `github` |
| `health` | `on.command: health` | `add-comment` | `github` |
| `land-and-deploy` | `on.command: land-and-deploy` | `add-comment`, `create-pull-request-review` | `playwright`, `github` |
| `learn` | `on.command: learn` | `create-pull-request` (`LESSONS.md`) | `edit`, `cache-memory` |

26 skills → 26 markdown files. Boilerplate can be reduced via `imports:` of a shared `_engine.md` and `_security.md`.

---

## 6. Cross-cutting issues

### 6.1 Multi-turn conversation continuity
This is the **biggest semantic loss**. Today, asking the same issue a follow-up
question resumes the pi session and the agent recalls the prior exchange in
detail. In gh-aw, the agent gets `${{ steps.sanitized.outputs.text }}` for the
new comment plus whatever the prompt body asks it to fetch (`github.issues.list-comments`).

Mitigations:
1. Always pass the **issue thread** in the prompt body via the `github` tool.
2. For skills where reasoning state matters (`/learn`, `/autoplan`), persist a
   structured artefact (`STATE.json`) via `safe-outputs.upload-artifact` or
   `create-pull-request`, and read it on the next run.
3. Use `cache-memory:` with the issue number as the cache key for skills where a
   transient hash-keyed cache is good enough.

This is a **real downgrade for chatty skills** (`/office-hours`,
`/design-consultation`). Document it as a known regression in any migration.

### 6.2 Provider-agnostic key passthrough
We currently pass seven LLM provider keys and let `pi` pick. gh-aw enforces
one `engine:` per workflow. To preserve user choice:

- Decide on a default at install (publish two flavours: `gstack-openai` and `gstack-claude`).
- Or use `engine: custom:` with a shell script that picks based on which secret
  is present — supported, but defeats the purpose of `gh-aw`'s validation.
- Or accept the trade and pick **one** engine. Cleanest, and aligned with
  gh-aw's philosophy.

### 6.3 `/autoplan` chaining (CEO → design → eng → DX)
Today, `/autoplan` runs 4 skills sequentially in one pi invocation. In gh-aw:

- Option A: one workflow with a long markdown body that runs all 4 prompts
  back-to-back in a single agent turn. Simple, but loses the per-stage review
  artefacts.
- Option B: chained workflows — `autoplan.md` emits `safe-outputs.create-issue`
  with label `plan-ceo`, which triggers `plan-ceo-review.md`, etc. This is the
  idiomatic gh-aw pattern (workflow dispatch via labels).

Option B preserves auditability and matches the platform's grain.

### 6.4 The 60 000-char comment cap
Native `safe-outputs.add-comment.max-length` (or similar) covers this. Skills
that exceed it today should be re-engineered to emit a short comment +
`upload-artifact` for the long form. This is a *good* forced refactor.

### 6.5 Bot-loop prevention
Our `AGENT_SIGNATURE` HTML comment + router check → built-in to gh-aw.
**Verify** that gh-aw's filter triggers on the same bot identity our workflow runs as
(`github-actions[bot]`); if we change identity (e.g. PAT), we must reconfirm.

### 6.6 The `garrytan/gstack` refresh pipeline (our differentiator)
Worth preserving as-is. Only `refresh.ts`'s **output stage** changes: it must
now emit gh-aw-flavoured markdown (with frontmatter), not raw skill bodies.

Concretely: maintain `.github-gstack-intelligence/templates/<skill>.frontmatter.yml`
files. `refresh.ts` reads the upstream `garrytan/gstack/<skill>.md`, applies the
existing sanitisations (drop `AskUserQuestion`, swap browse daemon → Playwright),
concatenates `templates/<skill>.frontmatter.yml` + body, and writes
`.github/workflows/<skill>.md`. Then runs `gh aw compile` to regenerate
`.lock.yml` files, and commits both.

### 6.7 The semver self-upgrade dance
Becomes `gh aw upgrade` (provided by the upstream `agentics-maintenance.yml`).
Our 3-category file overlay (ALWAYS / NEVER / DEFAULT) is no longer needed
because (a) `config.json`, `.pi/settings.json`, `AGENTS.md`, `state/` no longer
exist, and (b) workflow files are themselves the unit of versioning — users
edit the markdown body, the lock file is regenerated.

`AGENTS.md` (the agent identity) lives on as a top-level `AGENTS.md` referenced
from each workflow body via `imports: [../AGENTS.md]`.

### 6.8 Public-site / GitHub Pages
Untouched. Move `run-gitpages` into its own `pages.yml` classic workflow.

### 6.9 Documentation surface
- `.github-gstack-intelligence/help/README.md` (slash command source-of-truth per stored memory) — keep, but mark each command's "implementation" as `.github/workflows/<skill>.md` instead of `skills/<skill>.md`.
- `README.md`, `PACKAGES.md`, `ETHOS.md` — minor edits.
- Comment-block disclaimers in `.github/workflows/github-gstack-intelligence-agent.yml` — re-home into a top-level `INSTALL.md` (the YAML file is gone).

---

## 7. Migration strategy

Three viable paths, in increasing order of fidelity:

### Path A — Co-existence pilot (low risk, 1–2 sprints)
1. Leave the existing workflow untouched.
2. Pick **one well-bounded skill** (`/review` is ideal — single trigger, single output, no session state) and re-implement it as `.github/workflows/review-gh-aw.md`.
3. In `config.json`, set `skills.review.enabled: false` so the old path stops handling PR reviews.
4. Measure: latency, cost, quality, false-positive rate vs the old `/review`.
5. Decide whether to continue.

Pros: zero blast radius, fast feedback. Cons: doubles operational surface during the pilot.

### Path B — Skill-by-skill strangler (recommended, 4–6 sprints)
1. Pilot `/review` as above.
2. Add gh-aw workflows for the remaining 25 skills in priority order
   (pull_request → command → schedule → label → release/deployment).
3. As each one ships, flip `config.json.skills.<name>.enabled` to `false` in
   the old router so the old agent no-ops.
4. When all 26 are migrated, delete:
   - `.github/workflows/github-gstack-intelligence-agent.yml`
   - `.github-gstack-intelligence/lifecycle/{agent,router,browser}*.ts`
   - `.github-gstack-intelligence/config.json` (or shrink to just the refresh metadata)
   - `.github-gstack-intelligence/.pi/`
   - `.github-gstack-intelligence/state/` (with a one-time export to artefacts for any chatty skills that need history)
5. Repurpose `refresh.ts` to emit gh-aw workflow files (Section 6.6).
6. Add the gh-aw `agentics-maintenance.yml` for `disable` / `enable` / `upgrade` ops.
7. Add a small bootstrap workflow (Section 4.10) for installation parity.

Pros: every step is shippable; no big-bang. Cons: long; for several months users see two systems.

### Path C — Clean-slate rewrite (1–2 weeks, riskier)
1. Branch the repo. Delete `agent.ts`, `router.ts`, `browser.ts`,
   `config.json`, `state/`, `.pi/`, the big YAML.
2. Generate 26 workflow `.md` files from a template + the existing skill bodies.
3. Generate hand-curated frontmatter per skill (the table in §5 is the spec).
4. Update `refresh.ts` output target.
5. Ship as v2.0.0 — explicitly a breaking change.

Pros: smallest end-state, cleanest mental model, fastest end-to-end.
Cons: existing installations need a clean re-install; the chatty-skill regression hits everyone at once; less opportunity to learn before committing.

**Recommendation: Path B**, with the explicit caveat that the multi-turn session
loss (§6.1) be designed-for from the start — i.e. agree which skills are
"stateless OK" and which need a `cache-memory:` or artefact-based memory
shim — so we never ship a skill that *quietly* regresses on session continuity.

---

## 8. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Multi-turn skills regress on continuity | High | Medium-High | Audit per-skill in advance; use `cache-memory:` / artefact persistence for skills that need it; document the change. |
| Provider lock-in (one engine per workflow) | Certain | Medium | Pick one engine; publish parallel flavours if needed. |
| Loss of "single drop-in YAML" install UX | Certain | Low-Medium | Provide a bootstrap workflow + clear `gh extension install` docs. |
| `garrytan/gstack` refresh requires per-skill frontmatter templates we now own | Certain | Low | One-time cost; templates are short. |
| gh-aw is pre-1.0 and changing | High | Medium | Pin a gh-aw version; track upstream; the lock files insulate us from CLI changes. |
| Lock files inflate PRs | Certain | Low | Reviewers learn to ignore; can be gated by codeowners. |
| Lose the JSONL-in-git audit trail | Certain | Medium | gh-aw provides Actions logs; if stronger audit is needed, use `safe-outputs.upload-artifact` to dump per-run JSON. |
| Existing users on v1.0.5 face a breaking upgrade | Certain | Medium | Bump to v2.0.0; ship a migration script that runs once via `workflow_dispatch`. |
| Reaction lifecycle (🚀/👍/👎) UX regression | Likely | Low | Document; users see equivalent feedback via Actions UI + bot reactions. |
| The 4-hour timeout disappearance (gh-aw default 20m) | Likely | Low-Medium | Set `timeout-minutes:` explicitly per skill; revisit `/autoplan`'s chained model. |
| Security posture change (read-only by default) breaks a skill that secretly relied on `contents: write` | Medium | Medium | Manual audit per skill; safe-outputs typically covers the legitimate cases. |

---

## 9. What we gain (worth naming explicitly)

1. **Massively smaller code surface.** ~2 700 lines of TS + YAML → ~1 200 lines of markdown frontmatter + 1 small `refresh.ts`. Less to maintain, less to bug-fix, less to upgrade.
2. **Read-only-by-default security model.** Eliminates a class of supply-chain risks (an LLM hallucinating a `rm -rf` no longer has the permissions to act on it from the main job).
3. **Input sanitization for free.** Today, our prompts include raw issue bodies — a textbook prompt-injection vector. gh-aw's `${{ steps.sanitized.outputs.text }}` fixes this across all 26 skills in one move.
4. **Network egress allow-list.** Currently unconstrained; one of the easier wins.
5. **Tool allow-lists.** `bash: [cat, grep, jq]` instead of "whatever pi exposes".
6. **MCP server first-class support.** If/when we want to wire in GitHub MCP, Sentry MCP, etc., we declare them and gh-aw handles auth + sandboxing.
7. **Compile-time validation.** `gh aw compile --actionlint --zizmor --poutine` catches misconfigurations before they reach production.
8. **Reviewable codegen.** Lock files in PRs show exactly what changed.
9. **`agentics-maintenance.yml` for free.** Disable/enable/upgrade/replay capabilities we currently lack.
10. **Reduced cost-control gap.** `on.stop-after:` budgets, `safe-outputs.<x>.max:` caps, and `cache-memory:` dedup all address acknowledged gaps in our v1.0.5 README.

## 10. What we lose (worth naming explicitly)

1. **Multi-turn session resume** via `pi --session` — the single biggest behavioural regression.
2. **Multi-provider key passthrough** in one workflow.
3. **Single-file drop-in install** ergonomic.
4. **Git-committed JSONL transcripts** for auditing.
5. **3-state reaction handshake** UX.
6. **Tight control over the agent loop** in TS — gh-aw is more opinionated; if we ever need behaviour outside its model, we revert to `engine: custom:` (escape hatch but not pleasant).
7. **The 4-hour timeout** for genuinely long pipelines — must be re-justified per workflow.

---

## 11. Recommendation

Proceed with **Path B (skill-by-skill strangler)**, starting with `/review`.

Concretely, the first PR after agreeing this PIVOT should:

1. Add `.github/workflows/_shared/engine.md` (shared frontmatter snippet).
2. Add `.github/workflows/review.md` (gh-aw version of `/review`, importing the shared engine).
3. Flip `config.json.skills.review.enabled` to `false`.
4. Add a short note to `.github-gstack-intelligence/help/README.md` explaining that `/review` is now served by gh-aw.
5. Add a CI step to run `gh aw compile` and `gh aw compile --actionlint --zizmor --poutine` on PRs.

Each subsequent PR migrates one skill. The final PR deletes the old workflow,
`agent.ts`, `router.ts`, `browser.ts`, `config.json`, `.pi/`, and the bulk of
`state/`. v2.0.0 is cut at that point.

The `garrytan/gstack` refresh pipeline is preserved and re-targeted; it remains
the project's distinguishing asset.

---

## 12. Open questions for the maintainers

1. **Engine choice.** If we must pick one, is the default OpenAI (today's
   default per `.pi/settings.json` conventions) or Copilot (gh-aw's
   first-supported engine)?
2. **Session continuity.** Which skills are we comfortable making stateless?
   `/office-hours` and `/design-consultation` are the obvious risks.
3. **Installer UX.** Are we willing to ship a "two-step install" (extension +
   `gh aw add`) in exchange for the security wins? Or do we want to invest in a
   one-click bootstrap workflow that does both?
4. **Versioning.** Cut v2.0.0 at end of Path B, or earlier as a `2.0.0-beta`
   when the first skill ships in gh-aw mode?
5. **`refresh.ts` ownership.** If we now own per-skill frontmatter templates,
   does that template directory live in this repo, or in a new
   `japer-technology/gh-aw-templates` companion repo?
6. **Memory log.** Keep `MEMORY.md`-as-PR pattern, or fully delegate to
   `cache-memory:` per workflow?
7. **gh-aw version pin.** Pre-1.0; do we vendor a `.gh-aw-version` file and
   upgrade quarterly, or always-latest?

Answering these unblocks Path B's first PR.
