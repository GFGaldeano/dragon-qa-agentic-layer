# DRAGON QA Agentic Layer

> Agentic Quality Engineering for Modern SDLC.

**DRAGON QA Agentic Layer** is an extensible Quality Engineering framework designed to add AI-assisted and agentic QA capabilities to existing software projects.

> AI assists QA. Evidence supports decisions. Humans retain control.

## Status

Current development version: **v0.1.0-alpha**

## Core Flow

```text
Requirement
    |
    v
Requirements Agent
    |
    v
Test Planner
    |
    v
Test Plan
    |
    v
Playwright Runner
    |
    v
Evidence Engine
    |
    v
Failure Analyzer
    |
    v
QA Verdict
    |
    v
Human QA Approval
```

## Current capabilities

- CLI-first architecture
- YAML project configuration
- Requirement normalization
- Deterministic test planning
- Playwright browser execution
- Screenshot collection
- Playwright tracing
- Optional video capture
- Failure classification
- JSON reports
- Markdown reports
- Human-in-the-loop QA verdicts

## Requirements

- Node.js 20+
- npm
- Playwright Chromium

## Install

```bash
npm install
npx playwright install chromium
npm run typecheck
npm test
npm run build
```

## Initialize DRAGON QA

```bash
npm run dragon -- init
```

This generates:

```text
dragon-qa.config.yaml
.dragon-qa/
â””â”€â”€ runs/
```

## Run

```bash
npm run dragon -- run --url https://example.com --requirement "The website must be reachable"
```

## Autonomy levels

- `observe` - analyze only
- `assist` - propose and generate with human validation
- `execute` - execute approved automation
- `autonomous` - future controlled opt-in mode

Default mode: **assist**.

## Evidence

Each execution creates:

```text
.dragon-qa/
â””â”€â”€ runs/
    â””â”€â”€ <run-id>/
        â”œâ”€â”€ report.json
        â”œâ”€â”€ report.md
        â””â”€â”€ S001/
            â”œâ”€â”€ page.png
            â””â”€â”€ trace.zip
```

## Design principles

1. Human-in-the-loop by default.
2. Provider-agnostic AI architecture.
3. Playwright-native automation.
4. Deterministic execution where possible.
5. Evidence-first QA.
6. Explicit QA verdicts.
7. Extensible adapters and providers.
8. Project-independent core.

## Planned integrations

- Anthropic / Claude
- OpenAI
- MCP
- Jira
- OpenAPI
- GitHub
- Accessibility testing
- Visual QA
- API testing
- Exploratory testing
- Self-healing
- CI/CD

## Author

**Gustavo Federico Galdeano**

Dragon Pyramid

## License

MIT
