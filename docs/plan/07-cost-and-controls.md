# 07 — Cost and Controls

### Cadence reduction, access control, model tiering, and cost management

---

## The Cost Challenge

Running an LLM on every PR push, every issue comment, and every schedule trigger can be expensive. A busy repository with 20 PRs/day, each triggering `/review` and `/cso`, could generate 40+ LLM invocations daily. Without controls, this is a runaway cost vector.

gstack-actions addresses this through five mechanisms: access control, skill gating, model tiering, cadence reduction, and bot loop prevention.

---

## 1. Access Control

### Collaborator Permission Check

Every workflow begins with an authorization step. Only users with write access or higher can trigger the agent:

```bash
PERM=$(gh api "repos/$REPO/collaborators/$ACTOR/permission" --jq '.permission')
if [[ "$PERM" != "admin" && "$PERM" != "maintain" && "$PERM" != "write" ]]; then
  exit 1
fi
```

| Permission Level | Access |
|-----------------|--------|
| `admin` | ✅ Full access to all skills |
| `maintain` | ✅ Full access to all skills |
| `write` | ✅ Full access to all skills |
| `triage` | ⛔ Rejected |
| `read` | ⛔ Rejected |
| `none` | ⛔ Rejected |

This is the same fail-closed model used by GMI. The authorization runs before any LLM invocation, so unauthorized requests cost zero.

### Variable-Driven Policy (Advanced)

For organizations that need more granular control, `config.json` supports a policy engine:

```json
{
  "access": {
    "allowedPermissions": ["admin", "maintain", "write"],
    "skillPermissions": {
      "ship": ["admin", "maintain"],
      "qa": ["admin", "maintain", "write"],
      "review": ["admin", "maintain", "write"],
      "office-hours": ["admin", "maintain", "write"]
    }
  }
}
```

This allows restricting destructive skills (`/ship`) to maintainers while keeping read-only skills (`/review`) open to all collaborators.

---

## 2. Skill Gating

### Label-Gated Skills

Expensive or disruptive skills can require a label to be present before they trigger:

```json
{
  "skills": {
    "cso": {
      "enabled": true,
      "labelGated": true,
      "label": "security-audit"
    },
    "qa": {
      "enabled": true,
      "labelGated": false
    }
  }
}
```

When `labelGated: true`, the workflow only runs if the PR or issue has the specified label. This lets teams explicitly opt into expensive skills on a per-PR basis rather than running them on every push.

### Prefix-Gated Skills (Issue Comments)

For issue-driven skills, only comments starting with a `/` command trigger the agent:

```json
{
  "access": {
    "prefixGating": true,
    "prefixes": ["/"]
  }
}
```

This prevents the agent from responding to every comment on every issue. Only explicit skill invocations (`/review`, `/qa https://...`, `/office-hours`) trigger a workflow run.

### Skill Enable/Disable

Individual skills can be disabled entirely:

```json
{
  "skills": {
    "benchmark": { "enabled": false },
    "canary": { "enabled": false },
    "retro": { "enabled": true }
  }
}
```

Disabled skills are ignored by the router even if their trigger fires.

---

## 3. Model Tiering

Not all skills need the most expensive model. gstack-actions supports per-skill model selection:

| Skill | Recommended Model | Reasoning |
|-------|-------------------|-----------|
| `/review` | `claude-sonnet-4` | Code review needs strong reasoning |
| `/cso` | `claude-sonnet-4` | Security audit needs thorough analysis |
| `/ship` | `claude-sonnet-4` | Full workflow needs reliability |
| `/qa` | `claude-sonnet-4` | Browser-based testing needs strong tool use |
| `/retro` | `claude-haiku-3.5` | Structured analysis of git log — haiku is sufficient |
| `/benchmark` | `claude-haiku-3.5` | Run commands, compare numbers — haiku is sufficient |
| `/document-release` | `claude-haiku-3.5` | Template-based doc updates — haiku is sufficient |
| `/office-hours` | `claude-sonnet-4` | Multi-turn conversation needs reasoning |
| `/plan-ceo-review` | `claude-sonnet-4` | Strategic analysis needs strong reasoning |
| `/plan-eng-review` | `claude-sonnet-4` | Architecture review needs depth |
| `/investigate` | `claude-sonnet-4` | Root-cause analysis needs reasoning |
| `/canary` | `claude-haiku-3.5` | Health checks are structured — haiku is sufficient |

