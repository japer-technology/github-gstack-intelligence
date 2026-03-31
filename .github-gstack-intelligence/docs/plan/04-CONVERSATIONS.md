# Phase 4 — Conversations

### Multi-turn conversation skills via issue comments

---

## Goal

Users can have extended, multi-turn conversations with the agent through issue comments. Opening an issue with the `office-hours` label starts a product idea refinement session. Commenting `/plan-ceo-review` kicks off a CEO-level feature review. The agent remembers the full conversation history across days and weeks via git-committed session state.

---

## Steps

### Step 22 — Wire Router: Label-Based Skill Routing

Issues opened with specific labels are routed to conversation skills:

```typescript
if (event.type === 'issues' && event.action === 'opened') {
  const labels = event.issue.labels.map(l => l.name);
  
  for (const [skill, conf] of Object.entries(config.skills)) {
    if (conf.trigger === 'issue_label' && conf.enabled && labels.includes(conf.label)) {
      return {
        skill,
        prompt: buildConversationPrompt(skill, event.issue.body),
        needsBrowser: false,
        sessionMode: 'new',
        context: { issueNumber: event.issue.number },
      };
    }
  }
}
```

**Mapped labels → skills:**

| Label | Skill | What happens |
|---|---|---|
| `office-hours` | `/office-hours` | Product idea refinement — agent asks probing questions |
| `investigate` | `/investigate` | Root-cause debugging — agent reads issue body as bug report |
| `design-consultation` | `/design-consultation` | Design system creation — extended multi-turn conversation |
| `ceo-review` | `/plan-ceo-review` | CEO-level feature review |
| `eng-review` | `/plan-eng-review` | Architecture review |

---

### Step 23 — Wire Router: `/plan-ceo-review` Command

When a user comments `/plan-ceo-review` on any issue:

```typescript
if (command.skill === 'plan-ceo-review') {
  return {
    skill: 'plan-ceo-review',
    prompt: buildConversationPrompt('plan-ceo-review', event.comment.body),
    needsBrowser: false,
    sessionMode: 'new',
    context: { issueNumber: event.issue.number },
  };
}
```

The session mode is `'new'` for the first invocation. Subsequent comments on the same issue will match the "continue conversation" path in the router (Step 24).

---

### Step 24 — Wire Router: `/plan-eng-review` Command

Same pattern as Step 23, routed to `skills/plan-eng-review.md`.

---

### Step 25 — Wire Router: Design Consultation Label

Issues labeled `design-consultation` route to the longest multi-turn conversation skill:

```typescript
if (labels.includes('design-consultation')) {
  return {
    skill: 'design-consultation',
    prompt: buildConversationPrompt('design-consultation', event.issue.body),
    needsBrowser: false,
    sessionMode: 'new',
    context: { issueNumber: event.issue.number },
  };
}
```

**Session management note:** Design consultations may span 10+ turns over weeks. The session file grows accordingly but remains manageable (JSONL is append-only, ~2-5KB per turn).

---

### Step 26 — Wire Router: `/autoplan` Pipeline

The `/autoplan` command chains three skills sequentially: CEO review → design review → eng review.

**Two implementation approaches:**

**Approach A — Single agent invocation with combined prompt:**
Load all three skill prompts (`plan-ceo-review.md`, `plan-design-review.md`, `plan-eng-review.md`) and concatenate them into a single combined prompt:

```typescript
if (command.skill === 'autoplan') {
  const ceoPrompt = readSkillPrompt('plan-ceo-review');
  const designPrompt = readSkillPrompt('plan-design-review');
  const engPrompt = readSkillPrompt('plan-eng-review');
  
  return {
    skill: 'autoplan',
    prompt: `Execute the following three reviews in sequence:\n\n## 1. CEO Review\n${ceoPrompt}\n\n## 2. Design Review\n${designPrompt}\n\n## 3. Engineering Review\n${engPrompt}`,
    needsBrowser: false,
    sessionMode: 'none',
    context: { issueNumber: event.issue.number },
  };
}
```

**Approach B — Three sequential agent invocations:**
Run three separate pi-coding-agent calls within a single workflow execution, posting results as three separate comments.

**Recommendation:** Start with Approach A (simpler, one LLM invocation, lower cost). Move to Approach B if the combined prompt exceeds context limits or if result quality is insufficient.

---

### Step 27 — Create Issue Templates

Structured issue templates improve the user experience by guiding input:

**`.github/ISSUE_TEMPLATE/gstack-office-hours.yml`:**
```yaml
name: "💬 Office Hours"
description: "Discuss a product idea with the AI agent"
labels: ["office-hours"]
body:
  - type: textarea
    id: idea
    attributes:
      label: "What's your idea?"
      description: "Describe what you want to build or improve"
    validations:
      required: true
```

**`.github/ISSUE_TEMPLATE/gstack-qa.yml`:**
```yaml
name: "🧪 QA Testing"
description: "Request QA testing of a URL"
labels: ["gstack-qa"]
body:
  - type: input
    id: url
    attributes:
      label: "URL to test"
      placeholder: "https://staging.example.com"
    validations:
      required: true
  - type: dropdown
    id: tier
    attributes:
      label: "QA Tier"
      options:
        - Quick (critical + high only)
        - Standard (+ medium)
        - Exhaustive (+ cosmetic)
      default: 1
```

**`.github/ISSUE_TEMPLATE/gstack-investigate.yml`:**
```yaml
name: "🔍 Bug Investigation"
description: "Request root-cause analysis of a bug"
labels: ["investigate"]
body:
  - type: textarea
    id: bug
    attributes:
      label: "Bug description"
      description: "What happened, what should have happened, steps to reproduce"
    validations:
      required: true
```

---

### Step 28 — Test Multi-Turn Conversation

**Test scenario:**
1. Open an issue with the `office-hours` label: "I want to build a notification system for my app"
2. Agent responds with probing questions about scope, users, channels
3. Comment with answers: "We need push, email, and in-app. About 10k users."
4. Agent responds with refined specification and architecture suggestions
5. Wait 3 days. Comment again: "What about rate limiting for notifications?"
6. Agent resumes with full context — remembers the prior conversation

**Verify:**
- Session file (`state/sessions/*.jsonl`) grows with each turn
- Issue mapping (`state/issues/{N}.json`) correctly points to session file
- Agent's replies reference prior conversation context
- Session survives across multiple workflow runs separated by days

---

## Exit Criteria

- [ ] Opening an issue with `office-hours` label starts a conversation
- [ ] `/plan-ceo-review` and `/plan-eng-review` commands work from issue comments
- [ ] `/design-consultation` label triggers the design consultation skill
- [ ] `/autoplan` runs the three-review pipeline
- [ ] Commenting on an existing session issue resumes the conversation with full context
- [ ] Session state persists across days/weeks
- [ ] Issue templates exist for office-hours, QA, and investigate

---

## Dependencies

- **Depends on:** Phase 1 (router, config, session management)
- **Unlocks:** Phase 5 (some event-driven skills use conversation patterns)

---

*Phase 4 of 7. See [README.md](README.md) for the full plan.*
