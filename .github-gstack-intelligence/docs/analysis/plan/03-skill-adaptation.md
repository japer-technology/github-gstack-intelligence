# 03 — Skill Adaptation

### How each skill maps to GitHub Actions triggers and events

---

## The Adaptation Pattern

Every gstack skill follows the same adaptation process:

1. **Remove local preamble** — strip `{{PREAMBLE}}` expansion that references `~/.gstack/`, `~/.claude/skills/`, local config detection
2. **Replace browse setup** — swap `{{BROWSE_SETUP}}` and `$B <command>` with Playwright equivalents
3. **Replace AskUserQuestion** — for non-interactive skills, remove entirely; for multi-turn skills, replace with "post a comment and wait for the next `issue_comment` event"
4. **Inject GitHub context** — add PR number, branch name, diff summary, issue body, repo metadata
5. **Adapt output format** — ensure output is Markdown suitable for GitHub issue/PR comments (within 60,000 character limit)
6. **Remove local state paths** — replace `~/.gstack/sessions/`, `gstack-config`, `gstack-review-log` with `.github-gstack-intelligence/state/` equivalents

---

## Tier 1 — Natural Fit (Event-Driven, No User Interaction)

### `/review` — Pre-Landing PR Review

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/review` in Claude Code | `pull_request: [opened, synchronize]` |
| **Input** | `git diff origin/<base>` run by agent | Diff provided by checkout + `git diff` on runner |
| **Checklist** | Reads from `~/.claude/skills/review/checklist.md` | Reads from `.github-gstack-intelligence/skills/review/checklist.md` |
| **Output** | Displayed in Claude Code terminal | Posted as PR comment via `gh pr comment` |
| **Fix-First** | Auto-fixes + AskUserQuestion for ASK items | Auto-fixes committed; ASK items posted as comment requesting reply |
| **Greptile integration** | Fetches Greptile comments via `gh api` | Same — `gh api` available on runner |
| **State** | `gstack-review-log` writes to local file | Results committed to `.github-gstack-intelligence/state/results/review/` |

**Adaptation effort:** Low. The review skill is the most natural fit — the diff IS the input, and the output is structured Markdown that posts perfectly as a PR comment.

### `/cso` — Security Audit

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/cso` | `pull_request: [opened, synchronize]` (with `/review`) or label `security-audit` |
| **Input** | Full codebase access via Claude Code | Full checkout on runner |
| **Output** | OWASP Top 10 + STRIDE findings in terminal | Posted as PR comment with severity labels |
| **State** | None persistent | Results committed to `.github-gstack-intelligence/state/results/security/` |

**Adaptation effort:** Low. Security audit is read-only analysis — no browser, no user interaction.

### `/ship` — Full Shipping Workflow

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/ship` | `workflow_dispatch` or issue comment "ship" |
| **Input** | Current branch state | Checkout of specified branch |
| **Workflow** | Tests → review → version bump → commit → push → PR | Same sequence, executed on runner |
| **Output** | PR URL in terminal | PR URL posted as issue comment |
| **Blocking** | AskUserQuestion for ASK review items, version bump choice | Comment requesting input; agent resumes on next `issue_comment` event |

**Adaptation effort:** Moderate. The ship workflow is multi-step and has conditional blocking points that need comment-based input.

### `/benchmark` — Performance Regression Detection

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/benchmark` | `push` to main or `schedule` (nightly) |
| **Input** | Local benchmark suite | Benchmark suite on runner |
| **Output** | Comparison against baseline | Posted as issue comment with regression/improvement table |
| **State** | Local baseline files | Baselines committed to `.github-gstack-intelligence/state/benchmarks/` |

**Adaptation effort:** Low. Benchmark is fully automated — run suite, compare to committed baseline, report.

