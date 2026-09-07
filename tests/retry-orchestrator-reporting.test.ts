import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import type { DragonConfig } from "../src/core/config/schema";
import type {
  TestExecutionResult,
  TestScenario
} from "../src/core/contracts/types";
import { RetryAttemptHistory } from "../src/core/retry/retry-attempt-history";

const runnerMock = vi.hoisted(() => ({
  executeWithHistory: vi.fn()
}));

vi.mock("../src/runners/playwright/playwright-runner", () => ({
  PlaywrightRunner: class {
    executeWithHistory(scenario: TestScenario) {
      return runnerMock.executeWithHistory(scenario);
    }
  }
}));

import { DragonOrchestrator } from "../src/core/orchestration/dragon-orchestrator";

const config: DragonConfig = {
  project: {
    name: "retry-reporting-integration",
    baseUrl: "data:text/html,<html><body>Dragon QA</body></html>"
  },
  autonomy: { level: "autonomous" },
  retry: {
    enabled: true,
    maxRetries: 1,
    retryableFailureTypes: ["network"]
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

function makeResult(
  scenario: TestScenario,
  overrides: Partial<TestExecutionResult> = {}
): TestExecutionResult {
  return {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    status: "passed",
    verdict: "PASS",
    durationMs: 10,
    message: "Recovered.",
    evidence: [],
    ...overrides
  };
}

describe("Retry orchestrator reporting", () => {
  it("persists recovery history and requires human approval", async () => {
    runnerMock.executeWithHistory.mockReset();

    runnerMock.executeWithHistory.mockImplementation(
      async (scenario: TestScenario) => {
        const history = new RetryAttemptHistory(scenario.id);

        if (
          scenario.executionMode === "automated" &&
          scenario.executionIntent?.type === "application-availability"
        ) {
          history.recordAttempt(
            makeResult(scenario, {
              status: "failed",
              verdict: "ENVIRONMENT",
              message: "Connection refused.",
              evidence: [{
                type: "screenshot",
                path: `attempts/attempt-1/${scenario.id}/page.png`
              }],
              failure: {
                type: "network",
                message: "Connection refused."
              }
            }),
            {
              shouldRetry: true,
              reason: "retry-allowed"
            }
          );

          const result = makeResult(scenario, {
            evidence: [{
              type: "trace",
              path: `attempts/attempt-2/${scenario.id}/trace.zip`
            }]
          });

          history.recordAttempt(result);
          return { result, history };
        }

        const result = makeResult(scenario, {
          status: "review",
          verdict: "REVIEW",
          message: "Manual QA review required."
        });

        history.recordAttempt(result);
        return { result, history };
      }
    );

    const execution = await new DragonOrchestrator(config).run(
      "The application must be reachable"
    );

    try {
      const run = execution.result;

      expect(runnerMock.executeWithHistory).toHaveBeenCalledTimes(
        run.plan.scenarios.length
      );

      const recovered = run.results.find(
        result => result.verdict === "FLAKY"
      );

      expect(recovered).toBeDefined();

      if (!recovered) {
        throw new Error("Expected a recovered scenario.");
      }

      expect(recovered.status).toBe("passed");
      expect(run.finalVerdict).toBe("FLAKY");
      expect(run.humanApprovalRequired).toBe(true);

      const history = run.retryHistories?.find(
        item => item.scenarioId === recovered.scenarioId
      );

      expect(history?.retriesUsed).toBe(1);
      expect(history?.attempts).toHaveLength(2);
      expect(history?.attempts[0]?.result.verdict).toBe("ENVIRONMENT");
      expect(history?.attempts[0]?.decisionAfterAttempt).toEqual({
        shouldRetry: true,
        reason: "retry-allowed"
      });
      expect(history?.attempts[1]?.result.verdict).toBe("PASS");

      const persisted = JSON.parse(
        fs.readFileSync(
          path.join(execution.runDirectory, "report.json"),
          "utf8"
        )
      ) as typeof run;

      expect(persisted.finalVerdict).toBe("FLAKY");
      expect(persisted.humanApprovalRequired).toBe(true);
      expect(persisted.retryHistories).toEqual(
        JSON.parse(JSON.stringify(run.retryHistories))
      );

      const markdown = fs.readFileSync(
        path.join(execution.runDirectory, "report.md"),
        "utf8"
      );

      expect(markdown).toContain("## Retry History");
      expect(markdown).toContain("Attempt 1");
      expect(markdown).toContain("Attempt 2");
      expect(markdown).toContain("retry-allowed");
      expect(markdown).toContain("Connection refused.");
      expect(markdown).toContain(
        `attempts/attempt-1/${recovered.scenarioId}/page.png`
      );
      expect(markdown).toContain(
        `attempts/attempt-2/${recovered.scenarioId}/trace.zip`
      );
    } finally {
      fs.rmSync(execution.runDirectory, {
        recursive: true,
        force: true
      });
    }
  });
});
