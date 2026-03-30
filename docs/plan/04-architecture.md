# 04 — Architecture

### Folder structure, lifecycle scripts, skill router, and configuration

---

## Folder Structure

Following the Githubification convention of a dot-prefixed, self-contained folder:

```
.gstack-actions/
├── .pi/                                    # Pi-coding-agent configuration
│   ├── settings.json                       # LLM provider, model, thinking level
│   ├── APPEND_SYSTEM.md                    # System prompt — gstack ETHOS injected here
│   └── extensions/                         # Custom tools (web search, screenshot upload)
│
├── lifecycle/                              # Runtime scripts (TypeScript, executed by Bun)
│   ├── indicator.ts                        # Add 🚀 reaction — signal agent is working
│   ├── router.ts                           # Skill router — maps GitHub events to skills
│   ├── agent.ts                            # Core orchestrator — runs pi, posts replies, commits state
│   └── browser.ts                          # Playwright helper — screenshot, navigate, assert
│
├── skills/                                 # Adapted skill prompts (CI-ready Markdown)
│   ├── review.md                           # /review — PR code review
│   ├── cso.md                              # /cso — security audit
│   ├── ship.md                             # /ship — full shipping workflow
│   ├── benchmark.md                        # /benchmark — performance regression
│   ├── retro.md                            # /retro — weekly retrospective
│   ├── document-release.md                 # /document-release — post-release docs
│   ├── qa.md                               # /qa — browser-based QA testing
│   ├── qa-only.md                          # /qa-only — QA report without fixes
│   ├── design-review.md                    # /design-review — design audit
│   ├── plan-design-review.md               # /plan-design-review — report-only design audit
│   ├── investigate.md                      # /investigate — root-cause debugging
│   ├── canary.md                           # /canary — post-deploy monitoring
│   ├── office-hours.md                     # /office-hours — product idea refinement
│   ├── plan-ceo-review.md                  # /plan-ceo-review — CEO-level feature review
│   ├── plan-eng-review.md                  # /plan-eng-review — architecture review
│   ├── design-consultation.md              # /design-consultation — design system creation
│   └── autoplan.md                         # /autoplan — sequential CEO → design → eng
│
├── skills/references/                      # Supplementary files referenced by skills
│   ├── review-checklist.md                 # Engineering review checklist (from repo/gstack/review/checklist.md)
│   ├── review-design-checklist.md          # Design review checklist
│   ├── qa-issue-taxonomy.md                # QA issue classification (from repo/gstack/qa/references/)
│   ├── qa-report-template.md              # QA report format (from repo/gstack/qa/templates/)
│   └── cso-acknowledgements.md             # Security audit acknowledgements
│
├── config.json                             # Skill enablement, model selection, trigger config
├── state/                                  # Git-committed state (sessions, results, baselines)
│   ├── issues/                             # Issue-to-session mappings (JSON)
│   ├── sessions/                           # Conversation transcripts (JSONL)
│   ├── results/                            # Per-skill output history
│   │   ├── review/                         # Review results by PR number
│   │   ├── security/                       # Security audit results
│   │   ├── qa/                             # QA reports with screenshots
│   │   └── retro/                          # Retro history for trend analysis
│   └── benchmarks/                         # Benchmark baselines for regression detection
│
├── AGENTS.md                               # Agent identity and personality
├── ETHOS.md                                # gstack builder principles (reference copy)
├── VERSION                                 # Installed version of gstack-actions
├── package.json                            # Single dependency: @mariozechner/pi-coding-agent
└── bun.lock                                # Dependency lockfile
```

### Companion Files (outside the dot-folder)

```
.github/
├── workflows/
│   ├── gstack-review.yml                   # PR review + security audit
│   ├── gstack-qa.yml                       # QA testing (issue-triggered)
│   ├── gstack-agent.yml                    # General-purpose issue-driven agent
│   ├── gstack-retro.yml                    # Weekly retrospective (scheduled)
│   ├── gstack-benchmark.yml                # Performance benchmarks (scheduled/push)
│   ├── gstack-document-release.yml         # Post-release doc updates
│   ├── gstack-canary.yml                   # Post-deploy monitoring
│   └── gstack-install.yml                  # Self-installer (workflow_dispatch)
└── ISSUE_TEMPLATE/
    ├── gstack-qa.yml                       # QA request template (URL field)
    ├── gstack-investigate.yml              # Bug investigation template
    ├── gstack-office-hours.yml             # Product idea template
    └── gstack-review.yml                   # Manual review request template
```

