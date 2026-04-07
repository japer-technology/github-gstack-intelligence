# pi-mono Update: v0.57.1 → v0.65.1

## 1. Overview

This document outlines the full scope of changes applied to update GitHub GStack Intelligence's core dependency — `@mariozechner/pi-coding-agent` — from **v0.57.1** to **v0.65.1**. The update spans **17 releases** (v0.58.0 through v0.65.1) and includes 5 releases with breaking changes, numerous bug fixes directly impacting GGSI's non-interactive `--mode json` usage, and new features that unlock significant capability improvements.

| Item | Detail |
|------|--------|
| **Previous version** | `0.57.1` (pinned in `.github-gstack-intelligence/package.json`) |
| **Updated version** | `0.65.1` |
| **Releases spanned** | 17 (v0.58.0 – v0.65.1) |
| **Breaking change releases** | v0.59.0, v0.62.0, v0.63.0, v0.64.0, v0.65.0 |
| **Source** | [github.com/badlogic/pi-mono/releases](https://github.com/badlogic/pi-mono/releases) |

---

## 2. Release-by-Release Changelog Summary

### v0.58.0

- **Extension tool calls now execute in parallel** — previously sequential. This directly improves agent run time when multiple tools are called in a single turn.
- Claude Opus 4.6, Sonnet 4.6, and Bedrock models now have **1M token context windows** (up from 200K).
- `GOOGLE_CLOUD_API_KEY` environment variable support for the `google-vertex` provider.
- Extensions can supply deterministic session IDs via `newSession()`.
- Fix: default system prompt uses date-only (not time), improving prompt cacheability across reloads and resumed sessions.
- Fix: retry regex now matches `server_error` and `internal_error` from providers, improving automatic retry coverage.
- Fix: tool result images now sent correctly in `function_call_output` items for OpenAI Responses API.
- Fix: startup crash when downloading `fd`/`ripgrep` on first run (timeout increased from 10s to 120s).

### v0.58.1

- Added `pi uninstall` alias for `pi install --uninstall`.
- Fix: OpenAI Codex websocket protocol and SSE stream termination.
- Fix: extension `session_start` hook firing before TUI was ready — **directly relevant**: GGSI's `github-context.ts` extension uses registration at startup.
- Fix: Bedrock prompt caching enabled for non-Claude models causing API errors.
- Fix: skill discovery recursion past skill root directories.
- Fix: startup crash fix for `fd`/`ripgrep` download (pipeline fix).

### v0.58.2

- Fix: fuzzy `edit` matching now normalizes Unicode compatibility variants — reduces false "oldText not found" failures.

### v0.58.3 – v0.58.4

- v0.58.3: Maintenance release.
- v0.58.4: Fix: steering messages now wait until the current assistant message's tool-call batch fully finishes instead of skipping pending tool calls. **Important for GGSI**: prevents premature tool-call termination during complex multi-tool operations.

### v0.59.0

- **Faster startup** via lazy-loading `@mariozechner/pi-ai` provider SDKs on first use instead of import time — directly reduces GitHub Actions wall time.
- Better provider retry behavior when providers return error messages as responses.
- **⚠️ Breaking Change**: Custom tool system prompt behavior changed — extension tools are included in the `Available tools` section **only** when they provide `promptSnippet`. Omitting `promptSnippet` now leaves the tool out of that section instead of falling back to `description`.
- Fix: provider retry handling treats error messages as retryable failures.

### v0.60.0

- **Session forking** via `--fork <path|id>` CLI flag.
- Extensions and SDK callers can reuse pi's built-in local bash backend via `createLocalBashOperations()`.
- **⚠️ Breaking Change**: Startup no longer auto-updates unpinned npm/git packages. Use `pi update` explicitly.
- Fix: active model selection refreshes immediately after provider registrations.
- Fix: print mode merges piped stdin into initial prompt when both are provided.

### v0.61.0

- JSONL session export and import via `/export <path.jsonl>` and `/import <path.jsonl>`.
- **⚠️ Breaking Change**: Interactive keybinding IDs are now namespaced (auto-migrated). Does not affect GGSI (non-interactive mode).
- Fix: **concurrent `edit` and `write` mutations targeting the same file now run serially** — prevents interleaved writes from overwriting each other. **Critical for GGSI**: the agent frequently does edit+write in rapid succession.
- Fix: RPC mode redirects unexpected stdout writes to stderr so JSONL responses remain parseable.
- Fix: CLI startup suppresses process warnings from leaking into print/RPC output.

### v0.61.1

- Added `ToolCallEventResult` type exports for typed `tool_call` handler return values.

### v0.62.0

- **Built-in tools as extensible ToolDefinitions** — extension authors can now override rendering of built-in read/write/edit/bash/grep/find/ls tools.
- **Unified source provenance via `sourceInfo`** — all resources carry structured `sourceInfo`.
- **⚠️ Breaking Changes**:
  - `ToolDefinition.renderCall` and `renderResult` semantics changed.
  - Slash command provenance uses `sourceInfo` instead of `location`/`path`.
  - Removed legacy `source` fields from `Skill` and `PromptTemplate`.
  - Removed `ResourceLoader.getPathMetadata()`.
  - Removed `extensionPath` from `RegisteredCommand` and `RegisteredTool`.
- Fix: **print and JSON mode takes over stdout during startup** — keeps package-manager chatter off protocol stdout. **Important for GGSI**: cleaner JSONL output parsing.

### v0.63.0

- **`sessionDir` setting in `settings.json`** — session storage can be configured without `--session-dir` CLI flag.
- **Edit tool multi-edit support** — one call can update multiple disjoint regions in the same file.
- **⚠️ Breaking Changes**:
  - `ModelRegistry.getApiKey(model)` replaced by `getApiKeyAndHeaders(model)` (SDK only — does not affect CLI usage).
  - Removed deprecated `minimax` and `minimax-cn` direct model IDs.
- Fix: **file mutation queue ordering** — concurrent edit/write operations stay serialized in request order.
- Fix: **print and JSON modes emit `session_shutdown` before exit** — extensions can release long-lived resources, non-interactive runs terminate cleanly. **Important for GGSI**.

### v0.63.1

- Fix: **repeated compactions dropping messages** — re-summarizes from previous kept boundary. **Critical for GGSI**: long multi-turn issue conversations depend on compaction correctness.
- Fix: **skill discovery stops recursing once a directory contains `SKILL.md`** — affects GGSI's `.pi/skills/memory` and `.pi/skills/skill-creator`.

### v0.63.2

- **`ctx.signal` for cancellation** in extension handlers — can forward cancellation into nested model calls, `fetch()`, and other abort-aware work.
- Built-in `edit` tool input now uses `edits[]` as the **only** replacement shape — reduces invalid tool calls caused by mixed schemas.

### v0.64.0

- **`prepareArguments` hook on ToolDefinition** — lets extensions normalize or migrate raw model arguments before schema validation.
- **⚠️ Breaking Change**: `ModelRegistry` no longer has a public constructor — use `ModelRegistry.create()` or `ModelRegistry.inMemory()` (SDK only — does not affect CLI usage).

### v0.65.0

- **Session runtime API**: `createAgentSessionRuntime()` and `AgentSessionRuntime` — closure-based runtime that recreates cwd-bound services on every session switch.
- **`defineTool()` helper** — create standalone custom tool definitions with full TypeScript parameter type inference. **Useful for GGSI's github-context.ts extension**.
- **Unified diagnostics model** — arg parsing, service creation, session option resolution, and resource loading return structured diagnostics (`info`/`warning`/`error`) instead of logging or exiting.
- **⚠️ Breaking Changes**:
  - **Removed `session_switch` and `session_fork` extension events** → use `session_start` with `event.reason`.
  - **Removed session-replacement methods from `AgentSession`** → use `AgentSessionRuntime`.
  - **Removed `session_directory` from extension and settings APIs**.
  - **Unknown single-dash CLI flags (e.g., `-s`) now produce errors** instead of being silently ignored.

### v0.65.1

- Fix: **bash output truncation** — always persist full output to temp file, preventing data loss when output exceeds 2000 lines. **Critical for GGSI**: agent frequently runs commands with large output in GitHub Actions.
- Fix: **resource collision precedence** — project and user skills, prompt templates, and themes override package resources consistently. **Important for GGSI**: ensures `.pi/skills/` and `.pi/prompts/` take precedence.
- Fix: **piped stdin runs with `--mode json` preserve JSONL output** instead of falling back to plain text. **Relevant for GGSI's JSON-mode usage**.
- Fix: stored session cwd handling — resuming a session whose original directory no longer exists now fails with a clear error in non-interactive mode.

---

## 3. Breaking Changes Impact Assessment for GGSI

### 3.1 IMPACTS GGSI — `promptSnippet` Required for Custom Tools (v0.59.0)

**What changed**: Extension tools without `promptSnippet` are no longer included in the `Available tools` system prompt section.

**Impact on GGSI**: The `github-context.ts` extension registers a tool with `name`, `label`, `description`, and `parameters` — but no `promptSnippet`. After this update, the LLM would not be aware that the `github_repo_context` tool exists unless `promptSnippet` is added.

**Applied fix**: Added a `promptSnippet` field to the tool registration in `.pi/extensions/github-context.ts`.

### 3.2 DOES NOT IMPACT GGSI — `sourceInfo` Replaces Legacy Fields (v0.62.0)

GGSI does not programmatically access skill/tool provenance fields at runtime. The extension registers a tool but never reads `.source` or `.extensionPath` from other resources. **No code changes required**.

### 3.3 DOES NOT IMPACT GGSI — `getApiKey` → `getApiKeyAndHeaders` (v0.63.0)

SDK method change only. GGSI uses the CLI (`pi` binary), not the SDK. **No changes required**.

### 3.4 DOES NOT IMPACT GGSI — `ModelRegistry` Constructor Removed (v0.64.0)

CLI-only usage. **No changes required**.

### 3.5 DOES NOT IMPACT GGSI — Session Events Removed (v0.65.0)

The `github-context.ts` extension does not use `session_switch`, `session_fork`, or `session_directory` events. It only calls `pi.registerTool()`. **No changes required**.

### 3.6 VERIFIED — Unknown Single-Dash Flags Error (v0.65.0)

GGSI invokes pi with: `--mode json --tools ... --provider ... --model ... [--thinking ...] --session-dir ... -p <prompt> [--session ...]`. The `-p` flag is the standard prompt flag. All other flags use double-dash. **No changes required**.

### 3.7 DOES NOT IMPACT GGSI — Package Auto-Update Removed (v0.60.0)

GGSI pins `@mariozechner/pi-coding-agent` to an exact version. `bun install --frozen-lockfile` is used in the workflow. **No changes required**.

### 3.8 DOES NOT IMPACT GGSI — Keybinding Namespacing (v0.61.0)

GGSI runs in non-interactive `--mode json`. Keybindings are irrelevant. **No changes required**.

---

## 4. Bug Fixes Most Relevant to GGSI

| Fix | Version | Impact |
|-----|---------|--------|
| **Bash output truncation** — full output preserved to temp file | v0.65.1 | Prevents silent data loss in commands with >2000 lines of output |
| **Concurrent edit/write serialization** — same-file mutations run serially | v0.61.0 | Prevents interleaved writes from overwriting each other |
| **File mutation queue ordering** — operations stay in request order | v0.63.0 | Ensures deterministic file modification behavior |
| **Repeated compaction fix** — messages no longer dropped | v0.63.1 | Critical for long multi-turn issue conversations |
| **JSON/print mode stdout isolation** — startup chatter removed from output | v0.62.0 | Cleaner JSONL parsing in agent.ts |
| **Session shutdown in JSON/print mode** — `session_shutdown` emitted on exit | v0.63.0 | Extensions can clean up; non-interactive runs terminate cleanly |
| **Piped stdin JSONL preservation** — `--mode json` output stays JSONL | v0.65.1 | Ensures JSONL output pipeline works correctly |
| **Provider retry improvements** — error messages treated as retryable | v0.59.0 | Reduces hard failures in CI environment |
| **Resource collision precedence** — project resources override packages | v0.65.1 | GGSI's `.pi/` skills/prompts take priority |
| **Skill discovery recursion fix** — stops at `SKILL.md` | v0.63.1 | Correct discovery of GGSI's custom skills |
| **Steering messages wait for tool completion** | v0.58.4 | Prevents premature tool-call termination |
| **Extension session_start timing** — fires after TUI ready | v0.58.1 | Ensures github-context.ts extension loads reliably |
| **Lazy provider loading** — faster startup | v0.59.0 | Reduces GitHub Actions wall time |

---

## 5. New Features Beneficial to GGSI

### 5.1 Parallel Tool Execution (v0.58.0)

Extension tool calls now execute in parallel by default. When the agent calls multiple tools in a single turn, they run concurrently rather than sequentially. This directly reduces agent run time and GitHub Actions billing.

### 5.2 Lazy Provider Loading (v0.59.0)

Provider SDKs are loaded on first use, not at import time. Since GGSI typically uses only one provider per run (e.g., `openai`), unused provider SDKs are never loaded. This reduces startup time.

### 5.3 `sessionDir` Setting (v0.63.0)

Session storage can now be configured in `settings.json` instead of via the `--session-dir` CLI flag. GGSI currently passes `--session-dir` in `agent.ts`. This could be moved to `settings.json` for cleaner separation of configuration from invocation in a future update.

### 5.4 Multi-Edit Tool (v0.63.0)

The `edit` tool now supports updating multiple disjoint regions in a single call. This reduces tool-call count and improves agent efficiency for multi-point file edits.

### 5.5 `edits[]` as Sole Edit Schema (v0.63.2)

The edit tool now uses `edits[]` as the only replacement shape, eliminating the mixed single/multi-edit schema that caused repeated invalid tool calls and retries.

### 5.6 `defineTool()` Helper (v0.65.0)

A new `defineTool()` helper creates standalone custom tool definitions with full TypeScript parameter type inference. GGSI's `github-context.ts` extension could benefit from migrating to this API for better type safety in a future update.

### 5.7 `ctx.signal` for Extension Cancellation (v0.63.2)

Extension handlers can now use `ctx.signal` to forward cancellation into nested model calls, `fetch()`, and other abort-aware work. GGSI's `github-context.ts` extension could use this for the `execSync` call to `gh` in a future update.

### 5.8 1M Token Context Window (v0.58.0)

Claude Opus 4.6, Sonnet 4.6, and related Bedrock models now use a 1M token context window. If GGSI users configure Claude as their provider, they benefit from 5× more context capacity.

---

## 6. Changes Applied

### 6.1 `package.json` — Version Bump

Updated `@mariozechner/pi-coding-agent` from `"0.57.1"` to `"0.65.1"`.

### 6.2 `bun.lock` — Regenerated

Regenerated via `bun install` with the new version and its updated transitive dependencies.

### 6.3 `github-context.ts` — Added `promptSnippet`

Added `promptSnippet` to the `registerTool()` call to satisfy the v0.59.0 breaking change requiring `promptSnippet` for custom tools to appear in the system prompt.

### 6.4 `PACKAGES.md` — Updated Version Reference

Updated version from `0.57.1` to `0.65.1`.

### 6.5 `CURRENT-STATUS.md` — Updated Version Reference

Updated version from `v0.57.1` to `v0.65.1`.

### 6.6 CLI Flags — Verified

All CLI flags used by `agent.ts` are valid in v0.65.1. No changes required.

---

## 7. Recommended Follow-Up Work

1. **Evaluate `defineTool()` migration** — Consider refactoring `github-context.ts` to use `defineTool()` for better TypeScript type inference.
2. **Evaluate `sessionDir` migration** — Consider moving `--session-dir` from CLI flags to `settings.json` once path resolution semantics are verified.
3. **Evaluate `ctx.signal` adoption** — The extension's `execSync` call to `gh` could be converted to an async call with signal forwarding for better cancellation support.
4. **Monitor for v0.65.2+** — Review its changelog for additional relevant fixes.

---

## 8. Summary

The update from v0.57.1 to v0.65.1 brings **17 releases** of improvements. The most impactful changes for GGSI are:

- **Parallel tool execution** (v0.58.0) — faster agent runs
- **Concurrent file mutation serialization** (v0.61.0) — prevents data corruption
- **Compaction correctness fixes** (v0.63.1) — reliable long conversations
- **Bash output truncation fix** (v0.65.1) — no more silent data loss
- **JSONL output stability** (v0.62.0, v0.65.1) — cleaner output parsing
- **Lazy provider loading** (v0.59.0) — faster startup
- **Multi-edit tool** (v0.63.0) — more efficient code modifications
- **Edit schema simplification** (v0.63.2) — fewer invalid tool calls

The only **mandatory code change** beyond the version bump was adding `promptSnippet` to the `github-context.ts` extension (v0.59.0 breaking change). All other breaking changes either don't affect GGSI's CLI-based usage or have been verified as non-impacting.

The update is low-risk with high reward — it addresses several known reliability issues in the non-interactive JSON-mode pipeline that GGSI depends on.
