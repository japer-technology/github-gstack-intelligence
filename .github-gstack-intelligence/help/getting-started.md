# Getting Started — Your First Day with GStack Intelligence

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

> From installation to your first automated code review in under 5 minutes. Everything you need to start using GStack Intelligence as your AI engineering team.

---

## What is GStack Intelligence?

GStack Intelligence turns any GitHub repository into an AI engineering team. Seventeen specialized AI skills — code review, security audit, QA testing, performance benchmarking, planning, shipping, retrospectives, and more — all triggered by the natural events of software development through a single GitHub Actions workflow file.

No CLI. No desktop app. No subscription. Just GitHub.

The skills encode the engineering practices of Garry Tan, CEO of Y Combinator, into executable AI workflows. Every pull request is reviewed. Every deployment is monitored. Every Friday, a retrospective runs. The same engineering rigor that Y Combinator's best companies follow, automated and available to every repository.

---

## Installation (3 Steps)

### Step 1: Copy the Workflow File

Copy `.github/workflows/github-gstack-intelligence-agent.yml` into your repository's `.github/workflows/` directory.

### Step 2: Add Your API Key

Add `OPENAI_API_KEY` as a repository secret:
**Settings → Secrets and variables → Actions → New repository secret**

Any supported LLM provider works, but OpenAI GPT 5.4 is pre-configured for quick start.

### Step 3: Run the Installer

Go to **Actions → github-gstack-intelligence-agent → Run workflow** and click "Run workflow."

The installer copies the agent framework files into your repository. Subsequent runs perform upgrades without overwriting your configuration.

**That's it.** Open an issue — the agent will reply.

---

## Your First 5 Minutes

### Try 1: Ask a Question

Open a new issue with any question about your codebase:

> "How does authentication work in this project?"

The agent reads your codebase and answers. This is the conversational baseline — it works on any issue without a slash command.

### Try 2: Review a PR

Open a pull request. The `/review` skill triggers automatically. Within minutes, you'll see a structured code review comment analyzing your diff for SQL injection, race conditions, LLM trust boundaries, and more.

### Try 3: Run QA

Open an issue and comment:

```
/qa https://your-app-url.com
```

The agent launches a real browser, navigates your app, clicks every button, fills every form, checks every console error — and fixes what it finds.

---

## Understanding Commands

Commands fall into five categories:

### 🔍 Discovery

| Command | How to Trigger | What It Does |
|---|---|---|
| `/office-hours` | Issue + `office-hours` label | Product diagnostic with YC-style forcing questions |

### 📋 Planning

| Command | How to Trigger | What It Does |
|---|---|---|
| `/autoplan` | Comment on issue | Full CEO + Design + Eng review pipeline |
| `/plan-ceo-review` | Comment on issue | Strategy and scope review |
| `/plan-design-review` | Comment on issue | UI/UX completeness review |
| `/plan-eng-review` | Comment on issue | Architecture and test coverage review |
| `/design-consultation` | Issue + `design-consultation` label | Full design system builder |

### 🔧 Implementation

| Command | How to Trigger | What It Does |
|---|---|---|
| `/review` | **Automatic** on every PR | Structured code review |
| `/cso` | PR + `security-audit` label | Security audit |
| `/design-review` | PR + `design-review` label | Visual design audit with fixes |
| `/investigate` | Issue + `investigate` label | Root-cause debugging |

### 🚀 Shipping

| Command | How to Trigger | What It Does |
|---|---|---|
| `/qa` | Comment `/qa [url]` on issue | QA testing with automated fixes |
| `/qa-only` | Comment `/qa-only [url]` on issue | QA testing, report only |
| `/ship` | Comment `/ship` on issue | Automated merge, test, version, PR |
| `/document-release` | **Automatic** on release | Documentation sync |

### 📊 Operations

| Command | How to Trigger | What It Does |
|---|---|---|
| `/retro` | Scheduled (Fridays) or comment | Weekly engineering retrospective |
| `/benchmark` | Scheduled (daily) or comment | Performance regression detection |
| `/canary` | **Automatic** on deployment | Post-deploy monitoring |

---

## Common First-Week Workflows

### Workflow 1: "I have a new feature idea"

1. Open an issue describing the feature
2. Add the `office-hours` label
3. Answer the diagnostic questions
4. Comment `/autoplan` for full review
5. Create a branch and implement
6. Open a PR (auto-reviewed)
7. Comment `/qa https://staging-url.com`
8. Comment `/ship`

