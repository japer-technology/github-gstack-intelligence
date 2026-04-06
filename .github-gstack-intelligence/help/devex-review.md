# `/devex-review` — Developer Experience Audit

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

**Specialist:** DX Engineer
**Trigger:** `/devex-review` comment on any issue
**Browser required:** Yes
**Default:** ✅ Enabled

---

## What It Does

`/devex-review` conducts a live developer experience audit. It actually tests the developer experience by navigating documentation, trying the getting started flow, timing the Time to Hello World (TTHW), taking screenshots of error messages, and evaluating CLI help text. The result is a DX scorecard with evidence.

Key capabilities:

- **Live testing** — Navigates real docs and tries real onboarding flows
- **TTHW measurement** — Times how long it takes from zero to a working first result
- **Error experience** — Screenshots and evaluates error messages, stack traces, and failure modes
- **CLI evaluation** — Tests help text, flag names, output formatting, and error handling
- **Boomerang scoring** — Compares actual results against `/plan-devex-review` predictions (e.g., plan said 3 minutes, reality says 8)
- **Evidence-based** — Every score is backed by screenshots and specific observations

---

## When To Use It

- After shipping a developer-facing feature (API, CLI, SDK, library)
- When you want to verify the getting started experience actually works
- After documentation changes to confirm they're accurate
- To audit an existing product's developer experience

---

## How To Trigger

Comment on any issue:

```
/devex-review
```

You can also say "test the DX", "DX audit", "developer experience test", or "try the onboarding".

---

## Example

```
/devex-review

Test the developer experience of our REST API. Start from the docs homepage,
try to get an API key, make a first request, and evaluate the error messages.
```

---

## The Boomerang

If you've already run `/plan-devex-review`, the devex-review will compare actual results against planned expectations:

```
/plan-devex-review → "TTHW should be under 3 minutes"
/devex-review      → "TTHW was actually 8 minutes — here's where developers get stuck"
```

This plan-then-verify loop surfaces the gap between what you designed and what developers actually experience.

---

## Related Commands

| Command | Relationship |
|---|---|
| [`/plan-devex-review`](plan-devex-review.md) | Plan the DX before testing it live |
| [`/qa`](qa.md) | General QA testing (devex-review is specifically for developer experience) |
| [`/design-review`](design-review.md) | Visual design audit (devex-review is for the developer workflow) |

---

## Configuration

```json
{
  "devex-review": { "enabled": true, "trigger": "issue_comment" }
}
```

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence" width="120">
  </picture>
</p>
