# COMPLY.md — Compliance Assurance Plan

> **Audience:** Maintainers of `japer-technology/github-gstack-intelligence` (GSSI), GitHub Trust & Safety reviewers, and anyone vetting whether this repository is safe to install.
>
> **Scope:** This document explains *how* this repository assures, demonstrates, and continuously verifies compliance with the two normative bodies the user referenced:
>
> 1. **GitHub Agentic Workflows (`gh-aw`)** — the spec, schema, and security model published at <https://github.github.com/gh-aw> (source: [`github/gh-aw`](https://github.com/github/gh-aw)).
> 2. **GitHub Site Policy** — the binding policies published under <https://docs.github.com/en/site-policy/> (Terms of Service, Acceptable Use Policies, Community Guidelines, GitHub Privacy Statement, etc.).
>
> A long-form, prose-style policy mapping already exists in [`github-compliance.md`](github-compliance.md) and [`README.md`](README.md) Parts II–VI. **This file is the operational checklist that backs those documents** — what we claim, how we keep the claim true, and where the evidence lives.

---

## 0. Compliance posture in one paragraph

GSSI is an opt-in, repository-local, MIT-licensed GitHub Actions workflow that turns the *installing* repository into an event-driven AI engineering assistant. It runs entirely inside the installing repo's own Actions runners under that repo's own `GITHUB_TOKEN`, with least-privilege scopes, write-or-greater collaborator gating, slash-command prefix gating, bot-loop suppression, and a Git-committed audit trail. It operates no external infrastructure, performs no cross-repository activity, and does not implement any engagement-inflating behaviour (no star/follow/fork/mass-comment loops). It is therefore structurally aligned with both the `gh-aw` security model (Section 1 below) and GitHub's site-policy framework (Section 2 below). The remaining work — and how we keep it honest over time — is described in Sections 3–5.

---

## 1. Compliance with GitHub Agentic Workflows (`gh-aw`)

The `gh-aw` project defines a specification, a frontmatter schema, and an **eight-layer defense-in-depth security model** for agentic workflows. GSSI is not authored *as* a `gh-aw` Markdown workflow (it is a hand-written GitHub Actions YAML workflow that predates and parallels `gh-aw`), so strict schema conformance is not applicable. What *is* applicable is the spirit of the spec — the security model and the safe-execution principles — and GSSI maps cleanly onto every layer.

### 1.1 Eight-layer security model — mapping table

