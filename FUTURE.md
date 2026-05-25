# FUTURE — A Deep Analysis of What GMI Can Become

_A strategic reflection on GitHub GStack Intelligence (GMI) in light of [GitHub Agentic Workflows (gh-aw)](https://github.github.com/gh-aw)._

---

## 0. Executive Summary

GitHub GStack Intelligence (GMI) and GitHub Agentic Workflows (gh-aw) were born from the same instinct: **the GitHub repository, not the chat window, is the right substrate for AI software automation.** They arrived at that conclusion from opposite ends of the stack.

- **GMI** started from a *skill library* (Garry Tan's `gstack` — 26 specialist roles) and built the minimum GitHub-native runtime needed to run them: a single workflow file, a TypeScript router, sessions in Git, comments as UI. It is **opinionated, batteries-included, and product-shaped**.
- **gh-aw** started from a *platform* concern (how should _any_ agent run safely inside GitHub Actions?) and built a compiler from natural-language Markdown into hardened YAML, with a strict safe-outputs contract, sandboxing, SHA-pinning, eight layers of guardrails, and engine pluralism (Copilot, Claude, Codex, Gemini). It is **unopinionated, security-first, and platform-shaped**.

The strategic implication is clear: **GMI's long-term moat is not the runtime — gh-aw will eventually win the runtime layer because it is built by GitHub itself and engineered for defense-in-depth that a single workflow file cannot match.** GMI's moat is, and should remain, **the skills, the methodology, the personality, and the developer experience around a curated team-of-specialists**. The path forward is therefore not to compete with gh-aw, but to **become the canonical skill suite that runs _on_ it** — while preserving the things gh-aw deliberately does not provide: persistent per-issue memory, a coherent specialist team, and a single-file, zero-think installation.

This document explores that thesis in depth.

---

## 1. Where GMI and gh-aw Agree

Both projects independently validated a set of design decisions that, two years ago, were contrarian:

| Conviction | GMI expression | gh-aw expression |
|---|---|---|
| The repo is the runtime | Self-installs into `.github-gstack-intelligence/`, commits everything back | Workflows live in `.github/workflows/*.md`, compile to `.lock.yml` checked into the repo |
| GitHub Actions is the only compute layer needed | One workflow file, ephemeral runners, no servers | Same — compiled output is plain Actions YAML |
| Git is the memory | Sessions stored as `.jsonl` under `state/sessions/`, issue→session mapping in `state/issues/N.json` | Workflow definitions and lock files are versioned; agent context is constructed from repo state per-run |
| The user already has a great chat UI: Issues | Each issue is a persistent conversation | Issues, PR comments, and labels trigger workflows; safe-outputs post back |
| AI work must be auditable | Every prompt and reply committed | Every workflow run logs the agent transcript; safe-outputs are inspectable |
| Bring-your-own LLM | OpenAI, Anthropic, Gemini, xAI, DeepSeek, Mistral, Groq, OpenRouter | Copilot, Claude, Codex, Gemini, custom engines |
| Access must be gated | `admin`/`maintain`/`write` only, bot-loop prevention, `/` prefix gating | Team gating, human-approval gates, read-only by default |

**The fact that GitHub itself shipped gh-aw vindicates the Githubification thesis that motivated GMI.** GMI is no longer a contrarian bet; it is on the right side of an emerging platform pattern.

---

## 2. Where gh-aw Goes Further Than GMI Today

gh-aw is, frankly, more rigorous than GMI on the runtime axis. Honest comparison:

### 2.1 Security architecture

gh-aw enforces a **structural separation between the agent process and any write capability**. The agent runs with a read-only token in a sandboxed container, network-isolated, with no secrets visible to it. Writes only happen through a separate `safe-outputs` job that consumes a *sanitized declarative manifest* the agent produced. Even a fully prompt-injected agent cannot, by construction, post arbitrary content, open arbitrary PRs, or exfiltrate secrets.

GMI today runs the LLM and the GitHub-mutating code **in the same job, with the same token, behind the same prompt boundary**. Authorization gating, bot-loop prevention, and prefix gating are good first-order defenses, but they are *policy* defenses, not *structural* ones. A determined prompt injection in an issue comment could, in principle, cause the agent to do anything its `GITHUB_TOKEN` permits.

### 2.2 Supply chain hardening

gh-aw SHA-pins every Action it depends on, validates the compiled YAML at compile time, allow-lists tools, and treats the compiler itself as part of the trust boundary. GMI installs a TypeScript router, a Bun lockfile, and `pi-mono`, and trusts version tags.

### 2.3 Engine pluralism vs. provider pluralism

GMI supports many *LLM providers* but a single *engine* (its own `agent.ts` driving `pi-mono`). gh-aw supports many engines — Copilot, Claude Code, Codex, Gemini — each with its own tool ecosystem, MCP support, and billing model. A user who already has GitHub Copilot Business pays nothing extra for agent-time on gh-aw with the Copilot engine; with GMI, every run is metered against their OpenAI key.

### 2.4 Compilation and validation

gh-aw is a *compiler*. It transforms human Markdown into a hardened, statically validated workflow. Mistakes are caught at compile time. GMI's skills are interpreted dynamically by the router at run time; misconfiguration surfaces as a failing run, not a failing build.

### 2.5 The GitHub blessing

gh-aw is published by `githubnext` and lives at `github.github.com/gh-aw`. It will inherit GitHub's distribution, marketplace integration, billing integration, security review, and brand trust. GMI is a third-party project. This is a permanent asymmetry.

**The honest reading:** if a CTO is evaluating "how do we run AI agents safely inside our repos in 2027," gh-aw is the lower-risk answer for the runtime question. GMI cannot out-engineer GitHub on platform plumbing, and should not try.

---

## 3. Where GMI Goes Further Than gh-aw Today

gh-aw is a platform. Platforms are powerful and empty. GMI is a *product on a platform*, and that gives it several real advantages that gh-aw will not naturally close:

### 3.1 A curated, coherent team of specialists

gh-aw ships *examples* and Peli's "Agent Factory." GMI ships **twenty-six specialists with point-of-view**: a CSO that thinks in OWASP Top 10 and STRIDE; a `retro` that mines git history every Friday at 17:00; an `office-hours` that asks YC-style forcing questions; an `autoplan` that pipelines CEO + Design + Engineering review. This is not a library of templates — it is a worldview about how a great early-stage software team actually operates, ported from Garry Tan's `gstack` and adapted to GitHub.

A platform cannot manufacture a worldview. GitHub will ship infrastructure; it will not ship opinions about how a founder should run office hours.

### 3.2 Persistent per-issue conversational memory

GMI's `issue #N → state/issues/N.json → state/sessions/<id>.jsonl` mapping turns each issue into a **long-lived conversation that survives across weeks and runs**. The agent can be reminded, corrected, asked to recall, and continued. gh-aw workflows are largely *stateless reactions to events* — they do not, by default, give you "this is my long-running conversation with the QA agent about flake #482."

This is the difference between *workflow automation* and *a colleague who remembers*. The latter is what most engineering teams actually want.

### 3.3 A single-file zero-think installation

GMI's installation is genuinely one workflow file plus one secret. The first run self-bootstraps the entire framework into the repo. There is no CLI to install, no extension to add to your `gh` binary, no Marketplace consent flow. For a founder who wants AI on their repo before lunch, the activation energy gap matters.

gh-aw requires the `gh-aw` extension and a separate compile step (`gh aw compile` etc.). That is the correct tradeoff for a security-first platform — but it is friction GMI does not have.

### 3.4 Upstream skill refresh

GMI's `run-refresh-gstack` workflow re-extracts skills from `garrytan/gstack` and adapts them on demand, with `skills/source.json` tracking SHA and manifest. This is a real piece of product engineering: a self-updating, attribution-preserving, drift-detecting bridge between an upstream open-source skill library and the GitHub-native runtime. gh-aw has no equivalent because it has nothing canonical to update *from*.

### 3.5 Browser, design, and visual workflows

GMI's `qa`, `design-review`, `design-html`, `design-shotgun`, and `design-consultation` skills run Playwright/Chromium inside the runner and iterate on screenshots. The methodology is fully captured in the skill markdown. gh-aw provides the *capability* (you can run browsers inside an agent container) but not the *practice* (how a senior designer would actually run a 7-dimension visual audit).

---

## 4. The Strategic Inflection: Don't Fight the Platform; Run On It

The clearest path is the one most teams resist: **port GMI's skill suite to compile down to gh-aw workflows.** Treat gh-aw as a target architecture, the way a language frontend treats LLVM.

What this looks like in practice:

- Each skill becomes (or generates) a `.github/workflows/<skill>.md` agentic workflow.
- The skill's trigger declarations in `config.json` become the workflow's `on:` and `safe-outputs:` blocks.
- The skill's prompt body becomes the workflow's Markdown body, lightly templated with repo context.
- The GMI router becomes a *compiler* — a Bun script that takes the curated skill set and emits gh-aw Markdown, validated, SHA-pinned, and committed back to the repo.
- The session-memory layer (issue→session→jsonl) is preserved as an **add-on** the workflow reads at start and a safe-output writes back to at end — gh-aw's safe-outputs already supports committing files.

**The strategic prize:** GMI inherits gh-aw's eight layers of guardrails, sandboxing, SHA-pinning, compile-time validation, and engine pluralism — *for free* — while keeping its differentiated assets: the specialist methodology, the persistent memory, the one-click install, the upstream refresh, the Garry-Tan-as-a-team brand.

This reframes GMI's product positioning from "an AI runtime for GitHub repos" (a market it cannot win against GitHub) to **"the canonical opinionated specialist team for GitHub Agentic Workflows"** (a market gh-aw structurally cannot fill).

---

## 5. The Skill Library as the Real Moat

If gh-aw becomes the runtime, then the skills are everything. This shifts where engineering attention should go:

### 5.1 Treat skills as a product, not as text

- **Versioning.** Each skill should be semver'd. Breaking changes to a skill's interface (its inputs, its outputs, its labels) should bump a major. Today GMI's skills are refreshed wholesale from upstream; a richer model would track per-skill compatibility.
- **Tests.** Each skill should ship golden-output fixtures: given this PR diff, this issue body, this commit history, the skill should produce output that satisfies these structural assertions (sections present, scores in range, no PII leaked). gh-aw's compile-time validation gives a place to hang these.
- **Telemetry.** Aggregate (opt-in, anonymized) signal about which skills fire, which produce comments humans actually react to, which produce comments that get edited or deleted. The most-edited skill is the one most in need of prompt work. Today GMI has no feedback loop; this is the largest blind spot.
- **A skill marketplace shape.** Even without literally building a marketplace, the directory structure, manifest, and refresh pipeline should be designed as if third parties will contribute skills. The `gstack` upstream is one source; there is no reason it must be the only one.

### 5.2 Specialize the specialists

The current 26 skills are general-purpose. The next frontier is **vertical packs**: a "fintech compliance" pack (SOX/PCI/SOC2-aware review and audit), a "regulated medical" pack (HIPAA-aware), a "consumer mobile" pack (App Store / Play Store release notes, store-listing review). Each pack is a few new skills plus tuned prompts for existing ones. This is exactly the shape of work the gh-aw platform makes cheap: the runtime is shared, the differentiation is in the Markdown.

### 5.3 Make the team an actual team

Today each skill runs in isolation. A real team **hands work to each other**: `review` finds a security smell → automatically files an `investigate` task → which discovers a regression → which triggers `ship` to bump a patch version. GMI's autoplan is a first step. gh-aw's safe-outputs (which can fire workflows from workflows) is the substrate to make multi-agent coordination real, with the issue thread as the shared workspace and Git as the shared memory.

This is where "Garry Tan's AI engineering team" stops being a marketing line and becomes a literal product claim: the agents collaborate, on Git, in front of you.

---

## 6. Where Persistent Memory Becomes the Differentiator

gh-aw's stateless-by-default model is correct for a platform — state is hard, statelessness is auditable, and most workflows do not need memory. But the *valuable* agent behaviors — the ones a developer would actually pay for — are almost all stateful:

- "Remember that I rejected this refactor suggestion last week; don't make it again."
- "Track the flakiness of `test_user_login` over the last 30 runs and tell me when it crosses 5%."
- "You audited this file in PR #211; what changed and is it still safe?"
- "I've been working on the auth rewrite for six weeks. Summarize where we are."

GMI's `state/sessions/<id>.jsonl` Git-committed transcript is the seed of this. The future is to evolve it into a **typed, queryable repository-local memory** — not a vector database, not a SaaS backend, just structured JSONL plus a small library that the skills agree to read and write to. Examples:

- `state/memory/decisions.jsonl` — every "we decided X because Y," appended by skills, searchable by all.
- `state/memory/learnings.jsonl` — the `learn` skill already gestures at this; lift it to a first-class store the whole team reads.
- `state/memory/baselines/` — `benchmark` and `health` write here; `review` reads here to flag regressions.

Because it is in Git, it is forkable, diffable, auditable, and survives any LLM provider switch. **This is the artifact GMI produces that gh-aw alone cannot produce: an evolving repository-local body of project-specific institutional knowledge.** Over months, it becomes more valuable than the skills themselves.

---

## 7. Identity, Personality, and the AGENTS.md Gap

The current `.github-gstack-intelligence/AGENTS.md` reads, in full:

> _No identity yet. Open an issue with the `hatch` label to bootstrap one._

This is a deeply correct intuition that is only half-built. The platform pattern emerging across Claude, Codex, Copilot, and now gh-aw is to read an `AGENTS.md` (or `CLAUDE.md`, etc.) as the project's persistent system prompt — the place where "how this team builds software" lives.

The future move:

1. Make the `hatch` flow real and excellent. The first issue any developer files should produce an `AGENTS.md` that captures their stack, conventions, deployment model, communication style, and red lines, drawn out by a guided conversation.
2. Have every skill **read `AGENTS.md` and adjust**. A `review` for a Rails monolith differs from a `review` for a Rust crate; that should not require 26 skill forks, only one good context file.
3. Treat `AGENTS.md` as the **handshake with the broader agent ecosystem**. When the same repo is opened in Claude Code, Codex CLI, GitHub Copilot, or invoked via gh-aw, all of them should see the same project personality. GMI's `hatch` becomes "the thing that writes the file every other agent in the ecosystem will respect." That is a quiet but real form of platform leverage.

---

## 8. Five Concrete Bets for the Next 12 Months

In rough priority order, decoupled enough that any subset can be pursued:

1. **The gh-aw bridge.** Build a `--target=gh-aw` mode of the GMI installer that emits one `.github/workflows/<skill>.md` per enabled skill, with the GMI router responsible only for session/memory glue. Validate that every skill still produces equivalent output. This is the single highest-leverage piece of engineering on the roadmap; everything else is easier if it exists.
2. **First-class `AGENTS.md` with `hatch`.** Ship the bootstrap flow. Make every skill context-aware. Document the file as the cross-agent contract.
3. **Repository-local memory as a typed substrate.** Decisions, learnings, baselines as committed JSONL with a tiny shared reader. The `learn`, `benchmark`, `health`, and `retro` skills become its first consumers.
4. **Multi-skill orchestration.** Promote `autoplan` from a curiosity into a general pattern: skills handing off to skills, via labels and safe-outputs, with the conversation thread as the shared transcript.
5. **Vertical skill packs.** Pick one vertical (the obvious candidate is YC-startup-flavored, given the gstack lineage) and ship a pack that demonstrably outperforms the generic 26 on that vertical's actual repos.

---

## 9. The Risks Worth Naming

- **Platform absorption.** GitHub may, at any point, ship an "official" gstack-shaped specialist team on top of gh-aw. The defense is to be that team — to be already adopted, already trusted, already the default — before the absorption window opens. Speed and brand matter more than feature count.
- **The runtime monoculture trap.** If GMI ports onto gh-aw, it inherits gh-aw's bugs, its release cadence, and its design constraints (read-only by default, safe-outputs only). Some current GMI behaviors will not survive that transition unmodified. The bridge must be designed with eyes open about what is lost.
- **Prompt-injection liability.** The longer GMI runs its current single-job, single-token architecture in public-issue repos, the larger the surface for an embarrassing incident. This is the most acute reason to accelerate the gh-aw bridge or, in the interim, to adopt some of gh-aw's safe-outputs pattern natively.
- **LLM cost variance.** As skills grow richer and memory grows deeper, per-run token cost grows. Without telemetry, GMI cannot tell which skills justify their cost. Building observability into the runtime is unglamorous and necessary.
- **Skill drift from upstream.** As GMI invests in GitHub-specific behaviors (memory, orchestration, gh-aw compilation), the distance from `garrytan/gstack` grows. The refresh pipeline must evolve from "copy and adapt" to "merge intelligently" or the upstream relationship will fray.

---

## 10. The One-Sentence Future

> _gh-aw is the standard for how agents run safely on GitHub; GMI's future is to be the standard for **what those agents should be** — a curated, opinionated, memory-bearing team of specialists, distilled from Garry Tan's `gstack`, packaged for one-file installation, that compiles down to gh-aw under the hood and leaves behind in every repository it touches a growing, Git-versioned body of that project's own institutional knowledge._

That is a defensible, durable position. It is also a position that is *strengthened*, not threatened, by everything gh-aw is doing.
