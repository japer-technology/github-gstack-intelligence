# Phase 1 — Foundation

### config.json, router.ts, slash-command parser, bot-loop prevention

---

## Goal

Build the routing and configuration layer that every subsequent phase depends on. After this phase, the system can determine which skill to run for any GitHub event, enforce access controls, and prevent bot loops — even though most skills won't be wired yet.

---

## Steps

### Step 1 — Create `config.json`

**File:** `.github-gstack-intelligence/config.json`

The central configuration file that controls which skills are enabled, what model each skill uses, and how access is gated.

```json
{
  "version": "1.0.0",
  "defaults": {
    "provider": "openai",
    "model": "gpt-5.4",
    "maxCommentLength": 60000,
    "costTier": "standard"
  },
  "access": {
    "allowedPermissions": ["admin", "maintain", "write"],
    "botLoopPrevention": true,
    "prefixGating": true,
    "prefixes": ["/"]
  },
  "skills": {
    "review": { "enabled": true, "trigger": "pull_request" },
    "cso": { "enabled": true, "trigger": "pull_request", "labelGated": true, "label": "security-audit" },
    "qa": { "enabled": true, "trigger": "issue_comment" },
    "investigate": { "enabled": true, "trigger": "issue_label", "label": "investigate" },
    "office-hours": { "enabled": true, "trigger": "issue_label", "label": "office-hours" },
    "retro": { "enabled": false, "trigger": "schedule", "schedule": "0 17 * * 5" },
    "benchmark": { "enabled": false, "trigger": "schedule", "schedule": "0 6 * * *" },
    "ship": { "enabled": true, "trigger": "issue_comment" },
    "document-release": { "enabled": true, "trigger": "release" },
    "canary": { "enabled": false, "trigger": "deployment_status" },
    "autoplan": { "enabled": true, "trigger": "issue_comment" },
    "plan-ceo-review": { "enabled": true, "trigger": "issue_comment" },
    "plan-eng-review": { "enabled": true, "trigger": "issue_comment" },
    "design-review": { "enabled": true, "trigger": "pull_request", "labelGated": true, "label": "design-review" },
    "plan-design-review": { "enabled": true, "trigger": "issue_comment" },
    "design-consultation": { "enabled": true, "trigger": "issue_label", "label": "design-consultation" },
    "qa-only": { "enabled": true, "trigger": "issue_comment" }
  }
}
```

**Why this matters:** Without `config.json`, every skill runs unconditionally. The config gives teams control over cost, cadence, and which skills are active.

---

### Step 2 — Write `router.ts`

**File:** `.github-gstack-intelligence/lifecycle/router.ts`

The routing engine that reads the GitHub event payload (`$GITHUB_EVENT_PATH`) and the `config.json`, then returns which skill to execute.

**Interface:**

```typescript
interface RouteResult {
  skill: string;             // Skill filename (e.g., 'review', 'qa')
  prompt: string;            // Constructed prompt with context
  needsBrowser: boolean;     // Whether Playwright setup is needed
  sessionMode: 'new' | 'resume' | 'none';
  context: {
    prNumber?: number;
    issueNumber?: number;
    url?: string;            // For /qa, /canary
    diffStat?: string;
    branch?: string;
  };
}
```

**Routing logic (priority order):**

1. `workflow_dispatch` → check `inputs.function` for `run-refresh-gstack` or skill name
2. `pull_request` → route to `/review` (and `/cso` if label present, `/design-review` if UI files changed)
3. `issue_comment` → parse for slash command (`/review`, `/qa <url>`, `/ship`, etc.)
4. `issue_comment` (no command) → resume active session for that issue
5. `issues` (opened with label) → route to label-mapped skill (`office-hours`, `investigate`, etc.)
6. `schedule` → route based on cron pattern (retro vs. benchmark)
7. `release` → route to `/document-release`
8. `deployment_status` (success) → route to `/canary`

**Key design decisions:**
- Returns `null` if no route matches (agent exits cleanly)
- Checks `config.json` for skill enablement before routing
- Checks label gating (`labelGated: true`) for skills that require specific labels
- Logs the routing decision for debuggability

---

### Step 3 — Implement Slash-Command Parser