| # | `gh-aw` layer                | GSSI implementation | Evidence |
|---|------------------------------|---------------------|----------|
| 1 | **Read-only by default; opt-in safe writes** | Skills are read-mostly; write actions are constrained to (a) issue/PR comments, (b) reactions, (c) commits to `.github-gstack-intelligence/state/`, and (d) agent edits on feature branches. Cost-heavy / write-active skills (`retro`, `benchmark`, `canary`) ship `"enabled": false`. | [`.github-gstack-intelligence/config.json`](.github-gstack-intelligence/config.json); workflow permissions block at [`.github/workflows/github-gstack-intelligence-agent.yml`](.github/workflows/github-gstack-intelligence-agent.yml) L148–154 |
| 2 | **Sandboxed execution** | Every run executes inside an ephemeral GitHub-hosted Actions runner (a fresh container per job). No state persists outside the repository's Git history. | The workflow itself — all jobs run on `ubuntu-latest` runners provisioned per invocation. |
| 3 | **SHA / version pinning of dependencies** | All third-party Actions used by the workflow are referenced by a stable major-version tag (e.g. `actions/checkout`, `actions/deploy-pages`). NPM dependencies are locked via [`bun.lock`](.github-gstack-intelligence/bun.lock). | [`.github/workflows/github-gstack-intelligence-agent.yml`](.github/workflows/github-gstack-intelligence-agent.yml); [`.github-gstack-intelligence/bun.lock`](.github-gstack-intelligence/bun.lock) |
| 4 | **Network isolation / restricted egress** | The only outbound network destinations are (a) the GitHub API (via `GITHUB_TOKEN`) and (b) the LLM provider endpoint whose API key the *user* supplied to *their own* repository secrets. No telemetry, analytics, or callbacks to japer-technology infrastructure. | LLM provider block near the bottom of the workflow file; the router's HTTP client surface in [`.github-gstack-intelligence/lifecycle/router.ts`](.github-gstack-intelligence/lifecycle/router.ts) |
| 5 | **Explicit, least-privilege permission grants** | `GITHUB_TOKEN` is scoped to exactly six permissions, each documented inline with the capability it enables. No personal access tokens, no GitHub Apps, no fine-grained tokens beyond what Actions natively issues. | [`.github/workflows/github-gstack-intelligence-agent.yml`](.github/workflows/github-gstack-intelligence-agent.yml) L148–154 |
| 6 | **Output sanitisation / safe outputs** | Agent writes are confined to a closed set of operations: post comment, add/remove reaction, commit transcript, push branch. There is no generic shell-out from agent output to repo writes; all writes go through the router's typed action surface. The router refuses to act on comments authored by bots or by accounts without `write`/`maintain`/`admin` permission. | [`.github-gstack-intelligence/lifecycle/router.ts`](.github-gstack-intelligence/lifecycle/router.ts); `allowedPermissions`, `botLoopPrevention`, `prefixGating` in [`.github-gstack-intelligence/config.json`](.github-gstack-intelligence/config.json) |
| 7 | **Audit, visibility, version control** | Every agent invocation appends a JSONL session transcript to `.github-gstack-intelligence/state/` and that transcript is committed to Git, alongside the standard GitHub Actions run log. Every agent comment is plainly attributed. | `.github-gstack-intelligence/state/` directory; transcript-writing logic in [`.github-gstack-intelligence/lifecycle/agent.ts`](.github-gstack-intelligence/lifecycle/agent.ts) |
| 8 | **Model context firewall / prompt-injection mitigations** | The router selects a skill based on the slash-command prefix and the GitHub event type — *not* by interpreting free-form user text as control flow. Skill prompts are loaded from in-repo Markdown files (vetted at PR time), not from untrusted comment bodies. Comments authored by bots and by non-write-permission users are dropped before reaching the LLM. | Prefix gating + permission gating in [`.github-gstack-intelligence/config.json`](.github-gstack-intelligence/config.json); routing logic in [`.github-gstack-intelligence/lifecycle/router.ts`](.github-gstack-intelligence/lifecycle/router.ts) |

### 1.2 Spec-style frontmatter equivalence

`gh-aw` workflows declare triggers, permissions, tools, safe outputs, and an engine in YAML frontmatter. GSSI declares the same things, in the equivalent locations of a classic Actions workflow plus a JSON config file:

| `gh-aw` frontmatter field | GSSI equivalent |
|---------------------------|-----------------|
| `on:` (triggers)          | `on:` block — eight event classes, documented inline ([`.github/workflows/github-gstack-intelligence-agent.yml`](.github/workflows/github-gstack-intelligence-agent.yml) L88–139) |
| `permissions:`            | `permissions:` block — six scoped grants ([same file](.github/workflows/github-gstack-intelligence-agent.yml) L148–154) |
| `tools:`                  | GitHub API via `GITHUB_TOKEN`; LLM provider via user-supplied key; Playwright (browser MCP) used only by `qa` and only on user-supplied URLs |
| `safe-outputs:`           | Closed set documented in §1.1 row 6 above |
| `engine:`                 | `pi-coding-agent` (Earendil's `pi-mono`); model & provider sourced from [`.github-gstack-intelligence/.pi/settings.json`](.github-gstack-intelligence/.pi/settings.json) |

### 1.3 Where we intentionally diverge from `gh-aw`

- **Not authored as `.md` + frontmatter.** GSSI predates / parallels `gh-aw`; rewriting in `gh-aw` Markdown form is a possible future direction (tracked in §5) but is not a precondition for being safe.
- **No `gh aw` CLI compile step.** The workflow is hand-written YAML, reviewable in PRs without an extra compilation tool.
- **Engine is not Copilot / Claude / Codex.** GSSI uses `@earendil-works/pi-coding-agent` as the runtime; the underlying LLM is whichever provider the user has supplied an API key for.

These divergences are *form*, not *substance*. The substantive controls `gh-aw` exists to enforce (least privilege, safe outputs, sandboxing, audit, prompt-injection resistance) are all present and named above.

---

## 2. Compliance with GitHub Site Policy (`docs.github.com/en/site-policy/**`)

Site Policy is a family of documents. The relevant ones, and the corresponding controls in this repository, are:

### 2.1 GitHub Terms of Service

| ToS section | What it requires | How GSSI complies |
|-------------|------------------|-------------------|
| Account responsibility | The account owner is responsible for actions taken under their account | The workflow runs under the *installing* user's `GITHUB_TOKEN`; the workflow header, [`README.md`](README.md), and [`github-compliance.md`](github-compliance.md) all make this attribution explicit. |
| Acceptable use of the Service | No prohibited activity (see §2.2) | See §2.2. |
| User-generated content | Users own and are responsible for the content they post | Every agent comment is attributed to the installing account and labeled as agent output; [`README.md`](README.md) tells maintainers they are the author of record. |
| API Terms | Use the API in conformance with rate limits and intended use | Only standard `GITHUB_TOKEN` API calls (issue/PR read & comment, commits, reactions). No bulk scraping, no harvesting, no avoidance of rate limits. |
| AI-generated content disclosures | Be transparent about AI involvement and the data sent to third parties | The workflow header ("DATA DISCLOSURE", "COST DISCLOSURE") and [`README.md`](README.md) explicitly warn that repo contents are transmitted to the user's chosen LLM provider, and that users must read that provider's data-handling terms before installing on proprietary code. |

### 2.2 Acceptable Use Policies (AUP)

| AUP topic                              | Control in GSSI |
|----------------------------------------|-----------------|
| **Intellectual property**              | MIT-licensed adaptation of MIT-licensed [`garrytan/gstack`](https://github.com/garrytan/gstack); LICENSE preserved at [`.github-gstack-intelligence/LICENSE.md`](.github-gstack-intelligence/LICENSE.md). [`README.md`](README.md) and [`.github-gstack-intelligence/CONTRIBUTING.md`](.github-gstack-intelligence/CONTRIBUTING.md) warn extenders not to embed proprietary third-party content in public skill files. |
| **Inauthentic activity / engagement manipulation** | **Repository contains no code that stars, follows, forks, mass-comments, or otherwise inflates engagement signals.** Verifiable by searching the source. [`README.md`](README.md) explicitly forbids configuring the agent to do so. |
| **Site access and safety / probing third-party services** | The `qa` skill uses Playwright on URLs supplied by the developer. [`README.md`](README.md) restricts this to the developer's own preview/staging environments and forbids probing third-party services without authorisation. |
| **Services usage limits**              | Cost-heavy skills ship disabled by default; the workflow header includes a "COST DISCLOSURE" section directing users to monitor Actions usage and set spending caps. |
| **Privacy / personal data**            | [`README.md`](README.md) flags that the `retro` skill processes contributor names/commit messages and may trigger employment-data disclosure obligations in some jurisdictions; the skill is disabled by default. |
| **Information about others**           | The agent does not collect, aggregate, or republish information about people outside the contributor list of the installing repository. |
| **Security research / offensive tooling** | The `cso` (Chief Security Officer) skill is scoped to the installing user's own code. [`README.md`](README.md) explicitly forbids using it to generate offensive tooling or audit systems without authorisation, and the skill is `labelGated: true` so a maintainer must opt in. |

### 2.3 GitHub Community Guidelines

| Guideline | Control |
|-----------|---------|
| Transparent automation | Every agent comment is plainly attributed to the agent and the originating skill; every session is committed to Git as an auditable transcript. [`README.md`](README.md) and [`github-compliance.md`](github-compliance.md) forbid configuring the agent to impersonate a human. |
| Respectful interaction | Skill prompts in [`.github-gstack-intelligence/skills/`](.github-gstack-intelligence/skills/) are written to produce constructive, specific feedback. [`.github-gstack-intelligence/CODE_OF_CONDUCT.md`](.github-gstack-intelligence/CODE_OF_CONDUCT.md) governs both human and automated participation. |
| Maintainer responsibility | [`README.md`](README.md) is explicit that the maintainer owns the agent's output and must edit or delete output that is inappropriate. |

### 2.4 GitHub Privacy Statement & data handling

- **No collection by this project.** GSSI operates no servers, databases, or analytics. The maintainers of this template repository receive *zero* data from installations.
- **In-scope data flows are documented.** The workflow header's "DATA DISCLOSURE" block and [`README.md`](README.md) enumerate every place data flows: GitHub → Actions runner → LLM provider → back to the installing repo. No fourth party.
- **User-controlled secrets.** The LLM API key lives in the installing user's own repository secrets, never in this template.

### 2.5 Coordinated disclosure / vulnerability reporting

- [`/.github-gstack-intelligence/SECURITY.md`](.github-gstack-intelligence/SECURITY.md) routes vulnerability reports through GitHub Security Advisories (private vulnerability reporting), per GitHub's recommended practice.

---

## 3. Per-asset compliance checklist (what to verify on every change)

Reviewers and maintainers should run this checklist on any PR that touches the workflow, the router, the config, or the skill prompts. **All items must remain ✅ to merge.**

### 3.1 Workflow (`.github/workflows/github-gstack-intelligence-agent.yml`)

- [ ] `permissions:` block remains a documented, minimal set; new permissions are justified inline.
- [ ] No new outbound network destinations beyond `api.github.com` and the configured LLM provider.
- [ ] All third-party Actions are referenced by a stable major-version tag (or, preferably, a SHA).
- [ ] Cost-heavy triggers (`schedule`, `deployment_status`) remain gated by `enabled: false` skills or label gates.
- [ ] The "DATA DISCLOSURE" / "COST DISCLOSURE" header blocks remain accurate.

### 3.2 Config (`.github-gstack-intelligence/config.json`)

- [ ] `allowedPermissions` continues to require `write`, `maintain`, or `admin`.
- [ ] `botLoopPrevention` remains `true`.
- [ ] `prefixGating` remains `true` and `prefixes` remains `["/"]`.
- [ ] Newly-added skills default to `enabled: false` if they (a) run on a schedule, (b) call external networks, or (c) perform writes other than comments/reactions/state-commits.
- [ ] Security-sensitive skills (e.g. `cso`, `design-review`) remain `labelGated: true`.

### 3.3 Router / lifecycle (`.github-gstack-intelligence/lifecycle/`)

- [ ] No new write action types are added without (a) corresponding `permissions:` justification and (b) an entry in §1.1 row 6.
- [ ] Untrusted text (issue/comment bodies, PR diffs) is never used as a routing key; it is only ever passed as an LLM *input*.
- [ ] Session transcripts continue to be written to `.github-gstack-intelligence/state/` and committed.

### 3.4 Skills (`.github-gstack-intelligence/skills/*.md`)

- [ ] No skill instructs the agent to perform engagement-inflating actions (star/follow/fork/mass-comment).
- [ ] No skill instructs the agent to probe systems outside the installing repository without explicit user authorisation.
- [ ] No skill embeds proprietary third-party content.
- [ ] Skills produce respectful, constructive output (Community Guidelines).

### 3.5 Documentation

- [ ] [`README.md`](README.md), [`github-compliance.md`](github-compliance.md), and this file (`COMPLY.md`) remain consistent with the actual workflow, config, and skill set.
- [ ] [`.github-gstack-intelligence/CODE_OF_CONDUCT.md`](.github-gstack-intelligence/CODE_OF_CONDUCT.md) and [`.github-gstack-intelligence/SECURITY.md`](.github-gstack-intelligence/SECURITY.md) remain in place.

---

## 4. Known limitations and open gaps

These are honestly disclosed rather than concealed:

1. **No per-skill model tiering or rate-limiting** (workflow header, "LIMITATIONS"). A pathological event burst could cause significant LLM spend before the user notices. Mitigation today: cost disclosure in the header; `enabled: false` defaults on the most expensive skills. Planned remediation: introduce config-level rate limits and per-skill model selection.
2. **`state/memory.log` is append-only** with no automatic pruning. Long-running installs accumulate history indefinitely. Mitigation today: documented in the workflow header. Planned remediation: rotation/compaction.
3. **Not yet authored as a `gh-aw` Markdown workflow.** A future migration to `gh-aw` form would let the `gh aw` CLI mechanically verify the frontmatter schema and would tighten the safe-outputs surface. Tracked as a non-blocking improvement.
4. **Site-policy and `gh-aw` are living documents.** Both can change without notice. The maintainers will review this file when either source materially changes; see §5.

---

## 5. How we keep this file honest over time

1. **Quarterly review.** A maintainer re-reads <https://github.github.com/gh-aw> and the index of <https://docs.github.com/en/site-policy/> at least once per calendar quarter and updates this file to reflect any material changes.
2. **PR-time enforcement.** Every PR that touches the workflow, the router, the config, or the skills must walk the checklist in §3 in the PR description, and the reviewer must confirm.
3. **Release-time review.** Before tagging a new GSSI version (per [`.github-gstack-intelligence/VERSION`](.github-gstack-intelligence/VERSION)), the maintainer confirms that §1.1, §2.1–2.4, and §4 still match reality.
4. **Issue-driven updates.** If a Trust & Safety reviewer or any user files an issue alleging a compliance gap, the maintainers will (a) acknowledge within the SLA in [`SECURITY.md`](.github-gstack-intelligence/SECURITY.md), (b) update this file to reflect the corrected state, and (c) link the issue from the relevant row above.

---

## 6. Quick-look index for reviewers

| You want to verify…                              | Open this file |
|--------------------------------------------------|----------------|
| What the agent is allowed to do                  | [`.github/workflows/github-gstack-intelligence-agent.yml`](.github/workflows/github-gstack-intelligence-agent.yml) L148–154 (permissions) and [`.github-gstack-intelligence/config.json`](.github-gstack-intelligence/config.json) (skill gating) |
| What each skill instructs the LLM to do          | [`.github-gstack-intelligence/skills/`](.github-gstack-intelligence/skills/) (one Markdown file per skill) |
| What runs at runtime                             | [`.github-gstack-intelligence/lifecycle/agent.ts`](.github-gstack-intelligence/lifecycle/agent.ts), [`.github-gstack-intelligence/lifecycle/router.ts`](.github-gstack-intelligence/lifecycle/router.ts) |
| Where transcripts go                             | `.github-gstack-intelligence/state/` (committed to Git in the installing repo) |
| Long-form policy mapping (prose)                 | [`github-compliance.md`](github-compliance.md); [`README.md`](README.md) Parts II–VI |
| Code of Conduct                                  | [`.github-gstack-intelligence/CODE_OF_CONDUCT.md`](.github-gstack-intelligence/CODE_OF_CONDUCT.md) |
| Vulnerability reporting                          | [`.github-gstack-intelligence/SECURITY.md`](.github-gstack-intelligence/SECURITY.md) |
| Operational checklist (per change / per release) | §3 and §5 of this file |

---

*This document is informational, not a legal representation. The binding terms of any installation are governed by GitHub's Terms of Service, Acceptable Use Policies, Community Guidelines, the Privacy Statement, the MIT License this project is distributed under, and the installing user's own agreement with their chosen LLM provider.*
