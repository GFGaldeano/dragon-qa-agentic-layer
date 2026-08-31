# DRAGON QA Agentic Layer — Architecture

## Design principles

DRAGON QA is designed as a reusable Quality Engineering layer that can be attached to existing software projects without replacing their testing stack.

Core principles:

1. Human-in-the-loop by default.
2. Provider-agnostic AI architecture.
3. Playwright-native browser automation.
4. Deterministic execution where possible.
5. Evidence-first QA.
6. Explicit QA verdicts.
7. Extensible adapters and providers.
8. Project-independent core.

## Initial pipeline

Requirement

→ Requirements Agent

→ Test Planner

→ Test Plan

→ Execution Layer

→ Evidence Collection

→ Failure Analyzer

→ QA Verdict

→ Human QA Validation

## Autonomy levels

### observe

Analysis only.

### assist

Generate recommendations and tests while keeping execution and official QA decisions under human control.

Default mode.

### execute

Execute previously approved automated tests.

### autonomous

Future opt-in mode for controlled autonomous workflows.

## v0.1.0 scope

The first version intentionally does not include:

- dashboard
- database
- distributed queues
- Kubernetes
- multi-tenancy
- mandatory LLM integration

The goal is to prove the QA workflow first.