/**
 * router.ts — Event router for GStack Intelligence.
 *
 * Maps GitHub webhook events to the appropriate skill based on event type,
 * slash commands, labels, and config.json settings. This is the "brain" that
 * decides which of the 17 extracted skill prompts to invoke for any given event.
 *
 * The router is invoked by agent.ts when the `--route` flag is passed.
 * It returns a RouteResult describing which skill to run, or null if no
 * route matches (in which case agent.ts falls back to general conversation).
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

// ─── Agent Signature (Bot-Loop Prevention) ──────────────────────────────────
// Appended to every agent-posted comment as a hidden HTML comment.
// The router checks incoming comments for this signature and skips them
// to prevent infinite bot-to-bot reply loops.
export const AGENT_SIGNATURE = "<!-- github-gstack-intelligence-agent -->";

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface RouteResult {
  skill: string;             // Skill filename (e.g., 'review', 'qa')
  prompt: string;            // Constructed prompt with context (populated by agent.ts)
  needsBrowser: boolean;     // Whether Playwright setup is needed
  sessionMode: "new" | "resume" | "none";
  context: {
    prNumber?: number;
    issueNumber?: number;
    url?: string;            // For /qa, /canary
    diffStat?: string;
    branch?: string;
  };
}

export interface SkillConfig {
  enabled: boolean;
  trigger: string;
  labelGated?: boolean;
  label?: string;
  schedule?: string;
}

export interface Config {
  version: string;
  defaults: {
    provider: string;
    model: string;
    maxCommentLength: number;
    costTier: string;
  };
  access: {
    allowedPermissions: string[];
    botLoopPrevention: boolean;
    prefixGating: boolean;
    prefixes: string[];
  };
  skills: Record<string, SkillConfig>;
}

export interface SlashCommand {
  skill: string;
  url?: string;
  args?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

// Skills that require a browser (Playwright) for execution.
const BROWSER_SKILLS = new Set(["qa", "qa-only", "canary", "design-review"]);

// All recognised slash commands. Unknown commands are ignored (treated as
// regular conversation text) rather than producing an error.
const VALID_COMMANDS = new Set([
  "review", "cso", "qa", "qa-only", "investigate", "ship",
  "office-hours", "plan-ceo-review", "plan-eng-review",
  "design-review", "plan-design-review", "design-consultation",
  "autoplan", "retro", "benchmark", "document-release", "canary",
]);

// Commands that accept a URL as their first argument.
const URL_COMMANDS = new Set(["qa", "qa-only", "canary"]);

// ─── Slash-Command Parser ───────────────────────────────────────────────────

/**
 * Parse a slash command from the text of an issue comment.
 *
 * Rules:
 * - Command must be the first non-whitespace content on the first line.
 * - URL arguments are validated (must start with http:// or https://).
 * - Unknown commands return null (treated as conversation continuation).
 *
 * @param text - The full comment body text.
 * @returns    - A SlashCommand if a valid command was found, null otherwise.
 */
export function parseSlashCommand(text: string): SlashCommand | null {
  if (!text) return null;

  const trimmed = text.trimStart();
  if (!trimmed.startsWith("/")) return null;

  // Extract the first line only.
  const firstLine = trimmed.split("\n")[0].trim();

  // Match: /command [optional-args]
  const match = firstLine.match(/^\/([a-z][a-z0-9-]*)(?:\s+(.*))?$/i);
  if (!match) return null;

  const command = match[1].toLowerCase();
  const rawArgs = (match[2] || "").trim();

  if (!VALID_COMMANDS.has(command)) return null;

  // URL-accepting commands: validate the URL argument if provided.
  if (URL_COMMANDS.has(command) && rawArgs) {
    if (rawArgs.startsWith("http://") || rawArgs.startsWith("https://")) {
      return { skill: command, url: rawArgs };
    }
    // Non-URL argument on a URL command — return the command without the URL.
    return { skill: command };
  }

  if (rawArgs) {
    return { skill: command, args: rawArgs };
  }

  return { skill: command };
}

// ─── Config Loader ──────────────────────────────────────────────────────────

/**
 * Load config.json from the GStack Intelligence directory.
 *
 * @param intelligenceDir - Absolute path to `.github-gstack-intelligence/`.
 * @returns               - Parsed Config object.
 * @throws                - If config.json is missing or contains invalid JSON.
 */
