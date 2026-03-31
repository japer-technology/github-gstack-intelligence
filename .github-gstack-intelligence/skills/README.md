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
| `review.md` | `review/SKILL.md.tmpl` | Adapted skill prompt |
| `cso.md` | `cso/SKILL.md.tmpl` | Adapted skill prompt |
| `references/review-checklist.md` | `review/checklist.md` | Imported reference |
| `references/review-design-checklist.md` | `review/design-checklist.md` | Imported reference |
| `references/cso-acknowledgements.md` | `cso/ACKNOWLEDGEMENTS.md` | Imported reference |
| `references/gstack-architecture.md` | `ARCHITECTURE.md` | Imported reference |
| `references/gstack-agents.md` | `AGENTS.md` | Imported reference |
| `source.json` | — | Extraction metadata (not generated) |

## Adding custom skills

Custom skills that are **not** imported from gstack can be added to this directory
or to `.github-gstack-intelligence/.pi/skills/`. Files without the generated-file
marker are never overwritten by the refresh process.
