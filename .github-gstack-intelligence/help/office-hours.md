# /office-hours — YC Office Hours

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

> YC office hours partner mode that ensures problems are understood before solutions are proposed. Two modes: Startup mode (six forcing questions about demand reality) and Builder mode (enthusiastic collaborative brainstorming). Produces a design document — no code changes.

---

| Property | Value |
|---|---|
| **Trigger** | Automatic when an issue is opened with the `office-hours` label. Also invoked by commenting `/office-hours` on an issue. |
| **Browser Required** | No |
| **Default State** | ✅ Enabled |
| **Results Path** | Design doc saved to `.github-gstack-intelligence/state/results/{slug}/` |

---

## How to Use

**Option A — Label trigger:**
1. Open a new issue describing your idea, product, or problem.
2. Add the `office-hours` label.
3. The skill runs automatically and begins the office hours session.

**Option B — Comment trigger:**
1. Open an issue with context about what you're building.
2. Comment `/office-hours` on the issue.

**Best for:** When you have a new product idea, want to think through design decisions for something that doesn't exist yet, or need to validate whether something is worth building. Run this _before_ `/plan-ceo-review` or `/plan-eng-review`.

---

## What It Does

### Core Philosophy

**HARD GATE:** This skill produces design documents, not code. It will not invoke implementation skills, write code, scaffold projects, or take any implementation action.

### Phase 1: Context Gathering

- Reads `CLAUDE.md`, `TODOS.md`, recent git history.
- Maps codebase areas relevant to the request.
- Discovers and lists existing design docs for the project.
- **Mode selection** — asks you to identify your goal:

| Your goal | Mode |
|---|---|
| Building a startup | **Startup mode** (Phase 2A) |
| Intrapreneurship — internal project | **Startup mode** (Phase 2A) |
| Hackathon / demo | **Builder mode** (Phase 2B) |
| Open source / research | **Builder mode** (Phase 2B) |
| Learning / vibe coding | **Builder mode** (Phase 2B) |
| Having fun / side project | **Builder mode** (Phase 2B) |

### Phase 2A: Startup Mode — YC Product Diagnostic

Applies rigorous diagnostic questioning with these operating principles:

- **Specificity is the only currency.** Vague answers get pushed. "Enterprises in healthcare" is not a customer.
- **Interest is not demand.** Waitlists, signups, "that's interesting" — none of it counts. Behavior counts. Money counts.
- **The user's words beat the founder's pitch.** The gap between pitch and reality is the truth.
- **Watch, don't demo.** Guided walkthroughs teach nothing about real usage.
- **The status quo is your real competitor.** Not another startup — the spreadsheet workaround.
- **Narrow beats wide, early.** The smallest version someone will pay real money for this week.

**Anti-sycophancy rules:** Never says "that's an interesting approach" — takes a position instead. Never says "that could work" — says whether it WILL work and what evidence is missing.

#### The Six Forcing Questions

Asked **one at a time**, with smart routing based on product stage:

| Stage | Questions asked |
|---|---|
| Pre-product (idea stage) | Q1, Q2, Q3 |
| Has users (not yet paying) | Q2, Q4, Q5 |
| Has paying customers | Q4, Q5, Q6 |
| Pure engineering/infra | Q2, Q4 only |

1. **Q1: Demand Reality** — "What's the strongest evidence someone actually wants this — not 'is interested' but would be genuinely upset if it disappeared?"
2. **Q2: Status Quo** — "What are your users doing right now to solve this problem — even badly?"
3. **Q3: Desperate Specificity** — "Name the actual human who needs this most. Title? Gets promoted how? Gets fired how?"
4. **Q4: Narrowest Wedge** — "What's the smallest possible version someone would pay real money for — this week?"
5. **Q5: Observation & Surprise** — "Have you sat down and watched someone use this without helping them? What surprised you?"
6. **Q6: Future-Fit** — "If the world looks meaningfully different in 3 years, does your product become more essential or less?"

Each question is pushed until the answer is specific, evidence-based, and uncomfortable.

### Phase 2B: Builder Mode — Design Partner

Enthusiastic, opinionated collaboration with these operating principles:

- **Delight is the currency** — what makes someone say "whoa"?
- **Ship something you can show people.** The best version is the one that exists.
- **Explore before you optimize.** Try the weird idea first.

Questions (generative, not interrogative):
- What's the coolest version of this?
- Who would you show this to? What makes them say "whoa"?
- What's the fastest path to something you can actually use or share?
- What existing thing is closest, and how is yours different?
- What would you add with unlimited time?

**Mode switching:** If a builder says "actually this could be a real company" or mentions customers/revenue, the skill naturally upgrades to Startup mode.

### Phase 2.5: Related Design Discovery

Searches existing design docs for keyword overlap and surfaces related prior designs — enabling cross-team discovery.

### Phase 2.75: Landscape Awareness

