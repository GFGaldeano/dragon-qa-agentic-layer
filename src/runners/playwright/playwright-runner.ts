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

    try {
      const executor =
        this.executorResolver.resolve(
          scenario.executionIntent
        );

      return await executor.execute(
        scenario,
        context
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
  }
}
