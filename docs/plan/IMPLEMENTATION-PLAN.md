# Implementation Plan — GitHub GStack Intelligence Multi-Skill System

### Transforming the current single-skill agent into a multi-skill AI engineering platform

---

## Current State Assessment

### What Exists Today (v1.1.0)

GitHub GStack Intelligence is a **working single-skill AI agent** built on the GMI (GitHub Minimum Intelligence) pattern. It operates as a general-purpose conversational agent triggered by GitHub Issues.

| Component | Location | Status |
|-----------|----------|--------|
| Core orchestrator | `.github-gstack-intelligence/lifecycle/agent.ts` | ✅ Working — handles issue events, session management, push conflict resolution |
| Single workflow | `.github/workflows/github-gstack-intelligence-agent.yml` | ✅ Working — 3 jobs (install, agent, gitpages) |
| Pi-mono runtime | `@mariozechner/pi-coding-agent@0.57.1` | ✅ Installed |
| LLM configuration | `.github-gstack-intelligence/.pi/settings.json` | ✅ Configured (OpenAI GPT-5.4, high thinking) |
| System prompt | `.github-gstack-intelligence/.pi/APPEND_SYSTEM.md` | ✅ Working |
| Bootstrap protocol | `.github-gstack-intelligence/.pi/BOOTSTRAP.md` | ✅ Working (hatch via labeled issue) |
| Skills (pi-mono) | `.github-gstack-intelligence/.pi/skills/` | ✅ 2 skills: `memory`, `skill-creator` |
| Prompt templates | `.github-gstack-intelligence/.pi/prompts/` | ✅ 2 prompts: `code-review`, `issue-triage` |
| Extensions | `.github-gstack-intelligence/.pi/extensions/github-context.ts` | ✅ 1 extension: `github_repo_context` |
| Session state | `.github-gstack-intelligence/state/` | ✅ Working (issues/*.json → sessions/*.jsonl) |
| Self-installer | Workflow job `run-install` | ✅ Working (install/upgrade/skip) |
| GitHub Pages | Workflow job `run-gitpages` | ✅ Working |
| Authorization | Inline in workflow | ✅ Working (collaborator permission check) |
| Bot loop prevention | In agent.ts (RESERVED_PREFIXES) | ✅ Working |

### What the Docs Describe (Target State)

The documentation in `docs/plan/` describes a comprehensive **17-skill AI engineering platform** called `.gstack-actions/` with:

- **Skill router** (`router.ts`) mapping GitHub events to specific specialist skills
- **8 separate workflow files** for different trigger patterns
- **17 adapted skill prompts** from gstack's local toolkit
- **Browser integration** (`browser.ts`) via Playwright for QA skills
- **Per-skill configuration** (`config.json`) with model tiering, label gating, rate limiting
- **Specialized state management** for reviews, QA reports, benchmarks, retros
- **5-phase rollout** from proof-of-concept to marketplace distribution

---

## Gap Analysis

### Naming Convention Decision

The docs reference `.gstack-actions/` but the existing system uses `.github-gstack-intelligence/`. This plan proposes **keeping the existing `.github-gstack-intelligence/` naming** and building the multi-skill system within it, for these reasons:

1. The repository is already published as `github-gstack-intelligence`
2. Users already have the `.github-gstack-intelligence/` folder installed
3. The self-installer references this path
4. Renaming mid-stream would break existing installations

All references to `.gstack-actions/` in the planning docs should be understood as `.github-gstack-intelligence/` in implementation.

### What Needs to Be Built

| Component | Gap | Effort |
|-----------|-----|--------|
| **Skill router** (`router.ts`) | Does not exist | High — new file mapping events → skills |
| **17 adapted skill prompts** | 0 of 17 exist as adapted CI-ready markdown | High — each skill needs local→CI adaptation |
| **config.json** | Does not exist | Medium — skill configuration schema |
| **browser.ts** | Does not exist | Medium — Playwright helper functions |
| **Separate workflow files** | 1 exists, 8 needed | Medium — 7 additional workflows |
| **Issue templates** | Do not exist | Low — 4 YAML templates |
| **Specialized state directories** | Partially exist (issues/, sessions/) | Low — add results/, benchmarks/ |
| **ETHOS.md** | Does not exist | Low — copy from gstack source |
| **Reference files** (checklists, taxonomies) | Do not exist | Low — copy/adapt from gstack source |
| **Cost controls & rate limiting** | Do not exist | Medium — extend router with config checks |

### What Can Be Reused

| Component | Reuse Strategy |
|-----------|---------------|
| `agent.ts` orchestrator | Extend with `--skill` argument, skill prompt loading, PR context injection |
| Session management | Already working — no changes needed for basic flow |
| Push conflict resolution | Already working — 10-retry loop with `--rebase -X theirs` |
| Authorization model | Already working — collaborator permission check |
| Self-installer | Extend to copy additional workflow files |
| `.pi/settings.json` | Keep as default; `config.json` overrides per-skill |
| GitHub Pages integration | Keep as-is |

---

## Implementation Phases

### Phase 1 — Foundation: Skill Router & Configuration (Week 1–2)

**Goal:** Establish the routing infrastructure so the agent can dispatch to different skills based on GitHub events.

#### 1.1 Create `config.json` schema

Create `.github-gstack-intelligence/config.json` with the skill configuration schema defined in [04-architecture.md](04-architecture.md) and [07-cost-and-controls.md](07-cost-and-controls.md).

```
File: .github-gstack-intelligence/config.json
```

Start with a minimal configuration enabling only Phase 1 skills:

```json
{
  "version": "1.0.0",
  "skills": {
    "review": { "enabled": true, "trigger": "pull_request", "labelGated": false },
    "cso": { "enabled": true, "trigger": "pull_request", "labelGated": true, "label": "security-audit" }
  },
  "defaults": {
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

#### 1.2 Create `router.ts`

Create `.github-gstack-intelligence/lifecycle/router.ts` implementing the `RouteResult` interface from [04-architecture.md](04-architecture.md):

```typescript
// Key exports:
interface RouteResult {
  skill: string;
  prompt: string;
  needsBrowser: boolean;
  sessionMode: 'new' | 'resume' | 'none';
}

function route(event: GitHubEvent, config: Config): RouteResult | null;
function parseSkillCommand(body: string): SkillCommand | null;
```

**Implementation details:**
- Parse `GITHUB_EVENT_PATH` payload to determine event type
- For `pull_request` events → route to `review` (always) and `cso` (if label present)
- For `issue_comment` events → parse `/command` prefix to route to specific skills
- For `issues` events → check labels for skill routing
- For `schedule`, `release`, `deployment_status` events → route to appropriate skills
- Check `config.json` for skill enablement and label gating
- Return `null` for unrecognized or disabled routes

#### 1.3 Extend `agent.ts` with skill-aware execution

Modify `.github-gstack-intelligence/lifecycle/agent.ts` to:

1. Accept `--skill <name>` and `--route` CLI arguments
2. When `--route` is passed, call `router.ts` to determine the skill
3. When `--skill <name>` is passed, use that skill directly
4. Load skill prompt from `.github-gstack-intelligence/skills/{skill}.md`
5. Inject GitHub context (repo, PR number, branch, diff stat) into the prompt
6. Pass the constructed prompt to `pi` along with the skill file as additional context

**Key changes to agent.ts:**
- Add argument parsing for `--skill`, `--route`, `--pr`, `--args`
- Add skill prompt loading function
- Add GitHub context injection (PR diff, issue body, repo metadata)
- Keep backward compatibility: if no `--skill`/`--route` args, behave as today (general conversation)

#### 1.4 Create state subdirectories

```
.github-gstack-intelligence/state/
├── issues/           # Already exists
├── sessions/         # Already exists
├── results/
│   ├── review/       # Review results by PR number
│   ├── security/     # Security audit results
│   ├── qa/           # QA reports
│   │   └── screenshots/
│   └── retro/        # Retro history
└── benchmarks/       # Benchmark baselines
```

#### Exit Criteria
- [ ] `config.json` exists with schema for skill enablement
- [ ] `router.ts` correctly routes `pull_request`, `issue_comment`, and `issues` events
- [ ] `agent.ts` accepts `--skill` and `--route` arguments
- [ ] Backward compatible: existing general conversation flow unchanged
- [ ] State directories created

---

### Phase 2 — Core Review Skills: `/review` + `/cso` (Week 2–3)

**Goal:** PR code review and security audit run automatically on every pull request.

#### 2.1 Adapt `/review` skill prompt

Create `.github-gstack-intelligence/skills/review.md` by adapting gstack's `review/SKILL.md.tmpl`:

**Adaptations required** (per [03-skill-adaptation.md](03-skill-adaptation.md)):
- Remove `{{PREAMBLE}}` expansion → replace with CI-specific context header
- Remove `AskUserQuestion` references → ASK items posted as PR comments
- Remove `gstack-review-log` → replace with state file commit
- Replace `~/.claude/skills/review/checklist.md` path → `.github-gstack-intelligence/skills/references/review-checklist.md`
- Add GitHub context header (repo, PR number, branch, diff stat)
- Ensure output format is GitHub PR comment compatible (Markdown, <60k chars)

#### 2.2 Adapt `/cso` skill prompt

Create `.github-gstack-intelligence/skills/cso.md` by adapting gstack's `cso/SKILL.md.tmpl`:

**Same adaptation pattern as `/review`**, plus:
- OWASP Top 10 + STRIDE framework retained
- Security findings posted with severity labels

#### 2.3 Copy supplementary reference files

```
.github-gstack-intelligence/skills/references/
├── review-checklist.md           # From gstack review/checklist.md
├── review-design-checklist.md    # From gstack review/design-checklist.md
└── cso-acknowledgements.md       # From gstack cso/ACKNOWLEDGEMENTS.md
```

#### 2.4 Create PR review workflow

Create `.github/workflows/gstack-review.yml` per the spec in [05-workflows.md](05-workflows.md):

- Triggers on `pull_request: [opened, synchronize]`
- Two jobs: `review` (always) and `security` (label-gated or always, configurable)
- Concurrency: `gstack-review-{PR#}` with `cancel-in-progress: true`
- Authorization check before agent invocation

#### 2.5 Add ETHOS.md

Create `.github-gstack-intelligence/ETHOS.md` with the three builder principles:
1. Boil the Lake
2. Search Before Building
3. User Sovereignty

Inject into `.pi/APPEND_SYSTEM.md` or load as skill context.

#### Exit Criteria
- [ ] `/review` skill prompt adapted and working
- [ ] `/cso` skill prompt adapted and working
- [ ] Reference files (checklists, acknowledgements) copied
- [ ] `gstack-review.yml` workflow triggers on PRs
- [ ] Review findings appear as structured PR comments
- [ ] Security findings appear as separate PR comments
- [ ] Results committed to `state/results/review/` and `state/results/security/`
- [ ] Bot loop prevention works (agent comments don't trigger re-runs)

---

### Phase 3 — Issue-Driven Skills: `/investigate` + Conversation Skills (Week 3–4)

**Goal:** Multi-turn conversation skills work through issue comments with session continuity.

#### 3.1 Adapt `/investigate` skill prompt

Create `.github-gstack-intelligence/skills/investigate.md`:
- Issue body = bug description
- Remove `AskUserQuestion` → post comment requesting clarification
- Output: root-cause analysis as issue comment

#### 3.2 Adapt conversation skill prompts

Create adapted prompts for:
- `.github-gstack-intelligence/skills/office-hours.md` — Product idea refinement
- `.github-gstack-intelligence/skills/plan-ceo-review.md` — CEO-level feature review
- `.github-gstack-intelligence/skills/plan-eng-review.md` — Architecture review
- `.github-gstack-intelligence/skills/plan-design-review.md` — Report-only design audit
- `.github-gstack-intelligence/skills/design-consultation.md` — Design system creation

**Adaptation pattern for all conversation skills:**
- Remove `AskUserQuestion` → "Post a comment to continue the conversation"
- Add session continuity instructions (the agent will be resumed via `--session`)
- Ensure structured output suitable for GitHub issue comments

#### 3.3 Extend router for label-based routing

Update `router.ts` to handle:
- Issues labeled `office-hours` → route to office-hours skill
- Issues labeled `investigate` → route to investigate skill
- Issues labeled `ceo-review` → route to plan-ceo-review skill
- Issues labeled `design-consultation` → route to design-consultation skill
- Comments on existing sessions → resume with the active skill

#### 3.4 Create issue templates

```
.github/ISSUE_TEMPLATE/
├── gstack-investigate.yml      # Bug investigation template
├── gstack-office-hours.yml     # Product idea template
└── gstack-review.yml           # Manual review request template
```

#### 3.5 Adapt `/autoplan` skill

Create `.github-gstack-intelligence/skills/autoplan.md`:
- Sequential execution: CEO review → design review → eng review
- Either chained agent invocations or combined prompt

#### Exit Criteria
- [ ] `/investigate` posts root-cause analysis on labeled issues
- [ ] `/office-hours` starts a multi-turn conversation
- [ ] Commenting on an existing conversation resumes from session state
- [ ] Session state persists across days/weeks
- [ ] Issue templates guide users to provide correct input
- [ ] `/autoplan` chains three review skills

---

### Phase 4 — Browser Skills: `/qa` + `/design-review` + `/canary` (Week 4–6)

**Goal:** Browser-based QA testing, design review, and post-deploy monitoring.

#### 4.1 Create `browser.ts` Playwright helper

Create `.github-gstack-intelligence/lifecycle/browser.ts` with:

```typescript
export async function captureScreenshot(url: string, outputPath: string): Promise<void>;
export async function runAccessibilitySnapshot(url: string): Promise<string>;
export async function checkPageHealth(url: string): Promise<HealthReport>;
export async function testResponsiveLayouts(url: string, outputDir: string): Promise<string[]>;
```

#### 4.2 Adapt `/qa` skill prompt

Create `.github-gstack-intelligence/skills/qa.md`:
- Replace `$B <command>` syntax with Playwright equivalents (see browser command mapping in [03-skill-adaptation.md](03-skill-adaptation.md))
- Replace `{{BROWSE_SETUP}}` with Playwright initialization
- Copy issue taxonomy and report template to references/

```
.github-gstack-intelligence/skills/references/
├── qa-issue-taxonomy.md        # QA issue classification
└── qa-report-template.md       # QA report format
```

#### 4.3 Adapt `/qa-only`, `/design-review`, `/canary`

- `.github-gstack-intelligence/skills/qa-only.md` — QA report without fixes
- `.github-gstack-intelligence/skills/design-review.md` — Design audit with before/after screenshots
- `.github-gstack-intelligence/skills/canary.md` — Post-deploy monitoring

#### 4.4 Create QA workflow

Create `.github/workflows/gstack-qa.yml` per [05-workflows.md](05-workflows.md):
- Triggers on `issue_comment` with `/qa` or `/qa-only` prefix
- Includes	 Playwright browser installation step
- Includes screenshot artifact upload
- Concurrency: `gstack-qa-{issue#}` with `cancel-in-progress: false`

#### 4.5 Create canary workflow

Create `.github/workflows/gstack-canary.yml`:
- Triggered by `deployment_status` success event
- Includes Playwright for health checks
- Creates issue if problems found

#### Exit Criteria
- [ ] `browser.ts` Playwright helper functions working
- [ ] `/qa https://example.com` in an issue comment triggers browser-based QA
- [ ] Screenshots appear inline in issue comments
- [ ] QA findings committed to `state/results/qa/`
- [ ] `/design-review` posts design findings on PRs with CSS/UI changes
- [ ] `/canary` monitors deployments after success

---

### Phase 5 — Scheduled & Event-Driven Skills (Week 6–7)

**Goal:** Automated skills that run on schedules or in response to GitHub events.

#### 5.1 Adapt `/retro` skill prompt

Create `.github-gstack-intelligence/skills/retro.md`:
- Remove interactive time window selection → use workflow_dispatch input or cron default
- Output → new issue with retro report

#### 5.2 Adapt `/benchmark` skill prompt

Create `.github-gstack-intelligence/skills/benchmark.md`:
- Baseline comparison using `state/benchmarks/baseline.json`
- Output → issue comment with regression table

#### 5.3 Adapt `/ship` skill prompt

Create `.github-gstack-intelligence/skills/ship.md`:
- Check for existing review results in `state/results/review/`
- Run tests, create PR, handle version bumping

#### 5.4 Adapt `/document-release` skill prompt

Create `.github-gstack-intelligence/skills/document-release.md`:
- Triggered by release event
- Read release notes, open PR with doc updates

#### 5.5 Create scheduled/event workflows

```
.github/workflows/
├── gstack-retro.yml            # Weekly cron + workflow_dispatch
├── gstack-benchmark.yml        # Daily cron + push + workflow_dispatch
├── gstack-document-release.yml # Release published trigger
```

#### Exit Criteria
- [ ] Weekly retro runs every Friday and creates an issue
- [ ] Benchmark runs and reports regressions
- [ ] `/document-release` updates docs when a release is published
- [ ] `/ship` creates a PR with version bump

---

### Phase 6 — Cost Controls & Hardening (Week 7–8)

**Goal:** Production-ready cost management and safety controls.

#### 6.1 Model tiering

Implement per-skill model selection in `config.json`:
- Sonnet-class models for complex skills (review, cso, qa, investigate)
- Haiku-class models for routine skills (retro, benchmark, document-release)

#### 6.2 Rate limiting

Add to `router.ts`:
- Global rate limits (max runs per hour/day)
- Per-skill rate limits
- Cost tracking per invocation

#### 6.3 Diff-based filtering

Add to `router.ts`:
- Skip review if only docs changed (`skipDocsOnly`)
- Skip if diff is trivially small (< 5 lines)
- Only run design-review if UI files changed

#### 6.4 Enhanced bot loop prevention

Beyond existing `RESERVED_PREFIXES`:
- Agent comment signature (`<!-- gstack-intelligence-agent -->`)
- Reaction-based deduplication (skip if 🚀 already present)
- Actor check for bot accounts

#### 6.5 Granular access control

Per-skill permission levels:
- Destructive skills (`/ship`) restricted to admin/maintain
- Read-only skills (`/review`) open to all collaborators

#### Exit Criteria
- [ ] Model tiering reduces costs by ~50% for routine skills
- [ ] Rate limits prevent runaway costs
- [ ] Diff-based filtering skips unnecessary runs
- [ ] No bot loops possible
- [ ] Granular access control working

---

### Phase 7 — Distribution & Self-Installer (Week 8–9)

**Goal:** Any repository can install the multi-skill system in under 5 minutes.

#### 7.1 Update self-installer

Extend the existing `run-install` job in `github-gstack-intelligence-agent.yml` to:
- Copy additional workflow files (`gstack-review.yml`, `gstack-qa.yml`, etc.)
- Copy issue templates
- Initialize `config.json` with sensible defaults
- Version management with semantic versioning

#### 7.2 Upgrade path

Ensure upgrades preserve:
- User-customized `AGENTS.md`
- `.pi/` configuration
- `state/` session data
- `config.json` skill settings

#### 7.3 Documentation

- Per-skill documentation with usage examples
- Cost estimation guide
- Troubleshooting guide
- Configuration reference

#### Exit Criteria
- [ ] New repo fully operational in <5 minutes
- [ ] Upgrade path preserves user configuration
- [ ] Documentation covers all 17 skills

---

## Implementation Dependencies

```
Phase 1 (Router & Config)
    │
    ├─── Phase 2 (Review & CSO)
    │        │
    │        ├─── Phase 4 (Browser Skills) ← needs Playwright integration
    │        │
    │        └─── Phase 5 (Scheduled Skills)
    │
    └─── Phase 3 (Conversation Skills)
              │
              └─── Phase 5 (Scheduled Skills) ← needs session management patterns
                        │
                        └─── Phase 6 (Cost Controls)
                                  │
                                  └─── Phase 7 (Distribution)
```

Phases 2 and 3 can proceed in parallel after Phase 1.
Phase 4 depends on Phase 2 (browser builds on review workflow pattern).
Phase 5 depends on components from both Phase 2 and Phase 3.
Phase 6 can start alongside Phase 5.
Phase 7 depends on all skills being operational.

---

## File Inventory — All New Files

### Lifecycle Scripts (4 files)

| File | Phase | Description |
|------|-------|-------------|
| `.github-gstack-intelligence/lifecycle/router.ts` | 1 | Skill router — maps GitHub events to skills |
| `.github-gstack-intelligence/lifecycle/browser.ts` | 4 | Playwright helper functions |
| `.github-gstack-intelligence/lifecycle/agent.ts` | 1 | **Modified** — add `--skill`/`--route` support |
| `.github-gstack-intelligence/config.json` | 1 | Skill configuration |

### Skill Prompts (17 files)

| File | Phase | Tier |
|------|-------|------|
| `skills/review.md` | 2 | T1 |
| `skills/cso.md` | 2 | T1 |
| `skills/ship.md` | 5 | T1 |
| `skills/benchmark.md` | 5 | T1 |
| `skills/retro.md` | 5 | T1 |
| `skills/document-release.md` | 5 | T1 |
| `skills/qa.md` | 4 | T2 |
| `skills/qa-only.md` | 4 | T2 |
| `skills/design-review.md` | 4 | T2 |
| `skills/plan-design-review.md` | 3 | T2 |
| `skills/investigate.md` | 3 | T2 |
| `skills/canary.md` | 4 | T2 |
| `skills/office-hours.md` | 3 | T3 |
| `skills/plan-ceo-review.md` | 3 | T3 |
| `skills/plan-eng-review.md` | 3 | T3 |
| `skills/design-consultation.md` | 3 | T3 |
| `skills/autoplan.md` | 3 | T3 |

### Reference Files (5 files)

| File | Phase |
|------|-------|
| `skills/references/review-checklist.md` | 2 |
| `skills/references/review-design-checklist.md` | 2 |
| `skills/references/cso-acknowledgements.md` | 2 |
| `skills/references/qa-issue-taxonomy.md` | 4 |
| `skills/references/qa-report-template.md` | 4 |

### Workflow Files (7 new files)

| File | Phase |
|------|-------|
| `.github/workflows/gstack-review.yml` | 2 |
| `.github/workflows/gstack-qa.yml` | 4 |
| `.github/workflows/gstack-retro.yml` | 5 |
| `.github/workflows/gstack-benchmark.yml` | 5 |
| `.github/workflows/gstack-document-release.yml` | 5 |
| `.github/workflows/gstack-canary.yml` | 4 |
| `.github/workflows/gstack-install.yml` | 7 |

### Issue Templates (4 files)

| File | Phase |
|------|-------|
| `.github/ISSUE_TEMPLATE/gstack-qa.yml` | 4 |
| `.github/ISSUE_TEMPLATE/gstack-investigate.yml` | 3 |
| `.github/ISSUE_TEMPLATE/gstack-office-hours.yml` | 3 |
| `.github/ISSUE_TEMPLATE/gstack-review.yml` | 2 |

### Other Files (2 files)

| File | Phase |
|------|-------|
| `.github-gstack-intelligence/ETHOS.md` | 2 |
| `.github-gstack-intelligence/config.json` | 1 |

---

## Total File Count

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Lifecycle scripts | 2 | 1 (agent.ts) |
| Skill prompts | 17 | 0 |
| Reference files | 5 | 0 |
| Workflow files | 7 | 1 (existing agent workflow) |
| Issue templates | 4 | 0 |
| Configuration | 2 | 0 |
| **Total** | **37** | **2** |

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| LLM costs exceed budget | High | Medium | Model tiering, label gating, rate limits (Phase 6) |
| Skill prompt adaptation introduces regressions | Medium | Medium | Test each adapted skill against known scenarios |
| Push conflicts with concurrent agents | Medium | Medium | Existing 10-retry loop with `--rebase -X theirs` |
| Session files grow unbounded | Medium | Medium | Archive policy (90-day rotation) |
| Breaking backward compatibility | High | Low | Keep existing general conversation flow as default |
| Playwright cold start too slow | Low | Low | Acceptable for CI (~10s startup) |
| GitHub API rate limiting | Medium | Low | Agent uses `gh` CLI with GITHUB_TOKEN (5,000 requests/hour) |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Review accuracy | Agent catches ≥80% of issues found by human reviewers |
| False positive rate | <20% of flagged issues are false positives |
| Time to first review comment | <3 minutes from PR opened |
| Session continuity | 100% of resumed conversations retain full context |
| Installation time | New repo fully operational in <5 minutes |
| Cost per PR (standard tier) | <$0.15 for review + security audit |
| Backward compatibility | Existing installations continue working without changes |

---

## Open Questions

1. **Naming:** Should the skills directory live under `.github-gstack-intelligence/skills/` (alongside `.pi/skills/`) or as a separate top-level within the dot-folder? The `.pi/skills/` directory already has a specific meaning in pi-mono (on-demand capability packages). The new gstack-style skills are prompt templates, not pi-mono skills. **Recommendation:** Use `.github-gstack-intelligence/skills/` as a sibling to `.pi/` to avoid confusion.

2. **Gstack source access:** The docs reference `repo/gstack/` as the source for extracting skill templates and reference files. These files need to be obtained from the [gstack repository](https://github.com/garrytan/gstack). **Action needed:** Clone or download the gstack repo to extract the skill templates for adaptation.

3. **Single vs. multiple workflows:** The current system uses a single unified workflow. The docs describe 8 separate workflows. **Recommendation:** Start with the single-workflow approach for Phases 1–3 (extend the existing workflow with routing), then split into separate workflows when adding browser-dependent and scheduled skills in Phases 4–5.

4. **Pi-mono skill format vs. gstack skill format:** Pi-mono skills use YAML frontmatter (`name`, `description`) and are loaded automatically by the pi agent. Gstack-style skills are standalone Markdown files loaded explicitly by the lifecycle scripts. **Recommendation:** Use the gstack-style format for new skills (loaded by `agent.ts`) and keep existing pi-mono skills (`memory`, `skill-creator`) as-is.

---

*Implementation plan for [GitHub GStack Intelligence](https://github.com/japer-technology/github-gstack-intelligence), informed by planning documents in `docs/plan/`, analysis in `docs/overview/` and `docs/analysis/`, and the existing v1.1.0 codebase.*
