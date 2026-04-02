#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# run-tests.sh — Execute all GStack Intelligence test suites.
#
# Usage:
#   cd .github-gstack-intelligence
#   bash docs/test/scripts/run-tests.sh
#
# This script runs:
#   1. Existing unit tests (lifecycle/router.test.ts, lifecycle/browser.test.ts)
#   2. Extended routing tests (docs/test/scripts/routing.test.ts)
#   3. Safety guard tests (docs/test/scripts/safety.test.ts)
#
# For integration tests (requiring API keys and GitHub Actions), see the
# individual test documents in docs/test/.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "═══════════════════════════════════════════════════════════════════"
echo " GStack Intelligence — Definitive Test Suite"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Root directory: $ROOT_DIR"
echo ""

cd "$ROOT_DIR"

# ── 1. Existing unit tests ──────────────────────────────────────────────────

echo "─── Phase 1: Existing unit tests (lifecycle/*.test.ts) ──────────"
echo ""
bun test lifecycle/router.test.ts lifecycle/browser.test.ts
echo ""

# ── 2. Extended routing tests ───────────────────────────────────────────────

echo "─── Phase 2: Extended routing tests (docs/test/scripts/) ────────"
echo ""
bun test docs/test/scripts/routing.test.ts
echo ""

# ── 3. Safety guard tests ──────────────────────────────────────────────────

echo "─── Phase 3: Safety guard tests (docs/test/scripts/) ────────────"
echo ""
bun test docs/test/scripts/safety.test.ts
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo " ✅ All test suites passed"
echo "═══════════════════════════════════════════════════════════════════"
