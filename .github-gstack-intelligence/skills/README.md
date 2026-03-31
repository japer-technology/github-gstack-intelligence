# Skills — Imported from gstack

> [!CAUTION]
> **Do not touch** files marked with `<!-- GSTACK-INTELLIGENCE: GENERATED FILE -->`.
> Editing them forfeits clean upgrades. Run `run-refresh-gstack` to reimport.

## What is this directory?

This directory contains skill prompts and reference documents imported from the
[gstack](https://github.com/garrytan/gstack) project during the `run-refresh-gstack`
workflow function. These files are **generated** — they are fetched from upstream
gstack, adapted for GitHub-native execution, and committed here at refresh time.

## How reimporting works

Running the `run-refresh-gstack` workflow function:

1. Fetches the latest skill templates and reference documents from the gstack repository.
2. Applies CI adaptations (replaces local paths, interactive prompts, etc.).
3. Writes the adapted files into this directory with generated-file markers.
4. Removes any previously generated files that are no longer produced.
5. Updates `source.json` with the extraction timestamp, source repo, ref, and commit.

If gstack changes upstream, re-running `run-refresh-gstack` picks up those changes
cleanly. This is safe to repeat at any time.

## File inventory

| File | Source | Type |
|------|--------|------|
| **Adapted skill prompts** | | |
| `review.md` | `review/SKILL.md.tmpl` | Adapted skill prompt |
| `cso.md` | `cso/SKILL.md.tmpl` | Adapted skill prompt |
| `ship.md` | `ship/SKILL.md.tmpl` | Adapted skill prompt |
| `benchmark.md` | `benchmark/SKILL.md.tmpl` | Adapted skill prompt |
| `retro.md` | `retro/SKILL.md.tmpl` | Adapted skill prompt |
| `document-release.md` | `document-release/SKILL.md.tmpl` | Adapted skill prompt |
| `qa.md` | `qa/SKILL.md.tmpl` | Adapted skill prompt |
| `qa-only.md` | `qa-only/SKILL.md.tmpl` | Adapted skill prompt |
| `design-review.md` | `design-review/SKILL.md.tmpl` | Adapted skill prompt |
| `plan-design-review.md` | `plan-design-review/SKILL.md.tmpl` | Adapted skill prompt |
| `investigate.md` | `investigate/SKILL.md.tmpl` | Adapted skill prompt |
| `canary.md` | `canary/SKILL.md.tmpl` | Adapted skill prompt |
| `office-hours.md` | `office-hours/SKILL.md.tmpl` | Adapted skill prompt |
| `plan-ceo-review.md` | `plan-ceo-review/SKILL.md.tmpl` | Adapted skill prompt |
| `plan-eng-review.md` | `plan-eng-review/SKILL.md.tmpl` | Adapted skill prompt |
| `design-consultation.md` | `design-consultation/SKILL.md.tmpl` | Adapted skill prompt |
| `autoplan.md` | `autoplan/SKILL.md.tmpl` | Adapted skill prompt |
| **Imported references** | | |
| `references/gstack-root-skill.md` | `SKILL.md.tmpl` | Adapted root skill template |
| `references/gstack-architecture.md` | `ARCHITECTURE.md` | Imported reference |
| `references/gstack-agents.md` | `AGENTS.md` | Imported reference |
| `references/review-checklist.md` | `review/checklist.md` | Imported reference |
| `references/review-design-checklist.md` | `review/design-checklist.md` | Imported reference |
| `references/review-todos-format.md` | `review/TODOS-format.md` | Imported reference |
| `references/review-greptile-triage.md` | `review/greptile-triage.md` | Imported reference |
| `references/cso-acknowledgements.md` | `cso/ACKNOWLEDGEMENTS.md` | Imported reference |
| `references/qa-issue-taxonomy.md` | `qa/references/issue-taxonomy.md` | Imported reference |
| `references/qa-report-template.md` | `qa/templates/qa-report-template.md` | Imported reference |
| **Metadata** | | |
| `source.json` | — | Extraction metadata (not generated) |

## Adding custom skills

Custom skills that are **not** imported from gstack can be added to this directory
or to `.github-gstack-intelligence/.pi/skills/`. Files without the generated-file
marker are never overwritten by the refresh process.
