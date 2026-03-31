# Plan: github-gstack-intelligence

### Resource Extraction and Reimplementation — Making gstack run on GitHub as Infrastructure

---

## What This Plan Describes

This plan details how to take [gstack](https://github.com/garrytan/gstack) — a collection of AI engineering workflow skills designed for local execution in Claude Code — and **reimplement it as a GitHub-native system** in the repository [japer-technology/github-gstack-intelligence](https://github.com/japer-technology/github-gstack-intelligence), powered by [pi-mono](https://github.com/japer-technology/github-pi-mono)'s `pi-coding-agent` as its minimum intelligence runtime.

The approach is **resource extraction and reimplementation**: identify the transferable value in gstack (skill definitions, quality standards, workflow structures), extract those resources, discard the local-only infrastructure (browse daemon, Claude Code integration, interactive prompts), and rebuild the execution layer using GitHub's four primitives.

**Key design constraints:**
1. **Single super yml workflow** — one workflow file handles all events, following the proven [github-minimum-intelligence](https://github.com/japer-technology/github-minimum-intelligence) pattern
2. **Installed folder** — `.github-gstack-intelligence/` (self-contained dot-prefixed folder)
3. **Resource extraction cadence** — resources are extracted from the gstack repo at refresh time, not at execution time, optimising runtime performance

---

## The Four Primitives

| GitHub Primitive | Role in Githubified gstack |
|---|---|
| **GitHub Actions** | Compute — runners execute pi-coding-agent with gstack skills |
| **Git** | Storage and memory — session transcripts, benchmark baselines, retro history committed to repo |
| **GitHub Issues** | User interface — each issue is a conversation thread; PR comments for review findings |
| **GitHub Secrets** | Credential store — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc. |

---

## Strategy

**Transformation + Native Hybrid.** gstack's interaction model must change from interactive/local to event-driven/remote (Transformation), while the GitHub Actions orchestration layer is built from scratch using the GMI single-workflow lifecycle pattern (Native).

**Resource-first cadence:** All gstack resources (skill prompts, checklists, ethos documents) are extracted and committed to `.github-gstack-intelligence/` during a `run-refresh-gstack` operation — not fetched at runtime. This means every skill execution reads from local, pre-extracted files with zero external fetches.

---

## The Core Insight

gstack's value is in its **skill definitions** — the prompt engineering, workflow structures, quality checklists, and engineering standards. These are Markdown files. They transfer. What doesn't transfer is the local execution model: the browse daemon, Claude Code's slash-command system, `AskUserQuestion` for interactive input, local filesystem paths. The reimplementation replaces the execution layer while preserving the skill content.

---

## Plan Documents

| # | Document | What It Covers |
|---|----------|----------------|
| 01 | [Resource Extraction](01-resource-extraction.md) | What to extract from gstack, what to leave behind, and the `run-refresh-gstack` mechanism |
| 02 | [Pi-Mono Integration](02-pi-mono-integration.md) | How pi-coding-agent provides the minimum intelligence runtime |
| 03 | [Skill Adaptation](03-skill-adaptation.md) | How each of the twenty-five skills maps to GitHub Actions triggers and events |
| 04 | [Architecture](04-architecture.md) | Folder structure, lifecycle scripts, skill router, and configuration — single workflow design |
| 05 | [Workflows](05-workflows.md) | Single super yml workflow definition with yml functions for each skill capability |
| 06 | [State Management](06-state-management.md) | Git-as-memory patterns for sessions, benchmarks, retros, and QA reports |
| 07 | [Cost and Controls](07-cost-and-controls.md) | Cadence optimisation for resource extraction, access control, model tiering, and cost management |
| 08 | [Implementation Phases](08-implementation-phases.md) | Five-phase rollout from proof-of-concept to marketplace distribution, plus additional ideas |

---

## What Already Exists

This plan builds on analysis and resources already in this repository:

| Resource | Location | Purpose |
|----------|----------|---------|
| gstack analysis | `analysis/githubification-gstack.md` | Detailed feasibility analysis and skill-tier mapping |
| Pi-mono analysis | `analysis/githubification-pi-mono.md` | Runtime integration analysis |
| Extracted gstack resources | `repo/gstack/` | Skill templates, checklists, ethos, architecture docs |
| GMI reference implementation | `.github-minimum-intelligence/` | Proven single-workflow lifecycle pattern (indicator.ts, agent.ts, state/) |
| Consolidated lessons | `.githubification/lesson-consolidation.md` | Patterns from six Githubified repositories |
| Gleaned patterns | `analysis/gleamed/` | Cadence reduction, concurrency, GitHub Pages, cross-repo |

---

## The Result

A Githubified gstack gives any GitHub repository access to a **full AI engineering team as a GitHub Action** — seventeen specialist skills covering PR review, security audit, QA testing with a real browser, architecture review, weekly retrospectives, and release documentation. All triggered by the natural events of software development through a single workflow file. No installation. No CLI. No Claude Code subscription. Just GitHub.

---

*Plan for [japer-technology/github-gstack-intelligence](https://github.com/japer-technology/github-gstack-intelligence), informed by [GitHub Minimum Intelligence](https://github.com/japer-technology/github-minimum-intelligence) v1.0.8, [pi-mono](https://github.com/japer-technology/github-pi-mono), and [Githubification](https://github.com/japer-technology/githubification) methodology.*
