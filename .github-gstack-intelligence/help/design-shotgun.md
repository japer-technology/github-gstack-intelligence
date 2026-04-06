# `/design-shotgun` — Design Exploration

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

**Specialist:** Design Explorer
**Trigger:** `/design-shotgun` comment on any issue
**Browser required:** Yes
**Default:** ✅ Enabled

---

## What It Does

`/design-shotgun` generates multiple AI design variants for a UI feature, opens a visual comparison board, and collects structured feedback for iteration. It's a standalone design exploration tool you can run anytime you want to see what something could look like before committing to a direction.

Key capabilities:

- **Multiple variants** — Generates several distinct design approaches for the same feature
- **Comparison board** — Side-by-side visual comparison of all variants
- **Structured feedback** — Collects your preferences and iterates on the winning direction
- **Standalone** — Works independently or as part of the design pipeline

---

## When To Use It

- When a user describes a UI feature but hasn't seen what it could look like
- When you're unsure about the visual direction and want to explore options
- When you want rapid visual brainstorming before committing to implementation
- When you want to say "show me options" or "I don't like how this looks"

---

## How To Trigger

Comment on any issue:

```
/design-shotgun
```

You can also say "explore designs", "show me options", "design variants", "visual brainstorm", or "I don't like how this looks".

---

## Example

```
/design-shotgun

I need a dashboard for monitoring API usage. Show me 3–4 different approaches —
one data-dense, one minimal, and one with big visualizations.
```

---

## Workflow Integration

`/design-shotgun` fits into the design pipeline as the exploration phase:

```
/office-hours          → clarify what you're building
/design-shotgun        → explore visual directions
/design-html           → finalize the chosen direction
/design-review         → visual QA on the result
```

---

## Related Commands

| Command | Relationship |
|---|---|
| [`/design-html`](design-html.md) | Finalize the chosen variant into production code |
| [`/design-consultation`](design-consultation.md) | Establish a design system before exploring |
| [`/design-review`](design-review.md) | QA the final implementation |
| [`/plan-design-review`](plan-design-review.md) | Plan-level design review before exploration |

---

## Configuration

```json
{
  "design-shotgun": { "enabled": true, "trigger": "issue_comment" }
}
```

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence" width="120">
  </picture>
</p>
