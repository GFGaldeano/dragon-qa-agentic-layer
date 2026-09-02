import {
  describe,
  expect,
  it
} from "vitest";

import {
  DragonConfig
} from "../src/core/config/schema";

import {
  TestExecutionResult,
  TestScenario
} from "../src/core/contracts/types";

import {
  FailureAnalyzer
} from "../src/agents/failure-analyzer/failure-analyzer";

import {
  EvidenceManager
} from "../src/evidence/evidence-manager";

import {
  PlaywrightRunner
} from "../src/runners/playwright/playwright-runner";

import {
  ScenarioExecutor,
  ScenarioExecutorContext
} from "../src/runners/executors/scenario-executor";

import {
  ScenarioExecutorResolver
} from "../src/runners/executors/scenario-executor-resolver";

const config: DragonConfig = {
  project: {
    name: "integration-hardening",
    baseUrl: "https://example.com"
  },
  autonomy: {
    level: "assist"
  },
  testing: {
    ui: true,
    api: false,
    accessibility: false,
    visual: false
  },
  browser: {
    engine: "chromium",
    headless: true,
    timeoutMs: 30000
  },
  evidence: {
    screenshots: false,
    trace: false,
    video: false
  },
  reporting: {
    markdown: false,
    json: false
  },
  providers: {
    planner: "deterministic",
    failureAnalyzer: "deterministic"
  }
};

const scenario: TestScenario = {
  id: "S001",
  title: "Unexpected executor failure",
  description:
    "Exercise the executor failure boundary.",
  kind: "smoke",
  executionMode: "automated",
  executionIntent: {
    type: "application-availability"
  },
  priority: "critical",
  expectedResult:
    "Unexpected executor failures require review."
};

class ThrowingExecutor
implements ScenarioExecutor {
  readonly intentType =
    "application-availability" as const;

  async execute(
    _scenario: TestScenario,
    _context: ScenarioExecutorContext
  ): Promise<TestExecutionResult> {
    throw new Error(
      "executor exploded"
    );
  }
}

describe(
  "PlaywrightRunner unexpected executor failures",
  () => {
    it(
      "fails closed with an explicit executor failure message",
      async () => {
        const resolver =
          new ScenarioExecutorResolver([
            new ThrowingExecutor()
          ]);

        const runner =
          new PlaywrightRunner(
            config,
            new EvidenceManager(),
            new FailureAnalyzer(),
            resolver
          );

        const result =
          await runner.execute(
            scenario,
            {
              runDirectory:
                ".dragon-qa/test-run",
              baseUrl:
                config.project.baseUrl
            }
          );

        expect(result.status).toBe(
          "review"
        );

        expect(result.verdict).toBe(
          "REVIEW"
        );

        expect(result.message).toBe(
          "Unexpected scenario executor failure: executor exploded"
        );

        expect(result.evidence).toEqual(
          []
        );
      }
    );
  }
);
