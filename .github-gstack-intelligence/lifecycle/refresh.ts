import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, relative, resolve } from "path";
import { fileURLToPath } from "url";

const lifecycleDir = dirname(fileURLToPath(import.meta.url));
const agentDir = process.env.GSTACK_INTELLIGENCE_DIR
  ? resolve(process.env.GSTACK_INTELLIGENCE_DIR)
  : resolve(lifecycleDir, "..");
const skillsDir = resolve(agentDir, "skills");
const referencesDir = resolve(skillsDir, "references");
const sourceRepo = process.env.GSTACK_SOURCE_REPO ?? "garrytan/gstack";
const sourceRef = process.env.GSTACK_SOURCE_REF ?? "main";
const sourceMetadataPath = resolve(skillsDir, "source.json");
const GENERATED_MARKER = "<!-- GSTACK-INTELLIGENCE: GENERATED FILE -->";

const SOURCE_FILES: Record<string, string> = {
  // Foundational documents
  ethos: "ETHOS.md",
  architecture: "ARCHITECTURE.md",
  agents: "AGENTS.md",
  rootSkillTemplate: "SKILL.md.tmpl",

  // Review skill + supplementary files
  reviewTemplate: "review/SKILL.md.tmpl",
  reviewChecklist: "review/checklist.md",
  reviewDesignChecklist: "review/design-checklist.md",
  reviewTodosFormat: "review/TODOS-format.md",
  reviewGreptileTriage: "review/greptile-triage.md",

  // CSO skill
  csoTemplate: "cso/SKILL.md.tmpl",
  csoAcknowledgements: "cso/ACKNOWLEDGEMENTS.md",

  // Tier 1 skills (event-driven, no user interaction)
  shipTemplate: "ship/SKILL.md.tmpl",
  benchmarkTemplate: "benchmark/SKILL.md.tmpl",
  retroTemplate: "retro/SKILL.md.tmpl",
  documentReleaseTemplate: "document-release/SKILL.md.tmpl",

  // Tier 2 skills (brief input via issues)
  qaTemplate: "qa/SKILL.md.tmpl",
  qaIssueTaxonomy: "qa/references/issue-taxonomy.md",
  qaReportTemplate: "qa/templates/qa-report-template.md",
  qaOnlyTemplate: "qa-only/SKILL.md.tmpl",
  designReviewTemplate: "design-review/SKILL.md.tmpl",
  planDesignReviewTemplate: "plan-design-review/SKILL.md.tmpl",
  investigateTemplate: "investigate/SKILL.md.tmpl",
  canaryTemplate: "canary/SKILL.md.tmpl",

  // Tier 3 skills (multi-turn conversation)
  officeHoursTemplate: "office-hours/SKILL.md.tmpl",
  planCeoReviewTemplate: "plan-ceo-review/SKILL.md.tmpl",
  planEngReviewTemplate: "plan-eng-review/SKILL.md.tmpl",
  designConsultationTemplate: "design-consultation/SKILL.md.tmpl",
  autoplanTemplate: "autoplan/SKILL.md.tmpl",
};

function rawUrl(path: string) {
  return `https://raw.githubusercontent.com/${sourceRepo}/${sourceRef}/${path}`;
}

function gitHubApiUrl(path: string) {
  return `https://api.github.com/repos/${sourceRepo}/${path}`;
}

