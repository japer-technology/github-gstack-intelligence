# /autoplan — Auto-Review Pipeline

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

> One command, fully reviewed plan out. Loads CEO, design, and engineering review skills and runs them sequentially with auto-decisions using 6 decision principles. Surfaces taste decisions at a final approval gate.

---

| Property | Value |
|---|---|
| **Trigger** | Comment `/autoplan` on an issue |
| **Browser Required** | No |
| **Default State** | ✅ Enabled |
| **Results Path** | Test plan artifact at `.github-gstack-intelligence/state/results/$SLUG/`, restore point saved to `.github-gstack-intelligence/state/local/` |

---

## How to Use

1. Create or open an issue containing your plan (or a link to a plan file).
2. Comment `/autoplan` on the issue.
3. The skill runs the full CEO → Design → Eng review pipeline automatically.
4. Mechanical decisions are auto-decided silently. Taste decisions and User Challenges are surfaced at a final approval gate for your input.

**Best for:** When you have a plan file and want the full review gauntlet without answering 15–30 intermediate questions manually.

**Tip:** If you want to run individual reviews interactively, use `/plan-ceo-review`, `/plan-design-review`, or `/plan-eng-review` separately instead.

---

## What It Does

### The 6 Decision Principles

These rules auto-answer every intermediate question:

1. **Choose completeness** — Ship the whole thing. Pick the approach that covers more edge cases.
2. **Boil lakes** — Fix everything in the blast radius (files modified + direct importers). Auto-approve expansions that are in blast radius AND < 1 day effort (< 5 files, no new infra).
3. **Pragmatic** — If two options fix the same thing, pick the cleaner one. 5 seconds choosing, not 5 minutes.
4. **DRY** — Duplicates existing functionality? Reject. Reuse what exists.
5. **Explicit over clever** — 10-line obvious fix > 200-line abstraction. Pick what a new contributor reads in 30 seconds.
6. **Bias toward action** — Merge > review cycles > stale deliberation. Flag concerns but don't block.

**Conflict resolution (context-dependent tiebreakers):**
- CEO phase: Completeness + Boil lakes dominate.
- Eng phase: Explicit + Pragmatic dominate.
- Design phase: Explicit + Completeness dominate.

### Decision Classification

Every auto-decision is classified:

- **Mechanical** — One clearly right answer. Auto-decided silently. _Examples: run evals (always yes), reduce scope on a complete plan (always no)._
- **Taste** — Reasonable people could disagree. Auto-decided with recommendation but surfaced at the final gate. Sources: close approaches, borderline scope, codex disagreements.
- **User Challenge** — Both models agree the user's stated direction should change. NEVER auto-decided. Always presented at the final gate with: what the user said, what both models recommend, why, what context might be missing, and cost if wrong.

### Phase 0: Intake + Restore Point
- Captures a restore point of the plan file before modifying anything.
- Reads context: `CLAUDE.md`, `TODOS.md`, git log, design docs.
- Detects UI scope to determine whether to run the Design phase.
- Loads skill files from disk for each review phase.

### Phase 1: CEO Review (Strategy & Scope)
Follows the full `plan-ceo-review` methodology:
- Premise challenge (0A–0F) — the ONE question that is NOT auto-decided.
- All 10+ review sections at full depth.
- Dual voices: runs both Claude subagent and Codex for independent strategic assessment.
- Produces CEO consensus table, dream state delta, Error & Rescue Registry, Failure Modes Registry.
- Mode: SELECTIVE EXPANSION by default.

### Phase 2: Design Review (conditional)
Runs only if UI scope was detected. Follows the full `plan-design-review` methodology:
- All 7 design dimensions rated 0–10.
- Dual voices for independent design assessment.
- Produces design litmus scorecard.

### Phase 3: Engineering Review + Dual Voices
Follows the full `plan-eng-review` methodology:
- Scope challenge with actual code analysis.
- Architecture, Code Quality, Test, and Performance reviews.
- Dual voices for independent engineering assessment.
- Produces ASCII dependency graph, test diagram, test plan artifact.

### Decision Audit Trail
Every auto-decision is logged as a row in the plan file:

```markdown
| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|----------|
```

