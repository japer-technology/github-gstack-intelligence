# /plan-ceo-review — CEO/Founder Plan Review

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

> CEO/founder-mode review that rethinks the problem, finds the "10-star product," challenges premises, and expands scope when it creates a better product. Four scope modes. Output is an improved plan — no code changes.

---

| Property | Value |
|---|---|
| **Trigger** | Comment `/plan-ceo-review` on an issue. Also runs as part of `/autoplan`. |
| **Browser Required** | No |
| **Default State** | ✅ Enabled |
| **Results Path** | CEO plans saved to `.github-gstack-intelligence/state/results/$SLUG/ceo-plans/` |

---

## How to Use

1. Create or open an issue containing your plan (or reference a plan file on a branch).
2. Comment `/plan-ceo-review` on the issue.
3. The skill begins the review — starting with a system audit, then a nuclear scope challenge.
4. Answer the premise challenge questions and select a scope mode.
5. Walk through each review section interactively — one issue per question, with opinionated recommendations.

**Best for:** When you're questioning whether a plan is ambitious enough, need strategic rigor, or want to challenge scope before implementation begins.

---

## What It Does

### Philosophy

This skill is not here to rubber-stamp your plan. Its posture depends on what you need — from dreaming big to surgically cutting scope. It applies the lens of a CEO/founder who thinks in 5–10 year arcs, challenges premises, and holds the bar for extraordinary.

**Critical rule:** The user is 100% in control. Every scope change is an explicit opt-in — never silently added or removed.

### 9 Prime Directives

1. **Zero silent failures.** Every failure mode must be visible.
2. **Every error has a name.** Specific exception classes, not catch-all handlers.
3. **Data flows have shadow paths.** Happy path + nil + empty + upstream error — trace all four.
4. **Interactions have edge cases.** Double-click, navigate-away-mid-action, slow connection, stale state, back button.
5. **Observability is scope, not afterthought.** Dashboards, alerts, runbooks are first-class deliverables.
6. **Diagrams are mandatory.** ASCII art for every non-trivial flow.
7. **Everything deferred must be written down.** TODOS.md or it doesn't exist.
8. **Optimize for the 6-month future.** Flag plans that solve today but create next quarter's nightmare.
9. **Permission to say "scrap it."** Fundamentally better approaches get tabled.

### 14 Cognitive Patterns of Great CEOs

The skill internalizes these thinking instincts throughout the review:

1. **Classification instinct** — Reversibility × magnitude (Bezos one-way/two-way doors)
2. **Paranoid scanning** — Strategic inflection points, cultural drift (Grove)
3. **Inversion reflex** — For every "how do we win?" also "what would make us fail?" (Munger)
4. **Focus as subtraction** — Fewer things, better (Jobs: 350 → 10 products)
5. **People-first sequencing** — People, products, profits — always in that order (Horowitz)
6. **Speed calibration** — Fast by default; 70% information is enough (Bezos)
7. **Proxy skepticism** — Are metrics serving users or self-referential? (Bezos Day 1)
8. **Narrative coherence** — Make the "why" legible, not everyone happy
9. **Temporal depth** — 5–10 year arcs, regret minimization (Bezos at 80)
10. **Founder-mode bias** — Deep involvement that expands team thinking (Chesky/Graham)
11. **Wartime awareness** — Peacetime vs wartime diagnosis (Horowitz)
12. **Courage accumulation** — Confidence comes from making hard decisions
13. **Willfulness as strategy** — Push hard in one direction for long enough (Altman)
14. **Leverage obsession** — Small effort → massive output (Altman)

### Four Scope Modes

| Mode | Posture | When to use |
|---|---|---|
| **SCOPE EXPANSION** | Dream big. Envision the platonic ideal. Push scope UP. | Greenfield features, user says "go big" |
| **SELECTIVE EXPANSION** | Hold scope as baseline + cherry-pick expansions. Neutral recommendation posture. | Feature enhancements, iterations on existing systems |
| **HOLD SCOPE** | Maximum rigor. Make it bulletproof. No expansions surfaced. | Bug fixes, hotfixes, refactors |
| **SCOPE REDUCTION** | Surgeon mode. Find the minimum viable version. Cut everything else. | Overbuilt plans, >15 files touched |

### Review Flow

**Pre-review System Audit:**
- Recent git history, diff against base branch, stashed work.
- Reads `CLAUDE.md`, `TODOS.md`, architecture docs.
- Checks for design docs from `/office-hours` and handoff notes from prior CEO reviews.
- Landscape check via WebSearch for competitive awareness.

