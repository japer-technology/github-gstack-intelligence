# Phase 7 — Distribution

### Packaging, documentation, marketplace listing, and version management

---

## Goal

Any GitHub repository can install github-gstack-intelligence in under 5 minutes. The installation path is proven, the documentation is complete, and the upgrade path preserves customizations.

---

## Steps

### Step 46 — Improve Self-Installer

The current `run-install` job copies the `.github-gstack-intelligence/` folder from the source repo. Extend it to handle upgrades gracefully:

**Upgrade rules:**
- **Always overwrite:** `lifecycle/*.ts`, `skills/*.md`, `skills/references/*.md`, `package.json`, `VERSION`
- **Never overwrite (preserve customizations):** `config.json`, `.pi/settings.json`, `.pi/APPEND_SYSTEM.md`, `AGENTS.md`, `state/`
- **Merge carefully:** `.pi/BOOTSTRAP.md` (update template but preserve custom hatching)

**Implementation:**
```typescript
// In the install function
const ALWAYS_OVERWRITE = ['lifecycle/', 'skills/', 'package.json', 'VERSION'];
const NEVER_OVERWRITE = ['config.json', '.pi/settings.json', 'AGENTS.md', 'state/'];

for (const file of installedFiles) {
  if (NEVER_OVERWRITE.some(p => file.startsWith(p)) && existsSync(file)) {
    console.log(`Preserving ${file} (user customization)`);
    continue;
  }
  // ... copy file
}
```

**First install vs. upgrade detection:**
Check for `VERSION` file existence. If it exists, this is an upgrade — preserve config. If not, this is a fresh install — copy defaults.

---

### Step 47 — Write Installation Guide

**File:** `.github-gstack-intelligence/docs/INSTALL.md`

**Contents:**

1. **Prerequisites** — GitHub repo, LLM API key
2. **Step 1: Copy the workflow file** — `github-gstack-intelligence-agent.yml` → `.github/workflows/`
3. **Step 2: Add your API key** — Settings → Secrets → add `OPENAI_API_KEY` (or other provider)
4. **Step 3: Run the installer** — Actions → github-gstack-intelligence-agent → Run workflow
5. **Step 4: Verify installation** — Check that `.github-gstack-intelligence/` folder exists
6. **Step 5: Open an issue** — The agent will reply
7. **Step 6: Configure skills** — Edit `config.json` to enable/disable skills

**Troubleshooting section:**
- Agent doesn't respond → Check secrets, check workflow permissions
- 👎 reaction → Check authorization (actor must have write access)
- No reaction at all → Workflow didn't trigger — check `on:` triggers

---

### Step 48 — Write Per-Skill Documentation

**File:** `.github-gstack-intelligence/docs/SKILLS.md`

For each of the seventeen skills, document:
- What it does (one paragraph)
- How to trigger it (event, label, command)
- Example input and output
- Configuration options (`config.json` keys)
- Model recommendation

Example:

```markdown
### `/review` — PR Code Review

**Trigger:** Automatic on every PR (or when `/review` is commented)

**What it does:** Performs a structured code review using a checklist-driven approach.
Checks for bugs, security issues, performance problems, and style violations.
Posts findings as a PR comment with severity levels.

**Example output:**
> ## Code Review — PR #42
> 
> ### Critical (2)
> 1. **SQL Injection** in `src/db.ts:45` — user input directly interpolated into query
> 2. **Race condition** in `src/auth.ts:112` — token refresh not mutex-protected
> 
> ### Informational (3)
> ...

**Config:**
\`\`\`json
{ "review": { "enabled": true, "model": "gpt-5.4", "skipDocsOnly": true } }
\`\`\`
```

---

### Step 49 — Write Cost Estimation Guide

**File:** `.github-gstack-intelligence/docs/COST.md`

Include:
- Per-skill cost estimates (tokens in/out, cost per invocation per model)
- Monthly cost scenarios for different team sizes
- How to use cost tiers (`economy`, `standard`, `premium`)
- How to use label gating and diff filtering to reduce costs
- How to monitor costs (check `state/rate-limits.json`)

**Cost scenarios:**

