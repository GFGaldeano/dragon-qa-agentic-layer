import path from "node:path";

import {
  describe,
  expect,
  it
} from "vitest";

import type {
  DragonConfig
} from "../src/core/config/schema";

import type {
  RetryPolicyConfig
} from "../src/core/config/retry-policy-schema";

import type {
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
  RetryAttemptHistory
} from "../src/core/retry/retry-attempt-history";

import {
  ScenarioExecutorResolver
} from "../src/runners/executors/scenario-executor-resolver";

import type {
  ScenarioExecutor,
  ScenarioExecutorContext
} from "../src/runners/executors/scenario-executor";

import {
  PlaywrightRunner
} from "../src/runners/playwright/playwright-runner";

const retryPolicy: RetryPolicyConfig = {
  enabled: true,
  maxRetries: 1,
  retryableFailureTypes: [
    "network",
    "timeout"
  ]
};

function makeConfig(
  retry?: RetryPolicyConfig
): DragonConfig {
  return {
    project: {
      name: "retry-runner-test",
      baseUrl: "https://example.com"
    },
    autonomy: {
      level: "assist"
    },
    retry,
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
}

const scenario: TestScenario = {
  id: "S001",
  title: "Retry scenario",
  description: "Exercise bounded retry execution.",
  kind: "smoke",
  executionMode: "automated",
  executionIntent: {
    type: "application-availability"
  },
  priority: "critical",
  expectedResult: "The application is reachable."
};

const context = {
  runDirectory: ".dragon-qa/retry-contract-test",
  baseUrl: "https://example.com"
};

function makeResult(
  overrides: Partial<TestExecutionResult> = {}
): TestExecutionResult {
  return {
    scenarioId: "S001",
    scenarioTitle: "Retry scenario",
    status: "failed",
    verdict: "ENVIRONMENT",
    durationMs: 10,
    message: "Execution failed.",
    evidence: [],
    ...overrides
  };
}

const networkFailure = makeResult({
  failure: {
    type: "network",
    message: "Connection refused."
  }
});

const success = makeResult({
  status: "passed",
  verdict: "PASS",
  message: "Recovery succeeded.",
  failure: undefined
});

class ScriptedExecutor implements ScenarioExecutor {
  readonly intentType =
    "application-availability" as const;

  readonly calls: Array<{
    scenario: TestScenario;
    context: ScenarioExecutorContext;
  }> = [];

  constructor(
    private readonly results: TestExecutionResult[]
  ) {}

  async execute(
    scenario: TestScenario,
    context: ScenarioExecutorContext
  ): Promise<TestExecutionResult> {
    this.calls.push({
      scenario,
      context
    });

    const result =
      this.results[this.calls.length - 1];

    if (!result) {
      throw new Error(
        "Unexpected extra executor call."
      );
    }

    return result;
  }
}

function makeRunner(
  executor: ScriptedExecutor,
  retry?: RetryPolicyConfig
): PlaywrightRunner {
  return new PlaywrightRunner(
    makeConfig(retry),
    new EvidenceManager(),
    new FailureAnalyzer(),
    new ScenarioExecutorResolver([
      executor
    ])
  );
}

describe(
  "PlaywrightRunner retry integration",
  () => {
    it(
      "keeps the legacy execute method single-attempt even when retry is configured",
      async () => {
        const executor =
          new ScriptedExecutor([
            networkFailure,
            success
          ]);

        const result =
          await makeRunner(
            executor,
            retryPolicy
          ).execute(
            scenario,
            context
          );

        expect(result).toEqual(
          networkFailure
        );

        expect(executor.calls).toHaveLength(1);

        expect(
          executor.calls[0]?.context.runDirectory
        ).toBe(context.runDirectory);
      }
    );

    it(
      "records an authorized recovery and isolates attempt directories",
      async () => {
        const executor =
          new ScriptedExecutor([
            networkFailure,
            success
          ]);

        const outcome =
          await makeRunner(
            executor,
            retryPolicy
          ).executeWithHistory(
            scenario,
            context
          );

        expect(outcome.result).toEqual(
          success
        );

        expect(outcome.history).toBeInstanceOf(
          RetryAttemptHistory
        );

        expect(
          outcome.history.attempts.map(
            attempt => attempt.attemptNumber
          )
        ).toEqual([1, 2]);

        expect(
          outcome.history.retriesUsed
        ).toBe(1);

        expect(
          outcome.history.attempts[0]?.decisionAfterAttempt
        ).toEqual({
          shouldRetry: true,
          reason: "retry-allowed"
        });

        expect(
          outcome.history.attempts[1]?.result
        ).toEqual(success);

        expect(
          executor.calls.map(
            call => call.context.runDirectory
          )
        ).toEqual([
          path.join(
            context.runDirectory,
            "attempts",
            "attempt-1"
          ),
          path.join(
            context.runDirectory,
            "attempts",
            "attempt-2"
          )
        ]);

        expect(
          executor.calls.map(
            call => call.scenario.id
          )
        ).toEqual([
          "S001",
          "S001"
        ]);
      }
    );

    it(
      "does not retry a failure without structured metadata",
      async () => {
        const failure = makeResult({
          message: "Failure without metadata."
        });

        const executor =
          new ScriptedExecutor([
            failure,
            success
          ]);

        const outcome =
          await makeRunner(
            executor,
            retryPolicy
          ).executeWithHistory(
            scenario,
            context
          );

        expect(outcome.result).toEqual(
          failure
        );

        expect(executor.calls).toHaveLength(1);

        expect(
          outcome.history.attempts[0]?.decisionAfterAttempt
        ).toEqual({
          shouldRetry: false,
          reason: "failure-not-retryable"
        });
      }
    );

    it(
      "stops after the configured retry budget",
      async () => {
        const executor =
          new ScriptedExecutor([
            networkFailure,
            networkFailure,
            success
          ]);

        const outcome =
          await makeRunner(
            executor,
            retryPolicy
          ).executeWithHistory(
            scenario,
            context
          );

        expect(outcome.result).toEqual(
          networkFailure
        );

        expect(executor.calls).toHaveLength(2);

        expect(
          outcome.history.retriesUsed
        ).toBe(1);

        expect(
          outcome.history.attempts[1]?.decisionAfterAttempt
        ).toEqual({
          shouldRetry: false,
          reason: "retry-budget-exhausted"
        });
      }
    );

    it(
      "keeps missing and disabled retry policies single-attempt",
      async () => {
        for (const policy of [
          undefined,
          { ...retryPolicy, enabled: false }
        ]) {
          const executor = new ScriptedExecutor([
            networkFailure,
            success
          ]);

          const outcome = await makeRunner(
            executor,
            policy
          ).executeWithHistory(scenario, context);

          expect(outcome.result).toEqual(networkFailure);
          expect(executor.calls).toHaveLength(1);
          expect(executor.calls[0]?.context.runDirectory)
            .toBe(context.runDirectory);

          expect(
            outcome.history.attempts[0]?.decisionAfterAttempt
          ).toEqual({
            shouldRetry: false,
            reason: "retry-disabled"
          });
        }
      }
    );

    it(
      "does not retry a failure type outside the configured allowlist",
      async () => {
        const executor = new ScriptedExecutor([
          networkFailure,
          success
        ]);

        const outcome = await makeRunner(
          executor,
          {
            ...retryPolicy,
            retryableFailureTypes: ["timeout"]
          }
        ).executeWithHistory(scenario, context);

        expect(outcome.result).toEqual(networkFailure);
        expect(executor.calls).toHaveLength(1);
        expect(
          outcome.history.attempts[0]?.decisionAfterAttempt
        ).toEqual({
          shouldRetry: false,
          reason: "failure-not-retryable"
        });
      }
    );

    it(
      "does not retry review, success or non-reviewable technical verdicts",
      async () => {
        const terminalResults: TestExecutionResult[] = [
          makeResult({
            status: "review",
            verdict: "REVIEW",
            failure: networkFailure.failure
          }),
          makeResult({
            status: "passed",
            verdict: "PASS",
            failure: networkFailure.failure
          }),
          makeResult({
            verdict: "PRODUCT_BUG",
            failure: networkFailure.failure
          }),
          makeResult({
            verdict: "TEST_ISSUE",
            failure: networkFailure.failure
          })
        ];

        for (const terminal of terminalResults) {
          const executor = new ScriptedExecutor([
            terminal,
            success
          ]);

          const outcome = await makeRunner(
            executor,
            retryPolicy
          ).executeWithHistory(scenario, context);

          expect(outcome.result).toEqual(terminal);
          expect(executor.calls).toHaveLength(1);
          expect(outcome.history.attempts).toHaveLength(1);
          expect(
            outcome.history.attempts[0]?.decisionAfterAttempt
          ).toBeUndefined();
        }
      }
    );

    it(
      "does not retry an unexpected executor exception",
      async () => {
        const executor = new ScriptedExecutor([]);

        const outcome = await makeRunner(
          executor,
          retryPolicy
        ).executeWithHistory(scenario, context);

        expect(executor.calls).toHaveLength(1);
        expect(outcome.result.status).toBe("review");
        expect(outcome.result.verdict).toBe("REVIEW");
        expect(outcome.result.message).toContain(
          "Unexpected scenario executor failure:"
        );
        expect(outcome.history.attempts).toHaveLength(1);
        expect(
          outcome.history.attempts[0]?.decisionAfterAttempt
        ).toBeUndefined();
      }
    );

    it(
      "enforces the maximum of three retries",
      async () => {
        const executor = new ScriptedExecutor([
          networkFailure,
          networkFailure,
          networkFailure,
          networkFailure,
          success
        ]);

        const outcome = await makeRunner(
          executor,
          {
            ...retryPolicy,
            maxRetries: 3
          }
        ).executeWithHistory(scenario, context);

        expect(executor.calls).toHaveLength(4);
        expect(outcome.history.retriesUsed).toBe(3);
        expect(outcome.history.attempts).toHaveLength(4);

        for (const attempt of outcome.history.attempts.slice(0, -1)) {
          expect(attempt.decisionAfterAttempt).toEqual({
            shouldRetry: true,
            reason: "retry-allowed"
          });
        }

        expect(
          outcome.history.attempts[3]?.decisionAfterAttempt
        ).toEqual({
          shouldRetry: false,
          reason: "retry-budget-exhausted"
        });
      }
    );

    it(
      "preserves evidence references from every attempt",
      async () => {
        const firstEvidence = {
          type: "screenshot" as const,
          path: path.join(
            context.runDirectory,
            "attempts",
            "attempt-1",
            "S001",
            "page.png"
          )
        };

        const secondEvidence = {
          type: "trace" as const,
          path: path.join(
            context.runDirectory,
            "attempts",
            "attempt-2",
            "S001",
            "trace.zip"
          )
        };

        const first = makeResult({
          failure: networkFailure.failure,
          evidence: [firstEvidence]
        });

        const second = makeResult({
          ...success,
          evidence: [secondEvidence]
        });

        const executor = new ScriptedExecutor([
          first,
          second
        ]);

        const outcome = await makeRunner(
          executor,
          retryPolicy
        ).executeWithHistory(scenario, context);

        expect(outcome.history.attempts.map(
          attempt => attempt.result.evidence
        )).toEqual([
          [firstEvidence],
          [secondEvidence]
        ]);

        expect(outcome.result.evidence).toEqual([
          secondEvidence
        ]);

        expect(firstEvidence.path).not.toBe(
          secondEvidence.path
        );
      }
    );


    it(
      "preserves the trusted scenario and base URL across retries",
      async () => {
        const inputScenario: TestScenario = {
          ...scenario,
          executionIntent: {
            type: "application-availability"
          }
        };

        const inputContext = {
          ...context
        };

        class MutatingExecutor extends ScriptedExecutor {
          readonly observed: Array<{
            executionMode: TestScenario["executionMode"];
            executionIntent: TestScenario["executionIntent"];
            baseUrl: string;
          }> = [];

          override async execute(
            scenario: TestScenario,
            context: ScenarioExecutorContext
          ): Promise<TestExecutionResult> {
            this.observed.push({
              executionMode: scenario.executionMode,
              executionIntent: scenario.executionIntent
                ? { ...scenario.executionIntent }
                : undefined,
              baseUrl: context.baseUrl
            });

            const result =
              await super.execute(scenario, context);

            if (this.calls.length === 1) {
              scenario.executionMode = "manual-review";
              scenario.executionIntent = {
                type: "page-text",
                expectedText: "mutated"
              };

              context.baseUrl = "https://mutated.invalid";
              context.runDirectory = "mutated-directory";
            }

            return result;
          }
        }

        const executor = new MutatingExecutor([
          networkFailure,
          success
        ]);

        const outcome = await makeRunner(
          executor,
          retryPolicy
        ).executeWithHistory(
          inputScenario,
          inputContext
        );

        expect(outcome.result).toEqual(success);
        expect(executor.calls).toHaveLength(2);

        expect(executor.observed).toEqual([
          {
            executionMode: "automated",
            executionIntent: {
              type: "application-availability"
            },
            baseUrl: context.baseUrl
          },
          {
            executionMode: "automated",
            executionIntent: {
              type: "application-availability"
            },
            baseUrl: context.baseUrl
          }
        ]);

        expect(inputScenario).toEqual(scenario);
        expect(inputContext).toEqual(context);
      }
    );

  }
);
