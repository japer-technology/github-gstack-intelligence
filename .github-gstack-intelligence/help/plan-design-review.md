# /plan-design-review — Designer Plan Review

> Interactive designer's-eye plan review that rates each design dimension 0–10, explains what would make it a 10, then improves the plan. Applies 9 design principles and 14 cognitive patterns of great designers. Does not make code changes.

---

| Property | Value |
|---|---|
| **Trigger** | Comment `/plan-design-review` on an issue. Also runs as part of `/autoplan`. |
| **Browser Required** | No |
| **Default State** | ✅ Enabled |
| **Results Path** | Review log at `.github-gstack-intelligence/state/results/review/review-log.json`, mockups at `.github-gstack-intelligence/state/results/$SLUG/designs/` |

---

## How to Use

1. Create or open an issue containing a plan with UI/UX components.
2. Comment `/plan-design-review` on the issue.
3. The skill rates your plan's design completeness, generates mockup variants (if available), then reviews all 7 design dimensions.
4. Each dimension is rated 0–10 with concrete fixes applied to reach a higher score.

**Best for:** When you have a plan with UI components that should be reviewed for design completeness before implementation begins.

**Note:** For live site visual audits (post-implementation), use `/design-review` instead.

---

## What It Does

### Design Philosophy

This skill ensures that when a plan ships, users feel the design is intentional — not generated, not accidental, not "we'll polish it later." It finds every gap, explains why it matters, fixes the obvious ones, and asks about the genuine choices.

**Output:** A better plan, not a document about the plan. The skill edits the plan directly.

### 9 Design Principles

1. **Empty states are features.** "No items found." is not a design.
2. **Every screen has a hierarchy.** First, second, third — if everything competes, nothing wins.
3. **Specificity over vibes.** "Clean, modern UI" is not a design decision.
4. **Edge cases are user experiences.** 47-char names, zero results, error states.
5. **AI slop is the enemy.** Generic card grids, hero sections, 3-column features = failure.
6. **Responsive is not "stacked on mobile."** Each viewport gets intentional design.
7. **Accessibility is not optional.** Keyboard nav, screen readers, contrast, touch targets.
8. **Subtraction default.** If a UI element doesn't earn its pixels, cut it.
9. **Trust is earned at the pixel level.** Every interface decision builds or erodes trust.

### 14 Cognitive Patterns of Great Designers

1. **Seeing the system, not the screen** — What comes before, after, and when things break
2. **Empathy as simulation** — Mental simulations: bad signal, one hand free, boss watching, first time vs 1000th
3. **Hierarchy as service** — What should the user see first, second, third?
4. **Constraint worship** — If you can only show 3 things, which 3?
5. **The question reflex** — Questions first, not opinions. "Who is this for?"
6. **Edge case paranoia** — 47-char name? Zero results? Network fails? Colorblind? RTL?
7. **The "Would I notice?" test** — Invisible = perfect
8. **Principled taste** — "This feels wrong" is traceable to a broken principle (Zhuo)
9. **Subtraction default** — "As little design as possible" (Rams), "Subtract the obvious, add the meaningful" (Maeda)
10. **Time-horizon design** — 5 seconds (visceral), 5 minutes (behavioral), 5-year relationship (reflective) (Norman)
11. **Design for trust** — Pixel-level intentionality about safety, identity, belonging (Gebbia, Airbnb)
12. **Storyboard the journey** — Full emotional arc before touching pixels — the "Snow White" method (Gebbia)

Key references: Dieter Rams' 10 Principles, Don Norman's 3 Levels of Design, Nielsen's 10 Heuristics, Gestalt Principles, Ira Glass, Jony Ive, Joe Gebbia.

### Review Flow

**Pre-review System Audit:**
- Reads the plan, `CLAUDE.md`, `DESIGN.md`, `TODOS.md`, recent git history.
- Maps UI scope (pages, components, interactions).
- Checks for existing design patterns in the codebase.
- **Early exit:** If the plan has zero UI scope, exits with "This plan has no UI scope. A design review isn't applicable."

**Step 0: Design Scope Assessment**
- **0A. Initial Rating** — Rates 0–10 with explanation of what a 10 looks like for THIS plan.
- **0B. DESIGN.md Status** — Calibrates against existing design system or flags its absence.
- **0C. Existing Design Leverage** — Identifies reusable UI patterns and components.
- **0D. Focus Areas** — Presents rating and biggest gaps, asks user about focus.

**Step 0.5: Visual Mockups (default when design tools available)**
- Generates visual mockup variants using the gstack designer.
- Runs cross-model quality checks on each variant.
- Opens comparison board for user selection.
- Approved direction becomes the visual reference for all subsequent passes.

### The 0–10 Rating Method

For each dimension:
1. **Rate:** "Information Architecture: 4/10"
2. **Gap:** Explain why it's not a 10 — what's missing.
3. **Fix:** Edit the plan to add what's missing.
4. **Re-rate:** Confirm improvement.
5. **Ask:** If there's a genuine design choice to resolve.
6. **Repeat** until 10 or user says "good enough."

### 7 Review Passes

