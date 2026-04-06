# `/health` — Code Quality Dashboard

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

**Specialist:** Quality Engineer
**Trigger:** `/health` comment on any issue
**Browser required:** No
**Default:** ✅ Enabled

---

## What It Does

`/health` generates a code quality dashboard by wrapping your project's existing tools — type checker, linter, test runner, dead code detector, and shell linter — and computing a weighted composite score from 0 to 10. It tracks trends over time so you can see whether quality is improving or degrading.

Key capabilities:

- **Tool discovery** — Automatically detects and runs your project's existing quality tools
- **Composite scoring** — Weighted 0–10 score across all quality dimensions
- **Trend tracking** — Compares current results against historical baselines
- **Actionable output** — Identifies the highest-impact improvements for raising the score

---

## What It Checks

| Dimension | Tools Used | Weight |
|---|---|---|
| Type safety | TypeScript (`tsc`), Flow, MyPy | High |
| Lint cleanliness | ESLint, Prettier, Rubocop, Clippy | Medium |
| Test health | Jest, Vitest, pytest, RSpec | High |
| Dead code | `ts-prune`, custom detection | Low |
| Shell safety | ShellCheck | Low |

The specific tools used depend on what's configured in your project. The health check adapts to your stack.

---

## When To Use It

- Regular codebase health monitoring
- Before a major release to assess quality
- After a sprint to measure improvement
- When onboarding to a new codebase to understand its state

---

## How To Trigger

Comment on any issue:

```
/health
```

You can also say "health check", "code quality", "how healthy is the codebase", "run all checks", or "quality score".

---

## Example

```
/health

Run a full code quality check and tell me the top 3 things we should fix
before the v2.0 release.
```

---

## Related Commands

| Command | Relationship |
|---|---|
| [`/benchmark`](benchmark.md) | Performance health (vs `/health` for code quality) |
| [`/retro`](retro.md) | Retrospective includes quality trends over time |
| [`/review`](review.md) | Per-PR quality gates (vs `/health` for whole-codebase assessment) |

---

## Configuration

```json
{
  "health": { "enabled": true, "trigger": "issue_comment" }
}
```

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence" width="120">
  </picture>
</p>
