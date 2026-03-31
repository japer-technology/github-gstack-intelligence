/**
 * agent.ts — Core agent orchestrator for GStack Intelligence.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the main entry point for the GStack Intelligence AI coding agent.  It receives
 * a GitHub issue (or issue comment) event, runs the `pi` AI agent against the
 * user's prompt, and posts the result back as an issue comment.  It also
 * manages all session state so that multi-turn conversations across multiple
 * workflow runs are seamlessly resumed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LIFECYCLE POSITION
 * ─────────────────────────────────────────────────────────────────────────────
 * Workflow step order:
 *   1. Authorize   (inline shell)            — auth check + add 🚀 reaction indicator
 *   2. Install     (bun install)            — install npm/bun dependencies
 *   3. Run         (agent.ts)               ← YOU ARE HERE
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AGENT EXECUTION PIPELINE
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Fetch issue title/body from GitHub via the `gh` CLI.
 *   2. Resolve (or create) a conversation session for this issue number.
 *      - New issue  → create a fresh session; record the mapping in state/.
 *      - Follow-up  → load the existing session file for conversation context.
 *   3. Build a prompt string from the event payload.
 *   4. Run the `pi` coding agent binary with the prompt (+ prior session if resuming).
 *      Agent output is streamed through `tee` to provide a live Actions log AND
 *      persist the raw JSONL to `/tmp/agent-raw.jsonl` for post-processing.
 *   5. Extract the assistant's final text reply from the JSONL output using
 *      `tac` (reverse) + `jq` (parse the last `message_end` event).
 *   6. Persist the issue → session mapping so the next run can resume the conversation.
 *   7. Stage, commit, and push all changes (session log, mapping, repo edits)
 *      back to the default branch with an automatic retry-on-conflict loop.
 *   8. Post the extracted reply as a new comment on the originating issue.
 *   9. [finally] Add an outcome reaction: 👍 (thumbs up) on success or
 *      👎 (thumbs down) on error.  The 🚀 rocket from the Authorize step
 *      is left in place for both success and error cases.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SESSION CONTINUITY
 * ─────────────────────────────────────────────────────────────────────────────
 * GStack Intelligence maintains per-issue session state in:
 *   .github-gstack-intelligence/state/issues/<number>.json   — maps issue # → session file path
 *   .github-gstack-intelligence/state/sessions/<timestamp>.jsonl — the `pi` session transcript
 *
 * On every run the agent checks for an existing mapping.  If the mapped session
 * file is still present, the run "resumes" by passing `--session <path>` to `pi`,
 * giving the agent full memory of all prior exchanges for that issue.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PUSH CONFLICT RESOLUTION
 * ─────────────────────────────────────────────────────────────────────────────
 * Multiple agents may race to push to the same branch.  To handle this gracefully
 * the script retries a failed `git push` up to 10 times with increasing backoff
 * delays, pulling with `--rebase -X theirs` between attempts.  If all attempts
 * fail, the run throws a clear error.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * GITHUB COMMENT SIZE LIMIT
 * ─────────────────────────────────────────────────────────────────────────────
 * GitHub enforces a ~65 535 character limit on issue comments.  The agent reply
 * is capped at 60 000 characters to leave a comfortable safety margin.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEPENDENCIES
 * ─────────────────────────────────────────────────────────────────────────────
 * - Node.js built-in `fs` module  (existsSync, readFileSync, writeFileSync, mkdirSync)
 * - Node.js built-in `path` module (resolve)
 * - GitHub CLI (`gh`)             — must be authenticated via GITHUB_TOKEN
 * - `pi` binary                   — installed by `bun install` from package.json
 * - System tools: `tee`, `tac`, `jq`, `git`, `bash`
 * - Bun runtime                   — for Bun.spawn and top-level await
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { route, loadConfig, AGENT_SIGNATURE, type RouteResult } from "./router";

// ─── Paths and event context ───────────────────────────────────────────────────
// `import.meta.dir` resolves to `.github-gstack-intelligence/lifecycle/`; stepping up one level
// gives us the `.github-gstack-intelligence/` directory which contains `state/` and `node_modules/`.
const minimumIntelligenceDir = resolve(import.meta.dir, "..");
const stateDir = resolve(minimumIntelligenceDir, "state");
const issuesDir = resolve(stateDir, "issues");
const sessionsDir = resolve(stateDir, "sessions");
const piSettingsPath = resolve(minimumIntelligenceDir, ".pi", "settings.json");

// The `pi` CLI requires a repo-root-relative path for `--session-dir`, not an
// absolute one, so we keep this as a relative string constant.
const sessionsDirRelative = ".github-gstack-intelligence/state/sessions";

// GitHub enforces a ~65 535 character limit on issue comments; cap at 60 000
// characters to leave a comfortable safety margin and avoid API rejections.
const MAX_COMMENT_LENGTH = 60000;

// Leading characters that indicate a message is intended for a different AI agent.
// When the first character of an issue title or comment body is in this set, GMI
// exits silently so that the designated agent can react instead.
const RESERVED_PREFIXES = new Set(["`", "~", "@", "#", "$", "%", "^", ":", ";", "|", "=", "/", "\\", "&"]);

// ─── Route mode ────────────────────────────────────────────────────────────────
// When `--route` is passed, the agent consults router.ts to determine which
// skill to execute based on the event type, slash commands, and labels.
// Without `--route`, all events go through general conversation (legacy behavior).
const isRouteMode = process.argv.includes("--route");

// Parse the full GitHub Actions event payload (contains issue/comment details).
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!, "utf-8"));

// "issues" for new issues, "issue_comment" for replies on existing issues,
// "pull_request" for PR opened/synchronized events.
const eventName = process.env.GITHUB_EVENT_NAME!;

// Whether this event is a pull_request event (PR review, not an issue).
const isPullRequest = eventName === "pull_request";

// "owner/repo" format — used when calling the GitHub REST API via `gh api`.
const repo = process.env.GITHUB_REPOSITORY!;

// Fall back to "main" if the repository's default branch is not set in the event.
const defaultBranch = event.repository?.default_branch ?? "main";

// The target number is the issue number for issue events, or the PR number for
// pull_request events. In GitHub, PRs are also issues, so the number can be used
// with both issue and PR API endpoints.
const targetNumber: number = isPullRequest
  ? event.pull_request.number
  : event.issue.number;

// Read the committed `.pi` defaults and pass them explicitly to the runtime.
// This prevents provider/model drift from host-level config (for example a
// runner image with a global `~/.pi/settings.json` set to github-copilot).
const piSettings = JSON.parse(readFileSync(piSettingsPath, "utf-8"));
const configuredProvider: string = piSettings.defaultProvider;
const configuredModel: string = piSettings.defaultModel;
const configuredThinking: string | undefined = piSettings.defaultThinkingLevel;

if (!configuredProvider || !configuredModel) {
  throw new Error(
    `Invalid .pi settings at ${piSettingsPath}: expected defaultProvider and defaultModel`
  );
}

// Catch whitespace-only or obviously malformed model identifiers early so the
// pi agent doesn't start up only to fail with an opaque API error.
if (configuredModel.trim() !== configuredModel || /\s/.test(configuredModel)) {
  throw new Error(
    `Invalid model identifier "${configuredModel}" in ${piSettingsPath}: ` +
    `model IDs must not contain whitespace. ` +
    `Update the "defaultModel" field in .pi/settings.json to a valid model ID for the "${configuredProvider}" provider.`
  );
}

console.log(`Configured provider: ${configuredProvider}, model: ${configuredModel}${configuredThinking ? `, thinking: ${configuredThinking}` : ""}`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Spawn an arbitrary subprocess, capture its stdout, and return both the
 * trimmed output and the process exit code.
 *
 * @param cmd  - Command and arguments array (e.g. ["git", "push", "origin", "main"]).
 * @param opts - Optional options; `stdin` can be piped from another process.
 * @returns    - `{ exitCode, stdout }` after the process has exited.
 */
