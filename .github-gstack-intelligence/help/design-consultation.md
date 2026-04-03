# /design-consultation — Design System Builder

> Understands your product, researches the landscape, and proposes a complete design system — aesthetic, typography, color palette, layout grid, spacing scale, and motion principles. Creates `DESIGN.md` as your project's design source of truth.

---

| Property | Value |
|---|---|
| **Trigger** | Automatic when an issue is opened with the `design-consultation` label. Also invoked by commenting `/design-consultation` on an issue. |
| **Browser Required** | No (optional — enables visual competitive research if available) |
| **Default State** | ✅ Enabled |
| **Results Path** | Design artifacts saved to `.github-gstack-intelligence/state/results/$SLUG/designs/` |

---

## How to Use

**Option A — Label trigger:**
1. Open a new issue on your repository.
2. Add the `design-consultation` label.
3. The skill runs automatically and begins the consultation.

**Option B — Comment trigger:**
1. Open an issue describing the product or project you want a design system for.
2. Comment `/design-consultation` on the issue.

**Providing context:** Include any of the following in your issue body for richer results:
- What the product is and who it's for
- Project type (web app, dashboard, marketing site, editorial, internal tool)
- Whether you want competitive research ("research what top products in my space are doing")
- Any aesthetic preferences or constraints

---

## What It Does

The `/design-consultation` skill operates as a senior product designer with strong opinions about typography, color, and visual systems. It doesn't present menus — it listens, researches, and proposes a complete coherent system.

### Phase 0: Pre-checks
- Checks for an existing `DESIGN.md` — if found, asks whether to update, start fresh, or cancel.
- Gathers product context from `README.md`, `package.json`, and codebase structure.
- Looks for prior `/office-hours` output in `.github-gstack-intelligence/state/results/` for product direction context.
- If the codebase is empty and purpose unclear, suggests running `/office-hours` first.

### Phase 1: Product Context
- Asks a single comprehensive question covering product identity, audience, industry, and project type.
- Pre-fills what it can infer from the codebase and prior outputs.

### Phase 2: Research (optional)
- If requested, uses WebSearch to find 5–10 products in your space.
- Optionally visits top sites via Playwright for visual analysis (fonts, colors, layout, spacing).
- Synthesizes findings across three layers:
  - **Layer 1 (tried and true):** Category conventions users expect.
  - **Layer 2 (new and popular):** Trending patterns and emerging design discourse.
  - **Layer 3 (first principles):** Where convention should be deliberately broken for _this_ product.
- Surfaces "EUREKA" moments when first-principles reasoning reveals a genuine design insight.

### Phase 3: Complete Proposal
Proposes everything as one coherent package with SAFE/RISK breakdown:
- **Aesthetic direction** — from 10 possible directions (Brutally Minimal, Maximalist Chaos, Retro-Futuristic, Luxury/Refined, Playful/Toy-like, Editorial/Magazine, Brutalist/Raw, Art Deco, Organic/Natural, Industrial/Utilitarian).
- **Decoration level** — minimal, intentional, or expressive.
- **Layout approach** — grid-disciplined, creative-editorial, or hybrid.
- **Color palette** — approach + specific hex values with rationale.
- **Typography** — 3 font recommendations with roles (display, body, code) from a curated recommendation list. Blacklisted fonts (Papyrus, Comic Sans, etc.) and overused fonts (Inter, Roboto, Poppins, etc.) are never recommended as primary.
- **Spacing scale** — base unit + density level.
- **Motion approach** — functional, intentional, or expressive.
- **SAFE choices** that match category conventions.
- **RISK choices** that differentiate the product — always at least 2, each with clear rationale.

### Phase 4: Drill-downs
When adjustments are requested, dives deep into any specific section (fonts, colors, aesthetic, layout, spacing, motion) with focused alternatives and rationale.

