# /cso — Security Audit (Chief Security Officer)

Chief Security Officer audit performing secrets archaeology, dependency supply chain analysis, CI/CD pipeline security review, LLM/AI integration security checks, and OWASP Top 10 / STRIDE threat modeling. Produces a Security Posture Report without making code changes.

---

## Trigger

| Event | Condition | Manual |
|---|---|---|
| `pull_request` | Automatic when the PR has the `security-audit` label | Comment `/cso` on an issue |

The `/cso` skill is **label-gated** — it only triggers automatically on pull requests that carry the `security-audit` label. It can also be invoked manually by commenting `/cso` on any issue.

---

## How to Use

**Automatic:** Add the `security-audit` label to a pull request. The audit runs on the next PR event.

**Manual:** Comment on an issue:

```
/cso
```

### Arguments

| Command | Mode | Description |
|---|---|---|
| `/cso` | Daily (default) | Full audit, all phases, 8/10 confidence gate for zero noise |
| `/cso --comprehensive` | Monthly deep scan | All phases, 2/10 confidence bar — surfaces more findings |
| `/cso --infra` | Infrastructure only | Phases 0–6, 12–14 |
| `/cso --code` | Code only | Phases 0–1, 7, 9–11, 12–14 |
| `/cso --skills` | Skill supply chain | Phases 0, 8, 12–14 |
| `/cso --diff` | Branch changes only | Combinable with any scope flag |
| `/cso --supply-chain` | Dependency audit | Phases 0, 3, 12–14 |
| `/cso --owasp` | OWASP Top 10 only | Phases 0, 9, 12–14 |
| `/cso --scope auth` | Focused domain | Audit a specific domain (e.g., `auth`, `payments`) |

> **Scope flags are mutually exclusive.** If multiple scope flags are passed, the skill errors immediately — security tooling must never silently ignore user intent.

> **`--diff` is combinable** with any scope flag and with `--comprehensive`.

---

## What It Does

The `/cso` skill runs a multi-phase security audit. It does **not** make code changes — it produces a read-only Security Posture Report with findings, severity ratings, and remediation plans.

### Audit Phases

| Phase | Name | What It Checks |
|---|---|---|
| 0 | Architecture Mental Model | Builds a security-relevant map of the codebase |
| 1 | Attack Surface Mapping | Entry points, exposed APIs, trust boundaries |
| 2 | Secrets Archaeology | Scans git history for exposed keys, tokens, credentials |
| 3 | Dependency Supply Chain | Known CVEs, typosquatting, unmaintained packages |
| 4 | CI/CD Pipeline Security | Workflow permissions, artifact integrity, secret exposure in logs |
| 5 | Infrastructure Review | Cloud config, network exposure, storage permissions |
| 6 | Webhook Security | Inbound webhook validation, signature verification |
| 7 | LLM/AI Security | Prompt injection, output trust boundaries, data leakage |
| 8 | Skill Supply Chain | Third-party skill/plugin security review |
| 9 | OWASP Top 10 | Injection, broken auth, SSRF, security misconfiguration, etc. |
| 10 | STRIDE Threat Model | Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation |
| 11 | Data Classification | PII handling, encryption at rest/transit, retention policies |
| 12 | False Positive Filtering | Removes noise with confidence-based filtering |
| 13 | Findings Report | Structured report with severity, evidence, and remediation |
| 14 | Trend Tracking | Compares against previous audits for progress/regression |

### Two Confidence Modes

- **Daily mode (default):** 8/10 confidence gate — only surfaces high-confidence findings for zero noise in routine audits.
- **Comprehensive mode (`--comprehensive`):** 2/10 confidence bar — surfaces everything for monthly deep scans. More findings, more noise, more coverage.

---

## Example Output

```
## Security Posture Report — PR #55

**Mode:** Daily (8/10 confidence gate)
**Scope:** Full audit

### Secrets Archaeology
✅ No exposed secrets found in git history

### Dependency Supply Chain
⚠️ `lodash@4.17.20` — known prototype pollution (CVE-2021-23337), upgrade to 4.17.21+
⚠️ `jsonwebtoken@8.5.1` — algorithm confusion vulnerability, upgrade to 9.0.0+

### CI/CD Pipeline
✅ No secret exposure in workflow logs
⚠️ `.github/workflows/deploy.yml` — uses `pull_request_target` with checkout of PR head (potential code injection)

### OWASP Top 10
🔴 **A03:2021 Injection** — unsanitized user input in `src/search.ts:89`
⚠️ **A07:2021 Authentication** — session token not rotated after privilege change

### Threat Model (STRIDE)
| Threat | Risk | Notes |
|--------|------|-------|
| Spoofing | Low | Auth uses standard JWT with proper validation |
| Tampering | Medium | API accepts unsigned payloads on 2 endpoints |
| Repudiation | Low | Audit logging present |
| Info Disclosure | Low | No PII in logs |
| Denial of Service | Low | Rate limiting configured |
| Elevation of Privilege | Low | RBAC properly enforced |

### Remediation Plan
1. 🔴 Fix injection in `src/search.ts:89` — parameterize query (est. 15 min)
2. ⚠️ Upgrade `lodash` to 4.17.21+ (est. 5 min)
3. ⚠️ Rotate session token on privilege change (est. 30 min)
```

---

## Configuration

In [`config.json`](../config.json):

```json
{
  "cso": {
    "enabled": true,
    "trigger": "pull_request",
    "labelGated": true,
    "label": "security-audit"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Set to `false` to disable the skill |
| `trigger` | `string` | GitHub event type — `pull_request` |
| `labelGated` | `boolean` | When `true`, the skill only triggers if the specified label is present |
| `label` | `string` | The label that gates activation — `security-audit` |

---

## Requirements

| Requirement | Details |
|---|---|
| Browser | ❌ Not needed |
| Model | Default model from config (`gpt-5.4`) recommended |
| Permissions | `admin`, `maintain`, or `write` on the repository |
| Tools | Bash, Read, Grep, Glob, Write, Agent, WebSearch |

---

## Results

Security audit outcomes are persisted to:

```
.github-gstack-intelligence/state/results/security/pr-{N}.json
```

Each report includes findings with severity, evidence, and remediation plans. Trend tracking compares against previous audit runs to show security posture changes over time.

---

## Related Files

| File | Purpose |
|---|---|
| [`skills/cso.md`](../skills/cso.md) | Skill prompt definition |
| [`skills/references/cso-acknowledgements.md`](../skills/references/cso-acknowledgements.md) | Credits for security research sources that informed the skill |
| [`config.json`](../config.json) | Skill enablement and trigger configuration |
| [`lifecycle/router.ts`](../lifecycle/router.ts) | Event routing — maps GitHub events to skills |

---

## See Also

- [`/review`](review.md) — PR code review (complementary — `/review` finds code issues, `/cso` finds security issues)

---

[← Back to Command Reference](README.md)
