# GBrain is Coming to GStack Intelligence

> **Your AI agent is smart but forgetful. GBrain gives it a brain.**
>
> — [garrytan/gbrain](https://github.com/garrytan/gbrain)

---

## What Is GBrain?

GBrain is the persistent memory and knowledge engine built by Garry Tan — President and CEO of Y Combinator — to power his own production AI agents. In its current deployment it holds **17,888 pages, 4,383 people, and 723 companies**, with 21 cron jobs running autonomously and a self-wiring knowledge graph that gets smarter overnight without supervision.

It is not a vector store. It is not a simple RAG pipeline. It is a hybrid-search, graph-augmented, entity-enriching brain that your agent reads before it does anything else.

Key numbers from the open benchmark:

| Metric | GBrain (hybrid + graph) | Vector-only RAG | ripgrep-BM25 |
|--------|------------------------|-----------------|--------------|
| P@5    | **49.1 %**             | ~17.7 %         | ~17.7 %      |
| R@5    | **97.9 %**             | —               | —            |

The graph layer accounts for most of the precision gap. GBrain's `code-callers` / `code-callees` / `code-def` / `code-refs` edges — Cathedral II, v0.21.0 — mean an agent walking a codebase by symbol graph, not by grep, is categorically different from the agent you have today.

---

## The Problem GBrain Solves in GStack Today

GitHub GStack Intelligence runs twenty-six specialist skills: review, security audit, QA, design consultation, retrospective, benchmark, and more. Every time a skill fires it reads the codebase cold. It has no memory of the last review. It cannot remember what the architecture decision was that came out of last month's `/office-hours`. It does not know which contributor wrote the most performance-sensitive path, or that an attendee at the last planning call has specific context about the auth system.

The skills are excellent. The agent is amnesiac.

GBrain ends that.

---

## The Vision: GStack with a Brain

When GBrain is wired into GStack Intelligence, every skill invocation begins with a brain-first lookup. The `brain-ops` pattern — check the brain before calling any external API — becomes the default. The agent arrives at your PR review already knowing:

- the architectural decisions made in previous `/plan-eng-review` sessions
- which symbols in the diff have the highest fan-in (callers) in the codebase
- the enriched profile of the PR author, their previous contributions, and any known context about their work
- the open threads from the last `/retro` that are relevant to this change
- the original thinking that came out of the last `/office-hours`

### New Skills Coming to GStack

| Skill | What it does in GStack |
|-------|----------------------|
| **`brain`** | Bootstrap and manage the repository brain. Indexes the codebase on first run; syncs changes on every push. The always-on foundation for every other brain skill. |
| **`brain-query`** | Natural-language query over the accumulated knowledge graph. "What architectural decisions govern the auth system?" returns answers from previous sessions, not a hallucination. |
| **`brain-ingest`** | Ingest any structured input into the brain: issue bodies, PR descriptions, design docs, ADRs, meeting transcripts, voice notes. Every artifact that passes through the repository becomes a brain page with typed cross-links. |
| **`brain-enrich`** | Tiered enrichment for contributors and companies. A first-time contributor gets a stub page (Tier 3). After multiple PRs they receive web and social enrichment (Tier 2). A core maintainer gets full context (Tier 1). The brain learns who matters. |
| **`brain-search`** | Drop-in replacement for grep + read across the skill chain. Hybrid search with graph-walk returns ranked, cited results. Used internally by every enhanced skill below. |

### Skills Enhanced by the Brain

| Existing Skill | What changes |
|----------------|-------------|
| **`/investigate`** | Brain-first code lookup replaces grep scan. `gbrain code-callers` and `code-callees` walk the call graph. `--near-symbol` two-pass retrieval surfaces related context the agent would otherwise miss. |
| **`/review`** | Arrives knowing the architectural context of every changed file. Flags changes that contradict previous decisions stored in the brain. Cites the session where the decision was made. |
| **`/plan-eng-review`** | Queries the brain for open engineering threads before writing the plan. Surfaces decisions from previous planning sessions. Never re-debates a settled question without knowing it was settled. |
| **`/office-hours`** | Captures original thinking from the session into the brain. Next `/office-hours` session starts where the last one ended, not from zero. |
| **`/retro`** | Reads the brain for unresolved threads from previous retros. Closes loops automatically. The overnight `maintain` cycle consolidates retro insights into durable patterns. |
| **`/autoplan`** | Enriches the plan with contributor context from the brain. Knows which team members have context on which subsystems. Surfaces cross-cutting concerns from previous plans. |
| **`/cso`** | Security audit enriched with the known vulnerability patterns from previous audits, stored as brain pages. Avoids re-flagging resolved issues. Cites the PR where each historical finding was addressed. |
| **`/health`** | Reads the brain for the health trajectory over time. "Auth system reliability has been flagged in 3 consecutive health checks" is now a first-class output. |

---

## How the Brain Wires Itself

Every time the agent writes a brain page — from a `/review`, a `/plan-eng-review`, or a `/brain-ingest` — GBrain extracts typed entity references automatically, with zero LLM calls:

```
attended · works_at · invested_in · founded · advises · calls · defined_in · references
```

A PR author mentioned in three different reviews gets linked to their contributor page. A subsystem mentioned in a `/cso` finding gets linked to the architectural decision that governs it. A symbol appearing in a call-graph walk gets linked to every other symbol that references it.

Ask "who has reviewed the payment subsystem?" and the graph answers. Ask "what decisions govern the auth system?" and the brain returns the exact sessions where those decisions were recorded.

---

## Minions: Durable Background Work for GStack

GBrain's `minion-orchestrator` skill brings durable, Postgres-native job queues to the agent. Long-running GStack operations — full-codebase security audits, benchmark suites, design-shotgun multi-page analyses — no longer need to fit inside a single GitHub Actions runner timeout.

The production numbers from GBrain's own deployment:

| | Minions | Sub-agents |
|--|---------|-----------|
| Wall time (spawn) | **753 ms** | >10,000 ms (gateway timeout) |
| Token cost | **$0.00** | ~$0.03 per run |
| Success rate | **100 %** | 0 % (couldn't spawn) |

Deterministic work — pull data, parse, write brain page, sync — runs as a Minion: $0 tokens, survives restart, millisecond runtime. Judgment work — triage, assess, decide — stays in the skill. The split makes the whole system faster and cheaper.

---

## The Brain Architecture

```
GitHub event fires (PR opened, issue created, comment, cron)
  → Signal detector captures ideas + entities from the event (parallel, never blocks)
  → Brain-ops: check the brain first (gbrain search, gbrain get)
  → Skill executes with full accumulated context
  → Write: update brain pages with new findings + citations
  → Auto-link: typed relationships extracted on every write (zero LLM calls)
  → Sync: gbrain indexes changes for next query
  → Overnight: maintain cycle consolidates, fixes citations, finds orphans
```

Every cycle adds knowledge. Every PR review makes the next one smarter. The difference compounds daily.

---

## Storage

GBrain ships with **PGLite** — a full Postgres-compatible database that initializes in **2 seconds** with zero external infrastructure. For repositories with large codebases or multi-machine deployments, Supabase Postgres with pgvector is the production path. The brain lives wherever your repository secrets point.

For GStack Intelligence, the brain is stored in the GitHub Actions runner as a cached PGLite database, persisted across runs via GitHub's cache API. No external server required. No new secrets beyond the brain's own configuration.

---

## BrainBench-Real: Measuring Whether the Brain Is Getting Smarter

GBrain includes an opt-in evaluation framework — BrainBench-Real — that captures every real `query` and `search` call (PII-scrubbed) and lets you replay them against code changes to measure retrieval quality:

```
GBRAIN_CONTRIBUTOR_MODE=1  # capture mode (opt-in)
gbrain eval export --since 7d > base.ndjson
gbrain eval replay --against base.ndjson
```

Three numbers come back: mean Jaccard@k between captured and current retrieved slugs, top-1 stability, and latency delta. GStack Intelligence will expose this as a `/benchmark brain` command — so you can measure, over time, whether the agent is getting smarter.

---

## What This Means for Your Repository

Today: GStack Intelligence arrives at every event fresh. It reads your code, applies its skills, and forgets everything when the runner exits.

With GBrain: the agent arrives knowing your codebase deeply — not from a fresh read, but from accumulated memory. It knows the architectural decisions. It knows the contributors. It knows the open threads. It knows the patterns that keep showing up in retros. It knows which symbols are the highest-risk call sites.

The agent stops being a consultant who reads the docs the morning of the meeting. It becomes a colleague who has been paying attention for months.

**GBrain is coming to GStack Intelligence.** Watch this space.

---

*Built on [garrytan/gbrain](https://github.com/garrytan/gbrain) · Powers [garrytan/gstack](https://github.com/garrytan/gstack) · Coming to [japer-technology/github-gstack-intelligence](https://github.com/japer-technology/github-gstack-intelligence)*
