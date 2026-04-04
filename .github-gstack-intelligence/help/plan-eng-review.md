# /plan-eng-review — Engineering Plan Review

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

> Engineering manager-mode review that locks in execution architecture, data flow, diagrams, edge cases, test coverage, and performance before any code is written. Walks through issues interactively with opinionated recommendations.

---

| Property | Value |
|---|---|
| **Trigger** | Comment `/plan-eng-review` on an issue. Also runs as part of `/autoplan`. |
| **Browser Required** | No |
| **Default State** | ✅ Enabled |
| **Results Path** | Review log at `.github-gstack-intelligence/state/results/review/review-log.json` |

---

## How to Use

1. Create or open an issue containing your plan (or reference a plan file on a branch).
2. Comment `/plan-eng-review` on the issue.
3. The skill runs a scope challenge first, then walks through each review section interactively.
4. Each issue is presented one at a time with options, a recommendation, and reasoning mapped to engineering preferences.

**Best for:** When you have a plan or design doc and are about to start coding — use this to catch architecture issues, missing edge cases, and gaps in test coverage before implementation.

---

## What It Does

### Engineering Preferences (guiding principles)

- **DRY is important** — repetition flagged aggressively.
- **Well-tested code is non-negotiable** — rather too many tests than too few.
- **"Engineered enough"** — not under-engineered (fragile) or over-engineered (premature abstraction).
- **More edge cases, not fewer** — thoughtfulness > speed.
- **Explicit over clever** — 10-line obvious fix > 200-line abstraction.
- **Minimal diff** — achieve the goal with fewest new abstractions and files touched.

### 15 Cognitive Patterns of Great Eng Managers

1. **State diagnosis** — Teams: falling behind, treading water, repaying debt, innovating (Larson)
2. **Blast radius instinct** — Worst case + how many systems affected
3. **Boring by default** — "Three innovation tokens" — everything else is proven tech (McKinley)
4. **Incremental over revolutionary** — Strangler fig, not big bang (Fowler)
5. **Systems over heroes** — Design for tired humans at 3am, not best engineer on best day
6. **Reversibility preference** — Feature flags, A/B tests, incremental rollouts
7. **Failure is information** — Blameless postmortems, error budgets, chaos engineering (Allspaw, Google SRE)
8. **Org structure IS architecture** — Conway's Law in practice (Team Topologies)
9. **DX is product quality** — Slow CI, bad local dev → worse software, higher attrition
10. **Essential vs accidental complexity** — "Is this solving a real problem or one we created?" (Brooks)
11. **Two-week smell test** — Can't ship a small feature in two weeks? Onboarding problem disguised as architecture
12. **Glue work awareness** — Recognize invisible coordination work (Reilly)
13. **Make the change easy, then make the easy change** — Refactor first, implement second (Beck)
14. **Own your code in production** — No wall between dev and ops (Majors)
15. **Error budgets over uptime targets** — SLO budget to spend on shipping (Google SRE)

### Review Flow

**Pre-review:**
- Design doc check — looks for existing design docs from `/office-hours`.
- Reads `CLAUDE.md`, `TODOS.md`, recent git history.
- Retrospective check for prior review cycles.
- Frontend/UI scope detection for design-related review.

**Step 0: Scope Challenge**
1. **Existing code leverage** — Maps sub-problems to existing code.
2. **Minimum change set** — Flags work that could be deferred.
3. **Complexity check** — 8+ files or 2+ new classes/services = smell.
4. **Search check** — Built-in alternatives, current best practices, known pitfalls.
5. **TODOS cross-reference** — Deferred items blocking or bundleable with this plan.
6. **Completeness check** — Shortcut vs complete version (AI-assisted coding makes completeness cheap).
7. **Distribution check** — New artifact types need build/publish pipelines.

If complexity check triggers, recommends scope reduction via interactive discussion.

**Review Sections (4 sections, interactive):**

| Section | Focus | Key outputs |
|---|---|---|
| **1. Architecture** | System design, dependency graph, data flow, scaling, security, production failure scenarios, distribution architecture | ASCII architecture diagram |
| **2. Code Quality** | DRY violations, module structure, error handling, edge cases, over/under-engineering, stale diagram audit | Concrete file/line references |
| **3. Test Review** | Test diagram of ALL new flows/codepaths/branches, gap analysis, failure path tests, pyramid check, flakiness risk, LLM eval requirements | Complete test coverage map |
| **4. Performance** | N+1 queries, memory usage, database indexes, caching, background job sizing, slow paths, connection pool pressure | Top 3 slowest codepaths |

Each section follows a strict pattern: **STOP** after presenting findings → one issue = one question → options with effort/risk/maintenance → recommendation mapped to engineering preferences → wait for response before proceeding.