---

## Lifecycle Scripts

### `indicator.ts` — Activity Indicator

Identical to GMI's indicator. Runs before dependency installation. Adds a 🚀 reaction to the triggering issue or comment so the user gets immediate visual feedback.

```
Workflow starts → indicator.ts adds 🚀 → dependencies install → agent runs
```

Persists reaction metadata to `/tmp/reaction-state.json` for `agent.ts` to read in its `finally` block.

### `router.ts` — Skill Router

Maps GitHub events to skill names. This is the new component that doesn't exist in GMI — gstack has seventeen skills, not one.

```typescript
// router.ts — Maps GitHub events to gstack skills

interface RouteResult {
  skill: string;            // Skill filename (without .md)
  prompt: string;           // Constructed prompt for the agent
  needsBrowser: boolean;    // Whether Playwright should be set up
  sessionMode: 'new' | 'resume' | 'none';  // Conversation mode
}

function route(event: GitHubEvent, config: GstackConfig): RouteResult | null {
  // PR events → review skills
  if (event.type === 'pull_request') {
    if (config.skills.review.enabled) {
      return {
        skill: 'review',
        prompt: `Review PR #${event.pr.number}: ${event.pr.title}\n\nDiff stat:\n${event.pr.diffStat}`,
        needsBrowser: false,
        sessionMode: 'none',
      };
    }
  }

  // Issue comment events → parse for skill command
  if (event.type === 'issue_comment') {
    const command = parseSkillCommand(event.comment.body);
    if (command) {
      return routeCommand(command, event, config);
    }
    // No command → continue conversation on existing session
    return {
      skill: resolveActiveSkill(event.issue.number),
      prompt: event.comment.body,
      needsBrowser: false,
      sessionMode: 'resume',
    };
  }

  // Schedule events → retro, benchmark
  if (event.type === 'schedule') {
    return routeSchedule(event.schedule, config);
  }

  // Release events → document-release
  if (event.type === 'release') {
    return {
      skill: 'document-release',
      prompt: `Release ${event.release.tag} published. Update documentation.`,
      needsBrowser: false,
      sessionMode: 'none',
    };
  }

  // Deployment events → canary
  if (event.type === 'deployment_status' && event.status === 'success') {
    return {
      skill: 'canary',
      prompt: `Deployment to ${event.environment} succeeded. Monitor: ${event.targetUrl}`,
      needsBrowser: true,
      sessionMode: 'none',
    };
  }

  return null; // No matching route
}
```

**Skill command parsing** recognizes these patterns in issue comments:

```
/review          → review skill
/cso             → cso skill
/qa <url>        → qa skill with URL
/qa-only <url>   → qa-only skill
/investigate     → investigate skill
/ship            → ship skill
/office-hours    → office-hours skill
/plan-ceo-review → plan-ceo-review skill
/plan-eng-review → plan-eng-review skill
/design-review   → design-review skill
/plan-design-review → plan-design-review skill
/design-consultation → design-consultation skill
/autoplan        → autoplan skill
/retro [window]  → retro skill with optional time window
/benchmark       → benchmark skill
```

### `agent.ts` — Core Orchestrator

Extended from GMI's agent.ts with skill-aware execution:

1. **Receive route** from `router.ts` (skill name, prompt, browser flag, session mode)
2. **Load skill prompt** from `.gstack-actions/skills/{skill}.md`
3. **Inject context** — repo name, PR number, branch, diff stat, issue body
4. **Resolve session** — create new or resume existing based on session mode
5. **Execute pi-coding-agent** with constructed prompt and skill file as system context
6. **Extract reply** from JSONL output (same `tac | jq` pattern as GMI)
7. **Post reply** as issue/PR comment via `gh api`
8. **Persist state** — commit session file, results, any code edits
9. **Push with retry** — same conflict-resolution loop as GMI (10 attempts, `--rebase -X theirs`)
10. **Add outcome reaction** — 👍 (success) or 👎 (error)

### `browser.ts` — Playwright Helper

Utility functions for skills that need browser access:

```typescript
export async function captureScreenshot(url: string, outputPath: string): Promise<void>;
export async function runAccessibilitySnapshot(url: string): Promise<string>;
export async function checkPageHealth(url: string): Promise<HealthReport>;
export async function testResponsiveLayouts(url: string, outputDir: string): Promise<string[]>;
```

Used by `agent.ts` when the route specifies `needsBrowser: true`. The agent invokes these via its bash tool during skill execution.

---

## Configuration

### `config.json` — Skill Enablement and Routing

```json
{
  "version": "1.0.0",
  "skills": {
    "review": {
      "enabled": true,
      "trigger": "pull_request",
      "model": "claude-sonnet-4-20250514",
      "labelGated": false
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
    "office-hours": {
      "enabled": true,
      "trigger": "issue_label",
      "label": "office-hours",
      "model": "claude-sonnet-4-20250514"
    }
  },
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
  }
}
```

### Issue Templates

Pre-built issue templates guide users to provide the right input for each skill:

```yaml
# .github/ISSUE_TEMPLATE/gstack-qa.yml
name: "🧪 QA Testing Request"
description: "Request QA testing of a URL"
labels: ["gstack-qa"]
body:
  - type: input
    id: url
    attributes:
      label: "URL to test"
      description: "The URL to run QA testing against"
      placeholder: "https://staging.example.com"
    validations:
      required: true
  - type: dropdown
    id: tier
    attributes:
      label: "QA Tier"
      options:
        - Quick (critical + high only)
        - Standard (+ medium)
        - Exhaustive (+ cosmetic)
      default: 1
  - type: textarea
    id: focus
    attributes:
      label: "Focus area (optional)"
      description: "Specific pages or flows to focus on"
