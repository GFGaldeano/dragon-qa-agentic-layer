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
  ScenarioExecutor
} from "../src/runners/executors/scenario-executor";

import {
  ScenarioExecutorResolver
} from "../src/runners/executors/scenario-executor-resolver";

import {
  PlaywrightRunner
} from "../src/runners/playwright/playwright-runner";

const config: DragonConfig = {
  project: {
    name: "test-project",
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
    markdown: true,
    json: true
  },
  providers: {
    planner: "deterministic",
    failureAnalyzer: "deterministic"
  }
};

describe(
  "PlaywrightRunner",
  () => {
    it(
      "delegates automated execution to the resolved scenario executor",
      async () => {
        let receivedScenario:
          TestScenario | undefined;

        let receivedBaseUrl:
          string | undefined;

        const delegatedResult:
          TestExecutionResult = {
            scenarioId: "S001",
            scenarioTitle:
              "Application availability",
            status: "passed",
            verdict: "PASS",
            durationMs: 1,
            message:
              "Executed by fake scenario executor.",
            evidence: []
          };

        const executor:
          ScenarioExecutor = {
            intentType:
              "application-availability",

            async execute(
              scenario,
              context
            ) {
              receivedScenario =
                scenario;

              receivedBaseUrl =
                context.baseUrl;

              return delegatedResult;
            }
          };

        const resolver =
          new ScenarioExecutorResolver([
            executor
          ]);

        const runner =
          new PlaywrightRunner(
            config,
            new EvidenceManager(),
            new FailureAnalyzer(),
            resolver
          );

        const scenario:
          TestScenario = {
            id: "S001",
            title:
              "Application availability",
            description:
              "Verify that the application is reachable.",
            kind: "smoke",
            executionMode:
              "automated",
            executionIntent: {
              type:
                "application-availability"
            },
            priority: "critical",
            expectedResult:
              "The application loads successfully."
          };

        const result =
          await runner.execute(
            scenario,
            {
              runDirectory:
                ".dragon-qa/test-runs",
              baseUrl:
                "https://should-not-be-opened.invalid"
            }
          );

        expect(result).toBe(
          delegatedResult
        );

        expect(
          receivedScenario
        ).toBe(scenario);

        expect(
          receivedBaseUrl
        ).toBe(
          "https://should-not-be-opened.invalid"
        );
      }
    );

    it(
      "fails closed when an automated scenario has no execution intent",
      async () => {
        const runner =
          new PlaywrightRunner(
            config,
            new EvidenceManager(),
            new FailureAnalyzer()
          );

        const scenario:
          TestScenario = {
            id: "S999",
            title:
              "Untrusted automated scenario",
            description:
              "Scenario marked automated without a trusted execution intent.",
            kind: "smoke",
            executionMode:
              "automated",
            priority: "critical",
            expectedResult:
              "The scenario must not execute automatically."
          };

        const result =
          await runner.execute(
            scenario,
            {
              runDirectory:
                ".dragon-qa/test-runs",
              baseUrl:
                "https://example.com"
            }
          );

        expect(result.status).toBe(
          "review"
        );

        expect(result.verdict).toBe(
          "REVIEW"
        );

        expect(result.evidence).toEqual(
          []
        );
      }
    );

    it(
      "fails closed when no executor is registered for the execution intent",
      async () => {
        const runner =
          new PlaywrightRunner(
            config,
            new EvidenceManager(),
            new FailureAnalyzer(),
            new ScenarioExecutorResolver()
          );

        const scenario:
          TestScenario = {
            id: "S002",
            title:
              "Application availability without executor",
            description:
              "Verify fail-closed behavior when no executor is registered.",
            kind: "smoke",
            executionMode:
              "automated",
            executionIntent: {
              type:
                "application-availability"
            },
            priority: "critical",
            expectedResult:
              "The scenario must not execute without a registered executor."
          };

        const result =
          await runner.execute(
            scenario,
            {
              runDirectory:
                ".dragon-qa/test-runs",
              baseUrl:
                "https://should-not-be-opened.invalid"
            }
          );

        expect(result.status).toBe(
          "review"
        );

        expect(result.verdict).toBe(
          "REVIEW"
        );

        expect(result.message).toBe(
          "No scenario executor registered for intent: application-availability"
        );

        expect(result.evidence).toEqual(
          []
        );
      }
    );
  }
);
