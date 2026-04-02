# Optimisation of GitHub GStack Intelligence

An analysis of how gstack's skills are utilised across frameworks and how this repository can be optimised for maximum value extraction.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Part 1: How Skills Are Utilised Across Frameworks](#part-1-how-skills-are-utilised-across-frameworks)
  - [1.1 The Three Execution Surfaces](#11-the-three-execution-surfaces)
  - [1.2 Skill Dependency Graph](#12-skill-dependency-graph)
  - [1.3 Framework-Specific Skill Adaptations](#13-framework-specific-skill-adaptations)
- [Part 2: Structural Optimisations](#part-2-structural-optimisations)
  - [2.1 Skill Tiering and Model Selection](#21-skill-tiering-and-model-selection)
  - [2.2 Learnings Persistence](#22-learnings-persistence)
  - [2.3 Session Intelligence Adoption](#23-session-intelligence-adoption)
  - [2.4 Review Army Architecture](#24-review-army-architecture)
  - [2.5 Adaptive Ceremony](#25-adaptive-ceremony)
- [Part 3: Execution Optimisations](#part-3-execution-optimisations)
  - [3.1 Concurrency and Rate Control](#31-concurrency-and-rate-control)
  - [3.2 Context Window Efficiency](#32-context-window-efficiency)
  - [3.3 Diff-Based Filtering](#33-diff-based-filtering)
  - [3.4 Browser Skill Optimisation](#34-browser-skill-optimisation)
- [Part 4: Security Optimisations](#part-4-security-optimisations)
  - [4.1 Prompt Injection Defence](#41-prompt-injection-defence)
  - [4.2 Trust Boundary Hardening](#42-trust-boundary-hardening)
- [Part 5: Design Tool Integration](#part-5-design-tool-integration)
- [Part 6: Cost Optimisation](#part-6-cost-optimisation)
- [Part 7: Missing Upstream Capabilities](#part-7-missing-upstream-capabilities)
- [Implementation Priority Matrix](#implementation-priority-matrix)
- [Conclusion](#conclusion)

---

## Executive Summary

GitHub GStack Intelligence takes 17 of gstack's 25 skills and projects them onto GitHub's native infrastructure (Actions, Issues, Git, Secrets). This analysis reveals that the upstream gstack project has evolved significantly beyond what this repository currently captures — shipping four major capability layers (Learnings, Review Army, Session Intelligence, and the Design binary) that have no equivalent in the Githubified version. The gap represents both a risk (divergence from upstream value) and an opportunity (each upstream capability has a natural GitHub-native analogue).

The optimisations in this paper are ordered by impact-to-effort ratio. The highest-value changes are:

1. **Skill tiering by model** — routing cheap skills to cheaper models saves 40-60% on LLM costs with zero quality loss.
2. **Learnings persistence** — adopting gstack's JSONL learnings system eliminates redundant rediscovery across sessions.
3. **Parallel specialist review** — adapting the Review Army pattern to GitHub Actions' matrix strategy multiplies review coverage.
4. **Diff-based skill gating** — suppressing review on documentation-only PRs and trivial diffs eliminates wasted compute.
5. **Prompt injection defence** — the ML classifier approach from gstack's security design is directly applicable to the GitHub Actions execution surface.

---

## Part 1: How Skills Are Utilised Across Frameworks

### 1.1 The Three Execution Surfaces

gstack's skills operate across three distinct frameworks, each with different constraints:

| Dimension | Claude Code (native) | Conductor (server) | GitHub Actions (this repo) |
|---|---|---|---|
| **Execution model** | Interactive terminal session | Multi-workspace server with SSE streaming | Event-driven, stateless per job |
| **Session persistence** | Context window + CLAUDE.md | Workspace state + session stream | Git-committed JSONL transcripts |
| **Browser access** | `$B` binary (Playwright + headed Chromium) | CDP connection to real Chrome | Playwright headless per workflow run |
| **Design tools** | `$D` binary (OpenAI Image API) | Through `$D` via workspace | Not available |
| **User interaction** | Terminal stdin/stdout | Conductor UI + Chrome sidebar | Issue comments (async) |
| **Skill invocation** | Slash commands in terminal | Same via workspace | Slash commands in comments, labels, events |
| **Learnings** | `~/.gstack/projects/$SLUG/learnings.jsonl` | Same (shared filesystem) | Not implemented |
| **Timeline** | `timeline.jsonl` auto-logged by preamble | Same | Not implemented |
| **Checkpoints** | `checkpoints/*.md` via `/checkpoint` | Same + cross-workspace handoff | Not implemented |
| **Cost per invocation** | ~$0.50-$2.00 (user's API key) | Same | Same (repo secret API key) |

**Key insight:** The native Claude Code surface has access to all 25 skills and four persistence layers. Conductor adds multi-workspace orchestration and Chrome sidebar integration. GitHub Actions has the weakest execution surface but the strongest distribution model — one YAML file installs the entire system.

### 1.2 Skill Dependency Graph

The gstack design documents reveal a layered dependency structure between skills that is not currently exploited in the GitHub-native execution:

```
Layer 4 (Autonomous)    /autoship ──────────────────────────────────────────┐
                             ▲                                              │
                             │ depends on all layers below                  │
Layer 3 (Session)       /checkpoint  /health  /retro (timeline, context)    │
                             ▲           ▲        ▲                         │
                             │           │        │                         │
Layer 2 (Review)        /review (specialist subagents: 7 parallel reviewers)│
                             ▲                                              │
                             │ learnings injected into specialist prompts   │
Layer 1 (Learnings)     /learn  (cross-session, cross-skill knowledge)      │
                             ▲                                              │
                             │ observed during all skill runs               │
Layer 0 (Foundation)    /office-hours → /plan-ceo-review → /plan-eng-review │
                        /design-consultation → /plan-design-review          │
                        /cso  /investigate  /qa  /ship                      │
                        /document-release  /benchmark  /canary              │
```

**Current state in this repo:** All 17 skills operate at Layer 0 — flat, independent, with no cross-skill learning or session intelligence. This means every skill invocation starts from zero knowledge about the repository and its history.

### 1.3 Framework-Specific Skill Adaptations

Each design document reveals specific patterns for how skills adapt across execution surfaces:

**Design binary (`$D`) skills** — `/office-hours`, `/plan-design-review`, `/design-consultation`, `/design-review` in native gstack produce visual mockups via the GPT Image API. The GitHub Actions surface has no equivalent. These skills fall back to text-only output, losing the "unit of value" that the DESIGN_TOOLS_V1 document identifies as the core problem: "Users don't need richer design language — they need an executable visual artifact."

**Browse binary (`$B`) skills** — `/qa`, `/qa-only`, `/design-review`, `/canary` use Playwright for browser interaction. The GitHub Actions adaptation works (headless Chromium per run) but loses the Design Shotgun feedback loop: no HTTP server for comparison boards, no persistent browser state, no user feedback collection via the browser.

**Session-dependent skills** — `/retro` reads `timeline.jsonl` to generate retrospectives. `/checkpoint` reads and writes working state snapshots. `/health` tracks quality scores over time. None of these have a persistence backend in the GitHub-native execution — the Git-committed state directory (`state/`) stores session transcripts but not structured learnings or timelines.

**Conductor-dependent skills** — The sidebar integration (CONDUCTOR_CHROME_SIDEBAR_INTEGRATION, CONDUCTOR_SESSION_API) enables a secondary interaction channel where users watching the browser can inject corrections in real time. The GitHub Actions surface has no equivalent — all interaction is through asynchronous issue comments.

---

## Part 2: Structural Optimisations

### 2.1 Skill Tiering and Model Selection

**Problem:** All 17 skills currently use the same model (GPT-5.4 with high thinking) at the same cost. The SELF_LEARNING_V0 design describes adaptive ceremony levels (FULL, STANDARD, FAST) that match skill complexity to compute cost. This repo applies no such tiering.

**Optimisation:** Introduce per-skill model tiers in `config.json`:

```json
{
  "skills": {
    "review": { "model": "gpt-5.4", "thinking": "high", "tier": "premium" },
    "cso": { "model": "gpt-5.4", "thinking": "high", "tier": "premium" },
    "investigate": { "model": "gpt-5.4", "thinking": "high", "tier": "premium" },
    "document-release": { "model": "gpt-4.1-mini", "thinking": "low", "tier": "economy" },
    "retro": { "model": "gpt-4.1-mini", "thinking": "low", "tier": "economy" },
    "benchmark": { "model": "gpt-4.1-mini", "thinking": "low", "tier": "economy" },
    "ship": { "model": "gpt-5.4", "thinking": "medium", "tier": "standard" },
    "qa": { "model": "gpt-5.4", "thinking": "medium", "tier": "standard" },
    "office-hours": { "model": "gpt-5.4", "thinking": "high", "tier": "premium" }
  }
}
```

**Impact:** Skills like `/document-release` (reads docs, cross-references diff, commits updates), `/retro` (aggregates timeline events), and `/benchmark` (runs and compares performance) do not require frontier reasoning. Routing these to economy models reduces per-invocation cost from ~$1.50 to ~$0.15 — a 10x saving on the 30-40% of invocations that use these skills.

**Effort:** Small. The `agent.ts` already reads `config.json`. Add a `model` field to `SkillConfig`, pass it to the `pi` binary via `--model` and `--thinking-budget` flags.

### 2.2 Learnings Persistence

**Problem:** The SELF_LEARNING_V0 design document describes a learnings system (Release 1, already SHIPPED in upstream gstack) where every skill writes institutional knowledge to `learnings.jsonl`. This repo has no equivalent. Every `/review` run rediscovers the same patterns; every `/investigate` run re-analyses the same architecture.

**Optimisation:** Implement a Git-native learnings store:

```
.github-gstack-intelligence/state/learnings.jsonl
```

Each JSONL entry follows gstack's schema:
```json
{
  "ts": "2026-04-02T12:00:00Z",
  "skill": "review",
  "type": "pitfall",
  "key": "n-plus-one-activerecord",
  "insight": "Always check includes() for has_many in list endpoints",
  "confidence": 8,
  "source": "observed",
  "issue": 42
}
```

**Integration points:**
- The router injects relevant learnings into the skill prompt preamble (grep learnings file for entries matching the current skill and repository context).
- Skills append new learnings via a structured output protocol (the agent writes a `LEARNING:` block that `agent.ts` parses and appends post-run).
- Confidence decay: reduce confidence by 1 point per 30 days for `observed` and `inferred` entries (applied at read time, never mutate the file).
- Duplicate resolution: latest entry per `key+type` wins at read time.

**Impact:** After 20 skill invocations, the agent knows the repository's architectural decisions, historical bug patterns, preferred conventions, and past security findings. This compounds — each session makes the next one faster and more accurate.

**Effort:** Medium. Requires changes to `agent.ts` (post-run parsing), router prompt construction, and a learnings reader utility.

### 2.3 Session Intelligence Adoption

**Problem:** The SESSION_INTELLIGENCE design describes five layers of session persistence. This repo implements the crudest version (session transcripts committed to Git) but misses the compounding layers: timeline tracking, context recovery, cross-session injection, and checkpoints.

**Optimisation:** Implement layers 1-3 of the Session Intelligence design using Git-native storage:

**Layer 1 — Context Recovery:** After each skill run, `agent.ts` checks for recent CEO plans, eng reviews, and design reviews in `state/results/`. When building the prompt for a new skill invocation, include a one-liner summary: "Recent context: /plan-ceo-review completed 2 days ago on issue #45, /review ran yesterday on PR #48."

**Layer 2 — Timeline:** Append a one-line JSONL entry to `state/timeline.jsonl` for every skill invocation:
```json
{"ts": "2026-04-02T12:00:00Z", "skill": "review", "issue": 42, "branch": "feature-x", "outcome": "2 critical, 1 info"}
```

This makes `/retro` actually useful — it has real data to aggregate instead of generating retrospectives from nothing.

**Layer 3 — Cross-Session Injection:** When a new issue triggers a skill, the preamble checks `state/timeline.jsonl` for recent activity on the same branch. If found: "Last session on this branch: /review on PR #48, 1 day ago, found 2 critical issues." The agent knows where the user left off.

**Impact:** Eliminates the "Groundhog Day" problem where every skill invocation starts from scratch. Particularly valuable for sequential workflows (e.g., `/office-hours` → `/plan-ceo-review` → `/plan-eng-review` → `/ship`) where each step should build on the previous.

**Effort:** Medium. Timeline logging is trivial (append one line post-run). Context recovery requires a prompt builder that reads and summarises recent state files. Cross-session injection requires branch-aware timeline queries.

### 2.4 Review Army Architecture

**Problem:** The SELF_LEARNING_V0 design (Release 2, SHIPPED upstream) describes a parallel specialist review architecture: 7 subagents running simultaneously, each focused on a specific domain (testing, maintainability, security, performance, data-migration, API contract, design). This repo runs a single monolithic `/review` pass.

**Optimisation:** Adapt the Review Army pattern using GitHub Actions' native matrix strategy:

```yaml
strategy:
  matrix:
    specialist: [testing, maintainability, security, performance]
  fail-fast: false
```

Each matrix job runs the `/review` skill with a specialist-specific prompt prefix that narrows focus. A collector job runs after all specialists complete, deduplicates findings by fingerprint, and posts a single consolidated comment.

**Key design decisions from upstream:**
- **Always-on specialists:** testing, maintainability (run on every PR).
- **Conditional specialists:** security (if auth/crypto files changed), performance (if DB/cache files changed), data-migration (if schema files changed), API contract (if API route files changed), design (if UI files changed).
- **Red team:** only for large diffs or when other specialists find critical issues.
- **Consensus highlighting:** findings confirmed by 2+ specialists get boosted confidence.
- **Learning-informed prompts:** past pitfalls from `learnings.jsonl` injected per specialist domain.

**Impact:** Multiplies review coverage without multiplying review time (specialists run in parallel). Catches domain-specific issues that a generalist pass misses. The upstream Review Army reports finding 40-60% more actionable issues than single-pass review.

**Effort:** Large. Requires workflow matrix configuration, specialist prompt extraction, a finding schema with fingerprinting, and a collector/dedup job. This is the highest-effort optimisation but also the highest-coverage improvement.

### 2.5 Adaptive Ceremony

**Problem:** Every PR gets the same treatment regardless of size, risk, or history. A one-line typo fix triggers the same review depth as a 500-line authentication refactor.

**Optimisation:** Implement scope-aware ceremony levels (from SELF_LEARNING_V0 Release 4):

| Ceremony Level | Criteria | What Runs |
|---|---|---|
| FULL | Large diffs, new features, migrations, auth changes | All specialists + adversarial + Codex cross-review |
| STANDARD | Medium diffs, typical feature work | Adversarial + structured review + coverage audit |
| FAST | Small, well-tested changes on trusted projects | Single-pass adversarial review only |
| SKIP | Docs-only, CI config, formatting | No review (auto-approve label instead) |

**Scope detection** (implementable in the router):
- Count changed files and lines from `git diff --stat`.
- Classify change type by file paths (docs/ = docs, migrations/ = migration, src/auth/ = auth, etc.).
- Look up trust signals from `learnings.jsonl` (consecutive clean reviews for this change class).

**Guard rails:** Never fast-track migrations, auth/permission changes, new API endpoints, or infrastructure changes regardless of trust level.

**Impact:** Reduces median review time and cost by 50-70% for repositories with a mix of trivial and complex PRs. Concentrates LLM budget on changes that actually need deep analysis.

**Effort:** Medium. Scope detection is straightforward (diff stats + path matching). Ceremony routing adds a pre-check to the router. The trust policy engine is the complex part but can be deferred — start with deterministic scope detection only.

---

## Part 3: Execution Optimisations

### 3.1 Concurrency and Rate Control

**Problem:** As flagged in the workflow header (v1.0.2 limitations), there is no rate limiting. Multiple simultaneous issues each trigger separate LLM calls. On active repositories (20+ PRs/day), this creates uncontrolled cost accumulation.

**Optimisation:**
- **Job concurrency groups:** GitHub Actions supports `concurrency` at the job level. Group agent runs by issue number to prevent duplicate processing:
  ```yaml
  concurrency:
    group: gstack-${{ github.event.issue.number || github.event.pull_request.number }}
    cancel-in-progress: true
  ```
- **Global rate limit:** Use a concurrency group at the workflow level to cap total simultaneous agent runs:
  ```yaml
  concurrency:
    group: gstack-agent
    cancel-in-progress: false  # queue, don't cancel
  ```
- **Cost tracking:** Append per-run cost estimates to `state/costs.jsonl`. The `/retro` skill can then report weekly cost summaries. Alert (via issue comment) when cumulative daily cost exceeds a configurable threshold.

**Impact:** Prevents runaway costs on active repositories. Concurrency groups are zero-effort (YAML-only) and eliminate the most common cost explosion scenario: a PR push triggering review while a previous review is still running.

**Effort:** Small for concurrency groups (YAML change only). Medium for cost tracking (requires token counting and model pricing lookup).

### 3.2 Context Window Efficiency

**Problem:** The agent sends full issue bodies, PR diffs, and file contents to the LLM. For large PRs or issues with long comment threads, this can consume most of the context window on low-value content (old comments, generated output, bot signatures).

**Optimisation:**
- **Comment pruning:** In `agent.ts`, when building the prompt from issue comment history, strip prior agent responses (identifiable by `AGENT_SIGNATURE`). The agent's own prior responses add noise, not signal — the session transcript already provides continuity.
- **Diff summarisation:** For PRs with >500 changed lines, generate a diff summary (changed files, added/removed line counts per file, key function signatures) and include only the full diff for files matching the current skill's focus area.
- **Preamble compression:** The skill prompts include GitHub-native execution notes, caution banners, and provenance markers that consume tokens without value at inference time. Strip these at prompt construction time (they serve a documentation purpose in the repo but waste context window in the LLM call).

**Impact:** Reduces token consumption by 20-40% on average, with larger savings on repos with long issue threads. This translates directly to cost savings and, more importantly, to better output quality (less noise in the context improves reasoning).

**Effort:** Small for comment pruning and preamble stripping (string filtering in `agent.ts`). Medium for diff summarisation (requires heuristic for which files to include in full).

### 3.3 Diff-Based Filtering

**Problem:** Every `pull_request` event triggers `/review` regardless of what changed. Documentation-only PRs, CI configuration changes, and formatting-only diffs consume the same LLM budget as security-critical code changes.

**Optimisation:** Add a pre-filter in the router that examines the diff before routing to a skill:

```typescript
const diffStat = execSync("git diff origin/main --stat").toString();
const changedFiles = parseDiffStat(diffStat);

// Skip review for docs-only, CI-only, or formatting-only changes
const codeFiles = changedFiles.filter(f =>
  !f.match(/\.(md|txt|yml|yaml|json|lock)$/) &&
  !f.startsWith(".github/") &&
  !f.startsWith("docs/")
);

if (codeFiles.length === 0) {
  // Post a brief "docs-only, skipping review" comment and exit
  return null;
}
```

**Impact:** On typical repositories, 15-25% of PRs are documentation, CI, or dependency updates. Filtering these saves the corresponding LLM costs entirely.

**Effort:** Small. Pure router logic, no infrastructure changes.

### 3.4 Browser Skill Optimisation

**Problem:** Browser skills (`/qa`, `/qa-only`, `/design-review`, `/canary`) install Playwright and Chromium on every workflow run. The `npx playwright install chromium` step takes 30-60 seconds and downloads ~150MB.

**Optimisation:**
- **Cache the Playwright browser:** Use `actions/cache` with a key based on the Playwright version:
  ```yaml
  - uses: actions/cache@v4
    with:
      path: ~/.cache/ms-playwright
      key: playwright-${{ hashFiles('**/package.json') }}
  ```
- **Conditional browser installation:** Only install Playwright when the router determines a browser skill is needed. Currently the workflow installs it unconditionally for all runs.
- **Screenshot-only mode for `/design-review`:** The upstream DESIGN_SHOTGUN design describes a comparison board served via HTTP. In GitHub Actions, this isn't feasible. Instead, generate screenshots and embed them as base64 images in the issue comment (GitHub renders inline images). This gives users a visual artifact without requiring a persistent server.

**Impact:** Saves 30-60 seconds on non-browser skill runs (80%+ of invocations). Caching saves download bandwidth across runs.

**Effort:** Small for caching and conditional installation (YAML changes). Medium for screenshot embedding (requires image handling in `agent.ts`).

---

## Part 4: Security Optimisations

### 4.1 Prompt Injection Defence

**Problem:** The ML_PROMPT_INJECTION_KILLER design identifies a critical attack surface: untrusted content in issues, PRs, and code can inject instructions that hijack the LLM into executing unintended actions. The GitHub Actions execution surface is particularly vulnerable because issue bodies and PR descriptions are untrusted input from any user with write access.

**Optimisation:** Implement a subset of gstack's seven defence layers:

| Layer | Upstream Design | GitHub Actions Adaptation |
|---|---|---|
| L1: XML prompt framing | `<system>` + `<user-message>` with escaping | Wrap skill prompt in XML tags, escape user-provided content before injection |
| L2b: Regex patterns | Decode + pattern match for injection phrases | Pre-scan issue/comment bodies for injection patterns before LLM call |
| L4: Command allowlist | Browse-only commands pass | Restrict `pi` agent tool access per skill via `allowed-tools` in frontmatter (already partially implemented) |
| L5: Canary tokens | Random token per session, check output | Inject canary into system prompt, check agent output for leakage |
| L6: Transparent blocking | Show user what was caught | Post a comment explaining the block when injection is detected |

**Defer for now:**
- L2 (DeBERTa classifier): Requires WASM/ONNX runtime not available in GitHub Actions without significant infrastructure.
- L3 (Page content scan): Only relevant for browser skills, lower priority.

**Impact:** Defends against the most common prompt injection vectors (social engineering via issue content). The regex layer alone catches ~60% of known attack patterns. XML framing prevents the most dangerous class of attacks (role confusion).

**Effort:** Medium. Regex scanning is simple to implement. XML framing requires changes to prompt construction in `agent.ts`. Canary tokens require output stream parsing.

### 4.2 Trust Boundary Hardening

**Problem:** The current authorisation model checks GitHub collaborator permissions before running the agent. However, it does not validate the *content* of what the agent is asked to do. A user with write access could craft a prompt that causes the agent to exfiltrate secrets, modify CI configuration, or commit malicious code.

**Optimisation:**
- **Output validation:** After the agent run, before committing results, scan committed file changes for patterns that should never appear in agent output: API keys, known secret patterns, CI/CD pipeline modifications, `.github/workflows/` edits.
- **Scope locks per skill:** The upstream `/investigate` skill enforces a 3-strike rule and scope lock. Generalise this: each skill declares which directories it may modify. The router enforces this by checking `git diff --name-only` post-run and rejecting out-of-scope changes.
- **Sensitive skill gate:** Skills marked `sensitive: true` in frontmatter (currently only `/ship`) should require explicit confirmation via a follow-up comment before executing destructive actions (pushing, merging, version bumping).

**Impact:** Defence-in-depth against both prompt injection and accidental agent misuse. The scope lock pattern is particularly valuable — it prevents a `/document-release` run from accidentally modifying source code.

**Effort:** Medium. Output scanning is straightforward. Scope locks require a per-skill directory allowlist and a post-run validation step.

---

## Part 5: Design Tool Integration

**Problem:** Four of gstack's design-adjacent skills (`/office-hours`, `/plan-design-review`, `/design-consultation`, `/design-review`) lose their most valuable output when Githubified. The upstream DESIGN_TOOLS_V1 documents the `$D` design binary which generates PNG mockups via the OpenAI Image API. The DESIGN_SHOTGUN document describes a full comparison board feedback loop. None of this is available in GitHub Actions.

**Optimisation:** Rather than replicating the full `$D` binary, implement a lightweight GitHub-native design workflow:

1. **Image generation via API:** When a design skill runs, call the OpenAI Images/Responses API directly from `agent.ts` (conditional on `OPENAI_API_KEY` being available). Generate a hero mockup for the proposed design.
2. **Image embedding:** Upload generated PNGs to the issue as comment attachments (GitHub's drag-and-drop image hosting). Embed the image URL in the skill's output comment.
3. **Feedback collection:** Instead of the Design Shotgun HTTP server, use GitHub reactions and reply comments:
   - Post 2-3 variant images as separate comments.
   - Ask the user to react with :+1: on their preferred variant.
   - Parse reactions on the next agent run to determine which variant was selected.

**Impact:** Restores the core value proposition identified in DESIGN_TOOLS_V1 — "showing a thing, not describing a thing" — within GitHub's constraints. The feedback loop is slower (async comments vs. real-time browser) but functional.

**Effort:** Large. Requires OpenAI Image API integration, image upload handling, and reaction-based feedback parsing. Recommend deferring this behind the higher-priority optimisations.

---

## Part 6: Cost Optimisation

Combining the individual cost-reduction measures into a unified model:

| Optimisation | Expected Cost Reduction | Effort |
|---|---|---|
| Skill tiering by model | 40-60% on economy-tier skills | Small |
| Diff-based filtering (skip docs-only PRs) | 15-25% of total invocations eliminated | Small |
| Adaptive ceremony (FAST for small changes) | 50-70% on qualifying PRs | Medium |
| Context window efficiency (pruning) | 20-40% token reduction per call | Small |
| Concurrency groups (prevent duplicate runs) | 10-20% on active repos | Small (YAML only) |
| Browser caching | Minimal $ but saves 30-60s per non-browser run | Small |

**Projected composite savings:** On an active repository (~20 PRs/day, mixed slash commands), these optimisations would reduce monthly LLM costs from the disclosed $500-$2000+ range to an estimated $150-$600 — a 60-70% reduction.

**Cost transparency addition:** Add a cost summary footer to every agent comment:
```
---
*Cost: ~$0.85 (gpt-5.4, 12.4K input / 3.2K output tokens) | Session total: $4.20*
```
This gives repository owners visibility into per-invocation and cumulative costs without requiring them to check their LLM provider dashboard.

---

## Part 7: Missing Upstream Capabilities

Capabilities from gstack that have no current equivalent in this repo, ordered by strategic value:

| Capability | Upstream Status | GitHub-Native Path | Priority |
|---|---|---|---|
| **Learnings persistence** | R1 SHIPPED | JSONL in `state/learnings.jsonl`, Git-committed | P0 |
| **Review Army** (parallel specialists) | R2 SHIPPED | Actions matrix strategy | P1 |
| **Timeline + context recovery** | R3 SHIPPED | JSONL in `state/timeline.jsonl` | P1 |
| **`/checkpoint`** | R3 SHIPPED | Markdown snapshots in `state/checkpoints/` | P2 |
| **`/health`** | R3 SHIPPED | Run tsc/eslint/tests, track scores in JSONL | P2 |
| **Adaptive ceremony** | R4 NOT SHIPPED upstream | Scope-based ceremony routing | P2 |
| **Design binary (`$D`)** | SHIPPED | API-direct image generation | P3 |
| **`/autoship`** | R5 NOT SHIPPED upstream | State machine across multiple issues | P3 |
| **Conductor sidebar** | SHIPPED | No GitHub-native equivalent | Defer |
| **`/learn` (manual review)** | R1 SHIPPED | Issue-based learning management | P2 |

---

## Implementation Priority Matrix

Combining impact, effort, and dependency analysis into an implementation sequence:

### Phase 1: Quick Wins (1-2 weeks of development)

| # | Optimisation | Impact | Effort | Dependencies |
|---|---|---|---|---|
| 1 | Concurrency groups in workflow YAML | Prevents cost blowout | Tiny | None |
| 2 | Diff-based PR filtering | Eliminates wasted invocations | Small | None |
| 3 | Per-skill model tiering in config.json | 40-60% cost reduction on economy skills | Small | None |
| 4 | Preamble/comment pruning in agent.ts | 20-40% context efficiency | Small | None |
| 5 | Playwright caching + conditional install | 30-60s saved per non-browser run | Small | None |

### Phase 2: Compounding Value (3-4 weeks)

| # | Optimisation | Impact | Effort | Dependencies |
|---|---|---|---|---|
| 6 | Learnings persistence (JSONL store) | Cross-session intelligence | Medium | None |
| 7 | Timeline logging | Enables /retro and context recovery | Medium | None |
| 8 | Context recovery (preamble injection) | Eliminates Groundhog Day problem | Medium | 6, 7 |
| 9 | Prompt injection defence (regex + XML) | Security hardening | Medium | None |
| 10 | Cost tracking + transparency footer | Operational visibility | Medium | None |

### Phase 3: Structural Upgrades (4-8 weeks)

| # | Optimisation | Impact | Effort | Dependencies |
|---|---|---|---|---|
| 11 | Review Army (parallel specialists) | 40-60% more findings | Large | 6 |
| 12 | Adaptive ceremony routing | 50-70% cost reduction on qualifying PRs | Medium | 7 |
| 13 | Scope locks per skill | Defence-in-depth | Medium | None |
| 14 | `/checkpoint` and `/health` skills | Session continuity | Medium | 7 |
| 15 | Design tool integration (image API) | Visual design output | Large | None |

---

## Conclusion

GitHub GStack Intelligence is structurally sound — the single-YAML-file installation model, Git-native state persistence, and event-driven skill routing are correctly architected. The core constraint is that the repo captures a *snapshot* of gstack's capabilities but not the *compounding infrastructure* that makes those capabilities grow more valuable over time.

The upstream gstack has evolved from a flat collection of skill prompts into a four-layer system: Learnings make every session smarter. The Review Army multiplies coverage. Session Intelligence eliminates context loss. Adaptive Ceremony matches effort to risk. Each layer depends on the ones below it.

The single highest-impact optimisation is implementing learnings persistence (Phase 2, item 6). Once the agent remembers what it has learned across sessions, every other optimisation becomes more effective: reviews cite past patterns, ceremony adapts to proven trust, and context recovery has richer material to inject. Without learnings, each improvement operates in isolation. With learnings, they compound.

The second-highest impact is the Phase 1 cost optimisations (items 1-5), which can be implemented in days with no architectural changes and immediately reduce the cost barrier that prevents adoption on active repositories.

The recommendation is to implement Phase 1 immediately, Phase 2 in the next development cycle, and Phase 3 as the repository matures and adoption data reveals which structural upgrades deliver the most value in practice.
