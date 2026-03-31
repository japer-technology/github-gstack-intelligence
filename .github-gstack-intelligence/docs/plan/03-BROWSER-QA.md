# Phase 3 — Browser & QA

### Playwright integration, `/qa`, `/qa-only`, `/design-review` skills

---

## Goal

Skills that need a real browser are operational. A user can comment `/qa https://staging.example.com` on an issue, and the agent launches Playwright, tests the site, takes screenshots, and posts a QA report as an issue comment. Design review runs on PRs that change CSS/UI files, with before/after screenshots.

---

## Steps

### Step 14 — Write `browser.ts`

**File:** `.github-gstack-intelligence/lifecycle/browser.ts`

A Playwright utility module providing reusable browser functions for all browser-based skills:

```typescript
export async function launchBrowser(): Promise<Browser>;
export async function captureScreenshot(page: Page, outputPath: string): Promise<string>;
export async function navigateAndCapture(url: string, outputPath: string): Promise<{ screenshot: string; title: string; status: number }>;
export async function checkPageHealth(url: string): Promise<HealthReport>;
export async function testResponsiveLayouts(url: string, outputDir: string): Promise<ResponsiveReport>;
export async function getAccessibilitySnapshot(page: Page): Promise<string>;
```

**Key design decisions:**
- Browser is launched fresh per workflow run (no persistent daemon like gstack's browse binary)
- All screenshots are saved to `/tmp/screenshots/` during execution, then committed to `state/results/qa/screenshots/`
- Cold start (~10s for Chromium install) is acceptable for CI — it runs in parallel with the agent setup
- Browser helpers are designed to be invoked by the agent via its bash tool (not directly imported by agent.ts)

**Playwright command mapping (from gstack's `$B` syntax):**

| gstack `$B` command | `browser.ts` equivalent |
|---|---|
| `$B goto <url>` | `await page.goto(url)` |
| `$B screenshot <path>` | `await captureScreenshot(page, path)` |
| `$B click <selector>` | `await page.click(selector)` |
| `$B fill <selector> <value>` | `await page.fill(selector, value)` |
| `$B text` | `await page.textContent('body')` |
| `$B console` | `page.on('console', msg => ...)` |
| `$B is visible <selector>` | `await page.isVisible(selector)` |
| `$B snapshot -i` | `await getAccessibilitySnapshot(page)` |
| `$B responsive <path>` | `await testResponsiveLayouts(url, outputDir)` |

---

### Step 15 — Add Conditional Playwright Install to Workflow

In the workflow, add a step that only runs when the route needs a browser:

```yaml
- name: Install Playwright (conditional)
  if: >-
    (github.event_name == 'issue_comment' && (
      startsWith(github.event.comment.body, '/qa ') ||
      startsWith(github.event.comment.body, '/qa-only ') ||
      startsWith(github.event.comment.body, '/design-review') ||
      startsWith(github.event.comment.body, '/canary')
    )) || (
      github.event_name == 'deployment_status'
    )
  run: npx playwright install chromium --with-deps
  env:
    PLAYWRIGHT_BROWSERS_PATH: /ms-playwright
```

**Why conditional:** Playwright install adds ~30s and ~200MB to the runner. Only install it when a browser-based skill is actually being invoked.

---

### Step 16 — Wire Router: `/qa <url>` → QA Skill

In `router.ts`, when the slash-command parser detects `/qa`:

```typescript
if (command.skill === 'qa') {
  if (!command.url) {
    return { skill: 'error', prompt: 'The /qa command requires a URL. Usage: /qa https://staging.example.com' };
  }
  return {
    skill: 'qa',
    prompt: buildQaPrompt(command.url, event.issue),
    needsBrowser: true,
    sessionMode: 'none',
    context: { issueNumber: event.issue.number, url: command.url },
  };
}
```

**QA prompt construction (`buildQaPrompt`):**
- Load `skills/qa.md` (CI-adapted skill prompt)
- Inject the target URL
- Reference `skills/references/qa-issue-taxonomy.md` for bug classification
- Reference `skills/references/qa-report-template.md` for output format
- Include QA tier (quick/standard/exhaustive) from comment or default to standard

---

### Step 17 — Wire Router: `/qa-only <url>` → QA-Only Skill

Same as Step 16, but using `skills/qa-only.md` — produces a report without code fixes.

---

### Step 18 — Wire Router: Design Review on UI File Changes

When a PR modifies CSS, SCSS, TSX, JSX, Vue, or Svelte files, and the `design-review` label is present:

```typescript
if (event.type === 'pull_request' && config.skills['design-review'].enabled) {
  const uiFiles = event.pr.files.filter(f =>
    /\.(css|scss|tsx|jsx|vue|svelte)$/.test(f.filename)
  );
  if (uiFiles.length > 0 && hasLabel(event.pr, 'design-review')) {
    return {
      skill: 'design-review',
      prompt: buildDesignReviewPrompt(event.pr, uiFiles),
      needsBrowser: true,
      sessionMode: 'none',
      context: { prNumber: event.pr.number },
    };
  }
}
```

---

### Step 19 — Implement Screenshot Upload to GitHub

After the agent completes a browser-based skill, screenshots need to be visible in the issue comment.

**Approach:** Upload screenshots as issue comment attachments via the GitHub API, then embed the returned URLs in the comment body.

```typescript
async function uploadScreenshot(issueNumber: number, filePath: string): Promise<string> {
  // GitHub's upload API returns a URL that can be embedded in Markdown
  // Use: gh api --method POST repos/{owner}/{repo}/issues/{number}/comments ...
  // With the image as a Markdown image reference
}
```

**Alternative:** Commit screenshots to `state/results/qa/screenshots/` and reference them via raw.githubusercontent.com URLs. This is simpler but makes the repo grow faster.

**Recommendation:** Start with committing to git (simpler), add API upload later if repo size becomes an issue.

---

### Step 20 — Persist QA Results

Write QA results to `state/results/qa/`:

```json
{
  "url": "https://staging.example.com",
  "timestamp": "2026-04-01T10:15:00Z",
  "tier": "standard",
  "findings": [
    {
      "severity": "high",
      "description": "Login form submits on Enter but doesn't show loading state",
      "screenshot": "screenshots/qa-42-login.png",
      "status": "found"
    }
  ]
}
```

---

### Step 21 — Test QA on Staging URL

Deploy a test application with known bugs:
- Missing loading states
- Broken mobile navigation
- Console errors on page load
- Missing alt text on images

Run `/qa https://test-staging.example.com` and verify:
- Agent launches Playwright and navigates to the URL
- Screenshots appear in the issue comment
- Bug findings are classified by severity
- QA report follows the template format

---

## Exit Criteria

- [ ] `browser.ts` provides working Playwright helper functions
- [ ] Playwright is installed conditionally (only for browser-based skills)
- [ ] `/qa <url>` triggers browser-based QA testing and posts results
- [ ] `/qa-only <url>` produces a report without code changes
- [ ] `/design-review` runs on PRs with UI file changes
- [ ] Screenshots are captured and visible in issue comments
- [ ] QA results are persisted to `state/results/qa/`

---

## Dependencies

- **Depends on:** Phase 1 (router, config), Phase 2 (PR event handling)
- **Unlocks:** Phase 5 (`/canary` needs browser.ts)

---

*Phase 3 of 7. See [README.md](README.md) for the full plan.*
