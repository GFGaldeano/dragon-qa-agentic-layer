import crypto from "node:crypto";

import {
  RequirementsAgent
} from "../../agents/requirements/requirements-agent";

import {
  PlannerProviderResolverDependencies,
  resolvePlannerProvider
} from "../../providers/planner/planner-provider-resolver";

import {
  FailureAnalyzer
} from "../../agents/failure-analyzer/failure-analyzer";

import {
  EvidenceManager
} from "../../evidence/evidence-manager";

import {
  PlaywrightRunner
} from "../../runners/playwright/playwright-runner";

import {
  Reporter
} from "../../reporting/reporter";

import {
  DragonConfig
} from "../config/schema";

import type {
  DragonRunResult,
  RetryHistorySnapshot,
  TestExecutionResult
} from "../contracts/types";

import {
  calculateFinalVerdict
} from "../verdicts/verdict-engine";

import {
  requiresHumanApproval
} from "../verdicts/human-approval-policy";

import {
  resolveRetryOutcome
} from "../verdicts/retry-outcome-policy";

export interface DragonOrchestratorDependencies {
  planner?: PlannerProviderResolverDependencies;
}

export class DragonOrchestrator {
  constructor(
    private readonly config: DragonConfig,
    private readonly dependencies:
      DragonOrchestratorDependencies = {}
  ) {}

  async run(
    requirementText: string
  ): Promise<{
    result: DragonRunResult;
    runDirectory: string;
  }> {
    const runId =
      `${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}-${crypto
        .randomUUID()
        .slice(0, 8)}`;

    const startedAt =
      new Date().toISOString();

    const requirementsAgent =
      new RequirementsAgent();

    const planner =
      resolvePlannerProvider(
        this.config,
        this.dependencies.planner
      );

    const failureAnalyzer =
      new FailureAnalyzer();

    const evidenceManager =
      new EvidenceManager();

    const reporter =
      new Reporter();

    const requirement =
      requirementsAgent.analyze(
        requirementText
      );

    const plan =
      await planner.createPlan(
        requirement
      );

    const runDirectory =
      evidenceManager.createRunDirectory(
        runId
      );

    const runner =
      new PlaywrightRunner(
        this.config,
        evidenceManager,
        failureAnalyzer
      );

    const results: TestExecutionResult[] = [];
    const retryHistories: RetryHistorySnapshot[] = [];
    let retryApprovalRequired = false;

    for (const scenario of plan.scenarios) {
      const execution =
        await runner.executeWithHistory(
          scenario,
          {
            runDirectory,
            baseUrl:
              this.config.project.baseUrl
          }
        );

      const outcome =
        resolveRetryOutcome(
          execution.history,
          this.config.autonomy.level
        );

      if (outcome.result === undefined) {
        throw new Error(
          "Retry outcome has no execution result."
        );
      }

      results.push(outcome.result);

      retryHistories.push({
        scenarioId: scenario.id,
        retriesUsed:
          execution.history.retriesUsed,
        attempts: [
          ...execution.history.attempts
        ]
      });

      retryApprovalRequired =
        retryApprovalRequired ||
        outcome.humanApprovalRequired;
    }

    const finalVerdict =
      calculateFinalVerdict(results);

    const result: DragonRunResult = {
      runId,
      startedAt,
      completedAt:
        new Date().toISOString(),

      baseUrl:
        this.config.project.baseUrl,

      requirement,
      plan,
      results,
      retryHistories,
      finalVerdict,

      humanApprovalRequired:
        retryApprovalRequired ||
        requiresHumanApproval(
          this.config.autonomy.level,
          results
        )
    };

    if (this.config.reporting.json) {
      reporter.writeJson(
        result,
        runDirectory
      );
    }

    if (this.config.reporting.markdown) {
      reporter.writeMarkdown(
        result,
        runDirectory
      );
    }

    return {
      result,
      runDirectory
    };
  }
}
