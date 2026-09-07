import path from "node:path";

import {
  RetryPolicyConfigSchema
} from "../../core/config/retry-policy-schema";

import {
  RetryDecisionEngine
} from "../../core/retry/retry-decision-engine";

import {
  RetryAttemptHistory
} from "../../core/retry/retry-attempt-history";

import {
  DragonConfig
} from "../../core/config/schema";

import {
  TestExecutionResult,
  TestScenario
} from "../../core/contracts/types";

import {
  FailureAnalyzer
} from "../../agents/failure-analyzer/failure-analyzer";

import {
  EvidenceManager
} from "../../evidence/evidence-manager";

import {
  ApplicationAvailabilityExecutor
} from "../executors/application-availability-executor";

import {
  HttpStatusExecutor
} from "../executors/http-status-executor";

import {
  PageTitleExecutor
} from "../executors/page-title-executor";

import {
  PageTextExecutor
} from "../executors/page-text-executor";

import {
  ScenarioExecutorResolver
} from "../executors/scenario-executor-resolver";

export interface PlaywrightRunContext {
  runDirectory: string;
  baseUrl: string;
}

export class PlaywrightRunner {
  private readonly executorResolver:
    ScenarioExecutorResolver;

  constructor(
    private readonly config: DragonConfig,
    private readonly evidenceManager: EvidenceManager,
    private readonly failureAnalyzer: FailureAnalyzer,
    executorResolver?: ScenarioExecutorResolver
  ) {
    this.executorResolver =
      executorResolver ??
      new ScenarioExecutorResolver([
        new ApplicationAvailabilityExecutor(
          this.config,
          this.evidenceManager,
          this.failureAnalyzer
        ),
        new HttpStatusExecutor(
          this.config,
          this.evidenceManager,
          this.failureAnalyzer
        ),
        new PageTitleExecutor(
          this.config,
          this.evidenceManager,
          this.failureAnalyzer
        ),
        new PageTextExecutor(
          this.config,
          this.evidenceManager,
          this.failureAnalyzer
        )
      ]);
  }

  async execute(
    scenario: TestScenario,
    context: PlaywrightRunContext
  ): Promise<TestExecutionResult> {
    const started = Date.now();

    if (
      scenario.executionMode ===
      "manual-review"
    ) {
      return {
        scenarioId: scenario.id,
        scenarioTitle:
          scenario.title,
        status: "review",
        verdict: "REVIEW",
        durationMs:
          Date.now() - started,
        message:
          "Scenario generated successfully but requires QA review before automated execution.",
        evidence: []
      };
    }

    if (!scenario.executionIntent) {
      return {
        scenarioId: scenario.id,
        scenarioTitle:
          scenario.title,
        status: "review",
        verdict: "REVIEW",
        durationMs:
          Date.now() - started,
        message:
          "Automated execution requires a supported execution intent.",
        evidence: []
      };
    }

    let executor;

    try {
      executor =
        this.executorResolver.resolve(
          scenario.executionIntent
        );
    } catch (error) {
      return {
        scenarioId: scenario.id,
        scenarioTitle:
          scenario.title,
        status: "review",
        verdict: "REVIEW",
        durationMs:
          Date.now() - started,
        message:
          error instanceof Error
            ? error.message
            : String(error),
        evidence: []
      };
    }

    try {
      return await executor.execute(
        scenario,
        context
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      return {
        scenarioId: scenario.id,
        scenarioTitle:
          scenario.title,
        status: "review",
        verdict: "REVIEW",
        durationMs:
          Date.now() - started,
        message:
          `Unexpected scenario executor failure: ${message}`,
        evidence: []
      };
    }
  }

  async executeWithHistory(
    scenario: TestScenario,
    context: PlaywrightRunContext
  ): Promise<{
    result: TestExecutionResult;
    history: RetryAttemptHistory;
  }> {
    const parsedPolicy =
      RetryPolicyConfigSchema.safeParse(
        this.config.retry
      );

    const policy =
      parsedPolicy.success
        ? parsedPolicy.data
        : undefined;

    const retryEngine =
      new RetryDecisionEngine(policy);

    // Preserve the trusted operation independently
    // of any mutations performed by an executor.
    const snapshotScenario = (
      value: TestScenario
    ): TestScenario => ({
      ...value,
      ...(value.executionIntent === undefined
        ? {}
        : {
            executionIntent: {
              ...value.executionIntent
            }
          })
    });

    const trustedScenario =
      snapshotScenario(scenario);

    const trustedContext:
      PlaywrightRunContext = {
        ...context
      };

    const history =
      new RetryAttemptHistory(
        trustedScenario.id
      );

    while (true) {
      // Number of retries consumed by the attempt
      // that is about to execute.
      const retriesUsed =
        history.attempts.length;

      const attemptNumber =
        retriesUsed + 1;

      const attemptContext:
        PlaywrightRunContext = {
          ...trustedContext,
          runDirectory:
            policy?.enabled
              ? path.join(
                  trustedContext.runDirectory,
                  "attempts",
                  `attempt-${attemptNumber}`
                )
              : trustedContext.runDirectory
        };

      const result =
        await this.execute(
          snapshotScenario(trustedScenario),
          {
            ...attemptContext
          }
        );

      // Only confirmed failures with reviewable
      // technical verdicts may enter retry policy.
      if (
        result.status !== "failed" ||
        (
          result.verdict !== "REVIEW" &&
          result.verdict !== "ENVIRONMENT"
        )
      ) {
        history.recordAttempt(result);

        return {
          result,
          history
        };
      }

      const failureType =
        typeof result.failure?.type ===
        "string"
          ? result.failure.type
          : "unknown";

      const decision =
        retryEngine.decide({
          failureType,
          retriesUsed
        });

      history.recordAttempt(
        result,
        decision
      );

      if (!decision.shouldRetry) {
        return {
          result,
          history
        };
      }
    }
  }
}