**Step 0: Nuclear Scope Challenge + Mode Selection:**
- **0A. Premise Challenge** — Is this the right problem? What's the actual outcome? What happens if we do nothing?
- **0B. Existing Code Leverage** — Maps sub-problems to existing code.
- **0C. Dream State Mapping** — CURRENT STATE → THIS PLAN → 12-MONTH IDEAL.
- **0C-bis. Implementation Alternatives** — 2–3 distinct approaches (minimal viable, ideal architecture, creative/lateral).
- **0D. Mode-Specific Analysis** — Varies by selected mode (10x check, platonic ideal, delight opportunities for EXPANSION; complexity check for HOLD).
- **0E. Temporal Interrogation** — What decisions will be needed at HOUR 1, 2–3, 4–5, 6+?
- **0F. Mode Selection** — User selects one of the four modes.

**Review Sections (10 sections after scope is agreed):**

| Section | Focus |
|---|---|
| 1. Architecture | System design, dependency graphs, data flow (all 4 paths), scaling, security, rollback |
| 2. Error & Rescue Map | Every method that can fail → exception class → rescue action → user impact |
| 3. Security & Threat Model | Attack surface, input validation, authorization, injection vectors, audit logging |
| 4. Data Flow & Edge Cases | ASCII data flow diagrams, interaction edge case tables |
| 5. Code Quality | DRY violations, naming, complexity, over/under-engineering |
| 6. Test Review | Test diagram, coverage map, failure path tests, chaos tests |
| 7. Performance | N+1 queries, memory, caching, slow paths, connection pool pressure |
| 8. Observability | Logging, metrics, tracing, alerting, dashboards, runbooks |
| 9. Deployment & Rollout | Migration safety, feature flags, rollback plan, smoke tests |
| 10. Long-Term Trajectory | Tech debt, path dependency, reversibility, ecosystem fit |
| 11. Design & UX | (conditional — only if UI scope detected) Information architecture, states, AI slop risk |

---

## Example Output

```markdown
## CEO Plan Review — Issue #22

### Step 0: Premise Challenge
PREMISES:
1. Users need real-time collaboration → ✅ Evidence: 3 support tickets/week requesting it
2. WebSocket is the right transport → ⚠️ Challenge: SSE covers 80% of use cases at 20% complexity
3. Full rewrite of the sync engine → ❌ Existing sync can be extended with 40% less effort

### Mode: SELECTIVE EXPANSION
Accepted cherry-picks:
- Presence indicators (S effort, low risk) ✅
- Conflict resolution UI (M effort, med risk) ✅
Deferred: Multi-cursor editing → TODOS.md

### Section 1: Architecture — 2 issues found
  CURRENT                     THIS PLAN                  12-MONTH IDEAL
  REST polling (5s)  --->    WebSocket + SSE hybrid --->  Real-time platform
                                                          with offline-first

### Completion Summary
  Mode: SELECTIVE EXPANSION
  Architecture: 2 issues (resolved)
  Error paths: 8 mapped, 1 GAP (fixed)
  Security: 1 issue (auth boundary for WS)
  Tests: 4 gaps identified
  NOT in scope: written (3 items)
  TODOS.md: 2 items proposed
```

---

## Configuration

In [`config.json`](../config.json):

```json
{
  "skills": {
    "plan-ceo-review": {
      "enabled": true,
      "trigger": "issue_comment"
    }
  }
}
```

| Field | Description |
|---|---|
| `enabled` | Whether the skill is active (`true`/`false`). |
| `trigger` | Event type — `issue_comment` means it fires when `/plan-ceo-review` is commented on an issue. |

---

## Requirements

- **Browser:** Not required.
- **Model:** Uses the model configured in `config.json` defaults (currently `gpt-5.4`).
- **Allowed tools:** Read, Grep, Glob, Bash, WebSearch.
- **Benefits from:** Prior `/office-hours` output for product context and problem framing.

---

## Results

- **Plan file** — Updated in-place with review findings, diagrams, and required output sections.
- **CEO plan document** — For EXPANSION and SELECTIVE EXPANSION modes, persisted to `.github-gstack-intelligence/state/results/$SLUG/ceo-plans/{date}-{feature-slug}.md`.
- **TODOS.md** — Updated with deferred scope items.
- **Required output sections:** "NOT in scope," "What already exists," Dream state delta, Error & Rescue Registry, Failure Modes Registry, Completion Summary.

---

## Related Files

- **Skill prompt:** [`../skills/plan-ceo-review.md`](../skills/plan-ceo-review.md)
- **Config:** [`../config.json`](../config.json)
- **Router:** [`../lifecycle/router.ts`](../lifecycle/router.ts)
- **References:** [`../skills/references/`](../skills/references/)
- **TODOS format:** [`../skills/references/review-todos-format.md`](../skills/references/review-todos-format.md)

---

## See Also

- [`/autoplan`](autoplan.md) — Runs CEO + Design + Eng reviews automatically with auto-decisions
- [`/plan-eng-review`](plan-eng-review.md) — Engineering review to lock in execution architecture
- [`/plan-design-review`](plan-design-review.md) — Designer's-eye review for UI/UX completeness
- [`/office-hours`](office-hours.md) — Run first if the problem isn't clearly defined yet

---

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence">
  </picture>
</p>

[← Back to Command Reference](README.md)
