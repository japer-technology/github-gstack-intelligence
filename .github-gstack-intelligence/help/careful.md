# `/careful` — Safety Guardrails

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

**Specialist:** Safety Engineer
**Trigger:** `/careful` comment on any issue
**Browser required:** No
**Default:** ✅ Enabled

---

## What It Does

`/careful` activates safety guardrails that warn before destructive commands are executed. When active, the agent will pause and ask for confirmation before running operations like:

- `rm -rf` — recursive file deletion
- `DROP TABLE` / `DROP DATABASE` — database destruction
- `git push --force` / `git reset --hard` — history rewriting
- `kubectl delete` — Kubernetes resource removal
- Other destructive shell operations

Common build cleanup commands (like `rm -rf node_modules` or `rm -rf dist`) are whitelisted and won't trigger warnings.

---

## When To Use It

- Working on or near production systems
- Debugging live infrastructure
- Operating in shared environments
- Any time you want an extra safety net before destructive operations

---

## How To Trigger

Comment on any issue:

```
/careful
```

You can also say "be careful", "safety mode", "prod mode", or "careful mode" in your issue or comment.

---

## Example

```
/careful

I need to clean up the staging database — drop the old migration tables and redeploy.
```

The agent will proceed with your request but pause before any destructive command, showing you exactly what it plans to run and waiting for your approval.

---

## Related Commands

| Command | Relationship |
|---|---|
| [`/guard`](guard.md) | Combines `/careful` with `/freeze` for maximum safety |
| [`/ship`](ship.md) | Use `/careful` when shipping to production |
| [`/land-and-deploy`](land-and-deploy.md) | Safety guardrails are especially useful during deploys |

---

## Configuration

```json
{
  "careful": { "enabled": true, "trigger": "issue_comment" }
}
```

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence" width="120">
  </picture>
</p>
