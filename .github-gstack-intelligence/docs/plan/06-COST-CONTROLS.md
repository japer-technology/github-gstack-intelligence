# Phase 6 — Cost Controls

### Model tiering, rate limiting, diff-based filtering, label gating

---

## Goal

The full skill system is operational but needs guardrails to prevent runaway costs. This phase adds per-skill model selection, rate limiting, smart filtering, and dry-run mode to give teams control over how much they spend.

---

## Steps

### Step 39 — Implement Per-Skill Model Selection

Each skill in `config.json` gets an optional `model` field. When present, it overrides the global default:

```json
{
  "defaults": { "model": "gpt-5.4" },
  "skills": {
    "review": { "model": "gpt-5.4" },
    "retro": { "model": "gpt-5-mini" },
    "benchmark": { "model": "gpt-5-mini" },
    "document-release": { "model": "gpt-5-mini" }
  }
}
```

**In `agent.ts`:** Before invoking pi-coding-agent, read the skill-specific model from config and pass it as the `--model` argument.

**Recommended model assignments:**

| Skill | Needs strong reasoning? | Recommended model tier |
|---|---|---|
| `/review`, `/cso`, `/qa` | Yes — code analysis, security assessment | Full model (e.g., GPT-5.4, Sonnet) |
| `/ship`, `/investigate`, `/office-hours` | Yes — multi-step orchestration, conversation | Full model |
| `/plan-ceo-review`, `/plan-eng-review` | Yes — strategic analysis | Full model |
| `/retro`, `/benchmark` | No — structured data processing | Mini model (e.g., GPT-5-mini, Haiku) |
| `/document-release`, `/canary` | No — template-based output | Mini model |

---

### Step 40 — Add Cost Tier Presets

`config.json` supports three cost tiers that override individual model selections:

```json
{
  "defaults": {
    "costTier": "standard"  // "economy" | "standard" | "premium"
  }
}
```

| Tier | Behavior |
|---|---|
| `economy` | All skills use the cheapest viable model. ~80% cost reduction. |
| `standard` | Skills use the recommended models from the table above. |
| `premium` | All skills use the best available model. Maximum quality. |

**In `router.ts`:** The cost tier determines the model when no per-skill model is explicitly set.

---

### Step 41 — Implement Rate Limiting

Add rate limit configuration:

```json
{
  "rateLimits": {
    "maxRunsPerHour": 20,
    "maxRunsPerDay": 100
  }
}
```

**Implementation in `router.ts`:**

```typescript
function checkRateLimits(config: GstackConfig): boolean {
  const counterFile = resolve(stateDir, 'rate-limits.json');
  const counters = existsSync(counterFile) 
    ? JSON.parse(readFileSync(counterFile, 'utf8')) 
    : { hourly: [], daily: [] };
  
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  const oneDayAgo = now - 86400000;
  
  // Prune old entries
  counters.hourly = counters.hourly.filter(t => t > oneHourAgo);
  counters.daily = counters.daily.filter(t => t > oneDayAgo);
  
  if (counters.hourly.length >= config.rateLimits.maxRunsPerHour) return false;
  if (counters.daily.length >= config.rateLimits.maxRunsPerDay) return false;
  
  // Record this run
  counters.hourly.push(now);
  counters.daily.push(now);
  writeFileSync(counterFile, JSON.stringify(counters));
  return true;
}
```

When limits are exceeded, the workflow exits with a notice (not an error):
```
::notice::Rate limit exceeded (20/hour). Skipping this invocation.
```

---

### Step 42 — Implement Diff-Based Filtering

For PR-triggered skills, skip the LLM invocation when the changes don't warrant it:

```typescript
function shouldRunReview(pr: PullRequestEvent, config: SkillConfig): boolean {
  // Skip if only documentation files changed
  const allDocs = pr.files.every(f =>
    f.filename.endsWith('.md') || f.filename.endsWith('.txt') || f.filename.endsWith('.rst')
  );
  if (allDocs && config.skipDocsOnly) return false;

  // Skip trivially small diffs (e.g., version bump only)
  if (pr.additions + pr.deletions < 5) return false;

  // Skip if only auto-generated files changed (lockfiles, etc.)
  const allGenerated = pr.files.every(f =>
    f.filename.endsWith('.lock') || f.filename.endsWith('.sum') ||
    f.filename === 'package-lock.json' || f.filename === 'bun.lock'
  );
  if (allGenerated) return false;

  return true;
}
```

**Configuration:**

```json
{
  "skills": {
    "review": {
      "skipDocsOnly": true,
      "minDiffSize": 5
    }
  }
}
```

---

### Step 43 — Implement Label Gating

Skills with `labelGated: true` in config only run when the specified label is present:

```typescript
if (skillConfig.labelGated) {
  const labels = getLabels(event);
  if (!labels.includes(skillConfig.label)) {
    console.log(`Skill ${skill} requires label '${skillConfig.label}' — skipping`);
    return null;
  }
}
```

**Default label-gated skills:**
- `/cso` → requires `security-audit` label
- `/design-review` → requires `design-review` label

All other skills are not label-gated by default but can be configured as such:

```json
{
  "skills": {
    "review": { "labelGated": true, "label": "needs-review" }
  }
}
```

---

### Step 44 — Add Dry-Run Mode

A `--dry-run` flag that shows what the router would do without invoking the LLM:

```
bun .github-gstack-intelligence/lifecycle/agent.ts --route --dry-run
```

**Output:**
```
[dry-run] Event: pull_request (opened)
[dry-run] Route: review
[dry-run] Skill prompt: skills/review.md (2,340 bytes)
[dry-run] Model: gpt-5.4 (from config.skills.review.model)
[dry-run] Browser: not needed
[dry-run] Context: PR #42, branch feature/auth, +127 -34 across 6 files
[dry-run] Would post result as PR comment
[dry-run] Exiting without LLM invocation
```

Useful for debugging routing, testing configuration changes, and verifying resource extraction.

---

### Step 45 — Test Cost Controls

**Test on a high-activity repo:**
1. Set `maxRunsPerHour: 5` and open 10 PRs in quick succession
2. Verify first 5 trigger reviews, remaining 5 are skipped with rate-limit notice
3. Create a docs-only PR — verify review is skipped (diff filtering)
4. Create a PR without the `security-audit` label — verify CSO is skipped (label gating)
5. Set `costTier: 'economy'` — verify all skills use the mini model
6. Run `--dry-run` — verify no LLM invocations occur

---

## Exit Criteria

- [ ] Per-skill model selection works (different skills can use different models)
- [ ] Cost tier presets (`economy`, `standard`, `premium`) override model defaults
- [ ] Rate limiting prevents more than `maxRunsPerHour` / `maxRunsPerDay` invocations
- [ ] Diff-based filtering skips review for docs-only and trivial PRs
- [ ] Label gating enforces skill prerequisites
- [ ] `--dry-run` mode shows routing decisions without LLM invocation

---

## Dependencies

- **Depends on:** Phases 1–5 (all skills must be operational)
- **Unlocks:** Phase 7 (distribution requires cost controls for production use)

---

*Phase 6 of 7. See [README.md](README.md) for the full plan.*
