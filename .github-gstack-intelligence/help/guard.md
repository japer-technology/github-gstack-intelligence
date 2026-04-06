# `/guard` — Full Safety Mode

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

**Specialist:** Safety Engineer
**Trigger:** `/guard` comment on any issue
**Browser required:** No
**Default:** ✅ Enabled

---

## What It Does

`/guard` combines `/careful` (destructive command warnings) with `/freeze` (directory-scoped edits) into a single maximum-safety mode. When active:

1. **Destructive command warnings** — Pauses and asks for confirmation before running `rm -rf`, `DROP TABLE`, `force-push`, `git reset --hard`, `kubectl delete`, and similar operations
2. **Directory-scoped edits** — Restricts all file edits to a specified directory, blocking writes outside the boundary

This is the highest safety setting available — use it when working on production systems or debugging live infrastructure.

---

## When To Use It

- Touching production databases or infrastructure
- Debugging live systems where an accidental edit could cause an outage
- Working in shared environments with critical data
- Any time you want maximum protection against accidental damage

---

## How To Trigger

Comment on any issue:

```
/guard
```

You can also say "guard mode", "full safety", "lock it down", or "maximum safety".

---

## Example

```
/guard

I need to investigate a production database issue. Lock edits to the ./scripts/ directory
and warn me before any destructive database commands.
```

---

## `/guard` vs `/careful`

| Feature | `/careful` | `/guard` |
|---|---|---|
| Destructive command warnings | ✅ | ✅ |
| Directory-scoped edit restriction | ❌ | ✅ |
| Best for | General safety net | Production work, live debugging |

---

## Related Commands

| Command | Relationship |
|---|---|
| [`/careful`](careful.md) | Destructive command warnings only (subset of `/guard`) |
| [`/investigate`](investigate.md) | Use with `/guard` when debugging production issues |
| [`/land-and-deploy`](land-and-deploy.md) | Consider `/guard` during deploy verification |

---

## Configuration

```json
{
  "guard": { "enabled": true, "trigger": "issue_comment" }
}
```

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence" width="120">
  </picture>
</p>