export function loadConfig(intelligenceDir: string): Config {
  const configPath = resolve(intelligenceDir, "config.json");
  if (!existsSync(configPath)) {
    throw new Error(`config.json not found at ${configPath}`);
  }
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

// ─── Router ─────────────────────────────────────────────────────────────────

/**
 * Route a GitHub event to a skill.
 *
 * Routing priority:
 *   1. workflow_dispatch → check inputs.function
 *   2. pull_request      → /review (or /cso if label, /design-review if label)
 *   3. issue_comment     → parse slash command
 *   4. issues (opened)   → label-mapped skill
 *   5. schedule          → cron-pattern mapped skill
 *   6. release           → /document-release
 *   7. deployment_status → /canary (on success)
 *
 * @param event     - The parsed GitHub webhook event payload.
 * @param eventName - The GitHub event name (e.g., 'issues', 'issue_comment').
 * @param config    - The loaded config.json object.
 * @returns         - A RouteResult if a route matches, null otherwise.
 */
export function route(
  event: any,
  eventName: string,
  config: Config,
): RouteResult | null {
  // Bot-loop prevention: skip agent-generated comments.
  if (
    config.access.botLoopPrevention &&
    event.comment?.body?.includes(AGENT_SIGNATURE)
  ) {
    console.log("Skipping agent-generated comment (bot-loop prevention)");
    return null;
  }

  // 1. workflow_dispatch → check inputs.function for a skill name.
  if (eventName === "workflow_dispatch") {
    const fn = event.inputs?.function;
    if (fn && fn !== "run-install" && fn !== "run-refresh-gstack") {
      return buildRoute(fn, config, { sessionMode: "new" });
    }
    return null;
  }

  // 2. pull_request → route to review, cso, or design-review.
  if (eventName === "pull_request") {
    const pr = event.pull_request;
    const prNumber = pr?.number;
    const branch = pr?.head?.ref;
    const labels: string[] = (pr?.labels || []).map((l: any) => l.name);

    // Check for CSO label (higher specificity than default review).
    if (labels.includes("security-audit")) {
      const result = buildRoute("cso", config, {
        sessionMode: "new",
        context: { prNumber, branch },
      });
      if (result) return result;
    }

    // Check for design-review label.
    if (labels.includes("design-review")) {
      const result = buildRoute("design-review", config, {
        sessionMode: "new",
        context: { prNumber, branch },
      });
      if (result) return result;
    }

    // Default: route to review.
    return buildRoute("review", config, {
      sessionMode: "new",
      context: { prNumber, branch },
    });
  }

  // 3. issue_comment → parse for a slash command.
  if (eventName === "issue_comment") {
    const commentBody = event.comment?.body ?? "";
    const issueNumber = event.issue?.number;
    const command = parseSlashCommand(commentBody);

    if (command) {
      return buildRoute(command.skill, config, {
        sessionMode: "new",
        context: {
          issueNumber,
          url: command.url,
        },
      });
    }

    // No slash command found — return null so agent.ts falls back to
    // general conversation.
    return null;
  }

  // 4. issues (opened with label) → route to label-mapped skill.
  if (eventName === "issues") {
    const labels: string[] = (event.issue?.labels || []).map(
      (l: any) => l.name,
    );
    const issueNumber = event.issue?.number;

    for (const [skillName, skillConfig] of Object.entries(config.skills)) {
      if (
        skillConfig.enabled &&
        skillConfig.label &&
        labels.includes(skillConfig.label)
      ) {
        return buildRoute(skillName, config, {
          sessionMode: "new",
          context: { issueNumber },
        });
      }
    }

    // No label-mapped skill — return null for general conversation.
    return null;
  }

  // 5. schedule → route based on cron pattern.
  if (eventName === "schedule") {
    const cronSchedule = event.schedule;
    for (const [skillName, skillConfig] of Object.entries(config.skills)) {
      if (
        skillConfig.enabled &&
        skillConfig.trigger === "schedule" &&
        skillConfig.schedule === cronSchedule
      ) {
        return buildRoute(skillName, config, { sessionMode: "none" });
      }
    }
    return null;
  }

  // 6. release → route to document-release.
  if (eventName === "release") {
    return buildRoute("document-release", config, { sessionMode: "new" });
  }

  // 7. deployment_status (success) → route to canary.
  if (eventName === "deployment_status") {
    if (event.deployment_status?.state === "success") {
      return buildRoute("canary", config, {
        sessionMode: "new",
        context: {
          url:
            event.deployment?.environment_url ||
            event.deployment_status?.target_url,
        },
      });
    }
    return null;
  }

  // No route matched.
  return null;
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Build a RouteResult for the given skill, checking that the skill is enabled
 * in config.json. Returns null if the skill is disabled or missing from config.
 */
function buildRoute(
  skill: string,
  config: Config,
  opts: {
    sessionMode?: "new" | "resume" | "none";
    context?: RouteResult["context"];
  },
): RouteResult | null {
  const skillConfig = config.skills[skill];

  // Skill must exist and be enabled in config.json.
  if (!skillConfig || !skillConfig.enabled) {
    console.log(
      `Skill "${skill}" is not enabled or does not exist in config`,
    );
    return null;
  }

  const needsBrowser = BROWSER_SKILLS.has(skill);
  const sessionMode = opts.sessionMode ?? "new";

  console.log(
    `Route matched: skill="${skill}", needsBrowser=${needsBrowser}, sessionMode=${sessionMode}`,
  );

  return {
    skill,
    prompt: "", // Prompt is constructed by agent.ts after loading the skill file.
    needsBrowser,
    sessionMode,
    context: opts.context ?? {},
  };
}
