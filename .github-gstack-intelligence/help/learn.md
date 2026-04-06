# `/learn` — Project Learnings Manager

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

**Specialist:** Memory Manager
**Trigger:** `/learn` comment on any issue
**Browser required:** No
**Default:** ✅ Enabled

---

## What It Does

`/learn` manages what the agent has learned across sessions. It provides tools to review, search, prune, and export project-specific patterns and preferences that the agent has accumulated over time.

Key capabilities:

- **Review learnings** — See everything the agent has learned about your project
- **Search** — Find specific patterns, conventions, or past decisions
- **Prune** — Remove stale or incorrect learnings that no longer apply
- **Export** — Extract learnings as documentation or configuration

---

## When To Use It

- When you wonder "didn't we fix this before?" or "what did we decide about X?"
- To audit what the agent knows about your project
- To clean up outdated patterns after a major refactor
- To onboard new team members by showing accumulated project knowledge
- After major changes to prune learnings that no longer apply

---

## How To Trigger

Comment on any issue:

```
/learn
```

You can also say "what have we learned", "show learnings", "prune stale learnings", or "export learnings".

---

## Examples

**Review all learnings:**
```
/learn

Show me everything you've learned about this project.
```

**Search for specific patterns:**
```
/learn

What do you know about our authentication patterns?
```

**Prune stale learnings:**
```
/learn

We just migrated from REST to GraphQL. Prune any learnings about REST endpoints.
```

---

## How It Relates to Git Memory

The agent's primary memory is Git — session transcripts committed to `state/sessions/`. `/learn` provides a higher-level view of the patterns extracted from those sessions, making accumulated knowledge searchable and manageable.

---

## Related Commands

| Command | Relationship |
|---|---|
| [`/retro`](retro.md) | Retrospectives generate new learnings from recent work |
| [`/office-hours`](office-hours.md) | Discovery sessions often establish foundational project patterns |
| [`/investigate`](investigate.md) | Root cause investigations add debugging patterns to learnings |

---

## Configuration

```json
{
  "learn": { "enabled": true, "trigger": "issue_comment" }
}
```

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence" width="120">
  </picture>
</p>