### Workflow 2: "I have a PR ready for review"

1. Open a pull request — `/review` runs automatically
2. Fix auto-fixed items, decide on ASK items
3. Add `security-audit` label if the PR touches auth, payments, or user data
4. Comment `/ship` when ready

### Workflow 3: "I found a bug in production"

1. Open an issue describing the bug with error messages and stack traces
2. Add the `investigate` label
3. The agent investigates with the 4-phase methodology
4. Review the fix and regression test
5. Comment `/ship` to ship the fix

### Workflow 4: "I want to improve my codebase quality"

1. Enable `/retro` in config.json — get weekly retrospectives
2. Enable `/benchmark` — get daily performance tracking
3. Run `/qa-only` on your production URL — get a quality baseline
4. Use the data to prioritize improvements

---

## Configuration

All skills are configured in `.github-gstack-intelligence/config.json`:

```json
{
  "skills": {
    "review": { "enabled": true, "trigger": "pull_request" },
    "qa": { "enabled": true, "trigger": "issue_comment" },
    "retro": { "enabled": false, "trigger": "schedule" }
  }
}
```

- Set `"enabled": false` to disable any skill
- Scheduled skills (`/retro`, `/benchmark`) are disabled by default — enable them when ready
- Label-gated skills (`/cso`, `/design-review`, `/investigate`, etc.) only trigger when the specified label is present

The AI model is configured in `.pi/settings.json`.

---

## Access Control

Only repository collaborators with `admin`, `maintain`, or `write` permissions can trigger commands. This prevents unauthorized users from consuming LLM credits on public repositories.

Bot-loop prevention is enabled by default — the agent won't respond to its own comments.

---

## What Happens Behind the Scenes

When you trigger a command:

1. **GitHub fires a webhook** → the Actions workflow starts
2. **The router** (`router.ts`) inspects the event type, slash command, and labels
3. **The router selects a skill** — the structured AI prompt for that command
4. **The agent** (`agent.ts`) builds context: issue body, comments, conversation history
5. **The LLM processes the skill** with full codebase access via bash, read, write, grep, glob tools
6. **The result is posted** as a comment on the issue or PR
7. **The conversation is committed** to Git for persistent memory across sessions

Every interaction is traceable. Every decision is auditable. Every result is stored in Git.

---

## Tips for Getting the Most Out of GStack Intelligence

1. **Write clear issue descriptions.** The agent is only as good as the context you provide.
2. **Use labels, not just commands.** Labels like `investigate`, `office-hours`, `security-audit`, and `design-consultation` auto-trigger the right skill when you open an issue.
3. **Follow The Method.** Discovery → Planning → Implementation → Shipping → Operations. The sequence matters.
4. **Enable scheduled skills.** `/retro` and `/benchmark` provide continuous improvement data that compounds over time.
5. **Trust but verify.** Review auto-fixes before merging. The agent finds real issues, but you make the final decision.
6. **Use `/autoplan` for significant features.** The full CEO + Design + Engineering review catches issues that individual reviews miss.
7. **Read the deep guides.** [The Method](the-method.md) and [Workflows](workflows.md) explain how to use the system at its full potential.

---

## Troubleshooting

### "The agent isn't responding to my issue"

- Check that the workflow file is in `.github/workflows/`
- Verify the `OPENAI_API_KEY` secret is set
- Confirm you have `write` permission on the repository
- Check the Actions tab for workflow run status

### "The agent can't find my codebase files"

- The agent runs inside GitHub Actions — it has access to the checked-out repository
- Make sure your code is committed and pushed

### "I want to use a different AI model"

- Edit `.pi/settings.json` to change the model
- Update `config.json` defaults if needed
- Any OpenAI-compatible API works

### "How do I upgrade to a new version?"

- Go to Actions → github-gstack-intelligence-agent → Run workflow
- The installer upgrades lifecycle, skills, and package files while preserving your config

---

## Next Steps

- **[Command Reference](README.md)** — Detailed documentation for all 17 commands
- **[The Method](the-method.md)** — The complete methodology for software development excellence
- **[Workflows](workflows.md)** — Step-by-step recipes for common scenarios
- **[ETHOS](../ETHOS.md)** — The builder principles behind every skill

---

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence" width="120">
  </picture>
</p>

[← Back to Command Reference](README.md)