### Cost Tier Presets

`config.json` supports cost tier presets that override individual model selections:

```json
{
  "defaults": {
    "costTier": "economy"  // Options: "economy", "standard", "premium"
  }
}
```

| Tier | Behavior |
|------|----------|
| `economy` | All skills use cheapest viable model (haiku for most, sonnet for code-touching skills) |
| `standard` | Skills use recommended models (table above) |
| `premium` | All skills use highest-quality model (opus for critical skills, sonnet for others) |

---

## 4. Cadence Reduction

### Diff-Based Filtering

For PR-triggered skills, skip the agent if the changes don't warrant it:

```typescript
// In router.ts
function shouldRunReview(pr: PullRequestEvent, config: GstackConfig): boolean {
  // Skip if only docs changed
  const files = pr.files;
  const allDocs = files.every(f =>
    f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.rst')
  );
  if (allDocs && config.skills.review.skipDocsOnly) return false;

  // Skip if diff is trivially small (e.g., version bump only)
  if (pr.additions + pr.deletions < 5) return false;

  return true;
}

function shouldRunDesignReview(pr: PullRequestEvent): boolean {
  // Only run if UI files changed
  return pr.files.some(f =>
    f.endsWith('.css') || f.endsWith('.scss') ||
    f.endsWith('.tsx') || f.endsWith('.jsx') ||
    f.endsWith('.vue') || f.endsWith('.svelte')
  );
}
```

### Rate Limiting

Global rate limiting prevents runaway costs:

```json
{
  "rateLimits": {
    "maxRunsPerHour": 20,
    "maxRunsPerDay": 100,
    "maxCostPerDay": 50.00
  }
}
```

The router checks rate limits before invoking the agent. If limits are exceeded, the workflow exits with a notice but no error.

### Schedule Throttling

Scheduled skills have natural cadence limits:
- `/retro`: Once per week (Friday)
- `/benchmark`: Once per day or per push to main
- `/canary`: Once per deployment

These are inherently limited by their trigger frequency.

---

## 5. Bot Loop Prevention

The most critical safety mechanism. Without it, the agent's own comments could trigger itself, creating an infinite loop.

### Actor Check

```yaml
- name: Bot loop prevention
  run: |
    if [[ "${{ github.actor }}" == *"[bot]"* ]] || [[ "${{ github.actor }}" == "github-actions" ]]; then
      echo "::notice::Skipping bot-triggered event"
      exit 0
    fi
```

### Comment Signature

The agent's comments include a hidden signature that the router checks:

```typescript
const AGENT_SIGNATURE = '<!-- gstack-actions-agent -->';

function isAgentComment(commentBody: string): boolean {
  return commentBody.includes(AGENT_SIGNATURE);
}

// In router.ts
if (event.type === 'issue_comment' && isAgentComment(event.comment.body)) {
  console.log('Skipping agent-generated comment');
  return null;
}
```

### Reaction-Based Deduplication