### Final Approval Gate
After all phases complete, surfaces:
- All **taste decisions** with auto-decided recommendation and both-sides reasoning.
- All **User Challenges** with full context.
- Pre-gate verification ensures all required outputs were produced.

### Cross-Phase Themes
Identifies patterns that appeared across multiple review phases (e.g., a concern raised in CEO review that also appeared in engineering review).

---

## Example Output

```markdown
## /autoplan — Fully Reviewed Plan

### Phase 1: CEO Review ✅
Mode: SELECTIVE EXPANSION
Premises: 3/3 confirmed by user
Codex: 2 concerns | Claude subagent: 3 issues
Consensus: 5/6 confirmed, 1 disagreement → surfaced at gate

### Phase 2: Design Review ✅ (UI scope detected)
Initial score: 4/10 → Final: 8/10
7 dimensions evaluated, 4 auto-fixed, 1 taste decision surfaced

### Phase 3: Engineering Review ✅
Architecture: 2 issues found, auto-resolved
Test coverage: 3 gaps identified, test plan written
Performance: 1 issue found (N+1 query), auto-fixed

### Decision Audit Trail
| # | Phase | Decision           | Classification | Principle   | Rationale                    |
|---|-------|--------------------|---------------|-------------|------------------------------|
| 1 | CEO   | Accept premise #2  | Mechanical    | P6 (action) | Evidence supports direction  |
| 2 | Eng   | Add index on users | Mechanical    | P3 (pragmatic) | Obvious perf improvement  |
| 3 | Design| Sidebar vs tabs    | Taste         | P5 (explicit)  | Both viable, different UX |

### 🚦 Final Approval Gate
**Taste Decisions (1):**
1. Navigation: sidebar (auto-decided) vs. tabs — both viable...

**User Challenges (0):**
None — models agree with user's direction.
```

---

## Configuration

In [`config.json`](../config.json):

```json
{
  "skills": {
    "autoplan": {
      "enabled": true,
      "trigger": "issue_comment"
    }
  }
}
```

| Field | Description |
|---|---|
| `enabled` | Whether the skill is active (`true`/`false`). |
| `trigger` | Event type — `issue_comment` means it fires when `/autoplan` is commented on an issue. |

---

## Requirements

- **Browser:** Not required.
- **Model:** Uses the model configured in `config.json` defaults (currently `gpt-5.4`). Benefits from dual-model setup (Claude + Codex) for independent outside voices.
- **Allowed tools:** Bash, Read, Write, Edit, Glob, Grep, WebSearch.
- **Benefits from:** Prior `/office-hours` output for product context.

---

## Results

- **Plan file** — Updated in-place with review findings, decision audit trail, and required outputs.
- **Restore point** — Saved to `.github-gstack-intelligence/state/local/projects/$SLUG/` for rollback.
- **Test plan** — Written to `.github-gstack-intelligence/state/results/$SLUG/`.
- **CEO plan** — Written to `.github-gstack-intelligence/state/results/$SLUG/ceo-plans/` (for EXPANSION/SELECTIVE EXPANSION modes).
- **TODOS.md** — Updated with deferred items.

---

## Related Files

- **Skill prompt:** [`../skills/autoplan.md`](../skills/autoplan.md)
- **CEO review skill:** [`../skills/plan-ceo-review.md`](../skills/plan-ceo-review.md)
- **Design review skill:** [`../skills/plan-design-review.md`](../skills/plan-design-review.md)
- **Eng review skill:** [`../skills/plan-eng-review.md`](../skills/plan-eng-review.md)
- **Config:** [`../config.json`](../config.json)
- **Router:** [`../lifecycle/router.ts`](../lifecycle/router.ts)

---

## See Also

- [`/plan-ceo-review`](plan-ceo-review.md) — Run the CEO review interactively (standalone)
- [`/plan-eng-review`](plan-eng-review.md) — Run the engineering review interactively (standalone)
- [`/plan-design-review`](plan-design-review.md) — Run the design review interactively (standalone)
- [`/office-hours`](office-hours.md) — Run before `/autoplan` to establish product direction

---

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence" width="120">
  </picture>
</p>

[← Back to Command Reference](README.md)
