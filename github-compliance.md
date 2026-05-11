# GitHub Compliance Brief

> **Audience:** A GitHub AI Agent, Trust & Safety reviewer, or GitHub employee reviewing this repository.
> 
> **Purpose:** A fast, accurate orientation to what this repository is, what its automation does, and how it aligns with GitHub's Terms of Service, Acceptable Use Policies, and Community Guidelines — so you can verify compliance quickly without reverse-engineering the codebase.
>
> This repository is an MIT-licensed, opt-in, repository-local AI engineering framework. All automation runs inside GitHub Actions under the repository owner's own `GITHUB_TOKEN`, gated to collaborators with write-or-greater permissions, with bot-loop prevention, command-prefix gating, and full audit trails committed to Git. It does not star, follow, fork, mass-comment, scrape, or act outside the repository it is installed in. The README contains a written self-audit against GitHub's policies (Parts II–VI).

---

## 1. What this repository is

- **Name:** `japer-technology/github-gstack-intelligence` ("GitHub GStack Intelligence", GSSI).
- **License:** MIT ([`/.github-gstack-intelligence/LICENSE.md`](.github-gstack-intelligence/LICENSE.md)).
- **What it does:** Installs a single GitHub Actions workflow that turns a repository into an event-driven AI engineering assistant. It is an adaptation of the MIT-licensed [`garrytan/gstack`](https://github.com/garrytan/gstack) skill suite into GitHub-native primitives (Actions, Issues, PRs, Secrets).
- **How users install it:** They copy [`/.github/workflows/github-gstack-intelligence-agent.yml`](.github/workflows/github-gstack-intelligence-agent.yml) into their own repo, set an LLM API key as a repository secret, and click "Run workflow." The workflow self-installs the rest of the framework into `.github-gstack-intelligence/` in *their* repo.
- **No external infrastructure:** There are no servers, databases, or backend services operated by this project. Each installation is fully self-contained inside the user's own repository and Actions runners. The only outbound traffic is to the LLM provider whose API key the user supplied.

## 2. How the automation works (operational model)

- The workflow triggers on normal GitHub events: `pull_request`, `issue_comment`, `issues`, `release`, `schedule`, `workflow_dispatch`, `deployment_status`.
- A TypeScript router (`/.github-gstack-intelligence/lifecycle/router.ts`) maps the event to one of 26 "skills" (Markdown prompt files in `/.github-gstack-intelligence/skills/`).
- The router calls the configured LLM provider (OpenAI, Anthropic, Google Gemini, Mistral, Groq, xAI, or OpenRouter — see the provider API-key block near the bottom of the workflow file) using the API key stored in the user's repository secrets.
- The response is posted back to the same repository as an issue/PR comment, commit, or branch. A transcript is committed to `/.github-gstack-intelligence/state/` for auditability.
- The agent **never** acts outside the repository it is installed in.

## 3. Workflow permissions (scoped, least-privilege)

From [`/.github/workflows/github-gstack-intelligence-agent.yml`](.github/workflows/github-gstack-intelligence-agent.yml) lines 148–154:

| Permission | Scope | Why it is needed |
|---|---|---|
| `contents: write` | Repo files | Commit session transcripts, commit installed framework files, push agent edits to feature branches. |
| `issues: write` | Issues | Post AI replies as issue comments; add/remove 🚀/👍/👎 reaction status indicators. |
| `pull-requests: write` | PRs | Post review/CSO/design-review findings; add reactions. |
| `actions: write` | Workflow | So the install commit can trigger subsequent runs (otherwise the bootstrap loop won't fire). |
| `pages: write` | Pages | Deploy the project's own GitHub Pages site (the `public-site/` directory). |
| `id-token: write` | OIDC | Required by `actions/deploy-pages` to authenticate the Pages deployment. |

These are the standard `GITHUB_TOKEN` permissions for a self-installing workflow. There is no use of personal access tokens, GitHub Apps, or fine-grained tokens beyond what GitHub Actions natively provides.

## 4. Access controls and abuse mitigations

All of these are enforced in [`/.github-gstack-intelligence/config.json`](.github-gstack-intelligence/config.json) and the workflow file:

- **Permission gate (`allowedPermissions`):** Only collaborators with `admin`, `maintain`, or `write` permission can trigger the agent. Drive-by commenters on public repos cannot cause LLM credit consumption.
- **Bot-loop prevention (`botLoopPrevention: true`):** The agent ignores comments authored by itself or other bots — no infinite reply chains.
- **Command-prefix gating (`prefixGating: true`, `prefixes: ["/"]`):** The agent only responds to comments beginning with a `/` command (e.g., `/review`, `/qa`, `/ship`). Casual conversation in issues does not trigger the agent.
- **Label gating on high-impact skills:** `cso` (security audit) and `design-review` ship with `labelGated: true`, so they only run when a maintainer applies a specific label. This prevents PR authors from forcing expensive runs.
- **Cost-heavy skills disabled by default:** `retro` (weekly cron), `benchmark` (daily cron), and `canary` (deployment status) ship as `"enabled": false`. Users must consciously turn them on.

## 5. Alignment with GitHub policies (summary)

The README's [Parts II–VI](README.md) contain a long-form written compliance analysis. The short version:

### GitHub Terms of Service
- **§B Account responsibility:** The agent's actions are attributable to the installing account; this is documented and surfaced to users.
- **§C Acceptable Use:** No prohibited activity. The security skill (`cso`) is scoped to the user's own code; the README explicitly forbids using it to generate offensive tooling or audit systems without authorization.
- **§D User-generated content:** All agent output is plainly attributed in posted comments. Users are reminded they are the author of record.
- **§H API Terms:** The repository uses `GITHUB_TOKEN` for normal API operations (reading issues/PRs, posting comments, committing). No bulk scraping or harvesting.
- **§J AI features:** Users are explicitly warned that repository contents are transmitted to their chosen LLM provider and told to review that provider's data-handling terms before installing on proprietary code.

### Acceptable Use Policies
- **§3 IP:** MIT-licensed adaptation of an MIT-licensed upstream (`garrytan/gstack`). README warns extenders not to embed proprietary third-party content in public skill files.
- **§4 Inauthentic activity:** Repository contains **no code** that stars, follows, forks, mass-comments, or otherwise inflates engagement signals. The README explicitly forbids configuring it to do so.
- **§5 Site access and safety:** The `qa` skill uses Playwright on URLs supplied by the developer. The README explicitly restricts this to the developer's own preview/staging environments and forbids probing third-party services.
- **§6 Services usage limits:** Cost-heavy skills disabled by default; README guides users to monitor Actions usage and set spending caps.
- **§8 Privacy:** README flags that the `retro` skill processes contributor names/commit messages and may trigger employment-data disclosure obligations in some jurisdictions.

### Community Guidelines
- **Transparent automation:** Every agent comment is plainly attributed to the agent and the originating skill. Every session is committed to Git as an auditable transcript. The README forbids configuring the agent to impersonate a human.
- **Respectful interaction:** Skill prompts are written to produce constructive, specific feedback; the README directs customizers to preserve that tone.
- **Maintainer responsibility:** README is explicit that the maintainer owns the agent's output and must edit/delete output that is inappropriate.

### Code of Conduct & Security Disclosure
- [`/.github-gstack-intelligence/CODE_OF_CONDUCT.md`](.github-gstack-intelligence/CODE_OF_CONDUCT.md) governs both human and automated participation.
- [`/.github-gstack-intelligence/SECURITY.md`](.github-gstack-intelligence/SECURITY.md) routes vulnerability reports through GitHub Security Advisories.

## 6. What this repository is *not*

- **Not a scraper or data harvester.** It reads only the repository it is installed in.
- **Not a multi-repo agent.** Each install operates only within its own repository's scope.
- **Not a way to bypass review.** Branch protection, required reviews, and CODEOWNERS rules apply to agent commits exactly as they apply to human commits.
- **Not an external service.** No data leaves GitHub except to the LLM provider whose API key the *user* supplied to *their own* repository secrets.
- **Not a substitute for human oversight.** The project's [`ETHOS.md`](.github-gstack-intelligence/ETHOS.md) is built on the principle "AI models recommend. Users decide."

## 7. If you are reviewing this repository for a Trust & Safety concern

Recommended quick-look paths:

1. **What can the agent do?** → [`/.github/workflows/github-gstack-intelligence-agent.yml`](.github/workflows/github-gstack-intelligence-agent.yml) (permissions block, lines 148–154) and [`/.github-gstack-intelligence/config.json`](.github-gstack-intelligence/config.json) (enabled skills, gating).
2. **What does each skill do?** → Markdown files in [`/.github-gstack-intelligence/skills/`](.github-gstack-intelligence/skills/). Each is a human-readable prompt.
3. **What runs at runtime?** → [`/.github-gstack-intelligence/lifecycle/`](.github-gstack-intelligence/lifecycle/) (TypeScript; main entry points: `agent.ts`, `router.ts`).
4. **Where do transcripts go?** → `/.github-gstack-intelligence/state/` inside each user's repository (not centralized anywhere).
5. **Where is the compliance analysis?** → [`README.md`](README.md), Parts II–VI.
6. **Where do users get help / report issues?** → [`/.github-gstack-intelligence/help/README.md`](.github-gstack-intelligence/help/README.md), [`/.github-gstack-intelligence/CONTRIBUTING.md`](.github-gstack-intelligence/CONTRIBUTING.md), [`/.github-gstack-intelligence/SECURITY.md`](.github-gstack-intelligence/SECURITY.md).

## 8. Contact

For policy or compliance questions about this repository, open an issue or use GitHub's private vulnerability reporting feature on this repository (configured per [`SECURITY.md`](.github-gstack-intelligence/SECURITY.md)). The maintainers will respond.

---

*This document is informational. It is not a legal representation. The binding terms of any user's installation are governed by GitHub's Terms of Service, Acceptable Use Policies, Community Guidelines, the MIT License this project is distributed under, and the user's own agreement with their chosen LLM provider.*