### Phase 5: Design System Preview
- **Path A (AI Mockups):** If the gstack designer is available, generates AI-rendered mockups showing the design system applied to realistic product screens.
- **Path B (HTML Preview):** Generates a self-contained HTML preview page with Google Fonts, the proposed color palette, font specimens, realistic product mockups, and a light/dark mode toggle.

### Phase 6: Write DESIGN.md
Creates a comprehensive `DESIGN.md` at the repo root covering Product Context, Aesthetic Direction, Typography, Color, Spacing, Layout, Motion, and a Decisions Log. Also updates `CLAUDE.md` with a Design System reference section.

### Coherence Validation
When individual sections are overridden, the skill checks if the rest of the system still coheres and flags mismatches with gentle nudges — never blocking.

### Anti-patterns
The skill actively avoids "AI slop" patterns: purple/violet gradients, 3-column feature grids with icons in colored circles, centered-everything with uniform spacing, uniform bubbly border-radius, gradient buttons, and generic stock-photo hero sections.

---

## Example Output

```markdown
## Design Consultation — Issue #40

### Proposed Design System

**Aesthetic:** Technical minimalism — clean lines, monospace accents, dark-first

**Typography:**
- Headings: Inter, 600 weight, 1.2 line-height
- Body: Inter, 400 weight, 1.5 line-height
- Code: JetBrains Mono, 400 weight

**Color palette:**
- Primary: `#6366F1` (Indigo 500)
- Background: `#0F172A` (Slate 900)
- Neutrals: Slate 50 → Slate 900
- Semantic: Success `#22C55E`, Warning `#F59E0B`, Error `#EF4444`, Info `#3B82F6`

**Spacing scale:** 4px base — 4, 8, 12, 16, 24, 32, 48, 64

**Layout:** Grid-disciplined — 12-column at desktop, 4-column at mobile
**Motion:** Minimal-functional — transitions that aid comprehension only

**SAFE CHOICES:**
- Dark-first aesthetic (standard for developer tools)
- JetBrains Mono for code (category expectation)

**RISKS:**
- Tighter spacing density than typical dev tools → makes data feel denser, more professional
- Indigo primary instead of standard blue → subtle differentiation without alienating

_Preview page generated at `design-preview.html`_
_Design system saved to `DESIGN.md`_
```

---

## Configuration

In [`config.json`](../config.json):

```json
{
  "skills": {
    "design-consultation": {
      "enabled": true,
      "trigger": "issue_label",
      "label": "design-consultation"
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

- **Browser:** Not required. Optional Playwright browser enables visual competitive research (visiting competitor sites for screenshots and analysis). The skill works without it using WebSearch and built-in design knowledge.
- **Model:** Uses the model configured in `config.json` defaults (currently `gpt-5.4`).
- **Allowed tools:** Bash, Read, Write, Edit, Glob, Grep, WebSearch.

---

## Results

- **`DESIGN.md`** — Written to the repository root as the project's design source of truth.
- **`CLAUDE.md`** — Updated with a Design System reference section.
- **Design artifacts** — Mockups and previews saved to `.github-gstack-intelligence/state/results/$SLUG/designs/`.
- **HTML preview** — Self-contained preview page (if AI mockups are unavailable).

---

## Related Files

- **Skill prompt:** [`../skills/design-consultation.md`](../skills/design-consultation.md)
- **Config:** [`../config.json`](../config.json)
- **Router:** [`../lifecycle/router.ts`](../lifecycle/router.ts)
- **References:** [`../skills/references/`](../skills/references/)
- **Design checklist:** [`../skills/references/review-design-checklist.md`](../skills/references/review-design-checklist.md)

---

## See Also

- [`/design-review`](design-review.md) — Visual design audit on live sites and PRs (post-implementation)
- [`/plan-design-review`](plan-design-review.md) — Designer's-eye plan review before implementation
- [`/office-hours`](office-hours.md) — YC office hours for product direction (run before design consultation if product direction is unclear)
- [`/autoplan`](autoplan.md) — Full review pipeline that includes design review

---

[← Back to Command Reference](README.md)
