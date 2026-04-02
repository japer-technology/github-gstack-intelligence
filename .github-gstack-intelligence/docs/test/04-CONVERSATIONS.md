# 04 — Conversation Skill Tests

Validates multi-turn conversation skills: `/office-hours`, `/plan-ceo-review`,
`/plan-eng-review`, `/plan-design-review`, `/design-consultation`, and session
continuity across multiple comments.

---

## Prerequisites

- Test repo with GStack Intelligence installed
- Labels: `office-hours`, `investigate`, `design-consultation` created
- API key configured

---

## Office Hours Tests

### CV-001: Office Hours via Label on Issue Open

**Trigger:** Create an issue with the `office-hours` label.

```bash
ISSUE_NUM=$(gh issue create \
  --title "Should we pivot to B2B?" \
  --body "We're seeing great traction with individual developers but enterprise customers keep asking for team features. Our current MRR is \$50k, 80% from individual plans. Should we build team features and go after B2B, or double down on individual developers?" \
  --label "office-hours" \
  --json number -q '.number')
```

**Expected outcomes:**
1. ✅ Router detects `office-hours` label → routes to `office-hours` skill
2. ✅ Agent responds in YC office hours style (forcing questions, product thinking)
3. ✅ Comment posted with the `AGENT_SIGNATURE`
4. ✅ Session mapping created at `state/issues/{N}.json`
5. ✅ Session file created at `state/sessions/{timestamp}.jsonl`

**Verification:**
```bash
# Check session mapping exists
cat .github-gstack-intelligence/state/issues/${ISSUE_NUM}.json

# Verify session file exists
jq -r '.sessionPath' .github-gstack-intelligence/state/issues/${ISSUE_NUM}.json
```

---

### CV-002: Office Hours Multi-Turn Continuation

**Trigger:** Post a follow-up comment on the same issue.

```bash
gh issue comment $ISSUE_NUM --body "Good point about the enterprise market. Our churn rate on individual plans is 8% monthly. What metrics should I focus on before making the pivot decision?"
```

**Expected outcomes:**
1. ✅ Router detects no slash command → falls through to general conversation
2. ✅ Agent resumes the prior session (session mapping exists)
3. ✅ Response references the previous context (B2B pivot discussion)
4. ✅ Session file is updated (not a new file) or mapping updated to latest session

---

### CV-003: Office Hours via Slash Command

**Trigger:** Comment `/office-hours` on an issue without the label.

```bash
ISSUE_NUM2=$(gh issue create --title "Revenue strategy" --body "Need advice on pricing" --json number -q '.number')
gh issue comment $ISSUE_NUM2 --body "/office-hours"
```

**Expected:** Routes to `office-hours` skill via slash command in comment.

---

## Plan Review Tests

### CV-010: CEO Review (/plan-ceo-review)

**Trigger:** Comment `/plan-ceo-review` on a plan issue.

```bash
PLAN_ISSUE=$(gh issue create \
  --title "Q3 Product Roadmap" \
  --body "## Goals\n1. Launch team features\n2. Add SSO support\n3. Build analytics dashboard\n\n## Timeline\n- Month 1: Team features MVP\n- Month 2: SSO integration\n- Month 3: Analytics + polish\n\n## Resources\n2 engineers, 1 designer" \
  --json number -q '.number')

gh issue comment $PLAN_ISSUE --body "/plan-ceo-review"
```

**Expected outcomes:**
1. ✅ Routes to `plan-ceo-review` skill
2. ✅ Agent responds with CEO/founder-mode analysis (10-star product thinking, scope)
3. ✅ `needsBrowser: false`
4. ✅ `sessionMode: "new"`
5. ✅ Comment includes strategic assessment, not just code review

---

### CV-011: Engineering Review (/plan-eng-review)

**Trigger:** Comment `/plan-eng-review` on the same plan issue.

```bash
gh issue comment $PLAN_ISSUE --body "/plan-eng-review"
```

**Expected outcomes:**
1. ✅ Routes to `plan-eng-review` skill
2. ✅ Agent responds with engineering manager analysis (data flow, edge cases, test strategy)
3. ✅ Architecture assessment, not product-level feedback

---

