# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, **do not open a public issue.** Instead, use GitHub's [Security Advisory](../../security/advisories) feature to report it privately.

## Security Documentation

| Document | Description |
|----------|-------------|
| [ETHOS](ETHOS.md) | Builder principles including User Sovereignty — AI recommends, humans decide |
| [CONTRIBUTING](CONTRIBUTING.md) | Contribution guidelines with security review requirements |
| [The Githubification](docs/GITHUBIFICATION.md) | How the GitHub-as-infrastructure model handles security boundaries |

## Security Model

- **Authorization:** Only users with `admin`, `maintain`, or `write` permissions can trigger the agent
- **Bot-loop prevention:** Agent detects its own comments to prevent infinite loops
- **Credential isolation:** All API keys stored as GitHub Secrets, never hardcoded
- **Audit trail:** Every agent action is committed to git for full traceability
- **Public repos:** Session history is visible to everyone — use a private repo for sensitive work

## Supported Versions

Only the latest version on the `main` branch is actively supported with security updates.
