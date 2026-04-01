### [GitHub GStack Intelligence](.github-gstack-intelligence/README.md)

Allows any GitHub repository to access _Garry Tam's GStack AI Engineering Team_ using GitHub Actions as Infrastructure.

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-gstack-intelligence/main/.github-gstack-intelligence/yc-ceo.png" alt="GStack Intelligence" width="500">
  </picture>
</p>

### The Repo is the Mind

Seventeen specialists covering PR review, security audit, QA testing with a real browser, architecture review, weekly retrospectives, and release documentation. All triggered by the natural events of software development through a single workflow file. No installation. No CLI. No Claude Code subscription. Just GitHub.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) ![AI](https://img.shields.io/badge/Assisted-Development-2b2bff?logo=openai&logoColor=white) [![github-minimum-intelligence-agent](https://github.com/japer-technology/github-gstack-intelligence/actions/workflows/github-gstack-intelligence-agent.yml/badge.svg)](https://github.com/japer-technology/github-gstack-intelligence/actions/workflows/github-gstack-intelligence-agent.yml)

### Installation

1. Copy [`.github/workflows/github-gstack-intelligence-agent.yml`](../.github/workflows/github-gstack-intelligence-agent.yml) into your repo's `.github/workflows/` directory.
2. Add the LLM API key `OPENAI_API_KEY` as a **repository secret** under **[Settings → Secrets and variables → Actions]**. Any [supported LLM provider](#supported-providers) can work but to quick start OpenAI GPT 5.4 is pre-configured.
3. Go to **[Actions → github-gstack-intelligence-agent → Run workflow]** to install the agent files automatically, subsequent runs perform upgrades.
4. Open an issue → the agent will reply.