async function run(cmd: string[], opts?: { stdin?: any }): Promise<{ exitCode: number; stdout: string }> {
  const proc = Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "inherit",   // surface errors directly in the Actions log
    stdin: opts?.stdin,
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { exitCode, stdout: stdout.trim() };
}

/**
 * Convenience wrapper: run `gh <args>` and return trimmed stdout.
 * Uses the `run` helper above so that `gh` errors appear in the Actions log.
 * Throws on non-zero exit codes to fail fast on API errors.
 */
async function gh(...args: string[]): Promise<string> {
  const { exitCode, stdout } = await run(["gh", ...args]);
  if (exitCode !== 0) {
    throw new Error(`gh ${args[0]} failed with exit code ${exitCode}`);
  }
  return stdout;
}


async function main() {
  // ─── Restore reaction state from Authorize step ─────────────────────
  // The Authorize step writes the 🚀 reaction metadata to
  // `/tmp/reaction-state.json`.  We read it here so the `finally` block can
  // add the outcome reaction (👍 or 👎) when the agent finishes.
  // If the file is absent (e.g., authorization was skipped), we default to null.
  let reactionState: any = null;
  if (existsSync("/tmp/reaction-state.json")) {
    try {
      reactionState = JSON.parse(readFileSync("/tmp/reaction-state.json", "utf-8"));
    } catch {
      console.warn("Could not parse /tmp/reaction-state.json, skipping reaction state");
    }
  }

  // Track whether the agent completed successfully so the `finally` block can
  // add the correct outcome reaction (👍 on success, 👎 on error).
  let succeeded = false;

  try {
    // ── Read title and body from the event payload ───────────────────────────────
    // For pull_request events, use the PR title and body.
    // For issue events, use the issue title and body from the webhook payload.
    // GitHub truncates string fields at 65 536 characters in webhook payloads, so
    // we fall back to the API only when the body hits that limit.
    let title: string;
    let body: string;
    if (isPullRequest) {
      title = event.pull_request.title ?? "";
      body = event.pull_request.body ?? "";
    } else {
      title = event.issue.title ?? "";
      body = event.issue.body ?? "";
      if (body.length >= 65536) {
        body = await gh("issue", "view", String(targetNumber), "--json", "body", "--jq", ".body");
      }
    }

    // ── Resolve or create session mapping ───────────────────────────────────────
    // Each issue maps to exactly one `pi` session file via `state/issues/<n>.json`.
    // If a mapping exists AND the referenced session file is still present, we resume
    // the conversation by passing `--session <path>` to `pi`.  Otherwise we start fresh.
    // For pull_request events, session continuity is not needed — each review is
    // a one-shot operation that starts fresh.
    mkdirSync(issuesDir, { recursive: true });
    mkdirSync(sessionsDir, { recursive: true });

    let mode = "new";
    let sessionPath = "";
    const mappingFile = isPullRequest ? "" : resolve(issuesDir, `${targetNumber}.json`);

    if (!isPullRequest && existsSync(mappingFile)) {
      try {
        const mapping = JSON.parse(readFileSync(mappingFile, "utf-8"));
        if (existsSync(mapping.sessionPath)) {
          // A prior session exists — resume it to preserve conversation context.
          mode = "resume";
          sessionPath = mapping.sessionPath;
          console.log(`Found existing session: ${sessionPath}`);
        } else {
          // The mapping points to a session file that no longer exists (e.g., cleaned up).
          console.log("Mapped session file missing, starting fresh");
        }
      } catch {
        console.warn(`Could not parse ${mappingFile}, starting fresh`);
      }
    } else {
      console.log("No session mapping found, starting fresh");
    }

    // ── Configure git identity ───────────────────────────────────────────────────
    // Set the bot identity for all git commits made during this run.
    await run(["git", "config", "user.name", "github-gstack-intelligence[bot]"]);
    await run(["git", "config", "user.email", "github-gstack-intelligence[bot]@users.noreply.github.com"]);

    // ── Build prompt from event context ─────────────────────────────────────────
    // For `issue_comment` events, use the new comment body as the full prompt so
    // that follow-up instructions reach the agent verbatim.
    // For `issues` (opened) events, combine the title and body for full context.
    let prompt: string;
    if (eventName === "issue_comment") {
      prompt = event.comment.body ?? "";
    } else {
      prompt = `${title}\n\n${body}`;
    }

    // ── Skill routing (--route mode) ────────────────────────────────────────────
    // When --route is active, consult the router to determine which skill to
    // execute. If a route matches, load the skill prompt and inject context.
    // If no route matches, fall through to general conversation.
    let routeResult: RouteResult | null = null;
    if (isRouteMode) {
      try {
        const config = loadConfig(minimumIntelligenceDir);
        routeResult = route(event, eventName, config);

        if (routeResult) {
          // Load the skill prompt file.
          const skillPath = resolve(minimumIntelligenceDir, "skills", `${routeResult.skill}.md`);
          if (existsSync(skillPath)) {
            const skillPrompt = readFileSync(skillPath, "utf-8");

            // Build context lines for the prompt.
            const contextParts: string[] = [];
            if (routeResult.context.prNumber) {
              contextParts.push(`PR: #${routeResult.context.prNumber}`);
            }
            if (routeResult.context.issueNumber) {
              contextParts.push(`Issue: #${routeResult.context.issueNumber}`);
            }
            if (routeResult.context.url) {
              contextParts.push(`URL: ${routeResult.context.url}`);
            }
            if (routeResult.context.branch) {
              contextParts.push(`Branch: ${routeResult.context.branch}`);
            }
            if (routeResult.context.diffStat) {
              contextParts.push(`Diff: ${routeResult.context.diffStat}`);
            }
            const contextStr = contextParts.length > 0
              ? `\n\nContext:\n${contextParts.join("\n")}`
              : "";

            // Include the original user message after the skill prompt.
            const userMessage = eventName === "issue_comment"
              ? (event.comment?.body ?? "")
              : `${title}\n\n${body}`;

            prompt = `${skillPrompt}${contextStr}\n\n---\n\nUser message:\n${userMessage}`;
            console.log(`Skill prompt loaded: ${routeResult.skill} (${skillPath})`);
          } else {
            console.warn(`Skill file not found: ${skillPath}, falling back to general conversation`);
            routeResult = null;
          }
        } else if (eventName !== "issues" && eventName !== "issue_comment") {
          // Non-conversation event with no matching route — exit cleanly.
          console.log("No route matched for non-conversation event, exiting cleanly");
          succeeded = true;
          return;
        }
      } catch (e) {
        console.warn(`Router error: ${e}. Falling back to general conversation.`);
        routeResult = null;
      }
    }

    // ── Skip reserved-prefix messages for other AI agents ───────────────────────
    // Certain leading characters signal that this message is intended for another
    // AI agent.  If the issue title (for new issues) or comment body (for comments)
    // starts with any of these characters, exit cleanly without responding so that
    // the designated agent can react instead.
    // When a route matched a slash command, skip this check — the router already
    // interpreted the `/` prefix as a skill command.
    if (!routeResult) {
      const textToCheck = eventName === "issue_comment" ? event.comment.body : title;
      if (textToCheck && RESERVED_PREFIXES.has(textToCheck[0])) {
        console.log(`Skipping: first character "${textToCheck[0]}" is a reserved prefix for another agent.`);
        succeeded = true;
        return;
      }
    }

    // ── Validate provider API key ────────────────────────────────────────────────
    // This check is inside the try block so that the finally clause always runs
    // (adding the outcome reaction) and a helpful comment can be posted to the issue.
    const providerKeyMap: Record<string, string> = {
      anthropic: "ANTHROPIC_API_KEY",
      openai: "OPENAI_API_KEY",
      google: "GEMINI_API_KEY",
      xai: "XAI_API_KEY",
      openrouter: "OPENROUTER_API_KEY",
      mistral: "MISTRAL_API_KEY",
      groq: "GROQ_API_KEY",
    };
    const requiredKeyName = providerKeyMap[configuredProvider];
    if (requiredKeyName && !process.env[requiredKeyName]) {
      await gh(
        "issue", "comment", String(targetNumber),
        "--body",
        `## ⚠️ Missing API Key: \`${requiredKeyName}\`\n\n` +
        `The configured provider is \`${configuredProvider}\`, but the \`${requiredKeyName}\` secret is not available to this workflow run.\n\n` +
        `### How to fix\n\n` +
        `**Option A — Repository secret** _(simplest)_\n` +
        `1. Go to **Settings → Secrets and variables → Actions → New repository secret**\n` +
        `2. Name: \`${requiredKeyName}\`, Value: your API key\n\n` +
        `**Option B — Organization secret** _(already have one?)_\n` +
        `Organization secrets are only available to workflows if the secret has been explicitly granted to this repository:\n` +
        `1. Go to your **Organization Settings → Secrets and variables → Actions**\n` +
        `2. Click the \`${requiredKeyName}\` secret → **Repository access**\n` +
        `3. Add **this repository** to the selected repositories list\n\n` +
        `Once the secret is accessible, re-trigger this workflow by posting a new comment on this issue.`
      );
      throw new Error(
        `${requiredKeyName} is not available to this workflow run. ` +
        `If you have set it as a repository secret, verify the secret name matches exactly. ` +
        `If you have set it as an organization secret, ensure this repository has been granted access ` +
        `(Organization Settings → Secrets and variables → Actions → ${requiredKeyName} → Repository access).`
      );
    }

    // ── Run the pi agent ─────────────────────────────────────────────────────────
    // Pipe agent output through `tee` so we get:
    //   • a live stream to stdout (visible in the Actions log in real time), and
    //   • a persisted copy at `/tmp/agent-raw.jsonl` for post-processing below.
    const piBin = resolve(minimumIntelligenceDir, "node_modules", ".bin", "pi");
    const piArgs = [
      piBin,
      "--mode",
      "json",
      "--provider",
      configuredProvider,
      "--model",
      configuredModel,
      ...(configuredThinking ? ["--thinking", configuredThinking] : []),
      "--session-dir",
      sessionsDirRelative,
      "-p",
      prompt,
    ];
    if (mode === "resume" && sessionPath) {
      // Pass the prior session transcript so the agent can recall earlier context.
      piArgs.push("--session", sessionPath);
    }

    const pi = Bun.spawn(piArgs, { stdout: "pipe", stderr: "inherit" });
    const tee = Bun.spawn(["tee", "/tmp/agent-raw.jsonl"], { stdin: pi.stdout, stdout: "inherit" });
    await tee.exited;

    // Check if the pi agent exited successfully.
    const piExitCode = await pi.exited;
    if (piExitCode !== 0) {
      // Surface the provider/model in the error so that an invalid or
      // misspelled model ID doesn't fail silently — the most common cause of
      // unexpected non-zero exits from the pi agent is an unrecognised model.
      throw new Error(
        `pi agent exited with code ${piExitCode} (provider: ${configuredProvider}, model: ${configuredModel}). ` +
        `This may indicate an invalid or misspelled model ID in .pi/settings.json. ` +
        `Check the workflow logs above for details.`
      );
    }

    // ── Extract final assistant text ─────────────────────────────────────────────
    // The `pi` agent writes newline-delimited JSON events.  We reverse the file
    // with `tac` so the most recent events appear first in the `jq` array.  We
    // then search for the most recent `message_end` where the role is `assistant`
    // AND the content contains at least one `text` block.  This correctly handles
    // cases where the final event has empty content (e.g., a 400 API error after
    // a successful tool call) by falling back to an earlier assistant message.
    const tac = Bun.spawn(["tac", "/tmp/agent-raw.jsonl"], { stdout: "pipe" });
    const jq = Bun.spawn(
      ["jq", "-r", "-s", '[ .[] | select(.type == "message_end" and .message.role == "assistant") | select((.message.content // []) | map(select(.type == "text")) | length > 0) ] | .[0].message.content[] | select(.type == "text") | .text'],
      { stdin: tac.stdout, stdout: "pipe" }
    );
    const agentText = await new Response(jq.stdout).text();
    await jq.exited;

    // ── Determine latest session file ────────────────────────────────────────────
    // After the agent run, the newest `.jsonl` file in the sessions directory is
    // the session transcript that was just written (or extended).
    const { stdout: latestSession } = await run([
      "bash", "-c", `ls -t ${sessionsDirRelative}/*.jsonl 2>/dev/null | head -1`,
    ]);

    // ── Persist issue → session mapping ─────────────────────────────────────────
    // Write (or overwrite) the mapping file so that the next run for this issue
    // can locate the correct session transcript and resume the conversation.
    // For pull_request events, session mapping is skipped — each review is one-shot.
    if (latestSession && !isPullRequest) {
      writeFileSync(
        mappingFile,
        JSON.stringify({
          issueNumber: targetNumber,
          sessionPath: latestSession,
          updatedAt: new Date().toISOString(),
        }, null, 2) + "\n"
      );
      console.log(`Saved mapping: issue #${targetNumber} -> ${latestSession}`);
    } else if (!latestSession && !isPullRequest) {
      console.log("Warning: no session file found to map");
    }

    // ── Persist review/security results ──────────────────────────────────────────
    // Write a structured result file for review and CSO skills so downstream skills
    // (e.g. /ship) can verify that a review has been completed.
    if (routeResult && (routeResult.skill === "review" || routeResult.skill === "cso")) {
      const resultSubdir = routeResult.skill === "cso" ? "security" : routeResult.skill;
      const resultDir = resolve(stateDir, "results", resultSubdir);
      mkdirSync(resultDir, { recursive: true });

      // For review/CSO skills routed from PR events, prNumber is always set by
      // the router. The targetNumber fallback handles the edge case where the
      // skill is invoked via a slash command on an issue comment.
      const resultNumber = routeResult.context.prNumber ?? targetNumber;
      const result = {
        prNumber: resultNumber,
        skill: routeResult.skill,
        timestamp: new Date().toISOString(),
        status: "completed",
        commit: process.env.GITHUB_SHA ?? null,
      };
      writeFileSync(
        resolve(resultDir, `pr-${resultNumber}.json`),
        JSON.stringify(result, null, 2) + "\n"
      );
      console.log(`Persisted ${routeResult.skill} result for PR #${resultNumber}`);
    }

    // ── Commit and push state changes ───────────────────────────────────────────
    // Stage all changes (session log, mapping JSON, any files the agent edited),
    // commit only if the index is dirty, then push with a retry-on-conflict loop.
    const addResult = await run(["git", "add", "-A"]);
    if (addResult.exitCode !== 0) {
      console.error("git add failed with exit code", addResult.exitCode);
    }
    const { exitCode } = await run(["git", "diff", "--cached", "--quiet"]);
    if (exitCode !== 0) {
      // exitCode !== 0 means there are staged changes to commit.
      const commitMsg = isPullRequest
        ? `gstack-intelligence: review PR #${targetNumber}`
        : `gstack-intelligence: work on issue #${targetNumber}`;
      const commitResult = await run(["git", "commit", "-m", commitMsg]);
      if (commitResult.exitCode !== 0) {
        console.error("git commit failed with exit code", commitResult.exitCode);
      }
    }

    // Retry push up to 10 times with increasing backoff delays, rebasing on
    // each conflict with `-X theirs` to auto-resolve in favour of the remote.
    const pushBackoffs = [1000, 2000, 3000, 5000, 7000, 8000, 10000, 12000, 12000, 15000];
    let pushSucceeded = false;
    for (let i = 1; i <= 10; i++) {
      const push = await run(["git", "push", "origin", `HEAD:${defaultBranch}`]);
      if (push.exitCode === 0) { pushSucceeded = true; break; }
      if (i < 10) {
        console.log(`Push failed, rebasing and retrying (${i}/10)...`);
        await run(["git", "pull", "--rebase", "-X", "theirs", "origin", defaultBranch]);
        await new Promise(r => setTimeout(r, pushBackoffs[i - 1]));
      }
    }
    // ── Post reply as comment ───────────────────────────────────────────────────
    // Always post the comment first so the user receives the agent's response even
    // if the push later fails.  The push failure throw (below) must come AFTER the
    // comment is posted — otherwise the throw would skip the comment entirely and
    // the user would get no reply.
    // For pull_request events, post as a PR comment; for issue events, post as an
    // issue comment. Both use the same underlying GitHub API.
    const trimmedText = agentText.trim();
    let commentBody = trimmedText.length > 0
      ? trimmedText.slice(0, MAX_COMMENT_LENGTH)
      : `✅ The agent ran successfully but did not produce a text response. Check the repository for any file changes that were made.\n\nFor full details, see the [workflow run logs](https://github.com/${repo}/actions).`;
    if (!pushSucceeded) {
      commentBody += `\n\n---\n⚠️ **Warning:** The agent's session state could not be pushed to the repository. Conversation context may not be preserved for follow-up comments. See the [workflow run logs](https://github.com/${repo}/actions) for details.`;
    }
    // Append the agent signature as a hidden HTML comment for bot-loop prevention.
    // The router checks incoming comments for this signature and skips them.
    commentBody += "\n" + AGENT_SIGNATURE;
    if (isPullRequest) {
      await gh("pr", "comment", String(targetNumber), "--body", commentBody);
    } else {
      await gh("issue", "comment", String(targetNumber), "--body", commentBody);
    }

    // Throw push failure AFTER the comment has been posted so the user always
    // receives the agent's response.  The throw still causes the workflow step to
    // fail and adds a 👎 reaction via the `finally` block.
    if (!pushSucceeded) {
      throw new Error(
        "All 10 push attempts failed. Auto-reconciliation could not be completed. " +
        "Session state was not persisted to remote. Check the workflow logs for details."
      );
    }

    // Mark the run as successful so the `finally` block adds 👍 instead of 👎.
    succeeded = true;

  } finally {
    // ── Guaranteed outcome reaction: 👍 on success, 👎 on error ─────────────────
    // This block always executes — even when the try block throws.  The 🚀 rocket
    // from the Authorize step is intentionally left in place; we only
    // ADD the outcome reaction here.
    if (reactionState) {
      try {
        const { reactionTarget, commentId: stateCommentId } = reactionState;
        const outcomeContent = succeeded ? "+1" : "-1";
        if (reactionTarget === "comment" && stateCommentId) {
          // Add outcome reaction to the triggering comment.
          await gh("api", `repos/${repo}/issues/comments/${stateCommentId}/reactions`, "-f", `content=${outcomeContent}`);
        } else {
          // Add outcome reaction to the issue (or PR — PRs are issues in GitHub).
          await gh("api", `repos/${repo}/issues/${targetNumber}/reactions`, "-f", `content=${outcomeContent}`);
        }
      } catch (e) {
        // Log but do not re-throw — a failed reaction should not mask the original error.
        console.error("Failed to add outcome reaction:", e);
      }
    }
  }
}

main();
