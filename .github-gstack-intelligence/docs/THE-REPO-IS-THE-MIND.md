# The Repo Is the Mind: How GitHub GStack Intelligence Turns Any Repository into an AI Engineering Team

## Introduction

Every engineering team knows which practices they should be doing and aren't. Code review happens, but only when someone has time. Security audits happen quarterly if they happen at all. QA testing is manual and incomplete. Retrospectives are skipped. Release documentation is stale before the ink is dry. The practices that separate resilient codebases from fragile ones all share the same bottleneck: they require people, and people are expensive, busy, and finite.

GitHub GStack Intelligence eliminates the headcount constraint by taking a body of work that already exists — **gstack**, the AI engineering skill suite authored by Garry Tan, CEO of Y Combinator — and projecting it onto GitHub's native infrastructure so that any repository can run it without a local development environment. Tan built gstack as a collection of twenty-five specialist prompts that run inside Claude Code sessions: code review, security auditing, QA testing, performance benchmarking, planning, shipping, retrospectives, and more. Each skill encodes hard-won engineering judgment — the kind that comes from building Palantir's early engineering culture, co-founding Initialized Capital, leading Y Combinator, and personally advising thousands of startups on what to build and how to ship it. The skills are opinionated by design: they reflect a specific thesis about how software should be built in the age of AI-assisted development.

But gstack, in its native form, requires a developer sitting at a terminal with Claude Code running. GitHub GStack Intelligence is a different execution surface for the same intellectual property. It takes seventeen of gstack's twenty-five skills, adapts them for event-driven execution, and wires them into a single GitHub Actions workflow file. Issues become the conversational UI. Actions runners become the compute layer. Git commits become the persistence layer. Pages becomes the publishing surface. One file copied, one API key added, and the repository gains Garry Tan's engineering organization running on every event — every pull request reviewed, every deployment monitored, every Friday retrospective generated — without a developer needing to be in the loop at all.

---

## How It Works: Architecture in Brief

A single GitHub Actions workflow file listens for eight classes of GitHub events: new issues, issue comments, pull requests, pushes to the default branch, manual workflow dispatch, cron schedules, releases, and deployment status changes. A TypeScript router (`router.ts`) inspects each incoming event — its type, any slash-command prefix, attached labels, and the cron schedule that fired — and maps it to one of seventeen specialized skills. Each skill is a structured prompt that instructs an LLM to perform a specific engineering function: code review, security audit, QA testing, performance benchmarking, root-cause investigation, design audit, retrospective analysis, release documentation, deployment monitoring, planning review, and more.

The agent orchestrator (`agent.ts`) manages everything around the LLM call. It resolves or creates a per-issue conversation session from Git-committed state, builds a prompt with full context, streams the LLM response, posts the result as an issue or PR comment, and commits the session transcript back to the repository. Because sessions are ordinary files tracked in Git, the agent has full memory of every prior exchange on every issue — across workflow runs, across days, across weeks. A push-conflict retry loop with exponential backoff handles concurrent agents racing to commit.

The architecture's central insight is that it introduces no new infrastructure. The workflow file is the only installation artifact. Authorization gates tied to repository collaborator permissions ensure that on public repositories, only users with write access can consume LLM credits.

---

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

## Provenance: Garry Tan's gstack

To understand why these skills work, it helps to understand where they come from. gstack (`garrytan/gstack`) is Garry Tan's personal AI engineering toolkit — a collection of twenty-five structured skill prompts, an engineering ethos document, and a set of architectural conventions that together define how an AI coding agent should think, review, test, ship, and reflect. Tan is the CEO and President of Y Combinator, the most prolific startup accelerator in history, and before that co-founded Initialized Capital (early investor in Coinbase, Instacart, Flexport, and Cruise), was a partner at YC during its early growth years, and served as a designer and engineer at Palantir.

The skills in gstack are not generic LLM wrappers. They encode specific engineering opinions forged across decades of building and advising. The `/review` skill's checklist — SQL safety, race conditions, LLM trust boundaries, enum completeness — reflects the categories of bugs that actually take down production systems, not textbook classifications. The `/cso` skill's fourteen-phase audit begins with secrets archaeology and dependency supply chains because, as Tan's ethos document puts it, "the real attack surface isn't your code — it's your dependencies." The `/office-hours` skill runs six forcing questions modeled on the YC partner meeting format, designed to expose whether genuine demand exists before a line of code is written. The `/retro` skill generates retrospectives with per-contributor praise and growth areas because Tan believes engineering leadership means recognizing individual work, not just tallying velocity.