If the triggering comment already has a 🚀 reaction from the agent, skip it (it's already been processed).

---

## Cost Estimation

Rough cost estimates based on typical usage patterns:

| Skill | Input Tokens (est.) | Output Tokens (est.) | Cost per Run (Sonnet) | Cost per Run (Haiku) |
|-------|--------------------|-----------------------|----------------------|---------------------|
| `/review` | ~10,000 (diff) | ~2,000 (findings) | ~$0.06 | ~$0.01 |
| `/cso` | ~15,000 (codebase scan) | ~3,000 (findings) | ~$0.09 | ~$0.02 |
| `/qa` | ~5,000 (instructions) | ~5,000 (report + commands) | ~$0.05 | ~$0.01 |
| `/retro` | ~8,000 (git history) | ~3,000 (report) | ~$0.06 | ~$0.01 |
| `/office-hours` (per turn) | ~3,000 (context) | ~1,500 (reply) | ~$0.03 | ~$0.005 |

### Monthly Cost Scenarios

| Scenario | Activity | Estimated Monthly Cost |
|----------|----------|----------------------|
| **Solo dev** | 5 PRs/week, weekly retro, occasional QA | ~$15–30 |
| **Small team** | 20 PRs/week, weekly retro, daily benchmark | ~$50–100 |
| **Active project** | 50 PRs/week, all skills enabled | ~$150–300 |
| **Enterprise** | 100+ PRs/week, premium tier, full suite | ~$500–1000 |

These estimates assume Anthropic's Claude Sonnet pricing. Using the economy tier (Haiku for most skills) reduces costs by ~80%.

---

## Configuration Summary

```json
{
  "version": "1.0.0",
  "defaults": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "maxCommentLength": 60000,
    "costTier": "standard"
  },
  "access": {
    "allowedPermissions": ["admin", "maintain", "write"],
    "botLoopPrevention": true,
    "prefixGating": true,
    "prefixes": ["/"]
  },
  "rateLimits": {
    "maxRunsPerHour": 20,
    "maxRunsPerDay": 100
  },
  "skills": {
    "review": {
      "enabled": true,
      "trigger": "pull_request",
      "model": "claude-sonnet-4-20250514",
      "labelGated": false,
      "skipDocsOnly": true
    },
    "cso": {
      "enabled": true,
      "trigger": "pull_request",
      "model": "claude-sonnet-4-20250514",
      "labelGated": true,
      "label": "security-audit"
    },
    "qa": {
      "enabled": true,
      "trigger": "issue_comment",
      "model": "claude-sonnet-4-20250514",
      "labelGated": false
    },
    "retro": {
      "enabled": true,
      "trigger": "schedule",
      "schedule": "0 17 * * 5",
      "model": "claude-haiku-3-20250305"
    },
    "benchmark": {
      "enabled": false,
      "trigger": "schedule",
      "schedule": "0 6 * * *",
      "model": "claude-haiku-3-20250305"
    },
    "document-release": {
      "enabled": true,
      "trigger": "release",
      "model": "claude-haiku-3-20250305"
    },
    "canary": {
      "enabled": false,
      "trigger": "deployment_status",
      "model": "claude-haiku-3-20250305"
    },
    "office-hours": {
      "enabled": true,
      "trigger": "issue_label",
      "label": "office-hours",
      "model": "claude-sonnet-4-20250514"
    },
    "plan-ceo-review": {
      "enabled": true,
      "trigger": "issue_comment",
      "model": "claude-sonnet-4-20250514"
    },
    "plan-eng-review": {
      "enabled": true,
      "trigger": "issue_comment",
      "model": "claude-sonnet-4-20250514"
    },
    "investigate": {
      "enabled": true,
      "trigger": "issue_label",
      "label": "investigate",
      "model": "claude-sonnet-4-20250514"
    },
    "ship": {
      "enabled": true,
      "trigger": "issue_comment",
      "model": "claude-sonnet-4-20250514"
    },
    "autoplan": {
      "enabled": true,
      "trigger": "issue_comment",
      "model": "claude-sonnet-4-20250514"
    },
    "design-review": {
      "enabled": true,
      "trigger": "pull_request",
      "model": "claude-sonnet-4-20250514",
      "labelGated": true,
      "label": "design-review",
      "pathFilter": ["**/*.css", "**/*.scss", "**/*.tsx", "**/*.vue"]
    },
    "plan-design-review": {
      "enabled": true,
      "trigger": "issue_comment",
      "model": "claude-sonnet-4-20250514"
    },
    "design-consultation": {
      "enabled": true,
      "trigger": "issue_label",
      "label": "design-consultation",
      "model": "claude-sonnet-4-20250514"
    },
    "qa-only": {
      "enabled": true,
      "trigger": "issue_comment",
      "model": "claude-sonnet-4-20250514"
    }
  }
}
```