| Pass | Dimension | What it evaluates |
|---|---|---|
| **1** | **Information Architecture** | Content hierarchy, screen structure, navigation flow. ASCII diagram of screen/page structure. |
| **2** | **Interaction State Coverage** | Loading, empty, error, success, partial states for every UI feature. Interaction state table. |
| **3** | **User Journey & Emotional Arc** | User's emotional experience step by step. Storyboard: 5-sec visceral, 5-min behavioral, 5-year reflective. |
| **4** | **AI Slop Risk** | Generic patterns vs specific, intentional UI. Rejects card grids, centered heroes, gradient buttons. |
| **5** | **Design System Alignment** | Alignment with `DESIGN.md`. Flags gaps and new components. Recommends `/design-consultation` if no system exists. |
| **6** | **Responsive & Accessibility** | Mobile/tablet layout specs (not "stacked on mobile"), keyboard nav, ARIA landmarks, touch targets (44px min), contrast. |
| **7** | **Unresolved Design Decisions** | Ambiguities that will haunt implementation. Decision + "if deferred, what happens" table. |

Each pass uses the same format: **STOP** after findings → one issue = one question → recommendation + WHY → wait for response.

---

## Example Output

```markdown
## Design Plan Review — Issue #28

### Step 0: Design Scope Assessment
Initial rating: 3/10
"This plan describes what the backend does but never specifies what the user sees."
A 10 would have clear hierarchy, all interaction states, responsive specs, and a11y.

### Pass 1: Information Architecture — 3/10 → 8/10
Gap: No content hierarchy defined for dashboard.
Fix: Added primary (metrics) → secondary (recent activity) → tertiary (settings).

### Pass 2: Interaction State Coverage — 2/10 → 9/10
  FEATURE              | LOADING    | EMPTY         | ERROR        | SUCCESS
  Dashboard metrics    | Skeleton   | "Connect a…"  | Retry banner | Fade in
  Activity feed        | 3 shimmer  | Warm welcome   | Inline retry | Append

### Pass 4: AI Slop Risk — 6/10 → 9/10
Flagged: "Cards with icons" → replaced with specific data visualization approach.

### Completion Summary
  +====================================================================+
  |         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
  +====================================================================+
  | Pass 1  (Info Arch)  | 3/10 → 8/10                                |
  | Pass 2  (States)     | 2/10 → 9/10                                |
  | Pass 3  (Journey)    | 5/10 → 8/10                                |
  | Pass 4  (AI Slop)    | 6/10 → 9/10                                |
  | Pass 5  (Design Sys) | 4/10 → 7/10 (no DESIGN.md — recommend)    |
  | Pass 6  (Responsive) | 1/10 → 8/10                                |
  | Pass 7  (Decisions)  | 3 resolved, 1 deferred                     |
  | Overall design score | 3/10 → 8/10                                 |
  +====================================================================+
```

---

## Configuration

In [`config.json`](../config.json):

```json
{
  "skills": {
    "plan-design-review": {
      "enabled": true,
      "trigger": "issue_comment"
    }
  }
}
```

| Field | Description |
|---|---|
| `enabled` | Whether the skill is active (`true`/`false`). |
| `trigger` | Event type — `issue_comment` means it fires when `/plan-design-review` is commented on an issue. |

---

## Requirements

- **Browser:** Not required.
- **Model:** Uses the model configured in `config.json` defaults (currently `gpt-5.4`).
- **Allowed tools:** Read, Edit, Grep, Glob, Bash.
- **Design tools:** Optional gstack designer for mockup generation — the skill works without it using text-based review.

---

## Results

- **Plan file** — Updated in-place with design fixes, interaction state tables, and hierarchy specifications.
- **Review log** — Written to `.github-gstack-intelligence/state/results/review/review-log.json` for the review readiness dashboard.
- **Mockups** — If generated, saved to `.github-gstack-intelligence/state/results/$SLUG/designs/` with approved variants referenced in the plan.
- **Required outputs:** "NOT in scope," "What already exists," TODOS.md updates, Completion Summary, Approved Mockups table, Unresolved Decisions.

---

## Related Files

- **Skill prompt:** [`../skills/plan-design-review.md`](../skills/plan-design-review.md)
- **Config:** [`../config.json`](../config.json)
- **Router:** [`../lifecycle/router.ts`](../lifecycle/router.ts)
- **References:** [`../skills/references/`](../skills/references/)
- **Design checklist:** [`../skills/references/review-design-checklist.md`](../skills/references/review-design-checklist.md)

---

## See Also

- [`/autoplan`](autoplan.md) — Runs CEO + Design + Eng reviews automatically with auto-decisions
- [`/plan-ceo-review`](plan-ceo-review.md) — CEO/founder review for strategy and scope
- [`/plan-eng-review`](plan-eng-review.md) — Engineering review for architecture and test coverage
- [`/design-review`](design-review.md) — Visual design audit on live sites (post-implementation)
- [`/design-consultation`](design-consultation.md) — Full design system builder (run if no `DESIGN.md` exists)

---

[← Back to Command Reference](README.md)