Every skill file committed into a GitHub GStack Intelligence installation carries a provenance marker: `Source: garrytan/gstack @ <commit-sha>`. A refresh workflow (`run-refresh-gstack`) pulls upstream changes from Tan's repository, validates the extracted files, and commits them — ensuring that as gstack evolves, every installation can stay current. The skills are the intellectual core; GitHub GStack Intelligence is the delivery mechanism.

This is what makes the project distinct from other AI coding agents. It is not a general-purpose chatbot. It is a *specific* engineering philosophy — Tan's — made executable and distributed through GitHub's existing infrastructure. The same skills that run in Tan's own Claude Code sessions run autonomously in any repository that copies the workflow file. The quality of the output is bounded by the quality of the prompts, and the prompts are authored by someone whose career has been dedicated to understanding what separates software that ships from software that doesn't.

---

## Usage Scenario 1: The Solo Founder

A solo technical founder writes code alone. No one reviews the SQL query she wrote at 2 AM. No one notices that a new enum value was added to the API but never handled in the frontend switch statement. No one catches the `await` she forgot on a payment webhook handler.

With GStack Intelligence installed, every pull request automatically triggers the `/review` skill, which analyzes the diff for SQL injection risks, race conditions, LLM trust boundary violations, shell injection, and incomplete enum handling. Critically, the review reads code *outside* the diff — when a new status constant appears, the agent greps the entire codebase for sibling values and checks every switch, map, and conditional that references them. This is the class of bug that catches fire in production precisely because it passes all existing tests.

When she is ready to ship, a `/ship` comment on the issue triggers a fully automated pipeline: merge the base branch, run tests, execute a pre-landing review, bump the version, update the changelog, commit, push, and open a pull request. She gets a PR URL back. After the release is published, the `/document-release` skill fires automatically, reading every documentation file in the repository, cross-referencing it against the shipped diff, and committing updates. READMEs, architecture docs, and contribution guides stay accurate without anyone remembering to edit them.

### Simulated Interaction

> **The founder opens PR #34:** *Add subscription tier to billing module*
>
> The workflow fires on `pull_request.opened`. The router matches the event to the `/review` skill. Within minutes:

```
🚀 (rocket reaction appears on the PR)
```

> **GStack Intelligence posts a PR comment:**
>
> **Pre-Landing Review — PR #34**
>
> **CRITICAL — Enum Completeness (1 finding)**
> `src/billing/plans.ts:42` adds `ENTERPRISE` to `SubscriptionTier` but
> `src/api/middleware/rate-limit.ts:18` has a switch on `SubscriptionTier`
> that does not handle `ENTERPRISE`. Requests from enterprise users will
> fall through to the default case and receive free-tier rate limits.
>
> **CRITICAL — SQL Safety (1 finding)**
> `src/billing/queries.ts:71` interpolates `planName` directly into a SQL
> string. Use a parameterized query: `db.query('SELECT * FROM plans WHERE name = $1', [planName])`
>
> **INFORMATIONAL — Async/Sync Mixing (1 finding)**
> `src/billing/webhook.ts:33` calls `processPayment()` without `await`.
> The return value is a dangling Promise.
>
> 2 critical, 1 informational. Recommend addressing critical items before merge.

```
👍 (thumbs-up reaction replaces rocket)
```

> The founder fixes both critical findings, pushes, and comments `/ship`.
> The agent runs tests, bumps VERSION to 1.4.1, updates CHANGELOG.md,
> and posts: **"Shipped. PR ready to merge: https://github.com/.../pull/35"**

---

## Usage Scenario 2: Security-Conscious Teams

Fintech companies, healthcare platforms, and government contractors need security audits — not the checkbox kind, but the kind that finds the real doors that are actually unlocked. The `/cso` (Chief Security Officer) skill runs a fourteen-phase audit: secrets archaeology through git history, dependency supply chain analysis, CI/CD pipeline security review, LLM trust boundary scanning, OWASP Top 10 verification, and STRIDE threat modeling. It thinks like an attacker but reports like a defender.

