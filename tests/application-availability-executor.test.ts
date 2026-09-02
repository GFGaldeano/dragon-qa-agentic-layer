import {
  describe,
  expect,
  it
} from "vitest";

import {
  DragonConfig
} from "../src/core/config/schema";

import {
  TestScenario
} from "../src/core/contracts/types";

import {
  FailureAnalyzer
} from "../src/agents/failure-analyzer/failure-analyzer";

import {
  EvidenceManager
} from "../src/evidence/evidence-manager";

import {
  ApplicationAvailabilityExecutor
} from "../src/runners/executors/application-availability-executor";

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
  "ApplicationAvailabilityExecutor",
  () => {
    it(
      "executes application availability verification",
      async () => {
        const executor =
          new ApplicationAvailabilityExecutor(
            config,
            new EvidenceManager(),
            new FailureAnalyzer()
          );

        expect(
          executor.intentType
        ).toBe(
          "application-availability"
        );

        const scenario: TestScenario = {
          id: "S001",
          title:
            "Application availability",
          description:
            "Verify that the application is reachable.",
          kind: "smoke",
          executionMode: "automated",
          executionIntent: {
            type:
              "application-availability"
          },
          priority: "critical",
          expectedResult:
            "The application loads successfully."
        };

        const result =
          await executor.execute(
            scenario,
            {
              runDirectory:
                ".dragon-qa/test-runs",
              baseUrl:
                "data:text/html,<html><body>Dragon QA</body></html>"
            }
          );

        expect(result.status).toBe(
          "passed"
        );

        expect(result.verdict).toBe(
          "PASS"
        );
      }
    );

    it(
      "classifies connection failures as environment issues",
      async () => {
        const failureConfig:
          DragonConfig = {
          ...config,

          browser: {
            ...config.browser,
            timeoutMs: 3000
          }
        };

        const executor =
          new ApplicationAvailabilityExecutor(
            failureConfig,
            new EvidenceManager(),
            new FailureAnalyzer()
          );

        const scenario:
          TestScenario = {
          id: "S001",
          title:
            "Application availability",
          description:
            "Verify that the application is reachable.",
          kind: "smoke",
          executionMode: "automated",
          executionIntent: {
            type:
              "application-availability"
          },
          priority: "critical",
          expectedResult:
            "The application loads successfully."
        };

        const result =
          await executor.execute(
            scenario,
            {
              runDirectory:
                ".dragon-qa/test-runs",
              baseUrl:
                "http://127.0.0.1:65534"
            }
          );

        expect(result.status).toBe(
          "failed"
        );

        expect(result.verdict).toBe(
          "ENVIRONMENT"
        );

        expect(
          result.message.length
        ).toBeGreaterThan(0);
      }
    );
  }
);