### Required Outputs

- **"NOT in scope"** — Deferred work with one-line rationale each.
- **"What already exists"** — Existing code/flows mapped to plan sub-problems.
- **TODOS.md updates** — Each TODO presented individually with What, Why, Pros, Cons, Context, Dependencies.
- **Diagrams** — ASCII diagrams for non-trivial data flow, state machines, processing pipelines.
- **Failure modes** — For each new codepath: realistic failure scenario, test coverage, error handling, user visibility. Silent + untested + unhandled = **critical gap**.
- **Worktree parallelization strategy** — Dependency table, parallel lanes, execution order, conflict flags for parallel implementation.
- **Completion summary** — All findings at a glance with scope, issues, gaps, outside voice status, lake score.

### Review Log
After completion, persists review metadata to `.github-gstack-intelligence/state/results/review/review-log.json` for the review readiness dashboard in `/ship`.

---

## Example Output

```markdown
## Engineering Plan Review — Issue #35

### Step 0: Scope Challenge
- Existing code: `UserSync` service already handles 60% of the sync logic
- Minimum diff: 6 files (under 8-file threshold ✅)
- Completeness: Plan proposes shortcut on error handling → recommend complete version (cheap with AI)
- TODOS: #12 (rate limiting) can be bundled — same blast radius

### Section 1: Architecture — 2 issues found

    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │  Client  │────▶│  API GW  │────▶│  Worker  │
    └──────────┘     └──────────┘     └──────────┘
         │                                  │
         │           ┌──────────┐           │
         └──────────▶│   Redis  │◀──────────┘
                     └──────────┘

Issue 1: Worker ↔ Redis connection has no backpressure mechanism
  → A) Add queue depth limit (recommended, P5: explicit)
  → B) Rely on Redis memory limit (risky)
  → C) Do nothing (⚠️ fails under 10x load)

### Section 3: Test Review

  NEW CODEPATHS:
    - UserSync#perform (happy path)
    - UserSync#perform (API timeout)
    - UserSync#perform (rate limit 429)
    - UserSync#perform (malformed response)

  Coverage: 3/4 paths tested. Gap: malformed response → critical gap

### Completion Summary
  Step 0: Scope accepted as-is
  Architecture: 2 issues found (resolved)
  Code Quality: 1 issue found (DRY violation)
  Test Review: 1 gap (malformed response path)
  Performance: 0 issues
  Failure modes: 1 critical gap flagged
  Parallelization: 2 lanes, both parallel
  Lake Score: 4/4 chose complete option
```

---

## Configuration

In [`config.json`](../config.json):

```json
{
  "skills": {
    "plan-eng-review": {
      "enabled": true,
      "trigger": "issue_comment"
    }
  }
}
```

| Field | Description |
|---|---|
| `enabled` | Whether the skill is active (`true`/`false`). |
| `trigger` | Event type — `issue_comment` means it fires when `/plan-eng-review` is commented on an issue. |

---

## Requirements

- **Browser:** Not required.
- **Model:** Uses the model configured in `config.json` defaults (currently `gpt-5.4`).
- **Allowed tools:** Read, Write, Grep, Glob, Bash, WebSearch.
- **Benefits from:** Prior `/office-hours` output for problem context and design docs.

---

## Results

- **Plan file** — Updated in-place with review findings, diagrams, and output sections.
- **Review log** — Written to `.github-gstack-intelligence/state/results/review/review-log.json` for `/ship` readiness dashboard.
- **TODOS.md** — Updated with deferred items including effort estimates and priority.
- **Required outputs:** "NOT in scope," "What already exists," test diagram, failure modes registry, worktree parallelization strategy, completion summary.

---

## Related Files

- **Skill prompt:** [`../skills/plan-eng-review.md`](../skills/plan-eng-review.md)
- **Config:** [`../config.json`](../config.json)
- **Router:** [`../lifecycle/router.ts`](../lifecycle/router.ts)
- **References:** [`../skills/references/`](../skills/references/)
- **TODOS format:** [`../skills/references/review-todos-format.md`](../skills/references/review-todos-format.md)

---

## See Also

- [`/autoplan`](autoplan.md) — Runs CEO + Design + Eng reviews automatically with auto-decisions
- [`/plan-ceo-review`](plan-ceo-review.md) — CEO/founder review for strategy, scope, and premises
- [`/plan-design-review`](plan-design-review.md) — Designer review for UI/UX completeness
- [`/office-hours`](office-hours.md) — Run first to establish product direction and constraints

---

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence" width="120">
  </picture>
</p>

[← Back to Command Reference](README.md)
