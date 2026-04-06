# `/land-and-deploy` — Land and Deploy

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

**Specialist:** Release Engineer
**Trigger:** `/land-and-deploy` comment on any issue
**Browser required:** Yes
**Default:** ✅ Enabled

---

## What It Does

`/land-and-deploy` is the final step in the shipping pipeline. After `/ship` creates a PR with tests, review, and version bump, `/land-and-deploy` takes over to:

1. **Merge the PR** — Lands the code into the target branch
2. **Wait for CI** — Monitors the CI pipeline until it passes
3. **Wait for deploy** — Watches the deployment pipeline for completion
4. **Verify production** — Runs canary checks against the live deployment to confirm everything is healthy

This is a sensitive operation — it touches production. The agent will confirm critical steps before proceeding.

---

## When To Use It

- After `/ship` has created a reviewed PR ready to merge
- When you want a fully automated merge → deploy → verify cycle
- When you're ready to say "land it" and walk away

---

## How To Trigger

Comment on any issue:

```
/land-and-deploy
```

You can also say "merge", "land", "deploy", "merge and verify", "land it", or "ship it to production".

---

## Example

```
/land-and-deploy

The PR from /ship is ready. Merge it, wait for the deploy, and verify the
pricing page loads correctly on production.
```

---

## Pipeline Flow

`/land-and-deploy` is the final step in the full shipping pipeline:

```
/review          → code quality gates
/ship            → tests, version bump, create PR
/land-and-deploy → merge, deploy, verify production
/canary          → ongoing post-deploy monitoring
```

---

## Related Commands

| Command | Relationship |
|---|---|
| [`/ship`](ship.md) | Creates the PR that `/land-and-deploy` merges |
| [`/canary`](canary.md) | Ongoing monitoring after deployment |
| [`/careful`](careful.md) | Consider using with deploy operations |
| [`/guard`](guard.md) | Maximum safety for production deploys |

---

## Configuration

```json
{
  "land-and-deploy": { "enabled": true, "trigger": "issue_comment" }
}
```

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/GSSI.jpg" alt="GStack Intelligence" width="120">
  </picture>
</p>
