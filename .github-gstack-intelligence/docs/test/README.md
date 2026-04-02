# GStack Intelligence — Definitive Test Plan

Comprehensive functional tests to validate all 17 skills, routing logic, session
management, result persistence, browser integration, and safety guards.

> **Scope:** These tests are designed to run in a **test repository** that has
> GStack Intelligence installed. They cover both the unit-testable TypeScript
> modules and end-to-end integration through the GitHub Actions workflow.

---

## Prerequisites

| Requirement | Detail |
|---|---|
| Test repository | A dedicated repo with the GStack Intelligence workflow installed |
| API key | A valid `OPENAI_API_KEY` (or whichever provider is configured in `.pi/settings.json`) set as a repository secret |
| GitHub CLI (`gh`) | Authenticated with write access to the test repo |
| Bun runtime | v1.0+ for running unit tests (`bun test`) |
| Playwright (optional) | Only needed for browser skill integration tests (`/qa`, `/qa-only`, `/design-review`, `/canary`) |
| Labels | Create labels: `security-audit`, `design-review`, `investigate`, `office-hours`, `design-consultation` |

---

## Test Structure

| # | File | What it validates |
|---|---|---|
| 01 | [01-ROUTING.md](01-ROUTING.md) | Event → skill routing for all 17 skills |
| 02 | [02-REVIEW-SECURITY.md](02-REVIEW-SECURITY.md) | PR review and CSO security audit end-to-end |
| 03 | [03-BROWSER-QA.md](03-BROWSER-QA.md) | QA, QA-only, design-review, canary browser skills |
| 04 | [04-CONVERSATIONS.md](04-CONVERSATIONS.md) | Multi-turn conversation skills and session continuity |
| 05 | [05-SCHEDULED-EVENTS.md](05-SCHEDULED-EVENTS.md) | Schedule, release, deployment_status event handling |
| 06 | [06-SHIP-AUTOPLAN.md](06-SHIP-AUTOPLAN.md) | `/ship` workflow and `/autoplan` pipeline |
| 07 | [07-STATE-PERSISTENCE.md](07-STATE-PERSISTENCE.md) | Session mapping, result files, push conflict retry |
| 08 | [08-SAFETY-GUARDS.md](08-SAFETY-GUARDS.md) | Bot-loop prevention, reserved prefixes, disabled skills, access control |
| 09 | [09-BROWSER-UTILS.md](09-BROWSER-UTILS.md) | `browser.ts` CLI utility integration tests |

---

## How to Run

### Unit Tests (instant, no API key needed)

```bash
cd .github-gstack-intelligence
bun test
```

This runs all `*.test.ts` files including `router.test.ts` and `browser.test.ts`.

### Integration Tests (require API key + GitHub Actions)

Each document below contains step-by-step instructions using `gh` CLI commands
to trigger the workflow and verify outcomes. The general pattern is:

1. **Trigger** — Create an issue, comment, PR, or dispatch the workflow
2. **Observe** — Wait for the workflow run to complete
3. **Verify** — Check for the expected comment, result file, label, or state change

### Automated Test Script

A helper script is provided for batch execution:

```bash
# Run all unit + integration routing tests
bun .github-gstack-intelligence/docs/test/scripts/run-tests.ts
```

---

## Test Naming Convention

Each test case is tagged with a unique ID for traceability:

- `RT-xxx` — Routing tests
- `RV-xxx` — Review tests
- `SC-xxx` — Security (CSO) tests
- `QA-xxx` — QA/browser tests
- `CV-xxx` — Conversation tests
- `SE-xxx` — Scheduled/event tests
- `SP-xxx` — Ship/autoplan tests
- `ST-xxx` — State persistence tests
- `SG-xxx` — Safety guard tests
- `BU-xxx` — Browser utility tests

---

## Exit Criteria

All skills are considered **fully functional** when:

1. ✅ Every routing path produces the correct `RouteResult` (unit tests pass)
2. ✅ Every skill responds with a substantive comment when triggered end-to-end
3. ✅ Result files are persisted in the correct `state/results/` subdirectory
4. ✅ Session continuity works across multiple comments on the same issue
5. ✅ Browser skills produce screenshots and health reports
6. ✅ Safety guards prevent bot loops, honour disabled skills, and enforce access control
7. ✅ Push conflict resolution successfully retries and commits state
