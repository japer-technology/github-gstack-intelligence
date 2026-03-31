# Phase 2 — PR Review & Security

### Activate `/review` and `/cso` skills on pull requests

---

## Goal

Every PR opened against the repository is automatically reviewed by the `/review` skill. PRs with the `security-audit` label also receive a `/cso` security audit. Findings are posted as PR comments, and results are persisted to `state/results/` for auditability.

This is the **highest-value, lowest-effort unlock** — PR review is gstack's most natural fit for GitHub.

---

## Steps

### Step 7 — Add `pull_request` Trigger to Workflow

Extend the `on:` block in `github-gstack-intelligence-agent.yml`:

```yaml
on:
  # ... existing triggers ...
  pull_request:
    types: [opened, synchronize]
```

Add a new job or extend the existing `run-agent` job with an `if:` guard that includes `pull_request`:

```yaml
if: >-
  (github.event_name == 'issues')
  || (github.event_name == 'issue_comment' && ...)
  || (github.event_name == 'pull_request')
```

Add PR-scoped concurrency to prevent multiple reviews racing on the same PR:

```yaml
concurrency:
  group: >-
    gstack-${{ github.repository }}-${{
      github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) ||
      ...
    }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

`cancel-in-progress: true` for PRs means a new push cancels the previous review (the old review is stale anyway).

---

### Step 8 — Wire Router: `pull_request` → `/review`

In `router.ts`, add the pull_request routing:

```typescript
if (event.type === 'pull_request') {
  if (!config.skills.review.enabled) return null;
  
  return {
    skill: 'review',
    prompt: buildReviewPrompt(event.pr),
    needsBrowser: false,
    sessionMode: 'none',
    context: {
      prNumber: event.pr.number,
      branch: event.pr.head.ref,
      diffStat: `+${event.pr.additions} -${event.pr.deletions} across ${event.pr.changed_files} files`,
    },
  };
}
```

**Prompt construction (`buildReviewPrompt`):**
- Include PR title, description, branch name, base branch
- Include diff stat (additions, deletions, files changed)
- Reference the review checklist at `skills/references/review-checklist.md`
- Instruct agent to post findings as a PR comment using `gh pr comment`
- Include the full content of `skills/review.md` as the skill instructions

---

### Step 9 — Wire Router: `pull_request` + Label → `/cso`

When a PR has the `security-audit` label, also run the CSO skill:

```typescript
if (event.type === 'pull_request') {
  const labels = event.pr.labels.map(l => l.name);
  
  if (config.skills.cso.enabled && labels.includes(config.skills.cso.label)) {
    return {
      skill: 'cso',
      prompt: buildCsoPrompt(event.pr),
      needsBrowser: false,
      sessionMode: 'none',
      context: { prNumber: event.pr.number },
    };
  }
  
  // Fall through to review
  if (config.skills.review.enabled) {
    return { skill: 'review', ... };
  }
}
```

**Design decision:** If both `/review` and `/cso` should run on the same PR, the router returns the first match and the workflow can be configured to run skills sequentially (or the `/review` skill prompt can include security checks when the label is present). An alternative is to support returning multiple routes, but that adds complexity — defer to Phase 6.

---

### Step 10 — Inject PR Context into Skill Prompts

Extend `agent.ts` to build a rich context header when the route includes PR information:

```typescript
function buildContextHeader(route: RouteResult): string {
  const lines: string[] = [
    '## GitHub Context',
    '',
    `- **Repository:** ${process.env.GITHUB_REPOSITORY}`,
    `- **Event:** ${process.env.GITHUB_EVENT_NAME}`,
    `- **Actor:** ${process.env.GITHUB_ACTOR}`,
  ];
  
  if (route.context.prNumber) {
    lines.push(`- **PR:** #${route.context.prNumber}`);
    lines.push(`- **Branch:** ${route.context.branch}`);
    lines.push(`- **Diff:** ${route.context.diffStat}`);
  }
  
  return lines.join('\n');
}
```

The context header is prepended to the skill prompt before passing it to pi-coding-agent.

---

### Step 11 — Persist Review Results

After the agent completes, write a structured result file:

```typescript
// In agent.ts, after extracting the reply
const result = {
  prNumber: route.context.prNumber,
  skill: route.skill,
  timestamp: new Date().toISOString(),
  status: 'completed',
  commit: process.env.GITHUB_SHA,
};

const resultPath = resolve(stateDir, 'results', route.skill, `pr-${route.context.prNumber}.json`);
mkdirSync(dirname(resultPath), { recursive: true });
writeFileSync(resultPath, JSON.stringify(result, null, 2));
```

This enables the `/ship` skill (Phase 5) to check whether a review has already been run.

---

### Step 12 — Persist Security Results

Same pattern as Step 11, written to `state/results/security/pr-{N}.json`.

---

### Step 13 — Test on a Real PR

Create a test PR with intentional issues:
- SQL injection in a query builder
- Race condition in async code
- Missing input validation on an API endpoint
- Hardcoded credentials

**Expected results:**
- `/review` skill finds the code quality issues and posts a structured PR comment
- `/cso` skill (when `security-audit` label is applied) finds the security issues
- Results are committed to `state/results/review/` and `state/results/security/`
- 🚀 reaction appears immediately; 👍 on completion

---

## Exit Criteria

- [ ] `pull_request` events trigger the workflow
- [ ] Router maps PR events to the `/review` skill
- [ ] Router maps PR events with `security-audit` label to the `/cso` skill
- [ ] PR diff context is injected into skill prompts
- [ ] Review findings appear as PR comments with structured Markdown
- [ ] Results are persisted to `state/results/review/` and `state/results/security/`
- [ ] Concurrency group prevents duplicate reviews on the same PR
- [ ] `cancel-in-progress` ensures new pushes cancel stale reviews

---

## Dependencies

- **Depends on:** Phase 1 (router.ts, config.json)
- **Unlocks:** Phase 3 (browser skills) and Phase 4 (conversation skills)

---

*Phase 2 of 7. See [README.md](README.md) for the full plan.*
