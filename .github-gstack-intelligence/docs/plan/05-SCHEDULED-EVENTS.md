# Phase 5 — Scheduled & Event-Driven Skills

### `/retro`, `/benchmark`, `/document-release`, `/canary`, `/ship`

---

## Goal

Fully automated skills that run on schedules (weekly retro, daily benchmarks) or in response to GitHub events (release published → document release, deployment succeeded → canary monitoring). Plus the `/ship` skill that orchestrates the full shipping workflow.

---

## Steps

### Step 29 — Add Schedule Triggers to Workflow

Extend the `on:` block:

```yaml
on:
  # ... existing triggers ...
  schedule:
    - cron: '0 17 * * 5'    # Friday 5pm UTC → retro
    - cron: '0 6 * * *'     # Daily 6am UTC → benchmark (if enabled)
```

Schedule triggers have no actor — the workflow runs as `github-actions`. The authorization step must skip actor checks for scheduled events:

```yaml
- name: Authorize
  run: |
    if [[ "${{ github.event_name }}" == "schedule" ]]; then
      echo "::notice::Scheduled trigger — no actor authorization needed"
      exit 0
    fi
    # ... normal auth check ...
```

---

### Step 30 — Add Release Trigger to Workflow

```yaml
on:
  # ... existing triggers ...
  release:
    types: [published]
```

Release events carry the tag name, release body, and target commitish — all needed by `/document-release`.

---

### Step 31 — Add Deployment Status Trigger to Workflow

```yaml
on:
  # ... existing triggers ...
  deployment_status:
```

Only successful deployments trigger canary monitoring:

```yaml
if: >-
  ...
  || (github.event_name == 'deployment_status' && github.event.deployment_status.state == 'success')
```

---

### Step 32 — Wire Router: Schedule → Retro and Benchmark

The router differentiates schedule events by matching the cron pattern or by using the current day/time:

```typescript
if (event.type === 'schedule') {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();  // 0 = Sunday, 5 = Friday
  const hourUTC = now.getUTCHours();
  
  // Friday 5pm UTC → retro
  if (dayOfWeek === 5 && hourUTC >= 17 && config.skills.retro.enabled) {
    return {
      skill: 'retro',
      prompt: buildRetroPrompt(),
      needsBrowser: false,
      sessionMode: 'none',
      context: {},
    };
  }
  
  // Daily 6am UTC → benchmark
  if (hourUTC >= 6 && hourUTC < 7 && config.skills.benchmark.enabled) {
    return {
      skill: 'benchmark',
      prompt: buildBenchmarkPrompt(),
      needsBrowser: false,
      sessionMode: 'none',
      context: {},
    };
  }
}
```

**Retro prompt construction:**
- Include time window (default: last 7 days)
- Provide git log summary for the period
- Reference prior retros from `state/results/retro/` for trend comparison

**Benchmark prompt construction:**
- Point to existing benchmark suite
- Reference current baseline from `state/benchmarks/baseline.json`
- Instruct agent to run benchmarks and compare against baseline

---

### Step 33 — Wire Router: Release → Document-Release

```typescript
if (event.type === 'release' && config.skills['document-release'].enabled) {
  return {
    skill: 'document-release',
    prompt: buildDocumentReleasePrompt(event.release),
    needsBrowser: false,
    sessionMode: 'none',
    context: {},
  };
}
```

**Prompt includes:**
- Release tag name, title, and body (release notes)
- Git diff between this tag and the previous tag
- List of changed files
- Instruction to update README, CHANGELOG, and relevant documentation
- Output: Open a PR with documentation updates

---

### Step 34 — Wire Router: Deployment → Canary

```typescript
if (event.type === 'deployment_status' && event.status === 'success' && config.skills.canary.enabled) {
  return {
    skill: 'canary',
    prompt: buildCanaryPrompt(event.deployment),
    needsBrowser: true,
    sessionMode: 'none',
    context: { url: event.deployment.target_url },
  };
}
```

**Canary monitoring flow:**
1. Navigate to the deployment URL with Playwright
2. Check page health (HTTP status, load time, console errors)
3. Run accessibility checks
4. Compare against expected state (if baseline exists)
5. If issues found → create a new GitHub issue with findings
6. If healthy → post a success comment on the deployment issue/PR

---

### Step 35 — Wire Router: `/ship` Command

The `/ship` skill orchestrates the full shipping workflow:

```typescript
if (command.skill === 'ship') {
  return {
    skill: 'ship',
    prompt: buildShipPrompt(event.issue),
    needsBrowser: false,
    sessionMode: 'none',
    context: { issueNumber: event.issue.number },
  };
}
```

**Ship workflow steps (executed by the agent):**
1. Check for existing review results in `state/results/review/` — skip review if already done
2. Run tests via `bash` tool
3. Bump version (if applicable)
4. Create a PR via `gh pr create`
5. Post the PR URL as an issue comment

**Blocking points:** If the agent encounters decisions that need human input (version bump strategy, ASK-level review findings), it posts a comment asking for clarification and sets `sessionMode: 'resume'` for the next interaction.

---

### Step 36 — Create Benchmark Baseline Structure

**File:** `.github-gstack-intelligence/state/benchmarks/baseline.json`

```json
{
  "lastUpdated": null,
  "commit": null,
  "measurements": {}
}
```

The first benchmark run populates this file. Subsequent runs compare against it. The agent updates the baseline when measurements improve.

**Benchmark history** is stored in `state/benchmarks/history/`:
```
state/benchmarks/
├── baseline.json
└── history/
    ├── 2026-04-01.json
    ├── 2026-04-02.json
    └── ...
```

---

### Step 37 — Persist Retro Reports

Retro reports are committed as Markdown for human readability:

**File:** `.github-gstack-intelligence/state/results/retro/{date}.md`

```markdown
# Weekly Retro — March 25–31, 2026

## Summary
- 47 commits by 3 contributors
- 12 PRs merged

## Per-Person Breakdown
### @alice (22 commits)
- Key: Implemented payment integration (#42, #43)
...

## Trends
- Shipping velocity: ↑ 15% vs prior week
```

The retro skill also creates a new GitHub issue with the report, so the team sees it in their notification feed.

---

### Step 38 — Test Weekly Retro

Trigger a retro on a repo with active commit history:
1. Manually invoke via `workflow_dispatch` (or wait for the scheduled cron)
2. Verify the agent reads 7 days of git history
3. Verify a structured retro report is posted as a new issue
4. Verify the report is committed to `state/results/retro/`
5. Run again the following week — verify trend comparison references the prior retro

---

## Exit Criteria

- [ ] `schedule` triggers fire weekly (retro) and daily (benchmark) 
- [ ] `release` events trigger documentation updates
- [ ] `deployment_status` events trigger canary monitoring
- [ ] `/ship` command orchestrates the full shipping workflow
- [ ] Retro reports include per-person breakdowns and trend analysis
- [ ] Benchmark baselines are committed and compared against
- [ ] All five skills in this phase produce actionable output

---

## Dependencies

- **Depends on:** Phase 1 (router, config), Phase 3 (browser.ts for canary)
- **Unlocks:** Phase 6 (cost controls apply across all skills)

---

*Phase 5 of 7. See [README.md](README.md) for the full plan.*