The skill activates automatically when a pull request carries the `security-audit` label. A team lead who wants every PR touching the authentication module audited simply configures a labeling rule. Two operational modes — daily (8/10 confidence gate, zero-noise) and comprehensive (2/10 threshold, surfaces everything) — let teams tune the signal-to-noise ratio. The `--diff` flag constrains scanning to files changed on the current branch, so feature-branch security reviews don't carry the cost of a full repository scan.

### Simulated Interaction

> **A developer opens PR #112:** *Add OAuth2 PKCE flow for mobile clients*
> **Labels:** `security-audit`
>
> The workflow fires on `pull_request.opened`. The router sees the
> `security-audit` label and routes to the `/cso` skill instead of `/review`.

```
🚀 (rocket reaction appears on the PR)
```

> **GStack Intelligence posts a PR comment:**
>
> **Security Posture Report — PR #112 (daily mode, 8/10 confidence gate)**
>
> **Phase 2 — Secrets Archaeology**
> FINDING [HIGH | 9/10]: Commit `a3f8c21` (2025-11-14) contains
> `OAUTH_CLIENT_SECRET=sk-live-...` in `src/auth/config.example.ts`.
> The value matches a production secret pattern. Even though the file
> is named `.example`, the secret is real. Rotate immediately.
> Remediation: `gh secret set OAUTH_CLIENT_SECRET`, remove from git
> history with `git filter-repo`.
>
> **Phase 7 — OWASP Top 10 (A07:2021 — Identification and Authentication Failures)**
> FINDING [MEDIUM | 8/10]: The PKCE `code_verifier` in
> `src/auth/pkce.ts:23` uses `Math.random()` for token generation.
> `Math.random()` is not cryptographically secure. Use
> `crypto.getRandomValues()` or Node's `crypto.randomBytes()`.
>
> **Phase 9 — LLM/AI Trust Boundary**
> No LLM integration detected in changed files. Skipped.
>
> **Summary:** 1 high, 1 medium, 0 low. Recommend rotating the exposed
> secret before merging.

```
👍 (thumbs-up reaction replaces rocket)
```

---

## Usage Scenario 3: QA Without a QA Team

The `/qa` skill launches a real Chromium browser via Playwright inside the GitHub Actions runner, navigates the application under test, clicks through pages, fills forms, checks console output, and produces a structured bug report with severity ratings. Then it does something no traditional QA report does: it *fixes* the bugs it found directly in source code, commits each fix atomically, and re-verifies. The output is a before/after health score with per-bug fix evidence and commit links.

For teams that deploy preview environments on every PR — Vercel, Netlify, Railway — this unlocks automated QA on every deployment. A developer opens a PR, the preview deploys, and they comment `/qa https://preview-url.example.com`. Three tiers control depth: Quick (critical and high severity only), Standard (adds medium), and Exhaustive (adds cosmetic). A companion skill, `/design-review`, operates in the same browser-driven mode but through a designer's eye — auditing typography, spacing, visual hierarchy, and what the skill calls "AI slop," the generic aesthetic that plagues AI-generated interfaces. If a `DESIGN.md` exists, every finding is calibrated against the project's stated design system.

### Simulated Interaction

> **On Issue #67 (tracking the checkout redesign), a developer comments:**
>
> `/qa https://checkout-preview-pr89.vercel.app --exhaustive`

```
🚀 (rocket reaction appears on the comment)
```

> **GStack Intelligence posts a reply on Issue #67:**
>
> **/qa Report — checkout-preview-pr89.vercel.app (Exhaustive tier)**
>
> **Before Health Score: 62/100**
>
> | # | Severity | Page | Bug | Status |
> |---|----------|------|-----|--------|
> | 1 | CRITICAL | /checkout | "Place Order" button submits twice on double-click — duplicate charges created | Fixed → commit `b4e1a93` |
> | 2 | HIGH | /checkout/payment | Stripe card element overflows container on mobile (< 375px) | Fixed → commit `c82f4d1` |
> | 3 | MEDIUM | /checkout/confirm | Success toast appears behind the modal overlay (z-index conflict) | Fixed → commit `d19e503` |
> | 4 | MEDIUM | /cart | Quantity input accepts negative numbers — cart total goes negative | Fixed → commit `e7a2b16` |
> | 5 | LOW | /checkout | Tab order skips the "Apply coupon" field | Fixed → commit `f330c89` |
> | 6 | COSMETIC | /checkout/confirm | Order summary heading is 14px, rest of page uses 16px body text | Fixed → commit `a91d7e2` |
>
> **After Health Score: 94/100**
>
> 6 bugs found, 6 fixed, all verified after fix. Commits pushed to branch
> `feature/checkout-redesign`. Ready for re-review.

