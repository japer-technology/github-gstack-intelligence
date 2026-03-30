# 02 — Pi-Mono Integration

### How pi-coding-agent provides the minimum intelligence runtime

---

## Why Pi-Mono

Pi-mono's `pi-coding-agent` is the proven runtime for GitHub-native AI agents. It already powers every native-strategy Githubification in this collection — GitHub Minimum Intelligence, GitClaw, and others. Using it for gstack provides:

1. **Proven GitHub Actions compatibility** — runs on ubuntu-latest runners via Bun or pre-built binary
2. **Multi-provider LLM support** — OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Groq, OpenRouter via `pi-ai`
3. **Session management** — resume multi-turn conversations via JSONL session files
4. **Tool calling** — filesystem read/write, bash execution, grep, glob — everything skills need
5. **Single dependency** — one `package.json` entry: `"@mariozechner/pi-coding-agent": "^0.52.5"`

---

## The Runtime Architecture

```
GitHub Event (PR opened, issue comment, schedule)
    │
    ▼
GitHub Actions Workflow (.github/workflows/gstack-*.yml)
    │
    ├── Step 1: Authorize (gh api — check collaborator permissions)
    ├── Step 2: Checkout (actions/checkout@v4 with full history)
    ├── Step 3: Setup Bun (oven-sh/setup-bun@v2)
    ├── Step 4: Install (bun install --frozen-lockfile in .gstack-actions/)
    ├── Step 5: Indicate (indicator.ts — add 🚀 reaction)
    └── Step 6: Run Agent (agent.ts — invoke pi with adapted skill prompt)
            │
            ├── Load skill prompt (from .gstack-actions/skills/{skill}.md)
            ├── Inject context (PR diff, issue body, repo metadata)
            ├── Resolve or create session (state/issues/{N}.json → state/sessions/{ts}.jsonl)
            ├── Execute pi-coding-agent with prompt + session
            ├── Extract reply from JSONL output
            ├── Post reply as issue/PR comment via gh api
            ├── Commit state changes to git (session file, results, any code edits)
            └── Add outcome reaction (👍 success / 👎 error)
```

---

## Two Execution Paths

### Path A — npm Install (Recommended for Development)

Use the published npm package, same as GMI:

```json
// .gstack-actions/package.json
{
  "dependencies": {
    "@mariozechner/pi-coding-agent": "^0.52.5"
  }
}
```

Install with Bun on the runner, invoke via `bun .gstack-actions/lifecycle/agent.ts`. This is the approach GMI uses today. It requires a JavaScript runtime but leverages the existing npm distribution channel and allows testing against unreleased versions.

### Path B — Pre-Built Binary (Recommended for Production)

Download the `pi-linux-x64` binary from GitHub Releases:

```yaml
- name: Download pi binary
  run: |
    curl -fsSL "https://github.com/japer-technology/githubification-pi-mono/releases/latest/download/pi-linux-x64.tar.gz" \
      -o /tmp/pi.tar.gz
    tar -xzf /tmp/pi.tar.gz -C /usr/local/bin/
    chmod +x /usr/local/bin/pi
```

Eliminates the build chain entirely. Seconds to download vs. minutes to build. No Node.js, no npm, no monorepo complexity on the runner.

### Recommendation

Start with **Path A** (npm) for development and testing. Switch to **Path B** (binary) for production once the skill adaptations are stable. Both paths produce identical agent behavior — the difference is installation speed and runner complexity.

---

## Pi-Coding-Agent Configuration

### Settings File

The agent is configured via `.gstack-actions/.pi/settings.json`:

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "thinkingLevel": "medium",
  "customInstructions": "You are running as a Githubified gstack agent on GitHub Actions. Follow the gstack ETHOS principles. Your responses will be posted as GitHub issue/PR comments."
}
```

Provider and model can be overridden per skill via `config.json` (see [07-cost-and-controls.md](07-cost-and-controls.md)).

### System Prompt Injection

The gstack ETHOS principles are injected into the agent's system prompt via `.gstack-actions/.pi/APPEND_SYSTEM.md`:

```markdown
# gstack Builder Ethos

You operate under three principles:

1. **Boil the Lake** — Do the complete thing. When the complete implementation costs
   minutes more than the shortcut, do the complete thing. Every time.