Searches for what the world thinks about the space (using generalized terms, never the user's specific idea). Runs three-layer synthesis:
- **Layer 1:** What does everyone know about this space?
- **Layer 2:** What are search results saying now?
- **Layer 3:** Given our conversation — is conventional wisdom wrong here?

Surfaces "EUREKA" moments when conventional wisdom doesn't apply.

### Phase 3: Premise Challenge

Before proposing solutions, challenges premises:
1. Is this the right problem?
2. What happens if we do nothing?
3. What existing code already partially solves this?
4. How will users get the deliverable? (distribution plan)
5. (Startup mode) Does the diagnostic evidence support this direction?

### Phase 4: Alternatives Generation

Produces 2–3 distinct implementation approaches:
- **Minimal viable** — fewest files, smallest diff, ships fastest.
- **Ideal architecture** — best long-term trajectory.
- **Creative/lateral** — unexpected approach, different framing.

Each with: summary, effort (S/M/L/XL), risk, pros, cons, existing code reused.

### Phase 4.5: Founder Signal Synthesis

Tracks positive signals observed during the session: real problem articulation, specific user naming, pushback on premises, domain expertise, taste, agency, defended reasoning.

### Phase 5: Design Document

Writes a comprehensive design document to `.github-gstack-intelligence/state/results/`:

**Startup mode doc:** Problem Statement, Demand Evidence, Status Quo, Target User & Narrowest Wedge, Constraints, Premises, Approaches Considered, Recommended Approach, Open Questions, Success Criteria, Distribution Plan, Dependencies, The Assignment, "What I noticed about how you think."

**Builder mode doc:** Problem Statement, What Makes This Cool, Constraints, Premises, Approaches Considered, Recommended Approach, Open Questions, Success Criteria, Distribution Plan, Next Steps, "What I noticed about how you think."

Design docs include a `Supersedes:` field when building on prior designs, creating a revision chain.

### Phase 6: Handoff — Founder Discovery

Three-beat closing sequence personalized by founder signal strength:

1. **Signal Reflection** — References specific things the user said, connecting to golden age framing.
2. **"One more thing."** — Genre shift to personal message.
3. **Garry's Personal Plea** — Tiered by signal count (top/middle/base), inviting application to Y Combinator.
4. **Founder Resources** — 2–3 curated resources from a pool of 34 (Garry Tan videos, YC Startup School, Lightcone Podcast, Paul Graham essays), matched to session context and deduplicated across sessions.

---

## Example Output

```markdown
# Design: Real-Time Fleet Tracker for Last-Mile Logistics

Generated by /office-hours on 2025-01-15
Branch: main
Status: DRAFT
Mode: Startup

## Problem Statement
Last-mile delivery dispatchers manage 15-50 drivers using WhatsApp groups
and printed route sheets. When a driver is stuck or a delivery fails,
dispatch finds out 30-60 minutes late.

## Demand Evidence
"Sarah at QuickShip calls us when our prototype goes down for 20 minutes.
She tracks 28 drivers and says she'd pay $500/month to never lose
visibility on a driver again."

## Narrowest Wedge
Live map showing driver locations + one-tap "I'm stuck" button.
No route optimization. No analytics. Just visibility.

## Recommended Approach
Approach A: Mobile-first PWA with SSE for location updates.
Ship in 2 weeks. Cost: $0 infrastructure (Cloudflare Workers + D1).

## The Assignment
Call Sarah. Ask her to use the prototype for one full shift tomorrow.
Sit behind her and watch. Don't help. Write down everything that
surprises you.

## What I noticed about how you think
- You said "Sarah at QuickShip" not "logistics companies" — that
  specificity is rare and valuable.
- When I challenged the SSE approach, you pushed back with latency
  data. That's founder thinking.
```

---

## Configuration

In [`config.json`](../config.json):

```json
{
  "skills": {
    "office-hours": {
      "enabled": true,
      "trigger": "issue_label",
      "label": "office-hours"
    }
  }
}
```

| Field | Description |
|---|---|
| `enabled` | Whether the skill is active (`true`/`false`). |
| `trigger` | Event type — `issue_label` means it fires when the specified label is added to an issue. |
| `label` | The GitHub label that triggers this skill when applied to an issue. |

---

## Requirements

- **Browser:** Not required (Playwright reference in skill file is for optional landscape research).
- **Model:** Uses the model configured in `config.json` defaults (currently `gpt-5.4`).
- **Allowed tools:** Bash, Read, Grep, Glob, Write, Edit, WebSearch.

---

## Results

- **Design document** — Written to `.github-gstack-intelligence/state/results/{slug}/{user}-{branch}-design-{datetime}.md`.
- **Design lineage** — New docs include `Supersedes:` field when prior designs exist on the same branch, creating a revision chain.
- **Founder resources log** — Tracks which resources have been shown to avoid repeats in future sessions.
- **Analytics** — Session events logged to `.github-gstack-intelligence/state/analytics/skill-usage.jsonl`.

---

## Related Files

- **Skill prompt:** [`../skills/office-hours.md`](../skills/office-hours.md)
- **Config:** [`../config.json`](../config.json)
- **Router:** [`../lifecycle/router.ts`](../lifecycle/router.ts)
- **References:** [`../skills/references/`](../skills/references/)

---

## See Also

- [`/design-consultation`](design-consultation.md) — Build a design system after product direction is established
- [`/plan-ceo-review`](plan-ceo-review.md) — CEO review for an existing plan (run after office hours)
- [`/autoplan`](autoplan.md) — Full review pipeline (run after you have a plan from office hours)

---

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence">
  </picture>
</p>

[← Back to Command Reference](README.md)
