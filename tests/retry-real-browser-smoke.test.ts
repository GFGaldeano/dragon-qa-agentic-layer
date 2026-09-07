import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { describe, expect, it } from "vitest";

import { DragonConfigSchema } from "../src/core/config/schema";
import type {
  DragonRunResult,
  TestScenario
} from "../src/core/contracts/types";
import { FailureAnalyzer } from "../src/agents/failure-analyzer/failure-analyzer";
import { EvidenceManager } from "../src/evidence/evidence-manager";
import { Reporter } from "../src/reporting/reporter";
import { PlaywrightRunner } from "../src/runners/playwright/playwright-runner";
import { ApplicationAvailabilityExecutor } from "../src/runners/executors/application-availability-executor";
import { ScenarioExecutorResolver } from "../src/runners/executors/scenario-executor-resolver";
import type { ScenarioExecutor } from "../src/runners/executors/scenario-executor";
import { resolveRetryOutcome } from "../src/core/verdicts/retry-outcome-policy";

describe("Real browser retry smoke", () => {
  it("recovers from a local connection failure and preserves evidence", async () => {
    const server: Server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<html><body>Dragon QA local smoke</body></html>");
    });

    const listen = async (port: number): Promise<void> => {
      server.listen(port, "127.0.0.1");
      await once(server, "listening");
    };

    const closeServer = async (): Promise<void> => {
      if (server.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close(error => error ? reject(error) : resolve());
        });
      }
    };

    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "dragon-qa-real-retry-")
    );

    console.info("[SMOKE] Artifacts:", root);

    try {
      // Reserve a local port, then close it before the first attempt.
      await listen(0);
      const address = server.address();

      if (!address || typeof address === "string") {
        throw new Error("Could not reserve a local TCP port.");
      }

      const port = address.port;
      await closeServer();

      const config = DragonConfigSchema.parse({
        project: {
          name: "real-retry-smoke",
          baseUrl: `http://127.0.0.1:${port}`
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
          timeoutMs: 5000
        },
        evidence: {
          screenshots: true,
          trace: true,
          video: false
        },
        reporting: {
          json: true,
          markdown: true
        },
        providers: {
          planner: "deterministic",
          failureAnalyzer: "deterministic"
        }
      });

      const evidenceManager = new EvidenceManager(
        path.join(root, "runs")
      );
      const failureAnalyzer = new FailureAnalyzer();

      const realExecutor = new ApplicationAvailabilityExecutor(
        config,
        evidenceManager,
        failureAnalyzer
      );

      let executions = 0;

      // Only the local server lifecycle is controlled.
      // Both attempts use the real browser executor.
      const controlledExecutor: ScenarioExecutor = {
        intentType: "application-availability",
        async execute(scenario, context) {
          executions++;

          const result = await realExecutor.execute(
            scenario,
            context
          );

          if (
            executions === 1 &&
            result.status === "failed" &&
            result.failure?.type === "network"
          ) {
            await listen(port);
          }

          return result;
        }
      };

      const runner = new PlaywrightRunner(
        config,
        evidenceManager,
        failureAnalyzer,
        new ScenarioExecutorResolver([controlledExecutor])
      );

      const scenario: TestScenario = {
        id: "S001",
        title: "Local availability recovery",
        description: "Recover from a local connection failure.",
        kind: "smoke",
        executionMode: "automated",
        executionIntent: { type: "application-availability" },
        priority: "critical",
        expectedResult: "The local page loads."
      };

      const runDirectory = evidenceManager.createRunDirectory(
        "local-smoke"
      );

      const startedAt = new Date().toISOString();

      const execution = await runner.executeWithHistory(
        scenario,
        {
          runDirectory,
          baseUrl: config.project.baseUrl
        }
      );

      const attempts = execution.history.attempts;

      expect(executions).toBe(2);
      expect(execution.history.retriesUsed).toBe(1);
      expect(attempts.map(a => a.attemptNumber)).toEqual([1, 2]);

      expect(attempts[0]?.result).toMatchObject({
        status: "failed",
        verdict: "ENVIRONMENT",
        failure: { type: "network" }
      });

      expect(attempts[0]?.decisionAfterAttempt).toEqual({
        shouldRetry: true,
        reason: "retry-allowed"
      });

      expect(attempts[1]?.result).toMatchObject({
        status: "passed",
        verdict: "PASS"
      });

      const outcome = resolveRetryOutcome(
        execution.history,
        "autonomous"
      );

      expect(outcome).toMatchObject({
        classification: "flaky",
        result: {
          status: "passed",
          verdict: "FLAKY"
        },
        humanApprovalRequired: true
      });

      if (!outcome.result) {
        throw new Error("Expected a final execution result.");
      }

      const evidence = outcome.result.evidence;

      expect(evidence.map(item => item.type).sort()).toEqual([
        "screenshot",
        "trace"
      ]);

      for (const item of evidence) {
        expect(fs.existsSync(item.path)).toBe(true);
        expect(
          path.relative(runDirectory, item.path)
        ).toContain(path.join("attempts", "attempt-2"));
      }

      const requirement = {
        text: "The local application must be reachable"
      };

      const run: DragonRunResult = {
        runId: "local-smoke",
        startedAt,
        completedAt: new Date().toISOString(),
        baseUrl: config.project.baseUrl,
        requirement,
        plan: {
          id: "local-smoke-plan",
          requirement,
          createdAt: startedAt,
          scenarios: [scenario]
        },
        results: [outcome.result],
        retryHistories: [{
          scenarioId: scenario.id,
          retriesUsed: execution.history.retriesUsed,
          attempts: [...attempts]
        }],
        finalVerdict: outcome.result.verdict,
        humanApprovalRequired: outcome.humanApprovalRequired
      };

      const reporter = new Reporter();
      const jsonPath = reporter.writeJson(run, runDirectory);
      const markdownPath = reporter.writeMarkdown(run, runDirectory);

      const persisted = JSON.parse(
        fs.readFileSync(jsonPath, "utf8")
      );

      expect(persisted.finalVerdict).toBe("FLAKY");
      expect(persisted.humanApprovalRequired).toBe(true);
      expect(persisted.retryHistories[0].attempts).toHaveLength(2);

      const markdown = fs.readFileSync(markdownPath, "utf8");

      expect(markdown).toContain("## Retry History");
      expect(markdown).toContain("retry-allowed");
      expect(markdown).toContain("Human QA approval is required");

      console.info("[SMOKE] JSON:", jsonPath);
      console.info("[SMOKE] Markdown:", markdownPath);
      console.info("[SMOKE] Result: FLAKY / approval required");
    } finally {
      await closeServer();
      // Artifacts are intentionally preserved for manual inspection.
    }
  });
});