### CV-012: Design Review of Plan (/plan-design-review)

**Trigger:** Comment `/plan-design-review` on the plan issue.

```bash
gh issue comment $PLAN_ISSUE --body "/plan-design-review"
```

**Expected outcomes:**
1. ✅ Routes to `plan-design-review` skill
2. ✅ Agent responds with designer's perspective (dimension ratings 0–10)
3. ✅ `needsBrowser: false` (this is plan review, not live site review)

---

## Design Consultation Tests

### CV-020: Design Consultation via Label

**Trigger:** Create an issue with the `design-consultation` label.

```bash
DESIGN_ISSUE=$(gh issue create \
  --title "Design system for dashboard" \
  --body "We need a consistent design system for our analytics dashboard. Currently using a mix of Tailwind components with no consistent spacing, colours, or typography. Need: colour palette, typography scale, spacing system, component library." \
  --label "design-consultation" \
  --json number -q '.number')
```

**Expected outcomes:**
1. ✅ Router detects `design-consultation` label → routes to skill
2. ✅ Agent provides design system recommendations
3. ✅ `needsBrowser: false`
4. ✅ `sessionMode: "new"`

---

### CV-021: Design Consultation Multi-Turn

**Trigger:** Follow up with refinements.

```bash
gh issue comment $DESIGN_ISSUE --body "I like the colour palette suggestion. Can you also recommend icon sizes and button variants for a data-heavy dashboard?"
```

**Expected:** Agent responds in context of the prior design consultation.

---

## Investigate Tests

### CV-030: Investigate via Label

**Trigger:** Create an issue with the `investigate` label.

```bash
INVESTIGATE_ISSUE=$(gh issue create \
  --title "Memory leak in worker process" \
  --body "The worker process RSS grows by ~50MB per hour under normal load. Suspected leak in the message queue consumer. Last deploy was v1.2.3." \
  --label "investigate" \
  --json number -q '.number')
```

**Expected outcomes:**
1. ✅ Router detects `investigate` label → routes to `investigate` skill
2. ✅ Agent performs systematic debugging (4-phase methodology)
3. ✅ Root cause analysis in the response

---

### CV-031: Investigate via Title Slash Command

**Trigger:** Create an issue with `/investigate` in the title.

```bash
gh issue create \
  --title "/investigate Slow API responses" \
  --body "P95 latency spiked to 2s yesterday"
```

**Expected outcomes:**
1. ✅ Router parses slash command from issue title
2. ✅ `context.args` = "Slow API responses"
3. ✅ Routes to `investigate` skill

---

### CV-032: Investigate via Slash Command with Args

```bash
gh issue comment $ISSUE_NUM --body "/investigate memory leak in worker process"
```

**Expected:**
- `skill: "investigate"`
- `context.args: "memory leak in worker process"`

---

## Session Continuity Validation

### CV-040: Session File Created on First Interaction

```bash
# After any skill runs on an issue
ls -la .github-gstack-intelligence/state/sessions/
cat .github-gstack-intelligence/state/issues/${ISSUE_NUM}.json
```

**Expected:** `state/issues/{N}.json` maps to a `.jsonl` session file.

### CV-041: Session Resumed on Follow-Up

```bash
# Post second comment on same issue
gh issue comment $ISSUE_NUM --body "Can you elaborate on point 3?"

# After workflow completes, check that session mapping points to same or updated session
cat .github-gstack-intelligence/state/issues/${ISSUE_NUM}.json
```

**Expected:** Agent response references prior context. Session path in mapping
file should be the latest session transcript.

### CV-042: PR Events Skip Session Mapping

After a PR review, verify:
```bash
# This file should NOT exist for PR events
ls .github-gstack-intelligence/state/issues/${PR_NUM}.json 2>/dev/null
echo "Expected: file not found (PR events don't create session mappings)"
```

### CV-043: Automated Events Skip Session Mapping

Schedule/release/deployment events should not create session mappings.

---

## Cleanup

```bash
gh issue close $ISSUE_NUM
gh issue close $ISSUE_NUM2
gh issue close $PLAN_ISSUE
gh issue close $DESIGN_ISSUE
gh issue close $INVESTIGATE_ISSUE
```
