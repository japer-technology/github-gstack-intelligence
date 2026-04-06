# `/plan-devex-review` — Developer Experience Plan Review

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

**Specialist:** DX Strategist
**Trigger:** `/plan-devex-review` comment on any issue
**Browser required:** No
**Default:** ✅ Enabled

---

## What It Does

`/plan-devex-review` conducts an interactive developer experience plan review before you build. It explores developer personas, benchmarks against competitors, designs magical moments, and traces friction points — then scores every dimension. 

Three modes:

| Mode | When to use | Focus |
|---|---|---|
| **DX Expansion** | Building a new developer-facing product | Competitive advantage, magical moments, API elegance |
| **DX Polish** | Improving an existing product | Bulletproof every touchpoint, error messages, edge cases |
| **DX Triage** | Tight deadline or limited resources | Critical gaps only, highest-impact fixes |

---

## When To Use It

- Planning a developer-facing product (API, CLI, SDK, library, platform)
- Before writing documentation for a developer tool
- Reviewing API design before implementation
- When you want to benchmark your DX against competitors
- As input for `/devex-review` (the live verification step)

---

## How To Trigger

Comment on any issue:

```
/plan-devex-review
```

You can also say "DX review", "developer experience audit", "devex review", "API design review", or "onboarding review".

---

## Example

```
/plan-devex-review

We're building a REST API for third-party integrations. Review the plan
for developer experience — getting started flow, authentication, error messages,
rate limiting, and documentation.
```

---

## The Boomerang

`/plan-devex-review` generates predictions and scores. After building, run `/devex-review` to verify those predictions against reality:

```
/plan-devex-review → "TTHW should be under 3 minutes, error messages should be actionable"
[build the feature]
/devex-review      → "TTHW was 8 minutes, 2 error messages had no suggested fix"
```

This plan-then-verify loop is one of the most powerful patterns in the gstack methodology.

---

## DX Scoring Dimensions

The review scores each dimension on a 0–10 scale:

| Dimension | What it measures |
|---|---|
| **Time to Hello World** | How fast can a developer go from zero to a working first result? |
| **Error experience** | Are error messages actionable? Do they suggest fixes? |
| **API consistency** | Do naming, patterns, and conventions feel predictable? |
| **Documentation quality** | Can developers find what they need and understand it? |
| **Onboarding flow** | Does the getting started guide actually work step by step? |
| **Edge case handling** | What happens when developers do unexpected things? |

---

## Related Commands

| Command | Relationship |
|---|---|
| [`/devex-review`](devex-review.md) | Live verification of DX plan predictions |
| [`/plan-eng-review`](plan-eng-review.md) | Engineering architecture review (complements DX review) |
| [`/plan-design-review`](plan-design-review.md) | Visual design review (complements DX review) |
| [`/autoplan`](autoplan.md) | Includes DX review when developer-facing scope is detected |

---

## Configuration

```json
{
  "plan-devex-review": { "enabled": true, "trigger": "issue_comment" }
}
```

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence" width="120">
  </picture>
</p>