2. **Search Before Building** — The 1000x engineer's first instinct is "has someone
   already solved this?" not "let me design it from scratch."

3. **User Sovereignty** — AI models recommend. Users decide. This is the one rule
   that overrides all others.

These principles apply to every skill you execute.
```

### Tool Configuration

The pi-coding-agent provides these tools natively, which map to gstack's `allowed-tools`:

| gstack Tool | pi-coding-agent Equivalent |
|-------------|---------------------------|
| `Bash` | ✅ Built-in bash tool |
| `Read` | ✅ Built-in file read |
| `Write` | ✅ Built-in file write |
| `Edit` | ✅ Built-in file edit |
| `Grep` | ✅ Built-in grep |
| `Glob` | ✅ Built-in glob |
| `WebSearch` | ⚠️ Requires web search extension or API key |
| `AskUserQuestion` | 🔄 Replaced by issue comment + wait for reply |
| `Agent` (sub-agent) | ⚠️ Not natively available — decompose multi-agent skills into sequential workflow steps |

### Browser Integration for QA Skills

For skills requiring browser access (`/qa`, `/qa-only`, `/design-review`), Playwright is set up on the runner:

```yaml
- name: Install Playwright
  run: npx playwright install chromium --with-deps

- name: Run QA
  run: bun .gstack-actions/lifecycle/agent.ts --skill qa --url "${{ github.event.comment.body }}"
  env:
    PLAYWRIGHT_BROWSERS_PATH: /ms-playwright
```

The adapted skill prompts use Playwright's Node.js API instead of gstack's `$B <command>` browse binary. The agent executes Playwright commands via its bash tool:

```bash
# Instead of: $B goto https://example.com
npx playwright test --headed=false --reporter=json .gstack-actions/scripts/navigate.ts

# Or via direct Node.js script execution:
node -e "
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await page.screenshot({ path: '/tmp/screenshot.png' });
  await browser.close();
"
```

---

## Session Continuity

Pi-coding-agent provides built-in session management that maps directly to GMI's state pattern:

```
Issue #7 comment → agent.ts → check state/issues/7.json
                                    │
                    ┌────────────────┴────────────────┐
                    │ Exists: Resume session           │ Not found: Create new session
                    │ pi --session state/sessions/     │ pi --session-dir state/sessions/
                    │   <existing-session>.jsonl        │   → creates <timestamp>.jsonl
                    └────────────────┬────────────────┘
                                    │
                              Agent executes
                                    │
                              Commit state
                              Push to branch
```

This gives multi-turn skills (`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`) persistent memory across workflow runs. A user comments on issue #7 three weeks later, and the agent picks up exactly where it left off.

---

## Environment Variables

The agent reads credentials from GitHub Secrets via environment variables:

| Secret | Purpose | Required |
|--------|---------|----------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API access | Yes (if using Anthropic provider) |
| `OPENAI_API_KEY` | OpenAI API access | Optional (alternative provider) |
| `GEMINI_API_KEY` | Google Gemini API access | Optional |
| `XAI_API_KEY` | xAI Grok API access | Optional |
| `OPENROUTER_API_KEY` | OpenRouter multi-model access | Optional |
| `GITHUB_TOKEN` | GitHub API access (auto-provided by Actions) | Yes (automatic) |

Pi-mono's multi-provider architecture means users can choose their preferred LLM provider. The default is Anthropic (Claude), but any provider supported by `pi-ai` works.

---

## What Pi-Mono Does NOT Provide

| Capability | Status | Mitigation |
|-----------|--------|------------|
| Web search | Not built-in | Add as custom extension in `.pi/extensions/` or use API-based search |
| Sub-agent orchestration | Not built-in | Decompose multi-skill workflows (`/autoplan`) into sequential workflow steps or chained agent invocations |
| Browser automation | Not built-in | Agent uses bash tool to invoke Playwright scripts; browser setup handled by workflow |
| Screenshot upload to GitHub | Not built-in | Lifecycle script (`agent.ts`) handles image upload via GitHub API after agent completes |
| Structured output parsing | Limited | Post-process agent JSONL output in lifecycle scripts for structured results |

These gaps are filled by the lifecycle scripts and workflow configuration, not by modifying pi-mono. The agent is a runtime; the orchestration is gstack-actions' responsibility.
