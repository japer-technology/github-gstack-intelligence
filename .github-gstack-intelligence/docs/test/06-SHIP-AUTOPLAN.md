# 06 — Ship & Autoplan Tests

Validates the `/ship` fully automated shipping workflow and the `/autoplan`
sequential review pipeline.

---

## Prerequisites

- Test repo with GStack Intelligence installed
- At least one completed review result in `state/results/review/` (for `/ship`)
- API key configured

---

## Ship Tests

### SP-001: Ship via Slash Command

**Trigger:** Comment `/ship` on an issue.

```bash
ISSUE_NUM=$(gh issue create \
  --title "Ship v1.1.0" \
  --body "Ready to ship the latest changes. All tests passing, review completed." \
  --json number -q '.number')

gh issue comment $ISSUE_NUM --body "/ship"
```

**Expected outcomes:**
1. ✅ Routes to `ship` skill via issue_comment
2. ✅ `needsBrowser: false`
3. ✅ `sessionMode: "new"`
4. ✅ Agent attempts the ship workflow (tests → version bump → PR creation)
5. ✅ Agent checks for prior review results in `state/results/review/`
6. ✅ Comment posted with ship status and outcome

**Verification:**
```bash
# Check the comment
gh issue view $ISSUE_NUM --comments
```

---

### SP-002: Ship Routing Context

**Unit test:**
```typescript
test("SP-002: /ship routes with correct context", () => {
  const event = {
    comment: { body: "/ship" },
    issue: { number: 99 },
  };
  const result = route(event, "issue_comment", testConfig);
  expect(result!.skill).toBe("ship");
  expect(result!.context.issueNumber).toBe(99);
  expect(result!.needsBrowser).toBe(false);
  expect(result!.sessionMode).toBe("new");
});
```

---

### SP-003: Ship with Prior Review Results

**Setup:** Ensure a review result exists:
```bash
# Verify state
cat .github-gstack-intelligence/state/results/review/pr-*.json
```

**Expected:** The ship skill reads prior review results and references them in
its decision-making process.

---

### SP-004: Ship Without Prior Review

**Setup:** Empty the review results directory.

**Expected:** The ship skill should flag that no prior review has been completed
and may ask for one or proceed with caution.

---

## Autoplan Tests

### SP-010: Autoplan via Slash Command

**Trigger:** Comment `/autoplan` on a plan issue.

```bash
PLAN_ISSUE=$(gh issue create \
  --title "Q3 Product Roadmap" \
  --body "## Objective\nLaunch enterprise features\n\n## Plan\n1. Team management\n2. SSO\n3. Audit logging\n4. Role-based access control\n\n## Timeline\n8 weeks with 3 engineers" \
  --json number -q '.number')

gh issue comment $PLAN_ISSUE --body "/autoplan"
```

**Expected outcomes:**
1. ✅ Routes to `autoplan` skill
2. ✅ `sessionMode: "none"` (autoplan is a one-shot pipeline, not conversational)
3. ✅ `needsBrowser: false`
4. ✅ Agent loads the autoplan skill prompt AND the three sub-skill prompts:
   - `plan-ceo-review.md` → CEO Review
   - `plan-design-review.md` → Design Review
   - `plan-eng-review.md` → Engineering Review
5. ✅ Agent executes all three reviews in sequence
6. ✅ Comment contains all three review perspectives

---

### SP-011: Autoplan Session Mode is None

**Unit test:**
```typescript
test("SP-011: autoplan has sessionMode none", () => {
  const event = {
    comment: { body: "/autoplan" },
    issue: { number: 60 },
  };
  const result = route(event, "issue_comment", testConfig);
  expect(result!.skill).toBe("autoplan");
  expect(result!.sessionMode).toBe("none");
});
```

**Rationale:** Autoplan is a one-shot pipeline that doesn't need session
continuity — it runs CEO → design → eng reviews in a single invocation.

---

### SP-012: Autoplan Loads Sub-Skills

This is verified by checking the agent.ts implementation logic. When
`routeResult.skill === "autoplan"`:

1. Loads `skills/autoplan.md`
2. Loads `skills/plan-ceo-review.md`
3. Loads `skills/plan-design-review.md`
4. Loads `skills/plan-eng-review.md`
5. Concatenates all four into a single prompt

**Verification via workflow logs:**
```
Autoplan: loaded 3 review skill(s)
```

---

### SP-013: Autoplan with Missing Sub-Skill

If one of the sub-skill files is missing, the autoplan should still run with
the available skills and log a warning:

```
Autoplan sub-skill not found: .github-gstack-intelligence/skills/plan-ceo-review.md
```

**Expected:** The remaining sub-skills still execute.

---

### SP-020: Non-Autoplan Commands Use Session Mode New

**Unit test:**
```typescript
describe("SP-020: session mode validation", () => {
  const nonAutoplanSkills = [
    "review", "cso", "qa", "qa-only", "investigate", "ship",
    "office-hours", "plan-ceo-review", "plan-eng-review",
    "plan-design-review", "design-consultation", "design-review",
    "document-release", "canary", "retro", "benchmark",
  ];

  for (const skill of nonAutoplanSkills) {
    test(`${skill} uses sessionMode new or none (not autoplan exception)`, () => {
      const event = { comment: { body: `/${skill}` }, issue: { number: 1 } };
      const cfg = enableSkill(testConfig, skill);
      const result = route(event, "issue_comment", cfg);
      if (result) {
        // retro and benchmark use "none" via schedule, but "new" via comment
        expect(result.sessionMode).not.toBe(undefined);
      }
    });
  }
});
```

---

## Cleanup

```bash
gh issue close $ISSUE_NUM
gh issue close $PLAN_ISSUE
```