```
👍 (thumbs-up reaction replaces rocket)
```

---

## Usage Scenario 4: Engineering Leadership and Retrospectives

Every Friday at 5 PM UTC, a cron trigger fires. No one needs to remember. The `/retro` skill analyzes the past week's commit history, contributor patterns, and code quality metrics, then generates a team-aware retrospective. It identifies every contributor, quantifies per-person output with specific praise and growth opportunities, and tracks trends across weeks.

For an engineering manager running a distributed team, this replaces the manual labor of preparing sprint retrospectives with data drawn from the commit log — objective, consistent, and reproducible. Week-over-week trends emerge: is PR cycle time improving? Is one engineer carrying a disproportionate share? Has test coverage regressed? The retrospective surfaces patterns that status meetings miss.

A parallel skill, `/benchmark`, provides the same longitudinal tracking for performance. It measures page load times, Core Web Vitals, and bundle sizes, establishes baselines, and alerts on regressions. Run daily via cron, it catches the slow degradation pattern — 50 milliseconds added here, 20 kilobytes there — that no individual PR review would flag but that, compounded over months, makes an application unusably slow.

### Simulated Interaction

> **Friday, 5:00 PM UTC. The cron trigger fires. No human action required.**
>
> The router matches the schedule `0 17 * * 5` to the `/retro` skill.
> The agent creates a new issue automatically:

> **Issue #203 (opened by github-actions[bot]):** *Weekly Retrospective — Mar 27 – Apr 2, 2026*
>
> **GStack Intelligence posts:**
>
> **/retro — Engineering Retrospective (7 days)**
>
> **Team Summary**
> 4 contributors · 47 commits · +3,812 / −1,204 lines · 12 PRs merged
>
> **@alice (23 commits, 62% of team output)**
> Shipped the entire checkout redesign (PRs #85–#89) including payment
> integration, mobile responsive layout, and error handling. Test
> coverage for `src/checkout/` went from 34% → 91%. Strongest week
> this quarter.
> *Growth:* 3 commits had force-pushes that rewrote PR history —
> consider smaller, incremental commits to preserve review context.
>
> **@bob (14 commits)**
> Closed 4 long-standing bugs from the backlog (#142, #156, #161, #170).
> Each fix included a regression test. Clean, methodical work.
> *Growth:* Average PR sat 18 hours before merge — consider
> self-merging non-controversial fixes after CI passes.
>
> **@carol (7 commits)**
> Set up the monitoring dashboard and Grafana integration. First
> infrastructure contribution — solid start.
>
> **@dave (3 commits)**
> Documentation updates only this week. No code changes.
>
> **Trends vs. Last Week**
> Commit volume: ↑ 22% · Lines changed: ↑ 41% · PRs merged: ↑ 3 ·
> Average PR cycle time: ↓ 4 hours (improvement)
>
> **Risks**
> `src/billing/` has zero test coverage and was modified in 6 commits
> this week. Recommend running `/qa` against the billing flow.

---

## Usage Scenario 5: Post-Deployment Monitoring

Deploys that pass CI break in production all the time. A missing environment variable. A stale CDN cache serving yesterday's assets. A database migration that runs fine on the staging dataset but crawls on real data. The `/canary` skill is the safety net between "shipped" and "verified."

When a deployment status webhook fires with `state: success`, the agent launches a Chromium instance, navigates to the production URL, takes screenshots, checks for console errors, measures page load times, and compares everything against pre-deployment baselines captured during an earlier `--baseline` run. Regressions are flagged with specific commit attribution. For teams practicing continuous deployment, this is the automated verification step that runs in the first ten minutes — not the first ten hours when a customer reports the problem.

### Simulated Interaction

> **A deployment to production succeeds. The `deployment_status` webhook fires
> with `state: success`. No human action required.**
>
> The router matches the event to the `/canary` skill. The agent opens
> a Chromium instance on the Actions runner and begins monitoring.

> **GStack Intelligence creates Issue #210:**
> *Canary Report — Deploy `v1.4.1` to production (2026-04-02T14:32Z)*
>
> **Monitoring Duration:** 10 minutes · **Pages Checked:** 6
>
> | Page | Load Time | Baseline | Delta | Console Errors | Status |
> |------|-----------|----------|-------|----------------|--------|
> | `/` | 420ms | 390ms | +30ms | 0 | OK |
> | `/dashboard` | 1,840ms | 680ms | **+1,160ms** | 0 | **REGRESSION** |
> | `/settings` | 310ms | 290ms | +20ms | 0 | OK |
> | `/checkout` | 510ms | 480ms | +30ms | 0 | OK |
> | `/api/health` | 45ms | 40ms | +5ms | 0 | OK |
> | `/billing` | 620ms | 590ms | +30ms | 2 | **WARNING** |
>
> **ALERT — `/dashboard` load time regression (+170%)**
> Baseline: 680ms → Current: 1,840ms. The `getAnalytics` API call
> now takes 1,400ms (was 220ms). Likely cause: the new `GROUP BY`
> clause in commit `e4a1b23` is doing a sequential scan. Check for
> a missing index on `analytics.created_at`.
>
> **WARNING — `/billing` console errors (2)**
> `TypeError: Cannot read property 'plan' of undefined` at
> `billing-summary.tsx:44`. The `user.subscription` object is `null`
> for users on the free tier. This was introduced in PR #108.
>
> **Verdict:** Deploy is partially degraded. Dashboard performance
> regression requires investigation. Billing console error is
> non-blocking but should be patched.

---

## Usage Scenario 6: Bug Investigation

A user files a bug report: "the dashboard crashes after upgrading to v1.4.1." The maintainer adds the `investigate` label. The agent activates the systematic debugging skill, which enforces an "Iron Law": no fixes without root cause investigation first. Fixing symptoms creates whack-a-mole debugging, so the agent traces the code path from the symptom backward, checks recent git history for regressions, narrows to a hypothesis, verifies it, and only then implements a fix with a regression test.

For open-source maintainers fielding dozens of bug reports from users who cannot provide deeper context than a stack trace, the investigation skill functions as a first-responder. It performs the tedious triage — diffing between working and broken versions, reading the relevant code paths, identifying the exact commit that introduced the regression — and posts its findings as an issue comment, often with the fix already committed.

### Simulated Interaction

> **A user opens Issue #215:**
> *Dashboard crashes after upgrading to v1.4.1*
>
> "After updating to the latest version, the dashboard page shows a white
> screen. Browser console says `TypeError: Cannot read property 'map' of
> undefined` in `analytics-chart.tsx`. It was working fine on v1.3.9."
>
> **Labels:** `investigate`

```
🚀 (rocket reaction appears on the issue)
```

> **GStack Intelligence posts a reply on Issue #215:**
>
> **/investigate — Root Cause Analysis**
>
> **Phase 1: Symptom Collection**
> Error: `TypeError: Cannot read property 'map' of undefined` at
> `src/dashboard/analytics-chart.tsx:67`
> Affected version: v1.4.1 (working in v1.3.9)
>
> **Phase 2: Recent Changes**
> ```
> git log --oneline v1.3.9..v1.4.1 -- src/dashboard/
> e4a1b23 refactor: optimize analytics query with GROUP BY
> f891c44 feat: add date range picker to dashboard
> ```
> Two commits touched the dashboard between working and broken versions.
>
> **Phase 3: Root Cause**
> Commit `e4a1b23` changed the API response shape from:
> ```json
> { "data": [{ "date": "...", "count": 5 }] }
> ```
> to:
> ```json
> { "data": { "daily": [{ "date": "...", "count": 5 }] } }
> ```
> The frontend at `analytics-chart.tsx:67` calls `response.data.map()`
> but `response.data` is now an object, not an array. The correct
> access is `response.data.daily.map()`.
>
> **Phase 4: Fix**
> Committed fix in `a44bc91`: updated `analytics-chart.tsx` to read
> from `response.data.daily` and added a regression test in
> `analytics-chart.test.tsx` that verifies the component renders
> with the new response shape.
>
> Root cause: API response shape change without corresponding
> frontend update. Both files were modified in the same PR but the
> frontend change was missed.

```
👍 (thumbs-up reaction replaces rocket)
```

---

## Usage Scenario 7: Planning and Review Pipelines

Before a line of code is written, the ideas need pressure-testing. GStack Intelligence offers a full planning pipeline rooted in Tan's experience running YC partner meetings. The `/office-hours` skill runs a YC-style brainstorming session — six forcing questions that expose demand reality, the quality of the founder's observation, and specificity of the wedge — the same interrogation pattern Tan uses when evaluating startups. The `/plan-ceo-review` skill stress-tests scope and ambition with Tan's "Mega Plan Review" methodology, asking whether the plan is thinking big enough and whether the premises are sound. The `/plan-eng-review` and `/plan-design-review` skills evaluate architecture feasibility and user experience respectively.

The `/autoplan` skill collapses this entire pipeline into a single command. It reads all three review skill files from disk and executes them sequentially at full depth — same rigor, same methodology — with intermediate decisions auto-resolved by six principles: choose completeness, fix everything in the blast radius, be pragmatic, don't duplicate existing functionality, prefer explicit over clever, and bias toward action. Only genuine taste decisions — where reasonable people could disagree — surface for human approval at a final gate. One command in, fully reviewed plan out.

### Simulated Interaction

> **A developer opens Issue #220:**
> *Plan: Add team workspaces with shared billing*
>
> "Users should be able to create a workspace, invite team members, and
> share a single billing subscription. Admins manage seats. Members
> inherit the workspace plan. Need role-based access: owner, admin, member, viewer."
>
> **The developer comments:**
>
> `/autoplan`

```
🚀 (rocket reaction appears on the comment)
```

> **GStack Intelligence posts a reply on Issue #220:**
>
> **/autoplan — Full Review Pipeline**
>
> ---
>
> **CEO Review Phase (product & business)**
>
> AUTO-DECIDED: Include viewer role (Principle 1: choose completeness).
> AUTO-DECIDED: Workspace creation should be available on all paid tiers,
> not just Enterprise (Principle 6: bias toward action — don't gate
> growth features).
> AUTO-DECIDED: Seat-based pricing over flat-rate (Principle 3:
> pragmatic — aligns with SaaS industry standard, less custom billing logic).
>
> **Engineering Review Phase (architecture)**
>
> AUTO-DECIDED: Use a `workspace_memberships` join table rather than
> a JSONB column on the user (Principle 5: explicit over clever).
> AUTO-DECIDED: Add `workspace_id` foreign key to existing `billing_subscriptions`
> table instead of creating a new `workspace_billing` table
> (Principle 4: DRY — reuse existing billing infra).
> AUTO-DECIDED: Blast radius includes `src/auth/`, `src/billing/`,
> `src/api/middleware/` — scope expansion approved (Principle 2:
> boil lakes, < 5 files, no new infrastructure).
>
> **Design Review Phase (UX)**
>
> AUTO-DECIDED: Workspace switcher in the sidebar, not a dropdown
> in the header (Principle 5: explicit — always visible, no hidden
> navigation).
>
> ---
>
> **Taste Decisions (require human input)**
>
> 1. **Workspace deletion policy:** Should deleting a workspace
>    cancel the subscription immediately, or at end of billing cycle?
>    Both are defensible. CEO phase leans toward end-of-cycle (less
>    churn friction); Eng phase leans toward immediate (simpler state
>    machine). *Your call.*
>
> 2. **Member invitation flow:** Email invite link vs. shareable
>    join code? Email is more secure; join code is faster for small
>    teams. Design phase flagged this as a close call.
>
> Reply with your choices and I'll finalize the plan.

```
👍 (thumbs-up reaction replaces rocket)
```

> **The developer replies:**
>
> "End of billing cycle for deletion. Email invite links — security matters more."
>
> **GStack Intelligence posts the final plan** with all decisions
> resolved, implementation steps ordered, and file-level change
> specifications ready for development.

---

## The Compound Effect: Skills That Reference Each Other

The scenarios above present each skill in isolation, but the real power of the system emerges when they interact. The canary detects a performance regression on `/dashboard` after a deploy. The weekly retro reports that `src/billing/` has zero test coverage despite heavy modification. A developer opens an `investigate` issue citing the canary's findings. The investigation skill reads the canary report from committed state, narrows to the offending commit, and posts a fix. The next `/review` on the fix PR checks for the same class of error across the codebase. The next `/retro` reports that the regression was caught, fixed, and test-covered within one business day.

None of this coordination is hard-coded. It arises naturally because every skill writes its outputs to Git and every skill reads the repository for context before acting. The session state directory, the results directory, and the memory log form a shared knowledge base that accumulates over time. A month into using GStack Intelligence, the repository contains not just the source code but a complete, version-controlled record of every review finding, every security audit, every QA report, every retrospective — all searchable with `git log` and all traceable with `git blame`.

This is what the project means when it says "the repo is the mind." The `.gitattributes` file configures `memory.log` with a union merge driver so that parallel agent runs can append to the same log without conflicts. Git is not merely the version control system for the code; it is the persistence layer for the agent's memory, decisions, and institutional knowledge. The repository becomes a living artifact — part software, part engineering journal.

---

## The Broader Implication

Tan's gstack ETHOS document — committed into every installation — articulates the thesis plainly: "A single person with AI can now build what used to take a team of twenty." It provides compression ratios that he has observed in practice — 100x for scaffolding, 50x for test writing, 30x for feature implementation — and argues that the engineering barrier to completeness has collapsed. What remains is taste, judgment, and the willingness to do the complete thing. This is not an abstract prediction; it is the operating philosophy of a person who runs Y Combinator and sees the evidence across hundreds of portfolio companies simultaneously.

GitHub GStack Intelligence operationalizes this philosophy by making completeness the default rather than an aspiration. Running a security audit on every PR costs an Actions minute, not a consultant's invoice. Generating a weekly retrospective costs a cron trigger, not a manager's afternoon. QA testing with a real browser costs a Playwright session on a runner, not a QA engineer's sprint. The economics invert: the cost of *skipping* these practices — a production incident, a security breach, a month of invisible performance degradation — dwarfs the cost of running them automatically.

Tan's ETHOS calls this principle "Boil the Lake" — when the marginal cost of completeness is near-zero, do the complete thing every time. A lake is boilable: 100% test coverage for a module, a full security audit on every PR, a design review on every frontend change. An ocean is not: rewriting the entire system from scratch. Boil lakes. Flag oceans as out of scope. With AI-assisted tooling, the last 10% of completeness that teams have historically skipped — because it was expensive in human time — now costs seconds.

But the system also enforces a crucial constraint that the ETHOS labels "User Sovereignty," citing Andrej Karpathy's "Iron Man suit" philosophy and Simon Willison's warning that "agents are merchants of complexity." AI models recommend, users decide. The agent never merges a PR on its own. The `/autoplan` skill auto-resolves routine decisions but surfaces taste decisions for human judgment. The `/ship` skill halts for merge conflicts, test failures, and version bump choices. The agent is an augmentation layer, not an autonomous drone. The human stays in the loop precisely at the points where judgment, context, and taste matter most. This balance — aggressive automation of the routine, strict deference on the consequential — reflects a philosophy that could only come from someone who has watched thousands of startups succeed and fail on exactly these tradeoffs.

---

## Conclusion

GitHub GStack Intelligence is not a chatbot bolted onto a repository. It is a specific execution surface for a specific body of engineering knowledge — Garry Tan's gstack — projected onto GitHub's native primitives so that it runs without local tooling, without subscriptions, and without anyone remembering to invoke it. The skills are Tan's. The ethos is Tan's. The opinions about what constitutes a thorough code review, a meaningful retrospective, a real security audit — those are Tan's, refined across a career that spans Palantir, Initialized Capital, and Y Combinator. What this project contributes is the delivery mechanism: a single workflow file that maps those skills onto GitHub events, uses Git for memory, Actions for compute, Issues for conversation, and Pages for publishing.

Seventeen skills cover the full development lifecycle: from brainstorming (`/office-hours`) through planning (`/autoplan`), development (`/review`, `/investigate`), testing (`/qa`, `/design-review`, `/benchmark`), security (`/cso`), shipping (`/ship`, `/document-release`), deployment verification (`/canary`), and organizational learning (`/retro`). As gstack evolves upstream, a refresh workflow pulls the latest skill definitions and commits them — every installation stays current with Tan's latest thinking.

The practical consequence is radical: any repository on GitHub — public or private, one person or one hundred — can gain access to the engineering practices of a YC-grade team. Not as a product demo that works for a week. Not as a pilot that needs an internal champion. As a workflow file that runs on every event, accumulates institutional knowledge in every commit, and keeps running as long as the repository exists. The barrier to a complete engineering process has dropped from "hire a team" to "copy a file." The mind behind the process is Garry Tan's. The execution surface is GitHub. The repository is the mind.