function requestHeaders() {
  const headers: Record<string, string> = {
    "User-Agent": "github-gstack-intelligence-refresh",
    "Accept": "application/vnd.github+json",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function fetchText(path: string): Promise<string> {
  console.log(`Fetching ${path} from ${sourceRepo}@${sourceRef}`);
  const response = await fetch(rawUrl(path), { headers: requestHeaders() });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

async function fetchSourceCommit(): Promise<string | null> {
  const response = await fetch(gitHubApiUrl(`commits/${sourceRef}`), { headers: requestHeaders() });

  if (!response.ok) {
    console.warn(
      `Could not resolve source commit for ${sourceRepo}@${sourceRef}: ` +
      `${response.status} ${response.statusText}. Recording the configured ref only.`,
    );
    return null;
  }

  const payload = await response.json();
  return payload.sha ?? null;
}

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

function writeFile(path: string, content: string) {
  ensureDir(dirname(path));
  writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`, "utf-8");
}

function resolveManagedOutput(relativePath: string) {
  const absolutePath = resolve(agentDir, relativePath);
  const relativePathFromRoot = relative(agentDir, absolutePath);

  if (relativePathFromRoot === "" || relativePathFromRoot.startsWith("..")) {
    throw new Error(`Refusing to access output outside ${agentDir}: ${relativePath}`);
  }

  return absolutePath;
}

function readPreviousOutputs(): string[] {
  if (!existsSync(sourceMetadataPath)) {
    return [];
  }

  try {
    const payload = JSON.parse(readFileSync(sourceMetadataPath, "utf-8")) as { outputs?: unknown };
    return Array.isArray(payload.outputs)
      ? payload.outputs.filter((value): value is string => typeof value === "string")
      : [];
  } catch (error) {
    console.warn(`Could not read previous source metadata from ${sourceMetadataPath}.`, error);
    return [];
  }
}

function removeStaleOutputs(previousOutputs: string[], currentOutputs: string[]) {
  const currentOutputSet = new Set(currentOutputs);

  for (const relativePath of previousOutputs) {
    if (currentOutputSet.has(relativePath)) {
      continue;
    }

    const absolutePath = resolveManagedOutput(relativePath);

    if (existsSync(absolutePath)) {
      rmSync(absolutePath, { force: true });
      console.log(`Removed stale generated output ${relativePath}`);
    }
  }
}

function assertOutputsExist(outputs: string[]) {
  const missingOutputs = outputs.filter((relativePath) => !existsSync(resolveManagedOutput(relativePath)));

  if (missingOutputs.length > 0) {
    throw new Error(`Refresh completed without writing expected outputs: ${missingOutputs.join(", ")}`);
  }
}

function removeAskUserQuestionFromFrontmatter(content: string): string {
  return content.replace(/^  - AskUserQuestion\n/gm, "");
}

function replaceAll(content: string, replacements: Array<[string, string]>): string {
  return replacements.reduce(
    (next, [searchValue, replacementValue]) => next.replaceAll(searchValue, replacementValue),
    content,
  );
}

function buildGeneratedHeader(skillName: string, sourcePath: string, sourceCommit: string | null): string {
  const sourceMarker = sourceCommit
    ? `\`${sourceCommit.slice(0, 12)}\``
    : `ref \`${sourceRef}\``;
  return [
    GENERATED_MARKER,
    "<!--",
    "GENERATED FILE — imported from gstack during run-refresh-gstack.",
    "Do not edit this file unless you intentionally forfeit clean upgrades and re-imports.",
    "-->",
    "",
    "> [!CAUTION]",
    `> **Do not touch** — imported from gstack. Editing this file forfeits clean upgrades.`,
    `> Generated by \`.github-gstack-intelligence/lifecycle/refresh.ts\`.`,
    `> Source: \`${sourceRepo}\` @ ${sourceMarker} from \`${sourcePath}\`.`,
    "> This copy is adapted for GitHub-native execution and refresh-time extraction.",
    "> Re-run `run-refresh-gstack` to pull upstream gstack changes back into this repository.",
    "",
    "## GitHub-native execution notes",
    "",
    `- This is the extracted \`/${skillName}\` skill prompt committed into the repository at refresh time.`,
    "- Inject GitHub workflow context directly in the invoking lifecycle code instead of relying on local preamble expansion.",
    "- Replace interactive approval steps with issue or pull-request comments plus a follow-up GitHub event.",
    "- Use repository-local reference files under `.github-gstack-intelligence/skills/references/` instead of `~/.claude/skills/...` paths.",
    "",
  ].join("\n");
}

function buildImportedDocumentHeader(sourcePath: string, sourceCommit: string | null): string {
  const sourceMarker = sourceCommit
    ? `\`${sourceCommit.slice(0, 12)}\``
    : `ref \`${sourceRef}\``;
  return [
    GENERATED_MARKER,
    "<!--",
    "GENERATED FILE — imported from gstack during run-refresh-gstack.",
    "Do not edit this file unless you intentionally forfeit clean upgrades and re-imports.",
    "-->",
    "",
    "> [!CAUTION]",
    `> **Do not touch** — imported from gstack. Editing this file forfeits clean upgrades.`,
    `> Imported from \`${sourceRepo}\` @ ${sourceMarker} from \`${sourcePath}\`.`,
    "> Re-run `run-refresh-gstack` to copy upstream gstack changes back into this repository.",
    "",
  ].join("\n");
}

function wrapImportedMarkdown(content: string, sourcePath: string, sourceCommit: string | null): string {
  return `${buildImportedDocumentHeader(sourcePath, sourceCommit)}${content}`;
}

function assertNoTemplateTokens(skillName: string, content: string) {
  const unresolved = [...content.matchAll(/\{\{[A-Z0-9_-]+\}\}/g)].map((match) => match[0]);

  if (unresolved.length > 0) {
    throw new Error(`Unresolved template tokens remain in ${skillName}: ${unresolved.join(", ")}`);
  }
}

function adaptReviewSkill(template: string, sourceCommit: string | null): string {
  const withoutAskUserQuestion = removeAskUserQuestionFromFrontmatter(template);
  const withDirectReplacements = replaceAll(withoutAskUserQuestion, [
    ["{{PREAMBLE}}", buildGeneratedHeader("review", SOURCE_FILES.reviewTemplate, sourceCommit)],
    ["{{BASE_BRANCH_DETECT}}", "Use the GitHub event payload, checked-out refs, and repository default branch to determine the review base branch."],
    ["{{PLAN_COMPLETION_AUDIT_REVIEW}}", "If planning artifacts are unavailable, treat the issue body, pull request body, and commit history as the stated intent and continue."],
    ["{{LEARNINGS_SEARCH}}", "Search repository-local state and issue context first before making review recommendations."],
    ["{{CONFIDENCE_CALIBRATION}}", "Use the same confidence bar, but report through GitHub comments and persisted state files rather than local CLI prompts."],
    ["{{DESIGN_REVIEW_LITE}}", "If frontend files changed, use `.github-gstack-intelligence/skills/references/review-design-checklist.md` as the design-review-lite source."],
    ["{{TEST_COVERAGE_AUDIT_REVIEW}}", "Use the checked-out repository diff and existing tests to reason about coverage; persist only the final GitHub-native findings."],
    ["{{ADVERSARIAL_STEP}}", "Before finalizing findings, do one adversarial pass that tries to disprove each claim using the checked-out code and current GitHub context."],
    ["{{LEARNINGS_LOG}}", "Persist durable review outcomes in `.github-gstack-intelligence/state/results/review/` when the lifecycle layer is ready to store them."],
    ["Read `.claude/skills/review/checklist.md`.", "Read `.github-gstack-intelligence/skills/references/review-checklist.md`."],
    ["use individual AskUserQuestion calls instead of batching.", "use individual GitHub follow-up comments instead of batching."],
    ["AskUserQuestion", "GitHub follow-up comment"],
    ["~/.claude/skills/gstack/bin/gstack-review-log", ".github-gstack-intelligence/state/results/review/review-log.json"],
  ]);

  const withGreptileNote = withDirectReplacements.replace(
    /## Step 2\.5: Check for Greptile review comments[\s\S]*?## Step 3: Get the diff/,
    [
      "## Step 2.5: Check for GitHub review signals",
      "",
      "If the repository has existing review comments or automation findings, treat them as supplemental inputs.",
      "Skip silently when none are available. The extracted skill must remain runnable without local Greptile integration.",
      "",
      "## Step 3: Get the diff",
    ].join("\n"),
  );

  assertNoTemplateTokens("review", withGreptileNote);
  return withGreptileNote;
}

function adaptCsoSkill(template: string, sourceCommit: string | null): string {
  const withoutAskUserQuestion = removeAskUserQuestionFromFrontmatter(template);
  const adapted = replaceAll(withoutAskUserQuestion, [
    ["{{PREAMBLE}}", buildGeneratedHeader("cso", SOURCE_FILES.csoTemplate, sourceCommit)],
    ["{{CONFIDENCE_CALIBRATION}}", "Use the same confidence-gated reporting thresholds, but publish the final posture report through GitHub comments and repository-local state instead of local CLI interactions."],
    ["AskUserQuestion", "GitHub follow-up comment"],
    ['"Phase 8 can scan your globally installed AI coding agent skills and hooks for malicious patterns. This reads files outside the repo. Want to include this?"', '"Phase 8 can scan globally installed AI coding agent skills and hooks for malicious patterns. Post a GitHub follow-up comment asking for approval before reading files outside the repo."'],
  ]);

  assertNoTemplateTokens("cso", adapted);
  return adapted;
}

/**
 * Common template token replacements used for CI-adapted skill extraction.
 * These map local-execution template variables to GitHub-native equivalents.
 */
const COMMON_TOKEN_REPLACEMENTS: Array<[string, string]> = [
  // Branch detection
  ["{{BASE_BRANCH_DETECT}}", "Use the GitHub event payload, checked-out refs, and repository default branch to determine the review base branch."],

  // Browse and local tooling
  ["{{BROWSE_SETUP}}", "Use Playwright for browser automation. Launch a fresh Chromium instance per workflow run with `npx playwright install chromium`. Replace `$B <command>` patterns with Playwright API calls (`page.goto()`, `page.screenshot()`, `page.evaluate()`, etc.). Browser state does not persist between workflow runs."],

  // Confidence and learnings
  ["{{CONFIDENCE_CALIBRATION}}", "Use the same confidence-gated reporting thresholds, but publish findings through GitHub comments and repository-local state instead of local CLI interactions."],
  ["{{LEARNINGS_SEARCH}}", "Search repository-local state and issue context first before making recommendations."],
  ["{{LEARNINGS_LOG}}", "Persist durable outcomes in `.github-gstack-intelligence/state/results/` when the lifecycle layer is ready to store them."],

  // Review-adjacent
  ["{{ADVERSARIAL_STEP}}", "Before finalizing findings, do one adversarial pass that tries to disprove each claim using the checked-out code and current GitHub context."],
  ["{{DESIGN_REVIEW_LITE}}", "If frontend files changed, use `.github-gstack-intelligence/skills/references/review-design-checklist.md` as the design-review-lite source."],
  ["{{REVIEW_DASHBOARD}}", "Check for prior review results in `.github-gstack-intelligence/state/results/` and GitHub PR review status."],

  // Test-related
  ["{{TEST_BOOTSTRAP}}", "Use the repository's existing test infrastructure. If no test framework is detected, note it in the output and continue."],
  ["{{TEST_FAILURE_TRIAGE}}", "Triage test failures by checking whether they are pre-existing (present on the base branch) or introduced by the current changes. Pre-existing failures should be noted but not block the workflow."],
  ["{{TEST_COVERAGE_AUDIT_SHIP}}", "Use the checked-out repository diff and existing tests to reason about coverage; persist only the final GitHub-native findings."],
  ["{{TEST_COVERAGE_AUDIT_REVIEW}}", "Use the checked-out repository diff and existing tests to reason about coverage; persist only the final GitHub-native findings."],
  ["{{TEST_COVERAGE_AUDIT_PLAN}}", "Review the plan's test coverage approach. Identify gaps in edge case handling, error paths, and integration boundaries. Use repository-local test patterns as reference."],

  // Plan-related
  ["{{PLAN_COMPLETION_AUDIT_REVIEW}}", "If planning artifacts are unavailable, treat the issue body, pull request body, and commit history as the stated intent and continue."],
  ["{{PLAN_COMPLETION_AUDIT_SHIP}}", "Check whether the implementation matches the stated plan. If no plan artifact exists, use the PR body and issue context as the plan reference."],
  ["{{PLAN_VERIFICATION_EXEC}}", "Verify that the implementation matches the stated plan by comparing the diff against any plan artifacts, issue descriptions, or PR bodies."],

  // Ship-specific
  ["{{SCOPE_DRIFT}}", "Monitor for scope drift by comparing the current diff against the original plan or PR description. Flag changes that extend beyond the stated scope."],
  ["{{CHANGELOG_WORKFLOW}}", "Generate CHANGELOG entries from the diff and commit history. Use the repository's existing CHANGELOG format if one exists."],
  ["{{CO_AUTHOR_TRAILER}}", "Co-authored-by: github-gstack-intelligence[bot] <github-gstack-intelligence[bot]@users.noreply.github.com>"],

  // QA-specific
  ["{{QA_METHODOLOGY}}", "Follow the standard QA methodology: navigate pages, test interactions, check console errors, verify responsive layouts, test forms and validation, and document all findings with screenshots and reproduction steps."],

  // Slug (local project identification)
  ["{{SLUG_EVAL}}", 'SLUG=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")'],
  ["{{SLUG_SETUP}}", 'SLUG=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")\nmkdir -p .github-gstack-intelligence/state/results'],

  // Design-specific
  ["{{DESIGN_SETUP}}", "Design mockup generation is not available in CI mode. Visual design decisions should be documented in DESIGN.md and reviewed through screenshots and Playwright-captured visual evidence."],
  ["{{DESIGN_METHODOLOGY}}", "Audit the live site for visual consistency, spacing, hierarchy, and design system adherence. Capture screenshots at multiple viewports. Compare against DESIGN.md if it exists."],
  ["{{DESIGN_HARD_RULES}}", "AI slop blacklist: reject generic card grids, centered hero sections with stock photos, 3-column feature layouts, gradient buttons with drop shadows, and any pattern that looks like every other AI-generated site."],
  ["{{DESIGN_OUTSIDE_VOICES}}", "Cross-reference design findings against industry standards and the project's stated design system. Surface conflicting recommendations for user resolution."],
  ["{{DESIGN_SHOTGUN_LOOP}}", "Generate design variants sequentially in CI mode. Present comparison boards for human review through GitHub comments or issue attachments."],

  // Snapshot/command reference (root skill)
  ["{{SNAPSHOT_FLAGS}}", "Snapshot system is replaced by Playwright's accessibility tree (`page.accessibility.snapshot()`) and screenshot capabilities in CI mode."],
  ["{{COMMAND_REFERENCE}}", "Browse command reference is replaced by Playwright API in CI mode. Use `page.goto()`, `page.screenshot()`, `page.evaluate()`, `page.click()`, `page.fill()`, `page.locator()`, and `page.waitForSelector()` for equivalent functionality."],

  // Benefits-from and outside tooling
  ["{{BENEFITS_FROM}}", "Check for prior skill outputs in `.github-gstack-intelligence/state/results/` that may provide useful context for this skill execution."],
  ["{{CODEX_PLAN_REVIEW}}", "Multi-model second-opinion review is not available in CI mode. Use the repository's existing review signals (PR reviews, automated checks) as supplementary inputs."],
];

/**
 * Common local path replacements for CI-adapted skill extraction.
 */
const LOCAL_PATH_REPLACEMENTS: Array<[string, string]> = [
  ["Read `.claude/skills/review/checklist.md`.", "Read `.github-gstack-intelligence/skills/references/review-checklist.md`."],
  ["~/.claude/skills/gstack/bin/gstack-review-log", ".github-gstack-intelligence/state/results/review/review-log.json"],
  ["~/.claude/skills/gstack/bin/gstack-slug", 'basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"'],
  ["~/.claude/skills/gstack/browse/bin/remote-slug", 'basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"'],
  ["~/.claude/skills/gstack/bin/gstack-diff-scope", "git diff --name-only"],
  ["~/.claude/skills/gstack/bin/gstack-config", ".github-gstack-intelligence/config.json"],
  ["~/.claude/skills/gstack/", ".github-gstack-intelligence/skills/"],
  ["~/.claude/skills/review/", ".github-gstack-intelligence/skills/references/"],
  ["~/.claude/skills/", ".github-gstack-intelligence/skills/"],
  ["~/.gstack/projects/", ".github-gstack-intelligence/state/results/"],
  ["~/.gstack/", ".github-gstack-intelligence/state/"],
  [".gstack/", ".github-gstack-intelligence/state/local/"],
  ["gstack-config set ", "# gstack-config is not available in CI mode: "],
  ["gstack-config", ".github-gstack-intelligence/config.json"],
];

function adaptGenericSkill(skillName: string, template: string, sourcePath: string, sourceCommit: string | null): string {
  let adapted = removeAskUserQuestionFromFrontmatter(template);

  adapted = adapted.replaceAll("{{PREAMBLE}}", buildGeneratedHeader(skillName, sourcePath, sourceCommit));

  adapted = replaceAll(adapted, COMMON_TOKEN_REPLACEMENTS);

  adapted = replaceAll(adapted, LOCAL_PATH_REPLACEMENTS);

  adapted = replaceAll(adapted, [
    ["use individual AskUserQuestion calls instead of batching.", "use individual GitHub follow-up comments instead of batching."],
    ["AskUserQuestion", "GitHub follow-up comment"],
  ]);

  adapted = adapted.replace(/\{\{[A-Z][A-Z0-9_]*\}\}/g, (token) =>
    `<!-- CI-ADAPTED: ${token} expansion is omitted. Implement the GitHub-native replacement in the lifecycle layer when this skill is activated. -->`,
  );

  return adapted;
}

async function main() {
  const sourceCommit = await fetchSourceCommit();
  const generatedAt = new Date().toISOString();
  const sourceMarker = sourceCommit ?? `ref ${sourceRef}`;

  console.log(`Refreshing gstack resources from ${sourceRepo} (${sourceMarker})`);

  const fetched = Object.fromEntries(
    await Promise.all(
      Object.entries(SOURCE_FILES).map(async ([key, path]) => [key, await fetchText(path)] as const),
    ),
  );

  ensureDir(skillsDir);
  ensureDir(referencesDir);

  const managedOutputs = [
    // Foundational documents (imported as-is with header)
    {
      path: "ETHOS.md",
      content: wrapImportedMarkdown(fetched.ethos, SOURCE_FILES.ethos, sourceCommit),
    },
    {
      path: "skills/references/gstack-architecture.md",
      content: wrapImportedMarkdown(fetched.architecture, SOURCE_FILES.architecture, sourceCommit),
    },
    {
      path: "skills/references/gstack-agents.md",
      content: wrapImportedMarkdown(fetched.agents, SOURCE_FILES.agents, sourceCommit),
    },
    {
      path: "skills/references/gstack-root-skill.md",
      content: adaptGenericSkill("gstack", fetched.rootSkillTemplate, SOURCE_FILES.rootSkillTemplate, sourceCommit),
    },

    // Review skill + supplementary references
    {
      path: "skills/references/review-checklist.md",
      content: wrapImportedMarkdown(fetched.reviewChecklist, SOURCE_FILES.reviewChecklist, sourceCommit),
    },
    {
      path: "skills/references/review-design-checklist.md",
      content: wrapImportedMarkdown(fetched.reviewDesignChecklist, SOURCE_FILES.reviewDesignChecklist, sourceCommit),
    },
    {
      path: "skills/references/review-todos-format.md",
      content: wrapImportedMarkdown(fetched.reviewTodosFormat, SOURCE_FILES.reviewTodosFormat, sourceCommit),
    },
    {
      path: "skills/references/review-greptile-triage.md",
      content: wrapImportedMarkdown(fetched.reviewGreptileTriage, SOURCE_FILES.reviewGreptileTriage, sourceCommit),
    },

    // CSO skill + references
    {
      path: "skills/references/cso-acknowledgements.md",
      content: wrapImportedMarkdown(fetched.csoAcknowledgements, SOURCE_FILES.csoAcknowledgements, sourceCommit),
    },

    // QA supplementary references
    {
      path: "skills/references/qa-issue-taxonomy.md",
      content: wrapImportedMarkdown(fetched.qaIssueTaxonomy, SOURCE_FILES.qaIssueTaxonomy, sourceCommit),
    },
    {
      path: "skills/references/qa-report-template.md",
      content: wrapImportedMarkdown(fetched.qaReportTemplate, SOURCE_FILES.qaReportTemplate, sourceCommit),
    },

    // Adapted skill prompts — review and cso use specialized adapters
    {
      path: "skills/review.md",
      content: adaptReviewSkill(fetched.reviewTemplate, sourceCommit),
    },
    {
      path: "skills/cso.md",
      content: adaptCsoSkill(fetched.csoTemplate, sourceCommit),
    },

    // Tier 1 skills (event-driven)
    {
      path: "skills/ship.md",
      content: adaptGenericSkill("ship", fetched.shipTemplate, SOURCE_FILES.shipTemplate, sourceCommit),
    },
    {
      path: "skills/benchmark.md",
      content: adaptGenericSkill("benchmark", fetched.benchmarkTemplate, SOURCE_FILES.benchmarkTemplate, sourceCommit),
    },
    {
      path: "skills/retro.md",
      content: adaptGenericSkill("retro", fetched.retroTemplate, SOURCE_FILES.retroTemplate, sourceCommit),
    },
    {
      path: "skills/document-release.md",
      content: adaptGenericSkill("document-release", fetched.documentReleaseTemplate, SOURCE_FILES.documentReleaseTemplate, sourceCommit),
    },

    // Tier 2 skills (brief input)
    {
      path: "skills/qa.md",
      content: adaptGenericSkill("qa", fetched.qaTemplate, SOURCE_FILES.qaTemplate, sourceCommit),
    },
    {
      path: "skills/qa-only.md",
      content: adaptGenericSkill("qa-only", fetched.qaOnlyTemplate, SOURCE_FILES.qaOnlyTemplate, sourceCommit),
    },
    {
      path: "skills/design-review.md",
      content: adaptGenericSkill("design-review", fetched.designReviewTemplate, SOURCE_FILES.designReviewTemplate, sourceCommit),
    },
    {
      path: "skills/plan-design-review.md",
      content: adaptGenericSkill("plan-design-review", fetched.planDesignReviewTemplate, SOURCE_FILES.planDesignReviewTemplate, sourceCommit),
    },
    {
      path: "skills/investigate.md",
      content: adaptGenericSkill("investigate", fetched.investigateTemplate, SOURCE_FILES.investigateTemplate, sourceCommit),
    },
    {
      path: "skills/canary.md",
      content: adaptGenericSkill("canary", fetched.canaryTemplate, SOURCE_FILES.canaryTemplate, sourceCommit),
    },

    // Tier 3 skills (multi-turn)
    {
      path: "skills/office-hours.md",
      content: adaptGenericSkill("office-hours", fetched.officeHoursTemplate, SOURCE_FILES.officeHoursTemplate, sourceCommit),
    },
    {
      path: "skills/plan-ceo-review.md",
      content: adaptGenericSkill("plan-ceo-review", fetched.planCeoReviewTemplate, SOURCE_FILES.planCeoReviewTemplate, sourceCommit),
    },
    {
      path: "skills/plan-eng-review.md",
      content: adaptGenericSkill("plan-eng-review", fetched.planEngReviewTemplate, SOURCE_FILES.planEngReviewTemplate, sourceCommit),
    },
    {
      path: "skills/design-consultation.md",
      content: adaptGenericSkill("design-consultation", fetched.designConsultationTemplate, SOURCE_FILES.designConsultationTemplate, sourceCommit),
    },
    {
      path: "skills/autoplan.md",
      content: adaptGenericSkill("autoplan", fetched.autoplanTemplate, SOURCE_FILES.autoplanTemplate, sourceCommit),
    },
  ] as const;
  const outputPaths = managedOutputs.map((output) => output.path);

  removeStaleOutputs(readPreviousOutputs(), outputPaths);

  for (const output of managedOutputs) {
    writeFile(resolveManagedOutput(output.path), output.content);
  }

  assertOutputsExist(outputPaths);

  writeFile(
    sourceMetadataPath,
    JSON.stringify(
      {
        extractedAt: generatedAt,
        source: {
          repo: sourceRepo,
          ref: sourceRef,
          commit: sourceCommit,
        },
        inputs: Object.values(SOURCE_FILES),
        outputs: outputPaths,
      },
      null,
      2,
    ),
  );

  console.log("Refresh complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
