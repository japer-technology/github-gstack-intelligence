# /document-release — Release Documentation

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

> Post-ship documentation update that ensures all project docs are accurate, up-to-date, and written in a friendly, user-forward voice.

---

## Quick Reference

| Property | Value |
|---|---|
| Trigger | Automatic on `release` event (when a new release is published) |
| Browser Required | ❌ No |
| Default State | ✅ Enabled |
| Results Path | `state/results/releases/{tag}.json` |

---

## How to Use

**Automatic (default):** Runs automatically when a GitHub release is published. No manual action required.

**Via `/ship`:** The `/ship` workflow auto-invokes `/document-release` after creating the PR (Step 8.5), so documentation stays in sync without a separate command.

**Manual:** Can also be triggered via `workflow_dispatch` if configured.

The skill is mostly automated — it makes obvious factual updates directly and only stops for risky or subjective decisions.

---

## What It Does

The `/document-release` skill performs a comprehensive documentation audit across the entire project, cross-referencing every `.md` file against the shipped diff.

### Step 1 — Pre-flight & Diff Analysis
Checks the current branch (aborts if on the base branch). Gathers the diff stat, commit log, and changed file list. Discovers all documentation files in the repo. Classifies changes into categories: new features, changed behavior, removed functionality, and infrastructure.

### Step 2 — Per-File Documentation Audit
Reads each documentation file and cross-references it against the diff using generic heuristics:

- **README.md** — Features, install/setup instructions, examples, troubleshooting
- **ARCHITECTURE.md** — ASCII diagrams, component descriptions, design decisions (conservative updates only)
- **CONTRIBUTING.md** — New contributor smoke test: walks through setup instructions as if brand new, flags anything that would fail
- **CLAUDE.md / project instructions** — Project structure, commands, build/test instructions
- **Any other .md files** — Reads, determines purpose, cross-references against the diff

Each needed update is classified as:
- **Auto-update** — Factual corrections clearly warranted by the diff (adding items to tables, updating paths, fixing counts)
- **Ask user** — Narrative changes, section removal, security model changes, large rewrites (>10 lines)

### Step 3 — Apply Auto-Updates
Makes all clear, factual updates directly. Each modification gets a one-line summary describing what specifically changed — not just "Updated README.md" but "README.md: added /new-skill to skills table, updated skill count from 9 to 10."

**Never auto-updates:** README introduction/positioning, ARCHITECTURE philosophy/rationale, security model descriptions, and never removes entire sections.

### Step 4 — Ask About Risky Changes
Presents risky or questionable updates via GitHub follow-up comments with context, a recommendation, and options including "Skip — leave as-is."

### Step 5 — CHANGELOG Voice Polish
Polishes the voice of existing CHANGELOG entries without ever rewriting, replacing, or regenerating content. This step exists because a real incident occurred where an agent replaced existing CHANGELOG entries.

**Rules:**
1. Read the entire CHANGELOG.md first
2. Only modify wording within existing entries — never delete, reorder, or replace
3. Never regenerate a CHANGELOG entry from scratch
4. Use the Edit tool with exact `old_string` matches — never use Write on CHANGELOG.md
5. Apply the "sell test": would a user reading each bullet think "oh nice, I want to try that"?
6. Lead with what the user can now **do** — not implementation details

### Step 6 — Cross-Doc Consistency & Discoverability
Performs a cross-document consistency pass:
- Does README match CLAUDE.md?
- Does ARCHITECTURE match CONTRIBUTING?
- Does CHANGELOG version match VERSION file?
- **Discoverability:** Is every doc file reachable from README or CLAUDE.md? Flags orphaned docs.

### Step 7 — TODOS.md Cleanup
Second pass complementing `/ship`'s TODOS handling:
- Marks completed items based on the diff
- Flags items needing description updates
- Checks for new `TODO`, `FIXME`, `HACK`, and `XXX` comments in the diff

### Step 8 — VERSION Bump Question
**Never bumps VERSION without asking.** If VERSION wasn't bumped, asks with a recommendation to skip (docs-only changes rarely warrant a bump). If VERSION was already bumped, checks whether it covers the full scope of changes — substantial new features shouldn't be silently absorbed into an existing version.

### Step 9 — Commit & Output
Stages modified documentation files by name (never `git add -A`). Creates a single commit, pushes, and updates the PR body with a `## Documentation` section containing a doc diff preview. Outputs a structured documentation health summary.

---

## Example Output

```
Documentation health:
  README.md       Updated (added /canary to skills table, updated skill count 16 → 17)
  ARCHITECTURE.md Current — no changes needed
  CONTRIBUTING.md Updated (fixed test command: npm test → npm run test)
  CHANGELOG.md    Voice polished (3 entries reworded for user-forward voice)
  TODOS.md        Updated (2 items marked complete for v1.0.4)
  VERSION         Already bumped — v1.0.4 covers all changes
  CLAUDE.md       Updated (added canary to project structure listing)
```

---

## Configuration

In [`config.json`](../config.json):

```json
{
  "document-release": {
    "enabled": true,
    "trigger": "release"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Set to `false` to disable the skill |
| `trigger` | `string` | GitHub event type — `release` fires when a new release is published |

---

## Requirements

| Requirement | Details |
|---|---|
| Browser | ❌ Not needed |
| Model | Default model from config (`gpt-5.4`) recommended |
| Permissions | `admin`, `maintain`, or `write` on the repository |
| Tools | Bash, Read, Write, Edit, Grep, Glob |

---

## Results

Documentation health outcomes are persisted to:

```
.github-gstack-intelligence/state/results/releases/{tag}.json
```

The PR body is also updated with a `## Documentation` section containing a doc diff preview for each file modified.

---

## Important Rules

- **Read before editing.** Always reads the full content of a file before modifying it.
- **Never clobber CHANGELOG.** Polish wording only — never delete, replace, or regenerate entries.
- **Never bump VERSION silently.** Always asks, even if already bumped.
- **Be explicit about what changed.** Every edit gets a one-line summary.
- **Generic heuristics, not project-specific.** The audit checks work on any repo.
- **Discoverability matters.** Every doc file should be reachable from README or CLAUDE.md.
- **Voice: friendly, user-forward, not obscure.** Write like you're explaining to a smart person who hasn't seen the code.

---

## Related Files

| File | Purpose |
|---|---|
| [`skills/document-release.md`](../skills/document-release.md) | Skill prompt definition |
| [`skills/references/review-todos-format.md`](../skills/references/review-todos-format.md) | Canonical TODOS.md format reference |
| [`config.json`](../config.json) | Skill enablement and trigger configuration |
| [`lifecycle/router.ts`](../lifecycle/router.ts) | Event routing — maps `release` events to `/document-release` |

---

## See Also

- [`/ship`](ship.md) — Automated shipping workflow (auto-invokes `/document-release` after PR creation)
- [`/retro`](retro.md) — Weekly retrospective that tracks documentation health trends
- [`/review`](review.md) — Code review with documentation staleness checks

---

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence">
  </picture>
</p>

[← Back to Command Reference](README.md)