```

---

## Agent Identity

### `AGENTS.md` — Personality

The Githubified gstack agent gets its own identity, following the GMI "hatching" pattern:

```markdown
# Agent Instructions

## Identity: gstack 🔧

- **Name**: gstack
- **Nature**: A multi-specialist AI engineering agent running on GitHub Actions.
  Twenty-five skills in one system — review, security, QA, design, architecture,
  retrospectives, and more.
- **Vibe**: Thorough, opinionated, and action-oriented. Follows the Boil the Lake
  philosophy — do the complete thing, every time.
- **Emoji**: 🔧
- **Purpose**: To be the AI engineering team that every GitHub repository deserves.

## Operating Principles

1. **Boil the Lake** — Complete implementation over shortcuts
2. **Search Before Building** — Check if it exists before building it
3. **User Sovereignty** — Recommend, don't mandate

## Skill System

This agent has seventeen skills. When invoked, load the skill prompt from
`.gstack-actions/skills/{skill}.md` and follow its instructions precisely.
The skill has specialized workflows, checklists, and quality gates that produce
better results than answering inline.
```

---

## Design Decisions

### Why One Folder, Not Seventeen Repos

gstack's skills are interdependent — `/review` is invoked by `/ship`, `/autoplan` chains three skills, the ETHOS principles are shared. A single `.gstack-actions/` folder keeps everything co-located, version-controlled together, and deployable as one unit.

### Why Separate Workflow Files

Each workflow file handles a different trigger pattern. Combining all triggers into one workflow would create a complex conditional matrix. Separate files are easier to enable/disable, debug, and understand.

### Why Router Instead of Direct Skill Invocation

The router provides a single point of control for skill selection, configuration enforcement, and cost management. It reads `config.json` to check if a skill is enabled, whether it's label-gated, and which model to use — all before invoking the agent.

### Why Not Fork GMI

GMI is a minimal agent — one conversation, one skill. gstack-actions extends the pattern with skill routing, browser integration, and multi-skill orchestration. The lifecycle scripts are inspired by GMI but are different enough to be their own implementation.