**Inside `router.ts`** — a function that extracts skill commands from issue comment text.

**Recognized patterns:**

| Comment text | Parsed result |
|---|---|
| `/review` | `{ skill: 'review' }` |
| `/cso` | `{ skill: 'cso' }` |
| `/qa https://staging.example.com` | `{ skill: 'qa', url: 'https://staging.example.com' }` |
| `/qa-only https://staging.example.com` | `{ skill: 'qa-only', url: 'https://staging.example.com' }` |
| `/investigate` | `{ skill: 'investigate' }` |
| `/ship` | `{ skill: 'ship' }` |
| `/office-hours` | `{ skill: 'office-hours' }` |
| `/plan-ceo-review` | `{ skill: 'plan-ceo-review' }` |
| `/plan-eng-review` | `{ skill: 'plan-eng-review' }` |
| `/design-review` | `{ skill: 'design-review' }` |
| `/plan-design-review` | `{ skill: 'plan-design-review' }` |
| `/design-consultation` | `{ skill: 'design-consultation' }` |
| `/autoplan` | `{ skill: 'autoplan' }` |
| `/retro 7d` | `{ skill: 'retro', args: '7d' }` |
| `/benchmark` | `{ skill: 'benchmark' }` |
| `Hello, can you help me?` | `null` (no command — continue conversation) |

**Rules:**
- Command must be the first non-whitespace content on the first line
- URL arguments are validated (must start with `http://` or `https://`)
- Unknown commands return `null` (treated as conversation continuation)

---

### Step 4 — Add Bot-Loop Prevention

Two layers of protection:

**Layer 1 — Actor check (in workflow YAML):**
Already partially present. Ensure the `if:` guard on the `run-agent` job rejects bot actors:
```yaml
if: >-
  github.event_name == 'issue_comment'
  && !endsWith(github.event.comment.user.login, '[bot]')
  && github.actor != 'github-actions'
```

**Layer 2 — Comment signature (in `agent.ts`):**
When posting a reply, append a hidden HTML comment:
```typescript
const AGENT_SIGNATURE = '<!-- github-gstack-intelligence-agent -->';
const reply = extractedReply + '\n' + AGENT_SIGNATURE;
```

In `router.ts`, check incoming comments:
```typescript
if (event.comment?.body?.includes(AGENT_SIGNATURE)) {
  console.log('Skipping agent-generated comment');
  return null;
}
```

---

### Step 5 — Extend `agent.ts` with `--route` Mode

Add a routing-aware execution path to `agent.ts`:

```
bun .github-gstack-intelligence/lifecycle/agent.ts --route
```

**Behavior:**
1. Import `router.ts` and call `route(event, config)`
2. If route returns `null` → exit cleanly (no skill matched)
3. If route returns a result → load `skills/{skill}.md` as the skill prompt
4. Inject context into the prompt (PR number, diff, issue body, etc.)
5. Execute pi-coding-agent with the constructed prompt
6. Post reply and persist state (existing behavior)

The current `agent.ts` behavior (general conversation) is preserved as the fallback when no route matches or when `--route` is not passed.

---

### Step 6 — Create State Directories

```
.github-gstack-intelligence/state/
├── issues/           # (already exists)
├── sessions/         # (already exists)
└── results/          # NEW
    ├── review/       # PR review results
    ├── security/     # CSO audit results
    ├── qa/           # QA reports
    │   └── screenshots/
    ├── retro/        # Weekly retro reports
    └── benchmarks/   # Benchmark baselines
```

Add `.gitkeep` files to preserve empty directories in git.

---

## Exit Criteria

- [ ] `config.json` exists and is loaded by `router.ts`
- [ ] `router.ts` correctly maps events to skills (unit testable with mock event payloads)
- [ ] Slash commands are parsed from issue comments
- [ ] Bot-generated comments are detected and skipped
- [ ] `agent.ts --route` delegates to the router before falling back to general conversation
- [ ] `state/results/` directories exist

---

## Dependencies

- **Depends on:** Nothing (this is the foundation)
- **Unlocks:** All subsequent phases

---

*Phase 1 of 7. See [README.md](README.md) for the full plan.*
