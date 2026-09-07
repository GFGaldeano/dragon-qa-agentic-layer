import fs from "node:fs";

import {
  describe,
  expect,
  it
} from "vitest";

import type {
  DragonConfig
} from "../src/core/config/schema";

import {
  DragonOrchestrator
} from "../src/core/orchestration/dragon-orchestrator";

const config: DragonConfig = {
  project: {
    name: "retry-orchestrator-test",
    baseUrl:
      "data:text/html,<html><body>Dragon QA</body></html>"
  },
  autonomy: {
    level: "autonomous"
  },
  retry: {
    enabled: false,
    maxRetries: 1,
    retryableFailureTypes: [
      "network",
      "timeout"
    ]
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

describe("Retry orchestrator integration", () => {
  it(
    "exposes one serializable attempt history per scenario when retries are disabled",
    async () => {
      const execution =
        await new DragonOrchestrator(config).run(
          "The application must be reachable"
        );

      try {
        const run = execution.result as
          typeof execution.result & {
            retryHistories?: Array<{
              scenarioId: string;
              retriesUsed: number;
              attempts: Array<{
                attemptNumber: number;
                result: {
                  scenarioId: string;
                };
              }>;
            }>;
          };

        expect(run.results.length).toBeGreaterThan(0);
        expect(run.retryHistories).toBeDefined();

        const histories = run.retryHistories;

        if (!histories) {
          throw new Error(
            "Expected retry histories in the run result."
          );
        }

        expect(histories).toHaveLength(
          run.results.length
        );

        for (const result of run.results) {
          const history = histories.find(
            item => item.scenarioId === result.scenarioId
          );

          expect(history).toBeDefined();
          expect(history?.retriesUsed).toBe(0);
          expect(history?.attempts).toHaveLength(1);
          expect(
            history?.attempts[0]?.attemptNumber
          ).toBe(1);
          expect(
            history?.attempts[0]?.result.scenarioId
          ).toBe(result.scenarioId);
        }

        expect(() =>
          JSON.stringify(run.retryHistories)
        ).not.toThrow();
      } finally {
        fs.rmSync(
          execution.runDirectory,
          {
            recursive: true,
            force: true
          }
        );
      }
    }
  );
});
