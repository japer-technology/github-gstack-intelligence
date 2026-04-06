# `/design-html` — Design Finalization

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

**Specialist:** Design Engineer
**Trigger:** `/design-html` comment on any issue
**Browser required:** Yes
**Default:** ✅ Enabled

---

## What It Does

`/design-html` generates production-quality HTML and CSS from approved design mockups, CEO plans, design review context, or a plain text description. The output uses real reflow, computed heights, and dynamic layouts — not static screenshots or fixed-pixel designs.

Key capabilities:

- **From mockups** — Takes approved designs from `/design-shotgun` and turns them into working code
- **From plans** — Works with CEO plans from `/plan-ceo-review` or design review context from `/plan-design-review`
- **From scratch** — Generates designs from a text description
- **Zero dependencies** — Pure HTML/CSS output with no framework requirements
- **Smart API routing** — Picks the right design patterns for each design type

---

## When To Use It

- After approving a design from `/design-shotgun`
- After a planning phase when you're ready to implement the visual layer
- When you need production-ready HTML/CSS from a description
- Whenever you want to "make it real" from a mockup or wireframe

---

## How To Trigger

Comment on any issue:

```
/design-html
```

You can also say "finalize this design", "turn this into HTML", "build me a page", or "implement this design".

---

## Example

```
/design-html

Take the approved pricing page mockup from the design consultation and generate
production-ready HTML/CSS. Use the design system colors and typography we established.
```

---

## Workflow Integration

`/design-html` is the finalization step in the design pipeline:

```
/design-consultation → establish design system
/design-shotgun     → explore visual variants
/design-html        → generate production code
/design-review      → visual QA on the result
```

---

## Related Commands

| Command | Relationship |
|---|---|
| [`/design-shotgun`](design-shotgun.md) | Explore designs before finalizing with `/design-html` |
| [`/design-consultation`](design-consultation.md) | Establish design system before implementation |
| [`/design-review`](design-review.md) | Visual QA after implementation |
| [`/plan-design-review`](plan-design-review.md) | Plan the design before building |

---

## Configuration

```json
{
  "design-html": { "enabled": true, "trigger": "issue_comment" }
}
```

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence" width="120">
  </picture>
</p>
