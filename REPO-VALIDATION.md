# Repository Validation: Safe, Valid, and Best Practice Use of GitHub GStack Intelligence Within the GitHub Ecosystem

---

## Introduction

GitHub GStack Intelligence is a repository-local AI framework that converts any GitHub repository into a twenty-six-specialist engineering team by binding GitHub Actions, Git, Issues, and Secrets into a self-contained automation layer. It adapts Garry Tan's `gstack` skill suite — code review, security auditing, QA testing, performance benchmarking, retrospectives, release documentation, and more — into GitHub-native, event-driven workflows triggered by the normal pulse of software development: pull requests opened, issues created, comments posted, deployments completed, schedules fired.

Because this project operates at the intersection of AI, automation, and GitHub's core infrastructure primitives, its use carries real responsibilities. This essay examines those responsibilities through the lens of GitHub's published policies — the [Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service), [Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies), [Community Guidelines](https://docs.github.com/en/site-policy/github-terms/github-community-guidelines), and [Appeal and Reinstatement](https://docs.github.com/en/site-policy/acceptable-use-policies/github-appeal-and-reinstatement) procedures — and derives concrete best practices for every developer who installs, extends, or contributes to this project.

---

## Part I: What This Project Is and How It Operates

### Architecture

The project installs via a single workflow file (`.github/workflows/github-gstack-intelligence-agent.yml`). On first run the agent self-installs its full framework into `.github-gstack-intelligence/`, committing everything to the repository's main branch. Subsequent events — PR openings, issue comments, cron schedules, deployment status changes — fire the workflow, which routes the event through a TypeScript router to one of twenty-six specialist skills, calls an LLM (OpenAI, Anthropic, Google Gemini, or others via OpenRouter), and commits the response back to Git as a session transcript. No external servers, databases, or services are required beyond the LLM API.

### Scope of Automation

Twenty-six skills are active, spanning: `review`, `cso` (security audit), `qa`, `qa-only`, `ship`, `investigate`, `office-hours`, `plan-ceo-review`, `plan-eng-review`, `plan-design-review`, `design-review`, `design-consultation`, `autoplan`, `retro`, `benchmark`, `document-release`, `canary`, `careful`, `design-html`, `design-shotgun`, `devex-review`, `guard`, `health`, `land-and-deploy`, `learn`, and `plan-devex-review`. Each skill can post comments, open PRs, commit code, bump version files, and push branches — capabilities that carry meaningful impact on a repository.

### Access Control Built In

Authorization is gated to GitHub collaborators with `admin`, `maintain`, or `write` permissions. On public repositories, only credentialed contributors can cause the agent to consume LLM API credits. Bot-loop prevention ensures the agent never responds to its own comments. These controls are not optional bolt-ons — they are encoded in `config.json` and enforced in the workflow file before any LLM call is made.

---

## Part II: Compliance with the GitHub Terms of Service

### Account Responsibility

GitHub's Terms of Service (Section B) establish that the owner of an account — including a machine account — is ultimately responsible for all actions taken under that account. When a developer installs GitHub GStack Intelligence, the Actions runner operates under the repository's `GITHUB_TOKEN`. Any code the agent commits, any PR it opens, any comment it posts, is attributable to the account that owns the repository. Developers must understand: **the agent's actions are your actions.** Review the skill definitions in `.github-gstack-intelligence/skills/` before enabling any skill in production, and ensure each enabled skill's output reflects what you would be comfortable posting manually.

### API Terms (Section H)

The project consumes GitHub's API through the `GITHUB_TOKEN` — reading issue and PR content, posting comments, creating commits. All of this falls within normal Actions usage. Developers who extend the framework should not use it to scrape user data in bulk, harvest personal information for secondary purposes, or perform coordinated inauthentic activity. The API must be used as a development aid, not as an extraction mechanism.

### AI Features and Data (Section J)

The project routes prompts to third-party LLM providers (OpenAI, Anthropic, Google, etc.) using API keys stored as GitHub Secrets. The content of your repository — code, issue text, PR descriptions, commit messages — will be transmitted to whichever LLM provider you configure. GitHub's Terms acknowledge the existence of AI features and the data flows they create, but the binding agreement for data handling resides with your chosen LLM provider. **Before installing this agent in a repository containing proprietary code or sensitive data, read your LLM provider's data retention and training policies.** If your organization operates under a data processing agreement with your LLM provider, verify that automated API calls from GitHub Actions are covered under that agreement.

### User-Generated Content (Section D)

The agent's output — review comments, retrospective analyses, architecture recommendations — is user-generated content posted to your repository under your account. You are the author of record. Ensure that the agent's output does not contain content that violates GitHub's Terms: no false or misleading information, no harassment, no copyright-infringing text, no disclosure of third parties' private information. Review LLM-generated output before accepting it as authoritative, and do not use the agent to generate content that you would not stand behind as a human author.

### Acceptable Use (Section C)

Your use of GitHub GStack Intelligence must not violate applicable laws. This is especially relevant for the `cso` (security audit) skill: it is designed to identify vulnerabilities in your own code, not to generate attack payloads for external targets. Using the security skill to produce offensive tooling or to audit systems you do not have authorization to test violates both GitHub's Terms and applicable computer fraud laws.

---

## Part III: Compliance with GitHub Acceptable Use Policies

### Preventing Inauthentic Activity

GitHub's Acceptable Use Policies (Section 4) prohibit automated inauthentic activity — spam, fake accounts, rank abuse, bulk inauthentic interactions. GitHub GStack Intelligence is designed for legitimate software development automation, not for gaming engagement metrics. Developers must not configure the agent to:

- Star, fork, or follow repositories in bulk as part of a promotion strategy.
- Post templated comments across multiple repositories to drive inbound traffic.
- Create artificial issue or PR activity to inflate repository engagement signals.
- Use the `learn` or `document-release` skills to generate SEO-driven content that misrepresents a project's maturity or adoption.

Every action the agent takes should be one that a human engineer could credibly justify as serving genuine software development goals. If you cannot articulate why a workflow configuration serves your software, do not enable it.

### Intellectual Property

The Acceptable Use Policies (Section 3) prohibit infringing proprietary rights. This project is a Githubification of `garrytan/gstack`, which is published under the MIT License. The adaptation is lawful under those terms. However, developers who extend the skill library with content derived from third-party sources — copyrighted style guides, licensed architecture frameworks, proprietary playbooks — must ensure they have the right to include and distribute that content. Skill files committed to public repositories are public. Do not embed proprietary information in skills unless the repository is private and you have the rights to store it there.

Similarly, the agent regularly reads your repository's codebase to provide context-aware output. Do not install this agent in repositories that contain code you are not authorized to transmit to a third-party LLM — for example, client code covered by an NDA that prohibits API transmission.

### Privacy

The Acceptable Use Policies (Section 8) prohibit misuse of personal information. The agent's `retro` skill reads contributor names and commit messages from git history and generates per-contributor praise and growth feedback. In a team setting, this constitutes processing of personal professional data. Inform team members that retrospective automation is active. In jurisdictions where employment data processing requires explicit consent or disclosure, consult your legal team before enabling the `retro` skill on team repositories.

The `investigate` skill resolves bugs by reading issue threads and code history, which may include user-submitted bug reports containing personal data. The agent transmits this content to your LLM provider. Configure the skill's scope carefully to avoid transmitting user PII to LLMs unnecessarily.

### Services Usage Limits

Section 6 of the Acceptable Use Policies prohibits exploiting the service. GitHub Actions minutes are a metered resource. Some skills — particularly `benchmark`, `qa`, and `design-review` — are computationally intensive; the `qa` and `design-review` skills launch Playwright and Chromium, which add significant runner time. The `retro` skill's cron schedule fires weekly; `benchmark` can fire daily. Misconfigured schedules can exhaust free-tier Actions minutes quickly. Developers should:

- Start with the defaults in `config.json` and increase frequency only after measuring actual usage.
- Disable skills that are not yet relevant to their workflow (both `retro` and `benchmark` ship as `"enabled": false` for this reason).
- Monitor Actions usage in **Settings → Actions → Usage** to detect unexpected consumption.
- Use GitHub's spending limits to cap consumption before enabling cost-intensive skills on shared or high-traffic repositories.

### Site Access and Safety

The Acceptable Use Policies (Section 5) prohibit using GitHub's infrastructure to attack external services. The `qa` skill uses Playwright to interact with URLs provided by developers. Developers must not configure the QA skill to systematically probe external services they do not own. The skill is designed to test your own deployed preview or staging environment, not to crawl or fuzz third-party websites. Using it to repeatedly hit an external API endpoint could constitute unauthorized access to that service and violates GitHub's policies.

---

## Part IV: Adherence to GitHub Community Guidelines

### Transparency About Automation

GitHub's Community Guidelines call for authentic interaction. When the agent posts a review comment on a PR, it does so visibly — the comment identifies the agent and the skill that produced the output. Do not configure the agent to impersonate a human reviewer by stripping attribution from its comments, disguising its identity, or falsely representing its output as human judgment. The project's design principle of full auditability — every session committed to Git, every comment attributed to the agent — is itself a compliance measure. Preserve it.

### Respectful Automated Communication

Community Guidelines require respectful interaction. The skills in this project are prompt-engineered to be constructive: the `review` skill posts specific, actionable feedback rather than blanket criticism; the `retro` skill frames per-contributor feedback as both praise and growth areas. Developers who customize skill files should preserve this tone. Configuring the agent to produce dismissive, condescending, or hostile output — even if technically accurate — undermines the collaborative environment GitHub's guidelines are designed to protect.

### Moderating Your Projects

The Community Guidelines recognize that maintainers are responsible for moderating their projects. Once GitHub GStack Intelligence is installed, the agent acts as an extension of the maintainer. If the agent posts a comment that is factually incorrect, unhelpful, or inappropriate for your community, it is the maintainer's responsibility to edit or delete it. The full audit trail committed to `.github-gstack-intelligence/state/` makes it straightforward to review every session and identify outputs that warrant correction.

Maintainers should set clear expectations for contributors about which skills are active. A note in the repository's `CONTRIBUTING.md` — already present in this repository — explaining that automated review, security audit, and retrospective skills are active helps contributors understand the workflow and reduces friction when the agent posts feedback.

### No Harmful Automation

The Code of Conduct embedded in this project explicitly prohibits using the agent's capabilities to cause harm to individuals, communities, or the public interest. This aligns directly with the Community Guidelines' prohibition on harassment, threats, and discriminatory content. The agent's security and QA skills are powerful; they operate on real code with real access to the repository. Developers must not repurpose these skills to conduct unauthorized security scanning, generate exploit code, or produce content designed to harm or deceive users of their software.

---

## Part V: Understanding the Appeal and Reinstatement Process

Even well-intentioned automation can trigger GitHub's enforcement mechanisms. An agent that fires on every event in a busy repository may accumulate a volume of API calls or Actions runs that GitHub's automated systems flag as anomalous. Skill output that inadvertently reproduces problematic content from an LLM could trigger content moderation. Understanding GitHub's [Appeal and Reinstatement](https://docs.github.com/en/site-policy/acceptable-use-policies/github-appeal-and-reinstatement) process is therefore a practical necessity for maintainers.

### What Can Happen

GitHub may remove content, restrict repository visibility, suspend an account, or limit Actions access if it determines that policies have been violated. Because the agent's actions are attributable to the account owner, any enforcement action taken in response to agent-generated content or agent-triggered behavior applies to the account holder directly.

### Preparation and Mitigation

The best protection against enforcement is operating transparently within policy boundaries from the start:

1. **Enable only the skills you need.** `config.json` ships with several skills disabled. Start conservatively and expand as you understand the impact of each skill.
2. **Keep all LLM API keys in GitHub Secrets.** Never hardcode credentials. The project's architecture mandates this; do not deviate from it.
3. **Review session transcripts periodically.** The `.github-gstack-intelligence/state/` directory contains every prompt and response committed to the repository. Reviewing this directory regularly surfaces unexpected outputs before they become enforcement issues.
4. **Use private repositories for sensitive work.** The `SECURITY.md` file included in this project states this explicitly: session history on public repositories is visible to everyone. If your work involves proprietary code, security vulnerabilities, or user PII, install the agent in a private repository.

### If Enforcement Occurs

If content or an account is restricted due to agent-generated activity, GitHub's process allows for both reinstatement (where the user agrees to correct the violation going forward) and appeal (where the user disputes that a violation occurred). The appeal window is six months from the enforcement decision. Maintain clear documentation of your agent's configuration and the intent behind each enabled skill — this documentation will be central to any reinstatement or appeal submission.

GitHub's process is human-reviewed: appeals are not decided by automated systems, and if the initial reviewer was the same person who made the enforcement decision, a different staff member independently reviews the appeal. The process is designed to be fair; engage with it directly through the [Appeal and Reinstatement form](https://support.github.com/contact/reinstatement) rather than attempting to work around enforcement through alternative accounts.

---

## Part VI: Best Practices for Developers

### Installation

1. **Read before you install.** Before copying the workflow file, read the skill definitions in `.github-gstack-intelligence/skills/`. Each skill describes what actions it takes, what it reads, and what it writes. Understand the blast radius of each skill before it runs on your repository.
2. **Start with a private repository.** Iterate on configuration in a private repo before deploying to a public one. This limits exposure of session transcripts and reduces the risk of inadvertent content policy violations during experimentation.
3. **Use the minimum viable configuration.** The project ships with `retro` and `benchmark` disabled for good reason — they are high-frequency or high-cost. Enable them only when you have established baseline usage and understand the cost implications.
4. **Pin your LLM provider to an appropriate tier.** `config.json`'s `costTier` setting controls which model tier is used. Start at `standard` and upgrade only if output quality is demonstrably insufficient for your use case.

### API Keys and Secrets

5. **Rotate API keys regularly.** LLM API keys stored as GitHub Secrets are not visible in logs, but they should still be treated as credentials — rotate them periodically and immediately upon any suspected exposure.
6. **Scope keys to minimum necessary permissions.** Most LLM provider APIs allow creating keys scoped to specific models or rate limits. Create a key scoped to the models you have configured rather than a master account key.
7. **Audit third-party data handling.** Before using any LLM provider, review their data processing and retention policies. Some providers retain API inputs for model training by default; opt out if this conflicts with your organization's data policies.

### Skill Configuration

8. **Gate high-trust skills with label requirements.** The `cso` security audit and `design-review` skills ship with `"labelGated": true` — they only run when a maintainer applies a specific label to a PR. Maintain this gate. It ensures that only maintainers intentionally trigger high-cost or high-impact skills, not every PR author.
9. **Use the `prefixGating` setting.** The `access.prefixes` configuration (defaulting to `/`) means the agent only responds to comments that begin with a `/` command. This prevents the agent from reacting to every comment in an issue thread. Keep this gate active; removing it would cause the agent to consume LLM credits on every comment, including those from contributors who are unaware the agent is active.
10. **Customize skill output for your community.** The skill files are Markdown and are meant to be modified. If a skill's default output style does not fit your community's norms — too formal, too informal, too verbose — edit it. The `CONTRIBUTING.md` in this project provides the project structure needed to locate and modify skill files safely.

### Monitoring and Maintenance

11. **Review Actions usage weekly during onboarding.** New installations should check **Settings → Actions → Usage** weekly for the first month. Unusual consumption spikes indicate misconfigured schedules or unexpected event volumes.
12. **Periodically audit the session store.** Run a periodic review of `.github-gstack-intelligence/state/` to ensure the agent's output remains appropriate, accurate, and useful. Sessions are plain JSON files; they are readable and searchable.
13. **Run `run-refresh-gstack` on a schedule.** Upstream `garrytan/gstack` evolves as Garry Tan's engineering thinking evolves. The refresh workflow keeps the skill definitions current. Running it on a schedule (or when gstack releases a significant update) ensures you benefit from upstream improvements and security fixes.
14. **Subscribe to this repository's releases.** GitHub GStack Intelligence releases new versions as it incorporates upstream improvements and fixes. Watching the repository for releases allows you to adopt improvements promptly.

### Team and Community Use

15. **Disclose automation to contributors.** Update your repository's `CONTRIBUTING.md` to explain that an AI agent is active, which skills are enabled, and what kinds of automated feedback contributors should expect. This is consistent with GitHub's Community Guidelines expectation of authentic, transparent interaction.
16. **Apply the User Sovereignty principle.** The ETHOS document embedded in this project states: "AI models recommend. Users decide." This is not merely a philosophical preference — it is the correct operational stance. Treat every skill output as a recommendation requiring human verification, not as a mandate. The agent's review comments, security findings, and architecture recommendations are starting points for human judgment, not replacements for it.
17. **Set a code of conduct.** The project ships with a `CODE_OF_CONDUCT.md`. Reference it in your repository's README so contributors understand the behavioral standards that apply to human and automated participation alike.

### Security

18. **Report vulnerabilities privately.** The `SECURITY.md` included in this project directs security researchers to use GitHub's Security Advisory feature rather than opening public issues. Honor this in your own installation — if a contributor discovers that the agent can be induced to produce harmful output or that the workflow file has a privilege escalation vulnerability, that should be reported privately.
19. **Limit the agent's write scope carefully.** The `ship` skill commits code, pushes branches, and opens pull requests. The `land-and-deploy` skill triggers deployments. These are high-privilege operations. Verify that your repository's branch protection rules and required review settings are configured to prevent the agent from bypassing human review gates on critical branches.
20. **Do not store sensitive data in session files.** Sessions are committed to Git and, on public repositories, are publicly visible. Do not use the agent to process content that should remain confidential — authentication tokens, personally identifiable information, or trade secrets — on public repositories.

---

## Part VII: What This Project Is Not For

GitHub GStack Intelligence is not:

- **A tool for automating spam or inauthentic engagement.** Do not configure it to post issue comments, star repositories, or generate promotional content at scale. GitHub's Acceptable Use Policies prohibit this and GitHub's detection systems are effective at identifying it.
- **A tool for auditing or testing systems you do not own.** The QA and security skills operate on your own code and deployments. Using them to interact with external systems without authorization violates both GitHub's policies and applicable computer fraud laws.
- **A substitute for human oversight.** The agent operates on real code with real consequences — commits get pushed, PRs get opened, deployments get triggered. Every significant action taken by the agent should be reviewed by a human before it propagates beyond the repository. The generation-verification loop is not optional; it is the foundation of responsible AI-assisted development.
- **A replacement for a security review.** The `cso` skill is a powerful first-pass security audit, but it is not equivalent to a professional penetration test or a human security review conducted by a qualified engineer. Treat its findings as leads to investigate, not verdicts to close.

---

## Conclusion

GitHub GStack Intelligence is a good-faith, policy-compliant project designed to bring high-quality engineering automation to any repository through GitHub's existing infrastructure. Its architecture — credentials in Secrets, state in Git, access gated by repository permissions, audit trail committed with every action — is built with compliance and transparency as first principles.

Compliant, beneficial use requires developers to understand that GitHub's Terms and Acceptable Use Policies apply to automated actions exactly as they apply to human actions; that the agent's output is the maintainer's responsibility; that LLM API calls transmit repository content to third parties; and that the agent's power to commit code and trigger deployments must be balanced by human review at key decision points.

Used within these boundaries — with skills enabled deliberately, credentials managed carefully, output reviewed before acceptance, and team members informed of what is running — GitHub GStack Intelligence represents a genuine advance in accessible, auditable, user-owned AI engineering automation. The repo is the mind; the developer must remain the judgment.

---

*Prepared with reference to:*
- *[GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)*
- *[GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)*
- *[GitHub Community Guidelines](https://docs.github.com/en/site-policy/github-terms/github-community-guidelines)*
- *[GitHub Appeal and Reinstatement](https://docs.github.com/en/site-policy/acceptable-use-policies/github-appeal-and-reinstatement)*
- *Repository documentation: `README.md`, `.github-gstack-intelligence/README.md`, `ETHOS.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `config.json`*