### `/retro` — Weekly Retrospective

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/retro` | `schedule: cron('0 17 * * 5')` (Friday 5pm) or `workflow_dispatch` |
| **Input** | Git history for time window | Same — full git history via checkout with `fetch-depth: 0` |
| **Output** | Retro report in terminal | New issue created with retro report, or posted in a dedicated retro issue |
| **State** | Retro history in local files | History committed to `.github-gstack-intelligence/state/retros/` for trend tracking |

**Adaptation effort:** Low. Retro reads git history — identical on runner. The time window arguments (`/retro 7d`, `/retro 14d`) map to `workflow_dispatch` inputs.

### `/document-release` — Post-Release Documentation

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/document-release` | `release: [published]` |
| **Input** | What changed since last release | Release notes + git diff between tags |
| **Output** | Updated docs committed locally | PR opened with documentation updates |
| **State** | None | None needed |

**Adaptation effort:** Low. Triggered by release event, reads release notes and changelog, updates docs, opens PR.

---

## Tier 2 — Good Fit (Brief Input via Issues)

### `/qa` — QA Testing with Real Browser

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/qa https://staging.example.com` | Issue comment: "qa https://staging.example.com" |
| **Browser** | gstack browse daemon on localhost (persistent, sub-second) | Playwright launched fresh per workflow (cold-start acceptable) |
| **Screenshots** | Saved to local filesystem, shown via Read tool | Uploaded as issue comment attachments via GitHub API |
| **Bug fixes** | Agent edits code, commits atomically | Same — agent edits code on runner, lifecycle script commits and pushes |
| **Output** | QA report in terminal | QA report posted as issue comment with embedded screenshots |
| **Tiers** | Quick/Standard/Exhaustive via CLI args | Specified in issue comment or label: `qa-quick`, `qa-standard`, `qa-exhaustive` |

**Adaptation effort:** Moderate. The browser model changes from persistent daemon to ephemeral Playwright. The `$B <command>` syntax must be replaced with Playwright API equivalents in the adapted skill prompt.

**Browser command mapping:**

| gstack `$B` command | Playwright equivalent |
|---------------------|----------------------|
| `$B goto <url>` | `await page.goto(url)` |
| `$B screenshot <path>` | `await page.screenshot({ path })` |
| `$B click <selector>` | `await page.click(selector)` |
| `$B fill <selector> <value>` | `await page.fill(selector, value)` |
| `$B text` | `await page.textContent('body')` |
| `$B console` | `page.on('console', msg => ...)` |
| `$B is visible <selector>` | `await page.isVisible(selector)` |
| `$B snapshot -i` | Custom accessibility tree snapshot function |
| `$B responsive <path>` | Loop over viewports: `page.setViewportSize()` + `page.screenshot()` |

### `/qa-only` — QA Report Only

Same as `/qa` but produces a report without making code changes. The adapted skill prompt omits the "fix and re-verify" loop.

**Adaptation effort:** Low (same as `/qa` minus the fix loop).

### `/design-review` — Design Audit

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/design-review` | `pull_request` when CSS/UI files are changed (path filter: `**/*.css`, `**/*.scss`, `**/*.tsx`, `**/*.vue`) |
| **Browser** | Browse daemon for screenshots | Playwright for before/after screenshots |
| **Output** | Design findings with screenshots in terminal | PR comment with embedded screenshots and design scores |

**Adaptation effort:** Moderate. Requires browser + screenshot upload, same as `/qa`.

### `/plan-design-review` — Report-Only Design Audit

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/plan-design-review` | Issue comment requesting design review |
| **Output** | Design dimension ratings (0-10) in terminal | Posted as issue comment |

**Adaptation effort:** Low. Text-only analysis, no browser needed.

### `/investigate` — Root-Cause Debugging

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/investigate` with bug description | Issue opened with `investigate` label, or issue comment "investigate" |
| **Input** | Bug description from user | Issue body = bug description |
| **Output** | Root-cause analysis in terminal | Posted as issue comment |
| **Follow-up** | AskUserQuestion for clarification | Comment requesting clarification; resumes on next `issue_comment` |

**Adaptation effort:** Low. Investigation is code analysis — reads files, traces logic, reports findings.

### `/canary` — Post-Deploy Monitoring

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/canary` after deploy | `deployment_status: [success]` |
| **Input** | Deployment URL | URL from deployment event payload |
| **Browser** | Browse daemon for health checks | Playwright for health checks |
| **Output** | Monitoring results in terminal | Posted as issue comment; creates issue if problems found |

