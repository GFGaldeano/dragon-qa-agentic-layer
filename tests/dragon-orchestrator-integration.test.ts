import fs from "node:fs";

import {
  describe,
  expect,
  it
} from "vitest";

import {
  DragonConfig
} from "../src/core/config/schema";

import {
  DragonOrchestrator
} from "../src/core/orchestration/dragon-orchestrator";

const config: DragonConfig = {
  project: {
    name:
      "orchestrator-integration-hardening",
    baseUrl:
      "data:text/html,<html><body>Dragon QA</body></html>"
  },

  autonomy: {
    level: "autonomous"
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

describe(
  "DragonOrchestrator integration governance",
  () => {
    it(
      "requires human approval when an autonomous run still contains review results",
      async () => {
        const orchestrator =
          new DragonOrchestrator(
            config
          );

        const execution =
          await orchestrator.run(
            "The application must be reachable"
          );

        try {
          expect(
            execution.result.results.some(
              (result) =>
                result.verdict ===
                "REVIEW"
            )
          ).toBe(true);

          expect(
            execution.result.finalVerdict
          ).toBe("REVIEW");

          expect(
            execution.result
              .humanApprovalRequired
          ).toBe(true);
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

    it(
      "preserves a dominant technical verdict while still requiring human approval",
      async () => {
        const failureConfig:
          DragonConfig = {
          ...config,

          project: {
            ...config.project,
            baseUrl:
              "http://127.0.0.1:65534"
          },

          browser: {
            ...config.browser,
            timeoutMs: 3000
          }
        };

        const orchestrator =
          new DragonOrchestrator(
            failureConfig
          );

        const execution =
          await orchestrator.run(
            "The application must be reachable"
          );

        try {
          expect(
            execution.result.results.some(
              (result) =>
                result.verdict ===
                "ENVIRONMENT"
            )
          ).toBe(true);

          expect(
            execution.result.results.some(
              (result) =>
                result.verdict ===
                "REVIEW"
            )
          ).toBe(true);

          expect(
            execution.result.finalVerdict
          ).toBe("ENVIRONMENT");

          expect(
            execution.result
              .humanApprovalRequired
          ).toBe(true);
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
  }
);