| Team size | Activity | Economy tier | Standard tier | Premium tier |
|---|---|---|---|---|
| Solo dev | 5 PRs/week, retro | ~$5/month | ~$15/month | ~$40/month |
| Small team (3-5) | 20 PRs/week, QA, retro | ~$20/month | ~$60/month | ~$150/month |
| Active project (10+) | 50 PRs/week, full suite | ~$60/month | ~$200/month | ~$500/month |

---

### Step 50 — Write Troubleshooting Guide

**File:** `.github-gstack-intelligence/docs/TROUBLESHOOTING.md`

Common issues and resolutions:
- "Agent doesn't respond to my issue" → Check permissions, secrets, workflow triggers
- "Agent gives 👎 reaction" → Check authorization (must be repo collaborator with write access)
- "Review is stale after force-push" → Expected behavior — new push triggers new review
- "QA skill can't access my staging URL" → URL must be publicly accessible from GitHub Actions runner
- "Session state is corrupted" → Delete `state/issues/{N}.json` and start fresh
- "Push conflicts after agent edits" → Agent auto-retries up to 10 times; if still failing, check for branch protection rules
- "Cost is too high" → Enable `economy` tier, add label gating, use diff filtering

---

### Step 51 — Evaluate Distribution Format

Three distribution options:

**Option A — Template Repository:**
- Users click "Use this template" and get a new repo with everything pre-installed
- Pros: Easiest for new projects
- Cons: Doesn't help existing repos; no upgrade path

**Option B — Self-Installer (current approach):**
- Users copy one workflow file, run it, agent installs itself
- Pros: Works with existing repos; upgrade by re-running; proven by GMI
- Cons: Requires manual workflow file copy

**Option C — Composite GitHub Action:**
- Published as `uses: japer-technology/github-gstack-intelligence@v1`
- Pros: Standard GitHub Actions distribution; automatic versioning
- Cons: More complex packaging; may need separate config repo

**Recommendation:** Continue with **Option B** (self-installer) for now. It's proven, simple, and works with existing repos. Evaluate Option C for marketplace listing once demand is validated.

---

### Step 52 — Version Management

**Semantic versioning** for the `.github-gstack-intelligence/` package:

```
VERSION file format: X.Y.Z
  X = Major (breaking changes to config.json, agent behavior)
  Y = Minor (new skills, new config options)
  Z = Patch (bug fixes, prompt improvements)
```

**Upgrade detection:**
```typescript
const installedVersion = readFileSync(resolve(agentDir, 'VERSION'), 'utf8').trim();
const availableVersion = fetchLatestVersion();

if (semver.gt(availableVersion, installedVersion)) {
  console.log(`Upgrade available: ${installedVersion} → ${availableVersion}`);
  // Proceed with upgrade, preserving user config
} else {
  console.log(`Already at latest version: ${installedVersion}`);
}
```

**CHANGELOG** tracking:
- `CHANGELOG.md` in the repo root documents every version's changes
- Linked from README and installation guide

---

### Step 53 — Test Installation on Diverse Repos

Test the full installation flow on repos with:
- Different languages: Python, TypeScript, Go, Rust, Java
- Different frameworks: Next.js, Rails, Django, FastAPI
- Different sizes: solo project, team of 5, open-source with 50 contributors
- Different configurations: economy tier, full suite, selective skills only

**For each test:**
1. Copy workflow file
2. Add API key secret
3. Run installer
4. Open test issue — verify conversation works
5. Open test PR — verify review runs (Phase 2+)
6. Comment `/qa <url>` — verify QA runs (Phase 3+)
7. Check state directory — verify state is committed correctly
8. Upgrade to new version — verify config is preserved

---

## Exit Criteria

- [ ] Installer handles upgrades without overwriting user customizations
- [ ] Installation guide covers the complete setup flow
- [ ] Per-skill documentation with examples exists for all 17 skills
- [ ] Cost estimation guide helps teams budget their usage
- [ ] Troubleshooting guide covers common issues
- [ ] Distribution format decision is made and implemented
- [ ] Version management with semantic versioning is working
- [ ] Installation tested on repos with different languages and team sizes

---

## Dependencies

- **Depends on:** All previous phases (all skills operational, cost controls in place)
- **Final phase** — no further phases depend on this

---

*Phase 7 of 7. See [README.md](README.md) for the full plan.*
