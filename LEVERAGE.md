# Leveraging GStack: How Skill Architecture Creates Compound Intelligence

**A technical analysis of how `github-gstack-intelligence` can leverage the upstream [gstack](https://github.com/garrytan/gstack) framework's skill designs, session intelligence, and tooling infrastructure to build a differentiated GitHub-native AI engineering platform.**

---

## 1. Executive Summary

The upstream [garrytan/gstack](https://github.com/garrytan/gstack) repository has evolved from a collection of Claude Code skill templates into a comprehensive AI engineering framework with four distinct innovation layers: **visual design generation**, **browser-agent feedback loops**, **ML-based security**, and **self-learning infrastructure**. Each of these layers is documented in dedicated design documents (`docs/designs/**`) and represents a significant engineering investment.

This paper analyzes how each upstream capability maps to `github-gstack-intelligence`'s GitHub-native architecture — where GitHub Issues are conversations, Git is memory, and GitHub Actions are the runtime — and identifies concrete leverage opportunities that would be impractical to build independently.

---

## 2. The Skill Taxonomy: How gstack Organizes Intelligence

GStack's 30+ skills are not a flat list. They form a **layered taxonomy** where upstream skills feed downstream skills, and session artifacts compound across invocations.

### 2.1 Skill Layers

| Layer | Skills | Purpose | Artifact |
|-------|--------|---------|----------|
| **Ideation** | `/office-hours`, `/design-consultation` | Generate ideas, design systems, product strategy | `DESIGN.md`, CEO plans |
| **Planning** | `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/autoplan` | Refine plans through multi-perspective review | Reviewed plan documents |
| **Execution** | `/ship`, `/investigate` | Build features, debug issues | Code changes, commits |
| **Quality** | `/review`, `/cso`, `/qa`, `/qa-only`, `/design-review` | Verify correctness, security, visual quality | Review findings, QA reports |
| **Operations** | `/canary`, `/benchmark`, `/retro`, `/document-release` | Monitor, measure, reflect, document | Health scores, retrospectives |
| **Meta** | `/checkpoint`, `/health`, `/learn` | Persist state, track quality, capture learnings | Checkpoints, learnings JSONL |

### 2.2 The Compounding Loop

The critical insight from gstack's design documents is that skills are not independent — they form a **compounding loop** where each invocation makes future invocations smarter:

```
  /office-hours  ──►  /autoplan  ──►  BUILD  ──►  /review  ──►  /ship
       │                  │                           │            │
       ▼                  ▼                           ▼            ▼
   DESIGN.md        CEO+Eng+Design              learnings     CHANGELOG
                    reviewed plan               .jsonl         VERSION
       │                  │                           │            │
       └──────────────────┴───────────────────────────┴────────────┘
                                    │
                              /retro reads all
                              /health scores all
                              next session inherits all
```

This is the architecture that `github-gstack-intelligence` can leverage — not just individual skills, but the **cross-skill intelligence substrate** that makes each one progressively better.

---

## 3. Design Document Analysis: What Each Design Enables

### 3.1 Self-Learning Infrastructure (SELF_LEARNING_V0.md)

**What it describes:** A 7-release roadmap from basic learnings persistence to fully autonomous feature shipping (`/autoship`). Four state systems — Learnings, Timeline, Checkpoints, Health — each stored as JSONL in a per-project directory.

**Leverage for github-gstack-intelligence:**

The self-learning infrastructure is the single highest-leverage design to adopt. Currently, `github-gstack-intelligence` persists results to `state/results/` as JSON files keyed by PR or issue number. This is equivalent to gstack's Release 1 ("GStack Learns") but without structured typing, confidence scoring, or cross-session injection.

| GStack Capability | Current State in This Repo | Leverage Opportunity |
|---|---|---|
| **Typed learnings** (pattern, pitfall, preference, architecture, tool) | Untyped result JSON | Adopt the learning schema — type, key, confidence, source — to `state/results/` |
| **Confidence decay** (1pt/30d for observed/inferred) | No decay | Add decay to stale results so old findings don't accumulate noise |
| **Cross-skill learnings** | Skills operate independently | When `/review` finds a pattern, `/qa` should know about it on the next run |
| **Timeline events** | Implicit in git history | Explicit `state/timeline.jsonl` with skill, branch, outcome per invocation |
| **Context recovery** | Session files in `state/sessions/` | On session resume, inject recent learnings and last checkpoint into prompt |
| **Health scoring** | No composite quality metric | Add `/health` equivalent using repo's existing linter/test infrastructure |
| **Adaptive ceremony** (Release 4) | All PRs get same review depth | Scope-aware review depth based on diff size, change class, and trust history |

**Concrete implementation path:**

1. Add `state/learnings.jsonl` — append-only, structured entries from `/review` and `/cso` findings
2. Modify `agent.ts` to inject recent learnings into skill prompts before LLM invocation
3. Add `state/timeline.jsonl` — one line per skill invocation with timestamp, skill, branch, outcome
4. Use timeline data to power `/retro` with actual cross-session history

**Why this matters:** Every other AI coding tool (Cursor, Windsurf, Copilot) starts fresh per session. GStack's self-learning infrastructure means the 20th review on the same codebase is categorically better than the 1st. This repo already has the persistence layer (Git) — it just needs the structured schema.

---

### 3.2 Session Intelligence (SESSION_INTELLIGENCE.md)

**What it describes:** Five layers of session intelligence — context recovery, session timeline, cross-session injection, checkpoints, and health scoring — designed to make skill-produced artifacts survive Claude's context window compaction.

**Leverage for github-gstack-intelligence:**

This design is directly applicable because `github-gstack-intelligence` faces the *same* compaction problem during long-running Actions workflows. When the pi agent's context fills up during a complex `/review` or `/qa` run, it loses the reasoning chain that informed earlier decisions.

| Session Intelligence Layer | GitHub-Native Adaptation |
|---|---|
| **Context Recovery** | On agent start, read `state/results/` for recent review/QA reports on the same PR/branch. Inject summary into prompt. |
| **Session Timeline** | Already partially implemented via `state/sessions/` — extend with structured event logging. |
| **Cross-Session Injection** | When resuming a conversation (issue → session mapping exists), inject a one-liner: "Last session found 3 issues, 2 fixed." |
| **Checkpoints** | Before long operations (e.g., `/qa` iterative fix loop), save working state to `state/checkpoints/`. If agent crashes mid-fix, next run resumes from checkpoint. |
| **Health Scoring** | Track composite quality scores per PR. `/retro` shows trends. `/ship` gates on threshold. |

**The key insight from this design:** "The missing piece is not storage. It's awareness." `github-gstack-intelligence` already stores everything in Git — session logs, results, state. What it lacks is the **preamble injection** that tells the agent "these files exist, read them, use them."

---

### 3.3 Visual Design Generation (DESIGN_TOOLS_V1.md)

**What it describes:** A compiled TypeScript binary (`$D`) that wraps OpenAI's image generation API to produce visual UI mockups. Skills that previously output text descriptions of design now produce actual PNG mockups.

**Leverage for github-gstack-intelligence:**

Visual design generation is transformative for the `/design-review` and `/design-consultation` skills, which currently operate purely on text and Playwright screenshots. The design binary pattern — a stateless CLI that the agent invokes via bash — maps cleanly to GitHub Actions execution.

| Design Binary Command | GitHub Actions Adaptation |
|---|---|
| `$D generate --brief "..." --output mockup.png` | Agent generates mockup during `/design-review`, attaches as PR comment image |
| `$D compare --images *.png --serve` | Comparison board served during QA; feedback collected via issue comment |
| `$D check --image mockup.png --brief "..."` | Vision-based quality gate before posting design review |
| `$D diff --before old.png --after new.png` | Visual regression detection: compare screenshots across commits |

**The comparison board pattern** (DESIGN_SHOTGUN.md) is especially interesting for github-gstack-intelligence. The browser-to-agent feedback loop — where the user interacts with an HTML page and the agent polls for structured feedback — could be adapted for GitHub-native interaction:

- Instead of serving a local HTTP page, generate a **GitHub Issue comment** with embedded mockup images and a structured feedback template
- The user replies with their selection (e.g., "Option B, make the header larger")
- The agent parses the reply and iterates

This replaces the real-time browser feedback loop with an asynchronous GitHub conversation loop — trading immediacy for auditability and accessibility (works from any device, no local setup).

**Progressive enhancement path:**

1. When `OPENAI_API_KEY` is available as a repo secret, `/design-consultation` and `/design-review` generate actual mockups
2. When unavailable, gracefully degrade to existing text + screenshot behavior
3. Mockups committed to `state/results/design-review/` with PR links for historical reference

---

### 3.4 ML Prompt Injection Defense (ML_PROMPT_INJECTION_KILLER.md)

**What it describes:** A 7-layer defense system against prompt injection attacks, centered on a DeBERTa-v3 classifier running via WASM for ~50-100ms inference. Includes encoding normalization (base64, URL, HTML entity decoding), regex pattern matching, canary tokens, and transparent blocking with user notification.

**Leverage for github-gstack-intelligence:**

Prompt injection is a critical concern for this repo because it processes **untrusted user input** (GitHub issue bodies and comments) and passes it directly to an LLM with code execution capabilities. The attack surface is:

```
Attacker opens issue with injection payload
    → router.ts parses title/body for slash commands
    → agent.ts passes body to pi agent as prompt
    → pi agent executes arbitrary bash, git, file operations
```

Currently, the only defenses are:
1. **Actor authorization** — only admin/maintain/write permissions can trigger agent
2. **Bot-loop prevention** — agent signature check prevents recursive invocation
3. **Prefix gating** — only messages starting with `/` trigger skill routing

**What gstack's defense design adds:**

| Defense Layer | Current State | Leverage Opportunity |
|---|---|---|
| **Input scanning** | None | Add DeBERTa classifier scan on issue body before LLM invocation |
| **Encoding normalization** | None | Decode base64/URL/HTML entities in input before scanning |
| **Regex patterns** | None | Pattern match for known injection phrases ("ignore previous instructions") |
| **Canary tokens** | None | Inject random token in system prompt; monitor output for leakage |
| **Output monitoring** | None | Scan agent output for canary leakage or suspicious URL patterns |
| **Attempt logging** | None | Log blocked attempts to `state/security/attempts.jsonl` |

**Implementation priority:** The regex pattern layer (L2b) and canary token layer (L5) are the highest-leverage, lowest-effort additions. The DeBERTa classifier (L2) requires model download in the GitHub Actions environment but provides quantitative detection confidence.

**Security architecture insight from the design:** "LLM-based guardrails cannot be the final line of defense. Need at least one deterministic enforcement layer." This validates the approach of adding regex + canary as deterministic layers alongside the LLM's own safety training.

---

### 3.5 Browser-Agent Feedback Loops (DESIGN_SHOTGUN.md + CONDUCTOR_CHROME_SIDEBAR_INTEGRATION.md)

**What it describes:** Two designs for bridging the gap between what the agent does and what the user sees. Design Shotgun creates an interactive HTML comparison board with structured feedback collection. The Conductor sidebar integration streams session events to a Chrome extension side panel.

**Leverage for github-gstack-intelligence:**

The browser-agent feedback loop pattern has a direct GitHub-native analog: **issue comment threads as structured feedback**.

| Browser Pattern | GitHub-Native Equivalent |
|---|---|
| Comparison board with radio buttons and star ratings | Issue comment with embedded images and markdown checklist |
| `POST /api/feedback` with JSON payload | User replies with structured comment; agent parses |
| Real-time SSE session streaming | GitHub Actions live log + periodic issue comment updates |
| Sidebar activity feed | Issue timeline (comments show agent progress) |

**The Conductor session streaming API** (`CONDUCTOR_SESSION_API.md`) proposes an SSE endpoint that re-emits the agent's conversation stream. For github-gstack-intelligence, the equivalent is already partially implemented:

- Agent output is streamed to GitHub Actions logs via `tee`
- Final results are posted as issue comments
- Session transcripts are committed to `state/sessions/`

What's missing is **mid-execution progress reporting** — the agent currently posts one final comment. Adopting the session streaming pattern would mean:

1. Post an initial "⏳ Working..." comment when the skill starts
2. Update it periodically with progress (e.g., "/review: analyzing diff... found 3 issues so far...")
3. Replace with the final result when complete

This dramatically improves the user experience for long-running skills like `/qa` (which can run for 10+ minutes) and `/autoplan` (which chains 3 review skills sequentially).

---

### 3.6 Chrome vs Chromium Architecture (CHROME_VS_CHROMIUM_EXPLORATION.md)

**What it describes:** The discovery that gstack's browser integration was using Playwright's bundled Chromium (not real Chrome) despite naming suggesting CDP connections. The cleanup simplified the codebase from two headed modes to one, deleted 361 lines of dead code, and converged on `launchPersistentContext()` for all headed browser operations.

**Leverage for github-gstack-intelligence:**

This design validates the architecture choice already made in `browser.ts` — using Playwright's headless Chromium in GitHub Actions with `--no-sandbox` flags. The key takeaway is:

- **Don't try to connect to real browsers.** The CDP connection approach was abandoned upstream.
- **Extensions are irrelevant in CI.** The entire sidebar/extension ecosystem is headed-mode-only and doesn't apply to headless Actions execution.
- **`launchPersistentContext()` is the stable API.** Use it when session persistence (cookies, localStorage) matters for QA testing.

The practical leverage is confidence: `github-gstack-intelligence`'s browser integration is already aligned with upstream's final architecture. No changes needed, but the headless-only constraint means the visual design tools (Section 3.3) should focus on image generation, not interactive browser-based feedback.

---

## 4. Cross-Cutting Leverage Opportunities

Beyond individual design documents, several cross-cutting patterns emerge:

### 4.1 The Review Army (Self-Learning Release 2)

GStack ships 7 parallel specialist subagents for code review: testing, maintainability, security, performance, data-migration, API contract, and design. Each produces JSON-structured findings with confidence scores and fingerprint-based dedup.

**Leverage path:** The current `/review` skill in `github-gstack-intelligence` runs a single-pass review. Adopting the specialist pattern means:

1. Running multiple focused review passes in parallel (GitHub Actions supports matrix strategies)
2. Each specialist produces findings scoped to its domain
3. Cross-specialist consensus boosts confidence on confirmed issues
4. Results feed back into learnings for adaptive specialist gating

This transforms `/review` from "one agent reads the diff" to "a team of specialists, each expert in their domain, reviews the diff in parallel."

### 4.2 Adaptive Ceremony (Self-Learning Release 4)

The ceremony level system — FULL, STANDARD, FAST — based on scope, trust, and change class is directly applicable to how `github-gstack-intelligence` handles PRs:

- **FULL ceremony** (all specialists + adversarial + coverage audit): large PRs, new features, migrations, auth changes
- **STANDARD ceremony** (adversarial + coverage audit): typical feature work
- **FAST ceremony** (adversarial only): small, well-tested changes on trusted projects

Currently, every PR gets the same review depth. Adaptive ceremony would:
1. Classify the PR's scope (TINY/SMALL/MEDIUM/LARGE based on diff stats)
2. Detect change class (docs, tests, config, frontend, backend, migrations, auth, infra)
3. Apply the appropriate ceremony level
4. Never fast-track: migrations, auth changes, new API endpoints, infrastructure changes

### 4.3 The /autoship Pipeline (Self-Learning Release 5)

The `/autoship` state machine — ideate → plan → build → health → review → QA → ship — represents the ultimate leverage opportunity. It chains every skill into an autonomous pipeline with a single approval gate.

For `github-gstack-intelligence`, this would mean:

1. User opens an issue describing a feature
2. Agent runs `/office-hours` to brainstorm approach
3. Agent runs `/autoplan` (CEO + eng + design review)
4. User approves the plan (single gate)
5. Agent builds the feature, creates a PR
6. Agent runs `/health` (quality gate)
7. Agent runs `/review` (code review)
8. Agent runs `/qa` (testing)
9. Agent runs `/ship` (merge + release)

Each phase writes to timeline, checkpoints auto-save, and compaction recovery reads the last checkpoint. This is the **North Star** — one issue comment describes a feature, and the fully reviewed, tested, documented implementation ships automatically.

### 4.4 Design-to-Code Pipeline

The design tools design document describes a complete loop: brainstorm → mockup → compare → approve → implement → verify. For `github-gstack-intelligence`:

1. `/office-hours` generates visual mockups alongside the design doc
2. `/plan-design-review` rates design dimensions and generates "what 10/10 looks like" mockups
3. `/design-review` compares approved mockups against live screenshots
4. `/design-consultation` produces DESIGN.md with visual previews

This closes the gap between "the agent described a design" and "the agent showed you the design." The comparison board pattern (adapted as GitHub issue comments with embedded images) makes design feedback as structured and auditable as code review.

---

## 5. Implementation Priorities

Based on leverage-to-effort ratio, here are the recommended priorities:

### Tier 1: Highest Leverage, Lowest Effort

| Opportunity | Effort | Impact |
|---|---|---|
| **Structured learnings** (`state/learnings.jsonl`) | Low — schema + append logic | Every session gets smarter |
| **Timeline events** (`state/timeline.jsonl`) | Low — one line per skill invocation | Enables `/retro`, trend tracking |
| **Context recovery preamble** | Low — inject recent results into prompt | Prevents redundant work |
| **Regex injection patterns** | Low — pattern match on input | Deterministic security layer |
| **Mid-execution progress comments** | Medium — periodic comment updates | Dramatically better UX |

### Tier 2: High Leverage, Medium Effort

| Opportunity | Effort | Impact |
|---|---|---|
| **Canary tokens** | Medium — inject/monitor per session | Detects prompt exfiltration |
| **Cross-skill learnings injection** | Medium — read learnings before each skill | Review findings inform QA |
| **Adaptive review depth** | Medium — scope classification + ceremony mapping | Right-sized reviews |
| **Health scoring** | Medium — wrap existing linter/test output | Quality trends |
| **Checkpoint persistence** | Medium — save/resume working state | Crash recovery |

### Tier 3: Transformative, Higher Effort

| Opportunity | Effort | Impact |
|---|---|---|
| **Visual mockup generation** | High — OpenAI API integration, image handling | Design becomes visual |
| **Specialist review army** | High — parallel agents, consensus logic | 10x review coverage |
| **DeBERTa classifier** | High — model download, WASM inference in CI | ML-powered security |
| **Autoship pipeline** | Very High — state machine, multi-phase orchestration | Autonomous feature delivery |

---

## 6. Differentiation Through Leverage

The upstream gstack framework is designed for **local Claude Code execution** — a developer running skills interactively on their machine. `github-gstack-intelligence` transforms this into **GitHub-native autonomous execution** — skills triggered by events, running in CI, with full auditability.

This architectural difference creates unique leverage:

| GStack Advantage | GitHub-Native Amplification |
|---|---|
| Learnings persist in `~/.gstack/` | Learnings persist in **Git** — versioned, shared, reviewable |
| Timeline is local JSONL | Timeline is **committed to the repo** — visible to entire team |
| Review findings posted to terminal | Review findings posted as **PR comments** — integrated with GitHub review flow |
| Health scores tracked locally | Health scores tracked **in repo history** — trend analysis via git log |
| Canary runs on user's machine | Canary runs in **CI on every deploy** — automated, consistent, no setup |
| Design mockups generated locally | Design mockups **committed and linked in PR comments** — part of the review record |

The fundamental leverage is this: gstack builds the **intelligence** — the skills, the learning infrastructure, the review army, the design tools, the security layers. `github-gstack-intelligence` provides the **platform** — persistent storage, event-driven execution, team visibility, and full auditability. Together, they create something neither could build alone: a **self-improving, team-aware AI engineering platform that runs entirely on GitHub**.

---

## 7. Conclusion

The gstack design documents reveal a framework that has evolved far beyond individual skill templates. The self-learning infrastructure (Releases 1-7) describes a path from "AI that forgets everything" to "AI that compounds institutional knowledge." The visual design tools close the gap between text descriptions and actual mockups. The ML security layer provides defense-in-depth against prompt injection. The browser-agent feedback loops create structured user interaction patterns.

For `github-gstack-intelligence`, the leverage opportunity is clear: adopt the **intelligence layer** (learnings, timeline, context recovery, health scoring) from upstream while building on the **platform advantages** (Git persistence, GitHub Actions execution, PR integration, team visibility) that are unique to this repo.

The highest-ROI path is:
1. **Structured learnings + timeline** — make every session smarter (Tier 1)
2. **Context recovery + injection** — don't repeat past work (Tier 1)
3. **Security hardening** — regex patterns + canary tokens (Tier 1)
4. **Adaptive ceremony** — right-sized reviews (Tier 2)
5. **Visual design generation** — show, don't tell (Tier 3)
6. **Autoship pipeline** — autonomous feature delivery (Tier 3)

Each tier builds on the previous one. Learnings make reviews better. Better reviews make adaptive ceremony possible. Adaptive ceremony makes autoship viable. The compounding effect is the point — and it's the same insight that makes gstack's skill architecture powerful in the first place.

---

*This analysis is based on the design documents at [`garrytan/gstack/docs/designs/`](https://github.com/garrytan/gstack/tree/main/docs/designs) and the current state of `github-gstack-intelligence`'s architecture as of April 2026.*
