# Workflows — Step-by-Step Recipes for Common Scenarios

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

> Practical, copy-paste workflows that combine GStack Intelligence commands into end-to-end engineering processes. Each recipe shows the exact sequence of actions for a specific scenario.

---

## How to Read These Workflows

Each workflow shows:
- **When to use it** — the scenario this workflow addresses
- **Prerequisites** — what you need before starting
- **Steps** — numbered actions with the exact commands to run
- **What happens** — what the system does at each step
- **Success criteria** — how you know the workflow completed successfully

---

## Workflow 1: Greenfield Feature — From Idea to Production

**When to use:** You have a new feature idea and want to take it from concept to shipped code with full engineering rigor.

**Prerequisites:** GStack Intelligence installed, a running web app (for QA), access to a staging environment.

### Steps

**Phase 1: Discovery**

1. Open a GitHub issue with the title: "Feature: [your feature description]"
2. In the issue body, describe what you want to build, who it's for, and why it matters
3. Add the `office-hours` label to the issue
4. Answer the diagnostic questions in the agent's response
5. Read the design document the agent produces — this is your product foundation

**Phase 2: Planning**

6. Comment `/autoplan` on the same issue
7. Answer the premise challenge questions (the ONE question that's never auto-decided)
8. Select a scope mode (SCOPE EXPANSION, SELECTIVE EXPANSION, HOLD SCOPE, or SCOPE REDUCTION)
9. Review the CEO review findings — scope, strategy, dream state mapping
10. Review the Design review findings — information architecture, interaction states, responsive specs
11. Review the Engineering review findings — architecture diagrams, test coverage map, failure modes
12. Approve taste decisions at the final approval gate
13. Read the Decision Audit Trail for a record of every automated decision

**Phase 3: Implementation**

14. Create a feature branch: `git checkout -b feature/your-feature`
15. Implement the plan — use the plan file as your specification
16. Open a pull request — `/review` triggers automatically
17. Address any CRITICAL findings from the review
18. If the feature touches auth, payments, or user data: add the `security-audit` label for `/cso`
19. If the feature has UI: add the `design-review` label for visual QA

**Phase 4: Quality Assurance**

20. Deploy to staging
21. Comment `/qa https://staging.myapp.com` on the issue to test with a real browser
22. Review the before/after health scores and fix evidence

**Phase 5: Ship**

23. Comment `/ship` on the issue
24. The agent merges base branch, runs tests, executes pre-landing review, bumps version, updates changelog, creates PR
25. Review the ship report and merge the PR
26. Publish a release — `/document-release` fires automatically

**Phase 6: Verify**

27. After deployment: comment `/canary https://myapp.com` to monitor production
28. Verify HEALTHY status

**Success criteria:** Ship report shows all tests passing, review clean, documentation synced, canary HEALTHY.

---

## Workflow 2: Bug Fix — From Report to Verified Fix

**When to use:** A bug is reported in production and you need to investigate, fix, verify, and ship the fix.

**Prerequisites:** A GitHub issue describing the bug with error messages and reproduction steps.

### Steps

1. Open (or update) a GitHub issue with the bug report — include error messages, stack traces, and reproduction steps
2. Add the `investigate` label to the issue
3. The `/investigate` skill runs the 4-phase methodology:
   - Phase 1: Root cause investigation (collect symptoms, read code, check recent changes, reproduce)
   - Phase 2: Pattern analysis (race condition? nil propagation? configuration drift?)
   - Phase 3: Hypothesis testing (3-strike rule — stops after 3 failed hypotheses)
   - Phase 4: Implementation (fix + regression test + full test suite)
4. Review the debug report — root cause, fix, evidence, regression test
5. Comment `/ship` on the issue to ship the fix
6. After deployment: comment `/canary https://myapp.com` to verify the fix in production

**Success criteria:** Debug report shows DONE status with regression test, ship report clean, canary HEALTHY.

---

## Workflow 3: Security Hardening Sprint

**When to use:** You want to systematically audit and improve your repository's security posture.

### Steps

1. Open a GitHub issue: "Security Hardening Sprint"
2. Comment `/cso --comprehensive` for a full deep scan (2/10 confidence bar — surfaces everything)
3. Review the Security Posture Report — all 14 audit phases
4. Create a branch for security fixes
5. Fix issues in priority order: Critical → High → Medium → Low
6. Open a PR with the fixes — `/review` triggers automatically
7. Add the `security-audit` label to the PR for a focused re-audit
8. Comment `/cso --diff` on the issue to verify only your changes (no noise from existing issues)
9. Comment `/ship` when the audit is clean

**For ongoing security:** Run `/cso` on every PR that touches auth, payments, or user data by adding the `security-audit` label.

**Success criteria:** Security Posture Report shows no Critical or High findings in daily mode (8/10 confidence gate).

---

## Workflow 4: Design System Setup

**When to use:** You're starting a new project or want to establish a cohesive design language for an existing one.

### Steps

1. Open a GitHub issue describing your product — what it is, who it's for, any aesthetic preferences
2. Add the `design-consultation` label
3. Answer the product context question
4. Optionally: ask for competitive research ("research what top products in my space are doing")
5. Review the complete design proposal — aesthetic, typography, color, spacing, layout, motion
6. Request drill-downs on any section you want to refine
7. Review the HTML preview page or AI mockups
8. Approve the design system — `DESIGN.md` is written to your repo root

**Going forward:**
- All `/design-review` audits will calibrate against your `DESIGN.md`
- All `/plan-design-review` passes will check alignment with your design system
- The design system becomes the visual source of truth

**Success criteria:** `DESIGN.md` committed with typography, color palette, spacing scale, and layout grid. All future design reviews calibrate against it.

---

## Workflow 5: Weekly Engineering Rhythm

**When to use:** You want to establish a continuous improvement practice for your team.

### Setup (one-time)

1. Enable `/retro` in `config.json`: `"retro": { "enabled": true, "trigger": "schedule", "schedule": "0 17 * * 5" }`
2. Enable `/benchmark` in `config.json`: `"benchmark": { "enabled": true, "trigger": "schedule", "schedule": "0 6 * * *" }`
3. Run `/benchmark https://myapp.com --baseline` to capture your initial performance baseline
4. Commit and push the config changes

### Weekly Rhythm

**Monday — Thursday:**
- Open issues for new work, use `/office-hours` or `/autoplan` for significant features
- Open PRs — `/review` runs automatically on every PR
- Use `/qa` before shipping features

**Friday:**
- `/retro` runs automatically at 5 PM UTC
- Review the retrospective: velocity, quality, test ratio, session patterns, team breakdown
- Identify the top 3 wins and 3 improvements
- Track week-over-week trends

**Daily:**
- `/benchmark` runs at 6 AM UTC (if enabled)
- Performance regressions are caught before they compound

**On every deploy:**
- `/canary` monitors production (if enabled)
- Regressions caught within minutes of deployment

**Success criteria:** Test LOC ratio trending up, fix ratio trending down, deep sessions increasing, performance grade stable or improving.

---

## Workflow 6: Pre-Launch Quality Blitz

**When to use:** You're preparing for a launch and want to ensure everything is polished and production-ready.

### Steps

**Day 1: Audit**

1. Comment `/qa-only https://myapp.com --exhaustive` — full app QA report without making changes
2. Comment `/cso --comprehensive` — deep security scan
3. Comment `/benchmark https://myapp.com --baseline` — capture performance baseline
4. Review all three reports — prioritize findings

**Day 2–3: Fix**

5. Create a branch for fixes
6. Fix Critical and High issues from QA report
7. Fix Critical and High security findings from CSO report
8. Fix performance budget failures from benchmark
9. Comment `/qa https://staging.myapp.com` — QA with fixes applied
10. Comment `/cso --diff` — verify security fixes
11. Comment `/benchmark https://staging.myapp.com` — verify no performance regressions

**Day 4: Polish**

12. Add `design-review` label to the PR — visual design audit with automated fixes
13. Review design score before/after
14. Run `/qa-only` one final time as a clean sweep

**Day 5: Ship**

15. Comment `/ship` — automated shipping pipeline
16. Publish release — `/document-release` syncs docs
17. Comment `/canary https://myapp.com` — post-deploy monitoring
18. Verify HEALTHY status
19. Comment `/benchmark https://myapp.com` — post-launch performance check

**Success criteria:** QA health score ≥ 90, CSO report clean (daily mode), benchmark grade ≥ B, design score ≥ 80, canary HEALTHY.

---

## Workflow 7: Onboarding a New Team Member

**When to use:** A new developer joins your team and needs to understand the codebase and practices.

### Steps

1. Have them read [Getting Started](getting-started.md) — installation and first commands
2. Have them read [The Method](the-method.md) — the systematic methodology
3. Have them open an issue: "Onboarding: [their name]"
4. Have them ask questions about the codebase in the issue — the agent has full codebase context
5. Assign them a small feature and walk them through the workflow:
   - Comment `/autoplan` on the feature issue
   - Review the plan together
   - Implement, open a PR (auto-reviewed)
   - Comment `/qa` if applicable
   - Comment `/ship`
6. Run `/retro` after their first week — review their "Your Week" section together

**Success criteria:** New team member can independently use the full workflow from `/office-hours` to `/ship` within their first week.

---

## Workflow 8: Cross-Project Velocity Check

**When to use:** You're working across multiple repositories and want to track your overall shipping velocity.

### Steps

1. Open an issue in any repository with GStack Intelligence installed
2. Comment `/retro global` — cross-project retrospective across all AI coding activity
3. Review:
   - Global shipping streak (consecutive days with commits across all repos)
   - Per-project breakdowns
   - Context switching patterns (how many repos per day)
   - Per-tool productivity (Claude Code vs Codex vs Gemini)
4. Use the shareable personal card for team standups or personal tracking

**Success criteria:** Global shipping streak trending up, context switching per day ≤ 3 repos, deep sessions increasing across all projects.

---

## Command Quick Reference

For detailed documentation on any command, see the [Command Reference](README.md).

| Command | Trigger Type | Browser | Phase |
|---|---|---|---|
| `/office-hours` | Label: `office-hours` | No | Discovery |
| `/autoplan` | Comment | No | Planning |
| `/plan-ceo-review` | Comment | No | Planning |
| `/plan-design-review` | Comment | No | Planning |
| `/plan-eng-review` | Comment | No | Planning |
| `/design-consultation` | Label: `design-consultation` | No | Planning |
| `/review` | Auto on PR | No | Implementation |
| `/cso` | Label: `security-audit` | No | Implementation |
| `/design-review` | Label: `design-review` | Yes | Implementation |
| `/investigate` | Label: `investigate` | No | Implementation |
| `/qa` | Comment | Yes | Shipping |
| `/qa-only` | Comment | Yes | Shipping |
| `/ship` | Comment | No | Shipping |
| `/document-release` | Auto on release | No | Shipping |
| `/retro` | Scheduled / Comment | No | Operations |
| `/benchmark` | Scheduled / Comment | Yes | Operations |
| `/canary` | Auto on deploy | Yes | Operations |

---

## Further Reading

- [Command Reference](README.md) — Detailed docs for each command
- [The Method](the-method.md) — Philosophy and methodology
- [Getting Started](getting-started.md) — First-day onboarding
- [ETHOS](../ETHOS.md) — Builder principles

---

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence">
  </picture>
</p>

[← Back to Command Reference](README.md)