**Adaptation effort:** Moderate. Requires browser for health checks, similar to `/qa`.

---

## Tier 3 — Moderate Fit (Multi-Turn Conversation)

These skills require the GMI conversation pattern: agent posts a comment, user replies, agent resumes from session state.

### `/office-hours` — Product Idea Refinement

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/office-hours` | Issue opened with `office-hours` label |
| **Conversation** | Interactive back-and-forth in Claude Code | Issue comments: user posts, agent replies, user posts again |
| **Session** | Claude Code session state | `.github-gstack-intelligence/state/issues/{N}.json` → `state/sessions/{ts}.jsonl` |
| **Output** | Refined product specification | Accumulated in issue thread; final spec posted as summary comment |

**Adaptation effort:** Low (uses GMI's existing conversation pattern exactly).

### `/plan-ceo-review` — CEO-Level Feature Review

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/plan-ceo-review` | Issue comment "plan-ceo-review" or label `ceo-review` |
| **Input** | Feature description from user | Issue body = feature description |
| **Output** | Structured analysis finding the "10-star product" | Posted as issue comment |
| **Follow-up** | May ask clarifying questions via AskUserQuestion | Comment requesting clarification |

**Adaptation effort:** Low. Primarily a text analysis skill.

### `/plan-eng-review` — Architecture Review

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/plan-eng-review` | Issue comment or label `eng-review` |
| **Input** | Architecture description or codebase | Issue body + full checkout |
| **Output** | Architecture lock: data flow, edge cases, tests | Posted as issue comment |

**Adaptation effort:** Low. Code analysis + text output.

### `/design-consultation` — Design System Creation

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/design-consultation` | Issue with `design-consultation` label |
| **Conversation** | Extended multi-turn design system creation | Issue thread with iterative refinement |
| **Output** | Complete design system specification | Accumulated in issue thread |

**Adaptation effort:** Moderate. Longest multi-turn conversation skill — may span many comments.

### `/autoplan` — Auto-Review Pipeline

| Aspect | Local | Githubified |
|--------|-------|-------------|
| **Trigger** | Developer types `/autoplan` | Issue comment "autoplan" |
| **Workflow** | Sequential: CEO review → design review → eng review | Sequential agent invocations within a single workflow run |
| **Output** | Combined results from all three reviews | Single combined comment or three separate comments |

**Adaptation effort:** Moderate. Requires orchestrating three skill invocations sequentially within one workflow run.

---

## Skill Prompt Template — CI Adaptation

Every adapted skill follows this template structure:

```markdown
# {Skill Name} — GitHub Actions Adaptation

## Context Injection

You are running on GitHub Actions as part of the Githubified gstack system.
- **Repository:** {repo_owner}/{repo_name}
- **Event:** {event_type} (PR #{number} / Issue #{number})
- **Actor:** {github.actor}
- **Branch:** {branch_name}
- **Diff summary:** {diff_stat}

## gstack Ethos

{ETHOS.md content — Boil the Lake, Search Before Building, User Sovereignty}

## Skill Instructions

{Adapted SKILL.md.tmpl content — local references replaced with CI equivalents}

## Output Format

Your response will be posted as a GitHub {issue/PR} comment.
- Use Markdown formatting
- Keep within 60,000 characters
- Include file:line references for code findings
- Use collapsible sections (<details>) for verbose output
```

---

## Adaptation Priority

| Priority | Skills | Rationale |
|----------|--------|-----------|
| P0 | `/review`, `/cso` | Highest value, lowest effort. Every PR gets reviewed and security-audited automatically. |
| P1 | `/qa`, `/investigate` | High value, moderate effort. QA requires browser setup. |
| P2 | `/retro`, `/benchmark`, `/document-release` | Scheduled/event-driven, fully automated. |
| P3 | `/office-hours`, `/plan-ceo-review`, `/plan-eng-review` | Multi-turn conversation — uses proven GMI pattern. |
| P4 | `/ship`, `/autoplan`, `/design-consultation`, `/canary` | Most complex adaptations. |
| P5 | `/qa-only`, `/plan-design-review`, `/design-review` | Variants of already-adapted skills. |
